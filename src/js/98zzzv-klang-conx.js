// Fisko-KlangFinance, round P46 (20 Nov 2569): the contract as the user listed it.
// Step 4 (ทำสัญญา): the tab "งวดงานและตรวจรับ" becomes "สัญญาและสัญญาแก้ไข". It holds the contract's details, its files, the contract
// guarantee (letter of guarantee / cash / bond), the number of phases, the advance payment, and the table of contract amendments.
// Step 5: contract management and payment are one step. Each delivery is "ครั้งที่" (not "งวด"), with the advance repaid little by little,
// the payment status that Finance updates, the voucher check (Finance) and the booking (Accounting), and a 500-character note.
// The date of the last acceptance starts the two-year defect guarantee. Alerts: 2 months before the defect guarantee ends, the contract's
// end (so the officer writes the penalty letter), and a penalty over 10% of the contract.
// Data: con.cx = { projNo, ctlNo, no, date, amount, days, start, fine, files, guar, nPhases, adv, amends[], dl[], lastAccept }.
// The old phases of the contract stay in the data (other files and tests read them); on the contract page they are folded below.
const KX_BANKS = ["ธนาคารกรุงไทย", "ธนาคารออมสิน", "ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร", "ธนาคารกรุงเทพ", "ธนาคารกสิกรไทย", "ธนาคารไทยพาณิชย์", "ธนาคารกรุงศรีอยุธยา", "ธนาคารทหารไทยธนชาต", "ธนาคารอาคารสงเคราะห์", "ธนาคารอิสลามแห่งประเทศไทย"];
const KX_GUAR = { bg: "หนังสือค้ำประกัน", cash: "เงินสด", bond: "พันธบัตร" };
const KX_AMEND = { ext: "ขยายระยะเวลาสัญญา", amt: "ปรับวงเงินสัญญา", both: "ขยายเวลาและปรับวงเงิน", other: "แก้ไขอื่น" };
const kxAdd = (d, n) => new Date(Date.parse(d + "T00:00:00Z") + n * 864e5).toISOString().slice(0, 10);
const kxAddYears = (d, y) => { const t = new Date(d + "T00:00:00Z"); t.setUTCFullYear(t.getUTCFullYear() + y); return t.toISOString().slice(0, 10); };
const kxDiff = (a, b) => Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 864e5);
function kxOf(k) {
  if (!k.cx) k.cx = { projNo: "", ctlNo: "", no: k.no || "", date: k.signed || "", amount: k.amount || 0, days: "", start: k.signed || "", fine: "", files: {}, guar: { kind: "", files: {} }, nPhases: (k.phases || []).filter(p => !p.cancelled).length || "", adv: { has: false, pct: "" }, amends: [], dl: [], lastAccept: "" };
  return k.cx;
}
const kxEnd0 = x => (x.start && Number(x.days) > 0 ? kxAdd(x.start, Number(x.days) - 1) : ""); // the end in the signed contract: the start is day 1
const kxExtra = x => x.amends.reduce((s, a) => s + (Number(a.days) || 0), 0);
const kxEnd = x => { const e = kxEnd0(x); return e ? kxAdd(e, kxExtra(x)) : ""; }; // with the extensions of the amendments
const kxAmount = x => { const a = x.amends.filter(m => m.amount !== "" && m.amount != null && !isNaN(Number(m.amount))); return a.length ? Number(a[a.length - 1].amount) : Number(x.amount) || 0; };
const kxAdvAmt = x => (x.adv.has && Number(x.adv.pct) > 0 ? Math.round(Number(x.amount) * Number(x.adv.pct)) / 100 : 0);
const kxAdvLeft = (x, upto) => Math.max(0, kxAdvAmt(x) - x.dl.slice(0, upto == null ? x.dl.length : upto).reduce((s, d) => s + (Number(d.deduct) || 0), 0));
const kxDeductOf = (x, amount) => { const a = kxAdvAmt(x), base = Number(x.amount) || 0; return a && base ? Math.min(kxAdvLeft(x), Math.round(a * amount / base * 100) / 100) : 0; }; // repaid in the share of the work
const kxWarrEnd = x => (x.lastAccept ? kxAddYears(x.lastAccept, 2) : "");
function kxLate(x) { const e = kxEnd(x); if (!e || x.lastAccept || e >= TODAY) return 0; return kxDiff(e, TODAY); }
const kxFine = x => kxLate(x) * (Number(x.fine) || 0);
function kxAlerts(k) {
  const x = kxOf(k), out = [], e = kxEnd(x), w = kxWarrEnd(x), f = kxFine(x), amt = kxAmount(x);
  if (w && w >= TODAY && kxDiff(TODAY, w) <= 61) out.push(["warn", `อีก ${kxDiff(TODAY, w)} วันจะครบประกันความชำรุดบกพร่อง (${fdate(w)}): ตรวจสภาพงานก่อนคืนหลักประกัน`]);
  if (e && !x.lastAccept && e <= kxAdd(TODAY, 15)) out.push([e < TODAY ? "bad" : "warn", e < TODAY ? `พ้นวันสิ้นสุดสัญญา (${fdate(e)}) มา ${kxLate(x)} วัน: เจ้าหน้าที่ทำหนังสือแจ้งสงวนสิทธิ์/เรียกค่าปรับ` : `สัญญาจะสิ้นสุด ${fdate(e)} (อีก ${kxDiff(TODAY, e)} วัน): เตรียมหนังสือแจ้งเรียกค่าปรับหากส่งมอบไม่ทัน`]);
  if (amt && f > amt * 0.1) out.push(["bad", `ค่าปรับ ${fmt(f)} บาท เกิน 10% ของมูลค่าสัญญา (${fmt(amt * 0.1)} บาท): พิจารณาบอกเลิกสัญญา`]);
  else if (amt && f > amt * 0.08) out.push(["warn", `ค่าปรับ ${fmt(f)} บาท ใกล้ 10% ของมูลค่าสัญญา`]);
  return out;
}
const kxCanEdit = () => isProcRole() || ROLE === "admin";
let kxCanPay = () => ROLE === "fin" || ROLE === "admin";
const kxFile = f => (f ? { name: f.name, size: f.size || 0, t: nowIso(), by: me().id } : null);

