// Avoid importing ESM 'jose' via ProviderTokenVerifier during tests
jest.mock('@shared/security/provider-token-verifier', () => ({
  ProviderTokenVerifier: jest.fn().mockImplementation(() => ({
    verifyProvider: jest.fn().mockResolvedValue({
      providerId: 'prov-1',
      email: 'schedule_provider@test.local',
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Seeds a single ScrapingSchedule row directly in PostgreSQL.
 * Each call uses a unique default name to avoid unique-constraint collisions.
 */
async function seedSchedule(overrides: Record<string, unknown> = {}): Promise<Record<string, any>> {
  const id = (overrides.id as string) ?? uuidv4();
  const name = (overrides.name as string) ?? `test-schedule-${uuidv4().slice(0, 8)}`;
  const store = (overrides.store as string) ?? 'revolico';
  const cron = (overrides.cron as string) ?? '0 6 * * *';
  const enabled = overrides.enabled !== undefined ? (overrides.enabled as boolean) : true;
  const jobs = overrides.jobs ?? [{ category: 'test' }];
  const { rows } = await pgDb.query(
    `INSERT INTO "ScrapingSchedule" (id, name, store, cron, enabled, jobs, "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW(), NOW()) RETURNING *`,
    [id, name, store, cron, enabled, JSON.stringify(jobs)],
  );
  return rows[0];
}

// ─── Lifecycle ───────────────────────────────────────────────────────────────

beforeAll(async () => {
  appInstance = new App();
  app = await appInstance.setup();
  pgDb = container.get<PgDBContext>(TYPES.TenantDB);
  // App.setup() already connects PgDBContext (singleton) — no need for pgDb.dbConnect()

  // Provision a fresh tenant + role assignments for this test
  testAccountId = uuidv4();
  await pgDb.query(
    `INSERT INTO public."Account" ("id", "name", "createdAt", "updatedAt") VALUES ($1, $2, NOW(), NOW()) ON CONFLICT ("id") DO NOTHING`,
    [testAccountId, 'Schedule API Test Account'],
  );

  const rolesResult = await pgDb.query(`SELECT "id", "name" FROM public."Role" WHERE "accountId" IS NULL`);
  const roles = rolesResult.rows;
  const memberRoleId = roles.find((r: any) => r.name === 'MEMBER')?.id;
  const superAdminRoleId = roles.find((r: any) => r.name === 'SUPER_ADMIN')?.id;

  const memberRes = await request(app)
    .post('/api/accounts/register/local')
    .send({
      email: 'sched_member@test.local',
      username: 'sched_member_user',
      password: 'SecurePass123',
      accountId: testAccountId,
      roleIds: memberRoleId ? [memberRoleId] : [],
    });
  memberToken = memberRes.body.data?.token;

  const superAdminRes = await request(app)
    .post('/api/accounts/register/local')
    .send({
      email: 'sched_superadmin@test.local',
      username: 'sched_superadmin_user',
      password: 'SecurePass123',
      accountId: testAccountId,
      roleIds: superAdminRoleId ? [superAdminRoleId] : [],
    });
  superAdminToken = superAdminRes.body.data?.token;
});

afterAll(async () => {
  try {
    // Clean up any ScrapingSchedule rows this test created
    await pgDb.query(`DELETE FROM "ScrapingSchedule" WHERE "name" LIKE 'test-schedule-%'`);

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

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/admin/scraping-schedules
// ──────────────────────────────────────────────────────────────────────────────

describe('POST /api/admin/scraping-schedules', () => {
  const createdNames: string[] = [];

  afterEach(async () => {
    for (const name of createdNames) {
      await pgDb.query(`DELETE FROM "ScrapingSchedule" WHERE "name" = $1`, [name]);
    }
    createdNames.length = 0;
  });

  it('rejects unauthenticated requests with 401', async () => {
    const res = await request(app)
      .post('/api/admin/scraping-schedules')
      .send({ name: 'unused', store: 'revolico', cron: '0 6 * * *', jobs: [{ cat: 'a' }] });
    expect(res.status).toBe(401);
  });

  it('rejects non-SUPER_ADMIN users with 403', async () => {
    const res = await request(app)
      .post('/api/admin/scraping-schedules')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ name: 'unused', store: 'revolico', cron: '0 6 * * *', jobs: [{ cat: 'a' }] });
    expect(res.status).toBe(403);
  });

  it('creates a schedule with 201 and correct response shape', async () => {
    const name = 'test-schedule-create-valid';
    createdNames.push(name);

    const res = await request(app)
      .post('/api/admin/scraping-schedules')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        name,
        store: 'revolico',
        cron: '0 6 * * *',
        enabled: true,
        jobs: [{ category: 'celulares' }],
      });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('success');
    expect(res.body.message).toBe('Scraping schedule created');
    expect(res.body.data.schedule).toBeDefined();

    const s = res.body.data.schedule;
    expect(s.id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(s.name).toBe(name);
    expect(s.store).toBe('revolico');
    expect(s.cron).toBe('0 6 * * *');
    expect(s.enabled).toBe(true);
    expect(s.jobs).toEqual([{ category: 'celulares' }]);
    expect(s.lastRunAt).toBeNull();
    expect(typeof s.createdAt).toBe('string');
    expect(typeof s.updatedAt).toBe('string');

    // Verify the row landed in PostgreSQL
    const dbRes = await pgDb.query(`SELECT * FROM "ScrapingSchedule" WHERE "name" = $1`, [name]);
    expect(dbRes.rows).toHaveLength(1);
    expect(dbRes.rows[0].enabled).toBe(true);
  });

  it('defaults enabled to true when omitted', async () => {
    const name = 'test-schedule-create-noenabled';
    createdNames.push(name);

    const res = await request(app)
      .post('/api/admin/scraping-schedules')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        name,
        store: 'revolico',
        cron: '0 6 * * *',
        jobs: [{ category: 'celulares' }],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.schedule.enabled).toBe(true);
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/api/admin/scraping-schedules')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        store: 'revolico',
        cron: '0 6 * * *',
        jobs: [{ category: 'celulares' }],
      });

    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
  });

  it('returns 400 when jobs is an empty array', async () => {
    const res = await request(app).post('/api/admin/scraping-schedules').set('Authorization', `Bearer ${superAdminToken}`).send({
      name: 'test-schedule-empty-jobs',
      store: 'revolico',
      cron: '0 6 * * *',
      jobs: [],
    });

    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
  });

  it('creates a schedule with a non-existent store (no API-layer validation)', async () => {
    const name = 'test-schedule-unknown-store';
    createdNames.push(name);

    const res = await request(app)
      .post('/api/admin/scraping-schedules')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        name,
        store: 'non-existent-store',
        cron: '0 6 * * *',
        jobs: [{ category: 'test' }],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.schedule.store).toBe('non-existent-store');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/admin/scraping-schedules (list)
// ──────────────────────────────────────────────────────────────────────────────

describe('GET /api/admin/scraping-schedules', () => {
  beforeAll(async () => {
    await seedSchedule({ name: 'test-schedule-list-1' });
    await seedSchedule({ name: 'test-schedule-list-2', enabled: false });
  });

  afterAll(async () => {
    await pgDb.query(`DELETE FROM "ScrapingSchedule" WHERE "name" IN ($1, $2)`, ['test-schedule-list-1', 'test-schedule-list-2']);
  });

  it('rejects unauthenticated requests with 401', async () => {
    const res = await request(app).get('/api/admin/scraping-schedules');
    expect(res.status).toBe(401);
  });

  it('rejects non-SUPER_ADMIN users with 403', async () => {
    const res = await request(app).get('/api/admin/scraping-schedules').set('Authorization', `Bearer ${memberToken}`);
    expect(res.status).toBe(403);
  });

  it('returns all schedules for SUPER_ADMIN', async () => {
    const res = await request(app).get('/api/admin/scraping-schedules').set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.schedules).toBeInstanceOf(Array);
    // Filter to only test schedules (seed data may add extra rows)
    const testSchedules = res.body.data.schedules.filter((s: any) => s.name.startsWith('test-schedule-'));
    expect(testSchedules).toHaveLength(2);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/admin/scraping-schedules/:id
// ──────────────────────────────────────────────────────────────────────────────

describe('GET /api/admin/scraping-schedules/:id', () => {
  let seededSchedule: Record<string, any>;

  beforeAll(async () => {
    seededSchedule = await seedSchedule({ name: 'test-schedule-get-by-id' });
  });

  afterAll(async () => {
    await pgDb.query(`DELETE FROM "ScrapingSchedule" WHERE "id" = $1`, [seededSchedule.id]);
  });

  it('returns the schedule when it exists', async () => {
    const res = await request(app)
      .get(`/api/admin/scraping-schedules/${seededSchedule.id}`)
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.schedule.id).toBe(seededSchedule.id);
    expect(res.body.data.schedule.name).toBe(seededSchedule.name);
    expect(res.body.data.schedule.store).toBe(seededSchedule.store);
    expect(res.body.data.schedule.cron).toBe(seededSchedule.cron);
  });

  it('returns 404 when the id does not exist', async () => {
    const fakeId = uuidv4();
    const res = await request(app).get(`/api/admin/scraping-schedules/${fakeId}`).set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(404);
    expect(res.body.message).toContain(fakeId);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// PUT /api/admin/scraping-schedules/:id
// ──────────────────────────────────────────────────────────────────────────────

describe('PUT /api/admin/scraping-schedules/:id', () => {
  let seededSchedule: Record<string, any>;

  beforeAll(async () => {
    seededSchedule = await seedSchedule({ name: 'test-schedule-update' });
  });

  afterAll(async () => {
    await pgDb.query(`DELETE FROM "ScrapingSchedule" WHERE "id" = $1`, [seededSchedule.id]);
  });

  it('updates the name and the response reflects the change', async () => {
    const newName = 'test-schedule-updated-name';
    const res = await request(app)
      .put(`/api/admin/scraping-schedules/${seededSchedule.id}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ name: newName });

    expect(res.status).toBe(200);
    expect(res.body.data.schedule.name).toBe(newName);

    // Verify the change persisted in PostgreSQL
    const dbRes = await pgDb.query(`SELECT "name" FROM "ScrapingSchedule" WHERE "id" = $1`, [seededSchedule.id]);
    expect(dbRes.rows[0].name).toBe(newName);
  });

  it('returns 404 when the id does not exist', async () => {
    const fakeId = uuidv4();
    const res = await request(app)
      .put(`/api/admin/scraping-schedules/${fakeId}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ name: 'whatever' });

    expect(res.status).toBe(404);
    expect(res.body.message).toContain(fakeId);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// DELETE /api/admin/scraping-schedules/:id
// ──────────────────────────────────────────────────────────────────────────────

describe('DELETE /api/admin/scraping-schedules/:id', () => {
  let seededId: string;

  beforeAll(async () => {
    const s = await seedSchedule({ name: 'test-schedule-delete' });
    seededId = s.id;
  });

  afterAll(async () => {
    // Safety net — the test below should have deleted it, but if it failed
    // mid-way, make sure the row is removed anyway.
    await pgDb.query(`DELETE FROM "ScrapingSchedule" WHERE "id" = $1`, [seededId]);
  });

  it('deletes the schedule and removes it from the DB', async () => {
    const res = await request(app).delete(`/api/admin/scraping-schedules/${seededId}`).set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('http:deleted');

    // Verify the row is gone from PostgreSQL
    const dbRes = await pgDb.query(`SELECT * FROM "ScrapingSchedule" WHERE "id" = $1`, [seededId]);
    expect(dbRes.rows).toHaveLength(0);
  });

  it('returns 404 when the id does not exist', async () => {
    const fakeId = uuidv4();
    const res = await request(app).delete(`/api/admin/scraping-schedules/${fakeId}`).set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(404);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// PATCH /api/admin/scraping-schedules/:id/toggle
// ──────────────────────────────────────────────────────────────────────────────

describe('PATCH /api/admin/scraping-schedules/:id/toggle', () => {
  let seededId: string;

  beforeAll(async () => {
    const s = await seedSchedule({ name: 'test-schedule-toggle', enabled: true });
    seededId = s.id;
  });

  afterAll(async () => {
    await pgDb.query(`DELETE FROM "ScrapingSchedule" WHERE "id" = $1`, [seededId]);
  });

  it('toggles enabled from true to false', async () => {
    const res = await request(app)
      .patch(`/api/admin/scraping-schedules/${seededId}/toggle`)
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.schedule.enabled).toBe(false);
  });

  it('toggles enabled from false back to true', async () => {
    const res = await request(app)
      .patch(`/api/admin/scraping-schedules/${seededId}/toggle`)
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.schedule.enabled).toBe(true);
  });

  it('returns 404 when the id does not exist', async () => {
    const fakeId = uuidv4();
    const res = await request(app)
      .patch(`/api/admin/scraping-schedules/${fakeId}/toggle`)
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(404);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/admin/stores
// ──────────────────────────────────────────────────────────────────────────────

describe('GET /api/admin/stores', () => {
  it('rejects non-SUPER_ADMIN with 403', async () => {
    const res = await request(app).get('/api/admin/stores').set('Authorization', `Bearer ${memberToken}`);
    expect(res.status).toBe(403);
  });

  it('returns registered stores including revolico with expected shape', async () => {
    const res = await request(app).get('/api/admin/stores').set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.stores).toBeInstanceOf(Array);

    const revolico = res.body.data.stores.find((s: any) => s.key === 'revolico');
    expect(revolico).toBeDefined();
    expect(revolico.displayName).toBe('Revolico');
    expect(revolico.scrapingQueue).toBe('PRODUCTS_SCRAPING');
    expect(revolico.jobSchema).toBeDefined();
    expect(revolico.jobSchema.fields).toBeInstanceOf(Array);
    expect(revolico.jobSchema.fields.length).toBeGreaterThan(0);

    // Verify field schema shape
    const firstField = revolico.jobSchema.fields[0];
    expect(firstField).toMatchObject({
      name: expect.any(String),
      type: expect.stringMatching(/^(string|number|boolean)$/),
      required: expect.any(Boolean),
      label: expect.any(String),
    });
  });
});
