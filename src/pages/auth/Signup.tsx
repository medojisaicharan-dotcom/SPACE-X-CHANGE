import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  ShieldCheck,
  UserRound,
  Wrench,
} from 'lucide-react';
import { AuthLayout } from '@/layouts/AuthLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/contexts/ToastContext';
import { useLiveQuery } from '@/hooks/useLiveQuery';
import { listInstitutions, signUp } from '@/services/authService';
import { ServiceError } from '@/services/core';
import { roleHome } from '@/utils/roles';
import { cn } from '@/utils/format';
import { useAuth } from '@/contexts/AuthContext';

const ROLES = [
  { value: 'user', label: 'User', icon: UserRound, text: 'Book equipment and spaces.' },
  { value: 'resource_owner', label: 'Resource Owner', icon: Wrench, text: 'List and manage resources.' },
  { value: 'institution_manager', label: 'Institution Manager', icon: Building2, text: 'Verify and oversee access.' },
] as const;

const schema = z
  .object({
    fullName: z.string().min(3, 'Enter your full name.').max(80),
    email: z.string().min(1, 'Enter your email.').email('Enter a valid email address.'),
    role: z.enum(['user', 'resource_owner', 'institution_manager']),
    institutionId: z.string(),
    institutionName: z.string(),
    password: z
      .string()
      .min(8, 'Use at least 8 characters.')
      .regex(/[A-Z]/, 'Include an uppercase letter.')
      .regex(/[a-z]/, 'Include a lowercase letter.')
      .regex(/[0-9]/, 'Include a number.'),
    confirmPassword: z.string(),
    terms: z.boolean().refine(Boolean, 'Accept the platform terms to continue.'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match.',
  })
  .refine((values) => Boolean(values.institutionId) || values.institutionName.trim().length >= 2, {
    path: ['institutionName'],
    message: 'Select an institution or enter its name.',
  });

type FormValues = z.infer<typeof schema>;

export function Signup() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { refresh } = useAuth();
  const institutions = useLiveQuery(() => listInstitutions());
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');
  const [confirmationEmail, setConfirmationEmail] = useState('');

  const presetRole = params.get('role');
  const initialRole =
    presetRole === 'resource_owner' || presetRole === 'institution_manager' ? presetRole : 'user';

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: '',
      email: '',
      role: initialRole,
      institutionId: '',
      institutionName: '',
      password: '',
      confirmPassword: '',
      terms: false,
    },
  });

  const role = watch('role');
  const institutionId = watch('institutionId');
  const password = watch('password');

  async function onSubmit(values: FormValues) {
    setServerError('');
    try {
      const profile = await signUp({
        fullName: values.fullName,
        email: values.email,
        password: values.password,
        role: values.role,
        institutionId: values.institutionId,
        institutionName: values.institutionName,
      });
      refresh();
      toast.success('Account created', `Welcome, ${profile.fullName}.`);
      if (profile.role !== 'user') {
        toast.info(
          'Verification required',
          'An administrator must verify owner or manager accounts before listings can be published.',
        );
      }
      navigate(roleHome(profile.role), { replace: true });
    } catch (error) {
      if (error instanceof ServiceError && error.code === 'email_confirmation_required') {
        setConfirmationEmail(values.email);
        return;
      }
      setServerError(error instanceof Error ? error.message : 'Could not create your account.');
    }
  }

  const strength = (() => {
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    return score;
  })();

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Join as a user, resource owner or institution manager. Administrator accounts are provisioned separately."
    >
      {confirmationEmail ? (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Confirm your email address</p>
              <p className="mt-1 text-xs leading-relaxed">
                We created your account with <strong>{confirmationEmail}</strong>. Open the
                confirmation link in that inbox, then sign in. If no email arrives, ask the project
                administrator to disable <strong>Confirm email</strong> in Supabase Authentication
                settings.
              </p>
            </div>
          </div>
          <Link
            to="/login"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-navy-900 px-4 py-3 text-sm font-semibold text-white hover:bg-navy-800"
          >
            Go to sign in
          </Link>
        </div>
      ) : (
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <p className="label-base">Account role</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {ROLES.map((option) => {
              const Icon = option.icon;
              const selected = role === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setValue('role', option.value, { shouldValidate: true })}
                  className={cn(
                    'rounded-xl border p-3 text-left transition',
                    selected
                      ? 'border-navy-700 bg-navy-50 ring-1 ring-navy-300'
                      : 'border-slate-200 bg-white hover:border-slate-300',
                  )}
                >
                  <Icon className={cn('h-4 w-4', selected ? 'text-navy-700' : 'text-slate-400')} />
                  <p className="mt-1.5 text-xs font-semibold text-ink">{option.label}</p>
                  <p className="mt-0.5 text-[10px] leading-snug text-slate-500">{option.text}</p>
                </button>
              );
            })}
          </div>
        </div>

        <Input
          label="Full name"
          placeholder="e.g. Aarav Mehta"
          autoComplete="name"
          requiredMark
          error={errors.fullName?.message}
          {...register('fullName')}
        />
        <Input
          label="Email address"
          type="email"
          placeholder="you@institution.edu"
          autoComplete="email"
          requiredMark
          error={errors.email?.message}
          {...register('email')}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            label="Institution"
            value={institutionId}
            error={errors.institutionId?.message}
            {...register('institutionId')}
          >
            <option value="">Other / not listed</option>
            {institutions.map((institution) => (
              <option key={institution.id} value={institution.id}>
                {institution.name}
              </option>
            ))}
          </Select>
          {!institutionId ? (
            <Input
              label="Institution name"
              placeholder="Enter your institution"
              error={errors.institutionName?.message}
              {...register('institutionName')}
            />
          ) : (
            <div className="flex items-end">
              <div className="flex w-full items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-700">
                <CheckCircle2 className="h-4 w-4" /> Membership linked
              </div>
            </div>
          )}
        </div>

        <div>
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="At least 8 characters"
            autoComplete="new-password"
            requiredMark
            error={errors.password?.message}
            rightSlot={
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
            {...register('password')}
          />
          <div className="mt-2 flex gap-1">
            {Array.from({ length: 5 }).map((_, index) => (
              <span
                key={index}
                className={cn(
                  'h-1 flex-1 rounded-full',
                  index < strength
                    ? strength <= 2
                      ? 'bg-rose-400'
                      : strength <= 3
                        ? 'bg-amber-400'
                        : 'bg-emerald-500'
                    : 'bg-slate-200',
                )}
              />
            ))}
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Use uppercase, lowercase, a number and at least 8 characters.
          </p>
        </div>

        <Input
          label="Confirm password"
          type={showPassword ? 'text' : 'password'}
          placeholder="Re-enter your password"
          autoComplete="new-password"
          requiredMark
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <label className="flex items-start gap-2.5 text-xs text-slate-600">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-navy-700"
            {...register('terms')}
          />
          <span>
            I agree to the platform terms, acceptable use policy and understand that safety-critical
            access is subject to human review.
          </span>
        </label>
        {errors.terms?.message ? <p className="-mt-2 text-xs text-rose-600">{errors.terms.message}</p> : null}

        {serverError ? (
          <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /> {serverError}
          </div>
        ) : null}

        <Button type="submit" size="lg" className="w-full" loading={isSubmitting} icon={<GraduationCap className="h-4 w-4" />}>
          Create account
        </Button>
      </form>
      )}

      <p className="mt-5 text-center text-sm text-slate-500">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-navy-700 hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
