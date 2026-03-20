import { api } from './api';
import { GroupType, AppointmentType } from '../types';

// ── Group Types ──────────────────────────────────────────────────────────────

interface GroupTypesResponse {
  success: boolean;
  data: GroupType[];
}

interface GroupTypeResponse {
  success: boolean;
  data: GroupType;
}

// ── Appointment Types ────────────────────────────────────────────────────────

interface AppointmentTypesResponse {
  success: boolean;
  data: AppointmentType[];
}

interface AppointmentTypeResponse {
  success: boolean;
  data: AppointmentType;
}

export const lookupService = {
  // ── Group Types ──
  async listGroupTypes(): Promise<GroupType[]> {
    const res = await api.get<GroupTypesResponse>('/group-types');
    return res.data;
  },

  async createGroupType(typeName: string): Promise<GroupType> {
    const res = await api.post<GroupTypeResponse>('/group-types', { type_name: typeName });
    return res.data;
  },

  async deleteGroupType(id: string): Promise<void> {
    await api.delete(`/group-types/${id}`);
  },

  // ── Appointment Types ──
  async listAppointmentTypes(): Promise<AppointmentType[]> {
    const res = await api.get<AppointmentTypesResponse>('/appointment-types');
    return res.data;
  },

  async createAppointmentType(typeName: string): Promise<AppointmentType> {
    const res = await api.post<AppointmentTypeResponse>('/appointment-types', { type_name: typeName });
    return res.data;
  },

  async deleteAppointmentType(id: string): Promise<void> {
    await api.delete(`/appointment-types/${id}`);
  },
};
