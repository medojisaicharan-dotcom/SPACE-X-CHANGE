import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileWarning, Search, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { IncidentStatusBadge } from '@/components/ui/StatusBadge';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useLiveQuery } from '@/hooks/useLiveQuery';
import { listUsers } from '@/services/adminService';
import { getIncidentContext, listAllIncidents, updateIncident } from '@/services/incidentService';
import {
  CATEGORY_IMAGES,
  INCIDENT_CATEGORY_LABELS,
  INCIDENT_STATUS_LABELS,
  type Incident,
  type IncidentStatus,
} from '@/types';
import { cn, formatDateTime, timeAgo } from '@/utils/format';

const STATUSES = Object.entries(INCIDENT_STATUS_LABELS) as [IncidentStatus, string][];

export function AdminIncidents() {
  const { profile } = useAuth();
  const toast = useToast();
  const [filter, setFilter] = useState<'all' | 'open' | 'closed'>('open');
  const [search, setSearch] = useState('');
  const [reviewTarget, setReviewTarget] = useState<Incident | null>(null);
  const [status, setStatus] = useState<IncidentStatus>('under_review');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);

  const incidents = useLiveQuery(() => listAllIncidents(), [profile?.id]);

  const filtered = useMemo(() => {
    return incidents.filter((incident) => {
      if (filter === 'open' && !['reported', 'under_review'].includes(incident.status)) return false;
      if (filter === 'closed' && !['resolved', 'rejected'].includes(incident.status)) return false;
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

  const openCount = incidents.filter((incident) => ['reported', 'under_review'].includes(incident.status)).length;
  const resolvedCount = incidents.filter((incident) => incident.status === 'resolved').length;

  function openReview(incident: Incident) {
    setReviewTarget(incident);
    setStatus(incident.status === 'reported' ? 'under_review' : incident.status);
    setNotes(incident.managerNotes);
    setError('');
  }

  function handleReview() {
    if (!reviewTarget) return;
    setError('');
    if (status !== 'under_review' && notes.trim().length < 5) {
      setError('Add review notes before resolving or rejecting a case.');
      return;
    }
    setWorking(true);
    try {
      updateIncident(profile!.id, reviewTarget.id, status, notes);
      toast.success('Incident updated', 'The reporter and owner have been notified.');
      setReviewTarget(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not update this incident.');
    } finally {
      setWorking(false);
    }
  }

  const context = reviewTarget ? getIncidentContext(reviewTarget) : null;
  const ownerName = context?.resource
    ? listUsers().find((user) => user.id === context.resource?.ownerId)?.fullName ?? '—'
    : '—';

  return (
    <div>
      <PageHeader
        title="Incident review"
        description="Investigate reports, document findings and resolve cases fairly. No penalty is applied automatically."
        actions={<Badge tone={openCount ? 'amber' : 'green'}>{openCount} open</Badge>}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        {[
          { label: 'Total reports', value: incidents.length },
          { label: 'Awaiting review', value: openCount },
          { label: 'Resolved', value: resolvedCount },
          { label: 'Rejected', value: incidents.filter((incident) => incident.status === 'rejected').length },
        ].map((card) => (
          <Card key={card.label} className="p-3">
            <p className="text-[11px] text-slate-500">{card.label}</p>
            <p className="mt-0.5 text-xl font-semibold text-ink">{card.value}</p>
          </Card>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
          {(['all', 'open', 'closed'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setFilter(option)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition',
                filter === option ? 'bg-navy-900 text-white' : 'text-slate-500 hover:text-navy-700',
              )}
            >
              {option}
            </button>
          ))}
        </div>
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search reports" className="max-w-xs" aria-label="Search incidents" />
        <Badge tone="slate">{filtered.length} report(s)</Badge>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState icon={ShieldCheck} title="Nothing to review" description="New incident reports from members will appear here." />
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((incident) => {
            const incidentContext = getIncidentContext(incident);
            return (
              <Card key={incident.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 gap-3">
                    <img
                      src={incidentContext.resource?.image || CATEGORY_IMAGES['Other Resources']}
                      alt={incident.resourceName}
                      className="h-12 w-12 rounded-xl border border-slate-200 object-cover"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">{incident.resourceName}</p>
                      <p className="text-xs text-slate-500">
                        {INCIDENT_CATEGORY_LABELS[incident.category]} · {incident.reporterName} · {timeAgo(incident.createdAt)}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-500">{incident.summary}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <IncidentStatusBadge status={incident.status} />
                    <Button size="sm" variant="outline" onClick={() => openReview(incident)}>
                      Review
                    </Button>
                  </div>
                </div>
                {incident.managerNotes ? (
                  <p className="mt-3 rounded-lg bg-navy-50 px-3 py-2 text-[11px] text-navy-800">
                    <span className="font-semibold">Review notes:</span> {incident.managerNotes}
                  </p>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}

      <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Review the booking timeline and handover photos before deciding. Outcomes are advisory records for the
          institution; resolving an incident does not automatically charge or penalise a member.
        </p>
      </div>

      <Modal
        open={Boolean(reviewTarget)}
        onClose={() => setReviewTarget(null)}
        title="Review incident"
        description={reviewTarget ? `${reviewTarget.resourceName} · reported ${formatDateTime(reviewTarget.createdAt)}` : undefined}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setReviewTarget(null)} disabled={working}>Cancel</Button>
            <Button onClick={handleReview} loading={working} icon={<CheckCircle2 className="h-4 w-4" />}>Save review</Button>
          </>
        }
      >
        {reviewTarget ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <IncidentStatusBadge status={reviewTarget.status} />
              <Badge tone="slate">{INCIDENT_CATEGORY_LABELS[reviewTarget.category]}</Badge>
              <Badge tone="slate">Reporter: {reviewTarget.reporterName}</Badge>
            </div>

            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Summary</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{reviewTarget.summary}</p>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Full description</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{reviewTarget.description}</p>
            </div>

            {reviewTarget.images.length > 0 ? (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Evidence photos</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {reviewTarget.images.map((image, index) => (
                    <img key={index} src={image} alt={`Evidence ${index + 1}`} className="h-24 w-24 rounded-xl border border-slate-200 object-cover" />
                  ))}
                </div>
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-3 text-xs">
                <p className="text-slate-400">Owner</p>
                <p className="mt-0.5 font-medium text-slate-700">{ownerName}</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-3 text-xs">
                <p className="text-slate-400">Related booking</p>
                <p className="mt-0.5 font-medium text-slate-700">
                  {context?.booking ? `${context.booking.startDate} · ${context.booking.startTime}–${context.booking.endTime}` : 'Not linked'}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-[220px_1fr]">
              <Select label="Decision status" value={status} onChange={(event) => setStatus(event.target.value as IncidentStatus)} requiredMark>
                {STATUSES.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
              <Textarea
                label="Review notes"
                rows={4}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="What did you verify? Who was contacted? What is the agreed outcome?"
                hint="Required when resolving or rejecting."
              />
            </div>
            {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs font-medium text-rose-700">{error}</p> : null}
            <p className="rounded-xl bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-500">
              <FileWarning className="mr-1 inline h-3 w-3" /> The reporter and resource owner see your notes. Keep the
              language factual and avoid accusations you cannot substantiate.
            </p>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
