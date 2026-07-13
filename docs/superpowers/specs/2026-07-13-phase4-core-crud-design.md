# Phase 4: Core CRUD — Completion Spec

**Branch:** feat/admin-web-phase-4-core-crud
**Approach:** 3 parallel agents, TDD, i18n on all user-facing text.

## Accounts Agent

### Missing features
1. **Search** — text input above table, 300ms debounce, updates query params
2. **Delete** — AlertDialog confirmation → DELETE /api/admin/accounts/:id → invalidate list
3. **Bulk actions** — master checkbox in header, sticky action bar when ≥1 selected, bulk delete placeholder

### Existing to fix
- Tests in `src/features/accounts/__tests__/` — ensure i18n usage
- All labels/buttons/text use `useTranslation()`

## Users Agent

### Missing features
1. **Search** — text input for email/username search
2. **Detail drawer** — click row opens drawer with user info (name, email, roles, verified status, created date)
3. **Role assignment** — inside drawer: add/remove roles via POST/DELETE `/api/admin/users/:userId/roles/:roleId`
4. **Delete** — AlertDialog confirmation

### Existing to fix
- Create `__tests__/` with TDD tests
- All user-facing text uses i18n

## Roles Agent

### Missing features
1. **List** — GET /api/admin/roles → table with role name, user count
2. **Create** — Button opens dialog/form → POST /api/admin/roles
3. **Delete** — AlertDialog confirmation → DELETE /api/admin/roles/:id
4. **Assign** — reuse user drawer role assignment (Users agent handles this)

### Existing to fix
- Create full feature: service, hooks, mapper, view-model, table component
- TDD tests in `__tests__/`
- All user-facing text uses i18n

## Shared Constraints (all agents)
- **TDD**: write tests FIRST, watch them fail, then implement
- **i18n**: add keys to `en.json` and `es.json`, use `useTranslation()`
- **API**: real backend at localhost:3000, fields from `swagger.json`
- **Design tokens**: Tailwind classes from DESIGN.md — no raw hex
- **Components**: handle loading (skeleton), error (retry), empty, data states
- **lint**: `eslint . --max-warnings 0` must pass
- **typecheck**: `tsc --noEmit` must pass
