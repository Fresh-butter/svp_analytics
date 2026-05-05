const { AppointmentRepository } = require('../repositories');
const { prisma } = require('../config/prisma');

function toTrimmedString(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function formatDateUTC(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function excelSerialToDate(serial) {
  if (!Number.isFinite(serial)) return null;
  const ms = Math.round((serial - 25569) * 86400 * 1000);
  const date = new Date(ms);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeOccurrenceDate(value) {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return '';
    return formatDateUTC(value);
  }

  if (typeof value === 'number') {
    const date = excelSerialToDate(value);
    return date ? formatDateUTC(date) : '';
  }

  const raw = toTrimmedString(value);
  if (!raw) return '';

  const rawDate = raw.split(/[\sT]/)[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) return rawDate;

  const dmy = rawDate.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2}|\d{4})$/);
  if (dmy) {
    let day = Number(dmy[1]);
    let month = Number(dmy[2]);
    let year = Number(dmy[3]);
    if (year < 100) year += 2000;

    if (day <= 12 && month > 12) {
      const temp = day;
      day = month;
      month = temp;
    }

    const date = new Date(Date.UTC(year, month - 1, day));
    if (!Number.isNaN(date.getTime())) return formatDateUTC(date);
  }

  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) return '';
  return formatDateUTC(parsed);
}

function normalizeImportStatus(value) {
  const raw = toTrimmedString(value).toUpperCase();
  if (!raw) return 'COMPLETED';
  if (raw === 'COMPLETED') return 'COMPLETED';
  if (raw === 'CANCELLED' || raw === 'CANCELED') return 'CANCELLED';
  if (raw === 'PENDING' || raw === 'SCHEDULED') return 'PENDING';
  return 'PENDING';
}

