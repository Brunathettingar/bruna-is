# L4 — Stylistic consistency across `src/_data/*.js`

**Severity:** Low
**File(s):** `src/_data/articles.js`, `src/_data/services.js`, `src/_data/sectors.js`, `src/_data/team.js`, `src/_data/principles.js`, `src/_data/milestones.js`
**Specialty:** code-reviewer

---

## Recommendation

**Skip — supersede by C3.** Do nothing now. The finding is cosmetic, the files are already internally consistent, and the larger C3 work ("User-visible page copy hardcoded in `.njk` templates; no markdown content tree exists") deletes or substantially rewrites all six files.

## What

Verify the current state, then take no action. If C3 has not landed within ~2 milestones and these files are still present, revisit the question.

## Why

1. **The files are already consistent.** All six use the same shape:

   ```js
   const entries = [ { … }, { … }, … ];
   export default entries;
   ```

   All six use trailing commas after the last array element and after the last property in each object (verified by reading every file end-to-end). The review's own note concedes: *"All use the `entries` const pattern — fine, just consistent at file boundary."* There is no internal drift to fix.

2. **C3 supersedes.** C3 calls for moving every entry in these files into the `src/content/{is,en}/**` markdown tree as `.md` files with frontmatter. When that lands, `articles.js`, `services.js`, `sectors.js`, `team.js`, `principles.js`, and `milestones.js` either disappear entirely or shrink to small adapter shims around `collections.*`. Rewriting them now to standardise on `export default [...]` is throwaway work — touched once for style, deleted again for C3.

3. **`consistency.md §1.3` cuts both ways.** "Drift accumulates" — but there is no drift yet. The cost of *imposing* a new style across six files (six commits' worth of `git blame` churn on dead-end files, plus a code review) exceeds the local benefit. `simplicity.md §4.1`: touch only what the change requires.

4. **`maintainability.md §4.1` — no drive-by changes.** Reformatting six files for an aesthetic preference, when no behaviour or readability bug is observable, is the canonical drive-by.

## Where

Nowhere. The `entries`-const pattern stays. Trailing commas stay. No file is edited.

If a future contributor adds a *new* `_data/*.js` file before C3 lands, they should follow the existing pattern:

```js
// <one-line purpose comment>
const entries = [
  { … },
  { … },
];

export default entries;
```

That convention is recorded here as a single sentence; it does not require a code change to enforce.

## How

No code change. This document is the action.

## Expected Outcome

1. No diff.
2. No build difference.
3. When C3 is executed, this finding is closed automatically as obsolete.
4. If C3 is dropped or deferred beyond the next milestone, re-open this plan and choose option (b) below.

## Scope

**In scope:** documenting the deliberate non-action so a future reviewer doesn't reopen the same finding.

**Out of scope:** any edit to the six `_data/*.js` files; any style-rule addition to a linter config (Prettier / ESLint are not currently wired — adding them is its own, larger decision); the C3 migration itself.

**Superseded by:** C3 (`docs/combs/reviews/branch-main-round1-report.md:76`). Plan C3 separately; do not bundle.

## Directive citations

- `consistency.md §1` — "Follow established patterns" and "One way per concept." The six files already exhibit one pattern. Imposing a second pattern (even a simpler one) introduces the drift the directive warns against.
- `simplicity.md §4.1` — "Touch only what the change requires." No behavioural problem exists; the change is not required.
- `maintainability.md §4.1` — "No drive-by changes." Reformatting unrelated files is precisely what this directive forbids.
- `maintainability.md §5.1` — "Follow the codebase's conventions, even if you disagree with them." The `entries`-const convention *is* the codebase convention here.

## Considered alternatives

- **(a) Drop the finding outright with no record.** Rejected: a future reviewer running the same comb pass will refile it. The two-paragraph plan below the dotted line is the cheapest way to make the decision discoverable.

- **(b) Standardise on direct `export default [...]`.** This is the simpler form per `simplicity.md` (one fewer named binding, one fewer line):

  ```js
  // <comment>
  export default [
    { … },
    { … },
  ];
  ```

  Rejected for now because (i) the files are about to be deleted/rewritten by C3, (ii) the `entries` name has zero cost at six callsites (none of which import the binding by name — they all consume the default export), and (iii) one-shot stylistic churn across six files violates `maintainability.md §4`. **Adopt this form only if C3 is formally deferred past the next milestone.**

- **(c) Standardise on `const entries = [...]; export default entries;` and add a comment-only style note in `CLAUDE.md` or `docs/`.** Rejected: the pattern is already universal in these files; documenting a rule that nothing currently violates is bureaucratic overhead. If C3 lands, the documentation immediately rots.

- **(d) Add Prettier / ESLint to enforce trailing commas and module style.** Rejected as out of scope. Introducing a formatter/linter is a project-wide decision, not an L4 cosmetic fix. File separately if desired.
