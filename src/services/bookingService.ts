import { getDb, mutateDb, persistDb } from '@/lib/demoDb';
import { IS_SUPABASE_MODE } from '@/lib/config';
import { createId } from '@/utils/crypto';
import {
  ACTIVE_BOOKING_STATUSES,
  BookingConflictError,
  canManageBooking,
  canManageResource,
  getProfile,
  isManagerOrAdmin,
  nowISO,
  OCCUPYING_BOOKING_STATUSES,
  pushAudit,
  pushNotification,
  requireProfile,
  ServiceError,
} from '@/services/core';
import { calculateCost, isAvailableOn } from '@/services/resourceService';
import { evaluateEligibility } from '@/services/eligibilityService';
import {
  bookingHours,
  combineDateTime,
  formatSlot,
  intervalsOverlap,
  isPastDate,
  timeToMinutes,
} from '@/utils/date';
import type {
  Booking,
  CheckinRecord,
  CheckoutRecord,
  ConditionReport,
  Database,
  Profile,
  Resource,
  WaitingListEntry,
} from '@/types';

export interface CreateBookingInput {
  resourceId: string;
  startDate: string;
  startTime: string;
  endTime: string;
  purpose: string;
}

export interface BookingView {
  booking: Booking;
  resource: Resource | undefined;
  user: Profile | undefined;
  owner: Profile | undefined;
}

export interface HandoverInput {
  photos: string[];
  checklist: Record<string, boolean>;
  notes: string;
  damageNoted?: boolean;
}

export interface PriorityFactor {
  label: string;
  value: string;
  state: 'pass' | 'warn' | 'info';
}

function validatePurpose(purpose: string) {
  if (!purpose.trim() || purpose.trim().length < 15) {
    throw new ServiceError('validation', 'Describe the purpose of use in at least 15 characters.');
  }
}

export function validateBookingWindow(resource: Resource, input: CreateBookingInput): number {
  if (!resource.active) throw new ServiceError('inactive', 'This resource is currently inactive.');
  if (!input.startDate) throw new ServiceError('validation', 'Select a booking date.');
  if (isPastDate(input.startDate)) {
    throw new ServiceError('validation', 'Booking date cannot be in the past.');
  }
  if (!isAvailableOn(resource, input.startDate)) {
    const day = new Date(`${input.startDate}T00:00:00`).getDay();
    if (resource.blackoutDates.includes(input.startDate)) {
      throw new ServiceError('availability', 'The resource is blocked on the selected date.');
    }
    if (!resource.availableDays.includes(day)) {
      throw new ServiceError('availability', 'The resource is not available on that weekday.');
    }
    throw new ServiceError('availability', 'The selected date is outside the availability window.');
  }
  if (timeToMinutes(input.startTime) >= timeToMinutes(input.endTime)) {
    throw new ServiceError('validation', 'End time must be after the start time.');
  }
  if (
    timeToMinutes(input.startTime) < timeToMinutes(resource.openTime) ||
    timeToMinutes(input.endTime) > timeToMinutes(resource.closeTime)
  ) {
    throw new ServiceError(
      'availability',
      `Bookings must fall between ${resource.openTime} and ${resource.closeTime}.`,
    );
  }
  const hours = bookingHours(input.startTime, input.endTime);
  const settings = getDb().settings;
  const maxHours = Math.min(resource.maxBookingHours, settings.maxBookingHours);
  if (hours > maxHours) {
    throw new ServiceError(
      'validation',
      `This resource allows a maximum booking duration of ${maxHours} hours.`,
    );
  }
  if (combineDateTime(input.startDate, input.endTime).getTime() < Date.now()) {
    throw new ServiceError('validation', 'The selected slot has already ended. Choose a future slot.');
  }
  return hours;
}

