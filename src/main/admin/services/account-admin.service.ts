import { inject, injectable } from 'inversify';
import { PrismaClient } from '@prisma/client';
import { ILogger } from '@shared/logger.interface';
import { TYPES } from '@shared/types.container';
import { AccountRepository } from '@users/repositories/account.repository';

export interface IAccountStats {
  id: string;
  name: string;
  settings: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  users: Array<{ id: string }>;
  userCount: number;
  subscriptionCount: number;
  alarmCount: number;
}

export interface IPaginatedAccounts {
  accounts: IAccountStats[];
  total: number;
  skip: number;
  limit: number;
}

@injectable()
export class AccountAdminService {
  public constructor(
    @inject(AccountRepository) private readonly _accountRepo: AccountRepository,
    @inject(TYPES.PrismaClient) private readonly _prisma: PrismaClient,
    @inject(TYPES.Logger) private readonly _log: ILogger,
  ) {
    this._log.context = AccountAdminService.name;
  }

  /**
   * Returns a paginated list of accounts with related counts.
   * @param skip - Number of records to skip.
   * @param limit - Max records to return.
   * @returns Paginated accounts with user/subscription/alarm counts.
   */
  public async getAll(skip: number, limit: number): Promise<IPaginatedAccounts> {
    this._log.debug('Fetching paginated accounts', { skip, limit });

    const allAccounts = await this._accountRepo.findAll();
    const total = allAccounts.length;
    const paged = allAccounts.slice(skip, skip + limit);

    if (paged.length === 0) {
      return { accounts: [], total, skip, limit };
    }

    const accountIds = paged.map(a => a.id);

    const [subscriptionCounts, alarmCounts] = await Promise.all([
      this._prisma.accountSubscription.groupBy({
        by: ['accountId'],
        where: { accountId: { in: accountIds } },
        _count: { id: true },
      }),
      this._prisma.alarm.groupBy({
        by: ['accountId'],
        where: { accountId: { in: accountIds } },
        _count: { id: true },
      }),
    ]);

    const subMap = new Map(subscriptionCounts.map(s => [s.accountId, s._count.id]));
    const alarmMap = new Map(alarmCounts.map(a => [a.accountId, a._count.id]));

    const accounts: IAccountStats[] = paged.map(account => ({
      id: account.id,
      name: account.name,
      settings: account.settings as Record<string, unknown> | null,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
      users: account.users,
      userCount: account.users.length,
      subscriptionCount: subMap.get(account.id) ?? 0,
      alarmCount: alarmMap.get(account.id) ?? 0,
    }));

    return { accounts, total, skip, limit };
  }

  /**
   * Returns a single account by ID with related counts.
   * @param id - The account ID.
   * @returns Account with stats, or null if not found.
   */
  public async getById(id: string): Promise<IAccountStats | null> {
    this._log.debug('Fetching account by id', { id });

    const account = await this._accountRepo.findById(id);
    if (!account) return null;

    const [subscriptionCount, alarmCount] = await Promise.all([
      this._prisma.accountSubscription.count({ where: { accountId: id } }),
      this._prisma.alarm.count({ where: { accountId: id } }),
    ]);

    return {
      id: account.id,
      name: account.name,
      settings: account.settings as Record<string, unknown> | null,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
      users: account.users,
      userCount: account.users.length,
      subscriptionCount,
      alarmCount,
    };
  }

  /**
   * Updates an account by ID.
   * @param id - The account ID.
   * @param data - Partial account data to update.
   * @returns The updated account.
   */
  public async update(
    id: string,
    data: Record<string, unknown>,
  ): Promise<{ id: string; name: string; settings: unknown; createdAt: Date; updatedAt: Date }> {
    this._log.debug('Updating account', { id, data });
    const updated = await this._accountRepo.update(id, data);
    return {
      id: updated.id,
      name: updated.name,
      settings: updated.settings,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Deletes an account by ID.
   * @param id - The account ID.
   */
  public async delete(id: string): Promise<void> {
    this._log.debug('Deleting account', { id });
    await this._accountRepo.delete(id);
  }
}
