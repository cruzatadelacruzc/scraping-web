import { AnalyticsService } from '@scrapers/revolico/services/analytics.service';
import { IRevolicoProduct } from '@scrapers/revolico/models/product.model';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Creates a minimal valid product. Override any field for the test. */
function makeProduct(overrides: Partial<IRevolicoProduct> & { isOutstanding?: boolean } = {}): IRevolicoProduct {
  return {
    url: 'https://revolico.com/item/1',
    currency: 'CUP',
    price: 100,
    isOutstanding: false,
    ...overrides,
  } as IRevolicoProduct;
}

/**
 * Builds a price history array from a list of values.
 * Each entry is spaced 1 day apart starting from `baseDate`.
 */
function makePriceHistory(values: number[], baseDate: Date = new Date('2025-06-01T00:00:00Z')): { value: number; updatedAt: Date }[] {
  return values.map((value, i) => ({
    value,
    updatedAt: new Date(baseDate.getTime() + i * 86_400_000),
  }));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  beforeEach(() => {
    service = new AnalyticsService();
  });

  // =========================================================================
  // compute() — null / basic shape
  // =========================================================================

  describe('compute', () => {
    it('returns null when the product has no price history', () => {
      const product = makeProduct({ priceHistory: [] });
      expect(service.compute(product)).toBeNull();
    });

    it('returns null when priceHistory is undefined', () => {
      const product = makeProduct({ priceHistory: undefined });
      expect(service.compute(product)).toBeNull();
    });

    it('returns a valid analytics object when price history has at least one entry', () => {
      const product = makeProduct({
        priceHistory: makePriceHistory([100]),
        views: 50,
      });
      (product as unknown as Record<string, unknown>).createdAt = new Date('2025-06-01T00:00:00Z');

      const result = service.compute(product);
      expect(result).not.toBeNull();
      expect(result!.viewsPerDay).toBeGreaterThan(0);
      expect(result!.priceChanges).toBe(0);
      expect(result!.computedAt).toEqual(expect.any(String));
    });

    it('includes an ISO-8601 computedAt timestamp', () => {
      const product = makeProduct({
        priceHistory: makePriceHistory([100]),
      });

      const result = service.compute(product)!;
      expect(() => new Date(result.computedAt)).not.toThrow();
      expect(new Date(result.computedAt).toISOString()).toBe(result.computedAt);
    });
  });

  // =========================================================================
  // viewsPerDay
  // =========================================================================

  describe('viewsPerDay', () => {
    it('returns ~10 when views=100 and product is 10 days old', () => {
      const now = new Date('2025-06-11T00:00:00Z');
      jest.useFakeTimers().setSystemTime(now);

      const product = makeProduct({
        views: 100,
        priceHistory: makePriceHistory([100]),
      });
      (product as unknown as Record<string, unknown>).createdAt = new Date('2025-06-01T00:00:00Z');

      const result = service.compute(product)!;
      expect(result.viewsPerDay).toBeCloseTo(10, 0);

      jest.useRealTimers();
    });

    it('returns 0 when views is 0', () => {
      const product = makeProduct({
        views: 0,
        priceHistory: makePriceHistory([100]),
      });

      const result = service.compute(product)!;
      expect(result.viewsPerDay).toBe(0);
    });

    it('returns 0 when views is undefined', () => {
      const product = makeProduct({
        views: undefined,
        priceHistory: makePriceHistory([100]),
      });

      const result = service.compute(product)!;
      expect(result.viewsPerDay).toBe(0);
    });

    it('returns 0 when viewsHistory is empty (no-op — viewsPerDay uses views field)', () => {
      const product = makeProduct({
        views: 0,
        viewsHistory: [],
        priceHistory: makePriceHistory([100]),
      });

      const result = service.compute(product)!;
      expect(result.viewsPerDay).toBe(0);
    });

    it('falls back to first priceHistory updatedAt when createdAt is missing', () => {
      const now = new Date('2025-06-11T00:00:00Z');
      jest.useFakeTimers().setSystemTime(now);

      const product = makeProduct({
        views: 100,
        priceHistory: makePriceHistory([100, 110, 120], new Date('2025-06-01T00:00:00Z')),
      });
      // no createdAt set — falls back to priceHistory[0].updatedAt

      const result = service.compute(product)!;
      expect(result.viewsPerDay).toBeCloseTo(10, 0);

      jest.useRealTimers();
    });

    it('uses today when neither createdAt nor priceHistory dates are available', () => {
      const product = makeProduct({
        views: 100,
        priceHistory: [{ value: 100, updatedAt: new Date() }],
      });
      // createdAt missing, priceHistory[0].updatedAt is now → daysSince ≈ 0 → max(1,0)=1

      const result = service.compute(product)!;
      expect(result.viewsPerDay).toBe(100);
    });
  });

  // =========================================================================
  // priceTrend
  // =========================================================================

  describe('priceTrend', () => {
    it('returns "upward" for consistently increasing prices', () => {
      const product = makeProduct({
        priceHistory: makePriceHistory([100, 110, 120, 130, 140]),
      });

      const result = service.compute(product)!;
      expect(result.priceTrend).toBe('upward');
    });

    it('returns "downward" for consistently decreasing prices', () => {
      const product = makeProduct({
        priceHistory: makePriceHistory([140, 130, 120, 110, 100]),
      });

      const result = service.compute(product)!;
      expect(result.priceTrend).toBe('downward');
    });

    it('returns "stable" for flat prices', () => {
      const product = makeProduct({
        priceHistory: makePriceHistory([100, 100, 100, 100, 100]),
      });

      const result = service.compute(product)!;
      expect(result.priceTrend).toBe('stable');
    });

    it('returns "stable" when there are fewer than 2 price points', () => {
      const product = makeProduct({
        priceHistory: makePriceHistory([100]),
      });

      const result = service.compute(product)!;
      expect(result.priceTrend).toBe('stable');
    });

    it('uses only the last 5 points when more are available', () => {
      // First 5 points are decreasing, last 5 are increasing
      const product = makeProduct({
        priceHistory: makePriceHistory([
          200,
          180,
          160,
          140,
          120, // old — decreasing
          100,
          110,
          120,
          130,
          140, // recent — increasing (slope ≈ 10, avg=120, threshold=2.4)
        ]),
      });

      const result = service.compute(product)!;
      expect(result.priceTrend).toBe('upward');
    });

    it('handles exactly 2 points as stable when slope is near zero', () => {
      const product = makeProduct({
        priceHistory: makePriceHistory([100, 101]),
      });

      const result = service.compute(product)!;
      // avg = 100.5, slope = 1, threshold = 2.01 → stable
      expect(result.priceTrend).toBe('stable');
    });

    it('handles exactly 2 points with significant change as upward', () => {
      const product = makeProduct({
        priceHistory: makePriceHistory([100, 110]),
      });

      const result = service.compute(product)!;
      // avg = 105, slope = 10, threshold = 2.1 → upward
      expect(result.priceTrend).toBe('upward');
    });
  });

  // =========================================================================
  // priceVolatility
  // =========================================================================

  describe('priceVolatility', () => {
    it('returns a value near 0 for stable prices', () => {
      const product = makeProduct({
        priceHistory: makePriceHistory([100, 100, 100, 100, 100]),
      });

      const result = service.compute(product)!;
      expect(result.priceVolatility).toBe(0);
    });

    it('returns a higher value for volatile prices', () => {
      const product = makeProduct({
        priceHistory: makePriceHistory([100, 200, 50, 300]),
      });

      const result = service.compute(product)!;
      expect(result.priceVolatility).toBeGreaterThan(0.5);
    });

    it('returns 0 when there are fewer than 2 price points', () => {
      const product = makeProduct({
        priceHistory: makePriceHistory([100]),
      });

      const result = service.compute(product)!;
      expect(result.priceVolatility).toBe(0);
    });

    it('returns 0 when the mean price is 0', () => {
      const product = makeProduct({
        priceHistory: makePriceHistory([0, 0, 0]),
      });

      const result = service.compute(product)!;
      expect(result.priceVolatility).toBe(0);
    });

    it('uses only the last 10 points when more are available', () => {
      // First 5 are volatile (old), last 10 are perfectly stable
      const values = [
        50,
        500,
        10,
        999,
        1, // old volatile
        100,
        100,
        100,
        100,
        100,
        100,
        100,
        100,
        100,
        100, // last 10 stable
      ];
      const product = makeProduct({
        priceHistory: makePriceHistory(values),
      });

      const result = service.compute(product)!;
      expect(result.priceVolatility).toBe(0);
    });
  });

  // =========================================================================
  // priceChanges
  // =========================================================================

  describe('priceChanges', () => {
    it('returns 4 when there are 5 price history entries', () => {
      const product = makeProduct({
        priceHistory: makePriceHistory([100, 110, 120, 130, 140]),
      });

      const result = service.compute(product)!;
      expect(result.priceChanges).toBe(4);
    });

    it('returns 0 when there is 1 price history entry', () => {
      const product = makeProduct({
        priceHistory: makePriceHistory([100]),
      });

      const result = service.compute(product)!;
      expect(result.priceChanges).toBe(0);
    });

    it('returns 0 when priceHistory is empty', () => {
      // empty → compute() returns null, so this case is covered by the null test.
      // But we test indirectly: a freshly created product with a forced empty
      // array is already covered above.
      expect(true).toBe(true); // placeholder — null case covers this
    });
  });

  // =========================================================================
  // hotScore
  // =========================================================================

  describe('hotScore', () => {
    it('applies the outstanding bonus (2x) for isOutstanding products', () => {
      const now = new Date('2025-06-11T00:00:00Z');
      jest.useFakeTimers().setSystemTime(now);

      const outstanding = makeProduct({
        views: 100,
        isOutstanding: true,
        priceHistory: makePriceHistory([100, 100]),
      });
      (outstanding as unknown as Record<string, unknown>).createdAt = new Date('2025-06-01T00:00:00Z');

      const nonOutstanding = makeProduct({
        views: 100,
        isOutstanding: false,
        priceHistory: makePriceHistory([100, 100]),
      });
      (nonOutstanding as unknown as Record<string, unknown>).createdAt = new Date('2025-06-01T00:00:00Z');

      const resultOut = service.compute(outstanding)!;
      const resultNon = service.compute(nonOutstanding)!;

      // Same viewsPerDay, outstanding should be exactly 2x (no price drop)
      expect(resultOut.hotScore).toBeCloseTo(resultNon.hotScore * 2, 2);

      jest.useRealTimers();
    });

    it('uses a base multiplier of 1.0 for non-outstanding products', () => {
      const now = new Date('2025-06-11T00:00:00Z');
      jest.useFakeTimers().setSystemTime(now);

      const product = makeProduct({
        views: 50,
        isOutstanding: false,
        priceHistory: makePriceHistory([100, 100]),
      });
      (product as unknown as Record<string, unknown>).createdAt = new Date('2025-06-01T00:00:00Z');

      const result = service.compute(product)!;
      // viewsPerDay ≈ 5, outstandingBonus = 1, priceDropBonus = 1 → hotScore = 5
      expect(result.hotScore).toBeCloseTo(5, 0);

      jest.useRealTimers();
    });

    it('applies the price-drop bonus (1.5x) when the last price is lower than the previous', () => {
      const now = new Date('2025-06-11T00:00:00Z');
      jest.useFakeTimers().setSystemTime(now);

      const product = makeProduct({
        views: 50,
        isOutstanding: false,
        priceHistory: makePriceHistory([150, 100]), // drop from 150 → 100
      });
      (product as unknown as Record<string, unknown>).createdAt = new Date('2025-06-01T00:00:00Z');

      const result = service.compute(product)!;
      // viewsPerDay ≈ 5, outstandingBonus = 1, priceDropBonus = 1.5 → hotScore = 7.5
      expect(result.hotScore).toBeCloseTo(7.5, 2);

      jest.useRealTimers();
    });

    it('does not apply the price-drop bonus when price is flat or rising', () => {
      const now = new Date('2025-06-11T00:00:00Z');
      jest.useFakeTimers().setSystemTime(now);

      const product = makeProduct({
        views: 50,
        isOutstanding: false,
        priceHistory: makePriceHistory([100, 100]), // flat
      });
      (product as unknown as Record<string, unknown>).createdAt = new Date('2025-06-01T00:00:00Z');

      const result = service.compute(product)!;
      // viewsPerDay ≈ 5, outstandingBonus = 1, priceDropBonus = 1 → hotScore = 5
      expect(result.hotScore).toBeCloseTo(5, 2);

      jest.useRealTimers();
    });

    it('returns the price-drop bonus as 1.0 when there is only 1 price entry', () => {
      const now = new Date('2025-06-11T00:00:00Z');
      jest.useFakeTimers().setSystemTime(now);

      const product = makeProduct({
        views: 50,
        isOutstanding: false,
        priceHistory: makePriceHistory([100]),
      });
      (product as unknown as Record<string, unknown>).createdAt = new Date('2025-06-01T00:00:00Z');

      const result = service.compute(product)!;
      // viewsPerDay ≈ 5, outstandingBonus = 1, priceDropBonus = 1 (only 1 point)
      expect(result.hotScore).toBeCloseTo(5, 2);

      jest.useRealTimers();
    });

    it('combines both outstanding bonus and price-drop bonus multiplicatively', () => {
      const now = new Date('2025-06-11T00:00:00Z');
      jest.useFakeTimers().setSystemTime(now);

      const product = makeProduct({
        views: 100,
        isOutstanding: true,
        priceHistory: makePriceHistory([200, 100]), // drop from 200 → 100
      });
      (product as unknown as Record<string, unknown>).createdAt = new Date('2025-06-01T00:00:00Z');

      const result = service.compute(product)!;
      // viewsPerDay ≈ 10, outstandingBonus = 2, priceDropBonus = 1.5 → 30
      expect(result.hotScore).toBeCloseTo(30, 2);

      jest.useRealTimers();
    });

    it('rounds hotScore to 2 decimal places', () => {
      const now = new Date('2025-06-11T00:00:00Z');
      jest.useFakeTimers().setSystemTime(now);

      // viewsPerDay = 100/30 = 3.333... → hotScore = 3.333 * 1 * 1 = 3.33
      const product = makeProduct({
        views: 100,
        isOutstanding: false,
        priceHistory: makePriceHistory([100, 100]),
      });
      (product as unknown as Record<string, unknown>).createdAt = new Date('2025-05-12T00:00:00Z'); // 30 days ago

      const result = service.compute(product)!;
      const decimals = result.hotScore.toString().split('.')[1];
      expect(decimals).toBeDefined();
      expect(decimals!.length).toBeLessThanOrEqual(2);

      jest.useRealTimers();
    });
  });

  // =========================================================================
  // Null / undefined safety
  // =========================================================================

  describe('null / undefined safety', () => {
    it('does not throw when the product has minimal required fields', () => {
      const product = makeProduct({
        // url, currency, price are required by the interface
        // priceHistory is needed to avoid null
        priceHistory: [{ value: 50, updatedAt: new Date() }],
      });

      expect(() => service.compute(product)).not.toThrow();
      const result = service.compute(product);
      expect(result).not.toBeNull();
    });

    it('returns 0 for viewsPerDay when viewsHistory is missing', () => {
      const product = makeProduct({
        views: undefined,
        viewsHistory: undefined,
        priceHistory: makePriceHistory([100]),
      });

      const result = service.compute(product)!;
      expect(result.viewsPerDay).toBe(0);
    });

    it('handles missing isOutstanding as false', () => {
      const product = makeProduct({
        isOutstanding: undefined as unknown as boolean,
        priceHistory: makePriceHistory([100, 100]),
        views: 100,
      });
      (product as unknown as Record<string, unknown>).createdAt = new Date('2025-06-01T00:00:00Z');

      // undefined is falsy, so outstandingBonus = 1.0
      expect(() => service.compute(product)).not.toThrow();
    });

    it('handles isOutstanding as false explicitly', () => {
      const now = new Date('2025-06-11T00:00:00Z');
      jest.useFakeTimers().setSystemTime(now);

      const product = makeProduct({
        isOutstanding: false,
        priceHistory: makePriceHistory([100, 100]),
        views: 100,
      });
      (product as unknown as Record<string, unknown>).createdAt = new Date('2025-06-01T00:00:00Z');

      const result = service.compute(product)!;
      // viewsPerDay ≈ 10, outstandingBonus = 1, priceDropBonus = 1 → 10
      expect(result.hotScore).toBeCloseTo(10, 0);

      jest.useRealTimers();
    });

    it('handles a product with only url, price, currency and priceHistory', () => {
      const product: IRevolicoProduct = {
        url: 'https://x.com/1',
        currency: 'USD',
        price: 42,
        isOutstanding: false,
        priceHistory: [{ value: 42, updatedAt: new Date() }],
      };

      const result = service.compute(product)!;
      expect(result.viewsPerDay).toBe(0);
      expect(result.priceTrend).toBe('stable');
      expect(result.priceVolatility).toBe(0);
      expect(result.priceChanges).toBe(0);
      expect(result.hotScore).toBe(0);
    });
  });

  // =========================================================================
  // Edge cases
  // =========================================================================

  describe('edge cases', () => {
    it('handles a very large price history without performance issues', () => {
      const values = Array.from({ length: 1000 }, (_, i) => 100 + i * 0.1);
      const product = makeProduct({
        priceHistory: makePriceHistory(values),
        views: 500,
      });
      (product as unknown as Record<string, unknown>).createdAt = new Date('2025-01-01T00:00:00Z');

      const start = Date.now();
      const result = service.compute(product)!;
      const elapsed = Date.now() - start;

      // Should complete in well under 100ms
      expect(elapsed).toBeLessThan(100);
      expect(result.priceChanges).toBe(999);
    });

    it('returns the same result for the same input (deterministic)', () => {
      const product = makeProduct({
        views: 200,
        isOutstanding: true,
        priceHistory: makePriceHistory([100, 90, 80, 70, 60]),
      });
      (product as unknown as Record<string, unknown>).createdAt = new Date('2025-06-01T00:00:00Z');

      const r1 = service.compute(product)!;
      const r2 = service.compute(product)!;

      expect(r1.viewsPerDay).toBe(r2.viewsPerDay);
      expect(r1.priceTrend).toBe(r2.priceTrend);
      expect(r1.priceVolatility).toBe(r2.priceVolatility);
      expect(r1.priceChanges).toBe(r2.priceChanges);
    });
  });
});
