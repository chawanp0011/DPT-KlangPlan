// Fisko-KlangFinance, round R3: contract administration on top of what Fisko Procurement and Fisko Contract already hold
// (contracts, phases, one guarantee per contract, penalties, document intake with simulated OCR). Written new for the DPT
// finance division. Adds: a register keyed by Project ID with the e-GP number; a document checklist per contract (what is
// on file, what is missing, scan and OCR state); a guarantee register with a recorded check against the bank; and one alert
// centre (guarantee, end date, overdue phase, missing documents, e-GP number not linked, inspection committee member no
// longer in HR). NOT done: drafting a contract from received documents (waiting for sample contracts from the user),
// a real Document Center (only a checklist and a "kept at" reference), a live bank check (the result is typed in), real OCR.
const CX_EDIT = ["proc", "prochead"]; // who records documents and bank checks; sample assumption, to confirm
const cxEditor = () => CX_EDIT.includes(ROLE);
const CX_END_DAYS = 30, CX_BIG_PAGES = 200; // sample thresholds
const CDOC = { contract: ["ตัวสัญญา", "The contract"], attach: ["เอกสารแนบสัญญา (TOR แบบ รายการ)", "Attachments (TOR, drawings, schedules)"], refprice: ["บันทึกราคากลาง", "Reference price record"], committee: ["คำสั่งแต่งตั้งคณะกรรมการตรวจรับ", "Order appointing the inspection committee"], guarantee: ["หนังสือค้ำประกัน/หลักประกันสัญญา", "Guarantee document"], accept: ["ใบตรวจรับงาน (ต่องวด)", "Acceptance record (per phase)"] };
const CSCAN = { none: [["ยังไม่สแกน", "Not scanned"], "p-mute"], scanned: [["สแกนแล้ว ยังไม่ OCR", "Scanned, no OCR yet"], "p-warn"], ocr: [["OCR แล้ว", "OCR done"], "p-ok"] };
const cxCon = id => (S.contracts || []).find(c => c.id === id);
const cxPlan = c => famPlan(c.plan);
const cxVisible = c => !(ROLE === "div" || ROLE === "divhead") || famLine(c.line).unit === me().unit;
function cxRequired(c) {
  const r = [["contract"], ["attach"], ["refprice"], ["committee"]];
  if (c.guarantee) r.push(["guarantee"]);
  c.phases.filter(phaseAccepted).forEach(ph => r.push(["accept", ph.n]));
  return r;
}
const cxDocs = c => (S.cdocs || []).filter(d => d.contract === c.id);
function cxMissing(c) { const docs = cxDocs(c); return cxRequired(c).filter(([k, n]) => !docs.some(d => d.kind === k && (k !== "accept" || d.phase === n))); }
const cxVer = c => (c.guarantee && c.guarantee.type === "bank" ? (c.guarantee.verify ? c.guarantee.verify.result : "todo") : "na");
const CVER = { na: [["ไม่ใช่หนังสือค้ำธนาคาร", "Not a bank guarantee"], "p-mute"], todo: [["ยังไม่ตรวจกับธนาคาร", "Not checked with the bank"], "p-warn"], pending: [["ส่งตรวจแล้ว รอผล", "Sent, awaiting reply"], "p-info"], ok: [["ธนาคารยืนยันแล้ว", "Bank confirmed"], "p-ok"], mismatch: [["ข้อมูลไม่ตรง", "Does not match"], "p-bad"] };
function cxInspProblems(c) {
  const out = [];
  (c.inspectors || []).forEach(id => {
    const u = S.users.find(x => x.id === id), e = (S.emps || []).find(x => x.user === id);
    if (!u || !u.active) out.push(`${u ? tx(u.name) : id}: ${L("ผู้ใช้ถูกระงับหรือไม่มีในระบบ", "user suspended or missing")}`);
    else if (e && e.status !== "active") out.push(`${tx(u.name)}: ${L("พ้นสภาพในทะเบียน HR", "left, per the HR register")}`);
    else if (!e && S.emps) out.push(`${tx(u.name)}: ${L("ไม่พบในทะเบียนบุคลากร HR", "not in the HR register")}`);
  });
  return out;
}
// One alert list for every contract. Severity: high needs action now, mid soon, low housekeeping.
function cxAlerts(list) {
  const out = [], add = (sev, c, th, en, due, link, who) => out.push({ sev, c, title: L(th, en), due, link: link || "cx-reg", who });
  (list || (S.contracts || []).filter(cxVisible)).forEach(c => {
    if (c.status === "terminated" || c.status === "closed") return;
    const gs = guarSt(c), last = c.phases.filter(ph => !ph.cancelled).slice(-1)[0], open = c.phases.filter(ph => !ph.cancelled && !phPaid(c, ph));
    if (gs === "none") add("mid", c, "ยังไม่มีหลักประกันสัญญา", "No contract guarantee on record", TODAY, "cx-grt", "proc");
    if (gs === "expired" && open.length) add("high", c, `หลักประกันหมดอายุ ${fdate(c.guarantee.expires)} ทั้งที่ยังมีงวดค้าง`, `Guarantee expired ${fdate(c.guarantee.expires)} with phases still open`, c.guarantee.expires, "cx-grt", "proc");
    if (gs === "expiring") add("mid", c, `หลักประกันใกล้หมดอายุ ${fdate(c.guarantee.expires)}`, `Guarantee expires ${fdate(c.guarantee.expires)}`, c.guarantee.expires, "cx-grt", "proc");
    if (gs === "held" && typeof canReturnGuar === "function" && canReturnGuar(c)) add("mid", c, "ถึงกำหนดพิจารณาคืนหลักประกัน", "Time to consider returning the guarantee", TODAY, "procurement", "prochead");
    open.filter(ph => ph.due < TODAY && !phaseAccepted(ph)).forEach(ph => add("high", c, `${tx(ph.name)} เลยกำหนด ${fdate(ph.due)} ยังไม่ตรวจรับ`, `${tx(ph.name)} past due ${fdate(ph.due)}, not accepted`, ph.due, "procurement", "proc"));
    if (last && open.length && last.due >= TODAY && dayDiff(TODAY, last.due) <= CX_END_DAYS) add("mid", c, `สัญญาใกล้สิ้นสุด งวดสุดท้ายครบกำหนด ${fdate(last.due)}`, `Contract ending: last phase due ${fdate(last.due)}`, last.due, "procurement", "proc");
    const miss = cxMissing(c); if (miss.length) add(miss.some(m => m[0] === "contract") ? "high" : "low", c, `เอกสารประกอบสัญญายังขาด ${miss.length} รายการ`, `${miss.length} contract documents missing`, TODAY, "cx-doc", "proc");
    if (!(cxPlan(c).egp && cxPlan(c).egp.no)) add("mid", c, "มีสัญญาแล้วแต่ยังไม่ได้ผูกเลข e-GP กับรหัสโครงการ", "Contract exists but no e-GP number is linked to the Project ID", TODAY, "pj-reg", "proc");
    if (cxVer(c) === "mismatch") add("high", c, "ธนาคารแจ้งว่าข้อมูลหนังสือค้ำประกันไม่ตรง", "The bank says the guarantee details do not match", c.guarantee.verify.date, "cx-grt", "prochead");
    else if (cxVer(c) === "todo") add("low", c, "ยังไม่ได้บันทึกผลตรวจหนังสือค้ำประกันกับธนาคาร", "Bank check of the guarantee not recorded", TODAY, "cx-grt", "proc");
    cxInspProblems(c).forEach(p => add("high", c, `กรรมการตรวจรับ: ${p}`, `Inspection committee: ${p}`, TODAY, "procurement", "prochead"));
  });
  const rank = { high: 0, mid: 1, low: 2 };
  return out.sort((a, b) => rank[a.sev] - rank[b.sev] || String(a.due).localeCompare(String(b.due)));
}
const CX_SEV = { high: [["ต้องทำเดี๋ยวนี้", "Act now"], "p-bad"], mid: [["เร็ว ๆ นี้", "Soon"], "p-warn"], low: [["งานทะเบียน", "Housekeeping"], "p-mute"] };
const cxSev = c => { const a = cxAlerts([c]); return a.length ? a[0].sev : "ok"; };

