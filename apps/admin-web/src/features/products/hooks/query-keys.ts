export const productKeys = {
  all: ['products'] as const,
  list: (filters: Record<string, unknown>) => ['products', 'list', filters] as const,
  detail: (id: string) => ['products', 'detail', id] as const,
  priceHistory: (id: string) => ['products', id, 'history', 'price'] as const,
  viewsHistory: (id: string) => ['products', id, 'history', 'views'] as const,
  locationHistory: (id: string) => ['products', id, 'history', 'location'] as const,
  outstandingHistory: (id: string) => ['products', id, 'history', 'outstanding'] as const,
  promotedHistory: (id: string) => ['products', id, 'history', 'promoted'] as const,
  stats: () => ['products', 'stats'] as const,
};
