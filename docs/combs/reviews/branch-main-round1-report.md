# bruna-is — Branch `main` — Round 1 Review Report

**Branch:** `main` → `main` (full-tree audit, no diff scope)
**Scope:** ~50 source files under `src/` + config + workflow; reference framework specs at `docs/instructions/`
**Reviewers:** 4 agents (`comb:code-reviewer`, `comb:consistency-auditor`, `comb:simplifier`, `comb:silent-failure-hunter`)
**Date:** 2026-05-18
**Reference implementation:** `/Users/olafur/Development/somethings/`
**Framework specs (authoritative):**
- `docs/instructions/FRAMEWORK-PORT-PROMPT.md`
- `docs/instructions/FRAMEWORK-I18N.md`
- `docs/instructions/FRAMEWORK-DOCS.md`

---

## Verification Summary

| Check | Result |
|---|---|
| `npm ci` | Clean (1 deprecation warning: `lodash.get@4.4.2` transitively via `eleventy-plugin-i18n@0.1.3`) |
| `npx @11ty/eleventy` build | Clean — 43 copied, 37 written in 1.11s |
| Output HTML rendered without `{{ }}` artifacts | **FAIL** — every `_site/**/greinar/<slug>/index.html` ships `og:image="…{{ article.image }}"` literally (Critical C1) |
| `<picture>` elements in build output | **0** — `eleventy-img` is configured but never fires (Critical C2) |
| Sitemap completeness | **FAIL** — 2 of 20 article pages present per `_site/sitemap.xml` and `_site/en/sitemap.xml`; 9 articles/locale missing (Critical C5) |
| Tests | N/A — no test suite configured (by design in `CLAUDE.md`; see Test Gaps T1) |

---

## Verdict: **NEEDS WORK**

The build is green and the site renders. But conformance to the project's own framework specs is poor in the load-bearing places, and three findings are user-visible production bugs today: broken social-share previews on every article (C1), an unusable mobile navigation (C4), and 90% of articles missing from sitemaps (C5). Two further criticals (C2, C3) describe pre-accepted deviations in `docs/architecture-deviations.md` — the focus brief explicitly overrides that document, so they are flagged at full severity.

---

## Findings by Severity

### Critical

#### C1 — Article `og:image` and `ogType` ship as literal Nunjucks expressions on every article page
*Source: code-reviewer*
File(s): `src/content/is/greinar/article.njk:12`, `src/content/en/greinar/article.njk:12`
Build evidence: `_site/greinar/ei-rating-explained/index.html` and every other `_site/**/greinar/<slug>/index.html`

The frontmatter declares:
```yaml
ogType: "article"
ogImage: "{{ article.image }}"
```
at the top level. Eleventy only interpolates Nunjucks inside frontmatter strings when those strings live under `eleventyComputed:`. The result is that every article page emits `<meta property="og:image" content="https://brunathettingar.github.io/bruna-is{{ article.image }}">` — braces preserved.

**Impact:** every article's social-share preview (Facebook, X, LinkedIn, Slack) fetches a broken URL. SEO image signal lost across 20 article pages.

**Fix:** move `ogImage` and `ogType` under `eleventyComputed:` alongside `title` and `description`. Re-run build and grep `_site/**/*.html` for `{{` to confirm clean.

Cite: `FRAMEWORK-PORT-PROMPT.md` §"SEO and JSON-LD"; `quality.md`.

---

#### C2 — Image pipeline bypassed; `eleventy-img` is dead infrastructure
*Source: code-reviewer + consistency-auditor + simplifier + silent-failure-hunter*
File(s): `eleventy.config.js:32-39` (plugin registered with widths `[400, 800, 1200, "auto"]`); 34+ inline `style="background-image: url('/img/foo.jpg')"` declarations across `src/content/{is,en}/**/*.njk` (e.g. `src/content/is/index.njk:10, 67, 84, 101, 118, 182`; `src/content/is/thjonusta/index.njk:10, 34`; `src/content/is/geirar/index.njk:10, 35`; `src/content/is/about/index.njk:10`; `src/content/is/verdreiknir/index.njk:10`; `src/content/is/greinar/index.njk:13, 26, 43`; `src/content/is/greinar/article.njk:15`; `src/content/is/404.njk:8`; mirror set in `src/content/en/`); `eleventy.config.js:72` passes through `src/img` raw.

There are **zero `<img>` tags** in any content template (verified). `_site/img/` ships the originals unprocessed: no AVIF, no WebP, no responsive widths, no `width`/`height` attributes, no `srcset`, no `<picture>` element in any output HTML.

The reference implementation at `/Users/olafur/Development/somethings/src/_includes/layouts/work.njk` and the home page `src/content/index.njk` use plain `<img>` tags exclusively — the working pattern.

`docs/architecture-deviations.md` §1 pre-accepts this deviation. The user's focus brief item #2 explicitly overrides that document: *"Image handling must use @11ty/eleventy-img exactly as the Somethings repo does … any other image pipeline is a finding."*

**Impact:** mobile users download multi-MB hero JPGs at native resolution. LCP, CLS, bandwidth all degraded. The plugin and its configuration are dead.

**Fix:** replace every `style="background-image: url('/img/...')"` with `<img src="..." alt="..." width="..." height="...">` and position the image via CSS (`object-fit: cover` on a sized frame, `position: absolute` for full-bleed hero). Once inline styles are gone, the `prefixInlineUrls` transform (H1) can be deleted. Move image paths in `_data/*.js` so the plugin can resolve them (currently `/img/foo.jpg` — root-anchored — works for passthrough but defeats the relative-from-markdown convention).

Cite: `FRAMEWORK-PORT-PROMPT.md` §"Images" line 576–577, §"Conventions" line 598 ("No `<picture>` written by hand. Use `<img>` and let the plugin transform"); focus brief item 2.

---

#### C3 — User-visible page copy hardcoded in `.njk` templates; no markdown content tree exists
*Source: code-reviewer + consistency-auditor + simplifier*
File(s): every template under `src/content/{is,en}/`. Representative locations:
- `src/content/is/index.njk:13–17, 24–28, 36–61, 71–80, 140–164, 170–187, 201–217, 227–232, 240–243`
- `src/content/is/thjonusta/index.njk:13–15, 23–28, 58–63, 72–75`
- `src/content/is/geirar/index.njk:13–15, 23–28, 57–62, 70–73`
- `src/content/is/about/index.njk:13–15, 23–31, 49–51, 67–70, 84–88, 97–100`
- `src/content/is/verdreiknir/index.njk:13–15, 23–30, 36–43, 50, 54–57, 62, 64–69, 72, 74–75, 80, 90–93`
- `src/content/is/greinar/index.njk:16–18, 33, 51, 62–65`
- `src/content/is/greinar/article.njk:18–20, 29, 32, 54–57`
- `src/content/is/404.njk:11–13, 20, 22–23`
- Full English mirror in `src/content/en/`

Quantified: 61 `[TBD — íslenska]` placeholder strings remain in Icelandic templates; 74 more in `src/_data/*.js`. No `.md` content files exist in the repo. The `i18n.js` dictionary covers ~40 chrome strings (nav, footer, button labels) but every section heading, paragraph, list item, label, badge, hero kicker, stat caption, signature block, customer-logo name, and CTA label is inlined in templates and/or stored as `[lang]`-keyed objects in `_data/*.js`.

