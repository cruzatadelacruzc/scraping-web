---
description: 'AI agent instructions for the scraper module: shared enrichment, store-specific scrapers, queue wiring'
applyTo: 'src/main/scrapers/**'
---

# Scraper Module — Agent Instructions

## 1. Module structure

See `src/main/scrapers/README.md` for the full directory tree. Key rules for agents:

- **`scrapers/services/`** is shared across all stores. Currently contains only `attribute-extractor/` (keyword enrichment). Do NOT put store-specific logic here.
- **`scrapers/<store>/`** is store-specific. Each store implements the queue module and its own scraping services. Add new stores at this level (e.g. `scrapers/wallapop/`).

## 2. Shared enrichment services

Located in `scrapers/services/attribute-extractor/`. Pipeline: rules first, then cache, LLM as last resort. Never throws -- at minimum returns `{}` or `{ keywords: [] }`.

### 2.1 AttributeExtractorService (orchestrator)

`attribute-extractor.service.ts`. Hybrid extractor with a three-step fallback:

1. If description is empty, return `{}` immediately.
2. Run `RuleBasedExtractorService.extract()`. If confidence >= 0.4, return the rule result immediately (no API cost, no DB hit).
3. Check `KeywordsCache` for the description hash. On hit, return `{ keywords: [...] }`.
4. Call LLM via `extractKeywords()`. Cache the result. Return `{ keywords: [...] }`. Use DB-stored system prompt (see Section 6).

Depends on: `RuleBasedExtractorService`, `KeywordsCache`, `ScraperConfigRegistryService`, `ILogger`.

### 2.2 Rule-based extraction

`rule-based-extractor.service.ts` + `rule-registry.service.ts`. Deterministic regex patterns for Spanish classified-ad descriptions.

- **13 categories**: 6 word-lists (brands, conditions, colors, propertyTypes, locations, warrantyKeywords) from `RuleRegistryService` + 7 inline regex (rooms, bathrooms, garage, floors, storage, RAM, originalPrice).
- **Confidence** = `matchedCount / 13`. Threshold 0.4. Accent-stripping applied.
- **Purely synchronous, no I/O** — `RuleRegistryService.get()` reads from an in-memory `Map`. Falls back to hardcoded `FALLBACK_RULES` when the DB is unreachable.
- **Runtime editable** via `PUT /api/admin/rules/:ruleKey` (SUPER_ADMIN). See `.claude/skills/revolico-scraper/SKILL.md` §12 for the write-path contract (API invalidates cache; seed/SQL do not).
- Canonical fallback values in `rule-fallbacks.ts` (also used by `prisma/seed.ts`).

### 2.3 extractKeywords() (LLM)

`llm-extractor.service.ts`. Standalone async function (not a class). Uses Vercel AI SDK (`generateText` from `ai`) with `@ai-sdk/openai-compatible` provider and `response_format: json_object` injected via custom fetch (compatible with DeepSeek thinking mode). JSON output is parsed and Zod-validated manually.

Provider-agnostic — driven by `LLM_BASE_URL`, `LLM_MODEL`, `LLM_API_KEY`. See `src/main/scrapers/README.md` for the full env var table. Uses `LLM_ENABLE_REASONING` to control DeepSeek thinking mode (defaults to `true`).

Output validated by `z.array(z.string())` — no artificial keyword limit; the LLM decides how many keywords are relevant. Returns `{ keywords: [] }` on any failure. Never throws. See Section 6 for prompt management.

### 2.4 KeywordsCache

`keywords-cache.ts`. Two-layer cache (memory `Map` + MongoDB `keyword_cache` collection, TTL via `LLM_CACHE_TTL_DAYS`). Key: MD5 of `description.trim().toLowerCase()`. Mongo hits auto-promote to memory. Write failures silently swallowed. Bind to self in container.

### 2.5 DI registration pattern

Shared enrichment services bind to themselves (class-as-token) in `src/main/shared/container.ts`. Use `TYPES.Symbol` only for store-specific implementations. `AnalyticsService` is the exception — it uses a Symbol. All singletons.

## 3. Analytics service

`revolico/services/analytics.service.ts`. Pure computation -- **no DB, no I/O, no side effects**. The caller persists results to MongoDB.

5 metrics derived from history arrays — see `src/main/scrapers/README.md` for the full table. Returns `null` when the product has zero price history entries. The `hotScore` formula: `viewsPerDay * (isOutstanding ? 2.0 : 1.0) * (lastPrice < prevPrice ? 1.5 : 1.0)`, rounded to 2 decimals.

## 4. Queue flow

Defined in `revolico/queues.ts`. Three queues registered via `IQueueModule`. See `src/main/scrapers/README.md` for the full pipeline diagram.

1. **PRODUCTS_SCRAPING**: JSONata-driven listing scraper (`GenericListingScraperService`). Expression from `ScraperConfig` `"revolico:listing"`. Emits `ProductDataFromListDTO[]`.
2. **PRODUCT_STORAGE**: Upserts products via `ProductService`. Runs enrichment hooks (attribute extraction, analytics) here. Fans out per-product `PRODUCT_SCRAPING` jobs for detail scraping.
3. **PRODUCT_SCRAPING**: JSONata-driven detail scraper (`GenericDetailScraperService`). Expression from `ScraperConfig` `"revolico:detail"`. Updates product with detail page data.

`ScrapingProductsService.setupQueueListeners()` fans listing results into `PRODUCT_STORAGE` jobs. `ProductService.setupQueueListeners()` fans stored products into `PRODUCT_SCRAPING` detail jobs.

Failed-job listener logs at error level with `jobId`, `jobName`, `reason`, `data`, and for `JsonataExtractionError`: `code`, `expression`, and a 2 KB `inputJsonSnippet`.

