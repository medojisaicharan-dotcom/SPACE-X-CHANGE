import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BadgeCheck,
  Building2,
  CheckCircle2,
  Clock,
  FileUp,
  GraduationCap,
  ShieldCheck,
  Upload,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button, buttonStyles } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { Select } from '@/components/ui/Select';
import { QualificationStatusBadge } from '@/components/ui/StatusBadge';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useLiveQuery } from '@/hooks/useLiveQuery';
import { listAllResources } from '@/services/resourceService';
import {
  evaluateEligibility,
  listQualifications,
  listRequirements,
  uploadQualification,
} from '@/services/eligibilityService';
import { CATEGORY_IMAGES } from '@/types';
import { cn, formatDate } from '@/utils/format';

export function Eligibility() {
  const { profile } = useAuth();
  const toast = useToast();
  const [requirement, setRequirement] = useState('');
  const [documentName, setDocumentName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const data = useLiveQuery(() => {
    if (!profile) return null;
    const resources = listAllResources().filter((resource) => resource.active);
    const labels = new Set<string>();
    resources.forEach((resource) => {
      resource.requiredQualifications.forEach((label) => labels.add(label));
      resource.requiredTraining.forEach((label) => labels.add(label));
      listRequirements(resource.id).forEach((rule) => labels.add(rule.label));
    });
    return {
      resources,
      requirements: [...labels].sort(),
      qualifications: listQualifications(profile.id),
      resourceEligibility: resources
        .map((resource) => ({
          resource,
          result: evaluateEligibility(profile.id, resource),
          hasRules:
            resource.requiredQualifications.length > 0 ||
            resource.requiredTraining.length > 0 ||
            listRequirements(resource.id).length > 0,
        }))
        .filter((entry) => entry.hasRules),
    };
  }, [profile?.id]);

  const existingNames = useMemo(
    () => new Set(data?.qualifications.filter((q) => q.status !== 'rejected').map((q) => q.name) ?? []),
    [data],
  );

  if (!profile || !data) return null;

  const accountChecks = [
    {
      label: 'Account verification',
      ok: profile.verified,
      detail: profile.verified ? 'Verified by your institution.' : 'Awaiting administrator verification.',
    },
    {
      label: 'Institution membership',
      ok: Boolean(profile.institutionId),
      detail: profile.institutionId ? profile.institutionName : 'Link an institution from Account settings.',
    },
    {
      label: 'Account standing',
      ok: !profile.suspended,
      detail: profile.suspended ? 'Account suspended.' : 'No restrictions on this account.',
    },
  ];

  const userId = profile.id;

  async function handleUpload(event: React.FormEvent) {
    event.preventDefault();
    if (!requirement.trim()) {
      toast.warning('Choose a requirement', 'Select the requirement this evidence supports.');
      return;
    }
    if (!documentName.trim()) {
      toast.warning('Attach a document', 'Choose a file name or document reference.');
      return;
    }
    setSubmitting(true);
    try {
      uploadQualification(userId, { name: requirement, documentName });
      toast.success('Evidence submitted', 'A manager will review your document. This is not auto-approved.');
      setRequirement('');
      setDocumentName('');
    } catch (error) {
      toast.error('Upload failed', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Eligibility"
        description="Manage the evidence that unlocks access to laboratories, workshops and safety-critical equipment."
        actions={
          <Link to="/explore" className={buttonStyles('outline', 'md')}>
            Check resources
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {accountChecks.map((check) => (
          <Card key={check.label} className="p-4">
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                  check.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700',
                )}
              >
                {check.ok ? <CheckCircle2 className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">{check.label}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{check.detail}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1.15fr]">
        <Card>
          <CardHeader title="Upload evidence" description="Documents are reviewed by a manager or administrator." />
          <CardBody>
            {data.requirements.length === 0 ? (
              <p className="text-xs text-slate-500">No qualifications are currently required by any listing.</p>
            ) : (
              <form onSubmit={handleUpload} className="space-y-4">
                <Select
                  label="Requirement"
                  value={requirement}
                  onChange={(event) => setRequirement(event.target.value)}
                  requiredMark
                >
                  <option value="">Select a requirement</option>
                  {data.requirements.map((label) => (
                    <option key={label} value={label} disabled={existingNames.has(label)}>
                      {label}
                      {existingNames.has(label) ? ' (already uploaded)' : ''}
                    </option>
                  ))}
                </Select>
                <div>
                  <p className="label-base">Supporting document</p>
                  <label className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center transition hover:border-navy-400 hover:bg-navy-50/40">
                    <FileUp className="h-5 w-5 text-slate-400" />
                    <span className="text-xs font-medium text-slate-600">
                      {documentName || 'Choose a certificate, licence or training record'}
                    </span>
                    <span className="text-[10px] text-slate-400">PDF or image · demo stores the file name only</span>
                    <input
                      type="file"
                      accept="application/pdf,image/*"
                      className="hidden"
                      onChange={(event) => setDocumentName(event.target.files?.[0]?.name ?? '')}
                    />
                  </label>
                  <Input
                    className="mt-2"
                    value={documentName}
                    onChange={(event) => setDocumentName(event.target.value)}
                    placeholder="Or type a document reference"
                    aria-label="Document reference"
                  />
                </div>
                <Button type="submit" loading={submitting} icon={<Upload className="h-4 w-4" />} className="w-full">
                  Submit for review
                </Button>
                <p className="text-[11px] leading-relaxed text-slate-500">
                  Evidence is never auto-approved. You will receive a notification when a reviewer verifies
                  or rejects the document.
                </p>
              </form>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="My evidence" description="Uploaded documents and review outcomes." />
          {data.qualifications.length === 0 ? (
            <EmptyState
              icon={GraduationCap}
              title="No evidence uploaded"
              description="If a resource requires a qualification or training record, upload it here to start the review."
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.qualifications.map((qualification) => (
                <li key={qualification.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                    <GraduationCap className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{qualification.name}</p>
                    <p className="truncate text-[11px] text-slate-500">
                      {qualification.documentName} · uploaded {formatDate(qualification.uploadedAt)}
                    </p>
                    {qualification.reviewerNotes ? (
                      <p className="mt-1 text-[11px] text-slate-500">Reviewer: {qualification.reviewerNotes}</p>
                    ) : null}
                  </div>
                  <QualificationStatusBadge status={qualification.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="mt-5">
        <CardHeader
          title="Resource eligibility"
          description="Listings with prerequisites and your current status for each."
        />
        {data.resourceEligibility.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="No prerequisites in the catalogue"
            description="All active listings are open to verified members of an institution."
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.resourceEligibility.map(({ resource, result }) => (
              <li key={resource.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                <img
                  src={resource.image || CATEGORY_IMAGES[resource.category]}
                  alt={resource.name}
                  className="h-10 w-10 rounded-lg border border-slate-200 object-cover"
                />
                <div className="min-w-0 flex-1">
                  <Link to={`/resources/${resource.id}`} className="truncate text-sm font-medium text-ink hover:text-navy-700">
                    {resource.name}
                  </Link>
                  <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500">
                    <Building2 className="h-3 w-3" /> {resource.institutionName}
                  </p>
                  {result.reasons.length > 0 && result.status !== 'eligible' ? (
                    <p className="mt-1 line-clamp-2 text-[11px] text-amber-700">{result.reasons[0]}</p>
                  ) : null}
                </div>
                <Badge tone={result.status === 'eligible' ? 'green' : result.status === 'pending' ? 'amber' : 'rose'} dot>
                  {result.status === 'eligible' ? 'Eligible' : result.status === 'pending' ? 'Pending review' : 'Not eligible'}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="mt-5 flex items-start gap-3 rounded-2xl border border-navy-100 bg-navy-50 p-4 text-xs leading-relaxed text-navy-800">
        <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Eligibility is evaluated per resource. Account verification and institution membership are
          required for every booking. Qualification and training evidence must match the requirement label
          exactly and be verified by a human reviewer.
        </p>
      </div>
    </div>
  );
}
