import { Line } from 'react-chartjs-2';
import { SharedAnalyticsTable, Column, BarCell } from './SharedAnalyticsTable';
import type { AnalyticsMonthlyVideo } from './analyticsTypes';
import type { Investee } from '../../types';


// Generate months from Jan 2023 to current month
const genMonthOpts = () => {
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
const ME_MONTH_OPTIONS = genMonthOpts();

interface Props {
    data: AnalyticsMonthlyVideo[];
    fromMonth: string;
    toMonth: string;
    onFromMonthChange: (value: string) => void;
    onToMonthChange: (value: string) => void;
    investees: Investee[];
    investeeId: string;
    onInvesteeChange: (value: string) => void;
}

export const MonthlyEngagement = ({
    data,
    fromMonth,
    toMonth,
    onFromMonthChange,
    onToMonthChange,
    investees,
    investeeId,
    onInvesteeChange,
}: Props) => {
    const columns: Column<AnalyticsMonthlyVideo>[] = [
        { header: 'Month', accessor: 'month', sortable: true },
        {
            header: 'Meetings', accessor: 'meetings_count', sortable: true,
            render: (v) => <BarCell value={v} max={Math.max(...data.map(d => d.meetings_count), 1)} color="bg-blue-500" />
        },
        {
            header: 'Meetings Accepted', accessor: 'meetings_accepted', sortable: true,
            render: (v) => <BarCell value={Number(v) || 0} max={Math.max(...data.map(d => d.meetings_accepted || 0), 1)} color="bg-indigo-500" />
        },
        {
            header: 'Distinct Partners', accessor: 'distinct_partners_engaged', sortable: true,
            render: (v) => <BarCell value={v} max={Math.max(...data.map(d => d.distinct_partners_engaged), 1)} color="bg-emerald-500" />
        },
        { header: 'Attendance %', accessor: 'attendance_percentage', sortable: true, render: (v) => <BarCell value={typeof v === 'number' ? v : (Number(v) || 0)} max={100} color="bg-amber-500" /> },
    ];

    const chartData = {
        labels: data.map(d => {
            const [y, m] = d.month.split('-');
            return new Date(+y, +m - 1, 1).toLocaleString('default', { month: 'short', year: '2-digit' });
        }),
        datasets: [
            {
                label: 'Meetings',
                data: data.map(d => d.meetings_count),
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.12)',
                borderWidth: 2.5,
                pointBackgroundColor: 'rgb(59, 130, 246)',
                pointBorderColor: 'rgba(59, 130, 246, 0.3)',
                pointBorderWidth: 4,
                pointRadius: 5,
                pointHoverRadius: 7,
                tension: 0.4,
                fill: true,
                yAxisID: 'y',
            },
            {
                label: 'Distinct Partners',
                data: data.map(d => d.distinct_partners_engaged),
                borderColor: 'rgb(16, 185, 129)',
                backgroundColor: 'rgba(16, 185, 129, 0.08)',
                borderWidth: 2.5,
                pointBackgroundColor: 'rgb(16, 185, 129)',
                pointBorderColor: 'rgba(16, 185, 129, 0.3)',
                pointBorderWidth: 4,
                pointRadius: 5,
                pointHoverRadius: 7,
                tension: 0.4,
                fill: true,
                yAxisID: 'y1',
            },
        ],
    };

    return (
        <div className="space-y-6">

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-surfaceHighlight/10 p-4 rounded-lg border border-surfaceHighlight">
                <div>
                    <label className="block text-xs font-medium text-textMuted mb-1">From Month</label>
                    <select
                        className="w-full bg-surface border border-surfaceHighlight rounded-lg px-3 py-2 text-sm text-text"
                        value={fromMonth}
                        onChange={(e) => onFromMonthChange(e.target.value)}
                    >
                        {ME_MONTH_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-textMuted mb-1">To Month</label>
                    <select
                        className="w-full bg-surface border border-surfaceHighlight rounded-lg px-3 py-2 text-sm text-text"
                        value={toMonth}
                        onChange={(e) => onToMonthChange(e.target.value)}
                    >
                        {ME_MONTH_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-textMuted mb-1">Investee</label>
                    <select
                        className="w-full bg-surface border border-surfaceHighlight rounded-lg px-3 py-2 text-sm text-text"
                        value={investeeId}
                        onChange={(e) => onInvesteeChange(e.target.value)}
                    >
                        <option value="">All Investees</option>
                        {investees.map((inv) => (
                            <option key={inv.investee_id} value={inv.investee_id}>{inv.investee_name}</option>
                        ))}
                    </select>
                </div>
            </div>


            {/* Chart */}
            <div className="bg-surface p-5 rounded-xl border border-surfaceHighlight h-80">
                <Line
                    data={{
                        labels: chartData.labels,
                        datasets: [
                            ...chartData.datasets,
                            {
                                label: 'Attendance %',
                                data: data.map(d => d.attendance_percentage ?? (d.meetings_accepted ? (Number(d.meetings_attended ?? 0) / d.meetings_accepted) * 100 : 0)),
                                borderColor: 'rgb(245, 158, 11)',
                                backgroundColor: 'rgba(245, 158, 11, 0.08)',
                                yAxisID: 'y1',
                                borderWidth: 2.5,
                                tension: 0.4,
                                pointBackgroundColor: 'rgb(245, 158, 11)',
                                pointBorderWidth: 3,
                                pointRadius: 4,
                            }
                        ]
                    }}
                    options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        interaction: { mode: 'index', intersect: false },
                        plugins: {
                            legend: {
                                labels: { usePointStyle: true, pointStyle: 'circle', padding: 20, font: { size: 12, weight: 'bold' as const } }
                            }
                        },
                        scales: {
                            x: { grid: { display: false }, ticks: { font: { size: 11 } } },
                            y: {
                                type: 'linear',
                                display: true,
                                position: 'left',
                                grid: { color: 'rgba(148, 163, 184, 0.08)' },
                                ticks: { font: { size: 11 } },
                            },
                            y1: {
                                type: 'linear',
                                display: true,
                                position: 'right',
                                grid: { drawOnChartArea: false },
                                ticks: { font: { size: 11 }, callback: (v: any) => `${v}%` },
                                min: 0,
                                max: 100,
                            },
                        }
                    }}
                />
            </div>

            {/* Table */}
            <SharedAnalyticsTable data={data} columns={columns} defaultSort="month" />
        </div>
    );
};
