# G1 — Image pipeline migration (inline backgrounds → `<img>` + eleventy-img)

**Severity:** Critical
**File(s):** `eleventy.config.js:19-30, 32-39, 72`; 34 inline-style occurrences across `src/content/{is,en}/**/*.njk`; `src/assets/css/main.css` (hero / page-hero / pillar / leading / article-card / article-featured / sector-card / service-feature selectors); `src/assets/css/responsive.css` (mobile overrides of the same selectors); `docs/architecture-deviations.md` §1.
**Specialty:** code-reviewer, consistency-auditor, simplifier, silent-failure-hunter
**Consolidates:** C2, H1, H17, M22

---

## What

Replace every decorative `style="background-image: url('/img/foo.jpg')"` in the page templates with a plain `<img>` tag processed by `@11ty/eleventy-img`. Restructure the surrounding sections so the previously-`background-image`'d `.bg` / `.pic` containers hold an absolutely-positioned `<img>` underneath their `.scrim` / content layer. Once every inline style is gone, delete the `prefixInlineUrls` regex transform (its premise no longer holds) and scope `addPassthroughCopy("src/img")` down to assets the plugin does not handle (the SVG/PDF case — none today, see Stage 5). After the migration the framework's mandated `<picture>` pipeline emits AVIF/WebP/JPEG at widths `[400, 800, 1200, "auto"]` on every page that has a hero or card image, and the spec line "No `<picture>` written by hand. Use `<img>` and let the plugin transform" is no longer in tension with anything in the repo.

This is the root of a small dependency chain: H1 (the `prefixInlineUrls` transform) and H17 (the overlap with `addPassthroughCopy`) are *only* live because of the inline-styles violation, and M22 was filed against the same 34 occurrences plus the (verified-absent) "stray non-image inline styles in header/footer" — see §"Where" for the corrected M22 inventory.

## Why

**User-visible cost today.** With zero `<img>` tags in any content template, `eleventy-img` never fires. `_site/img/` ships the originals unprocessed:

- no AVIF, no WebP — every device pays the JPEG tax
- no responsive widths — a mobile browser downloads the same ~1200px-wide hero JPEG as a desktop
- no `width` / `height` attributes — the browser cannot reserve layout space, hero areas reflow as the JPEG decodes (CLS contributor)
- no `loading="lazy"` on below-the-fold pillar / sector / article cards — they all download eagerly
- LCP today is whichever hero `.bg` paints first, served at full resolution to every viewport

A typical home-page render downloads `iceland_svartsengi.jpg` + four pillar JPEGs + `iceland_karahnjukar.jpg` + four sector JPEGs — every one of them at original resolution, every one of them JPEG-only. After this migration the same page emits `<picture>` blocks with AVIF first, WebP second, JPEG fallback, plus a `srcset` covering `400/800/1200` widths.

**Spec contract.** `docs/instructions/FRAMEWORK-PORT-PROMPT.md` §"Images" and §"Conventions" are unambiguous:

> Write plain `<img src="..." alt="..." width="..." height="...">` — the `eleventy-img` plugin transforms it into a responsive `<picture>` at build time. Don't write `<picture>` markup by hand.

> No inline styles or `<style>` blocks in templates. […] No `<picture>` written by hand. Use `<img>` and let the plugin transform.

The user's focus brief item #2 (verbatim: *"Image handling via @11ty/eleventy-img exactly as the Somethings repo does […] Hand-written `<picture>`, raw `<img>` without eleventy-img processing, or any other image pipeline is a finding"*) explicitly overrides the pre-accepted deviation recorded in `docs/architecture-deviations.md` §1.

**Why H1/H17 also have to come out.** `prefixInlineUrls` is a regex transform that exists *solely* to patch the inline `url(...)` references that `HtmlBasePlugin` doesn't touch. Its regex is also silent-failure-prone: it matches only double-quoted style attributes, only the first `url()` per attribute, and only `.html` outputs. The moment we delete the inline styles, the transform's premise is gone — keeping it would be dead infrastructure (`simplicity.md` §4). Likewise `addPassthroughCopy("src/img")` is a parallel pipeline that delivers unprocessed originals; once `eleventy-img` is actually firing, the plugin emits the processed copies and the passthrough is redundant (and serves the wrong format).

## Where

### Inline `style="background-image: …"` inventory (34 occurrences, IS + EN parallel)

Verified via `grep -rn 'style=' src/_includes src/content` on the working tree.

**Hero pattern — `<section class="hero">` with `.bg + .scrim` (home page only):**

