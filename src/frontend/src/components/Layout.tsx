import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  Users,
  Target,
  Layers,
  Calendar,
  CalendarCheck,
  Repeat,
  BarChart3,
  Settings, MessageSquare,
  Menu,
  ChevronDown,
  ChevronRight,
  Bell,
  Sun,
  Moon,
  LogOut,
  KeyRound,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { appointmentService } from '../services/appointmentService';
import type { AppointmentNotification } from '../services/appointmentService';
import { formatDate } from '../utils/formatters';
import { Modal, Button, Input } from './Common';
import { api } from '../services/api';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const SidebarItem = ({
  icon: Icon,
  label,
  to,
  active = false,
  hasSubmenu = false,
  isOpen = false,
  onClick
}: {
  icon: LucideIcon,
  label: string,
  to?: string,
  active?: boolean,
  hasSubmenu?: boolean,
  isOpen?: boolean,
  onClick?: () => void
}) => {
  const content = (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 cursor-pointer group",
        active
          ? "bg-sidebarActive text-sidebarTextActive font-medium border-l-4 border-primary"
          : "text-sidebarText hover:bg-surfaceHighlight hover:text-text"
      )}
      onClick={onClick}
    >
      <Icon size={20} className={cn(active ? "text-primary" : "group-hover:text-text")} />
      <span className="flex-1">{label}</span>
      {hasSubmenu && (
        isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />
      )}
    </div>
  );

  if (to && !hasSubmenu) {
    return <NavLink to={to}>{content}</NavLink>;
  }

  return content;
};

const Sidebar = ({ isOpen }: { isOpen: boolean }) => {
  const location = useLocation();
  const { user } = useAuth();
  const isPartner = user?.user_type === 'PARTNER';

  return (
    <div className={cn(
      "h-screen bg-sidebar flex flex-col border-r border-surfaceHighlight sticky top-0 left-0 transition-all duration-300 overflow-hidden whitespace-nowrap",
      isOpen ? "w-64" : "w-0 border-r-0"
    )}>
      {/* Branding Area */}
      <div className="h-16 flex items-center justify-center border-b border-surfaceHighlight bg-sidebar">
        {/* Replace this with your actual image file logic */}
        <img
          src="/svp_logo.png"
          alt="SVP INDIA"
          className="h-12 w-3/4 object-contain dark:bg-white/90 dark:rounded-lg dark:px-2 dark:py-1"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            e.currentTarget.nextElementSibling?.classList.remove('hidden');
          }}
        />
        {/* Fallback if image missing */}
        <div className="hidden flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-gradient-to-tr from-primary to-blue-400 flex items-center justify-center">
            <span className="text-white font-bold">C</span>
          </div>
          <div>
            <h1 className="text-white font-bold text-lg tracking-wide">SVP INDIA</h1>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        <SidebarItem
          icon={Home}
          label={isPartner ? 'My Appointments' : 'Home'}
          to={isPartner ? '/my-appointments' : '/'}
          active={isPartner ? location.pathname.startsWith('/my-appointments') : location.pathname === '/'}
        />

        {isPartner && (
          <>
            <SidebarItem
              icon={Calendar}
              label="Calendar"
              to="/calendar"
              active={location.pathname === '/calendar'}
            />

            <SidebarItem
              icon={BarChart3}
              label="Analytics"
              to="/analytics"
              active={location.pathname.startsWith('/analytics')}
            />
          </>
        )}

        <div className="pt-4 pb-2 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          {isPartner ? 'Explore' : 'Management'}
        </div>

        <SidebarItem
          icon={Users}
          label="Partners"
          to="/partners"
          active={location.pathname.startsWith('/partners')}
        />
        <SidebarItem
          icon={Target}
          label="Investees"
          to="/investees"
          active={location.pathname.startsWith('/investees')}
        />
        <SidebarItem
          icon={Layers}
          label="Groups"
          to="/groups"
          active={location.pathname.startsWith('/groups')}
        />

        {!isPartner && (
          <>
            <div className="pt-4 pb-2 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Planning
            </div>

            <SidebarItem
              icon={CalendarCheck}
              label="Appointments"
              to="/appointments"
              active={location.pathname.startsWith('/appointments')}
            />
            <SidebarItem
              icon={Repeat}
              label="Recurring"
              to="/recurring-appointments"
              active={location.pathname.startsWith('/recurring-appointments')}
            />
          </>
        )}

        {!isPartner && (
          <>
            <SidebarItem
              icon={Calendar}
              label="Calendar"
              to="/calendar"
              active={location.pathname === '/calendar'}
            />

            <SidebarItem
              icon={BarChart3}
              label="Analytics"
              to="/analytics"
              active={location.pathname.startsWith('/analytics')}
            />
          </>
        )}
      </nav>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-surfaceHighlight space-y-1">
        <SidebarItem icon={MessageSquare} label="Feedback" to="/feedback" />
        <SidebarItem icon={Settings} label="Settings" to="/settings" />
      </div>
    </div>
  );
};

