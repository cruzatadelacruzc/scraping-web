/**
 * Integration tests for the tenant Prisma extension.
 *
 * Verifies that findUnique/update/delete work correctly with tenant isolation:
 * - The extension must NOT inject `AND` into `where` for unique operations,
 *   because Prisma's WhereUniqueInput rejects it.
 * - Instead, accountId is merged alongside the unique field.
 * - Tenant isolation is preserved: a caller in tenant A cannot affect tenant B's data.
 */

import { v4 as uuidv4 } from 'uuid';
import { Pool } from 'pg';
import prisma from '@users/custom-prisma-client';
import { runWithRequestContext } from '@shared/tenant-context-als';

const pool = new Pool({ connectionString: process.env.TENANT_DB_URL! });

const accountAId = uuidv4();
const accountBId = uuidv4();
let userAId: string;
let userA2Id: string; // second user in A, used for the delete test
let userBId: string;

beforeAll(async () => {
  // Targeted cleanup of leftovers from a previous crashed run, keyed by stable
  // natural keys so we never wipe unrelated dev data.
  await pool.query(`DELETE FROM public."User" WHERE "username" = ANY($1::text[])`, [['tenext-a', 'tenext-a2', 'tenext-b']]);
  await pool.query(`DELETE FROM public."Account" WHERE "name" = ANY($1::text[])`, [['tenext Account A', 'tenext Account B']]);

  // Account A
  await pool.query(
    `INSERT INTO public."Account" ("id", "name", "createdAt", "updatedAt")
     VALUES ($1, $2, NOW(), NOW())`,
    [accountAId, 'tenext Account A'],
  );

  // Account B
  await pool.query(
    `INSERT INTO public."Account" ("id", "name", "createdAt", "updatedAt")
     VALUES ($1, $2, NOW(), NOW())`,
    [accountBId, 'tenext Account B'],
  );

  // User 1 in Account A
  const userA = await pool.query(
    `INSERT INTO public."User" ("id", "accountId", "username", "email", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING "id"`,
    [uuidv4(), accountAId, 'tenext-a', 'tenext-a@test.com'],
  );
  userAId = userA.rows[0].id;

  // User 2 in Account A (for delete test)
  const userA2 = await pool.query(
    `INSERT INTO public."User" ("id", "accountId", "username", "email", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING "id"`,
    [uuidv4(), accountAId, 'tenext-a2', 'tenext-a2@test.com'],
  );
  userA2Id = userA2.rows[0].id;

  // User in Account B
  const userB = await pool.query(
    `INSERT INTO public."User" ("id", "accountId", "username", "email", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING "id"`,
    [uuidv4(), accountBId, 'tenext-b', 'tenext-b@test.com'],
  );
  userBId = userB.rows[0].id;
});

afterAll(async () => {
  // Clean up seeded data (child tables first, parent tables last).
  // userA2 may already be deleted by the delete test — the no-op is harmless.
  await pool.query('DELETE FROM public."User" WHERE "id" = ANY($1::text[])', [[userAId, userA2Id, userBId]]);
  await pool.query('DELETE FROM public."Account" WHERE "id" = ANY($1::text[])', [[accountAId, accountBId]]);
  await pool.end();
});

describe('Tenant extension — unique where handling', () => {
  // ---------------------------------------------------------------------------
  // Case 1: update own user within tenant — must NOT throw
  // PrismaClientValidationError
  // ---------------------------------------------------------------------------
  it('updates own user without PrismaClientValidationError', async () => {
    await runWithRequestContext({ tenantId: accountAId, userId: userAId }, async () => {
      const result = await prisma.user.update({
        where: { id: userAId },
        data: { displayName: 'Updated Name' },
      });
      expect(result.displayName).toBe('Updated Name');
    });
  });

  // ---------------------------------------------------------------------------
  // Case 2: delete own (second) user within tenant
  // ---------------------------------------------------------------------------
  it('deletes own user in tenant', async () => {
    await runWithRequestContext({ tenantId: accountAId, userId: userAId }, async () => {
      await prisma.user.delete({ where: { id: userA2Id } });
    });

    // Verify it's actually gone
    const check = await pool.query('SELECT "id" FROM public."User" WHERE "id" = $1', [userA2Id]);
    expect(check.rows).toHaveLength(0);
  });

  // ---------------------------------------------------------------------------
  // Case 3: isolation — tenant A cannot update/delete tenant B's user
  // Expects Prisma P2025 (record not found after tenant filter is applied)
  // ---------------------------------------------------------------------------
  it('rejects update of another tenant user with P2025', async () => {
    await runWithRequestContext({ tenantId: accountAId, userId: userAId }, async () => {
      await expect(
        prisma.user.update({
          where: { id: userBId },
          data: { displayName: 'Hack' },
        }),
      ).rejects.toMatchObject({ code: 'P2025' });
    });
  });

  it('rejects delete of another tenant user with P2025', async () => {
    await runWithRequestContext({ tenantId: accountAId, userId: userAId }, async () => {
      await expect(prisma.user.delete({ where: { id: userBId } })).rejects.toMatchObject({
        code: 'P2025',
      });
    });

    // Verify userB is still in the database
    const stillThere = await pool.query('SELECT "id" FROM public."User" WHERE "id" = $1', [userBId]);
    expect(stillThere.rows).toHaveLength(1);
  });

  // ---------------------------------------------------------------------------
  // Case 4: SUPER_ADMIN bypass — without tenantId, filter is skipped
  // ---------------------------------------------------------------------------
  it('bypasses tenant filter when tenantId is undefined (SUPER_ADMIN)', async () => {
    await runWithRequestContext({ tenantId: undefined, userId: 'admin' }, async () => {
      const result = await prisma.user.update({
        where: { id: userBId },
        data: { displayName: 'Admin Updated' },
      });
      expect(result.displayName).toBe('Admin Updated');
    });
  });

  // ---------------------------------------------------------------------------
  // Case 5: findUnique — returns own user and null for other tenant
  // ---------------------------------------------------------------------------
  it('findUnique returns own user and null for other tenant user', async () => {
    await runWithRequestContext({ tenantId: accountAId, userId: userAId }, async () => {
      const own = await prisma.user.findUnique({ where: { id: userAId } });
      expect(own).not.toBeNull();
      expect(own!.id).toBe(userAId);

      const other = await prisma.user.findUnique({ where: { id: userBId } });
      expect(other).toBeNull();
    });
  });
});
