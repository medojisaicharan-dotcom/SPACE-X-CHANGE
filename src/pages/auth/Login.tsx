import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight, Eye, EyeOff, Info, Lock, Mail, ShieldCheck } from 'lucide-react';
import { AuthLayout } from '@/layouts/AuthLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { signIn } from '@/services/authService';
import { DEMO_ACCOUNTS, DEMO_MODE, HAS_SUPABASE_CONFIG } from '@/lib/config';
import { roleHome } from '@/utils/roles';

const schema = z.object({
  email: z.string().min(1, 'Enter your email address.').email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
});

type FormValues = z.infer<typeof schema>;

export function Login() {
  const [params] = useSearchParams();
  const redirect = params.get('redirect');
  const presetEmail = params.get('email') ?? '';
  const navigate = useNavigate();
  const toast = useToast();
  const { profile, refresh } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: presetEmail, password: '' },
  });

  async function onSubmit(values: FormValues) {
    setServerError('');
    try {
      const signedIn = await signIn(values.email, values.password);
      refresh();
      toast.success('Welcome back', `Signed in as ${signedIn.fullName}.`);
      navigate(redirect || roleHome(signedIn.role), { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to sign in.';
      setServerError(message);
    }
  }

  function useDemoAccount(email: string, password: string) {
    setValue('email', email, { shouldValidate: true });
    setValue('password', password, { shouldValidate: true });
    setServerError('');
  }

  return (
    <AuthLayout title="Sign in to SPACEXCHANGE" subtitle="Access your bookings, listings and notifications.">
      {profile ? (
        <div className="mb-5 flex items-start gap-2 rounded-xl border border-navy-100 bg-navy-50 p-3 text-xs text-navy-800">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            You are already signed in as <strong>{profile.fullName}</strong>. Signing in again will
            switch accounts.{' '}
            <Link to={roleHome(profile.role)} className="font-semibold underline">
              Go to dashboard
            </Link>
          </p>
        </div>
      ) : null}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input
          label="Email address"
          type="email"
          autoComplete="email"
          placeholder="you@institution.edu"
          requiredMark
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          label="Password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          placeholder="Enter your password"
          requiredMark
          error={errors.password?.message}
          rightSlot={
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
          {...register('password')}
        />

        {serverError ? (
          <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /> {serverError}
          </div>
        ) : null}

        <div className="flex items-center justify-between text-xs">
          <label className="flex items-center gap-2 text-slate-500">
            <input type="checkbox" defaultChecked className="h-3.5 w-3.5 rounded border-slate-300 text-navy-700" />
            Keep me signed in
          </label>
          <Link to="/forgot-password" className="font-semibold text-navy-700 hover:underline">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" size="lg" className="w-full" loading={isSubmitting} icon={<Lock className="h-4 w-4" />}>
          Sign in
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-slate-500">
        New to SPACEXCHANGE?{' '}
        <Link to="/signup" className="font-semibold text-navy-700 hover:underline">
          Create an account
        </Link>
      </p>

      {DEMO_MODE ? (
        <div className="mt-7 rounded-2xl border border-slate-200 bg-white p-4">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
            <ShieldCheck className="h-4 w-4 text-amber-500" /> Demo accounts
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
            Click a role to fill the form. These are clearly labelled sample accounts with persistent
            demo data.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => useDemoAccount(account.email, account.password)}
                className="rounded-xl border border-slate-200 p-2.5 text-left transition hover:border-navy-300 hover:bg-navy-50/50"
              >
                <p className="text-[11px] font-semibold text-ink">{account.role}</p>
                <p className="mt-0.5 flex items-center gap-1 truncate text-[10px] text-slate-500">
                  <Mail className="h-3 w-3 shrink-0" /> {account.email}
                </p>
              </button>
            ))}
          </div>
        </div>
      ) : HAS_SUPABASE_CONFIG ? (
        <div className="mt-7 flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-[11px] leading-relaxed text-emerald-800">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            This build is connected to Supabase. Accounts, bookings and listings are stored in your
            live Postgres project, not in this browser.
          </p>
        </div>
      ) : null}

      <p className="mt-6 text-center text-[11px] text-slate-400">
        <Link to="/explore" className="inline-flex items-center gap-1 hover:text-navy-600">
          Browse resources without signing in <ArrowRight className="h-3 w-3" />
        </Link>
      </p>
    </AuthLayout>
  );
}
