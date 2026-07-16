import { describe, expect, it } from 'vitest';
import {
  aggregateByDay,
  aggregateByWeek,
  aggregateNumericEntries,
  filterByTimeRange,
  mapNumericHistoryWithAggregation,
  mapProductDetailDTOToViewModel,
  mapNumericHistoryResponse,
  mapLocationHistoryResponse,
  mapStatusHistoryResponse,
} from '../mappers/product-history-mapper';
import type {
  NumericHistoryEntryDTO,
  HistoryResponseDTO,
  ProductDetailDTO,
} from '../services/product-history-service';
import type { HistoryEntryViewModel } from '../view-models/product-history-view-model';

// ── Helpers ──────────────────────────────────────────────────────────────

function makeHistoryDTO(
  values: { value: number; daysAgo: number }[],
): HistoryResponseDTO<NumericHistoryEntryDTO> {
  const now = Date.now();
  return {
    data: values.map((v) => ({
      value: v.value,
      updatedAt: new Date(now - v.daysAgo * 86_400_000).toISOString(),
    })),
    total: values.length,
  };
}

function makePriceEntry(value: number, daysAgo: number): HistoryEntryViewModel {
  const d = new Date(Date.now() - daysAgo * 86_400_000);
  return {
    value,
    updatedAt: d.toISOString(),
    timestamp: d,
  };
}

// ── Product Detail Mapper ────────────────────────────────────────────────

describe('mapProductDetailDTOToViewModel', () => {
  it('maps a full product DTO to view model', () => {
    const dto: ProductDetailDTO = {
      _id: 'prod-1',
      category: 'Electronics',
      url: 'https://example.com/item',
      description: 'Test Product',
      cost: '100',
      currency: 'USD',
      price: 99.99,
      isOutstanding: true,
      isPromoted: false,
      location: { state: 'Havana', municipality: 'Plaza' },
      views: 150,
      seller: { name: 'TechStore', phone: '+1-555-0100', email: 'store@test.com' },
      createdAt: '2024-01-15T00:00:00.000Z',
      updatedAt: '2024-06-01T00:00:00.000Z',
    };

    const vm = mapProductDetailDTOToViewModel(dto);
    expect(vm.id).toBe('prod-1');
    expect(vm.title).toBe('Test Product');
    expect(vm.price).toBe(99.99);
    expect(vm.currency).toBe('USD');
    expect(vm.isOutstanding).toBe(true);
    expect(vm.isPromoted).toBe(false);
    expect(vm.locationState).toBe('Havana');
    expect(vm.views).toBe(150);
    expect(vm.sellerName).toBe('TechStore');
    expect(vm.sellerPhone).toBe('+1-555-0100');
    expect(vm.sellerEmail).toBe('store@test.com');
  });

  it('uses Untitled fallback when description is missing', () => {
    const dto: ProductDetailDTO = {
      _id: 'prod-2',
      category: 'Other',
      url: 'https://example.com/item2',
      cost: '0',
      currency: 'USD',
      price: 0,
      isOutstanding: false,
      createdAt: '2024-01-15T00:00:00.000Z',
      updatedAt: '2024-06-01T00:00:00.000Z',
    };
    expect(mapProductDetailDTOToViewModel(dto).title).toBe('Untitled');
  });

  it('handles missing optional fields gracefully', () => {
    const dto: ProductDetailDTO = {
      _id: 'prod-3',
      category: 'Other',
      url: 'https://example.com/item3',
      cost: '0',
      currency: 'USD',
      price: 0,
      isOutstanding: false,
      createdAt: '2024-01-15T00:00:00.000Z',
      updatedAt: '2024-06-01T00:00:00.000Z',
    };
    const vm = mapProductDetailDTOToViewModel(dto);
    expect(vm.locationState).toBeUndefined();
    expect(vm.views).toBeUndefined();
    expect(vm.sellerName).toBeUndefined();
    expect(vm.sellerPhone).toBeUndefined();
    expect(vm.sellerEmail).toBeUndefined();
    expect(vm.imageURL).toBeUndefined();
  });
});

// ── Numeric History Mapper ───────────────────────────────────────────────

describe('mapNumericHistoryResponse', () => {
  it('sorts entries chronologically', () => {
    const response = makeHistoryDTO([
      { value: 200, daysAgo: 10 },
      { value: 100, daysAgo: 5 },
      { value: 150, daysAgo: 15 },
    ]);
    const result = mapNumericHistoryResponse(response);
    expect(result.map((r) => r.value)).toEqual([150, 200, 100]);
  });

  it('returns empty array for empty input', () => {
    expect(mapNumericHistoryResponse({ data: [], total: 0 })).toEqual([]);
  });
});

