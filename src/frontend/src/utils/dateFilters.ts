type DateRange = {
  start: string;
  end: string;
};

export function hasPartialRange(range: DateRange): boolean {
  return (!!range.start && !range.end) || (!range.start && !!range.end);
}

export function matchesDateRange(dateValue: string | null | undefined, range: DateRange): boolean {
  if (!range.start && !range.end) return true;
  if (hasPartialRange(range)) return true;
  if (!dateValue) return false;

  const value = new Date(`${dateValue}T00:00:00`);
  const from = new Date(`${range.start}T00:00:00`);
  const to = new Date(`${range.end}T00:00:00`);
  return value >= from && value <= to;
}
