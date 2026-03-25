import { api } from './api';
import { Appointment } from '../types';
import { BackendAppointment, mapAppointment, appointmentToBackend } from '../mappers';

type AppointmentInvesteeDetails = {
  investee_id?: string;
  investee_name?: string;
  email?: string | null;
  start_date?: string;
  end_date?: string | null;
  is_active?: boolean;
  created_at?: string;
  modified_at?: string;
};

type AppointmentRecurringDetails = {
  rec_appointment_id?: string;
  start_date?: string;
  end_date?: string;
  start_time?: string;
  duration_minutes?: number;
  rrule?: string;
  created_at?: string;
  modified_at?: string;
};

type AppointmentUpdateInput = Omit<Partial<Appointment>, 'partners'> & {
  partners?: string[];
};

interface ListResponse {
  success: boolean;
  data: BackendAppointment[];
  pagination: { month: number; year: number; total: number };
}

interface SingleResponse {
  success: boolean;
  data: BackendAppointment;
}

export const appointmentService = {
  /** List appointments paginated by month/year */
  async list(params?: {
    month?: number;
    year?: number;
    status?: string;
  }): Promise<{ data: Appointment[]; pagination: ListResponse['pagination'] }> {
    const qs = new URLSearchParams();
    if (params?.month) qs.set('month', String(params.month));
    if (params?.year) qs.set('year', String(params.year));
    if (params?.status) qs.set('status', params.status);
    const q = qs.toString();
    const res = await api.get<ListResponse>(`/appointments${q ? `?${q}` : ''}`);
    return { data: res.data.map(mapAppointment), pagination: res.pagination };
  },

  /** Get a single appointment with full details (investee, recurring, partners) */
  async get(id: string): Promise<{
    appointment: Appointment;
    investee?: AppointmentInvesteeDetails | null;
    recurring_appointment?: AppointmentRecurringDetails | null;
    partners: Array<{
      appointment_partner_id: string;
      is_present: boolean | null;
      partner_id: string;
      partner_name: string;
      email: string;
    }>;
  }> {
    const res = await api.get<SingleResponse>(`/appointments/${id}`);
    const mapped = mapAppointment(res.data);
    return {
      appointment: mapped,
      investee: res.data.investee,
      recurring_appointment: res.data.recurring_appointment,
      partners: res.data.partners || [],
    };
  },

  /** Create appointment with partners */
  async create(data: {
    chapter_id: string;
    occurrence_date?: string;  // YYYY-MM-DD
    start_at: string;          // HH:MM:SS
    end_at: string;            // HH:MM:SS
    appointment_name?: string;
    appointment_type_id?: string;
    group_type_id?: string;
    investee_id?: string;
    partners?: string[];
  }): Promise<Appointment> {
    const res = await api.post<SingleResponse>('/appointments', data);
    return mapAppointment(res.data);
  },

  /** Update appointment details and/or partners */
  async update(id: string, data: AppointmentUpdateInput, chapterId: string): Promise<Appointment> {
    const { partners, ...appointmentFields } = data;
    const body: Record<string, unknown> = appointmentToBackend(appointmentFields, chapterId);
    if (partners) body.partners = partners;
    const res = await api.put<SingleResponse>(`/appointments/${id}`, body);
    return mapAppointment(res.data);
  },

  /** Mark appointment as complete with attendance */
  async complete(id: string, attendance: Array<{ partner_id: string; is_present: boolean }>): Promise<Appointment> {
    const res = await api.patch<SingleResponse>(`/appointments/${id}/complete`, { attendance });
    return mapAppointment(res.data);
  },

  /** Delete appointment (cascades to appointment_partners) */
  async remove(id: string): Promise<void> {
    await api.delete(`/appointments/${id}`);
  },

  // ── Calendar backward-compat shims (v1 API shape) ──
  /** @deprecated Calendar.tsx uses this; fetches all appointments for near months */
  async getAll(): Promise<Appointment[]> {
    const now = new Date();
    const results: Appointment[] = [];
    // Fetch 3 months around current month for Calendar
    for (let offset = -1; offset <= 1; offset++) {
      const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
      try {
        const res = await appointmentService.list({ month: d.getMonth() + 1, year: d.getFullYear() });
        results.push(...res.data);
      } catch { /* ignore */ }
    }
    return results;
  },

  /** @deprecated v2 uses PATCH complete; stub for Calendar cancel */
  async cancel(id: string): Promise<Appointment> {
    const res = await api.put<{ success: boolean; data: Appointment }>(`/appointments/${id}`, { status: 'CANCELLED' });
    return res.data;
  },

  /** @deprecated stub for Calendar uncancel */
  async uncancel(id: string): Promise<Appointment> {
    const res = await api.put<{ success: boolean; data: Appointment }>(`/appointments/${id}`, { status: 'PENDING' });
    return res.data;
  },
};
