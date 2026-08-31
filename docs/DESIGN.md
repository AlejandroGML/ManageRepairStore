---
version: alpha
name: Manage Repair Store
description: Data-dense repair-shop management dashboard. Violet/indigo primary (far from the previous orange brand), teal accent for actions, neutral slate text, tight spacing for maximum data visibility. Chilean-market POS/repair management with RUT, CLP and PDF/QR tickets.
colors:
  primary: "#6D28D9"
  primary-active: "#5B21B6"
  primary-disabled: "#DDD6FE"
  primary-soft: "#EDE9FE"
  secondary: "#312E81"
  sidebar-dark: "#15121d"
  accent: "#0F766E"
  text: "#1F2937"
  text-strong: "#111827"
  muted: "#6B7280"
  canvas: "#FAFAFE"
  surface: "#FFFFFF"
  hairline: "#E5E7EB"
  surface-dark: "#17151F"
  surface-dark-elevated: "#221E33"
  hairline-dark: "#3B3649"
  on-primary: "#FFFFFF"
  on-dark: "#EDE9FE"
  on-dark-soft: "#9CA3AF"
  success: "#047857"
  warning: "#F59E0B"
  error: "#DC2626"
  success-soft: "#ECFDF5"
  warning-soft: "#FFFBEB"
  error-soft: "#FEF2F2"
  brand-mid: "#4C3FA6"
  warning-dark: "#FBBF24"
typography:
  display:
    fontFamily: "Fira Sans, Roboto, sans-serif"
    fontSize: 24px
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Fira Sans, Roboto, sans-serif"
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "0em"
  body:
    fontFamily: "Fira Sans, Roboto, sans-serif"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0em"
  body-sm:
    fontFamily: "Fira Sans, Roboto, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "0em"
  mono:
    fontFamily: "Fira Code, monospace"
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.45
    letterSpacing: "0em"
rounded:
  xs: 2px
  sm: 4px
  md: 8px
  lg: 12px
  xl: 16px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  base: 16px
  lg: 24px
  xl: 32px
components:
  page:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.text}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
    padding: "{spacing.base}"
  button-accent:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
    padding: "{spacing.base}"
  button-secondary:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary-active}"
    rounded: "{rounded.md}"
    padding: "{spacing.base}"
  button-disabled:
    backgroundColor: "{colors.primary-disabled}"
    textColor: "#4B5563"
    rounded: "{rounded.md}"
    padding: "{spacing.base}"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.lg}"
  sidebar:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.on-dark}"
  sidebar-dark:
    backgroundColor: "{colors.sidebar-dark}"
    textColor: "{colors.on-dark}"
  table-row:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
  table-row-hover:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.text-strong}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.sm}"
  status-success:
    backgroundColor: "{colors.success}"
    textColor: "#FFFFFF"
  status-warning:
    backgroundColor: "{colors.warning}"
    textColor: "#111827"
  status-error:
    backgroundColor: "{colors.error}"
    textColor: "#FFFFFF"
  badge-success:
    backgroundColor: "{colors.success-soft}"
    textColor: "{colors.success}"
  badge-warning:
    backgroundColor: "{colors.warning-soft}"
    textColor: "#B45309"
  badge-error:
    backgroundColor: "{colors.error-soft}"
    textColor: "#B91C1C"
  badge-warning-dark:
    backgroundColor: "{colors.warning-soft}"
    textColor: "{colors.warning-dark}"
  brand-gradient:
    backgroundColor: "{colors.brand-mid}"
    textColor: "{colors.on-primary}"
  dark-card:
    backgroundColor: "{colors.surface-dark-elevated}"
    textColor: "{colors.on-dark}"
  dark-canvas:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.on-dark}"
  caption:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.muted}"
  caption-dark:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.on-dark-soft}"
  divider:
    backgroundColor: "{colors.hairline}"
    textColor: "{colors.text}"
  divider-dark:
    backgroundColor: "{colors.hairline-dark}"
    textColor: "{colors.on-dark}"
---

# Manage Repair Store — Design System

