import { addKeyword } from '@builderbot/bot';
import { t } from '@bots/lang';
import { resolveTenant } from './shared/resolve-tenant';
import { withLinkedGuard } from './shared/auth.guard';

/**
 * /profile flow — shows display name and email for the linked user.
 * Data is fetched via `methods.extensions.profileProvider`.
 */
export const profileFlow = addKeyword(['/profile']).addAction(
  withLinkedGuard(async (ctx, methods) => {
    const botCtx = await resolveTenant(ctx, methods, { requireLinked: true });
    const lang = botCtx.preferredLang;
    const profileProvider = methods.extensions?.profileProvider as
      | (() => Promise<{ displayName?: string; email?: string } | null>)
      | undefined;

    const profile = await profileProvider?.();
    const msg = profile
      ? `${t(lang, 'profile.yourProfile')}\n${t(lang, 'profile.displayName')}: ${profile.displayName ?? '—'}\n${t(lang, 'profile.email')}: ${profile.email ?? '—'}`
      : t(lang, 'common.errorGeneric');
    await methods.flowDynamic(msg);
    return methods.endFlow();
  }),
);
