# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Authoritative docs

The project has durable, hand-written documentation. Read it before making non-trivial changes — don't reinvent these decisions.

- `docs/ARCHITECTURE.md` — descriptive map of the site (stack, source tree, layout chain, build pipeline). Read this first for orientation.
- `docs/directives/` — prescriptive rules. Six files, each the single source of truth for its concern:
  - `css-architecture.md` — file layout, BEM, token discipline, ≤2 nesting depth
  - `content-and-frontmatter.md` — content tree, directory data, frontmatter schemas
  - `templates-and-layouts.md` — layout inheritance, partial conventions
  - `eleventy-config.md` — plugins, filters, collections, image pipeline, build checks
  - `i18n.md` — locale strategy, plugin stack, the `i18n` filter override
  - `javascript-architecture.md` — module shape, Swup lifecycle, `{ signal }` threading, UMD vendor passthrough

The directives are the rules. CLAUDE.md just points at them.

## Commands

- `npm start` — Eleventy dev server with live-reload (lazy image transform via `transformOnRequest`)
- `npm run build` — full production build: `eleventy` then `scripts/check-build.js` (which also imports `check-css.js`)
- `npm run debug` — `DEBUG=Eleventy*` Eleventy run for diagnosing config/plugin issues

There is no test framework, no linter, and no formatter. Verification is the build itself: `npm run build` runs ~9 assertions in `check-build.js` + 5 in `check-css.js`. Both gate the GitHub Pages deploy (`.github/workflows/deploy.yml`). Run `npm run build` locally before pushing.

Node 22 is the dev + CI runtime.

## Big-picture architecture

Static bilingual marketing site (Icelandic primary at `/`, English at `/en/`) for Brunaþéttingar ehf., a fire-sealing/insulation contractor. Deployed to GitHub Pages at the `/bruna-is/` subpath.

Stack: Eleventy v3 (ESM) + Nunjucks + plain CSS + vanilla ES modules. **No bundler, no CSS preprocessor, no JS framework, no client-side router.** The output is static HTML, CSS, JS, fonts, and images. Four runtime deps (Eleventy core, eleventy-img, eleventy-navigation, eleventy-plugin-i18n).

Layout chain: `base.njk` → `page.njk` → `{service,sector,article}.njk`. Never extend `base.njk` directly; `page.njk` owns chrome (skip link, utility bar, header, footer, breadcrumb).

Two parallel content trees under `src/content/{is,en}/`. They are structurally identical: matching directories, matching filenames, parallel frontmatter, parallel directory-data files. The `is/` tree serves at the root; `en/` serves under `/en/`. URL slugs are Icelandic in both locales (`/thjonusta/`, `/geirar/`, `/greinar/`, `/verdreiknir/`) — slugs do not translate.

## Things that bite

- **Internal navigation uses Swup, not full reloads.** `main.js` swaps `#main-content` and re-runs every feature's init after each navigation. Every init takes `{ signal }` and threads it into every `addEventListener` — `main.js` owns one `AbortController` that's aborted before each re-init, killing the previous page's `document`/`window` listeners atomically. A `content:replace` hook copies `<html lang>` and `<body class>` from the incoming document (both vary per page; the head plugin only touches `<head>`). Swup ships as UMD via passthrough copy, loaded as classic `<script>` tags before the module entry; `check-build.js` asserts both vendor files exist. **If you add a new JS module that touches `document`/`window`, take `{ signal }` and pass it to every listener.** Full rules: `docs/directives/javascript-architecture.md`.
- **The `i18n` filter is custom-overridden.** Upstream `eleventy-plugin-i18n` does `lodash.get(translations, '[key][locale]')`, which mis-parses our dotted keys (`ui.skip_to_content`), and its auto-detect reads `url.split('/')[1]` — returning `'about'` for an IS-at-root page like `/about/`. The fix is the inline `i18nOverride` plugin in `eleventy.config.js`. **Every callsite must pass `lang` explicitly**: `{{ "key" | i18n(lang) }}` or `{{ "key" | i18n({ name }, lang) }}`. If you add an i18n callsite without the `lang` argument, it will silently mis-resolve. See `docs/directives/i18n.md` §3.
- **Locale parity is enforced.** Every IS page must have an EN sibling with the same filename and stem. `check-build.js` warns on missing parallels. Add IS + EN in the same commit.
- **Dual image pipeline.** `eleventyImageTransformPlugin` rewrites every `<img src="/img/…">` into a responsive `<picture>` (AVIF/WebP/JPEG at 400/800/1200/auto). Templates write `<img>` — never `<picture>` by hand. `src/img/` is *also* passthrough-copied so `og:image`, `twitter:image`, and JSON-LD `image`/`logo` keep stable unhashed URLs. Both paths must remain; `check-build.js` asserts asset resolution and that `<picture>` actually appears.
- **CSS token discipline is asserted.** Outside `tokens.css`: no raw hex, no `rgba()`, no `px` (except `1px solid|dashed|dotted`). Selectors max 2 levels after the page-family scope class. `!important` requires a rationale comment. No inline `style=""`. `check-css.js` will fail the build on violations.
- **CSS load order is fixed**: `tokens → reset → layout → nav → blocks → home → services → sectors → articles → about → quoter`. Loaded explicitly from `base.njk`. There are exactly 11 files; `check-css.js` fails on missing or extra files.
- **`pathPrefix: "/bruna-is/"`** is set in `eleventy.config.js` for the GH Pages subpath. `meta.url` bakes the prefix in for canonical/OG/JSON-LD absolute URLs. If the site ever moves to an apex domain, remove the `HtmlBasePlugin` and update `meta.pathPrefix` together.
- **The `mockup/` directory is reference-only** — pre-Eleventy design HTML/CSS. Not part of the build. Don't edit it expecting changes to ship.
- **No `permalink:` in content `.md` files.** Permalinks come from the directory data file (`<dir>/<dir>.json`).

## Common change-types

- New page → add IS + EN sibling in same commit. `bodyClass` required. See `directives/content-and-frontmatter.md` §9.
- New translatable string → add the dotted key to `src/_data/i18n.js` with `is` and `en` values; call as `{{ "key" | i18n(lang) }}`. Page-specific copy goes in frontmatter, not the dictionary.
- New CSS rule → pick the right file by the split rule in `directives/css-architecture.md` §2 (one page family → that page family's file; two+ → `blocks.css`; chrome → `layout.css`).
- New filter or collection → register in `eleventy.config.js`. Collections follow `<thing><Locale>` naming with explicit sort.
- New image → drop in `src/img/`, reference as `/img/<name>.<ext>` in markup, write `<img>` (never `<picture>`).
- New JS feature → export `initX({ signal })` from `src/assets/js/<feature>.js`, query-bails-attaches, thread `{ signal }` into every `addEventListener`, wire into `bootstrap()` in `main.js`. See `directives/javascript-architecture.md` §8.

## Conventions captured in user/global instructions

The user's global `~/.claude/CLAUDE.md` already covers: never commit without explicit ask, only do the exact git op requested, sign public-facing text "On behalf of @olioskar by Claude", present approach before non-trivial changes. Those apply here.