- `src/content/is/index.njk:10` — `/img/iceland_svartsengi.jpg`
- `src/content/en/index.njk:10` — `/img/iceland_svartsengi.jpg`

**Page-hero pattern — `<section class="page-hero">` with `.bg + .scrim` (every non-home page):**

- `src/content/is/thjonusta/index.njk:10` — `/img/iceland_svartsengi.jpg`
- `src/content/is/geirar/index.njk:10` — `/img/iceland_alcoa_reydar.jpg`
- `src/content/is/about/index.njk:10` — `/img/iceland_hellisheidi.jpg`
- `src/content/is/verdreiknir/index.njk:10` — `/img/documentation.jpg`
- `src/content/is/greinar/index.njk:13` — `/img/documentation.jpg`
- `src/content/is/greinar/article.njk:15` — `{{ article.image }}` (paginated, 10 outputs per locale)
- `src/content/is/404.njk:8` — `/img/iceland_lava_landscape.jpg`
- *(mirror set in `src/content/en/` for all of the above)*

**Pillar `.pic` pattern — home page only:**

- `src/content/is/index.njk:67` — `/img/server_room.jpg`
- `src/content/is/index.njk:84` — `/img/engineer_install.jpg`
- `src/content/is/index.njk:101` — `/img/isogenopak_roll.jpg` *plus the `background-size: contain; background-color: #f1f3f6; background-repeat: no-repeat;` quirk — see Stage 2*
- `src/content/is/index.njk:118` — `/img/industrial_plant.jpg`
- *(mirror in `en/index.njk:67, 86, 105, 124`)*

**`.leading .pic` — home page badge image:**

- `src/content/is/index.njk:182` — `/img/iceland_karahnjukar.jpg` (contains `.badge` overlay)
- `src/content/en/index.njk:192`

**Service-feature `.pic` — iterated from `src/_data/services.js`:**

- `src/content/is/thjonusta/index.njk:34` — `style="background-image: url('{{ s.image }}');"` *plus a `{% if s.imageContain %} contain{% endif %}` modifier driven by `services.js:imageContain`*
- `src/content/en/thjonusta/index.njk:34`

**Article-featured + article-card `.pic` — iterated from `src/_data/articles.js`:**

- `src/content/is/greinar/index.njk:26` — featured `.pic` (`{{ featured.image }}`)
- `src/content/is/greinar/index.njk:43` — card `.pic` (`{{ article.image }}`, contains `.tag` overlay)
- `src/content/en/greinar/index.njk:26, 43`

**Sector-card `.pic` — iterated from `src/_data/sectors.js`:**

- `src/content/is/geirar/index.njk:35` — `{{ s.image }}` (contains `.badge` overlay)
- `src/content/en/geirar/index.njk:35`

### `eleventy.config.js` targets

- Lines **19–30**: `addTransform("prefixInlineUrls", …)` — delete after Stages 1–4 are done. The transform's regex only matches double-quoted style attributes, only the first `url()` per attribute, and skips non-`.html` outputs; none of these limits matter once the inline styles are gone, because the regex will match zero callsites.
- Lines **32–39**: `addPlugin(eleventyImageTransformPlugin, …)` — keep as-is; `widths: [400, 800, 1200, "auto"]` already matches the framework spec.
- Line **72**: `addPassthroughCopy("src/img")` — scope down or remove. After Stages 1–4, every reference to a file under `src/img/` flows through the plugin transform. The passthrough emits unprocessed `_site/img/foo.jpg` for every file, which (a) wastes ~40MB of build output, (b) creates two URLs for the same logical asset, (c) silently masks any missing-source error. See Stage 5 for the exact decision.

### CSS sections that need restructuring

All in `src/assets/css/main.css`:

- `.hero` + `.hero .bg` + `.hero .scrim` + `.hero .container` — lines **142–166**
- `.page-hero` + `.page-hero .bg` + `.page-hero .scrim` + `.page-hero .container` — lines **712–734**
- `.pillar` + `.pillar .pic` + `.pillar .pic::after` + `.pillar .pic .ico` — lines **275–306**
- `.leading .pic` + `.leading .pic .badge` — lines **449–469**
- `.article-featured` + `.article-featured .pic` — lines **971–980**
- `.article-card` + `.article-card .pic` + `.article-card .pic .tag` — lines **1017–1036**
- `.sector-card` + `.sector-card .pic` + `.sector-card .pic .badge` — lines **1092–1115**
- `.service-feature .pic` + `.service-feature .pic.contain` — lines **1186–1196**

Plus the responsive overrides in `src/assets/css/responsive.css` lines **15–22, 87–100** which target the same selectors and need their min-height / aspect-ratio rules re-applied to the wrapper rather than to the now-absent `background-size: cover` container.

