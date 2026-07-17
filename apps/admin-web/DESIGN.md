---
name: BazaarSentinel
colors:
  surface: '#051424'
  surface-dim: '#051424'
  surface-bright: '#2c3a4c'
  surface-container-lowest: '#010f1f'
  surface-container-low: '#0d1c2d'
  surface-container: '#122131'
  surface-container-high: '#1c2b3c'
  surface-container-highest: '#273647'
  on-surface: '#d4e4fa'
  on-surface-variant: '#debec8'
  inverse-surface: '#d4e4fa'
  inverse-on-surface: '#233143'
  outline: '#a68992'
  outline-variant: '#574048'
  surface-tint: '#ffb0cd'
  primary: '#ffb0cd'
  on-primary: '#640039'
  primary-container: '#f751a1'
  on-primary-container: '#570032'
  inverse-primary: '#b4136d'
  secondary: '#c8c6c5'
  on-secondary: '#303030'
  secondary-container: '#474746'
  on-secondary-container: '#b7b5b4'
  tertiary: '#bec6e0'
  on-tertiary: '#283044'
  tertiary-container: '#8990a8'
  on-tertiary-container: '#22293d'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffd9e4'
  primary-fixed-dim: '#ffb0cd'
  on-primary-fixed: '#3e0022'
  on-primary-fixed-variant: '#8c0053'
  secondary-fixed: '#e5e2e1'
  secondary-fixed-dim: '#c8c6c5'
  on-secondary-fixed: '#1b1b1c'
  on-secondary-fixed-variant: '#474746'
  tertiary-fixed: '#dae2fd'
  tertiary-fixed-dim: '#bec6e0'
  on-tertiary-fixed: '#131b2e'
  on-tertiary-fixed-variant: '#3f465c'
  background: '#051424'
  on-background: '#d4e4fa'
  surface-variant: '#273647'
typography:
  headline-xl:
    fontFamily: Geist
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-xs:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '500'
    lineHeight: 14px
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
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 32px
---

## Brand & Style
The brand personality is authoritative, technical, and vigilant. It is built for power users who require high-density information environments with zero visual fluff. The design style is a hybrid of **Minimalism** and **Geist-inspired Technicality**, emphasizing utility over ornamentation. 

The aesthetic is "Obsidian Hearth"—a deep, dark-mode-first approach that evokes the feeling of a sophisticated command center. The emotional response should be one of total control, precision, and reliability. This design system prioritizes clarity through a strict grid, monospaced-leaning typography, and a subdued but functional color palette.

## Colors
The palette is centered on the **Obsidian Hearth** theme. The foundation is a series of deep, layered grays and blacks that provide a low-fatigue environment for long-term monitoring.

- **Primary**: A vibrant Pink/Magenta (#EC4899) used sparingly for critical actions, active states, and data highlights.
- **Secondary**: A deep charcoal (#1E1E1E) for surface containers and UI cards.
- **Tertiary**: A dark navy-tinted black (#0F172A) for the primary background.
- **Neutral**: Slate grays used for secondary text and borders to maintain a low-contrast, technical feel.

Success, warning, and error states should utilize high-saturation tones (Emerald 500, Amber 500, Rose 500) against the dark backdrop for immediate recognition.

## Typography
Typography is the primary tool for hierarchy. **Geist** provides a clean, Swiss-style neo-grotesque look for headings and body copy, while **JetBrains Mono** is utilized for labels, data points, and metadata to reinforce the technical nature of the system.

- **High Density**: Font sizes are slightly smaller than average (14px base) to allow for more information on screen.
- **Data Emphasis**: Use monospaced labels for all numerical data to ensure column alignment in tables and lists.
- **Hierarchy**: Use font weight (SemiBold to Bold) rather than size increases to differentiate sections in compact views.

## Layout & Spacing
The layout follows a **Fluid Grid** model with a strict 4px baseline rhythm. This ensures that every element, from an icon to a card container, is aligned to a predictable technical scale.

- **Desktop**: 12-column grid with 16px gutters. Max-width is capped at 1440px for dashboard views.
- **Tablet**: 8-column grid with 16px gutters.
- **Mobile**: 4-column grid with 16px margins.
- **Density**: Use "Compact" spacing (8px or 12px) for data-heavy tables and "Relaxed" spacing (24px+) for marketing or landing pages.

## Elevation & Depth
This design system avoids traditional shadows in favor of **Tonal Layering** and **Low-contrast Outlines**. Depth is communicated through color luminance rather than physical distance.

- **Level 0 (Base)**: The darkest surface (#0F172A).
- **Level 1 (Card/Surface)**: Slightly lighter gray (#1E1E1E) with a 1px solid border (#334155).
- **Level 2 (Popovers/Modals)**: Use a subtle backdrop blur (8px) and a slightly brighter border (#475569) to indicate interaction priority.
- **Active States**: Use the Primary color (#EC4899) as a subtle outer glow (2px spread, 20% opacity) only for focused input fields.

## Shapes
In line with the technical aesthetic, shapes are strictly geometric with minimal rounding. 

- **Base Radius**: 4px for buttons, inputs, and small containers.
- **Large Radius**: 8px for cards and primary layout sections.
- **Circular**: Only used for user avatars or status indicators (dots).
- **Borders**: All containers should feature a 1px solid border to define boundaries within the dark-on-dark interface.

## Components
Consistent component styling ensures the technical integrity of the system:

- **Buttons**: Square-ish (4px radius). Primary buttons use a solid #EC4899 background with white text. Secondary buttons use a ghost style with a 1px border.
- **Inputs**: Darker than the surface background. 1px border (#334155) that turns Primary (#EC4899) on focus. Labels use JetBrains Mono (label-xs).
- **Chips/Tags**: Small, rectangular, using a subtle background tint of the status color (e.g., dark green background for a "Success" tag).
- **Lists/Tables**: High-density rows (32px-40px height). Use zebra-striping with a 2% luminance difference between rows.
- **Cards**: Flat containers with 1px borders. No shadows. Use "Internal Headers" (a 1px bottom border separating the card title from content).
- **Status Indicators**: Small 8px circles. Pulsing animation allowed for "Live" or "Critical" monitoring states.