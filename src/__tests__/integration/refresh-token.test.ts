/**
 * Integration tests for POST /api/auth/refresh
 *
 * Prerequisites: docker-compose up -d postgres (for real Postgres)
 */
jest.mock('@shared/security/provider-token-verifier');

import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { App } from '../../main/app';
import { container } from '@shared/container';
import { TYPES } from '@shared/types.container';
import { PgDBContext } from '@config/pg-db';
import { TokenManagementService } from '@users/services/token-management.service';

let app: any;
let appInstance: App;
let pgDb: PgDBContext;
let tokenMgmt: TokenManagementService;

const testAccountId = uuidv4();
const testUserId = uuidv4();
const testRoleId = uuidv4();
const testUsername = `refreshtest_${Date.now()}`;
const testEmail = `refresh_${Date.now()}@test.com`;

beforeAll(async () => {
  appInstance = new App();
  app = await appInstance.setup();
  pgDb = container.get<PgDBContext>(TYPES.TenantDB);
  tokenMgmt = container.get<TokenManagementService>(TYPES.TokenManagementService);

  // Create test data in the correct order (FK constraints)
  await pgDb.query(
    `INSERT INTO public."Account" ("id", "name", "createdAt", "updatedAt")
     VALUES ($1, $2, NOW(), NOW())
     ON CONFLICT ("id") DO NOTHING`,
    [testAccountId, 'Refresh Test Account'],
  );

  await pgDb.query(
    `INSERT INTO public."Role" ("id", "name", "accountId")
     VALUES ($1, $2, $3)
     ON CONFLICT DO NOTHING`,
    [testRoleId, 'ACCOUNT_OWNER', testAccountId],
  );

  await pgDb.query(
    `INSERT INTO public."User" ("id", "accountId", "username", "email", "passwordHash", "displayName", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
     ON CONFLICT ("id") DO NOTHING`,
    [testUserId, testAccountId, testUsername, testEmail, 'some-hashed-password', 'Refresh Test User'],
  );

  // Link user to role (implicit M:N junction table)
  await pgDb.query(
    `INSERT INTO public."_UserRoles" ("A", "B")
     VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [testRoleId, testUserId],
  );
});

afterAll(async () => {
  // Clean up in reverse FK order
  try {
    await pgDb.query(`DELETE FROM public."RefreshToken" WHERE "userId" = $1`, [testUserId]);
    await pgDb.query(`DELETE FROM public."_UserRoles" WHERE "B" = $1`, [testUserId]);
    await pgDb.query(`DELETE FROM public."User" WHERE "id" = $1`, [testUserId]);
    await pgDb.query(`DELETE FROM public."Role" WHERE "id" = $1`, [testRoleId]);
    await pgDb.query(`DELETE FROM public."Account" WHERE "id" = $1`, [testAccountId]);
  } catch (err) {
    console.error('Error cleaning up test data:', err);
  }

  await appInstance.close();
});

describe('POST /api/auth/refresh', () => {
  let rawRefreshToken: string;

  beforeAll(async () => {
    // Issue a fresh refresh token to use in tests
    rawRefreshToken = await tokenMgmt.issueRefreshToken(testUserId);
  });

  afterAll(async () => {
    // Clean up any tokens created during tests
    try {
      await pgDb.query(`DELETE FROM public."RefreshToken" WHERE "userId" = $1`, [testUserId]);
    } catch {
      // best-effort
    }
  });

  it('should return 200 with token, refreshToken, and user for a valid refresh token', async () => {
    const res = await request(app).post('/api/auth/refresh').send({ refreshToken: rawRefreshToken });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data).toHaveProperty('refreshToken');
    expect(res.body.data).toHaveProperty('user');
    expect(typeof res.body.data.token).toBe('string');
    expect(res.body.data.token.length).toBeGreaterThan(0);
    expect(typeof res.body.data.refreshToken).toBe('string');
    expect(res.body.data.refreshToken.length).toBeGreaterThan(0);
    expect(res.body.data.user).toHaveProperty('id', testUserId);
    expect(res.body.data.user).toHaveProperty('email', testEmail);
    expect(res.body.data.user).toHaveProperty('username', testUsername);
    expect(res.body.data.user).toHaveProperty('accountId', testAccountId);
  });

  it('should return 400 for an invalid refresh token', async () => {
    const res = await request(app).post('/api/auth/refresh').send({ refreshToken: 'this-is-a-completely-invalid-token-value' });

    expect(res.status).toBe(400);
  });

  it('should return 400 when refresh token is missing from the request body', async () => {
    const res = await request(app).post('/api/auth/refresh').send({});

    expect(res.status).toBe(400);
  });

  it('should return 400 for an already-used refresh token (theft detection)', async () => {
    // Issue a dedicated token for this test case
    const freshToken = await tokenMgmt.issueRefreshToken(testUserId);

    // Use it once via the endpoint — this rotates it (old token marked as replaced)
    const firstUse = await request(app).post('/api/auth/refresh').send({ refreshToken: freshToken });
    expect(firstUse.status).toBe(200);

    // Reuse the same (now-consumed) token — this should trigger theft detection
    const secondUse = await request(app).post('/api/auth/refresh').send({ refreshToken: freshToken });
    expect(secondUse.status).toBe(400);
  });
});
