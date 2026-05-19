# G10 — Organization JSON-LD + missing static assets

- **Severity:** High
- **Specialty:** code-reviewer
- **Consolidates:** M6, H7
- **Files affected:**
  - `src/_data/meta.js`
  - `src/_includes/partials/schema-organization.njk`
  - `src/_includes/partials/utility-bar.njk`
  - `src/_includes/layouts/base.njk` (verification only)
  - `src/assets/img/` (currently empty — three new asset files)

## What

Three static assets referenced in the templates do not exist on disk, and the `Organization` JSON-LD reuses one of them (`og-default.jpg`) as `logo`, which is semantically wrong even if the file existed. Compounding this, the phone number is encoded three different ways across the codebase, and `Organization.telephone` uses a hyphenated form that Schema.org recommends against.

Specifically:

1. **Missing assets** (M6) — `src/assets/img/` is empty, yet the following are referenced:
   - `src/_data/meta.js:22` → `ogImage: "/assets/img/og-default.jpg"` (every social share returns 404)
   - `src/_includes/layouts/base.njk:8` → `<link rel="icon" href="/assets/img/favicon.svg">` (no favicon)
   - `src/_includes/partials/schema-organization.njk:8` → `"logo": "{{ meta.url }}/assets/img/og-default.jpg"` (invalid logo URL, and an OG image is not a logo anyway)
2. **JSON-LD `logo` mis-points** (H7) — should reference a real brand mark, not the OG share card.
3. **Phone format drift** (H7) — three encodings in use:
   - `+354-850-4405` — JSON-LD `telephone` (hyphenated)
   - `(+354) 850-4405` — display text in `utility-bar.njk`
   - `+3548504405` — `tel:` link in `utility-bar.njk` (E.164, correct)

   Schema.org's `telephone` property recommends E.164 (`+3548504405`).

## Why

- `og-default.jpg` 404s break every Open Graph / Twitter Card preview — link unfurls in Slack, iMessage, Facebook, LinkedIn, etc. will show no image.
- Missing favicon means browsers render a default icon and an extra 404 on every page load.
- `Organization.logo` pointing at the OG image is a Schema.org violation: `logo` is meant to be a true brand mark (per the Organization schema), and Google's structured-data guidance recommends a logo distinct from `image`.
- Inconsistent phone encodings make automated parsing (rich results, click-to-call indexing) unreliable. E.164 is the canonical form for `schema:telephone`.

This is a quality/consistency fix (per `quality.md`, `consistency.md`): single source of truth in `meta.js` for both phone formats and asset paths, with the templates rendering from those keys.

## How

### (a) Missing-asset list (create at these exact paths)

| Path | Dimensions | Format | Purpose |
| --- | --- | --- | --- |
| `src/assets/img/og-default.jpg` | 1200×630 | JPEG, ≤200 KB | Open Graph / Twitter Card default share image |
| `src/assets/img/favicon.svg` | scalable (intrinsic ~32×32 viewBox) | SVG | Site favicon (referenced from `base.njk`) |
| `src/assets/img/logo.svg` | scalable (square or near-square viewBox) | SVG | Brand mark used as `Organization.logo` in JSON-LD |

**Important:** `/comb:fix` does **not** generate the actual binary/SVG assets — that is a content/design task for the brand owner. The fix should either:

- leave a `TODO:` marker noting "asset must be supplied at `<path>`", or
- drop in trivial placeholders (e.g., a 1×1 transparent JPEG renamed to 1200×630, a single-glyph SVG) so the build does not 404 in the meantime.

Recommended: placeholder files committed with a `// PLACEHOLDER — replace before launch` note in the PR description, so CI/preview deploys stop 404ing immediately while the real assets are produced.

### (b) `src/_data/meta.js` additions

Add `contact.phone.{e164,display}`, an `ogImageAlt` at the shared level (it already exists per-locale — keep both, the shared one is a fallback), and a `logo` path distinct from `ogImage`.

**Before** (relevant excerpt):

```js
const shared = {
  url: "https://brunathettingar.github.io/bruna-is",
  ogImage: "/assets/img/og-default.jpg",
};
```

**After:**

