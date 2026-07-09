# Scrapers

Multi-store scraping architecture for BazaarSentinel. Revolico is the first
store. New stores follow the same pattern and reuse the shared enrichment
services.

## Structure

```
src/main/scrapers/
├── README.md                  (this file)
├── revolico/                  Revolico-specific scraper
│   ├── controllers/           Admin API for scraping jobs + ScraperConfig CRUD
│   ├── services/
│   │   ├── scraping/          JSONata-driven listing + detail scrapers
│   │   ├── product.service.ts       Storage + fan-out to detail/alarms
│   │   └── analytics.service.ts     Pure computed metrics (no I/O)
│   ├── repositories/          MongoDB product persistence
│   ├── models/                Mongoose Product schema
│   ├── errors/                JsonataExtractionError catalog
│   ├── queues.ts              IQueueModule — 3-queue wiring
│   └── README.md              Revolico-specific docs
└── services/                  Shared across stores
    └── attribute-extractor/
        ├── attribute-extractor.service.ts   Orchestrator (rules → cache → LLM)
        ├── rule-based-extractor.service.ts  Deterministic regex patterns
        ├── rule-registry.service.ts         In-memory cache (Rule table → Map)
        ├── rule-fallbacks.ts               Canonical word-list defaults
        ├── repositories/
        │   └── rule.repository.ts           Prisma CRUD for Rule table
        ├── llm-extractor.service.ts         Provider-agnostic (Vercel AI SDK)
        └── keywords-cache.ts               2-layer cache (memory + MongoDB TTL)
```

## Overview

Each store is scraped by a config-driven pipeline. Extraction logic lives in
**JSONata expressions** stored in Postgres -- the TypeScript code is dumb and
reusable. A store directory contains the queue wiring, controllers, and
store-specific services. Cross-store enrichment (attribute extraction) lives
under `services/` and is shared.

## Scraping pipeline

Three BullMQ queues form the pipeline:

```
POST /api/revolicos/scraping/jobs  (SUPER_ADMIN)
  └─enqueue─► PRODUCTS_SCRAPING
                │  GenericListingScraperService
                │  1. Fetch page via Puppeteer + stealth
                │  2. Serialize DOM to JSON (domToJson helper)
                │  3. Evaluate JSONata expression from ScraperConfig
                │  4. Map rows → IRevolicoProduct[]
                │
                └─onCompleted─► PRODUCT_STORAGE
                                  │  ProductService.bulkAddOrEditUrls
                                  │  upsert to MongoDB (by url, with $push to history arrays)
                                  │
                                  └─onCompleted─► fan-out to PRODUCT_SCRAPING detail jobs
                                                │  GenericDetailScraperService
                                                │  fetch detail page → JSONata → update Mongo
                                                │
                                                └─ evaluateAlarms (non-blocking)
```

| Queue | Processor | Data source | What it does |
|---|---|---|---|
| `PRODUCTS_SCRAPING` | `GenericListingScraperService` | `revolico:listing` JSONata expression | Scrapes listing pages, extracts product cards |
| `PRODUCT_STORAGE` | `ProductService` | MongoDB | Upserts products, fans out detail jobs + alarms |
| `PRODUCT_SCRAPING` | `GenericDetailScraperService` | `revolico:detail` JSONata expression | Scrapes individual product detail pages |

JSONata expressions are stored in the `ScraperConfig` Postgres table and
cached in-memory (TTL 30s). They can be updated via REST API (hot), Prisma
seed (versioned, deploy-time), or raw SQL (emergency). The registry
invalidates on API writes; seed/SQL changes take effect on TTL expiry or
process restart.

See `src/main/scrapers/revolico/README.md` for the full expression
administration guide (curl, SQL, and validation commands).

## Product enrichment

After a product is stored in MongoDB, two enrichment pipelines run:

### Analytics

`AnalyticsService.compute(product)` is a pure function (no I/O) that derives
metrics from the product's history arrays:

| Metric | Window | Formula |
|---|---|---|
| `viewsPerDay` | all-time | views / days since first scrape |
| `priceTrend` | last 5 points | Linear regression; slope > 2% of avg = `upward`, < -2% = `downward` |
| `priceVolatility` | last 10 points | Coefficient of variation (stddev / mean) |
| `priceChanges` | all-time | `max(0, priceHistory.length - 1)` |
| `hotScore` | all-time | `viewsPerDay * outstandingBonus * priceDropBonus` |

Returns `null` when the product has zero price history.

### Attributes (keywords)

`AttributeExtractorService.extract(description)` is a best-effort hybrid
pipeline. It never throws -- always returns at minimum `{}`.

## Attribute extraction flow

```
description
  │
  ├─ empty? ── return {}
  │
  ├─ RuleBasedExtractorService.extract()
  │    13 pattern categories: brand, propertyType, condition, rooms,
  │    bathrooms, garage, floors, color, storage, RAM, delivery, warranty, price
  │    confidence = matchedCount / 13
  │    │
  │    ├─ confidence >= 0.4 ── return rule attributes  (no API cost)
  │    │
  │    └─ confidence < 0.4 ──► KeywordsCache.get()
  │                              │
  │                              ├─ hit ── return { keywords: [...] }  (no API cost)
  │                              │
  │                              └─ miss ──► extractKeywords() via LLM
  │                                            │
  │                                            ├─ success ── cache result + return
  │                                            └─ fail ── return { keywords: [] }
```

The rule-based extractor covers 13 categories with Spanish-language regex
patterns: 38 brands, 14 property types, 31 conditions, 34 colors, 53
locations, plus numeric parsers for rooms, bathrooms, floors, storage, RAM,
and price mentions.

## Keywords cache

Two-layer cache to avoid redundant LLM calls:

| Layer | Storage | Lifetime | Lookup |
|---|---|---|---|
| Memory | `Map<string, string[]>` | Process lifetime | Sub-millisecond |
| MongoDB | `keyword_cache` collection | TTL index (default 30 days) | ~1ms |

Cache key: `md5(description.trim().toLowerCase())` -- deterministic across
scrapes. Mongo hits auto-promote to memory. Mongo write failures are silently
swallowed (cache is best-effort, memory still holds the value for the
process lifetime).

TTL is configurable via `LLM_CACHE_TTL_DAYS` env var (default 30).

## LLM configuration

Provider-agnostic keyword extraction via Vercel AI SDK
(`generateText` with `response_format: json_object` + `@ai-sdk/openai-compatible`).
Three required env vars, one optional:

| Variable | Purpose |
|---|---|
| `LLM_BASE_URL` | Base URL for the OpenAI-compatible API (e.g. `https://api.deepseek.com/v1`) |
| `LLM_MODEL` | Model identifier (e.g. `deepseek-v4-flash`) |
| `LLM_API_KEY` | API key for the provider |
| `LLM_ENABLE_REASONING` | (optional) Enables DeepSeek thinking mode. Defaults to `true`. Set to `false` to save tokens. |
| `LLM_KEYWORD_EXTRACTION_PROMPT` | (optional) Custom system prompt for keyword extraction. Overrides the hardcoded fallback but is overridden by the DB-stored prompt. |

If any of `LLM_BASE_URL`, `LLM_MODEL`, or `LLM_API_KEY` is missing, LLM
extraction is skipped silently and returns `{ keywords: [] }`.

### Prompt management

The system prompt for keyword extraction is resolved via a three-tier chain:

```
DB (ScraperConfig llm:keyword-extraction-prompt)
  → Env var (LLM_KEYWORD_EXTRACTION_PROMPT)
    → Hardcoded FALLBACK_SYSTEM_PROMPT
```

- **DB**: manageable at runtime via the ScraperConfig REST API — no restart
  needed. The `llm:` prefix on the `storeKey` signals the repository to skip
  JSONata validation, so plain-text prompts are accepted.
- **Env var**: configurable at deploy time. Useful for ephemeral environments
  or CI where seeding the DB is impractical.
