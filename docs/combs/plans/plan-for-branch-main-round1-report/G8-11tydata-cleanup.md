# G8 — Collapse `is.11tydata.js` / `en.11tydata.js` to the spec's declarative permalink

**Severity:** Medium
**Specialty:** code-reviewer, simplifier
**Consolidates:** L7, M20
**Files touched:**
- `src/content/is/is.11tydata.js` (rewrite — 14 lines → 4 lines)
- `src/content/en/en.11tydata.js` (rewrite — 15 lines → 4 lines)

## Why

Two findings collapse into one fix because they live in the same two files and have the same root cause: the directory-data files were "upgraded" from the spec's declarative template-string permalink to a JS function so they could honour a frontmatter `permalink` override. That upgrade is unnecessary on both axes.

### M20 — the defensive branch is dead code

Both files open with:

```js
permalink: (data) => {
  if (data.permalink !== undefined) {
    if (typeof data.permalink === "string" && data.permalink.startsWith("/")) {
      return data.permalink;
    }
  }
  // ... compute permalink from filePathStem
}
```

Eleventy's data cascade already resolves this. Page-level data (frontmatter) overrides directory-level data **before** the directory-data `permalink` is evaluated — when a page's frontmatter sets `permalink:`, the directory-data function is never called for that page. The five files that set an explicit frontmatter `permalink` already work without the defensive branch:

| File | Frontmatter permalink |
|---|---|
| `src/content/is/404.njk` | `/404.html` |
| `src/content/is/sitemap.njk` | `/sitemap.xml` |
| `src/content/is/greinar/article.njk` | `"/greinar/{{ article.slug }}/"` |
| `src/content/en/404.njk` | `/en/404.html` |
| `src/content/en/sitemap.njk` | `/en/sitemap.xml` |
| `src/content/en/greinar/article.njk` | `"/en/greinar/{{ article.slug }}/"` |

All are static-string or pagination-template permalinks at the page level. None depends on the directory-data function returning `data.permalink`. The `if (data.permalink !== undefined)` branch is unreachable in practice.

### L7 — the two files are duplicates

Strip the `is`↔`en` substitutions and the files are character-identical: same defensive check, same `filePathStem` slice, same regex, same return shape. Two copies of the same 12-line function differ only in two string literals.

### Both findings dissolve under the spec

`docs/instructions/FRAMEWORK-I18N.md` §"Permalink strategy" (lines 144–162) prescribes the declarative form:

```json
{
  "lang": "is",
  "permalink": "/{{ page.filePathStem | replace('/content/is/', '') | replace('/index', '') }}/"
}
```

Adopting it eliminates the defensive branch (no function body to guard) **and** removes the duplication (each file shrinks to 3–4 lines where duplication is visually obvious and structurally cheap). The spec was right; the implementation drifted.

