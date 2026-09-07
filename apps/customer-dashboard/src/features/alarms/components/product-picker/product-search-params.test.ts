import { describe, it, expect } from 'vitest';
import {
  buildProductSearchParams,
  nextFilters,
  EMPTY_PRODUCT_PICKER_FILTERS,
  PRODUCT_PAGE_LIMIT,
  type ProductPickerFilters,
} from './product-search-params';

const base: ProductPickerFilters = { ...EMPTY_PRODUCT_PICKER_FILTERS };

describe('buildProductSearchParams', () => {
  it('omits every empty filter, keeping only skip + the constant limit', () => {
    expect(buildProductSearchParams(base)).toEqual({ skip: 0, limit: PRODUCT_PAGE_LIMIT });
  });

  it('trims the search term and drops it when blank', () => {
    expect(buildProductSearchParams({ ...base, search: '  iphone  ' }).search).toBe('iphone');
    expect(buildProductSearchParams({ ...base, search: '   ' }).search).toBeUndefined();
  });

  it('passes category and subcategory through untouched', () => {
    const params = buildProductSearchParams({
      ...base,
      category: 'autos',
      subcategory: 'motos',
    });
    expect(params.category).toBe('autos');
    expect(params.subcategory).toBe('motos');
  });

  it('coerces price text fields to numbers', () => {
    const params = buildProductSearchParams({ ...base, minPrice: '25', maxPrice: '500' });
    expect(params.minPrice).toBe(25);
    expect(params.maxPrice).toBe(500);
  });

  it('keeps a zero minimum price but drops negative and non-numeric values', () => {
    expect(buildProductSearchParams({ ...base, minPrice: '0' }).minPrice).toBe(0);
    expect(buildProductSearchParams({ ...base, minPrice: '-5' }).minPrice).toBeUndefined();
    expect(buildProductSearchParams({ ...base, maxPrice: 'abc' }).maxPrice).toBeUndefined();
  });

  it('carries the skip cursor and clamps it to a non-negative integer', () => {
    expect(buildProductSearchParams({ ...base, skip: 24 }).skip).toBe(24);
    expect(buildProductSearchParams({ ...base, skip: -3 }).skip).toBe(0);
    expect(buildProductSearchParams({ ...base, skip: 12.7 }).skip).toBe(12);
  });
});

describe('nextFilters', () => {
  it('advances the page without touching filters when only skip changes', () => {
    const state: ProductPickerFilters = { ...base, search: 'tv', category: 'autos', skip: 0 };
    expect(nextFilters(state, { skip: 12 })).toEqual({ ...state, skip: 12 });
  });

  it('resets skip to 0 on any filter change', () => {
    const state: ProductPickerFilters = { ...base, skip: 24 };
    expect(nextFilters(state, { search: 'moto' }).skip).toBe(0);
    expect(nextFilters(state, { minPrice: '100' }).skip).toBe(0);
  });

  it('clears the subcategory when the category changes', () => {
    const state: ProductPickerFilters = {
      ...base,
      category: 'autos',
      subcategory: 'motos',
      skip: 12,
    };
    const out = nextFilters(state, { category: 'inmuebles' });
    expect(out.category).toBe('inmuebles');
    expect(out.subcategory).toBe('');
    expect(out.skip).toBe(0);
  });

  it('keeps an explicitly patched subcategory even when the category changes', () => {
    const state: ProductPickerFilters = { ...base, category: 'autos', subcategory: 'motos' };
    const out = nextFilters(state, { category: 'inmuebles', subcategory: 'casas' });
    expect(out.subcategory).toBe('casas');
  });

  it('does not wipe the subcategory when the category is unchanged', () => {
    const state: ProductPickerFilters = { ...base, category: 'autos', subcategory: 'motos' };
    const out = nextFilters(state, { category: 'autos' });
    expect(out.subcategory).toBe('motos');
  });
});
