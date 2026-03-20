const { prisma } = require('../config/prisma');
const { formatRow, formatRows } = require('../utils/helpers');

class ChapterRepository {
  static async findAll() {
    const rows = await prisma.chapters.findMany({
      orderBy: { chapter_name: 'asc' },
    });
    return formatRows(rows);
  }

  static async findById(id) {
    const row = await prisma.chapters.findUnique({
      where: { chapter_id: id },
    });
    return formatRow(row);
  }
}

module.exports = { ChapterRepository };
