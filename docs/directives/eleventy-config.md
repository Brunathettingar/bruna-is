# Eleventy Config Directive — bruna-is

This document defines the rules for the Eleventy build configuration, plugins, filters, collections, and image pipeline. Treat it as the single source of truth. Deviations require a documented rationale where the deviation lives.

The framework is Eleventy v3 (ESM, `"type": "module"`) on Node 22. No bundler, no transpilation, no JS framework. Plain Nunjucks templates, plain CSS, vanilla ES modules. Four runtime npm dependencies (see `package.json`).

---

## 1. Stack contract

| Concern | Choice | Notes |
|---|---|---|
| Site generator | `@11ty/eleventy` ^3.1.2 | ESM config (`"type": "module"`). |
| Template engine | Nunjucks | No alternate engines (no Liquid, Pug, EJS, etc.). |
| Image transform | `@11ty/eleventy-img` ^6.0.4 | Via `eleventyImageTransformPlugin`. |
| Navigation | `@11ty/eleventy-navigation` ^1.0.5 | `key` / `parent` / `order` frontmatter. |
| i18n | `@11ty/eleventy` built-in `I18nPlugin` + `eleventy-plugin-i18n` + a custom override | See [`i18n.md`](./i18n.md) §3. |
| CSS | Plain CSS in `src/assets/css/` | See [`css-architecture.md`](./css-architecture.md). |
| JS | Vanilla ES modules in `src/assets/js/`, single entry `main.js` | No bundler. |
| Markdown | Eleventy's built-in `markdown-it` | No syntax-highlight plugin yet. |

**Do not add a new runtime dependency without justification.** Each addition pulls a transitive tree, an upgrade burden, and a supply-chain surface. If a real need arises (e.g. RSS, syntax highlighting), pick the Eleventy-official plugin from https://www.11ty.dev/docs/plugins/ first.

## 2. Plugin discipline

Plugins are registered in `eleventy.config.js` in this order:

```js
eleventyConfig.addPlugin(eleventyNavigationPlugin);
eleventyConfig.addPlugin(HtmlBasePlugin);
eleventyConfig.addPlugin(eleventyImageTransformPlugin, { ... });
eleventyConfig.addPlugin(I18nPlugin, { ... });
eleventyConfig.addPlugin(i18nPlugin, { ... });
eleventyConfig.addPlugin(function i18nOverride(ec) { ... });
```

Order matters in two places: `i18nOverride` must run after `eleventy-plugin-i18n` so its `addFilter("i18n", …)` shadows the upstream filter (the inline-plugin wrapper guarantees the sequencing — see the comment block above `i18nOverride` in `eleventy.config.js` for the full rationale). `HtmlBasePlugin` is registered before content rendering so its path-prefix rewriter runs in the transform phase.

What each plugin owns:

| Plugin | Owns |
|---|---|
| `eleventyNavigationPlugin` | The `eleventyNavigation` frontmatter contract and the `eleventyNavigationBreadcrumb` filter consumed by `partials/breadcrumb.njk`. |
| `HtmlBasePlugin` | Path-prefix rewriting for the `/bruna-is/` GitHub Pages subpath. Tied to `meta.pathPrefix`. |
| `eleventyImageTransformPlugin` | The `<img>` → `<picture>` transform — see §5. |
| `I18nPlugin` (built-in) | `page.lang`, `locale_url`, `locale_links`. Manages **links** between localized pages. |
| `eleventy-plugin-i18n` | The translation dictionary loader. Its `i18n` filter is **overridden** — see [`i18n.md`](./i18n.md) §3. |
| `i18nOverride` (inline) | The corrected `i18n` filter. |

Do not add another plugin to register a filter or shortcode — register those directly via `addFilter` / `addShortcode` in the main function body.

## 3. Path prefix and deployment

The site deploys to GitHub Pages at `https://brunathettingar.github.io/bruna-is/`. Three pieces work together:

```js
// src/_data/meta.js
const shared = {
  origin: "https://brunathettingar.github.io",
  pathPrefix: "/bruna-is/",
  url: "https://brunathettingar.github.io/bruna-is",
};

// eleventy.config.js
export const config = {
  pathPrefix: meta.pathPrefix,
  // ...
};

// eleventy.config.js — plugin
eleventyConfig.addPlugin(HtmlBasePlugin);
```

