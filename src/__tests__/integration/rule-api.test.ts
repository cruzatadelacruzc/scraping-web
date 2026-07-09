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
let appInstance: App;
let pgDb: PgDBContext;
let testAccountId: string;
let memberToken: string;
let superAdminToken: string;

const TEST_RULE_KEY = 'testRuleKey';
const SECOND_RULE_KEY = 'secondTestRule';

beforeAll(async () => {
  appInstance = new App();
  app = await appInstance.setup();
  pgDb = container.get<PgDBContext>(TYPES.TenantDB);
  await pgDb.dbConnect();

  // Provision a fresh tenant + role assignments for this test
  testAccountId = uuidv4();
  await pgDb.query(
    `INSERT INTO public."Account" ("id", "name", "createdAt", "updatedAt") VALUES ($1, $2, NOW(), NOW()) ON CONFLICT ("id") DO NOTHING`,
    [testAccountId, 'Rule API Test Account'],
  );

  const rolesResult = await pgDb.query(`SELECT "id", "name" FROM public."Role" WHERE "accountId" IS NULL`);
  const roles = rolesResult.rows;
  const memberRoleId = roles.find((r: any) => r.name === 'MEMBER')?.id;
  const superAdminRoleId = roles.find((r: any) => r.name === 'SUPER_ADMIN')?.id;

  const memberRes = await request(app)
    .post('/api/accounts/register/local')
    .send({
      email: 'rule_member@test.local',
      username: 'rule_member_user',
      password: 'SecurePass123',
      accountId: testAccountId,
      roleIds: memberRoleId ? [memberRoleId] : [],
    });
  memberToken = memberRes.body.data.token;

  const superAdminRes = await request(app)
    .post('/api/accounts/register/local')
    .send({
      email: 'rule_superadmin@test.local',
      username: 'rule_superadmin_user',
      password: 'SecurePass123',
      accountId: testAccountId,
      roleIds: superAdminRoleId ? [superAdminRoleId] : [],
    });
  superAdminToken = superAdminRes.body.data.token;
});

afterAll(async () => {
  try {
    // Clean up any Rule rows this test created
    await pgDb.query(`DELETE FROM public."Rule" WHERE "ruleKey" IN ($1, $2)`, [TEST_RULE_KEY, SECOND_RULE_KEY]);

    // Delete bot-related FK tables first
    try {
      await pgDb.query('DELETE FROM public."bot_link_audit" WHERE "accountId" = $1', [testAccountId]);
    } catch {
      /* table may not exist yet */
    }
    try {
      await pgDb.query('DELETE FROM public."bot_link_codes" WHERE "accountId" = $1', [testAccountId]);
    } catch {
      /* table may not exist yet */
    }
    try {
      await pgDb.query('DELETE FROM public."bot_conversations" WHERE "accountId" = $1', [testAccountId]);
    } catch {
      /* table may not exist yet */
    }

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

describe('POST /api/admin/rules', () => {
  afterEach(async () => {
    await pgDb.query(`DELETE FROM public."Rule" WHERE "ruleKey" = $1`, [TEST_RULE_KEY]);
  });

  it('rejects unauthenticated requests with 401', async () => {
    const res = await request(app)
      .post('/api/admin/rules')
      .send({ ruleKey: TEST_RULE_KEY, values: ['alpha', 'beta'] });
    expect(res.status).toBe(401);
  });

  it('rejects non-SUPER_ADMIN users with 403', async () => {
    const res = await request(app)
      .post('/api/admin/rules')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ ruleKey: TEST_RULE_KEY, values: ['alpha', 'beta'] });
    expect(res.status).toBe(403);
  });

  it('creates a rule with 201 for SUPER_ADMIN', async () => {
    const res = await request(app)
      .post('/api/admin/rules')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ ruleKey: TEST_RULE_KEY, values: ['alpha', 'beta'] });

    expect(res.status).toBe(201);
    expect(res.body.data.rule).toMatchObject({
      ruleKey: TEST_RULE_KEY,
      values: ['alpha', 'beta'],
      enabled: true,
    });
    expect(res.body.data.rule.id).toMatch(/^[0-9a-f-]{36}$/i);

    // Verify the row landed in Postgres
    const dbRes = await pgDb.query(`SELECT "ruleKey", "values" FROM public."Rule" WHERE "ruleKey" = $1`, [TEST_RULE_KEY]);
    expect(dbRes.rows).toHaveLength(1);
    expect(dbRes.rows[0].values).toEqual(['alpha', 'beta']);
  });

  it('returns 409 when the ruleKey already exists', async () => {
    await request(app)
      .post('/api/admin/rules')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ ruleKey: TEST_RULE_KEY, values: ['alpha'] });

    const res = await request(app)
      .post('/api/admin/rules')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ ruleKey: TEST_RULE_KEY, values: ['beta'] });

    expect(res.status).toBe(409);
    expect(res.body.message).toContain(TEST_RULE_KEY);
  });

  it('returns 400 when values array is empty', async () => {
    const res = await request(app)
      .post('/api/admin/rules')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ ruleKey: TEST_RULE_KEY, values: [] });

    expect(res.status).toBe(400);
  });

  it('returns 400 when ruleKey is missing', async () => {
    const res = await request(app)
      .post('/api/admin/rules')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ values: ['x'] });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/admin/rules', () => {
  it('rejects unauthenticated requests with 401', async () => {
    const res = await request(app).get('/api/admin/rules');
    expect(res.status).toBe(401);
  });

  it('rejects non-SUPER_ADMIN users with 403', async () => {
    const res = await request(app).get('/api/admin/rules').set('Authorization', `Bearer ${memberToken}`);
    expect(res.status).toBe(403);
  });

  it('returns all rules for SUPER_ADMIN', async () => {
    // Seed two rows
    await pgDb.query(
      `INSERT INTO public."Rule" ("id", "ruleKey", "values", "enabled", "version", "createdAt", "updatedAt") VALUES ($1, $2, $3::jsonb, true, 1, NOW(), NOW()), ($4, $5, $6::jsonb, false, 1, NOW(), NOW()) ON CONFLICT ("ruleKey") DO NOTHING`,
      [uuidv4(), TEST_RULE_KEY, JSON.stringify(['a']), uuidv4(), SECOND_RULE_KEY, JSON.stringify(['b'])],
    );

    const res = await request(app).get('/api/admin/rules').set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    const rules = res.body.data.rules as Array<{ ruleKey: string; enabled: boolean }>;
    const ours = rules.filter(r => r.ruleKey === TEST_RULE_KEY || r.ruleKey === SECOND_RULE_KEY);
    expect(ours).toHaveLength(2);
    const first = ours.find(r => r.ruleKey === TEST_RULE_KEY);
    expect(first?.enabled).toBe(true);
    const second = ours.find(r => r.ruleKey === SECOND_RULE_KEY);
    expect(second?.enabled).toBe(false);
  });
});

