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

Do not write a `.md` with a body that just contains a large `<section class="...">` block of HTML — if the page needs HTML structure, it's a `.njk`.

## 4. Directory data files

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

`article.njk` derives `eleventyComputed.ogImage` from `image` at the layout level — see §9. Article `.md` files do not declare `eleventyComputed.ogImage` themselves.

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

Image frontmatter values are absolute paths from the site root:

```yaml
image: "/img/server_room.jpg"
```

Source files live in `src/img/`. For how the path resolves at build time (raw passthrough vs. responsive transform), see [`eleventy-config.md`](./eleventy-config.md) §5 — that document owns the image pipeline rules.

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

HTML-in-frontmatter only works for fields the template renders with `| safe`. In particular, the CTA band partial renders `cta.heading` with `| safe` (HTML highlights are permitted there) but renders `cta.primaryLabel` and `cta.secondaryLabel` without `| safe` — embedded HTML in the button labels will display as escaped text. If a label needs emphasis, either move the emphasis to the heading or update `partials/cta-band.njk` to apply `| safe` to the label.

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
