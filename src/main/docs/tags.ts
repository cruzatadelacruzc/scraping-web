export const TAG = {
  AUTH: 'Auth',
  ACCOUNTS: 'Accounts',
  USERS: 'Users',
  PLANS: 'Plans',
  SUBSCRIPTIONS: 'Subscriptions',
  ALARMS: 'Alarms',
  NOTIFICATIONS: 'Notifications',
  SCRAPING: 'Scraping',
  ADMIN: 'Admin',
} as const;

export const API_TAGS = [
  { name: TAG.AUTH, description: 'Authentication endpoints' },
  { name: TAG.ACCOUNTS, description: 'Account management and registration' },
  { name: TAG.USERS, description: 'User management within an account' },
  { name: TAG.PLANS, description: 'Subscription plan management' },
  { name: TAG.SUBSCRIPTIONS, description: 'Account subscription management' },
  { name: TAG.ALARMS, description: 'Price-change alarm management' },
  { name: TAG.NOTIFICATIONS, description: 'Alarm notification management' },
  { name: TAG.SCRAPING, description: 'Product scraping job management' },
  { name: TAG.ADMIN, description: 'Super-admin endpoints' },
];
