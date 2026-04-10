const { prisma } = require('../config/prisma');
const { formatRow } = require('../utils/helpers');
const bcrypt = require('bcryptjs');

function prismaUserHasField(fieldName) {
  const model = prisma?._runtimeDataModel?.models?.users;
  if (!model || !Array.isArray(model.fields)) return false;
  return model.fields.some((field) => field.name === fieldName);
}

function sanitizeUserWriteData(data) {
  const out = { ...data };
  if (!prismaUserHasField('is_active')) delete out.is_active;
  if (!prismaUserHasField('partner_id')) delete out.partner_id;
  return out;
}

class UserRepository {
  static async findByEmail(email, chapter_id) {
    const where = { email };
    if (chapter_id) where.chapter_id = chapter_id;
    const row = await prisma.users.findFirst({
      where,
      include: {
        partner: {
          select: { partner_id: true, partner_name: true, email: true },
        },
      },
    });
    return formatRow(row);
  }

  static async findById(id) {
    const row = await prisma.users.findUnique({
      where: { user_id: id },
      include: {
        partner: {
          select: { partner_id: true, partner_name: true, email: true },
        },
      },
    });
    return formatRow(row);
  }

  static async create(data) {
    const hash = await bcrypt.hash(data.password, 12);
    const row = await prisma.users.create({
      data: sanitizeUserWriteData({
        chapter_id: data.chapter_id,
        user_type: data.user_type,
        is_active: data.is_active ?? true,
        name: data.name,
        email: data.email,
        password_hash: hash,
        ...(data.partner_id ? { partner_id: data.partner_id } : {}),
      }),
    });
    return formatRow(row);
  }

  static async createPartnerLogin({ chapter_id, name, email, partner_id, password }) {
    return this.create({
      chapter_id,
      user_type: 'PARTNER',
      is_active: false,
      name,
      email,
      partner_id,
      password,
    });
  }

  static async verifyPassword(user, password) {
    if (!user.password_hash) return false;
    return bcrypt.compare(password, user.password_hash);
  }

  static async updatePassword(userId, newPassword) {
    const hash = await bcrypt.hash(newPassword, 12);
    const row = await prisma.users.update({
      where: { user_id: userId },
      data: { password_hash: hash },
    });
    return formatRow(row);
  }

  static async updateById(userId, data) {
    const row = await prisma.users.update({
      where: { user_id: userId },
      data: sanitizeUserWriteData(data),
    });
    return formatRow(row);
  }

  static async findByChapter(chapter_id) {
    const rows = await prisma.users.findMany({
      where: { chapter_id, user_type: 'ADMIN' },
      include: {
        partner: {
          select: { partner_id: true, partner_name: true, email: true },
        },
      },
      orderBy: { name: 'asc' },
    });
    return rows.map(formatRow);
  }

  static async deleteById(userId) {
    const row = await prisma.users.delete({ where: { user_id: userId } });
    return formatRow(row);
  }
}

module.exports = { UserRepository };
