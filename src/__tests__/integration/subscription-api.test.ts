// Avoid importing ESM 'jose' via ProviderTokenVerifier during tests
jest.mock('@shared/security/provider-token-verifier', () => ({
  ProviderTokenVerifier: jest.fn().mockImplementation(() => ({
    verifyProvider: jest.fn().mockResolvedValue({
      providerId: 'prov-1',
      email: 'subapi_provider@test.local',
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
let appInstance: App;
let pgDb: PgDBContext;

let adminAccountId: string; // the SUPER_ADMIN's own account ("System"-like)
let targetAccountId: string; // a different tenant the admin assigns a plan to
let planId: string;
let superAdminToken: string;

beforeAll(async () => {
  appInstance = new App();
  app = await appInstance.setup();
  pgDb = container.get<PgDBContext>(TYPES.TenantDB);

  adminAccountId = uuidv4();
  targetAccountId = uuidv4();
  planId = uuidv4();

  await pgDb.query(
    `INSERT INTO public."Account" ("id", "name", "createdAt", "updatedAt")
     VALUES ($1, $2, NOW(), NOW()), ($3, $4, NOW(), NOW())`,
    [adminAccountId, 'Subscription API Admin Account', targetAccountId, 'Subscription API Target Account'],
  );

  await pgDb.query(
    `INSERT INTO public."Plan" ("id", "type", "name", "price", "features", "createdAt", "updatedAt")
     VALUES ($1, 'STANDARD', $2, 9.99, '{}'::jsonb, NOW(), NOW())`,
    [planId, `Subscription API Test Plan ${planId.slice(0, 8)}`],
  );

  const superAdminRoleRes = await pgDb.query(`SELECT "id" FROM public."Role" WHERE "name" = 'SUPER_ADMIN' AND "accountId" IS NULL`);
  const superAdminRoleId = superAdminRoleRes.rows[0]?.id;
  // eslint-disable-next-line jest/no-standalone-expect
  expect(superAdminRoleId).toBeDefined();

  const superAdminRes = await request(app)
    .post('/api/accounts/register/local')
    .send({
      email: 'subapi_superadmin@test.local',
      username: 'subapi_superadmin_user',
      password: 'SecurePass123',
      accountId: adminAccountId,
      roleIds: [superAdminRoleId],
    });
  // eslint-disable-next-line jest/no-standalone-expect
  expect(superAdminRes.status).toBe(201);
  superAdminToken = superAdminRes.body.data?.token;
  // eslint-disable-next-line jest/no-standalone-expect
  expect(superAdminToken).toBeDefined();
});

afterAll(async () => {
  try {
    await pgDb.query('DELETE FROM public."AccountSubscription" WHERE "accountId" = ANY($1::text[])', [[adminAccountId, targetAccountId]]);
    await pgDb.query('DELETE FROM public."UserIdentity" WHERE "userId" IN (SELECT "id" FROM public."User" WHERE "accountId" = $1)', [
      adminAccountId,
    ]);
    await pgDb.query('DELETE FROM public."User" WHERE "accountId" = ANY($1::text[])', [[adminAccountId, targetAccountId]]);
    await pgDb.query('DELETE FROM public."Plan" WHERE "id" = $1', [planId]);
    await pgDb.query('DELETE FROM public."Account" WHERE "id" = ANY($1::text[])', [[adminAccountId, targetAccountId]]);
  } catch {
    // ignore cleanup errors
  }
  await appInstance.close();
});

describe('POST /api/subscriptions (SUPER_ADMIN assigns a plan to another account)', () => {
  it('creates the subscription against the target account, not the admin account', async () => {
    const res = await request(app)
      .post('/api/subscriptions')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ accountId: targetAccountId, planId, status: 'TRIALING' });

    expect(res.status).toBe(201);
    expect(res.body.data.subscription).toMatchObject({ planId, status: 'TRIALING' });

    const rows = await pgDb.query('SELECT "accountId", "planId", "status" FROM public."AccountSubscription" WHERE "planId" = $1', [planId]);
    expect(rows.rows).toHaveLength(1);
    expect(rows.rows[0].accountId).toBe(targetAccountId);
  });

  it('lists the subscription back for the target account', async () => {
    const res = await request(app).get(`/api/accounts/${targetAccountId}/subscriptions`).set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.subscriptions.some((s: any) => s.planId === planId)).toBe(true);
  });
});
