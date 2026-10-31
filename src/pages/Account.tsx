import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  BadgeCheck,
  Building2,
  KeyRound,
  LogOut,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { Select } from '@/components/ui/Select';
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useLiveQuery } from '@/hooks/useLiveQuery';
import { changePassword, listInstitutions, signOut, updateProfile } from '@/services/authService';
import { resetDemoDatabase } from '@/lib/demoDb';
import { IS_SUPABASE_MODE } from '@/lib/config';
import { ROLE_LABELS } from '@/types';
import { roleHome } from '@/utils/roles';
import { formatDate } from '@/utils/format';

const profileSchema = z.object({
  fullName: z.string().min(3, 'Enter your full name.').max(80),
  institutionId: z.string(),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password.'),
    newPassword: z
      .string()
      .min(8, 'Use at least 8 characters.')
      .regex(/[A-Z]/, 'Include an uppercase letter.')
      .regex(/[a-z]/, 'Include a lowercase letter.')
      .regex(/[0-9]/, 'Include a number.'),
    confirmPassword: z.string(),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match.',
  });

export function Account() {
  const { profile, refresh } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const institutions = useLiveQuery(() => listInstitutions());
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    values: {
      fullName: profile?.fullName ?? '',
      institutionId: profile?.institutionId ?? '',
    },
  });

  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  if (!profile) return null;

  const userId = profile.id;

  function onSaveProfile(values: z.infer<typeof profileSchema>) {
    updateProfile(userId, values);
    refresh();
    toast.success('Profile updated', 'Your account details were saved.');
  }

  async function onChangePassword(values: z.infer<typeof passwordSchema>) {
    try {
      await changePassword(userId, values.currentPassword, values.newPassword);
      passwordForm.reset();
      toast.success('Password changed', 'Use your new password next time you sign in.');
    } catch (error) {
      toast.error('Could not change password', error instanceof Error ? error.message : 'Try again.');
    }
  }

  async function handleReset() {
    setResetting(true);
    try {
      await resetDemoDatabase();
      toast.success('Demo data reset', 'Seeded data restored. Please sign in again.');
      navigate('/login', { replace: true });
      window.location.reload();
    } finally {
      setResetting(false);
      setResetOpen(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Account settings"
        description={
          IS_SUPABASE_MODE
            ? 'Manage your identity, institution membership and password. Changes are saved to Supabase.'
            : 'Manage your identity, institution membership, password and local demo data.'
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardBody className="text-center">
            <div className="flex justify-center">
              <Avatar name={profile.fullName} size="lg" />
            </div>
            <h2 className="mt-3 text-base font-semibold text-ink">{profile.fullName}</h2>
            <p className="text-xs text-slate-500">{profile.email}</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <Badge tone="navy">{ROLE_LABELS[profile.role]}</Badge>
              <Badge tone={profile.verified ? 'green' : 'amber'} dot>
                {profile.verified ? 'Verified' : 'Verification pending'}
              </Badge>
              {profile.suspended ? <Badge tone="rose">Suspended</Badge> : null}
            </div>
            <div className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-left text-xs">
              <p className="flex items-center gap-2 text-slate-500">
                <Building2 className="h-3.5 w-3.5" /> {profile.institutionName || 'No institution linked'}
              </p>
              <p className="flex items-center gap-2 text-slate-500">
                <UserRound className="h-3.5 w-3.5" /> Joined {formatDate(profile.createdAt)}
              </p>
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(roleHome(profile.role))}
                icon={<ShieldCheck className="h-3.5 w-3.5" />}
              >
                Open my dashboard
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  signOut();
                  toast.info('Signed out', 'Your session has ended.');
                  navigate('/login');
                }}
                icon={<LogOut className="h-3.5 w-3.5" />}
              >
                Sign out
              </Button>
            </div>
          </CardBody>
        </Card>

        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader title="Profile details" description="Your display name and institution membership." />
            <CardBody>
              <form onSubmit={profileForm.handleSubmit(onSaveProfile)} className="grid gap-4 sm:grid-cols-2" noValidate>
                <Input
                  label="Full name"
                  requiredMark
                  error={profileForm.formState.errors.fullName?.message}
                  {...profileForm.register('fullName')}
                />
                <Select
                  label="Institution"
                  hint="Used for institutional eligibility priority."
                  error={profileForm.formState.errors.institutionId?.message}
                  {...profileForm.register('institutionId')}
                >
                  <option value="">No institution</option>
                  {institutions.map((institution) => (
                    <option key={institution.id} value={institution.id}>
                      {institution.name}
                    </option>
                  ))}
                </Select>
                <div className="sm:col-span-2 flex justify-end">
                  <Button type="submit" loading={profileForm.formState.isSubmitting} icon={<BadgeCheck className="h-4 w-4" />}>
                    Save profile
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Change password"
              description={
                IS_SUPABASE_MODE
                  ? 'Verified against your current password and saved in Supabase Auth.'
                  : 'Stored as a salted hash in this browser.'
              }
            />
            <CardBody>
              <form onSubmit={passwordForm.handleSubmit(onChangePassword)} className="grid gap-4 sm:grid-cols-2" noValidate>
                <Input
                  label="Current password"
                  type="password"
                  autoComplete="current-password"
                  requiredMark
                  className="sm:col-span-2"
                  error={passwordForm.formState.errors.currentPassword?.message}
                  {...passwordForm.register('currentPassword')}
                />
                <Input
                  label="New password"
                  type="password"
                  autoComplete="new-password"
                  requiredMark
                  error={passwordForm.formState.errors.newPassword?.message}
                  {...passwordForm.register('newPassword')}
                />
                <Input
                  label="Confirm new password"
                  type="password"
                  autoComplete="new-password"
                  requiredMark
                  error={passwordForm.formState.errors.confirmPassword?.message}
                  {...passwordForm.register('confirmPassword')}
                />
                <div className="sm:col-span-2 flex justify-end">
                  <Button type="submit" variant="secondary" loading={passwordForm.formState.isSubmitting} icon={<KeyRound className="h-4 w-4" />}>
                    Update password
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>

          {IS_SUPABASE_MODE ? (
            <Card className="border-emerald-200">
              <CardHeader
                title={
                  <span className="flex items-center gap-2 text-emerald-900">
                    <ShieldCheck className="h-4 w-4" /> Live Supabase account
                  </span>
                }
                description="This account is stored in your Supabase project. Identity and password are handled by Supabase Auth."
              />
              <CardBody>
                <p className="text-[11px] leading-relaxed text-slate-500">
                  Account deletion and data resets are intentionally disabled in the app. Manage them
                  from the Supabase dashboard so row level security and audit history stay intact.
                </p>
              </CardBody>
            </Card>
          ) : (
            <Card className="border-amber-200">
              <CardHeader
                title={
                  <span className="flex items-center gap-2 text-amber-900">
                    <ShieldAlert className="h-4 w-4" /> Demo data
                  </span>
                }
                description="All data lives in this browser. Reset restores the original sample dataset and signs you out."
              />
              <CardBody>
                <Button variant="danger" onClick={() => setResetOpen(true)} icon={<RotateCcw className="h-4 w-4" />}>
                  Reset demo database
                </Button>
              </CardBody>
            </Card>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={handleReset}
        title="Reset all demo data?"
        message="This deletes every local account, listing, booking, incident and notification you created in this browser, then restores the seeded dataset."
        confirmLabel="Reset everything"
        tone="danger"
        loading={resetting}
      />
    </div>
  );
}
