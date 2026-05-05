import { api } from './api';
import type {
  AnalyticsPartner,
  AnalyticsCategory,
  AnalyticsMonthlyVideo,
  AnalyticsInvestee,
} from '../components/analytics/analyticsTypes';

interface AnalyticsResponse<T> {
  success: boolean;
  data: T[];
}

/**
 * Fetch attendance by partner metrics
 * @param fromMonth Start month in YYYY-MM format
 * @param toMonth End month in YYYY-MM format
 * @param investeeId Optional investee filter
 * @param appointmentTypeId Optional appointment type filter
 */
export async function getAttendanceByPartner(
  fromMonth: string,
  toMonth: string,
  investeeId?: string,
  appointmentTypeId?: string
): Promise<AnalyticsPartner[]> {
  const qs = new URLSearchParams();
  qs.set('from_month', fromMonth);
  qs.set('to_month', toMonth);
  if (investeeId) qs.set('investee_id', investeeId);
  if (appointmentTypeId) qs.set('appointment_type_id', appointmentTypeId);

  const res = await api.get<AnalyticsResponse<AnalyticsPartner>>(
    `/analytics/attendance-by-partner?${qs.toString()}`
  );
  return res.data;
}

/**
 * Fetch metrics by category
 * @param fromMonth Start month in YYYY-MM format
 * @param toMonth End month in YYYY-MM format
 * @param partnerId Optional partner filter
 */
export async function getMetricsByCategory(
  fromMonth: string,
  toMonth: string,
  partnerId?: string,
  appointmentTypeId?: string
): Promise<AnalyticsCategory[]> {
  const qs = new URLSearchParams();
  qs.set('from_month', fromMonth);
  qs.set('to_month', toMonth);
  if (partnerId) qs.set('partner_id', partnerId);
  if (appointmentTypeId) qs.set('appointment_type_id', appointmentTypeId);

  const res = await api.get<AnalyticsResponse<AnalyticsCategory>>(
    `/analytics/metrics-by-category?${qs.toString()}`
  );
  return res.data;
}

/**
 * Fetch monthly engagement metrics
 * @param fromMonth Start month in YYYY-MM format
 * @param toMonth End month in YYYY-MM format
 * @param investeeId Optional investee filter
 */
export async function getMonthlyEngagement(
  fromMonth: string,
  toMonth: string,
  investeeId?: string,
  appointmentTypeId?: string
): Promise<AnalyticsMonthlyVideo[]> {
  const qs = new URLSearchParams();
  qs.set('from_month', fromMonth);
  qs.set('to_month', toMonth);
  if (investeeId) qs.set('investee_id', investeeId);
  if (appointmentTypeId) qs.set('appointment_type_id', appointmentTypeId);

  const res = await api.get<AnalyticsResponse<AnalyticsMonthlyVideo>>(
    `/analytics/monthly-engagement?${qs.toString()}`
  );
  return res.data;
}

/**
 * Fetch investee analytics
 * @param fromMonth Start month in YYYY-MM format
 * @param toMonth End month in YYYY-MM format
 */
export async function getInvesteeAnalytics(
  fromMonth: string,
  toMonth: string,
  appointmentTypeId?: string
): Promise<AnalyticsInvestee[]> {
  const qs = new URLSearchParams();
  qs.set('from_month', fromMonth);
  qs.set('to_month', toMonth);
  if (appointmentTypeId) qs.set('appointment_type_id', appointmentTypeId);

  const res = await api.get<AnalyticsResponse<AnalyticsInvestee>>(
    `/analytics/investee-analytics?${qs.toString()}`
  );
  return res.data;
}

/**
 * Export detailed appointment rows for a date range (YYYY-MM-DD)
 */
export async function exportAppointmentRows(fromDate: string, toDate: string) {
  const qs = new URLSearchParams();
  qs.set('from_date', fromDate);
  qs.set('to_date', toDate);
  const res = await api.get<{ success: boolean; data: any[] }>(`/analytics/export-appointments?${qs.toString()}`);
  return res.data;
}
