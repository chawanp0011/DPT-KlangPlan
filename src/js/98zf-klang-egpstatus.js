// KlangFinance, procurement round P3 (12 Nov 2569): the public hearing of the draft announcement and the price negotiation,
// kept as STATUS only. The officer does both in e-GP; this system records where each stands (c.egpSt) and uses it:
//  - public hearing: needed for a competitive method when the amount reaches the profile's limit (5,000,000 baht in the sample) or the
//    item is flagged (the existing rule hearingReq in 70-profile.js, so one rule decides). Status: not started, open (from - to), done without
//    objection, done with objections. A case that already uses the fuller hearing workflow of 70-profile.js (c.hearing) keeps it, and the
//    status is read from it. "Done without objection" satisfies the existing check that stops the case before the announcement (R-25);
//    "done with objections" does not, and shows a button that sends the case back to the division with advice (the hand-over return of P2).
//  - price negotiation: needed when the lowest bid is above the amount the requisition was approved for. Status: needed, negotiating, done with the
//    price before and after. A case that needs it cannot go on from evaluation until it is done with a price after negotiation.
// Nothing here asks anyone to approve or comment inside this system; there are no per-person comments. Panel: Send to e-GP, "Hearing and negotiation".
const EGP_HEAR = { none: ["ยังไม่เริ่ม", "Not started"], open: ["กำลังรับฟัง", "Open"], done_ok: ["เสร็จ ไม่มีคัดค้าน", "Done, no objection"], done_obj: ["เสร็จ มีคัดค้าน", "Done, with objections"] };
const EGP_NEGO = { need: ["ต้องต่อรอง", "Needed"], doing: ["กำลังต่อรอง", "Negotiating"], done: ["เสร็จ", "Done"] };
Object.assign(CASE_EV, { egp_hearing: ["บันทึกสถานะรับฟังความคิดเห็นใน e-GP", "e-GP hearing status recorded"], egp_nego: ["บันทึกสถานะต่อรองราคาใน e-GP", "e-GP negotiation status recorded"] });
// Required: the rule of 70-profile.js (profile switch, flag, amount from the limit), or, whatever the profile, an e-bidding case above the limit
// (the e-GP process the user gave: the draft announcement is published for comment for e-bidding over 5 million baht).
const hearReqNow = c => !!c.method && needsCompetition(c) && (hearingReq(c) || (c.method === "ebid" && planEst(c) > ((S.prof && S.prof.p && S.prof.p.hearingMin) || 5000000)));
const egpHearRec = c => (c.egpSt && c.egpSt.hearing) || null, egpNegoRec = c => (c.egpSt && c.egpSt.nego) || null;
function hearStatus(c) { if (c.hearing) return hearingDone(c) ? (c.hearing.revised ? "done_obj" : "done_ok") : "open"; const h = egpHearRec(c); return h ? h.status : "none"; }
function hearLabel(c) { const st = hearStatus(c), h = c.hearing || egpHearRec(c) || {}; return `${tx(EGP_HEAR[st])}${st === "open" && h.start ? ` · ${fdate(h.start)} – ${fdate(h.end)}` : ""}`; }
const negoNeeded = c => { const B = (c.bids || []).map(b => b.price).filter(x => x > 0), rq = caseReq(c); return B.length > 0 && !!rq && Math.min(...B) > rq.amount; };
const negoDone = c => { const g = egpNegoRec(c); return !!g && g.status === "done" && g.after > 0; };
function negoLabel(c) { const g = egpNegoRec(c); if (!g) return negoNeeded(c) ? tx(EGP_NEGO.need) : L("ไม่ต้องมี", "Not needed"); return `${tx(EGP_NEGO[g.status])}${g.status === "done" && g.after ? ` · ${fmt(g.before)} → ${fmt(g.after)} ${L("บาท", "baht")}` : ""}`; }

