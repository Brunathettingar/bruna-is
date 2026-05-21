# Revise bruna-is directives

**Target specs (5 files):**
- `docs/ARCHITECTURE.md`
- `docs/directives/eleventy-config.md`
- `docs/directives/content-and-frontmatter.md`
- `docs/directives/templates-and-layouts.md`
- `docs/directives/i18n.md`

**Source report:** `docs/combs/reviews/branch-main-round1-report.md`
**Revisions:** 24 (8 blind spots, 4 pattern-breaks, 4 ambiguities, 2 reusability gaps, 6 quality concerns — all 24 findings have actionable revisions; one finding spans multiple files and is split into sub-revisions where useful)

**How to read this file.** Each section names a target file + section + verbatim text, then gives the exact replacement. Apply mechanically. After all revisions, run `npm run build` from the project root — directives are docs-only, so the build must remain green and `_site/` must be unchanged.

**Density target.** `docs/directives/css-architecture.md` (201 lines) is the gold standard. Several revisions explicitly trim prose to approach it. The total length of the four revised directives should drop ~25% from the current 1,199 lines.

---

## 1. Blind spot — SVG sprite directive contradicts the actual icon pattern

### 1a. `docs/directives/templates-and-layouts.md` §8 (lines 155–180)

**Current text:**

> ## 8. The SVG sprite pattern
>
> `partials/svg-defs.njk` is included once at the top of `<body>` in `base.njk`. It contains a single off-screen `<svg class="svg-defs">` element with `<defs>` holding every icon symbol referenced by the site:
>
> ```njk
> <svg class="svg-defs"><defs>
>   <symbol id="logo-wordmark" viewBox="0 0 2500 375">...</symbol>
>   <symbol id="pillar-fireproofing" viewBox="...">...</symbol>
>   <!-- one symbol per inline icon -->
> </defs></svg>
> ```
>
> Templates reference the symbol via `<use href="#...">`:
>
> ```njk
> <svg class="logo" viewBox="0 0 2500 375" aria-hidden="true"><use href="#logo-wordmark"/></svg>
> ```
>
> Rules:
>
> - **One source of truth per icon.** Never paste the same icon path inline in multiple templates. Add the symbol to `svg-defs.njk` and reference it.
> - **`viewBox` lives on the `<symbol>`, `<svg>` is the consumer.** Consumers may set a different `viewBox` only when intentionally cropping; otherwise use the symbol's.
> - **`fill`/`stroke` are inherited.** Use semantic classes (`.bruna { fill: var(--accent); }`) on `<svg>` or `<g>` containers in CSS, not inline `fill="…"` on the symbol.
> - **`aria-label` on the consumer when the icon conveys meaning; `aria-hidden="true"` when decorative.**
>
> When adding a new icon, add the `<symbol>` to `svg-defs.njk` with a `pillar-`/`icon-` prefixed `id`, then reference it with `<use href="#...">`. Do not introduce a separate `<img>` for icons.

**Revision:** Replace the entire §8 above with this:

```markdown
## 8. Inline SVG — two patterns

Inline SVG ships through two parallel mechanisms. Use the right one for the role.

### Pattern A — `<symbol>` sprite for the wordmark

`partials/svg-defs.njk` is included once at the top of `<body>` in `base.njk`. It contains one off-screen `<svg>` with a `<defs>` block holding the brand wordmark as a `<symbol id="logo-wordmark">`. Consumers reference it via `<use href="#logo-wordmark"/>`:

```njk
<svg class="logo" viewBox="0 0 2500 375" aria-hidden="true"><use href="#logo-wordmark"/></svg>
```

This sprite mechanism is the right answer for a single shape reused on every page (header, footer, og:image fallback). The wordmark is currently the only inhabitant.

### Pattern B — per-icon partial for pillar and sector icons

Pillar and sector icons each live in their own file under `src/_includes/partials/icons/` (`pillar-fireproofing.njk`, `pillar-pipe.njk`, `pillar-ventilation.njk`, `pillar-fireguard.njk`, `sector-commercial.njk`, `sector-energy.njk`, `sector-hospital.njk`, `sector-industry.njk`). Consumers data-drive the include:

```njk
<div class="pillar__ico">{% include "partials/icons/" + s.data.icon + ".njk" %}</div>
```

The icon partial contains a complete `<svg>` with the path data baked in. The frontmatter field (`icon: pillar-fireproofing`) is the partial filename without `.njk`. See `src/content/is/index.njk` for both callsites (pillars loop and sectorsCallout loop).

### Which to use

- **One shape, every page:** add to `svg-defs.njk` as a new `<symbol>` and reference via `<use href="#…"/>`.
- **One of N variants chosen by data:** add a partial under `partials/icons/` named for the data value and include it dynamically. Do not add new pillar/sector icons as `<symbol>`s — the home page's `{% include %}` lookup would 404 silently (`check-build.js` does not catch this).

Shared rules:

- **One source of truth per icon.** Never paste the same path inline in multiple templates.
- **`fill`/`stroke` are inherited.** Use semantic classes (`.bruna { fill: var(--accent); }`) on `<svg>` or `<g>` containers in CSS, not inline `fill="…"` on the markup.
- **`aria-hidden="true"` when decorative; `aria-label` on the consumer when the icon conveys meaning.**
```

**Reason:** The directive as written prescribes a single-pattern reality (`<symbol>` sprite) that does not match the code — `svg-defs.njk` contains exactly one symbol (`logo-wordmark`); pillar/sector icons live as eight separate `.njk` partials consumed via `{% include "partials/icons/" + s.data.icon + ".njk" %}` in `src/content/is/index.njk`. A future agent following the documented pattern would silently 404. Cited as the most consequential finding in the report. (`consistency.md`, `quality.md`.)

### 1b. `docs/directives/content-and-frontmatter.md` §7 — service detail table, `icon` row

**Current text** (line 181):

> | `icon` | string | yes | Icon symbol id from `svg-defs.njk` (`pillar-fireproofing`). |

**Revision:** Replace that row with:

```markdown
| `icon` | string | yes (for featured services) | Partial filename under `src/_includes/partials/icons/`, without the `.njk` extension (e.g. `pillar-fireproofing`). Read by the home page's pillars loop, not by `service.njk`. |
```

**Reason:** Same finding as 1a. The current row reinforces the wrong pattern. (See also §6 for the `Required` column split which downgrades `icon` from "yes" to "yes (for featured services)".)

---

## 2. Pattern-break — CSS load order in ARCHITECTURE.md contradicts `base.njk`

**Spec location:** `docs/ARCHITECTURE.md` §10 (line 187)

**Current text:**

> ```
> tokens → reset → layout → nav → blocks → home → services → sectors → articles → about → quoter
> ```

**Revision:** Replace that fenced block with:

```
tokens → reset → layout → nav → blocks → quoter → about → sectors → articles → services → home
```

**Reason:** `src/_includes/layouts/base.njk` lines 35–45 load the page-family files in reverse from what the doc claimed. `home.css` ships last, not `quoter.css`. The simplifier flagged this as a load-bearing fact for cascade-tie resolution. (`consistency.md`, `quality.md`.) Note: the same incorrect order also appears in `docs/directives/css-architecture.md` §1 (line 12); that file is out of scope for this revision but its inaccuracy should be tracked separately — see the "Discovered during planning" appendix.

---

## 3. Blind spot — CI workflow runs `check-build.js`; directives claim it doesn't

### 3a. `docs/ARCHITECTURE.md` §13 (lines 252–263)

**Current text:**

