# G9 — Filter robustness: `dateDisplay`, `dateIso`, `jsonEscape`

**Severity:** Low
**File(s):** `eleventy.config.js:78–98`
**Specialty:** code-reviewer
**Consolidates:** L1, L2

---

## Recommendation

**Partial fix.** Add a small guard to `dateDisplay` and `dateIso` so a missing frontmatter `date` returns `""` instead of throwing or rendering the literal string `"Invalid Date"`. **Leave `jsonEscape` unchanged** — its existing `if (!str) return ""` plus `String(str)` coercion is correct and adding more is `simplicity.md §2` territory ("Do not catch what cannot fail").

## What

1. `dateIso(undefined)` throws `RangeError: Invalid time value` at build time. Build fails.
2. `dateDisplay(undefined, lang)` does **not** throw — `toLocaleDateString` on an invalid `Date` returns the literal string `"Invalid Date"`, which then renders verbatim in the rendered HTML and in the JSON-LD `datePublished` field on `greinar/article.njk:43`.
3. Today every callsite has a valid date — `src/_data/articles.js` populates `date` on all 10 entries, and `sitemap.njk` uses `page.date` (always populated by Eleventy). So this is a latent failure, not an active bug. But the failure mode is brittle and the guard is one line per filter.
4. `jsonEscape` already short-circuits falsy input (`if (!str) return ""`) and explicitly coerces with `String(str)`. There is no failure path to defend against — leave as-is.

## Why

1. **`quality.md §1` (correctness).** The two date filters have asymmetric failure modes (one throws, one silently emits "Invalid Date"). Both are user-facing in JSON-LD and sitemap — a malformed `datePublished` or `<lastmod>` is an SEO regression that won't be caught until a structured-data audit weeks later. The fix is two lines.

2. **`simplicity.md §2` (no speculative defenses) — applied selectively.**
   - Date filters: the trigger ("contributor adds an article without `date:`") is a plausible failure path. `src/_data/articles.js` is hand-edited; nothing in the build pipeline validates frontmatter shape. The guard pays for itself the first time someone forgets the field.
   - `jsonEscape`: the only theoretical failure is "non-string, non-falsy input." Every callsite passes either a string property (`meta.byLocale[lang].title`, `article.author`) or a translated string. Wrapping the existing `String(str)` in additional type checks would be the canonical example of "catching what cannot fail."

3. **`simplicity.md §4.1` (touch only what the change requires).** Two filters get one-line guards. The third filter is left alone. No new helper, no shared utility, no schema validator.

## Where

`eleventy.config.js`, lines 78–88. `jsonEscape` at lines 90–98 is **not** modified.

No template files change. No data files change.

## How

### Before — `dateDisplay` (lines 78–84)

```js
eleventyConfig.addFilter("dateDisplay", (date, lang = "is") =>
  new Date(date).toLocaleDateString(lang === "is" ? "is-IS" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
);
```

### After — `dateDisplay`

```js
eleventyConfig.addFilter("dateDisplay", (date, lang = "is") => {
  if (!date) return "";
  return new Date(date).toLocaleDateString(lang === "is" ? "is-IS" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
});
```

### Before — `dateIso` (lines 86–88)

```js
eleventyConfig.addFilter("dateIso", (date) =>
  new Date(date).toISOString().split("T")[0]
);
```

### After — `dateIso`

```js
eleventyConfig.addFilter("dateIso", (date) => {
  if (!date) return "";
  return new Date(date).toISOString().split("T")[0];
});
```

### `jsonEscape` (lines 90–98) — **no change**

The current implementation is correct. It already returns `""` for falsy input and coerces non-strings with `String(str)`. Leave as-is.

```js
eleventyConfig.addFilter("jsonEscape", (str) => {
  if (!str) return "";
  return String(str)
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");
});
```

### Notes on the guard

