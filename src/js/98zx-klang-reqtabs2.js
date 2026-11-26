// KlangFinance, round P11 (15 Nov 2569): the tabs of the division request, the NBUD form and the budget hearing flow.
//  - Tab "ตัวชี้วัด" (indicators): every LINE of the request has its own indicators (not one set for the whole request): name, kind (quantitative,
//    qualitative, time, cost), unit (the unit list follows the kind), targets for quarters 1 to 4 and the total. The kinds and the unit groups are the
//    ones of the file ประเภทตัวชี้วัดเชื่อมหน่วยนับ.xlsx ("ร้อยละ" is added by me to the quantitative units). The KPI registers of the strategy and of the
//    agency outcomes use the same kind and unit lists.
//  - Tab "ความสอดคล้อง": the alignment with the national plans moved here from the main tab.
//  - Tab "รายละเอียดรายการผูกพัน": only for a multi-year request (three states: new, section 41/42, under contract) as in the screens given.
//  - Tab MTEF: one row for each line, for 3, 5, 10, 15 or 20 forward years, with quantity and amount of the budget money and of the non-budget money
//    that joins the line. Saving writes the yearly totals to r.mtef (what the older checks read).
//  - The "documents" tab is gone (files are attached in section 2 of the main tab) and its checks are no longer asked.
//  - The tab "Units' non-budget funds" of the consolidation page holds the NBUD form of the DEPARTMENT (one form, not by unit; from the file NBUD.xlsx) that Planning keys in,
//    above the status of the units and funds (the page BQ13 and its menu entry are gone). The form's figures are shown as in the file (the sample's numbers look like baht although its heading says million baht).
//  - Budget hearing: a flow with six steps, reschedule or cancel, files on the unit's answers, the minutes with an outcome for each request, and the
//    unit sees the outcome (and what to adjust).
// Assumptions of mine, marked as samples: the lists of necessity, main kinds of spending and status of the commitment; the sample indicators, commitments and NBUD data.

// ---------- indicator kinds and units ----------
const IND_TYPES = { quant: ["เชิงปริมาณ", "Quantitative"], qual: ["เชิงคุณภาพ", "Qualitative"], time: ["เชิงเวลา", "Time"], cost: ["เชิงต้นทุน", "Cost"] };
const IND_UNITS = { quant: ["ชิ้น", "หน่วย", "กิโลกรัม", "ลิตร", "ร้อยละ"], qual: ["คะแนน", "ระดับ", "ดัชนี"], time: ["วินาที", "นาที", "ชั่วโมง", "วัน", "เดือน", "ปี"], cost: ["บาท", "ดอลลาร์", "ยูโร", "หยวน"] };
const indAllUnits = () => [...new Set(Object.values(IND_UNITS).flat())];
const indTotal = x => { const q = (x.q || []).map(v => Number(v) || 0); return x.type === "qual" ? (q.filter(v => v > 0).length ? q.reduce((a, b) => a + b, 0) / q.filter(v => v > 0).length : 0) : q.reduce((a, b) => a + b, 0); };
// 16 Nov 2569, on the user's word: the indicators belong to the request itself (r.inds), one list for the whole request, not one list for each line
const rInds = r => (r.inds = Array.isArray(r.inds) ? r.inds : (r.items || []).flatMap(it => it.inds || []));
const indState = r => { const a = rInds(r); return !a.length ? "no" : a.some(x => !String(x.name || "").trim() || !x.type || !x.unit || (x.q || []).every(v => !(Number(v) > 0))) ? "wa" : "ok"; };

// the KPI registers (strategy KPIs and the agency outcome KPIs) take the same kind and unit lists
function indPatch(name) {
  const d = CRUD.defs[name]; if (!d || d.indPatched) return; d.indPatched = true; const f0 = d.fields, c0 = d.create.run, e0 = d.edit.run;
  d.fields = k => { const fs = f0(k), i = fs.findIndex(x => x.id === "unit"); if (i < 0) return fs; const cur = k ? k.unit[0] : "", kind = k && k.kind || "quant";
    fs.splice(i, 1, { id: "ikind", label: ["ประเภทตัวชี้วัด", "Kind of indicator"], type: "select", req: true, value: kind, opts: Object.keys(IND_TYPES).map(t => [t, tx(IND_TYPES[t])]) },
      { id: "unit", label: ["หน่วยนับ", "Unit of measure"], req: true, type: "select", value: cur, opts: [...indAllUnits(), ...(cur && !indAllUnits().includes(cur) ? [cur] : [])].map(u => [u, u]) }); return fs; };
  d.create.run = v => { const k = c0(v); if (k) k.kind = v.ikind || "quant"; return k; };
  d.edit.run = (k, v) => { e0(k, v); k.kind = v.ikind || k.kind || "quant"; };
  d.cols = [...d.cols.slice(0, 2), { h: ["ประเภท", "Kind"], c: k => `<span class="sub">${tx(IND_TYPES[k.kind || "quant"])}</span>` }, ...d.cols.slice(2)];
}
indPatch("stKpi"); indPatch("agOutK");

// ---------- seed: indicators of every line, the commitment details of a multi-year request, the NBUD forms ----------
const CM_NEED = [["ผลักดันนโยบายสำคัญของรัฐบาล", "Government priority"], ["เป็นไปตามข้อผูกพันสัญญา/ข้อตกลง", "Under a contract or agreement"], ["ต้องดำเนินการต่อเนื่องข้ามปีตามลักษณะงาน", "Work that runs across years"], ["อื่น ๆ", "Other"]];
const CM_SPEND = [["ค่าที่ดินและสิ่งก่อสร้าง", "Land and construction"], ["ค่าครุภัณฑ์", "Equipment"], ["ค่าจ้างที่ปรึกษา", "Consultants"], ["ค่าจ้างเหมาบริการ", "Contracted services"], ["เงินอุดหนุน", "Subsidies"], ["อื่น ๆ", "Other"]];
const CM_STATE = [["อยู่ระหว่างดำเนินการ", "In progress"], ["ยังไม่ลงนามในสัญญา", "Contract not yet signed"], ["ลงนามในสัญญาแล้ว", "Contract signed"], ["แล้วเสร็จ", "Completed"]];
const CM_ST = { new: ["ผูกพันใหม่", "New commitment"], m41: ["ผูกพัน ม.41/ ม.42", "Commitment under s.41/42"], contract: ["ผูกพันสัญญา", "Under contract"] };

const NB_COLS = [2567, 2568, 2569, 2570, 2571, 2572];
const NB_ROWS = [["1", "เงินนอกงบประมาณสะสมคงเหลือยกมา", "Accumulated non-budget money brought forward", "in"], ["2", "รายได้ประเภทเงินนอกงบประมาณ", "Non-budget revenue", "sum"], ["2.1", "เงินรายได้", "Own income", "in"], ["2.2", "เงินที่รัฐบาลอุดหนุนหรือจัดสรรให้", "Government subsidy or allocation", "in"], ["2.3", "ทุนหมุนเวียน", "Revolving fund", "in"], ["2.4", "เงินช่วยเหลือจากต่างประเทศ", "Foreign aid", "in"], ["2.5", "เงินอุดหนุนและบริจาค", "Grants and donations", "in"], ["2.6", "เงินกู้ในประเทศ", "Domestic loans", "in"], ["2.7", "เงินกู้ต่างประเทศ", "Foreign loans", "in"], ["2.8", "อื่นๆ", "Other", "in"],
  ["3", "รวมเงินนอกงบประมาณทั้งสิ้น (1.+2.)", "Total non-budget money (1.+2.)", "calc"], ["4", "นำไปสมทบกับงบประมาณ", "Used to join the budget", "sum"], ["4.1", "งบบุคลากร", "Personnel", "in"], ["4.2", "งบดำเนินงาน", "Operations", "in"], ["4.3", "งบลงทุน", "Investment", "in"], ["4.4", "งบเงินอุดหนุน", "Subsidies", "in"], ["4.5", "งบรายจ่ายอื่น", "Other expenditure", "in"],
  ["5", "คงเหลือหลังหักเงินนำไปสมทบกับงบประมาณ (3 .- 4.)", "Left after joining the budget (3 - 4)", "calc"], ["6", "แผนการใช้จ่ายอื่น", "Other spending plan", "sum"], ["6.1", "ภารกิจพื้นฐาน", "Basic missions", "in"], ["6.2", "ภารกิจเพื่อการพัฒนา", "Development missions", "in"], ["7", "คงเหลือ (5 .- 6.)", "Left (5 - 6)", "calc"]];
const nbKids = k => NB_ROWS.filter(x => x[0].startsWith(k + ".")).map(x => x[0]);
// computed rows from the input rows (the file's own computed rows are compared with these when it is imported)
function nbCalc(v) {
  const g = (k, i) => Number((v[k] || [])[i]) || 0, out = {}, n = NB_COLS.length;
  for (let i = 0; i < n; i++) { const s = k => nbKids(k).reduce((a, c) => a + g(c, i), 0); out["2|" + i] = s("2"); out["3|" + i] = g("1", i) + out["2|" + i]; out["4|" + i] = s("4"); out["5|" + i] = out["3|" + i] - out["4|" + i]; out["6|" + i] = s("6"); out["7|" + i] = out["5|" + i] - out["6|" + i]; }
  return out;
}
const nbVal = (v, k, i, c) => (NB_ROWS.find(x => x[0] === k)[3] === "in" ? Number((v[k] || [])[i]) || 0 : c[k + "|" + i]);
const NB_SAMPLE = { "1": [99950, 0, 0, 0, 0, 0], "2.1": [50, 1000000, 1200000, 1300000, 1400000, 1500000], "2.8": [100, 0, 0, 0, 0, 0], "4.1": [0, 1800000, 0, 0, 0, 0], "4.2": [0, 1000000, 0, 0, 0, 0], "4.3": [10513000, 900000, 0, 0, 0, 0] };
const nbMake = (scale, by) => { const v = {}; NB_ROWS.filter(x => x[3] === "in").forEach(x => (v[x[0]] = (NB_SAMPLE[x[0]] || [0, 0, 0, 0, 0, 0]).map(n => Math.round(n * scale)))); return { cols: NB_COLS.slice(), v, notes: { "1": "-" }, by, date: "2026-11-10", file: "NBUD.xlsx", warn: [] }; };

