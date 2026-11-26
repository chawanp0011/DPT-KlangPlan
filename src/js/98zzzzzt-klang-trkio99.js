// ---------- P99: steps 2 จัดทำข้อมูล, 3 ส่ง e-GP, 4 ทำสัญญา: download the follow-up form, import it back ----------
// Asked for: a button to download แบบฟอร์มติดตามความก้าวหน้าการดำเนินงาน and a button to import it, to update the data.
// Download: the form of the latest layout (m88Track67) with this item's row only. Import: the row of this item (found by the GFMIS
// code, or the only data row) updates the columns of the step it is imported from, nothing else:
//   step 2 (สำนัก/กอง): ไร่ ครัวเรือน แห่ง, สำรวจ/ออกแบบ, แบบแล้วเสร็จ, ประมาณราคา, จัดทำ TOR;
//   step 3 (e-GP): columns 23-45 of the form (project no. to the offer to sign);
//   step 4 (ทำสัญญา): contract no., date, amount, period, PO, length, progress %, problem (the contract must exist).
// Dates are read as ว/ด/ป in พ.ศ. (or ค.ศ., or an Excel date number); amounts in ล้านบาท become baht.
const T99_STEP = { 2: "จัดทำข้อมูล (สำนัก/กอง)", 3: "ส่ง e-GP", 4: "ทำสัญญา" };
function t99Row(c) { const fy = prFyOfPlan(famPlan(c.plan)), D = prDtRows(fy, false), k = caseCon(c);
  const i = D.findIndex(r => (k && r.k && r.k.id === k.id) || ((S.bi && S.bi.rows) || []).some(b => b.id === r.id && b.sent && (b.sent.pp === c.plan || (b.sent.extra || []).some(e => e.pp === c.plan))) || (famPlan(c.plan).biSrc && famPlan(c.plan).biSrc === r.id));
  return { fy, i, r: D[i] }; }
function t99Download(c) { const { fy, i, r } = t99Row(c); if (i < 0) return "ไม่พบรายการนี้ในแบบฟอร์มติดตาม"; const book = m88Track67(fy), sh = book[0], row = sh.rows[5 + i];
  sh.rows = sh.rows.slice(0, 5).concat([row]); xwDownload(`แบบฟอร์มติดตามความก้าวหน้า ${r.code || r.id} ปี ${fy}.xlsx`, [sh]); return ""; }
const t99Date = v => { if (v === "" || v == null) return ""; if (typeof v === "number" || /^\d{5}(\.\d+)?$/.test(String(v))) { const d = new Date(Date.UTC(1899, 11, 30) + Number(v) * 864e5); return d.toISOString().slice(0, 10); }
  const m = String(v).trim().match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/); if (!m) return ""; let y = Number(m[3]); if (y < 100) y += 2500; if (y > 2400) y -= 543; return `${y}-${String(m[2]).padStart(2, "0")}-${String(m[1]).padStart(2, "0")}`; };
