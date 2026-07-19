export type NotificationSeverity = 'info' | 'success' | 'warning' | 'error';

/** A notification stored in the Notification Center. */
export interface AppNotification {
  id: string;
  title: string;
  description?: string;
  severity: NotificationSeverity;
  createdAt: Date;
  read: boolean;
  /** Optional in-app route the notification navigates to on click. */
  link?: string;
}

/** Input accepted by notify()/publishNotification(). */
export interface NotificationInput {
  title: string;
  description?: string;
  severity?: NotificationSeverity;
  link?: string;
}
