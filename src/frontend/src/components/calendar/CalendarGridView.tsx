import { format, isSameDay, isSameMonth } from 'date-fns';
import { Clock, MapPin, Repeat } from 'lucide-react';
import { Card } from '../Common';
import { Appointment, Group, Investee, RecurringAppointment } from '../../types';

type Holiday = { date: string; name: string };

type Props = {
  days: Date[];
  monthStart: Date;
  selectedDate: Date;
  today: Date;
  groups: Group[];
  investees: Investee[];
  getHolidayForDay: (date: Date) => Holiday | undefined;
  getEventsForDay: (date: Date) => Appointment[];
  getRecurringEventsForDay: (date: Date) => RecurringAppointment[];
  onSelectDate: (date: Date) => void;
  onViewDetail: (event: Appointment) => void;
  onViewRecurringDetail: (rec: RecurringAppointment, day: Date) => void;
};

export const CalendarGridView = ({
  days,
  monthStart,
  selectedDate,
  today,
  groups,
  investees,
  getHolidayForDay,
  getEventsForDay,
  getRecurringEventsForDay,
  onSelectDate,
  onViewDetail,
  onViewRecurringDetail,
}: Props) => {
  const renderEventCard = (event: Appointment, i: number) => (
    <div key={i} className="p-3 bg-surfaceHighlight rounded-lg border border-surfaceHighlight hover:border-sidebarTextActive transition-colors group relative cursor-pointer" onClick={() => onViewDetail(event)}>
      <div className="flex justify-between items-start mb-1">
        <span className="font-semibold text-text text-left">{event.meeting_type}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ml-2 ${event.status === 'Completed' ? 'bg-green-500/20 text-green-400' : event.status === 'Cancelled' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
          {event.status}
        </span>
      </div>
      <div className="text-xs text-textMuted space-y-0.5">
        <div className="flex items-center gap-1.5"><Clock size={12} /><span>{event.planned_start} - {event.planned_end}</span></div>
        {event.group_id && <div className="flex items-center gap-1.5"><MapPin size={12} /><span>{groups.find((g) => g.group_id === event.group_id)?.group_name || 'Unknown Group'}</span></div>}
      </div>
    </div>
  );

  return (
    <div className="flex gap-6 h-[calc(100vh-12rem)]">
      <Card className="flex-1 flex flex-col h-full bg-surface border-none shadow-2xl">
        <div className="grid grid-cols-7 border-b border-surfaceHighlight bg-surface/30">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="py-4 text-center font-semibold text-primary/80 uppercase text-xs tracking-wider">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 flex-1 auto-rows-fr">
          {days.map((day) => {
            const isSelected = isSameDay(day, selectedDate);
            const isToday = isSameDay(day, today);
            const isCurrentMonth = isSameMonth(day, monthStart);
            const holiday = getHolidayForDay(day);
            const events = getEventsForDay(day);
            const recEvents = isCurrentMonth ? getRecurringEventsForDay(day) : [];

            return (
              <div
                key={day.toString()}
                onClick={() => onSelectDate(day)}
                className={`
                  min-h-[100px] border-b border-r border-surfaceHighlight/50 p-2 relative cursor-pointer group transition-colors
                  ${!isCurrentMonth ? 'bg-surfaceHighlight/30 text-textMuted/30' : 'bg-transparent'}
                  ${isSelected ? 'bg-primary/20 ring-1 ring-inset ring-primary' : 'hover:bg-surfaceHighlight/20'}
                  ${holiday ? 'bg-red-900/10' : ''}
                `}
              >
                <div className="flex justify-between items-start">
                  {holiday && (
                    <span className="text-xs font-medium text-red-400 italic truncate max-w-[70%]">
                      {holiday.name}
                    </span>
                  )}
                  <span
                    className={`
                      text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ml-auto
                      ${isToday ? 'bg-primary text-white shadow-lg shadow-primary/40' : ''}
                      ${isSelected && !isToday ? 'text-primary' : 'text-textMuted'}
                      ${!isCurrentMonth ? 'invisible' : ''}
                    `}
                  >
                    {format(day, 'd')}
                  </span>
                </div>

                <div className="mt-2 text-xs space-y-1">
                  {events.map((event, i) => (
                    <div key={`a${i}`} onClick={(e) => { e.stopPropagation(); onViewDetail(event); }} className={`px-1.5 py-0.5 rounded border-l-2 truncate cursor-pointer hover:opacity-80 transition-opacity ${event.rec_app_id ? 'bg-blue-500/20 text-blue-300 border-blue-500' : event.status === 'Cancelled' ? 'bg-red-500/20 text-red-300 border-red-500 line-through' : 'bg-primary/20 text-primary border-primary'}`}>
                      {event.planned_start} {event.meeting_type}
                    </div>
                  ))}
                  {recEvents.map((rec, i) => (
                    <div key={`r${i}`} onClick={(e) => { e.stopPropagation(); onViewRecurringDetail(rec, day); }} className="px-1.5 py-0.5 rounded border-l-2 truncate bg-violet-500/20 text-violet-300 border-violet-500 cursor-pointer hover:opacity-80 transition-opacity">
                      <Repeat size={9} className="inline mr-1" />{rec.planned_start ? `${rec.planned_start} ` : ''}{rec.meeting_type || 'Recurring'}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="w-80 space-y-4">
        <Card className="h-full flex flex-col bg-surface border-surfaceHighlight">
          <div className="p-6 border-b border-surfaceHighlight bg-surfaceHighlight/10">
            <h3 className="text-xl font-bold text-text">{format(selectedDate, 'EEEE')}</h3>
            <p className="text-textMuted">{format(selectedDate, 'MMMM do, yyyy')}</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {getHolidayForDay(selectedDate) && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <span className="text-red-400 font-medium flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  {getHolidayForDay(selectedDate)?.name}
                </span>
              </div>
            )}

            {(() => {
              const dayEvents = getEventsForDay(selectedDate);
              const dayRecurring = getRecurringEventsForDay(selectedDate);
              const hasHoliday = !!getHolidayForDay(selectedDate);
              if (dayEvents.length === 0 && dayRecurring.length === 0 && !hasHoliday) {
                return <div className="text-center py-10 text-textMuted">No events scheduled for this day.</div>;
              }
              return (
                <>
                  {dayEvents.map((event, i) => renderEventCard(event, i))}
                  {dayRecurring.map((rec, i) => (
                    <div key={`rec-${i}`} className="p-3 bg-violet-500/10 rounded-lg border border-violet-500/30 cursor-pointer hover:border-violet-400 transition-colors" onClick={() => onViewRecurringDetail(rec, selectedDate)}>
                      <div className="flex items-center gap-2 mb-1">
                        <Repeat size={14} className="text-violet-400" />
                        <span className="font-semibold text-text text-sm">{rec.meeting_type || 'Recurring Event'}</span>
                      </div>
                      {(rec.planned_start || rec.planned_end) && (
                        <div className="text-xs text-textMuted flex items-center gap-1.5 mb-0.5"><Clock size={12} /><span>{rec.planned_start || '-'} - {rec.planned_end || '-'}</span></div>
                      )}
                      <p className="text-xs text-textMuted">{rec.frequency} series · {groups.find((g) => g.group_id === rec.group_id)?.group_name || 'Unknown Group'}</p>
                      {rec.investee_id && <p className="text-xs text-textMuted mt-0.5">{investees.find((iv) => iv.investee_id === rec.investee_id)?.investee_name || 'Unknown Investee'}</p>}
                    </div>
                  ))}
                </>
              );
            })()}
          </div>
        </Card>
      </div>
    </div>
  );
};
