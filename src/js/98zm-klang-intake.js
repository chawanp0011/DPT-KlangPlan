// Fisko-KlangFinance, budget round Q6 (12 Nov 2569): who sent a request in, how it came, and the Planning division's intake.
// 1. The request page showed the sending unit only as small grey text under the title and held no contact, channel or letter
//    details. The main tab now has a panel "who sent it and how it came in": the unit that sent it (the unit that owns the
//    request), the agency name as written on the cover letter, the person who sent it (name, position, phone, email), the channel
//    it came by (system, letter, email, imported from a document, carried over from an earlier year's commitment, made by Planning
//    for the unit) and the cover letter's number and date. The unit edits these while the request is a draft or returned. The
//    request check warns when the person's name or phone is missing (a warning only, it never blocks sending).
// 2. (Removed on 13 Nov 2569 at the user's word: "receive and map requests: cut it, use Requests instead".) Page BQ11 was the Planning division's intake (what the user listed as B2, B3 and C3):
//    - receive: each request that has been sent gets a date and a receipt number from Planning;
//    - check the link to the strategy: the system lists what it can see (reason, output and activity chosen, KPI, strategy item,
//      amount, contact, quarterly plan) and Planning records its own decision (linked / to be fixed / not linked) with a note;
//    - map: Planning confirms, or changes, which output-level node (output, project or fund) and activity the request sits under.
//      A change writes the new activity on the request and keeps what it was; if the unit later changes the activity, the map
//      is shown as out of date;
//    - make a request for a unit: Planning can open a draft for a unit from a letter (the unit then fills it and sends it).
//    Who: Planning edits everything on BQ11; a unit sees its own requests there, read only.
// Not done: Planning cannot yet edit the lines of a request that belongs to a unit (it makes the draft, the unit completes it);
// returning a request to the unit after a "to be fixed" decision uses the existing review step, not this page.
const IQ_APP = "DPT Budget";
const IN_CH = { sys: ["ส่งผ่านระบบ (กรอกเอง)", "Through the system (typed)"], letter: ["หนังสือ / เอกสารกระดาษ", "Letter or paper"], email: ["อีเมล", "Email"], ocr: ["นำเข้าจากเอกสาร (OCR จำลอง)", "Imported from a document (simulated OCR)"], plan: ["กองแผนงานสร้างให้หน่วยงาน", "Made by Planning for the unit"], other: ["อื่น ๆ", "Other"] };
const IN_ALIGN = { ok: [["เชื่อมโยงกับแผนแล้ว", "Linked to the plan"], "p-ok"], fix: [["ต้องแก้ไขก่อน", "To be fixed first"], "p-warn"], no: [["ไม่เชื่อมโยงกับแผน", "Not linked to the plan"], "p-bad"] };
const inCan = () => ROLE === "plan";
const inPhoneOk = s => !s || /^[0-9\s\-+().#]{6,20}$/.test(String(s).trim());
const inMailOk = s => !s || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s).trim());
const rqChannel = r => (r.intake && r.intake.channel) || (r.src && r.src.kind === "ocr" ? "ocr" : "sys");
const inRecvNo = () => `RC-${FORM_FY}-${String(Math.max(0, ...S.requests.map(x => Number(String(((x.intake || {}).recv || {}).no || "").split("-")[2]) || 0)) + 1).padStart(3, "0")}`;
const inSent = r => r.status !== "draft" || (r.intake && r.intake.channel === "plan");
const inOutOf = r => ((S.structure[FORM_FY] || []).find(n => n.id === r.act) || {}).parent || "";
const inMapStale = r => !!(r.map && r.map.to !== r.act);
function inUnitOf(r) { return unitName(r.unit); }

