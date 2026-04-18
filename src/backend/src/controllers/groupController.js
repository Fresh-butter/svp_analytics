const { GroupRepository } = require('../repositories');
const { requireChapterIdFromToken, validateDateRange, validationError } = require('../utils/controllerHelpers');

class GroupController {
  /** GET /groups — list without pagination or filtering */
  static async list(req, res) {
    try {
      const chapter_id = requireChapterIdFromToken(req, res);
      if (!chapter_id) return;
      const { rows } = await GroupRepository.findAll(chapter_id);
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
      res.json({ success: true, data: group });
    } catch (err) {
      console.error('Get group error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch group' } });
    }
  }

  /** POST /groups — create new group */
  static async create(req, res) {
    try {
      const chapter_id = requireChapterIdFromToken(req, res);
      const { investee_id, group_name, group_type_id, start_date, end_date } = req.body;
      if (!chapter_id) return;
      if (!group_name || !group_type_id || !start_date) {
        return validationError(res, 'group_name, group_type_id, and start_date are required');
      }
      if (!validateDateRange(res, start_date, end_date)) return;

      const group = await GroupRepository.create({ ...req.body, chapter_id });
      if (group.error) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: group.error } });
      }

      res.status(201).json({ success: true, data: group });
    } catch (err) {
      console.error('Create group error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create group' } });
    }
  }

  /** PUT /groups/:id — update group metadata and optional members */
  static async update(req, res) {
    try {
      const { start_date, end_date } = req.body;
      const chapter_id = requireChapterIdFromToken(req, res);
      if (!chapter_id) return;
      if (!validateDateRange(res, start_date, end_date)) return;

      const group = await GroupRepository.update(req.params.id, req.body, chapter_id);
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

  /** PUT /groups/:id/members — overwrite existing group members */
  static async updateMembers(req, res) {
    try {
      const group_id = req.params.id;
      const chapter_id = requireChapterIdFromToken(req, res);
      const { members } = req.body;

      if (!chapter_id) return;
      if (!Array.isArray(members)) {
        return validationError(res, 'members must be an array');
      }

      const result = await GroupRepository.syncMembers(group_id, chapter_id, members);
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
      console.error('Update group members error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to sync group members' } });
    }
  }
}

module.exports = { GroupController };
