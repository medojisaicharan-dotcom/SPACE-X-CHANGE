import { useMemo, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  Mail,
  MapPin,
  Plus,
  Search,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useLiveQuery } from '@/hooks/useLiveQuery';
import {
  createInstitution,
  listInstitutions,
  listUsers,
  setInstitutionVerified,
} from '@/services/adminService';
import { listAllResources } from '@/services/resourceService';
import { formatDate } from '@/utils/format';

const EMPTY_FORM = { name: '', type: 'College', location: '', contactEmail: '' };

export function AdminInstitutions() {
  const { profile } = useAuth();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [onlyUnverified, setOnlyUnverified] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [working, setWorking] = useState(false);

  const data = useLiveQuery(() => ({
    institutions: listInstitutions(),
    resources: listAllResources(),
    users: listUsers(),
  }), [profile?.id]);

  const filtered = useMemo(() => {
    return data.institutions.filter((institution) => {
      if (onlyUnverified && institution.verified) return false;
      if (search.trim()) {
        return [institution.name, institution.location, institution.type, institution.contactEmail]
          .join(' ')
          .toLowerCase()
          .includes(search.toLowerCase());
      }
      return true;
    });
  }, [data.institutions, onlyUnverified, search]);

  if (!profile) return null;

  const canCreate = ['administrator', 'institution_manager'].includes(profile.role);

  function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setFormError('');
    if (!form.name.trim() || !form.location.trim() || !form.contactEmail.trim()) {
      setFormError('Name, location and contact email are required.');
      return;
    }
    setWorking(true);
    try {
      createInstitution(profile!.id, form);
      toast.success('Institution added', `${form.name} is now available to members during signup.`);
      setCreateOpen(false);
      setForm(EMPTY_FORM);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not add the institution.');
    } finally {
      setWorking(false);
    }
  }

  function handleVerify(institutionId: string, verified: boolean, name: string) {
    try {
      setInstitutionVerified(profile!.id, institutionId, verified);
      toast.success(verified ? 'Institution verified' : 'Verification removed', `${name} has been updated.`);
    } catch (error) {
      toast.error('Could not update institution', error instanceof Error ? error.message : 'Try again.');
    }
  }

  return (
    <div>
      <PageHeader
        title="Institutions"
        description="Campus and organisation partners that members link to during signup."
        actions={
          canCreate ? (
            <Button onClick={() => setCreateOpen(true)} icon={<Plus className="h-4 w-4" />}>
              Add institution
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search institutions" className="pl-9" aria-label="Search institutions" />
        </div>
        <button
          type="button"
          onClick={() => setOnlyUnverified((value) => !value)}
          className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
            onlyUnverified ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          <ShieldCheck className="h-3.5 w-3.5" /> Unverified only
        </button>
        <Badge tone="slate">{filtered.length} institution(s)</Badge>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState icon={Building2} title="No institutions found" description="Add a partner institution or adjust your filters." />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((institution) => {
            const resourceCount = data.resources.filter((resource) => resource.institutionId === institution.id).length;
            const memberCount = data.users.filter((user) => user.institutionId === institution.id).length;
            return (
              <Card key={institution.id} className="flex flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-50 text-navy-700">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <Badge tone={institution.verified ? 'green' : 'amber'} dot>
                    {institution.verified ? 'Verified' : 'Unverified'}
                  </Badge>
                </div>
                <h3 className="mt-3 text-sm font-semibold text-ink">{institution.name}</h3>
                <p className="text-[11px] text-slate-500">{institution.type}</p>
                <div className="mt-3 space-y-1.5 text-[11px] text-slate-500">
                  <p className="flex items-center gap-1.5"><MapPin className="h-3 w-3 text-slate-400" /> {institution.location}</p>
                  <p className="flex items-center gap-1.5"><Mail className="h-3 w-3 text-slate-400" /> {institution.contactEmail}</p>
                  <p className="text-slate-400">Added {formatDate(institution.createdAt)}</p>
                </div>
                <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
                  <Badge tone="slate">{resourceCount} listings</Badge>
                  <Badge tone="slate">{memberCount} members</Badge>
                </div>
                <Button
                  className="mt-3 w-full"
                  size="sm"
                  variant={institution.verified ? 'outline' : 'success'}
                  onClick={() => handleVerify(institution.id, !institution.verified, institution.name)}
                >
                  {institution.verified ? <><XCircle className="h-3.5 w-3.5" /> Remove verification</> : <><CheckCircle2 className="h-3.5 w-3.5" /> Verify institution</>}
                </Button>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Add an institution"
        description="Partner institutions appear in the signup selector and group resources locally."
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={working}>Cancel</Button>
            <Button onClick={handleCreate} loading={working} icon={<Plus className="h-4 w-4" />}>Add institution</Button>
          </>
        }
      >
        <form onSubmit={handleCreate} className="space-y-3">
          <Input label="Institution name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. Northfield Institute of Technology" requiredMark />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Type" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })} placeholder="College, University, Makerspace…" />
            <Input label="Location" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} placeholder="Hyderabad, Telangana" requiredMark />
          </div>
          <Input label="Contact email" type="email" value={form.contactEmail} onChange={(event) => setForm({ ...form, contactEmail: event.target.value })} placeholder="labs@institution.edu" requiredMark />
          {formError ? <p className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs font-medium text-rose-700">{formError}</p> : null}
          <p className="text-[11px] leading-relaxed text-slate-400">
            New institutions start unverified. Verification signals to members that the organisation is a trusted
            partner; it does not automatically verify individual accounts.
          </p>
        </form>
      </Modal>
    </div>
  );
}
