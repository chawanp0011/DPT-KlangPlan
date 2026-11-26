// KlangFinance, round P10 (14 Nov 2569), reworked in round P11 (15 Nov 2569): the division request is one ordered form.
// Order of the main tab: 1 name of the request; 2 who asked, with as many attached files as needed (a request that another agency makes through the
// division needs its request document); 3 the AI that drafts the request document from the details and from ALL the attached files, with a sample
// of the official letter; 4 programme, output or project, activity, budget type, expenditure categories; 5 the lines (kind of money, an item chosen
// from the reference price register BQ5, quantity, unit, unit price, budget money, and non-budget lines of its own); 6 totals and the average
// reference price; 7 references whose prices add up to budget plus non-budget money; then the justification; then the send button.
// Price rule (P11): every line picks an item of the reference price register. A STANDARD price comes with the item and cannot be changed; a price
// OUTSIDE the standard comes with the item too (its source is in the register) but can be edited on the line. A line without an item is a red check.
// The central-register step of P10 is gone (the price register is the register). The alignment with the national plans, the commitment details, the
// MTEF and the indicators are tabs (file 98zx). The "documents" tab and its checks are gone: files are attached in section 2.
// For Planning: the status and spending plan of the units' non-budget money is the body of the tab "Units' non-budget funds" of the consolidation page (file 98zx adds the department's NBUD form above it); the page BQ13 and its menu entry are gone.
// Assumptions: the account is a hidden default per kind of expenditure, the AI draft is a fixed template over the request's own data (not a language
// model, and it reads the NAMES of the attached files, not their content).

const RQ_ACCT_OF = { per: "5101", ope: "5102", inv: "1201", sub: "5105", oth: "5199" };
const RQ_BY_KIND = { lgo: ["องค์กรปกครองส่วนท้องถิ่น (อปท.)", "Local administration"], gov: ["หน่วยงานรัฐอื่น", "Other government agency"], pub: ["ภาคประชาชน / ชุมชน", "Citizens or community"], other: ["อื่น ๆ", "Other"] };
const RQ_WSTEPS = [["จัดทำ TOR และราคากลาง", "Prepare the TOR and reference price"], ["จัดซื้อจัดจ้าง", "Procurement"], ["ส่งมอบและตรวจรับ", "Delivery and acceptance"], ["ติดตั้ง ทดสอบ", "Install and test"], ["เริ่มใช้งาน", "Start of use"]];
const RQ_LETTERS = { memo: ["บันทึกข้อความ (ภายในส่วนราชการ ถึงกองแผนงาน)", "Memorandum (inside the department, to Planning)"], letter: ["หนังสือภายนอก (ส่วนราชการอื่น)", "Official letter (to another agency)"] };

const lineStd = it => (it.sp ? S.prices.find(p => p.id === it.sp) || null : null);
const pKind = p => (p && p.kind) || "std";
const lineNb = it => (it.nb || []).reduce((s, x) => s + (Number(x.amt) || 0), 0);
const lineAll = it => itemTotal(it) + lineNb(it);
const reqNb = r => r.items.reduce((s, i) => s + lineNb(i), 0);
const reqAll = r => reqAmount(r) + reqNb(r);
const refSum = r => (r.refs || []).reduce((s, x) => s + (Number(x.amt) || 0), 0);
const nmStr = n => (Array.isArray(n) ? tx(n) : n || "");

// every line has a kind of money, an account and a list of non-budget lines
function rqLineInit(r) {
  r.items.forEach(it => { if (!it.money) it.money = "base"; if (!it.acct) it.acct = RQ_ACCT_OF[it.type] || "5102"; if (!it.nb) it.nb = []; });
  if (!r.rp) { const f = r.items.find(i => i.sp); if (f) r.rp = f.sp; } if (!r.refs) r.refs = []; if (!r.by) r.by = { mode: "direct" }; if (!r.by.files) r.by.files = [];
  return r;
}
function rqSyncOffs(r) {
  const c = rqCls(r); c.offs = r.items.flatMap(i => (i.nb || []).map(n => ({ type: n.type, amt: Number(n.amt) || 0, note: n.note || "" }))); rqSyncCo(c);
  c.money = [...new Set(r.items.map(i => i.money).filter(Boolean))]; if (r.multi && !c.money.includes("multi")) c.money.push("multi");
}
// the request has ONE item of the price register (shown in the register section only). The lines of the request keep their own names; they share its unit and unit price.
// (16 Nov 2569: the lines no longer show the register item, and the indicators follow the lines of the request, not the register item)
function rqPick(it, p) { it.sp = p.id; it.pm = pKind(p); if (!nmStr(it.name)) it.name = p.name.slice(); it.type = p.type; it.unitName = p.unit.slice(); it.price = p.price; delete it.own; it.acct = RQ_ACCT_OF[p.type] || it.acct; }
function rqPriceSync(r) { r.items.forEach(it => { const p = lineStd(it); if (p && !it.own && pKind(p) === "std" && Number(it.price) !== Number(p.price)) it.price = p.price; }); r.amount = reqAmount(r); }

// the standard steps spread over the 12 months from the start of the year
function rqWDefault(start) { const a0 = new Date(start), span = 365 / RQ_WSTEPS.length, f = d => d.toISOString().slice(0, 10); return RQ_WSTEPS.map((st, n) => ({ step: st[0], start: f(new Date(a0.getTime() + n * span * 864e5)), end: f(new Date(a0.getTime() + ((n + 1) * span - 1) * 864e5)), owner: "", note: "" })); }

// ---------- seed ----------
Object.keys(SEEDS).forEach(k => {
  const prev = SEEDS[k].seed;
  SEEDS[k].seed = () => {
    const s = prev(); s.prices = s.prices || []; const eff = (s.prices[0] && s.prices[0].eff) || "2026-10-01";
    s.prices.forEach(p => { if (!p.kind) p.kind = "std"; if (!p.src) p.src = "std"; });
    const nid = () => `SP-${String(Math.max(0, ...s.prices.map(x => Number((String(x.id).match(/(\d+)$/) || [0, 0])[1]))) + 1).padStart(3, "0")}`;
    const addNs = (th, en, unit, price, type, src, doc) => { const p = { id: nid(), kind: "ns", type, name: [th, en || th], unit: [unit, unit], price, src, eff, exp: "", doc }; s.prices.push(p); return p; };
    // sample prices outside the standard (a quotation, a past contract), my own samples
    addNs("เครื่องคอมพิวเตอร์โน้ตบุ๊กสมรรถนะสูง (ใบเสนอราคา)", "High-spec notebook (quotation)", "เครื่อง", 38000, "inv", "quote", "ใบเสนอราคา 3 ราย (ตัวอย่าง)");
    addNs("ค่าจ้างวิทยากรผู้เชี่ยวชาญเฉพาะด้านต่อวัน", "Specialist speaker per day", "วัน", 18000, "ope", "past", "สัญญาเดิมเลขที่ ตัวอย่าง-001");
    (s.requests || []).forEach((r, i) => {
      rqLineInit(r);
      // one item of the register per request (the first line decides which); every line keeps its own name and shares the item's unit and unit price
      { const f0 = r.items.find(it => nmStr(it.name)); if (f0) { const nm0 = Array.isArray(f0.name) ? f0.name[0] : f0.name;
        let p = s.prices.find(x => pKind(x) === "std" && x.name.includes(nm0) && Number(x.price) === Number(f0.price)) || s.prices.find(x => pKind(x) === "ns" && x.name[0] === nm0 && Number(x.price) === Number(f0.price));
        if (!p) p = addNs(nm0, Array.isArray(f0.name) ? f0.name[1] : nm0, Array.isArray(f0.unitName) ? f0.unitName[0] : f0.unitName || "งาน", Number(f0.price) || 0, f0.type || "ope", "quote", "ใบเสนอราคา (ตัวอย่าง)");
        r.rp = p.id; r.items.forEach(it => { it.sp = p.id; it.pm = pKind(p); if (Number(it.price) !== Number(p.price)) it.own = true; }); } } // the sample lines keep their own unit prices, so the totals stay as they were; choosing the item again gives every line the shared price
      if (i % 2 === 0 && r.items[0]) r.items[0].nb.push({ type: "off01", amt: 30000, note: "ค่าตัวอย่าง เงินรายได้ของหน่วยงาน" });
      r.refs = r.rp ? [{ sp: r.rp, name: tx((s.prices.find(x => x.id === r.rp) || { name: ["", ""] }).name), amt: reqAll(r), note: pKind(s.prices.find(x => x.id === r.rp)) === "ns" ? "ราคานอกมาตรฐาน" : "" }] : [];
      if (r.items.some(x => x.type === "inv")) r.wplan = rqWDefault(`${FORM_FY - 544}-10-01`);
    });
    return s;
  };
});

// ---------- the main tab, rebuilt in order ----------
const rqEl = h => { const d = document.createElement("div"); d.innerHTML = h.trim(); return d.firstElementChild; };
const rqSec = (id, no, title, right, body) => `<section class="panel" id="${id}"><header><h2>${no ? no + ". " : ""}${title}</h2><span class="sp"></span>${right || ""}</header>${body}</section>`;

function rqNamePanel(r, ed) { return rqSec("rf-name", 1, L("ชื่อรายการคำขอ", "Name of the request"), "", `<div class="body"><div class="f"><label for="rname" class="sub">${L("ตั้งชื่อรายการคำขอ", "Name this request")}</label>${ed ? `<input type="text" id="rname" value="${esc(nmStr(r.name))}" style="max-width:640px">` : `<b>${esc(nmStr(r.name))}</b>`}</div></div>`); }

