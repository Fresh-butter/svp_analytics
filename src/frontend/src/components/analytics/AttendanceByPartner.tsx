import { useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { SharedAnalyticsTable, Column, BarCell } from './SharedAnalyticsTable';
import type { AnalyticsPartner } from './analyticsTypes';
import type { AppointmentType } from '../../types';
import type { Investee } from '../../types';



// Generate months from Jan 2023 to current month as { value: 'YYYY-MM', label: 'Mon Year' }[]
const generateMonthOptions = () => {
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
const MONTH_OPTIONS = generateMonthOptions();

// Vibrant palette — one colour per partner
const PARTNER_COLORS = [
    'rgba(59, 130, 246, 0.8)',
    'rgba(16, 185, 129, 0.8)',
    'rgba(245, 158, 11, 0.8)',
    'rgba(99, 102, 241, 0.8)',
    'rgba(236, 72, 153, 0.8)',
    'rgba(14, 165, 233, 0.8)',
    'rgba(168, 85, 247, 0.8)',
    'rgba(239, 68, 68, 0.8)',
    'rgba(20, 184, 166, 0.8)',
    'rgba(251, 146, 60, 0.8)',
];

interface Props {
    data: AnalyticsPartner[];
    fromMonth: string;
    toMonth: string;
    onFromMonthChange: (value: string) => void;
    onToMonthChange: (value: string) => void;
    appointmentTypes: AppointmentType[];
    appointmentTypeId: string;
    onAppointmentTypeChange: (value: string) => void;
    investees: Investee[];
    investeeId: string;
    onInvesteeChange: (value: string) => void;
}

export const AttendanceByPartner = ({
    data: allData,
    fromMonth,
    toMonth,
    onFromMonthChange,
    onToMonthChange,
    appointmentTypes,
    appointmentTypeId,
    onAppointmentTypeChange,
    investees,
    investeeId,
    onInvesteeChange,
}: Props) => {
    const [chartView, setChartView] = useState<'meetings' | 'hours' | 'attendance'>('meetings');




    const columns: Column<AnalyticsPartner>[] = [
        { header: 'Partner Name', accessor: 'partner_name', sortable: true },
        { header: 'Appointment Type', accessor: 'category', sortable: true },
        { header: 'Investee', accessor: 'investee_name', sortable: true },
        {
            header: 'Meetings Attended', accessor: 'meetings_attended', sortable: true,
            render: (v) => <BarCell value={v} max={Math.max(...allData.map(d => d.meetings_attended), 1)} color="bg-blue-500" />
        },
        {
            header: 'Meetings Accepted', accessor: 'meetings_accepted', sortable: true,
            render: (v) => <BarCell value={Number(v) || 0} max={Math.max(...allData.map(d => d.meetings_accepted || 0), 1)} color="bg-indigo-500" />
        },
        {
            header: 'Hours Spent', accessor: 'hours_spent', sortable: true,
            render: (v) => <BarCell value={v} max={Math.max(...allData.map(d => d.hours_spent), 1)} color="bg-emerald-500" />
        },
        {
            header: 'Attendance %', accessor: 'attendance_percentage', sortable: true,
            render: (v) => <BarCell value={typeof v === 'number' ? v : (Number(v) || 0)} max={100} color="bg-amber-500" />
        },
        { header: 'Last Meeting', accessor: 'last_meeting_date', sortable: true },
    ];

    const chartData = {
        labels: allData.map(d => d.partner_name),
        datasets: [
            {
                label: chartView === 'meetings' ? 'Meetings Attended' : 'Hours Spent',
                data: allData.map(d => chartView === 'meetings' ? d.meetings_attended : d.hours_spent),
                backgroundColor: allData.map((_, i) => PARTNER_COLORS[i % PARTNER_COLORS.length]),
                borderColor: allData.map((_, i) => PARTNER_COLORS[i % PARTNER_COLORS.length].replace('0.8', '1')),
                borderWidth: 0,
                borderRadius: 8,
                borderSkipped: false,
            },
        ],
    };

    return (
        <div className="space-y-6">

            {/* Filters */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-surfaceHighlight/10 p-4 rounded-lg border border-surfaceHighlight">
                <div>
                    <label className="block text-xs font-medium text-textMuted mb-1">From Month</label>
                    <select
                        className="w-full bg-surface border border-surfaceHighlight rounded-lg px-3 py-2 text-sm text-text"
                        value={fromMonth}
                        onChange={(e) => onFromMonthChange(e.target.value)}
                    >
                        {MONTH_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-textMuted mb-1">To Month</label>
                    <select
                        className="w-full bg-surface border border-surfaceHighlight rounded-lg px-3 py-2 text-sm text-text"
                        value={toMonth}
                        onChange={(e) => onToMonthChange(e.target.value)}
                    >
                        {MONTH_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-textMuted mb-1">Appointment Type</label>
                    <select
                        className="w-full bg-surface border border-surfaceHighlight rounded-lg px-3 py-2 text-sm text-text"
                        value={appointmentTypeId}
                        onChange={(e) => onAppointmentTypeChange(e.target.value)}
                    >
                        <option value="">All Appointment Types</option>
                        {appointmentTypes.map((t) => (
                            <option key={t.appointment_type_id} value={t.appointment_type_id}>{t.type_name}</option>
                        ))}
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

            {/* Chart Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text">Partner Performance</h3>
                <div className="flex items-center gap-3">
                        <div className="flex bg-surfaceHighlight/30 rounded-lg border border-surfaceHighlight p-1 gap-1">
                            {(['meetings', 'hours', 'attendance'] as const).map(v => (
                                <button
                                    key={v}
                                    onClick={() => setChartView(v)}
                                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${chartView === v ? 'bg-primary text-white' : 'text-textMuted hover:text-text'}`}
                                >
                                    {v === 'meetings' ? 'Meetings' : v === 'hours' ? 'Hours' : 'Attendance %'}
                                </button>
                            ))}
                        </div>
                </div>
            </div>

            {/* Chart */}
            <div className="bg-surface p-5 rounded-xl border border-surfaceHighlight h-80">
                <Bar
                    data={
                        chartView === 'attendance'
                            ? {
                                    labels: chartData.labels,
                                    datasets: [
                                        {
                                            label: 'Attendance %',
                                            data: allData.map(d => {
                                                if (typeof d.attendance_percentage === 'number') return d.attendance_percentage;
                                                if (d.meetings_accepted && d.meetings_accepted > 0) return (d.meetings_attended / d.meetings_accepted) * 100;
                                                return 0;
                                            }),
                                            backgroundColor: allData.map((_, i) => PARTNER_COLORS[i % PARTNER_COLORS.length]),
                                            borderColor: allData.map((_, i) => PARTNER_COLORS[i % PARTNER_COLORS.length].replace('0.8', '1')),
                                            borderWidth: 0,
                                            borderRadius: 8,
                                            borderSkipped: false,
                                        },
                                    ]
                                  }
                            : chartData
                    }
                    options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false },
                            tooltip: {
                                callbacks: {
                                    label: (ctx) => chartView === 'attendance' ? ` ${ctx.parsed.y}%` : ` ${ctx.parsed.y} ${chartView === 'meetings' ? 'meetings' : 'hours'}`
                                }
                            }
                        },
                        scales: {
                            x: {
                                grid: { display: false },
                                ticks: { font: { size: 11 }, maxRotation: 30 }
                            },
                            y: {
                                grid: { color: 'rgba(148, 163, 184, 0.08)' },
                                ticks: { font: { size: 11 } },
                                beginAtZero: true
                            }
                        }
                    }}
                />
            </div>

            {/* Table */}
            <SharedAnalyticsTable data={allData} columns={columns} defaultSort="meetings_attended" />
        </div>
    );
};
