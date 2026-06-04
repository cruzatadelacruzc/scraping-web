import { Alarm } from '@prisma/client';

/**
 * Full product data available to condition evaluators.
 * When the scraping pipeline processes a product, this snapshot is passed
 * to the alarm engine so conditions can evaluate any field.
 */
export interface IProductSnapshot {
  url: string;
  price: number;
  currency: string;
  views: number;
  isOutstanding: boolean;
  seller: {
    name?: string;
    phone?: string;
    email?: string;
    whatsapp?: string;
  };
  location: {
    state: string;
    municipality?: string;
  };
  priceHistory: { value: number; updatedAt: Date }[];
}

/**
 * Parameters stored in the Alarm's params JSON column.
 * Each condition reads the keys it cares about.
 */
export type AlarmParams = Record<string, unknown>;

/**
 * Strategy interface for alarm conditions.
 *
 * To add a new condition:
 * 1. Implement this interface
 * 2. Register it in ConditionRegistry
 * 3. Add the type to the AlarmConditionType Prisma enum
 */
export interface IAlarmCondition {
  /** Unique type key matching a value in AlarmConditionType */
  readonly type: string;

  /**
   * Evaluate whether the condition is met.
   * @param product  - Current product data snapshot.
   * @param alarm    - The alarm model with threshold, percentage, params, and last-evaluated state.
   * @returns true if the alarm should fire.
   */
  evaluate(product: IProductSnapshot, alarm: Alarm): boolean;

  /**
   * Build human-readable notification content for this match.
   * @param alarm   - The alarm that matched.
   * @param product - The product that triggered the alarm.
   * @returns [title, message] tuple.
   */
  buildNotification(alarm: Alarm, product: IProductSnapshot): [string, string];

  /**
   * Optional: compute updated params to persist on the alarm after evaluation.
   * Called even when the condition does not match, so conditions that track
   * previous state (e.g., seller fingerprint) can update their snapshot.
   *
   * @param currentParams - Current value of the alarm's `params` JSON column (or empty object).
   * @param product       - Current product snapshot.
   * @returns The merged params to store, or null if no change is needed.
   */
  computeParamsUpdate?(currentParams: Record<string, unknown>, product: IProductSnapshot): Record<string, unknown> | null;
}
