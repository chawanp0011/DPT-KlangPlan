// KlangFinance, procurement round P22 (16 Nov 2569): the hand-over onward to the local authority (อปท.) or the owner of the project is made for
// the WHOLE PROJECT, not phase by phase ("ส่งมอบต่อให้ อปท. / เจ้าของโครงการ (หลังปิดแฟ้ม) ส่งทั้งโครงการ ไม่ใช่รายงวด").
// Round P6 (file 98zi) kept it per phase: ph.handover = { to, party, date, docNo, note, by, t }. Now it is one record on the contract, c.handover, with the same
// fields. What stays per phase is what really is per phase: the contractor's delivery (ph.delivered), the division's receipt (ph.recv) and the committee's
// acceptance. Rules: only procurement hands on, only after the case is closed (as before), and now only when EVERY live phase has been accepted; the date is
// not before the last acceptance or the close and not after today. This file redefines the pieces of 98zi that were per phase (it is loaded after it):
// handStatus, handRow (without the hand-over column), handPanel (the phases, then one hand-over block for the project), the form and the undo
// (data-hhandp / data-hundo="handp|<contract>"), and the tasks (one per contract). The sample data of closed cases that had a hand-over on each phase gets
// one on the contract instead.
const handLastAcc = c => handLive(c).map(ph => (phaseAccepted(ph) ? accDate(ph) : "")).sort().pop() || "";
const handAllAccepted = c => { const L2 = handLive(c); return L2.length > 0 && L2.every(ph => phaseAccepted(ph)); };
const handProjDone = c => !!c.handover; // (handAll of file 98zi is a const that nothing else calls; the project's state is this)
handStatus = ph => (!phaseAccepted(ph) ? (ph.recv ? "recv" : ph.delivered ? "delivered" : "none") : ph.recv ? "ready" : "accepted"); // the phase's own state; the hand-over belongs to the project
{
  const hr = handRow;
  handRow = (c, ph) => { const s = hr(c, ph), i = s.lastIndexOf("<td>"); return i < 0 ? s : s.slice(0, i) + "</tr>"; }; // the old last column, "handed on", goes
}
const handProjBlock = c => {
  const h = c.handover;
  if (h) return `<div class="row" style="flex-wrap:wrap">${tag(L("ส่งมอบต่อทั้งโครงการแล้ว", "Handed on, the whole project"), "p-ok")} <span class="sub">${esc(tx(HAND_TO[h.to]))} · ${esc(h.party)} · ${fdate(h.date)} · ${esc(h.docNo)}${h.note ? " · " + esc(h.note) : ""}</span>${handDo(c) ? ` <button class="btn ghost" type="button" data-hundo="handp|${c.id}" aria-label="${L("ยกเลิกการส่งมอบต่อ", "Undo the hand-over")}">×</button>` : ""}</div>`;
  if (!handClosed(c)) return `<span class="sub">${L("ส่งมอบต่อได้หลังปิดการจัดซื้อ", "Handing on comes after the case is closed")}</span>`;
  if (!handAllAccepted(c)) return `<span class="sub">${L("ส่งมอบต่อได้เมื่อตรวจรับครบทุกงวด", "Handing on comes after every phase is accepted")}</span>`;
  if (!handDo(c)) return tag(L("รอเจ้าหน้าที่พัสดุส่งมอบต่อ", "Waiting for procurement"), "p-warn");
  return `<form class="inline-form" data-hhandp="${c.id}" style="margin:0"><div class="f" style="flex:0 1 190px"><select name="to" aria-label="${L("ส่งมอบให้", "Hand over to")}">${Object.keys(HAND_TO).map(k => `<option value="${k}">${esc(tx(HAND_TO[k]))}</option>`).join("")}</select></div>
    <div class="f" style="flex:1 1 200px"><input type="text" name="party" list="hand-lgu" value="${esc(handOwnerName(c))}" placeholder="${L("ผู้รับมอบ (ชื่อ อปท. หรือผู้ใช้งาน)", "Receiver (LGU name or user)")}" required></div>
    <div class="f" style="flex:0 1 150px"><input type="date" name="d" value="${TODAY}" min="${handMin(c, handLastAcc(c))}" max="${TODAY}" required aria-label="${L("วันที่ส่งมอบต่อ", "Date handed on")}"></div>
    <div class="f" style="flex:1 1 150px"><input type="text" name="doc" placeholder="${L("เลขที่หนังสือส่งมอบ", "Hand-over letter no.")}" required></div><div class="f" style="flex:1 1 140px"><input type="text" name="note" placeholder="${L("หมายเหตุ", "Note")}"></div>
    <button class="btn primary" type="submit">${L("ส่งมอบต่อทั้งโครงการ", "Hand on the whole project")}</button></form>`;
};
handPanel = cs => {
  const c = caseCon(cs); if (!c) return null; const live = handLive(c), n = live.filter(ph => phaseAccepted(ph)).length;
  return { title: L("ส่งมอบต่อให้ อปท. / เจ้าของโครงการ (ทั้งโครงการ หลังปิดการจัดซื้อ)", "Hand-over to the local authority / the owner (the whole project, after the close)"),
    body: `<div class="sub">${L("เมื่อปิดการจัดซื้อและตรวจรับครบทุกงวดแล้ว เจ้าหน้าที่พัสดุส่งมอบโครงการต่อให้ อปท. หรือเจ้าของโครงการครั้งเดียวทั้งโครงการ", "After the case is closed and every phase is accepted, procurement hands the whole project on, once, to the local authority or the owner")}</div>
    <datalist id="hand-lgu">${(typeof CW_LGU !== "undefined" ? CW_LGU : []).map(x => `<option value="${esc(x)}">`).join("")}</datalist>
    <div class="tbl-wrap"><table><thead><tr><th>${L("งวด", "Phase")}</th><th>${L("ผู้รับเหมาส่งมอบ", "Contractor delivered")}</th><th>${L("สำนัก/กองรับมอบ", "Division received")}</th><th>${L("ตรวจรับ", "Accepted")}</th></tr></thead><tbody>${live.map(ph => handRow(c, ph)).join("")}</tbody></table></div>
    <div class="row">${tag(`${n}/${live.length} ${L("งวดตรวจรับแล้ว", "phases accepted")}`, n === live.length ? "p-ok" : "p-info")}</div>
    <div style="margin-top:8px"><b style="font-weight:600">${L("ส่งมอบต่อทั้งโครงการ", "Hand-over of the whole project")}</b><div style="margin-top:6px">${handProjBlock(c)}</div></div>` };
};
{
  const done = msg => { commit(); route(); toast(msg); };
  document.addEventListener("submit", e => {
    const f = e.target; if (!f || !f.matches || !f.matches("[data-hhandp]")) return; e.preventDefault();
    const c = famCon(f.dataset.hhandp), cs = c && conCase(c), fd = new FormData(f), g = k => String(fd.get(k) || "").trim();
    if (!c || !handDo(c) || c.handover || !handAllAccepted(c)) return;
    const d = g("d"); if (d < handMin(c, handLastAcc(c)) || d > TODAY) { toast(L("วันที่ส่งมอบต่อต้องไม่ก่อนวันตรวจรับงวดสุดท้ายและวันปิดการจัดซื้อ และไม่เกินวันนี้", "The hand-over can't be before the last acceptance or the close, or after today")); return; }
    if (!g("party") || !g("doc")) { toast(L("ระบุผู้รับมอบและเลขที่หนังสือส่งมอบ", "Give the receiver and the hand-over letter number")); return; }
    c.handover = { to: g("to"), party: g("party"), date: d, docNo: g("doc"), note: g("note"), by: me().id, t: nowIso() };
    audit(["ส่งมอบต่อให้ อปท./เจ้าของโครงการ ทั้งโครงการ", "Handed the whole project on"], `${c.id} → ${g("party")}`); if (cs) caseLog(cs, "handover", `${c.id} → ${g("party")}`);
    notify(["div", "divhead", "fin"], [`${c.id} ส่งมอบต่อทั้งโครงการให้ ${g("party")} แล้ว (${g("doc")})`, `${c.id}: the whole project was handed on to ${g("party")} (${g("doc")})`], cs ? "case:" + cs.id : "prc-contracts"); done(L("บันทึกการส่งมอบต่อแล้ว", "Hand-over recorded"));
  });
  document.addEventListener("click", e => {
    const b = e.target.closest && e.target.closest('[data-hundo^="handp|"]'); if (!b) return; const c = famCon(b.dataset.hundo.split("|")[1]); if (!c || !handDo(c) || !c.handover) return;
    c.handover = null; audit(["ยกเลิกการส่งมอบต่อทั้งโครงการ", "Undid the hand-over of the whole project"], c.id); done(L("ยกเลิกแล้ว", "Undone"));
  });
  // tasks: one for the contract (it was one for each phase)
  const bt = famTasks;
  famTasks = R => { bt((t, s, due, link, cls) => (/^(ส่งมอบต่อให้ อปท\.\/เจ้าของโครงการ|Hand on) CT-/.test(t) ? null : R(t, s, due, link, cls)));
    (S.contracts || []).forEach(c => { if (!handDo(c) || c.handover || !handAllAccepted(c)) return; const cs = conCase(c); R(`${L("ส่งมอบต่อทั้งโครงการให้ อปท./เจ้าของโครงการ", "Hand the whole project on")} ${c.id}`, tx(famPlan(c.plan).name), TODAY, cs ? "case:" + cs.id : "prc-contracts", "p-info"); }); };
}
// sample data: a closed case whose phases each had a hand-over gets one on the contract instead (the last one's details)
Object.keys(SEEDS).forEach(k => {
  const prev = SEEDS[k].seed;
  SEEDS[k].seed = () => {
    const s = prev();
    (s.contracts || []).forEach(c => { const hs = (c.phases || []).map(ph => ph.handover).filter(Boolean).sort((a, b) => String(a.date).localeCompare(String(b.date))); if (hs.length && !c.handover) c.handover = Object.assign({}, hs[hs.length - 1]); (c.phases || []).forEach(ph => { delete ph.handover; }); });
    return s;
  };
});
