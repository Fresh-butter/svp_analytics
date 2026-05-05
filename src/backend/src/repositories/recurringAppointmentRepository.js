const { prisma } = require('../config/prisma');
const { formatRow, formatRows, fmtDate, fmtTime, fmtTimestamp, parseTime, parseLocalDate, utcToday } = require('../utils/helpers');

class RecurringAppointmentRepository {
  /* ── List all templates ── */
  static buildPartnerAccessWhere(partner_id) {
    if (!partner_id) return {};

    const today = utcToday();
    return {
      OR: [
        { recurring_appointment_partners: { some: { partner_id } } },
        {
          groups: {
            group_partners: {
              some: {
                partner_id,
                start_date: { lte: today },
                OR: [{ end_date: null }, { end_date: { gte: today } }],
              },
            },
          },
        },
      ],
    };
  }

  static async findAll(chapter_id, partner_id) {
    const where = {};
    if (chapter_id) where.chapter_id = chapter_id;
    Object.assign(where, this.buildPartnerAccessWhere(partner_id));

    const rows = await prisma.recurring_appointments.findMany({
      where,
      include: {
        groups: true,
        investees: true,
      }
    });

    return rows.map(r => {
      const row = formatRow(r);
      row.group = r.groups ? formatRow(r.groups) : null;
      row.investee = r.investees ? formatRow(r.investees) : null;
      delete row.groups;
      delete row.investees;
      return row;
    });
  }

  /* ── Single with partners, group & investee ── */
  static async findById(id) {
    const row = await prisma.recurring_appointments.findUnique({
      where: { rec_appointment_id: id },
      include: {
        groups: true,
        investees: true,
        recurring_appointment_partners: {
          include: {
            partners: { select: { partner_id: true, partner_name: true, email: true } },
          },
          orderBy: { partners: { partner_name: 'asc' } },
        }
      },
    });

    if (!row) return null;

    const result = formatRow(row);
    result.group = row.groups ? formatRow(row.groups) : null;
    result.investee = row.investees ? formatRow(row.investees) : null;

    result.partners = row.recurring_appointment_partners.map(rp => ({
      rec_app_partner_id: rp.rec_app_partner_id,
      partner_id: rp.partners.partner_id,
      partner_name: rp.partners.partner_name,
      email: rp.partners.email,
    }));

    delete result.groups;
    delete result.investees;
    delete result.recurring_appointment_partners;

    return result;
  }

  static async hasAccess(id, partner_id) {
    if (!partner_id) return true;
    const row = await prisma.recurring_appointments.findFirst({
      where: {
        rec_appointment_id: id,
        ...this.buildPartnerAccessWhere(partner_id),
      },
      select: { rec_appointment_id: true },
    });
    return !!row;
  }

  /* ── Create template with optional partner subset ── */
  static async create(data) {
    const template = await prisma.recurring_appointments.create({
      data: {
        chapter_id: data.chapter_id,
        appointment_name: data.appointment_name || null,
        group_id: data.group_id || null,
        appointment_type_id: data.appointment_type_id || null,
        start_time: parseTime(data.start_time || data.start_at),
        duration_minutes: parseInt(data.duration_minutes),
        rrule: data.rrule,
        investee_id: data.investee_id || null,
        start_date: parseLocalDate(data.start_date),
        end_date: parseLocalDate(data.end_date),
      },
    });

    const partnerList = data.partners || data.partner_ids;
    if (partnerList && Array.isArray(partnerList) && partnerList.length > 0) {
      const partnerInserts = partnerList.map(pId => ({
        chapter_id: data.chapter_id,
        rec_appointment_id: template.rec_appointment_id,
        partner_id: pId,
      }));
      await prisma.recurring_appointment_partners.createMany({
        data: partnerInserts,
        skipDuplicates: true
      });
    }

    return this.findById(template.rec_appointment_id);
  }

  /* ── Update template (only affects unmaterialized occurrences) ── */
  static async update(id, data) {
    const updateData = {};

    const dateFields = ['start_date', 'end_date'];
    const timeFields = ['start_time'];
    const intFields = ['duration_minutes'];
    const strFields = ['appointment_name', 'appointment_type_id', 'group_id', 'investee_id', 'rrule'];

    for (const f of dateFields) {
      if (data[f] !== undefined) updateData[f] = parseLocalDate(data[f]);
    }
    for (const f of timeFields) {
      if (data[f] !== undefined) updateData[f] = parseTime(data[f]);
    }
    for (const f of intFields) {
      if (data[f] !== undefined) updateData[f] = data[f] != null ? parseInt(data[f]) : null;
    }
    for (const f of strFields) {
      if (data[f] !== undefined) updateData[f] = data[f] || null;
    }

    if (Object.keys(updateData).length > 0) {
      updateData.modified_at = new Date();
      try {
        await prisma.recurring_appointments.update({
          where: { rec_appointment_id: id },
          data: updateData,
        });
      } catch (e) {
        if (e.code === 'P2025') return null;
        throw e;
      }
    }

    // Sync recurring template partners when needed.
    const partnerList = data.partners || data.partner_ids;
    const needsPartnerSync = Array.isArray(partnerList) || data.group_id !== undefined;
    if (needsPartnerSync) {
      const tmpl = await prisma.recurring_appointments.findUnique({
        where: { rec_appointment_id: id },
        select: { chapter_id: true, group_id: true },
      });
      if (!tmpl) return null;

      if (data.group_id !== undefined || Array.isArray(partnerList)) {
        await prisma.recurring_appointment_partners.deleteMany({
          where: { rec_appointment_id: id },
        });
      }

      if (Array.isArray(partnerList) && partnerList.length > 0) {
        const partnerInserts = partnerList.map(pId => ({
          chapter_id: tmpl.chapter_id,
          rec_appointment_id: id,
          partner_id: pId,
        }));
        await prisma.recurring_appointment_partners.createMany({
          data: partnerInserts,
          skipDuplicates: true
        });
      }
    }

    return this.findById(id);
  }

  /* ── Delete — ON DELETE SET NULL in appointments, CASCADE in partners ── */
  static async delete(id) {
    try {
      await prisma.$transaction(async (tx) => {
        // Set rec_appointment_id = null on materialized appointments
        await tx.appointments.updateMany({
          where: { rec_appointment_id: id },
          data: { rec_appointment_id: null },
        });

        // recurring_appointment_partners cascade-deletes via DB FK
        await tx.recurring_appointments.delete({
          where: { rec_appointment_id: id },
        });
      });
      return { deleted: true };
    } catch (e) {
      if (e.code === 'P2025') return { deleted: false };
      throw e;
    }
  }

  /* ── Active templates whose date range covers the given date ── */
  static async findActiveForDate(date) {
    const d = parseLocalDate(typeof date === 'string' ? date : fmtDate(date));
    const rows = await prisma.recurring_appointments.findMany({
      where: {
        start_date: { lte: d },
        end_date: { gte: d },
      },
    });
    return formatRows(rows);
  }

  /* ── Check if already materialized for a specific occurrence date ── */
  static async isAlreadyMaterialized(recAppointmentId, occurrenceDate) {
    const row = await prisma.appointments.findFirst({
      where: {
        rec_appointment_id: recAppointmentId,
        occurrence_date: parseLocalDate(occurrenceDate),
      },
    });
    return !!row;
  }
}

module.exports = { RecurringAppointmentRepository };
