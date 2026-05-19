# C4 — Mobile nav selector mismatch

**Severity:** Critical
**File(s):** `src/assets/js/mobileNav.js:2`, `src/_includes/partials/header.njk:18`, `src/assets/css/nav.css:4,12,19-21,24`
**Specialty:** code-reviewer, consistency-auditor, simplifier, silent-failure-hunter

## What

The mobile nav hamburger has no behaviour wired up. `src/assets/js/mobileNav.js:2` queries `.site-header__toggle`, but the template renders `<button class="nav-toggle" …>` (`header.njk:18`) and the CSS styles `.nav-toggle` (`nav.css:4,12,19-21,24`). The defensive guard at `mobileNav.js:4` (`if (!toggle || !nav) return;`) silently bails on every page. At `<64em` the drawer is held off-screen by `transform: translateX(100%)` (`nav.css:34`), so the entire primary nav — Services, Sectors, Quote, About, Articles, Contact — is unreachable on any mobile or tablet viewport. Click handler, Escape handler, link-click close, and the `aria-expanded` flip all never bind.

## Why

Three sources of truth disagree on the class name for the same element. The JS uses a BEM-shaped name; the template and CSS use a flat name. Because the JS module's only signal is a `return`, the failure is invisible at build time and at runtime — no console error, no failed network request, just dead UI. This is exactly the silent-failure mode the framework spec warns against (`FRAMEWORK-PORT-PROMPT.md` §"Pattern for a JS feature module" — defensive query then early return is only safe when the contract on both sides matches).

## Where

Three files, one logical contract (the toggle button selector):

1. `src/_includes/partials/header.njk:18` — renders the button class
2. `src/assets/css/nav.css:4,12,19-21,24` — styles keyed on the class
3. `src/assets/js/mobileNav.js:2` — queries the class

The button lives inside `.site-header` (`header.njk:11`), so the BEM block-element pairing `site-header__toggle` is semantically correct.

## How

### Structural choice: template + CSS follow JS (rename to BEM)

Two options were considered:

- **(A) JS follows template** — change `mobileNav.js:2` to `document.querySelector(".nav-toggle")`. One-line fix, lowest blast radius.
- **(B) Template + CSS follow JS** — rename `.nav-toggle` → `.site-header__toggle` in `header.njk` and `nav.css`. Three-file change.

**Choose (B).** The user focus brief lists BEM naming as a hard requirement, and the framework port prompt mandates BEM throughout. The JS already encodes the intended BEM contract (`site-header__toggle`); the template and CSS are the drift. Picking (A) would enshrine a non-BEM class on a top-level interactive control and create a precedent for future drift. (B) costs two extra edits in two files for a single round of replacement and aligns all three layers with the spec.

The drawer container (`nav.primary`) is also non-BEM, but renaming that is out of scope for this finding — it cascades into `main.css` and is a separate consistency issue.

### Before / after

**`src/_includes/partials/header.njk:18`** — before:

```njk
<button class="nav-toggle" type="button" aria-expanded="false" aria-controls="primary-nav" aria-label="{{ 'ui.menu' | t }}">
  <span></span><span></span><span></span>
</button>
```

after:

```njk
<button class="site-header__toggle" type="button" aria-expanded="false" aria-controls="primary-nav" aria-label="{{ 'ui.menu' | t }}">
  <span></span><span></span><span></span>
</button>
```

**`src/assets/css/nav.css`** — before:

```css
.nav-toggle {
  display: none;
  flex-direction: column;
  gap: 4px;
  padding: 8px;
  border: 0;
  background: transparent;
}
.nav-toggle span {
  display: block;
  width: 22px;
  height: 2px;
  background: var(--text);
  transition: transform var(--transition-fast), opacity var(--transition-fast);
}
.nav-toggle[aria-expanded="true"] span:nth-child(1) { transform: translateY(6px) rotate(45deg); }
.nav-toggle[aria-expanded="true"] span:nth-child(2) { opacity: 0; }
.nav-toggle[aria-expanded="true"] span:nth-child(3) { transform: translateY(-6px) rotate(-45deg); }

@media (max-width: 63.999em) {
  .nav-toggle { display: inline-flex; }
  /* … */
}
```

after (replace all five occurrences of `.nav-toggle` with `.site-header__toggle`):

```css
.site-header__toggle {
  display: none;
  flex-direction: column;
  gap: 4px;
  padding: 8px;
  border: 0;
  background: transparent;
}
.site-header__toggle span {
  display: block;
  width: 22px;
  height: 2px;
  background: var(--text);
  transition: transform var(--transition-fast), opacity var(--transition-fast);
}
.site-header__toggle[aria-expanded="true"] span:nth-child(1) { transform: translateY(6px) rotate(45deg); }
.site-header__toggle[aria-expanded="true"] span:nth-child(2) { opacity: 0; }
.site-header__toggle[aria-expanded="true"] span:nth-child(3) { transform: translateY(-6px) rotate(-45deg); }

@media (max-width: 63.999em) {
  .site-header__toggle { display: inline-flex; }
  /* … */
}
```

**`src/assets/js/mobileNav.js`** — no change to selector (already `.site-header__toggle`). Add focus management to match the reference implementation pattern:

before:

```js
export function initMobileNav() {
  const toggle = document.querySelector(".site-header__toggle");
  const nav = document.getElementById("primary-nav");
  if (!toggle || !nav) return;

  const close = () => {
    nav.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  };

  toggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    document.body.style.overflow = isOpen ? "hidden" : "";
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });

  nav.querySelectorAll("a").forEach((a) => a.addEventListener("click", close));
}
```

after:

```js
// Accessible hamburger menu toggle — vanilla ES module.
// Handles: click toggle, Escape close (returns focus to toggle), link-click close.

export function initMobileNav() {
  const toggle = document.querySelector(".site-header__toggle");
  const nav = document.getElementById("primary-nav");
  if (!toggle || !nav) return;

  const close = ({ restoreFocus = false } = {}) => {
    nav.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
    if (restoreFocus) toggle.focus();
  };

  toggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    document.body.style.overflow = isOpen ? "hidden" : "";
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
      close({ restoreFocus: true });
    }
  });

  // Delegate link clicks so dynamically rendered links still close the drawer.
  nav.addEventListener("click", (e) => {
    if (e.target.closest("a")) close();
  });
}
```

Notes on the JS edit:

- Escape now only fires when the drawer is open and returns focus to the toggle (a11y: keyboard users don't lose place). Mirrors `somethings/src/assets/js/navigation.js:17-23`.
- `nav.querySelectorAll("a").forEach(...)` is replaced with delegated handling on `nav` itself — same behaviour, cheaper, robust to future link additions. Mirrors `somethings/src/assets/js/navigation.js:26-31`.
- Selector and BEM contract unchanged; only behaviour hardening.

## Expected Outcome

- On a viewport `<64em`, tapping the hamburger opens the nav (`is-open`, `aria-expanded="true"`, body scroll locked).
- Pressing Escape while open closes the nav, restores body scroll, and returns keyboard focus to the toggle.
- Clicking any link inside the drawer closes the drawer (so in-page anchors like `#contact` actually scroll into view instead of being hidden behind the panel).
- `aria-expanded` reflects state on every transition; the CSS hamburger-to-X animation (`nav.css:19-21`) fires because the attribute selector now matches.
- No regressions on desktop (`≥64em`): toggle is `display: none`, drawer styles don't apply, click handlers are harmless no-ops.

## Scope

- Three files: `src/_includes/partials/header.njk`, `src/assets/css/nav.css`, `src/assets/js/mobileNav.js`.
- Do **not** rename `nav.primary` → `.site-header__nav` in this fix; that's a separate consistency finding.
- Do **not** add a focus-trap inside the drawer; the brief asks for "consider" — current scope is selector + Escape + link-close + focus-return, which is enough to make the nav usable and a11y-correct. A trap is a follow-up if mobile keyboard testing surfaces it.

## Verification

**Manual (mobile viewport):**

1. `npm start` (or whatever the project's dev command is — check `package.json scripts`).
2. Open the site in Chrome, DevTools → device toolbar → iPhone 12 (390×844) or any preset `<64em`.
3. Tap hamburger → drawer slides in from right, `aria-expanded="true"` in DOM, hamburger bars animate to X, body cannot scroll.
4. Press Escape → drawer slides out, `aria-expanded="false"`, body scroll restored, focus ring on hamburger button.
5. Re-open, tap any link (e.g. Services) → drawer closes and navigation proceeds.
6. Re-open, tap the `#contact` CTA → drawer closes and page scrolls to the contact anchor (not hidden behind the panel).
7. Resize to `≥64em` → hamburger hidden, desktop nav visible, no JS errors in console.

**Automated stub (selector-binding sanity check):**

If a JS test harness exists or is added later, the minimum guard is:

```js
// __tests__/mobileNav.test.js (jsdom)
import { initMobileNav } from "../src/assets/js/mobileNav.js";

test("binds click handler when selectors match the template contract", () => {
  document.body.innerHTML = `
    <button class="site-header__toggle" aria-expanded="false" aria-controls="primary-nav"></button>
    <nav id="primary-nav"><a href="/x">x</a></nav>
  `;
  initMobileNav();
  const toggle = document.querySelector(".site-header__toggle");
  const nav = document.getElementById("primary-nav");

  toggle.click();
  expect(nav.classList.contains("is-open")).toBe(true);
  expect(toggle.getAttribute("aria-expanded")).toBe("true");

  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
  expect(nav.classList.contains("is-open")).toBe(false);
  expect(toggle.getAttribute("aria-expanded")).toBe("false");
});
```

The point of the stub is to fail loudly if any of the three layers drift again — the test renders the template's class name and asserts the JS binds to it. (No test runner is currently configured per `CLAUDE.md`; this is a stub for whoever wires one up, not a blocker on the fix.)

## Directive citations

- **quality.md** — silent failures via defensive bail are the failure mode here; the fix removes the mismatch that made the bail fire on every load.
- **simplify.md** — link-close uses event delegation on `nav` instead of per-link listeners; one source of truth for the toggle class across template, CSS, JS.
- **consistency.md** — BEM (`site-header__toggle`) is the spec-mandated convention; aligning all three layers eliminates the contract drift.
- `FRAMEWORK-PORT-PROMPT.md` §"Pattern for a JS feature module" — defensive query → early return is the prescribed pattern; the precondition is that the selector contract is honoured.
- Focus brief item 7 (a11y: `aria-current="page"`, semantic HTML) — Escape returns focus to the toggle, `aria-expanded` reflects state, button retains `aria-controls` linkage.

## Alternatives (rejected)

- **(A) Change JS selector to `.nav-toggle`** — smallest diff, but violates the BEM hard requirement and entrenches the drift. Rejected.
- **Rename to `.site-nav__toggle` (mirroring the `somethings` reference)** — would require also renaming `nav.primary` to `.site-nav` and rippling through `main.css`. Out of scope for a Critical hot-fix; revisit when the broader nav-block renaming is planned.
- **Add a focus trap** — deferred; current fix makes the menu reachable and a11y-correct. Trap is a separate enhancement once UAT on real devices runs.