Object.keys(SEEDS).forEach(k => {
  const prev = SEEDS[k].seed;
  SEEDS[k].seed = () => {
    const s = prev();
    (s.requests || []).forEach((r, i) => {
      r.items.forEach((it, j) => {
        if (it.inds && it.inds.length) return; const qn = Math.max(1, Number(it.qty) || 1), a = Math.floor(qn / 4), nm = Array.isArray(it.name) ? it.name[0] : it.name || "";
        it.inds = [{ name: `จำนวน${nm}ที่ดำเนินการแล้วเสร็จ`, type: "quant", unit: "หน่วย", q: [a, a, a, qn - 3 * a] }];
        if (j === 0) it.inds.push({ name: `ระดับความสำเร็จของ${nm}`, type: "qual", unit: "ระดับ", q: [1, 2, 3, 4] });
      });
      if (r.multi) { const ys = r.years ? Object.keys(r.years) : [], sum = ys.reduce((a, y) => a + Number(r.years[y] || 0), 0), nbs = r.items.reduce((a, it) => a + (it.nb || []).reduce((b, x) => b + (Number(x.amt) || 0), 0), 0);
        r.commit = { status: "new", startY: FORM_FY, period: ys.length || 3, cabProj: "", cabProjDate: "", cabCom: "", cabComDate: "", planFirst: "", planLast: "", contractNo: "", cS: "", cE: "", budget: sum || r.amount, nb: nbs, rsv: 0, state: "", need: CM_NEED[2][0], spend: r.items.some(x => x.type === "inv") ? CM_SPEND[1][0] : CM_SPEND[3][0] }; }
    });
    (s.requests || []).forEach(r => { r.inds = (r.items || []).flatMap(it => it.inds || []); r.items.forEach(it => { delete it.inds; }); });
    s.nbudDept = nbMake(1, "plan");
    return s;
  };
});

// ---------- tab bar: indicators, alignment, commitment details; no documents tab ----------
const RX_TABS = ["ind", "align", "commit"];
{
  const base = reqTabsBar;
  reqTabsBar = function (r) {
    let want = REQ_TAB; if (want === "docs" || want === "years" || want === "equip" || (want === "commit" && !r.multi)) want = "main"; REQ_TAB = want;
    const html0 = base(r); if (RX_TABS.includes(want)) REQ_TAB = want;
    const c = checks(r), st = id => { const xs = c.filter(x => x.step === id); return xs.some(x => x.s === "no") ? "bad" : xs.some(x => x.s === "wa") ? "warn" : "ok"; };
    const btn = (id, label) => `<button type="button" role="tab" aria-selected="${REQ_TAB === id}" class="rstep x ${REQ_TAB === id ? "on" : ""} s-${st(id)}" data-rtab="${id}"><span>${label}</span></button>`;
    const mine = btn("ind", L("ตัวชี้วัด", "Indicators")) + btn("align", L("ความสอดคล้อง", "Alignment")) + (r.multi ? btn("commit", L("รายการผูกพัน", "Multi-year commitment")) : "");
    return html0.replace(/<button[^>]*data-rtab="(?:docs|years|equip)"[\s\S]*?<\/button>/g, "").replace(/(<button[^>]*data-rtab="(?:payroll|workplan|mtef|versions)")/, mine + "$1");
  };
}

// ---------- alignment tab ----------
REQ_PANELS.align = (r, ed) => rqPlanPanel(r);
REQ_BIND.align = () => {};

// ---------- indicators tab ----------
const IND_QM = q => [0, 1, 2].map(k => kpMon(q * 3 + k));
// months (Oct to Sep) are the entry, for the target and for the result; quarters are derived (sum, the average for a qualitative indicator) and kept in x.q (target) and x.rq (result)
function indMonths(x) {
  if (Array.isArray(x.m) && x.m.length === 12) return x.m;
  const q = x.q || [0, 0, 0, 0]; x.m = Array(12).fill(0).map((_, i) => (x.type === "qual" ? Number(q[Math.floor(i / 3)]) || 0 : Math.round((Number(q[Math.floor(i / 3)]) || 0) / 3 * 100) / 100)); return x.m;
}
const indRM = x => (Array.isArray(x.rm) && x.rm.length === 12 ? x.rm : (x.rm = Array(12).fill(0)));
const indQuarters = (m, qual) => [0, 1, 2, 3].map(i => { const s = m.slice(i * 3, i * 3 + 3).map(v => Number(v) || 0).reduce((p, c) => p + c, 0); return qual ? Math.round(s / 3 * 100) / 100 : Math.round(s * 100) / 100; });
function indSync(x) { x.q = indQuarters(indMonths(x), x.type === "qual"); x.rq = indQuarters(indRM(x), x.type === "qual"); return x.q; }
const indResTotal = x => { const q = (x.rq || indSync(x) && x.rq).map(v => Number(v) || 0), s = q.reduce((a, b) => a + b, 0); return x.type === "qual" ? (q.filter(v => v > 0).length ? s / q.filter(v => v > 0).length : 0) : s; };
const indRow = (i, j, x, ds, ed, dres) => { const q = indSync(x), m = indMonths(x), rm = indRM(x), tt = indTotal(x), rt = indResTotal(x); return `<tr data-indrow="${esc(String(x.name || "").toLowerCase())}"><td class="n">${j + 1}</td><td><input type="text" data-ind="${i}|${j}" data-f="name" value="${esc(x.name || "")}" ${ds} aria-label="${L("ตัวชี้วัด", "Indicator")}" style="min-width:220px"></td>
  <td><select data-ind="${i}|${j}" data-f="type" ${ds} aria-label="${L("ประเภทตัวชี้วัด", "Kind of indicator")}"><option value="">${L("— เลือก —", "— choose —")}</option>${Object.keys(IND_TYPES).map(t => `<option value="${t}" ${x.type === t ? "selected" : ""}>${tx(IND_TYPES[t])}</option>`).join("")}</select></td>
  <td><select data-ind="${i}|${j}" data-f="unit" ${ds} aria-label="${L("หน่วยนับ", "Unit")}"><option value="">${L("— เลือก —", "— choose —")}</option>${(IND_UNITS[x.type] || indAllUnits()).map(u => `<option value="${u}" ${x.unit === u ? "selected" : ""}>${u}</option>`).join("")}</select></td>
  ${q.map((v, k) => `<td class="n"><span data-indq="${k}">${kpFmt(v)}</span><div class="sub" data-indrq="${k}">${L("ผล", "result")} ${kpFmt(x.rq[k])}</div></td>`).join("")}<td class="n"><b class="num">${fmt(tt, x.type === "qual" ? 1 : 0)}</b>${x.type === "qual" ? `<div class="sub">${L("ค่าเฉลี่ย", "average")}</div>` : ""}<div class="sub">${L("ผล", "result")} ${kpFmt(rt)}${tt ? ` (${fmt(rt / tt * 100, 0)}%)` : ""}</div></td><td>${ed ? `<button class="btn ghost danger" type="button" data-inddel="${i}|${j}" aria-label="${L("ลบ", "Remove")}" style="padding:4px 8px">×</button>` : ""}</td></tr>
  <tr><td></td><td colspan="9"><div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px">${[0, 1, 2, 3].map(k => `<div style="border:1px solid var(--line);border-radius:8px;padding:6px 8px"><div class="sub" style="margin-bottom:4px"><b style="font-weight:600">${L("ไตรมาส", "Quarter")} ${k + 1}</b> · ${IND_QM(k).map(mm => tx(mm)).join(" ")}</div>
    <div class="sub" style="margin-bottom:2px">${L("เป้าหมาย", "Target")}</div><div style="display:flex;gap:4px">${IND_QM(k).map((mm, n) => `<input type="number" min="0" step="any" data-ind="${i}|${j}" data-f="m${k * 3 + n}" value="${Number(m[k * 3 + n]) ? m[k * 3 + n] : ""}" ${ds} placeholder="${tx(mm)}" aria-label="${L("เป้าหมาย", "Target")} ${tx(mm)}" style="min-width:0;width:100%">`).join("")}</div>
    <div class="sub" style="margin:4px 0 2px">${L("ผล", "Result")}</div><div style="display:flex;gap:4px">${IND_QM(k).map((mm, n) => `<input type="number" min="0" step="any" data-ind="${i}|${j}" data-f="r${k * 3 + n}" value="${Number(rm[k * 3 + n]) ? rm[k * 3 + n] : ""}" ${dres} placeholder="${tx(mm)}" aria-label="${L("ผล", "Result")} ${tx(mm)}" style="min-width:0;width:100%">`).join("")}</div></div>`).join("")}</div></td></tr>`; };
