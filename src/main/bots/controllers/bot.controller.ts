import { inject } from 'inversify';
import { controller, httpPost, httpGet, httpDelete } from 'inversify-express-utils';
import { Request, Response } from 'express';
import { ILogger } from '@shared/logger.interface';
import { TYPES } from '@shared/types.container';
import { AuthMiddleware } from '@shared/middleware/auth.middleware';
import { ResponseHandler } from '@shared/response-handler';
import { ValidateRequestMiddleware } from '@shared/middleware/validate-request.middleware';
import { TenantContext } from '@shared/tenant-context-als';
import { LinkCodeService } from '@bots/services/link-code.service';
import { LinkAuditRepository } from '@bots/repositories/link-audit.repository';
import { BotConversationRepository } from '@bots/repositories/bot-conversation.repository';
import { BotRateLimitService } from '@bots/services/rate-limit.service';
import { RateLimitError } from '@bots/errors/rate-limit.error';
import { GenerateLinkCodeDTO } from '@bots/services/dto/generate-link-code.dto';
import { LinkHistoryQueryDTO } from '@bots/services/dto/link-history.dto';
import type { ILinkStatusResponse } from '@bots/services/dto/link-status.dto';

/**
 * Masks a chatId/phone number for safe display.
 */
function maskExternalId(externalId: string): string {
  if (externalId.length <= 4) return '****';
  return `****${externalId.slice(-4)}`;
}

@controller('/api/bots')
export class BotController {
  public constructor(
    @inject(TYPES.Logger) private readonly _log: ILogger,
    @inject(TYPES.LinkCodeService) private readonly _linkCode: LinkCodeService,
    @inject(TYPES.LinkAuditRepository) private readonly _auditRepo: LinkAuditRepository,
    @inject(TYPES.BotConversationRepository) private readonly _convRepo: BotConversationRepository,
    @inject(TYPES.BotRateLimitService) private readonly _rateLimit: BotRateLimitService,
    @inject(TYPES.TenantContext) private readonly _tenantCtx: TenantContext,
  ) {
    this._log.context = BotController.name;
  }

  // ---------------------------------------------------------------------------
  // POST /link-code — generate a one-time deep link with signed JWT token
  // ---------------------------------------------------------------------------

  /**
   * Generates a signed JWT link token and provider-specific deep link.
   * One click on the deep link completes the link — no manual code entry.
   */
  @httpPost('/link-code', AuthMiddleware.forRoles('ACCOUNT_OWNER'), ValidateRequestMiddleware.with(GenerateLinkCodeDTO))
  public async generateLinkCode(req: Request, res: Response): Promise<void> {
    const tenantId = this._tenantCtx.requireTenantId();
    const dto = GenerateLinkCodeDTO.from(req.body);
    const ip = (req as unknown as { ip?: string }).ip ?? req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    try {
      // Generate for specific provider, or both
      const providers = dto.provider ? [dto.provider] : ['telegram', 'whatsapp'];
      const results: Record<string, { deepLink: string; expiresAt: string }> = {};

      for (const provider of providers) {
        const result = await this._linkCode.generate(dto.userId, tenantId, provider, ip, userAgent);
        results[provider] = { deepLink: result.deepLink, expiresAt: result.expiresAt };
      }

      ResponseHandler.created(res, 'Link token generated', {
        links: results,
        ttlMinutes: 5,
      });
    } catch (err: unknown) {
      if (err instanceof RateLimitError) {
        ResponseHandler.error(res, `Too many link requests. Retry after ${Math.ceil(err.retryAfterMs / 1000)}s`, 429);
        return;
      }
      throw err;
    }
  }

  // ---------------------------------------------------------------------------
  // GET /status — real link status including expiry
  // ---------------------------------------------------------------------------

  @httpGet('/status', AuthMiddleware.forRoles('ACCOUNT_OWNER'))
  public async getStatus(req: Request, res: Response): Promise<void> {
    const userId = req.user!.user.id;
    this._log.debug('REST request to get bot link status', { userId });

    const conversations = await this._convRepo.findByUserId(userId);

    if (conversations.length === 0) {
      const status: ILinkStatusResponse = { linked: false, provider: null, preferredLang: 'es' };
      ResponseHandler.ok(res, status);
      return;
    }

    const results = conversations.map(c => ({
      linked: c.linkExpiresAt ? c.linkExpiresAt > new Date() : false,
      provider: c.provider,
      externalId: maskExternalId(c.externalId),
      preferredLang: c.preferredLang,
      lastActivity: c.lastActivity.toISOString(),
      linkExpiresAt: c.linkExpiresAt?.toISOString() ?? null,
    }));

    ResponseHandler.ok(res, { conversations: results });
  }

  // ---------------------------------------------------------------------------
  // DELETE /link — full unlink
  // ---------------------------------------------------------------------------

  @httpDelete('/link', AuthMiddleware.forRoles('ACCOUNT_OWNER'))
  public async unlink(req: Request, res: Response): Promise<void> {
    const userId = req.user!.user.id;
    const tenantId = this._tenantCtx.requireTenantId();
    const ip = (req as unknown as { ip?: string }).ip ?? req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    await this._linkCode.unlink(userId, tenantId, ip, userAgent);

    this._log.info('User unlinked all bot conversations', { userId });
    ResponseHandler.ok(res, { message: 'Unlinked' });
  }

  // ---------------------------------------------------------------------------
  // GET /link-history — paginated audit trail
  // ---------------------------------------------------------------------------

  @httpGet('/link-history', AuthMiddleware.forRoles('ACCOUNT_OWNER'), ValidateRequestMiddleware.with(LinkHistoryQueryDTO))
  public async linkHistory(req: Request, res: Response): Promise<void> {
    const tenantId = this._tenantCtx.requireTenantId();
    const dto = LinkHistoryQueryDTO.from(req.query);

    this._log.debug('REST request to list link history', { tenantId, page: dto.page, action: dto.action });

    const { entries, total } = await this._auditRepo.findByAccountId(tenantId, dto.page, dto.pageSize, dto.action);

    this._log.info('Link history retrieved', { tenantId, total, page: dto.page });
    ResponseHandler.ok(res, {
      entries: entries.map(e => ({
        id: e.id,
        action: e.action,
        provider: e.provider,
        externalId: e.externalId ? maskExternalId(e.externalId) : null,
        createdAt: e.createdAt.toISOString(),
      })),
      total,
      page: dto.page,
      pageSize: dto.pageSize,
    });
  }
}
