import { useEffect } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { subscribeToDbErrors } from '@/lib/db';

/**
 * Surfaces background persistence failures (for example a Supabase write blocked
 * by row level security) as toasts. The driver already reloads the cache from
 * the server, so the toast just explains why a change disappeared.
 */
export function DbSyncWatcher() {
  const toast = useToast();

  useEffect(() => {
    return subscribeToDbErrors((message) => {
      toast.error('Could not save to Supabase', message);
    });
  }, [toast]);

  return null;
}