- **Hardcoded**: ~600-token Spanish few-shot with 5 examples. Safety net that
  guarantees the pipeline never breaks on a missing config.

To update the prompt at runtime:

```bash
curl -X PUT http://localhost:3000/api/revolicos/scraper-configs/llm:keyword-extraction-prompt \
  -H "Authorization: Bearer <super-admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"expression": "You are a keyword extraction assistant. ..."}'
```

The change takes effect immediately (the registry cache is invalidated on API
write). Seed the prompt via `npm run seed` to persist it across database resets.

Output is validated by Zod (`z.array(z.string())` — no artificial keyword
limit) with `temperature: 0`. Any failure (network, timeout, bad response)
returns `{ keywords: [] }`.

## Adding a new store

1. Create `src/main/scrapers/<store>/` with the canonical layout:
   `controllers/`, `services/scraping/`, `repositories/`, `models/`,
   `errors/`, `queues.ts`.

2. Implement a fetch-data service (`IFetchProductData`) for the store's
   specific URL patterns and DOM structure.

3. Define two `ScraperConfig` rows: `<store>:listing` and `<store>:detail`.
   Write the JSONata expressions and add them to `prisma/seed.ts`.

4. Create a listing scraper and a detail scraper following the
   `GenericListingScraperService` / `GenericDetailScraperService` pattern:
   inject `IFetchProductData`, `JsonataRunnerService`,
   `ScraperConfigRegistryService`, `ILogger`. Each needs a `processor(ctx)`
   method and a private static `SELECTOR` + `STORE_KEY`.

5. Implement an `IQueueModule` class (see `revolico/queues.ts`) that maps
   queue names to processors and wires completion listeners for fan-out.

6. Register new classes in `src/main/shared/container.ts` and add symbols
   to `src/main/shared/types.container.ts`.

7. Reuse shared enrichment: `AttributeExtractorService`,
   `AnalyticsService`, and `KeywordsCache` work with any store's product
   descriptions. No modification needed.

8. Register OpenAPI schemas in `src/main/docs/schema-registry.ts` and create
   paths in `src/main/docs/modules/<store>.paths.ts`.

## Data model

Products are stored in MongoDB (`products` collection) with Mongoose. No
tenant isolation applies -- scraped product data is shared across all
tenants.

### Core fields

| Field | Type | Notes |
|---|---|---|
| `url` | string | Unique, upsert key |
| `ID` | string | Unique, internal listing ID |
| `category` | string | Listing category |
| `subcategory` | string | Listing subcategory |
| `description` | string | Raw listing text -- input for attribute extraction |
| `cost` | string | Raw cost string from the listing |
| `currency` | string | CUP, USD, etc. |
| `price` | number | Numeric price |
| `imageURL` | string | Listing image |
| `isOutstanding` | boolean | Highlighted/featured listing |
| `isPromoted` | boolean | Paid promotion (set by service, not expression) |

### Detail fields (populated by detail scraper)

| Field | Type | Notes |
|---|---|---|
| `views` | number | View count |
| `location` | `{ state, municipality }` | Geographic location |
| `seller` | `{ name, phone, email, whatsapp }` | Seller contact info |

### History arrays

Every field that changes over time tracks its history. On upsert, new values
are `$push`ed with a timestamp:

| Array | Entry shape | When appended |
|---|---|---|
| `priceHistory` | `{ value: number, updatedAt: Date }` | Price changes |
| `viewsHistory` | `{ value: number, updatedAt: Date }` | Views change |
| `isOutstandingHistory` | `{ value: boolean, updatedAt: Date }` | Outstanding status changes |
| `isPromotedHistory` | `{ value: boolean, updatedAt: Date }` | Promoted status changes |
| `locationHistory` | `{ value: { state, municipality }, updatedAt: Date }` | Location changes |

These history arrays feed the analytics service. Price history is the
minimum requirement -- analytics returns `null` without it.

### Enrichment fields

Computed by the enrichment pipeline after storage and persisted to the
product document:

