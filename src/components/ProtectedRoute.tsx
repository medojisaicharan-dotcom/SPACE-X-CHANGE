import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { roleHome } from '@/utils/roles';
import type { Role } from '@/types';

export function ProtectedRoute({ allowedRoles }: { allowedRoles?: Role[] }) {
  const { profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="h-7 w-7 animate-spin text-navy-600" />
          <p className="text-sm font-medium">Preparing your session…</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return <Navigate to={roleHome(profile.role)} replace />;
  }

  return <Outlet />;
}
