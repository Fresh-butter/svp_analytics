const { prisma } = require('../config/prisma');
const { formatRow, parseLocalDate, buildTimestampIST, utcToday } = require('../utils/helpers');

const COMPLETION_ATTENDANCE_STATUSES = new Set(['ABSENT_NOT_INFORMED', 'ABSENT_INFORMED', 'PRESENT']);

const SORT_COLUMNS = ['occurrence_date', 'appointment_type', 'start_at', 'status', 'created_at'];

class AppointmentRepository {
  static allowedSortColumns = SORT_COLUMNS;

  static async ensureNameUniqueForDate(chapterId, appointmentName, occurrenceDate, excludeAppointmentId = null) {
    const where = {
      chapter_id: chapterId,
      occurrence_date: occurrenceDate,
      appointment_name: { equals: appointmentName, mode: 'insensitive' },
    };

    if (excludeAppointmentId) {
      where.appointment_id = { not: excludeAppointmentId };
    }

    const duplicate = await prisma.appointments.findFirst({
      where,
      select: { appointment_id: true },
    });

    if (duplicate) {
      const err = new Error('appointment_name must be unique for the same occurrence_date');
      err.code = 'VALIDATION';
      throw err;
    }
  }

  static normalizeAppointmentName(value) {
    const name = typeof value === 'string' ? value.trim() : '';
    return name;
  }

  static normalizeTimeString(value, fieldName) {
    if (typeof value !== 'string') {
      const err = new Error(`${fieldName} is required`);
      err.code = 'VALIDATION';
      throw err;
    }

    const raw = value.trim();
    const match = raw.match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);
    if (!match) {
      const err = new Error(`${fieldName} must be in HH:MM or HH:MM:SS format`);
      err.code = 'VALIDATION';
      throw err;
    }

