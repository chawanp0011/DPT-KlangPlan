// KlangFinance, 13 Nov 2569: "Send to e-GP" with an update for every e-GP step. (16 Nov 2569: EVERY listed item has its own Update control, see below.)
// The officer runs the procurement in e-GP; this panel shows, for each of the seven e-GP steps, WHAT HAS TO BE UPDATED here (the items the system holds or
// needs, ticked or marked red) and lets the officer update it at any time, not only at one internal step. Data goes in c.egpUp[step] = { ..fields, by, t };
// steps 4 and 5 also write the e-GP project number, dates and bidders into c.egp (as the old forms did); steps 3 and 6 are compared with what the case holds.
Object.assign(CASE_EV, { egpup: ["อัปเดตขั้นตอนใน e-GP", "Updated an e-GP step"] });
const egpUpOf = (c, k) => (c.egpUp && c.egpUp[k]) || null;
// 16 Nov 2569: every listed item can be updated. An item that is a field of the step form (the e-GP number, a date, the bidders, the winner...) opens that
// form at its field. Every other item (the ones this system works out from other panels, such as "the requisition is approved" or "the TOR is attached")
// takes a confirmation of the officer: done or not done, a date, a reference and a note, kept in c.egpItems[step][key] and shown with the tag "recorded by hand";
// it overrides the status worked out by the system until it is cleared (the other panels are NOT changed by it).
const EGP_ITEM_FIELD = { "บันทึกว่าตั้งสิทธิ์ใน e-GP แล้ว": "date", "ลงเลขที่ประกาศแผนใน e-GP": "no", "ลงราคากลางและวันขออนุมัติใน e-GP": "price", "เลขที่โครงการ e-GP": "no", "วันที่ประกาศเชิญชวน": "announce", "วันสุดท้ายยื่นข้อเสนอ": "close", "ผู้มีอำนาจอนุมัติเผยแพร่ร่างประกาศและเอกสารซื้อจ้าง": "release", "จำนวนผู้ยื่นข้อเสนอ": "bidders", "วันที่เปิดซอง": "opened", "บันทึกผู้ชนะและรายชื่อผู้ไม่ผ่านคุณสมบัติใน e-GP": "winner" };
const egpItemRec = (c, k, key) => ((c.egpItems || {})[k] || {})[key] || null; // kept apart from c.egpUp[step] (the step form), which other code reads as 'the step has been recorded'
const egpUpCan = c => isProcRole() && !c.cancelled && !c.close;
function egpUpSteps(c) {
  const L = (th, en) => Object.assign(new String(LANG === "en" ? en : th), { th }); // the label is a string with its Thai text kept as the key of the item
  const p = famPlan(c.plan), con = caseCon(c), n = caseState(c), comp = needsCompetition(c), rq = caseReq(c), pub = planPublished(), g = k => egpUpOf(c, k);
  const tcm = S.cmReg.find(x => x.case === c.id && !x.retired && cmKindOf(x) === "tor"), ord = !!(tcm && cmDocsOf(tcm.id).some(d => d.kind === "order"));
  const it = (l, ok, v) => ({ l: String(l), key: (l && l.th) || String(l), ok: !!ok, v: v == null ? "" : String(v) });
  const live = con ? con.phases.filter(ph => !ph.cancelled) : [];
  const a3 = g("s3"), a6 = g("s6"), eg = c.egp || {};
  return [
    { k: "s1", n: 1, th: "ตั้งสิทธิ์ผู้ใช้ใน e-GP (ผู้ออกแบบรายการ ผู้อนุมัติ ผู้ตรวจสอบ)", en: "Set up e-GP users and roles (creator, approver, auditor)",
      items: [it(L("บันทึกว่าตั้งสิทธิ์ใน e-GP แล้ว", "Roles are set up in e-GP"), g("s1"), g("s1") ? `${fdate(g("s1").date)} · ${g("s1").who}` : "")], auto: true,
      fields: [["date", "date", "วันที่ตั้งสิทธิ์", "Date set up", true], ["who", "text", "ชื่อผู้ออกแบบรายการ / ผู้อนุมัติ / ผู้ตรวจสอบ", "Names: creator / approver / auditor", true]] },
    { k: "s2", n: 2, th: "ลงแผนจัดซื้อจัดจ้างประจำปีและประกาศใน e-GP", en: "Record and publish the annual procurement plan in e-GP",
      items: [it(L("รายการอยู่ในแผนที่อนุมัติ", "The item is in the approved plan"), inPublishedPlan(p) || n >= 2), it(L("ประกาศแผนแล้ว", "The plan is published"), pub && pub.published, pub && pub.published ? `${fdate(pub.published.date)} · ${pub.published.ref || ""}` : ""), it(L("ลงเลขที่ประกาศแผนใน e-GP", "The e-GP plan notice number is recorded"), g("s2"), g("s2") ? g("s2").no : "")], need: [2],
      fields: [["no", "text", "เลขที่ประกาศแผนใน e-GP", "e-GP plan notice no.", true], ["date", "date", "วันที่ประกาศ", "Published on", true]] },
    { k: "s3", n: 3, th: "บันทึกขออนุมัติจัดซื้อ ราคากลางพร้อมหลักฐาน และคำสั่งคณะกรรมการ", en: "Approval request, reference price with evidence, committee orders",
      items: [it(L("ใบขอซื้อได้รับอนุมัติ", "The requisition is approved"), rq && (rq.status === "approved" || rq.status === "contracted") || n >= 3), it(L("ราคากลางในระบบ", "Reference price in this system"), c.ref, c.ref ? fmt(c.ref.amount) + " " + L("บาท", "baht") : ""), it(L("หลักฐานราคากลาง (แหล่งอ้างอิง)", "Reference price evidence"), c.ref && c.ref.basis && c.ref.basis.length, c.ref && c.ref.basis ? c.ref.basis.length + " " + L("แหล่ง", "sources") : ""),
        ...(comp ? [it(L("แนบ TOR", "TOR attached"), c.tor, c.tor ? c.tor.doc : ""), it(L("แนบไฟล์คำสั่งแต่งตั้งคณะ TOR", "The TOR committee's order file is attached"), ord)] : []),
        it(L("ลงราคากลางและวันขออนุมัติใน e-GP", "Reference price and request date recorded in e-GP"), a3, a3 ? `${fmt(a3.price)} · ${fdate(a3.date)}${c.ref && Math.round(a3.price) !== Math.round(c.ref.amount) ? " · ⚠ " + L("ต่างจากราคากลางในระบบ", "differs from this system") : ""}` : "")],
      fields: [["price", "number", "ราคากลางที่ลงใน e-GP (บาท)", "Reference price in e-GP (baht)", true, c.ref ? c.ref.amount : ""], ["date", "date", "วันที่ขออนุมัติจัดซื้อ", "Approval request date", true]] },
    { k: "s4", n: 4, th: "เลือกวิธีจัดหา สร้างและประกาศเชิญชวน (รับฟังความคิดเห็นถ้ามี)", en: "Choose the method, create and publish the invitation (hearing if any)",
      items: [it(L("วิธีจัดหาได้รับอนุมัติ", "The method is approved"), c.method && (!c.methodApproval || ["approved", "auto"].includes(c.methodApproval.status)) && n >= 4, c.method ? tx(PMETHOD[c.method]) : ""), it(L("เลขที่โครงการ e-GP", "e-GP project number"), eg.no, eg.no || ""), it(L("วันที่ประกาศเชิญชวน", "Invitation published on"), eg.announce, eg.announce ? fdate(eg.announce) : ""), it(L("วันสุดท้ายยื่นข้อเสนอ", "Last day for bids"), eg.close, eg.close ? fdate(eg.close) : ""),
        ...(typeof hearReqNow === "function" && hearReqNow(c) ? [it(L("รับฟังความคิดเห็นร่าง TOR ใน e-GP", "Public hearing of the draft TOR in e-GP"), hearingDone(c), typeof hearLabel === "function" ? hearLabel(c) : "")] : []),
        it(L("ผู้มีอำนาจอนุมัติเผยแพร่ร่างประกาศและเอกสารซื้อจ้าง", "The approver released the notice and RFP"), g("s4") && g("s4").release, g("s4") && g("s4").release ? fdate(g("s4").release) : "")],
      fields: [["no", "text", "เลขที่โครงการ e-GP", "e-GP project number", true, eg.no || ""], ["announce", "date", "วันที่ประกาศเชิญชวน", "Invitation published on", true, eg.announce || ""], ["close", "date", "วันสุดท้ายยื่นข้อเสนอ", "Last day for bids", true, eg.close || ""], ["release", "date", "วันที่ผู้มีอำนาจอนุมัติเผยแพร่", "Date the approver released it", true, ""]] },
    { k: "s5", n: 5, th: "ผู้ประกอบการยื่นข้อเสนอ ปิดรับซอง และคณะกรรมการเปิดซอง", en: "Bidders submit, the envelopes close, the committee opens them",
      items: [it(L("ถึงวันปิดรับข้อเสนอ", "The closing date has come"), eg.close && (c.closeElapsed || eg.close <= TODAY || n >= 6), eg.close ? fdate(eg.close) : ""), it(L("จำนวนผู้ยื่นข้อเสนอ", "Number of bidders"), eg.bidders != null, eg.bidders != null ? String(eg.bidders) : ""), it(L("วันที่เปิดซอง", "Envelopes opened on"), g("s5") && g("s5").opened, g("s5") && g("s5").opened ? fdate(g("s5").opened) : ""), it(L("แต่งตั้งคณะกรรมการพิจารณาผล", "The evaluation committee is appointed"), n >= 6 || (c.committees && c.committees.eval))],
      fields: [["bidders", "number", "จำนวนผู้ยื่นข้อเสนอ", "Number of bidders", true, eg.bidders != null ? eg.bidders : ""], ["opened", "date", "วันที่เปิดซอง", "Envelopes opened on", true, ""]] },
    { k: "s6", n: 6, th: "พิจารณาผล บันทึกผู้ชนะ (รวมผู้ไม่ผ่านคุณสมบัติและการต่อรองราคา) ประกาศผู้ชนะ รอพ้นอุทธรณ์", en: "Evaluate, record the winner (with disqualified bidders and negotiation), announce, wait out the appeal",
      items: [it(L("ผู้ชนะและราคาที่ตกลงในระบบ", "Winner and price in this system"), c.award, c.award ? `${tx(c.award.winner)} · ${fmt(c.award.price)}` : ""), ...(typeof negoNeeded === "function" && negoNeeded(c) ? [it(L("ต่อรองราคาใน e-GP", "Price negotiation in e-GP"), negoDone(c), typeof negoLabel === "function" ? negoLabel(c) : "")] : []),
        it(L("บันทึกผู้ชนะและรายชื่อผู้ไม่ผ่านคุณสมบัติใน e-GP", "Winner and disqualified bidders recorded in e-GP"), a6, a6 ? `${a6.winner} · ${fmt(a6.price)} · ${fdate(a6.date)}${c.award && (Math.round(a6.price) !== Math.round(c.award.price) || a6.winner.trim() !== tx(c.award.winner).trim()) ? " · ⚠ " + L("ต่างจากผลในระบบ", "differs from this system") : ""}` : ""), it(L("พ้นกำหนดอุทธรณ์", "The appeal period is over"), c.appealElapsed || n >= 8, c.award && c.award.appealEnd ? fdate(c.award.appealEnd) : "")],
      fields: [["winner", "text", "ผู้ชนะ", "Winner", true, c.award ? tx(c.award.winner) : ""], ["price", "number", "ราคาที่ตกลง (บาท)", "Agreed price (baht)", true, c.award ? c.award.price : ""], ["date", "date", "วันที่ประกาศผู้ชนะใน e-GP", "Announced in e-GP on", true, c.award ? c.award.date : ""], ["disq", "text", "ผู้ไม่ผ่านคุณสมบัติ (ถ้ามี)", "Disqualified bidders (if any)", false, ""]] },
    { k: "s7", n: 7, th: "ทำสัญญา ส่งมอบ ตรวจรับ เบิกจ่ายตามงวด และปิดโครงการ", en: "Contract, delivery, acceptance, payment by phase, close",
      items: [it(L("ลงนามสัญญา", "Contract signed"), con, con ? con.id : ""), it(L("ส่งมอบและตรวจรับครบทุกงวด", "Every phase delivered and accepted"), con && live.length && live.every(ph => phaseAccepted(ph))), it(L("เบิกจ่ายครบทุกงวด", "Every phase paid"), con && live.length && live.every(ph => phPaid(con, ph))), it(L("ปิดการจัดซื้อ", "Case closed"), c.close)], auto: true, link: true }
  ];
}
const egpUpDone = (c, s) => s.items.every(x => x.ok);
function egpUpSteps2(c) { return egpUpSteps(c).map(s => { s.items.forEach(x => { x.auto = x.ok; x.field = EGP_ITEM_FIELD[x.key] || ""; const r = egpItemRec(c, s.k, x.key); if (r) { x.manual = r; x.ok = !!r.done; } }); return s; }); }
const egpUpMark = ok => ok ? "✓" : '<span style="color:var(--bad)">✗</span>';
function egpUpdatePanel(c) {
  const steps = egpUpSteps2(c), can = egpUpCan(c), open = steps.filter(s => !s.link && !egpUpDone(c, s)); // step 7 is followed in the later panels, not updated here
  const form = s => { const rec = egpUpOf(c, s.k) || {}; return `<details data-egpdet="${s.k}" style="margin-top:6px"><summary style="cursor:pointer" class="sub">${L("อัปเดตขั้นนี้", "Update this step")}</summary><form class="inline-form" data-egpup="${c.id}|${s.k}" style="margin-top:6px">
    ${s.fields.map(([f, type, th, en, req, dv]) => `<div class="f" style="flex:${type === "text" ? "2 1 220px" : "0 1 170px"}"><label>${L(th, en)}</label><input name="${f}" type="${type}" ${type === "number" ? 'min="0" step="any"' : ""} ${type === "date" ? 'max="' + (s.k === "s4" && f !== "release" ? "2099-12-31" : TODAY) + '"' : ""} value="${esc(String(rec[f] != null && rec[f] !== "" ? rec[f] : dv != null ? dv : ""))}" ${req ? "required" : ""}></div>`).join("")}
    <div class="f" style="flex:2 1 200px"><label>${L("หมายเหตุ", "Note")}</label><input name="note" type="text" value="${esc(rec.note || "")}"></div><button class="btn primary" type="submit">${L("บันทึก", "Save")}</button></form></details>`; };
  const itemRow = (s, x) => { const m = x.manual, k = encodeURIComponent(x.key);
    const ctl = !can ? "" : x.field ? `<button class="btn ghost" type="button" data-egpfield="${c.id}|${s.k}|${x.field}" style="padding:2px 8px">${L("อัปเดต", "Update")}</button>`
      : `<details style="display:inline-block;vertical-align:top;margin-left:6px"><summary style="cursor:pointer" class="sub">${L("อัปเดต", "Update")}</summary><form class="inline-form" data-egpitem="${c.id}|${s.k}|${k}" style="margin-top:6px;flex-wrap:wrap">
        <label class="radio"><input type="radio" name="done" value="1" ${!m || m.done ? "checked" : ""}> ${L("ดำเนินการแล้ว", "Done")}</label><label class="radio"><input type="radio" name="done" value="0" ${m && !m.done ? "checked" : ""}> ${L("ยังไม่ดำเนินการ", "Not done")}</label>
        <div class="f" style="flex:0 1 160px"><label>${L("วันที่", "Date")}</label><input name="date" type="date" max="${TODAY}" value="${esc((m && m.date) || "")}"></div><div class="f" style="flex:1 1 180px"><label>${L("เลขที่อ้างอิงหรือผู้ยืนยัน", "Reference or who confirmed")}</label><input name="ref" type="text" value="${esc((m && m.ref) || "")}"></div>
        <div class="f" style="flex:2 1 200px"><label>${L("หมายเหตุ", "Note")}</label><input name="note" type="text" value="${esc((m && m.note) || "")}"></div><button class="btn primary" type="submit">${L("บันทึก", "Save")}</button>${m ? `<button class="btn ghost" type="button" data-egpclear="${c.id}|${s.k}|${k}">${L("ล้างที่บันทึกด้วยมือ", "Clear the manual record")}</button>` : ""}</form></details>`;
    return `<li>${egpUpMark(x.ok)} ${esc(x.l)}${x.v ? ` <span class="sub">· ${esc(x.v)}</span>` : ""}${m ? ` ${tag(L("บันทึกด้วยมือ", "recorded by hand"), "p-info")} <span class="sub">${m.date ? fdate(m.date) + " · " : ""}${esc(m.ref || "")}${m.note ? " · " + esc(m.note) : ""} · ${esc(userName(m.by))}</span>` : ""} ${ctl}</li>`; };
  const row = s => { const done = egpUpDone(c, s), rec = egpUpOf(c, s.k);
    return `<tr><td class="mono">${s.n}</td><td><b style="font-weight:600">${L(s.th, s.en)}</b>
      <ul style="list-style:none;margin:6px 0 0;padding:0">${s.items.map(x => itemRow(s, x)).join("")}</ul>
      ${rec ? `<div class="sub">${L("อัปเดตล่าสุด", "Last updated")} ${fdate(rec.t, true)} · ${esc(userName(rec.by))}${rec.note ? " · " + esc(rec.note) : ""}</div>` : ""}
      ${s.fields && can ? form(s) : ""}${s.link ? `<div class="row" style="margin-top:6px"><button class="btn" type="button" data-egpgo="4">${L("ไปแผงทำสัญญา", "Go to Contract")}</button><button class="btn" type="button" data-egpgo="5">${L("บริหารสัญญา", "Contract management")}</button><button class="btn" type="button" data-egpgo="6">${L("เบิกจ่าย", "Payment")}</button></div>` : ""}</td>
      <td>${done ? tag(L("ครบ", "Done"), "p-ok") : s.link ? tag(L("ติดตามในแผงถัดไป", "Followed in the next panels"), "p-mute") : tag(L("ต้องอัปเดต", "To update"), "p-warn")}</td></tr>`; };
  return { title: L("ขั้นตอนใน e-GP และสิ่งที่ต้องอัปเดต", "Steps in e-GP and what to update"), body: `<div class="sub">${L("เจ้าหน้าที่พัสดุทำงานจริงใน e-GP แล้วอัปเดตผลของแต่ละขั้นที่นี่ได้ตลอด ✓ คือมีข้อมูลแล้ว ✗ คือยังต้องอัปเดต กดอัปเดตขั้นนี้เพื่อกรอก", "The officer works in e-GP and updates each step here at any time. ✓ means the data is there, ✗ means it still has to be updated. Press Update this step to fill it in.")}</div>
    <div class="row">${open.length ? tag(`${L("ต้องอัปเดต", "To update")} ${open.length} ${L("จาก 6 ขั้น", "of 6 steps")}: ${open.map(s => s.n).join(", ")}`, "p-warn") : tag(L("อัปเดตครบทั้ง 6 ขั้น", "All 6 steps are up to date"), "p-ok")}${can ? "" : `<span class="sub">${L("เจ้าหน้าที่พัสดุเป็นผู้อัปเดต", "Procurement officers update this")}</span>`}</div>
    <div class="tbl-wrap"><table><thead><tr><th>#</th><th>${L("ขั้นตอนและสิ่งที่ต้องอัปเดต", "Step and what to update")}</th><th>${L("สถานะ", "Status")}</th></tr></thead><tbody>${steps.map(row).join("")}</tbody></table></div>` };
}
document.addEventListener("submit", e => {
  const f = e.target; if (!f || !f.matches || !f.matches("[data-egpup]")) return; e.preventDefault();
  const [cid, k] = f.dataset.egpup.split("|"), c = caseOf(cid); if (!c || !egpUpCan(c)) return;
  const fd = new FormData(f), g = x => String(fd.get(x) == null ? "" : fd.get(x)).trim(), step = egpUpSteps(c).find(s => s.k === k); if (!step) return;
  const bad = m => { toast(m); }, rec = { note: g("note") };
  for (const [fld, type, th, en, req] of step.fields) { const v = g(fld); if (req && !v) return bad(L(`กรอก: ${th}`, `Fill in: ${en}`)); if (type === "number" && v) { if (!(Number(v) >= 0)) return bad(L(`ตัวเลขไม่ถูกต้อง: ${th}`, `Invalid number: ${en}`)); rec[fld] = Number(v); } else rec[fld] = v; if (type === "date" && v && v > TODAY && !(k === "s4" && fld !== "release")) return bad(L(`${th} ต้องไม่เกินวันนี้`, `${en} can't be after today`)); }
  if (k === "s1" || k === "s2" || k === "s3") { /* plain records */ }
  if (k === "s3" && !(rec.price > 0)) return bad(L("ราคากลางต้องมากกว่า 0", "The reference price must be above 0"));
  if (k === "s4") { if (rec.close < rec.announce) return bad(L("วันปิดรับต้องไม่ก่อนวันประกาศ", "The closing date can't be before the announcement")); if (rec.release > rec.announce) return bad(L("วันเผยแพร่ต้องไม่หลังวันประกาศเชิญชวน", "The release can't be after the invitation date"));
    if (typeof prepRecv === "function" && caseState(c) < 4 && !prepRecv(c)) return bad(L("รอสำนัก/กองส่งเอกสารเตรียม และพัสดุรับเรื่องก่อน", "Wait for the division to hand over and for procurement to take the case"));
    c.egp = Object.assign(c.egp || {}, { no: rec.no, announce: rec.announce, close: rec.close, stage: (c.egp && c.egp.stage) || ["ประกาศเชิญชวน", "Invitation"], date: rec.announce, bidders: c.egp ? c.egp.bidders : null }); famPlan(c.plan).egp = { no: rec.no, stage: c.egp.stage, date: rec.announce }; }
  if (k === "s5") { if (!c.egp || !c.egp.close) return bad(L("บันทึกขั้น 4 (ประกาศเชิญชวน) ก่อน", "Update step 4 (the invitation) first")); if (rec.opened < c.egp.close) return bad(L("วันเปิดซองต้องไม่ก่อนวันสุดท้ายยื่นข้อเสนอ", "Opening can't be before the closing date")); if (!Number.isInteger(rec.bidders)) return bad(L("จำนวนผู้ยื่นต้องเป็นจำนวนเต็ม", "The number of bidders must be a whole number"));
    if (rec.bidders >= 1) c.egp.bidders = rec.bidders; else toast(L("ไม่มีผู้ยื่น: บันทึกไว้แล้ว ให้ใช้ปุ่มล้มเหลวดำเนินการใหม่ของรายการจัดซื้อ", "No bidders: recorded; use the case's Failed, rerun")); }
  if (k === "s6" && !(rec.price > 0)) return bad(L("ราคาต้องมากกว่า 0", "The price must be above 0"));
  rec.by = me().id; rec.t = nowIso(); c.egpUp = c.egpUp || {}; c.egpUp[k] = rec;
  caseLog(c, "egpup", `${step.n}. ${tx([step.th, step.en])}`); audit(["อัปเดตขั้นตอนใน e-GP", "Updated an e-GP step"], `${c.id} ${step.n}`); commit(); route(); toast(L("อัปเดตแล้ว", "Updated"));
});
document.addEventListener("click", e => { const b = e.target.closest && e.target.closest("[data-egpgo]"); if (!b) return; const m = Number(b.dataset.egpgo), cp = document.querySelector(`.cphase[data-cphase="${m}"]`); if (cp) cp.click(); });

