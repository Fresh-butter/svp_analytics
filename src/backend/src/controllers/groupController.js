const { GroupRepository } = require('../repositories');

class GroupController {
  /** GET /groups — list without pagination, search, filter by active/group_type */
  static async list(req, res) {
    try {
      const chapter_id = req.query.chapter_id || req.user?.chapter_id;
      const filters = {
        active: req.query.active === 'true' ? true : req.query.active === 'false' ? false : undefined,
        group_type_id: req.query.group_type_id,
        search: req.query.search,
      };
      // Fetch all without complex serverside filters like pagination, leaving search/sort to frontend
      const { rows } = await GroupRepository.findAll(chapter_id, filters);
      res.json({
        success: true, data: rows,
      });
    } catch (err) {
      console.error('List groups error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch groups' } });
    }
  }

  /** GET /groups/:id — with members (partners) */
  static async get(req, res) {
    try {
      const group = await GroupRepository.findByIdWithDetails(req.params.id);
      if (!group) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Group not found' } }); return; }

      if (req.user?.user_type === 'PARTNER') {
        group.recurring_appointments = [];
      }

      res.json({ success: true, data: group });
    } catch (err) {
      console.error('Get group error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch group' } });
    }
  }

  /** GET /groups/mine/ids — active group ids for authenticated partner */
  static async myGroupIds(req, res) {
    try {
      if (req.user?.user_type !== 'PARTNER') {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only partners can access this resource' } });
      }

      const partner_id = req.user?.partner_id;
      const chapter_id = req.user?.chapter_id;
      const ids = await GroupRepository.findActiveGroupIdsForPartner(partner_id, chapter_id);
      return res.json({ success: true, data: ids });
    } catch (err) {
      console.error('Get partner group ids error:', err);
      return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch partner groups' } });
    }
  }

  /** POST /groups — create new group */
  static async create(req, res) {
    try {
      const { chapter_id, investee_id, group_name, group_type_id, start_date, end_date } = req.body;
      if (!chapter_id || !group_name || !group_type_id || !start_date) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'chapter_id, group_name, group_type_id, and start_date are required' } });
      }
      if (end_date && new Date(end_date) < new Date(start_date)) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'End date cannot be less than Start date' } });
      }

      const group = await GroupRepository.create(req.body);
      if (group.error) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: group.error } });
      }

      res.status(201).json({ success: true, data: group });
    } catch (err) {
      console.error('Create group error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create group' } });
    }
  }

  /** PUT /groups/:id — update group metadata */
  static async update(req, res) {
    try {
      const { start_date, end_date } = req.body;
      if (start_date && end_date && new Date(end_date) < new Date(start_date)) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'End date cannot be less than Start date' } });
      }

      const group = await GroupRepository.update(req.params.id, req.body);
      if (group?.error) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: group.error } });
      }
      if (!group) { return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Group not found' } }); }
      res.json({ success: true, data: group });
    } catch (err) {
      console.error('Update group error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update group' } });
    }
  }

  /** DELETE /groups/:id — blocked if referenced in recurring appointments */
  static async remove(req, res) {
    try {
      const result = await GroupRepository.delete(req.params.id);
      if (result?.error) {
        return res.status(409).json({ success: false, error: { code: 'REFERENCE_CONFLICT', message: result.error } });
      }
      if (!result?.deleted) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Group not found' } });
      }
      res.json({ success: true, data: { message: 'Group deleted' } });
    } catch (err) {
      console.error('Remove group error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete group' } });
    }
  }

  /* ── Group Partners sub-resource ── */

  /** PUT /groups/:id/partners — overwrite existing group partners */
  static async updatePartners(req, res) {
    try {
      const group_id = req.params.id;
      const { chapter_id, partners } = req.body;

      if (!chapter_id) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'chapter_id is required' } });
      }
      if (!Array.isArray(partners)) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'partners must be an array' } });
      }

      const result = await GroupRepository.syncPartners(group_id, chapter_id, partners);
      if (result?.error) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: result.error } });
      }
      if (!result) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Group not found' } });
      }

      res.status(200).json({ success: true, data: result });
    } catch (err) {
      if (err.code === '23505' || err.code === 'P2002') {
        res.status(409).json({ success: false, error: { code: 'DUPLICATE', message: 'Duplicate partner entries' } });
        return;
      }
      console.error('Update group partners error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to sync group partners' } });
    }
  }
}

module.exports = { GroupController };
