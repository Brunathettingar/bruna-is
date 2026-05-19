# G12 — CSS architecture overhaul: load order, layout split, token discipline, BEM, dedup

- **Severity:** High
- **Specialty:** code-reviewer, consistency-auditor
- **Consolidates:** H2, H3, M1, M16, M19, M21
- **Sequencing:** Runs concurrently with G1 (image pipeline). Stage 5 (per-section split) must reconcile with G1's `<img>`-based markup once G1 lands — the hero/scrim/pic selectors change shape.
- **File-count target:** **10–12 CSS files** post-refactor (matches the reference at `/Users/olafur/Development/somethings/src/assets/css/`, which ships 11). Today's `src/assets/css/` ships 5 files — `tokens.css`, `reset.css`, `main.css` (1,540 lines), `nav.css`, `responsive.css`.

---

## What

`src/assets/css/` violates the framework spec on five reinforcing axes:

1. **Load order is wrong.** `base.njk` loads `tokens → reset → main → nav → responsive`. Spec mandates `tokens → reset → layout → nav → main → per-section`. (H2)
2. **`layout.css` does not exist.** Page-chrome rules (container, header, footer skeleton, page-hero shell, skip-link, breadcrumb/crumbs, utility bar, lang switcher) live inline in `main.css`. (H2)
3. **`main.css` is monolithic (1,540 lines).** No per-section split — every section (`.hero`, `.statement`, `.pillars`, `.process`, `.leading`, `.sectors`, `.accreds`, `.cta-band`, `.story`, `.philosophy`, `.team`, `.articles`, `.service-feature`, `.value-band`, `.quoter-*`, `.sectors-page`, …) lives in one file. (H2)
4. **`main.css:6–24` redeclares `:root`.** A second token block — `--bg`, `--text`, `--accent`, …, identical or near-identical names to `tokens.css` — shadows the canonical set. (H3)
5. **Raw values everywhere.** ~50 raw hex literals, ~37 raw `rgba()` calls, and 450–491 raw `px` magic numbers live in `main.css` + `responsive.css` outside `tokens.css`. Spec rule #4: *No raw color/spacing/size values in CSS outside tokens.css.* (H3)
6. **Logo brand colors are duplicated in template attributes.** `header.njk:5–6` ships `fill="#ee7c1d"` and `fill="#1453a8"` inline on SVG `<text>` — the brand orange and blue, hard-coded outside `tokens.css`. Footer already drives the same wordmark through CSS classes (`main.css:691–692`). (M1)
7. **Reset rules run twice.** `reset.css:1–19` ships a real reset; `main.css:21–27` (and adjacent rules around lines 26–39) re-state `body` line-height / background / smoothing, `button` cursor / font, etc. Two reset systems load back-to-back. (M16)
8. **BEM is partially adopted.** `nav.css` and `breadcrumb.njk` use BEM (`.nav-toggle`, `.breadcrumb__list`, `.breadcrumb__item`). `main.css` uses descendant chains on generic class names — `.row`, `.col`, `.pic`, `.ico`, `.body`, `.bg`, `.scrim`, `.crumbs`, `.label`, `.lead`, `.tag`, `.utility .left`, `.utility .right`, `.hero .bg`, `.pillar .pic .ico`. Generic names collide across sections and bypass the spec's naming convention. (M19)
9. **Dead CSS in production.** `.mockup-note` (`main.css:34–41`) is a yellow "MOCKUP" pill positioned `fixed; top:12px; right:12px` — a build-time reminder badge. No template references the class. It ships to every visitor. (M21)

The matching reference implementation at `/Users/olafur/Development/somethings/src/assets/css/` already demonstrates the target shape: 11 files, mobile-first per-section CSS, BEM throughout, zero raw colors outside `tokens.css`, and a clean `tokens → reset → layout → nav → main → home → projects → works → work-detail → writing → about` chain.

---

## Why

**Consistency** (`directives/consistency.md`): the codebase already establishes the BEM + token convention in `nav.css`, `reset.css`, and `tokens.css`. `main.css` is the lone holdout. Half the file uses tokens (`var(--accent)`, `var(--line)`), the other half doesn't (`#fff`, `12px`, `rgba(10,13,18,0.4)`). Pick one rule and enforce it everywhere.

**Maintainability** (`directives/maintainability.md`): a 1,540-line `main.css` makes every change a search-and-grep exercise. The duplicate `:root` block means a token edit in `tokens.css` may silently fail to propagate when the `main.css` shadow is the one that wins. Reset rules in two files means future devs delete the wrong copy.

**Modularity** (`directives/modularity.md`): per-section files let the home page ship its own CSS without dragging the quoter or service-feature rules along. The reference site already does this.

**Simplicity** (`directives/simplicity.md`): the framework spec is the source of truth. Deviating from it adds cognitive load without buying anything — the existing layout works inside `main.css` because CSS doesn't care where a rule lives, not because the structure is correct.

**Spec compliance:** `docs/instructions/FRAMEWORK-PORT-PROMPT.md` §"CSS structure" mandates the load order and per-section split. `docs/architecture-deviations.md` §2 currently pre-accepts the duplicate `:root` and raw-value usage; the focus brief explicitly overrides that exception. Stage 0 of this fix is to delete §2 from the deviations doc.

---

## How — staged refactor

This is a multi-day refactor. Each stage is independently committable; ship in order, verify visually after each stage. **Do not collapse stages.**

### Stage 0 — Prep

- Delete `docs/architecture-deviations.md` §2 (the pre-acceptance the focus brief overrides). The deviation doc should mention G12 instead with a "resolved by G12 fix" note.
- Take a screenshot of `/`, `/about/`, `/thjonusta/`, `/verdreiknir/`, `/greinar/`, `/geirar/` at 320 / 768 / 1280 / 1920 viewports as a visual baseline. Each stage must reproduce these pixel-for-pixel until Stage 7 (BEM rename) — Stage 7 is the only one that touches markup.

