// Avoid importing ESM 'jose' via ProviderTokenVerifier during tests
jest.mock('@shared/security/provider-token-verifier', () => ({
  ProviderTokenVerifier: jest.fn().mockImplementation(() => ({
    verifyProvider: jest.fn().mockResolvedValue({
      providerId: 'prov-1',
      email: 'roletoggle_provider@test.local',
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
let testAccountId: string;
let superAdminToken: string;
let superAdminRoleId: string;

beforeAll(async () => {
  appInstance = new App();
  app = await appInstance.setup();
  pgDb = container.get<PgDBContext>(TYPES.TenantDB);

  testAccountId = uuidv4();
  await pgDb.query(
    `INSERT INTO public."Account" ("id", "name", "createdAt", "updatedAt") VALUES ($1, $2, NOW(), NOW()) ON CONFLICT ("id") DO NOTHING`,
    [testAccountId, 'Role Toggle API Test Account'],
  );

  const rolesResult = await pgDb.query(`SELECT "id", "name" FROM public."Role" WHERE "accountId" IS NULL`);
  superAdminRoleId = rolesResult.rows.find((r: any) => r.name === 'SUPER_ADMIN')?.id;
  // eslint-disable-next-line jest/no-standalone-expect
  expect(superAdminRoleId).toBeDefined();

  const superAdminRes = await request(app)
    .post('/api/accounts/register/local')
    .send({
      email: 'roletoggle_superadmin@test.local',
      username: 'roletoggle_superadmin_user',
      password: 'SecurePass123',
      accountId: testAccountId,
      roleIds: superAdminRoleId ? [superAdminRoleId] : [],
    });
  superAdminToken = superAdminRes.body.data?.token;
  // eslint-disable-next-line jest/no-standalone-expect
  expect(superAdminRes.status).toBe(201);
  // eslint-disable-next-line jest/no-standalone-expect
  expect(superAdminToken).toBeDefined();
});

afterAll(async () => {
  try {
    await pgDb.query(`DELETE FROM public."Role" WHERE "name" LIKE 'test-toggle-%'`);
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

describe('PATCH /api/admin/roles/:id/toggle', () => {
  it('deactivates an active role, then reactivates it on second toggle', async () => {
    const roleName = `test-toggle-${uuidv4().slice(0, 8)}`;
    const createRes = await request(app)
      .post('/api/admin/roles')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ name: roleName });
    expect(createRes.status).toBe(201);
    const roleId = createRes.body.data.id;

    const deactivate = await request(app).patch(`/api/admin/roles/${roleId}/toggle`).set('Authorization', `Bearer ${superAdminToken}`);
    expect(deactivate.status).toBe(200);
    expect(deactivate.body.data.role.deletedAt).not.toBeNull();

    const reactivate = await request(app).patch(`/api/admin/roles/${roleId}/toggle`).set('Authorization', `Bearer ${superAdminToken}`);
    expect(reactivate.status).toBe(200);
    expect(reactivate.body.data.role.deletedAt).toBeNull();
  });

  it('returns 409 for SUPER_ADMIN', async () => {
    const res = await request(app).patch(`/api/admin/roles/${superAdminRoleId}/toggle`).set('Authorization', `Bearer ${superAdminToken}`);
    expect(res.status).toBe(409);
  });

  it('returns 404 for an unknown role id', async () => {
    const res = await request(app).patch(`/api/admin/roles/${uuidv4()}/toggle`).set('Authorization', `Bearer ${superAdminToken}`);
    expect(res.status).toBe(404);
  });

  it('rejects the old DELETE verb (endpoint removed)', async () => {
    const res = await request(app).delete(`/api/admin/roles/${uuidv4()}`).set('Authorization', `Bearer ${superAdminToken}`);
    expect(res.status).toBe(404);
  });
});

describe('GET /api/admin/roles?status=', () => {
  it('filters inactive roles and includes deletedAt in the payload', async () => {
    const roleName = `test-toggle-${uuidv4().slice(0, 8)}`;
    const createRes = await request(app)
      .post('/api/admin/roles')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ name: roleName });
    const roleId = createRes.body.data.id;
    await request(app).patch(`/api/admin/roles/${roleId}/toggle`).set('Authorization', `Bearer ${superAdminToken}`);

    const inactive = await request(app).get('/api/admin/roles?status=inactive').set('Authorization', `Bearer ${superAdminToken}`);
    expect(inactive.status).toBe(200);
    expect(inactive.body.data.roles.some((r: any) => r.id === roleId)).toBe(true);
    expect(inactive.body.data.roles.every((r: any) => r.deletedAt !== null)).toBe(true);

    const active = await request(app).get('/api/admin/roles?status=active').set('Authorization', `Bearer ${superAdminToken}`);
    expect(active.status).toBe(200);
    expect(active.body.data.roles.some((r: any) => r.id === roleId)).toBe(false);

    const all = await request(app).get('/api/admin/roles').set('Authorization', `Bearer ${superAdminToken}`);
    expect(all.status).toBe(200);
    expect(all.body.data.roles.some((r: any) => r.id === roleId)).toBe(true);
  });

  it('returns 400 for an invalid status value', async () => {
    const res = await request(app).get('/api/admin/roles?status=nope').set('Authorization', `Bearer ${superAdminToken}`);
    expect(res.status).toBe(400);
  });
});
