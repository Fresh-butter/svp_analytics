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

const CHAPTER = Object.freeze({
  HYDERABAD: 'SVP India - Hyderabad',
  BANGALORE: 'SVP India - Bangalore',
});

const CHAPTERS = [
  { chapter_name: CHAPTER.HYDERABAD },
  { chapter_name: CHAPTER.BANGALORE },
];

// Keep real admin credentials centralized for deployment bootstrap.
const ADMINS = [
  {
    chapter_name: CHAPTER.HYDERABAD,
    user_type: 'ADMIN',
    name: 'Prashant Vinod',
    email: 'prashantvinod07@gmail.com',
    password: 'prashant',
  },
  {
    chapter_name: CHAPTER.HYDERABAD,
    user_type: 'ADMIN',
    name: 'Navneet Gupta',
    email: 'navneet.gupta@research.iiit.ac.in',
    password: 'navneet',
  },
  {
    chapter_name: CHAPTER.HYDERABAD,
    user_type: 'ADMIN',
    name: 'admin title',
    email: 'admin@svp.org',
    password: 'admin123',
  },
  {
    chapter_name: CHAPTER.HYDERABAD,
    user_type: 'ADMIN',
    name: 'Sravani Reddy',
    email: 'sravani.reddy@svpindia.org',
    password: 'Hyd#Admin2026',
  },
  {
    chapter_name: CHAPTER.HYDERABAD,
    user_type: 'ADMIN',
    name: 'Rohan Varma',
    email: 'rohan.varma@svpindia.org',
    password: 'Hyd#Ops2026',
  },
  {
    chapter_name: CHAPTER.HYDERABAD,
    user_type: 'ADMIN',
    name: 'Aparna Nair',
    email: 'aparna.nair@svpindia.org',
    password: 'Hyd#Reports2026',
  },
  {
    chapter_name: CHAPTER.BANGALORE,
    user_type: 'ADMIN',
    name: 'Karthik Subramanian',
    email: 'karthik.subramanian@svpindia.org',
    password: 'Blr#Admin2026',
  },
  {
    chapter_name: CHAPTER.BANGALORE,
    user_type: 'ADMIN',
    name: 'Nisha Kulkarni',
    email: 'nisha.kulkarni@svpindia.org',
    password: 'Blr#Ops2026',
  },
];

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function seedAdminAndChapters() {
  try {
    console.log('Seeding chapters and admin users...');

    const chapterByName = new Map();

    for (const chapterData of CHAPTERS) {
      let chapter = await prisma.chapters.findFirst({
        where: { chapter_name: chapterData.chapter_name },
      });

      if (!chapter) {
        chapter = await prisma.chapters.create({
          data: chapterData,
        });
      }

      chapterByName.set(chapter.chapter_name, chapter);
    }

    for (const admin of ADMINS) {
      const chapter = chapterByName.get(admin.chapter_name);
      if (!chapter) {
        throw new Error(`Chapter not found for admin ${admin.email}: ${admin.chapter_name}`);
      }

      const password_hash = await bcrypt.hash(admin.password, 10);

      await prisma.users.upsert({
        where: {
          chapter_id_email: {
            chapter_id: chapter.chapter_id,
            email: admin.email,
          },
        },
        update: {
          user_type: admin.user_type,
          name: admin.name,
          password_hash,
        },
        create: {
          chapter_id: chapter.chapter_id,
          user_type: admin.user_type,
          name: admin.name,
          email: admin.email,
          password_hash,
        },
      });
    }

    console.log('Chapters/admin seed completed.');
    console.log('Created/updated chapters:', CHAPTERS.map((c) => c.chapter_name).join(', '));
    console.log('Created/updated admin accounts:', ADMINS.map((a) => `${a.email}`).join(', '));
  } catch (error) {
    console.error('Admin/chapter seed failed:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

seedAdminAndChapters();
