import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button } from '../components/Common';
import { CreateAppointmentModal } from '../components/CreateAppointmentModal';
import { GroupSelectorModal } from '../components/GroupSelectorModal';
import { Appointment } from '../types';
import { useAppointments, useCreateAppointment, useDeleteAppointment } from '../hooks/useAppointments';
import { useAuth } from '../context/AuthContext';
import { ChevronLeft, ChevronRight, Plus, Pencil, Trash2 } from 'lucide-react';
import { lookupService } from '../services/lookupService';
import { appointmentService } from '../services/appointmentService';
import { useInvestees } from '../hooks/useInvestees';
import { usePartners } from '../hooks/usePartners';
import { useGroups } from '../hooks/useGroups';
import { groupService } from '../services/groupService';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDate, formatMonthYear, formatTime, formatTimeInput } from '../utils/formatters';
import { AppointmentStatusBadge } from '../components/StatusBadge';
import { AppointmentFormState } from '../hooks/useAppointmentForm';

export const AppointmentsPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const chapterId = user?.chapter_id || '';
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());

    // Data
    const { data: appointmentData, isLoading } = useAppointments(month, year);
    const appointments = appointmentData?.data || [];
    const total = appointmentData?.pagination?.total || appointments.length;

    // Modal state
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showGroupSelectModal, setShowGroupSelectModal] = useState(false);
    const [editingAppointmentId, setEditingAppointmentId] = useState<string | null>(null);
    const [initialFormData, setInitialFormData] = useState<Partial<AppointmentFormState> | undefined>(undefined);
    const [initialPartnerIds, setInitialPartnerIds] = useState<string[]>([]);

    const queryClient = useQueryClient();

    // Mutations
    const createAppointment = useCreateAppointment();
    const deleteAppointment = useDeleteAppointment();

    // Lazy-load create-modal options only while modal is open
    const { data: appointmentTypes = [] } = useQuery({
        queryKey: ['appointment-types'],
        queryFn: () => lookupService.listAppointmentTypes(),
        enabled: showCreateModal,
    });
    const { data: groupTypes = [] } = useQuery({
        queryKey: ['group-types'],
        queryFn: () => lookupService.listGroupTypes(),
        enabled: showCreateModal || showGroupSelectModal,
    });
    const { data: investees = [] } = useInvestees();
    const { data: partnerList = [] } = usePartners();
    const { data: groups = [] } = useGroups();
    const allPartners = partnerList.map((p) => ({ partner_id: p.partner_id, partner_name: p.partner_name }));

    const prevMonth = () => {
        if (month === 1) { setMonth(12); setYear(year - 1); }
        else setMonth(month - 1);
    };
    const nextMonth = () => {
        if (month === 12) { setMonth(1); setYear(year + 1); }
        else setMonth(month + 1);
    };

    const openCreateModal = () => {
        setEditingAppointmentId(null);
        setInitialFormData(undefined);
        setInitialPartnerIds([]);
        setShowCreateModal(true);
    };

    const openCreateUsingGroup = () => {
        setShowGroupSelectModal(true);
    };

    const handleGroupSelected = async (groupId: string) => {
        try {
            const details = await groupService.getWithMembers(groupId);
            const activePartnerIds = details.members.filter((m) => m.is_active).map((m) => String(m.partner_id));

            setEditingAppointmentId(null);
            setInitialFormData({
                group_id: groupId,
                group_type_id: details.group.group_type_id || '',
                investee_id: details.group.investee_id || '',
                meeting_date: new Date().toLocaleDateString('en-CA'),
            });
            setInitialPartnerIds(activePartnerIds);
            setShowCreateModal(true);
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : 'Failed to load selected group details');
        }
    };

    const groupTypeNameById = useMemo(
        () => new Map(groupTypes.map((t) => [t.group_type_id, t.type_name])),
        [groupTypes]
    );

    const investeeNameById = useMemo(
        () => new Map(investees.map((i) => [i.investee_id, i.investee_name])),
        [investees]
    );

    const groupOptions = useMemo(
        () =>
            (groups || []).map((g) => ({
                group_id: g.group_id,
                group_name: g.group_name,
                group_type_name: g.group_type_id ? groupTypeNameById.get(g.group_type_id) || g.group_type || undefined : g.group_type || undefined,
                investee_name: g.investee_id ? investeeNameById.get(g.investee_id) : undefined,
            })),
        [groups, groupTypeNameById, investeeNameById]
    );

    const openEditModal = async (appt: Appointment) => {
        const detail = await appointmentService.get(appt.appointment_id);
        setEditingAppointmentId(detail.appointment.appointment_id);
        setInitialFormData({
            meeting_date: detail.appointment.occurrence_date.split('T')[0],
            planned_start: formatTimeInput(detail.appointment.start_at),
            planned_end: formatTimeInput(detail.appointment.end_at),
            appointment_type_id: detail.appointment.appointment_type_id || '',
            meeting_type: detail.appointment.appointment_type_id || '',
            group_type_id: detail.appointment.group_type_id || '',
            investee_id: detail.appointment.investee_id || '',
        });
        setInitialPartnerIds((detail.partners || []).map((p) => String(p.partner_id)));
        setShowCreateModal(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this appointment?')) return;
        try {
            await deleteAppointment.mutateAsync(id);
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : 'Failed to delete');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-text">Appointments</h2>
                    <p className="text-textMuted mt-1">Manage appointments by month.</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={openCreateModal}><Plus size={20} /> Add New</Button>
                    <Button variant="secondary" onClick={openCreateUsingGroup}>Add Using Group</Button>
                </div>
            </div>

            {/* Month Navigation */}
            <Card className="p-4 bg-surface border-surfaceHighlight flex items-center justify-between">
                <button onClick={prevMonth} className="p-2 rounded hover:bg-surfaceHighlight transition-colors"><ChevronLeft size={20} /></button>
                <div className="text-center">
                    <h3 className="text-lg font-semibold text-text">{formatMonthYear(month, year)}</h3>
                    <p className="text-xs text-textMuted">{total} appointment{total !== 1 ? 's' : ''}</p>
                </div>
                <button onClick={nextMonth} className="p-2 rounded hover:bg-surfaceHighlight transition-colors"><ChevronRight size={20} /></button>
            </Card>

            {/* Appointments Table */}
            <Card className="bg-surface border-surfaceHighlight">
                <div className="overflow-x-auto">
                    {isLoading ? (
                        <div className="p-12 text-center text-textMuted">Loading appointments...</div>
                    ) : appointments.length === 0 ? (
                        <div className="p-12 text-center text-textMuted">No appointments for {formatMonthYear(month, year)}.</div>
                    ) : (
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-surfaceHighlight bg-surfaceHighlight/20">
                                    <th className="px-4 py-4 text-xs font-semibold text-textMuted uppercase tracking-wider">Name</th>
                                    <th className="px-4 py-4 text-xs font-semibold text-textMuted uppercase tracking-wider">Date</th>
                                    <th className="px-4 py-4 text-xs font-semibold text-textMuted uppercase tracking-wider">Time</th>
                                    <th className="px-4 py-4 text-xs font-semibold text-textMuted uppercase tracking-wider">Investee</th>
                                    <th className="px-4 py-4 text-xs font-semibold text-textMuted uppercase tracking-wider">Status</th>
                                    <th className="px-4 py-4 text-xs font-semibold text-textMuted uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-surfaceHighlight">
                                {appointments.map(appt => (
                                    <tr
                                        key={appt.appointment_id}
                                        className="hover:bg-surfaceHighlight/30 transition-colors cursor-pointer"
                                        onClick={() => navigate(`/appointments/${appt.appointment_id}`)}
                                    >
                                        <td className="px-4 py-4 text-sm font-medium text-text">
                                            {appt.appointment_name || appointmentTypes.find(t => t.appointment_type_id === appt.appointment_type_id)?.type_name || 'Appointment'}
                                        </td>
                                        <td className="px-4 py-4 text-sm text-text">{formatDate(appt.occurrence_date)}</td>
                                        <td className="px-4 py-4 text-sm text-textMuted">{formatTime(appt.start_at)} – {formatTime(appt.end_at)}</td>
                                        <td className="px-4 py-4 text-sm text-textMuted">{appt.investee_name || '-'}</td>
                                        <td className="px-4 py-4">
                                            <AppointmentStatusBadge status={appt.status} />
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        openEditModal(appt);
                                                    }}
                                                    className="p-1.5 text-textMuted hover:text-primary hover:bg-surfaceHighlight rounded-md transition-colors"
                                                    title="Edit"
                                                >
                                                    <Pencil size={16} />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDelete(appt.appointment_id);
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

            {/* Create Modal */}
            <CreateAppointmentModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSubmit={async (formData, selectedPartnerIds) => {
                    try {
                        // Map form data (meeting_date, planned_start, planned_end) to API fields (occurrence_date, start_at, end_at)
                        const normalizeTimeForApi = (value?: string): string | null => {
                            if (!value) return null;
                            const match = value.trim().match(/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/);
                            if (!match) return null;
                            return `${match[1]}:${match[2]}:${match[3] || '00'}`;
                        };

                        const startTime = normalizeTimeForApi(formData.planned_start);
                        const endTime = normalizeTimeForApi(formData.planned_end);
                        if (!startTime || !endTime) {
                            alert('Start and end times are required');
                            return;
                        }

                        const occDate = formData.meeting_date; // Keep as YYYY-MM-DD

                        if (editingAppointmentId) {
                            await appointmentService.update(
                                editingAppointmentId,
                                {
                                    occurrence_date: occDate,
                                    start_at: startTime,
                                    end_at: endTime,
                                    appointment_name: formData.appointment_name || undefined,
                                    appointment_type_id: formData.appointment_type_id || formData.meeting_type,
                                    group_type_id: formData.group_type_id || null,
                                    investee_id: formData.investee_id || null,
                                    partners: selectedPartnerIds,
                                },
                                String(chapterId)
                            );
                            await queryClient.invalidateQueries({ queryKey: ['appointments'] });
                        } else {
                            await createAppointment.mutateAsync({
                                chapter_id: chapterId,
                                occurrence_date: occDate,
                                start_at: startTime,
                                end_at: endTime,
                                appointment_name: formData.appointment_name || undefined,
                                appointment_type_id: formData.appointment_type_id || formData.meeting_type,
                                group_type_id: formData.group_type_id || undefined,
                                investee_id: formData.investee_id || undefined,
                                partners: selectedPartnerIds.length > 0 ? selectedPartnerIds : undefined,
                            });
                        }
                        setShowCreateModal(false);
                        setEditingAppointmentId(null);
                    } catch (err: unknown) {
                        alert(err instanceof Error ? err.message : `Failed to ${editingAppointmentId ? 'update' : 'create'}`);
                    }
                }}
                appointmentTypes={appointmentTypes}
                groupTypes={groupTypes}
                investees={investees}
                allPartners={allPartners}
                initialData={initialFormData}
                initialSelectedPartnerIds={initialPartnerIds}
                isEditing={!!editingAppointmentId}
            />

            <GroupSelectorModal
                isOpen={showGroupSelectModal}
                onClose={() => setShowGroupSelectModal(false)}
                groups={groupOptions}
                onSelect={handleGroupSelected}
            />
        </div>
    );
};
