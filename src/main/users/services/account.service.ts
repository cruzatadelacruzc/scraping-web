import { PlanType } from '@prisma/client';
import { ILogger } from '@shared/logger.interface';
import { TYPES } from '@shared/types.container';
import { AccountDTO } from '@users/dto';
import { AccountMapper } from '@users/mappers/account.mapper';
import { PlanRepository } from '@users/repositories/plan.repository';
import { AccountRepository } from '@users/repositories/account.repository';
import { SubscriptionsService } from '@users/services/account-subscriptions.service';
import { inject, injectable } from 'inversify';

@injectable()
export class AccountService {
  public constructor(
    @inject(TYPES.Logger) private readonly _log: ILogger,
    @inject(AccountRepository) private readonly _repository: AccountRepository,
    @inject(TYPES.AccountMapper) private readonly _mapper: AccountMapper,
    @inject(TYPES.SubscriptionsService) private readonly _subscriptionsService: SubscriptionsService,
    @inject(PlanRepository) private readonly _planRepository: PlanRepository,
  ) {
    this._log.context = AccountService.name;
  }

  public async register(dto: AccountDTO): Promise<AccountDTO> {
    this._log.debug('Request to create account', dto);
    const input = this._mapper.toCreateInput(dto);
    const created = await this._repository.create(input);
    const account = this._mapper.toDTO(created)!;

    await this._assignTrialSubscription(created.id);

    return account;
  }

  /**
   * Attempts to auto-assign a TRIAL subscription to the newly created account.
   * If the TRIAL plan does not exist, logs a warning and continues without error.
   * If the subscription creation fails, logs a warning and continues (fail-open).
   *
   * @param accountId - The ID of the account to assign the trial to.
   */
  private async _assignTrialSubscription(accountId: string): Promise<void> {
    try {
      const trialPlan = await this._planRepository.findByType(PlanType.TRIAL);
      if (!trialPlan) {
        this._log.warn('TRIAL plan not found — skipping trial subscription assignment', { accountId });
        return;
      }

      const periodEnd = new Date();
      periodEnd.setDate(periodEnd.getDate() + 7); // 7-day trial period

      await this._subscriptionsService.create(accountId, trialPlan.id, 'TRIALING', periodEnd);
      this._log.debug('TRIAL subscription assigned to account', { accountId, planId: trialPlan.id });
    } catch (err) {
      this._log.warn('Failed to auto-assign TRIAL subscription', { accountId, error: err });
    }
  }

  public async getById(id: string): Promise<AccountDTO | null> {
    this._log.debug('Request to get account by id', { id });
    const account = await this._repository.findById(id);
    return this._mapper.toDTO(account);
  }

  public async getAll(): Promise<AccountDTO[]> {
    this._log.debug('Request to list all accounts');
    const accounts = await this._repository.findAll();
    return accounts.map(a => this._mapper.toDTO(a)).filter((d): d is AccountDTO => d !== null);
  }

  public async update(id: string, dto: AccountDTO): Promise<AccountDTO> {
    this._log.debug('Request to update account', { id, dto });
    const updateInput: Record<string, any> = {};
    if (dto.name !== undefined) updateInput.name = dto.name;
    if (dto.settings !== undefined) updateInput.settings = dto.settings;
    const updated = await this._repository.update(id, updateInput);
    return this._mapper.toDTO(updated)!;
  }

  public async delete(id: string): Promise<void> {
    this._log.debug('Request to delete account', { id });
    await this._repository.delete(id);
  }
}
