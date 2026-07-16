/**
 * Structured query keys for the marketplace module.
 * Enables granular cache invalidation.
 */
export const marketplaceKeys = {
  all: ['marketplace'] as const,
  stores: {
    all: ['marketplace', 'stores'] as const,
  },
};
