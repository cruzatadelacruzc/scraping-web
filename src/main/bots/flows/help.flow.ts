import { addKeyword } from '@builderbot/bot';
import { t } from '@bots/lang';
import { resolveTenant } from './shared/resolve-tenant';

/**
 * /help flow — lists available commands and account-linking instructions.
 */
export const helpFlow = addKeyword(['/help']).addAction(async (ctx, methods) => {
  const botCtx = await resolveTenant(ctx, methods);
  const lang = botCtx.preferredLang;

  const lines = [
    t(lang, 'help.title'),
    '',
    '/alarms — ' + t(lang, 'help.commandAlarms'),
    '/subscription — ' + t(lang, 'help.commandSubscription'),
    '/profile — ' + t(lang, 'help.commandProfile'),
    '/help — ' + t(lang, 'help.commandHelp'),
  ];

  if (!botCtx.userId) {
    lines.push('', t(lang, 'unlinked.openWeb'));
  }

  await methods.flowDynamic(lines.join('\n'));
  return methods.endFlow();
});
