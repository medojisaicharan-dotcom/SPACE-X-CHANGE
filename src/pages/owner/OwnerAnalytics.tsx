import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  BarChart3,
  Boxes,
  CheckCircle2,
  ClipboardList,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { buttonStyles } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { useAuth } from '@/contexts/AuthContext';
import { useLiveQuery } from '@/hooks/useLiveQuery';
import { getOwnerAnalytics } from '@/services/analyticsService';
import { formatCurrency } from '@/utils/format';
import { cn } from '@/utils/format';

const TONES = ['bg-navy-600', 'bg-emerald-500', 'bg-amber-500', 'bg-sky-500', 'bg-purple-500', 'bg-rose-500'];

export function OwnerAnalytics() {
  const { profile } = useAuth();
  const analytics = useLiveQuery(
    () => (profile ? getOwnerAnalytics(profile.id) : null),
    [profile?.id],
  );

  if (!profile || !analytics) return null;

  const maxWeekly = Math.max(1, ...analytics.weeklyActivity.map((week) => week.bookings));
  const totalStatus = Math.max(1, analytics.statusDistribution.reduce((sum, item) => sum + item.value, 0));

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Understand demand, utilisation and return performance across your resources."
        actions={
          <Link to="/owner/resources" className={buttonStyles('outline', 'md')}>
            <Boxes className="h-4 w-4" /> Manage listings
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total bookings" value={analytics.statusDistribution.reduce((sum, item) => sum + item.value, 0)} hint={`${analytics.pendingRequests} pending`} icon={ClipboardList} tone="navy" />
        <StatCard label="Completed" value={analytics.completedBookings} hint={`${analytics.overdueReturns} overdue`} icon={CheckCircle2} tone="green" />
        <StatCard label="Utilisation" value={`${analytics.utilisation}%`} hint="Completed hours vs published hours" icon={TrendingUp} tone="sky" />
        <StatCard label="Recorded revenue" value={formatCurrency(analytics.revenue)} hint="Completed sessions only" icon={Wallet} tone="green" />
      </div>

      {analytics.openIncidents > 0 || analytics.overdueReturns > 0 ? (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          <AlertTriangle className="h-4 w-4" />
          {analytics.openIncidents} open incident(s) and {analytics.overdueReturns} overdue return(s) need attention.
          <Link to="/owner/handover" className="ml-auto font-semibold underline">
            Open handover queue
          </Link>
        </div>
      ) : null}

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader title="Booking volume" description="Last eight weeks across all your resources." />
          <CardBody>
            <div className="flex h-52 items-end gap-2">
              {analytics.weeklyActivity.map((week) => (
                <div key={week.label} className="flex flex-1 flex-col items-center gap-1.5">
                  <span className="text-[10px] font-semibold text-slate-600">{week.bookings || ''}</span>
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className="w-full rounded-t-lg bg-navy-600/85 transition hover:bg-navy-700"
                      style={{ height: `${Math.max(4, (week.bookings / maxWeekly) * 100)}%` }}
                      title={`${week.bookings} bookings · ${week.hours} hours`}
                    />
                  </div>
                  <span className="text-[9px] text-slate-400">{week.label}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-4 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5"><BarChart3 className="h-3.5 w-3.5 text-navy-600" /> Bars show bookings</span>
              <span>Hover for hours</span>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Status distribution" description="All requests across your listings." />
          <CardBody>
            {analytics.statusDistribution.length === 0 ? (
              <EmptyState icon={BarChart3} title="No data yet" description="Requests will be analysed once bookings arrive." />
            ) : (
              <div className="space-y-3">
                {analytics.statusDistribution
                  .slice()
                  .sort((a, b) => b.value - a.value)
                  .map((item, index) => (
                    <div key={item.name}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-600">{item.name}</span>
                        <span className="font-semibold text-ink">{item.value}</span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={cn('h-full rounded-full', TONES[index % TONES.length])}
                          style={{ width: `${(item.value / totalStatus) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <Card className="mt-5">
        <CardHeader title="Resource performance" description="Completed hours and booking volume by listing." />
        {analytics.topResources.length === 0 ? (
          <EmptyState icon={Boxes} title="No resources yet" description="Create listings to unlock analytics." />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Resource</th>
                  <th>Bookings</th>
                  <th>Hours used</th>
                  <th>Share of demand</th>
                </tr>
              </thead>
              <tbody>
                {analytics.topResources.map((resource) => {
                  const total = Math.max(1, analytics.topResources.reduce((sum, item) => sum + item.bookings, 0));
                  return (
                    <tr key={resource.name}>
                      <td className="font-medium text-ink">{resource.name}</td>
                      <td>{resource.bookings}</td>
                      <td>{resource.hours}h</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-32 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-navy-600" style={{ width: `${(resource.bookings / total) * 100}%` }} />
                          </div>
                          <span className="text-[11px] text-slate-400">{Math.round((resource.bookings / total) * 100)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="mt-5 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
        <Badge tone="slate">Utilisation is indicative</Badge>
        <span>Calculated from completed booking hours against published opening hours over four weeks.</span>
      </div>
    </div>
  );
}
