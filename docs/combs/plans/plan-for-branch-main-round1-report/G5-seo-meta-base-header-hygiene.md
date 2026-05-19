# G5 — Head metadata hygiene: filter precedence, fallback chains, and per-locale `og:locale`

**Severity:** Critical (C6 is Critical; M2/M3/L8/M8 are Medium/Low, consolidated here because they live in the same head-metadata code path and share the same root cause shape — fragile Nunjucks expressions in `seo-meta.njk` / `base.njk`).
**Specialty:** code-reviewer, consistency-auditor, simplifier, silent-failure-hunter
**Consolidates:** C6, M2, M3, L8, M8
**Files touched:**
- `src/_includes/partials/seo-meta.njk` (rewrite)
- `src/_includes/layouts/base.njk` (lines 2, 6–7, 11, 14, 27–36)
- `src/_data/meta.js` (add `ogLocale` per locale)
- `src/_includes/partials/header.njk` (line 1 — `navCollection` ternary; in scope only if we adopt approach C, otherwise out of scope)

---

## Why (one summary, five findings)

All five findings touch the same `<head>` rendering path. Each is a symptom of the same underlying fragility: **complex inline Nunjucks expressions inside `{{ … }}` interpolations, mixing `or`, `and`, and filters whose binding rules are unobvious.** Listing them together because the fix is one coherent rewrite of `seo-meta.njk`, plus a handful of paired edits in `base.njk` and `meta.js`.

### C6 — Critical: filter-precedence bug silently bypasses HTML escaping

`src/_includes/partials/seo-meta.njk` lines 1, 2, 4, 8, 12, 13, 15, and `src/_includes/layouts/base.njk:6` all use the pattern:

```njk
{{ title or meta.byLocale[lang].title | escape }}
```

In Nunjucks (Jinja-style), the `|` filter binds tighter than `or`. The parser sees this as:

```njk
{{ title or (meta.byLocale[lang].title | escape) }}
```

That means **only the fallback branch is escaped**. The primary value (`title`, `description`, `summary`, `ogImage`, `ogImageAlt`, computed from per-page frontmatter or per-paginated-entry `eleventyComputed`) goes into HTML attribute context **raw**. This is the hot path — every page that defines a `title` hits this branch, so the fallback escape is dead code in practice.

This is not theoretical. The repo already ships content that breaks it: service page titles such as **"Fireproofing & passive fire sealing"** contain `&`. Today's build emits, e.g.:

```html
<meta property="og:title" content="Fireproofing & passive fire sealing">
```

That is invalid HTML (unescaped `&` in an attribute value). It is also a latent XSS path the moment any user-controlled or third-party-controlled string (a future CMS, a future article subtitle ingested from data, a future `eleventyComputed` value derived from a YAML field) reaches one of these tags. The escape filter is *present* — the bug is that it is misplaced. That makes this the worst kind of bug: the code *looks* correct on every reading and only breaks under input the reviewer didn't try.

`base.njk:6` (`<title>`) has the same shape via the `{% if title and title != meta.byLocale[lang].title %}` ternary — `title` is rendered into `<title>` and `<meta name="description">` content without `| escape`. A `&` in a service title produces invalid markup there too.

### M2 — `og:image:alt` fallback chain drops `title`

`seo-meta.njk:8, 15` currently read:

```njk
<meta property="og:image:alt" content="{{ ogImageAlt or meta.byLocale[lang].ogImageAlt | escape }}">
```

The reference implementation in the somethings repo (`/Users/olafur/Development/somethings/src/_includes/partials/seo-meta.njk:10, 18`) has three tiers:

```njk
<meta property="og:image:alt" content="{{ ogImageAlt or title or meta.title | escape }}">
```

Two consequences:

1. **Information loss.** When a page sets a unique `title` but no per-page `ogImageAlt` (the common case — `ogImageAlt` is rarely authored), the social-card image alt text falls all the way back to the site-wide default ("Brunaþéttingar — vottuð brunaþéttingar fyrir íslensk mannvirki"), even though the page has a perfectly good page-specific title (e.g. "Fireproofing & passive fire sealing"). The page title is strictly more useful as an image alt than the site tagline.
2. **Cross-finding interaction.** This bug compounds with C6 — the dropped `title` is also the one value that, if added back, would be the unescaped branch.

### M3 — `<meta name="description">` chain disagrees with OG/Twitter description chain

