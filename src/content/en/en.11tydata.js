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
