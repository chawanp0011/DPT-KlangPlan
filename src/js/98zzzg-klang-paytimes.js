// KlangFinance, procurement round P24 (16 Nov 2569): payment "by occasion" (ครั้ง), seen and made on the contract and the case, with more than one phase
// in one payment ("การเบิกจ่ายจะจ่ายเป็นครั้งแทน โดยในแต่ละครั้งสามารถใส่งวดได้มากกว่า 1 งวด พร้อมรายละเอียดการเบิกจ่าย").
// What was there: the finance voucher (S.vouchers, file 66c) IS a payment request for one occasion and can already carry several accepted phases of one
// contract (v.phases, v.parts); but it could only be made on the Finance page, and the contract page and the case page showed the payment phase by phase
// (one invoice-and-payment column, one table "payment by phase"). So the user saw a payment per phase.
// Now the contract page (under the phases) and the case page (panel 6) have a block "Payments by occasion": every payment of the contract as "ครั้งที่ n" with the
// phases it holds, the amounts (gross, penalty, net), its details (what for, the payee, how it is paid, due date) and its state; and, for the finance officer
// (the maker of a voucher, as before), a form to make a new payment by ticking the accepted phases that are not in a payment yet (one or several) and giving the
// details (what for, due date, how it is paid). The voucher then goes the same way as ever (check, approval, GFMIS). The payment gate R-11 still tests each phase
// on its own (vcMake). The details can be edited on the draft until it is submitted.
const payTimes = c => (S.vouchers || []).filter(v => v.contract === c.id).slice().sort((a, b) => String(a.t).localeCompare(String(b.t)));
const payTimeNo = (c, v) => payTimes(c).indexOf(v) + 1;
const payPhasesIn = c => new Set(payTimes(c).filter(v => !["rejected", "cancelled"].includes(v.state)).flatMap(v => v.phases || [v.phase]));
const payFree = c => c.phases.filter(ph => !ph.cancelled && phaseAccepted(ph) && !payPhasesIn(c).has(ph.n) && !(S.payreqs || []).some(p => p.contract === c.id && p.phase === ph.n && p.status !== "rejected"));
const payMaker = () => isProcRole(); // P32: the procurement officer makes the payment request (it was the finance officer in P24); finance goes on from there (file 98zzzo)
const PAY_METHODS = { epay: ["จ่ายผ่านระบบอิเล็กทรอนิกส์ (e-Payment)", "Electronic payment (e-Payment)"], cheque: ["เช็ค", "Cheque"], transfer: ["โอนผ่านธนาคาร", "Bank transfer"] };
function payBlock(c) {
  const list = payTimes(c), free = payFree(c), mk = payMaker();
  return `<div class="body" id="pay-times-${c.id}" style="padding-top:0"><b style="font-weight:600">${L("การเบิกจ่ายเป็นครั้ง", "Payments by occasion")}</b>
    ${list.length ? `<div class="tbl-wrap"><table><thead><tr><th>${L("ครั้งที่", "Occasion")}</th><th>${L("งวดที่รวมในครั้งนี้", "Phases in it")}</th><th class="n">${L("ยอดรวม (บาท)", "Gross (baht)")}</th><th class="n">${L("ค่าปรับ", "Penalty")}</th><th class="n">${L("ยอดจ่ายสุทธิ", "Net")}</th><th>${L("รายละเอียด", "Details")}</th><th>${L("สถานะ", "State")}</th></tr></thead>
      <tbody>${list.map(v => { const ps = v.phases || [v.phase]; return `<tr><td><b>${L("ครั้งที่", "No.")} ${payTimeNo(c, v)}</b><div class="mono sub">${esc(v.id)}</div></td><td>${ps.map(n => esc(tx((c.phases.find(x => x.n === n) || { name: ["งวด " + n, "Phase " + n] }).name))).join(", ")}${ps.length > 1 ? ` ${tag(`${ps.length} ${L("งวด", "phases")}`, "p-info")}` : ""}</td><td class="n">${fmt(v.gross)}</td><td class="n">${fmt(v.penalty || 0)}</td><td class="n"><b>${fmt(v.gross - (v.penalty || 0))}</b></td>
        <td class="sub">${esc(tx(v.desc))} · ${esc(v.payee && v.payee.name ? tx(v.payee.name) : "")} · ${esc(tx(PAY_METHODS[v.method] || [v.method, v.method]))} · ${L("ครบกำหนด", "due")} ${fdate(v.due)}</td><td>${vTag(v)}</td></tr>`; }).join("")}</tbody></table></div>` : `<div class="sub">${L("ยังไม่มีการเบิกจ่าย", "No payment yet")}</div>`}
    ${mk ? (free.length ? `<form class="inline-form" data-paytimes="${c.id}" style="margin-top:8px;flex-wrap:wrap"><div class="f" style="flex:1 1 100%"><label>${L("เลือกงวดที่ตรวจรับแล้วเพื่อเบิกในครั้งนี้ (เลือกได้มากกว่า 1 งวด)", "Tick the accepted phases to pay in this occasion (one or more)")}</label><div class="row" style="flex-wrap:wrap">${free.map(ph => `<label class="field-inline"><input type="checkbox" name="ph" value="${ph.n}"> ${esc(tx(ph.name))} · ${fmt(ph.result === "partial" ? ph.okAmount : ph.amount)} ${L("บาท", "baht")}</label>`).join("")}</div></div>
        <div class="f" style="flex:1 1 240px"><input type="text" name="desc" placeholder="${L("รายละเอียดการเบิกจ่าย (เบิกค่าอะไร)", "What the payment is for")}" aria-label="${L("รายละเอียดการเบิกจ่าย", "Details")}"></div>
        <div class="f" style="flex:0 1 160px"><input type="date" name="due" aria-label="${L("ครบกำหนดจ่าย", "Due date")}"></div>
        <div class="f" style="flex:0 1 210px"><select name="method" aria-label="${L("วิธีจ่าย", "Method")}">${Object.keys(PAY_METHODS).map(k => `<option value="${k}">${esc(tx(PAY_METHODS[k]))}</option>`).join("")}</select></div>
        <button class="btn primary" type="submit">${L("ทำใบขอเบิกครั้งนี้", "Make this payment")}</button></form>` : `<div class="sub" style="margin-top:6px">${L("ไม่มีงวดที่ตรวจรับแล้วและยังไม่ได้เบิก", "No accepted phase is waiting to be paid")}</div>`) : `<div class="sub" style="margin-top:6px">${L("เจ้าหน้าที่การเงินเป็นผู้ทำใบขอเบิก", "The finance officer makes the payment request")}</div>`}</div>`;
}
{
  const cp = conPanel;
  conPanel = (c, part) => { const h = cp(c, part); return part === "phases" ? h + payBlock(c) : h; };
  const cep = caseExtraPanels;
  caseExtraPanels = c => { const out = cep(c), con = caseCon(c); if (con) out.push(cmPanel(6, 2, L("เบิกจ่ายเป็นครั้ง", "Payments by occasion"), payBlock(con))); return out; };
  document.addEventListener("submit", e => {
    const f = e.target; if (!f || !f.matches || !f.matches("[data-paytimes]")) return; e.preventDefault();
    const c = famCon(f.dataset.paytimes), fd = new FormData(f), ns = fd.getAll("ph").map(Number).filter(Boolean).sort((a, b) => a - b); if (!c || !payMaker()) return;
    if (!ns.length) { toast(L("เลือกงวดอย่างน้อย 1 งวด", "Tick at least one phase")); return; }
    const before = (S.vouchers || []).length; vcMake(c.id, ns[0], ns.slice(1)); const v = (S.vouchers || [])[before];
    if (!v || (S.vouchers || []).length === before) return; // vcMake already told why (a phase not accepted, no PO, the gate)
    const desc = String(fd.get("desc") || "").trim(), due = String(fd.get("due") || ""), method = String(fd.get("method") || "");
    if (desc) v.desc = [desc, desc]; if (due) v.due = due; if (PAY_METHODS[method]) v.method = method; v.log = v.log || [];
    commit(); route(); toast(L("ทำใบขอเบิกแล้ว", "Payment request made"));
  });
}
