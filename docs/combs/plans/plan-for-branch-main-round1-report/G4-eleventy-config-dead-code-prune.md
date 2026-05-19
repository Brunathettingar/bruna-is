# G4 — Prune dead code from `eleventy.config.js`

**Severity:** High
**Specialty:** code-reviewer, consistency-auditor, simplifier
**Consolidates:** H5, L3, L6, M9
**Files touched:**
- `eleventy.config.js` (deletions only)
- `src/content/{is,en}/{thjonusta,geirar}/index.njk` (M9: optional one-line frontmatter edits — see "Scope" below)

## Why

Four findings collapse to a single observation: `eleventy.config.js` carries 25+ lines of code that no template, no data file, and no plugin consumes today. Every item below has been verified by grepping the source tree (excluding `node_modules`, `_site`, `docs/combs/`):

1. **H5 — Four `featured*` collections are guaranteed-empty.**
   `eleventy.config.js:151–165` registers `featuredServicesIs`, `featuredServicesEn`, `featuredSectorsIs`, `featuredSectorsEn`. Each calls `getFilteredByTag("services-is")` / `"services-en"` / `"sectors-is"` / `"sectors-en"`. **Nothing in `src/` carries those tags.** The strings `services-is`, `services-en`, `sectors-is`, `sectors-en` appear only as `eleventyNavigation.key` values on the section index pages (`src/content/{is,en}/thjonusta/index.njk:6` and `src/content/{is,en}/geirar/index.njk:6`) — keys, not tags. No `{dir}/{dir}.json` data file ever sets these tags either (there are no `.md` entries in `thjonusta/` or `geirar/` to be tagged; the sections are static `index.njk` pages). Zero template reads `collections.featuredServices*` or `collections.featuredSectors*`. The four `addCollection` registrations execute on every build to produce four empty arrays nobody reads.

2. **H5 — `where` / `sortBy` filters are unused.**
   `eleventy.config.js:100–110`. Recursive grep for `| where` and `| sortBy` across `src/**/*.njk` returns zero hits. They were registered to support a `featured*` consumption pattern that never materialized.

3. **L3 — `startsWith` filter is unused.**
   `eleventy.config.js:112–114`. The two sitemap templates that need a prefix check call the JavaScript string method directly:
   - `src/content/is/sitemap.njk:9` — `page.url.startsWith("/en/")`
   - `src/content/en/sitemap.njk:9` — `page.url.startsWith("/en/")`
   Nunjucks exposes JS string methods on string values, so the filter wraps `String.prototype.startsWith` without adding any behavior. Grep for `| startsWith` across `src/**/*.njk` returns zero hits.

4. **L6 — `interpolate()` helper has no live callsite.**
   `eleventy.config.js:66–68` defines `interpolate(str, data)` for `{{ key }}`-style substitution. Its only caller is the `t` filter at line 60 (`return data ? interpolate(entry[lang], data) : entry[lang]`), which fires only when a template passes a second argument to `t`. No template does (`/usr/bin/grep -rE "\| *t\(" src` returns zero matches; every observed callsite is `{{ "key" | t }}` with no argument). The branch is unreachable in the current codebase.

5. **M9 — Two parallel nav-membership mechanisms with overlapping purpose.**
   `eleventy.config.js:129–149` defines `navIs` / `navEn` collections that filter `getAll()` by `item.data.eleventyNavigation` presence **and** by URL prefix (`!item.url.startsWith("/en/")` vs `item.url.startsWith("/en/")`). The per-page `eleventyNavigation.key` values are language-suffixed (`home-is` / `home-en`, `services-is` / `services-en`, …) to prevent the navigation plugin from collapsing same-key entries across locales. The suffix is therefore necessary for the plugin's internal key uniqueness, **but** it is not what selects per-locale nav membership — that work is done entirely by the URL-prefix filter in `navIs` / `navEn`. The keys are also consumed indirectly by `src/_includes/partials/breadcrumb.njk:1` (`eleventyNavigationBreadcrumb(eleventyNavigation.key, …)`), so they aren't pure decoration. The finding is a smaller one than H5/L3/L6: there's no dead code to delete here, only an undocumented overlap between two mechanisms that look redundant to a fresh reader.

### Directive alignment

- `simplicity.md §1` (YAGNI): all four `featured*` collections, both `where` / `sortBy` filters, the `startsWith` filter, and the `interpolate` helper exist to support callers that don't exist. Each is "one abstraction with zero concrete callers."
- `maintainability.md §2` (no dead code): a future contributor reading `eleventy.config.js` has to mentally model 25+ lines of config that produce no output and reach no template — pure cognitive tax.
- `scope-discipline.md`: the deletions in this fix are the *only* edits; no behavior change, no refactor, no rename.

## Scope

