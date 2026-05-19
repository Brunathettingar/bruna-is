# G2 — Migrate content model to parallel markdown collections per locale

**Severity:** Critical
**Specialty:** code-reviewer, consistency-auditor, simplifier
**Consolidates:** C3, H4, H14, H15, H16, H18, M14, M15, M23, M24

Source findings: `docs/combs/reviews/branch-main-round1-report.md` §C3, §H4, §H14, §H15, §H16, §H18, §M14, §M15, §M23, §M24.
Spec authority:
- `docs/instructions/FRAMEWORK-PORT-PROMPT.md` Part B §"Collection mechanism" (lines 483–514), §"Custom collections" (515–537), §"Templates" (564–578).
- `docs/instructions/FRAMEWORK-I18N.md` §"Directory layout" (96–141), §"Permalink strategy" (143–195), §"Content authoring contract" (396–437), §"Sitemap" (440–457), §"Conventions and guardrails" (505–519).
- Reference implementation: `/Users/olafur/Development/somethings/src/content/works/works.json` (directory data file), `…/works/bark-demon.md` (entry pattern), `…/_includes/layouts/work.njk` (single thin layout).

---

## What

Replace the current "JS array in `_data/` + hardcoded copy in `.njk`" content model with the framework-spec'd model: **one `.md` per entry per locale, under `src/content/{is,en}/<collection>/`, paired by slug, rendered by a single shared layout that iterates per-locale custom collections.** Migrate six collections (services, sectors, articles, team, milestones, principles), refactor the seven duplicated page templates into thin shells whose copy lives in frontmatter, extract repeated SVG icons into one shared partial set, wire `eleventyNavigation.parent` so the existing `breadcrumb.njk` works, rewrite the two sitemaps to filter by `page.data.lang`, and replace the IS `meta.description` `[TBD]` placeholder.

The end state is the same site, visually, but **every user-visible string lives in `.md` frontmatter, an `.md` body, or `i18n.js`** — never in a `.njk` template — and `.njk` files are layout shells only.

This plan supersedes / unblocks parts of three other findings in the same round:
- **C10** (`alternateUrl` replacement) — once Stage A lands, `locale_links` works correctly for every page and Path A of C10 becomes the trivial rip-and-replace it was designed to be. C10 explicitly gates on this plan.
- **H5** (broken `featured*` collections) — those collections are defined in `eleventy.config.js:151–165` but currently return empty because no `.md` carries `featured: true` (the JS arrays have it as a sibling JS property, invisible to `getFilteredByTag`). Stage A makes them live.
- **H14** (duplicated inline SVG icons) — supersedes by extraction. Stage C deletes every inline `<svg>` in both home pages and replaces them with a shared partial.

---

## Why

Six failure modes, ordered by severity:

