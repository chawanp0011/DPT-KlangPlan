// Fisko-ERP-Gov, part 3: Fisko Contract (module 5).
// Procurement contracts, their phases, guarantees, acceptance and payment already live in Fisko Procurement (P7) and
// Finance; this app gathers them in one register (C1), adds a deadline watch (C3) and a payment plan view (C4) over the
// same data, and adds agreements outside procurement (C2: lease, MOU, service, licence) that Fisko did not have.
// ERP-Government reference: agreement, agreement_legal, contract, contract_invoice_plan, purchase_work_acceptance.
const CT_ROLES = ["proc", "prochead", "exec", "fin", "plan", "audit", "div", "divhead", "admin"];
const CT_APP = "DPT Contract";
const AGR_KIND = { lease: ["เช่า", "Lease"], mou: ["บันทึกข้อตกลง (MOU)", "MOU"], service: ["บริการ / บำรุงรักษา", "Service"], license: ["ใช้สิทธิ", "Licence"], other: ["อื่น ๆ", "Other"] };
const AGR_ST = { draft: [["ร่าง", "Draft"], "p-mute"], review: [["รออนุมัติ", "Awaiting approval"], "p-info"], active: [["มีผล", "In force"], "p-ok"], expired: [["หมดอายุ", "Expired"], "p-warn"], terminated: [["บอกเลิก", "Terminated"], "p-bad"] };
const agrStatus = a => (a.status === "active" && a.end < TODAY ? "expired" : a.status);
const ctMgr = () => ROLE === "proc" || ROLE === "prochead";
function openCon(id) { CON_OPEN = id; CON_TAB = "phases"; procSet("contracts:main"); go("procurement"); }

