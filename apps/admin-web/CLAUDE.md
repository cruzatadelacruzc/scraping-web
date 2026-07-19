# Super Admin SPA — `apps/admin-web/`

React 18 + Vite 5 SPA that consumes the `bazaarsentinel` API (`src/main/`). This document describes the architecture, conventions, and patterns an agent follows when building features within this SPA.

## Governing Documents

Read these before any UI work — they form a hierarchy:

1. `@./DESIGN.md` — visual identity (brand book: palette, typography, depth, shape, component recipes)
2. `@../../.claude/rules/admin-web-ui.md` — behavioral & code conventions (layout, tables, charts, async states, toasts, destructive actions)
3. `@../../.claude/plans/oye-comenzamos-con-otra-wobbly-snowflake.md` — development plan (7 phases, architectural decisions, DoD per phase)
4. `@../../.plans/super-admin-dashboard-plan.md` — mirror copy of the development plan
5. This file — architectural constraints, patterns, and how the SPA is wired together

## Stack

| Layer           | Technology                                       |
| --------------- | ------------------------------------------------ |
| Framework       | React 18 + Vite 5                                |
| Language        | TypeScript (strict mode, target ES2022)          |
| Routing         | React Router v6 (lazy loading per feature)       |
| Server State    | TanStack Query v5                                |
| Tables          | TanStack Table v8                                |
| Forms           | React Hook Form + Zod                            |
| UI Primitives   | shadcn/ui (Radix + Tailwind)                     |
| Charts          | Recharts (+ Tremor optional for KPI delta cards) |
| Toasts          | sonner                                           |
| Command Palette | cmdk                                             |
| Icons           | lucide-react                                     |
| Testing         | Vitest + React Testing Library                   |
| Mock API        | MSW (Mock Service Worker)                        |
| Dev Docs        | Storybook                                        |
| Dates           | date-fns + date-fns-tz                           |

## Commands (from monorepo root)

| Command                               | Purpose               |
| ------------------------------------- | --------------------- |
| `npm run dev -w apps/admin-web`       | Start Vite dev server |
| `npm run build -w apps/admin-web`     | Production build      |
| `npm run test -w apps/admin-web`      | Run Vitest tests      |
| `npm run lint -w apps/admin-web`      | ESLint                |
| `npm run storybook -w apps/admin-web` | Start Storybook       |
| `npm run typecheck -w apps/admin-web` | tsc --noEmit          |

## Architecture

### Monorepo

This directory lives inside an npm workspaces monorepo (`workspaces: ["apps/*"]` in root `package.json`). The SPA is an independent application — it does NOT depend on backend types, Zod schemas, or DTOs. `packages/` at the monorepo root is reserved for truly shared code (UI components, utilities, config, stable enums) extracted when the need arises organically.

### Contracts

The frontend defines its **own** DTOs, ViewModels, and Zod schemas. `swagger.json` is documentation only (`/api-docs`) — never a source for code generation. The API Client layer is the single boundary between frontend and backend.

### Feature Folder Structure (canonical)

```
features/<module>/
├── components/           # Presentational React components
├── hooks/                # useGetX, useCreateX, useUpdateX, useDeleteX + query keys
├── services/             # Raw API calls (no transformation), one file per resource
├── mappers/              # Pure DTO → ViewModel transformation functions
├── schemas/              # Zod schemas (form validation + inferred types)
├── view-models/          # UI-oriented types (what components receive)
└── index.ts              # Public surface of the module
```

Do NOT create empty subfolders. Add `hooks/`, `services/`, `mappers/`, `schemas/`, or `view-models/` only when the first file of that type exists.

Existing modules (`auth`, `dashboard`, `accounts`, `users`, `roles`, `products`, `marketplace`) follow this structure — use them as reference when creating new features.

### Adding a New Feature Module

Follow this procedure in order when creating a new module under `features/<module>/`. See rule `@../../.claude/rules/admin-web-feature-scaffold.md` for the expanded version with code snippets.

1. **Create folder structure** — only subfolders that will contain files: `components/`, `hooks/`, `services/`, `mappers/`, `schemas/`, `view-models/`
2. **Define ViewModels** in `view-models/` — what the UI needs, not what the API returns
3. **Create API service** in `services/<module>-service.ts` — raw HTTP calls, no transformation
4. **Create mappers** in `mappers/` — pure DTO → ViewModel functions
5. **Define query key factory** in `hooks/query-keys.ts` — structured keys for cache granularity
6. **Create hooks** — `useGet*`, `useCreate*`, `useUpdate*`, `useDelete*` using TanStack Query
7. **Build components** — every data component handles: skeleton (loading), empty, error, data states
8. **Add route** in `App.tsx` — lazy-loaded via `React.lazy()`, wrapped in `RequirePermission`
9. **Add NavItem** to SideNav config — declare `permissions[]` on the navigation item
10. **Add Storybook stories** — one story per component variant, covering all states

### State Strategy (Three Layers)

