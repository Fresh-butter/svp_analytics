const { prisma } = require('../config/prisma');
const { formatRow } = require('../utils/helpers');

function getPartnerScope(req) {
  return req.query.partner_id || null;
}

function buildPartnerAppointmentFilter(partner_id) {
  if (!partner_id) return {};
  return { appointment_partners: { some: { partner_id } } };
}

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
      const partner_id = getPartnerScope(req);

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
          ...buildPartnerAppointmentFilter(partner_id),
          ...(investee_id && { investee_id }),
          ...(appointment_type_id && { appointment_type_id }),
        },
        include: {
          appointment_partners: {
            include: { partners: { select: { partner_id: true, partner_name: true } } },
          },
          appointment_types: { select: { type_name: true } },
          investees: { select: { investee_name: true } },
        },
      });

      // Aggregate by partner — track attended and accepted (present + absent)
      const partnerMap = new Map();
      for (const appt of appointments) {
        const duration = appt.duration_minutes || this.calculateDuration(appt.start_at, appt.end_at);
        const investeeName = appt.investees?.investee_name || 'General';
        const appointmentTypeName = appt.appointment_types?.type_name || 'General';

        for (const ap of appt.appointment_partners) {
          if (partner_id && ap.partners.partner_id !== partner_id) continue;
          const pid = ap.partners.partner_id;
          const isPresent = ap.is_present === true;

          if (partnerMap.has(pid)) {
            const existing = partnerMap.get(pid);
            existing.meetings_accepted++;
            existing.typeNames.add(appointmentTypeName);
            if (isPresent) {
              existing.meetings_attended++;
              existing.total_minutes += duration;
              if (appt.occurrence_date > new Date(existing.last_meeting_date)) {
                existing.last_meeting_date = formatRow({ created_at: appt.occurrence_date }).created_at.split('T')[0];
                existing.investee_name = investeeName;
              }
            }
          } else {
            partnerMap.set(pid, {
              partner_id: pid,
              partner_name: ap.partners.partner_name,
              typeNames: new Set([appointmentTypeName]),
              meetings_attended: isPresent ? 1 : 0,
              meetings_accepted: 1,
              total_minutes: isPresent ? duration : 0,
              last_meeting_date: isPresent ? formatRow({ created_at: appt.occurrence_date }).created_at.split('T')[0] : null,
              investee_name: isPresent ? investeeName : 'General',
            });
          }
        }
      }

      // Format response
      const data = Array.from(partnerMap.values()).map(p => ({
        id: p.partner_id,
        partner_name: p.partner_name,
        category: p.typeNames.size === 1 ? Array.from(p.typeNames)[0] : 'Multiple',
        investee_name: p.investee_name,
        meetings_attended: p.meetings_attended,
        meetings_accepted: p.meetings_accepted,
        attendance_percentage: p.meetings_accepted > 0 ? Math.round((p.meetings_attended / p.meetings_accepted) * 1000) / 10 : 0,
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
   * GET /analytics/export-appointments
   * Returns detailed rows suitable for CSV export (one row per partner per appointment)
   * Query params:
   *  - from_date: YYYY-MM-DD (required)
   *  - to_date: YYYY-MM-DD (required)
   */
  static async exportAppointments(req, res) {
    try {
      const chapter_id = req.query.chapter_id || req.user?.chapter_id;
      const from_date = req.query.from_date;
      const to_date = req.query.to_date;
      const partner_id = getPartnerScope(req);

      if (!from_date || !to_date) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'from_date and to_date are required (format: YYYY-MM-DD)' } });
      }

      const { parseLocalDate, formatRow } = require('../utils/helpers');
      const startDate = parseLocalDate(from_date);
      const endDate = parseLocalDate(to_date);

      const appointments = await prisma.appointments.findMany({
        where: {
          chapter_id,
          occurrence_date: { gte: startDate, lte: endDate },
          ...buildPartnerAppointmentFilter(partner_id),
        },
        include: {
          appointment_partners: {
            include: { partners: { select: { partner_id: true, partner_name: true } } },
          },
          appointment_types: { select: { type_name: true } },
          investees: { select: { investee_name: true } },
        },
        orderBy: { occurrence_date: 'asc' },
      });

      const rows = [];
      for (const appt of appointments) {
        const apptDate = formatRow({ occurrence_date: appt.occurrence_date }).occurrence_date;
        const apptName = appt.appointment_name || appt.appointment_types?.type_name || '';
        const apptType = appt.appointment_types?.type_name || '';
        const investee = appt.investees?.investee_name || '';
        const duration = appt.duration_minutes ?? this.calculateDuration(appt.start_at, appt.end_at);
        const modified = formatRow({ modified_at: appt.modified_at }).modified_at;

        if (appt.appointment_partners && appt.appointment_partners.length > 0) {
          for (const p of appt.appointment_partners) {
            if (partner_id && p.partners?.partner_id !== partner_id) continue;
            rows.push({
              appointment_date: apptDate,
              appointment_name: apptName,
              appointment_type: apptType,
              partner_name: p.partners?.partner_name || '',
              investee,
              duration_minutes: duration,
              present: p.is_present === true ? 1 : 0,
              absent_but_informed: p.is_present === false && p.absent_informed === true ? 1 : 0,
              absent_after_accepting: p.is_present === false && p.absent_informed === false ? 1 : 0,
              modified_at: modified,
            });
          }
        } else {
          // Row with no partners (export the appointment-level row)
          rows.push({
            appointment_date: apptDate,
            appointment_name: apptName,
            appointment_type: apptType,
            partner_name: '',
            investee,
            duration_minutes: duration,
            present: 0,
            absent_but_informed: 0,
            absent_after_accepting: 0,
            modified_at: modified,
          });
        }
      }

      res.json({ success: true, data: rows });
    } catch (err) {
      console.error('Export appointments error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to export appointments' } });
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
      const appointment_type_id = req.query.appointment_type_id;
      const effectivePartnerId = partner_id || null;

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
          ...buildPartnerAppointmentFilter(effectivePartnerId),
          ...(appointment_type_id && { appointment_type_id }),
        },
        include: {
          appointment_types: { select: { type_name: true } },
          appointment_partners: { select: { partner_id: true, is_present: true } },
        },
      });

      // Aggregate by appointment_type — track attendance and accepted counts
      const categoryMap = new Map();
      for (const appt of appointments) {
        const cat = appt.appointment_types?.type_name || 'General';
        const duration = appt.duration_minutes || this.calculateDuration(appt.start_at, appt.end_at);

        const uniquePartners = new Set();
        let presentCount = 0;
        let acceptedCount = 0;
        for (const ap of appt.appointment_partners) {
          acceptedCount++;
          if (ap.is_present === true) {
            presentCount++;
            uniquePartners.add(ap.partner_id);
          }
        }

        if (categoryMap.has(cat)) {
          const existing = categoryMap.get(cat);
          existing.meetings++;
          existing.total_minutes += duration;
          existing.present_total += presentCount;
          existing.accepted_total += acceptedCount;
          for (const p of uniquePartners) existing.partnerIds.add(p);
        } else {
          categoryMap.set(cat, {
            category: cat,
            meetings: 1,
            total_minutes: duration,
            partnerIds: uniquePartners,
            present_total: presentCount,
            accepted_total: acceptedCount,
          });
        }
      }

      const data = Array.from(categoryMap.values()).map(c => ({
        category: c.category,
        distinct_partners: c.partnerIds.size,
        hours: Math.round((c.total_minutes / 60) * 10) / 10,
        meetings: c.meetings,
        avg_duration_minutes: Math.round(c.total_minutes / c.meetings),
        meetings_accepted: c.accepted_total || 0,
        meetings_attended: c.present_total || 0,
        attendance_percentage: c.accepted_total > 0 ? Math.round((c.present_total / c.accepted_total) * 1000) / 10 : 0,
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
      const appointment_type_id = req.query.appointment_type_id;
      const partner_id = getPartnerScope(req);

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
          ...buildPartnerAppointmentFilter(partner_id),
          ...(investee_id && { investee_id }),
          ...(appointment_type_id && { appointment_type_id }),
        },
        include: {
          appointment_partners: { select: { partner_id: true, is_present: true } },
          investees: { select: { investee_name: true } },
        },
      });

      // Aggregate by month — track present and accepted counts
      const monthMap = new Map();
      for (const appt of appointments) {
        const month = appt.occurrence_date.toISOString().split('T')[0].substring(0, 7); // YYYY-MM
        const investeeName = appt.investees?.investee_name || 'General';
        const monthlyInvesteeLabel = investee_id ? investeeName : 'All Investees';

        const uniquePartners = new Set();
        let presentCount = 0;
        let acceptedCount = 0;
        for (const ap of appt.appointment_partners) {
          acceptedCount++;
          if (ap.is_present === true) {
            presentCount++;
            uniquePartners.add(ap.partner_id);
          }
        }

        if (monthMap.has(month)) {
          const existing = monthMap.get(month);
          existing.meetings_count++;
          existing.present_total += presentCount;
          existing.accepted_total += acceptedCount;
          for (const p of uniquePartners) existing.partnerIds.add(p);
        } else {
          monthMap.set(month, {
            month,
            meetings_count: 1,
            partnerIds: uniquePartners,
            investee_name: monthlyInvesteeLabel,
            present_total: presentCount,
            accepted_total: acceptedCount,
          });
        }
      }

      const data = Array.from(monthMap.values())
        .sort((a, b) => a.month.localeCompare(b.month))
        .map(m => ({
          month: m.month,
          meetings_count: m.meetings_count,
          distinct_partners_engaged: m.partnerIds.size,
          category: 'All Appointment Types',
          investee_name: m.investee_name,
          meetings_attended: m.present_total || 0,
          meetings_accepted: m.accepted_total || 0,
          attendance_percentage: m.accepted_total > 0 ? Math.round((m.present_total / m.accepted_total) * 1000) / 10 : 0,
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
      const appointment_type_id = req.query.appointment_type_id;
      const partner_id = getPartnerScope(req);

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
          ...buildPartnerAppointmentFilter(partner_id),
          ...(appointment_type_id && { appointment_type_id }),
        },
        include: {
          investees: { select: { investee_name: true } },
          appointment_partners: { select: { partner_id: true, is_present: true } },
        },
      });

      // Aggregate by investee — track present and accepted counts
      const investeeMap = new Map();
      for (const appt of appointments) {
        const investeeName = appt.investees?.investee_name || 'General';
        const duration = appt.duration_minutes || this.calculateDuration(appt.start_at, appt.end_at);

        let presentCount = 0;
        let acceptedCount = 0;
        if (appt.appointment_partners && appt.appointment_partners.length > 0) {
          for (const ap of appt.appointment_partners) {
            if (partner_id && ap.partner_id !== partner_id) continue;
            acceptedCount++;
            if (ap.is_present === true) presentCount++;
          }
        }

        if (investeeMap.has(investeeName)) {
          const existing = investeeMap.get(investeeName);
          existing.meetings_count++;
          existing.total_minutes += duration;
          existing.present_total += presentCount;
          existing.accepted_total += acceptedCount;
        } else {
          investeeMap.set(investeeName, {
            investee_name: investeeName,
            meetings_count: 1,
            total_minutes: duration,
            present_total: presentCount,
            accepted_total: acceptedCount,
          });
        }
      }

      const data = Array.from(investeeMap.values()).map(inv => ({
        investee_name: inv.investee_name,
        meetings_count: inv.meetings_count,
        hours_spent: Math.round((inv.total_minutes / 60) * 10) / 10,
        avg_meeting_duration: Math.round(inv.total_minutes / inv.meetings_count),
        meetings_attended: inv.present_total || 0,
        meetings_accepted: inv.accepted_total || 0,
        attendance_percentage: inv.accepted_total > 0 ? Math.round((inv.present_total / inv.accepted_total) * 1000) / 10 : 0,
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