### M22 — corrected inventory

The findings brief claims `src/_includes/partials/header.njk:2` has `style="position:absolute"` on the SVG defs and `src/_includes/partials/footer.njk:5` has `style="margin-bottom: 22px;"` on the brand anchor. **Verified — neither exists on the working tree.** Header line 2 is `<svg class="svg-defs" width="0" height="0" aria-hidden="true">` (no inline style; the off-screen positioning is handled by the `.svg-defs` class), and footer line 5 is `<a href="{{ '/' | locale_url }}" class="brand brand--footer">` (no `margin-bottom`). M22 collapses entirely into the 34 background-image occurrences above. After the migration, `grep -rn 'style=' src/_includes src/content` should return 0 — explicit verification step in §"Expected Outcome".

### `docs/architecture-deviations.md` §1

Pre-accepts the inline-background-images deviation. Once this fix lands, **that section must be deleted** (not just edited) and the file's intro paragraph reduced from "Three places" to "Two places". See Stage 5.

## How

### Stage 1 — Hero / page-hero pattern (`.bg + .scrim` → `<img>` + `.scrim`)

The recurring shape today is:

```njk
<section class="hero">
  <div class="bg" style="background-image: url('/img/iceland_svartsengi.jpg');"></div>
  <div class="scrim"></div>
  <div class="container">…</div>
</section>
```

with CSS that absolutely positions both `.bg` (`background-size: cover; background-position: center; opacity: 0.5`) and `.scrim` (linear-gradient) to `inset: 0`. The content layer is `position: relative; z-index: 2`.

The migration replaces `<div class="bg" style="…">` with a foreground `<img>`, keeps the `.scrim` overlay, and lets the wrapper handle the `position: relative; overflow: hidden` it already has.

**`src/content/is/index.njk` — Before (line 9–19):**

```njk
<section class="hero">
  <div class="bg" style="background-image: url('/img/iceland_svartsengi.jpg');"></div>
  <div class="scrim"></div>
  <div class="container">
    <div class="crumbs"><a href="/">Heim</a> &nbsp;/&nbsp; <span>Lausnir</span></div>
    <h1>
      Brunaþéttingar &amp;<br>tæknieinangrun.
      <span class="accent-bar"></span>
    </h1>
  </div>
</section>
```

**After:**

```njk
<section class="hero">
  <img class="hero__image" src="/img/iceland_svartsengi.jpg" alt="" width="1600" height="900" eleventy:widths="400,800,1200,1600">
  <div class="scrim"></div>
  <div class="container">
    <div class="crumbs"><a href="/">Heim</a> &nbsp;/&nbsp; <span>Lausnir</span></div>
    <h1>
      Brunaþéttingar &amp;<br>tæknieinangrun.
      <span class="accent-bar"></span>
    </h1>
  </div>
</section>
```

Notes:

- `alt=""` because the image is decorative — the `<h1>` carries the meaning.
- `width="1600" height="900"` is the aspect ratio of the source JPEG (verify with `identify src/img/iceland_svartsengi.jpg` per file; pick the closest 16:9 dimensions if the source is exotic). The plugin uses these as the layout reservation; CSS overrides the rendered size.
- The `eleventy:widths` attribute is optional; the plugin defaults to the configured `[400, 800, 1200, "auto"]`. Include it only if a specific hero needs a different ladder.
- `loading="lazy" decoding="async"` are added by the plugin from `htmlOptions.imgAttributes`. For the LCP hero on the home page consider an `eleventy:loading="eager" fetchpriority="high"` override — but only on the home-page hero, not the page-hero on subpages. See Stage 1b.

**`src/assets/css/main.css` — Before (lines 142–166):**

```css
.hero {
  position: relative;
  min-height: 540px;
  background: var(--bg-dark);
  color: #fff;
  overflow: hidden;
  display: flex; align-items: flex-end;
}
.hero .bg {
  position: absolute; inset: 0;
  background-size: cover; background-position: center;
  opacity: 0.5;
}
.hero .scrim {
  position: absolute; inset: 0;
  background: linear-gradient(180deg,
    rgba(10,13,18,0.4) 0%,
    rgba(10,13,18,0.2) 40%,
    var(--alpha-scrim-strong) 100%);
}
.hero .container {
  position: relative; z-index: 2;
  …
}
```

**After:**

