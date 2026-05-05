import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Calendar, CheckCircle, Clock, Mail, Repeat, Users } from 'lucide-react';
import { Button, Card, Modal } from '../components/Common';
import { appointmentService } from '../services/appointmentService';
import { lookupService } from '../services/lookupService';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDate, formatTime } from '../utils/formatters';
import { AppointmentStatusBadge } from '../components/StatusBadge';
import { parseLocalDate } from '../utils/appointmentHelpers';
import { useAuth } from '../context/AuthContext';
import { rruleToHuman } from '../mappers';
import { navigateBack } from '../utils/navigation';

type AttendanceChoice = 'PRESENT' | 'ABSENT_INFORMED' | 'ABSENT_NOT_INFORMED';

export const AppointmentViewPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isPartner = user?.user_type === 'PARTNER';
  const partnerRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const focusPartnerId = searchParams.get('focus_partner') || '';

  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [attendance, setAttendance] = useState<Array<{ partner_id: string; partner_name: string; choice: AttendanceChoice }>>([]);

  const { data, isLoading } = useQuery({
    queryKey: ['appointment-detail', id],
    queryFn: async () => {
      if (!id) throw new Error('Missing appointment id');
      const [appointmentDetail, appointmentTypes, groupTypes] = await Promise.all([
        appointmentService.get(id),
        lookupService.listAppointmentTypes().catch(() => []),
        lookupService.listGroupTypes().catch(() => []),
      ]);
      return { appointmentDetail, appointmentTypes, groupTypes };
    },
    enabled: !!id,
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      if (!id) return;
      await appointmentService.complete(
        id,
        attendance.map((a) => ({
          partner_id: a.partner_id,
          is_present: a.choice === 'PRESENT',
          absent_informed: a.choice === 'PRESENT' ? null : a.choice === 'ABSENT_INFORMED',
        }))
      );
    },
    onSuccess: async () => {
      setShowCompleteModal(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['appointment-detail', id] }),
        queryClient.invalidateQueries({ queryKey: ['appointments'] }),
      ]);
    },
  });

  const openComplete = () => {
    if (!data?.appointmentDetail) return;
    setAttendance(
      (data.appointmentDetail.partners || []).map((p) => ({
        partner_id: String(p.partner_id),
        partner_name: p.partner_name,
        choice:
          p.is_present === true
            ? 'PRESENT'
            : p.is_present === false
              ? (p.absent_informed === true ? 'ABSENT_INFORMED' : 'ABSENT_NOT_INFORMED')
              : 'PRESENT',
      }))
    );
    setShowCompleteModal(true);
  };

  const handleComplete = async () => {
    try {
      await completeMutation.mutateAsync();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to complete appointment');
    }
  };

  const statusMutation = useMutation({
    mutationFn: async (status: 'PENDING' | 'CANCELLED') => {
      if (!id) return;
      if (status === 'PENDING') return appointmentService.setPending(id);
      return appointmentService.setCancelled(id);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['appointment-detail', id] }),
        queryClient.invalidateQueries({ queryKey: ['appointments'] }),
      ]);
    },
  });

  useEffect(() => {
    if (!focusPartnerId) return;
    const node = partnerRefs.current[focusPartnerId];
    if (node) {
      node.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [focusPartnerId, data?.appointmentDetail?.partners]);

  if (isLoading) return <div className="p-12 text-center text-textMuted">Loading appointment...</div>;
  if (!data?.appointmentDetail) return <div className="p-12 text-center text-textMuted">Appointment not found.</div>;

  const detail = data.appointmentDetail;
  const appt = detail.appointment;
  const appointmentTypeName = data.appointmentTypes.find((t) => t.appointment_type_id === appt.appointment_type_id)?.type_name || '-';
  const titleName = appt.appointment_name || appointmentTypeName;
  const groupTypeName = data.groupTypes.find((t) => t.group_type_id === appt.group_type_id)?.type_name || '-';
  const investeeDetails = detail.investee;
  const recurringDetails = detail.recurring_appointment;
  const heroName = investeeDetails?.investee_name || titleName || 'AP';
  const normalizedStatus = (appt.status || '').toUpperCase();
  const eventDate = parseLocalDate(appt.occurrence_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const canComplete = !isPartner && (normalizedStatus === 'PENDING' || normalizedStatus === 'SCHEDULED') && eventDate.getTime() <= today.getTime();
  const myPartnerRow = detail.partners.find((partner) => partner.partner_id === user?.partner_id);

  const fmtDateTime = (value?: string) => {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString();
  };

  return (
    <div className="space-y-6">
      <button onClick={() => navigateBack(navigate, isPartner ? '/calendar' : '/appointments')} className="flex items-center gap-2 text-textMuted hover:text-text transition-colors text-sm">
        <ArrowLeft size={16} /> Back
      </button>

      <Card className="p-6 bg-surface border-surfaceHighlight">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-xl font-bold text-white uppercase shrink-0">
              {heroName.substring(0, 2)}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text">Appointment Details</h1>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-textMuted">
                <span className="flex items-center gap-1"><Calendar size={14} /> {formatDate(appt.occurrence_date)}</span>
                <span className="flex items-center gap-1"><Clock size={14} /> {formatTime(appt.start_at)} - {formatTime(appt.end_at)}</span>
              </div>
              <div className="mt-2"><AppointmentStatusBadge status={appt.status} /></div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canComplete && (
              <Button onClick={openComplete}>
                <CheckCircle size={16} /> Complete
              </Button>
            )}
            {!isPartner && (normalizedStatus === 'COMPLETED' || normalizedStatus === 'CANCELLED') && (
              <Button variant="secondary" onClick={() => statusMutation.mutate('PENDING')}>
                Set Pending
              </Button>
            )}
            {!isPartner && (normalizedStatus === 'PENDING' || normalizedStatus === 'SCHEDULED' || normalizedStatus === 'COMPLETED') && (
              <Button variant="secondary" onClick={() => statusMutation.mutate('CANCELLED')}>
                Set Cancelled
              </Button>
            )}
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-surface border-surfaceHighlight space-y-3">
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-primary" />
          <h2 className="text-lg font-semibold text-text">Overview</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div><span className="text-textMuted">Name:</span> <span className="text-text ml-1">{titleName}</span></div>
          <div><span className="text-textMuted">Appointment Type:</span> <span className="text-text ml-1">{appointmentTypeName}</span></div>
          <div><span className="text-textMuted">Group Type:</span> <span className="text-text ml-1">{groupTypeName}</span></div>
          <div>
            <span className="text-textMuted">Investee:</span>{' '}
            {investeeDetails?.investee_id ? (
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={() => navigate(`/investees/${investeeDetails.investee_id}`)}
              >
                {investeeDetails?.investee_name || '-'}
              </button>
            ) : (
              <span className="text-text ml-1">{investeeDetails?.investee_name || '-'}</span>
            )}
          </div>
          <div><span className="text-textMuted">Duration:</span> <span className="text-text ml-1">{appt.duration_minutes ? `${appt.duration_minutes} min` : '-'}</span></div>
          <div><span className="text-textMuted">From Recurring Template:</span> <span className="text-text ml-1">{recurringDetails ? 'Yes' : 'No'}</span></div>
          <div><span className="text-textMuted">Created At:</span> <span className="text-text ml-1">{fmtDateTime(appt.created_at)}</span></div>
          <div><span className="text-textMuted">Last Updated:</span> <span className="text-text ml-1">{fmtDateTime(appt.modified_at)}</span></div>
        </div>
      </Card>

      {investeeDetails && (
        <Card className="p-6 bg-surface border-surfaceHighlight space-y-3">
          <div className="flex items-center gap-2">
            <Mail size={18} className="text-primary" />
            <h2 className="text-lg font-semibold text-text">Investee Details</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div><span className="text-textMuted">Name:</span> <span className="text-text ml-1">{investeeDetails.investee_name || '-'}</span></div>
            <div><span className="text-textMuted">Email:</span> <span className="text-text ml-1">{investeeDetails.email || '-'}</span></div>
            <div><span className="text-textMuted">Start Date:</span> <span className="text-text ml-1">{formatDate(investeeDetails.start_date)}</span></div>
            <div><span className="text-textMuted">End Date:</span> <span className="text-text ml-1">{formatDate(investeeDetails.end_date)}</span></div>
            <div><span className="text-textMuted">Active:</span> <span className="text-text ml-1">{investeeDetails.is_active === true ? 'Yes' : investeeDetails.is_active === false ? 'No' : '-'}</span></div>
          </div>
        </Card>
      )}

      {recurringDetails && (
        <Card className="p-6 bg-surface border-surfaceHighlight space-y-3">
          <div className="flex items-center gap-2">
            <Repeat size={18} className="text-primary" />
            <h2 className="text-lg font-semibold text-text">Recurring Template Snapshot</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-textMuted">Pattern:</span>{' '}
              {recurringDetails?.rec_appointment_id ? (
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => navigate(`/recurring-appointments/${recurringDetails.rec_appointment_id}`)}
                >
                  {recurringDetails.rrule ? rruleToHuman(recurringDetails.rrule) : '-'}
                </button>
              ) : (
                <span className="text-text ml-1">{recurringDetails.rrule ? rruleToHuman(recurringDetails.rrule) : '-'}</span>
              )}
            </div>
            <div><span className="text-textMuted">Start Time:</span> <span className="text-text ml-1">{formatTime(recurringDetails.start_time)}</span></div>
            <div><span className="text-textMuted">Start Date:</span> <span className="text-text ml-1">{formatDate(recurringDetails.start_date)}</span></div>
            <div><span className="text-textMuted">End Date:</span> <span className="text-text ml-1">{formatDate(recurringDetails.end_date)}</span></div>
            <div><span className="text-textMuted">Duration:</span> <span className="text-text ml-1">{recurringDetails.duration_minutes ? `${recurringDetails.duration_minutes} min` : '-'}</span></div>
            <div><span className="text-textMuted">Last Updated:</span> <span className="text-text ml-1">{fmtDateTime(recurringDetails.modified_at)}</span></div>
          </div>
        </Card>
      )}

      <Card className="p-6 bg-surface border-surfaceHighlight">
        <div className="mb-3 flex items-center gap-2">
          <Users size={18} className="text-primary" />
          <h2 className="text-lg font-semibold text-text">Partners & Attendance</h2>
        </div>
        {detail.partners.length === 0 ? (
          <p className="text-sm text-textMuted">No partners assigned to this appointment.</p>
        ) : (
          <div className="space-y-2">
            {detail.partners.map((p) => (
              <div
                key={p.partner_id}
                ref={(node) => {
                  partnerRefs.current[p.partner_id] = node;
                }}
                onClick={() => navigate(`/partners/${p.partner_id}`)}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm cursor-pointer ${focusPartnerId === p.partner_id ? 'bg-primary/20 border border-primary/40' : 'bg-surfaceHighlight/20'}`}
              >
                <div>
                  <p className="text-text">{p.partner_name}</p>
                  <p className="text-xs text-textMuted">{p.email}</p>
                </div>
                {p.is_present === null ? (
                  <span className="text-xs text-textMuted">Not marked</span>
                ) : (
                  <div className="text-right">
                    <span className={p.is_present ? 'text-green-500 text-xs' : 'text-red-400 text-xs'}>
                      {p.is_present ? 'Present' : p.absent_informed === true ? 'Absent (Informed)' : p.absent_informed === false ? 'Absent (Not Informed)' : 'Absent'}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal isOpen={showCompleteModal} onClose={() => setShowCompleteModal(false)} title="Complete Appointment - Mark Attendance">
        <div className="space-y-4">
          <p className="text-sm text-textMuted">
            {formatDate(appt.occurrence_date)} - {formatTime(appt.start_at)} to {formatTime(appt.end_at)}
          </p>
          {attendance.length === 0 ? (
            <p className="text-sm text-textMuted">No partners assigned to this appointment.</p>
          ) : (
            <div className="space-y-2">
              {attendance.map((a, i) => (
                <div key={a.partner_id} className="px-3 py-2 bg-surfaceHighlight/20 rounded-lg">
                  <div className="text-sm text-text mb-2">{a.partner_name}</div>
                  <select
                    className="w-full bg-surface border border-surfaceHighlight rounded-lg px-3 py-2 text-sm text-text"
                    value={a.choice}
                    onChange={(e) => {
                      const choice = e.target.value as AttendanceChoice;
                      const next = [...attendance];
                      next[i] = { ...next[i], choice };
                      setAttendance(next);
                    }}
                  >
                    <option value="PRESENT">Present</option>
                    <option value="ABSENT_INFORMED">Absent (Informed)</option>
                    <option value="ABSENT_NOT_INFORMED">Absent (Not Informed)</option>
                  </select>
                </div>
              ))}
            </div>
          )}
          <div className="pt-4 flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowCompleteModal(false)}>Cancel</Button>
            <Button onClick={handleComplete}>Mark Complete</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
