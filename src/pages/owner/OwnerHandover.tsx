import { useState } from 'react';
import {
  ArrowLeftRight,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Eye,
  LogIn,
  LogOut,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { BookingStatusBadge } from '@/components/ui/StatusBadge';
import { BookingDetailModal } from '@/components/bookings/BookingDetailModal';
import { HandoverModal } from '@/components/bookings/HandoverModal';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useLiveQuery } from '@/hooks/useLiveQuery';
import {
  canCheckOut,
  canPerformCheckIn,
  checkInBooking,
  checkOutBooking,
  completeBooking,
  listBookingsForOwner,
  type BookingView,
  type HandoverInput,
} from '@/services/bookingService';
import { formatSlot } from '@/utils/date';

export function OwnerHandover() {
  const { profile } = useAuth();
  const toast = useToast();
  const [detail, setDetail] = useState<BookingView | null>(null);
  const [handover, setHandover] = useState<{ view: BookingView; mode: 'checkin' | 'checkout' } | null>(null);
  const [completeTarget, setCompleteTarget] = useState<BookingView | null>(null);
  const [working, setWorking] = useState(false);

  const bookings = useLiveQuery(
    () => (profile ? listBookingsForOwner(profile.id) : []),
    [profile?.id],
  );

  if (!profile) return null;

  const ownerId = profile.id;

  const readyCheckIn = bookings.filter((view) => canPerformCheckIn(view.booking));
  const waiting = bookings.filter(
    (view) => view.booking.status === 'approved' && !canPerformCheckIn(view.booking),
  );
  const active = bookings.filter((view) => canCheckOut(view.booking));
  const awaitingConfirmation = bookings.filter((view) => view.booking.status === 'checked_out');

  async function handleHandover(input: HandoverInput) {
    if (!handover) return;
    try {
      if (handover.mode === 'checkin') {
        checkInBooking(ownerId, handover.view.booking.id, input);
        toast.success('Check-in recorded', 'Initial condition saved for this booking.');
      } else {
        checkOutBooking(ownerId, handover.view.booking.id, input);
        toast.success('Return recorded', 'Review the final condition and confirm completion.');
      }
    } catch (error) {
      toast.error('Handover failed', error instanceof Error ? error.message : 'Try again.');
      throw error;
    }
  }

  async function handleComplete() {
    if (!completeTarget) return;
    setWorking(true);
    try {
      completeBooking(ownerId, completeTarget.booking.id);
      toast.success('Booking completed', 'The borrower has been notified.');
      setCompleteTarget(null);
    } catch (error) {
      toast.error('Could not complete', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setWorking(false);
    }
  }

  const sections = [
    {
      title: 'Ready for check-in',
      description: 'Approved sessions within the check-in window.',
      views: readyCheckIn,
      empty: 'No sessions are currently inside the check-in window.',
    },
    {
      title: 'In progress / overdue',
      description: 'Checked-in sessions that need a return record.',
      views: active,
      empty: 'No active sessions.',
    },
    {
      title: 'Awaiting completion confirmation',
      description: 'Returned resources waiting for your review.',
      views: awaitingConfirmation,
      empty: 'No returns awaiting confirmation.',
    },
    {
      title: 'Upcoming (not yet open)',
      description: 'Approved sessions that open for check-in 30 minutes before start.',
      views: waiting,
      empty: 'No upcoming approved sessions.',
    },
  ];

  return (
    <div>
      <PageHeader
        title="Check-in / check-out"
        description="Record condition at handover, confirm returns and close the loop on each booking."
        actions={
          <Badge tone="navy">
            <ArrowLeftRight className="h-3 w-3" /> {readyCheckIn.length + active.length} action(s)
          </Badge>
        }
      />

      <div className="space-y-5">
        {sections.map((section) => (
          <Card key={section.title}>
            <CardHeader
              title={
                <span className="flex items-center gap-2">
                  {section.title}
                  <Badge tone={section.views.length > 0 ? 'amber' : 'slate'}>{section.views.length}</Badge>
                </span>
              }
              description={section.description}
            />
            {section.views.length === 0 ? (
              <div className="px-5 py-5 text-xs text-slate-500">{section.empty}</div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {section.views.map((view) => {
                  const { booking, resource, user } = view;
                  return (
                    <li key={booking.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                      <img src={resource?.image} alt={resource?.name ?? 'Resource'} className="h-11 w-11 rounded-lg border border-slate-200 object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink">{resource?.name}</p>
                        <p className="text-[11px] text-slate-500">
                          {user?.fullName} · {formatSlot(booking.startDate, booking.startTime, booking.endTime)}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-400">
                          <Clock className="h-3 w-3" /> Booking #{booking.id.slice(-6)}
                        </p>
                      </div>
                      <BookingStatusBadge status={booking.status} />
                      <div className="flex flex-wrap gap-1.5">
                        <Button variant="outline" size="sm" onClick={() => setDetail(view)} icon={<Eye className="h-3.5 w-3.5" />}>
                          View
                        </Button>
                        {canPerformCheckIn(booking) ? (
                          <Button size="sm" onClick={() => setHandover({ view, mode: 'checkin' })} icon={<LogIn className="h-3.5 w-3.5" />}>
                            Check in
                          </Button>
                        ) : null}
                        {canCheckOut(booking) ? (
                          <Button size="sm" variant="success" onClick={() => setHandover({ view, mode: 'checkout' })} icon={<LogOut className="h-3.5 w-3.5" />}>
                            Check out
                          </Button>
                        ) : null}
                        {booking.status === 'checked_out' ? (
                          <Button size="sm" onClick={() => setCompleteTarget(view)} icon={<CheckCircle2 className="h-3.5 w-3.5" />}>
                            Confirm complete
                          </Button>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        ))}
      </div>

      <div className="mt-5 flex items-start gap-3 rounded-2xl border border-navy-100 bg-navy-50 p-4 text-xs leading-relaxed text-navy-800">
        <ClipboardCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Condition checklists and photos are attached to the booking and visible in the audit history. If you
          find damage, ask the borrower to report it — or file an incident from the Incidents page for manager
          review.
        </p>
      </div>

      <BookingDetailModal open={Boolean(detail)} onClose={() => setDetail(null)} view={detail} showRequester />

      <HandoverModal
        open={Boolean(handover)}
        onClose={() => setHandover(null)}
        mode={handover?.mode ?? 'checkin'}
        booking={handover?.view.booking ?? null}
        resource={handover?.view.resource}
        onSubmit={handleHandover}
      />

      <ConfirmDialog
        open={Boolean(completeTarget)}
        onClose={() => setCompleteTarget(null)}
        onConfirm={handleComplete}
        title="Confirm the booking as complete?"
        message={`This closes the booking for ${completeTarget?.resource?.name ?? 'the resource'}. The borrower will be notified and the resource becomes available for new requests.`}
        confirmLabel="Confirm completion"
        tone="success"
        loading={working}
      />
    </div>
  );
}
