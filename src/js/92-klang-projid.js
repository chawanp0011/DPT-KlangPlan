// Fisko-KlangFinance, round R1: Project ID of a procurement item, e-GP number linked afterwards, GFMIS budget rows,
// file import adapters, and the end-to-end loop of an item. Written new for the DPT finance division (not from Fisko-ERP-Gov).
// Rules agreed with the user on 3 Nov 2569: a Project ID is the code of ONE procurement item; the system issues it
// automatically when the item is created from an allocation line (eBud); every procurement has one, with or without
// an e-GP number; the e-GP number is linked later, after the item has been sent to e-GP. The number format below is a
// SAMPLE of ours, not DPT's real format (A3 Q-01 is still open); change PID_FMT in this one place.
// A budget row is one line of GFMIS data under the item (budget code, source of funds, fiscal year, amount), the shape
// the e-GP manuals show. All e-GP and GF data here comes from files or typing; nothing is connected to a real system.
// Roles that may open the new pages: every role except the vendor. Taken here, after 90-erp-fin-roles.js and 91-erp-hr.js have added theirs (KROLES in 84 is taken too early to include them).
const KROLES = Object.keys(ROLES).filter(r => r !== "vendor");
const PID_FMT = { prefix: "PJ", pad: 5 };
const PJ_ACT = ["proc", "prochead", "fin", "finhead"]; // roles that link numbers, edit budget rows and import; others only view
const pjActor = () => PJ_ACT.includes(ROLE);
const pjMake = s => `${PID_FMT.prefix}-${CUR_FY}-${String((s.pidSeq = (s.pidSeq || 0) + 1)).padStart(PID_FMT.pad, "0")}`;
const pidNew = () => pjMake(S);
const pjItem = pid => (S.pplan || []).find(p => p.pid === pid);
const pjState = p => (p.egp && p.egp.no ? "linked" : p.egpSent ? "sent" : "unsent");
const PJ_ST = { unsent: [["ยังไม่ส่ง e-GP", "Not sent to e-GP"], "p-mute"], sent: [["ส่ง e-GP แล้ว รอเลข", "Sent, awaiting number"], "p-warn"], linked: [["ผูกเลข e-GP แล้ว", "Linked to e-GP"], "p-ok"] };
const PJ_FUND = { act: ["งบประมาณตาม พ.ร.บ.", "Appropriation act"], carry: ["เงินกันเหลื่อมปี", "Carry-over reserve"], other: ["อื่น ๆ", "Other"] };
const pjVisible = p => !(ROLE === "div" || ROLE === "divhead") || famLine(p.line).unit === me().unit;
const pjRows = pid => (S.pjrows || []).filter(r => r.pid === pid);
const pjSum = pid => sumv(pjRows(pid).map(r => r.amount));
const pjBudgetFlag = p => { const n = pjRows(p.pid).length; return !n ? "none" : pjSum(p.pid) === p.est ? "ok" : "diff"; };
function pjLog(pid, kind, text, why, src) { S.pidlog.unshift({ t: nowIso(), pid, by: me().id, kind, text, why: why || "", src: src || "manual" }); }
const pjDup = (no, p) => (S.pplan || []).find(x => x !== p && x.egp && x.egp.no === no);
function pjLink(p, no, src, why, date) {
  const prev = p.egp && p.egp.no;
  p.egp = Object.assign(p.egp || {}, { no, stage: (p.egp && p.egp.stage) || ["ผูกเลขแล้ว", "Linked"], date: date || TODAY });
  const cs = S.cases ? caseByPlan(p.id) : null; if (cs && cs.egp) cs.egp.no = no; // keep the procurement file in step
  pjLog(p.pid, "link", prev ? `${prev} → ${no}` : no, why, src);
  audit(prev ? ["แก้เลข e-GP ที่ผูก", "Changed the linked e-GP number"] : ["ผูกเลข e-GP กับรหัสโครงการ", "Linked an e-GP number to a Project ID"], `${p.pid} ${no}${why ? " · " + why : ""}`);
}