function rqByPanel(r, ed) {
  const b = r.by, ds = ed ? "" : "disabled", other = b.mode === "other", files = b.files || [];
  return rqSec("rf-by", 2, L("ผู้ขอและเอกสารแนบ", "Who asked and the attached files"), other ? tag(L("หน่วยงานอื่นขอ", "Asked by another agency"), "p-info") : tag(L("สำนัก/กองขอโดยตรง", "Asked by the division"), "p-mute"),
    `<div class="body" style="display:flex;flex-direction:column;gap:10px"><div class="row"><label class="radio"><input type="radio" name="by-mode" value="direct" ${!other ? "checked" : ""} ${ds}> ${L("สำนัก/กองขอโดยตรง", "The division asks directly")}</label><label class="radio"><input type="radio" name="by-mode" value="other" ${other ? "checked" : ""} ${ds}> ${L("หน่วยงานอื่นขอผ่านสำนัก/กอง", "Another agency asks through the division")}</label></div>
      ${other ? `<div class="inline-form" style="flex-wrap:wrap"><div class="f" style="flex:1 1 260px"><label for="by-ag">${L("ชื่อหน่วยงานที่ขอ", "Agency that asks")}</label><input type="text" id="by-ag" value="${esc(b.agency || "")}" ${ds}></div>
        <div class="f" style="flex:1 1 220px"><label for="by-kd">${L("ประเภทหน่วยงาน", "Kind of agency")}</label><select id="by-kd" ${ds}><option value="">${L("— เลือก —", "— choose —")}</option>${Object.keys(RQ_BY_KIND).map(k => `<option value="${k}" ${b.kind === k ? "selected" : ""}>${tx(RQ_BY_KIND[k])}</option>`).join("")}</select></div>
        <div class="f" style="flex:1 1 260px"><label for="by-rs">${L("รายละเอียดของหน่วยงานและเหตุที่ขอผ่านสำนัก/กอง", "Details of the agency and why it asks through the division")}</label><input type="text" id="by-rs" value="${esc(b.detail || "")}" ${ds}></div></div>` : ""}
      <div style="display:flex;flex-direction:column;gap:6px"><div class="row"><b style="font-weight:600">${L("เอกสารแนบ (หนังสือขอ รายละเอียด ใบเสนอราคา อื่น ๆ)", "Attached files (request letter, details, quotations, others)")}</b> ${tag(`${files.length} ${L("ไฟล์", "files")}`, files.length ? "p-ok" : "p-mute")}</div>
        <div id="by-files">${files.map((f, i) => `<div class="row" style="margin-bottom:2px">${tag(esc(f), "p-mute")}${ed ? `<button class="btn ghost danger" type="button" data-byfdel="${i}" aria-label="${L("ลบไฟล์", "Remove the file")}" style="padding:2px 8px">×</button>` : ""}</div>`).join("") || `<span class="sub">${other ? L("ต้องแนบเอกสารคำขอของหน่วยงาน (หนังสือขอ) อย่างน้อย 1 ไฟล์", "Attach the agency's request document (letter), at least one file") : L("ยังไม่ได้แนบ ไม่บังคับ", "None yet; optional")}</span>`}</div>
        ${ed ? `<div class="row"><button class="btn" type="button" id="by-doc">+ ${L("แนบไฟล์ (เลือกได้หลายไฟล์)", "Attach files (several at once)")}</button><input type="file" id="by-file" multiple hidden><span class="sub">${L("AI ใช้ทุกไฟล์ที่แนบในการร่างเอกสาร · ต้นแบบเก็บเฉพาะชื่อไฟล์", "The AI uses every attached file for the draft · the prototype keeps the file name only")}</span></div>` : ""}</div></div>`);
}

function rqRegPanel(r, ed) {
  const p = r.rp && S.prices.find(x => x.id === r.rp), ns = p && pKind(p) === "ns", odd = p ? r.items.filter(i => i.sp !== p.id).length : 0;
  return rqSec("rf-reg", 5, L("ทะเบียนราคากลาง", "Reference price register"), p ? tag(L("เลือกแล้ว 1 รายการ", "One item chosen"), "p-ok") : tag(L("ยังไม่ได้เลือก", "Nothing chosen"), "p-bad"),
    `<div class="body sub">${L("เลือกได้ 1 รายการจากทะเบียนราคากลางต่อ 1 คำขอ ทุกบรรทัดของคำขอใช้ราคากลางของรายการนี้ร่วมกัน (ต่างกันที่ประเภทเงินและปริมาณ) ทะเบียนอาจมีหลายพันรายการ จึงเลือกในหน้าต่างค้นหา", "One item of the register per request; every line of the request shares its reference price (lines differ by kind of money and quantity). The register can hold thousands of items, so you choose in a search window")}</div>
    <div class="body" id="rg-card">${p ? `<div class="row" style="align-items:flex-start;gap:16px"><div style="flex:1 1 320px"><div><span class="mono sub">${p.id}</span> <b style="font-weight:600">${esc(tx(p.name))}</b> ${tag(tx(RP_KIND[pKind(p)]), ns ? "p-warn" : "p-ok")}</div><div class="sub">${L("แหล่งที่มา", "Source")}: ${esc(tx(RP_SRC[p.src || "std"]))}${p.doc ? " · " + esc(p.doc) : ""} · ${L("ใช้ได้", "valid")} ${p.eff ? fdate(p.eff) : "–"} → ${p.exp ? fdate(p.exp) : "–"}</div></div>
      <div><div class="sub">${L("ราคากลางต่อหน่วย", "Reference price per unit")}</div>${ns && ed ? `<input type="number" id="rg-price" min="0" step="100" value="${(r.items[0] || {}).price != null ? r.items[0].price : p.price}" aria-label="${L("ราคาต่อหน่วย (แก้ได้)", "Unit price (editable)")}" style="max-width:150px">` : `<b class="num" style="font-size:20px">${fmt(ns && r.items[0] ? r.items[0].price : p.price)}</b>`} <span class="sub">/ ${esc(tx(p.unit))}</span>${ns && r.items[0] && Number(r.items[0].price) !== Number(p.price) ? `<div class="sub">${L("ราคาในทะเบียน", "Register price")} ${fmt(p.price)}</div>` : ""}${ns ? `<div class="sub">${L("ราคานอกมาตรฐาน แก้ราคาต่อหน่วยได้ที่นี่ ทุกบรรทัดของคำขอใช้ราคานี้", "Outside the standard: edit the unit price here; every line of the request uses it")}</div>` : `<div class="sub">${L("ราคามาตรฐาน แก้ไม่ได้", "Standard price; fixed")}</div>`}</div></div>
      ${odd ? `<div class="alert" style="margin-top:8px"><div class="ic" style="background:var(--warn-soft);color:var(--warn)">!</div><div><b>${odd} ${L("บรรทัดยังใช้รายการอื่น (ข้อมูลเดิม)", "lines still use another item (older data)")}</b><p>${L("เลือกรายการอีกครั้งเพื่อให้ทุกบรรทัดใช้รายการเดียวกัน", "Choose the item again so that every line uses the same one")}</p></div></div>` : ""}` : `<span style="color:var(--bad)">${L("ยังไม่ได้เลือกรายการจากทะเบียนราคากลาง", "No item of the price register chosen yet")}</span>`}
      ${ed ? `<div class="row" style="margin-top:8px"><button class="btn primary" type="button" id="rg-open">${p ? L("เปลี่ยนรายการ", "Change the item") : L("เลือกรายการจากทะเบียนราคากลาง", "Choose an item of the register")}</button></div>` : ""}</div>`);
}

