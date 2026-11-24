// Fisko-KlangFinance, procurement round B (12 Nov 2569): the division raises the requisition on the case page, not in a pop-up.
// What the user asked for: when the division presses "raise a requisition" it goes into the case, to the panel "Prepare the data", and
// fills everything there (project details, method, reference price, TOR, committee), then sends it to the division's authority from the
// same place; the method the division chooses is approved by the division's authority (the head, an executive, or someone allowed to
// approve), together with the requisition; the TOR is an attached document.
// - The form (amount and reason, project details, attachments) is the old pop-up's form, now a sub-panel of "Prepare the data". What is typed is kept
//   as a draft on the case (c.rqDraft) so it survives when another panel on the page is used. "Send for approval" needs the method, the
//   reference price, the TOR and the TOR committee to be ready (the checklist under the form).
// - Who approves: an executive who may spend (as before), or the head of the division that owns the plan item (role divhead, same unit).
//   Approving the requisition approves the method with it (c.methodApproval "with_request" becomes "approved").
// - The TOR panel takes attached files (name, size, type; a file up to 200 KB keeps its content) besides the template picker.
// Not done: an executive of another unit who is allowed to approve for this division is not modelled; only divhead of the same unit and the executive.
const rqUnitOf = r => famLine(famPlan(r.plan).line).unit;
const rqCanDecide = r => r.status === "pending" && (canSpend() || (ROLE === "divhead" && me().unit === rqUnitOf(r)));
const rqCanRaise = c => !c.cancelled && caseState(c) === 1 && !caseReq(c) && inPublishedPlan(famPlan(c.plan)) && famPlan(c.plan).status === "planned" && cmCanNew(c);
const caseMethodOpen = c => !c.cancelled && ((caseState(c) <= 2 && cmCanNew(c)) || (isProcRole() && caseState(c) >= 1 && caseState(c) <= 4));
let CASE_RQ_FOR = null;

function rqDecide(id, ok) {
  const rq = famReq(id), p = famPlan(rq.plan), au = famAuth(), c = caseByPlan(p.id);
  if (!rqCanDecide(rq)) { toast(L("ผู้มีอำนาจของสำนัก/กองเจ้าของเรื่องเท่านั้นที่พิจารณาได้", "Only the division's authority can decide")); return; }
  if (ok) {
    if (!sodCheck("SD-01", canSpend() ? sodActors("exec", "spend") : [me().id], [rq.by], rq.id)) return;
    if (rq.amount > famHeadroom(p.line)) { toast(L(`เกินวงเงินคงเหลือของรายการจัดสรร (${mb(famHeadroom(p.line))} ลบ.)`, `More than the room left on the line (${mb(famHeadroom(p.line))} M)`)); return; }
  }
  rq.status = ok ? "approved" : "rejected"; rq.decided = { by: me().id, holder: au.holder, via: au.via, t: nowIso() };
  if (!ok) p.status = "planned";
  caseOnDecide(p, rq, ok);
  if (c && ok && c.methodApproval && c.methodApproval.status === "with_request") c.methodApproval = { status: "approved", t: nowIso(), by: me().id };
  audit(ok ? ["อนุมัติขอซื้อขอจ้าง", "Approved a requisition"] : ["ไม่อนุมัติขอซื้อขอจ้าง", "Rejected a requisition"], `${rq.id} ${p.id}${onBehalf("exec", "spend")}`);
  notify(["proc", "div", "divhead"], ok ? [`ใบขอซื้อ ${rq.id} อนุมัติแล้ว (รวมวิธีจัดหา) สำนัก/กองส่งเอกสารให้กองคลังได้`, `Requisition ${rq.id} is approved with its method; the division can hand over to Finance`] : [`ใบขอซื้อ ${rq.id} ไม่ได้รับอนุมัติ`, `Requisition ${rq.id} was not approved`], c ? "case:" + c.id : "prc-reqn");
  commit(); renderShell(); route(); toast(ok ? L("อนุมัติแล้ว", "Approved") : L("ไม่อนุมัติ", "Rejected"));
}

// ---------- the form ----------
// จังหวัด / อำเภอ / ตำบล come from the area register (ทะเบียนพื้นที่, S.geo), one drop-down feeding the next (23 Nov 2569)
function rqGeoOpts(lvl, cur, prov, dist) {
  const G = (S.geo || []).filter(g => !g.retired && (lvl === "prov" || g.prov === prov) && (lvl !== "sub" || g.dist === dist));
  const list = [...new Set(G.map(g => g[lvl]).filter(Boolean))].sort((a, b) => a.localeCompare(b, "th"));
  const head = lvl === "prov" ? L("— เลือกจังหวัด —", "— Province —") : lvl === "dist" ? (prov ? L("— เลือกอำเภอ —", "— District —") : L("— เลือกจังหวัดก่อน —", "— Pick the province first —")) : (dist ? L("— เลือกตำบล —", "— Sub-district —") : L("— เลือกอำเภอก่อน —", "— Pick the district first —"));
  return `<option value="">${head}</option>` + list.map(x => `<option ${x === cur ? "selected" : ""}>${esc(x)}</option>`).join("");
}
document.addEventListener("change", e => { const t = e.target; if (!t || !t.matches || !t.matches("[data-rqgeo]")) return; const P = document.getElementById("pr-prov"), A = document.getElementById("pr-amp"), T = document.getElementById("pr-tam"); if (!P || !A || !T) return;
  if (t === P) { A.innerHTML = rqGeoOpts("dist", "", P.value, ""); T.innerHTML = rqGeoOpts("sub", "", P.value, ""); } else if (t === A) T.innerHTML = rqGeoOpts("sub", "", P.value, A.value); });
