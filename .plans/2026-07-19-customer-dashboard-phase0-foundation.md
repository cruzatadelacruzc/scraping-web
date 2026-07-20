# Customer Dashboard — Phase 0: Foundation Implementation Plan

**Date:** 2026-07-19  
**Phase:** 0 — Infrastructure & Architecture Setup  
**Duration:** 2 weeks (10 working days)  
**App:** `apps/customer-dashboard` (Vite + React 19 + TypeScript SPA)

---

## Overview

Phase 0 establishes the complete infrastructure foundation for the Customer Dashboard PWA. All protected features built in subsequent phases will consume this stable layer.

**Stack:** Vite 5, React 19, TypeScript strict, React Router v6, TanStack Query v5, Zustand (high-frequency UI only), React Hook Form + Zod, Tailwind CSS v4, Workbox (PWA), Vitest + RTL + MSW, Storybook 8, ESLint 9 + Prettier.

**Architecture:** Feature-first folders, DTO→ViewModel mappers, API client boundary, atomic permissions, in-memory JWT + HttpOnly refresh cookie.

---

## Task Breakdown

### Task 0.1: Initialize Vite Project + Core Config
**Files:**
```
apps/customer-dashboard/
├── package.json
├── tsconfig.json / tsconfig.node.json
├── vite.config.ts
├── vitest.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── eslint.config.js
├── .prettierrc
├── .env.example
├── .gitignore
├── index.html
├── public/
│   ├── manifest.webmanifest
│   └── icons/ (placeholder)
└── src/
    ├── main.tsx
    ├── vite-env.d.ts
    ├── styles/
    │   ├── globals.css
    │   └── theme.css
    └── app/
        ├── App.tsx
        ├── routes.tsx
        ├── providers.tsx
        └── layout/
            ├── AppLayout.tsx
            ├── AuthLayout.tsx
            └── OnboardingLayout.tsx
```

### Task 0.2: React Router + Route Structure + Layouts
**Files:**
```
src/shared/config/routes.ts
src/app/routes.tsx
src/app/providers.tsx
src/app/layout/AppLayout.tsx
src/app/layout/AuthLayout.tsx
src/app/layout/OnboardingLayout.tsx
```

### Task 0.3: PWA Setup (Workbox + Manifest + SW Registration)
**Files:**
```
vite.config.ts (modify PWA config)
public/manifest.webmanifest (modify)
public/icons/icon-192.png, icon-512.png, maskable-512.png
src/shared/pwa/
├── sw-registration.ts
├── push-manager.ts
├── push-permissions.ts
├── push-subscription.ts
├── push-handler.ts
├── deep-link-router.ts
├── foreground-sync.ts
├── preferences.ts
├── sync-manager.ts
└── index.ts
```

### Task 0.4: Theme System (CSS Tokens + ThemeProvider)
**Files:**
```
src/styles/theme.css (already created)
src/shared/ui/ThemeProvider.tsx
src/shared/ui/theme-store.ts
src/app/providers.tsx (modify)
src/app/layout/Header.tsx (modify - add theme toggle)
```

### Task 0.5: UI Store (High-Frequency Client State)
**Files:**
```
src/shared/ui/ui-store.ts
```

### Task 0.6: Design System — Core Primitives Only
**Files:**
```
src/shared/ui/primitives/
├── Button.tsx + Button.stories.tsx
├── Input.tsx + Input.stories.tsx
├── Label.tsx
├── Textarea.tsx
├── Select.tsx
├── Checkbox.tsx
├── Radio.tsx
├── Switch.tsx
├── Dialog.tsx + AlertDialog.tsx
├── DropdownMenu.tsx
├── Toast.tsx (sonner wrapper)
├── Tooltip.tsx
├── Popover.tsx
├── Avatar.tsx
├── Badge.tsx
├── Tabs.tsx
├── Accordion.tsx
├── Table.tsx
├── Pagination.tsx
├── Skeleton.tsx (TableSkeleton, CardSkeleton, ListSkeleton)
├── Spinner.tsx
├── Separator.tsx
├── ScrollArea.tsx
├── VisuallyHidden.tsx
├── Portal.tsx
├── FocusTrap.tsx
└── index.ts
src/shared/ui/forms/
├── FormField.tsx
├── FormError.tsx
├── ZodForm.tsx (RHF + Zod wrapper)
└── index.ts
src/shared/ui/layout/
├── Sidebar.tsx
├── Header.tsx
├── ContentArea.tsx
├── PageContainer.tsx
├── PageHeader.tsx
├── Breadcrumbs.tsx
└── index.ts
src/shared/ui/index.ts (barrel export)
.storybook/main.ts
.storybook/preview.ts
.storybook/preview-head.html
```

