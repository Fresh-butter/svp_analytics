import { Appointment, RecurringAppointment } from '../types';

export function getAppointmentId(app: Partial<Appointment>): string {
  return String(app.app_id || app.appointment_id || '');
}

export function getRecurringId(rec: Partial<RecurringAppointment>): string {
  return String(rec.rec_app_id || rec.rec_appointment_id || '');
}

function toLegacyStatus(status?: string): string {
  if (status === 'PENDING') return 'Scheduled';
  if (status === 'COMPLETED') return 'Completed';
  if (status === 'CANCELLED') return 'Cancelled';
  return status || 'Scheduled';
}

export function normalizeAppointmentForCalendar(app: Appointment): Appointment {
  return {
    ...app,
    app_id: app.appointment_id,
    rec_app_id: app.rec_appointment_id || undefined,
    meeting_date: app.meeting_date || app.occurrence_date,
    planned_start: app.planned_start || app.start_at?.substring(0, 5) || '',
    planned_end: app.planned_end || app.end_at?.substring(0, 5) || '',
    meeting_type: app.meeting_type || app.appointment_type_id || 'Appointment',
    status: toLegacyStatus(app.status),
  };
}

export function normalizeRecurringForCalendar(rec: RecurringAppointment): RecurringAppointment {
  const start = rec.start_time?.substring(0, 5) || rec.planned_start || '09:00';
  const [sh, sm] = start.split(':').map(Number);
  const totalMin = sh * 60 + sm + (rec.duration_minutes || 60);
  const endH = Math.floor(totalMin / 60) % 24;
  const endM = totalMin % 60;
  const end = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

  return {
    ...rec,
    rec_app_id: rec.rec_appointment_id,
    rec_app_start_date: rec.rec_app_start_date || rec.start_date,
    rec_app_end_date: rec.rec_app_end_date || rec.end_date,
    planned_start: rec.planned_start || start,
    planned_end: rec.planned_end || end,
    meeting_type: rec.meeting_type || rec.appointment_type_id || 'Recurring',
  };
}