// ---------- save ----------
const KX_F = ["projNo", "ctlNo", "no", "date", "amount", "days", "start", "fine", "nPhases"];
const KX_G = { bg: ["bank", "gno", "gdate", "gamount", "gexpires"], cash: ["rno", "book", "rnum", "gdate", "gamount"], bond: ["bno", "gdate", "gamount"] };
function kxSave(k, v, files) {
  if (!kxCanEdit()) return "เฉพาะเจ้าหน้าที่พัสดุบันทึกได้"; const x = kxOf(k);
  KX_F.forEach(f => { if (f in v) x[f] = ["amount", "days", "fine", "nPhases"].includes(f) ? (v[f] === "" ? "" : Number(v[f])) : v[f]; });
  if (x.nPhases !== "" && !(Number.isInteger(x.nPhases) && x.nPhases > 0)) return "จำนวนงวดงานต้องเป็นตัวเลขจำนวนเต็มมากกว่า 0";
  if ("advHas" in v) x.adv.has = !!v.advHas; if ("advPct" in v) x.adv.pct = v.advPct === "" ? "" : Number(v.advPct);
  if (x.adv.has && !(Number(x.adv.pct) > 0 && Number(x.adv.pct) <= 100)) return "ระบุ % เงินเบิกล่วงหน้า (มากกว่า 0 ไม่เกิน 100)";
  if ("gkind" in v) { x.guar.kind = v.gkind; (KX_G[v.gkind] || []).forEach(f => { if (f in v) x.guar[f] = f === "gamount" ? (v[f] === "" ? "" : Number(v[f])) : v[f]; }); }
  ["contract", "party", "boq"].forEach(n => { if (files[n]) x.files[n] = kxFile(files[n]); }); if (files.guar) x.guar.files.letter = kxFile(files.guar);
  x.saved = nowIso(); audit(["บันทึกรายละเอียดสัญญา", "Saved the contract details"], k.id); return "";
}
function kxMissing(k) { const x = kxOf(k), m = [];
  [["projNo", "เลขที่โครงการ"], ["ctlNo", "เลขคุมสัญญา"], ["no", "เลขที่สัญญา"], ["date", "ลงวันที่"], ["amount", "วงเงินตามสัญญา"], ["days", "จำนวนวันแล้วเสร็จ"], ["start", "วันที่เริ่มต้นสัญญา"], ["fine", "ค่าปรับ"], ["nPhases", "จำนวนงวดงาน"]].forEach(([f, t]) => { if (x[f] === "" || x[f] == null) m.push(t); });
  [["contract", "ไฟล์หนังสือสัญญา"], ["party", "ไฟล์เอกสารคู่สัญญา"], ["boq", "ไฟล์ BOQ งวดงาน"]].forEach(([f, t]) => { if (!x.files[f]) m.push(t); });
  if (!x.guar.kind) m.push("หลักประกันสัญญา"); else if (x.guar.kind === "bg" && !x.guar.files.letter) m.push("ไฟล์หนังสือค้ำประกัน"); return m; }
