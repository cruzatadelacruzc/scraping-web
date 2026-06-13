/**
 * Integration tests for Account registration endpoints
 * Tests both local (email/password) and provider-based registration flows
 */
// Avoid importing ESM 'jose' via ProviderTokenVerifier during tests
jest.mock('@shared/security/provider-token-verifier', () => ({
  ProviderTokenVerifier: jest.fn().mockImplementation(() => ({
    verifyProvider: jest.fn().mockImplementation((_provider: string, opts: { idToken?: string; accessToken?: string }) => {
      // Return dynamic claims — email and providerId derive from the idToken so each request
      // gets a unique identity (otherwise the first registration would be returned by all later ones)
      const email = opts.idToken || 'provideruser@example.com';
      const providerId = opts.idToken ? `prov-${opts.idToken}` : 'prov-1';
      return Promise.resolve({
        providerId,
        email,
        email_verified: true,
        name: 'Provider User',
        picture: null,
      });
    }),
  })),
}));

import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { App } from '../../main/app';
import { container } from '@shared/container';
import { TYPES } from '@shared/types.container';
import { PgDBContext } from '@config/pg-db';

let app: any;
let pgDb: PgDBContext;
const testAccountId = uuidv4();

beforeAll(async () => {
  app = await new App().setup();
  pgDb = container.get<PgDBContext>(TYPES.TenantDB);
  await pgDb.dbConnect();

  // Clean up orphaned data from previous test runs before creating fresh account
  await pgDb.query('DELETE FROM public."UserIdentity"');
  await pgDb.query('DELETE FROM public."User"');
  await pgDb.query('DELETE FROM public."Account"');

  // Create a test account
  await pgDb.query(
    `INSERT INTO public."Account" ("id", "name", "createdAt", "updatedAt")
     VALUES ($1, $2, NOW(), NOW())
     ON CONFLICT ("id") DO NOTHING`,
    [testAccountId, 'Test Account'],
  );
});

afterAll(async () => {
  // Clean up test data
  try {
    // UserIdentity has ON DELETE RESTRICT, so delete it first
    await pgDb.query('DELETE FROM public."UserIdentity" WHERE "userId" IN (SELECT "id" FROM public."User" WHERE "accountId" = $1)', [
      testAccountId,
    ]);
    await pgDb.query('DELETE FROM public."User" WHERE "accountId" = $1', [testAccountId]);
    await pgDb.query('DELETE FROM public."Account" WHERE "id" = $1', [testAccountId]);
  } catch (err) {
    console.error('Error cleaning up test data:', err);
  }
});