```js
const shared = {
  // Includes the project-page subpath. HtmlBasePlugin only rewrites
  // path-style URLs (`/foo/`), not absolute ones — so canonical and og:url
  // need the prefix included here.
  url: "https://brunathettingar.github.io/bruna-is",
  ogImage: "/assets/img/og-default.jpg",
  logo: "/assets/img/logo.svg",
  contact: {
    email: "bruna@bruna.is",
    phone: {
      // E.164 — canonical form for schema:telephone and tel: links
      e164: "+3548504405",
      // Human-readable — used in visible UI
      display: "(+354) 850-4405",
    },
  },
};
```

### (c) `src/_includes/partials/schema-organization.njk` before/after

**Before:**

```njk
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "{{ meta.url }}/#organization",
  "name": "Brunaþéttingar ehf.",
  "url": "{{ meta.url }}/",
  "logo": "{{ meta.url }}/assets/img/og-default.jpg",
  "email": "bruna@bruna.is",
  "telephone": "+354-850-4405",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Reykjavík",
    "postalCode": "105",
    "addressCountry": "IS"
  },
  "inLanguage": "{{ lang }}"
}
</script>
```

**After:**

```njk
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "{{ meta.url }}/#organization",
  "name": "{{ "Brunaþéttingar ehf." | jsonEscape }}",
  "url": "{{ meta.url }}/",
  "logo": "{{ meta.url }}{{ meta.logo }}",
  "image": "{{ meta.url }}{{ meta.ogImage }}",
  "email": "{{ meta.contact.email | jsonEscape }}",
  "telephone": "{{ meta.contact.phone.e164 }}",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Reykjavík",
    "postalCode": "105",
    "addressCountry": "IS"
  },
  "inLanguage": "{{ lang }}"
}
</script>
```

Notes:
- `logo` now points at the real brand mark (`/assets/img/logo.svg`).
- `image` (the OG share card) is added as a separate property — distinct semantic from `logo`.
- `telephone` uses E.164 from `meta.contact.phone.e164`.
- `name` and `email` get `| jsonEscape` per the framework spec rule "no JSON-LD with unescaped user-controlled strings". Even though these are author-controlled today, escaping is the correct stack-purity default.

### (d) `src/_includes/partials/utility-bar.njk` phone update

**Before** (line 10):

```njk
<a href="tel:+3548504405">(+354) 850-4405</a>
```

**After:**

```njk
<a href="tel:{{ meta.contact.phone.e164 }}">{{ meta.contact.phone.display }}</a>
```

Same with the email on line 11 — pull from `meta.contact.email` for consistency:

```njk
<a href="mailto:{{ meta.contact.email }}">{{ meta.contact.email }}</a>
```

### (e) Favicon link verification

`src/_includes/layouts/base.njk:8` already reads:

```njk
<link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
```

No template change needed — just ensure `src/assets/img/favicon.svg` exists (see (a)). Optionally add an ICO fallback for older browsers:

```njk
<link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
<link rel="alternate icon" href="/assets/img/favicon.ico">
```

(Out of scope for this fix unless explicitly requested.)

## Verification

1. `npm run build` (or equivalent) — no 404s for `/assets/img/og-default.jpg`, `/assets/img/favicon.svg`, `/assets/img/logo.svg` in the dev server logs.
2. View source on any rendered page and confirm:
   - `<link rel="icon" href="…/favicon.svg">` resolves (DevTools → Network shows 200).
   - The `Organization` JSON-LD block has `"logo": ".../logo.svg"`, a separate `"image": ".../og-default.jpg"`, and `"telephone": "+3548504405"`.
   - The `WebSite` JSON-LD in `base.njk` still renders (unchanged).
3. Paste the rendered `Organization` JSON-LD into the [Schema.org validator](https://validator.schema.org/) and Google's [Rich Results Test](https://search.google.com/test/rich-results) — zero errors, zero warnings on `telephone` format.
4. Phone audit: `rg -n '850.?4405|3548504405' src/` should show only three call sites, all reading from `meta.contact.phone.*`.
5. Social-share smoke test: paste a built page URL into the [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) and confirm the OG image loads (will only work after the real `og-default.jpg` is committed).

## Out of scope / TODOs left for the author

- Producing the three actual asset files (`og-default.jpg`, `favicon.svg`, `logo.svg`). Placeholders may be committed in this PR, but a follow-up task is required to replace them with real brand assets.
- Adding ICO/PNG favicon fallbacks for legacy browsers.
- Adding `sameAs` (social profile URLs) to the `Organization` JSON-LD — separate enhancement.
