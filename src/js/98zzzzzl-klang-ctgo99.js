// ---------- P99: "สร้างสัญญา" opens the contract's own tab, no popup ----------
// Asked for: both "สร้างสัญญา" buttons (สัญญางบประมาณ, and step 4 ทำสัญญา of the purchase) go straight to the tab
// สัญญาและสัญญาแก้ไข, whose form already has every field; step 4 then shows that form too (98zzzv: cmPanel 4).
// The button makes the contract from the award (supplier, price, days of the requisition, one phase) and opens it; the officer fills
// and saves the rest there. The acceptance committee is chosen afterwards in the contract (the dialog required it first).
function ct99Create(cs) { if (!isProcRole() && ROLE !== "admin") return "เฉพาะเจ้าหน้าที่พัสดุสร้างสัญญา"; if (!cs || caseState(cs) !== 8) return "รายการจัดซื้อยังไม่ถึงขั้นทำสัญญา";
  const rq = famReq(cs.reqn), p = famPlan(rq.plan), amount = Math.min(cs.award.price, rq.amount), vendor = tx(cs.award.winner);
  if (typeof blBlocked === "function" && blBlocked(cs, vendor)) return "คู่สัญญาอยู่ในรายชื่อผู้ทิ้งงาน (R-17) ทำสัญญาไม่ได้";
  const days = rq.detail && rq.detail.days > 0 ? rq.detail.days : 120, no = `CT-70/${String(S.contracts.length + 1).padStart(3, "0")}`;
  const c = { id: nextId("CT", S.contracts), reqn: rq.id, plan: p.id, line: p.line, vendor: [vendor, vendor], no, signed: TODAY, amount, by: me().id, inspectors: [], cm: "", status: "active",
    phases: [{ n: 1, name: ["งวดที่ 1", "Phase 1"], due: addDays(TODAY, days - 1), amount, signs: [], need: 0 }],
    base: amount, ver: 1, versions: [{ v: 1, amount, t: nowIso(), by: me().id, why: "" }], vars: [], guarantee: null, warrantyMonths: 24,
    supervision: cs.kind === "construction" ? { who: "", reports: [], assess: [] } : null, defects: [], letters: [] };
  S.contracts.push(c); const x = kxOf(c); Object.assign(x, { projNo: cs.egp7Proj || "", no, date: TODAY, amount, days, start: TODAY, fine: Math.max(100, Math.round(amount * 0.001)), nPhases: 1 });
  rq.status = "contracted"; p.status = "contracted"; caseOnContract(cs, c);
  audit(["สร้างสัญญา", "Created a contract"], `${c.id} ${rq.id}`); notify(["fin", "exec"], [`สัญญา ${c.id} ผูกพันวงเงิน ${mb(amount)} ล้านบาท`, `Contract ${c.id} commits ${mb(amount)} M`], "fnc-chain");
  return c; }
function ct99Go(cs) { const c = ct99Create(cs); if (typeof c === "string") { toast(c); return; } CT_OPEN = false; CT_FROM = null; CON_OPEN = c.id; CON_TAB = "phases"; commit(); renderShell(); procSet("contracts:main"); route();
  toast("สร้างสัญญาแล้ว · กรอกรายละเอียดในแท็บสัญญาและสัญญาแก้ไข แล้วกดบันทึกสัญญา"); }
document.addEventListener("click", e => { if (!m88On()) return; const t = e.target && e.target.closest ? e.target.closest("#case-tocon, #ct-open") : null; if (!t) return;
  e.preventDefault(); e.stopImmediatePropagation();
  const open = S.cases.filter(c => caseState(c) === 8), cs = t.id === "case-tocon" ? (open.find(c => c.id === CASE_OPEN) || open.find(c => c.id === CT_FROM)) : open.find(c => c.id === CT_FROM) || open[0];
  ct99Go(cs || open[0]); }, true);
// the "สร้างสัญญา" panel of สัญญางบประมาณ: one button per ready purchase, no dialog
{ const base = PROC.conCreate; PROC.conCreate = function () { if (!m88On()) return base(); const open = S.cases.filter(c => caseState(c) === 8);
  if (!isProcRole() || !open.length) return base().replace(/<dialog id="ct-dlg"[\s\S]*?<\/dialog>/, "");
  return `<section class="panel"><header><h2>สร้างสัญญา</h2><span class="sp"></span><span class="sub">รายการจัดซื้อที่ประกาศผู้ชนะและพ้นกำหนดอุทธรณ์แล้ว · กดสร้างแล้วกรอกรายละเอียดในแท็บสัญญาและสัญญาแก้ไข</span></header>
    <div class="tbl-wrap"><table><thead><tr><th>รายการจัดซื้อ</th><th>ผู้ชนะ</th><th class="n">ราคาที่ประกาศ (บาท)</th><th></th></tr></thead><tbody>${open.map(c => `<tr><td><span class="mono sub">${esc(c.id)}</span> ${esc(caseName(c))}</td><td>${esc(tx(c.award.winner))}</td><td class="n">${fmt(c.award.price)}</td><td><button class="btn primary" type="button" data-ct99="${esc(c.id)}">สร้างสัญญา</button></td></tr>`).join("")}</tbody></table></div></section>`; }; }
document.addEventListener("click", e => { const t = e.target && e.target.closest ? e.target.closest("[data-ct99]") : null; if (t) ct99Go(S.cases.find(c => c.id === t.dataset.ct99)); });
