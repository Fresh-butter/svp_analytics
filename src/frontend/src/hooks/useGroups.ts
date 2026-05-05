import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { groupService } from '../services/groupService';
import { Group } from '../types';

export const useGroups = () => {
    return useQuery({
        queryKey: ['groups'],
        queryFn: () => groupService.getAll(),
        staleTime: 5 * 60 * 1000,
    });
};

export const useCreateGroup = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ data, chapterId }: { data: Partial<Group>; chapterId: string }) =>
            groupService.create(data, chapterId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['groups'] });
        },
    });
};

export const useUpdateGroup = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data, chapterId }: { id: string; data: Partial<Group>; chapterId: string }) =>
            groupService.update(id, data, chapterId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['groups'] });
        },
    });
};

export const useDeleteGroup = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (groupId: string) => groupService.remove(groupId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['groups'] });
        },
    });
};
