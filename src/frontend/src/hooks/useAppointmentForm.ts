import { useState, useCallback } from 'react';
import { INITIAL_APP_STATE, INITIAL_REC_STATE } from '../constants/calendar';
import { format, addMonths } from 'date-fns';

export interface AppointmentFormState {
  appointment_name?: string;
  meeting_type?: string;
  meeting_date?: string;
  occurrence_date?: string;
  planned_start?: string;
  planned_end?: string;
  start_at?: string;
  end_at?: string;
  group_id?: string;
  investee_id?: string;
  appointment_type_id?: string;
  group_type_id?: string;
  chapter_id?: string;
  status?: string;
  app_id?: string;
  appointment_id?: string;
  partner_ids?: string[];
  [key: string]: unknown;
}

export interface RecurringFormState {
  appointment_name?: string;
  meeting_type?: string;
  rec_app_start_date?: string;
  rec_app_end_date?: string;
  frequency?: string;
  group_id?: string;
  investee_id?: string;
  appointment_type_id?: string;
  chapter_id?: string;
  frequency_json?: string;
  planned_start?: string;
  planned_end?: string;
  rec_app_id?: string;
  [key: string]: unknown;
}

export function useAppointmentForm(onReset?: () => void) {
  const today = new Date().toLocaleDateString('en-CA');
  const [form, setForm] = useState<AppointmentFormState>({
    ...INITIAL_APP_STATE,
    meeting_date: format(new Date(), 'yyyy-MM-dd'),
  });
  const [selectedPartnerIds, setSelectedPartnerIds] = useState<string[]>([]);

  const resetForm = useCallback(() => {
    setForm({
      ...INITIAL_APP_STATE,
      meeting_date: today,
    });
    setSelectedPartnerIds([]);
    onReset?.();
  }, [today, onReset]);

  const updateForm = useCallback((updates: Partial<AppointmentFormState>) => {
    setForm(prev => ({ ...prev, ...updates }));
  }, []);

  return {
    form,
    updateForm,
    setForm,
    selectedPartnerIds,
    setSelectedPartnerIds,
    resetForm,
  };
}

export function useRecurringForm(onReset?: () => void) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const in3Months = format(addMonths(new Date(), 3), 'yyyy-MM-dd');

  const [form, setForm] = useState<RecurringFormState>({
    ...INITIAL_REC_STATE,
    rec_app_start_date: today,
    rec_app_end_date: in3Months,
  });

  const resetForm = useCallback(() => {
    setForm({
      ...INITIAL_REC_STATE,
      rec_app_start_date: today,
      rec_app_end_date: in3Months,
    });
    onReset?.();
  }, [today, in3Months, onReset]);

  const updateForm = useCallback((updates: Partial<RecurringFormState>) => {
    setForm(prev => ({ ...prev, ...updates }));
  }, []);

  return {
    form,
    updateForm,
    setForm,
    resetForm,
  };
}