> ## 13. Deployment
>
> GitHub Actions workflow at `.github/workflows/deploy.yml`. Trigger: push to `main`. Steps:
>
> 1. Checkout
> 2. Setup Node 22 with npm cache
> 3. `npm ci`
> 4. `npx @11ty/eleventy`
> 5. Upload `_site/` as a Pages artifact
> 6. Deploy to GitHub Pages
>
> The workflow does **not** run `check-build.js` today — that's a local pre-push convention. If CI-side enforcement becomes important, swap step 4 for `npm run build`.
>
> The `pathPrefix: "/bruna-is/"` in `eleventy.config.js` makes path-style URLs resolve under the GH Pages project subpath. `meta.url` is the full deployed URL with prefix baked in, used for canonical/og:url/JSON-LD absolute fields.

**Revision:** Replace §13 with:

```markdown
## 13. Deployment

GitHub Actions workflow at `.github/workflows/deploy.yml`. Trigger: push to `main`. Steps:

1. Checkout
2. Setup Node 22 with npm cache
3. `npm ci`
4. `npm run build` — runs `npx @11ty/eleventy && node scripts/check-build.js`
5. Upload `_site/` as a Pages artifact
6. Deploy to GitHub Pages

`check-build.js` runs on every push, so every assertion in §12 gates deployment.

The `pathPrefix: "/bruna-is/"` in `eleventy.config.js` makes path-style URLs resolve under the GH Pages project subpath. `meta.url` is the full deployed URL with prefix baked in, used for canonical/og:url/JSON-LD absolute fields.
```

**Reason:** `.github/workflows/deploy.yml` line 23 actually runs `npm run build`, which chains `node scripts/check-build.js`. The doc's "CI does not run check-build" claim is stale. (`consistency.md`.)

### 3b. `docs/directives/eleventy-config.md` §10 (lines 287–302)

**Current text:**

> ## 10. Deployment
>
> `.github/workflows/deploy.yml` deploys to GitHub Pages on every push to `main`:
>
> ```yaml
> - run: npm ci
> - run: npx @11ty/eleventy
> - uses: actions/upload-pages-artifact@v4
>   with: { path: _site }
> ```
>
> Notes:
>
> - The deploy workflow does **not** run `check-build.js` today. Production safety relies on running `npm run build` locally before pushing. (If CI-side enforcement becomes important, swap `npx @11ty/eleventy` for `npm run build`.)
> - `.nojekyll` ships via passthrough (§7).
> - Node version: 22. Bumping requires testing locally first.

**Revision:** Replace §10 with:

```markdown
## 10. Deployment

`.github/workflows/deploy.yml` deploys to GitHub Pages on every push to `main`:

```yaml
- run: npm ci
- run: npm run build
- uses: actions/upload-pages-artifact@v4
  with: { path: _site }
```

`npm run build` chains `npx @11ty/eleventy && node scripts/check-build.js`, so every assertion in §9 runs in CI and a failing check blocks deployment.

- `.nojekyll` ships via passthrough (§7).
- Node version: 22. Bumping requires testing locally first.
```

**Reason:** Same finding as 3a. (`consistency.md`.)

---

## 4. Pattern-break — Home page frontmatter schema invents `pillars[]`, omits real keys

**Spec location:** `docs/directives/content-and-frontmatter.md` §7 — Home page block (lines 150–168)

**Current text:**

> ### Home page (`index.njk` per locale) — `.njk`
>
> The home page composes multiple structured sections. Required keys:
>
> | Field | Type | Purpose |
> |---|---|---|
> | `layout` | `"layouts/page.njk"` | Layout chain. |
> | `title` | string | Browser tab title, fallback for OG. |
> | `description` | string | `<meta name="description">`. |
> | `bodyClass` | `"home-page"` | CSS page-family scope. |
> | `eleventyNavigation.key` | `"home-is"` / `"home-en"` | Nav membership. |
> | `eleventyNavigation.order` | `1` | Nav position. |
> | `heroHeading` | string | Hero H1 (may contain `<br>` for line breaks). |
> | `statement.label` / `.heading` / `.lead` | object | "What we do" block. |
> | `pillars[]` | array | Service pillar cards. |
> | `leading[]` | array | Leading-projects section. |
> | `customers[]` | array | Customer logos row. |
>
> Section keys (`statement`, `pillars`, etc.) are page-specific — they're read by the home `.njk` template, not by any layout. Adding a new section means adding both the frontmatter key and the template rendering.

**Revision:** Replace the Home page block with:

```markdown
### Home page (`index.njk` per locale) — `.njk`

The home page is a one-off composition — too many section-specific shapes to tabularize honestly. Read `src/content/is/index.njk` to see every key in context; the inventory below is descriptive, not a schema contract.

Page-level keys:

- `layout: "layouts/page.njk"`
- `title`, `description` — meta + OG fallback chain
- `bodyClass: "home-page"` — CSS page-family scope
- `eleventyNavigation.key: "home-is"` / `"home-en"`, `order: 1`
- `heroHeading` — H1, may contain `<br>` / inline emphasis

Section objects (each consumed by the corresponding block in `index.njk`):

- `statement` — `{label, heading, lead}` for the "What we do" block.
- `explainer` — `{left, right}` where each side has `{heading, paragraphs[], chips[]}` and the right side may include `footer`. Chips have `{label, style}` where `style` is `"blue"` or `null`.
- `process` — `{label, heading, steps[]}` where each step has `{num, heading, body}`.
- `leading` — `{label, heading, paragraphs[], stats[], badgeStrong, badgeBody, image}` where each stat has `{num, lbl}`.
- `sectorsCallout` — `{label, heading, items[]}` where each item has `{icon, heading, body}`. The `icon` value is a partial filename under `partials/icons/` (see [`templates-and-layouts.md`](./templates-and-layouts.md) §8).
- `customers` — `{label}`. The list itself comes from `src/_data/partners.js` (the `partners` global).
- `cta` — `{heading, primaryHref, primaryLabel, secondaryHref, secondaryLabel}`. Rendered by `partials/cta-band.njk`.

The featured-services list (the "pillars" grid) is **not** in frontmatter. It is derived in the template from `collections.featuredServicesIs` / `featuredServicesEn` — see [`eleventy-config.md`](./eleventy-config.md) §6.

Adding a new section means editing both the frontmatter shape and the template that renders it.
```

**Reason:** The previous table invented `pillars[]` (no such key in `src/content/is/index.njk`) and omitted `explainer`, `process`, `sectorsCallout` — three substantial structured blocks any home-page edit will touch. The frontmatter is too ad-hoc to tabularize without lying; the report's "drop the table or rewrite against the actual keys" recommendation is taken. (`consistency.md`, `quality.md`.)

---

## 5. Blind spot — `_data/` module count is wrong (missing `partners.js`)

### 5a. `docs/directives/eleventy-config.md` §8 (lines 238–243)

**Current text:**

> ## 8. Global data
>
> Two `_data/` modules:
>
> | File | Type | Role |
> |---|---|---|
> | `_data/meta.js` | ESM default export | Site metadata. Has `byLocale[is\|en]` for translatable fields and a top-level `shared` for URLs, deploy coordinates, contact info. |
> | `_data/i18n.js` | ESM default export | UI string dictionary — see [`i18n.md`](./i18n.md) §7. |

**Revision:** Replace with:

```markdown
## 8. Global data

Three `_data/` modules:

| File | Type | Role |
|---|---|---|
| `_data/meta.js` | ESM default export | Site metadata. `byLocale[is\|en]` for translatable fields; top-level shared values for URLs, deploy coordinates, contact info. |
| `_data/i18n.js` | ESM default export | UI string dictionary — see [`i18n.md`](./i18n.md) §7. |
| `_data/partners.js` | ESM default export | Brand-name list for the home customer band. Not translatable — items have `{name, style}` where `style` flips the logo font (`"sans"` vs default serif). |
```

**Reason:** `src/_data/` contains three files, not two. `partners.js` exports the brand-name list consumed by the home `customers` strip (see `src/content/is/index.njk` line 222). (`consistency.md`.)

