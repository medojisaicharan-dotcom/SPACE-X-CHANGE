import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Box,
  Building2,
  CalendarCheck,
  Camera,
  CheckCircle2,
  CircuitBoard,
  ClipboardCheck,
  Compass,
  FlaskConical,
  Hammer,
  Handshake,
  Laptop,
  LockKeyhole,
  Mic2,
  Microscope,
  Presentation,
  Printer,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  Wrench,
} from 'lucide-react';
import { ResourceCard } from '@/components/ResourceCard';
import { Badge } from '@/components/ui/Badge';
import { buttonStyles } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/contexts/AuthContext';
import { useLiveQuery } from '@/hooks/useLiveQuery';
import { listResources } from '@/services/resourceService';
import { getPlatformStats } from '@/services/analyticsService';
import { CATEGORIES } from '@/types';
import { DEMO_ACCOUNTS as ACCOUNTS, DEMO_MODE } from '@/lib/config';

const CATEGORY_ICONS: Record<string, typeof FlaskConical> = {
  Laboratories: FlaskConical,
  'Computers and Laptops': Laptop,
  'Cameras and Photography Equipment': Camera,
  '3D Printers': Printer,
  'Manufacturing Tools': Wrench,
  'Electronics Equipment': CircuitBoard,
  Classrooms: Presentation,
  'Meeting Rooms': Users,
  'Conference Halls': Mic2,
  'Research Equipment': Microscope,
  'Workshop Equipment': Hammer,
  'Other Resources': Box,
};

const STEPS = [
  {
    icon: Search,
    title: 'Discover',
    text: 'Search verified equipment, labs and spaces by category, location, price and required skills.',
  },
  {
    icon: ShieldCheck,
    title: 'Get verified',
    text: 'Upload qualifications and training evidence. Authorised humans review every safety-critical requirement.',
  },
  {
    icon: CalendarCheck,
    title: 'Book & hand over',
    text: 'Request a slot, get owner approval, record condition photos at check-in and check-out.',
  },
];

const TRUST = [
  {
    icon: ShieldCheck,
    title: 'Human-reviewed eligibility',
    text: 'Qualifications and safety permissions are checked by an authorised reviewer — never auto-approved by software.',
  },
  {
    icon: ClipboardCheck,
    title: 'Condition reports',
    text: 'Timestamped initial and final condition records with photos protect both the owner and the borrower.',
  },
  {
    icon: LockKeyhole,
    title: 'Role-based access',
    text: 'Row-level security policies, protected routes and audit trails keep administrative actions accountable.',
  },
  {
    icon: Handshake,
    title: 'Transparent allocation',
    text: 'Booking limits, waiting lists and institutional priority rules are visible — not hidden algorithms.',
  },
];

