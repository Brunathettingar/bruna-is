# Prompt: Build a static site using this Eleventy framework, with design and content driven by a supplied HTML mockup

You're being asked to do **two distinct things** that must not be confused:

1. **Reproduce a specific technical framework verbatim** — Eleventy v3 + Nunjucks + plain CSS + vanilla ES modules. The infrastructure files in the "Framework to reproduce" section below are non-negotiable; copy them in.
2. **Derive the design, content model, navigation, and page structure from the supplied HTML mockup.** The mockup is the source of truth for what the site looks like and what it contains. The framework has no preferred aesthetic, no preferred content shapes, no preferred navigation pattern — it's a vanilla scaffold.

If the mockup is a marketing page for a B2B company, the site should look and behave like that. If it's an editorial blog, like that. The framework doesn't care. Don't bring assumptions from any example code in this prompt — examples are schematic placeholders to show **mechanism**, not **aesthetic**.

This prompt is self-contained: every file you need to set up the framework is inlined. You don't need access to any other repo.

---

## Stack at a glance

- **Eleventy v3**, ESM (`"type": "module"`), Nunjucks templates
- **Plain CSS** — no preprocessor, no CSS modules, no utility framework. Design tokens as CSS custom properties.
- **Vanilla ES modules** for JS. Single entry point, per-feature modules. No bundler.
- **`@11ty/eleventy-img`** transforms `<img>` to `<picture>` with AVIF/WebP/JPEG at multiple widths.
- **`@11ty/eleventy-navigation`** drives the nav menu and breadcrumbs from page frontmatter.
- **Output:** static `_site/`, deployable to GitHub Pages (or any static host).

---

# Part A — Framework to reproduce (verbatim)

Create these files exactly as shown. The only adaptation you should do in this section is filling in placeholders like `<Site Title>` from the mockup's branding.

## `package.json`

```json
{
  "name": "<project-slug>",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "build": "npx @11ty/eleventy",
    "start": "npx @11ty/eleventy --serve",
    "debug": "DEBUG=Eleventy* npx @11ty/eleventy"
  },
  "dependencies": {
    "@11ty/eleventy": "^3.1.2",
    "@11ty/eleventy-img": "^6.0.4",
    "@11ty/eleventy-navigation": "^1.0.5"
  }
}
```

## `eleventy.config.js`

```js
import eleventyNavigationPlugin from "@11ty/eleventy-navigation";
import { eleventyImageTransformPlugin } from "@11ty/eleventy-img";

export default function (eleventyConfig) {
  eleventyConfig.addPlugin(eleventyNavigationPlugin);

  eleventyConfig.addPlugin(eleventyImageTransformPlugin, {
    formats: ["avif", "webp", "jpeg"],
    widths: [400, 800, 1200, "auto"],
    htmlOptions: {
      imgAttributes: { loading: "lazy", decoding: "async" },
    },
    // Defer image processing during dev; generate static files on build
    transformOnRequest: process.env.ELEVENTY_RUN_MODE === "serve",
  });

  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy({ ".nojekyll": ".nojekyll" });

  eleventyConfig.setServerOptions({
    watch: ["_site/assets/**/*.css", "_site/assets/**/*.js"],
  });

  // Human-readable date: "October 20, 2025"
  eleventyConfig.addFilter("dateDisplay", (date) =>
    new Date(date).toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric",
    })
  );

  // ISO date: "2025-10-20"
  eleventyConfig.addFilter("dateIso", (date) =>
    new Date(date).toISOString().split("T")[0]
  );

  // Escape strings for safe embedding in JSON-LD <script> blocks
  eleventyConfig.addFilter("jsonEscape", (str) => {
    if (!str) return "";
    return str
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r")
      .replace(/\t/g, "\\t");
  });

  // Add custom collections here AFTER you've identified the content shapes
  // from the mockup. See "Custom collection mechanism" in Part B.
}

export const config = {
  dir: {
    input: "src",
    output: "_site",
    includes: "_includes",
    data: "_data",
  },
};
```

## Directory layout

```
eleventy.config.js
.nojekyll
package.json
.github/workflows/deploy.yml
src/
  _data/meta.json
  _includes/
    layouts/
      base.njk
      page.njk
      # Add one layout per content collection you identify (see Part B)
    partials/
      nav.njk
      breadcrumb.njk
      seo-meta.njk
  assets/
    css/        # tokens.css, reset.css, layout.css, nav.css, main.css, then per-section
    js/         # main.js entry + per-feature ES modules
    img/        # favicon, og-default, etc.
  content/
    index.njk   # home page
    404.njk
    robots.njk
    sitemap.njk
    # Add page directories and collection directories here based on the mockup
  img/          # Source images, grouped by collection if you have collections
```

