export interface AuthSession {
  userId: string;
  accountId: string;
  roles: string[];
  permissions: string[];
  expiresAt: number;
  accessToken: string;
}

export interface UserViewModel {
  id: string;
  accountId: string;
  email: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  emailVerified: boolean;
  roles: { id: string; name: string }[];
  createdAt: string;
  updatedAt: string;
}

export enum Permission {
  VIEW_ALARMS = 'alarms:view',
  MANAGE_ALARMS = 'alarms:manage',
  VIEW_NOTIFICATIONS = 'notifications:view',
  MANAGE_BOTS = 'bots:manage',
  VIEW_SUBSCRIPTION = 'subscription:view',
  MANAGE_SUBSCRIPTION = 'subscription:manage',
  VIEW_PROFILE = 'profile:view',
  MANAGE_PROFILE = 'profile:manage',
  VIEW_ACCOUNT = 'account:view',
  MANAGE_ACCOUNT = 'account:manage',
}

export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  ACCOUNT_OWNER: [
    Permission.VIEW_ALARMS,
    Permission.MANAGE_ALARMS,
    Permission.VIEW_NOTIFICATIONS,
    Permission.MANAGE_BOTS,
    Permission.VIEW_SUBSCRIPTION,
    Permission.MANAGE_SUBSCRIPTION,
    Permission.VIEW_PROFILE,
    Permission.MANAGE_PROFILE,
    Permission.VIEW_ACCOUNT,
    Permission.MANAGE_ACCOUNT,
  ],
  MEMBER: [
    Permission.VIEW_ALARMS,
    Permission.VIEW_NOTIFICATIONS,
    Permission.VIEW_PROFILE,
    Permission.VIEW_ACCOUNT,
  ],
};