function egpStatusPanel(c) {
  const n = caseState(c), need = hearReqNow(c), hs = hearStatus(c), pr = isProcRole() && !c.cancelled, hr = egpHearRec(c) || {}, ng = egpNegoRec(c) || {}, nn = negoNeeded(c);
  const editH = pr && n <= 4 && !c.hearing && (need || !!egpHearRec(c)), editN = pr && n === 6 && (nn || !!egpNegoRec(c)), minBid = Math.min(...((c.bids || []).map(b => b.price).filter(x => x > 0)), Infinity);
  const hearBlock = `<div><b style="font-weight:600">${L("รับฟังความคิดเห็นร่างประกาศ", "Public hearing of the draft announcement")}</b> ${need || c.hearing ? tag(L("ต้องมี", "Required"), "p-warn") : tag(L("ไม่ต้องมีสำหรับวิธีและวงเงินนี้", "Not needed for this method and amount"), "p-mute")} ${tag(hearLabel(c), hs === "done_ok" ? "p-ok" : hs === "done_obj" ? "p-bad" : hs === "open" ? "p-info" : "p-mute")}</div>
    ${c.hearing ? `<div class="sub">${L("บันทึกด้วยระบบรับฟังความคิดเห็น TOR ของรายการจัดซื้อ (แผง รับฟังความคิดเห็น TOR) สถานะอ่านจากที่นั่น", "Recorded in the case's TOR hearing (its own panel); the status is read from there")}</div>` : ""}
    ${hr.note && !c.hearing ? `<div class="sub">${esc(hr.note)}</div>` : ""}
    ${editH ? `<form class="inline-form" data-egsh="${c.id}"><div class="f" style="flex:0 1 200px"><label>${L("สถานะใน e-GP", "Status in e-GP")}</label><select name="st">${Object.keys(EGP_HEAR).map(k => `<option value="${k}" ${k === hs ? "selected" : ""}>${tx(EGP_HEAR[k])}</option>`).join("")}</select></div>
      <div class="f" style="flex:0 1 150px"><label>${L("เริ่ม", "From")}</label><input type="date" name="s" value="${esc(hr.start || "")}"></div><div class="f" style="flex:0 1 150px"><label>${L("สิ้นสุด", "To")}</label><input type="date" name="e" value="${esc(hr.end || "")}"></div>
      <div class="f" style="flex:1 1 220px"><label>${L("หมายเหตุ / ข้อคัดค้านและคำแนะนำ", "Note / objections and advice")}</label><input type="text" name="note" value="${esc(hr.note || "")}"></div></form>
      ${hs === "done_obj" ? `<div class="row"><button class="btn danger" type="button" data-egsret="${c.id}">${L("ส่งกลับสำนัก/กอง พร้อมคำแนะนำ", "Send back to the division with advice")}</button><span class="sub">${L("ใช้ข้อความในช่องหมายเหตุเป็นคำแนะนำ", "The note is sent as the advice")}</span></div>` : ""}` : ""}`;
  const negoBlock = `<div style="margin-top:6px"><b style="font-weight:600">${L("ต่อรองราคา", "Price negotiation")}</b> ${nn || egpNegoRec(c) ? tag(L("ต้องมี", "Required"), "p-warn") : tag(L("ไม่ต้องมี", "Not needed"), "p-mute")} ${tag(negoLabel(c), ng.status === "done" ? "p-ok" : ng.status ? "p-info" : nn ? "p-warn" : "p-mute")}</div>
    <div class="sub">${nn ? `${L("ราคาต่ำสุด", "Lowest bid")} ${fmt(minBid)} ${L("บาท สูงกว่าวงเงินที่อนุมัติ", "baht is above the approved amount")} ${fmt((caseReq(c) || {}).amount)}` : L("ใช้เมื่อราคาต่ำสุดของผู้ยื่นเกินวงเงินที่ได้รับอนุมัติ (ผู้ยื่นยังไม่ถูกบันทึก หรือราคาไม่เกินวงเงิน)", "Used when the lowest bid is above the approved amount (no bids recorded yet, or none above it)")}</div>
    ${editN ? `<form class="inline-form" data-egsn="${c.id}"><div class="f" style="flex:0 1 180px"><label>${L("สถานะใน e-GP", "Status in e-GP")}</label><select name="st">${Object.keys(EGP_NEGO).map(k => `<option value="${k}" ${(ng.status || "need") === k ? "selected" : ""}>${tx(EGP_NEGO[k])}</option>`).join("")}</select></div>
      <div class="f" style="flex:0 1 150px"><label>${L("ราคาก่อนต่อรอง (บาท)", "Price before (baht)")}</label><input type="number" name="b" min="0" step="1" value="${ng.before || (isFinite(minBid) ? minBid : "")}"></div>
      <div class="f" style="flex:0 1 150px"><label>${L("ราคาหลังต่อรอง (บาท)", "Price after (baht)")}</label><input type="number" name="a" min="0" step="1" value="${ng.after || ""}"></div>
      <div class="f" style="flex:0 1 150px"><label>${L("วันที่", "Date")}</label><input type="date" name="d" value="${esc(ng.date || "")}"></div><div class="f" style="flex:1 1 200px"><label>${L("หมายเหตุ", "Note")}</label><input type="text" name="note" value="${esc(ng.note || "")}"></div></form>` : ""}`;
  return { title: L("รับฟังความคิดเห็นและต่อรองราคา", "Hearing and price negotiation"), body: `<div class="sub">${L("ทั้งสองอย่างทำจริงใน e-GP ที่นี่บันทึกเฉพาะสถานะ (เลือกแล้วบันทึกทันที)", "Both are done in e-GP; this panel records only the status (saved as soon as you choose)")}</div>${hearBlock}${negoBlock}` };
}
{
  const done = msg => { commit(); route(); toast(msg); };
  document.addEventListener("change", e => {
    const f = e.target && e.target.closest && e.target.closest("[data-egsh],[data-egsn]"); if (!f) return;
    const isH = f.hasAttribute("data-egsh"), c = caseOf(f.dataset[isH ? "egsh" : "egsn"]), fd = new FormData(f), g = k => String(fd.get(k) || "").trim(); if (!c || !isProcRole()) return;
    c.egpSt = c.egpSt || { hearing: null, nego: null };
    if (isH) { const st = g("st"); if (st === "open" && (!g("s") || !g("e") || g("e") < g("s"))) { toast(L("กำลังรับฟัง: ระบุวันเริ่มและวันสิ้นสุดให้ถูกต้อง", "Open: give a valid start and end date")); return; }
      c.egpSt.hearing = { status: st, start: g("s"), end: g("e"), note: g("note"), by: me().id, t: nowIso() }; caseLog(c, "egp_hearing", tx(EGP_HEAR[st])); audit(["บันทึกสถานะรับฟังความคิดเห็นใน e-GP", "Recorded the e-GP hearing status"], `${c.id} ${tx(EGP_HEAR[st])}`); done(L("บันทึกสถานะแล้ว", "Status saved")); return; }
    const st = g("st"), b = Math.round(Number(g("b"))) || 0, a = Math.round(Number(g("a"))) || 0;
    if (st === "done" && (!(a > 0) || !(b > 0) || a > b)) { toast(L("เสร็จ: ระบุราคาก่อนและหลังต่อรอง และราคาหลังต้องไม่สูงกว่าราคาก่อน", "Done: give the price before and after; after can't be above before")); return; }
    c.egpSt.nego = { status: st, before: b, after: a, date: g("d"), note: g("note"), by: me().id, t: nowIso() }; caseLog(c, "egp_nego", `${tx(EGP_NEGO[st])}${st === "done" ? ` ${fmt(b)} → ${fmt(a)}` : ""}`); audit(["บันทึกสถานะต่อรองราคาใน e-GP", "Recorded the e-GP negotiation status"], `${c.id} ${tx(EGP_NEGO[st])}`); done(L("บันทึกสถานะแล้ว", "Status saved"));
  });
  document.addEventListener("click", e => {
    const b = e.target.closest && e.target.closest("[data-egsret]"); if (!b) return; const c = caseOf(b.dataset.egsret), f = document.querySelector(`[data-egsh="${b.dataset.egsret}"]`); if (!c) return;
    const note = f ? String(new FormData(f).get("note") || "").trim() : "", err = casePrepReturn(c, note); if (err) { toast(err); return; }
    c.egpSt.hearing = { status: "none", start: "", end: "", note: "", by: me().id, t: nowIso() }; done(L("ส่งกลับสำนัก/กองแล้ว หลังแก้แล้วส่งใหม่ แล้วรับฟังใหม่", "Sent back; after the fix the division sends again and the hearing starts anew"));
  });
  // a negotiation that is needed must be done before the case goes on from evaluation
  const base = caseChecks;
  caseChecks = c => { const out = base(c);
    if (caseState(c) === 4 && !c.cancelled && hearReqNow(c) && !hearingReq(c)) out.push({ ok: hearingDone(c), label: L("รับฟังความคิดเห็นร่างประกาศใน e-GP เสร็จและไม่มีคัดค้าน ก่อนประกาศเชิญชวน", "The e-GP hearing of the draft announcement is done without objection, before the invitation") });
    if (caseState(c) === 6 && !c.cancelled && negoNeeded(c)) out.push({ ok: negoDone(c), label: L("ต่อรองราคา: ราคาต่ำสุดเกินวงเงินที่อนุมัติ บันทึกสถานะต่อรองเป็นเสร็จพร้อมราคาหลังต่อรอง", "Negotiation: the lowest bid is above the approved amount; record it done with the price after") }); return out; };
}
