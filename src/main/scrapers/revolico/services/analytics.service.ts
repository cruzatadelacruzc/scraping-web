import { injectable } from 'inversify';
import { IRevolicoProduct } from '@scrapers/revolico/models/product.model';

/**
 * Computed analytics metrics derived from a product's history arrays
 * and current state. Returned by {@link AnalyticsService.compute}.
 */
export interface IProductAnalytics {
  /** Average views per day since first scrape. */
  viewsPerDay: number;
  /** Direction of price movement based on linear regression of the last 5 points. */
  priceTrend: 'upward' | 'downward' | 'stable';
  /** Coefficient of variation (stddev / mean) on the last 10 price points. */
  priceVolatility: number;
  /** Number of recorded price changes (history length - 1, min 0). */
  priceChanges: number;
  /** Composite popularity score: viewsPerDay * outstandingBonus * priceDropBonus. */
  hotScore: number;
  /** ISO-8601 timestamp of when the analytics were computed. */
  computedAt: string;
}

/**
 * Pure computation service that derives analytics from a product's history
 * arrays. The service has no side effects — it does not access the database
 * or any external system. The caller (e.g. ProductService) is responsible
 * for persisting the returned metrics to MongoDB.
 */
@injectable()
export class AnalyticsService {
  /**
   * Computes derived analytics from the product's history arrays and current
   * state. All metrics are derived from in-memory data only.
   *
   * @param product - The product document with history arrays populated during scraping.
   * @returns Computed analytics, or `null` when the product has no price history at all.
   */
  public compute(product: IRevolicoProduct): IProductAnalytics | null {
    const priceHistory = product.priceHistory ?? [];

    if (priceHistory.length === 0) {
      return null;
    }

    const viewsPerDay = this._computeViewsPerDay(product);
    const priceTrend = this._computePriceTrend(priceHistory);
    const priceVolatility = this._computePriceVolatility(priceHistory);
    const priceChanges = Math.max(0, priceHistory.length - 1);
    const hotScore = this._computeHotScore(product, viewsPerDay);

    return {
      viewsPerDay,
      priceTrend,
      priceVolatility,
      priceChanges,
      hotScore,
      computedAt: new Date().toISOString(),
    };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Computes average views per day since the first scrape date.
   * Falls back through createdAt, then first priceHistory entry,
   * then uses the current date if neither is available.
   */
  private _computeViewsPerDay(product: IRevolicoProduct): number {
    const views = product.views ?? 0;
    if (views === 0) {
      return 0;
    }

    // Mongoose adds `createdAt` via `timestamps: true` on the schema.
    // The interface does not declare it, so we read it with a safe cast.
    const mongooseDoc = product as unknown as { createdAt?: Date };
    const firstScrapeDate = mongooseDoc.createdAt ?? product.priceHistory?.[0]?.updatedAt ?? new Date();

    const daysSince = this._daysBetween(firstScrapeDate, new Date());
    return parseFloat((views / Math.max(1, daysSince)).toFixed(2));
  }

  /**
   * Simple linear regression on the **last 5** price history points.
   *
   * - slope > 2% of average price  → `'upward'`
   * - slope < -2% of average price → `'downward'`
   * - otherwise                     → `'stable'`
   * - fewer than 2 points           → `'stable'`
   */
  private _computePriceTrend(priceHistory: { value: number; updatedAt: Date }[]): 'upward' | 'downward' | 'stable' {
    const windowSize = 5;
    const points = priceHistory.slice(-windowSize);

    if (points.length < 2) {
      return 'stable';
    }

    const values = points.map(p => p.value);
    const n = values.length;
    const avgPrice = values.reduce((s, v) => s + v, 0) / n;

    // Indices 0 .. n-1
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;

    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += values[i];
      sumXY += i * values[i];
      sumX2 += i * i;
    }

    const denominator = n * sumX2 - sumX * sumX;
    if (denominator === 0) {
      return 'stable';
    }

    const slope = (n * sumXY - sumX * sumY) / denominator;
    const threshold = 0.02 * avgPrice;

    if (slope > threshold) return 'upward';
    if (slope < -threshold) return 'downward';
    return 'stable';
  }

  /**
   * Coefficient of variation (stddev / mean) on the **last 10** price points.
   * Returns 0 when there are fewer than 2 points or the mean is 0.
   */
  private _computePriceVolatility(priceHistory: { value: number; updatedAt: Date }[]): number {
    const windowSize = 10;
    const points = priceHistory.slice(-windowSize);

    if (points.length < 2) {
      return 0;
    }

    const values = points.map(p => p.value);
    const n = values.length;
    const mean = values.reduce((s, v) => s + v, 0) / n;

    if (mean === 0) {
      return 0;
    }

    const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / n;
    const stddev = Math.sqrt(variance);

    return parseFloat((stddev / mean).toFixed(4));
  }

  /**
   * Composite popularity score.
   *
   * ```
   * base            = viewsPerDay
   * outstandingBonus = isOutstanding ? 2.0 : 1.0
   * priceDropBonus   = last price < previous price ? 1.5 : 1.0
   * score            = base * outstandingBonus * priceDropBonus
   * ```
   *
   * Rounded to 2 decimal places. The price-drop bonus requires at least
   * 2 price history entries.
   */
  private _computeHotScore(product: IRevolicoProduct, viewsPerDay: number): number {
    const base = viewsPerDay;
    const outstandingBonus = product.isOutstanding ? 2.0 : 1.0;

    const priceHistory = product.priceHistory ?? [];
    let priceDropBonus = 1.0;
    if (priceHistory.length >= 2) {
      const last = priceHistory[priceHistory.length - 1].value;
      const prev = priceHistory[priceHistory.length - 2].value;
      if (last < prev) {
        priceDropBonus = 1.5;
      }
    }

    const score = base * outstandingBonus * priceDropBonus;
    return parseFloat(score.toFixed(2));
  }

  /**
   * Returns the number of calendar days between two dates (fractional).
   */
  private _daysBetween(start: Date, end: Date): number {
    const msPerDay = 86_400_000;
    return (end.getTime() - start.getTime()) / msPerDay;
  }
}
