import { api } from './api';
import { Investee } from '../types';
import { BackendInvestee, mapInvestee, investeeToBackend } from '../mappers';

interface ListResponse {
  success: boolean;
  data: BackendInvestee[];
}

interface SingleResponse {
  success: boolean;
  data: BackendInvestee;
}

interface DetailResponse {
  success: boolean;
  data: BackendInvestee & {
    groups?: Array<{
      group_id: string;
      group_name: string;
      group_type: string | null;
      start_date: string;
      end_date: string | null;
      is_active: boolean;
    }>;
    appointments?: Array<{
      appointment_id: string;
      appointment_type: string | null;
      occurrence_date: string;
      start_at: string;
      end_at: string;
      status: string;
    }>;
    recurring_appointments?: Array<{
      rec_appointment_id: string;
      appointment_name?: string | null;
      appointment_type_id?: string | null;
      appointment_type?: string | null;
      start_time: string;
      duration_minutes: number;
      rrule?: string | null;
      start_date: string;
      end_date?: string | null;
    }>;
  };
}

export const investeeService = {
  async list(params?: {
    active?: boolean;
  }): Promise<Investee[]> {
    const qs = new URLSearchParams();
    if (params?.active !== undefined) qs.set('active', String(params.active));
    const q = qs.toString();
    const res = await api.get<ListResponse>(`/investees${q ? `?${q}` : ''}`);
    return res.data.map(mapInvestee);
  },

  async getAll(): Promise<Investee[]> {
    const res = await api.get<ListResponse>('/investees');
    return res.data.map(mapInvestee);
  },

  async get(id: string): Promise<Investee> {
    const res = await api.get<SingleResponse>(`/investees/${id}`);
    return mapInvestee(res.data);
  },

  async getWithDetails(id: string, month?: string, year?: string): Promise<DetailResponse['data']> {
    const qs = new URLSearchParams();
    if (month) qs.set('month', month);
    if (year) qs.set('year', year);
    const q = qs.toString();
    const res = await api.get<DetailResponse>(`/investees/${id}${q ? `?${q}` : ''}`);
    return res.data;
  },

  async create(data: Partial<Investee>, chapterId: string): Promise<Investee> {
    const body = investeeToBackend(data, chapterId);
    const res = await api.post<SingleResponse>('/investees', body);
    return mapInvestee(res.data);
  },

  async update(id: string, data: Partial<Investee>, chapterId: string): Promise<Investee> {
    const body = investeeToBackend(data, chapterId);
    const res = await api.put<SingleResponse>(`/investees/${id}`, body);
    return mapInvestee(res.data);
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/investees/${id}`);
  },
};