// seed: documents and one bank guarantee per sample contract
Object.keys(SEEDS).forEach(k => {
  const prev = SEEDS[k].seed;
  SEEDS[k].seed = () => {
    const s = prev(), pr = (s.users.find(u => u.role === "proc") || s.users[0]).id, c = s.contracts || [];
    s.cdocs = [];
    const D = (con, kind, title, pages, scan, kept, phase) => s.cdocs.push({ id: "CD-" + String(s.cdocs.length + 1).padStart(4, "0"), contract: con.id, kind, phase: phase || null, title, pages, scan, kept, by: pr, t: "2026-10-10T10:00" });
    if (c[0]) { c[0].guarantee = { type: "bank", bank: "ธนาคารตัวอย่าง จำกัด (มหาชน)", no: "BG-2569-0458", amount: Math.round(c[0].amount * 0.05), expires: "2027-12-31", status: "held", t: "2026-10-02T09:00", by: pr, verify: { result: "ok", date: "2026-10-05", by: pr, note: "โทรยืนยันกับสาขา", ref: "บันทึกข้อความ 123/2569" } };
      D(c[0], "contract", "สัญญาจ้างพัฒนาระบบ", 186, "ocr", "ตู้เอกสาร 3 ชั้น 2"); D(c[0], "attach", "TOR และแบบรูปรายการ", 42, "scanned", "ตู้เอกสาร 3 ชั้น 2"); D(c[0], "committee", "คำสั่งที่ 52/2569", 3, "ocr", "แฟ้มจัดซื้อ"); D(c[0], "guarantee", "หนังสือค้ำประกัน BG-2569-0458", 2, "ocr", "แฟ้มหลักประกัน"); D(c[0], "accept", "ใบตรวจรับงวดที่ 1", 4, "ocr", "แฟ้มจัดซื้อ", 1); }
    if (c[1]) { c[1].guarantee = { type: "bank", bank: "ธนาคารตัวอย่าง จำกัด (มหาชน)", no: "BG-2570-0012", amount: Math.round(c[1].amount * 0.05), expires: "2026-11-05", status: "held", t: "2026-10-03T09:00", by: pr };
      D(c[1], "contract", "สัญญาจ้างก่อสร้าง", 412, "scanned", "ตู้เอกสาร 4 ชั้น 1"); }
    return s;
  };
});

