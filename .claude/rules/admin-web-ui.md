---
name: Admin Web UI Conventions
description: UI behavior and code conventions for the BazaarSentinel Super Admin SPA. Pairs with apps/admin-web/DESIGN.md (brand book).
applies_to: apps/admin-web/**
---

# Admin Web UI Conventions

This file defines the **behavioral and code conventions** for the Super Admin SPA. It pairs with `apps/admin-web/DESIGN.md` (the brand book: palette, typography, shape). Read DESIGN.md first; this file assumes the visual language is already understood.

---

## 1. Layout & Density

### 1.1 Container padding

- Outer page container: `p-4` maximum.
- Card inner padding: `p-3` for compact views, `p-4` for comfortable views.
- Table cell padding: `p-2`.

### 1.2 Density philosophy

High information density. A user MUST be able to see ~20 rows of data on a 1080p screen without scrolling. When in doubt, prefer compact over spacious.

### 1.3 Whitespace

Use whitespace to **group** related content (filter cluster next to search box). Use spacing to **separate** sections (`space-y-4`). Within a group, use `space-y-1`.

---

## 2. Data Tables

Built on TanStack Table v8 + shadcn/ui primitives.

### 2.1 Row height

- Default row height: `h-9` (36px).
- Compact mode: `h-8` (32px).
- DO NOT exceed `h-10` even in comfortable density.

### 2.2 Row actions

- All row actions (Edit, Suspend, Impersonate, Delete) MUST live in a `DropdownMenu` triggered by a `MoreHorizontal` icon at the end of the row.
- DO NOT place action buttons inline. The icon button is the only visible affordance.
- Destructive actions (Delete, Suspend) MUST appear last in the menu and be styled with the `danger` token.

### 2.3 Search

- Every table MUST have a text search input.
- Debounce MUST be **300ms**. Update query on debounce flush, not per keystroke.

### 2.4 Filters

- Filters live in a collapsible panel anchored to the top-right of the table.
- Multi-select filters (role, status, plan) use a `Popover` with checkboxes.
- Date range filters use a single `DateRangePicker` component.

### 2.5 Pagination footer

- Bottom of table: `Rows per page [10 ▾]` on the left, `Page X of Y · ‹ Prev · Next ›` on the right.
- Total row count MUST be displayed next to the pager.

### 2.6 Selection & bulk actions

- Header row: master checkbox. Click toggles all visible (filtered) rows.
- When ≥1 row is selected, a sticky action bar MUST appear at the top of the table with bulk actions (Assign Role, Suspend, Export CSV).
- Selection state MUST persist across page changes.

---

## 3. Charts & Visualization

### 3.1 Library choice

- **Recharts** for standard charts (line, area, bar, sparkline).
- **Tremor** (optional) for dashboard KPI cards with built-in delta indicators. Use only if/when the dashboard ships KPI cards with delta; otherwise stick to Recharts.

### 3.2 Style

- No heavy backgrounds. Charts sit directly on `card-gray` (from DESIGN.md).
- Grid lines: 1px `border-slate` at low opacity.
- Tooltips: dark surface, `text-primary`, `font-mono` for values.

### 3.3 Color usage

- Multiple series: cycle `primary` → `success` → `warning` → `text-muted`.
- Negative deltas: `danger`. Positive deltas: `success`.

### 3.4 Loading / empty chart states

- Loading: chart-shaped skeleton (axes rendered, plot area shimmer).
- Empty: centered text "No data in this range" with a subtle icon.

---

## 4. Async States

### 4.1 Loading

- Full-page spinners or loading overlays are FORBIDDEN. EVER.
- Initial load: shape-matched skeletons (`<TableSkeleton rows={10} cols={12} />`, `<ChartSkeleton />`, `<CardSkeleton />`). These are public contract components defined under `src/shared/ui/skeletons/`. Importing from this path is allowed only from feature pages; nested components MUST compose these instead of redefining them.
- A skeleton MUST replicate the final layout's geometry. It is NOT a generic shimmer box.

### 4.2 Empty state

Every list, table, and chart MUST handle the empty case:

- Centered icon (lucide, 48px, `text-muted`).
- Title (one line, `text-lg`).
- Description (one line, `text-muted`).
- Optional CTA button.

### 4.3 Error

- Per-route `ErrorBoundary`. On error: card with title "Something went wrong", description, "Reload" + "Report issue" buttons.
- Inline errors: red text below the field, `danger` left border on the field.
- **404 / NotFound:** per-route view. Centered `text-muted` icon (lucide `SearchX`, 48px), title "Not found", description "The resource you're looking for doesn't exist or has been removed.", and a "Go to dashboard" button. Same dark surface as the rest of the app.

### 4.4 Background refetch

- During `isFetching && !isLoading`, show a 2px progress bar at the top of the table or card.
- DO NOT clear the existing data when refetching. Replace it atomically when the new data arrives.
- `refetchOnWindowFocus` is **off** app-wide (`shared/api/query-client.ts`) — the console does not refetch every query when the operator alt-tabs back. Freshness comes from per-tier `staleTime`; realtime data (`useGetQueues`, health, enrichment) polls via `refetchInterval`.
- Do NOT set `refetchOnMount: false` on individual hooks. It does not stop React StrictMode's dev double-mount (TanStack Query already dedupes the in-flight request), and it degrades freshness on real remounts. See `apps/admin-web/CLAUDE.md` → State Strategy → QueryClient defaults.

---

## 5. Destructive Actions

### 5.1 AlertDialog is mandatory

Any action that calls `DELETE`, `POST /suspend`, `POST /cancel`, or `POST /reset-password` MUST open an `AlertDialog` before execution. No exceptions.

Sensitive (non-destructive) actions such as `POST /impersonate` MUST also open a confirmation dialog, but with copy phrased as a security notice (e.g., "This action will be logged and audited") rather than a destructive warning.

### 5.2 Confirmation content

- Title: action phrased as a question ("Delete user?", "Suspend account?").
- Description: irreversible impact stated explicitly ("This will permanently delete the user and all their alarms. This action cannot be undone.").
- Cancel button (left, neutral), destructive button (right, `danger` background).
- For irreversible operations, the destructive button label MUST include "permanently" or "irreversibly".

### 5.3 Optimistic updates

- For non-destructive actions (toggle, status change): apply the change immediately via TanStack Query `setQueryData`. Rollback on error and toast the failure.
- For destructive actions: DO NOT optimistically remove. Wait for the server's `204` before updating local state.
- **In-flight state:** while the mutation is pending, the destructive button MUST show a spinner, the row's other action buttons MUST be disabled, and the AlertDialog MUST remain open. Close the dialog only after the server responds (success or error).

---

## 6. Notifications (Toasts)

### 6.1 Position

Bottom-right corner. Max 3 visible simultaneously; overflow queues.

### 6.2 Triggers

- `200` / `201` mutation success: success toast.
- `400` validation error: error toast with summary; field-level errors render inline.
- `5xx`: error toast with a "Retry" action.
- `401`: silent — handled by the auth interceptor (redirect to `/login`). DO NOT toast.
- `403`: full-page Forbidden view. DO NOT toast.
- `429`: warning toast with a countdown from the `Retry-After` header. The originating action's button MUST be disabled until the countdown finishes; the user can dismiss the toast to cancel.

### 6.3 Variants

`success` (success icon), `error` (danger icon), `warning` (warning icon), `info` (info icon).

### 6.4 Durations

- Success: 4s.
- Info: 6s.
- Warning: 8s.
- Error: sticky (no auto-dismiss; user dismisses manually or clicks Retry).

---

## 7. Code Organization

### 7.1 Folder structure

Every feature lives in `src/features/<module>/`. Inside a feature:

```
features/users/
├── components/      # Presentational React components
├── hooks/           # useGetUsers, useUpdateUser, useDeleteUser
├── schemas/         # Zod schemas (form validation + types)
└── index.ts         # public surface
```

DO NOT create empty subfolders. Add `hooks/` or `schemas/` only when the first file of that type exists.

### 7.2 Custom hooks (mandatory)

All API calls and async state MUST be extracted into custom hooks using TanStack Query. Component files MUST NOT import from `@tanstack/react-query` or `axios`. Only hook files under `features/<x>/hooks/` may call `useQuery` or `useMutation`.

Naming convention:

- `useGet<Resource>` — list or single fetch
- `useCreate<Resource>` — POST
- `useUpdate<Resource>` — PUT / PATCH
- `useDelete<Resource>` — DELETE

### 7.3 Separation of concerns

- **Components** render JSX and apply Tailwind classes. They receive data via props or via a single hook call.
- **Hooks** own queries, mutations, cache invalidation, and toast triggers.
- **Schemas** own validation (Zod) and inferred types.

### 7.4 Shared UI

Reusable primitives live in `src/shared/ui/`. Sources:

- shadcn/ui (Radix + Tailwind): `Button`, `Dialog`, `DropdownMenu`, `Input`, `Select`, `Checkbox`, `Popover`, `DateRangePicker`.
- `sonner`: `Toast` (notifications).
- Custom (in `src/shared/ui/skeletons/`): `TableSkeleton`, `ChartSkeleton`, `CardSkeleton` — shadcn does not ship skeletons.

DO NOT duplicate any of these inside features. Compose them.

---

## 8. Accessibility (Baseline)

### 8.1 Focus rings

- ALWAYS visible. Use `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-void-black`.
- DO NOT remove outlines (`outline-none`) without a replacement.

### 8.2 Keyboard navigation

- All interactive elements MUST be reachable via `Tab`.
- `Esc` closes modals and popovers.
- `Enter` submits forms or activates the primary button.
- `⌘K` opens the command palette.

### 8.3 Color contrast

- Text on background: WCAG AA minimum (4.5:1 for body, 3:1 for large text). Verified per palette in DESIGN.md.
- Status colors MUST NOT rely on color alone. Pair every colored indicator with an icon or text label.

### 8.4 Screen reader labels

- Every icon-only button MUST have `aria-label`.
- Decorative icons MUST have `aria-hidden="true"`.
- Tables MUST have a `<caption>` (visually hidden is fine).

---

## 9. Anti-patterns (Forbidden)

The following are explicitly prohibited. Code review MUST reject them.

- Full-page spinners or loading overlays of any kind.
- Storing JWT in `localStorage` or `sessionStorage` — use in-memory storage with a secure refresh flow.
- Inline `style={{ ... }}` in JSX — use Tailwind classes or the `cn()` helper.
- Emoji as UI icons — use `lucide-react`.
- Raw color values in components — use semantic tokens from DESIGN.md.
- `console.log` in production code.
- Direct `axios` calls inside component files — always go through a custom hook.
- `useEffect` to fetch data — always use TanStack Query.
- Hardcoded route paths or API paths in components — use `@/config/`.
- `dangerouslySetInnerHTML` without explicit sanitization.
