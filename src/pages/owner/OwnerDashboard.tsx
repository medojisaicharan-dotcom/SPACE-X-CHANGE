import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Boxes,
  CalendarClock,
  ClipboardList,
  Clock,
  Plus,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { buttonStyles } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { BookingStatusBadge, IncidentStatusBadge } from '@/components/ui/StatusBadge';
import { useAuth } from '@/contexts/AuthContext';
import { useLiveQuery } from '@/hooks/useLiveQuery';
import { getOwnerAnalytics } from '@/services/analyticsService';
import { listBookingsForOwner, canPerformCheckIn, canCheckOut } from '@/services/bookingService';
import { listIncidentsForOwner } from '@/services/incidentService';
import { formatCurrency, timeAgo } from '@/utils/format';
import { formatSlot } from '@/utils/date';

export function OwnerDashboard() {
  const { profile } = useAuth();
  const data = useLiveQuery(() => {
    if (!profile) return null;
    return {
      analytics: getOwnerAnalytics(profile.id),
      bookings: listBookingsForOwner(profile.id),
      incidents: listIncidentsForOwner(profile.id),
    };
  }, [profile?.id]);

  if (!profile || !data) return null;

  const pending = data.bookings.filter((v) => ['pending', 'waitlisted'].includes(v.booking.status));
  const handover = data.bookings.filter(
    (v) => canPerformCheckIn(v.booking) || canCheckOut(v.booking) || v.booking.status === 'checked_out',
  );
  const openIncidents = data.incidents.filter((i) => ['reported', 'under_review'].includes(i.status));
  const maxWeekly = Math.max(1, ...data.analytics.weeklyActivity.map((w) => w.bookings));

  return (
    <div>
      <PageHeader
        eyebrow="Owner console"
        title={`Hello, ${profile.fullName.split(' ')[0]}`}
        description="Review requests, manage listings and keep handovers moving."
        actions={
          <>
            <Link to="/owner/resources/new" className={buttonStyles('primary', 'md')}>
              <Plus className="h-4 w-4" /> New listing
            </Link>
            <Link to="/owner/bookings" className={buttonStyles('outline', 'md')}>
              <ClipboardList className="h-4 w-4" /> Booking requests
            </Link>
          </>
        }
      />

      {!profile.verified ? (
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Your owner account is awaiting verification. You can prepare listings, but publishing is
            blocked until an administrator verifies your account.
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Pending requests" value={data.analytics.pendingRequests} hint="Awaiting your review" icon={ClipboardList} tone="amber" />
        <StatCard label="Active listings" value={`${data.analytics.activeResources}/${data.analytics.totalResources}`} hint="Published resources" icon={Boxes} tone="navy" />
        <StatCard label="Open incidents" value={data.analytics.openIncidents} hint={`${data.analytics.overdueReturns} overdue return(s)`} icon={AlertTriangle} tone={data.analytics.openIncidents ? 'rose' : 'green'} />
        <StatCard label="Recorded revenue" value={formatCurrency(data.analytics.revenue)} hint={`${data.analytics.completedBookings} completed sessions`} icon={Wallet} tone="green" />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader
            title="Requests awaiting review"
            description="Approve or reject with a clear reason. Eligibility is re-checked on approval."
            action={
              <Link to="/owner/bookings" className="text-xs font-semibold text-navy-700 hover:underline">
                View all
              </Link>
            }
          />
          {pending.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No pending requests"
              description="New booking requests will appear here with the requester's purpose and eligibility status."
              action={
                <Link to="/owner/resources" className={buttonStyles('outline', 'sm')}>
                  Manage listings
                </Link>
              }
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {pending.slice(0, 5).map(({ booking, resource, user }) => (
                <li key={booking.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                  <img src={resource?.image} alt={resource?.name ?? 'Resource'} className="h-10 w-10 rounded-lg border border-slate-200 object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{resource?.name}</p>
                    <p className="text-[11px] text-slate-500">
                      {user?.fullName} · {formatSlot(booking.startDate, booking.startTime, booking.endTime)}
                    </p>
                  </div>
                  <BookingStatusBadge status={booking.status} />
                  <Link to="/owner/bookings" className="text-xs font-semibold text-navy-700 hover:underline">
                    Review
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader
              title="Handover queue"
              description="Check-ins, returns and confirmations."
              action={
                <Link to="/owner/handover" className="text-xs font-semibold text-navy-700 hover:underline">
                  Open
                </Link>
              }
            />
            {handover.length === 0 ? (
              <div className="px-5 py-6 text-xs text-slate-500">Nothing needs a handover right now.</div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {handover.slice(0, 4).map(({ booking, resource }) => (
                  <li key={booking.id} className="flex items-center gap-3 px-5 py-2.5">
                    <Clock className="h-4 w-4 shrink-0 text-slate-400" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-ink">{resource?.name}</p>
                      <p className="text-[10px] text-slate-500">{booking.startTime}–{booking.endTime}</p>
                    </div>
                    <BookingStatusBadge status={booking.status} />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Recent incidents"
              action={
                <Link to="/owner/incidents" className="text-xs font-semibold text-navy-700 hover:underline">
                  All
                </Link>
              }
            />
            {openIncidents.length === 0 ? (
              <div className="px-5 py-6 text-xs text-slate-500">No open incidents for your resources.</div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {openIncidents.slice(0, 3).map((incident) => (
                  <li key={incident.id} className="px-5 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-xs font-semibold text-ink">{incident.resourceName}</p>
                      <IncidentStatusBadge status={incident.status} />
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-500">{incident.summary}</p>
                    <p className="mt-1 text-[10px] text-slate-400">{timeAgo(incident.createdAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader
            title="Weekly demand"
            description="Bookings for your resources over the last eight weeks."
            action={
              <Link to="/owner/analytics" className="inline-flex items-center gap-1 text-xs font-semibold text-navy-700 hover:underline">
                Analytics <ArrowRight className="h-3 w-3" />
              </Link>
            }
          />
          <div className="p-5">
            <div className="flex h-40 items-end gap-2">
              {data.analytics.weeklyActivity.map((week) => (
                <div key={week.label} className="flex flex-1 flex-col items-center gap-1.5">
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className="w-full rounded-t-lg bg-navy-600/80 transition hover:bg-navy-700"
                      style={{ height: `${Math.max(6, (week.bookings / maxWeekly) * 100)}%` }}
                      title={`${week.bookings} bookings · ${week.hours} hours`}
                    />
                  </div>
                  <span className="text-[9px] text-slate-400">{week.label}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5 text-emerald-600" /> Utilisation {data.analytics.utilisation}%</span>
              <span className="flex items-center gap-1.5"><BarChart3 className="h-3.5 w-3.5 text-navy-600" /> {data.analytics.approvedRequests} approved</span>
              <span className="flex items-center gap-1.5"><CalendarClock className="h-3.5 w-3.5 text-amber-600" /> {data.analytics.pendingRequests} pending</span>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Top resources" description="By booking volume." />
          {data.analytics.topResources.length === 0 ? (
            <EmptyState icon={Boxes} title="No resources yet" description="Create your first listing to start tracking demand." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.analytics.topResources.map((resource) => (
                <li key={resource.name} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-ink">{resource.name}</p>
                    <p className="text-[10px] text-slate-500">{resource.hours} hours used</p>
                  </div>
                  <Badge tone="navy">{resource.bookings} bookings</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
