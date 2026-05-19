# G11 — Quote calculator: stop lying about submit, cap mailto body, optional pricing extraction, batch init recalc

**Severity:** High
**Specialty:** silent-failure-hunter + code-reviewer + consistency-auditor
**Consolidates:** H10, M10, L5, L11
**Files touched:**
- `src/assets/js/quoteCalculator.js` (submit handler rewrite + batched init + optional pricing import)
- `src/_data/i18n.js` (two new strings for the revised banner; only if (a) is taken)
- `src/_data/quote-config.js` — **new file**, optional (only if (b) is taken)
- `src/content/{is,en}/verdreiknir/index.njk` (banner copy + small `<a>` slot for the dynamic mail link; only if (a) is taken)

---

## Why

`src/assets/js/quoteCalculator.js:288–300` is the load-bearing submit handler for the quote form. It currently:

```js
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const body = buildMailBody(form, lang);
  const subject = COPY[lang].mailSubject;
  const mailto = `mailto:bruna@bruna.is?subject=…&body=${encodeURIComponent(body)}`;
  window.location.href = mailto;            // ← fire and forget

  const banner = form.querySelector("#quoter-confirm");
  if (banner) {
    banner.classList.add("show");           // ← "✓ Takk! …has been sent."
    banner.scrollIntoView({ … });
  }
});
```

Three honest-failure problems, all visible to a real visitor:

1. **No mail client registered.** Locked-down corporate laptops, kiosks, and many mobile setups (no default mail app, or web-mail-only) silently no-op on a `mailto:` navigation. `window.location.href = mailto` does **not** throw. The user then sees a green "✓ Thanks! Your estimated quote has been sent" — but nothing left the browser. The contractor never receives the lead. This is the canonical `quality.md` failure mode: a silent fallback that hides a bug behind a green checkmark.
2. **Mailto URL length.** A fully-filled form with 10–15 rows + a long notes paragraph easily exceeds the de-facto mailto cap (~2 KB on Outlook/Windows, ~32 KB on macOS Mail, ~8 KB on most mobile clients). Some clients silently truncate the body, some open with a blank body, some fail to open at all. Same false-success banner in every case.
3. **No JS-side gate beyond HTML `required`.** A row with all empty selects passes through `buildMailBody` and contributes a "—" line to the email. Not a security issue, but the recipient gets garbage and the user thinks they sent a quote.

The "Your quote has been sent" banner is wrong even on the happy path: at best, the mail client *opened* — the user still has to hit Send inside it. The current copy promises delivery; the code can't deliver that promise.

L5 (pricing constants live in JS, not `_data/`) is a separate Low: it's not a bug, it's a maintainability ask. `OPE_TYPES` / `WALL_TYPES` / `FIRE_RATINGS` / `FLOOR_POSITIONS` are pure config (ids + numbers + bilingual labels). Moving them to `src/_data/quote-config.js` lets non-developers tune base prices via a PR that touches only one file, which matches the rest of the site's data-driven shape (`_data/services.js`, `_data/sectors.js`, etc.). Worth doing **as a small follow-up step in the same fix**, because we're already in this file — but cleanly separable if it grows scope.

L11 (`addRow()` called twice during init, each triggering a `recalc`) is cosmetic: the first `recalc` runs against a one-row form, the second against the now-two-row form. Both produce identical totals (`0 kr`) because no inputs are filled. Batching costs three lines and removes the smell.

`quality.md` is unambiguous: *"errors should be surfaced, not swallowed; success messages must correspond to actual success."* The submit handler violates both halves. `simplicity.md` and `maintainability.md` cover the L5 / L11 cleanups.

## What

Three independent changes inside `initQuoteCalculator` (and one optional new data file):

### (a) Submit handler — stop lying, cap inputs, use an anchor

Replace `window.location.href = mailto` with a dynamically-created `<a href="mailto:…" target="_blank" rel="noopener">` that we programmatically `.click()`. Browsers handle "no protocol handler" on an anchor click more predictably than on a `location.href` assignment (Safari + Firefox surface the OS-level "no mail app" dialog; Chrome opens the protocol picker if one exists, otherwise silently fails — but the anchor approach gives us a `click` event we can hang a `try`/`catch` around for the synchronous setup phase).

Cap the body:

- **Rows in mailto body:** max 20. If the form has >20 rows, the body lists the first 20 and appends one summary line: *"(+ N more rows — see attached or call us)"*. The on-screen total still reflects all rows; this only limits what we stuff into the URL.
- **Notes length:** max 1500 chars. Truncate with a "… [truncated]" marker. The total mailto body is then bounded around ~6–8 KB worst case, which fits the Outlook ~2 KB threshold *for typical jobs* and never breaks the macOS/iOS ~32 KB ceiling. Outlook with 20 rows is still risky; see "Future direction" below.
- **JS-side row gate:** if **zero** rows have all three required selects set (`opeType`, `wallType`, `fireRating`), abort the submit and focus the first empty select. HTML `required` only covers `<input>`, not unfilled `<select value="">`, so this is the only place to catch it.

Revise the banner copy from "✓ Thanks! Your estimated quote has been sent" → "✓ Your mail client should now be open. Press Send there to deliver the quote. If nothing happened, call (+354) 850-4405." That sentence is honest under all three failure modes — no mail client (the user reads it and calls), truncated body (the user sees the open client and reviews before sending), happy path (the user hits Send). Add the two new i18n keys; do **not** keep `successText` as-is.

### (b) Pricing extraction to `_data/quote-config.js` (optional but recommended)

Move `OPE_TYPES`, `WALL_TYPES`, `FIRE_RATINGS`, `FLOOR_POSITIONS`, and `sizeMultiplier`'s breakpoints into `src/_data/quote-config.js` exported as a default object. `quoteCalculator.js` keeps `COPY` (which is render-time copy, not config) and imports the rest.

Argument **for**: the rest of the site is data-driven from `_data/*.js`; non-developer business stakeholders can adjust base prices without reading runtime JS. Cost is ~15 lines moved.

Argument **against**: `_data/*` is conventionally consumed by Nunjucks templates at build time, not by client-side JS. Importing a `_data/` file from a browser-bound ES module crosses that boundary — it works because everything's plain ESM and Eleventy doesn't object, but it's a small consistency wrinkle the team should decide on.

Recommended path: **do the extraction, name the file `src/assets/js/quote-config.js`** (not `_data/`) so the import stays on the same side of the Eleventy boundary. Get the "non-developer can edit one file" benefit without muddying the data-loader convention. If the team prefers `_data/` later, the rename is one line.

### (c) Batched init recalc

```js
// Seed two rows so the form isn't empty on load.
addRowSilent();
addRowSilent();
recalc(form, lang);
```

Add a non-recalculating `addRowSilent()` helper (or a `{ skipRecalc: true }` flag on `addRow`), call it twice, then run `recalc` once. Saves one no-op `recalc` pass per page load.

---

## Where

- `src/assets/js/quoteCalculator.js:4–51` — pricing tables (move to `quote-config.js` per (b))
- `src/assets/js/quoteCalculator.js:267–276` — `addRow` (split into silent + recalc-after for (c))
- `src/assets/js/quoteCalculator.js:288–300` — submit handler (full rewrite for (a))
- `src/assets/js/quoteCalculator.js:303–304` — two-row seed (use new silent pattern for (c))
- `src/_data/i18n.js:61` — replace `quote.success` text; add `quote.success_action` for the "press Send" sentence (only if (a) chooses to route copy through i18n rather than the inline `COPY` table — see "How" step 2)
- `src/content/is/verdreiknir/index.njk:79–81` and `src/content/en/verdreiknir/index.njk:79–81` — banner copy

## How

### Step 1 — Cap helpers (top of `quoteCalculator.js`)

Add two small constants and a `clamp` near the top of the module (after `COPY`):

```js
const MAILTO_MAX_ROWS = 20;
const MAILTO_MAX_NOTES = 1500;

function truncateNotes(notes, lang) {
  if (!notes) return "";
  const s = notes.toString();
  if (s.length <= MAILTO_MAX_NOTES) return s;
  const marker = lang === "is" ? "\n… [stytt]" : "\n… [truncated]";
  return s.slice(0, MAILTO_MAX_NOTES) + marker;
}
```

### Step 2 — Rewrite `buildMailBody` to respect the row cap

Change the `rows.forEach(...)` block to:

```js
const visibleRows = rows.slice(0, MAILTO_MAX_ROWS);
const hiddenCount = rows.length - visibleRows.length;

visibleRows.forEach((row, i) => { /* existing per-row lines unchanged */ });

if (hiddenCount > 0) {
  lines.push(
    lang === "is"
      ? `  (+ ${hiddenCount} fleiri línur — hringdu í (+354) 850-4405)`
      : `  (+ ${hiddenCount} more rows — call (+354) 850-4405)`
  );
  lines.push("");
}
```

