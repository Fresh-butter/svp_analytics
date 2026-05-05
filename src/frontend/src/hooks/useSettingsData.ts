import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api';
import { lookupService } from '../services/lookupService';
import { AppointmentType, GroupType } from '../types';

type Admin = {
  user_id: string;
  name: string;
  email: string;
  chapter_id: string;
};

type Partner = {
  user_id: string;
  name: string;
  email: string;
  chapter_id: string;
  is_active?: boolean;
};

type AddAdminInput = {
  name: string;
  email: string;
  password: string;
};

export const useSettingsData = (isAdmin: boolean) => {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>([]);
  const [groupTypes, setGroupTypes] = useState<GroupType[]>([]);

  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [loadingPartners, setLoadingPartners] = useState(false);
  const [loadingLookups, setLoadingLookups] = useState(false);

  const [loadError, setLoadError] = useState<string | null>(null);

  const loadAdmins = useCallback(async () => {
    setLoadingAdmins(true);
    try {
      const res = await api.get<{ data: Admin[] }>('/settings/admins');
      setAdmins(res.data || []);
    } catch (err) {
      setLoadError((err as Error).message || 'Failed to load admins');
      console.error('Failed to load admins:', err);
    } finally {
      setLoadingAdmins(false);
    }
  }, []);

  const loadPartners = useCallback(async () => {
    setLoadingPartners(true);
    try {
      const res = await api.get<{ data: Partner[] }>('/settings/partners');
      setPartners(res.data || []);
    } catch (err) {
      setLoadError((err as Error).message || 'Failed to load partners');
      console.error('Failed to load partners:', err);
    } finally {
      setLoadingPartners(false);
    }
  }, []);

  const loadLookups = useCallback(async () => {
    setLoadingLookups(true);
    try {
      const [apptTypes, grpTypes] = await Promise.all([
        lookupService.listAppointmentTypes(),
        lookupService.listGroupTypes(),
      ]);
      setAppointmentTypes(apptTypes);
      setGroupTypes(grpTypes);
    } catch (err) {
      setLoadError((err as Error).message || 'Failed to load lookup types');
      console.error('Failed to load lookup types:', err);
    } finally {
      setLoadingLookups(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    setLoadError(null);
    void loadAdmins();
    void loadPartners();
    void loadLookups();
  }, [isAdmin, loadAdmins, loadPartners, loadLookups]);

  const addAdmin = useCallback(async (input: AddAdminInput) => {
    const res = await api.post<{ data: Admin }>('/settings/admins', input);
    setAdmins((current) => [res.data, ...current]);
  }, []);

  const removeAdmin = useCallback(async (id: string) => {
    await api.delete(`/settings/admins/${id}`);
    setAdmins((current) => current.filter((item) => item.user_id !== id));
  }, []);

  const lockPartner = useCallback(async (id: string) => {
    await api.post(`/settings/partners/${id}/lock`, {});
    setPartners((current) => current.map((item) => (item.user_id === id ? { ...item, is_active: false } : item)));
  }, []);

  const unlockPartner = useCallback(async (id: string) => {
    await api.post(`/settings/partners/${id}/unlock`, {});
    setPartners((current) => current.map((item) => (item.user_id === id ? { ...item, is_active: true } : item)));
  }, []);

  const removePartner = useCallback(async (id: string) => {
    await api.delete(`/settings/partners/${id}`);
    setPartners((current) => current.filter((item) => item.user_id !== id));
  }, []);

  const createAppointmentType = useCallback(async (nameValue: string) => {
    const created = await lookupService.createAppointmentType(nameValue);
    setAppointmentTypes((current) => [created, ...current]);
  }, []);

  const deleteAppointmentType = useCallback(async (id: string) => {
    await lookupService.deleteAppointmentType(id);
    setAppointmentTypes((current) => current.filter((item) => item.appointment_type_id !== id));
  }, []);

  const createGroupType = useCallback(async (nameValue: string) => {
    const created = await lookupService.createGroupType(nameValue);
    setGroupTypes((current) => [created, ...current]);
  }, []);

  const deleteGroupType = useCallback(async (id: string) => {
    await lookupService.deleteGroupType(id);
    setGroupTypes((current) => current.filter((item) => item.group_type_id !== id));
  }, []);

  return {
    admins,
    partners,
    appointmentTypes,
    groupTypes,
    loadingAdmins,
    loadingPartners,
    loadingLookups,
    loadError,
    addAdmin,
    removeAdmin,
    lockPartner,
    unlockPartner,
    removePartner,
    createAppointmentType,
    deleteAppointmentType,
    createGroupType,
    deleteGroupType,
  };
};
