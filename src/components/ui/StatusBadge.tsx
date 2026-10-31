import { Badge } from '@/components/ui/Badge';
import {
  BOOKING_STATUS_LABELS,
  INCIDENT_STATUS_LABELS,
  type BookingStatus,
  type IncidentStatus,
  type QualificationStatus,
} from '@/types';

const BOOKING_TONES: Record<BookingStatus, 'amber' | 'green' | 'rose' | 'slate' | 'navy' | 'sky' | 'teal' | 'purple'> = {
  pending: 'amber',
  approved: 'green',
  rejected: 'rose',
  waitlisted: 'purple',
  cancelled: 'slate',
  checked_in: 'navy',
  checked_out: 'sky',
  completed: 'teal',
  overdue: 'rose',
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return (
    <Badge tone={BOOKING_TONES[status]} dot>
      {BOOKING_STATUS_LABELS[status]}
    </Badge>
  );
}

const INCIDENT_TONES: Record<IncidentStatus, 'amber' | 'navy' | 'green' | 'slate'> = {
  reported: 'amber',
  under_review: 'navy',
  resolved: 'green',
  rejected: 'slate',
};

export function IncidentStatusBadge({ status }: { status: IncidentStatus }) {
  return (
    <Badge tone={INCIDENT_TONES[status]} dot>
      {INCIDENT_STATUS_LABELS[status]}
    </Badge>
  );
}

const QUALIFICATION_TONES: Record<QualificationStatus, 'amber' | 'green' | 'rose'> = {
  pending: 'amber',
  verified: 'green',
  rejected: 'rose',
};

export function QualificationStatusBadge({ status }: { status: QualificationStatus }) {
  return (
    <Badge tone={QUALIFICATION_TONES[status]} dot>
      {status === 'pending' ? 'Awaiting review' : status === 'verified' ? 'Verified' : 'Rejected'}
    </Badge>
  );
}
