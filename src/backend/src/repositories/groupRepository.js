const { prisma } = require('../config/prisma');
const { formatRow, formatRows, activeFilter, fmtDate, parseLocalDate, utcToday } = require('../utils/helpers');

const SORT_COLUMNS = ['group_name', 'group_type_id', 'start_date', 'end_date', 'created_at'];

class GroupRepository {
  static allowedSortColumns = SORT_COLUMNS;

  static async validateAndPrepareMembers(chapter_id, members) {
    if (!Array.isArray(members)) {
      return { error: 'members must be an array' };
    }

    const seen = new Set();
    for (const m of members) {
      if (!m?.partner_id) return { error: 'Each member must include partner_id' };
      if (!m?.start_date) return { error: `Each member must include start_date (missing for partner_id: ${m.partner_id})` };
      if (seen.has(m.partner_id)) return { error: `Duplicate partner_id in members payload: ${m.partner_id}` };
      seen.add(m.partner_id);
    }

    const partnerIds = members.map((m) => m.partner_id);
    const dbPartners = await prisma.partners.findMany({
      where: { partner_id: { in: partnerIds }, chapter_id },
      select: { partner_id: true, partner_name: true },
    });

    const partnerMap = new Map();
    dbPartners.forEach((p) => partnerMap.set(p.partner_id, p));

    for (const m of members) {
      const dbPartner = partnerMap.get(m.partner_id);
      if (!dbPartner) return { error: `Partner ${m.partner_id} not found in chapter` };

      const sd = new Date(m.start_date).getTime();
      const ed = m.end_date ? new Date(m.end_date).getTime() : new Date('9999-12-31').getTime();
      if (sd > ed) {
        return { error: `Invalid dates for partner ${dbPartner.partner_name}. start_date cannot be after end_date.` };
      }
    }

    const prepared = members.map((m) => ({
      chapter_id,
      partner_id: m.partner_id,
      start_date: parseLocalDate(m.start_date),
      end_date: m.end_date ? parseLocalDate(m.end_date) : null,
    }));

    return { data: prepared };
  }

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
          select: {
            investee_id: true,
            investee_name: true,
            email: true,
            start_date: true,
            end_date: true,
          }
        },
        group_types: {
          select: {
            group_type_id: true,
            type_name: true,
          }
        },
        group_partners: {
          include: {
            partners: {
              select: { partner_id: true, partner_name: true, email: true, start_date: true, end_date: true },
            },
          },
          orderBy: { start_date: 'asc' },
        },
        recurring_appointments: {
          include: {
            appointment_types: {
              select: { appointment_type_id: true, type_name: true },
            },
            investees: {
              select: {
                investee_id: true,
                investee_name: true,
                email: true,
                start_date: true,
                end_date: true,
              }
            },
          }
        },
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

    formattedGroup.group_type = group.group_types ? formatRow(group.group_types) : null;

    // Keep investee_name for compatibility while exposing full investee details.
    formattedGroup.investee = group.investees ? formatRow(group.investees) : null;

    // Add nested recurring appointment linked entities.
    formattedGroup.recurring_appointments = group.recurring_appointments.map(ra => {
      const formatted = formatRow(ra);
      formatted.appointment_type = ra.appointment_types ? formatRow(ra.appointment_types) : null;
      formatted.investee = ra.investees ? formatRow(ra.investees) : null;
      delete formatted.appointment_types;
      delete formatted.investees;
      return formatted;
    });

    // Clean up raw nested objects
    delete formattedGroup.group_partners;
    delete formattedGroup.investees;
    delete formattedGroup.group_types;

    return formattedGroup;
  }

  static async create(data) {
    if (!data.start_date) {
      return { error: 'start_date is required' };
    }

    const members = Array.isArray(data.members) ? data.members : null;

    let preparedMembers = null;
    if (members) {
      const prepared = await this.validateAndPrepareMembers(data.chapter_id, members);
      if (prepared.error) return { error: prepared.error };
      preparedMembers = prepared.data;
    }

    const created = await prisma.$transaction(async (tx) => {
      const group = await tx.groups.create({
        data: {
          chapter_id: data.chapter_id,
          investee_id: data.investee_id || null,
          group_name: data.group_name,
          group_type_id: data.group_type_id,
          start_date: parseLocalDate(data.start_date),
          end_date: data.end_date ? parseLocalDate(data.end_date) : null,
        },
      });

      if (preparedMembers && preparedMembers.length > 0) {
        await tx.group_partners.createMany({
          data: preparedMembers.map((m) => ({ ...m, group_id: group.group_id })),
        });
      }

      return group;
    });

    return this.findByIdWithDetails(created.group_id);
  }

  static async update(id, data, chapter_id) {
    if (data.start_date !== undefined && !data.start_date) {
      return { error: 'start_date cannot be empty when provided' };
    }

    const members = Array.isArray(data.members) ? data.members : undefined;

    let preparedMembers = null;
    if (members !== undefined) {
      const prepared = await this.validateAndPrepareMembers(chapter_id, members);
      if (prepared.error) return { error: prepared.error };
      preparedMembers = prepared.data;
    }

    const updateData = {};

    if (data.group_name !== undefined) updateData.group_name = data.group_name;
    if (data.group_type_id !== undefined) updateData.group_type_id = data.group_type_id;
    if (data.investee_id !== undefined) updateData.investee_id = data.investee_id || null;
    if (data.start_date !== undefined) updateData.start_date = parseLocalDate(data.start_date);
    if (data.end_date !== undefined) updateData.end_date = data.end_date ? parseLocalDate(data.end_date) : null;

    const hasMetadataUpdate = Object.keys(updateData).length > 0;
    const hasMembersUpdate = members !== undefined;
    if (!hasMetadataUpdate && !hasMembersUpdate) return this.findById(id);

    try {
      await prisma.$transaction(async (tx) => {
        if (hasMetadataUpdate) {
          await tx.groups.update({
            where: { group_id: id },
            data: updateData,
          });
        } else {
          const group = await tx.groups.findUnique({ where: { group_id: id }, select: { group_id: true } });
          if (!group) {
            const err = new Error('Group not found');
            err.code = 'P2025';
            throw err;
          }
        }

        if (hasMembersUpdate) {
          await tx.group_partners.deleteMany({ where: { group_id: id } });
          if (preparedMembers.length > 0) {
            await tx.group_partners.createMany({
              data: preparedMembers.map((m) => ({ ...m, group_id: id })),
            });
          }
        }
      });
      return this.findByIdWithDetails(id);
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
  static async syncMembers(group_id, chapter_id, members) {
    if (!members || !Array.isArray(members)) return { error: 'members must be an array' };

    const group = await prisma.groups.findUnique({
      where: { group_id },
      select: { group_id: true }
    });
    if (!group) return { error: 'Group not found' };

    const prepared = await this.validateAndPrepareMembers(chapter_id, members);
    if (prepared.error) return { error: prepared.error };

    // Execute sync inside transaction to ensure atomic replacement
    await prisma.$transaction(async (tx) => {
      // 1. Delete all current members
      await tx.group_partners.deleteMany({
        where: { group_id },
      });

      // 2. Insert mapped member data
      if (prepared.data.length > 0) {
        await tx.group_partners.createMany({
          data: prepared.data.map((m) => ({ ...m, group_id })),
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
