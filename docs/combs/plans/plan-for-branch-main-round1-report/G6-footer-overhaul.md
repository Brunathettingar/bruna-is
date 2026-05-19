# G6 — Footer overhaul: contact anchors, localized country, dynamic year, locale-aware vision link

**Severity:** High
**Specialty:** code-reviewer
**Consolidates:** H6, M17, M5
**Files touched:**
- `src/_includes/partials/footer.njk`
- `src/_data/meta.js`
- `eleventy.config.js`

## Why

Three related defects all live in `partials/footer.njk` and share the same root cause — text and links were hard-coded into the template instead of flowing through the project's existing i18n + meta channels. Fixing them together avoids three near-identical PRs against the same 10-line block.

**H6 — non-anchored contact + untranslated country.**
`footer.njk:30–32` renders the phone, email, and address as plain `<li>` text:

```njk
<li>(+354) 850-4405</li>
<li>bruna@bruna.is</li>
<li>105 Reykjavík, Ísland</li>
```

Two problems: (a) the phone and email are not clickable, even though `partials/utility-bar.njk:10–11` already wraps the same values in `tel:` / `mailto:` anchors — so the two surfaces disagree on whether contact data is actionable (`consistency.md §1`, §4); (b) "Ísland" leaks into every EN page, violating the project's "no literal English/Icelandic text in templates" rule (FRAMEWORK-I18N §"UI string dictionary").

**M17 — literal copyright year.**
`footer.njk:37` reads `© 2026 Brunaþéttingar ehf.`. It will be silently wrong on 1 January 2027 with no test or build error to catch it (`quality.md §1` — "Verify behavior, not assumptions"; `maintainability.md §1` — write for the reader, not the writer of January 2026).

**M5 — `locale_url` strips the locale prefix when the URL contains a fragment.**
`footer.njk:23` writes `<a href="{{ '/about/#stefna' | locale_url }}">`. After running `npm run build` on this branch, the rendered footer on `_site/en/index.html:404` is:

```html
<li><a href="/bruna-is/about/#stefna">Our vision</a></li>
```

Every other footer link on the same page goes through `/bruna-is/en/...`, but this one points at the **Icelandic** about page. So the EN footer's "Our vision" link sends EN visitors to the IS About page (and would scroll to a `#stefna` section that lives in the IS markup). M5 was filed as "behavior unverified" — verification shows it is actually broken. `eleventy-plugin-i18n`'s `locale_url` does not handle the fragment: the URL `/about/#stefna` is not in its locale-routing table, so it returns the input untouched and `HtmlBasePlugin` then only adds the `/bruna-is` pathPrefix. (See FRAMEWORK-I18N §"UI string dictionary" + `consistency.md §5` cross-domain ripple — the locale change must reach every link, not just bare paths.)

Doing this as one fix keeps the footer block readable and minimizes churn in `git blame` (`maintainability.md §4`).

## What

1. Add a per-locale `addressCountry` field to `meta.byLocale` in `_data/meta.js` (consistent with the existing `title` / `description` / `ogImageAlt` per-locale fields — country name is brand/locale data, not a reusable UI string, so it belongs alongside the title, not in `i18n.js`).
2. Expose the build year as `buildYear` global data via `eleventy.config.js` (`addGlobalData`). One source of truth, evaluated once per build, available to any template.
3. Rewrite the footer block to:
   - wrap the phone and email in `tel:` / `mailto:` anchors (mirroring `utility-bar.njk:10–11` exactly, so both surfaces share the same canonical URLs);
   - render the country via `meta.byLocale[lang].addressCountry`;
   - render the year via `{{ buildYear }}`;
   - split the "Our vision" link into a base path that goes through `locale_url` plus the `#stefna` fragment appended outside the filter, so the locale prefix is applied to the path and the fragment is preserved verbatim.

Keep the `<ul>` structure (CSS hooks like `.col` and the list rules in the footer stylesheet expect it). Anchor styling for `tel:` / `mailto:` already exists for the utility bar; visually we accept the underline/colour the existing footer link rules give them — no new CSS in this fix (`maintainability.md §4` — no drive-by changes).

## How

### `src/_data/meta.js`

**Before** (lines 1–15):

```js
const byLocale = {
  is: {
    title: "Brunaþéttingar",
    description: "[TBD — íslensk lýsing] Vottuð brunaþéttingar og tæknieinangrun á Íslandi.",
    author: "Brunaþéttingar ehf.",
    ogImageAlt: "Brunaþéttingar — vottuð brunaþéttingar fyrir íslensk mannvirki",
  },
  en: {
    title: "Brunaþéttingar",
    description:
      "Brunaþéttingar plan, manage and execute fire sealing and technical insulation work on Icelandic buildings.",
    author: "Brunaþéttingar ehf.",
    ogImageAlt: "Brunaþéttingar — certified fire sealing for buildings",
  },
};
```

**After:**

```js
const byLocale = {
  is: {
    title: "Brunaþéttingar",
    description: "[TBD — íslensk lýsing] Vottuð brunaþéttingar og tæknieinangrun á Íslandi.",
    author: "Brunaþéttingar ehf.",
    ogImageAlt: "Brunaþéttingar — vottuð brunaþéttingar fyrir íslensk mannvirki",
    addressCountry: "Ísland",
  },
  en: {
    title: "Brunaþéttingar",
    description:
      "Brunaþéttingar plan, manage and execute fire sealing and technical insulation work on Icelandic buildings.",
    author: "Brunaþéttingar ehf.",
    ogImageAlt: "Brunaþéttingar — certified fire sealing for buildings",
    addressCountry: "Iceland",
  },
};
```

