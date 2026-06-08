import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { endpoint } from '../helpers/path-builder';
import { TAG } from '../tags';
import { Schemas } from '../schema-registry';

export function registerUsersPaths(registry: OpenAPIRegistry): void {
  endpoint('get', '/api/users')
    .tag(TAG.USERS)
    .summary('List users in the current tenant')
    .operationId('listUsers')
    .security('bearerAuth')
    .response(200, 'List of users', z.object({ users: z.array(Schemas.UserDTO) }))
    .errors(401, 403)
    .register(registry);

  endpoint('get', '/api/users/{id}')
    .tag(TAG.USERS)
    .summary('Get user by ID')
    .operationId('getUser')
    .security('bearerAuth')
    .pathParam('id', 'User ID')
    .response(200, 'User found', z.object({ user: Schemas.UserDTO }))
    .errors(401, 404)
    .register(registry);

  endpoint('put', '/api/users/{id}')
    .tag(TAG.USERS)
    .summary('Update a user')
    .operationId('updateUser')
    .security('bearerAuth')
    .pathParam('id', 'User ID')
    .requestBody(Schemas.UserDTO)
    .response(200, 'User updated', z.object({ user: Schemas.UserDTO }))
    .errors(400, 401, 403, 404)
    .register(registry);

  endpoint('delete', '/api/users/{id}')
    .tag(TAG.USERS)
    .summary('Delete a user')
    .operationId('deleteUser')
    .security('bearerAuth')
    .pathParam('id', 'User ID')
    .response204('User deleted')
    .errors(401, 403, 404)
    .register(registry);
}
