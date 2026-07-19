import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type { AppNotification, NotificationSeverity } from '@shared/notifications';
import { useNotifications } from '@shared/notifications';
import { formatDistanceToNow } from 'date-fns';
import type { LucideIcon } from 'lucide-react';
import { AlertTriangle, Bell, CheckCheck, CheckCircle2, Info, XCircle } from 'lucide-react';

const SEVERITY_ICONS: Record<NotificationSeverity, LucideIcon> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
};

const SEVERITY_CLASSES: Record<NotificationSeverity, string> = {
  info: 'text-info',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-danger',
};

/** TopBar bell with unread badge and a dropdown Notification Center panel. */
export function NotificationBell(): JSX.Element {
  const { t } = useTranslation();
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleToggle = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  const handleMarkAllRead = useCallback(() => {
    markAllRead();
  }, [markAllRead]);

  const handleActivate = useCallback(
    (notification: AppNotification) => {
      markRead(notification.id);
      if (notification.link) {
        navigate(notification.link);
        setOpen(false);
      }
    },
    [markRead, navigate],
  );

  return (
    <div className="relative">
      <button
        onClick={handleToggle}
        aria-label={t('notifications.open', 'Open notifications')}
        aria-expanded={open}
        className="relative rounded-md p-xs text-on-surface-variant transition-colors hover:bg-surface-container-high"
      >
        <Bell size={18} aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-[3px] text-label-xs font-mono text-on-primary">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" role="presentation" onClick={handleClose} />
          <div
            role="dialog"
            aria-label={t('notifications.title', 'Notifications')}
            className="absolute right-0 top-full z-50 mt-xs w-96 rounded-md border border-outline-variant bg-surface-container-high shadow-lg"
          >
            <div className="flex items-center justify-between border-b border-outline-variant p-sm">
              <h2 className="text-body-sm font-semibold text-on-surface">
                {t('notifications.title', 'Notifications')}
              </h2>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-xs rounded-sm px-xs py-0.5 text-label-xs text-primary hover:bg-surface-container-highest"
                >
                  <CheckCheck size={14} aria-hidden="true" />
                  {t('notifications.markAllRead', 'Mark all as read')}
                </button>
              )}
            </div>
            <ul className="max-h-[60vh] overflow-y-auto">
              {notifications.length === 0 && (
                <li className="p-md text-center text-body-sm text-on-surface-variant">
                  {t('notifications.empty', 'No notifications')}
                </li>
              )}
              {notifications.map((notification) => (
                <NotificationListItem
                  key={notification.id}
                  notification={notification}
                  onActivate={handleActivate}
                />
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

interface NotificationListItemProps {
  notification: AppNotification;
  onActivate: (notification: AppNotification) => void;
}

function NotificationListItem({
  notification,
  onActivate,
}: NotificationListItemProps): JSX.Element {
  const handleClick = useCallback(() => {
    onActivate(notification);
  }, [onActivate, notification]);

  const Icon = SEVERITY_ICONS[notification.severity];

  return (
    <li className="border-t border-outline-variant first:border-t-0">
      <button
        onClick={handleClick}
        className={`flex w-full items-start gap-sm p-sm text-left transition-colors hover:bg-surface-container-highest ${
          notification.read ? 'opacity-60' : ''
        }`}
      >
        <Icon
          size={16}
          className={`mt-0.5 shrink-0 ${SEVERITY_CLASSES[notification.severity]}`}
          aria-hidden="true"
        />
        <span className="flex-1">
          <span className="block text-body-sm text-on-surface">{notification.title}</span>
          {notification.description && (
            <span className="mt-xs block text-body-sm text-on-surface-variant">
              {notification.description}
            </span>
          )}
          <span className="mt-xs block text-label-xs font-mono text-on-surface-variant">
            {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
          </span>
        </span>
        {!notification.read && (
          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
        )}
      </button>
    </li>
  );
}
