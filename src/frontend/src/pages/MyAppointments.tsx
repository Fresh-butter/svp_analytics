import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarCheck, CheckCircle2, Clock3, XCircle, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { addMonths, eachDayOfInterval, endOfMonth, format, startOfMonth, subMonths } from 'date-fns';
import { appointmentService } from '../services/appointmentService';
import { recurringAppointmentService } from '../services/recurringAppointmentService';
import { lookupService } from '../services/lookupService';
import { formatDate, formatTime } from '../utils/formatters';
import { isRecurringOccurrence } from '../utils/recurrence';

const normalizeStatus = (status?: string | null) => String(status || '').toUpperCase();
const normalizePartnerStatus = (status?: string | null) => {
  const normalized = normalizeStatus(status);
  return normalized === 'PENDING' ? 'SCHEDULED' : normalized;
};

type StatusFilter = 'ALL' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';

export const MyAppointmentsPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('SCHEDULED');
  const [selectedMonth, setSelectedMonth] = useState<Date>(startOfMonth(new Date()));

  const { data: assigned = [], isLoading: loadingAssigned } = useQuery({
    queryKey: ['my-appointments-assigned'],
    queryFn: () => appointmentService.getAssigned(),
  });

  const { data: recurring = [], isLoading: loadingRecurring } = useQuery({
    queryKey: ['my-appointments-recurring'],
    queryFn: () => recurringAppointmentService.list(),
  });

  const { data: appointmentTypes = [] } = useQuery({
    queryKey: ['appointment-types'],
    queryFn: () => lookupService.listAppointmentTypes(),
  });

  const appointmentTypeMap = useMemo(
    () => new Map(appointmentTypes.map((t) => [t.appointment_type_id, t.type_name])),
    [appointmentTypes]
  );

  const appointments = useMemo(
    () => assigned.map((a) => ({
      kind: 'appointment' as const,
      id: a.appointment_id,
      title: (a.appointment_name || '').trim() || appointmentTypeMap.get(a.appointment_type_id || '') || 'Appointment',
      subtitle: a.investee_name || 'No investee',
      date: a.occurrence_date,
      time: `${formatTime(a.start_at)} - ${formatTime(a.end_at)}`,
      status: normalizePartnerStatus(a.status),
    })),
    [assigned, appointmentTypeMap]
  );

  const monthStart = useMemo(() => startOfMonth(selectedMonth), [selectedMonth]);
  const monthEnd = useMemo(() => endOfMonth(selectedMonth), [selectedMonth]);
  const monthDays = useMemo(() => eachDayOfInterval({ start: monthStart, end: monthEnd }), [monthStart, monthEnd]);

  const recurringItems = useMemo(() => {
    const rows: Array<{
      kind: 'recurring';
      id: string;
      title: string;
      subtitle: string;
      date: string;
      time: string;
      status: 'SCHEDULED';
      occurrenceDate: string;
    }> = [];

    recurring.forEach((r) => {
      monthDays.forEach((day) => {
        if (!isRecurringOccurrence(r, day)) return;
        const occurrenceDate = format(day, 'yyyy-MM-dd');

        // Avoid duplicate rows when this recurring occurrence is already materialized as an appointment.
        const alreadyMaterialized = assigned.some(
          (a) => a.rec_appointment_id === r.rec_appointment_id && a.occurrence_date === occurrenceDate
        );
        if (alreadyMaterialized) return;

        rows.push({
          kind: 'recurring',
          id: r.rec_appointment_id,
          title: (r.appointment_name || '').trim() || appointmentTypeMap.get(r.appointment_type_id || '') || 'Appointment',
          subtitle: 'Scheduled appointment',
          date: occurrenceDate,
          time: formatTime(r.start_time),
          status: 'SCHEDULED',
          occurrenceDate,
        });
      });
    });

    return rows;
  }, [recurring, monthDays, assigned, appointmentTypeMap]);

  const appointmentsInMonth = useMemo(
    () => appointments.filter((a) => {
      if (!a.date) return false;
      return a.date >= format(monthStart, 'yyyy-MM-dd') && a.date <= format(monthEnd, 'yyyy-MM-dd');
    }),
    [appointments, monthStart, monthEnd]
  );

  const rows = useMemo(() => {
    const merged = [...appointmentsInMonth, ...recurringItems];
    return merged.filter((item) => {
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
      const haystack = `${item.title} ${item.subtitle} ${item.status}`.toLowerCase();
      return haystack.includes(search.trim().toLowerCase());
    }).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  }, [appointmentsInMonth, recurringItems, search, statusFilter]);

  const counts = useMemo(() => ({
    scheduled: appointmentsInMonth.filter((a) => a.status === 'SCHEDULED').length + recurringItems.length,
    completed: appointmentsInMonth.filter((a) => a.status === 'COMPLETED').length,
    cancelled: appointmentsInMonth.filter((a) => a.status === 'CANCELLED').length,
  }), [appointmentsInMonth, recurringItems]);

  const loading = loadingAssigned || loadingRecurring;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-text">My Appointments</h1>
        <p className="text-textMuted mt-1">Track your scheduled, completed, and cancelled appointments in one place.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-surfaceHighlight bg-surface p-4">
          <div className="flex items-center gap-2 text-textMuted text-sm"><Clock3 size={16} /> Scheduled</div>
          <div className="text-2xl font-bold text-text mt-1">{counts.scheduled}</div>
        </div>
        <div className="rounded-xl border border-surfaceHighlight bg-surface p-4">
          <div className="flex items-center gap-2 text-textMuted text-sm"><CheckCircle2 size={16} /> Completed</div>
          <div className="text-2xl font-bold text-text mt-1">{counts.completed}</div>
        </div>
        <div className="rounded-xl border border-surfaceHighlight bg-surface p-4">
          <div className="flex items-center gap-2 text-textMuted text-sm"><XCircle size={16} /> Cancelled</div>
          <div className="text-2xl font-bold text-text mt-1">{counts.cancelled}</div>
        </div>
      </div>

      <div className="rounded-xl border border-surfaceHighlight bg-surface">
        <div className="p-4 border-b border-surfaceHighlight flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-2.5 text-textMuted" size={18} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search appointments..."
              className="w-full bg-surfaceHighlight/30 border border-surfaceHighlight rounded-lg pl-10 pr-4 py-2 text-text outline-none focus:border-primary transition-colors"
            />
          </div>

          <div className="flex rounded-lg border border-surfaceHighlight overflow-hidden text-sm">
            {(['ALL', 'SCHEDULED', 'COMPLETED', 'CANCELLED'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setStatusFilter(value)}
                className={`px-3 py-1.5 transition-colors ${statusFilter === value ? 'bg-primary text-white' : 'bg-surfaceHighlight/30 text-textMuted hover:bg-surfaceHighlight'}`}
              >
                {value === 'ALL' ? 'All' : value.charAt(0) + value.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-textMuted">Loading appointments...</div>
          ) : rows.length === 0 ? (
            <div className="p-12 text-center text-textMuted">No appointments found for this filter.</div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-surfaceHighlight bg-surfaceHighlight/20">
                  <th className="px-4 py-4 text-xs font-semibold text-textMuted uppercase tracking-wider">Title</th>
                  <th className="px-4 py-4 text-xs font-semibold text-textMuted uppercase tracking-wider">Type</th>
                  <th className="px-4 py-4 text-xs font-semibold text-textMuted uppercase tracking-wider">Date</th>
                  <th className="px-4 py-4 text-xs font-semibold text-textMuted uppercase tracking-wider">Time</th>
                  <th className="px-4 py-4 text-xs font-semibold text-textMuted uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surfaceHighlight">
                {rows.map((row) => (
                  <tr
                    key={`${row.kind}:${row.id}:${row.date}`}
                    className="hover:bg-surfaceHighlight/30 transition-colors cursor-pointer"
                    onClick={() => {
                      if (row.kind === 'recurring') {
                        navigate(`/my-appointments/recurring/${row.id}?occurrence_date=${row.date}`);
                        return;
                      }
                      navigate(`/my-appointments/appointment/${row.id}`);
                    }}
                  >
                    <td className="px-4 py-4 text-sm font-medium text-text">{row.title}</td>
                    <td className="px-4 py-4 text-sm text-textMuted">
                      <span className="inline-flex items-center gap-1">
                        <CalendarCheck size={14} />
                        Appointment
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-textMuted">{formatDate(row.date)}</td>
                    <td className="px-4 py-4 text-sm text-textMuted">{row.time}</td>
                    <td className="px-4 py-4 text-sm text-textMuted">{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-surfaceHighlight bg-surface p-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setSelectedMonth((prev) => startOfMonth(subMonths(prev, 1)))}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-surfaceHighlight text-textMuted hover:text-text hover:bg-surfaceHighlight/30 transition-colors"
        >
          <ChevronLeft size={16} /> Prev
        </button>
        <div className="text-sm font-medium text-text">
          {format(selectedMonth, 'MMMM yyyy')}
        </div>
        <button
          type="button"
          onClick={() => setSelectedMonth((prev) => startOfMonth(addMonths(prev, 1)))}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-surfaceHighlight text-textMuted hover:text-text hover:bg-surfaceHighlight/30 transition-colors"
        >
          Next <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};
