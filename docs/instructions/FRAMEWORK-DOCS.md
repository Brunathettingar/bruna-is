# Documentation sources

Authoritative references for every package, plugin, and standard used by the framework described in `FRAMEWORK-PORT-PROMPT.md`. Use these when something is ambiguous — don't guess.

## Core build tool

### Eleventy (11ty) v3
- **Docs home:** https://www.11ty.dev/docs/
- **Getting started:** https://www.11ty.dev/docs/getting-started/
- **Config (`eleventy.config.js`):** https://www.11ty.dev/docs/config/
- **Configuration shape & options:** https://www.11ty.dev/docs/config-shapes/
- **ESM in config:** https://www.11ty.dev/docs/config/#config-file
- **Collections (built-in + custom):** https://www.11ty.dev/docs/collections/
- **Collections API:** https://www.11ty.dev/docs/collections-api/
- **Data cascade:** https://www.11ty.dev/docs/data-cascade/
- **Directory data files:** https://www.11ty.dev/docs/data-template-dir/
- **Global data (`_data`):** https://www.11ty.dev/docs/data-global/
- **Frontmatter:** https://www.11ty.dev/docs/data-frontmatter/
- **Computed data:** https://www.11ty.dev/docs/data-computed/
- **Permalinks:** https://www.11ty.dev/docs/permalinks/
- **Layouts:** https://www.11ty.dev/docs/layouts/
- **Layout chaining:** https://www.11ty.dev/docs/layout-chaining/
- **Filters:** https://www.11ty.dev/docs/filters/
- **Shortcodes:** https://www.11ty.dev/docs/shortcodes/
- **Passthrough copy:** https://www.11ty.dev/docs/copy/
- **Dev server:** https://www.11ty.dev/docs/dev-server/
- **`--serve` and watch:** https://www.11ty.dev/docs/watch-serve/
- **Environment variables (`ELEVENTY_RUN_MODE`):** https://www.11ty.dev/docs/environment-vars/
- **`page` variable:** https://www.11ty.dev/docs/data-eleventy-supplied/
- **Plugins index:** https://www.11ty.dev/docs/plugins/
- **Debug mode:** https://www.11ty.dev/docs/debugging/
- **GitHub repo:** https://github.com/11ty/eleventy

## Eleventy plugins

### `@11ty/eleventy-img`
- **Docs:** https://www.11ty.dev/docs/plugins/image/
- **HTML transform plugin (the one this framework uses):** https://www.11ty.dev/docs/plugins/image/#eleventy-transform
- **Options reference:** https://www.11ty.dev/docs/plugins/image/#usage
- **`transformOnRequest`:** https://www.11ty.dev/docs/plugins/image/#transform-on-request
- **Output formats (AVIF/WebP/JPEG):** https://www.11ty.dev/docs/plugins/image/#output-formats
- **GitHub repo:** https://github.com/11ty/eleventy-img
- **npm:** https://www.npmjs.com/package/@11ty/eleventy-img

### `@11ty/eleventy-navigation`
- **Docs:** https://www.11ty.dev/docs/plugins/navigation/
- **Frontmatter keys (`key`, `parent`, `order`, `title`, `url`):** https://www.11ty.dev/docs/plugins/navigation/#full-options-list
- **Breadcrumb filter (`eleventyNavigationBreadcrumb`):** https://www.11ty.dev/docs/plugins/navigation/#advanced-usage
- **GitHub repo:** https://github.com/11ty/eleventy-navigation
- **npm:** https://www.npmjs.com/package/@11ty/eleventy-navigation

## Template language

### Nunjucks
- **Docs home:** https://mozilla.github.io/nunjucks/
- **Templating reference:** https://mozilla.github.io/nunjucks/templating.html
- **Tags (`if`, `for`, `set`, `include`, `block`, `extends`):** https://mozilla.github.io/nunjucks/templating.html#tags
- **Filters (built-in):** https://mozilla.github.io/nunjucks/templating.html#builtin-filters
- **Whitespace control (`{%-` / `-%}`):** https://mozilla.github.io/nunjucks/templating.html#whitespace-control
- **GitHub repo:** https://github.com/mozilla/nunjucks

### Eleventy + Nunjucks specifics
- **Using Nunjucks in Eleventy:** https://www.11ty.dev/docs/languages/nunjucks/

## JavaScript runtime & language

### Node.js
- **Docs home:** https://nodejs.org/en/docs
- **ESM (`type: "module"`):** https://nodejs.org/api/esm.html
- **`process.env`:** https://nodejs.org/api/process.html#processenv

### ES modules in the browser
- **MDN — JavaScript modules:** https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules
- **`<script type="module">`:** https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#attr-type

## CSS

### Modern CSS reference
- **MDN CSS:** https://developer.mozilla.org/en-US/docs/Web/CSS
- **CSS custom properties (variables):** https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties
- **Logical properties (`margin-inline`, `padding-block`, etc.):** https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_logical_properties_and_values
- **`text-wrap` (`balance`, `pretty`):** https://developer.mozilla.org/en-US/docs/Web/CSS/text-wrap
- **`text-size-adjust`:** https://developer.mozilla.org/en-US/docs/Web/CSS/text-size-adjust
- **Viewport units (`100svh` etc.):** https://developer.mozilla.org/en-US/docs/Web/CSS/length#viewport-percentage_lengths
- **`scroll-margin-block`:** https://developer.mozilla.org/en-US/docs/Web/CSS/scroll-margin-block
- **Container queries:** https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries
- **`color-scheme` & dark mode:** https://developer.mozilla.org/en-US/docs/Web/CSS/color-scheme

