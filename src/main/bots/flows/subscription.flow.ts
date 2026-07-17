import { addKeyword } from '@builderbot/bot';
import { t } from '@bots/lang';
import { resolveTenant } from './shared/resolve-tenant';
import { withLinkedGuard } from './shared/auth.guard';

/**
 * /subscription flow — shows plan and expiry for the linked user.
 * Data is fetched via `methods.extensions.subscriptionProvider`.
 */
export const subscriptionFlow = addKeyword(['/subscription']).addAction(
  withLinkedGuard(async (ctx, methods) => {
    const botCtx = await resolveTenant(ctx, methods, { requireLinked: true });
    const lang = botCtx.preferredLang;
    const subsProvider = methods.extensions?.subscriptionProvider as
      | (() => Promise<{ planName?: string; expiresAt?: string } | null>)
      | undefined;

    const sub = await subsProvider?.();
    const msg = sub
      ? `${t(lang, 'subscription.yourPlan')}: ${sub.planName ?? '—'}\n${t(lang, 'subscription.expires')}: ${sub.expiresAt ?? '—'}`
      : t(lang, 'subscription.noPlan');
    await methods.flowDynamic(msg);
    return methods.endFlow();
  }),
);
