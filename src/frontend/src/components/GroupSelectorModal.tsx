import { useMemo, useState } from 'react';
import Fuse from 'fuse.js';
import { Search, Layers } from 'lucide-react';
import { Modal, Button } from './Common';

interface GroupOption {
  group_id: string;
  group_name: string;
  group_type_name?: string;
  investee_name?: string;
}

interface GroupSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: GroupOption[];
  onSelect: (groupId: string) => Promise<void> | void;
}

export function GroupSelectorModal({
  isOpen,
  onClose,
  groups,
  onSelect,
}: GroupSelectorModalProps) {
  const [query, setQuery] = useState('');
  const [selectingId, setSelectingId] = useState<string | null>(null);

  const fuse = useMemo(
    () =>
      new Fuse(groups, {
        keys: [
          { name: 'group_name', weight: 0.6 },
          { name: 'group_type_name', weight: 0.25 },
          { name: 'investee_name', weight: 0.15 },
        ],
        threshold: 0.4,
      }),
    [groups],
  );

  const filteredGroups = useMemo(() => {
    if (!query.trim()) return groups;
    return fuse.search(query).map((r) => r.item);
  }, [query, groups, fuse]);

  const handleSelect = async (groupId: string) => {
    try {
      setSelectingId(groupId);
      await onSelect(groupId);
      onClose();
    } finally {
      setSelectingId(null);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Select Group">
      <div className="space-y-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search groups, type, investee..."
            className="w-full bg-background border border-surfaceHighlight rounded-lg pl-9 pr-4 py-2.5 text-sm text-text outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>

        {filteredGroups.length === 0 ? (
          <p className="text-sm text-textMuted text-center py-4">No groups found.</p>
        ) : (
          <div className="max-h-72 overflow-y-auto no-scrollbar space-y-2">
            {filteredGroups.map((group) => (
              <button
                key={group.group_id}
                type="button"
                onClick={() => handleSelect(group.group_id)}
                disabled={selectingId === group.group_id}
                className="w-full text-left p-3 rounded-lg border border-surfaceHighlight bg-background hover:bg-surfaceHighlight/40 transition-colors disabled:opacity-60"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Layers size={14} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text truncate">{group.group_name}</p>
                    <p className="text-xs text-textMuted mt-0.5 truncate">
                      {group.group_type_name || 'No group type'}
                      {group.investee_name ? ` | ${group.investee_name}` : ''}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-surfaceHighlight">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </Modal>
  );
}
