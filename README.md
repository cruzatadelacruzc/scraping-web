# BazaarSentinel

Multi-tenant SaaS platform for **marketplace listing monitoring**. Customers register accounts, define alarms on products from online bazaars (e.g., Revolico), and the system periodically scrapes listings, evaluates multi-condition alarms (price, views, seller, outstanding status), and notifies users when any condition matches.

See [AGENTS.md](AGENTS.md) for the full project specification, architecture, and coding standards.

## Stack

TypeScript (strict), Express + `inversify-express-utils`, Inversify DI, BullMQ (with `@bull-board` dashboard, swappable via `QUEUE_BACKEND`), Prisma + PostgreSQL, Mongoose + MongoDB, Puppeteer, JWT (`jsonwebtoken`) + provider tokens (`jose`).

## Quick start

```bash
docker-compose up -d            # MongoDB, Redis, Postgres
cp .env.example .env            # then edit secrets
npm install
npm run migrate:dev             # Prisma migrations
npm run seed                    # default roles + SUPER_ADMIN
npm run dev                     # hot-reload server
```

## Scraper configuration with JSONata

The Revolico scrapers (`products_scraping`, `product_scraping`) are **config-driven**: each worker's extraction logic lives as a JSONata expression in the `ScraperConfig` Postgres table, not as hardcoded TypeScript selectors. When Revolico changes its HTML, fix the broken expression with a SQL update — no redeploy.

### Runtime flow

1. Worker pulls the JSONata expression from `ScraperConfigRegistryService` (TTL 30s in-memory cache).
2. Puppeteer renders the page; `page.evaluate()` (browser-side) serializes the selected DOM container into a JSON tree via `IFetchProductData.fetchRenderedJson<T>(url, selector, ctx)`. The HTML never leaves the browser.
3. `JsonataRunnerService.run<T>(expression, tree, { timeoutMs: 5000 })` evaluates the expression against the tree. A 5s timeout guards against runaway expressions.
4. Result is mapped to `IRevolicoProduct` and persisted to Mongo.

### Editing expressions

| Method                                                | When                                      |
| ----------------------------------------------------- | ----------------------------------------- |
| `psql -c 'UPDATE "ScraperConfig" SET expression=...'` | one-off, advanced                         |
| `npm run seed`                                        | restore both defaults (idempotent upsert) |
| Admin endpoint                                        | planned, not in MVP                       |

`ScraperConfigRepository.upsert` validates the expression with `runner.validate()` before persisting. The registry's cache TTL is 30s — either wait or restart the worker for changes to take effect.

### Failure handling

On `JsonataExtractionError`, the worker logs three `[scraper-failure]` lines via `ctx.log()` before re-throwing. Bull-Board (`/arena`) shows them in the **Logs** tab of the failed job: `storeKey`, the full expression, and a 2KB slice of the input JSON tree the browser returned. Use this to iterate the expression without redeploy. The typed error codes are `TIMEOUT`, `EXPRESSION_ERROR`, `NOT_SERIALIZABLE`, `CONFIG_MISSING`, `CONFIG_DISABLED`.

### Out of scope (MVP)

- Per-tenant `ScraperConfig` — global rows only; per-tenant migration is non-breaking (`accountId` with default `null`).
- Expression sandboxing (`isolated-vm`/`vm2`) — expressions are trusted (team-written). 5s timeout + validate-on-write are the MVP guardrails.
- LLM auto-tuning of broken expressions — future evolution; manual iteration is the MVP workflow.

## Deployment

The `Deploy Scrapers API` workflow (`.github/workflows/ec2-deploy.yml`) builds the image, pushes it to Quay.io, and runs the container on a self-hosted runner on the production EC2 host. While the project is an MVP **without** a production host, both build and deploy jobs skip themselves — CI stays green and no work is performed.

To enable production deploys later:

1. **Add the runtime secrets** that the app reads on boot (`Settings > Secrets and variables > Actions`):
   - `JWT_SECRET` — JWT signing secret. The app throws at boot if unset.
   - `TENANT_DB_URL` — PostgreSQL connection string for Prisma.
   - `JWT_EXPIRATION` — token lifetime (e.g. `1d`). Defaults to `1d`.
   - `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` — seeded admin credentials.
   - The remaining runtime vars (`DB_URI`, `REDIS_URL`, `PORT`, `TIME_OUT`, `BULL_BOARD_*`, `BULL_ARENA_URL`, `PRODUCT_URLS_BATCHSIZE`, `PRODUCT_STORAGE_BATCHSIZE`) and the Quay.io creds (`DOCKER_USERNAME`, `DOCKER_PASSWORD`) should already be configured — see the header comment in `ec2-deploy.yml` for the full list.
2. **Set the gate** `Settings > Secrets and variables > Actions > Variables`: create variable `DEPLOY_ENABLED` with value `true`.
3. **Register the self-hosted runner** on the production EC2 host so the `runs-on: self-hosted` job has somewhere to land (`Settings > Actions > Runners > New self-hosted runner`).

After that, push to `main` triggers a full deploy. The container is named `scrapper-bazaarsentinel-api` and listens on host port `80`. The `workflow_dispatch` trigger is also available for re-deploying a specific Quay tag without rebuilding.

No code change is required to flip from MVP mode to production.

## Documentation for AI agents

The repository ships project-specific guidance for Claude Code (and other AI assistants):

| Topic                         | Location                                                                                               |
| ----------------------------- | ------------------------------------------------------------------------------------------------------ |
| Project spec, stack, roles    | [AGENTS.md](AGENTS.md)                                                                                 |
| Code patterns (DI, layers)    | [src/main/CLAUDE.md](src/main/CLAUDE.md)                                                               |
| Folder structure (canonical)  | [.claude/rules/folder-structure.md](.claude/rules/folder-structure.md)                                 |
| Pre-merge checklist           | [.claude/rules/compliance-checklist.md](.claude/rules/compliance-checklist.md)                         |
| Meta-workflow (planning mode) | [.claude/rules/meta-workflow.md](.claude/rules/meta-workflow.md)                                       |
| Auth, JWT, tenant context     | [.claude/skills/security/SKILL.md](.claude/skills/security/SKILL.md)                                   |
| Docker dev environment        | [.claude/skills/docker-dev/SKILL.md](.claude/skills/docker-dev/SKILL.md)                               |
| Testing patterns (Jest + ALS) | [.claude/skills/testing/SKILL.md](.claude/skills/testing/SKILL.md)                                     |
| Add an alarm condition        | [.claude/skills/alarm-condition/SKILL.md](.claude/skills/alarm-condition/SKILL.md)                     |
| TypeScript patterns           | [.claude/skills/typescript-best-practices/SKILL.md](.claude/skills/typescript-best-practices/SKILL.md) |

## Recommended Claude Code plugin: superpowers

For team members using Claude Code as their AI assistant, we recommend installing the **[superpowers](https://claude.com/plugins/superpowers)** plugin. It is a curated collection of skills that complements the project-specific guidance above with general-purpose workflows.

Superpowers is **not required** to work on this repo — the `.claude/` directory already contains everything Claude Code needs for this specific project. The plugin adds:

- **Brainstorming** — structured approach to requirements before coding
- **Writing plans** — coherent proposals with trade-offs instead of lists of options
- **Test-driven development** — Red → Green → Refactor discipline enforced
- **Subagent-driven development** — coordinate parallel work via sub-agents
- **Verification before completion** — explicit gate before claiming a task done

Installation is per-developer (user-level, not project-level). Each team member installs it once in their own Claude Code environment — no changes to this repository are required.

## License

Private — internal use only.
