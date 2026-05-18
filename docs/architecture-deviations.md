# Architecture deviations

Three places where the current Eleventy port diverges from the framework specs at `docs/instructions/`. Each was either an explicit, pre-approved deviation (recorded in commit history and the approved plan at `.planning/`/`~/.claude/plans/`) or surfaced by the comb consistency audit in `docs/combs/reviews/`. This file records the deviation, why it was accepted, and the criteria that would justify the work of removing it.

## 1. `<picture>` pipeline bypassed for hero / pillar / sector backgrounds

**Spec:** `FRAMEWORK-PORT-PROMPT.md` mandates `@11ty/eleventy-img` transform every `<img>` into responsive `<picture>` with AVIF/WebP/JPEG sources at multiple widths, and forbids hand-written `<picture>` markup.

**Current state:** The framework plugin is installed and configured, but most large images on the site are decorative backgrounds set via inline `style="background-image: url('/img/...')"` on the hero, page-hero, pillar `.pic`, sector card, service-feature `.pic`, leading `.pic`, and article-card `.pic`. CSS backgrounds can't be transformed by `eleventy-img`. There are roughly 34 such occurrences across the page templates. There are no `<img>` elements on the singleton pages today.

**Why it was accepted:** The mockup itself uses CSS backgrounds for these decorative slots. Porting them to `<img>` requires reshaping every section's HTML and CSS — the hero's `.bg` + `.scrim` overlay structure, for instance, is built around a background-image rather than a foreground `<img>`. This is a multi-day visual restructuring.

**Cost of remediation:** Multi-day. Touches every section template, every section's CSS rules, and re-tests visual fidelity at desktop and mobile.

**Criteria that would trigger doing the work:**
- Image bandwidth becomes a measurable issue on slow connections (track via `largestContentfulPaint` in field data).
- Lighthouse Performance score on `/` or `/en/` drops below a target (e.g., 90 mobile).
- Mobile-first redesign reshapes the hero/pillar/sector grids anyway.

Until any of those trip, the current background-image setup ships acceptable visual quality and the file size of the hero JPEGs (200-400KB) is tolerable for a marketing site.

## 2. `main.css` is the mockup CSS verbatim — many raw values

**Spec:** `FRAMEWORK-PORT-PROMPT.md` rule: "Downstream CSS **must** reference tokens — no raw hex codes, no magic px values, outside `tokens.css`."

**Current state:** `main.css` was copied from `mockup/styles.css` near-verbatim. The 15 brand color tokens declared in `tokens.css` are referenced via `var(...)`, but `main.css` still contains roughly:
- ~50 raw hex codes (mostly fall-throughs from the mockup palette)
- ~37 raw `rgba()` values where `--alpha-on-dark-*` and `--alpha-scrim-*` tokens already exist in `tokens.css` but go unused
- ~450 raw `px` magic numbers (font sizes, spacing, gap values) instead of the `--text-*`, `--space-*`, `--lh-*`, `--ls-*` token scales

**Why it was accepted:** The initial commit at `a51874b` explicitly flagged token migration as a known follow-up: *"Token replacement of every raw value in the CSS is not complete — the mockup CSS was copied wholesale with color tokens already in place, but font sizes / spacings / line-heights remain raw px in many places. Token-only refactor is a follow-up."* The approved plan §7 acknowledged this deviation.

**Cost of remediation:** Multi-hour, low-risk. Mostly find-and-replace with judgment calls on which raw value maps to which token step. The token scales in `tokens.css` were designed to cover the mockup's values.

**Criteria that would trigger doing the work:**
- Adding a second design language (dark mode, alternate brand) that would require swapping tokens — impossible while values are raw.
- A second designer or developer needs to edit the CSS — token names communicate intent (`--text-3xl`) better than raw values (`38px`).
- Lighthouse Best Practices flags accidental inconsistencies the tokens would have caught.

## 3. `services` / `sectors` / `team` / `milestones` / `principles` ship as `_data/` files, not Markdown collections

**Spec:** `FRAMEWORK-PORT-PROMPT.md` Part B Collections section: each repeating content shape becomes a directory under `src/content/<collection>/` with one `.md` per entry plus a `<collection>.json` directory data file.

**Current state:** Only `articles` is a true Markdown-paginated collection (10 detail pages generated under `/greinar/<slug>/` and `/en/greinar/<slug>/`). The other five "collections" listed in the approved plan §2 ship as single JS data files under `src/_data/`:
- `_data/services.js` (7 entries with `is`/`en` parallel fields)
- `_data/sectors.js` (8 entries)
- `_data/team.js` (7 entries)
- `_data/milestones.js` (7 entries)
- `_data/principles.js` (6 entries)

The home page renders four hardcoded pillar cards inline rather than iterating from a `services` collection with `featured: true` filter. There are no detail URLs for these collections — entries are rendered inline on their respective listing pages.

**Why it was accepted:** The approved plan at `.planning/plans/read-these-three-files-eager-feather.md` §7 (Decisions confirmed) and the initial commit's "Deviations to flag" section explicitly recorded this choice. The reasoning: each collection's entries render on exactly one page; data-template separation is preserved (frontmatter ≅ data file with `lang`-keyed values); file count is 5 vs ~75; entries don't need individual URLs.

**Cost of remediation:** Moderate. ~50 `.md` files to create across 5 collections × 2 locales, plus 5 directory data files × 2 locales, plus refactored listing templates that iterate `collections.<name>` instead of `data.js`. The four dead `featuredServices*` / `featuredSectors*` custom collections in `eleventy.config.js` would also need to be either deleted or wired up.

**Criteria that would trigger doing the work:**
- Non-developers (e.g., the business team or a content editor) need to edit content directly without learning JavaScript syntax. Markdown frontmatter is a more accessible authoring surface than JS objects.
- A second authoring tool (CMS, Decap, Sanity) needs to write into the site — they speak Markdown, not JS modules.
- One of the collections grows past ~15 entries, at which point one-file-per-entry edit ergonomics dominate.

Until then, the single-data-file shape is materially easier to ship and maintain — a single edit per locale change vs. N file touches.
