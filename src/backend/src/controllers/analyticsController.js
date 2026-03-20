const { prisma } = require('../config/prisma');
const { formatRow } = require('../utils/helpers');

class AnalyticsController {
  /**
   * GET /analytics/attendance-by-partner
   * Returns partner engagement stats: meetings attended, hours spent, last meeting date
   * Query params:
   *   - chapter_id: UUID (defaults to authenticated user's chapter)
   *   - from_month: YYYY-MM
   *   - to_month: YYYY-MM
   *   - investee_id?: UUID (optional filter)
   *   - appointment_type_id?: UUID (optional filter)
   */
  static async attendanceByPartner(req, res) {
    try {
      const chapter_id = req.query.chapter_id || req.user?.chapter_id;
      const from_month = req.query.from_month; // YYYY-MM
      const to_month = req.query.to_month;
      const investee_id = req.query.investee_id;
      const appointment_type_id = req.query.appointment_type_id;

      if (!from_month || !to_month) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION', message: 'from_month and to_month are required (format: YYYY-MM)' },
        });
      }

      // Parse month boundaries
      const [fy, fm] = from_month.split('-').map(Number);
      const [ty, tm] = to_month.split('-').map(Number);
      const startDate = new Date(Date.UTC(fy, fm - 1, 1));
      const endDate = new Date(Date.UTC(ty, tm, 0, 23, 59, 59));

      // Query completed appointments with partners
      const appointments = await prisma.appointments.findMany({
        where: {
          chapter_id,
          status: 'COMPLETED',
          occurrence_date: { gte: startDate, lte: endDate },
          ...(investee_id && { investee_id }),
          ...(appointment_type_id && { appointment_type_id }),
        },
        include: {
          appointment_partners: {
            include: { partners: { select: { partner_id: true, partner_name: true } } },
          },
          investees: { select: { investee_name: true } },
        },
      });

      // Aggregate by partner
      const partnerMap = new Map();
      for (const appt of appointments) {
        const duration = appt.duration_minutes || this.calculateDuration(appt.start_at, appt.end_at);
        const investeeName = appt.investees?.investee_name || 'General';

        for (const ap of appt.appointment_partners) {
          if (ap.is_present !== true) continue;

          const pid = ap.partners.partner_id;
          if (partnerMap.has(pid)) {
            const existing = partnerMap.get(pid);
            existing.meetings_attended++;
            existing.total_minutes += duration;
            if (appt.occurrence_date > new Date(existing.last_meeting_date)) {
              existing.last_meeting_date = formatRow({ created_at: appt.occurrence_date }).created_at.split('T')[0];
              existing.investee_name = investeeName;
            }
          } else {
            partnerMap.set(pid, {
              partner_id: pid,
              partner_name: ap.partners.partner_name,
              meetings_attended: 1,
              total_minutes: duration,
              last_meeting_date: formatRow({ created_at: appt.occurrence_date }).created_at.split('T')[0],
              investee_name: investeeName,
            });
          }
        }
      }

      // Format response
      const data = Array.from(partnerMap.values()).map(p => ({
        id: p.partner_id,
        partner_name: p.partner_name,
        category: 'Meeting',
        investee_name: p.investee_name,
        meetings_attended: p.meetings_attended,
        hours_spent: Math.round((p.total_minutes / 60) * 10) / 10,
        last_meeting_date: p.last_meeting_date,
      }));

      res.json({ success: true, data });
    } catch (err) {
      console.error('Attendance by partner error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch analytics' } });
    }
  }

  /**
   * GET /analytics/metrics-by-category
   * Returns category metrics: meetings count, distinct partners, hours, avg duration
   * Query params:
   *   - chapter_id: UUID (defaults to authenticated user's chapter)
   *   - from_month: YYYY-MM
   *   - to_month: YYYY-MM
   *   - partner_id?: UUID (optional filter)
   */
  static async metricsByCategory(req, res) {
    try {
      const chapter_id = req.query.chapter_id || req.user?.chapter_id;
      const from_month = req.query.from_month;
      const to_month = req.query.to_month;
      const partner_id = req.query.partner_id;

      if (!from_month || !to_month) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION', message: 'from_month and to_month are required (format: YYYY-MM)' },
        });
      }

      const [fy, fm] = from_month.split('-').map(Number);
      const [ty, tm] = to_month.split('-').map(Number);
      const startDate = new Date(Date.UTC(fy, fm - 1, 1));
      const endDate = new Date(Date.UTC(ty, tm, 0, 23, 59, 59));

      // Query completed appointments
      const appointments = await prisma.appointments.findMany({
        where: {
          chapter_id,
          status: 'COMPLETED',
          occurrence_date: { gte: startDate, lte: endDate },
          ...(partner_id && {
            appointment_partners: { some: { partner_id } },
          }),
        },
        include: {
          appointment_types: { select: { type_name: true } },
          appointment_partners: { select: { partner_id: true, is_present: true } },
        },
      });

      // Aggregate by appointment_type
      const categoryMap = new Map();
      for (const appt of appointments) {
        const cat = appt.appointment_types?.type_name || 'General';
        const duration = appt.duration_minutes || this.calculateDuration(appt.start_at, appt.end_at);

        const uniquePartners = new Set();
        for (const ap of appt.appointment_partners) {
          if (ap.is_present === true) uniquePartners.add(ap.partner_id);
        }

        if (categoryMap.has(cat)) {
          const existing = categoryMap.get(cat);
          existing.meetings++;
          existing.total_minutes += duration;
          for (const p of uniquePartners) existing.partnerIds.add(p);
        } else {
          categoryMap.set(cat, {
            category: cat,
            meetings: 1,
            total_minutes: duration,
            partnerIds: uniquePartners,
          });
        }
      }

      const data = Array.from(categoryMap.values()).map(c => ({
        category: c.category,
        distinct_partners: c.partnerIds.size,
        hours: Math.round((c.total_minutes / 60) * 10) / 10,
        meetings: c.meetings,
        avg_duration_minutes: Math.round(c.total_minutes / c.meetings),
      }));

      res.json({ success: true, data });
    } catch (err) {
      console.error('Metrics by category error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch analytics' } });
    }
  }

  /**
   * GET /analytics/monthly-engagement
   * Returns monthly engagement: meetings count, distinct partners engaged
   * Query params:
   *   - chapter_id: UUID
   *   - from_month: YYYY-MM
   *   - to_month: YYYY-MM
   *   - investee_id?: UUID (optional filter)
   */
  static async monthlyEngagement(req, res) {
    try {
      const chapter_id = req.query.chapter_id || req.user?.chapter_id;
      const from_month = req.query.from_month;
      const to_month = req.query.to_month;
      const investee_id = req.query.investee_id;

      if (!from_month || !to_month) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION', message: 'from_month and to_month are required (format: YYYY-MM)' },
        });
      }

      const [fy, fm] = from_month.split('-').map(Number);
      const [ty, tm] = to_month.split('-').map(Number);
      const startDate = new Date(Date.UTC(fy, fm - 1, 1));
      const endDate = new Date(Date.UTC(ty, tm, 0, 23, 59, 59));

      const appointments = await prisma.appointments.findMany({
        where: {
          chapter_id,
          status: 'COMPLETED',
          occurrence_date: { gte: startDate, lte: endDate },
          ...(investee_id && { investee_id }),
        },
        include: {
          appointment_partners: { select: { partner_id: true, is_present: true } },
          investees: { select: { investee_name: true } },
        },
      });

      // Aggregate by month
      const monthMap = new Map();
      for (const appt of appointments) {
        const month = appt.occurrence_date.toISOString().split('T')[0].substring(0, 7); // YYYY-MM
        const investeeName = appt.investees?.investee_name || 'General';

        const uniquePartners = new Set();
        for (const ap of appt.appointment_partners) {
          if (ap.is_present === true) uniquePartners.add(ap.partner_id);
        }

        if (monthMap.has(month)) {
          const existing = monthMap.get(month);
          existing.meetings_count++;
          for (const p of uniquePartners) existing.partnerIds.add(p);
        } else {
          monthMap.set(month, {
            month,
            meetings_count: 1,
            partnerIds: uniquePartners,
            investee_name: investeeName,
          });
        }
      }

      const data = Array.from(monthMap.values())
        .sort((a, b) => a.month.localeCompare(b.month))
        .map(m => ({
          month: m.month,
          meetings_count: m.meetings_count,
          distinct_partners_engaged: m.partnerIds.size,
          category: 'Meeting',
          investee_name: m.investee_name,
        }));

      res.json({ success: true, data });
    } catch (err) {
      console.error('Monthly engagement error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch analytics' } });
    }
  }

  /**
   * GET /analytics/investee-analytics
   * Returns investee metrics: meetings count, hours spent, avg duration
   * Query params:
   *   - chapter_id: UUID
   *   - from_month: YYYY-MM
   *   - to_month: YYYY-MM
   */
  static async investeeAnalytics(req, res) {
    try {
      const chapter_id = req.query.chapter_id || req.user?.chapter_id;
      const from_month = req.query.from_month;
      const to_month = req.query.to_month;

      if (!from_month || !to_month) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION', message: 'from_month and to_month are required (format: YYYY-MM)' },
        });
      }

      const [fy, fm] = from_month.split('-').map(Number);
      const [ty, tm] = to_month.split('-').map(Number);
      const startDate = new Date(Date.UTC(fy, fm - 1, 1));
      const endDate = new Date(Date.UTC(ty, tm, 0, 23, 59, 59));

      const appointments = await prisma.appointments.findMany({
        where: {
          chapter_id,
          status: 'COMPLETED',
          occurrence_date: { gte: startDate, lte: endDate },
        },
        include: {
          investees: { select: { investee_name: true } },
        },
      });

      // Aggregate by investee
      const investeeMap = new Map();
      for (const appt of appointments) {
        const investeeName = appt.investees?.investee_name || 'General';
        const duration = appt.duration_minutes || this.calculateDuration(appt.start_at, appt.end_at);

        if (investeeMap.has(investeeName)) {
          const existing = investeeMap.get(investeeName);
          existing.meetings_count++;
          existing.total_minutes += duration;
        } else {
          investeeMap.set(investeeName, {
            investee_name: investeeName,
            meetings_count: 1,
            total_minutes: duration,
          });
        }
      }

      const data = Array.from(investeeMap.values()).map(inv => ({
        investee_name: inv.investee_name,
        meetings_count: inv.meetings_count,
        hours_spent: Math.round((inv.total_minutes / 60) * 10) / 10,
        avg_meeting_duration: Math.round(inv.total_minutes / inv.meetings_count),
      }));

      res.json({ success: true, data });
    } catch (err) {
      console.error('Investee analytics error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch analytics' } });
    }
  }

  // Helper: calculate duration from HH:MM:SS strings
  static calculateDuration(startAt, endAt) {
    if (!startAt || !endAt) return 0;
    const [sh, sm] = startAt.split(':').map(Number);
    const [eh, em] = endAt.split(':').map(Number);
    const diff = (eh * 60 + em) - (sh * 60 + sm);
    return diff > 0 ? diff : 0;
  }
}

module.exports = { AnalyticsController };
