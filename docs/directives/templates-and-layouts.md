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

Every public page uses `layouts/page.njk` (directly or through a leaf). `base.njk` is never used directly except as the parent of `page.njk`.

| Layout | Required frontmatter | Optional frontmatter |
|---|---|---|
| `base.njk` | `lang` (via `requireLang`) | `title`, `description`, `bodyClass`, `ogImage`, `ogImageAlt`, `ogType` |
| `page.njk` | (inherits) | `eleventyNavigation.parent` (enables breadcrumb), `bodyClass` |
| `service.njk` | `title`, `image`, `summary`, `number`, `category`, `insightStrong`, `insight`, `bullets[]` | `imageContain` |
| `sector.njk` | `title`, `image`, `description` | `tagLabels[]` |
| `article.njk` | `title`, `image`, `summary`, `date`, `readTimeMinutes`, `author` | — |

Leaf layouts may set `eleventyComputed.ogImage: "{{ image }}"` to expose the page image as the OG image automatically.

When adding a new leaf layout, extend `page.njk` (`layout: layouts/page.njk` in its frontmatter), never `base.njk` directly. Page chrome (skip link, utility bar, header, footer, breadcrumb) is owned by `page.njk`.

## 2. Partial conventions

Partials live in `src/_includes/partials/` and are included with `{% include "partials/<name>.njk" %}`. Use a partial when:

- The same markup appears on **two or more** pages or layouts, OR
- A single block of markup is ≥ 5 lines of structural HTML and has a single semantic identity (e.g. the SEO meta block, the CTA band).

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
| `svg-defs.njk` | Inline `<svg>` with `<defs>` containing all icon symbols. See §8. |

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

## 8. The SVG sprite pattern

`partials/svg-defs.njk` is included once at the top of `<body>` in `base.njk`. It contains a single off-screen `<svg class="svg-defs">` element with `<defs>` holding every icon symbol referenced by the site:

```njk
<svg class="svg-defs"><defs>
  <symbol id="logo-wordmark" viewBox="0 0 2500 375">...</symbol>
  <symbol id="pillar-fireproofing" viewBox="...">...</symbol>
  <!-- one symbol per inline icon -->
</defs></svg>
```

Templates reference the symbol via `<use href="#...">`:

```njk
<svg class="logo" viewBox="0 0 2500 375" aria-hidden="true"><use href="#logo-wordmark"/></svg>
```

Rules:

- **One source of truth per icon.** Never paste the same icon path inline in multiple templates. Add the symbol to `svg-defs.njk` and reference it.
- **`viewBox` lives on the `<symbol>`, `<svg>` is the consumer.** Consumers may set a different `viewBox` only when intentionally cropping; otherwise use the symbol's.
- **`fill`/`stroke` are inherited.** Use semantic classes (`.bruna { fill: var(--accent); }`) on `<svg>` or `<g>` containers in CSS, not inline `fill="…"` on the symbol.
- **`aria-label` on the consumer when the icon conveys meaning; `aria-hidden="true"` when decorative.**

When adding a new icon, add the `<symbol>` to `svg-defs.njk` with a `pillar-`/`icon-` prefixed `id`, then reference it with `<use href="#...">`. Do not introduce a separate `<img>` for icons.

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

Avoid:

- `{{ varName | default("...") }}` for fallback chains spanning multiple values. Use `{%- set var = (a or b or c) | escape %}` instead so the precedence is explicit and the escape applies to all branches.
- `{% raw %}` blocks — there's no legitimate reason for this project to escape Nunjucks tags in templates. If you need to render literal `{{` in HTML, that's content (Markdown), not template logic.
- Deep `{% block %}` / `{% extends %}` chains beyond the canonical three (base → page → leaf). Add a partial instead.

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
- §2 partials named by what they render, used in ≥ 2 places or ≥ 5 structural lines.
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
