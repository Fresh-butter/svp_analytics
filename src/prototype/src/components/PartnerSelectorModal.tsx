import { useState, useMemo, useEffect, useRef } from 'react';
import Fuse from 'fuse.js';
import { Search, X, UserPlus, Users } from 'lucide-react';
import { Modal, Button } from './Common';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PartnerOption {
  partner_id: string;
  partner_name: string;
  email?: string;
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

// ─── PartnerSelectorModal ─────────────────────────────────────────────────────

interface PartnerSelectorModalProps {
  isOpen: boolean;
  /** Called when the modal X button is pressed (no save). */
  onClose: () => void;
  title?: string;
  allPartners: PartnerOption[];
  selectedIds: string[];
  /** Called with the new list when the Done button is pressed. */
  onChange: (newIds: string[]) => void;
}

function PartnerSelectorModal({
  isOpen,
  onClose,
  title = 'Select Partners',
  allPartners,
  selectedIds,
  onChange,
}: PartnerSelectorModalProps) {
  const [query, setQuery] = useState('');
  const [localIds, setLocalIds] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Snapshot selectedIds when modal opens; do NOT include selectedIds in deps
  // so mid-session external changes don't clobber local edits.
  useEffect(() => {
    if (isOpen) {
      setLocalIds([...selectedIds]);
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedPartners = useMemo(
    () => allPartners.filter(p => localIds.includes(p.partner_id)),
    [allPartners, localIds],
  );
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const fuse = useMemo(
    () => new Fuse(allPartners, {
      keys: [
        { name: 'partner_name', weight: 0.7 },
        { name: 'email', weight: 0.3 },
      ],
      threshold: 0.4,
      includeScore: true,
    }),
    [allPartners],
  );

  const suggestions = useMemo(() => {
    const unselected = allPartners.filter((p) => !localIds.includes(p.partner_id));
    if (!query.trim()) return unselected.slice(0, 12);
    return fuse
      .search(query)
      .map((r) => r.item)
      .filter((p) => !localIds.includes(p.partner_id));
  }, [query, fuse, allPartners, localIds]);

  const addPartner = (id: string) => {
    setLocalIds(prev => [...prev, id]);
    setQuery('');
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const removePartner = (id: string) =>
    setLocalIds(prev => prev.filter(x => x !== id));

  const handleDone = () => {
    onChange(localIds);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      panelClassName="overflow-hidden"
      bodyClassName="p-0"
    >
      <div className="h-[min(70vh,620px)] p-6 flex flex-col">
        {/* ── Search input ── */}
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted pointer-events-none"
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full bg-background border border-surfaceHighlight rounded-lg pl-9 pr-9 py-2.5 text-sm text-text placeholder:text-textMuted outline-none focus:border-primary focus:ring-2 focus:ring-primary/25 transition-all"
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(''); inputRef.current?.focus(); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-textMuted hover:text-text transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="mt-4 flex-1 overflow-y-auto no-scrollbar pr-1 space-y-6">
          {/* ── Suggestions ── */}
          <div>
            <p className="text-xs font-medium text-textMuted mb-2 px-1">
              {query.trim() ? `Results for "${query}"` : 'Available partners'}
            </p>
            {suggestions.length > 0 ? (
              <div className="space-y-0.5">
                {suggestions.map((p) => (
                  <button
                    key={p.partner_id}
                    type="button"
                    onClick={() => addPartner(p.partner_id)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left hover:bg-surfaceHighlight/50 active:bg-surfaceHighlight transition-colors group"
                  >
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-bold flex-shrink-0">
                      {initials(p.partner_name)}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-medium text-text truncate">
                        {p.partner_name}
                      </span>
                      {p.email && (
                        <span className="block text-xs text-textMuted truncate">
                          {p.email}
                        </span>
                      )}
                    </span>
                    <UserPlus
                      size={15}
                      className="flex-shrink-0 text-textMuted group-hover:text-primary transition-colors"
                    />
                  </button>
                ))}
              </div>
            ) : query.trim() ? (
              <p className="text-sm text-textMuted text-center py-4">
                No partners match your search.
              </p>
            ) : (
              <p className="text-sm text-textMuted text-center py-4">
                All available partners have been added.
              </p>
            )}
          </div>

          <div className="border-t border-surfaceHighlight" />

          {/* ── Selected list ── */}
          <div>
            <div className="flex items-center gap-2 mb-2 px-1">
              <Users size={13} className="text-textMuted" />
              <span className="text-xs font-medium text-textMuted">Selected</span>
              <span className="ml-auto text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-semibold">
                {localIds.length}
              </span>
            </div>
            {selectedPartners.length === 0 ? (
              <p className="text-sm text-textMuted text-center py-3">
                No partners selected yet.
              </p>
            ) : (
              <div className="space-y-0.5">
                {selectedPartners.map((p) => (
                  <div
                    key={p.partner_id}
                    draggable
                    onDragStart={(e) => { e.dataTransfer.setData('text/plain', p.partner_id); setDraggingId(p.partner_id); }}
                    onDragEnd={() => setDraggingId(null)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const draggedId = e.dataTransfer.getData('text/plain');
                      if (!draggedId) return;
                      if (draggedId === p.partner_id) return;
                      // Reorder localIds according to drop position
                      setLocalIds(prev => {
                        const fromIdx = prev.indexOf(draggedId);
                        const toIdx = prev.indexOf(p.partner_id);
                        if (fromIdx === -1 || toIdx === -1) return prev;
                        const next = [...prev];
                        next.splice(fromIdx, 1);
                        next.splice(toIdx, 0, draggedId);
                        return next;
                      });
                    }}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg bg-primary/5 border border-primary/10 ${draggingId === p.partner_id ? 'opacity-60' : ''}`}
                  >
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary text-xs font-bold flex-shrink-0">
                      {initials(p.partner_name)}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-medium text-text truncate">
                        {p.partner_name}
                      </span>
                      {p.email && (
                        <span className="block text-xs text-textMuted truncate">
                          {p.email}
                        </span>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => removePartner(p.partner_id)}
                      className="flex-shrink-0 p-1 rounded text-textMuted hover:text-red-400 hover:bg-red-400/10 transition-colors"
                      title={`Remove ${p.partner_name}`}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-surfaceHighlight">
          <Button onClick={handleDone}>Done</Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── PartnerPickerField ───────────────────────────────────────────────────────
// Inline field with chip display + button to open PartnerSelectorModal.

interface PartnerPickerFieldProps {
  label?: string;
  required?: boolean;
  allPartners: PartnerOption[];
  selectedIds: string[];
  onChange: (newIds: string[]) => void;
  modalTitle?: string;
}

export function PartnerPickerField({
  label = 'Partners',
  required,
  allPartners,
  selectedIds,
  onChange,
  modalTitle,
}: PartnerPickerFieldProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedPartners = allPartners.filter(p =>
    selectedIds.includes(p.partner_id),
  );

  return (
    <div className="space-y-1.5">
      {/* Label row */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-textMuted">
          {label}
          {required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
        >
          <UserPlus size={13} />
          Edit Partners
        </button>
      </div>

      {selectedPartners.length === 0 ? (
        <div className="w-full px-4 py-2.5 bg-background border border-surfaceHighlight border-dashed rounded-lg text-sm text-textMuted">
          No partners selected.
        </div>
      ) : (
        <div className="space-y-2 bg-background border border-surfaceHighlight rounded-lg p-2.5">
          {selectedPartners.map((p) => (
            <div
              key={p.partner_id}
              className="flex items-center justify-between gap-2 px-3 py-2 rounded-md border border-surfaceHighlight bg-surfaceHighlight/10"
            >
              <span className="text-sm text-text truncate">{p.partner_name}</span>
              <button
                type="button"
                onClick={() => onChange(selectedIds.filter(id => id !== p.partner_id))}
                className="flex-shrink-0 p-1 rounded text-textMuted hover:text-red-400 hover:bg-red-400/10 transition-colors"
                title={`Remove ${p.partner_name}`}
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <PartnerSelectorModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={modalTitle ?? label}
        allPartners={allPartners}
        selectedIds={selectedIds}
        onChange={newIds => {
          onChange(newIds);
          setIsOpen(false);
        }}
      />
    </div>
  );
}

export default PartnerSelectorModal;
