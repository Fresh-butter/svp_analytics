import { useState, useEffect } from 'react';
import { Card } from '../components/Common';
import {
  BarChart2,
  Users,
  Calendar,
  Target,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { AttendanceByPartner } from '../components/analytics/AttendanceByPartner';
import { MetricsByCategory } from '../components/analytics/MetricsByCategory';
import { MonthlyEngagement } from '../components/analytics/MonthlyEngagement';
import { InvesteeAnalytics } from '../components/analytics/InvesteeAnalytics';
import type {
  AnalyticsPartner,
  AnalyticsCategory,
  AnalyticsMonthlyVideo,
  AnalyticsInvestee,
} from '../components/analytics/analyticsTypes';
import {
  getAttendanceByPartner,
  getMetricsByCategory,
  getMonthlyEngagement,
  getInvesteeAnalytics,
} from '../services/analyticsService';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
  ArcElement,
} from 'chart.js';

// Register ChartJS components once
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
  ArcElement
);

type AnalyticsTab = 'attendance' | 'categories' | 'monthly' | 'investees';

const generateMonthOptions = () => {
  const opts: { value: string; label: string }[] = [];
  const now = new Date();
  const endYear = now.getFullYear();
  const endMonth = now.getMonth() + 1;
  for (let y = 2023, m = 1; y < endYear || (y === endYear && m <= endMonth);) {
    const val = `${y}-${String(m).padStart(2, '0')}`;
    opts.push({
      value: val,
      label: new Date(y, m - 1, 1).toLocaleString('default', { month: 'short', year: 'numeric' }),
    });
    if (++m > 12) {
      m = 1;
      y++;
    }
  }
  return opts;
};

const MONTH_OPTIONS = generateMonthOptions();

export const AnalyticsPage = () => {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('attendance');
  const [fromMonth, setFromMonth] = useState(MONTH_OPTIONS[0]?.value || '2023-01');
  const [toMonth, setToMonth] = useState(MONTH_OPTIONS[MONTH_OPTIONS.length - 1]?.value || '2026-03');

  // Tab-specific data states
  const [attendanceData, setAttendanceData] = useState<AnalyticsPartner[]>([]);
  const [categoriesData, setCategoriesData] = useState<AnalyticsCategory[]>([]);
  const [monthlyData, setMonthlyData] = useState<AnalyticsMonthlyVideo[]>([]);
  const [investeesData, setInvesteesData] = useState<AnalyticsInvestee[]>([]);

  // Loading state per tab
  const [loadingTab, setLoadingTab] = useState<AnalyticsTab | null>('attendance');
  const [error, setError] = useState<string | null>(null);

  // Load data for active tab
  useEffect(() => {
    let cancelled = false;
    setLoadingTab(activeTab);
    setError(null);

    const loadData = async () => {
      try {
        switch (activeTab) {
          case 'attendance':
            const attendance = await getAttendanceByPartner(fromMonth, toMonth);
            if (!cancelled) setAttendanceData(attendance);
            break;
          case 'categories':
            const categories = await getMetricsByCategory(fromMonth, toMonth);
            if (!cancelled) setCategoriesData(categories);
            break;
          case 'monthly':
            const monthly = await getMonthlyEngagement(fromMonth, toMonth);
            if (!cancelled) setMonthlyData(monthly);
            break;
          case 'investees':
            const investees = await getInvesteeAnalytics(fromMonth, toMonth);
            if (!cancelled) setInvesteesData(investees);
            break;
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load analytics data');
        }
      } finally {
        if (!cancelled) setLoadingTab(null);
      }
    };

    loadData();
    return () => {
      cancelled = true;
    };
  }, [activeTab, fromMonth, toMonth]);

  const renderTabContent = () => {
    if (loadingTab === activeTab) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
          <Loader2 size={32} className="text-primary animate-spin" />
          <p className="text-textMuted text-sm">Loading {activeTab} data…</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
          <AlertCircle size={32} className="text-red-400" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      );
    }

    switch (activeTab) {
      case 'attendance':
        return (
          <AttendanceByPartner
            data={attendanceData}
            fromMonth={fromMonth}
            toMonth={toMonth}
            onFromMonthChange={setFromMonth}
            onToMonthChange={setToMonth}
          />
        );
      case 'categories':
        return (
          <MetricsByCategory
            categoryData={categoriesData}
            fromMonth={fromMonth}
            toMonth={toMonth}
            onFromMonthChange={setFromMonth}
            onToMonthChange={setToMonth}
          />
        );
      case 'monthly':
        return (
          <MonthlyEngagement
            data={monthlyData}
            fromMonth={fromMonth}
            toMonth={toMonth}
            onFromMonthChange={setFromMonth}
            onToMonthChange={setToMonth}
          />
        );
      case 'investees':
        return (
          <InvesteeAnalytics
            data={investeesData}
            fromMonth={fromMonth}
            toMonth={toMonth}
            onFromMonthChange={setFromMonth}
            onToMonthChange={setToMonth}
          />
        );
    }
  };

  const tabs = [
    { id: 'attendance' as const, label: 'Attendance by Partner', icon: Users },
    { id: 'categories' as const, label: 'Metrics by Category', icon: BarChart2 },
    { id: 'monthly' as const, label: 'Monthly Engagement', icon: Calendar },
    { id: 'investees' as const, label: 'Investee Analytics', icon: Target },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-text">Analytics Dashboard</h2>
          <p className="text-textMuted mt-1">Detailed insights into partner engagement, meetings, and impact.</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex overflow-x-auto gap-2 border-b border-surfaceHighlight pb-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors
                ${
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-textMuted hover:text-text hover:border-surfaceHighlight'
                }
              `}
            >
              <Icon size={18} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <div className="min-h-[500px]">
        <Card className="bg-surface border-surfaceHighlight p-6 shadow-sm">{renderTabContent()}</Card>
      </div>
    </div>
  );
};