1. **Spec violation, observable on every page (C3).** `FRAMEWORK-I18N.md:507` is unambiguous: *"Never inline a translatable string in a template."* Today every section heading, paragraph, list item, badge, kicker, signature, stat caption and logo label is inlined in the seven duplicated `*/index.njk` page templates, or stored as `{ is, en }`-keyed JS objects in `_data/*.js` (which is just inline-in-templates with one extra level of indirection — the strings still ship in the build and still bypass the `i18n.js` dictionary the spec mandates). `docs/architecture-deviations.md` §3 pre-accepts this; the round-1 focus brief explicitly overrides that acceptance.
2. **Per-locale drift, baked in (H16, H14).** `is/*.njk` and `en/*.njk` are 90% copy-paste, ~1,500 lines duplicated. Every structural change must be made twice. The duplication has already drifted: the home-page sector icons added extra `<rect>` / `<path>` children to the EN versions that IS doesn't have (H14). Two copies cannot stay in sync indefinitely; this is the SPOT (single point of truth) violation the simplicity directive exists to prevent.
3. **Hardcoded content fails to use data that already exists (H15).** `services.js` has seven fully-described bilingual services with `slug` fields. The home page hardcodes four "pillars" with divergent ad-hoc copy and links them all to the services index. A `featured: true` flag plus a four-line `{% for s in collections.featuredServicesIs %}` loop replaces 70 lines of duplicated markup.
4. **Dead routes (M14, M15).** `services.js` entries carry `slug:` but no service-detail pages are generated. Sector cards on `geirar` link to the services index, not to a sector detail page. The `<a class="more">` on the services listing is a text span. All three are the same bug: the collection-entry mechanism was never wired up. Stage A fixes all three at once.
5. **Breadcrumb partial dead, hand-rolled crumbs everywhere (H4, M23).** `breadcrumb.njk` exists, uses `eleventyNavigationBreadcrumb`, and emits a `<nav class="breadcrumb">` with ARIA. It outputs nothing because no page sets `eleventyNavigation.parent`. Meanwhile every page hand-rolls its own `<div class="crumbs">…</div>` with hardcoded "Heim"/"Home" labels — a separate, parallel, untranslated mechanism. Two breadcrumb systems, neither correct. M23 (the partial's Home-link prepend) is decided in the same stage and documented either way.
6. **SEO regression on the primary language (H18) and brittle sitemap heuristic (M24).** The most prominent SEO field on the IS site ships as `[TBD — íslensk lýsing] Vottuð brunaþéttingar og tæknieinangrun á Íslandi.`. The sitemap filters by `not page.url.startsWith("/en/")`, which works today but breaks the moment any IS page gets a URL containing `/en/` as a substring (an article about the EN market, a directory named `enska/`, etc.). `page.data.lang` is the contractual signal the directory data file already sets.

---

## Where

### Files created (one row per `.md`; expand to all entries during execution)

| Collection | Directory data file | Listing template | Detail layout | Per-entry `.md` files |
|---|---|---|---|---|
| services | `src/content/is/thjonusta/thjonusta.json` `src/content/en/thjonusta/thjonusta.json` | `src/content/is/thjonusta/index.njk` (refactor) `src/content/en/thjonusta/index.njk` (refactor) | `src/_includes/layouts/service.njk` (new) | `src/content/is/thjonusta/<slug>.md` × 7 `src/content/en/thjonusta/<slug>.md` × 7 |
| sectors | `src/content/is/geirar/geirar.json` `src/content/en/geirar/geirar.json` | `src/content/is/geirar/index.njk` (refactor) `src/content/en/geirar/index.njk` (refactor) | `src/_includes/layouts/sector.njk` (new) | `src/content/is/geirar/<slug>.md` × 8 `src/content/en/geirar/<slug>.md` × 8 |
| articles | `src/content/is/greinar/greinar.json` `src/content/en/greinar/greinar.json` | `src/content/is/greinar/index.njk` (refactor) `src/content/en/greinar/index.njk` (refactor) | `src/_includes/layouts/article.njk` (new — replaces both paginated `article.njk` files) | `src/content/is/greinar/<slug>.md` × 10 `src/content/en/greinar/<slug>.md` × 10 |
| team | `src/content/is/about/team/team.json` `src/content/en/about/team/team.json` | (no listing — consumed by about page) | (no detail layout — consumed inline) | `src/content/is/about/team/<slug>.md` × 7 `src/content/en/about/team/<slug>.md` × 7 |
| milestones | `src/content/is/about/milestones/milestones.json` `src/content/en/about/milestones/milestones.json` | (no listing) | (no detail layout) | `src/content/is/about/milestones/<year>.md` × 7 `src/content/en/about/milestones/<year>.md` × 7 |
| principles | `src/content/is/about/principles/principles.json` `src/content/en/about/principles/principles.json` | (no listing) | (no detail layout) | `src/content/is/about/principles/0X-<slug>.md` × 6 `src/content/en/about/principles/0X-<slug>.md` × 6 |

Slugs in `<…>` come from the existing `_data/*.js` `slug` (services, articles, sectors) or are derived deterministically (team: name-slug; milestones: year; principles: number+title-slug). **The slug is identical in both locales** — that's how `locale_links` pairs them.

Detail pages get permalinks via the per-collection directory data file. Examples (matching the framework spec at `FRAMEWORK-I18N.md:171–191`):

```json
// src/content/is/thjonusta/thjonusta.json
{
  "tags": ["services", "services-is"],
  "layout": "layouts/service.njk",
  "permalink": "/thjonusta/{{ page.fileSlug }}/",
  "eleventyNavigation": { "parent": "services-is" }
}
```

```json
// src/content/en/thjonusta/thjonusta.json
{
  "tags": ["services", "services-en"],
  "layout": "layouts/service.njk",
  "permalink": "/en/thjonusta/{{ page.fileSlug }}/",
  "eleventyNavigation": { "parent": "services-en" }
}
```

The dual tagging (`services` + `services-is` / `services-en`) is required by `FRAMEWORK-I18N.md:193` so templates can iterate per-locale collections and the existing `featuredServicesIs` / `featuredServicesEn` filters in `eleventy.config.js:151–165` keep working.

### Files modified

- `src/_data/services.js`, `sectors.js`, `articles.js`, `team.js`, `milestones.js`, `principles.js` — **delete** after their content is migrated to `.md` files. Confirm nothing else imports them (a single ripgrep for each filename across `src/` before deleting).
- `src/_data/meta.js:4` — replace IS `description` placeholder (H18).
- `src/content/is/index.njk` + `src/content/en/index.njk` — refactor pillars block to iterate `collections.featuredServicesIs` / `featuredServicesEn`; replace inline sector SVGs with shared icon partial; move section copy (kicker, statement lead, explainer paragraphs, stats labels, customer logo names, CTA headings) into the page's own frontmatter (where it's a short string per element) and/or per-section partials backed by data.
- `src/content/is/thjonusta/index.njk` + EN twin — drop the `{% for s in services %}` block and iterate `collections.servicesIs` / `servicesEn`. Move hero kicker, intro labels, intro paragraphs, value-band labels and paragraphs, CTA headings into the listing page's frontmatter.
- `src/content/is/geirar/index.njk` + EN twin — same shape as services. Sector cards link to `/geirar/<slug>/` (M14) instead of `/thjonusta/`.
- `src/content/is/greinar/index.njk` + EN twin — replace `{%- set featured = articles | selectattr("featured") | first %}` with `collections.articlesIs | selectattr("data.featured") | first` (or a custom `featuredArticleIs` collection if cleaner). Move kicker / CTA copy into frontmatter.
- `src/content/is/greinar/article.njk` + EN twin — **delete both files.** The pagination template is replaced by per-entry `.md` files rendered by `src/_includes/layouts/article.njk`.
- `src/content/is/about/index.njk` + EN twin — change `{%- for member in team %}` to iterate `collections.teamIs` / `teamEn`; same for milestones and principles. Move the hero kicker, story copy (`<p>[TBD]` × 3, signature), philosophy label/heading/lead, and team-section labels/headings into page frontmatter or the page body markdown (this page is heading toward enough prose that a `.md` with `<sections>` in the body might be cleaner than `.njk` — judgement call during execution).
- `src/content/is/verdreiknir/index.njk`, `404.njk` — page-specific kicker, lead, CTA copy currently inlined. Move to frontmatter. Largely no new collection here; this is just the literal-strings sweep.
- `src/content/is/sitemap.njk` + EN twin — rewrite filter (Stage E).
- `src/_includes/partials/breadcrumb.njk:5` — decision on Home-link prepend (Stage D, M23).
- Every page that previously hand-rolled `<div class="crumbs">` — delete that div; rely on the partial.