function rqReadVals() {
  const g = id => { const el = document.getElementById(id); return el ? el.value.trim() : ""; };
  return { amt: g("pr-amt"), why: g("pr-why"), obj: g("pr-obj"), scope: g("pr-scope"), qty: g("pr-qty"), unit: g("pr-unit"), days: g("pr-days"), place: g("pr-place"), deliv: g("pr-deliv"), basis: g("pr-basis"), ben: g("pr-ben"), contact: g("pr-contact"), phone: g("pr-phone"), prov: g("pr-prov"), amp: g("pr-amp"), tam: g("pr-tam"), refs: g("pr-refs"), split: g("pr-split"), files: RQ_FILES.map(x => ({ name: x.name, size: x.size, type: x.type, kind: x.kind || 0 })) };
}
const rqReady = c => [{ ok: !!c.method, label: L("เลือกวิธีจัดหา (แผงวิธีจัดซื้อ)", "Choose the method (Method panel)") }, ...casePrepItems(c)];
function rqFormHtml(c) {
  const p = famPlan(c.plan), l = famLine(p.line), d = c.rqDraft || {}, v = (k, def) => (d[k] !== undefined && d[k] !== "" ? d[k] : def);
  const fld = (id, th, en, inner, flex) => `<div class="f" style="flex:${flex || "1 1 100%"}"><label for="${id}">${L(th, en)}</label>${inner}</div>`;
  if (CASE_RQ_FOR !== c.id) { RQ_FILES = (d.files || []).map(x => Object.assign({}, x)); CASE_RQ_FOR = c.id; }
  return `<form id="rq-inline" data-rqcase="${c.id}" onsubmit="return false" style="display:flex;flex-direction:column;gap:14px">
    <div class="sub">${esc(tx(p.name))} · ${esc(lineLabel(l))} · ${L("วงเงินคงเหลือของรายการจัดสรร", "Room left")} ${mb(famHeadroom(p.line))} ${L("ลบ.", "M")} · ${L("ใส่ข้อมูลให้ครบในแผงจัดทำข้อมูลนี้ (รายละเอียดโครงการ วิธีจัดซื้อ ราคากลาง TOR คณะกรรมการ) แล้วส่งให้ผู้มีอำนาจของสำนัก/กองอนุมัติจากที่นี่", "Fill everything in this Prepare-the-data panel (details, method, reference price, TOR, committee), then send it to the division's authority from here")}</div>
    <section><h3>1 · ${L("วงเงินและเหตุผล", "Amount and reason")}</h3><div class="row">
      ${fld("pr-amt", "วงเงิน (ล้านบาท) *", "Amount (M baht) *", `<input type="number" id="pr-amt" min="0.001" step="0.001" value="${esc(v("amt", (p.est / 1e6).toFixed(3)))}">`, "0 1 170px")}
      ${fld("pr-why", "เหตุผลความจำเป็น *", "Justification *", `<input type="text" id="pr-why" value="${esc(v("why", L("จำเป็นต่อการดำเนินงานตามแผนปีงบประมาณ 2570", "Needed to deliver the FY2570 work plan")))}">`, "1 1 300px")}
      <div class="f" id="pr-splitbox" style="flex:1 1 100%;display:none"><label for="pr-split">${L("คำชี้แจงการแตกซื้อ (R-02) *", "Split-purchase explanation (R-02) *")}</label><input type="text" id="pr-split" value="${esc(v("split", ""))}" placeholder="${esc(L("ระบบพบรายการประเภทเดียวกันในหน่วยเดียวกันรวมกันเกินเพดานวิธีเฉพาะเจาะจง ระบุเหตุผลที่ต้องแยกซื้อ", "Similar requests in the same unit pass the specific-method ceiling. Say why they are bought separately"))}"></div></div></section>
    <section><h3>2 · ${L("รายละเอียดโครงการ", "Project details")}</h3><div class="row">
      ${fld("pr-obj", "วัตถุประสงค์ / ความเป็นมา *", "Objective / background *", `<textarea id="pr-obj" rows="2" placeholder="${esc(L("ทำไมต้องซื้อหรือจ้าง เชื่อมกับโครงการ/กิจกรรมใด", "Why it is needed and which project it serves"))}">${esc(v("obj", ""))}</textarea>`)}
      ${fld("pr-scope", "ขอบเขตงาน / คุณลักษณะเฉพาะ", "Scope / specification", `<textarea id="pr-scope" rows="3" placeholder="${esc(L("รายการ คุณสมบัติ ขนาด มาตรฐาน (ใช้จัดทำ TOR)", "Items, specs, standards (used for the TOR)"))}">${esc(v("scope", ""))}</textarea>`)}
      ${fld("pr-qty", "จำนวน *", "Qty *", `<input type="number" id="pr-qty" min="1" step="1" value="${esc(v("qty", p.qty || 1))}">`, "0 1 110px")}
      ${fld("pr-unit", "หน่วยนับ", "Unit", `<input type="text" id="pr-unit" value="${esc(v("unit", p.unitName || "ชุด"))}">`, "0 1 120px")}
      ${fld("pr-days", "ระยะเวลาส่งมอบ (วัน) *", "Delivery (days) *", `<input type="number" id="pr-days" min="1" step="1" value="${esc(v("days", p.months ? p.months * 30 : 90))}">`, "0 1 170px")}
      ${fld("pr-place", "สถานที่ส่งมอบ / ดำเนินการ *", "Delivery site *", `<input type="text" id="pr-place" value="${esc(v("place", ""))}">`, "1 1 220px")}
      <div class="rq-geo-row" style="flex:1 1 100%;display:flex;gap:inherit;flex-wrap:wrap">
      ${fld("pr-prov", "จังหวัด", "Province", `<select id="pr-prov" data-rqgeo>${rqGeoOpts("prov", v("prov", ""), "", "")}</select>`, "1 1 180px")}
      ${fld("pr-amp", "อำเภอ", "District", `<select id="pr-amp" data-rqgeo>${rqGeoOpts("dist", v("amp", ""), v("prov", ""), "")}</select>`, "1 1 180px")}
      ${fld("pr-tam", "ตำบล", "Sub-district", `<select id="pr-tam" data-rqgeo>${rqGeoOpts("sub", v("tam", ""), v("prov", ""), v("amp", ""))}</select>`, "1 1 180px")}</div>
      ${fld("pr-deliv", "ผลงานที่ต้องส่งมอบ *", "Deliverables *", `<input type="text" id="pr-deliv" value="${esc(v("deliv", ""))}" placeholder="${esc(L("เช่น ระบบพร้อมใช้งาน คู่มือ การฝึกอบรม", "e.g. working system, manual, training"))}">`)}
      ${fld("pr-basis", "ที่มาของวงเงิน", "Basis of the estimate", `<select id="pr-basis">${["ใบเสนอราคา", "ราคาท้องตลาด", "ราคาที่เคยซื้อ/จ้างย้อนหลัง", "ราคามาตรฐานครุภัณฑ์", "อื่น ๆ"].map(x => `<option ${v("basis", "") === x ? "selected" : ""}>${x}</option>`).join("")}</select>`, "1 1 220px")}
      ${fld("pr-ben", "ประโยชน์ที่คาดว่าจะได้รับ", "Expected benefit", `<textarea id="pr-ben" rows="3" placeholder="${esc(L("ผลที่หน่วยงานหรือประชาชนจะได้รับ ตัวชี้วัด หรือจำนวนผู้ได้ประโยชน์", "What the agency or the public will gain, indicators, how many benefit"))}">${esc(v("ben", ""))}</textarea>`)}
      ${fld("pr-contact", "ผู้ประสานงาน *", "Contact person *", `<input type="text" id="pr-contact" value="${esc(v("contact", userName(me().id)))}">`, "1 1 260px")}
      ${fld("pr-phone", "เบอร์ติดต่อ *", "Phone *", `<input type="text" inputmode="tel" id="pr-phone" value="${esc(v("phone", ""))}">`, "1 1 180px")}</div></section>
</form>`;
}
// "เอกสารแนบอื่นๆ ประกอบ" (23 Nov 2569): its own panel at the bottom of the unit's part, just before "ready to send?"
function rqAttachPanel(c) { if (!rqCanRaise(c)) return null; const d = c.rqDraft || {}, v = (k, def) => (d[k] !== undefined && d[k] !== "" ? d[k] : def), fld = (id, th, en, inner, flex) => `<div class="f" style="flex:${flex || "1 1 100%"}"><label for="${id}">${L(th, en)}</label>${inner}</div>`;
  return { title: L("เอกสารแนบอื่นๆ ประกอบ", "Other supporting attachments"), body: `<div class="rq-attach" style="display:flex;flex-direction:column;gap:8px">
      <label class="rq-drop" id="rq-drop" for="rq-file"><b>${L("เลือกไฟล์ หรือลากมาวางที่นี่", "Choose files or drop them here")}</b><span class="sub">${L("เช่น TOR ร่าง ใบเสนอราคา แบบรูป · เก็บเฉพาะชื่อ ขนาด และประเภทไฟล์ (TOR ที่แนบเป็นเอกสารจริงทำที่แผง TOR)", "e.g. draft TOR, quotations, drawings · name, size and type only (the TOR as an attached document is on the TOR panel)")}</span></label>
      <input type="file" id="rq-file" multiple hidden>
      <div id="rq-files">${rqFilesHtml()}</div>
      ${fld("pr-refs", "เลขที่เอกสารอ้างอิง (ถ้ามี)", "Document reference no.", `<input type="text" id="pr-refs" value="${esc(v("refs", ""))}">`)}</div>` }; }
