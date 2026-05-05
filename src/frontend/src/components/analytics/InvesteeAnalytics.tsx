import { Bar, Doughnut } from 'react-chartjs-2';
import { SharedAnalyticsTable, Column, BarCell } from './SharedAnalyticsTable';
import type { AnalyticsInvestee } from './analyticsTypes';

// Months from Jan 2023 to current
const invGenMonths = () => {
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
const INV_MONTH_OPTIONS = invGenMonths();

const INV_PALETTE = [
    { bg: 'rgba(59, 130, 246, 0.8)', solid: 'rgb(59, 130, 246)', light: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.3)', text: 'text-blue-400' },
    { bg: 'rgba(16, 185, 129, 0.8)', solid: 'rgb(16, 185, 129)', light: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.3)', text: 'text-emerald-400' },
    { bg: 'rgba(245, 158, 11, 0.8)', solid: 'rgb(245, 158, 11)', light: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.3)', text: 'text-amber-400' },
    { bg: 'rgba(168, 85, 247, 0.8)', solid: 'rgb(168, 85, 247)', light: 'rgba(168, 85, 247, 0.1)', border: 'rgba(168, 85, 247, 0.3)', text: 'text-purple-400' },
    { bg: 'rgba(239, 68, 68, 0.8)', solid: 'rgb(239, 68, 68)', light: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.3)', text: 'text-red-400' },
];

interface Props {
    data: AnalyticsInvestee[];
    fromMonth: string;
    toMonth: string;
    onFromMonthChange: (value: string) => void;
    onToMonthChange: (value: string) => void;
}

export const InvesteeAnalytics = ({
    data: allData,
    fromMonth,
    toMonth,
    onFromMonthChange,
    onToMonthChange,
}: Props) => {
    const filteredData = allData;

    const columns: Column<AnalyticsInvestee>[] = [
        { header: 'Investee Name', accessor: 'investee_name', sortable: true },
        {
            header: 'Total Meetings', accessor: 'meetings_count', sortable: true,
            render: (v) => <BarCell value={v} max={Math.max(...filteredData.map(d => d.meetings_count), 1)} color="bg-blue-500" />
        },
        {
            header: 'Meetings Accepted', accessor: 'meetings_accepted', sortable: true,
            render: (v) => <BarCell value={Number(v) || 0} max={Math.max(...filteredData.map(d => d.meetings_accepted || 0), 1)} color="bg-indigo-500" />
        },
        {
            header: 'Total Hours', accessor: 'hours_spent', sortable: true,
            render: (v) => <BarCell value={v} max={Math.max(...filteredData.map(d => d.hours_spent), 1)} color="bg-emerald-500" />
        },
        {
            header: 'Avg Duration (min)', accessor: 'avg_meeting_duration', sortable: true,
            render: (v) => <BarCell value={v} max={Math.max(...filteredData.map(d => d.avg_meeting_duration), 1)} color="bg-amber-500" />
        },
        { header: 'Attendance %', accessor: 'attendance_percentage', sortable: true, render: (v) => <BarCell value={typeof v === 'number' ? v : (Number(v) || 0)} max={100} color="bg-amber-500" /> },
    ];

    const doughnutData = {
        labels: filteredData.map(d => d.investee_name),
        datasets: [{
            label: 'Hours Spent',
            data: filteredData.map(d => d.hours_spent),
            backgroundColor: filteredData.map((_, i) => INV_PALETTE[i % INV_PALETTE.length].bg),
            borderColor: filteredData.map((_, i) => INV_PALETTE[i % INV_PALETTE.length].solid),
            borderWidth: 2,
            hoverOffset: 10,
            spacing: 3,
        }],
    };

    const barData = {
        labels: filteredData.map(d => d.investee_name),
        datasets: [{
            label: 'Meetings',
            data: filteredData.map(d => d.meetings_count),
            backgroundColor: filteredData.map((_, i) => INV_PALETTE[i % INV_PALETTE.length].bg),
            borderColor: filteredData.map((_, i) => INV_PALETTE[i % INV_PALETTE.length].solid),
            borderWidth: 0,
            borderRadius: 8,
            borderSkipped: false,
        }]
    };



    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="grid grid-cols-2 gap-4 bg-surfaceHighlight/10 p-4 rounded-lg border border-surfaceHighlight">
                <div>
                    <label className="block text-xs font-medium text-textMuted mb-1">From Month</label>
                    <select
                        className="w-full bg-surface border border-surfaceHighlight rounded-lg px-3 py-2 text-sm text-text"
                        value={fromMonth}
                        onChange={(e) => onFromMonthChange(e.target.value)}
                    >
                        {INV_MONTH_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-textMuted mb-1">To Month</label>
                    <select
                        className="w-full bg-surface border border-surfaceHighlight rounded-lg px-3 py-2 text-sm text-text"
                        value={toMonth}
                        onChange={(e) => onToMonthChange(e.target.value)}
                    >
                        {INV_MONTH_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>
            </div>


            {/* Charts side by side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-surface p-5 rounded-xl border border-surfaceHighlight h-80 flex flex-col">
                    <p className="text-xs font-semibold text-textMuted uppercase tracking-wider mb-3">Hours Distribution</p>
                    <div className="flex-1 flex items-center justify-center">
                        <Doughnut
                            data={{
                                ...doughnutData,
                                datasets: [
                                    {
                                        ...doughnutData.datasets[0],
                                    }
                                ]
                            }}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                cutout: '58%',
                                plugins: {
                                    legend: { position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle', padding: 14, font: { size: 11 } } }
                                }
                            }}
                        />
                    </div>
                </div>
                <div className="bg-surface p-5 rounded-xl border border-surfaceHighlight h-80 flex flex-col">
                    <p className="text-xs font-semibold text-textMuted uppercase tracking-wider mb-3">Meetings by Investee</p>
                    <div className="flex-1">
                        <Bar
                            data={{
                                ...barData,
                                datasets: [
                                    ...barData.datasets,
                                    {
                                        label: 'Attendance %',
                                        data: filteredData.map(d => {
                                            if (typeof d.attendance_percentage === 'number') return d.attendance_percentage;
                                            const accepted = Number(d.meetings_accepted ?? 0);
                                            const attended = Number(d.meetings_attended ?? 0);
                                            return accepted > 0 ? (attended / accepted) * 100 : 0;
                                        }),
                                        backgroundColor: filteredData.map((_, i) => INV_PALETTE[i % INV_PALETTE.length].light),
                                        borderColor: filteredData.map((_, i) => INV_PALETTE[i % INV_PALETTE.length].solid),
                                        borderWidth: 0,
                                        borderRadius: 8,
                                        borderSkipped: false,
                                        type: 'bar' as const,
                                    }
                                ]
                            }}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                indexAxis: 'y' as const,
                                plugins: { legend: { display: false } },
                                scales: {
                                    x: { grid: { color: 'rgba(148, 163, 184, 0.08)' }, beginAtZero: true, ticks: { font: { size: 11 } } },
                                    y: { grid: { display: false }, ticks: { font: { size: 11 } } }
                                }
                            }}
                        />
                    </div>
                </div>
            </div>

            <SharedAnalyticsTable data={filteredData} columns={columns} defaultSort="hours_spent" />
        </div>
    );
};
