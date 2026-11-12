// Fisko-KlangFinance, round R5: construction in progress to asset to handover to a local authority (อปท.), and an
// all-units asset overview for the finance division. Written new for the DPT finance division, from the duty list
// (accounting group: clear the construction-in-progress holding account into assets and keep an item register in
// New GFMIS Thai; hand assets over to local authorities and remove them from GFMIS) and the meeting (MoM 2 Nov 2569).
// Nothing here posts to GFMIS: the asset number and the transfer document number are typed in from GF. The stage forms
// reuse the edit form (the shared list + drawer only asks for a reason on actions), so "Edit" records the next stage.
// Not done: depreciation of capitalised buildings (the Fisko Assets register is unchanged), state property (ที่ราชพัสดุ)
// and mobile-phone registers, a link from a capitalised work to a Fisko Assets record.
const CW_ACT = ["fin", "finhead"]; // sample assumption: the accounting duties sit in the fin role (see ตรวจสอบสิทธิ์กองคลัง.md)
const cwActor = () => CW_ACT.includes(ROLE);
TIER_DOC.cwipx = ["โอนสินทรัพย์ก่อสร้างให้ อปท. (ตัดออกจากระบบ)", "Transfer of a built asset to a local authority"];
const ASSET_CAT_MACH = { id: "7210", name: ["เครื่องจักรกลและเครื่องมือหนัก (เช่น รถผักตบ)", "Machinery and heavy equipment (e.g. water-hyacinth boat)"], life: 10 };
if (!ASSET_CATS.some(c => c.id === ASSET_CAT_MACH.id)) ASSET_CATS.push(ASSET_CAT_MACH);
const CW_CLASS = { building: ["อาคาร", "Building"], structure: ["สิ่งก่อสร้างอื่น (ถนน ตลิ่ง เขื่อน)", "Other structure (road, embankment, dam)"], system: ["ระบบสาธารณูปโภค", "Utility system"] };
const CW_LGU = ["เทศบาลตำบลตัวอย่าง", "องค์การบริหารส่วนตำบลตัวอย่าง", "เทศบาลเมืองตัวอย่าง", "องค์การบริหารส่วนจังหวัดตัวอย่าง"]; // sample names
const CW_ST = {
  building: [["ระหว่างก่อสร้าง", "Under construction"], "p-info"], done: [["แล้วเสร็จ รอล้างพักงานระหว่างก่อสร้าง", "Completed, to clear the holding account"], "p-warn"], cap: [["ขึ้นเป็นสินทรัพย์แล้ว รอส่งมอบ", "Capitalised, to hand over"], "p-info"],
  handed: [["ส่งมอบแล้ว รอ อปท. รับมอบ", "Handed over, awaiting receipt"], "p-warn"], accepted: [["อปท.รับมอบแล้ว รอขอโอนออก", "Received, to request transfer out"], "p-info"], xreq: [["รออนุมัติโอนออกจากระบบ", "Transfer out awaiting approval"], "p-warn"], removed: [["โอนออกจากระบบแล้ว", "Transferred out"], "p-ok"],
};
const CW_STEPS = [["ระหว่างก่อสร้าง", "Under construction"], ["แล้วเสร็จ", "Completed"], ["ล้างพักงานขึ้นเป็นสินทรัพย์", "Capitalised"], ["ส่งมอบให้ อปท.", "Handed over"], ["อปท.รับมอบ", "Received by the authority"], ["โอนออกจากระบบ", "Transferred out"]];
const cwIdx = x => ({ building: 0, done: 1, cap: 2, handed: 3, accepted: 4, xreq: 4, removed: 5 })[x.status];
const cwPaid = x => (x.contract ? sumv((S.payreqs || []).filter(p => p.contract === x.contract && p.status === "approved").map(p => p.amount)) : 0);
const cwCost = x => (x.cap ? x.cap.cost : cwPaid(x) + (x.cost0 || 0));
const cwVisible = x => !(ROLE === "div" || ROLE === "divhead") || x.unit === me().unit;

