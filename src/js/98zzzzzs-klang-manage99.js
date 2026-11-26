// ---------- P99: บริหารสัญญาและเบิกจ่าย, summary cards and the advance in million baht ----------
// Asked for: with an advance, a box "เบิกจ่ายเงิน Advance <the % set in the contract>% ..... (ลบ.)" and the % deducted back shown;
// and cards in place of the small chips, to see the payment as a whole.
// Cards: contract amount, phases, deliveries (accepted), requested, paid (with the advance), advance (paid, % set, deducted, left,
// % deducted per payment), still to pay, % paid with a bar. The advance input is in ลบ.; it fills the older field in baht (amt).
function m99Cards(k) { const x = kxOf(k), A = kxAmount(x), dl = x.dl || [], adv = kxAdvAmt(x), P = x.adv && x.adv.paid, advPaid = P ? Number(P.amt) || 0 : 0;
  const paid = dl.filter(d => d.status === "paid").reduce((s, d) => s + (Number(d.pay) || 0), 0), req = dl.reduce((s, d) => s + (Number(d.amount) || 0), 0), ded = dl.reduce((s, d) => s + (Number(d.deduct) || 0), 0);
  const out = paid + advPaid, pct = A ? out / A * 100 : 0, acc = dl.filter(d => d.accept).length, pctSet = Number((x.adv && (x.adv.pctSet != null ? x.adv.pctSet : x.adv.pct)) || 0);
  const dedPct = Number(x.adv && x.adv.dedPct) > 0 ? Number(x.adv.dedPct) : pctSet, B = v => fmt(v / 1e6, 2), mode = (typeof KX88_MODE !== "undefined" && KX88_MODE[x.payMode || "time"]) || "";
  const card = (l, v, d, c) => `<div class="m99-c" style="border-top:3px solid ${c}"><span class="l">${l}</span><b>${v}</b><span class="d">${d || ""}</span></div>`;
  return `<div class="m99-cards">${card("วงเงินสัญญา", B(A), "ลบ." + (x.po ? ` · PO ${esc(x.po)}` : ""), "#3b4fa8")}${card("งวดงานตามสัญญา", fmt(Number(x.nPhases) || 0), `งวด · การเบิกจ่าย${mode}`, "#64748b")}
    ${card("ส่งมอบ / ตรวจรับ", `${dl.length} / ${acc}`, "ครั้ง", "#0ea5e9")}${card("ขอเบิกรวม", B(req), "ลบ.", "#94a3b8")}
    ${x.adv && x.adv.has ? card(`เงินล่วงหน้า ${fmt(pctSet, 0)}%`, B(advPaid || adv), advPaid ? `ลบ. จ่ายแล้ว${P.gf ? ` · GF ${esc(P.gf)}` : ""}` : "ลบ. ยังไม่จ่าย", "#f59e0b") + card("หักคืนล่วงหน้า", B(ded), `ลบ. · หักคืน ${fmt(dedPct, dedPct % 1 ? 2 : 0)}% ต่อครั้ง · คงเหลือ ${B(kxAdvLeft(x))} ลบ.`, "#d97706") : ""}
    ${card("จ่ายจริงแล้ว", B(out), `ลบ.${advPaid ? ` (รวมเงินล่วงหน้า ${B(advPaid)})` : ""}`, "#16a34a")}${card("คงเหลือตามสัญญา", B(Math.max(0, A - paid - advPaid + ded)), "ลบ. ที่ยังต้องจ่าย", "#dc2626")}
    <div class="m99-c m99-w" style="border-top:3px solid #16a34a"><span class="l">ผลการเบิกจ่าย</span><b>${fmt(pct, 1)}%</b><div class="m99-bar"><i style="width:${Math.min(100, pct)}%"></i></div><span class="d">ของวงเงินสัญญา</span></div></div>`; }
{ const base = kxManageView; kxManageView = function (k) { let h = base(k); if (!m88On()) return h; const x = kxOf(k);
  h = h.replace(/<div class="facts[^"]*">(?:(?!<div)[\s\S])*?<\/div>/g, "");
  if (x.adv && x.adv.has) { const pct = Number(x.adv.pctSet != null ? x.adv.pctSet : x.adv.pct) || 15, P = x.adv.paid, def = P ? P.amt : Math.round(kxAmount(x) * Math.min(15, pct)) / 100;
    h = h.replace(/<div class="f"><label>จำนวนเงิน Advance \(บาท, ไม่เกิน 15%\)<\/label><input type="number" name="amt"([^>]*)><\/div>/, `<div class="f"><label>เบิกจ่ายเงิน Advance ${fmt(pct, pct % 1 ? 2 : 0)}% (ลบ.)</label><input type="number" data-m99m min="0" step="0.0001" value="${Math.round(def / 100) / 1e4}"><input type="hidden" name="amt" value="${def}"><div class="sub">= <span data-m99b>${fmt(def)}</span> บาท · ไม่เกิน 15% ของวงเงินสัญญา</div></div>`);
    const dedPct = Number(x.adv.dedPct) > 0 ? Number(x.adv.dedPct) : pct; h = h.replace("<b>เบิกจ่ายเงิน Advance (เงินเบิกล่วงหน้า)</b>", `<b>เบิกจ่ายเงิน Advance (เงินเบิกล่วงหน้า)</b> <span class="sub">· หักคืนล่วงหน้า ${fmt(dedPct, dedPct % 1 ? 2 : 0)}% ต่อการเบิกแต่ละครั้ง จนครบ ${fmt(kxAdvAmt(x))} บาท</span>`); }
  return `<style>.m99-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin:0 0 12px}.m99-c{background:var(--panel,#fff);border:1px solid var(--line);border-radius:10px;padding:10px 12px;display:flex;flex-direction:column;gap:2px}.m99-c .l{font-size:12px;color:var(--muted,#64748b)}.m99-c b{font-size:20px}.m99-c .d{font-size:11.5px;color:var(--muted,#64748b)}.m99-bar{height:6px;background:var(--line,#e5e7eb);border-radius:99px;overflow:hidden;margin:4px 0 2px}.m99-bar i{display:block;height:100%;background:#16a34a}</style>`
    + h.replace(/(<div class="body cx-manage"[^>]*>)/, `$1${m99Cards(k)}`); }; }
