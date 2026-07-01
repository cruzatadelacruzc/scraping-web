import { addKeyword, EVENTS } from '@builderbot/bot';
import { resolveTenant } from './shared/resolve-tenant';
import { welcomeMessage } from './shared/send-registration-link';

/**
 * Welcome flow — triggered on EVENTS.WELCOME (first interaction).
 * Sends a contextual greeting and, for unlinked users, a registration deep-link.
 */
export const welcomeFlow = addKeyword(EVENTS.WELCOME).addAction(async (ctx, methods) => {
  const botCtx = await resolveTenant(ctx, methods);
  const msg = welcomeMessage(botCtx);
  await methods.flowDynamic(msg);
  return methods.endFlow();
});
