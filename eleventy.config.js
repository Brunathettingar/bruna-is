import eleventyNavigationPlugin from "@11ty/eleventy-navigation";
import { eleventyImageTransformPlugin } from "@11ty/eleventy-img";
import { I18nPlugin, HtmlBasePlugin } from "@11ty/eleventy";
import i18nPlugin from "eleventy-plugin-i18n";
import translations from "./src/_data/i18n.js";
import meta from "./src/_data/meta.js";
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const MISS_LOG = "_site/.translation-misses.log";
function recordMiss(key, lang) {
  try { mkdirSync(dirname(MISS_LOG), { recursive: true }); appendFileSync(MISS_LOG, `${lang}\t${key}\n`); } catch {}
}
try { mkdirSync(dirname(MISS_LOG), { recursive: true }); writeFileSync(MISS_LOG, ""); } catch {}

export default function (eleventyConfig) {
  eleventyConfig.addPlugin(eleventyNavigationPlugin);

  // Registered to rewrite href/src attributes at build time so the site can
  // serve from the GitHub Pages project subpath (/bruna-is/). Not in the
  // framework spec's Part A template — remove this plugin and the
  // matching meta.pathPrefix change if/when the site moves to a custom
  // domain at the apex.
  eleventyConfig.addPlugin(HtmlBasePlugin);

  eleventyConfig.addPlugin(eleventyImageTransformPlugin, {
    formats: ["avif", "webp", "jpeg"],
    widths: [400, 800, 1200, "auto"],
    htmlOptions: {
      imgAttributes: { loading: "lazy", decoding: "async" },
    },
    transformOnRequest: process.env.ELEVENTY_RUN_MODE === "serve",
  });

  eleventyConfig.addPlugin(I18nPlugin, {
    defaultLanguage: "is",
    errorMode: "allow-fallback",
  });

  // UI string dictionary. The plugin's `i18n` filter auto-detects locale
  // from `url.split('/')[1]`, which returns `'about'` (not `'is'`) for an
  // Icelandic-at-root page like `/about/`. Every callsite therefore passes
  // `lang` as the explicit `localeOverride` argument:
  //
  //     {{ "key" | i18n(lang) }}            ← no interpolation data
  //     {{ "key" | i18n({ name }, lang) }}  ← with interpolation data
  //
  // Missing keys log to stderr (chalk-red console.warn). Missing IS strings
  // on IS pages render the raw key — that is intentional. Add the key to
  // src/_data/i18n.js.
  eleventyConfig.addPlugin(i18nPlugin, {
    translations,
    fallbackLocales: { en: "is" },
  });

  // Override the plugin's `i18n` filter. Two reasons we replace it rather
  // than rely on the upstream callable directly:
  //
  // 1. The plugin's lookup is `lodash.get(translations, '[${key}][${locale}]')`,
  //    which interprets dots inside the key as path separators. Every key in
  //    our dictionary is dotted (`"ui.skip_to_content"`, etc.), so the
  //    plugin's lookup never resolves — it always misses and returns the raw
  //    key, regardless of what the dictionary contains.
  // 2. The plugin's URL-prefix auto-detect (`url.split('/')[1]`) returns
  //    `'about'` (not `'is'`) for an Icelandic-at-root page like `/about/`.
  //    Templates therefore pass `lang` as a `localeOverride` argument.
  //
  // We register inside an inline plugin so this `addFilter` runs *after*
  // the upstream i18n plugin's own `addFilter('i18n', ...)` during plugin
  // execution (plugin order = registration order). A top-level `addFilter`
  // would be overwritten by the upstream plugin's later execution.
  //
  // Behavior:
  //   - Direct bracket-property lookup against the same `translations`
  //     dictionary the upstream plugin holds.
  //   - One-way fallback: `en → is` only. A missing IS string on an IS page
  //     renders the raw key and warns red. Per FRAMEWORK-I18N.md §"Config
  //     additions".
  //   - Every miss routed through `recordMiss` to populate G15's sidecar
  //     log at `_site/.translation-misses.log`.
  //   - Interpolation of `{{name}}` tokens via a tiny inline replacer when
  //     a data object is passed. No callsite uses interpolation today, but
  //     the surface is preserved for parity with the upstream plugin's
  //     `templite` semantics.
  eleventyConfig.addPlugin(function i18nOverride(ec) {
    ec.addFilter("i18n", function (key, ...rest) {
      // Signature mirrors upstream: `| i18n(data, lang)` or `| i18n(lang)`.
      // Templates pass `lang` as a single string arg.
      let data = {};
      let localeOverride;
      if (rest.length === 1) {
        if (typeof rest[0] === "string") localeOverride = rest[0];
        else if (rest[0] && typeof rest[0] === "object") data = rest[0];
      } else if (rest.length >= 2) {
        [data, localeOverride] = rest;
      }
      const lang = localeOverride || this.ctx?.lang || this.page?.lang || "is";
      const entry = translations[key];
      const hasData = data && Object.keys(data).length > 0;
      const interpolate = (s) =>
        String(s).replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k) => data?.[k] ?? m);
      if (entry && entry[lang] !== undefined) {
        return hasData ? interpolate(entry[lang]) : entry[lang];
      }
      // Miss in the requested locale. One-way fallback: EN → IS only.
      if (lang === "en" && entry && entry.is !== undefined) {
        recordMiss(key, lang);
        console.warn(`[i18n] Missing 'en' for '${key}'. Using 'is' fallback.`);
        return hasData ? interpolate(entry.is) : entry.is;
      }
      // Hard miss — IS missing on an IS page, or key absent entirely.
      recordMiss(key, lang);
      console.warn(`[i18n] Translation for '${key}' in '${lang}' not found.`);
      return key;
    });
  });

  eleventyConfig.addGlobalData("buildYear", () => new Date().getFullYear());

  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy({ ".nojekyll": ".nojekyll" });
  // Keep raw originals available at `/img/<name>.jpg`. Although every
  // `<img src="/img/...">` in templates is transformed into a hashed
  // `<picture>` by eleventy-img, the same logical assets are still
  // referenced as raw URLs by `og:image` / `twitter:image` meta tags
  // and the `Article.image` JSON-LD field on paginated greinar pages
  // (computed from `article.image` in `_data/articles.js`). Social
  // crawlers and structured-data consumers need a stable, unhashed
  // URL — the build-time `check-build.js` asset-resolution assertion
  // guards this contract.
  eleventyConfig.addPassthroughCopy("src/img");

  eleventyConfig.setServerOptions({
    watch: ["_site/assets/**/*.css", "_site/assets/**/*.js"],
  });

  eleventyConfig.addFilter("dateDisplay", (date, lang = "is") => {
    if (!date) return "";
    const d = new Date(date);
    if (isNaN(d)) return "";
    return d.toLocaleDateString(lang === "is" ? "is-IS" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  });

  eleventyConfig.addFilter("dateIso", (date) => {
    if (!date) return "";
    const d = new Date(date);
    if (isNaN(d)) return "";
    return d.toISOString().split("T")[0];
  });

  // Build-time guard: every HTML output page must have `lang` set (via
  // is.11tydata.js / en.11tydata.js). Used in base.njk as
  // `<html lang="{{ lang | requireLang }}">`. Converts the silent failure
  // mode (a page rendered with `undefined` interpolated into meta tags and
  // JSON-LD) into a loud build error. See G5 / M8.
  eleventyConfig.addFilter("requireLang", (lang) => {
    if (!lang) {
      throw new Error(
        "base.njk: `lang` must be set on every HTML output page (via is.11tydata.js / en.11tydata.js)."
      );
    }
    return lang;
  });

  eleventyConfig.addFilter("jsonEscape", (str) => {
    if (!str) return "";
    return String(str)
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r")
      .replace(/\t/g, "\\t");
  });

  // Nav membership is selected by URL prefix below — the per-page
  // `eleventyNavigation.key` language suffix (e.g. `home-is` / `home-en`)
  // exists for plugin key uniqueness across locales and is consumed by
  // `src/_includes/partials/breadcrumb.njk` via `eleventyNavigationBreadcrumb`,
  // not for nav selection.
  eleventyConfig.addCollection("navIs", (api) =>
    api
      .getAll()
      .filter((item) => item.data.eleventyNavigation)
      .filter((item) => item.url && !item.url.startsWith("/en/"))
      .sort(
        (a, b) =>
          (a.data.eleventyNavigation.order || 0) - (b.data.eleventyNavigation.order || 0)
      )
  );

  eleventyConfig.addCollection("navEn", (api) =>
    api
      .getAll()
      .filter((item) => item.data.eleventyNavigation)
      .filter((item) => item.url && item.url.startsWith("/en/"))
      .sort(
        (a, b) =>
          (a.data.eleventyNavigation.order || 0) - (b.data.eleventyNavigation.order || 0)
      )
  );

  // Featured entries per locale, sourced from the per-locale tag set
  // by each collection's directory data file. Returns entries marked
  // `featured: true` in frontmatter, sorted by `order` ascending.
  for (const lang of ["is", "en"]) {
    const suffix = lang === "is" ? "Is" : "En";
    eleventyConfig.addCollection(`featuredServices${suffix}`, (api) =>
      api.getFilteredByTag(`services-${lang}`)
        .filter((item) => item.data.featured === true)
        .sort((a, b) => (a.data.order || 0) - (b.data.order || 0))
    );
    eleventyConfig.addCollection(`featuredSectors${suffix}`, (api) =>
      api.getFilteredByTag(`sectors-${lang}`)
        .filter((item) => item.data.featured === true)
        .sort((a, b) => (a.data.order || 0) - (b.data.order || 0))
    );
    eleventyConfig.addCollection(`featuredArticle${suffix}`, (api) =>
      api.getFilteredByTag(`articles-${lang}`)
        .filter((item) => item.data.featured === true)
        .sort((a, b) => new Date(b.data.date) - new Date(a.data.date))
        .slice(0, 1)
    );
  }
}

export const config = {
  pathPrefix: meta.pathPrefix,
  dir: {
    input: "src",
    output: "_site",
    includes: "_includes",
    data: "_data",
  },
};
