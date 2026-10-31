import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, CheckCircle2, Info, KeyRound, Mail, ShieldCheck } from 'lucide-react';
import { AuthLayout } from '@/layouts/AuthLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/contexts/ToastContext';
import { DEMO_MODE, IS_SUPABASE_MODE } from '@/lib/config';
import { authSessionUserId, onAuthStateChange } from '@/lib/supabaseRepo';
import { requestPasswordReset, resetPassword } from '@/services/authService';

const emailSchema = z.object({
  email: z.string().min(1, 'Enter your email.').email('Enter a valid email address.'),
});

const passwordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Use at least 8 characters.')
      .regex(/[A-Z]/, 'Include an uppercase letter.')
      .regex(/[a-z]/, 'Include a lowercase letter.')
      .regex(/[0-9]/, 'Include a number.'),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match.',
  });

export function ForgotPassword() {
  const toast = useToast();
  const [step, setStep] = useState<'request' | 'sent' | 'reset' | 'done'>('request');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!IS_SUPABASE_MODE) return;
    const isRecoveryRoute =
      typeof window !== 'undefined' && window.location.pathname === '/reset-password';
    const hashLooksLikeRecovery =
      typeof window !== 'undefined' && window.location.hash.includes('type=recovery');
    const unsubscribe = onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setStep('reset');
    });
    if (isRecoveryRoute || hashLooksLikeRecovery) {
      void authSessionUserId()
        .then((userId) => {
          if (userId) {
            setStep('reset');
          } else if (isRecoveryRoute) {
            setError(
              'This reset link is no longer valid. Request a new one from the previous step.',
            );
          }
        })
        .catch(() => {
          if (isRecoveryRoute) {
            setError('This reset link could not be verified. Request a new one.');
          }
        });
    }
    return unsubscribe;
  }, []);

  const emailForm = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' },
  });
  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  async function onRequest(values: { email: string }) {
    setError('');
    try {
      await requestPasswordReset(values.email);
      setEmail(values.email);
      if (IS_SUPABASE_MODE) {
        setStep('sent');
        toast.info('Reset link sent', 'Check your inbox for the password reset link.');
        return;
      }
      setStep('reset');
      toast.info('Account found', 'In demo mode you can set a new password directly.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Account lookup failed.');
    }
  }

  async function onReset(values: { password: string }) {
    setError('');
    try {
      await resetPassword(email, values.password);
      setStep('done');
      toast.success('Password updated', 'You can now sign in with your new password.');
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : 'Could not reset password.');
    }
  }

  return (
    <AuthLayout
      title={
        step === 'done'
          ? 'Password updated'
          : step === 'sent'
            ? 'Check your email'
            : 'Reset your password'
      }
      subtitle={
        step === 'done'
          ? 'Your credentials have been updated securely.'
          : step === 'sent'
            ? 'We sent a secure reset link to your inbox.'
            : 'Recover access to your SPACEXCHANGE account.'
      }
    >
      {DEMO_MODE ? (
        <div className="mb-5 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            <strong>Demo mode:</strong> no email is sent. Account recovery is simulated locally and the
            new password is stored as a salted hash in this browser.
          </p>
        </div>
      ) : null}

      {step === 'request' ? (
        <form onSubmit={emailForm.handleSubmit(onRequest)} className="space-y-4" noValidate>
          <Input
            label="Email address"
            type="email"
            placeholder="you@institution.edu"
            requiredMark
            error={emailForm.formState.errors.email?.message}
            {...emailForm.register('email')}
          />
          {error ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700">
              {error}
            </p>
          ) : null}
          <Button type="submit" size="lg" className="w-full" loading={emailForm.formState.isSubmitting} icon={<Mail className="h-4 w-4" />}>
            Find my account
          </Button>
          <Link to="/login" className="block text-center text-sm font-semibold text-navy-700 hover:underline">
            Back to sign in
          </Link>
        </form>
      ) : null}

      {step === 'sent' ? (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs leading-relaxed text-emerald-800">
            <Mail className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              If an account exists for <strong>{email}</strong>, a password reset link is on its way.
              Open that link to choose a new password.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setStep('request')}
            className="w-full text-center text-sm font-semibold text-navy-700 hover:underline"
          >
            Use a different email
          </button>
          <Link to="/login" className="block text-center text-sm font-semibold text-navy-700 hover:underline">
            Back to sign in
          </Link>
        </div>
      ) : null}

      {step === 'reset' ? (
        <form onSubmit={passwordForm.handleSubmit(onReset)} className="space-y-4" noValidate>
          {email ? (
            <p className="rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-600">
              Resetting password for <strong>{email}</strong>
            </p>
          ) : (
            <p className="rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-600">
              Choose a new password for the account linked to this recovery session.
            </p>
          )}
          <Input
            label="New password"
            type="password"
            autoComplete="new-password"
            requiredMark
            error={passwordForm.formState.errors.password?.message}
            {...passwordForm.register('password')}
          />
          <Input
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            requiredMark
            error={passwordForm.formState.errors.confirmPassword?.message}
            {...passwordForm.register('confirmPassword')}
          />
          {error ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700">
              {error}
            </p>
          ) : null}
          <Button type="submit" size="lg" className="w-full" loading={passwordForm.formState.isSubmitting} icon={<KeyRound className="h-4 w-4" />}>
            Set new password
          </Button>
        </form>
      ) : null}

      {step === 'done' ? (
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <p className="mt-4 text-sm leading-relaxed text-slate-600">
            Your password has been changed. Sign in with your new credentials to continue.
          </p>
          <Link to="/login" className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-navy-900 px-4 py-3 text-sm font-semibold text-white hover:bg-navy-800">
            <ArrowLeft className="h-4 w-4" /> Return to sign in
          </Link>
        </div>
      ) : null}

      <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-[11px] text-slate-400">
        <ShieldCheck className="h-3.5 w-3.5" /> Passwords are never stored in plain text.
      </p>
    </AuthLayout>
  );
}
