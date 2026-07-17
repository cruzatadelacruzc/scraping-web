import { injectable, inject } from 'inversify';
import { PrismaClient, Rule as RuleModel } from '@prisma/client';
import { TYPES } from '@shared/types.container';
import { RuleNotFoundError } from '@scrapers/revolico/errors/rule-not-found.error';

/**
 * Database access layer for the Rule table (PostgreSQL via Prisma).
 *
 * Rules are global configuration — no tenant isolation applies.
 */
@injectable()
export class RuleRepository {
  public constructor(@inject(TYPES.PrismaClient) private readonly _prisma: PrismaClient) {}

  /**
   * Finds a single rule by its unique key.
   *
   * @param {string} ruleKey - The rule category key (e.g. "brands", "colors").
   * @returns {Promise<RuleModel | null>} The rule row or null.
   */
  public async findByKey(ruleKey: string): Promise<RuleModel | null> {
    return this._prisma.rule.findUnique({ where: { ruleKey } });
  }

  /**
   * Returns all rules, ordered by ruleKey ascending.
   *
   * @returns {Promise<RuleModel[]>} All rule rows (enabled and disabled).
   */
  public async findAll(): Promise<RuleModel[]> {
    return this._prisma.rule.findMany({ orderBy: { ruleKey: 'asc' } });
  }

  /**
   * Returns only enabled rules. Used by RuleRegistryService to warm the cache.
   *
   * @returns {Promise<RuleModel[]>} Enabled rule rows.
   */
  public async findAllEnabled(): Promise<RuleModel[]> {
    return this._prisma.rule.findMany({ where: { enabled: true } });
  }

  /**
   * Creates or updates a rule row. Bumps the version on update.
   *
   * @param {string} ruleKey - The unique rule key.
   * @param {string[]} values - The word-list values array.
   * @returns {Promise<RuleModel>} The upserted row.
   */
  public async upsert(ruleKey: string, values: string[]): Promise<RuleModel> {
    return this._prisma.rule.upsert({
      where: { ruleKey },
      create: { ruleKey, values },
      update: { values, version: { increment: 1 } },
    });
  }

  /**
   * Alternates the enabled flag and returns the updated row.
   * @throws {RuleNotFoundError} If the ruleKey does not exist.
   */
  public async toggleEnabled(ruleKey: string): Promise<RuleModel> {
    const current = await this._prisma.rule.findUnique({ where: { ruleKey } });
    if (!current) throw new RuleNotFoundError(ruleKey);
    return this._prisma.rule.update({
      where: { ruleKey },
      data: { enabled: !current.enabled },
    });
  }

  /**
   * Physically deletes a rule row.
   * @returns {Promise<boolean>} true if deleted, false if key not found.
   */
  public async delete(ruleKey: string): Promise<boolean> {
    const existing = await this._prisma.rule.findUnique({ where: { ruleKey } });
    if (!existing) return false;
    await this._prisma.rule.delete({ where: { ruleKey } });
    return true;
  }
}
