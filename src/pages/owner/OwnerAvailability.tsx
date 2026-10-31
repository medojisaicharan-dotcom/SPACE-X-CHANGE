import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays,
  CalendarX2,
  Clock,
  Info,
  MapPin,
  Pencil,
  Sun,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { buttonStyles } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Select } from '@/components/ui/Select';
import { useAuth } from '@/contexts/AuthContext';
import { useLiveQuery } from '@/hooks/useLiveQuery';
import {
  getBookedIntervals,
  getOwnerResources,
  isAvailableOn,
  resourceAvailabilitySummary,
} from '@/services/resourceService';
import { addDaysISO, shortWeekday, todayISO } from '@/utils/date';
import { cn, formatDate } from '@/utils/format';

export function OwnerAvailability() {
  const { profile } = useAuth();
  const resources = useLiveQuery(
    () => (profile ? getOwnerResources(profile.id) : []),
    [profile?.id],
  );
  const [selectedId, setSelectedId] = useState('');

  useEffect(() => {
    if (!selectedId && resources.length > 0) setSelectedId(resources[0].id);
  }, [resources, selectedId]);

  const selected = resources.find((resource) => resource.id === selectedId) ?? resources[0];
  const summary = selected ? resourceAvailabilitySummary(selected) : null;

  const days = useMemo(() => {
    if (!selected) return [];
    return Array.from({ length: 14 }).map((_, index) => {
      const date = addDaysISO(todayISO(), index);
      return {
        date,
        available: isAvailableOn(selected, date),
        booked: getBookedIntervals(selected.id, date),
        weekday: shortWeekday(new Date(`${date}T00:00:00`).getDay()),
      };
    });
  }, [selected]);

  if (!profile) return null;

  return (
    <div>
      <PageHeader
        title="Availability"
        description="A 14-day view of published availability for each of your resources."
        actions={
          selected ? (
            <Link to={`/owner/resources/${selected.id}/edit`} className={buttonStyles('outline', 'md')}>
              <Pencil className="h-4 w-4" /> Edit rules
            </Link>
          ) : undefined
        }
      />

      {resources.length === 0 ? (
        <Card>
          <EmptyState
            icon={CalendarX2}
            title="No resources to schedule"
            description="Create a listing first, then set its availability window and blackout dates."
            action={
              <Link to="/owner/resources/new" className={buttonStyles('primary', 'sm')}>
                Create listing
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
          <div className="space-y-4">
            <Card>
              <CardBody>
                <Select
                  label="Resource"
                  value={selected?.id ?? ''}
                  onChange={(event) => setSelectedId(event.target.value)}
                >
                  {resources.map((resource) => (
                    <option key={resource.id} value={resource.id}>
                      {resource.name}
                    </option>
                  ))}
                </Select>
              </CardBody>
            </Card>

            {selected && summary ? (
              <Card>
                <CardHeader title="Published rules" description={selected.institutionName} />
                <CardBody className="space-y-3 text-xs">
                  <div className="flex items-start gap-2">
                    <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-navy-500" />
                    <div>
                      <p className="font-semibold text-ink">Window</p>
                      <p className="text-slate-500">
                        {formatDate(`${summary.from}T00:00:00`)} → {formatDate(`${summary.to}T00:00:00`)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Clock className="mt-0.5 h-4 w-4 shrink-0 text-navy-500" />
                    <div>
                      <p className="font-semibold text-ink">Daily hours</p>
                      <p className="text-slate-500">
                        {summary.openTime}–{summary.closeTime} · max {selected.maxBookingHours}h
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Sun className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                    <div>
                      <p className="font-semibold text-ink">Days</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {summary.days.map((day) => (
                          <Badge key={day} tone="navy">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day]}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CalendarX2 className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                    <div>
                      <p className="font-semibold text-ink">Blackout dates</p>
                      <p className="text-slate-500">
                        {summary.blackoutDates.length === 0
                          ? 'None configured'
                          : summary.blackoutDates.slice(0, 6).join(', ')}
                        {summary.blackoutDates.length > 6 ? '…' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <p className="text-slate-500">{selected.location}</p>
                  </div>
                  <div
                    className={cn(
                      'rounded-xl p-3 text-[11px] leading-relaxed',
                      summary.availableToday ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600',
                    )}
                  >
                    {summary.availableToday
                      ? 'This resource is published as available today.'
                      : 'This resource is not available today according to the published rules.'}
                  </div>
                </CardBody>
              </Card>
            ) : null}
          </div>

          <Card>
            <CardHeader
              title="Next 14 days"
              description="Available windows and existing approved bookings. Times are local."
              action={<Badge tone="slate">{days.filter((day) => day.available).length} open days</Badge>}
            />
            <div className="grid gap-2 p-4 sm:grid-cols-2 xl:grid-cols-3">
              {days.map((day) => (
                <div
                  key={day.date}
                  className={cn(
                    'rounded-xl border p-3',
                    day.available ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-ink">
                      {day.weekday} · {formatDate(`${day.date}T00:00:00`)}
                    </p>
                    <Badge tone={day.available ? 'green' : 'slate'} dot>
                      {day.available ? 'Open' : 'Closed'}
                    </Badge>
                  </div>
                  <div className="mt-2 space-y-1">
                    {day.booked.length === 0 ? (
                      <p className="text-[11px] text-slate-400">
                        {day.available ? 'No confirmed bookings' : 'Not published'}
                      </p>
                    ) : (
                      day.booked.map((slot) => (
                        <div key={slot.bookingId} className="flex items-center justify-between rounded-lg bg-navy-50 px-2 py-1 text-[11px] text-navy-800">
                          <span>{slot.startTime}–{slot.endTime}</span>
                          <span className="text-[10px] text-navy-500">Booked</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-start gap-2 border-t border-slate-100 px-4 py-3 text-[11px] text-slate-500">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Blackout dates, weekday rules and daily hours are edited on the listing. Existing approved bookings
              are not removed when you shorten availability.
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
