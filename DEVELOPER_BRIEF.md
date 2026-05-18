# Brunaþéttingar — Website Developer Brief

**Client:** Brunaþéttingar ehf.
**Domain:** TBD (suggest `brunathettingar.is` or similar)
**Contact:** Ævar — bruna@bruna.is — (+354) 850-4405
**Status:** Static HTML/CSS mockup is complete. We need a production build.

---

## 1. The company in one paragraph

Brunaþéttingar is an Icelandic fire-sealing and technical-isolation company that has been working on industrial buildings, commercial buildings, hospitals, schools, energy plants and other structures (mannvirki) since 2011. The company plans, manages, executes and documents the work. **It does not do brunahönnun (fire engineering design)** — that work is done by external fire engineers; Brunaþéttingar recommends Tensio arkitektar to clients who need it. The company's signature differentiator is **documentation**: every penetration is photographed, located on the drawing, tagged with the product certification number, and handed over to the building owner as both an inspection report (úttektarskýrsla) and a handover report (verklokaskýrsla).

## 2. What the site needs to do

Three jobs, in order of importance:

1. **Convince qualified prospects** (general contractors, building owners, project managers, architects) that Brunaþéttingar is the right partner for technical isolation and fire sealing work on a building project.
2. **Generate qualified leads** via the online quote calculator (Verðreiknir) and the contact form. We want phone calls and emails from people who already have a project in mind.
3. **Document the company's authority** through articles, case studies, accreditations and a clear philosophy. Buyers in this industry expect a credible, technical, well-organised vendor.

The site is **not** an e-commerce site. We do not sell products to the public; we sell installation services and we partner with manufacturers (Roxtec, Hilti, Promat, 3M, Isogenopak, WrapTec, Armaflex).

## 3. Brand & visual identity

The brand is defined by the existing wordmark logo:

- **"BRUNA"** in bold uppercase, orange `#ee7c1d`
- **"þéttingar"** in italic lowercase, royal blue `#1453a8`

Colour palette (already coded in `styles.css` as CSS custom properties):

| Token | Value | Use |
|---|---|---|
| `--accent` | `#ee7c1d` | Brand orange — CTAs, eyebrow labels, accent bars, icon backgrounds |
| `--accent-dark` | `#c45e0a` | Hover state on orange |
| `--accent-soft` | `#fde7d2` | Soft orange chip backgrounds |
| `--brand-blue` | `#1453a8` | Brand blue — secondary accent, h3 highlights, insight callouts |
| `--brand-blue-soft` | `#d6e2f3` | Soft blue chip backgrounds |
| `--text` | `#0e1116` | Body text |
| `--muted` | `#5a626f` | Secondary text |
| `--bg` | `#ffffff` | Page background |
| `--bg-soft` | `#f6f7f9` | Alternating section background |
| `--bg-dark` | `#0a0d12` | Footer, dark hero, dark bands |

Typography stack:

- **Sans (body and UI):** Inter, with system fallback
- **Serif (decorative — story quote, timeline years, stat numbers):** Iowan Old Style → Palatino → Georgia

The look is editorial and industrial: bold sans headlines with `-0.5px` to `-1px` letter-spacing, blue highlight underlines on key words, narrow orange accent bars in the hero, generous whitespace, sharp 90° corners (no border-radius on cards and buttons), and high-contrast dark bands for emphasis sections.

## 4. Site map

```
/                  index.html         Lausnir (home / 4-pillar overview + documentation focus + sectors + accreditations + CTA)
/thjonusta         thjonusta.html     Þjónusta (7 service detail blocks with alternating image/copy layout)
/verdreiknir       verdreiknir.html   Verðreiknir (live quote calculator + lead capture form)
/um-okkur          about.html         Um okkur (story, timeline, Stefna with 6 principles, team)
/greinar           greinar.html       Greinar (article listing with featured article + 9-card grid + pagination)
/hafa-samband      contact.html       (not yet built — see section 6)
/greinar/[slug]    article.html       (not yet built — article detail page template)
```

