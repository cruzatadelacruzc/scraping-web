---
name: Sentience High-Density System
colors:
  surface: '#141313'
  surface-dim: '#141313'
  surface-bright: '#3a3939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353434'
  on-surface: '#e5e2e1'
  on-surface-variant: '#c4c7c8'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#8e9192'
  outline-variant: '#444748'
  surface-tint: '#c6c6c7'
  primary: '#ffffff'
  on-primary: '#2f3131'
  primary-container: '#e2e2e2'
  on-primary-container: '#636565'
  inverse-primary: '#5d5f5f'
  secondary: '#aec6ff'
  on-secondary: '#002e6b'
  secondary-container: '#4f8eff'
  on-secondary-container: '#00275e'
  tertiary: '#ffffff'
  on-tertiary: '#2f3131'
  tertiary-container: '#e2e2e2'
  on-tertiary-container: '#636565'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e2e2e2'
  primary-fixed-dim: '#c6c6c7'
  on-primary-fixed: '#1a1c1c'
  on-primary-fixed-variant: '#454747'
  secondary-fixed: '#d8e2ff'
  secondary-fixed-dim: '#aec6ff'
  on-secondary-fixed: '#001a42'
  on-secondary-fixed-variant: '#004396'
  tertiary-fixed: '#e2e2e2'
  tertiary-fixed-dim: '#c6c6c7'
  on-tertiary-fixed: '#1a1c1c'
  on-tertiary-fixed-variant: '#454747'
  background: '#141313'
  on-background: '#e5e2e1'
  surface-variant: '#353434'
typography:
  display:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.04em
  headline-lg:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: -0.03em
  headline-sm:
    fontFamily: Geist
    fontSize: 18px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: -0.02em
  body-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: -0.01em
  body-sm:
    fontFamily: Geist
    fontSize: 13px
    fontWeight: '400'
    lineHeight: '1.5'
  technical-md:
    fontFamily: Geist Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: '1.4'
  technical-sm:
    fontFamily: Geist Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: '1.4'
  label-caps:
    fontFamily: Geist
    fontSize: 11px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  container-padding-desktop: 24px
  container-padding-mobile: 16px
  gutter: 16px
  sidebar-width: 240px
  sidebar-collapsed-width: 64px
---

## Brand & Style
This design system is engineered for high-performance marketplace monitoring. The brand personality is clinical, precise, and authoritative, designed to instill confidence in operators managing high-volume data. 

The aesthetic is **Modern/Corporate**, heavily influenced by the "developer-first" visual language of Linear and Vercel. It prioritizes information density and speed of recognition over decorative flair. The style utilizes deep neutral surfaces, extremely fine borders, and subtle interactive states to create a focused, low-distraction environment. 

The UI should feel like a high-end tool—utilitarian yet refined, where every pixel serves a functional purpose in data visualization and system health monitoring.

## Colors
The palette is centered on a **Dark Mode** foundation. 
- **Surfaces:** Use a tiered system of dark neutrals. The background starts at `#0A0A0A`, with containers and cards stepping up to `#111111` and `#171717`.
- **Accents:** The primary action color is pure white (`#FFFFFF`), providing maximum contrast against dark backgrounds. A secondary "Geist Blue" (`#0072F5`) is used for subtle focus states and active links.
- **Status:** Critical information uses semantic colors with high saturation to ensure visibility. 
  - **Emerald (Success/Health):** Marketplace uptime and positive metrics.
  - **Amber (Warning):** Threshold alerts and pending actions.
  - **Ruby (Error):** System failures or critical breaches.
- **Borders:** Use `#262626` for subtle separation and `#404040` for hover states.

## Typography
The system uses **Geist** for all UI elements to maintain a clean, neo-grotesque appearance that excels at small sizes. **Geist Mono** is strictly reserved for technical data: transaction IDs, logs, metrics, and terminal outputs.

Hierarchy is established through weight and letter spacing rather than significant size jumps, maintaining high density. For headings, use tighter letter spacing to create a cohesive "block" feel. Small labels should use uppercase with slight tracking to improve legibility at 11px.

