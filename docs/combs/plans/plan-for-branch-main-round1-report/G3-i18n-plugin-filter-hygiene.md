# G3 — i18n plugin + filter hygiene: restore signal, collapse to one mechanism

**Severity:** Critical
**Specialty:** silent-failure-hunter, consistency-auditor, code-reviewer, simplifier
**Consolidates:** C7, C9, H12, H13
**File(s):** `eleventy.config.js:41–68`, `package.json:15`, `src/_includes/partials/header.njk`, `src/_includes/partials/footer.njk`, `src/_includes/partials/utility-bar.njk`, `src/_includes/partials/breadcrumb.njk`, `src/_includes/layouts/page.njk`
**Run with:** G15 (build-time assertions) — see "Coordination with G15" below.

---

## What

Stand the i18n stack back up against `FRAMEWORK-I18N.md` exactly, and collapse the dual-mechanism translation layer down to one. Four interlocking changes:

1. `I18nPlugin` — flip `errorMode: "never"` → `errorMode: "allow-fallback"` (spec §"Config additions", line 64).
2. `eleventy-plugin-i18n` — bump `package.json` from `^0.1.3` to `^1.0.1` (spec §"Plugins", line 41).
3. `fallbackLocales` — replace `{ en: "is", is: "en", "*": "is" }` with `{ en: "is" }` (spec §"Config additions", line 70). One direction only: missing EN falls back to IS. Missing IS does **not** fall back to EN — an IS page with a missing IS string is a bug, not a translatable event, and must be visible.
4. Translation filter — delete the hand-rolled `t` filter and the dead `interpolate()` helper. Rewire all five callsites to `| i18n(lang)` (the plugin filter, with an explicit `localeOverride` argument that bypasses the plugin's broken URL-prefix auto-detection).

After this lands: one plugin, one filter, one fallback direction. Missing keys log to stderr. Missing IS strings on IS pages render the raw key (loud) instead of silently falling through to EN.

---

## Why

The current stack stacks three layers of fallback on top of each other and silences every error mode in the process:

```
template:        {{ "nav.contact" | t }}
   │
   ▼
hand-rolled t (eleventy.config.js:55–64):
     if (!entry) return key;                  ← H13: silent on typo'd key
     if (entry[lang] !== undefined) …         ← happy path
     return entry.is ?? entry.en ?? key;      ← C7-adjacent: silent IS↔EN cross
   │
   ▼
(plugin filter `i18n` exists but is never called — C9 dead branch)
   │
   ▼
I18nPlugin errorMode: "never"                 ← C7: silences locale_url misses
fallbackLocales { en:"is", is:"en", "*":"is" } ← C7: bidirectional silent swap
```

Specific failure modes the consolidated fix retires:

| # | Failure | Concrete example | Today's behavior |
|---|---|---|---|
| C7 | Bidirectional `fallbackLocales` | Add `"nav.about": { en: "About" }` only (forget IS). IS nav renders "About". | Silent. No warn, no error. |
| C7 | `errorMode: "never"` | A page only exists in EN; `\| locale_url` from the IS twin returns the IS URL anyway. | Silent. Broken link. |
| C9 | Dual filters, plugin dead | Two registration sites for the same concept; future maintainer can't tell which is authoritative. | Cognitive load + pinned-to-old-version risk. |
| C9 | Version drift | `package.json` says `^0.1.3`; spec says `^1.0.1`. | Out-of-spec; works today but tomorrow's `npm i` may pull a different transitive resolution than another contributor's. |
| H12 | `interpolate()` swallows missing keys | `"foo.greet": { is: "Halló {{name}}" }` used as `\| t` (no data arg). | Renders literal `Halló {{name}}`. No warn. |
| H12 | `interpolate()` is dead reachable code | Nothing in the tree passes a `data` arg to `t`. | YAGNI violation; tested-by-nobody; bit-rot risk. |
| H13 | Typo-d key | `{{ "nav.contat" \| t }}`. | Renders `nav.contat` verbatim. No warn. |

The hand-rolled `t` was introduced to work around a real bug in the plugin's URL-prefix auto-detection (`i18n.js:19` does `url.split('/')[1]` — for an IS page at `/about/` that returns `'about'`, not `'is'`). That fix was correct in shape (pass `lang` explicitly) but wrong in execution (rebuild the filter from scratch). The plugin's `i18n` filter already accepts `localeOverride` as its third argument and exposes the missing-key console.warn that H13 wants for free. So Path A keeps the workaround intent (explicit `lang`) while dropping the duplicate machinery.

Directive citations:
- `quality.md §2` (honest error handling) — three silent-fallback layers, each independently suppressing signal that should reach the maintainer's terminal. Restoring `errorMode: "allow-fallback"` and `fallbackLocales: { en: "is" }` puts the IS-side errors back in stderr where they belong.
- `quality.md §4` (no silent fallbacks) — the bidirectional fallback, the `entry.is ?? entry.en` cascade in `t`, and `interpolate()`'s literal-token return path are all silent fallbacks. All three go.
- `simplicity.md §1` (YAGNI) — `interpolate()` has no callsite passing `data`; the plugin's `templite` already handles `{{name}}` if we ever need it. Two registration calls, two filters, one is dead. Cut it.
- `consistency.md §3` (spec alignment) — `FRAMEWORK-I18N.md` §"Plugins" and §"Config additions" are unambiguous about plugin version, `errorMode`, and `fallbackLocales` shape. Today's code is out of spec on every one of those three lines. The user has explicitly overridden any contrary deviations doc to keep the spec authoritative here.

---

## Where

- `eleventy.config.js:41–44` — `I18nPlugin` registration. Change `errorMode`.
- `eleventy.config.js:46–49` — `eleventy-plugin-i18n` registration. Change `fallbackLocales`.
- `eleventy.config.js:51–68` — comment block + `t` filter + `interpolate()` helper. Delete all three (lines 51–68 inclusive).
- `package.json:15` — bump `eleventy-plugin-i18n` dependency.
- Callsites that use `| t` (all become `| i18n(lang)`):
  - `src/_includes/partials/header.njk:16, 18, 26` (3 calls)
  - `src/_includes/partials/footer.njk:7, 12, 14, 15, 16, 20, 22, 23, 24, 28, 37, 39` (12 calls)
  - `src/_includes/partials/utility-bar.njk:6, 7, 13, 14` (4 calls — two of these use dynamic key `("lang.label." + otherLang)`, still works through the filter unchanged)
  - `src/_includes/partials/breadcrumb.njk:5` (1 call)
  - `src/_includes/layouts/page.njk:4` (1 call)
- (No template uses `| i18n` today — confirmed by repo-wide grep — so there are no pre-existing `| i18n` calls to reconcile.)

---

## How

### Decision: take Path A (spec-aligned). Path B is documented as a Considered alternative and rejected.

Path A keeps the framework's "two plugins, one filter (`i18n`)" model intact: `I18nPlugin` handles links between localized content (`locale_url`, `locale_links`, `page.lang`); `eleventy-plugin-i18n` handles UI string translation via the dictionary. The hand-rolled `t` re-implements the second of those — its existence is the C9 inconsistency. The original justification (URL-prefix auto-detection breaks for IS-at-root) is preserved by passing `lang` as the explicit `localeOverride` argument to the plugin filter, which the plugin has supported since 0.1.3. No new wrapper needed.

### Edits

#### 1. `package.json:15`

**Before:**

```json
    "eleventy-plugin-i18n": "^0.1.3"
```

**After:**

```json
    "eleventy-plugin-i18n": "^1.0.1"
```

Then run `npm i` to refresh `package-lock.json`. Commit both files together.

#### 2. `eleventy.config.js:41–68` — single contiguous block

**Before** (lines 41–68 inclusive):

```js
  eleventyConfig.addPlugin(I18nPlugin, {
    defaultLanguage: "is",
    errorMode: "never",
  });

  eleventyConfig.addPlugin(i18nPlugin, {
    translations,
    fallbackLocales: { en: "is", is: "en", "*": "is" },
  });

  // Wrapper that uses the cascade `lang` variable instead of inferring
  // from URL segments. The plugin's URL-prefix detection breaks for the
  // Icelandic-at-root tree and for layout/partial render contexts where
  // `this.page.url` doesn't reflect the current page.
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

**After** (same range, ~14 lines shorter):

```js
  eleventyConfig.addPlugin(I18nPlugin, {
    defaultLanguage: "is",
    errorMode: "allow-fallback",
  });

  // UI string dictionary. The plugin's `i18n` filter auto-detects locale
  // from `url.split('/')[1]`, which returns `'about'` (not `'is'`) for an
  // Icelandic-at-root page like `/about/`. Every callsite therefore passes
  // `lang` as the explicit `localeOverride` argument:
  //
  //     {{ "key" | i18n(lang) }}            ← no interpolation data
  //     {{ "key" | i18n({ name }, lang) }}  ← with interpolation data
  //
  // Missing keys log to stderr (chalk-red console.warn). Missing IS strings
  // on IS pages render the raw key — that is intentional. Add the key to
  // src/_data/i18n.js.
  eleventyConfig.addPlugin(i18nPlugin, {
    translations,
    fallbackLocales: { en: "is" },
  });
```

That is the entire delta for `eleventy.config.js`. The `t` filter and `interpolate()` helper are gone. The import at line 5 (`import translations from "./src/_data/i18n.js";`) stays — it's still passed to the plugin. (If the dev-mode missing-key audit in §3 below is wired in, that import is also consumed by the audit hook.)

#### 3. Template rewrites — five files, mechanical search-and-replace

The pattern is identical across all five files: replace `| t` with `| i18n(lang)`. The `lang` variable is in scope at every callsite (set by directory data cascade — `src/content/is/is.json` and `src/content/en/en.json`).

For the two utility-bar calls that use a dynamic key:

```njk
{{ ("lang.label." + otherLang) | t }}
```

becomes:

```njk
{{ ("lang.label." + otherLang) | i18n(lang) }}
```

Note: the key is computed from `otherLang`, but we still pass the *current page's* `lang` as the locale override. We want the label for the other language to render in the current page's locale (e.g. on an IS page, the EN-switch button reads "EN" — the lookup is `lang.label.en` in locale `is`, which returns `"EN"`).

Full callsite-by-callsite map (line numbers as of current `main`):

| File | Line | Before | After |
|---|---|---|---|
| `header.njk` | 16 | `{{ "brand.tagline" \| t \| safe }}` | `{{ "brand.tagline" \| i18n(lang) \| safe }}` |
| `header.njk` | 18 | `aria-label="{{ 'ui.menu' \| t }}"` | `aria-label="{{ 'ui.menu' \| i18n(lang) }}"` |
| `header.njk` | 26 | `{{ "nav.contact" \| t }}` | `{{ "nav.contact" \| i18n(lang) }}` |
| `footer.njk` | 7 | `{{ "brand.tagline" \| t \| safe }}` | `{{ "brand.tagline" \| i18n(lang) \| safe }}` |
| `footer.njk` | 12 | `{{ "footer.solutions_heading" \| t }}` | `{{ "footer.solutions_heading" \| i18n(lang) }}` |
| `footer.njk` | 14 | `{{ "nav.services" \| t }}` | `{{ "nav.services" \| i18n(lang) }}` |
| `footer.njk` | 15 | `{{ "nav.sectors" \| t }}` | `{{ "nav.sectors" \| i18n(lang) }}` |
| `footer.njk` | 16 | `{{ "nav.quote" \| t }}` | `{{ "nav.quote" \| i18n(lang) }}` |
| `footer.njk` | 20 | `{{ "footer.company_heading" \| t }}` | `{{ "footer.company_heading" \| i18n(lang) }}` |
| `footer.njk` | 22 | `{{ "nav.about" \| t }}` | `{{ "nav.about" \| i18n(lang) }}` |
| `footer.njk` | 23 | `{{ "footer.vision" \| t }}` | `{{ "footer.vision" \| i18n(lang) }}` |
| `footer.njk` | 24 | `{{ "nav.articles" \| t }}` | `{{ "nav.articles" \| i18n(lang) }}` |
| `footer.njk` | 28 | `{{ "footer.contact_heading" \| t }}` | `{{ "footer.contact_heading" \| i18n(lang) }}` |
| `footer.njk` | 37 | `{{ "footer.copyright" \| t }}` | `{{ "footer.copyright" \| i18n(lang) }}` |
| `footer.njk` | 39 | `{{ "footer.sitemap" \| t }}` | `{{ "footer.sitemap" \| i18n(lang) }}` |
| `utility-bar.njk` | 6 | `{{ "ui.certified" \| t }}` | `{{ "ui.certified" \| i18n(lang) }}` |
| `utility-bar.njk` | 7 | `{{ "utility.tagline" \| t }}` | `{{ "utility.tagline" \| i18n(lang) }}` |
| `utility-bar.njk` | 13 | `{{ ("lang.label." + otherLang) \| t }}` | `{{ ("lang.label." + otherLang) \| i18n(lang) }}` |
| `utility-bar.njk` | 14 | `{{ ("lang.label." + lang) \| t }}` | `{{ ("lang.label." + lang) \| i18n(lang) }}` |
| `breadcrumb.njk` | 5 | `{{ "ui.home" \| t }}` | `{{ "ui.home" \| i18n(lang) }}` |
| `page.njk` | 4 | `{{ "ui.skip_to_content" \| t }}` | `{{ "ui.skip_to_content" \| i18n(lang) }}` |

Mechanical regex sanity check: after the edits, the repo-wide pattern `| t ` (filter `t` with trailing space, the only callsite shape used here) must return zero matches in `src/`. If anything turns up, replace it the same way.

#### 4. Dev-mode missing-key audit (H13 acceptance criterion)

The plugin already emits a `chalk.red` console.warn on missing-key lookups (`i18n.js:44–48` in 0.1.3, behavior preserved in 1.0.1). That covers most of H13 for free. But warns scroll past quickly in a full build. To make missing keys triage-able rather than ignorable, add a lightweight reconciliation that emits an end-of-build summary.

Add to `eleventy.config.js` immediately after the two plugin registrations (and before the date filters):

```js
  // Dev-time missing-translation audit. Captures every {{ "key" | i18n(lang) }}
  // lookup against the dictionary and prints a single summary after the build.
  // Set ELEVENTY_I18N_STRICT=1 to fail the build instead of warning.
  if (process.env.ELEVENTY_RUN_MODE === "serve" || process.env.ELEVENTY_I18N_STRICT === "1") {
    const missing = new Set();
    eleventyConfig.addFilter("i18nAudit", function (key) {
      // No-op passthrough; presence of this filter on any callsite would be
      // wired by a future hook. Today the audit runs from the dictionary side:
      // we cross-check translations against a known callsite list at build end.
      return key;
    });
    eleventyConfig.on("eleventy.after", () => {
      // Best-effort scan: walk src/_includes for `| i18n(` tokens and verify
      // each key exists in the dictionary with both `is` and `en` entries.
      // Implementation lives in a small helper module so this file stays lean.
      // See `scripts/i18n-audit.mjs` (added alongside this change).
      import("./scripts/i18n-audit.mjs").then(m =>
        m.run({ translations, missing, strict: process.env.ELEVENTY_I18N_STRICT === "1" })
      );
    });
  }
```

**Important:** the inline filter scaffolding above is a sketch; the actual missing-key audit is best implemented as the build-time assertion bundle described in **G15**. If G15 is on this milestone (it should be — see "Coordination with G15" below), do **not** add the `eleventy.after` hook here. G15 owns the full audit script (`scripts/i18n-audit.mjs`), its strict-mode env flag, and the failure surface. This plan stops at the `errorMode` / `fallbackLocales` / filter-rewrite changes, and leaves the dev-mode summary surface to G15.

If G15 is **not** on this milestone, file a follow-up (`G3.1` or backlog) for the audit script and accept the plugin's per-callsite stderr warns as the interim signal. Do not inline a partial implementation here.

#### 5. Things this plan deliberately does *not* do

- Does **not** touch any `locale_url` / `locale_links` callsites. Those are owned by C10 (the `alternateUrl` evaluation) and the framework-spec language-switcher fix.
- Does **not** alter `i18n.js` dictionary entries. The data shape is already spec-compliant. Filling missing translations is content work, not a plan-G3 concern.
- Does **not** add a `t` shim that proxies to `i18n` "for back-compat". A clean rename across five files is faster to read than a wrapper that lies about which mechanism is authoritative.

---

## Expected Outcome

After `npm i && npx @11ty/eleventy`:

1. **Diff cleanliness.** `git diff eleventy.config.js` shows ~14 lines removed (`t` filter + `interpolate` + their comment), 2 lines changed (`errorMode`, `fallbackLocales`). No new top-level functions.

2. **No `| t` left in templates.** `grep -rn '| t ' src/` returns zero hits. `grep -rn '| i18n(' src/` returns 21 hits (the count in §3's table).

3. **Build still succeeds.** Output for `/about/` and `/en/about/` contains the same translated strings as before — no visible regression for keys that exist in both locales.

4. **Missing-key signal is restored.** Temporarily edit `src/_includes/partials/footer.njk:39` to `{{ "footer.sitemapXXX" | i18n(lang) }}`, rebuild, and observe in stderr:
   ```
   [i18n] Translation for 'footer.sitemapXXX' in 'is' not found. No fallback locale specified.
   [i18n] Translation for 'footer.sitemapXXX' in 'en' not found. No fallback locale specified.
   ```
   Revert the typo. Today this scenario is silent.

5. **One-directional fallback works.** Add to `src/_data/i18n.js`:
   ```js
   "test.fallback": { is: "Prufa" },  // EN missing on purpose
   ```
   Add one callsite (anywhere, even the footer temporarily) and rebuild. The IS page renders "Prufa". The EN page renders "Prufa" *and* emits a yellow `[i18n] … Using 'is' fallback.` warning. Now remove the EN side and add the inverse:
   ```js
   "test.fallback": { en: "Test" },  // IS missing
   ```
   The IS page renders the raw key `test.fallback` and warns red — *not* the EN string. That's the C7 fix in action: missing IS no longer silently borrows from EN. Revert both probes when done.

6. **Plugin upgrade landed.** `cat package.json | grep eleventy-plugin-i18n` shows `^1.0.1`. `npm ls eleventy-plugin-i18n` resolves to `1.x.y`.

7. **Dead code gone.** `grep -n 'function interpolate' eleventy.config.js` returns nothing. `grep -n 'addFilter("t"' eleventy.config.js` returns nothing.

---

## Scope

**In scope:** the four edits in §How (config, package.json, five template files, plugin version bump) plus the npm install. Twenty-one filter callsites mechanically rewritten. Two configuration lines changed in `eleventy.config.js`. Two function bodies (~14 lines) deleted from `eleventy.config.js`.

**Out of scope:**
- Adding missing translation keys to `src/_data/i18n.js` — that's content work; surfaces naturally once the warns are restored.
- Replacing `alternateUrl` with `locale_url`/`locale_links` — owned by C10.
- The full missing-translation audit script (`scripts/i18n-audit.mjs`) — owned by G15 if scheduled, otherwise a follow-up.
- Any change to `I18nPlugin`'s `defaultLanguage` — it stays `"is"`.
- Markdown content body text. Translation filter is for chrome strings only; per spec §"Conventions and guardrails" line 507.

---

## Coordination with G15

**This plan should run with G15.** G15 (build-time assertions) is the right home for the recurring missing-translation audit, including:

- A script that scans `src/_includes/` and `src/content/` for `| i18n(lang)` tokens, extracts the literal key from each, and asserts the key exists in `src/_data/i18n.js` with both `is` and `en` entries (or just `is` if the dictionary explicitly opts out of EN for that key via a convention).
- An `ELEVENTY_I18N_STRICT=1` env flag that turns missing keys into a non-zero exit code in CI.
- A dev-mode summary printed after `eleventy.after` so the warns don't scroll past unnoticed.

If G15 is on the milestone: this plan (G3) lands first, G15 lands second, and G15's audit consumes the now-consistent `| i18n(lang)` callsite pattern. The G15 script becomes trivial to write because there's only one filter to grep for, not two.

If G15 is **not** on the milestone: accept the plugin's per-callsite stderr warns as the interim signal (which is still a strict upgrade over today's silent behavior), and file the audit-script work as a follow-up. Do not inline a half-built audit into `eleventy.config.js` as part of this plan.

---

## Directive citations

- `quality.md §2` — honest error handling. The bidirectional fallback, `errorMode: "never"`, and the `t` filter's `entry.is ?? entry.en ?? key` chain all suppress legitimate error signal. Restoring `errorMode: "allow-fallback"` and the spec's one-way fallback puts the signal back.
- `quality.md §4` — no silent fallbacks. Three independent silent-fallback paths are removed: bidirectional `fallbackLocales`, the IS-or-EN-or-key cascade inside `t`, and `interpolate()`'s `data?.[k] ?? m` (which returns the literal `{{key}}` token on missing data).
- `simplicity.md §1` — YAGNI. `interpolate()` has no callsite passing `data`. The plugin filter handles `{{name}}` via `templite` already, so even if a future caller needs interpolation, the machinery exists. Two filter registrations collapse to one. Net deletion.
- `consistency.md §3` — spec alignment. `FRAMEWORK-I18N.md` mandates `eleventy-plugin-i18n@^1.0.1`, `errorMode: "allow-fallback"`, and `fallbackLocales: { en: "is" }`. The current code is out of spec on all three.
- `FRAMEWORK-I18N.md §"Plugins"` (lines 22–44) — two-plugin contract; the hand-rolled `t` replaces the second plugin's filter and is not part of the contract.
- `FRAMEWORK-I18N.md §"UI string dictionary"` (lines 197–231) — usage pattern is `{{ "key" | i18n }}`. We pass `(lang)` as a defensive override because the plugin's URL-segment auto-detect breaks for IS-at-root; that detail is a tactical workaround, not a spec deviation, and we document it in the inline config comment.
- `FRAMEWORK-I18N.md §"Conventions and guardrails"` line 507 — "Never inline a translatable string in a template." Reinforces the dictionary-is-authoritative model; we don't introduce any new shim that could become a second dictionary.

---

## Considered alternatives

### Path B — drop `eleventy-plugin-i18n`, keep hand-rolled `t` as the sole mechanism

**Sketch.** Remove `eleventy-plugin-i18n` from `package.json` entirely. Remove `import i18nPlugin from "eleventy-plugin-i18n"` and the `addPlugin(i18nPlugin, …)` registration in `eleventy.config.js`. Keep the `t` filter as the single translation mechanism. Modify `t` to throw in dev and to push missing keys onto a build-time list in prod:

```js
const missingKeys = new Set();
eleventyConfig.addFilter("t", function (key) {
  const lang = this.ctx?.lang || this.page?.lang || "is";
  const entry = translations[key];
  if (!entry) {
    missingKeys.add(`${key}@${lang}`);
    if (process.env.ELEVENTY_I18N_STRICT === "1") {
      throw new Error(`[i18n] missing key '${key}'`);
    }
    console.warn(`[i18n] missing key '${key}' (lang=${lang})`);
    return key;
  }
  if (entry[lang] !== undefined) return entry[lang];
  if (lang === "en" && entry.is !== undefined) {
    console.warn(`[i18n] missing 'en' for '${key}', falling back to 'is'`);
    return entry.is;
  }
  missingKeys.add(`${key}@${lang}`);
  console.warn(`[i18n] missing '${lang}' for '${key}'`);
  return key;
});
```

Templates stay on `| t` — no callsite churn.

**Rejected because:**

1. **Spec deviation.** `FRAMEWORK-I18N.md §"Plugins"` explicitly names `eleventy-plugin-i18n` as a hard requirement layered on top of `FRAMEWORK-PORT-PROMPT.md`. The user's stated focus in this round is "per FRAMEWORK-I18N.md exactly". Path B is faster but trades spec compliance for ~30 seconds of search-and-replace savings. Wrong trade.
2. **Loses `templite` interpolation.** The plugin uses `templite` for `{{name}}` substitution. Path B's `t` filter would need to re-implement interpolation from scratch (the C9 finding's H12 sub-issue calls out exactly this — the existing `interpolate()` silently returns literals on missing keys). We'd be writing the bug we're trying to delete.
3. **One-person-knows-it surface.** A maintainer who reads `FRAMEWORK-I18N.md` and then opens `eleventy.config.js` will be confused by a `t` filter where the spec says there should be an `i18n` filter. Path A removes that surprise entirely.
4. **No SEO/locale-links coupling regression.** Path B leaves `I18nPlugin` alone, so `locale_url`/`locale_links` still work — but those don't bring `i18n` along. The user is more likely to add a third filter later when they need plural rules or RTL or anything `eleventy-plugin-i18n` ships out of the box.

**One thing Path B gets right:** the strict-mode env flag. Path A's audit (delegated to G15) should adopt the `ELEVENTY_I18N_STRICT=1` convention.

### Path A variant — keep `t` as a thin proxy to `| i18n(lang)`

Rejected with prejudice. A two-line shim that just forwards to the spec-compliant filter buys nothing except a second name for the same operation, plus the risk that someone reads `t` and assumes a custom implementation (because that's what it was historically). One filter, one name.

### Variant — leave `errorMode: "never"` because the spec is "too strict for our content"

The user has explicitly chosen to override the deviations doc on this finding. Per `quality.md §2` and §4, silent error modes in a framework-strict project are a contradiction the user has already resolved in favor of the spec. Not considered further.
