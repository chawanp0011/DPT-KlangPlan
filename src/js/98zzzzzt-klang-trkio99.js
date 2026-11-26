// ---------- P99: steps 2 จัดทำข้อมูล, 3 ส่ง e-GP, 4 ทำสัญญา: download the follow-up form, import it back ----------
// Asked for: a button to download แบบฟอร์มติดตามความก้าวหน้าการดำเนินงาน and a button to import it, to update the data.
// The two buttons sit at the top right of the case (next to ประวัติ) on steps 2-4; the import shows what the reader found before it updates.
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
let T99_LOG = [];
async function t99Import(c, step, file, rowsIn) { const rows = rowsIn || await xlsxRead(await file.arrayBuffer(), 200), { r } = t99Row(c); if (!r) return "ไม่พบรายการนี้ในแบบฟอร์มติดตาม";
  const data = rows.slice(5).filter(x => x && x.some(v => v !== "" && v != null)), row = data.find(x => String(x[4] || "").trim() && String(x[4]).trim() === String(r.code || "").trim()) || (data.length === 1 ? data[0] : null);
  if (!row) return "ไม่พบแถวของรายการนี้ในไฟล์ (ตรวจรหัสงบประมาณ GFMIS)"; const v = i => (row[i] == null ? "" : row[i]); let n = 0; const set = (o, k, x) => { if (x !== "" && x != null && o[k] !== x) { T99_LOG.push([k, o[k], x]); o[k] = x; n++; } };
  const E = egp7Of(c);
  if (step === 2) { const rq = caseReq(c) || S.reqn.find(q => q.plan === c.plan); if (rq) { rq.detail = rq.detail || {}; set(rq.detail, "qRai", t99Num(v(15))); set(rq.detail, "qHouse", t99Num(v(16))); set(rq.detail, "qPlace", t99Num(v(17))); }
    set(E.s2, "survey", t99Date(v(18))); set(E.s2, "designDone", t99Date(v(19))); set(E.s2, "estDate", t99Date(v(20))); set(E.s2, "torDone", t99Date(v(21))); }
  if (step === 3) { if (!egpUpCan(c)) return "เฉพาะเจ้าหน้าที่พัสดุนำเข้าข้อมูล e-GP"; set(E.s2, "projNo", String(v(22)).trim()); set(E.s1, "date", t99Date(v(23))); set(E.s2, "refPrice", t99Baht(v(24))); set(E.s2, "refDate", t99Date(v(25))); set(E.s2, "reqDate", t99Date(v(26)));
    const [d0, d1] = t99Range(v(27)); if (d0) { set(E.s3, "draft", true); set(E.s3, "draftDate", d0); set(E.s3, "draftEnd", d1); } const [i0, i1] = t99Range(v(28)); set(E.s3, "inviteDate", i0); set(E.s3, "inviteEnd", i1); set(E.s3, "bidDate", t99Date(v(29)));
    const [p0, p1] = t99Range(v(30)); set(E.s4, "start", p0); set(E.s4, "end", p1); set(E.s4, "round", t99Num(v(31))); set(E.s4, "winner", String(v(32)).trim()); set(E.s4, "price", t99Baht(v(33)));
    set(E.s4, "bbLetter", String(v(34)).trim()); set(E.s4, "bbOkLetter", String(v(35)).trim()); set(E.s4, "bbAmount", t99Baht(v(36))); set(E.s4, "qLen", t99Num(v(37))); set(E.s4, "cabLetter", String(v(38)).trim());
    set(E.s5, "approve", t99Date(v(39))); set(E.s5, "days", t99Num(v(40))); set(E.s5, "winnerDate", t99Date(v(41))); if (E.s5.winnerDate) E.s5.appealEnd = egp7AppealEnd(E.s5.winnerDate); set(E.s6, "callDate", t99Date(v(43))); set(E.s7, "offerDate", t99Date(v(44)));
    for (let s = 7; s >= 1; s--) { if (!egp7Missing(c, s).filter(m => !/ไฟล์/.test(m)).length && Object.keys(E["s" + s]).length) { if ((E.stage || 0) < s) E.stage = s; break; } } }
  if (step === 4) { const k = caseCon(c); if (!k) return "ยังไม่มีสัญญา: กดสร้างสัญญาก่อน แล้วนำเข้าอีกครั้ง"; if (!kxCanEdit()) return "เฉพาะเจ้าหน้าที่พัสดุนำเข้าข้อมูลสัญญา"; const x = kxOf(k);
    set(x, "no", String(v(45)).trim()); set(x, "date", t99Date(v(46))); set(x, "amount", t99Baht(v(47))); const [s0, s1] = t99Range(v(48)); set(x, "start", s0); if (s0 && s1) set(x, "days", Math.round((new Date(s1) - new Date(s0)) / 864e5) + 1);
    set(x, "po", String(v(49)).trim()); set(x, "qLen", t99Num(v(37))); set(x, "work", t99Num(v(51))); set(x, "problem", String(v(54)).trim()); }
  if (!n) return "ไม่มีค่าที่เปลี่ยน (ไฟล์มีค่าเท่าเดิม หรือช่องของขั้นนี้ว่าง)"; (c.events = c.events || []).push({ t: nowIso(), by: me().id, ev: "trkimport", note: `นำเข้าแบบฟอร์มติดตาม ขั้น ${T99_STEP[step]} ${n} ค่า` });
  audit(["นำเข้าแบบฟอร์มติดตามความก้าวหน้า", "Imported the follow-up form"], `${c.id} ขั้น ${step} · ${n} ค่า`); return `ok:${n}`; }
