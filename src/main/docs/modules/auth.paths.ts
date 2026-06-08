import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { endpoint } from '../helpers/path-builder';
import { TAG } from '../tags';
import { Schemas } from '../schema-registry';

const AuthResponseSchema = z.object({
  user: z.unknown().openapi({ description: 'Authenticated user object' }),
  token: z.string().openapi({ description: 'JWT access token', example: 'eyJhbGciOiJIUzI1NiIs...' }),
});

export function registerAuthPaths(registry: OpenAPIRegistry): void {
  const AuthResponse = registry.register('AuthResponseDTO', AuthResponseSchema);

  endpoint('post', '/api/auth/login')
    .tag(TAG.AUTH)
    .summary('Login with username and password')
    .operationId('login')
    .requestBody(Schemas.UserLoginDTO)
    .response(200, 'Successful login with JWT token', AuthResponse)
    .errors(400, 401)
    .register(registry);
}