export function findConflicts(
  resourceId: string,
  input: Pick<CreateBookingInput, 'startDate' | 'startTime' | 'endTime'>,
  excludeBookingId?: string,
): Booking[] {
  return getDb().bookings.filter(
    (b) =>
      b.resourceId === resourceId &&
      b.id !== excludeBookingId &&
      b.startDate === input.startDate &&
      OCCUPYING_BOOKING_STATUSES.includes(b.status) &&
      intervalsOverlap(b.startTime, b.endTime, input.startTime, input.endTime),
  );
}

function ensureNoConflict(
  resourceId: string,
  input: Pick<CreateBookingInput, 'startDate' | 'startTime' | 'endTime'>,
  excludeBookingId?: string,
) {
  const conflicts = findConflicts(resourceId, input, excludeBookingId);
  if (conflicts.length > 0) {
    const first = conflicts[0];
    throw new BookingConflictError(
      `This slot overlaps an existing approved booking (${first.startTime}–${first.endTime}). You can join the waiting list instead.`,
    );
  }
}

export function countActiveBookings(db: Database, userId: string): number {
  return db.bookings.filter(
    (b) => b.userId === userId && ACTIVE_BOOKING_STATUSES.includes(b.status),
  ).length;
}

export function countMonthlyBookings(db: Database, userId: string): number {
  const month = new Date().toISOString().slice(0, 7);
  return db.bookings.filter(
    (b) =>
      b.userId === userId &&
      b.createdAt.slice(0, 7) === month &&
      !['cancelled', 'rejected', 'waitlisted'].includes(b.status),
  ).length;
}

function ensureLimits(db: Database, userId: string) {
  const settings = db.settings;
  if (countActiveBookings(db, userId) >= settings.maxActiveBookings) {
    throw new ServiceError(
      'limit',
      `You already have ${countActiveBookings(db, userId)} active bookings. The platform limit is ${settings.maxActiveBookings}. Complete or cancel a booking first.`,
    );
  }
  if (countMonthlyBookings(db, userId) >= settings.maxBookingsPerMonth) {
    throw new ServiceError(
      'limit',
      `You have reached the monthly booking limit of ${settings.maxBookingsPerMonth}.`,
    );
  }
}

export function checkBookingEligibility(userId: string, resource: Resource) {
  const result = evaluateEligibility(userId, resource);
  if (result.status === 'not_eligible') {
    throw new ServiceError(
      'eligibility',
      `You are not eligible for this resource. ${result.reasons.join(' ')}`,
    );
  }
  if (result.status === 'pending') {
    throw new ServiceError(
      'eligibility_pending',
      `Your eligibility verification is pending review. ${result.reasons.join(' ')}`,
    );
  }
  return result;
}

export function createBooking(userId: string, input: CreateBookingInput): Booking {
  return mutateDb((db) => {
    const user = requireProfile(db, userId);
    const resource = db.resources.find((r) => r.id === input.resourceId);
    if (!resource) throw new ServiceError('not_found', 'Resource not found.');
    validatePurpose(input.purpose);
    const hours = validateBookingWindow(resource, input);
    checkBookingEligibility(userId, resource);
    ensureLimits(db, userId);
    ensureNoConflict(resource.id, input);

    const now = nowISO();
    const booking: Booking = {
      id: createId('bkg'),
      resourceId: resource.id,
      userId,
      ownerId: resource.ownerId,
      startDate: input.startDate,
      startTime: input.startTime,
      endTime: input.endTime,
      purpose: input.purpose.trim(),
      status: 'pending',
      rejectionReason: '',
      totalCost: calculateCost(resource, hours),
      createdAt: now,
      updatedAt: now,
      approvedAt: null,
      rejectedAt: null,
      checkedInAt: null,
      checkedOutAt: null,
      completedAt: null,
      cancelledAt: null,
    };
    db.bookings.unshift(booking);
    pushNotification(
      db,
      userId,
      'booking_submitted',
      'Booking request submitted',
      `Your request for ${resource.name} on ${formatSlot(input.startDate, input.startTime, input.endTime)} is pending owner approval.`,
      '/dashboard/bookings',
    );
    pushNotification(
      db,
      resource.ownerId,
      'booking_submitted',
      'New booking request',
      `${user.fullName} requested ${resource.name} on ${formatSlot(input.startDate, input.startTime, input.endTime)}.`,
      '/owner/bookings',
    );
    db.profiles
      .filter((p) => p.role === 'institution_manager' && p.institutionId === resource.institutionId)
      .forEach((manager) => {
        pushNotification(
          db,
          manager.id,
          'booking_submitted',
          'New booking request',
          `${user.fullName} requested ${resource.name}.`,
          '/admin/bookings',
        );
      });
    pushAudit(db, user, 'Booking submitted', `Requested ${hours}h for "${resource.name}".`, {
      resource,
      booking,
    });
    return booking;
  });
}

