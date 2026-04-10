

import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Card, Modal, Button, Input } from '../components/Common';
import { LookupManagerModal } from '../components/LookupManagerModal';
import { lookupService } from '../services/lookupService';
import { AppointmentType, GroupType } from '../types';
import { useAuth } from '../context/AuthContext';

type Admin = {
  user_id: string;
  name: string;
  email: string;
  chapter_id: string;
};

export const SettingsPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.user_type === 'ADMIN';
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>([]);
  const [groupTypes, setGroupTypes] = useState<GroupType[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingLookups, setLoadingLookups] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isAppointmentTypeModalOpen, setIsAppointmentTypeModalOpen] = useState(false);
  const [isGroupTypeModalOpen, setIsGroupTypeModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const res = await api.get<{ data: Admin[] }>('/settings/admins');
      setAdmins(res.data || []);
    } catch (err) {
      console.error('Failed to load admins:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLookupTypes = async () => {
    try {
      setLoadingLookups(true);
      const [apptTypes, grpTypes] = await Promise.all([
        lookupService.listAppointmentTypes(),
        lookupService.listGroupTypes(),
      ]);
      setAppointmentTypes(apptTypes);
      setGroupTypes(grpTypes);
    } catch (err) {
      console.error('Failed to load lookup types:', err);
    } finally {
      setLoadingLookups(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      void fetchAdmins();
      void fetchLookupTypes();
    }
  }, []);

  const handleAdd = async (e?: React.FormEvent) => {
    e?.preventDefault();
    try {
      const res = await api.post<{ data: Admin }>('/settings/admins', { name, email, password });
      setAdmins((s) => [res.data, ...s]);
      setIsOpen(false);
      setName(''); setEmail(''); setPassword('');
    } catch (err) {
      console.error('Add admin failed:', err);
      alert((err as Error).message || 'Failed to add admin');
    }
  };

  const handleRemove = async (id: string) => {
    if (!confirm('Remove this admin? This cannot be undone.')) return;
    try {
      await api.delete(`/settings/admins/${id}`);
      setAdmins((s) => s.filter((a) => a.user_id !== id));
    } catch (err) {
      console.error('Remove admin failed:', err);
      alert((err as Error).message || 'Failed to remove admin');
    }
  };

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-text mb-2">Settings</h2>
        {isAdmin && <Button onClick={() => setIsOpen(true)}>Add Admin</Button>}
      </div>

      {isAdmin && (
        <>
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-medium text-textMuted mb-4">Chapter Admins</h3>
              {loading ? (
                <p className="text-textMuted">Loading…</p>
              ) : admins.length === 0 ? (
                <p className="text-textMuted italic">No admins found for your chapter.</p>
              ) : (
                <div className="space-y-3">
                  {admins.map((a) => (
                    <div key={a.user_id} className="flex items-center justify-between p-3 bg-background border border-surfaceHighlight rounded-lg">
                      <div>
                        <div className="font-medium text-text">{a.name}</div>
                        <div className="text-sm text-textMuted">{a.email}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Button
                          variant="ghost"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(a.email);
                              setCopiedId(a.user_id);
                              setTimeout(() => setCopiedId((id) => (id === a.user_id ? null : id)), 2000);
                            } catch (err) {
                              console.error('Clipboard write failed', err);
                              alert('Failed to copy to clipboard');
                            }
                          }}
                        >
                          {copiedId === a.user_id ? 'Copied' : 'Copy Email'}
                        </Button>
                        <Button variant="danger" onClick={() => handleRemove(a.user_id)}>Remove</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          <Card>
            <div className="p-6 space-y-4">
              <h3 className="text-lg font-medium text-textMuted">Type Management</h3>
              <p className="text-sm text-textMuted">Manage appointment and group types from Settings.</p>

              {loadingLookups ? (
                <p className="text-textMuted">Loading types...</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setIsAppointmentTypeModalOpen(true)}
                    className="text-left p-4 bg-background border border-surfaceHighlight rounded-lg hover:border-primary/50 transition-colors"
                  >
                    <div className="font-medium text-text">Appointment Types</div>
                    <div className="text-sm text-textMuted mt-1">{appointmentTypes.length} type{appointmentTypes.length !== 1 ? 's' : ''}</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsGroupTypeModalOpen(true)}
                    className="text-left p-4 bg-background border border-surfaceHighlight rounded-lg hover:border-primary/50 transition-colors"
                  >
                    <div className="font-medium text-text">Group Types</div>
                    <div className="text-sm text-textMuted mt-1">{groupTypes.length} type{groupTypes.length !== 1 ? 's' : ''}</div>
                  </button>
                </div>
              )}
            </div>
          </Card>
        </>
      )}

      <Modal isOpen={isOpen && isAdmin} onClose={() => setIsOpen(false)} title="Add Admin">
        <form onSubmit={handleAdd} className="space-y-4">
          <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Jane Doe" />
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="admin@example.org" />
          <Input label="Temporary password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Enter temporary password" />
          <div className="flex items-center justify-end gap-3">
            <Button variant="secondary" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit">Create Admin</Button>
          </div>
        </form>
      </Modal>

      <LookupManagerModal
        isOpen={isAppointmentTypeModalOpen && isAdmin}
        onClose={() => setIsAppointmentTypeModalOpen(false)}
        title="Manage Appointment Types"
        addLabel="New Appointment Type"
        options={appointmentTypes.map((t) => ({ id: t.appointment_type_id, name: t.type_name }))}
        onCreate={async (nameValue) => {
          const created = await lookupService.createAppointmentType(nameValue);
          setAppointmentTypes((current) => [created, ...current]);
        }}
        onDelete={async (id) => {
          await lookupService.deleteAppointmentType(id);
          setAppointmentTypes((current) => current.filter((item) => item.appointment_type_id !== id));
        }}
        emptyText="No appointment types found."
      />

      <LookupManagerModal
        isOpen={isGroupTypeModalOpen && isAdmin}
        onClose={() => setIsGroupTypeModalOpen(false)}
        title="Manage Group Types"
        addLabel="New Group Type"
        options={groupTypes.map((t) => ({ id: t.group_type_id, name: t.type_name }))}
        onCreate={async (nameValue) => {
          const created = await lookupService.createGroupType(nameValue);
          setGroupTypes((current) => [created, ...current]);
        }}
        onDelete={async (id) => {
          await lookupService.deleteGroupType(id);
          setGroupTypes((current) => current.filter((item) => item.group_type_id !== id));
        }}
        emptyText="No group types found."
      />
    </div>
  );
};
