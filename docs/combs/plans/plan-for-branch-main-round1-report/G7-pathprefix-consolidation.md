# G7 — Centralize the GH Pages project subpath behind `meta.origin` + `meta.pathPrefix`

**Severity:** Medium
**Specialty:** code-reviewer, consistency-auditor, simplifier
**Consolidates:** M4, M13
**Files touched:**
- `src/_data/meta.js` (split the fused origin URL into `origin` + `pathPrefix`, compute `url`)
- `eleventy.config.js` (import meta and derive `pathPrefix` from it; rewrite the literal `"/bruna-is"` in the `prefixInlineUrls` transform to read from the same source)

## Why

The string `/bruna-is` (the GitHub Pages project subpath) lives in three places today:

1. `src/_data/meta.js:21` — fused into `url: "https://brunathettingar.github.io/bruna-is"`.
2. `eleventy.config.js:169` — `pathPrefix: "/bruna-is/"` in the config export.
3. `eleventy.config.js:21` — the literal `const prefix = "/bruna-is"` inside the `prefixInlineUrls` transform.

Each duplication is load-bearing for a different consumer:

- `meta.url` is concatenated with `page.url` in `seo-meta.njk` (`og:url`, `og:image`, `twitter:image`) and in `base.njk` (`canonical`, JSON-LD `@id` / `url`). `page.url` is root-relative — it does *not* include the project subpath — so `meta.url` has to carry the subpath to produce a usable absolute URL.
- `pathPrefix` is what `HtmlBasePlugin` (and Eleventy's own `url` filter) reads to rewrite root-relative `href`/`src` attributes in generated HTML.
- The transform constant patches `url(...)` references inside inline `style` attributes, which `HtmlBasePlugin` doesn't touch.

The three values must stay in lockstep. Today, retargeting the site (custom domain, repo rename, staging deploy with a different subpath) requires a coordinated three-file edit, and a partial edit silently breaks one of the three surfaces. That's a `maintainability.md §1.1` violation ("write for the reader") expressing itself as a `consistency.md` problem: the same fact, expressed in three subtly different forms, with no compile-time link between them.

The fix is to split the fact into its two true pieces of information — **origin** (the host) and **pathPrefix** (the subpath) — store them once in `meta.js`, and have both `eleventy.config.js` and downstream templates read from there. Derived values (`meta.url`, the `pathPrefix` config field, and the transform's prefix constant) become functions of the two source-of-truth fields.

### Sequencing note (G1 interaction)

If **G1** (image pipeline migration) lands before this fix, the `prefixInlineUrls` transform at `eleventy.config.js:19–30` is deleted entirely — that removes the third occurrence on its own. In that case, scope this fix to **only** the remaining two places (`meta.js` and the `pathPrefix` config field). The rest of the plan still applies; just skip the transform edit.

If G7 lands first, all three places are consolidated here.

### Spec alignment

`FRAMEWORK-PORT-PROMPT.md` Part A §"meta.json" specifies a single `url: "https://<production-domain>"` field with no subpath concept — the framework assumes deployment at an origin root. The project-subpath need is a real deviation introduced by GitHub Pages project hosting, not a framework feature. Splitting `url` into `origin` + `pathPrefix` is therefore a deliberate extension of the spec for this deployment target. The exported `url` (origin + pathPrefix) keeps the existing template contract intact, so no consumer changes.

## What

1. In `src/_data/meta.js`, replace the fused `url` with two source fields (`origin`, `pathPrefix`) and compute `url` from them. Keep `url` in the exported shape so `seo-meta.njk` and `base.njk` consumers are unchanged.
2. In `eleventy.config.js`, import the meta module and derive `config.pathPrefix` from `meta.pathPrefix`. If the `prefixInlineUrls` transform still exists (G1 not yet landed), have it read the same value instead of hardcoding `"/bruna-is"`.
3. No template or content edits. All downstream consumers continue to read `meta.url` and the rewritten attribute URLs as before.

## How

### `src/_data/meta.js`

**Before** (full file, 25 lines — the relevant block is the `shared` object at lines 17–23):

```js
const byLocale = {
  is: {
    title: "Brunaþéttingar",
    description: "[TBD — íslensk lýsing] Vottuð brunaþéttingar og tæknieinangrun á Íslandi.",
    author: "Brunaþéttingar ehf.",
    ogImageAlt: "Brunaþéttingar — vottuð brunaþéttingar fyrir íslensk mannvirki",
  },
  en: {
    title: "Brunaþéttingar",
    description:
      "Brunaþéttingar plan, manage and execute fire sealing and technical insulation work on Icelandic buildings.",
    author: "Brunaþéttingar ehf.",
    ogImageAlt: "Brunaþéttingar — certified fire sealing for buildings",
  },
};

const shared = {
  // Includes the project-page subpath. HtmlBasePlugin only rewrites
  // path-style URLs (`/foo/`), not absolute ones — so canonical and og:url
  // need the prefix included here.
  url: "https://brunathettingar.github.io/bruna-is",
  ogImage: "/assets/img/og-default.jpg",
};

export default { ...shared, byLocale };
```

**After:**

```js
const byLocale = {
  is: {
    title: "Brunaþéttingar",
    description: "[TBD — íslensk lýsing] Vottuð brunaþéttingar og tæknieinangrun á Íslandi.",
    author: "Brunaþéttingar ehf.",
    ogImageAlt: "Brunaþéttingar — vottuð brunaþéttingar fyrir íslensk mannvirki",
  },
  en: {
    title: "Brunaþéttingar",
    description:
      "Brunaþéttingar plan, manage and execute fire sealing and technical insulation work on Icelandic buildings.",
    author: "Brunaþéttingar ehf.",
    ogImageAlt: "Brunaþéttingar — certified fire sealing for buildings",
  },
};

// Single source of truth for the deploy target. `origin` is the bare host
// (no trailing slash); `pathPrefix` is the project-page subpath (leading and
// trailing slashes, or "/" if deploying at the origin root). `url` is the
// concatenation that absolute-URL consumers (canonical, og:url, og:image,
// JSON-LD) read — `page.url` is root-relative and does not include the
// prefix, so absolute URLs need it baked in here.
const origin = "https://brunathettingar.github.io";
const pathPrefix = "/bruna-is/";

const shared = {
  origin,
  pathPrefix,
  url: `${origin}${pathPrefix.replace(/\/$/, "")}`,
  ogImage: "/assets/img/og-default.jpg",
};

export default { ...shared, byLocale };
```

Notes for the executor:
- `url` keeps the **exact** prior value (`https://brunathettingar.github.io/bruna-is`, no trailing slash) so `seo-meta.njk`'s `{{ meta.url }}{{ page.url }}` concatenation produces identical output. The `.replace(/\/$/, "")` strips the trailing slash from `pathPrefix` before joining.
- The comment is the only added prose; it documents the hidden constraint (`page.url` is root-relative — without this, the next reader can't tell why `url` carries the subpath) per `maintainability.md §3.2`.
- If you're deploying at an origin root in the future, set `pathPrefix = "/"`; the joined `url` becomes `${origin}` with no trailing slash and continues to work.

### `eleventy.config.js`

**Before** — lines 1–5 (imports) and lines 19–30 (`prefixInlineUrls` transform) and lines 168–176 (config export):

```js
import eleventyNavigationPlugin from "@11ty/eleventy-navigation";
import { eleventyImageTransformPlugin } from "@11ty/eleventy-img";
import { I18nPlugin, HtmlBasePlugin } from "@11ty/eleventy";
import i18nPlugin from "eleventy-plugin-i18n";
import translations from "./src/_data/i18n.js";
```

```js
  eleventyConfig.addTransform("prefixInlineUrls", function (content) {
    if (!this.page?.outputPath?.endsWith(".html")) return content;
    const prefix = "/bruna-is";
    return content.replace(
      /style="([^"]*url\([^"]+)"/g,
      (match, styleBody) =>
        `style="${styleBody
          .replace(/url\(\s*'\/(?!bruna-is\/)/g, `url('${prefix}/`)
          .replace(/url\(\s*"\/(?!bruna-is\/)/g, `url("${prefix}/`)
          .replace(/url\(\s*\/(?!bruna-is\/)/g, `url(${prefix}/`)}"`
    );
  });
```

```js
export const config = {
  pathPrefix: "/bruna-is/",
  dir: {
    input: "src",
    output: "_site",
    includes: "_includes",
    data: "_data",
  },
};
```

**After** — imports gain one line:

```js
import eleventyNavigationPlugin from "@11ty/eleventy-navigation";
import { eleventyImageTransformPlugin } from "@11ty/eleventy-img";
import { I18nPlugin, HtmlBasePlugin } from "@11ty/eleventy";
import i18nPlugin from "eleventy-plugin-i18n";
import translations from "./src/_data/i18n.js";
import meta from "./src/_data/meta.js";
```

**After** — `prefixInlineUrls` transform reads `meta.pathPrefix` instead of a literal. (Skip this block if G1 has already landed and the transform is gone.)

```js
  eleventyConfig.addTransform("prefixInlineUrls", function (content) {
    if (!this.page?.outputPath?.endsWith(".html")) return content;
    const prefix = meta.pathPrefix.replace(/\/$/, "");
    const guard = new RegExp(`^${prefix.replace(/[/\-]/g, "\\$&")}/`);
    const needsPrefix = (path) => !guard.test(path);
    return content.replace(
      /style="([^"]*url\([^"]+)"/g,
      (match, styleBody) =>
        `style="${styleBody.replace(
          /url\(\s*(['"]?)\/([^)'"]*)\1/g,
          (m, quote, path) =>
            needsPrefix(`/${path}`) ? `url(${quote}${prefix}/${path}${quote}` : m
        )}"`
    );
  });
```

**After** — config export derives `pathPrefix` from `meta`:

```js
export const config = {
  pathPrefix: meta.pathPrefix,
  dir: {
    input: "src",
    output: "_site",
    includes: "_includes",
    data: "_data",
  },
};
```

Notes for the executor:
- Importing `./src/_data/meta.js` from the config file is the standard Eleventy pattern — `_data/` is a directory convention for the runtime, not a module-resolution boundary. The import works at config-load time.
- The transform rewrite collapses the three near-identical `.replace(...)` calls into one regex with a quote-capture group. That's not a drive-by — it's required because the literal `bruna-is` baked into the original lookbehinds (`(?!bruna-is\/)`) had to be replaced with a dynamic guard built from `meta.pathPrefix`. The three-regex form would now need a runtime-built `RegExp` per call; one merged regex is simpler. (If you prefer to preserve the three-regex shape exactly, that's fine — just build each `RegExp` once outside the `replace` and use it. The merged form is the recommendation; see `simplicity.md §1.2`.)
- The `prefix.replace(/[/\-]/g, "\\$&")` escapes the only regex-meta characters that can appear in a URL path component (`/` and `-`) before embedding `prefix` in the guard. URL paths shouldn't contain other regex-meta characters; if they do, that's a deployment-config problem, not a transform-correctness problem.
- If G1 has already landed, you only need the two-line change: the new `import meta` and `pathPrefix: meta.pathPrefix` in the config export. Skip the transform block entirely.

## Expected outcome

After this fix lands, the subpath `bruna-is` appears exactly once in source, inside `src/_data/meta.js` (the `pathPrefix` constant). The `meta.origin` constant holds the bare host.

1. Build cleanly: `npx @11ty/eleventy`. No warnings or errors.
2. Confirm consolidation:
   ```
   grep -rn 'bruna-is' src/ eleventy.config.js
   ```
   Expected matches: only `src/_data/meta.js` (the `pathPrefix` constant, and possibly comment text). Zero matches in `eleventy.config.js`.
3. Confirm rendered output is byte-equivalent to a pre-change build for at least:
   - `_site/index.html` — `<link rel="canonical">`, `<meta property="og:url">`, `<meta property="og:image">`, JSON-LD `@id`/`url` all still point at `https://brunathettingar.github.io/bruna-is/`.
   - `_site/en/index.html` — same checks, EN locale.
   - One article page (e.g., `_site/greinar/<slug>/index.html`) — canonical and OG URLs include the project subpath exactly once.
   - One page with an inline `style="background-image: url('/img/...')"` mockup (if G1 has not yet landed) — the rewritten `url(...)` includes `/bruna-is/` exactly once, not zero times and not twice.
4. Diff `_site/` against a pre-change build. Expected delta: empty.

## Retarget rehearsal (optional smoke test)

To prove the consolidation works end-to-end, temporarily change `pathPrefix` in `meta.js` to `"/staging/"` and rebuild. Every canonical, OG URL, `pathPrefix`-rewritten attribute, and (if applicable) inline-`url(...)` reference should swap from `bruna-is` to `staging` in lockstep, with no other file edited. Revert the change before committing.

## Follow-up (out of scope for this fix)

- The framework spec (`docs/instructions/FRAMEWORK-PORT-PROMPT.md` Part A §"meta.json") still describes a single `url` field. Once this consolidation lands and proves out, the spec should be extended in a separate commit to document the `origin` + `pathPrefix` pattern as the canonical approach for GitHub Pages project deployments. That keeps spec and code in sync without bundling the doc edit into a code-only fix (`scope-discipline.md §2.1`).
