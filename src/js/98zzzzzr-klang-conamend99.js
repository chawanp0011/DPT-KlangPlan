// ---------- P99: one place for contract amendments ----------
// Asked for: on สัญญาและสัญญาแก้ไข, "สัญญาแก้ไข (ขยายเวลา / ปรับวงเงิน)" and "การแก้ไขสัญญา" are the same thing; keep one and move the data.
// The older panel (change requests of 63-contracts, c.vars) is no longer drawn below the tab; its requests are listed as rows of the
// amendment table, marked "คำขอเดิม" with their state, so nothing is lost. Hidden, not deleted: MENU_ALL or window.CON_OLDVARS = true.
const P99_VST = { pending: "รออนุมัติ", approved: "อนุมัติแล้ว", rejected: "ไม่อนุมัติ" };
function p99VarRows(c) { return (c.vars || []).map((v, j) => { const kind = v.kind === "time" ? "ขยายระยะเวลาสัญญา" : v.kind === "amount" || v.kind === "value" ? "ปรับวงเงินสัญญา" : "แก้ไขอื่น";
  return `<tr class="p99-var"><td><span class="sub">คำขอเดิม ${j + 1}</span></td><td class="mono">${esc(v.id || "")}</td><td>${fdate(String(v.t || "").slice(0, 10))}</td><td>${kind}</td><td class="n">${v.days || "—"}</td><td class="n">${v.amount != null && v.amount !== "" ? fmt(v.amount) : "—"}</td><td>${tag(P99_VST[v.status] || v.status || "—", v.status === "approved" ? "p-ok" : v.status === "rejected" ? "p-bad" : "p-warn")}</td><td>${esc(tx(v.why || ""))}</td><td>—</td></tr>`; }).join(""); }
{ const base = conTabBody; conTabBody = function (c, k) { if (k !== "phases" || !m88On() || window.CON_OLDVARS || !(c.vars || []).length) return base(c, k);
  let h = kxContractView(c); const rows = p99VarRows(c), i = h.indexOf('<table class="cx-amends">'); if (i < 0) return h;
  const j = h.indexOf("</tbody>", i); if (j < 0) return h; let body = h.slice(h.indexOf("<tbody>", i) + 7, j);
  if (/ยังไม่มีการแก้ไขสัญญา/.test(body) && !/<td>\d/.test(body)) body = ""; return h.slice(0, h.indexOf("<tbody>", i) + 7) + body + rows + h.slice(j); }; }
Object.assign(P99_VST, { prep: "เตรียมเอกสาร", check: "รอตรวจสอบ", draft: "ร่าง", sent: "ส่งแล้ว" });
// P99: ความยาว (เมตร) is asked at e-GP step 4 (สงป. พิจารณา / ขยายระยะเวลาก่อหนี้ผูกพัน); not on the contract form any more (data kept)
{ const base = kxContractView; kxContractView = function (k) { const h = base(k); return m88On() ? h.replace(/<div class="f"><label>ความยาว \(เมตร\)<\/label><input[^>]*name="qLen"[^>]*><\/div>/, "") : h; }; }