CRUD.def("agr", {
  noun: ["ข้อตกลง / สัญญานอกการจัดซื้อ", "Agreement outside procurement"], st: AGR_ST, live: false,
  list: () => S.agr || [], id: a => a.id, title: a => tx(a.name), sub: a => `${tx(AGR_KIND[a.kind])} · ${a.party}`,
  status: agrStatus, search: a => `${a.id} ${a.name.join(" ")} ${a.party}`,
  filters: [{ id: "st", label: ["สถานะ", "Status"], opts: () => Object.keys(AGR_ST).map(k => [k, tx(AGR_ST[k][0])]), get: agrStatus }, { id: "kind", label: ["ชนิด", "Kind"], opts: () => Object.keys(AGR_KIND).map(k => [k, tx(AGR_KIND[k])]), get: a => a.kind }],
  cols: [{ h: ["เลขที่", "No."], c: a => `<span class="mono">${a.id}</span>` }, { h: ["ข้อตกลง", "Agreement"], c: a => `<b style="font-weight:600">${esc(tx(a.name))}</b><div class="sub">${esc(a.party)}</div>` },
    { h: ["หน่วย", "Unit"], c: a => esc(unitName(a.unit)) }, { h: ["วงเงิน (บาท)", "Amount (baht)"], n: true, c: a => fmt(a.amount) }, { h: ["สิ้นสุด", "Ends"], c: a => fdate(a.end) }],
  fields: (a, v) => [
    { id: "kind", label: ["ชนิด", "Kind"], type: "select", req: true, value: a ? a.kind : "service", opts: Object.keys(AGR_KIND).map(k => [k, tx(AGR_KIND[k])]) },
    { id: "unit", label: ["หน่วยที่รับผิดชอบ", "Responsible unit"], type: "select", req: true, value: a ? a.unit : "", opts: unitOpts() },
    { id: "th", label: ["ชื่อ (ไทย)", "Name (Thai)"], req: true, wide: true, value: a ? a.name[0] : "" }, { id: "en", label: ["ชื่อ (อังกฤษ)", "Name (English)"], wide: true, value: a ? a.name[1] : "" },
    { id: "party", label: ["คู่สัญญา", "Counterparty"], req: true, wide: true, value: a ? a.party : "" },
    { id: "amount", label: ["วงเงินรวม (บาท)", "Total amount (baht)"], type: "number", req: true, min: 0, value: a ? a.amount : 0, hint: L("0 ได้สำหรับ MOU ที่ไม่มีวงเงิน", "0 is fine for an MOU without money") },
    { id: "start", label: ["เริ่มมีผล", "Starts"], type: "date", req: true, value: a ? a.start : TODAY }, { id: "end", label: ["สิ้นสุด", "Ends"], type: "date", req: true, value: a ? a.end : "" },
    { id: "note", label: ["หมายเหตุ", "Note"], type: "textarea", wide: true, value: a ? a.note || "" : "" },
  ],
  check: v => [...(v.end < v.start ? [{ f: "end", m: L("วันสิ้นสุดต้องไม่ก่อนวันเริ่ม", "The end date can't be before the start") }] : [])],
  create: { can: ctMgr, label: ["เพิ่มข้อตกลง", "Add an agreement"], run: v => { const a = { id: `AGR-${CUR_FY}-` + String(maxNo(S.agr.map(x => x.id), /-(\d+)$/) + 1).padStart(3, "0"), kind: v.kind, name: [v.th, v.en || v.th], party: v.party, unit: v.unit, amount: v.amount, start: v.start, end: v.end, status: "draft", owner: me().id, note: v.note };
    S.agr.push(a); audit(["สร้างร่างข้อตกลง", "Drafted an agreement"], `${a.id} ${v.th}`); return a; } },
  edit: { can: a => ctMgr() && a.status === "draft", run: (a, v) => { Object.assign(a, { kind: v.kind, unit: v.unit, name: [v.th, v.en || v.th], party: v.party, amount: v.amount, start: v.start, end: v.end, note: v.note }); audit(["แก้ไขร่างข้อตกลง", "Edited an agreement draft"], `${a.id} ${v.th}`); } },
  acts: a => {
    const st = agrStatus(a), need = tierRole("agr", a.amount), out = [];
    if (st === "draft" && ctMgr()) out.push({ id: "send", label: L("ส่งขออนุมัติ", "Send for approval"), kind: "primary", confirm: `${L("ผู้อนุมัติตามวงเงิน", "Approver by amount")}: ${tx(ROLES[need])}`, run: x => { x.status = "review"; audit(["ส่งข้อตกลงขออนุมัติ", "Sent an agreement for approval"], x.id); notify([need], [`ข้อตกลง ${x.id} รออนุมัติ`, `Agreement ${x.id} awaits approval`], "ct-agr"); return L("ส่งขออนุมัติแล้ว", "Sent for approval"); } },
      { id: "del", label: L("ลบร่าง", "Delete draft"), kind: "danger", why: true, run: (x, why) => { S.agr = S.agr.filter(y => y !== x); audit(["ลบร่างข้อตกลง", "Deleted an agreement draft"], `${x.id} · ${why}`); return L("ลบแล้ว", "Deleted"); } });
    if (st === "review" && ROLE === need) out.push({ id: "ok", label: L("อนุมัติให้มีผล", "Approve"), kind: "primary", confirm: baht(a.amount), run: x => { x.status = "active"; x.approved = { by: me().id, t: nowIso() }; audit(["อนุมัติข้อตกลง", "Approved an agreement"], x.id); return L("อนุมัติแล้ว ข้อตกลงมีผล", "Approved; the agreement is in force"); } },
      { id: "back", label: L("ส่งกลับแก้ไข", "Return for changes"), why: true, run: (x, why) => { x.status = "draft"; audit(["ส่งข้อตกลงกลับแก้ไข", "Returned an agreement"], `${x.id} · ${why}`); return L("ส่งกลับแล้ว", "Returned"); } });
    if ((st === "active" || st === "expired") && (ROLE === "prochead" || ROLE === "exec") && a.status === "active") out.push({ id: "end", label: L("บอกเลิก", "Terminate"), kind: "danger", why: true, run: (x, why) => { x.status = "terminated"; x.term = { why, by: me().id, t: nowIso() }; audit(["บอกเลิกข้อตกลง", "Terminated an agreement"], `${x.id} · ${why}`); return L("บอกเลิกแล้ว", "Terminated"); } });
    return out;
  },
  view: a => kv([[L("ชนิด", "Kind"), esc(tx(AGR_KIND[a.kind]))], [L("คู่สัญญา", "Counterparty"), esc(a.party)], [L("หน่วยที่รับผิดชอบ", "Unit"), esc(unitName(a.unit))], [L("วงเงิน", "Amount"), baht(a.amount)],
    [L("ระยะเวลา", "Period"), `${fdate(a.start)} – ${fdate(a.end)}${agrStatus(a) === "active" ? ` · ${L("เหลือ", "left")} ${daysUntil(a.end)} ${L("วัน", "days")}` : ""}`], [L("ผู้อนุมัติตามวงเงิน", "Approver by amount"), esc(tx(ROLES[tierRole("agr", a.amount)]))],
    a.approved && [L("อนุมัติโดย", "Approved by"), `${esc(userName(a.approved.by))} · ${fdate(a.approved.t, true)}`], a.term && [L("บอกเลิก", "Terminated"), `${esc(a.term.why)} · ${esc(userName(a.term.by))}`], a.note && [L("หมายเหตุ", "Note"), esc(a.note)]]),
});