### 5b. `docs/ARCHITECTURE.md` §3 (line 53)

**Current text** (inside the source-tree code block, line 53):

> `│   ├── _data/                  → global data (meta.js, i18n.js)`

**Revision:** Replace with:

> `│   ├── _data/                  → global data (meta.js, i18n.js, partners.js)`

**Reason:** Same finding as 5a. (`consistency.md`.)

---

## 6. Blind spot — Orphan partials `schema-about.njk`, `schema-organization.njk` undocumented

### 6a. `docs/directives/templates-and-layouts.md` §2 — current partials table (lines 52–62)

**Current text:**

> Current partials (do not rename without updating every include site):
>
> | Partial | Role |
> |---|---|
> | `header.njk` | Sticky site header with brand wordmark, mobile toggle, primary nav. Reads `collections.navIs` / `collections.navEn`. |
> | `footer.njk` | Four-column footer (brand, solutions, company, contact) plus copyright row. Reads `meta`. |
> | `utility-bar.njk` | Top bar above the header — language switch, contact links. |
> | `breadcrumb.njk` | Renders the `eleventyNavigationBreadcrumb` chain when the page has `eleventyNavigation.parent`. |
> | `seo-meta.njk` | Open Graph + Twitter card meta tags. Computed value chain — see §6. |
> | `cta-band.njk` | Optional CTA section rendered if frontmatter declares `cta:` block. |
> | `svg-defs.njk` | Inline `<svg>` with `<defs>` containing all icon symbols. See §8. |

**Revision:** Replace the table with:

