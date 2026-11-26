// Procurement (round 11, light version): a procurement plan tied to FY2570 allocation lines,
// requisitions, contracts with acceptance phases, and e-GP status by file import (files only, per D-F05).
// The official procurement steps stay in e-GP; prepares, checks and tracks.
let PRQ_OPEN = null;
let PLAN_Q = "", PLAN_FS = "", PLAN_PG = 1, PLAN_ADD = false, PLAN_LQ = "";
const PLAN_PS = 10;
let CT_OPEN = false;
let PROC_TAB = "cases", PLAN_SPLIT = false, PLAN_REQ = null, CT_FROM = null, EGP_ROWS = null;
const FAM_FY = CUR_FY, PHASE_SIGNS = 2;
const famLines = () => (S.allocs[FAM_FY] || { lines: [] }).lines;
const famLine = id => famLines().find(l => l.id === id) || { id, name: ["-", "-"], unit: "", amount: 0, type: "ope" };
const famPlan = id => S.pplan.find(p => p.id === id) || { id, name: ["-", "-"], line: "", est: 0 };
const famReq = id => S.reqn.find(r => r.id === id);
const famCon = id => S.contracts.find(c => c.id === id);
const famCommitted = lineId => sumv(S.contracts.filter(c => c.line === lineId).map(c => c.amount));
const famReserved = lineId => sumv(S.reqn.filter(r => r.status === "approved" && famPlan(r.plan).line === lineId).map(r => r.amount));
// Non-procurement commitments kept by Finance (round FN1): utilities, rent, service agreements, travel orders.
// Advances drawn from the budget count as spending of the line (clause 62): the amount lent until cleared, then what was spent (round FN3).
const famAdv = lineId => sumv((S.advances || []).filter(a => a.line === lineId && a.source === "budget" && ["approved", "paid", "clearing", "objected", "cleared"].includes(a.state)).map(a => (a.state === "cleared" ? Math.min(a.clearing.spent, a.approvedAmt || a.amount) : a.approvedAmt || a.amount)));
// Approved vouchers with no contract or commitment behind them (round FN2) spend the line directly.
const famVc = lineId => sumv((S.vouchers || []).filter(v => v.line === lineId && !v.contract && !v.commit && ["ready", "posted", "paid"].includes(v.state)).map(v => v.gross - (v.penalty || 0)));
const famOther = lineId => sumv((S.fcommit || []).filter(c => c.line === lineId).map(c => c.amount - (c.released || 0))) + famAdv(lineId) + famVc(lineId);
const famHeadroom = lineId => famLine(lineId).amount - famCommitted(lineId) - famReserved(lineId) - famOther(lineId);
const phaseAccepted = ph => ph.signs.length >= Math.min(PHASE_SIGNS, ph.need || PHASE_SIGNS); // ph.need = 1 when one inspector is appointed (specific method, up to the ceiling)
const phaseSigners = c => c.phases.flatMap(ph => ph.signs.map(s => s.by));
const famPeople = () => S.users.filter(u => u.active && u.role !== "admin" && u.role !== "proc" && u.role !== "prochead");
const PMETHOD = { specific: ["เฉพาะเจาะจง", "Specific selection"], ebid: ["ประกวดราคาอิเล็กทรอนิกส์", "E-bidding"] };
const PLAN_ST = { planned: [["อยู่ในแผน", "Planned"], "p-mute"], requisitioned: [["ขอซื้อแล้ว", "Requisitioned"], "p-info"], contracted: [["ทำสัญญาแล้ว", "Contracted"], "p-ok"] };
const REQ_ST = { pending: [["รออนุมัติ", "Pending"], "p-warn"], approved: [["อนุมัติแล้ว", "Approved"], "p-ok"], rejected: [["ไม่อนุมัติ", "Rejected"], "p-bad"], contracted: [["ทำสัญญาแล้ว", "Contracted"], "p-mute"] };
const stTag = (m, k) => tag(tx(m[k][0]), m[k][1]);
// Authority for spend approvals: the executive, or a delegate. Returns who holds the authority and which delegation is used.
function famAuth() {
  if (ROLE === "exec") return { holder: me().id, via: null };
  const d = delegFor("exec", "spend");
  return { holder: d ? d.from : me().id, via: d ? d.id : null };
}
const canSpend = () => acting("exec", "spend");
const nextId = (prefix, list) => `${prefix}-${FAM_FY}-${String(Math.max(0, ...list.map(x => Number(x.id.split("-")[2]) || 0)) + 1).padStart(3, "0")}`;
// A phase is waiting for Finance when it is accepted and has neither a live payment nor a live voucher (round FN2).
const famAcceptedUnpaid = () => S.contracts.flatMap(c => c.phases.filter(ph => phaseAccepted(ph) && !S.payreqs.some(p => p.contract === c.id && p.phase === ph.n && p.status !== "rejected")
  && !(S.vouchers || []).some(v => v.contract === c.id && (v.phases ? v.phases.includes(ph.n) : v.phase === ph.n) && v.state !== "cancelled")).map(ph => ({ c, ph })));

function famTasks(R) {
  if (!S.pplan) return;
  if (canSpend()) {
    S.reqn.filter(r => r.status === "pending").forEach(r => R(`${L("อนุมัติขอซื้อขอจ้าง", "Approve a requisition")} ${r.id}`, `${mb(r.amount)} ${L("ลบ.", "M")} · ${tx(famPlan(r.plan).name)}`, TODAY, "prc-reqn", "p-warn"));
    S.payreqs.filter(p => p.status === "pending").forEach(p => R(`${L("อนุมัติเบิกจ่าย", "Approve a payment")} ${p.id}`, `${mb(p.amount)} ${L("ลบ.", "M")} · ${p.contract}`, TODAY, "fnc-pay", "p-warn"));
  }
  if (ROLE === "div") S.reqn.filter(r => (r.asks || []).some(a => a.status === "open") && famLine(famPlan(r.plan).line).unit === me().unit).forEach(r => R(`${L("ตอบคำขอข้อมูลจากพัสดุ", "Answer a procurement request")} ${r.id}`, tx(famPlan(r.plan).name), TODAY, "prc-reqn", "p-warn"));
  if (ROLE === "div") S.pplan.filter(p => p.status === "planned" && famLine(p.line).unit === me().unit).forEach(p => R(`${L("ขอซื้อขอจ้างตามแผน", "Raise a requisition")} ${p.id}`, tx(p.name), p.month, "prc-plan", "p-info"));
  if (ROLE === "fin") {
    famAcceptedUnpaid().forEach(x => R(`${L("ขออนุมัติเบิกจ่าย", "Request a payment")} ${x.c.id} ${tx(x.ph.name)}`, `${mb(x.ph.amount)} ${L("ลบ.", "M")}`, TODAY, "fnc-pay", "p-info"));
    S.payreqs.filter(p => p.recon && p.recon.state === "diff").forEach(p => R(`${L("ชี้แจงผลต่างจากไฟล์ GFMIS", "Explain a GFMIS file difference")} ${p.id}`, "", TODAY, "fnc-recon:payfile", "p-warn"));
  }
  S.contracts.filter(c => c.inspectors.includes(me().id)).forEach(c => c.phases.filter(ph => !phaseAccepted(ph) && ph.due <= addDays(TODAY, 30) && !ph.signs.some(s => s.by === me().id))
    .forEach(ph => R(`${L("ลงนามตรวจรับงาน", "Sign the acceptance")} ${c.id} ${tx(ph.name)}`, `${mb(ph.amount)} ${L("ลบ.", "M")}`, ph.due, "prc-contracts", "p-info")));
}

