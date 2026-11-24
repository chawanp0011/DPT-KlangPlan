// Fisko-KlangFinance, procurement round P2 (10 Nov 2569): four working phases, and the hand-over from the division to Finance.
// The new flow gives a procurement case four owners in turn: (1) the Planning Division (the plan), (2) the division or bureau that
// owns the case (approval in principle, reference price, TOR, the TOR committee, then hand over to the Finance Division),
// (3) the procurement officers, e-GP part (take the case, create the project, documents, notice, bids, evaluation, award, appeal),
// (4) the procurement officers, contract / payment / close part. The twelve case steps stay as they are inside; this file adds
//   - the phase bar on the case page (casePhases): each phase lists what it needs, and the current one is the first not complete;
//   - the hand-over: the division (or the officer for it) sends the prepared papers, the officer takes the case or sends it back
//     with advice (c.prep = { sent, recv, returned }); the case cannot go on from step 4 until the officer has taken it;
//   - who may prepare: the division that owns the case can record the reference price, attach the TOR and make the TOR committee
//     from step 3 (while the method is still being chosen, the TOR is judged against the advised method), until it is sent.
// Cases already past the hand-over in the sample data are marked as handed over (prep.legacy) so nothing in them changes.
// The method is still chosen by the officer at step 3 (approximation of the new flow, where the officer creates the project and
// sets the method after taking the case); the division prepares in parallel with that.
Object.assign(CASE_EV, { prep_sent: ["สำนัก/กองส่งเอกสารเตรียมให้กองคลัง", "Division handed the prepared papers to Finance"], prep_recv: ["พัสดุรับเรื่อง", "Procurement took the case"], prep_return: ["พัสดุส่งกลับให้สำนัก/กองแก้ไข", "Sent back to the division"] });

