// Quote calculator — port of the inline JS in mockup/verdreiknir.html (lines 240–376).
// Pricing constants live in quote-config.js; submit handler now caps mailto body and
// uses an anchor-based open so form state is preserved.

import {
  OPE_TYPES, WALL_TYPES, FIRE_RATINGS, FLOOR_POSITIONS,
  SIZE_BRACKETS, SIZE_BRACKET_OVERFLOW,
} from "./quote-config.js";

const MAILTO_MAX_ROWS = 20;
const MAILTO_MAX_NOTES = 1500;

function truncateNotes(notes, lang) {
  if (!notes) return "";
  const s = notes.toString();
  if (s.length <= MAILTO_MAX_NOTES) return s;
  const marker = lang === "is" ? "\n… [stytt]" : "\n… [truncated]";
  return s.slice(0, MAILTO_MAX_NOTES) + marker;
}

const COPY = {
  is: {
    chooseOption: "— veldu —",
    removeRow:    "Fjarlægja línu",
    noPrice:      "—",
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
  for (const b of SIZE_BRACKETS) if (max <= b.maxCm) return b.mult;
  return SIZE_BRACKET_OVERFLOW;
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
    <span class="quoter-row__subtotal"><span class="quoter-row__subtotal-empty">${c.noPrice}</span></span>
    <button type="button" class="quoter-row__remove" data-quoter-remove aria-label="${c.removeRow}">×</button>
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
    const subEl = row.querySelector(".quoter-row__subtotal");
    if (sub === null) {
      subEl.innerHTML = `<span class="quoter-row__subtotal-empty">${COPY[lang].noPrice}</span>`;
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

  // Cap body rows at MAILTO_MAX_ROWS; total still reflects all rows.
  const visibleRows = rows.slice(0, MAILTO_MAX_ROWS);
  const hiddenCount = rows.length - visibleRows.length;

  let total = 0;

  // Body: only the first MAILTO_MAX_ROWS rows.
  visibleRows.forEach((row, i) => {
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

  // Hidden-row summary line.
  if (hiddenCount > 0) {
    lines.push(
      lang === "is"
        ? `  (+ ${hiddenCount} fleiri línur — hringdu í (+354) 850-4405)`
        : `  (+ ${hiddenCount} more rows — call (+354) 850-4405)`
    );
    lines.push("");
  }

  // Total must reflect ALL rows, including any hidden ones.
  if (hiddenCount > 0) {
    rows.slice(MAILTO_MAX_ROWS).forEach((row) => {
      const d = collectRowData(row);
      const { sub } = computeSubtotal(d);
      if (sub !== null) total += sub;
    });
  }

  const fd = new FormData(form);
  lines.push("");
  lines.push(c.mailCustomer + ":");
  lines.push(`  ${c.mailName}:    ${fd.get("cust-name") || ""}`);
  lines.push(`  ${c.mailCompany}: ${fd.get("cust-company") || ""}`);
  lines.push(`  ${c.mailEmail}:   ${fd.get("cust-email") || ""}`);
  lines.push(`  ${c.mailPhone}:   ${fd.get("cust-phone") || ""}`);
  const notes = truncateNotes(fd.get("cust-notes"), lang);
  if (notes) {
    lines.push(`  ${c.mailNotes}:`);
    notes.split("\n").forEach((n) => lines.push("    " + n));
  }
  lines.push("");
  lines.push(`${c.mailTotal}: ${formatPrice(total, lang)}`);
  lines.push(c.mailFooter);
  return lines.join("\n");
}

export function initQuoteCalculator({ signal } = {}) {
  const form = document.querySelector("form.quoter");
  if (!form) return;

  const lang = form.dataset.lang === "en" ? "en" : "is";
  const rowsEl = form.querySelector(".quoter-rows");
  const addBtn = form.querySelector("[data-quoter-add]");
  let counter = 0;

  const addRow = ({ skipRecalc = false } = {}) => {
    counter += 1;
    const row = buildRow(counter, lang);
    rowsEl.appendChild(row);
    row.querySelectorAll("select, input").forEach((el) => {
      el.addEventListener("input", () => recalc(form, lang), { signal });
      el.addEventListener("change", () => recalc(form, lang), { signal });
    });
    if (!skipRecalc) recalc(form, lang);
  };

  if (addBtn) addBtn.addEventListener("click", addRow, { signal });

  rowsEl.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-quoter-remove]");
    if (!btn) return;
    const row = btn.closest(".quoter-row");
    if (row) row.remove();
    recalc(form, lang);
  }, { signal });

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    // JS-side gate: at least one row must have the three required selects filled.
    const rows = [...form.querySelectorAll(".quoter-row")];
    const firstValidRow = rows.find((r) => {
      const d = collectRowData(r);
      return d.opeId && d.wallId && d.fireId;
    });
    if (!firstValidRow) {
      const firstEmptySelect =
        form.querySelector(".quoter-row select:invalid") ||
        form.querySelector(".quoter-row [name=opeType]");
      if (firstEmptySelect) firstEmptySelect.focus();
      return; // honest no-op — no banner, no mailto attempt
    }

    const body = buildMailBody(form, lang);
    const subject = COPY[lang].mailSubject;
    const href = `mailto:bruna@bruna.is?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    // Anchor-based open: more predictable than window.location.href across browsers,
    // preserves form state, and gives the user a real link if the click is blocked.
    const a = document.createElement("a");
    a.href = href;
    a.target = "_blank";
    a.rel = "noopener";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();

    const banner = form.querySelector("#quoter-confirm");
    if (banner) {
      banner.dataset.visible = "true";
      banner.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, { signal });

  // Seed two rows so the form isn't empty on load — batch the recalc.
  addRow({ skipRecalc: true });
  addRow({ skipRecalc: true });
  recalc(form, lang);
}
