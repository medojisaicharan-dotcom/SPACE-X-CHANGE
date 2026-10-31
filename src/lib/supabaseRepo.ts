import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/integrations/supabase/client';
import {
  CATEGORIES,
  type Booking,
  type CheckinRecord,
  type CheckoutRecord,
  type ConditionReport,
  type Database,
  type EligibilityRequirement,
  type Incident,
  type Institution,
  type Notification,
  type AuditLog,
  type PlatformSettings,
  type Profile,
  type Resource,
  type Role,
  type UserQualification,
  type WaitingListEntry,
} from '@/types';

// ---------------------------------------------------------------------------
// Supabase repository
// ---------------------------------------------------------------------------
// The demo services are intentionally synchronous. To keep that API without
// rewriting every page, the Supabase driver loads a per-session cache once and
// then mirrors each mutation back to Postgres by diffing the in-memory copy.
// Reads are served from the cache; writes are queued and flushed in order.
// Row Level Security remains the authority for what can be read or written.
// ---------------------------------------------------------------------------

type Row = Record<string, unknown>;

const DEFAULT_SETTINGS: PlatformSettings = {
  maxActiveBookings: 3,
  maxBookingsPerMonth: 10,
  maxBookingHours: 4,
  institutionPriorityEnabled: true,
  waitingListEnabled: true,
  autoApproval: false,
  overdueGraceMinutes: 30,
};

function text(value: unknown): string {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}

