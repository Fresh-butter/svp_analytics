import { Partner, Investee, Group, Appointment, RecurringAppointment } from '../types';
import { RRule } from 'rrule';

// ── Backend response shapes (v2) ─────────────────────────────────────────────
// Backend v2 returns UUIDs as strings, dates as 'YYYY-MM-DD', times as 'HH:MM:SS'.
// These types describe the raw JSON from the backend API.

export interface BackendPartner {
  partner_id: string;
  chapter_id: string;
  partner_name: string;
  email: string | null;
  linkedin_url: string | null;
  primary_partner_id: string | null;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
  modified_at?: string;
}

export interface BackendInvestee {
  investee_id: string;
  chapter_id: string;
  investee_name: string;
  email: string | null;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
  modified_at?: string;
}

export interface BackendGroup {
  group_id: string;
  chapter_id: string;
  investee_id: string | null;
  group_name: string;
  group_type_id: string | null;
  group_type?: string | null; // resolved type name from join
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
  modified_at?: string;
}

export interface BackendAppointment {
  appointment_id: string;
  chapter_id: string;
  investee_id: string | null;
  investee_name?: string | null;
  appointment_name?: string | null;
  appointment_type_id: string | null;
  group_type_id?: string | null;
  occurrence_date: string;
  start_at: string;
  end_at: string;
  duration_minutes: number;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  rec_appointment_id: string | null;
  created_at: string;
  modified_at?: string;
  // Included in GET /appointments/:id
  investee?: {
    investee_id?: string;
    investee_name?: string;
    email?: string | null;
    start_date?: string;
    end_date?: string | null;
    is_active?: boolean;
    created_at?: string;
    modified_at?: string;
  } | null;
  recurring_appointment?: {
    rec_appointment_id?: string;
    start_date?: string;
    end_date?: string;
    start_time?: string;
    duration_minutes?: number;
    rrule?: string;
    created_at?: string;
    modified_at?: string;
  } | null;
  partners?: Array<{
    appointment_partner_id: string;
    is_present: boolean | null;
    absent_informed?: boolean | null;
    partner_id: string;
    partner_name: string;
    email: string;
  }>;
}

export interface BackendRecurringAppointment {
  rec_appointment_id: string;
  chapter_id: string;
  group_id: string | null;
  appointment_name?: string | null;
  appointment_type_id: string | null;
  start_time: string;
  duration_minutes: number;
  rrule: string;
  investee_id: string | null;
  start_date: string;
  end_date: string;
  created_at: string;
  modified_at?: string;
  // Included in findAll / findById
  group?: unknown | null;
  investee?: unknown | null;
  partners?: Array<{
    rec_app_partner_id: string;
    partner_id: string;
    partner_name: string;
    email: string;
  }>;
}

// ── RRule display helpers ────────────────────────────────────────────────────

/**
 * Convert an iCal RRule string to a human-readable description.
 * Uses the rrule library's toText() for proper parsing.
 */
export function rruleToHuman(rruleStr: string): string {
  if (!rruleStr) return 'Unknown';
  try {
    // Ensure proper RRULE prefix for the library
    const normalized = rruleStr.startsWith('RRULE:') ? rruleStr : `RRULE:${rruleStr}`;
    const rule = RRule.fromString(normalized);
    return rule.toText();
  } catch {
    // Fallback: return raw string if parsing fails
    return rruleStr;
  }
}

/**
 * Build an RRule string from user-friendly selections.
 * Uses the rrule library for proper iCal output.
 */
export function buildRrule(opts: {
  frequency: 'Weekly' | 'BiWeekly' | 'Monthly';
  dayOfWeek: number;      // 0=Sun .. 6=Sat
  nthOccurrence?: number; // 1-4 for Monthly
  biweeklyPattern?: '1_3' | '2_4';
}): string {
  const RRULE_WEEKDAYS = [RRule.SU, RRule.MO, RRule.TU, RRule.WE, RRule.TH, RRule.FR, RRule.SA];
  const weekday = RRULE_WEEKDAYS[opts.dayOfWeek ?? 1];

  switch (opts.frequency) {
    case 'Weekly': {
      const rule = new RRule({ freq: RRule.WEEKLY, byweekday: [weekday] });
      return rule.toString().replace('RRULE:', '');
    }
    case 'BiWeekly': {
      // BiWeekly means every 2 weeks on the selected weekday.
      const rule = new RRule({ freq: RRule.WEEKLY, interval: 2, byweekday: [weekday] });
      return rule.toString().replace('RRULE:', '');
    }
    case 'Monthly': {
      const rule = new RRule({ freq: RRule.MONTHLY, byweekday: [weekday.nth(opts.nthOccurrence ?? 1)] });
      return rule.toString().replace('RRULE:', '');
    }
    default: {
      const rule = new RRule({ freq: RRule.WEEKLY, byweekday: [weekday] });
      return rule.toString().replace('RRULE:', '');
    }
  }
}

// ── Mapper functions ──────────────────────────────────────────────────────────
// V2 mappers are lightweight: backend already returns the right field names.
// We just handle nullability and ensure type safety.

