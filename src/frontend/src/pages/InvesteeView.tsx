import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '../components/Common';
import { investeeService } from '../services/investeeService';
import { ArrowLeft, Mail, Calendar, Users, Clock, Repeat, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDate, formatTime } from '../utils/formatters';
import { ActiveStatusBadge, AppointmentStatusBadge } from '../components/StatusBadge';
import { DASHBOARD_AUTO_REFRESH_MS } from '../constants/refresh';
import { navigateBack } from '../utils/navigation';
import { rruleToHuman } from '../mappers';
import { useAuth } from '../context/AuthContext';

const APPOINTMENTS_PAGE_SIZE = 10;

type InvesteeGroupRow = {
    group_id: string;
    group_name: string;
    group_type?: string | null;
    start_date: string;
    end_date?: string | null;
    is_active?: boolean;
};

type InvesteeAppointmentRow = {
    appointment_id: string;
    occurrence_date: string;
    appointment_type?: string | null;
    start_at: string;
    end_at: string;
    status: string;
};

type InvesteeDetails = {
    investee_name: string;
    email?: string | null;
    start_date: string;
    end_date?: string | null;
    is_active?: boolean;
    groups?: InvesteeGroupRow[];
    appointments?: InvesteeAppointmentRow[];
    recurring_appointments?: Array<{
        rec_appointment_id: string;
        appointment_name?: string | null;
        appointment_type?: string | null;
        start_time: string;
        duration_minutes: number;
        rrule?: string | null;
        start_date: string;
        end_date?: string | null;
    }>;
};

export const InvesteeViewPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const isPartner = user?.user_type === 'PARTNER';
    const [data, setData] = useState<InvesteeDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [appointmentPage, setAppointmentPage] = useState(1);

    const fetchData = useCallback(async (showLoading = false) => {
        if (!id) return;
        try {
            if (showLoading) setLoading(true);
            const detail = await investeeService.getWithDetails(id);
            setData(detail);
        } catch (err) {
            console.error('Failed to load investee:', err);
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

    if (loading) return <div className="p-12 text-center text-textMuted">Loading investee details...</div>;
    if (!data) return <div className="p-12 text-center text-textMuted">Investee not found.</div>;

    return (
        <div className="space-y-6">
            <button onClick={() => navigateBack(navigate, '/investees')} className="flex items-center gap-2 text-textMuted hover:text-text transition-colors text-sm">
                <ArrowLeft size={16} /> Back
            </button>

            {/* Header */}
            <Card className="p-6 bg-surface border-surfaceHighlight">
                <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-xl font-bold text-white uppercase shrink-0">
                        {data.investee_name?.substring(0, 2)}
                    </div>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold text-text">{data.investee_name}</h1>
                        <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-textMuted">
                            {data.email && <span className="flex items-center gap-1"><Mail size={14} /> {data.email}</span>}
                            <span className="flex items-center gap-1"><Calendar size={14} /> Start {formatDate(data.start_date)}</span>
                            {data.end_date && <span>End: {formatDate(data.end_date)}</span>}
                        </div>
                        <ActiveStatusBadge active={!!data.is_active} className="mt-2" />
                    </div>
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
                                {data.groups.map((g, i) => (
                                    <tr key={i} className="hover:bg-surfaceHighlight/30 cursor-pointer" onClick={() => navigate(`/groups/${g.group_id}`)}>
                                        <td className="px-4 py-3 text-sm font-medium text-text">{g.group_name}</td>
                                        <td className="px-4 py-3 text-sm text-textMuted">{g.group_type || '-'}</td>
                                        <td className="px-4 py-3 text-sm text-textMuted">{formatDate(g.start_date)}</td>
                                        <td className="px-4 py-3 text-sm text-textMuted">{formatDate(g.end_date)}</td>
                                        <td className="px-4 py-3">
                                            <ActiveStatusBadge active={!!g.is_active} />
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
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-surfaceHighlight">
                                {data.appointments
                                    .slice((appointmentPage - 1) * APPOINTMENTS_PAGE_SIZE, appointmentPage * APPOINTMENTS_PAGE_SIZE)
                                    .map((a) => (
                                    <tr key={a.appointment_id} className="hover:bg-surfaceHighlight/30 cursor-pointer" onClick={() => navigate(`/appointments/${a.appointment_id}`)}>
                                        <td className="px-4 py-3 text-sm text-text">{formatDate(a.occurrence_date)}</td>
                                        <td className="px-4 py-3 text-sm text-textMuted">{a.appointment_type || '-'}</td>
                                        <td className="px-4 py-3 text-sm text-textMuted">{formatTime(a.start_at)} – {formatTime(a.end_at)}</td>
                                        <td className="px-4 py-3">
                                            <AppointmentStatusBadge status={a.status} />
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
                                    <th className="px-4 py-3 text-xs font-semibold text-textMuted uppercase">Type / Name</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-textMuted uppercase">Pattern</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-textMuted uppercase">Time</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-textMuted uppercase">Start</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-textMuted uppercase">End</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-surfaceHighlight">
                                {data.recurring_appointments.map((r) => (
                                    <tr
                                        key={r.rec_appointment_id}
                                        className="hover:bg-surfaceHighlight/30 cursor-pointer"
                                        onClick={() => navigate(`/recurring-appointments/${r.rec_appointment_id}`)}
                                    >
                                        <td className="px-4 py-3 text-sm text-text">{r.appointment_name || r.appointment_type || 'Recurring Appointment'}</td>
                                        <td className="px-4 py-3 text-sm text-textMuted">{r.rrule ? rruleToHuman(r.rrule) : '-'}</td>
                                        <td className="px-4 py-3 text-sm text-textMuted">{formatTime(r.start_time)}</td>
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
