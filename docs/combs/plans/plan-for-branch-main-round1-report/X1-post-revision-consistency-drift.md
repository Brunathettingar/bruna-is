# X1 — Post-revision consistency drift in enforcement appendices + ARCHITECTURE source-tree

**Severity:** Low
**File(s):** `docs/directives/templates-and-layouts.md:247`, `docs/directives/eleventy-config.md:316`, `docs/ARCHITECTURE.md:37`
**Specialty:** consistency-auditor
**Discovered:** during reviewer verification of `revise-bruna-is-directives` (commit `851b7dd`)

---

## What

Three single-line stale references the revise-doc did not list. After the body of each section was revised, the corresponding enforcement-appendix bullet or sibling-doc reference was left pointing at the old phrasing — making the docs internally inconsistent.

1. **`templates-and-layouts.md:247`** (Enforcement appendix bullet) still cites `"≥ 5 structural lines"`, but §2 was revised (per revise-doc §14a) to replace the numeric threshold with a semantic test ("a markup block with a name that survives outside its callsite earns a partial even if used once").

2. **`eleventy-config.md:316`** (Enforcement appendix bullet) still cites `"defensive on input"`, but §4 was revised (per revise-doc §15) to read `"Defensive on data, loud on contract violations."`

3. **`docs/ARCHITECTURE.md:37`** (Source-tree code block annotation) still reads `"package.json → 3 runtime deps + scripts"`, but the count was corrected to "Four runtime npm dependencies" (per revise-doc §21) in `eleventy-config.md`. The two docs now disagree.

## Why

Internal inconsistency in just-revised docs erodes the trust the revision was meant to restore. Each item is a single-line drift the round-1 review missed — they should ship in the same window as the revisions, not wait for a future review round to flag them again.

Citing `consistency.md` — same fact stated two ways in adjacent prose breaks the "single source of truth" expectation.

## Where

- `/Users/olafur/Development/custprojects/brunathettingar/bruna-is/docs/directives/templates-and-layouts.md:247`
- `/Users/olafur/Development/custprojects/brunathettingar/bruna-is/docs/directives/eleventy-config.md:316`
- `/Users/olafur/Development/custprojects/brunathettingar/bruna-is/docs/ARCHITECTURE.md:37`

## How

### Edit 1 — `docs/directives/templates-and-layouts.md` enforcement appendix

Find the appendix bullet currently reading:
```
- §2 partials named by what they render, used in ≥ 2 places or ≥ 5 structural lines.
```
Replace with:
```
- §2 partials named by what they render, used in ≥ 2 places (or single-use only when the partial's name is the contract, e.g. `seo-meta`, `cta-band`, `svg-defs`).
```

(Phrasing mirrors the revised §2 body — see the `templates-and-layouts.md:37` paragraph that ends "the name itself is the contract.")

### Edit 2 — `docs/directives/eleventy-config.md` enforcement appendix

Find the appendix bullet currently reading:
```
- §4 filter conventions — small, pure, defensive on input.
```
Replace with:
```
- §4 filter conventions — small, pure, defensive on data, loud on contract violations.
```

(Phrasing mirrors the revised §4 body bullet at `eleventy-config.md:97`.)

### Edit 3 — `docs/ARCHITECTURE.md` source-tree comment

Find the source-tree code block line currently reading:
```
├── package.json                → 3 runtime deps + scripts (start, build, debug)
```
Replace with:
```
├── package.json                → 4 runtime deps + scripts (start, build, debug)
```

(Matches the corrected count in `eleventy-config.md`'s intro paragraph at `eleventy-config.md:5`.)

## Expected Outcome

After all three edits:
- `grep -n "≥ 5 structural lines" docs/` returns no matches.
- `grep -n "defensive on input" docs/` returns no matches.
- `grep -n "3 runtime deps" docs/` returns no matches.
- `npm run build` exits 0 (smoke check — these are docs-only edits, build should be unchanged).

## Scope

**In scope:** the three single-line edits above, exactly as written.

**Out of scope:** any other consistency drift that may exist between the revised body text and downstream references. If the reviewer spots additional drift while verifying these three edits, surface it as X2 — do not silently fix.

## Directive citations

- `consistency.md` — same fact stated two ways breaks single-source-of-truth.
- The four revisions whose body changes left these stale references: `revise-bruna-is-directives.md §14a` (partial threshold), `revise-bruna-is-directives.md §15` (defensive-on-input phrasing), `revise-bruna-is-directives.md §21` (runtime deps count).
