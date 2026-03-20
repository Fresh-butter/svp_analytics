/** Shared date/time formatting helpers across pages. */

export function formatDate(d: string | null | undefined): string {
  if (!d) return '—';
  // If already an ISO timestamp (contains 'T'), extract just the date portion
  const dateStr = d.includes('T') ? d.split('T')[0] : d;
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString();
}

export function formatTime(t: string | null | undefined): string {
  if (!t) return '—';

  if (t.includes('T')) {
    return new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  const [h, m] = t.split(':');
  const hr = Number(h);
  if (Number.isNaN(hr)) return t;
  return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
}

export function formatMonthYear(month: number, year: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
}

export function formatShortMonth(d: string | null | undefined): string {
  if (!d) return '-';
  return new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { month: 'short' });
}

export function formatDayOfMonth(d: string | null | undefined): string {
  if (!d) return '-';
  return String(new Date(`${d}T00:00:00`).getDate());
}