- `base.njk:7`: `{{ description or meta.byLocale[lang].description }}` (two tiers, no `summary`, no `| escape`)
- `seo-meta.njk:2, 13`: `{{ description or summary or meta.byLocale[lang].description | escape }}` (three tiers, escape on fallback only)

Two pages can therefore disagree with themselves: the `<meta name="description">` and `<meta property="og:description">` for the same URL emit different copy whenever a page has a `summary` but no `description`. Search engines read `<meta name="description">`; social previews read `og:description`. Diverging copy here is exactly the silent failure mode `silent-failure-hunter` is supposed to catch.

The fix needs to pick **one** chain and apply it both places. The three-tier chain (`description or summary or meta.byLocale[lang].description`) is the correct one — it matches the reference repo and lets paginated article frontmatter (which carries `description` via `eleventyComputed`) and authored summaries (which carry `summary`) both work as expected.

### L8 — `og:locale` and other locale flags use the `lang == 'is' and 'is_IS' or 'en_US'` ternary

Three sites:

- `seo-meta.njk:9` — `<meta property="og:locale" content="{{ lang == 'is' and 'is_IS' or 'en_US' }}">`
- `base.njk:11` — `{%- set otherLang = lang == "is" and "en" or "is" %}`
- `base.njk:14` — `{% if lang == 'is' %}{{ page.url }}{% else %}{{ page.url | alternateUrl(lang) }}{% endif %}`
- `header.njk:1` — `{%- set navCollection = lang == 'is' and collections.navIs or collections.navEn %}`

The pattern `A and B or C` is the Nunjucks/Python idiom for a ternary. It works for two locales by accident (one truthy candidate per branch). It does not generalise — a third locale (`fo`, `da`, etc.) requires editing every site. More immediately: `og:locale` is a per-locale constant that **belongs in `meta.js`**, not in templates. Same shape as `meta.byLocale[lang].title` and `meta.byLocale[lang].description`.

(`base.njk:11, 14` and `header.njk:1` are different cases — they map `lang → otherLang` and `lang → navCollection`, not `lang → ogLocale`. Out of scope for this fix beyond a note in §Considered alternatives; the `og:locale` data move is the only one that lands cleanly here. The `otherLang` / `navCollection` cases survive intact for now and are revisited the day a third locale is added.)

### M8 — `lang` fallback applied inconsistently

`base.njk:2` defends with `<html lang="{{ lang or 'is' }}">`. But `base.njk:6, 7, 31, 33` (and every `meta.byLocale[lang]…` access in `seo-meta.njk`) treats `lang` as guaranteed. If `lang` is ever undefined on an HTML output page, `<html>` falls back to `is` while OG meta and JSON-LD throw or render `undefined`.

Today this is not reachable: every page lives under `src/content/is/` or `src/content/en/` and gets `lang` from `is.11tydata.js` / `en.11tydata.js`. So the practical risk is low. But the **inconsistency itself** is the bug — a future page added at `src/content/foo.njk` will fail confusingly (HTML lang valid, OG meta crashes the build) when a single decision (always require `lang`, or always default it) would prevent the failure mode entirely.

The right fix is to make it impossible to forget: throw at build time if `lang` is missing on an HTML page. That converts the silent-failure risk into a loud build error — `quality.md §3` ("validate at boundaries").

---

## Approach: three options considered

### (a) Parenthesize each expression in place

```njk
<meta property="og:title" content="{{ (title or meta.byLocale[lang].title) | escape }}">
```

Smallest diff. Solves C6. Does **not** solve M2 (still missing `title` tier), M3 (still inconsistent across files), L8 (still uses ternary), or M8 (still no defense). Eight repeated expressions. Easy to regress: the next person to add a meta tag copies the pattern back into the wrong form.

**Rejected.** Fixes one finding out of five. Trades a precedence bug for a copy-paste invitation.

### (b) Factor each chain into a named `{% set %}` at the top of `seo-meta.njk`

```njk
{%- set pageTitle       = (title or meta.byLocale[lang].title) | escape %}
{%- set pageDescription = (description or summary or meta.byLocale[lang].description) | escape %}
{%- set pageImageAlt    = (ogImageAlt or title or meta.byLocale[lang].ogImageAlt) | escape %}
{%- set socialImage     = ogImage or meta.ogImage %}
```

Then every `<meta>` tag uses the named variable. Fixes C6, M2, M3 (apply the same `set` block at the top of `base.njk` too, so `<title>` and `<meta name="description">` use the same chains). Solves L8 by adding one more `set` driven by `meta.byLocale[lang].ogLocale`. Solves M8 by adding a guard at the top of `base.njk`.

