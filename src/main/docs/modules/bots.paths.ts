import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { endpoint } from '../helpers/path-builder';
import { TAG } from '../tags';
import { Schemas } from '../schema-registry';

const OkResponse = z.object({
  status: z.literal('success'),
  message: z.string(),
  data: z.unknown(),
});

export function registerBotsPaths(registry: OpenAPIRegistry): void {
  const OkResp = registry.register('BotsOkResponse', OkResponse);

  // POST /api/bots/link-code
  endpoint('post', '/api/bots/link-code')
    .tag(TAG.BOTS)
    .summary('Generate a one-time deep link token for bot account linking')
    .description(
      'Creates a signed JWT link token and provider-specific deep link URLs. ' +
        'The token expires in 5 minutes. One click on the deep link completes the link — no manual code entry.',
    )
    .operationId('generateLinkCode')
    .security('bearerAuth')
    .requestBody(Schemas.GenerateLinkCodeDTO, 'User ID and optional provider hint')
    .response(201, 'Link token generated', Schemas.GenerateLinkCodeResponseDTO)
    .errors(400, 401, 403, 429)
    .register(registry);

  // GET /api/bots/status
  endpoint('get', '/api/bots/status')
    .tag(TAG.BOTS)
    .summary('Get bot link status for the authenticated user')
    .description('Returns link status, provider, masked chat ID, and link expiry for all linked chats.')
    .operationId('getBotLinkStatus')
    .security('bearerAuth')
    .response(200, 'Link status retrieved', OkResp)
    .errors(401, 403)
    .register(registry);

  // GET /api/bots/link-history
  endpoint('get', '/api/bots/link-history')
    .tag(TAG.BOTS)
    .summary('Get paginated link/unlink audit trail')
    .description(
      'Returns paginated audit entries showing all link actions for the tenant. ' +
        'Query params: `page` (int, default 1), `pageSize` (int, default 20, max 100), `action` (optional filter).',
    )
    .operationId('getBotLinkHistory')
    .security('bearerAuth')
    .response(200, 'Audit entries', OkResp)
    .errors(400, 401, 403)
    .register(registry);

  // DELETE /api/bots/link
  endpoint('delete', '/api/bots/link')
    .tag(TAG.BOTS)
    .summary('Unlink all bot conversations for the authenticated user')
    .description('Clears the user link on all bot conversations, downgrades command menus, and writes audit log entries.')
    .operationId('unlinkBot')
    .security('bearerAuth')
    .response(200, 'Unlinked successfully', OkResp)
    .errors(401, 403)
    .register(registry);
}
