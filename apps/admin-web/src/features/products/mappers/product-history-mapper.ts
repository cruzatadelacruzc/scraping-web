import type {
  HistoryResponseDTO,
  LocationHistoryEntryDTO,
  NumericHistoryEntryDTO,
  ProductDetailDTO,
  StatusHistoryEntryDTO,
} from '../services/product-history-service';
import type {
  AggregatedHistoryEntry,
  HistoryEntryViewModel,
  LocationHistoryEntryViewModel,
  ProductDetailViewModel,
  StatusHistoryEntryViewModel,
} from '../view-models/product-history-view-model';

// ── Product Detail Mapper ────────────────────────────────────────────────

export function mapProductDetailDTOToViewModel(dto: ProductDetailDTO): ProductDetailViewModel {
  return {
    id: dto._id,
    title: dto.description ?? 'Untitled',
    category: dto.category,
    price: dto.price,
    currency: dto.currency,
    locationState: dto.location?.state,
    views: dto.views,
    isOutstanding: dto.isOutstanding,
    isPromoted: dto.isPromoted ?? false,
    createdAt: new Date(dto.createdAt),
    sellerName: dto.seller?.name,
    sellerPhone: dto.seller?.phone,
    sellerEmail: dto.seller?.email,
    description: dto.description,
    imageURL: dto.imageURL,
    url: dto.url,
  };
}

// ── Numeric History Mapper (price / views) ───────────────────────────────

export function mapNumericHistoryEntry(entry: NumericHistoryEntryDTO): HistoryEntryViewModel {
  return {
    value: entry.value,
    updatedAt: entry.updatedAt,
    timestamp: new Date(entry.updatedAt),
  };
}

export function mapNumericHistoryResponse(
  response: HistoryResponseDTO<NumericHistoryEntryDTO>,
): HistoryEntryViewModel[] {
  return response.data
    .map(mapNumericHistoryEntry)
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

// ── Location History Mapper ──────────────────────────────────────────────

export function mapLocationHistoryEntry(
  entry: LocationHistoryEntryDTO,
): LocationHistoryEntryViewModel {
  return {
    location: entry.location,
    updatedAt: entry.updatedAt,
  };
}

export function mapLocationHistoryResponse(
  response: HistoryResponseDTO<LocationHistoryEntryDTO>,
): LocationHistoryEntryViewModel[] {
  return response.data
    .map(mapLocationHistoryEntry)
    .sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
}

// ── Status History Mapper (outstanding / promoted) ───────────────────────

export function mapStatusHistoryEntry(entry: StatusHistoryEntryDTO): StatusHistoryEntryViewModel {
  return {
    value: entry.value,
    updatedAt: entry.updatedAt,
    timestamp: new Date(entry.updatedAt),
  };
}

export function mapStatusHistoryResponse(
  response: HistoryResponseDTO<StatusHistoryEntryDTO>,
): StatusHistoryEntryViewModel[] {
  return response.data
    .map(mapStatusHistoryEntry)
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

// ── Adaptive Aggregation ─────────────────────────────────────────────────

/**
 * Aggregate numeric entries by UTC day.
 * Used when entry count is between 501 and 5000 (inclusive).
 * Each day bucket averages the values and keeps the count.
 */
export function aggregateByDay(entries: HistoryEntryViewModel[]): AggregatedHistoryEntry[] {
  if (entries.length === 0) return [];

  const buckets = new Map<string, { sum: number; count: number; latestDate: string }>();

  for (const e of entries) {
    const day = e.updatedAt.slice(0, 10); // "2026-07-16"
    const b = buckets.get(day) ?? { sum: 0, count: 0, latestDate: e.updatedAt };
    b.sum += e.value;
    b.count += 1;
    if (e.updatedAt > b.latestDate) b.latestDate = e.updatedAt;
    buckets.set(day, b);
  }

  return Array.from(buckets.entries())
    .map(([day, b]) => ({
      value: Math.round(b.sum / b.count),
      updatedAt: day,
      count: b.count,
    }))
    .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
}

/**
 * Aggregate numeric entries by UTC week (ISO week).
 * Used when entry count is > 5000.
 * Week key = YYYY-Www (e.g. "2026-W29").
 */
export function aggregateByWeek(entries: HistoryEntryViewModel[]): AggregatedHistoryEntry[] {
  if (entries.length === 0) return [];

  const buckets = new Map<string, { sum: number; count: number; latestDate: string }>();

  for (const e of entries) {
    const weekKey = getISOWeekKey(e.timestamp);
    const b = buckets.get(weekKey) ?? { sum: 0, count: 0, latestDate: e.updatedAt };
    b.sum += e.value;
    b.count += 1;
    if (e.updatedAt > b.latestDate) b.latestDate = e.updatedAt;
    buckets.set(weekKey, b);
  }

  return Array.from(buckets.entries())
    .map(([weekKey, b]) => ({
      value: Math.round(b.sum / b.count),
      updatedAt: weekKey,
      count: b.count,
    }))
    .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
}

/**
 * Get ISO week string from a Date object.
 * Returns "YYYY-Www" format (e.g. "2026-W29").
 */
export function getISOWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${String(d.getUTCFullYear())}-W${String(weekNum).padStart(2, '0')}`;
}

/**
 * Filter entries to a client-side time range.
 * Inclusive range — startTime is inclusive, endTime is exclusive (up to but not including end).
 * Returns unfiltered if both bounds are null.
 */
export function filterByTimeRange<T extends { updatedAt: string }>(
  entries: T[],
  start: Date | null,
  end: Date | null,
): T[] {
  if (!start && !end) return entries;
  return entries.filter((e) => {
    const t = new Date(e.updatedAt).getTime();
    if (start && t < start.getTime()) return false;
    if (end && t >= end.getTime()) return false;
    return true;
  });
}

/**
 * Map numeric history entries through adaptive aggregation.
 *
 * Thresholds:
 *   0          → empty []
 *   1–500      → raw (no aggregation)
 *   501–5000   → per-day aggregation (averaged)
 *   5001+      → per-week aggregation (averaged)
 *
 * Boolean histories (outstanding/promoted) pass through unchanged
 * regardless of count — aggregation is not applied.
 */
export function mapNumericHistoryWithAggregation(
  response: HistoryResponseDTO<NumericHistoryEntryDTO>,
): HistoryEntryViewModel[] {
  const mapped = mapNumericHistoryResponse(response);

  return aggregateNumericEntries(mapped);
}

/**
 * Apply adaptive aggregation to already-mapped numeric entries.
 * This is the pure aggregation step, separated from the API response mapping
 * so it can be unit-tested independently and reused after time-range filtering.
 */
export function aggregateNumericEntries(entries: HistoryEntryViewModel[]): HistoryEntryViewModel[] {
  const n = entries.length;

  if (n === 0) return [];
  if (n <= 500) return entries;

  if (n <= 5000) {
    const aggregated = aggregateByDay(entries);
    return aggregated.map((a) => ({
      value: a.value,
      updatedAt: a.updatedAt,
      timestamp: new Date(a.updatedAt),
    }));
  }

  // 5001+
  const aggregated = aggregateByWeek(entries);
  return aggregated.map((a) => ({
    value: a.value,
    updatedAt: a.updatedAt,
    timestamp: new Date(a.updatedAt),
  }));
}
