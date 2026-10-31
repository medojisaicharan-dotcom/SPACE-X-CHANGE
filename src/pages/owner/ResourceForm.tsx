import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock,
  Info,
  Save,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Button, buttonStyles } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { ImageUploader } from '@/components/ImageUploader';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useLiveQuery } from '@/hooks/useLiveQuery';
import { canManageResource } from '@/services/core';
import { createResource, getResourceById, updateResource, type ResourceInput } from '@/services/resourceService';
import { listInstitutions } from '@/services/authService';
import { addDaysISO, shortWeekday, todayISO } from '@/utils/date';
import { CATEGORIES, CATEGORY_IMAGES, type Resource } from '@/types';
import { cn } from '@/utils/format';

const schema = z
  .object({
    name: z.string().min(4, 'Name must be at least 4 characters.').max(90),
    category: z.string().min(1, 'Select a category.'),
    description: z.string().min(30, 'Describe the resource in at least 30 characters.'),
    institutionId: z.string().min(1, 'Select an institution.'),
    location: z.string().min(3, 'Enter a location.'),
    availableFrom: z.string().min(1, 'Set a start date.'),
    availableTo: z.string().min(1, 'Set an end date.'),
    openTime: z.string().min(1, 'Set opening time.'),
    closeTime: z.string().min(1, 'Set closing time.'),
    hourlyRate: z.coerce.number().min(0, 'Cannot be negative.').max(100000),
    dailyRate: z.coerce.number().min(0, 'Cannot be negative.').max(500000),
    securityDeposit: z.coerce.number().min(0, 'Cannot be negative.').max(500000),
    maxBookingHours: z.coerce.number().min(1, 'At least 1 hour.').max(12, 'Maximum is 12 hours.'),
    availableDays: z.array(z.number()).min(1, 'Select at least one day.'),
    blackoutDates: z.string(),
    requiredQualifications: z.string(),
    requiredTraining: z.string(),
    supervisionRequired: z.boolean(),
    eligibilityNotes: z.string(),
    usageInstructions: z.string(),
    bookingConditions: z.string(),
    cancellationPolicy: z.string(),
    active: z.boolean(),
  })
  .refine((v) => v.availableFrom <= v.availableTo, {
    path: ['availableTo'],
    message: 'End date must be on or after the start date.',
  })
  .refine((v) => v.openTime < v.closeTime, {
    path: ['closeTime'],
    message: 'Closing time must be after opening time.',
  });

type FormValues = z.infer<typeof schema>;

const splitList = (value: string) =>
  value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);

const splitDates = (value: string) =>
  splitList(value).filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item));

function toDefaults(resource: Resource | undefined): FormValues {
  return {
    name: resource?.name ?? '',
    category: resource?.category ?? CATEGORIES[0],
    description: resource?.description ?? '',
    institutionId: resource?.institutionId ?? '',
    location: resource?.location ?? '',
    availableFrom: resource?.availableFrom ?? todayISO(),
    availableTo: resource?.availableTo ?? addDaysISO(todayISO(), 180),
    openTime: resource?.openTime ?? '09:00',
    closeTime: resource?.closeTime ?? '18:00',
    hourlyRate: resource?.hourlyRate ?? 0,
    dailyRate: resource?.dailyRate ?? 0,
    securityDeposit: resource?.securityDeposit ?? 0,
    maxBookingHours: resource?.maxBookingHours ?? 6,
    availableDays: resource?.availableDays ?? [1, 2, 3, 4, 5],
    blackoutDates: resource?.blackoutDates.join(', ') ?? '',
    requiredQualifications: resource?.requiredQualifications.join(', ') ?? '',
    requiredTraining: resource?.requiredTraining.join(', ') ?? '',
    supervisionRequired: resource?.supervisionRequired ?? false,
    eligibilityNotes: resource?.eligibilityNotes ?? '',
    usageInstructions: resource?.usageInstructions ?? '',
    bookingConditions: resource?.bookingConditions ?? '',
    cancellationPolicy: resource?.cancellationPolicy ?? '',
    active: resource?.active ?? true,
  };
}

