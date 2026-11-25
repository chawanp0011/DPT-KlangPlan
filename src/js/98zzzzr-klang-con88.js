// Fisko-KlangFinance, round P88 (25 Nov 2569), the contract and its payments, as asked (บริหารงบประมาณ 3.2-3.6):
// - the contract: the PO number, how it is paid (แบบงวดงาน: by the phases of the contract, or แบบเบิกเป็นครั้ง: any amount each time), and,
//   when there is an advance, the share deducted from each payment (หักคืนล่วงหน้า ... %). When what is left of the advance is less than that
//   share, everything left is deducted. Data: cx.po, cx.payMode ("phase" | "time"), cx.adv.dedPct.
// - the payment tab: the advance actually paid (เบิกจ่ายเงิน Advance 15%, in baht, with its GF number, date and file); the payments after it
//   deduct from it. The facts on top show the advance and what is left; a table shows the three statuses of each payment (ตรวจใบสำคัญ,
//   บัญชีแนบเอกสาร, การเงินจ่ายจริงพร้อมเอกสาร). Data: cx.adv.paid = { amt, gf, date, file, by, t }.
// - who creates a payment: the Treasury (as before) or the bureau/division responsible for the item; then the voucher checker -> accounting
//   -> finance, as before (kxPay).
// - the contract amendment gets a PO number too. Data: amend.po.
// The Excel of the follow-up form takes the PO (column 50) and the advance paid (column 51, ลบ.), see 98zzzzp.

const KX88_MODE = { phase: "แบบงวดงาน", time: "แบบเบิกเป็นครั้ง" };
// the advance: when the amount paid is recorded, the % of the advance is set from it, so kxAdvAmt (a const of 98zzzv) gives what was paid
// the share deducted: the % set on the contract, capped by what is left (kx88Deduct, used when the payment form leaves the deduction empty)
const kx88Deduct = (x, amount) => { const p = Number(x.adv && x.adv.dedPct); return p > 0 && kxAdvAmt(x) ? Math.min(kxAdvLeft(x), Math.round(Number(amount) * p) / 100) : null; };
const kx88UnitCan = k => ["div", "divhead"].includes(ROLE) && !!k && famLine(famPlan(k.plan).line).unit === me().unit;
const kx88As = (k, fn) => { if (kxCanEdit() || !kx88UnitCan(k)) return fn(); const r0 = ROLE; ROLE = "proc"; try { return fn(); } finally { ROLE = r0; } };

// ---------- save ----------
let KX88_IN = null; // the new fields of the form being submitted (read before the older handler)
{ const base = kxSave; kxSave = function (k, v, files) { const m = base(k, v, files); if (m || !KX88_IN) return m; const x = kxOf(k), n = KX88_IN; KX88_IN = null;
    if ("po" in n) x.po = String(n.po || "").trim().slice(0, 40); if (n.payMode && KX88_MODE[n.payMode]) x.payMode = n.payMode;
    if ("dedPct" in n) { const p = n.dedPct === "" ? "" : Number(n.dedPct); if (p !== "" && !(p > 0 && p <= 100)) return "% หักคืนเงินล่วงหน้าต้องมากกว่า 0 ไม่เกิน 100"; x.adv.dedPct = p; } return ""; }; }
{ const base = kxAmendAdd; kxAmendAdd = function (k, v, file) { const po = KX88_IN && KX88_IN.amPo; KX88_IN = null; const m = base(k, v, file); if (!m && po) { const x = kxOf(k); x.amends[x.amends.length - 1].po = String(po).trim().slice(0, 40); } return m; }; }
function kx88AdvPay(k, v, file) { if (!kxCanEdit() && !kxCanPay()) return "เฉพาะกองคลังหรือการเงินบันทึกเงินเบิกล่วงหน้า"; const x = kxOf(k), amt = Number(v.amt);
  if (!x.adv.has) return "สัญญานี้ไม่มีเงินเบิกล่วงหน้า (กำหนดที่แท็บสัญญา)"; if (!(amt > 0)) return "ระบุจำนวนเงิน Advance"; if (amt > kxAmount(x) * 0.15 + 0.5) return `เงินเบิกล่วงหน้าต้องไม่เกิน 15% ของวงเงินสัญญา (${fmt(kxAmount(x) * 0.15)} บาท)`;
  if (!String(v.gf || "").trim()) return "ระบุเลขที่เอกสาร GF"; if (!v.date) return "ระบุวันที่จ่าย"; if (x.dl.some(d => d.deduct > 0)) return "มีการหักคืนในงวดที่บันทึกแล้ว แก้ไขเงินล่วงหน้าไม่ได้";
  x.adv.paid = { amt: Math.round(amt * 100) / 100, gf: String(v.gf).trim().slice(0, 40), date: v.date, file: file ? kxFile(file) : (x.adv.paid && x.adv.paid.file) || null, by: me().id, t: nowIso() };
  if (Number(x.amount) > 0) { if (x.adv.pctSet == null) x.adv.pctSet = x.adv.pct; x.adv.pct = x.adv.paid.amt * 100 / Number(x.amount); }
  audit(["บันทึกเบิกจ่ายเงินล่วงหน้า (Advance)", "Recorded the advance paid"], `${k.id} GF ${x.adv.paid.gf}`); return ""; }