// ── Location History Mapper ──────────────────────────────────────────────

describe('mapLocationHistoryResponse', () => {
  it('maps location entries with correct shape', () => {
    const response = {
      data: [
        {
          location: { state: 'Havana', municipality: 'Plaza' },
          updatedAt: '2024-06-01T00:00:00.000Z',
        },
        { location: { state: 'Matanzas' }, updatedAt: '2024-05-01T00:00:00.000Z' },
      ],
      total: 2,
    };
    const result = mapLocationHistoryResponse(response);
    expect(result).toHaveLength(2);
    expect(result[0].location.state).toBe('Matanzas');
    expect(result[1].location.municipality).toBe('Plaza');
  });
});

// ── Status History Mapper ────────────────────────────────────────────────

describe('mapStatusHistoryResponse', () => {
  it('maps 0/1 values correctly', () => {
    const response = {
      data: [
        { value: 1 as const, updatedAt: '2024-06-01T00:00:00.000Z' },
        { value: 0 as const, updatedAt: '2024-05-01T00:00:00.000Z' },
      ],
      total: 2,
    };
    const result = mapStatusHistoryResponse(response);
    expect(result).toHaveLength(2);
    expect(result[0].value).toBe(0);
    expect(result[1].value).toBe(1);
  });
});

// ── Adaptive Aggregation ─────────────────────────────────────────────────

describe('aggregateByDay', () => {
  it('returns empty for empty input', () => {
    expect(aggregateByDay([])).toEqual([]);
  });

  it('groups entries by UTC day and averages values', () => {
    const dayStr = new Date(Date.now()).toISOString().slice(0, 10);
    const entries = [makePriceEntry(100, 0), makePriceEntry(200, 0), makePriceEntry(300, 1)];
    const result = aggregateByDay(entries);
    const dayEntry = result.find((r) => r.updatedAt === dayStr);
    expect(dayEntry).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(dayEntry!.value).toBe(150); // (100 + 200) / 2
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(dayEntry!.count).toBe(2);
  });

  it('rounds averaged values', () => {
    const entries = [makePriceEntry(100, 0), makePriceEntry(101, 0)];
    const result = aggregateByDay(entries);
    const dayStr = new Date(Date.now()).toISOString().slice(0, 10);
    const dayEntry = result.find((r) => r.updatedAt === dayStr);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(dayEntry!.value).toBe(101); // Math.round(201 / 2)
  });

  it('sorts results by day ascending', () => {
    const entries = [makePriceEntry(100, 5), makePriceEntry(200, 2), makePriceEntry(300, 0)];
    const result = aggregateByDay(entries);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].updatedAt >= result[i - 1].updatedAt).toBe(true);
    }
  });
});

describe('aggregateByWeek', () => {
  it('returns empty for empty input', () => {
    expect(aggregateByWeek([])).toEqual([]);
  });

  it('groups entries by ISO week and averages', () => {
    const jan1 = new Date(Date.UTC(2026, 0, 1)); // Week 1 of 2026
    const jan8 = new Date(Date.UTC(2026, 0, 8)); // Week 2 of 2026
    const entries: HistoryEntryViewModel[] = [
      { value: 10, updatedAt: jan1.toISOString(), timestamp: jan1 },
      { value: 20, updatedAt: jan1.toISOString(), timestamp: jan1 },
      { value: 50, updatedAt: jan8.toISOString(), timestamp: jan8 },
    ];
    const result = aggregateByWeek(entries);
    expect(result).toHaveLength(2);
    // Week 1: (10 + 20) / 2 = 15
    const w1 = result.find((r) => r.updatedAt === '2026-W01');
    expect(w1?.value).toBe(15);
    expect(w1?.count).toBe(2);
    // Week 2: 50 / 1 = 50
    const w2 = result.find((r) => r.updatedAt === '2026-W02');
    expect(w2?.value).toBe(50);
    expect(w2?.count).toBe(1);
  });
});