```
Server State  → TanStack Query v5  (queries, mutations, cache, invalidation)
UI State      → React Context      (auth, feature flags, nav, drawer, notifications)
Local State   → useState/useReducer (forms via React Hook Form, filters, dialogs)
```

**Decision rule**: if the backend serves it → TanStack Query. If 3+ unrelated features need it → Context. Otherwise → local state.

**Stale time tiers**:
| Tier | Stale Time | Applies to |
|---|---|---|
| `realtime` | 30s | Queue stats, health, enrichment metrics |
| `standard` | 5 min | Products, users, accounts, dashboard KPIs |
| `static` | 30 min | Roles, stores, feature flags |

**Mutation patterns**:

- Create (201) → invalidate list → refetch
- Update (200) → invalidate list + detail. Toggle → optimistic update + rollback on error
- Delete (204) → wait for 204 → invalidate. AlertDialog required. Never optimistic
- Error toast on mutation failure → use `showRetryToast(error, onRetry)` (from `features/marketplace/hooks/mutation-toast.ts`) for a sticky toast with a Retry button that re-fires the mutation with the same variables — never a bare `toast.error()` that lacks a retry action
- Background refetch → 2px progress bar, atomic replacement (never clear existing data)
- Prefetch → detail on row hover (onMouseEnter)

Cache invalidation is always granular (specific query keys, never global).

### DTO → ViewModel Transformation

Every feature has a `mappers/` layer. Components receive ViewModels, never raw API responses. API responses are transformed outside components, keeping adaptation logic centralized and testable.

```typescript
// features/accounts/services/accounts-service.ts  → calls API, returns DTO
// features/accounts/mappers/account-mapper.ts      → AccountDTO → AccountViewModel (pure)
// features/accounts/hooks/useGetAccounts.ts         → useQuery + mapper, returns ViewModel[]
// features/accounts/components/accounts-table.tsx   → receives ViewModel[], renders JSX
```

### Async Cancelability

All API calls support `AbortSignal`. TanStack Query's `signal` is passed through to the API Client. `queryClient.cancelQueries()` is used when filters change or the user navigates away, preventing race conditions.

### Shared UI Primitives

Reusable primitives live in `src/shared/ui/`. Do NOT duplicate these inside feature modules — import and compose them:

| Location                       | Provides                                                               |
| ------------------------------ | ---------------------------------------------------------------------- |
| `layout/`                      | `AppLayout`, `SideNav`, `TopBar`, `ContentArea` — top-level page shell |
| `alert-dialog.tsx`             | Confirmation dialogs for destructive actions                           |
| `dialog.tsx`                   | Modal dialog wrapper (Radix-based)                                     |
| `dropdown-menu.tsx`            | Row action menus and context menus                                     |
| `tabs.tsx`                     | Tab navigation panels                                                  |
| `skeletons/chart-skeleton.tsx` | Shape-matched skeleton for chart loading states                        |
| `drawer.tsx`                   | Global right drawer — slide-in detail panel (used by accounts, users, queues) |
| `command-palette/`             | ⌘K palette (`CommandPaletteProvider` + `CommandPalette`), items from `shared/config/nav-items.ts` |
| `notifications/` (in `shared/`) | Notification Center core: `NotificationProvider`, `useNotifications`, `publishNotification` bus |

All standard shadcn/ui primitives (Button, Input, Select, Checkbox, Popover, etc.) are also available from `src/shared/ui/`. Use `cn()` from `@shared/utils` for conditional class composition.

## Authentication

### Architecture Layers

```
Components: useCurrentUser()  useIsAuthenticated()  useHasPermission()  useLogin()  useLogout()
              │
AuthProvider:  exposes { session, isLoading, isAuthenticated } — does NOT call the API
              │
SessionManager:  session lifecycle owner — expiry timer, auto-refresh, clear, logout policy
              │
AuthService (IAuthService):  login() → AuthSession, refresh() → AuthSession, logout()
              │
ITokenStorage (interchangeable):  get/set/clear access & refresh tokens
              ├── InMemoryStorage (current — closure variables, no XSS surface)
              └── CookieStorage (future — if backend migrates to HttpOnly cookies)
```

### AuthSession

```typescript
interface AuthSession {
  userId: string;
  accountId: string;
  roles: RoleType[]; // Enum, not string[]
  expiresAt: number; // Unix timestamp ms
}
// isExpiring is computed by SessionManager, not stored
```

### Token Strategy

- **Access Token**: JWT, in-memory via `ITokenStorage`. TTL: 1 day (configurable via `JWT_EXPIRATION`).
- **Refresh Token**: opaque 96-hex-char string, in-memory via `ITokenStorage`. TTL: 30 days. Rotation with theft detection (token family).
- **Why in-memory**: eliminates XSS attack surface. Trade-off: page refresh forces re-login — acceptable for an admin operations console (desktop, long sessions).
- **Future HttpOnly cookies**: if the backend migrates, only `ITokenStorage` changes. `SessionManager` and `AuthService` are unaffected.

### Prerequisite

`POST /api/auth/refresh` in the backend currently returns 400 instead of a refreshed session. Until the backend endpoint is fixed to return user context alongside new tokens, the refresh-on-401 flow cannot complete.