export function mapPartner(b: BackendPartner): Partner {
  return {
    partner_id: b.partner_id,
    chapter_id: b.chapter_id,
    partner_name: b.partner_name,
    email: b.email || '',
    linkedin_url: b.linkedin_url || undefined,
    primary_partner_id: b.primary_partner_id || undefined,
    start_date: b.start_date,
    end_date: b.end_date || undefined,
    is_active: b.is_active,
    created_at: b.created_at,
    modified_at: b.modified_at,
  };
}

export function mapInvestee(b: BackendInvestee): Investee {
  return {
    investee_id: b.investee_id,
    chapter_id: b.chapter_id,
    investee_name: b.investee_name,
    email: b.email || '',
    start_date: b.start_date,
    end_date: b.end_date || undefined,
    is_active: b.is_active,
    created_at: b.created_at,
    modified_at: b.modified_at,
  };
}

export function mapGroup(b: BackendGroup): Group {
  return {
    group_id: b.group_id,
    chapter_id: b.chapter_id,
    group_name: b.group_name,
    group_type_id: b.group_type_id || undefined,
    group_type: b.group_type || undefined,
    investee_id: b.investee_id || undefined,
    start_date: b.start_date,
    end_date: b.end_date || undefined,
    is_active: b.is_active,
    created_at: b.created_at,
    modified_at: b.modified_at,
  };
}

export function mapAppointment(b: BackendAppointment): Appointment {
  return {
    appointment_id: b.appointment_id,
    chapter_id: b.chapter_id,
    appointment_name: b.appointment_name || undefined,
    appointment_type_id: b.appointment_type_id || undefined,
    group_type_id: b.group_type_id || undefined,
    occurrence_date: b.occurrence_date,
    start_at: b.start_at || '',
    end_at: b.end_at || '',
    duration_minutes: b.duration_minutes,
    status: b.status,
    investee_id: b.investee_id || undefined,
    investee_name: b.investee_name || undefined,
    rec_appointment_id: b.rec_appointment_id || undefined,
    created_at: b.created_at,
    modified_at: b.modified_at,
  };
}

export function mapRecurringAppointment(b: BackendRecurringAppointment): RecurringAppointment {
  return {
    rec_appointment_id: b.rec_appointment_id,
    chapter_id: b.chapter_id,
    group_id: b.group_id || undefined,
    appointment_name: b.appointment_name || undefined,
    appointment_type_id: b.appointment_type_id || undefined,
    start_time: b.start_time || '',
    duration_minutes: b.duration_minutes,
    rrule: b.rrule,
    investee_id: b.investee_id || undefined,
    start_date: b.start_date,
    end_date: b.end_date,
    created_at: b.created_at,
    modified_at: b.modified_at,
    group: b.group || null,
    investee: b.investee || null,
    partners: b.partners?.map(p => ({
      rec_app_partner_id: p.rec_app_partner_id,
      partner_id: p.partner_id,
      partner_name: p.partner_name,
      email: p.email,
    })),
  };
}

// ── Frontend → Backend payload converters ─────────────────────────────────────

export function partnerToBackend(p: Partial<Partner>, chapterId: string) {
  return {
    chapter_id: chapterId,
    partner_name: p.partner_name,
    email: p.email || null,
    linkedin_url: p.linkedin_url || null,
    primary_partner_id: p.primary_partner_id || null,
    start_date: p.start_date,
    end_date: p.end_date || null,
  };
}

export function investeeToBackend(inv: Partial<Investee>, chapterId: string) {
  return {
    chapter_id: chapterId,
    investee_name: inv.investee_name,
    email: inv.email || null,
    start_date: inv.start_date,
    end_date: inv.end_date || null,
  };
}

export function groupToBackend(g: Partial<Group>, chapterId: string) {
  return {
    chapter_id: chapterId,
    group_name: g.group_name,
    group_type_id: g.group_type_id || null,
    investee_id: g.investee_id || null,
    start_date: g.start_date,
    end_date: g.end_date || null,
  };
}

export function appointmentToBackend(a: Partial<Appointment>, chapterId: string) {
  return {
    chapter_id: chapterId,
    appointment_name: a.appointment_name || undefined,
    appointment_type_id: a.appointment_type_id || null,
    group_type_id: a.group_type_id || null,
    occurrence_date: a.occurrence_date,
    start_at: a.start_at,
    end_at: a.end_at,
    investee_id: a.investee_id || null,
    status: a.status,
  };
}

export function recurringToBackend(r: Partial<RecurringAppointment>, chapterId: string) {
  return {
    chapter_id: chapterId,
    group_id: r.group_id || null,
    appointment_name: r.appointment_name || undefined,
    appointment_type_id: r.appointment_type_id || null,
    start_time: r.start_time,
    duration_minutes: r.duration_minutes,
    rrule: r.rrule,
    investee_id: r.investee_id || null,
    start_date: r.start_date,
    end_date: r.end_date,
  };
}
