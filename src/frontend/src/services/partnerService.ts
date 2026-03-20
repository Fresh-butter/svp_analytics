import { api } from './api';
import { Partner } from '../types';
import { BackendPartner, mapPartner, partnerToBackend } from '../mappers';

interface ListResponse {
  success: boolean;
  data: BackendPartner[];
}

interface SingleResponse {
  success: boolean;
  data: BackendPartner;
}

interface DetailResponse {
  success: boolean;
  data: BackendPartner & {
    groups?: Array<{
      group_partner_id: string;
      gp_start: string;
      gp_end: string | null;
      gp_active: boolean;
      group_id: string;
      group_name: string;
      group_type: string | null;
    }>;
    appointments?: Array<{
      appointment_id: string;
      appointment_type: string | null;
      occurrence_date: string;
      start_at: string;
      end_at: string;
      status: string;
      is_present: boolean | null;
    }>;
    recurring_appointments?: Array<{
      rec_app_partner_id: string;
      rec_appointment_id: string;
      appointment_type: string | null;
      start_date: string;
      end_date: string | null;
      start_time: string;
      duration_minutes: number;
      rrule: string;
    }>;
  };
}

export const partnerService = {
  async list(params?: {
    active?: boolean;
  }): Promise<Partner[]> {
    const qs = new URLSearchParams();
    if (params?.active !== undefined) qs.set('active', String(params.active));
    const q = qs.toString();
    const res = await api.get<ListResponse>(`/partners${q ? `?${q}` : ''}`);
    return res.data.map(mapPartner);
  },

  async getAll(): Promise<Partner[]> {
    const res = await api.get<ListResponse>('/partners');
    return res.data.map(mapPartner);
  },

  async get(id: string): Promise<Partner> {
    const res = await api.get<SingleResponse>(`/partners/${id}`);
    return mapPartner(res.data);
  },

  async getWithDetails(id: string, month?: string, year?: string): Promise<DetailResponse['data']> {
    const qs = new URLSearchParams();
    if (month) qs.set('month', month);
    if (year) qs.set('year', year);
    const q = qs.toString();
    const res = await api.get<DetailResponse>(`/partners/${id}${q ? `?${q}` : ''}`);
    return res.data;
  },

  async create(data: Partial<Partner>, chapterId: string): Promise<Partner> {
    const body = partnerToBackend(data, chapterId);
    const res = await api.post<SingleResponse>('/partners', body);
    return mapPartner(res.data);
  },

  async update(id: string, data: Partial<Partner>, chapterId: string): Promise<Partner> {
    const body = partnerToBackend(data, chapterId);
    const res = await api.put<SingleResponse>(`/partners/${id}`, body);
    return mapPartner(res.data);
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/partners/${id}`);
  },
};