class AppointmentController {
  /** GET /appointments — paginates by month, year */
  static async list(req, res) {
    try {
      const chapter_id = req.query.chapter_id || req.user?.chapter_id;
      const partner_id = req.user?.user_type === 'PARTNER' ? req.user.partner_id : req.query.partner_id;
      
      const today = new Date();
      const month = req.query.month || (today.getMonth() + 1);
      const year = req.query.year || today.getFullYear();

      const filters = { month, year };
      if (partner_id) filters.partner_id = partner_id;

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
      const partner_id = req.user?.user_type === 'PARTNER' ? req.user.partner_id : null;
      const appointment = await AppointmentRepository.findByIdWithDetails(req.params.id);
      if (!appointment) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Appointment not found' } });
        return;
      }
      if (partner_id) {
        const allowed = Array.isArray(appointment.partners)
          && appointment.partners.some((partner) => partner.partner_id === partner_id);
        if (!allowed) {
          res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have access to this appointment' } });
          return;
        }
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
      if (req.user?.user_type !== 'ADMIN') {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only admins can create appointments' } });
      }
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
      if (req.user?.user_type !== 'ADMIN') {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only admins can update appointments' } });
      }
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
      if (req.user?.user_type !== 'ADMIN') {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only admins can complete appointments' } });
      }
      const { attendance } = req.body;
      if (!Array.isArray(attendance)) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION', message: 'attendance array is required: [{partner_id, is_present, absent_informed?}]' },
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
      if (req.user?.user_type !== 'ADMIN') {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only admins can delete appointments' } });
      }
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

  /**
   * POST /appointments/import
   * Accepts { rows: Array } where each row may contain:
    *  - appointment_name, description, occurrence_date (YYYY-MM-DD), investee_name, status, start_time, end_time, group_type
   * Validations:
   *  - appointment_name must be present and unique within chapter
    *  - occurrence_date + description must be unique (description falls back to appointment_name)
   * Creates appointments with provided fields; missing investee/group_type are left null.
   */
  static async import(req, res) {
    try {
      if (req.user?.user_type !== 'ADMIN') {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only admins can import appointments' } });
      }
      const chapter_id = req.body.chapter_id || req.user?.chapter_id;
      const rows = Array.isArray(req.body.rows) ? req.body.rows : [];

      if (!chapter_id) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'chapter_id required' } });
      if (rows.length === 0) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'rows array required' } });

      const results = [];
      const seenNames = new Set();
      const seenDateDescription = new Set();

      for (const [idx, r] of rows.entries()) {
        const appointment_name = toTrimmedString(r.appointment_name || r.name || r.app_name);
        const description = toTrimmedString(r.description || r.appointment_description || r.details);
        const occurrence_date = normalizeOccurrenceDate(r.occurrence_date ?? r.occurence_date ?? r.date);
        const investee_name = toTrimmedString(r.investee_name || r.investee);
        const start_time = toTrimmedString(r.start_time || r.start_at || r.start);
        const end_time = toTrimmedString(r.end_time || r.end_at || r.end);
        const group_type = toTrimmedString(r.group_type || r.group_type_name);
        const status = normalizeImportStatus(r.status || 'COMPLETED');
        const uniqueDescription = (description || appointment_name).toLowerCase();
        const nameKey = appointment_name.toLowerCase();
        const dateDescriptionKey = `${occurrence_date}::${uniqueDescription}`;

        if (status !== 'COMPLETED') {
          results.push({ row: idx, success: false, error: 'only completed appointments can be imported' });
          continue;
        }

        if (!appointment_name) {
          results.push({ row: idx, success: false, error: 'appointment_name required' });
          continue;
        }
        if (!occurrence_date) {
          results.push({ row: idx, success: false, error: 'occurrence_date required' });
          continue;
        }

        const todayStr = new Date().toISOString().slice(0, 10);
        if (occurrence_date > todayStr) {
          results.push({ row: idx, success: false, error: 'completed appointments cannot be in the future' });
          continue;
        }

        if (!start_time) {
          results.push({ row: idx, success: false, error: 'start_time required' });
          continue;
        }
        if (!end_time) {
          results.push({ row: idx, success: false, error: 'end_time required' });
          continue;
        }

        // Batch-level uniqueness checks (within the uploaded file)
        if (seenNames.has(nameKey)) {
          results.push({ row: idx, success: false, error: 'duplicate appointment_name in import file' });
          continue;
        }
        seenNames.add(nameKey);

        if (seenDateDescription.has(dateDescriptionKey)) {
          results.push({ row: idx, success: false, error: 'duplicate occurrence_date + description in import file' });
          continue;
        }
        seenDateDescription.add(dateDescriptionKey);

        // Existing-data uniqueness checks
        const existingByName = await prisma.appointments.findFirst({ where: { chapter_id, appointment_name: { equals: appointment_name, mode: 'insensitive' } } });
        if (existingByName) {
          results.push({ row: idx, success: false, error: 'appointment_name already exists' });
          continue;
        }

        const existingByDateAndName = await prisma.appointments.findFirst({ where: { chapter_id, occurrence_date: new Date(occurrence_date), appointment_name: { equals: appointment_name, mode: 'insensitive' } } });
        if (existingByDateAndName) {
          results.push({ row: idx, success: false, error: 'appointment with same date and name already exists' });
          continue;
        }

        // Since there is no dedicated description column in appointments,
        // date+description uniqueness is evaluated against appointment_name.
        const existingByDateAndDescription = await prisma.appointments.findFirst({
          where: {
            chapter_id,
            occurrence_date: new Date(occurrence_date),
            appointment_name: { equals: description || appointment_name, mode: 'insensitive' },
          },
        });
        if (existingByDateAndDescription) {
          results.push({ row: idx, success: false, error: 'appointment with same date and description already exists' });
          continue;
        }

        // Map investee name to id if exists (case-insensitive), else leave null
        let investee_id = null;
        if (investee_name) {
          const inv = await prisma.investees.findFirst({ where: { chapter_id, investee_name: { equals: investee_name, mode: 'insensitive' } } });
          if (inv) investee_id = inv.investee_id;
        }

        // Map group type name to id if exists
        let group_type_id = null;
        if (group_type) {
          const gt = await prisma.group_types.findFirst({ where: { chapter_id, type_name: { equals: group_type, mode: 'insensitive' } } });
          if (gt) group_type_id = gt.group_type_id;
        }

        // Normalize times to HH:MM:SS if possible
        const normalizeTime = (t) => {
          if (!t) return undefined;
          if (t.length === 5) return `${t}:00`;
          return t;
        };

        try {
          const created = await AppointmentRepository.create({
            chapter_id,
            appointment_name,
            occurrence_date,
            start_time: normalizeTime(start_time),
            end_time: normalizeTime(end_time),
            investee_id,
            group_type_id,
            status,
          });
          results.push({ row: idx, success: true, appointment_id: created.appointment_id });
        } catch (err) {
          console.error('Import row error:', err);
          results.push({ row: idx, success: false, error: err.message || 'create failed' });
        }
      }

      res.json({ success: true, results });
    } catch (err) {
      console.error('Appointments import error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to import appointments' } });
    }
  }

  /** GET /appointments/notifications — overdue pending appointments assigned to the current user */
  static async notifications(req, res) {
    try {
      const chapter_id = req.query.chapter_id || req.user?.chapter_id;
      const partner_id = req.user?.user_type === 'PARTNER' ? req.user.partner_id : req.query.partner_id;
      const rows = await AppointmentRepository.findNotifications(chapter_id, partner_id);
      res.json({ success: true, data: rows });
    } catch (err) {
      console.error('Appointment notifications error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch notifications' } });
    }
  }

  /** GET /appointments/assigned — appointments assigned to current partner */
  static async assigned(req, res) {
    try {
      const chapter_id = req.query.chapter_id || req.user?.chapter_id;
      const partner_id = req.user?.user_type === 'PARTNER' ? req.user.partner_id : req.query.partner_id;
      const rows = await AppointmentRepository.findAssigned(chapter_id, partner_id);
      res.json({ success: true, data: rows });
    } catch (err) {
      console.error('Assigned appointments error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch assigned appointments' } });
    }
  }

}

module.exports = { AppointmentController };
