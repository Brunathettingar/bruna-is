# X1 — Remaining hard-coded phone/email occurrences

**Severity:** Low
**File(s):**
- `src/_includes/partials/footer.njk` (phone + email anchor block)
- `src/content/is/verdreiknir/index.njk`, `src/content/en/verdreiknir/index.njk`
- `src/content/is/thjonusta/index.njk`, `src/content/en/thjonusta/index.njk`
- `src/content/is/geirar/index.njk`, `src/content/en/geirar/index.njk`
**Specialty:** code-reviewer
**Discovered during:** G10 review (the planned single-source-of-truth scope only enumerated `meta.js`, `schema-organization.njk`, `utility-bar.njk` — leaving 7 hard-coded `+3548504405` / `(+354) 850-4405` / `bruna@bruna.is` occurrences across footer + 6 content njk pages).

---

## What

Migrate every hard-coded `+3548504405`, `+354-850-4405`, `(+354) 850-4405`, and `bruna@bruna.is` literal across the affected files to read from `meta.contact.phone.e164`, `meta.contact.phone.display`, and `meta.contact.email` (added to `src/_data/meta.js` by G10).

## Why

G10 established `meta.contact` as the single source of truth. The remaining hard-coded occurrences defeat that contract — changing the phone number requires editing 8+ files instead of one. `consistency.md §1.2` ("one way per concept") and `maintainability.md §1.1` (write for the reader).

## Where

Inspect these grep results:

```bash
rg -n '3548504405|850.?4405|bruna@bruna\.is' src/
```

You should see:
- `src/_includes/partials/footer.njk` — phone + email block in the contact column.
- Three content templates per locale (`verdreiknir`, `thjonusta`, `geirar`) — each has a "ghost" call-to-action block with the hard-coded phone.

(`utility-bar.njk`, `schema-organization.njk`, and `meta.js` already read from `meta.contact.*` after G10 — leave them.)

## How

For each occurrence:

- `tel:` href → `tel:{{ meta.contact.phone.e164 }}`
- visible phone text → `{{ meta.contact.phone.display }}`
- `mailto:` href → `mailto:{{ meta.contact.email }}`
- visible email text → `{{ meta.contact.email }}`

The footer block becomes:

```njk
<li><a href="tel:{{ meta.contact.phone.e164 }}">{{ meta.contact.phone.display }}</a></li>
<li><a href="mailto:{{ meta.contact.email }}">{{ meta.contact.email }}</a></li>
```

The content templates' inline CTAs follow the same swap.

## Expected Outcome

- `rg -n '3548504405|850.?4405|bruna@bruna\.is' src/` returns matches ONLY in `_data/meta.js` (the single source).
- Eleventy build completes; check-build assertions unchanged.
- Rendered phone/email behave identically (`tel:` href, click-to-call works).

## Scope

**In scope:** the 7 hard-coded occurrences across footer.njk and the six content templates.
**Out of scope:** G2 will rewrite the six content templates entirely as part of the content-model migration. If G2 lands before X1, the content-template portion of this fix collapses — only the footer.njk piece remains. Re-check on dispatch.

## Directive citations
- `consistency.md §1.2` — one way per concept.
- `maintainability.md §1.1` — write for the reader (a future contact-info change should be one file, not eight).
- `reusability.md §1.1` — don't copy-paste data.
