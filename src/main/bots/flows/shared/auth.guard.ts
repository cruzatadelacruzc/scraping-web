import { IBotContext } from '@bots/services/tenant-bot-context.service';
import { t } from '@bots/lang';
import { UnlinkedUserError } from '@bots/errors/unlinked-user.error';

/**
 * Guards a flow step against unlinked users. If the resolved context has
 * `userId === null`, throws UnlinkedUserError — the caller (BotService)
 * catches it and redirects to the welcome/registration flow.
 */
export function requireLinkedUser(ctx: IBotContext): asserts ctx is IBotContext & { userId: string } {
  if (!ctx.userId) {
    throw new UnlinkedUserError(ctx.preferredLang);
  }
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