## Layout & Spacing
The layout follows a **Fixed-Fluid hybrid** model:
- **Desktop (1280px+):** A 12-column grid with a fixed left sidebar (`240px`). Content resides in centered or wide-span fluid containers.
- **Tablet (768px - 1279px):** The sidebar collapses to a condensed icon-only rail (`64px`). Margins reduce to `20px`.
- **Mobile (<767px):** Transition to a single-column layout with a bottom navigation bar for primary app destinations.

Spacing follows a strict **4px baseline grid**. Standard component internal padding is `8px` (2 units) or `12px` (3 units). Use `16px` gutters between dashboard cards to maintain a tight, compact information density.

## Elevation & Depth
This design system avoids traditional drop shadows in favor of **Tonal Layers** and **Subtle Outlines**.

Depth is communicated through background color increments:
1. **Level 0 (Canvas):** `#0A0A0A` - The base layer.
2. **Level 1 (Cards/Sidebar):** `#111111` with a `1px` solid border of `#262626`.
3. **Level 2 (Popovers/Modals):** `#171717` with a `1px` solid border of `#404040` and a very subtle, large-radius black shadow (0px 8px 32px rgba(0,0,0,0.8)).

Use `backdrop-filter: blur(12px)` on navigation bars and sticky headers to provide context of the content scrolling underneath without sacrificing legibility.

## Shapes
The shape language is **Soft (0.25rem)**. This provides a professional, "tooled" look that feels modern but remains grounded and efficient.

- **Standard Elements (Buttons, Inputs, Small Cards):** `4px` (0.25rem) radius.
- **Large Containers (Dashboard Cards):** `8px` (0.5rem) radius.
- **Technical Badges/Chips:** `2px` or `4px` radius depending on height.

Avoid pill-shaped elements (except for specific toggle switches) to maintain the structured, grid-based aesthetic.

## Components
- **Buttons:** Primary buttons are Solid White with Black text. Secondary buttons are Ghost style (transparent with a `#262626` border). All buttons use a `13px` medium weight font.
- **Input Fields:** Darker than the card background (`#050505`) with a subtle `1px` border. The focus state uses a `1px` Blue (`#0072F5`) border without an outer glow.
- **Dashboard Cards:** High-density headers. Headers should have a bottom border of `1px solid #262626` and a height of exactly `40px` to align perfectly with the sidebar items.
- **Status Chips:** Small, condensed labels with a low-opacity background of the semantic color and a high-opacity text/icon of the same color (e.g., Emerald text on 10% Emerald background).
- **Data Tables:** No vertical borders. Horizontal borders only (`1px solid #1A1A1A`). Rows use a subtle hover state highlight (`#171717`). Use Geist Mono for numerical columns.

---

## Phase 1 — Auth & Landing (built surfaces)

> Documented after implementation (impeccable-first). These patterns extend the brand book above; where they differ, they win for these surfaces.

### Design tokens (implementation)

Tokens are Material-named CSS variables in `src/styles/theme.css` (dark `:root`, light `[data-theme="light"]`), registered in the Tailwind v4 `@theme` in `src/styles/globals.css`. The shadcn form kit expects shadcn-named tokens, so `globals.css` also **aliases** them to Material tokens (do not remove — the kit renders unstyled without these):

| shadcn token | → Material token | Use |
|---|---|---|
| `primary` / `primary-foreground` | `#FFFFFF` / `on-primary` | Solid white primary buttons |
| `background` / `foreground` | `surface` / `on-surface` | Base surfaces/text |
| `muted-foreground` | `on-surface-variant` | Secondary text |
| `border` / `input` | `outline-variant` | Fine borders |
| `ring` | `secondary` (Geist Blue) | Focus rings |
| `destructive` | `error` | Errors |
| `accent` / `popover` | `surface-container-high` | Hover/overlay surfaces |

Emerald (`--color-success` `#10b981`) is the **data-signal** color: price drops (−% chips = emerald text on ~15% emerald), sparklines, the live "updated" dot, and the #1 leaderboard highlight.

### The Living Front Door (pre-auth landing)

Zero-scroll, viewport-locked on desktop; reflows on mobile. Three zones:
1. **Left preview tray** — slim icon rail (desktop) / bottom tab bar (mobile) of the app's sections, each with a **lock badge** (guest tease, not access; click → sign up).
2. **Center "doodle"** — a rotating teaser (`Top 5 bajadas` / `Más vendidos` / `En observación`) fed by the public `GET /api/public/highlights`. The **leaderboard is the hero**: rank (mono), product, −% emerald chip, strikethrough old → emerald new price, inline SVG sparkline, plus a faint inline emerald magnitude bar (width = drop %). Auto-rotates with slide dots. Vertically centered.
3. **Value bridge** — one-line value prop + primary CTA (`Crea tu alarma gratis`).