const indLineLabel = it => { const m = (typeof rqMoneyTypes === "function" ? rqMoneyTypes("bud") : []).find(x => x.id === it.money); return `${m ? tx(m.name) : L("ประเภทเงิน", "Kind of money")} · ${fmt(Number(it.qty) || 0)} ${it.unitName ? tx(it.unitName) : ""}`.trim(); };
REQ_PANELS.ind = (r, ed) => {
  rqLineInit(r); const ds = ed ? "" : "disabled", dres = rqpOwn(r) ? "" : "disabled", st = indState(r);
  const a = rInds(r), i = 0; return `<section class="panel" data-indline="0"><div class="body"><input type="search" id="ind-q" placeholder="${L("ค้นหาตัวชี้วัด", "Search indicators")}" aria-label="${L("ค้นหา", "Search")}" style="width:100%;max-width:420px"></div>
    <div class="tbl-wrap"><table><thead><tr><th>${L("ลำดับ", "No.")}</th><th>${L("ตัวชี้วัด", "Indicator")}</th><th>${L("ประเภทตัวชี้วัด", "Kind")}</th><th>${L("หน่วยนับ", "Unit")}</th>${[1, 2, 3, 4].map(k => `<th class="n">${L("ไตรมาส", "Q")} ${k}</th>`).join("")}<th class="n">${L("รวมทั้งสิ้น", "Total")}</th><th></th></tr></thead>
      <tbody>${a.map((x, j) => indRow(i, j, x, ds, ed, dres)).join("") || `<tr><td colspan="9" class="sub">${L("ยังไม่มีตัวชี้วัด", "No indicator yet")}</td></tr>`}</tbody></table></div>
    ${ed ? `<div class="body"><button class="btn" type="button" data-indadd="0">+ ${L("เพิ่มตัวชี้วัด", "Add an indicator")}</button></div>` : ""}</section>`;
};
REQ_BIND.ind = r => {
  const ed = editable(r), own = rqpOwn(r), re = () => { save(); route(); };
  const q = $("#ind-q"); if (q) q.oninput = () => { const t = q.value.trim().toLowerCase(); $$("[data-indrow]").forEach(tr => { const sh = !t || tr.dataset.indrow.includes(t); tr.style.display = sh ? "" : "none"; if (tr.nextElementSibling) tr.nextElementSibling.style.display = sh ? "" : "none"; }); };
  $$("[data-ind]").forEach(el => (el.onchange = () => {
    const [i, j] = el.dataset.ind.split("|").map(Number), x = rInds(r)[j], f = el.dataset.f;
    if (/^r\d+$/.test(f)) { if (!own) return; indRM(x)[Number(f.slice(1))] = Math.max(0, Number(el.value) || 0); indSync(x); audit(["บันทึกผลตัวชี้วัดของรายการ", "Entered an indicator result of a line"], `${r.id} ${i + 1}.${j + 1}`); re(); return; }
    if (!ed) return;
    if (f === "type") { x.type = el.value; if (!(IND_UNITS[x.type] || []).includes(x.unit)) x.unit = (IND_UNITS[x.type] || [])[0] || ""; indSync(x); } else if (/^m\d+$/.test(f)) { indMonths(x)[Number(f.slice(1))] = Math.max(0, Number(el.value) || 0); indSync(x); } else x[f] = el.value;
    re();
  }));
  if (!ed) return;
  $$("[data-indadd]").forEach(b => (b.onclick = () => { rInds(r).push({ name: "", type: "quant", unit: "หน่วย", q: [0, 0, 0, 0], m: Array(12).fill(0), rm: Array(12).fill(0) }); re(); }));
  $$("[data-inddel]").forEach(b => (b.onclick = () => { const [i, j] = b.dataset.inddel.split("|").map(Number); rInds(r).splice(j, 1); re(); }));
};

// ---------- commitment details tab (only for a multi-year request) ----------
const cmInit = r => r.commit || (r.commit = { status: "new", startY: FORM_FY, period: "", cabProj: "", cabProjDate: "", cabCom: "", cabComDate: "", planFirst: "", planLast: "", contractNo: "", cS: "", cE: "", budget: reqAmount(r), nb: reqNb(r), rsv: 0, state: "", need: "", spend: "" });
const cmEnd = c => (Number(c.startY) && Number(c.period) ? Number(c.startY) + Number(c.period) - 1 : "");
function cmMissing(r) {
  const c = cmInit(r), m = [], need = (ok, th, en) => { if (!ok) m.push(L(th, en)); }, has = v => String(v == null ? "" : v).trim() !== "";
  need(Number(c.period) > 0, "ระยะเวลาผูกพัน", "Commitment period"); need(Number(c.budget) > 0, "ยอดเงินงบประมาณ", "Budget amount"); need(has(c.nb), "เงินนอกงบประมาณ", "Non-budget amount"); need(has(c.need), "ความจำเป็นในการตั้งงบประมาณผูกพันข้ามปี", "Need for a multi-year commitment"); need(has(c.spend), "ประเภทรายการใช้จ่ายที่สำคัญ", "Main kind of spending");
  if (c.status !== "new") { need(Number(c.startY) > 0, "ปีผูกพันเริ่มต้น", "Start year"); need(has(c.cabProj), "เลขที่หนังสือ ครม. ที่อนุมัติโครงการ", "Cabinet letter approving the project"); need(has(c.cabCom), "เลขที่หนังสือ ครม. ที่อนุมัติผูกพันรายการ", "Cabinet letter approving the commitment"); need(has(c.state), "สถานะภาพรายการผูกพัน", "Status of the commitment"); }
  if (c.status === "contract") { need(has(c.contractNo), "เลขที่สัญญา", "Contract number"); need(has(c.cS), "วันที่เริ่มต้นสัญญา", "Contract start"); need(has(c.cE), "วันที่สิ้นสุดสัญญา", "Contract end"); need(has(c.planFirst), "แผนเริ่มแรกของวันที่จะเซ็นสัญญา", "First planned signing date"); }
  return m;
}
REQ_PANELS.commit = (r, ed) => {
  const c = cmInit(r), ds = ed ? "" : "disabled", s = c.status, ys = r.years ? Object.keys(r.years).reduce((a, y) => a + Number(r.years[y] || 0), 0) : 0, miss = cmMissing(r);
  const f = (id, label, req, inner, full) => `<div class="f ${full ? "full" : ""}"><label for="cm-${id}">${label}${req ? ' <span style="color:var(--bad)">*</span>' : ""}</label>${inner}</div>`;
  const inp = (id, type, val, dis, extra) => `<input type="${type}" id="cm-${id}" data-cm="${id}" value="${esc(val == null ? "" : val)}" ${ed && !dis ? "" : "disabled"} ${extra || ""}>`;
  const sel = (id, list, val) => `<select id="cm-${id}" data-cm="${id}" ${ds}><option value="">${L("กรุณาเลือก", "Please choose")}</option>${list.map(x => `<option value="${esc(x[0])}" ${val === x[0] ? "selected" : ""}>${tx(x)}</option>`).join("")}</select>`;
  const lab = id => ({ cabProj: ["เลขที่หนังสือสอบถาม ครม. ที่อนุมัติโครงการ", s !== "new"], cabProjD: ["วันที่มติ ครม. ที่อนุมัติโครงการ", false] })[id];
  return `<section class="panel" id="rf-commit"><header><h2>${L("รายละเอียดรายการผูกพัน", "Commitment details")}</h2><span class="sp"></span>${miss.length ? tag(`${L("ยังไม่ครบ", "Missing")} ${miss.length}`, "p-warn") : tag(L("ครบ", "Complete"), "p-ok")}</header>
    <div class="body"><div class="f"><label>${L("สถานะรายการ", "Status of the line")} <span style="color:var(--bad)">*</span></label><div class="row">${Object.keys(CM_ST).map(k => `<label class="radio"><input type="radio" name="cm-st" value="${k}" ${s === k ? "checked" : ""} ${ds}> ${tx(CM_ST[k])}</label>`).join("")}</div></div></div>
    <div class="body form-grid">
      ${f("startY", L("ปีผูกพันเริ่มต้น", "Start year"), s !== "new", inp("startY", "number", s === "new" ? FORM_FY : c.startY, s === "new"))}${f("endY", L("ปีผูกพันสิ้นสุด", "End year"), false, `<input type="text" id="cm-endY" value="${cmEnd(c)}" disabled placeholder="${L("กรุณาระบุ", "Please enter")}">`)}${f("period", L("ระยะเวลาผูกพัน (ปี)", "Commitment period (years)"), true, inp("period", "number", c.period, false, 'min="1"'))}
      ${f("cabProj", L("เลขที่หนังสือสอบถาม ครม. ที่อนุมัติโครงการ", "Cabinet letter approving the project"), s !== "new", inp("cabProj", "text", c.cabProj, s === "new"), true)}${f("cabProjDate", L("วันที่มติ ครม. ที่อนุมัติโครงการ", "Date of the cabinet resolution"), false, inp("cabProjDate", "date", c.cabProjDate), true)}
      ${s !== "new" ? `${f("cabCom", L("เลขที่หนังสือสอบถาม ครม. ที่อนุมัติผูกพันรายการ", "Cabinet letter approving the commitment"), true, inp("cabCom", "text", c.cabCom), true)}${f("cabComDate", L("วันที่มติ ครม. ที่อนุมัติผูกพันรายการ", "Date of the resolution on the commitment"), false, inp("cabComDate", "date", c.cabComDate), true)}` : ""}
      ${s === "m41" ? `${f("planFirst", L("แผนเริ่มแรกของวันที่จะเซ็นสัญญา", "First planned signing date"), false, inp("planFirst", "date", c.planFirst))}${f("planLast", L("แผนล่าสุดของวันที่จะเซ็นสัญญา", "Latest planned signing date"), false, inp("planLast", "date", c.planLast))}` : ""}
      ${s === "contract" ? `${f("contractNo", L("เลขที่สัญญา", "Contract number"), true, inp("contractNo", "text", c.contractNo))}${f("cS", L("วันที่เริ่มต้นสัญญา", "Contract start"), true, inp("cS", "date", c.cS))}${f("cE", L("วันที่สิ้นสุดสัญญา", "Contract end"), true, inp("cE", "date", c.cE))}${f("planFirst", L("แผนเริ่มแรกของวันที่จะเซ็นสัญญา", "First planned signing date"), true, inp("planFirst", "date", c.planFirst))}` : ""}
      ${f("budget", L("ยอดเงินงบประมาณ (บาท)", "Budget amount (baht)"), true, inp("budget", "number", c.budget, false, 'min="0"'), true)}${f("nb", L("เงินนอกงบประมาณ (บาท)", "Non-budget amount (baht)"), true, inp("nb", "number", c.nb, false, 'min="0"'))}${f("rsv", L("เงินสำรองเพื่อเหลือเผื่อขาด", "Reserve for shortfall"), false, inp("rsv", "number", c.rsv, false, 'min="0"'))}
      ${s !== "new" ? f("state", L("สถานะภาพรายการผูกพัน", "Status of the commitment"), true, sel("state", CM_STATE, c.state)) : ""}${f("need", L("ความจำเป็นในการตั้งงบประมาณผูกพันข้ามปี", "Need for a multi-year commitment"), true, sel("need", CM_NEED, c.need))}${f("spend", L("ประเภทรายการใช้จ่ายที่สำคัญ", "Main kind of spending"), true, sel("spend", CM_SPEND, c.spend))}
      <div class="f full"><span class="sub">${L("ผลรวมตามแท็บผูกพันหลายปี", "Sum on the Multi-year tab")}: <b>${fmt(ys)}</b> ${ys && Number(c.budget) !== ys ? tag(L("ไม่ตรงกับยอดเงินงบประมาณ", "differs from the budget amount"), "p-warn") : ""} · ${L("เงินนอกงบประมาณในรายการคำขอ", "non-budget money on the lines")}: <b>${fmt(reqNb(r))}</b> ${ed ? `<button class="btn ghost" type="button" id="cm-fill">${L("ใส่ยอดจากคำขอ", "Fill from the request")}</button>` : ""}</span></div></div></section>`;
};
REQ_BIND.commit = r => {
  if (!editable(r)) return; const c = cmInit(r), re = () => { save(); route(); };
  $$("[name=cm-st]").forEach(x => (x.onchange = () => { c.status = x.value; re(); }));
  $$("[data-cm]").forEach(el => (el.onchange = () => { const f = el.dataset.cm; c[f] = el.type === "number" ? (el.value === "" ? "" : Math.max(0, Number(el.value))) : el.value; re(); }));
  const fl = $("#cm-fill"); if (fl) fl.onclick = () => { const ys = r.years ? Object.keys(r.years).reduce((a, y) => a + Number(r.years[y] || 0), 0) : 0; c.budget = ys || reqAmount(r); c.nb = reqNb(r); audit(["ใส่ยอดภาระผูกพันจากคำขอ", "Filled the commitment amounts from the request"], r.id); re(); };
};

