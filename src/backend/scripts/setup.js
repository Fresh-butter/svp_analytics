#!/usr/bin/env node

const readline = require('readline');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');

function createReadline() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

function ask(question, defaultValue) {
  const rl = createReadline();
  const suffix = defaultValue ? ` [${defaultValue}]` : '';

  return new Promise((resolve) => {
    rl.question(`${question}${suffix}: `, (answer) => {
      rl.close();
      resolve((answer || '').trim() || (defaultValue || ''));
    });
  });
}

function askYesNo(question, defaultYes = false) {
  const defaultValue = defaultYes ? 'y' : 'n';
  return ask(question, defaultValue).then((value) => value.toLowerCase() === 'y');
}

function escapeSqlLiteral(value) {
  return String(value).replace(/'/g, "''");
}

function escapeSqlIdentifier(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function psql(connection, sql, options = {}) {
  const { ignoreErrors = false } = options;

  try {
    return execFileSync(
      'psql',
      [
        '-U', connection.user,
        '-h', connection.host,
        '-p', String(connection.port),
        '-d', connection.database,
        '-c', sql,
      ],
      {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, PGPASSWORD: connection.password },
      }
    );
  } catch (error) {
    if (ignoreErrors) {
      return error.stderr || '';
    }
    throw error;
  }
}

function psqlFile(connection, sqlFilePath) {
  return execFileSync(
    'psql',
    [
      '-U', connection.user,
      '-h', connection.host,
      '-p', String(connection.port),
      '-d', connection.database,
      '-f', sqlFilePath,
    ],
    {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, PGPASSWORD: connection.password },
    }
  );
}

