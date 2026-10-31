import { getDb } from '@/lib/demoDb';
import type { AuditLog } from '@/types';

export function listAuditLogs(options: { actorId?: string; resourceId?: string; limit?: number } = {}): AuditLog[] {
  const db = getDb();
  let logs = [...db.auditLogs].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (options.actorId) logs = logs.filter((l) => l.actorId === options.actorId);
  if (options.resourceId) logs = logs.filter((l) => l.resourceId === options.resourceId);
  return options.limit ? logs.slice(0, options.limit) : logs;
}

export function listAuditForUser(userId: string): AuditLog[] {
  const db = getDb();
  const userBookingIds = new Set(
    db.bookings.filter((b) => b.userId === userId || b.ownerId === userId).map((b) => b.id),
  );
  return db.auditLogs
    .filter((log) => log.actorId === userId || (log.bookingId && userBookingIds.has(log.bookingId)))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function listAuditForOwner(ownerId: string): AuditLog[] {
  const db = getDb();
  const ownedResourceIds = new Set(
    db.resources.filter((r) => r.ownerId === ownerId).map((r) => r.id),
  );
  const ownerBookingIds = new Set(db.bookings.filter((b) => b.ownerId === ownerId).map((b) => b.id));
  return db.auditLogs
    .filter(
      (log) =>
        log.actorId === ownerId ||
        (log.resourceId && ownedResourceIds.has(log.resourceId)) ||
        (log.bookingId && ownerBookingIds.has(log.bookingId)),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