const prepSent = c => !!(c.prep && c.prep.sent), prepRecv = c => !!(c.prep && c.prep.recv);
const prepMethod = c => c.method || recommendMethod(c).method;
// What the division must have ready before it hands the case over.
function casePrepItems(c) {
  const ok = (v, th, en) => ({ ok: !!v, label: L(th, en) }), m = prepMethod(c), out = [];
  out.push(ok(c.ref && c.ref.amount > 0 && c.ref.basis && c.ref.basis.length, "บันทึกราคากลางพร้อมแหล่งอ้างอิง", "Record the reference price with its basis"));
  if (needsCompetition({ method: m })) out.push(ok(c.tor, "แนบ TOR", "Attach the TOR"));
  if (((ruleFor(m).committees) || []).includes("tor")) out.push(ok(committeeOk((c.committees || {}).tor), "แต่งตั้งคณะกรรมการจัดทำ TOR ให้ครบเงื่อนไข", "Appoint a complete TOR committee"));
  return out;
}
// ---------- the hand-over ----------
const casePrepOpen = c => { const n = caseState(c); return n >= 1 && n <= 4 && !c.cancelled && (isProcRole() || (cmCanNew(c) && !prepSent(c) && !prepRecv(c))); };
function casePrepSend(c, note) {
  const n = caseState(c); if (c.cancelled || n < 3 || n > 4) return L("รายการจัดซื้ออยู่ขั้นที่ส่งต่อไม่ได้", "The case isn't at a step where it can be handed over");
  if (!(isProcRole() || cmCanNew(c))) return L("สำนัก/กองเจ้าของเรื่องหรือเจ้าหน้าที่พัสดุเท่านั้นที่ส่งได้", "Only the owning division or procurement can send it");
  if (prepSent(c) || prepRecv(c)) return L("ส่งไปแล้ว", "Already handed over");
  const bad = casePrepItems(c).find(x => !x.ok); if (bad) return `${L("ยังส่งไม่ได้", "Can't send yet")}: ${bad.label}`;
  c.prep = Object.assign(c.prep || {}, { sent: { by: me().id, t: nowIso(), note: note || "" }, recv: null, returned: null });
  audit(["ส่งเอกสารเตรียมให้กองคลัง", "Handed the prepared papers to Finance"], `${c.id}${note ? " · " + note : ""}`); caseLog(c, "prep_sent", note || "");
  notify(["proc", "prochead"], [`รายการจัดซื้อ ${c.id} สำนัก/กองส่งเอกสารเตรียมให้กองคลัง รอรับเรื่อง`, `Case ${c.id}: the division handed over the prepared papers; take the case`], "case:" + c.id); return "";
}
function casePrepRecv(c) {
  if (!isProcRole()) return L("เจ้าหน้าที่พัสดุเท่านั้นที่รับเรื่องได้", "Only procurement can take the case"); if (!prepSent(c) || prepRecv(c)) return L("ไม่มีเรื่องรอรับ", "Nothing waits to be taken");
  if (caseState(c) === 3 && !caseMove(c)) return L("ไปขั้นถัดไปไม่ได้ ดูรายการตรวจของรายการจัดซื้อ", "Can't move on; see the case checks"); // taking the case moves it from step 3 to step 4
  c.prep.recv = { by: me().id, t: nowIso() }; audit(["พัสดุรับเรื่อง", "Procurement took the case"], c.id); caseLog(c, "prep_recv", "");
  notify(["div", "divhead"], [`รายการจัดซื้อ ${c.id} พัสดุรับเรื่องแล้ว`, `Case ${c.id}: procurement took the case`], "case:" + c.id); return "";
}
function casePrepReturn(c, note) {
  if (!isProcRole()) return L("เจ้าหน้าที่พัสดุเท่านั้นที่ส่งกลับได้", "Only procurement can send it back"); const n = caseState(c); if (!prepSent(c) || n > 4) return L("ไม่มีเรื่องที่ส่งกลับได้", "Nothing to send back");
  if (String(note || "").trim().length < 3) return L("ระบุคำแนะนำให้สำนัก/กองแก้ไข", "Give the division advice on what to fix");
  c.prep.sent = null; c.prep.recv = null; c.prep.returned = { by: me().id, t: nowIso(), note: String(note).trim() };
  audit(["พัสดุส่งกลับให้สำนัก/กองแก้ไข", "Sent back to the division"], `${c.id} · ${c.prep.returned.note}`); caseLog(c, "prep_return", c.prep.returned.note);
  notify(["div", "divhead"], [`รายการจัดซื้อ ${c.id} พัสดุส่งกลับให้แก้ไข: ${c.prep.returned.note}`, `Case ${c.id} was sent back: ${c.prep.returned.note}`], "case:" + c.id); return "";
}
function casePrepPanel(c) {
  const n = caseState(c), P = c.prep || {}, items = casePrepItems(c), allOk = items.every(x => x.ok), open = n <= 4 && !c.cancelled;
  const state = prepRecv(c) ? tag(L("พัสดุรับเรื่องแล้ว", "Taken by procurement"), "p-ok") : prepSent(c) ? tag(L("ส่งแล้ว รอพัสดุรับเรื่อง", "Sent, waiting for procurement"), "p-info") : P.returned ? tag(L("พัสดุส่งกลับให้แก้ไข", "Sent back for changes"), "p-warn") : tag(L("ยังไม่ส่ง", "Not sent"), "p-mute");
  const who = u => esc(userName(u.by)), when = u => fdate(u.t);
  return `<div class="panel cprep" data-cprep="${c.id}"><header><h2>${L("ส่งเอกสารเตรียมให้กองคลัง", "Hand over the prepared papers to Finance")}</h2><span class="sp"></span>${state}</header>
    <div class="body" style="display:flex;flex-direction:column;gap:10px">
      <div class="sub">${L("สำนัก/กองเจ้าของเรื่องเตรียมราคากลาง TOR และคณะกรรมการ TOR แล้วส่งให้กองคลัง เจ้าหน้าที่พัสดุรับเรื่องแล้วจึงบันทึกข้อมูล e-GP ต่อได้ ถ้ามีข้อแก้ไข พัสดุส่งกลับพร้อมคำแนะนำ", "The division prepares the reference price, the TOR and the TOR committee and hands over; procurement takes the case, then records e-GP details. If something needs fixing, procurement sends it back with advice.")}</div>
      <div>${items.map(x => `<div>${x.ok ? "✓" : '<span style="color:var(--bad)">✗</span>'} ${esc(x.label)}</div>`).join("")}</div>
      ${P.sent ? `<div class="sub">${L("ส่งโดย", "Sent by")} ${who(P.sent)} · ${when(P.sent)}${P.sent.note ? " · " + esc(P.sent.note) : ""}</div>` : ""}${P.recv ? `<div class="sub">${L("รับเรื่องโดย", "Taken by")} ${who(P.recv)} · ${when(P.recv)}${P.legacy ? " · " + L("ข้อมูลตัวอย่างเดิม", "earlier sample data") : ""}</div>` : ""}
      ${P.returned && !prepSent(c) ? `<div style="color:var(--bad)">${L("ส่งกลับโดย", "Sent back by")} ${who(P.returned)} · ${when(P.returned)}: ${esc(P.returned.note)}</div>` : ""}
      ${open && !prepSent(c) && !prepRecv(c) && (isProcRole() || cmCanNew(c)) ? `<form class="inline-form" data-prepsend="${c.id}"><div class="f" style="flex:1 1 260px"><input type="text" name="note" placeholder="${L("หมายเหตุถึงกองคลัง (ถ้ามี)", "Note to Finance (optional)")}"></div><button class="btn primary" type="submit" ${allOk ? "" : "disabled"}>${L("ส่งให้กองคลัง", "Hand over to Finance")}</button></form>` : ""}
      ${open && prepSent(c) && !prepRecv(c) && isProcRole() ? `<div class="row"><button class="btn primary" type="button" data-preprecv="${c.id}">${L("รับเรื่อง", "Take the case")}</button></div>
        <form class="inline-form" data-prepret="${c.id}"><div class="f" style="flex:1 1 260px"><input type="text" name="note" placeholder="${L("คำแนะนำให้สำนัก/กองแก้ไข", "Advice on what to fix")}" required></div><button class="btn" type="submit">${L("ส่งกลับสำนัก/กอง", "Send back")}</button></form>` : ""}
    </div></div>`;
}
{
  const done = msg => { commit(); route(); toast(msg); }, run = (err, ok) => (err ? toast(err) : done(ok));
  document.addEventListener("submit", e => { const f = e.target; if (!f || !f.matches) return;
    if (f.matches("[data-prepsend]")) { e.preventDefault(); const c = caseOf(f.dataset.prepsend); if (c) run(casePrepSend(c, String(new FormData(f).get("note") || "").trim()), L("ส่งให้กองคลังแล้ว", "Handed over to Finance")); return; }
    if (f.matches("[data-prepret]")) { e.preventDefault(); const c = caseOf(f.dataset.prepret); if (c) run(casePrepReturn(c, String(new FormData(f).get("note") || "")), L("ส่งกลับสำนัก/กองแล้ว", "Sent back to the division")); } });
  document.addEventListener("click", e => { const b = e.target.closest && e.target.closest("[data-preprecv]"); if (!b) return; const c = caseOf(b.dataset.preprecv); if (c) run(casePrepRecv(c), L("รับเรื่องแล้ว บันทึกข้อมูล e-GP ได้", "Taken; e-GP details can be recorded")); });
}
// The case cannot leave step 4 until procurement has taken it; and who must act next is shown correctly.
{
  const base = caseChecks;
  caseChecks = c => { const out = base(c); if (caseState(c) === 4 && !c.cancelled && !prepRecv(c)) out.unshift({ ok: false, label: L("สำนัก/กองส่งเอกสารเตรียมให้กองคลัง และพัสดุรับเรื่องแล้ว", "The division hands over the papers and procurement takes the case") }); return out; };
  const nextBase = caseNext;
  caseNext = c => { const n = caseState(c);
    if (n === 4 && !c.cancelled && !prepRecv(c)) {
      if (!prepSent(c)) return c.prep && c.prep.returned ? { who: "req", th: "สำนัก/กองแก้ไขตามคำแนะนำของพัสดุ แล้วส่งใหม่", en: "The division fixes what procurement advised and sends again" } : casePrepItems(c).every(x => x.ok) ? { who: "req", th: "สำนัก/กองส่งเอกสารเตรียมให้กองคลัง", en: "The division hands the papers to Finance" } : { who: "req", th: "สำนัก/กองเตรียมราคากลาง TOR และคณะกรรมการ TOR", en: "The division prepares the reference price, TOR and TOR committee" };
      return { who: "proc", th: "พัสดุรับเรื่องจากสำนัก/กอง", en: "Procurement takes the case from the division" };
    }
    return nextBase(c); };
}

// ---------- sample data: cases already past the hand-over are marked as handed over and taken ----------
Object.keys(SEEDS).forEach(k => {
  const prev = SEEDS[k].seed;
  SEEDS[k].seed = () => {
    const s = prev(), po = (s.users.find(u => u.role === "proc") || s.users[0]).id;
    (s.cases || []).forEach(c => { if (c.state >= 4 && !c.cancelled) { const t = ((c.egp && c.egp.announce) || "2026-10-01") + "T09:00:00"; c.prep = { sent: { by: po, t, note: "" }, recv: { by: po, t }, returned: null, legacy: true }; } else c.prep = null; });
    return s;
  };
});