    const h = Number(match[1]);
    const m = Number(match[2]);
    const s = Number(match[3] || '00');
    if (h > 23 || m > 59 || s > 59) {
      const err = new Error(`${fieldName} has invalid time value`);
      err.code = 'VALIDATION';
      throw err;
    }

    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  static toISTTimeString(timestamp) {
    if (!timestamp) return null;
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    if (Number.isNaN(date.getTime())) return null;

    // Convert UTC instant to IST clock time by adding +05:30, then reading UTC fields.
    const istMs = date.getTime() + (330 * 60 * 1000);
    const istDate = new Date(istMs);
    const h = String(istDate.getUTCHours()).padStart(2, '0');
    const m = String(istDate.getUTCMinutes()).padStart(2, '0');
    const s = String(istDate.getUTCSeconds()).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  static addDerivedTimes(row) {
    if (!row) return row;
    return {
      ...row,
      start_time: this.toISTTimeString(row.start_at),
      end_time: this.toISTTimeString(row.end_at),
    };
  }

  static async validatePartnersActiveOnDate(chapterId, partnerIds, occurrenceDate) {
    if (!Array.isArray(partnerIds) || partnerIds.length === 0) return;

    const uniquePartnerIds = [...new Set(partnerIds.filter(Boolean))];
    if (uniquePartnerIds.length === 0) return;

    const activePartners = await prisma.partners.findMany({
      where: {
        chapter_id: chapterId,
        partner_id: { in: uniquePartnerIds },
        start_date: { lte: occurrenceDate },
        OR: [
          { end_date: null },
          { end_date: { gte: occurrenceDate } },
        ],
      },
      select: { partner_id: true },
    });

    const activeSet = new Set(activePartners.map((row) => row.partner_id));
    const invalidPartnerIds = uniquePartnerIds.filter((id) => !activeSet.has(id));
    if (invalidPartnerIds.length > 0) {
      const err = new Error(`Partners must be active on occurrence_date. Invalid partner_ids: ${invalidPartnerIds.join(', ')}`);
      err.code = 'VALIDATION';
      throw err;
    }
  }

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
        const row = this.addDerivedTimes(formatRow(r));
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
    return this.addDerivedTimes(formatRow(row));
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

    const formattedRow = this.addDerivedTimes(formatRow(row));

    const partners = row.appointment_partners.map(ap => ({
      appointment_partner_id: ap.app_partner_id,
      attendance_status: ap.attendance_status,
      is_present: ap.attendance_status === 'PRESENT',
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
    *  - Partner links are sourced only from explicit `partners` passed by client.
   */
  static async create(data) {
    const appointmentName = this.normalizeAppointmentName(data.appointment_name);
    if (!appointmentName) {
      const err = new Error('appointment_name is required');
      err.code = 'VALIDATION';
      throw err;
    }

    if (!data.occurrence_date) {
      const err = new Error('occurrence_date is required');
      err.code = 'VALIDATION';
      throw err;
    }

    const occDate = parseLocalDate(data.occurrence_date);
    if (Number.isNaN(occDate.getTime())) {
      const err = new Error('Invalid occurrence_date');
      err.code = 'VALIDATION';
      throw err;
    }

    const startTimeStr = this.normalizeTimeString(data.start_time, 'start_time');
    const endTimeStr = this.normalizeTimeString(data.end_time, 'end_time');

    await this.ensureNameUniqueForDate(data.chapter_id, appointmentName, occDate);

    // Build proper TIMESTAMPTZ from IST clock times.
    const startAt = buildTimestampIST(occDate, startTimeStr);
    const endAt = buildTimestampIST(occDate, endTimeStr);

    if (startAt > endAt) {
      const err = new Error('start_time must be before or equal to end_time');
      err.code = 'VALIDATION';
      throw err;
    }

    let appt;
    try {
      appt = await prisma.appointments.create({
        data: {
          chapter_id: data.chapter_id,
          appointment_name: appointmentName,
          investee_id: data.investee_id || null,
          group_type_id: data.group_type_id || null,
          appointment_type_id: data.appointment_type_id || null,
          status: 'PENDING',
          occurrence_date: occDate,
          start_at: startAt,
          end_at: endAt,
        },
      });
    } catch (e) {
      if (e.code === 'P2002') {
        const err = new Error('appointment_name must be unique for the same occurrence_date');
        err.code = 'VALIDATION';
        throw err;
      }
      throw e;
    }

    const seenPartners = new Set();

    // Only explicit partners are accepted from client payload.
    const partnerList = data.partners;
    await this.validatePartnersActiveOnDate(data.chapter_id, partnerList, occDate);
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

    if (data.appointment_name !== undefined) {
      const appointmentName = this.normalizeAppointmentName(data.appointment_name);
      if (!appointmentName) {
        const err = new Error('appointment_name cannot be empty');
        err.code = 'VALIDATION';
        throw err;
      }
      updateData.appointment_name = appointmentName;
    }
    if (data.appointment_type_id !== undefined) updateData.appointment_type_id = data.appointment_type_id || null;
    if (data.group_type_id !== undefined) updateData.group_type_id = data.group_type_id || null;
    if (data.investee_id !== undefined) updateData.investee_id = data.investee_id || null;
    if (data.status !== undefined) {
      const err = new Error('status cannot be updated via PUT. Use PATCH /appointments/:id/complete, /cancel, or /pending');
      err.code = 'VALIDATION';
      throw err;
    }
    const aid = id;

    const existing = await prisma.appointments.findUnique({
      where: { appointment_id: aid },
    });
    if (!existing) return null;

    const occurrenceDateInput = data.occurrence_date;
    const baseOccurrenceDate = occurrenceDateInput ? parseLocalDate(occurrenceDateInput) : existing.occurrence_date;
    if (occurrenceDateInput !== undefined) {
      if (Number.isNaN(baseOccurrenceDate.getTime())) {
        const err = new Error('Invalid occurrence_date');
        err.code = 'VALIDATION';
        throw err;
      }
      updateData.occurrence_date = baseOccurrenceDate;
    }

    const startTimeInput = data.start_time;
    const endTimeInput = data.end_time;

    if (startTimeInput !== undefined) {
      const normalizedStart = this.normalizeTimeString(startTimeInput, 'start_time');
      updateData.start_at = buildTimestampIST(baseOccurrenceDate, normalizedStart);
    }
    if (endTimeInput !== undefined) {
      const normalizedEnd = this.normalizeTimeString(endTimeInput, 'end_time');
      updateData.end_at = buildTimestampIST(baseOccurrenceDate, normalizedEnd);
    }

    const startCandidate = updateData.start_at || existing.start_at;
    const endCandidate = updateData.end_at || existing.end_at;
    if (startCandidate > endCandidate) {
      const err = new Error('start_time must be before or equal to end_time');
      err.code = 'VALIDATION';
      throw err;
    }

    if (Array.isArray(data.partners)) {
      const effectiveOccurrenceDate = updateData.occurrence_date || existing.occurrence_date;
      await this.validatePartnersActiveOnDate(existing.chapter_id, data.partners, effectiveOccurrenceDate);
    }

    const effectiveAppointmentName = updateData.appointment_name || existing.appointment_name;
    const effectiveOccurrenceDate = updateData.occurrence_date || existing.occurrence_date;
    await this.ensureNameUniqueForDate(existing.chapter_id, effectiveAppointmentName, effectiveOccurrenceDate, aid);

    // Use transaction to update appointment and optionally sync partners
    let updated;
    try {
      updated = await prisma.$transaction(async (tx) => {
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
    } catch (e) {
      if (e.code === 'P2002') {
        const err = new Error('appointment_name must be unique for the same occurrence_date');
        err.code = 'VALIDATION';
        throw err;
      }
      throw e;
    }

    return this.findByIdWithDetails(aid);
  }

  /**
   * SRS Complete:
   *  PATCH /appointments/:id/complete
   *  - Sets status = 'COMPLETED'
   *  - Records attendance: [{partner_id, attendance_status}]
   *  - Updates actual_meeting_minutes on the appointment
   */
  static async complete(id, payload) {
    const aid = id;
    const attendance = Array.isArray(payload?.attendance) ? payload.attendance : [];
    const actualMeetingMinutes = payload?.actual_meeting_minutes;

    const existing = await prisma.appointments.findUnique({
      where: { appointment_id: aid },
    });
    if (!existing || existing.status !== 'PENDING') return null;

    if (!Number.isInteger(actualMeetingMinutes) || actualMeetingMinutes < 0) {
      const err = new Error('actual_meeting_minutes must be a non-negative integer');
      err.code = 'VALIDATION';
      throw err;
    }

    if (!attendance.length) {
      const err = new Error('attendance array is required and cannot be empty');
      err.code = 'VALIDATION';
      throw err;
    }

    const seenPartnerIds = new Set();
    for (const record of attendance) {
      if (!record || !record.partner_id) {
        const err = new Error('Each attendance record must include partner_id');
        err.code = 'VALIDATION';
        throw err;
      }
      if (seenPartnerIds.has(record.partner_id)) {
        const err = new Error('Duplicate partner_id in attendance array');
        err.code = 'VALIDATION';
        throw err;
      }
      seenPartnerIds.add(record.partner_id);

      if (!COMPLETION_ATTENDANCE_STATUSES.has(record.attendance_status)) {
        const err = new Error('Invalid attendance_status');
        err.code = 'VALIDATION';
        throw err;
      }
    }

    const existingPartners = await prisma.appointment_partners.findMany({
      where: { appointment_id: aid },
      select: { partner_id: true },
    });
    const existingPartnerIds = new Set(existingPartners.map((row) => row.partner_id));
    for (const record of attendance) {
      if (!existingPartnerIds.has(record.partner_id)) {
        const err = new Error(`Partner ${record.partner_id} is not attached to this appointment`);
        err.code = 'VALIDATION';
        throw err;
      }
    }

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
        data: { status: 'COMPLETED', actual_meeting_minutes: actualMeetingMinutes },
      });

      if (attendance && attendance.length > 0) {
        for (const record of attendance) {
          await tx.appointment_partners.updateMany({
            where: {
              appointment_id: aid,
              partner_id: record.partner_id,
            },
            data: {
              attendance_status: record.attendance_status,
            },
          });
        }
      }
    });

    return this.findByIdWithDetails(aid);
  }

  static async cancel(id) {
    const aid = id;
    const existing = await prisma.appointments.findUnique({
      where: { appointment_id: aid },
    });
    if (!existing) return null;

    const shouldResetAttendance = existing.status === 'COMPLETED';

    await prisma.$transaction(async (tx) => {
      await tx.appointments.update({
        where: { appointment_id: aid },
        data: {
          status: 'CANCELLED',
          actual_meeting_minutes: null,
        },
      });

      if (shouldResetAttendance) {
        await tx.appointment_partners.updateMany({
          where: { appointment_id: aid },
          data: { attendance_status: 'PENDING' },
        });
      }
    });

    return this.findByIdWithDetails(aid);
  }

  static async markPending(id) {
    const aid = id;
    const existing = await prisma.appointments.findUnique({
      where: { appointment_id: aid },
    });
    if (!existing) return null;

    const shouldResetAttendance = existing.status !== 'PENDING';

    await prisma.$transaction(async (tx) => {
      await tx.appointments.update({
        where: { appointment_id: aid },
        data: {
          status: 'PENDING',
          actual_meeting_minutes: null,
        },
      });

      if (shouldResetAttendance) {
        await tx.appointment_partners.updateMany({
          where: { appointment_id: aid },
          data: { attendance_status: 'PENDING' },
        });
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
