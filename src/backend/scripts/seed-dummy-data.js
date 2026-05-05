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

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const DEFAULT_PARTNER_PASSWORD = 'partner123';

function prismaModelHasField(modelName, fieldName) {
  const model = prisma?._runtimeDataModel?.models?.[modelName];
  if (!model || !Array.isArray(model.fields)) return false;
  return model.fields.some((field) => field.name === fieldName);
}

const CHAPTERS_REQUIRED = [CHAPTER.HYDERABAD, CHAPTER.BANGALORE];

const GROUP_TYPES_BY_CHAPTER = {
  [CHAPTER.HYDERABAD]: [
    'Mentorship Cohort',
    'Board Advisory',
    'Impact Assessment',
    'Fundraising Circle',
    'CSR Outreach',
    'Education Taskforce',
  ],
  [CHAPTER.BANGALORE]: [
    'Mentorship Cohort',
    'Board Advisory',
    'Impact Assessment',
    'Fundraising Circle',
  ],
};

const APPOINTMENT_TYPES_BY_CHAPTER = {
  [CHAPTER.HYDERABAD]: [
    'Field Visit',
    'Quarterly Review',
    'Strategy Session',
    'Grant Panel Review',
    'Capacity Building Workshop',
    'Governance Review',
  ],
  [CHAPTER.BANGALORE]: [
    'Field Visit',
    'Quarterly Review',
    'Strategy Session',
    'Grant Panel Review',
  ],
};

