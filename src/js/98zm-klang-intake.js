// Fisko-KlangFinance, budget round Q6 (12 Nov 2569): who sent a request in, how it came, and the Planning division's intake.
// 1. The request page showed the sending unit only as small grey text under the title and held no contact, channel or letter
//    details. The main tab now has a panel "who sent it and how it came in": the unit that sent it (the unit that owns the
//    request), the agency name as written on the cover letter, the person who sent it (name, position, phone, email), the channel
//    it came by (system, letter, email, imported from a document, carried over from an earlier year's commitment, made by Planning
//    for the unit) and the cover letter's number and date. The unit edits these while the request is a draft or returned. The
//    request check warns when the person's name or phone is missing (a warning only, it never blocks sending).
// 2. Page BQ11 is the Planning division's intake (what the user listed as B2, B3 and C3):
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
const IN_CH = { sys: ["ส่งผ่านระบบ (กรอกเอง)", "Through the system (typed)"], letter: ["หนังสือ / เอกสารกระดาษ", "Letter or paper"], email: ["อีเมล", "Email"], ocr: ["นำเข้าจากเอกสาร (OCR จำลอง)", "Imported from a document (simulated OCR)"], carry: ["ดึงจากรายการผูกพันปีก่อน", "Carried over from an earlier year's commitment"], plan: ["กองแผนงานสร้างให้หน่วยงาน", "Made by Planning for the unit"], other: ["อื่น ๆ", "Other"] };
const IN_ALIGN = { ok: [["เชื่อมโยงกับแผนแล้ว", "Linked to the plan"], "p-ok"], fix: [["ต้องแก้ไขก่อน", "To be fixed first"], "p-warn"], no: [["ไม่เชื่อมโยงกับแผน", "Not linked to the plan"], "p-bad"] };
const inCan = () => ROLE === "plan";
const inPhoneOk = s => !s || /^[0-9\s\-+().#]{6,20}$/.test(String(s).trim());
const inMailOk = s => !s || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s).trim());
const rqChannel = r => (r.intake && r.intake.channel) || (r.cont ? "carry" : r.src && r.src.kind === "ocr" ? "ocr" : "sys");
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
  const I = r.intake || {}, c = I.contact || {}, ch = rqChannel(r), auto = ["ocr", "carry", "plan"].includes(ch), ds = ed ? "" : "disabled", rc = I.recv;
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