```css
.hero {
  position: relative;
  min-height: 540px;
  background: var(--bg-dark);
  color: #fff;
  overflow: hidden;
  display: flex; align-items: flex-end;
}
.hero__image {
  position: absolute; inset: 0;
  width: 100%; height: 100%;
  object-fit: cover; object-position: center;
  opacity: 0.5;
  z-index: 0;
}
.hero .scrim {
  position: absolute; inset: 0;
  z-index: 1;
  background: linear-gradient(180deg,
    rgba(10,13,18,0.4) 0%,
    rgba(10,13,18,0.2) 40%,
    var(--alpha-scrim-strong) 100%);
}
.hero .container {
  position: relative; z-index: 2;
  …
}
```

The crucial swap: `background-size: cover; background-position: center` → `object-fit: cover; object-position: center`. The `opacity: 0.5` carries over verbatim. Explicit `z-index: 0` and `z-index: 1` were implicit in source-order stacking under the old `.bg + .scrim` layout — make them explicit so the rendered picture stays behind the scrim regardless of the plugin's emitted `<picture><source><img></picture>` source order.

The `eleventy-img` plugin emits `<picture>` wrapping the `<img>`. The CSS selector `.hero__image` lives on the `<img>` — the plugin preserves the class. The `<picture>` element wraps the `<img>` with `display: contents`-equivalent default behaviour, so absolute positioning on the `<img>` reaches the `.hero` parent through the `<picture>` correctly.

**Page-hero pattern** is identical in shape. Apply the same swap to `src/assets/css/main.css:712–734` (turn `.page-hero .bg` into `.page-hero__image`) and replace `<div class="bg" style="…">` with `<img class="page-hero__image" …>` in:

- `is/thjonusta/index.njk:10`, `en/thjonusta/index.njk:10`
- `is/geirar/index.njk:10`, `en/geirar/index.njk:10`
- `is/about/index.njk:10`, `en/about/index.njk:10`
- `is/verdreiknir/index.njk:10`, `en/verdreiknir/index.njk:10`
- `is/greinar/index.njk:13`, `en/greinar/index.njk:13`
- `is/greinar/article.njk:15`, `en/greinar/article.njk:15` *(uses `{{ article.image }}`)*
- `is/404.njk:8`, `en/404.njk:8`

For `article.njk` the path is dynamic:

```njk
<img class="page-hero__image" src="{{ article.image }}" alt="" width="1600" height="900">
```

`article.image` is already root-anchored (`/img/documentation.jpg` etc.) — `eleventy-img` resolves that relative to the input directory (`src/`), so `/img/documentation.jpg` → `src/img/documentation.jpg`. No data-file change needed; see Stage 4.

**Stage 1b — LCP optimization on the home-page hero (optional, separate commit):**

After Stage 1 lands, the home-page hero `<img>` is the LCP element on `/` and `/en/`. The plugin's default `loading="lazy"` is wrong for it. Override on that one image:

```njk
<img class="hero__image" src="/img/iceland_svartsengi.jpg" alt="" width="1600" height="900"
     eleventy:loading="eager" fetchpriority="high">
```

Leave every page-hero `<img>` lazy — they're below the navigation fold once the user has scrolled past the home page.

### Stage 2 — Pillar `.pic` pattern (with icon overlay + `contain` quirk)

Pillar cards are home-only. Each pillar today is:

```njk
<a class="pillar" href="/thjonusta/">
  <div class="pic" style="background-image: url('/img/server_room.jpg');">
    <div class="ico"><svg …/></div>
  </div>
  <div class="body">
    <h3>Brunaþéttingar og lausnir</h3>
    …
  </div>
</a>
```

CSS gives `.pillar .pic { height: 260px; background-size: cover; background-position: center; }` with a `::after` scrim and an absolutely-positioned `.ico` badge in the corner.

The migration treats `.pic` as a sized frame (`position: relative; overflow: hidden; height: 260px`) and the `<img>` as an absolutely-positioned child. The `.ico` and `::after` stay on `.pic` and inherit higher `z-index`.

**Before (`src/content/is/index.njk:66–69`):**

```njk
<a class="pillar" href="/thjonusta/">
  <div class="pic" style="background-image: url('/img/server_room.jpg');">
    <div class="ico"><svg …/></div>
  </div>
```

**After:**

```njk
<a class="pillar" href="/thjonusta/">
  <div class="pic">
    <img class="pillar__image" src="/img/server_room.jpg" alt="" width="1200" height="800">
    <div class="ico"><svg …/></div>
  </div>
```

**CSS (`src/assets/css/main.css:287–306`) — Before:**