All pages share:

- **Top utility bar** (dark) — pill, contact phone, email, IS/EN switcher
- **Sticky header** with the wordmark logo + "Mannvirki á Íslandi" tagline + primary nav + orange "Hafa samband" CTA
- **Primary nav** (6 items): Lausnir / Þjónusta / Verðreiknir / Um okkur / Greinar / Hafa samband (CTA)
- **CTA band** before the footer with two action buttons
- **Dark footer** with 4 columns (brand+blurb / Lausnir / Fyrirtækið / Hafa samband) + a legal strip

## 5. Page-by-page detail

### 5.1 Forsíða (`index.html`)

1. **Hero** with full-bleed background photo (Svartsengi geothermal plant with steam over lava — sets "industry in Icelandic nature" tone), dark scrim, breadcrumb, large headline "Brunaþéttingar fyrir mannvirki" with orange accent bar.
2. **Statement** — 2-col layout, eyebrow + h2 "Sérgrein okkar er tæknieinangrun og brunavörn fyrir mannvirki" + lead paragraph that includes the "we don't do brunahönnun, we recommend Tensio" message.
3. **Tæknieinangrun explainer** — 2-col with "Hvað er tæknieinangrun?" on the left (general definition + chips for sub-categories) and "Þjónustan okkar" on the right (4 service chips + the manufacturers list).
4. **Four-pillar grid (2×2)** — Brunaþétting & lausnir / Fireproofing / Pípueinangrun (calls out Isogenopak + WrapTec) / Loftrása­einangrun.
5. **End-to-end process** — soft-grey band with 4 numbered steps: 01 Brunahönnun & ráðgjöf (with Tensio reference) / 02 Plönun / 03 Verkefnastjórnun & uppsetning / 04 Skjölun og skýrslugerð.
6. **Documentation focus / Leading provider section** — 2-col: copy on the left with úttektarskýrsla + verklokaskýrsla explanation + 4 stats (14 ár / 42.000+ innsiglingar / 600+ skjalaðar skýrslur / 100% úttekta í 1. kasti); Kárahnjúkar dam photo on the right with an orange badge overlay "Tvær tegundir skýrslna".
7. **Sectors (dark band)** — 4-up grid: Atvinnuhúsnæði / Iðnaður og verksmiðjur / Sjúkrahús og opinberar byggingar / Orka og veitur.
8. **Samstarfsaðilar & framleiðendur** — single row of 6 brand badges: Tensio arkitektar / Roxtec / Hilti / Promat / Isogenopak / WrapTec.
9. **Accreditations** (`#vottanir` anchor) — 2-col: "Skuldbundin hæsta gæðastigi" copy + 8-tile grid of certifications: EN 1366-3, EN 13501-2, ETA, CE, ISO 9001, ISO 45001, HMS, Félag Brunaþéttingamanna.

> **Note on accreditations:** The mockup originally listed a fictional "LBI vottun" — please replace with **HMS** (Húsnæðis- og mannvirkjastofnun) which is the actual Icelandic regulatory authority for building/fire safety.

10. **CTA band** — "Tilbúin í verkefnið þitt? Tölum saman." with two action buttons.

### 5.2 Þjónusta (`thjonusta.html`)

The detailed services page. Page hero on the Svartsengi photo. After a 2-col intro ("Eitt fyrirtæki — sjö sérgreinar"), **seven alternating feature blocks** (`flex-direction: row-reverse` on every other block):