## `src/_data/meta.json`

Fill from the mockup's branding:

```json
{
  "title": "<Site Title>",
  "description": "<One-line site description>",
  "url": "https://<production-domain>",
  "author": "<Org or person name>",
  "ogImage": "/assets/img/og-default.jpg",
  "ogImageAlt": "<Site Title> — <tagline>"
}
```

## `src/_includes/layouts/base.njk`

```njk
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{% if title and title != meta.title %}{{ title }} | {{ meta.title }}{% else %}{{ meta.title }}{% endif %}</title>
    <meta name="description" content="{{ description or meta.description }}">
    <link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
    <link rel="canonical" href="{{ meta.url }}{{ page.url }}">
    {% include "partials/seo-meta.njk" %}
    <link rel="stylesheet" href="/assets/css/tokens.css">
    <link rel="stylesheet" href="/assets/css/reset.css">
    <link rel="stylesheet" href="/assets/css/layout.css">
    <link rel="stylesheet" href="/assets/css/nav.css">
    <link rel="stylesheet" href="/assets/css/main.css">
    {# Add per-section stylesheets below, in load order #}
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": "{{ meta.url }}/#website",
      "name": "{{ meta.title | jsonEscape }}",
      "url": "{{ meta.url }}/",
      "description": "{{ meta.description | jsonEscape }}"
    }
    </script>
  </head>
  <body>
    {{ content | safe }}
    <script type="module" src="/assets/js/main.js"></script>
  </body>
</html>
```

## `src/_includes/layouts/page.njk`

```njk
---
layout: layouts/base.njk
---
<a href="#main-content" class="skip-link">Skip to content</a>
<div class="page-wrapper">
  {% include "partials/nav.njk" %}
  <main id="main-content">
    {%- if eleventyNavigation and eleventyNavigation.parent %}
    {% include "partials/breadcrumb.njk" %}
    {%- endif %}
    {%- if bodyClass %}
    <div class="{{ bodyClass }}">
      {{ content | safe }}
    </div>
    {%- else %}
      {{ content | safe }}
    {%- endif %}
  </main>
  <footer class="site-footer">
    <p>&copy; {{ meta.title }}</p>
  </footer>
</div>
```

## `src/_includes/partials/nav.njk`

This is the *mechanism* for an `eleventy-navigation`-driven menu. The markup, class names, and whether the nav has a mobile toggle, mega-menu, dropdowns, sticky behavior, etc. all come from the mockup. Adapt this template — don't keep the hamburger pattern unless the mockup uses one.

```njk
<header class="site-header">
  <nav class="site-nav" aria-label="Main">
    <a href="/" class="site-nav__logo">{{ meta.title }}</a>
    <ul id="nav-menu" class="site-nav__list" role="list">
      {%- set navPages = collections.all | eleventyNavigation %}
      {%- for entry in navPages %}
      <li class="site-nav__item">
        <a href="{{ entry.url }}"
           class="site-nav__link"
           {% if entry.url == page.url %}aria-current="page"{% endif %}>
          {{ entry.title }}
        </a>
      </li>
      {%- endfor %}
    </ul>
  </nav>
</header>
```

Pages opt in to the main nav by adding to their frontmatter:

```yaml
eleventyNavigation:
  key: About
  order: 2
```

Detail pages inside a collection set a parent to get breadcrumbs:

```yaml
eleventyNavigation:
  parent: Services
```

## `src/_includes/partials/breadcrumb.njk`

```njk
{%- set crumbs = collections.all | eleventyNavigationBreadcrumb(eleventyNavigation.key, { includeSelf: false }) %}
{%- if crumbs.length %}
<nav class="breadcrumb" aria-label="Breadcrumb">
  <ol class="breadcrumb__list" role="list">
    {%- for crumb in crumbs %}
    <li class="breadcrumb__item">
      <a href="{{ crumb.url }}" class="breadcrumb__link">{{ crumb.title }}</a>
    </li>
    {%- endfor %}
    <li class="breadcrumb__item" aria-current="page">{{ title }}</li>
  </ol>
</nav>
{%- endif %}
```

## `src/_includes/partials/seo-meta.njk`

