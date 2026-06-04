/**
 * Integration tests for Account registration endpoints
 * Tests both local (email/password) and provider-based registration flows
 */
// Avoid importing ESM 'jose' via ProviderTokenVerifier during tests
jest.mock('@shared/security/provider-token-verifier', () => ({
  ProviderTokenVerifier: jest.fn().mockImplementation(() => ({
    verifyProvider: jest.fn().mockResolvedValue({
      providerId: 'prov-1',
      email: 'provideruser@example.com',
      email_verified: true,
      name: 'Provider User',
      picture: null,
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
let testAccountId: string;

beforeAll(async () => {
  app = await new App().setup();
  pgDb = container.get<PgDBContext>(TYPES.TenantDB);
  await pgDb.dbConnect();

  // Create a test account
  testAccountId = uuidv4();
  await pgDb.query(
    `INSERT INTO public.account (id, name, created_at, updated_at) 
     VALUES ($1, $2, NOW(), NOW()) 
     ON CONFLICT (id) DO NOTHING`,
    [testAccountId, 'Test Account'],
  );
});

afterAll(async () => {
  // Clean up test data
  try {
    await pgDb.query('DELETE FROM public.user_identity WHERE account_id = $1', [testAccountId]);
    await pgDb.query('DELETE FROM public."user" WHERE account_id = $1', [testAccountId]);
    await pgDb.query('DELETE FROM public.account WHERE id = $1', [testAccountId]);
  } catch (err) {
    console.error('Error cleaning up test data:', err);
  }
});

describe('POST /api/accounts/register/local', () => {
  const validLocalRegisterPayload = {
    email: 'newuser@example.com',
    username: 'newuser',
    password: 'SecurePass123',
    accountId: testAccountId,
    displayName: 'New User',
  };

  it('should successfully register a new user with local credentials', async () => {
    const res = await request(app).post('/api/accounts/register/local').send(validLocalRegisterPayload);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('user');
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.email).toBe(validLocalRegisterPayload.email);
    expect(res.body.user.username).toBe(validLocalRegisterPayload.username);
    expect(res.body.user.displayName).toBe(validLocalRegisterPayload.displayName);
    expect(res.body.user.accountId).toBe(testAccountId);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.token.length).toBeGreaterThan(0);
  });

  it('should reject registration with invalid email format', async () => {
    const payload = { ...validLocalRegisterPayload, email: 'invalid-email', username: 'testuser1' };
    const res = await request(app).post('/api/accounts/register/local').send(payload);

    expect(res.status).toBe(400);
  });

  it('should reject registration with password too short', async () => {
    const payload = { ...validLocalRegisterPayload, password: 'Short1', username: 'testuser2' };
    const res = await request(app).post('/api/accounts/register/local').send(payload);

    expect(res.status).toBe(400);
  });

  it('should reject registration with password missing uppercase', async () => {
    const payload = { ...validLocalRegisterPayload, password: 'noupppercase123', username: 'testuser3' };
    const res = await request(app).post('/api/accounts/register/local').send(payload);

    expect(res.status).toBe(400);
  });

  it('should reject registration with password missing lowercase', async () => {
    const payload = { ...validLocalRegisterPayload, password: 'NOLOWERCASE123', username: 'testuser4' };
    const res = await request(app).post('/api/accounts/register/local').send(payload);

    expect(res.status).toBe(400);
  });

  it('should reject registration with password missing number', async () => {
    const payload = { ...validLocalRegisterPayload, password: 'NoNumbers', username: 'testuser5' };
    const res = await request(app).post('/api/accounts/register/local').send(payload);

    expect(res.status).toBe(400);
  });

  it('should reject registration with username too short', async () => {
    const payload = { ...validLocalRegisterPayload, username: 'ab', email: 'shortusername@example.com' };
    const res = await request(app).post('/api/accounts/register/local').send(payload);

    expect(res.status).toBe(400);
  });

  it('should reject registration with duplicate email', async () => {
    const payload = { ...validLocalRegisterPayload, username: 'uniqueuser1' };

    // First registration should succeed
    const res1 = await request(app).post('/api/accounts/register/local').send(payload);
    expect(res1.status).toBe(201);

    // Second registration with same email should fail
    const res2 = await request(app)
      .post('/api/accounts/register/local')
      .send({
        ...payload,
        username: 'differentusername',
      });
    expect(res2.status).toBe(409);
  });

  it('should reject registration with duplicate username', async () => {
    const payload = { ...validLocalRegisterPayload, username: 'duplicateuser', email: 'firstuser@example.com' };

    // First registration should succeed
    const res1 = await request(app).post('/api/accounts/register/local').send(payload);
    expect(res1.status).toBe(201);

    // Second registration with same username should fail
    const res2 = await request(app)
      .post('/api/accounts/register/local')
      .send({
        ...payload,
        email: 'seconduser@example.com',
      });
    expect(res2.status).toBe(409);
  });

  it('should reject registration with non-existent account', async () => {
    const invalidAccountId = uuidv4();
    const payload = { ...validLocalRegisterPayload, accountId: invalidAccountId, username: 'usernonexistent' };

    const res = await request(app).post('/api/accounts/register/local').send(payload);
    expect(res.status).toBe(404);
  });

  it('should normalize email to lowercase', async () => {
    const payload = {
      ...validLocalRegisterPayload,
      email: 'MixedCase@EXAMPLE.COM',
      username: 'lowercaseemail',
    };

    const res = await request(app).post('/api/accounts/register/local').send(payload);
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('mixedcase@example.com');
  });

  it('should normalize username to lowercase', async () => {
    const payload = {
      ...validLocalRegisterPayload,
      email: 'mixedcaseuser@example.com',
      username: 'MixedCaseUsername',
    };

    const res = await request(app).post('/api/accounts/register/local').send(payload);
    expect(res.status).toBe(201);
    expect(res.body.user.username).toBe('mixedcaseusername');
  });

  it('should require accountId in request body', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { accountId, ...payload } = validLocalRegisterPayload;

    const res = await request(app).post('/api/accounts/register/local').send(payload);
    expect(res.status).toBe(400);
  });
});

describe('POST /api/accounts/register/provider', () => {
  const validProviderRegisterPayload = {
    email: 'provideruser@example.com',
    username: 'provideruser',
    provider: 'GOOGLE',
    providerId: 'google-123456',
    accountId: testAccountId,
    displayName: 'Provider User',
    idToken: 'valid-id-token',
    accessToken: 'valid-access-token',
  };

  it('should successfully register a new user with provider credentials', async () => {
    const res = await request(app).post('/api/accounts/register/provider').send(validProviderRegisterPayload);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('user');
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.email).toBe(validProviderRegisterPayload.email);
    expect(res.body.user.username).toBe(validProviderRegisterPayload.username);
    expect(res.body.user.displayName).toBe(validProviderRegisterPayload.displayName);
    expect(res.body.user.accountId).toBe(testAccountId);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.token.length).toBeGreaterThan(0);
  });

  it('should reject registration with invalid email format', async () => {
    const payload = { ...validProviderRegisterPayload, email: 'invalid-email', username: 'providertest1' };
    const res = await request(app).post('/api/accounts/register/provider').send(payload);

    expect(res.status).toBe(400);
  });

  it('should reject registration with username too short', async () => {
    const payload = { ...validProviderRegisterPayload, username: 'ab', email: 'providertest2@example.com' };
    const res = await request(app).post('/api/accounts/register/provider').send(payload);

    expect(res.status).toBe(400);
  });

  it('should reject registration with invalid provider', async () => {
    const payload = { ...validProviderRegisterPayload, provider: 'INVALID_PROVIDER', username: 'providertest3' };
    const res = await request(app).post('/api/accounts/register/provider').send(payload);

    expect(res.status).toBe(400);
  });

  it('should reject registration with missing providerId', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { providerId, ...payload } = { ...validProviderRegisterPayload, username: 'providertest4' };

    const res = await request(app).post('/api/accounts/register/provider').send(payload);
    expect(res.status).toBe(400);
  });

  it('should reject registration with duplicate email across providers', async () => {
    const payload = { ...validProviderRegisterPayload, username: 'providerdupemail', email: 'providerdup@example.com' };

    // First registration should succeed
    const res1 = await request(app).post('/api/accounts/register/provider').send(payload);
    expect(res1.status).toBe(201);

    // Second registration with same email (different provider) should fail
    const res2 = await request(app)
      .post('/api/accounts/register/provider')
      .send({
        ...payload,
        provider: 'GITHUB',
        providerId: 'github-123456',
        username: 'differentprovideruser',
      });
    expect(res2.status).toBe(409);
  });

  it('should reject registration with duplicate username', async () => {
    const payload = {
      ...validProviderRegisterPayload,
      username: 'duplicateprovideruser',
      email: 'providerdupuser1@example.com',
    };

    // First registration should succeed
    const res1 = await request(app).post('/api/accounts/register/provider').send(payload);
    expect(res1.status).toBe(201);

    // Second registration with same username should fail
    const res2 = await request(app)
      .post('/api/accounts/register/provider')
      .send({
        ...payload,
        email: 'providerdupuser2@example.com',
        provider: 'GITHUB',
        providerId: 'github-duplicate',
      });
    expect(res2.status).toBe(409);
  });

  it('should normalize email to lowercase', async () => {
    const payload = {
      ...validProviderRegisterPayload,
      email: 'ProvideMixedCase@EXAMPLE.COM',
      username: 'providercase',
    };

    const res = await request(app).post('/api/accounts/register/provider').send(payload);
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('providemixedcase@example.com');
  });

  it('should reject registration with non-existent account', async () => {
    const invalidAccountId = uuidv4();
    const payload = { ...validProviderRegisterPayload, accountId: invalidAccountId, username: 'providernonexistent' };

    const res = await request(app).post('/api/accounts/register/provider').send(payload);
    expect(res.status).toBe(404);
  });

  it('should require accountId in request body', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { accountId, ...payload } = validProviderRegisterPayload;

    const res = await request(app).post('/api/accounts/register/provider').send(payload);
    expect(res.status).toBe(400);
  });

  it('should allow optional displayName and avatarUrl', async () => {
    const payload = {
      email: 'provideroptional@example.com',
      username: 'provideroptional',
      provider: 'GOOGLE',
      providerId: 'google-optional',
      accountId: testAccountId,
      idToken: 'valid-id-token',
      accessToken: 'valid-access-token',
      // displayName and avatarUrl are optional
    };

    const res = await request(app).post('/api/accounts/register/provider').send(payload);
    expect(res.status).toBe(201);
    expect(res.body.user).toBeDefined();
  });
});
