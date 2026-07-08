---
description: 'AI agent instructions for the scraper module: shared enrichment, store-specific scrapers, queue wiring'
applyTo: 'src/main/scrapers/**'
---

# Scraper Module — Agent Instructions

## 1. Module structure

```
src/main/scrapers/
├── services/                          # Shared enrichment (attribute-extractor/)
│   └── attribute-extractor/           # Rules → cache → LLM pipeline
└── revolico/                          # Store-specific scraper
    ├── controllers/                   # Admin API for expressions, configs
    ├── services/
    │   ├── scraping/                  # DOM fetch, JSONata execution, config registry
    │   └── analytics.service.ts       # Pure computed metrics
    ├── repositories/
    ├── models/                        # Mongoose Product schema
    ├── errors/                        # JsonataExtractionError catalog
    ├── queues.ts                      # IQueueModule wiring
    └── README.md                      # Full flow, curl/SQL, "adding a scraper" recipe
```

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

### 2.2 RuleBasedExtractorService

`rule-based-extractor.service.ts`. Deterministic regex patterns for Spanish classified-ad descriptions. 13 pattern categories:

brand (35 brands), propertyType, condition, rooms, bathrooms, garage, floors, color (34 colors), storage (GB/TB/MB), RAM, delivery/location (56 locations), warranty, originalPrice.

Confidence = `matchedCount / 13`. Threshold is 0.4 in the orchestrator. Accent-stripping applied to all input so `súper` matches `super`. Purely synchronous, no I/O.

### 2.3 extractKeywords() (LLM)

`llm-extractor.service.ts`. Standalone async function (not a class). Uses Vercel AI SDK (`generateText` from `ai`) with `@ai-sdk/openai-compatible` provider and `response_format: json_object` injected via custom fetch (compatible with DeepSeek thinking mode). JSON output is parsed and Zod-validated manually.

Three env vars drive it: `LLM_BASE_URL`, `LLM_MODEL`, `LLM_API_KEY`. If any is missing, returns `{ keywords: [] }` silently (logs a warning). Supports any OpenAI-compatible endpoint (DeepSeek, OpenAI, custom base URL). An optional `LLM_ENABLE_REASONING` env var controls DeepSeek-style thinking mode (defaults to `true`; set to `false` to save tokens on simple extraction tasks).

Output validated by Zod schema: `{ keywords: z.array(z.string()).max(5) }`. Temperature 0. Returns `{ keywords: [] }` on any failure (network, timeout, bad response, malformed JSON). Never throw.

### 2.4 KeywordsCache

`keywords-cache.ts`. Two-layer cache:

- **Layer 1 (memory)**: `Map<string, string[]>` -- sub-millisecond lookup, lives for the process lifetime.
- **Layer 2 (MongoDB)**: `keyword_cache` collection with TTL index on `createdAt` (default 30 days, configured by `LLM_CACHE_TTL_DAYS` env var).

Key: MD5 hex of `description.trim().toLowerCase()`. Mongo hits auto-promote to memory. Mongo write failures are silently swallowed (cache is best-effort). Instantiated directly (bind to self in container).

### 2.5 DI registration pattern

All three classes (`AttributeExtractorService`, `RuleBasedExtractorService`, `KeywordsCache`) are registered in `src/main/shared/container.ts`. They bind to themselves (class-as-token) because they have no interfaces:

```typescript
container.bind<RuleBasedExtractorService>(RuleBasedExtractorService).to(RuleBasedExtractorService).inSingletonScope();
container.bind<AttributeExtractorService>(AttributeExtractorService).to(AttributeExtractorService).inSingletonScope();
```

`AnalyticsService` is registered via a Symbol: `container.bind<AnalyticsService>(TYPES.AnalyticsService).to(AnalyticsService).inSingletonScope()`.

When adding a new shared service: bind to self (class token) unless a store-specific implementation is expected (then use a `TYPES.Symbol` in `types.container.ts`).

## 3. Analytics service

`revolico/services/analytics.service.ts`. Pure computation -- **no DB, no I/O, no side effects**. The caller persists results to MongoDB.

5 metrics derived from history arrays:

| Metric | Method | Window | Formula |
|--------|--------|--------|---------|
| `viewsPerDay` | `_computeViewsPerDay` | all-time | views / days since first scrape |
| `priceTrend` | `_computePriceTrend` | last 5 points | linear regression; slope > 2% avg = upward, < -2% = downward |
| `priceVolatility` | `_computePriceVolatility` | last 10 points | CV = stddev / mean |
| `priceChanges` | (inline) | all-time | max(0, history.length - 1) |
| `hotScore` | `_computeHotScore` | all-time | viewsPerDay * outstandingBonus * priceDropBonus |

