import { isBefore, startOfDay, isSameDay } from 'date-fns';

/**
 * Parse a "yyyy-MM-dd" string to local midnight.
 * date-fns parseISO treats date-only strings as UTC midnight,
 * which shifts the date in non-UTC timezones. This helper avoids that.
 */
export function parseLocalDate(dateStr?: string | null): Date {
  if (!dateStr) return new Date(NaN);
  const parts = dateStr.split('-');
  if (parts.length !== 3) return new Date(dateStr);
  const [y, m, d] = parts.map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Check if an appointment can be marked complete.
 * Rule: The event date is strictly before today, OR
 * the event is today and the scheduled end time has already passed.
 */
export function isEventCompletable(app: { meeting_date?: string; occurrence_date?: string; planned_end?: string; end_at?: string }): boolean {
  const dateStr = app.meeting_date || app.occurrence_date;
  if (!dateStr) return false;
  
  const eventDate = parseLocalDate(dateStr);
  const todayStart = startOfDay(new Date());
  
  if (isBefore(eventDate, todayStart)) return true;
  if (!isSameDay(eventDate, new Date())) return false;
  
  const endTime = app.planned_end || app.end_at;
  if (!endTime) return false;
  
  const [h, m] = endTime.split(':').map(Number);
  const endDt = new Date();
  endDt.setHours(h, m, 0, 0);
  return new Date() >= endDt;
}

