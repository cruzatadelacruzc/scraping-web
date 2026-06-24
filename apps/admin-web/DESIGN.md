---
name: BazaarSentinel Admin
description: Brand book for the BazaarSentinel Super Admin SPA — dark, dense, navy-indigo operations console for marketplace listing monitoring.
mode: dark-only
palette: Indigo Operations
standards: Material Design 3 (dark theme token system)
---

# BazaarSentinel — Super Admin Brand Book

This document defines the **visual identity** of the Super Admin SPA. It describes how the product looks and feels — palette, typography, depth, shape, and the aesthetic logic behind each component. It does NOT prescribe UX patterns, async states, or code conventions. Those live in `.claude/rules/admin-web-ui.md` and `apps/admin-web/CLAUDE.md`.

Audience: designers and engineers defining look & feel. Reading time: ~15 minutes.

The visual system follows **Material Design 3 dark theme conventions** for the token names and tier ladder — chosen because M3's surface model maps cleanly onto shadcn/ui's CSS-variable architecture, and because a design agent can consume the YAML frontmatter below to regenerate visual prototypes deterministically.

---

## 1. Brand & Style

**Personality: Calm Authority.** BazaarSentinel is an operations console — the tool a system owner opens at 2am when a tenant's alarms are firing. The interface should feel like a **well-built instrument panel**: precise, legible under stress, and visually quiet so the data can speak.

**Aesthetic movement: Technical Minimalism.** High contrast on matte navy surfaces. Ultra-fine lines. A single measured indigo accent. No neon, no glow, no "hacker" tropes. The closest mental model is a Bloomberg terminal crossed with Linear's restraint — not a SaaS marketing page.

**Emotional contract with the user:**
- Trust through restraint — no decorative motion, no colored noise.
- Density as competence — if the screen is sparse, the user wonders what is hidden.
- Predictability over delight — the same icon, the same position, the same hover affordance every time.

**Tone of voice in microcopy:** declarative, not chatty. "Delete user?" not "Are you sure you want to delete this user?" The user is an operator; the UI respects their time.

---

## 2. Colors

The palette is anchored by a **cool navy foundation** (`#051424`) that gives the indigo accent room to breathe. The accent is **Indigo Operations** — a desaturated indigo that reads as "primary action" without the urgency of pure red or the frivolity of cyan.

### 2.1 Surface tier ladder (Material Design 3)

Six tiers, each one a brightness step up from the void. Depth is communicated by stepping up the ladder, never by adding drop shadows to floor-level elements.

| Token | Hex | Usage |
|---|---|---|
| `surface` | `#051424` | Page background. The "void" floor. |
| `surface-dim` | `#051424` | Dim variant of surface (low ambient brightness). |
| `surface-bright` | `#2c3a4c` | Bright variant (used sparingly for high-emphasis areas). |
| `surface-container-lowest` | `#010f1f` | The deepest container; reserved for inset wells and code blocks. |
| `surface-container-low` | `#0d1c2d` | Low-emphasis containers (page-level wrappers). |
| `surface-container` | `#122131` | Default card/panel surface. |
| `surface-container-high` | `#1c2b3c` | Elevated containers (popovers, dropdowns). |
| `surface-container-highest` | `#273647` | Highest-emphasis containers (modals, dialogs). |
| `surface-variant` | `#273647` | Variant used for non-container decorative elements. |

**In practice:** 95% of cards/panels use `surface-container`. `surface-container-high` and `highest` are reserved for things that float above the page (popovers, modals). The deeper tiers (`lowest`/`low`) are used for inset wells like code blocks and JSON viewers.

### 2.2 Borders & outlines

| Token | Hex | Usage |
|---|---|---|
| `outline-variant` | `#464554` | Default 1px borders, table dividers, card edges. |
| `outline` | `#908fa0` | Stronger borders; used on focused inputs and emphasized containers. |

The M3 system distinguishes `outline` (high-emphasis) from `outline-variant` (low-emphasis). Use `outline-variant` by default; promote to `outline` only when the border is the primary affordance (focus state).

### 2.3 Text

| Token | Hex | Usage |
|---|---|---|
| `on-surface` | `#d4e4fa` | Primary text. Cool off-white tinted toward blue to harmonize with the navy surface. |
| `on-surface-variant` | `#c7c4d7` | Secondary text — body copy, table cells. |
| (muted, derived) | `#a1a1aa` | Labels, captions, metadata, disabled. Derived in Tailwind, not in M3 spec. |

