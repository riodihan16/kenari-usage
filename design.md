# Design — Kenari Usage

A locked design system for this app. Every window reads this file before
emitting code. Do not regenerate per window — extend or amend this file when
the system needs to grow.

## Genre

modern-minimal (extended). Base register: restrained, sans top-to-bottom,
near-monochrome, single accent used as signal. Extensions recorded here
(explicit user brief — "bold, modern, strong, curvy, anti-gradasi"):

- Display weight raised to 800 (genre default: 500–700).
- Radius language is "curvy": cards 22 px, floating surfaces 28 px, pills 999 px
  (genre default: 6–8 px). This is a deliberate, recorded override.
- Single chromatic accent (Kenari gold). Categorical billing-kind hues exist
  only as data encoding, never as decoration.
- Gradients: none. Flat fills only, everywhere, in both windows.

## Macrostructure family

- App windows: **Stat-Led family** (hero stat + supporting data).
  - Dashboard (`index.html`): hero stat (Saldo) → stat-first card grid →
    per-model table → request log → dialog.
  - Compact widget (`compact.html`): radial ring = the stat; expanded card =
    supporting quota windows. Variation knob: `stat-form=radial-ring`.

## Theme

- `--color-paper`      oklch(15% 0.012 80)   — warm charcoal
- `--color-paper-2`    oklch(19.5% 0.014 80) — cards
- `--color-paper-3`    oklch(24% 0.015 80)   — raised / inputs / hover
- `--color-ink`        oklch(93% 0.008 80)
- `--color-ink-2`      oklch(78% 0.010 80)
- `--color-muted`      oklch(66% 0.010 80)
- `--color-rule`       oklch(31% 0.012 80)
- `--color-rule-2`     oklch(26% 0.011 80)
- `--color-accent`     oklch(80% 0.15 80)    — Kenari gold
- `--color-accent-strong` oklch(85% 0.16 80)
- `--color-accent-ink` oklch(22% 0.04 80)
- `--color-focus`      oklch(85% 0.17 80)
- `--color-ok`         oklch(80% 0.13 155)   — positive signal
- `--color-danger`     oklch(72% 0.15 25)
- `--color-danger-text` oklch(82% 0.11 25)

Axes: **dark / display-heavy / warm-amber**.

## Typography

- Display: Bricolage Grotesque, weight 800, style normal.
- Body:    Manrope, weight 400 (500 medium, 700 strong).
- Data:    JetBrains Mono, weight 500 — carries the outlier role:
  numerals only (hero stat, table figures, chart ticks, percentages).
  Semantic chips/pills/labels stay in the body face — mono never sets words.
- Headers are always roman. No italic display.
- Body floor: 14 px (app-density deviation from the 16 px marketing floor —
  desktop tool, data-dense tables; recorded override).
- Numbers are always `font-variant-numeric: tabular-nums`.

## Spacing

4-pt-derived compact app scale (dashboard density; the marketing 9-step scale
is not appropriate for a desktop tool). Values live in `src/tokens.css` as
`--space-3xs` … `--space-2xl`. Use named tokens only, never raw px.

## Motion

- Easings: `--ease-out` cubic-bezier(0.16, 1, 0.3, 1) · `--ease-in`
  cubic-bezier(0.7, 0, 0.84, 0) · `--ease-in-out` cubic-bezier(0.65, 0, 0.35, 1).
- Three primitives, total, across the app: **number tick** (Saldo count-up on
  refresh), **fill sweep** (bars/ring animate their fill), **press/lift
  feedback** (buttons). Nothing else moves.
- Bars and the ring animate `transform: scaleX()` / `stroke-dashoffset` —
  never `width`.
- Reduced-motion fallback: spatial motion collapses to ≤ 150 ms opacity;
  count-up skipped, final value rendered immediately.

## Microinteractions stance

- Silent success: toasts for failures and hidden-effect confirmations only.
- Interactive elements ship default · hover · focus-visible · active ·
  disabled; long operations signal via disabled control + outcome toast.
- Hover is a single-family change (colour); lift/press lives on `:active` only.
- Focus rings appear instantly (`:focus-visible`, 2 px, `--color-focus`).
- Hover affordances have keyboard equivalents; no hover-only interactions.

## CTA voice

- Primary: gold fill, pill, `--color-accent-ink` label, weight 700.
- Secondary ("ghost"): transparent, 1.5 px rule border, pill; hover turns the
  border gold.
- Controls share one base height (`--control-h`, 44 px) — inputs and buttons
  always match on the same row.
- Labels stay short Indonesian imperatives ("Muat ulang", "Simpan & validasi").

## Per-page allowances

- App windows must NOT use enrichment (Tier-A/B art). Data carries the page.
- The chart canvas is the only "imagery" — it is data, not decoration.

## What windows MUST share

- The wordmark (display 800 "Kenari Usage" + 11 px gold dot).
- The accent colour and its ≤ 5 % footprint.
- Display + body + data fonts.
- Pill shape language, radius scale, border weight (1.5 px).
- Motion primitives and easings.

## What windows MAY differ on

- Stat form (inline hero number vs radial ring).
- Density (dashboard table padding vs compact card padding).

## Exports

### tokens.css

The canonical export is the shipped file [`src/tokens.css`](src/tokens.css).
Tailwind `@theme`, DTCG `tokens.json`, and shadcn/ui exports are intentionally
omitted — the project ships no Tailwind, no DTCG tooling, and no shadcn/ui.
