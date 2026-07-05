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

const TEST_STORE_KEY = 'test:scraper-config:integration';
const SECOND_STORE_KEY = 'test:scraper-config:list';

beforeAll(async () => {
  appInstance = new App();
  app = await appInstance.setup();
  pgDb = container.get<PgDBContext>(TYPES.TenantDB);
  await pgDb.dbConnect();

  // Provision a fresh tenant + role assignments for this test
  testAccountId = uuidv4();
  await pgDb.query(
    `INSERT INTO public."Account" ("id", "name", "createdAt", "updatedAt") VALUES ($1, $2, NOW(), NOW()) ON CONFLICT ("id") DO NOTHING`,
    [testAccountId, 'ScraperConfig API Test Account'],
  );

  const rolesResult = await pgDb.query(`SELECT "id", "name" FROM public."Role" WHERE "accountId" IS NULL`);
  const roles = rolesResult.rows;
  const memberRoleId = roles.find((r: any) => r.name === 'MEMBER')?.id;
  const superAdminRoleId = roles.find((r: any) => r.name === 'SUPER_ADMIN')?.id;

  const memberRes = await request(app)
    .post('/api/accounts/register/local')
    .send({
      email: 'sc_member@test.local',
      username: 'sc_member_user',
      password: 'SecurePass123',
      accountId: testAccountId,
      roleIds: memberRoleId ? [memberRoleId] : [],
    });
  memberToken = memberRes.body.data.token;

  const superAdminRes = await request(app)
    .post('/api/accounts/register/local')
    .send({
      email: 'sc_superadmin@test.local',
      username: 'sc_superadmin_user',
      password: 'SecurePass123',
      accountId: testAccountId,
      roleIds: superAdminRoleId ? [superAdminRoleId] : [],
    });
  superAdminToken = superAdminRes.body.data.token;
});

afterAll(async () => {
  try {
    // Remove any ScraperConfig rows this test created (regardless of success)
    await pgDb.query(`DELETE FROM public."ScraperConfig" WHERE "storeKey" IN ($1, $2)`, [TEST_STORE_KEY, SECOND_STORE_KEY]);
    // Delete bot-related FK tables first (each in its own try/catch — migration may not have run yet)
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

describe('POST /api/revolicos/scraper-configs', () => {
  afterEach(async () => {
    await pgDb.query(`DELETE FROM public."ScraperConfig" WHERE "storeKey" = $1`, [TEST_STORE_KEY]);
  });

  it('rejects unauthenticated requests with 401', async () => {
    const res = await request(app).post('/api/revolicos/scraper-configs').send({ storeKey: TEST_STORE_KEY, expression: '$' });
    expect(res.status).toBe(401);
  });

  it('rejects non-SUPER_ADMIN users with 403', async () => {
    const res = await request(app)
      .post('/api/revolicos/scraper-configs')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ storeKey: TEST_STORE_KEY, expression: '$' });
    expect(res.status).toBe(403);
  });

  it('creates a row for SUPER_ADMIN with 201', async () => {
    const res = await request(app)
      .post('/api/revolicos/scraper-configs')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ storeKey: TEST_STORE_KEY, expression: '$ ~> | $ | { "a": 1 } |' });

    expect(res.status).toBe(201);
    expect(res.body.data.config).toMatchObject({
      storeKey: TEST_STORE_KEY,
      expression: '$ ~> | $ | { "a": 1 } |',
      enabled: true,
    });
    expect(res.body.data.config.id).toMatch(/^[0-9a-f-]{36}$/i);

    // Verify the row landed in Postgres
    const dbRes = await pgDb.query(`SELECT "storeKey", "expression" FROM public."ScraperConfig" WHERE "storeKey" = $1`, [TEST_STORE_KEY]);
    expect(dbRes.rows).toHaveLength(1);
    expect(dbRes.rows[0].expression).toBe('$ ~> | $ | { "a": 1 } |');
  });

  it('returns 409 when the storeKey already exists', async () => {
    await request(app)
      .post('/api/revolicos/scraper-configs')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ storeKey: TEST_STORE_KEY, expression: '$' });

    const res = await request(app)
      .post('/api/revolicos/scraper-configs')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ storeKey: TEST_STORE_KEY, expression: '$.foo' });

    expect(res.status).toBe(409);
    expect(res.body.message).toContain(TEST_STORE_KEY);
  });

  it('returns 400 when the JSONata expression is invalid', async () => {
    const res = await request(app)
      .post('/api/revolicos/scraper-configs')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ storeKey: TEST_STORE_KEY, expression: ')(' });

    expect(res.status).toBe(400);
    expect(res.body.message.toLowerCase()).toContain('invalid jsonata');
  });

  it('returns 400 when the body is missing required fields', async () => {
    const res = await request(app)
      .post('/api/revolicos/scraper-configs')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ storeKey: TEST_STORE_KEY });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/revolicos/scraper-configs', () => {
  it('rejects unauthenticated requests with 401', async () => {
    const res = await request(app).get('/api/revolicos/scraper-configs');
    expect(res.status).toBe(401);
  });

  it('rejects non-SUPER_ADMIN users with 403', async () => {
    const res = await request(app).get('/api/revolicos/scraper-configs').set('Authorization', `Bearer ${memberToken}`);
    expect(res.status).toBe(403);
  });

  it('returns every row (enabled + disabled) for SUPER_ADMIN', async () => {
    // Seed two rows so the assertion is independent of any other test's data
    const now = new Date();
    await pgDb.query(
      `INSERT INTO public."ScraperConfig" ("id", "storeKey", "expression", "enabled", "version", "createdAt", "updatedAt") VALUES ($1, $2, '$', true, 1, $5, $5), ($3, $4, '$.foo', false, 1, $5, $5) ON CONFLICT ("storeKey") DO NOTHING`,
      [uuidv4(), TEST_STORE_KEY, uuidv4(), SECOND_STORE_KEY, now],
    );

    const res = await request(app).get('/api/revolicos/scraper-configs').set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    const configs = res.body.data.configs as Array<{ storeKey: string; enabled: boolean }>;
    const ours = configs.filter(c => c.storeKey === TEST_STORE_KEY || c.storeKey === SECOND_STORE_KEY);
    expect(ours).toHaveLength(2);
    const listing = ours.find(c => c.storeKey === TEST_STORE_KEY);
    expect(listing?.enabled).toBe(true);
    const detail = ours.find(c => c.storeKey === SECOND_STORE_KEY);
    expect(detail?.enabled).toBe(false);
  });
});