### Files created (non-`.md`)

- `src/_includes/layouts/service.njk` — one detail layout shared by IS and EN entries.
- `src/_includes/layouts/sector.njk` — same.
- `src/_includes/layouts/article.njk` — replaces both paginated `article.njk` files. The existing `is/greinar/article.njk` is renamed/moved into here and rewritten to consume the markdown body directly (no `articles` data dependency).
- `src/_includes/partials/icons/<name>.njk` — one file per icon currently inlined. At minimum: `pillar-fireproofing`, `pillar-fireguard`, `pillar-pipe`, `pillar-ventilation`, `sector-commercial`, `sector-industry`, `sector-hospitals`, `sector-energy`. Each is a single `<svg>` block with no dynamic content.
- `src/_includes/partials/icon.njk` — `{%- include "partials/icons/" ~ name ~ ".njk" %}` style wrapper if the team prefers `{% include "partials/icon.njk" with { name: "pillar-fireproofing" } %}` over direct includes. Optional; either pattern is fine.

---

## How

The migration runs in six stages, each independently shippable behind a successful `npx @11ty/eleventy --serve` smoke test. **Order matters** — every stage after A assumes A has landed. The /comb:fix follow-up should execute stages sequentially, committing per stage, with a build-and-spot-check between each.

### Stage A — Collection conversion (the bulk of the work)

For each of the six collections in the table above:

1. Create both directory data files. Make sure `tags`, `layout`, `permalink`, and `eleventyNavigation.parent` are all set (the last one unblocks Stage D).
2. For each entry in the old `_data/*.js` array, create two `.md` files (one IS, one EN) with the same filename — that filename is the slug. Map JS keys to frontmatter keys 1:1. Where the JS used a `{ is, en }` object, the IS file gets the `is` value as a plain string and the EN file gets the `en` value as a plain string.
3. Promote the `featured: true` JS sibling property to frontmatter on the corresponding `.md` files (services, articles). The `featuredServicesIs` / `featuredServicesEn` / `featuredSectorsIs` / `featuredSectorsEn` collections in `eleventy.config.js:151–165` already filter by `item.data.featured === true`, so this just makes them live (H5 resolves as a side effect).
4. Delete the `_data/*.js` file after running `rg -n "<filename>" src/` to confirm no remaining importers. The collection is now sourced from the `.md` tree.
5. Confirm: `npx @11ty/eleventy` builds with zero new warnings, and `_site/thjonusta/<slug>/index.html` exists for each entry slug (and the EN twin under `_site/en/thjonusta/<slug>/`).