// The panel for the requisition on the case page: the form before it is raised, then its status and the decision buttons.
function rqCasePanel(c) {
  const rq = caseReq(c), n = caseState(c);
  if (rqCanRaise(c)) return { title: L("ขอจัดซื้อ", "Raise the requisition"), body: rqFormHtml(c) };
  if (!rq) return n === 1 && !c.cancelled ? { title: L("ขอจัดซื้อ", "Raise the requisition"), body: `<span class="sub">${!inPublishedPlan(famPlan(c.plan)) ? L("รายการนี้ยังไม่ได้รับอนุมัติแผน ขออนุมัติแผนที่หน้าแผนจัดซื้อก่อน", "The plan for this item is not approved yet; ask for approval on the procurement plan page first") : L("สำนัก/กองเจ้าของเรื่องหรือเจ้าหน้าที่พัสดุเป็นผู้ขอจัดซื้อ", "The owning division or procurement raises the requisition")}</span>` } : null;
  return { title: L("ใบขอซื้อขอจ้าง", "Requisition"), body: `<div><b class="mono">${esc(rq.id)}</b> · ${baht(rq.amount)} · ${stTag(REQ_ST, rq.status)}</div><div class="sub">${L("ผู้ขอ", "Requester")}: ${esc(userName(rq.by))} · ${fdate(rq.t, true)}${rq.decided ? ` · ${L("พิจารณาโดย", "Decided by")} ${esc(userName(rq.decided.by))} ${fdate(rq.decided.t, true)}` : ""}</div>
    ${rq.status === "pending" ? `<div class="sub">${L("รอผู้มีอำนาจของสำนัก/กองอนุมัติ พร้อมวิธีจัดหา", "Waiting for the division's authority, with the method")}</div>${rqCanDecide(rq) ? `<div class="row"><button class="btn primary" type="button" data-rqdec="${rq.id}|1">${L("อนุมัติ", "Approve")}</button><button class="btn danger" type="button" data-rqdec="${rq.id}|0">${L("ไม่อนุมัติ", "Reject")}</button></div>` : ""}` : ""}` };
}
// "Ready to send?": the status of each heading of Prepare the data, and the send button; kept at the bottom of the panel.
const rqVals = c => (document.getElementById("rq-inline") ? rqReadVals() : (c.rqDraft || {}));
function rqMissing(v) { return [[v.obj, "วัตถุประสงค์", "objective"], [Number(v.qty) > 0, "จำนวน", "quantity"], [Number(v.days) > 0, "ระยะเวลาส่งมอบ", "delivery days"], [v.place, "สถานที่ส่งมอบ", "delivery site"], [v.deliv, "ผลงานที่ต้องส่งมอบ", "deliverables"], [v.contact, "ผู้ประสานงาน", "contact"], [v.phone, "เบอร์ติดต่อ", "phone"], [Number(v.amt) > 0, "วงเงิน", "amount"]].filter(x => !x[0]).map(x => L(x[1], x[2])); }
function rqReadyRows(c) {
  const v = rqVals(c), miss = rqMissing(v), m = prepMethod(c), needTor = needsCompetition({ method: m }), needCm = ((ruleFor(m).committees) || []).includes("tor"), files = (c.tor && c.tor.files) || [];
  return [
    { ok: miss.length === 0, th: L("รายละเอียดโครงการ", "Project details"), note: miss.length ? L("ยังขาด: ", "Missing: ") + miss.join(", ") : L("กรอกครบแล้ว", "Complete") },
    { ok: !!c.method, th: L("วิธีจัดซื้อ", "Procurement method"), note: c.method ? tx(PMETHOD[c.method]) + (c.methodApproval && c.methodApproval.status === "with_request" ? " · " + L("ผู้มีอำนาจอนุมัติพร้อมใบขอซื้อ", "approved with the requisition") : "") : L("ยังไม่เลือก ไปที่แผงวิธีจัดซื้อ", "Not chosen; use the Method panel") },
    { ok: !!(c.ref && c.ref.amount > 0 && c.ref.basis && c.ref.basis.length), th: L("ราคากลาง", "Reference price"), note: c.ref ? fmt(c.ref.amount) + " " + L("บาท", "baht") : L("ยังไม่บันทึก ไปที่แผงราคากลาง", "Not recorded; use the Reference price panel") },
    { ok: (!needTor || !!c.tor) && !torKindBad(c), th: "TOR", note: !needTor ? L("วิธีนี้ไม่ต้องมี TOR", "This method needs no TOR") : c.tor ? esc(c.tor.doc || "") + (files.length ? " · " + files.length + " " + L("ไฟล์", "files") : "") + (torKindBad(c) ? " · " + L("แม่แบบ TOR เป็นของชนิดงานอื่น เปลี่ยนแม่แบบหรือชนิดงาน", "the TOR template is for another kind of work; change the template or the kind") : "") : L("ยังไม่ได้แนบ ไปที่แผง TOR", "Not attached; use the TOR panel"), na: !needTor },
    { ok: !needCm || committeeOk((c.committees || {}).tor), th: L("คณะกรรมการ TOR", "TOR committee"), note: !needCm ? L("วิธีนี้ไม่ต้องมีคณะกรรมการ TOR", "This method needs no TOR committee") : committeeOk((c.committees || {}).tor) ? L("ครบเงื่อนไข", "Meets the conditions") : L("ยังไม่ครบ ไปที่แผงคณะกรรมการ", "Not complete; use the Committees panel"), na: !needCm },
    { ok: true, th: L("เอกสารแนบของใบขอซื้อ", "Attachments of the requisition"), note: RQ_FILES.length ? RQ_FILES.length + " " + L("ไฟล์", "files") : L("ไม่มี (ไม่บังคับ)", "None (optional)"), na: !RQ_FILES.length }];
}
function rqReadyHtml(c) {
  const rows = rqReadyRows(c), allOk = rows.every(x => x.ok);
  return `<div class="tbl-wrap"><table><thead><tr><th>${L("หัวข้อ", "Topic")}</th><th>${L("สถานะ", "Status")}</th><th>${L("รายละเอียด", "Detail")}</th></tr></thead><tbody>${rows.map(x => `<tr><td>${x.th}</td><td>${x.ok ? tag(x.na ? L("ไม่ต้องมี", "Not needed") : L("ครบ", "Done"), x.na ? "p-mute" : "p-ok") : tag(L("ยังไม่ครบ", "Open"), "p-warn")}</td><td class="sub">${x.note}</td></tr>`).join("")}</tbody></table></div>
    <div class="sub">${L("ผู้มีอำนาจของสำนัก/กอง (หัวหน้าหรือผู้บริหารหรือผู้มีสิทธิ์อนุมัติ) อนุมัติใบขอซื้อพร้อมวิธีจัดหาที่เลือกในครั้งเดียว", "The division's authority (the head, an executive or someone allowed to approve) approves the requisition with its method in one go")}</div>
    <div class="row"><button class="btn ghost" type="button" id="rqi-save">${L("บันทึกร่าง", "Save the draft")}</button><button class="btn primary" type="button" id="rqi-send" ${allOk ? "" : "disabled"}>${L("ส่งให้ผู้มีอำนาจอนุมัติ", "Send to the authority")}</button></div>`;
}
function rqReadyPanel(c) { return rqCanRaise(c) ? { title: L("พร้อมส่งหรือยัง", "Ready to send?"), body: `<div id="rq-ready">${rqReadyHtml(c)}</div>` } : null; }
const rqRefreshReady = c => { const box = document.getElementById("rq-ready"); if (box && c) box.innerHTML = rqReadyHtml(c); };