// ---------- MTEF tab (no line names any more, 16 Nov 2569: the lines of a request are only kinds of money): a row for each line, 3 / 5 / 10 / 15 / 20 forward years ----------
const MT_SPANS = [3, 5, 10, 15, 20];
let MT_D = null;
const mtYears = n => Array.from({ length: n }, (_, k) => FORM_FY + k); // the first year is the current fiscal year
function mtEnsure(D, r) {
  const ys = mtYears(D.span); D.rows = D.rows || [];
  r.items.forEach((it, i) => { const row = D.rows[i] || (D.rows[i] = {}); ys.forEach((y, k) => { if (!row[y]) { const f = Math.pow(1.03, k), nb = lineNb(it); row[y] = { bq: Number(it.qty) || 0, ba: Math.round(itemTotal(it) * f / 1000) * 1000, nq: nb ? Number(it.qty) || 0 : 0, na: nb ? Math.round(nb * f / 1000) * 1000 : 0 }; } }); });
  D.rows.length = r.items.length; return D;
}
function mtLoad(r) {
  if (r.mt2) return mtEnsure(JSON.parse(JSON.stringify(r.mt2)), r);
  const D = { span: 3, note: (r.mtef && r.mtef.note) || "", rows: [] }, tot = reqAmount(r) || 1;
  if (r.mtef) r.items.forEach((it, i) => { const row = D.rows[i] = {}; mtYears(3).forEach(y => { if (r.mtef[y] != null) row[y] = { bq: Number(it.qty) || 0, ba: Math.round(Number(r.mtef[y]) * itemTotal(it) / tot), nq: 0, na: 0 }; }); });
  return mtEnsure(D, r);
}
REQ_PANELS.mtef = (r, ed) => {
  if (!MT_D || MT_D.rid !== r.id) { MT_D = mtLoad(r); MT_D.rid = r.id; } mtEnsure(MT_D, r);
  const D = MT_D, ys = mtYears(D.span), ds = ed ? "" : "disabled", sum = (y, f) => D.rows.reduce((a, row) => a + (Number(row[y][f]) || 0), 0);
  return `<section class="panel" id="rf-mtef"><header><h2>${L("ประมาณการรายจ่ายล่วงหน้า (MTEF)", "Forward expenditure estimate (MTEF)")}</h2><span class="sp"></span>${r.mt2 ? tag(L("บันทึกแล้ว", "Saved"), "p-ok") : tag(L("ยังไม่บันทึก", "Not saved"), "p-warn")}
      <select id="mt-span" ${ds} aria-label="${L("จำนวนปี", "Years")}">${MT_SPANS.map(n => `<option value="${n}" ${D.span === n ? "selected" : ""}>${L(`แสดง MTEF ${n} ปี`, `Show MTEF for ${n} years`)}</option>`).join("")}</select>${ed ? `<button class="btn" type="button" id="mt-cancel">${L("ยกเลิก", "Cancel")}</button><button class="btn primary" type="button" id="mt-save">${L("บันทึกข้อมูล", "Save")}</button>` : ""}</header>
    <div class="tbl-wrap" style="overflow:auto"><table class="mtef" style="min-width:${300 + ys.length * 360}px"><thead><tr><th rowspan="3">${L("ประเภทเงิน", "Kind of money")}</th><th rowspan="3" class="n">${L("งบประมาณรวม", "Budget this year")}</th>${ys.map(y => `<th colspan="4" style="text-align:center">${L("ปี", "FY")} ${y}${y === FORM_FY ? ` <span class="sub">(${L("ปีปัจจุบัน", "current")})</span>` : ""}</th>`).join("")}</tr>
      <tr>${ys.map(() => `<th colspan="2" style="text-align:center">${L("เงินงบประมาณ", "Budget money")}</th><th colspan="2" style="text-align:center">${L("เงินนอกงบประมาณสมทบรายการ", "Non-budget money joining the line")}</th>`).join("")}</tr>
      <tr>${ys.map(() => ["ปริมาณ", "งบประมาณ", "ปริมาณ", "งบประมาณ"].map(h => `<th class="n">${h}</th>`).join("")).join("")}</tr></thead>
      <tbody>${r.items.map((it, i) => `<tr><td><span class="sub">${i + 1}. ${esc(rqMoneyName(it.money))}</span></td><td class="n">${fmt(itemTotal(it))}</td>${ys.map(y => ["bq", "ba", "nq", "na"].map(f => `<td class="n"><input type="number" min="0" data-mt="${i}|${y}|${f}" value="${D.rows[i][y][f]}" ${ds} aria-label="${i + 1} ${y} ${f}" style="max-width:${f === "bq" || f === "nq" ? 70 : 110}px"></td>`).join("")).join("")}</tr>`).join("")}</tbody>
      <tfoot><tr><td colspan="2">${L("รวม", "Total")}</td>${ys.map(y => ["bq", "ba", "nq", "na"].map(f => `<td class="n" data-mtot="${y}|${f}">${fmt(sum(y, f))}</td>`).join("")).join("")}</tr></tfoot></table></div>
    <div class="body form-grid"><div class="f full"><label for="mtef-note">${L("หมายเหตุ / ข้อสมมุติ", "Note / assumptions")}</label><input type="text" id="mtef-note" value="${esc(D.note || "")}" ${ds}><span class="hint">${L("ปีแรกคือปีงบประมาณปัจจุบัน ค่าตั้งต้นของปีนี้เท่ายอดที่ขอ ปีถัดไปเพิ่มปีละ 3% (ข้อสมมุติของต้นแบบ) แก้ได้ทุกช่อง · ผลรวมเงินงบประมาณรายปีถูกบันทึกเป็นประมาณการล่วงหน้าของคำขอ", "The first year is the current fiscal year, defaulting to the amount asked; later years add 3% a year (an assumption of the prototype); every cell is editable · the yearly budget totals are saved as the request's forward estimate")}</span></div></div></section>`;
};
REQ_BIND.mtef = r => {
  if (!editable(r)) return; const D = MT_D;
  const tot = () => { const ys = mtYears(D.span); ys.forEach(y => ["bq", "ba", "nq", "na"].forEach(f => { const c = document.querySelector(`[data-mtot="${y}|${f}"]`); if (c) c.textContent = fmt(D.rows.reduce((a, row) => a + (Number(row[y][f]) || 0), 0)); })); };
  $$("[data-mt]").forEach(el => (el.onchange = () => { const [i, y, f] = el.dataset.mt.split("|"); D.rows[Number(i)][y][f] = Math.max(0, Number(el.value) || 0); tot(); }));
  const nt = $("#mtef-note"); if (nt) nt.onchange = () => { D.note = nt.value; };
  const sp = $("#mt-span"); if (sp) sp.onchange = () => { D.span = Number(sp.value); route(); };
  const cn = $("#mt-cancel"); if (cn) cn.onclick = () => { MT_D = null; route(); toast(L("ยกเลิกการแก้ไขที่ยังไม่บันทึก", "Unsaved edits discarded")); };
  const sv = $("#mt-save"); if (sv) sv.onclick = () => {
    const out = JSON.parse(JSON.stringify(D)); delete out.rid; r.mt2 = out; const m = { note: D.note || "", span: D.span };
    mtYears(D.span).forEach(y => (m[y] = D.rows.reduce((a, row) => a + (Number(row[y].ba) || 0), 0))); r.mtef = m;
    audit(["บันทึกประมาณการรายจ่ายล่วงหน้า (MTEF)", "Saved the forward expenditure estimate (MTEF)"], `${r.id} · ${D.span} ${L("ปี", "years")}`); commit(); route(); toast(L("บันทึกประมาณการล่วงหน้าแล้ว", "Forward estimate saved"));
  };
};

