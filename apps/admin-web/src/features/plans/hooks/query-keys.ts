export const planKeys = {
  all: ['plans'] as const,
  list: (filters: Record<string, unknown>) => ['plans', 'list', filters] as const,
  detail: (id: string) => ['plans', 'detail', id] as const,
  subscribers: (id: string) => ['plans', 'subscribers', id] as const,
};
