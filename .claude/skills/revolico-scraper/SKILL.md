---
name: revolico-scraper
description: 'Use when editing files under src/main/scrapers/revolico/ — IIFE wrapper gotcha for buildEvalBody, CSS Modules prefix selectors, 3-path JSONata expression administration (API invalidates cache, seed/SQL do not), isPromoted set by service not expression, JsonataExtractionError catalog.'
applyTo: 'src/main/scrapers/revolico/**'
risk: low
---

# Revolico Scraper — Agent Notes

Load-bearing gotchas only. Architecture, full flow, curl/SQL transcripts,
and the "adding a new scraper" recipe live in
`src/main/scrapers/revolico/README.md`.

## 1. DOM tree — the IIFE wrapper is critical

`DOM_TO_JSON_SOURCE` ends with `return domToJson;`. Concatenate it with
a trailing `return` and the early return short-circuits:
`page.evaluate` returns the `domToJson` **function reference** —
`JSON.stringify` collapses it to `{}`. The tree is empty in the worker
even though Puppeteer "succeeded."

`buildEvalBody()` at `services/fetch-data.service.ts:107` exists solely
to wrap the source in an IIFE. **Never inline `DOM_TO_JSON_SOURCE`
directly into a page.evaluate body.**

## 2. Selectors — CSS Modules survival

Use `[class*="Prefix__Name"]` (prefix match). Suffixes regenerate per
Revolico build — never pin them. When Revolico renames a component,
change the **prefix**, not the suffix.

In use: `div[class*="GridList__CardsContainer"]` → `revolico:listing`;
`main` → `revolico:detail`.

## 3. JSONata expression administration — 3 paths, 1 cache rule

`ScraperConfigRegistry` caches each `storeKey` for 30 s. The three
write paths differ in whether they invalidate:

| Path | Invalidates cache? | Use when |
|---|---|---|
| `PUT/POST /api/revolicos/scraper-configs/:storeKey` | **Yes** (calls `invalidate`) | Hot change, no redeploy |
| `prisma/seed.ts` UPDATE branch | No | Versioned, reviewable, canonical |
| Raw SQL on `ScraperConfig` | No | Emergency rollback only |

After **seed** or **SQL** the worker picks up the new expression on
TTL expiry (≤ 30 s) or process restart. If you change the expression
via seed/SQL in production, restart the worker or wait 30 s before
running a job.

`prisma/seed.ts` is the source of truth for the two
`REVOLICO_*_EXPRESSION` strings. Always update seed (not API, not SQL)
for a permanent change so it lands in git with review.

## 4. `isPromoted` is set by the service, not the expression

JSONata expressions must NOT include `isPromoted` in their output.
`GenericListingScraperService._mapRow` sets it based on context: rows
from `result.products` → `false`; from `result.promoted` → `true`.
JSONata has no notion of which array a row came from.

`isOutstanding` IS set by the expression
(`$.attrs.title = "Anuncio destacado"`) — the badge is in the DOM
regardless of container.

## 5. Storage — Mongo + history

Collection: `products` (Mongoose pluralizes `Product`). **No tenant
isolation on Mongo** product data. `ProductRepository.bulkInsertOrUpdate`
upserts by `url` (unique) and `$push`es to `priceHistory`,
`viewsHistory`, `isOutstandingHistory`, `isPromotedHistory`,
`locationHistory`. Each history entry is `{ value, updatedAt }`.

## 6. `JsonataExtractionError` code catalog

| Code | Origin | Meaning → action |
|---|---|---|
| `CONFIG_MISSING` | registry | Row not in Postgres. Did `npm run seed` run? |
| `CONFIG_DISABLED` | registry | `enabled = false`. Re-enable. |
| `EMPTY_TREE` | scraper | Selector matched 0 elements → Revolico changed HTML. |
| `NO_PRODUCTS_EXTRACTED` | scraper | Selector matched but expression returned no rows. |
| `EXPRESSION_ERROR` | runner | Failed to compile or evaluate. |
| `TIMEOUT` | runner | Exceeded 5 s. |
| `NOT_SERIALIZABLE` | runner | Circular reference in result. |

Every error carries `expression` + a 2 KB `inputJson` snippet visible
in Bull-Board's `failedReason`. Read the snippet before guessing.

## 7. Cross-references

- `src/main/scrapers/revolico/README.md` — full flow, full curl/SQL, "adding a new scraper" recipe.
- `src/main/scrapers/CLAUDE.md` — scraper module AI instructions (architecture, enrichment pipeline).
- `src/main/scrapers/README.md` — human-readable scraper docs.
- `services/scraping/utils/dom-to-json.util.ts` — the browser-side helper loaded as a string.
- `errors/jsonata-extraction.error.ts` — closed code catalog from Section 6.

## 8. Product enrichment

After `ProductRepository.bulkInsertOrUpdate` completes, the `PRODUCT_STORAGE`
completion listener in `GenericListingScraperService` calls
`ProductService.enrichProduct()`. This runs two computations against the
stored product document, then writes the results back to MongoDB:

