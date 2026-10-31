import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Bell,
  BellOff,
  CalendarCheck,
  CheckCheck,
  ClipboardList,
  Filter,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useLiveQuery } from '@/hooks/useLiveQuery';
import {
  clearReadNotifications,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/services/notificationService';
import type { NotificationType } from '@/types';
import { cn, timeAgo } from '@/utils/format';

const TYPE_META: Record<NotificationType, { icon: typeof Bell; tone: string }> = {
  booking_submitted: { icon: ClipboardList, tone: 'bg-navy-50 text-navy-700' },
  booking_approved: { icon: CalendarCheck, tone: 'bg-emerald-50 text-emerald-700' },
  booking_rejected: { icon: BellOff, tone: 'bg-rose-50 text-rose-700' },
  booking_cancelled: { icon: BellOff, tone: 'bg-slate-100 text-slate-600' },
  waitlist_update: { icon: Sparkles, tone: 'bg-purple-50 text-purple-700' },
  reminder: { icon: Bell, tone: 'bg-amber-50 text-amber-700' },
  checkin: { icon: CalendarCheck, tone: 'bg-sky-50 text-sky-700' },
  return: { icon: CheckCheck, tone: 'bg-teal-50 text-teal-700' },
  overdue: { icon: AlertTriangle, tone: 'bg-rose-50 text-rose-700' },
  incident: { icon: AlertTriangle, tone: 'bg-amber-50 text-amber-800' },
  incident_update: { icon: ShieldCheck, tone: 'bg-navy-50 text-navy-700' },
  eligibility: { icon: ShieldCheck, tone: 'bg-purple-50 text-purple-700' },
  system: { icon: Sparkles, tone: 'bg-navy-50 text-navy-700' },
};

export function Notifications() {
  const { profile } = useAuth();
  const toast = useToast();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const notifications = useLiveQuery(
    () => (profile ? listNotifications(profile.id) : []),
    [profile?.id],
  );

  const visible = filter === 'unread' ? notifications.filter((n) => !n.read) : notifications;
  const unreadCount = notifications.filter((n) => !n.read).length;

  if (!profile) return null;

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="Booking updates, eligibility decisions, handover reminders and incident responses."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                markAllNotificationsRead(profile.id);
                toast.success('All caught up', 'Every notification is marked as read.');
              }}
              disabled={unreadCount === 0}
              icon={<CheckCheck className="h-3.5 w-3.5" />}
            >
              Mark all read
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                clearReadNotifications(profile.id);
                toast.info('Cleared', 'Read notifications were removed.');
              }}
              icon={<Trash2 className="h-3.5 w-3.5" />}
            >
              Clear read
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
          {(['all', 'unread'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setFilter(option)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition',
                filter === option ? 'bg-navy-900 text-white' : 'text-slate-500 hover:text-navy-700',
              )}
            >
              {option}
              {option === 'unread' && unreadCount > 0 ? ` (${unreadCount})` : ''}
            </button>
          ))}
        </div>
        <Badge tone="slate">
          <Filter className="h-3 w-3" /> {visible.length} shown
        </Badge>
      </div>

      <Card className="overflow-hidden">
        {visible.length === 0 ? (
          <EmptyState
            icon={BellOff}
            title={filter === 'unread' ? 'No unread notifications' : 'Nothing here yet'}
            description={
              filter === 'unread'
                ? 'You have read every notification. Switch to All to review past updates.'
                : 'Booking and eligibility updates will appear here as you use SPACEXCHANGE.'
            }
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {visible.map((notification) => {
              const meta = TYPE_META[notification.type];
              const Icon = meta.icon;
              const body = (
                <>
                  <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', meta.tone)}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-ink">{notification.title}</p>
                      {!notification.read ? <span className="h-1.5 w-1.5 rounded-full bg-navy-600" /> : null}
                    </div>
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{notification.message}</p>
                    <p className="mt-1.5 text-[11px] text-slate-400">{timeAgo(notification.createdAt)}</p>
                  </div>
                </>
              );

              return (
                <li
                  key={notification.id}
                  className={cn('relative transition hover:bg-slate-50/70', !notification.read && 'bg-navy-50/40')}
                >
                  {notification.link ? (
                    <Link
                      to={notification.link}
                      onClick={() => markNotificationRead(profile.id, notification.id)}
                      className="flex items-start gap-3 px-4 py-4"
                    >
                      {body}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => markNotificationRead(profile.id, notification.id)}
                      className="flex w-full items-start gap-3 px-4 py-4 text-left"
                    >
                      {body}
                    </button>
                  )}
                  {!notification.read ? (
                    <button
                      type="button"
                      onClick={() => markNotificationRead(profile.id, notification.id)}
                      className="absolute right-3 top-3 rounded-lg px-2 py-1 text-[10px] font-semibold text-navy-700 hover:bg-navy-100"
                    >
                      Mark read
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