```css
.pillar .pic {
  height: 260px; position: relative;
  background-size: cover; background-position: center;
  overflow: hidden;
}
.pillar .pic::after {
  content: ""; position: absolute; inset: 0;
  background: linear-gradient(180deg, var(--alpha-scrim-soft) 0%, var(--alpha-scrim-med) 100%);
}
.pillar .pic .ico {
  position: absolute; left: 32px; top: 32px;
  width: 56px; height: 56px;
  background: var(--accent); color: #fff;
  display: grid; place-items: center;
  z-index: 2;
}
```

**After:**

```css
.pillar .pic {
  height: 260px; position: relative;
  overflow: hidden;
}
.pillar__image {
  position: absolute; inset: 0;
  width: 100%; height: 100%;
  object-fit: cover; object-position: center;
  z-index: 0;
}
.pillar .pic::after {
  content: ""; position: absolute; inset: 0;
  z-index: 1;
  background: linear-gradient(180deg, var(--alpha-scrim-soft) 0%, var(--alpha-scrim-med) 100%);
}
.pillar .pic .ico {
  position: absolute; left: 32px; top: 32px;
  width: 56px; height: 56px;
  background: var(--accent); color: #fff;
  display: grid; place-items: center;
  z-index: 2;
}
```

**The `contain` quirk — `is/index.njk:101` and `en/index.njk:105`.** The third pillar uses the source image as a product shot, not a backdrop: `background-image: url('/img/isogenopak_roll.jpg'); background-size: contain; background-color: #f1f3f6; background-repeat: no-repeat;`. The mockup intent is "show this product image on a light grey card without cropping it." Migrate this to a modifier class:

**Template:**

```njk
<a class="pillar" href="/thjonusta/">
  <div class="pic pic--contain">
    <img class="pillar__image pillar__image--contain" src="/img/isogenopak_roll.jpg" alt="" width="1200" height="800">
    <div class="ico"><svg …/></div>
  </div>
```

**CSS additions:**

```css
.pillar .pic--contain {
  background-color: #f1f3f6;
}
.pillar__image--contain {
  object-fit: contain;
  /* no background-color here — that lives on the .pic frame */
}
```

The `::after` scrim should be suppressed on `.pic--contain` (a product photo against a light bg doesn't need the dark gradient that's appropriate for landscape backdrops):

```css
.pillar .pic--contain::after {
  display: none;
}
```

### Stage 3 — Service-feature `.pic` (iterated, with `imageContain` flag)

`src/content/is/thjonusta/index.njk:32–49` iterates `services` and outputs:

```njk
{%- for s in services %}
<article class="service-feature{% if loop.index0 % 2 == 1 %} flip{% endif %}">
  <div class="pic{% if s.imageContain %} contain{% endif %}" style="background-image: url('{{ s.image }}');"></div>
  <div class="copy">…</div>
</article>
{%- endfor %}
```

**After:**

```njk
{%- for s in services %}
<article class="service-feature{% if loop.index0 % 2 == 1 %} service-feature--flip{% endif %}">
  <div class="service-feature__media{% if s.imageContain %} service-feature__media--contain{% endif %}">
    <img class="service-feature__image{% if s.imageContain %} service-feature__image--contain{% endif %}"
         src="{{ s.image }}" alt="" width="1200" height="900">
  </div>
  <div class="copy">…</div>
</article>
{%- endfor %}
```

(Class renames are the BEM-style names you'd use if you started fresh. If you'd rather minimize churn for G12, keep `.pic`/`.contain` and just nest the `<img>` inside. The renames are optional but recommended — see "Considered alternatives".)

**CSS (`src/assets/css/main.css:1186–1196`) — Before:**

```css
.service-feature .pic {
  aspect-ratio: 4 / 3;
  background-size: cover; background-position: center;
  position: relative;
}
.service-feature .pic.contain {
  background-size: contain;
  background-color: #f1f3f6;
  background-repeat: no-repeat;
  background-position: center;
}
```

**After:**

```css
.service-feature .pic {
  aspect-ratio: 4 / 3;
  position: relative;
  overflow: hidden;
}
.service-feature .pic > img {
  position: absolute; inset: 0;
  width: 100%; height: 100%;
  object-fit: cover; object-position: center;
}
.service-feature .pic.contain {
  background-color: #f1f3f6;
}
.service-feature .pic.contain > img {
  object-fit: contain;
}
```

This keeps the original BEM-light naming (`.pic`, `.contain`) intact and just retargets the `cover`/`contain` decision from `background-size` to `object-fit`. G12 will revisit naming.

Responsive override at `responsive.css:90`:

```css
.service-feature .pic {
  min-height: 240px;
}
```

stays as-is — `min-height` on the wrapper still works.

