# Content & Frontmatter Directive — bruna-is

This document defines the rules for the content tree, file types, directory data, and frontmatter on the bruna-is site. Treat it as the single source of truth. Deviations require a documented rationale where the deviation lives.

Content lives under `src/content/{is,en}/`, organized into collections by directory. Per-directory data files set tags, layouts, and permalinks for everything inside them. Per-page frontmatter carries the content fields that vary between pages of the same type.

---

## 1. Locale tree structure

Two parallel content trees, one per locale:

```
src/content/
├── is/                       (Icelandic — serves at /)
│   ├── is.11tydata.js        (sets lang: "is" + permalink derivation)
│   ├── index.njk             → /
│   ├── 404.njk               → /404.html
│   ├── sitemap.njk           → /sitemap.xml
│   ├── about/index.njk       → /about/
│   ├── thjonusta/            (services collection)
│   │   ├── thjonusta.json    (directory data — tags, layout, permalink)
│   │   ├── index.njk         → /thjonusta/
│   │   └── <slug>.md         → /thjonusta/<slug>/
│   ├── geirar/               (sectors collection — same pattern)
│   ├── greinar/              (articles collection — same pattern)
│   └── verdreiknir/index.njk → /verdreiknir/
└── en/                       (English — serves at /en/)
    └── (parallel structure)
```

The IS and EN trees are **structurally identical**: matching directories, matching filenames, parallel frontmatter shape, parallel directory data files (`<dir>.json` per locale). See [`i18n.md`](./i18n.md) §9 for the locale parity rule.

The `lang` field is set at the locale-root level by `is.11tydata.js` / `en.11tydata.js`. Every file under that root inherits `lang` via the Eleventy data cascade — no page declares `lang` in its own frontmatter.

## 2. URL slugs

URLs use Icelandic slugs in both locales (`/thjonusta/`, `/geirar/`, `/greinar/`, `/verdreiknir/`). See [`i18n.md`](./i18n.md) §1 for the rationale. Detail-page slugs (e.g. `fireproofing.md`, `ei-rating-explained.md`) are identical across locales so `locale_links` pairs them automatically.

The permalink shape for each collection is set by the directory data file (see §4), not by frontmatter. Do not declare `permalink:` in a content `.md` unless you have a documented reason to deviate from the collection's shape.

## 3. Markdown versus Nunjucks

| Use `.md` when… | Use `.njk` when… |
|---|---|
| The page is a detail entry inside a collection (service, sector, article). | The page is a listing index (loops a collection) or a structured composition (home, about, quoter). |
| The body is prose and the layout owns the structure. | The page composes multiple structured sections with their own data shapes (hero, statement, pillars, leading, customers strip). |
| All variation between instances fits in flat frontmatter keys. | Variation requires nested arrays-of-objects, conditional sections, or loops. |

Approximate ratio in this project: 50+ `.md` files (per-locale collection entries) vs ~12 `.njk` files (listing pages, structured singletons, sitemaps, 404s, robots).

Do not write a `.md` with a body that just contains a large `<section class="...">` block of HTML — if the page needs HTML structure, it's a `.njk`.

## 4. Directory data files

Every collection has a directory data file: `<dir>/<dir>.json` (preferred for static config) or `<dir>/<dir>.11tydata.js` (only when computation is required).

These files apply shared frontmatter to every page in the directory. Required keys for a collection:

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

Concrete example — `src/content/is/thjonusta/thjonusta.json`:

```json
{
  "tags": ["services", "services-is"],
  "layout": "layouts/service.njk",
  "bodyClass": "services-page",
  "permalink": "/thjonusta/{{ page.fileSlug }}/",
  "eleventyNavigation": {
    "parent": "services-is"
  }
}
```

The EN parallel — `src/content/en/thjonusta/thjonusta.json`:

```json
{
  "tags": ["services", "services-en"],
  "layout": "layouts/service.njk",
  "bodyClass": "services-page",
  "permalink": "/en/thjonusta/{{ page.fileSlug }}/",
  "eleventyNavigation": {
    "parent": "services-en"
  }
}
```

