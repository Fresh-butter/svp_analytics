import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { partnerService } from '../services/partnerService';
import { Partner } from '../types';

export const usePartners = () => {
    return useQuery({
        queryKey: ['partners'],
        queryFn: () => partnerService.getAll(),
        staleTime: 5 * 60 * 1000,
    });
};

export const useCreatePartner = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ data, chapterId }: { data: Partial<Partner>; chapterId: string }) =>
            partnerService.create(data, chapterId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['partners'] });
        },
    });
};

export const useUpdatePartner = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data, chapterId }: { id: string; data: Partial<Partner>; chapterId: string }) =>
            partnerService.update(id, data, chapterId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['partners'] });
        },
    });
};

export const useDeletePartner = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (partnerId: string) => partnerService.remove(partnerId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['partners'] });
        },
    });
};
