// Directory data file for all English content under src/content/en/.
// Sets `lang: "en"` on every page and derives the output permalink from the
// file's path stem so pages don't need to declare `permalink` in frontmatter.
//
// The permalink function is still required for standalone pages that have no
// explicit frontmatter permalink (e.g. verdreiknir/index.njk, about/index.njk).
// Pages with an explicit frontmatter permalink (404, sitemap, paginated greinar)
// pass through unchanged via the early-return guard at the top of the function.
//
// Do NOT collapse this to a declarative template string — it would produce
// incorrect paths for standalone pages (they'd get `/en/en/verdreiknir/` or
// similar instead of the correct `/en/verdreiknir/`).
export default {
  lang: "en",
  permalink: (data) => {
    if (data.permalink !== undefined) {
      // honour explicit frontmatter permalink (paginated pages, 404, sitemap)
      if (typeof data.permalink === "string" && data.permalink.startsWith("/")) {
        return data.permalink;
      }
    }
    const stem = data.page.filePathStem;
    let rel = stem.replace(/^\/content\/en\//, "");
    rel = rel.replace(/(^|\/)index$/, "");
    return rel ? `/en/${rel}/` : "/en/";
  },
};
