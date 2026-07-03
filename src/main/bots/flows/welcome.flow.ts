import { addKeyword, EVENTS } from '@builderbot/bot';
import { resolveTenant } from './shared/resolve-tenant';
import { welcomeMessage } from './shared/send-registration-link';
import type { IProviderAdapter } from '@bots/adapters/provider-adapter.interface';

/**
 * Welcome flow — triggered on EVENTS.WELCOME (first interaction).
 *
 * Provider-agnostic: delegates all provider-specific behaviour
 * (reply keyboard, command menu, plain text) to the
 * {@link IProviderAdapter} injected at bot startup.
 */
export const welcomeFlow = addKeyword(EVENTS.WELCOME).addAction(async (ctx, methods) => {
  const botCtx = await resolveTenant(ctx, methods);
  const linked = !!botCtx.userId;
  const msg = welcomeMessage(botCtx);

  const adapter = methods.extensions?.providerAdapter as IProviderAdapter | undefined;

  if (adapter) {
    await adapter.applyCommands(ctx.from, linked);
    await adapter.sendWelcome(ctx.from, msg, linked);
  } else {
    // Fallback for environments where the adapter wasn't wired.
    await methods.flowDynamic(msg);
  }

  return methods.endFlow();
});
