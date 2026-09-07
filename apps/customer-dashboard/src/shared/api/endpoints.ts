export const ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER_LOCAL: '/api/accounts/register/local',
    REGISTER_PROVIDER: '/api/accounts/register/provider',
    REFRESH: '/api/auth/refresh',
    LOGOUT: '/api/auth/logout',
    FORGOT_PASSWORD: '/api/auth/forgot-password',
    RESET_PASSWORD: '/api/auth/reset-password',
    VERIFY_EMAIL: '/api/auth/verify-email',
    SEND_VERIFICATION: '/api/auth/send-verification-email',
    CHANGE_PASSWORD: '/api/auth/password',
    CHANGE_EMAIL: '/api/auth/email',
    DEACTIVATE: '/api/auth/deactivate',
    REACTIVATE: '/api/auth/reactivate',
    LINK_PROVIDER: '/api/auth/link-provider',
  },
  ACCOUNTS: {
    CREATE: '/api/accounts',
  },
  PUBLIC: {
    HIGHLIGHTS: '/api/public/highlights',
  },
  PRODUCTS: {
    LIST: '/api/products',
    CATEGORIES: '/api/products/categories',
  },
  PLANS: {
    GET: (id: string) => `/api/plans/${id}`,
  },
  ALARMS: {
    LIST: '/api/alarms',
    CREATE: '/api/alarms',
    GET: (id: string) => `/api/alarms/${id}`,
    UPDATE: (id: string) => `/api/alarms/${id}`,
    DELETE: (id: string) => `/api/alarms/${id}`,
  },
  NOTIFICATIONS: {
    LIST: '/api/notifications',
    MARK_READ: (id: string) => `/api/notifications/${id}/read`,
  },
  BOTS: {
    LINK_CODE: '/api/bots/link-code',
    STATUS: '/api/bots/status',
    CONFIRM_LINK: '/api/bots/link',
    UNLINK: '/api/bots/link',
  },
  ACCOUNT: {
    ME: '/api/account',
    UPDATE: '/api/account',
  },
  PROFILE: {
    ME: '/api/users/me',
    UPDATE: '/api/users/me',
  },
  PUSH: {
    VAPID_PUBLIC_KEY: '/api/push/vapid-public-key',
    SUBSCRIBE: '/api/push/subscribe',
  },
  SUBSCRIPTION: {
    LIST: '/api/subscriptions',
    CANCEL: (id: string) => `/api/subscriptions/${id}`,
    BY_ACCOUNT: (accountId: string) => `/api/accounts/${accountId}/subscriptions`,
  },
} as const;