// ---------- record types ----------
CRUD.def("cx", {
  noun: ["สัญญา", "Contract"], st: { ok: [["ไม่มีเรื่องค้าง", "Nothing pending"], "p-ok"], ...Object.fromEntries(Object.keys(CX_SEV).map(k => [k, CX_SEV[k]])) }, live: false,
  list: () => (S.contracts || []).filter(cxVisible), id: c => c.id, title: c => `${c.id} · ${tx(cxPlan(c).name)}`, sub: c => `${tx(c.vendor)} · ${baht(c.amount)}`, status: cxSev,
  search: c => `${c.id} ${c.no} ${tx(c.vendor)} ${cxPlan(c).pid || ""} ${cxPlan(c).egp ? cxPlan(c).egp.no : ""}`,
  filters: [{ id: "s", label: ["สถานะแจ้งเตือน", "Alert level"], opts: () => ["high", "mid", "low", "ok"].map(k => [k, k === "ok" ? L("ไม่มีเรื่องค้าง", "Nothing pending") : tx(CX_SEV[k][0])]), get: cxSev }, { id: "g", label: ["หลักประกัน", "Guarantee"], opts: () => Object.keys(GUAR_TAG).map(k => [k, tx(GUAR_TAG[k][0])]), get: guarSt }],
  cols: [{ h: ["สัญญา", "Contract"], c: c => `<span class="mono">${c.id}</span><div class="sub">${esc(c.no)}</div>` }, { h: ["รหัสโครงการ", "Project ID"], c: c => `<span class="mono">${cxPlan(c).pid || "–"}</span>` }, { h: ["เลข e-GP", "e-GP no."], c: c => (cxPlan(c).egp ? `<span class="mono">${esc(cxPlan(c).egp.no)}</span>` : "–") },
    { h: ["คู่สัญญา", "Counterparty"], c: c => esc(tx(c.vendor)) }, { h: ["วงเงิน (บาท)", "Amount"], n: true, c: c => fmt(c.amount) }, { h: ["งวดสุดท้าย", "Last phase"], c: c => fdate(c.phases[c.phases.length - 1].due) },
    { h: ["หลักประกัน", "Guarantee"], c: c => { const g = guarSt(c); return tag(tx(GUAR_TAG[g][0]), GUAR_TAG[g][1]); } }, { h: ["เอกสาร", "Docs"], c: c => { const n = cxRequired(c).length, m = cxMissing(c).length; return `${n - m}/${n}${m ? " " + tag(L("ขาด", "missing"), "p-warn") : ""}`; } }, { h: ["แจ้งเตือน", "Alerts"], n: true, c: c => cxAlerts([c]).length || "–" }],
  view: c => kv([[L("สัญญา", "Contract"), `<span class="mono">${c.id}</span> · ${esc(c.no)}`], [L("รหัสโครงการ", "Project ID"), `<span class="mono">${cxPlan(c).pid || "–"}</span>`], [L("เลข e-GP", "e-GP no."), cxPlan(c).egp ? `<span class="mono">${esc(cxPlan(c).egp.no)}</span>` : L("ยังไม่ผูก (ผูกที่ PJ1)", "not linked (link on PJ1)")],
    [L("รายการจัดซื้อ", "Procurement item"), `${cxPlan(c).id} · ${esc(tx(cxPlan(c).name))}`], [L("คู่สัญญา", "Counterparty"), esc(tx(c.vendor))], [L("วงเงินสัญญา", "Contract amount"), baht(c.amount)], [L("ลงนาม", "Signed"), fdate(c.signed)], [L("หน่วย", "Unit"), esc(unitName(famLine(c.line).unit))],
    [L("กรรมการตรวจรับ", "Inspection committee"), (c.inspectors || []).map(id => esc(userName(id))).join(", ") || "–"], [L("ค่าปรับสะสม", "Penalty so far"), baht(conPenalty(c))]]),
  tabs: c => [["docs", L("เอกสาร", "Documents"), (() => { const docs = cxDocs(c), miss = cxMissing(c); return `<div class="tbl-wrap"><table><thead><tr><th>${L("เอกสาร", "Document")}</th><th>${L("สถานะ", "Status")}</th><th class="n">${L("หน้า", "Pages")}</th><th>${L("สแกน/OCR", "Scan/OCR")}</th><th>${L("เก็บที่", "Kept at")}</th></tr></thead><tbody>${cxRequired(c).map(([k, n]) => { const d = docs.find(x => x.kind === k && (k !== "accept" || x.phase === n)); return `<tr><td>${esc(tx(CDOC[k]))}${n ? " " + L("งวดที่", "phase") + " " + n : ""}</td><td>${d ? tag(L("มี", "On file"), "p-ok") : tag(L("ขาด", "Missing"), "p-bad")}</td><td class="n">${d ? d.pages : "–"}</td><td>${d ? tag(tx(CSCAN[d.scan][0]), CSCAN[d.scan][1]) : "–"}</td><td>${d ? esc(d.kept || "–") : "–"}</td></tr>`; }).join("")}</tbody></table></div><p class="sub">${miss.length ? L(`ขาด ${miss.length} รายการ เพิ่มที่หน้า CX2`, `${miss.length} missing; add them on CX2`) : L("ครบตามรายการที่ระบบกำหนด", "Complete against the list the system uses")} · ${L("รายการที่ต้องมีเป็นข้อสมมุติของผม ต้องยืนยันกับระเบียบ", "the required list is my assumption, to confirm against the rules")}</p>`; })()],
    ["alerts", L("แจ้งเตือน", "Alerts"), (() => { const a = cxAlerts([c]); return a.length ? `<ul style="list-style:none;margin:0;padding:0">${a.map(x => `<li style="padding:6px 0;border-bottom:1px solid var(--line)">${tag(tx(CX_SEV[x.sev][0]), CX_SEV[x.sev][1])} ${esc(x.title)}</li>`).join("")}</ul>` : `<div class="sub">${L("ไม่มีเรื่องค้าง", "Nothing pending")}</div>`; })()]],
});

