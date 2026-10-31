import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Plus, ShieldCheck, Sparkles } from 'lucide-react';
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
import { ImageUploader } from '@/components/ImageUploader';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useLiveQuery } from '@/hooks/useLiveQuery';
import { listAllResources } from '@/services/resourceService';
import { listBookingsForUser, getBookingView } from '@/services/bookingService';
import { listIncidentsForUser, reportIncident, getIncidentContext } from '@/services/incidentService';
import {
  CATEGORY_IMAGES,
  INCIDENT_CATEGORY_LABELS,
  type Incident,
  type IncidentCategory,
} from '@/types';
import { cn, formatDateTime, timeAgo } from '@/utils/format';
import { toLocalInputDateTime } from '@/utils/date';

const CATEGORY_OPTIONS = Object.entries(INCIDENT_CATEGORY_LABELS) as [IncidentCategory, string][];

export function Incidents() {
  const { profile } = useAuth();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<Incident | null>(null);
  const [filter, setFilter] = useState<'all' | 'open' | 'closed'>('all');
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [resourceId, setResourceId] = useState('');
  const [bookingId, setBookingId] = useState('');
  const [category, setCategory] = useState<IncidentCategory>('damaged_equipment');
  const [description, setDescription] = useState('');
  const [occurredAt, setOccurredAt] = useState(toLocalInputDateTime(new Date()));
  const [images, setImages] = useState<string[]>([]);
  const [formError, setFormError] = useState('');

  const data = useLiveQuery(() => {
    if (!profile) return null;
    const resources = listAllResources().filter((r) => r.active);
    const bookings = listBookingsForUser(profile.id);
    return {
      resources,
      bookings,
      incidents: listIncidentsForUser(profile.id),
    };
  }, [profile?.id]);

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.incidents.filter((incident) => {
      if (filter === 'open' && !['reported', 'under_review'].includes(incident.status)) return false;
      if (filter === 'closed' && !['resolved', 'rejected'].includes(incident.status)) return false;
      if (search.trim()) {
        return [incident.resourceName, incident.description, incident.category]
          .join(' ')
          .toLowerCase()
          .includes(search.toLowerCase());
      }
      return true;
    });
  }, [data, filter, search]);

  if (!profile || !data) return null;

  const userId = profile.id;

  const relevantBookings = data.bookings.filter(
    (view) => !resourceId || view.booking.resourceId === resourceId,
  );

  function resetForm() {
    setResourceId('');
    setBookingId('');
    setCategory('damaged_equipment');
    setDescription('');
    setOccurredAt(toLocalInputDateTime(new Date()));
    setImages([]);
    setFormError('');
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError('');
    if (!resourceId) {
      setFormError('Select the resource involved in the incident.');
      return;
    }
    if (description.trim().length < 30) {
      setFormError('Describe what happened in at least 30 characters.');
      return;
    }
    setSubmitting(true);
    try {
      reportIncident(userId, {
        resourceId,
        bookingId,
        category,
        description,
        images,
        occurredAt: new Date(occurredAt).toISOString(),
      });
      toast.success('Incident reported', 'A manager will review your report. No penalty is applied automatically.');
      setOpen(false);
      resetForm();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not submit the report.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Incidents"
        description="Report damage, missing items, safety concerns or scheduling conflicts. Every report is reviewed by a human."
        actions={
          <Button onClick={() => setOpen(true)} icon={<Plus className="h-4 w-4" />}>
            Report incident
          </Button>
        }
      />

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
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search reports"
          aria-label="Search incidents"
          className="max-w-xs"
        />
        <Badge tone="slate">{filtered.length} report(s)</Badge>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={ShieldCheck}
            title="No incident reports"
            description="If something goes wrong during a session, report it here with photos and details. Managers will follow up."
            action={<Button onClick={() => setOpen(true)}>Report an incident</Button>}
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
                      src={context.resource?.image || CATEGORY_IMAGES[context.resource?.category ?? 'Other Resources']}
                      alt={incident.resourceName}
                      className="h-12 w-12 rounded-xl border border-slate-200 object-cover"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">{incident.resourceName}</p>
                      <p className="text-xs text-slate-500">
                        {INCIDENT_CATEGORY_LABELS[incident.category]} · {timeAgo(incident.createdAt)}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">{incident.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <IncidentStatusBadge status={incident.status} />
                    <Button variant="outline" size="sm" onClick={() => setDetail(incident)}>
                      Details
                    </Button>
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
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Incident reports are not disciplinary actions. They create a review record so all parties can
          resolve the issue fairly. False or retaliatory reports may be reviewed by an administrator.
        </p>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Report an incident"
        description="Provide as much detail as possible. Photos help reviewers resolve the case."
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={submitting} icon={<AlertTriangle className="h-4 w-4" />}>
              Submit report
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select label="Resource involved" value={resourceId} onChange={(e) => { setResourceId(e.target.value); setBookingId(''); }} requiredMark>
            <option value="">Select a resource</option>
            {data.resources.map((resource) => (
              <option key={resource.id} value={resource.id}>
                {resource.name}
              </option>
            ))}
          </Select>

          <div className="grid gap-3 sm:grid-cols-2">
            <Select label="Related booking (optional)" value={bookingId} onChange={(e) => setBookingId(e.target.value)}>
              <option value="">No specific booking</option>
              {relevantBookings.map(({ booking, resource }) => (
                <option key={booking.id} value={booking.id}>
                  {resource?.name ?? 'Resource'} · {booking.startDate} {booking.startTime}
                </option>
              ))}
            </Select>
            <Select label="Category" value={category} onChange={(e) => setCategory(e.target.value as IncidentCategory)} requiredMark>
              {CATEGORY_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>

          <Input
            label="When did this happen?"
            type="datetime-local"
            value={occurredAt}
            onChange={(event) => setOccurredAt(event.target.value)}
            requiredMark
          />

          <Textarea
            label="What happened?"
            rows={4}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Describe the incident, who was involved, what was damaged or what safety concern arose. Minimum 30 characters."
            requiredMark
          />

          <ImageUploader value={images} onChange={setImages} max={3} label="Photos (optional)" />

          {formError ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700">{formError}</p>
          ) : null}

          <div className="rounded-xl bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-500">
            <Sparkles className="mr-1 inline h-3 w-3" /> A rule-based summary is generated for reviewers.
            No automatic penalty or liability decision is made.
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={detail?.resourceName ?? 'Incident details'}
        description={detail ? `${INCIDENT_CATEGORY_LABELS[detail.category]} · reported ${formatDateTime(detail.createdAt)}` : undefined}
        size="lg"
      >
        {detail ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <IncidentStatusBadge status={detail.status} />
              <span className="text-xs text-slate-400">#{detail.id.slice(-8)}</span>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">AI-assisted summary</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{detail.summary}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Description</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{detail.description}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-3 text-xs">
                <p className="text-slate-400">Occurred at</p>
                <p className="mt-0.5 font-medium text-slate-700">{formatDateTime(detail.occurredAt)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-3 text-xs">
                <p className="text-slate-400">Booking reference</p>
                <p className="mt-0.5 font-medium text-slate-700">
                  {detail.bookingId ? (getBookingView(detail.bookingId)?.resource?.name ?? detail.bookingId) : 'Not linked'}
                </p>
              </div>
            </div>
            {detail.images.length > 0 ? (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Photos</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {detail.images.map((image, index) => (
                    <img key={index} src={image} alt={`Incident photo ${index + 1}`} className="h-24 w-24 rounded-xl border border-slate-200 object-cover" />
                  ))}
                </div>
              </div>
            ) : null}
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Manager review</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                {detail.managerNotes || 'No review notes yet. A manager will update this report after review.'}
              </p>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
