import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Modal } from '../components/Common';
import { groupService } from '../services/groupService';
import { partnerService } from '../services/partnerService';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Users, Plus, Pencil, Repeat, Clock } from 'lucide-react';
import PartnerSelectorModal from '../components/PartnerSelectorModal';
import { Partner, Group } from '../types';
import { formatDate, formatTime } from '../utils/formatters';
import { ActiveStatusBadge } from '../components/StatusBadge';
import { DASHBOARD_AUTO_REFRESH_MS } from '../constants/refresh';
import { navigateBack } from '../utils/navigation';
import { rruleToHuman } from '../mappers';
import { useQuery } from '@tanstack/react-query';
import { lookupService } from '../services/lookupService';

type GroupMember = {
    group_partner_id: string;
    partner_id: string;
    partner_name: string;
    email: string;
    start_date: string;
    end_date: string | null;
    is_active: boolean;
};

type GroupRecurring = {
    rec_appointment_id: string;
    appointment_name?: string | null;
    appointment_type_id?: string | null;
    start_time: string;
    duration_minutes: number;
    rrule?: string | null;
    start_date: string;
    end_date?: string | null;
};

export const GroupViewPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const isAdmin = user?.user_type === 'ADMIN';
    const isPartner = user?.user_type === 'PARTNER';
    const chapterId = user?.chapter_id || '';
    const [group, setGroup] = useState<Group | null>(null);
    const [members, setMembers] = useState<GroupMember[]>([]);
    const [recurringAppointments, setRecurringAppointments] = useState<GroupRecurring[]>([]);
    const [investee, setInvestee] = useState<{ investee_id: string; investee_name: string } | null>(null);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [allPartners, setAllPartners] = useState<Partner[]>([]);
    const [selectedPartners, setSelectedPartners] = useState<string[]>([]);

    // Edit partner dates state
    const [editingMember, setEditingMember] = useState<GroupMember | null>(null);
    const [editStartDate, setEditStartDate] = useState('');
    const [editEndDate, setEditEndDate] = useState('');
    const [editError, setEditError] = useState('');

    const { data: appointmentTypes = [] } = useQuery({
        queryKey: ['appointment-types'],
        queryFn: () => lookupService.listAppointmentTypes(),
    });

    const getRecurringName = (r: GroupRecurring) => {
        if (r.appointment_name) return r.appointment_name;
        if (r.appointment_type_id) {
            const typeName = appointmentTypes.find((t) => t.appointment_type_id === r.appointment_type_id)?.type_name;
            if (typeName) return typeName;
        }
        return 'Recurring Appointment';
    };

    const fetchData = useCallback(async (showLoading = false) => {
        if (!id) return;
        try {
            if (showLoading) setLoading(true);
            const res = await groupService.getWithMembers(id);
            setGroup(res.group);
            setMembers(res.members);
            setRecurringAppointments(res.recurring_appointments || []);
            setInvestee(res.investee || null);
        } catch (err) {
            console.error('Error fetching group:', err);
        } finally {
            if (showLoading) setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        void fetchData(true);
    }, [fetchData]);

    useEffect(() => {
        const intervalId = window.setInterval(() => {
            void fetchData(false);
        }, DASHBOARD_AUTO_REFRESH_MS);

        return () => window.clearInterval(intervalId);
    }, [fetchData]);

    const openAddModal = async () => {
        try {
            const all = await partnerService.getAll();
            setAllPartners(all);
            setSelectedPartners(members.map(m => m.partner_id));
            setShowAddModal(true);
        } catch (err) {
            console.error('Error loading partners:', err);
        }
    };

    const handleOpenEditMember = (member: GroupMember) => {
        setEditingMember(member);
        // Extract just the date portion in case of ISO timestamps
        const sd = member.start_date.includes('T') ? member.start_date.split('T')[0] : member.start_date;
        const ed = member.end_date ? (member.end_date.includes('T') ? member.end_date.split('T')[0] : member.end_date) : '';
        setEditStartDate(sd);
        setEditEndDate(ed);
        setEditError('');
    };

    const handleSaveEditMember = async () => {
        if (!id || !editingMember) return;

        // Validate dates
        if (!editStartDate) {
            setEditError('Start date is required');
            return;
        }
        if (editEndDate && editEndDate < editStartDate) {
            setEditError('End date must be on or after start date');
            return;
        }

        try {
            // Build updated partner list keeping all members but updating the edited one
            const updatedPartners = members.map(m => {
                if (m.partner_id === editingMember.partner_id) {
                    return {
                        partner_id: m.partner_id,
                        start_date: editStartDate,
                        end_date: editEndDate || undefined,
                    };
                }
                return {
                    partner_id: m.partner_id,
                    start_date: m.start_date,
                    end_date: m.end_date,
                };
            });
            await groupService.updatePartners(id, chapterId, updatedPartners);
            await fetchData();
            setEditingMember(null);
        } catch (err: unknown) {
            setEditError(err instanceof Error ? err.message : 'Failed to update partner dates');
        }
    };

    if (loading) return <div className="p-12 text-center text-textMuted">Loading group details...</div>;
    if (!group) return <div className="p-12 text-center text-textMuted">Group not found.</div>;

    return (
        <div className="space-y-6">
            <button onClick={() => navigateBack(navigate, '/groups')} className="flex items-center gap-2 text-textMuted hover:text-text transition-colors text-sm">
                <ArrowLeft size={16} /> Back
            </button>

            {/* Header */}
            <Card className="p-6 bg-surface border-surfaceHighlight">
                <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-xl font-bold text-white uppercase shrink-0">
                        {group.group_name?.substring(0, 2)}
                    </div>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold text-text">{group.group_name}</h1>
                        <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-textMuted">
                            <span>Start: {formatDate(group.start_date)}</span>
                            {group.end_date && <span>End: {formatDate(group.end_date)}</span>}
                            {investee && (
                                <span>
                                    Investee:{' '}
                                    <button
                                        type="button"
                                        className="text-primary hover:underline"
                                        onClick={() => navigate(`/investees/${investee.investee_id}`)}
                                    >
                                        {investee.investee_name}
                                    </button>
                                </span>
                            )}
                        </div>
                        <ActiveStatusBadge active={!!group.is_active} className="mt-2" />
                    </div>
                </div>
            </Card>

            {/* Members */}
            <Card className="bg-surface border-surfaceHighlight">
                <div className="p-4 border-b border-surfaceHighlight flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Users size={18} className="text-primary" />
                        <h3 className="font-semibold text-text">Members ({members.length})</h3>
                    </div>
                    {isAdmin && (
                        <Button onClick={openAddModal}>
                            <Plus size={16} /> Edit Partners
                        </Button>
                    )}
                </div>
                {members.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-surfaceHighlight bg-surfaceHighlight/20">
                                    <th className="px-4 py-3 text-xs font-semibold text-textMuted uppercase">Partner</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-textMuted uppercase">Email</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-textMuted uppercase">Start</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-textMuted uppercase">End</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-textMuted uppercase">Status</th>
                                    {isAdmin && <th className="px-4 py-3 text-xs font-semibold text-textMuted uppercase text-right">Actions</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-surfaceHighlight">
                                {members.map(m => (
                                    <tr key={m.group_partner_id} className="hover:bg-surfaceHighlight/30 transition-colors cursor-pointer" onClick={() => navigate(`/partners/${m.partner_id}`)}>
                                        <td className="px-4 py-3 text-sm font-medium text-text">{m.partner_name}</td>
                                        <td className="px-4 py-3 text-sm text-textMuted">{m.email}</td>
                                        <td className="px-4 py-3 text-sm text-textMuted">{formatDate(m.start_date)}</td>
                                        <td className="px-4 py-3 text-sm text-textMuted">{formatDate(m.end_date)}</td>
                                        <td className="px-4 py-3">
                                            <ActiveStatusBadge active={!!m.is_active} />
                                        </td>
                                        {isAdmin && (
                                            <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                                                <button
                                                    onClick={() => handleOpenEditMember(m)}
                                                    className="p-1.5 text-textMuted hover:text-primary hover:bg-surfaceHighlight rounded-md transition-colors"
                                                    title="Edit dates"
                                                >
                                                    <Pencil size={16} />
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-8 text-center text-textMuted">No members in this group yet.</div>
                )}
            </Card>

            {!isPartner && (
            <Card className="bg-surface border-surfaceHighlight">
                <div className="p-4 border-b border-surfaceHighlight flex items-center gap-2">
                    <Repeat size={18} className="text-primary" />
                    <h3 className="font-semibold text-text">Recurring Appointments ({recurringAppointments.length})</h3>
                </div>
                {recurringAppointments.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-surfaceHighlight bg-surfaceHighlight/20">
                                    <th className="px-4 py-3 text-xs font-semibold text-textMuted uppercase">Name</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-textMuted uppercase">Pattern</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-textMuted uppercase">Time</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-textMuted uppercase">Start</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-textMuted uppercase">End</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-surfaceHighlight">
                                {recurringAppointments.map((r) => (
                                    <tr
                                        key={r.rec_appointment_id}
                                        className="hover:bg-surfaceHighlight/30 transition-colors cursor-pointer"
                                        onClick={() => navigate(`/recurring-appointments/${r.rec_appointment_id}`)}
                                    >
                                        <td className="px-4 py-3 text-sm text-text">{getRecurringName(r)}</td>
                                        <td className="px-4 py-3 text-sm text-textMuted">{r.rrule ? rruleToHuman(r.rrule) : '-'}</td>
                                        <td className="px-4 py-3 text-sm text-textMuted">
                                            <span className="inline-flex items-center gap-1"><Clock size={12} /> {formatTime(r.start_time)}</span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-textMuted">{formatDate(r.start_date)}</td>
                                        <td className="px-4 py-3 text-sm text-textMuted">{formatDate(r.end_date)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-8 text-center text-textMuted">No recurring appointments linked to this group.</div>
                )}
            </Card>
            )}

            {/* Edit Partners (uses PartnerSelectorModal) */}
            <PartnerSelectorModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                title="Edit Partners in Group"
                allPartners={allPartners.map(p => ({ partner_id: p.partner_id, partner_name: p.partner_name, email: p.email }))}
                selectedIds={selectedPartners}
                onChange={async (newIds) => {
                    if (!id) return;
                    try {
                        // Build partner entries preserving existing start/end when possible
                        const updated = newIds.map(pid => {
                            const existing = members.find(m => m.partner_id === pid);
                            return {
                                partner_id: pid,
                                start_date: existing?.start_date || group?.start_date || new Date().toLocaleDateString('en-CA'),
                                end_date: existing?.end_date || undefined,
                            };
                        });
                        await groupService.updatePartners(id, chapterId, updated);
                        await fetchData();
                        setShowAddModal(false);
                        setSelectedPartners([]);
                    } catch (err: unknown) {
                        alert(err instanceof Error ? err.message : 'Failed to update partners');
                    }
                }}
            />

            {/* Edit Partner Dates Modal */}
            <Modal isOpen={!!editingMember} onClose={() => setEditingMember(null)} title={`Edit Dates – ${editingMember?.partner_name || ''}`}>
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-textMuted">Start Date <span className="text-red-400">*</span></label>
                        <input
                            type="date"
                            value={editStartDate}
                            onChange={e => { setEditStartDate(e.target.value); setEditError(''); }}
                            className="w-full bg-background border border-surfaceHighlight rounded-lg px-4 py-2.5 text-text focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-textMuted">End Date</label>
                        <input
                            type="date"
                            value={editEndDate}
                            onChange={e => { setEditEndDate(e.target.value); setEditError(''); }}
                            className="w-full bg-background border border-surfaceHighlight rounded-lg px-4 py-2.5 text-text focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                        />
                    </div>
                    {editError && <p className="text-xs text-red-400">{editError}</p>}
                    <div className="pt-4 flex justify-end gap-3">
                        <Button variant="secondary" onClick={() => setEditingMember(null)}>Cancel</Button>
                        <Button onClick={handleSaveEditMember}>Save</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