```markdown
Current partials (do not rename without updating every include site):

| Partial | Role |
|---|---|
| `header.njk` | Sticky site header with brand wordmark, mobile toggle, primary nav. Reads `collections.navIs` / `collections.navEn`. |
| `footer.njk` | Four-column footer (brand, solutions, company, contact) plus copyright row. Reads `meta`. |
| `utility-bar.njk` | Top bar above the header — language switch, contact links. |
| `breadcrumb.njk` | Renders the `eleventyNavigationBreadcrumb` chain when the page has `eleventyNavigation.parent`. |
| `seo-meta.njk` | Open Graph + Twitter card meta tags. Computed value chain — see §6. |
| `cta-band.njk` | Optional CTA section rendered if frontmatter declares `cta:` block. |
| `svg-defs.njk` | Off-screen `<svg>` sprite containing the brand wordmark. See §8 Pattern A. |
| `icons/*.njk` | Per-icon `<svg>` partials (pillar and sector icons) included by data-driven name. See §8 Pattern B. |
| `schema-about.njk` | `AboutPage` JSON-LD block. **Currently unused** — wire from `src/content/{is,en}/about/index.njk` if the about page should emit AboutPage structured data, or delete the file. |
| `schema-organization.njk` | `Organization` JSON-LD block. **Currently unused** — wire from `base.njk` (so every page emits one Organization node) if global structured data is wanted, or delete the file. |
```

**Reason:** `src/_includes/partials/` actually contains nine partials (plus the `icons/` subdirectory). `grep -rn` confirms `schema-about.njk` and `schema-organization.njk` are orphans — both should be either wired up or deleted. The implementer should flag this for the project owner during the directive revision (no decision made here — direction must come from project owner). (`consistency.md`, `maintainability.md`.)

### 6b. `docs/ARCHITECTURE.md` §5 (lines 102–112)

**Current text:** (same 7-row partials table as 6a, with one extra column)

> ## 5. Partials
>
> | Partial | Role |
> |---|---|
> | `header.njk` | … |
> | `footer.njk` | … |
> | `utility-bar.njk` | … |
> | `breadcrumb.njk` | … |
> | `seo-meta.njk` | … |
> | `cta-band.njk` | … |
> | `svg-defs.njk` | Off-screen `<svg><defs>` sprite with every icon. Referenced via `<use href="#name">`. |

**Revision:** Replace the §5 block (lines 102–112) with:

```markdown
## 5. Partials

| Partial | Role |
|---|---|
| `header.njk` | Sticky site header — brand wordmark, mobile toggle, primary nav. Reads `navIs`/`navEn`. |
| `footer.njk` | Four-column footer (brand, solutions, company, contact) + copyright row. |
| `utility-bar.njk` | Above-header strip — language switch, contact links. |
| `breadcrumb.njk` | Renders the `eleventyNavigationBreadcrumb` chain. Included by `page.njk` when the current page has `eleventyNavigation.parent`. |
| `seo-meta.njk` | Open Graph + Twitter meta tags. Uses a paren-around-chain pattern to bind escaped values once. |
| `cta-band.njk` | Optional CTA section. Renders if frontmatter declares a `cta:` block. |
| `svg-defs.njk` | Off-screen `<svg>` sprite containing the brand wordmark. |
| `icons/*.njk` | Per-icon `<svg>` partials (pillar and sector). Included by data-driven name — see [`templates-and-layouts.md`](./directives/templates-and-layouts.md) §8. |
| `schema-about.njk`, `schema-organization.njk` | JSON-LD partials currently not included from any template. Wire them in or delete. |
```

**Reason:** Same finding as 6a — partials inventory is incomplete. (`consistency.md`.)

---

## 7. Ambiguity — "Required" frontmatter column conflates three different consumers

**Spec location:** `docs/directives/content-and-frontmatter.md` §7 — service, sector, article tables (lines 170–211)

**Current text:** The three tables share a `Required` column with `yes`/`no` values; fields like `featured`, `order`, `number`, `category`, `icon` on services are marked `yes` even though `service.njk` reads none of them — they are consumed by collection filters in `eleventy.config.js` and by the home page's featured loop in `src/content/is/index.njk`.

**Revision:** Replace the three tables (service detail, sector detail, article) with:

```markdown
### Service detail (`thjonusta/<slug>.md`) — `.md`

| Field | Type | Required by layout | Required by other consumer |
|---|---|---|---|
| `title` | string | yes (`service.njk`) | — |
| `image` | string | yes (`service.njk`) | — |
| `summary` | string | yes (`service.njk`) | — |
| `insightStrong` | string | yes (`service.njk`) | — |
| `insight` | string | yes (`service.njk`) | — |
| `bullets[]` | array of string | yes (`service.njk`) | — |
| `number` | string | — | yes for the home pillar grid (read in `index.njk`) — service number badge (`"01"`, …) |
| `category` | string | — | yes for the service-feature header (rendered by `service.njk` as part of `{{ number }} / {{ category }}`) |
| `order` | int | — | yes for `featuredServicesIs/En` sort (`eleventy-config.md` §6) |
| `featured` | bool | — | yes for `featuredServicesIs/En` membership |
| `icon` | string | — | yes for the home pillar grid (partial filename under `partials/icons/`) |
| `imageContain` | bool | no — defaults to cover-fit | — |

Strings marked "may contain inline HTML" follow §11; the consuming template renders them with `| safe`.

### Sector detail (`geirar/<slug>.md`) — `.md`

| Field | Type | Required by layout | Required by other consumer |
|---|---|---|---|
| `title` | string | yes (`sector.njk`) | — |
| `image` | string | yes (`sector.njk`) | — |
| `description` | string | yes (`sector.njk`) | — |
| `order` | int | — | yes for `featuredSectorsIs/En` sort |
| `featured` | bool | — | yes for `featuredSectorsIs/En` membership |
| `number` | string | — | yes if the sector appears in any list that renders a card badge |
| `tagLabels[]` | array of string | no — pills under the body | — |

### Article (`greinar/<slug>.md`) — `.md`

| Field | Type | Required by layout | Required by other consumer |
|---|---|---|---|
| `title` | string | yes (`article.njk`) | — |
| `image` | string | yes (`article.njk`) | — |
| `summary` | string | yes (`article.njk`) | — |
| `date` | YAML date | yes (`article.njk`) — render + JSON-LD | — |
| `readTimeMinutes` | int | yes (`article.njk`) | — |
| `author` | string | yes (`article.njk`) — render + JSON-LD | — |
| `featured` | bool | — | yes for `featuredArticleIs/En` membership |
| `category` | string | — | yes wherever articles surface in a list (currently the articles index) |

`article.njk` derives `eleventyComputed.ogImage` from `image` at the layout level — see §10. Article `.md` files do not declare `eleventyComputed.ogImage` themselves.
```

**Reason:** The previous `Required: yes` column trained contributors to copy-paste fields the layout never reads — `service.njk` consumes none of `featured`/`order`/`number`/`category`/`icon`, but the table marked all of them required. Splitting the column makes it explicit *who* needs each field. Quoting the report: "The current shape will train contributors to copy-paste fields they don't actually need." (`consistency.md`, `quality.md`.)

---

## 8. Blind spot — About-subcollection directory-data shape is much simpler than documented

**Spec location:** `docs/directives/content-and-frontmatter.md` §4 — "Required keys for a collection" (lines 58–70)

**Current text:**

> Every collection has a directory data file: `<dir>/<dir>.json` (preferred for static config) or `<dir>/<dir>.11tydata.js` (only when computation is required).
>
> These files apply shared frontmatter to every page in the directory. Required keys for a collection:
>
> ```json
> {
>   "tags": ["<collection>", "<collection>-<locale>"],
>   "layout": "layouts/<entry>.njk",
>   "bodyClass": "<page-family>-page",
>   "permalink": "/<icelandic-slug>/{{ page.fileSlug }}/",
>   "eleventyNavigation": {
>     "parent": "<collection>-<locale>"
>   }
> }
> ```

**Revision:** Replace the snippet and surrounding paragraph with:

```markdown
Every collection has a directory data file: `<dir>/<dir>.json` (preferred for static config) or `<dir>/<dir>.11tydata.js` (only when computation is required). Two shapes exist depending on whether the collection's entries render their own pages.

### Shape A — entries render detail pages (services, sectors, articles)

```json
{
  "tags": ["<collection>", "<collection>-<locale>"],
  "layout": "layouts/<entry>.njk",
  "bodyClass": "<page-family>-page",
  "permalink": "/<icelandic-slug>/{{ page.fileSlug }}/",
  "eleventyNavigation": {
    "parent": "<collection>-<locale>"
  }
}
```

### Shape B — data-only subcollections (no rendered detail pages)

```json
{
  "tags": ["<collection>", "<collection>-<locale>"],
  "permalink": false
}
```

Use this shape when the subcollection exists only to populate a list rendered by another page. The about-page subcollections (`milestones`, `principles`, `team` under `src/content/{is,en}/about/`) are the canonical example: `permalink: false` suppresses page emission, so `layout`, `bodyClass`, and `eleventyNavigation.parent` are unnecessary. The parent page (`about/index.njk`) loops the collection via `collections.team`, etc.
```

**Reason:** §4 mandated five keys; the about-subcollection directory data files (`milestones.json`, `principles.json`, `team.json`) contain only `tags` + `permalink: false`. The directive prescribed an over-rich schema that does not match — and never could match, because data-only subcollections suppress page emission. Adding Shape B closes the loop. (`consistency.md`, `simplicity.md`.)

---

## 9. Pattern-break — New directives are 25–75% longer than the gold standard

This is a density pass distributed across four files. Each sub-revision is a localized trim with a concrete before/after.

### 9a. `docs/directives/eleventy-config.md` §11 "ESM and config style" (lines 304–313)

**Current text:**

> ## 11. ESM and config style
>
> The config file is ESM (`"type": "module"` in `package.json`). Constraints:
>
> - Use `import` / `export`, never `require`.
> - Top-level `import { ... } from "@11ty/eleventy"` works for the built-in `I18nPlugin` and `HtmlBasePlugin`. The image transform plugin imports from `"@11ty/eleventy-img"`.
> - Side-effecting top-level code (e.g. zeroing the translation-miss log file) runs at module-load time — acceptable for setup that happens once per build.
> - The config function takes `eleventyConfig` and returns nothing. The top-level `export const config = { ... }` declares directory paths and `pathPrefix`.
>
> Do not introduce a tooling layer (tsc, esbuild) on the config. The file is plain JavaScript, executed by Node 22.

**Revision:** Replace with:

```markdown
## 11. ESM and config style

The config file is plain ESM JavaScript (`"type": "module"`), executed directly by Node 22. Use `import`/`export`. No tooling layer (no tsc, no esbuild).
```

**Reason:** The simplifier called out this section: four bullets restating "the config is plain ESM JavaScript." One sentence covers it. (`simplicity.md`.)

### 9b. `docs/directives/eleventy-config.md` §7 — `.nojekyll` rationale (line 225)

**Current text** (the bullet inside the §7 list):

> - **`.nojekyll`** at the repo root → `_site/.nojekyll`. Tells GitHub Pages not to run Jekyll on the output. Without this, files/directories starting with `_` (which Jekyll treats as private) wouldn't ship.

**Revision:** Replace with:

> - **`.nojekyll`** at the repo root → `_site/.nojekyll`. Disables Jekyll on GitHub Pages so underscore-prefixed paths ship.

**Reason:** Simplifier flagged: "the `.nojekyll` rationale is 22 words for a fact that fits in 8." (`simplicity.md`.)

### 9c. `docs/directives/i18n.md` §5 "One-way fallback" (lines 98–110)

**Current text:**

> ## 5. One-way fallback: EN → IS, never IS → EN
>
> Missing English strings fall back to Icelandic. Missing Icelandic strings render the raw key (the dictionary slug like `ui.skip_to_content`) and warn red in the build log.
>
> This is intentional. Icelandic is the source of truth — if an IS string is missing, the dictionary is incomplete and the build should surface that loudly. English strings can lag without breaking the IS site.
>
> When you see a raw key in rendered HTML:
>
> 1. The key is missing from `src/_data/i18n.js`, OR
> 2. The locale is `is` and the entry has no `is` value, OR
> 3. The locale is `en` and the entry has neither `en` nor `is` value.
>
> Add the missing entry. Do **not** "fix" it by swapping in a hard-coded string in the template.

**Revision:** Replace with:

```markdown
## 5. One-way fallback: EN → IS, never IS → EN

Missing EN strings fall back to IS. Missing IS strings render the raw dictionary key (e.g. `ui.skip_to_content`) and warn red — Icelandic is the source of truth, so a missing IS value must surface loudly.

If a raw key appears in rendered HTML, add the entry to `src/_data/i18n.js`. Do not patch around the miss by hard-coding a string in a template.
```

**Reason:** Simplifier: "nine lines and a numbered list to say 'Missing EN → fall back to IS. Missing IS → raw key + warn.' Two sentences." (`simplicity.md`.)

### 9d. `docs/directives/templates-and-layouts.md` §10 "Nunjucks idioms" — Avoid list (lines 217–221)

**Current text:**

> Avoid:
>
> - `{{ varName | default("...") }}` for fallback chains spanning multiple values. Use `{%- set var = (a or b or c) | escape %}` instead so the precedence is explicit and the escape applies to all branches.
> - `{% raw %}` blocks — there's no legitimate reason for this project to escape Nunjucks tags in templates. If you need to render literal `{{` in HTML, that's content (Markdown), not template logic.
> - Deep `{% block %}` / `{% extends %}` chains beyond the canonical three (base → page → leaf). Add a partial instead.

**Revision:** Replace the `Avoid:` block with:

> Avoid `{{ var | default("...") }}` for multi-value fallbacks (use the `set`-and-paren pattern above so escape applies to every branch — §4).

**Reason:** The remaining two `Avoid:` bullets duplicate §1 (chain depth) and would-be-irrelevant Nunjucks edge cases (`{% raw %}`). The `default` warning is the only one that names a real, non-obvious trap not covered by §3 / §4 / §1. (`simplicity.md`, `reusability.md`.)

---

## 10. Reusability gap — Image pipeline rule duplicated across three docs

**Spec location:** `docs/directives/eleventy-config.md` §5, `docs/directives/content-and-frontmatter.md` §8, `docs/ARCHITECTURE.md` §6 + §14 (Conventions table)

### 10a. `docs/directives/content-and-frontmatter.md` §8 (lines 237–249)

**Current text:**

> ## 8. Image fields
>
> Image fields use absolute paths from the site root:
>
> ```yaml
> image: "/img/server_room.jpg"
> ```
>
> Source files live in `src/img/`. The path resolves to two things at build time:
>
> 1. **The raw file at `/img/server_room.jpg`** (via the `src/img` passthrough copy). This is the URL referenced by `<meta property="og:image">`, JSON-LD `image` fields, and any other consumer that needs a stable unhashed URL.
> 2. **A responsive `<picture>` block** automatically when the path appears inside an `<img src="...">` tag in a template. The `eleventy-img` plugin transforms it. See [`eleventy-config.md`](./eleventy-config.md) §5.
>
> Do not use relative paths (`../../img/foo.jpg`) — always absolute from site root. Do not paste image markup as `<picture>` by hand — write `<img src="..." alt="" width="..." height="...">` and let the plugin transform.

**Revision:** Replace §8 with:

```markdown
## 8. Image fields

Image frontmatter values are absolute paths from the site root:

```yaml
image: "/img/server_room.jpg"
```

Source files live in `src/img/`. For how the path resolves at build time (raw passthrough vs. responsive transform), see [`eleventy-config.md`](./eleventy-config.md) §5 — that document owns the image pipeline rules.
```

**Reason:** The image-pipeline rule "write `<img>`, don't write `<picture>` by hand" appears in three places. Pick one owner (`eleventy-config.md` §5) and cross-reference. (`reusability.md`, `simplicity.md`.)

### 10b. `docs/ARCHITECTURE.md` §6 (line 276) — Conventions-at-a-glance row

The conventions table at §14 (lines 267–278) is descriptive and links to the directives. Keep it as-is — it's the index, not a duplication. But §6 ("Content model") and §9 ("Image pipeline") together restate the rule with substance; trim §9's prose where it duplicates `eleventy-config.md` §5. Specifically:

**Current text — `docs/ARCHITECTURE.md` §9 (lines 170–180):**

> ## 9. Image pipeline
>
> Two paths, both required:
>
> **Responsive transform** — `eleventyImageTransformPlugin` converts every `<img src="/img/...">` into a `<picture>` with AVIF/WebP/JPEG variants at widths 400/800/1200/auto. Lazy-loading and async decoding are applied via `htmlOptions`. In `npm start` mode, transforms are lazy (`transformOnRequest: true`); in `npm run build`, they're precomputed.
>
> **Raw passthrough** — `src/img/` is passthrough-copied to `_site/img/` so the originals remain at stable, unhashed URLs. These feed `og:image` meta tags, JSON-LD `image` fields, and any other consumer that needs a non-responsive URL.
>
> The post-build asset-resolution check verifies every URL referenced by icons, OG images, and JSON-LD logos resolves under `_site/`.
>
> Source files: prefer JPEG for photographs, SVG for logos and icons. SVGs ship as-is via the passthrough.

**Revision:** Replace §9 with:

```markdown
## 9. Image pipeline

Two coexisting paths: `eleventyImageTransformPlugin` rewrites every `<img src="/img/…">` into a responsive `<picture>` (AVIF/WebP/JPEG at 400/800/1200/auto); `src/img/` is passthrough-copied to `_site/img/` so the raw originals stay at stable URLs for `og:image`, JSON-LD `image`, and JSON-LD `logo` consumers.

Full rules — formats, widths, `transformOnRequest`, and the asset-resolution check — in [`directives/eleventy-config.md`](./directives/eleventy-config.md) §5.
```

**Reason:** Same finding — duplication. ARCHITECTURE.md should describe shape, not restate the directive's policy detail. (`reusability.md`.)

### 10c. `docs/directives/eleventy-config.md` §5 — no change needed

§5 is the canonical home for the image pipeline rule. Keep its prose as the single source of truth. The other two docs now cross-reference it.

---

## 11. Reusability gap — `requireLang` rationale stated in 5 places

### 11a. `docs/directives/i18n.md` §10 (lines 175–185)

**Current text:**

> ## 10. `lang` propagation — the `requireLang` guard
>
> `lang` is set on every page by the directory data files at `src/content/is/is.11tydata.js` and `src/content/en/en.11tydata.js`. The `requireLang` filter in `base.njk` makes a missing `lang` a build error rather than a silent `undefined`:
>
> ```njk
> <html lang="{{ lang | requireLang }}">
> ```
>
> If a future page is added outside the locale tree (e.g. directly under `src/content/`) and forgets to declare `lang`, the build throws. This converts a class of silent SEO/meta-tag breakage into a loud failure.
>
> Do not bypass the filter. If you need a one-off page without `lang` (which is suspicious — every public page should have a locale), give it an explicit `lang: "is"` in its frontmatter.

**Revision:** Replace §10 with:

```markdown
## 10. `lang` propagation — the `requireLang` guard

`lang` is set per locale by `src/content/{is,en}/{is,en}.11tydata.js` and cascades to every descendant. `base.njk` renders `<html lang="{{ lang | requireLang }}">` — the filter throws if `lang` is missing so a misplaced page fails the build loudly rather than rendering `undefined` into meta tags and JSON-LD.

Rationale lives in the inline comment at `eleventy.config.js` `requireLang` (`addFilter("requireLang", …)`). Do not bypass the filter; give a one-off page an explicit `lang: "is"` in its own frontmatter if it lives outside the locale tree.
```

### 11b. `docs/directives/templates-and-layouts.md` §1 — `lang` row (line 23)

Handled by revision §22 (`lang` row dependency reversal) — see below. After that revision the row no longer restates the rationale.

### 11c. `docs/directives/eleventy-config.md` §4 — filter table `requireLang` row (line 98)

**Current text:**

> | `requireLang` | `(lang)` | Throws a build error if `lang` is falsy. See [`i18n.md`](./i18n.md) §10. |

**Revision:** Keep as-is. This row is appropriately terse and already cross-references §10. No change.

### 11d. `docs/directives/eleventy-config.md` §2 — plugin-order rationale (lines 38–40)

**Current text:**

> Order matters for two reasons:
>
> 1. **i18n override after the upstream plugin.** The custom override calls `ec.addFilter("i18n", ...)` after `eleventy-plugin-i18n` has already registered its own filter. A top-level `addFilter` would be overwritten by the upstream plugin's later execution. Wrapping the override in an inline plugin guarantees correct sequencing.
> 2. **HtmlBasePlugin before content rendering.** `HtmlBasePlugin` rewrites path-style attributes (`href="/foo/"`, `src="/foo/"`) at build time to prepend the `pathPrefix`. It must be registered as a plugin so it runs during the transform phase.

**Revision:** Replace with:

```markdown
Order matters in two places: `i18nOverride` must run after `eleventy-plugin-i18n` so its `addFilter("i18n", …)` shadows the upstream filter (the inline-plugin wrapper guarantees the sequencing — see the comment block above `i18nOverride` in `eleventy.config.js` for the full rationale). `HtmlBasePlugin` is registered before content rendering so its path-prefix rewriter runs in the transform phase.
```

**Reason:** The two-bullet form restates what the inline comment in `eleventy.config.js` already explains in depth. Compressing avoids the report's "3 times within one section, plus i18n.md §2–§3, plus the inline code comment" duplication. (`reusability.md`, `simplicity.md`.)

### 11e. `docs/directives/i18n.md` §2 — plugin-order rationale

**Current text** (lines 49–54):

> ```js
> eleventyConfig.addPlugin(function i18nOverride(ec) {
>   ec.addFilter("i18n", function (key, ...rest) { /* see §3 */ });
> });
> ```

This snippet is acceptable as-is — short, illustrative. No change.

**Reason for 11a–11e taken together:** Quoting the report: "Five places explain 'missing `lang` → build error'. The inline code comment is the right home. Each directive should link to the function, not restate the justification." Same shape for the plugin-order rationale. After these edits, each directive points to the inline comment instead of re-justifying it. (`reusability.md`.)

---

## 12. Quality concern — `pathPrefix` migration runbook is speculative future-proofing

**Spec location:** `docs/directives/eleventy-config.md` §3 (lines 83–88)

**Current text:**

> **Do not strip `pathPrefix` in pursuit of a custom domain.** If the project moves to an apex domain (e.g. `brunathettingar.is`):
>
> 1. Set `meta.pathPrefix: "/"` and `meta.url: "https://brunathettingar.is"` (no trailing slash).
> 2. Optionally remove `HtmlBasePlugin` (it's a no-op when `pathPrefix === "/"`).
> 3. Update `scripts/check-build.js` `PREFIX` constant.

**Revision:** Replace with:

> **Do not strip `pathPrefix` casually.** The deploy URL, `HtmlBasePlugin`'s path rewriting, and `scripts/check-build.js`'s `PREFIX` constant all derive from this single value; changing it touches three files at once.

**Reason:** The three-step migration runbook describes work that may never happen. Directives describe current contracts; migration notes belong elsewhere. The one-sentence warning that the value is load-bearing across three files retains the safety signal without prescribing speculative procedure. (`scope-discipline.md`, `simplicity.md`.)

---

## 13. Quality concern — ARCHITECTURE.md §15 "Upstream documentation" is a 22-link dump

**Spec location:** `docs/ARCHITECTURE.md` §15 (lines 280–323)

**Current text:** Four subsections (Eleventy v3, Eleventy plugins, Nunjucks, Standards) containing 22 upstream URLs.

**Revision:** Replace §15 with:

```markdown
## 15. Upstream documentation