// ---------- Planning's intake (BQ11) ----------
const inMapOpts = () => (S.structure[FORM_FY] || []).filter(n => n.lvl === "output" && !n.retired).map(n => [n.id, `${n.code} · ${tx(n.name)}${typeof outTypeName === "function" ? ` (${outTypeName(n)})` : ""}`]);
const inActOpts = out => (S.structure[FORM_FY] || []).filter(n => n.lvl === "activity" && !n.retired && n.parent === out).map(n => [n.id, `${n.code} · ${tx(n.name)}`]);
const inFv = (v, k, d) => (v && v[k] !== undefined ? v[k] : d);
CRUD.def("rqIn", {
  noun: ["คำขอที่ส่งเข้ามา", "Request received"], st: { new: [["รอรับเรื่อง", "To receive"], "p-warn"], recv: [["รับเรื่องแล้ว", "Received"], "p-info"], done: [["ตรวจและ map แล้ว", "Checked and mapped"], "p-ok"] },
  status: r => (!(r.intake || {}).recv ? "new" : r.align && r.map && !inMapStale(r) ? "done" : "recv"), gone: () => false, id: r => r.id, title: r => `${r.id} · ${tx(r.name)}`, sub: r => `${inUnitOf(r)} · ${fmt(r.amount)}`, live: true,
  list: () => S.requests.filter(inSent).filter(r => !(typeof unitRole === "function" && unitRole()) || r.unit === me().unit), search: r => `${r.id} ${tx(r.name)} ${inUnitOf(r)} ${((r.intake || {}).contact || {}).name || ""} ${(r.intake || {}).docNo || ""}`,
  filters: [{ id: "un", label: ["หน่วยงานที่ส่ง", "Sending unit"], opts: () => [...new Set(S.requests.filter(inSent).map(r => r.unit))].map(u => [u, unitName(u)]), get: r => r.unit }, { id: "ch", label: ["ช่องทาง", "Channel"], opts: () => Object.keys(IN_CH).map(k => [k, tx(IN_CH[k])]), get: r => rqChannel(r) },
    { id: "al", label: ["ตรวจเชื่อมโยง", "Link check"], opts: () => [["none", L("ยังไม่ตรวจ", "Not checked")], ...Object.keys(IN_ALIGN).map(k => [k, tx(IN_ALIGN[k][0])])], get: r => (r.align ? r.align.result : "none") }, { id: "mp", label: ["map", "Map"], opts: () => [["no", L("ยังไม่ map", "Not mapped")], ["ok", L("map แล้ว", "Mapped")], ["old", L("map ล้าสมัย", "Out of date")]], get: r => (!r.map ? "no" : inMapStale(r) ? "old" : "ok") }],
  cols: [{ h: ["เลขที่", "No."], c: r => `<span class="mono">${r.id}</span>` }, { h: ["หน่วยงานที่ส่ง", "Sending unit"], c: r => `${esc(inUnitOf(r))}${(r.intake || {}).agency && (r.intake || {}).agency !== inUnitOf(r) ? `<div class="sub">${esc(r.intake.agency)}</div>` : ""}` }, { h: ["ผู้ยื่น", "Sender"], c: r => { const c = (r.intake || {}).contact || {}; return c.name ? `${esc(c.name)}<div class="sub">${esc(c.phone || "")}</div>` : `<span class="sub">–</span>`; } },
    { h: ["ช่องทาง", "Channel"], c: r => `<span class="sub">${esc(tx(IN_CH[rqChannel(r)]))}</span>` }, { h: ["รายการ", "Item"], c: r => esc(tx(r.name)) }, { h: ["วงเงิน (บาท)", "Amount (baht)"], n: true, c: r => fmt(r.amount) },
    { h: ["รับเรื่อง", "Received"], c: r => ((r.intake || {}).recv ? `<span class="mono">${r.intake.recv.no}</span><div class="sub">${fdate(r.intake.recv.date)}</div>` : "–") }, { h: ["เชื่อมโยง", "Link"], c: r => (r.align ? tag(tx(IN_ALIGN[r.align.result][0]), IN_ALIGN[r.align.result][1]) : "–") }, { h: ["map", "Map"], c: r => (r.map ? (inMapStale(r) ? tag(L("ล้าสมัย", "Out of date"), "p-warn") : tag("✓", "p-ok")) : "–") }],
  fields: (r, v) => { const I = r.intake || {}, c = I.contact || {}, out = inFv(v, "mapOut", r.map ? ((S.structure[FORM_FY] || []).find(n => n.id === r.map.to) || {}).parent || inOutOf(r) : inOutOf(r)), acts = inActOpts(out), act = inFv(v, "mapAct", r.act), actOk = acts.some(a => a[0] === act) ? act : "";
    return [{ id: "recvDate", label: ["วันที่รับเรื่อง", "Date received"], type: "date", value: I.recv ? I.recv.date : "", hint: L("ว่าง = ยังไม่ได้รับเรื่อง", "blank = not received") }, { id: "recvNo", label: ["เลขรับ", "Receipt no."], value: I.recv ? I.recv.no : "", hint: L("เว้นว่างให้ระบบออกเลขให้", "leave blank for the system to number it") },
      { id: "channel", label: ["ช่องทางที่ส่งเข้ามา", "Channel"], type: "select", req: true, value: rqChannel(r), opts: Object.keys(IN_CH).map(k => [k, tx(IN_CH[k])]) }, { id: "agency", label: ["ชื่อหน่วยงานตามหนังสือนำส่ง", "Agency name on the letter"], value: I.agency || inUnitOf(r) },
      { id: "docNo", label: ["เลขที่หนังสือนำส่ง", "Cover letter no."], value: I.docNo || "" }, { id: "docDate", label: ["ลงวันที่", "Dated"], type: "date", value: I.docDate || "" },
      { id: "cn", label: ["ผู้ยื่น (ชื่อ-สกุล)", "Sender"], value: c.name || "" }, { id: "cp", label: ["ตำแหน่ง", "Position"], value: c.pos || "" }, { id: "ct", label: ["เบอร์โทร", "Phone"], value: c.phone || "" }, { id: "ce", label: ["อีเมล", "Email"], value: c.email || "" },
      { id: "chk", type: "info", label: ["สิ่งที่ระบบตรวจพบ (เชื่อมโยงกับแผน)", "What the system found (link to the plan)"], wide: true, html: rqAlign(r).map(x => `${x.ok ? "✓" : '<span style="color:var(--bad)">✗</span>'} ${esc(x.label)}${x.d ? ` <span class="sub">· ${esc(x.d)}</span>` : ""}`).join("<br>") },
      { id: "alignRes", label: ["ผลตรวจของกองแผนงาน", "Planning's decision"], type: "select", value: r.align ? r.align.result : "", blank: L("— ยังไม่ตรวจ —", "— not checked —"), opts: Object.keys(IN_ALIGN).map(k => [k, tx(IN_ALIGN[k][0])]) }, { id: "alignNote", label: ["หมายเหตุผลตรวจ", "Note"], type: "textarea", wide: true, value: r.align ? r.align.note || "" : "" },
      { id: "mapOut", label: ["map ไปที่ผลผลิต/โครงการ/กองทุน", "Map to the output, project or fund"], type: "select", value: out, blank: L("— เลือก —", "— choose —"), opts: inMapOpts() }, { id: "mapAct", label: ["กิจกรรม", "Activity"], type: "select", value: actOk, blank: L("— เลือก —", "— choose —"), opts: acts },
      { id: "mapDone", label: ["ยืนยัน map ตามที่เลือก (ถ้าไม่ติ๊ก = ยังไม่ map)", "Confirm the map as chosen (unticked = not mapped)"], type: "check", wide: true, value: !!(r.map && !inMapStale(r)) }, { id: "mapNote", label: ["หมายเหตุ map", "Map note"], wide: true, value: r.map ? r.map.note || "" : "" }]; },
  check: (v, r) => { const out = []; if (v.recvDate && v.recvDate > TODAY) out.push({ f: "recvDate", m: L("วันที่รับเรื่องต้องไม่เกินวันนี้", "Received date can't be in the future") }); if (v.docDate && v.docDate > TODAY) out.push({ f: "docDate", m: L("วันที่หนังสือต้องไม่เกินวันนี้", "Letter date can't be in the future") });
    if (v.recvDate && v.docDate && v.docDate > v.recvDate) out.push({ f: "docDate", m: L("หนังสือลงวันที่หลังวันรับเรื่อง", "The letter is dated after it was received") });
    if (!inPhoneOk(v.ct)) out.push({ f: "ct", m: L("เบอร์โทรไม่ถูกต้อง", "Phone not valid") }); if (!inMailOk(v.ce)) out.push({ f: "ce", m: L("อีเมลไม่ถูกต้อง", "Email not valid") });
    if ((v.alignRes === "fix" || v.alignRes === "no") && !String(v.alignNote || "").trim()) out.push({ f: "alignNote", m: L("ต้องระบุเหตุผลเมื่อต้องแก้หรือไม่เชื่อมโยง", "Give the reason when it is to be fixed or not linked") });
    if (v.mapDone && !(v.mapAct && inActOpts(v.mapOut).some(a => a[0] === v.mapAct))) out.push({ f: "mapAct", m: L("เลือกกิจกรรมใต้ผลผลิต/โครงการที่ map", "Choose an activity under the mapped output or project") }); if (v.mapDone && r && !(r.intake || {}).recv && !v.recvDate) out.push({ f: "recvDate", m: L("ต้องรับเรื่องก่อน map", "Receive it before mapping") }); return out; },
  create: { can: () => false, label: ["", ""], run: () => null },
  edit: { can: r => inCan(), run: (r, v) => { const I = (r.intake = r.intake || {}); I.contact = I.contact || {}; Object.assign(I, { channel: v.channel, agency: v.agency || "", docNo: v.docNo || "", docDate: v.docDate || "" }); Object.assign(I.contact, { name: v.cn || "", pos: v.cp || "", phone: v.ct || "", email: v.ce || "" });
      if (v.recvDate) I.recv = { date: v.recvDate, no: String(v.recvNo || "").trim() || (I.recv ? I.recv.no : inRecvNo()), by: I.recv ? I.recv.by : me().id }; else delete I.recv;
      if (v.alignRes) r.align = { result: v.alignRes, note: v.alignNote || "", by: me().id, t: nowIso() }; else delete r.align;
      if (v.mapDone) { const from = r.map ? r.map.from : r.act; r.map = { from, to: v.mapAct, note: v.mapNote || "", by: me().id, t: nowIso() }; if (r.act !== v.mapAct) { audit(["map คำขอไปกิจกรรมใหม่", "Mapped a request to another activity"], `${r.id} ${r.act} → ${v.mapAct}`); r.act = v.mapAct; } } else delete r.map;
      audit(["แก้ข้อมูลรับเรื่องคำขอ", "Edited a request's intake"], r.id); } },
  acts: r => (inCan() && !(r.intake || {}).recv ? [{ id: "recv", label: L("รับเรื่องวันนี้", "Receive it today"), kind: "primary", run: () => { r.intake = r.intake || {}; r.intake.recv = { date: TODAY, no: inRecvNo(), by: me().id }; audit(["รับเรื่องคำขอ", "Received a request"], `${r.id} ${r.intake.recv.no}`); return `${L("รับเรื่องแล้ว", "Received")} ${r.intake.recv.no}`; } }] : []),
  view: r => { const I = r.intake || {}, c = I.contact || {}, A = rqAlign(r); return kv([[L("หน่วยงานที่ส่ง", "Sending unit"), esc(inUnitOf(r))], [L("ชื่อตามหนังสือ", "Name on the letter"), esc(I.agency || "–")], [L("ผู้ยื่น", "Sender"), esc([c.name, c.pos].filter(Boolean).join(" · ") || "–")], [L("ติดต่อ", "Contact"), esc([c.phone, c.email].filter(Boolean).join(" · ") || "–")], [L("ช่องทาง", "Channel"), esc(tx(IN_CH[rqChannel(r)]))],
      [L("หนังสือนำส่ง", "Cover letter"), esc([I.docNo, I.docDate ? fdate(I.docDate) : ""].filter(Boolean).join(" · ") || "–")], [L("รับเรื่อง", "Received"), I.recv ? `${esc(I.recv.no)} · ${fdate(I.recv.date)} · ${esc(userName(I.recv.by))}` : L("ยังไม่ได้รับเรื่อง", "not yet")],
      [L("ผลตรวจเชื่อมโยง", "Link check"), r.align ? `${esc(tx(IN_ALIGN[r.align.result][0]))}${r.align.note ? ` · ${esc(r.align.note)}` : ""}` : "–"], [L("สิ่งที่ระบบตรวจพบ", "What the system found"), `${A.filter(x => x.ok).length}/${A.length}<br>${A.map(x => `${x.ok ? "✓" : '<span style="color:var(--bad)">✗</span>'} ${esc(x.label)}`).join("<br>")}`],
      [L("map", "Map"), r.map ? `${inMapStale(r) ? tag(L("ล้าสมัย", "Out of date"), "p-warn") + " " : ""}${esc(r.map.from)} → ${esc(r.map.to)}${r.map.note ? ` · ${esc(r.map.note)}` : ""}` : "–"]]); },
});

