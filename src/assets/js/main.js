// Entry point. Loaded via <script type="module">, so DOMContentLoaded is
// implicit — the module runs after the DOM is parsed.
//
// Each navigation goes through Swup, which swaps the contents of
// `#main-content` (the <main> in page.njk) and lets @swup/head-plugin diff
// <head>. We re-run all init functions after every swap and pass them an
// AbortSignal — that kills the previous navigation's document/window
// listeners atomically, preventing leaks across navigations.
//
// SwupHeadPlugin only touches <head>. This site varies <html lang> and
// <body class> per page (lang drives screen-reader locale; bodyClass
// scopes most page-family CSS), so the content:replace hook below copies
// both from the incoming document. Without this, navigating IS↔EN breaks
// the html lang attribute and navigating between page families breaks
// scoped CSS.

import { initMobileNav } from "./mobileNav.js";
import { initQuoteCalculator } from "./quoteCalculator.js";

let abortController = null;

function bootstrap() {
  abortController?.abort();
  abortController = new AbortController();
  const { signal } = abortController;
  initMobileNav({ signal });
  initQuoteCalculator({ signal });
  updateNavCurrent();
}

// Sync `class="active"` and `aria-current="page"` on the primary nav. The
// header markup (partials/header.njk) is persistent across swaps, so the
// server-rendered active state from the initial page is stale after the
// first Swup navigation. Mirror both the class and the aria attribute
// because the visual highlight is driven by `.active`, not aria-current.
function updateNavCurrent() {
  const here = window.location.pathname;
  document.querySelectorAll("#primary-nav a[href]").forEach((link) => {
    const isCurrent = link.getAttribute("href") === here;
    link.classList.toggle("active", isCurrent);
    if (isCurrent) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
}

const swup = new window.Swup({
  containers: ["#main-content"],
  plugins: [new window.SwupHeadPlugin()],
});

// Copy <html lang> and <body class> from the incoming document before the
// swap completes. `visit.to.document` is the parsed fetched response.
swup.hooks.on("content:replace", (visit) => {
  const incoming = visit?.to?.document;
  if (!incoming) return;
  const incomingLang = incoming.documentElement.getAttribute("lang");
  if (incomingLang) document.documentElement.setAttribute("lang", incomingLang);
  document.body.className = incoming.body.className;
});

bootstrap();
swup.hooks.on("page:view", bootstrap);
