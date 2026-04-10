import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/Common';
import { appointmentService } from '../services/appointmentService';
import { partnerService } from '../services/partnerService';
import { groupService } from '../services/groupService';
import { Partner, Group } from '../types';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { formatDate, formatDayOfMonth, formatShortMonth, formatTime } from '../utils/formatters';

export const HomePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isPartner = user?.user_type === 'PARTNER';

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const nextWeek = useMemo(() => {
    const d = new Date(today);
    d.setDate(today.getDate() + 7);
    d.setHours(23, 59, 59, 999);
    return d;
  }, [today]);

  const overlapsNextMonth = today.getMonth() !== nextWeek.getMonth() || today.getFullYear() !== nextWeek.getFullYear();

  const { data: currentMonthApps = [], isLoading: isAppsLoading } = useQuery({
    queryKey: ['home-appointments', user?.user_id || 'anonymous', today.getMonth() + 1, today.getFullYear()],
    queryFn: () => appointmentService.list({ month: today.getMonth() + 1, year: today.getFullYear() }).then((res) => res.data),
  });

  const { data: nextMonthApps = [], isLoading: isNextAppsLoading } = useQuery({
    queryKey: ['home-appointments', user?.user_id || 'anonymous', nextWeek.getMonth() + 1, nextWeek.getFullYear()],
    queryFn: () => appointmentService.list({ month: nextWeek.getMonth() + 1, year: nextWeek.getFullYear() }).then((res) => res.data),
    enabled: overlapsNextMonth,
  });

  const { data: allPartners = [], isLoading: isPartnersLoading } = useQuery({
    queryKey: ['partners', user?.user_id || 'anonymous'],
    queryFn: () => partnerService.getAll(),
    enabled: !isPartner,
  });

  const { data: allGroups = [], isLoading: isGroupsLoading } = useQuery({
    queryKey: ['groups', user?.user_id || 'anonymous'],
    queryFn: () => groupService.getAll(),
    enabled: !isPartner,
  });

  const { data: assignedAppointments = [], isLoading: isAssignedLoading } = useQuery({
    queryKey: ['partner-assigned-appointments', user?.user_id || 'anonymous'],
    queryFn: () => appointmentService.getAssigned(),
    enabled: isPartner,
  });

  const appointments = useMemo(() => {
    const apps = overlapsNextMonth ? [...currentMonthApps, ...nextMonthApps] : currentMonthApps;
    return apps
      .filter((app) => {
        if (app.status === 'Cancelled' || app.status === 'CANCELLED') return false;
        const appDate = new Date(app.occurrence_date);
        appDate.setHours(0, 0, 0, 0);
        return appDate >= today && appDate <= nextWeek;
      })
      .sort((a, b) => new Date(a.occurrence_date).getTime() - new Date(b.occurrence_date).getTime());
  }, [currentMonthApps, nextMonthApps, overlapsNextMonth, today, nextWeek]);

  const partners = useMemo(() => {
    return allPartners
      .filter((p: Partner) => {
        if (!p.end_date) return false;
        const ed = new Date(p.end_date);
        return ed >= today;
      })
      .sort((a: Partner, b: Partner) => new Date(a.end_date!).getTime() - new Date(b.end_date!).getTime());
  }, [allPartners, today]);

  const groups = useMemo(() => {
    return allGroups
      .filter((g: Group) => {
        if (!g.end_date) return false;
        const ed = new Date(g.end_date);
        return ed >= today;
      })
      .sort((a: Group, b: Group) => new Date(a.end_date!).getTime() - new Date(b.end_date!).getTime());
  }, [allGroups, today]);

  const loading = isAppsLoading || isNextAppsLoading || isPartnersLoading || isGroupsLoading;

  const partnerScheduled = useMemo(() => {
    return assignedAppointments
      .filter((appointment) => String(appointment.status || '').toUpperCase() === 'PENDING')
      .sort((a, b) => new Date(a.occurrence_date).getTime() - new Date(b.occurrence_date).getTime());
  }, [assignedAppointments]);

  const partnerCompleted = useMemo(() => {
    return assignedAppointments
      .filter((appointment) => String(appointment.status || '').toUpperCase() === 'COMPLETED')
      .sort((a, b) => new Date(b.occurrence_date).getTime() - new Date(a.occurrence_date).getTime());
  }, [assignedAppointments]);

  return (
    <div className="h-full space-y-6 flex flex-col">
      <div className="shrink-0">
        <h1 className="text-3xl font-bold text-text">Dashboard</h1>
        <p className="text-textMuted mt-2">
          {isPartner
            ? 'Welcome back. This view is limited to your assigned meetings, analytics, and calendar.'
            : "Welcome back, admin. Here's what's happening in your chapter."}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 min-h-0">
        <div className="md:col-span-2 flex flex-col min-h-0">
          <Card className="flex flex-col h-full min-h-0 p-6 bg-surface">
            <div className="flex justify-between items-start mb-6 shrink-0">
              <div>
                <h2 className="text-xl font-semibold text-text">Upcoming Meetings</h2>
                <div className="text-textMuted text-sm mt-1">Meetings scheduled for the coming week</div>
              </div>
              <button
                onClick={() => navigate('/calendar')}
                className="text-primary hover:text-primaryHover text-sm font-medium transition-colors"
              >
                View Calendar
              </button>
            </div>

            <div className="overflow-y-auto flex-1 pr-2 space-y-4">
              {loading ? (
                <div className="flex items-center justify-center h-full text-textMuted italic">Loading...</div>
              ) : appointments.length === 0 ? (
                <div className="flex items-start pt-12 justify-center h-full text-textMuted italic">
                  No upcoming meetings in the next 7 days
                </div>
              ) : (
                appointments.map(app => (
                  <button
                    key={app.appointment_id}
                    type="button"
                    onClick={() => navigate(`/appointments/${app.appointment_id}`)}
                    className="w-full flex items-center justify-between p-4 bg-surfaceHighlight rounded-lg border border-surfaceHighlight hover:border-primary/40 hover:bg-surfaceHighlight/80 transition-colors text-left"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex flex-col items-center justify-center p-2 bg-background rounded text-center min-w-[3.5rem]">
                        <span className="text-primary text-xs font-bold uppercase">{formatShortMonth(app.occurrence_date)}</span>
                        <span className="text-text text-lg font-bold">{formatDayOfMonth(app.occurrence_date)}</span>
                      </div>
                      <div>
                        <h3 className="text-text font-medium">{app.investee_name ? `Meeting with ${app.investee_name}` : 'General Meeting'}</h3>
                        <div className="flex items-center text-textMuted text-sm space-x-2 mt-1">
                          {app.start_at && (
                            <div className="flex items-center">
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                              {formatTime(app.start_at)}
                            </div>
                          )}
                          <div className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                            {app.status === 'PENDING' ? 'Scheduled' : app.status}
                          </div>
                        </div>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-medium rounded border border-primary/20">
                      {app.status === 'PENDING' ? 'Scheduled' : app.status}
                    </span>
                  </button>
                ))
              )}
            </div>
          </Card>
        </div>

        <div className="flex flex-col space-y-6 min-h-0">
          {isPartner ? (
            <Card className="flex flex-col flex-1 min-h-0 p-6 bg-surface">
              <div className="mb-4 shrink-0">
                <h2 className="text-xl font-semibold text-text">Assigned Meetings</h2>
                <div className="text-textMuted text-sm mt-1">View your assigned meetings by status.</div>
              </div>
              <div className="overflow-y-auto pr-2 space-y-5 text-sm">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-text font-semibold">Scheduled</h3>
                    <span className="text-xs text-textMuted">{partnerScheduled.length}</span>
                  </div>
                  <div className="space-y-2">
                    {isAssignedLoading ? (
                      <p className="text-textMuted italic">Loading...</p>
                    ) : partnerScheduled.length === 0 ? (
                      <p className="text-textMuted italic">No scheduled meetings assigned.</p>
                    ) : (
                      partnerScheduled.slice(0, 6).map((appointment) => (
                        <button
                          key={appointment.appointment_id}
                          type="button"
                          onClick={() => navigate(`/appointments/${appointment.appointment_id}`)}
                          className="w-full text-left px-3 py-2 rounded-lg bg-surfaceHighlight border border-surfaceHighlight hover:border-primary/40 transition-colors"
                        >
                          <p className="text-text font-medium truncate">{appointment.appointment_name || appointment.investee_name || 'Meeting'}</p>
                          <p className="text-xs text-textMuted mt-0.5">{formatDate(appointment.occurrence_date)} • {formatTime(appointment.start_at)}</p>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-text font-semibold">Completed</h3>
                    <span className="text-xs text-textMuted">{partnerCompleted.length}</span>
                  </div>
                  <div className="space-y-2">
                    {isAssignedLoading ? (
                      <p className="text-textMuted italic">Loading...</p>
                    ) : partnerCompleted.length === 0 ? (
                      <p className="text-textMuted italic">No completed meetings assigned.</p>
                    ) : (
                      partnerCompleted.slice(0, 6).map((appointment) => (
                        <button
                          key={appointment.appointment_id}
                          type="button"
                          onClick={() => navigate(`/appointments/${appointment.appointment_id}`)}
                          className="w-full text-left px-3 py-2 rounded-lg bg-surfaceHighlight border border-surfaceHighlight hover:border-primary/40 transition-colors"
                        >
                          <p className="text-text font-medium truncate">{appointment.appointment_name || appointment.investee_name || 'Meeting'}</p>
                          <p className="text-xs text-textMuted mt-0.5">{formatDate(appointment.occurrence_date)} • {formatTime(appointment.start_at)}</p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ) : (
            <>
              <Card className="flex flex-col flex-1 min-h-0 p-6 bg-surface">
                <div className="mb-4 shrink-0">
                  <h2 className="text-xl font-semibold text-text">Partners by Expiry</h2>
                  <div className="text-textMuted text-sm mt-1">Partnerships ending soon</div>
                </div>
                <div className="overflow-y-auto flex-1 pr-2 space-y-3">
                  {loading ? (
                    <div className="flex items-center justify-center h-full text-textMuted italic">Loading...</div>
                  ) : partners.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-textMuted italic min-h-[100px]">
                      No partners expiring soon
                    </div>
                  ) : (
                    partners.map(partner => (
                      <div key={partner.partner_id} className="p-3 bg-surfaceHighlight rounded-lg text-sm flex justify-between items-center border border-surfaceHighlight">
                        <div>
                          <p className="text-text font-medium">{partner.partner_name}</p>
                          <p className="text-textMuted text-xs mt-0.5">Expires: {formatDate(partner.end_date!)}</p>
                        </div>
                        <button onClick={() => navigate(`/partners/${partner.partner_id}`)} className="text-primary hover:text-primaryHover">
                          View
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </Card>

              <Card className="flex flex-col flex-1 min-h-0 p-6 bg-surface">
                <div className="mb-4 shrink-0">
                  <h2 className="text-xl font-semibold text-text">Groups by Expiry</h2>
                  <div className="text-textMuted text-sm mt-1">Groups ending soon</div>
                </div>
                <div className="overflow-y-auto flex-1 pr-2 space-y-3">
                  {loading ? (
                    <div className="flex items-center justify-center h-full text-textMuted italic">Loading...</div>
                  ) : groups.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-textMuted italic min-h-[100px]">
                      No groups expiring soon
                    </div>
                  ) : (
                    groups.map(group => (
                      <div key={group.group_id} className="p-3 bg-surfaceHighlight rounded-lg text-sm flex justify-between items-center border border-surfaceHighlight">
                        <div>
                          <p className="text-text font-medium">{group.group_name}</p>
                          <p className="text-textMuted text-xs mt-0.5">Expires: {formatDate(group.end_date!)}</p>
                        </div>
                        <button onClick={() => navigate(`/groups/${group.group_id}`)} className="text-primary hover:text-primaryHover">
                          View
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
