import { useMemo, useState } from 'react';
import {
  CalendarDays,
  Check,
  ClipboardList,
  Eye,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { BookingStatusBadge } from '@/components/ui/StatusBadge';
import { BookingDetailModal } from '@/components/bookings/BookingDetailModal';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useLiveQuery } from '@/hooks/useLiveQuery';
import {
  approveBooking,
  cancelBooking,
  listBookingsForOwner,
  rejectBooking,
  type BookingView,
} from '@/services/bookingService';
import { evaluateEligibility } from '@/services/eligibilityService';
import type { BookingStatus } from '@/types';
import { formatCurrency } from '@/utils/format';
import { formatSlot } from '@/utils/date';
import { cn } from '@/utils/format';

const FILTERS: { value: 'all' | BookingStatus; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'checked_in', label: 'Checked in' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'checked_out', label: 'Checked out' },
  { value: 'completed', label: 'Completed' },
  { value: 'rejected', label: 'Rejected' },
];

export function OwnerBookings() {
  const { profile } = useAuth();
  const toast = useToast();
  const [filter, setFilter] = useState<'all' | BookingStatus>('pending');
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<BookingView | null>(null);
  const [approveTarget, setApproveTarget] = useState<BookingView | null>(null);
  const [rejectTarget, setRejectTarget] = useState<BookingView | null>(null);
  const [cancelTarget, setCancelTarget] = useState<BookingView | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);

  const bookings = useLiveQuery(
    () => (profile ? listBookingsForOwner(profile.id) : []),
    [profile?.id],
  );

  const filtered = useMemo(() => {
    return bookings.filter((view) => {
      if (filter !== 'all' && view.booking.status !== filter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return [view.resource?.name, view.user?.fullName, view.user?.email, view.booking.purpose]
          .join(' ')
          .toLowerCase()
          .includes(q);
      }
      return true;
    });
  }, [bookings, filter, search]);

  if (!profile) return null;

  const ownerId = profile.id;

  const pendingCount = bookings.filter((v) => ['pending', 'waitlisted'].includes(v.booking.status)).length;

  async function handleApprove() {
    if (!approveTarget) return;
    setWorking(true);
    try {
      approveBooking(ownerId, approveTarget.booking.id);
      toast.success('Booking approved', 'The requester has been notified.');
      setApproveTarget(null);
    } catch (error) {
      toast.error('Could not approve', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setWorking(false);
    }
  }

  async function handleReject() {
    if (!rejectTarget) return;
    setError('');
    if (reason.trim().length < 5) {
      setError('Provide a clear reason (at least 5 characters).');
      return;
    }
    setWorking(true);
    try {
      rejectBooking(ownerId, rejectTarget.booking.id, reason);
      toast.success('Request rejected', 'The requester received your reason.');
      setRejectTarget(null);
      setReason('');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not reject the request.');
    } finally {
      setWorking(false);
    }
  }

  async function handleCancel() {
    if (!cancelTarget) return;
    setWorking(true);
    try {
      cancelBooking(ownerId, cancelTarget.booking.id, 'Cancelled by owner');
      toast.success('Booking cancelled', 'The slot was released and waitlisted users may be notified.');
      setCancelTarget(null);
    } catch (error) {
      toast.error('Could not cancel', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setWorking(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Booking requests"
        description="Review purposes, check eligibility and approve or reject with a clear reason."
        actions={<Badge tone={pendingCount ? 'amber' : 'slate'}>{pendingCount} awaiting review</Badge>}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)} className="max-w-[160px]" aria-label="Filter by status">
          {FILTERS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search requester or resource" className="pl-9" aria-label="Search bookings" />
        </div>
        <Badge tone="slate">{filtered.length} result(s)</Badge>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={ClipboardList}
            title="No bookings in this view"
            description="When members request your resources, their requests will appear here for review."
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((view) => {
            const { booking, resource, user } = view;
            const eligibility = resource && user ? evaluateEligibility(user.id, resource) : null;
            const canReview = ['pending', 'waitlisted'].includes(booking.status);
            const canCancel = ['pending', 'approved', 'waitlisted'].includes(booking.status);
            return (
              <Card key={booking.id} className="p-4">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <img src={resource?.image} alt={resource?.name ?? 'Resource'} className="h-24 w-full rounded-xl border border-slate-200 object-cover sm:w-32" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold text-ink">{resource?.name ?? 'Resource removed'}</h3>
                        <p className="mt-0.5 text-xs text-slate-500">{formatSlot(booking.startDate, booking.startTime, booking.endTime)}</p>
                        <p className="mt-0.5 text-[11px] text-slate-400">
                          {user?.fullName} · {user?.institutionName} · {formatCurrency(booking.totalCost)}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <BookingStatusBadge status={booking.status} />
                        {eligibility ? (
                          <Badge tone={eligibility.status === 'eligible' ? 'green' : eligibility.status === 'pending' ? 'amber' : 'rose'} dot>
                            {eligibility.status === 'eligible' ? 'Eligible' : eligibility.status === 'pending' ? 'Eligibility pending' : 'Not eligible'}
                          </Badge>
                        ) : null}
                      </div>
                    </div>

                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-500">{booking.purpose}</p>

                    {eligibility && eligibility.status !== 'eligible' ? (
                      <p className="mt-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-800">
                        {eligibility.reasons[0] ?? 'Requester does not meet all requirements.'} Approval will be blocked until resolved.
                      </p>
                    ) : null}

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setDetail(view)} icon={<Eye className="h-3.5 w-3.5" />}>
                        Details
                      </Button>
                      {canReview ? (
                        <>
                          <Button
                            size="sm"
                            variant="success"
                            onClick={() => setApproveTarget(view)}
                            disabled={eligibility?.status !== 'eligible'}
                            icon={<Check className="h-3.5 w-3.5" />}
                          >
                            Approve
                          </Button>
                          <Button variant="danger" size="sm" onClick={() => { setRejectTarget(view); setReason(''); setError(''); }} icon={<X className="h-3.5 w-3.5" />}>
                            Reject
                          </Button>
                        </>
                      ) : null}
                      {canCancel ? (
                        <Button variant="ghost" size="sm" className="text-rose-600 hover:bg-rose-50" onClick={() => setCancelTarget(view)}>
                          Cancel booking
                        </Button>
                      ) : null}
                      {booking.status === 'checked_out' ? (
                        <span className="text-[11px] text-slate-400">Awaiting return confirmation in Handover.</span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <BookingDetailModal open={Boolean(detail)} onClose={() => setDetail(null)} view={detail} showRequester />

      <ConfirmDialog
        open={Boolean(approveTarget)}
        onClose={() => setApproveTarget(null)}
        onConfirm={handleApprove}
        title="Approve this booking?"
        message={`Approve ${approveTarget?.user?.fullName ?? 'the requester'} for ${approveTarget?.resource?.name ?? 'this resource'}? Eligibility and conflicts are re-checked automatically.`}
        confirmLabel="Approve booking"
        tone="success"
        loading={working}
      />

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancel}
        title="Cancel this booking?"
        message="This releases the slot immediately. Waitlisted users may be notified and the requester will see the cancellation."
        confirmLabel="Cancel booking"
        cancelLabel="Keep booking"
        loading={working}
      />

      <Modal
        open={Boolean(rejectTarget)}
        onClose={() => setRejectTarget(null)}
        title="Reject booking request"
        description="Give the requester a clear, respectful reason so they can improve their request."
        footer={
          <>
            <Button variant="outline" onClick={() => setRejectTarget(null)} disabled={working}>
              Keep request
            </Button>
            <Button variant="danger" onClick={handleReject} loading={working} icon={<X className="h-4 w-4" />}>
              Reject request
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
            <p className="font-semibold text-ink">{rejectTarget?.resource?.name}</p>
            <p className="mt-0.5">{rejectTarget ? formatSlot(rejectTarget.booking.startDate, rejectTarget.booking.startTime, rejectTarget.booking.endTime) : ''}</p>
            <p className="mt-1 text-[11px] text-slate-500">{rejectTarget?.booking.purpose}</p>
          </div>
          <Textarea
            label="Reason for rejection"
            rows={3}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="e.g. Required safety training is not yet verified. Please upload your certificate and reapply."
            requiredMark
          />
          {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}
          <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-400">
            <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0" /> If you cannot host this slot but the request is valid,
            consider cancelling instead of rejecting so the requester can rebook.
          </p>
        </div>
      </Modal>

      <div className={cn('mt-5 flex items-center gap-2 rounded-2xl border border-navy-100 bg-navy-50 p-4 text-xs text-navy-800')}>
        <CalendarDays className="h-4 w-4 shrink-0" />
        Overdue bookings are flagged automatically after the grace period. Use Handover to check resources back in.
      </div>
    </div>
  );
}