1. Fireproofing & passive fire sealing — insight: fire-rated caulk is highly sound-absorbing
2. Pípueinangrun & Isogenopak klæðning — insight: ideal in kitchens, daycares, hospitals (no dust, longer-lasting)
3. WrapTec & loftrása­einangrun — insight: same ducts give heat + sound + EI 30/60/120 fire rating
4. Vatnsgeyma­einangrun — insight: 15–25% daily heat loss prevented, 6–18 month payback
5. Pípu­merkingar — insight: required by ÍST/EN 1130-1 and BS 1710, often skipped by plumbers
6. Armaflex einangrun fyrir kælirör — insight: closed-cell stops anti-condensation
7. Álklæðning & hjúpun — insight: industry standard in Iceland (Hellisheiði reference image)

Each block has: numbered eyebrow, h2, lead paragraph, blue insight callout, bullet list. Closing **value-band**: "Tæknieinangrun sem borgar sig til baka" with Isogenopak + WrapTec cost-effectiveness messaging.

### 5.3 Verðreiknir (`verdreiknir.html`)

**Interactive quote calculator with live total.** Each row represents one type of opening (gegnumtak) and has six inputs:

| Field | Type | Options |
|---|---|---|
| Gerð gegnumtaks | select | Kapaltrekk · Málmrör · Plaströr (þenslukrans) · Blandaðir kaplar og rör · Modular cable transit (Roxtec) · Línulegt samskeyti (per m) · Loftrás |
| Veggjagerð | select | Steinsteyptur veggur · Múrsteins­veggur · Steypt loft · Léttveggur (gips) · Léttloft |
| Brunaflokkur | select | EI 30 · EI 60 · EI 90 · EI 120 · EI 240 |
| Breidd (cm) | number | — |
| Hæð (cm) | number | — |
| Fjöldi | number | min 1 |

User can add unlimited rows via "+ Bæta við línu". Each row shows a live subtotal. Total updates on every input.

**Pricing model** (placeholder values — finalise with the company before launch):

```
subtotal = basePrice × wallMultiplier × fireRatingMultiplier × sizeMultiplier × qty

basePrice (ISK):
  cable    = 8500
  metal    = 6800
  plastic  = 14500   (intumescent collar)
  mixed    = 12000
  modular  = 45000
  linear   = 4800    (per metre; size handled via perimeter/100)
  vent     = 18500

wallMultiplier: 1.00 / 1.05 / 1.10 / 1.15 / 1.20 (concrete → light floor)
fireRating:     0.85 / 1.00 / 1.15 / 1.30 / 1.65 (EI30 → EI240)
sizeMultiplier (by max(width, height) cm):
  ≤10 → 1.0
  ≤25 → 1.4
  ≤50 → 2.3
  ≤100 → 3.8
  >100 → 5.5
```

See `verdreiknir.html` lines 239–280 for the full JS reference implementation.

Below the calculator: lead capture form (Nafn, Fyrirtæki/Verkefni, Netfang, Sími, Athugasemdir). Submitting the form should:

1. Save the quote configuration + customer info to the database
2. Send an email to the customer with the quote summary (PDF attachment ideal)
3. Notify the team via email or Slack so a verkefnastjóri can call within 24 hours
4. Show the green "✓ Takk!" confirmation banner inline

### 5.4 Um okkur (`about.html`)

1. Page hero on the Hellisheiði geothermal pipes photo
2. **Sagan okkar** — 2-col with story copy + founder quote in italic serif on the left, 7-row timeline (2011 → 2025) on a soft-grey card with a left orange border on the right
3. **Stefnan okkar — Our vision** (`#stefna` anchor) — soft-grey band with a centred head and a **3×2 grid of 6 numbered principles** with `--accent`-coloured serif numbers
4. **Teymið** — 4-column grid of 8 team-member cards. Avatar is a 220px gradient block with initials (alternating blue/orange gradients), body has name + role (small caps in orange) + short bio

### 5.5 Greinar (`greinar.html`)

1. Page hero on the documentation photo
2. **Featured article** — large 2-col card (image left, copy right) with a "Útgefin grein" prefix on the tag
3. **3-column grid of 9 article cards**, each with a tag pill on the image, headline, excerpt, and a small-caps meta row (date + read time)
4. **Pagination row** with active state on page 1

