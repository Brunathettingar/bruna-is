# G2 — Content Model Migration to Markdown Collections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate every user-visible string out of `.njk` templates and `_data/*.js` JS arrays into parallel per-locale markdown collections under `src/content/{is,en}/`, with one detail layout per collection type and per-locale custom collections wired into listings.

**Architecture:** Six collections (services, sectors, articles, team, milestones, principles) become directory-data-driven markdown trees. Each entry exists as a paired `.md` file under `src/content/is/<collection>/<slug>.md` + `src/content/en/<collection>/<slug>.md` with identical slug. Per-locale custom collections (`services-is`, `services-en`, etc.) feed listings; the home page consumes a `featured*` filter. About-page sub-collections (team, milestones, principles) render inline without detail pages. All literal copy moves to entry frontmatter, listing-page frontmatter, the existing `i18n.js` dictionary, or a new `_data/partners.js` for brand names. The two paginated `article.njk` files are deleted entirely.

**Tech Stack:** Eleventy v3 (ESM), Nunjucks templates, markdown frontmatter, `@11ty/eleventy-navigation` for breadcrumbs. No test framework — verification is `npm run build` + `rg` greps + visual spot-check on the dev server.

---

## Prerequisites

The following round-1 fixes are already landed (their effects matter for this plan):

- **G15** — `scripts/check-build.js` runs assertions after every build. Today the only remaining failures are `[TBD` placeholders. After this plan, that assertion should drop to 0.
- **G3** — Templates use `{{ "key" | i18n(lang) }}`, never `| t`. Missing keys log to stderr + `_site/.translation-misses.log`.
- **G4** — Deleted the four `featuredServices{Is,En}` / `featuredSectors{Is,En}` collections and the `where` / `sortBy` filters. Task 1 re-adds the featured-collection registrations; templates use Nunjucks built-in `sort` and `selectattr`/`rejectattr` instead of the removed filters.
- **G5** — `<html lang>` uses the `requireLang` filter; OG/Twitter chains route through `{% set %}` vars + `| escape`; `meta.byLocale[lang].ogLocale` is the per-locale OG locale source.
- **G6** — Footer reads from `meta.contact.*` + `meta.byLocale[lang].addressCountry`; `buildYear` global data is registered.
- **G10** — `meta.contact`, `meta.logo`, and placeholder assets at `src/assets/img/{favicon.svg,logo.svg,og-default.jpg}`.
- **G1** — Every `<img>` is processed by `eleventy-img`. Templates emit `<img src="/img/..." alt="" width=N height=N>`; the plugin generates `<picture>`.

## File Structure

### Created (directory data files — 12)

```
src/content/is/thjonusta/thjonusta.json
src/content/en/thjonusta/thjonusta.json
src/content/is/geirar/geirar.json
src/content/en/geirar/geirar.json
src/content/is/greinar/greinar.json
src/content/en/greinar/greinar.json
src/content/is/about/team/team.json
src/content/en/about/team/team.json
src/content/is/about/milestones/milestones.json
src/content/en/about/milestones/milestones.json
src/content/is/about/principles/principles.json
src/content/en/about/principles/principles.json
```

### Created (entry markdown — 90)

```
src/content/is/thjonusta/<7 slugs>.md          + EN parallel
src/content/is/geirar/<8 slugs>.md             + EN parallel
src/content/is/greinar/<10 slugs>.md           + EN parallel
src/content/is/about/team/<8 slugs>.md         + EN parallel
src/content/is/about/milestones/<7 slugs>.md   + EN parallel
src/content/is/about/principles/<6 slugs>.md   + EN parallel
```

Slug source: existing `_data/<collection>.js` `slug` field (services, sectors, articles); deterministic derivation for the others (team: kebab-case-name; milestones: year; principles: `0N-kebab-title`).

### Created (detail layouts — 3)

```
src/_includes/layouts/service.njk
src/_includes/layouts/sector.njk
src/_includes/layouts/article.njk
```

### Created (partials and data — ≤10)

```
src/_includes/partials/icons/pillar-fireproofing.njk
src/_includes/partials/icons/pillar-fireguard.njk
src/_includes/partials/icons/pillar-pipe.njk
src/_includes/partials/icons/pillar-ventilation.njk
src/_includes/partials/icons/sector-commercial.njk
src/_includes/partials/icons/sector-industry.njk
src/_includes/partials/icons/sector-hospital.njk
src/_includes/partials/icons/sector-energy.njk
src/_data/partners.js
```

### Modified

```
eleventy.config.js                                     # re-add 4 featured* collections
src/_data/meta.js                                      # IS description placeholder
src/content/is/index.njk + en/index.njk                # home — pillars loop, icon includes, frontmatter copy
src/content/is/about/index.njk + en/index.njk          # about — iterate collections
src/content/is/thjonusta/index.njk + en/index.njk      # services listing — iterate per-locale collection
src/content/is/geirar/index.njk + en/index.njk         # sectors listing — iterate + link to detail
src/content/is/greinar/index.njk + en/index.njk        # articles listing — iterate + filter featured
src/content/is/verdreiknir/index.njk + en/index.njk    # crumbs removal + frontmatter copy
src/content/is/404.njk + en/404.njk                    # crumbs removal + frontmatter copy
src/content/is/sitemap.njk + en/sitemap.njk            # filter by page.data.lang
```

### Deleted

```
src/_data/services.js
src/_data/sectors.js
src/_data/articles.js
src/_data/team.js
src/_data/milestones.js
src/_data/principles.js
src/content/is/greinar/article.njk                     # paginated; replaced by layouts/article.njk
src/content/en/greinar/article.njk                     # same
```

---

## Task 1: Re-add featured\* custom collections to `eleventy.config.js`

**Files:**
- Modify: `eleventy.config.js` (insert after the `navEn` collection block, around line 208)

G4 deleted these; G2 needs them live for the home-page pillars loop and the article listing's featured-article filter. They will return entries once the markdown migration in later tasks promotes `featured: true` into frontmatter.

- [ ] **Step 1: Add four `featured*` collections + a featuredArticle helper**

Insert immediately before the closing `}` of the default-export function in `eleventy.config.js`:

```js
  // Featured entries per locale, sourced from the per-locale tag set
  // by each collection's directory data file. Returns entries marked
  // `featured: true` in frontmatter, sorted by `order` ascending.
  for (const lang of ["is", "en"]) {
    const suffix = lang === "is" ? "Is" : "En";
    eleventyConfig.addCollection(`featuredServices${suffix}`, (api) =>
      api.getFilteredByTag(`services-${lang}`)
        .filter((item) => item.data.featured === true)
        .sort((a, b) => (a.data.order || 0) - (b.data.order || 0))
    );
    eleventyConfig.addCollection(`featuredSectors${suffix}`, (api) =>
      api.getFilteredByTag(`sectors-${lang}`)
        .filter((item) => item.data.featured === true)
        .sort((a, b) => (a.data.order || 0) - (b.data.order || 0))
    );
    eleventyConfig.addCollection(`featuredArticle${suffix}`, (api) =>
      api.getFilteredByTag(`articles-${lang}`)
        .filter((item) => item.data.featured === true)
        .sort((a, b) => new Date(b.data.date) - new Date(a.data.date))
        .slice(0, 1)
    );
  }
```

- [ ] **Step 2: Build**

```bash
npm run build
```

Expected: still exits non-zero (`[TBD]` assertions remain), but adds no new errors and no new check-build failures. The new collections compute to empty arrays today — no entries yet carry the required tags. That's fine; later tasks make them live.

- [ ] **Step 3: Commit**

```bash
git add eleventy.config.js
git commit -m "G2/01: re-add featured* custom collections"
```

---

## Task 2: Create services directory data files

**Files:**
- Create: `src/content/is/thjonusta/thjonusta.json`
- Create: `src/content/en/thjonusta/thjonusta.json`

- [ ] **Step 1: Write the IS directory data file**

`src/content/is/thjonusta/thjonusta.json`:

```json
{
  "tags": ["services", "services-is"],
  "layout": "layouts/service.njk",
  "permalink": "/thjonusta/{{ page.fileSlug }}/",
  "eleventyNavigation": {
    "parent": "services-is"
  }
}
```

- [ ] **Step 2: Write the EN directory data file**

`src/content/en/thjonusta/thjonusta.json`:

```json
{
  "tags": ["services", "services-en"],
  "layout": "layouts/service.njk",
  "permalink": "/en/thjonusta/{{ page.fileSlug }}/",
  "eleventyNavigation": {
    "parent": "services-en"
  }
}
```

- [ ] **Step 3: Commit (no build yet — entries and layout come next)**

```bash
git add src/content/is/thjonusta/thjonusta.json src/content/en/thjonusta/thjonusta.json
git commit -m "G2/02: services directory data files (IS + EN)"
```

---

## Task 3: Create the service detail layout

**Files:**
- Create: `src/_includes/layouts/service.njk`

- [ ] **Step 1: Write the layout**

`src/_includes/layouts/service.njk`:

```njk
---
layout: layouts/page.njk
eleventyComputed:
  ogImage: "{{ image }}"
ogType: "article"
---
<section class="page-hero">
  <img class="page-hero__image" src="{{ image }}" alt="" width="1600" height="900">
  <div class="scrim"></div>
  <div class="container">
    <h1>{{ title | safe }}</h1>
    <p class="kicker">{{ summary | safe }}</p>
  </div>
</section>

<section class="service-detail">
  <div class="container">
    <article class="service-feature">
      <div class="pic{% if imageContain %} contain{% endif %}">
        <img src="{{ image }}" alt="" width="1200" height="900">
      </div>
      <div class="copy">
        <span class="num-badge">{{ number }} / {{ category }}</span>
        <h2>{{ title | safe }}</h2>
        <p class="lead">{{ summary | safe }}</p>
        <div class="insight">
          <strong>{{ insightStrong }}</strong>
          {{ insight | safe }}
        </div>
        <ul class="bullets">
          {%- for b in bullets %}
          <li>{{ b | safe }}</li>
          {%- endfor %}
        </ul>
      </div>
    </article>

    <div class="content-prose">
      {{ content | safe }}
    </div>
  </div>
</section>

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Service",
  "name": "{{ title | jsonEscape }}",
  "description": "{{ summary | jsonEscape }}",
  "image": "{{ meta.url }}{{ image | jsonEscape }}",
  "provider": {
    "@type": "Organization",
    "name": "{{ meta.byLocale[lang].title | jsonEscape }}"
  },
  "inLanguage": "{{ lang }}"
}
</script>

{% include "partials/cta-band.njk" %}
```

The `cta-band.njk` include is forward-referenced; Task 19 creates it as part of the home-page refactor. Until then this include will be a no-op (Nunjucks logs a soft miss). If you'd rather not have the warning during intermediate builds, comment out the include line and remove the comment in Task 19. Either is fine.

