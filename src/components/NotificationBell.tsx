import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLiveQuery } from '@/hooks/useLiveQuery';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  unreadNotificationCount,
} from '@/services/notificationService';
import { cn, timeAgo } from '@/utils/format';
import { EmptyState } from '@/components/ui/EmptyState';

export function NotificationBell() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const notifications = useLiveQuery(
    () => (profile ? listNotifications(profile.id) : []),
    [profile?.id],
  );
  const unread = useLiveQuery(
    () => (profile ? unreadNotificationCount(profile.id) : 0),
    [profile?.id],
  );

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (!profile) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-navy-700"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
      >
        <Bell className="h-5 w-5" />
        {unread > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lift animate-fade-up">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-semibold text-ink">Notifications</p>
            {unread > 0 ? (
              <button
                type="button"
                onClick={() => markAllNotificationsRead(profile.id)}
                className="inline-flex items-center gap-1 text-xs font-medium text-navy-600 hover:text-navy-800"
              >
                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
              </button>
            ) : null}
          </div>
          <div className="scroll-thin max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <EmptyState
                icon={Bell}
                title="No notifications yet"
                description="Booking updates and reminders will appear here."
                className="py-10"
              />
            ) : (
              notifications.slice(0, 6).map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => {
                    markNotificationRead(profile.id, notification.id);
                    setOpen(false);
                    if (notification.link) navigate(notification.link);
                  }}
                  className={cn(
                    'flex w-full gap-3 border-b border-slate-50 px-4 py-3 text-left transition hover:bg-slate-50',
                    !notification.read && 'bg-navy-50/40',
                  )}
                >
                  <span
                    className={cn(
                      'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                      notification.read ? 'bg-slate-200' : 'bg-navy-500',
                    )}
                  />
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold text-ink">{notification.title}</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                      {notification.message}
                    </span>
                    <span className="mt-1 block text-[10px] text-slate-400">
                      {timeAgo(notification.createdAt)}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
          <Link
            to="/notifications"
            onClick={() => setOpen(false)}
            className="block border-t border-slate-100 px-4 py-3 text-center text-xs font-semibold text-navy-700 hover:bg-slate-50"
          >
            View all notifications
          </Link>
        </div>
      ) : null}
    </div>
  );
}
