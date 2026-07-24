import type { IBotContext } from '@bots/services/tenant-bot-context.service';

export type { IBotContext };

/**
 * Payload injected into builderbot flow state before dispatch.
 * Flow actions read this to access tenant context without
 * importing @bots/services directly.
 */
export interface IFlowStatePayload {
  botCtx: IBotContext;
  validateAndLink?: (code: string, lang: string) => Promise<boolean>;
  aiHandler?: (body: string, lang: string) => Promise<string>;
  alarmsProvider?: () => Promise<Array<{ productName?: string; currentPrice?: string }>>;
  subscriptionProvider?: () => Promise<{ planName?: string; expiresAt?: string } | null>;
  profileProvider?: () => Promise<{ displayName?: string; email?: string } | null>;
}
