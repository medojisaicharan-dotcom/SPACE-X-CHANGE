import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Boxes,
  CalendarDays,
  Eye,
  Pencil,
  Plus,
  Power,
  Search,
  Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button, buttonStyles } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useLiveQuery } from '@/hooks/useLiveQuery';
import {
  deleteResource,
  getOwnerResources,
  resourceUsageStats,
  toggleResourceActive,
  type ResourceWithMeta,
} from '@/services/resourceService';
import { shortWeekday } from '@/utils/date';
import { formatCurrency, formatDate } from '@/utils/format';

export function OwnerResources() {
  const { profile } = useAuth();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ResourceWithMeta | null>(null);
  const [working, setWorking] = useState(false);

  const resources = useLiveQuery(
    () => (profile ? getOwnerResources(profile.id) : []),
    [profile?.id],
  );

  if (!profile) return null;

  const ownerId = profile.id;

  const filtered = resources.filter((resource) =>
    [resource.name, resource.category, resource.location, resource.institutionName]
      .join(' ')
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  function handleToggle(resource: ResourceWithMeta) {
    try {
      toggleResourceActive(ownerId, resource.id);
      toast.success(
        resource.active ? 'Listing deactivated' : 'Listing activated',
        `${resource.name} is now ${resource.active ? 'hidden from' : 'visible in'} the catalogue.`,
      );
    } catch (error) {
      toast.error('Could not update listing', error instanceof Error ? error.message : 'Try again.');
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setWorking(true);
    try {
      deleteResource(ownerId, deleteTarget.id);
      toast.success('Listing deleted', `${deleteTarget.name} was removed.`);
      setDeleteTarget(null);
    } catch (error) {
      toast.error('Could not delete', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setWorking(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="My resources"
        description="Publish, edit, pause and monitor the listings you own."
        actions={
          <Link to="/owner/resources/new" className={buttonStyles('primary', 'md')}>
            <Plus className="h-4 w-4" /> New listing
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search my listings"
            className="pl-9"
            aria-label="Search listings"
          />
        </div>
        <Badge tone="slate">{filtered.length} listing(s)</Badge>
        {!profile.verified ? <Badge tone="amber">Owner verification pending</Badge> : null}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={Boxes}
            title={resources.length === 0 ? 'No listings yet' : 'No matches'}
            description={
              resources.length === 0
                ? 'Create a detailed listing with availability, eligibility rules and handover instructions.'
                : 'Try a different search term.'
            }
            action={
              resources.length === 0 ? (
                <Link to="/owner/resources/new" className={buttonStyles('primary', 'sm')}>
                  Create a listing
                </Link>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((resource) => {
            const usage = resourceUsageStats(resource.id);
            return (
              <Card key={resource.id} className="overflow-hidden">
                <div className="flex flex-col gap-4 p-4 sm:flex-row">
                  <img
                    src={resource.image}
                    alt={resource.name}
                    className="h-32 w-full rounded-xl border border-slate-200 object-cover sm:h-24 sm:w-36"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-sm font-semibold text-ink">{resource.name}</h3>
                          <Badge tone={resource.active ? 'green' : 'slate'} dot>
                            {resource.active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {resource.category} · {resource.institutionName}
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-400">{resource.location}</p>
                      </div>
                      <div className="text-right text-xs">
                        <p className="font-semibold text-ink">
                          {resource.hourlyRate > 0 ? `${formatCurrency(resource.hourlyRate)}/hr` : 'Free'}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {usage.totalBookings} bookings · {usage.completedBookings} completed
                        </p>
                      </div>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge tone="navy">
                        <CalendarDays className="h-3 w-3" /> {resource.openTime}–{resource.closeTime}
                      </Badge>
                      <Badge tone="slate">
                        {resource.availableDays.map((day) => shortWeekday(day)).join(' · ')}
                      </Badge>
                      <Badge tone="slate">Until {formatDate(resource.availableTo)}</Badge>
                      {resource.bookingCount > 0 ? <Badge tone="sky">{resource.bookingCount} total requests</Badge> : null}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Link to={`/resources/${resource.id}`} className={buttonStyles('outline', 'sm')}>
                        <Eye className="h-3.5 w-3.5" /> View
                      </Link>
                      <Link to={`/owner/resources/${resource.id}/edit`} className={buttonStyles('secondary', 'sm')}>
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Link>
                      <Button variant="ghost" size="sm" onClick={() => handleToggle(resource)} icon={<Power className="h-3.5 w-3.5" />}>
                        {resource.active ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button variant="ghost" size="sm" className="text-rose-600 hover:bg-rose-50" onClick={() => setDeleteTarget(resource)} icon={<Trash2 className="h-3.5 w-3.5" />}>
                        Delete
                      </Button>
                      <Link to="/owner/availability" className="ml-auto text-[11px] font-semibold text-navy-700 hover:underline">
                        Availability details
                      </Link>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete this listing?"
        message={`"${deleteTarget?.name ?? 'This resource'}" and its waiting-list entries will be removed. Active bookings must be resolved first. Consider deactivating instead.`}
        confirmLabel="Delete listing"
        loading={working}
      />
    </div>
  );
}
