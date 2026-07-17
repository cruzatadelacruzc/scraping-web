import { ENV } from '@shared/config/env';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';

/**
 * Result shape that every paginated query must return.
 */
export interface PaginatedResult<TItem> {
  items: TItem[];
  total: number;
}

/**
 * Parameters for the paginated query hook.
 */
export interface UsePaginatedQueryParams<
  TFilters extends Record<string, unknown>,
  TItem = unknown,
> {
  /** Current page (1-based). */
  page: number;
  /** Items per page. */
  limit: number;
  /** Filter values — only keys with defined values should be included. */
  filters: TFilters;
  /** First segment of the query key, e.g. `'products'`. The hook appends `'list'` and the filters. */
  queryKeyBase: string;
  /**
   * The actual data-fetching function.
   * Receives skip, limit, stable filters, and the TanStack Query AbortSignal.
   */
  queryFn: (params: {
    skip: number;
    limit: number;
    filters: TFilters;
    signal: AbortSignal;
  }) => Promise<PaginatedResult<TItem>>;
  /** Stale time override. Defaults to `ENV.STALE_TIME_STANDARD` (5 min). */
  staleTime?: number;
  /** Whether to keep the previous page's data visible while the next page loads. */
  placeholderData?: boolean;
}

/**
 * Generic paginated query hook.
 *
 * Encapsulates skip calculation, stable query-key construction, and the
 * TanStack Query wiring so every paginated feature doesn't reinvent it.
 *
 * The query key includes page and limit alongside the caller's filters so
 * that changing pages produces a new cache entry and triggers a refetch.
 * Mutation invalidation against `['prefix', 'list', {}]` still works because
 * the partial-match behavior in TanStack Query matches against the prefix +
 * `'list'` segments regardless of the extra keys inside the object.
 *
 * @example
 * const { data, isLoading, isFetching } = usePaginatedQuery({
 *   page: 1,
 *   limit: 20,
 *   filters: { search: 'foo' },
 *   queryKeyBase: 'products',
 *   queryFn: ({ skip, limit, filters, signal }) => productsService.list({ skip, limit, ...filters, signal }),
 * });
 */
export function usePaginatedQuery<TFilters extends Record<string, unknown>, TItem = unknown>(
  params: UsePaginatedQueryParams<TFilters, TItem>,
): UseQueryResult<PaginatedResult<TItem>> {
  const skip = (params.page - 1) * params.limit;
  const staleTime = params.staleTime ?? ENV.STALE_TIME_STANDARD;

  return useQuery<PaginatedResult<TItem>>({
    queryKey: [
      params.queryKeyBase,
      'list',
      { ...params.filters, page: params.page, limit: params.limit },
    ] as const,
    queryFn: async ({ signal }) => {
      return params.queryFn({
        skip,
        limit: params.limit,
        filters: params.filters,
        signal,
      });
    },
    staleTime,
    placeholderData: params.placeholderData ? (prev) => prev : undefined,
  });
}
