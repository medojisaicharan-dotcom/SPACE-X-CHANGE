import { createId } from '@/utils/crypto';
import type {
  AuditLog,
  Booking,
  Database,
  Notification,
  NotificationType,
  Profile,
  Resource,
} from '@/types';

export class ServiceError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'ServiceError';
    this.code = code;
  }
}

export class BookingConflictError extends ServiceError {
  constructor(message: string) {
    super('conflict', message);
    this.name = 'BookingConflictError';
  }
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function getProfile(db: Database, id: string): Profile | undefined {
  return db.profiles.find((p) => p.id === id);
}

export function requireProfile(db: Database, id: string): Profile {
  const profile = getProfile(db, id);
  if (!profile) throw new ServiceError('not_found', 'Account not found.');
  if (profile.suspended) {
    throw new ServiceError('suspended', 'This account is suspended. Contact a platform administrator.');
  }
  return profile;
}

export function pushNotification(
  db: Database,
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  link = '',
): Notification {
  const notification: Notification = {
    id: createId('notif'),
    userId,
    type,
    title,
    message,
    link,
    read: false,
    createdAt: nowISO(),
  };
  db.notifications.unshift(notification);
  return notification;
}

export function pushAudit(
  db: Database,
  actor: { id: string; fullName: string },
  action: string,
  details: string,
  meta: { resource?: Resource | null; booking?: Booking | null } = {},
): AuditLog {
  const log: AuditLog = {
    id: createId('audit'),
    action,
    actorId: actor.id,
    actorName: actor.fullName,
    resourceId: meta.resource?.id ?? null,
    resourceName: meta.resource?.name ?? '',
    bookingId: meta.booking?.id ?? null,
    details,
    createdAt: nowISO(),
  };
  db.auditLogs.unshift(log);
  return log;
}

export function isAdmin(profile: Profile | null | undefined): boolean {
  return profile?.role === 'administrator';
}

export function isManagerOrAdmin(profile: Profile | null | undefined): boolean {
  return profile?.role === 'administrator' || profile?.role === 'institution_manager';
}

export function canManageResource(
  profile: Profile | null | undefined,
  resource: Resource | null | undefined,
): boolean {
  if (!profile || !resource) return false;
  if (profile.role === 'administrator') return true;
  if (resource.ownerId === profile.id) return true;
  if (profile.role === 'institution_manager' && resource.institutionId === profile.institutionId) {
    return true;
  }
  return false;
}

export function canManageBooking(
  profile: Profile | null | undefined,
  booking: Booking,
  resource: Resource | null | undefined,
): boolean {
  if (!profile) return false;
  if (isManagerOrAdmin(profile)) return true;
  if (booking.ownerId === profile.id) return true;
  return canManageResource(profile, resource);
}

export const ACTIVE_BOOKING_STATUSES: Booking['status'][] = [
  'pending',
  'approved',
  'checked_in',
  'overdue',
];

export const OCCUPYING_BOOKING_STATUSES: Booking['status'][] = [
  'approved',
  'checked_in',
  'overdue',
];
