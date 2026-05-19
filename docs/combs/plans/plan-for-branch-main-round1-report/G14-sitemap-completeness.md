# G14 — Per-locale sitemaps omit 9 of 10 articles (silent under-emit)

- **Severity:** Critical
- **Specialty:** code-reviewer
- **Consolidates:** C5 (sitemap omits 9/10 articles per locale), L9 (empty/under-filled sitemap renders silently)
- **Files:**
  - `src/content/is/sitemap.njk`
  - `src/content/en/sitemap.njk`
- **Build output (current):** `_site/sitemap.xml` and `_site/en/sitemap.xml` each contain 7 `<url>` entries; should contain 17 (7 + 10 articles).
- **Spec:** `docs/instructions/FRAMEWORK-I18N.md` §Sitemap — "One sitemap per language … iterates all pages where `lang == 'is'`/`'en'`."

---

## What

Both per-locale sitemaps iterate `collections.all` and emit one `<url>` per item. In Eleventy v3, **pagination targets are not exposed as independent `collections.all` entries** — the paginated source template (`greinar/[slug].njk` or equivalent) appears once, so only the page that happens to render at the bare permalink survives. In our build, that single survivor is the `featured` article (`handover-report-contents`); the other 9 article URLs per locale exist on disk (`_site/greinar/<slug>/index.html`, `_site/en/greinar/<slug>/index.html`) but are absent from the sitemap.

Net effect: search engines see 1 of 10 articles per locale. The remaining 18 article URLs (9 IS + 9 EN) are orphaned from the discovery surface.

Separately (L9), the template emits whatever the filter produces with **no floor check**. If a future refactor changes a URL prefix or breaks the iteration entirely, the sitemap renders as a valid-but-near-empty `<urlset>` and the build still succeeds. The bug stays silent until someone notices a Search Console traffic cliff.

## Why this is Critical

- **SEO discovery surface collapse.** 90 % of the article corpus is invisible to crawlers via the canonical discovery channel. `robots.txt` advertises both sitemaps; both lie about what exists.
- **Bilingual hreflang integrity depends on both sitemaps listing both URLs of each pair.** With 1/10 articles listed, Google has no reliable signal of the IS↔EN article pairings even though the `<link rel="alternate" hreflang>` tags are emitted in `<head>`.
- **Silent failure mode.** A future change to `articles.js` or a template rename can drop entries to zero with no build error, no test failure, no warning.

---

## How

Two fixes, both in the same two files. No `eleventy.config.js` changes required.

### Fix 1 — Emit every article explicitly from the `articles` data source

Iterate `articles` (the `src/_data/articles.js` array) directly in addition to the existing `collections.all` loop. Article slugs are identical across locales (per FRAMEWORK-I18N.md), so the same loop body works in both files with only the URL prefix differing.

### Fix 2 — Build-time assertion (floor check)

After emitting URLs, fail the build (or at minimum log a loud warning) if the total emitted is below a sane floor. Eleventy templates can't `throw` mid-render, so the cheapest portable approach is a `{% set %}` counter plus a Nunjucks `{% if count < N %}` block that emits an XML comment plus a deliberately malformed sentinel that breaks the build's downstream validators — **or** simpler and recommended, emit a counter comment and rely on a CI grep guard in G15.

For this fix, scope L9 narrowly: include the counter comment now so G15's CI assertion has a stable anchor. Note `<!-- url-count: N -->` is XML-valid and ignored by crawlers.

### Before / after — `src/content/is/sitemap.njk`

**Before:**

```njk
---
permalink: /sitemap.xml
eleventyExcludeFromCollections: true
layout: null
---
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
{%- for page in collections.all %}
  {%- if page.url and not page.url.startsWith("/en/") and not page.url.endsWith(".xml") and not page.url.endsWith(".txt") %}
  <url>
    <loc>{{ meta.url }}{{ page.url }}</loc>
    <lastmod>{{ page.date | dateIso }}</lastmod>
  </url>
  {%- endif %}
{%- endfor %}
</urlset>
```

**After:**

```njk
---
permalink: /sitemap.xml
eleventyExcludeFromCollections: true
layout: null
---
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
{%- set urlCount = 0 %}
{#- Singletons + listings: home, about, /thjonusta/, /geirar/, /greinar/, /verdreiknir/. -#}
{#- Excludes /en/*, *.xml, *.txt, and paginated article source templates (handled below). -#}
{%- for item in collections.all %}
  {%- if item.url
      and not item.url.startsWith("/en/")
      and not item.url.endsWith(".xml")
      and not item.url.endsWith(".txt")
      and not (item.url.startsWith("/greinar/") and item.url | length > "/greinar/".length + 1) %}
  <url>
    <loc>{{ meta.url }}{{ item.url }}</loc>
    <lastmod>{{ item.date | dateIso }}</lastmod>
  </url>
  {%- set urlCount = urlCount + 1 %}
  {%- endif %}
{%- endfor %}
{#- Articles: iterate the data source directly. Eleventy v3 pagination does not -#}
{#- expose each paginated output as a collections.all entry, so we must enumerate. -#}
{%- for article in articles %}
  <url>
    <loc>{{ meta.url }}/greinar/{{ article.slug }}/</loc>
    <lastmod>{{ article.date | dateIso }}</lastmod>
  </url>
  {%- set urlCount = urlCount + 1 %}
{%- endfor %}
<!-- url-count: {{ urlCount }} -->
</urlset>
```

### Before / after — `src/content/en/sitemap.njk`

**Before:**

