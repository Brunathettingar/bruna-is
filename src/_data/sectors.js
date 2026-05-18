// 8 sectors served by Brunaþéttingar — rendered on the sectors page.
// English copy ports verbatim from mockup/geirar.html.
// Icelandic descriptions are placeholders until translation.

const entries = [
  {
    slug: "energy",
    number: "01",
    image: "/img/iceland_hellisheidi.jpg",
    title: { is: "Orku- og veitugeirinn", en: "Energy & utilities" },
    description: {
      is: "[TBD — íslenska] Jarðvarmastöðvar, vatnsorkuver, dreifistöðvar og hitaveitustokkar.",
      en: "Geothermal plants, hydropower stations, substations and district heating tunnels. High-temperature insulation, aluminium cladding and fire protection on steam pipelines.",
    },
    tags: { is: ["Ál", "Hitaþol", "Brunavarnir"], en: ["Aluminium", "High heat", "Fire protection"] },
  },
  {
    slug: "aluminium",
    number: "02",
    image: "/img/iceland_alcoa_reydar.jpg",
    title: { is: "Ál og þungaiðnaður", en: "Aluminium & heavy industry" },
    description: {
      is: "[TBD — íslenska] Álver, kísilver og þungaiðnaður.",
      en: "Aluminium smelters, silicon plants and heavy industry. Chemical-resistant solutions, noise tolerance and fire protection in demanding environments.",
    },
    tags: { is: ["Brunaþéttingar", "Brunavarnir", "Ál"], en: ["Fire sealing", "Fireproofing", "Aluminium"] },
  },
  {
    slug: "fishing",
    number: "03",
    image: "/img/engineer_install.jpg",
    title: { is: "Sjávarútvegur og matvælaiðnaður", en: "Fishing & food industry" },
    description: {
      is: "[TBD — íslenska] Fiskvinnslur, mjólkur- og kjötiðnaður.",
      en: "Fish processing plants, dairy and meat processing. Anti-condensation insulation on cooling pipes, Armaflex and fire protection in factories and cold rooms.",
    },
    tags: { is: ["Armaflex", "Kælirör", "Brunaþéttingar"], en: ["Armaflex", "Cooling pipes", "Fire sealing"] },
  },
  {
    slug: "hospitals",
    number: "04",
    image: "/img/documentation.jpg",
    title: { is: "Sjúkrahús og heilbrigðisþjónusta", en: "Hospitals & healthcare" },
    description: {
      is: "[TBD — íslenska] Landspítalinn og smærri heilbrigðisstofnanir.",
      en: "The national hospital and smaller healthcare facilities. Documentation and traceability are critical — no operations can stop because of a fire inspection.",
    },
    tags: { is: ["Brunaþéttingar", "Hljóðvist", "Skráning"], en: ["Fire sealing", "Acoustic", "Documentation"] },
  },
  {
    slug: "schools",
    number: "05",
    image: "/img/building_hero.jpg",
    title: { is: "Skólar og opinberar byggingar", en: "Schools & public buildings" },
    description: {
      is: "[TBD — íslenska] Leikskólar, grunnskólar, framhaldsskólar og opinberar byggingar.",
      en: "Daycares, primary schools, secondary schools and public buildings. Isogenopak gives pipe insulation a clean, dust-free, attractive finish.",
    },
    tags: { is: ["Isogenopak", "Hljóðvist", "Brunavarnir"], en: ["Isogenopak", "Acoustic", "Fire protection"] },
  },
  {
    slug: "commercial",
    number: "06",
    image: "/img/construction_site.jpg",
    title: { is: "Verslun og atvinnuhúsnæði", en: "Commercial & retail" },
    description: {
      is: "[TBD — íslenska] Skrifstofur, verslunarmiðstöðvar og þjónustuhúsnæði.",
      en: "Offices, shopping centres and service hubs. Fire sealing in basement service tunnels and upgrading older buildings to meet current standards.",
    },
    tags: { is: ["Brunaþéttingar", "Loftræsing", "Úttektir"], en: ["Fire sealing", "Ventilation", "Inspections"] },
  },
  {
    slug: "hotels",
    number: "07",
    image: "/img/steel_frame.jpg",
    title: { is: "Hótel og íbúðabyggingar", en: "Hotels & residential" },
    description: {
      is: "[TBD — íslenska] Hótel og fjölbýlishús.",
      en: "The hotels rising across the country and multi-family residential buildings. Fire sealing between rooms, acoustic insulation on ducts and clean finishes in lobbies and common areas.",
    },
    tags: { is: ["Brunaþéttingar", "Hljóðvist", "Isogenopak"], en: ["Fire sealing", "Acoustic", "Isogenopak"] },
  },
  {
    slug: "pharma",
    number: "08",
    image: "/img/industrial_plant.jpg",
    title: { is: "Lyfja- og líftækniiðnaður", en: "Pharma & biotech" },
    description: {
      is: "[TBD — íslenska] Lyfjafyrirtæki eins og Alvotech og Actavis.",
      en: "Pharmaceutical companies like Alvotech and Actavis. Strict hygiene and fire requirements, anti-condensation insulation on equipment, and seals in critical rooms.",
    },
    tags: { is: ["Hreinlæti", "Brunaþéttingar", "Skráning"], en: ["Hygiene", "Fire sealing", "Documentation"] },
  },
];

export default entries;
