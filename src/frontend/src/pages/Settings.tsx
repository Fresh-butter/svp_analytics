

import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Card, Modal, Button, Input } from '../components/Common';

type Admin = {
  user_id: string;
  name: string;
  email: string;
  chapter_id: string;
};

export const SettingsPage = () => {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

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

  useEffect(() => { void fetchAdmins(); }, []);

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
        <Button onClick={() => setIsOpen(true)}>Add Admin</Button>
      </div>

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
                    <Button variant="ghost" onClick={() => navigator.clipboard?.writeText(a.email)}>Copy Email</Button>
                    <Button variant="danger" onClick={() => handleRemove(a.user_id)}>Remove</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Add Admin">
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
    </div>
  );
};
