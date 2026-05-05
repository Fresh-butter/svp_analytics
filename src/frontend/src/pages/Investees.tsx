import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, Button, Modal } from '../components/Common';
import { EntityFilters } from '../components/EntityFilters';
import { Investee } from '../types';
import { investeeFormSchema, InvesteeFormData } from '../schemas/formSchemas';
import { useAuth } from '../context/AuthContext';
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { matchesSearchMulti } from '../utils/search';
import { useCreateInvestee, useDeleteInvestee, useInvestees, useUpdateInvestee } from '../hooks/useInvestees';
import { SortIndicator } from '../components/SortIndicator';
import { matchesDateRange } from '../utils/dateFilters';
import { exportJsonToXlsx } from '../utils/exporters';

const PAGE_SIZE = 15;

export const InvesteesPage = () => {
    const { user } = useAuth();
    const isAdmin = user?.user_type === 'ADMIN';
    const navigate = useNavigate();
    const chapterId = user?.chapter_id || '';
    const { data: investees = [], isLoading } = useInvestees();
    const createInvesteeMutation = useCreateInvestee();
    const updateInvesteeMutation = useUpdateInvestee();
    const deleteInvesteeMutation = useDeleteInvestee();
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentInvestee, setCurrentInvestee] = useState<Partial<Investee> | null>(null);

    const [showFilters, setShowFilters] = useState(false);
    const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
    const [endDateFilter, setEndDateFilter] = useState({ start: '', end: '' });
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
    const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');

    const { register, handleSubmit, reset, formState: { errors } } = useForm<InvesteeFormData>({
        resolver: zodResolver(investeeFormSchema),
        defaultValues: { investee_name: '', email: '', start_date: new Date().toLocaleDateString('en-CA'), end_date: '' },
    });

    // Filter Logic
    const filtered = investees.filter(inv => {
        const searchMatch = matchesSearchMulti(searchTerm, inv.investee_name, inv.email);

        if (activeFilter === 'active' && !inv.is_active) return false;
        if (activeFilter === 'inactive' && inv.is_active) return false;

        // Start date range filter
        const matchesStartRange = matchesDateRange(inv.start_date, dateFilter);

        // End date range filter
        const matchesEndRange = matchesDateRange(inv.end_date || null, endDateFilter);

        return searchMatch && matchesStartRange && matchesEndRange;
    });

    // Sort Logic
    const filteredInvestees = sortConfig
        ? [...filtered].sort((a, b) => {
            const key = sortConfig.key as keyof Investee;
            const aVal = String(a[key] ?? '');
            const bVal = String(b[key] ?? '');
            const cmp = aVal.localeCompare(bVal);
            return sortConfig.direction === 'asc' ? cmp : -cmp;
        })
        : filtered;

    const handleSort = (key: string) => {
        setSortConfig(prev =>
            prev && prev.key === key
                ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
                : { key, direction: 'asc' }
        );
    };

    const handleExportExcel = async () => {
        const exportRows = filteredInvestees.map((inv) => ({
            'Investee Name': inv.investee_name,
            Email: inv.email,
            'Start Date': inv.start_date,
            'End Date': inv.end_date || '-',
            'Is Active': inv.is_active ? 'Yes' : 'No',
            'Created At': inv.created_at || '-',
            'Modified At': inv.modified_at || '-',
        }));

        await exportJsonToXlsx(exportRows, 'Investees', 'investees_export.xlsx');
    };

    const totalPages = Math.ceil(filteredInvestees.length / PAGE_SIZE);
    const paginated = filteredInvestees.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);


    const handleOpenAdd = () => {
        setCurrentInvestee(null);
        reset({ investee_name: '', email: '', start_date: new Date().toLocaleDateString('en-CA'), end_date: '' });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (inv: Investee) => {
        setCurrentInvestee(inv);
        reset({
            investee_name: inv.investee_name,
            email: inv.email,
            start_date: inv.start_date,
            end_date: inv.end_date || '',
        });
        setIsModalOpen(true);
    };

    const onFormSubmit = async (data: InvesteeFormData) => {
        try {
            if (currentInvestee?.investee_id) {
                await updateInvesteeMutation.mutateAsync({ id: currentInvestee.investee_id, data, chapterId });
            } else {
                await createInvesteeMutation.mutateAsync({ data, chapterId });
            }
            setIsModalOpen(false);
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : 'Failed to save investee');
        }
    };

    const handleDeleteInvestee = async (investee: Investee) => {
        const shouldTryDelete = window.confirm('This will delete only if the investee is not referenced. Do you want to continue?');
        if (!shouldTryDelete) return;

        try {
            await deleteInvesteeMutation.mutateAsync(investee.investee_id);
            return;
        } catch (err: unknown) {
            if (!investee.is_active) {
                alert(err instanceof Error ? err.message : 'Unable to delete investee.');
                return;
            }
        }

        const shouldSoftDelete = window.confirm('Investee could not be deleted because it is referenced. Do you want to soft delete by setting End Date to today?');
        if (!shouldSoftDelete) return;

        try {
            const today = new Date().toLocaleDateString('en-CA');
            await updateInvesteeMutation.mutateAsync({
                id: investee.investee_id,
                data: {
                    investee_name: investee.investee_name,
                    email: investee.email,
                    start_date: investee.start_date,
                    end_date: today,
                },
                chapterId,
            });
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : 'Failed to soft delete investee.');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-text">Investees</h2>
                    <p className="text-textMuted mt-1">
                        {isAdmin
                            ? 'Manage investees and their information.'
                            : 'Browse investees and view their details.'}
                    </p>
                </div>
                {isAdmin && <Button onClick={handleOpenAdd}><Plus size={20} /> Add Investee</Button>}
            </div>

            <Card className="bg-surface border-surfaceHighlight">
                <EntityFilters
                    searchTerm={searchTerm}
                    onSearchTermChange={(value) => { setSearchTerm(value); setPage(1); }}
                    searchPlaceholder="Search by name or email..."
                    showFilters={showFilters}
                    onToggleFilters={() => setShowFilters(!showFilters)}
                    onExport={handleExportExcel}
                    dateFilter={dateFilter}
                    onDateFilterChange={setDateFilter}
                    endDateFilter={endDateFilter}
                    onEndDateFilterChange={setEndDateFilter}
                    activeFilter={activeFilter}
                    onActiveFilterChange={setActiveFilter}
                />

                <div className="overflow-x-auto">
                    {isLoading ? (
                        <div className="p-12 text-center text-textMuted">Loading investees...</div>
                    ) : paginated.length === 0 ? (
                        <div className="p-12 text-center text-textMuted">No investees found.</div>
                    ) : (
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-surfaceHighlight bg-surfaceHighlight/20">
                                    <th
                                        className="px-4 py-4 text-xs font-semibold text-textMuted uppercase tracking-wider cursor-pointer hover:bg-surfaceHighlight/50"
                                        onClick={() => handleSort('investee_name')}
                                    >
                                        Name <SortIndicator sortConfig={sortConfig} column="investee_name" />
                                    </th>
                                    <th
                                        className="px-4 py-4 text-xs font-semibold text-textMuted uppercase tracking-wider cursor-pointer hover:bg-surfaceHighlight/50"
                                        onClick={() => handleSort('email')}
                                    >
                                        Email <SortIndicator sortConfig={sortConfig} column="email" />
                                    </th>
                                    <th
                                        className="px-4 py-4 text-xs font-semibold text-textMuted uppercase tracking-wider cursor-pointer hover:bg-surfaceHighlight/50"
                                        onClick={() => handleSort('start_date')}
                                    >
                                        Start Date <SortIndicator sortConfig={sortConfig} column="start_date" />
                                    </th>
                                    <th
                                        className="px-4 py-4 text-xs font-semibold text-textMuted uppercase tracking-wider cursor-pointer hover:bg-surfaceHighlight/50"
                                        onClick={() => handleSort('end_date')}
                                    >
                                        End Date <SortIndicator sortConfig={sortConfig} column="end_date" />
                                    </th>
                                    {isAdmin && <th className="px-4 py-4 text-xs font-semibold text-textMuted uppercase tracking-wider text-right">Actions</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-surfaceHighlight">
                                {paginated.map(inv => (
                                    <tr
                                        key={inv.investee_id}
                                        className="hover:bg-surfaceHighlight/30 transition-colors cursor-pointer"
                                        onClick={() => navigate(`/investees/${inv.investee_id}`)}
                                    >
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-xs font-bold text-white uppercase shrink-0">
                                                    {inv.investee_name.substring(0, 2)}
                                                </div>
                                                <span className="font-medium text-text">{inv.investee_name}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-sm text-textMuted">{inv.email}</td>
                                        <td className="px-4 py-4 text-sm text-textMuted">{new Date(inv.start_date + 'T00:00:00').toLocaleDateString()}</td>
                                        <td className="px-4 py-4 text-sm text-textMuted">{inv.end_date ? new Date(inv.end_date + 'T00:00:00').toLocaleDateString() : '-'}</td>
                                        {isAdmin && (
                                            <td className="px-4 py-4 text-right" onClick={e => e.stopPropagation()}>
                                                <button
                                                    onClick={() => handleOpenEdit(inv)}
                                                    className="p-1.5 text-textMuted hover:text-primary hover:bg-surfaceHighlight rounded-md transition-colors"
                                                    title="Edit"
                                                >
                                                    <Pencil size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteInvestee(inv)}
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
                        <span>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filteredInvestees.length}</span>
                        <div className="flex gap-1">
                            <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="p-1.5 rounded hover:bg-surfaceHighlight disabled:opacity-30"><ChevronLeft size={18} /></button>
                            <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="p-1.5 rounded hover:bg-surfaceHighlight disabled:opacity-30"><ChevronRight size={18} /></button>
                        </div>
                    </div>
                )}
            </Card>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={currentInvestee ? 'Edit Investee' : 'Add New Investee'}>
                <form className="space-y-4" onSubmit={handleSubmit(onFormSubmit)}>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-textMuted">Investee Name <span className="text-red-400">*</span></label>
                        <input {...register('investee_name')} className="w-full bg-background border border-surfaceHighlight rounded-lg px-4 py-2.5 text-text focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
                        {errors.investee_name && <p className="text-xs text-red-400">{errors.investee_name.message}</p>}
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-textMuted">Email <span className="text-red-400">*</span></label>
                        <input type="email" {...register('email')} className="w-full bg-background border border-surfaceHighlight rounded-lg px-4 py-2.5 text-text focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
                        {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
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
                        <Button type="submit">{currentInvestee ? 'Update' : 'Create'}</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};
