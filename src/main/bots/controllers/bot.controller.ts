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
import { GenerateLinkCodeDTO } from '@bots/services/dto/generate-link-code.dto';
import { ILinkStatusResponse } from '@bots/services/dto/link-status.dto';

@controller('/api/bots')
export class BotController {
  public constructor(
    @inject(TYPES.Logger) private readonly _log: ILogger,
    @inject(TYPES.LinkCodeService) private readonly _linkCode: LinkCodeService,
    @inject(TYPES.TenantContext) private readonly _tenantCtx: TenantContext,
  ) {
    this._log.context = BotController.name;
  }

  /**
   * POST /api/bots/link-code
   * Generates a 6-character link code for the authenticated user.
   */
  @httpPost('/link-code', AuthMiddleware.forRoles('ACCOUNT_OWNER'), ValidateRequestMiddleware.with(GenerateLinkCodeDTO))
  public async generateLinkCode(req: Request, res: Response): Promise<void> {
    const tenantId = this._tenantCtx.requireTenantId();
    const code = await this._linkCode.generate(req.user!.user.id, tenantId);
    ResponseHandler.created(res, 'Link code generated', { code: code.code, expiresAt: code.expiresAt });
  }

  /**
   * GET /api/bots/status
   * Returns the link status for the authenticated user.
   */
  @httpGet('/status', AuthMiddleware.forRoles('ACCOUNT_OWNER'))
  public async getStatus(req: Request, res: Response): Promise<void> {
    // TODO: query BotConversationRepository for the current user's link status
    const status: ILinkStatusResponse = { linked: false, provider: null, preferredLang: 'es' };
    ResponseHandler.ok(res, status);
  }

  /**
   * DELETE /api/bots/link
   * Unlinks all bot conversations for the authenticated user.
   */
  @httpDelete('/link', AuthMiddleware.forRoles('ACCOUNT_OWNER'))
  public async unlink(req: Request, res: Response): Promise<void> {
    // TODO: clear userId on BotConversation records for this user
    this._log.debug('Unlink requested', { userId: req.user!.user.id });
    ResponseHandler.ok(res, { message: 'Unlinked' });
  }
}
