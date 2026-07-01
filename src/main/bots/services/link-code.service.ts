import { inject, injectable } from 'inversify';
import { nanoid } from 'nanoid';
import { BotLinkCode } from '@prisma/client';
import { ILogger } from '@shared/logger.interface';
import { TYPES } from '@shared/types.container';
import { LinkCodeRepository } from '@bots/repositories/link-code.repository';

@injectable()
export class LinkCodeService {
  private readonly _ttlMinutes: number;

  public constructor(
    @inject(TYPES.Logger) private readonly _log: ILogger,
    @inject(LinkCodeRepository) private readonly _repo: LinkCodeRepository,
  ) {
    this._log.context = LinkCodeService.name;
    this._ttlMinutes = parseInt(process.env.BOT_LINK_CODE_TTL_MINUTES ?? '10', 10);
  }

  /** Generates a 6-character link code for the given user and tenant. */
  public async generate(userId: string, accountId: string): Promise<BotLinkCode> {
    const code = nanoid(6);
    const expiresAt = new Date(Date.now() + this._ttlMinutes * 60 * 1000);
    this._log.debug('Generating link code', { userId, code });
    return this._repo.create({ code, userId, accountId, expiresAt });
  }

  /**
   * Validates a code: must exist, not be expired, and not already consumed.
   * Returns the record if valid, null otherwise.
   */
  public async validate(code: string): Promise<BotLinkCode | null> {
    const record = await this._repo.findByCode(code);
    if (!record) return null;
    if (record.consumedAt) return null;
    if (record.expiresAt < new Date()) return null;
    return record;
  }

  /** Marks a link code as consumed so it cannot be reused. */
  public async consume(id: string): Promise<BotLinkCode> {
    this._log.debug('Consuming link code', { id });
    return this._repo.consume(id);
  }
}
