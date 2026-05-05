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
import { ExportAnalytics } from '../components/analytics/ExportAnalytics';
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
import { lookupService } from '../services/lookupService';
import { investeeService } from '../services/investeeService';
import { AppointmentType } from '../types';
import type { Investee } from '../types';
import {
  getAttendanceByPartner,
  getMetricsByCategory,
  getMonthlyEngagement,
  getInvesteeAnalytics,
} from '../services/analyticsService';
import { DASHBOARD_AUTO_REFRESH_MS } from '../constants/refresh';

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
  const defaultFromMonth = MONTH_OPTIONS[0]?.value || '2023-01';
  const defaultToMonth = MONTH_OPTIONS[MONTH_OPTIONS.length - 1]?.value || '2026-03';

  // Per-tab filters (do not leak between tabs)
  const [attendanceFromMonth, setAttendanceFromMonth] = useState(defaultFromMonth);
  const [attendanceToMonth, setAttendanceToMonth] = useState(defaultToMonth);
  const [attendanceInvesteeId, setAttendanceInvesteeId] = useState('');
  const [categoriesFromMonth, setCategoriesFromMonth] = useState(defaultFromMonth);
  const [categoriesToMonth, setCategoriesToMonth] = useState(defaultToMonth);
  const [monthlyFromMonth, setMonthlyFromMonth] = useState(defaultFromMonth);
  const [monthlyToMonth, setMonthlyToMonth] = useState(defaultToMonth);
  const [monthlyInvesteeId, setMonthlyInvesteeId] = useState('');
  const [investeesFromMonth, setInvesteesFromMonth] = useState(defaultFromMonth);
  const [investeesToMonth, setInvesteesToMonth] = useState(defaultToMonth);

  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>([]);
  const [investeeOptions, setInvesteeOptions] = useState<Investee[]>([]);
  const [attendanceAppointmentTypeId, setAttendanceAppointmentTypeId] = useState('');

  // Tab-specific data states
  const [attendanceData, setAttendanceData] = useState<AnalyticsPartner[]>([]);
  const [categoriesData, setCategoriesData] = useState<AnalyticsCategory[]>([]);
  const [monthlyData, setMonthlyData] = useState<AnalyticsMonthlyVideo[]>([]);
  const [investeesData, setInvesteesData] = useState<AnalyticsInvestee[]>([]);

  // Loading state per tab
  const [loadingTab, setLoadingTab] = useState<AnalyticsTab | null>('attendance');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadLookups = async () => {
      try {
        const [types, investees] = await Promise.all([
          lookupService.listAppointmentTypes(),
          investeeService.getAll(),
        ]);
        if (!cancelled) {
          setAppointmentTypes(types);
          setInvesteeOptions(investees);
        }
      } catch (err) {
        console.error('Failed to load analytics lookups:', err);
      }
    };

    void loadLookups();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (activeTab !== 'attendance') return;

    let cancelled = false;
    let refreshing = false;

    const loadAttendance = async (showLoading: boolean) => {
      if (refreshing) return;
      refreshing = true;
      if (showLoading) {
        setLoadingTab('attendance');
        setError(null);
      }

      try {
        const attendance = await getAttendanceByPartner(
          attendanceFromMonth,
          attendanceToMonth,
          attendanceInvesteeId || undefined,
          attendanceAppointmentTypeId || undefined
        );
        if (!cancelled) setAttendanceData(attendance);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load analytics data');
      } finally {
        if (!cancelled && showLoading) setLoadingTab(null);
        refreshing = false;
      }
    };

    void loadAttendance(true);

    const intervalId = window.setInterval(() => {
      void loadAttendance(false);
    }, DASHBOARD_AUTO_REFRESH_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [activeTab, attendanceFromMonth, attendanceToMonth, attendanceInvesteeId, attendanceAppointmentTypeId]);

  useEffect(() => {
    if (activeTab !== 'categories') return;

    let cancelled = false;
    let refreshing = false;

    const loadCategories = async (showLoading: boolean) => {
      if (refreshing) return;
      refreshing = true;
      if (showLoading) {
        setLoadingTab('categories');
        setError(null);
      }

      try {
        const categories = await getMetricsByCategory(categoriesFromMonth, categoriesToMonth);
        if (!cancelled) setCategoriesData(categories);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load analytics data');
      } finally {
        if (!cancelled && showLoading) setLoadingTab(null);
        refreshing = false;
      }
    };

    void loadCategories(true);

    const intervalId = window.setInterval(() => {
      void loadCategories(false);
    }, DASHBOARD_AUTO_REFRESH_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [activeTab, categoriesFromMonth, categoriesToMonth]);

  useEffect(() => {
    if (activeTab !== 'monthly') return;

    let cancelled = false;
    let refreshing = false;

    const loadMonthly = async (showLoading: boolean) => {
      if (refreshing) return;
      refreshing = true;
      if (showLoading) {
        setLoadingTab('monthly');
        setError(null);
      }

      try {
        const monthly = await getMonthlyEngagement(
          monthlyFromMonth,
          monthlyToMonth,
          monthlyInvesteeId || undefined
        );
        if (!cancelled) setMonthlyData(monthly);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load analytics data');
      } finally {
        if (!cancelled && showLoading) setLoadingTab(null);
        refreshing = false;
      }
    };

    void loadMonthly(true);

    const intervalId = window.setInterval(() => {
      void loadMonthly(false);
    }, DASHBOARD_AUTO_REFRESH_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [activeTab, monthlyFromMonth, monthlyToMonth, monthlyInvesteeId]);

  useEffect(() => {
    if (activeTab !== 'investees') return;

    let cancelled = false;
    let refreshing = false;

    const loadInvestees = async (showLoading: boolean) => {
      if (refreshing) return;
      refreshing = true;
      if (showLoading) {
        setLoadingTab('investees');
        setError(null);
      }

      try {
        const investees = await getInvesteeAnalytics(investeesFromMonth, investeesToMonth);
        if (!cancelled) setInvesteesData(investees);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load analytics data');
      } finally {
        if (!cancelled && showLoading) setLoadingTab(null);
        refreshing = false;
      }
    };

    void loadInvestees(true);

    const intervalId = window.setInterval(() => {
      void loadInvestees(false);
    }, DASHBOARD_AUTO_REFRESH_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [activeTab, investeesFromMonth, investeesToMonth]);

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
            fromMonth={attendanceFromMonth}
            toMonth={attendanceToMonth}
            onFromMonthChange={setAttendanceFromMonth}
            onToMonthChange={setAttendanceToMonth}
            appointmentTypes={appointmentTypes}
            appointmentTypeId={attendanceAppointmentTypeId}
            onAppointmentTypeChange={setAttendanceAppointmentTypeId}
            investees={investeeOptions}
            investeeId={attendanceInvesteeId}
            onInvesteeChange={setAttendanceInvesteeId}
          />
        );
      case 'categories':
        return (
          <MetricsByCategory
            categoryData={categoriesData}
            fromMonth={categoriesFromMonth}
            toMonth={categoriesToMonth}
            onFromMonthChange={setCategoriesFromMonth}
            onToMonthChange={setCategoriesToMonth}
          />
        );
      case 'monthly':
        return (
          <MonthlyEngagement
            data={monthlyData}
            fromMonth={monthlyFromMonth}
            toMonth={monthlyToMonth}
            onFromMonthChange={setMonthlyFromMonth}
            onToMonthChange={setMonthlyToMonth}
            investees={investeeOptions}
            investeeId={monthlyInvesteeId}
            onInvesteeChange={setMonthlyInvesteeId}
          />
        );
      case 'investees':
        return (
          <InvesteeAnalytics
            data={investeesData}
            fromMonth={investeesFromMonth}
            toMonth={investeesToMonth}
            onFromMonthChange={setInvesteesFromMonth}
            onToMonthChange={setInvesteesToMonth}
          />
        );
    }
  };

  const tabs = [
    { id: 'attendance' as const, label: 'Attendance by Partner', icon: Users },
    { id: 'categories' as const, label: 'Metrics by Appointment Type', icon: BarChart2 },
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
        <div className="flex items-center">
          <ExportAnalytics />
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