function numberValue(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function booleanValue(value: unknown): boolean {
  return Boolean(value);
}

function listValue<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function dateValue(value: unknown): string {
  return text(value).slice(0, 10);
}

function timeFromDb(value: unknown): string {
  return text(value).slice(0, 5);
}

function timeToDb(value: string): string {
  if (!value) return '00:00:00';
  return value.length === 5 ? `${value}:00` : value;
}

function nullableTime(value: unknown): string | null {
  const parsed = text(value);
  return parsed ? parsed : null;
}

function nullableText(value: unknown): string | null {
  const parsed = text(value);
  return parsed ? parsed : null;
}

// --- Institutions ---------------------------------------------------------

function institutionFromRow(row: Row): Institution {
  return {
    id: text(row.id),
    name: text(row.name),
    type: text(row.type),
    location: text(row.location),
    contactEmail: text(row.contact_email),
    verified: booleanValue(row.verified),
    createdAt: text(row.created_at),
  };
}

function institutionToRow(item: Institution): Row {
  return {
    id: item.id,
    name: item.name,
    type: item.type,
    location: item.location,
    contact_email: item.contactEmail,
    verified: item.verified,
    created_at: item.createdAt,
  };
}

// --- Profiles -------------------------------------------------------------

function profileFromRow(row: Row): Profile {
  return {
    id: text(row.id),
    email: text(row.email),
    fullName: text(row.full_name),
    role: (text(row.role) || 'user') as Role,
    institutionId: nullableText(row.institution_id),
    institutionName: text(row.institution_name),
    verified: booleanValue(row.verified),
    suspended: booleanValue(row.suspended),
    passwordHash: '',
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
  };
}

function directoryProfileFromRow(row: Row): Profile {
  return {
    id: text(row.id),
    email: '',
    fullName: text(row.full_name),
    role: (text(row.role) || 'user') as Role,
    institutionId: nullableText(row.institution_id),
    institutionName: text(row.institution_name),
    verified: booleanValue(row.verified),
    suspended: false,
    passwordHash: '',
    createdAt: '',
    updatedAt: '',
  };
}

function profileToRow(item: Profile): Row {
  return {
    id: item.id,
    email: item.email,
    full_name: item.fullName,
    role: item.role,
    institution_id: item.institutionId,
    institution_name: item.institutionName,
    verified: item.verified,
    suspended: item.suspended,
    created_at: item.createdAt,
  };
}

// --- Resources ------------------------------------------------------------

function resourceFromRow(row: Row): Resource {
  return {
    id: text(row.id),
    ownerId: text(row.owner_id),
    institutionId: nullableText(row.institution_id),
    institutionName: text(row.institution_name),
    name: text(row.name),
    category: CATEGORIES.includes(text(row.category) as (typeof CATEGORIES)[number])
      ? (text(row.category) as (typeof CATEGORIES)[number])
      : (text(row.category) as Resource['category']),
    description: text(row.description),
    image: text(row.image),
    location: text(row.location),
    availableFrom: dateValue(row.available_from),
    availableTo: dateValue(row.available_to),
    availableDays: listValue<number>(row.available_days).map((day) => numberValue(day)),
    openTime: timeFromDb(row.open_time),
    closeTime: timeFromDb(row.close_time),
    blackoutDates: listValue<string>(row.blackout_dates).map(dateValue),
    hourlyRate: numberValue(row.hourly_rate),
    dailyRate: numberValue(row.daily_rate),
    securityDeposit: numberValue(row.security_deposit),
    requiredQualifications: listValue<string>(row.required_qualifications),
    requiredTraining: listValue<string>(row.required_training),
    supervisionRequired: booleanValue(row.supervision_required),
    eligibilityNotes: text(row.eligibility_notes),
    usageInstructions: text(row.usage_instructions),
    bookingConditions: text(row.booking_conditions),
    maxBookingHours: numberValue(row.max_booking_hours),
    cancellationPolicy: text(row.cancellation_policy),
    active: booleanValue(row.active),
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
  };
}

function resourceToRow(item: Resource): Row {
  return {
    id: item.id,
    owner_id: item.ownerId,
    institution_id: item.institutionId,
    institution_name: item.institutionName,
    name: item.name,
    category: item.category,
    description: item.description,
    image: item.image,
    location: item.location,
    available_from: item.availableFrom,
    available_to: item.availableTo,
    available_days: item.availableDays,
    open_time: timeToDb(item.openTime),
    close_time: timeToDb(item.closeTime),
    blackout_dates: item.blackoutDates,
    hourly_rate: item.hourlyRate,
    daily_rate: item.dailyRate,
    security_deposit: item.securityDeposit,
    required_qualifications: item.requiredQualifications,
    required_training: item.requiredTraining,
    supervision_required: item.supervisionRequired,
    eligibility_notes: item.eligibilityNotes,
    usage_instructions: item.usageInstructions,
    booking_conditions: item.bookingConditions,
    max_booking_hours: item.maxBookingHours,
    cancellation_policy: item.cancellationPolicy,
    active: item.active,
    created_at: item.createdAt,
  };
}

// --- Bookings -------------------------------------------------------------

function bookingFromRow(row: Row): Booking {
  return {
    id: text(row.id),
    resourceId: text(row.resource_id),
    userId: text(row.user_id),
    ownerId: text(row.owner_id),
    startDate: dateValue(row.start_date),
    startTime: timeFromDb(row.start_time),
    endTime: timeFromDb(row.end_time),
    purpose: text(row.purpose),
    status: text(row.status) as Booking['status'],
    rejectionReason: text(row.rejection_reason),
    totalCost: numberValue(row.total_cost),
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
    approvedAt: nullableTime(row.approved_at),
    rejectedAt: nullableTime(row.rejected_at),
    checkedInAt: nullableTime(row.checked_in_at),
    checkedOutAt: nullableTime(row.checked_out_at),
    completedAt: nullableTime(row.completed_at),
    cancelledAt: nullableTime(row.cancelled_at),
  };
}

function bookingToRow(item: Booking): Row {
  return {
    id: item.id,
    resource_id: item.resourceId,
    user_id: item.userId,
    owner_id: item.ownerId,
    start_date: item.startDate,
    start_time: timeToDb(item.startTime),
    end_time: timeToDb(item.endTime),
    purpose: item.purpose,
    status: item.status,
    rejection_reason: item.rejectionReason,
    total_cost: item.totalCost,
    created_at: item.createdAt,
    approved_at: item.approvedAt,
    rejected_at: item.rejectedAt,
    checked_in_at: item.checkedInAt,
    checked_out_at: item.checkedOutAt,
    completed_at: item.completedAt,
    cancelled_at: item.cancelledAt,
  };
}

// --- Waiting list ---------------------------------------------------------

function waitingFromRow(row: Row): WaitingListEntry {
  return {
    id: text(row.id),
    resourceId: text(row.resource_id),
    userId: text(row.user_id),
    preferredDate: dateValue(row.preferred_date),
    startTime: timeFromDb(row.start_time),
    endTime: timeFromDb(row.end_time),
    purpose: text(row.purpose),
    status: text(row.status) as WaitingListEntry['status'],
    createdAt: text(row.created_at),
    bookingId: nullableText(row.booking_id) ?? undefined,
  };
}

function waitingToRow(item: WaitingListEntry): Row {
  return {
    id: item.id,
    resource_id: item.resourceId,
    user_id: item.userId,
    booking_id: item.bookingId ?? null,
    preferred_date: item.preferredDate,
    start_time: timeToDb(item.startTime),
    end_time: timeToDb(item.endTime),
    purpose: item.purpose,
    status: item.status,
    created_at: item.createdAt,
  };
}

// --- Handover records -----------------------------------------------------

function checkinFromRow(row: Row): CheckinRecord {
  return {
    id: text(row.id),
    bookingId: text(row.booking_id),
    userId: text(row.user_id),
    checkedInAt: text(row.checked_in_at),
    photos: listValue<string>(row.photos),
    checklist: (row.checklist as Record<string, boolean>) ?? {},
    notes: text(row.notes),
    damageNoted: booleanValue(row.damage_noted),
  };
}

function checkinToRow(item: CheckinRecord): Row {
  return {
    id: item.id,
    booking_id: item.bookingId,
    user_id: item.userId,
    checked_in_at: item.checkedInAt,
    photos: item.photos,
    checklist: item.checklist,
    notes: item.notes,
    damage_noted: item.damageNoted,
  };
}

function checkoutFromRow(row: Row): CheckoutRecord {
  return {
    id: text(row.id),
    bookingId: text(row.booking_id),
    userId: text(row.user_id),
    checkedOutAt: text(row.checked_out_at),
    photos: listValue<string>(row.photos),
    checklist: (row.checklist as Record<string, boolean>) ?? {},
    notes: text(row.notes),
    returnedBy: text(row.returned_by),
  };
}

function checkoutToRow(item: CheckoutRecord): Row {
  return {
    id: item.id,
    booking_id: item.bookingId,
    user_id: item.userId,
    checked_out_at: item.checkedOutAt,
    photos: item.photos,
    checklist: item.checklist,
    notes: item.notes,
    returned_by: item.returnedBy,
  };
}

function conditionFromRow(row: Row): ConditionReport {
  return {
    id: text(row.id),
    bookingId: text(row.booking_id),
    resourceId: text(row.resource_id),
    type: text(row.type) as ConditionReport['type'],
    images: listValue<string>(row.images),
    checklist: (row.checklist as Record<string, boolean>) ?? {},
    notes: text(row.notes),
    createdAt: text(row.created_at),
  };
}

function conditionToRow(item: ConditionReport): Row {
  return {
    id: item.id,
    booking_id: item.bookingId,
    resource_id: item.resourceId,
    type: item.type,
    images: item.images,
    checklist: item.checklist,
    notes: item.notes,
    created_at: item.createdAt,
  };
}

// --- Incidents ------------------------------------------------------------

function incidentFromRow(row: Row): Incident {
  return {
    id: text(row.id),
    reporterId: text(row.reporter_id),
    reporterName: text(row.reporter_name),
    resourceId: nullableText(row.resource_id),
    resourceName: text(row.resource_name),
    bookingId: nullableText(row.booking_id),
    category: text(row.category) as Incident['category'],
    description: text(row.description),
    images: listValue<string>(row.images),
    occurredAt: text(row.occurred_at),
    status: text(row.status) as Incident['status'],
    managerNotes: text(row.manager_notes),
    summary: text(row.summary),
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
  };
}

function incidentToRow(item: Incident): Row {
  return {
    id: item.id,
    reporter_id: item.reporterId,
    reporter_name: item.reporterName,
    resource_id: item.resourceId,
    resource_name: item.resourceName,
    booking_id: item.bookingId,
    category: item.category,
    description: item.description,
    images: item.images,
    occurred_at: item.occurredAt,
    status: item.status,
    manager_notes: item.managerNotes,
    summary: item.summary,
    created_at: item.createdAt,
  };
}

// --- Notifications --------------------------------------------------------

function notificationFromRow(row: Row): Notification {
  return {
    id: text(row.id),
    userId: text(row.user_id),
    type: text(row.type) as Notification['type'],
    title: text(row.title),
    message: text(row.message),
    link: text(row.link),
    read: booleanValue(row.read),
    createdAt: text(row.created_at),
  };
}

function notificationToRow(item: Notification): Row {
  return {
    id: item.id,
    user_id: item.userId,
    type: item.type,
    title: item.title,
    message: item.message,
    link: item.link,
    read: item.read,
    created_at: item.createdAt,
  };
}

// --- Audit ----------------------------------------------------------------

function auditFromRow(row: Row): AuditLog {
  return {
    id: text(row.id),
    action: text(row.action),
    actorId: text(row.actor_id),
    actorName: text(row.actor_name),
    resourceId: nullableText(row.resource_id),
    resourceName: text(row.resource_name),
    bookingId: nullableText(row.booking_id),
    details: text(row.details),
    createdAt: text(row.created_at),
  };
}

function auditToRow(item: AuditLog): Row {
  return {
    id: item.id,
    action: item.action,
    actor_id: item.actorId,
    actor_name: item.actorName,
    resource_id: item.resourceId,
    resource_name: item.resourceName,
    booking_id: item.bookingId,
    details: item.details,
    created_at: item.createdAt,
  };
}

// --- Qualifications -------------------------------------------------------

function qualificationFromRow(row: Row): UserQualification {
  return {
    id: text(row.id),
    userId: text(row.user_id),
    name: text(row.name),
    documentName: text(row.document_name),
    status: text(row.status) as UserQualification['status'],
    reviewerNotes: text(row.reviewer_notes),
    uploadedAt: text(row.uploaded_at),
    reviewedAt: nullableTime(row.reviewed_at),
  };
}

function qualificationToRow(item: UserQualification): Row {
  return {
    id: item.id,
    user_id: item.userId,
    name: item.name,
    document_name: item.documentName,
    status: item.status,
    reviewer_notes: item.reviewerNotes,
    uploaded_at: item.uploadedAt,
    reviewed_at: item.reviewedAt,
  };
}

// --- Eligibility requirements --------------------------------------------

function requirementFromRow(row: Row): EligibilityRequirement {
  return {
    id: text(row.id),
    resourceId: text(row.resource_id),
    type: text(row.type) as EligibilityRequirement['type'],
    label: text(row.label),
    mandatory: booleanValue(row.mandatory),
  };
}

function requirementToRow(item: EligibilityRequirement): Row {
  return {
    id: item.id,
    resource_id: item.resourceId,
    type: item.type,
    label: item.label,
    mandatory: item.mandatory,
  };
}

// --- Settings -------------------------------------------------------------

function settingsFromRow(row: Row | undefined): PlatformSettings {
  if (!row) return { ...DEFAULT_SETTINGS };
  return {
    maxActiveBookings: numberValue(row.max_active_bookings),
    maxBookingsPerMonth: numberValue(row.max_bookings_per_month),
    maxBookingHours: numberValue(row.max_booking_hours),
    institutionPriorityEnabled: booleanValue(row.institution_priority_enabled),
    waitingListEnabled: booleanValue(row.waiting_list_enabled),
    autoApproval: booleanValue(row.auto_approval),
    overdueGraceMinutes: numberValue(row.overdue_grace_minutes),
  };
}

function settingsToRow(settings: PlatformSettings): Row {
  return {
    id: 1,
    max_active_bookings: settings.maxActiveBookings,
    max_bookings_per_month: settings.maxBookingsPerMonth,
    max_booking_hours: settings.maxBookingHours,
    institution_priority_enabled: settings.institutionPriorityEnabled,
    waiting_list_enabled: settings.waitingListEnabled,
    auto_approval: settings.autoApproval,
    overdue_grace_minutes: settings.overdueGraceMinutes,
  };
}

// ---------------------------------------------------------------------------
// Table metadata
// ---------------------------------------------------------------------------

interface TableSpec {
  key: Exclude<keyof Database, 'settings'>;
  table: string;
  fromRow: (row: Row) => unknown;
  toRow: (item: unknown) => Row;
  insertRank: number;
  deleteRank: number;
  allowInsert: boolean;
}

const TABLE_SPECS: TableSpec[] = [
  {
    key: 'institutions',
    table: 'institutions',
    fromRow: institutionFromRow,
    toRow: (item) => institutionToRow(item as Institution),
    insertRank: 10,
    deleteRank: 120,
    allowInsert: true,
  },
  {
    key: 'profiles',
    table: 'profiles',
    fromRow: profileFromRow,
    toRow: (item) => profileToRow(item as Profile),
    insertRank: 20,
    deleteRank: 110,
    // New auth users get a profile row from the database trigger. Inserting
    // from the browser would be blocked by RLS for non-user roles anyway.
    allowInsert: false,
  },
  {
    key: 'resources',
    table: 'resources',
    fromRow: resourceFromRow,
    toRow: (item) => resourceToRow(item as Resource),
    insertRank: 30,
    deleteRank: 100,
    allowInsert: true,
  },
  {
    key: 'eligibilityRequirements',
    table: 'eligibility_requirements',
    fromRow: requirementFromRow,
    toRow: (item) => requirementToRow(item as EligibilityRequirement),
    insertRank: 40,
    deleteRank: 90,
    allowInsert: true,
  },
  {
    key: 'bookings',
    table: 'bookings',
    fromRow: bookingFromRow,
    toRow: (item) => bookingToRow(item as Booking),
    insertRank: 50,
    deleteRank: 80,
    allowInsert: true,
  },
  {
    key: 'waitingList',
    table: 'waiting_list',
    fromRow: waitingFromRow,
    toRow: (item) => waitingToRow(item as WaitingListEntry),
    insertRank: 60,
    deleteRank: 70,
    allowInsert: true,
  },
  {
    key: 'checkinRecords',
    table: 'checkin_records',
    fromRow: checkinFromRow,
    toRow: (item) => checkinToRow(item as CheckinRecord),
    insertRank: 65,
    deleteRank: 60,
    allowInsert: true,
  },
  {
    key: 'checkoutRecords',
    table: 'checkout_records',
    fromRow: checkoutFromRow,
    toRow: (item) => checkoutToRow(item as CheckoutRecord),
    insertRank: 66,
    deleteRank: 50,
    allowInsert: true,
  },
  {
    key: 'conditionReports',
    table: 'condition_reports',
    fromRow: conditionFromRow,
    toRow: (item) => conditionToRow(item as ConditionReport),
    insertRank: 67,
    deleteRank: 40,
    allowInsert: true,
  },
  {
    key: 'incidents',
    table: 'incidents',
    fromRow: incidentFromRow,
    toRow: (item) => incidentToRow(item as Incident),
    insertRank: 70,
    deleteRank: 30,
    allowInsert: true,
  },
  {
    key: 'qualifications',
    table: 'qualifications',
    fromRow: qualificationFromRow,
    toRow: (item) => qualificationToRow(item as UserQualification),
    insertRank: 75,
    deleteRank: 20,
    allowInsert: true,
  },
  {
    key: 'notifications',
    table: 'notifications',
    fromRow: notificationFromRow,
    toRow: (item) => notificationToRow(item as Notification),
    insertRank: 80,
    deleteRank: 10,
    allowInsert: true,
  },
  {
    key: 'auditLogs',
    table: 'audit_logs',
    fromRow: auditFromRow,
    toRow: (item) => auditToRow(item as AuditLog),
    insertRank: 90,
    deleteRank: 5,
    allowInsert: true,
  },
];

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

function clientOrThrow(): SupabaseClient {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');
  return client;
}

async function readTable(client: SupabaseClient, table: string): Promise<Row[]> {
  const { data, error } = await client.from(table).select('*');
  if (error) {
    // A missing relation (for example a migration that has not been applied
    // yet) should not take the whole app down.
    if (['42P01', 'PGRST205', 'PGRST204'].includes(error.code ?? '')) {
      console.warn(`[SPACEXCHANGE] Supabase table "${table}" is unavailable.`, error.message);
      return [];
    }
    throw error;
  }
  return (data ?? []) as Row[];
}

async function readProfileDirectory(client: SupabaseClient): Promise<Row[]> {
  const { data, error } = await client.rpc('list_profile_directory');
  if (error) {
    if (['42883', 'PGRST202'].includes(error.code ?? '')) {
      console.warn(
        '[SPACEXCHANGE] list_profile_directory() is missing. Apply database/migrations/0002_app_integration.sql so members can resolve names.',
      );
      return [];
    }
    console.warn('[SPACEXCHANGE] Could not read the profile directory.', error);
    return [];
  }
  return Array.isArray(data) ? (data as Row[]) : [];
}

export interface RemoteSnapshot {
  database: Database;
  userId: string | null;
}

export async function loadRemoteDatabase(): Promise<RemoteSnapshot> {
  const client = clientOrThrow();
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw sessionError;
  const userId = sessionData.session?.user.id ?? null;

  const [resources, institutions, requirements, settingsRows, directory] = await Promise.all([
    readTable(client, 'resources'),
    readTable(client, 'institutions'),
    readTable(client, 'eligibility_requirements'),
    readTable(client, 'platform_settings'),
    readProfileDirectory(client),
  ]);

  const profiles = new Map<string, Profile>();
  directory.forEach((row) => {
    const profile = directoryProfileFromRow(row);
    profiles.set(profile.id, profile);
  });

  let bookings: Booking[] = [];
  let waitingList: WaitingListEntry[] = [];
  let checkinRecords: CheckinRecord[] = [];
  let checkoutRecords: CheckoutRecord[] = [];
  let conditionReports: ConditionReport[] = [];
  let incidents: Incident[] = [];
  let notifications: Notification[] = [];
  let auditLogs: AuditLog[] = [];
  let qualifications: UserQualification[] = [];

  if (userId) {
    const [
      profileRows,
      bookingRows,
      waitingRows,
      checkinRows,
      checkoutRows,
      conditionRows,
      incidentRows,
      notificationRows,
      auditRows,
      qualificationRows,
    ] = await Promise.all([
      readTable(client, 'profiles'),
      readTable(client, 'bookings'),
      readTable(client, 'waiting_list'),
      readTable(client, 'checkin_records'),
      readTable(client, 'checkout_records'),
      readTable(client, 'condition_reports'),
      readTable(client, 'incidents'),
      readTable(client, 'notifications'),
      readTable(client, 'audit_logs'),
      readTable(client, 'qualifications'),
    ]);

    // Full profile rows add email and timestamps for rows the current role is
    // allowed to see. The public directory stays the fallback for names.
    profileRows.forEach((row) => {
      const profile = profileFromRow(row);
      const existing = profiles.get(profile.id);
      profiles.set(profile.id, {
        ...profile,
        email: profile.email || existing?.email || '',
        createdAt: profile.createdAt || existing?.createdAt || '',
        updatedAt: profile.updatedAt || existing?.updatedAt || '',
      });
    });

    bookings = bookingRows.map(bookingFromRow);
    waitingList = waitingRows.map(waitingFromRow);
    checkinRecords = checkinRows.map(checkinFromRow);
    checkoutRecords = checkoutRows.map(checkoutFromRow);
    conditionReports = conditionRows.map(conditionFromRow);
    incidents = incidentRows.map(incidentFromRow);
    notifications = notificationRows.map(notificationFromRow);
    auditLogs = auditRows.map(auditFromRow);
    qualifications = qualificationRows.map(qualificationFromRow);
  }

  const settings = settingsFromRow(settingsRows[0]);

  return {
    userId,
    database: {
      profiles: [...profiles.values()],
      institutions: institutions.map(institutionFromRow),
      resources: resources.map(resourceFromRow),
      bookings,
      waitingList,
      checkinRecords,
      checkoutRecords,
      conditionReports,
      incidents,
      notifications,
      auditLogs,
      qualifications,
      eligibilityRequirements: requirements.map(requirementFromRow),
      settings,
    },
  };
}

// ---------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------

interface PlannedChange {
  table: string;
  inserts: Row[];
  updates: Row[];
  deletes: string[];
  insertRank: number;
  deleteRank: number;
}

function rowMap(items: unknown[], spec: TableSpec): Map<string, Row> {
  const map = new Map<string, Row>();
  items.forEach((item) => {
    const id = text((item as { id?: unknown }).id);
    if (id) map.set(id, spec.toRow(item));
  });
  return map;
}

function sameRow(a: Row, b: Row): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function planChanges(previous: Database, next: Database): PlannedChange[] {
  const planned: PlannedChange[] = [];

  TABLE_SPECS.forEach((spec) => {
    const before = rowMap((previous[spec.key] as unknown[]) ?? [], spec);
    const after = rowMap((next[spec.key] as unknown[]) ?? [], spec);

    const inserts: Row[] = [];
    const updates: Row[] = [];
    const deletes: string[] = [];

    after.forEach((row, id) => {
      const existing = before.get(id);
      if (!existing) {
        if (spec.allowInsert) inserts.push(row);
        return;
      }
      if (!sameRow(existing, row)) updates.push(row);
    });

    before.forEach((_row, id) => {
      if (!after.has(id)) deletes.push(id);
    });

    if (inserts.length || updates.length || deletes.length) {
      planned.push({
        table: spec.table,
        inserts,
        updates,
        deletes,
        insertRank: spec.insertRank,
        deleteRank: spec.deleteRank,
      });
    }
  });

  if (!sameRow(settingsToRow(previous.settings), settingsToRow(next.settings))) {
    planned.push({
      table: 'platform_settings',
      inserts: [],
      updates: [settingsToRow(next.settings)],
      deletes: [],
      insertRank: 95,
      deleteRank: 1,
    });
  }

  return planned;
}

async function applyWrites(client: SupabaseClient, planned: PlannedChange[]): Promise<void> {
  const inserts = planned
    .filter((change) => change.inserts.length)
    .sort((a, b) => a.insertRank - b.insertRank);
  const updates = planned.filter((change) => change.updates.length);
  const deletes = planned
    .filter((change) => change.deletes.length)
    .sort((a, b) => a.deleteRank - b.deleteRank);

  for (const change of inserts) {
    const { error } = await client.from(change.table).insert(change.inserts);
    if (error) throw error;
  }

  for (const change of updates) {
    const isSettings = change.table === 'platform_settings';
    for (const row of change.updates) {
      const { error } = isSettings
        ? await client.from(change.table).update(row).eq('id', 1)
        : await client
            .from(change.table)
            .update(row)
            .eq('id', text(row.id));
      if (error) throw error;
    }
  }

  for (const change of deletes) {
    for (const id of change.deletes) {
      const { error } = await client.from(change.table).delete().eq('id', id);
      if (error) throw error;
    }
  }
}

export async function flushRemoteChanges(previous: Database, next: Database): Promise<void> {
  const planned = planChanges(previous, next);
  if (planned.length === 0) return;
  await applyWrites(clientOrThrow(), planned);
}

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

export interface AuthResult {
  userId: string | null;
  needsEmailConfirmation: boolean;
  email: string;
}

export async function authSessionUserId(): Promise<string | null> {
  const client = clientOrThrow();
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  return data.session?.user.id ?? null;
}

export async function authSignIn(email: string, password: string): Promise<AuthResult> {
  const client = clientOrThrow();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return {
    userId: data.user?.id ?? data.session?.user.id ?? null,
    needsEmailConfirmation: false,
    email,
  };
}

export interface SignUpMetadata {
  fullName: string;
  email: string;
  password: string;
  role: string;
  institutionId: string;
  institutionName: string;
}

export async function authSignUp(input: SignUpMetadata): Promise<AuthResult> {
  const client = clientOrThrow();
  const redirectTo =
    typeof window !== 'undefined' ? `${window.location.origin}/login` : undefined;
  const { data, error } = await client.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      emailRedirectTo: redirectTo,
      data: {
        full_name: input.fullName,
        role: input.role,
        institution_id: input.institutionId || null,
        institution_name: input.institutionName,
      },
    },
  });
  if (error) throw error;
  return {
    userId: data.user?.id ?? data.session?.user.id ?? null,
    needsEmailConfirmation: Boolean(data.user && !data.session),
    email: input.email,
  };
}

