// Fisko-KlangFinance, budget round Q2 (12 Nov 2569): the House and Senate committee observations (ข้อสังเกตกรรมาธิการ สส/สว).
// What the planning division asked for: take the file the Budget Bureau gives, keep only the agency's own items, and let the
// division key items in by hand. The register lives in S.observations (it already held three samples that the briefing tab of page
// B6 shows; those rows keep their text and response, and gain a house, a committee, a date, an owner and a status).
//  - The house is สส (House of Representatives, "hr") or สว (Senate, "sen").
//  - Import (page BQ7): a CSV or tab-separated file with a header row. I have NOT seen the Bureau's real file, so the format is my
//    assumption: the columns are found by name in Thai or English (house, committee, date, agency, observation are needed; fiscal
//    year and item are optional). The agency column is matched against the names in the "agency names" setting (starts as the
//    department's name in Thai and English): a row whose agency contains one of them is the agency's own; the others are skipped
//    unless the box to take them is ticked. A row already in the register (same house, committee, date, agency and text) is skipped
//    as a duplicate. A unit is set when the agency text contains a unit's name.
//  - Manual entry and edit: the form on the same page. A division sees the items given to its unit and can record the reply;
//    Planning keeps everything. An answered item needs a reply text; closing needs one too.
// Dates: 2026-11-05 or 5/11/2569 (a year above 2400 is read as Buddhist and 543 is taken off). Nothing is sent to or read from the
// Bureau or the committees; the file is read in the browser.
const OB_APP = "DPT Budget";
const OB_HOUSE = { hr: ["สภาผู้แทนราษฎร (สส)", "House of Representatives"], sen: ["วุฒิสภา (สว)", "Senate"] };
const OB_ST = { open: [["รอตอบ", "Open"], "p-warn"], answered: [["ตอบแล้ว", "Answered"], "p-info"], closed: [["ปิดแล้ว", "Closed"], "p-ok"] };
const obCan = () => ROLE === "plan";
const obMine = o => !(typeof unitRole === "function" && unitRole()) || o.unit === me().unit;
const obKey = o => [o.house, String(o.committee || "").trim(), o.date, String(o.agency || "").trim(), String(tx(o.text) || "").replace(/\s+/g, " ").trim()].join("|").toLowerCase();
const obNext = () => `OB-${String(Math.max(0, ...(S.observations || []).map(x => Number(String(x.id || "").replace(/\D/g, "")) || 0)) + 1).padStart(3, "0")}`;
const obHouse = s => { const t = String(s || "").toLowerCase().replace(/[\s.]/g, ""); return /สว|วุฒิ|sen/.test(t) ? "sen" : /สส|ผู้แทน|hr|house/.test(t) ? "hr" : ""; };
function obDate(s) { const t = String(s || "").trim(); let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/); if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`; m = t.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/); if (m) { const y = Number(m[3]) > 2400 ? Number(m[3]) - 543 : Number(m[3]); return `${y}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`; } return ""; }
const obUnitOf = agency => { const a = String(agency || ""); const u = (S.units || []).filter(x => x.parent).find(x => x.name.some(n => n && a.includes(n))); return u ? u.id : ""; };
const obOurs = agency => (((S.obsCfg || {}).names) || []).some(n => n && String(agency || "").toLowerCase().includes(String(n).toLowerCase()));

// ---------- the file ----------
const OB_COLS = { house: ["HOUSE", "สภา", "สส/สว", "CHAMBER", "สภาที่พิจารณา"], committee: ["COMMITTEE", "คณะกรรมาธิการ", "กรรมาธิการ"], date: ["DATE", "วันที่", "วันที่ประชุม", "MEETING_DATE"], fy: ["FY", "ปีงบประมาณ", "FISCAL_YEAR"], agency: ["AGENCY", "หน่วยงาน", "หน่วยรับงบประมาณ"], ref: ["REF", "รายการ", "โครงการ", "ITEM"], text: ["OBSERVATION", "ข้อสังเกต", "TEXT", "ข้อสังเกตกรรมาธิการ"] };
let OB_IMP = { text: "", name: "", rows: null, err: "", all: false };
function obCheck(text) {
  const all = ecParse(text); if (!all.length) return { err: L("ไม่มีข้อมูล", "No data"), rows: [] };
  const head = all[0].map(x => String(x).trim().toUpperCase()), idx = {}; Object.keys(OB_COLS).forEach(k => { idx[k] = head.findIndex(h => OB_COLS[k].some(a => a.toUpperCase() === h)); });
  const need = ["house", "committee", "date", "agency", "text"].filter(k => idx[k] < 0); if (need.length) return { err: `${L("ไม่พบคอลัมน์", "Missing columns")}: ${need.map(k => OB_COLS[k][0]).join(", ")}`, rows: [] };
  const seen = new Set((S.observations || []).map(obKey)), g = (r, k) => (idx[k] < 0 ? "" : String(r[idx[k]] === undefined ? "" : r[idx[k]]).trim());
  const rows = all.slice(1).map((r, i) => { const o = { n: i + 2, house: obHouse(g(r, "house")), committee: g(r, "committee"), date: obDate(g(r, "date")), fy: Number(g(r, "fy")) || 0, agency: g(r, "agency"), ref: g(r, "ref"), text: [g(r, "text"), g(r, "text")], err: "", dup: false };
    if (!o.house) o.err = `${L("สภาไม่รู้จัก", "Unknown house")}: ${g(r, "house") || "–"}`; else if (!o.committee) o.err = L("ไม่มีชื่อคณะกรรมาธิการ", "No committee"); else if (!o.date) o.err = `${L("วันที่อ่านไม่ได้", "Unreadable date")}: ${g(r, "date") || "–"}`; else if (!o.text[0]) o.err = L("ไม่มีข้อสังเกต", "No observation text");
    o.ours = obOurs(o.agency); o.unit = obUnitOf(o.agency); const k = obKey(o); if (!o.err && seen.has(k)) o.dup = true; if (!o.err) seen.add(k); return o; });
  return { err: "", rows };
}
function obApply(rows, all) {
  let add = 0, other = 0, dup = 0; const ids = [];
  rows.forEach(r => { if (r.err) return; if (r.dup) { dup++; return; } if (!r.ours && !all) { other++; return; }
    const o = { id: obNext(), house: r.house, committee: r.committee, date: r.date, fy: r.fy || FORM_FY, agency: r.agency, unit: r.unit, ref: r.ref, text: r.text, resp: ["", ""], status: "open", source: "import", by: me().id, t: nowIso() }; S.observations.push(o); ids.push(o.id); add++; });
  return { add, other, dup, ids };
}
const obSample = () => { const org = tx(S.org), u = (S.units || []).filter(x => x.parent), nm = i => (u[i] ? tx(u[i].name) : ""); return ["house,committee,date,fy,agency,ref,observation",
  `สส,คณะกรรมาธิการวิสามัญพิจารณาร่าง พ.ร.บ.งบประมาณ (ตัวอย่าง),12/1/2570,${FORM_FY},${org} ${nm(2)},ระบบบริการประชาชน,ควรจัดทำแผนบูรณาการระบบกับหน่วยงานอื่นก่อนขอปีถัดไป`,
  `สว,คณะกรรมาธิการวิสามัญพิจารณาร่าง พ.ร.บ.งบประมาณ (ตัวอย่าง),2027-01-20,${FORM_FY},${org},การเบิกจ่าย,ควรรายงานความคืบหน้าการเบิกจ่ายงบลงทุนรายไตรมาส`,
  `สส,คณะกรรมาธิการวิสามัญพิจารณาร่าง พ.ร.บ.งบประมาณ (ตัวอย่าง),12/1/2570,${FORM_FY},หน่วยงานอื่นตัวอย่าง,โครงการอื่น,ข้อสังเกตของหน่วยงานอื่น ไม่ควรนำเข้า`,
  `สส,คณะกรรมาธิการตัวอย่าง,12/1/2570,${FORM_FY},${org},-,ข้อสังเกตที่สภาไม่ถูกต้อง`.replace("สส,", "xx,"),
  `สว,คณะกรรมาธิการวิสามัญพิจารณาร่าง พ.ร.บ.งบประมาณ (ตัวอย่าง),2027-01-20,${FORM_FY},${org},การเบิกจ่าย,ควรรายงานความคืบหน้าการเบิกจ่ายงบลงทุนรายไตรมาส`].join("\n"); };
const obCsv = list => { const q = s => (/[",\n]/.test(String(s)) ? `"${String(s).replace(/"/g, '""')}"` : String(s)); return ["id,house,committee,date,fy,agency,unit,ref,observation,reply,status", ...list.map(o => [o.id, o.house === "hr" ? "สส" : "สว", o.committee, o.date, o.fy || "", o.agency || "", o.unit ? unitName(o.unit) : "", o.ref || "", tx(o.text), tx(o.resp), tx(OB_ST[o.status || "answered"][0])].map(q).join(","))].join("\n"); };

