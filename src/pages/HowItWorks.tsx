import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  ClipboardCheck,
  FileWarning,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { buttonStyles } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { roleHome } from '@/utils/roles';

const STEPS = [
  {
    icon: Search,
    title: 'Discover',
    text: 'Search by category, location, availability, price or required skills. Every listing shows real prerequisites before you commit.',
  },
  {
    icon: ShieldCheck,
    title: 'Check eligibility',
    text: 'The platform checks account verification, institution membership and uploaded evidence. Safety-critical requirements are always human-reviewed.',
  },
  {
    icon: CalendarCheck,
    title: 'Request a slot',
    text: 'Pick a date within the published window. Overlapping requests are blocked and a waiting list is offered instead.',
  },
  {
    icon: BadgeCheck,
    title: 'Get approval',
    text: 'The owner reviews your purpose and eligibility. Institutional priority and limits are applied transparently.',
  },
  {
    icon: ClipboardCheck,
    title: 'Check in and out',
    text: 'Record the initial condition, complete your session and submit return photos. Owners confirm completion.',
  },
  {
    icon: FileWarning,
    title: 'Resolve issues',
    text: 'Report damage, safety concerns or disputes with photos. Managers review every incident without automatic penalties.',
  },
];

const FAQS = [
  {
    q: 'Who can list a resource?',
    a: 'Verified resource owners and administrators can publish listings. New owner accounts must be verified by an administrator before going live. Institution managers can oversee listings within their institution.',
  },
  {
    q: 'How is eligibility decided?',
    a: 'Eligibility combines account verification, institution membership, required qualifications or training, and any custom rules set per resource. Uploaded evidence is reviewed by a human — the platform never auto-approves safety-critical evidence.',
  },
  {
    q: 'What happens if two people want the same slot?',
    a: 'Approved and in-progress bookings hold the slot. If your requested time overlaps, you can join the waiting list. If a booking is cancelled, waitlisted users are notified in order.',
  },
  {
    q: 'Are payments processed?',
    a: 'This demo records indicative hourly, daily and deposit amounts so owners and users can agree costs. No real payment gateway is connected and no card data is collected.',
  },
  {
    q: 'Is my data stored in Supabase?',
    a: 'In this environment the app runs in local demo mode. Data is stored in your browser so you can test the full workflow. A Supabase schema and client scaffolding are included for production wiring.',
  },
  {
    q: 'What if equipment is damaged?',
    a: 'Check-in and check-out both capture condition checklists and optional photos. Anyone can file an incident report; a manager reviews the evidence and records an outcome. No penalty is applied automatically.',
  },
];

export function HowItWorks() {
  const { profile } = useAuth();

  return (
    <div>
      <section className="border-b border-slate-200 bg-navy-950 text-white">
        <div className="container-page py-16 sm:py-20">
          <Badge tone="navy" className="border-white/15 bg-white/10 text-navy-100">
            How SPACEXCHANGE works
          </Badge>
          <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
            Share resources safely, from first search to final return.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-navy-200 sm:text-base">
            SPACEXCHANGE is built around a complete lifecycle: discovery, eligibility, approval,
            handover, condition tracking and accountable incident review. No step is a black box.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/explore" className={buttonStyles('primary', 'lg', 'bg-white text-navy-900 hover:bg-navy-50')}>
              Explore resources <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to={profile ? roleHome(profile.role) : '/signup'}
              className={buttonStyles('outline', 'lg', 'border-white/20 bg-transparent text-white hover:bg-white/10')}
            >
              {profile ? 'Go to dashboard' : 'Create an account'}
            </Link>
          </div>
        </div>
      </section>

      <section className="container-page py-14">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-navy-500">The lifecycle</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Six accountable steps
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Every action is recorded in the audit trail so institutions can understand exactly what
            happened and why.
          </p>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((step, index) => (
            <Card key={step.title} className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-50 text-navy-700">
                  <step.icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-semibold text-slate-300">0{index + 1}</span>
              </div>
              <h3 className="mt-4 text-sm font-semibold text-ink">{step.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{step.text}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="container-page py-14">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-navy-500">For every role</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
                Clear responsibilities
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-500">
                Students, makers and researchers get faster access. Owners keep control. Institutions
                retain oversight and a complete evidence trail.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Badge tone="navy"><Users className="h-3 w-3" /> Users</Badge>
                <Badge tone="green">Resource owners</Badge>
                <Badge tone="sky">Institution managers</Badge>
                <Badge tone="purple">Administrators</Badge>
              </div>
            </div>
            <div className="space-y-4">
              {[
                {
                  title: 'Users',
                  text: 'Discover resources, verify eligibility, request slots, join waiting lists, check in and out, report issues and track spending.',
                },
                {
                  title: 'Resource owners',
                  text: 'Publish detailed listings, set availability and rules, approve or reject requests, record handovers and confirm returns.',
                },
                {
                  title: 'Institution managers',
                  text: 'Verify accounts, review evidence, oversee institutional listings, resolve incidents and monitor utilisation.',
                },
                {
                  title: 'Administrators',
                  text: 'Manage roles, institutions and platform-wide limits, review the audit trail and keep allocation fair and safe.',
                },
              ].map((role) => (
                <div key={role.title} className="flex gap-3 rounded-2xl border border-slate-200 p-4">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-navy-900 text-xs font-bold text-white">
                    {role.title.charAt(0)}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-ink">{role.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">{role.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="container-page py-14">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-navy-500">Questions</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">Good to know</h2>
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-800">
                <Sparkles className="h-4 w-4" /> Demo transparency
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-amber-800/90">
                This build runs locally with a seeded database. Payments, email delivery and external AI
                are simulated. Nothing here is a real financial or safety decision.
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {FAQS.map((faq) => (
              <details key={faq.q} className="group rounded-2xl border border-slate-200 bg-white p-4 open:shadow-card">
                <summary className="cursor-pointer list-none text-sm font-semibold text-ink marker:hidden">
                  <span className="flex items-center justify-between gap-3">
                    {faq.q}
                    <span className="text-slate-400 transition group-open:rotate-45">+</span>
                  </span>
                </summary>
                <p className="mt-2.5 text-xs leading-relaxed text-slate-500">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page pb-16">
        <div className="rounded-3xl bg-navy-900 px-6 py-10 text-center text-white sm:px-10">
          <h2 className="text-2xl font-semibold tracking-tight">Ready to share what you have?</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-navy-200">
            Start with the demo accounts to see both sides of the workflow, or create your own account.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to={profile ? roleHome(profile.role) : '/login'} className={buttonStyles('primary', 'lg', 'bg-white text-navy-900 hover:bg-navy-50')}>
              {profile ? 'Open dashboard' : 'Sign in to demo'}
            </Link>
            <Link to="/explore" className={buttonStyles('outline', 'lg', 'border-white/20 bg-transparent text-white hover:bg-white/10')}>
              Browse listings
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
