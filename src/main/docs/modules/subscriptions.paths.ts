import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { endpoint } from '../helpers/path-builder';
import { TAG } from '../tags';
import { Schemas } from '../schema-registry';

export function registerSubscriptionsPaths(registry: OpenAPIRegistry): void {
  endpoint('post', '/api/subscriptions')
    .tag(TAG.SUBSCRIPTIONS)
    .summary('Create a new subscription')
    .operationId('createSubscription')
    .security('bearerAuth')
    .requestBody(Schemas.SubscriptionDTO)
    .response(201, 'Subscription created', z.object({ subscription: Schemas.SubscriptionDTO }))
    .errors(400, 401, 403)
    .register(registry);

  endpoint('get', '/api/accounts/{accountId}/subscriptions')
    .tag(TAG.SUBSCRIPTIONS)
    .summary('List subscriptions for an account')
    .operationId('listAccountSubscriptions')
    .security('bearerAuth')
    .pathParam('accountId', 'Account ID')
    .response(200, 'List of subscriptions', z.object({ subscriptions: z.array(Schemas.SubscriptionDTO) }))
    .errors(401, 403, 404)
    .register(registry);

  endpoint('delete', '/api/subscriptions/{id}')
    .tag(TAG.SUBSCRIPTIONS)
    .summary('Cancel a subscription')
    .operationId('cancelSubscription')
    .security('bearerAuth')
    .pathParam('id', 'Subscription ID')
    .response204('Subscription cancelled')
    .errors(401, 403, 404)
    .register(registry);
}