const PARTNERS_BY_CHAPTER = {
  [CHAPTER.HYDERABAD]: [
    { name: 'Anand Reddy', email: 'anand.reddy.hyd@svp.org', linkedin: 'https://linkedin.com/in/anand-reddy-svp', start: '2021-01-10' },
    { name: 'Bhavana Iyer', email: 'bhavana.iyer.hyd@svp.org', linkedin: 'https://linkedin.com/in/bhavana-iyer-svp', start: '2021-03-15' },
    { name: 'Charan Rao', email: 'charan.rao.hyd@svp.org', linkedin: 'https://linkedin.com/in/charan-rao-svp', start: '2021-06-01' },
    { name: 'Deepika Menon', email: 'deepika.menon.hyd@svp.org', linkedin: 'https://linkedin.com/in/deepika-menon-svp', start: '2021-09-12' },
    { name: 'Eshwar Naidu', email: 'eshwar.naidu.hyd@svp.org', linkedin: 'https://linkedin.com/in/eshwar-naidu-svp', start: '2022-01-05' },
    { name: 'Farah Khan', email: 'farah.khan.hyd@svp.org', linkedin: 'https://linkedin.com/in/farah-khan-svp', start: '2022-02-20' },
    { name: 'Gautham Pillai', email: 'gautham.pillai.hyd@svp.org', linkedin: 'https://linkedin.com/in/gautham-pillai-svp', start: '2022-05-14' },
    { name: 'Harini V', email: 'harini.v.hyd@svp.org', linkedin: 'https://linkedin.com/in/harini-v-svp', start: '2022-06-18' },
    { name: 'Irfan Siddiqui', email: 'irfan.siddiqui.hyd@svp.org', linkedin: 'https://linkedin.com/in/irfan-siddiqui-svp', start: '2022-08-02' },
    { name: 'Jahnavi Patel', email: 'jahnavi.patel.hyd@svp.org', linkedin: 'https://linkedin.com/in/jahnavi-patel-svp', start: '2022-11-23' },
    { name: 'Kiran Deshpande', email: 'kiran.deshpande.hyd@svp.org', linkedin: 'https://linkedin.com/in/kiran-deshpande-svp', start: '2023-01-17' },
    { name: 'Lakshmi Narayan', email: 'lakshmi.narayan.hyd@svp.org', linkedin: 'https://linkedin.com/in/lakshmi-narayan-svp', start: '2023-03-01' },
    { name: 'Mohan R', email: 'mohan.r.hyd@svp.org', linkedin: 'https://linkedin.com/in/mohan-r-svp', start: '2023-05-07' },
    { name: 'Nandini Gupta', email: 'nandini.gupta.hyd@svp.org', linkedin: 'https://linkedin.com/in/nandini-gupta-svp', start: '2023-07-22' },
    { name: 'Omkar Joshi', email: 'omkar.joshi.hyd@svp.org', linkedin: 'https://linkedin.com/in/omkar-joshi-svp', start: '2023-09-09' },
    { name: 'Pallavi Das', email: 'pallavi.das.hyd@svp.org', linkedin: 'https://linkedin.com/in/pallavi-das-svp', start: '2024-01-11' },
    { name: 'Qasim Ali', email: 'qasim.ali.hyd@svp.org', linkedin: 'https://linkedin.com/in/qasim-ali-svp', start: '2024-03-02' },
    { name: 'Ritu Chandra', email: 'ritu.chandra.hyd@svp.org', linkedin: 'https://linkedin.com/in/ritu-chandra-svp', start: '2024-04-16' },
    { name: 'Sumanth Reddy', email: 'sumanth.reddy.hyd@svp.org', linkedin: 'https://linkedin.com/in/sumanth-reddy-svp', start: '2024-06-01' },
    { name: 'Tanvi Sharma', email: 'tanvi.sharma.hyd@svp.org', linkedin: 'https://linkedin.com/in/tanvi-sharma-svp', start: '2024-07-19' },
    { name: 'Uday K', email: 'uday.k.hyd@svp.org', linkedin: 'https://linkedin.com/in/uday-k-svp', start: '2024-08-21' },
    { name: 'Varsha Nair', email: 'varsha.nair.hyd@svp.org', linkedin: 'https://linkedin.com/in/varsha-nair-svp', start: '2024-09-12' },
    { name: 'Waseem Khan', email: 'waseem.khan.hyd@svp.org', linkedin: 'https://linkedin.com/in/waseem-khan-svp', start: '2024-10-05' },
    { name: 'Yamini L', email: 'yamini.l.hyd@svp.org', linkedin: 'https://linkedin.com/in/yamini-l-svp', start: '2025-01-08' },
    { name: 'Zainab Fatima', email: 'zainab.fatima.hyd@svp.org', linkedin: 'https://linkedin.com/in/zainab-fatima-svp', start: '2025-02-10' },
    { name: 'Aditi Reddy', email: 'aditi.reddy.hyd@svp.org', linkedin: 'https://linkedin.com/in/aditi-reddy-svp', start: '2025-03-15' },
    { name: 'Bharat K', email: 'bharat.k.hyd@svp.org', linkedin: 'https://linkedin.com/in/bharat-k-svp', start: '2025-04-20' },
    { name: 'Chetan V', email: 'chetan.v.hyd@svp.org', linkedin: 'https://linkedin.com/in/chetan-v-svp', start: '2025-05-02' },
    { name: 'Darshana P', email: 'darshana.p.hyd@svp.org', linkedin: 'https://linkedin.com/in/darshana-p-svp', start: '2025-06-01' },
    { name: 'Eesha R', email: 'eesha.r.hyd@svp.org', linkedin: 'https://linkedin.com/in/eesha-r-svp', start: '2025-07-12' },
    { name: 'Madhavi Reddy', email: 'madhavi.reddy.hyd@svp.org', start: '2023-01-01', primaryEmail: 'anand.reddy.hyd@svp.org' },
    { name: 'Pranav Menon', email: 'pranav.menon.hyd@svp.org', start: '2023-04-01', primaryEmail: 'deepika.menon.hyd@svp.org' },
    { name: 'Rohini Iyer', email: 'rohini.iyer.hyd@svp.org', start: '2024-01-01', primaryEmail: 'bhavana.iyer.hyd@svp.org' },
    { name: 'Saira Khan', email: 'saira.khan.hyd@svp.org', start: '2024-03-01', primaryEmail: 'farah.khan.hyd@svp.org' },
    { name: 'Tejas Rao', email: 'tejas.rao.hyd@svp.org', start: '2024-06-15', primaryEmail: 'charan.rao.hyd@svp.org' },
  ],
  [CHAPTER.BANGALORE]: [
    { name: 'Akhil Shetty', email: 'akhil.shetty.blr@svp.org', linkedin: 'https://linkedin.com/in/akhil-shetty-svp', start: '2021-02-10' },
    { name: 'Bharti Rao', email: 'bharti.rao.blr@svp.org', linkedin: 'https://linkedin.com/in/bharti-rao-svp', start: '2021-05-01' },
    { name: 'Chirag Jain', email: 'chirag.jain.blr@svp.org', linkedin: 'https://linkedin.com/in/chirag-jain-svp', start: '2022-01-15' },
    { name: 'Devika S', email: 'devika.s.blr@svp.org', linkedin: 'https://linkedin.com/in/devika-s-svp', start: '2022-04-09' },
    { name: 'Eknath Joshi', email: 'eknath.joshi.blr@svp.org', linkedin: 'https://linkedin.com/in/eknath-joshi-svp', start: '2023-01-01' },
    { name: 'Fiona Dsouza', email: 'fiona.dsouza.blr@svp.org', linkedin: 'https://linkedin.com/in/fiona-dsouza-svp', start: '2023-06-11' },
    { name: 'Girish K', email: 'girish.k.blr@svp.org', linkedin: 'https://linkedin.com/in/girish-k-svp', start: '2024-01-20' },
    { name: 'Hema N', email: 'hema.n.blr@svp.org', linkedin: 'https://linkedin.com/in/hema-n-svp', start: '2024-07-10' },
    { name: 'Ishan B', email: 'ishan.b.blr@svp.org', start: '2024-08-01', primaryEmail: 'akhil.shetty.blr@svp.org' },
    { name: 'Jaya R', email: 'jaya.r.blr@svp.org', start: '2024-09-01', primaryEmail: 'bharti.rao.blr@svp.org' },
  ],
};

