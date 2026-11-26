// KlangFinance, budget round Q4e (12 Nov 2569): the kind of request.
//  A request is either a single-year item or a multi-year commitment item. The new-request form asks for it and the main
//  tab of the request has a select for it (it was only a button on the multi-year tab). Going back to single-year is refused
//  while a later year still holds an amount.
// Changed on 13 Nov 2569, at the user's word ("the register of multi-year commitments: we don't need this register"):
//  the register of commitments (page BQ6), its rows (S.commits), the "pull the commitments of earlier years in as starting
//  requests" button and the notice on the request list are removed. Only the kind of request stays. The prototype keeps no
//  earlier year's requests, so without the register there is nothing to pull from; if a source is wanted again (a file from
//  the earlier year, or the earlier year's requests), it has to be added.

// ---------- the kind of request on the main tab ----------
const RQ_KINDS = { year: ["รายการปีเดียว", "Single-year item"], multi: ["รายการผูกพัน", "Multi-year commitment item"] };
function rqKindRow(r, ed) {
  return `<div class="f full"><label for="rq-kind">${L("ประเภทคำขอ", "Kind of request")}</label><div class="row">${ed ? `<select id="rq-kind" aria-label="${L("ประเภทคำขอ", "Kind of request")}">${Object.keys(RQ_KINDS).map(k => `<option value="${k}" ${(r.multi ? "multi" : "year") === k ? "selected" : ""}>${esc(tx(RQ_KINDS[k]))}</option>`).join("")}</select>` : `<span>${r.multi ? tag(tx(RQ_KINDS.multi), "p-info") : tag(tx(RQ_KINDS.year), "p-mute")}</span>`}
    <span class="sub">${r.multi ? L("แบ่งวงเงินตามปีที่แท็บ ผูกพันหลายปี", "Split the amount by year on the Multi-year tab") : L("เลือก รายการผูกพัน ถ้าต้องก่อหนี้ข้ามปีงบประมาณ", "Choose the commitment kind if it commits money across fiscal years")}</span></div></div>`;
}
function mcSetKind(r, kind) {
  if (kind === "multi" && !r.multi) { r.multi = true; r.years = r.years || { [FORM_FY]: r.amount, [FORM_FY + 1]: 0 }; audit(["เปลี่ยนเป็นคำขอผูกพัน", "Made the request a multi-year commitment"], r.id); return ""; }
  if (kind === "year" && r.multi) { const later = Object.keys(r.years || {}).filter(y => Number(y) > FORM_FY && Number(r.years[y]) > 0); if (later.length) return L(`ปี ${later.join(", ")} ยังมีวงเงิน ล้างที่แท็บผูกพันหลายปีก่อน`, `Year ${later.join(", ")} still holds an amount; clear it on the Multi-year tab first`); r.multi = false; delete r.years; audit(["เปลี่ยนเป็นคำขอปีเดียว", "Made the request single-year"], r.id); return ""; }
  return "";
}
{ // bind the select on the main tab of a request
  const bb = BIND.request;
  BIND.request = () => { bb(); const r = curReq(); if (!r || REQ_TAB !== "main") return; const k = $("#rq-kind"); if (k) k.onchange = e => { const m = mcSetKind(r, e.target.value); if (m) { toast(m); route(); return; } save(); route(); }; };
}
