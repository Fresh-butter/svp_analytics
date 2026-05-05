import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '../components/Common';
import { partnerService } from '../services/partnerService';
import { ArrowLeft, Mail, Calendar, Users, Clock, Repeat, Linkedin, ChevronLeft, ChevronRight, Copy, Check } from 'lucide-react';
import { formatDate, formatTime } from '../utils/formatters';
import { ActiveStatusBadge, AppointmentStatusBadge } from '../components/StatusBadge';
import { DASHBOARD_AUTO_REFRESH_MS } from '../constants/refresh';
import { rruleToHuman } from '../mappers';
import { navigateBack } from '../utils/navigation';
import { useAuth } from '../context/AuthContext';

const APPOINTMENTS_PAGE_SIZE = 10;

type PartnerGroupRow = {
    group_partner_id: string;
    group_id: string;
    group_name: string;
    group_type?: string | null;
    gp_start: string;
    gp_end?: string | null;
    gp_active?: boolean;
};

type PartnerAppointmentRow = {
    appointment_id: string;
    occurrence_date: string;
    appointment_type?: string | null;
    start_at: string;
    end_at: string;
    status: string;
    is_present: boolean | null;
};

type PartnerRecurringRow = {
    rec_appointment_id: string;
    appointment_type?: string | null;
    start_time: string;
    duration_minutes: number;
    rrule?: string;
    start_date: string;
    end_date: string | null;
};

type PartnerDetails = {
    partner_name: string;
    email?: string | null;
    linkedin_url?: string | null;
    start_date: string;
    end_date?: string | null;
    is_active?: boolean;
    groups?: PartnerGroupRow[];
    appointments?: PartnerAppointmentRow[];
    recurring_appointments?: PartnerRecurringRow[];
};