## Permissions

The frontend works with **atomic permissions**, not raw roles:

```typescript
enum Permission {
  VIEW_DASHBOARD = 'dashboard:view',
  VIEW_HEALTH = 'health:view',
  VIEW_ACCOUNTS = 'accounts:view',
  MANAGE_ACCOUNTS = 'accounts:manage',
  VIEW_USERS = 'users:view',
  MANAGE_USERS = 'users:manage',
  VIEW_PRODUCTS = 'products:view',
  MANAGE_PRODUCTS = 'products:manage',
  VIEW_SCRAPERS = 'scrapers:view',
  MANAGE_SCRAPERS = 'scrapers:manage',
  VIEW_RULES = 'rules:view',
  MANAGE_RULES = 'rules:manage',
  VIEW_QUEUES = 'queues:view',
  VIEW_ROLES = 'roles:view',
  MANAGE_ROLES = 'roles:manage',
  VIEW_LOGS = 'logs:view',
  VIEW_SETTINGS = 'settings:view',
}
```

Roles are resolved to permissions via `ROLE_PERMISSIONS` map. `useHasPermission(p: Permission): boolean` is the **only** public API. `useHasRole()` does not exist. Components and navigation never reference roles directly.

### Double-Layer Protection

| Layer          | Mechanism                                                                          |
| -------------- | ---------------------------------------------------------------------------------- |
| **Navigation** | `NavItem.permissions: Permission[]` — items not in the user's set are not rendered |
| **Routes**     | `ProtectedRoute` + `RequirePermission` — blocks direct URL access                  |

## Layout

```
TopBar (h-12, sticky, bg-surface)
  [Logo] [⌘K Global Search] [NotificationCenter 🔔] [CurrentAccount] [UserMenu 👤]

SideNav (w-60, collapsible to w-12, bg-surface-container-low)
  Sections: Platform → Data → Operations
  Each item: { id, label, icon, path?, permissions[], badge?, featureFlag?, children?[] }

Content Area (flex-1, scroll, p-4, bg-surface)
  └── Page Title / Breadcrumb* (*only at depth 2+)

Global Right Drawer (reusable detail panel)
Toasts (sonner, bottom-right, max 3)
```

### Navigation Rules

- SideNav is a pure function: `(items, permissions, flags) → JSX`. No business logic inside.
- Active route indicator: `primary` tint background + left border.
- Badges support: `{ count, variant: 'danger' | 'warning' | 'info' }`.
- Feature flags gate items without modifying the component.

## API Client

Located at `src/shared/api/`. Single axios instance with:

- **Request interceptor**: attaches `Authorization: Bearer <token>` from `ITokenStorage`
- **Response interceptor**: on 401 → `AuthService.refresh()` → retry original request. On refresh failure → `SessionManager.clear()` → redirect `/login`
- **AbortSignal**: every request accepts an optional `AbortSignal`. TanStack Query's `signal` is threaded through
- **Error normalization**: transforms axios errors into typed `ApiError` objects

Components and hooks never import `axios` directly. Only `services/` files within each feature call the API Client.

## Coding Constraints

- [ ] Public methods require JSDoc with `@param`, `@returns`, `@throws`
- [ ] Explicit access modifiers on all class/property members
- [ ] No `any` unless justified with a one-line comment
- [ ] No `console.log` — use structured logging or toasts
- [ ] No `useEffect` for data fetching — always TanStack Query
- [ ] No inline `style={{ }}` — use Tailwind classes or `cn()` helper
- [ ] No raw hex colors in components — use semantic Tailwind tokens from DESIGN.md
- [ ] No full-page spinners or loading overlays — skeletons only
- [ ] No `localStorage`/`sessionStorage` for tokens — use `ITokenStorage`
- [ ] No direct `axios` imports in components or hooks — go through `services/`
- [ ] No hardcoded route paths — use `@/config/routes`
- [ ] No emoji as icons — use `lucide-react`
- [ ] `dangerouslySetInnerHTML` requires explicit sanitization
- [ ] Icon-only buttons require `aria-label`
- [ ] Tables require `<caption>` (visually hidden acceptable)

### Imports

- **Order**: types → interfaces → implementations (alphabetical within each group)
- **Path aliases**: `@/` maps to `src/`. Within a feature, relative imports are fine. Across features, use `@features/<module>/` barrel exports
- **No circular dependencies**

## Pre-commit Checklist

```bash
npm run lint          # Zero errors
npm run format        # Clean diff
npm run test          # Vitest: all green
npm run typecheck     # tsc --noEmit clean
npm run build         # Compiles without errors
```

## Related

- API spec: `swagger.json` at the repo root (documentation only — not a code-generation source).
- Backend patterns: `src/main/CLAUDE.md`.
- Design system audit & dev plan: `~/.claude/plans/oye-comenzamos-con-otra-wobbly-snowflake.md`.
- Project-wide compliance: `../../.claude/rules/compliance-checklist.md`.
- Git workflow: `../../.claude/rules/git-workflow.md`.
