# H9 — Language-switcher index/working-tree disagreement

**Severity:** High
**File(s):** `src/_includes/partials/utility-bar.njk:12–15` (the live inline switcher)
**Specialty:** consistency-auditor + simplifier

---

## What

Resolve H9 by extracting the inline language switcher in `utility-bar.njk:12–15` into a single reusable partial `src/_includes/partials/language-switcher.njk` that consumes `locale_links` per `FRAMEWORK-I18N.md:319–343`, and replace the inline block with a `{% include %}`. This collapses two mechanisms into one and removes the last consumer of `alternateUrl`.

The original git-index disagreement called out in the review is **already resolved**: commit `d4a541f` ("Route language-switcher labels through i18n; remove unused partial") deleted the stale partial cleanly. `git ls-files src/_includes/partials/` and `/bin/ls src/_includes/partials/` now agree (verified 2026-05-19, working tree clean). No `git rm` or `git restore` is required.

## Why

`reusability.md` and `simplicity.md`: the switcher markup belongs in one place. Today, the only "switcher" in the repo is open-coded inside `utility-bar.njk` — fine in isolation, but it's also the last surviving caller of `alternateUrl` (C10), which the framework spec explicitly forbids in favour of `locale_links`. `FRAMEWORK-I18N.md:347` is direct: *"never offer a switch that leads to a 404."* The current hand-rolled `<a href="{{ page.url | alternateUrl(lang) }}">` will route users to a 404 the moment any single-locale page ships.

Pulling the switcher into a named partial also matches the framework's example structure (`FRAMEWORK-I18N.md:321`) and the reference implementation pattern of small focused partials.

## Where

- `src/_includes/partials/utility-bar.njk` — lines 12–15 (remove inline switcher, replace with include)
- `src/_includes/partials/language-switcher.njk` — **new file** (consumes `locale_links`)

## How

**Sequencing:** this fix is **with-or-after C10**. C10 is the substantive work (replace `alternateUrl` with `locale_url`/`locale_links` and delete the custom filter). H9 is a thin wrapper around the same call site:

- If C10 lands first and the inline switcher is already migrated to `locale_links`: H9 collapses to *"lift the inline switcher into a partial."*
- If H9 lands first: this plan itself migrates the call site to `locale_links` and C10 then only has to delete the `alternateUrl` filter definition and the two `base.njk` hreflang call sites.
- Recommended: land C10 first, then this fix is a 5-line refactor. Either order works; both touch the same `utility-bar.njk` lines, so coordinate to avoid a merge conflict.

**Step 1 — Verify the index/working-tree state is clean (sanity check before editing):**

```
git status src/_includes/partials/
git ls-files src/_includes/partials/
/bin/ls src/_includes/partials/
```

Expected: working tree clean; both listings agree and neither contains `language-switcher.njk`. If they disagree, stop and reconcile first (`git rm --cached src/_includes/partials/language-switcher.njk` if it lingers in the index; `git restore src/_includes/partials/language-switcher.njk` if it should be present). On a clean repo (verified today) this step is observational only.

**Step 2 — Create `src/_includes/partials/language-switcher.njk`:**

```njk
{%- set alternates = page.url | locale_links %}
{%- if alternates.length %}
<span class="lang">
  <a href="{{ page.url }}" class="active" lang="{{ lang }}" aria-current="page">{{ ("lang.label." + lang) | t }}</a>
  {%- for link in alternates %}
  <a href="{{ link.url }}" lang="{{ link.lang }}" hreflang="{{ link.lang }}">{{ ("lang.label." + link.lang) | t }}</a>
  {%- endfor %}
</span>
{%- endif %}
```

Notes:
- Wrapper element stays `<span class="lang">` so existing `nav.css` / `main.css` selectors keep working — no CSS churn.
- Label source stays `("lang.label." + otherLang) | t` (the i18n route already wired in commit `d4a541f`), so no copy regresses.
- `aria-current="page"` on the active locale matches the spec example at `FRAMEWORK-I18N.md:329`.
- `{%- if alternates.length %}` is the spec's recommended guard — if a page exists in only one locale, no switcher renders (preferable to a 404 link).

**Step 3 — Edit `src/_includes/partials/utility-bar.njk`:**

