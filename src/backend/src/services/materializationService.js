const { prisma } = require('../config/prisma');
const { RRule } = require('rrule');
const { addMinutesToTime, fmtTime, fmtDate, parseTime, parseLocalDate, formatRow, utcToday, buildTimestampIST } = require('../utils/helpers');

class MaterializationService {
  /**
   * Validate an iCalendar RRule string.
   * @param {string} rruleStr  e.g. "FREQ=WEEKLY;BYDAY=MO,WE,FR"
   * @returns {{ valid: boolean, error?: string }}
   */
  static validateRRule(rruleStr) {
    try {
      RRule.parseString(rruleStr);
      return { valid: true };
    } catch (err) {
      return { valid: false, error: err.message };
    }
  }

  /**
   * Check whether `checkDate` is a valid occurrence of the given rrule
   * starting from `startDate`.
   */
  static isOccurrenceDate(rruleStr, startDate, checkDate) {
    const dtstart = new Date(Date.UTC(
      startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate(),
    ));

    const rruleOptions = RRule.parseString(rruleStr);
    rruleOptions.dtstart = dtstart;

    const rule = new RRule(rruleOptions);

    const dayStart = new Date(Date.UTC(
      checkDate.getUTCFullYear(), checkDate.getUTCMonth(), checkDate.getUTCDate(), 0, 0, 0,
    ));
    const dayEnd = new Date(Date.UTC(
      checkDate.getUTCFullYear(), checkDate.getUTCMonth(), checkDate.getUTCDate(), 23, 59, 59,
    ));

    return rule.between(dayStart, dayEnd, true).length > 0;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Core Materialization Logic (per occurrence_date)
  // Uses Prisma interactive transactions for atomicity.
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Materialize a single occurrence inside a Prisma transaction.
   *
   * @param {import('@prisma/client').Prisma.TransactionClient} tx
   * @param {object}  template        row from recurring_appointments
   * @param {string}  occurrenceDate  'YYYY-MM-DD'
   * @returns {object|null}  created appointment row, or null if skipped
   */
  static async materializeOccurrence(tx, template, occurrenceDate) {
    const occDate = parseLocalDate(occurrenceDate);

    // 1. Already materialized? → skip
    const existing = await tx.appointments.findFirst({
      where: {
        rec_appointment_id: template.rec_appointment_id,
        occurrence_date: occDate,
      },
    });
    if (existing) return null;

    // 2. Build proper TIMESTAMPTZ: (occurrence_date + start_time) AT TIME ZONE 'Asia/Kolkata'
    const startTimeVal = template.start_time || template.start_at;
    const startAt = buildTimestampIST(occDate, startTimeVal);
    const endAt = new Date(startAt.getTime() + template.duration_minutes * 60000);

    // 3. Create PENDING appointment
    const appointment = await tx.appointments.create({
      data: {
        chapter_id: template.chapter_id,
        appointment_name: template.appointment_name || null,
        appointment_type_id: template.appointment_type_id || null,
        group_type_id: template.group_type_id || null,
        occurrence_date: occDate,
        start_at: startAt,
        end_at: endAt,
        investee_id: template.investee_id || null,
        status: 'PENDING',
        rec_appointment_id: template.rec_appointment_id,
      },
    });

    // 4a. Collect partner IDs from group (if template has a group)
    const partnerSet = new Map(); // partner_id → chapter_id (deduplicate)

    if (template.group_id) {
      const groupPartners = await tx.group_partners.findMany({
        where: {
          group_id: template.group_id,
          start_date: { lte: occDate },
          OR: [
            { end_date: null },
            { end_date: { gte: occDate } },
          ],
        },
        select: { chapter_id: true, partner_id: true },
      });

      for (const gp of groupPartners) {
        partnerSet.set(gp.partner_id, gp.chapter_id);
      }
    }

    // 4b. Collect recurring_appointment_partners whose partner is active on date
    const recPartners = await tx.recurring_appointment_partners.findMany({
      where: { rec_appointment_id: template.rec_appointment_id },
      include: {
        partners: {
          select: { partner_id: true, start_date: true, end_date: true },
        },
      },
    });

    for (const rp of recPartners) {
      const p = rp.partners;
      // p.start_date/end_date are already local-tz Date objects from pg
      const pStart = p.start_date;
      const pEnd = p.end_date || new Date(Date.UTC(9999, 11, 31));
      if (pStart <= occDate && pEnd >= occDate) {
        partnerSet.set(rp.partner_id, rp.chapter_id);
      }
    }

    // 4c. Insert deduplicated partner set
    for (const [partnerId, chapterId] of partnerSet) {
      await tx.appointment_partners.create({
        data: {
          chapter_id: chapterId,
          appointment_id: appointment.appointment_id,
          partner_id: partnerId,
        },
      });
    }

    return formatRow(appointment);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Manual Materialization (Admin Action)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Materialize one specific occurrence for a template.
   */
  static async manualMaterialize(template, occurrenceDate) {
    return prisma.$transaction(async (tx) => {
      return this.materializeOccurrence(tx, template, occurrenceDate);
    });
  }
}

module.exports = { MaterializationService };
