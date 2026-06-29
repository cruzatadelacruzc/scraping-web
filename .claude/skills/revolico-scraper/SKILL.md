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
- `services/scraping/utils/dom-to-json.util.ts` — the browser-side helper loaded as a string.
- `errors/jsonata-extraction.error.ts` — closed code catalog from Section 6.