The directives cover the policy. For framework-internal questions the directives don't address, two upstream resources are load-bearing because this project depends on the documented behavior:

- `eleventy-plugin-i18n` (Adam Duncan): https://github.com/adamduncan/eleventy-plugin-i18n — read this if you touch the `i18nOverride` (the override exists because upstream's lookup is broken for dotted keys).
- `eleventy-img` HTML transform: https://www.11ty.dev/docs/plugins/image/#eleventy-transform — read this if you touch the dual image pipeline.

For everything else, Eleventy docs are one click from https://www.11ty.dev/docs/.
```

**Reason:** Quoting the simplifier: "many never get cited from anywhere else; nine are stable enough to never be needed (MDN responsive images, Schema.org full type hierarchy, ARIA Authoring Practices, etc.)." Trimmed to the two upstream resources that this project's quirks specifically depend on. (`simplicity.md`.)

---

## 14. Ambiguity — "≥ 5 structural lines" partial threshold is unverifiable

### 14a. `docs/directives/templates-and-layouts.md` §2 (lines 36–38)

**Current text:**

> Use a partial when:
>
> - The same markup appears on **two or more** pages or layouts, OR
> - A single block of markup is ≥ 5 lines of structural HTML and has a single semantic identity (e.g. the SEO meta block, the CTA band).

**Revision:** Replace with:

```markdown
Use a partial when the same markup appears in **two or more** templates. Inline it otherwise — even if long. The exception: a markup block with a name that survives outside its callsite (`seo-meta`, `cta-band`, `svg-defs`) earns a partial even if used once, because the name itself is the contract.
```

**Reason:** Quoting the simplifier: "What counts as a 'structural line'? `cta-band.njk` is 17 lines if you count everything and ~8 if you exclude blanks and `endif`s — the threshold doesn't gate anything." Replaced the numeric threshold with a semantic test. (`simplicity.md`, `quality.md`.)

### 14b. `docs/ARCHITECTURE.md` §14 — conventions-at-a-glance row (line 274)

**Current text:**

> | New partial | Used ≥ 2 places or ≥ 5 structural lines. Named for what it renders. | [`templates-and-layouts.md`](./directives/templates-and-layouts.md) §2 |

**Revision:** Replace with:

> | New partial | Used in ≥ 2 templates, or named after a contract that survives its callsite. | [`templates-and-layouts.md`](./directives/templates-and-layouts.md) §2 |

**Reason:** Same finding as 14a — align the index row with the revised §2 rule. (`consistency.md`.)

---

## 15. Ambiguity — "Defensive on input" filter rule contradicted by its own exception

**Spec location:** `docs/directives/eleventy-config.md` §4 (lines 103–106)

**Current text:**

> - **Defensive on input.** Filters that take dates check `if (!date) return ""` and `if (isNaN(d)) return ""`. Don't throw on missing data unless the missing data is a contract violation (which `requireLang` is).

**Revision:** Replace the bullet with:

> - **Defensive on data, loud on contract violations.** Filters that read content fields (dates, strings) return `""` on missing input — content can legitimately be incomplete. `requireLang` throws because missing `lang` is a build-config bug, not a content gap.

**Reason:** The previous phrasing read as a general "don't throw" with one swallowing exception. Reframed so the rule and the exception describe two distinct categories (content data vs. build config) rather than one rule with an asterisk. (`simplicity.md`, `quality.md`.)

---

## 16. Ambiguity — "Every public page uses `layouts/page.njk`" doesn't address sitemap / 404 / robots

**Spec location:** `docs/directives/templates-and-layouts.md` §1 — under the layout chain (lines 19–20)

**Current text:**

> Every public page uses `layouts/page.njk` (directly or through a leaf). `base.njk` is never used directly except as the parent of `page.njk`.

**Revision:** Replace the sentence with:

> Every **HTML content** page uses `layouts/page.njk` (directly or through a leaf). `base.njk` is never used directly except as the parent of `page.njk`. Non-HTML / non-content templates — `sitemap.njk`, `robots.njk`, `404.njk` — render directly without a layout (no chrome required, or chrome would interfere with the output format).

**Reason:** `src/content/is/404.njk`, `sitemap.njk`, and `robots.njk` ship without a layout. The blanket "every public page" claim was wrong. Qualifying to "HTML content page" and naming the exceptions makes the rule survive a `grep` of the content tree. (`consistency.md`.)

---

## 17. Blind spot — `cta.primaryLabel` / `cta.secondaryLabel` emit without `| safe`; asymmetry undocumented

### 17a. `docs/directives/content-and-frontmatter.md` §11 (lines 277–292)

**Current text:** §11 explains that frontmatter strings may contain inline HTML, with examples (`title`, `heroHeading`).

**Revision:** Append a new paragraph at the end of §11 (after the YAML-escaping sentence):

```markdown

