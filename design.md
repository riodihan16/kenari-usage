# Design — Kenari Usage

A locked design system for this app. Every window reads this file before
emitting code. Do not regenerate per window — extend or amend this file when
the system needs to grow.

## Genre

modern-minimal, in the visual language of Apple's macOS/iOS apps (2026-10-25
full redesign, explicit user brief: "lebih modern, style menyesuaikan dengan
standar desain milik Apple"). Recorded decisions:

- **Grouped surfaces.** Page ground `--color-paper`; cards `--color-paper-2`
  with a 14 px radius and a 0.5 px hairline ring instead of a visible border.
  Apple's grouped-inset look, not outlined boxes.
- **Hairline, not stroke.** 1 px everywhere; the 1.5 px border language is
  retired.
- **Radii scale** 6 / 8 / 10 / 14 / 20 px, one per nesting level. Pills are
  reserved for genuinely round things (the floating widget, status dots);
  controls take 8 px.
- **Light and dark, both shipped,** re-derived per mode (never inverted), and
  following the OS through `prefers-color-scheme`. There is no in-app toggle;
  the app reads the system setting.
- **Gradients: none.** Flat fills, translucency only in the HUD/toast.
- **Accent footprint restrained** — Kenari gold marks the primary action, the
  five-hour quota ring and the wordmark dot. Nothing else.

## Macrostructure family

- App windows: **instrument-led** (one composite read of money and quota, then
  the supporting data).
  - Dashboard (`index.html`): toolbar → page title → the instrument (balance +
    three quota rings) → usage summary with chart → per-model table → request
    log → settings sheet.
  - Compact widget (`compact.html`): the weekly ring is the stat; the expanded
    card is the same instrument at widget scale.

## Theme

Tokens live in `src/tokens.css`; both modes are declared there.

Light:

- `--color-paper`      oklch(97.3% 0.002 265) — grouped ground
- `--color-paper-2`    oklch(100% 0 0)        — cards (declared `surface: absolute`)
- `--color-paper-3`    oklch(95.5% 0.003 265) — total row
- `--color-fill`       oklch(93.5% 0.004 265) — quiet control fill, bar track
- `--color-field`      oklch(100% 0 0)        — inputs
- `--color-ink`        oklch(24% 0.004 265)
- `--color-ink-2`      oklch(38% 0.005 265)
- `--color-muted`      oklch(45% 0.006 265)
- `--color-rule`       oklch(88.5% 0.005 265)
- `--color-field-edge` oklch(52% 0.006 265)   — field borders, 3:1 against paper
- `--color-accent`     oklch(78% 0.145 80)    — Kenari gold
- `--color-accent-ink` oklch(24% 0.05 80)
- `--color-focus`      oklch(55% 0.21 255)    — Apple's blue focus ring

Dark overrides the same names inside `@media (prefers-color-scheme: dark)`:
paper 17.5 %, paper-2 21.5 % (cards lighter than canvas), ink 96 %, rules
31 %, accent lifted to 80 % L, focus to 66 % L.

Axes: **light + dark / grotesk-sans / warm**.

## Typography

- One family: **Inter Variable** (`@fontsource-variable/inter`, self-hosted so
  the CSP stays `'self'`). Display and body are the same face at different
  weights — Apple's approach with SF Pro.
- Weights in use: 400 body, 500 medium, 600 strong/display. Three, no more.
- Scale: 12 / 13 / 14 / 15 / 17 / 20 / 24 / 28 px, plus a fluid
  `--text-display` 36–44 px for the balance.
- Display tracking −0.022 em, titles −0.012 em. Labels are sentence case,
  untracked, one step smaller — never uppercase, never letter-spaced.
- All figures use `font-variant-numeric: tabular-nums`. There is no monospace
  face in the app.
- Body floor: 13 px in the widget, 14 px in the dashboard (desktop tool
  density; recorded deviation from the 16 px marketing floor).

## Spacing

4 pt-derived app scale, `--space-3xs` (2 px) … `--space-5xl` (64 px), declared
in `src/tokens.css`. Use named tokens only, never raw px.

## Motion

- Easings: `--ease-out` cubic-bezier(0.32, 0.72, 0, 1) · `--ease-in`
  cubic-bezier(0.6, 0, 0.9, 0.4) · `--ease-in-out`.
- Three primitives, total: **number tick** (balance count-up), **fill sweep**
  (rings and bars animate `stroke-dashoffset` / `transform: scaleX`), **sheet
  and card** (the settings dialog and the widget's expand both scale from
  0.98–0.2). Nothing else moves.
- Never animate `width`, `height`, `top` or `left`; never `transition: all`.
- Reduced motion: spatial motion collapses to ≤ 150 ms; count-up is skipped and
  the final value renders at once.

## Microinteractions stance

- Silent success: toasts for failures only. The toast is a HUD pill in
  `--color-hud`.
- Interactive elements ship default · hover · focus-visible · active ·
  disabled; long operations signal via disabled control plus an outcome toast.
- Hover is a single family change (background step). No lift, no scale.
- Focus rings appear instantly: 2 px `--color-focus`, `outline-offset: 2px`
  (inset `-3px` on fields so the ring never touches a neighbour).
- Hover affordances always have keyboard equivalents.

## CTA voice

- Primary: gold fill, 8 px radius, `--color-accent-ink` label, weight 600.
  Exactly one per window ("Muat ulang" on the dashboard, "Buka" in the widget).
- Secondary: outlined hairline (`--color-rule`) with the ink label; quiet
  tertiary has no border until hover.
- All controls share `--control-h` (34 px) or `--control-h-sm` (32 px) so an
  input and the button beside it always match.
- Labels stay short Indonesian imperatives ("Muat ulang", "Simpan dan
  validasi").

## Per-page allowances

- App windows must NOT use enrichment (Tier-A/B art). Data carries the page.
- The chart canvas and the three quota rings are the only "imagery" — they are
  data, not decoration.

## What windows MUST share

- The wordmark: Inter 600 "Kenari Usage" with an 8 px gold dot.
- The accent colour and its ≤ 5 % footprint.
- Inter Variable, the three weights, tabular figures.
- The radius scale, the hairline rule, the grouped-surface ladder.
- Motion primitives and easings.

## What windows MAY differ on

- Stat form (balance + three rings on the dashboard, one ring in the widget).
- Density (dashboard table padding vs widget card padding).

## Exports

The canonical export is the shipped file [`src/tokens.css`](src/tokens.css).
Tailwind `@theme`, DTCG `tokens.json` and shadcn/ui exports are intentionally
omitted — the project ships no Tailwind, no DTCG tooling and no shadcn/ui.
