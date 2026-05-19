// Quote calculator pricing config. Edit base prices, multipliers, and size brackets here.
// Labels are bilingual (is/en). New options: add an entry to the relevant array.

export const OPE_TYPES = [
  { id: "cable",    base: 8500,
    label: { is: "Kapalgegnumtak",                       en: "Cable penetration" } },
  { id: "metal",    base: 6800,
    label: { is: "Málmrör",                              en: "Metal pipe" } },
  { id: "plastic",  base: 14500,
    label: { is: "Plaströr (þrýstihringur)",             en: "Plastic pipe (intumescent collar)" } },
  { id: "mixed",    base: 12000,
    label: { is: "Blanda af köplum og rörum",            en: "Mixed cables and pipes" } },
  { id: "modular",  base: 45000,
    label: { is: "Einingakapaltak (Roxtec)",             en: "Modular cable transit (Roxtec)" } },
  { id: "linear",   base: 4800,
    label: { is: "Línuleg samskeyti (á metra)",          en: "Linear joint (per m)" } },
  { id: "vent",     base: 18500,
    label: { is: "Loftræsistokkur",                      en: "Ventilation duct" } },
];

export const WALL_TYPES = [
  { id: "concrete",       mult: 1.00,
    label: { is: "Steyptur veggur",       en: "Concrete wall" } },
  { id: "block",          mult: 1.05,
    label: { is: "Holsteinn / múrsteinn", en: "Block / brick wall" } },
  { id: "concrete-floor", mult: 1.10,
    label: { is: "Steyptur botn",         en: "Concrete floor" } },
  { id: "light",          mult: 1.15,
    label: { is: "Léttveggur (gips)",     en: "Lightweight wall (gypsum)" } },
  { id: "light-floor",    mult: 1.20,
    label: { is: "Léttur botn",           en: "Lightweight floor" } },
];

export const FIRE_RATINGS = [
  { id: "ei30",  mult: 0.85, label: { is: "EI 30",  en: "EI 30" } },
  { id: "ei60",  mult: 1.00, label: { is: "EI 60",  en: "EI 60" } },
  { id: "ei90",  mult: 1.15, label: { is: "EI 90",  en: "EI 90" } },
  { id: "ei120", mult: 1.30, label: { is: "EI 120", en: "EI 120" } },
  { id: "ei240", mult: 1.65, label: { is: "EI 240", en: "EI 240" } },
];

export const FLOOR_POSITIONS = [
  { id: "low",       mult: 1.05,
    label: { is: "0–60 cm frá gólfi",         en: "0–60 cm from floor" } },
  { id: "mid",       mult: 1.00,
    label: { is: "60–200 cm (staðlað)",       en: "60–200 cm (standard)" } },
  { id: "high",      mult: 1.05,
    label: { is: "200–400 cm",                en: "200–400 cm" } },
  { id: "very-high", mult: 1.10,
    label: { is: "Yfir 400 cm",               en: "Over 400 cm" } },
];

export const SIZE_BRACKETS = [
  { maxCm: 10,  mult: 1.0 },
  { maxCm: 25,  mult: 1.4 },
  { maxCm: 50,  mult: 2.3 },
  { maxCm: 100, mult: 3.8 },
];
export const SIZE_BRACKET_OVERFLOW = 5.5;
