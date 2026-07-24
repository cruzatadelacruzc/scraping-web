import { ILogger } from '@shared/logger.interface';
import { TYPES } from '@shared/types.container';
import { AccountDTO, AccountSubscriptionDTO } from '@users/dto';
import { SubscriptionsMapper } from '@users/mappers';
import { SubscriptionsRepository } from '@users/repositories/account-subscriptions.repository';
import { inject, injectable } from 'inversify';
import { SubscriptionStatusType } from '@prisma/client';

@injectable()
export class SubscriptionsService {
  public constructor(
    @inject(TYPES.Logger) private readonly _log: ILogger,
    @inject(SubscriptionsRepository) private _repository: SubscriptionsRepository,
    @inject(TYPES.SubscriptionsMapper) private _subscriptionMapper: SubscriptionsMapper,
  ) {
    this._log.context = SubscriptionsService.name;
  }

  public async getSubscribersByPlanId(planId: string): Promise<Array<AccountSubscriptionDTO & { account: AccountDTO }>> {
    this._log.debug(`Request to get subscribed accounts for plan ID: ${planId}`);
    const subscriptions = await this._repository.findSubscriptionsByPlanId(planId);
    if (!subscriptions) return [];
    return subscriptions
      .map(sub => this._subscriptionMapper.toDTOWithAccount(sub))
      .filter((sub): sub is AccountSubscriptionDTO & { account: AccountDTO } => sub !== null);
  }

  public async create(accountId: string, planId: string, status: SubscriptionStatusType = 'TRIALING'): Promise<AccountSubscriptionDTO> {
    this._log.debug('Request to create subscription', { accountId, planId, status });

    const periodStart = new Date();
    const periodEnd = new Date();
    periodEnd.setDate(periodEnd.getDate() + 30); // 30-day default period

    const created = await this._repository.create({
      account: { connect: { id: accountId } },
      plan: { connect: { id: planId } },
      status,
      periodStart,
      periodEnd,
    });

    return this._subscriptionMapper.toDTO(created)!;
  }

  public async getByAccountId(accountId: string): Promise<AccountSubscriptionDTO[]> {
    this._log.debug('Request to get subscriptions for account', { accountId });
    const subscriptions = await this._repository.findByAccountId(accountId);
    return this._subscriptionMapper.toDTOs(subscriptions as any);
  }

  public async cancel(id: string): Promise<AccountSubscriptionDTO> {
    this._log.debug('Request to cancel subscription', { id });
    const updated = await this._repository.update(id, { status: 'CANCELED' });
    return this._subscriptionMapper.toDTO(updated as any)!;
  }
}