// the pop-up: search, kind filter and pages, so a register of thousands of items stays usable; only one page is drawn
const RG_PAGE = 8;
function rgPopup(r, onPick) {
  document.querySelectorAll("#rg-modal").forEach(e => e.remove());
  const st = { q: "", kind: "", page: 0 }, all = () => S.prices.filter(x => rpValid(x));
  const el = document.createElement("div"); el.id = "rg-modal"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-label", L("เลือกรายการจากทะเบียนราคากลาง", "Choose an item of the price register"));
  el.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:1000;padding:16px";
  const close = () => { el.remove(); document.removeEventListener("keydown", esc2); }, esc2 = e => { if (e.key === "Escape") close(); };
  const rows = () => { const q = st.q.trim().toLowerCase(); return all().filter(x => (!st.kind || pKind(x) === st.kind) && (!q || (x.id + " " + tx(x.name) + " " + (x.doc || "")).toLowerCase().includes(q))); };
  const draw = (keepFocus) => {
    const rs = rows(), pages = Math.max(1, Math.ceil(rs.length / RG_PAGE)); if (st.page >= pages) st.page = pages - 1; const cur = rs.slice(st.page * RG_PAGE, st.page * RG_PAGE + RG_PAGE);
    const body = el.querySelector("#rg-body"); body.innerHTML = `<div class="tbl-wrap"><table><thead><tr><th>${L("รหัส", "Code")}</th><th>${L("รายการ", "Item")}</th><th>${L("ประเภทราคา", "Kind")}</th><th>${L("หน่วย", "Unit")}</th><th class="n">${L("ราคา (บาท)", "Price (baht)")}</th><th>${L("แหล่งที่มา", "Source")}</th><th></th></tr></thead>
      <tbody>${cur.map(x => `<tr><td class="mono">${x.id}</td><td>${esc(tx(x.name))}</td><td>${tag(tx(RP_KIND[pKind(x)]), pKind(x) === "std" ? "p-ok" : "p-warn")}</td><td class="sub">${esc(tx(x.unit))}</td><td class="n"><b class="num">${fmt(x.price)}</b></td><td class="sub">${esc(tx(RP_SRC[x.src || "std"]))}</td><td><button class="btn ${r.rp === x.id ? "" : "primary"}" type="button" data-rgpick="${x.id}">${r.rp === x.id ? L("เลือกอยู่", "Chosen") : L("เลือก", "Choose")}</button></td></tr>`).join("") || `<tr><td colspan="7" class="sub">${L("ไม่พบรายการ", "Nothing found")}</td></tr>`}</tbody></table></div>
      <div class="row" style="justify-content:space-between;margin-top:8px"><span class="sub" id="rg-count">${rs.length} ${L("รายการ", "items")} · ${L("หน้า", "page")} ${st.page + 1}/${pages}</span><span class="row"><button class="btn" type="button" id="rg-prev" ${st.page ? "" : "disabled"}>‹ ${L("ก่อนหน้า", "Prev")}</button><button class="btn" type="button" id="rg-next" ${st.page < pages - 1 ? "" : "disabled"}>${L("ถัดไป", "Next")} ›</button></span></div>`;
    body.querySelectorAll("[data-rgpick]").forEach(b => (b.onclick = () => { const x = S.prices.find(y => y.id === b.dataset.rgpick); if (x) { close(); onPick(x); } }));
    const pv = body.querySelector("#rg-prev"), nx = body.querySelector("#rg-next"); if (pv) pv.onclick = () => { st.page--; draw(); }; if (nx) nx.onclick = () => { st.page++; draw(); };
  };
  el.innerHTML = `<div style="background:var(--surface);color:var(--ink);border:1px solid var(--line);border-radius:12px;max-width:920px;width:100%;max-height:90vh;display:flex;flex-direction:column"><header style="display:flex;align-items:center;gap:8px;padding:14px 16px;border-bottom:1px solid var(--line)"><h2 style="margin:0;font-size:16px;flex:1">${L("เลือกรายการจากทะเบียนราคากลาง", "Choose an item of the reference price register")}</h2><button class="btn ghost" type="button" id="rg-close" aria-label="${L("ปิด", "Close")}">×</button></header>
    <div style="padding:12px 16px;display:flex;gap:8px;flex-wrap:wrap"><input type="search" id="rg-q" placeholder="${L("ค้นหารหัส ชื่อรายการ หรือเอกสารอ้างอิง", "Search by code, name or reference document")}" aria-label="${L("ค้นหา", "Search")}" style="flex:1 1 280px"><select id="rg-k" aria-label="${L("ประเภทราคา", "Kind of price")}"><option value="">${L("ประเภทราคา: ทั้งหมด", "Kind: all")}</option>${Object.keys(RP_KIND).map(k => `<option value="${k}">${tx(RP_KIND[k])}</option>`).join("")}</select></div>
    <div id="rg-body" style="padding:0 16px 16px;overflow:auto"></div></div>`;
  document.body.appendChild(el); document.addEventListener("keydown", esc2);
  el.onclick = e => { if (e.target === el) close(); }; el.querySelector("#rg-close").onclick = close;
  let t = null; el.querySelector("#rg-q").oninput = e => { clearTimeout(t); t = setTimeout(() => { st.q = e.target.value; st.page = 0; draw(); }, 120); };
  el.querySelector("#rg-k").onchange = e => { st.kind = e.target.value; st.page = 0; draw(); };
  draw(); el.querySelector("#rg-q").focus();
}
// the request takes the chosen item: every line gets its name, unit and price (the quantity, the kind of money and the non-budget lines stay)
function rqChoose(r, p) { r.rp = p.id; if (!r.items.length) r.items.push({ qty: 1, money: "base", nb: [], inds: [], name: p.name.slice() }); r.items.forEach(it => rqPick(it, p)); }

function rqLinesPanel(r, ed) {
  const ds = ed ? "" : "disabled", buds = rqMoneyTypes("bud"), offs = rqMoneyTypes("off");
  const opt = (list, cur) => list.map(x => `<option value="${x.id}" ${x.id === cur ? "selected" : ""}>${esc(tx(x.name))}</option>`).join("");
    const rows = r.items.map((it, i) => { const sp = lineStd(it), ns = !!sp && pKind(sp) === "ns", nb = it.nb || [];
    return `<tr class="rf-line"><td class="n">${i + 1}</td>
      <td><select data-ln="${i}" data-f="money" ${ds} aria-label="${L("ประเภทเงิน", "Kind of money")}">${opt(buds, it.money)}</select>${sp ? "" : `<div class="sub" style="color:var(--bad)">${L("ต้องเลือกรายการจากทะเบียนราคากลาง (เลือกที่ส่วนบน)", "An item of the price register must be chosen (in the section above)")}</div>`}</td>
      <td><input type="number" min="0" data-ln="${i}" data-f="qty" value="${it.qty}" ${ds} aria-label="${L("ปริมาณ", "Quantity")}" style="max-width:90px"></td>
      <td><span class="sub">${sp ? esc(tx(sp.unit)) : "—"}</span></td>
      <td class="n">${!sp ? "—" : `<b class="num">${fmt(it.price)}</b>${it.own ? `<div class="sub">${L("ราคาเดิมของรายการ (เลือกรายการทะเบียนอีกครั้งเพื่อใช้ราคาร่วม)", "The line's own price (choose the register item again to share one price)")}</div>` : ""}`}</td>
      <td class="n"><b class="num">${fmt(itemTotal(it))}</b><div class="sub">${L("ปริมาณ × ราคา", "qty × price")}</div></td>
      <td>${ed ? `<button class="btn ghost danger" type="button" data-lndel="${i}" aria-label="${L("ลบรายการ", "Delete line")}" style="padding:4px 8px">×</button>` : ""}</td></tr>
    <tr class="rf-nb"><td></td><td colspan="6"><div class="sub" style="margin-bottom:4px"><b style="font-weight:600">${L("เงินนอกงบประมาณของรายการที่", "Non-budget money of line")} ${i + 1}</b> ${ed ? `<button class="btn ghost" type="button" data-nbadd="${i}" ${offs.length ? "" : "disabled"}>+ ${L("เพิ่มเงินนอกงบประมาณ", "Add non-budget money")}</button>` : ""}${offs.length ? "" : ` ${L("ยังไม่มีประเภทเงินนอกงบ ตั้งที่ BQ2", "No non-budget kind yet; set one on BQ2")}`}</div>
      ${nb.map((x, j) => `<div class="row" style="flex-wrap:wrap;margin-bottom:4px"><select data-nb="${i}|${j}" data-f="type" ${ds} aria-label="${L("ประเภทเงินนอกงบ", "Non-budget kind")}"><option value="">${L("— ประเภท —", "— kind —")}</option>${opt(offs, x.type)}</select>
        <input type="number" min="0" step="1000" data-nb="${i}|${j}" data-f="amt" value="${x.amt || ""}" placeholder="${L("จำนวนเงิน (บาท)", "Amount (baht)")}" ${ds} style="max-width:170px"><input type="text" data-nb="${i}|${j}" data-f="note" value="${esc(x.note || "")}" placeholder="${L("แหล่งเงิน / หมายเหตุ", "Source / note")}" ${ds}>${ed ? `<button class="btn ghost" type="button" data-nbdel="${i}|${j}" aria-label="${L("ลบ", "Remove")}">×</button>` : ""}</div>`).join("")}
      <div class="sub">${L("เงินงบประมาณ", "Budget")} <b>${fmt(itemTotal(it))}</b> + ${L("เงินนอกงบประมาณ", "non-budget")} <b>${fmt(lineNb(it))}</b> = ${L("รวมของรายการนี้", "total of this line")} <b>${fmt(lineAll(it))}</b> ${L("บาท", "baht")}</div></td></tr>`; }).join("");
  return rqSec("rf-lines", 6, L("ประเภทเงิน (บาท)", "Kinds of money (baht)"), `<span class="sub">${L("ทุกบรรทัดของคำขอใช้ราคากลางของรายการที่เลือกด้านบนร่วมกัน (ต่างกันที่ประเภทเงินและปริมาณ) · ปริมาณ × ราคา = เงินงบประมาณของรายการ", "Every line uses the price of the item chosen above; they differ by kind of money and quantity · quantity × price = the budget money of the line")}</span>`,
    `<div class="tbl-wrap"><table class="items"><thead><tr><th>#</th><th>${L("ประเภทเงิน", "Kind of money")}</th><th class="n">${L("ปริมาณ", "Qty")}</th><th>${L("หน่วย", "Unit")}</th><th class="n">${L("ราคาต่อหน่วย", "Unit price")}</th><th class="n">${L("เงินงบประมาณ", "Budget money")}</th><th>${L("จัดการ", "Manage")}</th></tr></thead><tbody>${rows}</tbody>
      <tfoot><tr><td colspan="2">${L("รวมเงินงบประมาณ", "Budget total")}</td><td class="n">${fmt(r.items.reduce((t, i) => t + (Number(i.qty) || 0), 0))}</td><td></td><td></td><td class="n">${fmt(reqAmount(r))}</td><td></td></tr></tfoot></table></div>
    ${ed ? `<div class="body row"><button class="btn" type="button" id="ln-add" ${r.rp ? "" : "disabled"}>+ ${L("เพิ่มประเภทเงิน", "Add a kind of money")}</button>${r.rp ? "" : `<span class="sub">${L("เลือกรายการจากทะเบียนราคากลางก่อน", "Choose the register item first")}</span>`}</div>` : ""}`);
}

