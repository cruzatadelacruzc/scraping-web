import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEFAULT_ROLES = ['ACCOUNT_OWNER', 'SUPER_ADMIN', 'MEMBER'] as const;

async function main(): Promise<void> {
  console.log('Seeding default roles...');

  for (const name of DEFAULT_ROLES) {
    const existing = await prisma.role.findFirst({
      where: { name, accountId: null },
    });

    if (!existing) {
      await prisma.role.create({ data: { name } });
      console.log(`  Role "${name}" created`);
    } else {
      console.log(`  Role "${name}" already exists`);
    }
  }

  // ── SUPER_ADMIN user ──────────────────────────────────────────

  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD;

  if (!superAdminEmail || !superAdminPassword) {
    console.log('  Skipping SUPER_ADMIN user creation: SUPER_ADMIN_EMAIL or SUPER_ADMIN_PASSWORD not set');
  } else {
    // Find or create system account
    let systemAccount = await prisma.account.findFirst({
      where: { name: 'System' },
    });

    if (!systemAccount) {
      systemAccount = await prisma.account.create({ data: { name: 'System' } });
      console.log('  System account created');
    }

    // Check if super admin already exists
    const existingSuperAdmin = await prisma.user.findFirst({
      where: { email: superAdminEmail.toLowerCase() },
      include: { roles: true },
    });

    if (existingSuperAdmin) {
      // Ensure it has SUPER_ADMIN role
      const hasSuperAdminRole = existingSuperAdmin.roles.some(r => r.name === 'SUPER_ADMIN');
      if (!hasSuperAdminRole) {
        const superAdminRole = await prisma.role.findFirst({ where: { name: 'SUPER_ADMIN', accountId: null } });
        if (superAdminRole) {
          await prisma.user.update({
            where: { id: existingSuperAdmin.id },
            data: { roles: { connect: { id: superAdminRole.id } } },
          });
          console.log('  SUPER_ADMIN role added to existing user');
        }
      }
      console.log(`  SUPER_ADMIN user "${superAdminEmail}" already exists`);
    } else {
      const superAdminRole = await prisma.role.findFirst({ where: { name: 'SUPER_ADMIN', accountId: null } });
      if (!superAdminRole) {
        console.error('  SUPER_ADMIN role not found — cannot create super admin user');
      } else {
        const passwordHash = await bcrypt.hash(superAdminPassword, 10);

        await prisma.user.create({
          data: {
            email: superAdminEmail.toLowerCase(),
            username: superAdminEmail.toLowerCase().split('@')[0],
            passwordHash,
            accountId: systemAccount.id,
            roles: { connect: { id: superAdminRole.id } },
          },
        });

        console.log(`  SUPER_ADMIN user "${superAdminEmail}" created`);
      }
    }
  }

  console.log('Seed completed.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