Cited directives: `simplicity.md §1` (no abstraction without a concrete caller — the defensive branch has zero callers), `consistency.md §3` (one way per concept — the spec is the codebase's stated convention for permalink strategy), `reusability.md` (shared shape extracted via the framework convention, not a hand-rolled helper).

## What

1. Replace the JS-function `permalink` in both directory-data files with the spec's Nunjucks template-string form. Keep `lang` unchanged — it's load-bearing for `I18nPlugin` and the `t` filter wrapper in `eleventy.config.js`.
2. Rename `is.11tydata.js` → `is.11tydata.json` and `en.11tydata.js` → `en.11tydata.json` to match the spec literally (JSON is the simpler container; the file no longer needs JS).
3. Do not touch any `.njk`/`.md` page. Frontmatter `permalink` values in `404.njk`, `sitemap.njk`, and `greinar/article.njk` continue to work — they always did.

### Considered alternative (rejected)

**Keep the JS function, extract a shared helper into `src/content/_lib/permalink.js`.** This addresses L7 (no more duplication) but leaves M20's dead branch in place and adds a new shared module solely to support a hypothetical frontmatter-override case that the codebase doesn't exercise. `simplicity.md §1.2`: a concrete use-case beats an abstraction. The declarative form is shorter, matches the spec, and makes the file's intent inspectable at a glance. The helper approach is preserved here only as a fallback if the JSON rewrite turns out to break something the test build doesn't catch (it shouldn't — see "Expected outcome").

## How

### `src/content/is/is.11tydata.js` → `src/content/is/is.11tydata.json`

**Before** (15 lines):

```js
export default {
  lang: "is",
  permalink: (data) => {
    if (data.permalink !== undefined) {
      if (typeof data.permalink === "string" && data.permalink.startsWith("/")) {
        return data.permalink;
      }
    }
    const stem = data.page.filePathStem;
    let rel = stem.replace(/^\/content\/is\//, "");
    rel = rel.replace(/(^|\/)index$/, "");
    return rel ? `/${rel}/` : "/";
  },
};
```

**After** (4 lines):

```json
{
  "lang": "is",
  "permalink": "/{{ page.filePathStem | replace('/content/is/', '') | replace('/index', '') }}/"
}
```

Delete the old `.js` file in the same commit.

### `src/content/en/en.11tydata.js` → `src/content/en/en.11tydata.json`

**Before** (16 lines):

```js
export default {
  lang: "en",
  permalink: (data) => {
    if (data.permalink !== undefined) {
      // honour explicit frontmatter permalink (paginated pages, 404, sitemap)
      if (typeof data.permalink === "string" && data.permalink.startsWith("/")) {
        return data.permalink;
      }
    }
    const stem = data.page.filePathStem;
    let rel = stem.replace(/^\/content\/en\//, "");
    rel = rel.replace(/(^|\/)index$/, "");
    return rel ? `/en/${rel}/` : "/en/";
  },
};
```

**After** (4 lines):

```json
{
  "lang": "en",
  "permalink": "/en/{{ page.filePathStem | replace('/content/en/', '') | replace('/index', '') }}/"
}
```

Delete the old `.js` file in the same commit.

### Edge case the template handles (sanity check)

- `src/content/is/index.njk` → `filePathStem` = `/content/is/index` → after replaces: `` (empty) → permalink `//` collapses to `/` via Eleventy's normaliser. Spec example confirms `/` is the expected output. If a build run shows `//` instead, fall back to the spec's exact pattern verbatim (no change needed — this is the spec).
- `src/content/en/index.njk` → `/en/`.
- `src/content/is/about/index.njk` → `/about/`.
- `src/content/en/services/foo.md` → `/en/services/foo/`.

## Expected outcome

1. `npm run build` produces the same `_site/` output tree as before the change. URL set is identical.
2. `_site/404.html`, `_site/sitemap.xml`, `_site/en/404.html`, `_site/en/sitemap.xml`, and every `greinar/*` article URL render at the same paths.
3. Net deletion: ~22 lines removed (14 + 15 from the two `.js` files; ~7 added across the two `.json` files).
4. Diff in `git log -p` reads as "implementation now matches `FRAMEWORK-I18N.md` lines 144–162 verbatim."

## Verification

1. `npm run build` succeeds with no Eleventy warnings about permalinks.
2. `find _site -name '*.html' -o -name '*.xml' | sort > /tmp/after.txt`; compare against a pre-change snapshot — diff must be empty.
3. Spot-check the four critical files in `_site/`: `/404.html`, `/sitemap.xml`, `/en/404.html`, `/en/sitemap.xml` exist and contain their expected content.
4. Spot-check one paginated article: `_site/greinar/<slug>/index.html` and `_site/en/greinar/<slug>/index.html` exist.

## Scope

**In scope:** rewriting the two directory-data files and renaming them to `.json`.

**Out of scope:**
- Any change to `404.njk`, `sitemap.njk`, `greinar/article.njk`, or any other page's frontmatter.
- Any change to `eleventy.config.js` (the `I18nPlugin` config keys off `lang`, which is preserved).
- Any change to `FRAMEWORK-I18N.md` (the spec is already correct; this fix brings code back to spec).
- Future per-collection directory-data files (e.g., `src/content/is/services/services.json`) — they already use the declarative form per spec §"Permalink strategy".

## Directive citations

- `simplicity.md §1` — "No abstraction without a concrete caller." The defensive `if (data.permalink !== undefined)` branch has zero callers; the JS function exists only to support that branch. Both go.
- `simplicity.md §4.1` — "Touch only what the change requires." The rewrite is contained to two files; no downstream page is edited.
- `consistency.md §3` — "One way per concept." The spec defines one way to express the i18n permalink strategy; the implementation now matches it.
- `reusability.md` — Don't hand-roll a shared helper when the framework's own convention (template-string permalink in directory data) already factors the shape correctly. Eleventy is the abstraction; the spec is the contract.
- `maintainability.md §5.1` — "Follow the codebase's conventions." `FRAMEWORK-I18N.md` is the codebase's stated convention for this exact concern.
