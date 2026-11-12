// Fisko-KlangFinance, procurement round A (10 Nov 2569): the case page in seven main panels, each with sub-panels.
// The user's table: Plan (prepare the plan, approve the plan) / Prepare the data (project details, method, reference price, TOR,
// committees) / Send to e-GP (the e-GP steps) / Contract / Contract management / Payment / Close the case. This replaces the
// twelve-step ring, the numbered stepper and the four-phase bar. The twelve states stay in the data (many files and the tests
// read them) but are not shown as numbers any more; the page shows the main panels and what each one needs.
// How: the case page is still built by caseDetail (61-cases.js) and by the CASE_PANELS of other files. After it is drawn, the panels
// are moved, by their heading, into the main panel they belong to (handlers stay on the moved nodes). A heading this file does
// not know goes to "other information" under Prepare the data. Panels that only add background (market research, item details,
// price comparison, RFQ letters, bid details, audit dossier) sit in a folded "background" part of their main panel.
// The sub-panels for the plan, contract management, payment and close are read-only summaries built here; the work itself is on
// the contract pages (button "open the contract").
const CASE_MAIN_NAMES = [["กำหนดแผนงาน", "Plan"], ["จัดทำข้อมูล", "Prepare the data"], ["ส่ง e-GP", "Send to e-GP"], ["ทำสัญญา", "Contract"], ["บริหารสัญญา", "Contract management"], ["เบิกจ่าย", "Payment"], ["ปิดแฟ้ม", "Close the case"]];
const CASE_MAIN_WHO = [["กองแผนงาน", "Planning division"], ["สำนัก / กอง", "Division or bureau"], ["เจ้าหน้าที่พัสดุ (กองคลัง)", "Procurement officers (Finance Division)"], ["เจ้าหน้าที่พัสดุ", "Procurement officers"], ["เจ้าหน้าที่พัสดุ", "Procurement officers"], ["เจ้าหน้าที่พัสดุ", "Procurement officers"], ["เจ้าหน้าที่พัสดุ", "Procurement officers"]];
// heading (Thai or English) -> [main, order, folded]
const CASE_SUBS = (() => { const m = {}, add = (th, en, main, ord, fold) => { m[th] = m[en] = [main, ord, !!fold]; };
  add("รายละเอียดโครงการที่ขอซื้อขอจ้าง", "Project details of the requisition", 2, 1); add("แผนจัดซื้อและใบขอซื้อขอจ้าง", "Procurement plan and requisition", 2, 2); add("วิธีจัดซื้อ", "Procurement method", 2, 3);
  add("ราคากลาง", "Reference price", 2, 4); add("TOR", "TOR", 2, 5); add("คณะกรรมการ", "Committees", 2, 6); add("ส่งเอกสารเตรียมให้กองคลัง", "Hand over the prepared papers to Finance", 2, 7);
  add("การสำรวจตลาด", "Market research", 2, 8, 1); add("ข้อมูลเพิ่มเติมของรายการ", "Item details", 2, 9, 1); add("ราคากลาง: เทียบและดัชนีราคา", "Reference price: comparison and indices", 2, 10, 1);
  add("การสรรหาผู้เสนอราคาใน e-GP", "Supplier sourcing in e-GP", 3, 1); add("การสรรหาโดยใบเสนอราคา", "Sourcing by quotations", 3, 1); add("เกณฑ์พิจารณาข้อเสนอ", "Evaluation criteria", 3, 2);
  add("แบบแจ้งผลประโยชน์ทับซ้อน", "Conflict-of-interest declarations", 3, 3); add("ผู้ยื่นและคะแนนพิจารณา", "Bidders and evaluation scores", 3, 4); add("คำถามและคำตอบระหว่างประกาศ", "Questions and answers during the announcement", 3, 5);
  add("การพิจารณาผลและประกาศผู้ชนะ", "Evaluation and award", 3, 6); add("อุทธรณ์", "Appeal", 3, 7); add("ใบสอบถามราคาและหนังสือเชิญ", "RFQ and invitation letters", 3, 8, 1); add("ข้อเสนอของผู้ยื่น: รายละเอียด สิทธิพิเศษ และประวัติ", "Bids: details, preference and history", 3, 9, 1);
  add("รับฟังความคิดเห็น TOR", "Public hearing of the TOR", 3, 1.2); add("หลักประกันการเสนอราคา", "Bid security", 3, 8, 1); add("หลักประกัน แต้มต่อ และอุทธรณ์", "Guarantees, price preference and appeals", 3, 9, 1);
  add("สัญญา", "Contract", 4, 1); add("ชุดเอกสารสำหรับผู้ตรวจสอบ", "Audit dossier", 7, 9, 1); return m; })();
