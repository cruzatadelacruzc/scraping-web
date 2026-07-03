import { inject, injectable } from 'inversify';
import { ILogger } from '@shared/logger.interface';
import { TYPES } from '@shared/types.container';

export type FlowName = 'welcome' | 'alarms' | 'subscription' | 'profile' | 'help';

export interface IFlowRoute {
  target: 'flow';
  flow: FlowName;
}

export interface IAiRoute {
  target: 'ai';
}

export type RouteResult = IFlowRoute | IAiRoute;

const COMMANDS: Record<string, FlowName> = {
  '/start': 'welcome',
  '/alarms': 'alarms',
  '/subscription': 'subscription',
  '/profile': 'profile',
  '/help': 'help',
};

@injectable()
export class MessageRouterService {
  public constructor(@inject(TYPES.Logger) private readonly _log: ILogger) {
    this._log.context = MessageRouterService.name;
  }

  /**
   * Routes an inbound text message to either a named flow (for slash commands)
   * or the AI layer (for free-form text).
   */
  public route(text: string): RouteResult {
    const trimmed = text.trim().toLowerCase();
    const flow = COMMANDS[trimmed];
    if (flow) {
      this._log.debug('Routed to flow', { text: trimmed, flow });
      return { target: 'flow', flow };
    }
    this._log.debug('Routed to AI', { text: trimmed });
    return { target: 'ai' };
  }
}
