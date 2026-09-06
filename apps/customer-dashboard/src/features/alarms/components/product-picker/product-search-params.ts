import type { ProductSearchParams } from '../../types';

/** Page size for the catalog picker grid. Constant — pagination moves the `skip` cursor. */
export const PRODUCT_PAGE_LIMIT = 12;

/** Raw filter state held by the ProductPicker component (all text-field friendly). */
export interface ProductPickerFilters {
  search: string;
  category: string;
  subcategory: string;
  minPrice: string;
  maxPrice: string;
  skip: number;
}

export const EMPTY_PRODUCT_PICKER_FILTERS: ProductPickerFilters = {
  search: '',
  category: '',
  subcategory: '',
  minPrice: '',
  maxPrice: '',
  skip: 0,
};

/** Parses a price text field: blank / non-numeric / negative → omitted. */
function parsePrice(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (trimmed === '') return undefined;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return n;
}

/**
 * Merges a filter patch into the picker state. Any change other than pagination
 * resets `skip` to the first page; changing the category also clears a stale
 * subcategory (unless the patch sets one explicitly).
 */
export function nextFilters(
  state: ProductPickerFilters,
  patch: Partial<ProductPickerFilters>
): ProductPickerFilters {
  const merged: ProductPickerFilters = { ...state, ...patch };
  const keys = Object.keys(patch);
  const onlySkipChanged = keys.length > 0 && keys.every((key) => key === 'skip');
  if (onlySkipChanged) return merged;

  if (
    patch.category !== undefined &&
    patch.category !== state.category &&
    patch.subcategory === undefined
  ) {
    merged.subcategory = '';
  }
  merged.skip = 0;
  return merged;
}

/**
 * Builds the API query from picker state: empty strings are dropped, price
 * fields are coerced to numbers, `limit` is the fixed page size and `skip` is
 * clamped to a non-negative integer.
 */
export function buildProductSearchParams(state: ProductPickerFilters): ProductSearchParams {
  const params: ProductSearchParams = {
    skip: Math.max(0, Math.trunc(Number.isFinite(state.skip) ? state.skip : 0)),
    limit: PRODUCT_PAGE_LIMIT,
  };

  const search = state.search.trim();
  if (search) params.search = search;
  if (state.category) params.category = state.category;
  if (state.subcategory) params.subcategory = state.subcategory;

  const minPrice = parsePrice(state.minPrice);
  if (minPrice !== undefined) params.minPrice = minPrice;

  const maxPrice = parsePrice(state.maxPrice);
  if (maxPrice !== undefined) params.maxPrice = maxPrice;

  return params;
}
