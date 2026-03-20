import { RRule, Weekday } from 'rrule';
import { RecurringAppointment } from '../types';

export type RecurrenceFrequency = 'Weekly' | 'BiWeekly' | 'Monthly';

export type RecurrenceUiState = {
  frequency: RecurrenceFrequency;
  dayOfWeek: number;
  nthOccurrence: number;
  biweeklyPattern: '1_3' | '2_4';
};

const DEFAULT_RECURRENCE_UI_STATE: RecurrenceUiState = {
  frequency: 'Weekly',
  dayOfWeek: 1,
  nthOccurrence: 1,
  biweeklyPattern: '1_3',
};

const RRULE_WEEKDAYS = [RRule.SU, RRule.MO, RRule.TU, RRule.WE, RRule.TH, RRule.FR, RRule.SA];

function parseYmdToUtc(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

function toUtcMidnight(date: Date): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0));
}

function toUtcEndOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
}

function normalizeRRuleString(rruleStr?: string): string {
  if (!rruleStr) return '';
  return rruleStr.replace(/^RRULE:/i, '').trim();
}

function clampDayOfWeek(value: number): number {
  if (Number.isNaN(value)) return 1;
  return Math.max(0, Math.min(6, value));
}

function clampNthOccurrence(value: number): number {
  if (Number.isNaN(value)) return 1;
  return Math.max(1, Math.min(4, value));
}

function normalizeByWeekday(byweekday: unknown): Weekday[] {
  const values = Array.isArray(byweekday)
    ? byweekday
    : byweekday !== undefined && byweekday !== null
      ? [byweekday]
      : [];

  return values
    .map((value) => {
      if (value instanceof Weekday) return value;
      if (typeof value === 'number' && value >= 0 && value <= 6) {
        return RRULE_WEEKDAYS[value];
      }
      return null;
    })
    .filter((value): value is Weekday => value !== null);
}

export function parseRecurrenceUiStateFromLegacy(
  frequency?: string,
  frequencyJson?: string
): RecurrenceUiState {
  const result: RecurrenceUiState = {
    ...DEFAULT_RECURRENCE_UI_STATE,
    frequency: frequency === 'BiWeekly' || frequency === 'Monthly' ? frequency : 'Weekly',
  };

  try {
    const parsed = JSON.parse(frequencyJson || '{}') as {
      day_of_week?: number;
      nth_occurrence?: number;
      biweekly_pattern?: string;
    };

    result.dayOfWeek = clampDayOfWeek(parsed.day_of_week ?? result.dayOfWeek);
    result.nthOccurrence = clampNthOccurrence(parsed.nth_occurrence ?? result.nthOccurrence);
    result.biweeklyPattern = parsed.biweekly_pattern === '2_4' ? '2_4' : '1_3';
  } catch {
    // Keep defaults if legacy JSON is invalid.
  }

  return result;
}

export function parseRRuleToUiState(rruleStr?: string): RecurrenceUiState {
  try {
    const normalized = normalizeRRuleString(rruleStr);
    if (!normalized) return DEFAULT_RECURRENCE_UI_STATE;

    const options = RRule.parseString(normalized);
    const weekdays = normalizeByWeekday(options.byweekday);
    const firstWeekday = weekdays[0]?.weekday ?? 1;

    if (options.freq === RRule.WEEKLY && (options.interval || 1) === 2) {
      return {
        frequency: 'BiWeekly',
        dayOfWeek: clampDayOfWeek(firstWeekday),
        nthOccurrence: 1,
        biweeklyPattern: '1_3',
      };
    }

    if (options.freq === RRule.MONTHLY) {
      const bySetPos = Array.isArray(options.bysetpos)
        ? options.bysetpos[0]
        : options.bysetpos;

      const weekdayIndexes = weekdays.map((weekday) => weekday.weekday);
      const nthValues = weekdays
        .map((weekday) => weekday.n)
        .filter((value): value is number => typeof value === 'number');

      const isBiweeklyPattern =
        weekdayIndexes.length >= 2 &&
        weekdayIndexes.every((day) => day === weekdayIndexes[0]) &&
        (((nthValues.includes(1) && nthValues.includes(3)) || (nthValues.includes(1) && nthValues.includes(5))) ||
          (nthValues.includes(2) && nthValues.includes(4)));

      if (isBiweeklyPattern) {
        return {
          frequency: 'BiWeekly',
          dayOfWeek: clampDayOfWeek(weekdayIndexes[0]),
          nthOccurrence: 1,
          biweeklyPattern: nthValues.includes(2) && nthValues.includes(4) ? '2_4' : '1_3',
        };
      }

      const nth = clampNthOccurrence(
        nthValues[0] ?? (typeof bySetPos === 'number' ? bySetPos : 1)
      );

      return {
        frequency: 'Monthly',
        dayOfWeek: clampDayOfWeek(firstWeekday),
        nthOccurrence: nth,
        biweeklyPattern: '1_3',
      };
    }

    return {
      frequency: 'Weekly',
      dayOfWeek: clampDayOfWeek(firstWeekday),
      nthOccurrence: 1,
      biweeklyPattern: '1_3',
    };
  } catch {
    return DEFAULT_RECURRENCE_UI_STATE;
  }
}

export function buildRRuleFromUiState(state: RecurrenceUiState): string {
  const weekday = RRULE_WEEKDAYS[clampDayOfWeek(state.dayOfWeek)];

  if (state.frequency === 'Monthly') {
    const nth = clampNthOccurrence(state.nthOccurrence);
    return new RRule({
      freq: RRule.MONTHLY,
      byweekday: [weekday.nth(nth)],
    }).toString().replace('RRULE:', '');
  }

  if (state.frequency === 'BiWeekly') {
    return new RRule({
      freq: RRule.WEEKLY,
      interval: 2,
      byweekday: [weekday],
    }).toString().replace('RRULE:', '');
  }

  return new RRule({
    freq: RRule.WEEKLY,
    byweekday: [weekday],
  }).toString().replace('RRULE:', '');
}

/**
 * Returns true only when the given date is a valid RRULE occurrence
 * within the recurring template's start/end bounds.
 */
export const isRecurringOccurrence = (rec: RecurringAppointment, date: Date): boolean => {
  try {
    if (!rec.start_date || !rec.rrule) return false;

    const startDate = parseYmdToUtc(rec.start_date);
    const endDate = rec.end_date ? parseYmdToUtc(rec.end_date) : null;
    const targetDate = toUtcMidnight(date);

    if (targetDate.getTime() < startDate.getTime()) return false;
    if (endDate && targetDate.getTime() > endDate.getTime()) return false;

    const options = RRule.parseString(normalizeRRuleString(rec.rrule));
    options.dtstart = startDate;

    if (endDate && !options.until) {
      options.until = toUtcEndOfDay(endDate);
    }

    const rule = new RRule(options);
    const dayStart = targetDate;
    const dayEnd = toUtcEndOfDay(targetDate);

    return rule.between(dayStart, dayEnd, true).length > 0;
  } catch {
    return false;
  }
};

