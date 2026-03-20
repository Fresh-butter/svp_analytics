import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Trash2 } from 'lucide-react';
import { Button, Modal } from './Common';
import { lookupTypeFormSchema, LookupTypeFormData } from '../schemas/formSchemas';

interface LookupOption {
  id: string;
  name: string;
}

interface LookupManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  addLabel: string;
  options: LookupOption[];
  onCreate: (name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  emptyText: string;
}

export const LookupManagerModal = ({
  isOpen,
  onClose,
  title,
  addLabel,
  options,
  onCreate,
  onDelete,
  emptyText,
}: LookupManagerModalProps) => {
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LookupTypeFormData>({
    resolver: zodResolver(lookupTypeFormSchema),
    defaultValues: { type_name: '' },
  });

  const sortedOptions = useMemo(
    () => [...options].sort((a, b) => a.name.localeCompare(b.name)),
    [options]
  );

  const handleCreate = async (values: LookupTypeFormData) => {
    try {
      setCreating(true);
      await onCreate(values.type_name.trim());
      reset({ type_name: '' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create type';
      window.alert(message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (option: LookupOption) => {
    const confirmed = window.confirm(
      `Delete "${option.name}"? This may be blocked if the type is already in use.`
    );

    if (!confirmed) return;

    try {
      setDeletingId(option.id);
      await onDelete(option.id);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete type';
      window.alert(`Could not delete "${option.name}": ${message}`);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-4">
        <form className="flex items-end gap-3" onSubmit={handleSubmit(handleCreate)}>
          <div className="flex-1">
            <label className="text-sm font-medium text-textMuted">{addLabel}</label>
            <input
              {...register('type_name')}
              placeholder="Enter type name"
              className="mt-1 w-full bg-background border border-surfaceHighlight rounded-lg px-4 py-2.5 text-text focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
            />
            {errors.type_name && <p className="mt-1 text-xs text-red-400">{errors.type_name.message}</p>}
          </div>
          <Button type="submit" disabled={creating}>
            Add
          </Button>
        </form>

        <div className="border border-surfaceHighlight rounded-lg max-h-64 overflow-y-auto divide-y divide-surfaceHighlight">
          {sortedOptions.length === 0 ? (
            <p className="p-4 text-sm text-textMuted">{emptyText}</p>
          ) : (
            sortedOptions.map((option) => (
              <div key={option.id} className="px-3 py-2 flex items-center justify-between gap-3">
                <span className="text-sm text-text">{option.name}</span>
                <button
                  onClick={() => handleDelete(option)}
                  disabled={deletingId === option.id}
                  className="p-1.5 text-textMuted hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors disabled:opacity-60"
                  title="Delete"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
};
