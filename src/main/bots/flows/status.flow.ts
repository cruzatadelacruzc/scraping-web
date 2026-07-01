import { addKeyword } from '@builderbot/bot';
import { t } from '@bots/lang';
import { resolveTenant } from './shared/resolve-tenant';

/**
 * /status flow — health-check command that replies with a static
 * "online" message confirming the bot is running.
 */
export const statusFlow = addKeyword(['/status'], { sensitive: true }).addAction(async (ctx, methods) => {
  const botCtx = await resolveTenant(ctx, methods);
  const lang = botCtx.preferredLang;

  await methods.flowDynamic(t(lang, 'status.online'));
  return methods.endFlow();
});