Article cards link to article detail pages (template not yet mocked — please build a clean reading layout: max 720px content width, 18px body, generous line-height).

### 5.6 Hafa samband — NOT YET MOCKED, please build

A simple contact page with:

- Page hero with "Hafa samband" title
- 2-column layout: contact info (phone, email, address, opening hours, map) on the left; contact form on the right (Nafn / Fyrirtæki / Netfang / Sími / Tegund fyrirspurnar dropdown / Skilaboð / Submit)
- Embed a static map or Google Maps iframe for the office location

## 6. Languages

The site needs to support **Icelandic (default) and English**. The IS/EN switcher in the utility bar is wired up visually but needs real i18n behind it.

Recommended: use `next-intl`, `react-intl`, or a simple key-value JSON approach. All page copy in the existing HTML mockups is in Icelandic — please structure the i18n keys so the entire site can be translated. Icelandic characters (þ, ð, é, æ, ö, á, í, ó, ú, ý) must round-trip cleanly through all forms, URLs (slugs may need transliteration), and emails.

URL structure should be language-prefixed: `/is/` and `/en/`, with `/is/` being the default and redirecting from `/`.

## 7. Technical recommendations

### Framework
**Next.js 14+ with the App Router** is the recommended stack:

- File-system routing matches the simple site map
- Built-in i18n via the `next-intl` library
- Static export option for cheap hosting
- Edge-friendly for fast first paint
- Good DX for content updates

Alternative if a CMS is preferred: **Astro + Sanity** (or Strapi) — Astro for the static site, Sanity for the article CMS so the company can publish new articles without a dev redeploy.

### CMS for articles
Articles should be CMS-managed. Recommended: **Sanity** (free tier handles this volume) or **Contentful** (more bureaucratic but well-known in Iceland). Schema for articles:

- title (string, localised)
- slug (slug, localised)
- excerpt (string, localised)
- body (portable text / rich text, localised)
- category (reference)
- featured (boolean)
- coverImage (image)
- author (reference)
- publishedAt (datetime)
- readTimeMinutes (number, auto-calculated)

### Forms
Both the calculator submission and the contact form need a backend endpoint. Lightweight options:

- **Resend** + a Next.js API route to send the email
- **Formspree** or **Netlify Forms** if hosting on Netlify
- Save a copy in **Airtable** or **Supabase** so the team has a queryable archive

### Hosting & performance
- **Vercel** or **Netlify** — both have free tiers that easily cover this traffic level
- All images should be served via Next.js `<Image>` with `srcset` and `webp`/`avif`
- Lighthouse score target: 95+ for Performance, 100 for Accessibility, 100 for SEO

### Analytics
- **Plausible** (preferred, GDPR-friendly, no cookie banner needed) or **Fathom**
- Avoid Google Analytics unless the company specifically asks for it (cookie consent overhead)

### Forms / spam protection
hCaptcha or Cloudflare Turnstile on both the calculator submission and the contact form. The calculator should also rate-limit by IP (e.g. 5 submissions per hour) to prevent abuse.

## 8. Content & media

The mockup includes ~20 images in `/img/`. For production:

- All hero photos should be re-shot with the actual company crew if possible — the current images are stock placeholders or photos pulled from Wikimedia Commons (Hellisheiði, Kárahnjúkar, Svartsengi, Krafla, Reyðarfjörður).
- **Wikimedia Commons photos** (`iceland_hellisheidi.jpg`, `iceland_svartsengi.jpg`, `iceland_karahnjukar.jpg`, `iceland_krafla.jpg`, `iceland_alcoa_reydar.jpg`) need correct attribution per CC-BY-SA terms when used in production — please review and credit per the [Wikimedia attribution guide](https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia).
- The **Isogenopak product photo** (`isogenopak_roll.jpg`) and **WrapTec product photo** (`wraptec_ostueck.png`) are hotlinked from manufacturer sites — replace with licensed versions or original photography before launch.
- The **Pirosystem hero shot** is no longer used on this site (was for a sibling project).

