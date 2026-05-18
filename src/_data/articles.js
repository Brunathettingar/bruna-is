// 10 articles on the greinar page. EN copy verbatim from mockup/greinar.html.
// One featured article + 9 grid cards.

const entries = [
  {
    slug: "handover-report-contents",
    featured: true,
    date: "2026-04-15",
    image: "/img/documentation.jpg",
    category: { is: "Skráning", en: "Documentation" },
    title: {
      is: "[TBD — íslenska] Hvað þarf að vera í lokaskýrslu fyrir brunaþéttingar?",
      en: "What needs to be in a fire-sealing project handover report?",
    },
    summary: {
      is: "[TBD — íslenska]",
      en: 'The handover report is what separates "the job is done" from "the job is delivered and traceable for 30 years". Here are 12 items that should appear in every report — and how our documentation system keeps track of them.',
    },
    readTimeMinutes: 9,
    author: "Guðjón Ragnarsson",
  },
  {
    slug: "ei-rating-explained",
    featured: false,
    date: "2026-04-02",
    image: "/img/server_room.jpg",
    category: { is: "Tæknilegt", en: "Technical" },
    title: {
      is: "[TBD — íslenska] Munurinn á EI 60, EI 120 og EI 240 — útskýrður",
      en: "The difference between EI 60, EI 120 and EI 240 — explained",
    },
    summary: {
      is: "[TBD — íslenska]",
      en: "The fire-resistance numbers in an EI rating aren't just minutes. Here we explain what the letters mean and when you need each class.",
    },
    readTimeMinutes: 6,
    author: "Brunaþéttingar",
  },
  {
    slug: "icelandic-building-code",
    featured: false,
    date: "2026-03-28",
    image: "/img/worker.jpg",
    category: { is: "Reglugerðir", en: "Regulation" },
    title: {
      is: "[TBD — íslenska] Byggingarreglugerðin og brunaþéttingar í atvinnuhúsnæði",
      en: "The Icelandic building code and fire sealing in commercial buildings",
    },
    summary: {
      is: "[TBD — íslenska]",
      en: "What does the Icelandic building code require for fire sealing — and where do most projects run into trouble?",
    },
    readTimeMinutes: 11,
    author: "Brunaþéttingar",
  },
  {
    slug: "intumescent-paint-standard",
    featured: false,
    date: "2026-03-20",
    image: "/img/engineer_install.jpg",
    category: { is: "Brunavarnir", en: "Fireproofing" },
    title: {
      is: "[TBD — íslenska] Þrýstimálning fyrir burðarstál: hvað segir staðallinn",
      en: "Intumescent paint for structural steel: what the standard says",
    },
    summary: {
      is: "[TBD — íslenska]",
      en: "EN 13381-8 and how to read manufacturer data correctly — for fire classes R 30 to R 240.",
    },
    readTimeMinutes: 8,
    author: "Brunaþéttingar",
  },
  {
    slug: "common-mistakes",
    featured: false,
    date: "2026-03-14",
    image: "/img/industrial_plant.jpg",
    category: { is: "Vinnuferli", en: "Process" },
    title: {
      is: "[TBD — íslenska] Algeng mistök í brunaþéttingum — og hvernig á að forðast þau",
      en: "Common mistakes in fire sealing — and how to avoid them",
    },
    summary: {
      is: "[TBD — íslenska]",
      en: "Seven issues we see again and again when we inspect older buildings. Some of them cause complete breaches of fire compartmentation.",
    },
    readTimeMinutes: 10,
    author: "Brunaþéttingar",
  },
  {
    slug: "inspection-report-howto",
    featured: false,
    date: "2026-03-05",
    image: "/img/building_hero.jpg",
    category: { is: "Skráning", en: "Documentation" },
    title: {
      is: "[TBD — íslenska] Úttektarskýrsla á eldri byggingum — hvernig hún virkar",
      en: "Inspection report on an older building — how it works",
    },
    summary: {
      is: "[TBD — íslenska]",
      en: "A step-by-step guide to inspection reports: when you need one, what it contains, and how it helps at fire authority inspection.",
    },
    readTimeMinutes: 7,
    author: "Brunaþéttingar",
  },
  {
    slug: "choosing-cable-tray-solution",
    featured: false,
    date: "2026-02-26",
    image: "/img/construction_site.jpg",
    category: { is: "Vinnuferli", en: "Process" },
    title: {
      is: "[TBD — íslenska] Hvernig velja á rétta brunaþéttingu fyrir kapalgrindur",
      en: "How to choose the right fire-sealing solution for cable trays",
    },
    summary: {
      is: "[TBD — íslenska]",
      en: "Modular cable transit, caulks and foams, pillows — an overview of the main cable-sealing solutions and when each is the right choice.",
    },
    readTimeMinutes: 9,
    author: "Brunaþéttingar",
  },
  {
    slug: "concrete-vs-lightweight-walls",
    featured: false,
    date: "2026-02-18",
    image: "/img/steel_frame.jpg",
    category: { is: "Tæknilegt", en: "Technical" },
    title: {
      is: "[TBD — íslenska] Brunaþéttingar í steyptum vs. léttum veggjum",
      en: "Fire sealing in concrete vs. lightweight walls",
    },
    summary: {
      is: "[TBD — íslenska]",
      en: "Why the same solution doesn't work in both wall types — and how to do each one correctly.",
    },
    readTimeMinutes: 5,
    author: "Brunaþéttingar",
  },
  {
    slug: "digital-documentation-systems",
    featured: false,
    date: "2026-02-10",
    image: "/img/documentation.jpg",
    category: { is: "Skráning", en: "Documentation" },
    title: {
      is: "[TBD — íslenska] Stafræn skráningarkerfi fyrir brunaþéttingar",
      en: "Digital documentation systems for fire sealing — requirements and benefits",
    },
    summary: {
      is: "[TBD — íslenska]",
      en: "Why paper folders aren't good enough any more, and what a proper digital documentation system should include.",
    },
    readTimeMinutes: 8,
    author: "Brunaþéttingar",
  },
  {
    slug: "manufacturer-comparison",
    featured: false,
    date: "2026-02-02",
    image: "/img/engineer_install.jpg",
    category: { is: "Vörur", en: "Products" },
    title: {
      is: "[TBD — íslenska] Roxtec, Hilti, Promat eða Beele? Samanburður framleiðenda",
      en: "Roxtec, Hilti, Promat or Beele? A manufacturer comparison",
    },
    summary: {
      is: "[TBD — íslenska]",
      en: "Each manufacturer has its strengths and weaknesses. Here we walk through when we use each and why.",
    },
    readTimeMinutes: 12,
    author: "Brunaþéttingar",
  },
];

export default entries;
