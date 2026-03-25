const { prisma } = require('../config/prisma');
const { formatRow } = require('../utils/helpers');
const bcrypt = require('bcryptjs');

class UserRepository {
  static async findByEmail(email, chapter_id) {
    const where = { email };
    if (chapter_id) where.chapter_id = chapter_id;
    const row = await prisma.users.findFirst({ where });
    return formatRow(row);
  }

  static async findById(id) {
    const row = await prisma.users.findUnique({
      where: { user_id: id },
    });
    return formatRow(row);
  }

  static async create(data) {
    const hash = await bcrypt.hash(data.password, 12);
    const row = await prisma.users.create({
      data: {
        chapter_id: data.chapter_id,
        user_type: data.user_type,
        name: data.name,
        email: data.email,
        password_hash: hash,
      },
    });
    return formatRow(row);
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

  static async findByChapter(chapter_id) {
    const rows = await prisma.users.findMany({
      where: { chapter_id, user_type: 'ADMIN' },
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
