import { getDb, mutateDb } from '@/lib/demoDb';
import type { Notification } from '@/types';

export function listNotifications(userId: string): Notification[] {
  return getDb()
    .notifications.filter((n) => n.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function unreadNotificationCount(userId: string): number {
  return getDb().notifications.filter((n) => n.userId === userId && !n.read).length;
}

export function markNotificationRead(userId: string, notificationId: string): void {
  mutateDb((db) => {
    const notification = db.notifications.find((n) => n.id === notificationId && n.userId === userId);
    if (notification) notification.read = true;
  });
}

export function markAllNotificationsRead(userId: string): void {
  mutateDb((db) => {
    db.notifications.forEach((n) => {
      if (n.userId === userId) n.read = true;
    });
  });
}

export function clearReadNotifications(userId: string): void {
  mutateDb((db) => {
    db.notifications = db.notifications.filter((n) => n.userId !== userId || !n.read);
  });
}
