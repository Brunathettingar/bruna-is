# Templates & Layouts Directive — bruna-is

This document defines the rules for Nunjucks templates, layouts, and partials on the bruna-is site. Treat it as the single source of truth. Deviations require a documented rationale where the deviation lives.

The framework is Eleventy v3 with the Nunjucks template engine. The pattern is layout chaining: a leaf template extends a page template, which extends the base. Templates render data; they do not compute it.

---

## 1. Layout inheritance chain

```
base.njk          ← <html>, <head>, CSS chain, WebSite JSON-LD, body wrapper
  └─ page.njk    ← skip-link, utility bar, header, <main>, breadcrumb, footer
       ├─ service.njk   ← page-hero, service-feature block, prose, Service JSON-LD
       ├─ sector.njk    ← page-hero, sector prose, tag list
       └─ article.njk   ← page-hero, article-meta, prose, Article JSON-LD
```

Every **HTML content** page uses `layouts/page.njk` (directly or through a leaf). `base.njk` is never used directly except as the parent of `page.njk`. Non-HTML / non-content templates — `sitemap.njk`, `robots.njk`, `404.njk` — render directly without a layout (no chrome required, or chrome would interfere with the output format).

| Layout | Required frontmatter | Optional frontmatter |
|---|---|---|
| `base.njk` | `lang` (required — `requireLang` throws if absent) | `title`, `description`, `bodyClass`, `ogImage`, `ogImageAlt`, `ogType` |
| `page.njk` | (inherits) | `eleventyNavigation.parent` (enables breadcrumb), `bodyClass` |
| `service.njk` | `title`, `image`, `summary`, `number`, `category`, `insightStrong`, `insight`, `bullets[]` | `imageContain` |
| `sector.njk` | `title`, `image`, `description` | `tagLabels[]` |
| `article.njk` | `title`, `image`, `summary`, `date`, `readTimeMinutes`, `author` | — |

Leaf layouts may set `eleventyComputed.ogImage: "{{ image }}"` to expose the page image as the OG image automatically.

When neither `ogImage` nor `eleventyComputed.ogImage` is set on a page, `partials/seo-meta.njk` falls back to `meta.ogImage` (`/assets/img/og-default.jpg`). This is the path most `.njk` pages take — see [`content-and-frontmatter.md`](./content-and-frontmatter.md) §9 for the precedence.

When adding a new leaf layout, extend `page.njk` (`layout: layouts/page.njk` in its frontmatter), never `base.njk` directly. Page chrome (skip link, utility bar, header, footer, breadcrumb) is owned by `page.njk`.

## 2. Partial conventions

Partials live in `src/_includes/partials/` and are included with `{% include "partials/<name>.njk" %}`. Use a partial when the same markup appears in **two or more** templates. Inline it otherwise — even if long. The exception: a markup block with a name that survives outside its callsite (`seo-meta`, `cta-band`, `svg-defs`) earns a partial even if used once, because the name itself is the contract.

Do not partial out:

- Markup used once. Inline it in the leaf layout.
- Logic. Partials render HTML; if you'd ship the same block three times with three different data shapes, the right answer is to put the data in `_data/` or in a filter, not to parametrize a partial.

Naming: partials are named by **what they render**, not by where they appear.

```
✅ header.njk, footer.njk, utility-bar.njk, breadcrumb.njk, cta-band.njk, seo-meta.njk, svg-defs.njk
❌ home-top.njk, about-bottom.njk, page-section-3.njk
```

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

## 3. No logic in templates

Templates render data. Computation belongs upstream:

- **Site-wide data** → `src/_data/*.js` (or `*.json` if no logic needed).
- **Per-directory data** → `<dir>/<dir>.11tydata.js` or `<dir>/<dir>.json`.
- **Per-page data** → frontmatter (or `eleventyComputed.*` for derivation from other frontmatter).
- **Reusable transforms** → custom filter registered in `eleventy.config.js`.

In a template:

- ✅ `{{ value }}`, `{% for item in collection %}`, `{% if condition %}`, `{% set varName = expr %}` (when binding a fallback chain once for reuse — see `seo-meta.njk`).
- ❌ Multi-line data manipulation (`{% set parts = url.split('/') %}` and then five lines of trimming), inline computation of values that any other template would also need, conditional rendering nested three levels deep.