HTML-in-frontmatter only works for fields the template renders with `| safe`. In particular, the CTA band partial renders `cta.heading` with `| safe` (HTML highlights are permitted there) but renders `cta.primaryLabel` and `cta.secondaryLabel` without `| safe` — embedded HTML in the button labels will display as escaped text. If a label needs emphasis, either move the emphasis to the heading or update `partials/cta-band.njk` to apply `| safe` to the label.
```

### 17b. `docs/directives/i18n.md` §8 — CTA boundary example (lines 146–157)

The current §8 references `cta.primaryLabel` as a frontmatter example. No change to §8 itself — the asymmetry note in 17a is sufficient cross-context. Reviewers reading either §11 or §8 will land on the disclaimer because the new §11 paragraph names `cta.heading` versus `cta.primaryLabel` explicitly.

**Reason:** `partials/cta-band.njk` renders `cta.heading` with `| safe` (line 5) but renders `cta.primaryLabel` / `cta.secondaryLabel` without it (lines 8, 11). A reader writing `primaryLabel: "Fá <strong>verðmat</strong>"` would see escaped output. (`consistency.md`, `quality.md`.)

---

## 18. Blind spot — Locale parity rule doesn't acknowledge `permalink: false` exemption

**Spec location:** `docs/directives/i18n.md` §9 (lines 159–173)

**Current text:**

> ## 9. Locale parity rule
>
> Every IS page **must** have an EN sibling at the mirrored path. The source trees under `src/content/is/` and `src/content/en/` are structurally identical: matching directories, matching filenames, parallel frontmatter shape.
>
> ```
> src/content/is/thjonusta/fireproofing.md
> src/content/en/thjonusta/fireproofing.md   ← required
> ```
>
> If a piece of content genuinely exists only in IS:
>
> - Create the EN sibling anyway with translated frontmatter and body. The build's parallel-slug check (`check-build.js` step 7) prints a WARN line for every unpaired slug. Don't ship orphaned pairs.
> - The language switcher uses `locale_links`, which only lists the alternate when it exists. An orphaned page works — but the user is sent to a stub on the alternate side. The fix is to write the sibling.
>
> **Adding an IS page requires adding the EN sibling in the same commit.** This is enforced socially, not by tooling.

**Revision:** Insert a new paragraph right before the "**Adding an IS page…**" line:

```markdown