// ---------- the loop of one item, derived from the data already in Fisko ----------
function pjLoop(p) {
  const line = famLine(p.line), rq = (S.reqn || []).filter(r => r.plan === p.id).slice(-1)[0], cs = S.cases ? caseByPlan(p.id) : null, ct = (S.contracts || []).find(c => c.plan === p.id), st = pjState(p);
  const accN = ct ? ct.phases.filter(phaseAccepted).length : 0, paid = ct ? sumv(S.payreqs.filter(y => y.contract === ct.id && y.status === "approved").map(y => y.amount)) : 0;
  const cst = cs ? CASE_STATES[caseState(cs)] || { th: "-", en: "-" } : null;
  const steps = [
    [L("ได้รับจัดสรรจาก eBud", "Allocated from eBud"), !!line.amount, `${tx(line.name)} · ${baht(line.amount)}`],
    [L("อยู่ในแผนจัดซื้อ (ออกรหัสโครงการ)", "In the procurement plan (Project ID issued)"), true, `${p.id} · ${baht(p.est)}`],
    [L("ขอซื้อขอจ้าง", "Requisition"), !!rq && ["approved", "contracted"].includes(rq.status), rq ? `${rq.id} · ${tx((REQ_ST[rq.status] || [[rq.status, rq.status]])[0])}` : L("ยังไม่ขอ", "Not raised")],
    [L("รายการจัดซื้อ", "Procurement file"), !!ct, cst ? tx([cst.th, cst.en]) : "–"],
    [L("ส่ง e-GP และผูกเลข", "Sent to e-GP and number linked"), st === "linked", st === "linked" ? p.egp.no : tx(PJ_ST[st][0])],
    [L("ทำสัญญา", "Contract"), !!ct, ct ? `${ct.id} · ${baht(ct.amount)} · ${esc(tx(ct.vendor))}` : "–"],
    [L("ตรวจรับงาน", "Acceptance"), !!ct && accN === ct.phases.length, ct ? `${accN}/${ct.phases.length} ${L("งวด", "phases")}` : "–"],
    [L("อนุมัติเบิกจ่าย", "Payment approved"), !!ct && paid >= ct.amount, ct ? `${baht(paid)} / ${baht(ct.amount)}` : "–"],
  ];
  const cur = steps.findIndex(s => !s[1]);
  return `<ol class="pj-loop" style="list-style:none;margin:0;padding:0">${steps.map((s, i) => `<li style="display:flex;gap:10px;align-items:baseline;padding:6px 0;border-bottom:1px solid var(--line)">${dotI(s[1] ? "ok" : i === cur ? "warn" : "muted")}<b style="font-weight:600;min-width:12em">${i + 1}. ${s[0]}</b><span class="sub">${s[2]}</span>${i === cur ? tag(L("ขั้นปัจจุบัน", "Current step"), "p-warn") : ""}</li>`).join("")}</ol>
    <p class="sub">${L("ที่มา: อ่านจากแผน ใบขอซื้อ รายการจัดซื้อ สัญญา และใบอนุมัติเบิกจ่ายที่มีใน Fisko (ข้อมูลตัวอย่าง) ไม่ได้ติดตามผลเบิกจ่ายจริงจาก GFMIS", "Read from the plan, requisitions, procurement files, contracts and payment approvals already in Fisko (sample data); real GFMIS disbursement is not tracked")}</p>`;
}

// ---------- seed: every sample plan item gets a Project ID, budget rows, and a short link history ----------
Object.keys(SEEDS).forEach(k => {
  const prev = SEEDS[k].seed;
  SEEDS[k].seed = () => {
    const s = prev(); s.pjrows = []; s.pidlog = [];
    (s.pplan || []).forEach((p, i) => {
      p.pid = pjMake(s);
      s.pjrows.push({ id: "BR-" + String(s.pjrows.length + 1).padStart(4, "0"), pid: p.pid, fy: CUR_FY, code: "ตัวอย่าง-" + p.line, fund: "act", gf: true, amount: p.est });
      if (p.egp) s.pidlog.push({ t: "2026-10-1" + (i % 5) + "T10:00", pid: p.pid, by: (s.users.find(u => u.role === "proc") || s.users[0]).id, kind: "link", text: p.egp.no, why: "", src: "manual" });
    });
    if (s.pplan.length > 4) { s.pplan[3].egpSent = { date: "2026-10-18", by: (s.users.find(u => u.role === "proc") || s.users[0]).id }; s.pjrows[3].amount = s.pplan[3].est - 20000; } // one sent but unlinked, one budget total that differs
    return s;
  };
});

