import { addKeyword } from '@builderbot/bot';
import { resolveTenant } from './shared/resolve-tenant';
import { linkAccountPrompt, linkAccountSuccess } from './shared/idle.helper';
import { invalidCodeMessage } from './shared/auth.guard';

/**
 * Link-account flow — captures the 6-character code the user sends.
 *
 * The BotService injects a `validateAndLink` callback into
 * `methods.extensions` before creating the bot.
 */
export const linkAccountFlow = addKeyword(['__LINK_CODE__']).addAction(async (ctx, methods) => {
  const botCtx = await resolveTenant(ctx, methods);
  const lang = botCtx.preferredLang;
  const body = (ctx.body ?? '').trim();
  const validateAndLink = methods.extensions?.validateAndLink as ((code: string, chatId: string | number) => Promise<boolean>) | undefined;

  await methods.flowDynamic(linkAccountPrompt(lang));

  if (!validateAndLink) {
    await methods.flowDynamic(`⚠️ ${invalidCodeMessage(lang)}`);
    return methods.endFlow();
  }

  try {
    const linked = await validateAndLink(body, ctx.from);
    if (linked) {
      await methods.flowDynamic(linkAccountSuccess(lang));
    } else {
      await methods.flowDynamic(invalidCodeMessage(lang));
    }
  } catch {
    await methods.flowDynamic(invalidCodeMessage(lang));
  }
  return methods.endFlow();
});