// ---------- the register ----------
CRUD.def("cmobs", {
  noun: ["ข้อสังเกตกรรมาธิการ", "Committee observation"], st: OB_ST, status: o => o.status || "answered", gone: () => false, id: o => o.id, title: o => `${o.id} · ${tx(o.text)}`, sub: o => `${tx(OB_HOUSE[o.house || "hr"])} · ${o.committee || ""}`,
  list: () => (S.observations || []).filter(obMine).slice().sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")) || String(a.id).localeCompare(String(b.id))), search: o => `${o.id} ${tx(o.text)} ${tx(o.resp)} ${o.committee || ""} ${o.agency || ""} ${o.ref || ""}`,
  filters: [{ id: "hs", label: ["สภา", "House"], opts: () => Object.keys(OB_HOUSE).map(k => [k, tx(OB_HOUSE[k])]), get: o => o.house || "hr" }, { id: "fy", label: ["ปีงบประมาณ", "FY"], opts: () => [...new Set((S.observations || []).map(o => o.fy).filter(Boolean))].sort().map(y => [String(y), String(y)]), get: o => String(o.fy || "") }, { id: "un", label: ["หน่วยที่รับผิดชอบ", "Unit"], opts: () => [...new Set((S.observations || []).map(o => o.unit).filter(Boolean))].map(u => [u, unitName(u)]), get: o => o.unit || "" }],
  cols: [{ h: ["เลขที่", "No."], c: o => `<span class="mono">${o.id}</span>` }, { h: ["สภา", "House"], c: o => esc(o.house === "sen" ? "สว" : "สส") }, { h: ["วันที่", "Date"], c: o => (o.date ? fdate(o.date) : "–") }, { h: ["คณะกรรมาธิการ", "Committee"], c: o => `<span class="sub">${esc(o.committee || "–")}</span>` },
    { h: ["ข้อสังเกต", "Observation"], c: o => esc(tx(o.text)) }, { h: ["หน่วยที่รับผิดชอบ", "Unit"], c: o => `<span class="sub">${o.unit ? esc(unitName(o.unit)) : "–"}</span>` }, { h: ["ที่มา", "Source"], c: o => `<span class="sub">${o.source === "import" ? L("นำเข้า", "Imported") : L("คีย์เอง", "Typed")}</span>` }],
  fields: o => [{ id: "house", label: ["สภา", "House"], type: "select", req: true, value: o ? o.house || "hr" : "hr", opts: Object.keys(OB_HOUSE).map(k => [k, tx(OB_HOUSE[k])]) }, { id: "committee", label: ["คณะกรรมาธิการ", "Committee"], req: true, wide: true, value: o ? o.committee || "" : "" },
    { id: "date", label: ["วันที่ประชุม", "Meeting date"], type: "date", req: true, value: o ? o.date || "" : TODAY }, { id: "fy", label: ["ปีงบประมาณที่พิจารณา", "Fiscal year considered"], type: "number", req: true, min: 2560, max: 2600, value: o ? o.fy || FORM_FY : FORM_FY },
    { id: "agency", label: ["หน่วยงานตามข้อสังเกต", "Agency named"], value: o ? o.agency || tx(S.org) : tx(S.org), wide: true }, { id: "unit", label: ["หน่วยที่รับผิดชอบตอบ", "Unit that answers"], type: "select", value: o ? o.unit || "" : "", blank: L("— ไม่ระบุ —", "— none —"), opts: (S.units || []).filter(u => u.parent).map(u => [u.id, tx(u.name)]) },
    { id: "ref", label: ["รายการ/โครงการที่เกี่ยวข้อง", "Related item or project"], value: o ? o.ref || "" : "" },
    { id: "text", label: ["ข้อสังเกต", "Observation"], type: "textarea", req: true, wide: true, value: o ? tx(o.text) : "" }, { id: "resp", label: ["คำตอบ/สิ่งที่หน่วยงานทำ", "Reply / what the agency did"], type: "textarea", wide: true, value: o ? tx(o.resp) : "" },
    { id: "status", label: ["สถานะ", "Status"], type: "select", req: true, value: o ? o.status || "answered" : "open", opts: Object.keys(OB_ST).map(k => [k, tx(OB_ST[k][0])]) }],
  check: v => (v.status !== "open" && !String(v.resp || "").trim() ? [{ f: "resp", m: L("สถานะตอบแล้วหรือปิด ต้องมีคำตอบ", "Answered or closed needs a reply") }] : []),
  create: { can: obCan, label: ["เพิ่มข้อสังเกต", "Add an observation"], run: v => { const o = { id: obNext(), house: v.house, committee: v.committee.trim(), date: v.date, fy: Number(v.fy), agency: v.agency || "", unit: v.unit || "", ref: v.ref || "", text: [v.text.trim(), v.text.trim()], resp: [v.resp || "", v.resp || ""], status: v.status, source: "manual", by: me().id, t: nowIso() }; S.observations.push(o); audit(["เพิ่มข้อสังเกตกรรมาธิการ", "Added a committee observation"], `${o.id} ${o.house}`); return o; } },
  edit: { can: o => obCan(), run: (o, v) => { Object.assign(o, { house: v.house, committee: v.committee.trim(), date: v.date, fy: Number(v.fy), agency: v.agency || "", unit: v.unit || "", ref: v.ref || "", text: [v.text.trim(), v.text.trim()], resp: [v.resp || "", v.resp || ""], status: v.status }); audit(["แก้ข้อสังเกตกรรมาธิการ", "Changed a committee observation"], o.id); } },
  acts: o => { const out = [], st = o.status || "answered", mineUnit = typeof unitRole === "function" && unitRole() && o.unit === me().unit;
    if ((obCan() || mineUnit) && st !== "closed") out.push({ id: "reply", label: st === "open" ? L("บันทึกคำตอบ", "Record the reply") : L("แก้คำตอบ", "Change the reply"), kind: "primary", why: true, whyLabel: L("คำตอบ/สิ่งที่หน่วยงานทำ", "Reply / what the agency did"), whyMin: 5, run: (_, why) => { o.resp = [why, why]; o.status = "answered"; o.repliedBy = me().id; o.repliedAt = nowIso(); audit(["ตอบข้อสังเกตกรรมาธิการ", "Replied to a committee observation"], o.id); return L("บันทึกคำตอบแล้ว", "Reply saved"); } });
    if (obCan() && st === "answered") out.push({ id: "close", label: L("ปิดข้อสังเกต", "Close it"), kind: "ghost", run: () => { o.status = "closed"; audit(["ปิดข้อสังเกตกรรมาธิการ", "Closed a committee observation"], o.id); return L("ปิดแล้ว", "Closed"); } });
    if (obCan() && st === "closed") out.push({ id: "reopen", label: L("เปิดใหม่", "Reopen"), kind: "ghost", why: true, run: (_, why) => { o.status = "open"; audit(["เปิดข้อสังเกตกรรมาธิการใหม่", "Reopened a committee observation"], `${o.id} ${why || ""}`); return L("เปิดใหม่แล้ว", "Reopened"); } });
    if (obCan()) out.push({ id: "del", label: L("ลบ", "Delete"), kind: "danger", confirm: L("ลบข้อสังเกตนี้ออกจากทะเบียน", "Delete this observation"), run: () => { S.observations = S.observations.filter(x => x !== o); audit(["ลบข้อสังเกตกรรมาธิการ", "Deleted a committee observation"], o.id); return L("ลบแล้ว", "Deleted"); } });
    return out; },
  view: o => kv([[L("เลขที่", "No."), o.id], [L("สภา", "House"), esc(tx(OB_HOUSE[o.house || "hr"]))], [L("คณะกรรมาธิการ", "Committee"), esc(o.committee || "–")], [L("วันที่ประชุม", "Meeting date"), o.date ? fdate(o.date) : "–"], [L("ปีงบประมาณ", "FY"), String(o.fy || "–")], [L("หน่วยงาน", "Agency"), esc(o.agency || "–")], [L("หน่วยที่รับผิดชอบ", "Unit"), o.unit ? esc(unitName(o.unit)) : "–"], [L("รายการที่เกี่ยวข้อง", "Related"), esc(o.ref || "–")],
    [L("ข้อสังเกต", "Observation"), esc(tx(o.text))], [L("คำตอบ", "Reply"), esc(tx(o.resp)) || "–"], [L("ที่มา", "Source"), o.source === "import" ? L("นำเข้าจากไฟล์", "Imported from a file") : L("คีย์เอง", "Typed")]]),
});

