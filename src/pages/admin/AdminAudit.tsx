import { useMemo, useState } from 'react';
import { Download, ScrollText, Search } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { Select } from '@/components/ui/Select';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useLiveQuery } from '@/hooks/useLiveQuery';
import { listUsers } from '@/services/adminService';
import { listAuditLogs } from '@/services/auditService';
import { formatDateTime, timeAgo } from '@/utils/format';

const LIMITS = [50, 100, 250, 500];

export function AdminAudit() {
  const { profile } = useAuth();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [actorId, setActorId] = useState('all');
  const [limit, setLimit] = useState(100);

  const data = useLiveQuery(() => ({
    users: listUsers(),
    logs: listAuditLogs({ limit }),
  }), [profile?.id, limit]);

  const filtered = useMemo(() => {
    return data.logs.filter((log) => {
      if (actorId !== 'all' && log.actorId !== actorId) return false;
      if (search.trim()) {
        return [log.action, log.details, log.actorName, log.resourceName]
          .join(' ')
          .toLowerCase()
          .includes(search.toLowerCase());
      }
      return true;
    });
  }, [data.logs, actorId, search]);

  if (!profile) return null;

  const actors = data.users.filter((user) => data.logs.some((log) => log.actorId === user.id));

  function exportCsv() {
    const header = ['Timestamp', 'Action', 'Actor', 'Resource', 'Details', 'Booking ID'];
    const rows = filtered.map((log) => [
      log.createdAt,
      log.action,
      log.actorName,
      log.resourceName,
      log.details,
      log.bookingId ?? '',
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `spacexchange-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success('Audit exported', `${filtered.length} record(s) downloaded as CSV.`);
  }

  return (
    <div>
      <PageHeader
        title="Audit history"
        description="An append-only record of consequential actions. Use it to reconstruct decisions and disputes."
        actions={
          <Button variant="outline" onClick={exportCsv} disabled={filtered.length === 0} icon={<Download className="h-4 w-4" />}>
            Export CSV
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search actions, actors or details" className="pl-9" aria-label="Search audit log" />
        </div>
        <Select value={actorId} onChange={(event) => setActorId(event.target.value)} className="max-w-[220px]" aria-label="Filter by actor">
          <option value="all">All actors</option>
          {actors.map((actor) => (
            <option key={actor.id} value={actor.id}>{actor.fullName}</option>
          ))}
        </Select>
        <Select value={String(limit)} onChange={(event) => setLimit(Number(event.target.value))} className="max-w-[150px]" aria-label="Record limit">
          {LIMITS.map((value) => (
            <option key={value} value={value}>Latest {value}</option>
          ))}
        </Select>
        <Badge tone="slate">{filtered.length} record(s)</Badge>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={ScrollText}
            title="No audit records match"
            description="Consequential actions such as approvals, verification and incident reviews appear here."
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Action</th>
                  <th>Actor</th>
                  <th>Resource / booking</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log) => (
                  <tr key={log.id}>
                    <td className="whitespace-nowrap text-xs">
                      <p className="font-medium text-slate-700">{timeAgo(log.createdAt)}</p>
                      <p className="text-[10px] text-slate-400">{formatDateTime(log.createdAt)}</p>
                    </td>
                    <td><Badge tone="navy">{log.action}</Badge></td>
                    <td className="text-xs font-medium text-slate-700">{log.actorName}</td>
                    <td className="text-xs text-slate-600">
                      {log.resourceName || '—'}
                      {log.bookingId ? <span className="block text-[10px] text-slate-400">#{log.bookingId.slice(-8)}</span> : null}
                    </td>
                    <td className="max-w-[380px] text-xs leading-relaxed text-slate-600">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-100 px-4 py-2.5 text-[11px] text-slate-400">
            Showing the latest {limit} audit events. Records cannot be edited or deleted from the application.
          </div>
        </Card>
      )}
    </div>
  );
}
