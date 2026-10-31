import { Link } from 'react-router-dom';
import { Mail, MapPin, Phone } from 'lucide-react';
import { Logo } from '@/components/Logo';

const columns = [
  {
    title: 'Platform',
    links: [
      { label: 'Explore Resources', to: '/explore' },
      { label: 'How It Works', to: '/how-it-works' },
      { label: 'List Your Resource', to: '/signup' },
      { label: 'About Us', to: '/about' },
    ],
  },
  {
    title: 'Account',
    links: [
      { label: 'Login', to: '/login' },
      { label: 'Create Account', to: '/signup' },
      { label: 'Forgot Password', to: '/forgot-password' },
    ],
  },
  {
    title: 'Trust & Safety',
    links: [
      { label: 'Eligibility Verification', to: '/how-it-works' },
      { label: 'Condition Reports', to: '/how-it-works' },
      { label: 'Incident Reporting', to: '/how-it-works' },
      { label: 'Fair Allocation', to: '/how-it-works' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white">
      <div className="container-page py-12">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_2fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-500">
              SPACEXCHANGE connects colleges, laboratories, institutions and makerspaces with people
              who need access to underused equipment and spaces — safely and transparently.
            </p>
            <div className="mt-5 space-y-2 text-sm text-slate-500">
              <p className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-navy-500" /> hello@spacexchange.demo
              </p>
              <p className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-navy-500" /> +91 40 2345 6789
              </p>
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-navy-500" /> Hyderabad, Telangana, India
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {columns.map((column) => (
              <div key={column.title}>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-ink">
                  {column.title}
                </h3>
                <ul className="mt-3 space-y-2.5">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        to={link.to}
                        className="text-sm text-slate-500 transition hover:text-navy-700"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-10 flex flex-col gap-3 border-t border-slate-100 pt-6 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} SPACEXCHANGE. Built for responsible resource sharing.</p>
          <p className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 font-medium text-amber-700">
            Demo environment · sample data, not a live service
          </p>
        </div>
      </div>
    </footer>
  );
}