export function Landing() {
  const { profile } = useAuth();
  const data = useLiveQuery(() => ({
    featured: listResources({ sort: 'popularity' }).slice(0, 4),
    stats: getPlatformStats(),
  }));

  const listResourceHref = profile
    ? profile.role === 'administrator' || profile.role === 'institution_manager'
      ? '/admin/resources'
      : profile.role === 'resource_owner'
        ? '/owner/resources/new'
        : '/signup?role=resource_owner'
    : '/signup?role=resource_owner';

  return (
    <div>
      <section className="relative overflow-hidden border-b border-slate-200 bg-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              'radial-gradient(circle at 15% 20%, rgba(163,192,229,0.35), transparent 40%), radial-gradient(circle at 85% 0%, rgba(84,128,198,0.18), transparent 45%)',
          }}
        />
        <div className="container-page relative grid items-center gap-12 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
          <div className="animate-fade-up">
            <Badge tone="navy" className="mb-5 bg-navy-50">
              <Sparkles className="h-3.5 w-3.5" /> Trusted resource sharing for institutions
            </Badge>
            <h1 className="max-w-xl text-4xl font-semibold leading-[1.08] tracking-tight text-ink sm:text-5xl lg:text-6xl">
              Unlock underused resources.{' '}
              <span className="text-navy-700">Access more opportunities.</span>
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-slate-600 sm:text-lg">
              Discover, book and share valuable equipment, laboratories, workspaces and technical
              facilities through one trusted platform.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/explore" className={buttonStyles('primary', 'lg')}>
                <Compass className="h-5 w-5" /> Explore Resources
              </Link>
              <Link to={listResourceHref} className={buttonStyles('outline', 'lg')}>
                <Box className="h-5 w-5" /> List Your Resource
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs font-medium text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Verified institutions
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Human-reviewed access
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Full audit trail
              </span>
            </div>
          </div>

          <div className="relative animate-fade-up lg:pl-4">
            <div className="absolute -left-6 -top-6 hidden h-24 w-24 rounded-3xl border border-navy-200 bg-navy-50/70 lg:block" />
            <div className="absolute -bottom-8 -right-4 hidden h-32 w-32 rounded-full bg-navy-100/60 blur-2xl lg:block" />
            <Card className="relative overflow-hidden p-0">
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-5 py-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                </div>
                <p className="text-[11px] font-medium text-slate-400">spacexchange.app/dashboard</p>
              </div>
              <div className="space-y-4 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500">Welcome back</p>
                    <p className="text-lg font-semibold text-ink">Resource overview</p>
                  </div>
                  <Badge tone="green" dot>
                    All systems normal
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { label: 'Active bookings', value: '12', tone: 'text-navy-700' },
                    { label: 'Approved today', value: '5', tone: 'text-emerald-600' },
                    { label: 'Pending', value: '3', tone: 'text-amber-600' },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                      <p className={`text-xl font-semibold ${stat.tone}`}>{stat.value}</p>
                      <p className="mt-0.5 text-[10px] font-medium text-slate-500">{stat.label}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-xl border border-slate-100 p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs font-semibold text-ink">Upcoming handovers</p>
                    <span className="text-[10px] text-slate-400">Today</span>
                  </div>
                  {[
                    { name: 'Computer Laboratory', meta: '10:00 – 12:00 · Approved', tone: 'bg-navy-50 text-navy-700' },
                    { name: 'Robotics Equipment', meta: '14:30 – 16:00 · Checked in', tone: 'bg-emerald-50 text-emerald-700' },
                  ].map((item) => (
                    <div key={item.name} className="flex items-center gap-3 py-1.5">
                      <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${item.tone}`}>
                        <CalendarCheck className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-ink">{item.name}</p>
                        <p className="text-[10px] text-slate-500">{item.meta}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/70 px-3 py-2.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <p className="text-[11px] font-medium text-emerald-800">
                    Eligibility verified · condition report recorded
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-slate-50/70 py-6">
        <div className="container-page flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <span className="text-[10px] tracking-widest text-slate-400">Used by forward-thinking institutions</span>
          <span className="flex items-center gap-2"><Building2 className="h-4 w-4" /> GNIT Hyderabad</span>
          <span className="flex items-center gap-2"><FlaskConical className="h-4 w-4" /> Electronics Lab</span>
          <span className="flex items-center gap-2"><Sparkles className="h-4 w-4" /> Innovation Lab</span>
          <span className="flex items-center gap-2"><Users className="h-4 w-4" /> Community Makerspace</span>
        </div>
      </section>

      <section className="py-16 lg:py-20">
        <div className="container-page">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-navy-500">Featured resources</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
                Popular equipment, ready to book
              </h2>
              <p className="mt-2 max-w-xl text-sm text-slate-500">
                Real listings from demonstration institutions. Every card leads to a fully working
                booking flow.
              </p>
            </div>
            <Link to="/explore" className={buttonStyles('outline', 'md')}>
              Browse all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {data.featured.map((resource) => (
              <ResourceCard key={resource.id} resource={resource} />
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white py-16 lg:py-20">
        <div className="container-page">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-navy-500">Popular categories</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              Find the right space or equipment
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              From laboratories and fabrication tools to meeting rooms and research instruments.
            </p>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {CATEGORIES.map((category) => {
              const Icon = CATEGORY_ICONS[category] ?? Box;
              return (
                <Link
                  key={category}
                  to={`/explore?category=${encodeURIComponent(category)}`}
                  className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5 transition hover:-translate-y-0.5 hover:border-navy-300 hover:shadow-card"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy-50 text-navy-600 transition group-hover:bg-navy-900 group-hover:text-white">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-medium text-slate-700 group-hover:text-ink">{category}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-16 lg:py-20">
        <div className="container-page">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-navy-500">How it works</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              Three steps from discovery to handover
            </h2>
          </div>
          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {STEPS.map((step, index) => (
              <Card key={step.title} className="relative p-6">
                <span className="absolute right-5 top-5 text-4xl font-bold text-slate-100">0{index + 1}</span>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-900 text-white">
                  <step.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-base font-semibold text-ink">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{step.text}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-navy-900 py-14 text-white">
        <div className="container-page grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { value: `${data.stats.resources}+`, label: 'Active resources listed' },
            { value: `${data.stats.institutions}`, label: 'Partner institutions' },
            { value: `${data.stats.members}+`, label: 'Community members' },
            { value: `${data.stats.hoursShared}h`, label: 'Equipment hours shared' },
          ].map((stat) => (
            <div key={stat.label} className="border-l border-white/15 pl-5">
              <p className="text-3xl font-semibold tracking-tight">{stat.value}</p>
              <p className="mt-1 text-xs font-medium uppercase tracking-wider text-navy-200">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="py-16 lg:py-20">
        <div className="container-page grid gap-6 lg:grid-cols-2">
          <Card className="p-7">
            <Badge tone="navy" className="mb-4">
              <Building2 className="h-3.5 w-3.5" /> For resource owners
            </Badge>
            <h2 className="text-xl font-semibold text-ink">Turn idle capacity into opportunity</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              List laboratories, equipment and rooms that sit unused. Approve only the requests that
              meet your safety and eligibility requirements.
            </p>
            <ul className="mt-5 space-y-3">
              {[
                'Publish listings with rates, deposits and access rules',
                'Approve or reject requests with a documented reason',
                'Track utilisation, revenue and incident history',
                'Record handover condition with photos and checklists',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-slate-600">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> {item}
                </li>
              ))}
            </ul>
            <Link to={listResourceHref} className={buttonStyles('primary', 'md', 'mt-6')}>
              <Box className="h-4 w-4" /> List a resource
            </Link>
          </Card>

          <Card className="p-7">
            <Badge tone="green" className="mb-4">
              <Users className="h-3.5 w-3.5" /> For students & teams
            </Badge>
            <h2 className="text-xl font-semibold text-ink">Access equipment you could not afford alone</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              Find the right tool for your coursework, research or startup prototype — with clear
              requirements before you commit.
            </p>
            <ul className="mt-5 space-y-3">
              {[
                'Search by category, location, price and required skills',
                'See eligibility and training requirements up front',
                'Join transparent waiting lists for popular slots',
                'Keep a complete history of bookings and condition reports',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-slate-600">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> {item}
                </li>
              ))}
            </ul>
            <Link to="/explore" className={buttonStyles('outline', 'md', 'mt-6')}>
              <Compass className="h-4 w-4" /> Explore resources
            </Link>
          </Card>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white py-16 lg:py-20">
        <div className="container-page">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-navy-500">Trust & safety</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              Built for responsible access
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Safety-critical decisions stay with people. The platform provides evidence, structure
              and accountability.
            </p>
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {TRUST.map((item) => (
              <Card key={item.title} className="p-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <item.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-sm font-semibold text-ink">{item.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">{item.text}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 lg:py-20">
        <div className="container-page">
          <Card className="overflow-hidden">
            <div className="grid lg:grid-cols-[1.2fr_1fr]">
              <div className="p-8 sm:p-10">
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">
                  {DEMO_MODE ? 'Demo access' : 'Live workspace'}
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
                  {DEMO_MODE ? 'Try every role with sample accounts' : 'Create your account and start booking'}
                </h2>
                <p className="mt-2 max-w-lg text-sm leading-relaxed text-slate-500">
                  {DEMO_MODE
                    ? 'This build runs in local demo mode with persistent sample data. Use these clearly labelled demonstration accounts to test the complete workflow. No real personal data is stored.'
                    : 'This build is connected to a live Supabase project. Register with your email address, confirm it, then book equipment or publish listings. Every record is stored in Postgres and protected by row level security.'}
                </p>
                {DEMO_MODE ? (
                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    {ACCOUNTS.map((account) => (
                      <div key={account.email} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-ink">{account.role}</p>
                          <Badge tone="amber">Demo</Badge>
                        </div>
                        <p className="mt-1.5 break-all text-[11px] font-medium text-navy-700">{account.email}</p>
                        <p className="text-[11px] text-slate-500">Password: {account.password}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    {['Register with email', 'Confirm your address', 'Sign in securely', 'Book or list resources'].map(
                      (step, index) => (
                        <div key={step} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-navy-500">
                            Step {index + 1}
                          </p>
                          <p className="mt-1 text-xs font-semibold text-ink">{step}</p>
                        </div>
                      ),
                    )}
                  </div>
                )}
              </div>
              <div className="flex flex-col justify-center border-t border-slate-100 bg-navy-900 p-8 text-white lg:border-l lg:border-t-0">
                <BarChart3 className="h-8 w-8 text-navy-300" />
                <h3 className="mt-4 text-xl font-semibold">Ready to try the full lifecycle?</h3>
                <p className="mt-2 text-sm leading-relaxed text-navy-200">
                  Sign in as a resource owner to create a listing, then as a user to check
                  eligibility, book, check in and return it.
                </p>
                <div className="mt-6 flex flex-col gap-2">
                  <Link to="/login" className={buttonStyles('secondary', 'md', 'bg-white text-navy-900 hover:bg-navy-50')}>
                    {DEMO_MODE ? 'Sign in to the demo' : 'Sign in to your account'} <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link to="/explore" className={buttonStyles('ghost', 'md', 'text-navy-100 hover:bg-white/10 hover:text-white')}>
                    Browse without an account
                  </Link>
                </div>
                <div className="mt-6 flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2.5">
                  <Star className="h-4 w-4 text-amber-300" />
                  <p className="text-[11px] text-navy-100">
                    {DEMO_MODE
                      ? `${ACCOUNTS.length} roles · end-to-end booking workflow`
                      : 'Supabase Auth · Postgres · row level security'}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      <section className="pb-16">
        <div className="container-page">
          <div className="flex flex-col items-start justify-between gap-5 rounded-2xl bg-navy-50 px-6 py-8 sm:flex-row sm:items-center sm:px-10">
            <div>
              <h2 className="text-xl font-semibold text-ink">Have equipment sitting idle?</h2>
              <p className="mt-1 text-sm text-slate-600">
                Turn it into opportunities for students, researchers and creators.
              </p>
            </div>
            <Link to={listResourceHref} className={buttonStyles('primary', 'lg')}>
              <BadgeCheck className="h-5 w-5" /> List Your Resource
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
