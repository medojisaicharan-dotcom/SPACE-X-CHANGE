import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  Clock,
  Compass,
  ShieldCheck,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { buttonStyles } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { ResourceCard } from '@/components/ResourceCard';
import { StatCard } from '@/components/ui/StatCard';
import { BookingStatusBadge } from '@/components/ui/StatusBadge';
import { useAuth } from '@/contexts/AuthContext';
import { useLiveQuery } from '@/hooks/useLiveQuery';
import { getUserStats } from '@/services/analyticsService';
import { listBookingsForUser } from '@/services/bookingService';
import { getRecommendations } from '@/services/aiService';
import { listQualifications } from '@/services/eligibilityService';
import { listNotifications } from '@/services/notificationService';
import { formatCurrency, timeAgo } from '@/utils/format';
import { formatSlot, todayISO } from '@/utils/date';
import { IS_SUPABASE_MODE } from '@/lib/config';

export function Dashboard() {
  const { profile } = useAuth();
  const data = useLiveQuery(() => {
    if (!profile) return null;
    return {
      stats: getUserStats(profile.id),
      bookings: listBookingsForUser(profile.id),
      recommendations: getRecommendations(profile.id, 3),
      qualifications: listQualifications(profile.id),
      notifications: listNotifications(profile.id).slice(0, 5),
    };
  }, [profile?.id]);

  if (!profile || !data) return null;

  const upcoming = data.bookings
    .filter((view) => ['approved', 'checked_in', 'overdue'].includes(view.booking.status))
    .filter((view) => view.booking.startDate >= todayISO())
    .sort((a, b) => `${a.booking.startDate}${a.booking.startTime}`.localeCompare(`${b.booking.startDate}${b.booking.startTime}`));

  const pending = data.bookings.filter((view) => view.booking.status === 'pending');
  const verifiedCount = data.qualifications.filter((q) => q.status === 'verified').length;

  return (
    <div>
      <PageHeader
        eyebrow="My workspace"
        title={`Welcome back, ${profile.fullName.split(' ')[0]}`}
        description="Track your bookings, eligibility and upcoming handovers in one place."
        actions={
          <>
            <Link to="/explore" className={buttonStyles('primary', 'md')}>
              <Compass className="h-4 w-4" /> Find a resource
            </Link>
            <Link to="/dashboard/bookings" className={buttonStyles('outline', 'md')}>
              <CalendarDays className="h-4 w-4" /> My bookings
            </Link>
          </>
        }
      />

      {!profile.verified ? (
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">Your account is awaiting verification</p>
            <p className="mt-0.5 leading-relaxed">
              An institution manager must verify your account before you can book resources. You can
              still explore the catalogue and prepare eligibility evidence.
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active bookings" value={data.stats.activeBookings} hint={`${data.stats.pendingRequests} pending request(s)`} icon={CalendarCheck} tone="navy" />
        <StatCard label="Completed sessions" value={data.stats.completedBookings} hint={`${data.stats.overdue} overdue`} icon={ClipboardList} tone="green" />
        <StatCard label="Verified evidence" value={verifiedCount} hint={`${data.qualifications.filter((q) => q.status === 'pending').length} awaiting review`} icon={ShieldCheck} tone="purple" />
        <StatCard label="Recorded spend" value={formatCurrency(data.stats.totalSpent)} hint="Completed and returned bookings" icon={Wallet} tone="sky" />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        <Card>
          <CardHeader
            title="Upcoming and active"
            description="Approved sessions and check-ins that need your attention."
            action={
              <Link to="/dashboard/bookings" className="text-xs font-semibold text-navy-700 hover:underline">
                View all
              </Link>
            }
          />
          {upcoming.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="No upcoming sessions"
              description="Once an owner approves your request, the session will appear here with check-in controls."
              action={
                <Link to="/explore" className={buttonStyles('primary', 'sm')}>
                  Explore resources
                </Link>
              }
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {upcoming.slice(0, 4).map(({ booking, resource }) => (
                <li key={booking.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                  <img
                    src={resource?.image}
                    alt={resource?.name ?? 'Resource'}
                    className="h-11 w-11 rounded-xl border border-slate-200 object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{resource?.name ?? 'Resource'}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                      <Clock className="h-3 w-3" /> {formatSlot(booking.startDate, booking.startTime, booking.endTime)}
                    </p>
                  </div>
                  <BookingStatusBadge status={booking.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader
              title="Pending requests"
              description="Waiting for owner review."
              action={<Badge tone="amber">{pending.length}</Badge>}
            />
            {pending.length === 0 ? (
              <CardBody>
                <p className="text-xs text-slate-500">No pending requests right now.</p>
              </CardBody>
            ) : (
              <ul className="divide-y divide-slate-100">
                {pending.slice(0, 3).map(({ booking, resource }) => (
                  <li key={booking.id} className="px-5 py-3">
                    <p className="truncate text-sm font-medium text-ink">{resource?.name}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {formatSlot(booking.startDate, booking.startTime, booking.endTime)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Latest updates"
              action={
                <Link to="/notifications" className="text-xs font-semibold text-navy-700 hover:underline">
                  All
                </Link>
              }
            />
            {data.notifications.length === 0 ? (
              <CardBody>
                <p className="text-xs text-slate-500">You have no notifications yet.</p>
              </CardBody>
            ) : (
              <ul className="divide-y divide-slate-100">
                {data.notifications.slice(0, 4).map((notification) => (
                  <li key={notification.id} className="px-5 py-2.5">
                    <p className="text-xs font-semibold text-ink">{notification.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-500">{notification.message}</p>
                    <p className="mt-1 text-[10px] text-slate-400">{timeAgo(notification.createdAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Recommended for you"
            description="Based on your bookings, searches and current eligibility."
            action={
              <Link to="/explore" className="inline-flex items-center gap-1 text-xs font-semibold text-navy-700 hover:underline">
                Explore all <ArrowRight className="h-3 w-3" />
              </Link>
            }
          />
          <CardBody>
            {data.recommendations.length === 0 ? (
              <EmptyState
                icon={Sparkles}
                title="Recommendations are warming up"
                description="Book or search for resources to improve personalised suggestions."
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {data.recommendations.map((result) => (
                  <ResourceCard key={result.resource.id} resource={result.resource} />
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Quick actions" />
          <CardBody className="space-y-2">
            <Link to="/dashboard/eligibility" className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm font-medium text-slate-700 transition hover:border-navy-300 hover:bg-navy-50/50">
              <ShieldCheck className="h-4 w-4 text-navy-600" /> Upload eligibility evidence
            </Link>
            <Link to="/dashboard/incidents" className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm font-medium text-slate-700 transition hover:border-navy-300 hover:bg-navy-50/50">
              <AlertTriangle className="h-4 w-4 text-amber-600" /> Report an incident
            </Link>
            <Link to="/dashboard/activity" className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm font-medium text-slate-700 transition hover:border-navy-300 hover:bg-navy-50/50">
              <ClipboardList className="h-4 w-4 text-slate-500" /> Review my activity
            </Link>
            <Link to="/account" className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm font-medium text-slate-700 transition hover:border-navy-300 hover:bg-navy-50/50">
              <ShieldCheck className="h-4 w-4 text-emerald-600" /> Account and institution
            </Link>
            <div className="rounded-xl bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-500">
              {IS_SUPABASE_MODE
                ? 'Live mode: bookings, approvals and condition records are stored in Supabase Postgres.'
                : 'Demo mode: bookings, approvals and condition records are stored locally in this browser.'}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