const Header = ({ toggleSidebar }: { toggleSidebar: () => void }) => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showProfile, setShowProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const profileRef = React.useRef<HTMLDivElement>(null);
  const notificationsRef = React.useRef<HTMLDivElement>(null);

  const isPartner = user?.user_type === 'PARTNER';
  const [dismissedNotifications, setDismissedNotifications] = useState<string[]>([]);

  // Password management states
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showOtpResetModal, setShowOtpResetModal] = useState(false);
  const [oldPasswordInput, setOldPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpNewPassword, setOtpNewPassword] = useState('');
  const [otpConfirmPassword, setOtpConfirmPassword] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);

  React.useEffect(() => {
    const key = `notification-dismissed:${user?.user_id || 'anonymous'}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setDismissedNotifications(Array.isArray(parsed) ? parsed : []);
      } catch {
        setDismissedNotifications([]);
      }
    } else {
      setDismissedNotifications([]);
    }
  }, [user?.user_id]);

  const notificationKey = (appointment: AppointmentNotification) => {
    const message = appointment.notification_message || '';
    return `${appointment.appointment_id}:${appointment.focus_partner_id || ''}:${message}`;
  };

  const dismissNotification = (appointment: AppointmentNotification) => {
    const key = notificationKey(appointment);
    const next = Array.from(new Set([...dismissedNotifications, key]));
    setDismissedNotifications(next);
    localStorage.setItem(`notification-dismissed:${user?.user_id || 'anonymous'}`, JSON.stringify(next));
  };

  const { data: notificationAppointments = [] } = useQuery<AppointmentNotification[]>({
    queryKey: ['header-notification-appointments', user?.user_id || 'anonymous'],
    queryFn: () => appointmentService.getNotifications(),
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
    enabled: Boolean(user),
  });

  const visibleNotifications = notificationAppointments.filter(
    (appointment) => !dismissedNotifications.includes(notificationKey(appointment))
  );

  const handleOpenAppointment = (appointment: AppointmentNotification) => {
    setShowNotifications(false);
    const params = new URLSearchParams();
    if (appointment.focus_partner_id) params.set('focus_partner', appointment.focus_partner_id);
    const query = params.toString();
    const path = isPartner
      ? `/my-appointments/appointment/${appointment.appointment_id}`
      : `/appointments/${appointment.appointment_id}`;
    navigate(`${path}${query ? `?${query}` : ''}`);
  };

  // Close dropdowns on outside click
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfile(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    if (showProfile || showNotifications) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showProfile, showNotifications]);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPasswordInput !== confirmPasswordInput) {
      alert('New passwords do not match');
      return;
    }
    if (oldPasswordInput === newPasswordInput) {
      alert('New password cannot be the same as your old password');
      return;
    }
    setPasswordLoading(true);
    try {
      await api.post('/settings/change-password', { old_password: oldPasswordInput, new_password: newPasswordInput });
      alert('Password changed successfully');
      setShowChangePasswordModal(false);
      setOldPasswordInput('');
      setNewPasswordInput('');
      setConfirmPasswordInput('');
    } catch (err: any) {
      alert(err.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleRequestOtp = async () => {
    const shouldSend = window.confirm('Send a password reset OTP to your registered email?');
    if (!shouldSend) return;

    setOtpLoading(true);
    try {
      await api.post('/settings/password-reset/request-otp', {});
      alert('OTP sent to your email!');
      setShowOtpResetModal(true);
      setOtp('');
      setOtpNewPassword('');
      setOtpConfirmPassword('');
    } catch (err: any) {
      alert(err.message || 'Failed to send OTP');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResetPasswordWithOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpNewPassword !== otpConfirmPassword) {
      alert('New passwords do not match');
      return;
    }
    setOtpLoading(true);
    try {
      await api.post('/settings/password-reset/confirm', { otp, new_password: otpNewPassword });
      alert('Password reset successfully. You can now use your new password.');
      setShowOtpResetModal(false);
      setOtp('');
      setOtpNewPassword('');
      setOtpConfirmPassword('');
    } catch (err: any) {
      alert(err.message || 'Failed to reset password');
    } finally {
      setOtpLoading(false);
    }
  };

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <header className="h-16 bg-background/50 backdrop-blur-md border-b border-surfaceHighlight flex items-center justify-between px-8 sticky top-0 z-10">
      <div className="flex items-center gap-4 w-1/3">
        <button
          onClick={toggleSidebar}
          className="p-2 -ml-2 text-textMuted hover:text-text hover:bg-surfaceHighlight rounded-md transition-colors"
        >
          <Menu size={20} />
        </button>
      </div>

      <div className="flex items-center gap-6">
        <button
          onClick={toggleTheme}
          className={cn(
            "relative w-12 h-6 rounded-full transition-colors duration-300 focus:outline-none flex items-center px-1 border",
            theme === 'dark'
              ? "bg-surfaceHighlight border-surfaceHighlight"
              : "bg-surfaceHighlight border-primary/20"
          )}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          <div
            className={cn(
              "absolute w-4 h-4 rounded-full shadow-sm flex items-center justify-center transition-all duration-300 ease-spring",
              theme === 'dark'
                ? "translate-x-6 bg-primary text-white"
                : "translate-x-0 bg-primary text-white"
            )}
          >
            {theme === 'dark' ? <Moon size={10} strokeWidth={2.5} /> : <Sun size={10} strokeWidth={2.5} />}
          </div>
        </button>

        <div className="relative" ref={notificationsRef}>
          <button
            onClick={() => setShowNotifications((value) => !value)}
            className="relative text-textMuted hover:text-text transition-colors"
            title={isPartner ? 'Today attendance updates' : 'Partner updates'}
          >
            <Bell size={20} />
            {visibleNotifications.length > 0 && (
              <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-danger text-white text-[10px] rounded-full flex items-center justify-center">
                {visibleNotifications.length > 9 ? '9+' : visibleNotifications.length}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-10 w-80 bg-surface border border-surfaceHighlight rounded-lg shadow-xl z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-surfaceHighlight">
                <p className="text-sm font-semibold text-text">{isPartner ? 'Today meetings' : 'Partner updates'}</p>
                <p className="text-xs text-textMuted">
                  {isPartner ? 'Meetings you need to attend today and attendance updates' : 'Latest partner attendance intentions'}
                </p>
              </div>
              <div className="max-h-72 overflow-y-auto">
                {visibleNotifications.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-textMuted">{isPartner ? 'No meeting notifications for today.' : 'No partner updates yet.'}</p>
                ) : (
                  visibleNotifications.slice(0, 8).map((appointment) => (
                    <div key={appointment.appointment_id} className="px-4 py-3 border-b border-surfaceHighlight/60 last:border-0">
                      <div className="flex items-start justify-between gap-3">
                        <button
                          onClick={() => handleOpenAppointment(appointment)}
                          className="text-left flex-1 min-w-0"
                        >
                          <p className="text-sm font-medium text-text truncate">{appointment.appointment_name || 'Appointment'}</p>
                          <p className="text-xs text-textMuted mt-1">{formatDate(appointment.occurrence_date)}</p>
                          <p className="text-xs mt-1 text-textMuted">{appointment.notification_message || `Status: ${(appointment.status || 'PENDING').toUpperCase()}`}</p>
                        </button>
                        <div className="flex flex-col items-end gap-1">
                          <button
                            type="button"
                            onClick={() => dismissNotification(appointment)}
                            className="text-[11px] text-primary hover:text-primaryHover"
                          >
                            Complete
                          </button>
                          <button
                            type="button"
                            onClick={() => dismissNotification(appointment)}
                            className="text-[11px] text-textMuted hover:text-text"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="relative flex items-center gap-3 pl-6 border-l border-surfaceHighlight" ref={profileRef}>
          <div className="text-right hidden md:block">
            <p className="text-sm font-medium text-text">{user?.partner_name || user?.name || 'User'}</p>
            <p className="text-xs text-textMuted">{user?.user_type || ''}</p>
          </div>
          <button
            onClick={() => setShowProfile(!showProfile)}
            className="w-10 h-10 rounded-full bg-surfaceHighlight border border-surface flex items-center justify-center text-primary font-bold hover:ring-2 hover:ring-primary/50 transition-all cursor-pointer"
          >
            {initials}
          </button>

          {showProfile && (
            <div className="absolute right-0 top-14 w-64 bg-surface border border-surfaceHighlight rounded-lg shadow-xl z-50 overflow-hidden">
              <div className="p-4 border-b border-surfaceHighlight">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white font-bold text-lg shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text truncate">{user?.name || 'User'}</p>
                    <p className="text-xs text-textMuted truncate">{user?.email || ''}</p>
                  </div>
                </div>
              </div>
              <div className="p-3 space-y-1">
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-xs text-textMuted">Role</span>
                  <span className="text-xs font-medium text-text">{user?.user_type || '—'}</span>
                </div>
                {user?.partner_name && (
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-xs text-textMuted">Partner</span>
                    <span className="text-xs font-medium text-text truncate max-w-[10rem]">{user.partner_name}</span>
                  </div>
                )}
              </div>
              <div className="border-t border-surfaceHighlight p-2 space-y-1">
                <button
                  onClick={() => { setShowProfile(false); setShowChangePasswordModal(true); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text hover:bg-surfaceHighlight rounded-md transition-colors"
                >
                  <KeyRound size={16} />
                  Change Password
                </button>
                <button
                  onClick={() => { setShowProfile(false); handleRequestOtp(); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text hover:bg-surfaceHighlight rounded-md transition-colors"
                >
                  <KeyRound size={16} />
                  Forgot Password?
                </button>
                <button
                  onClick={() => { setShowProfile(false); handleLogout(); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-red-500/10 rounded-md transition-colors"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Change Password Modal */}
      <Modal isOpen={showChangePasswordModal} onClose={() => setShowChangePasswordModal(false)} title="Change Password">
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <Input label="Old Password" type="password" value={oldPasswordInput} onChange={e => setOldPasswordInput(e.target.value)} required />
          <Input label="New Password" type="password" value={newPasswordInput} onChange={e => setNewPasswordInput(e.target.value)} required />
          <Input label="Confirm New Password" type="password" value={confirmPasswordInput} onChange={e => setConfirmPasswordInput(e.target.value)} required />
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowChangePasswordModal(false)}>Cancel</Button>
            <Button type="submit" disabled={passwordLoading}>
              {passwordLoading ? 'Updating...' : 'Update Password'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Reset Password with OTP Modal */}
      <Modal isOpen={showOtpResetModal} onClose={() => setShowOtpResetModal(false)} title="Reset Password via OTP">
        <form onSubmit={handleResetPasswordWithOtp} className="space-y-4">
          <p className="text-sm text-textMuted">Please check your email for the 6-digit OTP.</p>
          <Input label="OTP" value={otp} onChange={e => setOtp(e.target.value)} required />
          <Input label="New Password" type="password" value={otpNewPassword} onChange={e => setOtpNewPassword(e.target.value)} required />
          <Input label="Confirm New Password" type="password" value={otpConfirmPassword} onChange={e => setOtpConfirmPassword(e.target.value)} required />
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowOtpResetModal(false)}>Cancel</Button>
            <Button type="submit" disabled={otpLoading}>
              {otpLoading ? 'Resetting...' : 'Reset Password'}
            </Button>
          </div>
        </form>
      </Modal>
    </header>
  );
};

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen bg-background text-text overflow-hidden">
      <Sidebar isOpen={sidebarOpen} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 p-8 overflow-y-auto min-h-0">
          {children}
        </main>
      </div>
    </div>
  );
};
