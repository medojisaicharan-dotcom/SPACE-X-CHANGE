import { useMemo, useState } from 'react';
import {
  BadgeCheck,
  Ban,
  CheckCircle2,
  FileCheck2,
  Search,
  ShieldCheck,
  UserCog,
  Users,
  XCircle,
} from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { QualificationStatusBadge } from '@/components/ui/StatusBadge';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useLiveQuery } from '@/hooks/useLiveQuery';
import {
  listUsers,
  setUserSuspended,
  setUserVerified,
  updateUserRole,
} from '@/services/adminService';
import { listAllQualifications, reviewQualification } from '@/services/eligibilityService';
import { ROLE_LABELS, type Profile, type Role, type UserQualification } from '@/types';
import { cn, formatDateTime, timeAgo } from '@/utils/format';

const ROLES = Object.entries(ROLE_LABELS) as [Role, string][];

export function AdminUsers() {
  const { profile } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState<'people' | 'evidence'>('people');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | Role>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'unverified' | 'suspended'>('all');
  const [roleTarget, setRoleTarget] = useState<Profile | null>(null);
  const [nextRole, setNextRole] = useState<Role>('user');
  const [suspendTarget, setSuspendTarget] = useState<Profile | null>(null);
  const [reviewTarget, setReviewTarget] = useState<UserQualification | null>(null);
  const [notes, setNotes] = useState('');
  const [working, setWorking] = useState(false);

  const data = useLiveQuery(() => ({ users: listUsers(), qualifications: listAllQualifications() }), [profile?.id]);

  const filteredUsers = useMemo(() => {
    return data.users.filter((user) => {
      if (roleFilter !== 'all' && user.role !== roleFilter) return false;
      if (statusFilter === 'suspended' && !user.suspended) return false;
      if (statusFilter === 'verified' && !user.verified) return false;
      if (statusFilter === 'unverified' && (user.verified || user.suspended)) return false;
      if (search.trim()) {
        return [user.fullName, user.email, user.institutionName]
          .join(' ')
          .toLowerCase()
          .includes(search.toLowerCase());
      }
      return true;
    });
  }, [data.users, roleFilter, statusFilter, search]);

  const filteredEvidence = useMemo(() => {
    return data.qualifications.filter((qualification) => {
      if (!search.trim()) return true;
      const user = data.users.find((candidate) => candidate.id === qualification.userId);
      return [qualification.name, qualification.documentName, user?.fullName, user?.email]
        .join(' ')
        .toLowerCase()
        .includes(search.toLowerCase());
    });
  }, [data.qualifications, data.users, search]);

  if (!profile) return null;

  const isAdmin = profile.role === 'administrator';
  const pendingEvidence = data.qualifications.filter((qualification) => qualification.status === 'pending');
  const unverified = data.users.filter((user) => !user.verified && !user.suspended);

  function openRoleModal(user: Profile) {
    setRoleTarget(user);
    setNextRole(user.role);
  }

  function handleRoleChange() {
    if (!roleTarget) return;
    setWorking(true);
    try {
      updateUserRole(profile!.id, roleTarget.id, nextRole);
      toast.success('Role updated', `${roleTarget.fullName} is now a ${ROLE_LABELS[nextRole].toLowerCase()}.`);
      setRoleTarget(null);
    } catch (error) {
      toast.error('Could not change role', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setWorking(false);
    }
  }

  function handleVerified(user: Profile, verified: boolean) {
    try {
      setUserVerified(profile!.id, user.id, verified);
      toast.success(verified ? 'Account verified' : 'Verification removed', `${user.fullName} has been notified.`);
    } catch (error) {
      toast.error('Could not update account', error instanceof Error ? error.message : 'Try again.');
    }
  }

  function handleSuspend() {
    if (!suspendTarget) return;
    setWorking(true);
    try {
      setUserSuspended(profile!.id, suspendTarget.id, !suspendTarget.suspended);
      toast.success(suspendTarget.suspended ? 'Account reinstated' : 'Account suspended', `${suspendTarget.fullName} has been notified.`);
      setSuspendTarget(null);
    } catch (error) {
      toast.error('Could not update account', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setWorking(false);
    }
  }

  function handleReview(status: 'verified' | 'rejected') {
    if (!reviewTarget) return;
    if (status === 'rejected' && notes.trim().length < 5) {
      toast.error('Add a reason', 'Explain why the evidence cannot be accepted.');
      return;
    }
    setWorking(true);
    try {
      reviewQualification(profile!.id, reviewTarget.id, status, notes);
      toast.success(
        status === 'verified' ? 'Evidence verified' : 'Evidence rejected',
        'The member has been notified with your review notes.',
      );
      setReviewTarget(null);
      setNotes('');
    } catch (error) {
      toast.error('Could not review evidence', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setWorking(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Users & eligibility"
        description="Verify accounts, manage access roles, suspend abuse and review uploaded evidence."
        actions={
          <div className="flex gap-2">
            <Badge tone="amber">{unverified.length} unverified</Badge>
            <Badge tone="navy">{pendingEvidence.length} evidence pending</Badge>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
          {(['people', 'evidence'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setTab(option)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition',
                tab === option ? 'bg-navy-900 text-white' : 'text-slate-500 hover:text-navy-700',
              )}
            >
              {option === 'people' ? 'People' : `Evidence (${data.qualifications.length})`}
            </button>
          ))}
        </div>
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={tab === 'people' ? 'Search people' : 'Search evidence or member'}
            className="pl-9"
            aria-label="Search"
          />
        </div>
        {tab === 'people' ? (
          <>
            <Select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as typeof roleFilter)} className="max-w-[170px]" aria-label="Filter by role">
              <option value="all">All roles</option>
              {ROLES.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
            <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className="max-w-[170px]" aria-label="Filter by status">
              <option value="all">All statuses</option>
              <option value="verified">Verified</option>
              <option value="unverified">Unverified</option>
              <option value="suspended">Suspended</option>
            </Select>
            <Badge tone="slate">{filteredUsers.length} member(s)</Badge>
          </>
        ) : (
          <Badge tone="slate">{filteredEvidence.length} record(s)</Badge>
        )}
      </div>

      {tab === 'people' ? (
        filteredUsers.length === 0 ? (
          <Card>
            <EmptyState icon={Users} title="No members match" description="Adjust the filters or search terms." />
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Role</th>
                    <th>Institution</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => {
                    const isSelf = user.id === profile.id;
                    return (
                      <tr key={user.id}>
                        <td>
                          <div className="flex items-center gap-2.5">
                            <Avatar name={user.fullName} size="sm" />
                            <div className="min-w-0">
                              <p className="truncate text-xs font-semibold text-ink">{user.fullName}{isSelf ? ' (you)' : ''}</p>
                              <p className="truncate text-[11px] text-slate-500">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td><Badge tone={user.role === 'administrator' ? 'purple' : user.role === 'institution_manager' ? 'navy' : user.role === 'resource_owner' ? 'teal' : 'slate'}>{ROLE_LABELS[user.role]}</Badge></td>
                        <td className="text-xs text-slate-600">{user.institutionName || '—'}</td>
                        <td>
                          <div className="flex flex-wrap gap-1">
                            {user.suspended ? <Badge tone="rose" dot>Suspended</Badge> : user.verified ? <Badge tone="green" dot>Verified</Badge> : <Badge tone="amber" dot>Unverified</Badge>}
                          </div>
                        </td>
                        <td>
                          <div className="flex flex-wrap justify-end gap-1">
                            <Button size="sm" variant="ghost" onClick={() => handleVerified(user, !user.verified)}>
                              {user.verified ? <XCircle className="h-3.5 w-3.5" /> : <BadgeCheck className="h-3.5 w-3.5" />}
                              {user.verified ? 'Unverify' : 'Verify'}
                            </Button>
                            {isAdmin ? (
                              <>
                                <Button size="sm" variant="ghost" onClick={() => openRoleModal(user)} disabled={isSelf}>
                                  <UserCog className="h-3.5 w-3.5" /> Role
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className={user.suspended ? 'text-emerald-600 hover:bg-emerald-50' : 'text-rose-600 hover:bg-rose-50'}
                                  onClick={() => setSuspendTarget(user)}
                                  disabled={isSelf}
                                >
                                  <Ban className="h-3.5 w-3.5" /> {user.suspended ? 'Reinstate' : 'Suspend'}
                                </Button>
                              </>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )
      ) : filteredEvidence.length === 0 ? (
        <Card>
          <EmptyState icon={FileCheck2} title="No evidence records" description="Members can upload qualifications and training certificates from their eligibility page." />
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredEvidence.map((qualification) => {
            const user = data.users.find((candidate) => candidate.id === qualification.userId);
            return (
              <Card key={qualification.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy-50 text-navy-700">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">{qualification.name}</p>
                      <p className="text-xs text-slate-500">
                        {user?.fullName ?? 'Unknown member'} · {user?.email}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        {qualification.documentName} · uploaded {timeAgo(qualification.uploadedAt)}
                        {qualification.reviewedAt ? ` · reviewed ${formatDateTime(qualification.reviewedAt)}` : ''}
                      </p>
                      {qualification.reviewerNotes ? (
                        <p className="mt-2 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px] text-slate-600">Note: {qualification.reviewerNotes}</p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <QualificationStatusBadge status={qualification.status} />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setReviewTarget(qualification);
                        setNotes(qualification.reviewerNotes);
                      }}
                    >
                      Review
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={Boolean(roleTarget)}
        onClose={() => setRoleTarget(null)}
        title="Change account role"
        description={roleTarget ? `${roleTarget.fullName} · ${roleTarget.email}` : undefined}
        footer={
          <>
            <Button variant="outline" onClick={() => setRoleTarget(null)} disabled={working}>Cancel</Button>
            <Button onClick={handleRoleChange} loading={working} disabled={nextRole === roleTarget?.role}>
              Update role
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Select label="New role" value={nextRole} onChange={(event) => setNextRole(event.target.value as Role)}>
            {ROLES.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Select>
          <p className="rounded-xl bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-800">
            Changing a role immediately changes what this member can access. Removing the final administrator is
            blocked automatically. The member is notified.
          </p>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(suspendTarget)}
        onClose={() => setSuspendTarget(null)}
        onConfirm={handleSuspend}
        title={suspendTarget?.suspended ? 'Reinstate this account?' : 'Suspend this account?'}
        message={
          suspendTarget?.suspended
            ? `${suspendTarget.fullName} will regain access. Existing bookings and listings are not removed.`
            : `${suspendTarget?.fullName ?? 'This member'} will be signed out of new actions. Existing records remain visible to administrators in the audit trail.`
        }
        confirmLabel={suspendTarget?.suspended ? 'Reinstate account' : 'Suspend account'}
        tone={suspendTarget?.suspended ? 'primary' : 'danger'}
        loading={working}
      />

      <Modal
        open={Boolean(reviewTarget)}
        onClose={() => setReviewTarget(null)}
        title="Review eligibility evidence"
        description={reviewTarget ? `${reviewTarget.name} · ${reviewTarget.documentName}` : undefined}
        footer={
          <>
            <Button variant="outline" onClick={() => setReviewTarget(null)} disabled={working}>Cancel</Button>
            <Button variant="danger" onClick={() => handleReview('rejected')} loading={working} icon={<XCircle className="h-4 w-4" />}>
              Reject
            </Button>
            <Button variant="success" onClick={() => handleReview('verified')} loading={working} icon={<CheckCircle2 className="h-4 w-4" />}>
              Verify
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
            <p className="font-semibold text-ink">Document</p>
            <p className="mt-0.5">{reviewTarget?.documentName}</p>
            <p className="mt-1 text-[11px] text-slate-400">Uploaded {reviewTarget ? formatDateTime(reviewTarget.uploadedAt) : ''}</p>
          </div>
          <Textarea
            label="Review notes"
            rows={3}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Record what you checked. Required when rejecting."
            hint="The member sees these notes on their eligibility page."
          />
          <p className="rounded-xl bg-navy-50 p-3 text-[11px] leading-relaxed text-navy-800">
            Only verify evidence you have actually inspected. Rejecting does not penalise the member, but it does
            unlock a fresh upload.
          </p>
        </div>
      </Modal>
    </div>
  );
}
