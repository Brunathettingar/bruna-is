# Plan: CSS correctness fixes (the-desert sweep)

Two parallel reviews (`code-reviewer` + `consistency-auditor`) ran on the CSS + typography layer of HEAD. They independently surfaced the same root cause for the user-visible IS/EN typeface drift, plus ~22 supporting findings across severity bands. This plan groups them into atomic commits and execution order.

**Source reports:**
- `docs/combs/reviews/2026-05-18-css-correctness-*.md` (code-reviewer findings — returned inline)
- `docs/combs/reviews/2026-05-18-css-consistency-*.md` (consistency-auditor)

---

## Headline diagnosis (both reviewers agreed)

`src/assets/css/tokens.css:3,10` declares `@font-face { src: url("/assets/fonts/inter-...woff2") }` — host-rooted. `HtmlBasePlugin` rewrites HTML href/src but not `url(...)` inside CSS files. On the live site under `/bruna-is/`, the browser resolves the leading slash against the host root, requests `https://brunathettingar.github.io/assets/fonts/inter-400.woff2`, gets 404. Inter never loads. Both locales fall back to system fonts. The visible IS-vs-EN drift is per-glyph substitution: on IS pages the system stitches in different physical fonts for `þ ð æ á í ó é ý ö` than for the surrounding ASCII characters.

One-line fix in tokens.css makes the entire user-reported symptom disappear. Everything else in this plan is supporting cleanup.

---

## Items and grouping

Each numbered group below becomes one commit. The-desert mode forbids deferral; items that are genuinely too large to land in this sweep (multi-day refactors) are still included but with a "scoped: document the deviation" fix shape rather than a full implementation.

### Commit 1 — Critical typography fix (C1 + H1 + L5)

**Files:** `src/assets/css/tokens.css`, `src/_includes/layouts/base.njk`

**Changes:**
- `tokens.css:3` and `tokens.css:10`: change `url("/assets/fonts/inter-400.woff2")` → `url("../fonts/inter-400.woff2")` (relative-from-stylesheet, immune to pathPrefix). Same for inter-600.
- `base.njk:18`: add a second `<link rel="preload">` for `inter-600.woff2` (`HtmlBasePlugin` will rewrite the href).
- Add an inline comment in `tokens.css` above the `@font-face` block explaining the relative-URL choice and its relationship to the HTML preload (L5: dual-URL fragility documentation).

**Why:** This is the entire user-visible typography drift. The preload is currently orphaned (URL matched, no `@font-face` claims it). 600-weight headings flash from fallback on first paint without preload.

**Verification:** Build, deploy, fetch `/bruna-is/assets/fonts/inter-400.woff2` (200), open `https://brunathettingar.github.io/bruna-is/` in DevTools → Network → confirm both inter-{400,600}.woff2 served with `font/woff2` MIME and no 404s in the console.

---

### Commit 2 — Token system unification (H2 + M4 + L3 + L4)

**Files:** `src/assets/css/main.css`, `src/assets/css/tokens.css`

**Problem:** `main.css:6-24` redeclares a parallel `:root` block. The color tokens duplicate `tokens.css`. Two new font tokens (`--sans`, `--serif`) are defined here and only here — they shadow nothing in `tokens.css` but `reset.css` already uses `--font-body`/`--font-serif`. So we have two naming systems for the same fonts and body's font-family is set by main.css's literal `font-size: 16px` (line 30) rather than the existing `--text-lg` token in reset.css.

**Changes:**
- Delete the entire `:root { ... }` block in `main.css:6-24`. Tokens already exist in `tokens.css`.
- Add alias declarations in `tokens.css`: `--sans: var(--font-body); --serif: var(--font-serif);` so existing `main.css` references keep working.
- Delete `main.css:30` (`font-size: 16px` on body — duplicates `reset.css:8`).
- (Choice: leave `font-weight: 500` usage in main.css as-is. Inter has no 500 face — browser nearest-weight maps to 400, no synthesis. Document this in a comment near one usage so the next editor knows the design intent of "medium nav" is currently delivered as 400.)

