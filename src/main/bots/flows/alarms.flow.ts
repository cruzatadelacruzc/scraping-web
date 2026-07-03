import { addKeyword } from '@builderbot/bot';
import { t } from '@bots/lang';
import { resolveTenant } from './shared/resolve-tenant';
import { withLinkedGuard } from './shared/auth.guard';

/**
 * /alarms flow — lists active alarms for the linked user.
 * The alarm data is fetched via `methods.extensions.alarmProvider`.
 */
export const alarmsFlow = addKeyword(['/alarms']).addAction(
  withLinkedGuard(async (ctx, methods) => {
    const botCtx = await resolveTenant(ctx, methods, { requireLinked: true });
    const lang = botCtx.preferredLang;
    const alarmProvider = methods.extensions?.alarmProvider as
      | (() => Promise<Array<{ productName?: string; currentPrice?: string }>>)
      | undefined;

    const list = await alarmProvider?.();
    if (!list || list.length === 0) {
      await methods.flowDynamic(t(lang, 'alarms.noAlarms'));
      return methods.endFlow();
    }
    const lines = list.map((a, i) => `${i + 1}. ${a.productName ?? '—'} — ${a.currentPrice ?? '?'}`);
    await methods.flowDynamic([t(lang, 'alarms.yourAlarms'), '', ...lines].join('\n'));
    return methods.endFlow();
  }),
);
