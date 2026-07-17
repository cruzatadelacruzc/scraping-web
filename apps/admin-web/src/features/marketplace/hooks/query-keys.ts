/**
 * Structured query keys for the marketplace module.
 * Enables granular cache invalidation.
 */
export const marketplaceKeys = {
  all: ['marketplace'] as const,
  stores: {
    all: ['marketplace', 'stores'] as const,
  },
  schedules: {
    all: ['marketplace', 'schedules'] as const,
    list: (filters?: Record<string, unknown>) =>
      ['marketplace', 'schedules', 'list', filters ?? {}] as const,
    detail: (id: string) => ['marketplace', 'schedules', 'detail', id] as const,
  },
  revolico: {
    configs: {
      all: ['marketplace', 'revolico', 'configs'] as const,
      list: (filters?: Record<string, unknown>) =>
        ['marketplace', 'revolico', 'configs', 'list', filters ?? {}] as const,
      detail: (storeKey: string) =>
        ['marketplace', 'revolico', 'configs', 'detail', storeKey] as const,
    },
  },
};