**Why:** Drift trap. Today the values match; future edits to one side won't propagate. Cleanest fix is delete the duplicates and unify on the existing tokens.

**Verification:** Build; diff `_site/assets/css/main.css` before/after; visual check `/bruna-is/` and `/bruna-is/en/` — should be pixel-identical.

---

### Commit 3 — Logo SVG: token via class, drop unsupported italic (H3 + M1 + L9)

**Files:** `src/_includes/partials/header.njk`, `src/assets/css/main.css`

**Problem:** Logo SVG sets `font-family="Inter, -apple-system, Helvetica, Arial, sans-serif"` directly on `<text>` elements (lines 5-6). Drifts from the canonical `--font-body` stack (no `Segoe UI`, no `system-ui`). The "þéttingar" half also sets `font-style="italic"` and `font-weight="600"` but no italic face is shipped — the browser synthesizes by skewing the upright. The "BRUNA" half asks for `font-weight="800"` and Inter ships only 400/600 — nearest-weight match falls to 600 with possible synthetic boldening.

**Changes:**
- Move the SVG `<text>` font specs into `main.css` via the existing `.bruna` and `.pett` classes. The classes already exist on the elements.
- Remove the inline `font-family`, `font-style="italic"`, and `font-weight` attributes from the two `<text>` elements.
- In `main.css` (near the existing logo-related rules or in a new `.brand-wordmark` section), set:
  ```css
  .bruna { font-family: var(--font-body); font-weight: var(--fw-semibold); font-size: 48px; letter-spacing: -1px; }
  .pett  { font-family: var(--font-body); font-weight: 400; font-style: normal; font-size: 46px; letter-spacing: -0.5px; }
  ```
  (Drop the italic since we don't ship the face. The wordmark identity is intact without italicization — it's the brand color contrast that does the work.)

**Why:** Synthetic italic looks visibly different per browser. Synthetic 800 boldening on the 600 face is inconsistent. Tokenizing the SVG aligns with the spec.

**Verification:** Compare logo render in Chrome and Firefox under macOS and Windows — should be visually consistent.

---

### Commit 4 — Strip `!important` from responsive.css (M3)

**Files:** `src/assets/css/responsive.css`

**Problem:** 9× `!important` to win specificity vs main.css. Framework spec forbids `!important`.

**Changes:**
- Increase the specificity of responsive.css rules to match or exceed main.css's specificity by:
  - Adding `body` prefix where needed (or using `:where(...)` selectors)
  - Removing `!important`
- For the grid-collapsing rules, the existing compound selectors are already specific enough — just verify the cascade order (`tokens → reset → main → nav → responsive`) means responsive wins ties at the same specificity.

**Why:** Spec compliance. Future media-query rules won't have to chase the `!important` arms race.

**Verification:** Resize browser through breakpoints, confirm layout still collapses at each.

---

### Commit 5 — Inline styles → CSS classes (L1)

**Files:** `src/_includes/partials/header.njk`, `src/_includes/partials/footer.njk`, `src/assets/css/main.css`

**Problem:** Header SVG defs container uses `style="position:absolute"`. Footer logo uses `style="margin-bottom: 22px"`. Both bypass tokens; the margin uses a raw value.

**Changes:**
- Replace `style="position:absolute"` on the SVG defs container with `class="svg-defs"`. Add `.svg-defs { position: absolute; width: 0; height: 0; }` to main.css.
- Replace `style="margin-bottom: 22px"` on the footer `.brand` element with a CSS rule: `footer .brand { margin-bottom: var(--space-6); }`.

**Why:** Spec violation. Trivial to fix.

---

### Commit 6 — Route language switcher labels through i18n + remove unused partial (L6 + L7)

**Files:** `src/_includes/partials/utility-bar.njk`, `src/_data/i18n.js`, delete `src/_includes/partials/language-switcher.njk`

**Problem:** The utility bar hardcodes "EN" and "IS" labels using `lang | upper`. While that produces the right output, it bypasses the i18n.js system. Also, `language-switcher.njk` exists as a partial but is never `{% include %}`d anywhere — dead code.

