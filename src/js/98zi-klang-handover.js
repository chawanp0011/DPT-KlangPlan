// KlangFinance, procurement round P6 (13 Nov 2569): the delivery chain after the contract, as status of the project.
// Checked first: the project already had the contractor's delivery date (ph.delivered, recorded by procurement) and the committee's acceptance, but
// nothing for the two hand-overs the user named: (1) the contractor hands the work to the division, (2) the division hands it on to the local
// authority (อปท.) or to the owner of the request. The accounting side of a built work (asset, transfer out of GFMIS) is in the Construction
// and handover register (CW1, file 96) and stays there; this file keeps the project's own status.
// Per phase:
//   ph.delivered   the contractor delivered (as before; procurement records the date)
//   ph.recv        the division received it: { date, note, by, t }   (new)
//   acceptance     the committee accepted it (as before)
//   ph.handover    the division handed it on: { to: "lgu" | "owner", party, date, docNo, note, by, t }   (new)
// Order: delivered -> received -> accepted ... the project is closed (all paid, guarantee back, supplier rated) -> handed on.
// Corrected 16 Nov 2569 on the user's word: the hand-on to the local authority / the owner comes AFTER the procurement case is closed, and it is the
// procurement officer who does it. So it is the last step of the Close panel (7), no longer part of contract management and no longer a check for closing.
// Receiving (division) still needs the delivery. Handing on needs a closed case and the acceptance of the phase.
Object.assign(CASE_EV, { recv: ["สำนัก/กองรับมอบงาน", "The division received the delivery"], handover: ["ส่งมอบต่อให้ อปท./เจ้าของโครงการ", "Handed on to the local authority / the owner"] });
const HAND_TO = { lgu: ["องค์กรปกครองส่วนท้องถิ่น (อปท.)", "Local authority (LGU)"], owner: ["เจ้าของคำขอโครงการ / ผู้ใช้งาน", "Owner of the request / the user"] };
const handCan = c => !!c && (isProcRole() || (["div", "divhead"].includes(ROLE) && me().unit === varUnit(c))); // receiving the delivery
const handClosed = c => !!(conCase(c) || {}).close;
const handDo = c => !!c && isProcRole() && handClosed(c); // handing on: procurement, after the close
const handLive = c => c.phases.filter(ph => !ph.cancelled);
const handAll = c => !!c.handover; // 16 Nov 2569 (round P22, file 98zzze): the hand-over onward is for the whole project, one record on the contract
const handOwnerName = c => { const rq = caseReq(conCase(c) || {}); return rq ? `${userName(rq.by)} · ${unitName(varUnit(c))}` : unitName(varUnit(c)); };
function handStatus(ph) { return ph.handover ? "handed" : !phaseAccepted(ph) ? (ph.recv ? "recv" : ph.delivered ? "delivered" : "none") : ph.recv ? "ready" : "accepted"; }
const handMin = (c, accDt) => { const cl = (conCase(c) || {}).close; const d = cl && cl.t ? String(cl.t).slice(0, 10) : ""; return d > (accDt || "") ? d : accDt || ""; };
function handRow(c, ph) {
  const can = handCan(c), accDt = phaseAccepted(ph) ? accDate(ph) : "";
  const recv = ph.recv ? `${tag(L("รับมอบแล้ว", "Received"), "p-ok")} <span class="sub">${fdate(ph.recv.date)} · ${esc(userName(ph.recv.by))}${ph.recv.note ? " · " + esc(ph.recv.note) : ""}</span>${can && !ph.handover ? ` <button class="btn ghost" type="button" data-hundo="recv|${c.id}|${ph.n}" aria-label="${L("ยกเลิกการรับมอบ", "Undo the receipt")}">×</button>` : ""}`
    : ph.delivered ? (can ? `<form class="inline-form" data-hrecv="${c.id}|${ph.n}" style="margin:0"><div class="f" style="flex:0 1 150px"><input type="date" name="d" value="${TODAY}" min="${ph.delivered}" max="${TODAY}" required aria-label="${L("วันที่รับมอบ", "Date received")}"></div><div class="f" style="flex:1 1 140px"><input type="text" name="note" placeholder="${L("หมายเหตุ", "Note")}"></div><button class="btn" type="submit">${L("รับมอบงาน", "Receive")}</button></form>` : tag(L("รอสำนัก/กองรับมอบ", "Waiting for the division"), "p-warn")) : `<span class="sub">${L("รอผู้รับเหมาส่งมอบ", "Waiting for the delivery")}</span>`;
  const hand = ph.handover ? `${tag(L("ส่งมอบต่อแล้ว", "Handed on"), "p-ok")} <span class="sub">${esc(tx(HAND_TO[ph.handover.to]))} · ${esc(ph.handover.party)} · ${fdate(ph.handover.date)} · ${esc(ph.handover.docNo)}${ph.handover.note ? " · " + esc(ph.handover.note) : ""}</span>${isProcRole() ? ` <button class="btn ghost" type="button" data-hundo="hand|${c.id}|${ph.n}" aria-label="${L("ยกเลิกการส่งมอบต่อ", "Undo the hand-over")}">×</button>` : ""}`
    : !handClosed(c) ? `<span class="sub">${L("หลังปิดการจัดซื้อ", "After the case is closed")}</span>` : !phaseAccepted(ph) ? `<span class="sub">${L("หลังตรวจรับ", "After acceptance")}</span>`
    : handDo(c) ? `<form class="inline-form" data-hhand="${c.id}|${ph.n}" style="margin:0"><div class="f" style="flex:0 1 190px"><select name="to" aria-label="${L("ส่งมอบให้", "Hand over to")}">${Object.keys(HAND_TO).map(k => `<option value="${k}">${esc(tx(HAND_TO[k]))}</option>`).join("")}</select></div>
        <div class="f" style="flex:1 1 200px"><input type="text" name="party" list="hand-lgu" value="${esc(handOwnerName(c))}" placeholder="${L("ผู้รับมอบ (ชื่อ อปท. หรือผู้ใช้งาน)", "Receiver (LGU name or user)")}" required></div><div class="f" style="flex:0 1 150px"><input type="date" name="d" value="${TODAY}" min="${handMin(c, accDt)}" max="${TODAY}" required></div>
        <div class="f" style="flex:1 1 150px"><input type="text" name="doc" placeholder="${L("เลขที่หนังสือส่งมอบ", "Hand-over letter no.")}" required></div><div class="f" style="flex:1 1 140px"><input type="text" name="note" placeholder="${L("หมายเหตุ", "Note")}"></div><button class="btn primary" type="submit">${L("ส่งมอบต่อ", "Hand on")}</button></form>`
    : tag(L("รอเจ้าหน้าที่พัสดุส่งมอบต่อ", "Waiting for procurement"), "p-warn");
  return `<tr><td>${tx(ph.name)}</td><td>${ph.delivered ? fdate(ph.delivered) : "—"}</td><td>${recv}</td><td>${ph.cancelled ? "" : phaseAccepted(ph) ? tag(L("ตรวจรับแล้ว", "Accepted"), "p-ok") : tag(L("ยังไม่ตรวจรับ", "Not yet"), "p-mute")}</td><td>${hand}</td></tr>`;
}
function handPanel(cs) {
  const c = caseCon(cs); if (!c) return null; const live = handLive(c), n = live.filter(ph => ph.handover).length;
  return { title: L("ส่งมอบต่อให้ อปท. / เจ้าของโครงการ (หลังปิดการจัดซื้อ)", "Hand-over to the local authority / the owner (after the close)"), body: `<div class="sub">${L("เมื่อปิดการจัดซื้อจัดจ้างเรียบร้อยแล้ว เจ้าหน้าที่พัสดุส่งมอบงานต่อให้ อปท. หรือเจ้าของโครงการ (บันทึกผู้รับมอบ เลขที่หนังสือ วันที่) ก่อนหน้านั้น ผู้รับเหมาส่งมอบให้สำนัก/กอง สำนัก/กองรับมอบ และคณะกรรมการตรวจรับ ด้านบัญชีของงานก่อสร้าง (ขึ้นสินทรัพย์ โอนออก) อยู่ที่ทะเบียนก่อสร้างและส่งมอบ (CW1)", "When the procurement case is closed, the procurement officer hands the work on to the local authority or the owner of the project (receiver, letter number, date). Before that the contractor delivers to the division, the division receives and the committee accepts. The accounting of a built work (asset, transfer out) is in the Construction and handover register (CW1)")}</div>
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
    if (f.matches("[data-hhand]")) { e.preventDefault(); const { c, ph, cs } = find("x|" + f.dataset.hhand), fd = new FormData(f), g = k => String(fd.get(k) || "").trim(); if (!ph || !handDo(c) || ph.handover || !phaseAccepted(ph)) return;
      const d = g("d"); if (d < handMin(c, accDate(ph)) || d > TODAY) { toast(L("วันที่ส่งมอบต่อต้องไม่ก่อนวันตรวจรับและวันปิดการจัดซื้อ และไม่เกินวันนี้", "The hand-over can't be before the acceptance or the close, or after today")); return; }
      if (!g("party") || !g("doc")) { toast(L("ระบุผู้รับมอบและเลขที่หนังสือส่งมอบ", "Give the receiver and the hand-over letter number")); return; }
      ph.handover = { to: g("to"), party: g("party"), date: d, docNo: g("doc"), note: g("note"), by: me().id, t: nowIso() }; audit(["ส่งมอบต่อให้ อปท./เจ้าของโครงการ", "Handed the work on"], `${c.id} ${tx(ph.name)} → ${g("party")}`); if (cs) caseLog(cs, "handover", `${tx(ph.name)} → ${g("party")}`);
      notify(["div", "divhead", "fin"], [`${c.id} ${ph.name[0]} ส่งมอบต่อให้ ${g("party")} แล้ว (${g("doc")})`, `${c.id} ${ph.name[1]}: handed on to ${g("party")} (${g("doc")})`], cs ? "case:" + cs.id : "prc-contracts"); done(L("บันทึกการส่งมอบต่อแล้ว", "Hand-over recorded")); return; }
  });
  document.addEventListener("click", e => {
    const b = e.target.closest && e.target.closest("[data-hundo]"); if (!b) return; const key = b.dataset.hundo, kind = key.split("|")[0], { c, ph } = find(key); if (!ph || !(kind === "hand" ? handDo(c) : handCan(c))) return;
    if (kind === "recv" && !ph.handover) { ph.recv = null; audit(["ยกเลิกการรับมอบ", "Undid a receipt"], `${c.id} ${tx(ph.name)}`); done(L("ยกเลิกแล้ว", "Undone")); }
    if (kind === "hand") { ph.handover = null; audit(["ยกเลิกการส่งมอบต่อ", "Undid a hand-over"], `${c.id} ${tx(ph.name)}`); done(L("ยกเลิกแล้ว", "Undone")); }
  });
  // tasks of the division and procurement
  const bt = famTasks;
  famTasks = R => { bt(R); (S.contracts || []).forEach(c => { const cs = conCase(c), link = cs ? "case:" + cs.id : "prc-contracts";
    if (handDo(c)) { handLive(c).forEach(ph => { if (phaseAccepted(ph) && !ph.handover) R(`${L("ส่งมอบต่อให้ อปท./เจ้าของโครงการ", "Hand on")} ${c.id} ${tx(ph.name)}`, tx(famPlan(c.plan).name), TODAY, link, "p-info"); }); return; }
    if (!handCan(c) || (cs && cs.close)) return;
    handLive(c).forEach(ph => { if (ph.delivered && !ph.recv) R(`${L("รับมอบงาน", "Receive the delivery")} ${c.id} ${tx(ph.name)}`, tx(famPlan(c.plan).name), ph.delivered, link, "p-warn");
    }); }); };
}

// sample data: phases that were already accepted before this round count as received (legacy); the ones of a CLOSED case also count as handed on (the hand-on comes after the close)
Object.keys(SEEDS).forEach(k => {
  const prev = SEEDS[k].seed;
  SEEDS[k].seed = () => {
    const s = prev(); { const np = (s.pplan || []).filter(p => /^ข้อมูลตัวอย่าง แผงที่ 1 /.test(p.name[0])).map(p => p.id); if (s.planDoc && np.length) s.planDoc.versions.forEach(v => (v.items = v.items.filter(x => !np.includes(x.id)))); } // the panel-1 sample is not in the plan yet
    const closedK = new Set((s.cases || []).filter(x => x.close && x.contract).map(x => x.contract));
    (s.contracts || []).forEach(c => (c.phases || []).forEach(ph => { const need = (c.inspectors || []).length; if (need && (ph.signs || []).length >= need && (!ph.recv || (closedK.has(c.id) && !ph.handover))) { const last = ph.signs.map(x => String(x.t).slice(0, 10)).sort().pop(), d = ph.delivered && ph.delivered <= last ? ph.delivered : last, by = ph.signs[0].by;
      if (!ph.recv) ph.recv = { date: d, note: "", by, t: d + "T09:00:00", legacy: true }; if (closedK.has(c.id)) ph.handover = { to: "lgu", party: "ผู้รับมอบตัวอย่าง", date: last, docNo: "ข้อมูลตัวอย่าง", note: "", by, t: last + "T16:00:00", legacy: true }; } }));
    return s;
  };
});