export function joinWaitlist(userId: string, input: CreateBookingInput): Booking {
  return mutateDb((db) => {
    const user = requireProfile(db, userId);
    const resource = db.resources.find((r) => r.id === input.resourceId);
    if (!resource) throw new ServiceError('not_found', 'Resource not found.');
    if (!db.settings.waitingListEnabled) {
      throw new ServiceError('disabled', 'Waiting lists are currently disabled by the administrator.');
    }
    validatePurpose(input.purpose);
    const hours = validateBookingWindow(resource, input);
    checkBookingEligibility(userId, resource);

    const duplicate = db.waitingList.find(
      (w) =>
        w.userId === userId &&
        w.resourceId === resource.id &&
        w.preferredDate === input.startDate &&
        w.startTime === input.startTime &&
        ['waiting', 'notified'].includes(w.status),
    );
    if (duplicate) {
      throw new ServiceError('duplicate', 'You are already on the waiting list for that slot.');
    }

    const conflicts = findConflicts(resource.id, input);
    const atLimit = countActiveBookings(db, userId) >= db.settings.maxActiveBookings;
    if (conflicts.length === 0 && !atLimit) {
      throw new ServiceError(
        'available',
        'That slot is currently free. Submit a direct booking request instead of joining the waiting list.',
      );
    }

    const now = nowISO();
    const booking: Booking = {
      id: createId('bkg'),
      resourceId: resource.id,
      userId,
      ownerId: resource.ownerId,
      startDate: input.startDate,
      startTime: input.startTime,
      endTime: input.endTime,
      purpose: input.purpose.trim(),
      status: 'waitlisted',
      rejectionReason: '',
      totalCost: calculateCost(resource, hours),
      createdAt: now,
      updatedAt: now,
      approvedAt: null,
      rejectedAt: null,
      checkedInAt: null,
      checkedOutAt: null,
      completedAt: null,
      cancelledAt: null,
    };
    const entry: WaitingListEntry = {
      id: createId('wait'),
      resourceId: resource.id,
      userId,
      preferredDate: input.startDate,
      startTime: input.startTime,
      endTime: input.endTime,
      purpose: input.purpose.trim(),
      status: 'waiting',
      createdAt: now,
      bookingId: booking.id,
    };
    db.bookings.unshift(booking);
    db.waitingList.push(entry);
    pushNotification(
      db,
      userId,
      'waitlist_update',
      'Added to waiting list',
      `You joined the waiting list for ${resource.name} on ${formatSlot(input.startDate, input.startTime, input.endTime)}.`,
      '/dashboard/bookings',
    );
    pushAudit(db, user, 'Waiting list joined', `Joined waitlist for "${resource.name}".`, {
      resource,
      booking,
    });
    return booking;
  });
}

