// Fisko-KlangFinance, round P80 (24 Nov 2569): when a procurement is cancelled, or an appeal is upheld, the unit sends the request again.
// The Treasury records it on the e-GP part (cancelled / appeal, with the reason). The current requisition is kept as history (status
// "ยกเลิก ให้ส่งใหม่", with who, when and why, and the e-GP steps it had reached); the รายการจัดซื้อ goes back to "จัดทำข้อมูล"
// with the unit's last details filled in, so the unit corrects what it must and sends it again. Only before a contract is signed.
REQ_ST.superseded = [["ยกเลิก ให้ส่งใหม่", "Cancelled, to send again"], "p-mute"];
const RS_KIND = { cancel: "ยกเลิกการจัดซื้อ", appeal: "อุทธรณ์ (ต้องดำเนินการใหม่)" };
function caseResubmit(c, kind, why) {
  if (!isProcRole() && ROLE !== "admin") return "เฉพาะกองคลัง (พัสดุ) บันทึกได้"; const rq = caseReq(c); if (!rq) return "ยังไม่มีใบขอซื้อขอจ้าง";
  if (caseCon(c)) return "ทำสัญญาแล้ว ใช้การบอกเลิกสัญญาแทน"; if (!RS_KIND[kind]) return "เลือกกรณี: ยกเลิก หรือ อุทธรณ์"; if (!String(why || "").trim()) return "ระบุเหตุผล";
  const t = nowIso(), w = String(why).trim().slice(0, 500);
  rq.status = "superseded"; rq.superseded = { kind, why: w, by: me().id, t };
  (c.reqHist = c.reqHist || []).push({ id: rq.id, amount: rq.amount, kind, why: w, by: me().id, t, sentBy: rq.by, sentT: rq.t, egpStage: c.egp7 ? c.egp7.stage || 0 : 0, egp7: c.egp7 || null });
  const d = rq.detail || {}; c.rqDraft = Object.assign({}, d, { amt: (rq.amount / 1e6).toFixed(3), why: tx(rq.why), files: (d.files || []).map(f => ({ name: f.name, size: f.size, type: f.type, kind: 0 })) });
  (c.reqHist[c.reqHist.length - 1]).prep = c.prep || null; c.reqn = null; c.egp7 = null; c.prep = null; c.cancelled = null; if (c.methodApproval) c.methodApproval = { status: "with_request" };
  setState(c, 1, "resubmit", `${RS_KIND[kind]} · ${w}`); CASE_RQ_FOR = null;
  audit(["ให้สำนัก/กองส่งใบขอซื้อขอจ้างใหม่", "Asked the unit to send the request again"], `${c.id} ${rq.id} · ${RS_KIND[kind]}`);
  notify(["div", "divhead"], [`${c.id}: ${RS_KIND[kind]} สำนัก/กองส่งใบขอซื้อขอจ้างใหม่ (${w})`, `${c.id}: ${kind}; the unit sends the request again`], "case:" + c.id); return "";
}
function rsPanel(c) { const rq = caseReq(c); if (!rq || caseCon(c) || !(isProcRole() || ROLE === "admin")) return null;
  return { title: "ยกเลิก / อุทธรณ์: ให้สำนัก/กองส่งใหม่", body: `<form data-rs="${esc(c.id)}" class="inline-form" style="display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end"><div class="f"><label>กรณี *</label><select name="kind"><option value="">—</option>${Object.entries(RS_KIND).map(([k, t]) => `<option value="${k}">${t}</option>`).join("")}</select></div><div class="f" style="flex:1 1 300px"><label>เหตุผล *</label><input name="why" maxlength="500" placeholder="เช่น ผู้เสนอราคาอุทธรณ์ คณะกรรมการวินิจฉัยให้ดำเนินการใหม่"></div><button class="btn danger" type="submit">บันทึกและให้ส่งใหม่</button></form>
    <div class="sub">ใบขอซื้อขอจ้าง ${esc(rq.id)} จะเก็บไว้เป็นประวัติ รายการจัดซื้อกลับไปขั้นจัดทำข้อมูล โดยมีรายละเอียดเดิมให้สำนัก/กองแก้ไขแล้วส่งใหม่</div>` }; }
function rsHistPanel(c) { const H = c.reqHist || []; if (!H.length) return null;
  return { title: `ประวัติใบขอซื้อขอจ้าง (${H.length})`, body: `<div class="tbl-wrap"><table class="rs-hist"><thead><tr><th>ครั้งที่</th><th>เลขที่ใบขอ</th><th class="n">วงเงิน (บาท)</th><th>ส่งโดย</th><th>e-GP ถึงขั้น</th><th>กรณี</th><th>เหตุผล</th><th>บันทึกโดย</th></tr></thead><tbody>${H.map((h, i) => `<tr><td>${i + 1}</td><td class="mono">${esc(h.id)}</td><td class="n">${fmt(h.amount)}</td><td>${esc(userName(h.sentBy))}<div class="sub">${fdate(h.sentT, true)}</div></td><td>${h.egpStage ? `${h.egpStage}. ${esc(EGP7[h.egpStage - 1].t)}` : "ยังไม่เริ่ม"}</td><td>${tag(RS_KIND[h.kind], "p-warn")}</td><td>${esc(h.why)}</td><td>${esc(userName(h.by))}<div class="sub">${fdate(h.t, true)}</div></td></tr>`).join("")}</tbody></table></div>` }; }
{ const base = caseExtraPanels; caseExtraPanels = function (c) { const out = base(c), a = rsPanel(c), h = rsHistPanel(c); if (a) out.push(cmPanel(3, 9, a.title, a.body)); if (h) out.push(cmPanel(2, 0.5, h.title, h.body)); return out; }; }
document.addEventListener("submit", e => { const f = e.target; if (!f || !f.matches || !f.matches("[data-rs]")) return; e.preventDefault(); const c = caseOf(f.dataset.rs), d = new FormData(f); if (!c) return;
  const m = caseResubmit(c, String(d.get("kind") || ""), String(d.get("why") || "")); if (m) { toast(m); return; } CASE_MAIN[c.id] = 2; commit(); route(); toast("บันทึกแล้ว: สำนัก/กองส่งใบขอซื้อขอจ้างใหม่"); });