const INVESTEES_BY_CHAPTER = {
  [CHAPTER.HYDERABAD]: [
    { name: 'Teach For India - Hyderabad', email: 'hyderabad@teachforindia.org', start: '2019-01-01' },
    { name: 'Aarohi Learning Foundation', email: 'contact@aarohilearning.org', start: '2020-03-10' },
    { name: 'Nayi Disha Youth Initiative', email: 'connect@nayidisha.org', start: '2021-01-15' },
    { name: 'Sparsh Child Health Trust', email: 'info@sparshhealth.org', start: '2021-07-01' },
    { name: 'Urban Livelihood Collective', email: 'support@urbanlivelihood.org', start: '2022-02-14' },
    { name: 'Green Classroom Project', email: 'hello@greenclassroom.org', start: '2022-09-01' },
    { name: 'Women Rising Network', email: 'admin@womenrising.org', start: '2023-01-05' },
    { name: 'Inclusive Futures Foundation', email: 'team@inclusivefutures.org', start: '2023-06-20' },
    { name: 'Digital Saathi Foundation', email: 'partners@digitalsaathi.org', start: '2024-01-01' },
    { name: 'Udaan Employability Trust', email: 'reach@udaantrust.org', start: '2024-04-01' },
  ],
  [CHAPTER.BANGALORE]: [
    { name: 'Teach For India - Bengaluru', email: 'bengaluru@teachforindia.org', start: '2019-01-01' },
    { name: 'Pratham Education Foundation - BLR', email: 'blr@pratham.org', start: '2020-08-01' },
    { name: 'Future Skills Lab', email: 'hello@futureskillslab.org', start: '2022-04-15' },
    { name: 'Community Health Bridge', email: 'care@chbridge.org', start: '2023-09-01' },
  ],
};