export function leaveWaitlist(actorId: string, bookingId: string): void {
  mutateDb((db) => {
    const actor = requireProfile(db, actorId);
    const booking = db.bookings.find((b) => b.id === bookingId);
    if (!booking) throw new ServiceError('not_found', 'Booking not found.');
    if (booking.userId !== actor.id && !isManagerOrAdmin(actor)) {
      throw new ServiceError('forbidden', 'You cannot modify this waiting-list entry.');
    }
    if (booking.status !== 'waitlisted') {
      throw new ServiceError('validation', 'This booking is not on a waiting list.');
    }
    booking.status = 'cancelled';
    booking.cancelledAt = nowISO();
    booking.updatedAt = nowISO();
    db.waitingList = db.waitingList.map((w) =>
      w.bookingId === booking.id ? { ...w, status: 'cancelled' } : w,
    );
    pushAudit(db, actor, 'Waiting list left', 'Removed a waiting-list request.', { booking });
    pushNotification(
      db,
      actor.id,
      'waitlist_update',
      'Waiting list updated',
      'You left the waiting list for this slot.',
      '/dashboard/bookings',
    );
  });
}

export function approveBooking(actorId: string, bookingId: string): Booking {
  return mutateDb((db) => {
    const actor = requireProfile(db, actorId);
    const booking = db.bookings.find((b) => b.id === bookingId);
    if (!booking) throw new ServiceError('not_found', 'Booking not found.');
    const resource = db.resources.find((r) => r.id === booking.resourceId);
    if (!resource) throw new ServiceError('not_found', 'Related resource not found.');
    if (!canManageBooking(actor, booking, resource)) {
      throw new ServiceError('forbidden', 'You do not have permission to approve this booking.');
    }
    if (!['pending', 'waitlisted'].includes(booking.status)) {
      throw new ServiceError('validation', `A ${booking.status} booking cannot be approved.`);
    }
    ensureNoConflict(
      booking.resourceId,
      {
        startDate: booking.startDate,
        startTime: booking.startTime,
        endTime: booking.endTime,
      },
      booking.id,
    );
    const eligibility = evaluateEligibility(booking.userId, resource);
    if (eligibility.status !== 'eligible') {
      throw new ServiceError(
        'eligibility',
        `The requester is not currently eligible. ${eligibility.reasons.join(' ')}`,
      );
    }
    booking.status = 'approved';
    booking.approvedAt = nowISO();
    booking.updatedAt = nowISO();
    db.waitingList = db.waitingList.map((w) =>
      w.bookingId === booking.id ? { ...w, status: 'converted' } : w,
    );
    pushNotification(
      db,
      booking.userId,
      'booking_approved',
      'Booking approved',
      `Your booking for ${resource.name} on ${formatSlot(booking.startDate, booking.startTime, booking.endTime)} was approved.`,
      '/dashboard/bookings',
    );
    pushAudit(db, actor, 'Booking approved', `Approved booking for "${resource.name}".`, {
      resource,
      booking,
    });
    return booking;
  });
}

export function rejectBooking(actorId: string, bookingId: string, reason: string): Booking {
  return mutateDb((db) => {
    const actor = requireProfile(db, actorId);
    const booking = db.bookings.find((b) => b.id === bookingId);
    if (!booking) throw new ServiceError('not_found', 'Booking not found.');
    const resource = db.resources.find((r) => r.id === booking.resourceId);
    if (!resource) throw new ServiceError('not_found', 'Related resource not found.');
    if (!canManageBooking(actor, booking, resource)) {
      throw new ServiceError('forbidden', 'You do not have permission to reject this booking.');
    }
    if (!['pending', 'waitlisted'].includes(booking.status)) {
      throw new ServiceError('validation', `A ${booking.status} booking cannot be rejected.`);
    }
    if (reason.trim().length < 5) {
      throw new ServiceError('validation', 'Provide a clear rejection reason (at least 5 characters).');
    }
    booking.status = 'rejected';
    booking.rejectionReason = reason.trim();
    booking.rejectedAt = nowISO();
    booking.updatedAt = nowISO();
    db.waitingList = db.waitingList.map((w) =>
      w.bookingId === booking.id ? { ...w, status: 'cancelled' } : w,
    );
    pushNotification(
      db,
      booking.userId,
      'booking_rejected',
      'Booking request rejected',
      `Your request for ${resource.name} was rejected. Reason: ${reason.trim()}`,
      '/dashboard/bookings',
    );
    pushAudit(db, actor, 'Booking rejected', `Rejected booking for "${resource.name}". Reason: ${reason.trim()}`, {
      resource,
      booking,
    });
    return booking;
  });
}

