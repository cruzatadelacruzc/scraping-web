import { injectable, inject } from 'inversify';
import { IAlarmCondition } from './condition.interface';
import { TYPES } from '@shared/types.container';

/**
 * Central registry for alarm condition strategies.
 *
 * To add a new condition:
 * 1. Create a class implementing IAlarmCondition
 * 2. Register it in the container
 * 3. Add it to the CONDITION_TYPES array below
 * 4. Add the enum value to AlarmConditionType in Prisma schema
 *
 * The engine resolves conditions dynamically, so no switch/case changes are needed.
 */
@injectable()
export class ConditionRegistry {
  private readonly _map = new Map<string, IAlarmCondition>();

  public constructor(
    @inject(TYPES.PriceDropsBelowCondition) priceDropsBelow: IAlarmCondition,
    @inject(TYPES.PriceRisesAboveCondition) priceRisesAbove: IAlarmCondition,
    @inject(TYPES.PriceChangesByPercentCondition) priceChangesByPercent: IAlarmCondition,
    @inject(TYPES.ViewsExceedCondition) viewsExceed: IAlarmCondition,
    @inject(TYPES.IsOutstandingCondition) isOutstanding: IAlarmCondition,
    @inject(TYPES.SellerChangedCondition) sellerChanged: IAlarmCondition,
  ) {
    for (const condition of [priceDropsBelow, priceRisesAbove, priceChangesByPercent, viewsExceed, isOutstanding, sellerChanged]) {
      this._map.set(condition.type, condition);
    }
  }

  /** Returns the condition strategy for the given type, or undefined if not found. */
  public get(type: string): IAlarmCondition | undefined {
    return this._map.get(type);
  }

  /** Returns all registered condition types. */
  public get allTypes(): string[] {
    return [...this._map.keys()];
  }
}
