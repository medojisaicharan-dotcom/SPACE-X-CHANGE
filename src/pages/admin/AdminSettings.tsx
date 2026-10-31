import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Cloud,
  Database,
  Info,
  RotateCcw,
  Save,
  Settings2,
  ShieldCheck,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useLiveQuery } from '@/hooks/useLiveQuery';
import { getDb, resetDemoDatabase } from '@/lib/demoDb';
import { DEMO_MODE, HAS_SUPABASE_CONFIG, IS_SUPABASE_MODE } from '@/lib/config';
import { updateSettings } from '@/services/adminService';
import type { PlatformSettings } from '@/types';
import { cn } from '@/utils/format';

const DEFAULTS: PlatformSettings = {
  maxActiveBookings: 3,
  maxBookingsPerMonth: 10,
  maxBookingHours: 4,
  institutionPriorityEnabled: true,
  waitingListEnabled: true,
  autoApproval: false,
  overdueGraceMinutes: 30,
};

export function AdminSettings() {
  const { profile } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState<PlatformSettings>(DEFAULTS);
  const [resetOpen, setResetOpen] = useState(false);
  const [working, setWorking] = useState(false);

  const settings = useLiveQuery(() => getDb().settings, [profile?.id]);

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  if (!profile) return null;

  const canEdit = profile.role === 'administrator';

  function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setWorking(true);
    try {
      updateSettings(profile!.id, form);
      toast.success('Settings saved', 'New limits apply to future booking attempts immediately.');
    } catch (error) {
      toast.error('Could not save settings', error instanceof Error ? error.message : 'Check the values and try again.');
    } finally {
      setWorking(false);
    }
  }

  async function handleReset() {
    setWorking(true);
    try {
      await resetDemoDatabase();
      setResetOpen(false);
      toast.success('Demo data restored', 'All demo accounts and sample records have been reseeded.');
      navigate('/login', { replace: true });
    } catch (error) {
      toast.error('Could not reset demo data', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setWorking(false);
    }
  }

  function setNumber(key: keyof PlatformSettings, value: string) {
    setForm((current) => ({ ...current, [key]: Number(value) }));
  }

  return (
    <div>
      <PageHeader
        title="Platform settings"
        description="Booking guardrails, prioritisation and demo environment controls."
        actions={<Badge tone={canEdit ? 'green' : 'amber'}>{canEdit ? 'Administrator access' : 'Read-only for managers'}</Badge>}
      />

      <form onSubmit={handleSave} className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          <Card>
            <CardHeader title="Booking limits" description="Applied by the booking engine before a request is created." />
            <CardBody className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Maximum active bookings per member"
                type="number"
                min={1}
                max={20}
                value={form.maxActiveBookings}
                onChange={(event) => setNumber('maxActiveBookings', event.target.value)}
                hint="Pending, approved, checked-in and overdue count."
                disabled={!canEdit}
                requiredMark
              />
              <Input
                label="Maximum bookings per month"
                type="number"
                min={1}
                max={60}
                value={form.maxBookingsPerMonth}
                onChange={(event) => setNumber('maxBookingsPerMonth', event.target.value)}
                hint="Rolling calendar month per member."
                disabled={!canEdit}
                requiredMark
              />
              <Input
                label="Maximum booking duration (hours)"
                type="number"
                min={1}
                max={12}
                value={form.maxBookingHours}
                onChange={(event) => setNumber('maxBookingHours', event.target.value)}
                hint="Listings can set a lower limit individually."
                disabled={!canEdit}
                requiredMark
              />
              <Input
                label="Overdue grace period (minutes)"
                type="number"
                min={0}
                max={240}
                value={form.overdueGraceMinutes}
                onChange={(event) => setNumber('overdueGraceMinutes', event.target.value)}
                hint="After a session ends, returns are expected within this window."
                disabled={!canEdit}
                requiredMark
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Policy switches" description="These change how requests are routed and prioritised." />
            <CardBody className="space-y-1">
              <Toggle
                label="Institution priority"
                description="Prefer members from the owning institution when conflicts or waitlists occur."
                checked={form.institutionPriorityEnabled}
                onChange={(value) => setForm((current) => ({ ...current, institutionPriorityEnabled: value }))}
                disabled={!canEdit}
              />
              <Toggle
                label="Waiting list"
                description="Allow members to join a waitlist when a requested slot conflicts."
                checked={form.waitingListEnabled}
                onChange={(value) => setForm((current) => ({ ...current, waitingListEnabled: value }))}
                disabled={!canEdit}
              />
              <Toggle
                label="Auto-approval"
                description="Intended for future automation. When off, owners approve every eligible request manually."
                checked={form.autoApproval}
                onChange={(value) => setForm((current) => ({ ...current, autoApproval: value }))}
                disabled={!canEdit}
              />
            </CardBody>
          </Card>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">
              {canEdit ? 'Saving applies limits immediately. Every change is written to the audit log.' : 'Only an administrator can save platform settings.'}
            </p>
            <Button type="submit" loading={working} disabled={!canEdit} icon={<Save className="h-4 w-4" />}>
              Save settings
            </Button>
          </div>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Environment" description="How this build stores data." />
            <CardBody className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-slate-600"><Database className="h-4 w-4 text-slate-400" /> Demo mode</span>
                <Badge tone={DEMO_MODE ? 'amber' : 'green'}>{DEMO_MODE ? 'Enabled' : 'Off'}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-slate-600"><Cloud className="h-4 w-4 text-slate-400" /> Supabase config</span>
                <Badge tone={HAS_SUPABASE_CONFIG ? 'green' : 'slate'}>{HAS_SUPABASE_CONFIG ? 'Present' : 'Not detected'}</Badge>
              </div>
              <p
                className={cn(
                  'rounded-xl p-3 text-[11px] leading-relaxed',
                  IS_SUPABASE_MODE
                    ? 'bg-emerald-50 text-emerald-800'
                    : 'bg-amber-50 text-amber-800',
                )}
              >
                {IS_SUPABASE_MODE ? (
                  <>
                    This build writes to your live Supabase project. Accounts are managed by Supabase
                    Auth; listings, bookings, incidents and notifications persist in Postgres and are
                    protected by row level security. The SQL schema lives in
                    <code className="mx-1 rounded bg-white/60 px-1">database/migrations/</code>.
                  </>
                ) : (
                  <>
                    This build uses a persistent browser database. Data never leaves this browser. Add
                    <code className="mx-1 rounded bg-white/60 px-1">VITE_SUPABASE_URL</code> and a
                    publishable key to <code className="mx-1 rounded bg-white/60 px-1">.env.local</code>
                    and restart the dev server to switch to Supabase.
                  </>
                )}
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Integrity" description="Safeguards built into the platform." />
            <CardBody className="space-y-2.5 text-xs text-slate-600">
              <p className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> Administrators cannot change their own role or suspend themselves.</p>
              <p className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> At least one administrator must remain at all times.</p>
              <p className="flex items-start gap-2"><Settings2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> Every approve, reject, cancel, verify and review action is audit logged.</p>
              <p className="flex items-start gap-2"><Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /> No automated penalties, payments or liability decisions are made.</p>
            </CardBody>
          </Card>

          <Card className={IS_SUPABASE_MODE ? 'border-slate-200' : 'border-rose-200'}>
            <CardHeader
              title={IS_SUPABASE_MODE ? 'Live data protection' : 'Restore demo data'}
              description={
                IS_SUPABASE_MODE
                  ? 'Resetting from the browser is disabled.'
                  : 'Reseed all accounts and sample records.'
              }
            />
            <CardBody className="space-y-3">
              <p className="text-[11px] leading-relaxed text-slate-500">
                {IS_SUPABASE_MODE
                  ? 'Live records belong to your Supabase project and are never wiped from this screen. Use the Supabase dashboard, SQL editor or a migration when you need to reset data.'
                  : 'This signs you out and replaces every local record with the original seeded dataset. Use it before a demo or after experimenting.'}
              </p>
              <Button
                type="button"
                variant="danger"
                className="w-full"
                onClick={() => setResetOpen(true)}
                disabled={IS_SUPABASE_MODE}
                icon={<RotateCcw className="h-4 w-4" />}
              >
                Reset demo database
              </Button>
            </CardBody>
          </Card>
        </div>
      </form>

      <ConfirmDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={handleReset}
        title="Reset the demo database?"
        message="All local changes — new listings, bookings, incidents and notes — will be permanently discarded and the demo will return to its original state. You will be signed out."
        confirmLabel="Reset everything"
        cancelLabel="Keep my data"
        tone="danger"
        loading={working}
      />
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-3 last:border-0">
      <div>
        <p className="text-xs font-semibold text-ink">{label}</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition',
          checked ? 'bg-navy-700' : 'bg-slate-300',
          disabled && 'cursor-not-allowed opacity-60',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition',
            checked ? 'left-[22px]' : 'left-0.5',
          )}
        />
      </button>
    </div>
  );
}
