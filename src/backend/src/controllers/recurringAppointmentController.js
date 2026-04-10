const { RecurringAppointmentRepository } = require('../repositories');
const { MaterializationService } = require('../services/materializationService');

class RecurringAppointmentController {
  /**
   * GET /recurring-appointments
   * List: Returns all matching templates (no pagination or filters)
   */
  static async list(req, res) {
    try {
      const chapter_id = req.query.chapter_id || req.user?.chapter_id;
      const partner_id = req.user?.user_type === 'PARTNER' ? req.user.partner_id : null;
      
      const rows = await RecurringAppointmentRepository.findAll(chapter_id, partner_id);

      res.json({
        success: true,
        data: rows,
      });
    } catch (err) {
      console.error('List recurring appointments error:', err);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch recurring appointments' },
      });
    }
  }

  /**
   * GET /recurring-appointments/:id
   * Returns template with partners, group & investee details.
   */
  static async get(req, res) {
    try {
      const partner_id = req.user?.user_type === 'PARTNER' ? req.user.partner_id : null;
      const template = await RecurringAppointmentRepository.findById(req.params.id);
      if (!template) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Recurring appointment not found' },
        });
        return;
      }
      if (partner_id) {
        const allowed = await RecurringAppointmentRepository.hasAccess(req.params.id, partner_id);
        if (!allowed) {
          res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have access to this recurring appointment' } });
          return;
        }
      }
      res.json({ success: true, data: template });
    } catch (err) {
      console.error('Get recurring appointment error:', err);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch recurring appointment' },
      });
    }
  }

  /**
   * POST /recurring-appointments
   * Create template with optional partner subset.
   */
  static async create(req, res) {
    try {
      if (req.user?.user_type !== 'ADMIN') {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only admins can create recurring appointments' } });
        return;
      }
      const { chapter_id, start_time, duration_minutes, rrule, start_date, end_date } = req.body;

      if (!chapter_id || !start_time || !duration_minutes || !rrule || !start_date || !end_date) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION',
            message: 'chapter_id, start_time, duration_minutes, rrule, start_date, and end_date are required',
          },
        });
        return;
      }

      // Start date cannot be in the past
      const todayString = new Date().toISOString().split('T')[0];
      if (start_date < todayString) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION', message: 'Cannot create a recurring series in the past. Please select a future start date.' },
        });
        return;
      }

      if (new Date(end_date) < new Date(start_date)) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION', message: 'End date cannot be less than Start date' },
        });
        return;
      }

      // Validate rrule
      const rruleValidation = MaterializationService.validateRRule(rrule);
      if (!rruleValidation.valid) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION', message: `Invalid rrule: ${rruleValidation.error}` },
        });
        return;
      }

      // end_date at most 1 year from now
      const maxEndDate = new Date();
      maxEndDate.setFullYear(maxEndDate.getFullYear() + 1);
      if (new Date(end_date) > maxEndDate) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION', message: 'end_date cannot be more than 1 year from today' },
        });
        return;
      }

      const template = await RecurringAppointmentRepository.create(req.body);
      res.status(201).json({ success: true, data: template });
    } catch (err) {
      console.error('Create recurring appointment error:', err);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create recurring appointment' },
      });
    }
  }

  /**
   * PUT /recurring-appointments/:id
   * Update template — only affects unmaterialized occurrences.
   * Can update: start_date, end_date, start_time, duration_minutes,
   *             appointment_type_id, group_type_id, investee_id, group_id, rrule, array of partners
   */
  static async update(req, res) {
    try {
      if (req.user?.user_type !== 'ADMIN') {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only admins can update recurring appointments' } });
        return;
      }
      // Validate rrule if provided
      if (req.body.rrule) {
        const rruleValidation = MaterializationService.validateRRule(req.body.rrule);
        if (!rruleValidation.valid) {
          res.status(400).json({
            success: false,
            error: { code: 'VALIDATION', message: `Invalid rrule: ${rruleValidation.error}` },
          });
          return;
        }
      }

      if (req.body.start_date && req.body.end_date) {
        if (new Date(req.body.end_date) < new Date(req.body.start_date)) {
          res.status(400).json({
            success: false,
            error: { code: 'VALIDATION', message: 'End date cannot be less than Start date' },
          });
          return;
        }
      }

      // Validate end_date if provided
      if (req.body.end_date) {
        const maxEndDate = new Date();
        maxEndDate.setFullYear(maxEndDate.getFullYear() + 1);
        if (new Date(req.body.end_date) > maxEndDate) {
          res.status(400).json({
            success: false,
            error: { code: 'VALIDATION', message: 'end_date cannot be more than 1 year from today' },
          });
          return;
        }
      }

      const template = await RecurringAppointmentRepository.update(req.params.id, req.body);
      if (!template) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Recurring appointment not found' },
        });
        return;
      }
      res.json({ success: true, data: template });
    } catch (err) {
      console.error('Update recurring appointment error:', err);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update recurring appointment' },
      });
    }
  }

  /**
   * DELETE /recurring-appointments/:id
   * Sets rec_appointment_id = NULL in materialized appointments.
   */
  static async remove(req, res) {
    try {
      if (req.user?.user_type !== 'ADMIN') {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only admins can delete recurring appointments' } });
        return;
      }
      const result = await RecurringAppointmentRepository.delete(req.params.id);
      if (!result.deleted) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Recurring appointment not found' },
        });
        return;
      }
      res.json({ success: true, data: { message: 'Recurring appointment deleted' } });
    } catch (err) {
      console.error('Delete recurring appointment error:', err);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to delete recurring appointment' },
      });
    }
  }

  /**
   * POST /recurring-appointments/:id/materialize
   * Manual Materialization — admin creates a PENDING appointment for a
   * specific occurrence_date.
   *
   * Body: { "occurrence_date": "2024-01-15" }
   */
  static async materialize(req, res) {
    try {
      if (req.user?.user_type !== 'ADMIN') {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only admins can materialize recurring appointments' } });
        return;
      }
      const { occurrence_date } = req.body;

      if (!occurrence_date) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION', message: 'occurrence_date is required' },
        });
        return;
      }

      const template = await RecurringAppointmentRepository.findById(req.params.id);
      if (!template) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Recurring appointment not found' },
        });
        return;
      }

      // occurrence_date must be within [start_date, end_date]
      const occDate = new Date(occurrence_date);
      const startDate = new Date(template.start_date);
      const endDate = new Date(template.end_date);

      if (occDate < startDate || occDate > endDate) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION', message: 'occurrence_date must be within the template date range' },
        });
        return;
      }

      // occurrence_date must be a valid rrule occurrence
      if (!MaterializationService.isOccurrenceDate(template.rrule, startDate, occDate)) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION', message: 'occurrence_date is not a valid occurrence per the rrule' },
        });
        return;
      }

      // Check duplicate
      const alreadyMaterialized = await RecurringAppointmentRepository.isAlreadyMaterialized(
        req.params.id, occurrence_date,
      );
      if (alreadyMaterialized) {
        res.status(409).json({
          success: false,
          error: { code: 'ALREADY_EXISTS', message: 'This occurrence has already been materialized' },
        });
        return;
      }

      const appointment = await MaterializationService.manualMaterialize(template, occurrence_date);
      res.status(201).json({ success: true, data: appointment });
    } catch (err) {
      console.error('Materialize recurring appointment error:', err);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to materialize recurring appointment' },
      });
    }
  }
}

module.exports = { RecurringAppointmentController };
