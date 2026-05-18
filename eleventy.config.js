import eleventyNavigationPlugin from "@11ty/eleventy-navigation";
import { eleventyImageTransformPlugin } from "@11ty/eleventy-img";
import { I18nPlugin } from "@11ty/eleventy";
import i18nPlugin from "eleventy-plugin-i18n";
import translations from "./src/_data/i18n.js";

export default function (eleventyConfig) {
  eleventyConfig.addPlugin(eleventyNavigationPlugin);

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
  dir: {
    input: "src",
    output: "_site",
    includes: "_includes",
    data: "_data",
  },
};
