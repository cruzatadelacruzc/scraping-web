# Revolico Scraper

Scrapes [Revolico](https://www.revolico.com) listings + detail pages,
normalizes the data, and persists it to MongoDB. All extraction logic
lives in **JSONata expressions** stored in Postgres — the TS code is
config-driven and dumb.

## Flow

```
POST /api/revolicos/scraping/jobs  (SUPER_ADMIN)
  └─► ScrapingProductsService ─enqueue─► BullMQ: PRODUCTS_SCRAPING
                                            │
                                            ▼
                          GenericListingScraperService.processor
                              │  1. cfg = ScraperConfigRegistry.get('revolico:listing')  ──► Postgres
                              │  2. tree = RevolicoFetchDataService.fetchRenderedJson(url, sel)
                              │       └─ Puppeteer + stealth → DOM via domToJson helper
                              │  3. rows = JsonataRunnerService.run(cfg.expression, tree)
                              │  4. map _mapRow → IRevolicoProduct[]
                              └─► onCompleted → batched enqueue
                                              │
                                              ▼
                          BullMQ: PRODUCT_STORAGE
                              └─► ProductService → ProductRepository.bulkInsertOrUpdate
                                              └─► MongoDB: products
                                              └─► fan-out to PRODUCTS_SCRAPING (detail enrichment)
                                              └─► AlarmEngineService.evaluateAlarms
```

## Layers

| Folder | Role |
|---|---|
| `controllers/` | Express routes. Zod validation, `AuthMiddleware.forRoles('SUPER_ADMIN')`. No business logic. |
| `services/` (root) | Enqueue jobs, BullMQ listeners, Mongo persistence, alarm dispatch. |
| `services/scraping/` | The two generic scrapers (listing / detail), the **JSONata runner**, the **TTL registry** for `ScraperConfig`, and CRUD over those configs. |
| `repositories/` | Mongo + Postgres. Only place that touches Prisma/Mongoose. |
| `models/product.model.ts` | Mongoose `Product` schema with history arrays. |
| `errors/` | `JsonataExtractionError` (closed code catalog) + domain errors. |
| `mappers/` | Pure Prisma → DTO functions. |
| `utils/` | Extraction helpers. |

`queues.ts` exports `QUEUE_NAME` and the `RevolicoQueues` class
(`IQueueModule` — declares 3 queues, processors, listeners).

## End-to-end

1. **Trigger.** `POST /api/revolicos/scraping/jobs` accepts
   `{ category, subcategory, pageNumber, totalPages }`. Enqueued to
   `PRODUCTS_SCRAPING` with `attempts: 2, backoff: 5000`.

2. **Processor.** Reads the `ScraperConfig` from the registry (TTL 30 s),
   fetches the page via Puppeteer, runs the JSONata expression with a
   5 s timeout, maps rows to `IRevolicoProduct`, and reports progress.

3. **DOM tree (browser-side).** Puppeteer + stealth navigates with
   `waitUntil: 'networkidle2'` and runs:

   ```js
   var domToJson = (function(){ /* DOM_TO_JSON_SOURCE */ })();
   var els = document.querySelectorAll(sel);
   var out = [];
   for (var i = 0; i < els.length; i++) {
     var n = domToJson(els[i]);
     if (n !== null) out.push(n);
   }
   return out.length === 1 ? out[0] : out;
   ```

   ⚠️ The **IIFE wrapper is critical**: `DOM_TO_JSON_SOURCE` ends with
   `return domToJson;`. Without the IIFE, that early return short-circuits
   the function and `page.evaluate` returns the `domToJson` **function
   reference** (which JSON-serializes to `{}`) instead of the tree.

   The tree has shape `{ tag, attrs, children, text? }` and omits
   `<script>`, `<style>`, `<noscript>`, `<template>` subtrees.

4. **Storage.** `PRODUCTS_SCRAPING.onCompleted` chunks into batches of
   `PRODUCT_STORAGE_BATCHSIZE` (env, default 50) → enqueue
   `PRODUCT_STORAGE`. `ProductService.processor` upserts by `url` and
   `$push`es to history arrays. On completion, fan-out to
   `PRODUCTS_SCRAPING` in batches of `PRODUCT_URLS_BATCHSIZE` (env,
   default 30) for detail enrichment.

5. **Alarms.** Same `onCompleted` builds `IProductSnapshot[]` and
   dispatches to `AlarmEngineService.evaluateAlarms(...)`
   (non-blocking).

## ScraperConfig schema (Postgres)

| Column      | Type     | Notes |
|-------------|----------|-------|
| `storeKey`  | `String` | PK. Convention `<marketplace>:<scope>`. |
| `expression`| `String` | JSONata source. |
| `version`   | `Int`    | Auto-incremented on expression change. |
| `enabled`   | `Bool`   | `false` → `JsonataExtractionError` with code `CONFIG_DISABLED`. |

`ScraperConfigRepository.upsert` validates the expression with
`JsonataRunnerService.validate()` before persisting.

## Administering JSONata expressions

Three paths, all writing to the same table, all gated by
`JsonataRunnerService.validate()`.

### A) REST API (hot changes, no redeploy)

All routes require `SUPER_ADMIN`. Get a token via
`POST /api/users/login` (`{ email, password }` of a SUPER_ADMIN user) —
the response carries `{ accessToken }`.

```bash
# Login → capture token (re-use in shell)
TOKEN=$(curl -s -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"'$SUPER_ADMIN_EMAIL'","password":"'$SUPER_ADMIN_PASSWORD'"}' \
  | jq -r .accessToken)

# Read current expression (copy this for rollback)
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/revolicos/scraper-configs/revolico:listing | jq .expression

# List all
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/revolicos/scraper-configs | jq

# Create
curl -X POST http://localhost:3000/api/revolicos/scraper-configs \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"storeKey":"revolico:listing","expression":"{ ... }"}'
# 201 | 409 if exists | 400 if invalid JSONata

# Update (upsert)
curl -X PUT http://localhost:3000/api/revolicos/scraper-configs/revolico:listing \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"expression":"{ ... }"}'
# 200 | 404 if missing | 400 if invalid JSONata

# Validate locally before PUT (avoids 400 round-trip)
node -e "const j=require('jsonata'); try{j('$EXPR');console.log('ok')}catch(e){console.error(e.message);process.exit(1)}"
```

`ScraperConfigService.{create,update}` calls
`ScraperConfigRegistryService.invalidate(storeKey)` → next worker job
sees the new expression immediately (no TTL wait).

### B) Seed (versioned, part of deploy)

`prisma/seed.ts` hardcodes `REVOLICO_LISTING_EXPRESSION` and
`REVOLICO_DETAIL_EXPRESSION` as string templates. The loop is
**idempotent**:

| State | Action | Log |
|---|---|---|
| Row missing | `create` | `created` |
| `expression` differs | `update` + `version++` | `updated (expression changed, version bumped)` |
| Identical | none | `already up to date` |

Production workflow: edit `prisma/seed.ts` → PR + review → merge to
`develop` → deploy runs `npm run seed` → workers pick up on TTL expiry
(≤ 30 s) or process restart.

**Advantage over API**: stays in git, with review and audit trail.

### C) Direct SQL (emergencies / rollback)

```bash
# Open a psql session against the running container
docker exec -it revolico_postgres psql -U revolico -d revolico
```

```sql
-- Inspect
SELECT "storeKey", version, enabled, length(expression) AS expr_len, "updatedAt"
FROM "ScraperConfig" ORDER BY "storeKey";

-- Read current expression (copy for rollback)
SELECT expression FROM "ScraperConfig" WHERE "storeKey" = 'revolico:listing';

-- Rollback (paste a previously-saved expression)
UPDATE "ScraperConfig"
SET expression = '<previous expression>', version = version + 1, "updatedAt" = NOW()
WHERE "storeKey" = 'revolico:listing';

-- Emergency disable
UPDATE "ScraperConfig" SET enabled = false WHERE "storeKey" = 'revolico:listing';

-- Re-enable
UPDATE "ScraperConfig" SET enabled = true WHERE "storeKey" = 'revolico:listing';
-- (No hard delete — disable is the supported way to retire a config.)
```

SQL bypass does **not** call `ScraperConfigRegistryService.invalidate()`.
Active workers keep the cached expression for up to 30 s. Restart the
process to force reload.

### Validation layers

1. **`JsonataRunnerService.validate(expression)`** in the repository,
   before any DB write.
2. **`prisma/seed.ts`** trusts the TS compile (no string validation).
3. **`JsonataRunnerService.run(...)`** at runtime with `timeoutMs: 5000`
   and `Promise.race(setTimeout, expr.evaluate(...))`. Timeouts / eval
   errors produce typed `JsonataExtractionError`.

### Versioning & rollback

- `version` is an `Int`, default `1`, incremented by `seed.ts` on `UPDATE`.
- No history is kept — only the latest expression.
- Rollback = paste a previously-saved expression via SQL (C) or seed (B).
- Keep copies of working expressions in git history (or PR comments) for
  fast rollback.

## Selectors in use

| Selector | storeKey | Service |
|---|---|---|
| `div[class*="GridList__CardsContainer"]` | `revolico:listing` | `GenericListingScraperService` |
| `main` | `revolico:detail` | `GenericDetailScraperService` |

The `[class*="..."]` matches by **prefix** of CSS Modules. Generated
suffixes (`hakAjM`, `fOGbMh`) change per Revolico build — never pin them.

## Adding a new scraper

1. Create `services/scraping/generic-<scope>-scraper.service.ts` with a
   `processor(ctx: IJobContext<TData>): Promise<TResult>`.
2. Define `SELECTOR` and `STORE_KEY` as `private static readonly`.
3. Inject `IFetchProductData`, `JsonataRunnerService`,
   `ScraperConfigRegistryService`, `ILogger`.
4. Add binding in `src/main/shared/container.ts` + `types.container.ts`.
5. Wire into `RevolicoQueues.getProcessor()` and `getQueuesToInitialize()`.
6. Add expression to `prisma/seed.ts` under `REVOLICO_<SCOPE>_EXPRESSION`.

## Error catalog (`JsonataExtractionError`)

| Code | Origin | Meaning / action |
|---|---|---|
| `CONFIG_MISSING` | `ScraperConfigRegistryService.get` | Row missing. Run `npm run seed`? |
| `CONFIG_DISABLED` | same | `enabled = false`. |
| `EMPTY_TREE` | `Generic{Listing,Detail}ScraperService` | CSS selector matched 0 elements. Revolico changed HTML. |
| `NO_PRODUCTS_EXTRACTED` | same | Selector matched, expression returned no rows. Adjust expression. |
| `EXPRESSION_ERROR` | `JsonataRunnerService` | Expression failed to compile or evaluate. |
| `TIMEOUT` | same | Exceeded `timeoutMs` (5 s). |
| `NOT_SERIALIZABLE` | same | Result has a circular reference. Bug in expression. |

Each error carries `expression` + a 2 KB snippet of `inputJson` for
debugging from Bull-Board without opening a browser.

## Enrichment metrics

The in-memory `EnrichmentMetricsService` accumulates counters at every
pipeline decision point. Exposed via the admin API:

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"'$SUPER_ADMIN_EMAIL'","password":"'$SUPER_ADMIN_PASSWORD'"}' \
  | jq -r .accessToken)

curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/admin/dashboard/enrichment | jq
```

Response includes: cache hit rates per layer, LLM token consumption
(prompt cache hit/miss tokens, completion tokens), LLM failure rate,
and estimated cost savings based on `LLM_COST_PER_MILLION_TOKENS`.

See `src/main/scrapers/README.md#enrichment-metrics` for the full counter
table and `src/main/scrapers/CLAUDE.md#7` for agent-facing documentation.

## Troubleshooting

- **`NO_PRODUCTS_EXTRACTED`** → read the `inputJson` snippet in Bull-Board
  `failedReason`, compare with the expected structure. Revolico HTML
  changed?
- **`EMPTY_TREE`** → selector didn't match. Verify with
  `document.querySelectorAll(selector)` in the browser. Adjust the
  `[class*=...]` prefix if Revolico renamed the component.
- **Tree is `{}`** → the IIFE regression. Confirm `fetchRenderedJson`
  uses `buildEvalBody()` (see the CRITICAL JSDoc in
  `services/fetch-data.service.ts`).
- **Worker uses old expression** → TTL 30 s, or restart. The CRUD API
  invalidates immediately; the seed does not.
- **Job succeeds but Mongo is empty** → check `PRODUCT_STORAGE_BATCHSIZE`
  and `ProductService.processor` logs. Validation errors land in
  `InvalidProductInfoError` with the rejected product.

## File reference

| Topic | File |
|---|---|
| Error → Bull-Board mapping | `errors/jsonata-extraction.error.ts`, `queues.ts#buildFailedJobListener` |
| DOM tree generation | `services/scraping/utils/dom-to-json.util.ts`, `services/fetch-data.service.ts` |
| JSONata with timeout | `services/scraping/jsonata-runner.service.ts` |
| Expression cache | `services/scraping/scraper-config-registry.service.ts` |
| Mongo upsert with history | `repositories/product.repository.ts#bulkInsertOrUpdate` |
| Seeded expressions | `prisma/seed.ts` (`SCRAPER_CONFIGS` section) |
| HTTP endpoints | `controllers/scraping.controller.ts`, `controllers/scraper-config.controller.ts` |
| Job DTOs | `services/dto/scraping-products.dto.ts`, `services/dto/scraping-product.dto.ts` |