describe('POST /api/accounts/register/local', () => {
  const makePayload = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
    email: 'newuser@example.com',
    username: 'newuser',
    password: 'SecurePass123',
    accountId: testAccountId,
    displayName: 'New User',
    ...overrides,
  });

  it('should successfully register a new user with local credentials', async () => {
    const res = await request(app)
      .post('/api/accounts/register/local')
      .send(makePayload({ email: 'successlocal@example.com', username: 'successlocal' }));

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('user');
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data.user.email).toBe('successlocal@example.com');
    expect(res.body.data.user.username).toBe('successlocal');
    expect(res.body.data.user.displayName).toBe('New User');
    expect(res.body.data.user.accountId).toBe(testAccountId);
    expect(typeof res.body.data.token).toBe('string');
    expect(res.body.data.token.length).toBeGreaterThan(0);
  });

  it('should reject registration with invalid email format', async () => {
    const res = await request(app)
      .post('/api/accounts/register/local')
      .send(makePayload({ email: 'invalid-email', username: 'testuser1' }));

    expect(res.status).toBe(400);
  });

  it('should reject registration with password too short', async () => {
    const res = await request(app)
      .post('/api/accounts/register/local')
      .send(makePayload({ password: 'Short1', username: 'testuser2' }));

    expect(res.status).toBe(400);
  });

  it('should reject registration with password missing uppercase', async () => {
    const res = await request(app)
      .post('/api/accounts/register/local')
      .send(makePayload({ password: 'noupppercase123', username: 'testuser3' }));

    expect(res.status).toBe(400);
  });

  it('should reject registration with password missing lowercase', async () => {
    const res = await request(app)
      .post('/api/accounts/register/local')
      .send(makePayload({ password: 'NOLOWERCASE123', username: 'testuser4' }));

    expect(res.status).toBe(400);
  });

  it('should reject registration with password missing number', async () => {
    const res = await request(app)
      .post('/api/accounts/register/local')
      .send(makePayload({ password: 'NoNumbers', username: 'testuser5' }));

    expect(res.status).toBe(400);
  });

  it('should reject registration with username too short', async () => {
    const res = await request(app)
      .post('/api/accounts/register/local')
      .send(makePayload({ username: 'ab', email: 'shortusername@example.com' }));

    expect(res.status).toBe(400);
  });

  it('should reject registration with duplicate email', async () => {
    const email = 'dupemailtest@example.com';

    // First registration should succeed
    const res1 = await request(app)
      .post('/api/accounts/register/local')
      .send(makePayload({ email, username: 'uniqueuser1' }));
    expect(res1.status).toBe(201);

    // Second registration with same email should fail
    const res2 = await request(app)
      .post('/api/accounts/register/local')
      .send(makePayload({ email, username: 'differentusername' }));
    expect(res2.status).toBe(409);
  });

  it('should reject registration with duplicate username', async () => {
    const username = 'dupusercheck';

    // First registration should succeed
    const res1 = await request(app)
      .post('/api/accounts/register/local')
      .send(makePayload({ username, email: 'firstuser@example.com' }));
    expect(res1.status).toBe(201);

    // Second registration with same username should fail
    const res2 = await request(app)
      .post('/api/accounts/register/local')
      .send(makePayload({ username, email: 'seconduser@example.com' }));
    expect(res2.status).toBe(409);
  });

  it('should reject registration with non-existent account', async () => {
    const invalidAccountId = uuidv4();
    const res = await request(app)
      .post('/api/accounts/register/local')
      .send(makePayload({ accountId: invalidAccountId, username: 'usernonexistent' }));

    expect(res.status).toBe(404);
  });

  it('should normalize email to lowercase', async () => {
    const res = await request(app)
      .post('/api/accounts/register/local')
      .send(makePayload({ email: 'MixedCase@EXAMPLE.COM', username: 'lowercaseemail' }));

    expect(res.status).toBe(201);
    expect(res.body.data.user.email).toBe('mixedcase@example.com');
  });

  it('should normalize username to lowercase', async () => {
    const res = await request(app)
      .post('/api/accounts/register/local')
      .send(makePayload({ email: 'mixedcaseuser@example.com', username: 'MixedCaseUsername' }));

    expect(res.status).toBe(201);
    expect(res.body.data.user.username).toBe('mixedcaseusername');
  });

  it('should require accountId in request body', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { accountId, ...payload } = makePayload();

    const res = await request(app).post('/api/accounts/register/local').send(payload);
    expect(res.status).toBe(400);
  });
});