**Exempt from parity:** pages with `permalink: false` (the about-page subcollections — `milestones/`, `principles/`, `team/`). They emit no HTML, so there's nothing for `check-build.js` to compare; the IS-only data files are intentional and do not trigger the parallel-slug warning.
```

**Reason:** A reader could be confused why the seven `team/*.md` files don't trigger the WARN line. The exemption is real — `check-build.js` step 7 compares emitted HTML, and `permalink: false` files emit none. (`consistency.md`.)

---

## 19. Blind spot — `eleventyComputed.ogImage` fallback to `meta.ogImage` not documented

### 19a. `docs/directives/content-and-frontmatter.md` §9 (lines 251–264)

**Current text:**

> ## 9. `eleventyComputed` for OG image derivation
>
> Leaf layouts derive `ogImage` from the page's own `image` field:
>
> ```yaml
> ---
> layout: layouts/page.njk
> eleventyComputed:
>   ogImage: "{{ image }}"
> ogType: "article"
> ---
> ```
>
> This makes the hero image double as the social-share image without requiring the content author to declare `ogImage` twice. Override in frontmatter only if the social image needs to differ from the hero.

**Revision:** Replace §9 with:

```markdown
## 9. `eleventyComputed` for OG image derivation

Leaf layouts (`service.njk`, `sector.njk`, `article.njk`) declare:

```yaml
---
layout: layouts/page.njk
eleventyComputed:
  ogImage: "{{ image }}"
ogType: "article"
---
```

so the page's `image` doubles as the social-share image without the content author declaring `ogImage` twice. The full precedence in `partials/seo-meta.njk`: explicit `ogImage` → `image` (via `eleventyComputed`) → `meta.ogImage` (the site-wide default, `/assets/img/og-default.jpg`). `.njk` pages that set neither (`home`, listings, about, quoter) fall through to the site default — which is correct behavior, not a missing field.

Override `ogImage` in frontmatter only if the social image needs to differ from the hero.
```

### 19b. `docs/directives/templates-and-layouts.md` §1 — leaf layouts table addition

After the table (after the sentence that begins "Leaf layouts may set `eleventyComputed.ogImage`…" on line 29), append:

```markdown

When neither `ogImage` nor `eleventyComputed.ogImage` is set on a page, `partials/seo-meta.njk` falls back to `meta.ogImage` (`/assets/img/og-default.jpg`). This is the path most `.njk` pages take — see [`content-and-frontmatter.md`](./content-and-frontmatter.md) §9 for the precedence.
```

**Reason:** §9 stopped at "leaf layouts may set `eleventyComputed.ogImage`" without naming the fallback for `.njk` pages that don't. A reader auditing OG meta has to reverse-engineer the chain via `seo-meta.njk:17`. (`consistency.md`, `quality.md`.)

---

## 20. Quality concern — Line-number citation "lines 85–116" is brittle

### 20a. `docs/directives/i18n.md` §3 (line 60)

**Current text:**

> The upstream `eleventy-plugin-i18n` filter is broken for this project on two axes. The override at `eleventy.config.js` lines 85–116 fixes both:

**Revision:** Replace with:

> The upstream `eleventy-plugin-i18n` filter is broken for this project on two axes. The override (registered as the inline `i18nOverride` plugin in `eleventy.config.js`) fixes both:

### 20b. `docs/directives/eleventy-config.md` §2 — any line-range citation of the override

**Current text:** §2 references the override by registration name (`i18nOverride`) and does not currently cite the line range. No change needed.

**Reason:** Line ranges drift on every refactor. The override is the only inline plugin in `eleventy.config.js`, so naming it (`i18nOverride`) is unambiguous and stable. (`maintainability.md`, `quality.md`.)

---

## 21. Quality concern — "Three runtime npm dependencies plus `eleventy-plugin-i18n`" oddly counts to 4

**Spec location:** `docs/directives/eleventy-config.md` line 5

**Current text:**

> The framework is Eleventy v3 (ESM, `"type": "module"`) on Node 22. No bundler, no transpilation, no JS framework. Plain Nunjucks templates, plain CSS, vanilla ES modules. Three runtime npm dependencies plus `eleventy-plugin-i18n`.

**Revision:** Replace the last sentence with:

> Four runtime npm dependencies (see `package.json`).

**Reason:** `package.json` declares four dependencies — `@11ty/eleventy`, `@11ty/eleventy-img`, `@11ty/eleventy-navigation`, `eleventy-plugin-i18n` — all peers. The "three plus one" phrasing implied `eleventy-plugin-i18n` was a special case. (`consistency.md`, `quality.md`.)

---

## 22. Quality concern — `eleventy-config.md` §6 trailing `...` in the for-loop example misleads

**Spec location:** `docs/directives/eleventy-config.md` §6 (lines 189–197)

**Current text:**

> ```js
> for (const lang of ["is", "en"]) {
>   const suffix = lang === "is" ? "Is" : "En";
>   eleventyConfig.addCollection(`featuredServices${suffix}`, (api) =>
>     api.getFilteredByTag(`services-${lang}`)
>       .filter((item) => item.data.featured === true)
>       .sort((a, b) => (a.data.order || 0) - (b.data.order || 0))
>   );
>   // featuredSectors${suffix}, featuredArticle${suffix} ...
> }
> ```

**Revision:** Replace the snippet with:

```js
for (const lang of ["is", "en"]) {
  const suffix = lang === "is" ? "Is" : "En";
  eleventyConfig.addCollection(`featuredServices${suffix}`, (api) =>
    api.getFilteredByTag(`services-${lang}`)
      .filter((item) => item.data.featured === true)
      .sort((a, b) => (a.data.order || 0) - (b.data.order || 0))
  );
  eleventyConfig.addCollection(`featuredSectors${suffix}`, /* same shape, tag `sectors-${lang}` */);
  eleventyConfig.addCollection(`featuredArticle${suffix}`, /* same shape, tag `articles-${lang}`, sort by date desc, slice(0, 1) */);
}
```

**Reason:** The trailing `// … ...` implied a longer list of featured-collection families. The code defines exactly three (`featuredServicesIs/En`, `featuredSectorsIs/En`, `featuredArticleIs/En`). Naming the third explicitly and noting its `slice(0, 1)` deviation removes the ambiguity. (`consistency.md`, `quality.md`.)

