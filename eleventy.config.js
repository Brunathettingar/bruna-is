import eleventyNavigationPlugin from "@11ty/eleventy-navigation";
import { eleventyImageTransformPlugin } from "@11ty/eleventy-img";
import { I18nPlugin, HtmlBasePlugin } from "@11ty/eleventy";
import i18nPlugin from "eleventy-plugin-i18n";
import translations from "./src/_data/i18n.js";

export default function (eleventyConfig) {
  eleventyConfig.addPlugin(eleventyNavigationPlugin);

  // Rewrites every URL starting with `/` in generated HTML to include the
  // pathPrefix at build time. Needed because the site is served from a
  // project-page subpath (`/bruna-is/`) rather than the org root.
  eleventyConfig.addPlugin(HtmlBasePlugin);

  // HtmlBasePlugin only rewrites href/src attributes — it doesn't touch
  // `url(...)` references inside inline `style` attributes. Many mockup
  // pages use `<div style="background-image: url('/img/foo.jpg')">`, so
  // we patch those manually here.
  eleventyConfig.addTransform("prefixInlineUrls", function (content) {
    if (!this.page?.outputPath?.endsWith(".html")) return content;
    const prefix = "/bruna-is";
    return content.replace(
      /style="([^"]*url\([^"]+)"/g,
      (match, styleBody) =>
        `style="${styleBody
          .replace(/url\(\s*'\/(?!bruna-is\/)/g, `url('${prefix}/`)
          .replace(/url\(\s*"\/(?!bruna-is\/)/g, `url("${prefix}/`)
          .replace(/url\(\s*\/(?!bruna-is\/)/g, `url(${prefix}/`)}"`
    );
  });

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
    errorMode: "never",
  });

  eleventyConfig.addPlugin(i18nPlugin, {
    translations,
    fallbackLocales: { en: "is", is: "en", "*": "is" },
  });

  // Wrapper that uses the cascade `lang` variable instead of inferring
  // from URL segments. The plugin's URL-prefix detection breaks for the
  // Icelandic-at-root tree and for layout/partial render contexts where
  // `this.page.url` doesn't reflect the current page.
  eleventyConfig.addFilter("t", function (key, data) {
    const lang = this.ctx?.lang || this.page?.lang || "is";
    const entry = translations[key];
    if (!entry) return key;
    if (entry[lang] !== undefined) {
      return data ? interpolate(entry[lang], data) : entry[lang];
    }
    // Fallback: try Icelandic, then English, then the key itself.
    return entry.is ?? entry.en ?? key;
  });

  function interpolate(str, data) {
    return String(str).replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k) => data?.[k] ?? m);
  }

  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy({ ".nojekyll": ".nojekyll" });
  eleventyConfig.addPassthroughCopy("src/img");

  eleventyConfig.setServerOptions({
    watch: ["_site/assets/**/*.css", "_site/assets/**/*.js"],
  });

  eleventyConfig.addFilter("dateDisplay", (date, lang = "is") =>
    new Date(date).toLocaleDateString(lang === "is" ? "is-IS" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  );

  eleventyConfig.addFilter("dateIso", (date) =>
    new Date(date).toISOString().split("T")[0]
  );

  eleventyConfig.addFilter("jsonEscape", (str) => {
    if (!str) return "";
    return String(str)
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r")
      .replace(/\t/g, "\\t");
  });

  eleventyConfig.addFilter("where", (items, key, value) =>
    (items || []).filter((item) => (item.data ? item.data[key] : item[key]) === value)
  );

  eleventyConfig.addFilter("sortBy", (items, key) =>
    [...(items || [])].sort((a, b) => {
      const av = a.data ? a.data[key] : a[key];
      const bv = b.data ? b.data[key] : b[key];
      return (av ?? 0) - (bv ?? 0);
    })
  );

  eleventyConfig.addFilter("startsWith", (str, prefix) =>
    typeof str === "string" && str.startsWith(prefix)
  );

  // Swap the locale prefix on a URL. The I18nPlugin's `locale_links` filter
  // mis-matches alternates for paginated pages (returns every page from
  // the other locale tree, not just the one with the same slug). Slugs are
  // identical across locales by contract, so a deterministic prefix swap
  // is correct.
  eleventyConfig.addFilter("alternateUrl", (url, currentLang) => {
    if (typeof url !== "string") return url;
    if (currentLang === "is") {
      return url === "/" ? "/en/" : `/en${url}`;
    }
    return url.replace(/^\/en\//, "/") || "/";
  });

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

  for (const lang of ["is", "en"]) {
    eleventyConfig.addCollection(`featuredServices${lang === "is" ? "Is" : "En"}`, (api) =>
      api
        .getFilteredByTag(`services-${lang}`)
        .filter((item) => item.data.featured === true)
        .sort((a, b) => (a.data.order || 0) - (b.data.order || 0))
    );

    eleventyConfig.addCollection(`featuredSectors${lang === "is" ? "Is" : "En"}`, (api) =>
      api
        .getFilteredByTag(`sectors-${lang}`)
        .filter((item) => item.data.featured === true)
        .sort((a, b) => (a.data.order || 0) - (b.data.order || 0))
    );
  }
}

export const config = {
  pathPrefix: "/bruna-is/",
  dir: {
    input: "src",
    output: "_site",
    includes: "_includes",
    data: "_data",
  },
};
