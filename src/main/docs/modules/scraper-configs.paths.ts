import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { endpoint } from '../helpers/path-builder';
import { TAG } from '../tags';
import { Schemas } from '../schema-registry';

/**
 * Registers the four ScraperConfig CRUD endpoints. All routes are
 * `SUPER_ADMIN`-only — see `scraper-config.controller.ts` for the matching
 * `@httpPost`/`@httpGet`/`@httpPut` decorators.
 */
export function registerScraperConfigsPaths(registry: OpenAPIRegistry): void {
  endpoint('post', '/api/revolicos/scraper-configs')
    .tag(TAG.SCRAPING)
    .summary('Create a ScraperConfig')
    .description('Persists a new JSONata expression under a unique storeKey. SUPER_ADMIN only.')
    .operationId('createScraperConfig')
    .security('bearerAuth')
    .requestBody(Schemas.ScraperConfigCreateDTO)
    .response(201, 'ScraperConfig created', z.object({ config: Schemas.ScraperConfigResponseDTO }))
    .errors(400, 401, 403, 409)
    .register(registry);

  endpoint('get', '/api/revolicos/scraper-configs')
    .tag(TAG.SCRAPING)
    .summary('List all ScraperConfigs')
    .description('Returns every row (enabled and disabled), sorted by storeKey.')
    .operationId('listScraperConfigs')
    .security('bearerAuth')
    .response(200, 'ScraperConfigs list', z.object({ configs: z.array(Schemas.ScraperConfigResponseDTO) }))
    .errors(401, 403)
    .register(registry);

  endpoint('get', '/api/revolicos/scraper-configs/{storeKey}')
    .tag(TAG.SCRAPING)
    .summary('Fetch a ScraperConfig by storeKey')
    .operationId('getScraperConfig')
    .security('bearerAuth')
    .pathParamString('storeKey', 'Logical ScraperConfig key', '^[^/]+$')
    .response(200, 'ScraperConfig found', z.object({ config: Schemas.ScraperConfigResponseDTO }))
    .errors(401, 403, 404)
    .register(registry);

  endpoint('put', '/api/revolicos/scraper-configs/{storeKey}')
    .tag(TAG.SCRAPING)
    .summary('Update a ScraperConfig expression')
    .description('Replaces the expression and invalidates the worker registry cache.')
    .operationId('updateScraperConfig')
    .security('bearerAuth')
    .pathParamString('storeKey', 'Logical ScraperConfig key', '^[^/]+$')
    .requestBody(Schemas.ScraperConfigUpdateDTO)
    .response(200, 'ScraperConfig updated', z.object({ config: Schemas.ScraperConfigResponseDTO }))
    .errors(400, 401, 403, 404)
    .register(registry);
}
