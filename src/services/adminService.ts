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
import type { Institution, PlatformSettings, Profile, Role } from '@/types';

export function listUsers(): Profile[] {
  return [...getDb().profiles].sort((a, b) => a.fullName.localeCompare(b.fullName));
}

export function updateUserRole(actorId: string, targetId: string, role: Role): void {
  mutateDb((db) => {
    const actor = requireProfile(db, actorId);
    if (actor.role !== 'administrator') {
      throw new ServiceError('forbidden', 'Only administrators can change user roles.');
    }
    const target = getProfile(db, targetId);
    if (!target) throw new ServiceError('not_found', 'User not found.');
    if (target.id === actor.id) {
      throw new ServiceError('validation', 'You cannot change your own role.');
    }
    if (target.role === 'administrator' && role !== 'administrator') {
      const adminCount = db.profiles.filter((p) => p.role === 'administrator').length;
      if (adminCount <= 1) {
        throw new ServiceError('validation', 'At least one administrator must remain.');
      }
    }
    const previous = target.role;
    target.role = role;
    target.updatedAt = nowISO();
    pushNotification(
      db,
      target.id,
      'system',
      'Account role updated',
      `Your account role changed from ${previous.replace('_', ' ')} to ${role.replace('_', ' ')} by ${actor.fullName}.`,
      '/dashboard',
    );
    pushAudit(
      db,
      actor,
      'User role updated',
      `Changed ${target.fullName}'s role from ${previous} to ${role}.`,
    );
  });
}

export function setUserVerified(actorId: string, targetId: string, verified: boolean): void {
  mutateDb((db) => {
    const actor = requireProfile(db, actorId);
    if (!isManagerOrAdmin(actor)) {
      throw new ServiceError('forbidden', 'Only managers or administrators can verify accounts.');
    }
    const target = getProfile(db, targetId);
    if (!target) throw new ServiceError('not_found', 'User not found.');
    target.verified = verified;
    target.updatedAt = nowISO();
    pushNotification(
      db,
      target.id,
      'system',
      verified ? 'Account verified' : 'Account verification removed',
      verified
        ? 'Your account is now verified. You can access all eligible resources.'
        : 'Your account verification was removed. Contact your institution manager.',
      '/dashboard',
    );
    pushAudit(
      db,
      actor,
      verified ? 'Account verified' : 'Account verification removed',
      `${verified ? 'Verified' : 'Unverified'} account for ${target.fullName}.`,
    );
  });
}

export function setUserSuspended(actorId: string, targetId: string, suspended: boolean): void {
  mutateDb((db) => {
    const actor = requireProfile(db, actorId);
    if (actor.role !== 'administrator') {
      throw new ServiceError('forbidden', 'Only administrators can suspend accounts.');
    }
    const target = getProfile(db, targetId);
    if (!target) throw new ServiceError('not_found', 'User not found.');
    if (target.id === actor.id) {
      throw new ServiceError('validation', 'You cannot suspend your own account.');
    }
    target.suspended = suspended;
    target.updatedAt = nowISO();
    pushNotification(
      db,
      target.id,
      'system',
      suspended ? 'Account suspended' : 'Account reinstated',
      suspended
        ? 'Your account has been suspended by an administrator. Contact support for assistance.'
        : 'Your account has been reinstated. You can use SPACEXCHANGE again.',
      '/login',
    );
    pushAudit(
      db,
      actor,
      suspended ? 'Account suspended' : 'Account reinstated',
      `${suspended ? 'Suspended' : 'Reinstated'} account for ${target.fullName}.`,
    );
  });
}

export function listInstitutions(): Institution[] {
  return [...getDb().institutions].sort((a, b) => a.name.localeCompare(b.name));
}

export function createInstitution(
  actorId: string,
  input: { name: string; type: string; location: string; contactEmail: string },
): void {
  mutateDb((db) => {
    const actor = requireProfile(db, actorId);
    if (!isManagerOrAdmin(actor)) {
      throw new ServiceError('forbidden', 'Only managers or administrators can add institutions.');
    }
    if (!input.name.trim() || !input.location.trim() || !input.contactEmail.trim()) {
      throw new ServiceError('validation', 'Name, location and contact email are required.');
    }
    if (db.institutions.some((i) => i.name.toLowerCase() === input.name.trim().toLowerCase())) {
      throw new ServiceError('duplicate', 'An institution with that name already exists.');
    }
    const institution: Institution = {
      id: createId('inst'),
      name: input.name.trim(),
      type: input.type.trim() || 'Institution',
      location: input.location.trim(),
      contactEmail: input.contactEmail.trim(),
      verified: false,
      createdAt: nowISO(),
    };
    db.institutions.push(institution);
    pushAudit(db, actor, 'Institution created', `Added institution "${institution.name}".`);
  });
}

