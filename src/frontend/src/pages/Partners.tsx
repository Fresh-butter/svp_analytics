import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { matchesSearchMulti } from '../utils/search';
import { Card, Modal, Button } from '../components/Common';
import { Partner } from '../types';
import { partnerFormSchema, PartnerFormData } from '../schemas/formSchemas';
import { Search, Filter, Download, Plus, Pencil, FileSpreadsheet, FileText } from 'lucide-react';
import { usePartners, useCreatePartner, useUpdatePartner } from '../hooks/usePartners';
import { useAuth } from '../context/AuthContext';
import { SortIndicator } from '../components/SortIndicator';
import { hasPartialRange, matchesDateRange } from '../utils/dateFilters';
import { exportJsonToXlsx, exportTableToPdf } from '../utils/exporters';

export const PartnersPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const chapterId = user?.chapter_id || '';
    const { data: partners = [], isLoading, isError } = usePartners();
    const createMutation = useCreatePartner();
    const updateMutation = useUpdatePartner();

    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentPartner, setCurrentPartner] = useState<Partial<Partner> | null>(null);
    const { register, handleSubmit, reset, formState: { errors } } = useForm<PartnerFormData>({
        resolver: zodResolver(partnerFormSchema),
        defaultValues: { partner_name: '', email: '', start_date: new Date().toLocaleDateString('en-CA'), end_date: '', primary_partner_id: '', linkedin_url: '' },
    });
    const [showFilters, setShowFilters] = useState(false);
    const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
    const [endDateFilter, setEndDateFilter] = useState({ start: '', end: '' });
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
    const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [showExportOptions, setShowExportOptions] = useState(false);

    const handleViewPartner = (partner: Partner) => {
        navigate(`/partners/${partner.partner_id}`);
    };

    // Filter Logic
    const filtered = partners.filter(p => {
        const searchMatch = matchesSearchMulti(searchTerm, p.partner_name, p.email, p.partner_id);

        // Active/Inactive filter
        if (activeFilter === 'active' && !p.is_active) return false;
        if (activeFilter === 'inactive' && p.is_active) return false;

        // Start date range filter - both from and to must be filled
        const matchesStartRange = matchesDateRange(p.start_date, dateFilter);

        // End date range filter
        const matchesEndRange = matchesDateRange(p.end_date || null, endDateFilter);

        return searchMatch && matchesStartRange && matchesEndRange;
    });

    // Sort Logic
    const filteredPartners = sortConfig
        ? [...filtered].sort((a, b) => {
            let aVal: string;
            let bVal: string;
            if (sortConfig.key === 'primary_partner_name') {
                aVal = partners.find(p => p.partner_id === a.primary_partner_id)?.partner_name ?? '';
                bVal = partners.find(p => p.partner_id === b.primary_partner_id)?.partner_name ?? '';
            } else {
                const key = sortConfig.key as keyof Partner;
                aVal = String(a[key] ?? '');
                bVal = String(b[key] ?? '');
            }
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

    // CRUD Handlers
    const handleOpenAdd = () => {
        setCurrentPartner(null);
        reset({ partner_name: '', email: '', start_date: new Date().toLocaleDateString('en-CA'), end_date: '', primary_partner_id: '', linkedin_url: '' });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (partner: Partner) => {
        setCurrentPartner(partner);
        reset({
            partner_name: partner.partner_name,
            email: partner.email,
            start_date: partner.start_date,
            primary_partner_id: partner.primary_partner_id || '',
            end_date: partner.end_date || '',
            linkedin_url: partner.linkedin_url || '',
        });
        setIsModalOpen(true);
    };

    const onFormSubmit = async (data: PartnerFormData) => {
        const saveData: Partial<Partner> = {
            partner_name: data.partner_name,
            email: data.email,
            start_date: data.start_date,
            end_date: data.end_date || undefined,
            primary_partner_id: data.primary_partner_id || undefined,
            linkedin_url: data.linkedin_url || undefined,
        };

        try {
            if (currentPartner?.partner_id) {
                await updateMutation.mutateAsync({ id: currentPartner.partner_id, data: saveData, chapterId });
            } else {
                await createMutation.mutateAsync({ data: saveData, chapterId });
            }
            setIsModalOpen(false);
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : 'Failed to save partner');
        }
    };





    const handleExportExcel = async () => {
        // Export without internal IDs. Show primary partner name instead of ID.
        await exportJsonToXlsx(filteredPartners.map(p => ({
            Name: p.partner_name,
            Email: p.email,
            'Start Date': p.start_date,
            'End Date': p.end_date || '-',
            'LinkedIn': p.linkedin_url || '-',
            'Primary Partner': partners.find(x => x.partner_id === p.primary_partner_id)?.partner_name || '-'
        })), 'Partners', 'partners_export.xlsx');
    };

    const handleExportPDF = async () => {
        await exportTableToPdf({
            title: 'Partners List',
            columns: ['Name', 'Email', 'Start Date', 'End Date'],
            rows: filteredPartners.map((p) => [
                p.partner_name,
                p.email,
                p.start_date,
                p.end_date || '-',
            ]),
            fileName: 'partners_export.pdf',
        });
    };


    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-text">Partners</h2>
                    <p className="text-textMuted mt-1">Manage chapter partners and their joining details.</p>
                </div>
                <Button onClick={handleOpenAdd}>
                    <Plus size={20} /> Add Partner
                </Button>
            </div>

            {/* Filters and Actions */}
            <Card className="bg-surface border-surfaceHighlight">
                <div className="p-4 border-b border-surfaceHighlight flex flex-col md:flex-row gap-4 justify-between">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-2.5 text-textMuted" size={18} />
                        <input
                            type="text"
                            placeholder="Search by name, email or ID..."
                            className="w-full bg-surfaceHighlight/30 border border-surfaceHighlight rounded-lg pl-10 pr-4 py-2 text-text outline-none focus:border-primary transition-colors"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2 items-center">
                        {/* Active/Inactive Toggle */}
                        <div className="flex rounded-lg border border-surfaceHighlight overflow-hidden text-sm">
                            {(['all', 'active', 'inactive'] as const).map(val => (
                                <button
                                    key={val}
                                    onClick={() => setActiveFilter(val)}
                                    className={`px-3 py-1.5 capitalize transition-colors ${activeFilter === val ? 'bg-primary text-white' : 'bg-surfaceHighlight/30 text-textMuted hover:bg-surfaceHighlight'}`}
                                >
                                    {val}
                                </button>
                            ))}
                        </div>
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
                                {hasPartialRange(dateFilter) && (
                                    <p className="text-xs text-amber-400 mt-1">Both From and To dates are required to filter</p>
                                )}
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
                                {hasPartialRange(endDateFilter) && (
                                    <p className="text-xs text-amber-400 mt-1">Both From and To dates are required to filter</p>
                                )}
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => { setDateFilter({ start: '', end: '' }); setEndDateFilter({ start: '', end: '' }); }}
                                className="text-xs text-primary hover:text-primary/80 transition-colors font-medium"
                            >
                                Clear Filters
                            </button>
                        </div>
                    </div>
                )}

                {/* Table */}
                <div className="overflow-x-auto">
                    {isLoading ? (
                        <div className="p-8 text-center text-textMuted">
                            <div className="animate-pulse space-y-3">
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className="h-12 bg-surfaceHighlight/30 rounded" />
                                ))}
                            </div>
                        </div>
                    ) : isError ? (
                        <div className="p-8 text-center text-red-400">Failed to load partners. Please try again.</div>
                    ) : filteredPartners.length === 0 ? (
                        <div className="p-8 text-center text-textMuted">No partners found.</div>
                    ) : (
                        <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-surfaceHighlight bg-surfaceHighlight/20">
                                <th onClick={() => handleSort('partner_name')} className="px-4 py-4 text-xs font-semibold text-textMuted uppercase tracking-wider cursor-pointer hover:text-text select-none">Partner Name <SortIndicator sortConfig={sortConfig} column="partner_name" /></th>
                                <th onClick={() => handleSort('email')} className="px-4 py-4 text-xs font-semibold text-textMuted uppercase tracking-wider cursor-pointer hover:text-text select-none">Email <SortIndicator sortConfig={sortConfig} column="email" /></th>
                                <th onClick={() => handleSort('start_date')} className="px-4 py-4 text-xs font-semibold text-textMuted uppercase tracking-wider cursor-pointer hover:text-text select-none">Start Date <SortIndicator sortConfig={sortConfig} column="start_date" /></th>
                                <th onClick={() => handleSort('end_date')} className="px-4 py-4 text-xs font-semibold text-textMuted uppercase tracking-wider cursor-pointer hover:text-text select-none">End Date <SortIndicator sortConfig={sortConfig} column="end_date" /></th>
                                <th onClick={() => handleSort('primary_partner_name')} className="px-4 py-4 text-xs font-semibold text-textMuted uppercase tracking-wider cursor-pointer hover:text-text select-none">Primary Partner <SortIndicator sortConfig={sortConfig} column="primary_partner_name" /></th>
                                <th className="px-4 py-4 text-xs font-semibold text-textMuted uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-surfaceHighlight">
                            {filteredPartners.map((partner) => {
                                return (
                                    <tr key={partner.partner_id} className="hover:bg-surfaceHighlight/30 transition-colors group cursor-pointer" onClick={() => handleViewPartner(partner)}>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-500 flex items-center justify-center text-xs font-bold text-white uppercase shrink-0">
                                                    {partner.partner_name.substring(0, 2)}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-text">{partner.partner_name}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-sm text-textMuted">
                                            {partner.email}
                                        </td>
                                        <td className="px-4 py-4 text-sm text-textMuted whitespace-nowrap">
                                            {new Date(partner.start_date + 'T00:00:00').toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-4 text-sm text-textMuted whitespace-nowrap">
                                            {partner.end_date ? new Date(partner.end_date + 'T00:00:00').toLocaleDateString() : '-'}
                                        </td>
                                        <td className="px-4 py-4 text-sm text-textMuted">
                                            {partners.find(p => p.partner_id === partner.primary_partner_id)?.partner_name || '-'}
                                        </td>
                                        <td className="px-4 py-4 text-right" onClick={e => e.stopPropagation()}>
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleOpenEdit(partner)}
                                                    className="p-1.5 text-textMuted hover:text-primary hover:bg-surfaceHighlight rounded-md transition-colors"
                                                    title="Edit Partner"
                                                >
                                                    <Pencil size={16} />
                                                </button>

                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        </table>
                    )}
                </div>
            </Card>

    <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={currentPartner ? "Edit Partner" : "Add New Partner"}
    >
        <form className="space-y-4" onSubmit={handleSubmit(onFormSubmit)}>
            <div className="space-y-1.5">
                <label className="text-sm font-medium text-textMuted">Partner Name <span className="text-red-400">*</span></label>
                <input
                    {...register('partner_name')}
                    className="w-full bg-background border border-surfaceHighlight rounded-lg px-4 py-2.5 text-text focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                />
                {errors.partner_name && <p className="text-xs text-red-400">{errors.partner_name.message}</p>}
            </div>
            <div className="space-y-1.5">
                <label className="text-sm font-medium text-textMuted">Email Address <span className="text-red-400">*</span></label>
                <input
                    type="email"
                    {...register('email')}
                    placeholder="name@example.com"
                    className="w-full bg-background border border-surfaceHighlight rounded-lg px-4 py-2.5 text-text focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                />
                {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label className="text-sm font-medium text-textMuted">Start Date <span className="text-red-400">*</span></label>
                    <input
                        type="date"
                        {...register('start_date')}
                        className="w-full bg-background border border-surfaceHighlight rounded-lg px-4 py-2.5 text-text focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                    />
                    {errors.start_date && <p className="text-xs text-red-400">{errors.start_date.message}</p>}
                </div>
                <div className="space-y-1.5">
                    <label className="text-sm font-medium text-textMuted">End Date</label>
                    <input
                        type="date"
                        {...register('end_date')}
                        className="w-full bg-background border border-surfaceHighlight rounded-lg px-4 py-2.5 text-text focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                    />
                </div>
            </div>
            <div className="space-y-1.5">
                <label className="text-sm font-medium text-textMuted">LinkedIn URL <span className="text-textMuted/60">(Optional)</span></label>
                <input
                    {...register('linkedin_url')}
                    placeholder="https://linkedin.com/in/..."
                    className="w-full bg-background border border-surfaceHighlight rounded-lg px-4 py-2.5 text-text focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                />
            </div>
            <div>
                <label className="block text-xs font-medium text-textMuted mb-1">Primary Partner <span className="text-textMuted/60">(Optional)</span></label>
                <select
                    {...register('primary_partner_id')}
                    className="w-full bg-surfaceHighlight/30 border border-surfaceHighlight rounded-lg px-3 py-2 text-text text-sm outline-none focus:border-primary"
                >
                    <option value="">— None —</option>
                    {partners
                        .filter(p => p.partner_id !== (currentPartner as Partner | null)?.partner_id)
                        .map(p => (
                            <option key={p.partner_id} value={p.partner_id}>{p.partner_name}</option>
                        ))
                    }
                </select>
            </div>

            <div className="pt-4 flex justify-end gap-3">
                <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit">{currentPartner ? 'Update Partner' : 'Create Partner'}</Button>
            </div>
        </form>
    </Modal>
        </div >
    );
};