export const PartnerViewPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const isPartner = user?.user_type === 'PARTNER';
    const [data, setData] = useState<PartnerDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [appointmentPage, setAppointmentPage] = useState(1);
    const [copiedLinkedin, setCopiedLinkedin] = useState(false);

    const fetchData = useCallback(async (showLoading = false) => {
        if (!id) return;
        try {
            if (showLoading) setLoading(true);
            const detail = await partnerService.getWithDetails(id);
            setData(detail);
        } catch (err) {
            console.error('Failed to load partner:', err);
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

    const handleCopyLinkedin = async () => {
        if (data?.linkedin_url) {
            await navigator.clipboard.writeText(data.linkedin_url);
            setCopiedLinkedin(true);
            setTimeout(() => setCopiedLinkedin(false), 2000);
        }
    };

    if (loading) return <div className="p-12 text-center text-textMuted">Loading partner details...</div>;
    if (!data) return <div className="p-12 text-center text-textMuted">Partner not found.</div>;

    return (
        <div className="space-y-6">
            <button onClick={() => navigateBack(navigate, '/partners')} className="flex items-center gap-2 text-textMuted hover:text-text transition-colors text-sm">
                <ArrowLeft size={16} /> Back
            </button>

            {/* Header Card */}
            <Card className="p-6 bg-surface border-surfaceHighlight relative">
                <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-xl font-bold text-white uppercase shrink-0">
                        {data.partner_name?.substring(0, 2)}
                    </div>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold text-text">{data.partner_name}</h1>
                        <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-textMuted">
                            {data.email && <span className="flex items-center gap-1"><Mail size={14} /> {data.email}</span>}
                            <span className="flex items-center gap-1"><Calendar size={14} /> Joined {formatDate(data.start_date)}</span>
                            {data.end_date && <span className="flex items-center gap-1">End: {formatDate(data.end_date)}</span>}
                        </div>
                        <ActiveStatusBadge active={!!data.is_active} className="mt-2" />
                    </div>
                    {data.linkedin_url && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleCopyLinkedin}
                                className="p-3 border border-surfaceHighlight rounded-lg text-textMuted hover:text-text hover:bg-surfaceHighlight/30 hover:border-surfaceHighlight/60 transition-all flex items-center justify-center"
                                aria-label="Copy LinkedIn URL"
                                title="Copy LinkedIn URL"
                            >
                                {copiedLinkedin ? <Check size={20} className="text-green-500" /> : <Copy size={20} />}
                            </button>
                            <a
                                href={data.linkedin_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-3 border border-surfaceHighlight rounded-lg text-blue-500 hover:bg-blue-500/10 hover:border-blue-500/50 transition-all flex items-center justify-center"
                                onClick={e => e.stopPropagation()}
                                aria-label="Open LinkedIn profile"
                                title="Open LinkedIn profile"
                            >
                                <Linkedin size={20} />
                            </a>
                            <span className="text-sm text-text break-all">{data.linkedin_url}</span>
                        </div>
                    )}
                </div>
            </Card>

            {/* Groups */}
            <Card className="bg-surface border-surfaceHighlight">
                <div className="p-4 border-b border-surfaceHighlight flex items-center gap-2">
                    <Users size={18} className="text-primary" />
                    <h3 className="font-semibold text-text">Groups ({data.groups?.length || 0})</h3>
                </div>
                {data.groups && data.groups.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-surfaceHighlight bg-surfaceHighlight/20">
                                    <th className="px-4 py-3 text-xs font-semibold text-textMuted uppercase">Group</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-textMuted uppercase">Type</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-textMuted uppercase">Start</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-textMuted uppercase">End</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-textMuted uppercase">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-surfaceHighlight">
                                {data.groups.map((g) => (
                                    <tr key={g.group_partner_id} className="hover:bg-surfaceHighlight/30 transition-colors cursor-pointer" onClick={() => navigate(`/groups/${g.group_id}`)}>
                                        <td className="px-4 py-3 text-sm font-medium text-text">{g.group_name}</td>
                                        <td className="px-4 py-3 text-sm text-textMuted">{g.group_type || '-'}</td>
                                        <td className="px-4 py-3 text-sm text-textMuted">{formatDate(g.gp_start)}</td>
                                        <td className="px-4 py-3 text-sm text-textMuted">{formatDate(g.gp_end)}</td>
                                        <td className="px-4 py-3">
                                            <ActiveStatusBadge active={!!g.gp_active} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-8 text-center text-textMuted">No groups assigned.</div>
                )}
            </Card>

            {!isPartner && (
            <Card className="bg-surface border-surfaceHighlight">
                <div className="p-4 border-b border-surfaceHighlight flex items-center gap-2">
                    <Clock size={18} className="text-primary" />
                    <h3 className="font-semibold text-text">Appointments ({data.appointments?.length || 0})</h3>
                </div>
                {data.appointments && data.appointments.length > 0 ? (
                    <>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-surfaceHighlight bg-surfaceHighlight/20">
                                    <th className="px-4 py-3 text-xs font-semibold text-textMuted uppercase">Date</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-textMuted uppercase">Type</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-textMuted uppercase">Time</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-textMuted uppercase">Status</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-textMuted uppercase">Attended</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-surfaceHighlight">
                                {data.appointments
                                    .slice((appointmentPage - 1) * APPOINTMENTS_PAGE_SIZE, appointmentPage * APPOINTMENTS_PAGE_SIZE)
                                    .map((a) => (
                                    <tr key={a.appointment_id} className="hover:bg-surfaceHighlight/30 transition-colors cursor-pointer" onClick={() => navigate(`/appointments/${a.appointment_id}`)}>
                                        <td className="px-4 py-3 text-sm text-text">{formatDate(a.occurrence_date)}</td>
                                        <td className="px-4 py-3 text-sm text-textMuted">{a.appointment_type || '-'}</td>
                                        <td className="px-4 py-3 text-sm text-textMuted">{formatTime(a.start_at)} – {formatTime(a.end_at)}</td>
                                        <td className="px-4 py-3">
                                            <AppointmentStatusBadge status={a.status} />
                                        </td>
                                        <td className="px-4 py-3">
                                            {a.is_present === null ? (
                                                <span className="text-xs text-textMuted">-</span>
                                            ) : a.is_present ? (
                                                <span className="text-xs text-green-500">Present</span>
                                            ) : (
                                                <span className="text-xs text-red-400">Absent</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {data.appointments.length > APPOINTMENTS_PAGE_SIZE && (() => {
                        const totalPages = Math.ceil(data.appointments!.length / APPOINTMENTS_PAGE_SIZE);
                        return (
                            <div className="p-4 border-t border-surfaceHighlight flex items-center justify-between text-sm text-textMuted">
                                <span>Showing {(appointmentPage - 1) * APPOINTMENTS_PAGE_SIZE + 1}–{Math.min(appointmentPage * APPOINTMENTS_PAGE_SIZE, data.appointments!.length)} of {data.appointments!.length}</span>
                                <div className="flex gap-1">
                                    <button onClick={() => setAppointmentPage(Math.max(1, appointmentPage - 1))} disabled={appointmentPage === 1} className="p-1.5 rounded hover:bg-surfaceHighlight disabled:opacity-30"><ChevronLeft size={18} /></button>
                                    <button onClick={() => setAppointmentPage(Math.min(totalPages, appointmentPage + 1))} disabled={appointmentPage === totalPages} className="p-1.5 rounded hover:bg-surfaceHighlight disabled:opacity-30"><ChevronRight size={18} /></button>
                                </div>
                            </div>
                        );
                    })()}
                    </>
                ) : (
                    <div className="p-8 text-center text-textMuted">No appointments found.</div>
                )}
            </Card>
            )}

            {!isPartner && (
            <Card className="bg-surface border-surfaceHighlight">
                <div className="p-4 border-b border-surfaceHighlight flex items-center gap-2">
                    <Repeat size={18} className="text-primary" />
                    <h3 className="font-semibold text-text">Recurring Appointments ({data.recurring_appointments?.length || 0})</h3>
                </div>
                {data.recurring_appointments && data.recurring_appointments.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-surfaceHighlight bg-surfaceHighlight/20">
                                    <th className="px-4 py-3 text-xs font-semibold text-textMuted uppercase">Type</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-textMuted uppercase">Time</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-textMuted uppercase">Duration</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-textMuted uppercase">Pattern</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-textMuted uppercase">Start</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-textMuted uppercase">End</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-surfaceHighlight">
                                {data.recurring_appointments.map((r) => (
                                    <tr key={r.rec_appointment_id} className="hover:bg-surfaceHighlight/30 transition-colors cursor-pointer" onClick={() => navigate(`/recurring-appointments/${r.rec_appointment_id}`)}>
                                        <td className="px-4 py-3 text-sm text-text">{r.appointment_type || '-'}</td>
                                        <td className="px-4 py-3 text-sm text-textMuted">{formatTime(r.start_time)}</td>
                                        <td className="px-4 py-3 text-sm text-textMuted">{r.duration_minutes} min</td>
                                        <td className="px-4 py-3 text-sm text-textMuted">{r.rrule ? rruleToHuman(r.rrule) : '-'}</td>
                                        <td className="px-4 py-3 text-sm text-textMuted">{formatDate(r.start_date)}</td>
                                        <td className="px-4 py-3 text-sm text-textMuted">{formatDate(r.end_date)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-8 text-center text-textMuted">No recurring appointments found.</div>
                )}
            </Card>
            )}
        </div>
    );
};