export function setInstitutionVerified(actorId: string, institutionId: string, verified: boolean): void {
  mutateDb((db) => {
    const actor = requireProfile(db, actorId);
    if (!isManagerOrAdmin(actor)) {
      throw new ServiceError('forbidden', 'Only managers or administrators can verify institutions.');
    }
    const institution = db.institutions.find((i) => i.id === institutionId);
    if (!institution) throw new ServiceError('not_found', 'Institution not found.');
    institution.verified = verified;
    db.profiles
      .filter((p) => p.institutionId === institutionId && p.role !== 'user')
      .forEach((profile) => {
        pushNotification(
          db,
          profile.id,
          'system',
          verified ? 'Institution verified' : 'Institution verification removed',
          `${institution.name} was ${verified ? 'verified' : 'unverified'} by ${actor.fullName}.`,
          '/dashboard',
        );
      });
    pushAudit(
      db,
      actor,
      verified ? 'Institution verified' : 'Institution verification removed',
      `${verified ? 'Verified' : 'Unverified'} institution "${institution.name}".`,
    );
  });
}

export function updateSettings(actorId: string, settings: PlatformSettings): void {
  mutateDb((db) => {
    const actor = requireProfile(db, actorId);
    if (actor.role !== 'administrator') {
      throw new ServiceError('forbidden', 'Only administrators can change platform settings.');
    }
    if (settings.maxActiveBookings < 1 || settings.maxActiveBookings > 20) {
      throw new ServiceError('validation', 'Active booking limit must be between 1 and 20.');
    }
    if (settings.maxBookingsPerMonth < 1 || settings.maxBookingsPerMonth > 60) {
      throw new ServiceError('validation', 'Monthly booking limit must be between 1 and 60.');
    }
    if (settings.maxBookingHours < 1 || settings.maxBookingHours > 12) {
      throw new ServiceError('validation', 'Maximum booking duration must be between 1 and 12 hours.');
    }
    if (settings.overdueGraceMinutes < 0 || settings.overdueGraceMinutes > 240) {
      throw new ServiceError('validation', 'Overdue grace must be between 0 and 240 minutes.');
    }
    db.settings = { ...settings };
    pushAudit(
      db,
      actor,
      'Platform settings updated',
      `Active limit: ${settings.maxActiveBookings}, monthly limit: ${settings.maxBookingsPerMonth}, institutional priority: ${settings.institutionPriorityEnabled ? 'on' : 'off'}.`,
    );
  });
}

export interface AdminStats {
  totalUsers: number;
  verifiedOwners: number;
  pendingVerifications: number;
  suspendedUsers: number;
  totalInstitutions: number;
  pendingInstitutions: number;
  totalResources: number;
  activeResources: number;
  pendingBookings: number;
  approvedBookings: number;
  overdueBookings: number;
  openIncidents: number;
  completedBookings: number;
  pendingQualifications: number;
}

export function getAdminStats(): AdminStats {
  const db = getDb();
  return {
    totalUsers: db.profiles.length,
    verifiedOwners: db.profiles.filter((p) => p.role === 'resource_owner' && p.verified).length,
    pendingVerifications: db.profiles.filter((p) => !p.verified && p.role !== 'user').length,
    suspendedUsers: db.profiles.filter((p) => p.suspended).length,
    totalInstitutions: db.institutions.length,
    pendingInstitutions: db.institutions.filter((i) => !i.verified).length,
    totalResources: db.resources.length,
    activeResources: db.resources.filter((r) => r.active).length,
    pendingBookings: db.bookings.filter((b) => b.status === 'pending').length,
    approvedBookings: db.bookings.filter((b) => b.status === 'approved').length,
    overdueBookings: db.bookings.filter((b) => b.status === 'overdue').length,
    openIncidents: db.incidents.filter((i) => ['reported', 'under_review'].includes(i.status)).length,
    completedBookings: db.bookings.filter((b) => b.status === 'completed').length,
    pendingQualifications: db.qualifications.filter((q) => q.status === 'pending').length,
  };
}