// ---------- seed ----------
Object.keys(SEEDS).forEach(k => {
  const prev = SEEDS[k].seed;
  SEEDS[k].seed = () => {
    const s = prev(), F = FORM_FY, ds = [`${F - 544}-12-18`, `${F - 544}-12-18`, `${F - 544}-12-19`];
    s.obsCfg = { names: [s.org[0], s.org[1]] }; s.obsImports = [];
    (s.observations || []).forEach((o, i) => { o.id = o.id || `OB-${String(i + 1).padStart(3, "0")}`; o.house = o.house || (i === 1 ? "sen" : "hr"); o.committee = o.committee || "คณะกรรมาธิการพิจารณางบประมาณปีก่อน (ตัวอย่าง)"; o.date = o.date || ds[i % 3]; o.fy = o.fy || F - 1; o.agency = o.agency || s.org[0]; o.unit = o.unit || ""; o.ref = o.ref || ""; o.status = o.status || "answered"; o.source = o.source || "manual"; });
    return s;
  };
});

// ---------- page BQ7 ----------
ePageDef("budget", "bq-obs", "BQ7", "form", KROLES, ["ข้อสังเกตกรรมาธิการ สส/สว", "House and Senate committee observations"], () => {
  const all = (S.observations || []).filter(obMine), n = f => all.filter(f).length, R = OB_IMP.rows, can = obCan(), names = ((S.obsCfg || {}).names || []).join(", "), ours = R ? R.filter(x => !x.err && !x.dup && (x.ours || OB_IMP.all)) : [];
  const byCm = {}; all.forEach(o => { const k = `${o.house || "hr"}|${o.committee || "–"}`; (byCm[k] = byCm[k] || { open: 0, answered: 0, closed: 0, n: 0 }); byCm[k][o.status || "answered"]++; byCm[k].n++; });
  return `${eHead(OB_APP, "BQ7", ["ข้อสังเกตกรรมาธิการ สส/สว", "House and Senate committee observations"], ["นำเข้าไฟล์ข้อสังเกตจากสำนักงบประมาณ ระบบคัดเฉพาะของหน่วยงาน (ตามชื่อหน่วยงานที่ตั้งไว้) คีย์เพิ่มเองได้ แยกสภาผู้แทนราษฎรกับวุฒิสภา ติดตามคำตอบ · รูปแบบไฟล์เป็นข้อสมมุติของผม เพราะยังไม่เคยเห็นไฟล์จริงของ สงป. ต้องมีคอลัมน์ สภา, คณะกรรมาธิการ, วันที่, หน่วยงาน, ข้อสังเกต (ปีงบประมาณและรายการไม่บังคับ) · ไม่ได้รับไฟล์จาก สงป. เอง", "Import the observations file from the Budget Bureau; the system keeps the agency's own items (by the agency names set here), you can key more by hand, House and Senate are kept apart, and replies are tracked · the file format is my assumption since I have not seen the Bureau's real file: columns house, committee, date, agency, observation (fiscal year and item optional) · nothing is received from the Bureau"])}
    ${eKpis([[L("ทั้งหมด", "All"), all.length], [L("สภาผู้แทนราษฎร (สส)", "House"), n(o => (o.house || "hr") === "hr")], [L("วุฒิสภา (สว)", "Senate"), n(o => o.house === "sen")], [L("รอตอบ", "Open"), n(o => o.status === "open"), "", n(o => o.status === "open") > 0], [L("ตอบแล้ว/ปิด", "Answered or closed"), n(o => o.status !== "open")]])}
    <section class="panel"><header><h2>${L("นำเข้าไฟล์จาก สงป.", "Import the file from the Budget Bureau")}</h2></header><div class="body">
      <div class="row" style="flex-wrap:wrap"><label for="ob-names"><b style="font-weight:600">${L("ชื่อหน่วยงานที่ใช้คัดเฉพาะของหน่วยงาน (คั่นด้วยคอมมา)", "Agency names used to keep our own items (comma separated)")}</b></label><input type="text" id="ob-names" value="${esc(names)}" style="min-width:300px;flex:1" ${can ? "" : "disabled"}>${can ? `<button class="btn" type="button" id="ob-names-save">${L("บันทึกชื่อ", "Save names")}</button>` : ""}</div>
      <div class="row" style="margin-top:8px;flex-wrap:wrap"><input type="file" id="ob-file" accept=".csv,.tsv,.txt" ${can ? "" : "disabled"}><button class="btn" type="button" id="ob-sample" ${can ? "" : "disabled"}>${L("ใส่ไฟล์ตัวอย่าง", "Fill a sample file")}</button><button class="btn" type="button" id="ob-check" ${can ? "" : "disabled"}>${L("ตรวจไฟล์", "Check")}</button><label class="field-inline"><input type="checkbox" id="ob-all" ${OB_IMP.all ? "checked" : ""} ${can ? "" : "disabled"}> ${L("นำเข้าของหน่วยงานอื่นด้วย", "Take other agencies' items too")}</label></div>
      <textarea id="ob-text" rows="4" style="width:100%;font-family:monospace;margin-top:8px" ${can ? "" : "disabled"}>${esc(OB_IMP.text)}</textarea>
      ${R && R.length ? `<div class="tbl-wrap" style="max-height:240px;overflow:auto"><table><thead><tr><th>#</th><th>${L("สภา", "House")}</th><th>${L("หน่วยงาน", "Agency")}</th><th>${L("ข้อสังเกต", "Observation")}</th><th>${L("ผลตรวจ", "Check")}</th></tr></thead><tbody>${R.slice(0, 200).map(x => `<tr><td>${x.n}</td><td>${esc(x.house === "sen" ? "สว" : x.house === "hr" ? "สส" : "–")}</td><td class="sub">${esc(x.agency)}</td><td>${esc(tx(x.text))}</td><td>${x.err ? tag(esc(x.err), "p-bad") : x.dup ? tag(L("ซ้ำ ข้าม", "Duplicate"), "p-mute") : x.ours ? tag(L("ของหน่วยงาน พร้อมนำเข้า", "Ours, ready"), "p-ok") : tag(OB_IMP.all ? L("หน่วยงานอื่น นำเข้า", "Other, taken") : L("หน่วยงานอื่น ข้าม", "Other, skipped"), OB_IMP.all ? "p-info" : "p-mute")}</td></tr>`).join("")}</tbody></table></div>
        <div class="row" style="margin-top:8px"><button class="btn primary" type="button" id="ob-go" ${ours.length && can ? "" : "disabled"}>${L("นำเข้า", "Import")} ${ours.length} ${L("รายการ", "items")}</button><button class="btn ghost" type="button" id="ob-clear">${L("ล้าง", "Clear")}</button></div>` : ""}
      ${OB_IMP.err ? `<p>${tag(esc(OB_IMP.err), "p-bad")}</p>` : ""}${!can ? `<p class="sub">${L("เฉพาะกองแผนงานนำเข้าและตั้งชื่อหน่วยงาน", "Only Planning imports and sets the names")}</p>` : ""}
      ${(S.obsImports || []).length ? `<p class="sub">${L("นำเข้าล่าสุด", "Last import")}: ${fdate((S.obsImports[0] || {}).t, true)} · ${esc((S.obsImports[0] || {}).file || "")} · ${(S.obsImports[0] || {}).add} ${L("เพิ่ม", "added")}, ${(S.obsImports[0] || {}).other} ${L("ของหน่วยงานอื่น", "other agencies")}, ${(S.obsImports[0] || {}).dup} ${L("ซ้ำ", "duplicates")}</p>` : ""}</div></section>
    <section class="panel"><header><h2>${L("สรุปตามคณะกรรมาธิการ", "Summary by committee")}</h2><span class="sp"></span><button class="btn" type="button" id="ob-export">${L("ส่งออก CSV", "Export CSV")}</button></header>
      ${Object.keys(byCm).length ? `<div class="tbl-wrap"><table><thead><tr><th>${L("สภา", "House")}</th><th>${L("คณะกรรมาธิการ", "Committee")}</th><th class="n">${L("ทั้งหมด", "All")}</th><th class="n">${L("รอตอบ", "Open")}</th><th class="n">${L("ตอบแล้ว", "Answered")}</th><th class="n">${L("ปิด", "Closed")}</th></tr></thead><tbody>${Object.keys(byCm).sort().map(k => { const [h, c] = k.split("|"), x = byCm[k]; return `<tr><td>${esc(h === "sen" ? "สว" : "สส")}</td><td>${esc(c)}</td><td class="n">${x.n}</td><td class="n">${x.open}</td><td class="n">${x.answered}</td><td class="n">${x.closed}</td></tr>`; }).join("")}</tbody></table></div>` : `<div class="body sub">${L("ยังไม่มีข้อสังเกต", "No observations yet")}</div>`}</section>
    ${crudList("cmobs", { head: `<h2>${L("ข้อสังเกตกรรมาธิการ", "Committee observations")}</h2>` })}`;
}, () => {
  const t = $("#ob-text"), sync = () => { if (t) OB_IMP.text = t.value; OB_IMP.all = !!($("#ob-all") && $("#ob-all").checked); };
  const run = () => { const r = obCheck(OB_IMP.text); OB_IMP.rows = r.err ? null : r.rows; OB_IMP.err = r.err; };
  const sv = $("#ob-names-save"); if (sv) sv.onclick = () => { S.obsCfg = S.obsCfg || {}; S.obsCfg.names = $("#ob-names").value.split(",").map(x => x.trim()).filter(Boolean); audit(["ตั้งชื่อหน่วยงานสำหรับคัดข้อสังเกต", "Set the agency names for observations"], S.obsCfg.names.join(", ")); commit(); if (OB_IMP.text) run(); route(); toast(L("บันทึกแล้ว", "Saved")); };
  const sm = $("#ob-sample"); if (sm) sm.onclick = () => { OB_IMP.text = obSample(); OB_IMP.name = L("ตัวอย่าง", "sample"); sync(); OB_IMP.text = obSample(); run(); route(); };
  const ck = $("#ob-check"); if (ck) ck.onclick = () => { sync(); run(); route(); }; const al = $("#ob-all"); if (al) al.onchange = () => { sync(); route(); };
  const f = $("#ob-file"); if (f) f.onchange = e => { const file = e.target.files[0]; if (!file) return; const rd = new FileReader(); rd.onload = () => { OB_IMP.text = String(rd.result); OB_IMP.name = file.name; run(); route(); }; rd.readAsText(file, "utf-8"); };
  const go = $("#ob-go"); if (go) go.onclick = () => { sync(); const r = obCheck(OB_IMP.text); if (r.err) return; const x = obApply(r.rows, OB_IMP.all); (S.obsImports = S.obsImports || []).unshift({ id: `OI-${String(S.obsImports.length + 1).padStart(2, "0")}`, t: nowIso(), by: me().id, file: OB_IMP.name || "", add: x.add, other: x.other, dup: x.dup }); audit(["นำเข้าข้อสังเกตกรรมาธิการ", "Imported committee observations"], `+${x.add} · ${x.other} ${"other"} · ${x.dup} dup · ${OB_IMP.name || ""}`); OB_IMP = { text: "", name: "", rows: null, err: "", all: false }; commit(); route(); toast(L(`นำเข้าแล้ว ${x.add} รายการ ข้ามของหน่วยงานอื่น ${x.other} ซ้ำ ${x.dup}`, `Imported ${x.add}; skipped ${x.other} of other agencies and ${x.dup} duplicates`)); };
  const cl = $("#ob-clear"); if (cl) cl.onclick = () => { OB_IMP = { text: "", name: "", rows: null, err: "", all: false }; route(); };
  const ex = $("#ob-export"); if (ex) ex.onclick = () => { const blob = new Blob(["﻿" + obCsv((S.observations || []).filter(obMine))], { type: "text/csv;charset=utf-8" }), a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "committee_observations.csv"; document.body.appendChild(a); a.click(); a.remove(); };
});
Object.assign(NAV_ICON, { "bq-obs": "book" });
