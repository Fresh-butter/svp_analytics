const { PartnerRepository } = require('../repositories');
const { requireChapterIdFromToken, validateDateRange, validationError, parseMonthYear } = require('../utils/controllerHelpers');

class PartnerController {
  /** GET /partners — list without pagination or filtering */
  static async list(req, res) {
    try {
      const chapter_id = requireChapterIdFromToken(req, res);
      if (!chapter_id) return;
      const { rows } = await PartnerRepository.findAll(chapter_id);
      res.json({
        success: true, data: rows,
      });
    } catch (err) {
      console.error('List partners error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch partners' } });
    }
  }

  /** GET /partners/:id — with groups, appointments, and recurring appointment details */
  static async get(req, res) {
    try {
      const monthYear = parseMonthYear(req.query, res);
      if (!monthYear) return;
      const partner = await PartnerRepository.findByIdWithDetails(req.params.id, monthYear);
      if (!partner) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Partner not found' } }); return; }
      res.json({ success: true, data: partner });
    } catch (err) {
      console.error('Get partner error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch partner' } });
    }
  }

  /** POST /partners — create new partner */
  static async create(req, res) {
    try {
      const chapter_id = requireChapterIdFromToken(req, res);
      const { partner_name, email, start_date, end_date, primary_partner_id } = req.body;
      if (!chapter_id) return;
      if (!partner_name || !email || !start_date) {
        validationError(res, 'partner_name, email, and start_date are required');
        return;
      }
      if (!validateDateRange(res, start_date, end_date)) return;
      if (primary_partner_id) {
        const assignedPartner = await PartnerRepository.findById(primary_partner_id);
        if (!assignedPartner || assignedPartner.primary_partner_id) {
          res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Assigned primary partner must be a valid Primary Partner' } });
          return;
        }
      }
      const partner = await PartnerRepository.create({ ...req.body, chapter_id });
      res.status(201).json({ success: true, data: partner });
    } catch (err) {
      if (err.code === '23505' || err.code === 'P2002') {
        res.status(409).json({ success: false, error: { code: 'DUPLICATE', message: 'Partner with this email already exists in this chapter' } });
        return;
      }
      console.error('Create partner error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create partner' } });
    }
  }

  /** PUT /partners/:id — update partner details */
  static async update(req, res) {
    try {
      const { email, start_date, end_date, primary_partner_id } = req.body;
      if (email !== undefined && (email === null || String(email).trim() === '')) {
        validationError(res, 'email cannot be null or empty');
        return;
      }
      if (!validateDateRange(res, start_date, end_date)) return;
      if (primary_partner_id !== undefined && primary_partner_id !== null && primary_partner_id !== '') {
        const hasSub = await PartnerRepository.hasSubPartners(req.params.id);
        if (hasSub) {
          res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'This partner is a Primary Partner to others and cannot be assigned a Primary Partner' } });
          return;
        }

        const assignedPartner = await PartnerRepository.findById(primary_partner_id);
        if (!assignedPartner || assignedPartner.primary_partner_id) {
          res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Assigned primary partner must be a valid Primary Partner' } });
          return;
        }
      }

      const partner = await PartnerRepository.update(req.params.id, req.body);
      if (!partner) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Partner not found' } }); return; }
      res.json({ success: true, data: partner });
    } catch (err) {
      console.error('Update partner error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update partner' } });
    }
  }

  /** DELETE /partners/:id — blocked if referenced */
  static async remove(req, res) {
    try {
      const result = await PartnerRepository.delete(req.params.id);
      if (result.error) {
        res.status(409).json({ success: false, error: { code: 'REFERENCE_CONFLICT', message: result.error } });
        return;
      }
      if (!result.deleted) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Partner not found' } });
        return;
      }
      res.json({ success: true, data: { message: 'Partner deleted' } });
    } catch (err) {
      console.error('Remove partner error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete partner' } });
    }
  }
}

module.exports = { PartnerController };