The chain is named once, escaped once, and reused. A future reviewer sees the chain definition in one place. New meta tags use the named variables. The pattern is mechanical to extend (add a new `<meta>` for `article:published_time` → reuse `pageTitle` if relevant, or add one new `set`).

**Chosen.** Solves all five findings, smallest blast radius, no data-layer churn beyond the one new `ogLocale` field that L8 needs anyway.

### (c) Compute fully resolved fields per page in `eleventyComputed` and expose `meta.byLocale[lang].computedTitle` etc.

Cleanest architecturally — templates become pure interpolation, no logic. But it pushes the work into `_data/meta.js` and the layouts' `eleventyComputed` blocks, which are *per-page*, not per-locale, so the model breaks down: `computedTitle` depends on `title`, which is per-page, not per-locale. We would end up writing the same chain logic in JS instead of Nunjucks, and we would lose the ability to read it in the place where the meta tag lives.

**Rejected.** Wrong layer. The chains *are* template concerns — the data file's job is to provide locale defaults, the template's job is to pick a value. Approach (b) keeps each layer doing what it is good at.

---

## What

1. Rewrite `src/_includes/partials/seo-meta.njk` to declare named variables for the four reused chains at the top, then interpolate them into the meta tags. Add a comment naming the precedence rule that caused C6 so the next reviewer does not re-introduce it.
2. Update `src/_includes/layouts/base.njk` to: (a) declare the same `pageTitle` / `pageDescription` chains so `<title>` and `<meta name="description">` agree with the OG/Twitter equivalents (M3); (b) drop the `lang == "is" and "en" or "is"` ternary for `otherLang` in favour of the simpler `not is`/`is` `{% if %}`; (c) make `<html lang>` either require `lang` or default it consistently (M8 — chosen: require it, with a `{% if not lang %}…{% endif %}` throw); (d) use `meta.byLocale[lang].ogLocale` in JSON-LD context where applicable (no change needed — JSON-LD already uses `lang` directly, which is fine).
3. Add `ogLocale` to each locale in `src/_data/meta.js` (`is_IS` / `en_US`) so L8 has a data source to read from.
4. Leave `header.njk:1` (`navCollection` ternary) alone — out of scope. Note in §Out of scope.

---

## How

### `src/_data/meta.js`