Three text levels — not four. Operators scan differences fast; more than three weights creates ambiguity about what matters.

### 2.4 Primary: Indigo Operations

The primary role follows M3's tint pattern: a **light accent color** for tinting UI elements, and a **saturated container color** for filled buttons.

| Token | Hex | Usage |
|---|---|---|
| `primary` | `#c0c1ff` | Tint color — used for active state indicators, focus rings, link text, icon highlights. |
| `on-primary` | `#1000a9` | Text/icons that sit ON a `primary`-tinted background. |
| `primary-container` | `#8083ff` | Filled button background. Saturated indigo. |
| `on-primary-container` | `#0d0096` | Text/icons on a `primary-container` background. |
| `inverse-primary` | `#494bd6` | Primary color when the surface inverts to light. (Not used in dark-only MVP.) |

**Button recipe:** `bg-primary-container` + `text-on-primary-container` + `rounded-md`. The light accent (`primary`) is reserved for non-filled UI: focus rings, active list-item indicators, link text.

**Hover recipe:** lighten `primary-container` by ~8% (use the `surface-tint` `#c0c1ff` at 20% opacity as an overlay). **Press recipe:** darken `primary-container` by ~6% AND add a 2px `primary` ring with 4px offset.

### 2.5 Semantic states

Each state has a **default** (saturated, for buttons/icons) and a **muted** (15% opacity background, for badges/inline indicators). Status is always paired with an icon — color alone is never sufficient.

| State | Default | Muted background | Usage |
|---|---|---|---|
| Success | `#34d399` | `#34d399` @ 15% | `2xx`, active alarms, healthy scrapers, positive deltas. |
| Danger | `#f87171` | `#f87171` @ 15% | `5xx`, `401 expired`, destructive actions, negative deltas. |
| Warning | `#fbbf24` | `#fbbf24` @ 15% | `4xx` validation, pending alarms, past-due subscriptions. |
| Info | `#60a5fa` | `#60a5fa` @ 15% | Informational toasts, neutral system events. |

Semantic colors are slightly **lifted in luminance** relative to the M3 defaults to ensure distinct visibility against the navy surface. This is the only place the design deviates from a strict M3 lift.

### 2.6 Light Mode

Not supported in MVP. If added later, it MUST be implemented as a second token set in the Tailwind config without changing component code. The component layer never references raw hex; it only references semantic tokens.

### 2.7 Contrast

WCAG AA verified across all text-on-surface combinations:

| Combination | Ratio | Grade |
|---|---|---|
| `on-surface` (`#d4e4fa`) on `surface` (`#051424`) | 14.2:1 | AAA |
| `on-surface` on `surface-container` (`#122131`) | 11.8:1 | AAA |
| `on-surface-variant` (`#c7c4d7`) on `surface-container` | 10.4:1 | AAA |
| `primary` (`#c0c1ff`) on `surface` | 12.6:1 | AAA |
| `on-primary-container` (`#0d0096`) on `primary-container` (`#8083ff`) | 5.8:1 | AA Large |
| Muted text on `surface-container` | 7.1:1 | AAA |

The `primary-container` button color does NOT meet AA for body text — it is reserved for button labels (AA Large applies) and large display use only.

---

## 3. Typography

A **dual-family strategy** with both families from the **Geist** superfamily — chosen because Geist is the Vercel/shadcn-default, ships as a variable font with excellent screen rendering, and the Mono variant aligns tabular numerics natively.

### 3.1 Geist Sans — display & UI

Variable font covering all weights. Geist Sans has a slightly geometric, "engineered" feel that suits a technical operations console.

- Weights used: 400 (body), 500 (medium — labels, table headers), 600 (semibold — headlines, button labels), 700 (display — page heroes).
- Tracking: default for body and labels; `-0.02em` for headlines ≥28px to tighten rhythm; `-0.01em` for `headline-lg` (28px) specifically.

### 3.2 Geist Mono — data & code

Reserved for **anything that is not natural language**: user IDs, prices, timestamps, JSON snippets, badge labels, status indicators, table numeric columns.

Why mono from the same family: keeps the typographic system coherent (no competing sans-serifs), while still signaling "data" via the monospace metrics. Geist Mono has excellent OpenType features including `tnum` (tabular numbers).

### 3.3 Type scale

Seven sizes, rigidly enforced:

