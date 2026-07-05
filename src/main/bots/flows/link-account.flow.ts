import { addKeyword } from '@builderbot/bot';
import { resolveTenant } from './shared/resolve-tenant';
import { linkAccountPrompt, linkAccountConfirmed } from './shared/idle.helper';
import { invalidCodeMessage } from './shared/auth.guard';
import { t } from '@bots/lang';
import { InvalidLinkCodeError } from '@bots/errors/invalid-link-code.error';
import { RateLimitError } from '@bots/errors/rate-limit.error';

/**
 * Link-account flow — receives a signed JWT token via deep link
 * (`/start <token>` on Telegram) or text message (WhatsApp).
 *
 * The BotService injects `verifyAndLink` into `methods.extensions`.
 * On success the user is linked immediately — no separate confirmation step.
 */
export const linkAccountFlow = addKeyword(['__LINK_CODE__', '/start']).addAction(async (ctx, methods) => {
  const botCtx = await resolveTenant(ctx, methods);
  const lang = botCtx.preferredLang;
  const body = (ctx.body ?? '').trim();
  const chatId = String(ctx.from);
  const providerName = (methods.extensions?.providerName as string) ?? 'unknown';
  const verifyAndLink = methods.extensions?.verifyAndLink as
    | ((token: string, chatId: string, provider: string) => Promise<boolean>)
    | undefined;

  if (!verifyAndLink) {
    await methods.flowDynamic(`⚠️ ${invalidCodeMessage(lang)}`);
    return methods.endFlow();
  }

  await methods.flowDynamic(linkAccountPrompt(lang));

  try {
    const linked = await verifyAndLink(body, chatId, providerName);
    if (linked) {
      await methods.flowDynamic(linkAccountConfirmed(lang));
    } else {
      await methods.flowDynamic(invalidCodeMessage(lang));
    }
  } catch (err: unknown) {
    if (err instanceof RateLimitError) {
      const minutes = Math.ceil(err.retryAfterMs / 60000);
      await methods.flowDynamic(`${t(lang, 'linkAccount.rateLimited')} ${minutes} min`);
    } else if (err instanceof InvalidLinkCodeError) {
      await methods.flowDynamic(invalidCodeMessage(lang));
    } else {
      await methods.flowDynamic(invalidCodeMessage(lang));
    }
  }
  return methods.endFlow();
});