CRUD.def("cdoc", {
  noun: ["เอกสารประกอบสัญญา", "Contract document"], st: CSCAN, live: false,
  list: () => (S.cdocs || []).filter(d => { const c = cxCon(d.contract); return c && cxVisible(c); }), id: d => d.id, title: d => `${d.id} · ${tx(CDOC[d.kind])}`, sub: d => `${d.contract} · ${d.title}`, status: d => d.scan, search: d => `${d.id} ${d.contract} ${d.title} ${d.kept || ""}`,
  filters: [{ id: "k", label: ["ชนิด", "Kind"], opts: () => Object.keys(CDOC).map(k => [k, tx(CDOC[k])]), get: d => d.kind }, { id: "c", label: ["สัญญา", "Contract"], opts: () => (S.contracts || []).map(c => [c.id, c.id]), get: d => d.contract }],
  cols: [{ h: ["เลขที่", "No."], c: d => `<span class="mono">${d.id}</span>` }, { h: ["สัญญา", "Contract"], c: d => d.contract }, { h: ["ชนิด", "Kind"], c: d => `${esc(tx(CDOC[d.kind]))}${d.phase ? " " + L("งวดที่", "phase") + " " + d.phase : ""}` }, { h: ["ชื่อเอกสาร", "Title"], c: d => esc(d.title) }, { h: ["หน้า", "Pages"], n: true, c: d => d.pages },
    { h: ["เก็บที่", "Kept at"], c: d => esc(d.kept || "–") }, { h: ["เตือน", "Note"], c: d => (d.pages >= CX_BIG_PAGES && d.scan !== "ocr" ? tag(L("หลายร้อยหน้า ทยอยส่ง OCR เป็นชุด", "Hundreds of pages: send for OCR in batches"), "p-warn") : "") }],
  fields: (d, v) => [{ id: "contract", label: ["สัญญา", "Contract"], type: "select", req: true, lock: !!d, show: d ? d.contract : "", value: d ? d.contract : "", opts: (S.contracts || []).filter(cxVisible).map(c => [c.id, `${c.id} ${tx(cxPlan(c).name)}`]) },
    { id: "kind", label: ["ชนิดเอกสาร", "Kind"], type: "select", req: true, value: d ? d.kind : "attach", opts: Object.keys(CDOC).map(k => [k, tx(CDOC[k])]) }, { id: "phase", label: ["งวดที่ (เฉพาะใบตรวจรับ)", "Phase (acceptance only)"], type: "number", min: 1, value: d ? d.phase || "" : "" },
    { id: "title", label: ["ชื่อ/เลขที่เอกสาร", "Title or number"], req: true, wide: true, value: d ? d.title : "" }, { id: "pages", label: ["จำนวนหน้า", "Pages"], type: "number", req: true, min: 1, value: d ? d.pages : "" },
    { id: "scan", label: ["สแกน/OCR", "Scan/OCR"], type: "select", req: true, value: d ? d.scan : "none", opts: Object.keys(CSCAN).map(k => [k, tx(CSCAN[k][0])]) }, { id: "kept", label: ["เก็บที่ (ตู้/แฟ้ม/ที่อยู่ในระบบเก็บเอกสาร)", "Kept at (cabinet, file, or location in the document store)"], wide: true, value: d ? d.kept : "" }],
  check: (v, d) => { const e = [], con = d ? d.contract : v.contract, kind = d ? d.kind : v.kind; if (v.kind === "accept" && !v.phase) e.push({ f: "phase", m: L("ใบตรวจรับต้องระบุงวด", "An acceptance record needs a phase") });
    if (v.kind !== "accept" && (S.cdocs || []).some(x => x !== d && x.contract === con && x.kind === v.kind)) e.push({ f: "kind", m: L("สัญญานี้มีเอกสารชนิดนี้แล้ว แก้แถวเดิม", "This contract already has this kind; edit the existing row") });
    if (v.kind === "accept" && (S.cdocs || []).some(x => x !== d && x.contract === con && x.kind === "accept" && x.phase === Number(v.phase))) e.push({ f: "phase", m: L("งวดนี้มีใบตรวจรับแล้ว", "This phase already has an acceptance record") }); return e; },
  create: { can: cxEditor, label: ["เพิ่มเอกสารประกอบสัญญา", "Add a contract document"], run: v => { const d = { id: eNextId("CD-", S.cdocs), contract: v.contract, kind: v.kind, phase: v.kind === "accept" ? Number(v.phase) : null, title: v.title, pages: v.pages, scan: v.scan, kept: v.kept || "", by: me().id, t: nowIso() }; S.cdocs.push(d); audit(["เพิ่มเอกสารประกอบสัญญา", "Added a contract document"], `${d.id} ${d.contract}`); return d; } },
  edit: { can: () => cxEditor(), why: () => false, run: (d, v) => { Object.assign(d, { kind: v.kind, phase: v.kind === "accept" ? Number(v.phase) : null, title: v.title, pages: v.pages, scan: v.scan, kept: v.kept || "" }); audit(["แก้เอกสารประกอบสัญญา", "Edited a contract document"], d.id); } },
  acts: d => (cxEditor() ? [{ id: "del", label: L("ลบ", "Delete"), kind: "danger", why: true, run: (x, why) => { S.cdocs = S.cdocs.filter(y => y !== x); audit(["ลบเอกสารประกอบสัญญา", "Deleted a contract document"], `${x.id} · ${why}`); return L("ลบแล้ว", "Deleted"); } }] : []),
  view: d => kv([[L("สัญญา", "Contract"), d.contract], [L("ชนิด", "Kind"), esc(tx(CDOC[d.kind]))], d.phase && [L("งวด", "Phase"), d.phase], [L("ชื่อ/เลขที่", "Title"), esc(d.title)], [L("หน้า", "Pages"), d.pages], [L("สแกน/OCR", "Scan/OCR"), tag(tx(CSCAN[d.scan][0]), CSCAN[d.scan][1])], [L("เก็บที่", "Kept at"), esc(d.kept || "–")], [L("บันทึกโดย", "Recorded by"), `${esc(userName(d.by))} · ${fdate(d.t, true)}`]]),
});

