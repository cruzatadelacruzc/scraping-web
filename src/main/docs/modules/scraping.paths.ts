import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { endpoint } from '../helpers/path-builder';
import { TAG } from '../tags';
import { Schemas } from '../schema-registry';

export function registerScrapingPaths(registry: OpenAPIRegistry): void {
  endpoint('post', '/api/revolicos/scraping/jobs')
    .tag(TAG.SCRAPING)
    .summary('Create a product scraping job')
    .description('Enqueues a background job to scrape products from Revolico. Requires SUPER_ADMIN role.')
    .operationId('createScrapingJob')
    .security('bearerAuth')
    .requestBody(Schemas.ScrapingProductsDTO)
    .response(
      201,
      'Scraping job created',
      z.object({
        jobId: z.string().openapi({ description: 'Bull queue job ID', example: '12345' }),
      }),
    )
    .errors(400, 401, 403)
    .register(registry);
}
