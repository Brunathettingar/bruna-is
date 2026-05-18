// Quote calculator — port of the inline JS in mockup/verdreiknir.html (lines 240–376).
// Constants verbatim; submit handler now also produces a mailto: with the row breakdown.

const OPE_TYPES = [
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

const WALL_TYPES = [
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

const FIRE_RATINGS = [
  { id: "ei30",  mult: 0.85, label: { is: "EI 30",  en: "EI 30" } },
  { id: "ei60",  mult: 1.00, label: { is: "EI 60",  en: "EI 60" } },
  { id: "ei90",  mult: 1.15, label: { is: "EI 90",  en: "EI 90" } },
  { id: "ei120", mult: 1.30, label: { is: "EI 120", en: "EI 120" } },
  { id: "ei240", mult: 1.65, label: { is: "EI 240", en: "EI 240" } },
];

const FLOOR_POSITIONS = [
  { id: "low",       mult: 1.05,
    label: { is: "0–60 cm frá gólfi",         en: "0–60 cm from floor" } },
  { id: "mid",       mult: 1.00,
    label: { is: "60–200 cm (staðlað)",       en: "60–200 cm (standard)" } },
  { id: "high",      mult: 1.05,
    label: { is: "200–400 cm",                en: "200–400 cm" } },
  { id: "very-high", mult: 1.10,
    label: { is: "Yfir 400 cm",               en: "Over 400 cm" } },
];

const COPY = {
  is: {
    chooseOption: "— veldu —",
    removeRow:    "Fjarlægja línu",
    noPrice:      "—",
    successText:  "✓ Takk! Áætluð verðhugmynd hefur verið send. Verkefnastjóri hringir innan 24 klst.",
    mailSubject:  "Verðmat — Brunaþéttingar",
    mailHello:    "Sæl/sæll,",
    mailIntro:    "Fyrirspurn um áætlað verðmat fyrir brunaþéttingar:",
    mailRows:     "Verkefnislínur",
    mailLineNum:  "Lína",
    mailType:     "Tegund",
    mailWall:     "Veggur",
    mailFire:     "Brunaflokkur",
    mailSize:     "Stærð (BxH)",
    mailFloor:    "Hæð frá gólfi",
    mailQty:      "Fjöldi",
    mailSubtotal: "Samtala",
    mailCustomer: "Tengiliður",
    mailName:     "Nafn",
    mailCompany:  "Fyrirtæki",
    mailEmail:    "Tölvupóstur",
    mailPhone:    "Sími",
    mailNotes:    "Athugasemdir",
    mailTotal:    "ÁÆTLUÐ HEILDARSAMTALA",
    mailFooter:   "(Án vsk. Endanlegt verð staðfestist með úttekt á staðnum.)",
  },
  en: {
    chooseOption: "— choose —",
    removeRow:    "Remove row",
    noPrice:      "—",
    successText:  "✓ Thanks! Your estimated quote has been sent. A project manager will call within 24 hours.",
    mailSubject:  "Quote request — Brunaþéttingar",
    mailHello:    "Hello,",
    mailIntro:    "Request for an estimated quote for fire sealing work:",
    mailRows:     "Project rows",
    mailLineNum:  "Row",
    mailType:     "Opening type",
    mailWall:     "Wall",
    mailFire:     "Fire rating",
    mailSize:     "Size (WxH)",
    mailFloor:    "From floor",
    mailQty:      "Qty",
    mailSubtotal: "Subtotal",
    mailCustomer: "Customer",
    mailName:     "Name",
    mailCompany:  "Company",
    mailEmail:    "Email",
    mailPhone:    "Phone",
    mailNotes:    "Notes",
    mailTotal:    "ESTIMATED TOTAL",
    mailFooter:   "(Excl. VAT. Final price is confirmed with an on-site inspection.)",
  },
};

function sizeMultiplier(width, height) {
  const max = Math.max(width || 0, height || 0);
  if (max === 0) return 0;
  if (max <= 10) return 1.0;
  if (max <= 25) return 1.4;
  if (max <= 50) return 2.3;
  if (max <= 100) return 3.8;
  return 5.5;
}

function formatPrice(amount, lang) {
  const formatter = new Intl.NumberFormat(lang === "is" ? "is-IS" : "en-US", {
    maximumFractionDigits: 0,
  });
  const suffix = lang === "is" ? " kr" : " ISK";
  return formatter.format(Math.round(amount)) + suffix;
}

function buildRow(rowId, lang) {
  const c = COPY[lang];
  const optionsHtml = (list, selectedId = null) =>
    list
      .map(
        (o) =>
          `<option value="${o.id}"${o.id === selectedId ? " selected" : ""}>${o.label[lang]}</option>`
      )
      .join("");

  const row = document.createElement("div");
  row.className = "quoter-row";
  row.dataset.id = String(rowId);
  row.innerHTML = `
    <select name="opeType">
      <option value="">${c.chooseOption}</option>
      ${optionsHtml(OPE_TYPES)}
    </select>
    <select name="wallType">
      <option value="">${c.chooseOption}</option>
      ${optionsHtml(WALL_TYPES)}
    </select>
    <select name="fireRating">
      <option value="">${c.chooseOption}</option>
      ${optionsHtml(FIRE_RATINGS)}
    </select>
    <input type="number" name="width" placeholder="0" min="0" step="1">
    <input type="number" name="height" placeholder="0" min="0" step="1">
    <select name="floorPos">
      ${optionsHtml(FLOOR_POSITIONS, "mid")}
    </select>
    <input type="number" name="qty" value="1" min="1" step="1">
    <span class="subtotal"><span class="none">${c.noPrice}</span></span>
    <button type="button" class="remove" data-quoter-remove aria-label="${c.removeRow}">×</button>
  `;
  return row;
}

function collectRowData(row) {
  const $ = (sel) => row.querySelector(sel);
  return {
    opeId:   $("[name=opeType]").value,
    wallId:  $("[name=wallType]").value,
    fireId:  $("[name=fireRating]").value,
    floorId: $("[name=floorPos]").value || "mid",
    width:   parseFloat($("[name=width]").value) || 0,
    height:  parseFloat($("[name=height]").value) || 0,
    qty:     parseFloat($("[name=qty]").value)   || 1,
  };
}

function computeSubtotal(d) {
  const ope   = OPE_TYPES.find((x) => x.id === d.opeId);
  const wall  = WALL_TYPES.find((x) => x.id === d.wallId);
  const fire  = FIRE_RATINGS.find((x) => x.id === d.fireId);
  const floor = FLOOR_POSITIONS.find((x) => x.id === d.floorId) || FLOOR_POSITIONS[1];

  if (!ope || !wall || !fire || (d.width === 0 && d.height === 0)) {
    return { sub: null, ope, wall, fire, floor };
  }

  let sub;
  if (d.opeId === "linear") {
    const meters = (d.width + d.height) / 100 || 1;
    sub = ope.base * wall.mult * fire.mult * meters * floor.mult * d.qty;
  } else {
    const sizeMult = sizeMultiplier(d.width, d.height);
    sub = ope.base * wall.mult * fire.mult * sizeMult * floor.mult * d.qty;
  }
  return { sub, ope, wall, fire, floor };
}

function recalc(form, lang) {
  let total = 0;
  form.querySelectorAll(".quoter-row").forEach((row) => {
    const d = collectRowData(row);
    const { sub } = computeSubtotal(d);
    const subEl = row.querySelector(".subtotal");
    if (sub === null) {
      subEl.innerHTML = `<span class="none">${COPY[lang].noPrice}</span>`;
      return;
    }
    subEl.textContent = formatPrice(sub, lang);
    total += sub;
  });
  form.querySelector("#total-amount").textContent = formatPrice(total, lang);
}

function buildMailBody(form, lang) {
  const c = COPY[lang];
  const rows = [...form.querySelectorAll(".quoter-row")];
  const lines = [];
  lines.push(c.mailHello);
  lines.push("");
  lines.push(c.mailIntro);
  lines.push("");
  lines.push(c.mailRows + ":");

  let total = 0;
  rows.forEach((row, i) => {
    const d = collectRowData(row);
    const { sub, ope, wall, fire, floor } = computeSubtotal(d);
    lines.push(`  ${c.mailLineNum} ${i + 1}:`);
    lines.push(`    ${c.mailType}:     ${ope ? ope.label[lang] : "—"}`);
    lines.push(`    ${c.mailWall}:     ${wall ? wall.label[lang] : "—"}`);
    lines.push(`    ${c.mailFire}:     ${fire ? fire.label[lang] : "—"}`);
    lines.push(`    ${c.mailSize}:     ${d.width || 0} × ${d.height || 0} cm`);
    lines.push(`    ${c.mailFloor}:    ${floor ? floor.label[lang] : "—"}`);
    lines.push(`    ${c.mailQty}:      ${d.qty}`);
    lines.push(`    ${c.mailSubtotal}: ${sub === null ? "—" : formatPrice(sub, lang)}`);
    lines.push("");
    if (sub !== null) total += sub;
  });

  const fd = new FormData(form);
  lines.push("");
  lines.push(c.mailCustomer + ":");
  lines.push(`  ${c.mailName}:    ${fd.get("cust-name") || ""}`);
  lines.push(`  ${c.mailCompany}: ${fd.get("cust-company") || ""}`);
  lines.push(`  ${c.mailEmail}:   ${fd.get("cust-email") || ""}`);
  lines.push(`  ${c.mailPhone}:   ${fd.get("cust-phone") || ""}`);
  const notes = fd.get("cust-notes");
  if (notes) {
    lines.push(`  ${c.mailNotes}:`);
    notes.toString().split("\n").forEach((n) => lines.push("    " + n));
  }
  lines.push("");
  lines.push(`${c.mailTotal}: ${formatPrice(total, lang)}`);
  lines.push(c.mailFooter);
  return lines.join("\n");
}

export function initQuoteCalculator() {
  const form = document.querySelector("form.quoter");
  if (!form) return;

  const lang = form.dataset.lang === "en" ? "en" : "is";
  const rowsEl = form.querySelector(".quoter-rows");
  const addBtn = form.querySelector("[data-quoter-add]");
  let counter = 0;

  const addRow = () => {
    counter += 1;
    const row = buildRow(counter, lang);
    rowsEl.appendChild(row);
    row.querySelectorAll("select, input").forEach((el) => {
      el.addEventListener("input", () => recalc(form, lang));
      el.addEventListener("change", () => recalc(form, lang));
    });
    recalc(form, lang);
  };

  if (addBtn) addBtn.addEventListener("click", addRow);

  rowsEl.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-quoter-remove]");
    if (!btn) return;
    const row = btn.closest(".quoter-row");
    if (row) row.remove();
    recalc(form, lang);
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const body = buildMailBody(form, lang);
    const subject = COPY[lang].mailSubject;
    const mailto = `mailto:bruna@bruna.is?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;

    const banner = form.querySelector("#quoter-confirm");
    if (banner) {
      banner.classList.add("show");
      banner.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  });

  // Seed two rows so the form isn't empty on load.
  addRow();
  addRow();
}
