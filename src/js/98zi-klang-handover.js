// Fisko-KlangFinance, procurement round P6 (13 Nov 2569): the delivery chain after the contract, as status of the project.
// Checked first: the project already had the contractor's delivery date (ph.delivered, recorded by procurement) and the committee's acceptance, but
// nothing for the two hand-overs the user named: (1) the contractor hands the work to the division, (2) the division hands it on to the local
// authority (อปท.) or to the owner of the request. The accounting side of a built work (asset, transfer out of GFMIS) is in the Construction
// and handover register (CW1, file 96) and stays there; this file keeps the project's own status.
// Per phase:
//   ph.delivered   the contractor delivered (as before; procurement records the date)
//   ph.recv        the division received it: { date, note, by, t }   (new)
//   acceptance     the committee accepted it (as before)
//   ph.handover    the division handed it on: { to: "lgu" | "owner", party, date, docNo, note, by, t }   (new)
// Order: delivered -> received -> accepted -> handed on. Receiving needs the delivery; handing on needs both the receipt and the acceptance.
// Who records: the division that owns the plan item (or procurement for it). It shows in the Contract-management panel (a sub-panel), in the
// main panel's checklist, in the closing checks (the case cannot be closed until every live phase is handed on; cases closed before this file
// are not asked), and in the tasks of the division.
Object.assign(CASE_EV, { recv: ["สำนัก/กองรับมอบงาน", "The division received the delivery"], handover: ["ส่งมอบต่อให้ อปท./เจ้าของโครงการ", "Handed on to the local authority / the owner"] });
const HAND_TO = { lgu: ["องค์กรปกครองส่วนท้องถิ่น (อปท.)", "Local authority (LGU)"], owner: ["เจ้าของคำขอโครงการ / ผู้ใช้งาน", "Owner of the request / the user"] };
const handCan = c => !!c && (isProcRole() || (["div", "divhead"].includes(ROLE) && me().unit === varUnit(c)));
const handLive = c => c.phases.filter(ph => !ph.cancelled);
const handAll = c => { if ((conCase(c) || {}).close) return true; const L2 = handLive(c); return L2.length > 0 && L2.every(ph => !!ph.handover); };
const handOwnerName = c => { const rq = caseReq(conCase(c) || {}); return rq ? `${userName(rq.by)} · ${unitName(varUnit(c))}` : unitName(varUnit(c)); };
function handStatus(ph) { return ph.handover ? "handed" : !phaseAccepted(ph) ? (ph.recv ? "recv" : ph.delivered ? "delivered" : "none") : ph.recv ? "ready" : "accepted"; }
function handRow(c, ph) {
  const can = handCan(c), accDt = phaseAccepted(ph) ? accDate(ph) : "";
  const recv = ph.recv ? `${tag(L("รับมอบแล้ว", "Received"), "p-ok")} <span class="sub">${fdate(ph.recv.date)} · ${esc(userName(ph.recv.by))}${ph.recv.note ? " · " + esc(ph.recv.note) : ""}</span>${can && !ph.handover ? ` <button class="btn ghost" type="button" data-hundo="recv|${c.id}|${ph.n}" aria-label="${L("ยกเลิกการรับมอบ", "Undo the receipt")}">×</button>` : ""}`
    : ph.delivered ? (can ? `<form class="inline-form" data-hrecv="${c.id}|${ph.n}" style="margin:0"><div class="f" style="flex:0 1 150px"><input type="date" name="d" value="${TODAY}" min="${ph.delivered}" max="${TODAY}" required aria-label="${L("วันที่รับมอบ", "Date received")}"></div><div class="f" style="flex:1 1 140px"><input type="text" name="note" placeholder="${L("หมายเหตุ", "Note")}"></div><button class="btn" type="submit">${L("รับมอบงาน", "Receive")}</button></form>` : tag(L("รอสำนัก/กองรับมอบ", "Waiting for the division"), "p-warn")) : `<span class="sub">${L("รอผู้รับเหมาส่งมอบ", "Waiting for the delivery")}</span>`;
  const hand = ph.handover ? `${tag(L("ส่งมอบต่อแล้ว", "Handed on"), "p-ok")} <span class="sub">${esc(tx(HAND_TO[ph.handover.to]))} · ${esc(ph.handover.party)} · ${fdate(ph.handover.date)} · ${esc(ph.handover.docNo)}${ph.handover.note ? " · " + esc(ph.handover.note) : ""}</span>${can && !(conCase(c) || {}).close ? ` <button class="btn ghost" type="button" data-hundo="hand|${c.id}|${ph.n}" aria-label="${L("ยกเลิกการส่งมอบต่อ", "Undo the hand-over")}">×</button>` : ""}`
    : !phaseAccepted(ph) ? `<span class="sub">${L("หลังตรวจรับ", "After acceptance")}</span>` : !ph.recv ? `<span class="sub">${L("ต้องรับมอบก่อน", "Receive it first")}</span>`
    : can ? `<form class="inline-form" data-hhand="${c.id}|${ph.n}" style="margin:0"><div class="f" style="flex:0 1 190px"><select name="to" aria-label="${L("ส่งมอบให้", "Hand over to")}">${Object.keys(HAND_TO).map(k => `<option value="${k}">${esc(tx(HAND_TO[k]))}</option>`).join("")}</select></div>
        <div class="f" style="flex:1 1 200px"><input type="text" name="party" list="hand-lgu" value="${esc(handOwnerName(c))}" placeholder="${L("ผู้รับมอบ (ชื่อ อปท. หรือผู้ใช้งาน)", "Receiver (LGU name or user)")}" required></div><div class="f" style="flex:0 1 150px"><input type="date" name="d" value="${TODAY}" min="${accDt}" max="${TODAY}" required></div>
        <div class="f" style="flex:1 1 150px"><input type="text" name="doc" placeholder="${L("เลขที่หนังสือส่งมอบ", "Hand-over letter no.")}" required></div><div class="f" style="flex:1 1 140px"><input type="text" name="note" placeholder="${L("หมายเหตุ", "Note")}"></div><button class="btn primary" type="submit">${L("ส่งมอบต่อ", "Hand on")}</button></form>`
    : tag(L("รอสำนัก/กองส่งมอบต่อ", "Waiting for the division"), "p-warn");
  return `<tr><td>${tx(ph.name)}</td><td>${ph.delivered ? fdate(ph.delivered) : "—"}</td><td>${recv}</td><td>${ph.cancelled ? "" : phaseAccepted(ph) ? tag(L("ตรวจรับแล้ว", "Accepted"), "p-ok") : tag(L("ยังไม่ตรวจรับ", "Not yet"), "p-mute")}</td><td>${hand}</td></tr>`;
}
function handPanel(cs) {
  const c = caseCon(cs); if (!c) return null; const live = handLive(c), n = live.filter(ph => ph.handover).length;
  return { title: L("ส่งมอบต่อให้ อปท. / เจ้าของโครงการ", "Hand-over to the local authority / the owner"), body: `<div class="sub">${L("ผู้รับเหมาส่งมอบให้สำนัก/กอง (พัสดุบันทึกวันส่งมอบ) · สำนัก/กองรับมอบ · คณะกรรมการตรวจรับ · สำนัก/กองส่งมอบต่อให้ อปท. หรือเจ้าของคำขอโครงการ ด้านบัญชีของงานก่อสร้าง (ขึ้นสินทรัพย์ โอนออก) อยู่ที่ทะเบียนก่อสร้างและส่งมอบ (CW1)", "The contractor delivers to the division (procurement records the date) · the division receives · the committee accepts · the division hands it on to the local authority or the owner of the request. The accounting of a built work (asset, transfer out) is in the Construction and handover register (CW1)")}</div>
    <div class="row">${tag(`${n}/${live.length} ${L("งวดส่งมอบต่อแล้ว", "phases handed on")}`, n === live.length ? "p-ok" : "p-info")}</div>
    <datalist id="hand-lgu">${(typeof CW_LGU !== "undefined" ? CW_LGU : []).map(x => `<option value="${esc(x)}">`).join("")}</datalist>
    <div class="tbl-wrap"><table><thead><tr><th>${L("งวด", "Phase")}</th><th>${L("ผู้รับเหมาส่งมอบ", "Contractor delivered")}</th><th>${L("สำนัก/กองรับมอบ", "Division received")}</th><th>${L("ตรวจรับ", "Accepted")}</th><th>${L("ส่งมอบต่อ", "Handed on")}</th></tr></thead><tbody>${live.map(ph => handRow(c, ph)).join("")}</tbody></table></div>` };
}
{
  const done = msg => { commit(); route(); toast(msg); }, find = key => { const [, cid, n] = key.split("|"), c = famCon(cid); return c ? { c, ph: c.phases.find(p => p.n === Number(n)), cs: conCase(c) } : {}; };
  document.addEventListener("submit", e => {
    const f = e.target; if (!f || !f.matches) return;
    if (f.matches("[data-hrecv]")) { e.preventDefault(); const { c, ph, cs } = find("x|" + f.dataset.hrecv), fd = new FormData(f), d = String(fd.get("d")); if (!ph || !handCan(c) || ph.recv || !ph.delivered) return;
      if (d < ph.delivered || d > TODAY) { toast(L("วันที่รับมอบต้องไม่ก่อนวันส่งมอบและไม่เกินวันนี้", "The receipt can't be before the delivery or after today")); return; }
      ph.recv = { date: d, note: String(fd.get("note") || "").trim(), by: me().id, t: nowIso() }; audit(["สำนัก/กองรับมอบงาน", "The division received a delivery"], `${c.id} ${tx(ph.name)}`); if (cs) caseLog(cs, "recv", tx(ph.name));
      notify(["proc", "prochead"], [`${c.id} ${ph.name[0]} สำนัก/กองรับมอบงานแล้ว`, `${c.id} ${ph.name[1]}: the division received the delivery`], cs ? "case:" + cs.id : "prc-contracts"); done(L("บันทึกการรับมอบแล้ว", "Receipt recorded")); return; }
    if (f.matches("[data-hhand]")) { e.preventDefault(); const { c, ph, cs } = find("x|" + f.dataset.hhand), fd = new FormData(f), g = k => String(fd.get(k) || "").trim(); if (!ph || !handCan(c) || ph.handover || !ph.recv || !phaseAccepted(ph)) return;
      const d = g("d"), acc = accDate(ph); if (d < acc || d < ph.recv.date || d > TODAY) { toast(L("วันที่ส่งมอบต่อต้องไม่ก่อนวันตรวจรับและวันรับมอบ และไม่เกินวันนี้", "The hand-over can't be before the acceptance or the receipt, or after today")); return; }
      if (!g("party") || !g("doc")) { toast(L("ระบุผู้รับมอบและเลขที่หนังสือส่งมอบ", "Give the receiver and the hand-over letter number")); return; }
      ph.handover = { to: g("to"), party: g("party"), date: d, docNo: g("doc"), note: g("note"), by: me().id, t: nowIso() }; audit(["ส่งมอบต่อให้ อปท./เจ้าของโครงการ", "Handed the work on"], `${c.id} ${tx(ph.name)} → ${g("party")}`); if (cs) caseLog(cs, "handover", `${tx(ph.name)} → ${g("party")}`);
      notify(["proc", "fin"], [`${c.id} ${ph.name[0]} ส่งมอบต่อให้ ${g("party")} แล้ว (${g("doc")})`, `${c.id} ${ph.name[1]}: handed on to ${g("party")} (${g("doc")})`], cs ? "case:" + cs.id : "prc-contracts"); done(L("บันทึกการส่งมอบต่อแล้ว", "Hand-over recorded")); return; }
  });
  document.addEventListener("click", e => {
    const b = e.target.closest && e.target.closest("[data-hundo]"); if (!b) return; const key = b.dataset.hundo, kind = key.split("|")[0], { c, ph } = find(key); if (!ph || !handCan(c)) return;
    if (kind === "recv" && !ph.handover) { ph.recv = null; audit(["ยกเลิกการรับมอบ", "Undid a receipt"], `${c.id} ${tx(ph.name)}`); done(L("ยกเลิกแล้ว", "Undone")); }
    if (kind === "hand" && !(conCase(c) || {}).close) { ph.handover = null; audit(["ยกเลิกการส่งมอบต่อ", "Undid a hand-over"], `${c.id} ${tx(ph.name)}`); done(L("ยกเลิกแล้ว", "Undone")); }
  });
  // the case cannot be closed until every live phase is handed on (cases closed before this file are not asked)
  const base = closeChecks; closeChecks = cs => { const out = base(cs), c = caseCon(cs); out.push({ ok: !c || handAll(c), label: L("สำนัก/กองส่งมอบต่อให้ อปท./เจ้าของโครงการครบทุกงวด", "Every phase is handed on to the local authority / the owner") }); return out; };
  // tasks of the division and procurement
  const bt = famTasks;
  famTasks = R => { bt(R); (S.contracts || []).forEach(c => { if (!handCan(c)) return; const cs = conCase(c), link = cs ? "case:" + cs.id : "prc-contracts"; if (cs && cs.close) return;
    handLive(c).forEach(ph => { if (ph.delivered && !ph.recv) R(`${L("รับมอบงาน", "Receive the delivery")} ${c.id} ${tx(ph.name)}`, tx(famPlan(c.plan).name), ph.delivered, link, "p-warn");
      else if (ph.recv && phaseAccepted(ph) && !ph.handover) R(`${L("ส่งมอบต่อให้ อปท./เจ้าของโครงการ", "Hand on")} ${c.id} ${tx(ph.name)}`, tx(famPlan(c.plan).name), TODAY, link, "p-info"); }); }); };
}
