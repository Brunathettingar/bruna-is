# C10 — Replace `alternateUrl` with `locale_url`/`locale_links`; honour the existence guarantee

Source finding: `docs/combs/reviews/branch-main-round1-report.md` §C10 (lines 190–204).
Touched files at fix time: `eleventy.config.js`, `src/_includes/layouts/base.njk`, `src/_includes/partials/utility-bar.njk`.
Spec authority: `docs/instructions/FRAMEWORK-I18N.md` §"Language switcher partial" (319–347) and §"Conventions and guardrails" (505–519, esp. line 511).

---

## What

Delete the custom `alternateUrl` Nunjucks filter (`eleventy.config.js:116–127`) and rewire both of its callers — `base.njk:13–14` (hreflang chain) and `utility-bar.njk:13` (visible language toggle) — to use the I18nPlugin's first-party `locale_url` and `locale_links` filters as the framework spec mandates. The hreflang `<link>`s and the visible switcher must agree, and neither may emit a URL that does not resolve.

The plan deliberately makes this fix **dependent on and downstream of C3** (the markdown-collections migration the prompt labels "G2"). C3 converts the paginated article template at `src/content/is/greinar/article.njk` (and its EN twin) into per-locale `.md` files keyed by slug — exactly the shape `locale_links` was designed for. With C3 in place the workaround is no longer needed and the fix collapses to a clean rip-and-replace. Without C3 the workaround is still buying real value and removing it would regress the bug commit `51d2d9b` was authored to fix.

---

## Why

Three failures, ordered by severity:

1. **Spec violation (visible).** `FRAMEWORK-I18N.md:511` is unambiguous: *"The language switcher uses `locale_links`, which only lists pages that actually exist in the other locale. Trust this — don't add manual fallback logic."* `alternateUrl` is exactly that manual fallback logic.
2. **Latent soft-404 (SEO).** `alternateUrl` deterministically rewrites the URL prefix and emits the result as `<link rel="alternate" hreflang="…">`. As long as every page is bilingual the output is correct; the first single-locale page (an IS-only news entry, an EN-only draft) makes the hreflang point at a 404. Google reads that as a soft-404 signal against the originating page.
3. **Latent user-visible 404 (UX).** The utility-bar switcher at `utility-bar.njk:13` uses the same filter. A reader on an IS-only article who clicks "EN" will land on a 404 — silently, with no signal in the source HTML that the alternate was missing.

All three failure modes are gated by the same precondition: the day the bilingual-everywhere invariant is first broken. Today the site has parallel content trees in both locales (`src/content/is/` and `src/content/en/` are mirrored), so the bug is not yet observable. That's exactly when latent bugs get baked in.

The root cause that justified the workaround is described in commit `51d2d9b`: `locale_links` returned every paginated output from the alternate locale's tree, producing "EN EN EN … IS IS IS" on every article detail. That misbehaviour is a direct consequence of the article-pagination model — Eleventy's pagination produces N output pages from one source template, and `locale_links` matches by source-template path, not by output slug. Once articles become one `.md` per slug per locale (C3), each output corresponds to its own source file, slug parity does the matching, and `locale_links` behaves correctly without ceremony.

---

## Where

- `eleventy.config.js:116–127` — filter definition. Delete.
- `src/_includes/layouts/base.njk:11–14` — hreflang chain. Rewire to `locale_url`/`locale_links`.
- `src/_includes/partials/utility-bar.njk:1, 13` — visible language switcher. Rewire to `locale_links`.
- (Read only) `src/_includes/partials/language-switcher.njk` — referenced by H5 as in an inconsistent index/working-tree state; out of scope here, addressed by its own finding. This plan does not modify that partial.

---

## How

### Dependency call

**This plan must not be executed before C3 (markdown-collections migration).** If C3 is in flight, wait for it. If C3 is not on the current milestone, escalate before applying this plan — the alternatives are worse, see below. The prompt's "G2" label refers to the same migration the report calls C3; treat them as one.

