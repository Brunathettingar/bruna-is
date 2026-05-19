// Post-build safety net. Runs after `npx @11ty/eleventy`.
// Exits 1 on any assertion failure; logs a summary on success.

import { readFile, readdir } from "node:fs/promises";
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
  if (n < min) fail(`${path} has ${n} <url> entries, expected >= ${min}`);
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
let sawPicture = false;
for (const f of htmlFiles) {
  if ((await readFile(f, "utf8")).includes("<picture")) { sawPicture = true; break; }
}
if (!sawPicture) fail("no <picture> elements in build output — image transform did not run");

// 9. Translation misses (from sidecar)
const miss = join(SITE, ".translation-misses.log");
if (existsSync(miss)) {
  const lines = (await readFile(miss, "utf8")).trim().split("\n").filter(Boolean);
  if (lines.length) console.warn(`[check-build] WARN: ${lines.length} translation fallbacks (see ${miss})`);
}

// Run CSS architecture assertions. Imports the module so process.exitCode
// from check-css.js carries forward to the build exit.
await import("./check-css.js");

if (process.exitCode) { console.error("[check-build] build verification failed"); process.exit(1); }
ok(`all assertions passed (${htmlFiles.length} HTML files)`);
