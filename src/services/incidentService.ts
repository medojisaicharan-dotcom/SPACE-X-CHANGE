import { getDb, mutateDb } from '@/lib/demoDb';
import { createId } from '@/utils/crypto';
import {
  canManageResource,
  getProfile,
  isManagerOrAdmin,
  nowISO,
  pushAudit,
  pushNotification,
  requireProfile,
  ServiceError,
} from '@/services/core';
import { summarizeIncident } from '@/services/aiService';
import type { Incident, IncidentCategory, IncidentStatus } from '@/types';

export interface ReportIncidentInput {
  resourceId: string;
  bookingId: string;
  category: IncidentCategory;
  description: string;
  images: string[];
  occurredAt: string;
}

export function reportIncident(actorId: string, input: ReportIncidentInput): Incident {
  return mutateDb((db) => {
    const actor = requireProfile(db, actorId);
    if (!input.resourceId) throw new ServiceError('validation', 'Select the resource involved.');
    if (!input.category) throw new ServiceError('validation', 'Select an incident category.');
    if (input.description.trim().length < 30) {
      throw new ServiceError('validation', 'Describe the incident in at least 30 characters.');
    }
    if (!input.occurredAt) throw new ServiceError('validation', 'Provide the date and time of the incident.');
    const resource = db.resources.find((r) => r.id === input.resourceId);
    if (!resource) throw new ServiceError('not_found', 'Resource not found.');
    let bookingId: string | null = input.bookingId || null;
    if (bookingId) {
      const booking = db.bookings.find((b) => b.id === bookingId);
      if (!booking) throw new ServiceError('not_found', 'Booking reference not found.');
      if (
        booking.userId !== actor.id &&
        !canManageResource(actor, resource) &&
        !isManagerOrAdmin(actor)
      ) {
        throw new ServiceError('forbidden', 'You can only reference your own bookings.');
      }
    }
    const incident: Incident = {
      id: createId('inc'),
      reporterId: actor.id,
      reporterName: actor.fullName,
      resourceId: resource.id,
      resourceName: resource.name,
      bookingId,
      category: input.category,
      description: input.description.trim(),
      images: input.images,
      occurredAt: new Date(input.occurredAt).toISOString(),
      status: 'reported',
      managerNotes: '',
      summary: summarizeIncident(input.description, input.category),
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };
    db.incidents.unshift(incident);
    pushNotification(
      db,
      actor.id,
      'incident',
      'Incident report submitted',
      `Your report about ${resource.name} was submitted for manager review. No penalty has been applied.`,
      '/dashboard/incidents',
    );
    if (resource.ownerId !== actor.id) {
      pushNotification(
        db,
        resource.ownerId,
        'incident',
        'New incident reported',
        `${actor.fullName} reported an incident for ${resource.name}.`,
        '/owner/incidents',
      );
    }
    db.profiles
      .filter((p) => isManagerOrAdmin(p))
      .forEach((manager) => {
        pushNotification(
          db,
          manager.id,
          'incident',
          'Incident awaiting review',
          `${incident.category.replace(/_/g, ' ')} reported for ${resource.name}.`,
          '/admin/incidents',
        );
      });
    pushAudit(db, actor, 'Incident reported', `Reported ${incident.category} for "${resource.name}".`, {
      resource,
    });
    return incident;
  });
}

export function updateIncident(
  actorId: string,
  incidentId: string,
  status: IncidentStatus,
  managerNotes: string,
): void {
  mutateDb((db) => {
    const actor = requireProfile(db, actorId);
    if (!isManagerOrAdmin(actor)) {
      throw new ServiceError('forbidden', 'Only managers or administrators can review incidents.');
    }
    const incident = db.incidents.find((i) => i.id === incidentId);
    if (!incident) throw new ServiceError('not_found', 'Incident not found.');
    if (!managerNotes.trim() && status !== 'under_review') {
      throw new ServiceError('validation', 'Add review notes before changing this incident status.');
    }
    incident.status = status;
    incident.managerNotes = managerNotes.trim();
    incident.updatedAt = nowISO();
    pushNotification(
      db,
      incident.reporterId,
      'incident_update',
      'Incident status updated',
      `Your incident report for ${incident.resourceName} is now ${status.replace('_', ' ')}.${managerNotes.trim() ? ` Note: ${managerNotes.trim()}` : ''}`,
      '/dashboard/incidents',
    );
    const resource = db.resources.find((r) => r.id === incident.resourceId);
    if (resource && resource.ownerId !== incident.reporterId) {
      pushNotification(
        db,
        resource.ownerId,
        'incident_update',
        'Incident status updated',
        `${incident.resourceName}: incident is now ${status.replace('_', ' ')}.`,
        '/owner/incidents',
      );
    }
    pushAudit(
      db,
      actor,
      status === 'resolved' ? 'Incident resolved' : 'Incident updated',
      `Set incident status to ${status.replace('_', ' ')}.`,
      { resource: resource ?? undefined },
    );
  });
}

export function listIncidentsForUser(userId: string): Incident[] {
  const db = getDb();
  const ownedResourceIds = new Set(
    db.resources.filter((r) => r.ownerId === userId).map((r) => r.id),
  );
  return db.incidents
    .filter((i) => i.reporterId === userId || (i.resourceId && ownedResourceIds.has(i.resourceId)))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function listAllIncidents(): Incident[] {
  return [...getDb().incidents].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getIncident(id: string): Incident | undefined {
  return getDb().incidents.find((i) => i.id === id);
}

export function listIncidentsForOwner(ownerId: string): Incident[] {
  const db = getDb();
  const ownedResourceIds = new Set(
    db.resources.filter((r) => r.ownerId === ownerId).map((r) => r.id),
  );
  return db.incidents
    .filter((i) => i.resourceId && ownedResourceIds.has(i.resourceId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function incidentCounts(incidents: Incident[]) {
  return incidents.reduce<Record<string, number>>((acc, incident) => {
    acc[incident.status] = (acc[incident.status] ?? 0) + 1;
    return acc;
  }, {});
}

export function getIncidentContext(incident: Incident) {
  const db = getDb();
  return {
    resource: incident.resourceId ? db.resources.find((r) => r.id === incident.resourceId) : undefined,
    booking: incident.bookingId ? db.bookings.find((b) => b.id === incident.bookingId) : undefined,
    reporter: getProfile(db, incident.reporterId),
  };
}
