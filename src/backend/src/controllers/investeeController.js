const { InvesteeRepository } = require('../repositories');

class InvesteeController {
  /** GET /investees — list without pagination */
  static async list(req, res) {
    try {
      const chapter_id = req.query.chapter_id || req.user?.chapter_id;
      const filters = {
        active: req.query.active === 'true' ? true : req.query.active === 'false' ? false : undefined,
      };
      const { rows } = await InvesteeRepository.findAll(chapter_id, filters);
      res.json({
        success: true, data: rows,
      });
    } catch (err) {
      console.error('List investees error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch investees' } });
    }
  }

  /** GET /investees/:id — with groups and appointments details */
  static async get(req, res) {
    try {
      // Pass month and year if provided in query
      const { month, year } = req.query;
      const investee = await InvesteeRepository.findByIdWithDetails(req.params.id, month, year);
      if (!investee) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Investee not found' } }); return; }

      if (req.user?.user_type === 'PARTNER') {
        investee.appointments = [];
        investee.recurring_appointments = [];
      }

      res.json({ success: true, data: investee });
    } catch (err) {
      console.error('Get investee error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch investee' } });
    }
  }

  /** POST /investees — create new investee */
  static async create(req, res) {
    try {
      const { chapter_id, investee_name, email, start_date, end_date } = req.body;
      if (!chapter_id || !investee_name || !email || !start_date) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'chapter_id, investee_name, email, and start_date are required' } });
        return;
      }
      if (end_date && new Date(end_date) < new Date(start_date)) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'End date cannot be less than Start date' } });
        return;
      }
      const investee = await InvesteeRepository.create(req.body);
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
      if (start_date && end_date && new Date(end_date) < new Date(start_date)) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'End date cannot be less than Start date' } });
        return;
      }
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
