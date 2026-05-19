# C1 — Article ogImage shipped as literal Nunjucks

**Severity:** Critical
**File(s):** src/content/is/greinar/article.njk:8–13, src/content/en/greinar/article.njk:8–13
**Specialty:** code-reviewer

---

## What

Move `ogImage` from top-level frontmatter into the existing `eleventyComputed:` block in both article templates so Nunjucks actually resolves `{{ article.image }}` per paginated entry. Leave `ogType: "article"` exactly where it is — it is a static literal, not a template, and already builds correctly.

## Why

Eleventy only renders Nunjucks in frontmatter values that live under `eleventyComputed:`. Top-level frontmatter strings are passed through unchanged. Build output proves the failure mode at `_site/greinar/ei-rating-explained/index.html`:

```
18:<meta property="og:type" content="article">
19:<meta property="og:image" content="https://brunathettingar.github.io/bruna-is{{ article.image }}">
26:<meta name="twitter:image" content="https://brunathettingar.github.io/bruna-is{{ article.image }}">
```

`og:type` is correct (static string). `og:image` and `twitter:image` ship the literal `{{ article.image }}` token, breaking every social preview for all 20 paginated article URLs (10 IS at `/greinar/<slug>/`, 10 EN at `/en/greinar/<slug>/`). `seo-meta.njk:7,14` consume `ogImage` via `{%- set socialImage = ogImage or meta.ogImage %}`, so both meta tags break together.

## Where

- `src/content/is/greinar/article.njk` — lines 8–13 (frontmatter block)
- `src/content/en/greinar/article.njk` — lines 8–13 (frontmatter block)

## How

**Before** (both files, lines 8–13):

```yaml
eleventyComputed:
  title: "{{ article.title.is }}"
  description: "{{ article.summary.is }}"
ogType: "article"
ogImage: "{{ article.image }}"
---
```

(EN file uses `article.title.en` and `article.summary.en`.)

**After** — `src/content/is/greinar/article.njk` lines 8–13:

```yaml
eleventyComputed:
  title: "{{ article.title.is }}"
  description: "{{ article.summary.is }}"
  ogImage: "{{ article.image }}"
ogType: "article"
---
```

**After** — `src/content/en/greinar/article.njk` lines 8–13:

```yaml
eleventyComputed:
  title: "{{ article.title.en }}"
  description: "{{ article.summary.en }}"
  ogImage: "{{ article.image }}"
ogType: "article"
---
```

Notes for the executor:
- Only `ogImage` moves. `ogType` stays at top level — it is a static string and already renders correctly in build output.
- Indentation under `eleventyComputed:` is two spaces, matching `title` / `description` already in place.

## Expected Outcome

1. Rebuild: `npx @11ty/eleventy`.
2. Verify the literal-braces leak is gone in OG/Twitter meta:
   ```
   grep -rE 'og:image|twitter:image' _site/greinar _site/en/greinar | grep '{{'
   ```
   Expected: zero matches.
3. Spot-check one IS and one EN article, e.g.:
   ```
   grep -E 'og:image|twitter:image' _site/greinar/ei-rating-explained/index.html
   grep -E 'og:image|twitter:image' _site/en/greinar/ei-rating-explained/index.html
   ```
   Expected: `content="https://brunathettingar.github.io/bruna-is/img/server_room.jpg"` (matches the `image` field in `src/_data/articles.js` for that slug).
4. `og:type` line remains `<meta property="og:type" content="article">` — unchanged.

## Scope

**In scope:** the two `article.njk` frontmatter blocks; one full rebuild and the two grep checks above.

**Out of scope:** any other templates that may have Nunjucks expressions in top-level frontmatter (file separately if discovered); JSON-LD inside `<script type="application/ld+json">` bodies (already inside the template body, not frontmatter — already correct); article body copy; the `ogImageAlt` fallback chain in `seo-meta.njk`.

## Directive citations

- `quality.md §1` — verify behavior, not assumptions. The broken og:image URL is observable in `_site` build output, not theoretical.
- `FRAMEWORK-PORT-PROMPT.md` §"SEO and JSON-LD" — OG/Twitter image correctness is a framework requirement; every page must emit a valid `og:image` URL.

## Considered alternatives

- **Set `ogImage` via a Nunjucks `{% set %}` in the template body before `seo-meta.njk` is included.** Rejected: `seo-meta.njk` is included from the layout chain (`page.njk`/`base.njk`), not from `article.njk`, so a `{% set %}` in the article body runs too late and would not be in scope for the partial. `eleventyComputed` is also the project's existing convention for per-paginated-entry frontmatter (`title`, `description` already use it).
- **Hand-author the `og:image` meta tag inside `article.njk` and bypass `seo-meta.njk` for articles.** Rejected: duplicates the partial, violates `modularity.md` (single source for SEO meta), and would also have to be repeated for `twitter:image`.
