import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowUpDown,
  Compass,
  MapPin,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react';
import { ResourceCard } from '@/components/ResourceCard';
import { Badge } from '@/components/ui/Badge';
import { Button, buttonStyles } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { Select } from '@/components/ui/Select';
import { useAuth } from '@/contexts/AuthContext';
import { useLiveQuery } from '@/hooks/useLiveQuery';
import { IS_SUPABASE_MODE } from '@/lib/config';
import { listResources } from '@/services/resourceService';
import { getRecommendations, recordSearch } from '@/services/aiService';
import { listInstitutions } from '@/services/authService';
import { CATEGORIES, type ResourceFilters } from '@/types';
import { cn } from '@/utils/format';

export function Explore() {
  const { profile } = useAuth();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('search') ?? '');
  const [category, setCategory] = useState(params.get('category') ?? '');
  const [institutionId, setInstitutionId] = useState(params.get('institution') ?? '');
  const [location, setLocation] = useState('');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [maxPrice, setMaxPrice] = useState('');
  const [skill, setSkill] = useState('');
  const [sort, setSort] = useState<NonNullable<ResourceFilters['sort']>>('newest');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    setSearch(params.get('search') ?? '');
    setCategory(params.get('category') ?? '');
    setInstitutionId(params.get('institution') ?? '');
  }, [params]);

  useEffect(() => {
    if (!profile || search.trim().length < 3) return;
    const timer = window.setTimeout(() => recordSearch(profile.id, search.trim()), 700);
    return () => window.clearTimeout(timer);
  }, [search, profile]);

  const filters: ResourceFilters = {
    search,
    category: category || undefined,
    institutionId: institutionId || undefined,
    location: location || undefined,
    availableOnly,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    skill: skill || undefined,
    sort,
  };

  const results = useLiveQuery(() => listResources(filters), [
    search,
    category,
    institutionId,
    location,
    availableOnly,
    maxPrice,
    skill,
    sort,
  ]);

  const institutions = useLiveQuery(() => listInstitutions(), []);

  const recommendations = useLiveQuery(
    () => (profile ? getRecommendations(profile.id, 3) : []),
    [profile?.id],
  );

  function updateCategory(value: string) {
    setCategory(value);
    const next = new URLSearchParams(params);
    if (value) next.set('category', value);
    else next.delete('category');
    setParams(next, { replace: true });
  }

  function updateInstitution(value: string) {
    setInstitutionId(value);
    const next = new URLSearchParams(params);
    if (value) next.set('institution', value);
    else next.delete('institution');
    setParams(next, { replace: true });
  }

  function reset() {
    setSearch('');
    setCategory('');
    setInstitutionId('');
    setLocation('');
    setAvailableOnly(false);
    setMaxPrice('');
    setSkill('');
    setSort('newest');
    setParams({}, { replace: true });
  }

  const activeFilterCount = [
    category,
    institutionId,
    location,
    availableOnly ? 'yes' : '',
    maxPrice,
    skill,
    search,
  ].filter(Boolean).length;

  const filterPanel = (
    <div className="space-y-5">
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Filters</p>
        <div className="space-y-4">
          <Select label="Category" value={category} onChange={(event) => updateCategory(event.target.value)}>
            <option value="">All categories</option>
            {CATEGORIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
          <Select
            label="Institution"
            value={institutionId}
            onChange={(event) => updateInstitution(event.target.value)}
          >
            <option value="">All institutions</option>
            {institutions.map((institution) => (
              <option key={institution.id} value={institution.id}>
                {institution.name}
              </option>
            ))}
          </Select>
          <Input
            label="Location"
            placeholder="Campus, city or area"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
          />
          <div>
            <label className="label-base">Maximum hourly price</label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-400">
                ₹
              </span>
              <input
                type="number"
                min={0}
                step={50}
                value={maxPrice}
                onChange={(event) => setMaxPrice(event.target.value)}
                placeholder="Any price"
                className="input-base pl-7"
              />
            </div>
          </div>
          <Input
            label="Required skill or training"
            placeholder="e.g. safety, photography"
            value={skill}
            onChange={(event) => setSkill(event.target.value)}
          />
          <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-slate-200 px-3 py-2.5">
            <input
              type="checkbox"
              checked={availableOnly}
              onChange={(event) => setAvailableOnly(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-navy-700 focus:ring-navy-300"
            />
            <span className="text-sm text-slate-600">Available today only</span>
          </label>
          <Select
            label="Sort by"
            value={sort}
            onChange={(event) => setSort(event.target.value as NonNullable<ResourceFilters['sort']>)}
          >
            <option value="newest">Newest listings</option>
            <option value="availability">Availability</option>
            <option value="popularity">Most popular</option>
          </Select>
        </div>
      </div>
      <Button variant="outline" size="sm" className="w-full" onClick={reset} icon={<RotateCcw className="h-3.5 w-3.5" />}>
        Clear all filters
      </Button>
    </div>
  );

  return (
    <div className="bg-slate-50">
      <div className="border-b border-slate-200 bg-white py-10">
        <div className="container-page">
          <PageHeader
            eyebrow="Resource marketplace"
            title="Explore resources"
            description="Search verified equipment, laboratories, workspaces and facilities available across partner institutions."
            actions={
              <Link
                to={profile ? '/dashboard/bookings' : '/login'}
                className={buttonStyles('outline', 'md')}
              >
                <Compass className="h-4 w-4" /> My bookings
              </Link>
            }
          />
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name, description, institution or location…"
                className="input-base h-12 pl-11 pr-10 text-sm"
                aria-label="Search resources"
              />
              {search ? (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
            <Button
              variant="outline"
              size="lg"
              className="lg:hidden"
              onClick={() => setShowFilters((value) => !value)}
              icon={<SlidersHorizontal className="h-4 w-4" />}
            >
              Filters {activeFilterCount ? `(${activeFilterCount})` : ''}
            </Button>
          </div>
        </div>
      </div>

      <div className="container-page py-8">
        <div className="grid gap-8 lg:grid-cols-[16rem_1fr]">
          <aside className={cn('lg:block', showFilters ? 'block' : 'hidden')}>
            <Card className="sticky top-24 p-5">{filterPanel}</Card>
          </aside>

          <div>
            {profile && recommendations.length > 0 ? (
              <Card className="mb-6 overflow-hidden border-navy-100 bg-navy-50/40">
                <div className="flex items-center gap-2 border-b border-navy-100 px-4 py-3">
                  <Sparkles className="h-4 w-4 text-navy-600" />
                  <p className="text-xs font-semibold text-navy-800">Smart recommendations for you</p>
                  <Badge tone="navy" className="ml-auto">Rule-based AI</Badge>
                </div>
                <div className="grid gap-3 p-4 sm:grid-cols-3">
                  {recommendations.map(({ resource, reasons }) => (
                    <Link
                      key={resource.id}
                      to={`/resources/${resource.id}`}
                      className="group rounded-xl border border-white bg-white p-3 transition hover:border-navy-300 hover:shadow-card"
                    >
                      <p className="line-clamp-1 text-xs font-semibold text-ink group-hover:text-navy-700">
                        {resource.name}
                      </p>
                      <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
                        <MapPin className="h-3 w-3" /> {resource.location.split(',')[0]}
                      </p>
                      <p className="mt-1.5 text-[11px] leading-relaxed text-navy-600">
                        {reasons[0] ?? 'Suggested for your profile'}
                      </p>
                    </Link>
                  ))}
                </div>
              </Card>
            ) : null}

            {IS_SUPABASE_MODE && institutions.length === 0 ? (
              <Card className="mb-6 border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <p className="font-semibold">This Supabase project has no catalogue yet</p>
                <p className="mt-1 text-xs leading-relaxed">
                  The institution and resource tables are empty, so nothing can be booked. Run{' '}
                  <code className="rounded bg-amber-100 px-1 py-0.5 text-[11px]">
                    database/seed/0003_seed_live_data.sql
                  </code>{' '}
                  in the Supabase SQL editor (or <code className="rounded bg-amber-100 px-1 py-0.5 text-[11px]">npm run seed:supabase</code>)
                  to add the 19 partner institutions and 51 listings, then reload this page.
                </p>
              </Card>
            ) : null}

            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-500">
                <span className="font-semibold text-ink">{results.length}</span> resource
                {results.length === 1 ? '' : 's'} found
                {search ? (
                  <>
                    {' '}
                    for <span className="font-medium text-navy-700">“{search}”</span>
                  </>
                ) : null}
              </p>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <ArrowUpDown className="h-3.5 w-3.5" />
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value as NonNullable<ResourceFilters['sort']>)}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-600"
                  aria-label="Sort results"
                >
                  <option value="newest">Newest</option>
                  <option value="availability">Availability</option>
                  <option value="popularity">Popularity</option>
                </select>
              </div>
            </div>

            {results.length === 0 ? (
              <Card>
                <EmptyState
                  icon={Search}
                  title="No resources match your filters"
                  description="Try removing a filter, searching for a broader term, or browsing another category."
                  action={
                    <Button variant="outline" onClick={reset} icon={<RotateCcw className="h-4 w-4" />}>
                      Reset filters
                    </Button>
                  }
                />
              </Card>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {results.map((resource) => (
                  <ResourceCard key={resource.id} resource={resource} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
