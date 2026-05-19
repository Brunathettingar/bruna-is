// Directory data file for all Icelandic content under src/content/is/.
// Sets `lang: "is"` on every page and derives the output permalink from the
// file's path stem so pages don't need to declare `permalink` in frontmatter.
//
// The permalink function is still required for standalone pages that have no
// explicit frontmatter permalink (e.g. verdreiknir/index.njk, about/index.njk).
// Pages with an explicit frontmatter permalink (404, sitemap, paginated greinar)
// pass through unchanged via the early-return guard at the top of the function.
//
// Do NOT collapse this to a declarative template string — it would produce
// incorrect paths for standalone pages (they'd get `/is/verdreiknir/` instead
// of the correct `/verdreiknir/`).
export default {
  lang: "is",
  permalink: (data) => {
    if (data.permalink !== undefined) {
      if (typeof data.permalink === "string" && data.permalink.startsWith("/")) {
        return data.permalink;
      }
    }
    const stem = data.page.filePathStem;
    let rel = stem.replace(/^\/content\/is\//, "");
    rel = rel.replace(/(^|\/)index$/, "");
    return rel ? `/${rel}/` : "/";
  },
};