// ---------- record types ----------
CRUD.def("pj", {
  noun: ["รหัสโครงการ", "Project ID"], st: PJ_ST, live: false,
  list: () => (S.pplan || []).filter(pjVisible), id: p => p.pid, title: p => `${p.pid} · ${tx(p.name)}`, sub: p => `${p.id} · ${baht(p.est)}`,
  status: p => pjState(p), search: p => `${p.pid} ${p.id} ${tx(p.name)} ${p.egp ? p.egp.no : ""}`,
  filters: [{ id: "st", label: ["สถานะ e-GP", "e-GP status"], opts: () => Object.keys(PJ_ST).map(k => [k, tx(PJ_ST[k][0])]), get: p => pjState(p) }, { id: "u", label: ["หน่วย", "Unit"], opts: () => allUnitOpts(), get: p => famLine(p.line).unit }],
  cols: [{ h: ["รหัสโครงการ", "Project ID"], c: p => `<span class="mono">${p.pid}</span>` }, { h: ["รายการจัดซื้อ", "Procurement item"], c: p => `<b style="font-weight:600">${esc(tx(p.name))}</b><div class="sub">${p.id} · ${esc(unitName(famLine(p.line).unit))}</div>` },
    { h: ["วงเงิน (บาท)", "Amount (baht)"], n: true, c: p => fmt(p.est) }, { h: ["เลข e-GP", "e-GP no."], c: p => (p.egp && p.egp.no ? `<span class="mono">${esc(p.egp.no)}</span>` : "–") },
    { h: ["แถวงบ", "Budget rows"], c: p => { const f = pjBudgetFlag(p); return f === "ok" ? tag(L("ยอดตรง", "Matches"), "p-ok") : f === "diff" ? tag(L("ยอดไม่ตรง", "Differs"), "p-warn") : tag(L("ยังไม่มี", "None"), "p-mute"); } }],
  fields: (p, v) => [{ id: "egp", label: ["เลขโครงการ e-GP (ผูกหลังส่ง e-GP)", "e-GP project number (linked after sending)"], req: true, value: p && p.egp ? p.egp.no : "", hint: L("1 เลข e-GP ต่อ 1 รหัสโครงการ เลขที่ผูกกับรายการอื่นแล้วใช้ไม่ได้", "One e-GP number per Project ID; a number already linked elsewhere is refused") }],
  check: (v, p) => { const d = v.egp && pjDup(v.egp, p); return d ? [{ f: "egp", m: `${L("เลขนี้ผูกกับ", "This number is linked to")} ${d.pid} ${L("แล้ว", "already")}` }] : []; },
  edit: { can: p => pjActor(), why: () => true, run: (p, v, why) => pjLink(p, v.egp, "manual", why) },
  acts: p => (pjActor() && pjState(p) === "unsent" ? [{ id: "sent", label: L("บันทึกว่าส่ง e-GP แล้ว", "Record as sent to e-GP"), kind: "primary", confirm: L("สถานะจะเป็น ส่ง e-GP แล้ว รอเลข ระบบไม่ได้ส่งให้ e-GP จริง", "Status becomes sent, awaiting number; nothing is sent to a real e-GP"), run: x => { x.egpSent = { date: TODAY, by: me().id }; pjLog(x.pid, "sent", TODAY, "", "manual"); audit(["บันทึกส่ง e-GP", "Recorded sent to e-GP"], x.pid); return L("บันทึกแล้ว", "Recorded"); } }]
    : pjActor() && pjState(p) === "sent" ? [{ id: "unsent", label: L("ยกเลิกสถานะส่ง e-GP", "Undo the sent status"), why: true, run: (x, why) => { x.egpSent = null; pjLog(x.pid, "unsent", TODAY, why, "manual"); audit(["ยกเลิกสถานะส่ง e-GP", "Undid sent to e-GP"], `${x.pid} · ${why}`); return L("ยกเลิกแล้ว", "Undone"); } }] : []),
  view: p => kv([[L("รหัสโครงการ", "Project ID"), `<span class="mono">${p.pid}</span> <span class="sub">${L("ออกอัตโนมัติ", "issued automatically")}</span>`], [L("รายการในแผน", "Plan item"), `${p.id} · ${esc(tx(p.name))}`],
    [L("รายการที่ได้รับจัดสรร", "Allocation line"), esc(`${tx(famLine(p.line).name)} (${p.line})`)], [L("หน่วย", "Unit"), esc(unitName(famLine(p.line).unit))], [L("วงเงิน", "Amount"), baht(p.est)],
    [L("สถานะ e-GP", "e-GP status"), tag(tx(PJ_ST[pjState(p)][0]), PJ_ST[pjState(p)][1])], p.egp && [L("เลข e-GP", "e-GP no."), `<span class="mono">${esc(p.egp.no)}</span> · ${tx(p.egp.stage)} · ${fdate(p.egp.date)}`],
    p.egpSent && [L("ส่ง e-GP เมื่อ", "Sent on"), fdate(p.egpSent.date)],
    [L("แถวงบประมาณ", "Budget rows"), pjRows(p.pid).length ? `${pjRows(p.pid).length} ${L("แถว รวม", "rows, total")} ${baht(pjSum(p.pid))}${pjBudgetFlag(p) === "diff" ? ` · ${tag(L("ไม่เท่าวงเงิน", "differs from amount"), "p-warn")}` : ""}` : L("ยังไม่มี (ดู PJ2)", "None yet (see PJ2)")]]),
  tabs: p => [["loop", L("ครบลูป", "Full loop"), pjLoop(p)], ["links", L("ประวัติการผูก", "Link history"), (() => { const h = (S.pidlog || []).filter(x => x.pid === p.pid); return h.length ? `<div class="tbl-wrap"><table><thead><tr><th>${L("เวลา", "When")}</th><th>${L("เรื่อง", "What")}</th><th>${L("โดย", "By")}</th><th>${L("ที่มา", "Source")}</th></tr></thead><tbody>${h.map(x => `<tr><td>${fdate(x.t, true)}</td><td>${esc(x.kind === "link" ? "e-GP " + x.text : x.kind === "sent" ? L("บันทึกส่ง e-GP", "Recorded sent") : L("ยกเลิกสถานะส่ง", "Undid sent"))}${x.why ? `<div class="sub">${esc(x.why)}</div>` : ""}</td><td>${esc(userName(x.by))}</td><td>${x.src === "file" ? L("ไฟล์", "File") : L("กรอกเอง", "Typed")}</td></tr>`).join("")}</tbody></table></div>` : `<div class="sub">${L("ยังไม่มีการผูก", "Nothing linked yet")}</div>`; })()]],
});

