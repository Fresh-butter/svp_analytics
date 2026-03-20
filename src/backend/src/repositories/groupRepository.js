const { prisma } = require('../config/prisma');
const { formatRow, formatRows, activeFilter, fmtDate, parseLocalDate, utcToday } = require('../utils/helpers');

const SORT_COLUMNS = ['group_name', 'group_type_id', 'start_date', 'end_date', 'created_at'];

class GroupRepository {
  static allowedSortColumns = SORT_COLUMNS;

  static async findAll(chapter_id, filters) {
    const where = {};

    if (chapter_id) where.chapter_id = chapter_id;

    if (filters?.active === true || filters?.active === false) {
      Object.assign(where, activeFilter(filters.active));
    }
    if (filters?.group_type_id) {
      where.group_type_id = filters.group_type_id;
    }
    if (filters?.search) {
      where.group_name = { contains: filters.search, mode: 'insensitive' };
    }

    const total = await prisma.groups.count({ where });

    const rows = await prisma.groups.findMany({
      where,
    });

    return {
      rows: formatRows(rows, { computeActive: true }),
      total,
    };
  }

  static async findById(id) {
    const row = await prisma.groups.findUnique({
      where: { group_id: id },
    });
    return formatRow(row, { computeActive: true });
  }

  /** GET /groups/:id — with members (partners), investees, and recurring_appointments */
  static async findByIdWithDetails(id) {
    const group = await prisma.groups.findUnique({
      where: { group_id: id },
      include: {
        investees: {
          select: { investee_name: true }
        },
        group_partners: {
          include: {
            partners: {
              select: { partner_id: true, partner_name: true, email: true, start_date: true, end_date: true },
            },
          },
          orderBy: { start_date: 'asc' },
        },
        recurring_appointments: true,
      }
    });
    if (!group) return null;

    const formattedGroup = formatRow(group, { computeActive: true });
    const today = utcToday();

    formattedGroup.members = group.group_partners.map(gp => {
      const gpSd = new Date(gp.start_date); gpSd.setUTCHours(0, 0, 0, 0);
      const gpEd = gp.end_date ? new Date(gp.end_date) : new Date(Date.UTC(9999, 11, 31)); gpEd.setUTCHours(0, 0, 0, 0);
      const pSd = new Date(gp.partners.start_date); pSd.setUTCHours(0, 0, 0, 0);
      const pEd = gp.partners.end_date ? new Date(gp.partners.end_date) : new Date(Date.UTC(9999, 11, 31)); pEd.setUTCHours(0, 0, 0, 0);

      return {
        group_partner_id: gp.group_partner_id,
        partner_id: gp.partners.partner_id,
        partner_name: gp.partners.partner_name,
        email: gp.partners.email,
        start_date: fmtDate(gp.start_date),
        end_date: fmtDate(gp.end_date),
        membership_active: gpSd <= today && gpEd >= today,
        partner_active: pSd <= today && pEd >= today,
      };
    });

    // Format recurring_appointments to standard structure
    formattedGroup.recurring_appointments = group.recurring_appointments.map(ra => formatRow(ra));

    // Clean up raw nested objects
    delete formattedGroup.group_partners;
    delete formattedGroup.investees;
    if (group.investees) {
      formattedGroup.investee_name = group.investees.investee_name;
    }

    return formattedGroup;
  }

  static async create(data) {
    const row = await prisma.groups.create({
      data: {
        chapter_id: data.chapter_id,
        investee_id: data.investee_id || null,
        group_name: data.group_name,
        group_type_id: data.group_type_id,
        start_date: parseLocalDate(data.start_date),
        end_date: data.end_date ? parseLocalDate(data.end_date) : null,
      },
    });
    return formatRow(row, { computeActive: true });
  }

  static async update(id, data) {
    const updateData = {};

    if (data.group_name !== undefined) updateData.group_name = data.group_name;
    if (data.group_type_id !== undefined) updateData.group_type_id = data.group_type_id;
    if (data.investee_id !== undefined) updateData.investee_id = data.investee_id || null;
    if (data.start_date !== undefined) updateData.start_date = parseLocalDate(data.start_date);
    if (data.end_date !== undefined) updateData.end_date = data.end_date ? parseLocalDate(data.end_date) : null;

    if (Object.keys(updateData).length === 0) return this.findById(id);

    // Validate date bounds against existing group partners if dates are changing
    if (updateData.start_date || updateData.end_date !== undefined) {
      const currentGroup = await prisma.groups.findUnique({
        where: { group_id: id },
        select: { start_date: true, end_date: true }
      });

      if (!currentGroup) return null;

      const newSd = updateData.start_date ? new Date(updateData.start_date).getTime() : new Date(currentGroup.start_date).getTime();
      const newEd = updateData.end_date !== undefined
        ? (updateData.end_date ? new Date(updateData.end_date).getTime() : new Date('9999-12-31').getTime())
        : (currentGroup.end_date ? new Date(currentGroup.end_date).getTime() : new Date('9999-12-31').getTime());

      const groupPartners = await prisma.group_partners.findMany({
        where: { group_id: id },
        select: { start_date: true, end_date: true, partners: { select: { partner_name: true } } }
      });

      for (const gp of groupPartners) {
        const gpSd = new Date(gp.start_date).getTime();
        const gpEd = gp.end_date ? new Date(gp.end_date).getTime() : new Date('9999-12-31').getTime();

        if (newSd > gpSd || newEd < gpEd) {
          return { error: `Cannot update group dates: Group dates must encompass partner ${gp.partners.partner_name}'s membership period.` };
        }
      }
    }

    try {
      const row = await prisma.groups.update({
        where: { group_id: id },
        data: updateData,
      });
      return formatRow(row, { computeActive: true });
    } catch (e) {
      if (e.code === 'P2025') return null;
      throw e;
    }
  }