The `total` accumulator must still iterate **all** rows (not just `visibleRows`) so the email's total matches what the user saw on screen — otherwise the recipient sees a number that doesn't match the form. Two-line change: keep one loop for body lines (capped), one separate reduce over all rows for the total.

Replace the `notes` block with:

```js
const notes = truncateNotes(fd.get("cust-notes"), lang);
if (notes) {
  lines.push(`  ${c.mailNotes}:`);
  notes.split("\n").forEach((n) => lines.push("    " + n));
}
```

### Step 3 — Rewrite the submit handler

```js
form.addEventListener("submit", (e) => {
  e.preventDefault();

  // JS-side gate: at least one row must have the three required selects.
  const rows = [...form.querySelectorAll(".quoter-row")];
  const firstValidRow = rows.find((r) => {
    const d = collectRowData(r);
    return d.opeId && d.wallId && d.fireId;
  });
  if (!firstValidRow) {
    const firstEmptySelect = form.querySelector(
      ".quoter-row [name=opeType]:not([value]), .quoter-row select:invalid"
    ) || form.querySelector(".quoter-row [name=opeType]");
    if (firstEmptySelect) firstEmptySelect.focus();
    return;  // honest no-op — no banner, no mailto
  }

  const body = buildMailBody(form, lang);
  const subject = COPY[lang].mailSubject;
  const href = `mailto:bruna@bruna.is?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  // Anchor-based open. More predictable than window.location.href across browsers,
  // and gives the user a real link if the synchronous click is blocked by popup rules.
  const a = document.createElement("a");
  a.href = href;
  a.target = "_blank";
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();

  const banner = form.querySelector("#quoter-confirm");
  if (banner) {
    banner.classList.add("show");
    banner.scrollIntoView({ behavior: "smooth", block: "center" });
  }
});
```

Notes:
- The selector for the first empty select uses `select:invalid` as a fallback — if the templates ever add `required` to those selects, `:invalid` catches them. The leading `[name=opeType]:not([value])` form is intentionally loose because empty selects don't expose an empty `value` attribute in DOM querying — the `:invalid` branch is the one that fires today.
- We deliberately **don't** wrap `a.click()` in a `try/catch`. The synchronous click won't throw on protocol-handler absence in any current browser; the failure is silent at the OS level and there's no programmatic signal we can listen for. The honest move is to revise the banner copy (next step) so we never claim more than "the click happened."

### Step 4 — Banner copy: stop promising delivery

Edit `src/_data/i18n.js` — replace the existing `quote.success` line:

```js
"quote.success": {
  is: "✓ Tölvupóstforritið þitt ætti að opnast. Smelltu á Senda þar til að klára. Ef ekkert gerist, hringdu í (+354) 850-4405.",
  en: "✓ Your mail client should now open. Press Send there to deliver the quote. If nothing happened, call (+354) 850-4405.",
},
```

…and update the inline confirm divs in both `verdreiknir/index.njk` files to use the i18n key (today they hard-code the copy):

```njk
<div class="quoter-confirm" id="quoter-confirm">
  {{ "quote.success" | t }}
</div>
```

This also fixes a small drift: `COPY[lang].successText` inside `quoteCalculator.js:58` and the inline-template strings on `:80` of each `index.njk` are currently three independent copies of nearly-the-same sentence. Route through `i18n.js` once.

Delete `successText` from the `COPY` object in `quoteCalculator.js` — the banner is server-rendered, JS only toggles `.show`. (If a JS consumer ever needs the text, read it from `banner.textContent`.)

### Step 5 — Batched-recalc init (L11)

In `initQuoteCalculator`, change `addRow` to accept a flag:

```js
const addRow = ({ skipRecalc = false } = {}) => {
  counter += 1;
  const row = buildRow(counter, lang);
  rowsEl.appendChild(row);
  row.querySelectorAll("select, input").forEach((el) => {
    el.addEventListener("input", () => recalc(form, lang));
    el.addEventListener("change", () => recalc(form, lang));
  });
  if (!skipRecalc) recalc(form, lang);
};
```

…and at the bottom of `initQuoteCalculator`:

```js
// Seed two rows so the form isn't empty on load.
addRow({ skipRecalc: true });
addRow({ skipRecalc: true });
recalc(form, lang);
```

The add-row button binding stays `addBtn.addEventListener("click", addRow)` — the default `skipRecalc: false` keeps the existing per-click behaviour.

### Step 6 — Pricing extraction (L5, optional, recommended)

Create `src/assets/js/quote-config.js`:

```js
// Quote calculator pricing config. Edit base prices, multipliers, and size brackets here.
// Labels are bilingual (is/en). New options: add an entry to the relevant array.

