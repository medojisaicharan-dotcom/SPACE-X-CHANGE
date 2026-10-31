import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowLeftRight,
  BarChart3,
  Bell,
  Boxes,
  Building2,
  CalendarDays,
  ClipboardList,
  Compass,
  FileWarning,
  LayoutDashboard,
  LogOut,
  Menu,
  ScrollText,
  Settings,
  ShieldCheck,
  UserCircle,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { NotificationBell } from '@/components/NotificationBell';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useLiveQuery } from '@/hooks/useLiveQuery';
import { unreadNotificationCount } from '@/services/notificationService';
import { signOut } from '@/services/authService';
import { ROLE_LABELS } from '@/types';
import { cn } from '@/utils/format';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  section: string;
  badge?: number;
}

function buildNav(role: string | undefined, unread: number): NavItem[] {
  const shared: NavItem[] = [
    { to: '/explore', label: 'Explore Resources', icon: Compass, section: 'Discover' },
    { to: '/notifications', label: 'Notifications', icon: Bell, section: 'Account', badge: unread },
    { to: '/account', label: 'Account Settings', icon: UserCircle, section: 'Account' },
  ];

  if (role === 'administrator' || role === 'institution_manager') {
    return [
      { to: '/admin', label: 'Overview', icon: LayoutDashboard, section: 'Administration' },
      { to: '/admin/users', label: 'Users & Eligibility', icon: Users, section: 'Administration' },
      { to: '/admin/institutions', label: 'Institutions', icon: Building2, section: 'Administration' },
      { to: '/admin/resources', label: 'Resource Listings', icon: Boxes, section: 'Administration' },
      { to: '/admin/bookings', label: 'All Bookings', icon: ClipboardList, section: 'Administration' },
      { to: '/admin/incidents', label: 'Incidents', icon: FileWarning, section: 'Administration' },
      { to: '/admin/eligibility', label: 'Eligibility Rules', icon: ShieldCheck, section: 'Administration' },
      { to: '/admin/settings', label: 'Platform Settings', icon: Settings, section: 'Administration' },
      { to: '/admin/audit', label: 'Audit History', icon: ScrollText, section: 'Administration' },
      { to: '/dashboard', label: 'Personal Dashboard', icon: CalendarDays, section: 'Personal' },
      ...shared,
    ];
  }

  if (role === 'resource_owner') {
    return [
      { to: '/owner', label: 'Overview', icon: LayoutDashboard, section: 'Owner Console' },
      { to: '/owner/resources', label: 'My Resources', icon: Boxes, section: 'Owner Console' },
      { to: '/owner/bookings', label: 'Booking Requests', icon: ClipboardList, section: 'Owner Console' },
      { to: '/owner/availability', label: 'Availability', icon: CalendarDays, section: 'Owner Console' },
      { to: '/owner/handover', label: 'Check-in / Check-out', icon: ArrowLeftRight, section: 'Owner Console' },
      { to: '/owner/incidents', label: 'Damage Reports', icon: FileWarning, section: 'Owner Console' },
      { to: '/owner/analytics', label: 'Analytics', icon: BarChart3, section: 'Owner Console' },
      { to: '/dashboard', label: 'Personal Dashboard', icon: UserCircle, section: 'Personal' },
      ...shared,
    ];
  }

  return [
    { to: '/dashboard', label: 'Overview', icon: LayoutDashboard, section: 'My Workspace' },
    { to: '/dashboard/bookings', label: 'My Bookings', icon: CalendarDays, section: 'My Workspace' },
    { to: '/dashboard/eligibility', label: 'Eligibility', icon: ShieldCheck, section: 'My Workspace' },
    { to: '/dashboard/incidents', label: 'Incidents', icon: AlertTriangle, section: 'My Workspace' },
    { to: '/dashboard/activity', label: 'My Activity', icon: Activity, section: 'My Workspace' },
    ...shared,
  ];
}

const SECTIONS = ['Admin', 'Owner', 'My', 'Discover', 'Account', 'Administration', 'Personal', 'Owner Console', 'My Workspace'];

