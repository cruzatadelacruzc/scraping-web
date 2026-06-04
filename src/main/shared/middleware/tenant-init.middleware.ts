import { Request, Response, NextFunction } from 'express';
import { RequestContext, runWithRequestContext } from '../tenant-context-als';

/**
 * Initializes an empty AsyncLocalStorage (ALS) context for every incoming request.
 *
 * Why:
 * - Ensures that downstream middlewares (e.g., AuthMiddleware) and services
 *   always have an ALS context available to write into (tenantId, userId, traceId).
 * - Does not validate or set tenantId by itself — only provides an empty store.
 * - This must be the very first middleware in the chain so that all other logic
 *   runs inside a per-request context.
 *
 * Typical flow:
 *   tenantInitMiddleware -> AuthMiddleware -> Controller -> Service -> Repository
 *
 * Example:
 *   - tenantInitMiddleware creates ALS context { tenantId: undefined, userId: undefined, traceId: undefined }.
 *   - AuthMiddleware verifies the token, extracts tenantId/userId, and updates the context.
 *   - Prisma extension reads tenantId from ALS automatically for queries.
 */
export function tenantInitMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const initialCtx: RequestContext = { tenantId: undefined, userId: undefined, traceId: undefined };
  // runWithRequestContext will create the store and execute the callback within it
  runWithRequestContext(initialCtx, (): void => {
    next();
  });
}