| Token | Size | Line height | Weight | Usage |
|---|---|---|---|---|
| `text-xs` | 12px | 16px | 400/500 | Captions, badge text, mono labels, table headers (uppercase). |
| `text-sm` | 14px | 20px | 400 | Default body, table cells, button labels. |
| `text-base` | 16px | 24px | 400 | Form inputs, dialog body, descriptions. |
| `text-lg` | 20px | 28px | 600 | Section headers, empty-state titles. |
| `text-xl` | 24px | 32px | 600 | Page titles. |
| `text-2xl` | 30px | 36px | 600 | Empty-state hero (rare). |
| `display` | 36px | 44px | 700 | Onboarding splash only. |

No intermediate sizes (13, 15, 17, 18, 22...). A rigid scale prevents drift toward incoherence in six months.

### 3.4 Numeric alignment

All numeric columns MUST use **Geist Mono with `tabular-nums`**. Prices, counts, percentages, IDs — every digit occupies the same advance width. A column of `9,999` aligns as cleanly as a column of `1`. This is non-negotiable for any financial or count column.

### 3.5 Timestamps

ISO 8601 in UTC at the API boundary. Formatted to the user's locale for display via `date-fns` + `date-fns-tz`. The display layer never trusts the server's date string format; it parses and re-formats.

---

## 4. Layout & Spacing

A **4px base unit**. Every margin, padding, and gap is a multiple of 4. The scale uses both numeric (Tailwind-native) and semantic (M3-friendly) names.

### 4.1 Spacing scale

| Token | Value | Usage |
|---|---|---|
| `xs` | 4px | Micro-spacing inside icon+label clusters. |
| `sm` | 8px | Compact gaps within a group (related controls). |
| `md` | 16px | Default page gutter, card inner padding (comfortable). |
| `lg` | 24px | Container margins on desktop, separation between sections. |
| `xl` | 32px | Major section breaks, modal/dialog outer padding. |

### 4.2 Container padding

- Outer page container: `p-md` (16px) maximum.
- Card inner padding: `p-sm` (8px) for compact telemetry cards, `p-md` (16px) for comfortable forms.
- Table cell padding: `p-xs` (4px) horizontally, `p-sm` (8px) vertically.

### 4.3 Density philosophy

High information density is a feature, not a bug. A user MUST be able to see ~20 rows of data on a 1080p screen without scrolling. When in doubt, choose compact over spacious. This is the **opposite** of consumer SaaS aesthetics — the operator wants data, not whitespace.

### 4.4 Whitespace rules

Use whitespace to **group** related content (`gap-sm` between search and filter cluster). Use whitespace to **separate** unrelated sections (`space-y-lg`). Within a group, use `space-y-xs` so the eye reads the cluster as one block. Never use whitespace as decoration.

### 4.5 Page layout

- **Top bar** (`h-12`, fixed): logo + global search (`⌘K`) + tenant switcher + user menu. Background `surface`.
- **Side nav** (`w-60`, 240px, collapsible to `w-12`): module sections with icon + label. Background `surface-container-low`.
- **Content area** (`flex-1`, scroll): page-level route content, `p-md`. Background `surface`.

The chrome and the content share the navy tonal family — no contrast break between them. The product is one continuous canvas.

### 4.6 Breakpoints

- Mobile (<640px): single column, side nav collapsed to drawer.
- Tablet (640–1024px): 2-column card layouts, side nav collapsible.
- Desktop (>1024px): 12-column grid, side nav permanent, multi-column tables.

---

## 5. Elevation & Depth

In a dark-mode system, **drop shadows are unreliable** — they nearly disappear against `#051424`. Depth is communicated through the **tonal tier ladder** (§2.1) and **matte 1px borders**.

### 5.1 Tier ladder recap

- **Tier 0 (floor):** `surface` `#051424`. The page floor.
- **Tier 1 (containers):** `surface-container` `#122131`. Cards, panels, table rows.
- **Tier 2 (raised):** `surface-container-high` `#1c2b3c` / `highest` `#273647`. Popovers, dropdowns, modals.

A card on the page floor reads as "elevated" purely by being one tier lighter — no shadow needed. Hover states on dropdown items shift up one tier.

### 5.2 Borders

- Default border: 1px solid `outline-variant` `#464554`.
- Strong border: 1px solid `outline` `#908fa0`. Used when the border is the primary affordance (focus, emphasis).
- Focus border: 2px solid `primary` `#c0c1ff`. Always visible (see §8 Accessibility).
- Destructive border: 1px solid `danger` for inline error states on form fields.

