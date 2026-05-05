const { PartnerRepository, UserRepository } = require('../repositories');

class PartnerController {
  /** GET /partners — list without pagination, filter by active and primary */
  static async list(req, res) {
    try {
      const chapter_id = req.query.chapter_id || req.user?.chapter_id;
      const filters = {
        active: req.query.active === 'true' ? true : req.query.active === 'false' ? false : undefined,
        primary: req.query.primary,
      };
      const { rows } = await PartnerRepository.findAll(chapter_id, filters);
      res.json({
        success: true, data: rows,
      });
    } catch (err) {
      console.error('List partners error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch partners' } });
    }
  }

  /** GET /partners/:id — with groups and appointments details */
  static async get(req, res) {
    try {
      const partner = await PartnerRepository.findByIdWithDetails(req.params.id);
      if (!partner) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Partner not found' } }); return; }

      if (req.user?.user_type === 'PARTNER') {
        partner.appointments = [];
        partner.recurring_appointments = [];
      }

      res.json({ success: true, data: partner });
    } catch (err) {
      console.error('Get partner error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch partner' } });
    }
  }

  /** POST /partners — create new partner */
  static async create(req, res) {
    try {
      const { chapter_id, partner_name, start_date, end_date, primary_partner_id } = req.body;
      if (!chapter_id || !partner_name || !start_date) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'chapter_id, partner_name, and start_date are required' } });
        return;
      }
      if (end_date && new Date(end_date) < new Date(start_date)) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'End date cannot be less than Start date' } });
        return;
      }
      if (primary_partner_id) {
        const assignedPartner = await PartnerRepository.findById(primary_partner_id);
        if (!assignedPartner || assignedPartner.primary_partner_id) {
          res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Assigned primary partner must be a valid Primary Partner' } });
          return;
        }
      }
      const partner = await PartnerRepository.create(req.body);
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
      const { start_date, end_date, primary_partner_id } = req.body;
      if (start_date && end_date && new Date(end_date) < new Date(start_date)) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'End date cannot be less than Start date' } });
        return;
      }
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

  /** DELETE /partners/:id — deletes partner and associated user login */
  static async remove(req, res) {
    try {
      const partnerId = req.params.id;

      // Find associated login first; remove it only after partner deletion succeeds.
      const partnerUser = await UserRepository.findByPartner(partnerId);

      const result = await PartnerRepository.delete(partnerId);
      if (result.error) {
        res.status(409).json({ success: false, error: { code: 'REFERENCE_CONFLICT', message: result.error } });
        return;
      }
      if (!result.deleted) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Partner not found' } });
        return;
      }

      if (partnerUser) {
        await UserRepository.deleteById(partnerUser.user_id);
      }

      res.json({ success: true, data: { message: 'Partner deleted' } });
    } catch (err) {
      console.error('Remove partner error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete partner' } });
    }
  }
}

module.exports = { PartnerController };
