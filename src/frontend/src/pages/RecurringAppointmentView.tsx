import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, Mail, Repeat, Users } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Input, Modal } from '../components/Common';
import { recurringAppointmentService } from '../services/recurringAppointmentService';
import { lookupService } from '../services/lookupService';
import { formatDate, formatTime } from '../utils/formatters';
import { rruleToHuman } from '../mappers';
import { navigateBack } from '../utils/navigation';

type RecurringDetailData = Awaited<ReturnType<typeof recurringAppointmentService.get>>;

export const RecurringAppointmentViewPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showMaterializeModal, setShowMaterializeModal] = useState(false);
  const [materializeDate, setMaterializeDate] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['recurring-appointment-detail', id],
    queryFn: async () => {
      if (!id) throw new Error('Missing recurring appointment id');
      const [template, appointmentTypes] = await Promise.all([
        recurringAppointmentService.get(id),
        lookupService.listAppointmentTypes().catch(() => []),
      ]);
      return { template, appointmentTypes };
    },
    enabled: !!id,
  });

  const template: RecurringDetailData | null = data?.template || null;

  const materializeMutation = useMutation({
    mutationFn: async () => {
      if (!id || !materializeDate) return;
      await recurringAppointmentService.materialize(id, materializeDate);
    },
    onSuccess: async () => {
      setShowMaterializeModal(false);
      setMaterializeDate('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['appointments'] }),
        queryClient.invalidateQueries({ queryKey: ['recurringAppointments'] }),
        queryClient.invalidateQueries({ queryKey: ['recurring-appointment-detail', id] }),
      ]);
    },
  });

  const appointmentTypeName = useMemo(() => {
    if (!template) return '-';
    return data?.appointmentTypes.find((t) => t.appointment_type_id === template.appointment_type_id)?.type_name || '-';
  }, [data?.appointmentTypes, template]);

  const titleName = template?.appointment_name || appointmentTypeName;

  const groupDetails = (template?.group && typeof template.group === 'object')
    ? (template.group as Record<string, unknown>)
    : null;

  const investeeDetails = (template?.investee && typeof template.investee === 'object')
    ? (template.investee as Record<string, unknown>)
    : null;

  const fmtDateTime = (value?: string) => {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString();
  };

  const getEndTime = (startTime?: string | null, durationMinutes?: number | null) => {
    if (!startTime) return '-';
    const [sh, sm] = startTime.split(':').map(Number);
    if (Number.isNaN(sh) || Number.isNaN(sm)) return '-';
    const total = (sh * 60) + sm + Math.max(0, durationMinutes || 0);
    const endH = Math.floor(total / 60) % 24;
    const endM = total % 60;
    return formatTime(`${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}:00`);
  };

  if (isLoading) return <div className="p-12 text-center text-textMuted">Loading recurring template...</div>;
  if (!template) return <div className="p-12 text-center text-textMuted">Recurring template not found.</div>;

  const heroName = titleName || 'RC';

  const handleMaterialize = async () => {
    if (!materializeDate) {
      alert('Please select an occurrence date first');
      return;
    }
    try {
      await materializeMutation.mutateAsync();
      alert('Appointment materialized successfully');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to materialize appointment');
    }
  };

  return (
    <div className="space-y-6">
      <button onClick={() => navigateBack(navigate, '/recurring-appointments')} className="flex items-center gap-2 text-textMuted hover:text-text transition-colors text-sm">
        <ArrowLeft size={16} /> Back
      </button>

      <Card className="p-6 bg-surface border-surfaceHighlight">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-xl font-bold text-white uppercase shrink-0">
            {heroName.substring(0, 2)}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-text">Recurring Template Details</h1>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-textMuted">
              <span className="flex items-center gap-1"><Repeat size={14} /> {rruleToHuman(template.rrule)}</span>
              <span className="flex items-center gap-1"><Clock size={14} /> {formatTime(template.start_time)} - {getEndTime(template.start_time, template.duration_minutes)}</span>
              <span className="flex items-center gap-1"><Calendar size={14} /> {formatDate(template.start_date)} - {formatDate(template.end_date)}</span>
            </div>
          </div>
          <Button onClick={() => setShowMaterializeModal(true)}>Materialize</Button>
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
          <div><span className="text-textMuted">Start Time:</span> <span className="text-text ml-1">{formatTime(template.start_time)}</span></div>
          <div><span className="text-textMuted">End Time:</span> <span className="text-text ml-1">{getEndTime(template.start_time, template.duration_minutes)}</span></div>
          <div><span className="text-textMuted">Date Range:</span> <span className="text-text ml-1">{formatDate(template.start_date)} - {formatDate(template.end_date)}</span></div>
          <div><span className="text-textMuted">Pattern:</span> <span className="text-text ml-1">{rruleToHuman(template.rrule)}</span></div>
          <div><span className="text-textMuted">Created At:</span> <span className="text-text ml-1">{fmtDateTime(template.created_at)}</span></div>
          <div><span className="text-textMuted">Last Updated:</span> <span className="text-text ml-1">{fmtDateTime(template.modified_at)}</span></div>
        </div>
      </Card>

      <Card className="p-6 bg-surface border-surfaceHighlight space-y-3">
        <div className="flex items-center gap-2">
          <Users size={18} className="text-primary" />
          <h2 className="text-lg font-semibold text-text">Group Details</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-textMuted">Group:</span>{' '}
            {groupDetails?.group_id ? (
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={() => navigate(`/groups/${String(groupDetails.group_id)}`)}
              >
                {String(groupDetails?.group_name || '-')}
              </button>
            ) : (
              <span className="text-text ml-1">{String(groupDetails?.group_name || '-')}</span>
            )}
          </div>
          <div><span className="text-textMuted">Start Date:</span> <span className="text-text ml-1">{formatDate(groupDetails?.start_date as string | undefined)}</span></div>
          <div><span className="text-textMuted">End Date:</span> <span className="text-text ml-1">{formatDate(groupDetails?.end_date as string | undefined)}</span></div>
        </div>
      </Card>

      <Card className="p-6 bg-surface border-surfaceHighlight space-y-3">
        <div className="flex items-center gap-2">
          <Mail size={18} className="text-primary" />
          <h2 className="text-lg font-semibold text-text">Investee Details</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-textMuted">Name:</span>{' '}
            {investeeDetails?.investee_id ? (
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={() => navigate(`/investees/${String(investeeDetails.investee_id)}`)}
              >
                {String(investeeDetails?.investee_name || '-')}
              </button>
            ) : (
              <span className="text-text ml-1">{String(investeeDetails?.investee_name || '-')}</span>
            )}
          </div>
          <div><span className="text-textMuted">Email:</span> <span className="text-text ml-1">{String(investeeDetails?.email || '-')}</span></div>
          <div><span className="text-textMuted">Start Date:</span> <span className="text-text ml-1">{formatDate(investeeDetails?.start_date as string | undefined)}</span></div>
          <div><span className="text-textMuted">End Date:</span> <span className="text-text ml-1">{formatDate(investeeDetails?.end_date as string | undefined)}</span></div>
        </div>
      </Card>

      <Card className="p-6 bg-surface border-surfaceHighlight space-y-3">
        <div className="flex items-center gap-2">
          <Users size={18} className="text-primary" />
          <h2 className="text-lg font-semibold text-text">Partners</h2>
        </div>
        {!template.partners || template.partners.length === 0 ? (
          <p className="text-sm text-textMuted">No partners assigned to this recurring template.</p>
        ) : (
          <div className="space-y-2">
            {template.partners.map((p) => (
              <div
                key={p.partner_id}
                className="flex items-center justify-between px-3 py-2 bg-surfaceHighlight/20 rounded-lg text-sm cursor-pointer"
                onClick={() => navigate(`/partners/${p.partner_id}`)}
              >
                <span className="text-text">{p.partner_name || p.partner_id}</span>
                <span className="text-xs text-textMuted">{p.email || '-'}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal isOpen={showMaterializeModal} onClose={() => setShowMaterializeModal(false)} title="Materialize Occurrence">
        <div className="space-y-4">
          <p className="text-sm text-textMuted">Select a date within the template range to create a concrete appointment from this recurring series.</p>
          <Input label="Occurrence Date" type="date" value={materializeDate} onChange={(e) => setMaterializeDate(e.target.value)} required />
          <div className="pt-4 flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowMaterializeModal(false)}>Cancel</Button>
            <Button onClick={handleMaterialize} disabled={!materializeDate}>Materialize</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