  /* ── Group Partners (membership) ── */

  /**
   * Syncs the entire partner list for a group.
   * `partners` should be an array of objects: { partner_id, start_date, end_date }
   */
  static async syncPartners(group_id, chapter_id, partners) {
    if (!partners || !Array.isArray(partners)) return { success: true };

    const group = await prisma.groups.findUnique({
      where: { group_id },
      select: { start_date: true, end_date: true }
    });
    if (!group) return { error: 'Group not found' };

    const groupSd = new Date(group.start_date).getTime();
    const groupEd = group.end_date ? new Date(group.end_date).getTime() : new Date('9999-12-31').getTime();

    // Fetch all partner boundaries to enforce validation rules
    const partnerIds = partners.map(p => p.partner_id);
    const dbPartners = await prisma.partners.findMany({
      where: { partner_id: { in: partnerIds } },
      select: { partner_id: true, start_date: true, end_date: true, partner_name: true }
    });

    const partnerMap = new Map();
    dbPartners.forEach(p => partnerMap.set(p.partner_id, p));

    // Validate dates: MAX(partner.start_date, group.start_date) <= gp.start_date <= COALESCE(gp.end_date, '9999-12-31') <= MIN(partner.end_date, group.end_date)
    for (const p of partners) {
      const dbPartner = partnerMap.get(p.partner_id);
      if (!dbPartner) return { error: `Partner ${p.partner_id} not found` };

      const gpSd = p.start_date ? new Date(p.start_date).getTime() : new Date().getTime();
      const gpEd = p.end_date ? new Date(p.end_date).getTime() : new Date('9999-12-31').getTime();

      const pSd = new Date(dbPartner.start_date).getTime();
      const pEd = dbPartner.end_date ? new Date(dbPartner.end_date).getTime() : new Date('9999-12-31').getTime();

      const minAllowedSd = Math.max(pSd, groupSd);
      const maxAllowedEd = Math.min(pEd, groupEd);

      if (gpSd < minAllowedSd || gpEd > maxAllowedEd || gpSd > gpEd) {
        return { error: `Invalid dates for partner ${dbPartner.partner_name}. Dates must be within partner and group active periods.` };
      }
    }

    // Execute sync inside transaction to ensure atomic replacement
    await prisma.$transaction(async (tx) => {
      // 1. Delete all current partners
      await tx.group_partners.deleteMany({
        where: { group_id },
      });

      // 2. Insert mapped partner data
      if (partners.length > 0) {
        const createData = partners.map(p => ({
          chapter_id,
          group_id,
          partner_id: p.partner_id,
          start_date: parseLocalDate(p.start_date || new Date().toISOString().split('T')[0]),
          end_date: p.end_date ? parseLocalDate(p.end_date) : null,
        }));

        await tx.group_partners.createMany({
          data: createData,
        });
      }
    });

    return this.findByIdWithDetails(group_id);
  }

  /** SRS: Cannot delete if referenced in recurring_appointments. */
  static async delete(id) {
    const gid = id;

    // Reject deletion if referenced by any recurring appointments
    const raCount = await prisma.recurring_appointments.count({
      where: { group_id: gid }
    });
    if (raCount > 0) {
      return { deleted: false, error: 'Cannot delete group: it is referenced by a recurring appointment.' };
    }

    try {
      await prisma.$transaction(async (tx) => {
        // Cascade manually
        await tx.group_partners.deleteMany({ where: { group_id: gid } });
        // Assume appointments cascade if they referenced group directly, 
        // but right now they might reference appointments via regular relation. 
        // Actually group deletion just needs group_partners cleared.
        await tx.groups.delete({ where: { group_id: gid } });
      });
      return { deleted: true };
    } catch (e) {
      if (e.code === 'P2025') return { deleted: false };
      throw e;
    }
  }
}

module.exports = { GroupRepository };
