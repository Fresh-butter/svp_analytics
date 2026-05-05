const { prisma } = require('../config/prisma');
const { formatRow, formatRows, fmtDate, fmtTime, fmtTimestamp, parseTime, parseLocalDate, utcToday, buildTimestampIST } = require('../utils/helpers');

const SORT_COLUMNS = ['occurrence_date', 'appointment_type', 'start_at', 'status', 'created_at'];

class AppointmentRepository {
  static allowedSortColumns = SORT_COLUMNS;

  static buildPartnerAccessWhere(partner_id) {
    if (!partner_id) return {};
    return {
      appointment_partners: {
        some: { partner_id },
      },
    };
  }

  /* ── List ── */
  static async findAll(chapter_id, pagination, filters) {
    const where = {};

    if (chapter_id) where.chapter_id = chapter_id;
    if (filters?.status) where.status = filters.status;
    if (filters?.appointment_type_id) where.appointment_type_id = filters.appointment_type_id;
    if (filters?.investee_id) where.investee_id = filters.investee_id;
    if (filters?.partner_id) Object.assign(where, this.buildPartnerAccessWhere(filters.partner_id));

    if (filters?.month && filters?.year) {
      // Month is 1-12. Construct a Date at the start of the UTC month
      const y = parseInt(filters.year);
      const m = parseInt(filters.month) - 1; // 0-based
      const startDate = new Date(Date.UTC(y, m, 1));

      // End date: move to next month, day 0 (which is the last day of the target month)
      const endDate = new Date(Date.UTC(y, m + 1, 0));

      where.occurrence_date = {
        gte: startDate,
        lte: endDate,
      };
    }

    const total = await prisma.appointments.count({ where });

    // Only apply pagination if explicitly provided
    const paginationArgs = {};
    if (pagination?.offset) paginationArgs.skip = parseInt(pagination.offset);
    if (pagination?.limit) paginationArgs.take = parseInt(pagination.limit);

    const rows = await prisma.appointments.findMany({
      where,
      include: {
        investees: { select: { investee_name: true } },
      },
      ...paginationArgs,
    });

    return {
      rows: rows.map(r => {
        const row = formatRow(r);
        row.investee_name = r.investees?.investee_name || null;
        delete row.investees;
        return row;
      }),
      total,
    };
  }

  /* ── Single ── */
  static async findById(id) {
    const row = await prisma.appointments.findUnique({
      where: { appointment_id: id },
    });
    return formatRow(row);
  }

  /* ── Detail with partners ── */
  static async findByIdWithDetails(id) {
    const aid = id;

    // Fetch appointment with investee, recurring_appointment, and partners in one go
    const row = await prisma.appointments.findUnique({
      where: { appointment_id: aid },
      include: {
        investees: true,
        recurring_appointments: true,
        appointment_partners: {
          include: {
            partners: { select: { partner_id: true, partner_name: true, email: true } },
          },
          orderBy: { partners: { partner_name: 'asc' } },
        },
      }
    });

    if (!row) return null;

    const formattedRow = formatRow(row);

    const partners = row.appointment_partners.map(ap => ({
      appointment_partner_id: ap.app_partner_id,
      is_present: ap.is_present,
      absent_informed: ap.absent_informed,
      partner_id: ap.partners.partner_id,
      partner_name: ap.partners.partner_name,
      email: ap.partners.email,
    }));

    // Attach details
    formattedRow.investee = row.investees ? formatRow(row.investees) : null;
    formattedRow.recurring_appointment = row.recurring_appointments ? formatRow(row.recurring_appointments) : null;
    formattedRow.partners = partners;

    // Remove raw included fields to clean up response
    delete formattedRow.investees;
    delete formattedRow.recurring_appointments;
    delete formattedRow.appointment_partners;

    return formattedRow;
  }

  static async findNotifications(chapter_id, partner_id) {
    if (!partner_id) return [];

    const today = utcToday();
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    const where = {
      chapter_id,
      OR: [
        {
          status: 'PENDING',
          occurrence_date: { gte: today, lt: tomorrow },
        },
        {
          status: 'COMPLETED',
          occurrence_date: { gte: today, lt: tomorrow },
        },
      ],
      ...(partner_id ? this.buildPartnerAccessWhere(partner_id) : {}),
    };

    const rows = await prisma.appointments.findMany({
      where,
      include: {
        investees: { select: { investee_name: true } },
        appointment_types: { select: { type_name: true } },
        appointment_partners: {
          include: {
            partners: { select: { partner_id: true, partner_name: true, email: true } },
          },
        },
      },
      orderBy: [{ occurrence_date: 'desc' }, { start_at: 'desc' }],
    });

    return rows.map((r) => {
      const row = formatRow(r);
      row.investee_name = r.investees?.investee_name || null;
      row.appointment_type = r.appointment_types?.type_name || null;
      row.partners = (r.appointment_partners || []).map((ap) => ({
        partner_id: ap.partners.partner_id,
        partner_name: ap.partners.partner_name,
        email: ap.partners.email,
        is_present: ap.is_present,
        absent_informed: ap.absent_informed,
      }));
      const selfPartner = (row.partners || []).find((partner) => partner.partner_id === partner_id);
      if (String(r.status || '').toUpperCase() === 'PENDING') {
        row.notification_type = 'TODAY_SCHEDULED';
        row.notification_message = 'Meeting scheduled for today.';
      } else if (selfPartner && selfPartner.is_present === true) {
        row.notification_type = 'ATTENDANCE_MARKED';
        row.notification_message = 'You were marked Present.';
      } else if (selfPartner && selfPartner.is_present === false) {
        row.notification_type = 'ATTENDANCE_MARKED';
        row.notification_message = selfPartner.absent_informed === true ? 'You were marked Absent (Informed).' : 'You were marked Absent.';
      }
      delete row.investees;
      delete row.appointment_types;
      delete row.appointment_partners;
      return row;
    });
  }

