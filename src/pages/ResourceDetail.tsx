import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  AlertTriangle,
  ArrowLeft,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  Clock,
  Compass,
  FileText,
  GraduationCap,
  Info,
  ListChecks,
  Loader2,
  MapPin,
  ShieldCheck,
  Sparkles,
  UserRound,
  Wallet,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button, buttonStyles } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { ResourceCard } from '@/components/ResourceCard';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useLiveQuery } from '@/hooks/useLiveQuery';
import { getDb } from '@/lib/demoDb';
import {
  calculateCost,
  getBookedIntervals,
  getResourceById,
  isAvailableOn,
  listResources,
  toResourceWithMeta,
} from '@/services/resourceService';
import { createBooking, joinWaitlist } from '@/services/bookingService';
import { evaluateEligibility, listRequirements } from '@/services/eligibilityService';
import { BookingConflictError, ServiceError, getProfile } from '@/services/core';
import { CATEGORY_IMAGES, type Resource } from '@/types';
import {
  bookingHours,
  formatSlot,
  isPastDate,
  minutesToTime,
  shortWeekday,
  timeToMinutes,
  todayISO,
} from '@/utils/date';
import { formatCurrency, formatDate, truncate } from '@/utils/format';

type FormValues = {
  startDate: string;
  startTime: string;
  endTime: string;
  purpose: string;
};

function buildSchema(resource: Resource) {
  return z
    .object({
      startDate: z.string().min(1, 'Select a booking date.'),
      startTime: z.string().min(1, 'Select a start time.'),
      endTime: z.string().min(1, 'Select an end time.'),
      purpose: z.string().min(15, 'Describe the purpose in at least 15 characters.'),
    })
    .superRefine((values, ctx) => {
      if (isPastDate(values.startDate)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['startDate'], message: 'Date cannot be in the past.' });
        return;
      }
      if (!isAvailableOn(resource, values.startDate)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['startDate'],
          message: 'The resource is not available on this date.',
        });
        return;
      }
      if (timeToMinutes(values.startTime) >= timeToMinutes(values.endTime)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endTime'], message: 'End time must be after start time.' });
        return;
      }
      if (
        timeToMinutes(values.startTime) < timeToMinutes(resource.openTime) ||
        timeToMinutes(values.endTime) > timeToMinutes(resource.closeTime)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['startTime'],
          message: `Choose a time between ${resource.openTime} and ${resource.closeTime}.`,
        });
        return;
      }
      if (bookingHours(values.startTime, values.endTime) > resource.maxBookingHours) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['endTime'],
          message: `Maximum ${resource.maxBookingHours} hours for this resource.`,
        });
      }
    });
}

