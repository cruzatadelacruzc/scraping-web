export interface CategoryBreakdown {
  category: string;
  count: number;
}

export interface StateBreakdown {
  state: string;
  count: number;
}

export interface ProductStatsViewModel {
  totalProducts: number;
  byCategory: CategoryBreakdown[];
  byState: StateBreakdown[];
  outstandingCount: number;
  promotedCount: number;
  lastScrapedAt: Date | null;
  priceRange: { min: number; max: number };
  enrichedCount: number;
  unenrichedCount: number;
  /** Computed: percentage of enriched products (0-100), NaN-safe */
  enrichmentPercent: number;
  /** Computed: formatted lastScrapedAt for display */
  lastScrapedLabel: string;
  /** Computed: formatted price range string */
  priceRangeLabel: string;
}