Verification that C3 has landed before this plan starts:
- `src/content/is/greinar/` contains one `.md` per article (no `article.njk` pagination template).
- `src/content/en/greinar/` mirrors it with identical slugs.
- A spot-check build of the dev server shows `{{ page.url | locale_links | dump }}` on an article page returning exactly one entry pointing at the alternate-locale slug.

If that verification passes, take **Path A** below. If C3 has been deferred and this finding must still be addressed for some reason, take **Path B**. Path B is strictly worse — more code, more concepts, more drift risk — and only exists because the report instructs the planner to provide it.

### Path A (recommended, post-C3): rip and replace

The whole point of `locale_url` and `locale_links` is to give us this for free. With C3 done they work; use them.

**Before** (`eleventy.config.js`, lines 116–127):

```js
// Swap the locale prefix on a URL. The I18nPlugin's `locale_links` filter
// mis-matches alternates for paginated pages (returns every page from
// the other locale tree, not just the one with the same slug). Slugs are
// identical across locales by contract, so a deterministic prefix swap
// is correct.
eleventyConfig.addFilter("alternateUrl", (url, currentLang) => {
  if (typeof url !== "string") return url;
  if (currentLang === "is") {
    return url === "/" ? "/en/" : `/en${url}`;
  }
  return url.replace(/^\/en\//, "/") || "/";
});
```

**After:** delete the entire block. Trailing blank line collapses with the surrounding code.

**Before** (`src/_includes/layouts/base.njk`, lines 11–14):

```njk
{%- set otherLang = lang == "is" and "en" or "is" %}
<link rel="alternate" hreflang="{{ lang }}" href="{{ meta.url }}{{ page.url }}">
<link rel="alternate" hreflang="{{ otherLang }}" href="{{ meta.url }}{{ page.url | alternateUrl(lang) }}">
<link rel="alternate" hreflang="x-default" href="{{ meta.url }}{% if lang == 'is' %}{{ page.url }}{% else %}{{ page.url | alternateUrl(lang) }}{% endif %}">
```

**After:**

```njk
<link rel="alternate" hreflang="{{ lang }}" href="{{ meta.url }}{{ page.url }}">
{%- for link in page.url | locale_links %}
<link rel="alternate" hreflang="{{ link.lang }}" href="{{ meta.url }}{{ link.url }}">
{%- endfor %}
<link rel="alternate" hreflang="x-default" href="{{ meta.url }}{{ '/' | locale_url('is') }}{{ page.url | locale_url('is') | replace('/is/', '/') }}">
```

Wait — the `x-default` line above is more complicated than it needs to be and reintroduces string manipulation. Use this instead:

```njk
<link rel="alternate" hreflang="{{ lang }}" href="{{ meta.url }}{{ page.url }}">
{%- for link in page.url | locale_links %}
<link rel="alternate" hreflang="{{ link.lang }}" href="{{ meta.url }}{{ link.url }}">
{%- endfor %}
{%- if lang == "is" %}
<link rel="alternate" hreflang="x-default" href="{{ meta.url }}{{ page.url }}">
{%- else %}
{%- for link in page.url | locale_links %}{% if link.lang == "is" %}
<link rel="alternate" hreflang="x-default" href="{{ meta.url }}{{ link.url }}">
{%- endif %}{% endfor %}
{%- endif %}
```

Behavioural contract of the rewrite:
- On a page that exists in both locales: emits three `<link>`s — `is`, `en`, `x-default` pointing at the IS URL. Matches today's output.
- On an IS-only page: emits one `<link rel="alternate" hreflang="is">` and `x-default` pointing at the IS URL. No broken EN alternate. Spec-compliant: `locale_links` returns `[]`, the `for` loop emits nothing.
- On an EN-only page: emits one `<link rel="alternate" hreflang="en">` and no `x-default`. Google falls back to the canonical, which is acceptable for an EN-only page.

**Before** (`src/_includes/partials/utility-bar.njk`, lines 1, 13):

```njk
{%- set otherLang = lang == "is" and "en" or "is" %}
…
<a href="{{ page.url | alternateUrl(lang) }}" lang="{{ otherLang }}" hreflang="{{ otherLang }}">{{ ("lang.label." + otherLang) | t }}</a>
<a href="{{ page.url }}" class="active" lang="{{ lang }}">{{ ("lang.label." + lang) | t }}</a>
```