### Task 0.7: API Client + Error Handling + MSW
**Files:**
```
src/shared/api/
├── client.ts
├── endpoints.ts
├── errors.ts
├── query-client.ts
└── index.ts
src/mocks/
├── handlers.ts
├── server.ts
├── browser.ts
└── index.ts
src/app/providers.tsx (modify)
vite.config.ts (modify - MSW dev middleware)
```

### Task 0.8: Auth Infrastructure
**Files:**
```
src/shared/auth/
├── types.ts
├── token-storage.ts
├── session-manager.ts
├── auth-service.ts
├── auth-store.ts
├── AuthProvider.tsx
├── permissions.ts
├── hooks.ts
└── index.ts
src/features/auth/
├── services/auth-service.ts
├── schemas/auth-schemas.ts
├── mappers/auth-mapper.ts
├── view-models/auth-view-model.ts
└── index.ts
src/app/ProtectedRoute.tsx
src/app/routes.tsx (modify - add protection)
src/shared/config/nav-items.ts
src/app/layout/AppLayout.tsx (modify - sidebar from nav-items)
src/app/layout/Header.tsx (modify - user menu + logout)
```

### Task 0.9: Offline Infrastructure (IndexedDB + Background Sync)
**Files:**
```
src/shared/offline/
├── db.ts (IndexedDB schema via idb)
├── outbox.ts (Background Sync queue)
└── index.ts
```

### Task 0.10: CI/CD + Storybook Config + Documentation
**Files:**
```
.github/workflows/customer-dashboard.yml
package.json (root - add workspace scripts)
.storybook/main.ts
.storybook/preview.ts
.storybook/preview-head.html
apps/customer-dashboard/README.md
apps/customer-dashboard/CLAUDE.md
apps/customer-dashboard/.env.example (complete)
```

---

## Phase 0 Definition of Done

- [ ] `npm run dev` starts in <3s with HMR working
- [ ] `npm run build` produces installable PWA (manifest + SW + icons in `dist/`)
- [ ] `npm run lint` / `typecheck` / `test` / `test:e2e` all pass
- [ ] **Auth infrastructure works:** `AuthProvider` initializes, `SessionManager` refreshes token, `ProtectedRoute` redirects correctly (tested with MSW)
- [ ] **Theme works:** `ThemeProvider` applies `data-theme`, Context provides theme, no flash on reload
- [ ] **UI store works:** `ui-store` toggles sidebar/notification center, only affected components re-render
- [ ] **Push infra ready:** SW registered, VAPID key fetched, subscription flow works
- [ ] **Offline infra ready:** IndexedDB schema created, Background Sync queue accepts mutations
- [ ] **Storybook runs** with all primitives in light/dark themes
- [ ] **CI pipeline green** on push
- [ ] **Lighthouse PWA score >90** (performance, accessibility, best practices, PWA)
- [ ] **Architecture rules documented** in `CLAUDE.md` and architecture spec

---

## State Management Rules (Documented in CLAUDE.md)

| Layer | Tool | Scope | Examples |
|-------|------|-------|----------|
| Server State | TanStack Query | ALL API data | Alarms, notifications, user, account, subscription |
| Client State (Low Freq) | React Context | Auth, Theme, Feature Flags | `AuthProvider`, `ThemeProvider` |
| Client State (High Freq) | Zustand `ui-store` ONLY | Sidebar, NotificationCenter, Modals, Drawers | `sidebarOpen`, `notificationCenterOpen`, `activeModal` |
| Local State | useState/useReducer | Forms (RHF), filters, pagination | Form inputs, table filters, dialog open/close |

**Forbidden:**
- Domain stores (alarms-store, notifications-store, etc.)
- Duplicating TanStack Query cache in Zustand
- localStorage/sessionStorage for tokens
- Direct axios imports in components/hooks

---

## Next Phases (Preview)

| Phase | Focus | Key Deliverables |
|-------|-------|------------------|
| 1 | Auth Features | Login/Register/Forgot/Reset/Verify pages, OAuth, Profile, Security, Preferences, Onboarding |
| 2 | Alarms (Core) | List, Wizard (6 conditions), Detail, Edit, Offline queue, Bulk actions |
| 3 | Notifications & Real-time | Notification Center, WebSocket, Web Push, Background Sync, Toast system |
| 4 | Bots | Link flow, Preview, Test notification, Unlink |
| 5 | Account & Billing | Subscription card, Upgrade/downgrade, Billing history, Account settings |
| 6 | Polish | Offline UX, Performance, Accessibility, Cross-browser |
| 7 | Launch Prep | E2E suite, Monitoring, Feature flags, Docs |

---

*Phase 0 complete = stable, tested infrastructure ready for feature development.*