### Stage 1 — Create `layout.css`

Extract page-chrome rules from `main.css` into a new `src/assets/css/layout.css`. Layout = anything that is not a content section: container, site-header skeleton, footer skeleton, utility bar shell, breadcrumb/crumbs chrome, page-hero shell, skip-link (currently in `reset.css` — keep there OR move here; the reference puts it in `reset.css`, keep it).

Extract:
- `html { scroll-behavior: smooth; }` (`main.css:6`)
- `.container` (`main.css:29–32`)
- `.utility`, `.utility .row`, `.utility a`, `.utility .left`, `.utility .right`, `.utility .left .pill`, `.utility .right .lang a` (`main.css:55–80`)
- `.site-header`, `.site-header .row`, `.brand`, `.brand svg.logo`, `.brand small.tag`, `.brand--footer` (`main.css:20, 85–110`)
- `nav.primary ul`, `nav.primary a`, `nav.primary a:hover`, `nav.primary a.active`, `nav.primary a.active::after`, `nav.primary .cta`, `nav.primary .cta:hover`, `nav.primary .cta::after` (`main.css:111–137`) — these are arguably "nav" but they live in `main.css` today; move them to `nav.css` alongside `.nav-toggle`. Mark this in the commit message.
- `footer`, `footer .top`, `footer .col h5`, `footer .col ul`, `footer .col a`, `footer .col p`, `footer .brand svg.logo .bruna`, `footer .brand svg.logo .pett`, `footer .brand small.tag`, `footer .bottom`, `footer .bottom a` (`main.css:664–707`)
- `.page-hero`, `.page-hero .bg`, `.page-hero .scrim`, `.page-hero .container`, `.page-hero .crumbs`, `.page-hero h1`, `.page-hero p.kicker` (`main.css:712–754`) — the page-hero is a shared shell used on `/about/` and `/greinar/`; treat it as chrome.
- `.svg-defs` (`main.css:9`)
- `.bruna`, `.pett` (`main.css:17–18`) — these style the SVG wordmark used by header AND footer; chrome.

#### Before / After — `base.njk` CSS chain

**Before (`src/_includes/layouts/base.njk:20–24`):**

```html
<link rel="stylesheet" href="/assets/css/tokens.css">
<link rel="stylesheet" href="/assets/css/reset.css">
<link rel="stylesheet" href="/assets/css/main.css">
<link rel="stylesheet" href="/assets/css/nav.css">
<link rel="stylesheet" href="/assets/css/responsive.css">
```

**After Stage 1 (layout.css exists, main.css still ships):**

```html
<link rel="stylesheet" href="/assets/css/tokens.css">
<link rel="stylesheet" href="/assets/css/reset.css">
<link rel="stylesheet" href="/assets/css/layout.css">
<link rel="stylesheet" href="/assets/css/nav.css">
<link rel="stylesheet" href="/assets/css/main.css">
<link rel="stylesheet" href="/assets/css/responsive.css">
```

**After Stage 5–6 (per-section split + responsive merged):**

```html
<link rel="stylesheet" href="/assets/css/tokens.css">
<link rel="stylesheet" href="/assets/css/reset.css">
<link rel="stylesheet" href="/assets/css/layout.css">
<link rel="stylesheet" href="/assets/css/nav.css">
<link rel="stylesheet" href="/assets/css/main.css">
<link rel="stylesheet" href="/assets/css/home.css">
<link rel="stylesheet" href="/assets/css/services.css">
<link rel="stylesheet" href="/assets/css/sectors.css">
<link rel="stylesheet" href="/assets/css/articles.css">
<link rel="stylesheet" href="/assets/css/about.css">
<link rel="stylesheet" href="/assets/css/quoter.css">
```

`main.css` post-split holds only the truly shared section utilities: `.hl-underline`, `.btn` (+ `.btn.primary`, `.btn.ghost`), `.pagination`, and the shared `.ul` highlight pattern that appears across `.statement h2`, `.leading h2`, `.cta-band h2`, `.story h2`, `.value-band h2`. Everything else moves.

### Stage 2 — Delete the duplicate `:root` block

