// KlangFinance, procurement round P29 (17 Nov 2569), corrected on 17 Nov 2569 (P32): the payment request is made by PROCUREMENT, with the phases it pays and its details.
// The user's words: "เจ้าหน้าที่พัสดุ สร้างรายการเบิกจ่าย · การเบิกจ่ายระบุจำนวนงวดว่าเบิกจ่ายงวดไหนบ้าง · ระบุรายละเอียดอื่นๆที่เกี่ยวกับการเบิกจ่าย".
// Round P24 (file 98zzzg) let the FINANCE officer make the occasion; the first version of this file kept that. Now:
//   1. WHO: the procurement officer (proc, prochead) makes the payment request on the contract page (under the phases) and on the case page (panel 6). It reaches the finance officer as a
//      draft voucher (v.reqBy, v.reqT = who and when; v.maker stays empty until finance takes it): finance prepares it (tax, amounts), sends it for checking, and the checking, the approval,
//      GFMIS and the payment are as ever (file 66c). The payment gate R-11 is tested for each phase by vcMake as before. Finance reads the block and may add documents or move the date.
//   2. THE PHASES: the form says how many phases are paid and which ("เบิก 2 งวด: งวดที่ 1, 2" and the amount of each), and a button makes one occasion for every accepted phase at once (auto).
//      Each occasion shows "ครั้งที่ n", the phases (the number of phases and their names, "งวดที่ x จาก N"), the amounts (gross, penalty, net).
//   3. THE DETAILS: the date of the request (not in the future, not before the last acceptance), what it is for, the payee with the tax ID and the bank account of the vendor register,
//      the invoice and the tax invoice numbers, the due date, how it is paid, a note, and the documents (the invoice, delivery, acceptance, contract copy and guarantee are attached
//      from what the contract holds, marked auto; others can be added or taken off until the occasion is paid or cancelled).
const PAY_DOCK = { invoice: ["ใบแจ้งหนี้", "Invoice"], delivery: ["ใบส่งมอบงาน", "Delivery note"], accept: ["ใบตรวจรับพัสดุ/งาน", "Acceptance certificate"], contract: ["สำเนาสัญญา", "Contract copy"], guarantee: ["หลักประกันสัญญา", "Contract guarantee"], tax: ["ใบกำกับภาษี", "Tax invoice"], letter: ["หนังสือเรียกเก็บเงิน", "Payment letter"], other: ["เอกสารอื่น", "Other document"] };
const payDateOf = v => v.payDate || String(v.t || "").slice(0, 10);
const payPhasesOf = v => v.phases || [v.phase];
const payNetOf = v => v.gross - (v.penalty || 0);
const payEdit = () => payMaker() || ROLE === "fin"; // procurement makes; finance may also add documents and move the date
function payDocsAuto(c, ns) { // what the contract already holds for these phases, as the documents of the occasion
  const out = [];
  ns.forEach(n => { const ph = c.phases.find(x => x.n === n); if (!ph) return;
    if (ph.invoice) out.push({ k: "invoice", no: ph.invoice.no || "", date: String(ph.invoice.date || "").slice(0, 10), ph: n, auto: true });
    if (ph.delivered || ph.recv) out.push({ k: "delivery", no: "", date: String(ph.delivered || (ph.recv && ph.recv.date) || "").slice(0, 10), ph: n, auto: true });
    if (phaseAccepted(ph)) out.push({ k: "accept", no: tx(ph.name), date: accDate(ph), ph: n, auto: true }); });
  out.push({ k: "contract", no: c.no || c.id, date: String(c.signed || "").slice(0, 10), auto: true });
  if (c.guarantee) out.push({ k: "guarantee", no: c.guarantee.no || "", date: String(c.guarantee.t || "").slice(0, 10), auto: true });
  return out;
}
const payDocsOf = (c, v) => (v.docs ? v.docs : payDocsAuto(c, payPhasesOf(v))); // an occasion made before this round shows what the contract holds
const payLastAcc = (c, ns) => ns.map(n => { const ph = c.phases.find(x => x.n === n); return ph && ph.signs && ph.signs.length ? accDate(ph) : ""; }).sort().pop() || "";
const payPhaseNames = (c, ns) => ns.map(n => tx((c.phases.find(x => x.n === n) || { name: ["งวด " + n, "Phase " + n] }).name)).join(", ");
const payBank = c => { const vd = vendorBy(Array.isArray(c.vendor) ? c.vendor[0] : c.vendor); return vd && vd.bank && (vd.bank.name || vd.bank.acc) ? { name: vd.bank.name || "", branch: vd.bank.branch || "", acc: vd.bank.acc || "" } : null; };
// the shared rules; each returns "" when it worked, else the reason
function payMake(c, ns, o) {
  o = o || {}; if (!payMaker()) return L("เจ้าหน้าที่พัสดุเป็นผู้สร้างรายการเบิกจ่าย", "The procurement officer makes the payment request");
  ns = [...new Set(ns)].sort((a, b) => a - b); if (!c || !ns.length) return L("เลือกงวดที่เบิกอย่างน้อย 1 งวด", "Tick at least one phase to pay");
  const free = payFree(c).map(p => p.n); if (ns.some(n => !free.includes(n))) return L("งวดที่เลือกยังตรวจรับไม่ครบหรือเบิกไปแล้ว", "A chosen phase is not accepted or is already paid");
  const date = o.date || TODAY; if (date > TODAY) return L("วันที่เบิกเป็นวันในอนาคตไม่ได้", "The payment date can't be in the future"); if (payLastAcc(c, ns) && date < payLastAcc(c, ns)) return L("วันที่เบิกต้องไม่ก่อนวันตรวจรับ", "The payment date can't be before the acceptance");
  const before = (S.vouchers || []).length; vcMake(c.id, ns[0], ns.slice(1)); const v = (S.vouchers || [])[before];
  if (!v || (S.vouchers || []).length === before) return L("ทำใบขอเบิกไม่ได้ (ดูเหตุผลที่แจ้ง)", "The payment request could not be made (see the reason given)");
  const desc = (o.desc || "").trim() || `${L("เบิกค่า", "Payment for")} ${payPhaseNames(c, ns)} ${L("ตามสัญญา", "under contract")} ${c.no || c.id}`;
  v.desc = [desc, desc]; v.payDate = date; v.docs = payDocsAuto(c, ns); if (o.due) v.due = o.due; if (PAY_METHODS[o.method]) v.method = o.method; v.log = v.log || [];
  v.reqBy = me().id; v.reqT = nowIso(); v.maker = ""; // finance takes it from here
  v.taxInv = String(o.taxInv || "").trim().slice(0, 40); v.note = String(o.note || "").trim().slice(0, 300); v.bank = payBank(c);
  audit(["พัสดุสร้างรายการเบิกจ่าย", "Procurement made a payment request"], `${c.id} · ${L("ครั้งที่", "no.")} ${payTimeNo(c, v)} · ${L("งวด", "phases")} ${ns.join(",")}`);
  notify(["fin", "finhead"], [`พัสดุขอเบิกจ่ายสัญญา ${c.no || c.id} ครั้งที่ ${payTimeNo(c, v)} (${ns.length} งวด) รอการเงินดำเนินการ`, `Procurement asked for a payment on ${c.no || c.id}, no. ${payTimeNo(c, v)} (${ns.length} phases)`], "fnc-pay"); return "";
}
function payAutoAll(c) { // one occasion for every accepted phase that is not in one yet; returns how many were made
  let n = 0; payFree(c).map(p => p.n).forEach(k => { if (payMake(c, [k], { auto: true }) === "") n++; }); return n;
}
function payDocAdd(c, v, kind, no, date) {
  if (!payEdit()) return L("เจ้าหน้าที่พัสดุหรือการเงินเป็นผู้แก้", "Procurement or finance edits this"); if (!v || ["paid", "cancelled", "rejected"].includes(v.state)) return L("ครั้งนี้จ่ายแล้วหรือยกเลิกแล้ว แก้เอกสารไม่ได้", "This occasion is paid or cancelled");
  if (!PAY_DOCK[kind]) return L("ชนิดเอกสารไม่ถูกต้อง", "The kind of document is not valid"); if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > TODAY)) return L("วันที่เอกสารไม่ถูกต้อง", "The document date is not valid");
  v.docs = (v.docs || payDocsAuto(c, payPhasesOf(v))).concat([{ k: kind, no: String(no || "").trim().slice(0, 60), date: date || "", auto: false }]); audit(["เพิ่มเอกสารของการเบิก", "Added a document to a payment"], `${v.id} · ${kind}`); return "";
}
function payDocDel(c, v, i) {
  if (!payEdit()) return L("เจ้าหน้าที่พัสดุหรือการเงินเป็นผู้แก้", "Procurement or finance edits this"); if (!v || ["paid", "cancelled", "rejected"].includes(v.state)) return L("ครั้งนี้จ่ายแล้วหรือยกเลิกแล้ว แก้เอกสารไม่ได้", "This occasion is paid or cancelled");
  const d = payDocsOf(c, v); if (!d[i]) return L("ไม่พบเอกสาร", "Document not found"); v.docs = d.filter((_, j) => j !== i); audit(["เอาเอกสารของการเบิกออก", "Removed a document of a payment"], `${v.id} · ${d[i].k}`); return "";
}
function payDateSet(c, v, date) {
  if (!payEdit()) return L("เจ้าหน้าที่พัสดุหรือการเงินเป็นผู้แก้", "Procurement or finance edits this"); if (!v || ["paid", "cancelled", "rejected"].includes(v.state)) return L("ครั้งนี้จ่ายแล้วหรือยกเลิกแล้ว แก้วันที่ไม่ได้", "This occasion is paid or cancelled");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) return L("วันที่ไม่ถูกต้อง", "The date is not valid"); if (date > TODAY) return L("วันที่เบิกเป็นวันในอนาคตไม่ได้", "The payment date can't be in the future"); const a = payLastAcc(c, payPhasesOf(v)); if (a && date < a) return L("วันที่เบิกต้องไม่ก่อนวันตรวจรับ", "The payment date can't be before the acceptance");
  v.payDate = date; audit(["แก้วันที่เบิก", "Changed the payment date"], `${v.id} · ${date}`); return "";
}
payBlock = function (c) {
  const list = payTimes(c), free = payFree(c), mk = payMaker(), tot = list.filter(v => !["rejected", "cancelled"].includes(v.state)), live = c.phases.filter(ph => !ph.cancelled), bank = payBank(c);
  const docTag = d => `<span class="pill p-mute" style="margin:0 4px 4px 0;white-space:normal">${esc(tx(PAY_DOCK[d.k]))}${d.no ? " " + esc(d.no) : ""}${d.date ? ` · ${fdate(d.date)}` : ""}${d.ph ? ` · ${L("งวด", "ph.")} ${d.ph}` : ""}${d.auto ? ` <span class="sub">${L("อัตโนมัติ", "auto")}</span>` : ""}</span>`;
  const row = v => { const ps = payPhasesOf(v), docs = payDocsOf(c, v), open = payEdit() && !["paid", "cancelled", "rejected"].includes(v.state), rq = v.reqBy ? userName(v.reqBy) : "", bk = v.bank || payBank(c);
    return `<tr data-payrow="${v.id}"><td><b>${L("ครั้งที่", "No.")} ${payTimeNo(c, v)}</b><div class="mono sub">${esc(v.id)}</div></td>
      <td>${open ? `<input type="date" data-paydate="${c.id}|${v.id}" value="${payDateOf(v)}" max="${TODAY}" aria-label="${L("วันที่เบิก", "Payment date")} ${esc(v.id)}">` : fdate(payDateOf(v))}</td>
      <td><b>${ps.length} ${L("งวด", ps.length === 1 ? "phase" : "phases")}</b> <span class="sub">${L("จาก", "of")} ${live.length}</span><div>${esc(payPhaseNames(c, ps))}</div></td>
      <td class="n">${fmt(v.gross)}</td><td class="n">${fmt(v.penalty || 0)}</td><td class="n"><b>${fmt(payNetOf(v))}</b></td>
      <td>${esc(v.payee && v.payee.name ? tx(v.payee.name) : "")}<div class="sub mono">${esc(v.payee && v.payee.taxId || "")}</div>${bk && (bk.name || bk.acc) ? `<div class="sub">${esc(bk.name || "")} ${esc(bk.branch || "")} · <span class="mono">${esc(bk.acc || "")}</span></div>` : ""}</td>
      <td style="white-space:nowrap"><button class="btn" type="button" data-paydocs="${c.id}|${v.id}" aria-label="${L("ดูเอกสาร", "See the documents")} ${esc(v.id)}">📎 ${docs.length} ${L("เอกสาร", "documents")}</button>
        ${open ? `<details><summary class="sub" style="cursor:pointer">${L("เพิ่มเอกสาร", "Add a document")}</summary><form class="inline-form" data-paydoc="${c.id}|${v.id}" style="margin-top:4px"><div class="f" style="flex:0 1 190px"><select name="k">${Object.keys(PAY_DOCK).map(k => `<option value="${k}">${esc(tx(PAY_DOCK[k]))}</option>`).join("")}</select></div><div class="f" style="flex:0 1 150px"><input type="text" name="no" placeholder="${L("เลขที่", "No.")}"></div><div class="f" style="flex:0 1 150px"><input type="date" name="date" max="${TODAY}"></div><button class="btn" type="submit">${L("เพิ่ม", "Add")}</button></form></details>` : ""}</td>
      <td class="sub">${esc(tx(v.desc))} · ${esc(tx(PAY_METHODS[v.method] || [v.method, v.method]))} · ${L("ครบกำหนด", "due")} ${fdate(v.due)}${v.taxInv ? ` · ${L("ใบกำกับภาษี", "tax inv.")} ${esc(v.taxInv)}` : ""}${v.note ? `<div>${esc(v.note)}</div>` : ""}</td>
      <td class="sub">${rq ? `${L("พัสดุ", "Procurement")}: ${esc(rq)}<div>${v.reqT ? fdate(v.reqT, true) : ""}</div>` : "–"}${v.maker ? `<div>${L("การเงิน", "Finance")}: ${esc(userName(v.maker))}</div>` : `<div>${tag(L("รอการเงินรับเรื่อง", "Waiting for finance"), "p-warn")}</div>`}</td><td>${vTag(v)}</td></tr>`; };
  return `<div class="body" id="pay-times-${c.id}" style="padding-top:0"><div class="row" style="flex-wrap:wrap"><b style="font-weight:600">${L("การเบิกจ่ายเป็นครั้ง", "Payments by occasion")}</b><span class="sub">${tot.length} ${L("ครั้ง", "occasions")} · ${L("เบิกแล้วรวม", "asked in all")} ${new Set(tot.flatMap(payPhasesOf)).size}/${live.length} ${L("งวด", "phases")} · ${L("ยอดสุทธิรวม", "net")} ${fmt(sumv(tot.map(payNetOf)))} ${L("บาท", "baht")}</span></div>
    <div class="sub">${L("เจ้าหน้าที่พัสดุสร้างรายการเบิกจ่ายและระบุว่าเบิกงวดไหน แล้วการเงินรับไปตรวจและจ่าย", "The procurement officer makes the payment request and says which phases it pays; finance then checks and pays it")}</div>
    ${list.length ? `<div class="tbl-wrap"><table><thead><tr><th>${L("ครั้งที่", "Occasion")}</th><th>${L("วันที่เบิก", "Date")}</th><th>${L("เบิกงวดที่", "Phases paid")}</th><th class="n">${L("ยอดรวม (บาท)", "Gross (baht)")}</th><th class="n">${L("ค่าปรับ", "Penalty")}</th><th class="n">${L("จำนวนเงินสุทธิ", "Net")}</th><th>${L("ผู้รับเงินและบัญชี", "Payee and account")}</th><th>${L("เอกสาร", "Documents")}</th><th>${L("รายละเอียด", "Details")}</th><th>${L("ผู้ดำเนินการ", "Handled by")}</th><th>${L("สถานะ", "State")}</th></tr></thead><tbody>${list.map(row).join("")}</tbody></table></div>` : `<div class="sub">${L("ยังไม่มีการเบิกจ่าย", "No payment yet")}</div>`}
    ${mk ? (free.length ? `<div class="row" style="margin-top:8px;flex-wrap:wrap"><button class="btn primary" type="button" data-payauto="${c.id}">${L("สร้างรายการเบิกจ่ายอัตโนมัติ", "Make the payment requests automatically")} (${free.length} ${L("งวดที่ตรวจรับแล้ว", "accepted phases")})</button><span class="sub">${L("ระบบสร้างครั้งที่ให้ทีละงวด ใส่วันที่ ยอด ผู้รับเงิน บัญชี และเอกสารที่สัญญามีอยู่แล้ว", "One occasion for each phase, with the date, the amount, the payee, the account and the documents the contract already holds")}</span></div>
        <form class="inline-form" data-paytimes2="${c.id}" style="margin-top:8px;flex-wrap:wrap"><div class="f" style="flex:1 1 100%"><label>${L("เบิกงวดไหนบ้าง (เลือกงวดที่ตรวจรับแล้ว เลือกได้มากกว่า 1 งวดรวมเป็นครั้งเดียว)", "Which phases to pay (accepted ones; several phases make one occasion)")}</label><div class="row" style="flex-wrap:wrap">${free.map(ph => `<label class="field-inline"><input type="checkbox" name="ph" value="${ph.n}"> ${esc(tx(ph.name))} · ${fmt(ph.result === "partial" ? ph.okAmount : ph.amount)} ${L("บาท", "baht")}</label>`).join("")}</div><div class="sub" data-paysum="${c.id}">${L("ยังไม่ได้เลือกงวด", "No phase chosen yet")}</div></div>
          <div class="f" style="flex:0 1 160px"><label>${L("วันที่เบิก", "Payment date")}</label><input type="date" name="date" value="${TODAY}" max="${TODAY}"></div>
          <div class="f" style="flex:1 1 240px"><label>${L("รายละเอียด (เบิกค่าอะไร)", "What it is for")}</label><input type="text" name="desc" placeholder="${L("ว่างไว้ให้ระบบใส่ให้", "Leave empty for the system to fill")}"></div>
          <div class="f" style="flex:0 1 190px"><label>${L("เลขที่ใบกำกับภาษี", "Tax invoice no.")}</label><input type="text" name="taxInv" maxlength="40"></div>
          <div class="f" style="flex:0 1 160px"><label>${L("ครบกำหนดจ่าย", "Due date")}</label><input type="date" name="due"></div>
          <div class="f" style="flex:0 1 210px"><label>${L("วิธีจ่าย", "Method")}</label><select name="method">${Object.keys(PAY_METHODS).map(k => `<option value="${k}">${esc(tx(PAY_METHODS[k]))}</option>`).join("")}</select></div>
          <div class="f" style="flex:1 1 100%"><label>${L("หมายเหตุ", "Note")}</label><input type="text" name="note" maxlength="300"></div>
          <div class="sub" style="flex:1 1 100%">${L("ผู้รับเงิน", "Payee")}: <b>${esc(tx(c.vendor))}</b> · ${bank ? `${esc(bank.name)} ${esc(bank.branch)} <span class="mono">${esc(bank.acc)}</span>` : L("ยังไม่มีบัญชีในทะเบียนผู้รับจ้าง/ผู้ขาย", "no account in the contractor register yet")} · ${L("เอกสารแนบอัตโนมัติ: ใบแจ้งหนี้ ใบส่งมอบ ใบตรวจรับของงวดที่เลือก สำเนาสัญญา และหลักประกัน เพิ่มหรือเอาออกได้ที่แถวของครั้งนั้น", "documents attached automatically: the invoice, delivery and acceptance of the phases, the contract copy and the guarantee; add or remove them on the row")}</div>
          <button class="btn primary" type="submit">${L("สร้างรายการเบิกจ่ายครั้งนี้ ส่งการเงิน", "Make this payment request, send to finance")}</button></form>` : `<div class="sub" style="margin-top:6px">${L("ไม่มีงวดที่ตรวจรับแล้วและยังไม่ได้เบิก", "No accepted phase is waiting to be paid")}</div>`) : `<div class="sub" style="margin-top:6px">${L("เจ้าหน้าที่พัสดุเป็นผู้สร้างรายการเบิกจ่าย การเงินดำเนินการต่อ", "The procurement officer makes the payment request; finance goes on from there")}</div>`}</div>`;
};
{
  const done = msg => { commit(); route(); toast(msg); };
  document.addEventListener("submit", e => {
    const f = e.target; if (!f || !f.matches) return;
    if (f.matches("[data-paytimes2]")) { e.preventDefault(); const c = famCon(f.dataset.paytimes2), fd = new FormData(f), m = payMake(c, fd.getAll("ph").map(Number).filter(Boolean), { date: String(fd.get("date") || ""), desc: String(fd.get("desc") || ""), due: String(fd.get("due") || ""), method: String(fd.get("method") || ""), taxInv: String(fd.get("taxInv") || ""), note: String(fd.get("note") || "") }); if (m) { toast(m); return; } done(L("สร้างรายการเบิกจ่ายแล้ว ส่งการเงิน", "Payment request made and sent to finance")); return; }
    if (f.matches("[data-paydoc]")) { e.preventDefault(); const [cid, vid] = f.dataset.paydoc.split("|"), c = famCon(cid), v = (S.vouchers || []).find(x => x.id === vid), fd = new FormData(f), m = payDocAdd(c, v, String(fd.get("k")), String(fd.get("no") || ""), String(fd.get("date") || "")); if (m) { toast(m); return; } done(L("เพิ่มเอกสารแล้ว", "Document added")); }
  });
  document.addEventListener("click", e => {
    const au = e.target.closest && e.target.closest("[data-payauto]"), dd = e.target.closest && e.target.closest("[data-paydocdel]");
    if (au) { const c = famCon(au.dataset.payauto); if (!c || !payMaker()) return; const n = payAutoAll(c); if (!n) { toast(L("ไม่ได้สร้างรายการเบิกจ่าย (ดูเหตุผลที่แจ้ง)", "No payment request was made (see the reason given)")); return; } done(`${L("สร้างรายการเบิกจ่ายแล้ว", "Made")} ${n} ${L("ครั้ง", "occasions")}`); return; }
    if (dd) { const [cid, vid, i] = dd.dataset.paydocdel.split("|"), c = famCon(cid), v = (S.vouchers || []).find(x => x.id === vid), m = payDocDel(c, v, Number(i)); if (m) { toast(m); return; } done(L("เอาเอกสารออกแล้ว", "Document removed")); }
  });
  document.addEventListener("change", e => {
    const el = e.target; if (!el || !el.matches) return;
    if (el.matches("[data-paydate]")) { const [cid, vid] = el.dataset.paydate.split("|"), c = famCon(cid), v = (S.vouchers || []).find(x => x.id === vid), m = payDateSet(c, v, el.value); if (m) { toast(m); route(); return; } done(L("แก้วันที่เบิกแล้ว", "Date changed")); return; }
    if (el.matches('[data-paytimes2] input[name="ph"]')) { const f = el.closest("form"), c = famCon(f.dataset.paytimes2), ns = [...f.querySelectorAll('input[name="ph"]:checked')].map(x => Number(x.value)), box = f.querySelector("[data-paysum]");
      if (box) box.textContent = ns.length ? `${L("เบิก", "Paying")} ${ns.length} ${L("งวด", "phases")}: ${payPhaseNames(c, ns)} · ${L("รวม", "total")} ${fmt(sumv(ns.map(n => { const ph = c.phases.find(x => x.n === n); return ph ? (ph.result === "partial" ? ph.okAmount : ph.amount) : 0; })))} ${L("บาท", "baht")}` : L("ยังไม่ได้เลือกงวด", "No phase chosen yet"); }
  });
}
