import { addKeyword } from '@builderbot/bot';
import { resolveTenant } from './shared/resolve-tenant';
import { withLinkedGuard } from './shared/auth.guard';
import { t } from '@bots/lang';

/**
 * Link-status flow — shows current link status and expiry.
 *
 * Triggered by `/link-status`. Available to linked users only.
 * Tells the user when their link expires and how to re-link.
 */
export const confirmLinkFlow = addKeyword(['/link-status']).addAction(
  withLinkedGuard(async (ctx, methods) => {
    const botCtx = await resolveTenant(ctx, methods, { requireLinked: true });
    const lang = botCtx.preferredLang;

    await methods.flowDynamic(t(lang, 'linkAccount.linkConfirmed'));

    return methods.endFlow();
  }),
);