// the buttons sit at the top right of the case, for the step shown (2, 3, 4)
const T99_COLS = { 2: [15, 21], 3: [22, 44], 4: [45, 54] };
const T99_LBL = { qRai: "ไร่", qHouse: "ครัวเรือน", qPlace: "แห่ง", survey: "สำรวจ/ออกแบบ", designDone: "แบบแล้วเสร็จ", estDate: "ประมาณราคา", torDone: "จัดทำ TOR แล้วเสร็จ", projNo: "เลขที่โครงการ (e-bidding)", date: "วันที่", refPrice: "ราคากลาง (บาท)", refDate: "เห็นชอบราคากลาง", reqDate: "เห็นชอบรายงานขอซื้อขอจ้าง",
  draft: "มีประกาศร่าง TOR", draftDate: "ประกาศร่าง TOR ตั้งแต่", draftEnd: "ประกาศร่าง TOR ถึง", inviteDate: "ประกาศขายแบบ/เชิญชวน ตั้งแต่", inviteEnd: "ประกาศขายแบบ/เชิญชวน ถึง", bidDate: "เสนอราคา", start: "เริ่ม", end: "ถึง", round: "ครั้งที่ประกวดราคา", winner: "ผู้เสนอราคาได้ต่ำสุด", price: "วงเงินที่เสนอ (บาท)",
  bbLetter: "ส่ง สงป. พิจารณา", bbOkLetter: "สงป. พิจารณาแล้ว", bbAmount: "วงเงินที่ สงป. เห็นชอบ (บาท)", cab: "ขยายก่อหนี้ผูกพัน", cabLetter: "ขยายก่อหนี้ผูกพัน เลขที่หนังสือ", approve: "อนุมัติจ้าง", days: "จำนวนวัน", winnerDate: "ประกาศผู้ชนะ", callDate: "แจ้งผู้รับจ้างลงนาม", offerDate: "เสนอลงนามสัญญา",
  no: "เลขที่สัญญา", amount: "วงเงินสัญญา (บาท)", po: "เลขที่ PO", qLen: "ความยาว (เมตร)", work: "ผลการดำเนินงานสะสม (%)", problem: "ปัญหา/อุปสรรค" };