- [ ] **Step 2: Commit**

```bash
git add src/_includes/layouts/service.njk
git commit -m "G2/03: service detail layout"
```

---

## Task 4: Convert services to paired markdown entries (14 files)

**Files:**
- Create: `src/content/is/thjonusta/<slug>.md` × 7
- Create: `src/content/en/thjonusta/<slug>.md` × 7

The source is `src/_data/services.js`. Map each JS entry to two `.md` files using the template below. The `slug` becomes the filename; every `{ is, en }` field splits into the IS file (left value) and EN file (right value); top-level non-localized fields (`number`, `image`, `imageContain`) appear identically in both.

- [ ] **Step 1: Template for each `.md` file**

Frontmatter shape (replace `<…>` placeholders from the JS data):

```yaml
---
title: "<title.is or title.en>"
number: "<number>"
category: "<category.is or category.en>"
order: <1 to 7, matching JS array index + 1>
featured: <true | false>           # see step 2
image: "<image>"
imageContain: <true | false>       # omit if false
summary: "<lead.is or lead.en>"
insightStrong: "<insightStrong.is or insightStrong.en>"
insight: "<insight.is or insight.en>"
bullets:
  - "<bullets.is[0] or bullets.en[0]>"
  - "<bullets.is[1] or bullets.en[1]>"
  # ...one bullet per array entry
---

[TBD — longer-form detail copy goes here as markdown body. Listings show only `summary`; the detail page renders the markdown body via `{{ content | safe }}`.]
```

- [ ] **Step 2: Mark 4 services as `featured: true` for the home-page pillars**

These four match the four hardcoded pillars on the current home page:

| slug | order | featured |
|---|---|---|
| `fireproofing`        | 1 | true |
| `pipe-insulation`     | 3 | true |
| `ventilation`         | 4 | true |
| `aluminium-cladding`  | 2 | true |
| `water-tanks`         | 5 | false |
| `markings`            | 6 | false |
| `advisory`            | 7 | false |

