import { useSyncExternalStore } from 'react';
import { getDbVersion, subscribeToDb } from '@/lib/demoDb';

export function useDbVersion(): number {
  return useSyncExternalStore(subscribeToDb, getDbVersion, getDbVersion);
}