// ---------- make a request for a unit ----------
CRUD.def("rqFor", {
  noun: ["คำขอที่กองแผนงานสร้างให้หน่วยงาน", "Request made for a unit"], st: STATUS, status: r => r.status, gone: () => false, id: r => r.id, title: r => `${r.id} · ${tx(r.name)}`, sub: r => inUnitOf(r), live: true,
  list: () => S.requests.filter(r => r.intake && r.intake.channel === "plan").filter(r => !(typeof unitRole === "function" && unitRole()) || r.unit === me().unit), search: r => `${r.id} ${tx(r.name)} ${inUnitOf(r)}`,
  cols: [{ h: ["เลขที่", "No."], c: r => `<span class="mono">${r.id}</span>` }, { h: ["หน่วยงาน", "Unit"], c: r => esc(inUnitOf(r)) }, { h: ["รายการ", "Item"], c: r => esc(tx(r.name)) }, { h: ["หนังสือ", "Letter"], c: r => `<span class="sub">${esc((r.intake || {}).docNo || "–")}</span>` }, { h: ["สถานะ", "Status"], c: r => pill(r.status) }],
  fields: (r, v) => [{ id: "unit", label: ["หน่วยงานที่ส่งคำขอ", "Unit that sent it"], type: "select", req: true, value: "", blank: L("— เลือก —", "— choose —"), opts: (S.units || []).filter(u => u.parent).map(u => [u.id, tx(u.name)]) },
    { id: "name", label: ["ชื่อโครงการ / รายการ", "Project or item name"], req: true, wide: true, value: "" }, { id: "kind", label: ["ประเภทคำขอ", "Kind of request"], type: "select", req: true, value: "year", opts: [["year", L("รายการปีเดียว", "Single-year item")], ["multi", L("รายการผูกพัน", "Multi-year commitment item")]] },
    ...rqOutAct(v, ""), { id: "type", label: ["งบรายจ่ายของรายการแรก", "Budget type of the first line"], type: "select", opts: typeOpts(), value: "ope" },
    { id: "agency", label: ["ชื่อหน่วยงานตามหนังสือนำส่ง", "Agency name on the letter"], value: "" }, { id: "docNo", label: ["เลขที่หนังสือนำส่ง", "Cover letter no."], req: true, value: "" }, { id: "docDate", label: ["ลงวันที่", "Dated"], type: "date", req: true, value: TODAY },
    { id: "cn", label: ["ผู้ยื่น (ชื่อ-สกุล)", "Sender"], req: true, value: "" }, { id: "cp", label: ["ตำแหน่ง", "Position"], value: "" }, { id: "ct", label: ["เบอร์โทร", "Phone"], req: true, value: "" }, { id: "ce", label: ["อีเมล", "Email"], value: "" }],
  check: v => { const out = []; if (v.act && v.out && !(S.structure[FORM_FY] || []).some(n => n.id === v.act && n.parent === v.out)) out.push({ f: "act", m: L("กิจกรรมนี้ไม่อยู่ใต้ผลผลิต/โครงการที่เลือก", "This activity is not under the chosen output or project") }); if (v.docDate && v.docDate > TODAY) out.push({ f: "docDate", m: L("วันที่หนังสือต้องไม่เกินวันนี้", "Letter date can't be in the future") }); if (!inPhoneOk(v.ct)) out.push({ f: "ct", m: L("เบอร์โทรไม่ถูกต้อง", "Phone not valid") }); if (!inMailOk(v.ce)) out.push({ f: "ce", m: L("อีเมลไม่ถูกต้อง", "Email not valid") }); return out; },
  create: { can: inCan, label: ["สร้างคำขอแทนหน่วยงาน", "Make a request for a unit"], run: v => { const id = nextReqId(), r = { id, unit: v.unit, act: v.act, prev: 0, status: "draft", updated: TODAY, name: [v.name, v.name], kpi: "", reason: "", docs: [], items: [{ type: v.type, name: "", qty: 1, unitName: L("งาน", "job"), price: 0 }], amount: 0, versions: [], comments: [],
      intake: { channel: "plan", agency: v.agency || "", docNo: v.docNo, docDate: v.docDate, contact: { name: v.cn, pos: v.cp || "", phone: v.ct, email: v.ce || "" }, recv: { date: TODAY, no: inRecvNo(), by: me().id }, by: me().id } };
      if (v.kind === "multi") { r.multi = true; r.years = { [FORM_FY]: 0, [FORM_FY + 1]: 0 }; } S.requests.unshift(r); snapshot(r, ["กองแผนงานสร้างคำขอแทนหน่วยงาน", "Planning made the request for the unit"], true); audit(["กองแผนงานสร้างคำขอแทนหน่วยงาน", "Planning made a request for a unit"], `${id} ${v.unit} ${v.docNo}`); notify(["div", "divhead"], [`กองแผนงานสร้างร่างคำขอ ${id} ให้หน่วยงานของท่านจากหนังสือ ${v.docNo} กรุณากรอกรายการแล้วส่ง`, `Planning made draft request ${id} for your unit from letter ${v.docNo}; fill it in and send it`], "requests"); return r; } },
  edit: { can: () => false, run: () => {} }, acts: () => [],
  view: r => kv([[L("หน่วยงาน", "Unit"), esc(inUnitOf(r))], [L("รายการ", "Item"), esc(tx(r.name))], [L("หนังสือ", "Letter"), esc([(r.intake || {}).docNo, (r.intake || {}).docDate ? fdate(r.intake.docDate) : ""].filter(Boolean).join(" · ") || "–")], [L("สถานะ", "Status"), pill(r.status)]]),
});

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

