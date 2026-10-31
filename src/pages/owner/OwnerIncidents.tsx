import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, FileWarning, Plus, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { buttonStyles } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Select } from '@/components/ui/Select';
import { IncidentStatusBadge } from '@/components/ui/StatusBadge';
import { useAuth } from '@/contexts/AuthContext';
import { useLiveQuery } from '@/hooks/useLiveQuery';
import { listIncidentsForOwner, incidentCounts, getIncidentContext } from '@/services/incidentService';
import { CATEGORY_IMAGES, INCIDENT_CATEGORY_LABELS, type Incident } from '@/types';
import { formatDateTime, timeAgo } from '@/utils/format';

export function OwnerIncidents() {
  const { profile } = useAuth();
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('all');
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<Incident | null>(null);

  const incidents = useLiveQuery(
    () => (profile ? listIncidentsForOwner(profile.id) : []),
    [profile?.id],
  );

  const counts = useMemo(() => incidentCounts(incidents), [incidents]);
  const filtered = useMemo(() => {
    return incidents.filter((incident) => {
      if (filter === 'open' && !['reported', 'under_review'].includes(incident.status)) return false;
      if (filter === 'resolved' && !['resolved', 'rejected'].includes(incident.status)) return false;
      if (search.trim()) {
        return [incident.resourceName, incident.description, incident.reporterName, incident.category]
          .join(' ')
          .toLowerCase()
          .includes(search.toLowerCase());
      }
      return true;
    });
  }, [incidents, filter, search]);

  if (!profile) return null;

  const detailContext = detail ? getIncidentContext(detail) : null;

  return (
    <div>
      <PageHeader
        title="Damage and incident reports"
        description="Incidents involving your resources. Institution managers review and record outcomes."
        actions={
          <Link to="/dashboard/incidents" className={buttonStyles('outline', 'md')}>
            <Plus className="h-4 w-4" /> Report an incident
          </Link>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs text-slate-500">Open reports</p>
          <p className="mt-1 text-2xl font-semibold text-ink">{(counts.reported ?? 0) + (counts.under_review ?? 0)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500">Resolved</p>
          <p className="mt-1 text-2xl font-semibold text-ink">{counts.resolved ?? 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500">Total reports</p>
          <p className="mt-1 text-2xl font-semibold text-ink">{incidents.length}</p>
        </Card>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
          {(['all', 'open', 'resolved'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setFilter(option)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${
                filter === option ? 'bg-navy-900 text-white' : 'text-slate-500 hover:text-navy-700'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search incidents"
          aria-label="Search incidents"
          className="max-w-xs"
        />
        <Badge tone="slate">{filtered.length} report(s)</Badge>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={ShieldCheck}
            title="No incidents for your resources"
            description="If a borrower reports damage, a missing item or a safety issue, it will appear here for tracking."
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((incident) => {
            const context = getIncidentContext(incident);
            return (
              <Card key={incident.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 gap-3">
                    <img
                      src={context.resource?.image || CATEGORY_IMAGES['Other Resources']}
                      alt={incident.resourceName}
                      className="h-12 w-12 rounded-xl border border-slate-200 object-cover"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">{incident.resourceName}</p>
                      <p className="text-xs text-slate-500">
                        {INCIDENT_CATEGORY_LABELS[incident.category]} · reported by {incident.reporterName} · {timeAgo(incident.createdAt)}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">{incident.summary}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <IncidentStatusBadge status={incident.status} />
                    <button
                      type="button"
                      onClick={() => setDetail(incident)}
                      className="text-xs font-semibold text-navy-700 hover:underline"
                    >
                      Details
                    </button>
                  </div>
                </div>
                {incident.managerNotes ? (
                  <div className="mt-3 rounded-lg bg-navy-50 px-3 py-2 text-[11px] text-navy-800">
                    <span className="font-semibold">Manager note:</span> {incident.managerNotes}
                  </div>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}

      <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900">
        <FileWarning className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Owners can view reports but cannot change outcomes. Institution managers and administrators review
          evidence, add notes and resolve cases. This separation keeps incident handling impartial.
        </p>
      </div>

      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={detail?.resourceName ?? 'Incident details'}
        description={detail ? `${INCIDENT_CATEGORY_LABELS[detail.category]} · ${formatDateTime(detail.createdAt)}` : undefined}
        size="lg"
      >
        {detail ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <IncidentStatusBadge status={detail.status} />
              <Badge tone="slate">Reporter: {detail.reporterName}</Badge>
              {detailContext?.booking ? (
                <Badge tone="navy">Booking {detailContext.booking.id.slice(-6)}</Badge>
              ) : null}
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Summary</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{detail.summary}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Description</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{detail.description}</p>
            </div>
            {detail.images.length > 0 ? (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Photos</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {detail.images.map((image, index) => (
                    <img key={index} src={image} alt={`Incident ${index + 1}`} className="h-24 w-24 rounded-xl border border-slate-200 object-cover" />
                  ))}
                </div>
              </div>
            ) : null}
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Manager review</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                {detail.managerNotes || 'No review notes yet. A manager will review and update this report.'}
              </p>
            </div>
            <div className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-[11px] text-slate-500">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Need to add information? Report a new incident linked to the same booking, or contact your
              institution manager directly.
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