Notes:

- **Tags are dual.** Always tag both `<collection>` (cross-locale) and `<collection>-<locale>` (per-locale). Custom collections in `eleventy.config.js` filter on the per-locale tag (see [`eleventy-config.md`](./eleventy-config.md) §6).
- **`bodyClass` is required** so the page-family CSS scope applies. See [`css-architecture.md`](./css-architecture.md) §3.
- **`eleventyNavigation.parent`** chains breadcrumbs upward from detail pages to their listing index. The parent key suffix matches locale (`-is` / `-en`).
- **Tags are set in directory data, never in frontmatter.** Frontmatter additions to `tags:` would replace (not merge with) the directory-data array.

## 5. Permalink derivation

For pages that are not inside a collection (singletons like `verdreiknir/index.njk`, `about/index.njk`), the permalink comes from the locale-root data file at `is.11tydata.js` / `en.11tydata.js`. That file:

1. Honors an explicit `permalink:` set in the page's frontmatter (when it starts with `/`).
2. Otherwise derives the URL by stripping `/content/<lang>/` from the file path stem and stripping trailing `/index`.

Do not collapse this derivation to a declarative template string. Standalone pages would otherwise emit incorrect paths (e.g. `/is/verdreiknir/` rather than `/verdreiknir/`).

Collection detail pages use the directory data's `permalink:` template (`"/thjonusta/{{ page.fileSlug }}/"`) — this takes precedence over the locale-root derivation because it's set lower in the cascade.

## 6. `eleventyNavigation` contract

Every primary-nav page declares an `eleventyNavigation` block in its own frontmatter:

```yaml
eleventyNavigation:
  key: services-is
  order: 2
```

Rules:

- **`key` is required for any page that appears in the nav.** Always suffix with `-is` or `-en` so the navigation plugin doesn't merge IS and EN entries into one tree.
- **`order` controls position in the nav.** Lower numbers come first. Use small gaps (1, 2, 3) — not large ones — and renumber consecutively when reordering.
- **Pages without `order` are excluded from `navIs` / `navEn`.** The collections in `eleventy.config.js` filter on `eleventyNavigation.order != null`, so a page with `key` but no `order` is reachable for breadcrumbs only, not the nav.
- **`parent` chains breadcrumbs.** Detail pages get this from the directory data file; top-level pages typically don't have a parent.

Currently established keys (IS):

| Page | `key` | `order` |
|---|---|---|
| Home (`/`) | `home-is` | 1 |
| Services (`/thjonusta/`) | `services-is` | 2 |
| Sectors (`/geirar/`) | `sectors-is` | 3 |
| Quote calculator (`/verdreiknir/`) | `quote-is` | 4 |
| About (`/about/`) | `about-is` | 5 |
| Articles (`/greinar/`) | `articles-is` | 6 |

EN parallels are identical structure with `-en` suffix. When adding a new nav page, pick the next available `order` and add the EN sibling in the same commit.

## 7. Frontmatter schema by page type

### Home page (`index.njk` per locale) — `.njk`

The home page composes multiple structured sections. Required keys:

| Field | Type | Purpose |
|---|---|---|
| `layout` | `"layouts/page.njk"` | Layout chain. |
| `title` | string | Browser tab title, fallback for OG. |
| `description` | string | `<meta name="description">`. |
| `bodyClass` | `"home-page"` | CSS page-family scope. |
| `eleventyNavigation.key` | `"home-is"` / `"home-en"` | Nav membership. |
| `eleventyNavigation.order` | `1` | Nav position. |
| `heroHeading` | string | Hero H1 (may contain `<br>` for line breaks). |
| `statement.label` / `.heading` / `.lead` | object | "What we do" block. |
| `pillars[]` | array | Service pillar cards. |
| `leading[]` | array | Leading-projects section. |
| `customers[]` | array | Customer logos row. |

Section keys (`statement`, `pillars`, etc.) are page-specific — they're read by the home `.njk` template, not by any layout. Adding a new section means adding both the frontmatter key and the template rendering.

