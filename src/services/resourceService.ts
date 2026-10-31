import { getDb, mutateDb } from '@/lib/demoDb';
import { createId } from '@/utils/crypto';
import {
  canManageResource,
  getProfile,
  nowISO,
  pushAudit,
  pushNotification,
  requireProfile,
  ServiceError,
} from '@/services/core';
import { CATEGORY_IMAGES, type Resource, type ResourceFilters } from '@/types';
import { bookingHours, isPastDate } from '@/utils/date';
import { parseISO } from 'date-fns';

export interface ResourceInput {
  name: string;
  category: string;
  description: string;
  image: string;
  location: string;
  institutionId: string;
  availableFrom: string;
  availableTo: string;
  availableDays: number[];
  openTime: string;
  closeTime: string;
  blackoutDates: string[];
  hourlyRate: number;
  dailyRate: number;
  securityDeposit: number;
  requiredQualifications: string[];
  requiredTraining: string[];
  supervisionRequired: boolean;
  eligibilityNotes: string;
  usageInstructions: string;
  bookingConditions: string;
  maxBookingHours: number;
  cancellationPolicy: string;
  active: boolean;
}

export interface ResourceWithMeta extends Resource {
  bookingCount: number;
  upcomingCount: number;
  ownerName: string;
  availableNow: boolean;
}

export function getBookingCount(resourceId: string): number {
  return getDb().bookings.filter((b) => b.resourceId === resourceId && b.status !== 'cancelled').length;
}

export function isAvailableOn(resource: Resource, isoDate: string): boolean {
  if (!resource.active) return false;
  if (isoDate < resource.availableFrom || isoDate > resource.availableTo) return false;
  if (resource.blackoutDates.includes(isoDate)) return false;
  const day = parseISO(isoDate).getDay();
  return resource.availableDays.includes(day);
}

