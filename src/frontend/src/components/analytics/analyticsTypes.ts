// Shared types for analytics data — used by both the service and the components.

export interface AnalyticsPartner {
    id: string;
    partner_name: string;
    category: string;
    investee_name: string;
    meetings_attended: number;
    meetings_accepted?: number;
    attendance_percentage?: number; // percent 0-100
    hours_spent: number;
    last_meeting_date: string;
}

export interface AnalyticsCategory {
    category: string;
    distinct_partners: number;
    hours: number;
    meetings: number;
    avg_duration_minutes: number;
    meetings_attended?: number;
    meetings_accepted?: number;
    attendance_percentage?: number;
}

export interface AnalyticsMonthlyVideo {
    month: string;
    meetings_count: number;
    distinct_partners_engaged: number;
    category: string;
    investee_name: string;
    meetings_attended?: number;
    meetings_accepted?: number;
    attendance_percentage?: number;
}

export interface AnalyticsInvestee {
    investee_name: string;
    meetings_count: number;
    hours_spent: number;
    avg_meeting_duration: number;
    meetings_attended?: number;
    meetings_accepted?: number;
    attendance_percentage?: number;
}

export interface AnalyticsData {
    partners: AnalyticsPartner[];
    categories: AnalyticsCategory[];
    monthly: AnalyticsMonthlyVideo[];
    investees: AnalyticsInvestee[];
}
