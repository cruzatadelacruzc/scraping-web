import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { endpoint } from '../helpers/path-builder';
import { TAG } from '../tags';
import { Schemas } from '../schema-registry';

export function registerAdminPaths(registry: OpenAPIRegistry): void {
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
}