Rule of thumb: if a `{% if %}` chain runs more than two cases deep, the data shape is wrong — push the decision up to the data layer and pass a single resolved value into the template.

## 4. The `| safe` filter — when to use it

Nunjucks auto-escapes string output. The `| safe` filter marks a value as trusted HTML and skips escaping. Use it when:

1. **Page content from Markdown.** `{{ content | safe }}` — required at the top of every layout that wraps `{{ content }}`. The Markdown engine produces HTML; without `| safe` it renders as escaped tags.
2. **Frontmatter strings that intentionally contain HTML.** Inline highlight spans (`<span class="value-band__highlight">...</span>`), `<strong>` callouts, `<br>` line breaks in chrome strings (`"brand.tagline"`). Convention: only use HTML for semantic emphasis or visual highlights — never for layout.
3. **Translated dictionary values that contain HTML.** `{{ "brand.tagline" | i18n(lang) | safe }}`.

Never apply `| safe` to:

- User input or anything sourced from outside the repo.
- Values that will be embedded in attributes (`<a href="{{ url }}">`) — those need attribute escaping, which `| escape` handles.
- The output of `| jsonEscape` — that filter is for JSON contexts, not HTML.

In the seo-meta partial, escape behavior is bound once into a local variable to avoid the Nunjucks `or`/`|` precedence trap:

```njk
{# ✅ Correct — paren around the full fallback chain ensures escape applies to all branches #}
{%- set pageTitle = (title or meta.byLocale[lang].title) | escape %}

{# ❌ Wrong — Nunjucks parses as `title or (meta.byLocale[lang].title | escape)`,
   leaving `title` unescaped on the hot path #}
{{ title or meta.byLocale[lang].title | escape }}
```

Preserve the parens-around-chain pattern in `seo-meta.njk`. Do not refactor it into inline filters.

## 5. Whitespace control

Use `{%- ... -%}` to trim whitespace before/after control statements. Convention across all templates:

- `{%- include "..." %}` when the include sits inside a parent block; otherwise `{% include "..." %}`.
- `{%- for ... %}` / `{%- endfor %}` to collapse the newlines surrounding the loop.
- `{%- if ... %}` / `{%- endif %}` for the same reason.

This is convention, not enforcement. The rule: be consistent within a file. Do not mix `{%- %}` and `{% %}` on the same construct across one template.

## 6. SEO meta partial — the value chain pattern

`partials/seo-meta.njk` binds page-derived values once at the top:

```njk
{%- set pageTitle       = (title or meta.byLocale[lang].title) | escape %}
{%- set pageDescription = (description or summary or meta.byLocale[lang].description) | escape %}
{%- set pageImageAlt    = (ogImageAlt or title or meta.byLocale[lang].ogImageAlt) | escape %}
{%- set siteName        = meta.byLocale[lang].title | escape %}
{%- set socialImage     = ogImage or meta.ogImage %}
```

Then references them throughout the OG + Twitter blocks. This guarantees:

- `<title>`, `<meta name="description">`, and OG/Twitter descriptions agree per page (chained from the same precedence: `title or summary or default`).
- Escape applies to **all** branches of every fallback chain (see §4 on the paren trap).
- The fallback precedence is declared once, not repeated in every meta tag.

When adding a new OG/Twitter field, bind its fallback chain at the top using the same paren-escape shape, then reference the bound name below.

## 7. JSON-LD blocks

Every detail layout emits a per-page JSON-LD `<script type="application/ld+json">` block with the appropriate `@type`:

- Article pages → `Article` schema, with `author`, `datePublished`, `dateModified`, `publisher`, `image`, `mainEntityOfPage`.
- Service pages → `Service` schema, with `name`, `description`, `image`, `provider`.
- Home/site pages → `WebSite` schema in `base.njk` (emitted on every page).

Conventions:

