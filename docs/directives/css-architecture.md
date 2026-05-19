# CSS Architecture Directive — bruna-is

This document defines the authoritative styling rules for the bruna-is site. Treat it as the single source of truth for how CSS is structured, named, and shipped. Deviations require a clearly documented rationale in the file where the deviation lives.

---

## 1. File layout + load order

`src/assets/css/` contains exactly 11 files, loaded in this order from `base.njk`:

```
tokens.css → reset.css → layout.css → nav.css → blocks.css → home.css → services.css → sectors.css → articles.css → about.css → quoter.css
```

| File | Responsibility |
|---|---|
| `tokens.css` | Design tokens — colors, type, spacing, radii, shadows, motion durations, breakpoints. Single source for raw values. |
| `reset.css` | Browser normalize + skip-link. |
| `layout.css` | Page chrome — container, site-header skeleton, site-footer skeleton, page-hero shell, utility bar, breadcrumb chrome, brand wordmark. |
| `nav.css` | Primary nav + mobile toggle. |
| `blocks.css` | Cross-page reusable CSS. Two sections inside: **atoms** (`.btn`, `.pagination`, `.hl-underline`) and **composed blocks** (`.cta-band`, `.article-card`, `.value-band`). |
| `home.css` | Home page family — hero, statement, explainer, pillars, leading, sectors strip, customers, accreds. |
| `services.css` | Services page family — services-intro, service-feature, process. |
| `sectors.css` | Sectors page family — sectors-intro, sector-card. |
| `articles.css` | Articles page family — articles, article-featured. |
| `about.css` | About page family — story, philosophy, team. |
| `quoter.css` | Quoter page family — quoter-section, quoter, quoter-row, quoter-total, quoter-customer. |

Every page ships every file (single bundle, no conditional loading). No additional CSS files. No inline `style=""` attributes. No `<style>` blocks in templates.

## 2. The split rule

When adding a selector, ask three questions in order:

1. **Does it appear on exactly one page family?** It lives in that page family's file.
2. **Does it appear on two or more page families?** It moves to `blocks.css` under either Atoms (single-purpose, no inherent layout — `.btn`, `.pagination`) or Composed blocks (laid-out reusable section — `.cta-band`, `.article-card`).
3. **Is it page chrome (shared by every page — header, footer, container, page-hero shell)?** It lives in `layout.css`.

A selector that drifts from rule 1 to rule 2 because a second page family adopts it is *moved* to `blocks.css` in the same commit — never duplicated.

## 3. Naming conventions

**BEM throughout.** Block, element, modifier:

```css
.card                /* block */
.card__title         /* element */
.card--featured      /* variant modifier */
```

**State via `data-*` attributes; variants via BEM modifiers.**

```css
.btn--primary, .btn--ghost              /* variants — stable design */
.nav-toggle[data-open="true"]           /* state — runtime/interaction */
.quoter-row[data-error="true"]
```

Rule of thumb: if JavaScript toggles it, it's a `data-*` attribute. If the page hard-codes it, it's a BEM modifier.

**No generic-name descendants.** The following names must always be block-scoped elements, never standalone:

`.row`, `.col`, `.pic`, `.ico`, `.body`, `.lead`, `.tag`, `.bg`, `.scrim`, `.crumbs`, `.label`, `.copy`, `.head`, `.meta`

For example: `.pillar__pic` not `.pillar .pic`; `.hero__crumbs` not `.hero .crumbs`.

**Page-family root scope.** Each page family's templates set a single root class on `<body>` (via the `bodyClass` data field on the layout or page): `.home-page`, `.about-page`, `.services-page`, `.sectors-page`, `.articles-page`, `.quoter-page`. The page-family CSS file scopes every rule under that root:

```css
.home-page .hero { ... }
.home-page .hero__title { ... }
```

This is defense-in-depth: load order isolates files in source, the scope class isolates rules at runtime.

## 4. Selector budget

**Max 2 levels of nesting after the page-family scope class.**

```css
.home-page .hero__title { ... }                            /* ✅ 1 */
.home-page .hero .hero__title { ... }                      /* ✅ 2 */
.home-page .hero .hero__media .hero__overlay { ... }       /* ❌ 3 */
```

If you reach for level 3, the block is too coarse — split it or rename the inner element.

**No `!important` without an inline rationale comment.** When it's the only way (third-party override, deliberate specificity war), leave a one-line comment with the reason directly above the declaration.