function t99Bar(c, step) { return `<div class="t99-bar"><button class="btn" type="button" data-t99dl="${esc(c.id)}">ดาวน์โหลดแบบฟอร์มติดตามความก้าวหน้า</button><label class="btn primary" style="cursor:pointer;margin:0">นำเข้าเอกสารรายการงบประมาณ<input type="file" accept=".xlsx" hidden data-t99im="${esc(c.id)}|${step}"></label></div>`; }
function t99Place() { if (!m88On()) return; const tab = document.querySelector('button.cphase[aria-selected="true"]'), c = typeof CASE_OPEN !== "undefined" && CASE_OPEN ? S.cases.find(x => x.id === CASE_OPEN) : null, old = document.querySelector(".t99-bar");
  const step = tab ? Number(tab.dataset.cphase) : 0; if (!c || ![2, 3, 4].includes(step)) { if (old) old.remove(); return; } if (old && old.dataset.k === c.id + step && old.isConnected) return; if (old) old.remove();
  const h = [...document.querySelectorAll("button, a")].find(b => b.textContent.trim() === "ประวัติ" && b.offsetParent), host = h ? h.parentElement : null; if (!host) return;
  const d = document.createElement("div"); d.innerHTML = t99Bar(c, step); const bar = d.firstChild; bar.dataset.k = c.id + step; host.appendChild(bar); }
(function () { let tm = null; new MutationObserver(() => { clearTimeout(tm); tm = setTimeout(t99Place, 40); }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["aria-selected"] });
  const st = document.createElement("style"); st.textContent = ".t99-bar{display:flex;gap:8px;flex-wrap:wrap;margin-left:auto;justify-content:flex-end}.t99-back{position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:90}.t99-dlg{position:fixed;z-index:91;top:4vh;left:50%;transform:translateX(-50%);width:min(1100px,95vw);max-height:92vh;display:flex;flex-direction:column;background:var(--surface,#fff);border-radius:14px;box-shadow:0 20px 60px rgba(0,0,0,.3)}.t99-dlg header{padding:14px 18px;border-bottom:1px solid var(--line);display:flex;gap:10px;align-items:center}.t99-body{display:grid;grid-template-columns:1fr 1fr;gap:14px;padding:14px 18px;overflow:auto}.t99-body h4{margin:0 0 8px;font-size:14px}.t99-doc td,.t99-doc th,.t99-ai td,.t99-ai th{padding:5px 8px;border-bottom:1px solid var(--line);font-size:12.5px;vertical-align:top}.t99-doc tr.hit td,.t99-doc tr.hit th{background:#eff6ff}.t99-doc th{text-align:left;color:var(--muted,#64748b);font-weight:500;width:45%}.t99-ai .new{color:#16a34a;font-weight:600}.t99-ai .old{color:var(--muted,#94a3b8);text-decoration:line-through}.t99-dlg footer{padding:12px 18px;border-top:1px solid var(--line);display:flex;justify-content:flex-end;gap:8px}@media(max-width:800px){.t99-body{grid-template-columns:1fr}}"; document.head.appendChild(st); })();