const conGuar = c => (c.guarantee ? `${tx(GUAR_TYPE[c.guarantee.type])} · ${fdate(c.guarantee.expires)}` : "–");
ePageDef("contract", "ct-reg", "C1", "ctr", CT_ROLES, ["ทะเบียนสัญญา", "Contract register"], () => {
  const C = S.contracts || [], accN = C.reduce((s, c) => s + c.phases.filter(phaseAccepted).length, 0), phN = C.reduce((s, c) => s + c.phases.length, 0);
  const val = C.reduce((s, c) => s + c.amount, 0), paid = (S.payreqs || []).filter(p => p.status === "approved").reduce((s, p) => s + p.amount, 0);
  return `${eHead(CT_APP, "C1", ["ทะเบียนสัญญา", "Contract register"], ["สัญญาจัดซื้อจัดจ้างทุกฉบับในที่เดียว · การลงนาม ตรวจรับ หลักประกัน และเปลี่ยนแปลงทำในแอปจัดซื้อ (P7) ข้อมูลชุดเดียวกัน", "Every procurement contract in one place · signing, acceptance, guarantees and changes are done in Procurement (P7), same data"])}
    ${eKpis([[L("สัญญา", "Contracts"), C.length], [L("มูลค่ารวม", "Total value"), mb(val), L("ล้านบาท", "M baht")], [L("งวดที่ตรวจรับแล้ว", "Phases accepted"), `${accN}/${phN}`], [L("อนุมัติเบิกจ่ายแล้ว", "Paid (approved)"), mb(paid), L("ล้านบาท", "M baht")]])}
    <section class="panel"><header><h2>${L("สัญญาจัดซื้อจัดจ้าง", "Procurement contracts")}</h2></header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("สัญญา", "Contract")}</th><th>${L("ผู้ขาย / ผู้รับจ้าง", "Supplier")}</th><th class="n">${L("วงเงิน (บาท)", "Amount (baht)")}</th><th>${L("ลงนาม", "Signed")}</th><th>${L("งวด (รับ / จ่าย)", "Phases (accepted / paid)")}</th><th>${L("หลักประกัน", "Guarantee")}</th><th>${L("สถานะ", "Status")}</th><th></th></tr></thead>
    <tbody>${C.map(c => `<tr><td><span class="mono">${c.id}</span><div class="sub">${esc(c.no)}</div></td><td>${esc(tx(c.vendor))}</td><td class="n">${fmt(c.amount)}</td><td>${fdate(c.signed)}</td>
      <td>${c.phases.filter(phaseAccepted).length}/${c.phases.length} · ${c.phases.filter(ph => phPaid(c, ph)).length}/${c.phases.length}</td><td class="sub">${conGuar(c)}</td><td>${c.status === "terminated" ? tagN("p-bad", "บอกเลิก", "Terminated") : tagN("p-ok", "ดำเนินการ", "Active")}</td>
      <td>${allowed("procurement") ? `<button class="btn" type="button" data-conopen2="${c.id}">${L("เปิดใน P7", "Open in P7")}</button>` : ""}</td></tr>`).join("") || `<tr><td colspan="8" class="sub">${L("ยังไม่มีสัญญา", "No contracts yet")}</td></tr>`}</tbody></table></div></section>`;
}, () => $$("[data-conopen2]").forEach(b => (b.onclick = () => openCon(b.dataset.conopen2))));

