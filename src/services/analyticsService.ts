import { getDb } from '@/lib/demoDb';
import { bookingHours } from '@/utils/date';
import { getAdminStats } from '@/services/adminService';

export interface OwnerAnalytics {
  totalResources: number;
  activeResources: number;
  pendingRequests: number;
  approvedRequests: number;
  overdueReturns: number;
  openIncidents: number;
  completedBookings: number;
  revenue: number;
  utilisation: number;
  statusDistribution: { name: string; value: number }[];
  weeklyActivity: { label: string; bookings: number; hours: number }[];
  topResources: { name: string; bookings: number; hours: number }[];
}

export function getOwnerAnalytics(ownerId: string): OwnerAnalytics {
  const db = getDb();
  const resources = db.resources.filter((r) => r.ownerId === ownerId);
  const resourceIds = new Set(resources.map((r) => r.id));
  const bookings = db.bookings.filter((b) => resourceIds.has(b.resourceId));
  const incidents = db.incidents.filter((i) => i.resourceId && resourceIds.has(i.resourceId));
  const completed = bookings.filter((b) => b.status === 'completed');
  const totalCompletedHours = completed.reduce(
    (sum, b) => sum + Math.max(0, bookingHours(b.startTime, b.endTime)),
    0,
  );
  const availableHoursPerWeek = resources.reduce((sum, r) => {
    const daily = Math.max(
      0,
      (Number(r.closeTime.split(':')[0]) * 60 + Number(r.closeTime.split(':')[1]) -
        (Number(r.openTime.split(':')[0]) * 60 + Number(r.openTime.split(':')[1]))) /
        60,
    );
    return sum + daily * r.availableDays.length;
  }, 0);
  const utilisation =
    availableHoursPerWeek > 0
      ? Math.min(100, Math.round((totalCompletedHours / (availableHoursPerWeek * 4)) * 100))
      : 0;

  const statusMap = new Map<string, number>();
  bookings.forEach((b) => {
    const label =
      b.status === 'checked_in'
        ? 'Checked In'
        : b.status === 'checked_out'
          ? 'Checked Out'
          : b.status.charAt(0).toUpperCase() + b.status.slice(1);
    statusMap.set(label, (statusMap.get(label) ?? 0) + 1);
  });

  const weeklyActivity: OwnerAnalytics['weeklyActivity'] = [];
  for (let i = 7; i >= 0; i--) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - i * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    const inRange = bookings.filter((b) => {
      const d = new Date(`${b.startDate}T00:00:00`);
      return d >= start && d < end;
    });
    weeklyActivity.push({
      label: start.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
      bookings: inRange.length,
      hours: Math.round(
        inRange.reduce((sum, b) => sum + Math.max(0, bookingHours(b.startTime, b.endTime)), 0),
      ),
    });
  }

  const topResources = resources
    .map((resource) => {
      const related = bookings.filter((b) => b.resourceId === resource.id);
      return {
        name: resource.name.replace(/ — .*$/, ''),
        bookings: related.length,
        hours: Math.round(related.reduce((sum, b) => sum + Math.max(0, bookingHours(b.startTime, b.endTime)), 0)),
      };
    })
    .sort((a, b) => b.bookings - a.bookings)
    .slice(0, 5);

  return {
    totalResources: resources.length,
    activeResources: resources.filter((r) => r.active).length,
    pendingRequests: bookings.filter((b) => b.status === 'pending').length,
    approvedRequests: bookings.filter((b) => b.status === 'approved').length,
    overdueReturns: bookings.filter((b) => b.status === 'overdue').length,
    openIncidents: incidents.filter((i) => ['reported', 'under_review'].includes(i.status)).length,
    completedBookings: completed.length,
    revenue: completed.reduce((sum, b) => sum + b.totalCost, 0),
    utilisation,
    statusDistribution: [...statusMap.entries()].map(([name, value]) => ({ name, value })),
    weeklyActivity,
    topResources,
  };
}

export interface UserStats {
  activeBookings: number;
  pendingRequests: number;
  approvedBookings: number;
  waitlisted: number;
  completedBookings: number;
  overdue: number;
  totalSpent: number;
  unreadNotifications: number;
  openIncidents: number;
}

export function getUserStats(userId: string): UserStats {
  const db = getDb();
  const bookings = db.bookings.filter((b) => b.userId === userId);
  return {
    activeBookings: bookings.filter((b) => ['approved', 'checked_in'].includes(b.status)).length,
    pendingRequests: bookings.filter((b) => b.status === 'pending').length,
    approvedBookings: bookings.filter((b) => b.status === 'approved').length,
    waitlisted: bookings.filter((b) => b.status === 'waitlisted').length,
    completedBookings: bookings.filter((b) => b.status === 'completed').length,
    overdue: bookings.filter((b) => b.status === 'overdue').length,
    totalSpent: bookings
      .filter((b) => ['completed', 'checked_out'].includes(b.status))
      .reduce((sum, b) => sum + b.totalCost, 0),
    unreadNotifications: db.notifications.filter((n) => n.userId === userId && !n.read).length,
    openIncidents: db.incidents.filter(
      (i) => i.reporterId === userId && ['reported', 'under_review'].includes(i.status),
    ).length,
  };
}

export interface PlatformStats {
  resources: number;
  institutions: number;
  members: number;
  completedBookings: number;
  categories: number;
  cities: number;
  hoursShared: number;
}

export function getPlatformStats(): PlatformStats {
  const db = getDb();
  const locations = new Set(db.resources.map((r) => r.location.split(',').slice(-1)[0]?.trim()));
  return {
    resources: db.resources.filter((r) => r.active).length,
    institutions: db.institutions.length,
    members: db.profiles.length,
    completedBookings: db.bookings.filter((b) => ['completed', 'checked_out'].includes(b.status)).length,
    categories: new Set(db.resources.map((r) => r.category)).size,
    cities: locations.size,
    hoursShared: Math.round(
      db.bookings
        .filter((b) => ['completed', 'checked_out'].includes(b.status))
        .reduce((sum, b) => sum + Math.max(0, bookingHours(b.startTime, b.endTime)), 0),
    ),
  };
}

export function getAdminAnalytics() {
  const db = getDb();
  const stats = getAdminStats();
  const monthMap = new Map<string, { bookings: number; users: number }>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    const key = d.toISOString().slice(0, 7);
    monthMap.set(key, { bookings: 0, users: 0 });
  }
  db.bookings.forEach((b) => {
    const key = b.createdAt.slice(0, 7);
    const entry = monthMap.get(key);
    if (entry) entry.bookings += 1;
  });
  db.profiles.forEach((p) => {
    const key = p.createdAt.slice(0, 7);
    const entry = monthMap.get(key);
    if (entry) entry.users += 1;
  });
  const monthly = [...monthMap.entries()].map(([key, value]) => ({
    label: new Date(`${key}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'short' }),
    ...value,
  }));
  const topInstitutions = db.institutions
    .map((institution) => ({
      name: institution.name.replace('GNIT ', ''),
      resources: db.resources.filter((r) => r.institutionId === institution.id).length,
      bookings: db.bookings.filter((b) => {
        const resource = db.resources.find((r) => r.id === b.resourceId);
        return resource?.institutionId === institution.id;
      }).length,
    }))
    .sort((a, b) => b.bookings - a.bookings);
  return { stats, monthly, topInstitutions };
}
