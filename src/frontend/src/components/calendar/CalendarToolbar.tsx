import { format, isBefore, startOfDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Repeat, LayoutGrid, List, Download } from 'lucide-react';

type CalendarView = 'grid' | 'list';

type Props = {
  currentMonth: Date;
  selectedDate: Date;
  calendarView: CalendarView;
  onToggleView: (view: CalendarView) => void;
  onToday: () => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onExportExcel: () => void;
  onOpenAddEvent: () => void;
  onOpenAddRecurring: () => void;
  canEdit?: boolean;
};

export const CalendarToolbar = ({
  currentMonth,
  selectedDate,
  calendarView,
  onToggleView,
  onToday,
  onPrevMonth,
  onNextMonth,
  onExportExcel,
  onOpenAddEvent,
  onOpenAddRecurring,
  canEdit = true,
}: Props) => {
  const isPastDateSelected = isBefore(selectedDate, startOfDay(new Date()));

  return (
    <div className="flex items-center justify-between">
      <h2 className="text-3xl font-bold text-text">Calendar</h2>

      <div className="flex items-center gap-4">
        <div className="flex items-center bg-surface rounded-lg border border-surfaceHighlight p-1">
          <button
            onClick={() => onToggleView('grid')}
            className={`p-2 rounded-md transition-colors ${calendarView === 'grid' ? 'bg-primary text-white' : 'text-textMuted hover:text-text'}`}
            title="Grid View"
          >
            <LayoutGrid size={18} />
          </button>
          <button
            onClick={() => onToggleView('list')}
            className={`p-2 rounded-md transition-colors ${calendarView === 'list' ? 'bg-primary text-white' : 'text-textMuted hover:text-text'}`}
            title="List View"
          >
            <List size={18} />
          </button>
        </div>

        <button
          onClick={onToday}
          className="px-4 py-2 text-sm font-medium text-text bg-surface border border-surfaceHighlight rounded-md hover:bg-surfaceHighlight transition-colors"
        >
          Today
        </button>

        <div className="flex items-center bg-surface rounded-md border border-surfaceHighlight">
          <button onClick={onPrevMonth} className="p-2 hover:bg-surfaceHighlight hover:text-primary transition-colors">
            <ChevronLeft size={20} />
          </button>
          <span className="px-4 font-semibold text-lg w-48 text-center whitespace-nowrap">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <button onClick={onNextMonth} className="p-2 hover:bg-surfaceHighlight hover:text-primary transition-colors">
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="flex gap-2">
          <div className="relative">
            <button
              onClick={onExportExcel}
              className="flex items-center gap-2 bg-surfaceHighlight hover:bg-surfaceHighlight/80 text-text px-4 py-2 rounded-md transition-shadow"
              title="Export as Excel"
            >
              <Download size={18} />
              <span>Export Excel</span>
            </button>
          </div>

          {canEdit && (
            <>
              <button
                onClick={onOpenAddEvent}
                disabled={isPastDateSelected}
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-shadow shadow-lg shadow-primary/20 ${isPastDateSelected ? 'bg-primary/40 text-white/60 cursor-not-allowed' : 'bg-primary hover:bg-primaryHover text-white'}`}
              >
                <Plus size={18} />
                <span>Event</span>
              </button>

              <button
                onClick={onOpenAddRecurring}
                disabled={isPastDateSelected}
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-shadow ${isPastDateSelected ? 'bg-surfaceHighlight/40 text-textMuted/60 cursor-not-allowed' : 'bg-surfaceHighlight hover:bg-surfaceHighlight/80 text-text'}`}
              >
                <Repeat size={18} />
                <span>Recurring</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
