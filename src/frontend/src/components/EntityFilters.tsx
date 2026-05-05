import { Search, Filter, Download } from 'lucide-react';
import { hasPartialRange } from '../utils/dateFilters';
import type { ReactNode } from 'react';

type DateRange = {
  start: string;
  end: string;
};

type ActiveFilter = 'all' | 'active' | 'inactive';

type EntityFiltersProps = {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  searchPlaceholder: string;
  showFilters: boolean;
  onToggleFilters: () => void;
  onExport: () => void;
  dateFilter: DateRange;
  onDateFilterChange: (value: DateRange) => void;
  endDateFilter: DateRange;
  onEndDateFilterChange: (value: DateRange) => void;
  activeFilter?: ActiveFilter;
  onActiveFilterChange?: (value: ActiveFilter) => void;
  filterLabel?: string;
  inlineControls?: ReactNode;
};

export const EntityFilters = ({
  searchTerm,
  onSearchTermChange,
  searchPlaceholder,
  showFilters,
  onToggleFilters,
  onExport,
  dateFilter,
  onDateFilterChange,
  endDateFilter,
  onEndDateFilterChange,
  activeFilter,
  onActiveFilterChange,
  filterLabel = 'Filters',
  inlineControls,
}: EntityFiltersProps) => {
  const canFilterByActive = Boolean(onActiveFilterChange && activeFilter);
  const handleActiveChange = onActiveFilterChange;

  return (
    <>
      <div className="p-4 border-b border-surfaceHighlight flex flex-col md:flex-row gap-4 justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-2.5 text-textMuted" size={18} />
          <input
            type="text"
            placeholder={searchPlaceholder}
            className="w-full bg-surfaceHighlight/30 border border-surfaceHighlight rounded-lg pl-10 pr-4 py-2 text-text outline-none focus:border-primary transition-colors"
            value={searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
          />
        </div>

        <div className="flex gap-2 items-center">
          {canFilterByActive && (
            <div className="flex rounded-lg border border-surfaceHighlight overflow-hidden text-sm">
              {(['all', 'active', 'inactive'] as const).map((value) => (
                <button
                  key={value}
                  onClick={() => handleActiveChange?.(value)}
                  className={`px-3 py-1.5 capitalize transition-colors ${activeFilter === value ? 'bg-primary text-white' : 'bg-surfaceHighlight/30 text-textMuted hover:bg-surfaceHighlight'}`}
                >
                  {value}
                </button>
              ))}
            </div>
          )}

          {inlineControls}

          <button
            onClick={onToggleFilters}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors border rounded-lg ${showFilters ? 'bg-surfaceHighlight text-text border-primary' : 'bg-surfaceHighlight/30 text-text border-surfaceHighlight hover:bg-surfaceHighlight'}`}
          >
            <Filter size={16} />
            {filterLabel}
          </button>

          <button
            onClick={onExport}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors border rounded-lg bg-surfaceHighlight/30 text-text border-surfaceHighlight hover:bg-surfaceHighlight"
          >
            <Download size={16} />
            Export Excel
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="p-4 border-b border-surfaceHighlight bg-surfaceHighlight/10 flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-textMuted mb-1">Start Date From</label>
              <input
                type="date"
                className="w-full bg-surfaceHighlight/30 border border-surfaceHighlight rounded-lg px-3 py-2 text-text text-sm outline-none focus:border-primary"
                value={dateFilter.start}
                onChange={(e) => onDateFilterChange({ ...dateFilter, start: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-textMuted mb-1">Start Date To</label>
              <input
                type="date"
                className="w-full bg-surfaceHighlight/30 border border-surfaceHighlight rounded-lg px-3 py-2 text-text text-sm outline-none focus:border-primary"
                value={dateFilter.end}
                onChange={(e) => onDateFilterChange({ ...dateFilter, end: e.target.value })}
              />
              {hasPartialRange(dateFilter) && (
                <p className="text-xs text-amber-400 mt-1">Both From and To dates are required to filter</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-textMuted mb-1">End Date From</label>
              <input
                type="date"
                className="w-full bg-surfaceHighlight/30 border border-surfaceHighlight rounded-lg px-3 py-2 text-text text-sm outline-none focus:border-primary"
                value={endDateFilter.start}
                onChange={(e) => onEndDateFilterChange({ ...endDateFilter, start: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-textMuted mb-1">End Date To</label>
              <input
                type="date"
                className="w-full bg-surfaceHighlight/30 border border-surfaceHighlight rounded-lg px-3 py-2 text-text text-sm outline-none focus:border-primary"
                value={endDateFilter.end}
                onChange={(e) => onEndDateFilterChange({ ...endDateFilter, end: e.target.value })}
              />
              {hasPartialRange(endDateFilter) && (
                <p className="text-xs text-amber-400 mt-1">Both From and To dates are required to filter</p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                onDateFilterChange({ start: '', end: '' });
                onEndDateFilterChange({ start: '', end: '' });
              }}
              className="text-xs text-primary hover:text-primary/80 transition-colors font-medium"
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}
    </>
  );
};
