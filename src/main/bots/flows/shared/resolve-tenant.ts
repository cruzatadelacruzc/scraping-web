import type { IBotContext } from '@bots/types/bot-context.types';
import { UnlinkedUserError } from '@bots/errors/unlinked-user.error';

/**
 * Minimal contract for the inbound-message context that builderbot
 * passes to every flow callback. We only access `from` (externalId).
 */
interface IFlowContext {
  from: string;
}

/** Minimal contract for the methods bag — we only access `extensions`. */
interface IFlowMethods {
  extensions?: Record<string, unknown>;
}

export interface IResolveTenantOptions {
  /** When true and the user is not linked, throws {@link UnlinkedUserError}. */
  requireLinked?: boolean;
}

/**
 * Resolves tenant context for the current message.
 *
 * Must be called as the first action in every flow. The resolver is
 * injected by {@link BotService} via `extensions` when the bot is created.
 *
 * @param ctx     — the inbound message context (contains `from` = externalId).
 * @param methods — builderbot flow methods (contains `extensions`).
 * @param opts    — optional flags (e.g. `requireLinked` to gate linked-only flows).
 * @returns the tenant context (accountId, userId, preferredLang, …).
 */
export async function resolveTenant(ctx: IFlowContext, methods: IFlowMethods, opts?: IResolveTenantOptions): Promise<IBotContext> {
  const resolver = methods.extensions?.tenantResolver as ((from: string) => Promise<IBotContext>) | undefined;
  if (!resolver) {
    throw new Error('tenantResolver not found in extensions — ensure BotService is wired correctly');
  }
  // ctx.from is a number for Telegram, string for WhatsApp — normalise to string
  const botCtx = await resolver(String(ctx.from));

  if (opts?.requireLinked) {
    if (!botCtx.userId) {
      throw new UnlinkedUserError(botCtx.preferredLang);
    }
    // Check periodic revalidation — link must not have expired
    if (botCtx.linkExpiresAt && botCtx.linkExpiresAt < new Date()) {
      throw new UnlinkedUserError(botCtx.preferredLang);
    }
  }

  return botCtx;
}
