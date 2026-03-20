import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, Button, Modal } from '../components/Common';
import { Group } from '../types';
import { groupFormSchema, GroupFormData } from '../schemas/formSchemas';
import { lookupService } from '../services/lookupService';
import { useAuth } from '../context/AuthContext';
import { Search, Plus, Download, Filter, Pencil, ChevronLeft, ChevronRight } from 'lucide-react';
import { matchesSearchMulti } from '../utils/search';
import { useQuery } from '@tanstack/react-query';
import { useCreateGroup, useGroups, useUpdateGroup } from '../hooks/useGroups';
import { useInvestees } from '../hooks/useInvestees';
import { SortIndicator } from '../components/SortIndicator';
import { matchesDateRange } from '../utils/dateFilters';
import { exportJsonToXlsx, exportTableToPdf } from '../utils/exporters';

const PAGE_SIZE = 15;

export const GroupsPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const chapterId = user?.chapter_id || '';
    const { data: groups = [] } = useGroups();
    const { data: investees = [] } = useInvestees();
    const { data: groupTypes = [], isLoading: groupTypesLoading } = useQuery({
        queryKey: ['group-types'],
        queryFn: () => lookupService.listGroupTypes(),
    });
    const createGroupMutation = useCreateGroup();
    const updateGroupMutation = useUpdateGroup();
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentGroup, setCurrentGroup] = useState<Partial<Group> | null>(null);
    const [showFilters, setShowFilters] = useState(false);
    const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
    const [endDateFilter, setEndDateFilter] = useState({ start: '', end: '' });
    const [showExportOptions, setShowExportOptions] = useState(false);
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
    const { register, handleSubmit, reset, formState: { errors } } = useForm<GroupFormData>({
        resolver: zodResolver(groupFormSchema),
        defaultValues: { group_name: '', group_type_id: '', start_date: new Date().toLocaleDateString('en-CA'), end_date: '', investee_id: '' },
    });

    const loading = groupTypesLoading;

    const getGroupTypeName = (id?: string | null) => {
        if (!id) return '-';
        return groupTypes.find(t => t.group_type_id === id)?.type_name || '-';
    };

    // Filter Logic
    const filtered = groups.filter(g => {
        const searchMatch = matchesSearchMulti(searchTerm, g.group_name, getGroupTypeName(g.group_type_id));

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
        const exportData = filteredGroups.map(g => ({
            'Group Name': g.group_name,
            'Type': getGroupTypeName(g.group_type_id),
            'Start Date': new Date(g.start_date).toLocaleDateString(),
            'End Date': g.end_date ? new Date(g.end_date).toLocaleDateString() : 'N/A'
        }));

        await exportJsonToXlsx(exportData, 'Groups', `groups_${new Date().toISOString().split('T')[0]}.xlsx`);
        setShowExportOptions(false);
    };

    const handleExportPDF = async () => {
        await exportTableToPdf({
            title: 'Groups Report',
            columns: ['Group Name', 'Type', 'Start Date', 'End Date'],
            rows: filteredGroups.map((g) => [
                g.group_name,
                getGroupTypeName(g.group_type_id),
                new Date(g.start_date).toLocaleDateString(),
                g.end_date ? new Date(g.end_date).toLocaleDateString() : 'N/A',
            ]),
            fileName: `groups_${new Date().toISOString().split('T')[0]}.pdf`,
            generatedOn: new Date().toLocaleDateString(),
            headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        });
        setShowExportOptions(false);
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

    return (
    <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h2 className="text-3xl font-bold text-text">Groups</h2>
                <p className="text-textMuted mt-1">Manage groups and their members.</p>
            </div>
            <Button onClick={handleOpenAdd}><Plus size={20} /> Add Group</Button>
        </div>

        <Card className="bg-surface border-surfaceHighlight">
            <div className="p-4 border-b border-surfaceHighlight flex flex-col md:flex-row gap-4 justify-between">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-2.5 text-textMuted" size={18} />
                    <input
                        type="text"
                        placeholder="Search by name or type..."
                        className="w-full bg-surfaceHighlight/30 border border-surfaceHighlight rounded-lg pl-10 pr-4 py-2 text-text outline-none focus:border-primary transition-colors"
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                    />
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors border rounded-lg ${showFilters ? 'bg-surfaceHighlight text-text border-primary' : 'bg-surfaceHighlight/30 text-text border-surfaceHighlight hover:bg-surfaceHighlight'}`}
                    >
                        <Filter size={16} />
                        Filter
                    </button>
                    <div className="relative">
                        <button
                            onClick={() => setShowExportOptions(!showExportOptions)}
                            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors border rounded-lg ${showExportOptions ? 'bg-surfaceHighlight text-text border-primary' : 'bg-surfaceHighlight/30 text-text border-surfaceHighlight hover:bg-surfaceHighlight'}`}
                        >
                            <Download size={16} />
                            Export
                        </button>
                        {showExportOptions && (
                            <div className="absolute right-0 mt-2 w-48 bg-surface border border-surfaceHighlight rounded-lg shadow-lg z-10 py-1">
                                <button
                                    onClick={handleExportExcel}
                                    className="w-full text-left px-4 py-2 text-sm text-text hover:bg-surfaceHighlight transition-colors"
                                >
                                    Export as Excel
                                </button>
                                <button
                                    onClick={handleExportPDF}
                                    className="w-full text-left px-4 py-2 text-sm text-text hover:bg-surfaceHighlight transition-colors"
                                >
                                    Export as PDF
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {showFilters && (
                <div className="p-4 border-b border-surfaceHighlight bg-surfaceHighlight/5">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-semibold text-text">Advanced Filters</h3>
                        <button
                            onClick={() => {
                                setSearchTerm('');
                                setDateFilter({ start: '', end: '' });
                                setEndDateFilter({ start: '', end: '' });
                            }}
                            className="text-xs text-primary hover:text-primary/80 transition-colors"
                        >
                            Clear All
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-textMuted uppercase">Start Date Range</label>
                            <div className="flex gap-2">
                                <input
                                    type="date"
                                    value={dateFilter.start}
                                    onChange={(e) => setDateFilter(prev => ({ ...prev, start: e.target.value }))}
                                    className="w-full px-3 py-2 bg-surface border border-surfaceHighlight rounded-lg text-sm text-text focus:border-primary outline-none transition-colors"
                                />
                                <span className="text-textMuted self-center">to</span>
                                <input
                                    type="date"
                                    value={dateFilter.end}
                                    onChange={(e) => setDateFilter(prev => ({ ...prev, end: e.target.value }))}
                                    className="w-full px-3 py-2 bg-surface border border-surfaceHighlight rounded-lg text-sm text-text focus:border-primary outline-none transition-colors"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-textMuted uppercase">End Date Range</label>
                            <div className="flex gap-2">
                                <input
                                    type="date"
                                    value={endDateFilter.start}
                                    onChange={(e) => setEndDateFilter(prev => ({ ...prev, start: e.target.value }))}
                                    className="w-full px-3 py-2 bg-surface border border-surfaceHighlight rounded-lg text-sm text-text focus:border-primary outline-none transition-colors"
                                />
                                <span className="text-textMuted self-center">to</span>
                                <input
                                    type="date"
                                    value={endDateFilter.end}
                                    onChange={(e) => setEndDateFilter(prev => ({ ...prev, end: e.target.value }))}
                                    className="w-full px-3 py-2 bg-surface border border-surfaceHighlight rounded-lg text-sm text-text focus:border-primary outline-none transition-colors"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
                                <th className="px-4 py-4 text-xs font-semibold text-textMuted uppercase tracking-wider text-right">Actions</th>
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
                                    <td className="px-4 py-4 text-right" onClick={e => e.stopPropagation()}>
                                        <button
                                            onClick={() => handleOpenEdit(g)}
                                            className="p-1.5 text-textMuted hover:text-primary hover:bg-surfaceHighlight rounded-md transition-colors"
                                            title="Edit"
                                        >
                                            <Pencil size={16} />
                                        </button>
                                    </td>
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