Object.keys(SEEDS).forEach(k => {
  const prev = SEEDS[k].seed;
  SEEDS[k].seed = () => {
    const s = prev(), fn = (s.users.find(u => u.role === "fin") || s.users[0]).id, fh = (s.users.find(u => u.role === "finhead") || s.users[0]).id, kids = s.units.filter(u => u.parent), c = s.contracts || [];
    s.tiers.push({ id: "TR-14", doc: "cwipx", min: 0, role: "finhead" }, { id: "TR-15", doc: "cwipx", min: 50e6, role: "exec" });
    const W = (n, name, unit, loc, extra) => ({ id: "CW-" + String(n).padStart(4, "0"), pid: "", contract: "", name, unit, loc, cost0: 0, status: "building", by: fn, t: "2026-09-20T10:00", ...extra });
    s.cwip = [];
    if (c[1]) { const p = (s.pplan || []).find(x => x.id === c[1].plan); s.cwip.push(W(1, "งานก่อสร้างตามสัญญา " + c[1].id, (kids[0] || s.units[0]).id, "ที่ตั้งตัวอย่าง จ.ตัวอย่าง", { pid: p ? p.pid : "", contract: c[1].id, cost0: 0 })); }
    s.cwip.push(W(2, "ก่อสร้างอาคารสำนักงานสาขาตัวอย่าง (งบ 2568)", (kids[1] || s.units[0]).id, "อ.ตัวอย่าง จ.ตัวอย่าง", { cost0: 18400000, status: "cap", done: { date: "2026-08-15", ref: "ใบตรวจรับงวดสุดท้าย 12/2569", by: fn }, cap: { date: "2026-09-10", assetNo: "AS-ตัวอย่าง-0001", klass: "building", cost: 18400000, by: fn } }));
    s.cwip.push(W(3, "ปรับปรุงตลิ่งริมน้ำตัวอย่าง (งบ 2567)", (kids[2] || s.units[0]).id, "ต.ตัวอย่าง อ.ตัวอย่าง", { cost0: 9600000, status: "xreq", done: { date: "2026-03-01", ref: "ใบตรวจรับ 5/2569", by: fn }, cap: { date: "2026-04-01", assetNo: "AS-ตัวอย่าง-0002", klass: "structure", cost: 9600000, by: fn }, hand: { lgu: CW_LGU[0], date: "2026-05-10", letter: "ที่ มท 0000/123", by: fn }, accept: { date: "2026-06-02", ref: "หนังสือรับมอบ อปท. 45/2569", by: fn }, xfer: { gfDoc: "GF-TR-ตัวอย่าง-0007", date: "2026-10-12", by: fn } }));
    return s;
  };
});