// ---------- checks ----------
{
  const base = checks;
  checks = function (r) {
    const out = base(r); rqLineInit(r);
    out.forEach(x => { if (x.title === L("ความสอดคล้องกับแผนระดับชาติ", "Alignment with the national plans")) x.step = "align"; });
    const st = indState(r), none = rInds(r).length ? 0 : 1;
    out.push({ s: st, title: L("ตัวชี้วัดของแต่ละรายการ", "Indicators of each line"), d: st === "ok" ? `${r.items.length} ${L("รายการมีตัวชี้วัดครบ", "lines have indicators")}` : none ? `${none} ${L("รายการยังไม่มีตัวชี้วัด", "lines have no indicator")}` : L("มีตัวชี้วัดที่ยังไม่ระบุประเภท หน่วยนับ หรือค่าเป้าหมาย", "An indicator lacks its kind, unit or target"), step: "ind" });
    out[out.length - 1].s = st === "ok" ? "ok" : st === "wa" ? "wa" : "no";
    if (r.multi) { const m = cmMissing(r); out.push({ s: m.length ? "no" : "ok", title: L("รายละเอียดรายการผูกพัน", "Commitment details"), d: m.length ? `${L("ยังไม่ระบุ", "Missing")}: ${m.join(", ")}` : L("ระบุแล้ว", "Given"), step: "commit" }); }
    if (r.hearAdjust && !r.hearAdjust.done) out.push({ s: "wa", title: L("ปรับคำขอตามผลการชี้แจง", "Adjust as the hearing asked"), d: r.hearAdjust.note || "", step: "main" });
    for (let i = out.length - 1; i >= 0; i--) if (out[i].step === "years" || out[i].step === "equip") out.splice(i, 1);
    return out;
  };
}
{
  const base = cnCheck;
  cnCheck = function (r) {
    const c = base(r); rqLineInit(r);
    c.push({ ok: rInds(r).length > 0, label: L("คำขอมีตัวชี้วัด", "The request has an indicator"), block: true });
    if (r.multi) c.push({ ok: cmMissing(r).length === 0, label: L("รายละเอียดรายการผูกพันครบ", "Commitment details complete"), block: false });
    return c;
  };
}

// ---------- BQ13: the NBUD form of each unit ----------
const nbCan = () => ROLE === "plan";
const nbYear = i => FORM_FY - 1 + i; // column 0 = the previous year, 1 = the current year, 2 to 5 = forward years
const nbHead = i => (i === 0 ? L("ปีก่อนหน้า", "Previous year") : i === 1 ? L("ปีปัจจุบัน", "Current year") : `${L("ปีล่วงหน้า", "Forward year")} ${i - 1}`);
function nbudSection() {
  const d = S.nbudDept || (S.nbudDept = nbMake(1, "plan")), can = nbCan(), c = nbCalc(d.v), yr = NB_COLS[0];
  const cell = (rw, i) => (rw[3] === "in" && can ? `<input type="number" step="any" data-nbc="${rw[0]}|${i}" value="${nbVal(d.v, rw[0], i, c)}" aria-label="${esc(rw[1])} ${nbYear(i)}" style="max-width:150px;text-align:right">` : fmt(nbVal(d.v, rw[0], i, c), 4));
  return `<section class="panel" id="nbud"><header><h2>${L("สถานะและแผนการใช้จ่ายเงินนอกงบประมาณ (เงินรายได้ของหน่วยงาน)", "Status and spending plan of non-budget money (own income)")}</h2><span class="sp"></span>${tag(can ? L("กองแผนงานคีย์ข้อมูล", "Planning keys it in") : L("ดูอย่างเดียว", "Read only"), can ? "p-info" : "p-mute")}</header>
    <div class="body sub">${L("ข้อมูลระดับกรม (ไม่แยกหน่วยงาน) รายการข้อมูลหน่วย : ล้านบาท (ทศนิยม 4 ตำแหน่ง) ตามหัวแบบ · กองแผนงานคีย์ช่องรายการ แถวรวมและคงเหลือคำนวณให้", "Department level, not split by unit · unit of the figures: million baht (4 decimals) as in the form's heading · Planning keys the item cells; totals and balances are computed")}${d.date ? ` · ${L("แก้ล่าสุด", "last edited")} ${fdate(d.date)}` : ""}</div>
    <div class="tbl-wrap"><table><thead><tr><th rowspan="2">${L("ประเภทเงินนอกงบประมาณ", "Kind of non-budget money")}</th><th rowspan="2" class="n">${nbHead(0)}<div class="sub">${L("ปี", "FY")} ${nbYear(0)}</div></th><th colspan="${NB_COLS.length - 1}" style="text-align:center">${L("แผนการใช้จ่ายเงินนอกงบประมาณ", "Non-budget spending plan")}</th><th rowspan="2">${L("หมายเหตุ", "Note")}</th></tr><tr>${NB_COLS.slice(1).map((_, k) => `<th class="n">${nbHead(k + 1)}<div class="sub">${L("ปี", "FY")} ${nbYear(k + 1)}</div></th>`).join("")}</tr></thead>
      <tbody>${NB_ROWS.map(rw => { const main = !rw[0].includes("."); return `<tr${main ? ' style="font-weight:600"' : ""}><td style="padding-left:${main ? 8 : 24}px">${rw[0]} ${esc(L(rw[1], rw[2]))}</td>${NB_COLS.map((_, i) => `<td class="n">${cell(rw, i)}</td>`).join("")}<td>${can ? `<input type="text" data-nbn="${rw[0]}" value="${esc((d.notes || {})[rw[0]] || "")}" aria-label="${L("หมายเหตุ", "Note")}">` : `<span class="sub">${esc((d.notes || {})[rw[0]] || "")}</span>`}</td></tr>`; }).join("")}</tbody></table></div></section>`;
}
function nbParse(rows) {
  const hdr = rows.findIndex(r => r.filter(c => /^ปี\s*\d{4}$/.test(String(c).trim())).length >= 2); if (hdr < 0) throw new Error(L("ไม่พบหัวคอลัมน์ปี (เช่น ปี 2567) ในไฟล์", "No year heading (such as ปี 2567) in the file"));
  const cols = [], ci = [];
  rows.slice(Math.max(0, hdr - 1), hdr + 2).forEach(r => r.forEach((c, i) => { const m = /^ปี\s*(\d{4})$/.exec(String(c).trim()); if (m && !ci.includes(i)) { ci.push(i); cols.push(Number(m[1])); } }));
  const order = ci.map((i, k) => [i, cols[k]]).sort((a, b) => a[1] - b[1]), v = {}, notes = {}, filec = {}, noteCol = rows[hdr].findIndex(c => /หมายเหตุ/.test(String(c)));
  rows.slice(hdr + 1).forEach(r => { const lab = r.find(c => typeof c === "string" && /^\d+(\.\d+)?\s/.test(c.trim())); if (!lab) return; const key = /^(\d+(?:\.\d+)?)/.exec(lab.trim())[1], def = NB_ROWS.find(x => x[0] === key); if (!def) return; const vals = order.map(([i]) => { const n = Number(String(r[i]).replace(/,/g, "")); return isNaN(n) ? 0 : n; });
    if (def[3] === "in") v[key] = vals; else filec[key] = vals; if (noteCol >= 0 && r[noteCol]) notes[key] = String(r[noteCol]); });
  const warn = [], cal = nbCalc(v); Object.keys(filec).forEach(k => filec[k].forEach((n, i) => { if (Math.abs(n - cal[k + "|" + i]) > 0.5) warn.push(`${k} ${L("ปี", "FY")} ${order[i][1]}: ${L("ไฟล์", "file")} ${fmt(n, 4)} ≠ ${L("ผลรวม", "sum")} ${fmt(cal[k + "|" + i], 4)}`); }));
  NB_ROWS.filter(x => x[3] === "in").forEach(x => { if (!v[x[0]]) v[x[0]] = order.map(() => 0); });
  return { cols: order.map(x => x[1]), v, notes, warn };
}
function nbBind() {
  const d = S.nbudDept; if (!d) return; const touch = () => { d.by = ROLE; d.date = TODAY; save(); };
  $$("[data-nbc]").forEach(el => (el.onchange = () => { if (!nbCan()) return; const [k, i] = el.dataset.nbc.split("|"); (d.v[k] = d.v[k] || NB_COLS.map(() => 0))[Number(i)] = Number(el.value) || 0; touch(); audit(["แก้แบบ NBUD ระดับกรม", "Edited the department NBUD form"], `${k} ${nbYear(Number(i))}`); route(); }));
  $$("[data-nbn]").forEach(el => (el.onchange = () => { if (!nbCan()) return; (d.notes = d.notes || {})[el.dataset.nbn] = el.value; touch(); }));
}
// the tab "Units' non-budget funds" of the consolidation page now holds the whole of it
revNonBudgetPanel = function () { return nbudSection() + nbStatusBody(); };
revNonBudgetBind = function () { nbBind(); };

