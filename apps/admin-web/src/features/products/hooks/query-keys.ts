export const productKeys = {
  all: ['products'] as const,
  list: (filters: Record<string, unknown>) => ['products', 'list', filters] as const,
};
