import { inject, injectable } from 'inversify';
import { ILogger } from '@shared/logger.interface';
import { TYPES } from '@shared/types.container';
import { runWithRequestContext } from '@shared/tenant-context-als';
import { BotConversationRepository } from '@bots/repositories/bot-conversation.repository';

export interface IBotContext {
  conversationId: string;
  accountId: string | null;
  userId: string | null;
  preferredLang: string;
  /** When the link expires — null if not linked or link lifetime not set. */
  linkExpiresAt: Date | null;
}

@injectable()
export class TenantBotContextService {
  public constructor(
    @inject(TYPES.Logger) private readonly _log: ILogger,
    @inject(TYPES.BotConversationRepository) private readonly _repo: BotConversationRepository,
  ) {
    this._log.context = TenantBotContextService.name;
  }

  /**
   * Upserts the conversation for every incoming message and returns the
   * resolved context: conversationId, accountId, userId (null if unlinked),
   * and preferredLang.
   */
  public async resolve(provider: string, externalId: string): Promise<IBotContext> {
    // Upsert returns the full current record (Prisma semantics) — including
    // userId when already linked. We only use create.accountId as placeholder;
    // once linked, the existing record's accountId is preserved on update.
    const conv = await this._repo.upsert({
      provider,
      externalId,
      accountId: null, // unlinked — set when user links account
    });

    return {
      conversationId: conv.id,
      accountId: conv.accountId,
      userId: conv.userId ?? null,
      preferredLang: conv.preferredLang ?? 'es',
      linkExpiresAt: conv.linkExpiresAt ?? null,
    };
  }

  /**
   * Resolves the tenant context and executes the callback inside
   * runWithRequestContext so downstream services/repos automatically
   * inherit the correct tenantId via AsyncLocalStorage.
   */
  public async wrap<T>(provider: string, externalId: string, fn: () => Promise<T>): Promise<T> {
    const ctx = await this.resolve(provider, externalId);
    this._log.debug('Wrapping bot message in tenant context', ctx);

    return runWithRequestContext({ tenantId: ctx.accountId ?? undefined, userId: ctx.userId ?? undefined }, fn);
  }
}
