import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { endpoint } from '../helpers/path-builder';
import { TAG } from '../tags';
import { Schemas } from '../schema-registry';

export function registerAuthPaths(registry: OpenAPIRegistry): void {
  endpoint('post', '/api/auth/login')
    .tag(TAG.AUTH)
    .summary('Login with username and password')
    .operationId('login')
    .requestBody(Schemas.UserLoginDTO)
    .response(200, 'Successful login with JWT and refresh tokens', Schemas.AuthResponseWithRefreshDTO)
    .errors(400, 401)
    .register(registry);
}
