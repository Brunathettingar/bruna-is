# G13 — Article JSON-LD completeness + locale-title null guards

- **Severity:** High
- **Specialty:** code-reviewer, silent-failure-hunter
- **Consolidates:** H8, H11
- **Files affected:**
  - `src/content/is/greinar/article.njk`
  - `src/content/en/greinar/article.njk`

## What

Two defects in the paginated article detail layouts, fixed together because they touch the same two files and the same frontmatter / JSON-LD blocks:

1. **H8 — Article JSON-LD is missing required Google rich-results fields.** The `Article` block omits `mainEntityOfPage` and `dateModified`, and the `image` field interpolates `meta.url` (and `article.image`) directly into JSON without `| jsonEscape`. The framework rule (per the SEO/a11y user focus and `FRAMEWORK-I18N.md` §"JSON-LD per page") is *no unescaped user-controlled strings in JSON-LD* — applied uniformly to every interpolation inside `<script type="application/ld+json">`, not just the obviously author-authored ones.
2. **H11 — `eleventyComputed.title` and `description` read `article.title.is` / `article.summary.en` with no null guard.** Today every entry in `src/_data/articles.js` carries both `is` and `en` keys, so the bug is latent. The first entry that omits one will render `undefined` literally into `<title>`, `<meta name="description">`, OG/Twitter meta (via `seo-meta.njk`), **and** the JSON-LD `headline` / `description` — and may also throw "Cannot read properties of undefined" depending on how Nunjucks resolves the chain.

Both findings live inside the same two templates, both touch the article's title resolution path, and the JSON-LD block reads the same `article.title[lang]` / `article.summary[lang]` values that the eleventyComputed block reads. Fixing them together avoids re-touching the same files twice.

## Why