`main.css:24` opens a second `:root {` (the file's actual content starts at line 6 with the `html { scroll-behavior }` rule; the `:root` block lives at lines that the H3 finding identifies as `6–24` — verify before deleting). Compare every token against `tokens.css`:

- If the value is identical → delete from `main.css`, do nothing else.
- If the value differs → reconcile. The canonical value lives in `tokens.css`; if `main.css`'s value is the one in use, port it to `tokens.css` first, then delete the shadow.
- If a token in `main.css` has no equivalent in `tokens.css` → port it to `tokens.css`, then delete the shadow.

Confirm with a build diff: `npm run build` before and after Stage 2, then diff `_site/assets/css/`. Visual output must be byte-identical.

### Stage 3 — Delete `.mockup-note`

Remove `main.css:34–41`. Confirm zero template references first:

```bash
rg "mockup-note" src/
```

Expected: zero matches. Delete the rule. Ship.

### Stage 4 — Token migration sweep

Every raw hex, raw `rgba()`, and raw `px` in `main.css` and `responsive.css` becomes a token reference. Add tokens to `tokens.css` only when none of the existing tokens fit — prefer reusing the existing scale.

**Pattern A — colors:**
- `#fff` / `#ffffff` → `var(--bg)`
- `#0a0d12` → `var(--bg-dark)` (already a token)
- `#c8ccd3` → add as `--text-on-dark-soft` to `tokens.css` (used in `.utility a`, `footer`, and elsewhere) — six call sites
- `rgba(255,255,255,0.7)` → `var(--alpha-on-dark-med)` (already exists as `0.65`; either reuse or add `--alpha-on-dark-strong-med`)
- `rgba(255,255,255,0.5)` → `var(--alpha-on-dark-low)` (0.55 exists; close enough — reuse)
- `rgba(255,255,255,0.4)` → `var(--alpha-on-dark-faint)` (0.45 exists; reuse)
- `rgba(255,255,255,0.18)` (footer brand border) → add `--alpha-on-dark-border` (0.18)
- `rgba(255,255,255,0.08)` (team avatar radial gradient) → add `--alpha-on-dark-haze`
- `rgba(255,255,255,0.95)` (customer-logo hover) → reuse `var(--bg)` or add `--alpha-on-dark-full`
- `rgba(10,13,18,0.4)` / `0.2` / `0.55` / `0.7` / `0.92` (hero scrim, page-hero scrim) → all six are scrim variants. `--alpha-scrim-strong` (0.85), `--alpha-scrim-med` (0.6), `--alpha-scrim-soft` (0.25) already exist. Add `--alpha-scrim-near` (0.4), `--alpha-scrim-low` (0.2), `--alpha-scrim-floor` (0.92), `--alpha-scrim-deep` (0.7), `--alpha-scrim-mid` (0.55). Audit the gradient stops first — some may snap to existing tokens.
- `rgba(94,187,122,0.12)` (`.quoter-confirm` background) → `var(--success-soft)` (already exists)
- `#5fb37a` (`.quoter-confirm` border) → `var(--success)` (already exists)
- `#c8efd4` (`.quoter-confirm` text) → add `--success-text` to tokens
- `#0f3a78` (team avatar gradient stop) → add `--brand-blue-dark`
- `#fff8e6` / `#6b5410` / `#e8d68a` (`.mockup-note`) → DELETED in Stage 3, no migration needed
- `#f1f3f6` (`.service-feature .pic.contain` background) → reuse `var(--bg-soft)`

**Pattern B — pixels:**

The reference site uses a `--space-N` 0.25rem grid plus a `--text-N` 1.25-ratio scale. The Bruna spec already ships both. Migrate:

- `0px` / `0 32px` / `padding: 9px 0` etc. → `var(--space-N)` where the value matches the grid. `8px → --space-2`, `12px → --space-3`, `16px → --space-4`, `22px → --space-5` (or `--space-6` = 1.5rem = 24px; round to nearest), `28px → --space-7`, `32px → --space-8`, `40px → --space-10`, `56px → --space-14`, `64px → --space-16`, `72px → --space-18`, `80px → --space-20`, `88px → --space-22`, `100px → --space-25` (add) or pin to `--space-24` (6rem = 96px) — pick one and propagate.
- Font sizes: `12px → var(--text-sm)`, `13px → var(--text-md)` (these are rem-based; 0.75rem = 12px, 0.8125rem = 13px). `14px → var(--text-base)`, `16px → var(--text-lg)`, `18px → var(--text-xl)`, `20px / 24px / 26px → var(--text-2xl / --text-3xl)`. Larger headings (`32px`, `36px`, `38px`, `42px`, `44px`, `48px`, `64px`, `88px`) map to `--text-4xl` through `--text-display`. Audit each: the spec's existing scale doesn't include every legacy value, so either snap to nearest or add a token. Prefer snap. If you add tokens, do it via a token-audit commit at end of Stage 4, not piecemeal.
- Letter-spacing: `-0.5px`, `-1px`, `-2px`, `0.5px`, `1.5px`, `3px` → existing `--ls-tight-1/2/3` and `--ls-loose-1/2/3` cover the common values. Anything off-grid: snap or add.
- Line-heights: `1.1`, `1.15`, `1.2`, `1.25`, `1.4`, `1.55`, `1.6`, `1.65`, `1.7` → existing `--lh-flat/tight/snug/normal/relaxed/loose` covers most. Snap to nearest.
- Border-radius `999px` → `var(--radius-pill)` (already exists).
- Shadow `0 22px 48px -28px rgba(10,13,18,0.35)` (`.pillar:hover`) → `var(--shadow-card)` already exists with this exact value.
- Shadow `0 2px 8px rgba(0,0,0,0.06)` (`.mockup-note`) → DELETED in Stage 3.

**Pattern C — transitions:**
- `0.15s` / `0.2s` / `0.25s` → `var(--transition-fast)` / `var(--transition-base)` / `var(--transition-slow)` (all three already exist).

**Pattern D — z-indexes:**
- `z-index: 999` → `var(--z-overlay)` (already exists)
- `z-index: 50` → `var(--z-sticky)` (already exists)
- `z-index: 2` (hero `.container`, page-hero `.container`) → `var(--z-base)` (1) doesn't fit; add `--z-content: 2` or just keep as `2` if you decide tokens-for-z is overkill. Pick one rule.

**Pattern E — breakpoints:**

`responsive.css` already uses `--bp-lg` indirectly via `max-width: 63.999em` (which is `--bp-lg - 0.001em`). Replace with `(width < var(--bp-lg))` once supported, OR introduce `--bp-lg-max: 63.999em`. Lower priority — separate ticket if needed.

#### Before / After — token migration on a representative ~30-line block

**Before (`main.css:142–190`, the `.hero` block):**

```css
.hero {
  position: relative;
  min-height: 540px;
  background: var(--bg-dark);
  color: #fff;
  overflow: hidden;
  display: flex; align-items: flex-end;
}
.hero .bg {
  position: absolute; inset: 0;
  background-size: cover; background-position: center;
  opacity: 0.5;
}
.hero .scrim {
  position: absolute; inset: 0;
  background: linear-gradient(180deg,
    rgba(10,13,18,0.4) 0%,
    rgba(10,13,18,0.2) 40%,
    var(--alpha-scrim-strong) 100%);
}
.hero .container {
  position: relative; z-index: 2;
  padding-top: 120px;
  padding-bottom: 80px;
  width: 100%;
}
.hero .crumbs {
  font-size: 12px; letter-spacing: 2.5px;
  color: rgba(255,255,255,0.7);
  text-transform: uppercase;
  font-weight: 500;
  margin-bottom: 22px;
}
.hero .crumbs a { color: rgba(255,255,255,0.7); }
.hero .crumbs span { color: var(--accent); }
.hero h1 {
  font-family: var(--sans);
  font-size: 88px; font-weight: 700;
  line-height: 0.95; letter-spacing: -2px;
  margin-bottom: 8px;
  position: relative;
  display: inline-block;
}
.hero h1 .accent-bar {
  display: block;
  width: 92px; height: 5px;
  background: var(--accent);
  margin-top: 22px;
}
```

**After Stage 4 (still in `main.css` — Stage 5 moves it to `home.css`, Stage 7 BEM-renames):**

```css
.hero {
  position: relative;
  min-height: 33.75rem; /* was 540px */
  background: var(--bg-dark);
  color: var(--bg);
  overflow: hidden;
  display: flex; align-items: flex-end;
}
.hero .bg {
  position: absolute; inset: 0;
  background-size: cover; background-position: center;
  opacity: 0.5;
}
.hero .scrim {
  position: absolute; inset: 0;
  background: linear-gradient(180deg,
    var(--alpha-scrim-near) 0%,
    var(--alpha-scrim-low) 40%,
    var(--alpha-scrim-strong) 100%);
}
.hero .container {
  position: relative; z-index: var(--z-content);
  padding-top: var(--space-24);   /* was 120px ≈ 7.5rem; --space-24 = 6rem; add --space-30 = 7.5rem if pixel-fidelity matters */
  padding-bottom: var(--space-20); /* was 80px = 5rem */
  width: 100%;
}
.hero .crumbs {
  font-size: var(--text-sm);
  letter-spacing: var(--ls-loose-2); /* was 2.5px; nearest token = 1.5px or 3px — pick one */
  color: var(--alpha-on-dark-med);
  text-transform: uppercase;
  font-weight: var(--fw-medium);
  margin-bottom: var(--space-5);    /* was 22px ≈ 1.375rem; --space-5 = 1.25rem */
}
.hero .crumbs a { color: var(--alpha-on-dark-med); }
.hero .crumbs span { color: var(--accent); }
.hero h1 {
  font-family: var(--sans);
  font-size: var(--text-display); /* was 88px */
  font-weight: var(--fw-bold);
  line-height: 0.95;              /* below --lh-flat; add --lh-supertight if used elsewhere */
  letter-spacing: var(--ls-tight-3);
  margin-bottom: var(--space-2);
  position: relative;
  display: inline-block;
}
.hero h1 .accent-bar {
  display: block;
  width: 5.75rem;                 /* was 92px; add --bar-width to tokens or accept rem */
  height: 0.3125rem;              /* was 5px */
  background: var(--accent);
  margin-top: var(--space-5);
}
```

Where a legacy value lands off-grid (`92px`, `5px`, `120px`, `2.5px`, `0.95`), the rule is:

1. First choice — snap to the nearest existing token, accept the 1–2px visual drift.
2. Second choice — add a new token to `tokens.css` with a semantic name and reuse it.
3. Last resort — leave the rem-converted literal in place with a `/* TODO: tokenize */` comment. **Do not** leave raw `px`.

Track in a `STAGE4-TOKENS.md` scratchpad which tokens were added and which legacy values snapped. Delete the scratchpad after Stage 4 ships.

### Stage 5 — Per-section split

Section boundaries in `main.css` are already marked with `/* ============ */` banner comments. Split each banner-section into its own file:

| Section banner (line range) | New file | Selectors (top-level) |
|---|---|---|
| Hero (142–190) | `home.css` | `.hero`, `.hero .bg`, `.hero .scrim`, `.hero .container`, `.hero .crumbs`, `.hero h1`, `.hero h1 .accent-bar` |
| Statement (195–223) | `home.css` | `.statement`, `.statement .row`, `.statement .label`, `.statement h2`, `.statement h2 .ul`, `.statement p.lead` |
| Explainer (228–263) | `home.css` | `.explainer` + descendants |
| Pillars (268–347) | `home.css` | `.pillars`, `.pillar-grid`, `.pillar` + descendants |
| Process (352–400) | `services.css` (also used on home) — leave in `home.css` if home is the only consumer; audit page templates first | `.process` + `.process-grid` + `.process-step` |
| Leading (405–469) | `home.css` | `.leading` + descendants |
| Sectors (474–519) | `home.css` (the home page mini-sectors strip) | `.sectors`, `.sectors-grid`, `.sector` |
| Customers (521–556) | `home.css` | `.customers`, `.customers-row`, `.customer-logo` |
| Accreds (561–611) | `home.css` | `.accreds`, `.accreds-grid`, `.accred-card` |
| CTA band (616–659) | `main.css` (shared — appears on multiple pages) OR `cta.css` | `.cta-band`, `.btn` + variants |
| Page-hero (712–754) | `layout.css` (Stage 1 moved this already) | — |
| Story (759–833) | `about.css` | `.story` + `.timeline` + `.signature` |
| Philosophy (838–894) | `about.css` | `.philosophy`, `.principles`, `.principle` |
| Team (899–962) | `about.css` | `.team`, `.team-grid`, `.team-card` |
| Articles (967–1057) | `articles.css` | `.articles`, `.article-featured`, `.article-grid`, `.article-card` |
| Sectors-page (1062–1142) | `sectors.css` | `.sectors-page`, `.sectors-intro`, `.sector-grid`, `.sector-card` |
| Services-page (1147–1252) | `services.css` | `.services-page`, `.services-intro`, `.service-feature` |
| Value-band (1255–1284) | `services.css` (or shared) | `.value-band` |
| Quoter (1289–1517) | `quoter.css` | `.quoter-section`, `.quoter-intro`, `.quoter`, `.quoter-header`, `.quoter-rows`, `.quoter-row`, `.quoter-actions`, `.quoter-total`, `.quoter-customer`, `.quoter-confirm` |
| Pagination (1521–1539) | `main.css` (shared) | `.pagination` |

After this stage, `main.css` should contain only:
- `.hl-underline` (shared highlight utility)
- `.btn` + variants (shared button)
- `.pagination`
- The shared `.ul` highlight pattern (DRY across `.statement h2`, `.leading h2`, etc. — extract to `.heading-highlight` or similar)

#### Before / After — extracting `.pillars` to `home.css`

**Before (`main.css:265–347`):**

```css
/* ===========================================================
   Three-pillar solutions split
   =========================================================== */
.pillars {
  padding: 80px 0 100px;
  background: var(--bg);
}
.pillar-grid {
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 28px;
}
.pillar { /* ... */ }
.pillar .pic { /* ... */ }
.pillar .pic .ico { /* ... */ }
.pillar .body { /* ... */ }
/* etc */
```

**After Stage 5 — new file `src/assets/css/home.css`:**

```css
/* Home page — hero, statement, explainer, pillars, leading, sectors strip, customers, accreds */

/* ---- Hero (Stage 4 tokens applied) ---- */
.hero { /* ... */ }

/* ---- Pillars ---- */
.pillars {
  padding: var(--space-20) 0 var(--space-25);
  background: var(--bg);
}
.pillar-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-7);
}
.pillar { /* ... */ }
/* etc — copied verbatim from main.css, Stage 4 token substitutions intact */
```

`main.css` after Stage 5 sheds these blocks. Each new section file is wired into `base.njk` in the load order shown in Stage 1 "After Stage 5–6".

### Stage 6 — Mobile-first refactor (delete `responsive.css`)

`responsive.css` is a desktop-down override sheet (`@media (max-width: 63.999em)`). The reference site is mobile-first: each section's base styles are mobile, with `@media (min-width: ...)` overrides for desktop.

For each section file from Stage 5:

1. Identify the mobile rules in `responsive.css` that target this section (`.statement .row` collapsing to 1 col, `.hero h1` font-size shrinking, `.pillar-grid` becoming 1 col, etc.).
2. Make those the **base** rules in the section file.
3. Wrap the desktop rules from `main.css` in `@media (min-width: 64em)`.
4. Delete the corresponding block in `responsive.css`.

When `responsive.css` is empty, delete the file and remove the `<link>` from `base.njk`.

Example for `.pillar-grid` in `home.css`:

```css
/* Mobile first */
.pillar-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-7);
}

/* Desktop */
@media (min-width: 64em) {
  .pillar-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
```

Some `responsive.css` rules consolidate many selectors into one declaration (`.statement .row, .explainer .row, .leading .row, .story .row, … { grid-template-columns: 1fr; }`). Don't preserve the consolidation — break each selector into its respective section file's mobile base. The CSS will gzip nearly identically; the maintainability win is worth it.

### Stage 7 — BEM rename

This is the only stage that touches markup. Each rename pairs a CSS edit with a template/content edit. Ship one selector at a time — small commits, easier to revert.

Rename map (non-exhaustive — audit all of `main.css` after Stage 6):

| Today (descendant chain / generic) | BEM | Templates touched |
|---|---|---|
| `.pillar .pic` | `.pillar__media` | `content/is/index.njk`, `content/en/index.njk` |
| `.pillar .pic .ico` | `.pillar__icon` | same |
| `.pillar .body` | `.pillar__body` | same |
| `.pillar .more` | `.pillar__more` | same |
| `.hero .bg` | `.hero__bg` | `content/is/index.njk`, `content/en/index.njk` |
| `.hero .scrim` | `.hero__scrim` | same |
| `.hero .container` | `.hero__container` (or keep `.container` as a layout primitive nested inside `.hero`) — pick a rule. Reference treats `.container` as a layout primitive. Keep. | — |
| `.hero .crumbs` | `.hero__crumbs` | same |
| `.hero h1 .accent-bar` | `.hero__accent-bar` | same |
| `.statement .row`, `.statement .label`, `.statement p.lead` | `.statement__row`, `.statement__label`, `.statement__lead` | `content/is/index.njk`, `content/en/index.njk` |
| `.explainer .row`, `.explainer h3`, `.explainer .bullet-row`, `.explainer .chip` | `.explainer__row`, `.explainer__heading`, `.explainer__bullets`, `.explainer__chip` (+ modifier `.explainer__chip--blue`) | same |
| `.leading .copy`, `.leading .pic`, `.leading .pic .badge`, `.leading .stats`, `.leading .stat .num`, `.leading .stat .lbl` | `.leading__copy`, `.leading__media`, `.leading__badge`, `.leading__stats`, `.leading__stat-num`, `.leading__stat-label` | same |
| `.sector .ico`, `.sector h4`, `.sector p` | `.sector__icon`, `.sector__heading`, `.sector__body` | same |
| `.customer-logo.sans` | `.customer-logo--sans` | same |
| `.utility .left`, `.utility .right`, `.utility .left .pill`, `.utility .right .lang` | `.utility__left`, `.utility__right`, `.utility__pill`, `.utility__lang` | `partials/utility-bar.njk` |
| `.brand small.tag` | `.brand__tag` | `partials/header.njk`, `partials/footer.njk` |
| `.brand svg.logo` | `.brand__logo` | same |
| `.brand--footer` | keep — already BEM | — |
| `nav.primary` | `.nav-primary` (already in nav.css — verify) | `partials/header.njk` |
| `nav.primary .cta` | `.nav-primary__cta` | same |
| `footer .top`, `footer .col`, `footer .bottom`, `footer .col h5` | `.site-footer__top`, `.site-footer__col`, `.site-footer__bottom`, `.site-footer__col-heading`. Also rename `<footer>` → `<footer class="site-footer">` | `partials/footer.njk` |
| `.story .copy`, `.story .signature`, `.story .timeline`, `.story .timeline-row`, `.story .timeline-row .yr`, `.story .timeline-row .ev` | `.story__copy`, `.story__signature`, `.story__timeline`, `.story__timeline-row`, `.story__year`, `.story__event` | `content/is/about/index.njk`, `content/en/about/index.njk` |
| `.principles`, `.principle`, `.principle .num` | `.principles`, `.principle`, `.principle__num` | same |
| `.team-card .avatar`, `.team-card .avatar.orange`, `.team-card .body`, `.team-card .role`, `.team-card .meta` | `.team-card__avatar`, `.team-card__avatar--orange`, `.team-card__body`, `.team-card__role`, `.team-card__meta` | same |
| `.article-featured .pic`, `.article-featured .body`, `.article-featured .tag`, `.article-featured .meta` | `.article-featured__media`, `.article-featured__body`, `.article-featured__tag`, `.article-featured__meta` | `content/is/greinar/`, `content/en/greinar/` |
| `.article-card .pic`, `.article-card .pic .tag`, `.article-card .body`, `.article-card .meta` | `.article-card__media`, `.article-card__media-tag`, `.article-card__body`, `.article-card__meta` | same |
| `.sector-card .pic`, `.sector-card .pic .badge`, `.sector-card .body`, `.sector-card ul.svc-tags` | `.sector-card__media`, `.sector-card__badge`, `.sector-card__body`, `.sector-card__tags` | `content/is/geirar/`, `content/en/geirar/` |
| `.service-feature .pic`, `.service-feature .copy`, `.service-feature .pic.contain`, `.service-feature .num-badge`, `.service-feature .insight`, `.service-feature.flip` | `.service-feature__media`, `.service-feature__copy`, `.service-feature__media--contain`, `.service-feature__num`, `.service-feature__insight`, `.service-feature--flip` | `content/is/thjonusta/`, `content/en/thjonusta/` |
| `.value-band .row`, `.value-band .label`, `.value-band p strong` | `.value-band__row`, `.value-band__label`, prose `<strong>` is fine | same templates |
| `.quoter-row .subtotal`, `.quoter-row .remove`, `.quoter-row .subtotal .none` | `.quoter-row__subtotal`, `.quoter-row__remove`, `.quoter-row__subtotal-empty` | `content/is/verdreiknir/`, `content/en/verdreiknir/` |
| `.cta-band .actions` | `.cta-band__actions` | home templates |
| `.btn.primary`, `.btn.ghost`, `.btn span.arrow` | `.btn--primary`, `.btn--ghost`, `.btn__arrow` | many — audit `rg "btn primary\|btn ghost"` |

Generic terms `.row`, `.col`, `.pic`, `.ico`, `.bg`, `.scrim`, `.crumbs`, `.label`, `.lead`, `.tag`, `.body`, `.head`, `.more`, `.copy`, `.meta` should **not survive** as bare class selectors after Stage 7. Each one becomes a block-scoped BEM element. `.container` is the documented exception — it's a layout primitive.

#### Before / After — `.pillar .pic` → `.pillar__media`

**Template before (`content/is/index.njk:67–69`):**

```html
<a class="pillar" href="/thjonusta/">
  <div class="pic" style="background-image: url('/img/server_room.jpg');">
    <div class="ico"><svg viewBox="0 0 24 24" ...>...</svg></div>
  </div>
```

**Template after:**

```html
<a class="pillar" href="/thjonusta/">
  <div class="pillar__media" style="background-image: url('/img/server_room.jpg');">
    <div class="pillar__icon"><svg viewBox="0 0 24 24" ...>...</svg></div>
  </div>
```

**CSS before (`main.css:287–306` → after Stage 5 in `home.css`):**

```css
.pillar .pic {
  height: 260px; position: relative;
  background-size: cover; background-position: center;
  overflow: hidden;
}
.pillar .pic::after {
  content: ""; position: absolute; inset: 0;
  background: linear-gradient(180deg, var(--alpha-scrim-soft) 0%, var(--alpha-scrim-med) 100%);
}
.pillar .pic .ico {
  position: absolute; left: 32px; top: 32px;
  width: 56px; height: 56px;
  background: var(--accent); color: #fff;
  display: grid; place-items: center;
  z-index: 2;
}
.pillar .pic .ico svg {
  width: 28px; height: 28px;
  stroke: #fff; fill: none; stroke-width: 1.6;
}
```

**CSS after Stage 4 + Stage 7 (in `home.css`):**

```css
.pillar__media {
  height: 16.25rem;
  position: relative;
  background-size: cover;
  background-position: center;
  overflow: hidden;
}
.pillar__media::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, var(--alpha-scrim-soft) 0%, var(--alpha-scrim-med) 100%);
}
.pillar__icon {
  position: absolute;
  left: var(--space-8);
  top: var(--space-8);
  width: 3.5rem;
  height: 3.5rem;
  background: var(--accent);
  color: var(--bg);
  display: grid;
  place-items: center;
  z-index: var(--z-content);
}
.pillar__icon svg {
  width: 1.75rem;
  height: 1.75rem;
  stroke: var(--bg);
  fill: none;
  stroke-width: 1.6;
}
```

The descendant chain `.pillar .pic .ico svg` collapses to `.pillar__icon svg` — flat, intent obvious.

### Stage 8 — SVG fill via class (M1)

Today `partials/header.njk:5–6` ships:

```html
<text x="0" y="46" class="bruna" fill="#ee7c1d">BRUNA</text>
<text x="170" y="46" class="pett" fill="#1453a8">þéttingar</text>
```

The `.bruna` and `.pett` classes already exist (`main.css:17–18`) and already set `font-family / font-weight / font-size / letter-spacing`. The footer rule (`main.css:691–692`) demonstrates the pattern: `footer .brand svg.logo .bruna { fill: var(--accent); }` / `footer .brand svg.logo .pett { fill: #ffffff; }`.

**Fix:**

1. Edit `partials/header.njk:5–6` — remove the inline `fill=` attributes:

   ```html
   <text x="0" y="46" class="bruna">BRUNA</text>
   <text x="170" y="46" class="pett">þéttingar</text>
   ```

2. Move `.bruna` / `.pett` into `layout.css` (Stage 1 already moved them there) and add fill:

   ```css
   .bruna {
     font-family: var(--font-body);
     font-weight: var(--fw-bold);
     font-size: 3rem; /* was 48px */
     letter-spacing: var(--ls-tight-2);
     fill: var(--accent);
   }
   .pett {
     font-family: var(--font-body);
     font-weight: var(--fw-semibold);
     font-size: 2.875rem; /* was 46px */
     letter-spacing: var(--ls-tight-1);
     fill: var(--brand-blue);
   }
   ```

3. Footer override (`main.css:691–692` after Stage 1 lives in `layout.css`):

   ```css
   .site-footer .brand__logo .pett { fill: var(--bg); }
   /* `.bruna` keeps the default --accent fill; no override needed */
   ```

   Replace the hard-coded `#ffffff` in the footer override with `var(--bg)`.

Net effect: brand colors live in `tokens.css` only. The wordmark inherits through the cascade. Token edits propagate.

### Stage 9 — Reset dedup (M16)

Compare `reset.css:1–19` with `main.css:21–27` (the `body { line-height; background; -webkit-font-smoothing }` and `button { font-family: inherit; cursor: pointer; }` rules below the duplicate `:root`).

Lines in `main.css:21–27` that are duplicate of `reset.css`:

- `body { line-height: 1.55; }` → `reset.css:6` already sets `line-height: var(--lh-relaxed)`. `--lh-relaxed = 1.55`. Identical. Delete from `main.css`.
- `body { background: var(--bg); }` → `reset.css:10`. Identical. Delete.
- `body { -webkit-font-smoothing: antialiased; }` → `reset.css:11`. Identical. Delete.
- `body { -moz-osx-font-smoothing: grayscale; }` → NOT in `reset.css`. Either move to `reset.css` or leave in `main.css`. Reference site doesn't ship `-moz-osx-font-smoothing`; matches macOS Safari quirk only. Move to `reset.css` alongside `-webkit-font-smoothing` for symmetry.
- `button { font-family: inherit; }` → `reset.css:16` sets `input, button, textarea, select { font: inherit; }`. `font: inherit` is shorthand for `font-family: inherit` plus more — subsumes. Delete from `main.css`.
- `button { cursor: pointer; }` → `reset.css:17` already sets `button { … cursor: pointer; … }`. Identical. Delete.

After dedup, the entire `body { … }` and `button { … }` rules in `main.css` go to zero. The `html { scroll-behavior: smooth }` rule (`main.css:6`) was moved to `layout.css` in Stage 1.

---

## Sequencing & risk

- **G1 (image pipeline) lands first OR concurrently.** If G1 lands first: the home page hero, page-hero, pillar `.pic`, leading `.pic`, article `.pic`, sector-card `.pic`, service-feature `.pic` all switch from `<div class="bg" style="background-image: url(…)">` patterns to `<img>` (or `<picture>`) elements. The CSS rules above (`.hero .bg { position: absolute; inset: 0; background-size: cover; }`) become `.hero__media { … object-fit: cover; … }` and live on the new `<img>` tag. Stage 5 (per-section split) and Stage 7 (BEM rename) must apply on top of G1's markup, not the current `.bg` markup. If G1 is still in flight when Stage 5 starts, rebase Stage 5 onto G1 before merging.
- **Stage 1 is independently mergeable.** No template changes. Pure refactor of CSS file membership + load order.
- **Stages 2, 3, 9 are independently mergeable** and tiny — delete-only PRs.
- **Stage 4 is the longest single stage.** Estimate 1–2 days. Break into sub-PRs by file: one for `responsive.css`, one per banner section in `main.css`.
- **Stage 5 + Stage 6 should ship together** per section. Splitting a section's rules into its own file AND making it mobile-first in the same commit is one logical unit.
- **Stage 7 is the only behavioral risk.** Template class renames must land atomically with CSS class renames per selector — visual baseline at Stage 0 catches misses. Use per-selector commits, not one giant rename PR.
- **Stage 8 fixes M1** independently — can land any time after Stage 1.

---

## Files touched

**Created:**
- `src/assets/css/layout.css` (Stage 1)
- `src/assets/css/home.css` (Stage 5)
- `src/assets/css/services.css` (Stage 5)
- `src/assets/css/sectors.css` (Stage 5)
- `src/assets/css/articles.css` (Stage 5)
- `src/assets/css/about.css` (Stage 5)
- `src/assets/css/quoter.css` (Stage 5)

**Modified:**
- `src/assets/css/tokens.css` (Stage 4 — adds missing tokens)
- `src/assets/css/reset.css` (Stage 9 — absorb `-moz-osx-font-smoothing`)
- `src/assets/css/main.css` (every stage — net loss from 1,540 lines to ~80–120)
- `src/assets/css/nav.css` (Stage 1 — absorbs `nav.primary` rules from `main.css`)
- `src/_includes/layouts/base.njk` (Stage 1, 6 — CSS load chain)
- `src/_includes/partials/header.njk` (Stage 8 — remove inline `fill=`)
- `src/_includes/partials/utility-bar.njk` (Stage 7 — BEM)
- `src/_includes/partials/footer.njk` (Stage 7 — BEM, `<footer>` → `<footer class="site-footer">`)
- `src/_includes/partials/breadcrumb.njk` (already BEM — verify only)
- `src/content/is/index.njk` + `src/content/en/index.njk` (Stage 7)
- `src/content/is/about/index.njk` + `src/content/en/about/index.njk` (Stage 7)
- `src/content/is/thjonusta/index.njk` + `src/content/en/thjonusta/index.njk` (Stage 7)
- `src/content/is/geirar/*` + `src/content/en/geirar/*` (Stage 7)
- `src/content/is/greinar/*` + `src/content/en/greinar/*` (Stage 7)
- `src/content/is/verdreiknir/index.njk` + `src/content/en/verdreiknir/index.njk` (Stage 7)
- `docs/architecture-deviations.md` (Stage 0 — delete §2)

**Deleted:**
- `src/assets/css/responsive.css` (Stage 6)

**Final tree** (target — 11 files, matching the reference):

```
src/assets/css/
├── tokens.css        (canonical design tokens; sole source for colors/spacing/sizes)
├── reset.css         (real reset + skip-link + -moz-osx-font-smoothing)
├── layout.css        (page chrome: container, site-header, site-footer skeleton,
│                      page-hero shell, utility bar, breadcrumb, brand wordmark)
├── nav.css           (nav.primary + .nav-toggle, full responsive)
├── main.css          (shared utilities only: .btn, .pagination, .hl-underline,
│                      .heading-highlight; ~80–120 lines)
├── home.css          (hero, statement, explainer, pillars, leading, customers,
│                      sectors strip, accreds, cta-band)
├── services.css      (services-page, service-feature, value-band, process)
├── sectors.css       (sectors-page, sector-card)
├── articles.css      (articles, article-featured, article-card)
├── about.css         (story, philosophy, team, timeline)
└── quoter.css        (quoter-section, quoter, quoter-row, quoter-total, quoter-customer)
```

---

## Verification

After each stage:

1. `npm run build` succeeds.
2. Compare screenshots at 320 / 768 / 1280 / 1920 viewports to Stage 0 baseline on `/`, `/about/`, `/thjonusta/`, `/verdreiknir/`, `/greinar/`, `/geirar/`. Stages 1–6 + 9 must be pixel-identical. Stage 7 may shift by ±1px in rare cases (BEM specificity changes); flag and fix.
3. `rg "#[0-9a-fA-F]{3,8}\b" src/assets/css/ -g '!tokens.css'` → zero matches after Stage 4.
4. `rg "\b\d+px\b" src/assets/css/ -g '!tokens.css'` → zero matches after Stage 4 (other than legitimate `1px solid var(--line)` borders — decide if border widths are tokenized; reference treats 1px borders as a free literal).
5. `rg "rgba\(" src/assets/css/ -g '!tokens.css'` → zero matches after Stage 4.
6. `rg "fill=\"#" src/_includes/` → zero matches after Stage 8.
7. `rg "mockup-note" src/` → zero matches after Stage 3.
8. `wc -l src/assets/css/*.css` → no file > 400 lines (reference average ≈ 200; quoter.css will be the longest at ~250).
9. CSS chain in `base.njk` matches: `tokens → reset → layout → nav → main → home → services → sectors → articles → about → quoter`.

---

## Acceptance criteria

- [ ] `layout.css` exists; page chrome lives there exclusively.
- [ ] `base.njk` loads CSS in spec order: `tokens → reset → layout → nav → main → per-section`.
- [ ] `main.css` no longer redeclares `:root`. All tokens live in `tokens.css`.
- [ ] `main.css` is < 150 lines and contains only shared utilities.
- [ ] Each home / services / sectors / articles / about / quoter section ships its own CSS file.
- [ ] No raw hex outside `tokens.css`.
- [ ] No raw `rgba()` outside `tokens.css`.
- [ ] No raw `px` outside `tokens.css` (except 1px borders if accepted; document decision).
- [ ] `responsive.css` deleted; every section is mobile-first with `@media (min-width: 64em)` desktop overrides.
- [ ] `.mockup-note` deleted.
- [ ] Reset rules exist only in `reset.css`.
- [ ] `header.njk` has no inline `fill=` on SVG `<text>`. Logo fills derive from `.bruna { fill: var(--accent); }` / `.pett { fill: var(--brand-blue); }`.
- [ ] Footer wordmark uses `var(--bg)` not `#ffffff`.
- [ ] No descendant chain selectors on generic class names (`.row`, `.col`, `.pic`, `.ico`, `.bg`, `.scrim`, `.crumbs`, `.label`, `.lead`, `.tag`, `.body`) survive — all converted to BEM elements scoped by their block.
- [ ] Visual diff against Stage 0 baseline: pixel-identical at all four viewports across all six pages.
- [ ] `docs/architecture-deviations.md` §2 deleted; reference to G12 added.