export function DashboardLayout() {
  const { profile } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const unread = useLiveQuery(
    () => (profile ? unreadNotificationCount(profile.id) : 0),
    [profile?.id],
  );
  const nav = useMemo(() => buildNav(profile?.role, unread), [profile?.role, unread]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const current = useMemo(() => {
    const matches = nav
      .filter((item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`))
      .sort((a, b) => b.to.length - a.to.length);
    return matches[0];
  }, [nav, location.pathname]);

  function handleSignOut() {
    signOut();
    toast.info('Signed out', 'Your session has ended.');
    navigate('/login');
  }

  const sections = useMemo(() => {
    const map = new Map<string, NavItem[]>();
    nav.forEach((item) => {
      const list = map.get(item.section) ?? [];
      list.push(item);
      map.set(item.section, list);
    });
    return [...map.entries()].sort(
      (a, b) => SECTIONS.indexOf(a[0]) - SECTIONS.indexOf(b[0]),
    );
  }, [nav]);

  const sidebar = (
    <div className="flex h-full flex-col bg-white">
      <div className="flex h-16 items-center justify-between border-b border-slate-100 px-5">
        <Logo />
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 lg:hidden"
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="border-b border-slate-100 px-4 py-3.5">
        <Link
          to="/account"
          className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-slate-50"
        >
          <Avatar name={profile?.fullName ?? 'Guest'} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{profile?.fullName}</p>
            <p className="truncate text-[11px] text-slate-500">
              {profile ? ROLE_LABELS[profile.role] : ''}
            </p>
          </div>
        </Link>
        {profile && !profile.verified ? (
          <Badge tone="amber" className="mt-2">
            Verification pending
          </Badge>
        ) : null}
      </div>

      <nav className="scroll-thin flex-1 overflow-y-auto px-3 py-4">
        {sections.map(([section, items]) => (
          <div key={section} className="mb-5 last:mb-0">
            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              {section}
            </p>
            <div className="space-y-0.5">
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={`${section}-${item.to}`}
                    to={item.to}
                    end={item.to === '/dashboard' || item.to === '/owner' || item.to === '/admin'}
                    className={({ isActive }) =>
                      cn(
                        'group flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                        isActive
                          ? 'bg-navy-900 text-white shadow-sm'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-ink',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-white' : 'text-slate-400 group-hover:text-navy-600')} />
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.badge ? (
                          <span
                            className={cn(
                              'flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold',
                              isActive ? 'bg-white/20 text-white' : 'bg-rose-500 text-white',
                            )}
                          >
                            {item.badge > 9 ? '9+' : item.badge}
                          </span>
                        ) : null}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-100 p-3">
        <div className="mb-2 rounded-xl bg-amber-50 px-3 py-2 text-[10px] font-medium leading-relaxed text-amber-800">
          Local demo mode — data is stored in this browser, not Supabase.
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-rose-50 hover:text-rose-700"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-72 border-r border-slate-200 lg:block">
        {sidebar}
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-navy-950/50 backdrop-blur-[2px]"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] border-r border-slate-200 shadow-lift animate-fade-in">
            {sidebar}
          </aside>
        </div>
      ) : null}

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">{current?.label ?? 'Dashboard'}</p>
              <p className="hidden truncate text-xs text-slate-500 sm:block">
                {profile?.institutionName || 'SPACEXCHANGE workspace'}
              </p>
            </div>
            <Link
              to="/explore"
              className="hidden items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-navy-700 sm:flex"
            >
              <Compass className="h-4 w-4" /> Explore
            </Link>
            <NotificationBell />
            <Link
              to="/account"
              className="flex items-center gap-2 rounded-xl border border-slate-200 p-1 pr-2.5 transition hover:bg-slate-50"
            >
              <Avatar name={profile?.fullName ?? 'Guest'} size="sm" />
              <span className="hidden max-w-[9rem] truncate text-xs font-semibold text-slate-700 sm:block">
                {profile?.fullName?.split(' ')[0]}
              </span>
            </Link>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
