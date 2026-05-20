# CSS Architecture Restructure — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure bruna-is CSS into 11 page-family + shared files, kill the desktop-first `responsive.css`, rename generic class names to BEM scoped under page-family classes, and lock the contract into `docs/directives/css-architecture.md` plus a build-time assertion script.

**Architecture:** Page-family split (`home.css`, `services.css`, `sectors.css`, `articles.css`, `about.css`, `quoter.css`) + a shared `blocks.css` (atoms + composed cross-page blocks like `.cta-band`, `.article-card`, `.value-band`) + foundation files (`tokens.css`, `reset.css`, `layout.css`, `nav.css`). All loaded in `base.njk` as a single bundle in fixed order. Mobile-first; `@media (min-width: --bp-md|lg|xl)` adds desktop. BEM throughout with page-family root scope (`.home-page .hero__title`). Build-time regex assertions enforce token discipline and selector depth.

**Tech Stack:** Eleventy v3, plain CSS (no preprocessor), Node.js scripts for build-time assertions.

---

## File structure

**Created:**
- `docs/directives/css-architecture.md` — long-term contract
- `src/assets/css/blocks.css` — atoms + cross-page composed blocks
- `src/assets/css/home.css` — home page family
- `src/assets/css/services.css` — services page family
- `src/assets/css/sectors.css` — sectors page family
- `src/assets/css/articles.css` — articles page family
- `src/assets/css/about.css` — about page family
- `src/assets/css/quoter.css` — quoter page family
- `scripts/check-css.js` — build-time CSS assertion script
- `docs/superpowers/baselines/<date>/*.png` — visual baseline reference screenshots

**Modified:**
- `src/_includes/layouts/base.njk` — CSS load chain
- `src/_includes/partials/header.njk` and all page templates — page-family root class, BEM renames
- `scripts/check-build.js` — invoke `check-css.js` at the end
- `package.json` — chain `check-css.js` into the build script

**Deleted:**
- `src/assets/css/responsive.css` (after Stage 3)
- `src/assets/css/main.css` (after Stage 3)

**Final tree:**

```
src/assets/css/
├── tokens.css     foundation
├── reset.css      normalize + skip-link
├── layout.css     page chrome (already present)
├── nav.css        primary nav + mobile toggle (already present)
├── blocks.css     atoms (.btn, .pagination, .hl-underline) + cross-page composed blocks (.cta-band, .article-card, .value-band)
├── home.css       hero, statement, explainer, pillars, leading, sectors strip, customers, accreds
├── services.css   services-intro, service-feature, process
├── sectors.css    sectors-intro, sector-card
├── articles.css   articles, article-featured (composed block wiring)
├── about.css      story, philosophy, team
└── quoter.css     quoter-section, quoter, quoter-row, quoter-total, quoter-customer
```

**Final load order in `base.njk`:**

```
tokens → reset → layout → nav → blocks → home → services → sectors → articles → about → quoter
```

---

## Conventions used by every stage

**Commit messages:** Conventional Commits. Prefix with `css:` for CSS-only work, `docs:` for the directive, `chore:` for the assertion script. Reference the stage in the body (e.g. `Stage 3a — extract quoter`).

**Visual diff procedure** (where a stage says "verify visual diff"):
1. `npm run build` succeeds.
2. Open the production-equivalent URLs in Chrome via `mcp__claude-in-chrome__navigate`: `/`, `/about/`, `/thjonusta/`, `/geirar/`, `/greinar/`, `/verdreiknir/`.
3. For each, resize viewport to 320, 768, 1280, 1920 (via `mcp__claude-in-chrome__resize_window`); compare against the Stage 0 baseline screenshot in that viewport.
4. Pixel-identical required for stages 2, 4, 5, 6. For Stage 3 sub-stages, ≤ 1px shifts acceptable from BEM specificity change; anything larger blocks the commit.

**Selector depth budget:** Max 2 levels *after* the page-family scope class. Examples:
- ✅ `.home-page .hero__title { ... }` (1 inside scope)
- ✅ `.home-page .hero .hero__title { ... }` (2 inside scope — acceptable)
- ❌ `.home-page .hero .hero__media .hero__overlay` (3 inside scope — banned)

**Branch strategy:** Work on `main` directly (per project convention — see `.planning/memory`); each task = one commit. If reverting, revert the specific commit.

---

## Task 0: Capture visual baseline screenshots

**Files:**
- Create: `docs/superpowers/baselines/2026-05-19/*.png` (24 files: 6 pages × 4 viewports)

- [ ] **Step 1: Start dev server**

```bash
cd /Users/olafur/Development/custprojects/brunathettingar/bruna-is
npm start
```

Wait for "[Browsersync] Serving files from: _site" to confirm the server is up. Default URL: `http://localhost:8080/bruna-is/`.

- [ ] **Step 2: Capture screenshots via Chrome MCP**

Open Chrome via `mcp__claude-in-chrome__navigate` to each URL below at each viewport, then save a full-page screenshot.

URLs (IS-only — EN structurally identical):
- `http://localhost:8080/bruna-is/`
- `http://localhost:8080/bruna-is/about/`
- `http://localhost:8080/bruna-is/thjonusta/`
- `http://localhost:8080/bruna-is/geirar/`
- `http://localhost:8080/bruna-is/greinar/`
- `http://localhost:8080/bruna-is/verdreiknir/`

Viewports: 320×800, 768×1024, 1280×800, 1920×1080.

Filename convention: `docs/superpowers/baselines/2026-05-19/<slug>-<width>.png` where `<slug>` is `home|about|services|sectors|articles|quoter`.

If Chrome MCP cannot save screenshots directly to disk, use `mcp__claude-in-chrome__javascript_tool` to invoke `html2canvas` or instruct the user to take them manually. Document the procedure in this directory's `README.md`.

- [ ] **Step 3: Commit baseline**

```bash
git add docs/superpowers/baselines/2026-05-19/
git commit -m "$(cat <<'EOF'
chore: capture CSS architecture refactor baseline screenshots

Stage 0 of CSS architecture restructure. 6 pages × 4 viewports = 24 screenshots.
Reference for visual diff verification at each subsequent stage.
EOF
)"
```

---

## Task 1: Write the CSS architecture directive

**Files:**
- Create: `docs/directives/css-architecture.md`

- [ ] **Step 1: Create the directive file**

Write the following content to `docs/directives/css-architecture.md`:

````markdown
# CSS Architecture Directive — bruna-is

This document defines the authoritative styling rules for the bruna-is site. Treat it as the single source of truth for how CSS is structured, named, and shipped. Deviations require a clearly documented rationale in the file where the deviation lives.

---

## 1. File layout + load order

`src/assets/css/` contains exactly 11 files, loaded in this order from `base.njk`:

```
tokens.css → reset.css → layout.css → nav.css → blocks.css → home.css → services.css → sectors.css → articles.css → about.css → quoter.css
```

| File | Responsibility |
|---|---|
| `tokens.css` | Design tokens — colors, type, spacing, radii, shadows, motion durations, breakpoints. Single source for raw values. |
| `reset.css` | Browser normalize + skip-link. |
| `layout.css` | Page chrome — container, site-header skeleton, site-footer skeleton, page-hero shell, utility bar, breadcrumb chrome, brand wordmark. |
| `nav.css` | Primary nav + mobile toggle. |
| `blocks.css` | Cross-page reusable CSS. Two sections inside: **atoms** (`.btn`, `.pagination`, `.hl-underline`) and **composed blocks** (`.cta-band`, `.article-card`, `.value-band`). |
| `home.css` | Home page family — hero, statement, explainer, pillars, leading, sectors strip, customers, accreds. |
| `services.css` | Services page family — services-intro, service-feature, process. |
| `sectors.css` | Sectors page family — sectors-intro, sector-card. |
| `articles.css` | Articles page family — articles, article-featured. |
| `about.css` | About page family — story, philosophy, team. |
| `quoter.css` | Quoter page family — quoter-section, quoter, quoter-row, quoter-total, quoter-customer. |

Every page ships every file (single bundle, no conditional loading). No additional CSS files. No inline `style=""` attributes. No `<style>` blocks in templates.

## 2. The split rule

