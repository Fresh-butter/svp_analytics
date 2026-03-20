const cron = require('node-cron');
const { prisma } = require('../config/prisma');
const { MaterializationService } = require('../services/materializationService');
const { RecurringAppointmentRepository } = require('../repositories/recurringAppointmentRepository');
const { utcToday, fmtDate, parseLocalDate } = require('../utils/helpers');

/**
 * Schedule the recurring-appointment materialization cron job.
 * Runs daily at 2:00 A M IST — materializes yesterday's occurrences.
 */
function startMaterializeCron() {
  cron.schedule('0 2 * * *', async () => {
    console.log('[CRON] Starting recurring appointment materialization…');
    try {
      // Compute yesterday
      const today = utcToday();
      const yesterday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - 1));
      const yesterdayStr = fmtDate(yesterday);

      let count = 0;

      // Query raw template rows directly to get the correct data shape
      // that materializeOccurrence() expects (raw DB fields, not formatted nested objects)
      const templates = await prisma.recurring_appointments.findMany({
        where: {
          start_date: { lte: yesterday },
          end_date: { gte: yesterday },
        },
      });

      for (const template of templates) {
        const startDate = template.start_date;

        // Must match the rrule
        if (!MaterializationService.isOccurrenceDate(template.rrule, startDate, yesterday)) {
          continue;
        }

        // Ensure not already materialized
        const alreadyMaterialized = await RecurringAppointmentRepository.isAlreadyMaterialized(
          template.rec_appointment_id, yesterdayStr,
        );

        if (!alreadyMaterialized) {
          await MaterializationService.manualMaterialize(template, yesterdayStr);
          count++;
        }
      }

      console.log(`[CRON] Materialized ${count} appointment(s)`);
    } catch (err) {
      console.error('[CRON] Materialization failed:', err);
    }
  }, {
    timezone: 'Asia/Kolkata',
  });

  console.log('Materialization cron job scheduled (daily at 2:00 AM IST)');
}

module.exports = { startMaterializeCron };