| Field | Source | Notes |
|---|---|---|
| `analytics` | `AnalyticsService.compute()` | `viewsPerDay`, `priceTrend`, `priceVolatility`, `priceChanges`, `hotScore`, `computedAt` |
| `attributes` | `AttributeExtractorService.extract()` | Rule-extracted fields or `{ keywords: [...] }` |
| `enrichmentHash` | `ProductService.enrichProduct()` | MD5 of the description used for last enrichment; skips extraction on re-scrape when unchanged |
| `metadata` | Pipeline | Last-enrichment timestamps and status |

Timestamps (`createdAt`, `updatedAt`) are managed by Mongoose
`{ timestamps: true }`.

## Enrichment metrics

The `EnrichmentMetricsService` is an in-memory singleton (not persisted) that
accumulates counters across every decision point in the enrichment pipeline.
Metrics reset on process restart — no DB dependency.

### Counters

| Recorder | When | Layer |
|---|---|---|
| `recordEnrichment()` | Every `enrichProduct()` call | entry |
| `recordEnrichmentHashSkip()` | Description unchanged since last enrichment | enrichmentHash guard |
| `recordRuleHighConfidence()` | Rule confidence ≥ 0.4 (skips cache + LLM) | rule-based extractor |
| `recordCacheHit()` | KeywordsCache hit (memory or MongoDB) | cache |
| `recordCacheMiss()` | KeywordsCache miss (proceeds to LLM) | cache |
| `recordLlmCall(usage)` | LLM returned successfully (accumulates tokens) | LLM |
| `recordLlmFailure()` | LLM threw (network, timeout, etc.) | LLM |

### LLM provider tokens

The `extractKeywords()` function now returns `IExtractKeywordsResult` with an
optional `usage` field. The AI SDK exposes:
- `inputTokenDetails.cacheReadTokens` — tokens served from the provider's prompt cache
- `inputTokenDetails.noCacheTokens` — tokens recomputed by the provider
- `outputTokens` — tokens generated in the response

### Admin endpoint

`GET /api/admin/dashboard/enrichment` — `SUPER_ADMIN` only. Returns:

```json
{
  "startedAt": "2026-07-07T12:00:00.000Z",
  "totalEnrichments": 150,
  "enrichmentHashSkips": 45,
  "enrichmentHashSkipRate": 0.3,
  "ruleHighConfidence": 60,
  "ruleHighConfidenceRate": 0.57,
  "cacheHits": 20,
  "cacheMisses": 25,
  "cacheHitRate": 0.44,
  "llmCalls": 23,
  "llmFailures": 2,
  "llmFailureRate": 0.08,
  "llmPromptCacheHitTokens": 12000,
  "llmPromptCacheMissTokens": 8000,
  "llmCompletionTokens": 3500,
  "llmCacheHitRate": 0.6,
  "estimatedSavingsUSD": 0.00168,
  "costPerMillionTokens": 0.14
}
```

The `estimatedSavingsUSD` is calculated as `(promptCacheHitTokens / 1e6) * LLM_COST_PER_MILLION_TOKENS`. If the env var is not set, both `estimatedSavingsUSD` and `costPerMillionTokens` are `0`.

### Env var

`LLM_COST_PER_MILLION_TOKENS` — price per 1M input tokens in USD (optional).
Examples: DeepSeek $0.14, OpenAI $2.50, Anthropic $3.00.

## Related files

| Topic | File |
|---|---|
| Revolico-specific docs | `src/main/scrapers/revolico/README.md` |
| Agent instructions (scraper) | `src/main/scrapers/CLAUDE.md` |
| Agent instructions (general) | `src/main/CLAUDE.md` |
| Product base interfaces | `src/main/shared/product-base.interface.ts` |
| DI container (scraper bindings) | `src/main/shared/container.ts` |
| Type symbols | `src/main/shared/types.container.ts` |
| JSONata seed expressions | `prisma/seed.ts` |
| ScraperConfig Prisma schema | `prisma/schema.prisma` |