#### Concrete before / after — one service entry

**Before** (`src/_data/services.js:5–40`, single entry):

```js
{
  slug: "fireproofing",
  number: "01",
  category: { is: "Brunavarnir", en: "Fire protection" },
  image: "/img/server_room.jpg",
  imageContain: false,
  title: {
    is: "Brunaþéttingar og óvirkar brunavarnir",
    en: "Fireproofing & passive fire sealing",
  },
  lead: {
    is: "[TBD — íslenska] Heildaræðar brunavarnir fyrir byggingar.",
    en: "Complete fire protection for buildings — all types of passive fire sealing, intumescent paint for structural steel, fire-rated boards, and seals on penetrations and joints. Certified to EI 60, EI 120 and EI 240 (and R 30 to R 240 for structural protection).",
  },
  insightStrong: { is: "Aukinn ávinningur", en: "Bonus benefit" },
  insight: {
    is: "[TBD — íslenska] Brunaþéttiefni eru hljóðísogandi.",
    en: "Fire-rated caulk is highly sound-absorbing — the same seals that stop fire and smoke also dampen sound transmission between rooms. One solution, two functions.",
  },
  bullets: {
    is: [
      "[TBD — Þéttingar á gegnumtökum, samskeytum og rifum]",
      "[TBD — Brunaþéttiefni, froður og púðar (Roxtec, Hilti, Promat)]",
      "[TBD — Þrýstimálning fyrir burðarstál]",
      "[TBD — Brunaþéttiplötur og brunaeinangrun]",
      "[TBD — Reykjarþéttingar og loftþrýstiprófun]",
    ],
    en: [
      "Sealing of penetrations, joints and gaps",
      "Fire-rated caulks, foams and pillows (Roxtec, Hilti, Promat)",
      "Intumescent paint for structural steel",
      "Fire boards, fire-rated insulation, fire-rated doors",
      "Smoke sealing and air-pressure testing",
    ],
  },
},
```

**After** — `src/content/is/thjonusta/fireproofing.md`:

```yaml
---
title: "Brunaþéttingar og óvirkar brunavarnir"
number: "01"
category: "Brunavarnir"
order: 1
featured: true
image: "/img/server_room.jpg"
imageContain: false
summary: "[TBD — íslenska] Heildaræðar brunavarnir fyrir byggingar."
insightStrong: "Aukinn ávinningur"
insight: "[TBD — íslenska] Brunaþéttiefni eru hljóðísogandi."
bullets:
  - "[TBD — Þéttingar á gegnumtökum, samskeytum og rifum]"
  - "[TBD — Brunaþéttiefni, froður og púðar (Roxtec, Hilti, Promat)]"
  - "[TBD — Þrýstimálning fyrir burðarstál]"
  - "[TBD — Brunaþéttiplötur og brunaeinangrun]"
  - "[TBD — Reykjarþéttingar og loftþrýstiprófun]"
---

[TBD — lengri lýsing á brunaþéttingum og óvirkum brunavörnum kemur hér.]
```

**After** — `src/content/en/thjonusta/fireproofing.md`:

```yaml
---
title: "Fireproofing & passive fire sealing"
number: "01"
category: "Fire protection"
order: 1
featured: true
image: "/img/server_room.jpg"
imageContain: false
summary: "Complete fire protection for buildings — all types of passive fire sealing, intumescent paint for structural steel, fire-rated boards, and seals on penetrations and joints. Certified to EI 60, EI 120 and EI 240 (and R 30 to R 240 for structural protection)."
insightStrong: "Bonus benefit"
insight: "Fire-rated caulk is highly sound-absorbing — the same seals that stop fire and smoke also dampen sound transmission between rooms. One solution, two functions."
bullets:
  - "Sealing of penetrations, joints and gaps"
  - "Fire-rated caulks, foams and pillows (Roxtec, Hilti, Promat)"
  - "Intumescent paint for structural steel"
  - "Fire boards, fire-rated insulation, fire-rated doors"
  - "Smoke sealing and air-pressure testing"
---

Detailed prose for the fireproofing service goes here. This is the body shown on `/en/thjonusta/fireproofing/`.
```