**After:**

```njk
{%- set alternates = page.url | locale_links %}
…
{%- for link in alternates %}
<a href="{{ link.url }}" lang="{{ link.lang }}" hreflang="{{ link.lang }}">{{ ("lang.label." + link.lang) | t }}</a>
{%- endfor %}
<a href="{{ page.url }}" class="active" lang="{{ lang }}">{{ ("lang.label." + lang) | t }}</a>
```

Drop the unused `otherLang` local. The link to the current page stays — it's the active label, not a switch — but it now lives without a counterpart on single-locale pages. That is the desired behaviour (`FRAMEWORK-I18N.md:347, 511`).

Visual regression to expect on single-locale pages: the switcher renders with only one entry instead of two. If product needs the missing-locale state to render as a visible greyed-out label (e.g. "EN (not available)"), that is a separate design decision and belongs in a follow-up finding — not in this fix.

### Path B (fallback, only if C3 is deferred): existence-checked workaround

Keep `alternateUrl` but stop trusting it. Build a paired-URL set at config time and only emit hreflang when both sides resolve.

In `eleventy.config.js`, replace the current `alternateUrl` filter with a paired-slug global computed once per build. Pseudocode of the shape (final code is the implementer's call; the geometry below is the contract):

```js
// Build a Set of page.url values that exist in the output, keyed by the
// alternate-locale URL the deterministic prefix swap would produce.
// Used to gate hreflang and the visible switcher: only emit when the
// alternate URL is in the set.
eleventyConfig.addCollection("urlIndex", (api) => {
  const all = api.getAll();
  const known = new Set(all.map((item) => item.url).filter(Boolean));
  return known;
});

eleventyConfig.addFilter("alternateUrl", (url, currentLang) => {
  if (typeof url !== "string") return url;
  if (currentLang === "is") return url === "/" ? "/en/" : `/en${url}`;
  return url.replace(/^\/en\//, "/") || "/";
});

eleventyConfig.addFilter("alternateExists", function (url, currentLang) {
  const candidate = this.env.filters.alternateUrl(url, currentLang);
  const index = this.ctx.collections?.urlIndex;
  return Boolean(index && index.has(candidate));
});
```

Note that `collections.urlIndex` will not be populated on the first pass — Eleventy collections resolve before template render, so the lookup works. If a build-order edge case shows up (paginated templates can re-render after their collection is built), gate with a simple existence check on the index itself.

Then in `base.njk`:

```njk
{%- set otherLang = lang == "is" and "en" or "is" %}
<link rel="alternate" hreflang="{{ lang }}" href="{{ meta.url }}{{ page.url }}">
{%- if page.url | alternateExists(lang) %}
<link rel="alternate" hreflang="{{ otherLang }}" href="{{ meta.url }}{{ page.url | alternateUrl(lang) }}">
{%- endif %}
{%- if lang == "is" %}
<link rel="alternate" hreflang="x-default" href="{{ meta.url }}{{ page.url }}">
{%- elif page.url | alternateExists(lang) %}
<link rel="alternate" hreflang="x-default" href="{{ meta.url }}{{ page.url | alternateUrl(lang) }}">
{%- endif %}
```

And in `utility-bar.njk`, gate the alternate `<a>`:

```njk
{%- set otherLang = lang == "is" and "en" or "is" %}
…
{%- if page.url | alternateExists(lang) %}
<a href="{{ page.url | alternateUrl(lang) }}" lang="{{ otherLang }}" hreflang="{{ otherLang }}">{{ ("lang.label." + otherLang) | t }}</a>
{%- endif %}
<a href="{{ page.url }}" class="active" lang="{{ lang }}">{{ ("lang.label." + lang) | t }}</a>
```

The shape is essentially Path A with extra steps: we're reconstructing `locale_links`' existence guarantee from scratch because we can't yet trust the upstream. The moment C3 lands, delete all of it and switch to Path A.

### Recommendation

**Path A.** The user's focus brief is explicit: "i18n per FRAMEWORK-I18N.md exactly: locale_url/locale_links/i18n filters". Path A satisfies that contract directly with framework-provided primitives. Path B is a more elaborate version of the existing workaround — it patches the symptom while the upstream bug (driven by article pagination) goes unfixed. Per `simplicity.md` §1 ("Build for the asked problem"), and §4 ("No half-implementations"), the right move is to fix the cause once and delete the workaround, not to add a second workaround on top.

`reusability.md` §3 reinforces this: a custom filter that exists because the standard one almost-works is a low-value shared utility. Delete it, use the standard, and the next contributor has one fewer concept to learn.

---

## Expected Outcome

After Path A:

- `grep -rn "alternateUrl" src/ eleventy.config.js` returns nothing.
- A built page in both locales emits three hreflang `<link>`s (`is`, `en`, `x-default`).
- A built page in one locale only (synthesise one to verify: delete an EN article, build, inspect the IS version's `<head>`) emits one or two hreflang `<link>`s and no link to a 404.
- The utility-bar switcher on a bilingual page renders both language labels. On a single-locale page it renders only the current label.
- The site's existing bilingual pages produce byte-identical or near-identical output (whitespace from the new `{%- for %}` loops aside).

Build verification commands:
- `npm run build` exits clean.
- `_site/index.html` and `_site/en/index.html` show both `<link rel="alternate" hreflang="is">` and `<link rel="alternate" hreflang="en">` plus `x-default`.
- `_site/greinar/<slug>/index.html` (post-C3, where `<slug>` is one of the migrated articles) shows the same.

---

## Scope

In scope:
- Delete `alternateUrl` filter from `eleventy.config.js`.
- Rewire hreflang chain in `src/_includes/layouts/base.njk`.
- Rewire visible switcher in `src/_includes/partials/utility-bar.njk`.

Out of scope (handled by other findings):
- `src/_includes/partials/language-switcher.njk` index/working-tree divergence (H5 in the report).
- `errorMode` from `"never"` to `"allow-fallback"` (C7).
- Markdown-collections migration (C3 / "G2") — this plan **depends on** C3 but does not perform it.
- Per-locale sitemap completeness (C5).

**Execution order:** this plan must run after C3 lands. The right place for it in the milestone is immediately after C3's verification — the diff is small, the verification cheap, and deleting the workaround is the natural cleanup tail of the C3 work.

If C3 is not on the milestone, escalate. Do not silently downgrade to Path B without that escalation; Path B is a strictly worse outcome and exists in this document only as a contingency.

---

## Considered alternatives

- **Keep `alternateUrl` and add a guard inside it that returns `null` for non-existent alternates.** Rejected: the filter currently rewrites `page.url` into a string; making it return `null` sometimes forces every call site to check the return value. That is exactly Path B's existence-check, just expressed inside the filter. No reason to prefer it over building the gate as a separate `alternateExists` filter (Path B) or deleting both (Path A).
- **Compute alternates in frontmatter / `eleventyComputed`.** Rejected: pushes the contract onto every author, when the framework already owns it. Violates `reusability.md` §1 (the second copy will drift).
- **Wait for upstream `@11ty/eleventy` to fix `locale_links` for paginated outputs.** Rejected: C3 already resolves the precondition that triggers the upstream bug, and the spec instructs us to model content with one `.md` per output anyway. No reason to file an upstream issue when our own content model is what's wrong.

---

## Directive citations

- `simplicity.md` §1 (YAGNI — don't keep workarounds once the cause is fixed), §4 (minimal diffs — delete what the cause-fix obsoletes), §5 (comments are the last resort — the 5-line self-defending comment on `alternateUrl` is a smell pointing at the bug).
- `quality.md` §1 (correctness first — hreflang must point at real URLs), §4 (no silent fallbacks — `alternateUrl` is exactly a silent fallback that hides the locale-pairing bug).
- `reusability.md` §3 (shared utilities are exceptions, not defaults — a custom filter that reimplements a framework primitive should not be a shared utility), §1.2 (delete duplication once the upstream is the single source of truth).
- Spec: `FRAMEWORK-I18N.md:347, 511` — "never offer a switch that leads to a 404" + "Trust this — don't add manual fallback logic."
