import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Boxes,
  Eye,
  Power,
  Search,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { Select } from '@/components/ui/Select';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useLiveQuery } from '@/hooks/useLiveQuery';
import { canManageResource } from '@/services/core';
import {
  deleteResource,
  listAllResources,
  toggleResourceActive,
  type ResourceWithMeta,
} from '@/services/resourceService';
import { CATEGORIES } from '@/types';
import { cn, formatCurrency } from '@/utils/format';

export function AdminResources() {
  const { profile } = useAuth();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [deleteTarget, setDeleteTarget] = useState<ResourceWithMeta | null>(null);
  const [working, setWorking] = useState(false);

  const resources = useLiveQuery(() => listAllResources(), [profile?.id]);

  const filtered = useMemo(() => {
    return resources.filter((resource) => {
      if (category !== 'all' && resource.category !== category) return false;
      if (status === 'active' && !resource.active) return false;
      if (status === 'inactive' && resource.active) return false;
      if (search.trim()) {
        return [resource.name, resource.institutionName, resource.location, resource.ownerName]
          .join(' ')
          .toLowerCase()
          .includes(search.toLowerCase());
      }
      return true;
    });
  }, [resources, category, status, search]);

  if (!profile) return null;

  function handleToggle(resource: ResourceWithMeta) {
    try {
      toggleResourceActive(profile!.id, resource.id);
      toast.success(resource.active ? 'Listing deactivated' : 'Listing activated', `${resource.name} was updated.`);
    } catch (error) {
      toast.error('Could not update listing', error instanceof Error ? error.message : 'Try again.');
    }
  }

  function handleDelete() {
    if (!deleteTarget) return;
    setWorking(true);
    try {
      deleteResource(profile!.id, deleteTarget.id);
      toast.success('Listing deleted', `${deleteTarget.name} was removed. Past bookings remain in history.`);
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
        title="Resource listings"
        description="Platform-wide inventory oversight. Managers can only change listings they are responsible for."
        actions={<Badge tone="navy">{resources.filter((resource) => resource.active).length} active of {resources.length}</Badge>}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search listings or owners" className="pl-9" aria-label="Search listings" />
        </div>
        <Select value={category} onChange={(event) => setCategory(event.target.value)} className="max-w-[210px]" aria-label="Filter by category">
          <option value="all">All categories</option>
          {CATEGORIES.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </Select>
        <Select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className="max-w-[150px]" aria-label="Filter by status">
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </Select>
        <Badge tone="slate">{filtered.length} listing(s)</Badge>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState icon={Boxes} title="No listings match" description="Adjust the filters or search for another owner." />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((resource) => {
            const canManage = canManageResource(profile, resource);
            return (
              <Card key={resource.id} className="flex flex-col overflow-hidden">
                <div className="relative h-32 w-full overflow-hidden bg-slate-100">
                  <img src={resource.image} alt={resource.name} className="h-full w-full object-cover" />
                  <div className="absolute left-2 top-2 flex gap-1.5">
                    <Badge tone={resource.active ? 'green' : 'slate'} dot>{resource.active ? 'Active' : 'Inactive'}</Badge>
                    {resource.availableNow ? <Badge tone="navy">Open now</Badge> : null}
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="text-sm font-semibold text-ink">{resource.name}</h3>
                  <p className="mt-0.5 text-[11px] text-slate-500">{resource.category}</p>
                  <div className="mt-2 space-y-0.5 text-[11px] text-slate-500">
                    <p>{resource.institutionName}</p>
                    <p>Owner: {resource.ownerName}</p>
                    <p>{resource.location}</p>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3">
                    <Badge tone="slate">{formatCurrency(resource.hourlyRate)}/hr</Badge>
                    <Badge tone="slate">{resource.bookingCount} bookings</Badge>
                    {!canManage ? <Badge tone="amber">View only</Badge> : null}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <Link to={`/resources/${resource.id}`} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50">
                      <Eye className="h-3 w-3" /> View
                    </Link>
                    <Button size="sm" variant="outline" onClick={() => handleToggle(resource)} disabled={!canManage} icon={<Power className="h-3 w-3" />}>
                      {resource.active ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button size="sm" variant="ghost" className="text-rose-600 hover:bg-rose-50" onClick={() => setDeleteTarget(resource)} disabled={!canManage} icon={<Trash2 className="h-3 w-3" />}>
                      Delete
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <div className={cn('mt-5 flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-xs leading-relaxed text-slate-500')}>
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
        <p>
          Deactivating hides a listing from discovery without deleting history. Deletion is blocked while a listing
          has pending or active bookings — resolve those first, then delete or keep the listing inactive.
        </p>
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete this listing permanently?"
        message={`${deleteTarget?.name ?? 'This listing'} and its eligibility rules/waitlist entries will be removed. Historical bookings remain in the audit trail. This cannot be undone.`}
        confirmLabel="Delete listing"
        tone="danger"
        loading={working}
      />
    </div>
  );
}