When adding a selector, ask three questions in order:

1. **Does it appear on exactly one page family?** It lives in that page family's file.
2. **Does it appear on two or more page families?** It moves to `blocks.css` under either Atoms (single-purpose, no inherent layout — `.btn`, `.pagination`) or Composed blocks (laid-out reusable section — `.cta-band`, `.article-card`).
3. **Is it page chrome (shared by every page — header, footer, container, page-hero shell)?** It lives in `layout.css`.

A selector that drifts from rule 1 to rule 2 because a second page family adopts it is *moved* to `blocks.css` in the same commit — never duplicated.

## 3. Naming conventions

**BEM throughout.** Block, element, modifier:

```css
.card                /* block */
.card__title         /* element */
.card--featured      /* variant modifier */
```

**State via `data-*` attributes; variants via BEM modifiers.**

```css
.btn--primary, .btn--ghost              /* variants — stable design */
.nav-toggle[data-open="true"]           /* state — runtime/interaction */
.quoter-row[data-error="true"]
```

Rule of thumb: if JavaScript toggles it, it's a `data-*` attribute. If the page hard-codes it, it's a BEM modifier.

**No generic-name descendants.** The following names must always be block-scoped elements, never standalone:

`.row`, `.col`, `.pic`, `.ico`, `.body`, `.lead`, `.tag`, `.bg`, `.scrim`, `.crumbs`, `.label`, `.copy`, `.head`, `.meta`

For example: `.pillar__pic` not `.pillar .pic`; `.hero__crumbs` not `.hero .crumbs`.

**Page-family root scope.** Each page family's templates set a single root class on `<body>` (via the `bodyClass` data field on the layout or page): `.home-page`, `.about-page`, `.services-page`, `.sectors-page`, `.articles-page`, `.quoter-page`. The page-family CSS file scopes every rule under that root:

```css
.home-page .hero { ... }
.home-page .hero__title { ... }
```

This is defense-in-depth: load order isolates files in source, the scope class isolates rules at runtime.

## 4. Selector budget

**Max 2 levels of nesting after the page-family scope class.**

```css
.home-page .hero__title { ... }                            /* ✅ 1 */
.home-page .hero .hero__title { ... }                      /* ✅ 2 */
.home-page .hero .hero__media .hero__overlay { ... }       /* ❌ 3 */
```

If you reach for level 3, the block is too coarse — split it or rename the inner element.

**No `!important` without an inline rationale comment.** When it's the only way (third-party override, deliberate specificity war), leave a one-line comment with the reason directly above the declaration.

**No inline styles, no `<style>` blocks in templates.** Every rule lives in `src/assets/css/`.

## 5. Token discipline

`tokens.css` is the single source for color, type, spacing, radii, shadow, motion duration/easing, and breakpoints. Tokens are semantic-only — they describe *what something is*, not *where it goes*. A `--space-card-padding: 16px` token is wrong; that's a layout decision, lives in `.card`.

Outside `tokens.css`, no raw hex codes, no `rgba()` calls, no `px` magic numbers, no font-family literals. One carve-out: 1px borders (`border: 1px solid var(--line)`) are allowed inline since tokenizing them adds noise without payoff.

Build-time enforcement: `scripts/check-css.js` regex-checks every CSS file except `tokens.css` for raw hex, raw rgba, and raw px values. Build fails on violation.

## 6. Responsive — mobile-first

Each block's base styles target mobile (320px). Desktop is a `@media (min-width: …)` add-on — never the inverse.

```css
/* base = mobile */
.pillar-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-4);
}

/* desktop add-on */
@media (min-width: 64em) {
  .pillar-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-7);
  }
}
```

Breakpoints are tokens in `tokens.css`:

```css
--bp-md: 48em;   /* tablets — 768px */
--bp-lg: 64em;   /* desktop — 1024px */
--bp-xl: 80em;   /* wide — 1280px */
```

(Media queries cannot reference CSS custom properties for the breakpoint value — but the tokens document the canonical values and any new breakpoint added must update this list.)

Use container queries (`@container`) only for component-intrinsic reflow (a card that adapts to its column width regardless of viewport). For everything else use media queries.

## 7. Motion + accessibility

All transitions and animations honor `prefers-reduced-motion`. Tokenize durations in `tokens.css`:

```css
--transition-fast: 150ms ease;
--transition-base: 250ms ease;

@media (prefers-reduced-motion: reduce) {
  :root {
    --transition-fast: 0ms;
    --transition-base: 0ms;
  }
}
```

Consumers reference the token; the reduced-motion preference is respected automatically.

Infinite animations (spinners, skeleton pulse) need an explicit `@media (prefers-reduced-motion: reduce) { animation: none; }` in their block, plus a static visual fallback.

Use `:focus-visible` for keyboard-only focus rings. Browser default unless the design specifies a custom ring.

## 8. i18n — logical properties

Prefer logical properties everywhere:

```css
margin-inline: auto;          /* not margin-left + margin-right */
padding-block: var(--space-4); /* not padding-top + padding-bottom */
inset-inline-start: 0;        /* not left: 0 */
border-block-end: 1px solid; /* not border-bottom */
```

Use physical properties (`margin-left`, `top`) only when the design is intentionally side-anchored (e.g., a scrim that *must* be on the left regardless of writing direction).

Bruna is LTR-only today (IS + EN). This is hygiene rather than a functional requirement; cost is near-zero and the payoff is RTL-readiness if Arabic/Hebrew is ever added.

## 9. Comments + rationale

Non-trivial CSS blocks (overrides, hacks, browser-quirk workarounds, deliberately-broken specificity, `!important`) get a short comment explaining *why*. Trivial rules need no comment.

```css
/* Force above the Eleventy-img <picture> stacking context — Safari 17 paints
   pseudo-elements behind absolute children otherwise. */
.hero::after {
  z-index: 2;
}
```

Don't describe *what* the code does (the code does that); describe *why* the choice was made.

## Enforcement appendix

`scripts/check-css.js` (run by `npm run build`) machine-checks the following:

- **Token discipline:** zero raw hex (`#[0-9a-f]{3,8}`), zero `rgba()`, zero `\d+px` (except `1px solid` borders) outside `tokens.css`.
- **Selector depth:** every selector has at most 2 descendant combinators (excluding the page-family scope class).
- **`!important` without comment:** every `!important` must have a non-empty comment on the same line or the line immediately above.
- **Inline styles:** zero `style="…"` attributes in `_site/**/*.html`.
- **File count:** `src/assets/css/` contains exactly 11 `.css` files matching the canonical names.

Conventions enforced by review (no automated check):

- BEM naming.
- Page-family root scope.
- Mobile-first.
- Logical properties.
- Motion + reduced-motion safety.
- Comment rationale on non-trivial blocks.
````

- [ ] **Step 2: Commit the directive**

```bash
git add docs/directives/css-architecture.md
git commit -m "$(cat <<'EOF'
docs: add CSS architecture directive

Establishes the contract for bruna-is CSS: 11-file split, page-family scope,
BEM naming, mobile-first, token discipline, build-time assertions.

Stage 1 of CSS architecture restructure. Subsequent stages execute against
this directive.
EOF
)"
```

---

## Task 2: Extract `blocks.css` (atoms + cross-page composed blocks)

**Files:**
- Create: `src/assets/css/blocks.css`
- Modify: `src/assets/css/main.css` (remove extracted blocks)
- Modify: `src/_includes/layouts/base.njk` (insert blocks.css link)

- [ ] **Step 1: Create `blocks.css` with the file header**

Write to `src/assets/css/blocks.css`:

```css
/* ============================================================
   blocks.css — cross-page reusable CSS
   Atoms: single-purpose, no inherent layout
   Composed blocks: laid-out reusable sections used on >1 page family
   See docs/directives/css-architecture.md §1 and §2.
   ============================================================ */

/* === Atoms ================================================== */

/* (rules moved here in steps below) */

/* === Composed blocks ======================================== */

/* (rules moved here in steps below) */
```

- [ ] **Step 2: Move atoms from `main.css` to `blocks.css`**

Cut the following rule blocks from `src/assets/css/main.css` and paste them under the `/* === Atoms === */` header in `blocks.css`:

- `.hl-underline` (currently `main.css:7–14`)
- `.btn`, `.btn.primary`, `.btn.primary:hover`, `.btn.ghost`, `.btn.ghost:hover`, `.btn span.arrow` (currently `main.css:544–561`)
- `.pagination`, `.pagination a`, `.pagination a:hover`, `.pagination a.active` (currently `main.css:1351–1369`)

After the move, the `Atoms` section of `blocks.css` should contain those three blocks in that order. Do not rename selectors yet — that happens in Stage 3 (per page family) and a final pass against the directive after Stage 3f.

- [ ] **Step 3: Move composed cross-page blocks from `main.css` to `blocks.css`**

Cut the following rule blocks from `src/assets/css/main.css` and paste them under the `/* === Composed blocks === */` header in `blocks.css`:

- `.cta-band`, `.cta-band .row`, `.cta-band h2`, `.cta-band h2 .ul`, `.cta-band p`, `.cta-band .actions` (currently `main.css:518–543`)
- `.article-card`, `.article-card:hover`, `.article-card .pic`, `.article-card .pic > img`, `.article-card .pic .tag`, `.article-card .body`, `.article-card h3`, `.article-card p`, `.article-card .meta` (currently `main.css:830–876`)
- `.value-band`, `.value-band .row`, `.value-band .label`, `.value-band h2`, `.value-band h2 .ul`, `.value-band p`, `.value-band p strong` (currently `main.css:1085–1114`)

- [ ] **Step 4: Update `base.njk` load order**

Modify `src/_includes/layouts/base.njk` lines 35–40. Insert `blocks.css` between `nav.css` and `main.css`. New section:

```html
    <link rel="stylesheet" href="/assets/css/tokens.css">
    <link rel="stylesheet" href="/assets/css/reset.css">
    <link rel="stylesheet" href="/assets/css/layout.css">
    <link rel="stylesheet" href="/assets/css/nav.css">
    <link rel="stylesheet" href="/assets/css/blocks.css">
    <link rel="stylesheet" href="/assets/css/main.css">
    <link rel="stylesheet" href="/assets/css/responsive.css">
```

- [ ] **Step 5: Verify build and visual diff**

```bash
npm run build
```

Expected: exits clean, prints `[check-build] OK` lines.

Then run the visual diff procedure (see "Conventions" section above) across all six pages at four viewports. Required: pixel-identical to baseline.

- [ ] **Step 6: Commit**

```bash
git add src/assets/css/blocks.css src/assets/css/main.css src/_includes/layouts/base.njk
git commit -m "$(cat <<'EOF'
css: extract atoms and cross-page composed blocks to blocks.css

Stage 2 of CSS architecture restructure.

- Atoms moved: .hl-underline, .btn (+ variants), .pagination
- Composed blocks moved: .cta-band, .article-card, .value-band
- base.njk load order: tokens → reset → layout → nav → blocks → main → responsive

main.css drops from 1369 to ~1280 lines (atom and composed-block extraction
only — per-page-family extraction follows in Stages 3a–3f).
EOF
)"
```

---

## Task 3a: Extract quoter page family

**Files:**
- Create: `src/assets/css/quoter.css`
- Modify: `src/assets/css/main.css` (remove quoter rules)
- Modify: `src/assets/css/responsive.css` (remove quoter media-query overrides)
- Modify: `src/_includes/layouts/base.njk` (insert quoter.css link)
- Modify: `src/content/is/verdreiknir/index.njk` and `src/content/en/verdreiknir/index.njk` (add `bodyClass: quoter-page`)

- [ ] **Step 1: Create `quoter.css` with mobile-first base + page-family scope**

Write to `src/assets/css/quoter.css`:

```css
/* ============================================================
   quoter.css — Verðreiknir / Quote calculator page family
   Scope: .quoter-page
   See docs/directives/css-architecture.md §1 and §3.
   ============================================================ */

/* (rules moved here in steps below — mobile-first, scoped under .quoter-page) */
```

- [ ] **Step 2: Move quoter rules out of `main.css` into `quoter.css`**

Cut all rules from `main.css` matching these selectors (currently `main.css:1116–1349`):

- `.quoter-section`, `.quoter-intro`, `.quoter-intro .label`, `.quoter-intro h2`, `.quoter-intro p`, `.quoter-intro .notice`
- `.quoter`, `.quoter-header`, `.quoter-header span:last-child`, `.quoter-header span.r`
- `.quoter-rows`, `.quoter-row`, `.quoter-row:last-child`, `.quoter-row select`, `.quoter-row input[type="number"]`, focus variants, `.quoter-row .subtotal`, `.quoter-row .subtotal .none`, `.quoter-row .remove`, `.quoter-row .remove:hover`
- `.quoter-actions`, `.quoter-actions .add-row`, `.quoter-actions .add-row:hover`
- `.quoter-total`, `.quoter-total .label-block`, `.quoter-total .total-amount`, `.quoter-total .small`
- `.quoter-customer` and all its descendants
- `.quoter-confirm`, `.quoter-confirm.show`

Paste each block into `quoter.css`, prefixed with `.quoter-page ` (the page-family scope), and convert to mobile-first.

**Mobile-first conversion procedure for each rule:** Take the current desktop rule. Find its matching `@media (max-width: 63.999em)` override in `responsive.css:70–84`. The mobile values become the base; the desktop values become a `@media (min-width: 64em)` override. Example:

```css
/* OLD — main.css */
.quoter-row {
  display: grid;
  grid-template-columns: 1.7fr 1.3fr 1fr 0.7fr 0.7fr 1.2fr 0.6fr 1.1fr 36px;
  gap: 12px;
  padding: 18px 24px;
  border-bottom: 1px solid var(--line);
  align-items: center;
}

/* OLD — responsive.css (mobile override) */
.quoter-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-2);
  padding: var(--space-4);
  border: 1px solid var(--line);
  margin-bottom: var(--space-3);
}

/* NEW — quoter.css (mobile-first) */
.quoter-page .quoter-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-2);
  padding: var(--space-4);
  border: 1px solid var(--line);
  margin-bottom: var(--space-3);
  align-items: center;
}

@media (min-width: 64em) {
  .quoter-page .quoter-row {
    grid-template-columns: 1.7fr 1.3fr 1fr 0.7fr 0.7fr 1.2fr 0.6fr 1.1fr 36px;
    gap: 12px;
    padding: 18px 24px;
    border: none;
    border-bottom: 1px solid var(--line);
    margin-bottom: 0;
  }
}
```

Repeat for every quoter rule. The corresponding `responsive.css` overrides (lines 70–84) are *deleted* in step 3.

- [ ] **Step 3: Remove quoter overrides from `responsive.css`**

Delete lines 70–84 of `responsive.css` (the `/* Quote calculator stacks vertically */` block and its rules). Also remove `.quoter-section`, `.quoter-intro` from the section-padding rule on line 25 and the heading-shrink rule on line 64.

- [ ] **Step 4: Rename generic class names to BEM**

Inside `quoter.css`, rename generic descendants to BEM elements scoped to their block. Apply the same renames to the templates (`src/content/is/verdreiknir/index.njk` and `src/content/en/verdreiknir/index.njk`).

Rename table:

| Old | New | Block |
|---|---|---|
| `.quoter-intro .label` | `.quoter-intro__label` | quoter-intro |
| `.quoter-intro .notice` | `.quoter-intro__notice` | quoter-intro |
| `.quoter-header span.r` | `.quoter-header__col--right` | quoter-header |
| `.quoter-row .subtotal` | `.quoter-row__subtotal` | quoter-row |
| `.quoter-row .subtotal .none` | `.quoter-row__subtotal-empty` | quoter-row |
| `.quoter-row .remove` | `.quoter-row__remove` | quoter-row |
| `.quoter-actions .add-row` | `.quoter-actions__add` | quoter-actions |
| `.quoter-total .label-block` | `.quoter-total__label` | quoter-total |
| `.quoter-total .total-amount` | `.quoter-total__amount` | quoter-total |
| `.quoter-total .small` | `.quoter-total__hint` | quoter-total |
| `.quoter-customer .grid` | `.quoter-customer__grid` | quoter-customer |
| `.quoter-customer .submit-row` | `.quoter-customer__submit-row` | quoter-customer |
| `.quoter-customer .submit-row .note` | `.quoter-customer__note` | quoter-customer |
| `.quoter-customer .submit-btn` | `.quoter-customer__submit` | quoter-customer |
| `.quoter-customer .submit-btn .arrow` | `.quoter-customer__submit-arrow` | quoter-customer |
| `.quoter-confirm.show` | `.quoter-confirm[data-visible="true"]` | quoter-confirm |