```njk
---
permalink: /en/sitemap.xml
eleventyExcludeFromCollections: true
layout: null
---
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
{%- for page in collections.all %}
  {%- if page.url and page.url.startsWith("/en/") and not page.url.endsWith(".xml") %}
  <url>
    <loc>{{ meta.url }}{{ page.url }}</loc>
    <lastmod>{{ page.date | dateIso }}</lastmod>
  </url>
  {%- endif %}
{%- endfor %}
</urlset>
```

**After:**

```njk
---
permalink: /en/sitemap.xml
eleventyExcludeFromCollections: true
layout: null
---
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
{%- set urlCount = 0 %}
{#- Singletons + listings under /en/. Exclude the paginated article source template. -#}
{%- for item in collections.all %}
  {%- if item.url
      and item.url.startsWith("/en/")
      and not item.url.endsWith(".xml")
      and not (item.url.startsWith("/en/greinar/") and item.url | length > "/en/greinar/".length + 1) %}
  <url>
    <loc>{{ meta.url }}{{ item.url }}</loc>
    <lastmod>{{ item.date | dateIso }}</lastmod>
  </url>
  {%- set urlCount = urlCount + 1 %}
  {%- endif %}
{%- endfor %}
{#- Articles: enumerate from the data source (see IS sitemap for rationale). -#}
{%- for article in articles %}
  <url>
    <loc>{{ meta.url }}/en/greinar/{{ article.slug }}/</loc>
    <lastmod>{{ article.date | dateIso }}</lastmod>
  </url>
  {%- set urlCount = urlCount + 1 %}
{%- endfor %}
<!-- url-count: {{ urlCount }} -->
</urlset>
```

### Why the `collections.all` exclusion clause for paginated articles?

If you leave the original loop unchanged, the one article that *does* surface in `collections.all` (the `featured` entry that renders at the bare permalink) will be emitted **twice** — once by the listing loop, once by the explicit `articles` loop. The added guard `not (item.url.startsWith("/greinar/") and item.url | length > "/greinar/".length + 1)` excludes any URL deeper than `/greinar/` from the singletons loop, leaving the listing index `/greinar/` itself intact and delegating all article URLs to the explicit loop. Mirror logic for `/en/greinar/`.

If `length` filter behavior in your Nunjucks version is awkward, the equivalent check is `not (item.url.startsWith("/greinar/") and item.url != "/greinar/")` — pick whichever reads cleaner; both produce the same result.

---

## Dependency note — interaction with G2 (content-model migration)

If G2 lands first and converts articles into real `.md` files under `src/content/{is,en}/greinar/` with `lang` set via the directory data cascade, this fix becomes simpler: drop the explicit `articles` loop, drop the paginated-URL exclusion, and filter `collections.all` by `item.data.lang` instead of by URL prefix. Specifically:

```njk
{%- for item in collections.all %}
  {%- if item.url and item.data.lang == "is" and not item.url.endsWith(".xml") and not item.url.endsWith(".txt") %}
  …
  {%- endif %}
{%- endfor %}
```

That variant is strictly cleaner and is what FRAMEWORK-I18N.md §Sitemap actually prescribes ("iterates all pages where `lang == 'is'`"). **Until G2 lands, the explicit-articles-loop fix above is required** — the current `articles.js`-driven pagination architecture cannot be reached by a `collections.all` + `lang` filter alone.

If G2 is scheduled in the same release as this fix, coordinate: do the explicit-articles fix here, then G2 simplifies it as part of its own diff. Don't block G14 on G2 — the SEO surface is bleeding now.

---

## Verification

1. Build the site:
   ```
   npx @11ty/eleventy
   ```
2. Count emitted URLs per sitemap:
   ```
   grep -c '<url>' _site/sitemap.xml         # expect: 17
   grep -c '<url>' _site/en/sitemap.xml      # expect: 17
   ```
   (7 existing singletons/listings + 10 articles per locale.)
3. Confirm no duplicate article URLs:
   ```
   grep '/greinar/handover-report-contents/' _site/sitemap.xml | wc -l       # expect: 1
   grep '/en/greinar/handover-report-contents/' _site/en/sitemap.xml | wc -l # expect: 1
   ```
4. Confirm the listing index `/greinar/` is still present once in each:
   ```
   grep -c '<loc>https://[^<]*/greinar/</loc>' _site/sitemap.xml      # expect: 1
   grep -c '<loc>https://[^<]*/en/greinar/</loc>' _site/en/sitemap.xml # expect: 1
   ```
5. Confirm the counter comment matches the actual `<url>` count in each file (sanity check for the G15 CI guard hook):
   ```
   grep 'url-count' _site/sitemap.xml      # expect: <!-- url-count: 17 -->
   grep 'url-count' _site/en/sitemap.xml   # expect: <!-- url-count: 17 -->
   ```
6. Spot-check one non-featured article from each locale is now present:
   ```
   grep 'greinar/manufacturer-comparison/' _site/sitemap.xml          # expect: 1 hit
   grep 'en/greinar/manufacturer-comparison/' _site/en/sitemap.xml    # expect: 1 hit
   ```
7. Validate both files as XML (catches any stray whitespace/encoding issues introduced by the new loops):
   ```
   xmllint --noout _site/sitemap.xml _site/en/sitemap.xml
   ```

If any of steps 2–7 fail, do **not** ship. The whole point of this fix is that the sitemap stops lying.

---

## Out of scope

- The build-time floor assertion that fails CI if `url-count` drops below threshold lives in **G15** (CI guard). This fix only ensures the counter comment exists so G15 has something to grep.
- Sitemap index file at the root referencing both per-locale sitemaps (FRAMEWORK-I18N.md §Sitemap calls it "optional"). Not addressed here.
- `lastmod` accuracy per article (currently uses `article.date` from `articles.js`, which is the publish date, not the modification date). Acceptable until content actually changes post-publish; revisit if it becomes load-bearing.
