import { createFlow } from '@builderbot/bot';
import { welcomeFlow } from './welcome.flow';
import { linkAccountFlow } from './link-account.flow';
import { confirmLinkFlow } from './confirm-link.flow';
import { alarmsFlow } from './alarms.flow';
import { subscriptionFlow } from './subscription.flow';
import { profileFlow } from './profile.flow';
import { helpFlow } from './help.flow';
import { statusFlow } from './status.flow';
import { fallbackFlow } from './fallback.flow';

/**
 * Assembles all bot flows into a single flow tree that builderbot
 * can register as the main flow.
 *
 * Order: welcome → link-account → link-status → commands (/alarms,
 * /subscription, /profile, /help) → fallback (AI catch-all).
 * builderbot resolves keywords in registration order.
 */
export const mainFlow = createFlow([
  welcomeFlow,
  linkAccountFlow,
  confirmLinkFlow,
  alarmsFlow,
  subscriptionFlow,
  profileFlow,
  helpFlow,
  statusFlow,
  fallbackFlow,
]);
