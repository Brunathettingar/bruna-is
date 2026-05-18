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