## 5. MongoDB product model

`revolico/models/product.model.ts`. Collection: `products` (Mongoose pluralizes `Product`). See `src/main/scrapers/README.md` for the full field table (core, detail, history arrays, enrichment).

Agent-critical notes:
- **`isPromoted`** is set by the **service** (`_mapRow`), NOT the JSONata expression. Promoted rows come from `result.promoted` array.
- **`isOutstanding`** IS set by the expression (`attrs.title = "Anuncio destacado"`).
- History arrays use `$push` on upsert: `priceHistory`, `viewsHistory`, `isOutstandingHistory`, `isPromotedHistory`, `locationHistory`. Each entry is `{ value, updatedAt }`.
- Timestamps: `createdAt` / `updatedAt` via Mongoose `{ timestamps: true }`.
- **No tenant isolation** on MongoDB product data. Scraped products are shared across all tenants. Prisma tenant extensions do NOT apply here.

## 6. LLM prompt management

Resolved in `AttributeExtractorService._loadSystemPrompt()` via three-tier chain:
**DB** (`ScraperConfig llm:keyword-extraction-prompt`) → **env var** (`LLM_KEYWORD_EXTRACTION_PROMPT`) → **hardcoded** (`FALLBACK_SYSTEM_PROMPT`).

### `llm:` prefix convention

`ScraperConfigRepository.upsert()` skips JSONata validation when
`storeKey.startsWith('llm:')`. Plain-text prompts pass through the same API
that validates JSONata for `revolico:*` keys. Future `llm:*` keys
(e.g. `llm:category-classifier`) follow the same pattern.

### Managing the prompt

- **API**: `PUT /api/revolicos/scraper-configs/llm:keyword-extraction-prompt` (runtime, no restart). Cache invalidates immediately.
- **Env var**: `LLM_KEYWORD_EXTRACTION_PROMPT` (deploy-time). Used when DB row missing.
- **Seed**: `npm run seed` inserts canonical prompt. Keep in sync with `FALLBACK_SYSTEM_PROMPT`.

See `src/main/scrapers/README.md` for curl examples and `.claude/skills/revolico-scraper/SKILL.md` §10 for the full write-path contract.

## 7. Enrichment metrics

`enrichment-metrics.service.ts`. In-memory singleton (no persistence) that accumulates counters across the enrichment pipeline. See `src/main/scrapers/README.md` for the full counter table and admin endpoint response shape.

## 8. Store registration for cron scheduler

Each store module must register itself in the `StoreRegistry` at bootstrap so the cron scheduler can route scraping jobs to the correct queue. Create an `index.ts` at the store root:

```typescript
// src/main/scrapers/revolico/index.ts
export function registerRevolicoStore(container: Container): void {
  const registry = container.get<StoreRegistry>(TYPES.StoreRegistry);
  registry.register('revolico', {
    displayName: 'Revolico',
    scrapingQueue: QUEUE_NAME.products_scraping,
    jobSchema: {
      fields: [
        { name: 'category', type: 'string', required: true, label: 'Categoría' },
        // ... store-specific fields
      ],
    },
  });
}
```

Call it in `app.ts` before `scheduler.initialize()`. The `jobSchema` fields drive dynamic forms in the admin dashboard — each store defines what parameters its scraping jobs accept.

When adding a new store, follow this same pattern: create the `index.ts`, register the store, and call it in `app.ts`.

## 9. Cross-references

| File | Covers |
|------|--------|
| `src/main/scrapers/README.md` | Pipeline diagram, data model tables, env vars, enrichment metrics, prompt curl examples |
| `src/main/scrapers/revolico/README.md` | Revolico architecture flow, curl/SQL transcripts, adding-a-scraper recipe |
| `.claude/skills/revolico-scraper/SKILL.md` | IIFE wrapper, CSS Modules selectors, JSONata 3 write-paths, `isPromoted` vs expression, `JsonataExtractionError` catalog, `llm:*` keys, rule write-paths |
| `src/main/CLAUDE.md` | DI, layers, queue system, logging, TDD workflow, coding constraints |
| `.claude/skills/testing/SKILL.md` | Jest, MongoMemoryServer, Prisma mocks, ALS mocks, ESM `jose` workaround |
| `.claude/skills/cron-scheduler/SKILL.md` | StoreRegistry, CronSchedulerService, store registration |
| `src/main/shared/container.ts` | DI bindings |
| `src/main/shared/types.container.ts` | Symbol definitions |
| `src/main/cron/store-registry.ts` | `IStoreConfig`, `IFieldSchema` |

## 10. Coding constraints

All constraints from `src/main/CLAUDE.md` apply, plus:

- **No hardcoded provider logic** in LLM calls. The `extractKeywords()` function reads `LLM_BASE_URL` / `LLM_MODEL` / `LLM_API_KEY` from env and works with any OpenAI-compatible endpoint. Never special-case a provider name (DeepSeek, OpenAI) in business logic.
- **Cache before LLM**. Always check `KeywordsCache` before calling `extractKeywords()`. LLM calls cost money and add latency. The orchestrator (`AttributeExtractorService.extract()`) enforces this: rules -> cache -> LLM. When calling `extractKeywords()` directly (bypassing the orchestrator), you MUST check the cache yourself.
- **Never throw from enrichment**. Attribute extraction is best-effort augmentation. A failed LLM call or a cache miss should degrade gracefully to an empty object, not crash the job. All enrichment functions return sensible defaults on failure.
- **Enrichment runs in PRODUCT_STORAGE**, not in the scraping jobs. This keeps scraping jobs fast and lets enrichment failures retry independently.