export function cancelBooking(actorId: string, bookingId: string, reason = ''): Booking {
  return mutateDb((db) => {
    const actor = requireProfile(db, actorId);
    const booking = db.bookings.find((b) => b.id === bookingId);
    if (!booking) throw new ServiceError('not_found', 'Booking not found.');
    const resource = db.resources.find((r) => r.id === booking.resourceId);
    if (booking.userId !== actor.id && !canManageBooking(actor, booking, resource)) {
      throw new ServiceError('forbidden', 'You cannot cancel this booking.');
    }
    if (!['pending', 'approved', 'waitlisted'].includes(booking.status)) {
      throw new ServiceError(
        'validation',
        `A ${booking.status} booking cannot be cancelled. Use the check-out flow instead.`,
      );
    }
    const wasApproved = booking.status === 'approved';
    booking.status = 'cancelled';
    booking.cancelledAt = nowISO();
    booking.updatedAt = nowISO();
    db.waitingList = db.waitingList.map((w) =>
      w.bookingId === booking.id ? { ...w, status: 'cancelled' } : w,
    );
    pushNotification(
      db,
      booking.ownerId,
      'booking_cancelled',
      'Booking cancelled',
      `${actor.fullName} cancelled the booking for ${resource?.name ?? 'a resource'}.${reason ? ` Reason: ${reason}` : ''}`,
      '/owner/bookings',
    );
    pushNotification(
      db,
      booking.userId,
      'booking_cancelled',
      'Booking cancelled',
      `Your booking for ${resource?.name ?? 'the resource'} was cancelled.`,
      '/dashboard/bookings',
    );
    if (wasApproved && resource) {
      db.waitingList
        .filter(
          (w) =>
            w.resourceId === booking.resourceId &&
            w.status === 'waiting' &&
            w.preferredDate === booking.startDate,
        )
        .forEach((entry) => {
          entry.status = 'notified';
          pushNotification(
            db,
            entry.userId,
            'waitlist_update',
            'A slot may be available',
            `${resource.name} may now be available on ${formatSlot(entry.preferredDate, entry.startTime, entry.endTime)}. Submit a booking request or contact the owner.`,
            '/dashboard/bookings',
          );
        });
    }
    pushAudit(db, actor, 'Booking cancelled', `Cancelled booking for "${resource?.name ?? 'resource'}".`, {
      resource,
      booking,
    });
    return booking;
  });
}

