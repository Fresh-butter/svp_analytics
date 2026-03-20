import { api } from './api';
import { RecurringAppointment } from '../types';
import { BackendRecurringAppointment, mapRecurringAppointment, recurringToBackend } from '../mappers';

interface ListResponse {
  success: boolean;
  data: BackendRecurringAppointment[];
}

interface SingleResponse {
  success: boolean;
  data: BackendRecurringAppointment;
}

export const recurringAppointmentService = {
  /** List all recurring appointment templates (no pagination) */
  async list(): Promise<RecurringAppointment[]> {
    const res = await api.get<ListResponse>('/recurring-appointments');
    return res.data.map(mapRecurringAppointment);
  },

  /** Get a single recurring appointment with partners, group & investee */
  async get(id: string): Promise<RecurringAppointment> {
    const res = await api.get<SingleResponse>(`/recurring-appointments/${id}`);
    return mapRecurringAppointment(res.data);
  },

  /** Create template with optional partner subset */
  async create(data: Partial<RecurringAppointment>, chapterId: string, partnerIds?: string[]): Promise<RecurringAppointment> {
    const body: Record<string, unknown> = recurringToBackend(data, chapterId);
    if (partnerIds?.length) body.partners = partnerIds;
    const res = await api.post<SingleResponse>('/recurring-appointments', body);
    return mapRecurringAppointment(res.data);
  },

  /** Update template (only affects unmaterialized occurrences) */
  async update(id: string, data: Partial<RecurringAppointment>, chapterId: string, partnerIds?: string[]): Promise<RecurringAppointment> {
    const body: Record<string, unknown> = recurringToBackend(data, chapterId);
    if (partnerIds !== undefined) body.partners = partnerIds;
    const res = await api.put<SingleResponse>(`/recurring-appointments/${id}`, body);
    return mapRecurringAppointment(res.data);
  },

  /** Manually materialize an occurrence for a specific date */
  async materialize(id: string, occurrenceDate: string): Promise<unknown> {
    return api.post(`/recurring-appointments/${id}/materialize`, {
      occurrence_date: occurrenceDate,
    });
  },

  /** Delete template (sets rec_appointment_id = NULL in materialized appointments) */
  async remove(id: string): Promise<void> {
    await api.delete(`/recurring-appointments/${id}`);
  },

  /** @deprecated Calendar.tsx alias; use list() instead */
  async getAll(): Promise<RecurringAppointment[]> {
    return recurringAppointmentService.list();
  },
};
