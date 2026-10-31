import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Menu, X } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { NotificationBell } from '@/components/NotificationBell';
import { useAuth } from '@/contexts/AuthContext';
import { buttonStyles } from '@/components/ui/Button';
import { roleHome } from '@/utils/roles';
import { cn } from '@/utils/format';

const LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/explore', label: 'Explore Resources' },
  { to: '/how-it-works', label: 'How It Works' },
  { to: '/about', label: 'About Us' },
];

export function Navbar() {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="hidden items-center gap-1 lg:flex">
            {LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  cn(
                    'rounded-lg px-3 py-2 text-sm font-medium transition',
                    isActive
                      ? 'bg-navy-50 text-navy-800'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-ink',
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="hidden items-center gap-2 sm:flex">
          {profile ? (
            <>
              <NotificationBell />
              <Link to={roleHome(profile.role)} className={buttonStyles('primary', 'md')}>
                <LayoutDashboard className="h-4 w-4" /> Dashboard
              </Link>
            </>
          ) : (
            <>
              <Link to="/login" className={buttonStyles('ghost', 'md')}>
                Login
              </Link>
              <Link to="/signup" className={buttonStyles('primary', 'md')}>
                Sign Up
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 lg:hidden"
          aria-label="Toggle navigation menu"
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-slate-100 bg-white px-4 pb-5 pt-3 lg:hidden">
          <nav className="flex flex-col gap-1">
            {LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  cn(
                    'rounded-xl px-3 py-2.5 text-sm font-medium',
                    isActive ? 'bg-navy-50 text-navy-800' : 'text-slate-600 hover:bg-slate-50',
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3">
            {profile ? (
              <>
                <Link to="/notifications" className={buttonStyles('outline', 'md')}>
                  Notifications
                </Link>
                <Link to={roleHome(profile.role)} className={buttonStyles('primary', 'md')}>
                  <LayoutDashboard className="h-4 w-4" /> Dashboard
                </Link>
              </>
            ) : (
              <>
                <Link to="/login" className={buttonStyles('outline', 'md')}>
                  Login
                </Link>
                <Link to="/signup" className={buttonStyles('primary', 'md')}>
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}