// ---------- what the system can see about the link to the plan ----------
function rqAlign(r) {
  const lin = (typeof lineage === "function" ? lineage(r.act) : []) || [], out = lin.find(n => n.lvl === "output"), prog = lin.find(n => n.lvl === "program"), ks = typeof kpisForAct === "function" ? kpisForAct(r.act) : [], st = ks[0] && ks[0].st, c = (r.intake || {}).contact || {};
  const it = (ok, th, en, d) => ({ ok: !!ok, label: L(th, en), d: d || "" });
  return [it(String(r.reason || "").trim().length >= 40, "เหตุผลความจำเป็นอย่างน้อย 40 ตัวอักษร", "Reason of at least 40 characters", `${String(r.reason || "").trim().length}`),
    it(prog && out && r.act, "เลือกแผนงาน ผลผลิต/โครงการ และกิจกรรมแล้ว", "Programme, output or project and activity chosen", out ? `${prog ? prog.code : ""} › ${out.code}${typeof outTypeName === "function" ? ` (${outTypeName(out)})` : ""}` : ""),
    it(ks.length || String(tx(r.kpi) || "").trim(), "ผูกกับตัวชี้วัด", "Linked to a KPI", ks.map(x => x.k.id).join(", ") || String(tx(r.kpi) || "")),
    it(st, "เชื่อมกับยุทธศาสตร์ (ผ่านตัวชี้วัดของกิจกรรม)", "Linked to a strategy item (through the activity's KPI)", st ? tx(st.name) : ""),
    it(Number(r.amount) > 0, "มีวงเงินที่ขอ", "An amount is asked", fmt(Number(r.amount) || 0)),
    it(c.name && c.phone, "มีชื่อและเบอร์โทรของผู้ยื่น", "Sender's name and phone given", c.name || ""),
    it(r.qplan && Math.abs(qSum(r) - reqAmount(r)) < 1, "แผนรายไตรมาสรวมเท่าวงเงิน", "Quarterly plan equals the amount", r.qplan ? fmt(qSum(r)) : "")];
}

// ---------- the panel on the request page ----------
function rqIntakePanel(r, ed) {
  const I = r.intake || {}, c = I.contact || {}, ch = rqChannel(r), auto = ["ocr", "plan"].includes(ch), ds = ed ? "" : "disabled", rc = I.recv;
  const inp = (id, v, ph, w) => `<input type="text" id="${id}" value="${esc(v || "")}" placeholder="${ph}" ${ds} style="${w ? `max-width:${w}px` : ""}">`;
  return `<section class="panel" id="rq-intake"><header><h2>${L("ผู้ยื่นคำขอและช่องทางที่ส่งเข้ามา", "Who sent the request and how it came in")}</h2><span class="sp"></span>${rc ? tag(`${L("กองแผนงานรับเรื่องแล้ว", "Received by Planning")} · ${rc.no}`, "p-ok") : tag(L("กองแผนงานยังไม่ได้รับเรื่อง", "Not yet received by Planning"), "p-mute")}</header><div class="body"><div class="inline-form" style="flex-wrap:wrap">
    <div class="f" style="flex:1 1 260px"><label>${L("หน่วยงานที่ส่งคำขอ", "Unit that sent the request")}</label><div class="row"><b style="font-weight:600">${esc(inUnitOf(r))}</b></div></div>
    <div class="f" style="flex:1 1 260px"><label for="rqi-agency">${L("ชื่อหน่วยงานตามหนังสือนำส่ง", "Agency name as on the cover letter")}</label>${inp("rqi-agency", I.agency, inUnitOf(r))}</div>
    <div class="f" style="flex:1 1 200px"><label for="rqi-cn">${L("ผู้ยื่น / ผู้ประสานงาน (ชื่อ-สกุล)", "Sender or contact (full name)")}</label>${inp("rqi-cn", c.name, L("ชื่อ-สกุล", "Full name"))}</div>
    <div class="f" style="flex:1 1 180px"><label for="rqi-cp">${L("ตำแหน่ง", "Position")}</label>${inp("rqi-cp", c.pos, "")}</div>
    <div class="f" style="flex:1 1 150px"><label for="rqi-ct">${L("เบอร์โทร", "Phone")}</label>${inp("rqi-ct", c.phone, "02-000-0000", 170)}</div>
    <div class="f" style="flex:1 1 220px"><label for="rqi-ce">${L("อีเมล", "Email")}</label>${inp("rqi-ce", c.email, "name@example.go.th")}</div>
    <div class="f" style="flex:1 1 220px"><label for="rqi-ch">${L("ช่องทางที่ส่งเข้ามา", "Channel")}</label>${auto || !ed ? `<div class="row"><span>${tag(tx(IN_CH[ch]), "p-info")}</span>${auto ? `<span class="sub">${L("ตั้งโดยระบบ", "set by the system")}</span>` : ""}</div>` : `<select id="rqi-ch">${["sys", "letter", "email", "other"].map(k => `<option value="${k}" ${ch === k ? "selected" : ""}>${esc(tx(IN_CH[k]))}</option>`).join("")}</select>`}</div>
    <div class="f" style="flex:1 1 180px"><label for="rqi-dn">${L("เลขที่หนังสือนำส่ง", "Cover letter no.")}</label>${inp("rqi-dn", I.docNo, "", 200)}</div>
    <div class="f" style="flex:0 1 170px"><label for="rqi-dd">${L("ลงวันที่", "Dated")}</label><input type="date" id="rqi-dd" value="${esc(I.docDate || "")}" ${ds}></div></div>
    ${rc ? `<p class="sub" style="margin:8px 0 0">${L("รับเรื่อง", "Received")} ${fdate(rc.date)} · ${esc(rc.no)} · ${esc(userName(rc.by))}</p>` : ""}</div></section>`;
}
{
  const vb = VIEWS.request;
  VIEWS.request = () => { let html = vb(); const r = curReq(); if (!r || REQ_TAB !== "main") return html; const marker = `<section class="panel"><header><h2>${L("รายการงบประมาณ", "Budget lines")}</h2>`, at = html.indexOf(marker); return at >= 0 ? html.slice(0, at) + rqIntakePanel(r, editable(r)) + html.slice(at) : html; };
  const bb = BIND.request;
  BIND.request = () => { bb(); const r = curReq(); if (!r || REQ_TAB !== "main" || !editable(r)) return;
    const I = () => { r.intake = r.intake || {}; r.intake.contact = r.intake.contact || {}; return r.intake; }, g = id => document.querySelector(id), set = (id, f, chk, msg) => { const el = g(id); if (el) el.onchange = e => { const v = e.target.value.trim(); if (chk && !chk(v)) { toast(msg); route(); return; } f(I(), v); save(); route(); }; };
    set("#rqi-agency", (i, v) => (i.agency = v)); set("#rqi-cn", (i, v) => (i.contact.name = v)); set("#rqi-cp", (i, v) => (i.contact.pos = v));
    set("#rqi-ct", (i, v) => (i.contact.phone = v), inPhoneOk, L("เบอร์โทรไม่ถูกต้อง (ตัวเลข ช่องว่าง และ - + ( ) เท่านั้น 6 ถึง 20 ตัว)", "Phone not valid (digits, spaces and - + ( ) only, 6 to 20)"));
    set("#rqi-ce", (i, v) => (i.contact.email = v), inMailOk, L("อีเมลไม่ถูกต้อง", "Email not valid")); set("#rqi-ch", (i, v) => (i.channel = v)); set("#rqi-dn", (i, v) => (i.docNo = v));
    const dd = g("#rqi-dd"); if (dd) dd.onchange = e => { if (e.target.value > TODAY) { toast(L("วันที่หนังสือต้องไม่เกินวันนี้", "The letter date can't be in the future")); route(); return; } I().docDate = e.target.value; save(); route(); }; };
  const ck = checks;
  checks = r => { const out = ck(r), c = (r.intake || {}).contact || {}; out.push({ s: c.name && c.phone && inPhoneOk(c.phone) && inMailOk(c.email) ? "ok" : "wa", title: L("ผู้ยื่นคำขอ", "Sender of the request"), d: c.name && c.phone ? L("ระบุแล้ว", "Given") : L("ยังไม่ระบุชื่อหรือเบอร์โทรของผู้ยื่น", "Sender's name or phone not given"), id: null }); return out; };
}