export function ResourceDetail() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const data = useLiveQuery(() => {
    if (!id) return null;
    const resource = getResourceById(id);
    if (!resource) return null;
    return {
      resource: toResourceWithMeta(resource),
      owner: getProfile(getDb(), resource.ownerId),
      customRequirements: listRequirements(resource.id),
      similar: listResources({ category: resource.category }).filter((r) => r.id !== resource.id).slice(0, 3),
    };
  }, [id]);

  const [created, setCreated] = useState<{ resourceName: string; slot: string; id: string } | null>(null);

  if (!data) {
    return (
      <div className="container-page py-20">
        <Card className="mx-auto max-w-lg p-10 text-center">
          <Compass className="mx-auto h-10 w-10 text-slate-300" />
          <h1 className="mt-4 text-lg font-semibold text-ink">Resource not found</h1>
          <p className="mt-2 text-sm text-slate-500">
            This listing may have been removed or deactivated. Browse the marketplace for alternatives.
          </p>
          <Link to="/explore" className={buttonStyles('primary', 'md', 'mt-6')}>
            <ArrowLeft className="h-4 w-4" /> Back to explore
          </Link>
        </Card>
      </div>
    );
  }

  const { resource, owner, customRequirements, similar } = data;

  return (
    <div className="bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="container-page py-4">
          <Link to="/explore" className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-navy-700">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to resources
          </Link>
        </div>
      </div>

      <div className="container-page py-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_24rem]">
          <div className="min-w-0 space-y-6">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
              <div className="relative">
                <img
                  src={resource.image || CATEGORY_IMAGES[resource.category]}
                  alt={resource.name}
                  className="h-64 w-full object-cover sm:h-80"
                  onError={(event) => {
                    event.currentTarget.src = CATEGORY_IMAGES[resource.category] || '/images/other.svg';
                  }}
                />
                <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                  <Badge tone="navy" className="bg-white/95 backdrop-blur">
                    {resource.category}
                  </Badge>
                  <Badge tone={resource.active ? 'green' : 'slate'} className="bg-white/95 backdrop-blur" dot>
                    {resource.active ? 'Active listing' : 'Inactive'}
                  </Badge>
                  {resource.supervisionRequired ? (
                    <Badge tone="sky" className="bg-white/95 backdrop-blur">
                      Supervised
                    </Badge>
                  ) : null}
                </div>
              </div>
              <div className="p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
                      {resource.name}
                    </h1>
                    <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="h-4 w-4 text-navy-500" /> {resource.location}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <UserRound className="h-4 w-4 text-navy-500" /> {resource.institutionName}
                      </span>
                    </p>
                  </div>
                  <div className="rounded-xl bg-navy-50 px-4 py-3 text-right">
                    <p className="text-lg font-semibold text-navy-900">
                      {formatCurrency(resource.hourlyRate)}
                      {resource.hourlyRate > 0 ? <span className="text-xs font-medium text-navy-600">/hour</span> : null}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Daily cap: {formatCurrency(resource.dailyRate)}
                    </p>
                  </div>
                </div>

                <p className="mt-5 text-sm leading-7 text-slate-600">{resource.description}</p>

                <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    { icon: Clock, label: 'Max duration', value: `${resource.maxBookingHours} hours` },
                    { icon: Wallet, label: 'Security deposit', value: formatCurrency(resource.securityDeposit) },
                    { icon: CalendarDays, label: 'Availability', value: `${shortWeekday(resource.availableDays[0] ?? 1)} – ${shortWeekday(resource.availableDays[resource.availableDays.length - 1] ?? 6)}` },
                    { icon: ShieldCheck, label: 'Supervision', value: resource.supervisionRequired ? 'Required' : 'Not required' },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                      <item.icon className="h-4 w-4 text-navy-600" />
                      <p className="mt-2 text-[11px] font-medium text-slate-500">{item.label}</p>
                      <p className="text-sm font-semibold text-ink">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <Card className="p-6">
              <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
                <ShieldCheck className="h-5 w-5 text-navy-600" /> Eligibility & requirements
              </h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Required qualifications</p>
                  {resource.requiredQualifications.length === 0 ? (
                    <p className="mt-1.5 text-sm text-slate-500">None specified.</p>
                  ) : (
                    <ul className="mt-2 space-y-1.5">
                      {resource.requiredQualifications.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
                          <GraduationCap className="mt-0.5 h-4 w-4 shrink-0 text-navy-500" /> {item}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Required training</p>
                  {resource.requiredTraining.length === 0 ? (
                    <p className="mt-1.5 text-sm text-slate-500">None specified.</p>
                  ) : (
                    <ul className="mt-2 space-y-1.5">
                      {resource.requiredTraining.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
                          <ListChecks className="mt-0.5 h-4 w-4 shrink-0 text-navy-500" /> {item}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              {customRequirements.length > 0 ? (
                <div className="mt-5 rounded-xl border border-amber-100 bg-amber-50/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                    Owner & institution requirements
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {customRequirements.map((requirement) => (
                      <li key={requirement.id} className="flex items-start gap-2 text-sm text-amber-800">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {requirement.label}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {resource.eligibilityNotes ? (
                <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-600">
                  <Info className="mr-1.5 inline h-4 w-4 text-navy-500" />
                  {resource.eligibilityNotes}
                </p>
              ) : null}
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
              <Card className="p-6">
                <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
                  <FileText className="h-5 w-5 text-navy-600" /> Usage instructions
                </h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">{resource.usageInstructions || 'No specific instructions provided.'}</p>
              </Card>
              <Card className="p-6">
                <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
                  <CalendarCheck className="h-5 w-5 text-navy-600" /> Booking conditions
                </h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">{resource.bookingConditions || 'Standard booking conditions apply.'}</p>
                <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-500">
                  <strong className="font-semibold text-slate-700">Cancellation:</strong> {resource.cancellationPolicy}
                </p>
              </Card>
            </div>

            <Card className="p-6">
              <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
                <CalendarDays className="h-5 w-5 text-navy-600" /> Availability schedule
              </h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                  <span
                    key={day}
                    className={
                      resource.availableDays.includes(day)
                        ? 'rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700'
                        : 'rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-400'
                    }
                  >
                    {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day]}
                  </span>
                ))}
              </div>
              <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                <p className="rounded-xl border border-slate-100 p-3">
                  <span className="text-xs font-medium text-slate-400">Daily hours</span>
                  <br />
                  {resource.openTime} – {resource.closeTime}
                </p>
                <p className="rounded-xl border border-slate-100 p-3">
                  <span className="text-xs font-medium text-slate-400">Availability window</span>
                  <br />
                  {formatDate(resource.availableFrom)} – {formatDate(resource.availableTo)}
                </p>
              </div>
              {resource.blackoutDates.length > 0 ? (
                <p className="mt-3 text-xs text-slate-500">
                  Blocked dates: {resource.blackoutDates.map((d) => formatDate(d)).join(', ')}
                </p>
              ) : null}
            </Card>

            <Card className="p-6">
              <h2 className="text-base font-semibold text-ink">Listed by</h2>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-navy-900 text-sm font-semibold text-white">
                  {(owner?.fullName ?? resource.institutionName).slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink">{owner?.fullName ?? 'Institution owner'}</p>
                  <p className="text-xs text-slate-500">
                    {resource.institutionName}
                    {owner?.verified ? ' · Verified owner' : ' · Verification pending'}
                  </p>
                </div>
                {owner?.verified ? <Badge tone="green" className="ml-auto"><CheckCircle2 className="h-3 w-3" /> Verified</Badge> : null}
              </div>
            </Card>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <BookingPanel
              resource={resource}
              onCreated={(booking) => setCreated(booking)}
            />
          </aside>
        </div>

        {similar.length > 0 ? (
          <div className="mt-12">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-navy-500">Similar resources</p>
                <h2 className="mt-1 text-xl font-semibold text-ink">You may also need</h2>
              </div>
              <Link to={`/explore?category=${encodeURIComponent(resource.category)}`} className={buttonStyles('outline', 'sm')}>
                View category
              </Link>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {similar.map((item) => (
                <ResourceCard key={item.id} resource={item} />
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <Modal
        open={Boolean(created)}
        onClose={() => setCreated(null)}
        title="Booking request submitted"
        description="The resource owner has been notified and will review your request."
        footer={
          <>
            <Button variant="outline" onClick={() => setCreated(null)}>
              Close
            </Button>
            <Button
              onClick={() => {
                setCreated(null);
                navigate('/dashboard/bookings');
              }}
            >
              View my bookings
            </Button>
          </>
        }
      >
        {created ? (
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <p className="mt-4 text-sm font-semibold text-ink">{created.resourceName}</p>
            <p className="mt-1 text-sm text-slate-500">{created.slot}</p>
            <p className="mt-4 inline-block rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">
              Booking reference: {created.id.slice(0, 14)}
            </p>
            <p className="mt-4 text-xs leading-relaxed text-slate-500">
              You will receive an in-app notification when the owner approves or rejects this request.
            </p>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

function BookingPanel({
  resource,
  onCreated,
}: {
  resource: ReturnType<typeof toResourceWithMeta>;
  onCreated: (booking: { resourceName: string; slot: string; id: string }) => void;
}) {
  const { profile } = useAuth();
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [conflict, setConflict] = useState('');
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [waitlistLoading, setWaitlistLoading] = useState(false);
  const [pendingValues, setPendingValues] = useState<FormValues | null>(null);

  const schema = useMemo(() => buildSchema(resource), [resource]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      startDate: todayISO(),
      startTime: resource.openTime,
      endTime: minutesToTime(Math.min(timeToMinutes(resource.closeTime), timeToMinutes(resource.openTime) + 120)),
      purpose: '',
    },
  });

  const selectedDate = watch('startDate');
  const startTime = watch('startTime');
  const endTime = watch('endTime');

  const eligibility = useLiveQuery(
    () => (profile ? evaluateEligibility(profile.id, resource) : null),
    [profile?.id, resource],
  );

  const bookedIntervals = useLiveQuery(
    () => (selectedDate ? getBookedIntervals(resource.id, selectedDate) : []),
    [resource.id, selectedDate],
  );

  const hours = timeToMinutes(endTime) > timeToMinutes(startTime) ? bookingHours(startTime, endTime) : 0;
  const cost = calculateCost(resource, hours);

  async function onSubmit(values: FormValues) {
    if (!profile) return;
    setSubmitting(true);
    try {
      const booking = createBooking(profile.id, {
        resourceId: resource.id,
        startDate: values.startDate,
        startTime: values.startTime,
        endTime: values.endTime,
        purpose: values.purpose,
      });
      toast.success('Booking request submitted', 'The owner will review your request shortly.');
      onCreated({
        resourceName: resource.name,
        slot: formatSlot(values.startDate, values.startTime, values.endTime),
        id: booking.id,
      });
    } catch (error) {
      if (error instanceof BookingConflictError) {
        setConflict(error.message);
        setPendingValues(values);
        setWaitlistOpen(true);
      } else if (error instanceof ServiceError && ['limit', 'available', 'disabled'].includes(error.code)) {
        setConflict(error.message);
        setPendingValues(values);
        if (error.code !== 'disabled') setWaitlistOpen(true);
        else toast.error('Cannot join waiting list', error.message);
      } else {
        toast.error('Could not submit booking', error instanceof Error ? error.message : 'Unknown error.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleJoinWaitlist() {
    if (!profile || !pendingValues) return;
    setWaitlistLoading(true);
    try {
      joinWaitlist(profile.id, {
        resourceId: resource.id,
        startDate: pendingValues.startDate,
        startTime: pendingValues.startTime,
        endTime: pendingValues.endTime,
        purpose: pendingValues.purpose,
      });
      setWaitlistOpen(false);
      toast.success('Added to waiting list', 'You will be notified when a matching slot becomes available.');
    } catch (error) {
      toast.error('Could not join waiting list', error instanceof Error ? error.message : 'Unknown error.');
    } finally {
      setWaitlistLoading(false);
    }
  }

  const eligible = eligibility?.status === 'eligible';

  return (
    <>
      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 bg-navy-900 px-5 py-4 text-white">
          <p className="text-xs font-medium uppercase tracking-wider text-navy-300">Request a booking</p>
          <div className="mt-1 flex items-end justify-between">
            <p className="text-xl font-semibold">
              {formatCurrency(resource.hourlyRate)}
              {resource.hourlyRate > 0 ? <span className="text-xs font-normal text-navy-300">/hour</span> : null}
            </p>
            <p className="text-[11px] text-navy-300">Deposit {formatCurrency(resource.securityDeposit)}</p>
          </div>
        </div>

        <div className="p-5">
          {!profile ? (
            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-slate-600">
                Sign in to check your eligibility and request this resource.
              </p>
              <Link
                to={`/login?redirect=${encodeURIComponent(`/resources/${resource.id}`)}`}
                className={buttonStyles('primary', 'md', 'w-full')}
              >
                Sign in to book
              </Link>
              <Link to="/signup" className={buttonStyles('outline', 'md', 'w-full')}>
                Create an account
              </Link>
              <div className="rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-500">
                Demo user: <strong>user@spacexchange.demo</strong> / User@123
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {eligibility ? (
                <div
                  className={
                    eligibility.status === 'eligible'
                      ? 'rounded-xl border border-emerald-100 bg-emerald-50/70 p-3'
                      : eligibility.status === 'pending'
                        ? 'rounded-xl border border-amber-100 bg-amber-50/70 p-3'
                        : 'rounded-xl border border-rose-100 bg-rose-50/70 p-3'
                  }
                >
                  <div className="flex items-center gap-2">
                    {eligibility.status === 'eligible' ? (
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <AlertTriangle className={eligibility.status === 'pending' ? 'h-4 w-4 text-amber-600' : 'h-4 w-4 text-rose-600'} />
                    )}
                    <p className="text-xs font-semibold text-ink">
                      {eligibility.status === 'eligible'
                        ? 'You are eligible to book'
                        : eligibility.status === 'pending'
                          ? 'Eligibility verification pending'
                          : 'Not currently eligible'}
                    </p>
                  </div>
                  {eligibility.status !== 'eligible' ? (
                    <>
                      <ul className="mt-2 space-y-1 pl-6 text-[11px] leading-relaxed text-slate-600">
                        {eligibility.reasons.slice(0, 3).map((reason) => (
                          <li key={reason} className="list-disc">{reason}</li>
                        ))}
                      </ul>
                      <Link to="/dashboard/eligibility" className="mt-2 inline-block text-[11px] font-semibold text-navy-700 underline">
                        Manage eligibility documents
                      </Link>
                    </>
                  ) : null}
                </div>
              ) : null}

              <div>
                <label className="label-base">Booking date</label>
                <input type="date" min={todayISO()} className="input-base" {...register('startDate')} />
                {errors.startDate ? <p className="mt-1 text-xs text-rose-600">{errors.startDate.message}</p> : null}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-base">Start</label>
                  <input
                    type="time"
                    min={resource.openTime}
                    max={resource.closeTime}
                    className="input-base"
                    {...register('startTime')}
                  />
                  {errors.startTime ? <p className="mt-1 text-xs text-rose-600">{errors.startTime.message}</p> : null}
                </div>
                <div>
                  <label className="label-base">End</label>
                  <input
                    type="time"
                    min={resource.openTime}
                    max={resource.closeTime}
                    className="input-base"
                    {...register('endTime')}
                  />
                  {errors.endTime ? <p className="mt-1 text-xs text-rose-600">{errors.endTime.message}</p> : null}
                </div>
              </div>

              {bookedIntervals.length > 0 ? (
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[11px] font-semibold text-slate-500">Already booked on this date</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {bookedIntervals.map((interval) => (
                      <Badge key={interval.bookingId} tone="rose">
                        {interval.startTime}–{interval.endTime}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}

              <div>
                <label className="label-base">Purpose of use</label>
                <textarea
                  className="input-base min-h-[84px] resize-y"
                  placeholder="Explain what you will use this resource for, the project and the expected group size…"
                  {...register('purpose')}
                />
                {errors.purpose ? <p className="mt-1 text-xs text-rose-600">{errors.purpose.message}</p> : null}
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs text-slate-600">
                <div className="flex items-center justify-between">
                  <span>Duration</span>
                  <span className="font-semibold text-ink">{hours > 0 ? `${hours} hour(s)` : '—'}</span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span>Estimated usage cost</span>
                  <span className="font-semibold text-ink">{formatCurrency(cost)}</span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span>Refundable deposit</span>
                  <span className="font-semibold text-ink">{formatCurrency(resource.securityDeposit)}</span>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                loading={submitting}
                disabled={!eligible}
                icon={<CalendarCheck className="h-5 w-5" />}
              >
                Request booking
              </Button>
              {!eligible ? (
                <p className="text-center text-[11px] text-slate-500">
                  Booking is disabled until your eligibility is verified.
                </p>
              ) : (
                <p className="text-center text-[11px] text-slate-500">
                  Requests are reviewed by the owner. No payment is taken in this demo.
                </p>
              )}
            </form>
          )}
        </div>
      </Card>

      <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
        <p className="flex items-center gap-2 text-xs font-semibold text-amber-800">
          <Sparkles className="h-4 w-4" /> Fair allocation
        </p>
        <p className="mt-1.5 text-[11px] leading-relaxed text-amber-700">
          Bookings follow eligibility, active-booking limits, institutional priority, previous usage
          and request time. If the slot is taken, join the transparent waiting list.
        </p>
      </div>

      <Modal
        open={waitlistOpen}
        onClose={() => setWaitlistOpen(false)}
        title="This slot is not available"
        description="You can join the waiting list instead of submitting a conflicting booking."
        footer={
          <>
            <Button variant="outline" onClick={() => setWaitlistOpen(false)} disabled={waitlistLoading}>
              Cancel
            </Button>
            <Button onClick={handleJoinWaitlist} loading={waitlistLoading}>
              Join waiting list
            </Button>
          </>
        }
      >
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600">
            {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Clock className="h-5 w-5" />}
          </div>
          <div>
            <p className="text-sm leading-relaxed text-slate-600">{conflict}</p>
            {pendingValues ? (
              <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">
                {formatSlot(pendingValues.startDate, pendingValues.startTime, pendingValues.endTime)}
              </p>
            ) : null}
            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              Waiting-list order is visible to managers. You will receive a notification if the slot
              becomes available, but you still need owner approval.
            </p>
          </div>
        </div>
      </Modal>
    </>
  );
}