let CASE_MAIN = {}; // the main panel chosen on each case, kept while the page is redrawn

// ---------- what each main panel needs, and which one is current ----------
function caseMainState(c) {
  const n = caseState(c), pl = famPlan(c.plan), con = caseCon(c), ok = (v, th, en) => ({ ok: !!v, label: L(th, en) }), comp = needsCompetition(c);
  const live = con ? con.phases.filter(ph => !ph.cancelled) : [], pays = con ? S.payreqs.filter(p => p.contract === con.id && p.status !== "rejected") : [];
  const allPaid = !!con && live.length > 0 && live.every(ph => pays.some(p => p.phase === ph.n && p.status === "approved"));
  const items = [
    [ok(inPublishedPlan(pl) || n >= 2, "รายการอยู่ในแผนที่ได้รับอนุมัติและประกาศ", "The item is in the approved, published plan")],
    [ok(n >= 3, "ใบขอซื้อได้รับอนุมัติหลักการ", "The requisition is approved in principle"), ...casePrepItems(c), ok(prepSent(c) || prepRecv(c) || n >= 5, "ส่งเอกสารเตรียมให้กองคลัง", "Hand the prepared papers to the Finance Division")],
    [ok(c.method && n >= 4, "วิธีจัดหาได้รับอนุมัติ", "The method is approved"), ok(prepRecv(c) || n >= 5, "พัสดุรับเรื่อง", "Procurement took the case"), ok(comp ? c.egp && c.egp.no : (c.quotes && c.quotes.some(q => q.win)) || n >= 5, comp ? "บันทึกข้อมูล e-GP" : "บันทึกใบเสนอราคา", comp ? "Record the e-GP details" : "Record the quotations"),
      ok(n >= 6 || (!comp && n >= 5), "ปิดรับและบันทึกผู้ยื่น", "Bids closed and recorded"), ok(n >= 8, "ประกาศผู้ชนะและพ้นกำหนดอุทธรณ์", "Winner announced and appeal period over")],
    [ok(n >= 9, "ลงนามสัญญา", "Contract signed")],
    [ok(n >= 10, "ตรวจรับครบทุกงวด", "Every phase accepted"), ok(!con || (typeof handAll !== "function") || handAll(con), "สำนัก/กองส่งมอบต่อให้ อปท./เจ้าของโครงการครบทุกงวด", "Every phase handed on to the local authority / the owner")],
    [ok(pays.length > 0, "เริ่มเบิกจ่าย", "Payment started"), ok(allPaid, "เบิกจ่ายครบทุกงวด", "Every phase paid")],
    [ok(c.close && typeof c.close.score === "number", "ประเมินผู้ค้า", "Supplier rated"), ok(c.close, "ปิดแฟ้ม", "Case closed")]];
  return items;
}
function casePhases(c) {
  const items = caseMainState(c);
  const ph = items.map((it, i) => ({ k: i + 1, items: it, done: i === 1 || i === 6 ? it[it.length - 1].ok : it.every(x => x.ok) }));
  const cur = c.cancelled ? 0 : (ph.find(p => !p.done) || ph[6]).k;
  ph.forEach(p => (p.state = c.cancelled ? "cancel" : p.done ? "done" : p.k === cur ? "now" : "todo"));
  return { phases: ph, cur };
}
const casePhase = c => casePhases(c).cur;
function casePhaseBar(c) {
  const { phases, cur } = casePhases(c), sel = CASE_MAIN[c.id] || cur || 1, st = { done: [L("เสร็จ", "Done"), "p-ok"], now: [L("กำลังทำ", "In progress"), "p-info"], todo: [L("รอ", "Waiting"), "p-mute"], cancel: [L("ยกเลิก", "Cancelled"), "p-mute"] };
  return `<div class="cphases" role="tablist" style="display:flex;gap:6px;flex-wrap:wrap;margin:0 0 12px" aria-label="${L("แผงหลักของแฟ้ม", "Main panels of the case")}">${phases.map(p => `<button type="button" role="tab" class="cphase" data-cphase="${p.k}" data-cstate="${p.state}" aria-selected="${p.k === sel}" style="flex:1 1 118px;text-align:left;cursor:pointer;background:transparent;font:inherit;color:inherit;border:${p.k === sel ? "2px solid var(--info)" : "1px solid var(--line)"};border-radius:10px;padding:8px 10px">
    <div class="row" style="gap:6px;flex-wrap:nowrap"><span class="mono sub">${p.k}</span><b style="font-weight:600">${esc(tx(CASE_MAIN_NAMES[p.k - 1]))}</b></div>
    <div class="sub">${esc(tx(CASE_MAIN_WHO[p.k - 1]))}</div>
    <div style="margin-top:3px">${tag(st[p.state][0], st[p.state][1])} <span class="sub">${p.items.filter(x => x.ok).length}/${p.items.length}</span></div></button>`).join("")}</div>`;
}