Returns `null` when the product has zero price history entries. The `hotScore` formula: `viewsPerDay * (isOutstanding ? 2.0 : 1.0) * (lastPrice < prevPrice ? 1.5 : 1.0)`, rounded to 2 decimals.

## 4. Queue flow

Defined in `revolico/queues.ts`. Three queues registered via `IQueueModule`:

```
PRODUCTS_SCRAPING  ──(scrape listing page)──▶  PRODUCT_STORAGE  ──(upsert products)──▶  (enrichment hooks)
                                                                                       │
PRODUCT_SCRAPING   ◀──(fan-out detail pages)────────────────────────────────────────────┘
```

1. **PRODUCTS_SCRAPING**: JSONata-driven listing scraper (`GenericListingScraperService`). Expression from `ScraperConfig` `"revolico:listing"`. Emits `ProductDataFromListDTO[]`.
2. **PRODUCT_STORAGE**: Upserts products via `ProductService`. Runs enrichment hooks (attribute extraction, analytics) here. Fans out per-product `PRODUCT_SCRAPING` jobs for detail scraping.
3. **PRODUCT_SCRAPING**: JSONata-driven detail scraper (`GenericDetailScraperService`). Expression from `ScraperConfig` `"revolico:detail"`. Updates product with detail page data.

`ScrapingProductsService.setupQueueListeners()` fans listing results into `PRODUCT_STORAGE` jobs. `ProductService.setupQueueListeners()` fans stored products into `PRODUCT_SCRAPING` detail jobs.

Failed-job listener logs at error level with `jobId`, `jobName`, `reason`, `data`, and for `JsonataExtractionError`: `code`, `expression`, and a 2 KB `inputJsonSnippet`.

## 5. MongoDB product model

`revolico/models/product.model.ts`. Collection: `products` (Mongoose pluralizes `Product`).

Key fields:

| Field | Type | Notes |
|-------|------|-------|
| `url` | string | Unique, upsert key |
| `ID` | string | Unique, internal listing ID |
| `price` | number | Current price |
| `currency` | string | CUP, USD, etc. |
| `description` | string | Raw listing text -- input for enrichment |
| `isOutstanding` | boolean | Set by expression (`attrs.title = "Anuncio destacado"`) |
| `isPromoted` | boolean | Set by **service** (`_mapRow`), NOT the expression. Promoted rows come from `result.promoted` array. |
| `category` / `subcategory` | string | Listing taxonomy |
| `location` | { state, municipality } | Extracted during scraping |
| `seller` | { name, phone, email, whatsapp } | Extracted from listing |
| `views` | number | Current view count |
| `priceHistory` | [{ value, updatedAt }] | Appended on every upsert when price changes |
| `viewsHistory` | [{ value, updatedAt }] | Appended when views change |
| `isOutstandingHistory` | [{ value, updatedAt }] | Appended when outstanding status changes |
| `isPromotedHistory` | [{ value, updatedAt }] | Appended when promoted status changes |
| `locationHistory` | [{ value, updatedAt }] | Appended when location changes |

Timestamps: `createdAt` / `updatedAt` via Mongoose `{ timestamps: true }`.

**No tenant isolation** on MongoDB product data. Scraped products are shared across all tenants. Prisma tenant extensions do NOT apply here.

## 6. LLM prompt management

The system prompt for keyword extraction is stored in the `ScraperConfig` database table (PostgreSQL, via Prisma), not hardcoded.

- **Store key**: `llm:keyword-extraction-prompt`
- **Field**: `expression` (string column, reused from JSONata expression storage)
- **CRUD**: Existing `ScraperConfig` API at `PUT/POST/DELETE /api/revolicos/scraper-configs/:storeKey`
- **Seed**: `npm run seed` inserts the canonical prompt into `ScraperConfig`
- **Fallback**: `FALLBACK_SYSTEM_PROMPT` constant in `llm-extractor.service.ts` (~600 tokens, Spanish-language few-shot). Used ONLY when the DB prompt is missing or unreachable.

When the fallback is used, `AttributeExtractorService._loadSystemPrompt()` logs an `[ALERT]`-prefixed warning at warn level. This is a signal to the operator that the DB prompt is missing -- it should be seeded or set via API. The fallback ensures the pipeline never breaks on a missing config.