const GROUPS_BY_CHAPTER = {
  [CHAPTER.HYDERABAD]: [
    {
      name: 'Hyderabad Mentors Cohort Alpha',
      type: 'Mentorship Cohort',
      investee: 'Teach For India - Hyderabad',
      start: '2024-01-01',
      members: ['anand.reddy.hyd@svp.org', 'bhavana.iyer.hyd@svp.org', 'charan.rao.hyd@svp.org', 'madhavi.reddy.hyd@svp.org'],
    },
    {
      name: 'Hyderabad Board Advisory Cell',
      type: 'Board Advisory',
      investee: 'Nayi Disha Youth Initiative',
      start: '2023-07-01',
      members: ['deepika.menon.hyd@svp.org', 'eshwar.naidu.hyd@svp.org', 'farah.khan.hyd@svp.org', 'pranav.menon.hyd@svp.org'],
    },
    {
      name: 'Impact Audit Squad Q1',
      type: 'Impact Assessment',
      investee: 'Inclusive Futures Foundation',
      start: '2025-01-01',
      members: ['gautham.pillai.hyd@svp.org', 'harini.v.hyd@svp.org', 'irfan.siddiqui.hyd@svp.org', 'jahnavi.patel.hyd@svp.org'],
    },
    {
      name: 'Fundraising Circle Hyderabad East',
      type: 'Fundraising Circle',
      investee: 'Urban Livelihood Collective',
      start: '2024-04-01',
      members: ['kiran.deshpande.hyd@svp.org', 'lakshmi.narayan.hyd@svp.org', 'mohan.r.hyd@svp.org', 'nandini.gupta.hyd@svp.org'],
    },
    {
      name: 'CSR Outreach Team North',
      type: 'CSR Outreach',
      investee: 'Green Classroom Project',
      start: '2024-06-01',
      members: ['omkar.joshi.hyd@svp.org', 'pallavi.das.hyd@svp.org', 'qasim.ali.hyd@svp.org'],
    },
    {
      name: 'Education Taskforce Rural Belt',
      type: 'Education Taskforce',
      investee: 'Aarohi Learning Foundation',
      start: '2023-09-01',
      members: ['ritu.chandra.hyd@svp.org', 'sumanth.reddy.hyd@svp.org', 'tanvi.sharma.hyd@svp.org', 'rohini.iyer.hyd@svp.org'],
    },
    {
      name: 'Women Rising Support Group',
      type: 'Mentorship Cohort',
      investee: 'Women Rising Network',
      start: '2025-01-15',
      members: ['uday.k.hyd@svp.org', 'varsha.nair.hyd@svp.org', 'waseem.khan.hyd@svp.org', 'saira.khan.hyd@svp.org'],
    },
    {
      name: 'Digital Saathi Operations Group',
      type: 'Impact Assessment',
      investee: 'Digital Saathi Foundation',
      start: '2025-03-01',
      members: ['yamini.l.hyd@svp.org', 'zainab.fatima.hyd@svp.org', 'aditi.reddy.hyd@svp.org', 'bharat.k.hyd@svp.org', 'tejas.rao.hyd@svp.org'],
    },
  ],
  [CHAPTER.BANGALORE]: [
    {
      name: 'Bengaluru Mentorship Pod',
      type: 'Mentorship Cohort',
      investee: 'Teach For India - Bengaluru',
      start: '2024-02-01',
      members: ['akhil.shetty.blr@svp.org', 'bharti.rao.blr@svp.org', 'chirag.jain.blr@svp.org', 'ishan.b.blr@svp.org'],
    },
    {
      name: 'Bengaluru Governance Circle',
      type: 'Board Advisory',
      investee: 'Pratham Education Foundation - BLR',
      start: '2024-04-01',
      members: ['devika.s.blr@svp.org', 'eknath.joshi.blr@svp.org', 'fiona.dsouza.blr@svp.org'],
    },
    {
      name: 'Future Skills Impact Group',
      type: 'Impact Assessment',
      investee: 'Future Skills Lab',
      start: '2025-01-01',
      members: ['girish.k.blr@svp.org', 'hema.n.blr@svp.org', 'jaya.r.blr@svp.org'],
    },
  ],
};