// a payment created by the unit responsible for the item
{ const base = kxDlAdd; kxDlAdd = function (k, v, files) { return kx88As(k, () => base(k, v, files)); }; }
// the phase of a payment in "แบบงวดงาน"
{ const base = kxDlAdd; kxDlAdd = function (k, v, files) { const x = kxOf(k), m = base(k, v, files); if (!m && x.payMode === "phase" && v.phase) x.dl[x.dl.length - 1].phase = Number(v.phase); return m; }; }
// the payments of the advance count in the month it was paid; the deductions are not cash
{ const base = prDtRows; prDtRows = function (fy, onlyCon) { const rows = base(fy, onlyCon); rows.forEach(r => { const x = r.k && r.k.cx; if (!x || !x.adv || !x.adv.paid || !x.adv.paid.date) return;
      x.dl.filter(d => d.status === "paid" && d.paidDate && d.deduct).forEach(d => (r.act[prMonIdx(d.paidDate)] -= Number(d.deduct) || 0)); if (prFyOfDate88(x.adv.paid.date) === fy) r.act[prMonIdx(x.adv.paid.date)] += Number(x.adv.paid.amt) || 0; }); return rows; }; }
const prFyOfDate88 = d => { const y = Number(String(d).slice(0, 4)), m = Number(String(d).slice(5, 7)); return y + 543 + (m >= 10 ? 1 : 0); };

