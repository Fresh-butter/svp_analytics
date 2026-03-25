const { prisma } = require('../config/prisma');
const { formatRow, formatRows, fmtDate, fmtTime, fmtTimestamp, parseTime, parseLocalDate, utcToday, buildTimestampIST } = require('../utils/helpers');

const SORT_COLUMNS = ['occurrence_date', 'appointment_type', 'start_at', 'status', 'created_at'];

class AppointmentRepository {
  static allowedSortColumns = SORT_COLUMNS;

  /* ── List ── */
  static async findAll(chapter_id, pagination, filters) {
    const where = {};

    if (chapter_id) where.chapter_id = chapter_id;
    if (filters?.status) where.status = filters.status;
    if (filters?.appointment_type_id) where.appointment_type_id = filters.appointment_type_id;
    if (filters?.investee_id) where.investee_id = filters.investee_id;

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
        investee_id: data.investee_id || null,
        group_type_id: data.group_type_id || null,
        appointment_type_id: data.appointment_type_id,
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

    if (data.appointment_type_id !== undefined) updateData.appointment_type_id = data.appointment_type_id;
    if (data.group_type_id !== undefined) updateData.group_type_id = data.group_type_id || null;
    if (data.investee_id !== undefined) updateData.investee_id = data.investee_id || null;
    if (data.status !== undefined) updateData.status = data.status;

    const aid = id;

    const existing = await prisma.appointments.findUnique({
      where: { appointment_id: aid },
    });
    if (!existing) return null;

    // Build proper TIMESTAMPTZ for start_at/end_at if provided
    // If a full ISO timestamp (contains 'T'), use directly; otherwise combine with occurrence_date
    if (data.start_at !== undefined) {
      updateData.start_at = (typeof data.start_at === 'string' && data.start_at.includes('T'))
        ? new Date(data.start_at)
        : buildTimestampIST(existing.occurrence_date, data.start_at);
    }
    if (data.end_at !== undefined) {
      updateData.end_at = (typeof data.end_at === 'string' && data.end_at.includes('T'))
        ? new Date(data.end_at)
        : buildTimestampIST(existing.occurrence_date, data.end_at);
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
   *  - Records attendance: [{partner_id, is_present}]
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
          await tx.appointment_partners.updateMany({
            where: {
              appointment_id: aid,
              partner_id: record.partner_id,
            },
            data: { is_present: record.is_present },
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
