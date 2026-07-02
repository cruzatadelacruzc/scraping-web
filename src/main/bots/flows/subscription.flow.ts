import { addKeyword } from '@builderbot/bot';
import { t } from '@bots/lang';
import { resolveTenant } from './shared/resolve-tenant';
import { requireLinkedUser, unlinkedMessage } from './shared/auth.guard';

/**
 * /subscription flow — shows plan and expiry for the linked user.
 * Data is fetched via `methods.extensions.subscriptionProvider`.
 */
export const subscriptionFlow = addKeyword(['/subscription']).addAction(async (ctx, methods) => {
  const botCtx = await resolveTenant(ctx, methods);
  const lang = botCtx.preferredLang;
  const subsProvider = methods.extensions?.subscriptionProvider as
    | (() => Promise<{ planName?: string; expiresAt?: string } | null>)
    | undefined;

  try {
    requireLinkedUser(botCtx);
    const sub = await subsProvider?.();
    const msg = sub
      ? `${t(lang, 'subscription.yourPlan')}: ${sub.planName ?? '—'}\n${t(lang, 'subscription.expires')}: ${sub.expiresAt ?? '—'}`
      : t(lang, 'subscription.noPlan');
    await methods.flowDynamic(msg);
  } catch (e: unknown) {
    if ((e as any)?.name === 'UnlinkedUserError') {
      await methods.flowDynamic(unlinkedMessage(lang));
    } else {
      await methods.flowDynamic(t(lang, 'common.errorGeneric'));
    }
  }
  return methods.endFlow();
});
