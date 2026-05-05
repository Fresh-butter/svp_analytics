import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button } from '../components/Common';
import { RecurringAppointment, AppointmentType } from '../types';
import { RecurringAppointmentModal } from '../components/CreateRecurringModal';
import { RecurringFormState } from '../hooks/useAppointmentForm';
import { useRecurringAppointments, useCreateRecurringAppointment, useUpdateRecurringAppointment, useDeleteRecurringAppointment } from '../hooks/useRecurringAppointments';
import { rruleToHuman } from '../mappers';
import { useAuth } from '../context/AuthContext';
import { lookupService } from '../services/lookupService';
import { recurringAppointmentService } from '../services/recurringAppointmentService';
import { useInvestees } from '../hooks/useInvestees';
import { useGroups } from '../hooks/useGroups';
import { usePartners } from '../hooks/usePartners';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { formatDate, formatTime, formatTimeInput } from '../utils/formatters';
import { buildRRuleFromUiState, parseRecurrenceUiStateFromLegacy, parseRRuleToUiState } from '../utils/recurrence';

export const RecurringAppointmentsPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const chapterId = user?.chapter_id || '';

    // Data
    const { data: templates = [], isLoading } = useRecurringAppointments();

    // Mutations
    const createRecurring = useCreateRecurringAppointment();
    const updateRecurring = useUpdateRecurringAppointment();
    const deleteRecurring = useDeleteRecurringAppointment();

    // Modal state
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingData, setEditingData] = useState<Partial<RecurringFormState> | null>(null);
    const [editingSelectedPartnerIds, setEditingSelectedPartnerIds] = useState<string[]>([]);

    const { data: appointmentTypes = [] } = useQuery<AppointmentType[]>({
        queryKey: ['appointment-types'],
        queryFn: () => lookupService.listAppointmentTypes(),
    });
    const { data: investees = [] } = useInvestees();
    const { data: groups = [] } = useGroups();
    const { data: partners = [] } = usePartners();
    const allInvestees = investees.map((i) => ({ investee_id: i.investee_id, investee_name: i.investee_name }));
    const allGroups = groups.map((g) => ({
        group_id: g.group_id,
        group_name: g.group_name,
        investee_id: g.investee_id || undefined,
    }));
    const allPartners = partners.map((p) => ({ partner_id: p.partner_id, partner_name: p.partner_name, email: p.email }));

    const getTypeName = (id?: string | null, name?: string | null) => name || appointmentTypes.find(t => t.appointment_type_id === id)?.type_name || '-';

    const getEndTime = (startTime?: string | null, durationMinutes?: number | null) => {
        if (!startTime) return '-';
        const [sh, sm] = startTime.split(':').map(Number);
        if (Number.isNaN(sh) || Number.isNaN(sm)) return '-';
        const total = (sh * 60) + sm + Math.max(0, durationMinutes || 0);
        const endH = Math.floor(total / 60) % 24;
        const endM = total % 60;
        return formatTime(`${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}:00`);
    };

    const openCreateModal = async () => {
        setEditingId(null);
        setEditingData(null);
        setEditingSelectedPartnerIds([]);
        setShowCreateModal(true);
    };

    const openEditModal = async (tmpl: RecurringAppointment) => {
            try {
                const detail = await recurringAppointmentService.get(tmpl.rec_appointment_id);
                const recurrenceUi = parseRRuleToUiState(detail.rrule);

                // Calculate end time from start_time + duration
                let endTime = '11:00';
                if (detail.start_time && detail.duration_minutes) {
                    const [sh, sm] = detail.start_time.split(':').map(Number);
                    const totalMin = sh * 60 + sm + detail.duration_minutes;
                    const endH = Math.floor(totalMin / 60) % 24;
                    const endM = totalMin % 60;
                    endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
                }

                const editData: Partial<RecurringFormState> = {
                    rec_app_id: detail.rec_appointment_id || undefined,
                    meeting_type: (detail.appointment_type_id || undefined) as string | undefined,
                    rec_app_start_date: (detail.start_date || undefined) as string | undefined,
                    rec_app_end_date: (detail.end_date || undefined) as string | undefined,
                    frequency: recurrenceUi.frequency,
                    frequency_json: JSON.stringify({
                        day_of_week: recurrenceUi.dayOfWeek,
                        nth_occurrence: recurrenceUi.nthOccurrence,
                        biweekly_pattern: recurrenceUi.biweeklyPattern,
                    }),
                    planned_start: formatTimeInput(detail.start_time),
                    planned_end: endTime,
                    group_id: (detail.group_id || undefined) as string | undefined,
                    investee_id: (detail.investee_id || undefined) as string | undefined,
                };

                setEditingData(editData);
                setEditingSelectedPartnerIds((detail.partners || []).map((p) => p.partner_id));
                setEditingId(tmpl.rec_appointment_id);
                setShowCreateModal(true);
            } catch (err: unknown) {
                alert(err instanceof Error ? err.message : 'Failed to load recurring template details');
            }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this recurring appointment template?')) return;
        try {
            await deleteRecurring.mutateAsync(id);
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : 'Failed to delete');
        }
    };

    const handleModalSubmit = async (formData: RecurringFormState, selectedPartnerIds: string[] = []) => {
        try {
            // Calculate duration from start/end times using simple arithmetic
            const startTime = `${formData.planned_start}:00`;
            const [sh, sm] = (formData.planned_start || '09:00').split(':').map(Number);
            const [eh, em] = (formData.planned_end || '10:00').split(':').map(Number);
            const durationMinutes = Math.max(15, (eh * 60 + em) - (sh * 60 + sm));

            const recurrenceUi = parseRecurrenceUiStateFromLegacy(formData.frequency, formData.frequency_json);
            const rruleString = buildRRuleFromUiState(recurrenceUi);

            const payload: Partial<RecurringAppointment> = {
                appointment_name: formData.appointment_name || undefined,
                appointment_type_id: formData.appointment_type_id || formData.meeting_type,
                start_time: startTime,
                duration_minutes: durationMinutes,
                rrule: rruleString,
                start_date: formData.rec_app_start_date,
                end_date: formData.rec_app_end_date,
                group_id: formData.group_id || undefined,
                investee_id: formData.investee_id || undefined,
            };

            const partnerIdsForSubmit = selectedPartnerIds;

            if (editingId) {
                await updateRecurring.mutateAsync({
                    ...payload,
                    rec_appointment_id: editingId,
                    chapter_id: chapterId,
                    partnerIds: partnerIdsForSubmit,
                });
            } else {
                await createRecurring.mutateAsync({
                    ...payload,
                    chapter_id: chapterId,
                    partnerIds: partnerIdsForSubmit,
                });
            }
            setShowCreateModal(false);
            setEditingId(null);
            setEditingData(null);
            setEditingSelectedPartnerIds([]);
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : 'Failed to save');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-text">Recurring Appointments</h2>
                    <p className="text-textMuted mt-1">Manage recurring appointment templates.</p>
                </div>
                <Button onClick={openCreateModal}><Plus size={20} /> New Template</Button>
            </div>

            <Card className="bg-surface border-surfaceHighlight">
                <div className="overflow-x-auto">
                    {isLoading ? (
                        <div className="p-12 text-center text-textMuted">Loading templates...</div>
                    ) : templates.length === 0 ? (
                        <div className="p-12 text-center text-textMuted">No recurring appointment templates found.</div>
                    ) : (
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-surfaceHighlight bg-surfaceHighlight/20">
                                    <th className="px-4 py-4 text-xs font-semibold text-textMuted uppercase tracking-wider">Name / Type</th>
                                    <th className="px-4 py-4 text-xs font-semibold text-textMuted uppercase tracking-wider">Pattern</th>
                                    <th className="px-4 py-4 text-xs font-semibold text-textMuted uppercase tracking-wider">Start Time</th>
                                    <th className="px-4 py-4 text-xs font-semibold text-textMuted uppercase tracking-wider">End Time</th>
                                    <th className="px-4 py-4 text-xs font-semibold text-textMuted uppercase tracking-wider">Date Range</th>
                                    <th className="px-4 py-4 text-xs font-semibold text-textMuted uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-surfaceHighlight">
                                {templates.map(t => (
                                    <tr
                                        key={t.rec_appointment_id}
                                        className="hover:bg-surfaceHighlight/30 transition-colors cursor-pointer"
                                        onClick={() => navigate(`/recurring-appointments/${t.rec_appointment_id}`)}
                                    >
                                        <td className="px-4 py-4 text-sm font-medium text-text">{getTypeName(t.appointment_type_id, t.appointment_name)}</td>
                                        <td className="px-4 py-4 text-sm text-textMuted">{rruleToHuman(t.rrule)}</td>
                                        <td className="px-4 py-4 text-sm text-textMuted">{formatTime(t.start_time)}</td>
                                        <td className="px-4 py-4 text-sm text-textMuted">{getEndTime(t.start_time, t.duration_minutes)}</td>
                                        <td className="px-4 py-4 text-sm text-textMuted">{formatDate(t.start_date)} — {formatDate(t.end_date)}</td>
                                        <td className="px-4 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        openEditModal(t);
                                                    }}
                                                    className="p-1.5 text-textMuted hover:text-primary hover:bg-surfaceHighlight rounded-md transition-colors"
                                                    title="Edit"
                                                >
                                                    <Pencil size={16} />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDelete(t.rec_appointment_id);
                                                    }}
                                                    className="p-1.5 text-textMuted hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </Card>

            {/* Create/Edit Modal */}
            <RecurringAppointmentModal
                isOpen={showCreateModal}
                onClose={() => {
                    setShowCreateModal(false);
                    setEditingId(null);
                    setEditingData(null);
                    setEditingSelectedPartnerIds([]);
                }}
                onSubmit={handleModalSubmit}
                groups={allGroups}
                investees={allInvestees}
                allPartners={allPartners}
                appointmentTypes={appointmentTypes}
                initialData={editingData ?? undefined}
                initialSelectedPartnerIds={editingSelectedPartnerIds}
                isEditing={!!editingId}
            />
        </div>
    );
};