**Before** (lines 1–15):

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
```

**After**:

```js
const byLocale = {
  is: {
    title: "Brunaþéttingar",
    description: "[TBD — íslensk lýsing] Vottuð brunaþéttingar og tæknieinangrun á Íslandi.",
    author: "Brunaþéttingar ehf.",
    ogImageAlt: "Brunaþéttingar — vottuð brunaþéttingar fyrir íslensk mannvirki",
    ogLocale: "is_IS",
  },
  en: {
    title: "Brunaþéttingar",
    description:
      "Brunaþéttingar plan, manage and execute fire sealing and technical insulation work on Icelandic buildings.",
    author: "Brunaþéttingar ehf.",
    ogImageAlt: "Brunaþéttingar — certified fire sealing for buildings",
    ogLocale: "en_US",
  },
};
```

(Only two added lines. Format follows the existing `ogImageAlt` line above each. Values are the Facebook-standard `<language>_<COUNTRY>` strings — `is_IS` is recognised by Facebook/OG; if a downstream consumer rejects it, switch to `is` later. That is a one-line data edit, not a template edit, which is the whole point of moving it here.)

### `src/_includes/partials/seo-meta.njk`

**Before** (full file, 15 lines):

```njk
<meta property="og:title" content="{{ title or meta.byLocale[lang].title | escape }}">
<meta property="og:description" content="{{ description or summary or meta.byLocale[lang].description | escape }}">
<meta property="og:url" content="{{ meta.url }}{{ page.url }}">
<meta property="og:site_name" content="{{ meta.byLocale[lang].title | escape }}">
<meta property="og:type" content="{{ ogType or 'website' }}">
{%- set socialImage = ogImage or meta.ogImage %}
<meta property="og:image" content="{{ meta.url }}{{ socialImage }}">
<meta property="og:image:alt" content="{{ ogImageAlt or meta.byLocale[lang].ogImageAlt | escape }}">
<meta property="og:locale" content="{{ lang == 'is' and 'is_IS' or 'en_US' }}">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{{ title or meta.byLocale[lang].title | escape }}">
<meta name="twitter:description" content="{{ description or summary or meta.byLocale[lang].description | escape }}">
<meta name="twitter:image" content="{{ meta.url }}{{ socialImage }}">
<meta name="twitter:image:alt" content="{{ ogImageAlt or meta.byLocale[lang].ogImageAlt | escape }}">
```

**After** (full file):

```njk
{#
  Head metadata for OG + Twitter cards.

  Each reused value is bound once, with `| escape` applied to the entire
  fallback chain in parens. Nunjucks' `|` binds tighter than `or`, so
  `{{ a or b | escape }}` parses as `{{ a or (b | escape) }}` and leaves
  `a` unescaped on the hot path. Do not unfold these named values back
  into the meta tags inline — keep the parens-around-chain shape.

  Chains match `base.njk` so `<title>` / `<meta name="description">` agree
  with OG / Twitter descriptions for the same page.
#}
{%- set pageTitle       = (title or meta.byLocale[lang].title) | escape %}
{%- set pageDescription = (description or summary or meta.byLocale[lang].description) | escape %}
{%- set pageImageAlt    = (ogImageAlt or title or meta.byLocale[lang].ogImageAlt) | escape %}
{%- set siteName        = meta.byLocale[lang].title | escape %}
{%- set socialImage     = ogImage or meta.ogImage %}

{# --- Open Graph --- #}
<meta property="og:title" content="{{ pageTitle }}">
<meta property="og:description" content="{{ pageDescription }}">
<meta property="og:url" content="{{ meta.url }}{{ page.url }}">
<meta property="og:site_name" content="{{ siteName }}">
<meta property="og:type" content="{{ ogType or 'website' }}">
<meta property="og:image" content="{{ meta.url }}{{ socialImage }}">
<meta property="og:image:alt" content="{{ pageImageAlt }}">
<meta property="og:locale" content="{{ meta.byLocale[lang].ogLocale }}">

{# --- Twitter Card --- #}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{{ pageTitle }}">
<meta name="twitter:description" content="{{ pageDescription }}">
<meta name="twitter:image" content="{{ meta.url }}{{ socialImage }}">
<meta name="twitter:image:alt" content="{{ pageImageAlt }}">
```

Notes for the executor:
- `socialImage` is the existing variable name; reused. `ogImage` is *not* `| escape`d because it is a URL path; the surrounding `{{ meta.url }}{{ socialImage }}` is interpolated into an attribute value where `&` in a query string would matter — but neither `meta.ogImage` nor any `ogImage` value in this repo today contains a `&`. If that changes, escape `socialImage` too. Leaving as-is to match the reference repo.
- `ogType` is a static literal (`"website"` / `"article"`) authored in template/frontmatter — not user input, no escape needed.
- `og:url` uses `meta.url` + `page.url`, both controlled by config — no escape.
- The comment at the top is load-bearing. It exists specifically to prevent re-introduction of the C6 shape on the next contribution.

### `src/_includes/layouts/base.njk`

**Before** (lines 1–14):

```njk
<!doctype html>
<html lang="{{ lang or 'is' }}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{% if title and title != meta.byLocale[lang].title %}{{ title }} | {{ meta.byLocale[lang].title }}{% else %}{{ meta.byLocale[lang].title }}{% endif %}</title>
    <meta name="description" content="{{ description or meta.byLocale[lang].description }}">
    <link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
    <link rel="canonical" href="{{ meta.url }}{{ page.url }}">

    {%- set otherLang = lang == "is" and "en" or "is" %}
    <link rel="alternate" hreflang="{{ lang }}" href="{{ meta.url }}{{ page.url }}">
    <link rel="alternate" hreflang="{{ otherLang }}" href="{{ meta.url }}{{ page.url | alternateUrl(lang) }}">
    <link rel="alternate" hreflang="x-default" href="{{ meta.url }}{% if lang == 'is' %}{{ page.url }}{% else %}{{ page.url | alternateUrl(lang) }}{% endif %}">
```

**After** (lines 1–17):

```njk
{#- M8: HTML output requires `lang`. Today every page sets it via
    is.11tydata.js / en.11tydata.js; the throw exists so a future page
    added outside the locale tree fails loudly at build instead of
    rendering `undefined` into meta tags / JSON-LD downstream. #}
{%- if not lang %}{{ undefined_lang_on_html_output_page__set_lang_in_directory_data() }}{% endif %}
<!doctype html>
<html lang="{{ lang }}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    {#- Chains match seo-meta.njk so on-page <title>/<meta description>
        agree with OG/Twitter descriptions. See seo-meta.njk header. #}
    {%- set pageTitle       = (title or meta.byLocale[lang].title) | escape %}
    {%- set pageDescription = (description or summary or meta.byLocale[lang].description) | escape %}
    <title>{% if title and title != meta.byLocale[lang].title %}{{ pageTitle }} | {{ siteTitle if siteTitle else (meta.byLocale[lang].title | escape) }}{% else %}{{ meta.byLocale[lang].title | escape }}{% endif %}</title>
    <meta name="description" content="{{ pageDescription }}">
    <link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
    <link rel="canonical" href="{{ meta.url }}{{ page.url }}">

    {%- set otherLang = "en" if lang == "is" else "is" %}
    <link rel="alternate" hreflang="{{ lang }}" href="{{ meta.url }}{{ page.url }}">
    <link rel="alternate" hreflang="{{ otherLang }}" href="{{ meta.url }}{{ page.url | alternateUrl(lang) }}">
    <link rel="alternate" hreflang="x-default" href="{{ meta.url }}{% if lang == 'is' %}{{ page.url }}{% else %}{{ page.url | alternateUrl(lang) }}{% endif %}">
```

Three things to call out for the executor:

1. **The `<title>` line.** It interpolates two distinct strings — the per-page title and the site title — so it cannot reuse a single `pageTitle` variable trivially. The simplest correct shape is the one above: `pageTitle` (escaped per-page title) for the leading half, `meta.byLocale[lang].title | escape` inline for the site name. The `siteTitle if siteTitle else …` fragment I sketched is over-engineered; **drop it and write**:

   ```njk
   <title>{% if title and title != meta.byLocale[lang].title %}{{ pageTitle }} | {{ meta.byLocale[lang].title | escape }}{% else %}{{ meta.byLocale[lang].title | escape }}{% endif %}</title>
   ```

   `meta.byLocale[lang].title` is a config string with no user input, but escape it anyway for consistency — if someone puts `&` in the site title later, this stays correct.

2. **`<html lang="{{ lang }}">`** (no fallback). Paired with the throw two lines up. If a build is currently silently relying on the `or 'is'` fallback for some page, the build will now fail and surface that page. That is the intended behavior per M8.

   The exact syntax for "throw at build" in Nunjucks: `{{ throw('message') }}` is not a built-in. Two options:

   - **(preferred)** Configure Nunjucks `throwOnUndefined: true` in `eleventy.config.js` and rely on `{{ requireLang(lang) }}` where `requireLang` is a tiny custom filter that throws if its argument is falsy. One filter to register, three lines.
   - **(alternative)** A `{% if not lang %}` block that emits a syntactically invalid template tag, forcing a build error. Crude but zero-config.

   **Pick the filter.** Add to `eleventy.config.js`:

   ```js
   eleventyConfig.addFilter("requireLang", (lang) => {
     if (!lang) throw new Error("base.njk: `lang` must be set on every HTML output page (via is.11tydata.js / en.11tydata.js).");
     return lang;
   });
   ```

   Then `base.njk:7` becomes `<html lang="{{ lang | requireLang }}">`, and the `{% if not lang %}` guard above goes away. Cleaner; one diff in `eleventy.config.js`, one diff in `base.njk:7`.

3. **`otherLang`**: changed from `lang == "is" and "en" or "is"` to Nunjucks' explicit ternary `"en" if lang == "is" else "is"`. Same two-locale semantics, harder to misread, easier to extend (one place would change to introduce a third locale). The L8 hreflang line just below (`lang == 'is'` `{% if %}`) is already in explicit-conditional form and stays.

### `src/_includes/layouts/base.njk` — JSON-LD block (lines 27–37)

No code change needed. `jsonEscape` is already applied to `meta.byLocale[lang].title` and `…description`. `inLanguage: "{{ lang }}"` is `lang`, not `ogLocale` — different vocabulary (schema.org uses BCP 47 language tags, OG uses Facebook locale codes). Leave as-is.

---

## Expected outcome

1. Rebuild: `npx @11ty/eleventy`.
2. **C6 fixed.** Verify no unescaped `&` in head meta attribute content:
   ```
   grep -rE '(og:title|og:description|og:site_name|og:image:alt|twitter:title|twitter:description|twitter:image:alt)' _site | grep -v '&amp;\|&quot;\|&lt;\|&gt;\|&#' | grep ' & '
   ```
   Expected: zero lines. Sample expected output for the Fireproofing service page:
   ```html
   <meta property="og:title" content="Fireproofing &amp; passive fire sealing">
   ```
3. **M2 fixed.** Spot-check any page with a `title` but no `ogImageAlt` (most pages):
   ```
   grep 'og:image:alt' _site/<some-service-page>/index.html
   ```
   Expected: `content="<page title>"`, not the site-wide tagline.
4. **M3 fixed.** Pick a page that has `description` and `summary` differing (or one that has `summary` only):
   ```
   grep -E '(meta name="description"|og:description|twitter:description)' _site/<that-page>/index.html
   ```
   Expected: all three identical.
5. **L8 fixed.** Verify `og:locale` is driven from `meta.byLocale[lang].ogLocale`:
   ```
   grep 'og:locale' _site/index.html _site/en/index.html
   ```
   Expected: `is_IS` for IS pages, `en_US` for EN pages. Identical to before — but now adding `fo` is a one-line `meta.js` edit, not a template hunt.
6. **M8 fixed.** Verify the build fails cleanly when `lang` is missing:
   - Temporarily create `src/content/test-missing-lang.njk` with no `lang` set. Build should fail with the `requireLang` filter's error message. Delete the test file.

---

## Scope

**In scope:**
- Full rewrite of `src/_includes/partials/seo-meta.njk` (15 lines → ~30 lines including comment header and named-variable block).
- Edits to `src/_includes/layouts/base.njk` lines 2–14: `<html lang>` guard, `pageTitle`/`pageDescription` `set` block, `<title>` reusing them, `<meta name="description">` reusing them, `otherLang` ternary rewritten.
- Two new fields in `src/_data/meta.js` (`ogLocale: "is_IS"`, `ogLocale: "en_US"`).
- One new custom filter `requireLang` in `eleventy.config.js`.

**Out of scope:**
- `src/_includes/partials/header.njk:1` `navCollection` ternary. Different shape (`lang → collection`), revisited the day a third locale is added. L8 only asks for the `og:locale` lift; this plan delivers exactly that.
- `base.njk:14` `x-default` hreflang's `{% if lang == 'is' %}` block. Already in explicit-conditional form, not the ternary shape. Out of scope.
- The JSON-LD block (`base.njk:27–37`). Already correct: uses `| jsonEscape` and `lang` directly.
- Updating `docs/instructions/FRAMEWORK-I18N.md:268–269, 283` — the framework spec itself contains the same C6 shape that this fix corrects. Worth filing **separately** as a doc fix so the next port-from-spec does not re-introduce the bug. Mentioning here for the executor's awareness; **do not change the spec in this PR** — the spec change should go through its own review.

---

## Directive citations

- `quality.md §3` — validate at boundaries. The `requireLang` filter is a build-time boundary check that converts the M8 silent-failure mode into a loud build error.
- `quality.md §1` — verify behavior, not assumptions. C6's failure is observable in current build output (any service page with `&` in its title). Not theoretical.
- `consistency.md` — M3's whole point is that the same logical concept ("the page description") was implemented two different ways in two files. The fix unifies them on one chain, named once.
- `FRAMEWORK-PORT-PROMPT.md §"seo-meta.njk"` — the partial's job is to emit valid OG/Twitter meta. Currently emits invalid HTML on the hot path; this restores correctness.
- `FRAMEWORK-I18N.md §"base.njk — hreflang"` — `meta.byLocale[lang]` is the documented access pattern; L8 just extends it to one more locale-specific value.

---

## Considered alternatives (briefer than §"Approach" — for the record)

- **Macro instead of `{% set %}` block.** A Nunjucks macro could wrap the chain logic and be called from each `<meta>` tag. Rejected: macros add a layer of indirection (define → call) for a five-line chain definition; `{% set %}` puts the chain inline and readable. Macros earn their keep when there's branching or multiple invocations across files, neither of which applies here.
- **Move `og:locale` value computation into `eleventy.config.js` as a global data callback.** Same effect as adding it to `meta.byLocale[lang]`. Rejected: the `byLocale` map is *the* place for per-locale constants in this codebase. Splitting locale data across `_data/meta.js` and `eleventy.config.js` would itself be a consistency violation.
- **Switch to `nunjucks` `safe`/`e` aliases and audit every interpolation.** Larger blast radius, doesn't change the shape of the precedence bug — `{{ a or b | safe }}` has the exact same precedence behavior as `{{ a or b | escape }}`. The named-variable approach makes the chain explicit regardless of which filter is applied.
