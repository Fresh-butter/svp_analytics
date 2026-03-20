import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';

type SortConfig = { key: string; direction: 'asc' | 'desc' } | null;

export const SortIndicator = ({ sortConfig, column }: { sortConfig: SortConfig; column: string }) => {
  if (!sortConfig || sortConfig.key !== column) {
    return <ChevronsUpDown size={14} className="inline ml-1 opacity-40" />;
  }

  return sortConfig.direction === 'asc'
    ? <ChevronUp size={14} className="inline ml-1 text-primary" />
    : <ChevronDown size={14} className="inline ml-1 text-primary" />;
};