// ---------- views ----------
{ const base = kxContractView; kxContractView = function (k) { const h = base(k), x = kxOf(k), can = kxCanEdit(), dis = can ? "" : "disabled", mode = x.payMode || "";
    const top = `${kxIn("po", "เลขที่ PO", x.po || "", "text", can, 'maxlength="40"')}<div class="f" style="flex:1 1 100%"><label>การเบิกจ่าย *</label><div class="row" style="gap:14px">${Object.entries(KX88_MODE).map(([kk, t]) => `<label style="font-weight:400"><input type="radio" name="payMode" value="${kk}" ${mode === kk ? "checked" : ""} ${dis}> ${t}</label>`).join("")}<span class="sub">แบบงวดงาน: เบิกตามงวดในสัญญา · แบบเบิกเป็นครั้ง: เบิกตามผลงานแต่ละครั้ง</span></div></div>`;
    const ded = `<span class="cx-ded88" style="display:${x.adv.has ? "inline-flex" : "none"};gap:6px;align-items:center;margin-left:12px">หักคืนล่วงหน้า <input type="number" name="dedPct" value="${esc(x.adv.dedPct == null ? "" : x.adv.dedPct)}" min="0" max="100" step="0.01" style="width:80px" ${dis}> % ของเงินขอเบิกแต่ละครั้ง <span class="sub">(ถ้ายอดคงเหลือไม่ถึง หักที่เหลือทั้งหมด · ว่าง = หักตามสัดส่วนผลงาน)</span></span>`;
    let out = h.replace('<div class="f" style="flex:1 1 100%"><label>เงินเบิกล่วงหน้า</label>', top + '<div class="f" style="flex:1 1 100%"><label>เงินเบิกล่วงหน้า</label>').replace(/(<b class="cx-adv">[\s\S]*?<\/b> บาท \(ระบบคำนวณ\)<\/span>)/, "$1" + ded);
    // the amendments: a PO column and a PO field
    out = out.replace("<th>เลขที่การแก้ไขสัญญา</th>", "<th>เลขที่การแก้ไขสัญญา</th><th>เลขที่ PO</th>");
    let j = 0; out = out.replace(/(<table class="cx-amends">[\s\S]*?<\/table>)/, t => t.replace(/<tr><td>(\d+)<\/td><td class="mono">([^<]*)<\/td>/g, (m0, i, no) => { const a = x.amends[j++]; return `<tr><td>${i}</td><td class="mono">${no}</td><td class="mono">${esc((a && a.po) || "—")}</td>`; }).replace('<td colspan="9" class="sub">', '<td colspan="10" class="sub">'));
    out = out.replace(/(<form data-cxam="[^"]*"[^>]*>[\s\S]*?<label>ลงวันที่<\/label><input type="date" name="date"[^>]*><\/div>)/, `$1${kxIn("amPo", "เลขที่ PO", "", "text", 1, 'maxlength="40"')}`);
    return out; }; }
{ const base = kxManageView; kxManageView = function (k) { const x = kxOf(k), unit = !kxCanEdit() && kx88UnitCan(k), h = unit ? kx88As(k, () => base(k)) : base(k), adv = kxAdvAmt(x), canAdv = (kxCanEdit() || kxCanPay()) && x.adv.has, P = x.adv.paid;
    const mode = x.payMode || "time", phases = Number(x.nPhases) || 0, nxt = x.dl.length + 1, done = new Set(x.dl.map(d => d.phase).filter(Boolean));
    const facts = `<div class="facts m88-cf">${`<span class="fact">การเบิกจ่าย <b>${KX88_MODE[mode]}</b></span>`}${x.po ? `<span class="fact">PO <b>${esc(x.po)}</b></span>` : ""}${x.adv.has ? `<span class="fact">วงเงินเบิกล่วงหน้า <b>${fmt(adv)}</b> บาท${P ? ` (GF ${esc(P.gf)} · ${fdate(P.date)})` : " (ยังไม่จ่าย)"}</span><span class="fact">เงินล่วงหน้าคงเหลือ <b>${fmt(kxAdvLeft(x))}</b> บาท</span>${Number(x.adv.dedPct) > 0 ? `<span class="fact">หักคืน <b>${x.adv.dedPct}%</b> ต่อครั้ง</span>` : ""}` : ""}</div>`;
    const advForm = x.adv.has ? `<div class="m88-adv" style="border:1px solid var(--line);border-radius:8px;padding:8px 10px"><b>เบิกจ่ายเงิน Advance (เงินเบิกล่วงหน้า)</b>${P ? `<div class="sub">จ่ายแล้ว ${fmt(P.amt)} บาท (${fmt(P.amt / 1e6, 4)} ลบ.) · เลขที่ GF ${esc(P.gf)} · ${fdate(P.date)}${P.file ? ` · 📎 ${esc(P.file.name)}` : ""} · หักคืนแล้ว ${fmt(adv - kxAdvLeft(x))} บาท</div>` : `<div class="sub">ยังไม่บันทึกการจ่ายเงินล่วงหน้า</div>`}
      ${canAdv && !x.dl.some(d => d.deduct > 0) ? `<form data-kx88adv="${k.id}" class="inline-form" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:6px">${kxIn("amt", "จำนวนเงิน Advance (บาท, ไม่เกิน 15%)", P ? P.amt : Math.round(kxAmount(x) * Math.min(15, Number(x.adv.pct) || 15)) / 100, "number", 1, 'min="0" step="0.01"')}${kxIn("gf", "เลขที่เอกสาร GF *", P ? P.gf : "", "text", 1, 'maxlength="40"')}${kxIn("date", "วันที่จ่าย *", P ? P.date : "", "date", 1)}<div class="f"><label>เอกสารการจ่าย</label><input type="file" name="file"></div><div class="f" style="align-self:end"><button class="btn" type="submit">${P ? "แก้ไข" : "บันทึกเบิกจ่ายเงินล่วงหน้า"}</button></div></form>` : ""}</div>` : "";
    const st = (o, okT, wait) => (o ? tag(okT, "p-ok") : tag(wait, "p-mute"));
    const stat = x.dl.length ? `<div class="tbl-wrap"><table class="m88-st"><thead><tr><th>${mode === "phase" ? "งวดที่" : "ครั้งที่"}</th><th class="n">ขอเบิก (บาท)</th><th class="n">หักคืนล่วงหน้า</th><th class="n">จ่ายจริง</th><th>ตรวจใบสำคัญ</th><th>บัญชีแนบเอกสาร</th><th>การเงินจ่ายจริงพร้อมเอกสาร</th></tr></thead><tbody>${x.dl.map(d => `<tr><td>${mode === "phase" && d.phase ? `งวด ${d.phase}` : `ครั้งที่ ${d.n}`}</td><td class="n">${fmt(d.amount)}</td><td class="n">${d.deduct ? fmt(d.deduct) : "–"}</td><td class="n">${fmt(d.pay)}</td>
      <td>${d.chk ? (d.chk.st === "ok" ? tag("ผ่าน", "p-ok") : tag("ส่งกลับ", "p-bad")) : d.accept ? tag("รอตรวจ", "p-warn") : tag("รอตรวจรับ", "p-mute")}</td><td>${st(d.book, `แนบแล้ว${d.files.book ? " 📎" : ""}`, "รอ")}</td><td>${d.status === "paid" ? tag(`จ่ายแล้ว ${fdate(d.paidDate)}${d.files.pay ? " 📎" : ""}`, "p-ok") : tag("รอ", "p-mute")}</td></tr>`).join("")}</tbody></table></div>` : "";
    let out = h.replace(/(<div class="body cx-manage"[^>]*>)/, "$1" + facts + advForm + stat);
    // the form of a new payment: by phase or by time; the deduction follows the % set
    out = out.replace(/(<form data-cxdl="[^"]*"[^>]*>)<div class="f"><label>ครั้งที่<\/label><div><b>\d+<\/b><\/div><\/div>/, (m0, f) => `${f}${mode === "phase" && phases ? `<div class="f"><label>งวดที่ *</label><select name="phase">${Array.from({ length: phases }, (z, i) => i + 1).map(i => `<option value="${i}" ${done.has(i) ? "disabled" : ""} ${!done.has(i) && i === Math.min(...Array.from({ length: phases }, (z, q) => q + 1).filter(q => !done.has(q)).concat(phases + 1)) ? "selected" : ""}>งวดที่ ${i}${done.has(i) ? " (เบิกแล้ว)" : ""}</option>`).join("")}</select></div>` : `<div class="f"><label>ครั้งที่</label><div><b>${nxt}</b></div></div>`}`);
    if (mode === "phase" && phases) out = out.replace("จำนวนเงินตามงวดงาน (บาท) *</label><input", `จำนวนเงินตามงวดงาน (บาท) *</label><input placeholder="${fmt(Math.round(kxAmount(x) / phases * 100) / 100)}"`);
    if (Number(x.adv.dedPct) > 0) out = out.replace(/หักคืนเบิกล่วงหน้า \(ว่าง = ระบบคำนวณตามสัดส่วน, คงเหลือ/, `หักคืนเบิกล่วงหน้า (ว่าง = ${x.adv.dedPct}% ของเงินขอเบิก ไม่เกินคงเหลือ`);
    if (unit) out = out.replace(/(<div class="body cx-manage"[^>]*>)/, `$1<div class="sub">สำนัก/กองที่รับผิดชอบรายการสร้างรายการเบิกจ่ายได้ แล้วผู้ตรวจสอบใบสำคัญ → การบัญชี → การเงิน ดำเนินการต่อ</div>`);
    return out; }; }

// ---------- handlers: read the new fields before the older handlers ----------
window.addEventListener("submit", e => { const f = e.target; if (!f || !f.matches) return;
  if (f.matches("form[data-cx]")) { const d = new FormData(f), n = {}; if (d.has("po")) n.po = String(d.get("po")); if (d.get("payMode")) n.payMode = String(d.get("payMode")); if (d.has("dedPct")) n.dedPct = String(d.get("dedPct")).trim(); KX88_IN = n; }
  if (f.matches("form[data-cxam]")) { const d = new FormData(f); KX88_IN = { amPo: String(d.get("amPo") || "") }; }
  if (f.matches("form[data-cxdl]")) { const d = new FormData(f); KX88_DLPH = d.get("phase") ? Number(d.get("phase")) : null; } }, true);
let KX88_DLPH = null;
{ const base = kxDlAdd; kxDlAdd = function (k, v, files) { if (KX88_DLPH && !v.phase) v = Object.assign({}, v, { phase: KX88_DLPH }); KX88_DLPH = null;
    if ((v.deduct === "" || v.deduct == null) && Number(v.amount) > 0) { const dd = kx88Deduct(kxOf(k), Number(v.amount)); if (dd != null) v = Object.assign({}, v, { deduct: String(dd) }); }
    return base(k, v, files); }; }
document.addEventListener("submit", e => { const f = e.target; if (!f || !f.matches || !f.matches("[data-kx88adv]")) return; e.preventDefault(); const d = new FormData(f), fl = d.get("file");
  const m = kx88AdvPay(famCon(f.dataset.kx88adv), { amt: d.get("amt"), gf: d.get("gf"), date: d.get("date") }, fl && fl.name ? fl : null); m ? toast(m) : kxDone("บันทึกเบิกจ่ายเงินล่วงหน้าแล้ว"); });
document.addEventListener("change", e => { const t = e.target; if (!t || !t.matches || !t.matches("[data-cxadv]")) return; const f = t.closest("form[data-cx]"), b = f && f.querySelector(".cx-ded88"); if (b) b.style.display = t.value === "1" ? "inline-flex" : "none"; });
