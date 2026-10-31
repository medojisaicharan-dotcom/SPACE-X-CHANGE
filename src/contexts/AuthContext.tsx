import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { getCurrentProfile } from '@/services/authService';
import { sweepOverdueBookings } from '@/services/bookingService';
import { subscribeToDb } from '@/lib/demoDb';
import type { Profile } from '@/types';

interface AuthContextValue {
  profile: Profile | null;
  loading: boolean;
  refresh: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    const current = getCurrentProfile();
    setProfile(current ? { ...current } : null);
  }, []);

  useEffect(() => {
    sweepOverdueBookings();
    refresh();
    setLoading(false);
    const unsubscribe = subscribeToDb(() => {
      const current = getCurrentProfile();
      setProfile(current ? { ...current } : null);
    });
    return unsubscribe;
  }, [refresh]);

  const value = useMemo<AuthContextValue>(
    () => ({ profile, loading, refresh, isAuthenticated: Boolean(profile) }),
    [profile, loading, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