No double borders, no heavy outlines.

### 5.3 Shadows (reserved for overlays)

Shadows appear ONLY on floating overlays that must read as above the page surface:

- Dropdowns / popovers: `shadow-md` (medium blur, pure black at 5% opacity).
- Modals / dialogs: `shadow-lg` (larger blur, pure black at 10% opacity).

Shadow color is always pure black, never tinted. A tinted shadow signals palette drift.

### 5.4 Interactive hover glow

For interactive cards (e.g., tenant rows, alarm cards), the hover state brightens the border to `primary` at 50% opacity. This creates a subtle "tactical glow" that signals affordance without changing the underlying surface. The effect is one border color swap — no transform, no shadow change.

### 5.5 Press behavior

On press (mousedown / `:active`), an interactive element does NOT lift — it **insets**. Background shifts to one tier below (e.g., a `surface-container` button becomes `surface` on press). This reinforces the physical-instrument metaphor: the user is pushing a control into the panel.

---

## 6. Shapes

The shape language is **Soft-Square (6px)**. All corners use `rounded-md` (0.375rem).

### 6.1 Why 6px

- 4px reads as "almost square" — the roundness feels accidental.
- 8px+ starts to feel like a chat app.
- 6px is the shadcn default AND aligns with Tailwind's `rounded-md` token — zero friction for engineers wiring up components.

It signals "modern software" without becoming playful or consumer-y.

### 6.2 Radius scale

| Token | Value | Usage |
|---|---|---|
| `rounded-sm` | 2px | Tooltips, badges, tags, inline chips. |
| `rounded-md` | 6px | Default — buttons, inputs, cards, dialogs. |
| `rounded-lg` | 8px | Modals, large containers. |
| `rounded-xl` | 12px | Reserved for hero cards and marketing surfaces. |
| `rounded-full` | 9999px | Avatars, status pips, radio dots. |

### 6.3 Inner-radius concentricity

When nesting elements (e.g., a button inside a card, an input inside a modal), the inner element MUST use a radius **2px smaller** than the outer container. This maintains visual concentricity:

- Card `rounded-md` (6px) → Button inside `rounded-sm` (4px-ish via `rounded` which is 4px).
- Modal `rounded-lg` (8px) → Input inside `rounded-md` (6px).

Without this rule, nested corners visually misalign and the design feels off-grid.

### 6.4 Square exceptions

- Table cells (no radius — they form a grid).
- Code blocks / JSON viewers (sharp — "this is data, not UI").
- Status pip / radio dot (perfect circle for geometric contrast).

---

## 7. Components

A component is the smallest reusable piece of visual + interaction logic. Base primitives come from **shadcn/ui** (Radix + Tailwind); the brand layer applies on top. Every component has defined states for empty, loading, error, and disabled — those are siblings, not afterthoughts.

### 7.1 Buttons

- **Primary:** `bg-primary-container` (`#8083ff`), `text-on-primary-container` (`#0d0096`), `rounded-md`, `h-9`. Used once per view (the one decisive action).
- **Secondary:** `bg-surface-container-low` (`#0d1c2d`), 1px `outline-variant` border, `text-on-surface`. Hover → brighten border to `outline`.
- **Destructive:** `bg-danger`, `text-on-primary`. Used ONLY inside confirmation dialogs and inline error states. Never on a list row.
- **Ghost:** transparent background, `text-on-surface-variant`. Hover → `bg-surface-container-high`.

Icon-only buttons MUST be square (`h-9 w-9`) and have `aria-label`. No naked icons outside an `aria-hidden` decorative context.

### 7.2 Inputs

- Background `surface-container-low` (`#0d1c2d`), 1px `outline-variant` border, `rounded-md`, `h-9`.
- Focus: 2px `primary` border, no shadow. The ring IS the focus indicator.
- Error: 1px `danger` border + danger-colored helper text below.
- Disabled: `text-on-surface-variant` at 50% opacity, `surface-container` background, no border.

### 7.3 Tables

- Header row: `bg-surface`, sticky on scroll, `text-on-surface-variant` uppercase tracking, `text-xs` weight 500.
- Body rows: `h-8` (32px) compact / `h-9` (36px) default, `text-sm`, separated by 1px `outline-variant`. No zebra striping.
- Hover: border brightens to `primary` at 50% opacity.
- Selected: `bg-primary` at 10% opacity + 2px left border `primary`.
- Numeric columns: right-aligned, **Geist Mono**, `tabular-nums`.

