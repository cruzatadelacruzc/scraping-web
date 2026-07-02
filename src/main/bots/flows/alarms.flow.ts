import { addKeyword } from '@builderbot/bot';
import { t } from '@bots/lang';
import { resolveTenant } from './shared/resolve-tenant';
import { requireLinkedUser, unlinkedMessage } from './shared/auth.guard';

/**
 * /alarms flow — lists active alarms for the linked user.
 * The alarm data is fetched via `methods.extensions.alarmProvider`.
 */
export const alarmsFlow = addKeyword(['/alarms']).addAction(async (ctx, methods) => {
  const botCtx = await resolveTenant(ctx, methods);
  const lang = botCtx.preferredLang;
  const alarmProvider = methods.extensions?.alarmProvider as
    | (() => Promise<Array<{ productName?: string; currentPrice?: string }>>)
    | undefined;

  try {
    requireLinkedUser(botCtx);
    const list = await alarmProvider?.();
    if (!list || list.length === 0) {
      await methods.flowDynamic(t(lang, 'alarms.noAlarms'));
      return methods.endFlow();
    }
    const lines = list.map((a, i) => `${i + 1}. ${a.productName ?? '—'} — ${a.currentPrice ?? '?'}`);
    await methods.flowDynamic([t(lang, 'alarms.yourAlarms'), '', ...lines].join('\n'));
  } catch (e: unknown) {
    if ((e as any)?.name === 'UnlinkedUserError') {
      await methods.flowDynamic(unlinkedMessage(lang));
    } else {
      await methods.flowDynamic(t(lang, 'common.errorGeneric'));
    }
  }
  return methods.endFlow();
});
