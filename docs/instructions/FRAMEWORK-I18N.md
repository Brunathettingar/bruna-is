# Localization addendum — Icelandic (primary) + English (secondary)

This document is a **hard requirement** layered on top of `FRAMEWORK-PORT-PROMPT.md`. The site must ship bilingually from day one. Treat this as part of the framework, not an afterthought.

- **Primary language:** Icelandic (`is`) — served at the site root with no URL prefix.
- **Secondary language:** English (`en`) — served under `/en/`.
- **Slug policy:** slugs are identical across both languages. URLs differ only by the locale prefix (or absence of it).

URL pattern:

```
/                    →  Icelandic home
/about/              →  Icelandic about
/services/foo/       →  Icelandic detail
/en/                 →  English home
/en/about/           →  English about
/en/services/foo/    →  English detail
```

---

## Plugins

Two plugins handle this — one built into Eleventy, one external for UI string translation.

### Built-in: `I18nPlugin` (ships with Eleventy v3)

Handles `page.lang`, the `locale_url` filter (rewrites links to the current page's language), and the `locale_links` filter (lists localized alternates for the current page). It manages the **links between localized content**; it does not translate strings.

### Add: `eleventy-plugin-i18n`

Handles **UI string translation** via a dictionary file. Adds an `i18n` filter that auto-detects the current page's language and looks up the translated string.

Add to `package.json`:

```json
"dependencies": {
  "@11ty/eleventy": "^3.1.2",
  "@11ty/eleventy-img": "^6.0.4",
  "@11ty/eleventy-navigation": "^1.0.5",
  "eleventy-plugin-i18n": "^1.0.1"
}
```

---

## Config additions

Extend `eleventy.config.js`:

```js
import eleventyNavigationPlugin from "@11ty/eleventy-navigation";
import { eleventyImageTransformPlugin, I18nPlugin } from "@11ty/eleventy";
import i18nPlugin from "eleventy-plugin-i18n";
import translations from "./src/_data/i18n.js";

export default function (eleventyConfig) {
  eleventyConfig.addPlugin(eleventyNavigationPlugin);
  eleventyConfig.addPlugin(eleventyImageTransformPlugin, { /* …as before… */ });

  // Links between localized pages — page.lang, locale_url, locale_links
  eleventyConfig.addPlugin(I18nPlugin, {
    defaultLanguage: "is",
    errorMode: "allow-fallback", // fall back to /slug if /is/slug missing
  });

  // UI string translation dictionary
  eleventyConfig.addPlugin(i18nPlugin, {
    translations,
    fallbackLocales: { en: "is" }, // missing English string → fall back to Icelandic
  });

  // Locale-aware date filter
  eleventyConfig.addFilter("dateDisplay", (date, lang = "is") =>
    new Date(date).toLocaleDateString(lang === "is" ? "is-IS" : "en-US", {
      year: "numeric", month: "long", day: "numeric",
    })
  );

  eleventyConfig.addFilter("dateIso", (date) =>
    new Date(date).toISOString().split("T")[0]
  );

  eleventyConfig.addFilter("jsonEscape", (str) => { /* …as before… */ });

  // …custom collections, passthrough copy, etc.
}
```

Notes:
- `defaultLanguage: "is"` means the I18nPlugin treats Icelandic as the canonical version of any piece of content. Combined with the Icelandic-at-root permalink strategy below, the `locale_url` filter resolves correctly in both directions.
- `errorMode: "allow-fallback"` is the right choice — strict mode would fail the build if any page exists in only one language. Allow content to fall back gracefully.

---

## Directory layout

```
src/
  _data/
    meta.js            # locale-aware site metadata (see below)
    i18n.js            # UI string dictionary
  _includes/
    layouts/
      base.njk         # adds <html lang>, hreflang alternates
      page.njk
      <type>.njk
    partials/
      nav.njk          # uses i18n filter for nav labels
      breadcrumb.njk
      seo-meta.njk
      language-switcher.njk
  assets/              # shared — not per-locale
  content/
    is/                # Icelandic content tree
      is.json          # sets lang: "is" via data cascade
      index.njk
      404.njk
      sitemap.njk
      about/
      services/        # or whatever collection names
        services.json
        index.njk
        <slug>.md
    en/                # English content tree — mirrors `is/`
      en.json          # sets lang: "en"
      index.njk
      404.njk
      sitemap.njk
      about/
      services/
        services.json
        index.njk
        <slug>.md
    robots.njk         # shared, references both sitemaps
```

### Why Icelandic lives under `src/content/is/` instead of at the root

Even though Icelandic URLs have no `/is/` prefix, the **source files** live in a parallel `is/` directory. We strip the prefix at build time with a `permalink` override in the directory data file (see below). This keeps the source tree symmetric and lets `I18nPlugin` detect language from path the same way for both languages.

---

## Permalink strategy — strip `/is/` from output URLs

`src/content/is/is.json`:

```json
{
  "lang": "is",
  "permalink": "/{{ page.filePathStem | replace('/content/is/', '') | replace('/index', '') }}/"
}
```

`src/content/en/en.json`:

```json
{
  "lang": "en",
  "permalink": "/en/{{ page.filePathStem | replace('/content/en/', '') | replace('/index', '') }}/"
}
```

This produces:

- `src/content/is/about/index.njk` → `/about/`
- `src/content/is/services/foo.md` → `/services/foo/`
- `src/content/en/about/index.njk` → `/en/about/`
- `src/content/en/services/foo.md` → `/en/services/foo/`

Collection directory data files override this for their own permalink shape:

`src/content/is/services/services.json`:

```json
{
  "tags": ["services-is"],
  "layout": "layouts/service.njk",
  "permalink": "/services/{{ page.fileSlug }}/"
}
```

`src/content/en/services/services.json`:

```json
{
  "tags": ["services-en"],
  "layout": "layouts/service.njk",
  "permalink": "/en/services/{{ page.fileSlug }}/"
}
```

**Tag both per-language and shared**, so templates can iterate per-locale: `services-is`, `services-en`, plus `services` if you need a cross-language collection. Custom collections in `eleventy.config.js` should filter by the language-suffixed tag.

---

## UI string dictionary

`src/_data/i18n.js`:

```js
export default {
  // Navigation
  "nav.home":      { is: "Heim",        en: "Home" },
  "nav.about":     { is: "Um okkur",    en: "About" },
  "nav.services":  { is: "Þjónusta",    en: "Services" },
  "nav.contact":   { is: "Hafa samband",en: "Contact" },

  // Common UI chrome
  "ui.skip_to_content": { is: "Hoppa yfir á efni",  en: "Skip to content" },
  "ui.menu":            { is: "Valmynd",            en: "Menu" },
  "ui.read_more":       { is: "Lesa meira",         en: "Read more" },
  "ui.back_to_top":     { is: "Efst á síðu",        en: "Back to top" },
  "ui.language_switch": { is: "English",            en: "Íslenska" },

  // SEO / footer
  "footer.copyright":   { is: "Öll réttindi áskilin.", en: "All rights reserved." },

  // Add a key any time a template needs a hardcoded string.
  // Never inline a translatable string in a template.
};
```

Usage in any template:

```njk
<a href="#main-content" class="skip-link">{{ "ui.skip_to_content" | i18n }}</a>
<button aria-label="{{ "ui.menu" | i18n }}">…</button>
```

The filter auto-detects the page's language from `page.lang` (set by `I18nPlugin` from directory).

---

## Per-locale site metadata

Replace the static `meta.json` with a JS data file that returns locale-keyed metadata:

`src/_data/meta.js`:

```js
const byLocale = {
  is: {
    title:       "<Site Title in Icelandic>",
    description: "<One-line Icelandic description>",
    author:      "<Org name>",
    ogImageAlt:  "<Site Title> — <tagline in Icelandic>",
  },
  en: {
    title:       "<Site Title in English>",
    description: "<One-line English description>",
    author:      "<Org name>",
    ogImageAlt:  "<Site Title> — <tagline in English>",
  },
};

const shared = {
  url:      "https://<production-domain>",
  ogImage:  "/assets/img/og-default.jpg",
};

export default { ...shared, byLocale };
```

In templates, access via `meta.byLocale[lang]`:

```njk
<meta property="og:title" content="{{ title or meta.byLocale[lang].title | escape }}">
<meta property="og:description" content="{{ description or meta.byLocale[lang].description | escape }}">
```

---

## `base.njk` — add hreflang and `<html lang>`

```njk
<!doctype html>
<html lang="{{ lang or 'is' }}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{% if title and title != meta.byLocale[lang].title %}{{ title }} | {{ meta.byLocale[lang].title }}{% else %}{{ meta.byLocale[lang].title }}{% endif %}</title>
    <meta name="description" content="{{ description or meta.byLocale[lang].description }}">
    <link rel="canonical" href="{{ meta.url }}{{ page.url }}">

    {# hreflang alternates — current page + all locale_links #}
    <link rel="alternate" hreflang="{{ lang }}" href="{{ meta.url }}{{ page.url }}">
    {%- for link in page.url | locale_links %}
    <link rel="alternate" hreflang="{{ link.lang }}" href="{{ meta.url }}{{ link.url }}">
    {%- endfor %}
    <link rel="alternate" hreflang="x-default" href="{{ meta.url }}{{ page.url | locale_url('is') }}">

    {% include "partials/seo-meta.njk" %}
    <link rel="stylesheet" href="/assets/css/tokens.css">
    {# …rest of CSS chain… #}
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": "{{ meta.url }}/#website",
      "name": "{{ meta.byLocale[lang].title | jsonEscape }}",
      "url": "{{ meta.url }}/",
      "description": "{{ meta.byLocale[lang].description | jsonEscape }}",
      "inLanguage": "{{ lang }}"
    }
    </script>
  </head>
  <body>
    {{ content | safe }}
    <script type="module" src="/assets/js/main.js"></script>
  </body>
</html>
```

`x-default` points to the Icelandic version of the page, signalling to search engines that Icelandic is the canonical fallback when the user's language doesn't match.

---

## Language switcher partial

`src/_includes/partials/language-switcher.njk`:

```njk
{%- set alternates = page.url | locale_links %}
{%- if alternates.length %}
<nav class="lang-switch" aria-label="{{ 'ui.language_switch' | i18n }}">
  <ul role="list">
    <li>
      <a href="{{ page.url }}" aria-current="page" lang="{{ lang }}" hreflang="{{ lang }}">
        {{ lang | upper }}
      </a>
    </li>
    {%- for link in alternates %}
    <li>
      <a href="{{ link.url }}" lang="{{ link.lang }}" hreflang="{{ link.lang }}">
        {{ link.lang | upper }}
      </a>
    </li>
    {%- endfor %}
  </ul>
</nav>
{%- endif %}
```

Include from `page.njk` (or wherever the mockup places it — header, footer, or both).

`locale_links` only returns languages where the **current page actually exists** in the other locale. If a piece of content is only in Icelandic, no switcher entry appears. This is the right behavior — never offer a switch that leads to a 404.

---

## Nav partial with translated labels

```njk
<header class="site-header">
  <nav class="site-nav" aria-label="Main">
    <a href="{{ '/' | locale_url }}" class="site-nav__logo">{{ meta.byLocale[lang].title }}</a>

    <ul id="nav-menu" class="site-nav__list" role="list">
      {%- set navPages = collections.all | eleventyNavigation %}
      {%- for entry in navPages %}
      {%- if entry.url | startsWith(lang == "is" and "/" or "/en/") %}
      <li class="site-nav__item">
        <a href="{{ entry.url }}"
           class="site-nav__link"
           {% if entry.url == page.url %}aria-current="page"{% endif %}>
          {{ entry.title }}
        </a>
      </li>
      {%- endif %}
      {%- endfor %}
    </ul>

    {% include "partials/language-switcher.njk" %}
  </nav>
</header>
```

The nav iterates `eleventyNavigation` but filters to entries whose URL belongs to the current language tree. Set `eleventyNavigation.key` per-page in frontmatter using **distinct keys per language** (e.g. `home-is` / `home-en`) so the plugin doesn't collide.

Cleaner alternative: build per-locale nav arrays in `eleventy.config.js`:

```js
eleventyConfig.addCollection("navIs", (api) =>
  api.getAll()
     .filter((item) => item.url.startsWith("/") && !item.url.startsWith("/en/"))
     .filter((item) => item.data.eleventyNavigation)
     .sort((a, b) => (a.data.eleventyNavigation.order || 0) - (b.data.eleventyNavigation.order || 0))
);
// …and navEn similarly.
```

Use `collections["nav" + (lang == "is" ? "Is" : "En")]` in the template. Pick whichever your team finds clearer.

---

## Content authoring contract

For every collection entry, the **same slug** must exist in both locales, with parallel frontmatter. Example:

`src/content/is/services/web-design.md`:

```yaml
---
title: "Vefhönnun"
date: 2026-01-15
summary: "Stutt lýsing á íslensku."
thumb: "../../../img/services/web-design-thumb.jpg"
eleventyNavigation:
  parent: services-is
---

Markdown efni á íslensku.
```

`src/content/en/services/web-design.md`:

```yaml
---
title: "Web Design"
date: 2026-01-15
summary: "Short English description."
thumb: "../../../img/services/web-design-thumb.jpg"
eleventyNavigation:
  parent: services-en
---

English markdown content.
```

Rules:
- **Same filename = same slug = locale_links pairs them automatically.**
- Same `date` (or use computed dates if they differ per locale).
- Same image references (images are language-neutral assets; alt text is the only thing that translates and should live in frontmatter alongside `images:`).
- Same shape of frontmatter — translated values, identical keys.

If a piece of content exists in only one language, `locale_links` simply won't list it as an alternate. That's fine. Don't create empty stub pages just to balance the trees.

---

## Sitemap

One sitemap per language, both linked from `robots.txt`.

`src/content/is/sitemap.njk` — iterates all pages where `lang == "is"`.
`src/content/en/sitemap.njk` — iterates all pages where `lang == "en"`.

`src/content/robots.njk`:

```
User-agent: *
Allow: /

Sitemap: {{ meta.url }}/sitemap.xml
Sitemap: {{ meta.url }}/en/sitemap.xml
```

Optionally, a sitemap index at the root referencing both.

---

## 404 pages

One per locale:
- `src/content/is/404.njk` → output to `/404.html` (the GitHub Pages default).
- `src/content/en/404.njk` → output to `/en/404.html`.

GitHub Pages serves `/404.html` for any missing path, so the user lands on the Icelandic 404 by default. That 404 page should include the language switcher so an English visitor who hit a broken Icelandic URL can recover.

---

## JSON-LD per page

Add `"inLanguage": "{{ lang }}"` to every JSON-LD block emitted by detail layouts. Example for an article:

```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "inLanguage": "{{ lang }}",
  "name": "{{ title | jsonEscape }}",
  ...
}
```

For paired translations, you can also emit `translationOfWork` / `workTranslation` properties pointing to the alternate URL — useful for SEO but optional for v1.

---

## Date formatting

The `dateDisplay` filter now takes a `lang` argument:

```njk
<time datetime="{{ date | dateIso }}">{{ date | dateDisplay(lang) }}</time>
```

This produces:
- `lang == "is"` → `15. janúar 2026` (Icelandic locale formatting)
- `lang == "en"` → `January 15, 2026`

If `Intl` rendering differs from what the brand wants (e.g. you prefer "15. jan. 2026"), customize the `Intl.DateTimeFormat` options in the filter.

---

## Conventions and guardrails

- **Never inline a translatable string in a template.** If it's user-visible text, it goes in `i18n.js`. Asset paths, class names, technical attributes do not count as translatable.
- **Slugs are identical across locales.** Don't translate `/services/` to `/thjonusta/`. The URL pattern is locale-prefix-only.
- **`eleventyNavigation.key` and `parent` values are suffixed per language** (`services-is`, `services-en`) so the navigation plugin doesn't merge them.
- **Every detail-type layout must thread `lang` through** to the JSON-LD `inLanguage` field and to the `dateDisplay` filter.
- **The language switcher uses `locale_links`**, which only lists pages that actually exist in the other locale. Trust this — don't add manual fallback logic.
- **Default-language stripping happens in the directory data permalink**, not in any per-page frontmatter. If you need to override permalinks for a special page, preserve the language prefix logic explicitly.
- **Shared assets stay shared.** `src/assets/`, `src/img/` are not duplicated per locale. Only content and metadata are.
- **`hreflang="x-default"`** points at the Icelandic version (the primary). Required for international SEO.
- **Build verification:** after porting, every page that exists in both languages must:
  1. Render with the correct `<html lang>` attribute.
  2. Show a working language switcher.
  3. Emit hreflang alternates in `<head>`.
  4. Use translated UI strings (no English chrome on Icelandic pages or vice versa).

---

## Sources

- [Eleventy I18n plugin reference](https://www.11ty.dev/docs/plugins/i18n/)
- [Eleventy Internationalization (i18n) overview](https://www.11ty.dev/docs/i18n/)
- [eleventy-plugin-i18n (Adam Duncan) — UI string dictionary plugin](https://github.com/adamduncan/eleventy-plugin-i18n)
- [madrilene/eleventy-i18n — minimal starter using the official I18n plugin](https://github.com/madrilene/eleventy-i18n)
- [Internationalization with Eleventy 2.0 and Netlify (Lene Saile)](https://www.lenesaile.com/en/blog/internationalization-with-eleventy-20-and-netlify/)
- [DeepWiki — Eleventy i18n internals](https://deepwiki.com/11ty/eleventy/8.3-internationalization-(i18n))
- [Google Search Central — hreflang attribute reference](https://developers.google.com/search/docs/specialty/international/localized-versions)
- [BCP 47 language tags (IETF)](https://www.rfc-editor.org/info/bcp47)