describe('GET /api/revolicos/scraper-configs/:storeKey', () => {
  beforeAll(async () => {
    const now = new Date();
    await pgDb.query(
      `INSERT INTO public."ScraperConfig" ("id", "storeKey", "expression", "version", "createdAt", "updatedAt") VALUES ($1, $2, '$', 1, $3, $3) ON CONFLICT ("storeKey") DO NOTHING`,
      [uuidv4(), TEST_STORE_KEY, now],
    );
  });

  afterAll(async () => {
    await pgDb.query(`DELETE FROM public."ScraperConfig" WHERE "storeKey" = $1`, [TEST_STORE_KEY]);
  });

  it('returns the row when it exists', async () => {
    const res = await request(app)
      .get(`/api/revolicos/scraper-configs/${TEST_STORE_KEY}`)
      .set('Authorization', `Bearer ${superAdminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.config.storeKey).toBe(TEST_STORE_KEY);
  });

  it('returns 404 when the row is missing', async () => {
    const missingKey = `test:missing:${uuidv4()}`;
    const res = await request(app).get(`/api/revolicos/scraper-configs/${missingKey}`).set('Authorization', `Bearer ${superAdminToken}`);
    expect(res.status).toBe(404);
    expect(res.body.message).toContain(missingKey);
  });

  it('rejects non-SUPER_ADMIN users with 403', async () => {
    const res = await request(app).get(`/api/revolicos/scraper-configs/${TEST_STORE_KEY}`).set('Authorization', `Bearer ${memberToken}`);
    expect(res.status).toBe(403);
  });
});

describe('PUT /api/revolicos/scraper-configs/:storeKey', () => {
  beforeEach(async () => {
    const now = new Date();
    await pgDb.query(
      `INSERT INTO public."ScraperConfig" ("id", "storeKey", "expression", "version", "createdAt", "updatedAt") VALUES ($1, $2, '$', 1, $3, $3) ON CONFLICT ("storeKey") DO UPDATE SET "expression" = EXCLUDED."expression", "updatedAt" = EXCLUDED."updatedAt"`,
      [uuidv4(), TEST_STORE_KEY, now],
    );
  });

  afterEach(async () => {
    await pgDb.query(`DELETE FROM public."ScraperConfig" WHERE "storeKey" = $1`, [TEST_STORE_KEY]);
  });

  it('updates the expression and the response reflects the new value', async () => {
    const res = await request(app)
      .put(`/api/revolicos/scraper-configs/${TEST_STORE_KEY}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ expression: '$.newExpression' });

    expect(res.status).toBe(200);
    expect(res.body.data.config.expression).toBe('$.newExpression');

    const dbRes = await pgDb.query(`SELECT "expression" FROM public."ScraperConfig" WHERE "storeKey" = $1`, [TEST_STORE_KEY]);
    expect(dbRes.rows[0].expression).toBe('$.newExpression');
  });

  it('returns 404 when the row is missing', async () => {
    const missingKey = `test:missing:${uuidv4()}`;
    const res = await request(app)
      .put(`/api/revolicos/scraper-configs/${missingKey}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ expression: '$.foo' });
    expect(res.status).toBe(404);
  });

  it('returns 400 when the new expression is invalid', async () => {
    const res = await request(app)
      .put(`/api/revolicos/scraper-configs/${TEST_STORE_KEY}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ expression: ')(' });
    expect(res.status).toBe(400);
    expect(res.body.message.toLowerCase()).toContain('invalid jsonata');
  });

  it('rejects non-SUPER_ADMIN users with 403', async () => {
    const res = await request(app)
      .put(`/api/revolicos/scraper-configs/${TEST_STORE_KEY}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ expression: '$.foo' });
    expect(res.status).toBe(403);
  });
});
