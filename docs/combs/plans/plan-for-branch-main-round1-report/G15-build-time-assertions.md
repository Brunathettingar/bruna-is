# G15 — Build-time assertions: a safety net that catches the bugs this review surfaced

- **Severity:** Critical
- **Specialty:** silent-failure-hunter, code-reviewer
- **Consolidates:** C8, T1
- **Files touched:**
  - `scripts/check-build.js` (new)
  - `package.json` (script edit)
  - `.github/workflows/deploy.yml` (insert check step before Pages upload)

## What

Add a single post-build verification script — `scripts/check-build.js` — that runs after `npx @11ty/eleventy` and exits non-zero if any of the following are true in `_site/`:

1. Any built `.html` file contains the literal `[TBD` (catches **C8** — untranslated IS placeholder copy shipped to users).
2. Any built `.html` file contains a raw `{{` or `}}` outside `<pre>`/`<code>` (catches **C1** — Nunjucks frontmatter that didn't render).
3. Either `_site/sitemap.xml` or `_site/en/sitemap.xml` contains fewer `<url>` entries than the expected floor (catches **C5** — sitemap mis-paginated or empty).
4. `header.njk` renders a node matching the selector that `mobileNav.js` queries (catches **C4** — selector contract drift between template, CSS and JS).
5. Every static asset URL emitted as `<link rel="icon" href>`, `<meta property="og:image" content>`, and JSON-LD `Organization.logo` resolves to a real file under `_site/` (catches **M6 / H7** — referenced-but-missing favicon / OG image / logo).
6. No built HTML has an `og:title content="…"` value containing unescaped `<`, `&`, or `"` (catches **C6** — JSON/OG escaping regressions).
7. Every IS-tree URL has a parallel EN-tree URL by slug, and vice versa (warns on the parallel-slug-contract drift the review surfaced repeatedly).
8. At least one `<picture>` element appears in built HTML (catches **C2** — the `eleventy-img` transform silently no-op'd).
9. Print a report of every translation key the `t` filter fell back on (catches **H13** — missing IS strings). This requires a tiny `eleventy.config.js` hook to record fallbacks to a sidecar file the script can read.

Wire the script into the build:

- `package.json` `build` becomes `npx @11ty/eleventy && node scripts/check-build.js`.
- `.github/workflows/deploy.yml` runs `npm run build` (or splits into `npx @11ty/eleventy` followed by `node scripts/check-build.js`) **before** `actions/upload-pages-artifact`, so a failed check blocks deployment.

## Why

The Round 1 comb review found 9+ Critical/High bugs that all share one property: **they are observable in `_site/` build output but the build still exits 0**. Nunjucks ships literal `{{ article.image }}` in `og:image` attributes; the IS site ships 135 occurrences of `[TBD — íslenska]` as final copy; the mobile-nav JS bails silently on every page because the selector contract drifted across three files; favicons and OG images point at files that don't exist. None of these surface until a human eyeballs production.

Per `quality.md` (verify behavior, not assumptions) and `testing.md` (smoke-test the surface that actually shipped), the cheapest correct response is a build-time grep/assertion script. The framework spec's `Your task` step 9 says *"Verify. Walk every page in a browser."* — a human walkthrough is expensive and easy to skip; an `exit 1` on `npm run build` is not.

This fix has to **land first**. Every other Critical/High fix in this round becomes a one-shot regression risk without it. After G15 lands, executing the other plans is gated by `npm run build` succeeding — the executor of any later plan gets immediate feedback if their fix re-introduces one of these classes of bug.

## Where

- `scripts/check-build.js` — new file at repo root, ESM (matches `"type": "module"` in `package.json`). Reads only `_site/`, has no runtime deps beyond Node ≥ 22's standard library (`node:fs/promises`, `node:path`, `node:fs` for `glob`-equivalent recursive read).
- `package.json` — one-line edit to `scripts.build`.
- `.github/workflows/deploy.yml` — replace `- run: npx @11ty/eleventy` with `- run: npm run build`. No new action versions, no new permissions.
- `eleventy.config.js` — small addition inside the `t` filter to append missing-key events to `_site/.translation-misses.log` (kept out of Git via `.gitignore`). One-shot file, rewritten each build.

## How

### 1. New file: `scripts/check-build.js` (≤60 lines)

```js
// Post-build safety net. Runs after `npx @11ty/eleventy`.
// Exits 1 on any assertion failure; logs a summary on success.

import { readFile, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, relative } from "node:path";

const SITE = "_site";
const PREFIX = "/bruna-is";
const fail = (msg) => { console.error("[check-build] FAIL:", msg); process.exitCode = 1; };
const ok   = (msg) => console.log("[check-build] OK:", msg);

async function* walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else yield p;
  }
}

const htmlFiles = [];
for await (const f of walk(SITE)) if (f.endsWith(".html")) htmlFiles.push(f);
if (htmlFiles.length === 0) fail("no HTML produced");

// 1. TBD placeholders
for (const f of htmlFiles) {
  const t = await readFile(f, "utf8");
  if (t.includes("[TBD")) fail(`[TBD placeholder in ${relative(SITE, f)}`);
}

// 2. Unrendered Nunjucks (skip <pre>/<code>)
for (const f of htmlFiles) {
  const t = (await readFile(f, "utf8")).replace(/<(pre|code)[\s\S]*?<\/\1>/g, "");
  if (/\{\{|\}\}/.test(t)) fail(`unrendered Nunjucks in ${relative(SITE, f)}`);
}

// 3. Sitemaps (expected floor: top-level pages + 10 articles per locale)
for (const [path, min] of [["sitemap.xml", 15], ["en/sitemap.xml", 15]]) {
  const p = join(SITE, path);
  if (!existsSync(p)) { fail(`missing ${path}`); continue; }
  const n = ((await readFile(p, "utf8")).match(/<url>/g) || []).length;
  if (n < min) fail(`${path} has ${n} <url> entries, expected ≥ ${min}`);
}

// 4. Mobile-nav selector contract (read one rendered page; tolerate either locale)
const headerSample = htmlFiles.find((f) => /index\.html$/.test(f));
if (headerSample) {
  const html = await readFile(headerSample, "utf8");
  if (!/class="[^"]*\bsite-header__toggle\b/.test(html))
    fail("mobileNav.js selector .site-header__toggle absent from header markup");
}

// 5. Asset URLs resolve under _site/
const assetRegexes = [
  /<link\s+rel="icon"[^>]*href="([^"]+)"/g,
  /<meta\s+property="og:image"[^>]*content="([^"]+)"/g,
  /"logo"\s*:\s*"([^"]+)"/g,
];
for (const f of htmlFiles) {
  const t = await readFile(f, "utf8");
  for (const rx of assetRegexes) {
    for (const [, url] of t.matchAll(rx)) {
      if (!url.startsWith("/") && !url.startsWith("http")) continue;
      const local = url.replace(/^https?:\/\/[^/]+/, "").replace(PREFIX, "");
      const fsPath = join(SITE, local);
      if (!existsSync(fsPath)) fail(`asset 404: ${url} (from ${relative(SITE, f)})`);
    }
  }
}

// 6. og:title escaping
for (const f of htmlFiles) {
  const t = await readFile(f, "utf8");
  for (const [, v] of t.matchAll(/<meta\s+property="og:title"[^>]*content="([^"]*)"/g)) {
    if (/[<>&](?!amp;|lt;|gt;|quot;|#)/.test(v))
      fail(`unescaped og:title in ${relative(SITE, f)}: ${v}`);
  }
}

// 7. Parallel-slug contract
const slugs = (loc) => new Set(htmlFiles
  .filter((f) => f.startsWith(join(SITE, loc === "is" ? "" : "en")) && (loc === "is" ? !f.startsWith(join(SITE, "en")) : true))
  .map((f) => relative(loc === "is" ? SITE : join(SITE, "en"), f).replace(/index\.html$/, "")));
const is = slugs("is"), en = slugs("en");
for (const s of is) if (!en.has(s)) console.warn(`[check-build] WARN: IS slug ${s} has no EN parallel`);
for (const s of en) if (!is.has(s)) console.warn(`[check-build] WARN: EN slug ${s} has no IS parallel`);

// 8. eleventy-img fired
if (!htmlFiles.some(async (f) => (await readFile(f, "utf8")).includes("<picture")))
  fail("no <picture> elements in build output — image transform did not run");

// 9. Translation misses (from sidecar)
const miss = join(SITE, ".translation-misses.log");
if (existsSync(miss)) {
  const lines = (await readFile(miss, "utf8")).trim().split("\n").filter(Boolean);
  if (lines.length) console.warn(`[check-build] WARN: ${lines.length} translation fallbacks (see ${miss})`);
}

if (process.exitCode) { console.error("[check-build] build verification failed"); process.exit(1); }
ok(`all assertions passed (${htmlFiles.length} HTML files)`);
```

Notes for the executor:

- Sketch is ≤60 lines of logic; the count above includes blank/brace lines. Keep it dependency-free — no `glob`, no `cheerio`. Node ≥ 22 (matches `actions/setup-node@v4` in `deploy.yml`) ships everything needed.
- `PREFIX = "/bruna-is"` matches `pathPrefix` in `eleventy.config.js:169`. If the prefix ever changes, update both.
- The sitemap floor (`15`) is a deliberate under-count: 5 top-level singletons (`/`, `/thjonusta/`, `/geirar/`, `/greinar/`, plus contact/about as the mockup dictates) + 10 paginated articles. If the floor turns out to be wrong, **tighten** rather than loosen — the failure mode the review found was an empty sitemap.
- Assertion (4) reads one HTML file as a contract probe rather than parsing the source `header.njk` — the question is "did the rendered markup actually contain the selector the JS will query", which is the only thing that matters at runtime.
- Assertion (7) emits warnings, not failures. A locale-asymmetric tree is sometimes intentional (e.g. landing pages that only exist in one locale). Failing here would be too aggressive; the warning surfaces drift loudly enough.

### 2. `eleventy.config.js` — record translation misses

In the existing `t` filter (around line 55), add a one-line side effect when an entry is missing or the requested language is absent. Append to a file in `_site/`. (Use `node:fs.appendFileSync` synchronously inside the filter — Eleventy calls filters synchronously and a single small append per miss is fine.)

```js
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const MISS_LOG = "_site/.translation-misses.log";
function recordMiss(key, lang) {
  try { mkdirSync(dirname(MISS_LOG), { recursive: true }); appendFileSync(MISS_LOG, `${lang}\t${key}\n`); } catch {}
}

eleventyConfig.addFilter("t", function (key, data) {
  const lang = this.ctx?.lang || this.page?.lang || "is";
  const entry = translations[key];
  if (!entry) { recordMiss(key, lang); return key; }
  if (entry[lang] !== undefined) return data ? interpolate(entry[lang], data) : entry[lang];
  recordMiss(key, lang);
  return entry.is ?? entry.en ?? key;
});
```

Add `_site/` is already gitignored; no `.gitignore` change is needed. The log is rewritten on each build (clobbered by the `_site/` clean step Eleventy performs, plus overwritten on the next miss-free build). If the executor wants a fresh-each-build guarantee, truncate `MISS_LOG` once at the top of `eleventy.config.js`:

```js
import { writeFileSync } from "node:fs";
try { writeFileSync(MISS_LOG, ""); } catch {}
```

### 3. `package.json` — wire the check into `build`

Before:

```json
"build": "npx @11ty/eleventy",
```

After:

```json
"build": "npx @11ty/eleventy && node scripts/check-build.js",
```

`start` and `debug` are unchanged — the check is a release-time gate, not a dev-loop nuisance.

### 4. `.github/workflows/deploy.yml` — gate Pages upload

Replace the build step (`deploy.yml:23`):

```yaml
- run: npx @11ty/eleventy
```

with:

```yaml
- run: npm run build
```

That single edit picks up `&& node scripts/check-build.js` from `package.json`. If the check fails, the job fails before `actions/upload-pages-artifact` runs — broken builds never reach Pages.

## Sequencing

**G15 lands FIRST in this round, before any other Critical/High fix.** Rationale:

- Every other plan in the round (`C1`, `C4`, `C8`, `M6/H7` in `G10`, `C6`, `C5`, `C2`) closes one specific failure mode. G15 turns those modes into hard `exit 1`s the next time anyone introduces them.
- The C8 (`[TBD`) fix is *immediate-action* — the executor of C8 (or whoever decides per-string whether to translate / fallback / draft-hide) gets a failing build until the placeholder is gone. Without G15, C8 has no enforcement.
- The script is dependency-free, runs in a few hundred ms, and only reads `_site/`. Risk of false positives is bounded; risk of false negatives is the only thing tuned over time (tighten floors, add patterns).

## Scope

**In scope:**
- New `scripts/check-build.js` per the sketch above, with the nine listed assertions.
- One-line `package.json` edit.
- One-line `deploy.yml` edit.
- Roughly 5 lines added to the existing `t` filter in `eleventy.config.js` for the translation-miss sidecar.

**Out of scope:**
- A test runner (Vitest/Jest). The script intentionally has no harness — that's a separate decision tracked in the broader testing question. The smoke-grep approach is what `testing.md` calls "verify the surface, not the implementation."
- Snapshot testing of generated HTML. Out of scope; would couple the suite to unrelated formatting noise.
- A pre-commit hook. CI is the enforcement point here; local devs can run `npm run build` on demand.
- Pre-build JS test from the original brief (load `header.njk` and `mobileNav.js`, query the selector with jsdom). Folded into assertion (4) which reads the *rendered* output — a cheaper signal that doesn't introduce a jsdom dependency. If a jsdom-based unit test is later wanted, file separately.
- The "every `<link rel="icon">` URL resolves" check on remote URLs — only same-origin/relative paths are validated (anything with `http(s)://` and a non-`meta.url` host is skipped). Cross-origin reachability is a separate monitoring concern.

## Expected outcome

1. `npm run build` exits 0 on a clean tree and prints `[check-build] OK: all assertions passed (N HTML files)`.
2. Re-introducing any of the Round 1 bugs (e.g. moving `ogImage` back out of `eleventyComputed`, deleting the OG image file, dropping a fresh `[TBD` into a data file) causes `npm run build` to exit 1 with a one-line reason.
3. GitHub Actions blocks Pages deploy on any verification failure — the `upload-pages-artifact` step does not run.
4. `_site/.translation-misses.log` lists every `t`-filter fallback, surfacing H13 candidates without failing the build.

## Verification

After landing G15 alone (no other fixes from this round yet), `npm run build` is **expected to fail loudly**. That is the success criterion for this plan — the script's job is to catch the existing bugs. The expected first-run output is:

- `FAIL: [TBD placeholder in greinar/handover-report-contents/index.html` (and many similar — C8)
- `FAIL: unrendered Nunjucks in greinar/ei-rating-explained/index.html` (C1)
- `FAIL: asset 404: /bruna-is/assets/img/og-default.jpg` (M6)
- `FAIL: asset 404: /bruna-is/assets/img/favicon.svg` (M6)
- `FAIL: mobileNav.js selector .site-header__toggle absent from header markup` (C4)
- Possibly: `FAIL: no <picture> elements in build output` (C2 — depends on whether the image transform is actually firing today)

The failing build is the gate. As the other plans land, failures clear one by one until `npm run build` exits 0. At that point the round is *demonstrably* done — not "I walked the pages and it looked fine."

## Directive citations

- `testing.md §1` — *Test the surface, not the implementation.* The script greps the artefact (`_site/`), not the source, so it is robust against template refactors.
- `testing.md §2` — *Smoke tests catch the bugs you keep finding.* Every assertion in the script is reverse-engineered from a Round 1 finding.
- `quality.md §1` — *Verify behavior, not assumptions.* The script asserts what shipped, not what was intended.
- `quality.md §3` — *Silent failures are the worst failures.* Eleventy exits 0 on every one of these bugs today; the script makes them loud.
- `FRAMEWORK-PORT-PROMPT.md §"Your task" step 9 (Verify)* — A grep-script gate is the cheapest correct interpretation of "Verify. Walk every page" that survives in CI without a human.

## Considered alternatives

- **Add a real test runner (Vitest) with jsdom unit tests.** Rejected for this round: bigger blast radius, requires deciding on test layout/conventions, and the failure modes the review surfaced are all about *artefact* correctness, not unit-level logic. A test runner is the right move *after* G15 proves which assertions earn their keep.
- **Pre-commit hook instead of CI gate.** Rejected: local hooks are easy to bypass and don't catch deploys from forks/PRs. The CI gate is unconditional.
- **Parse HTML with `cheerio` / `linkedom` instead of regex.** Rejected for ≤60-line scope: the assertions are coarse (presence/absence of literals, URL resolution, count thresholds) and don't need a DOM. If assertion (6) — escaping — turns out to be regex-fragile, swap *that one check* to `linkedom` later; the others stay regex.
- **Run the check as a separate `npm run check` step that CI calls explicitly.** Considered. Folding into `build` is simpler (one script everyone already runs locally) and the dev loop (`npm start`) is unaffected because `start` doesn't call `build`. If the check becomes slow (current sketch is well under 1s on a small site), split it then.
- **Make assertion (7) — parallel-slug drift — a hard failure.** Rejected: the IS/EN slug contract is a project convention, not a framework invariant; some asymmetric pages may be legitimate. Warning is the right severity until the contract is documented in `architecture.md` and ratified.