function rqSumPanel(r) {
  const bud = reqAmount(r), nb = reqNb(r), std = r.items.map(lineStd).filter(Boolean), avg = std.length ? std.reduce((s, p) => s + p.price, 0) / std.length : 0;
  const qs = r.items.filter(i => lineStd(i)).reduce((s, i) => s + (Number(i.qty) || 0), 0), wavg = qs ? r.items.filter(i => lineStd(i)).reduce((s, i) => s + (Number(i.qty) || 0) * lineStd(i).price, 0) / qs : 0;
  const by = {}; r.items.forEach(i => { const k = i.money || "base", e = by[k] || (by[k] = { b: 0, n: 0 }); e.b += itemTotal(i); e.n += lineNb(i); });
  return rqSec("rf-sum", 7, L("สรุปยอดทุกรายการ", "Totals of all lines"), "", `<section class="kpis" style="grid-template-columns:repeat(4,minmax(0,1fr));margin:12px"><div class="kpi"><span class="l">${L("เงินงบประมาณรวม", "Budget total")}</span><span class="v">${fmt(bud)}</span></div><div class="kpi"><span class="l">${L("เงินนอกงบประมาณรวม", "Non-budget total")}</span><span class="v">${fmt(nb)}</span></div><div class="kpi"><span class="l">${L("รวมทั้งสิ้น", "Grand total")}</span><span class="v">${fmt(bud + nb)}</span></div>
    <div class="kpi"><span class="l">${L("ราคากลางเฉลี่ย (ต่อรายการ)", "Average reference price (per line)")}</span><span class="v">${std.length ? fmt(avg) : "—"}</span><span class="d sub">${std.length ? `${L("ถ่วงน้ำหนักตามปริมาณ", "weighted by quantity")} ${fmt(wavg)} · ${std.length}/${r.items.length} ${L("รายการเลือกจากทะเบียน", "lines from the register")}` : L("ยังไม่มีรายการจากทะเบียน", "No line from the register")}</span></div></section>
    <div class="tbl-wrap"><table><thead><tr><th>${L("ประเภทเงิน", "Kind of money")}</th><th class="n">${L("เงินงบประมาณ", "Budget")}</th><th class="n">${L("เงินนอกงบประมาณ", "Non-budget")}</th></tr></thead><tbody>${Object.keys(by).map(k => `<tr><td>${esc(rqMoneyName(k))}</td><td class="n">${fmt(by[k].b)}</td><td class="n">${fmt(by[k].n)}</td></tr>`).join("")}</tbody></table></div>`);
}

function rqRefsPanel(r, ed) {
  const ds = ed ? "" : "disabled", refs = r.refs || [], sum = refSum(r), tgt = reqAll(r), diff = tgt - sum, live = S.prices.filter(p => !p.retired);
  return rqSec("rf-refs", 8, L("รายการอ้างอิงราคากลาง", "Reference prices"), refs.length ? tag(Math.abs(diff) < 1 ? L("ผลรวมเท่ากับงบ + นอกงบ", "Equals budget + non-budget") : `${diff > 0 ? L("ขาด", "Short") : L("เกิน", "Over")} ${fmt(Math.abs(diff))}`, Math.abs(diff) < 1 ? "p-ok" : "p-bad") : tag(L("ยังไม่มี", "None yet"), "p-warn"),
    `<div class="body sub">${L("เพิ่มรายการอ้างอิงและราคากลางที่ใช้ ผลรวมของราคาต้องเท่ากับ เงินงบประมาณ + เงินนอกงบประมาณ", "Add the references and reference prices used; their total must equal budget plus non-budget money")}: <b>${fmt(tgt)}</b></div>
    <div class="tbl-wrap"><table><thead><tr><th>#</th><th>${L("รายการอ้างอิง", "Reference")}</th><th class="n">${L("ราคากลางรวม (บาท)", "Reference price total (baht)")}</th><th>${L("หมายเหตุ", "Note")}</th><th></th></tr></thead>
      <tbody>${refs.map((x, i) => `<tr><td class="n">${i + 1}</td><td><select data-rf="${i}" data-f="sp" ${ds} aria-label="${L("รายการในทะเบียนราคากลาง", "Item of the price register")}"><option value="">${L("— อื่น ๆ (ระบุชื่อเอง) —", "— Other (type the name) —")}</option>${live.map(p => `<option value="${p.id}" ${x.sp === p.id ? "selected" : ""}>${p.id} ${esc(tx(p.name))}</option>`).join("")}</select><input type="text" data-rf="${i}" data-f="name" value="${esc(x.name || "")}" ${ds} placeholder="${L("ชื่อรายการอ้างอิง", "Name of the reference")}"></td>
        <td class="n"><input type="number" min="0" step="100" data-rf="${i}" data-f="amt" value="${x.amt || ""}" ${ds} style="max-width:160px"></td><td><input type="text" data-rf="${i}" data-f="note" value="${esc(x.note || "")}" ${ds}></td>
        <td>${ed ? `<button class="btn ghost danger" type="button" data-rfdel="${i}" aria-label="${L("ลบ", "Remove")}" style="padding:4px 8px">×</button>` : ""}</td></tr>`).join("") || `<tr><td colspan="5" class="sub">${L("ยังไม่มีรายการอ้างอิง", "No reference yet")}</td></tr>`}</tbody>
      <tfoot><tr><td colspan="2">${L("รวม", "Total")}</td><td class="n">${fmt(sum)}</td><td colspan="2" class="sub">${L("เงินงบประมาณ + นอกงบประมาณ", "Budget + non-budget")} ${fmt(tgt)}</td></tr></tfoot></table></div>
    ${ed ? `<div class="body row"><button class="btn" type="button" id="rf-add">+ ${L("เพิ่มรายการอ้างอิง", "Add a reference")}</button><button class="btn" type="button" id="rf-auto">${L("สร้างจากรายการเงินงบประมาณ", "Build from the budget lines")}</button><button class="btn" type="button" id="rf-bal" ${refs.length && Math.abs(diff) >= 1 ? "" : "disabled"}>${L("ใส่ส่วนต่างในรายการสุดท้าย", "Put the difference on the last reference")}</button></div>` : ""}`);
}

