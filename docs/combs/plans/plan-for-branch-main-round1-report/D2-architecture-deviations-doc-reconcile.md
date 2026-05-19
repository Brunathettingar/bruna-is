# D2 — Reconcile `docs/architecture-deviations.md` against the audit verdict

**Severity:** Deferred
**File(s):** docs/architecture-deviations.md
**Specialty:** consistency-auditor

---

## What

After the audit's critical/high findings land (C2, C3, H3 — i.e. the framework-spec violations covered by G1 image pipeline, G2 content collections, G12 CSS tokens), `docs/architecture-deviations.md` either becomes obsolete or must be rewritten to record only the deviations that REMAIN intentional after the audit. The current document pre-accepts deviations that the focus brief explicitly overrides; leaving it in the repo unchanged would put a doc that contradicts the spec next to the spec.

This finding is documentation-only. No build, no template, no CSS change. The action is "delete or rewrite," gated on what is true in the tree after the upstream fixes ship.

## Why

`consistency.md §3` — Spec/plan alignment. "Spec said X, code does Y" is critical; here, the doc itself says "we are knowingly doing Y" for three deviations the audit's focus brief reclassifies as bugs to fix. Two contradictory artifacts (`docs/instructions/FRAMEWORK-*.md` and `docs/architecture-deviations.md`) cannot both be the contract. After G1/G2/G12 land, the framework specs are the contract; the deviations doc must be retired or trimmed to match.

`maintainability.md §3` — Comment discipline / no rotting prose. A doc that records "we accepted not doing X" after X has been done is worse than no doc: it actively misinforms the next reader/contributor.

The existing doc has three sections — §1 hero/pillar/sector backgrounds bypassing `<picture>`, §2 raw CSS values in `main.css`, §3 `_data/` files instead of Markdown collections — and each maps one-to-one to an upstream fix in this audit:

| Deviations doc section | Upstream audit finding |
| --- | --- |
| §1 `<picture>` bypassed for backgrounds | G1 (image pipeline) / C2 |
| §2 raw CSS values in `main.css` | G12 (CSS tokens) |
| §3 `_data/` files vs Markdown collections | G2 (content model) / C3 / H3 |

Once those fixes land, all three sections describe a state of the world that no longer exists.

## Where

- `docs/architecture-deviations.md` (the whole file)

No other files reference it by path. A pre-flight check during execution should confirm that (see "How" step 1).

## How

### 0. Sequence

D2 lands **last** in this audit cycle. Do not execute D2 until all of the following have landed on `main` (or the integration branch the audit is being executed on):

- G1 — image pipeline migrated to `<picture>` via `@11ty/eleventy-img` for hero / pillar / sector / service-feature / leading / article-card backgrounds (covers C2 and the deviations doc §1).
- G2 — `services` / `sectors` / `team` / `milestones` / `principles` migrated from `src/_data/*.js` to `src/content/<collection>/<slug>.md` with directory data files (covers C3, H3, and the deviations doc §3).
- G12 — `main.css` raw values (hex, `rgba()`, `px`) migrated to the `tokens.css` scales (covers the deviations doc §2).

If any of those phases are descoped or partially landed, D2's rewrite path (1b below) is the answer — not D2 deletion.

### 1. Pre-flight: confirm no inbound references

Run, from repo root:

```
grep -rn "architecture-deviations" --exclude-dir=_site --exclude-dir=node_modules --exclude-dir=.git .
```

Expected matches today: the file itself, and any audit/plan docs that reference it by name (including this fix doc). If anything *outside* `docs/combs/` or `.planning/` links to it (e.g. a `README.md`, `CONTRIBUTING.md`, or `package.json` script), that link must be updated or removed as part of this fix — flag and resolve before the delete/rewrite.

### 2. Decision gate

Answer one question:

> After G1, G2, G12 land, does any spec deviation remain intentional in the codebase?

Walk the codebase against `docs/instructions/FRAMEWORK-PORT-PROMPT.md`, `FRAMEWORK-I18N.md`, `FRAMEWORK-DOCS.md`. Likely surviving candidates to consider (non-exhaustive — verify in tree, do not assume):

- **GitHub Pages `pathPrefix`** in `eleventy.config.js` plus the `HtmlBasePlugin` choice — driven by deploying to `https://brunathettingar.github.io/bruna-is/`, not a true root. The framework spec may not anticipate a subpath deploy; if so, this is a real, intentional deviation worth documenting.
- Any other framework rule the codebase knowingly does not satisfy after G1/G2/G12 (audit-time judgment call — only include things that are *intentional* and *survive* the audit).

If the answer is **no** (no surviving intentional deviations) → take path **1a (delete)**.

