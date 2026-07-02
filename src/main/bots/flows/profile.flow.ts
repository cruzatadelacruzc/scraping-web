import { addKeyword } from '@builderbot/bot';
import { t } from '@bots/lang';
import { resolveTenant } from './shared/resolve-tenant';
import { requireLinkedUser, unlinkedMessage } from './shared/auth.guard';

/**
 * /profile flow — shows display name and email for the linked user.
 * Data is fetched via `methods.extensions.profileProvider`.
 */
export const profileFlow = addKeyword(['/profile']).addAction(async (ctx, methods) => {
  const botCtx = await resolveTenant(ctx, methods);
  const lang = botCtx.preferredLang;
  const profileProvider = methods.extensions?.profileProvider as
    | (() => Promise<{ displayName?: string; email?: string } | null>)
    | undefined;

  try {
    requireLinkedUser(botCtx);
    const profile = await profileProvider?.();
    const msg = profile
      ? `${t(lang, 'profile.yourProfile')}\n${t(lang, 'profile.displayName')}: ${profile.displayName ?? '—'}\n${t(lang, 'profile.email')}: ${profile.email ?? '—'}`
      : t(lang, 'common.errorGeneric');
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