### Service detail (`thjonusta/<slug>.md`) — `.md`

| Field | Type | Required | Purpose |
|---|---|---|---|
| `title` | string | yes | H1 + OG title. May contain inline HTML (`<br>`, `<strong>`) — rendered with `\| safe`. |
| `image` | string | yes | Hero/feature image path: `/img/<name>.jpg`. |
| `summary` | string | yes | Lead paragraph + meta description. |
| `number` | string | yes | Service number badge (`"01"`, `"02"`, …). |
| `category` | string | yes | Category label next to number. |
| `order` | int | yes | Sort order inside the collection. |
| `featured` | bool | yes | Whether to include in home page's featured services. |
| `icon` | string | yes | Icon symbol id from `svg-defs.njk` (`pillar-fireproofing`). |
| `insightStrong` | string | yes | Bold lead of insight callout. |
| `insight` | string | yes | Insight callout body. May contain inline HTML. |
| `bullets[]` | array of string | yes | Service-feature bullet list. Items may contain inline HTML. |
| `imageContain` | bool | no | Set true to render the feature image in `object-fit: contain` mode (off-white plate). Default cover. |

### Sector detail (`geirar/<slug>.md`) — `.md`

| Field | Type | Required | Purpose |
|---|---|---|---|
| `title` | string | yes | H1. |
| `image` | string | yes | Hero image path. |
| `description` | string | yes | Hero kicker + meta description. |
| `order` | int | yes | Sort order. |
| `featured` | bool | yes | Whether to feature on home page. |
| `number` | string | yes | Card badge number. |
| `tagLabels[]` | array of string | no | Pills shown beneath the sector body. |

### Article (`greinar/<slug>.md`) — `.md`

| Field | Type | Required | Purpose |
|---|---|---|---|
| `title` | string | yes | H1 + OG title. |
| `image` | string | yes | Hero image path. |
| `summary` | string | yes | Lead paragraph + meta description. |
| `date` | YAML date | yes | Publication date (`2026-04-02`). |
| `featured` | bool | yes | Whether to surface as the featured article. |
| `category` | string | yes | Category label. |
| `readTimeMinutes` | int | yes | Estimated read time (combines with `articles.read_time_minutes` translation). |
| `author` | string | yes | Author display name. |

### About page (`about/index.njk`) — `.njk`

The about page renders three subcollections (`milestones-is/en`, `principles-is/en`, `team-is/en`) defined by subdirectories under `about/`. Each subcollection follows the same directory-data pattern as services/sectors/articles, but the pages are not navigation children — they exist only to populate the about page's lists.

About-page frontmatter has the same shape as the home page (sections specific to the about template).

### Listing page (`<collection>/index.njk`) — `.njk`

| Field | Type | Required | Purpose |
|---|---|---|---|
| `layout` | `"layouts/page.njk"` | yes | Layout chain. |
| `title` | string | yes | H1 + OG title. |
| `description` | string | yes | `<meta name="description">`. |
| `permalink` | `/<icelandic-slug>/` | yes | Locale-prefixed in EN file. |
| `bodyClass` | `"<page-family>-page"` | yes | CSS scope. |
| `eleventyNavigation.key` | `"<key>-<lang>"` | yes | Nav membership. |
| `eleventyNavigation.order` | int | yes | Nav position. |
| `kicker` | string | yes | Hero kicker tagline. |
| `intro.label` / `.heading` / `.paragraphs[]` | object | usually | Intro section copy. |
| `valueBand.label` / `.heading` / `.paragraphs[]` | object | usually | Value-band section. |
| `cta.heading` / `.primaryLabel` / `.primaryHref` / `.secondaryLabel` / `.secondaryHref` | object | usually | CTA band. |

The `cta` block is consumed by `partials/cta-band.njk` — see [`templates-and-layouts.md`](./templates-and-layouts.md) §2.

## 8. Image fields

Image fields use absolute paths from the site root:

```yaml
image: "/img/server_room.jpg"
```

