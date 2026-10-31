import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpenCheck,
  FileCheck2,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { buttonStyles } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Select } from '@/components/ui/Select';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useLiveQuery } from '@/hooks/useLiveQuery';
import { listUsers } from '@/services/adminService';
import {
  addRequirement,
  listAllQualifications,
  listRequirements,
  removeRequirement,
} from '@/services/eligibilityService';
import { listAllResources } from '@/services/resourceService';
import type { EligibilityRequirement } from '@/types';

export function AdminEligibility() {
  const { profile } = useAuth();
  const toast = useToast();
  const [resourceId, setResourceId] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [type, setType] = useState<EligibilityRequirement['type']>('qualification');
  const [error, setError] = useState('');
  const [removeTarget, setRemoveTarget] = useState<EligibilityRequirement | null>(null);
  const [working, setWorking] = useState(false);

  const data = useLiveQuery(() => ({
    resources: listAllResources(),
    qualifications: listAllQualifications(),
    users: listUsers(),
  }), [profile?.id]);

  useEffect(() => {
    if (!resourceId && data.resources.length > 0) setResourceId(data.resources[0].id);
  }, [data.resources, resourceId]);

  const selected = data.resources.find((resource) => resource.id === resourceId);
  const requirements = useMemo(
    () => (selected ? listRequirements(selected.id) : []),
    [selected, data.resources],
  );
  const pendingEvidence = data.qualifications.filter((qualification) => qualification.status === 'pending');

  if (!profile) return null;

  function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    if (!selected) return;
    if (!label.trim()) {
      setError('Enter a requirement label.');
      return;
    }
    setWorking(true);
    try {
      addRequirement(profile!.id, { resourceId: selected.id, label, type });
      toast.success('Rule added', `"${label.trim()}" is now part of this resource's eligibility checks.`);
      setAddOpen(false);
      setLabel('');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not add the rule.');
    } finally {
      setWorking(false);
    }
  }

  function handleRemove() {
    if (!removeTarget) return;
    setWorking(true);
    try {
      removeRequirement(profile!.id, removeTarget.id);
      toast.success('Rule removed', `"${removeTarget.label}" no longer blocks bookings.`);
      setRemoveTarget(null);
    } catch (error) {
      toast.error('Could not remove rule', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setWorking(false);
    }
  }

  const baseRequirements = selected
    ? [
        ...selected.requiredQualifications.map((item) => ({ label: item, type: 'qualification' as const })),
        ...selected.requiredTraining.map((item) => ({ label: item, type: 'training' as const })),
      ]
    : [];

  return (
    <div>
      <PageHeader
        title="Eligibility rules"
        description="Define the evidence members need before a listing can be approved. Verification stays human-reviewed."
        actions={
          <Link to="/admin/users" className={buttonStyles('outline', 'md')}>
            <FileCheck2 className="h-4 w-4" /> Review evidence ({pendingEvidence.length})
          </Link>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
        <div className="space-y-4">
          <Card>
            <CardBody>
              <Select label="Resource" value={selected?.id ?? ''} onChange={(event) => setResourceId(event.target.value)}>
                {data.resources.map((resource) => (
                  <option key={resource.id} value={resource.id}>{resource.name}</option>
                ))}
              </Select>
            </CardBody>
          </Card>

          {selected ? (
            <Card>
              <CardHeader title="How it is evaluated" description="Three checks are always applied before custom rules." />
              <CardBody className="space-y-3 text-xs">
                <div className="flex items-start gap-2">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  <p className="text-slate-600"><span className="font-semibold text-ink">Account verification.</span> The member's account must be verified and not suspended.</p>
                </div>
                <div className="flex items-start gap-2">
                  <BookOpenCheck className="mt-0.5 h-4 w-4 shrink-0 text-navy-500" />
                  <p className="text-slate-600"><span className="font-semibold text-ink">Institution membership.</span> A linked institution is required.</p>
                </div>
                <div className="flex items-start gap-2">
                  <FileCheck2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  <p className="text-slate-600"><span className="font-semibold text-ink">Evidence.</span> Each requirement must have verified evidence. Pending evidence creates a pending state rather than a pass.</p>
                </div>
                {selected.supervisionRequired ? (
                  <div className="rounded-xl bg-navy-50 p-2.5 text-[11px] text-navy-800">
                    Supervision is required for this listing. A technician is assumed present during sessions.
                  </div>
                ) : null}
              </CardBody>
            </Card>
          ) : null}
        </div>

        <div className="space-y-4">
          {!selected ? (
            <Card>
              <EmptyState icon={ShieldCheck} title="Select a resource" description="Choose a listing to review its eligibility rules." />
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader
                  title={selected.name}
                  description={`${selected.institutionName} · ${selected.category}`}
                  action={
                    <Button size="sm" onClick={() => { setAddOpen(true); setError(''); setLabel(''); }} icon={<Plus className="h-3.5 w-3.5" />}>
                      Add rule
                    </Button>
                  }
                />
                <CardBody className="space-y-4">
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Listing requirements</p>
                    {baseRequirements.length === 0 ? (
                      <p className="text-xs text-slate-500">No qualifications or training listed on the resource.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {baseRequirements.map((requirement) => (
                          <Badge key={`${requirement.type}-${requirement.label}`} tone="navy">
                            {requirement.label}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <p className="mt-2 text-[11px] text-slate-400">Edit these on the resource listing itself.</p>
                  </div>

                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Additional platform rules</p>
                    {requirements.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500">
                        No additional rules. Add one to require extra evidence for this listing.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                        {requirements.map((requirement) => (
                          <div key={requirement.id} className="flex items-center justify-between gap-2 px-3 py-2.5">
                            <div>
                              <p className="text-xs font-medium text-ink">{requirement.label}</p>
                              <p className="text-[10px] capitalize text-slate-400">{requirement.type} · mandatory</p>
                            </div>
                            <Button size="sm" variant="ghost" className="text-rose-600 hover:bg-rose-50" onClick={() => setRemoveTarget(requirement)} icon={<Trash2 className="h-3.5 w-3.5" />}>
                              Remove
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardHeader title="Members awaiting evidence review" description="Newest uploads across all listings." />
                {pendingEvidence.length === 0 ? (
                  <div className="px-5 py-5 text-xs text-slate-500">No evidence is waiting for review.</div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {pendingEvidence.slice(0, 5).map((qualification) => {
                      const user = data.users.find((candidate) => candidate.id === qualification.userId);
                      return (
                        <div key={qualification.id} className="flex items-center justify-between gap-2 px-5 py-3">
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-ink">{qualification.name}</p>
                            <p className="text-[11px] text-slate-500">{user?.fullName ?? 'Member'} · {qualification.documentName}</p>
                          </div>
                          <Link to="/admin/users" className="text-[11px] font-semibold text-navy-700 hover:underline">Review</Link>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>

              <div className="flex items-start gap-2 rounded-2xl border border-navy-100 bg-navy-50 p-4 text-xs leading-relaxed text-navy-800">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
                Evidence checks are deterministic. The platform never auto-verifies a certificate or grants access
                based on a description alone — a manager must review and verify each upload.
              </div>
            </>
          )}
        </div>
      </div>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add an eligibility rule"
        description={selected ? `For ${selected.name}` : undefined}
        footer={
          <>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={working}>Cancel</Button>
            <Button onClick={handleAdd} loading={working} icon={<Plus className="h-4 w-4" />}>Add rule</Button>
          </>
        }
      >
        <form onSubmit={handleAdd} className="space-y-3">
          <Input
            label="Requirement label"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="e.g. Laser safety induction"
            hint="Members upload evidence with this exact name. Keep labels short and consistent."
            requiredMark
          />
          <Select label="Type" value={type} onChange={(event) => setType(event.target.value as EligibilityRequirement['type'])}>
            <option value="qualification">Qualification</option>
            <option value="training">Training</option>
            <option value="institution">Institution approval</option>
            <option value="verification">Account verification</option>
          </Select>
          {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs font-medium text-rose-700">{error}</p> : null}
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(removeTarget)}
        onClose={() => setRemoveTarget(null)}
        onConfirm={handleRemove}
        title="Remove this eligibility rule?"
        message={`"${removeTarget?.label ?? 'This rule'}" will no longer block bookings. Existing verified evidence is kept.`}
        confirmLabel="Remove rule"
        tone="danger"
        loading={working}
      />
    </div>
  );
}