### CSS naming convention
- **BEM (Block, Element, Modifier):** https://getbem.com/introduction/
- **BEM naming cheatsheet:** https://9elements.com/bem-cheat-sheet/

### CSS reset reference
- **Andy Bell's "A (more) modern CSS reset":** https://piccalil.li/blog/a-more-modern-css-reset/

## HTML & accessibility

### MDN HTML
- **HTML elements reference:** https://developer.mozilla.org/en-US/docs/Web/HTML/Element
- **`<picture>`:** https://developer.mozilla.org/en-US/docs/Web/HTML/Element/picture
- **`<img>` `loading`, `decoding`:** https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img
- **`<dialog>`:** https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog
- **`<time datetime>`:** https://developer.mozilla.org/en-US/docs/Web/HTML/Element/time

### ARIA & accessibility
- **MDN — ARIA:** https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA
- **ARIA Authoring Practices Guide (APG):** https://www.w3.org/WAI/ARIA/apg/
- **Disclosure (hamburger menu) pattern:** https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/
- **Breadcrumb pattern:** https://www.w3.org/WAI/ARIA/apg/patterns/breadcrumb/
- **Skip links:** https://webaim.org/techniques/skipnav/
- **WCAG 2.2 quick reference:** https://www.w3.org/WAI/WCAG22/quickref/

## Image formats

- **AVIF (MDN):** https://developer.mozilla.org/en-US/docs/Web/Media/Formats/Image_types#avif_image
- **WebP (MDN):** https://developer.mozilla.org/en-US/docs/Web/Media/Formats/Image_types#webp_image
- **`<picture>` & responsive images guide:** https://developer.mozilla.org/en-US/docs/Web/HTML/Responsive_images
- **`srcset` & `sizes`:** https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img#using_the_srcset_and_sizes_attributes

## SEO, structured data, social

### Schema.org / JSON-LD
- **Schema.org home:** https://schema.org/
- **Full type hierarchy:** https://schema.org/docs/full.html
- **`WebSite`:** https://schema.org/WebSite
- **`Organization`:** https://schema.org/Organization
- **`Person`:** https://schema.org/Person
- **`Article`:** https://schema.org/Article
- **`Product`:** https://schema.org/Product
- **`Service`:** https://schema.org/Service
- **`CreativeWork`:** https://schema.org/CreativeWork
- **`BreadcrumbList`:** https://schema.org/BreadcrumbList
- **JSON-LD getting started:** https://json-ld.org/learn/
- **Google's structured data docs:** https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data
- **Rich Results Test:** https://search.google.com/test/rich-results
- **Schema Markup Validator:** https://validator.schema.org/

### Open Graph
- **Open Graph protocol:** https://ogp.me/
- **Facebook Sharing Debugger:** https://developers.facebook.com/tools/debug/

### Twitter / X Cards
- **Card markup reference:** https://developer.x.com/en/docs/x-for-websites/cards/overview/markup
- **Summary with large image card:** https://developer.x.com/en/docs/x-for-websites/cards/overview/summary-card-with-large-image

### Sitemaps & robots
- **`sitemaps.org` protocol:** https://www.sitemaps.org/protocol.html
- **`robots.txt` spec (Google):** https://developers.google.com/search/docs/crawling-indexing/robots/robots_txt

### Canonical URLs
- **`rel="canonical"` (Google docs):** https://developers.google.com/search/docs/crawling-indexing/canonicalization

## Deployment

### GitHub Pages
- **Docs home:** https://docs.github.com/en/pages
- **Custom GitHub Actions workflows for Pages:** https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
- **`.nojekyll` (skip Jekyll processing):** https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages#static-site-generators

### GitHub Actions used in the workflow
- **Workflow syntax:** https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions
- **`actions/checkout`:** https://github.com/actions/checkout
- **`actions/setup-node`:** https://github.com/actions/setup-node
- **`actions/configure-pages`:** https://github.com/actions/configure-pages
- **`actions/upload-pages-artifact`:** https://github.com/actions/upload-pages-artifact
- **`actions/deploy-pages`:** https://github.com/actions/deploy-pages

## npm package pages (release notes, version history)

- **`@11ty/eleventy`:** https://www.npmjs.com/package/@11ty/eleventy
- **`@11ty/eleventy-img`:** https://www.npmjs.com/package/@11ty/eleventy-img
- **`@11ty/eleventy-navigation`:** https://www.npmjs.com/package/@11ty/eleventy-navigation

## Optional / commonly added later

If a real need arises (justify before adding), these are the standard companions:

- **Markdown plugins** (e.g. `markdown-it`): https://github.com/markdown-it/markdown-it
- **RSS feed plugin (Eleventy):** https://www.11ty.dev/docs/plugins/rss/
- **Syntax highlighting plugin (Eleventy):** https://www.11ty.dev/docs/plugins/syntaxhighlight/
- **Inclusive Language plugin:** https://www.11ty.dev/docs/plugins/inclusive-language/
