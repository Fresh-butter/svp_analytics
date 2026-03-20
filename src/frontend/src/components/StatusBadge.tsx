import React from 'react';

type BadgeProps = {
  className?: string;
  children: React.ReactNode;
};

const BaseBadge = ({ className = '', children }: BadgeProps) => (
  <span className={`inline-flex items-center text-xs px-2 py-1 rounded-full font-medium ${className}`}>{children}</span>
);

const normalizeStatus = (status: string | null | undefined) => (status || '').trim().toUpperCase();

const toLabel = (status: string | null | undefined) => {
  const normalized = normalizeStatus(status);
  if (normalized === 'PENDING' || normalized === 'SCHEDULED') return 'Scheduled';
  if (normalized === 'COMPLETED') return 'Completed';
  if (normalized === 'CANCELLED' || normalized === 'CANCELED') return 'Cancelled';
  if (!status) return '-';
  return status;
};

export const AppointmentStatusBadge = ({ status, className = '' }: { status: string | null | undefined; className?: string }) => {
  const normalized = normalizeStatus(status);
  const tone =
    normalized === 'COMPLETED'
      ? 'bg-green-500/10 text-green-500'
      : normalized === 'CANCELLED' || normalized === 'CANCELED'
        ? 'bg-red-500/10 text-red-400'
        : 'bg-yellow-500/10 text-yellow-500';

  return <BaseBadge className={`${tone} ${className}`}>{toLabel(status)}</BaseBadge>;
};

export const ActiveStatusBadge = ({ active, className = '' }: { active: boolean; className?: string }) => {
  const tone = active ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-400';
  return <BaseBadge className={`${tone} ${className}`}>{active ? 'Active' : 'Inactive'}</BaseBadge>;
};
