# bruna-is — Site & Framework Architecture

This document is a **descriptive** map of how the bruna-is site is built. It describes shape, not policy. For the rules that govern *how* to extend the site, see [`docs/directives/`](./directives/).

If you're new to the project, read this in full first. It takes ~10 minutes and gives you the model. Then read the directive(s) relevant to whatever you're about to do.

---

## 1. What it is

A bilingual marketing site for **Brunaþéttingar ehf.**, an Icelandic contractor specializing in fire-sealing and technical insulation. Icelandic is primary; English is the secondary locale. The site is static, deployed to GitHub Pages.

Production: https://brunathettingar.github.io/bruna-is/

## 2. Stack

| Layer | Choice |
|---|---|
| Site generator | Eleventy v3 (ESM) |
| Template engine | Nunjucks |
| Markdown | Eleventy's built-in `markdown-it` |
| Image pipeline | `@11ty/eleventy-img` (responsive `<picture>` transform) |
| Navigation | `@11ty/eleventy-navigation` (frontmatter-driven nav + breadcrumbs) |
| i18n | Built-in `I18nPlugin` + `eleventy-plugin-i18n` + a custom override |
| Styling | Plain CSS, design tokens as custom properties, BEM naming |
| Scripting | Vanilla ES modules (single entry, per-feature files, no bundler) |
| Hosting | GitHub Pages (`/bruna-is/` subpath) |
| Runtime | Node 22 (local dev + CI) |

No bundler. No CSS preprocessor. No JS framework. No client-side router. The output is static HTML, CSS, JS, fonts, and images.

## 3. Source tree

```
.
├── eleventy.config.js          → build configuration: plugins, filters, collections
├── package.json                → 4 runtime deps + scripts (start, build, debug)
├── .github/workflows/
│   └── deploy.yml              → push to main → build → upload to GitHub Pages
├── scripts/
│   ├── check-build.js          → post-build assertions (run by `npm run build`)
│   └── check-css.js            → CSS architecture assertions (imported by check-build.js)
├── docs/
│   ├── ARCHITECTURE.md         → this file
│   └── directives/             → authoritative rules, read by AI agents and humans
│       ├── css-architecture.md
│       ├── eleventy-config.md
│       ├── content-and-frontmatter.md
│       ├── templates-and-layouts.md
│       └── i18n.md
├── mockup/                     → pre-Eleventy design archive (HTML, CSS, images)
└── src/
    ├── _data/                  → global data (meta.js, i18n.js, partners.js)
    ├── _includes/
    │   ├── layouts/            → layout templates (base, page, service, sector, article)
    │   └── partials/           → reusable fragments (header, footer, seo-meta, ...)
    ├── assets/
    │   ├── css/                → 11 stylesheets in load order
    │   ├── js/                 → ES modules (main.js entry + per-feature)
    │   ├── fonts/              → Inter 400/600 WOFF2
    │   └── img/                → favicon, logo, OG default
    ├── content/
    │   ├── is/                 → Icelandic content tree (root locale)
    │   │   ├── is.11tydata.js  → lang: "is" + permalink derivation
    │   │   ├── index.njk       → /
    │   │   ├── 404.njk         → /404.html
    │   │   ├── sitemap.njk     → /sitemap.xml
    │   │   ├── about/          → /about/  +  milestones, principles, team subcollections
    │   │   ├── thjonusta/      → /thjonusta/  (services collection)
    │   │   ├── geirar/         → /geirar/  (sectors collection)
    │   │   ├── greinar/        → /greinar/  (articles collection)
    │   │   └── verdreiknir/    → /verdreiknir/  (quote calculator)
    │   ├── en/                 → English content tree (mirrors `is/`, prefixed `/en/`)
    │   └── robots.njk          → /robots.txt
    └── img/                    → raw image originals (passthrough copied to `/img/`)
```

The `mockup/` directory is reference-only; it contains the pre-Eleventy design HTML and is not part of the build.

## 4. Layout inheritance

```
base.njk
  └─ page.njk
       ├─ service.njk    (used by src/content/{is,en}/thjonusta/*.md)
       ├─ sector.njk     (used by src/content/{is,en}/geirar/*.md)
       └─ article.njk    (used by src/content/{is,en}/greinar/*.md)
```

`.njk` content pages declare `layout: layouts/page.njk` and inline their own markup directly. `.md` content pages inherit a leaf layout from their directory data file.

| Layout | Renders |
|---|---|
| `base.njk` | `<!doctype html>`, `<head>` (meta, hreflang, CSS chain, WebSite JSON-LD), `<body>` wrapper, svg-defs sprite, main.js script tag. |
| `page.njk` | Skip-link, utility bar, header, `<main>`, optional breadcrumb, footer. |
| `service.njk` | Page-hero, service-feature card (number/category/title/insight/bullets), prose, Service JSON-LD, CTA band. |
| `sector.njk` | Page-hero, sector prose, optional tag list, CTA band. |
| `article.njk` | Page-hero, article-meta (date/read-time/author), prose, Article JSON-LD, CTA band. |