// ---------- the AI draft of the request document ----------
// A fixed template over the request's own data, in the shape of an official memorandum or letter (the format of the Prime Minister's Office
// regulation on correspondence: office, number, date, subject, addressee, reference, enclosures, body, closing). It reads the NAMES of the attached
// files (the prototype keeps no file content) and says what each file seems to be from its name.
const RQ_FKIND = [[/หนังสือขอ|เอกสารคำขอ|request/i, ["หนังสือขอ/เอกสารคำขอ", "Request letter"]], [/ใบเสนอราคา|quotation|quote/i, ["ใบเสนอราคา", "Quotation"]], [/TOR|ขอบเขต/i, ["ขอบเขตของงาน (TOR)", "TOR"]], [/คุณลักษณะ|spec/i, ["คุณลักษณะเฉพาะ", "Specification"]], [/แบบรูป|drawing/i, ["แบบรูปรายการ", "Drawings"]], [/มติ|ครม|cabinet/i, ["มติ/หนังสืออนุมัติ", "Resolution"]], [/สัญญา|contract/i, ["สัญญา/ข้อตกลง", "Contract"]]];
const rqFileKind = n => { const h = RQ_FKIND.find(x => x[0].test(n)); return h ? tx(h[1]) : L("เอกสารประกอบอื่น", "Other supporting file"); };
const rqAllFiles = r => [...new Set([...(r.by && r.by.files || []), ...r.docs, ...(r.odocs || []).map(d => d.name)])];
function rqAiDoc(r, form) {
  const c = rqCls(r), lin = lineage(r.act), by = r.by || {}, I = r.intake || {}, ct = I.contact || {}, n = x => fmt(Number(x) || 0), files = rqAllFiles(r), reqf = files.filter(f => RQ_FKIND[0][0].test(f));
  const lines = r.items.map((it, i) => `${i + 1}. ${nmStr(it.name) || "—"} · ${rqMoneyName(it.money)} · ${n(it.qty)} ${nmStr(it.unitName)} × ${n(it.price)} = ${n(itemTotal(it))} บาท (${lineStd(it) ? (pKind(lineStd(it)) === "std" ? "ราคามาตรฐาน " : "ราคานอกมาตรฐาน ") + lineStd(it).id : "ยังไม่เลือกรายการจากทะเบียนราคากลาง"})${lineNb(it) ? ` + เงินนอกงบประมาณ ${n(lineNb(it))} บาท` : ""}`).join("\n");
  const inds = [rInds(r)].map(a => a.map((x, i) => `${i + 1}) ${nmStr(x.name)} (${(IND_TYPES[x.type] ? IND_TYPES[x.type][0] : "-")}) เป้าหมายรวม ${n((x.q || []).reduce((a, b) => a + (Number(b) || 0), 0))} ${x.unit || ""}`)).flat().join("\n");
  const q = r.qplan ? r.qplan.map((v, i) => `ไตรมาส ${i + 1}: ${n(v)}`).join(" · ") : "ยังไม่ได้จัดทำแผนรายไตรมาส";
  const sub = `ขอตั้งงบประมาณรายจ่าย ปีงบประมาณ ${FORM_FY}: ${nmStr(r.name)}`, asker = by.mode === "other" ? `${by.agency || "หน่วยงานภายนอก"} (ผ่าน${unitName(r.unit)})` : unitName(r.unit);
  const head = form === "letter" ? [`ที่ ........./...........`, `${unitName(r.unit)}`, `วันที่ ${fdate(TODAY)}`, `เรื่อง ${sub}`, `เรียน ผู้อำนวยการกองแผนงาน`, reqf.length ? `อ้างถึง ${reqf.join(", ")}` : "", `สิ่งที่ส่งมาด้วย ${files.length ? files.map((f, i) => `${i + 1}) ${f}`).join(" ") : "-"}`]
    : [`บันทึกข้อความ`, `ส่วนราชการ ${unitName(r.unit)}`, `ที่ ........./...........   วันที่ ${fdate(TODAY)}`, `เรื่อง ${sub}`, `เรียน ผู้อำนวยการกองแผนงาน`, reqf.length ? `อ้างถึง ${reqf.join(", ")}` : "", files.length ? `สิ่งที่ส่งมาด้วย ${files.map((f, i) => `${i + 1}) ${f}`).join(" ")}` : ""];
  return [...head.filter(Boolean),
    `ด้วย ${asker} มีความประสงค์ขอตั้งงบประมาณสำหรับ "${nmStr(r.name)}" ภายใต้ ${lin.map(x => tx(x.name)).join(" › ") || "(ยังไม่เลือกแผนงาน/ผลผลิต/กิจกรรม)"}${c.c1code ? ` หมวด ${c.c1code}${c.c2code ? "/" + c.c2code : ""}` : ""} ลักษณะ${rqNature(r) === "inv" ? "งบลงทุน" : "รายจ่ายประจำ"}${by.mode === "other" && by.detail ? ` (${by.detail})` : ""}`,
    `เหตุผลความจำเป็น: ${tx(r.reason).trim() || "(ยังไม่ได้กรอก)"}`, `ตัวชี้วัด/เป้าหมาย:\n${inds || tx(r.kpi).trim() || "(ยังไม่ได้กรอก)"}`,
    `รายการงบประมาณ:\n${lines}`, `รวมเงินงบประมาณ ${n(reqAmount(r))} บาท เงินนอกงบประมาณ ${n(reqNb(r))} บาท รวมทั้งสิ้น ${n(reqAll(r))} บาท`, `แผนการใช้เงิน: ${q}`,
    r.multi && r.commit ? `ภาระผูกพัน: ปี ${r.commit.startY || "-"} ระยะเวลา ${r.commit.period || "-"} ปี วงเงินงบประมาณ ${n(r.commit.budget)} บาท` : "", r.mtef ? `ประมาณการรายจ่ายล่วงหน้า (MTEF): ${Object.keys(r.mtef).filter(y => /^\d{4}$/.test(y)).map(y => `${y}: ${n(r.mtef[y])}`).join(" · ")}` : "",
    files.length ? `เอกสารที่ใช้ประกอบการพิจารณา ${files.length} ไฟล์:\n${files.map((f, i) => `${i + 1}. ${f} (${rqFileKind(f)})`).join("\n")}` : "", `ผู้ประสานงาน: ${ct.name || "-"} ${ct.phone || ""}`,
    `จึงเรียนมาเพื่อโปรดพิจารณา`, form === "letter" ? `ขอแสดงความนับถือ\n\n(................................)\nตำแหน่ง ผู้อำนวยการ${unitName(r.unit)}` : `(................................)\nตำแหน่ง ผู้อำนวยการ${unitName(r.unit)}`,
    `(ร่างโดย AI จำลองจากรายละเอียดคำขอและชื่อไฟล์ที่แนบ ${files.length} ไฟล์ ผู้จัดทำต้องตรวจทานก่อนส่ง)`].filter(Boolean).join("\n\n");
}
const RQ_SAMPLE = `บันทึกข้อความ\nส่วนราชการ  (ชื่อสำนัก/กอง)  โทร.\nที่  ........./...........          วันที่  (วัน เดือน ปี)\nเรื่อง  ขอตั้งงบประมาณรายจ่าย ปีงบประมาณ ....\nเรียน  ผู้อำนวยการกองแผนงาน\n\n(อ้างถึง ... ถ้ามี)  (สิ่งที่ส่งมาด้วย ... ถ้ามี)\n\n   ด้วย (หน่วยงาน) มีความประสงค์ขอตั้งงบประมาณสำหรับ (ชื่อรายการ) ... เหตุผลความจำเป็น ... วงเงิน ... บาท ... ตัวชี้วัด/เป้าหมาย ...\n   จึงเรียนมาเพื่อโปรดพิจารณา\n\n                    (ลงชื่อ)\n                    (ตำแหน่ง)`;
function rqAiPanel(r, ed) {
  const files = rqAllFiles(r), form = r.draftForm || (r.by && r.by.mode === "other" ? "letter" : "memo");
  return rqSec("rf-ai", 3, L("AI ช่วยร่างเอกสารคำขอ", "AI drafts the request document"), r.draftDoc ? tag(L("มีร่างแล้ว", "Draft ready"), "p-ok") : "",
    `<div class="body" style="display:flex;flex-direction:column;gap:8px"><span class="sub">${L("ร่างหนังสือขอตามรูปแบบหนังสือราชการ จากรายละเอียดคำขอและเอกสารทุกไฟล์ที่แนบในข้อ 2 (ใช้แบบฟอร์มสำเร็จรูปจำลอง ไม่ได้เรียกโมเดลภาษา และอ่านเฉพาะชื่อไฟล์) ผู้จัดทำตรวจทานและแก้ไขก่อนส่ง", "Drafts the request letter in the shape of an official document from the request details and every file attached in section 2 (a simulated fixed template, no language model, and it reads file names only); the requester reviews and edits it")}</span>
      <div class="row"><span class="sub">${L("เอกสารที่ AI ใช้วิเคราะห์", "Files the AI uses")}:</span>${files.map(f => tag(`${esc(f)} · ${rqFileKind(f)}`, "p-mute")).join("") || `<span class="sub">${L("ยังไม่มีไฟล์แนบ (ใช้เฉพาะรายละเอียดคำขอ)", "No attached file (request details only)")}</span>`}</div>
      <details><summary class="sub" style="cursor:pointer">${L("ตัวอย่างรูปแบบหนังสือราชการ (บันทึกข้อความขอตั้งงบประมาณ)", "Sample of the official format (a memorandum asking for a budget)")}</summary><pre id="rf-sample" style="white-space:pre-wrap;margin:6px 0 0">${esc(RQ_SAMPLE)}</pre><span class="hint">${L("รูปแบบตามระเบียบสำนักนายกรัฐมนตรีว่าด้วยงานสารบรรณ ที่ผมเขียนจากที่ทราบ ไม่ได้ค้นเอกสารจากภายนอก ปรับให้ตรงกับแบบของหน่วยงานได้", "The usual format of the Prime Minister's Office rule on correspondence, written from what I know; nothing was looked up outside. Adjust it to your agency's own form")}</span></details>
      ${ed ? `<div class="row"><select id="rf-aiform" aria-label="${L("รูปแบบเอกสาร", "Form of the document")}">${Object.keys(RQ_LETTERS).map(k => `<option value="${k}" ${form === k ? "selected" : ""}>${tx(RQ_LETTERS[k])}</option>`).join("")}</select><button class="btn" type="button" id="rf-ai">${L("ร่างเอกสารคำขอด้วย AI", "Draft the request document with AI")}</button>${r.draftDoc ? `<button class="btn primary" type="button" id="rf-aisave">${L("บันทึกเป็นเอกสารแนบ", "Save as an attached document")}</button>` : ""}</div>` : ""}
      ${r.draftDoc ? `<textarea id="rf-aitext" rows="14" ${ed ? "" : "disabled"} class="ai-draft" aria-label="${L("ร่างเอกสารคำขอ", "Draft of the request document")}">${esc(r.draftDoc.text)}</textarea><span class="hint">${L("ร่างโดย AI เมื่อ", "Drafted by AI on")} ${fdate(r.draftDoc.date)}</span>` : ""}</div>`);
}
function rqSendPanel(r, ed) {
  if (!ed) return "";
  const c = checks(r), bad = c.filter(x => x.s === "no").length;
  return rqSec("rf-send", "", L("นำส่งกองแผนงาน", "Send to Planning"), bad ? tag(`${L("ขาด", "Missing")} ${bad}`, "p-bad") : tag(L("พร้อมส่ง", "Ready"), "p-ok"),
    `<div class="body row"><span class="sub">${L("เมื่อกดนำส่ง คำขอไปที่ผู้อำนวยการสำนัก/กองเห็นชอบ แล้วจึงถึงกองแผนงาน", "When sent, the request goes to the division director for approval, then to Planning")}</span><span class="sp"></span><button class="btn primary" type="button" id="rf-send">${L("นำส่งกองแผนงาน", "Send to Planning")}</button></div>`);
}