### Stage 4 — Article-featured / article-card / sector-card

Three card variants follow the same shape and the same template pattern. They iterate `articles` / `sectors` data and use root-anchored paths.

**`src/content/is/greinar/index.njk:24–55` (and `en/`) — Before:**

```njk
<a class="article-featured" href="/greinar/{{ featured.slug }}/">
  <div class="pic" style="background-image: url('{{ featured.image }}');"></div>
  <div class="body">…</div>
</a>

<div class="article-grid">
  {%- for article in rest %}
  <a class="article-card" href="/greinar/{{ article.slug }}/">
    <div class="pic" style="background-image: url('{{ article.image }}');">
      <span class="tag">{{ article.category[lang] }}</span>
    </div>
    <div class="body">…</div>
  </a>
  {%- endfor %}
</div>
```

**After:**

```njk
<a class="article-featured" href="/greinar/{{ featured.slug }}/">
  <div class="pic">
    <img src="{{ featured.image }}" alt="" width="1200" height="900">
  </div>
  <div class="body">…</div>
</a>

<div class="article-grid">
  {%- for article in rest %}
  <a class="article-card" href="/greinar/{{ article.slug }}/">
    <div class="pic">
      <img src="{{ article.image }}" alt="" width="1200" height="900">
      <span class="tag">{{ article.category[lang] }}</span>
    </div>
    <div class="body">…</div>
  </a>
  {%- endfor %}
</div>
```

**CSS additions** to `main.css` (next to the existing `.article-featured .pic` / `.article-card .pic` blocks at 976–980 / 1024–1028):

```css
.article-featured .pic {
  position: relative;
  overflow: hidden;
  height: 100%; min-height: 360px;
}
.article-featured .pic > img {
  position: absolute; inset: 0;
  width: 100%; height: 100%;
  object-fit: cover; object-position: center;
}
.article-card .pic {
  position: relative;
  overflow: hidden;
  height: 200px;
}
.article-card .pic > img {
  position: absolute; inset: 0;
  width: 100%; height: 100%;
  object-fit: cover; object-position: center;
}
```

Drop `background-size: cover; background-position: center;` from those two existing blocks — they're vestigial after the swap.

**Sector-card** (`src/content/is/geirar/index.njk:34–48`) follows the identical shape — wrap the `<img>` inside the `.pic` div, keep the `<span class="badge">` as the second child, drop the inline `background-image` style, and add the same `position: absolute; inset: 0; object-fit: cover` rule scoped to `.sector-card .pic > img` in `main.css` next to the existing `.sector-card .pic` block at 1103–1107.

**`.leading .pic` (home, `src/content/is/index.njk:182`)** is structurally identical: a `.pic` container with a `.badge` child. Same migration — `<img>` becomes the first child, badge stays as the absolutely-positioned overlay, CSS swap from `background-size: cover` to `object-fit: cover` on a new `.leading .pic > img` rule.

**Alt text for data-driven images.** Today the source images are decorative (the page hero is illustrative; the article-card image is an editorial photo). For the migration, use `alt=""` on the data-driven images too — that's the spec-correct call when the surrounding text already names the article / sector. If the team later wants meaningful alt text per entry, add an `imageAlt: { is, en }` field to the data files and pipe it through. **Out of scope here** — flagged for a future content-quality phase.

### Stage 5 — Cleanup

Once Stages 1–4 are in and `grep -rn 'style=' src/_includes src/content` returns 0, do the cleanups in a single commit:

**5a. Delete the `prefixInlineUrls` transform** (`eleventy.config.js:15-30`):

