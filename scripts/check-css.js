// CSS architecture assertions. Run after `npx @11ty/eleventy` via check-build.js.
// Exits 1 on any violation; logs a summary on success.
//
// Enforces docs/directives/css-architecture.md §1, §4, §5.

import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const CSS_DIR = "src/assets/css";
const SITE_DIR = "_site";

const fail = (msg) => { console.error("[check-css] FAIL:", msg); process.exitCode = 1; };
const ok   = (msg) => console.log("[check-css] OK:", msg);

const EXPECTED_FILES = [
  "tokens.css", "reset.css", "layout.css", "nav.css", "blocks.css",
  "home.css", "services.css", "sectors.css", "articles.css", "about.css", "quoter.css",
];

// === 1. File count + names ===
{
  const present = (await readdir(CSS_DIR)).filter(f => f.endsWith(".css")).sort();
  const expected = [...EXPECTED_FILES].sort();
  const missing = expected.filter(f => !present.includes(f));
  const extra = present.filter(f => !expected.includes(f));
  if (missing.length) fail(`missing CSS files: ${missing.join(", ")}`);
  if (extra.length) fail(`unexpected CSS files: ${extra.join(", ")}`);
  if (!missing.length && !extra.length) ok(`11 CSS files present and accounted for`);
}

// === 2. Token discipline: zero raw hex/rgba/px outside tokens.css ===
const HEX_RE = /#[0-9a-fA-F]{3,8}\b/;
const RGBA_RE = /rgba?\(/;
// Allow 1px borders (per directive carve-out). Match any px > 1, or 1px not followed by " solid"/"dashed"/"dotted".
const PX_VIOLATION_RE = /\b(?:[02-9]|\d{2,})px\b|\b1px\b(?!\s+(?:solid|dashed|dotted))/;

for (const file of EXPECTED_FILES) {
  if (file === "tokens.css") continue;
  const text = await readFile(join(CSS_DIR, file), "utf8");
  // Strip comments to avoid false positives in commentary.
  const stripped = text.replace(/\/\*[\s\S]*?\*\//g, "");
  if (HEX_RE.test(stripped)) fail(`raw hex value in ${file}`);
  if (RGBA_RE.test(stripped)) fail(`raw rgba() in ${file}`);
  if (PX_VIOLATION_RE.test(stripped)) fail(`raw px value in ${file} (only "1px solid/dashed/dotted" allowed)`);
}
ok("no raw color/spacing values outside tokens.css");

// === 3. Selector depth: max 2 simple selectors after page-family scope ===
const PAGE_FAMILY_SCOPE_RE = /^\.(home|services|sectors|articles|about|quoter)-page\s+/;

for (const file of EXPECTED_FILES) {
  if (file === "tokens.css" || file === "reset.css") continue;
  const text = await readFile(join(CSS_DIR, file), "utf8");
  const stripped = text.replace(/\/\*[\s\S]*?\*\//g, "");
  // Match selectors before `{`. Crude but sufficient.
  const ruleHeads = stripped.match(/^[^@{}]+(?=\{)/gm) || [];
  for (const head of ruleHeads) {
    for (const selector of head.split(",")) {
      const s = selector.trim();
      if (!s) continue;
      const scopeStripped = s.replace(PAGE_FAMILY_SCOPE_RE, "");
      // Count whitespace-separated simple selectors (excluding combinators >, +, ~).
      const parts = scopeStripped.split(/\s+/).filter(p => !["",">", "+", "~"].includes(p));
      // Directive §4: max 2 levels after the page-family scope class (or 2 levels total in
      // non-scoped files like blocks.css). After scope-strip, parts.length must be ≤ 2.
      if (parts.length > 2) {
        fail(`selector depth > 2 in ${file}: ${s}`);
      }
    }
  }
}
ok("all selectors within depth budget (≤ 2 after page-family scope)");

// === 4. !important without inline comment ===
for (const file of EXPECTED_FILES) {
  const text = await readFile(join(CSS_DIR, file), "utf8");
  const lines = text.split("\n");
  lines.forEach((line, i) => {
    if (!line.includes("!important")) return;
    const sameLineComment = /\/\*.*\*\/|\/\//.test(line);
    const prevLineComment = i > 0 && /\/\*|\/\//.test(lines[i - 1]);
    if (!sameLineComment && !prevLineComment) {
      fail(`${file}:${i + 1} — !important without rationale comment`);
    }
  });
}
ok("every !important has a rationale comment");

// === 5. No inline styles in built HTML ===
async function* walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else yield p;
  }
}

let inlineCount = 0;
for await (const f of walk(SITE_DIR)) {
  if (!f.endsWith(".html")) continue;
  const text = await readFile(f, "utf8");
  // Strip <pre> and <code> blocks (HTML examples in docs/articles).
  const stripped = text.replace(/<(pre|code)[\s\S]*?<\/\1>/g, "");
  const matches = stripped.match(/\sstyle\s*=\s*["'][^"']+["']/g) || [];
  inlineCount += matches.length;
  if (matches.length) fail(`${f}: ${matches.length} inline style attributes`);
}
if (inlineCount === 0) ok("no inline style attributes in built HTML");

if (process.exitCode) {
  console.error("[check-css] CSS architecture assertions FAILED");
} else {
  ok("CSS architecture assertions passed");
}