- Wrap in `<script type="application/ld+json">…</script>`, not a `<meta>` tag.
- Every user-controlled string passes through `| jsonEscape` — never raw `{{ value }}` inside JSON. This includes `title`, `summary`, `author`, `description`, and image paths.
- Every block includes `"inLanguage": "{{ lang }}"`.
- Absolute URLs use `{{ meta.url }}{{ ... }}` so they resolve to full `https://…` URLs (search engines reject path-relative URLs in JSON-LD).
- The image field uses the raw passthrough path (`{{ meta.url }}{{ image }}`), not a transformed picture URL — see [`eleventy-config.md`](./eleventy-config.md) §5.

If a new structured-data type is needed (e.g. `Product`, `BreadcrumbList`, `Organization`), follow the same template shape: open with `@context` and `@type`, escape every dynamic string, include `inLanguage`, use `meta.url`-prefixed absolute paths for any URL field.

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

## 9. No inline styles, no `<style>` blocks

Every visual rule lives in `src/assets/css/`. Templates contain zero `style="..."` attributes and zero `<style>` blocks. This is enforced by `scripts/check-css.js` step 5 (zero matches in built HTML, excluding `<pre>`/`<code>`).

If a style needs to vary by data (e.g. a background image URL bound from frontmatter), use CSS custom properties on a wrapper class and set them in CSS:

```css
.hero { background-image: var(--hero-bg, none); }
```

Then in the template, bind via inline custom property — which is **not** a `style="..."` attribute, it's a CSS variable assignment — only as a last resort. Most cases should use `<img>` for images and let `eleventy-img` handle responsive output.

See [`css-architecture.md`](./css-architecture.md) for the full CSS contract.

## 10. Nunjucks idioms used in this project

A short list of patterns to copy when extending templates:

```njk
{# Compute a list bound to the current locale via collection name #}
{%- set services = collections['featuredServices' + (lang == 'is' and 'Is' or 'En')] %}

{# Conditional class — emit only when truthy #}
<section class="page-hero{% if pageHeroVariant %} page-hero--{{ pageHeroVariant }}{% endif %}">

{# Compose a fallback chain into a `set` for reuse #}
{%- set pageTitle = (title or meta.byLocale[lang].title) | escape %}

{# Locale-aware URL via the I18nPlugin filter — for nav/footer links #}
<a href="{{ '/thjonusta/' | locale_url }}">…</a>

{# Locale-aware alternates — for the language switcher #}
{%- for link in page.url | locale_links %}…{%- endfor %}
```

Avoid `{{ var | default("...") }}` for multi-value fallbacks (use the `set`-and-paren pattern above so escape applies to every branch — §4).

---

## Enforcement appendix

`scripts/check-css.js` (run by `npm run build`) machine-checks the following:

- **§9 no inline styles:** zero `style="..."` attributes in `_site/**/*.html` (excluding `<pre>`/`<code>` blocks).

`scripts/check-build.js` (run by `npm run build`) machine-checks:

- **No unrendered Nunjucks** — zero `{{` / `}}` literals in built HTML (excluding `<pre>`/`<code>`).
- **No `[TBD` placeholders** in built HTML.
- **OG title escaping** — every `<meta property="og:title">` value passes through `| escape` (see §6).
- **eleventy-img fired** — at least one `<picture>` element exists in build output, proving the transform plugin ran.

Conventions enforced by review (no automated check):

- §1 layout chain depth (max 3 — base → page → leaf).
- §2 partials named by what they render, used in ≥ 2 places (or single-use only when the partial's name is the contract, e.g. `seo-meta`, `cta-band`, `svg-defs`).
- §3 no computation in templates.
- §4 `| safe` discipline.
- §6 paren-around-chain shape in seo-meta.
- §7 every JSON-LD block uses `| jsonEscape` and includes `"inLanguage"`.
- §8 svg sprite: one source of truth per icon.

See also:
- [`content-and-frontmatter.md`](./content-and-frontmatter.md) — frontmatter schema per page type, including what each layout consumes.
- [`i18n.md`](./i18n.md) — the `i18n` filter callsite contract.
- [`css-architecture.md`](./css-architecture.md) — CSS contract.
- [`eleventy-config.md`](./eleventy-config.md) — build pipeline, filters, image transform.
- [`javascript-architecture.md`](./javascript-architecture.md) — the Swup container (`#main-content`) lives in `page.njk`, and the `<script>` tag order in `base.njk` (UMD vendors before the module entry) is owned by that directive.