Point-of-sale / repair-shop management dashboard for the Chilean market. The UI is
**data-dense**: product tables, KPI stock cards, order lists and PDF tickets. Design
language is professional, calm and precise — think enterprise operations tool, not
consumer app.

## Brand color — Violet/Indigo (NO orange)

The original project used an orange brand (`#E67A1B`). That color is **retired** for
brand use — the new identity is a deep violet primary with a deep-indigo secondary and
a teal action accent:

- `primary` `#6D28D9` — buttons, active states, focus rings, selected rows, Material primary.
- `secondary` `#312E81` — sidebar, top bar, dark surfaces.
- `accent` `#0F766E` — CTAs, links, "completar venta", positive actions.
- `primary-soft` `#EDE9FE` — hover backgrounds, chips, selected table rows.

**Rule**: orange/amber is reserved **only** for the semantic `warning` status
(`#F59E0B`). It must never appear in brand elements, headers, logos or primary buttons.

## Color application

- Canvas `#FAFAFE` (subtle cool tint, replaces the warm cream `#FFF5E6`).
- Text `#1F2937` on light; `on-dark` `#EDE9FE` on dark surfaces.
- Success `#047857`, warning `#F59E0B`, error `#DC2626` — status badges, toasts, stock alerts.
- Soft status tints for badge backgrounds: `success-soft` `#ECFDF5`, `warning-soft`
  `#FFFBEB`, `error-soft` `#FEF2F2`. Badge text: success uses the strong token;
  warning uses `#B45309` (amber-700) for contrast on the pale tint; error uses
  `#B91C1C` (red-700) to keep WCAG AA on `error-soft`.
- `brand-mid` `#4C3FA6` — gradient midpoint for brand surfaces (login panel,
  sidebar brand-mark). `warning-dark` `#FBBF24` — warning text on dark surfaces.
- Known limitation (prototype-faithful): `badge-warning-dark` (#FBBF24 on
  #FFFBEB) sits at 1.61:1. The prototype keeps the pale pill background in dark
  mode and only swaps the text color. Acceptable for status badges; a future
  a11y pass could use a dark amber pill (#78350F bg + #FBBF24 text).
- Dark mode surfaces: `surface-dark` `#17151F`, elevated `#221E33`, hairline `#3B3649`.

Contrast: `primary` on white = 7.1:1 (AAA), `on-primary` white on `primary` = 7.1:1,
white on `accent` = 5.5:1 (AA), `on-dark` on `secondary` = 9.6:1 (AAA), white on
`success` = 5.5:1, white on `error` = 4.8:1.

## Typography

- Body/UI: **Fira Sans** (Roboto fallback). Weights 400/500/700.
- Data (RUTs, prices, stock numbers, order codes): **Fira Code** mono — precise,
  aligned columns, technical trust.
- Sizes: 14px base for tables (body-sm), 16px body, 18px titles, 24px page display.
- UI copy stays Chilean Spanish.

## Layout & density

- Data-dense grid: minimal padding, `spacing.sm/md` inside tables, `spacing.base/lg`
  between sections.
- Radius scale: `sm` (inputs) → `md` (buttons, chips) → `lg` (cards). Never pill-shaped
  buttons; `full` only for badges.
- Shadows: subtle (`0 1px 2px rgba(0,0,0,0.05)`, `0 4px 6px rgba(0,0,0,0.1)`). No heavy
  drop shadows.

## Angular Material mapping

Material 3 theme via `1FRONT/src/_theme.scss`:

- `$mrs-light-theme` / `$mrs-dark-theme` use `mat.$violet-palette` as primary.
- SCSS tokens live in `1FRONT/src/_variables.scss` (single source of truth for
  components); this file is the executable mapping of this document.
- Logo placeholder: `1FRONT/src/assets/img/logo-300x80.png` (300×80, `#6D28D9`
  background, white "Manage Repair Store" text). The backend PDF service loads it at
  boot — restart the backend after changing it.

## Interaction rules

- Hover states: `primary-soft` backgrounds on table rows, 150–300ms transitions.
- Focus rings visible for keyboard navigation (primary color outline).
- No layout shift on hover (reserve borders/whitespace).
- PDF tickets are print-oriented: black/white layout, brand logo in header only.
