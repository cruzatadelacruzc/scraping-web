import { controller, httpPost, request, response, httpGet, httpPut, httpDelete, requestParam } from 'inversify-express-utils';
import { Request, Response } from 'express';
import { inject } from 'inversify';
import { TYPES } from '@shared/types.container';
import { ValidateRequestMiddleware } from '@shared/middleware/validate-request.middleware';
import { PlanDTO } from '../dto/plan.dto';
import { ResponseHandler } from '@shared/response-handler';
import { ILogger } from '@shared/logger.interface';
import { PlanService } from '@users/services/plan.service';
import { SubscriptionsService } from '@users/services/account-subscriptions.service';

@controller('/api')
export class PlanController {
  public constructor(
    @inject(TYPES.Logger) private readonly _log: ILogger,
    @inject(TYPES.PlanService) private _planService: PlanService,
    @inject(TYPES.SubscriptionsService) private _subscriptionsService: SubscriptionsService,
  ) {
    this._log.context = PlanController.name;
  }

  /**
   * Handles a POST request to create a new plan.
   * The request body should contain a PlanDTO object.
   * The response will contain a Plan as a JSON object.
   * @param {Request<PlanDTO>} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<void>} - A promise that resolves when the plan is created.
   * @throws {Error} - If the plan cannot be created.
   */
  @httpPost('/plans', TYPES.AuthMiddleware, ValidateRequestMiddleware.with(PlanDTO))
  public async create(@request() req: Request, @response() res: Response): Promise<void> {
    const request = PlanDTO.from(req.body);
    this._log.debug('REST request to create plan', request);
    if (request?.id) return ResponseHandler.badRequest(res, 'Plan ID is not allowed');
    const newPlan = await this._planService.register(request);
    ResponseHandler.created(res, 'http:created', { plan: newPlan });
  }

  /**
   * Handles a PUT request to update an existing plan.
   * The request body should contain an UpdatePlanDTO object.
   * The response will contain the updated PlanDTO as a JSON object.
   * @param {Request<{ id: string }, PlanDTO>} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<void>} - A promise that resolves when the plan is created.
   * @throws {Error} - If the plan cannot be created.
   */
  @httpPut('/plans', TYPES.AuthMiddleware, ValidateRequestMiddleware.with(PlanDTO))
  public async edit(@request() req: Request, @response() res: Response): Promise<void> {
    const request = PlanDTO.from(req.body);
    this._log.debug('REST request to update plan', request);
    if (!request?.id) return ResponseHandler.badRequest(res, 'Plan ID is required');
    const updatedPlan = await this._planService.update(request.id, request);
    ResponseHandler.updated(res, { plan: updatedPlan });
  }

  /**
   * Handles a GET request to retrieve all plans.
   * The response will contain an array of PlanDTO objects.
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<void>} - A promise that resolves when plans are retrieved.
   */
  @httpGet('/plans', TYPES.AuthMiddleware)
  public async findAll(@request() req: Request, @response() res: Response): Promise<void> {
    this._log.debug('REST request to get all plans');
    const plans = await this._planService.findAll();
    ResponseHandler.ok(res, { plans });
  }

  /**
   * Handles a GET request to retrieve an plan by ID.
   * The response will contain an PlanDTO object.
   * @param {string} id - The plan ID.
   * @param {Response} res - The Express response object.
   * @returns {Promise<void>} - A promise that resolves when the plan is retrieved.
   * @throws {Error} - If the plan is not found.
   */
  @httpGet('/plans/:id', TYPES.AuthMiddleware)
  public async findOne(@requestParam('id') id: string, @response() res: Response): Promise<void> {
    this._log.debug(`REST request to get plan : ${id}`);
    const plan = await this._planService.findById(id);
    ResponseHandler.wrapOrNotFound(res, { plan });
  }

  /**
   * Handles a DELETE request to remove an plan.
   * @param {string} id - The plan ID to delete.
   * @param {Response} res - The Express response object.
   * @returns {Promise<void>} - A promise that resolves when the plan is deleted.
   * @throws {Error} - If the plan cannot be deleted.
   */
  @httpDelete('/plans/:id', TYPES.AuthMiddleware)
  public async delete(@requestParam('id') id: string, @response() res: Response): Promise<void> {
    this._log.debug(`REST request to delete plan : ${id}`);
    await this._planService.delete(id);
    ResponseHandler.deleted(res);
  }

  /**
   * Handles a GET request to retrieve all accounts subscribed to a specific plan.
   * The response will contain an array of AccountDTO objects.
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<void>} - A promise that resolves when subscribers are retrieved.
   */
  @httpGet('/plans/:planId/subscribers', TYPES.AuthMiddleware)
  public async getSubscribers(@request() req: Request, @response() res: Response): Promise<void> {
    const { planId } = req.params;
    this._log.debug(`REST request to get subscribers for plan ${planId}`);
    const subscribers = await this._subscriptionsService.getSubscribersByPlanId(planId);
    ResponseHandler.ok(res, { subscribers });
  }
}