CRUD.def("cg", {
  noun: ["หลักประกันสัญญา", "Contract guarantee"], st: CVER, live: false,
  list: () => (S.contracts || []).filter(c => c.guarantee && cxVisible(c)), id: c => c.id, title: c => `${c.id} · ${tx(c.vendor)}`, sub: c => `${tx(GUAR_TYPE[c.guarantee.type])} · ${baht(c.guarantee.amount)}`, status: cxVer, search: c => `${c.id} ${c.guarantee.no || ""} ${c.guarantee.bank || ""}`,
  filters: [{ id: "v", label: ["ผลตรวจกับธนาคาร", "Bank check"], opts: () => Object.keys(CVER).map(k => [k, tx(CVER[k][0])]), get: cxVer }, { id: "g", label: ["สถานะ", "Status"], opts: () => Object.keys(GUAR_TAG).map(k => [k, tx(GUAR_TAG[k][0])]), get: guarSt }],
  cols: [{ h: ["สัญญา", "Contract"], c: c => `<span class="mono">${c.id}</span>` }, { h: ["ชนิด", "Kind"], c: c => esc(tx(GUAR_TYPE[c.guarantee.type])) }, { h: ["ธนาคาร/เลขที่", "Bank / no."], c: c => `${esc(c.guarantee.bank || "–")}<div class="sub">${esc(c.guarantee.no || "")}</div>` }, { h: ["วงเงิน (บาท)", "Amount"], n: true, c: c => fmt(c.guarantee.amount) },
    { h: ["หมดอายุ", "Expires"], c: c => fdate(c.guarantee.expires) }, { h: ["คงเหลือ (วัน)", "Days left"], n: true, c: c => (c.guarantee.status === "returned" ? "–" : dayDiff(TODAY, c.guarantee.expires)) }, { h: ["สถานะ", "Status"], c: c => { const g = guarSt(c); return tag(tx(GUAR_TAG[g][0]), GUAR_TAG[g][1]); } }],
  fields: (c, v) => [{ id: "result", label: ["ผลตรวจกับธนาคาร", "Bank check result"], type: "select", req: true, value: c && c.guarantee.verify ? c.guarantee.verify.result : "pending", opts: [["pending", tx(CVER.pending[0])], ["ok", tx(CVER.ok[0])], ["mismatch", tx(CVER.mismatch[0])]] },
    { id: "date", label: ["วันที่ตรวจ/ได้รับผล", "Date"], type: "date", req: true, value: c && c.guarantee.verify ? c.guarantee.verify.date : TODAY }, { id: "ref", label: ["เลขที่หนังสือสอบถาม/อ้างอิง", "Letter or reference no."], value: c && c.guarantee.verify ? c.guarantee.verify.ref : "" }, { id: "note", label: ["หมายเหตุ", "Note"], type: "textarea", wide: true, value: c && c.guarantee.verify ? c.guarantee.verify.note : "" }],
  check: v => (v.date > TODAY ? [{ f: "date", m: L("วันที่ต้องไม่เกินวันนี้", "Date can't be in the future") }] : []),
  edit: { can: c => cxEditor() && c.guarantee.type === "bank", why: () => false, run: (c, v) => { c.guarantee.verify = { result: v.result, date: v.date, by: me().id, note: v.note || "", ref: v.ref || "" }; audit(["บันทึกผลตรวจหลักประกันกับธนาคาร", "Recorded the bank check of a guarantee"], `${c.id} ${v.result}`); if (v.result === "mismatch") notify(["prochead"], [`หนังสือค้ำประกันของ ${c.id} ธนาคารแจ้งข้อมูลไม่ตรง`, `Bank says the guarantee of ${c.id} does not match`], "cx-grt"); } },
  view: c => { const g = c.guarantee, ve = g.verify; return kv([[L("สัญญา", "Contract"), `${c.id} · ${esc(c.no)}`], [L("ชนิด", "Kind"), esc(tx(GUAR_TYPE[g.type]))], g.bank && [L("ธนาคาร", "Bank"), esc(g.bank)], g.no && [L("เลขที่หนังสือ", "Guarantee no."), esc(g.no)], [L("วงเงิน", "Amount"), baht(g.amount)], [L("หมดอายุ", "Expires"), fdate(g.expires)], [L("สถานะ", "Status"), tag(tx(GUAR_TAG[guarSt(c)][0]), GUAR_TAG[guarSt(c)][1])],
    [L("ผลตรวจกับธนาคาร", "Bank check"), ve ? `${tag(tx(CVER[ve.result][0]), CVER[ve.result][1])} · ${fdate(ve.date)} · ${esc(userName(ve.by))}${ve.ref ? " · " + esc(ve.ref) : ""}${ve.note ? `<div class="sub">${esc(ve.note)}</div>` : ""}` : tag(tx(CVER[cxVer(c)][0]), CVER[cxVer(c)][1])]]) + `<p class="sub">${L("ผลตรวจพิมพ์เข้าเอง ระบบไม่ได้ต่อกับธนาคาร", "The result is typed in; the system is not connected to any bank")}</p>`; },
});

