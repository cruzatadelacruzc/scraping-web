# Customer Dashboard - React 19 + Vite + PWA

> **Fases completadas:**
> - Phase 1 — Auth real + landing (login/register/forgot/reset/verify, self-management)
> - Phase 2 — Alarmas (CRUD, filtros, detalle con historial, selector de catálogo `GET /api/products`, condiciones tipo picker, gating estructural por plan, read-cache offline)
>
> **Fase en progreso:** Phase 3 — Notificaciones (lista, push, realtime)

## Stack

| Layer | Technology |
|-------|------------|
| Framework | React 19 + Vite 5 |
| Language | TypeScript (strict mode) |
| Routing | React Router v6 |
| Server State | TanStack Query v5 |
| Client State | React Context (Auth, Theme) + Zustand (UI) |
| Forms | React Hook Form + Zod |
| Styling | Tailwind CSS v4 + CSS Variables |
| Testing | Vitest + React Testing Library + MSW |
| E2E | Playwright MCP/CLI |
| PWA | Workbox + Web Push API |

## Commands

| Command | Purpose |
|---------|---------|
| `npm run dev -w apps/customer-dashboard` | Start dev server |
| `npm run build -w apps/customer-dashboard` | Production build |
| `npm run lint -w apps/customer-dashboard` | ESLint |
| `npm run typecheck -w apps/customer-dashboard` | TypeScript check |
| `npm run test -w apps/customer-dashboard` | Vitest |
| `npm run storybook -w apps/customer-dashboard` | Storybook |

## Architecture

### State Management Rules

1. **TanStack Query** → All server state (API data). NEVER duplicate.
2. **React Context** → Auth session, Theme, Feature flags. Low frequency changes.
3. **Zustand `ui-store`** → Sidebar, NotificationCenter, Modals, Drawers. High frequency.
4. **useState/useReducer** → Local component state (forms, filters).

### Folder Structure

```
src/
├── app/                 # App.tsx, routes.tsx, providers.tsx, layout/
├── features/
│   ├── auth/
│   ├── landing/
│   └── alarms/          # components/ hooks/ mappers/ schemas/ services/ pages/
├── shared/
│   ├── api/             # client.ts, endpoints.ts
│   ├── auth/            # AuthProvider, ProtectedRoute, jwt, permissions, session-manager, token-storage
│   ├── config/          # routes, runtime config
│   ├── i18n/            # index.ts + locales/en, locales/es
│   ├── mocking/         # browser.ts (worker) + handlers/ + fixtures/ — the canonical handler set
│   ├── offline/         # query-persister (per-query IndexedDB read cache), db.ts
│   ├── pwa/             # push-manager, preferences
│   ├── ui/              # ThemeProvider, ui-store, modal, confirm-dialog, skeletons
│   └── utils/
├── mocks/               # server.ts — vitest MSW node server; re-exports shared/mocking handlers
├── styles/
└── test/                # setup.ts, query-wrapper.tsx
```

MSW lives in one place: handlers/fixtures in `shared/mocking/`. `src/mocks/`
only wires the Node (vitest) server from that same set — do not add handlers there.

### Feature Scaffold

When creating a new feature under `src/features/<feature>/`, create a folder
only once it has a file (no empty dirs):

1. `services/<feature>-service.ts` — raw HTTP via `shared/api` client, one file per resource
2. `schemas/` — Zod form schemas + inferred types
3. `mappers/` — pure DTO → ViewModel (dates parsed here, badge/derived fields computed here)
4. `hooks/` — the ONLY place `useQuery`/`useMutation` are called (`useGet*`, `useCreate*`, `useUpdate*`, `useDelete*`) + a `query-keys.ts` factory
5. `components/` — render only; data comes from one hook call or props
6. `pages/` — route entry points, lazy-loaded in `app/routes.tsx`
7. `index.ts` — public surface

### Conventions (enforced in review)

- **i18n mandatory** — every user-facing string goes through `t()` with EN **and** ES entries. No hardcoded text. Spanish is the fallback.
- **Loading = shadcn `Skeleton`** shaped like the final layout. Never a spinner or full-page overlay.
- **Auth tokens are in-memory only** (non-persisted Zustand) — a full page reload logs the user out. Dev/manual testing navigates via in-app clicks, not `location` navigation.
- **No `axios`/`@tanstack/react-query` imports in components** — only in `hooks/`.
- **No `useEffect` for data fetching** — use TanStack Query.

### PWA Features

- **Offline read-cache:** selected read queries persist to IndexedDB via
  `shared/offline/query-persister` (per-query `persister` option). Phase 2 wires
  it on `useAlarms`, `useAlarm`, and `usePlanLimits`. `OfflineBanner` shows when
  `navigator.onLine` is false. Mutations are **not** queued offline yet.
- **Push:** VAPID subscription → SW receives → `showNotification` + `postMessage`.
- **Installable:** manifest + icons (192px, 512px).