export function checkInBooking(
  actorId: string,
  bookingId: string,
  input: HandoverInput,
): { checkin: CheckinRecord; booking: Booking } {
  return mutateDb((db) => {
    const actor = requireProfile(db, actorId);
    const booking = db.bookings.find((b) => b.id === bookingId);
    if (!booking) throw new ServiceError('not_found', 'Booking not found.');
    const resource = db.resources.find((r) => r.id === booking.resourceId);
    if (!resource) throw new ServiceError('not_found', 'Related resource not found.');
    if (booking.userId !== actor.id && !canManageBooking(actor, booking, resource)) {
      throw new ServiceError('forbidden', 'You are not authorised to check in this booking.');
    }
    if (booking.status !== 'approved') {
      throw new ServiceError('validation', 'Only approved bookings can be checked in.');
    }
    const start = combineDateTime(booking.startDate, booking.startTime);
    const end = combineDateTime(booking.startDate, booking.endTime);
    const now = Date.now();
    if (now < start.getTime() - 30 * 60 * 1000) {
      throw new ServiceError(
        'validation',
        `Check-in opens 30 minutes before the start time (${booking.startTime}).`,
      );
    }
    if (now > end.getTime() + db.settings.overdueGraceMinutes * 60 * 1000) {
      throw new ServiceError('validation', 'This booking is already past its end time and cannot be checked in.');
    }
    if (!input.checklist || Object.values(input.checklist).length === 0) {
      throw new ServiceError('validation', 'Complete the initial condition checklist.');
    }

    const checkedInAt = nowISO();
    const checkin: CheckinRecord = {
      id: createId('chk'),
      bookingId: booking.id,
      userId: actor.id,
      checkedInAt,
      photos: input.photos,
      checklist: input.checklist,
      notes: input.notes.trim(),
      damageNoted: Boolean(input.damageNoted),
    };
    const condition: ConditionReport = {
      id: createId('cond'),
      bookingId: booking.id,
      resourceId: booking.resourceId,
      type: 'initial',
      images: input.photos,
      checklist: input.checklist,
      notes: input.notes.trim(),
      createdAt: checkedInAt,
    };
    db.checkinRecords.unshift(checkin);
    db.conditionReports.unshift(condition);
    booking.status = 'checked_in';
    booking.checkedInAt = checkedInAt;
    booking.updatedAt = checkedInAt;

    pushNotification(
      db,
      booking.ownerId,
      'checkin',
      'Resource checked in',
      `${actor.fullName} checked in ${resource.name}.${input.damageNoted ? ' Existing damage was noted.' : ''}`,
      '/owner/handover',
    );
    pushNotification(
      db,
      booking.userId,
      'checkin',
      'Check-in recorded',
      `You checked in ${resource.name}. Remember to check out before ${booking.endTime}.`,
      '/dashboard/bookings',
    );
    pushAudit(db, actor, 'User checked in', `Checked in with initial condition recorded.`, {
      resource,
      booking,
    });
    return { checkin, booking };
  });
}

export function checkOutBooking(
  actorId: string,
  bookingId: string,
  input: HandoverInput,
): { checkout: CheckoutRecord; booking: Booking } {
  return mutateDb((db) => {
    const actor = requireProfile(db, actorId);
    const booking = db.bookings.find((b) => b.id === bookingId);
    if (!booking) throw new ServiceError('not_found', 'Booking not found.');
    const resource = db.resources.find((r) => r.id === booking.resourceId);
    if (!resource) throw new ServiceError('not_found', 'Related resource not found.');
    if (booking.userId !== actor.id && !canManageBooking(actor, booking, resource)) {
      throw new ServiceError('forbidden', 'You are not authorised to check out this booking.');
    }
    if (!['checked_in', 'overdue'].includes(booking.status)) {
      throw new ServiceError('validation', 'Only checked-in or overdue bookings can be checked out.');
    }
    if (!input.checklist || Object.values(input.checklist).length === 0) {
      throw new ServiceError('validation', 'Complete the return condition checklist.');
    }

    const checkedOutAt = nowISO();
    const checkout: CheckoutRecord = {
      id: createId('chkout'),
      bookingId: booking.id,
      userId: actor.id,
      checkedOutAt,
      photos: input.photos,
      checklist: input.checklist,
      notes: input.notes.trim(),
      returnedBy: actor.fullName,
    };
    const condition: ConditionReport = {
      id: createId('cond'),
      bookingId: booking.id,
      resourceId: booking.resourceId,
      type: 'final',
      images: input.photos,
      checklist: input.checklist,
      notes: input.notes.trim(),
      createdAt: checkedOutAt,
    };
    db.checkoutRecords.unshift(checkout);
    db.conditionReports.unshift(condition);
    booking.status = 'checked_out';
    booking.checkedOutAt = checkedOutAt;
    booking.updatedAt = checkedOutAt;

    pushNotification(
      db,
      booking.ownerId,
      'return',
      'Resource returned',
      `${actor.fullName} returned ${resource.name}. Review the final condition and confirm completion.`,
      '/owner/handover',
    );
    pushNotification(
      db,
      booking.userId,
      'return',
      'Check-out recorded',
      `Your return of ${resource.name} was recorded. The owner will confirm completion.`,
      '/dashboard/bookings',
    );
    pushAudit(db, actor, 'User checked out', 'Final condition recorded and resource returned.', {
      resource,
      booking,
    });
    return { checkout, booking };
  });
}

