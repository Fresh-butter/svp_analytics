import { useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Calendar, Clock, Repeat, UserCheck } from 'lucide-react';
import { Card } from '../components/Common';
import { appointmentService } from '../services/appointmentService';
import { recurringAppointmentService } from '../services/recurringAppointmentService';
import { lookupService } from '../services/lookupService';
import { useAuth } from '../context/AuthContext';
import { formatDate, formatTime } from '../utils/formatters';
import { rruleToHuman } from '../mappers';

export const MyAppointmentViewPage = () => {
  const { kind, id } = useParams<{ kind: 'appointment' | 'recurring'; id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const occurrenceDate = searchParams.get('occurrence_date');

  const { data: appointmentTypes = [] } = useQuery({
    queryKey: ['appointment-types'],
    queryFn: () => lookupService.listAppointmentTypes(),
  });

  const { data: appointmentDetail, isLoading: loadingAppointment } = useQuery({
    queryKey: ['my-appointment-detail', id],
    queryFn: () => appointmentService.get(String(id)),
    enabled: kind === 'appointment' && Boolean(id),
  });

  const { data: recurringDetail, isLoading: loadingRecurring } = useQuery({
    queryKey: ['my-recurring-detail', id],
    queryFn: () => recurringAppointmentService.get(String(id)),
    enabled: kind === 'recurring' && Boolean(id),
  });

  const appointmentTypeMap = useMemo(
    () => new Map(appointmentTypes.map((t) => [t.appointment_type_id, t.type_name])),
    [appointmentTypes]
  );

  const loading = loadingAppointment || loadingRecurring;

  if (!kind || !id) return <div className="p-12 text-center text-textMuted">Invalid appointment link.</div>;
  if (loading) return <div className="p-12 text-center text-textMuted">Loading details...</div>;

  if (kind === 'appointment' && appointmentDetail) {
    const appt = appointmentDetail.appointment;
    const title = (appt.appointment_name || '').trim() || appointmentTypeMap.get(appt.appointment_type_id || '') || 'Appointment';
    const myAttendance = (appointmentDetail.partners || []).find((p) => p.partner_id === user?.partner_id);

    return (
      <div className="space-y-6">
        <button onClick={() => navigate('/my-appointments')} className="flex items-center gap-2 text-textMuted hover:text-text transition-colors text-sm">
          <ArrowLeft size={16} /> Back to My Appointments
        </button>

        <Card className="p-6 bg-surface border-surfaceHighlight">
          <h1 className="text-2xl font-bold text-text">{title}</h1>
          <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-textMuted">
            <span className="flex items-center gap-1"><Calendar size={14} /> {formatDate(appt.occurrence_date)}</span>
            <span className="flex items-center gap-1"><Clock size={14} /> {formatTime(appt.start_at)} - {formatTime(appt.end_at)}</span>
            <span>Status: {appt.status}</span>
          </div>
        </Card>

        <Card className="p-6 bg-surface border-surfaceHighlight">
          <h2 className="text-lg font-semibold text-text mb-3">Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div><span className="text-textMuted">Investee:</span> <span className="text-text ml-1">{appt.investee_name || appointmentDetail.investee?.investee_name || '-'}</span></div>
            <div><span className="text-textMuted">Appointment Type:</span> <span className="text-text ml-1">{appointmentTypeMap.get(appt.appointment_type_id || '') || '-'}</span></div>
            <div><span className="text-textMuted">Duration:</span> <span className="text-text ml-1">{appt.duration_minutes ? `${appt.duration_minutes} min` : '-'}</span></div>
            <div><span className="text-textMuted">Recurring Source:</span> <span className="text-text ml-1">{appt.rec_appointment_id ? 'Yes' : 'No'}</span></div>
          </div>
        </Card>

        <Card className="p-6 bg-surface border-surfaceHighlight">
          <div className="flex items-center gap-2 mb-2">
            <UserCheck size={16} className="text-primary" />
            <h2 className="text-lg font-semibold text-text">My Attendance</h2>
          </div>
          {!myAttendance ? (
            <p className="text-sm text-textMuted">Attendance not available.</p>
          ) : myAttendance.is_present === null ? (
            <p className="text-sm text-textMuted">Not marked yet.</p>
          ) : myAttendance.is_present ? (
            <p className="text-sm text-green-500">Marked Present</p>
          ) : (
            <p className="text-sm text-red-400">Marked Absent {myAttendance.absent_informed ? '(Informed)' : ''}</p>
          )}
        </Card>
      </div>
    );
  }

  if (kind === 'recurring' && recurringDetail) {
    const title = (recurringDetail.appointment_name || '').trim() || appointmentTypeMap.get(recurringDetail.appointment_type_id || '') || 'Scheduled Appointment';
    const group = recurringDetail.group as { group_name?: string } | null;
    const investee = recurringDetail.investee as { investee_name?: string } | null;

    return (
      <div className="space-y-6">
        <button onClick={() => navigate('/my-appointments')} className="flex items-center gap-2 text-textMuted hover:text-text transition-colors text-sm">
          <ArrowLeft size={16} /> Back to My Appointments
        </button>

        <Card className="p-6 bg-surface border-surfaceHighlight">
          <h1 className="text-2xl font-bold text-text">{title}</h1>
          <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-textMuted">
            <span className="flex items-center gap-1"><Repeat size={14} /> Scheduled</span>
            <span className="flex items-center gap-1"><Clock size={14} /> {formatTime(recurringDetail.start_time)}</span>
            <span className="flex items-center gap-1">
              <Calendar size={14} />
              {occurrenceDate ? formatDate(occurrenceDate) : `${formatDate(recurringDetail.start_date)} - ${formatDate(recurringDetail.end_date)}`}
            </span>
          </div>
        </Card>

        <Card className="p-6 bg-surface border-surfaceHighlight">
          <h2 className="text-lg font-semibold text-text mb-3">Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div><span className="text-textMuted">Group:</span> <span className="text-text ml-1">{group?.group_name || '-'}</span></div>
            <div><span className="text-textMuted">Investee:</span> <span className="text-text ml-1">{investee?.investee_name || '-'}</span></div>
            <div><span className="text-textMuted">Appointment Type:</span> <span className="text-text ml-1">{appointmentTypeMap.get(recurringDetail.appointment_type_id || '') || '-'}</span></div>
            <div><span className="text-textMuted">Duration:</span> <span className="text-text ml-1">{recurringDetail.duration_minutes ? `${recurringDetail.duration_minutes} min` : '-'}</span></div>
            <div><span className="text-textMuted">Schedule:</span> <span className="text-text ml-1">{rruleToHuman(recurringDetail.rrule)}</span></div>
          </div>
        </Card>
      </div>
    );
  }

  return <div className="p-12 text-center text-textMuted">Appointment not found.</div>;
};
