import { ILogger } from '@shared/logger.interface';
import { TYPES } from '@shared/types.container';
import { SubscriptionsRepository } from '@users/repositories/account-subscriptions.repository';
import { AlarmRepository } from '@alarms/repositories/alarm.repository';
import { PlanLimitReachedError } from '@users/errors/plan-limit-reached.error';
import { inject, injectable } from 'inversify';

@injectable()
export class PlanEnforcementService {
  /**
   * Enforces subscription plan limits (max alarms, allowed conditions) against
   * an account's active plan features.
   *
   * NOTE: This service injects {@link SubscriptionsRepository} directly rather
   * than routing through {@link SubscriptionsService}. This is intentional — the
   * enforcement checks need raw Prisma models with nested `plan.features` JSONB
   * which the DTO/mapper layer strips away. If the subscription DTO is ever
   * extended to carry raw plan features, this can be refactored to use the
   * service layer.
   */
  public constructor(
    @inject(TYPES.Logger) private readonly _log: ILogger,
    @inject(SubscriptionsRepository) private readonly _subscriptionsRepo: SubscriptionsRepository,
    @inject(AlarmRepository) private readonly _alarmRepo: AlarmRepository,
  ) {
    this._log.context = PlanEnforcementService.name;
  }

  /**
   * Checks whether the account has reached its plan's alarm limit.
   * Throws PlanLimitReachedError if the limit has been reached or
   * if no active/trialing subscription exists.
   *
   * @param accountId - The account to check.
   * @throws PlanLimitReachedError
   */
  public async enforceAlarmLimit(accountId: string): Promise<void> {
    this._log.debug('Enforcing alarm limit', { accountId });

    const subscriptions = await this._subscriptionsRepo.findByAccountId(accountId);
    const activeSub = this.findActiveSubscription(subscriptions);

    if (!activeSub) {
      this._log.warn('No active subscription found for account', { accountId });
      throw new PlanLimitReachedError();
    }

    const features = activeSub.plan?.features as Record<string, unknown> | null | undefined;
    if (!features) {
      this._log.warn('Plan has no features for account', { accountId, planId: activeSub.planId });
      throw new PlanLimitReachedError();
    }

    const maxAlarms = Number(features.maxAlarms ?? 0);

    // -1 means unlimited
    if (maxAlarms === -1) {
      this._log.debug('Plan has unlimited alarms, skipping limit check', { accountId });
      return;
    }

    const currentCount = await this._alarmRepo.countByAccountId(accountId);
    this._log.debug('Current alarm count vs plan limit', { accountId, currentCount, maxAlarms });

    if (currentCount >= maxAlarms) {
      throw new PlanLimitReachedError();
    }
  }

  /**
   * Checks whether the given alarm condition type is allowed by the account's plan.
   *
   * If the plan's features do not include `allowedConditions`, all conditions are
   * considered allowed (backward compatibility). If `allowedConditions` is an empty
   * array, all conditions are also considered allowed.
   *
   * @param accountId - The account to check.
   * @param condition - The condition type to validate (e.g. "PRICE_DROPS_BELOW").
   * @returns `true` if the condition is allowed; `false` otherwise.
   */
  public async isConditionAllowed(accountId: string, condition: string): Promise<boolean> {
    this._log.debug('Checking condition allowed by plan', { accountId, condition });

    const subscriptions = await this._subscriptionsRepo.findByAccountId(accountId);
    const activeSub = this.findActiveSubscription(subscriptions);

    if (!activeSub) {
      this._log.warn('No active subscription found for account', { accountId });
      return false;
    }

    const features = activeSub.plan?.features as Record<string, unknown> | null | undefined;

    // Backward compat: if plan has no allowedConditions, allow all
    if (!features || !features.allowedConditions) {
      return true;
    }

    const allowedConditions = features.allowedConditions;

    // If allowedConditions is not an array, treat as unrestricted
    if (!Array.isArray(allowedConditions)) {
      return true;
    }

    // Empty array means no restrictions → allow all
    if (allowedConditions.length === 0) {
      return true;
    }

    return allowedConditions.includes(condition);
  }

  /**
   * Finds the first subscription with status ACTIVE or TRIALING.
   * Subscriptions from the repository are ordered by createdAt desc,
   * so the newest matching subscription is returned.
   */
  private findActiveSubscription(
    subscriptions: Array<{ status: string; planId: string; plan: Record<string, unknown> | null }>,
  ): { status: string; planId: string; plan: Record<string, unknown> | null } | null {
    return subscriptions.find(sub => sub.status === 'ACTIVE' || sub.status === 'TRIALING') ?? null;
  }
}
