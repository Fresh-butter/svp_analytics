const { prisma } = require('../config/prisma');
const { formatRow, formatRows } = require('../utils/helpers');

class GroupTypeRepository {
    static async findAll(chapter_id) {
        const rows = await prisma.group_types.findMany({
            where: { chapter_id },
            orderBy: { type_name: 'asc' },
        });
        return formatRows(rows);
    }

    static async findByName(chapter_id, type_name) {
        const row = await prisma.group_types.findFirst({
            where: { chapter_id, type_name },
        });
        return formatRow(row);
    }

    static async create(chapter_id, type_name) {
        // Upsert logic: If it exists, return it, otherwise create
        const existing = await this.findByName(chapter_id, type_name);
        if (existing) return existing;

        const row = await prisma.group_types.create({
            data: { chapter_id, type_name },
        });
        return formatRow(row);
    }

    static async delete(id) {
        // Delete policy: Cannot delete if referenced by groups or appointments
        const gRef = await prisma.groups.findFirst({ where: { group_type_id: id } });
        if (gRef) return { deleted: false, error: 'Cannot delete group type: referenced in groups' };

        const aRef = await prisma.appointments.findFirst({ where: { group_type_id: id } });
        if (aRef) return { deleted: false, error: 'Cannot delete group type: referenced in appointments' };

        try {
            await prisma.group_types.delete({ where: { group_type_id: id } });
            return { deleted: true };
        } catch (e) {
            if (e.code === 'P2025') return { deleted: false };
            throw e;
        }
    }
}

class AppointmentTypeRepository {
    static async findAll(chapter_id) {
        const rows = await prisma.appointment_types.findMany({
            where: { chapter_id },
            orderBy: { type_name: 'asc' },
        });
        return formatRows(rows);
    }

    static async findByName(chapter_id, type_name) {
        const row = await prisma.appointment_types.findFirst({
            where: { chapter_id, type_name },
        });
        return formatRow(row);
    }

    static async create(chapter_id, type_name) {
        // Upsert logic
        const existing = await this.findByName(chapter_id, type_name);
        if (existing) return existing;

        const row = await prisma.appointment_types.create({
            data: { chapter_id, type_name },
        });
        return formatRow(row);
    }

    static async delete(id) {
        // Delete policy: Cannot delete if referenced by appointments or recurring_appointments
        const aRef = await prisma.appointments.findFirst({ where: { appointment_type_id: id } });
        if (aRef) return { deleted: false, error: 'Cannot delete appointment type: referenced in appointments' };

        const rRef = await prisma.recurring_appointments.findFirst({ where: { appointment_type_id: id } });
        if (rRef) return { deleted: false, error: 'Cannot delete appointment type: referenced in recurring_appointments' };

        try {
            await prisma.appointment_types.delete({ where: { appointment_type_id: id } });
            return { deleted: true };
        } catch (e) {
            if (e.code === 'P2025') return { deleted: false };
            throw e;
        }
    }
}

module.exports = { GroupTypeRepository, AppointmentTypeRepository };
