const byLocale = {
  is: {
    title: "Brunaþéttingar",
    description: "[TBD — íslensk lýsing] Vottuð brunaþéttingar og tæknieinangrun á Íslandi.",
    author: "Brunaþéttingar ehf.",
    ogImageAlt: "Brunaþéttingar — vottuð brunaþéttingar fyrir íslensk mannvirki",
    ogLocale: "is_IS",
    addressCountry: "Ísland",
  },
  en: {
    title: "Brunaþéttingar",
    description:
      "Brunaþéttingar plan, manage and execute fire sealing and technical insulation work on Icelandic buildings.",
    author: "Brunaþéttingar ehf.",
    ogImageAlt: "Brunaþéttingar — certified fire sealing for buildings",
    ogLocale: "en_US",
    addressCountry: "Iceland",
  },
};

const shared = {
  // Includes the project-page subpath. HtmlBasePlugin only rewrites
  // path-style URLs (`/foo/`), not absolute ones — so canonical and og:url
  // need the prefix included here.
  url: "https://brunathettingar.github.io/bruna-is",
  ogImage: "/assets/img/og-default.jpg",
  logo: "/assets/img/logo.svg",
  contact: {
    email: "bruna@bruna.is",
    phone: {
      // E.164 — canonical form for schema:telephone and tel: links
      e164: "+3548504405",
      // Human-readable — used in visible UI
      display: "(+354) 850-4405",
    },
  },
};

export default { ...shared, byLocale };
