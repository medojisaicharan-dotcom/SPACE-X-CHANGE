import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FileWarning,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { buttonStyles } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { BookingStatusBadge, IncidentStatusBadge, QualificationStatusBadge } from '@/components/ui/StatusBadge';
import { useAuth } from '@/contexts/AuthContext';
import { useLiveQuery } from '@/hooks/useLiveQuery';
import { getAdminAnalytics } from '@/services/analyticsService';
import { listAllBookings } from '@/services/bookingService';
import { listAllIncidents } from '@/services/incidentService';
import { listAllQualifications } from '@/services/eligibilityService';
import { listInstitutions } from '@/services/adminService';
import { formatSlot } from '@/utils/date';
import { timeAgo } from '@/utils/format';

export function AdminDashboard() {
  const { profile } = useAuth();
  const data = useLiveQuery(() => {
    const analytics = getAdminAnalytics();
    const bookings = listAllBookings();
    const incidents = listAllIncidents();
    const qualifications = listAllQualifications();
    const institutions = listInstitutions();
    return {
      analytics,
      pendingBookings: bookings.filter((view) => view.booking.status === 'pending').slice(0, 5),
      openIncidents: incidents.filter((incident) => ['reported', 'under_review'].includes(incident.status)).slice(0, 4),
      pendingEvidence: qualifications.filter((qualification) => qualification.status === 'pending').slice(0, 4),
      unverifiedInstitutions: institutions.filter((institution) => !institution.verified).slice(0, 4),
    };
  }, [profile?.id]);

  if (!profile || !data) return null;

  const { stats, monthly, topInstitutions } = data.analytics;
  const maxMonthly = Math.max(1, ...monthly.map((month) => month.bookings));

  return (
    <div>
      <PageHeader
        eyebrow="Administration"
        title={`Welcome, ${profile.fullName.split(' ')[0]}`}
        description="Oversee users, listings, bookings and platform integrity. Destructive actions are recorded in the audit trail."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to="/admin/bookings" className={buttonStyles('outline', 'md')}>
              <ClipboardList className="h-4 w-4" /> Booking queue
            </Link>
            <Link to="/admin/users" className={buttonStyles('primary', 'md')}>
              <Users className="h-4 w-4" /> Verify users
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Members" value={stats.totalUsers} hint={`${stats.suspendedUsers} suspended`} icon={Users} tone="navy" />
        <StatCard label="Pending bookings" value={stats.pendingBookings} hint={`${stats.overdueBookings} overdue`} icon={CalendarClock} tone="amber" />
        <StatCard label="Open incidents" value={stats.openIncidents} hint="Need manager review" icon={FileWarning} tone="rose" />
        <StatCard label="Evidence to review" value={stats.pendingQualifications} hint={`${stats.pendingVerifications} account(s) unverified`} icon={ShieldCheck} tone="sky" />
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MiniStat label="Institutions" value={`${stats.totalInstitutions}`} sub={`${stats.pendingInstitutions} unverified`} />
        <MiniStat label="Resources" value={`${stats.activeResources}/${stats.totalResources}`} sub="Active listings" />
        <MiniStat label="Approved bookings" value={`${stats.approvedBookings}`} sub={`${stats.completedBookings} completed`} />
        <MiniStat label="Verified owners" value={`${stats.verifiedOwners}`} sub="Across all institutions" />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        <Card>
          <CardHeader title="Bookings and signups" description="Last six months across the platform." />
          <CardBody>
            <div className="mb-3 flex items-center gap-4 text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-navy-600" /> Bookings</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /> New members</span>
            </div>
            <div className="flex h-48 items-end gap-4">
              {monthly.map((month) => (
                <div key={month.label} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex h-full w-full items-end justify-center gap-1">
                    <div
                      className="w-3 rounded-t-md bg-navy-600/85"
                      style={{ height: `${Math.max(3, (month.bookings / maxMonthly) * 100)}%` }}
                      title={`${month.bookings} bookings`}
                    />
                    <div
                      className="w-3 rounded-t-md bg-emerald-500/80"
                      style={{ height: `${Math.max(3, (month.users / Math.max(1, maxMonthly)) * 100)}%` }}
                      title={`${month.users} new members`}
                    />
                  </div>
                  <span className="text-[9px] text-slate-400">{month.label}</span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Institution activity"
            description="Listings and booking demand."
            action={<Link to="/admin/institutions" className="text-xs font-semibold text-navy-700 hover:underline">Manage</Link>}
          />
          <div className="divide-y divide-slate-100">
            {topInstitutions.slice(0, 5).map((institution) => (
              <div key={institution.name} className="flex items-center justify-between px-5 py-2.5 text-xs">
                <span className="flex items-center gap-2 text-slate-600">
                  <Building2 className="h-3.5 w-3.5 text-slate-400" /> {institution.name}
                </span>
                <span className="text-slate-400">
                  {institution.resources} listings · {institution.bookings} bookings
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Bookings awaiting attention"
            description="Oldest pending requests first."
            action={<Link to="/admin/bookings" className="text-xs font-semibold text-navy-700 hover:underline">View all</Link>}
          />
          {data.pendingBookings.length === 0 ? (
            <EmptyLine icon={CheckCircle2} text="No pending bookings. Everything is triaged." />
          ) : (
            <div className="divide-y divide-slate-100">
              {data.pendingBookings.map((view) => (
                <Link key={view.booking.id} to="/admin/bookings" className="flex items-center justify-between gap-2 px-5 py-3 transition hover:bg-slate-50">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-ink">{view.resource?.name}</p>
                    <p className="text-[11px] text-slate-500">
                      {view.user?.fullName} · {formatSlot(view.booking.startDate, view.booking.startTime, view.booking.endTime)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <BookingStatusBadge status={view.booking.status} />
                    <ArrowRight className="h-3.5 w-3.5 text-slate-300" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Risk and review queue"
            description="Incidents and eligibility evidence."
            action={<Link to="/admin/incidents" className="text-xs font-semibold text-navy-700 hover:underline">Incidents</Link>}
          />
          <div className="divide-y divide-slate-100">
            {data.openIncidents.map((incident) => (
              <Link key={incident.id} to="/admin/incidents" className="flex items-center justify-between gap-2 px-5 py-3 transition hover:bg-slate-50">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-ink">{incident.resourceName}</p>
                  <p className="text-[11px] text-slate-500">{incident.summary}</p>
                </div>
                <IncidentStatusBadge status={incident.status} />
              </Link>
            ))}
            {data.pendingEvidence.map((qualification) => (
              <Link key={qualification.id} to="/admin/users" className="flex items-center justify-between gap-2 px-5 py-3 transition hover:bg-slate-50">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-ink">{qualification.name}</p>
                  <p className="text-[11px] text-slate-500">Uploaded {timeAgo(qualification.uploadedAt)} · {qualification.documentName}</p>
                </div>
                <QualificationStatusBadge status={qualification.status} />
              </Link>
            ))}
            {data.openIncidents.length === 0 && data.pendingEvidence.length === 0 ? (
              <EmptyLine icon={ShieldCheck} text="No open incidents or evidence waiting for review." />
            ) : null}
          </div>
        </Card>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-500">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <span>Administrators cannot approve their own bookings or change their own role.</span>
        <Link to="/admin/audit" className="ml-auto inline-flex items-center gap-1 font-semibold text-navy-700 hover:underline">
          Open audit history <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

function MiniStat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <Card className="p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-semibold text-ink">{value}</p>
      <p className="text-[11px] text-slate-500">{sub}</p>
    </Card>
  );
}

function EmptyLine({ icon: Icon, text }: { icon: typeof CheckCircle2; text: string }) {
  return (
    <div className="flex items-center gap-2 px-5 py-6 text-xs text-slate-500">
      <Icon className="h-4 w-4 text-emerald-500" /> {text}
    </div>
  );
}
