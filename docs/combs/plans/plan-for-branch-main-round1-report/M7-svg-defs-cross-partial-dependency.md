# M7 — Extract SVG `<defs>` into its own partial included from `base.njk`

**Severity:** Medium
**Specialty:** code-reviewer
**Files touched:**
- `src/_includes/partials/header.njk` (remove `<defs>` block)
- `src/_includes/partials/svg-defs.njk` (new file)
- `src/_includes/layouts/base.njk` (include new partial)

## Why

`partials/header.njk` currently defines the `#logo-wordmark` SVG symbol inside an inline `<defs>` block at lines 2–9. `partials/footer.njk:6` references that symbol via `<use href="#logo-wordmark"/>`. The footer therefore has an implicit ordering dependency on the header: it only renders correctly because `page.njk` includes the header before the footer.

This breaks modularity (`modularity.md`): each partial should be usable on its own and own its dependencies, not silently rely on a sibling partial's side effects. It also harms maintainability (`maintainability.md`) — a future layout that omits the header (e.g., a landing variant, an error page, or a print stylesheet test) will render a blank footer logo with no warning and no obvious cause.

The fix moves the `<defs>` block into a dedicated `partials/svg-defs.njk` included from `base.njk`, so the symbol is available to every page that extends `base.njk`, regardless of which header/footer combination is rendered. This avoids an external sprite file (no extra HTTP round-trip, no path management in a static-site context) while still decoupling the partials.

## What

1. Create `src/_includes/partials/svg-defs.njk` containing the `<svg class="svg-defs">…</svg>` block currently in `header.njk`.
2. Remove that block from `header.njk` so the partial only owns header markup.
3. Include `partials/svg-defs.njk` in `base.njk` as the first child of `<body>`, so the symbol is registered before any `<use>` reference renders.

Keeps hard requirements intact: vanilla Eleventy, no client-side routing, semantic HTML. Aligns with `FRAMEWORK-PORT-PROMPT.md` partials structure (one concern per partial under `_includes/partials/`).

## How

### New file: `src/_includes/partials/svg-defs.njk`

```njk
<svg class="svg-defs" width="0" height="0" aria-hidden="true">
  <defs>
    <symbol id="logo-wordmark" viewBox="0 0 360 60">
      <text x="0" y="46" class="bruna" fill="#ee7c1d">BRUNA</text>
      <text x="170" y="46" class="pett" fill="#1453a8">þéttingar</text>
    </symbol>
  </defs>
</svg>
```

### `src/_includes/partials/header.njk`

**Before** (lines 1–11):

```njk
{%- set navCollection = lang == 'is' and collections.navIs or collections.navEn %}
<svg class="svg-defs" width="0" height="0" aria-hidden="true">
  <defs>
    <symbol id="logo-wordmark" viewBox="0 0 360 60">
      <text x="0" y="46" class="bruna" fill="#ee7c1d">BRUNA</text>
      <text x="170" y="46" class="pett" fill="#1453a8">þéttingar</text>
    </symbol>
  </defs>
</svg>

<header class="site-header">
```

**After:**

```njk
{%- set navCollection = lang == 'is' and collections.navIs or collections.navEn %}
<header class="site-header">
```

Leave the rest of `header.njk` (lines 11–31) unchanged.

### `src/_includes/layouts/base.njk`

**Before** (lines 39–42):

```njk
  <body>
    {{ content | safe }}
    <script type="module" src="/assets/js/main.js"></script>
  </body>
```

**After:**

```njk
  <body>
    {% include "partials/svg-defs.njk" %}
    {{ content | safe }}
    <script type="module" src="/assets/js/main.js"></script>
  </body>
```

The `<svg class="svg-defs">` element is already `width="0" height="0" aria-hidden="true"` so placing it at the top of `<body>` has no visual or accessibility impact.

## Verification

1. `npx @11ty/eleventy` builds without errors.
2. View any rendered page (e.g., `_site/index.html` and `_site/en/index.html`): the `<svg class="svg-defs">` block appears once, immediately inside `<body>`, before the header.
3. Header logo (`.brand .logo`) and footer logo (`.brand--footer .logo`) both render the `BRUNA þéttingar` wordmark.
4. Temporarily comment out `{% include "partials/header.njk" %}` in `page.njk` and rebuild — the footer logo still renders, confirming the cross-partial dependency is gone. Revert the test edit.
5. Grep for any other `<use href="#logo-wordmark"/>` references to confirm none rely on header ordering: `rg 'logo-wordmark' src/`.