If the answer is **yes** (at least one survives, e.g. `pathPrefix` / `HtmlBasePlugin`) → take path **1b (rewrite)**.

### Path 1a — Delete

```
git rm docs/architecture-deviations.md
```

Commit message:

```
docs: remove architecture-deviations.md

All three deviations recorded in this file (CSS-background image
pipeline, raw CSS values, _data/ files instead of Markdown
collections) were reclassified as framework-spec violations by the
round-1 comb audit (focus brief override) and fixed under G1/G2/G12.
No spec deviations remain intentional; the framework specs in
docs/instructions/ are the sole contract.
```

### Path 1b — Rewrite

Replace the file's contents with a much shorter version that:

1. Opens with a one-paragraph note explaining the doc's narrower scope post-audit: "This file records framework-spec deviations that survived the round-1 comb audit and are intentional. Deviations fixed during the audit are not listed here — see `docs/combs/plans/plan-for-branch-main-round1-report/` for that history."
2. Lists, per surviving deviation, the same four headings the current doc uses: **Spec**, **Current state**, **Why it was accepted**, **Criteria that would trigger doing the work**. Keep the format consistent with what's there — `consistency.md §1` (follow established patterns) applies to the doc's own structure.
3. Drops §1, §2, §3 in their current form entirely. Do not rephrase the old sections — they describe a state of the world that no longer exists.
4. Does **not** add a "fixed in audit" changelog inside this doc. Audit history lives in `docs/combs/plans/` and in commit messages (`maintainability.md §3.3` — don't reference changes in long-lived doc bodies).

Expected post-rewrite size: roughly one section per surviving deviation. If only `pathPrefix`/`HtmlBasePlugin` survives, the file is one section.

Commit message:

```
docs: rewrite architecture-deviations.md to current state

Three deviations recorded in this file were reclassified as
framework-spec violations by the round-1 comb audit and fixed under
G1/G2/G12. This rewrite drops those sections and records only the
deviations that remain intentional after the audit: <list>.
```

### 3. Verify

After path 1a or 1b:

```
grep -rn "architecture-deviations" --exclude-dir=_site --exclude-dir=node_modules --exclude-dir=.git .
```

Path 1a: zero matches outside `docs/combs/` and `.planning/` (the audit's own plan files may still reference it historically — that's fine, those are dated artifacts).

Path 1b: matches limited to the file itself plus the same historical audit references.

Either path: run `npm run build` once. The doc is not in the build pipeline, but a green build confirms nothing else was disturbed.

## Expected Outcome

The repository contains exactly one source of truth for "what framework rules the codebase follows": the `docs/instructions/FRAMEWORK-*.md` files. Either no deviations doc exists (path 1a), or a much shorter one exists that records only deviations the audit endorsed as intentional after the fact (path 1b). A future contributor reading the specs and the deviations doc together gets a consistent answer.

## Scope

**In scope:** `docs/architecture-deviations.md` (delete or rewrite); resolving any inbound references to it discovered in pre-flight.

**Out of scope:**
- Anything in `docs/combs/plans/` or `.planning/` — those are dated audit artifacts and stay as written.
- The framework specs themselves (`docs/instructions/FRAMEWORK-*.md`) — D2 does not edit them.
- Any code change. G1/G2/G12 do the code work; D2 only reconciles the doc to that work.
- Re-running upstream audit checks for G1/G2/G12 — D2 trusts those landed correctly and is purely a documentation pass.

## Directive citations

- `consistency.md §3` — Spec/plan alignment. Two documents in the repo cannot disagree about what the contract is.
- `maintainability.md §3` — Comment/doc discipline. Long-lived docs must reflect current truth; "we are knowingly not doing X" after X has been done is rot.
- `maintainability.md §2` — No dead code (applies to docs by analogy). Delete what no longer describes the system.

## Considered alternatives

- **Leave the file untouched and let readers figure out the contradiction via commit history.** Rejected: violates `consistency.md §3` directly. The next contributor reads files, not git log; a doc that says "we accepted not doing X" sitting next to a spec that says "do X" is exactly the failure mode the directive forbids.
- **Edit the existing §1/§2/§3 in place to say "previously deviated, now resolved" and keep the file.** Rejected: `maintainability.md §3.3` — change-history annotations rot in long-lived docs. That belongs in commit messages and the audit plan folder, not in a doc whose job is to describe current state. Path 1a (delete) and 1b (rewrite without history) both honor this; an in-place edit does not.
- **Replace the doc with a stub pointing at `docs/combs/plans/plan-for-branch-main-round1-report/` for history.** Rejected for the same reason as the previous alternative, and additionally because audit plan folders are dated working artifacts, not a stable history surface to link from a top-level doc.
