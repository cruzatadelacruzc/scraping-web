import { AsyncLocalStorage } from 'async_hooks';
import { injectable } from 'inversify';

export type RequestContext = {
  tenantId?: string;
  userId?: string;
  traceId?: string;
  // add additional fields if you need them
};

const asyncRequestContext = new AsyncLocalStorage<RequestContext>();

/**
 * Executes `fn` within the `ctx` request context.
 * Use from middleware (AuthMiddleware) to initialize the context per request.
 */
export function runWithRequestContext<T>(ctx: RequestContext, fn: () => T): T {
  return asyncRequestContext.run(ctx, fn);
}

/**
 * Use from infra (Prisma, logger, etc.).
 * @returns The current store (or undefined if it doesn't exist).
 * */
export function getRequestContext(): RequestContext | undefined {
  return asyncRequestContext.getStore();
}

@injectable()
export class TenantContext {
  /** Current tenatId per request*/
  public get tenantId(): string | undefined {
    return getRequestContext()?.tenantId;
  }

  /** Current user ID per request */
  public get userId(): string | undefined {
    return getRequestContext()?.userId;
  }

  /**
   * Useful for services that require a tenant
   * @throws If tenantId does not exist
   */
  public requireTenantId(): string {
    const id = this.tenantId;
    if (!id) throw new Error('Missing tenantId in request context');
    return id;
  }
}