---

## 23. Quality concern — `i18n.md` §3 lodash.get string mis-quoted

**Spec location:** `docs/directives/i18n.md` §3 (line 62)

**Current text:**

> 1. **Dotted key lookup.** The upstream filter does `lodash.get(translations, '[${key}][${locale}]')`, interpreting dots inside a key as path separators. Every key in our dictionary is dotted (`"ui.skip_to_content"`, `"footer.copyright"`, etc.) so the lookup always misses and returns the raw key. The override uses direct bracket-property access against the same `translations` object.

**Revision:** Replace with:

> 1. **Dotted key lookup.** The upstream filter does `` lodash.get(translations, `[${key}][${locale}]`) ``, interpreting dots inside a key as path separators. Every key in our dictionary is dotted (`"ui.skip_to_content"`, `"footer.copyright"`, etc.) so the lookup always misses and returns the raw key. The override uses direct bracket-property access against the same `translations` object.

**Reason:** Single-quoted JS strings do not interpolate `${...}` placeholders — the literal would resolve to the path `[${key}][${locale}]`, not `[ui.skip_to_content][is]`. The upstream code uses a backtick template literal; rendering the example with backticks matches reality. (`quality.md`, `consistency.md`.)

---

## 24. Quality concern — `templates-and-layouts.md` §1 `lang` row reverses dependency

**Spec location:** `docs/directives/templates-and-layouts.md` §1 — `base.njk` row in the frontmatter table (line 23)

**Current text:**

> | `base.njk` | `lang` (via `requireLang`) | `title`, `description`, `bodyClass`, `ogImage`, `ogImageAlt`, `ogType` |

**Revision:** Replace with:

> | `base.njk` | `lang` (required — `requireLang` throws if absent) | `title`, `description`, `bodyClass`, `ogImage`, `ogImageAlt`, `ogType` |

**Reason:** The previous phrasing "via `requireLang`" implied `lang` is required *by* `requireLang`. The correct reading: the page requires `lang`; `requireLang` is the guard that turns absence into a build error. (`consistency.md`, `quality.md`.)

---

## 25. Quality concern — Article schema doesn't cross-reference §10 `eleventyComputed`

**Spec location:** `docs/directives/content-and-frontmatter.md` §7 — article table (handled in revision §7 above)

**Status:** Already addressed in revision §7. The new article table row for `image` and the trailing note ("`article.njk` derives `eleventyComputed.ogImage` from `image` at the layout level — see §9. Article `.md` files do not declare `eleventyComputed.ogImage` themselves.") closes the loop.

**Reason:** A reader auditing article frontmatter would otherwise think `eleventyComputed.ogImage` should appear in the `.md`. (Note: the report calls it §10; the actual section is §9 in the current file. The cross-reference in revision §7 points to §9, which is correct against the file.) (`consistency.md`.)

---

## 26. Quality concern — ARCHITECTURE.md §7 introduces "Two families" but lists four

**Spec location:** `docs/ARCHITECTURE.md` §7 (lines 130–141)

**Current text:**

> ## 7. Custom collections
>
> Defined in `eleventy.config.js`. Two families:
>
> | Collection | Purpose |
> |---|---|
> | `navIs`, `navEn` | Primary-nav membership per locale. Filters `data.eleventyNavigation.order != null`; selects locale by URL prefix. |
> | `featuredServicesIs`, `featuredServicesEn` | Services with `featured: true`, sorted by `order` asc. |
> | `featuredSectorsIs`, `featuredSectorsEn` | Sectors with `featured: true`, sorted by `order` asc. |
> | `featuredArticleIs`, `featuredArticleEn` | The single most recent article with `featured: true`. |
>
> Naming convention: `<thing><Locale>` with PascalCase suffix. Sort is always explicit (never relies on default order).

**Revision:** Replace §7 with:

```markdown
## 7. Custom collections

Defined in `eleventy.config.js`. Two families: **nav** (one collection per locale) and **featured** (three collections per locale, one per content type).

| Collection | Purpose |
|---|---|
| `navIs`, `navEn` | Primary-nav membership per locale. Filters `data.eleventyNavigation.order != null`; selects locale by URL prefix. |
| `featuredServicesIs`, `featuredServicesEn` | Services with `featured: true`, sorted by `order` asc. |
| `featuredSectorsIs`, `featuredSectorsEn` | Sectors with `featured: true`, sorted by `order` asc. |
| `featuredArticleIs`, `featuredArticleEn` | Single most recent article with `featured: true` (sliced to 1). |

Naming convention: `<thing><Locale>` with PascalCase suffix. Sort is always explicit (never relies on default order).
```

**Reason:** The intro said "Two families"; the table showed four rows. Clarifying that "featured" is one family with three sub-collections aligns count with content. (`consistency.md`, `quality.md`.)

---

## 27. Quality concern — "Approximate ratio: 50+ `.md` files vs ~12 `.njk` files" will drift

**Spec location:** `docs/directives/content-and-frontmatter.md` §3 (line 50)

**Current text:**

> Approximate ratio in this project: 50+ `.md` files (per-locale collection entries) vs ~12 `.njk` files (listing pages, structured singletons, sitemaps, 404s, robots).

**Revision:** Delete the sentence entirely.

**Reason:** The preceding table already states the rule; the point-in-time count adds nothing and drifts on every content commit. (`simplicity.md`.)

---

## Notes for the implementer

- Revisions touch five files; each revision section names its specific target. Group by file when applying for fewer context switches, or apply in report order — both work.
- Later revisions assume earlier ones are in place. Read the whole file before starting. In particular: revision §7 changes the table shape that revision §25 cross-references, and revision §11d/e changes the §2 plugin-order prose; do §7 before §25, and do §11d/e in one pass.
- After all revisions: run `npm run build` from the project root. The directives are docs-only — the build must remain green and `_site/` content must be unchanged. The point of the run is to confirm nothing in the assertion scripts was inadvertently touched.
- Density target: `css-architecture.md` (201 lines). The revisions trim ~25% of total prose across the four directives. Concrete line-count expectations after revision: `eleventy-config.md` ≈ 290 (from 350), `content-and-frontmatter.md` ≈ 260 (from 318), `templates-and-layouts.md` ≈ 230 (from 252), `i18n.md` ≈ 250 (from 278), `ARCHITECTURE.md` ≈ 295 (from 335). These are targets, not contracts — accept any density gain that does not lose policy.
- On the orphan partials (revision §6): the document tells the reader the partials are unused and gives the binary choice (wire in or delete). Do not delete the partial files as part of this revision pass — that is a code change the project owner should make. Surface the question separately.

---

## Discovered during planning

Two additional issues surfaced while verifying claims. Surface to the project owner; do not silently fix in this pass.

1. **`docs/directives/css-architecture.md` §1 (line 12) has the same incorrect CSS load order** as ARCHITECTURE.md §10 (revision §2 above). The gold-standard reference file documents `tokens → reset → layout → nav → blocks → home → services → sectors → articles → about → quoter` but `base.njk` lines 35–45 load them as `tokens → reset → layout → nav → blocks → quoter → about → sectors → articles → services → home`. The current revision pass is scoped to the four new directives and ARCHITECTURE.md; `css-architecture.md` is out of scope per the original brief, but the contradiction warrants either fixing the doc or reordering `base.njk` — the latter would also flip the cascade-tie winners, so it is a code change with risk.

2. **Per-locale `_data/i18n.js` does not exist as separate files** — it is one shared dictionary file with `{is, en}` shapes per key. The directives describe this correctly, but the file path `src/_data/i18n.js` (singular, not per-locale) is consistent with how `eleventy-plugin-i18n` is configured. No change needed; this is a verification note to save the next implementer a search.