ePageDef("contract", "ct-agr", "C2", "ctr", CT_ROLES, ["ข้อตกลงนอกการจัดซื้อ", "Agreements outside procurement"], () => {
  const A = S.agr || [];
  return `${eHead(CT_APP, "C2", ["ข้อตกลงและสัญญานอกการจัดซื้อ", "Agreements outside procurement"], ["เช่า บริการ ใช้สิทธิ และ MOU ที่ไม่ผ่านรายการจัดซื้อ · ผู้อนุมัติตามขั้นวงเงินใน O3", "Leases, services, licences and MOUs that do not go through a procurement case · approver by the O3 tiers"])}
    ${eKpis([[L("ข้อตกลงทั้งหมด", "Agreements"), A.length], [L("มีผล", "In force"), A.filter(a => agrStatus(a) === "active").length], [L("รออนุมัติ", "Awaiting approval"), A.filter(a => a.status === "review").length, "", A.some(a => a.status === "review")], [L("สิ้นสุดใน 60 วัน", "Ending in 60 days"), A.filter(a => agrStatus(a) === "active" && daysUntil(a.end) <= 60).length]])}
    ${crudList("agr", { head: `<h2>${L("ทะเบียนข้อตกลง", "Agreement register")}</h2>` })}`;
});

function ctWatchRows() {
  const rows = [], add = (kind, doc, text, due, link) => rows.push({ kind, doc, text, due, d: daysUntil(due), link });
  (S.contracts || []).filter(c => c.status !== "terminated").forEach(c => {
    c.phases.filter(ph => !phaseAccepted(ph) && daysUntil(ph.due) <= 30).forEach(ph => add(L("งวดงาน", "Phase"), c.id, `${tx(ph.name)} · ${baht(ph.amount)}`, ph.due, "prc-contracts"));
    if (c.guarantee && c.guarantee.status === "held" && daysUntil(c.guarantee.expires) <= 60) add(L("หลักประกัน", "Guarantee"), c.id, `${tx(GUAR_TYPE[c.guarantee.type])} · ${baht(c.guarantee.amount)}`, c.guarantee.expires, "prc-contracts");
  });
  (S.agr || []).filter(a => agrStatus(a) === "active" && daysUntil(a.end) <= 60).forEach(a => add(L("ข้อตกลงสิ้นสุด", "Agreement ends"), a.id, `${tx(a.name)} · ${a.party}`, a.end, "ct-agr"));
  (S.agr || []).filter(a => a.status === "review").forEach(a => add(L("รออนุมัติ", "Awaiting approval"), a.id, `${tx(a.name)} · ${tx(ROLES[tierRole("agr", a.amount)])}`, a.start, "ct-agr"));
  return rows.sort((a, b) => a.d - b.d);
}
ePageDef("contract", "ct-watch", "C3", "ctr", CT_ROLES, ["เฝ้าระวังกำหนดเวลา", "Deadline watch"], () => {
  const R = ctWatchRows();
  return `${eHead(CT_APP, "C3", ["เฝ้าระวังกำหนดเวลา", "Deadline watch"], ["งวดงานที่ใกล้หรือเลยกำหนด หลักประกันที่ใกล้หมดอายุ และข้อตกลงที่ใกล้สิ้นสุด · คำนวณจากข้อมูลจริงในระบบ ณ วันที่สาธิต", "Phases due or overdue, guarantees about to expire and agreements about to end · computed from the data as of the demo date"])}
    ${eKpis([[L("เลยกำหนด", "Overdue"), R.filter(r => r.d < 0).length, "", R.some(r => r.d < 0)], [L("ภายใน 7 วัน", "Within 7 days"), R.filter(r => r.d >= 0 && r.d <= 7).length], [L("ทั้งหมดที่เฝ้า", "Watched"), R.length]])}
    <section class="panel"><header><h2>${L("รายการที่ต้องติดตาม", "To follow up")}</h2></header>${R.length ? `<div class="tbl-wrap"><table><tbody>${R.map(r => `<tr><td>${dotI(r.d < 0 ? "bad" : r.d <= 7 ? "warn" : "ok")}${esc(r.kind)} <span class="mono">${esc(r.doc)}</span><div class="sub">${esc(r.text)}</div></td><td class="sub" style="white-space:nowrap">${clockTxt(r.due)}</td><td><button class="btn" type="button" data-jump="${r.link}">${L("เปิด", "Open")}</button></td></tr>`).join("")}</tbody></table></div>` : `<div class="body sub">${dotI("ok")}${L("ไม่มีรายการใกล้กำหนด", "Nothing close to a deadline")}</div>`}</section>`;
});

