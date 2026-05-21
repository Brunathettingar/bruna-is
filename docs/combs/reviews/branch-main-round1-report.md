# bruna-is directives — Review

**Artifact:** 5 new docs on `main` (untracked) — `docs/ARCHITECTURE.md` + `docs/directives/{eleventy-config,content-and-frontmatter,templates-and-layouts,i18n}.md`
**Scope:** 5 files, +1,533 lines
**Reviewers:** 2 agents (`comb:consistency-auditor`, `comb:simplifier`)
**Date:** 2026-05-21

---

## Read

Five new prose documents (1,533 total lines) added under `docs/` for the bruna-is project: four authoritative directive docs codifying rules for the build config, content model, frontmatter schemas, Nunjucks templates/layouts, and i18n, plus one descriptive architecture overview. Intended audience: AI agents and humans. The pre-existing `css-architecture.md` (201 lines) was the style template they were written to match. Future agentic work will treat these as load-bearing — drift between policy and practice misleads downstream work.

## Lens

Ambiguities, blind spots, pattern-breaking against the actual code, reusability gaps, quality issues — specifically: does what's written here match `eleventy.config.js`, the templates, the content tree, and the scripts? Where a directive cites a line number, filename, filter signature, or "every page does X", verify it. Drift between policy and practice is the finding either way.

---

## Findings

### Blind spot — SVG sprite directive contradicts the actual icon pattern
*Source: consistency-auditor + simplifier*
File(s): `docs/directives/templates-and-layouts.md` §8 (lines 155–180); `docs/directives/content-and-frontmatter.md` §7 (service detail table — `icon` field row)

`templates-and-layouts.md` §8 says all icons live as `<symbol id="...">` in `partials/svg-defs.njk` and are referenced via `<use href="#name">`. `content-and-frontmatter.md` §7 reinforces this by describing the service `icon` field as the "Icon symbol id from `svg-defs.njk` (`pillar-fireproofing`)".

Reality: `svg-defs.njk` contains exactly **one** symbol (`logo-wordmark`). Pillar and sector icons live as 8 separate `.njk` partials under `src/_includes/partials/icons/` (`pillar-fireproofing.njk`, `pillar-pipe.njk`, `pillar-ventilation.njk`, `pillar-fireguard.njk`, `sector-commercial.njk`, `sector-energy.njk`, `sector-hospital.njk`, `sector-industry.njk`) and are consumed via `{% include "partials/icons/" + s.data.icon + ".njk" %}` in `src/content/is/index.njk`.

This is the most consequential finding. A future agent following the documented pattern would put a new icon's `<symbol>` in `svg-defs.njk`, set `icon: "pillar-foo"` in frontmatter, and the home page's `{% include %}` lookup would silently 404 — `check-build.js` wouldn't catch it. Fix:

- Rewrite `templates-and-layouts.md` §8 around the actual two-pattern reality: `svg-defs.njk` for the logo-wordmark sprite, `partials/icons/*.njk` for pillar/sector icons consumed by include.
- Correct `content-and-frontmatter.md` §7 to say `icon` is "partial filename under `partials/icons/`, without the `.njk` extension".

### Pattern-break — CSS load order in ARCHITECTURE.md contradicts `base.njk`
*Source: consistency-auditor + simplifier*
File(s): `docs/ARCHITECTURE.md` §10 (line 187)

ARCHITECTURE.md documents: `tokens → reset → layout → nav → blocks → home → services → sectors → articles → about → quoter`.

Actual `src/_includes/layouts/base.njk` lines 35–45: `tokens → reset → layout → nav → blocks → quoter → about → sectors → articles → services → home`.

The page-family files load in **reverse**. This matters for cascade specificity: whichever file loads last wins ties. `home.css` is last in `base.njk`; the doc claims `quoter.css` is last. The pre-existing `css-architecture.md` §1 has the same incorrect order, but it's out of scope here — ARCHITECTURE.md is new and reproduced the falsehood. Pick one as truth (the code is shipping, so probably re-derive policy from `base.njk`) and align both docs.

### Blind spot — CI workflow runs `check-build.js`; directives claim it doesn't
*Source: consistency-auditor*
File(s): `docs/ARCHITECTURE.md` §13 (lines 252–261); `docs/directives/eleventy-config.md` §10 (lines 287–302)

Both docs state: "The deploy workflow does **not** run `check-build.js` today — that's a local pre-push convention", and `eleventy-config.md` §10 even shows `- run: npx @11ty/eleventy` in the workflow YAML.

