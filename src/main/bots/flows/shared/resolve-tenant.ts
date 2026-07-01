import type { IBotContext } from '@bots/types/bot-context.types';

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

/**
 * Resolves tenant context for the current message.
 *
 * Must be called as the first action in every flow. The resolver is
 * injected by {@link BotService} via `extensions` when the bot is created.
 *
 * @param ctx  — the inbound message context (contains `from` = externalId).
 * @param methods — builderbot flow methods (contains `extensions`).
 * @returns the tenant context (accountId, userId, preferredLang, …).
 */
export async function resolveTenant(ctx: IFlowContext, methods: IFlowMethods): Promise<IBotContext> {
  const resolver = methods.extensions?.tenantResolver as ((from: string) => Promise<IBotContext>) | undefined;
  if (!resolver) {
    throw new Error('tenantResolver not found in extensions — ensure BotService is wired correctly');
  }
  return resolver(ctx.from);
}