  static async findAssigned(chapter_id, partner_id) {
    const rows = await prisma.appointments.findMany({
      where: {
        chapter_id,
        ...this.buildPartnerAccessWhere(partner_id),
      },
      include: {
        investees: { select: { investee_name: true } },
      },
      orderBy: [{ occurrence_date: 'asc' }, { start_at: 'asc' }],
    });

    return rows.map((r) => {
      const row = formatRow(r);
      row.investee_name = r.investees?.investee_name || null;
      delete row.investees;
      return row;
    });
  }

  /**
   * SRS Create:
   *  - Appointments are self-contained (no group_id column).
   *  - Active group_partners for each supplied group are snapshot-copied
   *    into appointment_partners at creation time.
   *  - group_ids is an optional array of group UUIDs used to pull partners.
   */
  static async create(data) {
    const occDate = parseLocalDate(data.occurrence_date || data.appointment_date);
    const startTimeStr = data.start_at || data.start_time;
    const endTimeStr = data.end_at || data.end_time;

    // Build proper TIMESTAMPTZ: occurrence_date + time AT TIME ZONE 'Asia/Kolkata'
    // If the value looks like a full ISO timestamp (contains T), use it directly;
    // otherwise treat it as a bare time string and combine with occurrence_date.
    const startAt = (typeof startTimeStr === 'string' && startTimeStr.includes('T'))
      ? new Date(startTimeStr)
      : buildTimestampIST(occDate, startTimeStr);
    const endAt = (typeof endTimeStr === 'string' && endTimeStr.includes('T'))
      ? new Date(endTimeStr)
      : buildTimestampIST(occDate, endTimeStr);

    const appt = await prisma.appointments.create({
      data: {
        chapter_id: data.chapter_id,
        appointment_name: data.appointment_name || null,
        investee_id: data.investee_id || null,
        group_type_id: data.group_type_id || null,
        appointment_type_id: data.appointment_type_id || null,
        status: data.status || 'PENDING',
        occurrence_date: occDate,
        start_at: startAt,
        end_at: endAt,
      },
    });

    const today = utcToday();
    const seenPartners = new Set();

    // Snapshot: copy active group_partners into appointment_partners
    if (data.group_ids && data.group_ids.length > 0) {
      const gpRows = await prisma.group_partners.findMany({
        where: {
          group_id: { in: data.group_ids },
          start_date: { lte: today },
          OR: [
            { end_date: null },
            { end_date: { gte: today } },
          ],
        },
      });

      for (const gp of gpRows) {
        if (seenPartners.has(gp.partner_id)) continue;
        seenPartners.add(gp.partner_id);
        await prisma.appointment_partners.create({
          data: {
            chapter_id: gp.chapter_id,
            appointment_id: appt.appointment_id,
            partner_id: gp.partner_id,
          },
        }).catch(() => { }); // ignore duplicates
      }
    }

    // Also allow explicit partner_ids or partners
    const partnerList = data.partners || data.partner_ids;
    if (partnerList && partnerList.length > 0) {
      for (const partnerId of partnerList) {
        if (seenPartners.has(partnerId)) continue;
        seenPartners.add(partnerId);
        await prisma.appointment_partners.create({
          data: {
            chapter_id: data.chapter_id,
            appointment_id: appt.appointment_id,
            partner_id: partnerId,
          },
        }).catch(() => { }); // ignore duplicates
      }
    }

    return this.findByIdWithDetails(appt.appointment_id);
  }

