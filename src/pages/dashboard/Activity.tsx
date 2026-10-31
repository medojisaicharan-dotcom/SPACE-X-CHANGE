import { useMemo, useState } from 'react';
import { Activity as ActivityIcon, CalendarClock, ClipboardList, Search, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useLiveQuery } from '@/hooks/useLiveQuery';
import { listAuditForUser } from '@/services/auditService';
import { formatDateTime } from '@/utils/format';

export function Activity() {
  const { profile } = useAuth();
  const [search, setSearch] = useState('');
  const logs = useLiveQuery(() => (profile ? listAuditForUser(profile.id) : []), [profile?.id]);

  const filtered = useMemo(() => {
    if (!search.trim()) return logs;
    const q = search.toLowerCase();
    return logs.filter((log) =>
      [log.action, log.details, log.resourceName].join(' ').toLowerCase().includes(q),
    );
  }, [logs, search]);

  if (!profile) return null;

  return (
    <div>
      <PageHeader
        title="My activity"
        description="A permanent record of your account actions, bookings and eligibility changes."
        actions={
          <Badge tone="slate">
            <ActivityIcon className="h-3 w-3" /> {logs.length} event(s)
          </Badge>
        }
      />

      <div className="mb-4 max-w-sm">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search activity"
            className="pl-9"
            aria-label="Search activity"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={ClipboardList}
            title="No activity recorded"
            description="Actions such as booking, checking in or uploading evidence will appear here."
          />
        </Card>
      ) : (
        <Card className="p-5">
          <ol className="relative space-y-5 border-l border-slate-200 pl-6">
            {filtered.map((log) => (
              <li key={log.id} className="relative">
                <span className="absolute -left-[31px] flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-navy-600" />
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-ink">{log.action}</p>
                  {log.resourceName ? <Badge tone="navy">{log.resourceName}</Badge> : null}
                  <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-slate-400">
                    <CalendarClock className="h-3 w-3" /> {formatDateTime(log.createdAt)}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">{log.details}</p>
              </li>
            ))}
          </ol>
        </Card>
      )}

      <div className="mt-5 flex items-start gap-3 rounded-2xl border border-navy-100 bg-navy-50 p-4 text-xs leading-relaxed text-navy-800">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Audit entries are append-only in production. This demo stores them alongside the local database;
          resetting demo data clears them.
        </p>
      </div>
    </div>
  );
}