function kxAmendAdd(k, v, file) {
  if (!kxCanEdit()) return "เฉพาะเจ้าหน้าที่พัสดุบันทึกได้"; const x = kxOf(k);
  if (!v.no || !v.date || !KX_AMEND[v.kind]) return "ระบุเลขที่ ลงวันที่ และประเภทการแก้ไข";
  if ((v.kind === "ext" || v.kind === "both") && !(Number(v.days) > 0)) return "ระบุจำนวนวันที่ขยาย"; if ((v.kind === "amt" || v.kind === "both") && !(Number(v.amount) > 0)) return "ระบุวงเงินใหม่";
  x.amends.push({ i: x.amends.length + 1, no: v.no, date: v.date, kind: v.kind, days: v.kind === "ext" || v.kind === "both" ? Number(v.days) : 0, amount: v.kind === "amt" || v.kind === "both" ? Number(v.amount) : "", why: (v.why || "").slice(0, 500), file: kxFile(file), by: me().id, t: nowIso() });
  audit(["บันทึกการแก้ไขสัญญา", "Recorded a contract amendment"], k.id); return "";
}
function kxDlAdd(k, v, files) {
  if (!kxCanEdit()) return "เฉพาะเจ้าหน้าที่พัสดุบันทึกได้"; const x = kxOf(k), amount = Number(v.amount);
  if (!v.deliver || !(amount > 0)) return "ระบุวันที่ส่งมอบและจำนวนเงินตามงวดงาน"; if (v.accept && v.accept < v.deliver) return "วันที่ตรวจรับต้องไม่ก่อนวันที่ส่งมอบ";
  if ((v.note || "").length > 500) return "หมายเหตุไม่เกิน 500 ตัวอักษร";
  const deduct = v.deduct === "" || v.deduct == null ? kxDeductOf(x, amount) : Number(v.deduct); if (deduct < 0 || deduct > kxAdvLeft(x) + 0.001) return `หักคืนเบิกล่วงหน้าได้ไม่เกินยอดคงเหลือ ${fmt(kxAdvLeft(x))} บาท`;
  x.dl.push({ n: x.dl.length + 1, deliver: v.deliver, accept: v.accept || "", amount, deduct, pay: Math.round((amount - deduct) * 100) / 100, status: "wait", paidDate: "", note: v.note || "", files: { dl: kxFile(files.dl), pay: null }, chk: null, book: null, by: me().id, t: nowIso() });
  if (v.last) { x.lastAccept = v.deliver; k.warrantyMonths = 24; } // P54: the last phase, the delivery date starts the two-year guarantee
  audit(["บันทึกส่งมอบและตรวจรับ", "Recorded a delivery"], k.id); return "";
}
function kxDlEdit(k, i, v, files) { // procurement: the acceptance date, the note, the delivery file
  if (!kxCanEdit()) return "เฉพาะเจ้าหน้าที่พัสดุบันทึกได้"; const d = kxOf(k).dl[i]; if (!d) return "ไม่พบรายการ";
  if ("note" in v) { if (v.note.length > 500) return "หมายเหตุไม่เกิน 500 ตัวอักษร"; d.note = v.note; } if (v.accept) { if (v.accept < d.deliver) return "วันที่ตรวจรับต้องไม่ก่อนวันที่ส่งมอบ"; d.accept = v.accept; }
  if (files.dl) d.files.dl = kxFile(files.dl); if (v.resend && d.chk && d.chk.st === "back") { d.chk = null; audit(["ส่งตรวจใบสำคัญอีกครั้ง", "Sent the voucher back for checking"], k.id); } return "";
}
function kxPay(k, i, v, files) { // P54: voucher check (ok / send back) -> accounting books the payment document -> finance: the date the contractor got the money, the file, the status
  if (!kxCanPay()) return "เฉพาะการเงินและบัญชีบันทึกได้"; const d = kxOf(k).dl[i]; if (!d) return "ไม่พบรายการ";
  const chk = v.chk === true ? "ok" : v.chk;
  if (chk === "ok" || chk === "back") { if (!d.accept) return "ยังตรวจรับไม่เสร็จ ตรวจใบสำคัญไม่ได้"; if (d.book) return "บันทึกบัญชีแล้ว เปลี่ยนผลตรวจใบสำคัญไม่ได้";
    if (chk === "back" && !(v.why || "").trim()) return "ระบุเหตุผลที่ส่งกลับ"; d.chk = { st: chk, why: chk === "back" ? v.why.trim().slice(0, 500) : "", by: me().id, t: nowIso() }; }
  if (v.book && !d.book) { if (!d.chk || d.chk.st !== "ok") return "ตรวจใบสำคัญ (ผ่าน) ก่อนบันทึกเอกสารเบิกจ่าย"; d.book = { by: me().id, t: nowIso() }; if (files.book) d.files.book = kxFile(files.book); }
  if (v.status === "paid") { if (!d.book) return "บัญชียังไม่ได้บันทึกเอกสารเบิกจ่าย"; if (!v.paidDate) return "ระบุวันที่ผู้รับจ้างได้รับเงิน"; if (v.paidDate < d.accept) return "วันที่รับเงินต้องไม่ก่อนวันตรวจรับ";
    if (!files.pay && !d.files.pay) return "แนบเอกสารการจ่ายเงิน"; if (files.pay) d.files.pay = kxFile(files.pay); d.status = "paid"; d.paidDate = v.paidDate; d.paid = { by: me().id, t: nowIso() }; }
  else if (v.status === "wait" && d.status === "paid") { d.status = "wait"; d.paidDate = ""; d.paid = null; }
  audit(["ปรับสถานะการเบิกจ่าย", "Updated the payment status"], k.id); return "";
}
let kxStage = d => d.status === "paid" ? ["จ่ายแล้ว " + fdate(d.paidDate), "p-ok"] : d.book ? ["รอการเงินจ่าย", "p-info"] : d.chk && d.chk.st === "ok" ? ["รอบัญชีบันทึกเอกสาร", "p-info"] : d.chk && d.chk.st === "back" ? ["ส่งกลับแก้ไข", "p-bad"] : d.accept ? ["รอตรวจใบสำคัญ", "p-warn"] : ["รอตรวจรับ", "p-mute"];
const kxDocs = d => [["ส่งมอบ/ตรวจรับ", d.files.dl], ["เอกสารเบิกจ่าย (บัญชี)", d.files.book], ["หลักฐานการจ่ายเงิน", d.files.pay]].filter(x => x[1]);
function kxLastAccept(k, date) { if (!kxCanEdit()) return "เฉพาะเจ้าหน้าที่พัสดุบันทึกได้"; const x = kxOf(k); if (date && x.dl.length && x.dl.some(d => d.deliver > date)) return "วันตรวจรับงวดสุดท้ายต้องไม่ก่อนวันส่งมอบครั้งใด"; x.lastAccept = date || ""; if (date) k.warrantyMonths = 24; return ""; }

