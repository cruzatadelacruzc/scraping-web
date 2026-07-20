export interface NotificationPreferences {
  channels: {
    push: {
      enabled: boolean;
      types: string[];
    };
    telegram: {
      enabled: boolean;
      types: string[];
    };
    whatsapp: {
      enabled: boolean;
      types: string[];
    };
    email: {
      enabled: boolean;
      types: string[];
    };
  };
  quietHours?: {
    start: string;
    end: string;
    timezone: string;
  };
}

export const defaultPreferences: NotificationPreferences = {
  channels: {
    push: { enabled: true, types: ['alarm.triggered', 'bot.message', 'subscription.renewal'] },
    telegram: { enabled: false, types: [] },
    whatsapp: { enabled: false, types: [] },
    email: { enabled: true, types: ['security.login_new_device', 'subscription.payment_failed'] },
  },
};

export type NotificationType =
  | 'alarm.triggered'
  | 'alarm.created'
  | 'bot.connected'
  | 'bot.disconnected'
  | 'subscription.renewal'
  | 'subscription.payment_failed'
  | 'system.maintenance'
  | 'security.login_new_device';

export const NOTIFICATION_TYPES: NotificationType[] = [
  'alarm.triggered',
  'alarm.created',
  'bot.connected',
  'bot.disconnected',
  'subscription.renewal',
  'subscription.payment_failed',
  'system.maintenance',
  'security.login_new_device',
];