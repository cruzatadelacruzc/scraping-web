import { addKeyword, EVENTS } from '@builderbot/bot';
import { t } from '@bots/lang';
import { resolveTenant } from './shared/resolve-tenant';

/**
 * Catch-all flow for any message not matched by a slash-command or
 * the link-code regex. Dispatches to the AI layer through an
 * `aiHandler` callback injected into `methods.extensions`.
 */
export const fallbackFlow = addKeyword(EVENTS.WELCOME).addAction(async (ctx, methods) => {
  const body = (ctx.body ?? '').trim();

  // Slash-commands are dispatched to named flows by builderbot.
  // This catch-all only handles free-form text.
  if (body.startsWith('/')) return methods.endFlow();

  const botCtx = await resolveTenant(ctx, methods);
  const lang = botCtx.preferredLang;
  const aiHandler = methods.extensions?.aiHandler as ((body: string, lang: string) => Promise<string | null>) | undefined;

  if (!aiHandler) {
    await methods.flowDynamic(t(lang, 'common.errorAiUnavailable'));
    return methods.endFlow();
  }

  try {
    const reply = await aiHandler(body, lang);
    await methods.flowDynamic(reply ?? t(lang, 'common.errorGeneric'));
  } catch {
    await methods.flowDynamic(t(lang, 'common.errorAiUnavailable'));
  }
  return methods.endFlow();
});
