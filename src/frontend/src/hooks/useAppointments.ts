import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appointmentService } from '../services/appointmentService';

type CreateAppointmentInput = Parameters<typeof appointmentService.create>[0];

/**
 * Fetch all appointments for a specific month/year
 */
export const useAppointments = (month: number, year: number) => {
  return useQuery({
    queryKey: ['appointments', month, year],
    queryFn: async () => {
      const res = await appointmentService.list({ month, year });
      return res;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Create appointment mutation
 */
export const useCreateAppointment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAppointmentInput) => appointmentService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
};

/**
 * Delete appointment mutation
 */
export const useDeleteAppointment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (appointmentId: string) => appointmentService.remove(appointmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
};

/**
 * Complete appointment mutation
 */
export const useCompleteAppointment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { appointmentId: string; attendance: Array<{ partner_id: string; is_present: boolean; absent_informed?: boolean | null }> }) =>
      appointmentService.complete(data.appointmentId, data.attendance),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
};