Pure deletion. No template edits required for H5 / L3 / L6 (nothing references the deleted symbols). M9 is documentation-only (a one-line comment in `eleventy.config.js`) — see "How" below. **Optional** one-character cleanup on the four section-index `eleventyNavigation.key` values is called out in "Optional cosmetic follow-up" and is **not** part of this fix.

### Dependency on G2 (content-model migration) — read before deleting

The H5 deletions are conditional on G2's landing order. G2 is the planned migration that introduces real `.md` entries under `src/content/{is,en}/{thjonusta,geirar}/` tagged via directory-data files with `services-{lang}` / `sectors-{lang}` and a `featured: true` field. If G2 lands first, the four `featured*` collections become live (they receive entries) and the home page pillar markup at `src/content/{is,en}/index.njk` collapses into `{% for s in collections.featuredServicesIs %}` loops — at which point the collections must **stay** and the `where` / `sortBy` filters may also be needed by the new loops.

The two possible sequencings are:

| Order | What G4 deletes | What G2 owns |
|---|---|---|
| **G4 first** (current assumption) | All four `featured*` collections (lines 151–165), `where`, `sortBy`, `startsWith`, `interpolate` | G2's plan re-introduces wired `featured*` collections and, if needed, the `where` / `sortBy` filters as part of its content-model migration. G4's deletion is reverted by G2's additions; the net effect is that no dead config ever shipped in the interim. |
| **G2 first** | Only `startsWith`, `interpolate`, and the M9 comment edit. The `featured*` collections are now live (entries exist with the right tags); `where` / `sortBy` are kept if G2's home-page loops use them, deleted if they don't. | G2 owns the `featured*` block. G4 reduces to a smaller pure-prune of `startsWith` / `interpolate` / M9. |

**Operational rule for the implementer:** before touching lines 151–165, run `git log --oneline -5 docs/combs/plans/` (or check the project tracker) to confirm G2 has *not* landed. If it has, skip the `featured*` block and the `where` / `sortBy` deletions — only L3, L6, and M9 remain in scope.

## What

In G4-first order (the assumed sequencing — adjust per the dependency table above):

1. **Delete `where` filter** (`eleventy.config.js:100–102`).
2. **Delete `sortBy` filter** (`eleventy.config.js:104–110`).
3. **Delete `startsWith` filter** (`eleventy.config.js:112–114`).
4. **Delete `interpolate` helper** (`eleventy.config.js:66–68`). The `t` filter at line 60 must lose the `interpolate(...)` branch as part of the same delete (see "How" — this is a five-line edit, not a clean function deletion, because `t` currently calls it).
5. **Delete the `featuredServices{Is,En}` / `featuredSectors{Is,En}` block** (`eleventy.config.js:151–165`, including the surrounding `for` loop).
6. **M9 — add a one-line comment** above the `navIs` collection (no behavioral change) explaining that URL prefix selects nav membership and the per-page `key` suffix is for plugin uniqueness + the breadcrumb partial. This costs one line and prevents the next reader from filing the same finding.

No template changes. No frontmatter changes. No CSS, no JS. The build output is byte-identical (all five deletions touch only zero-output code paths).

### Optional cosmetic follow-up (out of scope)

The `eleventyNavigation.key` values for the four section-index pages are suffixed (`services-is`, `services-en`, `sectors-is`, `sectors-en`) — the suffix is required by the navigation plugin for cross-locale key uniqueness and is consumed by `breadcrumb.njk`, so it must stay. The corresponding *top-level* singleton pages (home, about, articles, calculator) use the same suffix pattern (`home-is` / `home-en`, etc.) per `FRAMEWORK-I18N.md` line 509. No edits to these frontmatter blocks are part of G4; the M9 comment in `eleventy.config.js` is the entire fix for that finding.

## How

### `eleventy.config.js` — edit 1: collapse the `t` filter and drop `interpolate`

**Lines 55–68, before:**

```js
  eleventyConfig.addFilter("t", function (key, data) {
    const lang = this.ctx?.lang || this.page?.lang || "is";
    const entry = translations[key];
    if (!entry) return key;
    if (entry[lang] !== undefined) {
      return data ? interpolate(entry[lang], data) : entry[lang];
    }
    // Fallback: try Icelandic, then English, then the key itself.
    return entry.is ?? entry.en ?? key;
  });

  function interpolate(str, data) {
    return String(str).replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k) => data?.[k] ?? m);
  }
```

**After:**

```js
  eleventyConfig.addFilter("t", function (key) {
    const lang = this.ctx?.lang || this.page?.lang || "is";
    const entry = translations[key];
    if (!entry) return key;
    if (entry[lang] !== undefined) return entry[lang];
    // Fallback: try Icelandic, then English, then the key itself.
    return entry.is ?? entry.en ?? key;
  });
```

Rationale: dropping the unused `data` parameter and the unreachable `interpolate` branch removes both the helper and the dead conditional. Net change: −10 lines.