Reality: `.github/workflows/deploy.yml` line 23 runs `npm run build`, which is `npx @11ty/eleventy && node scripts/check-build.js`. The assertions ARE running in CI. The "If CI-side enforcement becomes important, swap…" sentence already happened — the directives are stale. Update the docs (delete the speculative paragraph; state plainly that CI runs `npm run build` and so check-build executes on every push).

### Pattern-break — Home page frontmatter schema invents `pillars[]`, omits real keys
*Source: simplifier*
File(s): `docs/directives/content-and-frontmatter.md` §7 (Home page table, lines 152–168)

The schema table lists section keys: `heroHeading`, `statement`, `pillars[]`, `leading[]`, `customers[]`.

Real `src/content/is/index.njk` frontmatter contains: `heroHeading`, `statement`, `explainer`, `process`, `leading`, `sectorsCallout`, `customers`. There is **no `pillars[]` key** — the directive invented it. Conversely, `explainer` (nested left/right with chips), `process` (numbered steps), and `sectorsCallout` (label/heading/items) are substantial structured blocks that any future home-page edit will touch — and the directive doesn't mention them.

Either drop the home-page schema table (singletons with this much ad-hoc structure can't be tabularized honestly), or rewrite it against `index.njk`'s actual keys. As written, a reader will look for `pillars[]` and not find it.

### Blind spot — `_data/` module count is wrong (missing `partners.js`)
*Source: simplifier*
File(s): `docs/directives/eleventy-config.md` §8 (lines 238–243); `docs/ARCHITECTURE.md` §3 (line 53)

Both docs say "Two `_data/` modules" and list `meta.js` and `i18n.js`. Actual `src/_data/` contains **three** files: `meta.js`, `i18n.js`, `partners.js`. The directive omits `partners.js` entirely. Either it's real data the docs missed (likely — partner logos for the customers strip on the home page) or it's dead code to delete. Verify and update.

### Blind spot — Orphan partials `schema-about.njk`, `schema-organization.njk` undocumented
*Source: consistency-auditor + simplifier*
File(s): `docs/directives/templates-and-layouts.md` §2 (lines 53–62); `docs/ARCHITECTURE.md` §5 (lines 106–112)

Both docs' partials tables list 7 partials. Actual `src/_includes/partials/` contains **9** — the directives omit `schema-about.njk` and `schema-organization.njk`. `grep -rl "schema-organization\|schema-about" src/` returns no matches; both are orphans.

`templates-and-layouts.md` §7 (JSON-LD blocks) invites readers to add new structured-data types, but doesn't mention the existing schema partials. Either delete them (cleanup) and confirm via grep, or wire them in and add to the partial inventory.

### Ambiguity — "Required" frontmatter column conflates three different consumers
*Source: consistency-auditor + simplifier*
File(s): `docs/directives/content-and-frontmatter.md` §7 (service, sector, article tables)

Multiple fields are marked `Required: yes` (`featured`, `order`, `number`, `category`, `icon` on services) but the actual `service.njk` layout reads **none** of them. They're consumed by:
- `eleventy.config.js` collection filters (`featured`, `order`)
- The home page's featured-services loop (`icon`, `number`, `category`)
- The service layout itself (`title`, `image`, `summary`, `insightStrong`, `insight`, `bullets[]`)

Meanwhile `templates-and-layouts.md` §1 correctly omits the collection-filter fields from `service.njk`'s required-frontmatter table. The two directives don't agree on what "Required" means for the same field.

Two cleaner shapes:
- Split the §7 column into "Required by layout" / "Required by collection / consumer".
- Or drop "Required" as a column and switch to narrative paragraphs that name *where* each field is consumed.

The current shape will train contributors to copy-paste fields they don't actually need.

### Blind spot — About-subcollection directory-data shape is much simpler than documented
*Source: consistency-auditor + simplifier*
File(s): `docs/directives/content-and-frontmatter.md` §4 ("Required keys for a collection"), §7 (About page block)

§4's "Required keys" mandate `tags`, `layout`, `bodyClass`, `permalink`, `eleventyNavigation.parent`. The about-subcollection `.json` files (`milestones.json`, `principles.json`, `team.json`) contain **only** `tags` and `permalink: false`. No layout, no bodyClass, no parent — because these are data-only collections that suppress page emission.

§7 acknowledges they "exist only to populate the about page's lists" but never closes the loop on the directory-data schema exception. A reader extending the about page or adding a new "data-only" subcollection has no documented pattern to follow.

Add a §4 carve-out: "Data-only subcollections (no rendered detail pages) use a minimal shape — `tags` + `permalink: false`. The about-page subcollections (`milestones`, `principles`, `team`) are the canonical example."

### Pattern-break — New directives are 25–75% longer than the gold standard
*Source: simplifier*
File(s): all four new directives

| Doc | Lines | Δ vs gold |
|---|---|---|
| `css-architecture.md` (gold standard) | 201 | — |
| `content-and-frontmatter.md` | 318 | +58% |
| `eleventy-config.md` | 350 | +74% |
| `templates-and-layouts.md` | 252 | +25% |
| `i18n.md` | 278 | +38% |

`css-architecture.md` gets to 201 lines by stating one rule per subsection in two sentences, showing one canonical example per rule, and leaving derived behavior implicit. The new directives consistently add tables for things that could be sentences, restate the rationale of cross-doc rules, and enumerate hypothetical futures. Concrete trim targets (in addition to specific findings below):

- `eleventy-config.md` §11 "ESM and config style" (lines 304–313): four bullets restating "the config is plain ESM JavaScript." Replace with one sentence.
- `eleventy-config.md` §7 passthrough section (lines 215–234): the `.nojekyll` rationale is 22 words for a fact that fits in 8.
- `i18n.md` §5 "One-way fallback" (lines 99–110): nine lines and a numbered list to say "Missing EN → fall back to IS. Missing IS → raw key + warn." Two sentences.
- `templates-and-layouts.md` §10 "Nunjucks idioms" (lines 196–221): the `Avoid:` list duplicates §3 (no logic), §4 (`| safe`), §1 (layout chain depth).

Cite `plugin:simplicity.md` — over-systematization is the rot vector for prose policy.

### Reusability gap — Image pipeline rule duplicated across three docs
*Source: simplifier*
File(s): `docs/directives/eleventy-config.md` §5 (lines 135–138); `docs/directives/content-and-frontmatter.md` §8 (line 249); `docs/ARCHITECTURE.md` §6 (line 276)

"Write `<img>`, don't write `<picture>` by hand" appears in three places. Same with "absolute image paths from `/img/`" (in `eleventy-config.md` §5 and `content-and-frontmatter.md` §8). Pick one home (`eleventy-config.md` §5 owns the pipeline) and let the others cross-reference.

### Reusability gap — `requireLang` rationale stated in 5 places
*Source: simplifier*
File(s): `docs/directives/i18n.md` §10 + Enforcement appendix; `docs/directives/templates-and-layouts.md` §1 (line 23); `docs/directives/eleventy-config.md` §4 (line 99); `eleventy.config.js:155-167` (in-code comment, not under review)

Five places explain "missing `lang` → build error". The inline code comment is the right home. Each directive should link to the function, not restate the justification.

Same shape applies to the plugin-order rationale (the `i18nOverride`-must-be-last point): stated in `eleventy-config.md` §2 (lines 24–53) three times within that section alone, plus again in `i18n.md` §2–§3, plus the inline code comment.

### Quality concern — `pathPrefix` migration runbook is speculative future-proofing
*Source: simplifier*
File(s): `docs/directives/eleventy-config.md` §3 (lines 83–88)

The "If the project moves to an apex domain" three-step runbook is documentation for a migration that may never happen. Cite `plugin:scope-discipline.md` and `plugin:simplicity.md` — directives describe current contracts; speculative migration notes belong elsewhere (a `MIGRATIONS.md` if worth keeping, otherwise nowhere).

### Quality concern — ARCHITECTURE.md §15 "Upstream documentation" is a 22-link dump
*Source: simplifier*
File(s): `docs/ARCHITECTURE.md` §15 (lines 280–323)

22 upstream URLs across four subsections — many never get cited from anywhere else; nine are stable enough to never be needed (MDN responsive images, Schema.org full type hierarchy, ARIA Authoring Practices, etc.). Either drop entirely (the framework's docs are one click away) or trim to ≤5 links load-bearing for this project's quirks (`eleventy-plugin-i18n` upstream because of the override; `eleventy-img` transform docs because of the dual pipeline).

### Ambiguity — "≥ 5 structural lines" partial threshold is unverifiable
*Source: simplifier*
File(s): `docs/directives/templates-and-layouts.md` §2 (lines 36–38); cross-cited in `docs/ARCHITECTURE.md` §14 (line 274)

What counts as a "structural line"? Empty lines? Close tags? Whitespace-trim controls? Inline Nunjucks expressions? `cta-band.njk` is 17 lines if you count everything and ~8 if you exclude blanks and `endif`s — the threshold doesn't gate anything. Two cleaner alternatives:

- Drop the line-count rule entirely: "Partial when used in ≥ 2 places. Inline otherwise."
- Or use a semantic test: "Partial when the markup has a name that survives outside the context that uses it (`cta-band`, `seo-meta`, `breadcrumb`). Inline a one-off region even if long."

### Ambiguity — "Defensive on input" filter rule contradicted by its own exception
*Source: simplifier*
File(s): `docs/directives/eleventy-config.md` §4 (lines 103–106)

> "Defensive on input. Filters that take dates check `if (!date) return ""`… Don't throw on missing data unless the missing data is a contract violation (which `requireLang` is)."

The rule reads as a general principle ("don't throw") but the exception (`requireLang`) swallows it — `requireLang` is the only non-date filter where the question arises. Either drop the exception clause and say plainly "If a missing value indicates a build-config bug rather than a data error, throw" with `requireLang` as the example, or drop the whole rule (the implementations of the existing filters are short enough to read directly).

### Ambiguity — "Every public page uses `layouts/page.njk`" doesn't address sitemap / 404 / robots
*Source: consistency-auditor*
File(s): `docs/directives/templates-and-layouts.md` §1

`src/content/is/404.njk`, `sitemap.njk`, and `robots.njk` (and EN equivalents) are public outputs but the layout-chain table omits them. Either add a row ("404 / sitemap / robots — no layout, render templates directly") or qualify "every public page" to "every HTML *content* page".

### Blind spot — `cta.primaryLabel` / `cta.secondaryLabel` emit without `| safe`; asymmetry undocumented
*Source: consistency-auditor*
File(s): `docs/directives/i18n.md` §8; `docs/directives/content-and-frontmatter.md` §11; `src/_includes/partials/cta-band.njk:8, 11`

`cta-band.njk` renders `cta.heading` with `| safe` (allowing HTML highlights — and the listing pages use this) but renders `cta.primaryLabel` / `cta.secondaryLabel` without `| safe`. The directive's §11 permits HTML inside frontmatter strings for emphasis/highlights/line breaks, but doesn't acknowledge that this only works on `cta.heading`, not the labels. A reader writing `primaryLabel: "Fá <strong>verðmat</strong>"` would see escaped output.

Either document the asymmetry (heading allows HTML, labels do not) or normalize the partial.

### Blind spot — Locale parity rule doesn't acknowledge `permalink: false` exemption
*Source: consistency-auditor*
File(s): `docs/directives/i18n.md` §9

"Every IS page **must** have an EN sibling at the mirrored path." Enforced by `check-build.js` parallel-slug check. But the about-subcollection `.md` files have `permalink: false` and emit no HTML, so parity is trivially satisfied. A reader could be confused why the seven `team/*.md` files don't trigger the warning. Add a one-liner: "Pages with `permalink: false` are exempt — they emit no HTML, so there's nothing to pair."

### Blind spot — `eleventyComputed.ogImage` fallback to `meta.ogImage` not documented
*Source: consistency-auditor*
File(s): `docs/directives/content-and-frontmatter.md` §9; `docs/directives/templates-and-layouts.md` §1

§9 says leaf layouts "may set `eleventyComputed.ogImage: "{{ image }}"`". For `.njk` pages (home, listings, about, quoter) that don't set `image` and don't set `eleventyComputed.ogImage`, what happens? They fall through to `meta.ogImage` (= `/assets/img/og-default.jpg`) — visible in `seo-meta.njk:17`. The directive should surface this so a reader doesn't have to reverse-engineer the chain: "If neither `ogImage` nor `image` is set, the OG image falls back to `meta.ogImage`."

### Quality concern — Line-number citation "lines 85–116" is brittle
*Source: consistency-auditor*
File(s): `docs/directives/i18n.md` §3 (line 60); `docs/directives/eleventy-config.md` §2 references same range

Citation is currently correct, but line ranges in long-lived prose drift on every refactor. The override is the only inline plugin in `eleventy.config.js`, so it's unambiguous by name. Cite by function name (`i18nOverride`) instead of line range.

### Quality concern — "Three runtime npm dependencies plus `eleventy-plugin-i18n`" oddly counts to 4
*Source: consistency-auditor*
File(s): `docs/directives/eleventy-config.md` line 5

`package.json` has exactly four runtime dependencies. The "three plus one" phrasing implies `eleventy-plugin-i18n` is somehow special when it's a peer of the others. Replace with "Four runtime npm dependencies — see `package.json`."

### Quality concern — `eleventy-config.md` §6 trailing `...` in the for-loop example misleads
*Source: consistency-auditor*
File(s): `docs/directives/eleventy-config.md` §6 (lines 189–197)

The example shows the loop body with `featuredServices${suffix}` and a comment `// featuredSectors${suffix}, featuredArticle${suffix} ...`. The `...` implies more featured-collection families exist beyond the three shown. They don't. Either spell out all three explicitly, or drop the trailing `...`.

### Quality concern — `i18n.md` §3 lodash.get string mis-quoted
*Source: consistency-auditor*
File(s): `docs/directives/i18n.md` §3 (line 62)

`lodash.get(translations, '[${key}][${locale}]')` is shown with single quotes — JS single-quoted strings don't interpolate. The upstream intent is a backtick template literal. Re-render as `` lodash.get(translations, `[${key}][${locale}]`) ``.

### Quality concern — `templates-and-layouts.md` §1 `lang` row reverses dependency
*Source: consistency-auditor*
File(s): `docs/directives/templates-and-layouts.md` line 23

Phrasing "`lang` (via `requireLang`)" implies `lang` is required *by* `requireLang`. Actually `lang` is required *by the page*; `requireLang` is the throw-on-undefined guard. Rephrase: "`lang` (required — `requireLang` throws if absent)".

### Quality concern — Article schema doesn't cross-reference §10 `eleventyComputed`
*Source: consistency-auditor*
File(s): `docs/directives/content-and-frontmatter.md` §7 (article table) ↔ §10

Articles in `src/content/is/greinar/*.md` do not declare `eleventyComputed.ogImage` — the leaf layout (`article.njk`) sets it at the layout level. §7's article table doesn't reference §10, so a reader auditing article frontmatter could think `eleventyComputed.ogImage` should appear in the `.md` (it shouldn't). Add a one-line note cross-linking §10.

### Quality concern — ARCHITECTURE.md §7 introduces "Two families" but lists four
*Source: consistency-auditor*
File(s): `docs/ARCHITECTURE.md` §7 (lines 130–141)

Intro says "Two families" (`nav*` and the featured collections), then the table lists four (`nav*`, `featuredServices*`, `featuredSectors*`, `featuredArticle*`). Minor but rot-prone on skim-reading. Either say "two families" and group `featured*` as one row, or say "four collection families" and update the table title.

### Quality concern — "Approximate ratio: 50+ `.md` files vs ~12 `.njk` files" will drift
*Source: simplifier*
File(s): `docs/directives/content-and-frontmatter.md` line 50

Point-in-time count that doesn't shape any decision — the table preceding it already gives the rule. Drop the sentence.

---

## Summary

24 findings consolidated from two reviewers, deduplicated. Highest impact:

1. **SVG/icon pattern is factually wrong** — the directives describe a `<symbol>` sprite that doesn't exist for pillar/sector icons; the actual pattern uses `partials/icons/*.njk`. A future agent following the doc would write non-working code.
2. **CSS load order in ARCHITECTURE.md contradicts `base.njk`** — page-family files load in reverse from what's documented.
3. **CI runs `check-build.js`; directives say it doesn't** — direct policy/practice contradiction in two files.
4. **Home page schema invents `pillars[]`**, omits real keys (`explainer`, `process`, `sectorsCallout`).
5. **`_data/` modules undercount** — `partners.js` is missing from the inventory.
6. **About-subcollection pattern is simpler than documented** — directives prescribe a 5-key schema; reality is `tags` + `permalink: false`.

After those: ambiguity in the "Required" frontmatter columns, orphan partials (`schema-*`) undocumented, cross-directive redundancy (image pipeline rule in 3 places, `requireLang` rationale in 5 places, plugin-order rationale in 3 places within one section), and pattern-break against the gold standard (new directives are 25–75% longer than `css-architecture.md`).

The directives are largely correct in spirit — they just over-spend prose getting there and contain enough small factual errors to erode trust on first reading. Suggested fix order: (1) the six correctness items, then (2) the ambiguity and blind-spot items, then (3) a density pass against `css-architecture.md` as the target.