We strongly recommend commissioning a photo shoot of:

- The team on site at 2–3 active projects
- Close-ups of completed fire-stopped penetrations (good documentation visuals)
- The crew with PPE on a recognisable Icelandic building
- The documentation system / iPad in use on a job

## 9. SEO

Primary Icelandic keywords to target on the home and service pages:

- brunaþétting / brunaþéttingar
- tæknieinangrun
- fireproofing Ísland / brunavörn
- pípueinangrun / pípu­einangrun
- Isogenopak (Iceland)
- WrapTec (Iceland)
- Armaflex (Iceland)
- loftrása­einangrun
- vatnsgeyma­einangrun
- brunaúttekt / úttektarskýrsla

Each page needs:

- Unique `<title>` and `<meta name="description">` (already mocked, please review with the company)
- OpenGraph + Twitter card images (1200×630)
- JSON-LD structured data: `LocalBusiness` on home + contact, `Article` on each article, `BreadcrumbList` on sub-pages
- A real sitemap.xml + robots.txt
- Hreflang tags for is/en pairs

## 10. Accessibility

- All images need real `alt` text (the mockups have placeholders — please rewrite for production)
- Colour contrast meets WCAG AA — verified for the existing palette
- Keyboard-navigable nav and form interactions
- Focus rings preserved on all interactive elements
- Calculator must be operable via keyboard alone (current mockup is — please preserve)
- Screen-reader: the calculator should announce subtotal changes via `aria-live="polite"` on the total element

## 11. Deliverables

In rough priority order:

1. Production build of the 5 existing pages (Lausnir, Þjónusta, Verðreiknir, Um okkur, Greinar)
2. CMS setup + initial article migration (5 stub articles from the mockup)
3. Contact page (Hafa samband)
4. Article detail page template
5. Calculator backend (email + storage)
6. i18n setup with all Icelandic strings extracted; English translations to follow from the company
7. Analytics + form spam protection
8. Pre-launch QA on Lighthouse + WAVE + manual keyboard test
9. DNS + deploy + SSL

## 12. Reference materials

All files in this folder are the working mockup:

```
brunavorn_site/
├── index.html              Forsíða
├── thjonusta.html          Þjónusta (7 services)
├── verdreiknir.html        Verðreiknir (calculator)
├── about.html              Um okkur + Stefna
├── greinar.html            Greinar listing
├── styles.css              All styles (~1100 lines, CSS custom properties at top)
├── DEVELOPER_BRIEF.md      This document
└── img/                    All images (some are placeholders/Wikimedia, some real product photos)
```

The mockup is intentionally vanilla HTML/CSS with one inline `<script>` block (the calculator) — no build step, no dependencies. The dev is free to reimplement in any framework; the markup is a guide for content structure and visual hierarchy rather than literal output.

## 13. Out of scope (for v1)

- Customer login or quote-archive area
- Online payment
- Project tracking portal for active clients
- The article detail page reading experience (template needed but article migration is just stubs)
- Native English content (English strings can be auto-translated for v1; native rewrite as v2)
- Mobile app

## 14. Open questions for the company before kickoff

1. Confirm the final domain name
2. Confirm the office address and opening hours
3. Confirm the team list (name, role, short bio, photo)
4. Confirm or correct the pricing model in the calculator
5. Provide the actual list of past projects + which are OK to publicly reference
6. Confirm the article topics + provide the first 3 articles' content
7. Confirm the Icelandic regulatory references (HMS instead of "LBI" — and any others to add)
8. Decide on the CMS (recommended: Sanity)
9. Decide on the analytics tool (recommended: Plausible)
10. Decide on hosting (recommended: Vercel)

---

*Brief drafted from the existing HTML/CSS mockup. Questions to bruna@bruna.is or (+354) 850-4405.*
