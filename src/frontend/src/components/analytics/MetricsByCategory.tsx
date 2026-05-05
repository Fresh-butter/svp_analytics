import { useState } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import { SharedAnalyticsTable, Column, BarCell } from './SharedAnalyticsTable';
import type { AnalyticsCategory } from './analyticsTypes';

// Months from Jan 2023 to current
const catGenMonths = () => {
    const opts: { value: string; label: string }[] = [];
    const now = new Date();
    const endYear = now.getFullYear();
    const endMonth = now.getMonth() + 1;
    for (let y = 2023, m = 1; y < endYear || (y === endYear && m <= endMonth);) {
        const val = `${y}-${String(m).padStart(2, '0')}`;
        opts.push({ value: val, label: new Date(y, m - 1, 1).toLocaleString('default', { month: 'short', year: 'numeric' }) });
        if (++m > 12) { m = 1; y++; }
    }
    return opts.reverse();
};
const CAT_MONTH_OPTIONS = catGenMonths();

const CATEGORY_PALETTE = [
    { bg: 'rgba(59, 130, 246, 0.8)', solid: 'rgb(59, 130, 246)', light: 'rgba(59, 130, 246, 0.12)', text: 'text-blue-400' },
    { bg: 'rgba(16, 185, 129, 0.8)', solid: 'rgb(16, 185, 129)', light: 'rgba(16, 185, 129, 0.12)', text: 'text-emerald-400' },
    { bg: 'rgba(245, 158, 11, 0.8)', solid: 'rgb(245, 158, 11)', light: 'rgba(245, 158, 11, 0.12)', text: 'text-amber-400' },
    { bg: 'rgba(168, 85, 247, 0.8)', solid: 'rgb(168, 85, 247)', light: 'rgba(168, 85, 247, 0.12)', text: 'text-purple-400' },
    { bg: 'rgba(239, 68, 68, 0.8)', solid: 'rgb(239, 68, 68)', light: 'rgba(239, 68, 68, 0.12)', text: 'text-red-400' },
];

interface Props {
    categoryData: AnalyticsCategory[];
    fromMonth: string;
    toMonth: string;
    onFromMonthChange: (value: string) => void;
    onToMonthChange: (value: string) => void;
}

