import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { endpoint } from '../helpers/path-builder';
import { TAG } from '../tags';
import { Schemas } from '../schema-registry';

export function registerPlansPaths(registry: OpenAPIRegistry): void {
  endpoint('post', '/api/plans')
    .tag(TAG.PLANS)
    .summary('Create a new plan')
    .operationId('createPlan')
    .security('bearerAuth')
    .requestBody(Schemas.PlanDTO)
    .response(201, 'Plan created', z.object({ plan: Schemas.PlanDTO }))
    .errors(400, 401, 403)
    .register(registry);

  endpoint('put', '/api/plans')
    .tag(TAG.PLANS)
    .summary('Update a plan')
    .operationId('updatePlan')
    .security('bearerAuth')
    .requestBody(Schemas.PlanDTO)
    .response(200, 'Plan updated', z.object({ plan: Schemas.PlanDTO }))
    .errors(400, 401, 403)
    .register(registry);

  endpoint('get', '/api/plans')
    .tag(TAG.PLANS)
    .summary('List all plans')
    .operationId('listPlans')
    .security('bearerAuth')
    .response(200, 'List of plans', z.object({ plans: z.array(Schemas.PlanDTO) }))
    .errors(401)
    .register(registry);

  endpoint('get', '/api/plans/{id}')
    .tag(TAG.PLANS)
    .summary('Get plan by ID')
    .operationId('getPlan')
    .security('bearerAuth')
    .pathParam('id', 'Plan ID')
    .response(200, 'Plan found', z.object({ plan: Schemas.PlanDTO }))
    .errors(401, 404)
    .register(registry);

  endpoint('delete', '/api/plans/{id}')
    .tag(TAG.PLANS)
    .summary('Delete a plan')
    .operationId('deletePlan')
    .security('bearerAuth')
    .pathParam('id', 'Plan ID')
    .response204('Plan deleted')
    .errors(401, 403, 404)
    .register(registry);

  endpoint('get', '/api/plans/{planId}/subscribers')
    .tag(TAG.PLANS)
    .summary('List subscribers of a plan')
    .operationId('listPlanSubscribers')
    .security('bearerAuth')
    .pathParam('planId', 'Plan ID')
    .response(200, 'List of subscribers', z.object({ subscriptions: z.array(Schemas.SubscriptionDTO) }))
    .errors(401, 403, 404)
    .register(registry);
}