- `config.pathPrefix` is what Eleventy reads. `HtmlBasePlugin` uses it to rewrite path-style attributes.
- `meta.url` is the full deployed URL (no trailing slash) — used for `<link rel="canonical">`, `og:url`, JSON-LD absolute URLs.
- `meta.pathPrefix` is the source of truth, referenced by both. Changing the deployed path means changing this single value.

`HtmlBasePlugin` only rewrites **path-style** URLs (`/foo/`, `src="/img/foo.jpg"`). It does **not** rewrite absolute URLs already containing `meta.url`. That's why JSON-LD blocks emit `{{ meta.url }}{{ image }}` — they need the prefix baked in.

**Do not strip `pathPrefix` casually.** The deploy URL, `HtmlBasePlugin`'s path rewriting, and `scripts/check-build.js`'s `PREFIX` constant all derive from this single value; changing it touches three files at once.

## 4. Filters

Custom filters live inside the main `eleventyConfig` function. Each filter is small, single-purpose, and named for what it does:

| Filter | Signature | Purpose |
|---|---|---|
| `dateDisplay` | `(date, lang = "is")` | Locale-aware long date: `15. janúar 2026` / `January 15, 2026`. |
| `dateIso` | `(date)` | Locale-neutral ISO date: `2026-01-15`. For `datetime` attrs and JSON-LD. |
| `jsonEscape` | `(str)` | Escapes JSON-unsafe characters for embedding in `<script type="application/ld+json">`. Always apply to user-controlled strings going into JSON-LD. |
| `requireLang` | `(lang)` | Throws a build error if `lang` is falsy. See [`i18n.md`](./i18n.md) §10. |
| `i18n` | `(key, ...rest)` | Translation lookup — **the overridden version**. See [`i18n.md`](./i18n.md) §3–4. |

Filter conventions:

- **Pure functions.** No side effects, no async, no file I/O.
- **Defensive on data, loud on contract violations.** Filters that read content fields (dates, strings) return `""` on missing input — content can legitimately be incomplete. `requireLang` throws because missing `lang` is a build-config bug, not a content gap.
- **Small.** A filter is ≤ ~15 lines. If it's growing, the logic belongs in a `_data/*.js` module, not a template-time filter.
- **Named for the verb.** `jsonEscape`, `dateDisplay`, `requireLang` — present-tense verb-object. Avoid `getX`/`makeX` prefixes; templates read as `{{ value | filter }}`.

Do **not** register a filter that runs across multiple pages (it would re-execute per-callsite). Cross-page computation belongs in a collection or a global data file.

## 5. Image pipeline — the dual strategy

Two paths coexist on purpose:

### Path A — the responsive transform

`eleventyImageTransformPlugin` is registered with:

```js
{
  formats: ["avif", "webp", "jpeg"],
  widths: [400, 800, 1200, "auto"],
  htmlOptions: { imgAttributes: { loading: "lazy", decoding: "async" } },
  transformOnRequest: process.env.ELEVENTY_RUN_MODE === "serve",
}
```

Every `<img src="/img/...">` in a rendered template becomes:

```html
<picture>
  <source srcset="/img/foo-1200w.avif 1200w, ..." type="image/avif">
  <source srcset="/img/foo-1200w.webp 1200w, ..." type="image/webp">
  <img src="/img/foo-1200w.jpeg" srcset="..." loading="lazy" decoding="async" width="..." height="...">
</picture>
```

Write `<img>` markup in templates. Do **not** write `<picture>` by hand.

`transformOnRequest` is dev-only — in `npm start` mode, images transform lazily as requested (faster startup). In `npm run build`, all transforms happen up front.

### Path B — raw passthrough

`src/img` is passed through to `_site/img/` so the raw originals are available at stable, unhashed URLs:

```js
eleventyConfig.addPassthroughCopy("src/img");
```

These raw URLs feed:

- `<meta property="og:image" content="{{ meta.url }}{{ image }}">` — social crawlers need a stable URL.
- JSON-LD `image` fields — search engines reject hashed/responsive URLs.
- The `Article.image` field on greinar pages.

The build-time asset-resolution check (`scripts/check-build.js` step 5) verifies every URL referenced by an `og:image`, icon `<link>`, or JSON-LD `logo` field resolves to a file under `_site/`. The passthrough is what makes that pass.

