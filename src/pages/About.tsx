import { Link } from 'react-router-dom';
import {
  Building2,
  CheckCircle2,
  Eye,
  Handshake,
  Leaf,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button, buttonStyles } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useLiveQuery } from '@/hooks/useLiveQuery';
import { getPlatformStats } from '@/services/analyticsService';
import { resetDemoDatabase } from '@/lib/demoDb';
import { IS_SUPABASE_MODE } from '@/lib/config';
import { useToast } from '@/contexts/ToastContext';

const VALUES = [
  {
    icon: Eye,
    title: 'Transparency',
    text: 'Allocation rules, waiting lists and eligibility checks are visible to the people they affect.',
  },
  {
    icon: ShieldCheck,
    title: 'Safety first',
    text: 'Human review for evidence and incidents. The platform supports decisions; it does not replace them.',
  },
  {
    icon: Handshake,
    title: 'Accountability',
    text: 'Condition records, audit logs and clear ownership make every handover traceable.',
  },
  {
    icon: Leaf,
    title: 'Better utilisation',
    text: 'Share idle equipment instead of buying duplicates. Lower cost, less waste, more access.',
  },
];

export function About() {
  const stats = useLiveQuery(() => getPlatformStats());
  const toast = useToast();

  async function handleReset() {
    if (IS_SUPABASE_MODE) {
      toast.warning(
        'Live data',
        'Resetting is disabled in Supabase mode. Manage records from the Supabase dashboard.',
      );
      return;
    }
    await resetDemoDatabase();
    toast.success('Demo data reset', 'The seeded dataset has been restored. You have been signed out.');
    window.location.href = '/login';
  }

  return (
    <div>
      <section className="border-b border-slate-200 bg-white">
        <div className="container-page py-16 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div>
              <Badge tone="navy">About the platform</Badge>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                Make institutional resources accessible without losing control.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
                Laboratories, cameras, 3D printers, workshops and meeting spaces often sit idle while
                nearby students and creators struggle to find affordable access. SPACEXCHANGE closes
                that gap with a structured, evidence-based sharing workflow.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link to="/explore" className={buttonStyles('primary', 'lg')}>
                  Explore resources
                </Link>
                <Link to="/how-it-works" className={buttonStyles('outline', 'lg')}>
                  See how it works
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Active resources', value: stats.resources, icon: Sparkles },
                { label: 'Institutions', value: stats.institutions, icon: Building2 },
                { label: 'Members', value: stats.members, icon: Users },
                { label: 'Completed bookings', value: stats.completedBookings, icon: CheckCircle2 },
              ].map((item) => (
                <Card key={item.label} className="p-4">
                  <item.icon className="h-4 w-4 text-navy-500" />
                  <p className="mt-3 text-2xl font-semibold tracking-tight text-ink">{item.value}</p>
                  <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                    {item.label}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="container-page py-14">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-navy-500">Why it matters</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
              The problem is coordination, not scarcity
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Most institutions already own the equipment people need. What is missing is a reliable
              way to discover it, verify who can use it, allocate slots fairly and record condition.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              SPACEXCHANGE is a coordination layer. It does not invent inventory — it makes existing
              inventory usable, measurable and accountable.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {VALUES.map((value) => (
              <Card key={value.title} className="p-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy-50 text-navy-700">
                  <value.icon className="h-4.5 w-4.5" />
                </div>
                <h3 className="mt-3 text-sm font-semibold text-ink">{value.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{value.text}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="container-page py-14">
          <div className="grid gap-8 lg:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-navy-500">Built responsibly</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
                {IS_SUPABASE_MODE ? 'What this build does and does not do' : 'What this demo does and does not do'}
              </h2>
            </div>
            <div className="lg:col-span-2">
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { ok: true, text: IS_SUPABASE_MODE ? 'Full booking lifecycle with Supabase persistence' : 'Full booking lifecycle with local persistence' },
                  { ok: true, text: 'Role-based dashboards and permission checks' },
                  { ok: true, text: 'Eligibility evidence with human review' },
                  { ok: true, text: 'Audit trail, notifications and incident reports' },
                  { ok: false, text: 'No real payments or card collection' },
                  { ok: false, text: IS_SUPABASE_MODE ? 'No external AI calls or payment webhooks' : 'No emails or external AI calls in demo mode' },
                  { ok: false, text: 'No automated safety or disciplinary decisions' },
                  { ok: IS_SUPABASE_MODE, text: IS_SUPABASE_MODE ? 'Connected to a live Supabase project' : 'Not connected to a live Supabase project here' },
                ].map((item) => (
                  <div
                    key={item.text}
                    className="flex items-start gap-2 rounded-xl border border-slate-200 p-3 text-xs text-slate-600"
                  >
                    <CheckCircle2
                      className={item.ok ? 'mt-0.5 h-4 w-4 shrink-0 text-emerald-600' : 'mt-0.5 h-4 w-4 shrink-0 text-slate-300'}
                    />
                    {item.text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container-page py-14">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-xl">
              <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                <LockKeyhole className="h-4 w-4 text-navy-600" /> {IS_SUPABASE_MODE ? 'Live data control' : 'Demo data control'}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-slate-500">
                {IS_SUPABASE_MODE
                  ? 'Accounts, listings, bookings and audit records live in your Supabase project. Row level security controls access, and data changes are managed from the Supabase dashboard rather than this browser.'
                  : 'Everything you create is stored in this browser. You can restore the original seeded dataset at any time. This clears local accounts and bookings you created during testing.'}
              </p>
            </div>
            <Button variant="outline" onClick={handleReset} disabled={IS_SUPABASE_MODE}>
              {IS_SUPABASE_MODE ? 'Managed in Supabase' : 'Reset demo data'}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
