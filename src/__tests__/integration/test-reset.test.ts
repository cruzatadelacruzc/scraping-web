// This test uses resetModules to force fresh container
beforeEach(() => {
  jest.resetModules();
});

import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { App } from '../../main/app';
import { container } from '@shared/container';
import { TYPES } from '@shared/types.container';
import { PgDBContext } from '@config/pg-db';

let app: any;

beforeAll(async () => {
  app = await new App().setup();
}, 30000);

it('provider non-existent account', async () => {
  const pgDb = container.get<PgDBContext>(TYPES.TenantDB);
  await pgDb.dbConnect();

  // Clean up any orphaned data from previous runs (scoped — does not affect other tests)
  await pgDb.query('DELETE FROM public."UserIdentity"');
  await pgDb.query('DELETE FROM public."User"');
  await pgDb.query('DELETE FROM public."Account"');

  const realId = uuidv4();
  await pgDb.query(
    `INSERT INTO public."Account" ("id", "name", "createdAt", "updatedAt") VALUES ($1, 't', NOW(), NOW()) ON CONFLICT DO NOTHING`,
    [realId],
  );

  const res = await request(app).post('/api/accounts/register/provider').send({
    email: 'test@t.com',
    username: 'tuser',
    provider: 'google',
    providerId: 'g-1',
    accountId: uuidv4(),
    idToken: 'tok',
    accessToken: 'acc',
  });
  console.log('STATUS:', res.status, JSON.stringify(res.body));
  expect(res.status).toBe(404);

  // Cleanup: only delete the account this test created
  await pgDb.query('DELETE FROM public."UserIdentity" WHERE "userId" IN (SELECT "id" FROM public."User" WHERE "accountId" = $1)', [realId]);
  await pgDb.query('DELETE FROM public."User" WHERE "accountId" = $1', [realId]);
  await pgDb.query('DELETE FROM public."Account" WHERE "id" = $1', [realId]);
}, 30000);
