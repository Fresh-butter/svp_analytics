import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, Button, Modal } from '../components/Common';
import { Investee } from '../types';
import { investeeFormSchema, InvesteeFormData } from '../schemas/formSchemas';
import { useAuth } from '../context/AuthContext';
import { Search, Filter, Download, Plus, Pencil, FileSpreadsheet, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { matchesSearchMulti } from '../utils/search';
import { useCreateInvestee, useInvestees, useUpdateInvestee } from '../hooks/useInvestees';
import { SortIndicator } from '../components/SortIndicator';
import { matchesDateRange } from '../utils/dateFilters';
import { exportJsonToXlsx, exportTableToPdf } from '../utils/exporters';

const PAGE_SIZE = 15;

export const InvesteesPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const chapterId = user?.chapter_id || '';
    const { data: investees = [], isLoading } = useInvestees();
    const createInvesteeMutation = useCreateInvestee();
    const updateInvesteeMutation = useUpdateInvestee();
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentInvestee, setCurrentInvestee] = useState<Partial<Investee> | null>(null);

    const [showFilters, setShowFilters] = useState(false);
    const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
    const [endDateFilter, setEndDateFilter] = useState({ start: '', end: '' });
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
    const [showExportOptions, setShowExportOptions] = useState(false);

    const { register, handleSubmit, reset, formState: { errors } } = useForm<InvesteeFormData>({
        resolver: zodResolver(investeeFormSchema),
        defaultValues: { investee_name: '', email: '', start_date: new Date().toLocaleDateString('en-CA'), end_date: '' },
    });

    // Filter Logic
    const filtered = investees.filter(inv => {
        const searchMatch = matchesSearchMulti(searchTerm, inv.investee_name, inv.email);

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
        await exportJsonToXlsx(filteredInvestees.map(inv => ({
            ID: inv.investee_id,
            Name: inv.investee_name,
            Email: inv.email,
            'Start Date': inv.start_date,
            'End Date': inv.end_date || '-',
            'Status': inv.is_active ? 'Active' : 'Inactive'
        })), 'Investees', 'investees_export.xlsx');
    };

    const handleExportPDF = async () => {
        await exportTableToPdf({
            title: 'Investees List',
            columns: ['ID', 'Name', 'Email', 'Start Date', 'End Date'],
            rows: filteredInvestees.map((inv) => [
                inv.investee_id,
                inv.investee_name,
                inv.email,
                inv.start_date,
                inv.end_date || '-',
            ]),
            fileName: 'investees_export.pdf',
        });
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

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-text">Investees</h2>
                    <p className="text-textMuted mt-1">Manage investees and their information.</p>
                </div>
                <Button onClick={handleOpenAdd}><Plus size={20} /> Add Investee</Button>
            </div>

            <Card className="bg-surface border-surfaceHighlight">
                <div className="p-4 border-b border-surfaceHighlight flex flex-col md:flex-row gap-4 justify-between">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-2.5 text-textMuted" size={18} />
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            className="w-full bg-surfaceHighlight/30 border border-surfaceHighlight rounded-lg pl-10 pr-4 py-2 text-text outline-none focus:border-primary transition-colors"
                            value={searchTerm}
                            onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
                        />
                    </div>
                    <div className="flex gap-2 relative">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors border rounded-lg ${showFilters ? 'bg-surfaceHighlight text-text border-primary' : 'bg-surfaceHighlight/30 text-text border-surfaceHighlight hover:bg-surfaceHighlight'}`}
                        >
                            <Filter size={16} />
                            Filters
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
                                        onClick={() => { handleExportExcel(); setShowExportOptions(false); }}
                                        className="w-full text-left px-4 py-2 text-sm text-text hover:bg-surfaceHighlight flex items-center gap-2"
                                    >
                                        <FileSpreadsheet size={16} className="text-green-500" />
                                        Export as Excel
                                    </button>
                                    <button
                                        onClick={() => { handleExportPDF(); setShowExportOptions(false); }}
                                        className="w-full text-left px-4 py-2 text-sm text-text hover:bg-surfaceHighlight flex items-center gap-2"
                                    >
                                        <FileText size={16} className="text-red-500" />
                                        Export as PDF
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {showFilters && (
                    <div className="p-4 border-b border-surfaceHighlight bg-surfaceHighlight/10 flex flex-col gap-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-textMuted mb-1">Start Date From</label>
                                <input
                                    type="date"
                                    className="w-full bg-surfaceHighlight/30 border border-surfaceHighlight rounded-lg px-3 py-2 text-text text-sm outline-none focus:border-primary"
                                    value={dateFilter.start}
                                    onChange={(e) => setDateFilter({ ...dateFilter, start: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-textMuted mb-1">Start Date To</label>
                                <input
                                    type="date"
                                    className="w-full bg-surfaceHighlight/30 border border-surfaceHighlight rounded-lg px-3 py-2 text-text text-sm outline-none focus:border-primary"
                                    value={dateFilter.end}
                                    onChange={(e) => setDateFilter({ ...dateFilter, end: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-textMuted mb-1">End Date From</label>
                                <input
                                    type="date"
                                    className="w-full bg-surfaceHighlight/30 border border-surfaceHighlight rounded-lg px-3 py-2 text-text text-sm outline-none focus:border-primary"
                                    value={endDateFilter.start}
                                    onChange={(e) => setEndDateFilter({ ...endDateFilter, start: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-textMuted mb-1">End Date To</label>
                                <input
                                    type="date"
                                    className="w-full bg-surfaceHighlight/30 border border-surfaceHighlight rounded-lg px-3 py-2 text-text text-sm outline-none focus:border-primary"
                                    value={endDateFilter.end}
                                    onChange={(e) => setEndDateFilter({ ...endDateFilter, end: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <button
                                onClick={() => {
                                    setDateFilter({ start: '', end: '' });
                                    setEndDateFilter({ start: '', end: '' });
                                }}
                                className="text-sm text-textMuted hover:text-text transition-colors"
                            >
                                Clear Filters
                            </button>
                        </div>
                    </div>
                )}

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
                                    <th className="px-4 py-4 text-xs font-semibold text-textMuted uppercase tracking-wider text-right">Actions</th>
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
                                        <td className="px-4 py-4 text-right" onClick={e => e.stopPropagation()}>
                                            <button
                                                onClick={() => handleOpenEdit(inv)}
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
