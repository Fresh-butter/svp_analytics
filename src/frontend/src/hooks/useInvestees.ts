import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { investeeService } from '../services/investeeService';
import { Investee } from '../types';

export const useInvestees = () => {
    return useQuery({
        queryKey: ['investees'],
        queryFn: () => investeeService.getAll(),
        staleTime: 5 * 60 * 1000,
    });
};

export const useCreateInvestee = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ data, chapterId }: { data: Partial<Investee>; chapterId: string }) =>
            investeeService.create(data, chapterId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['investees'] });
        },
    });
};

export const useUpdateInvestee = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data, chapterId }: { id: string; data: Partial<Investee>; chapterId: string }) =>
            investeeService.update(id, data, chapterId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['investees'] });
        },
    });
};

export const useDeleteInvestee = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (investeeId: string) => investeeService.remove(investeeId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['investees'] });
        },
    });
};
