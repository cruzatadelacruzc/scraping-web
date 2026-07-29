# Customer Dashboard - React 19 + Vite + PWA

> **Fase completada:** Phase 1 - Auth real + landing (login/register/forgot/reset/verify, self-management, i18n EN/ES, MSW real-contract)  
> **Fase en progreso:** Phase 2 - Alarmas (CRUD, filtros, detalle)

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
├── app/
│   ├── App.tsx
│   ├── routes.tsx
│   ├── providers.tsx
│   └── layout/
├── features/
│   └── auth/
├── shared/
│   ├── api/
│   ├── auth/
│   ├── ui/
│   ├── pwa/
│   ├── offline/
│   └── utils/
├── mocks/
├── styles/
└── test/
```

### Feature Scaffold

When creating a new feature:
1. Create `src/features/<feature>/`
2. Add `services/<feature>-service.ts` for API calls
3. Add `schemas/` for Zod validation
4. Add `mappers/` for DTO→ViewModel
5. Add `hooks/` for TanStack Query hooks
6. Add `components/` for UI
7. Export via `index.ts`

### PWA Features

- **Offline:** IndexedDB cache for alarms, notifications, profile
- **Push:** VAPID subscription → SW receives → showNotification + postMessage
- **Background Sync:** Outbox queue for mutations offline