Field-shape notes:
- `lead` collapses to `summary` to match the framework's standard frontmatter vocabulary (`FRAMEWORK-PORT-PROMPT.md:506`). Update the listing template to read `summary` instead of `lead`.
- `order` is added as an explicit sort key so the listing isn't dependent on filesystem read order; the existing `featuredServicesIs` collection already sorts by it.
- The markdown body is the long-form detail page content. Listings reference `summary` (short) and the entry page renders `content` (long). This is the same pattern the reference site uses for `works/bark-demon.md`.
- IS slugs **stay in English** by design — `FRAMEWORK-I18N.md:507`: *"Slugs are identical across locales. Don't translate `/services/` to `/thjonusta/`."* This refactor honors that by keeping `fireproofing.md` in both trees. The `/thjonusta/` URL segment is the locale-translated *collection root*, not the slug.

#### Concrete before / after — the services listing template

**Before** (`src/content/is/thjonusta/index.njk:32–50`, the loop body):

```njk
{%- for s in services %}
<article class="service-feature{% if loop.index0 % 2 == 1 %} flip{% endif %}">
  <div class="pic{% if s.imageContain %} contain{% endif %}" style="background-image: url('{{ s.image }}');"></div>
  <div class="copy">
    <span class="num-badge">{{ s.number }} / {{ s.category[lang] }}</span>
    <h2>{{ s.title[lang] | safe }}</h2>
    <p class="lead">{{ s.lead[lang] | safe }}</p>
    <div class="insight">
      <strong>{{ s.insightStrong[lang] }}</strong>
      {{ s.insight[lang] | safe }}
    </div>
    <ul class="bullets">
      {%- for b in s.bullets[lang] %}
      <li>{{ b | safe }}</li>
      {%- endfor %}
    </ul>
  </div>
</article>
{%- endfor %}
```

**After** — both `src/content/is/thjonusta/index.njk` and `src/content/en/thjonusta/index.njk` (this loop body is identical in both; only the collection name and the page's own frontmatter differ):

```njk
{%- set services = collections['services-' + lang] | sortBy('data.order') %}
{%- for s in services %}
<article class="service-feature{% if loop.index0 % 2 == 1 %} flip{% endif %}">
  <div class="pic{% if s.data.imageContain %} contain{% endif %}" style="background-image: url('{{ s.data.image }}');"></div>
  <div class="copy">
    <span class="num-badge">{{ s.data.number }} / {{ s.data.category }}</span>
    <h2><a href="{{ s.url }}">{{ s.data.title | safe }}</a></h2>
    <p class="lead">{{ s.data.summary | safe }}</p>
    <div class="insight">
      <strong>{{ s.data.insightStrong }}</strong>
      {{ s.data.insight | safe }}
    </div>
    <ul class="bullets">
      {%- for b in s.data.bullets %}
      <li>{{ b | safe }}</li>
      {%- endfor %}
    </ul>
  </div>
</article>
{%- endfor %}
```

Notes:
- `s.data.*` instead of `s.*[lang]` — every value is already in the page's language because we're iterating a per-locale collection.
- The `<h2>` becomes a link to `s.url` (the service-detail page generated by Stage A). This is M15's fix.
- The hero kicker (`<p class="kicker">[TBD — íslenska] Frá brunaþéttingum…</p>`), services-intro labels and paragraphs, value-band labels and paragraphs, and CTA heading all move into the page's own frontmatter (the file's `---` block) and are read as `{{ kicker }}`, `{{ intro.label }}`, etc. The IS file's frontmatter holds IS copy; the EN file's holds EN. No `[lang]` indirection in the template.

Once both files are restructured this way, the two listing templates become identical except for their frontmatter. That's the SPOT model the simplicity directive calls for.

### Stage B — Layout refactor (collapse duplicated `*/index.njk` shells)

After Stage A, the seven duplicated `*/index.njk` files (index, about, thjonusta, geirar, greinar, verdreiknir, 404) and the two `greinar/article.njk` pagination templates are 90% structural duplication. The remaining differences are exactly the frontmatter — copy strings — which now live in `.md` or in per-page frontmatter.

Approach, in order of payoff:

1. **Delete `is/greinar/article.njk` and `en/greinar/article.njk` entirely.** They were pagination shells. Replace with the new `src/_includes/layouts/article.njk` that renders one `.md` per article. The directory data file's `layout: "layouts/article.njk"` does the rest. This alone removes ~120 lines of duplication and resolves the article-side of C10's `locale_links` mismatch.
2. **For listing pages, keep one `*/index.njk` per locale** (the framework permalink strategy makes single-source listings awkward — each locale needs its own permalink). But ensure the **only** difference between the IS file and the EN file is the frontmatter block. The Nunjucks body should be byte-identical.
   - Test this with `diff <(sed -n '/^---$/,/^---$/!p' is/thjonusta/index.njk) <(sed -n '/^---$/,/^---$/!p' en/thjonusta/index.njk)`. After Stage B that diff should be empty.
