import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { endpoint } from '../helpers/path-builder';
import { TAG } from '../tags';
import { Schemas } from '../schema-registry';

export function registerAdminPaths(registry: OpenAPIRegistry): void {
  // ── Admin Users (existing) ────────────────────────────────────────────
  endpoint('get', '/api/admin/users')
    .tag(TAG.ADMIN)
    .summary('List all users (admin)')
    .operationId('adminListUsers')
    .security('bearerAuth')
    .response(200, 'List of all users', z.object({ users: z.array(Schemas.UserDTO) }))
    .errors(401, 403)
    .register(registry);

  endpoint('delete', '/api/admin/users/{id}')
    .tag(TAG.ADMIN)
    .summary('Delete a user (admin)')
    .operationId('adminDeleteUser')
    .security('bearerAuth')
    .pathParam('id', 'User ID')
    .response204('User deleted')
    .errors(401, 403, 404)
    .register(registry);

  // ── Admin Products ─────────────────────────────────────────────────────
  endpoint('get', '/api/admin/products')
    .tag(TAG.ADMIN_PRODUCTS)
    .summary('List products with pagination and filtering')
    .description('Paginated product list. Filter by category, price range, location, enrichment status, and more.')
    .operationId('adminListProducts')
    .security('bearerAuth')
    .queryParam('skip', z.coerce.number().min(0).default(0), 'Number of items to skip')
    .queryParam('limit', z.coerce.number().min(1).max(100).default(20), 'Max items per page')
    .queryParam('sort', z.string().default('createdAt'), 'Field to sort by')
    .queryParam('order', z.enum(['asc', 'desc']).default('desc'), 'Sort direction')
    .queryParam('category', z.string().optional(), 'Filter by category')
    .queryParam('subcategory', z.string().optional(), 'Filter by subcategory')
    .queryParam('search', z.string().optional(), 'Case-insensitive search on description')
    .queryParam('minPrice', z.coerce.number().optional(), 'Minimum price filter')
    .queryParam('maxPrice', z.coerce.number().optional(), 'Maximum price filter')
    .queryParam('isOutstanding', z.coerce.boolean().optional().openapi({ type: 'boolean' }), 'Filter by outstanding status')
    .queryParam('isPromoted', z.coerce.boolean().optional().openapi({ type: 'boolean' }), 'Filter by promoted status')
    .queryParam('location.state', z.string().optional(), 'Filter by location state')
    .queryParam(
      'hasEnrichment',
      z.coerce.boolean().optional().openapi({ type: 'boolean' }),
      'Filter by enrichment status. true = only enriched products, false = only unenriched.',
    )
    .response(200, 'Paginated list of products', Schemas.PaginatedResponse)
    .errors(401, 403)
    .register(registry);

  endpoint('get', '/api/admin/products/stats')
    .tag(TAG.ADMIN_PRODUCTS)
    .summary('Get product statistics')
    .operationId('adminGetProductStats')
    .security('bearerAuth')
    .response(200, 'Product statistics', Schemas.ProductStatsDTO)
    .errors(401, 403)
    .register(registry);

  endpoint('get', '/api/admin/products/{id}')
    .tag(TAG.ADMIN_PRODUCTS)
    .summary('Get product detail by ID')
    .operationId('adminGetProductById')
    .security('bearerAuth')
    .pathParamString('id', 'Product MongoDB ID', '^[a-f0-9]{24}$')
    .response(200, 'Product detail', Schemas.ProductDetailDTO)
    .errors(401, 403, 404)
    .register(registry);

  // Product history endpoints (price, views, location, outstanding, promoted)
  endpoint('get', '/api/admin/products/{id}/history/price')
    .tag(TAG.ADMIN_PRODUCTS)
    .summary('Get price history for a product')
    .operationId('adminGetProductPriceHistory')
    .security('bearerAuth')
    .pathParamString('id', 'Product MongoDB ID', '^[a-f0-9]{24}$')
    .response(200, 'Price history entries', Schemas.ProductPriceHistoryDTO)
    .errors(401, 403, 404)
    .register(registry);

  endpoint('get', '/api/admin/products/{id}/history/views')
    .tag(TAG.ADMIN_PRODUCTS)
    .summary('Get views history for a product')
    .operationId('adminGetProductViewsHistory')
    .security('bearerAuth')
    .pathParamString('id', 'Product MongoDB ID', '^[a-f0-9]{24}$')
    .response(200, 'Views history entries', Schemas.ProductPriceHistoryDTO)
    .errors(401, 403, 404)
    .register(registry);

  endpoint('get', '/api/admin/products/{id}/history/location')
    .tag(TAG.ADMIN_PRODUCTS)
    .summary('Get location history for a product')
    .operationId('adminGetProductLocationHistory')
    .security('bearerAuth')
    .pathParamString('id', 'Product MongoDB ID', '^[a-f0-9]{24}$')
    .response(200, 'Location history entries', Schemas.ProductPriceHistoryDTO)
    .errors(401, 403, 404)
    .register(registry);

  endpoint('get', '/api/admin/products/{id}/history/outstanding')
    .tag(TAG.ADMIN_PRODUCTS)
    .summary('Get outstanding status history for a product')
    .operationId('adminGetProductOutstandingHistory')
    .security('bearerAuth')
    .pathParamString('id', 'Product MongoDB ID', '^[a-f0-9]{24}$')
    .response(200, 'Outstanding history entries', Schemas.ProductPriceHistoryDTO)
    .errors(401, 403, 404)
    .register(registry);

  endpoint('get', '/api/admin/products/{id}/history/promoted')
    .tag(TAG.ADMIN_PRODUCTS)
    .summary('Get promoted status history for a product')
    .operationId('adminGetProductPromotedHistory')
    .security('bearerAuth')
    .pathParamString('id', 'Product MongoDB ID', '^[a-f0-9]{24}$')
    .response(200, 'Promoted history entries', Schemas.ProductPriceHistoryDTO)
    .errors(401, 403, 404)
    .register(registry);

  endpoint('delete', '/api/admin/products/{id}')
    .tag(TAG.ADMIN_PRODUCTS)
    .summary('Delete a product by ID')
    .operationId('adminDeleteProduct')
    .security('bearerAuth')
    .pathParamString('id', 'Product MongoDB ID', '^[a-f0-9]{24}$')
    .response204('Product deleted')
    .errors(401, 403, 404)
    .register(registry);

  // ── Admin Queues ──────────────────────────────────────────────────────
  endpoint('get', '/api/admin/queues/stats')
    .tag(TAG.ADMIN_QUEUES)
    .summary('Get job counts for all queues')
    .operationId('adminGetAllQueueStats')
    .security('bearerAuth')
    .response(200, 'All queue statistics', z.object({ queues: z.array(Schemas.QueueStatsDTO) }))
    .errors(401, 403)
    .register(registry);

  endpoint('get', '/api/admin/queues/{name}/stats')
    .tag(TAG.ADMIN_QUEUES)
    .summary('Get job counts for a single queue')
    .operationId('adminGetQueueStats')
    .security('bearerAuth')
    .pathParamString('name', 'Queue name (e.g. scraping, notification)')
    .response(200, 'Queue statistics', Schemas.QueueStatsDTO)
    .errors(401, 403, 404)
    .register(registry);

  endpoint('get', '/api/admin/queues/{name}/jobs')
    .tag(TAG.ADMIN_QUEUES)
    .summary('Get recent jobs for a queue')
    .operationId('adminGetRecentJobs')
    .security('bearerAuth')
    .pathParamString('name', 'Queue name (e.g. scraping, notification)')
    .response(200, 'Recent jobs', z.object({ jobs: z.array(Schemas.JobDetailDTO) }))
    .errors(401, 403)
    .register(registry);

  endpoint('get', '/api/admin/queues/{name}/jobs/{id}')
    .tag(TAG.ADMIN_QUEUES)
    .summary('Get full detail for a single job')
    .operationId('adminGetJobDetail')
    .security('bearerAuth')
    .pathParamString('name', 'Queue name (e.g. scraping, notification)')
    .pathParamString('id', 'Job ID')
    .response(200, 'Job detail', Schemas.JobDetailDTO)
    .errors(401, 403, 404)
    .register(registry);

  // ── Admin Dashboard ───────────────────────────────────────────────────
  endpoint('get', '/api/admin/dashboard')
    .tag(TAG.ADMIN_DASHBOARD)
    .summary('Get dashboard metrics')
    .operationId('adminGetDashboardMetrics')
    .security('bearerAuth')
    .response(200, 'Dashboard metrics', Schemas.DashboardMetricsDTO)
    .errors(401, 403)
    .register(registry);

  endpoint('get', '/api/admin/dashboard/health')
    .tag(TAG.ADMIN_DASHBOARD)
    .summary('Get backend health status')
    .operationId('adminGetHealth')
    .security('bearerAuth')
    .response(200, 'Health status', Schemas.HealthResponseDTO)
    .errors(401, 403)
    .register(registry);

  endpoint('get', '/api/admin/dashboard/enrichment')
    .tag(TAG.ADMIN_DASHBOARD)
    .summary('Get enrichment pipeline metrics (cache hit rates, token consumption, cost savings)')
    .operationId('adminGetEnrichmentMetrics')
    .security('bearerAuth')
    .response(200, 'Enrichment metrics', Schemas.EnrichmentMetricsDTO)
    .errors(401, 403)
    .register(registry);

  // ── Admin Accounts ────────────────────────────────────────────────────
  endpoint('get', '/api/admin/accounts')
    .tag(TAG.ADMIN_ACCOUNTS)
    .summary('List all accounts with pagination')
    .operationId('adminListAccounts')
    .security('bearerAuth')
    .response(200, 'Paginated list of accounts', Schemas.PaginatedResponse)
    .errors(401, 403)
    .register(registry);

  endpoint('get', '/api/admin/accounts/{id}')
    .tag(TAG.ADMIN_ACCOUNTS)
    .summary('Get account detail by ID')
    .operationId('adminGetAccountById')
    .security('bearerAuth')
    .pathParam('id', 'Account ID')
    .response(200, 'Account detail', z.object({ account: Schemas.AccountDTO }))
    .errors(401, 403, 404)
    .register(registry);

  endpoint('put', '/api/admin/accounts/{id}')
    .tag(TAG.ADMIN_ACCOUNTS)
    .summary('Update an account by ID')
    .operationId('adminUpdateAccount')
    .security('bearerAuth')
    .pathParam('id', 'Account ID')
    .requestBody(z.object({ name: z.string().optional(), settings: z.record(z.unknown()).optional() }), 'Account update data')
    .response(200, 'Account updated', z.object({ account: Schemas.AccountDTO }))
    .errors(400, 401, 403, 404)
    .register(registry);

  endpoint('delete', '/api/admin/accounts/{id}')
    .tag(TAG.ADMIN_ACCOUNTS)
    .summary('Delete an account by ID')
    .operationId('adminDeleteAccount')
    .security('bearerAuth')
    .pathParam('id', 'Account ID')
    .response204('Account deleted')
    .errors(401, 403, 404)
    .register(registry);

  // ── Admin Roles ───────────────────────────────────────────────────────
  endpoint('get', '/api/admin/roles')
    .tag(TAG.ADMIN_ROLES)
    .summary('List all roles with user counts')
    .operationId('adminListRoles')
    .security('bearerAuth')
    .response(200, 'List of roles', z.object({ roles: z.array(Schemas.RoleResponseDTO) }))
    .errors(401, 403)
    .register(registry);

  endpoint('post', '/api/admin/roles')
    .tag(TAG.ADMIN_ROLES)
    .summary('Create a new role')
    .operationId('adminCreateRole')
    .security('bearerAuth')
    .requestBody(Schemas.CreateRoleDTO, 'Role creation data')
    .response(201, 'Role created', Schemas.RoleResponseDTO)
    .errors(400, 401, 403)
    .register(registry);

  endpoint('delete', '/api/admin/roles/{id}')
    .tag(TAG.ADMIN_ROLES)
    .summary('Delete a role by ID')
    .operationId('adminDeleteRole')
    .security('bearerAuth')
    .pathParam('id', 'Role ID')
    .response204('Role deleted')
    .errors(401, 403, 404)
    .register(registry);

  // ── Admin User-Role Management ────────────────────────────────────────
  endpoint('post', '/api/admin/users/{userId}/roles/{roleId}')
    .tag(TAG.ADMIN_ROLES)
    .summary('Assign a role to a user')
    .operationId('adminAssignRoleToUser')
    .security('bearerAuth')
    .pathParam('userId', 'User ID')
    .pathParam('roleId', 'Role ID')
    .response(200, 'Role assigned', z.object({ message: z.string() }))
    .errors(400, 401, 403, 404)
    .register(registry);

  endpoint('delete', '/api/admin/users/{userId}/roles/{roleId}')
    .tag(TAG.ADMIN_ROLES)
    .summary('Unassign a role from a user')
    .operationId('adminUnassignRoleFromUser')
    .security('bearerAuth')
    .pathParam('userId', 'User ID')
    .pathParam('roleId', 'Role ID')
    .response(200, 'Role unassigned', z.object({ message: z.string() }))
    .errors(400, 401, 403, 404)
    .register(registry);
}