// ---------- pages ----------
const CX_APP = "DPT Contract";
Object.assign(GROUPS, { cxg: ["บริหารสัญญา (กองคลัง)", "Contract administration"] });
APPS.contract.groups.push("cxg");
{ const base = appOfLink; appOfLink = l => (typeof l === "string" && l.startsWith("cx-") ? "contract" : base(l)); }
ePageDef("contract", "cx-reg", "CX1", "cxg", KROLES, ["ทะเบียนสัญญาตามรหัสโครงการ", "Contracts by Project ID"], () => {
  const C = (S.contracts || []).filter(cxVisible), A = cxAlerts(C);
  return `${eHead(CX_APP, "CX1", ["ทะเบียนสัญญาตามรหัสโครงการ", "Contract register by Project ID"], ["สัญญาทุกฉบับพร้อมรหัสโครงการ เลข e-GP หลักประกัน ความครบของเอกสาร และเรื่องแจ้งเตือน ค้นด้วยรหัสโครงการหรือเลข e-GP ได้ · อ่านจากสัญญาที่มีใน DPT Procurement ข้อมูลตัวอย่าง ยังไม่ได้ร่างสัญญาจากเอกสาร (รอตัวอย่างสัญญา)", "Every contract with Project ID, e-GP number, guarantee, document completeness and alerts; search by Project ID or e-GP number · read from the contracts in Fisko Procurement; sample data; drafting from documents is not done (waiting for sample contracts)"])}
    ${eKpis([[L("สัญญา", "Contracts"), C.length], [L("แจ้งเตือนต้องทำเดี๋ยวนี้", "Act now"), A.filter(a => a.sev === "high").length, "", A.some(a => a.sev === "high")], [L("เร็ว ๆ นี้", "Soon"), A.filter(a => a.sev === "mid").length], [L("เอกสารขาดรวม", "Missing documents"), sumv(C.map(c => cxMissing(c).length))]])}
    ${crudList("cx", { head: `<h2>${L("สัญญา", "Contracts")}</h2>` })}`;
});
ePageDef("contract", "cx-doc", "CX2", "cxg", KROLES, ["เอกสารประกอบสัญญา", "Contract documents"], () => `${eHead(CX_APP, "CX2", ["เอกสารประกอบสัญญา", "Contract documents"], ["บันทึกว่าเอกสารของแต่ละสัญญามีอะไรแล้ว ขาดอะไร สแกนหรือ OCR แล้วหรือยัง และเก็บที่ไหน เพื่อให้หาได้เมื่อ สตง. ขอตรวจย้อนหลัง · ยังไม่ใช่ระบบเก็บเอกสารจริง (Document Center) ไม่ได้เก็บไฟล์ ไม่ได้รัน OCR · เอกสารที่ต้องมีต่อสัญญาเป็นข้อสมมุติ", "What each contract has on file, what is missing, scan and OCR state and where it is kept, so it can be found when the auditors ask · not a real document store: no files are kept and no OCR runs · the list of required documents is an assumption"])}
  ${crudList("cdoc", { head: `<h2>${L("เอกสาร", "Documents")}</h2>` })}`);
