// 7 services on the services page (thjonusta).
// EN copy verbatim from mockup/thjonusta.html.

const entries = [
  {
    slug: "fireproofing",
    number: "01",
    category: { is: "Brunavarnir", en: "Fire protection" },
    image: "/img/server_room.jpg",
    imageContain: false,
    title: {
      is: "Brunaþéttingar og óvirkar brunavarnir",
      en: "Fireproofing & passive fire sealing",
    },
    lead: {
      is: "[TBD — íslenska] Heildaræðar brunavarnir fyrir byggingar.",
      en: "Complete fire protection for buildings — all types of passive fire sealing, intumescent paint for structural steel, fire-rated boards, and seals on penetrations and joints. Certified to EI 60, EI 120 and EI 240 (and R 30 to R 240 for structural protection).",
    },
    insightStrong: { is: "Aukinn ávinningur", en: "Bonus benefit" },
    insight: {
      is: "[TBD — íslenska] Brunaþéttiefni eru hljóðísogandi.",
      en: "Fire-rated caulk is highly sound-absorbing — the same seals that stop fire and smoke also dampen sound transmission between rooms. One solution, two functions.",
    },
    bullets: {
      is: [
        "[TBD — Þéttingar á gegnumtökum, samskeytum og rifum]",
        "[TBD — Brunaþéttiefni, froður og púðar (Roxtec, Hilti, Promat)]",
        "[TBD — Þrýstimálning fyrir burðarstál]",
        "[TBD — Brunaþéttiplötur og brunaeinangrun]",
        "[TBD — Reykjarþéttingar og loftþrýstiprófun]",
      ],
      en: [
        "Sealing of penetrations, joints and gaps",
        "Fire-rated caulks, foams and pillows (Roxtec, Hilti, Promat)",
        "Intumescent paint for structural steel",
        "Fire boards, fire-rated insulation, fire-rated doors",
        "Smoke sealing and air-pressure testing",
      ],
    },
  },
  {
    slug: "pipe-insulation",
    number: "02",
    category: { is: "Pípueinangrun", en: "Pipe insulation" },
    image: "/img/isogenopak_roll.jpg",
    imageContain: true,
    title: {
      is: "Pípueinangrun — Isogenopak, WrapTec og Armaflex",
      en: "Pipe insulation — Isogenopak, WrapTec & Armaflex",
    },
    lead: {
      is: "[TBD — íslenska] Einangrun á heitum og köldum lögnum.",
      en: "Insulation on hot and cold pipes — on one hand to <strong>prevent heat loss</strong> and on the other to <strong>prevent moisture dripping</strong> from cold pipes. We work with three leading systems: <strong>Isogenopak</strong> PVC cladding for indoor pipes, <strong>WrapTec</strong> self-welding jacketing for outdoor pipes, and <strong>Armaflex</strong> closed-cell foam for cooling pipes.",
    },
    insightStrong: {
      is: "Tilvalið í eldhúsum og skólum",
      en: "Ideal in kitchens and schools",
    },
    insight: {
      is: "[TBD — íslenska] Isogenopak er hreint og fallegt yfirborðsefni.",
      en: "Isogenopak is clean, smooth and beautifully finished cladding — ideal in kitchens, daycares, hospitals or anywhere the appearance of pipe insulation matters. No dust falls from exposed mineral wool.",
    },
    bullets: {
      is: ["[TBD — íslenska]"],
      en: [
        "Heat and cooling insulation on hot and cold pipes",
        "Anti-condensation insulation on cold pipes (prevents drips)",
        "<strong>Isogenopak</strong> PVC cladding — smooth, dust-free, for indoor use",
        "<strong>WrapTec</strong> self-welding jacketing for outdoor pipes — 100% watertight",
        "<strong>Armaflex</strong> closed-cell foam for cooling pipes and refrigeration",
        "Multiplies the lifespan of the insulation — energy savings pay back the investment",
      ],
    },
  },
  {
    slug: "ventilation",
    number: "03",
    category: { is: "Loftræsing", en: "Ventilation" },
    image: "/img/engineer_install.jpg",
    imageContain: false,
    title: {
      is: "Einangrun loftræsistokka — brunavörn og hljóðvist",
      en: "Ventilation insulation — for fire or sound",
    },
    lead: {
      is: "[TBD — íslenska]",
      en: "Insulation on ventilation ducts in buildings for two purposes: <strong>fire-rated insulation</strong> (EI 30, EI 60 or EI 120) or <strong>sound dampening</strong> between floors and rooms. The same systems also provide thermal insulation and energy savings as a bonus.",
    },
    insightStrong: { is: "Tvær virkni í einni", en: "Two functions in one" },
    insight: {
      is: "[TBD — íslenska]",
      en: "Fire-rated insulation on ducts also dampens sound transmission between rooms — one installation, two functions. That's why it's economical to do both at the same time.",
    },
    bullets: {
      is: ["[TBD — íslenska]"],
      en: [
        "Fire-rated insulation on ducts — EI 30 / EI 60 / EI 120",
        "Acoustic insulation on ducts between floors and rooms",
        "Thermal insulation — reduces heat loss on supply ducts",
        "Pressure sealing on duct joints",
        "Indoor and outdoor solutions",
      ],
    },
  },
  {
    slug: "water-tanks",
    number: "04",
    category: { is: "Vatnstankar", en: "Water tanks" },
    image: "/img/iceland_krafla.jpg",
    imageContain: false,
    title: { is: "Einangrun vatnstanka", en: "Water tank insulation" },
    lead: {
      is: "[TBD — íslenska]",
      en: "Insulation on water tanks and hot storage tanks so they don't lose temperature. This is one of our <strong>most cost-effective solutions</strong> — the investment often pays back in months through lower energy bills.",
    },
    insightStrong: { is: "Borgar sig á 6–18 mánuðum", en: "Pays back in 6–18 months" },
    insight: {
      is: "[TBD — íslenska]",
      en: "An uninsulated water tank loses 15–25% of its heat every 24 hours. Simple insulation stops nearly all of that loss — the investment returns very quickly.",
    },
    bullets: {
      is: ["[TBD — íslenska]"],
      en: [
        "Hot water tanks — prevents heat loss",
        "Cold water tanks — protects against condensation and dust",
        "Industrial tanks and basement storage",
        "Finished with Isogenopak or aluminium cladding",
        "Annual energy-saving calculation provided per project",
      ],
    },
  },
  {
    slug: "markings",
    number: "05",
    category: { is: "Merkingar", en: "Markings" },
    image: "/img/worker.jpg",
    imageContain: false,
    title: { is: "Pípumerkingar", en: "Pipe markings" },
    lead: {
      is: "[TBD — íslenska]",
      en: "Colour-coded pipe markings for all piping systems in a building — hot water, cold water, steam lines, gas, drainage, sprinklers, fuel and more. Many plumbers skip this step and bring in fire sealers or <strong>technical insulators to complete the marking work</strong>.",
    },
    insightStrong: { is: "Krafa, ekki valkostur", en: "Requirement, not optional" },
    insight: {
      is: "[TBD — íslenska]",
      en: "Pipe markings are mandatory in industrial buildings and critical structures under Icelandic standards — and a practical safety requirement for fire authorities, maintenance crews and facility operators.",
    },
    bullets: {
      is: ["[TBD — íslenska]"],
      en: [
        "Colour coding per ÍST / EN 1130-1 and BS 1710",
        "Medium type, flow direction and temperature",
        "Markings on insulated or bare pipes",
        "Indoor and outdoor, in industry and commercial buildings",
        "Delivered together with a report and pipe map for the owner",
      ],
    },
  },
  {
    slug: "aluminium-cladding",
    number: "06",
    category: { is: "Álklæðningar", en: "Aluminium cladding" },
    image: "/img/iceland_hellisheidi.jpg",
    imageContain: false,
    title: { is: "Álklæðningar", en: "Aluminium jacket & cladding" },
    lead: {
      is: "[TBD — íslenska]",
      en: "Strong, durable <strong>aluminium cladding</strong> that wraps insulation on pipes, ducts and industrial equipment — indoors and outdoors. Protects the underlying insulation from weather and damage and <strong>preserves the energy efficiency</strong> of the building for decades of operation.",
    },
    insightStrong: { is: "Iðnaðarstaðallinn á Íslandi", en: "Industrial standard in Iceland" },
    insight: {
      is: "[TBD — íslenska]",
      en: "The image to the right shows aluminium-clad steam pipes from the Hellisheiði geothermal plant — the same systems we install in industry, power plants and outdoor insulation across Iceland.",
    },
    bullets: {
      is: ["[TBD — íslenska]"],
      en: [
        "Aluminium cladding on insulated pipes and ducts",
        "Outdoor insulation in power plants, industry and factories",
        "Pre-formed bends and T-pieces (ordered from a partner, installed by us)",
        "Watertight joints and weather-resistant finish",
        "Preserves the energy efficiency of the insulation for decades",
      ],
    },
  },
  {
    slug: "advisory",
    number: "07",
    category: { is: "Ráðgjöf", en: "Advisory" },
    image: "/img/industrial_plant.jpg",
    imageContain: false,
    title: { is: "Ráðgjöf og efnisval", en: "Advisory & material selection" },
    lead: {
      is: "[TBD — íslenska]",
      en: "Maybe you don't need us to install anything — maybe you just need advice. We offer independent <strong>advisory services</strong> for contractors, owners, fire engineers and operators: material selection, quantity take-off from drawings, solution design for complex projects, and independent inspections of existing fire sealing.",
    },
    insightStrong: {
      is: "Við hönnum ekki — Tensio gerir það",
      en: "We don't design — Tensio does",
    },
    insight: {
      is: "[TBD — íslenska]",
      en: "Fire engineering design (by certified engineers) is not our discipline and we don't intend to take it on. We work with fire engineers and specifically recommend <strong>Tensio Architects</strong> — then we handle material selection, planning, installation and reporting.",
    },
    bullets: {
      is: ["[TBD — íslenska]"],
      en: [
        "Material selection — when to choose Roxtec vs. Hilti vs. Promat etc.",
        "Quantity take-off from drawings and cost estimation",
        "Solution design for complex projects that don't fit standard kits",
        "Coordination with fire engineers (Tensio and others)",
        "Independent inspection reports on existing buildings",
      ],
    },
  },
];

export default entries;