| Step | Service | Output field | Notes |
|---|---|---|---|
| 1. Analytics | `AnalyticsService.compute(product)` | `analytics` | 5 metrics: velocity, acceleration, trend, volatility, score. Pure math; no external calls. |
| 2. Attributes | `AttributeExtractorService.extract(product)` | `attributes` | Three-tier pipeline: rule-based extractors → keywords cache → LLM fallback. |

Both results are persisted via `ProductRepository.update(productId, { analytics, attributes })`.
Enrichment runs asynchronously after storage — it does NOT block the job completion.

The `PRODUCT_STORAGE` listener fires once per batch of stored products (not per
individual product). `ProductService.enrichProduct()` iterates over the batch
and calls both services for each product.

## 9. New product fields

The `Product` document (Mongoose model) has grown beyond the original
`url` + `price` + `title` shape. These fields are set during scraping
and enrichment:

| Field | Type | Set by | When |
|---|---|---|---|
| `metadata` | `{ source, schemaVersion, scrapedAt }` | `GenericListingScraperService._mapRow` | During row mapping (before storage) |
| `tags` | `string[]` | (default `[]`) | User-managed; populated via admin API, not the scraper |
| `attributes` | `Record<string, unknown>` | `AttributeExtractorService.extract()` | During enrichment (after storage) |
| `analytics` | `Record<string, unknown>` | `AnalyticsService.compute()` | During enrichment (after storage) |
| `enrichmentHash` | `string` | `ProductService.enrichProduct()` | MD5 of description. Guards against redundant re-extraction. |

All five fields are persisted in `ProductRepository.bulkInsertOrUpdate` via
`$set` on upsert (alongside the existing `url`, `price`, `title`, etc.).
The `tags` field defaults to an empty array on insert and is never
overwritten by the scraper — only the admin API modifies it.

## 10. ScraperConfig `llm:*` keys

`ScraperConfig` (Postgres table, Prisma model) supports `storeKey` values
with the `llm:` prefix. These keys skip JSONata expression validation in
`ScraperConfigRegistry` because they store raw LLM prompts, not
expressions.

| Key | Purpose | Content |
|---|---|---|
| `llm:keyword-extraction-prompt` | System prompt for the LLM extractor | Instructions telling the LLM how to extract product attributes from a page |

`llm:*` keys are read by `LlmExtractorService` (part of the attribute
extraction pipeline). They are editable via the same
`PUT/POST /api/revolicos/scraper-configs/:storeKey` API as expression
keys. The API path invalidates the cache on write just like expression
keys, but the consumer is the LLM service rather than the JSONata runner.

Future `llm:*` keys (e.g. `llm:category-classifier-prompt`,
`llm:condition-evaluator-prompt`) follow the same pattern: store the
prompt text in `ScraperConfig.value`, name it `llm:<purpose>`, and let
the relevant service read it through `ScraperConfigRegistry`.

## 11. Enrichment metrics

`EnrichmentMetricsService` (`src/main/scrapers/services/enrichment-metrics.service.ts`)
is an in-memory singleton (no persistence) that accumulates counters across
every decision in the enrichment pipeline. It is injected into
`ProductService` and `AttributeExtractorService`.

**Admin endpoint:** `GET /api/admin/dashboard/enrichment` (SUPER_ADMIN only).
Returns counters, computed rates, LLM token usage, and estimated cost savings.

**Env var:** `LLM_COST_PER_MILLION_TOKENS` (optional). Used to compute
`estimatedSavingsUSD` in the metrics response. If unset, savings are 0.

See `src/main/scrapers/CLAUDE.md#7` for the full counter table and usage.

## 12. Rule word lists — 3 write paths, same cache rule as JSONata

The six word-list categories (`brands`, `conditions`, `colors`, `propertyTypes`,
`locations`, `warrantyKeywords`) follow the exact same write-path contract as
`ScraperConfig` expressions (Section 3):

| Path | Invalidates cache? | Use when |
|---|---|---|
| `PUT/POST /api/admin/rules/:ruleKey` | **Yes** (calls `invalidate`) | Hot change, no redeploy |
| `prisma/seed.ts` (via `rule-fallbacks.ts`) | No | Versioned, reviewable, canonical |
| Raw SQL on `Rule` | No | Emergency rollback only |

**Add a new word to a rule list:** edit `rule-fallbacks.ts` FIRST (it is the
canonical source and the cold-start fallback), then run `npm run seed`. If
you need the change live immediately without a restart, also hit the admin API.

After **seed** or **SQL** the extractor picks up the new values on TTL expiry
(≤ 30 s) or process restart. After **API** the cache is invalidated instantly.

Never edit `rule-based-extractor.service.ts` to add a word — the word lists
were removed from that file. The extractor reads from `RuleRegistryService.get()`,
which returns from an in-memory `Map` synchronously.