export function completeBooking(actorId: string, bookingId: string): Booking {
  return mutateDb((db) => {
    const actor = requireProfile(db, actorId);
    const booking = db.bookings.find((b) => b.id === bookingId);
    if (!booking) throw new ServiceError('not_found', 'Booking not found.');
    const resource = db.resources.find((r) => r.id === booking.resourceId);
    if (!resource) throw new ServiceError('not_found', 'Related resource not found.');
    if (!canManageBooking(actor, booking, resource)) {
      throw new ServiceError('forbidden', 'You do not have permission to complete this booking.');
    }
    if (booking.status !== 'checked_out') {
      throw new ServiceError('validation', 'Only checked-out bookings can be marked completed.');
    }
    booking.status = 'completed';
    booking.completedAt = nowISO();
    booking.updatedAt = nowISO();
    pushNotification(
      db,
      booking.userId,
      'return',
      'Booking completed',
      `Your booking for ${resource.name} is now complete. Thanks for using SPACEXCHANGE.`,
      '/dashboard/bookings',
    );
    pushAudit(db, actor, 'Resource returned', 'Return confirmed and booking completed.', {
      resource,
      booking,
    });
    return booking;
  });
}

export function sweepOverdueBookings(): void {
  // In Supabase mode the sweep runs inside Postgres (sweep_overdue_bookings RPC)
  // so that every client sees the same overdue state and RLS stays authoritative.
  if (IS_SUPABASE_MODE) return;
  const db = getDb();
  const now = new Date();
  let changed = false;
  db.bookings.forEach((booking) => {
    if (!['approved', 'checked_in'].includes(booking.status)) return;
    const end = combineDateTime(booking.startDate, booking.endTime);
    const graceMs = db.settings.overdueGraceMinutes * 60 * 1000;
    if (now.getTime() <= end.getTime() + graceMs) return;
    booking.status = 'overdue';
    booking.updatedAt = nowISO();
    changed = true;
    const resource = db.resources.find((r) => r.id === booking.resourceId);
    pushNotification(
      db,
      booking.userId,
      'overdue',
      'Booking overdue',
      `Your booking for ${resource?.name ?? 'the resource'} is past its end time. Please check out immediately.`,
      '/dashboard/bookings',
    );
    pushNotification(
      db,
      booking.ownerId,
      'overdue',
      'Overdue return',
      `${resource?.name ?? 'A resource'} is past its return time.`,
      '/owner/bookings',
    );
    pushAudit(
      db,
      { id: 'system', fullName: 'System' },
      'Booking marked overdue',
      'The booking passed its end time without check-out.',
      { resource, booking },
    );
  });
  if (changed) {
    persistDb();
  }
}

