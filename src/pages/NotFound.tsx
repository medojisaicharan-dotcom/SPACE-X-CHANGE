import { Link } from 'react-router-dom';
import { Compass, Home, LifeBuoy } from 'lucide-react';
import { buttonStyles } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { roleHome } from '@/utils/roles';

export function NotFound() {
  const { profile } = useAuth();

  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-slate-50 px-4 py-16">
      <div className="w-full max-w-lg text-center">
        <p className="text-6xl font-bold tracking-tight text-navy-200">404</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">This page does not exist</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
          The link may be outdated or the resource may have been removed. Try exploring the catalogue
          or return to your workspace.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to={profile ? roleHome(profile.role) : '/'} className={buttonStyles('primary', 'md')}>
            <Home className="h-4 w-4" /> {profile ? 'Go to dashboard' : 'Back home'}
          </Link>
          <Link to="/explore" className={buttonStyles('outline', 'md')}>
            <Compass className="h-4 w-4" /> Explore resources
          </Link>
          <Link to="/how-it-works" className={buttonStyles('ghost', 'md')}>
            <LifeBuoy className="h-4 w-4" /> How it works
          </Link>
        </div>
      </div>
    </div>
  );
}