// ---------- the budget hearing: a flow with six steps, minutes with an outcome for each request, what the unit sees ----------
const HS_STEPS = [["นัดหมาย", "Scheduled"], ["ส่งคำถาม", "Questions sent"], ["หน่วยงานตอบ", "Unit answers"], ["กองแผนงานตรวจ", "Planning checks"], ["ประชุมชี้แจง", "Hearing held"], ["บันทึกผล", "Result recorded"]];
const HS_OUT = { keep: ["คงวงเงินตามที่ขอ", "Keep the amount asked"], adjust: ["ให้ปรับคำขอ", "Adjust the request"], cut: ["เสนอปรับลด", "Propose a cut"] };
function hsStage(h) { if (h.status === "held") return h.result ? 5 : 4; if (!h.qs.length) return 0; if (h.qs.some(q => !q.ans)) return 1; if (h.qs.some(q => q.ok == null)) return 2; if (h.qs.some(q => q.ok === false)) return 1; return 3; }
const hsStepper = h => `<div class="row" style="gap:4px;margin:6px 0">${HS_STEPS.map((s, i) => tag(`${i + 1}. ${tx(s)}`, i < hsStage(h) ? "p-ok" : i === hsStage(h) ? "p-info" : "p-mute")).join("")}</div>`;
function hsManage() {
  const pl = ROLE === "plan", hs = (S.hearings || []).filter(h => h.status !== "cancelled"), open = hs.filter(h => h.status !== "held"), held = hs.filter(h => h.status === "held" && h.result);
  const mine = h => pl || h.unit === me().unit; if (!hs.some(mine)) return "";
  const reqs = h => S.requests.filter(r => r.unit === h.unit && !["rejected", "cancelled"].includes(r.status));
  return `<section class="panel" id="hs-flow"><header><h2>${L("ขั้นตอนการชี้แจงงบประมาณ และบันทึกผล", "Hearing steps and minutes")}</h2></header><div class="body sub">${L("นัดหมาย → ส่งคำถาม → หน่วยงานตอบ (แนบไฟล์ได้) → กองแผนงานตรวจคำตอบ → ประชุม → บันทึกผลของแต่ละคำขอ หน่วยงานเห็นผลและสิ่งที่ต้องปรับ", "Schedule → questions → the unit answers (files allowed) → Planning checks → meeting → outcome of each request, which the unit sees together with what to adjust")}</div>
    ${open.filter(mine).map(h => { const st = hsStage(h), rs = reqs(h); return `<div class="body" data-hs="${h.id}" style="border-top:1px solid var(--line)"><div class="row"><b style="font-weight:600">${h.id} · ${esc(unitName(h.unit))}</b><span class="sub">${fdate(h.date)} ${h.time}</span></div>${hsStepper(h)}
      ${h.qs.some(q => (q.files || []).length) ? `<div class="sub">${L("ไฟล์แนบคำชี้แจง", "Files on the answers")}: ${h.qs.flatMap(q => (q.files || []).map(f => `${q.id}: ${esc(f)}`)).join(" · ")}</div>` : ""}
      ${pl ? `<div class="row"><input type="date" data-hdate="${h.id}" value="${h.date}" min="${TODAY}" aria-label="${L("วันที่", "Date")}"><input type="time" data-htime="${h.id}" value="${h.time}" aria-label="${L("เวลา", "Time")}"><button class="btn" type="button" data-hres="${h.id}">${L("เลื่อนนัด", "Reschedule")}</button><button class="btn ghost danger" type="button" data-hcan="${h.id}">${L("ยกเลิกนัด", "Cancel the hearing")}</button></div>` : ""}
      ${pl && st >= 3 ? `<div id="hs-min-${h.id}" style="display:flex;flex-direction:column;gap:8px;margin-top:8px"><b style="font-weight:600">${L("บันทึกผลการชี้แจง", "Minutes of the hearing")}</b>
        <div class="f"><label for="hm-at-${h.id}">${L("ผู้เข้าร่วม", "Attendees")}</label><input type="text" id="hm-at-${h.id}"></div><div class="f"><label for="hm-sm-${h.id}">${L("สรุปผลการชี้แจง", "Summary")}</label><textarea id="hm-sm-${h.id}" rows="3" style="width:100%"></textarea></div>
        ${rs.map(r => `<div class="row" style="flex-wrap:nowrap"><span style="flex:1 1 40%"><span class="mono sub">${r.id}</span> ${esc(nmStr(r.name))}</span><select data-hmo="${h.id}|${r.id}" aria-label="${esc(r.id)}">${Object.keys(HS_OUT).map(k => `<option value="${k}">${tx(HS_OUT[k])}</option>`).join("")}</select><input type="text" data-hmn="${h.id}|${r.id}" placeholder="${L("สิ่งที่ต้องปรับ / หมายเหตุ", "What to adjust / note")}" style="flex:1"></div>`).join("")}
        <div><button class="btn primary" type="button" data-hrec="${h.id}">${L("บันทึกผลและปิดการชี้แจง", "Record the result and close the hearing")}</button></div></div>` : pl ? `<div class="sub">${L("บันทึกผลได้เมื่อหน่วยงานตอบครบและกองแผนงานยอมรับคำตอบทุกข้อ", "The minutes can be recorded once every question is answered and accepted")}</div>` : ""}</div>`; }).join("")}
    ${held.filter(mine).map(h => `<div class="body" style="border-top:1px solid var(--line)"><div class="row"><b style="font-weight:600">${h.id} · ${esc(unitName(h.unit))}</b><span class="sub">${fdate(h.date)}</span>${tag(L("บันทึกผลแล้ว", "Result recorded"), "p-ok")}</div>${hsStepper(h)}<div class="sub">${L("ผู้เข้าร่วม", "Attendees")}: ${esc(h.result.attendees || "-")}</div><div>${esc(h.result.summary || "")}</div>
      <ul class="plain">${(h.result.outcomes || []).map(o => `<li><span class="mono sub">${o.req}</span> ${tag(tx(HS_OUT[o.out]), o.out === "keep" ? "p-ok" : o.out === "adjust" ? "p-warn" : "p-bad")} ${esc(o.note || "")}${!pl && o.out === "adjust" && (S.requests.find(r => r.id === o.req) || {}).hearAdjust && !S.requests.find(r => r.id === o.req).hearAdjust.done ? ` <button class="btn ghost" type="button" data-hdone="${o.req}">${L("ปรับคำขอแล้ว", "Adjusted")}</button>` : ""}</li>`).join("")}</ul></div>`).join("")}</section>`;
}
function hsBind() {
  const find = id => S.hearings.find(x => x.id === id), re = () => { commit(); route(); };
  $$("[data-hres]").forEach(b => (b.onclick = () => { const h = find(b.dataset.hres), d = document.querySelector(`[data-hdate="${h.id}"]`).value, t = document.querySelector(`[data-htime="${h.id}"]`).value; if (!d || !t) return; h.date = d; h.time = t; audit(["เลื่อนนัดชี้แจงงบประมาณ", "Rescheduled a budget hearing"], `${h.id} ${d} ${t}`); notify(["div"], [`เลื่อนนัดชี้แจงงบประมาณ ${unitName(h.unit)} เป็น ${fdate(d)} ${t}`, `Hearing for ${unitName(h.unit)} moved to ${fdate(d)} ${t}`], "requests"); re(); toast(L("เลื่อนนัดแล้ว แจ้งหน่วยงานแล้ว", "Rescheduled; the unit is told")); }));
  $$("[data-hcan]").forEach(b => (b.onclick = () => { const h = find(b.dataset.hcan); h.status = "cancelled"; audit(["ยกเลิกนัดชี้แจงงบประมาณ", "Cancelled a budget hearing"], h.id); notify(["div"], [`ยกเลิกนัดชี้แจงงบประมาณ ${unitName(h.unit)}`, `Hearing for ${unitName(h.unit)} cancelled`], "requests"); re(); }));
  $$("[data-hrec]").forEach(b => (b.onclick = () => {
    const h = find(b.dataset.hrec), outs = [...document.querySelectorAll(`[data-hmo^="${h.id}|"]`)].map(s => ({ req: s.dataset.hmo.split("|")[1], out: s.value, note: (document.querySelector(`[data-hmn="${s.dataset.hmo}"]`) || {}).value || "" }));
    const sm = (document.querySelector(`#hm-sm-${h.id}`) || {}).value || ""; if (!sm.trim()) { toast(L("ใส่สรุปผลการชี้แจงก่อน", "Write the summary first")); return; }
    h.result = { attendees: (document.querySelector(`#hm-at-${h.id}`) || {}).value || "", summary: sm, outcomes: outs, by: me().id, t: nowIso() }; h.status = "held"; if (h.date > TODAY) h.date = TODAY;
    outs.filter(o => o.out === "adjust").forEach(o => { const r = S.requests.find(x => x.id === o.req); if (r) r.hearAdjust = { h: h.id, note: o.note || L("ปรับตามผลการชี้แจง", "Adjust as the hearing asked"), done: false }; });
    audit(["บันทึกผลการชี้แจงงบประมาณ", "Recorded the result of a budget hearing"], `${h.id} ${unitName(h.unit)}`); notify(["div"], [`ผลการชี้แจงงบประมาณ ${unitName(h.unit)}: ${outs.filter(o => o.out !== "keep").length} คำขอต้องดำเนินการ`, `Hearing result for ${unitName(h.unit)}: ${outs.filter(o => o.out !== "keep").length} requests need action`], "requests"); re(); toast(L("บันทึกผลการชี้แจงแล้ว", "Hearing result recorded"));
  }));
  $$("[data-hdone]").forEach(b => (b.onclick = () => { const r = S.requests.find(x => x.id === b.dataset.hdone); if (r && r.hearAdjust) { r.hearAdjust.done = true; audit(["ปรับคำขอตามผลการชี้แจง", "Adjusted a request after the hearing"], r.id); notify(["plan"], [`${unitName(r.unit)} ปรับคำขอ ${r.id} ตามผลการชี้แจงแล้ว`, `${unitName(r.unit)} adjusted ${r.id} after the hearing`], "rev-hearings"); re(); } }));
  $$("[data-hheld]").forEach(b => (b.onclick = () => { const h = find(b.dataset.hheld), m = document.querySelector("#hs-min-" + h.id); if (hsStage(h) < 3) toast(L("ยังบันทึกไม่ได้: หน่วยงานต้องตอบและกองแผนงานต้องยอมรับคำตอบทุกข้อก่อน", "Not yet: every question must be answered and accepted")); else { toast(L("บันทึกผลการชี้แจงในส่วนด้านล่างเพื่อปิดการชี้แจง", "Record the minutes below to close the hearing")); if (m) m.scrollIntoView({ block: "center" }); } }));
}
{
  const bp = REV_PANELS.hearings, bb = REV_BIND.hearings;
  REV_PANELS.hearings = () => bp() + hsManage();
  REV_BIND.hearings = () => { bb(); hsBind(); };
  const hb = hearingBanner, bhb = bindHearingBanner;
  hearingBanner = function () { return hb().replace(/(<button[^>]*data-hans="([^"]+)")/g, `<input type="file" multiple data-hfile="$2" aria-label="${L("แนบไฟล์", "Attach files")}" style="max-width:190px">$1`) + (ROLE !== "plan" ? hsManage() : ""); };
  bindHearingBanner = function () {
    $$("[data-hans]").forEach(b => { const fi = () => document.querySelector(`[data-hfile="${b.dataset.hans}"]`); b.addEventListener("click", () => { const [hid, qid] = b.dataset.hans.split("|"), names = fi() ? [...fi().files].map(f => f.name) : []; if (names.length) { const q = (S.hearings.find(x => x.id === hid) || { qs: [] }).qs.find(x => x.id === qid); if (q) q.files = names; } }, true); });
    bhb(); hsBind();
  };
}

// ---------- opening a request from the consolidation page: the back button returns there ----------
let REQ_BACK = null;
function reqBackGo() { const t = REQ_BACK; REQ_BACK = null; go(t || "requests"); }
{
  const g0 = go; go = function (v) { if (v !== "request") REQ_BACK = null; return g0.apply(this, arguments); };
  const b = VIEWS.request;
  VIEWS.request = () => { const h = b(); return REQ_BACK ? h.replace(`onclick="go('requests')">${L("กลับรายการ", "Back to list")}`, `onclick="reqBackGo()">${L("กลับไปรวมคำขอหน่วยงาน", "Back to the consolidation")}`) : h; };
}

// ---------- money plan: months in quarters, amounts only; work plan: the monthly status and results moved here ----------
const rqQLabel = q => `${L("ไตรมาส", "Quarter")} ${q + 1} (${tx(kpMon(q * 3))} – ${tx(kpMon(q * 3 + 2))})`;
// the quarterly plan is the sum of the monthly plan
function rqSyncQ(r) { if (Array.isArray(r.mplan)) r.qplan = [0, 1, 2, 3].map(i => rqMSum(r.mplan.slice(i * 3, i * 3 + 3))); return r.qplan; }
function rqPlanQ(r) {
  rqSyncQ(r); const q = r.qplan || [0, 0, 0, 0], amt = reqAmount(r), tot = q.reduce((a, b) => a + Number(b || 0), 0), mx = Math.max(1, ...q.map(Number)), diff = amt - tot, mr = r.mres || [], QL = [0, 1, 2, 3].map(i => `${tx(kpMon(i * 3))}–${tx(kpMon(i * 3 + 2))}`);
  return `<section class="panel"><header><h2>${L("แผนการปฏิบัติงานและแผนการใช้จ่ายรายไตรมาส", "Quarterly work and spending plan")}</h2><span class="sp"></span>${tag(r.qplan && Math.abs(diff) < 1 && tot > 0 ? L("รวมเท่ากับวงเงินที่ขอ", "Adds up to the request") : `${L("ต่าง", "Off by")} ${fmt(diff)}`, r.qplan && Math.abs(diff) < 1 && tot > 0 ? "p-ok" : "p-warn")}</header>
    <div class="body" style="display:flex;flex-direction:column;gap:14px"><p class="sub" style="margin:0">${L("ไตรมาสคือผลรวมของแผนรายเดือนด้านล่าง (แก้ที่แผนรายเดือน) ตามแนวแบบ สงป.301 และ สงป.302 เมื่อได้รับงบประมาณ แผนนี้จะกลายเป็นแผนการใช้จ่ายใน M06", "A quarter is the sum of the monthly plan below (edit the months). Follows forms สงป.301 and สงป.302; once funded, this becomes the spending plan in M06")}</p>
      <div class="qbars">${q.map((v, i) => `<div class="qb"><div class="qbar"><i style="height:${Math.round(Number(v) / mx * 100)}%"></i></div><b class="num">${mb(v)}</b><span class="sub">${L("ไตรมาส", "Q")}${i + 1} · ${QL[i]}</span></div>`).join("")}</div>
      <div class="tbl-wrap"><table><thead><tr><th>${L("ไตรมาส", "Quarter")}</th><th class="n">${L("แผน (บาท)", "Plan (baht)")}</th><th class="n">${L("ผล (บาท)", "Result (baht)")}</th><th class="n">${L("สัดส่วนแผน", "Share")}</th><th class="n">${L("สะสม", "Cumulative")}</th></tr></thead>
        <tbody>${q.map((v, i) => `<tr><td>${L("ไตรมาส", "Quarter")} ${i + 1} <span class="sub">${QL[i]}</span></td><td class="n" data-qsum="${i}">${fmt(Number(v))}</td><td class="n">${fmt(rqMSum(mr.slice(i * 3, i * 3 + 3)))}</td><td class="n">${fmt(amt ? Number(v) / amt * 100 : 0, 1)}%</td><td class="n">${fmt(amt ? q.slice(0, i + 1).reduce((a, b) => a + Number(b || 0), 0) / amt * 100 : 0, 1)}%</td></tr>`).join("")}</tbody>
        <tfoot><tr><td>${L("รวม", "Total")}</td><td class="n">${fmt(tot)}</td><td class="n">${fmt(rqMSum(mr))}</td><td class="n" colspan="2">${L("วงเงินที่ขอ", "Requested")} ${fmt(amt)}</td></tr></tfoot></table></div></div></section>`;
}
function rqMonthPanel(r) {
  const R = rqpMonthRights(r), mp = (r.mplan = r.mplan || Array(12).fill(0)), mr = (r.mres = r.mres || Array(12).fill(null)), t = rqTarget(r), tot = rqMSum(mp), diff = t - tot, res = rqMSum(mr), dp = R.plan ? "" : "disabled", dr = R.res ? "" : "disabled", q = r.qplan || null, months = fyMonths(FORM_FY);
  return `<section class="panel" id="rq-month"><header><h2>${L("แผนค่าใช้จ่ายรายเดือน และผล (จัดเป็นกลุ่มไตรมาส)", "Monthly spending plan and result (grouped in quarters)")}</h2><span class="sp"></span>${tag(Math.abs(diff) < 1 && tot > 0 ? L("แผนรวมเท่ายอด", "Plan equals the amount") : tot === 0 ? L("ยังไม่กรอก", "Not filled") : `${diff > 0 ? L("ขาด", "Short") : L("เกิน", "Over")} ${fmt(Math.abs(diff))}`, Math.abs(diff) < 1 && tot > 0 ? "p-ok" : "p-warn")}</header>
    <div class="body" style="display:flex;flex-direction:column;gap:10px"><p class="sub" style="margin:0">${R.appr ? L("ยอดอ้างอิงคือยอดที่ได้รับอนุมัติ", "The reference is the amount the Bureau approved") : L("ยอดอ้างอิงคือยอดที่ขอ", "The reference is the amount asked")}: <b>${fmt(t)}</b> ${L("บาท", "baht")} · ${L("ผลเบิกจ่าย (บาท) กรอกได้เมื่อได้รับยอดอนุมัติแล้ว · สถานะและผลดำเนินงานอยู่ที่แท็บสถานะดำเนินการ", "the baht result can be entered once the Bureau's amount is recorded · the work status and progress are on the Work plan tab")}</p>
    <div class="tbl-wrap"><table><thead><tr><th>${L("เดือน", "Month")}</th><th class="n" style="width:190px">${L("แผน (บาท)", "Plan (baht)")}</th><th class="n" style="width:190px">${L("ผล (บาท)", "Result (baht)")}</th></tr></thead>
      <tbody>${[0, 1, 2, 3].map(g => `<tr><td colspan="3" style="background:var(--bg);font-weight:600">${rqQLabel(g)}</td></tr>${[0, 1, 2].map(k => { const i = g * 3 + k; return `<tr><td style="padding-left:24px">${esc(RQP_MON[i][0])} <span class="sub">${months[i]}</span></td><td class="n"><input type="number" min="0" step="1000" data-mp="${i}" value="${Number(mp[i]) || 0}" ${dp} aria-label="${L("แผนเดือน", "Plan, month")} ${i + 1}"></td><td class="n"><input type="number" min="0" step="1" data-mr="${i}" value="${mr[i] == null ? "" : mr[i]}" ${dr} aria-label="${L("ผลเดือน", "Result, month")} ${i + 1}"></td></tr>`; }).join("")}<tr><td style="padding-left:24px" class="sub">${L("รวมไตรมาส", "Quarter total")} ${g + 1}</td><td class="n"><b>${fmt(rqMSum(mp.slice(g * 3, g * 3 + 3)))}</b></td><td class="n"><b>${fmt(rqMSum(mr.slice(g * 3, g * 3 + 3)))}</b></td></tr>`).join("")}</tbody>
      <tfoot><tr><td>${L("รวมทั้งปี", "Total")}</td><td class="n">${fmt(tot)}</td><td class="n">${fmt(res)}${t ? ` <span class="sub">(${fmt((res / t) * 100, 1)}%)</span>` : ""}</td></tr></tfoot></table></div>
    ${R.plan ? `<div class="row" style="flex-wrap:wrap"><button class="btn" type="button" id="mp-q" ${q && rqMSum(q) > 0 ? "" : "disabled"}>${L("กระจายตามแผนรายไตรมาสเดิม", "Spread the earlier quarterly plan")}</button><button class="btn" type="button" id="mp-even">${L("กระจายเท่ากัน", "Spread evenly")}</button><button class="btn" type="button" id="mp-scale" ${tot > 0 ? "" : "disabled"}>${L("ปรับให้เท่ายอดอ้างอิง", "Scale to the reference amount")}</button><button class="btn ghost" type="button" id="mp-clr">${L("ล้างแผน", "Clear")}</button></div>` : ""}</div></section>`;
}
// the monthly work status and the progress (not money) of the work: moved here from the money plan
function rqWorkMonthPanel(r) {
  const R = rqpMonthRights(r), ms = (r.mstat = r.mstat || Array(12).fill("")), mg = (r.mprog = r.mprog || Array(12).fill(null)), mn = (r.mnote = r.mnote || Array(12).fill("")), mp = r.mplan || Array(12).fill(0), months = fyMonths(FORM_FY), can = R.plan || R.res, dd = can ? "" : "disabled";
  const prog = [0, 1, 2, 3].map(g => { const a = mg.slice(g * 3, g * 3 + 3).filter(v => v != null && v !== ""); return a.length ? Math.max(...a.map(Number)) : null; });
  return `<section class="panel" id="rq-wmonth"><header><h2>${L("สถานะและผลดำเนินงานรายเดือน (จัดเป็นกลุ่มไตรมาส)", "Monthly work status and progress (grouped in quarters)")}</h2><span class="sp"></span>${tag(`${ms.filter(Boolean).length}/12 ${L("เดือนมีสถานะ", "months with a status")}`, ms.some(Boolean) ? "p-info" : "p-mute")}</header>
    <div class="body sub">${L("ผลดำเนินงาน คือความก้าวหน้าของงาน (ร้อยละสะสม 0–100) และหมายเหตุ ไม่ใช่ผลเงิน ผลเงินอยู่ที่แท็บแผนค่าใช้จ่ายงบประมาณ", "Progress is how far the work has got (cumulative per cent, 0–100) with a note; it is not money, the baht result is on the money-plan tab")}</div>
    <div class="tbl-wrap"><table><thead><tr><th>${L("เดือน", "Month")}</th><th class="n">${L("แผนเงิน (บาท)", "Planned (baht)")}</th><th>${L("สถานะดำเนินงาน", "Work status")}</th><th class="n" style="width:150px">${L("ผลดำเนินงาน (ร้อยละสะสม)", "Progress (cumulative %)")}</th><th>${L("หมายเหตุผลดำเนินงาน", "Note on the progress")}</th></tr></thead>
      <tbody>${[0, 1, 2, 3].map(g => `<tr><td colspan="5" style="background:var(--bg);font-weight:600">${rqQLabel(g)}</td></tr>${[0, 1, 2].map(k => { const i = g * 3 + k; return `<tr><td style="padding-left:24px">${esc(RQP_MON[i][0])} <span class="sub">${months[i]}</span></td><td class="n">${fmt(Number(mp[i]) || 0)}</td><td><select data-ms="${i}" ${dd} aria-label="${L("สถานะเดือน", "Status, month")} ${i + 1}">${RQP_ST.map(([kk, l]) => `<option value="${kk}" ${ms[i] === kk ? "selected" : ""}>${esc(tx(l))}</option>`).join("")}</select></td><td class="n"><input type="number" min="0" max="100" step="1" data-mg="${i}" value="${mg[i] == null ? "" : mg[i]}" ${dd} aria-label="${L("ผลดำเนินงานเดือน", "Progress, month")} ${i + 1}"></td><td><input type="text" data-mn="${i}" value="${esc(mn[i] || "")}" ${dd} aria-label="${L("หมายเหตุเดือน", "Note, month")} ${i + 1}"></td></tr>`; }).join("")}<tr><td style="padding-left:24px" class="sub">${L("สิ้นไตรมาส", "End of quarter")} ${g + 1}</td><td class="n">${fmt(rqMSum(mp.slice(g * 3, g * 3 + 3)))}</td><td></td><td class="n"><b>${prog[g] == null ? "–" : fmt(prog[g]) + "%"}</b></td><td></td></tr>`).join("")}</tbody></table></div></section>`;
}
// the money plan: the months and their result; its quarters follow the months
function rqMonthBind(r) {
  const R = rqpMonthRights(r), q = s => document.querySelectorAll(s), re = () => { rqSyncQ(r); save(); route(); };
  q("[data-mp]").forEach(i => (i.onchange = () => { if (!R.plan) return; r.mplan[i.dataset.mp] = Math.max(0, Number(i.value) || 0); re(); }));
  q("[data-ms]").forEach(i => (i.onchange = () => { if (!(R.plan || R.res)) return; (r.mstat = r.mstat || Array(12).fill(""))[i.dataset.ms] = i.value; re(); }));
  q("[data-mg]").forEach(i => (i.onchange = () => { if (!(R.plan || R.res)) return; (r.mprog = r.mprog || Array(12).fill(null))[i.dataset.mg] = i.value === "" ? null : Math.min(100, Math.max(0, Number(i.value) || 0)); re(); }));
  q("[data-mn]").forEach(i => (i.onchange = () => { if (!(R.plan || R.res)) return; (r.mnote = r.mnote || Array(12).fill(""))[i.dataset.mn] = i.value; save(); }));
  q("[data-mr]").forEach(i => (i.onchange = () => { if (!R.res) return; const v = i.value === "" ? null : Math.max(0, Number(i.value) || 0), old = r.mres[i.dataset.mr]; r.mres[i.dataset.mr] = v; if (rqMSum(r.mres) > rqTarget(r)) { r.mres[i.dataset.mr] = old; toast(L("ผลรวมเกินยอดอ้างอิง", "The results total is above the reference amount")); route(); return; } re(); }));
  const fill = (id, how, label) => { const b = document.querySelector(id); if (b) b.onclick = () => { const m = rqMonthFill(r, how); if (!m) return; r.mplan = m; audit([`${label[0]}แผนรายเดือน`, `${label[1]} the monthly plan`], r.id); rqSyncQ(r); commit(); route(); }; };
  fill("#mp-q", "quarter", ["กระจายตามไตรมาส", "Spread by quarter,"]); fill("#mp-even", "even", ["กระจายเท่ากัน", "Spread evenly,"]); fill("#mp-scale", "scale", ["ปรับให้เท่ายอด", "Scaled to the amount,"]);
  const c = document.querySelector("#mp-clr"); if (c) c.onclick = () => { r.mplan = Array(12).fill(0); audit(["ล้างแผนรายเดือน", "Cleared the monthly plan"], r.id); rqSyncQ(r); commit(); route(); };
}
REQ_PANELS.plan = (r, ed) => rqPlanQ(r) + rqMonthPanel(r) + rqYearPanel(r);
REQ_BIND.plan = r => rqMonthBind(r);
// the quarterly plan is derived: keep it in step before the checks read it, and seed the months from the old quarterly plan
{
  const base = checks; checks = function (r) { rqSyncQ(r); return base(r); };
  Object.keys(SEEDS).forEach(k => { const prev = SEEDS[k].seed; SEEDS[k].seed = () => { const s = prev(); (s.requests || []).forEach(r => { const q = r.qplan; if (Array.isArray(q) && q.some(v => Number(v) > 0)) { r.mplan = []; q.forEach(v => { const e = Math.floor((Number(v) || 0) / 3 / 1000) * 1000; r.mplan.push(e, e, (Number(v) || 0) - 2 * e); }); r.qplan = [0, 1, 2, 3].map(i => r.mplan.slice(i * 3, i * 3 + 3).reduce((p, c) => p + c, 0)); } }); return s; }; });
}
{
  const bw = REQ_PANELS.workplan, bb = REQ_BIND.workplan;
  REQ_PANELS.workplan = (r, ed) => (rqIsInv(r) ? bw(r, ed) : "") + rqWorkMonthPanel(r);
  REQ_BIND.workplan = r => { if (rqIsInv(r) && bb) bb(r); rqMonthBind(r); };
}