export const MetricsByCategory = ({
    categoryData,
    fromMonth,
    toMonth,
    onFromMonthChange,
    onToMonthChange,
}: Props) => {
    // Filters
    // Chart Metric Selector
    const [selectedMetric, setSelectedMetric] = useState<'meetings' | 'hours' | 'distinct_partners' | 'avg_duration_minutes' | 'attendance'>('hours');

    const filteredData = categoryData;

    const columns: Column<AnalyticsCategory>[] = [
        { header: 'Appointment Type', accessor: 'category', sortable: true },
        {
            header: 'Distinct Partners', accessor: 'distinct_partners', sortable: true,
            render: (v) => <BarCell value={v} max={Math.max(...filteredData.map(d => d.distinct_partners), 1)} color="bg-blue-500" />
        },
        {
            header: 'Total Hours', accessor: 'hours', sortable: true,
            render: (v) => <BarCell value={v} max={Math.max(...filteredData.map(d => d.hours), 1)} color="bg-emerald-500" />
        },
        {
            header: 'Total Meetings', accessor: 'meetings', sortable: true,
            render: (v) => <BarCell value={v} max={Math.max(...filteredData.map(d => d.meetings), 1)} color="bg-blue-500" />
        },
        {
            header: 'Meetings Accepted', accessor: 'meetings_accepted', sortable: true,
            render: (v) => <BarCell value={Number(v) || 0} max={Math.max(...filteredData.map(d => d.meetings_accepted || 0), 1)} color="bg-indigo-500" />
        },
        {
            header: 'Avg Duration (min)', accessor: 'avg_duration_minutes', sortable: true,
            render: (v) => <BarCell value={v} max={Math.max(...filteredData.map(d => d.avg_duration_minutes), 1)} color="bg-amber-500" />
        },
    ];

    const metricLabel: Record<string, string> = {
        hours: 'Total Hours',
        meetings: 'Total Meetings',
        distinct_partners: 'Distinct Partners',
        avg_duration_minutes: 'Avg Duration (min)',
        attendance: 'Attendance %',
    };

    const barChartData = {
        labels: filteredData.map(d => d.category),
        datasets: [
            {
                label: metricLabel[selectedMetric],
                data: filteredData.map(d => {
                    if (selectedMetric === 'attendance') {
                        if (typeof d.attendance_percentage === 'number') return d.attendance_percentage;
                        const accepted = Number(d.meetings_accepted ?? 0);
                        const attended = Number(d.meetings_attended ?? 0);
                        return accepted > 0 ? (attended / accepted) * 100 : 0;
                    }
                    // @ts-ignore - fallback for other metrics
                    return d[selectedMetric];
                }),
                backgroundColor: filteredData.map((_, i) => CATEGORY_PALETTE[i % CATEGORY_PALETTE.length].bg),
                borderColor: filteredData.map((_, i) => CATEGORY_PALETTE[i % CATEGORY_PALETTE.length].solid),
                borderWidth: 0,
                borderRadius: 8,
                borderSkipped: false,
            },
        ],
    };

    const doughnutData = {
        labels: filteredData.map(d => d.category),
        datasets: [{
            data: filteredData.map(d => {
                if (selectedMetric === 'attendance') {
                    if (typeof d.attendance_percentage === 'number') return d.attendance_percentage;
                    const accepted = Number(d.meetings_accepted ?? 0);
                    const attended = Number(d.meetings_attended ?? 0);
                    return accepted > 0 ? (attended / accepted) * 100 : 0;
                }
                // @ts-ignore - fallback for other metrics
                return d[selectedMetric];
            }),
            backgroundColor: filteredData.map((_, i) => CATEGORY_PALETTE[i % CATEGORY_PALETTE.length].bg),
            borderColor: filteredData.map((_, i) => CATEGORY_PALETTE[i % CATEGORY_PALETTE.length].solid),
            borderWidth: 2,
            hoverOffset: 10,
            spacing: 3,
        }],
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 bg-surfaceHighlight/10 p-4 rounded-lg border border-surfaceHighlight justify-between items-end">
                <div className="flex gap-4 w-full md:w-auto">
                    <div>
                        <label className="block text-xs font-medium text-textMuted mb-1">From Month</label>
                        <select
                            className="bg-surface border border-surfaceHighlight rounded-lg px-3 py-2 text-sm text-text"
                            value={fromMonth}
                            onChange={(e) => onFromMonthChange(e.target.value)}
                        >
                            {CAT_MONTH_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-textMuted mb-1">To Month</label>
                        <select
                            className="bg-surface border border-surfaceHighlight rounded-lg px-3 py-2 text-sm text-text"
                            value={toMonth}
                            onChange={(e) => onToMonthChange(e.target.value)}
                        >
                            {CAT_MONTH_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    </div>
                </div>
                <div className="w-full md:w-auto flex items-center gap-3">
                    <label className="block text-xs font-medium text-textMuted mb-1">Chart Metric</label>
                    <div className="flex bg-surface rounded-lg border border-surfaceHighlight p-1">
                        {(['hours', 'meetings', 'distinct_partners', 'avg_duration_minutes', 'attendance'] as const).map(m => (
                            <button
                                key={m}
                                onClick={() => setSelectedMetric(m)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${selectedMetric === m ? 'bg-primary text-white' : 'text-textMuted hover:text-text'}`}
                            >
                                {m === 'distinct_partners' ? 'Partners' : m === 'avg_duration_minutes' ? 'Avg Dur.' : m === 'attendance' ? 'Attendance %' : m.charAt(0).toUpperCase() + m.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bar + Doughnut side by side */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                <div className="md:col-span-3 bg-surface p-5 rounded-xl border border-surfaceHighlight h-72">
                    <p className="text-xs font-semibold text-textMuted uppercase tracking-wider mb-3">{metricLabel[selectedMetric]} by Appointment Type</p>
                    <Bar
                        data={barChartData}
                        options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: { display: false },
                            },
                            scales: {
                                x: { grid: { display: false }, ticks: { font: { size: 11 } } },
                                y: { grid: { color: 'rgba(148, 163, 184, 0.08)' }, ticks: { font: { size: 11 } }, beginAtZero: true }
                            }
                        }}
                    />
                </div>
                <div className="md:col-span-2 bg-surface p-5 rounded-xl border border-surfaceHighlight h-72 flex flex-col items-center justify-center">
                    <p className="text-xs font-semibold text-textMuted uppercase tracking-wider mb-3 self-start">Distribution</p>
                    <div className="w-full flex-1 flex items-center justify-center">
                        <Doughnut
                            data={doughnutData}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                cutout: '60%',
                                plugins: {
                                    legend: {
                                        position: 'bottom',
                                        labels: { usePointStyle: true, pointStyle: 'circle', padding: 12, font: { size: 11 } }
                                    },
                                }
                            }}
                        />
                    </div>
                </div>
            </div>

            <SharedAnalyticsTable data={filteredData} columns={columns} defaultSort="hours" />
        </div>
    );
};