export function ResourceForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();
  const { profile } = useAuth();
  const institutions = useLiveQuery(() => listInstitutions());
  const resource = useLiveQuery(() => (id ? getResourceById(id) : undefined), [id]);
  const [image, setImage] = useState<string>('');
  const [serverError, setServerError] = useState('');

  const allowed = useMemo(
    () => (!isEdit ? Boolean(profile) : canManageResource(profile, resource)),
    [isEdit, profile, resource],
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: toDefaults(resource),
  });

  useEffect(() => {
    reset(toDefaults(resource));
    setImage(resource?.image ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource?.id]);

  const days = watch('availableDays');
  const category = watch('category');
  const name = watch('name');

  if (isEdit && !resource) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm font-semibold text-ink">Resource not found</p>
        <Link to="/owner/resources" className={buttonStyles('primary', 'sm', 'mt-4')}>
          Back to listings
        </Link>
      </Card>
    );
  }

  if (isEdit && !allowed) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm font-semibold text-ink">You cannot edit this listing</p>
        <p className="mt-1 text-xs text-slate-500">Only the owner, institution manager or an administrator can edit it.</p>
        <Link to="/owner/resources" className={buttonStyles('outline', 'sm', 'mt-4')}>
          Back to listings
        </Link>
      </Card>
    );
  }

  function toggleDay(day: number) {
    const next = days.includes(day) ? days.filter((d) => d !== day) : [...days, day].sort();
    setValue('availableDays', next, { shouldValidate: true });
  }

  async function onSubmit(values: FormValues) {
    setServerError('');
    if (!profile) return;
    const payload: ResourceInput = {
      name: values.name,
      category: values.category,
      description: values.description,
      image,
      location: values.location,
      institutionId: values.institutionId,
      availableFrom: values.availableFrom,
      availableTo: values.availableTo,
      availableDays: values.availableDays,
      openTime: values.openTime,
      closeTime: values.closeTime,
      blackoutDates: splitDates(values.blackoutDates),
      hourlyRate: values.hourlyRate,
      dailyRate: values.dailyRate,
      securityDeposit: values.securityDeposit,
      requiredQualifications: splitList(values.requiredQualifications),
      requiredTraining: splitList(values.requiredTraining),
      supervisionRequired: values.supervisionRequired,
      eligibilityNotes: values.eligibilityNotes,
      usageInstructions: values.usageInstructions,
      bookingConditions: values.bookingConditions,
      maxBookingHours: values.maxBookingHours,
      cancellationPolicy: values.cancellationPolicy,
      active: values.active,
    };
    try {
      if (isEdit && resource) {
        updateResource(profile.id, resource.id, payload);
        toast.success('Listing updated', `${values.name} was saved.`);
      } else {
        createResource(profile.id, payload);
        toast.success('Listing created', `${values.name} is now part of your catalogue.`);
      }
      navigate('/owner/resources');
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'Could not save the listing.');
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Owner console"
        title={isEdit ? 'Edit listing' : 'Create a listing'}
        description="Accurate availability and eligibility details reduce rejections and keep sharing safe."
        actions={
          <Link to="/owner/resources" className={buttonStyles('outline', 'md')}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        }
      />

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-5 lg:grid-cols-[1.5fr_1fr]" noValidate>
        <div className="space-y-5">
          <Card>
            <CardHeader title="Basics" description="What are you sharing and where is it?" />
            <CardBody className="space-y-4">
              <Input label="Resource name" placeholder="e.g. Universal Testing Machine" requiredMark error={errors.name?.message} {...register('name')} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Select label="Category" requiredMark error={errors.category?.message} {...register('category')}>
                  {CATEGORIES.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
                <Select label="Institution" requiredMark error={errors.institutionId?.message} {...register('institutionId')}>
                  <option value="">Select an institution</option>
                  {institutions.map((institution) => (
                    <option key={institution.id} value={institution.id}>
                      {institution.name}
                    </option>
                  ))}
                </Select>
              </div>
              <Textarea
                label="Description"
                rows={4}
                placeholder="Describe the equipment, its capabilities, condition and ideal use cases. Minimum 30 characters."
                requiredMark
                error={errors.description?.message}
                {...register('description')}
              />
              <Input label="Location" placeholder="Building, room or campus" requiredMark error={errors.location?.message} {...register('location')} />
              <div>
                <ImageUploader
                  value={image ? [image] : []}
                  onChange={(images) => setImage(images[0] ?? '')}
                  max={1}
                  label="Cover image"
                  helper="Optional. If omitted, a category illustration is used."
                />
                {image ? null : (
                  <p className="mt-1 text-[11px] text-slate-400">
                    Category default: {CATEGORY_IMAGES[category]}
                  </p>
                )}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Availability" description="When can members book this resource?" />
            <CardBody className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label="Available from" type="date" requiredMark error={errors.availableFrom?.message} {...register('availableFrom')} />
                <Input label="Available until" type="date" requiredMark error={errors.availableTo?.message} {...register('availableTo')} />
                <Input label="Opening time" type="time" requiredMark error={errors.openTime?.message} {...register('openTime')} />
                <Input label="Closing time" type="time" requiredMark error={errors.closeTime?.message} {...register('closeTime')} />
              </div>
              <div>
                <p className="label-base">Available weekdays</p>
                <div className="flex flex-wrap gap-2">
                  {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={cn(
                        'h-9 w-12 rounded-xl border text-xs font-semibold transition',
                        days.includes(day)
                          ? 'border-navy-700 bg-navy-900 text-white'
                          : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300',
                      )}
                    >
                      {shortWeekday(day)}
                    </button>
                  ))}
                </div>
                {errors.availableDays?.message ? (
                  <p className="mt-1.5 text-xs font-medium text-rose-600">{errors.availableDays.message}</p>
                ) : null}
              </div>
              <Input
                label="Blackout dates"
                placeholder="2026-12-25, 2026-12-26"
                hint="Comma-separated dates (YYYY-MM-DD) when the resource is unavailable."
                error={errors.blackoutDates?.message}
                {...register('blackoutDates')}
              />
              <Input
                label="Maximum booking duration (hours)"
                type="number"
                min={1}
                max={12}
                requiredMark
                error={errors.maxBookingHours?.message}
                {...register('maxBookingHours', { valueAsNumber: true })}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Eligibility and safety" description="Who is allowed to book, and what must they know?" />
            <CardBody className="space-y-4">
              <Input
                label="Required qualifications"
                placeholder="e.g. Laboratory Safety Certificate"
                hint="Comma-separated labels. Users must upload verified evidence for each."
                {...register('requiredQualifications')}
              />
              <Input
                label="Required training"
                placeholder="e.g. CNC Operation Training"
                hint="Comma-separated labels. Human review is required."
                {...register('requiredTraining')}
              />
              <label className="flex items-start gap-2.5 rounded-xl border border-slate-200 p-3 text-xs text-slate-600">
                <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-slate-300 text-navy-700" {...register('supervisionRequired')} />
                <span>
                  <strong className="text-ink">Supervision required.</strong> A technician or owner representative
                  must be present during every session.
                </span>
              </label>
              <Textarea label="Eligibility notes" rows={3} placeholder="Any additional access conditions, approvals or restrictions." {...register('eligibilityNotes')} />
              <Textarea label="Usage instructions" rows={3} placeholder="How to operate the resource safely, setup and shutdown steps." {...register('usageInstructions')} />
              <Textarea label="Booking conditions" rows={3} placeholder="What borrowers must agree to, cleaning requirements, consumption limits, etc." {...register('bookingConditions')} />
              <Textarea label="Cancellation policy" rows={2} placeholder="e.g. Cancel at least 24 hours before the session." {...register('cancellationPolicy')} />
            </CardBody>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Pricing" description="Indicative amounts only. No payments are processed in demo mode." />
            <CardBody className="space-y-3">
              <Input label="Hourly rate (INR)" type="number" min={0} step="0.01" error={errors.hourlyRate?.message} {...register('hourlyRate', { valueAsNumber: true })} />
              <Input label="Daily rate (INR)" type="number" min={0} step="0.01" hint="Applied automatically for sessions of 5 hours or more." error={errors.dailyRate?.message} {...register('dailyRate', { valueAsNumber: true })} />
              <Input label="Security deposit (INR)" type="number" min={0} step="0.01" error={errors.securityDeposit?.message} {...register('securityDeposit', { valueAsNumber: true })} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Publishing" />
            <CardBody className="space-y-3">
              <label className="flex items-start gap-2.5 rounded-xl border border-slate-200 p-3 text-xs text-slate-600">
                <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-slate-300 text-navy-700" {...register('active')} />
                <span>
                  <strong className="text-ink">Active listing.</strong> Visible in the public catalogue. You can
                  deactivate it at any time.
                </span>
              </label>
              {!profile?.verified ? (
                <p className="rounded-xl bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-800">
                  Your owner account is not verified. Publishing will be blocked until an administrator verifies you.
                </p>
              ) : null}
              {serverError ? (
                <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700">{serverError}</p>
              ) : null}
              <Button type="submit" className="w-full" loading={isSubmitting} icon={<Save className="h-4 w-4" />}>
                {isEdit ? 'Save changes' : 'Create listing'}
              </Button>
              <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-400">
                <Info className="mt-0.5 h-3 w-3 shrink-0" /> Listings are audited. Changes are recorded with your
                account and a timestamp.
              </p>
            </CardBody>
          </Card>

          <Card className="bg-navy-950 text-white">
            <CardBody>
              <p className="flex items-center gap-1.5 text-xs font-semibold">
                <Sparkles className="h-4 w-4 text-navy-300" /> Listing quality checklist
              </p>
              <ul className="mt-3 space-y-2 text-[11px] leading-relaxed text-navy-200">
                {[
                  'Describe real capabilities and limitations',
                  'Publish accurate opening times and blackout dates',
                  'Only require qualifications you can actually verify',
                  'Explain safety steps and cleaning expectations',
                  'Keep condition notes and handover instructions current',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-1.5">
                    <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-400" /> {item}
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex items-center gap-2 text-[10px] text-navy-300">
                <ShieldCheck className="h-3 w-3" /> {name || 'This resource'} · {category}
              </div>
            </CardBody>
          </Card>

          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <CalendarDays className="h-3.5 w-3.5" /> Availability changes apply to new bookings immediately.
            <Clock className="ml-2 h-3.5 w-3.5" />
            <ClipboardList className="h-3.5 w-3.5" />
          </div>
        </div>
      </form>
    </div>
  );
}