export const OPE_TYPES = [ /* …moved from quoteCalculator.js:4–19 verbatim… */ ];
export const WALL_TYPES = [ /* …moved from :21–32… */ ];
export const FIRE_RATINGS = [ /* …moved from :34–40… */ ];
export const FLOOR_POSITIONS = [ /* …moved from :42–51… */ ];

export const SIZE_BRACKETS = [
  { maxCm: 10,  mult: 1.0 },
  { maxCm: 25,  mult: 1.4 },
  { maxCm: 50,  mult: 2.3 },
  { maxCm: 100, mult: 3.8 },
];
export const SIZE_BRACKET_OVERFLOW = 5.5;
```

In `quoteCalculator.js`, replace lines 4–51 with one import, and rewrite `sizeMultiplier`:

```js
import {
  OPE_TYPES, WALL_TYPES, FIRE_RATINGS, FLOOR_POSITIONS,
  SIZE_BRACKETS, SIZE_BRACKET_OVERFLOW,
} from "./quote-config.js";

function sizeMultiplier(width, height) {
  const max = Math.max(width || 0, height || 0);
  if (max === 0) return 0;
  for (const b of SIZE_BRACKETS) if (max <= b.maxCm) return b.mult;
  return SIZE_BRACKET_OVERFLOW;
}
```

Why `src/assets/js/quote-config.js` and not `src/_data/quote-config.js`: see "What (b)" above. Short version — the file is consumed by a browser-bound ES module, not by Nunjucks at build time. Keeping it in `assets/js/` preserves the Eleventy data-loader convention. If the team later wants Nunjucks to use the same numbers (e.g. to render a server-side price card), promote it to `_data/` and reshape the import.

**Skip condition.** If review feedback says "leave the data in the calculator, this is a 60-line page and one file is fine" — that's a legitimate `simplicity.md §2` call (one mechanism, fewer hops). Steps 1–5 are independently valuable; Step 6 can be deferred without affecting the other fixes.

## Expected Outcome

After all five steps:

1. `npx @11ty/eleventy` builds clean. `npm start` serves both `/verdreiknir/` and `/en/verdreiknir/`.
2. **Honest submit failure modes:**
   - No mail client → mail client doesn't open, banner shows but reads "If nothing happened, call (+354) 850-4405." User has a recovery path.
   - 20+ rows → mail body lists 20 rows + "(+ N more rows — call (+354) 850-4405)". Total still matches the on-screen total.
   - 1500+ char notes → notes truncated with "… [truncated]" marker visible in the draft.
   - Zero filled rows → submit no-ops, focuses the first empty `opeType` select, no banner, no mailto attempt.
3. **No copy drift:** `git grep "Takk! Fyrirspurn" src/` returns only the `i18n.js` entry. The two Nunjucks templates and the JS module no longer carry independent versions of the success sentence.
4. **L11:** add a `console.count("recalc")` temporarily inside `recalc`, reload the page, observe `1` (was `2`). Remove the counter before commit.
5. **L5 (if Step 6 taken):** `src/assets/js/quote-config.js` exists; `quoteCalculator.js` imports from it; the price column on the form renders identical numbers to pre-refactor for the same inputs (manual spot-check: 1× "cable" / "concrete" / "EI 60" / 10×10 cm / "mid" / qty 1 → 8500 kr, unchanged).
6. Manual smoke test (both locales): fill one row, fill name + email, submit. Mail client opens with subject + body. Hit Send. Quote arrives at `bruna@bruna.is`. Banner shows the revised copy.

## Scope

**In scope:** the five steps above. The submit-handler rewrite (a) and the batched init (c) are non-negotiable for closing H10/M10/L11. The copy revision (Step 4) is required for (a) to land honestly. The pricing extraction (Step 6) is recommended but separable.

**Out of scope:**
- Server-side form handling (Netlify Forms, Formspree, custom Lambda/Worker endpoint). See "Future direction" below.
- CSS adjustments to `.quoter-confirm` — copy gets longer; the existing block layout handles 2–3 lines fine. If it wraps awkwardly in production, that's a follow-up tweak in `main.css`, not this fix.
- Adding `required` to the row selects. HTML `required` on `<select>` requires a non-empty default value, which conflicts with the "— choose —" placeholder pattern. The JS-side gate in Step 3 is the right level.
- Field-level validation for email format / phone format. Browser `type="email"` already covers the email case; phone is intentionally permissive.
- Persisting form state across page reloads. Not asked for.
- Internationalising `MAILTO_MAX_ROWS` / `MAILTO_MAX_NOTES` (they're caps, not copy).

## Future direction (not part of this fix, list-only)

The correct long-term fix for H10 is **a real submit endpoint**. The mailto: protocol is structurally unfit for "deliver a quote request": it depends on a client-side mail app the visitor may not have, it has no delivery guarantee, the lead never enters a CRM, and the contractor can't track conversion. Three viable options when the team is ready:

1. **Netlify Forms** — zero-code, free tier covers expected volume, ships emails to `bruna@bruna.is` and stores submissions in a Netlify dashboard. Requires moving the site off GitHub Pages or adding Netlify as a deploy target.
2. **Formspree / Basin / Web3Forms** — drop-in `action="https://…"` endpoints, no server code, free tier sufficient for ~50 leads/month.
3. **Cloudflare Worker** (or any serverless function) — sends transactional email via Resend / Postmark, gives the team a real audit log. Maybe 50 lines of code; works on the current GitHub Pages deploy without changing the host.

This fix (G11) makes the mailto path **honest** — it doesn't make it **good**. The follow-up should be tracked as a milestone task; once a real endpoint lands, the H10 fix is "delete the dynamic anchor, replace with `fetch()` to the endpoint, keep the banner copy, restore the original 'has been sent' wording."

## Directive citations

- `quality.md` — "Errors should be surfaced, not swallowed; success messages must correspond to actual success." Direct application: the current banner asserts delivery the code cannot verify; the revised banner only asserts what the code can verify (the click happened).
- `quality.md` — "No silent fallbacks for bugs." The JS-side row gate (Step 3) replaces the silent no-op when zero rows are filled; the focus-first-empty behaviour is a visible failure signal.
- `simplicity.md` — one source of truth for the success copy (Step 4 collapses three copies into the `i18n.js` entry).
- `maintainability.md` — Step 6 isolates pricing config so non-developers can tune base prices without reading runtime JS; `addRowSilent` + single trailing `recalc` (Step 5) makes the init sequence read top-to-bottom without the implicit "this runs twice on load" pitfall.
- `FRAMEWORK-PORT-PROMPT.md §"Pattern for a JS feature module"` (line 406) — `initQuoteCalculator` already follows the `querySelector → if (!root) return` shape; this fix preserves it (the new submit handler is inside that guard).

## Considered alternatives

- **Replace mailto with a `fetch()` to a Netlify/Formspree endpoint right now.** Cleanest end-state, but requires infra decisions (host, free-tier vs paid, GDPR posture for storing leads) that aren't part of a code-review fix. Tracked under "Future direction." Keeping mailto for now is a deliberate scope choice — fix the dishonesty, defer the rewrite.
- **Add a `try { iframe-based mailto } catch` to detect "no mail client."** No reliable browser API surfaces that signal. The `iframe.src = "mailto:…"` trick used to fire a `load` event on success in some browsers; modern Chrome/Edge/Safari no longer distinguish protocol-handled vs unhandled in any observable way. Coding around it is folklore-driven and would itself be a silent-fallback hazard. Rejected.
- **Keep `successText` in `COPY` and edit only the JS module.** Leaves the Nunjucks templates' inline copy untouched and out-of-sync. Three copies of the sentence is the bug `i18n.js` exists to prevent; route through it once and delete the local copies. The Step 4 path is strictly better.
- **Move pricing to `src/_data/quote-config.js` (not `assets/js/`).** Crosses the Eleventy data-loader boundary: `_data/*` is by convention a build-time input to templates, not a client-side import. It works today because both happen to be plain ESM, but it muddies the convention. `src/assets/js/quote-config.js` keeps the boundary clean. The team can promote it to `_data/` later if Nunjucks also wants the numbers.
- **Cap the body at 5 rows instead of 20.** Five is the safe Outlook number; twenty is the "be honest but don't truncate normal jobs" number. Real quote requests average 1–4 rows; the 20-row ceiling exists for the one-in-a-hundred large project that lists every penetration in a building. The visible "+ N more rows — call" sentence makes the truncation explicit, so a higher cap is the user-friendlier choice. If Outlook-on-Windows feedback surfaces post-launch, drop the cap to 8–10 in one commit.
- **Skip L11 entirely.** Genuinely cosmetic; one wasted `recalc` per page load on a form that renders instantly. The reason to fix it now: we're already rewriting `addRow`'s caller for Step 3's row-gate logic, and the `{ skipRecalc }` flag is three lines. Bundling it costs nothing; deferring it leaves the smell.