const RECURRING_TEMPLATES_BY_CHAPTER = {
  [CHAPTER.HYDERABAD]: [
    {
      group: 'Hyderabad Mentors Cohort Alpha',
      appointmentType: 'Quarterly Review',
      startTime: '10:00:00',
      durationMinutes: 90,
      rrule: 'FREQ=MONTHLY;BYMONTHDAY=10',
      investee: 'Teach For India - Hyderabad',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      partners: ['anand.reddy.hyd@svp.org', 'bhavana.iyer.hyd@svp.org', 'charan.rao.hyd@svp.org'],
    },
    {
      group: 'Hyderabad Board Advisory Cell',
      appointmentType: 'Governance Review',
      startTime: '16:00:00',
      durationMinutes: 60,
      rrule: 'FREQ=MONTHLY;BYDAY=TU;BYSETPOS=2',
      investee: 'Nayi Disha Youth Initiative',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      partners: ['deepika.menon.hyd@svp.org', 'eshwar.naidu.hyd@svp.org', 'farah.khan.hyd@svp.org'],
    },
    {
      group: 'Fundraising Circle Hyderabad East',
      appointmentType: 'Strategy Session',
      startTime: '18:00:00',
      durationMinutes: 75,
      rrule: 'FREQ=WEEKLY;BYDAY=SA',
      investee: 'Urban Livelihood Collective',
      startDate: '2026-02-01',
      endDate: '2026-08-31',
      partners: ['kiran.deshpande.hyd@svp.org', 'lakshmi.narayan.hyd@svp.org', 'mohan.r.hyd@svp.org'],
    },
    {
      group: 'Digital Saathi Operations Group',
      appointmentType: 'Capacity Building Workshop',
      startTime: '14:30:00',
      durationMinutes: 120,
      rrule: 'FREQ=MONTHLY;BYMONTHDAY=5,20',
      investee: 'Digital Saathi Foundation',
      startDate: '2026-03-01',
      endDate: '2026-12-31',
      partners: ['yamini.l.hyd@svp.org', 'zainab.fatima.hyd@svp.org', 'aditi.reddy.hyd@svp.org'],
    },
  ],
  [CHAPTER.BANGALORE]: [
    {
      group: 'Bengaluru Mentorship Pod',
      appointmentType: 'Quarterly Review',
      startTime: '11:00:00',
      durationMinutes: 90,
      rrule: 'FREQ=MONTHLY;BYDAY=FR;BYSETPOS=1',
      investee: 'Teach For India - Bengaluru',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      partners: ['akhil.shetty.blr@svp.org', 'bharti.rao.blr@svp.org', 'chirag.jain.blr@svp.org'],
    },
    {
      group: 'Bengaluru Governance Circle',
      appointmentType: 'Strategy Session',
      startTime: '15:00:00',
      durationMinutes: 60,
      rrule: 'FREQ=MONTHLY;BYMONTHDAY=12',
      investee: 'Pratham Education Foundation - BLR',
      startDate: '2026-02-01',
      endDate: '2026-12-31',
      partners: ['devika.s.blr@svp.org', 'eknath.joshi.blr@svp.org'],
    },
  ],
};