```njk
{# Open Graph #}
<meta property="og:title" content="{{ title or meta.title | escape }}">
<meta property="og:description" content="{{ description or summary or meta.description | escape }}">
<meta property="og:url" content="{{ meta.url }}{{ page.url }}">
<meta property="og:site_name" content="{{ meta.title | escape }}">
<meta property="og:type" content="{{ ogType or 'website' }}">
{%- set socialImage = ogImage or meta.ogImage %}
<meta property="og:image" content="{{ meta.url }}{{ socialImage }}">
<meta property="og:image:alt" content="{{ ogImageAlt or title or meta.title | escape }}">
<meta property="og:locale" content="en_US">

{# Twitter Card #}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{{ title or meta.title | escape }}">
<meta name="twitter:description" content="{{ description or summary or meta.description | escape }}">
<meta name="twitter:image" content="{{ meta.url }}{{ socialImage }}">
<meta name="twitter:image:alt" content="{{ ogImageAlt or title or meta.title | escape }}">
```

## `src/assets/css/tokens.css` — **structure only; values come from the mockup**

The token *categories* below are the framework's contract. The specific values are placeholders — replace every one of them with what you extract from the mockup. Add or remove tokens as needed; the framework doesn't dictate a specific scale.

```css
:root {
  /* ---- Colors ---- (replace with the mockup's palette) */
  --color-bg: #ffffff;
  --color-surface: #ffffff;
  --color-text: #000000;
  --color-text-muted: #666666;
  --color-accent: #0000ff;
  --color-border: #e5e5e5;

  /* ---- Typography ---- (replace with the mockup's font choices) */
  --font-body: system-ui, -apple-system, sans-serif;
  --font-heading: system-ui, -apple-system, sans-serif;
  --font-mono: ui-monospace, monospace;

  /* ---- Type scale ---- (replace with the mockup's scale; ratio is your call) */
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.25rem;
  --text-xl: 1.5rem;
  --text-2xl: 2rem;
  --text-3xl: 2.5rem;

  /* ---- Spacing ---- (use whatever grid the mockup implies — 4px, 8px, custom) */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-12: 3rem;
  --space-16: 4rem;

  /* ---- Layout widths ---- (replace with the mockup's container widths) */
  --max-width: 80rem;
  --content-width: 42rem;
  --nav-height: 4rem;

  /* ---- Radii, shadows, transitions ---- (add what the mockup uses) */
  --radius-sm: 4px;
  --radius-md: 8px;
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --transition-fast: 150ms ease;
  --transition-base: 250ms ease;
}
```

Downstream CSS **must** reference tokens — no raw hex codes, no magic px values, outside this file.

## `src/assets/css/reset.css`

```css
*, *::before, *::after { box-sizing: border-box; }
body, h1, h2, h3, h4, p, figure, blockquote, dl, dd { margin: 0; }
html { -moz-text-size-adjust: none; -webkit-text-size-adjust: none; text-size-adjust: none; }
body { min-height: 100svh; line-height: 1.5; }
h1, h2, h3, h4 { text-wrap: balance; }
p, li, figcaption { text-wrap: pretty; }
img, picture, video, canvas, svg { max-width: 100%; display: block; }
input, button, textarea, select { font: inherit; }
:target { scroll-margin-block: 5ex; }
```

## `src/assets/css/layout.css` (starting skeleton — extend from the mockup)

```css
.page-wrapper {
  display: grid;
  grid-template-rows: auto 1fr auto;
  min-height: 100svh;
}

main {
  width: 100%;
  max-width: var(--max-width);
  margin-inline: auto;
  padding-inline: var(--space-4);
  padding-block: var(--space-8);
}

.content-prose { max-width: var(--content-width); }

.site-footer {
  border-block-start: 1px solid var(--color-border);
  padding: var(--space-6) var(--space-4);
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}
```

## `src/assets/js/main.js`

```js
// ES module entry — wire up feature modules here as you build them
// import { initSomething } from './something.js';

document.addEventListener('DOMContentLoaded', () => {
  // initSomething();
});
```

## Pattern for a JS feature module (schematic)

Use this defensive pattern for each interactive feature in the mockup (mobile nav toggle, accordions, tabs, modal, carousel, form validation, etc.). One file per feature.

```js
// src/assets/js/<feature>.js
export function init<Feature>() {
  const root = document.querySelector('.<feature-root>');
  if (!root) return;  // page doesn't have this feature — exit cleanly

  // attach listeners, manage state via class toggles + aria attributes
}
```

