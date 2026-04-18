const { prisma } = require('../config/prisma');
const { formatRow, formatRows, activeFilter, fmtDate, fmtTime, parseLocalDate, utcToday } = require('../utils/helpers');
const { isDateWithinMonthYear, monthYearPagination } = require('../utils/controllerHelpers');

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

  /** Details with active groups, appointments, and recurring appointments */
  static async findByIdWithDetails(id, queryFilters = {}) {
    const investee = await prisma.investees.findUnique({
      where: { investee_id: id },
      include: {
        groups: {
          select: {
            group_id: true,
            group_name: true,
            group_type_id: true,
            start_date: true,
            end_date: true,
            group_types: {
              select: {
                group_type_id: true,
                type_name: true,
              }
            },
          },
        },
        appointments: {
          select: {
            appointment_id: true,
            appointment_name: true,
            occurrence_date: true,
            start_at: true,
            end_at: true,
            duration_minutes: true,
            actual_meeting_minutes: true,
            status: true,
            group_type_id: true,
            appointment_type_id: true,
            appointment_types: {
              select: {
                appointment_type_id: true,
                type_name: true,
              }
            },
            group_types: {
              select: {
                group_type_id: true,
                type_name: true,
              }
            },
          },
          orderBy: { occurrence_date: 'asc' },
        },
        recurring_appointments: {
          select: {
            rec_appointment_id: true,
            appointment_name: true,
            appointment_type_id: true,
            group_id: true,
            start_date: true,
            end_date: true,
            start_time: true,
            duration_minutes: true,
            rrule: true,
            appointment_types: {
              select: {
                appointment_type_id: true,
                type_name: true,
              }
            },
            groups: {
              select: {
                group_id: true,
                group_name: true,
              }
            },
          },
          orderBy: { start_date: 'asc' },
        },
      },
    });

    if (!investee) return null;

    const formatted = formatRow(investee, { computeActive: true });
    const month = queryFilters.month ? Number(queryFilters.month) : null;
    const year = queryFilters.year ? Number(queryFilters.year) : null;

    formatted.groups = investee.groups.map((g) => {
      const group = formatRow(g, { computeActive: true });
      group.group_type = g.group_types ? formatRow(g.group_types) : null;
      delete group.group_types;
      return group;
    });

    const appointments = investee.appointments
      .map((a) => ({
      appointment_id: a.appointment_id,
      appointment_name: a.appointment_name,
      appointment_type_id: a.appointment_type_id,
      group_type_id: a.group_type_id,
      appointment_type: a.appointment_types ? formatRow(a.appointment_types) : null,
      group_type: a.group_types ? formatRow(a.group_types) : null,
      occurrence_date: fmtDate(a.occurrence_date),
      start_at: fmtTime(a.start_at),
      end_at: fmtTime(a.end_at),
      duration_minutes: a.duration_minutes,
      actual_meeting_minutes: a.actual_meeting_minutes,
      status: a.status,
    }));
    formatted.appointments = appointments
      .filter((row) => {
        if (!month || !year) return true;
        return isDateWithinMonthYear(row.occurrence_date, month, year);
      });

    formatted.pagination = monthYearPagination(
      month || new Date().getMonth() + 1,
      year || new Date().getFullYear(),
      formatted.appointments.length,
    );

    formatted.recurring_appointments = investee.recurring_appointments.map((ra) => ({
      rec_appointment_id: ra.rec_appointment_id,
      appointment_name: ra.appointment_name,
      appointment_type_id: ra.appointment_type_id,
      group_id: ra.group_id,
      appointment_type: ra.appointment_types ? formatRow(ra.appointment_types) : null,
      group: ra.groups ? formatRow(ra.groups) : null,
      start_date: fmtDate(ra.start_date),
      end_date: fmtDate(ra.end_date),
      start_time: fmtTime(ra.start_time),
      duration_minutes: ra.duration_minutes,
      rrule: ra.rrule,
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
