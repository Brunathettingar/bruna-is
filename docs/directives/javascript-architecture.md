# JavaScript Architecture Directive — bruna-is

This document defines the authoritative rules for the client-side JavaScript layer on the bruna-is site. Treat it as the single source of truth for how JS is structured, initialized, and torn down. Deviations require a documented rationale where the deviation lives.

The runtime is **vanilla ES modules in the browser, no bundler, no framework**. Navigation between internal URLs goes through **Swup** (partial-document swap) — it is not a full reload and it is not a client-side router with route definitions. The single contract every script must respect is the **Swup lifecycle**: every page swap re-runs init code, and every previous swap's listeners must be torn down atomically.

---

## 1. File layout + entry point

`src/assets/css/` and `src/img/` are companions; `src/assets/js/` holds the entire client-side layer:

```
src/assets/js/
├── main.js              ← single entry; loaded as <script type="module">
├── mobileNav.js         ← feature module
├── quoteCalculator.js   ← feature module
└── quote-config.js      ← pure data (pricing constants), imported by quoteCalculator
```

| File | Role |
|---|---|
| `main.js` | Single entry point. Owns the Swup instance, the `AbortController`, and the `bootstrap()` function that re-runs every init on each navigation. Loaded via `<script type="module">` from `layouts/base.njk`. |
| Feature modules (`mobileNav.js`, `quoteCalculator.js`) | Export one `initX({ signal })` function per feature. Each query-bails-attaches on the current document. No top-level side effects. |
| Data modules (`quote-config.js`) | Pure constants and pure helpers. Imported by a feature module. No DOM access. |

**One module = one feature.** A second behavior on the same page family means a second module, not a new branch inside an existing one. Co-locate data with its consumer (e.g. `quote-config.js` next to `quoteCalculator.js`); do not promote per-feature data to a shared `data/` directory.

**There is no router.** Page-family detection happens by `document.querySelector('.feature-root')` inside the feature module's init — if the element doesn't exist on the current page, the init bails. Do not add URL-pattern matching or route tables; the DOM is the routing layer.

## 2. The signal-threading rule

Every init function takes `{ signal }` as its only argument and threads that signal into every `addEventListener` call inside it:

```js
export function initFeatureName({ signal } = {}) {
  const root = document.querySelector('.feature-root');
  if (!root) return;

  root.addEventListener('click', handleClick, { signal });
  document.addEventListener('keydown', handleKey, { signal });
  // ...every listener attached during this init takes { signal }.
}
```

`main.js` owns a single `AbortController`, aborts it before each re-init, and creates a fresh one:

```js
let abortController = null;
function bootstrap() {
  abortController?.abort();
  abortController = new AbortController();
  const { signal } = abortController;
  initMobileNav({ signal });
  initQuoteCalculator({ signal });
}
```

This guarantees:

- Listeners attached on the previous page (especially on persistent targets like `document` and `window`) are killed atomically the moment the next swap begins.
- No listener leaks across navigations. Without this, a `document.addEventListener('keydown', …)` inside `initMobileNav` would accumulate one new handler per page visit.
- Cleanup is centralized. Feature modules never call `removeEventListener` and never store handler references for later teardown — the `signal` parameter is the sole cleanup mechanism.

**The rule:** if your module attaches *any* listener to `document`, `window`, or any node that survives a swap (the persistent header outside `#main-content`, for instance), it **must** take `{ signal }` and pass it to every `addEventListener` call. Listeners attached only to nodes inside `#main-content` are technically cleaned up by Swup's content replacement, but **still pass `{ signal }`** — it keeps the contract uniform and survives future refactors that move markup outside the swap container.

## 3. Module shape — query, bail, attach

Every feature module's init follows the same shape:

```js
export function initFeatureName({ signal } = {}) {
  // 1. Query the feature root.
  const root = document.querySelector('.feature-root');
  // 2. Bail if absent on this page.
  if (!root) return;
  // 3. Attach listeners (every one taking { signal }) and seed initial state.
}
```

Rules:

- **Idempotent.** `bootstrap()` may call any init multiple times across the page lifecycle. The query-bails-attaches shape combined with the signal-driven teardown makes this safe: the previous instance's listeners are aborted before a new instance attaches.
- **No top-level DOM access.** Module body executes once at load time; all DOM work happens inside the exported init function. Top-level `const el = document.querySelector(…)` is wrong — it runs before `bootstrap()` and references a node that may no longer exist after the first swap.
- **No internal `AbortController`.** Feature modules accept a signal; they never create one. Cleanup is the entry point's responsibility.
- **No state outside the init's closure** — except pure data (e.g. `quote-config.js` constants). Per-feature mutable state (a row counter, an open/closed flag) lives in the init function's closure and is reconstructed on each call.
- **Manage DOM state via class toggles and ARIA attributes.** `el.classList.toggle('is-open')` and `el.setAttribute('aria-expanded', '…')`, not inline `style.display` mutations. Inline styles are forbidden (enforced by `check-css.js`) except for the narrow body-scroll-lock case in `mobileNav.js`, which is paired with an explicit reset in the close path.

## 4. Swup configuration

`main.js` creates exactly one Swup instance:

```js
const swup = new window.Swup({
  containers: ["#main-content"],
  plugins: [new window.SwupHeadPlugin()],
});
```

- **Container.** `#main-content` is the `<main>` element rendered by `layouts/page.njk`. The page chrome around it (skip link, utility bar, header, footer) is **persistent across navigations** — header CSS state and event wiring must assume the header DOM outlives the swap.
- **Head plugin.** `@swup/head-plugin` diffs `<head>` between the current and incoming document and applies adds/removes. Without it the title, meta tags, canonical, hreflang, and JSON-LD would all stay frozen at the initial-load values.
- **No other plugins.** No scroll plugin (browser-default scroll restoration is acceptable here), no preload plugin, no forms plugin. Adding one requires updating this directive and the vendor passthrough list in `eleventy.config.js`.

`bootstrap()` runs once on initial load and again on every Swup `page:view` event:

```js
bootstrap();
swup.hooks.on("page:view", bootstrap);
```

`page:view` fires after the new content is in the DOM. Init code can safely query the swapped-in nodes.

## 5. The `content:replace` hook — `<html lang>` and `<body class>`

`SwupHeadPlugin` only touches `<head>`. On this site **two attributes outside `<head>` vary per page** and must be copied from the incoming document on every swap:

- `<html lang>` — drives screen-reader locale and the `:lang(en)` / `:lang(is)` CSS scope. Wrong lang on an EN page after an IS→EN navigation is an accessibility regression that ships silently.
- `<body class>` — drives page-family CSS scoping (`.home-page`, `.services-page`, etc. — see [`css-architecture.md`](./css-architecture.md) §3). Wrong body class after a navigation breaks every scoped rule in the destination page family's stylesheet.

The hook in `main.js`:

```js
swup.hooks.on("content:replace", (visit) => {
  const incoming = visit?.to?.document;
  if (!incoming) return;
  const incomingLang = incoming.documentElement.getAttribute("lang");
  if (incomingLang) document.documentElement.setAttribute("lang", incomingLang);
  document.body.className = incoming.body.className;
});
```