// ---------- read-only sub-panels built here ----------
const cmPanel = (main, ord, title, body) => ({ main, ord, el: (() => { const s = document.createElement("section"); s.className = "panel"; s.innerHTML = `<header><h2>${title}</h2></header><div class="body" style="display:flex;flex-direction:column;gap:10px">${body}</div>`; return s; })() });
const cmGoBtn = c => `<div class="row"><button class="btn" type="button" data-cgocon="${c.id}">${L("เปิดสัญญา", "Open the contract")}</button></div>`;
function caseExtraPanels(c) {
  const p = famPlan(c.plan), con = caseCon(c), none = `<span class="sub">${L("ยังไม่มีสัญญา", "No contract yet")}</span>`, V = (S.planDoc && S.planDoc.versions) || [], v = V.slice().reverse().find(x => (x.items || []).some(i => i.id === p.id));
  const out = [];
  // The e-GP process given by the user (10 Nov 2569), set against what this case holds. Steps that this system does not model are marked.
  { const n = caseState(c), pub = planPublished(), comp = needsCompetition(c), tcm = S.cmReg.find(x => x.case === c.id && !x.retired && cmKindOf(x) === "tor"), ord = tcm && cmDocsOf(tcm.id).some(d => d.kind === "order");
    const row = (no, th, en, ok, where, note) => `<tr><td class="mono">${no}</td><td>${L(th, en)}${note ? `<div class="sub">${esc(note)}</div>` : ""}</td><td>${ok === null ? tag(L("ทำนอกระบบนี้", "Outside this system"), "p-mute") : ok ? tag(L("ครบ", "Done"), "p-ok") : tag(L("ยังไม่ครบ", "Open"), "p-warn")}</td><td class="sub">${where}</td></tr>`;
    out.push(cmPanel(3, 0, L("ขั้นตอนใน e-GP", "Steps in e-GP"), `<div class="sub">${L("เทียบกับกระบวนการ e-GP ของกรมบัญชีกลาง เจ้าหน้าที่พัสดุทำจริงใน e-GP แล้วบันทึกผลที่นี่ ขั้นตอนที่ระบบนี้ยังไม่มีข้อมูล ระบุไว้ในหมายเหตุ", "Against the Comptroller General's e-GP process. The officer does the work in e-GP and records the result here. Steps this system does not hold are marked in the notes.")}</div>
      <div class="tbl-wrap"><table><thead><tr><th>#</th><th>${L("ขั้นตอน", "Step")}</th><th>${L("สถานะ", "Status")}</th><th>${L("บันทึกที่", "Recorded in")}</th></tr></thead><tbody>
      ${row(1, "ตั้งสิทธิ์ผู้ใช้ใน e-GP (ผู้ออกแบบรายการ ผู้อนุมัติ ผู้ตรวจสอบ)", "Set up e-GP users and roles (creator, approver, auditor)", null, "e-GP", "")}
      ${row(2, "ลงแผนจัดซื้อจัดจ้างประจำปีและประกาศใน e-GP (ต้องอยู่ในแผนที่ประกาศก่อนจัดหา)", "Record and publish the annual procurement plan in e-GP", inPublishedPlan(p), L("แผงหลักกำหนดแผนงาน", "Plan panel"), pub && pub.published ? `${L("ประกาศเมื่อ", "Published")} ${fdate(pub.published.date)} · ${pub.published.ref || ""}` : "")}
      ${row(3, "บันทึกขออนุมัติจัดซื้อ ราคากลางพร้อมหลักฐานตามเกณฑ์ ป.ป.ช. และแนบคำสั่งคณะกรรมการ", "Record the approval request, the reference price with its evidence, and attach the committee orders", casePrepItems(c).every(x => x.ok) && (!comp || ord), L("แผงหลักจัดทำข้อมูล", "Prepare-the-data panel"), comp && !ord ? L("ยังไม่ได้แนบไฟล์คำสั่งแต่งตั้งคณะ TOR", "The TOR committee's order file is not attached") : "")}
      ${row(4, "เลือกวิธีจัดหาให้ตรงวงเงินและระเบียบ สร้างและประกาศเชิญชวน", "Choose the method to fit the amount and rules, create and publish the invitation", !!(c.method && n >= 4 && c.egp && c.egp.no) && (typeof hearReqNow !== "function" || !hearReqNow(c) || hearingDone(c)), L("แผงย่อยวิธีจัดซื้อ และการสรรหาใน e-GP", "Method and sourcing panels"), `${c.egp && c.egp.no ? c.egp.no + " · " + L("ประกาศ", "announced") + " " + fdate(c.egp.announce) + " · " : ""}${L("รับฟังความคิดเห็น", "hearing")}: ${typeof hearLabel === "function" ? hearLabel(c) : "–"}${L(" · ร่างประกาศและร่างเอกสารซื้อจ้างให้ผู้มีอำนาจอนุมัติเผยแพร่: ระบบนี้ยังไม่มีข้อมูล", " · the draft notice and RFP for the approver to release: not held in this system")}`)}
      ${row(5, "ผู้ประกอบการยื่นข้อเสนอ ปิดรับซอง และคณะกรรมการเปิดซอง", "Bidders submit, the envelopes close, the committee opens them", n >= 6 || (!comp && n >= 5), L("การสรรหาใน e-GP · ผู้ยื่นและคะแนน", "Sourcing and bidder panels"), c.egp && c.egp.bidders != null ? `${L("ปิดรับ", "Closed")} ${fdate(c.egp.close)} · ${c.egp.bidders} ${L("ราย", "bidders")}` : "")}
      ${row(6, "พิจารณาผล บันทึกผลและผู้ชนะ (รวมผู้ไม่ผ่านคุณสมบัติและการต่อรองราคา) ประกาศผู้ชนะ รอพ้นอุทธรณ์", "Evaluate, record the winner (with disqualified bidders and any price negotiation), announce, wait out the appeal", n >= 8 && !!c.award && (typeof negoNeeded !== "function" || !negoNeeded(c) || negoDone(c)), L("การพิจารณาผลและประกาศผู้ชนะ · อุทธรณ์", "Evaluation, award and appeal panels"), `${c.award ? tx(c.award.winner) + " · " + fmt(c.award.price) + " " + L("บาท", "baht") + " · " : ""}${L("ต่อรองราคา", "negotiation")}: ${typeof negoLabel === "function" ? negoLabel(c) : "–"}${L(" · รายชื่อผู้ไม่ผ่านคุณสมบัติ: ระบบนี้ยังไม่มีข้อมูล", " · disqualified bidders: not held in this system")}`)}
      ${row(7, "ทำสัญญา บันทึกส่งมอบ ตรวจรับ และเบิกจ่ายตามงวดเพื่อปิดโครงการ", "Contract, delivery, acceptance and payment by phase, to close the project", n >= 12, L("แผงหลักทำสัญญา ถึง ปิดแฟ้ม", "Contract to Close panels"), "")}
      </tbody></table></div>`));
  }
  { const r = typeof rqCasePanel === "function" ? rqCasePanel(c) : null; if (r) out.push(cmPanel(2, 0, r.title, r.body)); }
  { const r2 = typeof rqReadyPanel === "function" ? rqReadyPanel(c) : null; if (r2) out.push(cmPanel(2, 50, r2.title, r2.body)); } // "ready to send?" at the bottom of Prepare the data // the requisition form (file 98ze)
  { const r4 = typeof varPanel === "function" ? varPanel(c) : null; if (r4) out.push(cmPanel(4, 3, r4.title, r4.body)); } // extend the contract / change the amount (file 98zg)
  { const r3 = typeof egpStatusPanel === "function" ? egpStatusPanel(c) : null; if (r3) out.push(cmPanel(3, 1.5, r3.title, r3.body)); } // hearing and negotiation status (file 98zf)
  out.push(cmPanel(1, 1, L("จัดทำแผนงาน", "Prepare the plan"), `<div class="facts"><span class="fact">${svgI("file")}${L("รายการแผน", "Plan item")} <b class="mono">${esc(p.id)}</b></span><span class="fact">${svgI("tag")}${L("รหัสโครงการ", "Project ID")} <b class="mono">${esc(p.pid || "—")}</b></span><span class="fact">${svgI("coins")}<b>${mb(p.est)}</b> ${L("ลบ.", "M")}</span><span class="fact">${svgI("building")}${esc(lineLabel(famLine(p.line)))}</span></div>
    <div>${esc(tx(p.name))} · ${tx(PMETHOD[p.method] || ["", ""])} · ${L("เดือนที่ดำเนินการ", "Month")} ${esc(p.month || "–")}</div><div class="sub">${L("จัดทำโดย", "Prepared by")} ${esc(userName(p.by))} · ${planStat(p)}</div>`));
  out.push(cmPanel(1, 2, L("อนุมัติแผนงาน", "Approve the plan"), v ? `<div>${L("แผนฉบับที่", "Plan version")} <b>${v.v}</b> · ${tag(v.status === "approved" ? L("อนุมัติแล้ว", "Approved") : v.status === "rejected" ? L("ไม่อนุมัติ", "Rejected") : L("รออนุมัติ", "Waiting"), v.status === "approved" ? "p-ok" : v.status === "rejected" ? "p-bad" : "p-warn")}</div>
    <div class="sub">${L("เสนอโดย", "Proposed by")} ${esc(userName(v.by))} · ${fdate(v.t, true)}${v.why ? " · " + esc(v.why) : ""}</div>${v.appr ? `<div class="sub">${L("พิจารณาโดย", "Decided by")} ${esc(userName(v.appr.by))} · ${fdate(v.appr.t, true)}</div>` : ""}${v.published ? `<div class="sub">${L("ประกาศแผนเมื่อ", "Published")} ${fdate(v.published.date)} · ${esc(v.published.ref || "–")}</div>` : `<div class="sub">${L("ยังไม่ได้ประกาศแผน", "Not published yet")}</div>`}` : `<span class="sub">${L("ยังไม่ได้เสนอแผนที่มีรายการนี้", "The item is not in a submitted plan yet")}</span>`));
  out.push(cmPanel(4, 2, L("หลักประกันและการแก้ไขสัญญา", "Guarantee and contract changes"), con ? `<div>${con.guarantee ? `${L("หลักประกัน", "Guarantee")}: ${fmt(con.guarantee.amount)} ${L("บาท", "baht")} · ${L("หมดอายุ", "expires")} ${fdate(con.guarantee.expires)}` : `<span class="sub">${L("ยังไม่ได้บันทึกหลักประกัน", "No guarantee recorded")}</span>`}</div>
    <div>${L("ฉบับที่", "Version")} ${con.ver || 1} · ${L("วงเงินสัญญา", "Amount")} ${fmt(con.amount)} ${L("บาท", "baht")}${(con.vars || []).length ? ` · ${(con.vars || []).length} ${L("รายการแก้ไข", "changes")}` : ""}</div>${cmGoBtn(c)}` : none));
  out.push(cmPanel(5, 1, L("ส่งมอบและตรวจรับ", "Delivery and acceptance"), con ? `<div class="tbl-wrap"><table><thead><tr><th>${L("งวด", "Phase")}</th><th>${L("กำหนดส่งมอบ", "Due")}</th><th>${L("ส่งมอบ", "Delivered")}</th><th>${L("ตรวจรับ", "Accepted")}</th></tr></thead><tbody>${con.phases.map(ph => `<tr><td>${tx(ph.name)}</td><td>${fdate(ph.due)}</td><td>${ph.delivered ? fdate(ph.delivered) : "—"}</td><td>${ph.cancelled ? tag(L("ยกเลิก", "Cancelled"), "p-mute") : phaseAccepted(ph) ? tag(L("ตรวจรับแล้ว", "Accepted"), "p-ok") : `<span class="sub">${ph.signs.length} ${L("ลายมือชื่อ", "signatures")}</span>`}</td></tr>`).join("")}</tbody></table></div>${cmGoBtn(c)}` : none));
  { const hp = typeof handPanel === "function" ? handPanel(c) : null; if (hp) out.push(cmPanel(5, 1.5, hp.title, hp.body)); } // delivery chain: received, handed on (file 98zi)
  out.push(cmPanel(5, 2, L("คณะกรรมการตรวจรับ", "Acceptance committee"), con ? `<div>${cmNames(con) || "—"}</div>${cmGoBtn(c)}` : none));
  out.push(cmPanel(6, 1, L("เบิกจ่ายตามงวด", "Payment by phase"), con ? `<div class="tbl-wrap"><table><thead><tr><th>${L("งวด", "Phase")}</th><th class="n">${L("วงเงิน (ลบ.)", "Amount (M)")}</th><th>${L("ใบแจ้งหนี้", "Invoice")}</th><th>${L("เบิกจ่าย", "Payment")}</th></tr></thead><tbody>${con.phases.filter(ph => !ph.cancelled).map(ph => { const pay = S.payreqs.find(x => x.contract === con.id && x.phase === ph.n && x.status !== "rejected");
      return `<tr><td>${tx(ph.name)}</td><td class="n">${mb(ph.amount)}</td><td>${ph.invoice ? `<span class="mono sub">${esc(ph.invoice.no)}</span>` : "—"}</td><td>${pay ? `<span class="mono sub">${pay.id}</span>${pay.batch ? ` <span class="sub">· ${L("เบิกรวมกับงวดอื่นในใบขอเบิก", "paid with other phases in")} ${pay.batch}</span>` : ""} ${tag(pay.status === "approved" ? L("อนุมัติแล้ว", "Approved") : L("รออนุมัติ", "Pending"), pay.status === "approved" ? "p-ok" : "p-warn")}` : "—"}</td></tr>`; }).join("")}</tbody></table></div>${cmGoBtn(c)}` : none));
  out.push(cmPanel(7, 1, L("ประเมินผู้ค้า", "Supplier rating"), c.close && typeof c.close.score === "number" ? `<div>${L("คะแนน", "Score")} <b>${c.close.score}</b></div>${c.close.lessons ? `<div class="sub">${esc(c.close.lessons)}</div>` : ""}` : `<span class="sub">${c.close ? L("ไม่ประเมิน (ปิดก่อนวันเริ่มใช้)", "Not rated (closed before the start date)") : L("ยังไม่ได้ประเมินผู้ค้า", "The supplier has not been rated")}</span><div class="sub">${L("ประเมินผู้ค้าบังคับตั้งแต่", "Supplier rating is required from")} ${fdate(vendorRateFrom())}</div>`));
  out.push(cmPanel(7, 2, L("ปิดโครงการ", "Close the project"), c.close ? `<div>${tag(L("ปิดแฟ้มแล้ว", "Closed"), "p-ok")} ${fdate(c.close.t, true)} · ${esc(userName(c.close.by))}</div>` : `<span class="sub">${L("ยังไม่ปิดแฟ้ม", "Not closed yet")}</span>`));
  return out;
}

