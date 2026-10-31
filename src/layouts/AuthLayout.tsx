import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CalendarCheck, ShieldCheck, Sparkles } from 'lucide-react';
import { Logo } from '@/components/Logo';

const FEATURES = [
  { icon: ShieldCheck, title: 'Human-reviewed eligibility', text: 'Safety requirements checked by authorised reviewers.' },
  { icon: CalendarCheck, title: 'End-to-end handovers', text: 'Approval, check-in, condition photos and return confirmation.' },
  { icon: Sparkles, title: 'Transparent allocation', text: 'Visible limits, waiting lists and priority rules.' },
];

export function AuthLayout({
  children,
  title,
  subtitle,
}: {
  children: ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <div className="relative hidden overflow-hidden bg-navy-950 p-10 text-white lg:flex lg:flex-col">
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, rgba(84,128,198,0.35), transparent 45%), radial-gradient(circle at 90% 80%, rgba(163,192,229,0.18), transparent 40%)',
          }}
        />
        <div className="relative flex flex-1 flex-col">
          <Logo dark />
          <div className="my-auto max-w-md py-12">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-navy-300">
              Unlock underused resources
            </p>
            <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight">
              One trusted platform for equipment, laboratories, workspaces and technical facilities.
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-navy-200">
              SPACEXCHANGE makes resource sharing safe, transparent and affordable for institutions,
              students, researchers and creators.
            </p>
            <div className="mt-8 space-y-4">
              {FEATURES.map((feature) => (
                <div key={feature.title} className="flex gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-navy-200">
                    <feature.icon className="h-4.5 w-4.5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{feature.title}</p>
                    <p className="mt-0.5 text-xs text-navy-300">{feature.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs leading-relaxed text-navy-200">
              “We had a 3D printer and a robotics kit idle for months. SPACEXCHANGE let us share them
              safely with students who actually needed them.”
            </p>
            <p className="mt-2 text-[11px] font-semibold text-white">Rahul Verma · Resource Owner (demo)</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col bg-slate-50">
        <div className="flex items-center justify-between px-5 py-5 sm:px-8">
          <div className="lg:hidden">
            <Logo />
          </div>
          <Link
            to="/"
            className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-navy-700"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to home
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center px-5 pb-12 sm:px-8">
          <div className="w-full max-w-md">
            <h2 className="text-2xl font-semibold tracking-tight text-ink">{title}</h2>
            <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>
            <div className="mt-7">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