> **Sequencing note (G3 overlap):** G3 plans to address the `t` filter as a whole (i18n plugin hygiene — eliminating the wrapper if the upstream plugin's URL detection issue can be resolved). If G3 lands first, the `interpolate` helper is removed there and this edit becomes a no-op. If G4 lands first (assumed), G3 must rebase against the simplified `t` filter.

### `eleventy.config.js` — edit 2: delete `where` and `sortBy` filters

**Lines 100–110, before:**

```js
  eleventyConfig.addFilter("where", (items, key, value) =>
    (items || []).filter((item) => (item.data ? item.data[key] : item[key]) === value)
  );

  eleventyConfig.addFilter("sortBy", (items, key) =>
    [...(items || [])].sort((a, b) => {
      const av = a.data ? a.data[key] : a[key];
      const bv = b.data ? b.data[key] : b[key];
      return (av ?? 0) - (bv ?? 0);
    })
  );
```

**After:** delete the entire block (11 lines including the blank line between filters).

### `eleventy.config.js` — edit 3: delete `startsWith` filter

**Lines 112–114, before:**

```js
  eleventyConfig.addFilter("startsWith", (str, prefix) =>
    typeof str === "string" && str.startsWith(prefix)
  );
```

**After:** delete (3 lines + surrounding blank line).

### `eleventy.config.js` — edit 4: delete the `featured*` collection block

**Lines 151–165, before:**

```js
  for (const lang of ["is", "en"]) {
    eleventyConfig.addCollection(`featuredServices${lang === "is" ? "Is" : "En"}`, (api) =>
      api
        .getFilteredByTag(`services-${lang}`)
        .filter((item) => item.data.featured === true)
        .sort((a, b) => (a.data.order || 0) - (b.data.order || 0))
    );

    eleventyConfig.addCollection(`featuredSectors${lang === "is" ? "Is" : "En"}`, (api) =>
      api
        .getFilteredByTag(`sectors-${lang}`)
        .filter((item) => item.data.featured === true)
        .sort((a, b) => (a.data.order || 0) - (b.data.order || 0))
    );
  }
```

**After:** delete the entire `for` loop and its contents (15 lines).

### `eleventy.config.js` — edit 5: M9 documentation comment

**Lines 129–130, before:**

```js
  eleventyConfig.addCollection("navIs", (api) =>
    api
```

**After:**

```js
  // Nav membership is selected by URL prefix below — the per-page
  // `eleventyNavigation.key` language suffix exists for plugin key uniqueness
  // (and for the breadcrumb partial), not for nav selection.
  eleventyConfig.addCollection("navIs", (api) =>
    api
```

Net change: +3 lines (one comment block).

### Aggregate

Roughly −36 lines of executable config, +3 lines of comment, zero behavior change. After the fix, `eleventy.config.js` is approximately 130 lines (down from 177).

## Verification

1. `/usr/bin/grep -rnE "(featuredServicesIs|featuredServicesEn|featuredSectorsIs|featuredSectorsEn|interpolate)" eleventy.config.js src/` returns zero matches.
2. `/usr/bin/grep -rnE "\| *(where|sortBy|startsWith)\b" src/` returns zero matches (it already does today; this confirms nothing slipped in during the edit window).
3. `npx @11ty/eleventy` builds without errors or warnings.
4. Diff `_site/` before and after: byte-identical except for `_site/sitemap.xml` and `_site/en/sitemap.xml` (which depend on no deleted symbols, so they should also be byte-identical — confirm).
5. Custom-filter whitelist check per `FRAMEWORK-PORT-PROMPT.md` Part A: after the fix, the only filters registered in `eleventy.config.js` are `t`, `dateDisplay`, `dateIso`, `jsonEscape`, and `alternateUrl`. Of these, `dateDisplay`, `dateIso`, and `jsonEscape` are the three Part-A-whitelisted custom filters. `t` is the wrapper around the i18n plugin (covered by G3). `alternateUrl` is project-specific and out of scope for this fix.
6. Spot-check `t` filter usage across `src/**/*.njk` still resolves (e.g., `{{ "ui.skip_to_content" | t }}` in `src/_includes/layouts/page.njk:4` renders correctly in both locales). This is the only edit that touches an executing code path.
7. Spot-check nav rendering in both locales: header on `_site/index.html` and `_site/en/index.html` still contains exactly the expected per-locale links. The M9 comment is documentation; no behavioral change expected.

## Follow-up (out of scope)

- **G2 sequencing:** when G2 lands, its plan re-introduces wired `featured*` collections (and `where` / `sortBy` if its templates need them). The implementer should reference this fix in G2's "supersedes" / "depends-on" field.
- **G3 sequencing:** when G3 lands and rewrites the `t` filter, the simplified `t` from this fix is the rebase target.
- The optional `eleventyNavigation.key` suffix harmonization (M9 cosmetic follow-up) can be addressed in a separate fix only if a future reader files the same finding again; the comment added here should prevent that.