// ---------- move the drawn panels into the main panels ----------
function caseRegroup(c) {
  const bar = document.querySelector(".cphases"), grid = document.querySelector(".case-grid"), main = grid && grid.querySelector(".case-main"); if (!bar || !main || main.dataset.grouped) return;
  const holder = bar.parentElement, cands = [...holder.children].filter(el => el !== bar && el !== grid && el.matches("section.panel,div.panel") && !el.querySelector(".case-hero")).concat([...main.children]);
  const first = el => (el.querySelector("h2") || {}).textContent ? el.querySelector("h2").textContent.trim() : "";
  const groups = Array.from({ length: 7 }, () => ({ show: [], fold: [] }));
  cands.forEach(el => { const t = first(el), hit = CASE_SUBS[t] || (t.startsWith("ข้อมูลตัวอย่างขั้น") ? null : [2, 99, true]); if (!hit) { el.remove(); return; } (hit[2] ? groups[hit[0] - 1].fold : groups[hit[0] - 1].show).push([hit[1], el]); });
  caseExtraPanels(c).forEach(x => groups[x.main - 1].show.push([x.ord, x.el]));
  main.innerHTML = ""; main.dataset.grouped = "1";
  const { cur } = casePhases(c), sel = CASE_MAIN[c.id] || cur || 1;
  groups.forEach((g, i) => { const box = document.createElement("div"); box.className = "cmain"; box.dataset.cmain = String(i + 1); if (i + 1 !== sel) box.hidden = true;
    g.show.sort((a, b) => a[0] - b[0]).forEach(([, el]) => box.appendChild(el));
    if (g.fold.length) { const d = document.createElement("details"); d.className = "cfold"; d.innerHTML = `<summary class="sub" style="cursor:pointer;margin:6px 0">${L("ข้อมูลประกอบ", "Background information")} (${g.fold.length})</summary>`; g.fold.sort((a, b) => a[0] - b[0]).forEach(([, el]) => d.appendChild(el)); box.appendChild(d); }
    if (!g.show.length && !g.fold.length) box.innerHTML = `<div class="sub">${L("ไม่มีรายการในส่วนนี้", "Nothing in this part")}</div>`;
    main.appendChild(box); });
  document.querySelectorAll(".cphase").forEach(b => (b.onclick = () => { CASE_MAIN[c.id] = Number(b.dataset.cphase); document.querySelectorAll(".cphase").forEach(x => { const on = x === b; x.setAttribute("aria-selected", String(on)); x.style.border = on ? "2px solid var(--info)" : "1px solid var(--line)"; }); document.querySelectorAll(".cmain").forEach(m => (m.hidden = m.dataset.cmain !== String(CASE_MAIN[c.id]))); }));
  const amt = document.getElementById("pr-amt"); if (amt) amt.dispatchEvent(new Event("input", { bubbles: true })); // shows the split-purchase box when it applies
  document.querySelectorAll("[data-cgocon]").forEach(b => (b.onclick = () => { PROC_TAB = "contracts"; route(); }));
}
{ const base = bindCases; bindCases = () => { base(); const c = CASE_OPEN && caseOf(CASE_OPEN); if (c) caseRegroup(c); }; }