// ---------- views ----------
const kxIn = (name, label, val, type, can, extra) => `<div class="f"><label>${label}</label><input type="${type || "text"}" name="${name}" value="${esc(val == null ? "" : val)}" ${can ? "" : "disabled"} ${extra || ""}></div>`;
const kxFl = (name, label, fl, can) => `<div class="f"><label>${label}</label>${fl ? `<div class="sub">📎 ${esc(fl.name)}</div>` : `<div class="sub">ยังไม่แนบ</div>`}${can ? `<input type="file" name="${name}">` : ""}</div>`;
const kxAlertBox = k => kxAlerts(k).map(([lv, t]) => `<div class="cx-alert" style="border-left:4px solid var(--${lv === "bad" ? "bad" : "warn"});background:var(--${lv === "bad" ? "bad" : "warn"}-bg, transparent);padding:6px 10px;border-radius:6px">⚠ ${esc(t)}</div>`).join("");
function kxContractView(k) {
  const x = kxOf(k), can = kxCanEdit(), g = x.guar, p = famPlan(k.plan), miss = kxMissing(k), e0 = kxEnd0(x), e = kxEnd(x);
  const gb = kind => `<div class="cx-g" data-gk="${kind}" style="display:${g.kind === kind ? "flex" : "none"};flex-wrap:wrap;gap:10px;flex:1 1 100%">${kind === "bg" ? `<div class="f"><label>ธนาคาร</label><select name="bank" ${can ? "" : "disabled"}><option value="">—</option>${KX_BANKS.map(b => `<option ${g.bank === b ? "selected" : ""}>${b}</option>`).join("")}</select></div>${kxIn("gno", "เลขที่หนังสือค้ำประกัน", g.gno, "text", can)}${kxIn("gdate", "ลงวันที่", g.gdate, "date", can)}${kxIn("gamount", "จำนวนเงิน (บาท)", g.gamount, "number", can, 'min="0" step="0.01"')}${kxIn("gexpires", "วันที่หมดอายุ", g.gexpires, "date", can)}${kxFl("guar", "ไฟล์หนังสือค้ำประกัน", g.files.letter, can)}`
    : kind === "cash" ? `${kxIn("rno", "เลขที่ใบเสร็จ", g.rno, "text", can)}${kxIn("book", "เล่มที่", g.book, "text", can)}${kxIn("rnum", "เลขที่", g.rnum, "text", can)}${kxIn("gdate", "ลงวันที่", g.gdate, "date", can)}${kxIn("gamount", "จำนวน (บาท)", g.gamount, "number", can, 'min="0" step="0.01"')}`
    : `${kxIn("bno", "เลขที่พันธบัตร", g.bno, "text", can)}${kxIn("gdate", "ลงวันที่", g.gdate, "date", can)}${kxIn("gamount", "จำนวนเงิน (บาท)", g.gamount, "number", can, 'min="0" step="0.01"')}`}</div>`;
  const form = `<form data-cx="${k.id}" class="inline-form" style="display:flex;flex-wrap:wrap;gap:10px">
    ${kxIn("projNo", "เลขที่โครงการ *", x.projNo || (k.egp7Proj || ""), "text", can)}${kxIn("ctlNo", "เลขคุมสัญญา *", x.ctlNo, "text", can)}${kxIn("no", "เลขที่สัญญา *", x.no, "text", can)}${kxIn("date", "ลงวันที่ *", x.date, "date", can)}
    <div class="f" style="flex:1 1 100%"><label>ชื่อโครงการ</label><div><b>${esc(tx(p.name))}</b></div></div>
    <div class="f"><label>ผู้รับจ้าง</label><div><b>${esc(tx(k.vendor))}</b> ${typeof procSet === "function" ? `<button class="btn ghost" type="button" data-cxparty>ทะเบียนคู่สัญญา</button>` : ""}</div></div>
    ${kxIn("amount", "วงเงินตามสัญญา (บาท) *", x.amount, "number", can, 'min="0" step="0.01" data-cxcalc')}
    ${kxIn("days", "จำนวนวันแล้วเสร็จ *", x.days, "number", can, 'min="1" step="1" data-cxcalc')}${kxIn("start", "วันที่เริ่มต้นสัญญา *", x.start, "date", can, "data-cxcalc")}
    <div class="f"><label>วันที่สิ้นสุดสัญญา (ระบบคำนวณ)</label><div><b class="cx-end">${e0 ? fdate(e0) : "—"}</b>${e !== e0 && e ? `<div class="sub">หลังแก้ไขสัญญา: ${fdate(e)} (ขยาย ${kxExtra(x)} วัน)</div>` : ""}</div></div>
    ${kxIn("fine", "ค่าปรับ (บาท/วัน) *", x.fine, "number", can, 'min="0" step="0.01"')}
    ${kxFl("contract", "ไฟล์หนังสือสัญญา *", x.files.contract, can)}${kxFl("party", "ไฟล์เอกสารผู้คู่สัญญา *", x.files.party, can)}${kxFl("boq", "ไฟล์ BOQ งวดงาน *", x.files.boq, can)}
    <div class="f" style="flex:1 1 100%"><label>หลักประกันสัญญา *</label><div class="row" style="gap:14px">${Object.entries(KX_GUAR).map(([kk, t]) => `<label style="font-weight:400"><input type="radio" name="gkind" value="${kk}" ${g.kind === kk ? "checked" : ""} ${can ? "" : "disabled"} data-cxgk> ${t}</label>`).join("")}</div></div>
    ${gb("bg")}${gb("cash")}${gb("bond")}
    ${kxIn("nPhases", "จำนวนงวดงานตามสัญญา *", x.nPhases, "number", can, 'min="1" step="1"')}
    <div class="f" style="flex:1 1 100%"><label>เงินเบิกล่วงหน้า</label><div class="row" style="gap:14px;align-items:center"><label style="font-weight:400"><input type="radio" name="advHas" value="0" ${!x.adv.has ? "checked" : ""} ${can ? "" : "disabled"} data-cxadv> ไม่มี</label><label style="font-weight:400"><input type="radio" name="advHas" value="1" ${x.adv.has ? "checked" : ""} ${can ? "" : "disabled"} data-cxadv> มี</label>
      <span class="cx-advbox" style="display:${x.adv.has ? "inline-flex" : "none"};gap:8px;align-items:center"><input type="number" name="advPct" value="${esc(x.adv.pct)}" min="0" max="100" step="0.01" style="width:90px" ${can ? "" : "disabled"} data-cxcalc> % = <b class="cx-adv">${fmt(kxAdvAmt(x))}</b> บาท (ระบบคำนวณ)</span></div></div>
    ${can ? `<div class="row" style="flex:1 1 100%"><button class="btn primary" type="submit">บันทึกสัญญา</button>${miss.length && x.saved ? `<span class="sub">ยังขาด: ${esc(miss.join(", "))}</span>` : ""}</div>` : ""}</form>`;
  const am = `<h3 style="margin:14px 0 6px">สัญญาแก้ไข (ขยายเวลา / ปรับวงเงิน)</h3><div class="tbl-wrap"><table class="cx-amends"><thead><tr><th>ครั้งที่</th><th>เลขที่การแก้ไขสัญญา</th><th>ลงวันที่</th><th>ประเภท</th><th class="n">ขยาย (วัน)</th><th class="n">วงเงินใหม่ (บาท)</th><th>วันสิ้นสุดใหม่</th><th>เหตุผล</th><th>ไฟล์</th></tr></thead><tbody>
    ${x.amends.length ? x.amends.map((a, j) => { const end = kxEnd0(x) ? kxAdd(kxEnd0(x), x.amends.slice(0, j + 1).reduce((s, m) => s + (m.days || 0), 0)) : ""; return `<tr><td>${a.i}</td><td class="mono">${esc(a.no)}</td><td>${fdate(a.date)}</td><td>${KX_AMEND[a.kind]}</td><td class="n">${a.days || "—"}</td><td class="n">${a.amount !== "" ? fmt(a.amount) : "—"}</td><td>${end ? fdate(end) : "—"}</td><td>${esc(a.why || "")}</td><td>${a.file ? "📎 " + esc(a.file.name) : "—"}</td></tr>`; }).join("") : `<tr><td colspan="9" class="sub">ยังไม่มีการแก้ไขสัญญา</td></tr>`}</tbody></table></div>
    ${can ? `<form data-cxam="${k.id}" class="inline-form" style="display:flex;flex-wrap:wrap;gap:10px;margin-top:6px">${kxIn("no", "เลขที่การแก้ไขสัญญา", "", "text", 1)}${kxIn("date", "ลงวันที่", "", "date", 1)}<div class="f"><label>ประเภท</label><select name="kind">${Object.entries(KX_AMEND).map(([kk, t]) => `<option value="${kk}">${t}</option>`).join("")}</select></div>${kxIn("days", "ขยาย (วัน)", "", "number", 1, 'min="0" step="1"')}${kxIn("amount", "วงเงินใหม่ (บาท)", "", "number", 1, 'min="0" step="0.01"')}${kxIn("why", "เหตุผล", "", "text", 1, 'maxlength="500"')}<div class="f"><label>ไฟล์บันทึกแก้ไขสัญญา</label><input type="file" name="file"></div><div class="f" style="align-self:end"><button class="btn" type="submit">เพิ่มการแก้ไขสัญญา</button></div></form>` : ""}`;
  return `<div class="body cx-contract" style="display:flex;flex-direction:column;gap:8px">${kxAlertBox(k)}${form}${am}</div>`;
}
function kxManageView(k) {
  const x = kxOf(k), can = kxCanEdit(), pay = kxCanPay(), adv = kxAdvAmt(x), w = kxWarrEnd(x);
  let left = adv;
  const who = (lb, o) => o ? `<div class="sub">${lb}: ${esc(userName(o.by))} · ${fdate(o.t.slice(0, 10))}</div>` : "";
  const rows = x.dl.map((d, i) => { left = Math.max(0, left - (d.deduct || 0)); const st = kxStage(d), docs = kxDocs(d), back = d.chk && d.chk.st === "back";
    return `<tr><td>${d.n}${x.lastAccept && i === x.dl.length - 1 ? `<div class="sub">งวดสุดท้าย</div>` : ""}</td><td>${fdate(d.deliver)}</td>
      <td>${d.accept ? `${tag("ตรวจรับเสร็จสิ้น", "p-ok")}<div class="sub">${fdate(d.accept)}</div>` : `${tag("กำลังดำเนินการ", "p-warn")}${can ? `<form data-cxdle="${k.id}|${i}" class="row" style="gap:4px;margin-top:4px"><input type="date" name="accept" title="วันที่ตรวจรับ"><button class="btn ghost" type="submit">ตรวจรับเสร็จ</button></form>` : ""}`}</td>
      <td class="n">${fmt(d.amount)}</td><td class="n">${d.deduct ? fmt(d.deduct) : "—"}</td>${adv ? `<td class="n">${fmt(left)}</td>` : ""}<td class="n"><b>${fmt(d.pay)}</b></td>
      <td>${tag(st[0], st[1])}${back ? `<div class="sub" style="color:var(--bad)">เหตุผล: ${esc(d.chk.why)}</div>${can ? `<form data-cxdle="${k.id}|${i}"><input type="hidden" name="resend" value="1"><button class="btn ghost" type="submit">ส่งตรวจอีกครั้ง</button></form>` : ""}` : ""}
        ${pay && d.accept && !d.book ? `<form data-cxpay="${k.id}|${i}" style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px"><b class="sub" style="flex:1 1 100%">ตรวจใบสำคัญ</b><select name="chk"><option value="ok">ผ่าน</option><option value="back">ส่งกลับ</option></select><input name="why" placeholder="เหตุผล (ถ้าส่งกลับ)" maxlength="500"><button class="btn ghost" type="submit">บันทึกผลตรวจ</button></form>` : ""}
        ${pay && d.chk && d.chk.st === "ok" && !d.book ? `<form data-cxpay="${k.id}|${i}" style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px"><b class="sub" style="flex:1 1 100%">บันทึกเอกสารเบิกจ่าย (บัญชี)</b><input type="hidden" name="book" value="on"><input type="file" name="book"><button class="btn ghost" type="submit">บันทึกเอกสารเบิกจ่าย</button></form>` : ""}
        ${pay && d.book && d.status !== "paid" ? `<form data-cxpay="${k.id}|${i}" style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px"><b class="sub" style="flex:1 1 100%">การเงิน: วันที่ผู้รับจ้างได้รับเงิน</b><input type="hidden" name="status" value="paid"><input type="date" name="paidDate"><input type="file" name="pay" title="หลักฐานการจ่ายเงิน"><button class="btn ghost" type="submit">บันทึกจ่ายแล้ว</button></form>` : ""}</td>
      <td>${docs.length ? `<details class="cx-docs"><summary class="btn ghost" style="display:inline-block">📎 ${docs.length} เอกสาร</summary><ul style="margin:4px 0 0;padding-left:16px">${docs.map(([lb, fl]) => `<li><span class="sub">${lb}:</span> ${esc(fl.name)}</li>`).join("")}</ul></details>` : `<span class="sub">0 เอกสาร</span>`}</td>
      <td style="min-width:170px">${who("พัสดุ", { by: d.by, t: d.t })}${who(d.chk && d.chk.st === "back" ? "ส่งกลับ" : "ตรวจใบสำคัญ", d.chk)}${who("บัญชี", d.book)}${who("การเงิน", d.paid)}</td>
      <td style="min-width:180px">${can ? `<form data-cxdle="${k.id}|${i}"><textarea name="note" maxlength="500" rows="2" style="width:100%">${esc(d.note)}</textarea><button class="btn ghost" type="submit">บันทึกหมายเหตุ</button></form>` : esc(d.note) || "—"}</td></tr>`; }).join("");
  const sum = (f) => x.dl.reduce((s, d) => s + (Number(d[f]) || 0), 0);
  return `<div class="body cx-manage" style="display:flex;flex-direction:column;gap:8px">${kxAlertBox(k)}
    <div class="facts"><span class="fact">วงเงินสัญญา <b>${fmt(kxAmount(x))}</b></span><span class="fact">งวดงานตามสัญญา <b>${x.nPhases || "—"}</b></span><span class="fact">ส่งมอบแล้ว <b>${x.dl.length}</b> ครั้ง</span>${adv ? `<span class="fact">เงินเบิกล่วงหน้า <b>${fmt(adv)}</b> (${x.adv.pct}%) คงเหลือ <b>${fmt(kxAdvLeft(x))}</b></span>` : ""}<span class="fact">จ่ายจริงแล้ว <b>${fmt(x.dl.filter(d => d.status === "paid").reduce((s, d) => s + d.pay, 0))}</b></span>${kxFine(x) ? `<span class="fact">ค่าปรับสะสม <b>${fmt(kxFine(x))}</b> (${kxLate(x)} วัน)</span>` : ""}</div>
    <div class="tbl-wrap"><table class="cx-dl"><thead><tr><th>ครั้งที่</th><th>วันที่ส่งมอบ</th><th>สถานะตรวจรับ</th><th class="n">จำนวนเงินตามงวดงาน</th><th class="n">หักคืนเบิกล่วงหน้า</th>${adv ? `<th class="n">เบิกล่วงหน้าคงเหลือ</th>` : ""}<th class="n">จำนวนเงินจ่ายจริง</th><th>สถานะการเบิกจ่าย</th><th>เอกสารแนบ</th><th>ผู้ดำเนินการ</th><th>หมายเหตุ (บันทึกการเบิกจ่าย)</th></tr></thead>
      <tbody>${rows || `<tr><td colspan="11" class="sub">ยังไม่มีการส่งมอบ</td></tr>`}${x.dl.length ? `<tr><td colspan="3"><b>รวม</b></td><td class="n"><b>${fmt(sum("amount"))}</b></td><td class="n"><b>${fmt(sum("deduct"))}</b></td>${adv ? "<td></td>" : ""}<td class="n"><b>${fmt(sum("pay"))}</b></td><td colspan="4"></td></tr>` : ""}</tbody></table></div>
    ${can ? `<form data-cxdl="${k.id}" class="inline-form" style="display:flex;flex-wrap:wrap;gap:10px"><div class="f"><label>ครั้งที่</label><div><b>${x.dl.length + 1}</b></div></div>${kxIn("deliver", "วันที่ส่งมอบ *", "", "date", 1)}${kxIn("accept", "วันที่ตรวจรับ", "", "date", 1)}${kxIn("amount", "จำนวนเงินตามงวดงาน (บาท) *", "", "number", 1, 'min="0" step="0.01" data-cxdlcalc')}${adv ? kxIn("deduct", `หักคืนเบิกล่วงหน้า (ว่าง = ระบบคำนวณตามสัดส่วน, คงเหลือ ${fmt(kxAdvLeft(x))})`, "", "number", 1, 'min="0" step="0.01"') : ""}<div class="f"><label>เอกสารการส่งมอบและตรวจรับ</label><input type="file" name="dl"></div><div class="f" style="align-self:end"><label style="font-weight:400"><input type="checkbox" name="last"> การตรวจรับงวดสุดท้าย (ใช้วันที่ส่งมอบ)</label></div><div class="f" style="flex:1 1 100%"><label>หมายเหตุ (ไม่เกิน 500 ตัวอักษร)</label><textarea name="note" maxlength="500" rows="2"></textarea></div><div class="row" style="flex:1 1 100%"><button class="btn primary" type="submit">บันทึกส่งมอบครั้งที่ ${x.dl.length + 1}</button></div></form>` : ""}
    <div class="sub">${x.lastAccept ? `การตรวจรับงวดสุดท้าย: <b>${fdate(x.lastAccept)}</b> · ครบประกันความชำรุดบกพร่อง 2 ปี: <b>${fdate(w)}</b> (แจ้งเตือนล่วงหน้า 2 เดือน: ${fdate(kxAdd(w, -61))})` : "ติ๊ก \"การตรวจรับงวดสุดท้าย\" ตอนบันทึกส่งมอบ ระบบใช้วันที่ส่งมอบเริ่มนับประกันความชำรุดบกพร่อง 2 ปี"}</div>
    <div class="sub">ลำดับงาน: เจ้าหน้าที่พัสดุบันทึกส่งมอบและตรวจรับ → ตรวจใบสำคัญ พร้อมปรับสถานะ ส่งกลับได้ (ผู้ตรวจใบสำคัญ) → บันทึกเอกสารเบิกจ่าย พร้อมปรับสถานะ (ฝ่ายบัญชี) → บันทึกวันที่ผู้รับจ้างรับเงิน แนบเอกสาร และปรับสถานะเบิกจ่าย (ฝ่ายการเงิน)</div></div>`;
}

// ---------- the contract page: the first tab is the contract, a new tab for management and payment ----------
CON_TABS[0] = ["phases", ["สัญญาและสัญญาแก้ไข", "Contract and amendments"]];
CON_TABS.splice(Math.max(1, CON_TABS.findIndex(x => x[0] === "committees") + 1), 0, ["cxdl", ["บริหารสัญญาและเบิกจ่าย", "Contract management and payment"]]);
{ const base = conTabBody;
  conTabBody = function (c, k) {
    // P52 (23 Nov 2569): the old phase table is gone from the screen; the payments by occasion are on the management and payment tab
    // the tab "การแก้ไขสัญญา" is gone (its table is in this first tab); change requests still waiting in the older flow are listed here
    if (k === "phases") return kxContractView(c) + ((c.vars || []).length ? base(c, "vars") : "");
    if (k === "cxdl") return kxManageView(c) + (window.KX_OLDPAY && typeof payBlock === "function" ? payBlock(c) : ""); // P54: one table only
    return base(c, k);
  }; }

// ---------- the case page: step 4 gets the contract, steps 5 and 6 become one ----------
{ const base = caseExtraPanels;
  caseExtraPanels = function (c) { const out = base(c), k = caseCon(c);
    if (k) { out.push(cmPanel(4, 0.5, "สัญญาและสัญญาแก้ไข", kxContractView(k))); out.push(cmPanel(5, 0.5, "ส่งมอบ ตรวจรับ และเบิกจ่าย (ครั้งที่)", kxManageView(k))); }
    return out; }; }
{ const base = caseRegroup;
  caseRegroup = function (c) { const was = document.querySelector(".case-main") && document.querySelector(".case-main").dataset.grouped; base(c); if (was) return;
    const b5 = document.querySelector('.cphase[data-cphase="5"]'), b6 = document.querySelector('.cphase[data-cphase="6"]'), b7 = document.querySelector('.cphase[data-cphase="7"]'), m5 = document.querySelector('.cmain[data-cmain="5"]'), m6 = document.querySelector('.cmain[data-cmain="6"]');
    if (!b5 || !b6 || !m5 || !m6) return;
    [...m6.children].forEach(el => m5.appendChild(el)); m6.innerHTML = ""; m6.dataset.merged = "5";
    const { phases } = casePhases(c), p5 = phases[4], p6 = phases[5], all = p5.items.concat(p6.items), st = p5.state === "done" && p6.state === "done" ? "done" : p5.state === "now" || p6.state === "now" ? "now" : p5.state;
    const nm = b5.querySelector("b"); if (nm) nm.textContent = "บริหารสัญญาและเบิกจ่าย"; const subs = b5.querySelectorAll(".sub"), cnt = subs[subs.length - 1]; if (cnt) cnt.textContent = `${all.filter(x => x.ok).length}/${all.length}`;
    const tg = b5.querySelector(".pill, .tag"); if (tg && st !== p5.state) { const lab = { done: ["เสร็จ", "p-ok"], now: ["กำลังทำ", "p-info"], todo: ["รอ", "p-mute"] }[st]; if (lab) { tg.textContent = lab[0]; tg.className = tg.className.replace(/p-\w+/, lab[1]); } }
    b5.dataset.cstate = st; b6.style.display = "none"; b6.dataset.merged = "5";
    const n7 = b7 && b7.querySelector(".mono"); if (n7) n7.textContent = "6";
    if (CASE_MAIN[c.id] === 6 || (!CASE_MAIN[c.id] && !m6.hidden)) { m6.hidden = true; m5.hidden = false; }
    b6.onclick = () => b5.click(); };
}

// ---------- handlers ----------
const kxFiles = (fd, names) => { const o = {}; names.forEach(n => { const f = fd.get(n); if (f && f.name) o[n] = f; }); return o; };
const kxDone = m => { commit(); route(); toast(m); };
document.addEventListener("submit", e => { const f = e.target; if (!f || !f.matches) return; const fd = () => new FormData(f), val = n => String(fd().get(n) || "").trim();
  if (f.matches("[data-cx]")) { e.preventDefault(); const k = famCon(f.dataset.cx), d = fd(), v = {}; KX_F.forEach(n => { if (d.has(n)) v[n] = String(d.get(n)).trim(); }); if (d.has("advHas")) v.advHas = d.get("advHas") === "1"; if (d.has("advPct")) v.advPct = String(d.get("advPct")).trim();
    const gk = d.get("gkind"); if (gk) { v.gkind = gk; const box = f.querySelector(`.cx-g[data-gk="${gk}"]`); box.querySelectorAll("[name]").forEach(el => { if (el.type !== "file") v[el.name] = el.value.trim(); }); }
    const files = kxFiles(d, ["contract", "party", "boq"]); { const gf = f.querySelector(`.cx-g[data-gk="bg"] input[type=file]`); if (gk === "bg" && gf && gf.files[0]) files.guar = gf.files[0]; }
    const m = kxSave(k, v, files); if (m) { toast(m); return; } const miss = kxMissing(k); kxDone(miss.length ? "บันทึกแล้ว ยังขาด: " + miss.join(", ") : "บันทึกสัญญาแล้ว"); return; }
  if (f.matches("[data-cxam]")) { e.preventDefault(); const d = fd(); const m = kxAmendAdd(famCon(f.dataset.cxam), { no: val("no"), date: val("date"), kind: val("kind"), days: val("days"), amount: val("amount"), why: val("why") }, kxFiles(d, ["file"]).file); m ? toast(m) : kxDone("บันทึกการแก้ไขสัญญาแล้ว"); return; }
  if (f.matches("[data-cxdl]")) { e.preventDefault(); const d = fd(); const m = kxDlAdd(famCon(f.dataset.cxdl), { deliver: val("deliver"), accept: val("accept"), amount: val("amount"), deduct: d.has("deduct") ? val("deduct") : "", note: String(d.get("note") || ""), last: d.get("last") === "on" }, kxFiles(d, ["dl"])); m ? toast(m) : kxDone("บันทึกการส่งมอบแล้ว"); return; }
  if (f.matches("[data-cxdle]")) { e.preventDefault(); const [kid, i] = f.dataset.cxdle.split("|"), d = fd(), v = {}; if (d.has("note")) v.note = String(d.get("note")); if (d.has("accept")) v.accept = val("accept"); if (d.has("resend")) v.resend = true; const m = kxDlEdit(famCon(kid), Number(i), v, {}); m ? toast(m) : kxDone("บันทึกแล้ว"); return; }
  if (f.matches("[data-cxpay]")) { e.preventDefault(); const [kid, i] = f.dataset.cxpay.split("|"), d = fd(); const m = kxPay(famCon(kid), Number(i), { status: val("status"), paidDate: val("paidDate"), chk: val("chk") || undefined, why: val("why"), book: d.has("book") }, kxFiles(d, ["pay", "book"])); m ? toast(m) : kxDone("ปรับสถานะการเบิกจ่ายแล้ว"); return; }
  if (f.matches("[data-cxla]")) { e.preventDefault(); const m = kxLastAccept(famCon(f.dataset.cxla), val("d")); m ? toast(m) : kxDone("บันทึกวันตรวจรับงวดสุดท้ายแล้ว"); return; }
});
document.addEventListener("change", e => { const t = e.target; if (!t || !t.matches) return; const f = t.closest && t.closest("form[data-cx]"); if (!f) return;
  if (t.matches("[data-cxgk]")) f.querySelectorAll(".cx-g").forEach(b => (b.style.display = b.dataset.gk === t.value ? "flex" : "none"));
  if (t.matches("[data-cxadv]")) f.querySelector(".cx-advbox").style.display = t.value === "1" ? "inline-flex" : "none"; });
document.addEventListener("input", e => { const t = e.target; if (!t || !t.matches || !t.matches("[data-cxcalc]")) return; const f = t.closest("form[data-cx]"); if (!f) return;
  const g = n => (f.querySelector(`[name="${n}"]`) || {}).value || "", days = Number(g("days")), st = g("start"), amt = Number(g("amount")), pct = Number(g("advPct"));
  const en = f.querySelector(".cx-end"); if (en) en.textContent = st && days > 0 ? fdate(kxAdd(st, days - 1)) : "—"; const ad = f.querySelector(".cx-adv"); if (ad) ad.textContent = fmt(amt > 0 && pct > 0 ? Math.round(amt * pct) / 100 : 0); });
document.addEventListener("click", e => { const b = e.target.closest && e.target.closest("[data-cxparty]"); if (!b) return; if (typeof PROC_TAB !== "undefined") { try { procSet("suppliers"); route(); } catch (er) { toast("เปิดทะเบียนคู่สัญญาไม่ได้"); } } });
// P52: no separate tab for contract changes any more
{ const i = CON_TABS.findIndex(x => x[0] === "vars"); if (i >= 0) CON_TABS.splice(i, 1); }