CRUD.def("pjrow", {
  noun: ["แถวงบประมาณ", "Budget row"], st: { on: [["ใช้งาน", "Active"], "p-ok"] }, live: false,
  list: () => (S.pjrows || []).filter(r => { const p = pjItem(r.pid); return p && pjVisible(p); }), id: r => r.id, title: r => `${r.id} · ${r.pid}`, sub: r => `${r.code} · ${baht(r.amount)}`, status: () => "on", search: r => `${r.id} ${r.pid} ${r.code}`,
  filters: [{ id: "fy", label: ["ปีงบ", "Fiscal year"], opts: () => [...new Set((S.pjrows || []).map(r => r.fy))].sort().map(y => [String(y), String(y)]), get: r => String(r.fy) }],
  cols: [{ h: ["แถว", "Row"], c: r => `<span class="mono">${r.id}</span>` }, { h: ["รหัสโครงการ", "Project ID"], c: r => `<span class="mono">${r.pid}</span>` }, { h: ["ปีงบ", "FY"], c: r => r.fy }, { h: ["รหัสงบประมาณ", "Budget code"], c: r => `<span class="mono">${esc(r.code)}</span>` },
    { h: ["แหล่งเงิน", "Source"], c: r => esc(tx(PJ_FUND[r.fund])) }, { h: ["เบิกผ่าน GFMIS", "Via GFMIS"], c: r => (r.gf ? L("ใช่", "Yes") : L("ไม่", "No")) }, { h: ["จำนวนเงิน (บาท)", "Amount (baht)"], n: true, c: r => fmt(r.amount) }],
  fields: (r, v) => [
    { id: "pid", label: ["รหัสโครงการ", "Project ID"], type: "select", req: true, lock: !!r, show: r ? r.pid : "", value: r ? r.pid : "", opts: (S.pplan || []).filter(pjVisible).map(p => [p.pid, `${p.pid} ${tx(p.name)}`]) },
    { id: "fy", label: ["ปีงบประมาณ (พ.ศ.)", "Fiscal year (B.E.)"], type: "number", req: true, min: 2560, max: 2599, value: r ? r.fy : CUR_FY },
    { id: "code", label: ["รหัสงบประมาณ", "Budget code"], req: true, value: r ? r.code : "" }, { id: "fund", label: ["แหล่งของเงิน", "Source of funds"], type: "select", req: true, value: r ? r.fund : "act", opts: Object.keys(PJ_FUND).map(k => [k, tx(PJ_FUND[k])]) },
    { id: "gf", label: ["เบิกจ่ายผ่าน GFMIS", "Disbursed through GFMIS"], type: "check", value: r ? r.gf : true }, { id: "amount", label: ["จำนวนเงิน (บาท)", "Amount (baht)"], type: "number", req: true, min: 1, value: r ? r.amount : "" }],
  check: (v, r) => { const e = [], dup = (S.pjrows || []).find(x => x !== r && x.pid === (r ? r.pid : v.pid) && x.fy === v.fy && x.code === v.code); if (dup) e.push({ f: "code", m: `${L("มีแถวรหัสนี้ในปีงบนี้แล้ว", "This code already has a row for this year")} ${dup.id}` }); return e; },
  create: { can: pjActor, label: ["เพิ่มแถวงบประมาณ", "Add a budget row"], run: v => { const r = { id: eNextId("BR-", S.pjrows), pid: v.pid, fy: v.fy, code: v.code, fund: v.fund, gf: !!v.gf, amount: v.amount }; S.pjrows.push(r); audit(["เพิ่มแถวงบประมาณ", "Added a budget row"], `${r.id} ${r.pid}`); return r; } },
  edit: { can: () => pjActor(), why: () => true, run: (r, v, why) => { Object.assign(r, { fy: v.fy, code: v.code, fund: v.fund, gf: !!v.gf, amount: v.amount }); audit(["แก้แถวงบประมาณ", "Edited a budget row"], `${r.id} · ${why}`); } },
  acts: r => (pjActor() ? [{ id: "del", label: L("ลบแถว", "Delete the row"), kind: "danger", why: true, run: (x, why) => { S.pjrows = S.pjrows.filter(y => y !== x); audit(["ลบแถวงบประมาณ", "Deleted a budget row"], `${x.id} · ${why}`); return L("ลบแล้ว", "Deleted"); } }] : []),
  view: r => { const p = pjItem(r.pid); return kv([[L("รหัสโครงการ", "Project ID"), `<span class="mono">${r.pid}</span>`], [L("รายการ", "Item"), p ? esc(tx(p.name)) : "–"], [L("ปีงบ", "FY"), r.fy], [L("รหัสงบประมาณ", "Budget code"), `<span class="mono">${esc(r.code)}</span>`], [L("แหล่งของเงิน", "Source"), esc(tx(PJ_FUND[r.fund]))], [L("เบิกผ่าน GFMIS", "Via GFMIS"), r.gf ? L("ใช่", "Yes") : L("ไม่", "No")], [L("จำนวนเงิน", "Amount"), baht(r.amount)], p && [L("รวมทุกแถวของรหัสโครงการนี้", "All rows of this Project ID"), `${baht(pjSum(r.pid))} / ${L("วงเงิน", "amount")} ${baht(p.est)}`]]); },
});

