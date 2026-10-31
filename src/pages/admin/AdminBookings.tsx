import { useMemo, useState } from 'react';
import { CalendarClock, Check, Eye, Search, X } from 'lucide-react';
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
  listAllBookings,
  rejectBooking,
  type BookingView,
} from '@/services/bookingService';
import { evaluateEligibility } from '@/services/eligibilityService';
import { formatSlot } from '@/utils/date';
import { formatCurrency } from '@/utils/format';
import type { BookingStatus } from '@/types';

const STATUS_OPTIONS: { value: 'all' | BookingStatus; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'waitlisted', label: 'Waitlisted' },
  { value: 'checked_in', label: 'Checked in' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'checked_out', label: 'Checked out' },
  { value: 'completed', label: 'Completed' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function AdminBookings() {
  const { profile } = useAuth();
  const toast = useToast();
  const [status, setStatus] = useState<'all' | BookingStatus>('all');
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<BookingView | null>(null);
  const [approveTarget, setApproveTarget] = useState<BookingView | null>(null);
  const [rejectTarget, setRejectTarget] = useState<BookingView | null>(null);
  const [cancelTarget, setCancelTarget] = useState<BookingView | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);

  const bookings = useLiveQuery(() => listAllBookings(), [profile?.id]);

  const filtered = useMemo(() => {
    return bookings.filter((view) => {
      if (status !== 'all' && view.booking.status !== status) return false;
      if (search.trim()) {
        return [view.resource?.name, view.user?.fullName, view.user?.email, view.owner?.fullName, view.booking.purpose]
          .join(' ')
          .toLowerCase()
          .includes(search.toLowerCase());
      }
      return true;
    });
  }, [bookings, status, search]);

  if (!profile) return null;

  const actorId = profile.id;

  const counts = {
    pending: bookings.filter((view) => view.booking.status === 'pending').length,
    active: bookings.filter((view) => ['approved', 'checked_in'].includes(view.booking.status)).length,
    overdue: bookings.filter((view) => view.booking.status === 'overdue').length,
    completed: bookings.filter((view) => view.booking.status === 'completed').length,
  };

  async function handleApprove() {
    if (!approveTarget) return;
    setWorking(true);
    try {
      approveBooking(actorId, approveTarget.booking.id);
      toast.success('Booking approved', 'The requester and owner have been notified.');
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
      rejectBooking(actorId, rejectTarget.booking.id, reason);
      toast.success('Request rejected', 'The requester has been notified.');
      setRejectTarget(null);
      setReason('');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not reject this request.');
    } finally {
      setWorking(false);
    }
  }

  async function handleCancel() {
    if (!cancelTarget) return;
    setWorking(true);
    try {
      cancelBooking(actorId, cancelTarget.booking.id, 'Cancelled by administration');
      toast.success('Booking cancelled', 'The slot has been released.');
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
        title="All bookings"
        description="Cross-platform booking oversight with the same eligibility and conflict safeguards as owners."
        actions={<Badge tone="amber">{counts.pending} pending</Badge>}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        {[
          { label: 'Pending', value: counts.pending },
          { label: 'Active', value: counts.active },
          { label: 'Overdue', value: counts.overdue },
          { label: 'Completed', value: counts.completed },
        ].map((card) => (
          <Card key={card.label} className="p-3">
            <p className="text-[11px] text-slate-500">{card.label}</p>
            <p className="mt-0.5 text-xl font-semibold text-ink">{card.value}</p>
          </Card>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className="max-w-[170px]" aria-label="Filter by status">
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </Select>
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search requester, owner or listing" className="pl-9" aria-label="Search bookings" />
        </div>
        <Badge tone="slate">{filtered.length} booking(s)</Badge>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState icon={CalendarClock} title="No bookings match" description="Try a different status or search term." />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Resource</th>
                  <th>Requester / owner</th>
                  <th>Schedule</th>
                  <th>Status</th>
                  <th>Cost</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((view) => {
                  const { booking, resource, user, owner } = view;
                  const eligibility = resource && user ? evaluateEligibility(user.id, resource) : null;
                  const canReview = ['pending', 'waitlisted'].includes(booking.status);
                  const canCancel = ['pending', 'approved', 'waitlisted'].includes(booking.status);
                  return (
                    <tr key={booking.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <img src={resource?.image} alt={resource?.name ?? 'Resource'} className="h-8 w-8 rounded-md border border-slate-200 object-cover" />
                          <div className="min-w-0">
                            <p className="max-w-[180px] truncate text-xs font-semibold text-ink">{resource?.name ?? 'Removed listing'}</p>
                            <p className="text-[10px] text-slate-400">{resource?.institutionName}</p>
                          </div>
                        </div>
                      </td>
                      <td className="text-xs">
                        <p className="font-medium text-slate-700">{user?.fullName}</p>
                        <p className="text-[10px] text-slate-400">Owner: {owner?.fullName ?? '—'}</p>
                      </td>
                      <td className="text-xs text-slate-600">
                        <p>{formatSlot(booking.startDate, booking.startTime, booking.endTime)}</p>
                        <p className="text-[10px] text-slate-400">Created {new Date(booking.createdAt).toLocaleDateString('en-IN')}</p>
                      </td>
                      <td>
                        <div className="space-y-1">
                          <BookingStatusBadge status={booking.status} />
                          {eligibility && eligibility.status !== 'eligible' && canReview ? (
                            <Badge tone={eligibility.status === 'pending' ? 'amber' : 'rose'}>
                              {eligibility.status === 'pending' ? 'Eligibility pending' : 'Ineligible'}
                            </Badge>
                          ) : null}
                        </div>
                      </td>
                      <td className="text-xs text-slate-600">{formatCurrency(booking.totalCost)}</td>
                      <td>
                        <div className="flex flex-wrap justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => setDetail(view)} icon={<Eye className="h-3.5 w-3.5" />}>View</Button>
                          {canReview ? (
                            <>
                              <Button size="sm" variant="ghost" className="text-emerald-600 hover:bg-emerald-50" onClick={() => setApproveTarget(view)} disabled={eligibility?.status !== 'eligible'} icon={<Check className="h-3.5 w-3.5" />}>Approve</Button>
                              <Button size="sm" variant="ghost" className="text-rose-600 hover:bg-rose-50" onClick={() => { setRejectTarget(view); setReason(''); setError(''); }} icon={<X className="h-3.5 w-3.5" />}>Reject</Button>
                            </>
                          ) : null}
                          {canCancel ? (
                            <Button size="sm" variant="ghost" className="text-rose-600 hover:bg-rose-50" onClick={() => setCancelTarget(view)}>Cancel</Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <BookingDetailModal open={Boolean(detail)} onClose={() => setDetail(null)} view={detail} showRequester />

      <ConfirmDialog
        open={Boolean(approveTarget)}
        onClose={() => setApproveTarget(null)}
        onConfirm={handleApprove}
        title="Approve this booking?"
        message={`Approve ${approveTarget?.user?.fullName ?? 'the requester'} for ${approveTarget?.resource?.name ?? 'this listing'}? Eligibility and conflict checks run again automatically.`}
        confirmLabel="Approve booking"
        tone="success"
        loading={working}
      />

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancel}
        title="Cancel this booking?"
        message="The slot is released immediately and both parties are notified. This action is recorded in the audit log."
        confirmLabel="Cancel booking"
        cancelLabel="Keep booking"
        loading={working}
      />

      <Modal
        open={Boolean(rejectTarget)}
        onClose={() => setRejectTarget(null)}
        title="Reject booking request"
        description="Your reason is shown to the requester and recorded in the audit history."
        footer={
          <>
            <Button variant="outline" onClick={() => setRejectTarget(null)} disabled={working}>Keep request</Button>
            <Button variant="danger" onClick={handleReject} loading={working} icon={<X className="h-4 w-4" />}>Reject request</Button>
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
            label="Reason"
            rows={3}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Explain the policy, eligibility or scheduling reason clearly."
            requiredMark
          />
          {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}
        </div>
      </Modal>
    </div>
  );
}