const t99Range = v => String(v || "").split(/\s+-\s+|\s+ถึง\s+/).map(t99Date);
const t99Num = v => { const n = Number(String(v == null ? "" : v).replace(/,/g, "")); return v === "" || v == null || isNaN(n) ? "" : n; };
const t99Baht = v => { const n = t99Num(v); return n === "" ? "" : Math.round(n * 1e6 * 100) / 100; };
async function t99Import(c, step, file) { const rows = await xlsxRead(await file.arrayBuffer(), 200), { r } = t99Row(c); if (!r) return "ไม่พบรายการนี้ในแบบฟอร์มติดตาม";
  const data = rows.slice(5).filter(x => x && x.some(v => v !== "" && v != null)), row = data.find(x => String(x[4] || "").trim() && String(x[4]).trim() === String(r.code || "").trim()) || (data.length === 1 ? data[0] : null);
  if (!row) return "ไม่พบแถวของรายการนี้ในไฟล์ (ตรวจรหัสงบประมาณ GFMIS)"; const v = i => (row[i] == null ? "" : row[i]); let n = 0; const set = (o, k, x) => { if (x !== "" && x != null && o[k] !== x) { o[k] = x; n++; } };
  const E = egp7Of(c);
  if (step === 2) { const rq = caseReq(c) || S.reqn.find(q => q.plan === c.plan); if (rq) { rq.detail = rq.detail || {}; set(rq.detail, "qRai", t99Num(v(15))); set(rq.detail, "qHouse", t99Num(v(16))); set(rq.detail, "qPlace", t99Num(v(17))); }
    set(E.s2, "survey", t99Date(v(18))); set(E.s2, "designDone", t99Date(v(19))); set(E.s2, "estDate", t99Date(v(20))); set(E.s2, "torDone", t99Date(v(21))); }
  if (step === 3) { if (!egpUpCan(c)) return "เฉพาะเจ้าหน้าที่พัสดุนำเข้าข้อมูล e-GP"; set(E.s2, "projNo", String(v(22)).trim()); set(E.s1, "date", t99Date(v(23))); set(E.s2, "refPrice", t99Baht(v(24))); set(E.s2, "refDate", t99Date(v(25))); set(E.s2, "reqDate", t99Date(v(26)));
    const [d0, d1] = t99Range(v(27)); if (d0) { set(E.s3, "draft", true); set(E.s3, "draftDate", d0); set(E.s3, "draftEnd", d1); } const [i0, i1] = t99Range(v(28)); set(E.s3, "inviteDate", i0); set(E.s3, "inviteEnd", i1); set(E.s3, "bidDate", t99Date(v(29)));
    const [p0, p1] = t99Range(v(30)); set(E.s4, "start", p0); set(E.s4, "end", p1); set(E.s4, "round", t99Num(v(31))); set(E.s4, "winner", String(v(32)).trim()); set(E.s4, "price", t99Baht(v(33)));
    set(E.s4, "bbLetter", String(v(34)).trim()); set(E.s4, "bbOkLetter", String(v(35)).trim()); set(E.s4, "bbAmount", t99Baht(v(36))); if (String(v(38)).trim()) { set(E.s4, "cab", "yes"); set(E.s4, "cabLetter", String(v(38)).trim()); }
    set(E.s5, "approve", t99Date(v(39))); set(E.s5, "days", t99Num(v(40))); set(E.s5, "winnerDate", t99Date(v(41))); if (E.s5.winnerDate) E.s5.appealEnd = egp7AppealEnd(E.s5.winnerDate); set(E.s6, "callDate", t99Date(v(43))); set(E.s7, "offerDate", t99Date(v(44)));
    for (let s = 7; s >= 1; s--) { if (!egp7Missing(c, s).filter(m => !/ไฟล์/.test(m)).length && Object.keys(E["s" + s]).length) { if ((E.stage || 0) < s) E.stage = s; break; } } }
  if (step === 4) { const k = caseCon(c); if (!k) return "ยังไม่มีสัญญา: กดสร้างสัญญาก่อน แล้วนำเข้าอีกครั้ง"; if (!kxCanEdit()) return "เฉพาะเจ้าหน้าที่พัสดุนำเข้าข้อมูลสัญญา"; const x = kxOf(k);
    set(x, "no", String(v(45)).trim()); set(x, "date", t99Date(v(46))); set(x, "amount", t99Baht(v(47))); const [s0, s1] = t99Range(v(48)); set(x, "start", s0); if (s0 && s1) set(x, "days", Math.round((new Date(s1) - new Date(s0)) / 864e5) + 1);
    set(x, "po", String(v(49)).trim()); set(x, "qLen", t99Num(v(37))); set(x, "work", t99Num(v(51))); set(x, "problem", String(v(54)).trim()); }
  if (!n) return "ไม่มีค่าที่เปลี่ยน (ไฟล์มีค่าเท่าเดิม หรือช่องของขั้นนี้ว่าง)"; (c.events = c.events || []).push({ t: nowIso(), by: me().id, ev: "trkimport", note: `นำเข้าแบบฟอร์มติดตาม ขั้น ${T99_STEP[step]} ${n} ค่า` });
  audit(["นำเข้าแบบฟอร์มติดตามความก้าวหน้า", "Imported the follow-up form"], `${c.id} ขั้น ${step} · ${n} ค่า`); return `ok:${n}`; }
function t99Panel(c, step) { return `<div class="row" style="gap:8px;flex-wrap:wrap;align-items:center"><button class="btn" type="button" data-t99dl="${esc(c.id)}">ดาวน์โหลดแบบฟอร์มติดตามความก้าวหน้าการดำเนินงาน</button>
  <label class="btn primary" style="cursor:pointer;margin:0">นำเข้า<input type="file" accept=".xlsx" hidden data-t99im="${esc(c.id)}|${step}"></label>
  <span class="sub">นำเข้าแล้วระบบอัปเดตเฉพาะคอลัมน์ของขั้น ${T99_STEP[step]} ในแถวของรายการนี้ (จับคู่ด้วยรหัสงบประมาณ GFMIS)</span></div>`; }
{ const base = caseExtraPanels; caseExtraPanels = function (c) { const out = base(c); if (!m88On()) return out; [2, 3, 4].forEach(s => out.push(cmPanel(s, -1, "แบบฟอร์มติดตามความก้าวหน้า", t99Panel(c, s)))); return out; }; }
document.addEventListener("click", e => { const t = e.target && e.target.closest ? e.target.closest("[data-t99dl]") : null; if (!t) return; const m = t99Download(S.cases.find(c => c.id === t.dataset.t99dl)); toast(m || "ดาวน์โหลดแบบฟอร์มแล้ว"); });
document.addEventListener("change", async e => { const t = e.target; if (!t || !t.matches || !t.matches("[data-t99im]") || !t.files[0]) return; const [id, s] = t.dataset.t99im.split("|"), c = S.cases.find(x => x.id === id);
  try { const m = await t99Import(c, Number(s), t.files[0]); if (/^ok:/.test(m)) { commit(); route(); toast(`นำเข้าแล้ว อัปเดต ${m.slice(3)} ค่า`); } else toast(m); } catch (err) { toast("อ่านไฟล์ไม่ได้: " + (err.message || err)); } t.value = ""; });