3. **Extract repeated section markup into partials** where two pages share it: the `cta-band` block appears at the bottom of every page with locale-specific copy. Make it a partial `src/_includes/partials/cta-band.njk` that reads `cta.heading`, `cta.primaryLabel`, `cta.secondaryLabel` from page frontmatter (or from a per-page data file if a page wants to override the defaults). Same for `page-hero` and `value-band` if extraction pays off.

The framework's CSS expects the existing class names (`.page-hero`, `.cta-band`, `.value-band`, `.service-feature`, `.sector-card`, `.article-card`, `.article-featured`, `.pillar-grid`, `.pillar`, `.sectors-grid`, `.sector`, etc.). **Do not rename classes during this refactor.** Style files keep working as-is; the CSS audit is out of scope for this plan.

### Stage C — Home page refactor

The two home pages (`src/content/{is,en}/index.njk`, ~250 lines each, mostly hardcoded copy and inline SVG) are the largest single artefact to migrate. Three sub-tasks:

1. **Pillars (H15).** Replace the four hand-coded `<a class="pillar">` blocks with:

   ```njk
   {%- set pillars = collections['featuredServices' + (lang | capitalize)] %}
   {%- for s in pillars %}
   <a class="pillar" href="{{ s.url }}">
     <div class="pic{% if s.data.imageContain %} contain{% endif %}" style="background-image: url('{{ s.data.image }}');">
       <div class="ico">{% include "partials/icons/" ~ s.data.icon ~ ".njk" %}</div>
     </div>
     <div class="body">
       <h3>{{ s.data.title }}</h3>
       <p>{{ s.data.summary | safe }}</p>
       <ul>
         {%- for b in s.data.bullets | slice(0, 4) %}<li>{{ b | safe }}</li>{%- endfor %}
       </ul>
       <span class="more">{{ "ui.view_services" | t }} →</span>
     </div>
   </a>
   {%- endfor %}
   ```

   Set `featured: true` on the four services that should appear (Stage A already does this). Add an `icon:` frontmatter field on those four pointing at the corresponding partial file. The "more" link text comes from `i18n.js` (already has `ui.view_services`).

2. **Icon extraction (H14).** Move every inline `<svg>` in both home pages into a file under `src/_includes/partials/icons/`. There are ~8 distinct icons total (4 pillars, 4 sectors). Each partial is a single static `<svg>` block — no Nunjucks variables. Both home pages then `{% include "partials/icons/<name>.njk" %}` instead of inlining. Drift between IS and EN is impossible by construction.

3. **Section copy.** Statement, explainer (with chip labels), process steps, leading (with stats and badge), sectors-callout, customers row, CTA — all currently inlined. Two options, pick per section:
   - **Short strings (single chip, single label, single CTA heading) → page frontmatter.** Example: the page frontmatter gets `statement: { label: "Hvað við gerum", heading: "…", lead: "…" }`. Each home page (IS/EN) carries its own copy.
   - **Long prose blocks or repeated section shapes → per-section partials backed by data.** The explainer's two columns and the process's four steps are good candidates for per-section partials that consume an array from frontmatter (so the template becomes a loop, not four hand-coded `<div class="process-step">`s).
   - **Customer logo names** (`Tensio Architects`, `Roxtec`, `Hilti`, `Promat`, `Isogenopak`, `WrapTec`) are technically not translatable — they're brand names. But the spec's "no literal user-visible strings in templates" rule still applies. Move them to a shared data file `src/_data/partners.js` (a flat array of `{ name, style }` objects) and iterate. This is a small file but keeps the "no literal strings" rule unbroken without forcing translation that doesn't exist.

The Icelandic and English home pages share the **same structural template** after this stage. Only their frontmatter and the `lang`-driven `i18n` keys differ. Net line-count reduction across both files: ~300 lines removed, ~50 added; ~200 lines of frontmatter introduced (one block per page).

### Stage D — Breadcrumbs (H4, M23)

Two sub-tasks:

1. **Wire `eleventyNavigation.parent` on detail-type pages.** This is already partially done by the directory data files in Stage A (each per-collection `*.json` sets `eleventyNavigation.parent` to the corresponding listing-page `key`). Confirm each detail entry's parent matches an existing `eleventyNavigation.key`:
   - Services detail (`services-is` listing has `key: services-is`) → parent set in `thjonusta.json` ✓
   - Sectors detail → parent `sectors-is` / `sectors-en` ✓
   - Articles detail → parent `articles-is` / `articles-en` ✓
   - The about/team, about/milestones, about/principles collections do **not** generate detail pages, so they don't need `eleventyNavigation.parent`.

2. **Delete every hand-rolled `<div class="crumbs">`.** Locations to strip (one line each, all currently of the form `<div class="crumbs"><a href="/">Heim</a> &nbsp;/&nbsp; <span>…</span></div>` or `<a href="/">Home</a>` for EN):
   - `src/content/is/index.njk:13`
   - `src/content/is/thjonusta/index.njk:13`
   - `src/content/is/geirar/index.njk:13`
   - `src/content/is/greinar/index.njk:16`
   - `src/content/is/greinar/article.njk:18` (file is being deleted anyway — Stage B)
   - `src/content/is/about/index.njk:13`
   - `src/content/is/verdreiknir/index.njk` (search for `crumbs`)
   - EN twins of all of the above.

   After removal, `page.njk` renders `breadcrumb.njk` automatically when `eleventyNavigation.parent` is set (`page.njk:9–11`).

3. **Decide on the Home-link prepend (M23).** The framework spec at `FRAMEWORK-PORT-PROMPT.md:263–277` shows the partial **without** a Home-link prepend — crumbs start at the parent, not at root. The current `breadcrumb.njk:5` prepends `<li>…ui.home…</li>`. This is a deliberate UX-leaning deviation: it matches the hand-rolled `<div class="crumbs">` that's being removed, so users see no change after this refactor.

   **Recommendation: keep the Home-link prepend, document the deviation in `docs/architecture-deviations.md`.** Removing it changes user-visible behavior on every detail page; keeping it preserves the visible breadcrumb shape and the rationale is defensible ("breadcrumbs anchored to home aid navigation on a small site"). The deviation entry should reference this plan and M23 by ID. If the deviation doc maintainer (D2) disagrees, the change is one line — delete `breadcrumb.njk:5`.

### Stage E — Sitemap (M24)

**Before** (`src/content/is/sitemap.njk:8–15`):

```njk
{%- for page in collections.all %}
  {%- if page.url and not page.url.startsWith("/en/") and not page.url.endsWith(".xml") and not page.url.endsWith(".txt") %}
  <url>
    <loc>{{ meta.url }}{{ page.url }}</loc>
    <lastmod>{{ page.date | dateIso }}</lastmod>
  </url>
  {%- endif %}
{%- endfor %}
```

**After** — `src/content/is/sitemap.njk`:

```njk
{%- for page in collections.all %}
  {%- if page.url and page.data.lang == "is" and not page.url.endsWith(".xml") and not page.url.endsWith(".txt") %}
  <url>
    <loc>{{ meta.url }}{{ page.url }}</loc>
    <lastmod>{{ page.date | dateIso }}</lastmod>
  </url>
  {%- endif %}
{%- endfor %}
```

The EN sitemap uses `page.data.lang == "en"`. The `lang` field is set by the directory data files (`is.11tydata.js`, `en.11tydata.js`) — both already in place.

Verification: run `npx @11ty/eleventy` and confirm the IS sitemap contains all 7 service detail URLs + 8 sector detail URLs + 10 article detail URLs + 3 listing pages + home + about + verdreiknir + 404 (excluded by GHP convention) etc. EN sitemap contains the same shape with `/en/` prefix. No cross-tree leakage.

### Stage F — Meta description (H18)

**Before** (`src/_data/meta.js:4`):

```js
description: "[TBD — íslensk lýsing] Vottuð brunaþéttingar og tæknieinangrun á Íslandi.",
```

**After** — write a real one-line IS description. Constraints:
- Length: 150–160 characters (the SEO sweet spot, `<meta name="description">` and `og:description` both consume this).
- Tone matches the IS site: factual, restrained, no marketing froth.
- Mirror the EN description's information density without translating word-for-word.

The current EN string is:

> *"Brunaþéttingar plan, manage and execute fire sealing and technical insulation work on Icelandic buildings."* (`meta.js:10–11`)

A direct IS counterpart that matches the homepage hero's language:

> *"Brunaþéttingar skipuleggur, stjórnar og framkvæmir brunaþéttingar og tæknieinangrun á íslenskum mannvirkjum — vottuð kerfi frá Roxtec, Hilti, Promat og fleirum."*