function rqSubmit(c) {
  const p = famPlan(c.plan), v = rqReadVals(), amount = Math.round(Number(v.amt) * 1e6 / 1e3) * 1e3, T = (th, en) => toast(L(th, en));
  if (!rqCanRaise(c)) { T("ขอจัดซื้อไม่ได้ในตอนนี้", "Can't raise a requisition now"); return; }
  if (!(amount > 0)) { T("ใส่วงเงินก่อน", "Enter an amount"); return; }
  if (!inPublishedPlan(p)) { T("รายการนี้ยังไม่ได้รับอนุมัติแผน ขออนุมัติแผนที่หน้าแผนจัดซื้อก่อน", "The plan for this item is not approved yet; ask for approval on the procurement plan page first"); return; }
  if (amount > famHeadroom(p.line)) { T(`เกินวงเงินคงเหลือของรายการจัดสรร (${mb(famHeadroom(p.line))} ลบ.)`, `More than the room left on the line (${mb(famHeadroom(p.line))} M)`); return; }
  const detail = { obj: v.obj, scope: v.scope, qty: Number(v.qty) || 0, unit: v.unit, days: Number(v.days) || 0, place: v.place, deliv: v.deliv, basis: v.basis, ben: v.ben, contact: v.contact, phone: v.phone, prov: v.prov, amp: v.amp, tam: v.tam, refs: v.refs, files: RQ_FILES.map(x => ({ name: x.name, size: x.size, type: x.type, kind: RQ_DOCS[x.kind || 0] })) };
  const miss = [[detail.obj, "วัตถุประสงค์", "objective"], [detail.qty > 0, "จำนวน", "quantity"], [detail.days > 0, "ระยะเวลาส่งมอบ", "delivery days"], [detail.place, "สถานที่ส่งมอบ", "delivery site"], [detail.deliv, "ผลงานที่ต้องส่งมอบ", "deliverables"], [detail.contact, "ผู้ประสานงาน", "contact"], [detail.phone, "เบอร์ติดต่อ", "phone"]].filter(x => !x[0]).map(x => L(x[1], x[2]));
  if (miss.length) { T("กรอกรายละเอียดโครงการให้ครบ: " + miss.join(", "), "Complete the project details: " + miss.join(", ")); return; }
  const bad = rqReady(c).find(x => !x.ok); if (bad) { toast(`${L("ยังส่งไม่ได้", "Can't send yet")}: ${bad.label}`); return; }
  const sp = splitRisk(p, amount); if (sp.risk && v.split.length < 10) { const box = document.getElementById("pr-splitbox"); if (box) box.style.display = ""; T(`ระบบพบรายการประเภทเดียวกันในหน่วยเดียวกัน รวม ${fmt(sp.total)} บาท เกินเพดานวิธีเฉพาะเจาะจง ต้องชี้แจง`, `Similar requests in the same unit total ${fmt(sp.total)} baht, above the specific-method ceiling. An explanation is needed`); return; }
  const r = { id: nextId("RQ", S.reqn), plan: p.id, by: me().id, amount, why: [v.why || "-", v.why || "-"], status: "pending", t: nowIso(), decided: null, detail };
  if (sp.risk) r.splitWhy = v.split;
  S.reqn.push(r); p.status = "requisitioned"; caseOnRaise(p, r); c.rqDraft = null; RQ_FILES = []; CASE_RQ_FOR = null;
  if (sp.risk) { audit(["ชี้แจงการแตกซื้อ", "Explained a split purchase"], `${r.id} ${p.id}`); caseLog(c, "split", v.split); notify(["prochead", "audit"], [`ใบขอซื้อ ${r.id} เข้าข่ายแตกซื้อ มีคำชี้แจง`, `Requisition ${r.id} may be a split purchase; an explanation was given`], "prc-reqn"); }
  audit(["ขอซื้อขอจ้าง", "Raised a requisition"], `${r.id} ${p.id}`);
  notify(["divhead", "exec"], [`ใบขอซื้อขอจ้าง ${r.id} รอผู้มีอำนาจอนุมัติ (พร้อมวิธีจัดหา)`, `Requisition ${r.id} waits for the authority to approve, with its method`], "case:" + c.id);
  commit(); renderShell(); route(); toast(L("ส่งให้ผู้มีอำนาจอนุมัติแล้ว", "Sent to the authority"));
}
// ---------- the TOR as attached documents ----------
function torFilesHtml(c, open) {
  const files = (c.tor && c.tor.files) || [];
  return `${files.length ? `<ul style="margin:4px 0;padding-left:18px">${files.map((f, i) => `<li>${f.data ? `<a href="${f.data}" download="${esc(f.name)}">${esc(f.name)}</a>` : esc(f.name)} <span class="sub">· ${f.size ? Math.max(1, Math.round(f.size / 1024)) + " KB · " : ""}${f.data ? "" : L("เก็บเฉพาะชื่อไฟล์ · ", "file name only · ")}${f.note ? esc(f.note) + " · " : ""}${fdate(f.t || (c.tor && c.tor.t))}</span>${open ? ` <button class="btn ghost" type="button" data-tordel="${c.id}|${i}" aria-label="${L("ลบไฟล์", "Remove the file")}">×</button>` : ""}</li>`).join("")}</ul>` : ""}
    ${open ? `<form class="inline-form" data-torfiles="${c.id}"><div class="f" style="flex:1 1 240px"><label>${L("แนบเอกสาร TOR (ร่างหรือฉบับสมบูรณ์ หลายไฟล์ได้)", "Attach the TOR document (draft or final, several files)")}</label><input type="file" name="files" multiple required></div><div class="f" style="flex:1 1 160px"><label>${L("หมายเหตุ", "Note")}</label><input type="text" name="note"></div><button class="btn" type="submit">${L("แนบ TOR", "Attach the TOR")}</button></form>` : ""}`;
}
{
  const done = msg => { commit(); route(); toast(msg); };
  document.addEventListener("submit", e => {
    const f = e.target; if (!f || !f.matches || !f.matches("[data-torfiles]")) return; e.preventDefault();
    const c = caseOf(f.dataset.torfiles), files = [...f.querySelector("[name=files]").files], note = String(new FormData(f).get("note") || "").trim(); if (!c || !casePrepOpen(c) || !files.length) return;
    cmReadFiles(files).then(items => { c.tor = c.tor || { doc: "", tpl: null, tplV: null, t: nowIso(), by: me().id }; c.tor.files = (c.tor.files || []).concat(items.map(it => Object.assign({ note, t: nowIso() }, it))); if (!c.tor.doc) c.tor.doc = items[0].name;
      audit(["แนบเอกสาร TOR", "Attached TOR documents"], `${c.id} · ${items.map(i => i.name).join(", ")}`); caseLog(c, "tor", items.map(i => i.name).join(", ")); done(L("แนบ TOR แล้ว", "TOR attached")); });
  });
  document.addEventListener("click", e => {
    const t = e.target.closest && e.target.closest("[data-tordel]");
    if (t) { const [cid, i] = t.dataset.tordel.split("|"), c = caseOf(cid); if (!c || !c.tor || !casePrepOpen(c)) return; const gone = (c.tor.files || []).splice(Number(i), 1)[0]; if (gone && c.tor.doc === gone.name) c.tor.doc = ((c.tor.files || [])[0] || {}).name || ""; if (!c.tor.doc && !c.tor.tpl && !(c.tor.files || []).length) c.tor = null; audit(["ลบเอกสาร TOR", "Removed a TOR document"], `${c.id} ${gone ? gone.name : ""}`); done(L("ลบเอกสารแล้ว", "Removed")); return; }
    const d = e.target.closest && e.target.closest("[data-rqdec]"); if (d) { const [id, ok] = d.dataset.rqdec.split("|"); rqDecide(id, ok === "1"); return; }
    if (e.target.id === "rqi-save" || e.target.id === "rqi-send") { const form = document.getElementById("rq-inline"), c = form && caseOf(form.dataset.rqcase); if (!c) return; c.rqDraft = rqReadVals();
      if (e.target.id === "rqi-send") rqSubmit(c); else { commit(); toast(L("บันทึกร่างแล้ว", "Draft saved")); } return; }
    const fd = e.target.closest && e.target.closest("[data-rqfd]"); if (fd && document.getElementById("rq-files")) { RQ_FILES.splice(Number(fd.dataset.rqfd), 1); rqRepaint(); }
  });
  const rqRepaint = () => { const box = document.getElementById("rq-files"); if (box) box.innerHTML = rqFilesHtml(); const form = document.getElementById("rq-inline"), c = form && caseOf(form.dataset.rqcase); if (c) { c.rqDraft = rqReadVals(); rqRefreshReady(c); } };
  const addFiles = fl => { Array.from(fl).forEach(x => { if (!RQ_FILES.some(y => y.name === x.name && y.size === x.size)) RQ_FILES.push({ name: x.name, size: x.size, type: x.type || "", kind: /ใบเสนอ|quot/i.test(x.name) ? 1 : /แบบ|plan|draw/i.test(x.name) ? 2 : /tor/i.test(x.name) ? 0 : 5 }); }); rqRepaint(); };
  document.addEventListener("change", e => { const el = e.target; if (!el) return;
    if (el.id === "rq-file") { addFiles(el.files); el.value = ""; return; }
    if (el.matches && el.matches("[data-rqfk]")) { RQ_FILES[Number(el.dataset.rqfk)].kind = Number(el.value); rqRepaint(); return; }
    if (el.closest && el.closest("#rq-inline")) { const form = document.getElementById("rq-inline"), c = caseOf(form.dataset.rqcase); if (c) { c.rqDraft = rqReadVals(); commit(); rqRefreshReady(c); } } });
  document.addEventListener("input", e => { const el = e.target; if (!el || !el.closest || !el.closest("#rq-inline")) return; const form = document.getElementById("rq-inline"), c = caseOf(form.dataset.rqcase); if (!c) return; c.rqDraft = rqReadVals(); rqRefreshReady(c);
    if (el.id === "pr-amt") { const box = document.getElementById("pr-splitbox"), a = Math.round(Number(el.value) * 1e6 / 1e3) * 1e3; if (box) box.style.display = splitRisk(famPlan(c.plan), a).risk ? "" : "none"; } });
  document.addEventListener("dragover", e => { if (e.target.closest && e.target.closest("#rq-drop")) e.preventDefault(); });
  document.addEventListener("drop", e => { if (e.target.closest && e.target.closest("#rq-drop")) { e.preventDefault(); addFiles(e.dataTransfer.files); } });
}