Replace lines 1 and 12–15. The full updated file:

```njk
<div class="utility">
  <div class="container">
    <div class="row">
      <div class="left">
        <span class="pill">{{ "ui.certified" | t }}</span>
        <span>{{ "utility.tagline" | t }}</span>
      </div>
      <div class="right">
        <a href="tel:+3548504405">(+354) 850-4405</a>
        <a href="mailto:bruna@bruna.is">bruna@bruna.is</a>
        {% include "partials/language-switcher.njk" %}
      </div>
    </div>
  </div>
</div>
```

The `{%- set otherLang = … %}` line at the top of the file is deleted — it was only used by the now-extracted switcher.

## Expected Outcome

1. Rebuild: `npx @11ty/eleventy`.
2. Both locale home pages still render the switcher in the utility bar, visually unchanged (same `<span class="lang">` wrapper, same label text, same active-state styling). Spot-check:
   ```
   grep -A 4 'class="lang"' _site/index.html
   grep -A 4 'class="lang"' _site/en/index.html
   ```
   Expected: an `<a>` per existing locale with the correct `lang` / `hreflang` attributes.
3. `git grep "alternateUrl" src/_includes/partials/` returns zero matches (the partials no longer consume the filter; only `base.njk:13–14` remains, which is C10's territory).
4. Repo state matches the spec at `FRAMEWORK-I18N.md:319–343`: one switcher partial, sourced from `locale_links`.
5. No CSS changes; no test changes; manual click-through on both `/` and `/en/` confirms the switch still works.

## Scope

**In scope:** create `src/_includes/partials/language-switcher.njk`; edit `src/_includes/partials/utility-bar.njk` to include it and drop the now-unused `otherLang` set; run build; spot-check output.

**Out of scope:**
- The `<link rel="alternate" hreflang="…">` calls in `base.njk:12–14` — those are C10.
- The `alternateUrl` filter definition in `eleventy.config.js:116–127` — also C10 (must remain until base.njk migrates; deleting it before C10 will break the build).
- Any CSS adjustment beyond the existing `.lang` / `.lang a.active` rules.
- The C3 markdown migration (only relevant if `locale_links` still misbehaves on paginated articles — see Alternatives).

## Directive citations

- `reusability.md` — collapsing two switcher implementations into one named partial is the textbook case.
- `simplicity.md` — one mechanism per job; consuming the framework-provided `locale_links` removes the custom `alternateUrl` string-swap from this site of the codebase.
- `consistency.md` — aligns the project with `FRAMEWORK-I18N.md` §"Language switcher partial" exactly.
- `FRAMEWORK-I18N.md:319–347` — authoritative spec for the partial's shape and the "no switch to a 404" rule.

## Considered alternatives

- **Leave the switcher inline in `utility-bar.njk` and only swap `alternateUrl` → `locale_url(otherLang)`.** Rejected: still leaves the call site outside the framework's named-partial pattern, and doesn't gain the `locale_links` existence guard that prevents linking to non-existent translations. C10's mitigation alone is insufficient for H9.
- **Wait for C10 and C3 to land first, then do nothing here.** Partially viable: if C10 migrates `utility-bar.njk:13` to `locale_url(otherLang)` and `base.njk:13–14` likewise, the H9 "two mechanisms" complaint dissolves into "one mechanism, just inline." The framework spec still prefers a named partial (`FRAMEWORK-I18N.md:321`), and the `locale_links`-with-guard pattern is strictly safer than `locale_url(otherLang)` alone. Including this small refactor closes the spec gap.
- **Restore the deleted partial from history (`git show d4a541f^:src/_includes/partials/language-switcher.njk > …`) instead of writing a new one.** Rejected without inspection: the partial was removed in `d4a541f` as "unused"; re-introducing the prior contents without checking they consume `locale_links` (and not `alternateUrl`) is a step backward. Writing the partial fresh per the spec template is shorter and safer.
- **Defer until `locale_links` is proven to work on paginated articles.** If C10's investigation finds `locale_links` still breaks on paginated content even after C3, this fix can fall back to `locale_url(otherLang)` inside the new partial — still a one-mechanism solution and still a strict improvement over the inline `alternateUrl` block. The partial-extraction value is independent of which underlying filter wins.
