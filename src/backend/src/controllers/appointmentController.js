const { AppointmentRepository } = require('../repositories');

class AppointmentController {
  /** GET /appointments — paginates by month, year */
  static async list(req, res) {
    try {
      const chapter_id = req.query.chapter_id || req.user?.chapter_id;
      
      const today = new Date();
      const month = req.query.month || (today.getMonth() + 1);
      const year = req.query.year || today.getFullYear();

      const filters = { month, year };

      // Pass the month and year as filters; repository should handle this as filtering/pagination
      const { rows, total } = await AppointmentRepository.findAll(chapter_id, null, filters);
      
      res.json({
        success: true, 
        data: rows,
        pagination: { month, year, total }
      });
    } catch (err) {
      console.error('List appointments error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch appointments' } });
    }
  }

  /** GET /appointments/:id — with investee, recurring appointment, and partners details */
  static async get(req, res) {
    try {
      const appointment = await AppointmentRepository.findByIdWithDetails(req.params.id);
      if (!appointment) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Appointment not found' } });
        return;
      }
      res.json({ success: true, data: appointment });
    } catch (err) {
      console.error('Get appointment error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch appointment' } });
    }
  }

  /**
   * POST /appointments — create appointment.
   */
  static async create(req, res) {
    try {
      const { chapter_id, occurrence_date, start_at, end_at } = req.body;
      if (!chapter_id || !(occurrence_date || req.body.appointment_date) || !(start_at || req.body.start_time) || !(end_at || req.body.end_time)) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION', message: 'chapter_id, occurrence_date, start_at, and end_at are required' },
        });
      }
      const appointment = await AppointmentRepository.create(req.body);
      res.status(201).json({ success: true, data: appointment });
    } catch (err) {
      console.error('Create appointment error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message || 'Failed to create appointment', stack: err.stack } });
    }
  }

  /** PUT /appointments/:id — update appointment (allows status change) */
  static async update(req, res) {
    try {
      // Body can include: start_at, end_at, appointment_type_id, group_type_id, investee, array of partners, status
      const appointment = await AppointmentRepository.update(req.params.id, req.body);
      if (!appointment) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Appointment not found' } });
        return;
      }
      res.json({ success: true, data: appointment });
    } catch (err) {
      if (err.code === 'VALIDATION') {
        res.status(400).json({ success: false, error: { code: 'VALIDATION', message: err.message } });
        return;
      }
      console.error('Update appointment error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update appointment' } });
    }
  }

  /**
   * PATCH /appointments/:id/complete
   * Mark complete and update attendance
   */
  static async complete(req, res) {
    try {
      const { attendance } = req.body;
      if (!Array.isArray(attendance)) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION', message: 'attendance array is required: [{partner_id, is_present}]' },
        });
        return;
      }
      const appointment = await AppointmentRepository.complete(req.params.id, attendance);
      if (!appointment) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Appointment not found or already completed' } });
        return;
      }
      res.json({ success: true, data: appointment });
    } catch (err) {
      if (err.code === 'VALIDATION') {
        res.status(400).json({ success: false, error: { code: 'VALIDATION', message: err.message } });
        return;
      }
      console.error('Complete appointment error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to complete appointment' } });
    }
  }

  /** DELETE /appointments/:id — Delete appointment (cascades to appointment_partners) */
  static async remove(req, res) {
    try {
      const result = await AppointmentRepository.delete(req.params.id);
      if (!result.deleted) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Appointment not found' } });
        return;
      }
      res.json({ success: true, data: { message: 'Appointment deleted' } });
    } catch (err) {
      console.error('Delete appointment error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete appointment' } });
    }
  }
}

module.exports = { AppointmentController };