function rqMainRebuild(html, r) {
  const t = document.createElement("template"); t.innerHTML = html; const c = t.content, left = c.querySelector(".grid-form > div"); if (!left) return html;
  rqLineInit(r); const ed = editable(r), kids = [...left.children], by = id => kids.find(k => k.id === id), has = (k, s) => !!k.querySelector(s);
  const fund = by("rq-fund"), info = by("rq-info"), intake = by("rq-intake"), area = by("rq-area"), em = by("rq-em"), reason = kids.find(k => has(k, "#reason")), lines = kids.find(k => has(k, "#items"));
  const used = new Set([fund, info, intake, area, em, reason, lines].filter(Boolean)), rest = kids.filter(k => !used.has(k));
  if (info) { [...info.querySelectorAll(".f")].forEach(f => { if (f.querySelector('[id^="rq-m-"]') || f.querySelector("#rq-off-add") || /rq-off-t-|rq-off-a-/.test(f.innerHTML)) f.remove(); }); const h = info.querySelector("h2"); if (h) h.textContent = "4. " + h.textContent; }
  const nm = c.querySelector("#rname"); if (nm) { const h1 = document.createElement("h1"); h1.textContent = nmStr(r.name); nm.replaceWith(h1); }
  const seq = [fund, rqEl(rqNamePanel(r, ed)), rqEl(rqByPanel(r, ed)), rqEl(rqAiPanel(r, ed)), intake, info, area, rqEl(rqRegPanel(r, ed)), rqEl(rqLinesPanel(r, ed)), rqEl(rqSumPanel(r)), rqEl(rqRefsPanel(r, ed)), reason, ...rest, ed ? rqEl(rqSendPanel(r, ed)) : null].filter(Boolean);
  left.innerHTML = ""; seq.forEach(e => left.appendChild(e));
  return t.innerHTML;
}
{
  const base = VIEWS.request;
  VIEWS.request = () => { const r0 = curReq(); if (r0 && editable(r0)) { rqLineInit(r0); rqPriceSync(r0); } let html = base(); const r = curReq(); if (!r || REQ_TAB !== "main") return html; html = rqMainRebuild(html, r); return html.replace(L("ส่งให้ ผอ.กองเห็นชอบ", "Send to the division director"), L("นำส่งกองแผนงาน", "Send to Planning")); };
}
// the old line table is not on the page any more: its redraw helpers fall back to drawing the page again
{
  const ri = renderItems, rt = renderTotals;
  renderItems = function () { if ($("#items")) return ri.apply(this, arguments); route(); };
  renderTotals = function () { if ($("#tot")) return rt.apply(this, arguments); const r = curReq(); r.amount = reqAmount(r); renderChecks(); };
}

// ---------- binding ----------
function rqFormBind(r) {
  const ed = editable(r), g = id => document.querySelector(id), re = () => { r.amount = reqAmount(r); rqSyncOffs(r); save(); route(); };
  const pushDoc = name => { r.by.files.push(name); if (!r.docs.includes(name)) r.docs.push(name); audit(["แนบเอกสาร", "Attached a document"], `${r.id}: ${name}`); };
  if (!ed) return;
  // 2. who asked, and the files
  $$("[name=by-mode]").forEach(x => (x.onchange = () => { r.by.mode = x.value; save(); route(); }));
  [["#by-ag", "agency"], ["#by-kd", "kind"], ["#by-rs", "detail"]].forEach(([id, f]) => { const el = g(id); if (el) el.onchange = () => { r.by[f] = el.value; save(); route(); }; });
  const bd = g("#by-doc"), bf = g("#by-file"); if (bd && bf) { bd.onclick = () => bf.click(); bf.onchange = async () => { const fs = [...bf.files]; if (!fs.length) return; fs.forEach(f => pushDoc(f.name)); try { await rqKeepText(r, fs); } catch (e) { /* unreadable: kept by name */ } save(); route(); toast(`${L("แนบไฟล์แล้ว", "Files attached")} ${fs.length}`); }; }
  $$("[data-byfdel]").forEach(b => (b.onclick = () => { const nm = r.by.files.splice(Number(b.dataset.byfdel), 1)[0]; r.docs = r.docs.filter(d => d !== nm); if (r.docText) delete r.docText[nm]; audit(["ลบเอกสารแนบ", "Removed an attached document"], `${r.id}: ${nm}`); save(); route(); }));
  // 5. lines
  const root = g("#rf-lines");
  if (root) {
    root.onchange = e => {
      const el = e.target;
      if (el.dataset.ln !== undefined) {
        const it = r.items[Number(el.dataset.ln)], f = el.dataset.f;
        if (f === "name") { const v = el.value.trim(); it.name = [v, v]; }
        else if (f === "qty") it.qty = Math.max(0, Number(el.value) || 0); else it[f] = el.value;
        re(); return;
      }
      if (el.dataset.nb) { const [i, j] = el.dataset.nb.split("|"), x = r.items[Number(i)].nb[Number(j)], f = el.dataset.f; x[f] = f === "amt" ? Math.max(0, Number(el.value) || 0) : el.value; re(); }
    };
    root.onclick = e => {
      const b = e.target.closest("button"); if (!b) return;
            if (b.id === "ln-add") { const p = r.rp && S.prices.find(x => x.id === r.rp); if (!p) return; const it = { qty: 1, money: "base", nb: [], inds: [], name: ["", ""] }; rqPick(it, p); it.name = ["", ""]; const f = r.items.find(x => x.sp === p.id && pKind(p) === "ns"); if (f) it.price = f.price; r.items.push(it); re(); return; }
      if (b.dataset.lndel !== undefined) { r.items.splice(Number(b.dataset.lndel), 1); re(); return; }
      if (b.dataset.nbadd !== undefined) { r.items[Number(b.dataset.nbadd)].nb.push({ type: (rqMoneyTypes("off")[0] || {}).id || "", amt: 0, note: "" }); re(); return; }
      if (b.dataset.nbdel) { const [i, j] = b.dataset.nbdel.split("|"); r.items[Number(i)].nb.splice(Number(j), 1); re(); }
    };
  }
  // 5. the register: one item, chosen in a pop-up
  const rpz = g("#rg-price"); if (rpz) rpz.onchange = () => { const p = r.rp && S.prices.find(x => x.id === r.rp); if (!p || pKind(p) !== "ns") return; const v = Math.max(0, Number(rpz.value) || 0); r.items.forEach(x => { x.price = v; delete x.own; }); audit(["แก้ราคาต่อหน่วยนอกมาตรฐานของคำขอ", "Edited the unit price outside the standard"], `${r.id} ${p.id}`); re(); };
  const ro = g("#rg-open"); if (ro) ro.onclick = () => rgPopup(r, p => { rqChoose(r, p); audit(["เลือกรายการจากทะเบียนราคากลาง", "Chose an item of the price register"], `${r.id} ${p.id}`); re(); });
  // 7. references
  const rr = g("#rf-refs");
  if (rr) {
    rr.onchange = e => { const el = e.target; if (el.dataset.rf === undefined) return; const x = r.refs[Number(el.dataset.rf)], f = el.dataset.f; if (f === "sp") { x.sp = el.value; const p = S.prices.find(y => y.id === el.value); if (p) { x.name = tx(p.name); if (!x.amt) x.amt = p.price; } } else if (f === "amt") x.amt = Math.max(0, Number(el.value) || 0); else x[f] = el.value; save(); route(); };
    rr.onclick = e => {
      const b = e.target.closest("button"); if (!b) return;
      if (b.id === "rf-add") { r.refs.push({ sp: "", name: "", amt: 0, note: "" }); save(); route(); return; }
      if (b.id === "rf-auto") { r.refs = r.items.map(it => ({ sp: it.sp || "", name: nmStr(it.name), amt: lineAll(it), note: it.pm === "ns" ? "ราคานอกมาตรฐาน" : "" })); audit(["สร้างรายการอ้างอิงจากรายการเงินงบประมาณ", "Built the references from the budget lines"], r.id); save(); route(); return; }
      if (b.id === "rf-bal") { const last = r.refs[r.refs.length - 1]; last.amt = Math.max(0, Number(last.amt) + reqAll(r) - refSum(r)); save(); route(); return; }
      if (b.dataset.rfdel !== undefined) { r.refs.splice(Number(b.dataset.rfdel), 1); save(); route(); }
    };
  }
  // 3. AI draft
  const fm = g("#rf-aiform"); if (fm) fm.onchange = () => { r.draftForm = fm.value; save(); };
  const ai = g("#rf-ai"); if (ai) ai.onclick = () => {
    if (typeof agentOn === "function" && !agentOn("AG-01")) { toast(L("Budget Preparation Agent ถูกปิดใช้งานใน M09", "The Budget Preparation Agent is switched off in M09")); return; }
    const form = (g("#rf-aiform") || {}).value || "memo"; r.draftForm = form;
    r.draftDoc = { text: rqAiDoc(r, form), date: TODAY, by: me().id }; S.aiLog.unshift({ t: nowIso(), agent: "AG-01", user: me().id, action: ["ร่างเอกสารคำขอ", "Drafted the request document"], target: r.id, sources: rqAllFiles(r).length + 3, ok: true }); audit(["AI ร่างเอกสารคำขอ", "AI drafted the request document"], r.id); save(); route();
  };
  const ax = g("#rf-aitext"); if (ax) ax.oninput = () => { r.draftDoc.text = ax.value; save(); };
  const sv = g("#rf-aisave"); if (sv) sv.onclick = () => { const nm = `ร่างเอกสารคำขอ_${r.id}.docx`; if (!r.docs.includes(nm)) r.docs.push(nm); audit(["บันทึกร่างเอกสารคำขอเป็นเอกสารแนบ", "Saved the draft request document as an attachment"], r.id); save(); route(); toast(L("บันทึกเป็นเอกสารแนบแล้ว", "Saved as an attached document")); };
  // send
  const sd = g("#rf-send"); if (sd) sd.onclick = () => { const s = g("#submit"); if (s) s.click(); };
}
{
  const bb = BIND.request;
  BIND.request = () => { bb(); const r = curReq(); if (r && REQ_TAB === "main") rqFormBind(r); };
}


