import { useState, useEffect } from 'react';
import { Modal, Input, Select, Button } from './Common';
import { PartnerPickerField } from './PartnerSelectorModal';
import { AppointmentType, GroupType } from '../types';
import { validateAppointmentForm } from '../utils/validation';
import { useAppointmentForm, AppointmentFormState } from '../hooks/useAppointmentForm';

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called when user clicks Create/Update. Parent handles API call and closing. */
  onSubmit: (data: AppointmentFormState, selectedPartnerIds: string[]) => Promise<void>;
  appointmentTypes: AppointmentType[];
  groupTypes: GroupType[];
  investees: Array<{ investee_id: string; investee_name: string }>;
  allPartners: Array<{ partner_id: string; partner_name: string; email?: string }>;
  /** Optional: initial data for editing an existing appointment */
  initialData?: Partial<AppointmentFormState>;
  initialSelectedPartnerIds?: string[];
  onGroupSelect?: (groupId: string) => Promise<void>;
  defaultDate?: string;
  isEditing?: boolean;
}

export function AppointmentModal({
  isOpen,
  onClose,
  onSubmit,
  appointmentTypes,
  groupTypes,
  investees,
  allPartners,
  initialData,
  initialSelectedPartnerIds,
  defaultDate,
  isEditing = false,
}: AppointmentModalProps) {
  const { form, updateForm, selectedPartnerIds, setSelectedPartnerIds, resetForm } = useAppointmentForm();

  const [saving, setSaving] = useState(false);

  // Initialize once per open to avoid resetting user edits while modal is active.
  useEffect(() => {
    if (!isOpen) return;

    resetForm();

    if (initialData) {
      updateForm(initialData);
    }

    if (defaultDate && !initialData?.meeting_date) {
      updateForm({ meeting_date: defaultDate });
    }

    if (initialSelectedPartnerIds && initialSelectedPartnerIds.length > 0) {
      setSelectedPartnerIds(initialSelectedPartnerIds);
    } else {
      setSelectedPartnerIds([]);
    }
  // Intentionally initialize only on open; resetting on every prop update breaks input interaction.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleSubmit = async () => {
    const validation = validateAppointmentForm(form);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    setSaving(true);
    try {
      await onSubmit(form, selectedPartnerIds);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to save appointment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={isEditing ? 'Edit Appointment' : 'New Appointment'}
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
            value={form.appointment_type_id || form.meeting_type || ''}
            onChange={(e) => updateForm({ appointment_type_id: e.target.value, meeting_type: e.target.value })}
          >
            <option value="">Select type...</option>
            {appointmentTypes.map(t => (
              <option key={t.appointment_type_id} value={t.appointment_type_id}>
                {t.type_name}
              </option>
            ))}
          </Select>

          <Input
            label="Date"
            type="date"
            value={form.meeting_date || ''}
            onChange={(e) => updateForm({ meeting_date: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Time"
              type="time"
              value={form.planned_start || '09:00'}
              onChange={(e) => updateForm({ planned_start: e.target.value })}
              required
            />
            <Input
              label="End Time"
              type="time"
              value={form.planned_end || '10:00'}
              onChange={(e) => updateForm({ planned_end: e.target.value })}
              required
            />
          </div>

          <Select
            label="Group Type (Optional)"
            value={form.group_type_id || ''}
            onChange={(e) => updateForm({ group_type_id: e.target.value })}
          >
            <option value="">None</option>
            {groupTypes.map(t => (
              <option key={t.group_type_id} value={t.group_type_id}>
                {t.type_name}
              </option>
            ))}
          </Select>

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
            allPartners={allPartners}
            selectedIds={selectedPartnerIds}
            onChange={setSelectedPartnerIds}
          />

          <div className="pt-4 flex justify-end gap-3 border-t border-surfaceHighlight">
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {isEditing ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

// Backward-compatible export name while migrating call sites.
export const CreateAppointmentModal = AppointmentModal;