CRUD.def("cwip", {
  noun: ["งานก่อสร้าง", "Construction work"], st: CW_ST, live: false,
  list: () => (S.cwip || []).filter(cwVisible), id: x => x.id, title: x => `${x.id} · ${x.name}`, sub: x => `${unitName(x.unit)} · ${baht(cwCost(x))}`, status: x => x.status,
  search: x => `${x.id} ${x.name} ${x.pid || ""} ${x.contract || ""} ${x.loc} ${x.cap ? x.cap.assetNo : ""}`,
  filters: [{ id: "st", label: ["ขั้น", "Stage"], opts: () => Object.keys(CW_ST).map(k => [k, tx(CW_ST[k][0])]), get: x => x.status }, { id: "u", label: ["หน่วย", "Unit"], opts: () => allUnitOpts(), get: x => x.unit }],
  cols: [{ h: ["เลขที่", "No."], c: x => `<span class="mono">${x.id}</span>` }, { h: ["งานก่อสร้าง", "Work"], c: x => `<b style="font-weight:600">${esc(x.name)}</b><div class="sub">${esc(x.loc)}</div>` }, { h: ["รหัสโครงการ", "Project ID"], c: x => (x.pid ? `<span class="mono">${x.pid}</span>` : "–") },
    { h: ["หน่วย", "Unit"], c: x => esc(unitName(x.unit)) }, { h: ["มูลค่าสะสม (บาท)", "Cost (baht)"], n: true, c: x => fmt(cwCost(x)) }, { h: ["เลขสินทรัพย์", "Asset no."], c: x => (x.cap ? `<span class="mono">${esc(x.cap.assetNo)}</span>` : "–") }, { h: ["อปท.", "Authority"], c: x => (x.hand ? esc(x.hand.lgu) : "–") }],
  // The edit form asks for what the next stage needs; "Edit" on a record at stage N records stage N+1.
  fields: (x, v) => {
    if (!x) return [{ id: "name", label: ["ชื่องานก่อสร้าง", "Work name"], req: true, wide: true, value: "" }, { id: "unit", label: ["หน่วยที่รับผิดชอบ", "Responsible unit"], type: "select", req: true, value: "", opts: unitOpts() }, { id: "loc", label: ["ที่ตั้ง", "Location"], req: true, wide: true, value: "" },
      { id: "pid", label: ["รหัสโครงการ (ถ้ามี)", "Project ID (if any)"], type: "select", blank: L("ไม่ระบุ", "None"), value: "", opts: (S.pplan || []).map(p => [p.pid, `${p.pid} ${tx(p.name)}`]) }, { id: "cost0", label: ["มูลค่างานที่สะสมไว้นอกสัญญาในระบบ (บาท)", "Cost carried from outside the contracts in the system (baht)"], type: "number", min: 0, value: 0 }];
    const s = x.status;
    if (s === "building") return [{ id: "date", label: ["วันที่งานแล้วเสร็จ", "Completion date"], type: "date", req: true, value: TODAY }, { id: "ref", label: ["เลขที่ใบตรวจรับงวดสุดท้าย", "Final acceptance reference"], req: true, value: "" }];
    if (s === "done") return [{ id: "assetNo", label: ["เลขสินทรัพย์ (จาก GF)", "Asset number (from GF)"], req: true, value: "" }, { id: "klass", label: ["ประเภทสินทรัพย์", "Asset class"], type: "select", req: true, value: "building", opts: Object.keys(CW_CLASS).map(k => [k, tx(CW_CLASS[k])]) }, { id: "date", label: ["วันที่ล้างพักงานฯ", "Date capitalised"], type: "date", req: true, value: TODAY }, { id: "cost", label: ["มูลค่าที่ขึ้นเป็นสินทรัพย์ (บาท)", "Capitalised value (baht)"], type: "number", req: true, min: 1, value: cwCost(x) }];
    if (s === "cap") return [{ id: "lgu", label: ["องค์กรปกครองส่วนท้องถิ่นผู้รับมอบ", "Receiving local authority"], type: "select", req: true, value: "", opts: CW_LGU.map(n => [n, n]) }, { id: "date", label: ["วันที่ส่งมอบ", "Handover date"], type: "date", req: true, value: TODAY }, { id: "letter", label: ["เลขที่หนังสือส่งมอบ", "Handover letter no."], req: true, value: "" }];
    if (s === "handed") return [{ id: "date", label: ["วันที่ อปท. รับมอบ", "Date received"], type: "date", req: true, value: TODAY }, { id: "ref", label: ["เลขที่หนังสือ/บันทึกรับมอบ", "Receipt reference"], req: true, value: "" }];
    if (s === "accepted") return [{ id: "gfDoc", label: ["เลขที่เอกสารโอนออกใน GF", "GF transfer document no."], req: true, value: "" }, { id: "date", label: ["วันที่บันทึกใน GF", "Date recorded in GF"], type: "date", req: true, value: TODAY }];
    return [];
  },
  check: (v, x) => {
    if (!x) return [];
    const e = [];
    if (v.date && v.date > TODAY) e.push({ f: "date", m: L("วันที่ต้องไม่เกินวันนี้", "Date can't be in the future") });
    const before = x.status === "done" ? (x.done || {}).date : x.status === "cap" ? (x.cap || {}).date : x.status === "handed" ? (x.hand || {}).date : x.status === "accepted" ? (x.accept || {}).date : ""; if (v.date && before && v.date < before) e.push({ f: "date", m: `${L("ต้องไม่ก่อนขั้นก่อนหน้า", "Not before the previous stage")} (${fdate(before)})` });
    if (x.status === "done" && v.assetNo && (S.cwip || []).some(y => y !== x && y.cap && y.cap.assetNo === v.assetNo)) e.push({ f: "assetNo", m: L("เลขสินทรัพย์นี้ใช้แล้ว", "This asset number is already used") });
    return e;
  },
  create: { can: cwActor, label: ["ขึ้นทะเบียนงานก่อสร้าง", "Register a construction work"], run: v => { const p = (S.pplan || []).find(q => q.pid === v.pid), c = p ? (S.contracts || []).find(k => k.plan === p.id) : null, x = { id: eNextId("CW-", S.cwip), pid: v.pid || "", contract: c ? c.id : "", name: v.name, unit: v.unit, loc: v.loc, cost0: Number(v.cost0) || 0, status: "building", by: me().id, t: nowIso() }; S.cwip.push(x); audit(["ขึ้นทะเบียนงานก่อสร้าง", "Registered a construction work"], `${x.id} ${x.name}`); return x; } },
  edit: { can: x => cwActor() && ["building", "done", "cap", "handed", "accepted"].includes(x.status), why: () => false, run: (x, v) => {
    const by = me().id;
    if (x.status === "building") { x.done = { date: v.date, ref: v.ref, by }; x.status = "done"; audit(["บันทึกงานก่อสร้างแล้วเสร็จ", "Recorded construction completed"], x.id); notify(["fin", "finhead"], [`งานก่อสร้าง ${x.id} แล้วเสร็จ ล้างพักงานระหว่างก่อสร้างขึ้นเป็นสินทรัพย์`, `Construction ${x.id} completed: clear the holding account into an asset`], "cw-reg"); }
    else if (x.status === "done") { x.cap = { date: v.date, assetNo: v.assetNo, klass: v.klass, cost: Number(v.cost), by }; x.status = "cap"; audit(["ล้างพักงานระหว่างก่อสร้างขึ้นเป็นสินทรัพย์", "Cleared construction in progress into an asset"], `${x.id} ${v.assetNo} ${fmt(v.cost)}`); }
    else if (x.status === "cap") { x.hand = { lgu: v.lgu, date: v.date, letter: v.letter, by }; x.status = "handed"; audit(["ส่งมอบสินทรัพย์ให้ อปท.", "Handed an asset over to a local authority"], `${x.id} ${v.lgu}`); }
    else if (x.status === "handed") { x.accept = { date: v.date, ref: v.ref, by }; x.status = "accepted"; audit(["อปท.รับมอบสินทรัพย์", "Authority received the asset"], x.id); }
    else if (x.status === "accepted") { x.xfer = { gfDoc: v.gfDoc, date: v.date, by }; x.status = "xreq"; const need = tierRole("cwipx", cwCost(x)); audit(["ขอโอนสินทรัพย์ออกจากระบบ", "Requested transfer out of the system"], `${x.id} ${v.gfDoc}`); notify([need], [`ขออนุมัติโอนสินทรัพย์ ${x.id} ออกจากระบบ ${fmt(cwCost(x))} บาท`, `Approve transferring ${x.id} out of the system, ${fmt(cwCost(x))} baht`], "cw-reg"); }
  } },
  acts: x => {
    if (x.status !== "xreq") return [];
    const need = tierRole("cwipx", cwCost(x)), mine = x.xfer.by === me().id;
    return ROLE === need && !mine ? [{ id: "ok", label: L("อนุมัติโอนออก", "Approve the transfer out"), kind: "primary", confirm: `${baht(cwCost(x))} · ${esc(x.xfer.gfDoc)}`, run: y => { y.status = "removed"; y.xfer.approvedBy = me().id; y.xfer.approvedT = nowIso(); audit(["อนุมัติโอนสินทรัพย์ออกจากระบบ", "Approved a transfer out"], y.id); return L("อนุมัติแล้ว", "Approved"); } },
      { id: "no", label: L("ไม่อนุมัติ ส่งกลับ", "Return"), kind: "danger", why: true, run: (y, why) => { y.status = "accepted"; y.xfer.returned = why; audit(["ไม่อนุมัติโอนออก", "Transfer out not approved"], `${y.id} · ${why}`); return L("ส่งกลับแล้ว", "Returned"); } }] : [];
  },
  view: x => {
    const i = cwIdx(x), tierN = tierRole("cwipx", cwCost(x)), nextForm = { building: L("บันทึกงานแล้วเสร็จ", "record completion"), done: L("ล้างพักงานฯ ขึ้นเป็นสินทรัพย์", "clear into an asset"), cap: L("ส่งมอบให้ อปท.", "hand over"), handed: L("บันทึกการรับมอบ", "record receipt"), accepted: L("ขอโอนออกจากระบบ", "request the transfer out") }[x.status];
    return kv([[L("งานก่อสร้าง", "Work"), esc(x.name)], [L("ที่ตั้ง", "Location"), esc(x.loc)], [L("หน่วย", "Unit"), esc(unitName(x.unit))], x.pid && [L("รหัสโครงการ", "Project ID"), `<span class="mono">${x.pid}</span>`], x.contract && [L("สัญญา", "Contract"), x.contract], [L("มูลค่าสะสม", "Cost"), `${baht(cwCost(x))}${x.cap ? "" : ` <span class="sub">(${L("เบิกจ่ายตามสัญญาที่อนุมัติแล้ว", "approved payments on the contract")} ${fmt(cwPaid(x))} + ${fmt(x.cost0 || 0)})</span>`}`],
      x.done && [L("แล้วเสร็จ", "Completed"), `${fdate(x.done.date)} · ${esc(x.done.ref)}`], x.cap && [L("เป็นสินทรัพย์", "Capitalised"), `${fdate(x.cap.date)} · <span class="mono">${esc(x.cap.assetNo)}</span> · ${esc(tx(CW_CLASS[x.cap.klass]))}`], x.hand && [L("ส่งมอบ", "Handed over"), `${esc(x.hand.lgu)} · ${fdate(x.hand.date)} · ${esc(x.hand.letter)}`],
      x.accept && [L("อปท.รับมอบ", "Received"), `${fdate(x.accept.date)} · ${esc(x.accept.ref)}`], x.xfer && [L("โอนออกใน GF", "GF transfer"), `<span class="mono">${esc(x.xfer.gfDoc)}</span> · ${fdate(x.xfer.date)}${x.xfer.approvedBy ? ` · ${L("อนุมัติโดย", "approved by")} ${esc(userName(x.xfer.approvedBy))}` : ""}${x.xfer.returned ? `<div class="sub">${L("ส่งกลับ", "Returned")}: ${esc(x.xfer.returned)}</div>` : ""}`], x.status === "xreq" && [L("ผู้อนุมัติตามขั้น O3", "Approver by O3 tier"), esc(tx(ROLES[tierN]))]])
      + `<ol style="list-style:none;margin:8px 0 0;padding:0">${CW_STEPS.map((s, n) => `<li style="display:flex;gap:10px;align-items:baseline;padding:5px 0;border-bottom:1px solid var(--line)">${dotI(n < i || x.status === "removed" ? "ok" : n === i ? "warn" : "muted")}<b style="font-weight:600">${n + 1}. ${tx(s)}</b>${n === i && x.status !== "removed" ? tag(L("ขั้นปัจจุบัน", "Current step"), "p-warn") : ""}</li>`).join("")}</ol>`
      + `<p class="sub">${nextForm ? `${L("ขั้นต่อไป: กดแก้ไขเพื่อ", "Next: use Edit to")} ${nextForm}` : ""}${x.status === "xreq" ? L("ผู้อนุมัติกดอนุมัติ ผู้ขอโอนออกอนุมัติเองไม่ได้", "the approver decides; the requester cannot approve") : ""} · ${L("ระบบไม่ได้บันทึกลง GFMIS ต้องคีย์ใน GF เอง แล้วนำเลขมาบันทึกที่นี่", "Nothing is posted to GFMIS; key it in GF and record the numbers here")}</p>`;
  },
});