That's 161 characters; trim "og fleirum." if it goes over the 160-char target. The exact phrasing is the executor's call — the requirement is "real prose, not `[TBD]`". Confirm with `npx @11ty/eleventy && grep -r '\[TBD' _site/index.html _site/en/index.html` — should produce zero matches.

---

## Dependencies and ordering with other plans in this round

- **C10** (`alternateUrl` → `locale_url` / `locale_links`) — must run **after** this plan. C10 itself states this dependency. Once Stage A converts articles to per-slug `.md` files, `locale_links` returns the correct alternate, and C10 collapses to Path A (rip-and-replace).
- **H5** (broken `featuredServices*` / `featuredSectors*` collections) — **resolved by Stage A** as a side effect. The custom collections in `eleventy.config.js:151–165` already filter by `data.featured === true`; they return empty today because no `.md` carries that flag. Stage A promotes `featured: true` from the JS sibling-property onto the frontmatter of the four services and one article that should be highlighted. No code change needed; the collections start returning entries the moment the `.md` files land.
- **H14** (inline SVG icon drift) — **resolved by Stage C** via partial extraction. The icons no longer live in two files, so they can't drift.
- **G1** (image pipeline, separate plan) — runs orthogonally. The home page's `<div style="background-image: url('…')">` pattern is unaffected by the markdown migration; it's an unrelated CSS-vs-`<img>` decision G1 addresses.
- **C1** (article ogImage frontmatter) — **superseded by Stage B**. The paginated `article.njk` template C1 patches is deleted in Stage B; the replacement `layouts/article.njk` reads `ogImage` from the `.md`'s own frontmatter, which is plain, non-computed, and ships through `seo-meta.njk` correctly. **Execute C1 only if this plan is delayed past C1's milestone**; otherwise C1 is overtaken by events.

---

## Expected Outcome

After all six stages:

1. **Build is green.** `npx @11ty/eleventy` completes with no new warnings or errors. `_site/` contains:
   - `/thjonusta/<slug>/index.html` × 7 (was 0)
   - `/geirar/<slug>/index.html` × 8 (was 0)
   - `/greinar/<slug>/index.html` × 10 (matches today's count, but generated from `.md`, not pagination)
   - All EN twins at `/en/<…>/`
   - All listing pages still at their existing URLs
2. **No literal user-visible strings remain in `.njk` templates.** Verification:
   ```
   rg -nP '>[A-ZÁÉÍÓÚÝÞÆÖ][a-záéíóúýþæö ]{3,}<' src/content src/_includes
   ```
   Expected matches are limited to: text inside `<style>`/`<script>` blocks (none present), brand names emitted from data, and `{{ … | t }}` filter output. Any plain prose between angle brackets is a finding.
3. **Both content trees pair by slug.** Verification:
   ```
   diff <(ls src/content/is/thjonusta/*.md | xargs -n1 basename | sort) \
        <(ls src/content/en/thjonusta/*.md | xargs -n1 basename | sort)
   ```
   Empty diff. Repeat for `geirar/`, `greinar/`, `about/team/`, `about/milestones/`, `about/principles/`.
4. **`locale_links` returns correct alternates on every page.** Spot-check with `{{ page.url | locale_links | dump }}` in a service-detail render; expect a single entry pointing at the matching slug in the other locale.
5. **Breadcrumbs render from the partial, not from hand-rolled markup.** Verification:
   ```
   rg -n 'class="crumbs"' src/content
   ```
   Zero matches.
6. **The IS meta description is real prose.** Verification:
   ```
   grep -l 'TBD' _site/index.html _site/en/index.html
   ```
   Zero matches.
7. **`featured*` custom collections return entries.** Verification: dev-server render of the IS home page shows four pillar cards loaded from `collections.featuredServicesIs`, with content matching the frontmatter on the four services flagged `featured: true`.
8. **Sitemap filter is data-driven.** Verification: `_site/sitemap.xml` contains zero `/en/` URLs; `_site/en/sitemap.xml` contains only `/en/` URLs.
9. **All `_data/*.js` arrays for migrated collections are gone.** `services.js`, `sectors.js`, `articles.js`, `team.js`, `milestones.js`, `principles.js` deleted. `i18n.js` and `meta.js` remain — those are not content collections.

After this plan lands, the spec mandate at `FRAMEWORK-I18N.md:507` ("Never inline a translatable string in a template") and the spec mandate at `FRAMEWORK-PORT-PROMPT.md:483` ("For each repeating shape, create a directory under `src/content/<collection>/`") are both honored. The site looks identical to the user; the code matches the framework it was built to.
