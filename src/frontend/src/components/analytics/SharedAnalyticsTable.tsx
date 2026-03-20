import React, { useState, useMemo, useCallback } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

export interface Column<T> {
    header: string;
    accessor: keyof T | ((row: T) => unknown);
    sortable?: boolean;
    render?: (value: unknown, row: T) => React.ReactNode;
}

interface SharedAnalyticsTableProps<T> {
    data: T[];
    columns: Column<T>[];
    defaultSort?: keyof T;
}

export const BarCell = ({ value, max, color = 'bg-primary' }: { value: unknown; max: number; color?: string }) => {
    const numericValue = typeof value === 'number' ? value : Number(value) || 0;
    const pct = max > 0 ? Math.min(Math.round((numericValue / max) * 100), 100) : 0;
    return (
        <div className="flex items-center gap-3 min-w-[120px]">
            <span className="w-10 text-right text-sm text-text shrink-0 font-medium">{numericValue}</span>
            <div className="flex-1 bg-surfaceHighlight rounded-full h-2 overflow-hidden">
                <div
                    className={`h-full rounded-full ${color} transition-all duration-300`}
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
};

export function SharedAnalyticsTable<T>({ data, columns, defaultSort }: SharedAnalyticsTableProps<T>) {
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(
        defaultSort ? { key: defaultSort as string, direction: 'desc' } : null
    );

    const getValue = useCallback((item: T, column: Column<T>) => {
        if (typeof column.accessor === 'function') {
            return column.accessor(item);
        }
        return item[column.accessor];
    }, []);

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedData = useMemo(() => {
        if (!sortConfig) return data;

        const getSortValue = (row: T): unknown => {
            const colIndex = Number(sortConfig.key);
            if (Number.isInteger(colIndex) && colIndex >= 0 && colIndex < columns.length) {
                return getValue(row, columns[colIndex]);
            }
            return (row as Record<string, unknown>)[sortConfig.key];
        };

        return [...data].sort((a, b) => {
            const aValue = getSortValue(a);
            const bValue = getSortValue(b);

            if (aValue == null && bValue == null) return 0;
            if (aValue == null) return sortConfig.direction === 'asc' ? -1 : 1;
            if (bValue == null) return sortConfig.direction === 'asc' ? 1 : -1;

            const aComparable = typeof aValue === 'number' ? aValue : String(aValue);
            const bComparable = typeof bValue === 'number' ? bValue : String(bValue);

            if (aComparable < bComparable) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aComparable > bComparable) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [data, sortConfig, columns, getValue]);

    return (
        <div className="overflow-x-auto rounded-lg border border-surfaceHighlight">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-surfaceHighlight/20 border-b border-surfaceHighlight">
                        {columns.map((col, index) => {
                            // Determine key for sorting
                            const sortKey = typeof col.accessor === 'string' ? col.accessor : index.toString();
                            
                            return (
                                <th 
                                    key={index}
                                    className={`px-4 py-3 text-xs font-semibold text-textMuted uppercase tracking-wider ${col.sortable ? 'cursor-pointer hover:bg-surfaceHighlight/30 transition-colors' : ''}`}
                                    onClick={() => col.sortable && handleSort(sortKey)}
                                >
                                    <div className="flex items-center gap-2">
                                        {col.header}
                                        {col.sortable && (
                                            <span className="text-textMuted/50">
                                                {sortConfig?.key === sortKey ? (
                                                    sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                                                ) : (
                                                    <ArrowUpDown size={14} />
                                                )}
                                            </span>
                                        )}
                                    </div>
                                </th>
                            );
                        })}
                    </tr>
                </thead>
                <tbody className="divide-y divide-surfaceHighlight bg-surface">
                    {sortedData.map((row, rowIndex) => (
                        <tr key={rowIndex} className="hover:bg-surfaceHighlight/10 transition-colors">
                            {columns.map((col, colIndex) => (
                                <td key={colIndex} className="px-4 py-3 text-sm text-text">
                                    {(() => {
                                        const rawValue = getValue(row, col);
                                        if (col.render) {
                                            return col.render(rawValue, row);
                                        }
                                        if (
                                            typeof rawValue === 'string' ||
                                            typeof rawValue === 'number' ||
                                            typeof rawValue === 'boolean'
                                        ) {
                                            return rawValue;
                                        }
                                        return rawValue == null ? '' : String(rawValue);
                                    })()}
                                </td>
                            ))}
                        </tr>
                    ))}
                    {sortedData.length === 0 && (
                        <tr>
                            <td colSpan={columns.length} className="px-4 py-8 text-center text-textMuted italic">
                                No data available matching filters.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