// ---------- all-units asset overview ----------
let CW_FILT = { u: "", c: "", q: "" };
function cwOverview() {
  const units = S.units.filter(u => u.parent), A = (S.assets || []).filter(a => !myUnitOnly() || a.unit === me().unit), W = (S.cwip || []).filter(cwVisible);
  const cats = ASSET_CATS, inUse = A.filter(assetInService), nbvOf = list => sumv(list.map(a => assetDep(a).nbv));
  const rows = A.filter(a => (!CW_FILT.u || a.unit === CW_FILT.u) && (!CW_FILT.c || a.cat === CW_FILT.c) && (!CW_FILT.q || `${tx(a.name)} ${a.loc} ${a.tag}`.toLowerCase().includes(CW_FILT.q.toLowerCase())));
  const th = h => `<th class="n">${h}</th>`;
  return `${eHead("Fisko Assets", "CW2", ["ภาพรวมสินทรัพย์ทุกสำนักกอง", "Assets across all units"], ["กองคลังเห็นครุภัณฑ์ของทุกสำนักกองในที่เดียว แยกตามหน่วยและหมวด พร้อมที่ตั้ง และงานก่อสร้างที่ยังไม่ขึ้นเป็นสินทรัพย์ · อ่านจากทะเบียนครุภัณฑ์ (A2) เดิม ไม่แก้ทะเบียน · ข้อมูลตัวอย่าง ที่ตั้งเป็นข้อความที่กรอกในทะเบียน ไม่ใช่พิกัดแผนที่ · ไม่รวมที่ราชพัสดุและโทรศัพท์ (ยังไม่ทำ)", "The finance division sees every unit's assets in one place by unit and category, with location, plus construction not yet capitalised · read from the asset register (A2), which is unchanged · sample data; the location is the text in the register, not map coordinates · state property and phones are not covered"])}
    ${eKpis([[L("ครุภัณฑ์ที่ใช้งาน", "Assets in service"), inUse.length], [L("ราคาทุนรวม (บาท)", "Total cost (baht)"), fmt(sumv(inUse.map(a => a.cost)))], [L("มูลค่าสุทธิรวม (บาท)", "Total net book value"), fmt(nbvOf(inUse))], [L("ระหว่างก่อสร้าง/รอล้างพัก (บาท)", "Construction in progress (baht)"), fmt(sumv(W.filter(x => ["building", "done"].includes(x.status)).map(cwCost))), `${W.filter(x => ["building", "done"].includes(x.status)).length} ${L("งาน", "works")}`]])}
    <section class="panel"><header><h2>${L("แยกตามหน่วยและหมวด", "By unit and category")}</h2></header><div class="tbl-wrap"><table><thead><tr><th>${L("หน่วย", "Unit")}</th>${cats.map(c => th(esc(tx(c.name)))).join("")}${th(L("รวม (จำนวน)", "Total (count)"))}${th(L("ราคาทุน (บาท)", "Cost (baht)"))}${th(L("มูลค่าสุทธิ (บาท)", "NBV (baht)"))}${th(L("ก่อสร้างค้าง (บาท)", "Construction (baht)"))}</tr></thead><tbody>
      ${units.filter(u => !myUnitOnly() || u.id === me().unit).map(u => { const l = inUse.filter(a => a.unit === u.id); return `<tr><td>${esc(tx(u.name))}</td>${cats.map(c => `<td class="n">${l.filter(a => a.cat === c.id).length || "–"}</td>`).join("")}<td class="n">${l.length}</td><td class="n">${fmt(sumv(l.map(a => a.cost)))}</td><td class="n">${fmt(nbvOf(l))}</td><td class="n">${fmt(sumv(W.filter(x => x.unit === u.id && ["building", "done"].includes(x.status)).map(cwCost))) }</td></tr>`; }).join("")}</tbody></table></div></section>
    <section class="panel"><header><h2>${L("รายการครุภัณฑ์", "Asset list")}</h2><span class="sp"></span><span class="sub">${rows.length} ${L("รายการ", "items")}</span></header><div class="body"><div class="row">
      <select id="cw-u" aria-label="${L("หน่วย", "Unit")}"><option value="">${L("ทุกหน่วย", "All units")}</option>${units.map(u => `<option value="${u.id}" ${CW_FILT.u === u.id ? "selected" : ""}>${esc(tx(u.name))}</option>`).join("")}</select>
      <select id="cw-c" aria-label="${L("หมวด", "Category")}"><option value="">${L("ทุกหมวด", "All categories")}</option>${cats.map(c => `<option value="${c.id}" ${CW_FILT.c === c.id ? "selected" : ""}>${esc(tx(c.name))}</option>`).join("")}</select>
      <input type="search" id="cw-q" placeholder="${L("ค้นชื่อ ที่ตั้ง เลขครุภัณฑ์", "Search name, location, number")}" value="${esc(CW_FILT.q)}"></div>
      <div class="tbl-wrap"><table><thead><tr><th>${L("ครุภัณฑ์", "Asset")}</th><th>${L("หน่วย", "Unit")}</th><th>${L("ที่ตั้ง", "Location")}</th><th>${L("สถานะ", "Status")}</th>${th(L("ราคาทุน", "Cost"))}${th(L("มูลค่าสุทธิ", "NBV"))}</tr></thead><tbody>${rows.map(a => `<tr><td><b style="font-weight:600">${esc(tx(a.name))}</b><div class="sub mono">${esc(a.tag || "–")}</div></td><td>${esc(unitName(a.unit))}</td><td>${esc(a.loc || "–")}</td><td>${tag(tx(AS_ST[a.status][0]), AS_ST[a.status][1])}</td><td class="n">${fmt(a.cost)}</td><td class="n">${fmt(assetDep(a).nbv)}</td></tr>`).join("") || `<tr><td colspan="6" class="sub">${L("ไม่พบรายการ", "Nothing found")}</td></tr>`}</tbody></table></div></div></section>`;
}

