import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { endpoint } from '../helpers/path-builder';
import { TAG } from '../tags';
import { Schemas } from '../schema-registry';

const TokenResponse = z.object({
  user: z.unknown(),
  token: z.string(),
});

export function registerAccountsPaths(registry: OpenAPIRegistry): void {
  endpoint('post', '/api/accounts')
    .tag(TAG.ACCOUNTS)
    .summary('Create a new account')
    .operationId('createAccount')
    .requestBody(Schemas.AccountDTO)
    .response(201, 'Account created', z.object({ account: Schemas.AccountDTO }))
    .errors(400)
    .register(registry);

  endpoint('get', '/api/accounts')
    .tag(TAG.ACCOUNTS)
    .summary('List all accounts')
    .operationId('listAccounts')
    .security('bearerAuth')
    .response(200, 'List of accounts', z.object({ accounts: z.array(Schemas.AccountDTO) }))
    .errors(401, 403)
    .register(registry);

  endpoint('get', '/api/accounts/{id}')
    .tag(TAG.ACCOUNTS)
    .summary('Get account by ID')
    .operationId('getAccount')
    .security('bearerAuth')
    .pathParam('id', 'Account ID')
    .response(200, 'Account found', z.object({ account: Schemas.AccountDTO }))
    .errors(401, 404)
    .register(registry);

  endpoint('put', '/api/accounts/{id}')
    .tag(TAG.ACCOUNTS)
    .summary('Update an account')
    .operationId('updateAccount')
    .security('bearerAuth')
    .pathParam('id', 'Account ID')
    .requestBody(Schemas.AccountDTO)
    .response(200, 'Account updated', z.object({ account: Schemas.AccountDTO }))
    .errors(400, 401, 403)
    .register(registry);

  endpoint('delete', '/api/accounts/{id}')
    .tag(TAG.ACCOUNTS)
    .summary('Delete an account')
    .operationId('deleteAccount')
    .security('bearerAuth')
    .pathParam('id', 'Account ID')
    .response204('Account deleted')
    .errors(401, 403)
    .register(registry);

  endpoint('post', '/api/accounts/register/local')
    .tag(TAG.ACCOUNTS)
    .summary('Register a new user with local credentials')
    .description('Creates a user account with email/password authentication within an existing account.')
    .operationId('registerLocal')
    .requestBody(Schemas.UserRegisterDTO)
    .response(200, 'User registered successfully', TokenResponse)
    .errors(400)
    .register(registry);

  endpoint('post', '/api/accounts/register/provider')
    .tag(TAG.ACCOUNTS)
    .summary('Register or login with an OAuth provider')
    .description('Authenticates a user via OAuth provider (google, facebook). Creates the user if they do not exist.')
    .operationId('registerProvider')
    .requestBody(Schemas.ProviderRegistrationDTO)
    .response(200, 'User authenticated via provider', TokenResponse)
    .errors(400, 401)
    .register(registry);
}
