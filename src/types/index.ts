export type Role = 'user' | 'resource_owner' | 'institution_manager' | 'administrator';

export const ROLE_LABELS: Record<Role, string> = {
  user: 'User',
  resource_owner: 'Resource Owner',
  institution_manager: 'Institution Manager',
  administrator: 'Administrator',
};

export type BookingStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'waitlisted'
  | 'cancelled'
  | 'checked_in'
  | 'checked_out'
  | 'completed'
  | 'overdue';

export type IncidentStatus = 'reported' | 'under_review' | 'resolved' | 'rejected';
export type IncidentCategory =
  | 'damaged_equipment'
  | 'missing_equipment'
  | 'late_return'
  | 'misuse'
  | 'safety_issue'
  | 'scheduling_conflict'
  | 'other';

export type EligibilityStatus = 'eligible' | 'pending' | 'not_eligible';

export type QualificationStatus = 'pending' | 'verified' | 'rejected';

export type NotificationType =
  | 'booking_submitted'
  | 'booking_approved'
  | 'booking_rejected'
  | 'booking_cancelled'
  | 'waitlist_update'
  | 'reminder'
  | 'checkin'
  | 'return'
  | 'overdue'
  | 'incident'
  | 'incident_update'
  | 'eligibility'
  | 'system';

export interface Profile {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  institutionId: string | null;
  institutionName: string;
  verified: boolean;
  suspended: boolean;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
}

export interface Institution {
  id: string;
  name: string;
  type: string;
  location: string;
  contactEmail: string;
  verified: boolean;
  createdAt: string;
}

export interface Resource {
  id: string;
  ownerId: string;
  institutionId: string | null;
  institutionName: string;
  name: string;
  category: string;
  description: string;
  image: string;
  location: string;
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
  createdAt: string;
  updatedAt: string;
}

export interface Booking {
  id: string;
  resourceId: string;
  userId: string;
  ownerId: string;
  startDate: string;
  startTime: string;
  endTime: string;
  purpose: string;
  status: BookingStatus;
  rejectionReason: string;
  totalCost: number;
  createdAt: string;
  updatedAt: string;
  approvedAt: string | null;
  rejectedAt: string | null;
  checkedInAt: string | null;
  checkedOutAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
}

export interface WaitingListEntry {
  id: string;
  resourceId: string;
  userId: string;
  preferredDate: string;
  startTime: string;
  endTime: string;
  purpose: string;
  status: 'waiting' | 'notified' | 'converted' | 'cancelled';
  createdAt: string;
  bookingId?: string;
}

export interface CheckinRecord {
  id: string;
  bookingId: string;
  userId: string;
  checkedInAt: string;
  photos: string[];
  checklist: Record<string, boolean>;
  notes: string;
  damageNoted: boolean;
}

export interface CheckoutRecord {
  id: string;
  bookingId: string;
  userId: string;
  checkedOutAt: string;
  photos: string[];
  checklist: Record<string, boolean>;
  notes: string;
  returnedBy: string;
}

export interface ConditionReport {
  id: string;
  bookingId: string;
  resourceId: string;
  type: 'initial' | 'final';
  images: string[];
  checklist: Record<string, boolean>;
  notes: string;
  createdAt: string;
}

export interface Incident {
  id: string;
  reporterId: string;
  reporterName: string;
  resourceId: string | null;
  resourceName: string;
  bookingId: string | null;
  category: IncidentCategory;
  description: string;
  images: string[];
  occurredAt: string;
  status: IncidentStatus;
  managerNotes: string;
  summary: string;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string;
  read: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  actorId: string;
  actorName: string;
  resourceId: string | null;
  resourceName: string;
  bookingId: string | null;
  details: string;
  createdAt: string;
}

export interface UserQualification {
  id: string;
  userId: string;
  name: string;
  documentName: string;
  status: QualificationStatus;
  reviewerNotes: string;
  uploadedAt: string;
  reviewedAt: string | null;
}

export interface EligibilityRequirement {
  id: string;
  resourceId: string;
  type: 'qualification' | 'training' | 'institution' | 'verification';
  label: string;
  mandatory: boolean;
}

export interface PlatformSettings {
  maxActiveBookings: number;
  maxBookingsPerMonth: number;
  maxBookingHours: number;
  institutionPriorityEnabled: boolean;
  waitingListEnabled: boolean;
  autoApproval: boolean;
  overdueGraceMinutes: number;
}

export interface Database {
  profiled?: never;
  profiles: Profile[];
  institutions: Institution[];
  resources: Resource[];
  bookings: Booking[];
  waitingList: WaitingListEntry[];
  checkinRecords: CheckinRecord[];
  checkoutRecords: CheckoutRecord[];
  conditionReports: ConditionReport[];
  incidents: Incident[];
  notifications: Notification[];
  auditLogs: AuditLog[];
  qualifications: UserQualification[];
  eligibilityRequirements: EligibilityRequirement[];
  settings: PlatformSettings;
}

export interface EligibilityResult {
  status: EligibilityStatus;
  reasons: string[];
  checks: { label: string; passed: boolean; detail: string; state?: 'pass' | 'pending' | 'fail' }[];
}

export interface ResourceFilters {
  search?: string;
  category?: string;
  institutionId?: string;
  location?: string;
  availableOnly?: boolean;
  maxPrice?: number;
  skill?: string;
  sort?: 'newest' | 'availability' | 'popularity';
}

export const CATEGORIES = [
  'Laboratories',
  'Computers and Laptops',
  'Cameras and Photography Equipment',
  '3D Printers',
  'Manufacturing Tools',
  'Electronics Equipment',
  'Classrooms',
  'Meeting Rooms',
  'Conference Halls',
  'Research Equipment',
  'Workshop Equipment',
  'Other Resources',
] as const;

export const CATEGORY_IMAGES: Record<string, string> = {
  Laboratories: '/images/lab.svg',
  'Computers and Laptops': '/images/computers.svg',
  'Cameras and Photography Equipment': '/images/camera.svg',
  '3D Printers': '/images/printer.svg',
  'Manufacturing Tools': '/images/workshop.svg',
  'Electronics Equipment': '/images/electronics.svg',
  Classrooms: '/images/classroom.svg',
  'Meeting Rooms': '/images/meeting.svg',
  'Conference Halls': '/images/conference.svg',
  'Research Equipment': '/images/research.svg',
  'Workshop Equipment': '/images/workshop.svg',
  'Other Resources': '/images/other.svg',
};

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  waitlisted: 'Waitlisted',
  cancelled: 'Cancelled',
  checked_in: 'Checked In',
  checked_out: 'Checked Out',
  completed: 'Completed',
  overdue: 'Overdue',
};

export const INCIDENT_CATEGORY_LABELS: Record<IncidentCategory, string> = {
  damaged_equipment: 'Damaged equipment',
  missing_equipment: 'Missing equipment',
  late_return: 'Late return',
  misuse: 'Misuse',
  safety_issue: 'Safety issue',
  scheduling_conflict: 'Scheduling conflict',
  other: 'Other',
};

export const INCIDENT_STATUS_LABELS: Record<IncidentStatus, string> = {
  reported: 'Reported',
  under_review: 'Under Review',
  resolved: 'Resolved',
  rejected: 'Rejected',
};