**Do not remove the passthrough.** Social meta tags and JSON-LD will silently break.

When adding a new image:

1. Drop the file in `src/img/<name>.<ext>`.
2. Reference it as `/img/<name>.<ext>` in frontmatter or templates.
3. The transform handles the `<picture>` markup; the passthrough handles the raw URL.

Image source files: prefer JPEG for photographs, SVG for logos and icons. The transform doesn't process SVG — SVGs ship as-is via the passthrough.

## 6. Collections

All collections are defined in `eleventy.config.js`, never in directory data. Two families:

### Nav collections (`navIs`, `navEn`)

```js
eleventyConfig.addCollection("navIs", (api) =>
  api.getAll()
    .filter((item) => item.data.eleventyNavigation && item.data.eleventyNavigation.order != null)
    .filter((item) => item.url && !item.url.startsWith("/en/"))
    .sort((a, b) => (a.data.eleventyNavigation.order || 0) - (b.data.eleventyNavigation.order || 0))
);
```

Locale selection is by URL prefix (`/en/`), not by tag — the locale-suffixed `eleventyNavigation.key` (e.g. `home-is`) exists for plugin key uniqueness across locales, not for nav selection.

Membership gate is `eleventyNavigation.order != null` — a page can have `key` (used by `eleventyNavigationBreadcrumb`) without participating in the primary nav. See [`content-and-frontmatter.md`](./content-and-frontmatter.md) §6.

### Featured collections (`featuredServicesIs`, `featuredServicesEn`, `featuredSectorsIs`, …)

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

These are surface area for the home page (and any other place wanting curated entries). They follow a consistent shape:

- Source: `getFilteredByTag("<collection>-<lang>")` — the per-locale tag set by directory data.
- Filter: `featured === true`.
- Sort: by `order` ascending (most), or by `date` descending (articles).

Naming convention: `featured<Thing><Locale>`. PascalCase suffix, never lowercase (`featuredServicesis` is wrong — use `featuredServicesIs`).

### Adding a new collection

Add at the bottom of the `eleventyConfig` function, after the existing collections. If the collection has IS and EN parity, use the `for` loop pattern. Sort is **always explicit** — never rely on Eleventy's default order.

Do not add a collection that filters on a frontmatter key not yet declared in the collection's directory-data tag. Decide the shape in [`content-and-frontmatter.md`](./content-and-frontmatter.md) first.

## 7. Passthrough copy

Three passthrough configurations:

```js
eleventyConfig.addPassthroughCopy("src/assets");
eleventyConfig.addPassthroughCopy({ ".nojekyll": ".nojekyll" });
eleventyConfig.addPassthroughCopy("src/img");
```

- **`src/assets`** → `_site/assets/` (CSS, JS, fonts, favicon, OG defaults).
- **`.nojekyll`** at the repo root → `_site/.nojekyll`. Disables Jekyll on GitHub Pages so underscore-prefixed paths ship.
- **`src/img`** → `_site/img/`. The raw-passthrough leg of the dual image strategy (§5).

The dev server watches transformed assets so live-reload fires on CSS/JS edits:

```js
eleventyConfig.setServerOptions({
  watch: ["_site/assets/**/*.css", "_site/assets/**/*.js"],
});
```

## 8. Global data

Three `_data/` modules:

| File | Type | Role |
|---|---|---|
| `_data/meta.js` | ESM default export | Site metadata. `byLocale[is\|en]` for translatable fields; top-level shared values for URLs, deploy coordinates, contact info. |
| `_data/i18n.js` | ESM default export | UI string dictionary — see [`i18n.md`](./i18n.md) §7. |
| `_data/partners.js` | ESM default export | Brand-name list for the home customer band. Not translatable — items have `{name, style}` where `style` flips the logo font (`"sans"` vs default serif). |

Plus an inline-registered global:

```js
eleventyConfig.addGlobalData("buildYear", () => new Date().getFullYear());
```

Templates read `buildYear` for the footer copyright. Recomputed per build, not per page (this is the single benefit of `addGlobalData` over a top-level constant in a `_data/*.js` file).

Conventions:

- **Per-locale metadata goes under `meta.byLocale[lang]`.** Adding a new translatable site-level field means adding it to *both* `byLocale.is` and `byLocale.en`.
- **Shared data goes at the top level of the `_data/*.js` export.** Don't duplicate identical values across locales.
- **Use ESM `export default`,** not CommonJS `module.exports`. The project is ESM.

## 9. Build pipeline

`package.json` scripts:

| Script | Command | Purpose |
|---|---|---|
| `start` | `npx @11ty/eleventy --serve` | Dev server with watch + live reload + lazy image transform. |
| `build` | `npx @11ty/eleventy && node scripts/check-build.js` | Production build + post-build assertions. |
| `debug` | `DEBUG=Eleventy* npx @11ty/eleventy` | Verbose Eleventy debug output. |

**`check-build.js` is non-optional.** It runs after every production build and asserts:

| Step | What it checks |
|---|---|
| 1 | No `[TBD` placeholder strings in built HTML. |
| 2 | No unrendered Nunjucks (`{{` / `}}`) in built HTML. |
| 3 | Each sitemap (`sitemap.xml`, `en/sitemap.xml`) has ≥ 15 `<url>` entries. |
| 4 | The mobile-nav CSS selector contract — `.site-header__toggle` exists in rendered headers. |
| 5 | Every asset URL referenced by icons, OG images, and JSON-LD `logo` fields resolves to a file under `_site/`. |
| 6 | Every `<meta property="og:title">` is properly escaped. |
| 7 | Parallel-slug check (IS slug → EN parallel, warn-only). |
| 8 | `eleventy-img` fired (at least one `<picture>` in build output). |
| 9 | Translation-miss sidecar log surfaced as warnings. |

Finally, it imports `check-css.js`, which adds CSS-architecture assertions (see [`css-architecture.md`](./css-architecture.md) enforcement appendix). Any failure in either script sets `process.exitCode = 1` and the build exits non-zero.

When you add a new build invariant (a new always-true post-build property), add it to `check-build.js` as a numbered step. Do **not** create a parallel checking script — there is one post-build pipeline.

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

## 11. ESM and config style

The config file is plain ESM JavaScript (`"type": "module"`), executed directly by Node 22. Use `import`/`export`. No tooling layer (no tsc, no esbuild).

---

## Enforcement appendix

`scripts/check-build.js` (run by `npm run build`) machine-checks the configuration against built output:

- **§5 Path B asset resolution** — OG/icon/logo URLs resolve to files under `_site/`.
- **§5 transform fired** — at least one `<picture>` in build output.
- **§9 build pipeline** — runs every assertion above plus `check-css.js`.

Conventions enforced by review (no automated check):

- §2 plugin order — `i18nOverride` last in the i18n chain.
- §3 `pathPrefix` source-of-truth in `meta.js`.
- §4 filter conventions — small, pure, defensive on data, loud on contract violations.
- §6 collection naming — `<thing><Locale>`, sort is explicit.
- §8 ESM data files, `byLocale` for per-locale fields.

Reference links (full upstream documentation):

- Eleventy v3 docs home: https://www.11ty.dev/docs/
- Eleventy config: https://www.11ty.dev/docs/config/
- Collections API: https://www.11ty.dev/docs/collections-api/
- Plugins index: https://www.11ty.dev/docs/plugins/
- `@11ty/eleventy-img` (HTML transform): https://www.11ty.dev/docs/plugins/image/#eleventy-transform
- `@11ty/eleventy-navigation`: https://www.11ty.dev/docs/plugins/navigation/
- Built-in I18nPlugin: https://www.11ty.dev/docs/plugins/i18n/
- `eleventy-plugin-i18n` (Adam Duncan): https://github.com/adamduncan/eleventy-plugin-i18n
- HtmlBasePlugin: https://www.11ty.dev/docs/plugins/html-base/
- Nunjucks templating reference: https://mozilla.github.io/nunjucks/templating.html

See also:
- [`i18n.md`](./i18n.md) — the i18n plugin stack and the custom override.
- [`content-and-frontmatter.md`](./content-and-frontmatter.md) — what feeds collections (`tags`, `featured`, `order`).
- [`templates-and-layouts.md`](./templates-and-layouts.md) — how filters and collections are consumed in templates.
- [`css-architecture.md`](./css-architecture.md) — the CSS contract enforced by `check-css.js`.
