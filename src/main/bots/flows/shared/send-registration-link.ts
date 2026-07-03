/**
 * Maps a builderbot EVENTS.WELCOME payload into the welcome flow.
 *
 * builderbot triggers this when a user first interacts with the bot
 * or after a long idle period. It sends the registration/deep-link
 * message depending on whether the user is already linked.
 */
import type { IBotContext } from '@bots/services/tenant-bot-context.service';
import { t } from '@bots/lang';

export function welcomeMessage(ctx: IBotContext): string {
  if (ctx.userId) {
    // Already linked — quick re-intro
    return `${t(ctx.preferredLang, 'common.greeting')}\n${t(ctx.preferredLang, 'common.availableCommands')}`;
  }

  return [
    t(ctx.preferredLang, 'welcome.greeting'),
    '',
    t(ctx.preferredLang, 'welcome.intro'),
    t(ctx.preferredLang, 'welcome.cta'),
    t(ctx.preferredLang, 'welcome.alreadyHaveAccount'),
  ].join('\n');
}