// ---------- file import adapters ----------
// Each adapter reads text rows (CSV or tab separated, with a header line) into { rows, errors }. A later API adapter
// can produce the same rows and reuse check and apply. The file layouts below are assumptions of ours: the real
// e-GP and GF files have not been seen yet, so they will need to change.
function pjParse(text, cols) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (!lines.length) return { head: false, rows: [] };
  const sep = lines[0].includes("\t") ? "\t" : ",", cut = l => l.split(sep).map(c => c.trim().replace(/^"|"$/g, ""));
  const head = cut(lines[0]).map(c => c.toLowerCase());
  if (!cols.every(c => head.includes(c))) return { head: false, rows: [] };
  return { head: true, rows: lines.slice(1).map(l => { const c = cut(l), o = {}; head.forEach((h, i) => (o[h] = c[i] || "")); return o; }) };
}
const PJ_IMPORT = {
  egp: {
    name: ["เลข e-GP ที่ได้หลังส่ง (ผูกกับรหัสโครงการ)", "e-GP numbers received after sending"], cols: ["pid", "egp_no", "date"], layout: "pid,egp_no,date",
    check: (r, i, all) => {
      const p = pjItem(r.pid); if (!p) return L("ไม่พบรหัสโครงการ", "Project ID not found");
      if (!r.egp_no) return L("ไม่มีเลข e-GP", "No e-GP number");
      if (r.date && !/^\d{4}-\d{2}-\d{2}$/.test(r.date)) return L("วันที่ต้องเป็น YYYY-MM-DD", "Date must be YYYY-MM-DD");
      const d = pjDup(r.egp_no, p); if (d) return `${L("เลขนี้ผูกกับ", "Number linked to")} ${d.pid} ${L("แล้ว", "already")}`;
      if (all.some((x, j) => j !== i && x.egp_no === r.egp_no && x.pid !== r.pid)) return L("เลขซ้ำกับแถวอื่นในไฟล์", "Number repeated in the file");
      if (p.egp && p.egp.no && p.egp.no !== r.egp_no) return L("รหัสโครงการนี้ผูกเลขอื่นอยู่ แก้ที่หน้า PJ1 พร้อมเหตุผล", "Already linked to another number; change it on PJ1 with a reason");
      return "";
    },
    apply: (r, name) => { pjLink(pjItem(r.pid), r.egp_no, "file", name, r.date || TODAY); },
    show: r => `${r.pid} → ${r.egp_no}`,
    sample: () => (S.pplan || []).filter(p => !p.egp).map((p, i) => `${p.pid},EGP-70-${String(210 + i).padStart(4, "0")},${TODAY}`).concat([`${PID_FMT.prefix}-${CUR_FY}-99999,EGP-70-0299,${TODAY}`]),
  },
  gf: {
    name: ["แถวงบประมาณ GFMIS ต่อรหัสโครงการ", "GFMIS budget rows per Project ID"], cols: ["pid", "fy", "code", "fund", "amount"], layout: "pid,fy,code,fund,amount (fund = act | carry | other)",
    check: r => {
      if (!pjItem(r.pid)) return L("ไม่พบรหัสโครงการ", "Project ID not found");
      const fy = Number(r.fy); if (!(fy >= 2560 && fy <= 2599)) return L("ปีงบไม่ถูกต้อง", "Invalid fiscal year");
      if (!r.code) return L("ไม่มีรหัสงบประมาณ", "No budget code");
      if (!PJ_FUND[r.fund]) return L("fund ต้องเป็น act, carry หรือ other", "fund must be act, carry or other");
      if (!(Number(r.amount) > 0)) return L("จำนวนเงินต้องมากกว่า 0", "Amount must be above 0");
      return "";
    },
    apply: r => {
      const fy = Number(r.fy), ex = (S.pjrows || []).find(x => x.pid === r.pid && x.fy === fy && x.code === r.code);
      if (ex) { ex.amount = Number(r.amount); ex.fund = r.fund; } else S.pjrows.push({ id: eNextId("BR-", S.pjrows), pid: r.pid, fy, code: r.code, fund: r.fund, gf: true, amount: Number(r.amount) });
      audit(["นำเข้าแถวงบประมาณ", "Imported a budget row"], `${r.pid} ${r.code}`);
    },
    show: r => `${r.pid} · ${r.fy} · ${r.code} · ${fmt(Number(r.amount) || 0)}`,
    sample: () => (S.pplan || []).slice(0, 2).map(p => `${p.pid},${CUR_FY},ตัวอย่างนำเข้า-${p.line},carry,${Math.round(p.est * 0.1)}`).concat([`${PID_FMT.prefix}-${CUR_FY}-99999,${CUR_FY},X,act,1000`]),
  },
};
let PJ_IMP = { kind: "egp", text: "", name: "", rows: null };
function pjPreview() {
  const k = PJ_IMPORT[PJ_IMP.kind], p = pjParse(PJ_IMP.text, k.cols);
  PJ_IMP.rows = p.head ? p.rows.map((r, i, all) => ({ r, err: k.check(r, i, all) })) : [];
  PJ_IMP.headBad = !p.head && PJ_IMP.text.trim() !== "";
}