// ---------- relating the parts of the case: choose once and what depends on it follows (asked 12 Nov 2569) ----------
// Relations that are now automatic:
//  - kind of work / special reason  -> the advised method; choosing either puts the method select on the new advice and saves;
//  - the method select, the reason  -> saved as soon as it is chosen or typed (no save button); the reasons it needs are the same rules as before;
//  - the amount typed on the requisition and the reference price -> the advised method (the advice reads the reference price, else the
//    requisition amount, else the plan estimate); while the method still follows the advice (c.methodAuto) and the requisition is
//    not sent yet, a new amount or reference price moves the method, with a notice; a method chosen against the advice stays;
//  - the method -> which TOR, which committees and which e-GP steps are needed (already follows the saved method);
//  - the "basis of the estimate" on the requisition -> the basis ticked when the reference price is first recorded;
//  - the requisition amount -> the first reference price offered (98% of it);
//  - the requisition's delivery days -> the due dates of the phases when the contract is made (days divided by the phases).
// Still typed by hand: the reference price figure, the reason for a method that differs from the advice.
const rqEstimate = c => { const rq = caseReq(c); if (rq) return rq.amount; const a = Math.round(Number((c.rqDraft || {}).amt) * 1e6); return a > 0 ? a : famPlan(c.plan).est; };
const RQ_BASIS_MAP = { "ใบเสนอราคา": "quotes", "ราคาท้องตลาด": "quotes", "ราคาที่เคยซื้อ/จ้างย้อนหลัง": "contract", "ราคามาตรฐานครุภัณฑ์": "std" };
const rqBasisDefault = c => RQ_BASIS_MAP[(c.rqDraft || {}).basis || ((caseReq(c) || {}).detail || {}).basis || ""] || "";
function caseAutoMethod(c) {
  if (caseState(c) !== 1 || c.cancelled || c.methodAuto === false || !c.method) return false;
  const rec = recommendMethod(c); if (!rec.method || rec.method === c.method) return false;
  c.method = rec.method; c.methodWhy = [tx(rec.why), tx(rec.why)]; famPlan(c.plan).method = rec.method; c.methodApproval = { status: "auto", t: nowIso(), by: me().id }; c.methodAuto = true;
  caseLog(c, "method", `${tx(PMETHOD[rec.method])} (${L("ตามวงเงินใหม่", "from the new amount")})`); toast(L(`วิธีจัดหาเปลี่ยนเป็น ${tx(PMETHOD[rec.method])} ตามวงเงินใหม่`, `The method moved to ${tx(PMETHOD[rec.method])} for the new amount`)); return true;
}
document.addEventListener("change", e => {
  const el = e.target; if (!el || !el.closest) return;
  const mf = el.closest("#mt-form");
  if (mf) { const c = caseOf(CASE_OPEN); if (!c) return;
    if (el.id === "mt-kind" || el.id === "mt-special") { const rec = recommendMethod(Object.assign({}, c, { kind: document.getElementById("mt-kind").value, special: document.getElementById("mt-special").value || null })); if (rec.method) document.getElementById("mt-method").value = rec.method; }
    if (mf.requestSubmit) mf.requestSubmit(); return; }
  const rf = el.closest("#ref-form");
  if (rf) { const amount = Math.round(Number(document.getElementById("ref-amt").value)); if (amount > 0 && rf.querySelectorAll('input[name="ref-b"]:checked').length && rf.requestSubmit) rf.requestSubmit(); return; }
  if (el.id === "pr-amt") { const form = document.getElementById("rq-inline"), c = form && caseOf(form.dataset.rqcase); if (c) { c.rqDraft = rqReadVals(); if (caseAutoMethod(c)) { commit(); route(); } } }
});