Source files live in `src/img/`. The path resolves to two things at build time:

1. **The raw file at `/img/server_room.jpg`** (via the `src/img` passthrough copy). This is the URL referenced by `<meta property="og:image">`, JSON-LD `image` fields, and any other consumer that needs a stable unhashed URL.
2. **A responsive `<picture>` block** automatically when the path appears inside an `<img src="...">` tag in a template. The `eleventy-img` plugin transforms it. See [`eleventy-config.md`](./eleventy-config.md) §5.

Do not use relative paths (`../../img/foo.jpg`) — always absolute from site root. Do not paste image markup as `<picture>` by hand — write `<img src="..." alt="" width="..." height="...">` and let the plugin transform.

## 9. `eleventyComputed` for OG image derivation

Leaf layouts derive `ogImage` from the page's own `image` field:

```yaml
---
layout: layouts/page.njk
eleventyComputed:
  ogImage: "{{ image }}"
ogType: "article"
---
```

This makes the hero image double as the social-share image without requiring the content author to declare `ogImage` twice. Override in frontmatter only if the social image needs to differ from the hero.

## 10. Translatable strings versus frontmatter

The boundary between dictionary strings and frontmatter:

- **Reusable chrome strings** (nav labels, footer headings, CTA button labels) → `src/_data/i18n.js`. Each entry has both `is` and `en` values.
- **Per-page copy** (hero headings, body prose, page-specific CTA `heading` text) → frontmatter in the per-locale source file.

The CTA band illustrates the split: button labels (`cta.primaryLabel: "Fá verðmat"`) live in frontmatter because they're context-specific; the underlying reusable label (`cta.get_quote`) exists in the dictionary for templates that want to render the same button without a per-page CTA block.

See [`i18n.md`](./i18n.md) §8 for the full rule.

## 11. HTML inside frontmatter strings

Frontmatter strings may contain inline HTML for emphasis or line breaks:

```yaml
title: "Lausnir <span class=\"home-page__highlight\">fyrir mannvirki</span>"
heroHeading: "Brunaþéttingar<br>& tæknieinangrun."
```

Rules:

- Only use HTML for **semantic emphasis** (`<strong>`, `<em>`), **visual highlights** (`<span class="…__highlight">`), or **forced line breaks** in headings (`<br>`).
- Never use HTML for layout (`<div>`, `<section>`, lists). If a content shape needs structure, it belongs in the frontmatter data shape (e.g. an array), not in a string.
- Templates rendering the field append `| safe` to pass the HTML through unescaped — see [`templates-and-layouts.md`](./templates-and-layouts.md) §4.

YAML escapes double quotes as `\"`. JSON keys don't need this — Eleventy parses both YAML and JSON frontmatter.

---

## Enforcement appendix

`scripts/check-build.js` (run by `npm run build`) machine-checks the following:

- **No `[TBD` placeholders** in built HTML — surfaces unfilled frontmatter or content stubs.
- **Parallel-slug warning** (§1) — IS slug without an EN parallel and vice versa.
- **Sitemap floor** — at least 15 `<url>` entries per locale (top-level pages + collection entries).

Conventions enforced by review (no automated check):

- §3 `.md` vs `.njk` choice.
- §4 directory data shape, dual-tagging.
- §5 permalink derivation — no `permalink:` in detail-page frontmatter unless deviating.
- §6 `eleventyNavigation` key suffix and order discipline.
- §7 frontmatter schema by page type — required keys present, optional keys omitted when not used.
- §8 absolute image paths from `/img/`.
- §11 HTML in frontmatter limited to emphasis, highlights, line breaks.

See also:
- [`i18n.md`](./i18n.md) — locale parity, translation dictionary, `requireLang`.
- [`templates-and-layouts.md`](./templates-and-layouts.md) — which layout consumes which frontmatter keys.
- [`eleventy-config.md`](./eleventy-config.md) — collections that consume frontmatter (`featured`, `order`).
- [`css-architecture.md`](./css-architecture.md) §3 — `bodyClass` and the page-family scope.
