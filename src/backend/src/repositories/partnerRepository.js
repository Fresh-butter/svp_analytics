const { prisma } = require('../config/prisma');
const { formatRow, formatRows, activeFilter, fmtDate, fmtTime, fmtTimestamp, parseLocalDate, utcToday } = require('../utils/helpers');

const SORT_COLUMNS = ['partner_name', 'email', 'start_date', 'end_date', 'created_at'];

class PartnerRepository {
  static allowedSortColumns = SORT_COLUMNS;

  static async findByEmail(email, chapter_id) {
    const where = { email };
    if (chapter_id) where.chapter_id = chapter_id;
    const row = await prisma.partners.findFirst({
      where,
      select: {
        partner_id: true,
        chapter_id: true,
        partner_name: true,
        email: true,
      },
    });
    return formatRow(row, { computeActive: true });
  }

  static async findAll(chapter_id, filters) {
    const where = {};

    if (chapter_id) where.chapter_id = chapter_id;

    if (filters?.active === true || filters?.active === false) {
      Object.assign(where, activeFilter(filters.active));
    }

    if (filters?.primary === 'true') {
      where.primary_partner_id = null;
    } else if (filters?.primary === 'false') {
      where.primary_partner_id = { not: null };
    }

    const rows = await prisma.partners.findMany({
      where,
      select: {
        partner_id: true, chapter_id: true, partner_name: true,
        email: true, linkedin_url: true, primary_partner_id: true,
        start_date: true, end_date: true, created_at: true,
      },
    });

    return {
      rows: formatRows(rows, { computeActive: true })
    };
  }

  static async findById(id) {
    const row = await prisma.partners.findUnique({
      where: { partner_id: id },
    });
    return formatRow(row, { computeActive: true });
  }

  static async hasSubPartners(id) {
    const subPartner = await prisma.partners.findFirst({
      where: { primary_partner_id: id }
    });
    return !!subPartner;
  }

  /** Get partner with groups and appointments details (for GET /partners/:id) */
  static async findByIdWithDetails(id, queryFilters = {}) {
    const partner = await prisma.partners.findUnique({
      where: { partner_id: id },
      include: {
        group_partners: {
          select: {
            group_partner_id: true,
            start_date: true,
            end_date: true,
            groups: {
              select: {
                group_id: true,
                group_name: true,
                group_types: { select: { type_name: true } }
              }
            }
          },
          orderBy: { start_date: 'desc' },
        },
        appointment_partners: {
          select: {
            is_present: true,
            appointments: {
              select: { appointment_id: true, occurrence_date: true, start_at: true, end_at: true, status: true, appointment_types: { select: { type_name: true } } }
            },
          },
          orderBy: { appointments: { occurrence_date: 'desc' } },
        },
        recurring_appointment_partners: {
          select: {
            rec_app_partner_id: true,
            recurring_appointments: {
              select: {
                rec_appointment_id: true,
                start_date: true,
                end_date: true,
                start_time: true,
                duration_minutes: true,
                rrule: true,
                appointment_types: { select: { type_name: true } }
              }
            }
          }
        }
      }
    });
    if (!partner) return null;

    const today = utcToday();

    const formatted = formatRow(partner, { computeActive: true });

    formatted.groups = partner.group_partners.map(gp => {
      const sd = new Date(gp.start_date); sd.setUTCHours(0, 0, 0, 0);
      const ed = gp.end_date ? new Date(gp.end_date) : new Date(Date.UTC(9999, 11, 31)); ed.setUTCHours(0, 0, 0, 0);
      return {
        group_partner_id: gp.group_partner_id,
        gp_start: fmtDate(gp.start_date),
        gp_end: fmtDate(gp.end_date),
        gp_active: sd <= today && ed >= today,
        group_id: gp.groups.group_id,
        group_name: gp.groups.group_name,
        group_type: gp.groups.group_types?.type_name || null,
      };
    });

    formatted.appointments = partner.appointment_partners.map(ap => ({
      appointment_id: ap.appointments.appointment_id,
      appointment_type: ap.appointments.appointment_types?.type_name || null,
      occurrence_date: fmtDate(ap.appointments.occurrence_date),
      start_at: fmtTime(ap.appointments.start_at),
      end_at: fmtTime(ap.appointments.end_at),
      status: ap.appointments.status,
      is_present: ap.is_present,
    }));

    formatted.recurring_appointments = partner.recurring_appointment_partners.map(rap => ({
      rec_app_partner_id: rap.rec_app_partner_id,
      rec_appointment_id: rap.recurring_appointments.rec_appointment_id,
      appointment_type: rap.recurring_appointments.appointment_types?.type_name || null,
      start_date: fmtDate(rap.recurring_appointments.start_date),
      end_date: rap.recurring_appointments.end_date ? fmtDate(rap.recurring_appointments.end_date) : null,
      start_time: fmtTime(rap.recurring_appointments.start_time),
      duration_minutes: rap.recurring_appointments.duration_minutes,
      rrule: rap.recurring_appointments.rrule,
    }));

    return formatted;
  }

  static async create(data) {
    const row = await prisma.partners.create({
      data: {
        chapter_id: data.chapter_id,
        partner_name: data.partner_name,
        email: data.email || null,
        linkedin_url: data.linkedin_url || null,
        primary_partner_id: data.primary_partner_id || null,
        start_date: parseLocalDate(data.start_date),
        end_date: data.end_date ? parseLocalDate(data.end_date) : null,
      },
    });
    return formatRow(row, { computeActive: true });
  }

  static async update(id, data) {
    const updateData = {};

    if (data.partner_name !== undefined) updateData.partner_name = data.partner_name;
    if (data.email !== undefined) updateData.email = data.email || null;
    if (data.linkedin_url !== undefined) updateData.linkedin_url = data.linkedin_url || null;
    if (data.primary_partner_id !== undefined) updateData.primary_partner_id = data.primary_partner_id || null;
    if (data.start_date !== undefined) updateData.start_date = parseLocalDate(data.start_date);
    if (data.end_date !== undefined) updateData.end_date = data.end_date ? parseLocalDate(data.end_date) : null;

    if (Object.keys(updateData).length === 0) return this.findById(id);

    try {
      const row = await prisma.partners.update({
        where: { partner_id: id },
        data: updateData,
      });
      return formatRow(row, { computeActive: true });
    } catch (e) {
      if (e.code === 'P2025') return null; // Not found
      throw e;
    }
  }

  /**
   * SRS Delete Policy: Cannot delete if referenced in group_partners or appointment_partners.
   */
  static async delete(id) {
    const pid = id;

    const gpRef = await prisma.group_partners.findFirst({ where: { partner_id: pid } });
    if (gpRef) return { deleted: false, error: 'Cannot delete partner: referenced in group_partners' };

    const apRef = await prisma.appointment_partners.findFirst({ where: { partner_id: pid } });
    if (apRef) return { deleted: false, error: 'Cannot delete partner: referenced in appointment_partners' };

    const rapRef = await prisma.recurring_appointment_partners.findFirst({ where: { partner_id: pid } });
    if (rapRef) return { deleted: false, error: 'Cannot delete partner: referenced in recurring_appointment_partners' };

    try {
      await prisma.partners.delete({ where: { partner_id: pid } });
      return { deleted: true };
    } catch (e) {
      if (e.code === 'P2025') return { deleted: false };
      throw e;
    }
  }
}

module.exports = { PartnerRepository };