Tables are the most important component in this product. Operators spend 80% of their time in table view. Density and rhythm are non-negotiable.

### 7.4 Badges & status

A badge pairs a color with an icon. The color is never the only signal.

| Icon (lucide) | Color | Meaning |
|---|---|---|
| `Check` | success | Active, healthy, completed. |
| `X` | danger | Failed, suspended, deleted. |
| `AlertTriangle` | warning | Pending, past-due, attention needed. |
| `Info` | info | Informational, neutral. |
| `Circle` (filled) | muted | Standby, dormant, inactive. |

Badge recipe: `font-mono`, `text-xs`, padding `rounded-sm`, background = semantic color at 15% opacity, text = semantic color at full saturation. Color carries the badge; the icon carries the meaning.

### 7.5 Charts

- **Recharts** is the default. **Tremor** is permitted only for dashboard KPI cards with delta indicators.
- No chart background fills — charts sit directly on `surface-container`.
- Grid lines: 1px `outline-variant` at 40% opacity. Horizontal only; vertical gridlines on time series are visual noise.
- Tooltips: `bg-surface-container-highest`, `text-on-surface`, Geist Mono for values, `rounded-sm`.
- Multiple series: cycle `primary-container` → `success` → `warning` → `on-surface-variant`. The fourth series is muted deliberately — by the time you need four lines, the chart is already too dense.

### 7.6 Empty / loading / error

Every list, table, and chart has three siblings: `Empty`, `Skeleton`, and `ErrorBoundary`.

- **Empty:** centered icon (lucide, 48px, `text-on-surface-variant`) + `text-lg` title + `text-on-surface-variant` description + optional CTA. No illustration art.
- **Loading:** shape-matched skeleton — `<TableSkeleton rows={10} cols={12} />`, `<ChartSkeleton />`, or `<CardSkeleton />`. Defined as public contract components in `src/shared/ui/skeletons/`. A skeleton replicates the final layout's geometry; it is NOT a generic shimmer box.
- **Error:** per-route `ErrorBoundary`. On error: card with title "Something went wrong", description, "Reload" + "Report issue" buttons.

For loading, **never** show a full-page spinner or overlay. The skeleton is the loading state.

### 7.7 Live status indicators

Small 8px pulsing dots for "Live" connectivity status (e.g., active scraper, websocket connection). The pulse animation is a single CSS keyframe at 2s interval. Color comes from the semantic palette. Use sparingly — every dot that pulses competes for attention.

---

## 8. Accessibility

The visual system supports accessibility as a baseline — not as a separate concern.

### 8.1 Focus rings

- ALWAYS visible. `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface`.
- DO NOT remove outlines (`outline-none`) without a replacement.

### 8.2 Keyboard navigation

- All interactive elements reachable via `Tab`.
- `Esc` closes modals and popovers.
- `Enter` submits forms or activates the primary button.
- `⌘K` opens the command palette.

### 8.3 Color contrast

WCAG AA minimum (4.5:1 for body, 3:1 for large text). Verified per palette in §2.7. The `primary` and `primary-container` roles are reserved for UI affordances — body text MUST use `on-surface` or `on-surface-variant`.

### 8.4 Status color + icon

Status colors MUST NOT rely on color alone. Every colored indicator is paired with a lucide icon (see §7.4).

### 8.5 Screen reader labels

- Every icon-only button MUST have `aria-label`.
- Decorative icons MUST have `aria-hidden="true"`.
- Tables MUST have a `<caption>` (visually hidden is fine).

---

## 9. Anti-patterns (visual)

The following are explicitly forbidden in the visual layer. Code review MUST reject them.

- Raw hex values in component code — use semantic tokens from §2.
- Emoji as UI icons — use `lucide-react`.
- Inline `style={{ color: '#...' }}` — Tailwind classes or `cn()` only.
- Drop shadows on cards or list items — depth comes from the tonal tier ladder.
- Colored body text (e.g., `text-success` for "Active" label) — use a badge instead.
- Font families beyond Geist Sans and Geist Mono — no exceptions.
- Square corners on cards/buttons/dialogs — `rounded-md` is mandatory.
- Gradients on UI elements — gradients are reserved for chart fills only.
- Glow / blur effects on borders or text — flat, matte, always. The one exception is the §5.4 hover border tint, which is a single color swap, not a blur.
- Sharp inner corners in nested elements — respect the §6.3 concentricity rule.