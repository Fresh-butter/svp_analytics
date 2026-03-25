// Entity Types — aligned with Backend v2


export interface Partner {
  partner_id: string;
  chapter_id: string;
  partner_name: string;
  email: string;
  linkedin_url?: string;
  primary_partner_id?: string | null;
  start_date: string;
  end_date?: string | null;
  is_active?: boolean;
  created_at?: string;
  modified_at?: string;
}

export interface Investee {
  investee_id: string;
  chapter_id: string;
  investee_name: string;
  email: string;
  start_date: string;
  end_date?: string | null;
  is_active?: boolean;
  created_at?: string;
  modified_at?: string;
}

export interface GroupType {
  group_type_id: string;
  chapter_id: string;
  type_name: string;
  created_at?: string;
  modified_at?: string;
}

export interface AppointmentType {
  appointment_type_id: string;
  chapter_id: string;
  type_name: string;
  created_at?: string;
  modified_at?: string;
}

export interface Group {
  group_id: string;
  chapter_id: string;
  group_name: string;
  group_type_id?: string | null;
  group_type?: string | null; // resolved type_name from backend
  investee_id?: string | null;
  start_date: string;
  end_date?: string | null;
  is_active?: boolean;
  created_at?: string;
  modified_at?: string;
}

export interface GroupPartner {
  group_partner_id: string;
  group_id: string;
  chapter_id: string;
  partner_id: string;
  start_date: string;
  end_date?: string | null;
  created_at?: string;
}

export interface Appointment {
  appointment_id: string;
  chapter_id: string;
  appointment_name?: string | null;
  rec_appointment_id?: string | null;
  appointment_type_id?: string | null;
  group_type_id?: string | null;
  occurrence_date: string; // YYYY-MM-DD
  start_at: string;        // HH:MM:SS time string
  end_at: string;          // HH:MM:SS time string
  duration_minutes?: number;
  investee_id?: string | null;
  investee_name?: string | null;
  status: string; // 'PENDING' | 'COMPLETED' | 'CANCELLED' or legacy 'Scheduled', 'Completed', 'Cancelled'
  created_at?: string;
  modified_at?: string;
  // ── Calendar backward-compat aliases (v1 field names used by Calendar.tsx) ──
  /** @deprecated Use occurrence_date */
  meeting_date?: string;
  /** @deprecated Use start_at */
  planned_start?: string;
  /** @deprecated Use end_at */
  planned_end?: string;
  /** @deprecated Use appointment_type_id */
  meeting_type?: string;
  /** @deprecated Use appointment_id */
  app_id?: string;
  /** @deprecated Use rec_appointment_id */
  rec_app_id?: string;
  /** Internal Calendar state */
  group_id?: string;
  partners?: Array<{ partner_id: string; partner_name: string; email: string; is_present: boolean | null; absent_informed?: boolean | null }>;
}

export interface RecurringAppointment {
  rec_appointment_id: string;
  chapter_id: string;
  appointment_name?: string | null;
  group_id?: string | null;
  appointment_type_id?: string | null;
  start_time: string;       // HH:MM:SS
  duration_minutes: number;
  rrule: string;            // iCalendar RRule
  investee_id?: string | null;
  start_date: string;
  end_date: string;
  created_at?: string;
  modified_at?: string;
  // Resolved relations from GET /recurring-appointments
  group?: unknown | null;
  investee?: unknown | null;
  partners?: RecurringAppointmentPartner[];
  // ── Calendar backward-compat aliases (v1 field names used by Calendar.tsx) ──
  /** @deprecated Use rec_appointment_id */
  rec_app_id?: string;
  /** @deprecated Use start_time */
  planned_start?: string;
  /** @deprecated Use start_time + duration_minutes */
  planned_end?: string;
  /** @deprecated Use appointment_type_id */
  meeting_type?: string;
  /** @deprecated Use rrule */
  frequency?: string;
  /** @deprecated Use rrule */
  frequency_json?: string;
  /** @deprecated Use start_date */
  rec_app_start_date?: string;
  /** @deprecated Use end_date */
  rec_app_end_date?: string;
}

interface RecurringAppointmentPartner {
  rec_app_partner_id: string;
  chapter_id?: string;
  rec_appointment_id?: string;
  partner_id: string;
  partner_name?: string;
  email?: string;
}