`docs/architecture-deviations.md` §3 pre-accepts the no-Markdown deviation. The user's focus brief item #1 explicitly overrides: *"All content and microcontent must come from markdown + frontmatter. No hardcoded user-visible strings in .njk templates. UI strings belong in src/_data/i18n.js, page/section copy belongs in .md frontmatter or .md body. Any literal English/Icelandic text in templates is a finding."*

**Impact:** translation drift is silent (an edit to `is/index.njk` doesn't surface a missing parallel edit in `en/index.njk`); no editor surface for non-developers; the `eleventyComputed` title/description pattern in `FRAMEWORK-I18N.md:402–428` cannot operate; the `featured*` collections in `eleventy.config.js:151–165` cannot fire because there are no tagged entries to fire on (H5 below).

**Fix:** for each repeating shape (services, sectors, team, milestones, principles, articles), create `src/content/<collection>/<collection>.json` per `FRAMEWORK-I18N.md:173–193` and convert each entry to a parallel `.md` file in `src/content/{is,en}/<collection>/<slug>.md` with the same slug across locales. For singleton pages (home, about, thjonusta-listing, geirar-listing), move section copy into either a per-page `_data/<page>.js` (keyed by `[lang]`) or into per-locale frontmatter on a single page-layout `.njk`. Add the missing strings to `i18n.js` for any text that remains chrome.

Cite: `FRAMEWORK-I18N.md` §"Content authoring contract" line 396–436, §"Conventions and guardrails" line 507; `FRAMEWORK-PORT-PROMPT.md` §"Templates", §"Deliverables" line 638; focus brief item 1.

---

#### C4 — Mobile nav is functionally broken — selector mismatch
*Source: code-reviewer + consistency-auditor + simplifier + silent-failure-hunter*
File(s): `src/assets/js/mobileNav.js:2` queries `.site-header__toggle`; `src/_includes/partials/header.njk:18` renders `<button class="nav-toggle" …>`; `src/assets/css/nav.css` styles `.nav-toggle` (not `.site-header__toggle`).

The defensive query-then-bail pattern at `mobileNav.js:4` fires `if (!toggle || !nav) return;` on every page. The hamburger button has no click listener, no Escape handler, no `aria-expanded` flip. At `<64em` (`src/assets/css/nav.css:23`), the nav is `transform: translateX(100%)` — hidden off-screen. Combined: **no mobile or tablet user can reach Services, Sectors, Quote, About, Articles, or Contact**. The site is unusable on phones.

**Fix:** one-line edit at `mobileNav.js:2` to `document.querySelector(".nav-toggle")`. Verify with mobile-viewport emulation that the hamburger opens the nav, Escape closes, link-click closes. Consider adding focus management (move focus to first link on open, return to toggle on close).

Cite: `FRAMEWORK-PORT-PROMPT.md` §"Pattern for a JS feature module" line 406–419; focus brief item 7; `quality.md`.

---

#### C5 — Sitemap omits 9 of 10 articles per locale; only the `featured` article appears
*Source: code-reviewer*
File(s): `src/content/is/sitemap.njk:7–16`, `src/content/en/sitemap.njk:7–16`. Build output: `_site/sitemap.xml` ships 7 entries (home + 4 listing + verdreiknir + 1 article — `handover-report-contents`); `_site/en/sitemap.xml` mirrors with the same 1-article gap. The other 9 article URLs per locale exist on disk (e.g. `_site/greinar/ei-rating-explained/index.html`) but are absent from the sitemap.

Root cause: the sitemap iterates `collections.all`. Eleventy v3 pagination doesn't expose each paginated output as an independent entry in `collections.all` — the iteration sees the source template once. Only one of the 10 paginated entries surfaces.

**Impact:** Google won't discover 9 of 10 articles per locale via the sitemap — half the editorial content effectively invisible to search.

**Fix:** in each sitemap, iterate the `articles` data source directly to emit `/greinar/<article.slug>/` per article, in addition to looping `collections.all` filtered by lang prefix for singletons/listings. Or tag pages explicitly with `sitemap-is`/`sitemap-en` via directory data and iterate those tagged collections. After fix, each sitemap should contain 17 URLs.

Cite: `FRAMEWORK-I18N.md` §"Sitemap"; `quality.md`, `consistency.md`.

---

#### C6 — OG/Twitter meta attribute values unescaped on the primary fallback branch (filter-precedence bug)
*Source: code-reviewer + consistency-auditor + simplifier + silent-failure-hunter*
File(s): `src/_includes/partials/seo-meta.njk:1, 2, 4, 8, 12, 13, 15`; `src/_includes/layouts/base.njk:6` (same pattern in `<title>`)

Each line reads `{{ title or meta.byLocale[lang].title | escape }}`. Nunjucks filter binding is tighter than `or`; the expression parses as `title or (meta.byLocale[lang].title | escape)` — only the fallback is escaped. The primary `title`/`description`/`summary`/`ogImageAlt` arms ship raw into HTML attribute context.

Already exploitable today: `_data/services.js:14` has `en: "Fireproofing & passive fire sealing"`. The unescaped `&` ends up in `og:title content="Fireproofing & passive fire sealing"` — invalid HTML, may break some social parsers. Any future content with `"`, `<`, or `'` will break the attribute outright (e.g. `It's our specialty`).

**Fix:** parenthesize on every line: `{{ (title or meta.byLocale[lang].title) | escape }}`. Same fix at `seo-meta.njk:1, 2, 4, 8, 12, 13, 15` and `base.njk:6`.

Cite: `FRAMEWORK-PORT-PROMPT.md` §"seo-meta.njk"; focus brief item 4; `quality.md`.

---

#### C7 — `I18nPlugin errorMode: "never"` + bidirectional fallbackLocales suppress every missing-translation signal
*Source: silent-failure-hunter + consistency-auditor*
File(s): `eleventy.config.js:41–49`

Two compounding settings:
1. `errorMode: "never"` (line 43) — the spec at `FRAMEWORK-I18N.md:64, 92` mandates `"allow-fallback"`. The `"never"` setting silences every diagnostic the plugin would emit when `locale_url`/`locale_links` cannot resolve.
2. `fallbackLocales: { en: "is", is: "en", "*": "is" }` (line 48) — spec example at `FRAMEWORK-I18N.md:71` is `{ en: "is" }` only. The reverse rung `is: "en"` means a missing Icelandic UI string silently renders English on Icelandic pages — exactly the failure mode `FRAMEWORK-I18N.md:519` ("no English chrome on Icelandic pages or vice versa") is meant to prevent.

Compounding effects:
- The hand-rolled `t` filter (`eleventy.config.js:55–64`) has its own three-step fallback `entry[lang] ?? entry.is ?? entry.en ?? key` — adding a third layer of silent fallback.
- No template uses the plugin's `i18n` filter directly, so the plugin churns through translation lookups producing warnings that are never surfaced.

**Impact:** with 61 `[TBD — íslenska]` placeholders still in the repo (C8), the safety net that should warn at build time is fully muted. A typo'd key returns the key string verbatim in production (H13).

**Fix:** set `errorMode: "allow-fallback"`; reduce `fallbackLocales` to `{ en: "is" }` and remove the `is: "en"` and `"*": "is"` rules. Decide whether the hand-rolled `t` filter is still needed once the plugin is configured correctly (see C9).

Cite: `FRAMEWORK-I18N.md` §"Config additions" line 64–72; `quality.md`.

---

#### C8 — Literal `[TBD — íslenska]` placeholder strings ship to users
*Source: silent-failure-hunter*
File(s): 61 occurrences in `src/content/is/**/*.njk`; 74 occurrences in `src/_data/{articles,services,sectors,team,principles,milestones,meta}.js`. Examples:
- `src/_data/meta.js:4` — IS site `description` is the literal string `"[TBD — íslensk lýsing] Vottuð brunaþéttingar og tæknieinangrun á Íslandi."` — ships into `<title>`, `<meta name="description">`, `og:title`, `og:description`, Twitter cards, and the WebSite JSON-LD on every Icelandic page.
- `src/content/is/greinar/article.njk:32` — every IS article body renders the literal string `[TBD — íslensk grein í vinnslu.]`.
- `src/_data/articles.js` — 9 of 10 IS titles are `[TBD — íslenska] Munurinn á EI 60…` etc.

**Impact:** users browsing the Icelandic site read `[TBD — íslenska]` as final copy on the home page, about page, services page, sectors page, every article, and in meta tags. No build-time check fails. The IS site is half-published.

**Fix:** add a build-time grep that fails CI if `_site/**/*.html` contains the substring `[TBD`. Decide per-string whether to (a) translate, (b) render the English fallback with `lang="en"` markup, or (c) hide via a `draft: true` frontmatter flag the layout respects.

Cite: `quality.md`; ties to C3 (move content to markdown so drafts can be marked) and C7 (allow the plugin to surface gaps).

---

#### C9 — `eleventy-plugin-i18n` version mismatch + dual-mechanism translation filter
*Source: code-reviewer + consistency-auditor + simplifier*
File(s): `package.json:15` declares `"eleventy-plugin-i18n": "^0.1.3"`; `FRAMEWORK-I18N.md:40` mandates `"^1.0.1"`. `eleventy.config.js:46–49` registers the plugin (its `i18n` filter); `eleventy.config.js:55–64` registers a hand-rolled `t` filter. Every template uses `| t`; nothing uses `| i18n`.

The comment at `eleventy.config.js:52–54` admits the cause: *"The plugin's URL-prefix detection breaks for the Icelandic-at-root tree and for layout/partial render contexts where `this.page.url` doesn't reflect the current page."* Two mechanisms for one job; the plugin is dead weight that consumes the `translations` object only to emit fallback warnings the `errorMode: "never"` then suppresses.

Worse: `interpolate()` at `eleventy.config.js:66–68` is only reachable from `t` when a second `data` argument is passed. Grep shows zero callsites pass a second argument — the entire interpolation branch is dead today.

**Fix:** bump `eleventy-plugin-i18n` to `^1.0.1` (the spec version). Test whether the upstream `i18n` filter, called as `{{ "key" | i18n(lang) }}` with `lang` passed explicitly from the cascade, resolves correctly for IS-at-root URLs. If yes: delete the `t` wrapper, the dead `interpolate` helper, and migrate all templates to `| i18n(lang)`. If no: keep `t` but document the specific reproducible failure in the comment, drop the `i18n` plugin registration, and let `t` be the single mechanism. Pick one.

Cite: `FRAMEWORK-I18N.md` §"Add: eleventy-plugin-i18n" lines 31–43, §"UI string dictionary" lines 198–229; `simplicity.md`, `consistency.md`, `reusability.md`.

---

#### C10 — `alternateUrl` filter bypasses `locale_links`/`locale_url`; emits hreflang and language-switch links to pages that may not exist in the other locale
*Source: code-reviewer + consistency-auditor + simplifier + silent-failure-hunter*
File(s): `eleventy.config.js:121–127` (filter definition with self-admitting comment lines 116–120); used at `src/_includes/layouts/base.njk:13–14` (hreflang `<link>`s), `src/_includes/partials/utility-bar.njk:13` (language toggle).

The spec at `FRAMEWORK-I18N.md:319–347` mandates `locale_url` + `locale_links`. `locale_links` returns only languages where the current page actually exists in the other locale — `FRAMEWORK-I18N.md:347` is explicit: *"never offer a switch that leads to a 404"*.

The implementation replaces both with a deterministic string-swap (`/en/foo` ↔ `/foo`). Practical impact today is zero — every page exists in both locales. The latent failure is the first single-locale page (an Icelandic-only news item, a draft article still in English). When that arrives:
- The hreflang `<link rel="alternate">` emitted from `base.njk:13–14` points at a non-existent URL — a soft-404 signal to Google.
- The language-switcher link sends the user from the IS page to a 404 on the EN side.

Root cause of the workaround is upstream: commit `51d2d9b` "Fix language switcher exploding on paginated article pages" — the underlying issue with `locale_links` on paginated content is likely traceable to the absence of parallel `.md` files (C3) which would let `locale_links` pair entries by slug.

**Fix:** validate whether the upstream `locale_url(otherLang)` resolves correctly once C3 is acted on and the article pagination becomes one `.md` per article. If yes, replace `alternateUrl` with `locale_url(otherLang)` and delete the custom filter. If the upstream filter still misbehaves, build a per-page paired-URL collection in `eleventy.config.js` keyed by slug, with an explicit existence check before emitting hreflang.

Cite: `FRAMEWORK-I18N.md` §"Language switcher partial" line 319–347, §"Conventions and guardrails" line 511; `quality.md`.

---

### High

#### H1 — `prefixInlineUrls` transform exists only because inline styles violate the spec
*Source: code-reviewer + consistency-auditor + simplifier + silent-failure-hunter*
File(s): `eleventy.config.js:19–30`

The transform regex-replaces `style="…url(…)…"` to prepend `/bruna-is/`. It only exists because every hero/card/portrait uses `<div class="bg" style="background-image: url('/img/foo.jpg')">` — directly violating `FRAMEWORK-PORT-PROMPT.md` §"Conventions" line 595 (*"No inline styles or `<style>` blocks in templates"*). The regex has silent failure paths: only matches double-quoted `style="..."`; only matches one `url(` per attribute; doesn't fire on non-`.html` outputs; if any `style` attribute ever contains two `url(...)` declarations, the inner replace operates on the whole capture and may double-encode or skip.

Today the templates happen to use only one `url(` per inline style, double-quoted; the transform works by accident. Tomorrow a second `url(` (a `border-image`, a CSS variable referencing a URL) silently breaks the prefix rewrite. Production renders a missing image at `https://brunathettingar.github.io/img/foo.jpg` (404), with no diagnostic.

**Fix:** delete the transform after acting on C2. Until then, document the regex's exact tolerated input shape in the comment so a future contributor doesn't add a second `url(` accidentally.

Cite: `simplicity.md`, `maintainability.md`; focus brief item 4.

---

#### H2 — CSS load order violates spec; `layout.css` missing; per-section split absent
*Source: code-reviewer + consistency-auditor*
File(s): `src/_includes/layouts/base.njk:19–24`. Loaded: `tokens.css → reset.css → main.css → nav.css → responsive.css`. Spec at `FRAMEWORK-PORT-PROMPT.md:131, 559` mandates `tokens.css → reset.css → layout.css → nav.css → main.css → per-section`. **`layout.css` does not exist.** `main.css` is a single 1,500-line file holding page chrome (page-wrapper grid, container, footer skeleton, breadcrumb, skip-link) mixed in with section-specific styles (home pillars, services, sectors, articles, quoter, etc.). All responsive overrides live in a trailing `responsive.css` as a `@media (max-width: 63.999em)` block instead of being mobile-first within each section.

Reference implementation `/Users/olafur/Development/somethings/src/assets/css/` ships 11 split files: `tokens, reset, layout, nav, main, about, works, work-detail, home, projects, writing`.

**Fix:** create `src/assets/css/layout.css` for page chrome; reorder `base.njk` load chain to `tokens → reset → layout → nav → main → per-section`; split `main.css` along section boundaries (`home.css`, `services.css`, `sectors.css`, `articles.css`, `about.css`, `quoter.css`, `cta-band.css`, `value-band.css`). Inline each section's responsive rules into its own file; `responsive.css` disappears.

Cite: `FRAMEWORK-PORT-PROMPT.md` §"base.njk" line 198, §"CSS structure" line 559; focus brief item 5.

---

#### H3 — `main.css` redeclares `:root` token block; ~50 raw hex, ~37 raw `rgba()`, ~450–491 raw `px` outside `tokens.css`
*Source: code-reviewer + consistency-auditor*
File(s): `src/assets/css/main.css:6–24` declares a second `:root { --bg, --bg-soft, --text, --muted, --accent, --accent-dark, --brand-blue, … }` with literal values — a copy of tokens already in `tokens.css:17–32, 44–45`. Cascade order decides which wins; the duplicate is a latent drift risk. Body of `main.css` has hundreds of raw declarations:
- `:30` `max-width: 1280px`
- `:36–53` `.mockup-note` block with `#fff8e6`, `#e8d68a`, `font-size: 11px`, `padding: 4px 10px`, `border-radius: 999px` — also a stale debug element (M21)
- `:60` `font-size: 12.5px`
- `:78–80, 99–104, 111, 128, 143–146, 156, 165, 169–172, 181, 191–192, 199, …` — pervasive

`docs/architecture-deviations.md` §2 pre-accepts this. Focus brief item 4 overrides.

**Fix:** delete the duplicate `:root` block in `main.css`. Substitute raw values to tokens throughout. Where no token exists, add one to `tokens.css`. Combine with H2's section split for a cleaner restructure.

Cite: `FRAMEWORK-PORT-PROMPT.md` §"tokens.css" line 352 ("Downstream CSS must reference tokens — no raw hex codes, no magic px values, outside this file"); focus brief item 4; `consistency.md`, `maintainability.md`.

---

#### H4 — `breadcrumb.njk` partial is dead code; every page hand-rolls crumbs with hardcoded "Heim"/"Home" labels
*Source: code-reviewer + consistency-auditor*
File(s): `src/_includes/partials/breadcrumb.njk:1` calls `eleventyNavigationBreadcrumb(eleventyNavigation.key, …)` — returns crumbs only if a `parent` chain is wired. **No page sets `eleventyNavigation.parent`** (every page has only `key` + `order`; verified across `src/content/is/{index,about/index,thjonusta/index,geirar/index,verdreiknir/index,greinar/index}.njk`). The partial outputs nothing. Meanwhile every page inlines its own `<div class="crumbs"><a href="/">Heim</a> &nbsp;/&nbsp; <span>Þjónusta</span></div>` with hardcoded labels (contributes to C3). Two breadcrumb mechanisms; neither is the one the spec describes; no `BreadcrumbList` JSON-LD is emitted.

**Fix:** wire `eleventyNavigation: { parent: "<key>" }` on detail-type pages (article detail, future service/sector detail) and consume the partial; or commit to the inline approach and delete the partial. Either way: emit `BreadcrumbList` JSON-LD per page with `jsonEscape` on the labels.

Cite: `FRAMEWORK-PORT-PROMPT.md` §"breadcrumb.njk"; `FRAMEWORK-DOCS.md` §"Breadcrumb pattern"; `scope-discipline.md`.

---

#### H5 — `featuredServices{Is,En}` / `featuredSectors{Is,En}` collections and `where`/`sortBy` filters are dead code
*Source: code-reviewer + consistency-auditor + simplifier*
File(s): `eleventy.config.js:100–114` (filters); `eleventy.config.js:151–165` (collections). Collections call `getFilteredByTag("services-is")` etc. — no source file in the repo carries those tags (consequence of C3: no markdown collection entries exist). Filters return `[]`. No template references the collections or filters. 25+ lines of dead config.

**Fix:** either implement collections properly by acting on C3 (entries tagged `services-is`/`services-en` with `featured: true`) — at which point the home page's hardcoded pillar cards in `src/content/is/index.njk:65–132` and EN mirror collapse to a `{% for s in collections.featuredServicesIs %}` loop — or delete the four collection registrations and the two unused filters.

Cite: `scope-discipline.md`, `simplicity.md`; `FRAMEWORK-I18N.md` §"Permalink strategy".

---

#### H6 — Footer phone and email are not anchor elements; address line includes untranslated "Ísland" on EN
*Source: code-reviewer*
File(s): `src/_includes/partials/footer.njk:30–32`
```
<li>(+354) 850-4405</li>
<li>bruna@bruna.is</li>
<li>105 Reykjavík, Ísland</li>
```

`utility-bar.njk:10–11` wraps the same data correctly as `<a href="tel:...">` and `<a href="mailto:...">`. The footer doesn't. "Ísland" stays in IS on EN pages.

**Fix:** wrap phone/email in anchor tags; move "Ísland"/"Iceland" to `i18n.js` as `address.country` or to `meta.byLocale[lang].addressCountry`.

Cite: `FRAMEWORK-PORT-PROMPT.md` §"Templates" line 571; `consistency.md`.

---

#### H7 — `Organization` JSON-LD `logo` points at non-existent `og-default.jpg`; phone format inconsistent across 3 locations
*Source: code-reviewer*
File(s): `src/_includes/partials/schema-organization.njk:8` (`"logo": "{{ meta.url }}/assets/img/og-default.jpg"`), `:10` (`"telephone": "+354-850-4405"`); also `src/_data/meta.js:22` and `src/_includes/partials/utility-bar.njk:10`.

Three phone encodings: `+354-850-4405` (JSON-LD), `(+354) 850-4405` (display in utility-bar + footer), `+3548504405` (tel: link). Schema.org `telephone` recommends E.164: `+3548504405`. The logo URL points at `og-default.jpg` which doesn't exist (M6).

**Fix:** add a real `src/assets/img/logo.svg`. Use E.164 `+3548504405` in JSON-LD; keep human-readable form in display. Unify the three encodings via a `meta.contact.phone.e164` and `meta.contact.phone.display`.

Cite: `FRAMEWORK-DOCS.md` §"Schema.org — Organization"; `consistency.md`, `quality.md`.

---

#### H8 — `Article` JSON-LD missing `mainEntityOfPage` and `dateModified`
*Source: code-reviewer*
File(s): `src/content/is/greinar/article.njk:37–48`, mirror at `src/content/en/greinar/article.njk:37–48`. Required Google rich-results fields absent. Also `meta.url` doesn't pass through `jsonEscape` on lines that interpolate it (cosmetic — `meta.url` is a constant, but the rule from focus brief item 4 is absolute).

**Fix:** add `"mainEntityOfPage": "{{ meta.url }}{{ page.url }}"` and `"dateModified": "{{ article.date | dateIso }}"` to each JSON-LD block. Pass `meta.url` through `jsonEscape` for consistency.

Cite: `FRAMEWORK-DOCS.md` §"Schema.org — Article"; `FRAMEWORK-I18N.md` §"JSON-LD per page" line 471–485; focus brief item 4.

---

#### H9 — Two language-switcher implementations exist; one is dead
*Source: consistency-auditor + simplifier*
File(s): per current working tree, `src/_includes/partials/language-switcher.njk` was tracked in git index but is no longer present in the working tree (it was removed since the last commit but the index hasn't been updated; `git ls-files src/_includes/partials/` and `ls src/_includes/partials/` disagree). The live switcher is inline in `src/_includes/partials/utility-bar.njk:12–15`.

Even with the partial removed from the working tree, the inline switcher still uses `alternateUrl` (C10) and ships a hand-rolled set of `<a>` tags instead of consuming `locale_links`.

**Fix:** clean up the index/working-tree disagreement (`git rm` the partial if it should be gone, or restore it from the index if it should stay). Decide on one mechanism and remove the other. Recommended: consume `locale_links` per `FRAMEWORK-I18N.md:319–343`.

Cite: `reusability.md`, `simplicity.md`; `FRAMEWORK-I18N.md` §"Language switcher partial".

---

#### H10 — Quote calculator shows fake success on submit; mailto handler has multiple silent failure modes
*Source: silent-failure-hunter*
File(s): `src/assets/js/quoteCalculator.js:288–300`

```js
window.location.href = mailto;
…
banner.classList.add("show");   // success banner shown unconditionally
banner.scrollIntoView(…);
```

Three silent failure paths:
1. No mail client registered (mobile, locked-down corporate desktops) — `window.location.href = "mailto:..."` either does nothing, navigates to an error, or opens a system dialog. Success banner shows regardless; no email sent.
2. Body exceeds mailto URL limits (~2 KB on Outlook web, ~32 KB on Gmail web). With many rows or long notes, the body is silently truncated.
3. No JS-side validation beyond the HTML `required` attribute; with JS validation bypassed, an empty form shows a success banner.

**Fix:** the underlying constraint is real (static site, no backend). Mitigations:
- Cap notes length (e.g. 800 chars) and number of mailto-encoded rows (e.g. 8 + "+N more").
- Open `mailto:` via `<a target="_blank">` rather than `window.location.href` so page state doesn't reset on failure.
- Only show the success banner if the form was submitted via a fallback `<form action="mailto:" enctype="text/plain">` post — at least the browser confirms a client was invoked.
- Long-term: introduce a serverless endpoint (Netlify Forms, GitHub Issue API, etc.) — `FRAMEWORK-PORT-PROMPT.md` doesn't require this but flags forms as the natural exit point of the static stack.

Cite: `quality.md`; `FRAMEWORK-PORT-PROMPT.md` §"Templates".

---

#### H11 — Article pagination `eleventyComputed.title` reads `article.title.is` without null guard
*Source: silent-failure-hunter*
File(s): `src/content/is/greinar/article.njk:8–10`, `src/content/en/greinar/article.njk:8–10`

If a future entry omits `title.is`, the failure mode is "Cannot read properties of undefined" or — in some Eleventy-computed contexts — `undefined` rendered as the literal string `undefined` into `<title>`, OG title, and JSON-LD `headline`. Today every article carries both keys, so this is latent. Compounds with C7 (errorMode never) and C3 (no schema enforcement) — the safety nets are all suppressed.

**Fix:** access via `(article.title || {})[lang] || article.title.is || article.title.en || ""` — or migrate to per-locale `.md` files (C3) so the cascade enforces presence.

Cite: `quality.md`; `FRAMEWORK-I18N.md` §"Content authoring contract".

---

#### H12 — Hand-rolled `interpolate()` silently returns literal `{{ name }}` on missing data key
*Source: silent-failure-hunter*
File(s): `eleventy.config.js:66–68`

```js
return String(str).replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k) => data?.[k] ?? m);
```

If a translation key uses `{{name}}` placeholder and the caller forgets `name` in the data object, the rendered output is the literal `{{name}}` visible in the page. No warning. Latent today — no `i18n.js` entry currently uses `{{…}}` placeholders — but the first author who adds one will publish a broken UI string without signal.

**Fix:** throw or `console.warn` (in dev) when a placeholder key is missing from `data`. Or remove the helper until a real callsite needs it (L6).

Cite: `quality.md`.

---

#### H13 — `t` filter silently emits the bare lookup key on missing entry
*Source: silent-failure-hunter*
File(s): `eleventy.config.js:55–64`

```js
const entry = translations[key];
if (!entry) return key;
```

`{{ "nav.contat" | t }}` (typo) renders `nav.contat` verbatim. No build-time check. The fallback chain at line 63 also silently picks the opposite-language string when the current locale's value is missing.

**Fix:** in dev mode, throw on missing key; in prod, render `key` but also `console.error` to a build-collected list so missing keys surface in CI. Bonus: emit a JSON manifest of fallback usages per build for translator audits.

Cite: `quality.md`.

---

#### H14 — Inline `<svg>` icons hand-rolled and duplicated across both locale homes; observable drift
*Source: simplifier*
File(s): `src/content/is/index.njk:68, 85, 102, 119, 200–218`; `src/content/en/index.njk:` matching line ranges

Sector and pillar icons are duplicated inline SVG markup between the two locale homes. The simplifier found drift: the EN versions added extra `<rect>` and `<path>` children that the IS versions don't have.

**Fix:** extract each icon to its own `partials/icons/<name>.njk` and include with a one-liner; or move icons into the data files (`sectors.js` already has `image` paths — extend with `icon` strings).

Cite: `reusability.md`, `simplicity.md`.

---

#### H15 — Home page "pillars" block hardcodes content that should iterate from `services` data
*Source: simplifier*
File(s): `src/content/is/index.njk:63–133`; `src/content/en/index.njk:` matching range; `src/_data/services.js`

`services.js` has 7 bilingual services. The home page hardcodes 4 "pillar" cards as duplicate markup with **divergent copy** (`is/index.njk:71` "Brunaþéttingar og lausnir" vs `services.js[0].title.is` "Brunaþéttingar og óvirkar brunavarnir"). Adding `featured: true` to four entries and looping replaces ~70 lines per locale with one loop.

**Fix:** mark four services as `featured: true`, add a `featuredServices` custom collection (H5 already has the four dead ones — wire one up properly), and replace the home pillar markup with a `{% for s in collections.featuredServicesIs %}` loop. Solves part of H5 simultaneously.

Cite: `reusability.md`, `maintainability.md`; `FRAMEWORK-PORT-PROMPT.md` §"Custom collections".

---

#### H16 — Page templates `is/*.njk` and `en/*.njk` are 90% copy-paste; ~1,500 lines duplicated
*Source: simplifier*
File(s): `src/content/{is,en}/{index,about/index,thjonusta/index,geirar/index,greinar/index,greinar/article,verdreiknir/index,404,sitemap}.njk`

Quantified: `is/index.njk` (247 lines) vs `en/index.njk` (257 lines) are ~95% identical structure. Every structural change requires editing both files. The icon SVGs are also duplicated. The hand-translated copy in each file defeats `i18n.js` entirely — only nav labels and a few CTAs route through the dictionary.

**Fix:** the spec's prescribed path is parallel `.md` files per locale (C3) consumed by a single layout. Failing that, move page bodies to `_data/<page>.js` keyed by `[lang]` (same pattern as `services`/`sectors`/`articles`) and reduce each page pair to one `.njk` that reads from the data.

Cite: `reusability.md`, `maintainability.md`; `FRAMEWORK-I18N.md` §"Content authoring contract".

---

#### H17 — `addPassthroughCopy("src/img")` overlaps with `eleventy-img`; passthrough wins for every CSS-background reference
*Source: silent-failure-hunter*
File(s): `eleventy.config.js:32–39` (plugin), `:72` (passthrough)

Both systems are active. With zero `<img>` tags (C2), the plugin never fires; the passthrough delivers raw originals to `/img/` in the output. There's no warning or log that the optimizer is idle. Anyone reading the config assumes optimization is happening.

**Fix:** resolves with C2. Once images move to `<img>` tags, the plugin emits optimized variants and the raw `/img/` copy can be either left (as a fallback) or scoped down to only assets the plugin doesn't handle (SVG, favicons).

Cite: `quality.md`.

---

#### H18 — IS `meta.byLocale.is.description` is a `[TBD]` placeholder; ships into every Icelandic page's metadata
*Source: consistency-auditor*
File(s): `src/_data/meta.js:4`

```js
description: "[TBD — íslensk lýsing] Vottuð brunaþéttingar og tæknieinangrun á Íslandi.",
```

Ends up in `<title>`, `<meta name="description">`, `og:description`, `twitter:description`, and the WebSite JSON-LD `description` property on every Icelandic page. The most prominent SEO field on the primary-language site is a placeholder.

**Fix:** write the production IS description and the production EN description. Subset of C8.

Cite: `FRAMEWORK-I18N.md` §"Per-locale site metadata"; `quality.md`.

---

### Medium

#### M1 — Inline SVG `<text>` `fill` attributes use raw hex; bypass `--accent` / `--brand-blue` tokens
File: `src/_includes/partials/header.njk:5` (`fill="#ee7c1d"`), `:6` (`fill="#1453a8"`). Tokens already exist (`tokens.css:27, 30`). SVG attribute `fill` doesn't resolve CSS custom properties; either set via class + CSS rule (`.bruna { fill: var(--accent); }`) or accept the duplication. Fix the former.

#### M2 — `og:image:alt` chain drops `title` from the fallback ladder
File: `src/_includes/partials/seo-meta.njk:8, 15`. Spec template at `FRAMEWORK-PORT-PROMPT.md:290, 298` includes `title`. Implementation: `{{ ogImageAlt or meta.byLocale[lang].ogImageAlt | escape }}`. Article pages without explicit `ogImageAlt` fall through directly to the site default — generic alt text on every article. Fix: `{{ (ogImageAlt or title or meta.byLocale[lang].ogImageAlt) | escape }}` (combines with C6).

#### M3 — `<meta name="description">` chain inconsistent with OG/Twitter description chain
File: `src/_includes/layouts/base.njk:7` uses `description or meta.byLocale[lang].description`; `src/_includes/partials/seo-meta.njk:2, 13` use `description or summary or meta.byLocale[lang].description`. A page that sets only `summary` gets summary for OG/Twitter but a different `<meta description>`. Fix: pick one chain and use it in both places.

#### M4 — `meta.url` fuses origin and pathPrefix
File: `src/_data/meta.js:21` — `"https://brunathettingar.github.io/bruna-is"`. Combined with `eleventy.config.js:169` (`pathPrefix: "/bruna-is/"`) and `eleventy.config.js:21` (hardcoded `"/bruna-is"` in the transform), the project subpath lives in three places. Future custom-domain migration requires editing all three. Fix: split `meta.origin` and `meta.pathPrefix`; compose canonical/OG/JSON-LD URLs from both, or read `pathPrefix` from `eleventyConfig.pathPrefix`.

#### M5 — Footer link `'/about/#stefna' | locale_url` — fragment behavior under `locale_url` is unverified
File: `src/_includes/partials/footer.njk:23`. Whether `locale_url` preserves, urlencodes, or strips the `#stefna` fragment is not asserted. Inspect `_site/en/index.html` for the rendered href; if the fragment is dropped or urlencoded to `%23`, anchor navigation breaks on EN. Fix: build conditional links per lang explicitly, or split URL + fragment.

#### M6 — `og-default.jpg` and `favicon.svg` referenced but neither exists in `src/assets/img/`
Files: `src/_data/meta.js:22` (`ogImage`), `src/_includes/layouts/base.njk:8` (favicon `<link>`), `src/_includes/partials/schema-organization.njk:8` (`logo`). `src/assets/img/` is empty. Every social-share fetches a 404; site has no favicon. Fix: add `og-default.jpg` (1200×630), `favicon.svg`, and a real `logo.svg`.

#### M7 — SVG `<defs>` block is emitted only from `header.njk`; `footer.njk` `<use href="#logo-wordmark"/>` depends implicitly on render order
Files: `src/_includes/partials/header.njk:2–9`, `src/_includes/partials/footer.njk:6`. Works today because `page.njk` includes header before footer. A future layout that omits the header silently renders a blank footer logo with no error. Fix: move `<defs>` to `partials/svg-defs.njk` included from `base.njk`, or use an external sprite at `/assets/img/sprite.svg`.

#### M8 — `<html lang>` has a fallback (`lang or 'is'`) but `meta.byLocale[lang]` accesses elsewhere don't
Files: `src/_includes/layouts/base.njk:2` falls back; `:6, 7, 31, 33` don't. Inconsistent. Today every page sets `lang` via `is.11tydata.js`/`en.11tydata.js`. A future content file dropped outside the `is/`/`en/` trees silently renders Icelandic. Fix: either fall back consistently, or throw at build when `lang` is unset on an HTML output.

#### M9 — Two parallel nav-membership mechanisms (per-page `eleventyNavigation.key` suffix + URL-prefix collection filter)
File: `eleventy.config.js:129–149`. The `navIs`/`navEn` collections filter by URL prefix; the per-page `eleventyNavigation.key` values (`home-is`, `services-is`, …) aren't consulted for nav membership. Keys are also useful for `eleventyNavigationBreadcrumb` (H4) but that's unused. The per-page keys are decorative; remove or document.

#### M10 — Mailto URL length not bounded; success banner shown unconditionally
File: `src/assets/js/quoteCalculator.js:288–300`. Covered in detail at H10. Listed here at Medium for the URL-length-cap subset (Critical-tier behavior covered at H10).

#### M11 — `brand.tagline` dictionary value contains presentational `<br>` HTML
File: `src/_data/i18n.js:19` — `"brand.tagline": { is: "Mannvirki<br>á Íslandi", en: "Buildings<br>in Iceland" }`. Used at `header.njk:16` and `footer.njk:7` with `| safe`. Content-vs-presentation muddled; translation cost. Fix: split into two dictionary keys (`brand.tagline.line1`, `brand.tagline.line2`) and emit `<br>` in the template, or wrap each line in a `<span class="brand-tagline__line">` and use CSS `display: block`.

#### M12 — `eleventy-plugin-i18n` version drift from spec
File: `package.json:15` — `"^0.1.3"`; spec mandates `"^1.0.1"`. Listed here at Medium for the version-bump subset; the dual-mechanism issue is at C9.

#### M13 — Project subpath `/bruna-is/` hardcoded in 3 places
Files: `eleventy.config.js:21, 169` and `src/_data/meta.js:21`. Same magic string in three locations; future deploy-target change requires editing three files. Fix: centralize in one place (export from `meta.js`, read from `eleventy.config.js`).

#### M14 — Sector cards link to `/thjonusta/` (services index), not to sector detail pages
Files: `src/content/is/geirar/index.njk:34`, `src/content/en/geirar/index.njk:34`. Every sector card sends users to the services listing. Should resolve once C3 (markdown collections) is acted on — each sector becomes a `.md` with its own permalink.

#### M15 — Service entries carry `slug:` fields but no service-detail pages are generated
File: `src/_data/services.js:5, 43, 78, 108, 135, 162, 189`. Dead frontmatter; the `<a class="more">Skoða þjónustu →</a>` in listing pages is a text span not a hyperlink. Same root cause as M14.

#### M16 — Reset rules duplicated between `reset.css` and `main.css`
Files: `src/assets/css/reset.css:1–19` and `src/assets/css/main.css:26–39`. Two reset systems run in series; the second wins because of load order; the first is effectively shadowed. Fix: delete the duplicated rules in `main.css`.

#### M17 — Footer year literal "© 2026" — will be wrong in 2027
File: `src/_includes/partials/footer.njk:37`. Fix: compute from build date via Nunjucks `{% set year = "" | date("Y") %}` or expose via global data.

#### M18 — `bodyClass` indirection in `page.njk` has zero callers
File: `src/_includes/layouts/page.njk:12–18`. No page in the source tree sets `bodyClass`. Three lines of premature parameterization. Fix: delete or use it.

#### M19 — Class naming is non-BEM throughout `main.css`; mixed with BEM in `nav.css`/`breadcrumb.njk`
Examples: `.row`, `.col`, `.pic`, `.ico`, `.body`, `.bg`, `.scrim`, `.crumbs`, `.label`, `.lead`, `.tag`, `.utility .left`, `.utility .right`. Inherited from the mockup CSS without renaming. Spec at `FRAMEWORK-PORT-PROMPT.md` §"CSS structure" mandates BEM. Generic class names reused across components are the source of cascade-collision pain. Fix: progressively rename to `.utility-bar`, `.pillar__media`, `.pillar__body`, etc. as part of the per-section CSS split (H2).

#### M20 — `permalink: data => …` function in `is.11tydata.js`/`en.11tydata.js` reinvents Eleventy's declarative permalink
File: `src/content/{is,en}/{is,en}.11tydata.js`. The function exists to honor a frontmatter-provided `permalink` override, but only `404.njk` and `sitemap.njk` need that override (and they already set explicit permalinks). The two `*.11tydata.js` files differ only in `is`↔`en` substitutions. Fix: use the spec's declarative template string form (`FRAMEWORK-I18N.md:144–162`) and add explicit `permalink:` to the two pages that need overrides.

#### M21 — `.mockup-note` CSS rule shipped but no template references the class
File: `src/assets/css/main.css:46–53`. Dead CSS, ships to every visitor. Fix: delete.

#### M22 — Inline styles broadly violate `FRAMEWORK-PORT-PROMPT.md` §"Conventions"
Beyond the 34+ `background-image` occurrences (C2): `src/_includes/partials/header.njk:2` (`style="position:absolute"` on the SVG defs container), `src/_includes/partials/footer.njk:5` (`style="margin-bottom: 22px;"` on the footer brand anchor). Move to CSS rules.

#### M23 — `breadcrumb.njk` partial prepends a Home link the spec template doesn't include
File: `src/_includes/partials/breadcrumb.njk:5`. The Eleventy navigation breadcrumb already starts from the page's ancestor chain; the prepended Home is duplicate work. Either match the spec or document the deviation.

#### M24 — Sitemap `collections.all` filter relies on the heuristic `not page.url.startsWith("/en/")`
Files: `src/content/is/sitemap.njk:9`, `src/content/en/sitemap.njk:9`. Safe today because no Icelandic permalink begins with `/en…`. Fragile: a hypothetical IS page at `/enska/` would still be excluded by the prefix, but the heuristic is the wrong shape. Fix: filter by `page.data.lang` (set via the directory data files) instead of by URL prefix.

---

### Low

#### L1 — `dateIso` and `dateDisplay` filters crash / render "Invalid Date" if `date` is missing
File: `eleventy.config.js:78–88`. `new Date(undefined).toISOString()` throws; `new Date(undefined).toLocaleDateString(...)` returns `"Invalid Date"`. Today every paged page has a date so OK; one future missing frontmatter date crashes the build (or renders the literal "Invalid Date"). Fix: guard.

#### L2 — `jsonEscape` filter handles non-string inputs by coercion; no functional issue, just noted for completeness
File: `eleventy.config.js:90–98`.

#### L3 — `startsWith` filter defined but unused
File: `eleventy.config.js:112–114`. Sitemap templates call `page.url.startsWith("/en/")` directly via Nunjucks string-method call (non-idiomatic but works). Delete the filter or use it.

#### L4 — Stylistic inconsistencies in `_data/*.js` (trailing-comma conventions, `entries` const vs direct `export default [...]`)
Files: `_data/articles.js, services.js, sectors.js, team.js, principles.js, milestones.js`. All use the `entries` const pattern — fine, just consistent at file boundary, not the world.

#### L5 — Quote calculator pricing constants live in `quoteCalculator.js` (not `i18n.js`, not `_data/`)
File: `src/assets/js/quoteCalculator.js:4–51`. Not translatable; flagged for the option of moving them to `_data/quote-config.js` so non-developers can tune base prices.

#### L6 — `interpolate()` helper at `eleventy.config.js:66–68` is dead today
No template passes the optional second argument to `t`. Either remove until first real callsite, or add a callsite first.

#### L7 — `is.11tydata.js` and `en.11tydata.js` differ only in two string literals
Files: `src/content/is/is.11tydata.js`, `src/content/en/en.11tydata.js`. Combine via a shared helper, or use the spec's directory-data approach (M20).

#### L8 — `og:locale` ternary via Nunjucks `and`/`or` pattern in three places
Files: `seo-meta.njk:9`, `base.njk:11, 14`, `header.njk:1`. Works for two locales; a third locale requires editing each site. Fix: expose `meta.byLocale[lang].ogLocale` from `_data/meta.js`.

#### L9 — Empty sitemap renders silently when the filter excludes everything
Files: `src/content/{is,en}/sitemap.njk`. No assertion that at least N URLs were emitted. Fix: build-time assertion (Test Gap T1).

#### L10 — `HtmlBasePlugin` registered but not in spec template
File: `eleventy.config.js:13`. Reasonable for a GH Pages subpath deployment but a deviation from the verbatim Part A scaffold. Document at the call-site.

#### L11 — `quoteCalculator.js` initial render seeds two rows by calling `addRow()` twice without batching `recalc`
File: `src/assets/js/quoteCalculator.js:303–304`. Cosmetic; negligible.

---

### Test Gaps

#### T1 — No automated checks; framework spec doesn't require a test suite but the surface that's been built warrants smoke tests
A build-time `scripts/check-build.js` would have caught five of the six Critical findings. Suggested assertions:

- **(C1)** Grep `_site/**/*.html` for `{{` or `}}`; fail if any matches. Would have caught the literal-Nunjucks `og:image`.
- **(C5)** Count `<url>` entries in each `_site/**/sitemap.xml`; assert ≥ N matching the number of `_site/**/index.html` files in the corresponding locale tree.
- **(C4)** A pre-build JS test that loads `header.njk` and `mobileNav.js`, queries the selector the JS expects, and asserts at least one element matches.
- **(M6 / H7)** Assert that every `<link rel="icon" href>`, `<meta property="og:image" content>`, and JSON-LD `Organization.logo` URL resolves to a file in `_site/`.
- **(C6)** Assert no built HTML has `og:title content="…"` containing unescaped `<`, `&`, or `"`.
- **(C8)** Grep `_site/**/*.html` for `[TBD`; fail if found (or warn if any are present in development).
- **(C3 / parallel-slug contract)** Diff IS-tree URLs vs EN-tree URLs by slug; warn on mismatch.
- **(C2)** Grep `_site/**/*.html` for `<picture>`; fail if zero (asserts the optimizer fired).

A 30-line script wired into `npm run build` catches all five at CI time. The spec's `FRAMEWORK-PORT-PROMPT.md` §"Your task" line 619–621 already includes a Lighthouse pass as a finishing step — extend to include a structural-assertion pass.

---

### Deferred

#### D1 — Lighthouse mobile pass (Performance / Accessibility / SEO ≥ targets)
The spec at `FRAMEWORK-PORT-PROMPT.md:621` mandates "Run a Lighthouse pass; nothing should be obviously broken on accessibility or SEO." Not in scope for this static read-only audit. After C1–C6 are fixed, run Lighthouse mobile on `/`, `/en/`, `/thjonusta/`, `/greinar/`, and one article. Target: Performance ≥ 90, Accessibility ≥ 95, SEO ≥ 95.

#### D2 — Documentation reconciliation between `docs/architecture-deviations.md` and the focus brief
The deviations document pre-accepts C2, C3, and H3. The focus brief explicitly overrides. After acting on the criticals, either retire `architecture-deviations.md` or rewrite it to record what *will not* be done versus what *was* deviated from before this audit. Don't leave a document in the repo that contradicts the spec.

---

## Summary

- **Critical (10):** broken `og:image` on every article (C1); `eleventy-img` does no work and every hero ships as a full-size JPG (C2); page copy hardcoded in templates with no markdown content tree (C3); mobile nav unwired by selector mismatch (C4); 90% of articles missing from sitemap per locale (C5); attribute-context strings unescaped in OG/Twitter meta (C6); `errorMode: "never"` + bidirectional fallback suppress every missing-translation signal (C7); literal `[TBD — íslenska]` strings ship to users (C8); `eleventy-plugin-i18n` version mismatch + dual `t`/`i18n` mechanism (C9); `alternateUrl` filter bypasses `locale_links`/`locale_url` existence guarantee (C10).
- **High (18):** `prefixInlineUrls` regex transform is a symptom of inline-style violation (H1); CSS load order wrong, no `layout.css`, no per-section split (H2); raw hex/`rgba`/`px` throughout `main.css` + duplicate `:root` (H3); breadcrumb partial dead code, every page hand-rolls crumbs (H4); four `featured*` collections + `where`/`sortBy` filters all dead (H5); footer phone/email not anchor tags, country untranslated on EN (H6); Organization JSON-LD logo points at non-existent file, phone format fragmented (H7); Article JSON-LD missing `mainEntityOfPage`/`dateModified` (H8); language-switcher implementations split between working-tree and index (H9); quote calculator shows fake success on mailto failures (H10); article `eleventyComputed.title` accesses without null guard (H11); `interpolate()` silently returns literal placeholder on miss (H12); `t` filter silently emits bare key (H13); inline SVG icons duplicated and drifting across locale homes (H14); home pillars hardcode content that should iterate from `services` data (H15); 1,500+ lines of `is/*` vs `en/*` template duplication (H16); passthrough overlaps with optimizer pipeline (H17); IS `meta.description` is a TBD placeholder shipped on every IS page (H18).
- **Medium (24):** detailed above (M1–M24).
- **Low (11):** detailed above (L1–L11).
- **Test Gaps (1):** no smoke-test layer; suggested 8 assertions inline.
- **Deferred (2):** Lighthouse pass; reconciling `architecture-deviations.md` against the focus brief.

The strongest signals — focus-brief contracts violated directly — are C1, C2, C3, C4, C5, C6, C7, C8, C9, C10. Of these, **C4 makes the site unusable on mobile today**, **C1 breaks every article's social preview**, **C5 makes 90% of articles invisible to search**, and **C8 ships placeholder strings to users**. Those four are immediate production blockers.

C2, C3, and the related H1/H2/H3 are pre-accepted in `docs/architecture-deviations.md`. The focus brief expressly overrides. Acting on them is the strongest leverage move: fixing C2 deletes H1 (the transform shim) and resolves H17 (the passthrough-vs-optimizer overlap). Fixing C3 (proper markdown collections) collapses H5 (the dead `featured*` collections become live), H14 (icon drift between paired templates), H15 (hardcoded pillars become a data-driven loop), and H16 (90% of the `is/*` vs `en/*` duplication evaporates).

The recommended action order:

1. **C4** — one-line selector fix.
2. **C1** — move article `ogImage`/`ogType` under `eleventyComputed:`.
3. **C5** — rewrite sitemap to iterate `articles` data directly.
4. **C6** — parenthesize the OG/Twitter expressions.
5. **C7** — change `errorMode` to `"allow-fallback"`; reduce `fallbackLocales` to spec.
6. **H5** + **L6** — delete the four dead `featured*` collections, the unused `where`/`sortBy` filters, the dead `interpolate()` branch.
7. **C2** + **H1** + **H17** — migrate inline `background-image` to `<img>`; delete `prefixInlineUrls`.
8. **C3** + **H4** + **H14** + **H15** + **H16** — move content to markdown collections; wire breadcrumbs; collapse template duplication.
9. **C9** — upgrade plugin, decide on `t` vs `i18n`, retire one.
10. **C10** — re-evaluate `alternateUrl` once C3 is in place.
11. **H2** + **H3** + **M19** + **M21** + **M16** — CSS restructure (split, token migration, BEM rename, dead-code prune).
12. **T1** — wire build-time assertions before the deploy step.
13. Remaining Highs and Mediums.
14. **D1** — Lighthouse pass to confirm.
15. **D2** — reconcile `architecture-deviations.md`.
