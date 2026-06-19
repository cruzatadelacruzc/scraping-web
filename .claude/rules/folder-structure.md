---
description: 'Canonical folder structure for src/main/<module>/ — based on scrapers/revolico pattern. Use when creating a new module or adding files to an existing one.'
applyTo: 'src/main/**'
---

# Folder Structure — Canonical Layout

The canonical layout for a module is based on **`src/main/scrapers/revolico/`** (the most complete reference in the repo). Follow this pattern when creating new modules or when restructuring existing ones.

## Reference pattern

```
src/main/<module>/
├── controllers/                      # *.controller.ts (one per resource)
│   └── middleware/                   # *.middleware.ts (module-specific middleware)
├── services/                         # *.service.ts (business logic)
│   └── dto/                          # *.dto.ts (request/response DTOs)
├── repositories/                     # *.repository.ts (DB access)
├── errors/                           # *.error.ts (domain error classes)
├── mappers/                          # *.mapper.ts (pure model ↔ DTO)
├── utils/                            # *.util.ts (module helpers, optional)
├── models/                           # *.model.ts (Mongoose models, optional)
└── <module-specific>/                # e.g. conditions/, types/, scrapers/ — module-only subdomains
    └── *.ts
```

## Why scrapers/revolico

It is the most complete reference — it has controllers (with a sub-middleware folder), services (with a `dto/` subfolder), repositories, errors, models, and utils. Other modules (`alarms/`, `users/`) deviate because they were created incrementally before the canonical pattern was agreed on. New code follows this layout. Existing modules may be migrated opportunistically — do not break unrelated work to do so.

## Creation rule

- Create a subdirectory ONLY when there are files to place in it. Do not create empty folders.
- If you need a DTO → it goes in `services/dto/`. Create the folder if it doesn't exist.
- If you need a mapper → it goes in `mappers/`.
- If you need an error class → it goes in `errors/`.
- If you need a controller → it goes in `controllers/`.
- Module-specific concerns (e.g. `conditions/` for alarms, `types/` for users) can be added at the module root when no existing category fits.

## Examples in this repo

| Module             | Has                    | Missing (relative to canonical)                  |
|--------------------|------------------------|--------------------------------------------------|
| `scrapers/revolico`| All categories         | (none — full canonical)                          |
| `alarms`           | controllers, services, dto, repositories, errors, mappers, conditions | middleware subfolder, utils, models |
| `users`            | controllers, services, dto, repositories, errors, mappers, types | middleware subfolder, utils, models |

When adding code to `alarms/` or `users/`, follow the canonical pattern as closely as possible — e.g. create `controllers/middleware/` the first time you add a module-specific middleware, even if it doesn't exist yet.

## Anti-patterns

- `dto/` at module root — use `services/dto/` instead.
- Bare `.ts` files at module root (e.g. `alarms/engine.ts`) — put them in the appropriate category folder. Engine-style entry points can live at module root if they truly aggregate the module, but anything with logic goes in a subfolder.
- Mixing concerns: business logic in controllers, DB calls in services, Prisma queries in mappers.
- Creating empty directories "just in case" — directories exist to contain files.
- Deep imports that bypass the module (`../../services/auth` instead of `@users/services/auth`).

## Verification

Before merging a new module or a significant change to module layout:

```bash
# Show the current structure of the module
tree src/main/<module>/

# Compare against scrapers/revolico
tree src/main/scrapers/revolico/
```

Update this rule if the canonical pattern changes (e.g. a new category is introduced).