export function isAvailableNow(resource: Resource): boolean {
  if (!resource.active) return false;
  const today = new Date();
  const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
    today.getDate(),
  ).padStart(2, '0')}`;
  return isAvailableOn(resource, iso);
}

export function getBookedIntervals(
  resourceId: string,
  isoDate: string,
  excludeBookingId?: string,
): { startTime: string; endTime: string; bookingId: string }[] {
  return getDb()
    .bookings.filter(
      (b) =>
        b.resourceId === resourceId &&
        b.startDate === isoDate &&
        b.id !== excludeBookingId &&
        ['approved', 'checked_in', 'overdue'].includes(b.status),
    )
    .map((b) => ({ startTime: b.startTime, endTime: b.endTime, bookingId: b.id }))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export function toResourceWithMeta(resource: Resource): ResourceWithMeta {
  const db = getDb();
  const owner = getProfile(db, resource.ownerId);
  const bookings = db.bookings.filter((b) => b.resourceId === resource.id);
  return {
    ...resource,
    bookingCount: bookings.filter((b) => b.status !== 'cancelled').length,
    upcomingCount: bookings.filter((b) =>
      ['pending', 'approved', 'checked_in'].includes(b.status),
    ).length,
    ownerName: owner?.fullName ?? resource.institutionName,
    availableNow: isAvailableNow(resource),
  };
}

export function listResources(filters: ResourceFilters = {}): ResourceWithMeta[] {
  const db = getDb();
  let resources = db.resources.filter((r) => r.active);

  const search = filters.search?.trim().toLowerCase();
  if (search) {
    resources = resources.filter((r) =>
      [r.name, r.description, r.institutionName, r.location, r.category]
        .join(' ')
        .toLowerCase()
        .includes(search),
    );
  }
  if (filters.category) {
    resources = resources.filter((r) => r.category === filters.category);
  }
  if (filters.institutionId) {
    resources = resources.filter((r) => r.institutionId === filters.institutionId);
  }
  if (filters.location) {
    const location = filters.location.toLowerCase();
    resources = resources.filter(
      (r) =>
        r.location.toLowerCase().includes(location) ||
        r.institutionName.toLowerCase().includes(location),
    );
  }
  if (filters.availableOnly) {
    resources = resources.filter((r) => isAvailableNow(r));
  }
  if (typeof filters.maxPrice === 'number' && filters.maxPrice > 0) {
    resources = resources.filter((r) => r.hourlyRate <= filters.maxPrice!);
  }
  if (filters.skill) {
    const skill = filters.skill.toLowerCase();
    resources = resources.filter((r) =>
      [...r.requiredQualifications, ...r.requiredTraining].some((s) =>
        s.toLowerCase().includes(skill),
      ),
    );
  }

  let mapped = resources.map(toResourceWithMeta);

  switch (filters.sort) {
    case 'popularity':
      mapped = mapped.sort((a, b) => b.bookingCount - a.bookingCount || a.name.localeCompare(b.name));
      break;
    case 'availability':
      mapped = mapped.sort(
        (a, b) => Number(b.availableNow) - Number(a.availableNow) || a.name.localeCompare(b.name),
      );
      break;
    case 'newest':
    default:
      mapped = mapped.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      break;
  }
  return mapped;
}

export function listAllResources(): ResourceWithMeta[] {
  return getDb()
    .resources.map(toResourceWithMeta)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getResourceById(id: string): Resource | undefined {
  return getDb().resources.find((r) => r.id === id);
}

export function getOwnerResources(ownerId: string): ResourceWithMeta[] {
  return getDb()
    .resources.filter((r) => r.ownerId === ownerId)
    .map(toResourceWithMeta)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function deriveInstitution(input: ResourceInput) {
  const db = getDb();
  const institution = db.institutions.find((i) => i.id === input.institutionId);
  if (!institution) throw new ServiceError('validation', 'Select a valid institution.');
  return institution;
}

function validateInput(input: ResourceInput) {
  if (!input.name.trim() || input.name.trim().length < 4) {
    throw new ServiceError('validation', 'Resource name must be at least 4 characters.');
  }
  if (!input.description.trim() || input.description.trim().length < 30) {
    throw new ServiceError('validation', 'Description must be at least 30 characters.');
  }
  if (!input.location.trim()) throw new ServiceError('validation', 'Enter a location.');
  if (input.availableFrom > input.availableTo) {
    throw new ServiceError('validation', 'Availability start date must be before the end date.');
  }
  if (input.availableDays.length === 0) {
    throw new ServiceError('validation', 'Select at least one available weekday.');
  }
  if (input.openTime >= input.closeTime) {
    throw new ServiceError('validation', 'Opening time must be before closing time.');
  }
  if (input.hourlyRate < 0 || input.dailyRate < 0 || input.securityDeposit < 0) {
    throw new ServiceError('validation', 'Rates and deposits cannot be negative.');
  }
  if (input.maxBookingHours <= 0 || input.maxBookingHours > 12) {
    throw new ServiceError('validation', 'Maximum booking duration must be between 1 and 12 hours.');
  }
}

export function createResource(actorId: string, input: ResourceInput): Resource {
  return mutateDb((db) => {
    const actor = requireProfile(db, actorId);
    if (actor.role !== 'resource_owner' && actor.role !== 'administrator') {
      throw new ServiceError('forbidden', 'Only resource owners or administrators can create listings.');
    }
    if (actor.role === 'resource_owner' && !actor.verified) {
      throw new ServiceError(
        'verification',
        'Your owner account must be verified by an administrator before you can publish listings.',
      );
    }
    validateInput(input);
    const institution = deriveInstitution(input);
    const now = nowISO();
    const resource: Resource = {
      id: createId('res'),
      ownerId: actor.id,
      institutionId: institution.id,
      institutionName: institution.name,
      name: input.name.trim(),
      category: input.category,
      description: input.description.trim(),
      image: input.image || CATEGORY_IMAGES[input.category] || '/images/other.svg',
      location: input.location.trim(),
      availableFrom: input.availableFrom,
      availableTo: input.availableTo,
      availableDays: [...input.availableDays].sort(),
      openTime: input.openTime,
      closeTime: input.closeTime,
      blackoutDates: input.blackoutDates,
      hourlyRate: input.hourlyRate,
      dailyRate: input.dailyRate,
      securityDeposit: input.securityDeposit,
      requiredQualifications: input.requiredQualifications,
      requiredTraining: input.requiredTraining,
      supervisionRequired: input.supervisionRequired,
      eligibilityNotes: input.eligibilityNotes.trim(),
      usageInstructions: input.usageInstructions.trim(),
      bookingConditions: input.bookingConditions.trim(),
      maxBookingHours: input.maxBookingHours,
      cancellationPolicy: input.cancellationPolicy.trim(),
      active: input.active,
      createdAt: now,
      updatedAt: now,
    };
    db.resources.unshift(resource);
    pushAudit(db, actor, 'Resource created', `Created listing "${resource.name}".`, { resource });
    db.profiles
      .filter((p) => p.role === 'institution_manager' || p.role === 'administrator')
      .forEach((manager) => {
        pushNotification(
          db,
          manager.id,
          'system',
          'New resource listed',
          `${actor.fullName} listed "${resource.name}" at ${resource.institutionName}.`,
          '/admin/resources',
        );
      });
    return resource;
  });
}

export function updateResource(actorId: string, resourceId: string, input: ResourceInput): Resource {
  return mutateDb((db) => {
    const actor = requireProfile(db, actorId);
    const resource = db.resources.find((r) => r.id === resourceId);
    if (!resource) throw new ServiceError('not_found', 'Resource not found.');
    if (!canManageResource(actor, resource)) {
      throw new ServiceError('forbidden', 'You do not have permission to edit this resource.');
    }
    validateInput(input);
    const institution = deriveInstitution(input);
    Object.assign(resource, {
      name: input.name.trim(),
      category: input.category,
      description: input.description.trim(),
      image: input.image || CATEGORY_IMAGES[input.category] || '/images/other.svg',
      location: input.location.trim(),
      institutionId: institution.id,
      institutionName: institution.name,
      availableFrom: input.availableFrom,
      availableTo: input.availableTo,
      availableDays: [...input.availableDays].sort(),
      openTime: input.openTime,
      closeTime: input.closeTime,
      blackoutDates: input.blackoutDates,
      hourlyRate: input.hourlyRate,
      dailyRate: input.dailyRate,
      securityDeposit: input.securityDeposit,
      requiredQualifications: input.requiredQualifications,
      requiredTraining: input.requiredTraining,
      supervisionRequired: input.supervisionRequired,
      eligibilityNotes: input.eligibilityNotes.trim(),
      usageInstructions: input.usageInstructions.trim(),
      bookingConditions: input.bookingConditions.trim(),
      maxBookingHours: input.maxBookingHours,
      cancellationPolicy: input.cancellationPolicy.trim(),
      active: input.active,
      updatedAt: nowISO(),
    });
    pushAudit(db, actor, 'Resource updated', `Updated listing "${resource.name}".`, { resource });
    return resource;
  });
}

export function toggleResourceActive(actorId: string, resourceId: string): Resource {
  return mutateDb((db) => {
    const actor = requireProfile(db, actorId);
    const resource = db.resources.find((r) => r.id === resourceId);
    if (!resource) throw new ServiceError('not_found', 'Resource not found.');
    if (!canManageResource(actor, resource)) {
      throw new ServiceError('forbidden', 'You do not have permission to change this listing.');
    }
    resource.active = !resource.active;
    resource.updatedAt = nowISO();
    pushAudit(
      db,
      actor,
      resource.active ? 'Resource activated' : 'Resource deactivated',
      `${resource.active ? 'Activated' : 'Deactivated'} listing "${resource.name}".`,
      { resource },
    );
    return resource;
  });
}

export function deleteResource(actorId: string, resourceId: string): void {
  mutateDb((db) => {
    const actor = requireProfile(db, actorId);
    const resource = db.resources.find((r) => r.id === resourceId);
    if (!resource) throw new ServiceError('not_found', 'Resource not found.');
    if (!canManageResource(actor, resource)) {
      throw new ServiceError('forbidden', 'You do not have permission to delete this resource.');
    }
    const blocking = db.bookings.filter(
      (b) =>
        b.resourceId === resourceId &&
        ['pending', 'approved', 'checked_in', 'overdue'].includes(b.status),
    );
    if (blocking.length > 0) {
      throw new ServiceError(
        'conflict',
        'Resolve active bookings before deleting this resource. You can deactivate it instead.',
      );
    }
    db.resources = db.resources.filter((r) => r.id !== resourceId);
    db.waitingList = db.waitingList.filter((w) => w.resourceId !== resourceId);
    db.eligibilityRequirements = db.eligibilityRequirements.filter(
      (r) => r.resourceId !== resourceId,
    );
    pushAudit(db, actor, 'Resource deleted', `Deleted listing "${resource.name}".`, { resource });
  });
}

export function getResourcesByIds(ids: string[]): Resource[] {
  const db = getDb();
  return ids.map((id) => db.resources.find((r) => r.id === id)).filter(Boolean) as Resource[];
}

export function calculateCost(resource: Resource, hours: number): number {
  if (hours <= 0) return 0;
  const daily = resource.dailyRate > 0 && hours >= 5 ? resource.dailyRate : 0;
  if (daily > 0) return daily;
  return Math.round(resource.hourlyRate * hours * 100) / 100;
}

export function resourceUsageStats(resourceId: string) {
  const db = getDb();
  const bookings = db.bookings.filter((b) => b.resourceId === resourceId);
  const completed = bookings.filter((b) => b.status === 'completed');
  const hours = completed.reduce((sum, b) => sum + Math.max(0, bookingHours(b.startTime, b.endTime)), 0);
  const revenue = completed.reduce((sum, b) => sum + b.totalCost, 0);
  const last = [...bookings].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  return {
    totalBookings: bookings.length,
    completedBookings: completed.length,
    hoursUsed: hours,
    revenue,
    lastBookedAt: last?.createdAt ?? null,
  };
}

export function resourceAvailabilitySummary(resource: Resource) {
  const today = new Date();
  const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
    today.getDate(),
  ).padStart(2, '0')}`;
  return {
    availableToday: isAvailableOn(resource, iso),
    from: resource.availableFrom,
    to: resource.availableTo,
    days: resource.availableDays,
    openTime: resource.openTime,
    closeTime: resource.closeTime,
    blackoutDates: resource.blackoutDates,
    isPast: isPastDate(resource.availableTo),
  };
}