// the AI step: read the document, show it and what was found, apply on confirm
const T99 = { pend: null };
async function t99Preview(c, step, file) { const rows = await xlsxRead(await file.arrayBuffer(), 200), rq0 = caseReq(c) || S.reqn.find(q => q.plan === c.plan), k0 = caseCon(c);
  const snap = JSON.stringify({ e: c.egp7 || null, rq: rq0 ? rq0.detail || null : null, cx: k0 ? k0.cx || null : null, ev: (c.events || []).length });
  T99_LOG = []; const m = await t99Import(c, step, null, rows); const log = T99_LOG.slice(), back = JSON.parse(snap); c.egp7 = back.e; if (rq0) rq0.detail = back.rq; if (k0) k0.cx = back.cx; if (c.events) c.events.length = back.ev; if (!/^ok:/.test(m)) return m;
  const head = rows[4] || [], data = rows.slice(5).filter(x => x && x.some(v => v !== "" && v != null)), { r } = t99Row(c), row = data.find(x => String(x[4] || "").trim() === String(r.code || "").trim()) || data[0], [a, b] = T99_COLS[step];
  T99.pend = { c, step, rows }; const show = v => (v === "" || v == null ? "–" : esc(String(v)));
  document.body.insertAdjacentHTML("beforeend", `<div class="t99-back" data-t99x></div><div class="t99-dlg" role="dialog" aria-modal="true"><header><b>AI อ่านเอกสารรายการงบประมาณ</b><span class="sub">${esc(file.name)} · ขั้น ${T99_STEP[step]}</span><span style="flex:1"></span><button class="btn ghost" type="button" data-t99x>✕</button></header>
    <div class="t99-body"><div><h4>เอกสาร: แถวของรายการนี้</h4><div class="sub" style="margin-bottom:6px">${esc(row[6] || r.name)} · GFMIS ${esc(row[4] || "")}</div><table class="t99-doc">${head.map((h, i) => (row[i] === "" || row[i] == null) && !(i >= a && i <= b) ? "" : `<tr class="${i >= a && i <= b ? "hit" : ""}"><th>${esc(String(h || "").replace(/\n/g, " "))}</th><td>${show(row[i])}</td></tr>`).join("")}</table><div class="sub" style="margin-top:6px">แถบสีฟ้า = คอลัมน์ของขั้นนี้ที่ระบบใช้</div></div>
    <div><h4>ข้อมูลที่ AI ดึงได้ (${log.length} ค่า)</h4><table class="t99-ai"><thead><tr><th>ช่อง</th><th>ในระบบ</th><th>จากเอกสาร</th></tr></thead><tbody>${log.map(([k, o, n]) => `<tr><td>${esc(T99_LBL[k] || k)}</td><td class="old">${show(o)}</td><td class="new">${show(n)}</td></tr>`).join("")}</tbody></table>
      <div class="sub" style="margin-top:8px">ระบบอ่านแถวที่รหัสงบประมาณ GFMIS ตรงกับรายการนี้ แปลงวันที่ (พ.ศ.) และจำนวนเงิน (ลบ. เป็นบาท) ให้ ตรวจแล้วกดอัปเดต (ตัวอ่านใช้กฎคงที่ ไม่ใช่โมเดลภาษา)</div></div></div>
    <footer><button class="btn ghost" type="button" data-t99x>ยกเลิก</button><button class="btn primary" type="button" data-t99ok>อัปเดตข้อมูล ${log.length} ค่า</button></footer></div>`); return ""; }
const t99Close = () => { document.querySelectorAll(".t99-back,.t99-dlg").forEach(x => x.remove()); T99.pend = null; };
document.addEventListener("click", async e => { const t = e.target && e.target.closest ? e.target : null; if (!t) return;
  const dl = t.closest("[data-t99dl]"); if (dl) { const m = t99Download(S.cases.find(c => c.id === dl.dataset.t99dl)); toast(m || "ดาวน์โหลดแบบฟอร์มแล้ว"); return; }
  if (t.closest("[data-t99x]")) { t99Close(); return; }
  if (t.closest("[data-t99ok]") && T99.pend) { const { c, step, rows } = T99.pend; T99_LOG = []; const m = await t99Import(c, step, null, rows); t99Close(); if (/^ok:/.test(m)) { commit(); route(); toast(`อัปเดตแล้ว ${m.slice(3)} ค่า`); } else toast(m); } });
document.addEventListener("change", async e => { const t = e.target; if (!t || !t.matches || !t.matches("[data-t99im]") || !t.files[0]) return; const [id, s] = t.dataset.t99im.split("|"), c = S.cases.find(x => x.id === id);
  try { const m = await t99Preview(c, Number(s), t.files[0]); if (m) toast(m); } catch (err) { toast("อ่านไฟล์ไม่ได้: " + (err.message || err)); } t.value = ""; });