// ---------- the kind of work follows the method's chain too (asked 12 Nov 2569) ----------
// The method decides which TOR and committees a case needs; the kind of work (goods, services, construction, consulting) now adjusts them as well:
//  - TOR template: a template belongs to a kind; when the kind changes and the attached TOR was made from a template of another kind,
//    it is switched to the latest approved template of the new kind (with a notice); the ready table flags a template of another kind;
//  - committee types: a type can apply to some kinds only, and can need a member with a technical background for some kinds (CM4);
//    the case page shows only the types that apply to its kind, and the committee check asks for the technical member when its type needs one;
//  - the method panel lists, for the kind chosen, which TOR templates and which committee types it brings in.
// The method advice itself already reads the kind: a method rule can be made for one kind (rule field "kind", "any" in the sample rules).
const torKindOf = c => { const t = c.tor && c.tor.tpl ? S.torLib.find(x => x.id === c.tor.tpl) : null; return t ? t.kind : null; };
const torKindBad = c => { const k = torKindOf(c); return !!k && k !== c.kind; };
function caseKindFollow(c) {
  if (!c.tor || !c.tor.tpl || !torKindBad(c)) return false;
  const alt = S.torLib.filter(x => x.kind === c.kind && torLatest(x)).sort((a, b) => a.id.localeCompare(b.id))[0]; if (!alt) return false;
  const v = torLatest(alt); c.tor.tpl = alt.id; c.tor.tplV = v.v; c.tor.doc = `TOR_${c.id}_${alt.id}-v${v.v}.pdf`;
  caseLog(c, "tor", `${c.tor.doc} (${L("ตามชนิดงาน", "from the kind of work")})`); toast(L(`แม่แบบ TOR เปลี่ยนเป็น ${alt.id} ตามชนิดงาน`, `The TOR template moved to ${alt.id} for the kind of work`)); return true;
}
function caseKindEffects(c) {
  const tpls = S.torLib.filter(t => t.kind === c.kind && torLatest(t)).map(t => t.id).join(", "), techs = (S.cmTypes || []).filter(t => !t.retired && cmApplies(t, c.kind) && cmTechKinds(t).includes(c.kind)).map(t => tx(t.name)).join(", "), skipped = (S.cmTypes || []).filter(t => !t.retired && !cmApplies(t, c.kind)).map(t => tx(t.name)).join(", ");
  return `<div class="sub">${L("ชนิดงาน", "Kind of work")} ${tx(KINDS[c.kind])} ${L("มีผลกับ", "affects")}: ${L("แม่แบบ TOR", "TOR templates")} ${tpls || "—"} · ${L("คณะที่ต้องมีผู้มีความรู้ด้านช่าง/วิศวกรรม", "committees that need a technical member")} ${techs || "—"}${skipped ? ` · ${L("ประเภทที่ไม่ใช้กับชนิดงานนี้", "types that do not apply")} ${skipped}` : ""}</div>`;
}