// ---------- every item has its own update (16 Nov 2569) ----------
function egpItemSave(c, k, key, v) {
  if (!egpUpCan(c)) return false; const step = egpUpSteps(c).find(x => x.k === k); if (!step || !step.items.some(x => x.key === key)) return false;
  if (v.date && v.date > TODAY) { toast(L("วันที่ต้องไม่เกินวันนี้", "The date can't be after today")); return false; }
  c.egpItems = c.egpItems || {}; (c.egpItems[k] = c.egpItems[k] || {})[key] = { done: !!v.done, date: v.date || "", ref: String(v.ref || "").trim(), note: String(v.note || "").trim(), by: me().id, t: nowIso() };
  caseLog(c, "egpup", `${step.n}. ${key}`); audit(["อัปเดตรายการในขั้นตอน e-GP", "Updated an item of an e-GP step"], `${c.id} ${step.n}: ${key}`); return true;
}
function egpItemClear(c, k, key) { if (!egpUpCan(c)) return false; if (!egpItemRec(c, k, key)) return false; delete c.egpItems[k][key]; audit(["ล้างรายการที่บันทึกด้วยมือใน e-GP", "Cleared a hand-recorded e-GP item"], `${c.id} ${k}: ${key}`); return true; }
document.addEventListener("submit", e => {
  const f = e.target; if (!f || !f.matches || !f.matches("[data-egpitem]")) return; e.preventDefault();
  const [cid, k, ek] = f.dataset.egpitem.split("|"), c = caseOf(cid); if (!c) return; const fd = new FormData(f);
  if (egpItemSave(c, k, decodeURIComponent(ek), { done: fd.get("done") === "1", date: fd.get("date"), ref: fd.get("ref"), note: fd.get("note") })) { commit(); route(); toast(L("อัปเดตแล้ว", "Updated")); }
});
document.addEventListener("click", e => {
  const g = e.target.closest && e.target.closest("[data-egpfield]"); if (g) { const [cid, k, fld] = g.dataset.egpfield.split("|"), det = document.querySelector(`[data-egpdet="${k}"]`); if (det) { det.open = true; const inp = det.querySelector(`[name="${fld}"]`); if (inp) { inp.scrollIntoView({ block: "center" }); inp.focus(); } } return; }
  const x = e.target.closest && e.target.closest("[data-egpclear]"); if (x) { const [cid, k, ek] = x.dataset.egpclear.split("|"), c = caseOf(cid); if (c && egpItemClear(c, k, decodeURIComponent(ek))) { commit(); route(); toast(L("ล้างแล้ว กลับไปใช้สถานะจากระบบ", "Cleared; back to the status from the system")); } }
});
