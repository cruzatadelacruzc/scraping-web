import type { ProductSearchParams } from '../types';

export const alarmKeys = {
  all: ['alarms'] as const,
  list: () => ['alarms', 'list'] as const,
  detail: (id: string) => ['alarms', 'detail', id] as const,
};

export const productKeys = {
  search: (params: ProductSearchParams) => ['products', 'search', params] as const,
  categories: ['products', 'categories'] as const,
};

export const planKeys = {
  limits: (accountId: string) => ['plan', 'limits', accountId] as const,
};

export const notificationKeys = {
  list: ['notifications', 'list'] as const,
};
