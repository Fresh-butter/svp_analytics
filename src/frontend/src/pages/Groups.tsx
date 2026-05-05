import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, Button, Modal } from '../components/Common';
import { EntityFilters } from '../components/EntityFilters';
import { Group } from '../types';
import { groupFormSchema, GroupFormData } from '../schemas/formSchemas';
import { lookupService } from '../services/lookupService';
import { groupService } from '../services/groupService';
import { useAuth } from '../context/AuthContext';
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { matchesSearchMulti } from '../utils/search';
import { useQuery } from '@tanstack/react-query';
import { useCreateGroup, useDeleteGroup, useGroups, useUpdateGroup } from '../hooks/useGroups';
import { useInvestees } from '../hooks/useInvestees';
import { SortIndicator } from '../components/SortIndicator';
import { matchesDateRange } from '../utils/dateFilters';
import { exportJsonToXlsx } from '../utils/exporters';

const PAGE_SIZE = 15;

export const GroupsPage = () => {
    const { user } = useAuth();
    const isAdmin = user?.user_type === 'ADMIN';
    const isPartner = user?.user_type === 'PARTNER';
    const navigate = useNavigate();
    const chapterId = user?.chapter_id || '';
    const { data: groups = [] } = useGroups();
    const { data: investees = [] } = useInvestees();
    const { data: groupTypes = [], isLoading: groupTypesLoading } = useQuery({
        queryKey: ['group-types'],
        queryFn: () => lookupService.listGroupTypes(),
    });
    const { data: myGroupIds = [] } = useQuery({
        queryKey: ['my-group-ids'],
        queryFn: () => groupService.getMyGroupIds(),
        enabled: isPartner,
    });
    const createGroupMutation = useCreateGroup();
    const updateGroupMutation = useUpdateGroup();
    const deleteGroupMutation = useDeleteGroup();
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentGroup, setCurrentGroup] = useState<Partial<Group> | null>(null);
    const [showFilters, setShowFilters] = useState(false);
    const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
    const [endDateFilter, setEndDateFilter] = useState({ start: '', end: '' });
    const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [exploreFilter, setExploreFilter] = useState<'my-groups' | 'all'>('my-groups');
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
    const { register, handleSubmit, reset, formState: { errors } } = useForm<GroupFormData>({
        resolver: zodResolver(groupFormSchema),
        defaultValues: { group_name: '', group_type_id: '', start_date: new Date().toLocaleDateString('en-CA'), end_date: '', investee_id: '' },
    });

    const loading = groupTypesLoading;

    const myGroupIdSet = useMemo(() => new Set(myGroupIds), [myGroupIds]);

    const getGroupTypeName = (id?: string | null) => {
        if (!id) return '-';
        return groupTypes.find(t => t.group_type_id === id)?.type_name || '-';
    };

    const groupsByExploreFilter = isPartner && exploreFilter === 'my-groups'
        ? groups.filter((group) => myGroupIdSet.has(group.group_id))
        : groups;

    // Filter Logic
    const filtered = groupsByExploreFilter.filter(g => {
        const searchMatch = matchesSearchMulti(searchTerm, g.group_name, getGroupTypeName(g.group_type_id));

        if (activeFilter === 'active' && !g.is_active) return false;
        if (activeFilter === 'inactive' && g.is_active) return false;

        // Start date range filter
        const matchesStartRange = matchesDateRange(g.start_date, dateFilter);

        // End date range filter
        const matchesEndRange = matchesDateRange(g.end_date || null, endDateFilter);

        return searchMatch && matchesStartRange && matchesEndRange;
    });

    // Sort Logic
    const filteredGroups = sortConfig
        ? [...filtered].sort((a, b) => {
            let aVal: string;
            let bVal: string;
            if (sortConfig.key === 'type_name') {
                aVal = getGroupTypeName(a.group_type_id);
                bVal = getGroupTypeName(b.group_type_id);
            } else {
                const key = sortConfig.key as keyof Group;
                aVal = String(a[key] ?? '');
                bVal = String(b[key] ?? '');
            }
            const cmp = aVal.localeCompare(bVal);
            return sortConfig.direction === 'asc' ? cmp : -cmp;
        })
        : filtered;

    const totalPages = Math.ceil(filteredGroups.length / PAGE_SIZE);
    const paginated = filteredGroups.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const handleSort = (key: string) => {
        setSortConfig(prev =>
            prev && prev.key === key
                ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
                : { key, direction: 'asc' }
        );
    };

    const handleExportExcel = async () => {
        const detailedGroups = await Promise.all(
            filteredGroups.map(async (group) => {
                const details = await groupService.getWithMembers(group.group_id);
                return { group, details };
            })
        );

        const exportRows = detailedGroups.flatMap(({ group, details }) => {
            const investeeName = details.investee?.investee_name
                || investees.find((inv) => inv.investee_id === group.investee_id)?.investee_name
                || '-';

            const baseGroupData = {
                'Group Name': group.group_name,
                'Group Type Name': getGroupTypeName(group.group_type_id),
                'Investee Name': investeeName,
                'Start Date': group.start_date,
                'End Date': group.end_date || '-',
                'Is Active': group.is_active ? 'Yes' : 'No',
                'Created At': group.created_at || '-',
                'Modified At': group.modified_at || '-',
            };

            if (!details.members.length) {
                return [{
                    ...baseGroupData,
                    'Partner Name': '-',
                    'Partner Email': '-',
                    'Membership Start Date': '-',
                    'Membership End Date': '-',
                    'Membership Active': '-',
                }];
            }

            return details.members.map((member) => ({
                ...baseGroupData,
                'Partner Name': member.partner_name,
                'Partner Email': member.email,
                'Membership Start Date': member.start_date,
                'Membership End Date': member.end_date || '-',
                'Membership Active': member.is_active ? 'Yes' : 'No',
            }));
        });

        await exportJsonToXlsx(exportRows, 'Groups', `groups_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const handleOpenAdd = () => {
        setCurrentGroup(null);
        reset({ group_name: '', group_type_id: '', start_date: new Date().toLocaleDateString('en-CA'), end_date: '', investee_id: '' });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (g: Group) => {
        setCurrentGroup(g);
        reset({
            group_name: g.group_name,
            group_type_id: g.group_type_id || '',
            start_date: g.start_date,
            end_date: g.end_date || '',
            investee_id: g.investee_id || '',
        });
        setIsModalOpen(true);
    };

    const onFormSubmit = async (data: GroupFormData) => {
        try {
            if (currentGroup?.group_id) {
                await updateGroupMutation.mutateAsync({ id: currentGroup.group_id, data, chapterId });
            } else {
                await createGroupMutation.mutateAsync({ data, chapterId });
            }
            setIsModalOpen(false);
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : 'Failed to save group');
        }
    };

    const handleDeleteGroup = async (group: Group) => {
        const shouldTryDelete = window.confirm('This will delete only if the group is not referenced. Do you want to continue?');
        if (!shouldTryDelete) return;

        try {
            await deleteGroupMutation.mutateAsync(group.group_id);
            return;
        } catch (err: unknown) {
            if (!group.is_active) {
                alert(err instanceof Error ? err.message : 'Unable to delete group.');
                return;
            }
        }

        const shouldSoftDelete = window.confirm('Group could not be deleted because it is referenced. Do you want to soft delete by setting End Date to today?');
        if (!shouldSoftDelete) return;

        try {
            const today = new Date().toLocaleDateString('en-CA');
            await updateGroupMutation.mutateAsync({
                id: group.group_id,
                data: {
                    group_name: group.group_name,
                    group_type_id: group.group_type_id || undefined,
                    start_date: group.start_date,
                    end_date: today,
                    investee_id: group.investee_id || undefined,
                },
                chapterId,
            });
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : 'Failed to soft delete group.');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-text">Groups</h2>
                    <p className="text-textMuted mt-1">
                        {isAdmin
                            ? 'Manage groups and their members.'
                            : 'Browse groups and view members.'}
                    </p>
                </div>
                {isAdmin && <Button onClick={handleOpenAdd}><Plus size={20} /> Add Group</Button>}
            </div>

            <Card className="bg-surface border-surfaceHighlight">
                <EntityFilters
                    searchTerm={searchTerm}
                    onSearchTermChange={(value) => { setSearchTerm(value); setPage(1); }}
                    searchPlaceholder="Search by name or type..."
                    showFilters={showFilters}
                    onToggleFilters={() => setShowFilters(!showFilters)}
                    onExport={handleExportExcel}
                    dateFilter={dateFilter}
                    onDateFilterChange={setDateFilter}
                    endDateFilter={endDateFilter}
                    onEndDateFilterChange={setEndDateFilter}
                    activeFilter={activeFilter}
                    onActiveFilterChange={setActiveFilter}
                    filterLabel="Filter"
                    inlineControls={isPartner ? (
                        <div className="flex rounded-lg border border-surfaceHighlight overflow-hidden text-sm">
                            <button
                                type="button"
                                onClick={() => { setExploreFilter('my-groups'); setPage(1); }}
                                className={`px-3 py-1.5 transition-colors ${
                                    exploreFilter === 'my-groups'
                                        ? 'bg-primary text-white'
                                        : 'bg-surfaceHighlight/30 text-textMuted hover:bg-surfaceHighlight'
                                }`}
                            >
                                My Groups
                            </button>
                            <button
                                type="button"
                                onClick={() => { setExploreFilter('all'); setPage(1); }}
                                className={`px-3 py-1.5 transition-colors ${
                                    exploreFilter === 'all'
                                        ? 'bg-primary text-white'
                                        : 'bg-surfaceHighlight/30 text-textMuted hover:bg-surfaceHighlight'
                                }`}
                            >
                                All
                            </button>
                        </div>
                    ) : undefined}
                />

                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="p-12 text-center text-textMuted">Loading groups...</div>
                    ) : paginated.length === 0 ? (
                        <div className="p-12 text-center text-textMuted">No groups found.</div>
                    ) : (
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-surfaceHighlight bg-surfaceHighlight/20">
                                    <th className="px-4 py-4 text-xs font-semibold text-textMuted uppercase tracking-wider cursor-pointer hover:text-text transition-colors" onClick={() => handleSort('group_name')}>
                                        Group Name <SortIndicator sortConfig={sortConfig} column="group_name" />
                                    </th>
                                    <th className="px-4 py-4 text-xs font-semibold text-textMuted uppercase tracking-wider cursor-pointer hover:text-text transition-colors" onClick={() => handleSort('type_name')}>
                                        Type <SortIndicator sortConfig={sortConfig} column="type_name" />
                                    </th>
                                    <th className="px-4 py-4 text-xs font-semibold text-textMuted uppercase tracking-wider cursor-pointer hover:text-text transition-colors" onClick={() => handleSort('start_date')}>
                                        Start Date <SortIndicator sortConfig={sortConfig} column="start_date" />
                                    </th>
                                    <th className="px-4 py-4 text-xs font-semibold text-textMuted uppercase tracking-wider cursor-pointer hover:text-text transition-colors" onClick={() => handleSort('end_date')}>
                                        End Date <SortIndicator sortConfig={sortConfig} column="end_date" />
                                    </th>
                                    {isAdmin && <th className="px-4 py-4 text-xs font-semibold text-textMuted uppercase tracking-wider text-right">Actions</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-surfaceHighlight">
                                {paginated.map(g => (
                                    <tr
                                        key={g.group_id}
                                        className="hover:bg-surfaceHighlight/30 transition-colors cursor-pointer"
                                        onClick={() => navigate(`/groups/${g.group_id}`)}
                                    >
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white uppercase shrink-0">
                                                    {g.group_name.substring(0, 2)}
                                                </div>
                                                <span className="font-medium text-text">{g.group_name}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-sm text-textMuted">{getGroupTypeName(g.group_type_id)}</td>
                                        <td className="px-4 py-4 text-sm text-textMuted">{new Date(g.start_date + 'T00:00:00').toLocaleDateString()}</td>
                                        <td className="px-4 py-4 text-sm text-textMuted">{g.end_date ? new Date(g.end_date + 'T00:00:00').toLocaleDateString() : '-'}</td>
                                        {isAdmin && (
                                            <td className="px-4 py-4 text-right" onClick={e => e.stopPropagation()}>
                                                <button
                                                    onClick={() => handleOpenEdit(g)}
                                                    className="p-1.5 text-textMuted hover:text-primary hover:bg-surfaceHighlight rounded-md transition-colors"
                                                    title="Edit"
                                                >
                                                    <Pencil size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteGroup(g)}
                                                    className="p-1.5 text-textMuted hover:text-red-400 hover:bg-surfaceHighlight rounded-md transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {totalPages > 1 && (
                    <div className="p-4 border-t border-surfaceHighlight flex items-center justify-between text-sm text-textMuted">
                        <span>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
                        <div className="flex gap-1">
                            <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="p-1.5 rounded hover:bg-surfaceHighlight disabled:opacity-30"><ChevronLeft size={18} /></button>
                            <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="p-1.5 rounded hover:bg-surfaceHighlight disabled:opacity-30"><ChevronRight size={18} /></button>
                        </div>
                    </div>
                )}
            </Card>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={currentGroup ? 'Edit Group' : 'Add New Group'}>
                <form className="space-y-4" onSubmit={handleSubmit(onFormSubmit)}>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-textMuted">Group Name <span className="text-red-400">*</span></label>
                        <input {...register('group_name')} className="w-full bg-background border border-surfaceHighlight rounded-lg px-4 py-2.5 text-text focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
                        {errors.group_name && <p className="text-xs text-red-400">{errors.group_name.message}</p>}
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-textMuted mb-1">Group Type <span className="text-red-400">*</span></label>
                        <select
                            {...register('group_type_id')}
                            className="w-full bg-surfaceHighlight/30 border border-surfaceHighlight rounded-lg px-3 py-2 text-text text-sm outline-none focus:border-primary"
                        >
                            <option value="">Select type...</option>
                            {groupTypes.map(t => (
                                <option key={t.group_type_id} value={t.group_type_id}>{t.type_name}</option>
                            ))}
                        </select>
                        {errors.group_type_id && <p className="text-xs text-red-400">{errors.group_type_id.message}</p>}
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-textMuted mb-1">Investee (Optional)</label>
                        <select
                            {...register('investee_id')}
                            className="w-full bg-surfaceHighlight/30 border border-surfaceHighlight rounded-lg px-3 py-2 text-text text-sm outline-none focus:border-primary"
                        >
                            <option value="">None</option>
                            {investees.map(i => (
                                <option key={i.investee_id} value={i.investee_id}>{i.investee_name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-textMuted">Start Date <span className="text-red-400">*</span></label>
                            <input type="date" {...register('start_date')} className="w-full bg-background border border-surfaceHighlight rounded-lg px-4 py-2.5 text-text focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
                            {errors.start_date && <p className="text-xs text-red-400">{errors.start_date.message}</p>}
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-textMuted">End Date</label>
                            <input type="date" {...register('end_date')} className="w-full bg-background border border-surfaceHighlight rounded-lg px-4 py-2.5 text-text focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
                            {errors.end_date && <p className="text-xs text-red-400">{errors.end_date.message}</p>}
                        </div>
                    </div>
                    <div className="pt-4 flex justify-end gap-3">
                        <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button type="submit">{currentGroup ? 'Update' : 'Create'}</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};
