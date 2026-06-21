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
let memberToken: string;
let superAdminToken: string;

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

  // Create test account
  testAccountId = uuidv4();
  await pgDb.query(
    `INSERT INTO public."Account" ("id", "name", "createdAt", "updatedAt") VALUES ($1, $2, NOW(), NOW()) ON CONFLICT ("id") DO NOTHING`,
    [testAccountId, 'Test Account'],
  );

  // Get global role IDs
  const rolesResult = await pgDb.query(`SELECT "id", "name" FROM public."Role" WHERE "accountId" IS NULL`);
  const roles = rolesResult.rows;
  const memberRoleId = roles.find((r: any) => r.name === 'MEMBER')?.id;
  const superAdminRoleId = roles.find((r: any) => r.name === 'SUPER_ADMIN')?.id;

  // Register member user (with MEMBER role)
  const memberRes = await request(app)
    .post('/api/accounts/register/local')
    .send({
      email: 'member_test@test.local',
      username: 'member_test_user',
      password: 'SecurePass123',
      accountId: testAccountId,
      roleIds: memberRoleId ? [memberRoleId] : [],
    });
  memberToken = memberRes.body.data.token;

  // Register super admin user (with SUPER_ADMIN role)
  const superAdminRes = await request(app)
    .post('/api/accounts/register/local')
    .send({
      email: 'superadmin_test@test.local',
      username: 'superadmin_test_user',
      password: 'SecurePass123',
      accountId: testAccountId,
      roleIds: superAdminRoleId ? [superAdminRoleId] : [],
    });
  superAdminToken = superAdminRes.body.data.token;
});

afterAll(async () => {
  try {
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

describe('POST /api/revolicos/scraping/jobs (authz)', () => {
  it('should reject unauthenticated requests', async () => {
    const res = await request(app).post('/api/revolicos/scraping/jobs').send({ category: 'test' });
    expect(res.status).toBe(401);
  });

  it('should reject non-SUPER_ADMIN users', async () => {
    const res = await request(app)
      .post('/api/revolicos/scraping/jobs')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ category: 'test' });
    expect(res.status).toBe(403);
  });

  it('should allow SUPER_ADMIN users', async () => {
    const res = await request(app)
      .post('/api/revolicos/scraping/jobs')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ category: 'test' });
    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('jobId');
  });
});
