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
  LogOut
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

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
          label="Home" 
          to="/" 
          active={location.pathname === '/'} 
        />
        
        <div className="pt-4 pb-2 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Management
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
  const profileRef = React.useRef<HTMLDivElement>(null);

  // Close profile dropdown on outside click
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfile(false);
      }
    };
    if (showProfile) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showProfile]);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
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

        <button className="relative text-textMuted hover:text-text transition-colors">
          <Bell size={20} />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-danger rounded-full"></span>
        </button>
        
        <div className="relative flex items-center gap-3 pl-6 border-l border-surfaceHighlight" ref={profileRef}>
          <div className="text-right hidden md:block">
            <p className="text-sm font-medium text-text">{user?.name || 'User'}</p>
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
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-xs text-textMuted">Chapter</span>
                  <span className="text-xs font-medium text-text">SVP Hyderabad</span>
                </div>
              </div>
              <div className="border-t border-surfaceHighlight p-2">
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