**No inline styles, no `<style>` blocks in templates.** Every rule lives in `src/assets/css/`.

## 5. Token discipline

`tokens.css` is the single source for color, type, spacing, radii, shadow, motion duration/easing, and breakpoints. Tokens are semantic-only — they describe *what something is*, not *where it goes*. A `--space-card-padding: 16px` token is wrong; that's a layout decision, lives in `.card`.

Outside `tokens.css`, no raw hex codes, no `rgba()` calls, no `px` magic numbers, no font-family literals. One carve-out: 1px borders (`border: 1px solid var(--line)`) are allowed inline since tokenizing them adds noise without payoff.

Build-time enforcement: `scripts/check-css.js` regex-checks every CSS file except `tokens.css` for raw hex, raw rgba, and raw px values. Build fails on violation.

## 6. Responsive — mobile-first

Each block's base styles target mobile (320px). Desktop is a `@media (min-width: …)` add-on — never the inverse.

```css
/* base = mobile */
.pillar-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-4);
}

/* desktop add-on */
@media (min-width: 64em) {
  .pillar-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-7);
  }
}
```

Breakpoints are tokens in `tokens.css`:

```css
--bp-md: 48em;   /* tablets — 768px */
--bp-lg: 64em;   /* desktop — 1024px */
--bp-xl: 80em;   /* wide — 1280px */
```

(Media queries cannot reference CSS custom properties for the breakpoint value — but the tokens document the canonical values and any new breakpoint added must update this list.)

Use container queries (`@container`) only for component-intrinsic reflow (a card that adapts to its column width regardless of viewport). For everything else use media queries.

## 7. Motion + accessibility

All transitions and animations honor `prefers-reduced-motion`. Tokenize durations in `tokens.css`:

```css
--transition-fast: 150ms ease;
--transition-base: 250ms ease;

@media (prefers-reduced-motion: reduce) {
  :root {
    --transition-fast: 0ms;
    --transition-base: 0ms;
  }
}
```

Consumers reference the token; the reduced-motion preference is respected automatically.

Infinite animations (spinners, skeleton pulse) need an explicit `@media (prefers-reduced-motion: reduce) { animation: none; }` in their block, plus a static visual fallback.

Use `:focus-visible` for keyboard-only focus rings. Browser default unless the design specifies a custom ring.

## 8. i18n — logical properties

Prefer logical properties everywhere:

```css
margin-inline: auto;          /* not margin-left + margin-right */
padding-block: var(--space-4); /* not padding-top + padding-bottom */
inset-inline-start: 0;        /* not left: 0 */
border-block-end: 1px solid; /* not border-bottom */
```

Use physical properties (`margin-left`, `top`) only when the design is intentionally side-anchored (e.g., a scrim that *must* be on the left regardless of writing direction).

Bruna is LTR-only today (IS + EN). This is hygiene rather than a functional requirement; cost is near-zero and the payoff is RTL-readiness if Arabic/Hebrew is ever added.

## 9. Comments + rationale

Non-trivial CSS blocks (overrides, hacks, browser-quirk workarounds, deliberately-broken specificity, `!important`) get a short comment explaining *why*. Trivial rules need no comment.

```css
/* Force above the Eleventy-img <picture> stacking context — Safari 17 paints
   pseudo-elements behind absolute children otherwise. */
.hero::after {
  z-index: 2;
}
```

Don't describe *what* the code does (the code does that); describe *why* the choice was made.

## Enforcement appendix

`scripts/check-css.js` (run by `npm run build`) machine-checks the following:

- **Token discipline:** zero raw hex (`#[0-9a-f]{3,8}`), zero `rgba()`, zero `\d+px` (except `1px solid` borders) outside `tokens.css`.
- **Selector depth:** every selector has at most 2 descendant combinators (excluding the page-family scope class).
- **`!important` without comment:** every `!important` must have a non-empty comment on the same line or the line immediately above.
- **Inline styles:** zero `style="…"` attributes in `_site/**/*.html`.
- **File count:** `src/assets/css/` contains exactly 11 `.css` files matching the canonical names.

Conventions enforced by review (no automated check):

- BEM naming.
- Page-family root scope.
- Mobile-first.
- Logical properties.
- Motion + reduced-motion safety.
- Comment rationale on non-trivial blocks.
