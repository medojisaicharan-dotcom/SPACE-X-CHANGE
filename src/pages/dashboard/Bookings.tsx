import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays,
  ClipboardCheck,
  Compass,
  Eye,
  LogIn,
  LogOut,
  Search,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button, buttonStyles } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
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
  cancelBooking,
  checkInBooking,
  checkOutBooking,
  leaveWaitlist,
  listBookingsForUser,
  type BookingView,
  type HandoverInput,
} from '@/services/bookingService';
import { formatCurrency } from '@/utils/format';
import { formatSlot } from '@/utils/date';
import { cn } from '@/utils/format';
import type { BookingStatus } from '@/types';

const TABS: { key: 'all' | 'active' | 'pending' | 'history'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'pending', label: 'Pending' },
  { key: 'history', label: 'History' },
];

const HISTORY: BookingStatus[] = ['completed', 'checked_out', 'rejected', 'cancelled'];
const ACTIVE: BookingStatus[] = ['approved', 'checked_in', 'overdue', 'waitlisted'];

export function Bookings() {
  const { profile } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('all');
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<BookingView | null>(null);
  const [cancelTarget, setCancelTarget] = useState<BookingView | null>(null);
  const [handover, setHandover] = useState<{ view: BookingView; mode: 'checkin' | 'checkout' } | null>(null);
  const [working, setWorking] = useState(false);

  const bookings = useLiveQuery(
    () => (profile ? listBookingsForUser(profile.id) : []),
    [profile?.id],
  );

  const filtered = useMemo(() => {
    return bookings.filter((view) => {
      const status = view.booking.status;
      if (tab === 'active' && !ACTIVE.includes(status)) return false;
      if (tab === 'pending' && status !== 'pending') return false;
      if (tab === 'history' && !HISTORY.includes(status)) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return [view.resource?.name, view.booking.purpose, view.booking.id]
          .join(' ')
          .toLowerCase()
          .includes(q);
      }
      return true;
    });
  }, [bookings, tab, search]);

  if (!profile) return null;

  async function handleCancel() {
    if (!cancelTarget || !profile) return;
    setWorking(true);
    try {
      if (cancelTarget.booking.status === 'waitlisted') leaveWaitlist(profile.id, cancelTarget.booking.id);
      else cancelBooking(profile.id, cancelTarget.booking.id, 'Cancelled by user');
      toast.success('Booking cancelled', 'The owner has been notified.');
      setCancelTarget(null);
    } catch (error) {
      toast.error('Could not cancel', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setWorking(false);
    }
  }

  async function handleHandover(input: HandoverInput) {
    if (!handover || !profile) return;
    try {
      if (handover.mode === 'checkin') {
        await Promise.resolve(checkInBooking(profile.id, handover.view.booking.id, input));
        toast.success('Checked in', 'Initial condition recorded. Remember to check out on time.');
      } else {
        await Promise.resolve(checkOutBooking(profile.id, handover.view.booking.id, input));
        toast.success('Return recorded', 'The owner will review and confirm completion.');
      }
    } catch (error) {
      toast.error('Handover failed', error instanceof Error ? error.message : 'Try again.');
      throw error;
    }
  }

  return (
    <div>
      <PageHeader
        title="My bookings"
        description="Track requests, check in and out, join waiting lists and review past sessions."
        actions={
          <Link to="/explore" className={buttonStyles('primary', 'md')}>
            <Compass className="h-4 w-4" /> Book a resource
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="inline-flex flex-wrap rounded-xl border border-slate-200 bg-white p-1">
          {TABS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setTab(option.key)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                tab === option.key ? 'bg-navy-900 text-white' : 'text-slate-500 hover:text-navy-700',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search bookings"
            className="pl-9"
            aria-label="Search bookings"
          />
        </div>
        <Badge tone="slate">{filtered.length} result(s)</Badge>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={CalendarDays}
            title="No bookings in this view"
            description={
              bookings.length === 0
                ? 'Explore the catalogue and submit your first booking request.'
                : 'Try another filter or search term.'
            }
            action={
              <Link to="/explore" className={buttonStyles('primary', 'sm')}>
                Explore resources
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((view) => {
            const { booking, resource, owner } = view;
            const canCancel = ['pending', 'approved', 'waitlisted'].includes(booking.status);
            const checkIn = canPerformCheckIn(booking);
            const checkOut = canCheckOut(booking);
            return (
              <Card key={booking.id} className="p-4">
                <div className="flex flex-col gap-4 sm:flex-row">
                  <img
                    src={resource?.image}
                    alt={resource?.name ?? 'Resource'}
                    className="h-24 w-full rounded-xl border border-slate-200 object-cover sm:w-32"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold text-ink">
                          {resource ? (
                            <Link to={`/resources/${resource.id}`} className="hover:text-navy-700">
                              {resource.name}
                            </Link>
                          ) : (
                            'Resource removed'
                          )}
                        </h3>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {formatSlot(booking.startDate, booking.startTime, booking.endTime)}
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-400">
                          Owner: {owner?.fullName ?? 'Unknown'} · {formatCurrency(booking.totalCost)}
                        </p>
                      </div>
                      <BookingStatusBadge status={booking.status} />
                    </div>

                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-500">{booking.purpose}</p>

                    {booking.status === 'overdue' ? (
                      <p className="mt-2 rounded-lg bg-rose-50 px-2.5 py-1.5 text-[11px] font-medium text-rose-700">
                        This booking is overdue. Check out immediately.
                      </p>
                    ) : null}

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setDetail(view)} icon={<Eye className="h-3.5 w-3.5" />}>
                        Details
                      </Button>
                      {checkIn ? (
                        <Button size="sm" onClick={() => setHandover({ view, mode: 'checkin' })} icon={<LogIn className="h-3.5 w-3.5" />}>
                          Check in
                        </Button>
                      ) : null}
                      {checkOut ? (
                        <Button size="sm" variant="success" onClick={() => setHandover({ view, mode: 'checkout' })} icon={<LogOut className="h-3.5 w-3.5" />}>
                          Check out
                        </Button>
                      ) : null}
                      {canCancel ? (
                        <Button variant="ghost" size="sm" onClick={() => setCancelTarget(view)} icon={<XCircle className="h-3.5 w-3.5" />}>
                          {booking.status === 'waitlisted' ? 'Leave waitlist' : 'Cancel'}
                        </Button>
                      ) : null}
                      {booking.status === 'approved' && !checkIn ? (
                        <span className="text-[11px] text-slate-400">
                          <ClipboardCheck className="mr-1 inline h-3 w-3" /> Check-in opens 30 minutes before start
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <BookingDetailModal open={Boolean(detail)} onClose={() => setDetail(null)} view={detail} />

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancel}
        title={cancelTarget?.booking.status === 'waitlisted' ? 'Leave the waiting list?' : 'Cancel this booking?'}
        message={
          cancelTarget?.booking.status === 'approved'
            ? 'This slot will be released and waitlisted users may be notified. The owner will be informed.'
            : 'This action cannot be undone. The owner will be notified.'
        }
        confirmLabel={cancelTarget?.booking.status === 'waitlisted' ? 'Leave waitlist' : 'Cancel booking'}
        cancelLabel="Keep booking"
        loading={working}
      />

      <HandoverModal
        open={Boolean(handover)}
        onClose={() => setHandover(null)}
        mode={handover?.mode ?? 'checkin'}
        booking={handover?.view.booking ?? null}
        resource={handover?.view.resource}
        onSubmit={handleHandover}
      />
    </div>
  );
}
