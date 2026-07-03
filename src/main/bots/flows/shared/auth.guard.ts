import type { IBotContext } from '@bots/services/tenant-bot-context.service';
import { t } from '@bots/lang';
import { UnlinkedUserError } from '@bots/errors/unlinked-user.error';

/**
 * Guards a flow step against unlinked users. If the resolved context has
 * `userId === null`, throws UnlinkedUserError — the caller must catch it
 * or use {@link withLinkedGuard}.
 */
export function requireLinkedUser(ctx: IBotContext): asserts ctx is IBotContext & { userId: string } {
  if (!ctx.userId) {
    throw new UnlinkedUserError(ctx.preferredLang);
  }
}

/**
 * Higher-order wrapper for builderbot addAction callbacks that gates
 * linked-only flows. Catches {@link UnlinkedUserError} and responds
 * with the unlinked message + registration link automatically.
 *
 * @example
 *   addKeyword(['/alarms']).addAction(withLinkedGuard(async (ctx, methods) => {
 *     const botCtx = await resolveTenant(ctx, methods, { requireLinked: true });
 *     // … business logic (userId is guaranteed non-null) …
 *   }))
 */
export function withLinkedGuard(fn: (ctx: any, methods: any) => Promise<any>): (ctx: any, methods: any) => Promise<any> {
  return async (ctx, methods) => {
    try {
      return await fn(ctx, methods);
    } catch (e: unknown) {
      if (e instanceof UnlinkedUserError) {
        await methods.flowDynamic(unlinkedMessage(e.preferredLang));
        return methods.endFlow();
      }
      throw e;
    }
  };
}

/**
 * Message a user sees when they hit a gated flow without being linked.
 */
export function unlinkedMessage(lang: string): string {
  return `${t(lang, 'unlinked.needsLink')}\n\n${t(lang, 'unlinked.openWeb')}`;
}

/**
 * Message shown after a user sends an invalid or expired link code.
 */
export function invalidCodeMessage(lang: string): string {
  return `${t(lang, 'linkAccount.codeInvalid')}\n\n${t(lang, 'unlinked.sendCode')}`;
}