For `.quoter-confirm[data-visible="true"]` specifically: update the quoter JS module (in `src/assets/js/`) to toggle `data-visible="true"` on the element instead of toggling the `.show` class. Match the directive's "state via data-*" rule.

- [ ] **Step 5: Add `bodyClass: quoter-page` to the verdreiknir templates**

In `src/content/is/verdreiknir/index.njk` and `src/content/en/verdreiknir/index.njk`, add `bodyClass: quoter-page` to the frontmatter (or wherever bodyClass is already set — check existing pattern). If the project uses `<body class="{{ bodyClass }}">` in `base.njk`, this is already wired. If not, modify `base.njk` line 55 to `<body class="{{ bodyClass | default('') }}">`.

- [ ] **Step 6: Update `base.njk` load order**

Modify `src/_includes/layouts/base.njk`. Insert `quoter.css` after `main.css` (responsive.css still ships for now):

```html
    <link rel="stylesheet" href="/assets/css/main.css">
    <link rel="stylesheet" href="/assets/css/quoter.css">
    <link rel="stylesheet" href="/assets/css/responsive.css">
```

- [ ] **Step 7: Verify build and visual diff**

```bash
npm run build
```

Expected: exits clean.

Visual diff on `/verdreiknir/` at all four viewports. Required: ≤ 1px shift from baseline (BEM specificity may cause minor shifts).

Then walk through the quoter UI manually: add a row, remove a row, fill the customer form, hit submit. The data-attribute swap on `.quoter-confirm` is the riskiest change — confirm the confirmation banner appears and disappears as expected.

- [ ] **Step 8: Commit**

```bash
git add src/assets/css/quoter.css src/assets/css/main.css src/assets/css/responsive.css src/_includes/layouts/base.njk src/content/is/verdreiknir/index.njk src/content/en/verdreiknir/index.njk src/assets/js/
git commit -m "$(cat <<'EOF'
css: extract quoter page family to quoter.css

Stage 3a of CSS architecture restructure.

- New file: src/assets/css/quoter.css, mobile-first, scoped under .quoter-page
- BEM rename: generic descendants (.label, .notice, .remove, .submit-btn, etc.)
  promoted to block-scoped elements (.quoter-intro__label, etc.)
- State swap: .quoter-confirm.show → .quoter-confirm[data-visible="true"]
  (JS module updated to match)
- responsive.css: quoter overrides removed (absorbed into quoter.css media query)
- main.css: ~230 lines removed
EOF
)"
```

---

## Task 3b: Extract about page family

**Files:**
- Create: `src/assets/css/about.css`
- Modify: `src/assets/css/main.css` (remove about rules)
- Modify: `src/assets/css/responsive.css` (remove about overrides)
- Modify: `src/_includes/layouts/base.njk` (insert about.css link)
- Modify: `src/content/is/about/index.njk` and `src/content/en/about/index.njk` (add `bodyClass: about-page`)

- [ ] **Step 1: Create `about.css` with file header**

Write to `src/assets/css/about.css`:

```css
/* ============================================================
   about.css — About page family
   Scope: .about-page
   Sections: story, philosophy, team
   ============================================================ */
```

- [ ] **Step 2: Move about rules out of `main.css` and convert to mobile-first**

Cut from `main.css` (currently `main.css:563–769`):

- `.story` and all descendants (`.row`, `.copy .label`, `h2`, `h2 .ul`, `p`, `.signature`, `.signature small`, `.timeline`, `.timeline h4`, `.timeline-row`, `.timeline-row:first-of-type`, `.timeline-row .yr`, `.timeline-row .ev`)
- `.philosophy` and all descendants (`.head`, `.head .label`, `.head h2`, `.head p`)
- `.principles`, `.principle`, `.principle:nth-child(3n)`, `.principle:nth-last-child(-n+3)`, `.principle .num`, `.principle h3`, `.principle p`
- `.team` and all descendants (`.head`, `.head .label`, `.head h2`)
- `.team-grid`, `.team-card`, `.team-card:hover`, `.team-card .avatar`, `.team-card .avatar::before`, `.team-card .avatar.orange`, `.team-card .body`, `.team-card h4`, `.team-card .role`, `.team-card .meta`

Paste into `about.css` scoped under `.about-page`. Use the mobile-first conversion procedure from Task 3a Step 2 against `responsive.css` lines 25, 30–43 (multi-column grids), 56–59 (`.team-grid` 1fr 1fr override), 62–68 (heading shrink for `.story h2`, `.philosophy .head h2`, `.team h2`).

- [ ] **Step 3: Remove about overrides from `responsive.css`**

Delete the about-related selectors from `responsive.css`:
- Remove `.story` from line 25 padding-shrink rule
- Remove `.philosophy`, `.team` from line 25
- Remove `.story .row` from lines 30–43
- Remove `.principles` from lines 30–43
- Remove `.team-grid` from lines 49–59
- Remove `.story h2`, `.philosophy .head h2`, `.team h2` from lines 62–68 heading-shrink
- Remove the `.timeline` rule on lines 113–116

- [ ] **Step 4: Rename generic descendants to BEM**

Rename table (apply to both `about.css` and the about templates):

| Old | New | Block |
|---|---|---|
| `.story .row` | `.story__row` | story |
| `.story .copy` | `.story__copy` | story |
| `.story .copy .label` | `.story__label` | story |
| `.story .signature` | `.story__signature` | story |
| `.story .signature small` | `.story__signature-meta` | story |
| `.story .timeline` | `.story__timeline` | story |
| `.story .timeline h4` | `.story__timeline-title` | story |
| `.story .timeline-row` | `.story__timeline-row` | story |
| `.story .timeline-row .yr` | `.story__timeline-year` | story |
| `.story .timeline-row .ev` | `.story__timeline-event` | story |
| `.philosophy .head` | `.philosophy__head` | philosophy |
| `.philosophy .head .label` | `.philosophy__label` | philosophy |
| `.philosophy .head h2` | `.philosophy__title` | philosophy |
| `.philosophy .head p` | `.philosophy__lead` | philosophy |
| `.principle .num` | `.principle__num` | principle |
| `.team .head` | `.team__head` | team |
| `.team .head .label` | `.team__label` | team |
| `.team .head h2` | `.team__title` | team |
| `.team-card .avatar` | `.team-card__avatar` | team-card |
| `.team-card .avatar.orange` | `.team-card__avatar--orange` | team-card |
| `.team-card .body` | `.team-card__body` | team-card |
| `.team-card .role` | `.team-card__role` | team-card |
| `.team-card .meta` | `.team-card__meta` | team-card |

Update `src/content/is/about/index.njk`, `src/content/en/about/index.njk`, and any partial templates the about page includes to match the new class names atomically with the CSS rename.

- [ ] **Step 5: Add `bodyClass: about-page` to about templates**

Update frontmatter on both about templates.

- [ ] **Step 6: Update `base.njk` load order**

Insert `about.css` after `quoter.css`:

```html
    <link rel="stylesheet" href="/assets/css/main.css">
    <link rel="stylesheet" href="/assets/css/quoter.css">
    <link rel="stylesheet" href="/assets/css/about.css">
    <link rel="stylesheet" href="/assets/css/responsive.css">
```

- [ ] **Step 7: Verify build and visual diff**

```bash
npm run build
```

Visual diff on `/about/` at all four viewports. Required: ≤ 1px shift.

- [ ] **Step 8: Commit**

```bash
git add src/assets/css/about.css src/assets/css/main.css src/assets/css/responsive.css src/_includes/layouts/base.njk src/content/is/about/ src/content/en/about/
git commit -m "$(cat <<'EOF'
css: extract about page family to about.css

Stage 3b of CSS architecture restructure.

- New file: src/assets/css/about.css, mobile-first, scoped under .about-page
- BEM rename: story / philosophy / team generic descendants promoted
- responsive.css: about-related overrides removed
- main.css: ~210 lines removed
EOF
)"
```