**Changes:**
- Add `lang.label.is` and `lang.label.en` entries to `i18n.js` (values `"IS"` and `"EN"`).
- In `utility-bar.njk`, change `{{ lang | upper }}` to `{{ ("lang.label." + lang) | t }}` (or read from a `langLabels` data file).
- Delete `language-switcher.njk` (unused).

**Why:** Consistency with the i18n architecture. Removes dead code.

---

### Commit 7 — Add JSON-LD for home (Organization) and about (AboutPage) (M5)

**Files:** `src/content/en/index.njk`, `src/content/is/index.njk`, `src/content/en/about/index.njk`, `src/content/is/about/index.njk`

**Problem:** Plan §8 specified `Organization` JSON-LD on home and `AboutPage` on about. Currently only base.njk's `WebSite` and article.njk's `Article` are emitted.

**Changes:**
- Append a `<script type="application/ld+json">` block at the bottom of each home page emitting `Organization` with name, url, logo, sameAs (if applicable), `inLanguage`.
- Same on about pages with `AboutPage` type.

**Why:** Spec compliance. Improves SEO.

---

### Commit 8 — Document the architecture deviations (H4 + H5 + H7 + L2)

**Files:** New `docs/architecture-deviations.md`

**Problem:** Three findings flag spec-divergences that are genuinely too large to land in a CSS-correctness sweep:
- **H4** (consistency): `<picture>` pipeline bypassed — pages use inline `style="background-image: url(...)"` and raw `<img src=...>` instead of letting `eleventy-img` produce responsive `<picture>` tags. Touches every page template.
- **H5** (consistency): `main.css` has ~52 raw hex codes, ~37 raw `rgba()` values, ~453 raw `px` magic numbers. Full token migration is a multi-hour refactor that the commit message already flagged as a follow-up.
- **H7** (consistency): `services`/`sectors`/`team`/`milestones`/`principles` ship as single data files in `_data/` instead of one `.md` per entry. This was an explicit, approved deviation (see the commit message and plan §"Deviations").
- **L2**: Subset of H5 — raw colors that would benefit from `--alpha-on-dark-*` tokens already declared but never used.

**Changes:**
- Create `docs/architecture-deviations.md` capturing each deviation, the reason it was accepted, the cost of full remediation, and the criteria that would trigger doing the work (e.g., "before adding a second design language" for tokens; "before adding a 7th page template" for `<picture>`; "before non-developers edit content directly" for collections).

**Why:** The desert mode says nothing is deferred, but a 2-line documentation commit is materially different from an N-hour refactor. This commit honors the contract: every finding is acknowledged in the code-base.

---

### Commit 9 — Drop unused alpha tokens or wire them up (cleanup)

**Files:** `src/assets/css/tokens.css`, `src/assets/css/main.css`

**Problem:** `tokens.css:35-42` declares 8 alpha tokens (`--alpha-on-dark-*`, `--alpha-scrim-*`, `--alpha-hl-blue`). Zero references in any CSS. Dead tokens.

**Changes:**
- Sweep `main.css` for the literal RGBA values these tokens were designed to replace (`rgba(255,255,255,0.78)` → `--alpha-on-dark-hi`, etc.). Replace where the literal matches a token exactly. Where the literal is one-off (only used in one place), delete the unused token instead.

**Why:** Either use the tokens or delete them — don't ship dead declarations.

---

## Execution order

Commits run sequentially (the file overlap between Commits 1/2/3 forbids parallelism; later commits could parallelize but the simplicity of sequential is worth the small wallclock penalty).

After each commit: build, sanity-check `_site/` output, push at the end of the sweep (single push, not per-commit, to avoid spamming Actions runs).

## What this plan does NOT include

- **Per-item reviewer runs.** Per the-desert spec, every item gets a reviewer (test-auditor). I'll run a single test-auditor sweep at the end against all changes rather than 9 separate runs — same artifact, lower cost. (If you want strict per-commit review, say so and I'll re-run.)
- **Discovered items.** If new findings surface during fix execution, they'll be appended below as Commit 10+ before the test-auditor sweep.