// ---------- tabs: money plan, work plan (investment) ----------
const rqIsInv = r => rqNature(r) === "inv";
const wpBad = r => (r.wplan || []).filter(x => x.start && x.end && x.end < x.start).length;
{
  const base = reqTabsBar;
  reqTabsBar = function (r) {
    const want = REQ_TAB, html0 = base(r); if (want === "workplan") REQ_TAB = "workplan";
    let html = html0.split(L("แผนรายไตรมาส", "Quarterly plan")).join(L("แผนเงิน (เดือน ไตรมาส ปี)", "Money plan (month, quarter, year)"));
    { const warn = rqIsInv(r) && (!(r.wplan || []).length || wpBad(r)); html = html.replace(/(<button[^>]*data-rtab="mtef")/, `<button type="button" role="tab" aria-selected="${REQ_TAB === "workplan"}" class="rstep x ${REQ_TAB === "workplan" ? "on" : ""} ${warn ? "s-warn" : "s-ok"}" data-rtab="workplan"><span>${L("แผนดำเนินงาน", "Work plan")}${warn ? " ⚠" : ""}</span></button>$1`); }
    return html;
  };
}
{
  const base = REQ_PANELS.plan;
  REQ_PANELS.plan = (r, ed) => base(r, ed) + rqYearPanel(r);
}
function rqYearPanel(r) {
  const tot = reqAmount(r), q = qSum(r), m = r.mplan ? r.mplan.reduce((a, b) => a + (Number(b) || 0), 0) : 0, ys = r.multi && r.years ? Object.keys(r.years).sort() : [String(FORM_FY)], mt = r.mtef ? mtefYears() : [];
  const flag = v => (Math.abs(v - tot) < 1 ? tag(L("ตรงกับยอดที่ขอ", "Matches the request"), "p-ok") : v ? tag(`${L("ต่าง", "Off by")} ${fmt(tot - v)}`, "p-warn") : tag(L("ยังไม่กรอก", "Not filled"), "p-mute"));
  return `<section class="panel" id="rq-year"><header><h2>${L("แผนเงินรายปี และการเทียบกับแผนรายเดือน/รายไตรมาส", "Money plan by year, checked against the monthly and quarterly plans")}</h2></header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("แผน", "Plan")}</th><th class="n">${L("รวม (บาท)", "Total (baht)")}</th><th>${L("เทียบกับยอดที่ขอปีนี้", "Against this year's amount")}</th></tr></thead><tbody>
      <tr><td>${L("รายเดือน (12 เดือน)", "Monthly (12 months)")}</td><td class="n">${fmt(m)}</td><td>${flag(m)}</td></tr><tr><td>${L("รายไตรมาส (4 ไตรมาส)", "Quarterly (4 quarters)")}</td><td class="n">${fmt(q)}</td><td>${flag(q)}</td></tr>
      ${ys.map(y => `<tr><td>${L("รายปี", "Year")} ${y} ${y === String(FORM_FY) ? `<span class="sub">${L("ปีที่ขอ", "request year")}</span>` : `<span class="sub">${L("ผูกพัน", "commitment")}</span>`}</td><td class="n">${fmt(r.multi && r.years ? Number(r.years[y] || 0) : tot)}</td><td>${y === String(FORM_FY) ? flag(r.multi && r.years ? Number(r.years[y] || 0) : tot) : ""}</td></tr>`).join("")}
      ${mt.map(y => `<tr><td>${L("ประมาณการล่วงหน้า (MTEF)", "Forward estimate (MTEF)")} ${y}</td><td class="n">${fmt(Number(r.mtef[y] || 0))}</td><td></td></tr>`).join("")}</tbody></table></div></section>`;
}
REQ_BIND.workplan = r => wpBind(r);
REQ_PANELS.workplan = (r, ed) => {
  const W = r.wplan || [], ds = ed ? "" : "disabled", fy = (S.fyList || []).find(x => x.fy === FORM_FY) || {}, out = x => fy.start && ((x.start && x.start < fy.start) || (x.end && x.end > fy.end));
  return `<section class="panel"><header><h2>${L("แผนดำเนินงานของงบลงทุน", "Work plan of the investment")}</h2><span class="sp"></span>${W.length && !wpBad(r) ? tag(L("ครบ", "Complete"), "p-ok") : tag(L("ยังไม่ครบ", "Incomplete"), "p-warn")}</header>
    <div class="body sub">${L("ขั้นตอนดำเนินงานของรายการลงทุน พร้อมวันเริ่มและวันสิ้นสุด ใช้เป็นแผนดำเนินงานประกอบคำขอ", "The steps of the investment with start and end dates, as the work plan attached to the request")}${fy.start ? ` · ${L("ปีงบประมาณ", "FY")} ${FORM_FY}: ${fdate(fy.start)} – ${fdate(fy.end)}` : ""}</div>
    <div class="tbl-wrap"><table><thead><tr><th>#</th><th>${L("ขั้นตอน", "Step")}</th><th>${L("เริ่ม", "Start")}</th><th>${L("สิ้นสุด", "End")}</th><th>${L("ผู้รับผิดชอบ", "Owner")}</th><th>${L("หมายเหตุ", "Note")}</th><th></th></tr></thead>
      <tbody>${W.map((x, i) => `<tr><td class="n">${i + 1}</td><td><input type="text" data-wp="${i}" data-f="step" value="${esc(x.step || "")}" ${ds}></td><td><input type="date" data-wp="${i}" data-f="start" value="${x.start || ""}" ${ds}></td><td><input type="date" data-wp="${i}" data-f="end" value="${x.end || ""}" ${ds}>${x.start && x.end && x.end < x.start ? `<div class="sub" style="color:var(--bad)">${L("สิ้นสุดก่อนวันเริ่ม", "Ends before it starts")}</div>` : out(x) ? `<div class="sub" style="color:var(--warn)">${L("อยู่นอกปีงบประมาณ", "Outside the fiscal year")}</div>` : ""}</td>
        <td><input type="text" data-wp="${i}" data-f="owner" value="${esc(x.owner || "")}" ${ds}></td><td><input type="text" data-wp="${i}" data-f="note" value="${esc(x.note || "")}" ${ds}></td><td>${ed ? `<button class="btn ghost danger" type="button" data-wpdel="${i}" aria-label="${L("ลบ", "Remove")}" style="padding:4px 8px">×</button>` : ""}</td></tr>`).join("") || `<tr><td colspan="7" class="sub">${L("ยังไม่มีขั้นตอน", "No steps yet")}</td></tr>`}</tbody></table></div>
    ${ed ? `<div class="body row"><button class="btn" type="button" id="wp-add">+ ${L("เพิ่มขั้นตอน", "Add a step")}</button><button class="btn" type="button" id="wp-std">${L("ใส่ขั้นตอนมาตรฐาน", "Fill the standard steps")}</button></div>` : ""}</section>`;
};
function wpBind(r) {
  const re = () => { save(); route(); }, W = () => (r.wplan = r.wplan || []);
  $$("[data-wp]").forEach(el => (el.onchange = () => { W()[Number(el.dataset.wp)][el.dataset.f] = el.value; re(); }));
  $$("[data-wpdel]").forEach(b => (b.onclick = () => { W().splice(Number(b.dataset.wpdel), 1); re(); }));
  const a = $("#wp-add"); if (a) a.onclick = () => { W().push({ step: "", start: "", end: "", owner: "", note: "" }); re(); };
  const s = $("#wp-std"); if (s) s.onclick = () => { const fy = (S.fyList || []).find(x => x.fy === FORM_FY) || {}; r.wplan = rqWDefault(fy.start || `${FORM_FY - 544}-10-01`); audit(["ใส่ขั้นตอนแผนดำเนินงานมาตรฐาน", "Filled the standard work-plan steps"], r.id); re(); };
}

