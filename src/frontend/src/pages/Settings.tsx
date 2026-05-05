import React, { useState } from 'react';
import { Users, UserCog, CalendarClock, Shapes, Trash2, BadgeCheck, Tag, Layers, Lock, KeyRound } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card, Modal, Button, Input } from '../components/Common';
import { useAuth } from '../context/AuthContext';
import { useSettingsData } from '../hooks/useSettingsData';

type SettingsTab = 'admins' | 'partners' | 'appointments' | 'groups';

type SettingsTabItem = {
  id: SettingsTab;
  label: string;
  count: number;
  icon: LucideIcon;
};

const SectionState = ({
  loading,
  isEmpty,
  emptyText,
  children,
}: {
  loading: boolean;
  isEmpty: boolean;
  emptyText: string;
  children: React.ReactNode;
}) => {
  if (loading) {
    return (
      <div className="p-8 text-center text-textMuted">
        <div className="animate-pulse space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-10 bg-surfaceHighlight/30 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (isEmpty) {
    return <div className="p-8 text-center text-textMuted">{emptyText}</div>;
  }

  return <>{children}</>;
};

const TabHeader = ({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) => (
  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
    <div>
      <h3 className="text-xl font-semibold text-text">{title}</h3>
      <p className="text-sm text-textMuted mt-1">{subtitle}</p>
    </div>
    {action}
  </div>
);

export const SettingsPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.user_type === 'ADMIN';
  const {
    admins,
    partners,
    appointmentTypes,
    groupTypes,
    loadingAdmins,
    loadingPartners,
    loadingLookups,
    loadError,
    addAdmin,
    removeAdmin,
    lockPartner,
    unlockPartner,
    removePartner,
    createAppointmentType,
    deleteAppointmentType,
    createGroupType,
    deleteGroupType,
  } = useSettingsData(Boolean(isAdmin));

  const [activeTab, setActiveTab] = useState<SettingsTab>('admins');
  const [isOpen, setIsOpen] = useState(false);
  const [newAppointmentType, setNewAppointmentType] = useState('');
  const [newGroupType, setNewGroupType] = useState('');
  const [addingAppointmentType, setAddingAppointmentType] = useState(false);
  const [addingGroupType, setAddingGroupType] = useState(false);
  const [deletingTypeId, setDeletingTypeId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleAddAdmin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    try {
      await addAdmin({ name, email, password });
      setIsOpen(false);
      setName('');
      setEmail('');
      setPassword('');
    } catch (err) {
      console.error('Add admin failed:', err);
      alert((err as Error).message || 'Failed to add admin');
    }
  };

  const handleRemoveAdmin = async (userId: string) => {
    if (!window.confirm('Remove this admin? This cannot be undone.')) return;
    try {
      await removeAdmin(userId);
    } catch (err) {
      alert((err as Error).message || 'Action failed');
    }
  };

  const handleLockPartner = async (userId: string) => {
    if (!window.confirm('Lock this partner user? They will no longer be able to log in until unlocked by an admin.')) return;
    try {
      await lockPartner(userId);
    } catch (err) {
      alert((err as Error).message || 'Action failed');
    }
  };

  const handleUnlockPartner = async (userId: string) => {
    if (!window.confirm('Unlock this partner user? They will be able to log in again.')) return;
    try {
      await unlockPartner(userId);
    } catch (err) {
      alert((err as Error).message || 'Action failed');
    }
  };

  const handleDeletePartner = async (userId: string) => {
    if (!window.confirm('Delete this partner user? This will remove their login account (the partner entry will remain). This cannot be undone.')) return;
    try {
      await removePartner(userId);
    } catch (err) {
      alert((err as Error).message || 'Action failed');
    }
  };

  const handleAddAppointmentType = async () => {
    const typeName = newAppointmentType.trim();
    if (!typeName) return;
    try {
      setAddingAppointmentType(true);
      await createAppointmentType(typeName);
      setNewAppointmentType('');
    } catch (err) {
      alert((err as Error).message || 'Failed to add appointment type');
    } finally {
      setAddingAppointmentType(false);
    }
  };

  const handleDeleteAppointmentType = async (id: string) => {
    if (!window.confirm('Delete this appointment type?')) return;
    try {
      setDeletingTypeId(id);
      await deleteAppointmentType(id);
    } catch (err) {
      alert((err as Error).message || 'Failed to delete appointment type');
    } finally {
      setDeletingTypeId(null);
    }
  };

  const handleAddGroupType = async () => {
    const typeName = newGroupType.trim();
    if (!typeName) return;
    try {
      setAddingGroupType(true);
      await createGroupType(typeName);
      setNewGroupType('');
    } catch (err) {
      alert((err as Error).message || 'Failed to add group type');
    } finally {
      setAddingGroupType(false);
    }
  };

  const handleDeleteGroupType = async (id: string) => {
    if (!window.confirm('Delete this group type?')) return;
    try {
      setDeletingTypeId(id);
      await deleteGroupType(id);
    } catch (err) {
      alert((err as Error).message || 'Failed to delete group type');
    } finally {
      setDeletingTypeId(null);
    }
  };

  const tabs: SettingsTabItem[] = [
    { id: 'admins', label: 'Admins', count: admins.length, icon: UserCog },
    { id: 'partners', label: 'Partners', count: partners.length, icon: Users },
    { id: 'appointments', label: 'Appointment Types', count: appointmentTypes.length, icon: CalendarClock },
    { id: 'groups', label: 'Group Types', count: groupTypes.length, icon: Shapes },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-3xl font-bold text-text">Settings</h2>
      </div>
      <p className="text-textMuted mt-1">Manage chapter users and lookup types.</p>

      {loadError && (
        <Card className="bg-surface border-surfaceHighlight">
          <div className="p-3 text-sm text-red-400">
            {loadError}
          </div>
        </Card>
      )}

      {isAdmin ? (
        <>
          {/* Tabs Navigation */}
          <div className="flex overflow-x-auto gap-2 border-b border-surfaceHighlight pb-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors
                    ${
                      isActive
                        ? 'border-primary text-primary'
                        : 'border-transparent text-textMuted hover:text-text hover:border-surfaceHighlight'
                    }
                  `}
                >
                  <Icon size={17} />
                  {tab.label}
                  <span className="text-xs text-textMuted">({tab.count})</span>
                </button>
              );
            })}
          </div>

          {/* Tab 1: Manage Admins */}
          {activeTab === 'admins' && (
            <div className="space-y-4">
              <TabHeader
                title="Chapter Admins"
                subtitle="Users with full chapter-level management access."
                action={<Button onClick={() => setIsOpen(true)}>Add Admin</Button>}
              />
              <Card className="bg-surface border-surfaceHighlight">
                <div className="overflow-x-auto">
                  <SectionState
                    loading={loadingAdmins}
                    isEmpty={admins.length === 0}
                    emptyText="No admins found for your chapter."
                  >
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-surfaceHighlight bg-surfaceHighlight/20">
                          <th className="px-4 py-4 text-xs font-semibold text-textMuted uppercase tracking-wider">Name</th>
                          <th className="px-4 py-4 text-xs font-semibold text-textMuted uppercase tracking-wider">Email</th>
                          <th className="px-4 py-4 text-xs font-semibold text-textMuted uppercase tracking-wider">Access</th>
                          <th className="px-4 py-4 text-xs font-semibold text-textMuted uppercase tracking-wider text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surfaceHighlight">
                        {admins.map((a) => (
                          <tr key={a.user_id} className="hover:bg-surfaceHighlight/30 transition-colors">
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-500 flex items-center justify-center text-xs font-bold text-white uppercase shrink-0">
                                  {a.name.substring(0, 2)}
                                </div>
                                <div className="font-medium text-text">{a.name}</div>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-sm text-textMuted">{a.email}</td>
                            <td className="px-4 py-4 text-sm">
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-surfaceHighlight text-textMuted">
                                <BadgeCheck size={14} /> Admin
                              </span>
                            </td>
                            <td className="px-4 py-4 text-right">
                              <button
                                onClick={() => void handleRemoveAdmin(a.user_id)}
                                className="p-1.5 text-textMuted hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                                title="Remove Admin"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </SectionState>
                </div>
              </Card>
            </div>
          )}

          {/* Tab 2: Manage Partner Users */}
          {activeTab === 'partners' && (
            <div className="space-y-4">
              <TabHeader
                title="Partner Users"
                subtitle="All partner login users for this chapter (active and locked)."
              />
              <Card className="bg-surface border-surfaceHighlight">
                <div className="overflow-x-auto">
                  <SectionState
                    loading={loadingPartners}
                    isEmpty={partners.length === 0}
                    emptyText="No partner users found for your chapter."
                  >
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-surfaceHighlight bg-surfaceHighlight/20">
                          <th className="px-4 py-4 text-xs font-semibold text-textMuted uppercase tracking-wider">Name</th>
                          <th className="px-4 py-4 text-xs font-semibold text-textMuted uppercase tracking-wider">Email</th>
                          <th className="px-4 py-4 text-xs font-semibold text-textMuted uppercase tracking-wider">Access</th>
                          <th className="px-4 py-4 text-xs font-semibold text-textMuted uppercase tracking-wider text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surfaceHighlight">
                        {partners.map((p) => (
                          <tr key={p.user_id} className="hover:bg-surfaceHighlight/30 transition-colors">
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-500 flex items-center justify-center text-xs font-bold text-white uppercase shrink-0">
                                  {p.name.substring(0, 2)}
                                </div>
                                <div className="font-medium text-text">{p.name}</div>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-sm text-textMuted">{p.email}</td>
                            <td className="px-4 py-4 text-sm">
                              {p.is_active === false ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/10 text-amber-300">
                                  <Lock size={14} /> Locked
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-surfaceHighlight text-textMuted">
                                  <Users size={14} /> Active
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {p.is_active === false ? (
                                  <button
                                    onClick={() => void handleUnlockPartner(p.user_id)}
                                    className="p-1.5 text-textMuted hover:text-green-400 hover:bg-green-500/10 rounded-md transition-colors"
                                    title="Unlock Partner User"
                                  >
                                    <KeyRound size={16} />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => void handleLockPartner(p.user_id)}
                                    className="p-1.5 text-textMuted hover:text-amber-400 hover:bg-amber-500/10 rounded-md transition-colors"
                                    title="Lock Partner User"
                                  >
                                    <Lock size={16} />
                                  </button>
                                )}
                                <button
                                  onClick={() => void handleDeletePartner(p.user_id)}
                                  className="p-1.5 text-textMuted hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                                  title="Delete Partner User"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </SectionState>
                </div>
              </Card>
            </div>
          )}

          {/* Tab 3: Manage Appointment Types */}
          {activeTab === 'appointments' && (
            <div className="space-y-4">
              <TabHeader
                title="Appointment Types"
                subtitle="Reusable labels used while scheduling appointments."
              />
              <Card className="bg-surface border-surfaceHighlight">
                <div className="p-5 md:p-6">
                  <div className="mb-4">
                    <label className="text-sm font-medium text-textMuted">New Appointment Type</label>
                    <div className="mt-1.5 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-center">
                      <input
                        value={newAppointmentType}
                        onChange={(e) => setNewAppointmentType(e.target.value)}
                        placeholder="Enter type name"
                        className="h-11 w-full bg-background border border-surfaceHighlight rounded-lg px-4 text-text focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                      />
                      <Button
                        className="h-11 min-w-[88px]"
                        onClick={() => void handleAddAppointmentType()}
                        disabled={addingAppointmentType || !newAppointmentType.trim()}
                      >
                        {addingAppointmentType ? 'Adding...' : 'Add'}
                      </Button>
                    </div>
                  </div>
                  <SectionState
                    loading={loadingLookups}
                    isEmpty={appointmentTypes.length === 0}
                    emptyText="No appointment types found."
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {appointmentTypes.map((t) => (
                        <div key={t.appointment_type_id} className="px-3.5 py-3 bg-background border border-surfaceHighlight rounded-lg flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Tag size={16} className="text-textMuted shrink-0" />
                            <span className="text-text font-medium truncate">{t.type_name}</span>
                          </div>
                          <button
                            onClick={() => void handleDeleteAppointmentType(t.appointment_type_id)}
                            disabled={deletingTypeId === t.appointment_type_id}
                            className="p-1.5 text-textMuted hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors disabled:opacity-60"
                            title="Delete type"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </SectionState>
                </div>
              </Card>
            </div>
          )}

          {/* Tab 4: Manage Group Types */}
          {activeTab === 'groups' && (
            <div className="space-y-4">
              <TabHeader
                title="Group Types"
                subtitle="Classification types used when creating groups."
              />
              <Card className="bg-surface border-surfaceHighlight">
                <div className="p-5 md:p-6">
                  <div className="mb-4">
                    <label className="text-sm font-medium text-textMuted">New Group Type</label>
                    <div className="mt-1.5 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-center">
                      <input
                        value={newGroupType}
                        onChange={(e) => setNewGroupType(e.target.value)}
                        placeholder="Enter type name"
                        className="h-11 w-full bg-background border border-surfaceHighlight rounded-lg px-4 text-text focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                      />
                      <Button
                        className="h-11 min-w-[88px]"
                        onClick={() => void handleAddGroupType()}
                        disabled={addingGroupType || !newGroupType.trim()}
                      >
                        {addingGroupType ? 'Adding...' : 'Add'}
                      </Button>
                    </div>
                  </div>
                  <SectionState
                    loading={loadingLookups}
                    isEmpty={groupTypes.length === 0}
                    emptyText="No group types found."
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {groupTypes.map((t) => (
                        <div key={t.group_type_id} className="px-3.5 py-3 bg-background border border-surfaceHighlight rounded-lg flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Layers size={16} className="text-textMuted shrink-0" />
                            <span className="text-text font-medium truncate">{t.type_name}</span>
                          </div>
                          <button
                            onClick={() => void handleDeleteGroupType(t.group_type_id)}
                            disabled={deletingTypeId === t.group_type_id}
                            className="p-1.5 text-textMuted hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors disabled:opacity-60"
                            title="Delete type"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </SectionState>
                </div>
              </Card>
            </div>
          )}
        </>
      ) : (
        <Card className="bg-surface border-surfaceHighlight">
          <div className="p-6">
            <p className="text-textMuted">Admin settings are only available to chapter administrators.</p>
          </div>
        </Card>
      )}

      <Modal isOpen={isOpen && isAdmin} onClose={() => setIsOpen(false)} title="Add Admin">
        <form onSubmit={handleAddAdmin} className="space-y-4">
          <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Jane Doe" />
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="admin@example.org" />
          <Input label="Temporary password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Enter temporary password" />
          <div className="flex items-center justify-end gap-3">
            <Button variant="secondary" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit">Create Admin</Button>
          </div>
        </form>
      </Modal>

    </div>
  );
};