export function listBookingsForUser(userId: string): BookingView[] {
  const db = getDb();
  return db.bookings
    .filter((b) => b.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((booking) => toView(db, booking));
}

export function listBookingsForOwner(ownerId: string): BookingView[] {
  const db = getDb();
  return db.bookings
    .filter((b) => b.ownerId === ownerId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((booking) => toView(db, booking));
}

export function listAllBookings(): BookingView[] {
  const db = getDb();
  return [...db.bookings]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((booking) => toView(db, booking));
}

export function getBookingById(bookingId: string): Booking | undefined {
  return getDb().bookings.find((b) => b.id === bookingId);
}

export function getBookingView(bookingId: string): BookingView | null {
  const db = getDb();
  const booking = db.bookings.find((b) => b.id === bookingId);
  if (!booking) return null;
  return toView(db, booking);
}

function toView(db: Database, booking: Booking): BookingView {
  return {
    booking,
    resource: db.resources.find((r) => r.id === booking.resourceId),
    user: db.profiles.find((p) => p.id === booking.userId),
    owner: db.profiles.find((p) => p.id === booking.ownerId),
  };
}

export function getWaitingListForUser(userId: string): WaitingListEntry[] {
  return getDb()
    .waitingList.filter((w) => w.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getWaitingListForResource(resourceId: string): WaitingListEntry[] {
  return getDb()
    .waitingList.filter((w) => w.resourceId === resourceId && ['waiting', 'notified'].includes(w.status))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function getPriorityBreakdown(bookingId: string): PriorityFactor[] {
  const db = getDb();
  const booking = db.bookings.find((b) => b.id === bookingId);
  if (!booking) return [];
  const resource = db.resources.find((r) => r.id === booking.resourceId);
  const user = getProfile(db, booking.userId);
  if (!resource || !user) return [];
  const eligibility = evaluateEligibility(user.id, resource);
  const active = countActiveBookings(db, user.id);
  const previous = db.bookings.filter(
    (b) =>
      b.userId === user.id &&
      b.resourceId === resource.id &&
      ['completed', 'checked_out'].includes(b.status),
  ).length;
  const sameInstitution =
    Boolean(user.institutionId) &&
    (user.institutionId === resource.institutionId || user.institutionId === resource.ownerId);
  const waitingPosition =
    db.waitingList
      .filter((w) => w.resourceId === resource.id && w.status === 'waiting')
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .findIndex((w) => w.bookingId === booking.id) + 1;

  return [
    {
      label: 'Eligibility',
      value: eligibility.status === 'eligible' ? 'Eligible' : eligibility.status.replace('_', ' '),
      state: eligibility.status === 'eligible' ? 'pass' : 'warn',
    },
    {
      label: 'Active bookings',
      value: `${active} of ${db.settings.maxActiveBookings} limit`,
      state: active < db.settings.maxActiveBookings ? 'pass' : 'warn',
    },
    {
      label: 'Institutional priority',
      value:
        db.settings.institutionPriorityEnabled && sameInstitution
          ? 'Same institution as owner'
          : db.settings.institutionPriorityEnabled
            ? 'No institutional priority'
            : 'Disabled by administrator',
      state: sameInstitution && db.settings.institutionPriorityEnabled ? 'pass' : 'info',
    },
    {
      label: 'Previous usage',
      value: previous === 0 ? 'First time using this resource' : `${previous} completed session(s)`,
      state: 'info',
    },
    {
      label: 'Request position',
      value: waitingPosition > 0 ? `Waiting-list position #${waitingPosition}` : 'Direct booking request',
      state: 'info',
    },
    {
      label: 'Submitted',
      value: new Date(booking.createdAt).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }),
      state: 'info',
    },
  ];
}

export function countBookingsByStatus(views: BookingView[]) {
  return views.reduce<Record<string, number>>((acc, view) => {
    acc[view.booking.status] = (acc[view.booking.status] ?? 0) + 1;
    return acc;
  }, {});
}

export function canPerformCheckIn(booking: Booking): boolean {
  if (booking.status !== 'approved') return false;
  const start = combineDateTime(booking.startDate, booking.startTime);
  const end = combineDateTime(booking.startDate, booking.endTime);
  const now = Date.now();
  return now >= start.getTime() - 30 * 60 * 1000 && now <= end.getTime();
}

export function canCheckOut(booking: Booking): boolean {
  return ['checked_in', 'overdue'].includes(booking.status);
}

export function canManageAsOwner(profile: Profile | null, resource?: Resource): boolean {
  return canManageResource(profile, resource);
}

export function isBookingManager(profile: Profile | null): boolean {
  return isManagerOrAdmin(profile);
}