- **`mainEntityOfPage` and `dateModified` are required (or strongly recommended) for Google rich results on `Article`.** Per `FRAMEWORK-DOCS.md` §"Schema.org / JSON-LD" (which links Google's structured-data docs and the Rich Results Test) the article must validate as a *valid* `Article`, not just a syntactically-correct one. The Rich Results Test reports `mainEntityOfPage` and `dateModified` as missing-but-recommended fields and downgrades rich-result eligibility without them.
- **Unescaped interpolation in JSON-LD is the textbook JSON-injection footgun.** `meta.url` and `article.image` are author-controlled today, but the directive (`quality.md §3` — "External input is untrusted… validate at the edge") and the project-level rule are explicit: *every* string interpolated into a JSON-LD body goes through `| jsonEscape`. Mixing escaped and unescaped fields in the same block is the kind of inconsistency that breaks the moment one of those "trusted" sources picks up a quote character (e.g. an image filename with an apostrophe).
- **Implicit dependency on `title.is` / `title.en` always being present is a silent-failure trap.** `quality.md §4.1` is unambiguous: "A fallback that hides a bug is worse than a crash." But here there is *no* fallback at all — the template assumes the key exists and produces `undefined` HTML when it does not. The fix is a single, documented lookup helper that picks the requested locale, falls back to the other locale, then to empty string. That preserves Eleventy's build (no crash, no `undefined` in output) and the missing translation surfaces in the page title — visible, fixable, not silent.

## Where

- `src/content/is/greinar/article.njk` — lines 8–10 (eleventyComputed) and 37–48 (JSON-LD block)
- `src/content/en/greinar/article.njk` — lines 8–10 (eleventyComputed) and 37–48 (JSON-LD block)

## How

### (a) `eleventyComputed` null-guarded title/description — IS file (lines 8–10)

**Before:**

```yaml
eleventyComputed:
  title: "{{ article.title.is }}"
  description: "{{ article.summary.is }}"
```

**After:**

```yaml
eleventyComputed:
  title: "{{ (article.title or {}).is or article.title.en or '' }}"
  description: "{{ (article.summary or {}).is or article.summary.en or '' }}"
```

### (b) `eleventyComputed` null-guarded title/description — EN file (lines 8–10)

**Before:**

```yaml
eleventyComputed:
  title: "{{ article.title.en }}"
  description: "{{ article.summary.en }}"
```

**After:**

```yaml
eleventyComputed:
  title: "{{ (article.title or {}).en or article.title.is or '' }}"
  description: "{{ (article.summary or {}).en or article.summary.is or '' }}"
```

Notes:
- The `(article.title or {})` guards against an entry that omits the `title` object entirely.
- The `.en or article.title.is` chain expresses an explicit preference: serve the requested locale, fall back to the other locale rather than to a blank `<title>`.
- The final `or ''` ensures Nunjucks renders an empty string (not the literal `undefined`) if both locales are missing — a build that visibly ships a blank title is still vastly better than one that crashes at render time or emits `<title>undefined</title>`.

### (c) JSON-LD block — both files (lines 37–48), identical change

**Before:**

```njk
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "{{ article.title[lang] | jsonEscape }}",
  "description": "{{ article.summary[lang] | jsonEscape }}",
  "datePublished": "{{ article.date | dateIso }}",
  "author": { "@type": "Person", "name": "{{ article.author | jsonEscape }}" },
  "publisher": { "@type": "Organization", "name": "{{ meta.byLocale[lang].title | jsonEscape }}" },
  "image": "{{ meta.url }}{{ article.image }}",
  "inLanguage": "{{ lang }}"
}
</script>
```

**After:**

```njk
{% set articleTitle = (article.title or {})[lang] or article.title.is or article.title.en or "" %}
{% set articleSummary = (article.summary or {})[lang] or article.summary.is or article.summary.en or "" %}
{% set articleModified = article.dateModified or article.date %}
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "{{ meta.url }}{{ page.url | jsonEscape }}"
  },
  "headline": "{{ articleTitle | jsonEscape }}",
  "description": "{{ articleSummary | jsonEscape }}",
  "datePublished": "{{ article.date | dateIso }}",
  "dateModified": "{{ articleModified | dateIso }}",
  "author": { "@type": "Person", "name": "{{ article.author | jsonEscape }}" },
  "publisher": { "@type": "Organization", "name": "{{ meta.byLocale[lang].title | jsonEscape }}" },
  "image": "{{ meta.url | jsonEscape }}{{ article.image | jsonEscape }}",
  "inLanguage": "{{ lang }}"
}
</script>
```

Notes for the executor:
- The three `{% set %}` lines go **immediately before** the `<script>` opening tag, inside the template body — *not* inside the frontmatter. This keeps the JSON-LD block self-contained and matches the existing convention of plain Nunjucks in the body.
- `articleTitle` and `articleSummary` use the same fallback chain as the eleventyComputed block — single mental model, one way per concept (`consistency.md §1.2`).
- `dateModified` falls back to `date` because `src/_data/articles.js` has no `dateModified` field today (verified). Once authors start tracking edits, set `dateModified` per entry and the JSON-LD picks it up automatically with no template change.
- `mainEntityOfPage` uses `page.url` (Eleventy's built-in) — this is the per-paginated URL, so it differs correctly for every article.
- `meta.url | jsonEscape` and `article.image | jsonEscape` close the unescaped-interpolation gap in the `image` line. Applied to both even though one is config and the other is data — single rule, no carve-outs.

## Sequencing relative to G2 (content-model migration)

**G13 can run before G2.** The changes are scoped to the two existing paginated `article.njk` templates and depend only on the current `article.*` data shape from `src/_data/articles.js`. No ordering constraint against G2.

If G2 lands first (paginated `_data/articles.js` → per-locale `.md` files), the *same* changes apply to whatever layout supersedes `article.njk`:

- The eleventyComputed `title`/`description` guards become front-matter or layout-level lookups against the per-file `title` / `summary` fields. The "fall back to the other locale" branch becomes a no-op for a per-locale file (there is no `article.title.en` to fall back to inside an `is/` file), but the `or ""` final guard remains valuable — it converts a missing field into a silent empty string instead of `undefined`.
- The JSON-LD block moves verbatim, with `article` replaced by whatever the new layout's content variable is (`page.data.title`, etc.). `mainEntityOfPage`, `dateModified`, and the `| jsonEscape` on `meta.url` / `image` are all data-shape-agnostic.

After G2: re-run the verification steps below against the new file paths. The diff against the post-G2 layout will be smaller (the eleventyComputed fallback collapses to a one-locale lookup) but the JSON-LD additions are unchanged.

## Verification

1. `npm run build` (or `npx @11ty/eleventy`) — build succeeds with no Nunjucks errors.
2. Spot-check one IS and one EN article and confirm the JSON-LD block has all four new/changed fields:

   ```
   /usr/bin/grep -A 20 'application/ld\+json' _site/greinar/ei-rating-explained/index.html
   /usr/bin/grep -A 20 'application/ld\+json' _site/en/greinar/ei-rating-explained/index.html
   ```

   Expected: `mainEntityOfPage` block present with the page's own URL; `dateModified` present with a valid ISO date (equal to `datePublished` until authors start tracking edits); `image` value has no unescaped quote characters and no literal `{{` tokens.

3. Validate one IS and one EN article in the [Schema.org Validator](https://validator.schema.org/) and Google's [Rich Results Test](https://search.google.com/test/rich-results). Expected:
   - Zero errors.
   - No "missing field" warnings for `mainEntityOfPage`, `dateModified`, or `image`.
4. Null-guard smoke test: in a scratch branch, temporarily delete `title.is` from one entry in `src/_data/articles.js`, rebuild, and confirm:
   - The IS detail page for that slug builds without crashing.
   - Its `<title>` tag and JSON-LD `headline` show the English title (the fallback) — not `undefined`, not blank.
   - Revert the scratch change before committing.
5. Repo-wide unescaped-interpolation audit (no remaining bare `meta.url` inside JSON-LD):

   ```
   /usr/bin/grep -rn -B 2 -A 15 'application/ld+json' src/content src/_includes \
     | /usr/bin/grep -E '\{\{ [^}]*\}\}' | /usr/bin/grep -v 'jsonEscape\|dateIso\|page.url\|lang \}'
   ```

   Expected: no hits in the two article templates after this fix. (Other templates are out of scope here; file separately if discovered.)

## Out of scope

- Adding a real `dateModified` field to `src/_data/articles.js` entries — content/authoring task; the fallback to `date` is correct until then.
- The same JSON-LD audit on other detail layouts (services, sectors, team detail, etc.). File separately if any of them have the same shape of issue.
- Migrating articles from `_data/articles.js` to per-locale `.md` files — that's G2's scope. G13 is intentionally template-local and works under either content model.
- Adding `wordCount`, `articleBody`, `articleSection`, or other optional `Article` fields. Required-for-rich-results only.

## Directive citations

- `quality.md §3.1` — "External input is untrusted. Validate at the edge." `| jsonEscape` on every string interpolation inside JSON-LD is the boundary validation.
- `quality.md §4.1` — "A fallback that hides a bug is worse than a crash." The locale fallback in (a)/(b)/(c) is deliberate, documented, and surfaces the missing translation in the page title — it doesn't hide it.
- `consistency.md §1.2` — "One way per concept." The same `(x or {})[lang] or x.is or x.en or ""` shape is used in both the eleventyComputed block and the JSON-LD `{% set %}` lines, so contributors see the pattern once and apply it everywhere a locale dict is read.
- `FRAMEWORK-I18N.md` §"JSON-LD per page" — `inLanguage` already present (unchanged); the new fields fit the same "per detail layout" contract.
- `FRAMEWORK-DOCS.md` §"Schema.org / JSON-LD" — links Google's structured-data docs and Rich Results Test as the source of truth for which `Article` fields are required for rich-result eligibility.

## Considered alternatives

- **Macro-ize the locale lookup** into a shared `_includes/macros/locale.njk` helper used by both eleventyComputed and the JSON-LD block. Rejected for this fix: macros aren't usable inside `eleventyComputed` frontmatter (which is YAML+Nunjucks-string, not a full template scope). The inline expression is short enough that duplication is cheaper than the indirection. Revisit if the same fallback chain appears in a third place.
- **Set `dateModified` only when an author-tracked `article.dateModified` exists, and omit the field otherwise.** Rejected: an `Article` without `dateModified` is incomplete per Google's rich-results spec. Falling back to `datePublished` is the standard documented behavior and what every other Eleventy SEO recipe does for unedited articles.
- **Move `meta.url` outside the JSON-LD body and rely on `HtmlBasePlugin` for the rewrite.** Rejected: `HtmlBasePlugin` rewrites path-like URLs in HTML attributes, not strings inside `<script>` bodies (verified in `L10` plan in this same folder). The `meta.url + path` concatenation must stay explicit here.
