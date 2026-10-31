import { useMemo } from 'react';
import { useDbVersion } from '@/hooks/useDbVersion';

export function useLiveQuery<T>(query: () => T, deps: unknown[] = []): T {
  const version = useDbVersion();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(query, [version, ...deps]);
}