**Do not remove this hook.** It runs inside `content:replace` so the new attributes are in place before any post-swap code (including `bootstrap`'s init calls and any CSS scope-dependent computations) reads them.

If a future change introduces another attribute that varies per page **outside `<head>` and outside `#main-content`** (e.g. a `data-theme` on `<html>` for a dark-mode toggle), add it to this hook. It is the single integration point for "things that travel across a swap but aren't part of the swap container or the head."

## 6. Updating the persistent header

The primary nav lives in `partials/header.njk`, which renders **outside** `#main-content`. Server-rendered `class="active"` and `aria-current="page"` reflect the page that originally loaded — they go stale after the first Swup navigation.

`main.js` defines `updateNavCurrent()` to re-sync both, and `bootstrap()` calls it on every page view:

```js
function updateNavCurrent() {
  const here = window.location.pathname;
  document.querySelectorAll("#primary-nav a[href]").forEach((link) => {
    const isCurrent = link.getAttribute("href") === here;
    link.classList.toggle("active", isCurrent);
    if (isCurrent) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
}
```

Two attributes, mirrored on purpose: `.active` drives the visual highlight (CSS-only); `aria-current="page"` is the accessibility signal for assistive tech. Both must update.

**Rule:** when adding any other piece of UI inside persistent chrome (header, utility bar, footer) that reflects the current page, update it in `bootstrap()` or in a function called from `bootstrap()`. Do not rely on server-rendered state outside `#main-content`.

## 7. Vendor bundles — UMD passthrough

Swup and the head plugin ship as **UMD globals**, not ES modules. The ESM build of Swup pulls `delegate-it` and `path-to-regexp` from npm; without a bundler those would fail to resolve in the browser. The UMD bundles inline their dependencies and expose `window.Swup` / `window.SwupHeadPlugin`.

Passthrough wiring in `eleventy.config.js`:

```js
eleventyConfig.addPassthroughCopy({
  "node_modules/swup/dist/Swup.umd.js": "assets/js/vendor/swup.js",
  "node_modules/@swup/head-plugin/dist/index.umd.js": "assets/js/vendor/swup-head-plugin.js",
});
```

Script-tag order in `layouts/base.njk` is **load-bearing**:

```html
<script src="/assets/js/vendor/swup.js"></script>
<script src="/assets/js/vendor/swup-head-plugin.js"></script>
<script type="module" src="/assets/js/main.js"></script>
```

Classic `<script>` tags execute on parse; `<script type="module">` defers to after DOM parse. The two UMD globals are therefore guaranteed to exist by the time `main.js` runs.

**Adding a Swup plugin** means: (1) `npm install` it, (2) add its UMD bundle to the passthrough map above, (3) add a `<script>` tag in `base.njk` before the module entry, (4) reference the new `window.…` global in `main.js`, (5) add an `existsSync` assertion in `check-build.js` step 10 so a missing vendor file fails the build. Skipping any step breaks the navigation silently or at runtime.

`check-build.js` step 10 already asserts the two existing vendor files exist in `_site/`:

```
assets/js/vendor/swup.js
assets/js/vendor/swup-head-plugin.js
```

A missing file fails the production build before deploy.

## 8. Adding a new feature module

When a new piece of interactive UI ships:

1. **Create `src/assets/js/<feature>.js`** exporting `initFeature({ signal } = {}) { … }`. Follow the query-bails-attaches shape (§3). Thread `{ signal }` into every `addEventListener` (§2).
2. **Import and call it from `main.js`** inside `bootstrap()`, passing `{ signal }`. The order of init calls inside `bootstrap()` is by feature, not by criticality.
3. **Add the feature root selector to the directive table below** so the next reader can map module → DOM contract without grepping.
4. **If the feature reads any attribute outside `<head>` or `#main-content`** (e.g. `data-*` on `<html>` or persistent chrome), update the `content:replace` hook in `main.js` to copy it across swaps (§5).
5. **If the feature requires a third-party library:**
   - Prefer a vendored UMD via passthrough (§7) over an ESM module — no bundler, no resolver.
   - If the library is pure ES with no transitive npm dependencies, an `import` in the relevant module is acceptable (browsers resolve relative paths).
   - Add a `check-build.js` `existsSync` assertion for any new vendor bundle.

Current feature modules:

| Module | Feature root selector | Touches persistent DOM? |
|---|---|---|
| `mobileNav.js` | `.site-header__toggle` + `#primary-nav` | Yes — header is outside `#main-content`. Listens on `document` for Escape. |
| `quoteCalculator.js` | `form.quoter` (on `/verdreiknir/` only) | No — form lives inside `#main-content`. |

`quote-config.js` is **data, not a feature**: pure constants and helpers consumed by `quoteCalculator.js`. It does not export an init, is not imported by `main.js`, and is intentionally absent from `bootstrap()`.

## 9. Anti-patterns

The following are prohibited; each has a working alternative documented above.

- **`document.addEventListener('DOMContentLoaded', …)` in `main.js` or feature modules.** Module scripts already defer to after DOM parse. Run init synchronously at module top from `main.js`; do not add a second deferral.
- **Internal `AbortController` instances inside feature modules.** Cleanup is `main.js`'s job. Modules accept a signal, they do not create one.
- **`removeEventListener` calls.** If you find yourself writing one, the listener was attached without `{ signal }` — fix the attach site, not the teardown.
- **Top-level DOM queries in feature modules.** Module body runs once at load; the DOM it queries belongs to the initial page only and will be wrong after the first swap. Query inside the exported init.
- **Reading or writing `class="active"` / `aria-current="page"` on nav links from inside a feature module.** That state belongs to `updateNavCurrent()` in `main.js` (§6). Two writers will fight on every navigation.
- **Inline `style="…"` mutations** (`el.style.display = 'none'`). Toggle a class instead. See [`css-architecture.md`](./css-architecture.md) §4. The body-scroll-lock in `mobileNav.js` is the documented carve-out — match it pattern-for-pattern (paired open/close, explicit reset) if a similar case appears.
- **Calling `window.location.href = …` or `<a target="_self">` shortcuts for internal navigation.** Use a real anchor — Swup intercepts anchor clicks. Manual location writes bypass Swup and trigger a full reload, which defeats the entire JS lifecycle contract.
- **Adding a client-side router (page.js, navigo, custom URL matching).** Swup is the navigation layer. Feature modules detect their applicability by DOM presence (§1, §3).
- **Polluting `window.*` from inside a feature module.** `window.Swup` and `window.SwupHeadPlugin` are exceptions (vendored UMD globals); modules consume them but do not add new globals. State lives in the init's closure.

## 10. Testing and verification

There is no test runner. Verification is:

- **`npm run build`** asserts the Swup vendor bundles exist in the output (`check-build.js` step 10) and that the mobile-nav CSS selector contract holds (`check-build.js` step 4).
- **Manual smoke** after any JS change: load any page, navigate to a second page via the header, then to a third. Verify (a) no full reload (no flash, no devtools network "Doc" entry with a 200 fetch of an HTML page is fine — the `XHR/Fetch` is expected), (b) header `aria-current` reflects the current page, (c) `<html lang>` matches the page locale, (d) body class matches the destination page family, (e) the quote calculator and mobile nav still work on their respective pages.
- **DevTools listener inspection** is the way to verify the signal-threading rule. After several navigations, `getEventListeners(document)` in the console should not show duplicate handlers for the same event type. A growing list indicates a missing `{ signal }` somewhere in a feature module's init.

If a future change adds a non-trivial JS surface (timers, observers, fetches), add an assertion to `check-build.js` rather than relying on manual smoke alone.

---

## Enforcement appendix

`scripts/check-build.js` (run by `npm run build`) machine-checks:

- **§7 Swup vendor bundles exist** — `_site/assets/js/vendor/swup.js` and `_site/assets/js/vendor/swup-head-plugin.js` (step 10).
- **§3 / §6 mobile-nav selector contract** — `.site-header__toggle` exists in rendered headers (step 4). Pairs with `mobileNav.js`'s `document.querySelector(".site-header__toggle")`.

Conventions enforced by review (no automated check):

- §2 signal-threading — every `addEventListener` inside an init takes `{ signal }`.
- §3 query-bails-attaches module shape; no top-level DOM access.
- §3 no internal `AbortController` in feature modules.
- §4 single Swup instance, exactly one container (`#main-content`), `SwupHeadPlugin` only.
- §5 `content:replace` hook copies `<html lang>` and `<body class>` from the incoming document.
- §6 persistent-chrome state (active nav, etc.) updated by `bootstrap()` on every page view.
- §7 vendored UMD via passthrough; classic script tags before the module entry in `base.njk`.
- §9 no anti-patterns.

See also:

- [`templates-and-layouts.md`](./templates-and-layouts.md) — the `<script>` tag order in `base.njk` and the `#main-content` container.
- [`eleventy-config.md`](./eleventy-config.md) §7 — the passthrough wiring for the Swup vendor bundles.
- [`css-architecture.md`](./css-architecture.md) §3 — the page-family scope classes copied by the `content:replace` hook.

Upstream reference (load-bearing if the navigation layer is ever modified):

- Swup core: https://swup.js.org/
- Swup hooks API: https://swup.js.org/hooks/
- `@swup/head-plugin`: https://swup.js.org/plugins/head-plugin/