`Entrar` / `Regístrate` (top-right) open auth in a **modal over the landing** (routes `/login`, `/register`). Forgot/reset/verify are focused routes (email deep-links). After login → `/dashboard`.

### Conventions

- **Loading = shape-matched `Skeleton`** (`src/shared/ui/skeleton.tsx`), never spinners or "Loading…" text.
- **Forms** = React Hook Form + Zod + the shadcn form kit; validation messages are **i18n keys** translated at render by `FormMessage`.
- **Feedback** = `sonner` toasts on mutations (success + error); never toast field validation (inline via `FormMessage`).
- **i18n** = every string via `t()` (`react-i18next`, EN + ES, browser-detected, Spanish fallback). A compact `LanguageSwitcher` sits in the landing header, the auth shell, and the app sidebar.
- **Auth tokens are in-memory only** (Zustand, non-persisted) — reload is unauthenticated by design until the backend issues an httpOnly refresh cookie.

---

## Phase 2 — Alarms (built surfaces)

> Documented after implementation. Extends the brand book; where they differ, these win for the alarms feature.

### Selection surfaces (picker, not `<select>`)

Choices that will grow, or that carry more than a label, render as a **card grid with a filter box**, never a native `<select>`:

- **`ProductPicker`** (`features/alarms/components/`) — the create wizard's step 1. Search (300ms debounce) + category / subcategory / price filters, a `sm:grid-cols-2 lg:grid-cols-3` grid of listing cards (thumbnail, description, `font-mono` price + currency, location, `Featured` chip, views), prev/next cursor pagination. Loading = 6 shape-matched `Skeleton` cards.
- **`ConditionPicker`** (`features/alarms/components/`) — replaces the alarm-condition `<select>`. Filter box + `role="radiogroup"` of condition cards (lucide icon + label). The **selected** card is `border-success bg-success/10 text-on-surface`; unselected is `border-outline-variant text-on-surface-variant` with a hover lift to `border-outline`. Plan-locked conditions render `opacity-50 cursor-not-allowed` with a `Lock` glyph and a `text-warning` "available on a higher plan" line.

Selected-state token across both: emerald (`success`) fill at 10%, emerald border — the same data-signal emerald used on the leaderboard.

### Data table — the row is the primary action

`AlarmsTable` rows navigate to **edit** on click of any cell **except** the last (actions) cell, which `stopPropagation`s so its view / pause-resume controls act independently. The row carries `role="link"`, `tabIndex={0}`, an `aria-label` naming the alarm, and Enter/Space keyboard activation; focus shows `ring-2 ring-inset ring-ring`. Row hover = `surface-container-high`; the action icon-buttons hover one tonal step higher (`surface-container-highest`).

### Plan gating is structural, not decorative

When the account is at its alarm limit the **primary "Create alarm" action is removed**, not just disabled — only the `font-mono` usage counter and a `text-warning` limit line remain. `AlarmCreatePage` still renders a full `EmptyState` (ShieldAlert + upgrade copy + back link) for anyone who reaches `/alarms/new` directly.

### Other Phase 2 primitives

- **`Modal` / `ConfirmDialog`** (`src/shared/ui/`) — dependency-free overlay (Esc + backdrop close, `shadow-elevation-3`, `bg-surface-container`). Destructive confirms keep the dialog open while the mutation is pending; the confirm button is `variant="destructive"` and its label carries "permanently".
- **`OfflineBanner`** (`features/alarms/components/alarm-list/`) — `role="status"`, `border-warning/40 bg-warning/10 text-warning`, shown above the list while `navigator.onLine` is false. The list keeps rendering from the IndexedDB-persisted query cache underneath.
- **Detail page** (`/alarms/:id`) — two tonal cards (`Configuración`, `Estado`) in a `md:grid-cols-2`, then a full-width trigger-history timeline; `font-mono` for every date and price value.
- **Metric Cards:** Large technical-weight numbers (Geist Mono) with a small trend indicator (Arrow + Percentage) positioned in the top right.