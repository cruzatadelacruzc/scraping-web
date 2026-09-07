import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { endpoint } from '../helpers/path-builder';
import { TAG } from '../tags';
import { Schemas } from '../schema-registry';

export function registerProductsPaths(registry: OpenAPIRegistry): void {
  endpoint('get', '/api/products')
    .tag(TAG.PRODUCTS)
    .summary('Search the product catalog')
    .description('Paginated catalog search for ACCOUNT_OWNER users. Product data is shared across tenants.')
    .operationId('searchCatalogProducts')
    .security('bearerAuth')
    .queryParam('search', z.string().optional(), 'Case-insensitive text search on description')
    .queryParam('category', z.string().optional(), 'Exact category filter')
    .queryParam('subcategory', z.string().optional(), 'Exact subcategory filter')
    .queryParam('minPrice', z.number().optional(), 'Minimum price (inclusive)')
    .queryParam('maxPrice', z.number().optional(), 'Maximum price (inclusive)')
    .queryParam('skip', z.number().optional(), 'Items to skip (default 0)')
    .queryParam('limit', z.number().optional(), 'Page size (default 20, max 50)')
    .queryParam('sort', z.enum(['createdAt', 'price', 'views']).optional(), 'Sort field')
    .queryParam('order', z.enum(['asc', 'desc']).optional(), 'Sort direction')
    .response(
      200,
      'Paginated catalog items',
      z.object({
        data: z.array(Schemas.ProductCatalogItemDTO),
        meta: z.object({
          total: z.number(),
          skip: z.number(),
          limit: z.number(),
          hasMore: z.boolean(),
        }),
      }),
    )
    .errors(400, 401, 403)
    .register(registry);

  endpoint('get', '/api/products/categories')
    .tag(TAG.PRODUCTS)
    .summary('List catalog categories')
    .operationId('listCatalogCategories')
    .security('bearerAuth')
    .response(200, 'Category groups', z.array(Schemas.ProductCategoryGroupDTO))
    .errors(401, 403)
    .register(registry);
}