const PROC = {};
// 13 Nov 2569: the Planning division (role plan) adds plan items, proposes and approves the plan versions and records the e-GP notice. Procurement officers only read the plan, and only the items that have been requisitioned (from the requisition on).
const isPlanRole = () => ROLE === "plan";
const planVisible = () => (isProcRole() ? S.pplan.filter(p => p.status !== "planned" || S.reqn.some(r => r.plan === p.id)) : S.pplan).filter(p => p.status !== "planned" || typeof planActPassed !== "function" || planActPassed(p)); // 16 Nov 2569: only the items that passed the act (98zzzj)
PROC.plan = () => {
  const P = planVisible(), isProc = isPlanRole(), tot = sumv(P.map(p => p.est));
  const lines = famLines().filter(l => l.type === "inv" || l.type === "ope");
  const q = PLAN_Q.trim().toLowerCase();
  const PV = P.filter(p => (!PLAN_FS || p.status === PLAN_FS) && (!q || [p.id, p.pid, tx(p.name), lineLabel(famLine(p.line)), p.egp ? p.egp.no : "", p.note || ""].join(" ").toLowerCase().includes(q)));
  const pages = Math.max(1, Math.ceil(PV.length / PLAN_PS)); if (PLAN_PG > pages) PLAN_PG = pages; if (PLAN_PG < 1) PLAN_PG = 1;
  const PS = PV.slice((PLAN_PG - 1) * PLAN_PS, PLAN_PG * PLAN_PS);
  return `
  <section class="kpis" style="grid-template-columns:repeat(4,minmax(0,1fr))">
    <div class="kpi"><span class="l">${L("รายการในแผนจัดซื้อ", "Plan items")}</span><span class="v">${P.length}</span></div>
    <div class="kpi"><span class="l">${L("ประมาณการรวม", "Estimated total")}</span><span class="v">${mb(tot)}<small>${L("ลบ.", "M")}</small></span></div>
    <div class="kpi"><span class="l">${L("ขอซื้อแล้ว", "Requisitioned")}</span><span class="v">${P.filter(p => p.status === "requisitioned").length}</span></div>
    <div class="kpi"><span class="l">${L("ทำสัญญาแล้ว", "Contracted")}</span><span class="v">${P.filter(p => p.status === "contracted").length}</span></div>
  </section>
  <section class="panel"><header><h2>${L("แผนจัดซื้อจัดจ้าง", "Procurement plan")} · ${fyLabel(FAM_FY)}</h2><span class="sp"></span><span class="sub">${L("ทุกรายการผูกกับรายการจัดสรรของ M06 · วิธีจัดซื้อตามวงเงินเป็นค่าตัวอย่าง", "Every item links to an M06 allocation line · the method by amount is a sample rule")}</span>${isProc ? `<button class="btn primary" type="button" id="pp-toggle">${PLAN_ADD ? L("ปิดฟอร์ม", "Close form") : "+ " + L("เพิ่มรายการในแผน", "Add plan item")}</button>` : ""}</header>
    ${isProc && PLAN_ADD ? planAddForm(lines) : ""}
    ${isProcRole() ? `<div class="body"><div class="callout" style="margin:0">${L("กองแผนงานเป็นผู้เพิ่มรายการ เสนอ และอนุมัติแผน เจ้าหน้าที่พัสดุดูรายละเอียดของรายการที่ขอซื้อขอจ้างแล้วเป็นต้นไป", "The Planning division adds, proposes and approves the plan. Procurement officers see the details of items from the requisition on.")}</div></div>` : ""}
    <div class="body"><div class="row" style="align-items:flex-end">
      <div class="f" style="flex:2 1 260px"><label for="pl-q">${L("ค้นหา", "Search")}</label><input type="search" id="pl-q" value="${esc(PLAN_Q)}" placeholder="${esc(L("เลขที่ ชื่อรายการ หน่วยงาน Project ID เลข e-GP", "No., name, unit, Project ID, e-GP no."))}"></div>
      <div class="f" style="flex:0 1 180px"><label for="pl-fs">${L("สถานะ", "Status")}</label><select id="pl-fs"><option value="">${L("ทุกสถานะ", "All")}</option>${Object.keys(PLAN_ST).map(k => `<option value="${k}" ${PLAN_FS === k ? "selected" : ""}>${tx(PLAN_ST[k][0])}</option>`).join("")}</select></div>
      <span class="sub">${L("แสดง", "Showing")} ${PS.length} ${L("จาก", "of")} ${PV.length}${PV.length !== P.length ? " (" + P.length + ")" : ""} ${L("รายการ", "items")}</span></div></div>
    <div class="tbl-wrap"><table><thead><tr><th>${L("เลขที่", "No.")}</th><th style="min-width:240px">${L("รายการ", "Item")}</th><th style="min-width:110px">${L("วิธี", "Method")}</th><th class="n">${L("ประมาณการ (ลบ.)", "Estimate (M)")}</th><th>${L("กำหนด", "Planned")}</th><th>${L("สถานะ", "Status")}</th><th style="min-width:110px">e-GP</th><th></th></tr></thead>
      <tbody>${PS.map(p => { const l = famLine(p.line), mine = ROLE === "div" && l.unit === me().unit;
        return `<tr><td class="mono">${p.id}</td><td><b style="font-weight:600">${esc(tx(p.name))}</b><div class="sub">${esc(lineLabel(l))} · <span class="mono">${l.id}</span> · ${catName(p.cat)}${planTag(p)}${p.qty ? ` · ${fmt(p.qty)} ${esc(p.unitName || "")}` : ""}${p.months ? ` · ${p.months} ${L("เดือน", "mo.")}` : ""}</div>${p.note ? `<div class="sub">${esc(p.note)}</div>` : ""}</td><td class="sub">${tx(PMETHOD[p.method])}</td>
          <td class="n">${mb(p.est)}</td><td class="sub">${fdate(p.month)}</td><td>${planStat(p)}</td>
          <td class="sub">${p.egp ? `<span class="mono">${p.egp.no}</span><div>${tx(p.egp.stage)} · ${fdate(p.egp.date)}</div>` : "—"}</td>
          <td><div class="row" style="flex-wrap:nowrap">${mine && p.status === "planned" ? `<button class="btn primary" type="button" data-preq="${p.id}">${L("ขอซื้อขอจ้าง", "Raise requisition")}</button>` : ""}${historyBtn(p.id, p.id)}</div></td></tr>
          `; }).join("")}</tbody></table></div>
    ${PV.length ? "" : `<div class="body sub">${L("ไม่พบรายการที่ตรงกับเงื่อนไข", "No items match")}</div>`}
    ${pages > 1 ? `<div class="body"><div class="row"><button class="btn" type="button" data-plpg="${PLAN_PG - 1}" ${PLAN_PG <= 1 ? "disabled" : ""}>‹ ${L("ก่อนหน้า", "Prev")}</button><span class="sub">${L("หน้า", "Page")} ${PLAN_PG} / ${pages}</span><button class="btn" type="button" data-plpg="${PLAN_PG + 1}" ${PLAN_PG >= pages ? "disabled" : ""}>${L("ถัดไป", "Next")} ›</button></div></div>` : ""}</section>`;
};
function reqDetailHtml(r, p) {
  const d = r.detail; if (!d) return `<div class="sub">${L("ใบขอซื้อนี้ไม่มีรายละเอียดโครงการ", "This requisition has no project details")}</div>`;
  const row = (th, en, v) => `<div style="flex:1 1 100%"><div class="sub">${L(th, en)}</div><div style="white-space:pre-wrap">${esc(v || "—")}</div></div>`;
  const half = (th, en, v) => `<div style="flex:1 1 200px"><div class="sub">${L(th, en)}</div><div>${esc(v || "—")}</div></div>`;
  const l = famLine(p.line);
  return `<div class="row" style="align-items:flex-start;gap:12px 20px;padding:4px 0">
    <div style="flex:1 1 100%"><b style="font-weight:600">${L("รายละเอียดโครงการจากหน่วยงานเจ้าของเรื่อง", "Project details from the owning unit")}</b> <span class="sub">${esc(lineLabel(l))} · ${esc(userName(r.by))} · ${fdate(r.t, true)}</span></div>
    ${row("วัตถุประสงค์ / ความเป็นมา", "Objective / background", d.obj)}${row("ขอบเขตงาน / คุณลักษณะเฉพาะ", "Scope / specification", d.scope)}
    ${half("จำนวน", "Quantity", fmt(d.qty) + " " + (d.unit || ""))}${half("ระยะเวลาส่งมอบ", "Delivery period", d.days + " " + L("วัน", "days"))}${half("สถานที่ส่งมอบ / ดำเนินการ", "Delivery site", d.place)}
    ${row("ผลงานที่ต้องส่งมอบ", "Deliverables", d.deliv)}${half("ที่มาของวงเงิน", "Basis of the estimate", d.basis)}${half("ประโยชน์ที่คาดว่าจะได้รับ", "Expected benefit", d.ben)}
    ${half("ผู้ประสานงาน", "Contact", d.contact)}${half("เลขที่เอกสารอ้างอิง", "Reference no.", d.refs)}
    <div style="flex:1 1 100%"><div class="sub">${L("เอกสารแนบ", "Attachments")}</div>${(d.files || []).length ? d.files.map(x => `<div class="rq-file"><span class="rq-fn">📎 ${esc(x.name)} <span class="sub">${fsize(x.size)}</span></span><span class="sub">${tx(x.kind)}</span></div>`).join("") : "—"}</div></div>${reqAsksHtml(r, p)}`;
}
// Procurement officers can ask the owning unit for more documents or data; the unit answers on the same requisition.
const ASK_KINDS = [["เอกสารเพิ่มเติม", "More documents"], ["ข้อมูล/ชี้แจงเพิ่มเติม", "More information"], ["แก้ไขขอบเขต/คุณลักษณะ", "Revise scope or specs"], ["ยืนยันราคา/ใบเสนอราคา", "Confirm price or quotation"]];
const askOwner = p => ROLE === "div" && famLine(p.line).unit === me().unit;
function reqAsksHtml(r, p) {
  const A = r.asks || [], pr = isProcRole(), mine = askOwner(p);
  return `<div style="border-top:1px solid var(--line);margin-top:10px;padding-top:10px"><b style="font-weight:600">${L("ขอเอกสาร/ข้อมูลเพิ่มเติมจากหน่วยงานเจ้าของเรื่อง", "Requests to the owning unit")}</b> <span class="sub">${A.filter(a => a.status === "open").length} ${L("รายการรอตอบ", "waiting")}</span>
    ${A.length ? A.map(a => `<div style="margin-top:8px;padding:8px 10px;border:1px solid var(--line);border-radius:8px">
      <div class="row" style="gap:8px">${tag(tx(a.kind), "p-mute")} ${a.status === "open" ? tag(L("รอหน่วยงานตอบ", "Waiting for the unit"), "p-warn") : tag(L("ตอบแล้ว", "Answered"), "p-ok")} ${a.due ? `<span class="sub">${L("ภายใน", "by")} ${fdate(a.due)}</span>` : ""}<span class="sub">${esc(userName(a.by))} · ${fdate(a.t, true)}</span></div>
      <div style="white-space:pre-wrap;margin-top:4px">${esc(a.text)}</div>
      ${a.status === "answered" ? `<div style="margin-top:6px;padding-left:10px;border-left:3px solid var(--line)"><div class="sub">${L("คำตอบจาก", "Answer from")} ${esc(userName(a.ansBy))} · ${fdate(a.ansT, true)}</div><div style="white-space:pre-wrap">${esc(a.answer)}</div>${a.ref ? `<div class="sub">${L("เอกสารแนบ", "Attachments")}: ${esc(a.ref)}</div>` : ""}</div>`
        : mine ? `<div class="row" style="align-items:flex-end;margin-top:6px"><div class="f" style="flex:2 1 260px"><label for="as-a-${a.id}">${L("คำตอบ / ข้อมูลที่ส่งให้", "Your answer")}</label><input type="text" id="as-a-${a.id}"></div><div class="f" style="flex:1 1 200px"><label for="as-r-${a.id}">${L("เอกสารแนบ (ชื่อ/เลขที่)", "Attachments")}</label><input type="text" id="as-r-${a.id}"></div><button class="btn primary" type="button" data-askans="${r.id}|${a.id}">${L("ส่งคำตอบ", "Send answer")}</button></div>` : ""}</div>`).join("") : `<div class="sub" style="margin-top:4px">${L("ยังไม่มีการร้องขอ", "No requests yet")}</div>`}
    ${pr ? `<div class="row" style="align-items:flex-end;margin-top:10px"><div class="f" style="flex:1 1 190px"><label for="as-k-${r.id}">${L("ประเภทที่ขอ", "Type")}</label><select id="as-k-${r.id}">${ASK_KINDS.map((k, i) => `<option value="${i}">${tx(k)}</option>`).join("")}</select></div>
      <div class="f" style="flex:3 1 300px"><label for="as-t-${r.id}">${L("สิ่งที่ต้องการให้หน่วยงานส่ง *", "What you need *")}</label><input type="text" id="as-t-${r.id}" placeholder="${esc(L("เช่น รายละเอียดคุณลักษณะเฉพาะ แบบรูป ใบเสนอราคา 3 ราย", "e.g. detailed specs, drawings, three quotations"))}"></div>
      <div class="f" style="flex:0 1 160px"><label for="as-d-${r.id}">${L("กำหนดส่ง", "Due")}</label><input type="date" id="as-d-${r.id}" value="${addDays(TODAY, 7)}"></div>
      <button class="btn primary" type="button" data-askadd="${r.id}">${L("ส่งคำขอ", "Send request")}</button></div>` : ""}</div>`;
}
document.addEventListener("click", e => {
  const add = e.target.closest && e.target.closest("[data-askadd]"), ans = e.target.closest && e.target.closest("[data-askans]");
  if (!add && !ans) return;
  const rid = (add ? add.dataset.askadd : ans.dataset.askans.split("|")[0]), r = famReq(rid); if (!r) return;
  const p = famPlan(r.plan); r.asks = r.asks || [];
  if (add) {
    if (!isProcRole()) return;
    const text = ($("#as-t-" + rid).value || "").trim(); if (text.length < 5) { toast(L("ระบุสิ่งที่ต้องการให้หน่วยงานส่ง", "Say what you need")); return; }
    const a = { id: "A" + (r.asks.length + 1), by: me().id, t: nowIso(), kind: ASK_KINDS[Number($("#as-k-" + rid).value) || 0], text, due: $("#as-d-" + rid).value || null, status: "open" };
    r.asks.push(a); audit(["ขอเอกสาร/ข้อมูลเพิ่มจากหน่วยงานเจ้าของเรื่อง", "Asked the owning unit for more documents or data"], `${r.id} ${p.id} ${text.slice(0, 40)}`);
    notify(["div"], [`เจ้าหน้าที่พัสดุขอเอกสาร/ข้อมูลเพิ่ม ใบขอซื้อ ${r.id}: ${text.slice(0, 60)}`, `Procurement asks for more on requisition ${r.id}`], "prc-reqn");
    commit(); renderShell(); route(); toast(L("ส่งคำขอถึงหน่วยงานแล้ว", "Request sent to the unit"));
  } else {
    if (!askOwner(p)) { toast(L("เฉพาะหน่วยงานเจ้าของเรื่องตอบได้", "Only the owning unit can answer")); return; }
    const aid = ans.dataset.askans.split("|")[1], a = r.asks.find(x => x.id === aid); if (!a) return;
    const answer = ($("#as-a-" + aid).value || "").trim(); if (answer.length < 3) { toast(L("ใส่คำตอบก่อน", "Enter an answer")); return; }
    a.answer = answer; a.ref = ($("#as-r-" + aid).value || "").trim(); a.ansBy = me().id; a.ansT = nowIso(); a.status = "answered";
    audit(["หน่วยงานตอบคำขอข้อมูลของพัสดุ", "The unit answered a procurement request"], `${r.id} ${a.id}`);
    notify(["proc", "prochead"], [`หน่วยงานตอบคำขอข้อมูล ใบขอซื้อ ${r.id}`, `The unit answered the request on ${r.id}`], "prc-reqn");
    commit(); renderShell(); route(); toast(L("ส่งคำตอบแล้ว", "Answer sent"));
  }
});
const RQ_DOCS = [["ขอบเขตงาน/TOR ร่าง", "Draft TOR"], ["ใบเสนอราคา", "Quotation"], ["แบบรูปรายการ/แปลน", "Drawings"], ["คุณลักษณะเฉพาะ", "Specification"], ["หนังสือ/บันทึกข้อความ", "Memo"], ["อื่น ๆ", "Other"]];
let RQ_FILES = [];
const fsize = n => (n >= 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB");
function rqFilesHtml() {
  return RQ_FILES.length ? RQ_FILES.map((x, i) => `<div class="rq-file"><span class="rq-fn">${esc(x.name)} <span class="sub">${fsize(x.size)}</span></span>
    <select data-rqfk="${i}" aria-label="${esc(L("ประเภทเอกสาร", "Document type"))}">${RQ_DOCS.map((k, j) => `<option value="${j}" ${x.kind === j ? "selected" : ""}>${tx(k)}</option>`).join("")}</select>
    <button class="btn ghost" type="button" data-rqfd="${i}" aria-label="${esc(L("ลบไฟล์", "Remove"))}">✕</button></div>`).join("") : `<div class="sub">${L("ยังไม่ได้แนบเอกสาร", "No files attached")}</div>`;
}

const PUNIT = ["ชุด", "ระบบ", "งาน", "เครื่อง", "คัน", "ห้อง", "หลัง", "โครงการ", "ครั้ง", "อัตรา"];
function planAddForm(lines) {
  const lq = PLAN_LQ.trim().toLowerCase(), ls = lines.filter(l => !lq || (lineLabel(l) + " " + l.id).toLowerCase().includes(lq));
  return `<div class="body" style="border-bottom:1px solid var(--line)"><form id="pp-form" style="display:flex;flex-direction:column;gap:12px">
    <div class="row" style="align-items:flex-end">
      <div class="f" style="flex:1 1 200px"><label for="pp-lq">${L("ค้นหารายการจัดสรร", "Find allocation line")}</label><input type="search" id="pp-lq" value="${esc(PLAN_LQ)}" placeholder="${esc(L("ชื่อหน่วยงาน/รายการ", "Unit or line"))}"></div>
      <div class="f" style="flex:3 1 340px"><label for="pp-line">${L("รายการจัดสรร (M06)", "Allocation line (M06)")} <span class="sub" id="pp-lcnt">${ls.length}/${lines.length}</span></label><select id="pp-line">${ls.map(l => `<option value="${l.id}">${esc(lineLabel(l))} · ${mb(l.amount)}</option>`).join("")}</select></div>
      <div class="sub" id="pp-room" style="flex:1 1 200px"></div></div>
    <div class="row" style="align-items:flex-end">
      <div class="f" style="flex:3 1 260px"><label for="pp-name">${L("รายการจัดซื้อจัดจ้าง", "Item to buy")} *</label><input type="text" id="pp-name" required></div>
      <div class="f" style="flex:1 1 180px"><label for="pp-cat">${L("หมวดพัสดุ", "Category")}</label><select id="pp-cat">${(S.pcat || []).map(c => `<option value="${c.id}">${esc(tx(c.name))}</option>`).join("")}</select></div>
      <div class="f" style="flex:0 1 110px"><label for="pp-qty">${L("จำนวน", "Qty")}</label><input type="number" id="pp-qty" min="1" step="1" value="1"></div>
      <div class="f" style="flex:0 1 120px"><label for="pp-unit">${L("หน่วยนับ", "Unit")}</label><input type="text" id="pp-unit" list="pp-ul" value="ชุด"><datalist id="pp-ul">${PUNIT.map(u => `<option value="${u}">`).join("")}</datalist></div></div>
    <div class="row" style="align-items:flex-end">
      <div class="f" style="flex:0 1 140px"><label for="pp-est">${L("ประมาณการ (ลบ.)", "Estimate (M)")} *</label><input type="number" id="pp-est" min="0.001" step="0.001" required></div>
      <div class="f" style="flex:1 1 190px"><label for="pp-method">${L("วิธีจัดซื้อ", "Method")}</label><select id="pp-method"><option value="">${L("ตามวงเงิน (อัตโนมัติ)", "By amount (auto)")}</option>${Object.keys(PMETHOD).map(k => `<option value="${k}">${tx(PMETHOD[k])}</option>`).join("")}</select></div>
      <div class="f" style="flex:0 1 160px"><label for="pp-month">${L("กำหนดดำเนินการ", "Planned date")}</label><input type="date" id="pp-month" value="${addDays(TODAY, 60)}" required></div>
      <div class="f" style="flex:0 1 130px"><label for="pp-dur">${L("ระยะเวลา (เดือน)", "Duration (mo.)")}</label><input type="number" id="pp-dur" min="1" step="1" value="3"></div>
      <div class="f" style="flex:2 1 220px"><label for="pp-note">${L("หมายเหตุ / เหตุผลความจำเป็น", "Note / justification")}</label><input type="text" id="pp-note"></div></div>
    <div class="row"><button class="btn primary" type="submit">+ ${L("เพิ่มในแผน", "Add to plan")}</button><span class="sub">${L("เพิ่มต่อเนื่องได้ ฟอร์มจะเปิดค้างไว้", "The form stays open so you can add several items in a row")}</span></div></form></div>`;
}
PROC.reqn = () => {
  const R = S.reqn, auth = canSpend() || ROLE === "divhead", viaTxt = canSpend() ? onBehalf("exec", "spend") : "";
  return `
  ${auth && viaTxt ? `<div class="alert"><div class="ic" style="background:var(--info-soft);color:var(--info)">i</div><div><b>${L("คุณกำลังอนุมัติแทนผู้บริหาร", "You are approving on the executive's behalf")}</b><p>${viaTxt.replace(/^ · /, "")} · ${L("ระบบตรวจกฎแยกหน้าที่กับตัวคุณและกับผู้มอบอำนาจ", "Duty-separation rules are checked against you and against the person who delegated")}</p></div></div>` : ""}
  <section class="panel"><header><h2>${L("ใบขอซื้อขอจ้าง", "Requisitions")}</h2><span class="sp"></span><span class="sub">${L("อนุมัติได้เมื่อไม่เกินวงเงินคงเหลือของรายการจัดสรร และผู้ขอไม่ใช่ผู้อนุมัติ (SD-01)", "Approved only within the room left on the line, and never by the requester (SD-01)")}</span></header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("เลขที่", "No.")}</th><th style="min-width:220px">${L("รายการในแผน", "Plan item")}</th><th style="min-width:130px">${L("ผู้ขอ", "Requester")}</th><th class="n">${L("วงเงิน (ลบ.)", "Amount (M)")}</th><th class="n">${L("คงเหลือบนรายการ (ลบ.)", "Room on line (M)")}</th><th>${L("สถานะ", "Status")}</th><th></th></tr></thead>
      <tbody>${R.slice().reverse().map(r => { const p = famPlan(r.plan);
        return `<tr><td class="mono">${r.id}</td><td><b style="font-weight:600">${esc(tx(p.name))}</b><div class="sub"><span class="mono">${p.id}</span> · ${esc(tx(r.why))}</div>${r.detail ? `<button class="btn ghost" type="button" data-rqview="${r.id}" style="height:26px;padding:0 8px;margin-top:4px">${PRQ_OPEN === r.id ? L("ซ่อนรายละเอียด", "Hide details") : L("ดูรายละเอียดโครงการ", "View project details")}</button>${(r.asks || []).some(a => a.status === "open") ? " " + tag(L("มีคำขอรอตอบ", "Request open"), "p-warn") : ""}` : `<div class="sub">${L("ไม่มีรายละเอียดโครงการ", "No project details")}</div>`}</td><td>${esc(userName(r.by))}<div class="sub">${fdate(r.t, true)}</div></td>
          <td class="n">${mb(r.amount)}</td><td class="n">${mb(famHeadroom(p.line))}</td>
          <td>${stTag(REQ_ST, r.status)}${r.decided ? `<div class="sub">${esc(userName(r.decided.by))}${r.decided.via ? ` · ${L("แทน", "for")} ${esc(userName(r.decided.holder))} (${r.decided.via})` : ""}</div>` : ""}</td>
          <td><div class="row" style="flex-wrap:nowrap">
            ${rqCanDecide(r) ? `<button class="btn primary" type="button" data-rqok="${r.id}">${viaTxt ? L("อนุมัติแทน", "Approve on behalf") : L("อนุมัติ", "Approve")}</button><button class="btn danger" type="button" data-rqno="${r.id}">${L("ไม่อนุมัติ", "Reject")}</button>` : ""}
            ${r.status === "approved" && isProcRole() ? `<button class="btn" type="button" data-rqcase="${caseByPlan(r.plan) ? caseByPlan(r.plan).id : ""}">${L("เปิดการจัดซื้อ", "Open the case")}</button>` : ""}${historyBtn(r.id, r.id)}</div></td></tr>${PRQ_OPEN === r.id && r.detail ? `<tr class="cmt-row"><td colspan="7">${reqDetailHtml(r, p)}</td></tr>` : ""}`; }).join("")
        || `<tr><td colspan="7" class="sub">${L("ยังไม่มีใบขอซื้อขอจ้าง", "No requisitions yet")}</td></tr>`}</tbody></table></div></section>`;
};
function phaseSignText(c, ph) {
  return `${ph.signs.map(s => (s.proxy ? `${esc(s.name)} <span class="sub">(${L("บันทึกแทน", "recorded for")}${s.sub ? ` · ${L("ผู้แทน", "substitute")} ${esc(s.sub.name)}` : ""})</span>` : esc(userName(s.by)))).join(", ") || "—"} <span class="sub">(${ph.signs.length}/${Math.min(PHASE_SIGNS, ph.need || PHASE_SIGNS)})</span>`;
}
PROC.conCreate = () => {
  const isProc = isProcRole(), open = S.cases.filter(c => caseState(c) === 8), me_ = me().id, people = famPeople().filter(u => u.id !== me_);
  const sel = open.find(c => c.id === CT_FROM) || open[0], judges = sel ? caseJudges(sel) : [];
  const defs = [S.users.find(u => u.role === "plan" && u.primary), S.users.find(u => u.role === "div" && u.primary)].filter(Boolean).map(u => u.id).filter(id => !judges.includes(id));
  return `
  ${isProc && open.length ? `<section class="panel"><header><h2>${L("สร้างสัญญา", "Create a contract")}</h2><span class="sp"></span><span class="sub">${L("วงเงินสัญญาเป็นภาระผูกพันของรายการจัดสรรทันที · สร้างได้เมื่อรายการจัดซื้ออยู่ขั้นทำสัญญา วงเงินไม่เกินราคาที่ประกาศ · กรรมการตรวจรับอย่างน้อย 2 คน (1 คนได้ถ้าไม่เกิน " + fmt(S.pcfg.singleInspectorMax) + " บาท) ห้ามซ้ำผู้พิจารณาผล (SD-06) และห้ามเป็นผู้จัดซื้อ (SD-02)", "The contract amount commits the allocation line at once · only for a case at the contracting step, within the announced price · at least 2 committee members (1 if up to " + fmt(S.pcfg.singleInspectorMax) + " baht), none from the evaluation committee (SD-06) and not the procurement officer (SD-02)")}</span></header>
    <div class="body"><div class="row"><button class="btn primary" type="button" id="ct-open">+ ${L("สร้างสัญญา", "Create a contract")}</button><span class="sub">${open.length} ${L("รายการจัดซื้อพร้อมทำสัญญา · ถ้ายังไม่ทำ กดยกเลิกหรือปิดหน้าต่างได้ รายการจัดซื้อยังอยู่ขั้นทำสัญญาตามเดิม", "cases ready · cancel any time; the case stays at the contracting step")}</span></div>
    <dialog id="ct-dlg" class="rq-dlg"><form id="ct-form" style="display:flex;flex-direction:column;gap:12px;padding:18px 20px;overflow-y:auto">
      <div class="row" style="justify-content:space-between"><h2 style="margin:0;font-size:18px">${L("สร้างสัญญา", "Create a contract")}</h2><button class="btn ghost" type="button" id="ct-x" aria-label="${esc(L("ปิด", "Close"))}">✕</button></div>
      <div class="inline-form">
        <div class="f" style="flex:2 1 260px"><label for="ct-req">${L("รายการจัดซื้อที่พร้อมทำสัญญา", "Case ready for a contract")}</label><select id="ct-req">${open.map(c => `<option value="${c.id}" ${sel && c.id === sel.id ? "selected" : ""}>${c.id} · ${esc(caseName(c))} · ${mb(c.award.price)}</option>`).join("")}</select></div>
        <div class="f" style="flex:1 1 200px"><label for="ct-vendor">${L("คู่สัญญา", "Supplier")}</label><input type="text" id="ct-vendor" list="vlist" value="${sel ? esc(tx(sel.award.winner)) : ""}" required></div>
        <div class="f" style="flex:0 1 150px"><label for="ct-no">${L("เลขที่สัญญา", "Contract no.")}</label><input type="text" id="ct-no" value="CT-70/${String(S.contracts.length + 1).padStart(3, "0")}" required></div>
        <div class="f" style="flex:0 1 160px"><label for="ct-date">${L("วันที่ลงนาม", "Signed on")}</label><input type="date" id="ct-date" value="${TODAY}" required></div>
        <div class="f" style="flex:0 1 160px"><label for="ct-amt">${L("วงเงินตามสัญญา (บาท)", "Amount (baht)")}</label><input type="number" id="ct-amt" min="1" step="0.01" value="${sel ? sel.award.price : ""}" required></div>
        <div class="f" style="flex:0 1 150px"><label for="ct-proj">${L("เลขที่โครงการ", "Project no.")}</label><input type="text" id="ct-proj" value="${sel && sel.egp7Proj ? esc(sel.egp7Proj) : ""}"></div>
        <div class="f" style="flex:0 1 150px"><label for="ct-ctl">${L("เลขคุมสัญญา", "Control no.")}</label><input type="text" id="ct-ctl"></div>
        <div class="f" style="flex:0 1 150px"><label for="ct-days">${L("จำนวนวันแล้วเสร็จ", "Days to finish")}</label><input type="number" id="ct-days" min="1" step="1" value="${sel && famReq(sel.reqn) && famReq(sel.reqn).detail && famReq(sel.reqn).detail.days > 0 ? famReq(sel.reqn).detail.days : 120}" required></div>
        <div class="f" style="flex:0 1 160px"><label for="ct-start">${L("วันที่เริ่มต้นสัญญา", "Start date")}</label><input type="date" id="ct-start" value="${TODAY}" required></div>
        <div class="f" style="flex:0 1 150px"><label for="ct-fine">${L("ค่าปรับ (บาท/วัน)", "Penalty (baht/day)")}</label><input type="number" id="ct-fine" min="0" step="0.01" value="${sel ? Math.max(100, Math.round(sel.award.price * 0.001)) : ""}"></div>
        <div class="f" style="flex:0 1 150px"><label for="ct-ph">${L("จำนวนงวดงานตามสัญญา", "Work phases")}</label><input type="number" id="ct-ph" min="1" max="120" step="1" value="1" required></div>
        <datalist id="vlist">${(S.vendors || []).map(v => `<option value="${esc(v.name)}">`).join("")}</datalist>
        <div class="f" style="flex:1 1 100%"><label>${L("หลักประกันสัญญา", "Contract guarantee")}</label><div class="row" style="gap:14px">${Object.entries(KX_GUAR).map(([kk, tt], i) => `<label style="font-weight:400"><input type="radio" name="ct-gk" value="${kk}" ${i ? "" : "checked"}> ${tt}</label>`).join("")}<span class="sub">${L("รายละเอียดและไฟล์หลักประกันกรอกต่อในแท็บสัญญาและสัญญาแก้ไข", "Fill the details and files in the contract tab")}</span></div></div>
        <div class="f" style="flex:1 1 100%"><label>${L("เงินเบิกล่วงหน้า", "Advance payment")}</label><div class="row" style="gap:10px;align-items:center"><input type="number" id="ct-adv" min="0" max="100" step="0.01" value="0" style="width:90px"> % <span class="sub">${L("0 = ไม่มี · ประกันความชำรุดบกพร่อง 2 ปีนับจากวันตรวจรับงวดสุดท้าย", "0 = none · 2-year defect guarantee from the last acceptance")}</span></div></div></div>
      <fieldset style="border:1px solid var(--line);border-radius:8px;padding:8px 12px"><legend class="sub">${L("คณะกรรมการตรวจรับ", "Acceptance committee")}</legend>
        <div class="row">${cmSelect("ct-cm", sel ? { amount: sel.award.price, kind: sel.kind, cs: sel, unit: famLine(famPlan(sel.plan).line).unit } : {}, "")}<span class="sub">${L("เลือกจากทะเบียนคณะกรรมการ (CM1) · คณะที่ไม่ครบเงื่อนไขตามประเภท เลือกไม่ได้", "Pick from the committee register (CM1); a committee that fails its type's conditions can't be picked")}</span></div></fieldset>
      <div class="row"><button class="btn primary" type="submit">${L("สร้างสัญญา", "Create contract")}</button><button class="btn ghost" type="button" id="ct-cancel">${L("ยกเลิก (ยังไม่ทำสัญญา)", "Cancel (not now)")}</button></div></form></dialog></div></section>`
    : isProc ? `<div class="alert"><div class="ic" style="background:var(--info-soft);color:var(--info)">i</div><div><b>${L("ยังไม่มีรายการจัดซื้อที่พร้อมทำสัญญา", "No case is ready for a contract")}</b><p>${L("รายการจัดซื้อที่ประกาศผู้ชนะและพ้นกำหนดอุทธรณ์แล้วจะปรากฏที่นี่", "Cases with a winner and a finished appeal period will appear here")}</p></div></div>` : ""}`;
};
// Every contract in full (round 44 shows one at a time; see PROC.conList and PROC.conDetail in 74).
PROC.conAll = () => S.contracts.slice().reverse().map(conPanel).join("") || `<section class="panel"><div class="body sub">${L("ยังไม่มีสัญญา", "No contracts yet")}</div></section>`;
PROC.contracts = () => PROC.conCreate() + PROC.conAll();
PROC.egp = () => {
  const log = S.egpImports || [];
  return `
  <div class="alert"><div class="ic" style="background:var(--info-soft);color:var(--info)">i</div><div><b>${L("รับสถานะจาก e-GP เป็นไฟล์", "e-GP status comes in as a file")}</b>
    <p>${L("ระหว่างรอยืนยันช่องทางเชื่อมต่อ (ประเด็น D-F05) ใช้ไฟล์ที่ส่งออกจาก e-GP ระบบตรวจรายการกับแผนจัดซื้อก่อนนำเข้า รายการที่ไม่พบจะไม่ถูกนำเข้า", "Until the access channel is confirmed (decision D-F05), a file exported from e-GP is used. Rows are checked against the plan first and unknown ones are left out.")}</p></div></div>
  <section class="panel"><header><h2>${L("นำเข้าไฟล์สถานะ e-GP", "Import an e-GP status file")}</h2><span class="sp"></span>${isProcRole() ? `<button class="btn" type="button" id="egp-sample">${L("สร้างไฟล์ตัวอย่าง", "Create a sample file")}</button>` : `<span class="sub">${L("เจ้าหน้าที่พัสดุนำเข้า", "Procurement officers import")}</span>`}</header>
    ${EGP_ROWS ? `<div class="tbl-wrap"><table><thead><tr><th>plan</th><th>egp_no</th><th>${L("ขั้นตอน", "Stage")}</th><th>${L("วันที่", "Date")}</th><th>${L("ผลตรวจ", "Check")}</th></tr></thead>
      <tbody>${EGP_ROWS.map(r => `<tr><td class="mono">${esc(r.plan)}</td><td class="mono">${esc(r.no)}</td><td>${tx(r.stage)}</td><td>${fdate(r.date)}</td><td>${r.ok ? tag(L("พร้อมนำเข้า", "Ready"), "p-ok") : tag(L("ไม่พบรายการในแผน", "Not in the plan"), "p-bad")}</td></tr>`).join("")}</tbody></table></div>
      <div class="body row"><button class="btn primary" type="button" id="egp-go" ${EGP_ROWS.some(r => r.ok) ? "" : "disabled"}>${L("นำเข้า", "Import")} ${EGP_ROWS.filter(r => r.ok).length} ${L("รายการ", "rows")}</button><button class="btn ghost" type="button" id="egp-clear">${L("ล้าง", "Clear")}</button></div>` : `<div class="body sub">${L("ยังไม่ได้เลือกไฟล์", "No file chosen")}</div>`}</section>
  ${log.length ? `<section class="panel"><header><h2>${L("ประวัติการนำเข้า", "Import log")}</h2></header><div class="tbl-wrap"><table><thead><tr><th>${L("เลขที่", "No.")}</th><th>${L("เวลา", "Time")}</th><th>${L("ผู้นำเข้า", "By")}</th><th class="n">${L("นำเข้า", "Imported")}</th><th class="n">${L("ข้าม", "Skipped")}</th></tr></thead>
    <tbody>${log.map(g => `<tr><td class="mono">${g.id}</td><td class="sub">${fdate(g.t, true)}</td><td>${esc(userName(g.by))}</td><td class="n">${g.ok}</td><td class="n">${g.bad}</td></tr>`).join("")}</tbody></table></div></section>` : ""}`;
};

// The page itself (menu, tabs, sections) is built in 74-proc-pages.js (round 44).

BIND.procurement = () => {
  $$("[data-prtab]").forEach(b => (b.onclick = () => { PROC_TAB = b.dataset.prtab; route(); }));
  $$("[data-preq]").forEach(b => (b.onclick = () => { const c = caseByPlan(b.dataset.preq); if (!c) { toast(L("ไม่พบรายการจัดซื้อของรายการนี้", "No case for this item")); return; } CASE_OPEN = c.id; CASE_MAIN[c.id] = 2; PROC_TAB = "cases"; route(); })); // the requisition is raised on the case page (file 98ze), not in a pop-up
  $$("[data-rqview]").forEach(b => (b.onclick = () => { PRQ_OPEN = PRQ_OPEN === b.dataset.rqview ? null : b.dataset.rqview; route(); }));
  const refocus = id => { const el = $(id); if (el) { el.focus(); const v = el.value; el.value = ""; el.value = v; } };
  const pt = $("#pp-toggle"); if (pt) pt.onclick = () => { PLAN_ADD = !PLAN_ADD; route(); if (PLAN_ADD) setTimeout(() => refocus("#pp-name"), 0); };
  let tmr; const plq = $("#pl-q"); if (plq) plq.oninput = () => { clearTimeout(tmr); tmr = setTimeout(() => { PLAN_Q = plq.value; PLAN_PG = 1; route(); refocus("#pl-q"); }, 250); };
  const plf = $("#pl-fs"); if (plf) plf.onchange = () => { PLAN_FS = plf.value; PLAN_PG = 1; route(); };
  $$("[data-plpg]").forEach(b => (b.onclick = () => { PLAN_PG = Number(b.dataset.plpg); route(); }));
  const room = () => { const sel = $("#pp-line"), el = $("#pp-room"); if (el) el.textContent = sel && sel.value ? `${L("วงเงินคงเหลือของรายการจัดสรร", "Room left on the line")} ${mb(famHeadroom(sel.value))} ${L("ลบ.", "M")}` : ""; };
  const pls = $("#pp-line"); if (pls) { pls.onchange = room; room(); }
  const plq2 = $("#pp-lq"); if (plq2) plq2.oninput = () => { PLAN_LQ = plq2.value; const q = PLAN_LQ.trim().toLowerCase(), keep = pls.value, all = famLines().filter(l => l.type === "inv" || l.type === "ope"), ls = all.filter(l => !q || (lineLabel(l) + " " + l.id).toLowerCase().includes(q));
    pls.innerHTML = ls.map(l => `<option value="${l.id}" ${l.id === keep ? "selected" : ""}>${esc(lineLabel(l))} · ${mb(l.amount)}</option>`).join("");
    const c = $("#pp-lcnt"); if (c) c.textContent = ls.length + "/" + all.length; room(); };
  const pf = $("#pp-form");
  if (pf) pf.onsubmit = e => {
    e.preventDefault(); if (!isPlanRole()) return;
    const est = Math.round(Number($("#pp-est").value) * 1e6 / 1e3) * 1e3, nm = $("#pp-name").value.trim();
    if (!$("#pp-line").value) { toast(L("เลือกรายการจัดสรรก่อน", "Choose an allocation line")); return; }
    if (!(est > 0) || !nm) { toast(L("ใส่ชื่อรายการและประมาณการ", "Enter a name and an estimate")); return; }
    const p = { id: nextId("PP", S.pplan), line: $("#pp-line").value, name: [nm, nm], est, method: $("#pp-method").value || (est <= 5e5 ? "specific" : "ebid"), month: $("#pp-month").value, by: me().id, status: "planned", egp: null,
      qty: Math.max(1, Math.round(Number($("#pp-qty").value) || 1)), unitName: $("#pp-unit").value.trim(), months: Math.max(1, Math.round(Number($("#pp-dur").value) || 1)), note: $("#pp-note").value.trim() };
    p.cat = $("#pp-cat").value; p.kind = (S.pcat.find(c => c.id === p.cat) || {}).kind || guessKind(famLine(p.line), p.name);
    p.pid = pidNew(); S.pjrows.push({ id: eNextId("BR-", S.pjrows), pid: p.pid, fy: FAM_FY, code: "ตัวอย่าง-" + p.line, fund: "act", gf: true, amount: p.est }); // Project ID is issued here, when the item is created from an allocation line (round R1)
    S.pplan.push(p); caseNew(p);
    audit(["เพิ่มรายการในแผนจัดซื้อ", "Added a procurement plan item"], `${p.id} ${nm}`); commit(); PLAN_Q = ""; PLAN_FS = ""; PLAN_PG = Math.ceil(S.pplan.length / PLAN_PS); route(); setTimeout(() => refocus("#pp-name"), 0); toast(L("เพิ่มในแผนแล้ว " + p.id, "Added to the plan " + p.id));
  };
  const decide = (id, ok) => rqDecide(id, ok); // the decision is in file 98ze: the division's authority approves the requisition with its method
  $$("[data-rqok]").forEach(b => (b.onclick = () => decide(b.dataset.rqok, true)));
  $$("[data-rqno]").forEach(b => (b.onclick = () => decide(b.dataset.rqno, false)));
  $$("[data-rqcase]").forEach(b => (b.onclick = () => { CASE_OPEN = b.dataset.rqcase; PROC_TAB = "cases"; route(); }));
  const cf = $("#ct-form");
  if (cf) {
    const cd = $("#ct-dlg"), closeCt = () => { CT_OPEN = false; CT_FROM = null; if (cd.open) cd.close(); route(); };
    $("#ct-open").onclick = () => { CT_OPEN = true; route(); };
    if (CT_OPEN && !cd.open) cd.showModal();
    cd.addEventListener("cancel", e => { e.preventDefault(); closeCt(); });
    $("#ct-cancel").onclick = closeCt; $("#ct-x").onclick = closeCt;
    $("#ct-req").onchange = e => { CT_FROM = e.target.value; route(); };
    cf.onsubmit = e => {
      e.preventDefault();
      const cs = caseOf($("#ct-req").value), rq = famReq(cs.reqn), amount = Math.round(Number($("#ct-amt").value) * 100) / 100;
      if (caseState(cs) !== 8) { toast(L("รายการจัดซื้อยังไม่ถึงขั้นทำสัญญา", "The case isn't at the contracting step")); return; }
      if (!(amount > 0) || amount > cs.award.price || amount > rq.amount) { toast(L("วงเงินสัญญาต้องไม่เกินราคาที่ประกาศและวงเงินในใบขอซื้อ", "The contract amount can't exceed the announced price or the requisition amount")); return; }
      const ap = cmApply($("#ct-cm").value, { amount, kind: cs.kind, cs, unit: famLine(famPlan(cs.plan).line).unit }, rq.id); if (!ap) return;
      if (blBlocked(cs, $("#ct-vendor").value.trim())) { toast(L("คู่สัญญาอยู่ในรายชื่อผู้ทิ้งงาน (R-17) ทำสัญญาไม่ได้", "The supplier is on the abandoned-work list (R-17); no contract")); return; }
      const p = famPlan(rq.plan), n = Number($("#ct-ph").value), signed0 = $("#ct-date").value, share = amount / n; let left = amount; const days = Math.round(Number($("#ct-days").value)), start = $("#ct-start").value, signed = signed0;
      if (!(Number.isInteger(n) && n > 0 && n <= 120) || !(days > 0) || !start) { toast(L("ระบุจำนวนงวดงาน (จำนวนเต็ม) จำนวนวันแล้วเสร็จ และวันที่เริ่มต้นสัญญา", "Enter the phases, the days and the start date")); return; }
      const adv = Number($("#ct-adv").value) || 0; if (adv < 0 || adv > 100) { toast(L("% เงินเบิกล่วงหน้าต้องอยู่ระหว่าง 0–100", "Advance must be 0–100%")); return; }
      const stepDays = Math.max(1, Math.round(days / n)); // P53: the days in the contract set the phase dates (the phases stay in the data only)
      const phases = Array.from({ length: n }, (_, i) => { const a = i < n - 1 ? Math.round(share / 1e3) * 1e3 : left; left -= a; return { n: i + 1, name: [`งวดที่ ${i + 1}`, `Phase ${i + 1}`], due: addDays(start, Math.min(days - 1, stepDays * (i + 1) - 1)), amount: a, signs: [] }; });
      const c = { id: nextId("CT", S.contracts), reqn: rq.id, plan: p.id, line: p.line, vendor: [$("#ct-vendor").value.trim(), $("#ct-vendor").value.trim()], no: $("#ct-no").value.trim(), signed, amount, by: me().id, inspectors: ap.insp, cm: ap.cm.id, status: "active", phases,
        base: amount, ver: 1, versions: [{ v: 1, amount, t: nowIso(), by: me().id, why: "" }], vars: [], guarantee: null, warrantyMonths: 24,
        supervision: cs.kind === "construction" ? { who: "", reports: [], assess: [] } : null, defects: [], letters: [] };
      c.phases.forEach(ph => (ph.need = ap.need)); S.contracts.push(c);
      if (typeof kxOf === "function") { const x = kxOf(c), gk = document.querySelector('input[name="ct-gk"]:checked'); Object.assign(x, { projNo: $("#ct-proj").value.trim(), ctlNo: $("#ct-ctl").value.trim(), no: c.no, date: signed, amount, days, start, fine: $("#ct-fine").value === "" ? "" : Number($("#ct-fine").value), nPhases: n, adv: { has: adv > 0, pct: adv > 0 ? adv : "" } }); x.guar.kind = gk ? gk.value : ""; } rq.status = "contracted"; p.status = "contracted"; CT_FROM = null; CT_OPEN = false; if ($("#ct-dlg") && $("#ct-dlg").open) $("#ct-dlg").close(); caseOnContract(cs, c);
      audit(["สร้างสัญญา", "Created a contract"], `${c.id} ${rq.id}`);
      notify(["fin", "exec"], [`สัญญา ${c.id} ผูกพันวงเงิน ${mb(amount)} ล้านบาท`, `Contract ${c.id} commits ${mb(amount)} M`], "fnc-chain");
      commit(); renderShell(); route(); toast(L("สร้างสัญญาแล้ว · วงเงินผูกพันบนรายการจัดสรรแล้ว", "Contract created · the allocation line is committed"));
    };
  }
  $$("[data-ccsave]").forEach(b => (b.onclick = () => {
    const c = famCon(b.dataset.ccsave), cs = caseByPlan(c.plan), ap = cmApply($("#ccs-" + c.id).value, { amount: c.amount, kind: cs ? cs.kind : "", cs, unit: famLine(famPlan(c.plan).line).unit }, c.id); if (!ap) return;
    c.inspectors = ap.insp; c.cm = ap.cm.id; c.phases.forEach(ph => { if (!ph.signs.length) ph.need = ap.need; }); audit(["เปลี่ยนกรรมการตรวจรับ", "Changed the acceptance committee"], `${c.id} ${ap.cm.id}`); commit(); route(); toast(L("บันทึกกรรมการแล้ว", "Committee saved"));
  }));
  const sample = $("#egp-sample");
  if (sample) sample.onclick = () => {
    const pick = S.pplan.filter(p => p.status !== "contracted").slice(0, 2);
    EGP_ROWS = pick.map((p, i) => ({ plan: p.id, no: `EGP-70-${String(110 + i)}`, stage: i ? [["ประกาศเชิญชวน", "Invitation"], ["ประกาศผู้ชนะ", "Winner announced"]][0] : ["ประกาศผู้ชนะ", "Winner announced"], date: TODAY, ok: true }));
    EGP_ROWS.push({ plan: `PP-2570-999`, no: "EGP-70-199", stage: ["ประกาศเชิญชวน", "Invitation"], date: TODAY, ok: false });
    route();
  };
  const go_ = $("#egp-go");
  if (go_) go_.onclick = () => {
    const ok = EGP_ROWS.filter(r => famPlan(r.plan).line !== "" && r.ok);
    ok.forEach(r => { famPlan(r.plan).egp = { no: r.no, stage: r.stage, date: r.date }; const cs = caseByPlan(r.plan); if (cs && cs.egp) { cs.egp.no = r.no; cs.egp.stage = r.stage; caseLog(cs, "egp", `${r.no} · ${tx(r.stage)}`); } });
    const g = { id: `EG-${FAM_FY}-${String(S.egpImports.length + 1).padStart(2, "0")}`, t: nowIso(), by: me().id, ok: ok.length, bad: EGP_ROWS.length - ok.length };
    S.egpImports.unshift(g); EGP_ROWS = null;
    audit(["นำเข้าไฟล์สถานะ e-GP", "Imported an e-GP status file"], `${g.id} · ${g.ok}`); commit(); route(); toast(L("นำเข้าแล้ว", "Imported"));
  };
  const clr = $("#egp-clear"); if (clr) clr.onclick = () => { EGP_ROWS = null; route(); };
};
