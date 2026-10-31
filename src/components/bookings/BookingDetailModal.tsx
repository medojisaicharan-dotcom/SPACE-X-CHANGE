import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Clock, MapPin, ShieldCheck, UserRound, Wallet } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { BookingStatusBadge } from '@/components/ui/StatusBadge';
import { getPriorityBreakdown, type BookingView } from '@/services/bookingService';
import { formatCurrency, formatDateTime } from '@/utils/format';
import { formatSlot } from '@/utils/date';
import { cn } from '@/utils/format';

export function BookingDetailModal({
  open,
  onClose,
  view,
  footer,
  showRequester = false,
}: {
  open: boolean;
  onClose: () => void;
  view: BookingView | null;
  footer?: ReactNode;
  showRequester?: boolean;
}) {
  if (!view) return null;
  const { booking, resource, user, owner } = view;
  const priority = getPriorityBreakdown(booking.id);

  const timeline = [
    { label: 'Submitted', value: booking.createdAt },
    { label: 'Approved', value: booking.approvedAt },
    { label: 'Rejected', value: booking.rejectedAt },
    { label: 'Checked in', value: booking.checkedInAt },
    { label: 'Checked out', value: booking.checkedOutAt },
    { label: 'Completed', value: booking.completedAt },
    { label: 'Cancelled', value: booking.cancelledAt },
  ].filter((entry) => entry.value);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={resource?.name ?? 'Booking details'}
      description={formatSlot(booking.startDate, booking.startTime, booking.endTime)}
      size="lg"
      footer={footer}
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <BookingStatusBadge status={booking.status} />
          <span className="text-xs text-slate-400">#{booking.id.slice(-8)}</span>
          {resource ? (
            <Link to={`/resources/${resource.id}`} className="ml-auto text-xs font-semibold text-navy-700 hover:underline">
              View resource
            </Link>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-3">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              <CalendarDays className="h-3.5 w-3.5" /> Schedule
            </p>
            <p className="mt-1 text-sm font-medium text-ink">
              {formatSlot(booking.startDate, booking.startTime, booking.endTime)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 p-3">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              <Wallet className="h-3.5 w-3.5" /> Indicative cost
            </p>
            <p className="mt-1 text-sm font-medium text-ink">{formatCurrency(booking.totalCost)}</p>
            <p className="text-[10px] text-slate-400">No payment is processed in demo mode.</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-3">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              <MapPin className="h-3.5 w-3.5" /> Location
            </p>
            <p className="mt-1 text-sm font-medium text-ink">{resource?.location ?? '—'}</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-3">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              <UserRound className="h-3.5 w-3.5" /> People
            </p>
            <p className="mt-1 text-sm font-medium text-ink">
              {showRequester ? `Requester: ${user?.fullName ?? 'Unknown'}` : `Owner: ${owner?.fullName ?? 'Unknown'}`}
            </p>
            {showRequester ? (
              <p className="text-[11px] text-slate-400">{user?.email}</p>
            ) : (
              <p className="text-[11px] text-slate-400">{owner?.institutionName}</p>
            )}
          </div>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Purpose</p>
          <p className="mt-1 rounded-xl bg-slate-50 p-3 text-sm leading-relaxed text-slate-600">{booking.purpose}</p>
        </div>

        {booking.rejectionReason ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            <p className="font-semibold">Rejection reason</p>
            <p className="mt-1">{booking.rejectionReason}</p>
          </div>
        ) : null}

        {booking.status === 'overdue' ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            This booking passed its return time. Check out immediately or contact the owner.
          </div>
        ) : null}

        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            <Clock className="h-3.5 w-3.5" /> Timeline
          </p>
          <div className="mt-2 space-y-1.5">
            {timeline.map((entry) => (
              <div key={entry.label} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5 text-xs">
                <span className="text-slate-500">{entry.label}</span>
                <span className="font-medium text-slate-700">{formatDateTime(entry.value!)}</span>
              </div>
            ))}
          </div>
        </div>

        {priority.length > 0 ? (
          <div>
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              <ShieldCheck className="h-3.5 w-3.5" /> Allocation factors
            </p>
            <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
              {priority.map((factor) => (
                <div key={factor.label} className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-1.5 text-xs">
                  <span className="text-slate-500">{factor.label}</span>
                  <span
                    className={cn(
                      'text-right font-medium',
                      factor.state === 'pass' ? 'text-emerald-700' : factor.state === 'warn' ? 'text-amber-700' : 'text-slate-700',
                    )}
                  >
                    {factor.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