ePageDef("contract", "cx-grt", "CX3", "cxg", KROLES, ["หลักประกันสัญญา", "Contract guarantees"], () => `${eHead(CX_APP, "CX3", ["หลักประกันสัญญาและการตรวจกับธนาคาร", "Guarantees and the bank check"], ["ทะเบียนหลักประกันทุกสัญญา วันหมดอายุ และบันทึกผลที่ตรวจกับธนาคาร (โทร/หนังสือสอบถาม แล้วพิมพ์ผลเข้า) · ระบบไม่ได้เชื่อมธนาคาร · การบันทึกหลักประกันและการคืน ทำที่ Fisko Procurement เดิม", "Every guarantee, its expiry and the recorded check with the bank (call or letter, then typed in) · no bank connection · recording and returning a guarantee is still done in Fisko Procurement"])}
  ${crudList("cg", { head: `<h2>${L("หลักประกัน", "Guarantees")}</h2>` })}`);
ePageDef("contract", "cx-alert", "CX4", "cxg", KROLES, ["ศูนย์แจ้งเตือนสัญญา", "Contract alert centre"], () => {
  const A = cxAlerts();
  return `${eHead(CX_APP, "CX4", ["ศูนย์แจ้งเตือนสัญญา", "Contract alert centre"], [`รวมเรื่องที่ต้องตามของสัญญาทั้งหมดในที่เดียว: หลักประกัน สิ้นสุดสัญญา งวดเลยกำหนด เอกสารขาด เลข e-GP ที่ยังไม่ผูก และกรรมการตรวจรับที่ไม่อยู่ในทะเบียน HR · เกณฑ์ ${CX_END_DAYS} วันและจำนวนหน้าเป็นค่าตัวอย่าง`, `All contract follow-ups in one place: guarantees, ending contracts, overdue phases, missing documents, e-GP numbers not linked, and committee members not in the HR register · the ${CX_END_DAYS}-day and page thresholds are samples`])}
    ${eKpis([[L("ต้องทำเดี๋ยวนี้", "Act now"), A.filter(a => a.sev === "high").length, "", A.some(a => a.sev === "high")], [L("เร็ว ๆ นี้", "Soon"), A.filter(a => a.sev === "mid").length], [L("งานทะเบียน", "Housekeeping"), A.filter(a => a.sev === "low").length]])}
    <section class="panel"><header><h2>${L("รายการแจ้งเตือน", "Alerts")}</h2><span class="sp"></span><span class="sub">${A.length} ${L("รายการ", "items")}</span></header>
    ${A.length ? `<div class="tbl-wrap"><table><thead><tr><th>${L("ระดับ", "Level")}</th><th>${L("สัญญา", "Contract")}</th><th>${L("เรื่อง", "What")}</th><th>${L("กำหนด", "Date")}</th><th>${L("ผู้ดูแล", "Owner")}</th><th></th></tr></thead><tbody>${A.map(a => `<tr><td>${tag(tx(CX_SEV[a.sev][0]), CX_SEV[a.sev][1])}</td><td><span class="mono">${a.c.id}</span><div class="sub">${cxPlan(a.c).pid || ""}</div></td><td>${esc(a.title)}</td><td>${fdate(a.due)}</td><td>${esc(tx(ROLES[a.who]))}</td><td><button class="btn" type="button" data-jump="${a.link}">${L("เปิด", "Open")}</button></td></tr>`).join("")}</tbody></table></div>` : `<div class="body sub">${dotI("ok")}${L("ไม่มีเรื่องค้าง", "Nothing pending")}</div>`}</section>`;
});
{
  const base = famTasks;
  famTasks = R => {
    base(R);
    if (!S.cdocs || !(cxEditor() || ROLE === "prochead")) return;
    const A = cxAlerts().filter(a => a.sev === "high" && (a.who === ROLE || (ROLE === "prochead" && a.who === "proc")));
    A.slice(0, 5).forEach(a => R(`${a.c.id}: ${a.title}`, "", a.due, a.link, "p-warn"));
  };
}
Object.assign(NAV_ICON, { "cx-reg": "file", "cx-doc": "inbox", "cx-grt": "layers", "cx-alert": "clock" });