function ensurePsqlAvailable() {
  try {
    execFileSync('psql', ['--version'], { stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (error) {
    console.error('`psql` is not available on PATH. Install PostgreSQL client tools and retry.');
    process.exit(1);
  }
}

function runNodeScript(scriptName, envOverrides = {}) {
  execFileSync('node', [path.join(ROOT, 'scripts', scriptName)], {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, ...envOverrides },
  });
}

function generatePrismaClient(envOverrides = {}) {
  console.log('Generating Prisma Client...');
  execFileSync('npx', ['prisma', 'generate'], {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, ...envOverrides },
  });
}

async function setupNewDatabase(appConn) {
  console.log('\nStep: new database provisioning');

  const superUser = await ask('PostgreSQL superuser', 'postgres');
  const superPassword = await ask('PostgreSQL superuser password', '');

  const superConn = {
    host: appConn.host,
    port: appConn.port,
    user: superUser,
    password: superPassword,
    database: 'postgres',
  };

  try {
    psql(superConn, 'SELECT 1');
  } catch (error) {
    console.error('Could not connect as superuser.');
    console.error(error.message);
    process.exit(1);
  }

  const dbNameLiteral = escapeSqlLiteral(appConn.database);
  const dbNameIdentifier = escapeSqlIdentifier(appConn.database);
  const userLiteral = escapeSqlLiteral(appConn.user);
  const userIdentifier = escapeSqlIdentifier(appConn.user);
  const userPasswordLiteral = escapeSqlLiteral(appConn.password);

  const dbExistsResult = psql(
    superConn,
    `SELECT 1 FROM pg_database WHERE datname = '${dbNameLiteral}';`
  );
  const dbExists = dbExistsResult.includes('1') && !dbExistsResult.includes('(0 rows)');

  if (dbExists) {
    const shouldReset = await askYesNo(
      `Database "${appConn.database}" already exists. Drop and recreate it? (y/n)`,
      false
    );
    if (!shouldReset) {
      console.error('Aborting new setup because existing database was not reset.');
      process.exit(1);
    }

    psql(
      superConn,
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='${dbNameLiteral}' AND pid <> pg_backend_pid();`,
      { ignoreErrors: true }
    );
    psql(superConn, `DROP DATABASE IF EXISTS ${dbNameIdentifier};`);
  }

  const userExistsResult = psql(
    superConn,
    `SELECT 1 FROM pg_roles WHERE rolname = '${userLiteral}';`
  );
  const userExists = userExistsResult.includes('1') && !userExistsResult.includes('(0 rows)');

  if (!userExists) {
    psql(superConn, `CREATE USER ${userIdentifier} WITH PASSWORD '${userPasswordLiteral}';`);
  } else {
    const shouldUpdatePassword = await askYesNo(
      `User "${appConn.user}" already exists. Update password? (y/n)`,
      true
    );
    if (shouldUpdatePassword) {
      psql(superConn, `ALTER USER ${userIdentifier} WITH PASSWORD '${userPasswordLiteral}';`);
    }
  }

  psql(superConn, `CREATE DATABASE ${dbNameIdentifier} OWNER ${userIdentifier};`);
  psql(superConn, `GRANT ALL PRIVILEGES ON DATABASE ${dbNameIdentifier} TO ${userIdentifier};`, {
    ignoreErrors: true,
  });

  const schemaFiles = [
    'db-schema-v1.0.sql',
    'db-schema-v1.1.sql',
    'db-schema-v1.2.sql',
    'db-schema-v1.3.sql',
    'db-schema-v1.4.sql',
    'db-schema-v1.5.sql',
  ];
  for (const fileName of schemaFiles) {
    psqlFile(appConn, path.join(ROOT, 'schema', fileName));
  }

  console.log('Database/user created and schema applied.');
}

async function setupExistingDatabase(appConn) {
  console.log('\nStep: existing database validation');

  try {
    psql(appConn, 'SELECT 1');
  } catch (error) {
    console.error('Could not connect to the existing database with provided app credentials.');
    console.error(error.message);
    process.exit(1);
  }

  const applySchema = await askYesNo(
    'Apply schema scripts (v1.0 + v1.5) to this existing DB? (y/n)',
    false
  );

  if (applySchema) {
    const schemaFiles = [
      'db-schema-v1.0.sql',
      'db-schema-v1.1.sql',
      'db-schema-v1.2.sql',
      'db-schema-v1.3.sql',
      'db-schema-v1.4.sql',
      'db-schema-v1.5.sql',
    ];
    for (const fileName of schemaFiles) {
      psqlFile(appConn, path.join(ROOT, 'schema', fileName));
    }
    console.log('Schema applied to existing database.');
  } else {
    console.log('Schema application skipped for existing database mode.');
  }
}

function writeEnvFile({ appConn, backendPort }) {
  const envPath = path.join(ROOT, '.env');
  const databaseUrl = `postgresql://${appConn.user}:${appConn.password}@${appConn.host}:${appConn.port}/${appConn.database}?schema=public`;
  const jwtSecret = crypto.randomBytes(32).toString('hex');

  const content = [
    `DATABASE_URL=${databaseUrl}`,
    `PORT=${backendPort}`,
    'NODE_ENV=development',
    `JWT_SECRET=${jwtSecret}`,
    'JWT_EXPIRES_IN=24h',
    'CORS_ORIGIN=http://localhost:5173',
    '',
    '# Optional SMTP settings for forgot-password email flow',
    'SMTP_HOST=smtp.gmail.com',
    'SMTP_PORT=587',
    'SMTP_USER=',
    'SMTP_PASS=',
    'SMTP_FROM="SVP Analytics <noreply@svp.org>"',
    '',
  ].join('\n');

  fs.writeFileSync(envPath, content);
}

async function main() {
  ensurePsqlAvailable();

  console.log('SVP Backend Setup');
  console.log('Modes: new (provision DB + apply schema) | existing (connect to existing DB)');

  const modeInput = (await ask('Setup mode (new/existing)', 'new')).toLowerCase();
  const mode = modeInput === 'existing' ? 'existing' : 'new';

  const host = await ask('PostgreSQL host', 'localhost');
  const port = await ask('PostgreSQL port', '5432');
  const database = await ask('App database name', 'svp_analytics');
  const user = await ask('App database user', 'svp_user');
  const password = await ask('App database password', 'svp123');
  const backendPort = await ask('Backend server port', '4001');

  const appConn = { host, port, database, user, password };

  if (mode === 'new') {
    await setupNewDatabase(appConn);
  } else {
    await setupExistingDatabase(appConn);
  }

  const shouldWriteEnv = await askYesNo('Write/overwrite .env with these values? (y/n)', true);
  if (shouldWriteEnv) {
    writeEnvFile({ appConn, backendPort });
    console.log('.env updated.');
  } else {
    console.log('.env update skipped.');
  }

  const runAdminSeed = await askYesNo('Run admin/chapter seed now? (y/n)', mode === 'new');
  const runDummySeed = await askYesNo('Run dummy-data seed now? (y/n)', mode === 'new');

  const databaseUrl = `postgresql://${appConn.user}:${appConn.password}@${appConn.host}:${appConn.port}/${appConn.database}?schema=public`;

  generatePrismaClient({ DATABASE_URL: databaseUrl });

  if (runAdminSeed) {
    runNodeScript('seed-admin-chapters.js', { DATABASE_URL: databaseUrl });
  }

  if (runDummySeed) {
    runNodeScript('seed-dummy-data.js', { DATABASE_URL: databaseUrl });
  }

  console.log('\nSetup complete.');
  console.log(`Mode: ${mode}`);
  console.log(`Database: ${database}@${host}:${port}`);
  console.log(`Admin seed: ${runAdminSeed ? 'run' : 'skipped'}`);
  console.log(`Dummy seed: ${runDummySeed ? 'run' : 'skipped'}`);
  console.log('Next: npm run dev');
}

main().catch((error) => {
  console.error('Setup failed:', error.message);
  process.exit(1);
});