// ---------- seed: the sample requests that were sent get a receipt, some are checked and mapped ----------
Object.keys(SEEDS).forEach(k => {
  const prev = SEEDS[k].seed;
  SEEDS[k].seed = () => {
    const s = prev(), plan = (s.users.find(u => u.role === "plan") || s.users[0]).id, divs = {}; s.users.filter(u => u.role === "div").forEach(u => { if (!divs[u.unit]) divs[u.unit] = u; });
    let n = 0;
    s.requests.forEach(r => { const d = divs[r.unit]; r.intake = { channel: "sys", agency: "", docNo: "", docDate: "", contact: { name: d ? tx(d.name) : "", pos: "ผู้จัดทำคำขอ", phone: d ? "02-000-" + String(1000 + n) : "", email: "" } };
      if (r.status !== "draft" && r.status !== "returned") { n++; r.intake.recv = { date: r.updated || "2026-10-20", no: `RC-${FORM_FY}-${String(n).padStart(3, "0")}`, by: plan }; if (r.status === "approved") { r.align = { result: "ok", note: "", by: plan, t: (r.updated || "2026-10-20") + "T10:00" }; r.map = { from: r.act, to: r.act, note: "", by: plan, t: (r.updated || "2026-10-20") + "T10:05" }; } } });
    return s;
  };
});
