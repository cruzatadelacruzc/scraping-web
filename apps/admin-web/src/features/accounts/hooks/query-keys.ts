export const accountKeys = {
  all: ['accounts'] as const,
  list: (filters: Record<string, unknown>) => ['accounts', 'list', filters] as const,
  detail: (id: string) => ['accounts', 'detail', id] as const,
};