// ---------- checks ----------
{
  const base = checks;
  checks = function (r) {
    const out = base(r); rqLineInit(r);
    const bad = r.items.filter(i => (i.nb || []).some(x => !x.type || !(Number(x.amt) > 0))).length;
    out.push({ s: bad ? "no" : "ok", title: L("เงินนอกงบประมาณของรายการ", "Non-budget money of the lines"), d: bad ? `${bad} ${L("รายการมีเงินนอกงบประมาณที่ยังไม่ระบุประเภทหรือจำนวนเงิน", "lines have non-budget money without a kind or an amount")}` : `${fmt(reqNb(r))} ${L("บาท", "baht")}`, step: "main" });
    const nsel = r.items.filter(i => !lineStd(i)).length, odd = r.rp ? r.items.filter(i => i.sp && i.sp !== r.rp).length : 0, nsl = r.items.filter(i => lineStd(i) && pKind(lineStd(i)) === "ns").length;
    out.push({ s: !r.rp || nsel ? "no" : odd ? "wa" : "ok", title: L("รายการจากทะเบียนราคากลาง", "Items from the price register"), d: !r.rp ? L("ยังไม่ได้เลือกรายการจากทะเบียนราคากลาง (เลือกได้ 1 รายการต่อคำขอ)", "No item of the price register chosen (one item per request)") : odd ? `${odd} ${L("บรรทัดยังใช้รายการอื่น ให้เลือกรายการอีกครั้งเพื่อใช้รายการเดียว", "lines still use another item; choose again to use one")}` : nsel ? `${nsel} ${L("รายการยังไม่ได้เลือกรายการจากทะเบียนราคากลาง", "lines have no item from the price register")}` : `${r.items.length - nsl}/${r.items.length} ${L("รายการใช้ราคามาตรฐาน", "lines at the standard price")}${nsl ? ` · ${nsl} ${L("รายการราคานอกมาตรฐาน", "outside the standard")}` : ""}`, step: "main" });
    const refs = r.refs || [], tgt = reqAll(r), d = tgt - refSum(r);
    out.push({ s: !refs.length ? "wa" : Math.abs(d) < 1 ? "ok" : "no", title: L("รายการอ้างอิงราคากลาง", "Reference prices"), d: !refs.length ? L("ยังไม่มีรายการอ้างอิง", "No reference yet") : Math.abs(d) < 1 ? L("ผลรวมเท่ากับเงินงบประมาณ + เงินนอกงบประมาณ", "Total equals budget plus non-budget money") : `${L("ผลรวมต่างจากงบ + นอกงบ", "Total differs from budget + non-budget by")} ${fmt(d)}`, step: "main" });
    const b = r.by || {}, doc = (b.files || []).length > 0;
    if (b.mode === "other") out.push({ s: b.agency && doc ? "ok" : "no", title: L("หน่วยงานที่ขอและเอกสารคำขอ", "Asking agency and its request document"), d: b.agency && doc ? esc(b.agency) : L("ต้องระบุชื่อหน่วยงานที่ขอและแนบเอกสารคำขอ", "Name the agency and attach its request document"), step: "main" });
    if (rqIsInv(r)) out.push({ s: wpBad(r) ? "no" : (r.wplan || []).length ? "ok" : "wa", title: L("แผนดำเนินงาน (งบลงทุน)", "Work plan (investment)"), d: wpBad(r) ? L("มีขั้นตอนที่สิ้นสุดก่อนวันเริ่ม", "A step ends before it starts") : (r.wplan || []).length ? `${r.wplan.length} ${L("ขั้นตอน", "steps")}` : L("งบลงทุน ยังไม่มีแผนดำเนินงาน", "Investment: no work plan yet"), step: "workplan" });
    for (let i = out.length - 1; i >= 0; i--) if (out[i].step === "docs") out.splice(i, 1);
    return out;
  };
}
{
  const base = cnCheck;
  cnCheck = function (r) {
    const c = base(r); rqLineInit(r);
    c.push({ ok: r.items.every(i => i.money && (i.nb || []).every(x => x.type && Number(x.amt) > 0)), label: L("ทุกรายการระบุประเภทเงินครบ", "Every line has a kind of money"), block: true });
    c.push({ ok: !(r.refs || []).length || Math.abs(reqAll(r) - refSum(r)) < 1, label: L("รายการอ้างอิงราคากลางรวมเท่ากับงบ + นอกงบ", "Reference prices add up to budget plus non-budget money"), block: true });
    c.push({ ok: !!r.rp && r.items.every(i => !!lineStd(i)), label: L("ทุกรายการเลือกจากทะเบียนราคากลาง", "Every line is an item of the price register"), block: true });
    return c;
  };
}

// ---------- Planning: status and spending plan of the units' non-budget money (BQ13) ----------
const nbReqByUnit = () => { const m = {}; S.requests.filter(r => !["rejected", "cancelled"].includes(r.status)).forEach(r => { const v = m[r.unit] || (m[r.unit] = { n: 0, amt: 0, byType: {} }); r.items.forEach(i => (i.nb || []).forEach(x => { v.n++; v.amt += Number(x.amt) || 0; v.byType[x.type] = (v.byType[x.type] || 0) + (Number(x.amt) || 0); })); }); return m; };
const nbEstByUnit = () => { const m = {}; (S.revEst || []).filter(x => x.kind === "nonbudget" && x.fy === FORM_FY).forEach(x => (m[x.unit] = (m[x.unit] || 0) + Number(x.amount || 0))); return m; };
function nbStatusBody() {
  const req = nbReqByUnit(), units = Object.keys(req).filter(u => !unitRole() || u === me().unit);
  const funds = typeof nbFunds === "function" ? nbFunds() : [], tReq = sumv(units.map(u => (req[u] || { amt: 0 }).amt));
  const fundRows = funds.map(f => { const b = typeof nbBal === "function" ? nbBal(f) : null, p = typeof nbPlan === "function" ? nbPlan(f.id) : null, planAmt = p ? sumv(p.lines.map(l => l.amount)) : 0, used = p ? sumv(p.lines.map(l => nbUsed(f.id, l.id))) : 0; return { f, b, p, planAmt, used }; });
  return `  ${eKpis([[L("เงินนอกงบประมาณที่ขอใช้ในคำขอ", "Asked in requests"), fmt(tReq)], [L("กองทุนเงินนอกงบฯ", "Funds"), String(fundRows.length)]])}
  <section class="panel"><header><h2>${L("เงินนอกงบประมาณที่ขอใช้ในคำขอ แยกรายหน่วยงาน", "Non-budget money asked in the requests, by unit")}</h2></header><div class="tbl-wrap"><table><thead><tr><th>${L("สำนัก/กอง", "Division")}</th><th class="n">${L("รายการในคำขอ", "Lines in requests")}</th><th class="n">${L("ขอใช้ (บาท)", "Asked (baht)")}</th><th>${L("แยกตามประเภทเงิน", "By kind")}</th></tr></thead>
    <tbody>${units.map(u => { const v = req[u] || { n: 0, amt: 0, byType: {} }; return `<tr><td>${esc(unitName(u))}</td><td class="n">${v.n}</td><td class="n">${fmt(v.amt)}</td><td class="sub">${Object.keys(v.byType).map(k => `${esc(rqMoneyName(k))} ${fmt(v.byType[k])}`).join(" · ") || "—"}</td></tr>`; }).join("") || `<tr><td colspan="4" class="sub">${L("ยังไม่มีเงินนอกงบประมาณ", "No non-budget money yet")}</td></tr>`}</tbody><tfoot><tr><td colspan="2">${L("รวม", "Total")}</td><td class="n">${fmt(tReq)}</td><td></td></tr></tfoot></table></div></section>
  <section class="panel"><header><h2>${L("สถานะเงินและแผนการใช้จ่ายของกองทุน (จากระบบการเงิน)", "Status and spending plan of the funds (from the finance module)")}</h2></header>${fundRows.length ? `<div class="tbl-wrap"><table><thead><tr><th>${L("กองทุน / เงิน", "Fund")}</th><th>${L("ที่มาและฐานการเก็บไว้ใช้", "Source and basis")}</th><th class="n">${L("คงเหลือฝากคลัง", "At the treasury")}</th><th class="n">${L("คงเหลือในบัญชี", "In the account")}</th><th class="n">${L("รับในปี", "Received")}</th><th class="n">${L("จ่ายแล้ว", "Paid")}</th><th>${L("แผนการใช้จ่ายปีนี้", "Spending plan")}</th><th class="n">${L("แผน (บาท)", "Plan")}</th><th class="n">${L("ใช้ไป", "Used")}</th><th class="n">${L("คงเหลือตามแผน", "Left in plan")}</th></tr></thead>
    <tbody>${fundRows.map(x => `<tr><td><b>${esc(x.f.id)}</b><div class="sub">${esc(tx(x.f.name))}</div></td><td class="sub">${esc(tx(x.f.basis))}</td><td class="n">${x.b ? fmt(x.b.treasury) : "—"}</td><td class="n">${x.b ? fmt(x.b.agency) : "—"}</td><td class="n">${x.b ? fmt(x.b.income) : "—"}</td><td class="n">${x.b ? fmt(x.b.spent) : "—"}</td><td>${x.p ? tag(tx(NBP_ST[x.p.status][0]), NBP_ST[x.p.status][1]) : tag(L("ไม่มีแผน", "No plan"), "p-bad")}${x.p ? `<div class="sub">${x.p.lines.map(l => `${esc(tx(l.name))} ${fmt(l.amount)}`).join("<br>")}</div>` : ""}</td><td class="n">${fmt(x.planAmt)}</td><td class="n">${fmt(x.used)}</td><td class="n">${fmt(x.planAmt - x.used)}</td></tr>`).join("")}</tbody></table></div>` : `<div class="body sub">${L("ยังไม่มีกองทุนเงินนอกงบประมาณในระบบการเงิน", "No non-budget fund in the finance module yet")}</div>`}
    <div class="body sub">${L("เงินนอกงบประมาณใช้จ่ายได้เมื่อมีแผนการใช้จ่ายที่ผู้บริหารอนุมัติ (R-FN-07) เงินที่ถอนจากบัญชีฝากคลังต้องจ่ายหรือฝากคืนภายใน 15 วันทำการ รายละเอียดของกองทุนอยู่ในระบบการเงิน (ต้นแบบนี้ไม่ได้ค้นข้อมูลระเบียบจากภายนอก)", "Non-budget money may be spent only from a spending plan the executive approved (R-FN-07); money withdrawn from the treasury deposit must be paid out or deposited back within 15 working days. The fund details sit in the finance module (the prototype looked up no regulation from outside)")}</div></section>`;
}
