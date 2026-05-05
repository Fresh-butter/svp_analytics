import { api } from './api';
import { Group } from '../types';
import { BackendGroup, mapGroup, groupToBackend } from '../mappers';

interface ListResponse {
  success: boolean;
  data: BackendGroup[];
}

interface SingleResponse {
  success: boolean;
  data: BackendGroup & {
    members: Array<{
      group_partner_id: string;
      partner_id: string;
      partner_name: string;
      email: string;
      start_date: string;
      end_date: string | null;
      membership_active: boolean;
      partner_active: boolean;
    }>;
    investee_name?: string;
    recurring_appointments?: Array<{
      rec_appointment_id: string;
      appointment_name?: string | null;
      appointment_type_id?: string | null;
      start_time: string;
      duration_minutes: number;
      rrule?: string | null;
      start_date: string;
      end_date?: string | null;
    }>;
  };
}

export const groupService = {
  async list(params?: {
    active?: boolean;
    group_type?: string;
  }): Promise<Group[]> {
    const qs = new URLSearchParams();
    if (params?.active !== undefined) qs.set('active', String(params.active));
    if (params?.group_type) qs.set('group_type', params.group_type);
    const q = qs.toString();
    const res = await api.get<ListResponse>(`/groups${q ? `?${q}` : ''}`);
    return res.data.map(mapGroup);
  },

  async getAll(): Promise<Group[]> {
    const res = await api.get<ListResponse>('/groups');
    return res.data.map(mapGroup);
  },

  async getMyGroupIds(): Promise<string[]> {
    const res = await api.get<{ success: boolean; data: string[] }>('/groups/mine/ids');
    return Array.isArray(res.data) ? res.data : [];
  },

  async getWithMembers(id: string): Promise<{
    group: Group;
    members: Array<{
      group_partner_id: string;
      partner_id: string;
      partner_name: string;
      email: string;
      start_date: string;
      end_date: string | null;
      is_active: boolean;
    }>;
    recurring_appointments: Array<{
      rec_appointment_id: string;
      appointment_name?: string | null;
      appointment_type_id?: string | null;
      start_time: string;
      duration_minutes: number;
      rrule?: string | null;
      start_date: string;
      end_date?: string | null;
    }>;
    investee?: { investee_id: string; investee_name: string } | null;
  }> {
    const res = await api.get<SingleResponse>(`/groups/${id}`);
    const group = mapGroup(res.data);
    const members = (res.data.members || []).map((m) => ({
      group_partner_id: m.group_partner_id,
      partner_id: m.partner_id,
      partner_name: m.partner_name,
      email: m.email,
      start_date: m.start_date,
      end_date: m.end_date,
      is_active: Boolean(m.membership_active && m.partner_active),
    }));

    const investee = res.data.investee_id && res.data.investee_name
      ? { investee_id: res.data.investee_id, investee_name: res.data.investee_name }
      : null;

    return {
      group,
      members,
      recurring_appointments: res.data.recurring_appointments || [],
      investee,
    };
  },

  async create(data: Partial<Group>, chapterId: string): Promise<Group> {
    const body = groupToBackend(data, chapterId);
    const res = await api.post<{ success: boolean; data: BackendGroup }>('/groups', body);
    return mapGroup(res.data);
  },

  async update(id: string, data: Partial<Group>, chapterId: string): Promise<Group> {
    const body = groupToBackend(data, chapterId);
    const res = await api.put<{ success: boolean; data: BackendGroup }>(`/groups/${id}`, body);
    return mapGroup(res.data);
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/groups/${id}`);
  },

  /** Replace the full partner list for a group (v2 sync endpoint) */
  async updatePartners(
    groupId: string,
    chapterId: string,
    partners: Array<{ partner_id: string; start_date?: string | null; end_date?: string | null | undefined }>
  ): Promise<unknown> {
    const res = await api.put(`/groups/${groupId}/partners`, {
      chapter_id: chapterId,
      partners,
    });
    return res;
  },
};
