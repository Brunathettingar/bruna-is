# D1 — Lighthouse mobile pass after critical fixes land

**Severity:** Deferred
**Specialty:** code-reviewer
**Type:** Operational runbook (no code change in this finding)
**Depends on (must be merged first):** C1, C4, C5, C6, G1, G15

---

## What

Run a Lighthouse mobile audit against a representative slice of the built site and confirm every page clears the score floor below. This is the verification step the framework spec asks for at `FRAMEWORK-PORT-PROMPT.md:621` — "Run a Lighthouse pass; nothing should be obviously broken on accessibility or SEO." It is deliberately deferred to the end of the round so the audit sees the post-fix HTML, not the pre-fix HTML.

## Why

The static read-only audit that produced C1–C6 inspected source and `_site/` artefacts; it did not actually drive a headless browser. Lighthouse is the next layer of verification — it catches things the static read cannot: layout-shift behaviour, render-blocking resources, real contrast on rendered pixels, tap-target sizes, image sizing under throttled mobile, and the accessibility tree as Chromium sees it. Running it before the criticals land would produce noise (e.g. C1's broken `og:image` will fail the SEO audit until fixed) and waste a round. Running it after gives a clean baseline for round 2 to react to.

## When to run

Run D1 **only after all of the following are merged to `main`** and a fresh `npm run build` has produced `_site/`:

- **C1** — article `ogImage` moved into `eleventyComputed` (otherwise SEO audit fails on every article page).
- **C4** — mobile nav selector fix (otherwise Accessibility audit fails on tap-target reachability at mobile width).
- **C5** — (apply when C5 lands; covers whatever critical it addresses).
- **C6** — (apply when C6 lands; covers whatever critical it addresses).
- **G1, G15** — pre-existing gating findings.

If any of those are still open, **stop** and re-queue D1 for the next round. Do not run a partial pass.

## Where

Pages to audit (5 total — one of each shape, both locales represented):

| # | URL (relative to `https://brunathettingar.github.io/bruna-is`) | Shape |
|---|---------------------------------------------------------------|-------|
| 1 | `/`                                                           | IS home (singleton) |
| 2 | `/en/`                                                        | EN home (singleton) |
| 3 | `/thjonusta/`                                                 | IS services listing |
| 4 | `/greinar/`                                                   | IS articles listing |
| 5 | `/greinar/ei-rating-explained/`                               | IS article (paginated detail) |

`/greinar/ei-rating-explained/` is the canonical sample article (the C1 fix is verified against it; reuse it here so failures are easy to correlate). If that slug changes before D1 runs, substitute any other article from `src/_data/articles.js` — pick one IS article only; one detail page is enough to characterise the paginated template.

## How

### 1. Build a clean `_site/`

```sh
rm -rf _site
npm ci
npm run build
```

`npm ci` (not `npm install`) so the lockfile is honoured. Confirm `_site/index.html`, `_site/en/index.html`, `_site/thjonusta/index.html`, `_site/greinar/index.html`, and `_site/greinar/ei-rating-explained/index.html` all exist before continuing.

### 2. Serve the built site locally

Lighthouse must hit a real HTTP origin (file:// breaks several audits, including service-worker, manifest, and some SEO checks). Use any minimal static server; `npx serve` is fine:

```sh
npx serve _site -l 8080
```

The site's canonical URLs include the `/bruna-is` project-page subpath (`src/_data/meta.js:21`). For Lighthouse purposes this is harmless — audit against `http://localhost:8080/...` and the canonical/OG URLs will still resolve correctly in markup; we are measuring rendering, not link integrity here.

### 3. Run Lighthouse CLI against each page (mobile preset)

```sh
npx lighthouse@latest http://localhost:8080/                                  --preset=desktop --form-factor=mobile --screenEmulation.mobile=true \
  --only-categories=performance,accessibility,seo,best-practices \
  --output=json --output=html \
  --output-path=./docs/combs/lighthouse/round1/home-is \
  --chrome-flags="--headless=new --no-sandbox"
```

That single command is the template. Run it **five times**, once per page, varying the URL and the `--output-path` filename:

| URL                                                  | `--output-path`                                              |
|------------------------------------------------------|--------------------------------------------------------------|
| `http://localhost:8080/`                             | `./docs/combs/lighthouse/round1/home-is`                     |
| `http://localhost:8080/en/`                          | `./docs/combs/lighthouse/round1/home-en`                     |
| `http://localhost:8080/thjonusta/`                   | `./docs/combs/lighthouse/round1/services-is`                 |
| `http://localhost:8080/greinar/`                     | `./docs/combs/lighthouse/round1/articles-is`                 |
| `http://localhost:8080/greinar/ei-rating-explained/` | `./docs/combs/lighthouse/round1/article-detail-is`           |

Note on the preset flag: the recipe above sets `--form-factor=mobile` and `--screenEmulation.mobile=true` explicitly. **Drop** `--preset=desktop` — it's shown above as a copy-paste hint to make the override visible, but the real run should not include it. The correct single command is:

```sh
npx lighthouse@latest <URL> \
  --form-factor=mobile --screenEmulation.mobile=true \
  --throttling-method=simulate \
  --only-categories=performance,accessibility,seo,best-practices \
  --output=json --output=html \
  --output-path=<PATH-PREFIX> \
  --chrome-flags="--headless=new --no-sandbox"
```

`--throttling-method=simulate` matches the default Lighthouse mobile profile (Slow 4G + 4× CPU slowdown). Do not change it — a different throttling profile produces non-comparable scores between rounds.

Each invocation writes two files: `<PATH-PREFIX>.report.html` (human-readable) and `<PATH-PREFIX>.report.json` (machine-readable; round 2 may diff against this).

### 4. Score targets

A page **passes** when all four categories clear the floor on a single run:

| Category        | Floor | Notes |
|-----------------|-------|-------|
| Performance     | ≥ 90  | Mobile, simulated throttling. |
| Accessibility   | ≥ 95  | Hard target — C4 and the spec's a11y requirements depend on this. |
| SEO             | ≥ 95  | Hard target — C1 and per-page SEO (spec line 619) depend on this. |
| Best Practices  | ≥ 90  | Catches mixed content, deprecated APIs, console errors. |

Why these levels: the framework spec asks for "nothing obviously broken on accessibility or SEO" — a 95 floor is what Lighthouse considers a "passing" green score on those categories, and is the conventional bar for a static portfolio/marketing site. Performance ≥ 90 is achievable on a vanilla-JS, `eleventy-img`-optimised static site delivered over GitHub Pages; if any page can't hit 90 the cause is almost certainly a fixable asset (uncompressed image, large font payload, render-blocking CSS) rather than a structural problem.

Run each page **once**. If a category lands within 2 points of the floor (e.g. Performance 88), re-run that single page twice more and take the median — Lighthouse has known run-to-run variance of ±3–5 points on Performance under simulated throttling. Accessibility and SEO are deterministic; do not re-run those to "get a better score" — fix the underlying issue.

### 5. Page checklist

Track pass/fail per page in the round 1 report folder; suggested format:

- [ ] `/` — Perf __ / A11y __ / SEO __ / BP __ → PASS | FAIL
- [ ] `/en/` — Perf __ / A11y __ / SEO __ / BP __ → PASS | FAIL
- [ ] `/thjonusta/` — Perf __ / A11y __ / SEO __ / BP __ → PASS | FAIL
- [ ] `/greinar/` — Perf __ / A11y __ / SEO __ / BP __ → PASS | FAIL
- [ ] `/greinar/ei-rating-explained/` — Perf __ / A11y __ / SEO __ / BP __ → PASS | FAIL

A category fails when its score is below the floor in the table above.

### 6. Action protocol if a target fails

For each failing category on each page:

1. Open the corresponding `<PATH-PREFIX>.report.html` in a browser.
2. Identify the **first audit** under the failing category that is marked red (Failed) or amber (Needs improvement). Lighthouse orders audits by impact, so the first one is the highest-leverage fix.
3. Capture:
   - The page URL.
   - The category name and score.
   - The specific failing audit ID (e.g. `image-size-responsive`, `color-contrast`, `meta-description`, `tap-targets`).
   - The audit's "Failing elements" list (DOM selectors / URLs / file paths Lighthouse cites).
   - A screenshot of the audit panel.
4. **File a new finding for the next comb round.** Do **not** fix it inline as part of D1 — D1's job is to measure, not to patch. Each failing audit becomes its own finding, severity determined by category:
   - Failing **Accessibility** or **SEO** audit → **Critical** finding for the next round.
   - Failing **Performance** audit (score 80–89) → **Medium** finding.
   - Failing **Performance** audit (score <80) → **High** finding.
   - Failing **Best Practices** audit → severity matches the audit's own impact label (use Lighthouse's red/amber as a hint).
5. Use the round 1 report folder's naming convention for the new finding (e.g. `R2-C1-lighthouse-image-size-greinar-detail.md`).

The reason for funnelling failures into the next round rather than patching mid-pass: D1 is a measurement gate. If you start patching mid-pass, the scores you record stop characterising the post-C1–C6 baseline, and round 2 loses its anchor.

### 7. Re-run after the next round (optional, recommended)

If round 2 lands new findings driven by D1 failures, queue a **D1.1** in round 2's plan that repeats this exact runbook. Diff the JSON reports against this round's to confirm the regressions are gone and no new ones appeared.

## Expected outcome

- Five Lighthouse HTML + JSON report pairs in `docs/combs/lighthouse/round1/`.
- A populated checklist in the round 1 report folder (section 5 above) with concrete numbers per page.
- Either: all five pages PASS — D1 is closed and the round-1 verification gate is met; **or:** one or more pages FAIL, and each failing audit has its own follow-up finding filed for round 2.

## Scope

**In scope:**
- Running Lighthouse against the five listed URLs against a built `_site/` served on `localhost`.
- Capturing reports.
- Filing follow-up findings for any failing audit.

**Out of scope:**
- Fixing any audit failures inline (those become round 2 findings).
- Auditing every paginated article URL — one IS detail page is the agreed sample.
- Desktop Lighthouse run — the spec and the project's mobile-first stance make the mobile preset the load-bearing one. A desktop run can be a follow-up if mobile passes cleanly.
- Real-device testing (Android Chrome on a physical device) — out of scope for an automated runbook; nice-to-have once the headless pass is green.
- Pa11y, axe-CLI, or other a11y scanners — D1 is scoped to Lighthouse; broader a11y tooling is a separate finding if desired.

## Directive citations

- `quality.md §1` — "Verify behavior, not assumptions." Lighthouse exercises the rendered page in a real browser; the static read cannot.
- `quality.md §1.2` — "Test the edges." The detail-page sample (`/greinar/ei-rating-explained/`) is the paginated edge of the article template; if it passes, the other nine articles built from the same `article.njk` will too.
- `testing.md §2.1` — "Tests exercise the unit's contract, not its internals." Lighthouse measures the contract the framework spec defines (a11y, SEO floor) without coupling to template internals.
- `testing.md §5.1` — "A flaky test is worse than no test." Section 4's re-run-on-near-floor rule plus the fixed `--throttling-method=simulate` flag manage Lighthouse's known run-to-run variance.
- `FRAMEWORK-PORT-PROMPT.md:621` — verbatim source of the requirement.
- `FRAMEWORK-PORT-PROMPT.md` §"SEO and JSON-LD" — SEO floor of 95 is the operational reading of "nothing obviously broken on SEO."

## Alternatives (rejected)

- **WebPageTest or PageSpeed Insights (hosted)** — both require a public URL. The fix is to be runnable before deploy, against `_site/`. Local Lighthouse satisfies that constraint; hosted tools become useful once the site is live and only as a secondary check.
- **Chrome DevTools Lighthouse panel (manual)** — fine for ad-hoc spot-checks, but the CLI gives machine-readable JSON we can diff between rounds. Manual UI runs do not produce the JSON output the round-2 diff would need.
- **Audit every article URL** — 10 IS + 10 EN articles share one template. Auditing all 20 would multiply runtime by 4× for near-zero new signal. One detail page is sufficient; if that one fails, the finding is filed against the template, not the page.
- **Fix audit failures inline as part of D1** — rejected (see §6 above). D1 is a measurement; mixing it with fixes destroys the baseline.
- **Lower the floors to "Performance ≥ 80 / a11y ≥ 90 / SEO ≥ 90"** — rejected. The spec calls a11y and SEO out specifically; 95 is the standard green-zone bar and a static site of this size should clear it. Lowering the floor would mask exactly the issues the spec asked to be caught.
