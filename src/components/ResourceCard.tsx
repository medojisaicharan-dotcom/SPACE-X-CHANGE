import { Link } from 'react-router-dom';
import { ArrowUpRight, CalendarCheck, MapPin, ShieldCheck, Star } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { buttonStyles } from '@/components/ui/Button';
import { CATEGORY_IMAGES, type Resource } from '@/types';
import { formatCurrency, truncate } from '@/utils/format';

export interface ResourceCardData extends Resource {
  bookingCount: number;
  availableNow: boolean;
  ownerName?: string;
}

export function ResourceCard({ resource }: { resource: ResourceCardData }) {
  return (
    <article className="group card flex flex-col overflow-hidden transition duration-200 hover:-translate-y-0.5 hover:shadow-lift">
      <Link to={`/resources/${resource.id}`} className="relative block overflow-hidden">
        <img
          src={resource.image || CATEGORY_IMAGES[resource.category] || '/images/other.svg'}
          alt={resource.name}
          className="h-44 w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          onError={(event) => {
            event.currentTarget.src = CATEGORY_IMAGES[resource.category] || '/images/other.svg';
          }}
        />
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
          <Badge tone="navy" className="bg-white/95 backdrop-blur">
            {resource.category}
          </Badge>
          <Badge
            tone={resource.availableNow ? 'green' : 'slate'}
            className="bg-white/95 backdrop-blur"
            dot
          >
            {resource.availableNow ? 'Available' : 'Unavailable'}
          </Badge>
        </div>
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-navy-950/70 to-transparent p-3 pt-8">
          <div className="flex items-center gap-1 text-[11px] font-medium text-white/90">
            <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />
            {resource.bookingCount} booking{resource.bookingCount === 1 ? '' : 's'}
          </div>
          <div className="rounded-lg bg-white/95 px-2 py-1 text-xs font-bold text-navy-900">
            {resource.hourlyRate > 0 ? `${formatCurrency(resource.hourlyRate)}/hr` : 'Free'}
          </div>
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-1 text-sm font-semibold text-ink">
          <Link to={`/resources/${resource.id}`} className="hover:text-navy-700">
            {resource.name}
          </Link>
        </h3>
        <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
          <MapPin className="h-3.5 w-3.5 shrink-0" /> {truncate(resource.location, 52)}
        </p>
        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-500">
          {resource.description}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {resource.requiredQualifications.length > 0 || resource.requiredTraining.length > 0 ? (
            <Badge tone="amber">
              <ShieldCheck className="h-3 w-3" /> Training required
            </Badge>
          ) : (
            <Badge tone="slate">No prerequisites</Badge>
          )}
          {resource.supervisionRequired ? <Badge tone="sky">Supervised</Badge> : null}
        </div>
        <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
          <Link
            to={`/resources/${resource.id}`}
            className={buttonStyles('primary', 'sm', 'flex-1')}
          >
            <CalendarCheck className="h-3.5 w-3.5" /> View & Book
          </Link>
          <Link
            to={`/resources/${resource.id}`}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-navy-700"
            aria-label={`Open ${resource.name}`}
          >
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}