document.addEventListener("input", e => { const t = e.target; if (!t || !t.matches || !t.matches("[data-m99m]")) return; const f = t.closest("form"), b = Math.round(Number(t.value) * 1e6 * 100) / 100;
  const h = f && f.querySelector('input[name="amt"]'); if (h) h.value = b > 0 ? b : ""; const s = f && f.querySelector("[data-m99b]"); if (s) s.textContent = fmt(b || 0); });
// ---------- P99: ทำสัญญา, the defect warranty period (ระยะรับประกันความชำรุดบกพร่อง) ----------
// Asked for: a default checkbox for the warranty period on the contract form. Choices 1 ปี / 2 ปี (ticked by default) / อื่น ๆ (ระบุปี);
// one choice at a time. Stored as cx.warrY (years); kxWarrEnd counts from the last acceptance with it.
if (!KX_F.includes("warrY")) KX_F.push("warrY");
{ const base = kxContractView; kxContractView = function (k) { const h = base(k), x = kxOf(k), can = kxCanEdit(), y = Number(x.warrY) > 0 ? Number(x.warrY) : 2, other = y !== 1 && y !== 2, dis = can ? "" : "disabled";
  const box = `<div class="f m99-warr" style="flex:1 1 100%"><label>ระยะรับประกันความชำรุดบกพร่อง *</label><div class="row" style="gap:16px;align-items:center;flex-wrap:wrap">
    <label style="font-weight:400"><input type="checkbox" data-m99w="1" ${y === 1 ? "checked" : ""} ${dis}> 1 ปี</label><label style="font-weight:400"><input type="checkbox" data-m99w="2" ${y === 2 ? "checked" : ""} ${dis}> 2 ปี (ค่าเริ่มต้น)</label>
    <label style="font-weight:400"><input type="checkbox" data-m99w="o" ${other ? "checked" : ""} ${dis}> อื่น ๆ</label><input type="number" data-m99wy min="1" max="20" step="1" value="${other ? y : ""}" placeholder="ปี" style="width:80px;${other ? "" : "display:none"}" ${dis}>
    <input type="hidden" name="warrY" value="${y}"><span class="sub">นับจากวันตรวจรับงวดสุดท้าย${x.lastAccept ? ` · ครบ ${fdate(kxWarrEnd(x))}` : ""}</span></div></div>`;
  const key = '<div class="f"><label>จำนวนงวดงานตามสัญญา *</label>'; return h.includes(key) ? h.replace(key, box + key) : h.replace("</form>", box + "</form>"); }; }
document.addEventListener("change", e => { const t = e.target; if (!t || !t.matches) return; const f = t.closest && t.closest(".m99-warr"); if (!f) return; const hid = f.querySelector('input[name="warrY"]'), num = f.querySelector("[data-m99wy]");
  if (t.matches("[data-m99w]")) { f.querySelectorAll("[data-m99w]").forEach(c => { if (c !== t) c.checked = false; }); if (!t.checked) t.checked = true; const v = t.dataset.m99w; num.style.display = v === "o" ? "" : "none"; hid.value = v === "o" ? num.value || "" : v; if (v === "o") num.focus(); }
  if (t.matches("[data-m99wy]")) hid.value = t.value; });