Import each from `main.js` and call it inside the `DOMContentLoaded` listener.

## `.github/workflows/deploy.yml`

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: "pages"
  cancel-in-progress: false
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npx @11ty/eleventy
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v4
        with:
          path: _site
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

(If deploying elsewhere, swap the workflow accordingly — the framework itself isn't GH Pages-specific.)

## `.nojekyll`

Empty file at repo root — prevents GitHub Pages from running Jekyll on the output.

---

# Part B — Derive from the mockup

Everything in this section is **driven by what the mockup contains**. The framework provides the mechanism; you provide the model.

## Page types

Walk the mockup. List every distinct page. Bucket them into:

- **Singletons** — one-off pages (home, about, contact, pricing, terms…). Each lives as a `.njk` or `.md` file under `src/content/` or in a named subdirectory.
- **Collection entries** — pages that share a template and only differ in content (case studies, team members, blog posts, job listings, product pages…). Each becomes a collection.

For each page type, decide whether it needs its own layout template, or can reuse `page.njk` with just frontmatter.

## Collection mechanism

For each repeating shape, create a directory under `src/content/<collection>/` containing:

1. **A directory data file** that applies shared frontmatter to every `.md` in the dir:

   ```json
   // src/content/<collection>/<collection>.json
   {
     "tags": ["<collection>"],
     "layout": "layouts/<entry-type>.njk",
     "permalink": "/<collection>/{{ page.fileSlug }}/"
   }
   ```

2. **A listing page** at `src/content/<collection>/index.njk` that loops over `collections.<collection>` and renders cards/rows/whatever the mockup shows.

3. **One `.md` per entry**, with the frontmatter fields the layout needs:

   ```yaml
   ---
   title: "..."
   date: 2026-01-15
   summary: "..."
   # plus whatever other fields the mockup's entry shape requires
   ---
   ```

4. **A layout template** at `src/_includes/layouts/<entry-type>.njk` that renders one entry. Use `page.njk` as the parent layout via `layout: layouts/page.njk` in its frontmatter, then add the entry-specific markup inside.

The frontmatter fields are exactly the fields that vary between mockup instances of that shape — no more, no less.

## Custom collections (home page, "featured", etc.)

If the mockup's home page (or any other page) shows curated/sorted/filtered items, register a custom collection in `eleventy.config.js`:

```js
// Example: items marked featured: true, newest first
eleventyConfig.addCollection("featuredFoo", (api) =>
  api.getFilteredByTag("<collection>")
     .filter((item) => item.data.featured === true)
     .sort((a, b) => b.date - a.date)
);

// Example: latest N items across multiple collections
eleventyConfig.addCollection("recent", (api) => {
  const items = [
    ...api.getFilteredByTag("<collection-a>"),
    ...api.getFilteredByTag("<collection-b>"),
  ];
  return items.sort((a, b) => b.date - a.date).slice(0, 6);
});
```

Then iterate `collections.featuredFoo` / `collections.recent` in the template that needs them.

## Design tokens — extract from the mockup

Audit the mockup's CSS. Move every:

- color
- font family
- font size / line-height
- spacing value (margin / padding / gap)
- border width / radius
- shadow
- transition duration / easing
- breakpoint
- container / column / max-width value

…into `tokens.css` as a custom property. Then rewrite the rest of the CSS to reference tokens. After this pass, `tokens.css` is the only place raw values live.

If the mockup implies a spacing scale (e.g. consistent use of 8/16/24/32px), encode that scale as `--space-*` tokens and use them throughout — don't carry forward raw px values from the mockup.

## CSS structure

- **Load order in `base.njk`:** `tokens.css` → `reset.css` → `layout.css` → `nav.css` → `main.css` → per-section stylesheets (e.g. `home.css`, `<collection>.css`, `<entry-type>.css`).
- **One stylesheet per major area.** Section names come from the mockup's structure — don't reuse names from any examples in this prompt.
- **BEM naming.** `.block`, `.block__element`, `.block--modifier`. No utility classes. No CSS-in-JS.
- **Responsive:** mobile-first by default; use container/media queries as the mockup dictates. Keep breakpoints as tokens (`--bp-md` etc.) if you have more than two.

## Templates

Translate the mockup's HTML into Nunjucks:

- Literal content → `{{ field }}` from frontmatter
- Repeating lists → `{%- for item in items %}` loops
- Conditional blocks → `{%- if ... %}`
- Shared markup → partials under `_includes/partials/` (e.g. hero, card, CTA block, footer columns — whatever the mockup repeats)

Preserve semantic HTML and accessibility attributes: `<article>`, `<section>`, `<nav>`, `<time datetime>`, `<dl>`, `aria-label`, `aria-current`, the skip link. If the mockup is missing these, add them — the framework expects them.

## Images

Write plain `<img src="..." alt="..." width="..." height="...">` — the `eleventy-img` plugin transforms it into a responsive `<picture>` at build time. Don't write `<picture>` markup by hand. Image paths in markdown frontmatter are **relative from the markdown file** (e.g. `../../img/<collection>/foo.jpg`).

## SEO and JSON-LD

- Every page automatically gets the `WebSite` JSON-LD block from `base.njk`.
- Detail-type pages (articles, case studies, products, team profiles…) should also emit a per-page JSON-LD `<script type="application/ld+json">` block with the appropriate `@type` (`Article`, `Product`, `Person`, `Service`, `Organization`, etc.).
- **Every** user-controlled string going into JSON-LD must pass through the `jsonEscape` filter.
- Each page can override OG metadata via frontmatter (`title`, `description`, `summary`, `ogImage`, `ogImageAlt`, `ogType`). The `seo-meta.njk` partial picks these up automatically.

---

# Conventions (rules, not suggestions)

- **No bundler.** No Vite, webpack, esbuild, Rollup, Parcel.
- **No CSS framework.** No Tailwind, Bootstrap, no CSS-in-JS, no PostCSS pipeline. Plain CSS only.
- **No JS framework.** No React, Vue, Svelte, Alpine. Vanilla ES modules.
- **No client-side routing.** Every page is a real file at its permalink.
- **No new dependencies** beyond the three listed. If you genuinely need one (e.g. a markdown plugin), justify it.
- **No inline styles** or `<style>` blocks in templates.
- **No raw values in CSS** outside `tokens.css`.
- **No unescaped strings in JSON-LD.** Always `jsonEscape`.
- **No `<picture>` written by hand.** Use `<img>` and let the plugin transform.
- **Web fonts only if the mockup uses them.** If it does, self-host via `assets/` rather than pulling from a CDN, and add `<link rel="preload">` for the primary face.

---

# Your task, ordered

1. **Read the mockup end to end.** Inventory every distinct page, every repeating content shape, every navigation entry, every interactive widget, every breakpoint, every color, every font, every spacing rhythm. Write this inventory before you start coding.

2. **Scaffold Part A** verbatim. Fill `meta.json` from the mockup's branding. Stop and confirm `npm install && npm start` boots a blank but valid site.

3. **Extract tokens.** Replace the placeholder values in `tokens.css` with everything you inventoried from the mockup. Add or remove token categories as the mockup demands.

4. **Map pages and collections.** For each singleton, create the page file. For each collection, create the directory, data file, listing page, layout template, and one `.md` per entry. Wire up `eleventyNavigation` keys on top-level pages and `parent` keys on detail pages.

5. **Port templates.** Translate mockup HTML to Nunjucks, extract repeating chunks to partials, preserve semantics, add missing accessibility.

6. **Split and write CSS.** Use the layered load order. One file per area. Everything references tokens.

7. **Port interactive behavior.** One ES module per feature, defensive query-then-bail pattern, wired through `main.js`.

8. **Per-page SEO.** Add JSON-LD blocks to detail-type pages with appropriate `@type`. Make sure `jsonEscape` is applied.

9. **Verify.** `npm install && npm run build`, then `npm start`. Walk every page in a browser. Confirm: navigation works, breadcrumbs appear where expected, images render as `<picture>`, listings populate, interactive features work, no console errors, visual fidelity matches the mockup. Run a Lighthouse pass; nothing should be obviously broken on accessibility or SEO.

10. **Report back** with:
    - The full list of singleton pages and collections you created.
    - The frontmatter schema for each collection.
    - The final token inventory (categories and counts; values not needed).
    - Any feature modules you wrote and what they control.
    - Any place where you deviated from the mockup and why.
    - Any place where the mockup was ambiguous and you made a judgment call.

---

# Deliverables

- A working repo where `npm install && npm start` serves locally with live reload.
- `npm run build` produces a deployable `_site/`.
- Every mockup page reachable at a clean permalink.
- Every repeating content shape editable as markdown frontmatter — no hard-coded content in templates.
- `tokens.css` is the single source of truth for design values.
- The site visually matches the mockup at the breakpoints the mockup defines.