---

## Task 3c: Extract sectors page family

**Files:**
- Create: `src/assets/css/sectors.css`
- Modify: `src/assets/css/main.css`, `src/assets/css/responsive.css`, `src/_includes/layouts/base.njk`
- Modify: `src/content/is/geirar/index.njk`, `src/content/en/geirar/index.njk` and any sector detail templates (add `bodyClass: sectors-page`)

- [ ] **Step 1: Create `sectors.css` with file header**

Write to `src/assets/css/sectors.css`:

```css
/* ============================================================
   sectors.css — Geirar / sectors page family
   Scope: .sectors-page
   Sections: sectors-intro, sector-card
   ============================================================ */
```

Note: `.sectors` (the dark sectors strip on the home page) and the home `.sector` block stay in `home.css`, NOT here. This file is the `/geirar/` listing + detail page family.

- [ ] **Step 2: Move sectors-page rules out of `main.css` and convert to mobile-first**

Cut from `main.css` (currently `main.css:881–967`):

- `.sectors-page`
- `.sectors-intro`, `.sectors-intro .label`, `.sectors-intro h2`, `.sectors-intro p`, `.sectors-intro p strong`
- `.sector-grid`, `.sector-card`, `.sector-card:hover`, `.sector-card .pic`, `.sector-card .pic > img`, `.sector-card .pic .badge`, `.sector-card .body`, `.sector-card h3`, `.sector-card p`, `.sector-card ul.svc-tags`, `.sector-card ul.svc-tags li`

Apply mobile-first conversion against `responsive.css:25` (padding), `:30–43` (`.sectors-intro` grid), `:49–59` (`.sector-grid`), `:62–68` (`.sectors-intro h2` heading shrink), `:119–129` (mobile `.sector-grid` 1fr).

- [ ] **Step 3: Remove sectors-page overrides from `responsive.css`**

Delete:
- `.sectors-page` from line 25
- `.sectors-intro` from line 35
- `.sector-grid` from lines 49–59 and lines 119–129
- `.sectors-intro h2` from lines 62–68

- [ ] **Step 4: Rename generic descendants to BEM**

| Old | New | Block |
|---|---|---|
| `.sectors-intro .label` | `.sectors-intro__label` | sectors-intro |
| `.sectors-intro p strong` | (keep — semantic emphasis, not generic class) | — |
| `.sector-card .pic` | `.sector-card__media` | sector-card |
| `.sector-card .pic > img` | `.sector-card__media-img` | sector-card |
| `.sector-card .pic .badge` | `.sector-card__badge` | sector-card |
| `.sector-card .body` | `.sector-card__body` | sector-card |
| `.sector-card ul.svc-tags` | `.sector-card__tags` | sector-card |
| `.sector-card ul.svc-tags li` | `.sector-card__tag` | sector-card |

Apply to `src/content/is/geirar/`, `src/content/en/geirar/`, and any sector card partial.

- [ ] **Step 5: Add `bodyClass: sectors-page`**

Update frontmatter on both `geirar/index.njk` templates and the directory data file (`geirar.json` / `geirar.11tydata.js`) so detail pages also receive the class.

- [ ] **Step 6: Update `base.njk` load order**

Insert `sectors.css` after `about.css`.

- [ ] **Step 7: Verify build and visual diff**

```bash
npm run build
```

Visual diff on `/geirar/` and at least one sector detail page (e.g. `/geirar/<slug>/` from the directory listing) at all four viewports. Required: ≤ 1px shift.

- [ ] **Step 8: Commit**

```bash
git add src/assets/css/sectors.css src/assets/css/main.css src/assets/css/responsive.css src/_includes/layouts/base.njk src/content/is/geirar/ src/content/en/geirar/
git commit -m "$(cat <<'EOF'
css: extract sectors page family to sectors.css

Stage 3c of CSS architecture restructure.

- New file: src/assets/css/sectors.css, mobile-first, scoped under .sectors-page
- BEM rename: sector-card generic descendants promoted (.sector-card__media, etc.)
- responsive.css: sectors-page overrides removed
- main.css: ~90 lines removed
EOF
)"
```

---

## Task 3d: Extract articles page family

**Files:**
- Create: `src/assets/css/articles.css`
- Modify: `src/assets/css/main.css`, `src/assets/css/responsive.css`, `src/_includes/layouts/base.njk`
- Modify: `src/content/is/greinar/index.njk`, `src/content/en/greinar/index.njk` and article detail templates (add `bodyClass: articles-page`)

- [ ] **Step 1: Create `articles.css` with file header**

```css
/* ============================================================
   articles.css — Greinar / articles page family
   Scope: .articles-page
   Sections: articles, article-featured
   Note: .article-card lives in blocks.css (cross-page reusable).
   ============================================================ */
```

- [ ] **Step 2: Move article-page-specific rules out of `main.css`**

Cut from `main.css` (currently `main.css:774–828`):

- `.articles`
- `.article-featured`, `.article-featured .pic`, `.article-featured .pic > img`, `.article-featured .body`, `.article-featured .tag`, `.article-featured .tag::before`, `.article-featured h2`, `.article-featured p`, `.article-featured .meta`, `.article-featured .meta strong`
- `.article-grid`

`.article-card` is already in `blocks.css` (moved in Task 2 Step 3). Verify it does not appear in `main.css` anymore.

Mobile-first conversion against `responsive.css:25` (`.articles` padding), `:49–59` (`.article-grid` 1fr 1fr), `:62–68` (`.articles h2` heading shrink), `:94–100` (`.article-featured` stacks), `:119–129` (mobile `.article-grid` 1fr).

- [ ] **Step 3: Remove articles overrides from `responsive.css`**

Delete article-related entries from lines 25, 49–59, 62–68, 94–100, 119–129.

- [ ] **Step 4: Rename generic descendants to BEM**

| Old | New | Block |
|---|---|---|
| `.article-featured .pic` | `.article-featured__media` | article-featured |
| `.article-featured .pic > img` | `.article-featured__media-img` | article-featured |
| `.article-featured .body` | `.article-featured__body` | article-featured |
| `.article-featured .tag` | `.article-featured__tag` | article-featured |
| `.article-featured .tag::before` | `.article-featured__tag::before` | article-featured |
| `.article-featured .meta` | `.article-featured__meta` | article-featured |
| `.article-featured .meta strong` | (keep — semantic emphasis) | — |

The `.article-featured__tag::before` rule currently contains the literal text `"Útgefin grein"`. Replace with `var(--label-published, "")` and define the label via the i18n filter in the template, OR move the published-label text to a `data-published-label` attribute on the element. The directive (§9) requires a comment explaining the choice; document inline.

- [ ] **Step 5: Add `bodyClass: articles-page`**

Update frontmatter on `greinar/index.njk` and the directory data file so detail pages inherit the class.

- [ ] **Step 6: Update `base.njk` load order**

Insert `articles.css` after `sectors.css`.

- [ ] **Step 7: Verify build and visual diff**

```bash
npm run build
```

Visual diff on `/greinar/` and at least one article detail page at all four viewports. Required: ≤ 1px shift.

- [ ] **Step 8: Commit**

```bash
git add src/assets/css/articles.css src/assets/css/main.css src/assets/css/responsive.css src/_includes/layouts/base.njk src/content/is/greinar/ src/content/en/greinar/
git commit -m "$(cat <<'EOF'
css: extract articles page family to articles.css

Stage 3d of CSS architecture restructure.

- New file: src/assets/css/articles.css, mobile-first, scoped under .articles-page
- BEM rename: article-featured generic descendants promoted
- Hardcoded "Útgefin grein" label in CSS pseudo-element replaced with
  CSS-variable-driven approach (i18n-friendly)
- responsive.css: articles-related overrides removed
- main.css: ~55 lines removed
EOF
)"
```

---

## Task 3e: Extract services page family

