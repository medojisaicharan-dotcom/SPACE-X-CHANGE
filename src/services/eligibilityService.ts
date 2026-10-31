import { getDb, mutateDb } from '@/lib/demoDb';
import { createId } from '@/utils/crypto';
import {
  getProfile,
  isManagerOrAdmin,
  nowISO,
  pushAudit,
  pushNotification,
  requireProfile,
  ServiceError,
} from '@/services/core';
import type {
  EligibilityRequirement,
  EligibilityResult,
  Profile,
  Resource,
  UserQualification,
} from '@/types';

function resolveRequirement(
  qualifications: UserQualification[],
  label: string,
): { state: 'pass' | 'pending' | 'fail'; detail: string } {
  const matches = qualifications.filter(
    (q) => q.name.trim().toLowerCase() === label.trim().toLowerCase(),
  );
  if (matches.length === 0) {
    return { state: 'fail', detail: 'No uploaded evidence for this requirement.' };
  }
  if (matches.some((q) => q.status === 'verified')) {
    return { state: 'pass', detail: 'Verified by an authorised reviewer.' };
  }
  if (matches.some((q) => q.status === 'pending')) {
    return { state: 'pending', detail: 'Document uploaded — awaiting human review.' };
  }
  return { state: 'fail', detail: 'The uploaded evidence was rejected. Please upload again.' };
}

export function evaluateEligibility(userId: string, resource: Resource): EligibilityResult {
  const db = getDb();
  const profile = getProfile(db, userId);
  const checks: EligibilityResult['checks'] = [];
  const reasons: string[] = [];

  if (!profile) {
    return {
      status: 'not_eligible',
      reasons: ['Account not found.'],
      checks: [{ label: 'Account', passed: false, detail: 'Account not found.', state: 'fail' }],
    };
  }

  const accountOk = profile.verified && !profile.suspended;
  checks.push({
    label: 'Account verification',
    passed: accountOk,
    detail: profile.suspended
      ? 'Account is suspended.'
      : profile.verified
        ? 'Your account is verified.'
        : 'Your account is awaiting administrator verification.',
    state: accountOk ? 'pass' : 'fail',
  });
  if (profile.suspended) reasons.push('Your account is suspended.');
  else if (!profile.verified) reasons.push('Your account must be verified before booking.');

  const institutionOk = Boolean(profile.institutionId);
  checks.push({
    label: 'Institution membership',
    passed: institutionOk,
    detail: institutionOk
      ? `Linked to ${profile.institutionName}.`
      : 'Link your institution from Account settings.',
    state: institutionOk ? 'pass' : 'fail',
  });
  if (!institutionOk) reasons.push('Link an institution to your account.');

  const qualifications = db.qualifications.filter((q) => q.userId === userId);
  const customRequirements = db.eligibilityRequirements.filter((r) => r.resourceId === resource.id);

  const requirementLabels = new Set<string>();
  resource.requiredQualifications.forEach((q) => requirementLabels.add(q));
  resource.requiredTraining.forEach((t) => requirementLabels.add(t));
  customRequirements.forEach((r) => requirementLabels.add(r.label));

  requirementLabels.forEach((label) => {
    const requirement = resolveRequirement(qualifications, label);
    checks.push({
      label,
      passed: requirement.state === 'pass',
      detail: requirement.detail,
      state: requirement.state,
    });
    if (requirement.state === 'fail') reasons.push(`Missing or rejected evidence: ${label}.`);
    if (requirement.state === 'pending') reasons.push(`Awaiting review for: ${label}.`);
  });

  if (resource.supervisionRequired) {
    checks.push({
      label: 'Supervision',
      passed: true,
      detail: 'This resource is supervised. A technician will be present during your session.',
      state: 'pass',
    });
  }

  const hasFail = checks.some((c) => c.state === 'fail');
  const hasPending = checks.some((c) => c.state === 'pending');
  const status = hasFail ? 'not_eligible' : hasPending ? 'pending' : 'eligible';

  return { status, reasons, checks };
}

export function getEligibilityForResources(userId: string, resources: Resource[]): Record<string, EligibilityResult> {
  const map: Record<string, EligibilityResult> = {};
  resources.forEach((resource) => {
    map[resource.id] = evaluateEligibility(userId, resource);
  });
  return map;
}

export function listQualifications(userId: string): UserQualification[] {
  return getDb()
    .qualifications.filter((q) => q.userId === userId)
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
}

export function listAllQualifications(): UserQualification[] {
  return [...getDb().qualifications].sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
}