describe('POST /api/accounts/register/provider', () => {
  const makeProviderPayload = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
    email: 'provideruser@example.com',
    username: 'provideruser',
    provider: 'google',
    providerId: 'google-123456',
    accountId: testAccountId,
    displayName: 'Provider User',
    idToken: 'valid-id-token',
    accessToken: 'valid-access-token',
    ...overrides,
  });

  it('should successfully register a new user with provider credentials', async () => {
    const res = await request(app)
      .post('/api/accounts/register/provider')
      .send(makeProviderPayload({ email: 'provsuccess@example.com', username: 'provsuccess' }));

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('user');
    expect(res.body.data).toHaveProperty('token');
    // Email comes from provider claims (mock uses idToken as email)
    expect(res.body.data.user.email).toBe('valid-id-token');
    expect(res.body.data.user.username).toBe('provsuccess');
    expect(res.body.data.user.accountId).toBe(testAccountId);
    expect(typeof res.body.data.token).toBe('string');
    expect(res.body.data.token.length).toBeGreaterThan(0);
  });

  it('should reject registration with invalid email format', async () => {
    const res = await request(app)
      .post('/api/accounts/register/provider')
      .send(makeProviderPayload({ email: 'invalid-email', username: 'providertest1' }));

    expect(res.status).toBe(400);
  });

  it('should reject registration with username too short', async () => {
    const res = await request(app)
      .post('/api/accounts/register/provider')
      .send(makeProviderPayload({ username: 'ab', email: 'providertest2@example.com' }));

    expect(res.status).toBe(400);
  });

  it('should reject registration with invalid provider', async () => {
    const res = await request(app)
      .post('/api/accounts/register/provider')
      .send(makeProviderPayload({ provider: 'INVALID_PROVIDER', username: 'providertest3' }));

    expect(res.status).toBe(400);
  });

  it('should reject registration with missing providerId', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { providerId, ...payload } = makeProviderPayload({ username: 'providertest4' });

    const res = await request(app).post('/api/accounts/register/provider').send(payload);
    expect(res.status).toBe(400);
  });

  it('should link existing user by email across providers', async () => {
    const email = 'linktest@example.com';

    // First registration with email from provider
    const res1 = await request(app)
      .post('/api/accounts/register/provider')
      .send(makeProviderPayload({ username: 'linktestuser1', idToken: email }));
    expect(res1.status).toBe(201);
    expect(res1.body.data.user.email).toBe(email);

    // Second registration with same provider email (different provider) should link to existing user.
    // The response is 201 (created) because the controller always returns 201 via ResponseHandler.created;
    // what matters is that the user is linked (same email, not a new one).
    const res2 = await request(app)
      .post('/api/accounts/register/provider')
      .send(
        makeProviderPayload({
          idToken: email,
          provider: 'facebook',
          providerId: 'facebook-123456',
          username: 'linktestuser2',
        }),
      );
    expect(res2.status).toBe(201);
    // Linked to existing user — same email and accountId, not a new user
    expect(res2.body.data.user.email).toBe(email);
  });

  it('should reject registration with duplicate username', async () => {
    const username = 'duplicateprovideruser';

    // First registration with unique email from provider
    const res1 = await request(app)
      .post('/api/accounts/register/provider')
      .send(makeProviderPayload({ username, idToken: 'unique1@test.com' }));
    expect(res1.status).toBe(201);

    // Second registration with same username but different provider email should fail
    const res2 = await request(app)
      .post('/api/accounts/register/provider')
      .send(
        makeProviderPayload({
          username,
          idToken: 'unique2@test.com',
          provider: 'facebook',
          providerId: 'facebook-duplicate',
        }),
      );
    expect(res2.status).toBe(409);
  });

  it('should normalize email to lowercase', async () => {
    const res = await request(app)
      .post('/api/accounts/register/provider')
      .send(
        makeProviderPayload({
          idToken: 'ProvideMixedCase@EXAMPLE.COM',
          username: 'providercase',
        }),
      );

    expect(res.status).toBe(201);
    // Provider email is lowercased by the service
    expect(res.body.data.user.email).toBe('providemixedcase@example.com');
  });

  it('should reject registration with non-existent account', async () => {
    const invalidAccountId = uuidv4();
    const res = await request(app)
      .post('/api/accounts/register/provider')
      .send(makeProviderPayload({ accountId: invalidAccountId, username: 'providernonexistent' }));

    expect(res.status).toBe(404);
  });

  it('should require accountId in request body', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { accountId, ...payload } = makeProviderPayload();

    const res = await request(app).post('/api/accounts/register/provider').send(payload);
    expect(res.status).toBe(400);
  });

  it('should allow optional displayName and avatarUrl', async () => {
    const res = await request(app).post('/api/accounts/register/provider').send({
      email: 'provideroptional@example.com',
      username: 'provideroptional',
      provider: 'google',
      providerId: 'google-optional',
      accountId: testAccountId,
      idToken: 'valid-id-token',
      accessToken: 'valid-access-token',
    });

    expect(res.status).toBe(201);
    expect(res.body.data.user).toBeDefined();
  });
});
