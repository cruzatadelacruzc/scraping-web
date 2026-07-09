import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { FALLBACK_RULES } from '../src/main/scrapers/services/attribute-extractor/rule-fallbacks';

const prisma = new PrismaClient();

const DEFAULT_ROLES = ['ACCOUNT_OWNER', 'SUPER_ADMIN', 'MEMBER'] as const;

// JSONata expressions for externalized scraping.
//
// The input to each expression is the DOM tree produced by
// `RevolicoFetchDataService.fetchRenderedJson(url, selector, ctx)`. For
// `revolico:listing` the page-level selector is
// `div[class*="GridList__CardsContainer"]`, so the input is the single
// container subtree. The expression walks down to `CardsList` (regular
// grid) and `PromotedsContainer` (promoted carousel) and returns two
// arrays. The shape of each element is the `domToJson` output from
// `services/scraping/utils/dom-to-json.util.ts`:
//
//   { tag: string, attrs: Record<string, string>, children: DomNode[], text?: string }
//
// Validate against the latest Revolico HTML before bumping. Failures surface
// as JsonataExtractionError in Bull-Board's failedReason + ctx.log() entries.
const REVOLICO_LISTING_EXPRESSION = `{
  "products": $map(
    $.**[ $.tag = "ul" and $count($.attrs.*[ $contains($, "GridList__CardsList") ]) > 0 ]
            .children[ $.tag = "li" and $count($.children[ $.tag = "a" ]) > 0 ]
            .children[ $.tag = "a" ],
    function($a) {
      {
        "url":           $a.attrs.href,
        "description":   $a.children[ $.tag = "div" ][1].children[ $.tag = "p" ][0].text,
        "cost":          $exists($a.children[ $.tag = "div" ][1].children[ $.tag = "div" ][0].children[ $.tag = "p" ][0].text)
                          ? $a.children[ $.tag = "div" ][1].children[ $.tag = "div" ][0].children[ $.tag = "p" ][0].text
                          : "",
        "imageURL":      $a.children[ $.tag = "div" ][0].children[ $.tag = "picture" ][0].children[ $.tag = "source" ][0].attrs.srcset,
        "isOutstanding": $count($a.**[ $.tag = "div" and $.attrs.title = "Anuncio destacado" ]) > 0
      }
    }
  ),
  "promoted": $map(
    $.**[ $.tag = "div" and $count($.attrs.*[ $contains($, "GridList__PromotedsContainer") ]) > 0 ]
            .**[ $.tag = "a" and $contains($.attrs.href, "/item/") ],
    function($a) {
      {
        "url":           $a.attrs.href,
        "description":   $a.children[ $.tag = "div" ][1].children[ $.tag = "p" ][0].text,
        "cost":          $exists($a.children[ $.tag = "div" ][1].children[ $.tag = "div" ][0].children[ $.tag = "p" ][0].text)
                          ? $a.children[ $.tag = "div" ][1].children[ $.tag = "div" ][0].children[ $.tag = "p" ][0].text
                          : "",
        "imageURL":      $a.children[ $.tag = "div" ][0].children[ $.tag = "picture" ][0].children[ $.tag = "source" ][0].attrs.srcset,
        "isOutstanding": $count($a.**[ $.tag = "div" and $.attrs.title = "Anuncio destacado" ]) > 0
      }
    }
  )
}`;

const REVOLICO_DETAIL_EXPRESSION = `(
  $ ~> |$|{
    "views":    $."div"."p"."@class" = "cZACiy" ? $."div"."p".text : "",
    "location": $.**."p"."@data-cy" = "adLocation" ? $.**."p".text : "",
    "seller": {
      "name":     $.**."p"."@data-cy" = "adName" ? $.**."p".text : "",
      "whatsapp": $.**."a"."@href" ~> /^https:\\/\\/wa\\.me\\// ? $replace($.**."a"."@href", /^https:\\/\\/wa\\.me\\/([0-9]+).*$/, "$1") : "",
      "phone":    $.**."a"."@href" ~> /^tel:/ ? $replace($.**."a"."@href", /^tel:(.*)$/, "$1") : "",
      "email":    $.**."a"."@href" ~> /^mailto:/ ? $replace($.**."a"."@href", /^mailto:(.*)$/, "$1") : ""
    }
  }|
)`;

const SCRAPER_CONFIGS = [
  { storeKey: 'revolico:listing', expression: REVOLICO_LISTING_EXPRESSION },
  { storeKey: 'revolico:detail', expression: REVOLICO_DETAIL_EXPRESSION },
] as const;

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

  // ── ScraperConfig rows (externalized JSONata expressions) ───────
  console.log('Seeding scraper configs...');
  for (const cfg of SCRAPER_CONFIGS) {
    const existing = await prisma.scraperConfig.findUnique({ where: { storeKey: cfg.storeKey } });
    if (!existing) {
      await prisma.scraperConfig.create({ data: cfg });
      console.log(`  ScraperConfig "${cfg.storeKey}" created`);
    } else if (existing.expression !== cfg.expression) {
      await prisma.scraperConfig.update({
        where: { storeKey: cfg.storeKey },
        data: { expression: cfg.expression, version: { increment: 1 } },
      });
      console.log(`  ScraperConfig "${cfg.storeKey}" updated (expression changed, version bumped)`);
    } else {
      console.log(`  ScraperConfig "${cfg.storeKey}" already up to date`);
    }
  }

  // ── Rule rows (word-list patterns for rule-based extraction) ──────
  console.log('\nSeeding rule-based extractor patterns...');
  for (const [ruleKey, values] of Object.entries(FALLBACK_RULES)) {
    const valueArr = values as string[];
    const existing = await prisma.rule.findUnique({ where: { ruleKey } });
    if (!existing) {
      await prisma.rule.create({ data: { ruleKey, values: valueArr } });
      console.log(`  Rule "${ruleKey}" created (${valueArr.length} items)`);
    } else {
      // Update if values changed
      const existingValues = existing.values as string[];
      if (JSON.stringify(existingValues.sort()) !== JSON.stringify([...valueArr].sort())) {
        await prisma.rule.update({
          where: { ruleKey },
          data: { values: valueArr, version: { increment: 1 } },
        });
        console.log(`  Rule "${ruleKey}" updated (${valueArr.length} items, version bumped)`);
      } else {
        console.log(`  Rule "${ruleKey}" already up to date`);
      }
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
