import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { recurringAppointmentService } from '../services/recurringAppointmentService';

type CreateRecurringInput = Parameters<typeof recurringAppointmentService.create>[0];
type CreateRecurringMutationInput = CreateRecurringInput & {
  chapter_id: string;
  partnerIds?: string[];
};
type UpdateRecurringInput = Parameters<typeof recurringAppointmentService.update>[1] & {
  rec_appointment_id: string;
  chapter_id: string;
  partnerIds?: string[];
};

/**
 * Fetch all recurring appointments
 */
export const useRecurringAppointments = () => {
  return useQuery({
    queryKey: ['recurringAppointments'],
    queryFn: () => recurringAppointmentService.getAll(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Create recurring appointment mutation
 */
export const useCreateRecurringAppointment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ partnerIds, ...data }: CreateRecurringMutationInput) =>
      recurringAppointmentService.create(data, data.chapter_id, partnerIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurringAppointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] }); // Refresh materialized events
    },
  });
};

/**
 * Update recurring appointment mutation
 */
export const useUpdateRecurringAppointment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ partnerIds, ...data }: UpdateRecurringInput) =>
      recurringAppointmentService.update(data.rec_appointment_id, data, data.chapter_id, partnerIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurringAppointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
};

/**
 * Delete recurring appointment mutation
 */
export const useDeleteRecurringAppointment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (recurringId: string) =>
      recurringAppointmentService.remove(recurringId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurringAppointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
};

/**
 * Materialize one recurring template occurrence
 */
export const useMaterializeRecurringAppointment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ recurringId, occurrenceDate }: { recurringId: string; occurrenceDate: string }) =>
      recurringAppointmentService.materialize(recurringId, occurrenceDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['recurringAppointments'] });
    },
  });
};