describe('aggregateNumericEntries', () => {
  it('returns empty for empty input', () => {
    expect(aggregateNumericEntries([])).toEqual([]);
  });

  it('returns raw entries when 1 point', () => {
    const entries = [makePriceEntry(100, 0)];
    expect(aggregateNumericEntries(entries)).toEqual(entries);
  });

  it('returns raw entries when exactly 500', () => {
    const entries = Array.from({ length: 500 }, (_, i) => makePriceEntry(i, i));
    const result = aggregateNumericEntries(entries);
    expect(result).toHaveLength(500);
  });

  it('applies day aggregation when exactly 501', () => {
    // 501 entries with only 10 distinct days → day bucketing should reduce to 10
    const entries = Array.from({ length: 501 }, (_, i) => makePriceEntry(i, i % 10));
    const result = aggregateNumericEntries(entries);
    expect(result.length).toBeGreaterThan(0);
    expect(result.length).toBeLessThan(501);
  });

  it('applies day aggregation when entry count is between 501 and 5000', () => {
    // 1000 entries across 20 distinct days
    const entries = Array.from({ length: 1000 }, (_, i) => makePriceEntry(i, i % 20));
    const result = aggregateNumericEntries(entries);
    expect(result.length).toBeGreaterThan(0);
    expect(result.length).toBeLessThan(1000);
    // Each result should have a timestamp
    result.forEach((r) => {
      expect(r.timestamp).toBeInstanceOf(Date);
    });
  });

  it('applies week aggregation when entry count exceeds 5000', () => {
    // 5001 entries across 52 distinct weeks
    const entries = Array.from({ length: 5001 }, (_, i) => makePriceEntry(i * 2, i % 364));
    const result = aggregateNumericEntries(entries);
    expect(result.length).toBeGreaterThan(0);
    expect(result.length).toBeLessThan(5001);
  });

  it('does not aggregate unsorted input — sorts first via mapNumericHistoryResponse', () => {
    // aggregateNumericEntries receives already-sorted entries from the mapper
    // Verify it handles them correctly
    const entries = [makePriceEntry(300, 10), makePriceEntry(100, 5), makePriceEntry(200, 0)];
    const result = aggregateNumericEntries(entries);
    expect(result).toHaveLength(3);
  });
});

describe('mapNumericHistoryWithAggregation', () => {
  it('integrates mapping and aggregation end-to-end', () => {
    const response = makeHistoryDTO([
      { value: 100, daysAgo: 5 },
      { value: 200, daysAgo: 2 },
    ]);
    const result = mapNumericHistoryWithAggregation(response);
    // 2 points → raw (≤500)
    expect(result).toHaveLength(2);
    // Sorted chronologically
    expect(result[0].value).toBe(100);
    expect(result[1].value).toBe(200);
  });
});

// ── Time Range Filtering ─────────────────────────────────────────────────

describe('filterByTimeRange', () => {
  it('returns all entries when both bounds are null (All)', () => {
    const entries = [
      { value: 1, updatedAt: '2024-01-01T00:00:00.000Z' },
      { value: 2, updatedAt: '2024-06-01T00:00:00.000Z' },
    ];
    expect(filterByTimeRange(entries, null, null)).toHaveLength(2);
  });

  it('filters by start date (inclusive)', () => {
    const entries = [
      { value: 1, updatedAt: '2024-01-01T00:00:00.000Z' },
      { value: 2, updatedAt: '2024-06-01T00:00:00.000Z' },
      { value: 3, updatedAt: '2024-12-01T00:00:00.000Z' },
    ];
    const start = new Date('2024-06-01T00:00:00.000Z');
    const result = filterByTimeRange(entries, start, null);
    expect(result).toHaveLength(2);
    expect(result[0].value).toBe(2);
    expect(result[1].value).toBe(3);
  });

  it('filters by end date (exclusive)', () => {
    const entries = [
      { value: 1, updatedAt: '2024-01-01T00:00:00.000Z' },
      { value: 2, updatedAt: '2024-06-01T00:00:00.000Z' },
    ];
    const end = new Date('2024-06-01T00:00:00.000Z');
    const result = filterByTimeRange(entries, null, end);
    expect(result).toHaveLength(1);
    expect(result[0].value).toBe(1);
  });

  it('filters by both start and end', () => {
    const entries = [
      { value: 1, updatedAt: '2024-01-01T00:00:00.000Z' },
      { value: 2, updatedAt: '2024-06-01T00:00:00.000Z' },
      { value: 3, updatedAt: '2024-12-01T00:00:00.000Z' },
    ];
    const start = new Date('2024-02-01T00:00:00.000Z');
    const end = new Date('2025-01-01T00:00:00.000Z');
    const result = filterByTimeRange(entries, start, end);
    expect(result).toHaveLength(2);
    expect(result[0].value).toBe(2);
    expect(result[1].value).toBe(3);
  });
});
