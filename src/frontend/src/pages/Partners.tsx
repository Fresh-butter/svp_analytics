import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { matchesSearchMulti } from '../utils/search';
import { Card, Modal, Button } from '../components/Common';
import { EntityFilters } from '../components/EntityFilters';
import { Partner } from '../types';
import { partnerFormSchema, PartnerFormData } from '../schemas/formSchemas';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { usePartners, useCreatePartner, useUpdatePartner, useDeletePartner } from '../hooks/usePartners';
import { useAuth } from '../context/AuthContext';
import { SortIndicator } from '../components/SortIndicator';
import { matchesDateRange } from '../utils/dateFilters';
import { exportJsonToXlsx } from '../utils/exporters';

export const PartnersPage = () => {
    const { user } = useAuth();
    const isAdmin = user?.user_type === 'ADMIN';
    const navigate = useNavigate();
    const chapterId = user?.chapter_id || '';
    const { data: partners = [], isLoading, isError } = usePartners();
    const createMutation = useCreatePartner();
    const updateMutation = useUpdatePartner();
    const deleteMutation = useDeletePartner();

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

    const hasSubPartners = currentPartner?.partner_id
        ? partners.some(p => p.primary_partner_id === currentPartner.partner_id)
        : false;

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

    const handleDeletePartner = async (partner: Partner) => {
        const shouldTryDelete = window.confirm('This will delete only if the partner is not referenced. Do you want to continue?');
        if (!shouldTryDelete) return;

        try {
            await deleteMutation.mutateAsync(partner.partner_id);
            return;
        } catch (err: unknown) {
            if (!partner.is_active) {
                alert(err instanceof Error ? err.message : 'Unable to delete partner.');
                return;
            }
        }

        const shouldSoftDelete = window.confirm('Partner could not be deleted because it is referenced. Do you want to soft delete by setting End Date to today?');
        if (!shouldSoftDelete) return;

        try {
            const today = new Date().toLocaleDateString('en-CA');
            await updateMutation.mutateAsync({
                id: partner.partner_id,
                data: {
                    partner_name: partner.partner_name,
                    email: partner.email,
                    start_date: partner.start_date,
                    end_date: today,
                    primary_partner_id: partner.primary_partner_id || undefined,
                    linkedin_url: partner.linkedin_url || undefined,
                },
                chapterId,
            });
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : 'Failed to soft delete partner.');
        }
    };





    const handleExportExcel = async () => {
        const exportRows = filteredPartners.map((p) => {
            const primaryPartner = partners.find((x) => x.partner_id === p.primary_partner_id);

            return {
                'Partner Name': p.partner_name,
                Email: p.email,
                'LinkedIn URL': p.linkedin_url || '-',
                'Primary Partner Name': primaryPartner?.partner_name || '-',
                'Start Date': p.start_date,
                'End Date': p.end_date || '-',
                'Is Active': p.is_active ? 'Yes' : 'No',
                'Created At': p.created_at || '-',
                'Modified At': p.modified_at || '-',
            };
        });

        await exportJsonToXlsx(exportRows, 'Partners', 'partners_export.xlsx');
    };


    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-text">Partners</h2>
                    <p className="text-textMuted mt-1">
                        {isAdmin
                            ? 'Manage chapter partners and their joining details.'
                            : 'Browse chapter partners and view their details.'}
                    </p>
                </div>
                {isAdmin && (
                    <Button onClick={handleOpenAdd}>
                        <Plus size={20} /> Add Partner
                    </Button>
                )}
            </div>

            {/* Filters and Actions */}
            <Card className="bg-surface border-surfaceHighlight">
                <EntityFilters
                    searchTerm={searchTerm}
                    onSearchTermChange={setSearchTerm}
                    searchPlaceholder="Search by name, email or ID..."
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
                />

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
                                    {isAdmin && <th className="px-4 py-4 text-xs font-semibold text-textMuted uppercase tracking-wider text-right">Actions</th>}
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
                                            {isAdmin && (
                                                <td className="px-4 py-4 text-right" onClick={e => e.stopPropagation()}>
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => handleOpenEdit(partner)}
                                                            className="p-1.5 text-textMuted hover:text-primary hover:bg-surfaceHighlight rounded-md transition-colors"
                                                            title="Edit Partner"
                                                        >
                                                            <Pencil size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeletePartner(partner)}
                                                            className="p-1.5 text-textMuted hover:text-red-400 hover:bg-surfaceHighlight rounded-md transition-colors"
                                                            title="Delete Partner"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>

                                                    </div>
                                                </td>
                                            )}
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
                            {errors.end_date && <p className="text-xs text-red-400">{errors.end_date.message}</p>}
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
                            disabled={hasSubPartners}
                            className="w-full bg-surfaceHighlight/30 border border-surfaceHighlight rounded-lg px-3 py-2 text-text text-sm outline-none focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <option value="">— None —</option>
                            {partners
                                .filter(p => p.partner_id !== (currentPartner as Partner | null)?.partner_id && !p.primary_partner_id)
                                .map(p => (
                                    <option key={p.partner_id} value={p.partner_id}>{p.partner_name}</option>
                                ))
                            }
                        </select>
                        {hasSubPartners && (
                            <p className="text-xs text-amber-500 mt-1">This partner cannot be assigned a Primary Partner because they are already a Primary Partner to others.</p>
                        )}
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