  /* ── Update (status, time, relations) ── */
  static async update(id, data) {
    const updateData = {};

    if (data.appointment_name !== undefined) updateData.appointment_name = data.appointment_name || null;
    if (data.appointment_type_id !== undefined) updateData.appointment_type_id = data.appointment_type_id || null;
    if (data.group_type_id !== undefined) updateData.group_type_id = data.group_type_id || null;
    if (data.investee_id !== undefined) updateData.investee_id = data.investee_id || null;
    if (data.status !== undefined) updateData.status = data.status;

    const aid = id;

    const existing = await prisma.appointments.findUnique({
      where: { appointment_id: aid },
    });
    if (!existing) return null;

    const occurrenceDateInput = data.occurrence_date ?? data.appointment_date;
    const baseOccurrenceDate = occurrenceDateInput ? parseLocalDate(occurrenceDateInput) : existing.occurrence_date;
    if (occurrenceDateInput !== undefined) {
      if (Number.isNaN(baseOccurrenceDate.getTime())) {
        const err = new Error('Invalid occurrence_date');
        err.code = 'VALIDATION';
        throw err;
      }
      updateData.occurrence_date = baseOccurrenceDate;
    }

    const startAtInput = data.start_at !== undefined ? data.start_at : data.start_time;
    const endAtInput = data.end_at !== undefined ? data.end_at : data.end_time;

    // Build proper TIMESTAMPTZ for start_at/end_at if provided
    // If a full ISO timestamp (contains 'T'), use directly; otherwise combine with occurrence_date
    if (startAtInput !== undefined) {
      updateData.start_at = (typeof startAtInput === 'string' && startAtInput.includes('T'))
        ? new Date(startAtInput)
        : buildTimestampIST(baseOccurrenceDate, startAtInput);
      if (Number.isNaN(updateData.start_at.getTime())) {
        const err = new Error('Invalid start_at time');
        err.code = 'VALIDATION';
        throw err;
      }
    }
    if (endAtInput !== undefined) {
      updateData.end_at = (typeof endAtInput === 'string' && endAtInput.includes('T'))
        ? new Date(endAtInput)
        : buildTimestampIST(baseOccurrenceDate, endAtInput);
      if (Number.isNaN(updateData.end_at.getTime())) {
        const err = new Error('Invalid end_at time');
        err.code = 'VALIDATION';
        throw err;
      }
    }

    const startCandidate = updateData.start_at || existing.start_at;
    const endCandidate = updateData.end_at || existing.end_at;
    if (startCandidate > endCandidate) {
      const err = new Error('start_at must be before end_at');
      err.code = 'VALIDATION';
      throw err;
    }

    // Use transaction to update appointment and optionally sync partners
    const updated = await prisma.$transaction(async (tx) => {
      let row = existing;
      if (Object.keys(updateData).length > 0) {
        row = await tx.appointments.update({
          where: { appointment_id: aid },
          data: updateData,
        });
      }

      // Sync partners if array is provided
      if (data.partners && Array.isArray(data.partners)) {
        // Clear existing
        await tx.appointment_partners.deleteMany({
          where: { appointment_id: aid }
        });

        // Insert new array of partners if it has elements
        if (data.partners.length > 0) {
          const partnerInserts = data.partners.map(pId => ({
            appointment_id: aid,
            partner_id: pId,
            chapter_id: row.chapter_id // Maintain chapter ownership
          }));
          await tx.appointment_partners.createMany({
            data: partnerInserts,
            skipDuplicates: true
          });
        }
      }
      return row;
    });

    return this.findByIdWithDetails(aid);
  }

  /**
   * SRS Complete:
   *  PATCH /appointments/:id/complete
   *  - Sets status = 'COMPLETED'
  *  - Records attendance: [{partner_id, is_present, absent_informed?}]
   */
  static async complete(id, attendance) {
    const aid = id;

    const existing = await prisma.appointments.findUnique({
      where: { appointment_id: aid },
    });
    if (!existing || existing.status !== 'PENDING') return null;

    const today = utcToday();
    const appointmentDate = parseLocalDate(existing.occurrence_date);
    if (appointmentDate > today) {
      const err = new Error('Cannot mark a future appointment as completed');
      err.code = 'VALIDATION';
      throw err;
    }

    await prisma.$transaction(async (tx) => {
      await tx.appointments.update({
        where: { appointment_id: aid },
        data: { status: 'COMPLETED' },
      });

      if (attendance && attendance.length > 0) {
        for (const record of attendance) {
          const isPresent = Boolean(record.is_present);
          const absentInformed = isPresent
            ? null
            : (typeof record.absent_informed === 'boolean' ? record.absent_informed : null);

          await tx.appointment_partners.updateMany({
            where: {
              appointment_id: aid,
              partner_id: record.partner_id,
            },
            data: {
              is_present: isPresent,
              absent_informed: absentInformed,
            },
          });
        }
      }
    });

    return this.findByIdWithDetails(aid);
  }

  /* ── Delete ── */
  static async delete(id) {
    const aid = id;

    const existing = await prisma.appointments.findUnique({
      where: { appointment_id: aid }
    });
    if (!existing) return { deleted: false };

    // Atomic cascade: delete appointment_partners then appointment
    await prisma.$transaction(async (tx) => {
      await tx.appointment_partners.deleteMany({ where: { appointment_id: aid } });
      await tx.appointments.delete({ where: { appointment_id: aid } });
    });

    return { deleted: true };
  }
}

module.exports = { AppointmentRepository };
