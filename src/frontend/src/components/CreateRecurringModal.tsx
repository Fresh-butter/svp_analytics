import { useState, useEffect } from 'react';
import { Modal, Input, Select, Button } from './Common';
import { TimePicker } from './TimePicker';
import { PartnerPickerField } from './PartnerSelectorModal';
import { RecurringFormState, useRecurringForm } from '../hooks/useAppointmentForm';
import { validateRecurringForm } from '../utils/validation';
import { format, addMonths } from 'date-fns';
import { DAY_NAMES, NTH_LABELS } from '../constants/calendar';

interface RecurringAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: RecurringFormState, selectedPartnerIds: string[]) => Promise<void>;
  appointmentTypes?: Array<{ appointment_type_id: string; type_name: string }>;
  groups: Array<{ group_id: string; group_name: string; investee_id?: string | null }>;
  investees: Array<{ investee_id: string; investee_name: string }>;
  allPartners?: Array<{ partner_id: string; partner_name: string; email?: string }>;
  initialData?: Partial<RecurringFormState>;
  initialSelectedPartnerIds?: string[];
  defaultDate?: string;
  isEditing?: boolean;
}

export function RecurringAppointmentModal({
  isOpen,
  onClose,
  onSubmit,
  appointmentTypes = [],
  groups,
  investees,
  allPartners = [],
  initialData,
  initialSelectedPartnerIds,
  defaultDate,
  isEditing = false,
}: RecurringAppointmentModalProps) {
  const { form, updateForm, resetForm } = useRecurringForm();
  const [saving, setSaving] = useState(false);
  const [selectedPartnerIds, setSelectedPartnerIds] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    resetForm();

    if (initialData) {
      updateForm(initialData);
    } else if (defaultDate) {
      updateForm({
        rec_app_start_date: defaultDate,
        rec_app_end_date: format(addMonths(new Date(defaultDate), 3), 'yyyy-MM-dd'),
      });
    }

    if (initialSelectedPartnerIds && initialSelectedPartnerIds.length > 0) {
      setSelectedPartnerIds(initialSelectedPartnerIds);
    } else {
      setSelectedPartnerIds([]);
    }
  }, [isOpen, initialData, defaultDate, initialSelectedPartnerIds, resetForm, updateForm]);

  const getFrequencyJson = () => {
    try {
      return JSON.parse(form.frequency_json || '{}');
    } catch {
      return { day_of_week: 1, nth_occurrence: 1, biweekly_pattern: '1_3' };
    }
  };

  const updateFrequency = (key: string, value: string | number) => {
    const current = getFrequencyJson();
    updateForm({ frequency_json: JSON.stringify({ ...current, [key]: value }) });
  };

  const handleSubmit = async () => {
    const validation = validateRecurringForm(form);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    setSaving(true);
    try {
      await onSubmit(form, selectedPartnerIds);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to save recurring appointment');
    } finally {
      setSaving(false);
    }
  };

  const frequencyJson = getFrequencyJson();
  const dayOfWeek = frequencyJson.day_of_week ?? 1;
  const nthOccurrence = frequencyJson.nth_occurrence ?? 1;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Recurring Series' : 'New Recurring Series'}
    >
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
        <Input
          label="Appointment Name (Optional)"
          type="text"
          value={form.appointment_name || ''}
          onChange={(e) => updateForm({ appointment_name: e.target.value })}
        />
        <Select
          label="Appointment Type (Optional)"
          value={form.meeting_type || ''}
          onChange={(e) => updateForm({ meeting_type: e.target.value })}
        >
          <option value="">Select type...</option>
          {appointmentTypes.map((t) => (
            <option key={t.appointment_type_id} value={t.appointment_type_id}>
              {t.type_name}
            </option>
          ))}
        </Select>

        <Select
          label="Group (Optional)"
          value={form.group_id || ''}
          onChange={(e) => {
            const nextGroupId = e.target.value;
            const selectedGroup = groups.find((g) => g.group_id === nextGroupId);

            updateForm({
              group_id: nextGroupId,
              // Default investee from selected group; user can still override manually.
              investee_id: nextGroupId ? (selectedGroup?.investee_id || '') : form.investee_id,
            });
          }}
        >
          <option value="">None</option>
          {groups.map(g => (
            <option key={g.group_id} value={g.group_id}>
              {g.group_name}
            </option>
          ))}
        </Select>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Start Date"
            type="date"
            value={form.rec_app_start_date || ''}
            onChange={(e) => updateForm({ rec_app_start_date: e.target.value })}
            required
          />
          <Input
            label="End Date"
            type="date"
            value={form.rec_app_end_date || ''}
            onChange={(e) => updateForm({ rec_app_end_date: e.target.value })}
            required
          />
        </div>

        <Select
          label="Frequency"
          value={form.frequency || 'Weekly'}
          onChange={(e) => updateForm({ frequency: e.target.value })}
        >
          <option value="Weekly">Weekly</option>
          <option value="BiWeekly">Bi-Weekly</option>
          <option value="Monthly">Monthly</option>
        </Select>

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Day of Week"
            value={dayOfWeek}
            onChange={(e) => updateFrequency('day_of_week', Number(e.target.value))}
          >
            {DAY_NAMES.map((name, i) => (
              <option key={i} value={i}>
                {name}
              </option>
            ))}
          </Select>

          {form.frequency === 'Monthly' && (
            <Select
              label="Occurrence"
              value={nthOccurrence}
              onChange={(e) => updateFrequency('nth_occurrence', Number(e.target.value))}
            >
              {NTH_LABELS.map((label, i) => (
                <option key={i} value={i + 1}>
                  {label}
                </option>
              ))}
            </Select>
          )}
        </div>

        {form.frequency === 'BiWeekly' && (
          <p className="text-xs text-textMuted -mt-1">
            Bi-weekly meetings happen every 2 weeks on the selected day.
          </p>
        )}

        <div className="grid grid-cols-2 gap-4">
          <TimePicker
            label="Start Time"
            value={form.planned_start || '09:00'}
            onChange={(val) => updateForm({ planned_start: val })}
            required
          />
          <TimePicker
            label="End Time"
            value={form.planned_end || '10:00'}
            onChange={(val) => updateForm({ planned_end: val })}
          />
        </div>

        <Select
          label="Investee (Optional)"
          value={form.investee_id || ''}
          onChange={(e) => updateForm({ investee_id: e.target.value })}
        >
          <option value="">None</option>
          {investees.map(i => (
            <option key={i.investee_id} value={i.investee_id}>
              {i.investee_name}
            </option>
          ))}
        </Select>

        <PartnerPickerField
          label="Partners (Optional)"
          allPartners={allPartners}
          selectedIds={selectedPartnerIds}
          onChange={setSelectedPartnerIds}
        />

        <div className="pt-4 flex justify-end gap-3 border-t border-surfaceHighlight">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {isEditing ? 'Update Series' : 'Create Series'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// Backward-compatible export name while migrating call sites.
export const CreateRecurringModal = RecurringAppointmentModal;
