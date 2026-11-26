// ---------- P99: step 5 บริหารสัญญาและเบิกจ่าย without the older panels ----------
// Asked for: take out, for now, the older sections that step 5 still showed: ส่งมอบและตรวจรับ, คณะกรรมการตรวจรับ, เบิกจ่ายตามงวด,
// เบิกจ่ายเป็นครั้ง. The panel "ส่งมอบ ตรวจรับ และเบิกจ่าย" of the contract (98zzzv) holds that work now. Hidden, not deleted:
// MENU_ALL (or window.STEP5_OLD = true) shows them again.
const P99_STEP5_OLD = ["ส่งมอบและตรวจรับ", "คณะกรรมการตรวจรับ", "เบิกจ่ายตามงวด", "เบิกจ่ายเป็นครั้ง"];
{ const base = caseExtraPanels; caseExtraPanels = function (c) { const out = base(c); if (!m88On() || window.STEP5_OLD) return out;
  return out.filter(p => { const h = p && p.el && p.el.querySelector && p.el.querySelector(":scope > header h2"); return !(h && P99_STEP5_OLD.includes(h.textContent.trim())); }); }; }