export async function authSignOut(): Promise<void> {
  const client = clientOrThrow();
  const { error } = await client.auth.signOut();
  if (error) throw error;
}

export async function authUpdatePassword(password: string): Promise<void> {
  const client = clientOrThrow();
  const { error } = await client.auth.updateUser({ password });
  if (error) throw error;
}

export async function authSendPasswordReset(email: string): Promise<void> {
  const client = clientOrThrow();
  const redirectTo =
    typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined;
  const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw error;
}

export async function authUpdateMetadata(metadata: Record<string, unknown>): Promise<void> {
  const client = clientOrThrow();
  const { error } = await client.auth.updateUser({ data: metadata });
  if (error) throw error;
}

/**
 * Fallback for projects where database/migrations/0002_app_integration.sql has
 * not been applied yet. The 0001 RLS policy lets a signed-in user insert their
 * own member profile, so a plain "user" signup can still finish. Owner and
 * manager profiles need the auth trigger because their role is not self-service.
 */
export async function authCreateOwnProfileIfMissing(): Promise<boolean> {
  const client = clientOrThrow();
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user) return false;

  const user = userData.user;
  const { data: existing, error: readError } = await client
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (readError) {
    // RLS can hide the row instead of returning it; an insert will surface a
    // duplicate-key error, which means the profile already exists.
    console.warn('[SPACEXCHANGE] Could not check for an existing profile.', readError);
  }
  if (existing) return true;

  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const requestedRole = typeof metadata.role === 'string' ? metadata.role : 'user';
  if (requestedRole !== 'user') return false;

  const fullName =
    (typeof metadata.full_name === 'string' && metadata.full_name.trim()) ||
    user.email?.split('@')[0] ||
    'Member';

  const { error } = await client.from('profiles').insert({
    id: user.id,
    email: user.email ?? `${user.id}@no-email.local`,
    full_name: fullName,
    role: 'user',
    institution_id: null,
    institution_name: typeof metadata.institution_name === 'string' ? metadata.institution_name : '',
    verified: false,
  });

  if (error) {
    if (error.code === '23505') return true;
    console.warn(
      '[SPACEXCHANGE] Could not create a profile for this user. Apply database/migrations/0002_app_integration.sql.',
      error,
    );
    return false;
  }
  return true;
}

export function onAuthStateChange(
  callback: (event: string, userId: string | null) => void,
): () => void {
  const client = getSupabaseClient();
  if (!client) return () => undefined;
  const { data } = client.auth.onAuthStateChange((event, session) => {
    callback(event, session?.user.id ?? null);
  });
  return () => data.subscription.unsubscribe();
}

export async function runOverdueSweep(): Promise<number> {
  const client = clientOrThrow();
  const { data, error } = await client.rpc('sweep_overdue_bookings');
  if (error) {
    // Optional RPC: older projects may not have the migration yet.
    if (['42883', 'PGRST202'].includes(error.code ?? '')) return 0;
    throw error;
  }
  return typeof data === 'number' ? data : 0;
}

export { DEFAULT_SETTINGS };