The `ScraperConfigRegistry` (in `revolico/services/scraping/`) caches each `storeKey` for 30 seconds. API writes invalidate the cache. Seed and raw SQL do NOT -- the worker picks up the new value on TTL expiry or process restart.

## 7. Enrichment metrics

`enrichment-metrics.service.ts`. In-memory singleton (no persistence) that accumulates counters across the enrichment pipeline. Exposed via admin API at `GET /api/admin/dashboard/enrichment` (`SUPER_ADMIN` only).

### 7.1 Counters

Every decision point in the 4-layer pipeline increments a counter:

| Recorder | When | Layer |
|----------|------|-------|
| `recordEnrichment()` | Every `enrichProduct()` call | entry |
| `recordEnrichmentHashSkip()` | Description unchanged since last enrichment | enrichmentHash guard |
| `recordRuleHighConfidence()` | Rule confidence >= 0.4 | rule-based extractor |
| `recordCacheHit()` | KeywordsCache hit (memory or MongoDB) | cache |
| `recordCacheMiss()` | KeywordsCache miss (proceeds to LLM) | cache |
| `recordLlmCall(usage)` | LLM returned successfully | LLM |
| `recordLlmFailure()` | LLM threw (network, timeout, etc.) | LLM |

### 7.2 LLM provider usage

`extractKeywords()` now returns `ExtractKeywordsResult` which includes `usage?: LlmUsage` from the AI SDK `generateText` response. `LlmUsage` carries:
- `promptCacheHitTokens` — tokens served from the provider's prompt cache
- `promptCacheMissTokens` — tokens recomputed by the provider
- `completionTokens` — tokens generated in the response

These are accumulated in `recordLlmCall()`. The endpoint calculates rates and estimated savings.

### 7.3 Admin endpoint

`GET /api/admin/dashboard/enrichment` — `SUPER_ADMIN` only. Returns `EnrichmentMetricsSnapshot`:
- All raw counters
- Computed rates (skip rate, cache hit rate, LLM failure rate, LLM cache hit rate)
- Token totals (prompt cache hit/miss, completion)
- `estimatedSavingsUSD` — `(promptCacheHitTokens / 1e6) * LLM_COST_PER_MILLION_TOKENS`
- `costPerMillionTokens` — value read from env var (0 if unset)

### 7.4 Env var

`LLM_COST_PER_MILLION_TOKENS` — price per 1M input tokens in USD. Optional.
Examples: DeepSeek = 0.14, OpenAI = 2.50, Anthropic = 3.00.
If unset, `estimatedSavingsUSD` is always 0.

## 8. Cross-references

- `.claude/skills/revolico-scraper/SKILL.md` -- Revolico-specific gotchas: IIFE wrapper, CSS Modules selectors, JSONata expression administration (3 write paths, cache invalidation rules), `isPromoted` service vs expression, `JsonataExtractionError` code catalog
- `src/main/scrapers/revolico/README.md` -- Human documentation: full architecture flow, curl/SQL transcripts, "adding a new scraper" recipe
- `src/main/CLAUDE.md` -- General code patterns: DI, layers, queue system, logging, TDD workflow, coding constraints
- `.claude/skills/testing/SKILL.md` -- Jest patterns, MongoMemoryServer, Prisma mocks, ALS mocks, ESM `jose` workaround
- `src/main/shared/container.ts` -- DI registrations for all scraper services
- `src/main/shared/types.container.ts` -- Symbol definitions (`TYPES.ScraperConfigRegistry`, `TYPES.AnalyticsService`, etc.)

## 9. Coding constraints

All constraints from `src/main/CLAUDE.md` apply, plus:

- **No hardcoded provider logic** in LLM calls. The `extractKeywords()` function reads `LLM_BASE_URL` / `LLM_MODEL` / `LLM_API_KEY` from env and works with any OpenAI-compatible endpoint. Never special-case a provider name (DeepSeek, OpenAI) in business logic.
- **Cache before LLM**. Always check `KeywordsCache` before calling `extractKeywords()`. LLM calls cost money and add latency. The orchestrator (`AttributeExtractorService.extract()`) enforces this: rules -> cache -> LLM. When calling `extractKeywords()` directly (bypassing the orchestrator), you MUST check the cache yourself.
- **Never throw from enrichment**. Attribute extraction is best-effort augmentation. A failed LLM call or a cache miss should degrade gracefully to an empty object, not crash the job. All enrichment functions return sensible defaults on failure.
- **Enrichment runs in PRODUCT_STORAGE**, not in the scraping jobs. This keeps scraping jobs fast and lets enrichment failures retry independently.
