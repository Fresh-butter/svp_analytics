import { parseLocalDate } from './appointmentHelpers';
import { isBefore, startOfDay } from 'date-fns';

interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateAppointmentForm(data: {
  meeting_type?: string;
  appointment_type_id?: string;
  meeting_date?: string;
  occurrence_date?: string;
  planned_start?: string;
  start_at?: string;
  planned_end?: string;
  end_at?: string;
  app_id?: string;
  appointment_id?: string;
}): ValidationResult {
  // Check date
  const date = data.meeting_date || data.occurrence_date;
  if (!date) {
    return { valid: false, error: 'Date is required' };
  }

  // Check start time
  const startTime = data.planned_start || data.start_at;
  if (!startTime) {
    return { valid: false, error: 'Start time is required' };
  }

  // Check end time
  const endTime = data.planned_end || data.end_at;
  if (!endTime) {
    return { valid: false, error: 'End time is required' };
  }

  // Validate end time is after start time
  if (startTime >= endTime) {
    return { valid: false, error: 'End time must be after start time' };
  }

  return { valid: true };
}

export function validateRecurringForm(data: {
  meeting_type?: string;
  rec_app_start_date?: string;
  rec_app_end_date?: string;
  rec_app_id?: string;
}): ValidationResult {
  if (!data.rec_app_start_date) {
    return { valid: false, error: 'Start date is required' };
  }
  if (!data.rec_app_end_date) {
    return { valid: false, error: 'End date is required' };
  }
  if (data.rec_app_end_date < data.rec_app_start_date) {
    return { valid: false, error: 'End date cannot be less than Start date' };
  }

  const isEditing = !!data.rec_app_id;
  if (!isEditing) {
    const startDate = parseLocalDate(data.rec_app_start_date);
    const today = startOfDay(new Date());
    if (isBefore(startDate, today)) {
      return { valid: false, error: 'Cannot create a recurring series in the past. Please select a future start date.' };
    }
  }
  return { valid: true };
}