// ---------- pages ----------
const PJ_APP = "DPT Procurement";
Object.assign(GROUPS, { pidg: ["รหัสโครงการ", "Project ID"] });
APPS.procurement.groups.push("pidg");
{ const base = appOfLink; appOfLink = l => (typeof l === "string" && l.startsWith("pj-") ? "procurement" : base(l)); }
ePageDef("procurement", "pj-reg", "PJ1", "pidg", KROLES, ["ทะเบียนโครงการ", "Project ID register"], () => {
  const P = (S.pplan || []).filter(pjVisible), n = k => P.filter(p => pjState(p) === k).length;
  return `${eHead(PJ_APP, "PJ1", ["ทะเบียนโครงการ", "Project ID register"], ["รหัสของรายการจัดซื้อหนึ่งรายการ ระบบออกให้เองเมื่อสร้างรายการจากรายการที่ได้รับจัดสรร (eBud) เลข e-GP ผูกภายหลังหลังส่ง e-GP · รูปแบบเลขเป็นตัวอย่าง ยังไม่ใช่ของ DPT จริง", "One code per procurement item, issued automatically when the item is created from an eBud allocation line; the e-GP number is linked after sending · the number format is a sample, not DPT's real one"])}
    ${eKpis([[L("รหัสโครงการทั้งหมด", "All Project IDs"), P.length], [L("ยังไม่ส่ง e-GP", "Not sent"), n("unsent")], [L("ส่งแล้ว รอเลข", "Sent, awaiting number"), n("sent"), "", n("sent") > 0], [L("ผูกเลข e-GP แล้ว", "Linked"), n("linked")], [L("แถวงบยอดไม่ตรง", "Budget total differs"), P.filter(p => pjBudgetFlag(p) === "diff").length, "", P.some(p => pjBudgetFlag(p) === "diff")]])}
    ${eNote(`${L("ผูกเลข e-GP ภายหลัง ทำได้ตามบทบาท", "Who can act")}: <b>${PJ_ACT.map(r => esc(tx(ROLES[r]))).join(", ")}</b> · ${L("บทบาทอื่น รวมกองแผน (plan) เห็นอย่างเดียว หน่วยงานเห็นเฉพาะรายการของหน่วยตน · เพิ่มรายการใหม่ที่ P1 แผนจัดซื้อ", "other roles, including planning (plan), view only; units see only their own items · new items are added on P1, the procurement plan")}`)}
    ${crudList("pj", { head: `<h2>${L("รหัสโครงการ", "Project IDs")}</h2>` })}`;
});
ePageDef("procurement", "pj-row", "PJ2", "pidg", KROLES, ["แถวงบประมาณ GFMIS", "GFMIS budget rows"], () => `${eHead(PJ_APP, "PJ2", ["แถวงบประมาณ GFMIS", "GFMIS budget rows"], ["แต่ละรหัสโครงการมีได้หลายแถว (ปีงบ รหัสงบประมาณ แหล่งของเงิน จำนวนเงิน) ตามรูปแบบที่คู่มือ e-GP ใช้ · ผลรวมควรเท่าวงเงินของรายการ ถ้าไม่เท่าระบบเตือนที่ PJ1 · รอบแรกยังไม่รองรับรายการเดียวที่คร่อมหลายโครงการงบ", "Each Project ID may have several rows (year, budget code, source, amount) as in the e-GP manuals · the total should equal the item amount, otherwise PJ1 warns · the first round does not yet cover one item that spans several budget projects"])}
  ${crudList("pjrow", { head: `<h2>${L("แถวงบประมาณ", "Budget rows")}</h2>` })}`);
