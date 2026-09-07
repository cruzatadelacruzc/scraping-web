# Products Module — Customer-Facing Catalog

Read-only catalog over the scraped product data in MongoDB. It exists so
customers (`ACCOUNT_OWNER`) can browse and pick a real listing when creating
an alarm, instead of pasting a raw product URL.

## What it does

| Endpoint | Role | Purpose |
|---|---|---|
| `GET /api/products` | `ACCOUNT_OWNER` | Paginated catalog search (text / category / price filters, sortable) |
| `GET /api/products/categories` | `ACCOUNT_OWNER` | Distinct `category → subcategories` groups for filter UIs |

`GET /api/products` query params (`ProductCatalogQueryDTO`):

| Param | Type | Default | Notes |
|---|---|---|---|
| `skip` | number ≥ 0 | `0` | offset cursor |
| `limit` | number 1–50 | `20` | page size |
| `sort` | `createdAt` \| `price` \| `views` | `createdAt` | |
| `order` | `asc` \| `desc` | `desc` | |
| `search` | string | — | case-insensitive regex on `description` (input is regex-escaped) |
| `category` / `subcategory` | string | — | exact match |
| `minPrice` / `maxPrice` | number ≥ 0 | — | inclusive range on `price` |

The response is `IPaginatedResponse<ProductCatalogItemType>` — a reduced item
shape with **no internal flags and no seller contact data** (only
`seller.name`). Price/views/location history arrays are projected out at the
Mongo level (`CATALOG_PROJECTION`).

## How it's wired

- **No tenant isolation.** Mongo product data is shared across tenants by
  design — the module reuses `@scrapers/revolico/repositories/ProductRepository`
  directly rather than owning a repository.
- **Layers**: `ProductCatalogController` → `ProductCatalogService` →
  `ProductRepository`. The service builds the Mongo filter / aggregation
  pipeline; the repository runs it. The mapper (`toProductCatalogItem`) is pure.
- **DI**: `TYPES.ProductCatalogService` + `TYPES.ProductCatalogController` in
  `shared/types.container.ts`, bound in `shared/container.ts`. The controller is
  auto-registered by `inversify-express-utils`.
- **OpenAPI**: schemas in `src/main/docs/schema-registry.ts`, paths in
  `src/main/docs/modules/products.paths.ts` (tag `Products`). Run
  `npm run docs:generate` after any DTO/endpoint change.

## Structure

```
src/main/products/
├── controllers/product-catalog.controller.ts
├── services/
│   ├── product-catalog.service.ts
│   └── dto/
│       ├── product-catalog-query.dto.ts   # request (Zod + from())
│       └── product-catalog-item.dto.ts    # response item + category group
└── mappers/product-catalog.mapper.ts      # pure model → DTO
```

No `repositories/` folder — see "How it's wired" above.

## How to test

```bash
docker compose up -d postgres          # integration test boots the App
npm run test -- --testPathPattern="product-catalog"
```

- `src/__tests__/unit/products/product-catalog.service.test.ts` — filter /
  pipeline building, mapper reduction, pagination math.
- `src/__tests__/unit/products/product-catalog.mapper.test.ts` — pure mapping.
- `src/__tests__/integration/product-catalog-authz.test.ts` — role gating
  (`ACCOUNT_OWNER` only; `MEMBER` / unauthenticated rejected).
