// Fisko-KlangFinance, round P16 (16 Nov 2569): the amounts after the Budget Bureau (สงป.) come back into the request, for the draft bill and for the act.
// Where it is in the prototype (checked in the code):
//   - the Bureau's result is recorded on the submission page B6 (S.submission.results) and on the request itself (panel "Budget result and allocation");
//   - the bill in parliament is on B6, tab Parliament (S.parl: the items of the bill, the committee cuts, the appeals) and the act is in force when the last step is done;
//   - actAmount(r) is the one function every page asks for "the approved amount" (the request panel, the monthly-plan reference, the allocation lines).
// What was missing: actAmount gave the act's amount only once the act was in force; during the bill (after the committee started: cuts and appeals) it
// still gave the Bureau's result, so the draft bill's amount never reached the request, and the request did not show the steps side by side.
// Now: from the committee step the amount follows the BILL (after the cuts and the granted appeals), and when the act is in force the ACT; the request panel
// shows the amounts side by side (asked, sent to the Bureau, the Bureau's result, the bill, the act) with the latest marked, and a button updates the
// monthly plan (and so the quarters) of the request to the latest amount. The lines of the request keep what was asked (that is the history).

function actAmount(r) {
  const P = S.parl, done = P && P.stage >= PARL_STEPS.length, bill = P && P.items && P.stage >= PL_CUT;
  if ((done || bill) && typeof parlItems === "function") { const it = parlItems().find(x => x.id === r.id); if (it) return Math.round(parlFinal(it) * 1e6); }
  return S.submission.results[r.id];
}
// which source the latest amount comes from: "act", "bill" or "bureau" (null when nothing is recorded)
function actSource(r) {
  const P = S.parl, done = P && P.stage >= PARL_STEPS.length, bill = P && P.items && P.stage >= PL_CUT, inBill = typeof parlItems === "function" && !!(P && parlItems().find(x => x.id === r.id));
  if (done && inBill) return "act"; if (bill && inBill) return "bill"; return S.submission.results[r.id] != null ? "bureau" : null;
}
const AMT_SRC = { act: ["พ.ร.บ. (มีผลใช้บังคับ)", "Appropriation act (in force)"], bill: ["ร่าง พ.ร.บ. (หลังกรรมาธิการและการแปรญัตติ)", "Draft bill (after the committee and appeals)"], bureau: ["ผลพิจารณาของ สงป.", "Bureau result"] };
function amtSteps(r) {
  const P = S.parl, bureau = S.submission.results[r.id], it = typeof parlItems === "function" && P ? parlItems().find(x => x.id === r.id) : null, billOn = P && P.items && P.stage >= PL_CUT, actOn = P && P.stage >= PARL_STEPS.length;
  const billAmt = it && billOn ? Math.round(parlFinal(it) * 1e6) : null, cut = it && P && P.cuts[r.id] ? Math.round(P.cuts[r.id].amt * 1e6) : 0, app = it && P && P.appeals[r.id] && P.appeals[r.id].granted ? Math.round(P.appeals[r.id].granted * 1e6) : 0;
  return [["asked", L("ยอดที่ขอ", "Asked"), r.amount, ""], ["sent", L("ส่ง สงป. (หลังเห็นชอบภายใน)", "Sent to the Bureau (after internal approval)"), r.sub ? subAmt(r) : null, ""], ["bureau", L("ผลพิจารณาของ สงป.", "Bureau result"), bureau != null ? bureau : null, ""],
    ["bill", L("ร่าง พ.ร.บ.", "Draft bill"), billAmt, billAmt != null ? `${cut ? `${L("ปรับลด", "cut")} ${fmt(cut)} ` : ""}${app ? `${L("คืน", "restored")} ${fmt(app)}` : ""}`.trim() : ""], ["act", L("พ.ร.บ. (มีผลใช้บังคับ)", "Appropriation act (in force)"), actOn && billAmt != null ? billAmt : null, ""]];
}
{
  const base = rqFundPanel;
  rqFundPanel = function (r) {
    const html = base(r); if (!html) return html; const src = actSource(r), st = amtSteps(r), latest = src ? actAmount(r) : null, R = typeof rqpMonthRights === "function" ? rqpMonthRights(r) : { plan: false };
    const tbl = `<div class="tbl-wrap" id="rq-amt" style="margin-top:8px"><table><thead><tr><th>${L("ขั้นตอน", "Step")}</th><th class="n">${L("ยอด (บาท)", "Amount (baht)")}</th><th class="n">${L("ต่างจากยอดที่ขอ", "Against the amount asked")}</th><th>${L("หมายเหตุ", "Note")}</th></tr></thead><tbody>${st.map(([k, l, v, n]) => `<tr${src === k ? ' style="background:var(--ok-soft)"' : ""}><td>${l}${src === k ? ` ${tag(L("ยอดล่าสุด", "latest"), "p-ok")}` : ""}</td><td class="n">${v == null ? "–" : fmt(v)}</td><td class="n">${v == null || k === "asked" ? "–" : `${v - r.amount >= 0 ? "+" : ""}${fmt(v - r.amount)}`}</td><td class="sub">${esc(n)}</td></tr>`).join("")}</tbody></table></div>
      <p class="sub">${src ? `${L("ยอดล่าสุดมาจาก", "The latest amount comes from")} <b>${tx(AMT_SRC[src])}</b> ${L("และใช้เป็นยอดอ้างอิงของแผนเงินและการจัดสรร", "and is the reference of the money plan and the allocation")}` : L("ยังไม่มีผลพิจารณาจาก สงป.", "No Bureau result yet")}</p>
      ${src && R.plan && latest != null ? `<div class="row"><button class="btn primary" type="button" id="rf-replan" ${Math.abs(rqMSum(r.mplan) - latest) < 1 ? "disabled" : ""}>${L("ปรับแผนเงินรายเดือนตามยอดล่าสุด", "Update the monthly plan to the latest amount")}</button><span class="sub">${Math.abs(rqMSum(r.mplan) - latest) < 1 ? L("แผนเงินเท่ายอดล่าสุดแล้ว", "The plan already equals it") : `${L("แผนปัจจุบันรวม", "Plan now")} ${fmt(rqMSum(r.mplan))}`}</span></div>` : ""}`;
    return html.replace(/<\/div><\/section>\s*$/, `${tbl}</div></section>`);
  };
}
document.addEventListener("click", e => {
  const b = e.target.closest && e.target.closest("#rf-replan"); if (!b) return; const r = curReq(); if (!r) return; const t = actAmount(r); if (t == null) return;
  r.mplan = rqMSum(r.mplan) > 0 ? rqMonthFill(r, "scale") : rqMonthFill(r, "even"); if (typeof rqSyncQ === "function") rqSyncQ(r); audit(["ปรับแผนเงินรายเดือนตามยอดล่าสุด", "Updated the monthly plan to the latest amount"], `${r.id} ${fmt(t)}`); commit(); route(); toast(L("ปรับแผนเงินตามยอดล่าสุดแล้ว", "Monthly plan updated to the latest amount"));
});