**Files:**
- Create: `src/assets/css/services.css`
- Modify: `src/assets/css/main.css`, `src/assets/css/responsive.css`, `src/_includes/layouts/base.njk`
- Modify: `src/content/is/thjonusta/index.njk`, `src/content/en/thjonusta/index.njk` and service detail templates (add `bodyClass: services-page`)

- [ ] **Step 1: Create `services.css` with file header**

```css
/* ============================================================
   services.css — Þjónusta / services page family
   Scope: .services-page
   Sections: services-intro, service-feature, process
   Note: .value-band lives in blocks.css (cross-page reusable).
   ============================================================ */
```

- [ ] **Step 2: Move services-page rules out of `main.css`**

Cut from `main.css`:

- `.services-page` (lines 972–975)
- `.services-intro`, `.services-intro .label`, `.services-intro h2`, `.services-intro p`, `.services-intro p strong` (lines 976–996)
- `.service-feature` and all descendants (lines 998–1082): `.flip`, `:last-child`, `.pic`, `.copy`, `.pic > img`, `.pic.contain`, `.pic.contain > img`, `.num-badge`, `h2`, `p.lead`, `p.lead strong`, `ul.bullets`, `ul.bullets li`, `ul.bullets li::before`, `.insight`, `.insight strong`
- `.process` and all descendants (currently `main.css:247–295`): `.head`, `.head .label`, `.head h2`, `.process-grid`, `.process-step`, `.process-step:last-child`, `.process-step .num`, `.process-step .num::after`, `.process-step h4`, `.process-step p`

Apply mobile-first conversion against `responsive.css:25` (padding), `:30–43` (intro grid), `:49–59` (process-grid 1fr 1fr), `:62–68` (heading shrink), `:86–92` (service-feature stacks), `:119–129` (process-grid 1fr).

- [ ] **Step 3: Remove services overrides from `responsive.css`**

Delete services-related entries from lines 25, 30–43, 49–59, 62–68, 86–92, 119–129.

- [ ] **Step 4: Rename generic descendants to BEM**

| Old | New | Block |
|---|---|---|
| `.services-intro .label` | `.services-intro__label` | services-intro |
| `.service-feature.flip` | `.service-feature--flipped` | service-feature |
| `.service-feature .pic` | `.service-feature__media` | service-feature |
| `.service-feature .pic.contain` | `.service-feature__media--contain` | service-feature |
| `.service-feature .pic > img` | `.service-feature__media-img` | service-feature |
| `.service-feature .copy` | `.service-feature__copy` | service-feature |
| `.service-feature .num-badge` | `.service-feature__num` | service-feature |
| `.service-feature p.lead` | `.service-feature__lead` | service-feature |
| `.service-feature ul.bullets` | `.service-feature__bullets` | service-feature |
| `.service-feature ul.bullets li` | `.service-feature__bullet` | service-feature |
| `.service-feature .insight` | `.service-feature__insight` | service-feature |
| `.process .head` | `.process__head` | process |
| `.process .head .label` | `.process__label` | process |
| `.process .head h2` | `.process__title` | process |
| `.process-step .num` | `.process-step__num` | process-step |
| `.process-step .num::after` | `.process-step__num::after` | process-step |

Apply to `src/content/is/thjonusta/`, `src/content/en/thjonusta/`, and any service feature partials.

- [ ] **Step 5: Add `bodyClass: services-page`**

Update frontmatter on `thjonusta/index.njk` and the directory data file.

- [ ] **Step 6: Update `base.njk` load order**

Insert `services.css` after `articles.css`.

- [ ] **Step 7: Verify build and visual diff**

```bash
npm run build
```

Visual diff on `/thjonusta/` and at least one service detail page at all four viewports. Required: ≤ 1px shift.

- [ ] **Step 8: Commit**

```bash
git add src/assets/css/services.css src/assets/css/main.css src/assets/css/responsive.css src/_includes/layouts/base.njk src/content/is/thjonusta/ src/content/en/thjonusta/
git commit -m "$(cat <<'EOF'
css: extract services page family to services.css

Stage 3e of CSS architecture restructure.

- New file: src/assets/css/services.css, mobile-first, scoped under .services-page
- BEM rename: service-feature + process generic descendants promoted
- .service-feature.flip → .service-feature--flipped (BEM variant modifier)
- responsive.css: services-related overrides removed
- main.css: ~160 lines removed
EOF
)"
```

---

## Task 3f: Extract home page family

**Files:**
- Create: `src/assets/css/home.css`
- Modify: `src/assets/css/main.css` (should be empty or nearly so after this), `src/assets/css/responsive.css`, `src/_includes/layouts/base.njk`
- Modify: `src/content/is/index.njk`, `src/content/en/index.njk` (add `bodyClass: home-page`)

- [ ] **Step 1: Create `home.css` with file header**

```css
/* ============================================================
   home.css — Home page family
   Scope: .home-page
   Sections: hero, statement, explainer, pillars, leading,
             sectors strip, customers, accreds
   ============================================================ */
```

- [ ] **Step 2: Move home rules out of `main.css`**

Cut from `main.css` everything that remains. After Tasks 2, 3a–3e, `main.css` should contain only the home page sections:

- `.hero` and all descendants (currently `main.css:16–70`)
- `.statement` and all descendants (lines 72–103)
- `.explainer` and all descendants (lines 105–143)
- `.pillars`, `.pillar-grid`, `.pillar` and all descendants (lines 145–242)
- `.leading` and all descendants (lines 297–371)
- `.sectors` (the dark sectors strip), `.sectors-grid`, `.sector` (lines 373–421)
- `.customers`, `.customers-row`, `.customer-logo` (lines 423–458)
- `.accreds`, `.accreds-grid`, `.accred-card` (lines 460–513)

After cutting, `main.css` should be empty (or contain only the file header comment). Verify by `wc -l src/assets/css/main.css` showing 0–5 lines.