- `!date` covers `undefined`, `null`, `""`, `0`, `NaN`. All five are "no usable date" semantically. `0` as an epoch is not a realistic content date.
- We do **not** guard against `new Date("not-a-date")` returning an invalid `Date` object. That requires a `Number.isNaN(d.getTime())` check, which is the speculative half — frontmatter `date:` in YAML is parsed by gray-matter into a real `Date` object, not a string, so a malformed string never reaches the filter. If a contributor writes `date: "tomorrow"`, YAML keeps it as a string and `new Date("tomorrow")` is invalid — but at that point a build-time error is the desired signal, not a silent empty string. Keep the guard tight.
- Returning `""` (not the literal "Invalid Date") is the right empty value: in the article template the date sits inside a `<span>` and renders to nothing; in JSON-LD it produces `"datePublished": ""` which is still invalid structured data but doesn't break the JSON parse — and `""` is easier to grep for in a Lighthouse / Rich Results audit than the cryptic "Invalid Date".

## Expected Outcome

1. Build remains green; no template needs changes.
2. If a future article is added without `date:`, the build no longer throws on `dateIso` and no longer emits the literal string `"Invalid Date"` from `dateDisplay`. Both filters return `""`.
3. `jsonEscape` behaviour is unchanged.

## Scope

**In scope:** two-line guards on `dateDisplay` and `dateIso` in `eleventy.config.js`.

**Out of scope:**
- Validating frontmatter shape at load time (data-cascade `eleventyComputed` validator, JSON-schema linter, etc.). That is a separate, larger decision — file as a future improvement if missing-date incidents recur.
- Changing `jsonEscape` (see §"Why" point 2).
- Auditing every other filter (`where`, `sortBy`, `startsWith`, `alternateUrl`, `t`) for similar guards. Those have their own callsite contracts and are not in this finding.
- Adding tests. No test harness exists in this repo (`package.json` has no `test` script); introducing one is its own decision.

## Directive citations

- `quality.md §1` (correctness) — date filters have observable failure modes (throw vs. literal "Invalid Date") that surface in JSON-LD and sitemap output. Guard them.
- `simplicity.md §2` (no speculative defenses) — applied to reject the `jsonEscape` guard. Filter has no demonstrable failure path; leave it.
- `simplicity.md §4.1` (touch only what the change requires) — two one-line guards, nothing more.
- `maintainability.md §5.1` (follow codebase conventions) — guard style (`if (!x) return defaultValue;` at function top) matches the existing `jsonEscape` pattern.

## Considered alternatives

- **(a) Add `Number.isNaN(d.getTime())` validity check on top of the `!date` guard.** Rejected: catches malformed-string dates that YAML wouldn't pass through anyway (gray-matter parses bare `YYYY-MM-DD` into a `Date` object). The extra check defends against a path that doesn't exist in the data pipeline. Re-evaluate if frontmatter ever starts arriving as strings.

- **(b) Extract a `safeDate(input)` helper shared by both filters.** Rejected: the two filters take different shapes (`dateDisplay` has a `lang` parameter and uses `toLocaleDateString`; `dateIso` uses `toISOString().split("T")[0]`). A shared helper would either return a `Date` (saving one line per filter, at the cost of an extra named export and a `null`-vs-`Date` return type) or return the formatted string (over-engineered). The two duplicated `if (!date) return "";` lines are the lower-cost form.

- **(c) Add a `jsonEscape` guard for non-string non-falsy inputs (e.g., explicit `typeof str !== "string"` branch).** Rejected per `simplicity.md §2`. The existing `String(str)` already coerces objects/numbers correctly; no callsite passes such inputs; speculative.

- **(d) Validate frontmatter at load time via a custom data extension or Eleventy hook.** Rejected as out of scope. That is a project-wide policy choice that affects more than these two filters — file as a separate improvement plan if missing-date or malformed-date incidents accumulate.

- **(e) Throw a clearer error from `dateIso` ("Missing date on page X") instead of returning `""`.** Rejected: returning `""` is the looser, more forgiving contract that matches `dateDisplay`'s existing silent-fail behaviour. Symmetry between the two filters is more valuable than a louder error here — and if a build-time signal is desired, the better intervention is the load-time validator from option (d), not noise inside a formatting filter.