export function uploadQualification(
  userId: string,
  input: { name: string; documentName: string },
): UserQualification {
  return mutateDb((db) => {
    const profile = requireProfile(db, userId);
    const name = input.name.trim();
    if (!name) throw new ServiceError('validation', 'Select or enter the requirement name.');
    if (!input.documentName.trim()) {
      throw new ServiceError('validation', 'Attach a supporting document.');
    }
    const duplicate = db.qualifications.find(
      (q) =>
        q.userId === userId &&
        q.name.toLowerCase() === name.toLowerCase() &&
        q.status !== 'rejected',
    );
    if (duplicate) {
      throw new ServiceError('duplicate', `You already have a ${duplicate.status} record for "${name}".`);
    }
    const qualification: UserQualification = {
      id: createId('qual'),
      userId,
      name,
      documentName: input.documentName.trim(),
      status: 'pending',
      reviewerNotes: '',
      uploadedAt: nowISO(),
      reviewedAt: null,
    };
    db.qualifications.unshift(qualification);
    pushNotification(
      db,
      userId,
      'eligibility',
      'Eligibility document submitted',
      `Your document for "${name}" is awaiting human review.`,
      '/dashboard/eligibility',
    );
    db.profiles
      .filter((p) => isManagerOrAdmin(p))
      .forEach((manager) => {
        pushNotification(
          db,
          manager.id,
          'eligibility',
          'Eligibility review needed',
          `${profile.fullName} uploaded evidence for "${name}".`,
          '/admin/users',
        );
      });
    pushAudit(db, profile, 'Eligibility document uploaded', `Uploaded evidence for "${name}".`);
    return qualification;
  });
}

export function reviewQualification(
  actorId: string,
  qualificationId: string,
  status: 'verified' | 'rejected',
  notes: string,
): void {
  mutateDb((db) => {
    const actor = requireProfile(db, actorId);
    if (!isManagerOrAdmin(actor)) {
      throw new ServiceError('forbidden', 'Only managers or administrators can review eligibility evidence.');
    }
    const qualification = db.qualifications.find((q) => q.id === qualificationId);
    if (!qualification) throw new ServiceError('not_found', 'Eligibility record not found.');
    qualification.status = status;
    qualification.reviewerNotes = notes.trim();
    qualification.reviewedAt = nowISO();
    const target = getProfile(db, qualification.userId);
    if (target) {
      pushNotification(
        db,
        target.id,
        'eligibility',
        status === 'verified' ? 'Eligibility verified' : 'Eligibility evidence rejected',
        `"${qualification.name}" was ${status === 'verified' ? 'verified' : 'rejected'} by ${actor.fullName}.${notes.trim() ? ` Note: ${notes.trim()}` : ''}`,
        '/dashboard/eligibility',
      );
    }
    pushAudit(
      db,
      actor,
      'Eligibility updated',
      `${status === 'verified' ? 'Verified' : 'Rejected'} "${qualification.name}" for ${target?.fullName ?? 'a user'}.`,
    );
  });
}

export function listRequirements(resourceId: string): EligibilityRequirement[] {
  return getDb().eligibilityRequirements.filter((r) => r.resourceId === resourceId);
}

export function addRequirement(
  actorId: string,
  input: { resourceId: string; label: string; type: EligibilityRequirement['type'] },
): void {
  mutateDb((db) => {
    const actor = requireProfile(db, actorId);
    if (!isManagerOrAdmin(actor)) throw new ServiceError('forbidden', 'Only managers can add rules.');
    const resource = db.resources.find((r) => r.id === input.resourceId);
    if (!resource) throw new ServiceError('not_found', 'Resource not found.');
    if (!input.label.trim()) throw new ServiceError('validation', 'Enter a requirement label.');
    db.eligibilityRequirements.push({
      id: createId('req'),
      resourceId: input.resourceId,
      type: input.type,
      label: input.label.trim(),
      mandatory: true,
    });
    pushAudit(
      db,
      actor,
      'Eligibility rule added',
      `Added requirement "${input.label.trim()}" to ${resource.name}.`,
      { resource },
    );
  });
}

export function removeRequirement(actorId: string, requirementId: string): void {
  mutateDb((db) => {
    const actor = requireProfile(db, actorId);
    if (!isManagerOrAdmin(actor)) throw new ServiceError('forbidden', 'Only managers can remove rules.');
    const requirement = db.eligibilityRequirements.find((r) => r.id === requirementId);
    if (!requirement) throw new ServiceError('not_found', 'Requirement not found.');
    const resource = db.resources.find((r) => r.id === requirement.resourceId);
    db.eligibilityRequirements = db.eligibilityRequirements.filter((r) => r.id !== requirementId);
    pushAudit(
      db,
      actor,
      'Eligibility rule removed',
      `Removed requirement "${requirement.label}".`,
      { resource },
    );
  });
}

export function getUserRequirementOptions(userId: string, resource: Resource): string[] {
  const custom = listRequirements(resource.id).map((r) => r.label);
  const existing = listQualifications(userId).map((q) => q.name);
  return Array.from(new Set([...resource.requiredQualifications, ...resource.requiredTraining, ...custom, ...existing]));
}

export function isEligible(actor: Profile | null, result: EligibilityResult): boolean {
  return Boolean(actor && result.status === 'eligible');
}