// ---------- pages ----------
const CW_APP = "DPT Assets";
Object.assign(GROUPS, { cwg: ["ก่อสร้างและส่งมอบ (กองคลัง)", "Construction and handover"] });
APPS.assets.groups.push("cwg");
{ const base = appOfLink; appOfLink = l => (typeof l === "string" && l.startsWith("cw-") ? "assets" : base(l)); }
ePageDef("assets", "cw-reg", "CW1", "cwg", KROLES, ["งานก่อสร้างและส่งมอบ", "Construction and handover"], () => {
  const W = (S.cwip || []).filter(cwVisible);
  return `${eHead(CW_APP, "CW1", ["งานก่อสร้าง ขึ้นเป็นสินทรัพย์ และส่งมอบให้ อปท.", "Construction, capitalising and handover"], ["ติดตามงานก่อสร้างตั้งแต่ระหว่างก่อสร้าง แล้วเสร็จ ล้างพักงานระหว่างก่อสร้างขึ้นเป็นสินทรัพย์ ส่งมอบ อปท. รับมอบ จนโอนออกจากระบบ (ต้องอนุมัติตามขั้น O3 ผู้ขอโอนอนุมัติเองไม่ได้) · ระบบไม่ได้บันทึกใน GFMIS เลขสินทรัพย์และเลขเอกสารโอนต้องคีย์ใน GF แล้วนำมาบันทึก · ข้อมูลตัวอย่าง", "Follow a construction work from build to completion, clearing the holding account into an asset, handover, receipt by the authority and transfer out of the system (approved by the O3 tier; the requester cannot approve) · nothing is posted to GFMIS: type in the numbers from GF · sample data"])}
    ${eKpis([[L("งานทั้งหมด", "All works"), W.length], [L("ระหว่างก่อสร้าง", "Under construction"), W.filter(x => x.status === "building").length], [L("รอล้างพักงานฯ", "To capitalise"), W.filter(x => x.status === "done").length, "", W.some(x => x.status === "done")], [L("รอส่งมอบ/รับมอบ", "To hand over or receive"), W.filter(x => ["cap", "handed"].includes(x.status)).length], [L("รอโอนออก", "Transfer out pending"), W.filter(x => ["accepted", "xreq"].includes(x.status)).length], [L("โอนออกแล้ว", "Transferred out"), W.filter(x => x.status === "removed").length]])}
    ${crudList("cwip", { head: `<h2>${L("งานก่อสร้าง", "Works")}</h2>` })}`;
});
ePageDef("assets", "cw-all", "CW2", "cwg", KROLES, ["สินทรัพย์ทุกสำนักกอง", "Assets across units"], cwOverview, () => {
  $("#cw-u").onchange = e => { CW_FILT.u = e.target.value; route(); }; $("#cw-c").onchange = e => { CW_FILT.c = e.target.value; route(); };
  const q = $("#cw-q"); q.onchange = () => { CW_FILT.q = q.value; route(); };
});
{
  const base = famTasks;
  famTasks = R => {
    base(R);
    if (!S.cwip) return;
    const W = S.cwip;
    if (cwActor()) {
      W.filter(x => x.status === "done").forEach(x => R(`${L("ล้างพักงานระหว่างก่อสร้าง", "Capitalise")} ${x.id}`, `${x.name} · ${baht(cwCost(x))}`, x.done.date, "cw-reg", "p-warn"));
      W.filter(x => x.status === "cap").forEach(x => R(`${L("ส่งมอบสินทรัพย์ให้ อปท.", "Hand over to the authority")} ${x.id}`, x.name, x.cap.date, "cw-reg", "p-info"));
      W.filter(x => x.status === "accepted").forEach(x => R(`${L("ขอโอนสินทรัพย์ออก", "Request transfer out")} ${x.id}`, x.name, x.accept.date, "cw-reg", "p-info"));
    }
    W.filter(x => x.status === "xreq" && tierRole("cwipx", cwCost(x)) === ROLE && x.xfer.by !== me().id).forEach(x => R(`${L("อนุมัติโอนสินทรัพย์ออก", "Approve a transfer out")} ${x.id}`, `${x.name} · ${baht(cwCost(x))}`, x.xfer.date, "cw-reg", "p-warn"));
  };
}
Object.assign(NAV_ICON, { "cw-reg": "building", "cw-all": "list" });