Full layout rules: [`directives/templates-and-layouts.md`](./directives/templates-and-layouts.md).

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

## 6. Content model

Three collections, each a directory under `src/content/<lang>/` with a directory-data file that applies shared tags, layout, body class, permalink, and breadcrumb parent.

| Collection | Directory | Layout | Body class | URL shape |
|---|---|---|---|---|
| Services | `thjonusta/` | `layouts/service.njk` | `services-page` | `/thjonusta/<slug>/` |
| Sectors | `geirar/` | `layouts/sector.njk` | `sectors-page` | `/geirar/<slug>/` |
| Articles | `greinar/` | `layouts/article.njk` | `articles-page` | `/greinar/<slug>/` |

About-page subcollections (`milestones`, `principles`, `team`) follow the same pattern but render only inside the about page — they're not in the primary nav.

Detail-page filenames are identical across locales: `fireproofing.md` exists in both `is/thjonusta/` and `en/thjonusta/` so `locale_links` pairs them automatically.

Frontmatter schemas per page type: [`directives/content-and-frontmatter.md`](./directives/content-and-frontmatter.md) §7.

## 7. Custom collections

Defined in `eleventy.config.js`. Two families: **nav** (one collection per locale) and **featured** (three collections per locale, one per content type).

| Collection | Purpose |
|---|---|
| `navIs`, `navEn` | Primary-nav membership per locale. Filters `data.eleventyNavigation.order != null`; selects locale by URL prefix. |
| `featuredServicesIs`, `featuredServicesEn` | Services with `featured: true`, sorted by `order` asc. |
| `featuredSectorsIs`, `featuredSectorsEn` | Sectors with `featured: true`, sorted by `order` asc. |
| `featuredArticleIs`, `featuredArticleEn` | Single most recent article with `featured: true` (sliced to 1). |

Naming convention: `<thing><Locale>` with PascalCase suffix. Sort is always explicit (never relies on default order).

## 8. i18n architecture

Two parallel trees (`src/content/is/`, `src/content/en/`) ship from one build. `lang` is set on each tree by the locale-root data file (`is.11tydata.js`, `en.11tydata.js`) and inherits via the data cascade.

Three plugin layers handle locale concerns:

```
I18nPlugin (built-in)       → page.lang, locale_url filter, locale_links filter
eleventy-plugin-i18n        → loads the UI string dictionary from _data/i18n.js
i18nOverride (inline)       → corrected `i18n` filter (replaces upstream's broken one)
```

The custom override patches two upstream bugs:

1. Upstream uses `lodash.get(translations, "[${key}][${locale}]")` — dots in our dictionary keys (`ui.skip_to_content`) are misinterpreted as path separators.
2. Upstream autodetects locale from `url.split('/')[1]` — returns `'about'` (not `'is'`) for IS-at-root pages like `/about/`.

The override does direct bracket-property lookup against `translations` and requires callers to pass `lang` explicitly: `{{ "key" | i18n(lang) }}`.

URL strategy: Icelandic at the root, English under `/en/`. Slugs use Icelandic terms in both locales — URLs do not translate.

Locale parity rule: every IS page must have an EN sibling. Enforced by the `check-build.js` parallel-slug warning.

`hreflang` alternates plus an `x-default` pointing to IS are emitted in `base.njk` on every page.

Full rules: [`directives/i18n.md`](./directives/i18n.md).

## 9. Image pipeline

Two coexisting paths: `eleventyImageTransformPlugin` rewrites every `<img src="/img/…">` into a responsive `<picture>` (AVIF/WebP/JPEG at 400/800/1200/auto); `src/img/` is passthrough-copied to `_site/img/` so the raw originals stay at stable URLs for `og:image`, JSON-LD `image`, and JSON-LD `logo` consumers.

Full rules — formats, widths, `transformOnRequest`, and the asset-resolution check — in [`directives/eleventy-config.md`](./directives/eleventy-config.md) §5.

## 10. CSS architecture

Plain CSS in 11 stylesheets, loaded in fixed order from `base.njk`:

```
tokens → reset → layout → nav → blocks → quoter → about → sectors → articles → services → home
```

Design tokens (colors, type, spacing, radii, shadows, motion, breakpoints) live in `tokens.css`. Outside `tokens.css`: no raw hex codes, no `rgba()`, no `px` (except `1px solid` borders).

BEM naming throughout. Page-family CSS scopes every rule under a root class (`.home-page .hero`, `.services-page .services-intro`). Max 2 levels of nesting after the scope class.

Mobile-first responsive (`@media (min-width: ...)` add-ons, never the reverse). Logical properties (`margin-inline`, `padding-block`) preferred. Motion respects `prefers-reduced-motion` via token override.

Full rules: [`directives/css-architecture.md`](./directives/css-architecture.md).

## 11. JavaScript

Single entry point `src/assets/js/main.js` imports per-feature modules. Each feature module follows the "query, bail, attach" pattern:

```js
export function initFeatureName() {
  const root = document.querySelector('.feature-root');
  if (!root) return;
  // attach listeners, manage state via class toggles + ARIA attributes
}
```

Current feature modules:

| Module | Controls |
|---|---|
| `mobileNav.js` | Header mobile-nav disclosure toggle. |
| `quoteCalculator.js` | The quote-calculator interactive form on `/verdreiknir/`. |
| `quote-config.js` | Pricing config consumed by the quote calculator. |

No bundler. Browsers load `main.js` via `<script type="module">` and resolve imports natively.

## 12. Build pipeline

```
npm start  ─→  npx @11ty/eleventy --serve
                ├─ watches src/, _data/, _includes/, eleventy.config.js
                ├─ live-reload on _site/assets/**/*.{css,js}
                └─ lazy image transform (transformOnRequest: true)

npm run build ─→ npx @11ty/eleventy  ──→  node scripts/check-build.js
                                          ├─ TBD placeholders
                                          ├─ Unrendered Nunjucks
                                          ├─ Sitemap floor (≥ 15 URLs/locale)
                                          ├─ Mobile-nav selector contract
                                          ├─ Asset URL resolution
                                          ├─ OG title escaping
                                          ├─ Parallel-slug warning
                                          ├─ <picture> exists (transform fired)
                                          ├─ Translation-miss surfacing
                                          └─ check-css.js (CSS architecture)
                                              ├─ 11 CSS files present
                                              ├─ Token discipline
                                              ├─ Selector depth budget
                                              ├─ !important rationale comments
                                              └─ No inline styles
```

Build verification is non-optional. Run `npm run build` locally before pushing to ensure deployment doesn't ship with `[TBD` placeholders, unrendered template tags, missing assets, or CSS architecture violations.

Full pipeline rules: [`directives/eleventy-config.md`](./directives/eleventy-config.md) §9.

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

## 14. Conventions at a glance

| Concern | Rule | Directive |
|---|---|---|
| Plugin discipline | Existing plugin set is canonical. Add only with justification. | [`eleventy-config.md`](./directives/eleventy-config.md) §2 |
| New filter | Pure, small, named for the verb. Register in `eleventy.config.js`. | [`eleventy-config.md`](./directives/eleventy-config.md) §4 |
| New collection | Defined in `eleventy.config.js`, sort explicit, `<thing><Locale>` naming. | [`eleventy-config.md`](./directives/eleventy-config.md) §6 |
| New page | Add IS + EN sibling in the same commit. `bodyClass` required. | [`content-and-frontmatter.md`](./directives/content-and-frontmatter.md) §9 |
| New layout | Extend `page.njk` (never `base.njk` directly). Max chain depth = 3. | [`templates-and-layouts.md`](./directives/templates-and-layouts.md) §1 |
| New partial | Used in ≥ 2 templates, or named after a contract that survives its callsite. | [`templates-and-layouts.md`](./directives/templates-and-layouts.md) §2 |
| Translatable chrome | Dictionary key in `_data/i18n.js`. Page-specific copy in frontmatter. | [`i18n.md`](./directives/i18n.md) §8 |
| Image asset | Drop in `src/img/`, reference as `/img/<name>.<ext>`. Write `<img>`, never `<picture>`. | [`eleventy-config.md`](./directives/eleventy-config.md) §5 |
| CSS rule | One stylesheet per page family; tokens for all values; BEM naming; ≤ 2 levels after scope. | [`css-architecture.md`](./directives/css-architecture.md) |
| Inline styles | Never. Enforced by `check-css.js`. | [`css-architecture.md`](./directives/css-architecture.md) §4 |

## 15. Upstream documentation

The directives cover the policy. For framework-internal questions the directives don't address, two upstream resources are load-bearing because this project depends on the documented behavior:

- `eleventy-plugin-i18n` (Adam Duncan): https://github.com/adamduncan/eleventy-plugin-i18n — read this if you touch the `i18nOverride` (the override exists because upstream's lookup is broken for dotted keys).
- `eleventy-img` HTML transform: https://www.11ty.dev/docs/plugins/image/#eleventy-transform — read this if you touch the dual image pipeline.

For everything else, Eleventy docs are one click from https://www.11ty.dev/docs/.

---

## Where to read next

- Doing a CSS change? Read [`directives/css-architecture.md`](./directives/css-architecture.md).
- Adding a page or changing frontmatter? Read [`directives/content-and-frontmatter.md`](./directives/content-and-frontmatter.md).
- Editing a layout or partial? Read [`directives/templates-and-layouts.md`](./directives/templates-and-layouts.md).
- Touching `eleventy.config.js`? Read [`directives/eleventy-config.md`](./directives/eleventy-config.md).
- Adding a translation or changing locale behavior? Read [`directives/i18n.md`](./directives/i18n.md).

These five documents plus this overview are the durable docs for the project. Anything else under `docs/` is process artifact and should be deleted when stale.
