const { GroupTypeRepository, AppointmentTypeRepository } = require('../repositories/lookupRepository');

class LookupController {
    /** GET /group-types */
    static async listGroupTypes(req, res) {
        try {
            if (!req.user?.chapter_id) {
                return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'chapter_id is required (from token)' } });
            }
            const { chapter_id } = req.user;
            const types = await GroupTypeRepository.findAll(chapter_id);
            res.json({ success: true, data: types });
        } catch (err) {
            console.error('List group types error:', err);
            res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch group types' } });
        }
    }

    /** POST /group-types */
    static async createGroupType(req, res) {
        try {
            if (!req.user?.chapter_id) {
                return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'chapter_id is required (from token)' } });
            }
            const { chapter_id } = req.user;
            const { type_name } = req.body;
            if (!type_name) {
                return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'type_name is required' } });
            }

            // Check if type already exists — return 200 instead of 201
            const existing = await GroupTypeRepository.findByName(chapter_id, type_name);
            if (existing) return res.json({ success: true, data: existing });

            const type = await GroupTypeRepository.create(chapter_id, type_name);
            res.status(201).json({ success: true, data: type });
        } catch (err) {
            console.error('Create group type error:', err);
            res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create group type' } });
        }
    }

    /** DELETE /group-types/:id */
    static async removeGroupType(req, res) {
        try {
            const { id } = req.params;
            const result = await GroupTypeRepository.delete(id);

            if (!result.deleted && result.error) {
                return res.status(409).json({ success: false, error: { code: 'CONFLICT', message: result.error } });
            }
            if (!result.deleted) {
                return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Group type not found' } });
            }

            res.json({ success: true, data: { message: 'Group type deleted successfully' } });
        } catch (err) {
            console.error('Delete group type error:', err);
            res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete group type' } });
        }
    }

    /** GET /appointment-types */
    static async listAppointmentTypes(req, res) {
        try {
            if (!req.user?.chapter_id) {
                return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'chapter_id is required (from token)' } });
            }
            const { chapter_id } = req.user;
            const types = await AppointmentTypeRepository.findAll(chapter_id);
            res.json({ success: true, data: types });
        } catch (err) {
            console.error('List appointment types error:', err);
            res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch appointment types' } });
        }
    }

    /** POST /appointment-types */
    static async createAppointmentType(req, res) {
        try {
            if (!req.user?.chapter_id) {
                return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'chapter_id is required (from token)' } });
            }
            const { chapter_id } = req.user;
            const { type_name } = req.body;
            if (!type_name) {
                return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'type_name is required' } });
            }

            // Check if type already exists — return 200 instead of 201
            const existing = await AppointmentTypeRepository.findByName(chapter_id, type_name);
            if (existing) return res.json({ success: true, data: existing });

            const type = await AppointmentTypeRepository.create(chapter_id, type_name);
            res.status(201).json({ success: true, data: type });
        } catch (err) {
            console.error('Create appointment type error:', err);
            res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create appointment type' } });
        }
    }

    /** DELETE /appointment-types/:id */
    static async removeAppointmentType(req, res) {
        try {
            const { id } = req.params;
            const result = await AppointmentTypeRepository.delete(id);

            if (!result.deleted && result.error) {
                return res.status(409).json({ success: false, error: { code: 'CONFLICT', message: result.error } });
            }
            if (!result.deleted) {
                return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Appointment type not found' } });
            }

            res.json({ success: true, data: { message: 'Appointment type deleted successfully' } });
        } catch (err) {
            console.error('Delete appointment type error:', err);
            res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete appointment type' } });
        }
    }
}

module.exports = { LookupController };