### `eleventy.config.js`

Add one line inside the default-exported function. Place it next to the other filter/global registrations (e.g., just above `addPassthroughCopy("src/assets")`):

```js
eleventyConfig.addGlobalData("buildYear", () => new Date().getFullYear());
```

A function (not a literal) ensures the value is evaluated at build time, even if data caching ever changes. `addGlobalData` is the same API the project already uses implicitly via the `_data/` directory — exposing one computed value here keeps the convention.

### `src/_includes/partials/footer.njk`

**Before** (lines 22–37):

```njk
        <ul>
          <li><a href="{{ '/about/' | locale_url }}">{{ "nav.about" | t }}</a></li>
          <li><a href="{{ '/about/#stefna' | locale_url }}">{{ "footer.vision" | t }}</a></li>
          <li><a href="{{ '/greinar/' | locale_url }}">{{ "nav.articles" | t }}</a></li>
        </ul>
      </div>
      <div class="col">
        <h5>{{ "footer.contact_heading" | t }}</h5>
        <ul>
          <li>(+354) 850-4405</li>
          <li>bruna@bruna.is</li>
          <li>105 Reykjavík, Ísland</li>
        </ul>
      </div>
    </div>
    <div class="bottom">
      <span>© 2026 Brunaþéttingar ehf. &nbsp;·&nbsp; {{ "footer.copyright" | t }}</span>
```

**After:**

```njk
        <ul>
          <li><a href="{{ '/about/' | locale_url }}">{{ "nav.about" | t }}</a></li>
          <li><a href="{{ '/about/' | locale_url }}#stefna">{{ "footer.vision" | t }}</a></li>
          <li><a href="{{ '/greinar/' | locale_url }}">{{ "nav.articles" | t }}</a></li>
        </ul>
      </div>
      <div class="col">
        <h5>{{ "footer.contact_heading" | t }}</h5>
        <ul>
          <li><a href="tel:+3548504405">(+354) 850-4405</a></li>
          <li><a href="mailto:bruna@bruna.is">bruna@bruna.is</a></li>
          <li>105 Reykjavík, {{ meta.byLocale[lang].addressCountry }}</li>
        </ul>
      </div>
    </div>
    <div class="bottom">
      <span>© {{ buildYear }} Brunaþéttingar ehf. &nbsp;·&nbsp; {{ "footer.copyright" | t }}</span>
```

Three changes, in order:

1. `'/about/#stefna' | locale_url` → `'/about/' | locale_url` followed by the literal `#stefna`. The filter now sees a routable path and returns `/en/about/` on EN pages; the fragment is concatenated after the rewritten URL.
2. `<li>(+354) 850-4405</li>` and `<li>bruna@bruna.is</li>` become `tel:` / `mailto:` anchors with the exact same `+3548504405` and `bruna@bruna.is` values used in `utility-bar.njk`. The visible label keeps the human-formatted `(+354) 850-4405` — only the `href` is normalized.
3. `105 Reykjavík, Ísland` → `105 Reykjavík, {{ meta.byLocale[lang].addressCountry }}`. Renders "Ísland" on IS pages, "Iceland" on EN pages.
4. `© 2026 …` → `© {{ buildYear }} …`.

No CSS, layout, or class changes — the `.col`, `<ul>`, and `<li>` structure stays as-is.

## Verification

1. `npm run build` completes without warnings or errors.
2. **M5 — vision link is locale-correct on EN.** Inspect the rendered link in `_site/en/index.html`. It must be `<a href="/bruna-is/en/about/#stefna">Our vision</a>` (note the `/en/` segment and the preserved `#stefna` fragment). The IS counterpart in `_site/index.html` stays `<a href="/bruna-is/about/#stefna">Okkar stefna</a>`. Quick check from the repo root:
   ```
   grep -n "stefna" _site/index.html _site/en/index.html
   ```
   Both rendered URLs should match the canonical other footer links on the same page (e.g., `/bruna-is/en/about/` on line ~403 of `_site/en/index.html`).
3. **H6 — contact anchors render as clickable links** on every page that includes the footer. Spot-check IS and EN home: each footer `<li>` for phone/email now has an `<a>` with `href="tel:+3548504405"` / `href="mailto:bruna@bruna.is"`. Verify the `href` values are byte-identical to those in `utility-bar.njk` (single source of truth).
4. **H6 — country is localized.** In `_site/index.html` the line reads `105 Reykjavík, Ísland`; in `_site/en/index.html` it reads `105 Reykjavík, Iceland`. Grep:
   ```
   grep -n "105 Reykjav" _site/index.html _site/en/index.html
   ```
   Confirm neither file contains `Ísland` outside of expected IS contexts.
5. **M17 — year is dynamic.** `_site/index.html` and `_site/en/index.html` both render `© 2026 Brunaþéttingar ehf.` on the current build. Re-run with a stubbed clock or simply confirm the source no longer contains a literal year:
   ```
   grep -n "© " src/_includes/partials/footer.njk
   ```
   should show only `{{ buildYear }}`.
6. Click each of the four footer links in a local `npm start` session (one EN page, one IS page) and confirm: phone opens the dialer, email opens the mail client, "Our vision" navigates to the same-locale About page and scrolls to the `#stefna` anchor (the section exists on both `src/content/is/about/index.njk` and `src/content/en/about/index.njk`; confirm the anchor target is present in both before relying on it).
7. No other partial or page changed — `git diff --stat` should list only the three files above.
