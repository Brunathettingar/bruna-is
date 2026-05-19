# L10 — Document `HtmlBasePlugin` deviation from FRAMEWORK-PORT-PROMPT Part A

**Severity:** Low
**Specialty:** consistency-auditor
**Files touched:**
- `eleventy.config.js` (add explanatory comment at the `addPlugin(HtmlBasePlugin)` call site)

## Why

`eleventy.config.js:13` registers `HtmlBasePlugin`, but the verbatim Part A scaffold in `docs/instructions/FRAMEWORK-PORT-PROMPT.md` (lines 49–110) does not import or register it. The Part A template only imports `eleventyNavigationPlugin` and `eleventyImageTransformPlugin`; there is no mention of `HtmlBasePlugin` anywhere in the spec.

The plugin is genuinely needed here: the site deploys to a GitHub Pages project subpath (`/bruna-is/`), and `HtmlBasePlugin` rewrites root-relative `href`/`src` attributes in generated HTML to include that prefix at build time. So this is a justified deviation, not a mistake — but right now a future reader (or a port to another project that follows the same FRAMEWORK-PORT-PROMPT) has no way to know that without reverse-engineering the deployment target.

Per `maintainability.md` §3 (comment discipline — document constraints), constraints that aren't obvious from the code itself should be documented at the call site. There is already a comment above line 13 explaining *what* the plugin does at runtime, but it doesn't explain *why this project deviates from the spec template* or *when the plugin could be removed*. That's the gap this fix closes.

Consistency-wise (`consistency.md`), the existing comment for the related `prefixInlineUrls` transform (lines 15–18) explicitly ties its existence to `HtmlBasePlugin`'s limitations — extending the `HtmlBasePlugin` comment with the same level of context keeps the two paired blocks symmetric.

## What

Expand the existing comment immediately above `eleventyConfig.addPlugin(HtmlBasePlugin)` so it also records:
- (a) the spec-deviation rationale: this project deploys to a GH Pages project subpath, which is why the plugin is needed even though it is not in the FRAMEWORK-PORT-PROMPT Part A template;
- (b) the removal condition: if the site moves to a custom domain or to a root-path deploy, this plugin and the companion `prefixInlineUrls` transform can both be dropped.

No behavior change. Comment-only edit.

## How

### `eleventy.config.js`

**Before** (lines 10–13):

```js
  // Rewrites every URL starting with `/` in generated HTML to include the
  // pathPrefix at build time. Needed because the site is served from a
  // project-page subpath (`/bruna-is/`) rather than the org root.
  eleventyConfig.addPlugin(HtmlBasePlugin);
```

**After:**

```js
  // Rewrites every URL starting with `/` in generated HTML to include the
  // pathPrefix at build time. Needed because the site is served from a
  // GH Pages project-page subpath (`/bruna-is/`) rather than the org root.
  // Deviation from FRAMEWORK-PORT-PROMPT.md Part A (which omits this plugin):
  // remove this `addPlugin` call and the `prefixInlineUrls` transform below
  // if the site moves to a custom domain or root-path deploy.
  eleventyConfig.addPlugin(HtmlBasePlugin);
```

Leave the rest of the file (the import on line 3, the `prefixInlineUrls` transform on lines 15–30, etc.) unchanged.

## Verification

1. `npx @11ty/eleventy` builds without errors (comment-only change; output bytes for any generated HTML file should be byte-identical to the pre-fix build).
2. Re-read `eleventy.config.js:10–18`: the comment block names both *why the plugin is here* (GH Pages subpath) and *when it can be removed* (custom domain or root deploy), and explicitly flags the deviation from `FRAMEWORK-PORT-PROMPT.md` Part A.
3. Confirm no other call site references `HtmlBasePlugin`: `rg 'HtmlBasePlugin' .` should return only the import on line 3 and the `addPlugin` call on line 13 (now line 16 after the comment expansion).
