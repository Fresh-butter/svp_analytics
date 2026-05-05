import { useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Modal } from '../components/Common';
import { AppointmentModal } from '../components/CreateAppointmentModal';
import { GroupSelectorModal } from '../components/GroupSelectorModal';
import { Appointment } from '../types';
import { useAppointments, useCreateAppointment, useDeleteAppointment } from '../hooks/useAppointments';
import { useAuth } from '../context/AuthContext';
import { ChevronLeft, ChevronRight, Plus, Pencil, Trash2, MoreVertical } from 'lucide-react';
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
import { parseLocalDate } from '../utils/appointmentHelpers';

type AttendanceChoice = 'PRESENT' | 'ABSENT_INFORMED' | 'ABSENT_NOT_INFORMED';

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
    const [showCompleteModal, setShowCompleteModal] = useState(false);
    const [completingAppointmentId, setCompletingAppointmentId] = useState<string | null>(null);
    const [completionMeta, setCompletionMeta] = useState<{ date: string; start: string; end: string } | null>(null);
    const [statusMenuFor, setStatusMenuFor] = useState<string | null>(null);
    const [statusMenuPosition, setStatusMenuPosition] = useState<{ top: number; left: number } | null>(null);
    const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
    const [attendanceRows, setAttendanceRows] = useState<Array<{ partner_id: string; partner_name: string; choice: AttendanceChoice }>>([]);

    const queryClient = useQueryClient();

    // Mutations
    const createAppointment = useCreateAppointment();
    const deleteAppointment = useDeleteAppointment();

    // Lazy-load create-modal options only while modal is open
    const { data: appointmentTypes = [] } = useQuery({
        queryKey: ['appointment-types'],
        queryFn: () => lookupService.listAppointmentTypes(),
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
    const fileInputRef = useRef<HTMLInputElement | null>(null);

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
            appointment_name: detail.appointment.appointment_name || '',
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

    const normalizeStatus = (status?: string | null) => (status || '').trim().toUpperCase();

    const canCompleteOnOrBeforeToday = (dateStr?: string) => {
        if (!dateStr) return false;
        const eventDate = parseLocalDate(dateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return eventDate.getTime() <= today.getTime();
    };

    const openCompleteFromTable = async (appt: Appointment) => {
        if (!canCompleteOnOrBeforeToday(appt.occurrence_date)) {
            alert('Completion is allowed only for current and past dates.');
            return;
        }

        try {
            const detail = await appointmentService.get(appt.appointment_id);
            setCompletingAppointmentId(appt.appointment_id);
            setCompletionMeta({
                date: detail.appointment.occurrence_date,
                start: detail.appointment.start_at,
                end: detail.appointment.end_at,
            });
            setAttendanceRows(
                (detail.partners || []).map((p) => ({
                    partner_id: String(p.partner_id),
                    partner_name: p.partner_name,
                    choice:
                        p.is_present === true
                            ? 'PRESENT'
                            : p.is_present === false
                                ? (p.absent_informed === true ? 'ABSENT_INFORMED' : 'ABSENT_NOT_INFORMED')
                                : 'PRESENT',
                }))
            );
            setShowCompleteModal(true);
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : 'Failed to load appointment attendance');
        }
    };

    const completeFromTable = async () => {
        if (!completingAppointmentId) return;
        try {
            await appointmentService.complete(
                completingAppointmentId,
                attendanceRows.map((row) => ({
                    partner_id: row.partner_id,
                    is_present: row.choice === 'PRESENT',
                    absent_informed:
                        row.choice === 'PRESENT'
                            ? null
                            : row.choice === 'ABSENT_INFORMED',
                }))
            );
            setShowCompleteModal(false);
            setCompletingAppointmentId(null);
            setAttendanceRows([]);
            await queryClient.invalidateQueries({ queryKey: ['appointments'] });
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : 'Failed to complete appointment');
        }
    };

    const updateStatus = async (appointmentId: string, nextStatus: 'PENDING' | 'CANCELLED') => {
        try {
            setStatusUpdatingId(appointmentId);
            if (nextStatus === 'PENDING') {
                await appointmentService.setPending(appointmentId);
            } else {
                await appointmentService.setCancelled(appointmentId);
            }
            setStatusMenuFor(null);
            await queryClient.invalidateQueries({ queryKey: ['appointments'] });
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : 'Failed to update status');
        } finally {
            setStatusUpdatingId(null);
        }
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
                                <div className="relative">
                                    <Button
                                        variant="secondary"
                                        onClick={() => fileInputRef.current?.click?.()}
                                    >
                                        Import
                                    </Button>
                                    <input
                                        type="file"
                                        accept=".csv, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                        style={{ display: 'none' }}
                                        ref={fileInputRef}
                                        onChange={async (e) => {
                                            const f = e.target.files?.[0];
                                            if (!f) return;
                                            try {
                                                const xlsx = await import('xlsx');
                                                const data = await f.arrayBuffer();
                                                const wb = xlsx.read(data, { type: 'array' });
                                                const sheet = wb.Sheets[wb.SheetNames[0]];
                                                const raw: any[] = xlsx.utils.sheet_to_json(sheet, { defval: '' });

                                                const normalizeDate = (value: unknown): string => {
                                                    if (value === null || value === undefined || value === '') return '';
                                                    if (value instanceof Date && !Number.isNaN(value.getTime())) {
                                                        return value.toISOString().slice(0, 10);
                                                    }
                                                    if (typeof value === 'number') {
                                                        const parsed = xlsx.SSF.parse_date_code(value);
                                                        if (parsed && parsed.y && parsed.m && parsed.d) {
                                                            const dt = new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
                                                            return dt.toISOString().slice(0, 10);
                                                        }
                                                    }
                                                    let s = String(value).trim();
                                                    if (!s) return '';
                                                    s = s.split(/[\sT]/)[0];
                                                    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
                                                    const dmy = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2}|\d{4})$/);
                                                    if (dmy) {
                                                        let d = Number(dmy[1]);
                                                        let m = Number(dmy[2]);
                                                        let y = Number(dmy[3]);
                                                        if (y < 100) y += 2000;
                                                        if (d <= 12 && m > 12) {
                                                            const temp = d;
                                                            d = m;
                                                            m = temp;
                                                        }
                                                        const dt = new Date(Date.UTC(y, m - 1, d));
                                                        if (!Number.isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
                                                    }
                                                    const dt = new Date(s);
                                                    return Number.isNaN(dt.getTime()) ? '' : dt.toISOString().slice(0, 10);
                                                };

                                                const getValue = (record: Record<string, any>, keys: string[]) => {
                                                    for (const key of keys) {
                                                        const value = record[key];
                                                        if (value !== undefined && value !== null && String(value).trim() !== '') return value;
                                                    }
                                                    return '';
                                                };

                                                // Normalize headers to keys we expect
                                                const rows = raw.map(r => {
                                                    const lower: Record<string, any> = {};
                                                    for (const k of Object.keys(r)) {
                                                        const key = k.replace(/^\uFEFF/, '').trim().toLowerCase();
                                                        lower[key] = r[k];
                                                    }
                                                    return {
                                                        appointment_name: getValue(lower, ['app name', 'appointment name', 'name', 'appointment_name']),
                                                        description: getValue(lower, ['description', 'appointment description', 'details']),
                                                        occurrence_date: normalizeDate(getValue(lower, ['occurence date', 'occurrence date', 'date', 'occurrence_date', 'occurence_date'])),
                                                        investee_name: getValue(lower, ['investee name', 'investee', 'investee_name']),
                                                        status: getValue(lower, ['status']) || 'COMPLETED',
                                                        start_time: getValue(lower, ['start time', 'start_time', 'start']),
                                                        end_time: getValue(lower, ['end time', 'end_time', 'end']),
                                                        group_type: getValue(lower, ['group type(optionl)', 'group type(optional)', 'group type', 'group_type']),
                                                    };
                                                });

                                                const resp = await appointmentService.import(rows, chapterId);
                                                await queryClient.invalidateQueries({ queryKey: ['appointments'] });
                                                
                                                const errors = resp.results.filter((r: any) => !r.success);
                                                if (errors.length > 0) {
                                                    alert(`Import completed with errors.\n\n${errors.map((e: any) => `Row ${e.row + 1}: ${e.error}`).join('\n')}`);
                                                } else {
                                                    alert('Import completed successfully!');
                                                }
                                            } catch (err: unknown) {
                                                alert(err instanceof Error ? err.message : 'Import failed');
                                            } finally {
                                                // reset file input
                                                try { if (fileInputRef.current) fileInputRef.current.value = ''; } catch {}
                                            }
                                        }}
                                    />
                                </div>
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
                                            {(appt.appointment_name || '').trim() || appointmentTypes.find(t => t.appointment_type_id === appt.appointment_type_id)?.type_name || 'Appointment'}
                                        </td>
                                        <td className="px-4 py-4 text-sm text-text">{formatDate(appt.occurrence_date)}</td>
                                        <td className="px-4 py-4 text-sm text-textMuted">{formatTime(appt.start_at)} – {formatTime(appt.end_at)}</td>
                                        <td className="px-4 py-4 text-sm text-textMuted">{appt.investee_name || '-'}</td>
                                        <td className="px-4 py-4">
                                            <AppointmentStatusBadge status={appt.status} />
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1 relative">
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
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const trigger = e.currentTarget;
                                                        const rect = trigger.getBoundingClientRect();
                                                        const menuWidth = 208; // min-w-52
                                                        const maxLeft = window.innerWidth - menuWidth - 8;
                                                        const left = Math.max(8, Math.min(rect.right - menuWidth, maxLeft));
                                                        const nextPosition = {
                                                            top: rect.bottom + 6,
                                                            left,
                                                        };

                                                        setStatusMenuFor((prev) => {
                                                            if (prev === appt.appointment_id) {
                                                                setStatusMenuPosition(null);
                                                                return null;
                                                            }

                                                            setStatusMenuPosition(nextPosition);
                                                            return appt.appointment_id;
                                                        });
                                                    }}
                                                    className="p-1.5 text-textMuted hover:text-green-400 hover:bg-green-500/10 rounded-md transition-colors"
                                                    title="Complete / Status"
                                                >
                                                    <MoreVertical size={16} />
                                                </button>

                                                {statusMenuFor === appt.appointment_id && statusMenuPosition && (
                                                    <div
                                                        className="fixed z-50 min-w-52 bg-surface border border-surfaceHighlight rounded-lg shadow-lg p-1"
                                                        style={{ top: statusMenuPosition.top, left: statusMenuPosition.left }}
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        {(normalizeStatus(appt.status) === 'PENDING' || normalizeStatus(appt.status) === 'SCHEDULED') && (
                                                            <button
                                                                className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-surfaceHighlight disabled:opacity-50"
                                                                disabled={!canCompleteOnOrBeforeToday(appt.occurrence_date) || statusUpdatingId === appt.appointment_id}
                                                                onClick={async () => {
                                                                    await openCompleteFromTable(appt);
                                                                    setStatusMenuFor(null);
                                                                }}
                                                            >
                                                                Mark Complete
                                                            </button>
                                                        )}

                                                        {(normalizeStatus(appt.status) === 'PENDING' || normalizeStatus(appt.status) === 'SCHEDULED' || normalizeStatus(appt.status) === 'COMPLETED') && (
                                                            <button
                                                                className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-surfaceHighlight disabled:opacity-50"
                                                                disabled={statusUpdatingId === appt.appointment_id}
                                                                onClick={() => void updateStatus(appt.appointment_id, 'CANCELLED')}
                                                            >
                                                                Set Cancelled
                                                            </button>
                                                        )}

                                                        {(normalizeStatus(appt.status) === 'COMPLETED' || normalizeStatus(appt.status) === 'CANCELLED') && (
                                                            <button
                                                                className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-surfaceHighlight disabled:opacity-50"
                                                                disabled={statusUpdatingId === appt.appointment_id}
                                                                onClick={() => void updateStatus(appt.appointment_id, 'PENDING')}
                                                            >
                                                                Set Pending
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </Card>

            <Modal isOpen={showCompleteModal} onClose={() => setShowCompleteModal(false)} title="Complete Appointment - Mark Attendance">
                <div className="space-y-4">
                    {completionMeta && (
                        <p className="text-sm text-textMuted">
                            {formatDate(completionMeta.date)} - {formatTime(completionMeta.start)} to {formatTime(completionMeta.end)}
                        </p>
                    )}

                    {attendanceRows.length === 0 ? (
                        <p className="text-sm text-textMuted">No partners assigned to this appointment.</p>
                    ) : (
                        <div className="space-y-2">
                            {attendanceRows.map((row, idx) => (
                                <div key={row.partner_id} className="px-3 py-2 bg-surfaceHighlight/20 rounded-lg">
                                    <div className="text-sm text-text mb-2">{row.partner_name}</div>
                                    <select
                                        className="w-full bg-surface border border-surfaceHighlight rounded-lg px-3 py-2 text-sm text-text"
                                        value={row.choice}
                                        onChange={(e) => {
                                            const nextChoice = e.target.value as AttendanceChoice;
                                            setAttendanceRows((prev) => {
                                                const next = [...prev];
                                                next[idx] = { ...next[idx], choice: nextChoice };
                                                return next;
                                            });
                                        }}
                                    >
                                        <option value="PRESENT">Present</option>
                                        <option value="ABSENT_INFORMED">Absent (Informed)</option>
                                        <option value="ABSENT_NOT_INFORMED">Absent (Not Informed)</option>
                                    </select>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="pt-4 flex justify-end gap-3">
                        <Button variant="secondary" onClick={() => setShowCompleteModal(false)}>Cancel</Button>
                        <Button onClick={() => void completeFromTable()}>Mark Complete</Button>
                    </div>
                </div>
            </Modal>

            {/* Create Modal */}
            <AppointmentModal
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
