# M18 — Remove the unused `bodyClass` indirection in `page.njk`

**Severity:** Medium
**Specialty:** simplifier
**Files touched:**
- `src/_includes/layouts/page.njk` (collapse the `bodyClass` if/else into the bare `{{ content | safe }}` form)

## Why

`page.njk:12–18` parameterizes the main slot on an optional `bodyClass` variable, wrapping `{{ content | safe }}` in a `<div class="{{ bodyClass }}">` whenever a caller sets it.

No caller sets it. Grep across the entire `src/` tree confirms zero references:

```
$ rg 'bodyClass' src/
src/_includes/layouts/page.njk:12:    {%- if bodyClass %}
src/_includes/layouts/page.njk:13:    <div class="{{ bodyClass }}">
```

The only mentions are the definition itself. Every page in `src/content/{en,is}/**` extends `page.njk` (directly or via the `base.njk → page.njk` chain) without ever passing `bodyClass`, so the `else` branch always wins. Three lines of conditional plus a never-rendered `<div>` exist solely to support a hypothetical future caller — textbook YAGNI violation (`simplicity.md §1`).

### Spec deviation, weighed

`FRAMEWORK-PORT-PROMPT.md` Part A (lines 195–220) **does** include the `bodyClass` block in its canonical `page.njk` template. Deleting it is therefore a deliberate deviation from the framework spec.

Two considerations make the deviation worth taking:

1. The spec describes a *framework to reproduce*, not a contract this project must hold forever. Once Part A is scaffolded and the project diverges with real content, dead parameterization that no page exercises is dead weight, not framework fidelity.
2. The framework spec is internal documentation co-owned by this project; if the deletion is accepted, the template in Part A can be updated in lockstep (out of scope for this fix — see "Follow-up" below).

The alternative — keeping the three lines and treating the spec as load-bearing — preserves an abstraction that has zero concrete callers. Per `simplicity.md §1.2` ("one concrete use-case beats one abstraction") and `scope-discipline.md §3.1` ("the asked feature, not the inferred-better feature"), the YAGNI deletion is the simpler, more honest path. The block can be re-added in a single commit the day a page actually needs a body wrapper class.

## What

1. In `src/_includes/layouts/page.njk`, replace the four-line `{%- if bodyClass %} … {%- endif %}` block with a single `{{ content | safe }}` line inside `<main>`.
2. No other files change. No CSS, no JS, no content frontmatter references `bodyClass` today, so there is nothing downstream to clean up.

### Follow-up (out of scope for this fix)

After this fix lands, update `docs/instructions/FRAMEWORK-PORT-PROMPT.md` Part A (lines 208–214) in a separate commit so the canonical template matches the simplified layout. That keeps spec and code in sync without bundling the doc edit into a code-only fix (`scope-discipline.md §2.1`).

## How

### `src/_includes/layouts/page.njk`

**Before** (full file, 22 lines):

```njk
---
layout: layouts/base.njk
---
<a href="#main-content" class="skip-link">{{ "ui.skip_to_content" | t }}</a>
<div class="page-wrapper">
  {% include "partials/utility-bar.njk" %}
  {% include "partials/header.njk" %}
  <main id="main-content">
    {%- if eleventyNavigation and eleventyNavigation.parent %}
    {% include "partials/breadcrumb.njk" %}
    {%- endif %}
    {%- if bodyClass %}
    <div class="{{ bodyClass }}">
      {{ content | safe }}
    </div>
    {%- else %}
      {{ content | safe }}
    {%- endif %}
  </main>
  {% include "partials/footer.njk" %}
</div>
```

**After:**

```njk
---
layout: layouts/base.njk
---
<a href="#main-content" class="skip-link">{{ "ui.skip_to_content" | t }}</a>
<div class="page-wrapper">
  {% include "partials/utility-bar.njk" %}
  {% include "partials/header.njk" %}
  <main id="main-content">
    {%- if eleventyNavigation and eleventyNavigation.parent %}
    {% include "partials/breadcrumb.njk" %}
    {%- endif %}
    {{ content | safe }}
  </main>
  {% include "partials/footer.njk" %}
</div>
```

Net change: −6 lines, +1 line. No other edits.

## Verification

1. `rg 'bodyClass' src/` returns no matches after the edit.
2. `npx @11ty/eleventy` builds without errors or warnings.
3. Spot-check rendered output for at least one page per locale (e.g., `_site/index.html`, `_site/en/index.html`, `_site/about/index.html`): the `<main id="main-content">` element directly contains the page content with no orphan wrapper `<div>` and no Nunjucks artifact.
4. Visual diff against a pre-change build: no visible difference (the `else` branch was already the only branch that ever rendered).
5. Confirm `docs/instructions/FRAMEWORK-PORT-PROMPT.md` Part A still references the old template — that drift is intentional and tracked as the follow-up in "What" above.