(The current home-page pillar #2 is "Brunavarnir" — structural fire protection. `aluminium-cladding` is the closest standalone service entry. If the designer prefers a dedicated "Brunavarnir" entry, that's a future content task; for now `aluminium-cladding` fills pillar #2.)

- [ ] **Step 3: Add an `icon` frontmatter field on the four featured services**

For the four `featured: true` entries, add an `icon` field naming the icon partial Task 18 will create:

```yaml
icon: pillar-fireproofing    # or pillar-pipe, pillar-ventilation, pillar-fireguard
```

Mapping:

| slug | icon |
|---|---|
| `fireproofing`        | `pillar-fireproofing` |
| `aluminium-cladding`  | `pillar-fireguard` |
| `pipe-insulation`     | `pillar-pipe` |
| `ventilation`         | `pillar-ventilation` |

- [ ] **Step 4: Worked example — `src/content/is/thjonusta/fireproofing.md`**

```yaml
---
title: "Brunaþéttingar og óvirkar brunavarnir"
number: "01"
category: "Brunavarnir"
order: 1
featured: true
icon: pillar-fireproofing
image: "/img/server_room.jpg"
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

- [ ] **Step 5: Worked example — `src/content/en/thjonusta/fireproofing.md`**

```yaml
---
title: "Fireproofing & passive fire sealing"
number: "01"
category: "Fire protection"
order: 1
featured: true
icon: pillar-fireproofing
image: "/img/server_room.jpg"
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

Detailed prose for the fireproofing service goes here. Body is rendered via `{{ content | safe }}` on the detail page.
```

- [ ] **Step 6: Apply the same conversion to the remaining 6 services**

Source entries to migrate (from `src/_data/services.js`): `pipe-insulation`, `ventilation`, `water-tanks`, `markings`, `aluminium-cladding`, `advisory`. Each produces a paired IS + EN `.md` with the field mapping from step 1.

- [ ] **Step 7: Build and verify**

```bash
npm run build
ls _site/thjonusta/ | sort     # expect: 7 entry dirs + index.html
ls _site/en/thjonusta/ | sort  # same
diff <(ls src/content/is/thjonusta/*.md | xargs -n1 basename | sort) \
     <(ls src/content/en/thjonusta/*.md | xargs -n1 basename | sort)
```

Expected: zero diff between locale trees; 7 directories under each `_site/.../thjonusta/`. Build may still flag `[TBD` in `check-build.js` — those will drop after later tasks; ignore for now.

- [ ] **Step 8: Commit**

```bash
git add src/content/is/thjonusta/*.md src/content/en/thjonusta/*.md
git commit -m "G2/04: services — 14 paired markdown entries"
```

---

## Task 5: Refactor services listing template to consume the collection

**Files:**
- Modify: `src/content/is/thjonusta/index.njk`
- Modify: `src/content/en/thjonusta/index.njk`

- [ ] **Step 1: Add page-level frontmatter copy to both listing files**

Replace the IS frontmatter with:

```yaml
---
layout: layouts/page.njk
title: "Þjónusta"
description: "Sjö þjónustusvið Brunaþéttinga — brunaþéttingar, brunavarnir, pípueinangrun, loftræsing, vatnstankar, merkingar, álklæðningar og ráðgjöf."
eleventyNavigation:
  key: services-is
  order: 2
kicker: "Frá brunaþéttingum og brunavörnum til pípueinangrunar, álklæðninga og pípumerkinga."
intro:
  label: "Þjónustan í heild"
  heading: "Eitt fyrirtæki — sjö sérgreinar."
  paragraphs:
    - "Brunaþéttingar bjóða <strong>heildaræðar tæknieinangrun</strong> fyrir mannvirki á Íslandi."
    - "[TBD — annað íslenskt inngangsmálsgrein]"
valueBand:
  label: "Hagkvæmni"
  heading: "Tæknieinangrun sem <span class=\"ul\">borgar sig sjálf</span>."
  paragraphs:
    - "[TBD — íslenska]"
    - "[TBD — íslenska]"
cta:
  heading: "Þarfu úttekt á staðnum? <span class=\"ul\">Hafðu samband.</span>"
  primaryHref: "/verdreiknir/"
  primaryLabel: "Fá verðmat"
  secondaryHref: "tel:+3548504405"
  secondaryLabel: "(+354) 850-4405"
---
```

EN frontmatter:

```yaml
---
layout: layouts/page.njk
title: "Services"
description: "Seven service lines — fire sealing, passive fire protection, pipe insulation, ventilation insulation, water tank insulation, pipe markings, and aluminium cladding."
eleventyNavigation:
  key: services-en
  order: 2
kicker: "From fire sealing and fireproofing to pipe insulation, aluminium cladding and pipe markings."
intro:
  label: "All services"
  heading: "One company — seven specialties."
  paragraphs:
    - "Brunaþéttingar provides <strong>complete technical insulation</strong> for buildings across Iceland."
    - "Our work spans fire protection, thermal and acoustic insulation, and finish work to industrial standards."
valueBand:
  label: "Economics"
  heading: "Technical insulation that <span class=\"ul\">pays for itself</span>."
  paragraphs:
    - "Most of our work pays back in months: heat loss eliminated, condensation prevented, fire compartments documented."
    - "We provide an annual energy-saving calculation with every project."
cta:
  heading: "Need an on-site survey? <span class=\"ul\">Get in touch.</span>"
  primaryHref: "/en/verdreiknir/"
  primaryLabel: "Get a quote"
  secondaryHref: "tel:+3548504405"
  secondaryLabel: "(+354) 850-4405"
---
```

- [ ] **Step 2: Replace the body markup with the new shared template**

Body for both files (byte-identical body — only frontmatter differs):

```njk
{%- set services = collections['services-' + lang] | sort(false, false, 'data.order') %}
<section class="page-hero">
  <img class="page-hero__image" src="/img/iceland_svartsengi.jpg" alt="" width="1600" height="900">
  <div class="scrim"></div>
  <div class="container">
    <h1>{{ title }}</h1>
    <p class="kicker">{{ kicker | safe }}</p>
  </div>
</section>

<section class="services-page">
  <div class="container">
    <div class="services-intro">
      <div>
        <div class="label">{{ intro.label }}</div>
        <h2>{{ intro.heading | safe }}</h2>
      </div>
      <div>
        {%- for p in intro.paragraphs %}
        <p>{{ p | safe }}</p>
        {%- endfor %}
      </div>
    </div>

    {%- for s in services %}
    <article class="service-feature{% if loop.index0 % 2 == 1 %} flip{% endif %}">
      <div class="pic{% if s.data.imageContain %} contain{% endif %}">
        <img src="{{ s.data.image }}" alt="" width="1200" height="900">
      </div>
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
  </div>
</section>

<section class="value-band">
  <div class="container">
    <div class="row">
      <div>
        <div class="label">{{ valueBand.label }}</div>
        <h2>{{ valueBand.heading | safe }}</h2>
      </div>
      <div>
        {%- for p in valueBand.paragraphs %}
        <p>{{ p | safe }}</p>
        {%- endfor %}
      </div>
    </div>
  </div>
</section>

<section class="cta-band">
  <div class="container">
    <div class="row">
      <h2>{{ cta.heading | safe }}</h2>
      <div class="actions">
        <a class="btn primary" href="{{ cta.primaryHref }}"><span>{{ cta.primaryLabel }}</span> <span class="arrow">→</span></a>
        <a class="btn ghost" href="{{ cta.secondaryHref }}"><span>{{ cta.secondaryLabel }}</span> <span class="arrow">→</span></a>
      </div>
    </div>
  </div>
</section>
```

The hardcoded `<div class="crumbs">` block is gone — breadcrumb rendering is handled by `breadcrumb.njk` once `eleventyNavigation.parent` is wired (Task 21 verifies).

- [ ] **Step 3: Build and verify**

```bash
npm run build
diff <(sed -n '/^---$/,/^---$/!p' src/content/is/thjonusta/index.njk) \
     <(sed -n '/^---$/,/^---$/!p' src/content/en/thjonusta/index.njk)
```

Expected: empty diff (body byte-identical between locales).

```bash
rg '\[TBD' _site/thjonusta/index.html | wc -l
rg '\[TBD' _site/en/thjonusta/index.html | wc -l
```

EN should be 0; IS will still have `[TBD]` matches sourced from the entry frontmatter (acceptable until the IS content is translated — see Stage F).

- [ ] **Step 4: Commit**

```bash
git add src/content/is/thjonusta/index.njk src/content/en/thjonusta/index.njk
git commit -m "G2/05: services listing consumes per-locale collection"
```

---

## Task 6: Delete `src/_data/services.js`

**Files:**
- Delete: `src/_data/services.js`

- [ ] **Step 1: Confirm no remaining importers**

```bash
rg -n "services" src/ --type-add 'tpl:*.njk' -t tpl -t js | rg -v '^src/(content|_includes)/.*\.njk:.*service-feature' | rg -v 'collections\[.services' | rg -v 'services-(is|en)'
```

Should return nothing (or only references to the new collection-based reads from Task 5).

- [ ] **Step 2: Delete and build**

```bash
rm src/_data/services.js
npm run build
```

Build must complete; `_site/thjonusta/` should still contain 7 entry dirs + an index. If the build fails because the listing template still references `services` (the old data global), revert and fix Task 5 first.

- [ ] **Step 3: Commit**

```bash
git add -A src/_data/services.js
git commit -m "G2/06: delete services.js — content now lives in src/content/{is,en}/thjonusta/"
```

---

## Task 7: Sectors — directory data files

**Files:**
- Create: `src/content/is/geirar/geirar.json`
- Create: `src/content/en/geirar/geirar.json`

- [ ] **Step 1: Write the two files**

`src/content/is/geirar/geirar.json`:

```json
{
  "tags": ["sectors", "sectors-is"],
  "layout": "layouts/sector.njk",
  "permalink": "/geirar/{{ page.fileSlug }}/",
  "eleventyNavigation": {
    "parent": "sectors-is"
  }
}
```

`src/content/en/geirar/geirar.json`:

```json
{
  "tags": ["sectors", "sectors-en"],
  "layout": "layouts/sector.njk",
  "permalink": "/en/geirar/{{ page.fileSlug }}/",
  "eleventyNavigation": {
    "parent": "sectors-en"
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/content/is/geirar/geirar.json src/content/en/geirar/geirar.json
git commit -m "G2/07: sectors directory data files (IS + EN)"
```

---

## Task 8: Create the sector detail layout

**Files:**
- Create: `src/_includes/layouts/sector.njk`

- [ ] **Step 1: Write the layout**

```njk
---
layout: layouts/page.njk
eleventyComputed:
  ogImage: "{{ image }}"
ogType: "article"
---
<section class="page-hero">
  <img class="page-hero__image" src="{{ image }}" alt="" width="1600" height="900">
  <div class="scrim"></div>
  <div class="container">
    <h1>{{ title | safe }}</h1>
    <p class="kicker">{{ description | safe }}</p>
  </div>
</section>

<section class="sector-detail">
  <div class="container">
    <div class="content-prose">
      {{ content | safe }}
    </div>

    {%- if tags and tags.length %}
    <ul class="svc-tags">
      {%- for t in tags %}
      <li>{{ t }}</li>
      {%- endfor %}
    </ul>
    {%- endif %}
  </div>
</section>

{% include "partials/cta-band.njk" %}
```

Note: `tags` in this context is the entry's frontmatter `tags` field (the "Aluminium, High heat, Fire protection" labels from `_data/sectors.js`), not Eleventy's collection tags. To avoid conflict with collection tags, use a different field name in entry frontmatter — `tagLabels` — and reference it as `tagLabels` here. Adjust:

```njk
    {%- if tagLabels and tagLabels.length %}
    <ul class="svc-tags">
      {%- for t in tagLabels %}
      <li>{{ t }}</li>
      {%- endfor %}
    </ul>
    {%- endif %}
```

- [ ] **Step 2: Commit**

```bash
git add src/_includes/layouts/sector.njk
git commit -m "G2/08: sector detail layout"
```

---

## Task 9: Convert sectors to paired markdown entries (16 files)

**Files:**
- Create: `src/content/is/geirar/<slug>.md` × 8
- Create: `src/content/en/geirar/<slug>.md` × 8

Source: `src/_data/sectors.js`. 8 entries with slugs `energy`, `aluminium`, `fishing`, `hospitals`, `schools`, `commercial`, `hotels`, `pharma`.

- [ ] **Step 1: Per-entry frontmatter template**

```yaml
---
title: "<title.is or title.en>"
number: "<number>"
order: <1 to 8>
image: "<image>"
description: "<description.is or description.en>"
tagLabels:
  - "<tags.is[0] or tags.en[0]>"
  - "<tags.is[1] or tags.en[1]>"
  - "<tags.is[2] or tags.en[2]>"
---

[TBD — longer-form sector copy goes here.]
```

`tagLabels` (not `tags`) — `tags` is reserved for Eleventy's collection tags. The directory data file already adds `["sectors", "sectors-is"]` to every entry.

- [ ] **Step 2: Featured/order policy for sectors**

Leave `featured: false` (omit the field) for all 8 sectors today — the home page's existing "sectors" section is a static block of 4 hand-coded icons + labels, not a featured-collection consumer. Task 19 may convert it; if it does, mark the first 4 sectors `featured: true` then.

- [ ] **Step 3: Worked example — `src/content/is/geirar/energy.md`**

```yaml
---
title: "Orku- og veitugeirinn"
number: "01"
order: 1
image: "/img/iceland_hellisheidi.jpg"
description: "[TBD — íslenska] Jarðvarmastöðvar, vatnsorkuver, dreifistöðvar og hitaveitustokkar."
tagLabels:
  - "Ál"
  - "Hitaþol"
  - "Brunavarnir"
---

[TBD — lengri lýsing á orku- og veitugeiranum kemur hér.]
```

- [ ] **Step 4: Worked example — `src/content/en/geirar/energy.md`**

```yaml
---
title: "Energy & utilities"
number: "01"
order: 1
image: "/img/iceland_hellisheidi.jpg"
description: "Geothermal plants, hydropower stations, substations and district heating tunnels. High-temperature insulation, aluminium cladding and fire protection on steam pipelines."
tagLabels:
  - "Aluminium"
  - "High heat"
  - "Fire protection"
---

Detailed prose for the energy and utilities sector.
```

- [ ] **Step 5: Apply to remaining 7 sectors** (`aluminium`, `fishing`, `hospitals`, `schools`, `commercial`, `hotels`, `pharma`) using the same mapping.

- [ ] **Step 6: Build and verify**

```bash
npm run build
diff <(ls src/content/is/geirar/*.md | xargs -n1 basename | sort) \
     <(ls src/content/en/geirar/*.md | xargs -n1 basename | sort)
ls _site/geirar/ | wc -l   # expect 9 (8 detail dirs + index.html)
```

- [ ] **Step 7: Commit**

```bash
git add src/content/is/geirar/*.md src/content/en/geirar/*.md
git commit -m "G2/09: sectors — 16 paired markdown entries"
```

---

## Task 10: Refactor sectors listing template

**Files:**
- Modify: `src/content/is/geirar/index.njk`
- Modify: `src/content/en/geirar/index.njk`

This is mechanically the same shape as Task 5 (services listing). The card link now points at `/geirar/<slug>/` (Task 9 made those pages real), resolving M14.

- [ ] **Step 1: Replace IS file**

```njk
---
layout: layouts/page.njk
title: "Geirar"
description: "Geirar sem Brunaþéttingar þjóna á Íslandi — orka, ál, sjávarútvegur, sjúkrahús, skólar, verslun, hótel, lyfjaiðnaður."
eleventyNavigation:
  key: sectors-is
  order: 3
kicker: "Brunaþéttingar starfa í öllum helstu atvinnugreinum Íslands."
intro:
  label: "Iðnaður á Íslandi"
  heading: "Frá Hellisheiðarvirkjun til sjúkrahúsa höfuðborgarsvæðisins."
  paragraphs:
    - "[TBD — íslenska]"
    - "[TBD — íslenska]"
valueBand:
  label: "Hver geiri hefur sínar kröfur"
  heading: "Eitt fyrirtæki — átta geirar — <span class=\"ul\">sjö þjónustusvið</span>."
  paragraphs:
    - "[TBD — íslenska]"
cta:
  heading: "Tilbúin að hefja verkefnið? <span class=\"ul\">Hafðu samband.</span>"
  primaryHref: "/verdreiknir/"
  primaryLabel: "Fá verðmat"
  secondaryHref: "tel:+3548504405"
  secondaryLabel: "(+354) 850-4405"
---
{%- set sectors = collections['sectors-' + lang] | sort(false, false, 'data.order') %}
<section class="page-hero">
  <img class="page-hero__image" src="/img/iceland_alcoa_reydar.jpg" alt="" width="1600" height="900">
  <div class="scrim"></div>
  <div class="container">
    <h1>{{ title }}</h1>
    <p class="kicker">{{ kicker | safe }}</p>
  </div>
</section>

<section class="sectors-page">
  <div class="container">
    <div class="sectors-intro">
      <div>
        <div class="label">{{ intro.label }}</div>
        <h2>{{ intro.heading | safe }}</h2>
      </div>
      <div>
        {%- for p in intro.paragraphs %}
        <p>{{ p | safe }}</p>
        {%- endfor %}
      </div>
    </div>

    <div class="sector-grid">
      {%- for s in sectors %}
      <a class="sector-card" href="{{ s.url }}">
        <div class="pic">
          <img src="{{ s.data.image }}" alt="" width="1200" height="900">
          <span class="badge">{{ s.data.number }}</span>
        </div>
        <div class="body">
          <h3>{{ s.data.title | safe }}</h3>
          <p>{{ s.data.description | safe }}</p>
          <ul class="svc-tags">
            {%- for t in s.data.tagLabels %}
            <li>{{ t }}</li>
            {%- endfor %}
          </ul>
        </div>
      </a>
      {%- endfor %}
    </div>
  </div>
</section>

<section class="value-band">
  <div class="container">
    <div class="row">
      <div>
        <div class="label">{{ valueBand.label }}</div>
        <h2>{{ valueBand.heading | safe }}</h2>
      </div>
      <div>
        {%- for p in valueBand.paragraphs %}
        <p>{{ p | safe }}</p>
        {%- endfor %}
      </div>
    </div>
  </div>
</section>

<section class="cta-band">
  <div class="container">
    <div class="row">
      <h2>{{ cta.heading | safe }}</h2>
      <div class="actions">
        <a class="btn primary" href="{{ cta.primaryHref }}"><span>{{ cta.primaryLabel }}</span> <span class="arrow">→</span></a>
        <a class="btn ghost" href="{{ cta.secondaryHref }}"><span>{{ cta.secondaryLabel }}</span> <span class="arrow">→</span></a>
      </div>
    </div>
  </div>
</section>
```

- [ ] **Step 2: Replace EN file** with the same body and EN-translated frontmatter copy. Change `primaryHref` to `/en/verdreiknir/`.

- [ ] **Step 3: Build and verify**

```bash
npm run build
# Sector cards now link to /geirar/<slug>/ not /thjonusta/
rg '<a class="sector-card"' _site/geirar/index.html | head
```

Expected output includes `href="/bruna-is/geirar/energy/"` (or the equivalent path under the project prefix), not `href="/bruna-is/thjonusta/"`.

- [ ] **Step 4: Commit**

```bash
git add src/content/is/geirar/index.njk src/content/en/geirar/index.njk
git commit -m "G2/10: sectors listing consumes collection; cards link to detail (M14)"
```

---

## Task 11: Delete `src/_data/sectors.js`

**Files:**
- Delete: `src/_data/sectors.js`

- [ ] **Step 1: Confirm no remaining importers**

```bash
rg -n "sectors" src/ --type-add 'tpl:*.njk' -t tpl -t js | rg -v "collections\[.sectors" | rg -v "sectors-(is|en)" | rg -v ".sectors-page" | rg -v ".sector-card"
```

- [ ] **Step 2: Delete and build**

```bash
rm src/_data/sectors.js
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add -A src/_data/sectors.js
git commit -m "G2/11: delete sectors.js"
```

---

## Task 12: Articles — directory data files

**Files:**
- Create: `src/content/is/greinar/greinar.json`
- Create: `src/content/en/greinar/greinar.json`

- [ ] **Step 1: Write the files**

`src/content/is/greinar/greinar.json`:

```json
{
  "tags": ["articles", "articles-is"],
  "layout": "layouts/article.njk",
  "permalink": "/greinar/{{ page.fileSlug }}/",
  "eleventyNavigation": {
    "parent": "articles-is"
  }
}
```

`src/content/en/greinar/greinar.json`:

```json
{
  "tags": ["articles", "articles-en"],
  "layout": "layouts/article.njk",
  "permalink": "/en/greinar/{{ page.fileSlug }}/",
  "eleventyNavigation": {
    "parent": "articles-en"
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/content/is/greinar/greinar.json src/content/en/greinar/greinar.json
git commit -m "G2/12: articles directory data files (IS + EN)"
```

---

## Task 13: Create the article detail layout

**Files:**
- Create: `src/_includes/layouts/article.njk`

This layout replaces the two paginated `article.njk` files Task 16 deletes.

- [ ] **Step 1: Write the layout**

```njk
---
layout: layouts/page.njk
eleventyComputed:
  ogImage: "{{ image }}"
ogType: "article"
---
<section class="page-hero page-hero--article">
  <img class="page-hero__image" src="{{ image }}" alt="" width="1600" height="900">
  <div class="scrim"></div>
  <div class="container">
    <h1>{{ title | safe }}</h1>
    <p class="kicker">{{ summary | safe }}</p>
  </div>
</section>

<section class="article-body">
  <div class="container">
    <div class="content-prose">
      <div class="article-meta">
        <span>{{ date | dateDisplay(lang) }}</span>
        <span>{{ readTimeMinutes }} {{ "articles.read_time_minutes" | i18n(lang) }}</span>
        <span>{{ author }}</span>
      </div>
      {{ content | safe }}
    </div>
  </div>
</section>

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "{{ title | jsonEscape }}",
  "description": "{{ summary | jsonEscape }}",
  "datePublished": "{{ date | dateIso }}",
  "dateModified": "{{ date | dateIso }}",
  "author": { "@type": "Person", "name": "{{ author | jsonEscape }}" },
  "publisher": { "@type": "Organization", "name": "{{ meta.byLocale[lang].title | jsonEscape }}" },
  "image": "{{ meta.url }}{{ image | jsonEscape }}",
  "mainEntityOfPage": "{{ meta.url }}{{ page.url }}",
  "inLanguage": "{{ lang }}"
}
</script>

{% include "partials/cta-band.njk" %}
```

This layout incorporates the H8 fixes (`mainEntityOfPage` + `dateModified`) and the H11 null-guard pattern is unnecessary here — markdown frontmatter has flat fields, not `article.title.is`-style nested access.

- [ ] **Step 2: Commit**

```bash
git add src/_includes/layouts/article.njk
git commit -m "G2/13: article detail layout (replaces paginated article.njk)"
```

---

## Task 14: Convert articles to paired markdown entries (20 files)

**Files:**
- Create: `src/content/is/greinar/<slug>.md` × 10
- Create: `src/content/en/greinar/<slug>.md` × 10

Source: `src/_data/articles.js`. 10 entries with slugs `handover-report-contents` (featured), `ei-rating-explained`, `icelandic-building-code`, `intumescent-paint-standard`, `common-mistakes`, `inspection-report-howto`, `choosing-cable-tray-solution`, `concrete-vs-lightweight-walls`, `digital-documentation-systems`, `manufacturer-comparison`.

- [ ] **Step 1: Per-entry template**

```yaml
---
title: "<title.is or title.en>"
date: <YYYY-MM-DD>
featured: <true | false>
image: "<image>"
category: "<category.is or category.en>"
summary: "<summary.is or summary.en>"
readTimeMinutes: <int>
author: "<author>"
---

[TBD — article body markdown goes here. The detail page renders this via `{{ content | safe }}`.]
```

- [ ] **Step 2: Worked example — `src/content/is/greinar/handover-report-contents.md`**

```yaml
---
title: "[TBD — íslenska] Hvað þarf að vera í lokaskýrslu fyrir brunaþéttingar?"
date: 2026-04-15
featured: true
image: "/img/documentation.jpg"
category: "Skráning"
summary: "[TBD — íslenska]"
readTimeMinutes: 9
author: "Guðjón Ragnarsson"
---

[TBD — íslensk grein í vinnslu.]
```

- [ ] **Step 3: Worked example — `src/content/en/greinar/handover-report-contents.md`**

```yaml
---
title: "What needs to be in a fire-sealing project handover report?"
date: 2026-04-15
featured: true
image: "/img/documentation.jpg"
category: "Documentation"
summary: "The handover report is what separates \"the job is done\" from \"the job is delivered and traceable for 30 years\". Here are 12 items that should appear in every report — and how our documentation system keeps track of them."
readTimeMinutes: 9
author: "Guðjón Ragnarsson"
---

Detailed article body goes here in English markdown.
```

Note the escaped inner quotes. Alternatively use single quotes for the YAML string and double quotes inside.

- [ ] **Step 4: Apply to remaining 9 articles** using the same mapping.

- [ ] **Step 5: Build and verify**

```bash
npm run build
ls _site/greinar/ | grep -v "index.html" | wc -l       # expect 10
ls _site/en/greinar/ | grep -v "index.html" | wc -l    # expect 10
diff <(ls src/content/is/greinar/*.md | xargs -n1 basename | sort) \
     <(ls src/content/en/greinar/*.md | xargs -n1 basename | sort)   # empty
```

- [ ] **Step 6: Commit**

```bash
git add src/content/is/greinar/*.md src/content/en/greinar/*.md
git commit -m "G2/14: articles — 20 paired markdown entries"
```

---

## Task 15: Refactor articles listing template

**Files:**
- Modify: `src/content/is/greinar/index.njk`
- Modify: `src/content/en/greinar/index.njk`

- [ ] **Step 1: Replace the IS file**

```njk
---
layout: layouts/page.njk
title: "Greinar"
description: "Greinar um brunaþéttingar, brunavarnir og skráningar fyrir mannvirki á Íslandi."
eleventyNavigation:
  key: articles-is
  order: 6
kicker: "[TBD — íslenska] Hagnýt ráð frá brunaþéttingateymi okkar."
cta:
  heading: "Tilbúin að hefja verkefnið? <span class=\"ul\">Hafðu samband.</span>"
  primaryHref: "/verdreiknir/"
  primaryLabel: "Fá verðmat"
  secondaryHref: "#contact"
  secondaryLabel: "Senda fyrirspurn"
---
{%- set articles = collections['articles-' + lang] | sort(false, true, 'data.date') %}
{%- set featured = collections['featuredArticle' + (lang == 'is' and 'Is' or 'En')] | first %}
{%- set rest = articles | rejectattr('data.featured') %}

<section class="page-hero">
  <img class="page-hero__image" src="/img/documentation.jpg" alt="" width="1600" height="900">
  <div class="scrim"></div>
  <div class="container">
    <h1>{{ title }}</h1>
    <p class="kicker">{{ kicker | safe }}</p>
  </div>
</section>

<section class="articles">
  <div class="container">
    {%- if featured %}
    <a class="article-featured" href="{{ featured.url }}">
      <div class="pic">
        <img src="{{ featured.data.image }}" alt="" width="1600" height="900">
      </div>
      <div class="body">
        <div class="tag">{{ featured.data.category }}</div>
        <h2>{{ featured.data.title | safe }}</h2>
        <p>{{ featured.data.summary | safe }}</p>
        <div class="meta">
          <span>{{ featured.data.date | dateDisplay(lang) }}</span>
          <span><strong>{{ featured.data.readTimeMinutes }} {{ "articles.read_time_minutes" | i18n(lang) }}</strong></span>
          <span>{{ featured.data.author }}</span>
        </div>
      </div>
    </a>
    {%- endif %}

    <div class="article-grid">
      {%- for article in rest %}
      <a class="article-card" href="{{ article.url }}">
        <div class="pic">
          <img src="{{ article.data.image }}" alt="" width="1200" height="900">
          <span class="tag">{{ article.data.category }}</span>
        </div>
        <div class="body">
          <h3>{{ article.data.title | safe }}</h3>
          <p>{{ article.data.summary | safe }}</p>
          <div class="meta">
            <span>{{ article.data.date | dateDisplay(lang) }}</span>
            <span>{{ article.data.readTimeMinutes }} {{ "articles.read_time_minutes" | i18n(lang) }}</span>
          </div>
        </div>
      </a>
      {%- endfor %}
    </div>
  </div>
</section>

<section class="cta-band">
  <div class="container">
    <div class="row">
      <h2>{{ cta.heading | safe }}</h2>
      <div class="actions">
        <a class="btn primary" href="{{ cta.primaryHref }}"><span>{{ cta.primaryLabel }}</span> <span class="arrow">→</span></a>
        <a class="btn ghost" href="{{ cta.secondaryHref }}"><span>{{ cta.secondaryLabel }}</span> <span class="arrow">→</span></a>
      </div>
    </div>
  </div>
</section>
```

- [ ] **Step 2: Replace the EN file** with the same body, EN-translated frontmatter copy, and `primaryHref: "/en/verdreiknir/"`.

- [ ] **Step 3: Build and verify**

```bash
npm run build
rg '<a class="article-featured"' _site/greinar/index.html | head -1
rg '<a class="article-card"' _site/greinar/index.html | wc -l   # expect 9 (10 articles minus the featured)
```

- [ ] **Step 4: Commit**

```bash
git add src/content/is/greinar/index.njk src/content/en/greinar/index.njk
git commit -m "G2/15: articles listing consumes collection + featured loop"
```

---

## Task 16: Delete the paginated article templates

**Files:**
- Delete: `src/content/is/greinar/article.njk`
- Delete: `src/content/en/greinar/article.njk`

- [ ] **Step 1: Remove and verify**

```bash
rm src/content/is/greinar/article.njk src/content/en/greinar/article.njk
npm run build
ls _site/greinar/ | grep -v "index.html" | wc -l       # still 10 (now sourced from .md, not pagination)
```

- [ ] **Step 2: Commit**

```bash
git add -A src/content/is/greinar/article.njk src/content/en/greinar/article.njk
git commit -m "G2/16: delete paginated article.njk (replaced by layouts/article.njk)"
```

---

## Task 17: Delete `src/_data/articles.js`

**Files:**
- Delete: `src/_data/articles.js`

- [ ] **Step 1: Confirm no importers**

```bash
rg -n "articles" src/ --type-add 'tpl:*.njk' -t tpl -t js | rg -v "collections\[.articles" | rg -v "articles-(is|en)" | rg -v "featuredArticle"
```

- [ ] **Step 2: Delete and build**

```bash
rm src/_data/articles.js
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add -A src/_data/articles.js
git commit -m "G2/17: delete articles.js"
```

---

## Task 18: Create icon partials

**Files:**
- Create: `src/_includes/partials/icons/pillar-fireproofing.njk`
- Create: `src/_includes/partials/icons/pillar-fireguard.njk`
- Create: `src/_includes/partials/icons/pillar-pipe.njk`
- Create: `src/_includes/partials/icons/pillar-ventilation.njk`
- Create: `src/_includes/partials/icons/sector-commercial.njk`
- Create: `src/_includes/partials/icons/sector-industry.njk`
- Create: `src/_includes/partials/icons/sector-hospital.njk`
- Create: `src/_includes/partials/icons/sector-energy.njk`

Source: the inline `<svg>` blocks in `src/content/is/index.njk` lines 68 (pillar-fireproofing), 85 (pillar-fireguard), 102 (pillar-pipe), 119 (pillar-ventilation), 200–203 (sector-commercial), 205–208 (sector-industry), 210–212 (sector-hospital), 214–218 (sector-energy).

- [ ] **Step 1: Read each inline SVG block from `src/content/is/index.njk`**

Use `Read` to extract the four pillar icons and four sector icons.

- [ ] **Step 2: Create one partial per icon, just the `<svg>...</svg>` element**

Example — `src/_includes/partials/icons/pillar-fireproofing.njk`:

```njk
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="6" width="18" height="4" rx="0.5"/><rect x="3" y="14" width="18" height="4" rx="0.5"/><circle cx="6" cy="8" r="0.6" fill="currentColor"/><circle cx="6" cy="16" r="0.6" fill="currentColor"/><line x1="9" y1="8" x2="18" y2="8"/><line x1="9" y1="16" x2="18" y2="16"/></svg>
```

Repeat for the other seven, using the SVG content as it appears in `is/index.njk`. The EN file may have drifted (H14 — the audit noted extra `<rect>`/`<path>` children in EN versions). Use the IS version as canonical; the EN visual difference will resolve once both home pages include the same partial in Task 20.

- [ ] **Step 3: Commit**

```bash
git add src/_includes/partials/icons/
git commit -m "G2/18: extract pillar and sector icons to partials"
```

---

## Task 19: Create the partners data file and the `cta-band` partial

**Files:**
- Create: `src/_data/partners.js`
- Create: `src/_includes/partials/cta-band.njk`

- [ ] **Step 1: Write `src/_data/partners.js`**

```js
// Brand names emitted on the home customer band and elsewhere.
// Not translatable — these are external brand identifiers.
// The `style` field flips the customer-logo font (`sans` vs default serif).
export default [
  { name: "Tensio Architects", style: "sans" },
  { name: "Roxtec", style: null },
  { name: "Hilti", style: "sans" },
  { name: "Promat", style: null },
  { name: "Isogenopak", style: "sans" },
  { name: "WrapTec", style: null },
];
```

- [ ] **Step 2: Write `src/_includes/partials/cta-band.njk`**

```njk
{%- if cta %}
<section class="cta-band">
  <div class="container">
    <div class="row">
      <h2>{{ cta.heading | safe }}</h2>
      <div class="actions">
        {%- if cta.primaryHref %}
        <a class="btn primary" href="{{ cta.primaryHref }}"><span>{{ cta.primaryLabel }}</span> <span class="arrow">→</span></a>
        {%- endif %}
        {%- if cta.secondaryHref %}
        <a class="btn ghost" href="{{ cta.secondaryHref }}"><span>{{ cta.secondaryLabel }}</span> <span class="arrow">→</span></a>
        {%- endif %}
      </div>
    </div>
  </div>
</section>
{%- endif %}
```

Detail pages without a `cta` frontmatter field render no CTA band. Pages that want one supply the block in frontmatter.

- [ ] **Step 3: Commit**

```bash
git add src/_data/partners.js src/_includes/partials/cta-band.njk
git commit -m "G2/19: partners data and shared cta-band partial"
```

---

## Task 20: Refactor home pages — pillars consume featured services, icons via partial, partners via data

**Files:**
- Modify: `src/content/is/index.njk`
- Modify: `src/content/en/index.njk`

This is the largest single-file edit in the plan. Both home pages are ~250 lines; the refactor cuts ~70 hard-coded pillar lines and ~30 hard-coded sector-icon lines, adds ~30 lines of frontmatter copy, and replaces inline icons with `{% include %}` calls.

- [ ] **Step 1: Replace IS file**

```njk
---
layout: layouts/page.njk
title: "Lausnir"
description: "Brunaþéttingar skipuleggur, stjórnar og framkvæmir brunaþéttingar og tæknieinangrun á íslenskum mannvirkjum — vottuð kerfi frá Roxtec, Hilti og Promat."
eleventyNavigation:
  key: home-is
  order: 1
heroHeading: "Brunaþéttingar &amp;<br>tæknieinangrun."
statement:
  label: "Hvað við gerum"
  heading: "Sérgrein okkar er <span class=\"ul\">tæknieinangrun og brunavarnir</span> mannvirkja — brunaþéttingar, brunavarnir, pípueinangrun og loftræsieinangrun."
  lead: "Brunaþéttingar er sérhæft fyrirtæki í tæknieinangrun og brunaþéttingum sem þjónar verktökum, eigendum og rekstraraðilum mannvirkja um land allt. <strong>Við bjóðum ekki upp á brunatæknihönnun</strong> — það er sérgrein brunaverkfræðinga. Við mælum sérstaklega með <strong>Tensio Architects</strong>."
explainer:
  left:
    heading: "Hvað er tæknieinangrun?"
    paragraphs:
      - "<strong>Tæknieinangrun</strong> er hugtak yfir einangrun tækjabúnaðar, byggingaþjónustu og burðarvirkis."
      - "[TBD — annað íslenskt málsgrein um tæknieinangrun.]"
    chips:
      - { label: "Hitaeinangrun", style: "blue" }
      - { label: "Hljóðvist",     style: "blue" }
      - { label: "Brunaeinangrun", style: null }
      - { label: "Brunaþéttingar", style: null }
  right:
    heading: "Okkar þjónusta"
    paragraphs:
      - "Við bjóðum <strong>heildaræðar tæknieinangrun</strong> fyrir mannvirki."
      - "Verkin skiptast í fjögur svið:"
    chips:
      - { label: "Brunaþéttingar",     style: null }
      - { label: "Brunavarnir",         style: null }
      - { label: "Pípueinangrun",      style: null }
      - { label: "Loftræsieinangrun",  style: null }
    footer: "Við notum vottuð kerfi frá Roxtec, Hilti, Promat, 3M, <strong>Isogenopak</strong> og <strong>WrapTec</strong>."
process:
  label: "Heildarverkferli"
  heading: "Frá fyrstu teikningu til lokaúttektar — eitt teymi, eitt ferli."
  steps:
    - { num: "01", heading: "Brunatæknihönnun og ráðgjöf",  body: "Við bjóðum ekki upp á brunatæknihönnun — sjáum þér fyrir réttu fagaðilana." }
    - { num: "02", heading: "Skipulagning",                  body: "[TBD — íslenska]" }
    - { num: "03", heading: "Verkefnastjórn og uppsetning", body: "[TBD — íslenska]" }
    - { num: "04", heading: "Skráning og skýrslugjöf",      body: "[TBD — íslenska]" }
leading:
  label: "Skráning og skýrslugjöf"
  heading: "Skráning er <span class=\"ul\">hjartað í þjónustunni</span>."
  paragraphs:
    - "[TBD — íslensk lýsing á skráningarferli og skýrslukerfi.]"
  stats:
    - { num: "14",       lbl: "ár í brunaþéttingum" }
    - { num: "42.000+",  lbl: "vottaðar þéttingar" }
    - { num: "600+",     lbl: "skráðar skýrslur" }
    - { num: "100%",     lbl: "úttektir staðnar í fyrsta sinn" }
  badgeStrong: "Tvær gerðir af skýrslum"
  badgeBody: "[TBD — íslenska]"
  image: "/img/iceland_karahnjukar.jpg"
sectorsCallout:
  label: "Geirar"
  heading: "Þar sem áreiðanleiki er ekki valkostur."
  items:
    - { icon: "sector-commercial", heading: "Atvinnuhúsnæði",                body: "[TBD — íslenska]" }
    - { icon: "sector-industry",   heading: "Iðnaður og verksmiðjur",       body: "[TBD — íslenska]" }
    - { icon: "sector-hospital",   heading: "Sjúkrahús og opinberar byggingar", body: "[TBD — íslenska]" }
    - { icon: "sector-energy",     heading: "Orka og veitur",                body: "[TBD — íslenska]" }
customers:
  label: "Samstarfsaðilar og framleiðendur"
cta:
  heading: "Tilbúin að hefja verkefnið? <span class=\"ul\">Hafðu samband.</span>"
  primaryHref: "/verdreiknir/"
  primaryLabel: "Fá verðmat"
  secondaryHref: "#contact"
  secondaryLabel: "Senda fyrirspurn"
---
{%- set pillars = collections['featuredServices' + (lang == 'is' and 'Is' or 'En')] %}

<section class="hero">
  <img class="hero__image" src="/img/iceland_svartsengi.jpg" alt="" width="1600" height="900" loading="eager" fetchpriority="high">
  <div class="scrim"></div>
  <div class="container">
    <h1>
      {{ heroHeading | safe }}
      <span class="accent-bar"></span>
    </h1>
  </div>
</section>

<section class="statement">
  <div class="container">
    <div class="row">
      <div><span class="label">{{ statement.label }}</span></div>
      <div>
        <h2>{{ statement.heading | safe }}</h2>
        <p class="lead">{{ statement.lead | safe }}</p>
      </div>
    </div>
  </div>
</section>

<section class="explainer">
  <div class="container">
    <div class="row">
      <div>
        <h3>{{ explainer.left.heading }}</h3>
        {%- for p in explainer.left.paragraphs %}
        <p>{{ p | safe }}</p>
        {%- endfor %}
        <div class="bullet-row">
          {%- for c in explainer.left.chips %}
          <span class="chip{% if c.style %} {{ c.style }}{% endif %}">{{ c.label }}</span>
          {%- endfor %}
        </div>
      </div>
      <div>
        <h3>{{ explainer.right.heading }}</h3>
        {%- for p in explainer.right.paragraphs %}
        <p>{{ p | safe }}</p>
        {%- endfor %}
        <div class="bullet-row">
          {%- for c in explainer.right.chips %}
          <span class="chip{% if c.style %} {{ c.style }}{% endif %}">{{ c.label }}</span>
          {%- endfor %}
        </div>
        <p>{{ explainer.right.footer | safe }}</p>
      </div>
    </div>
  </div>
</section>

<section class="pillars">
  <div class="container">
    <div class="pillar-grid">
      {%- for s in pillars %}
      <a class="pillar" href="{{ s.url }}">
        <div class="pic{% if s.data.imageContain %} contain{% endif %}">
          <img src="{{ s.data.image }}" alt="" width="1200" height="900">
          <div class="ico">{% include "partials/icons/" + s.data.icon + ".njk" %}</div>
        </div>
        <div class="body">
          <h3>{{ s.data.title | safe }}</h3>
          <p>{{ s.data.summary | safe }}</p>
          <ul>
            {%- for b in s.data.bullets | slice(0, 4) %}
            <li>{{ b | safe }}</li>
            {%- endfor %}
          </ul>
          <span class="more">{{ "ui.view_services" | i18n(lang) }} →</span>
        </div>
      </a>
      {%- endfor %}
    </div>
  </div>
</section>

<section class="process">
  <div class="container">
    <div class="head">
      <div class="label">{{ process.label }}</div>
      <h2>{{ process.heading | safe }}</h2>
    </div>
    <div class="process-grid">
      {%- for step in process.steps %}
      <div class="process-step">
        <div class="num">{{ step.num }}</div>
        <h4>{{ step.heading }}</h4>
        <p>{{ step.body | safe }}</p>
      </div>
      {%- endfor %}
    </div>
  </div>
</section>

<section class="leading">
  <div class="container">
    <div class="row">
      <div class="copy">
        <div class="label">{{ leading.label }}</div>
        <h2>{{ leading.heading | safe }}</h2>
        {%- for p in leading.paragraphs %}
        <p>{{ p | safe }}</p>
        {%- endfor %}
        <div class="stats">
          {%- for s in leading.stats %}
          <div class="stat"><div class="num">{{ s.num }}</div><div class="lbl">{{ s.lbl }}</div></div>
          {%- endfor %}
        </div>
      </div>
      <div class="pic">
        <img src="{{ leading.image }}" alt="" width="1200" height="900">
        <div class="badge">
          <strong>{{ leading.badgeStrong }}</strong>
          {{ leading.badgeBody | safe }}
        </div>
      </div>
    </div>
  </div>
</section>

<section class="sectors">
  <div class="container">
    <div class="head">
      <div class="label">{{ sectorsCallout.label }}</div>
      <h2>{{ sectorsCallout.heading | safe }}</h2>
    </div>
    <div class="sectors-grid">
      {%- for s in sectorsCallout.items %}
      <div class="sector">
        <div class="ico">{% include "partials/icons/" + s.icon + ".njk" %}</div>
        <h4>{{ s.heading }}</h4>
        <p>{{ s.body | safe }}</p>
      </div>
      {%- endfor %}
    </div>
  </div>
</section>

<section class="customers">
  <div class="container">
    <div class="label">{{ customers.label }}</div>
    <div class="customers-row">
      {%- for p in partners %}
      <div class="customer-logo{% if p.style %} {{ p.style }}{% endif %}">{{ p.name }}</div>
      {%- endfor %}
    </div>
  </div>
</section>

{% include "partials/cta-band.njk" %}
```

- [ ] **Step 2: Replace EN file** with the same body and EN-translated frontmatter. `primaryHref` becomes `/en/verdreiknir/`. `customers.label` becomes "Partners and manufacturers". All other prose translated to match the existing EN home page's intent.

- [ ] **Step 3: Build and verify body parity**

```bash
diff <(sed -n '/^---$/,/^---$/!p' src/content/is/index.njk | tail -n +2) \
     <(sed -n '/^---$/,/^---$/!p' src/content/en/index.njk | tail -n +2)
```

Empty diff = body byte-identical = SPOT achieved.

- [ ] **Step 4: Visual verification**

Start the dev server (`npm start`) and open `/` and `/en/`. Confirm pillars render four cards with correct titles, summaries, bullets (up to 4); sectors-callout renders four icons; customers row renders six logos; CTA band renders.

- [ ] **Step 5: Commit**

```bash
git add src/content/is/index.njk src/content/en/index.njk
git commit -m "G2/20: home pages consume featured services + frontmatter copy + partner data"
```

---

## Task 21: Team — directory data files and 16 markdown entries

**Files:**
- Create: `src/content/is/about/team/team.json`
- Create: `src/content/en/about/team/team.json`
- Create: `src/content/is/about/team/<slug>.md` × 8
- Create: `src/content/en/about/team/<slug>.md` × 8

Source: `src/_data/team.js`. 8 members (note: `_data/team.js` declares "8 team members" but the array has 7 — the 8th is a synthetic "+15 more" tile rendered inline on the about page; keep that as a literal in the about template, do **not** create a markdown entry for it).

- [ ] **Step 1: Directory data files (excludeFromCollections — team members shouldn't appear in `collections.all`)**

`src/content/is/about/team/team.json`:

```json
{
  "tags": ["team", "team-is"],
  "permalink": false,
  "eleventyExcludeFromCollections": true
}
```

`src/content/en/about/team/team.json`:

```json
{
  "tags": ["team", "team-en"],
  "permalink": false,
  "eleventyExcludeFromCollections": true
}
```

Wait — `eleventyExcludeFromCollections: true` removes entries from `collections.all` AND from tagged collections. We need them in their tagged collection to iterate from the about page. Drop that field:

```json
{
  "tags": ["team", "team-is"],
  "permalink": false
}
```

`permalink: false` prevents detail-page generation. The entry still appears in `collections.team-is`. Same for the EN file.

- [ ] **Step 2: Entry template**

```yaml
---
name: "<name>"
initials: "<initials>"
avatar: "<avatar>"
order: <1 to 8>
role: "<role.is or role.en>"
bio: "<bio.is or bio.en>"
---
```

Slug derivation: kebab-case the name (`Jón Einarsson` → `jon-einarsson`, drop diacritics with ASCII fold or keep them — Eleventy's `fileSlug` handles either as long as the file paths agree).

- [ ] **Step 3: Worked example — `src/content/is/about/team/jon-einarsson.md`**

```yaml
---
name: "Jón Einarsson"
initials: "JE"
avatar: "blue"
order: 1
role: "Stofnandi · Framkvæmdastjóri"
bio: "[TBD — 25 ára reynsla af brunaþéttingum.]"
---
```

EN counterpart at `src/content/en/about/team/jon-einarsson.md`:

```yaml
---
name: "Jón Einarsson"
initials: "JE"
avatar: "blue"
order: 1
role: "Founder · CEO"
bio: "25 years in fire sealing. ETA-certified supervisor."
---
```

`name` stays the same in both locales (proper noun, not translated).

- [ ] **Step 4: Slug list for all 7 entries**

| order | slug | name |
|---|---|---|
| 1 | `jon-einarsson` | Jón Einarsson |
| 2 | `sigridur-helgadottir` | Sigríður Helgadóttir |
| 3 | `gudjon-ragnarsson` | Guðjón Ragnarsson |
| 4 | `olafia-thorarinsdottir` | Ólafía Þórarinsdóttir |
| 5 | `bjorn-gylfason` | Björn Gylfason |
| 6 | `elin-magnusdottir` | Elín Magnúsdóttir |
| 7 | `petur-hjalmarsson` | Pétur Hjálmarsson |

ASCII-fold diacritics in slugs (`ó → o`, `ð → d`, `þ → th`, `æ → ae`, `í → i`, `ú → u`, `é → e`, `á → a`) so Eleventy's `fileSlug` and the OS filesystem agree.

- [ ] **Step 5: Build and verify**

```bash
npm run build
ls src/content/is/about/team/*.md | wc -l   # 7
ls src/content/en/about/team/*.md | wc -l   # 7
ls _site/about/team/ 2>/dev/null              # should NOT exist (permalink: false)
```

- [ ] **Step 6: Commit**

```bash
git add src/content/is/about/team/ src/content/en/about/team/
git commit -m "G2/21: team — paired markdown entries (no detail pages)"
```

---

## Task 22: Milestones — directory data files and 14 markdown entries

**Files:**
- Create: `src/content/is/about/milestones/milestones.json`
- Create: `src/content/en/about/milestones/milestones.json`
- Create: `src/content/is/about/milestones/<year>.md` × 7
- Create: `src/content/en/about/milestones/<year>.md` × 7

Source: `src/_data/milestones.js`. 7 entries with years `2011, 2014, 2016, 2018, 2020, 2022, 2025`.

- [ ] **Step 1: Directory data files**

`src/content/is/about/milestones/milestones.json`:

```json
{
  "tags": ["milestones", "milestones-is"],
  "permalink": false
}
```

`src/content/en/about/milestones/milestones.json`:

```json
{
  "tags": ["milestones", "milestones-en"],
  "permalink": false
}
```

- [ ] **Step 2: Entry template**

```yaml
---
year: <YYYY>
event: "<event.is or event.en>"
---
```

- [ ] **Step 3: Worked example — `src/content/is/about/milestones/2011.md`**

```yaml
---
year: 2011
event: "[TBD — Stofnun Brunaþéttinga í Reykjavík með 4 starfsmönnum.]"
---
```

EN — `src/content/en/about/milestones/2011.md`:

```yaml
---
year: 2011
event: "Brunaþéttingar founded in Reykjavík with 4 employees."
---
```

- [ ] **Step 4: Apply to remaining 6 years** (`2014, 2016, 2018, 2020, 2022, 2025`).

- [ ] **Step 5: Commit**

```bash
git add src/content/is/about/milestones/ src/content/en/about/milestones/
git commit -m "G2/22: milestones — paired markdown entries"
```

---

## Task 23: Principles — directory data files and 12 markdown entries

**Files:**
- Create: `src/content/is/about/principles/principles.json`
- Create: `src/content/en/about/principles/principles.json`
- Create: `src/content/is/about/principles/<slug>.md` × 6
- Create: `src/content/en/about/principles/<slug>.md` × 6

Source: `src/_data/principles.js`. 6 entries.

- [ ] **Step 1: Directory data files**

`src/content/is/about/principles/principles.json`:

```json
{
  "tags": ["principles", "principles-is"],
  "permalink": false
}
```

`src/content/en/about/principles/principles.json`: same shape with `principles-en`.

- [ ] **Step 2: Entry template**

```yaml
---
number: "<number>"
order: <1 to 6>
title: "<title.is or title.en>"
description: "<description.is or description.en>"
---
```

- [ ] **Step 3: Slug list**

| order | number | slug (derived) |
|---|---|---|
| 1 | 01 | `01-documentation-first` |
| 2 | 02 | `02-we-dont-design` |
| 3 | 03 | `03-certified-systems-only` |
| 4 | 04 | `04-transparency` |
| 5 | 05 | `05-continuous-training` |
| 6 | 06 | `06-one-project-one-report` |

- [ ] **Step 4: Worked example — `src/content/is/about/principles/01-documentation-first.md`**

```yaml
---
number: "01"
order: 1
title: "Skráning fyrst"
description: "[TBD — íslenska]"
---
```

EN — `src/content/en/about/principles/01-documentation-first.md`:

```yaml
---
number: "01"
order: 1
title: "Documentation first"
description: "No seal goes into a wall without a photo, a location on the drawing and a certification number in our documentation system. The report is not an afterthought — it's part of the work."
---
```

- [ ] **Step 5: Apply to remaining 5 principles.**

- [ ] **Step 6: Commit**

```bash
git add src/content/is/about/principles/ src/content/en/about/principles/
git commit -m "G2/23: principles — paired markdown entries"
```

---

## Task 24: Refactor `about/index.njk` to consume the three sub-collections

**Files:**
- Modify: `src/content/is/about/index.njk`
- Modify: `src/content/en/about/index.njk`

- [ ] **Step 1: Replace IS file**

```njk
---
layout: layouts/page.njk
title: "Um okkur"
description: "Sérhæft brunaþéttinga- og tæknieinangrunarfyrirtæki sem þjónar verktökum og eigendum mannvirkja á Íslandi síðan 2011."
eleventyNavigation:
  key: about-is
  order: 5
kicker: "Sérhæft brunaþéttinga- og tæknieinangrunarfyrirtæki á Íslandi síðan 2011."
story:
  label: "Okkar saga"
  heading: "Stofnað til að <span class=\"ul\">brunaþétta rétt</span> — og skrá það."
  paragraphs:
    - "[TBD — fyrsta málsgrein um sögu fyrirtækisins.]"
    - "[TBD — önnur málsgrein.]"
    - "[TBD — þriðja málsgrein.]"
  signatureQuote: "[TBD — íslensk tilvitnun]"
  signatureAttribution: "— Stofnandi Brunaþéttinga ehf."
  timelineHeading: "Tímalína"
philosophy:
  label: "Okkar stefna"
  heading: "Sex leiðarljós fyrir hvert verkefni."
  lead: "[TBD — íslenska]"
team:
  label: "Teymið"
  heading: "Lítið teymi sem þekkir hvert verkefni."
  extraTile:
    initials: "+15"
    name: "15 starfsmenn til viðbótar"
    role: "Brunaþéttingamenn"
    bio: "[TBD — íslenska]"
cta:
  heading: "Tilbúin að hefja verkefnið? <span class=\"ul\">Hafðu samband.</span>"
  primaryHref: "/verdreiknir/"
  primaryLabel: "Fá verðmat"
  secondaryHref: "#contact"
  secondaryLabel: "Senda fyrirspurn"
---
{%- set milestones = collections['milestones-' + lang] | sort(false, false, 'data.year') %}
{%- set principles = collections['principles-' + lang] | sort(false, false, 'data.order') %}
{%- set team = collections['team-' + lang] | sort(false, false, 'data.order') %}

<section class="page-hero">
  <img class="page-hero__image" src="/img/iceland_hellisheidi.jpg" alt="" width="1600" height="900">
  <div class="scrim"></div>
  <div class="container">
    <h1>Um Brunaþéttingar.</h1>
    <p class="kicker">{{ kicker | safe }}</p>
  </div>
</section>

<section class="story">
  <div class="container">
    <div class="row">
      <div class="copy">
        <div class="label">{{ story.label }}</div>
        <h2>{{ story.heading | safe }}</h2>
        {%- for p in story.paragraphs %}
        <p>{{ p | safe }}</p>
        {%- endfor %}
        <div class="signature">
          {{ story.signatureQuote | safe }}
          <small>{{ story.signatureAttribution }}</small>
        </div>
      </div>
      <div class="timeline">
        <h4>{{ story.timelineHeading }}</h4>
        {%- for m in milestones %}
        <div class="timeline-row">
          <div class="yr">{{ m.data.year }}</div>
          <div class="ev">{{ m.data.event | safe }}</div>
        </div>
        {%- endfor %}
      </div>
    </div>
  </div>
</section>

<section class="philosophy" id="stefna">
  <div class="container">
    <div class="head">
      <div class="label">{{ philosophy.label }}</div>
      <h2>{{ philosophy.heading | safe }}</h2>
      <p>{{ philosophy.lead | safe }}</p>
    </div>
    <div class="principles">
      {%- for p in principles %}
      <div class="principle">
        <span class="num">{{ p.data.number }}</span>
        <h3>{{ p.data.title | safe }}</h3>
        <p>{{ p.data.description | safe }}</p>
      </div>
      {%- endfor %}
    </div>
  </div>
</section>

<section class="team">
  <div class="container">
    <div class="head">
      <div class="label">{{ team.label }}</div>
      <h2>{{ team.heading | safe }}</h2>
    </div>
    <div class="team-grid">
      {%- for member in team %}
      <div class="team-card">
        <div class="avatar{% if member.data.avatar == 'orange' %} orange{% endif %}">{{ member.data.initials }}</div>
        <div class="body">
          <h4>{{ member.data.name }}</h4>
          <div class="role">{{ member.data.role }}</div>
          <div class="meta">{{ member.data.bio | safe }}</div>
        </div>
      </div>
      {%- endfor %}
      <div class="team-card">
        <div class="avatar orange">{{ team.extraTile.initials }}</div>
        <div class="body">
          <h4>{{ team.extraTile.name }}</h4>
          <div class="role">{{ team.extraTile.role }}</div>
          <div class="meta">{{ team.extraTile.bio | safe }}</div>
        </div>
      </div>
    </div>
  </div>
</section>

{% include "partials/cta-band.njk" %}
```

Wait — there's a shadowing issue: `{%- set team = … %}` rebinds `team` to the collection, but the page frontmatter also has a `team:` block (with `label`, `heading`, `extraTile`). Rename the local variable to avoid collision:

```njk
{%- set teamMembers = collections['team-' + lang] | sort(false, false, 'data.order') %}
```

And in the loop: `{%- for member in teamMembers %}`.

Use that in the final file. Same precaution for any other potential collisions.

- [ ] **Step 2: Replace EN file** with the same body (`teamMembers` collision-safe variable name) and EN-translated frontmatter.

- [ ] **Step 3: Build and verify**

```bash
npm run build
diff <(sed -n '/^---$/,/^---$/!p' src/content/is/about/index.njk | tail -n +2) \
     <(sed -n '/^---$/,/^---$/!p' src/content/en/about/index.njk | tail -n +2)
```

Empty diff.

- [ ] **Step 4: Visual verification**

`npm start` and open `/about/`. Confirm story paragraphs render, timeline shows 7 rows in year order, philosophy shows 6 principles in number order, team grid shows 7 real members + the "+15" tile.

- [ ] **Step 5: Commit**

```bash
git add src/content/is/about/index.njk src/content/en/about/index.njk
git commit -m "G2/24: about page consumes team / milestones / principles collections"
```

---

## Task 25: Delete the three about-sub data files

**Files:**
- Delete: `src/_data/team.js`
- Delete: `src/_data/milestones.js`
- Delete: `src/_data/principles.js`

- [ ] **Step 1: Confirm no importers**

```bash
rg -n "(team|milestones|principles)" src/ --type-add 'tpl:*.njk' -t tpl -t js | \
  rg -v "collections\[.(team|milestones|principles)" | \
  rg -v "(team|milestones|principles)-(is|en)" | \
  rg -v 'class="team' | rg -v 'team-grid' | rg -v 'team-card'
```

- [ ] **Step 2: Delete and build**

```bash
rm src/_data/team.js src/_data/milestones.js src/_data/principles.js
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add -A src/_data/team.js src/_data/milestones.js src/_data/principles.js
git commit -m "G2/25: delete team/milestones/principles JS — content lives in .md trees"
```

---

## Task 26: Move kicker + CTA copy out of `verdreiknir/index.njk` and `404.njk`

**Files:**
- Modify: `src/content/is/verdreiknir/index.njk`
- Modify: `src/content/en/verdreiknir/index.njk`
- Modify: `src/content/is/404.njk`
- Modify: `src/content/en/404.njk`

These pages don't have a collection — they're singletons. The fix moves their literal hero kicker, lead, CTA copy, and (for 404) the help-links block into their own frontmatter.

- [ ] **Step 1: Update `src/content/is/verdreiknir/index.njk` frontmatter**

Add the frontmatter copy block (existing frontmatter has `title`, `description`, `eleventyNavigation`; append):

```yaml
kicker: "Fáðu áætlað verðmat á netinu."
howItWorks:
  label: "Hvernig það virkar"
  heading: "Áætlað verð á þremur mínútum."
  paragraphs:
    - "[TBD — íslenska]"
  noticeStrong: "Athugið:"
  noticeBody: "Þetta er áætlað verð. Endanlegt verð staðfestist með úttekt á staðnum. Verð án vsk."
cta:
  heading: "Þarfu úttekt á staðnum? <span class=\"ul\">Hafðu samband.</span>"
  primaryHref: "#contact"
  primaryLabel: "Óska eftir úttekt"
  secondaryHref: "tel:+3548504405"
  secondaryLabel: "(+354) 850-4405"
```

Then replace the inline `<p class="kicker">…</p>`, the `.quoter-intro` block's heading/paragraph/notice text, and the `.cta-band` block at the bottom with reads from these frontmatter fields.

The quote-form labels (the column headers, button text, success banner) already use `| i18n(lang)` after G3 — leave those alone.

- [ ] **Step 2: Mirror the EN frontmatter** with EN copy.

- [ ] **Step 3: Update `src/content/is/404.njk`**

Add to frontmatter:

```yaml
kicker: "Síðan sem þú reyndir að heimsækja er ekki til, eða hefur verið færð."
help:
  label: "404"
  heading: "Þú getur líka skoðað <span class=\"ul\">English version</span> af þessari síðu — eða farið beint á forsíðuna."
  lead: "Algengar síður:"
  links:
    - { href: "/thjonusta/",  label: "Þjónusta" }
    - { href: "/geirar/",     label: "Geirar" }
    - { href: "/verdreiknir/", label: "Verðreiknir" }
    - { href: "/about/",      label: "Um okkur" }
    - { href: "/greinar/",    label: "Greinar" }
    - { href: "/en/",         label: "English" }
```

Replace the inline `<p class="kicker">` and `<p class="lead">…</p>` with frontmatter reads.

- [ ] **Step 4: Mirror EN 404 frontmatter**.

- [ ] **Step 5: Build and verify**

```bash
npm run build
rg '\[TBD' _site/verdreiknir/index.html _site/en/verdreiknir/index.html
rg '\[TBD' _site/404.html _site/en/404.html
```

Expected on EN pages: 0. Expected on IS pages: a small number (the `[TBD]`s left in frontmatter to be filled by content).

- [ ] **Step 6: Commit**

```bash
git add src/content/is/verdreiknir/index.njk src/content/en/verdreiknir/index.njk \
        src/content/is/404.njk src/content/en/404.njk
git commit -m "G2/26: move verdreiknir + 404 hero/cta copy to frontmatter"
```

---

## Task 27: Delete all hand-rolled `<div class="crumbs">` blocks

**Files:**
- Modify: every content page with a hand-rolled crumbs div

- [ ] **Step 1: Find all occurrences**

```bash
rg -ln 'class="crumbs"' src/content
```

Expected files (each ~1 line to remove):

```
src/content/is/index.njk:13
src/content/is/thjonusta/index.njk:13    # already removed by Task 5 — re-confirm
src/content/is/geirar/index.njk:13       # already removed by Task 10
src/content/is/greinar/index.njk:16
src/content/is/about/index.njk:13
src/content/is/verdreiknir/index.njk:13
src/content/is/404.njk:11
src/content/en/<same set>
```

- [ ] **Step 2: Remove the line in each file**

Each one is the line:

```
<div class="crumbs"><a href="/">Heim</a> &nbsp;/&nbsp; <span>X</span></div>
```

(or `Home` for EN). Delete the entire line. Breadcrumb rendering moves to the `breadcrumb.njk` partial wired by `page.njk:9–11` whenever `eleventyNavigation.parent` is set.

The home (`/`) and about (`/about/`) and listing pages (`/thjonusta/`, `/geirar/`, `/greinar/`, `/verdreiknir/`) are top-level — they don't set `eleventyNavigation.parent`. After this task, those pages render no breadcrumb. That matches the framework spec: breadcrumb partial only fires when a parent chain exists.

Detail pages (service / sector / article) get breadcrumbs automatically because Task 2/7/12 set `eleventyNavigation.parent` on their directory data files.

- [ ] **Step 3: Verify removal**

```bash
rg 'class="crumbs"' src/content   # empty
npm run build
```

Open `/thjonusta/fireproofing/` in the dev server — confirm a breadcrumb renders ("Þjónusta / Brunaþéttingar og óvirkar brunavarnir" or similar shape).

- [ ] **Step 4: Commit**

```bash
git add src/content/
git commit -m "G2/27: delete hand-rolled crumbs divs; rely on breadcrumb partial"
```

---

## Task 28: Rewrite sitemaps to filter by `page.data.lang`

**Files:**
- Modify: `src/content/is/sitemap.njk`
- Modify: `src/content/en/sitemap.njk`

- [ ] **Step 1: Read current IS sitemap**

The post-G14 sitemap has an explicit `articles` loop. After this plan's Task 17, the `articles` data global no longer exists — the loop must source from the collection.

- [ ] **Step 2: Replace `src/content/is/sitemap.njk`**

```njk
---
permalink: /sitemap.xml
eleventyExcludeFromCollections: true
layout: null
---
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
{%- set isPages = collections.all | rejectattr('data.eleventyExcludeFromCollections') %}
{%- for page in isPages %}
  {%- if page.url and page.data.lang == "is" and not page.url.endsWith(".xml") and not page.url.endsWith(".txt") %}
  <url>
    <loc>{{ meta.url }}{{ page.url }}</loc>
    <lastmod>{{ page.date | dateIso }}</lastmod>
  </url>
  {%- endif %}
{%- endfor %}
</urlset>
```

- [ ] **Step 3: Replace `src/content/en/sitemap.njk`** with the same body and `page.data.lang == "en"`.

- [ ] **Step 4: Build and verify**

```bash
npm run build
rg -c '<url>' _site/sitemap.xml _site/en/sitemap.xml
```

Expected:
- `_site/sitemap.xml` ≥ 26 (1 home + 1 about + 1 verdreiknir + 1 thjonusta listing + 7 service details + 1 geirar listing + 8 sector details + 1 greinar listing + 10 article details = 31 entries; minus the 404 which is excluded by collection convention).
- `_site/en/sitemap.xml` same shape with `/en/` prefix.

Both must exceed G15's sitemap-floor assertion threshold (15) easily.

- [ ] **Step 5: Commit**

```bash
git add src/content/is/sitemap.njk src/content/en/sitemap.njk
git commit -m "G2/28: sitemaps filter by page.data.lang (M24)"
```

---

## Task 29: Replace the IS `meta.description` placeholder

**Files:**
- Modify: `src/_data/meta.js:4`

- [ ] **Step 1: Read the current value**

```bash
rg -n 'íslensk lýsing' src/_data/meta.js
```

Current line:

```js
description: "[TBD — íslensk lýsing] Vottuð brunaþéttingar og tæknieinangrun á Íslandi.",
```

- [ ] **Step 2: Replace with real prose**

```js
description: "Brunaþéttingar skipuleggur, stjórnar og framkvæmir brunaþéttingar og tæknieinangrun á íslenskum mannvirkjum — vottuð kerfi frá Roxtec, Hilti og Promat.",
```

Length: ~160 characters, mirrors the EN string's information density. Adjust phrasing if the IS-team owner has stronger language; the requirement is "real prose, not `[TBD]`".

- [ ] **Step 3: Build and verify**

```bash
npm run build
grep -l 'TBD' _site/index.html _site/en/index.html
```

Zero matches in either home page.

- [ ] **Step 4: Commit**

```bash
git add src/_data/meta.js
git commit -m "G2/29: replace IS meta.description placeholder"
```

---

## Task 30: Final verification sweep

**Files:** none — verification only.

- [ ] **Step 1: Build clean**

```bash
npm run build
echo "exit:$?"
```

Expected exit code: **0**. All assertions in `scripts/check-build.js` pass. (The script was the failing safety net at the start of this plan; this build is the proof it now passes.)

- [ ] **Step 2: Parallel-slug parity**

```bash
for col in thjonusta geirar greinar about/team about/milestones about/principles; do
  echo "--- $col ---"
  diff <(ls src/content/is/$col/*.md 2>/dev/null | xargs -n1 basename | sort) \
       <(ls src/content/en/$col/*.md 2>/dev/null | xargs -n1 basename | sort)
done
```

Expected: empty diff for every collection.

- [ ] **Step 3: No literal Icelandic / English prose left in templates**

```bash
rg -nP '>[A-ZÁÉÍÓÚÝÞÆÖ][a-záéíóúýþæö ]{3,}<' src/content src/_includes
```

Expected matches are limited to: brand names from `_data/partners.js` (output via `{{ p.name }}`), `{{ … | i18n(lang) }}` substitutions, and partial includes. Any plain prose between angle brackets is a finding for follow-up.

- [ ] **Step 4: Per-locale collection sanity**

```bash
node -e "
import('./eleventy.config.js').then(() => {})
" 2>/dev/null
ls _site/thjonusta/    | grep -v 'index.html' | wc -l   # 7
ls _site/en/thjonusta/ | grep -v 'index.html' | wc -l   # 7
ls _site/geirar/       | grep -v 'index.html' | wc -l   # 8
ls _site/en/geirar/    | grep -v 'index.html' | wc -l   # 8
ls _site/greinar/      | grep -v 'index.html' | wc -l   # 10
ls _site/en/greinar/   | grep -v 'index.html' | wc -l   # 10
```

- [ ] **Step 5: All `_data/*.js` for migrated collections are gone**

```bash
ls src/_data/
```

Expected: `i18n.js`, `meta.js`, `partners.js` only. `services.js`, `sectors.js`, `articles.js`, `team.js`, `milestones.js`, `principles.js` all gone.

- [ ] **Step 6: Sitemap completeness**

```bash
rg -c '<url>' _site/sitemap.xml _site/en/sitemap.xml
```

Both ≥ 25.

- [ ] **Step 7: `locale_links` spot-check**

Open `/thjonusta/fireproofing/` in the dev server. Check that switching language (the utility-bar toggle) goes to `/en/thjonusta/fireproofing/` without 404.

- [ ] **Step 8: Visual spot-check matrix**

| Page | Visual check |
|---|---|
| `/`                       | Hero + 4 pillar cards + sectors callout + customer logos + CTA |
| `/en/`                    | Same shape, EN copy |
| `/thjonusta/`             | 7 service-feature blocks alternating left/right |
| `/thjonusta/fireproofing/`| Detail page renders with frontmatter copy + body markdown |
| `/geirar/`                | 8 sector cards linking to detail |
| `/geirar/energy/`         | Detail page renders |
| `/greinar/`               | 1 featured + 9 grid cards |
| `/greinar/handover-report-contents/` | Article detail with date / read time / author |
| `/about/`                 | Story + timeline (7 rows) + 6 principles + 7+1 team cards |
| `/verdreiknir/`           | Quote form (chrome via `| i18n`) + hero kicker from frontmatter |
| `/404.html`               | Hero + help links from frontmatter |

- [ ] **Step 9: Final commit (housekeeping, only if needed)**

Most tasks committed individually. If any uncommitted hunks remain from verification (e.g., a small frontmatter tweak surfaced during spot-check), commit them now with a tight scope-aligned message.

```bash
git status --porcelain
# If anything shows, review and commit with a message like:
# git commit -m "G2/30: post-verification adjustments"
```

---

## Dependencies and ordering

This plan supersedes / unblocks three other items in round 1:

- **C10** (`alternateUrl` filter rip-and-replace) — wait for this plan, then re-evaluate.
- **H5** (broken `featuredServices*` collections) — Task 1 re-adds them; Task 4 promotes `featured: true` onto the four pillar services. Resolved by Stage end.
- **H14** (inline SVG icon drift) — Task 18 extracts; Task 20 includes the partials in both home pages. Resolved.

This plan does NOT touch:
- **G12** (CSS overhaul) — runs after this lands so the per-section split can reflect the new collection-driven markup.
- **D2** (deviations doc reconcile) — runs after this plan to retire `docs/architecture-deviations.md` §3 (the deviation this plan resolves).
