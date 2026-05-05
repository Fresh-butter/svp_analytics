const { prisma } = require('../config/prisma');
const { formatRow, formatRows, activeFilter, fmtDate, fmtTime, parseLocalDate, utcToday } = require('../utils/helpers');

const SORT_COLUMNS = ['investee_name', 'email', 'start_date', 'end_date', 'created_at'];

class InvesteeRepository {
  static allowedSortColumns = SORT_COLUMNS;

  static async findAll(chapter_id, filters) {
    const where = {};

    if (chapter_id) where.chapter_id = chapter_id;

    const conditions = [];

    if (filters?.active === true || filters?.active === false) {
      conditions.push(activeFilter(filters.active));
    }

    if (filters?.search) {
      conditions.push({
        OR: [
          { investee_name: { contains: filters.search, mode: 'insensitive' } },
          { email: { contains: filters.search, mode: 'insensitive' } },
        ],
      });
    }

    if (conditions.length > 0) {
      where.AND = conditions;
    }

    const total = await prisma.investees.count({ where });

    const rows = await prisma.investees.findMany({
      where,
    });

    return {
      rows: formatRows(rows, { computeActive: true }),
      total,
    };
  }

  static async findById(id) {
    const row = await prisma.investees.findUnique({
      where: { investee_id: id },
      include: {
        groups: {
          select: { group_id: true, group_name: true, group_type_id: true, start_date: true, end_date: true },
        },
      }
    });

    if (!row) return null;

    return formatRow(row, { computeActive: true });
  }

  /** Details with active groups and upcoming appointments */
  static async findByIdWithDetails(id) {
    const investee = await prisma.investees.findUnique({
      where: { investee_id: id },
      include: {
        groups: {
          select: { group_id: true, group_name: true, group_type_id: true, start_date: true, end_date: true },
        },
        recurring_appointments: {
          select: {
            rec_appointment_id: true,
            appointment_name: true,
            appointment_type_id: true,
            appointment_types: { select: { type_name: true } },
            start_time: true,
            duration_minutes: true,
            rrule: true,
            start_date: true,
            end_date: true,
          },
          orderBy: { start_date: 'asc' },
        },
        appointments: {
          where: {
            occurrence_date: { gte: parseLocalDate(fmtDate(utcToday())) }
          },
          select: {
            appointment_id: true, appointment_types: { select: { type_name: true } }, occurrence_date: true,
            start_at: true, end_at: true, duration_minutes: true, status: true,
          },
          orderBy: { occurrence_date: 'asc' },
        },
      },
    });

    if (!investee) return null;

    const formatted = formatRow(investee, { computeActive: true });

    formatted.appointments = investee.appointments.map(a => ({
      appointment_id: a.appointment_id,
      appointment_type: a.appointment_types?.type_name || null,
      occurrence_date: fmtDate(a.occurrence_date),
      start_at: fmtTime(a.start_at),
      end_at: fmtTime(a.end_at),
      duration_minutes: a.duration_minutes,
      status: a.status,
    }));

    formatted.recurring_appointments = investee.recurring_appointments.map((r) => ({
      rec_appointment_id: r.rec_appointment_id,
      appointment_name: r.appointment_name || null,
      appointment_type_id: r.appointment_type_id || null,
      appointment_type: r.appointment_types?.type_name || null,
      start_time: fmtTime(r.start_time),
      duration_minutes: r.duration_minutes,
      rrule: r.rrule,
      start_date: fmtDate(r.start_date),
      end_date: fmtDate(r.end_date),
    }));

    return formatted;
  }

  static async create(data) {
    const row = await prisma.investees.create({
      data: {
        chapter_id: data.chapter_id,
        investee_name: data.investee_name,
        email: data.email,
        start_date: parseLocalDate(data.start_date),
        end_date: data.end_date ? parseLocalDate(data.end_date) : null,
      },
    });
    return formatRow(row, { computeActive: true });
  }

  static async update(id, data) {
    const updateData = {};

    if (data.investee_name !== undefined) updateData.investee_name = data.investee_name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.start_date !== undefined) updateData.start_date = parseLocalDate(data.start_date);
    if (data.end_date !== undefined) updateData.end_date = data.end_date ? parseLocalDate(data.end_date) : null;

    if (Object.keys(updateData).length === 0) return this.findById(id);

    try {
      const row = await prisma.investees.update({
        where: { investee_id: id },
        data: updateData,
      });
      return formatRow(row, { computeActive: true });
    } catch (e) {
      if (e.code === 'P2025') return null;
      throw e;
    }
  }

  /** SRS Delete Policy: Cannot delete if referenced in groups or appointments. */
  static async delete(id) {
    const iid = id;

    const gRef = await prisma.groups.findFirst({ where: { investee_id: iid } });
    if (gRef) return { deleted: false, error: 'Cannot delete investee: referenced in groups' };

    const aRef = await prisma.appointments.findFirst({ where: { investee_id: iid } });
    if (aRef) return { deleted: false, error: 'Cannot delete investee: referenced in appointments' };

    const rRef = await prisma.recurring_appointments.findFirst({ where: { investee_id: iid } });
    if (rRef) return { deleted: false, error: 'Cannot delete investee: referenced in recurring_appointments' };

    try {
      await prisma.investees.delete({ where: { investee_id: iid } });
      return { deleted: true };
    } catch (e) {
      if (e.code === 'P2025') return { deleted: false };
      throw e;
    }
  }
}

module.exports = { InvesteeRepository };