ePageDef("contract", "ct-plan", "C4", "ctr", CT_ROLES, ["แผนงวดงานและการจ่ายเงิน", "Phase and payment plan"], () => {
  const C = S.contracts || [];
  const voucher = (c, ph) => { const v = (S.vouchers || []).find(x => x.contract === c.id && x.phase === ph.n && x.state !== "cancelled"); return v ? (typeof vTag === "function" ? vTag(v) : esc(v.state)) : `<span class="sub">–</span>`; };
  return `${eHead(CT_APP, "C4", ["แผนงวดงานและการจ่ายเงิน", "Phase and payment plan"], ["ต่อสัญญาแต่ละฉบับ: งวด กำหนดส่ง ยอด ตรวจรับ ใบขอเบิก และการจ่าย · ใช้ตรวจว่างวดใดตรวจรับแล้วแต่ยังไม่เบิก", "Per contract: phases, due dates, amounts, acceptance, vouchers and payment · to spot phases accepted but not yet claimed"])}
    ${C.map(c => `<section class="panel"><header><h2><span class="mono">${c.id}</span> ${esc(tx(c.vendor))}</h2><span class="sp"></span><span class="sub">${baht(c.amount)}</span></header><div class="tbl-wrap"><table><thead><tr><th>${L("งวด", "Phase")}</th><th>${L("กำหนด", "Due")}</th><th class="n">${L("ยอด (บาท)", "Amount (baht)")}</th><th>${L("ตรวจรับ", "Acceptance")}</th><th>${L("ใบขอเบิก", "Voucher")}</th><th>${L("จ่ายแล้ว", "Paid")}</th></tr></thead>
      <tbody>${c.phases.map(ph => `<tr><td>${esc(tx(ph.name))}</td><td>${fdate(ph.due)}${!phaseAccepted(ph) && ph.due < TODAY ? ` ${tagN("p-bad", "เลยกำหนด", "Late")}` : ""}</td><td class="n">${fmt(ph.amount)}</td><td>${phaseAccepted(ph) ? tagN("p-ok", "ตรวจรับแล้ว", "Accepted") : `<span class="sub">${L("ยังไม่ตรวจรับ", "Not yet")}</span>`}</td><td>${voucher(c, ph)}</td><td>${phPaid(c, ph) ? tagN("p-ok", "จ่ายแล้ว", "Paid") : phaseAccepted(ph) ? tagN("p-warn", "ตรวจรับแล้ว ยังไม่เบิก", "Accepted, not claimed") : "–"}</td></tr>`).join("")}</tbody></table></div></section>`).join("") || eNote(L("ยังไม่มีสัญญา", "No contracts yet"))}`;
});