function utcDate(dateStr) {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

function utcTime(timeStr) {
  return new Date(`1970-01-01T${timeStr}.000Z`);
}

function istTimestamp(dateStr, timeStr) {
  return new Date(`${dateStr}T${timeStr}+05:30`);
}

function addMonths(baseDateStr, monthsToAdd) {
  const d = new Date(`${baseDateStr}T00:00:00.000Z`);
  d.setUTCMonth(d.getUTCMonth() + monthsToAdd);
  return d.toISOString().slice(0, 10);
}

async function deleteOldDummyData(chapterIds) {
  await prisma.appointment_partners.deleteMany({ where: { chapter_id: { in: chapterIds } } });
  await prisma.recurring_appointment_partners.deleteMany({ where: { chapter_id: { in: chapterIds } } });
  await prisma.appointments.deleteMany({ where: { chapter_id: { in: chapterIds } } });
  await prisma.recurring_appointments.deleteMany({ where: { chapter_id: { in: chapterIds } } });
  await prisma.group_partners.deleteMany({ where: { chapter_id: { in: chapterIds } } });
  await prisma.groups.deleteMany({ where: { chapter_id: { in: chapterIds } } });
  await prisma.partners.deleteMany({ where: { chapter_id: { in: chapterIds } } });
  await prisma.investees.deleteMany({ where: { chapter_id: { in: chapterIds } } });
  await prisma.group_types.deleteMany({ where: { chapter_id: { in: chapterIds } } });
  await prisma.appointment_types.deleteMany({ where: { chapter_id: { in: chapterIds } } });
}

function buildAppointments(chapterName) {
  const hyd = chapterName === CHAPTER.HYDERABAD;
  const chapterGroups = GROUPS_BY_CHAPTER[chapterName];
  const chapterInvestees = INVESTEES_BY_CHAPTER[chapterName];
  const chapterAppointmentTypes = APPOINTMENT_TYPES_BY_CHAPTER[chapterName];

  // 85% COMPLETED, 10% PENDING, 5% CANCELLED for better analytics diversity
  const statuses = ['COMPLETED', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'PENDING', 'CANCELLED'];
  const slots = [
    ['09:00:00', '10:30:00'],
    ['10:00:00', '11:30:00'],
    ['11:00:00', '12:00:00'],
    ['14:00:00', '15:30:00'],
    ['15:30:00', '16:30:00'],
    ['16:00:00', '17:00:00'],
    ['17:30:00', '18:30:00'],
    ['18:00:00', '19:00:00'],
  ];

  const appointments = [];
  
  // Generate 8-9 months of data: June 2025 to March 2026 (9 months)
  // Create 4-6 appointments per month for better analytics visibility
  const monthsBack = 9;
  const appointmentsPerMonth = hyd ? 6 : 4; // More data for Hyderabad
  
  for (let month = -monthsBack; month <= 0; month += 1) {
    const baseDate = addMonths('2026-03-15', month);
    const [baseYear, baseMonthStr, baseDayStr] = baseDate.split('-');
    const baseDay = parseInt(baseDayStr);
    
    // Create multiple appointments spread across different days of the month
    for (let apt = 0; apt < appointmentsPerMonth; apt += 1) {
      const dayOffset = (apt * 5) % 25; // Spread across the month
      const day = Math.min(baseDay + dayOffset - 15, 28); // Keep within month bounds
      const dateStr = `${baseYear}-${baseMonthStr}-${String(Math.max(1, day)).padStart(2, '0')}`;
      
      const groupIdx = Math.abs((apt + month) % chapterGroups.length);
      const investeeIdx = Math.abs((apt * 2 + month) % chapterInvestees.length);
      const typeIdx = Math.abs((apt + month) % chapterAppointmentTypes.length);
      const slotIdx = Math.abs((apt + month) % slots.length);
      const statusIdx = Math.abs((apt + month * 3) % statuses.length);
      
      const group = chapterGroups[groupIdx];
      const investee = chapterInvestees[investeeIdx]?.name || chapterInvestees[0].name;
      const appointmentType = chapterAppointmentTypes[typeIdx];
      const [start, end] = slots[slotIdx];
      const status = statuses[statusIdx];

      appointments.push({
        date: dateStr,
        start,
        end,
        appointmentType,
        groupType: group.type,
        groupName: group.name,
        investee,
        status,
        attendeeEmails: group.members,
      });
    }
  }

  return appointments;
}

async function seedDummyData() {
  try {
    console.log('Seeding large dummy data set (excluding chapters/admins)...');
    const supportsUserPartnerLink = prismaModelHasField('users', 'partner_id');
    const supportsUserIsActive = prismaModelHasField('users', 'is_active');

    const chapters = await prisma.chapters.findMany({
      where: { chapter_name: { in: CHAPTERS_REQUIRED } },
    });

    if (chapters.length !== CHAPTERS_REQUIRED.length) {
      throw new Error(
        'Required chapters were not found. Run seed-admin-chapters.js first to create Hyderabad and Bangalore chapters.'
      );
    }

    const chapterByName = new Map(chapters.map((c) => [c.chapter_name, c]));
    const chapterIds = chapters.map((c) => c.chapter_id);

    await deleteOldDummyData(chapterIds);

    const groupTypeIdByChapterAndName = new Map();
    const appointmentTypeIdByChapterAndName = new Map();
    const partnerByChapterAndEmail = new Map();
    const investeeByChapterAndName = new Map();
    const groupByChapterAndName = new Map();

    for (const chapterName of CHAPTERS_REQUIRED) {
      const chapter = chapterByName.get(chapterName);

      for (const typeName of GROUP_TYPES_BY_CHAPTER[chapterName]) {
        const created = await prisma.group_types.create({
          data: {
            chapter_id: chapter.chapter_id,
            type_name: typeName,
          },
        });
        groupTypeIdByChapterAndName.set(`${chapterName}::${typeName}`, created.group_type_id);
      }

      for (const typeName of APPOINTMENT_TYPES_BY_CHAPTER[chapterName]) {
        const created = await prisma.appointment_types.create({
          data: {
            chapter_id: chapter.chapter_id,
            type_name: typeName,
          },
        });
        appointmentTypeIdByChapterAndName.set(`${chapterName}::${typeName}`, created.appointment_type_id);
      }

      for (const investee of INVESTEES_BY_CHAPTER[chapterName]) {
        const created = await prisma.investees.create({
          data: {
            chapter_id: chapter.chapter_id,
            investee_name: investee.name,
            email: investee.email,
            start_date: utcDate(investee.start),
          },
        });
        investeeByChapterAndName.set(`${chapterName}::${investee.name}`, created);
      }

      for (const partner of PARTNERS_BY_CHAPTER[chapterName]) {
        const created = await prisma.partners.create({
          data: {
            chapter_id: chapter.chapter_id,
            partner_name: partner.name,
            email: partner.email,
            linkedin_url: partner.linkedin || null,
            start_date: utcDate(partner.start),
          },
        });
        partnerByChapterAndEmail.set(`${chapterName}::${partner.email}`, created);
      }

      for (const partner of PARTNERS_BY_CHAPTER[chapterName]) {
        if (!partner.primaryEmail) {
          continue;
        }

        const current = partnerByChapterAndEmail.get(`${chapterName}::${partner.email}`);
        const primary = partnerByChapterAndEmail.get(`${chapterName}::${partner.primaryEmail}`);

        if (!current || !primary) {
          throw new Error(`Unable to map secondary partner relation for ${partner.email}`);
        }

        await prisma.partners.update({
          where: { partner_id: current.partner_id },
          data: { primary_partner_id: primary.partner_id },
        });
      }

      for (const partner of PARTNERS_BY_CHAPTER[chapterName]) {
        const partnerRecord = partnerByChapterAndEmail.get(`${chapterName}::${partner.email}`);
        if (!partnerRecord) {
          throw new Error(`Partner not found while seeding login account: ${partner.email}`);
        }

        const password_hash = await bcrypt.hash(DEFAULT_PARTNER_PASSWORD, 10);
        await prisma.users.upsert({
          where: {
            chapter_id_email: {
              chapter_id: chapter.chapter_id,
              email: partner.email,
            },
          },
          update: {
            user_type: 'PARTNER',
            ...(supportsUserIsActive ? { is_active: true } : {}),
            name: partner.name,
            password_hash,
            ...(supportsUserPartnerLink ? { partner_id: partnerRecord.partner_id } : {}),
          },
          create: {
            chapter_id: chapter.chapter_id,
            user_type: 'PARTNER',
            ...(supportsUserIsActive ? { is_active: true } : {}),
            name: partner.name,
            email: partner.email,
            password_hash,
            ...(supportsUserPartnerLink ? { partner_id: partnerRecord.partner_id } : {}),
          },
        });
      }

      for (const group of GROUPS_BY_CHAPTER[chapterName]) {
        const created = await prisma.groups.create({
          data: {
            chapter_id: chapter.chapter_id,
            group_name: group.name,
            group_type_id: groupTypeIdByChapterAndName.get(`${chapterName}::${group.type}`),
            investee_id: investeeByChapterAndName.get(`${chapterName}::${group.investee}`).investee_id,
            start_date: utcDate(group.start),
          },
        });

        groupByChapterAndName.set(`${chapterName}::${group.name}`, created);

        for (const partnerEmail of group.members) {
          const partner = partnerByChapterAndEmail.get(`${chapterName}::${partnerEmail}`);
          if (!partner) {
            throw new Error(`Partner not found for group ${group.name}: ${partnerEmail}`);
          }

          await prisma.group_partners.create({
            data: {
              chapter_id: chapter.chapter_id,
              group_id: created.group_id,
              partner_id: partner.partner_id,
              start_date: utcDate(group.start),
            },
          });
        }
      }

      const appointments = buildAppointments(chapterName);

      for (const appointment of appointments) {
        const createdAppointment = await prisma.appointments.create({
          data: {
            chapter_id: chapter.chapter_id,
            appointment_type_id: appointmentTypeIdByChapterAndName.get(
              `${chapterName}::${appointment.appointmentType}`
            ),
            group_type_id: groupTypeIdByChapterAndName.get(`${chapterName}::${appointment.groupType}`),
            occurrence_date: utcDate(appointment.date),
            start_at: istTimestamp(appointment.date, appointment.start),
            end_at: istTimestamp(appointment.date, appointment.end),
            investee_id: investeeByChapterAndName.get(`${chapterName}::${appointment.investee}`).investee_id,
            status: appointment.status,
          },
        });

        for (const [idx, partnerEmail] of appointment.attendeeEmails.entries()) {
          const partner = partnerByChapterAndEmail.get(`${chapterName}::${partnerEmail}`);
          if (!partner) {
            throw new Error(`Partner missing for appointment attendee: ${partnerEmail}`);
          }

          const is_present = appointment.status === 'COMPLETED' ? idx % 3 !== 2 : false;

          await prisma.appointment_partners.create({
            data: {
              chapter_id: chapter.chapter_id,
              appointment_id: createdAppointment.appointment_id,
              partner_id: partner.partner_id,
              is_present,
            },
          });
        }
      }

      for (const recurring of RECURRING_TEMPLATES_BY_CHAPTER[chapterName]) {
        const createdRecurring = await prisma.recurring_appointments.create({
          data: {
            chapter_id: chapter.chapter_id,
            group_id: groupByChapterAndName.get(`${chapterName}::${recurring.group}`).group_id,
            appointment_type_id: appointmentTypeIdByChapterAndName.get(
              `${chapterName}::${recurring.appointmentType}`
            ),
            start_time: utcTime(recurring.startTime),
            duration_minutes: recurring.durationMinutes,
            rrule: recurring.rrule,
            investee_id: investeeByChapterAndName.get(`${chapterName}::${recurring.investee}`).investee_id,
            start_date: utcDate(recurring.startDate),
            end_date: utcDate(recurring.endDate),
          },
        });

        for (const partnerEmail of recurring.partners) {
          const partner = partnerByChapterAndEmail.get(`${chapterName}::${partnerEmail}`);
          if (!partner) {
            throw new Error(`Partner missing for recurring appointment: ${partnerEmail}`);
          }

          await prisma.recurring_appointment_partners.create({
            data: {
              chapter_id: chapter.chapter_id,
              rec_appointment_id: createdRecurring.rec_appointment_id,
              partner_id: partner.partner_id,
            },
          });
        }
      }
    }

    const hydCount = PARTNERS_BY_CHAPTER[CHAPTER.HYDERABAD].length;
    const blrCount = PARTNERS_BY_CHAPTER[CHAPTER.BANGALORE].length;

    console.log('Dummy data seed completed successfully.');
    console.log(`Partners seeded: Hyderabad=${hydCount}, Bangalore=${blrCount}`);
    console.log('Majority chapter verified: Hyderabad has denser data across entities.');
  } catch (error) {
    console.error('Dummy data seed failed:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

seedDummyData();