describe('GET /api/admin/rules/:ruleKey', () => {
  beforeAll(async () => {
    await pgDb.query(
      `INSERT INTO public."Rule" ("id", "ruleKey", "values", "version", "createdAt", "updatedAt") VALUES ($1, $2, $3::jsonb, 1, NOW(), NOW()) ON CONFLICT ("ruleKey") DO UPDATE SET "values" = EXCLUDED."values", "updatedAt" = EXCLUDED."updatedAt"`,
      [uuidv4(), TEST_RULE_KEY, JSON.stringify(['alpha', 'beta'])],
    );
  });

  afterAll(async () => {
    await pgDb.query(`DELETE FROM public."Rule" WHERE "ruleKey" = $1`, [TEST_RULE_KEY]);
  });

  it('returns the rule when it exists', async () => {
    const res = await request(app).get(`/api/admin/rules/${TEST_RULE_KEY}`).set('Authorization', `Bearer ${superAdminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.rule.ruleKey).toBe(TEST_RULE_KEY);
    expect(res.body.data.rule.values).toEqual(['alpha', 'beta']);
  });

  it('returns 404 when the key is missing', async () => {
    const missingKey = `missing:${uuidv4()}`;
    const res = await request(app).get(`/api/admin/rules/${missingKey}`).set('Authorization', `Bearer ${superAdminToken}`);
    expect(res.status).toBe(404);
    expect(res.body.message).toContain(missingKey);
  });

  it('rejects non-SUPER_ADMIN with 403', async () => {
    const res = await request(app).get(`/api/admin/rules/${TEST_RULE_KEY}`).set('Authorization', `Bearer ${memberToken}`);
    expect(res.status).toBe(403);
  });
});

describe('PUT /api/admin/rules/:ruleKey', () => {
  beforeEach(async () => {
    await pgDb.query(
      `INSERT INTO public."Rule" ("id", "ruleKey", "values", "version", "createdAt", "updatedAt") VALUES ($1, $2, $3::jsonb, 1, NOW(), NOW()) ON CONFLICT ("ruleKey") DO UPDATE SET "values" = EXCLUDED."values", "updatedAt" = EXCLUDED."updatedAt"`,
      [uuidv4(), TEST_RULE_KEY, JSON.stringify(['original'])],
    );
  });

  afterEach(async () => {
    await pgDb.query(`DELETE FROM public."Rule" WHERE "ruleKey" = $1`, [TEST_RULE_KEY]);
  });

  it('updates the values and the response reflects the change', async () => {
    const res = await request(app)
      .put(`/api/admin/rules/${TEST_RULE_KEY}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ values: ['updated', 'values'] });

    expect(res.status).toBe(200);
    expect(res.body.data.rule.values).toEqual(['updated', 'values']);

    const dbRes = await pgDb.query(`SELECT "values" FROM public."Rule" WHERE "ruleKey" = $1`, [TEST_RULE_KEY]);
    expect(dbRes.rows[0].values).toEqual(['updated', 'values']);
  });

  it('returns 404 when the key does not exist', async () => {
    const missingKey = `missing:${uuidv4()}`;
    const res = await request(app)
      .put(`/api/admin/rules/${missingKey}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ values: ['x'] });
    expect(res.status).toBe(404);
  });

  it('returns 400 when values is an empty array', async () => {
    const res = await request(app)
      .put(`/api/admin/rules/${TEST_RULE_KEY}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ values: [] });
    expect(res.status).toBe(400);
  });

  it('rejects non-SUPER_ADMIN with 403', async () => {
    const res = await request(app)
      .put(`/api/admin/rules/${TEST_RULE_KEY}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ values: ['x'] });
    expect(res.status).toBe(403);
  });
});