Apply mobile-first conversion against the remaining rules in `responsive.css`:
- `.hero` from lines 16–19
- `.statement .row`, `.explainer .row`, `.leading .row`, `.accreds .row` from lines 30–43
- `.pillar-grid` from lines 45–47
- `.process-grid` (but that's services now — should already be removed by Task 3e), `.sectors-grid`, `.accreds-grid`, `.customers-row`, `.stats` from lines 49–59
- `.statement h2`, `.leading h2`, `.accreds h2`, `.process .head h2`, `.sectors .head h2`, `.articles h2` (latter two should be in their respective files now — leave only home-relevant) from lines 62–68
- All section paddings (`.statement`, `.leading`, `.process`, `.accreds`, `.sectors`, `.customers`) from line 25

- [ ] **Step 3: Remove home overrides from `responsive.css`**

Delete every remaining home-related entry. After this step `responsive.css` should contain only the utility-bar and footer rules (lines 7–13 and 102–111) — those are page chrome and belong in `layout.css` or `nav.css`. Move them:

- Move `.utility` overrides (lines 7–13) into `layout.css` as mobile-first base rules with the desktop layout in `@media (min-width: 64em)`.
- Move `footer .top` and `footer .bottom` overrides (lines 102–111) into `layout.css` similarly.

After these moves, `responsive.css` should be empty (or contain only the file header comment) — it gets deleted in Task 4.

- [ ] **Step 4: Rename generic descendants to BEM**

Rename table for home sections:

| Old | New | Block |
|---|---|---|
| `.hero .scrim` | `.hero__scrim` | hero |
| `.hero .container` | `.hero__container` | hero |
| `.hero .crumbs` | `.hero__crumbs` | hero |
| `.hero .crumbs a` | `.hero__crumbs-link` | hero |
| `.hero .crumbs span` | `.hero__crumbs-current` | hero |
| `.hero h1 .accent-bar` | `.hero__accent-bar` | hero |
| `.statement .row` | `.statement__row` | statement |
| `.statement .label` | `.statement__label` | statement |
| `.statement h2 .ul` | `.statement__highlight` | statement |
| `.statement p.lead` | `.statement__lead` | statement |
| `.explainer .row` | `.explainer__row` | explainer |
| `.explainer .bullet-row` | `.explainer__chips` | explainer |
| `.explainer .chip` | `.explainer__chip` | explainer |
| `.explainer .chip.blue` | `.explainer__chip--blue` | explainer |
| `.pillar .pic` | `.pillar__media` | pillar |
| `.pillar .pic--contain` | `.pillar__media--contain` | pillar |
| `.pillar .pic::after` | `.pillar__media::after` | pillar |
| `.pillar .pic .ico` | `.pillar__ico` | pillar |
| `.pillar .pic .ico svg` | `.pillar__ico svg` | pillar |
| `.pillar .body` | `.pillar__body` | pillar |
| `.pillar .more` | `.pillar__more` | pillar |
| `.pillar .more::after` | `.pillar__more::after` | pillar |
| `.leading .row` | `.leading__row` | leading |
| `.leading .copy .label` | `.leading__label` | leading |
| `.leading h2 .ul` | `.leading__highlight` | leading |
| `.leading .stats` | `.leading__stats` | leading |
| `.leading .stat .num` | `.leading__stat-num` | leading |
| `.leading .stat .lbl` | `.leading__stat-label` | leading |
| `.leading .pic` | `.leading__media` | leading |
| `.leading .pic .badge` | `.leading__badge` | leading |
| `.leading .pic .badge strong` | `.leading__badge-emphasis` | leading |
| `.sectors .head` | `.sectors__head` | sectors |
| `.sectors .head .label` | `.sectors__label` | sectors |
| `.sectors .head h2` | `.sectors__title` | sectors |
| `.sector .ico` | `.sector__ico` | sector |
| `.sector .ico svg` | `.sector__ico svg` | sector |
| `.customers .label` | `.customers__label` | customers |
| `.customer-logo.sans` | `.customer-logo--sans` | customer-logo |
| `.accreds .row` | `.accreds__row` | accreds |
| `.accreds .copy .label` | `.accreds__label` | accreds |
| `.accred-card .name` | `.accred-card__name` | accred-card |
| `.accred-card .meta` | `.accred-card__meta` | accred-card |

Apply renames atomically to `home.css` AND to `src/content/is/index.njk`, `src/content/en/index.njk`, plus any home partials.

- [ ] **Step 5: Add `bodyClass: home-page` to home templates**

- [ ] **Step 6: Update `base.njk` load order**

Insert `home.css` after `services.css`. Final order at this point (before Task 4 deletes responsive.css and Task 5 deletes main.css):

```html
    <link rel="stylesheet" href="/assets/css/tokens.css">
    <link rel="stylesheet" href="/assets/css/reset.css">
    <link rel="stylesheet" href="/assets/css/layout.css">
    <link rel="stylesheet" href="/assets/css/nav.css">
    <link rel="stylesheet" href="/assets/css/blocks.css">
    <link rel="stylesheet" href="/assets/css/main.css">       <!-- empty; deleted Stage 5 -->
    <link rel="stylesheet" href="/assets/css/quoter.css">
    <link rel="stylesheet" href="/assets/css/about.css">
    <link rel="stylesheet" href="/assets/css/sectors.css">
    <link rel="stylesheet" href="/assets/css/articles.css">
    <link rel="stylesheet" href="/assets/css/services.css">
    <link rel="stylesheet" href="/assets/css/home.css">
    <link rel="stylesheet" href="/assets/css/responsive.css"> <!-- empty; deleted Stage 4 -->
```

- [ ] **Step 7: Verify build and visual diff**

```bash
npm run build
```

Visual diff on `/` at all four viewports. Required: ≤ 1px shift.

Also re-walk **every** page from the Stage 0 baseline list (`/`, `/about/`, `/thjonusta/`, `/geirar/`, `/greinar/`, `/verdreiknir/`) at 320 and 1280 to confirm Stage 3f did not regress earlier-extracted pages.

- [ ] **Step 8: Commit**

```bash
git add src/assets/css/home.css src/assets/css/main.css src/assets/css/responsive.css src/assets/css/layout.css src/_includes/layouts/base.njk src/content/is/index.njk src/content/en/index.njk
git commit -m "$(cat <<'EOF'
css: extract home page family to home.css

Stage 3f of CSS architecture restructure.

- New file: src/assets/css/home.css, mobile-first, scoped under .home-page
- BEM rename: hero, statement, explainer, pillars, leading, sectors strip,
  customers, accreds generic descendants promoted
- Page-chrome overrides (utility bar, footer columns) moved from responsive.css
  into layout.css as mobile-first base + @media (min-width: 64em) desktop
- main.css: emptied (deleted in Stage 5)
- responsive.css: emptied (deleted in Stage 4)
EOF
)"
```

---

## Task 4: Delete `responsive.css`

**Files:**
- Delete: `src/assets/css/responsive.css`
- Modify: `src/_includes/layouts/base.njk` (remove link)

- [ ] **Step 1: Confirm `responsive.css` is empty**

```bash
wc -l src/assets/css/responsive.css
```

Expected: 0–5 lines (just the file header comment, if any). If non-empty, return to Task 3f and finish the migration.

- [ ] **Step 2: Delete the file and remove the link**

```bash
rm src/assets/css/responsive.css
```

Edit `src/_includes/layouts/base.njk` and remove the line:

```html
<link rel="stylesheet" href="/assets/css/responsive.css">
```

- [ ] **Step 3: Verify build and visual diff**

```bash
npm run build
```

Visual diff on all six pages at all four viewports. Required: pixel-identical to Stage 3f end-state (no behavior change — deleting an empty file).

- [ ] **Step 4: Commit**

```bash
git add src/assets/css/responsive.css src/_includes/layouts/base.njk
git commit -m "$(cat <<'EOF'
css: delete empty responsive.css

Stage 4 of CSS architecture restructure.

All responsive rules have been absorbed into the per-page-family CSS files
as mobile-first base + @media (min-width: 64em) desktop overrides. The
desktop-first responsive layer is no longer needed.
EOF
)"
```

---

## Task 5: Delete `main.css`

**Files:**
- Delete: `src/assets/css/main.css`
- Modify: `src/_includes/layouts/base.njk` (remove link)

- [ ] **Step 1: Confirm `main.css` is empty**

```bash
wc -l src/assets/css/main.css
```

Expected: 0–5 lines (just file header comment). If non-empty, identify what remains, decide whether it belongs in `blocks.css`, `layout.css`, or a page-family file, and move it.

- [ ] **Step 2: Delete the file and remove the link**

```bash
rm src/assets/css/main.css
```

Edit `src/_includes/layouts/base.njk` and remove the line:

```html
<link rel="stylesheet" href="/assets/css/main.css">
```

Final load chain:

```html
    <link rel="stylesheet" href="/assets/css/tokens.css">
    <link rel="stylesheet" href="/assets/css/reset.css">
    <link rel="stylesheet" href="/assets/css/layout.css">
    <link rel="stylesheet" href="/assets/css/nav.css">
    <link rel="stylesheet" href="/assets/css/blocks.css">
    <link rel="stylesheet" href="/assets/css/home.css">
    <link rel="stylesheet" href="/assets/css/services.css">
    <link rel="stylesheet" href="/assets/css/sectors.css">
    <link rel="stylesheet" href="/assets/css/articles.css">
    <link rel="stylesheet" href="/assets/css/about.css">
    <link rel="stylesheet" href="/assets/css/quoter.css">
```

- [ ] **Step 3: Verify build and visual diff**

```bash
npm run build
```

Visual diff on all six pages at all four viewports. Required: pixel-identical (deleting an empty file).

- [ ] **Step 4: Commit**

```bash
git add src/assets/css/main.css src/_includes/layouts/base.njk
git commit -m "$(cat <<'EOF'
css: delete empty main.css

Stage 5 of CSS architecture restructure.

All shared utilities (atoms + composed cross-page blocks) live in blocks.css.
All page-section rules live in the per-page-family files. main.css is no
longer needed.

Final CSS tree (11 files): tokens, reset, layout, nav, blocks, home, services,
sectors, articles, about, quoter.
EOF
)"
```

---

## Task 6: Build-time CSS assertion script

**Files:**
- Create: `scripts/check-css.js`
- Modify: `scripts/check-build.js` (call check-css at the end)

- [ ] **Step 1: Create `scripts/check-css.js`**

Write the following to `scripts/check-css.js`:

```js
// CSS architecture assertions. Run after `npx @11ty/eleventy` via check-build.js.
// Exits 1 on any violation; logs a summary on success.
//
// Enforces docs/directives/css-architecture.md §1, §4, §5.

import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const CSS_DIR = "src/assets/css";
const TEMPLATE_DIR = "src/_includes";
const CONTENT_DIR = "src/content";
const SITE_DIR = "_site";

const fail = (msg) => { console.error("[check-css] FAIL:", msg); process.exitCode = 1; };
const ok   = (msg) => console.log("[check-css] OK:", msg);

const EXPECTED_FILES = [
  "tokens.css", "reset.css", "layout.css", "nav.css", "blocks.css",
  "home.css", "services.css", "sectors.css", "articles.css", "about.css", "quoter.css",
];

// === 1. File count + names ===
{
  const present = (await readdir(CSS_DIR)).filter(f => f.endsWith(".css")).sort();
  const expected = [...EXPECTED_FILES].sort();
  const missing = expected.filter(f => !present.includes(f));
  const extra = present.filter(f => !expected.includes(f));
  if (missing.length) fail(`missing CSS files: ${missing.join(", ")}`);
  if (extra.length) fail(`unexpected CSS files: ${extra.join(", ")}`);
  if (!missing.length && !extra.length) ok(`11 CSS files present and accounted for`);
}

// === 2. Token discipline: zero raw hex/rgba/px outside tokens.css ===
const HEX_RE = /#[0-9a-fA-F]{3,8}\b/;
const RGBA_RE = /rgba?\(/;
// Allow 1px borders (per directive carve-out). Match any px > 1, or 1px not followed by " solid"/" dashed"/" dotted".
const PX_VIOLATION_RE = /\b(?:[02-9]|\d{2,})px\b|\b1px\b(?!\s+(?:solid|dashed|dotted))/;

for (const file of EXPECTED_FILES) {
  if (file === "tokens.css") continue;
  const text = await readFile(join(CSS_DIR, file), "utf8");
  // Strip comments to avoid false positives in commentary.
  const stripped = text.replace(/\/\*[\s\S]*?\*\//g, "");
  if (HEX_RE.test(stripped)) fail(`raw hex value in ${file}`);
  if (RGBA_RE.test(stripped)) fail(`raw rgba() in ${file}`);
  if (PX_VIOLATION_RE.test(stripped)) fail(`raw px value in ${file} (only "1px solid/dashed/dotted" allowed)`);
}
ok("no raw color/spacing values outside tokens.css");

// === 3. Selector depth: max 2 descendant combinators per selector ===
// Selectors are split by ',' at the top level. Each must have ≤ 2 descendant combinators
// (i.e. ≤ 3 simple selectors separated by whitespace, excluding the page-family scope class).
const PAGE_FAMILY_SCOPE_RE = /^\.(home|services|sectors|articles|about|quoter)-page\s+/;

for (const file of EXPECTED_FILES) {
  if (file === "tokens.css" || file === "reset.css") continue;
  const text = await readFile(join(CSS_DIR, file), "utf8");
  const stripped = text.replace(/\/\*[\s\S]*?\*\//g, "");
  // Match selectors before `{`. Crude but sufficient.
  const ruleHeads = stripped.match(/^[^@{}]+(?=\{)/gm) || [];
  for (const head of ruleHeads) {
    for (const selector of head.split(",")) {
      const s = selector.trim();
      if (!s) continue;
      const scopeStripped = s.replace(PAGE_FAMILY_SCOPE_RE, "");
      // Count whitespace-separated simple selectors (excluding combinators >, +, ~).
      const parts = scopeStripped.split(/\s+/).filter(p => !["",">", "+", "~"].includes(p));
      // Directive §4: max 2 levels after the page-family scope class (or 2 levels total in
      // non-scoped files like blocks.css). After scope-strip, parts.length must be ≤ 2.
      if (parts.length > 2) {
        fail(`selector depth > 2 in ${file}: ${s}`);
      }
    }
  }
}
ok("all selectors within depth budget (≤ 2 after page-family scope)");

// === 4. !important without inline comment ===
for (const file of EXPECTED_FILES) {
  const text = await readFile(join(CSS_DIR, file), "utf8");
  const lines = text.split("\n");
  lines.forEach((line, i) => {
    if (!line.includes("!important")) return;
    const sameLineComment = /\/\*.*\*\/|\/\//.test(line);
    const prevLineComment = i > 0 && /\/\*|\/\//.test(lines[i - 1]);
    if (!sameLineComment && !prevLineComment) {
      fail(`${file}:${i + 1} — !important without rationale comment`);
    }
  });
}
ok("every !important has a rationale comment");

// === 5. No inline styles in built HTML ===
async function* walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else yield p;
  }
}

let inlineCount = 0;
for await (const f of walk(SITE_DIR)) {
  if (!f.endsWith(".html")) continue;
  const text = await readFile(f, "utf8");
  // Strip <pre> and <code> blocks (HTML examples in docs/articles).
  const stripped = text.replace(/<(pre|code)[\s\S]*?<\/\1>/g, "");
  const matches = stripped.match(/\sstyle\s*=\s*["'][^"']+["']/g) || [];
  inlineCount += matches.length;
  if (matches.length) fail(`${f}: ${matches.length} inline style attributes`);
}
if (inlineCount === 0) ok("no inline style attributes in built HTML");

if (process.exitCode) {
  console.error("[check-css] CSS architecture assertions FAILED");
  process.exit(process.exitCode);
} else {
  ok("CSS architecture assertions passed");
}
```

- [ ] **Step 2: Wire `check-css.js` into `check-build.js`**

Edit `scripts/check-build.js`. At the very end of the file, before the final exit handling, add:

```js
// Run CSS architecture assertions.
await import("./check-css.js");
```

(Placement after all build-output assertions ensures CSS checks run on the same `npm run build` invocation.)

- [ ] **Step 3: Run the build and fix any violations**

```bash
npm run build
```

Expected outcomes:
- If all earlier stages were done correctly: exits clean, logs `[check-css] OK: …` lines.
- If violations are reported: read each `FAIL` line, fix the offending file (move a raw value into `tokens.css`, flatten a selector, add a comment to an `!important`, remove an inline style), rebuild.

This step may take a few iterations. Treat each FAIL as a directive violation to fix in the source — never disable the assertion to silence it.

- [ ] **Step 4: Commit**

```bash
git add scripts/check-css.js scripts/check-build.js
git commit -m "$(cat <<'EOF'
chore: add CSS architecture build-time assertions

Stage 6 of CSS architecture restructure.

scripts/check-css.js enforces docs/directives/css-architecture.md:
- §1: exact set of 11 CSS files in src/assets/css/
- §5: zero raw hex/rgba/px outside tokens.css (1px borders excepted)
- §4: selector depth ≤ 3 inside page-family scope
- §4: every !important has a rationale comment
- §4: zero inline style attributes in built HTML

Wired into npm run build via check-build.js.
EOF
)"
```

---

## Self-review notes

After all tasks complete:

1. **Spec coverage:** Every section of the design (file layout, naming, token discipline, responsive, motion, i18n, migration, directive) maps to at least one task. Motion + i18n rules are documented in the directive (Task 1) but are not actively enforced by the assertion script — they are convention-checked at code review. This is intentional; automating them would require AST-level CSS parsing.
2. **Placeholder scan:** No "TBD" or "TODO" remains in the task steps. Each step contains the actual content the executor needs.
3. **Type consistency:** Class names in the rename tables (Tasks 3a–3f) are consistent — `.story__timeline-year` matches across step 4 and step 8 commit messages; `.quoter-row__subtotal` not mixed with `.quoter-row__sub-total`.
4. **Stage ordering:** Quoter first (most isolated, lowest cross-page block use), home last (most cross-page block use — easier to confirm cross-page blocks are correctly placed in `blocks.css` after every other family is done).

---

## Execution choices

After saving this plan, the executor should choose:

**1. Subagent-Driven (recommended)** — fresh subagent per task, review between tasks, fast iteration. Best for the long task chain (10 tasks across 3 stages).

**2. Inline Execution** — execute tasks in this session using executing-plans, batch execution with checkpoints. Best if context window has plenty of room and the user wants synchronous progress visibility.
