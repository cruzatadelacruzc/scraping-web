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
import { QueueContext } from '@shared/queue/queue-context';

let app: any;
let appInstance: App;
let pgDb: PgDBContext;
let testAccountId: string;
let ownerToken: string;

beforeAll(async () => {
  appInstance = new App();
  app = await appInstance.setup();
  pgDb = container.get<PgDBContext>(TYPES.TenantDB);
  await pgDb.dbConnect();

  // Stub the queue context's enqueue to avoid any side effects from the
  // active adapter (real Redis roundtrips with BullMQ, or in-memory
  // processing with the mock). We only validate authorization here, not
  // queue mechanics.
  const qContext = container.get(QueueContext);
  jest.spyOn(qContext, 'enqueue').mockResolvedValue('mock-job-id-1');

  // Clean up orphaned data from previous test runs before creating fresh account.
  // Order matters: child tables with FK constraints must be deleted first.
  // Bot tables may not exist yet if migrations haven't been applied.
  try {
    await pgDb.query('DELETE FROM public.bot_link_audit');
    await pgDb.query('DELETE FROM public.bot_link_codes');
    await pgDb.query('DELETE FROM public.bot_conversations');
  } catch {
    /* tables may not exist yet */
  }
  await pgDb.query('DELETE FROM public."UserIdentity" WHERE "userId" IN (SELECT "id" FROM public."User" WHERE "username" LIKE $1)', [
    'catalog_authz_%',
  ]);
  await pgDb.query('DELETE FROM public."User" WHERE "username" LIKE $1', ['catalog_authz_%']);
  await pgDb.query('DELETE FROM public."Account" WHERE "name" = $1', ['Product Catalog Authz Test Account']);

  // Create test account
  testAccountId = uuidv4();
  await pgDb.query(
    `INSERT INTO public."Account" ("id", "name", "createdAt", "updatedAt") VALUES ($1, $2, NOW(), NOW()) ON CONFLICT ("id") DO NOTHING`,
    [testAccountId, 'Product Catalog Authz Test Account'],
  );

  // Get global role id for ACCOUNT_OWNER
  const rolesResult = await pgDb.query(`SELECT "id", "name" FROM public."Role" WHERE "accountId" IS NULL`);
  const roles = rolesResult.rows;
  const ownerRoleId = roles.find((r: any) => r.name === 'ACCOUNT_OWNER')?.id;

  // Register owner user (with ACCOUNT_OWNER role)
  const ownerRes = await request(app)
    .post('/api/accounts/register/local')
    .send({
      email: 'catalog_authz_owner@test.local',
      username: 'catalog_authz_owner_user',
      password: 'SecurePass123',
      accountId: testAccountId,
      roleIds: ownerRoleId ? [ownerRoleId] : [],
    });
  ownerToken = ownerRes.body.data.token;
});

afterAll(async () => {
  try {
    // Delete bot-related FK tables first
    await pgDb.query('DELETE FROM public.bot_link_audit WHERE "accountId" = $1', [testAccountId]);
    await pgDb.query('DELETE FROM public.bot_link_codes WHERE "accountId" = $1', [testAccountId]);
    await pgDb.query('DELETE FROM public.bot_conversations WHERE "accountId" = $1', [testAccountId]);

    // _UserRoles has ON DELETE CASCADE from User, so it's cleaned automatically
    // UserIdentity has ON DELETE RESTRICT, so delete it first
    await pgDb.query('DELETE FROM public."UserIdentity" WHERE "userId" IN (SELECT "id" FROM public."User" WHERE "accountId" = $1)', [
      testAccountId,
    ]);
    await pgDb.query('DELETE FROM public."User" WHERE "accountId" = $1', [testAccountId]);
    await pgDb.query('DELETE FROM public."Account" WHERE "id" = $1', [testAccountId]);
  } catch {
    // ignore cleanup errors
  }

  await appInstance.close();
});

describe('GET /api/products (authz + contract)', () => {
  it('rejects unauthenticated requests', async () => {
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(401);
  });

  it('allows ACCOUNT_OWNER and returns the paginated envelope', async () => {
    const res = await request(app).get('/api/products?limit=5').set('Authorization', `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(Array.isArray(res.body.data.data)).toBe(true);
    expect(res.body.data.meta).toMatchObject({ skip: 0, limit: 5 });
  });

  it('returns 400 on invalid query params', async () => {
    const res = await request(app).get('/api/products?limit=999').set('Authorization', `Bearer ${ownerToken}`);
    expect(res.status).toBe(400);
  });
});

describe('GET /api/products/categories (authz)', () => {
  it('rejects unauthenticated requests', async () => {
    const res = await request(app).get('/api/products/categories');
    expect(res.status).toBe(401);
  });

  it('allows ACCOUNT_OWNER', async () => {
    const res = await request(app).get('/api/products/categories').set('Authorization', `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
