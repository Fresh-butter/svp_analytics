require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

const DEFAULT_PARTNER_PASSWORD = process.env.DEFAULT_PARTNER_PASSWORD || 'partner123';

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function prismaModelHasField(modelName, fieldName) {
  const model = prisma?._runtimeDataModel?.models?.[modelName];
  if (!model || !Array.isArray(model.fields)) return false;
  return model.fields.some((field) => field.name === fieldName);
}

async function seedPartnerUsers() {
  try {
    console.log('Seeding partner login accounts...');
    const supportsUserPartnerLink = prismaModelHasField('users', 'partner_id');
    const supportsUserIsActive = prismaModelHasField('users', 'is_active');

    const partners = await prisma.partners.findMany({
      where: { email: { not: null } },
      select: {
        chapter_id: true,
        partner_id: true,
        partner_name: true,
        email: true,
      },
    });

    const password_hash = await bcrypt.hash(DEFAULT_PARTNER_PASSWORD, 10);

    let createdOrUpdated = 0;
    for (const partner of partners) {
      await prisma.users.upsert({
        where: {
          chapter_id_email: {
            chapter_id: partner.chapter_id,
            email: partner.email,
          },
        },
        update: {
          user_type: 'PARTNER',
          ...(supportsUserIsActive ? { is_active: true } : {}),
          name: partner.partner_name,
          password_hash,
          ...(supportsUserPartnerLink ? { partner_id: partner.partner_id } : {}),
        },
        create: {
          chapter_id: partner.chapter_id,
          user_type: 'PARTNER',
          ...(supportsUserIsActive ? { is_active: true } : {}),
          name: partner.partner_name,
          email: partner.email,
          password_hash,
          ...(supportsUserPartnerLink ? { partner_id: partner.partner_id } : {}),
        },
      });
      createdOrUpdated += 1;
    }

    console.log(`Partner login accounts ready: ${createdOrUpdated}`);
    console.log(`Default partner password: ${DEFAULT_PARTNER_PASSWORD}`);
  } catch (error) {
    console.error('Partner user seed failed:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

seedPartnerUsers();