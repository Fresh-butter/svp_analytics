import { eachDayOfInterval, endOfMonth, format, isSameMonth, startOfMonth } from 'date-fns';
import { Clock, Repeat } from 'lucide-react';
import { Card } from '../Common';
import { Appointment, Group, Investee, RecurringAppointment } from '../../types';
import { parseLocalDate } from '../../utils/appointmentHelpers';
import { isRecurringOccurrence } from '../../utils/recurrence';
import { matchesSearchMulti } from '../../utils/search';

type RegularRow = { type: 'regular'; event: Appointment; dateStr: string };
type RecurringRow = { type: 'recurring'; rec: RecurringAppointment; dateStr: string };
type CalendarRow = RegularRow | RecurringRow;

type Props = {
  isPartner?: boolean;
  currentMonth: Date;
  appointments: Appointment[];
  recurringApps: RecurringAppointment[];
  groups: Group[];
  investees: Investee[];
  listSearch: string;
  onListSearchChange: (value: string) => void;
  onViewDetail: (event: Appointment) => void;
  onViewRecurringDetail: (rec: RecurringAppointment, date: Date) => void;
};

export const CalendarListView = ({
  isPartner = false,
  currentMonth,
  appointments,
  recurringApps,
  groups,
  investees,
  listSearch,
  onListSearchChange,
  onViewDetail,
  onViewRecurringDetail,
}: Props) => {
  const normalizeStatus = (status?: string | null) => String(status || '').trim().toUpperCase();
  const statusLabel = (status?: string | null) => {
    const normalized = normalizeStatus(status);
    if (normalized === 'PENDING' || normalized === 'SCHEDULED') return 'Scheduled';
    if (normalized === 'COMPLETED') return 'Completed';
    if (normalized === 'CANCELLED' || normalized === 'CANCELED') return 'Cancelled';
    return status || '-';
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const regularEvents = appointments
    .filter((e) => {
      if (!e.meeting_date) return false;
      const d = parseLocalDate(e.meeting_date);
      if (!isSameMonth(d, currentMonth)) return false;
      if (!listSearch) return true;
      return matchesSearchMulti(
        listSearch,
        e.meeting_type,
        groups.find((g) => g.group_id === e.group_id)?.group_name,
        investees.find((iv) => iv.investee_id === e.investee_id)?.investee_name,
        e.status,
      );
    })
    .sort(
      (a, b) =>
        (a.meeting_date || '').localeCompare(b.meeting_date || '') ||
        (a.planned_start || '').localeCompare(b.planned_start || ''),
    );

  const recurringRows: RecurringRow[] = [];
  recurringApps.forEach((rec) => {
    monthDays.forEach((day) => {
      if (!isRecurringOccurrence(rec, day)) return;
      const dateStr = format(day, 'yyyy-MM-dd');
      if (appointments.some((a) => a.rec_app_id === rec.rec_app_id && a.meeting_date === dateStr)) return;
      if (listSearch && !matchesSearchMulti(listSearch, rec.meeting_type, groups.find((g) => g.group_id === rec.group_id)?.group_name)) return;
      recurringRows.push({ type: 'recurring', rec, dateStr });
    });
  });

  if (regularEvents.length === 0 && recurringRows.length === 0) {
    return (
      <Card className="bg-surface border-surfaceHighlight">
        <div className="p-4 border-b border-surfaceHighlight flex flex-col md:flex-row gap-4 justify-between">
          <div className="relative w-full md:w-96">
            <svg className="absolute left-3 top-2.5 text-textMuted w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              type="text"
              placeholder="Search events..."
              value={listSearch}
              onChange={(e) => onListSearchChange(e.target.value)}
              className="w-full bg-surfaceHighlight/30 border border-surfaceHighlight rounded-lg py-2 pl-9 pr-4 text-sm text-text outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all"
            />
          </div>
          <span className="text-sm text-textMuted self-center">{format(currentMonth, 'MMMM yyyy')}</span>
        </div>
        <div className="text-center py-16 text-textMuted">
          <Clock size={40} className="mx-auto mb-3 opacity-40" />
          <p className="text-lg font-medium">{listSearch ? 'No matching events' : 'No events this month'}</p>
          <p className="text-sm mt-1">{listSearch ? 'Try a different search term.' : 'Click "+ Event" to create one.'}</p>
        </div>
      </Card>
    );
  }

  const allRows: CalendarRow[] = [
    ...regularEvents.map((event) => ({ type: 'regular' as const, event, dateStr: event.meeting_date || '' })),
    ...recurringRows,
  ].sort((a, b) => {
    const dateCmp = a.dateStr.localeCompare(b.dateStr);
    if (dateCmp !== 0) return dateCmp;
    const aTime = a.type === 'regular' ? (a.event.planned_start || '') : (a.rec.planned_start || '');
    const bTime = b.type === 'regular' ? (b.event.planned_start || '') : (b.rec.planned_start || '');
    return aTime.localeCompare(bTime);
  });

  return (
    <Card className="bg-surface border-surfaceHighlight">
      <div className="p-4 border-b border-surfaceHighlight flex flex-col md:flex-row gap-4 justify-between">
        <div className="relative w-full md:w-96">
          <svg className="absolute left-3 top-2.5 text-textMuted w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input
            type="text"
            placeholder="Search events..."
            value={listSearch}
            onChange={(e) => onListSearchChange(e.target.value)}
            className="w-full bg-surfaceHighlight/30 border border-surfaceHighlight rounded-lg py-2 pl-9 pr-4 text-sm text-text outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all"
          />
        </div>
        <span className="text-sm text-textMuted self-center">{format(currentMonth, 'MMMM yyyy')}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-surfaceHighlight bg-surfaceHighlight/20">
              <th className="px-4 py-4 text-xs font-semibold text-textMuted uppercase tracking-wider">Date</th>
              <th className="px-4 py-4 text-xs font-semibold text-textMuted uppercase tracking-wider w-28">Time</th>
              <th className="px-4 py-4 text-xs font-semibold text-textMuted uppercase tracking-wider">Meeting</th>
              <th className="px-4 py-4 text-xs font-semibold text-textMuted uppercase tracking-wider">Group</th>
              <th className="px-4 py-4 text-xs font-semibold text-textMuted uppercase tracking-wider">Investee</th>
              <th className="px-4 py-4 text-xs font-semibold text-textMuted uppercase tracking-wider w-24">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surfaceHighlight">
            {allRows.map((row, idx) => {
              if (row.type === 'regular') {
                const event = row.event;
                return (
                  <tr
                    key={`reg-${idx}`}
                    className="hover:bg-surfaceHighlight/30 transition-colors cursor-pointer group"
                    onClick={() => onViewDetail(event)}
                  >
                    <td className="px-4 py-4 text-sm text-textMuted whitespace-nowrap">
                      {new Date(event.meeting_date + 'T00:00:00').toLocaleDateString()}
                    </td>
                    <td className="px-4 py-4 text-sm text-textMuted whitespace-nowrap">{event.planned_start} - {event.planned_end}</td>
                    <td className="px-4 py-4">
                      <div className="font-medium text-text">{event.meeting_type}</div>
                    </td>
                    <td className="px-4 py-4 text-sm text-textMuted">{event.group_id ? groups.find((g) => g.group_id === event.group_id)?.group_name || 'Unknown Group' : '-'}</td>
                    <td className="px-4 py-4 text-sm text-textMuted">{event.investee_id ? investees.find((iv) => iv.investee_id === event.investee_id)?.investee_name || 'Unknown Investee' : '-'}</td>
                    <td className="px-4 py-4">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          normalizeStatus(event.status) === 'COMPLETED'
                            ? 'bg-green-500/20 text-green-400'
                            : normalizeStatus(event.status) === 'CANCELLED' || normalizeStatus(event.status) === 'CANCELED'
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-yellow-500/20 text-yellow-400'
                        }`}
                      >
                        {statusLabel(event.status)}
                      </span>
                    </td>
                  </tr>
                );
              }

              const rec = row.rec;
              const date = parseLocalDate(row.dateStr);
              return (
                <tr
                  key={`rec-${idx}`}
                  className="hover:bg-surfaceHighlight/30 transition-colors cursor-pointer group"
                  onClick={() => onViewRecurringDetail(rec, date)}
                >
                  <td className="px-4 py-4 text-sm text-textMuted whitespace-nowrap">
                    {new Date(row.dateStr + 'T00:00:00').toLocaleDateString()}
                  </td>
                  <td className="px-4 py-4 text-sm text-textMuted whitespace-nowrap">{rec.planned_start && rec.planned_end ? `${rec.planned_start} - ${rec.planned_end}` : '-'}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      {!isPartner && <Repeat size={13} className="text-violet-400 shrink-0" />}
                      <span className="font-medium text-text">{rec.meeting_type || 'Appointment'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-textMuted">{groups.find((g) => g.group_id === rec.group_id)?.group_name || '-'}</td>
                  <td className="px-4 py-4 text-sm text-textMuted">{rec.investee_id ? investees.find((iv) => iv.investee_id === rec.investee_id)?.investee_name : '-'}</td>
                  <td className="px-4 py-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${isPartner ? 'bg-yellow-500/20 text-yellow-400' : 'bg-violet-500/20 text-violet-400'}`}>
                      {isPartner ? 'Scheduled' : 'Recurring'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