// ---------- page BQ11 ----------
ePageDef("budget", "bq-in", "BQ11", "form", KROLES, ["รับเรื่องและ map คำขอ", "Request intake and mapping"], () => {
  const all = S.requests.filter(inSent).filter(r => !(typeof unitRole === "function" && unitRole()) || r.unit === me().unit), n = f => all.filter(f).length;
  return `${eHead(IQ_APP, "BQ11", ["รับเรื่องและ map คำขอ", "Request intake and mapping"], ["กล่องรับเรื่องของกองแผนงาน: รับเรื่องคำขอที่ส่งเข้ามา (เลขรับ วันที่) ดูว่าหน่วยงานใดส่ง ผู้ยื่นคือใคร ส่งทางช่องทางไหน ตรวจการเชื่อมโยงกับแผน และ map ให้อยู่ใต้ผลผลิต/โครงการ/กองทุนและกิจกรรมที่กองแผนงานสร้างไว้ · กองแผนงานสร้างร่างคำขอแทนหน่วยงานจากหนังสือได้ หน่วยงานเติมรายการแล้วส่ง · สำนัก/กองเห็นเฉพาะคำขอของตนแบบอ่านอย่างเดียว", "Planning's inbox: receive the requests that came in (receipt number, date), see which unit sent each, who the sender is and the channel, check the link to the plan, and map it under the output, project or fund and activity that Planning made · Planning can open a draft for a unit from a letter and the unit fills it in and sends it · a unit sees its own requests here, read only"])}
    ${eKpis([[L("ส่งเข้ามาแล้ว", "Sent in"), all.length], [L("รอรับเรื่อง", "To receive"), n(r => !(r.intake || {}).recv), "", n(r => !(r.intake || {}).recv) > 0], [L("รอตรวจเชื่อมโยง", "To check"), n(r => !r.align)], [L("รอ map", "To map"), n(r => !r.map || inMapStale(r)), "", n(r => inMapStale(r)) > 0], [L("ตรวจและ map แล้ว", "Checked and mapped"), n(r => r.align && r.map && !inMapStale(r))]])}
    <div class="row" style="margin:0 0 10px;flex-wrap:wrap"><button class="btn" type="button" data-jump="rg-out">${L("เพิ่มผลผลิต/โครงการ/กองทุน (ทะเบียน RG1)", "Add an output, project or fund (RG1)")}</button><button class="btn" type="button" data-jump="bq-commit">${L("รายการผูกพันต่อเนื่อง (BQ6)", "Continuing commitments (BQ6)")}</button><button class="btn" type="button" data-jump="bq-ocr">${L("นำเข้าจากเอกสาร (BQ8)", "Import from a document (BQ8)")}</button></div>
    ${crudList("rqIn", { head: `<h2>${L("คำขอที่ส่งเข้ามา", "Requests received")}</h2>` })}
    ${crudList("rqFor", { head: `<h2>${L("คำขอที่กองแผนงานสร้างให้หน่วยงาน", "Requests Planning made for units")}</h2>` })}`;
});
Object.assign(NAV_ICON, { "bq-in": "inbox" });
