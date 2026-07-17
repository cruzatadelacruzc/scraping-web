import { Request, Response } from 'express';
import { controller, httpDelete, httpGet, httpPatch, httpPost, httpPut, request, response, requestParam } from 'inversify-express-utils';
import { inject } from 'inversify';
import { TYPES } from '@shared/types.container';
import { AuthMiddleware } from '@shared/middleware/auth.middleware';
import { ResponseHandler } from '@shared/response-handler';
import { ValidateRequestMiddleware } from '@shared/middleware/validate-request.middleware';
import { ILogger } from '@shared/logger.interface';
import { RuleService } from '@admin/services/rule.service';
import { CreateRuleDTO, UpdateRuleDTO } from '@admin/services/dto/rule.dto';
import { RuleNotFoundError } from '@scrapers/revolico/errors/rule-not-found.error';
import { RuleAlreadyExistsError } from '@scrapers/revolico/errors/rule-already-exists.error';

/**
 * SUPER_ADMIN-only CRUD for rule-based extractor word-list patterns.
 *
 * Endpoints:
 *   GET    /api/admin/rules            — list all rules
 *   GET    /api/admin/rules/:ruleKey   — get one rule
 *   POST   /api/admin/rules            — create a new rule
 *   PUT    /api/admin/rules/:ruleKey   — update an existing rule's values
 *   PATCH  /api/admin/rules/:ruleKey/toggle — toggle enabled flag
 *   DELETE /api/admin/rules/:ruleKey   — permanently delete a rule
 */
@controller('/api/admin/rules')
export class RuleController {
  public constructor(
    @inject(TYPES.RuleService) private readonly _service: RuleService,
    @inject(TYPES.Logger) private readonly _log: ILogger,
  ) {
    this._log.context = RuleController.name;
  }

  /**
   * Lists all rules (enabled and disabled).
   */
  @httpGet('/', AuthMiddleware.forRoles('SUPER_ADMIN'))
  public async list(@response() res: Response): Promise<void> {
    try {
      const rules = await this._service.list();
      ResponseHandler.ok(res, { rules });
    } catch (err) {
      this._log.error('Failed to list rules', { error: err });
      ResponseHandler.error(res, 'Failed to list rules', 500);
    }
  }

  /**
   * Returns a single rule by its key.
   */
  @httpGet('/:ruleKey', AuthMiddleware.forRoles('SUPER_ADMIN'))
  public async findOne(@requestParam('ruleKey') ruleKey: string, @response() res: Response): Promise<void> {
    try {
      const rule = await this._service.findOne(ruleKey);
      ResponseHandler.ok(res, { rule });
    } catch (err) {
      if (err instanceof RuleNotFoundError) {
        ResponseHandler.notFound(res, err.message);
        return;
      }
      this._log.error('Failed to get rule', { ruleKey, error: err });
      ResponseHandler.error(res, 'Failed to get rule', 500);
    }
  }

  /**
   * Creates a new rule. Fails with 409 if the ruleKey already exists.
   */
  @httpPost('/', AuthMiddleware.forRoles('SUPER_ADMIN'), ValidateRequestMiddleware.with(CreateRuleDTO))
  public async create(@request() req: Request, @response() res: Response): Promise<void> {
    try {
      const dto = req.body as CreateRuleDTO;
      const rule = await this._service.create(dto.ruleKey, dto.values);
      ResponseHandler.created(res, 'Rule created', { rule });
    } catch (err) {
      if (err instanceof RuleAlreadyExistsError) {
        ResponseHandler.error(res, err.message, 409);
        return;
      }
      this._log.error('Failed to create rule', { error: err });
      ResponseHandler.error(res, 'Failed to create rule', 500);
    }
  }

  /**
   * Updates an existing rule's values (replaces the whole array).
   * Fails with 404 if the ruleKey does not exist.
   */
  @httpPut('/:ruleKey', AuthMiddleware.forRoles('SUPER_ADMIN'), ValidateRequestMiddleware.with(UpdateRuleDTO))
  public async update(@requestParam('ruleKey') ruleKey: string, @request() req: Request, @response() res: Response): Promise<void> {
    try {
      const dto = req.body as UpdateRuleDTO;
      const rule = await this._service.update(ruleKey, dto.values);
      ResponseHandler.ok(res, { rule });
    } catch (err) {
      if (err instanceof RuleNotFoundError) {
        ResponseHandler.notFound(res, err.message);
        return;
      }
      this._log.error('Failed to update rule', { ruleKey, error: err });
      ResponseHandler.error(res, 'Failed to update rule', 500);
    }
  }

  /**
   * Toggles a rule's enabled flag. Returns 404 if not found.
   */
  @httpPatch('/:ruleKey/toggle', AuthMiddleware.forRoles('SUPER_ADMIN'))
  public async toggle(@requestParam('ruleKey') ruleKey: string, @response() res: Response): Promise<void> {
    try {
      const rule = await this._service.toggle(ruleKey);
      ResponseHandler.created(res, 'Rule toggled', { rule });
    } catch (err) {
      if (err instanceof RuleNotFoundError) {
        ResponseHandler.notFound(res, err.message);
        return;
      }
      this._log.error('Failed to toggle rule', { ruleKey, error: err });
      ResponseHandler.error(res, 'Failed to toggle rule', 500);
    }
  }

  /**
   * Permanently deletes a rule. Returns 404 if not found.
   */
  @httpDelete('/:ruleKey', AuthMiddleware.forRoles('SUPER_ADMIN'))
  public async delete(@requestParam('ruleKey') ruleKey: string, @response() res: Response): Promise<void> {
    try {
      await this._service.delete(ruleKey);
      ResponseHandler.ok(res, { message: `Rule '${ruleKey}' deleted` });
    } catch (err) {
      if (err instanceof RuleNotFoundError) {
        ResponseHandler.notFound(res, err.message);
        return;
      }
      this._log.error('Failed to delete rule', { ruleKey, error: err });
      ResponseHandler.error(res, 'Failed to delete rule', 500);
    }
  }
}