ePageDef("procurement", "pj-imp", "PJ3", "pidg", KROLES, ["นำเข้าไฟล์", "File import"], () => {
  const K = PJ_IMPORT[PJ_IMP.kind], rows = PJ_IMP.rows, ok = rows ? rows.filter(x => !x.err) : [];
  return `${eHead(PJ_APP, "PJ3", ["นำเข้าไฟล์ e-GP และ GF", "e-GP and GF file import"], ["วางข้อความหรือเลือกไฟล์ CSV/Tab ที่มีหัวคอลัมน์ ตรวจก่อนนำเข้า แถวที่ผิดไม่ถูกนำเข้า · รูปแบบไฟล์เป็นข้อสมมุติของเรา ยังไม่เคยเห็นไฟล์จริงจาก e-GP/GF ต้องปรับเมื่อได้ไฟล์ · ถ้ามี API ภายหลังใช้ตัวตรวจและตัวนำเข้าชุดเดิม", "Paste text or choose a CSV or tab file with a header line; it is checked first and bad rows are skipped · the layouts are our assumption: real e-GP and GF files have not been seen yet · a later API can reuse the same check and import"])}
    <section class="panel"><header><h2>${L("นำเข้า", "Import")}</h2></header><div class="body">
      <div class="row"><label for="pji-kind">${L("ชนิดไฟล์", "File type")}</label><select id="pji-kind" ${pjActor() ? "" : "disabled"}>${Object.keys(PJ_IMPORT).map(k => `<option value="${k}" ${k === PJ_IMP.kind ? "selected" : ""}>${tx(PJ_IMPORT[k].name)}</option>`).join("")}</select>
        <input type="file" id="pji-file" accept=".csv,.tsv,.txt" ${pjActor() ? "" : "disabled"}><button class="btn" type="button" id="pji-sample" ${pjActor() ? "" : "disabled"}>${L("ใส่ข้อมูลตัวอย่าง", "Fill a sample")}</button></div>
      <p class="sub">${L("คอลัมน์", "Columns")}: <span class="mono">${K.layout}</span></p>
      <textarea id="pji-text" rows="6" style="width:100%;font-family:monospace" ${pjActor() ? "" : "disabled"}>${esc(PJ_IMP.text)}</textarea>
      <div class="row" style="margin-top:8px"><button class="btn" type="button" id="pji-check" ${pjActor() ? "" : "disabled"}>${L("ตรวจไฟล์", "Check")}</button>${rows ? `<button class="btn primary" type="button" id="pji-go" ${ok.length && pjActor() ? "" : "disabled"}>${L("นำเข้า", "Import")} ${ok.length} ${L("แถว", "rows")}</button><button class="btn ghost" type="button" id="pji-clear">${L("ล้าง", "Clear")}</button>` : ""}</div>
      ${!pjActor() ? `<p class="sub">${L("บทบาทนี้เห็นอย่างเดียว", "This role can view only")}</p>` : ""}
      ${PJ_IMP.headBad ? `<p>${tag(L("ไม่พบหัวคอลัมน์ครบ", "Header columns missing"), "p-bad")} <span class="mono">${K.cols.join(", ")}</span></p>` : ""}
      ${rows && rows.length ? `<div class="tbl-wrap"><table><thead><tr><th>#</th><th>${L("ข้อมูล", "Row")}</th><th>${L("ผลตรวจ", "Check")}</th></tr></thead><tbody>${rows.map((x, i) => `<tr><td>${i + 1}</td><td class="mono">${esc(K.show(x.r))}</td><td>${x.err ? tag(esc(x.err), "p-bad") : tag(L("พร้อมนำเข้า", "Ready"), "p-ok")}</td></tr>`).join("")}</tbody></table></div>` : ""}
    </div></section>
    <section class="panel"><header><h2>${L("ประวัติการนำเข้า", "Import log")}</h2></header>${(S.pjimps || []).length ? `<div class="tbl-wrap"><table><tbody>${S.pjimps.map(g => `<tr><td>${fdate(g.t, true)}</td><td>${esc(tx(PJ_IMPORT[g.kind].name))}</td><td>${esc(userName(g.by))}</td><td>${g.ok} ${L("นำเข้า", "imported")} · ${g.bad} ${L("ข้าม", "skipped")}</td></tr>`).join("")}</tbody></table></div>` : `<div class="body sub">${L("ยังไม่เคยนำเข้า", "Nothing imported yet")}</div>`}</section>`;
}, () => {
  const kind = $("#pji-kind"), text = $("#pji-text"), sync = () => { PJ_IMP.text = text.value; };
  kind.onchange = () => { PJ_IMP.kind = kind.value; PJ_IMP.rows = null; PJ_IMP.headBad = false; route(); };
  $("#pji-sample").onclick = () => { const k = PJ_IMPORT[PJ_IMP.kind]; PJ_IMP.text = [(k.head || k.cols).join(","), ...k.sample()].join("\n"); PJ_IMP.name = L("ข้อมูลตัวอย่าง", "sample"); pjPreview(); route(); };
  $("#pji-file").onchange = e => { const f = e.target.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => { PJ_IMP.text = String(rd.result); PJ_IMP.name = f.name; pjPreview(); route(); }; rd.readAsText(f, "utf-8"); };
  $("#pji-check").onclick = () => { sync(); pjPreview(); route(); };
  const clr = $("#pji-clear"); if (clr) clr.onclick = () => { PJ_IMP = { kind: PJ_IMP.kind, text: "", name: "", rows: null }; route(); };
  const go = $("#pji-go");
  if (go) go.onclick = () => {
    sync(); pjPreview(); const K = PJ_IMPORT[PJ_IMP.kind], ok = PJ_IMP.rows.filter(x => !x.err), bad = PJ_IMP.rows.length - ok.length;
    ok.forEach(x => K.apply(x.r, `${L("นำเข้าไฟล์", "file import")} ${PJ_IMP.name || ""}`.trim()));
    (S.pjimps = S.pjimps || []).unshift({ t: nowIso(), kind: PJ_IMP.kind, by: me().id, ok: ok.length, bad });
    PJ_IMP = { kind: PJ_IMP.kind, text: "", name: "", rows: null }; commit(); route(); toast(`${L("นำเข้า", "Imported")} ${ok.length} ${L("แถว", "rows")}`);
  };
});
{
  const base = famTasks;
  famTasks = R => {
    base(R);
    if (!S.pjrows || !pjActor()) return;
    (S.pplan || []).filter(p => pjState(p) === "sent").forEach(p => R(`${L("ผูกเลข e-GP", "Link the e-GP number")} ${p.pid}`, tx(p.name), TODAY, "pj-reg", "p-warn"));
    (S.pplan || []).filter(p => pjBudgetFlag(p) === "diff").forEach(p => R(`${L("ตรวจแถวงบที่ยอดไม่ตรงวงเงิน", "Check budget rows that differ from the amount")} ${p.pid}`, `${baht(pjSum(p.pid))} / ${baht(p.est)}`, TODAY, "pj-row", "p-info"));
  };
}
Object.assign(NAV_ICON, { "pj-reg": "tag", "pj-row": "list", "pj-imp": "download" });