```js
// HtmlBasePlugin only rewrites href/src attributes — it doesn't touch
// `url(...)` references inside inline `style` attributes. Many mockup
// pages use `<div style="background-image: url('/img/foo.jpg')">`, so
// we patch those manually here.
eleventyConfig.addTransform("prefixInlineUrls", function (content) {
  if (!this.page?.outputPath?.endsWith(".html")) return content;
  const prefix = "/bruna-is";
  return content.replace(
    /style="([^"]*url\([^"]+)"/g,
    (match, styleBody) =>
      `style="${styleBody
        .replace(/url\(\s*'\/(?!bruna-is\/)/g, `url('${prefix}/`)
        .replace(/url\(\s*"\/(?!bruna-is\/)/g, `url("${prefix}/`)
        .replace(/url\(\s*\/(?!bruna-is\/)/g, `url(${prefix}/`)}"`
  );
});
```

→ delete the entire block (lines 15–30 inclusive of the explanatory comment). `HtmlBasePlugin` continues to rewrite the `src` attribute on every `<img>` (and the `srcset` on the plugin's emitted `<source>` elements) — that's its native scope. No transform replacement needed.

**5b. Remove `addPassthroughCopy("src/img")`** (`eleventy.config.js:72`):

After Stages 1–4, every reference to `src/img/*.jpg` flows through `eleventy-img`. The passthrough copy is dead weight. Verify with `find src/img -type f -not -name '*.jpg'` — current contents are 30 `.jpg` files only, every one of which is referenced from a template via the patterns above. There is no SVG, favicon, or PDF in `src/img/` today that would need passthrough.

→ delete line 72 (`eleventyConfig.addPassthroughCopy("src/img");`).

If a future asset (favicon, social-card PNG, robots image, OG image) needs to be served as-is without `<picture>` wrapping, put it under `src/assets/img/` so it flows through the existing `addPassthroughCopy("src/assets")` on line 70. Don't reintroduce the broad `src/img` passthrough.

**5c. Edit `docs/architecture-deviations.md`:**

Delete §1 entirely (lines 5–20 in the current file). Update the intro paragraph from "Three places where the current Eleventy port diverges" to "Two places". Renumber the remaining two sections (§2 → §1, §3 → §2). This is the spec-contract record — leaving §1 in place after migrating would be a documentation lie.

**5d. (M22 verification only — no code change.)** Re-run `grep -rn 'style=' src/_includes src/content`. Confirm the result is empty. The header/footer "stray inline styles" the brief flagged are already absent on the working tree (see §"Where" → "M22 corrected inventory"); the only inline styles in the repo were the 34 background-images, now gone.

## Expected Outcome

After this fix:

- `grep -rn 'style=' src/_includes src/content` returns **0 matches**.
- `grep -rn '<picture>' _site` returns >0 matches per page with images (one per hero, one per pillar/card/sector image). On the home page alone: 1 hero + 4 pillars + 1 leading-badge + 4 sectors = 10 `<picture>` blocks per locale.
- `grep -rn 'prefixInlineUrls' eleventy.config.js` returns **0**.
- `grep -rn 'addPassthroughCopy("src/img")' eleventy.config.js` returns **0**.
- `find _site/img -type f` shrinks substantially — only the plugin's processed outputs under the configured cache directory remain (under `_site/img/<hash>-<width>.{avif,webp,jpeg}`), not the raw originals.
- `npm run build` succeeds; spot-check via `npx serve _site` that `/`, `/en/`, `/thjonusta/`, `/geirar/`, `/about/`, `/greinar/`, `/greinar/<slug>/`, `/verdreiknir/`, and `/404.html` (plus `/en/` mirrors) render with all hero / pillar / card / sector images visible.
- Visual fidelity check on desktop (≥ 64em) and mobile (< 64em) against `main` — heroes, pillars, sectors, article cards, service-feature blocks all render visually identical to current state. The opacity/scrim composition is preserved because Stage 1's CSS keeps `opacity: 0.5` on `.hero__image` / `.page-hero__image` and keeps the `.scrim` overlay verbatim.
- LCP improves: the home-page hero `<img>` is served as AVIF at the viewport's actual width (e.g., 400 on mobile, 1200 on desktop) instead of a single full-resolution JPEG. Verify in Chrome DevTools → Network with throttling on, and via Lighthouse Performance score (run `npx @lhci/cli autorun` or DevTools' Lighthouse panel against `/` mobile preset before and after).
- `docs/architecture-deviations.md` no longer lists the `<picture>` pipeline as an accepted deviation; the document is now down to two entries (raw CSS values, data-files-not-Markdown-collections).

## Scope

**In scope:**

- The 34 inline `background-image` occurrences across `src/content/{is,en}/**/*.njk` (Stages 1–4).
- Restructuring of the corresponding CSS rules in `src/assets/css/main.css` to position foreground `<img>` elements (Stages 1–4).
- Responsive overrides in `src/assets/css/responsive.css` (lines 15–22, 87–100) — verify they still apply correctly to the new wrapper structure; adjust only if a media query stops matching after the swap.
- Deletion of the `prefixInlineUrls` transform and the broad `src/img` passthrough in `eleventy.config.js` (Stage 5).
- Update to `docs/architecture-deviations.md` §1 (Stage 5c).
- Verification that no stray non-image inline styles exist (M22 sweep, Stage 5d).

**Out of scope:**

- Any further CSS architecture changes (G12 — the broader CSS overhaul / BEM rename / token-migration pass). G1 makes the minimum CSS edits needed to keep visual parity after the HTML swap; G12 owns the rest.
- CSS naming changes beyond the optional `service-feature__media` rename in Stage 3.
- Content-model changes (G2): no migration of `services` / `sectors` / `articles` from `_data/` JS files to Markdown collections. The data files stay where they are; only their consumers swap how the image is rendered.
- Adding `imageAlt` fields to `_data/articles.js` / `_data/sectors.js` / `_data/services.js`. Decorative `alt=""` for now; meaningful alt-text per entry is a separate content phase.
- LCP optimization beyond the single home-page hero `eleventy:loading="eager"` override (Stage 1b is optional).
- Mockup updates (`mockup/*.html`). The mockup is reference material, not shipped output; we don't need to migrate it.
- Browser-test automation (Playwright/Lighthouse-in-CI). Manual visual verification is the bar.

**Dependency note for the milestone:** G1 is the root of the H1 / H17 / M22 dependency chain — nothing in those findings is actionable until the inline styles are gone. G1 should therefore land **before G12** (the CSS overhaul), so that G12's restructuring already has the `<img>`-based hero/card selectors to work with rather than the soon-to-be-deleted `background-image` selectors. G1 should also land before any retest of D1 (Lighthouse pass) since LCP / image-format scores will move materially.

## Directive citations

- **`FRAMEWORK-PORT-PROMPT.md` §"Images"** — the framework's explicit contract: `<img>` → `<picture>` via `eleventy-img`, no hand-written `<picture>`, image paths root-anchored or markdown-relative.
- **`FRAMEWORK-PORT-PROMPT.md` §"Conventions"** — "No inline styles or `<style>` blocks in templates." That rule has no exception for `background-image` URLs.
- **`simplicity.md` §4 (Minimal diffs)** — H1's `prefixInlineUrls` transform exists only to patch a violation; once the violation is gone, the transform is dead code and must come out in the same change-set that removes its premise. Leaving it would be the "half-implementation" §4.2 specifically warns against.
- **`simplicity.md` §1 (YAGNI)** — H17's parallel `addPassthroughCopy("src/img")` pipeline ships pre-emptively for a use case that no longer exists; remove rather than keep "just in case."
- **`consistency.md`** — the reference implementation at `/Users/olafur/Development/somethings/src/_includes/layouts/work.njk` establishes the pattern. The mockup's CSS-background convention is a vestige of mockup-as-HTML; the framework is the contract.
- **`quality.md`** — the verification steps in §"Expected Outcome" (`grep`-based assertions, visual parity check, Lighthouse delta) are evidence-before-assertion gates per `quality.md`'s rule that verification commands must produce observable output before any "done" claim.
- **`maintainability.md`** — three image-handling pipelines today (`<img>` plugin, `background-image` + regex transform, broad passthrough) collapse into one. Future developers see one path, not three.

## Considered alternatives

- **Keep `background-image` but route through a Nunjucks shortcode that calls `eleventy-img` imperatively (e.g., a `{% bgimage … %}` that emits a `<style>` block with multiple `image-set()` sources).** Rejected: hand-rolled image processing duplicates the transform pipeline, still violates the no-inline-styles rule, and the resulting CSS doesn't give the browser the same `srcset` + format negotiation it gets from `<picture>`. Stays a deviation, just a more elaborate one.
- **Migrate the CSS to `image-set()` with AVIF / WebP / JPEG fallbacks instead of `<picture>`.** Rejected: the framework spec explicitly mandates `<picture>` via the plugin. `image-set()` lacks the format negotiation `<picture>`'s `<source type="…">` provides and gives no `width`/`height` hint to the browser (CLS-prevention). Deviating chains the project to a different responsive-image story than the Somethings reference.
- **Rename every affected class to BEM (`hero__image`, `page-hero__image`, `pillar__image`, `service-feature__media`, `article-card__image`, `sector-card__image`) in this same commit.** Partially adopted (Stage 1 introduces `.hero__image` and `.page-hero__image` because those are net-new classes; Stages 2–4 keep the existing `.pic`/`.contain` names). Full BEM rename across all card variants is G12's responsibility — keeping G1 minimal-diff keeps the visual-fidelity test crisp.
- **Leave `addPassthroughCopy("src/img")` in place as a safety net** (in case any future template forgets to use `<img>`). Rejected: it would mask exactly the kind of mistake the framework wants to surface (`silent-failure-hunter`'s concern). A missing `<img>` should fail loud, not silently fall back to an unprocessed JPEG.
- **Do this in a separate locale-at-a-time PR (IS first, then EN).** Rejected: the two locales are exact mirrors. Diff cost is identical; review cost is lower if both move together. Stage by section type, not by locale.
