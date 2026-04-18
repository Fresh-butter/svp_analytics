const { InvesteeRepository } = require('../repositories');
const { requireChapterIdFromToken, validateDateRange, validationError, parseMonthYear } = require('../utils/controllerHelpers');

class InvesteeController {
  /** GET /investees — list without pagination or filtering */
  static async list(req, res) {
    try {
      const chapter_id = requireChapterIdFromToken(req, res);
      if (!chapter_id) return;
      const { rows } = await InvesteeRepository.findAll(chapter_id);
      res.json({
        success: true, data: rows,
      });
    } catch (err) {
      console.error('List investees error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch investees' } });
    }
  }

  /** GET /investees/:id — with groups and upcoming appointment details */
  static async get(req, res) {
    try {
      const monthYear = parseMonthYear(req.query, res);
      if (!monthYear) return;
      const investee = await InvesteeRepository.findByIdWithDetails(req.params.id, monthYear);
      if (!investee) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Investee not found' } }); return; }
      res.json({ success: true, data: investee });
    } catch (err) {
      console.error('Get investee error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch investee' } });
    }
  }

  /** POST /investees — create new investee */
  static async create(req, res) {
    try {
      const chapter_id = requireChapterIdFromToken(req, res);
      const { investee_name, email, start_date, end_date } = req.body;
      if (!chapter_id) return;
      if (!investee_name || !email || !start_date) {
        validationError(res, 'investee_name, email, and start_date are required');
        return;
      }
      if (!validateDateRange(res, start_date, end_date)) return;
      const investee = await InvesteeRepository.create({ ...req.body, chapter_id });
      res.status(201).json({ success: true, data: investee });
    } catch (err) {
      console.error('Create investee error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create investee' } });
    }
  }

  /** PUT /investees/:id — update investee details */
  static async update(req, res) {
    try {
      const { start_date, end_date } = req.body;
      if (!validateDateRange(res, start_date, end_date)) return;
      const investee = await InvesteeRepository.update(req.params.id, req.body);
      if (!investee) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Investee not found' } }); return; }
      res.json({ success: true, data: investee });
    } catch (err) {
      console.error('Update investee error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update investee' } });
    }
  }

  /** DELETE /investees/:id — blocked if referenced */
  static async remove(req, res) {
    try {
      const result = await InvesteeRepository.delete(req.params.id);
      if (result.error) {
        res.status(409).json({ success: false, error: { code: 'REFERENCE_CONFLICT', message: result.error } });
        return;
      }
      if (!result.deleted) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Investee not found' } });
        return;
      }
      res.json({ success: true, data: { message: 'Investee deleted' } });
    } catch (err) {
      console.error('Remove investee error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete investee' } });
    }
  }
}

module.exports = { InvesteeController };
