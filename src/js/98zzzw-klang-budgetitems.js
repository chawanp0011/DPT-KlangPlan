// KlangFinance, round P47 (20 Nov 2569): the first step of a procurement case, "กำหนดแผนงาน" (Planning), becomes "รายการงบประมาณ".
// Planning imports the budget items from a prepared file (the budget report with its monthly money plan), checks the list, and sends
// the good items to the bureaus and divisions. Each item sent becomes an item of the procurement plan with its case file, so the
// division raises the requisition from it as before. The sample file is fictional: ตัวอย่างเอกสารโครงการ/E_รายการงบประมาณ/.
// Data: S.bi = { rows: [...], files: [], at, src }. A row: { id, no, unit, unitName, code, prog, prod, name, kind, qty, uname, amount, plan[12], note, sent }.
const BI_MON = ["ต.ค.", "พ.ย.", "ธ.ค.", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย."];
const BI_SAMPLE = "ตัวอย่างเอกสารโครงการ/E_รายการงบประมาณ/รายการงบประมาณ 2570 แยกประเภท (ตัวอย่าง).xlsx"; // P51: the department's layout; the older single-sheet report is still read
let BI = { step: 1, msg: "", rep: [], unit: "", only: "" };
const biData = () => (S.bi = S.bi || { rows: [], files: [], at: "", src: "" });
const biNum = v => { if (typeof v === "number") return v; const n = Number(String(v == null ? "" : v).replace(/[,\s]/g, "")); return isNaN(n) ? 0 : n; };
// rows[][] of one sheet -> items, or null when the sheet is not the budget report
function biFromRows(rows) {
  const hi = rows.findIndex(r => (r || []).some(c => /รหัสงบประมาณ/.test(String(c))) && (r || []).some(c => /วงเงิน/.test(String(c)))); if (hi < 0) return null;
  const H = rows[hi].map(c => String(c == null ? "" : c).trim()), col = re => H.findIndex(h => re.test(h));
  const c = { no: col(/^ลำดับ/), uc: col(/รหัสหน่วยงาน/), un: col(/^หน่วยงาน$/), code: col(/รหัสงบประมาณ/), prog: col(/^แผนงาน$/), prod: col(/ผลผลิต|โครงการ/), name: col(/^รายการ$/), kind: col(/งบรายจ่าย/), qty: col(/^จำนวน$/), uname: col(/หน่วยนับ/), amount: col(/วงเงิน/), note: col(/หมายเหตุ/) };
  const pm = BI_MON.map(m => H.findIndex(h => h.includes("แผนเงิน") && h.includes(m))); if (c.name < 0 || c.amount < 0) return null;
  const g = (r, i) => (i < 0 ? "" : r[i] == null ? "" : r[i]);
  return rows.slice(hi + 1).filter(r => r && String(g(r, c.name)).trim()).map((r, i) => ({ id: "BI-" + (i + 1), no: g(r, c.no) || i + 1, unit: String(g(r, c.uc)).trim(), unitName: String(g(r, c.un)).trim(), code: String(g(r, c.code)).trim(), prog: String(g(r, c.prog)).trim(), prod: String(g(r, c.prod)).trim(), name: String(g(r, c.name)).trim(), kind: String(g(r, c.kind)).trim(), qty: biNum(g(r, c.qty)), uname: String(g(r, c.uname)).trim(), amount: biNum(g(r, c.amount)), plan: pm.map(j => biNum(g(r, j))), note: String(g(r, c.note)).trim(), sent: null }));
}
// P51 (23 Nov 2569): the department's own layout (the GFMIS / e-Budget match file): one sheet per type of spending (ครุภัณฑ์,
// จ้างที่ปรึกษา, ดำเนินการเอง, สิ่งก่อสร้าง), header GFMis · ภารกิจ · (ปีเดียว/ผูกพัน) · กิจกรรมหลัก · e-bud · หน่วยงาน (short name) ·
// วงเงินทั้งสิ้น · งปม. · รายการ, then the money plan; a totals row under the header; amounts in million baht.
const BI_TYPES = { "ครุภัณฑ์": "งบลงทุน", "สิ่งก่อสร้าง": "งบลงทุน", "จ้างที่ปรึกษา": "งบดำเนินงาน", "ดำเนินการเอง": "งบดำเนินงาน" };
const BI_ABBR = { "สบก.": "U01", "สทส.": "U03", "สพบ.": "U04", "สคพ.": "U05", "สพบค.": "U06" }; // the short names of the sample units (fictional)
function biFromTypeSheet(sheet, rows) {
  const hi = rows.findIndex(r => (r || []).some(c => /^รายการ$/.test(String(c).trim())) && (r || []).some(c => /วงเงิน|งปม/.test(String(c))) && (r || []).some(c => /gfmis|e-?bud/i.test(String(c)))); if (hi < 0) return null;
  const H = Array.from(rows[hi], c => String(c == null ? "" : c).trim()), col = re => H.findIndex(h => re.test(h)), g = (r, i) => (i < 0 ? "" : r[i] == null ? "" : r[i]);
  const c = { code: col(/gfmis|รหัสงบประมาณ/i), ebud: col(/e-?bud/i), miss: col(/ภารกิจ/), act: col(/กิจกรรม/), un: col(/หน่วยงาน/), total: col(/วงเงินทั้งสิ้น/), amount: col(/งปม/), name: col(/^รายการ$/) };
  if (c.amount < 0) c.amount = c.total; const pm = BI_MON.map(m => H.findIndex(h => h.includes("แผนเงิน") && h.includes(m)));
  const data = rows.slice(hi + 1).filter(r => r && String(g(r, c.name)).trim()), mill = !/บาท/.test(H[c.amount] || "") && data.every(r => biNum(g(r, c.amount)) < 10000), k = mill ? 1e6 : 1;
  const yrCol = H.findIndex((h, i) => !h && data.some(r => /ปีเดียว|ผูกพัน/.test(String(g(r, i))))), type = Object.keys(BI_TYPES).find(t => String(sheet).includes(t)) || String((rows[0] || [])[0] || sheet).trim();
  return data.map((r, i) => ({ id: "BI-" + (i + 1), no: i + 1, unit: "", unitName: String(g(r, c.un)).trim(), code: String(g(r, c.code)).trim(), ebud: String(g(r, c.ebud)).trim(), prog: String(g(r, c.miss)).trim(), prod: String(g(r, c.act)).trim(), years: String(g(r, yrCol)).trim(), type, name: String(g(r, c.name)).trim(), kind: BI_TYPES[type] || "", qty: 0, uname: "", amount: Math.round(biNum(g(r, c.amount)) * k * 100) / 100, plan: pm.map(j => Math.round(biNum(g(r, j)) * k * 100) / 100), note: "", sent: null }));
}
const biCanImport = () => ["plan", "admin"].includes(ROLE);
async function biImport(files) {
  if (!biCanImport()) return { err: "เฉพาะกองแผนงานนำเข้ารายการงบประมาณ" };
  const rep = [], out = [];
  for (const f of files) { if (!/\.xlsx$/i.test(f.name)) { rep.push([f.name, "", "ไม่ใช่ .xlsx", 0]); continue; } if ((f.size || 0) > 60e6) { rep.push([f.name, "", "ไฟล์ใหญ่เกิน 60 MB", 0]); continue; }
    let book; try { book = await dtXlsx(await f.arrayBuffer()); } catch (e) { rep.push([f.name, "", "อ่านไม่ได้: " + e.message, 0]); continue; }
    Object.entries(book).forEach(([sh, rows]) => { const it = biFromRows(rows) || biFromTypeSheet(sh, rows); if (it && it.length) { out.push(...it); rep.push([f.name, sh, it[0].type ? `รายการงบประมาณ: ${it[0].type}` : "รายการงบประมาณ", it.length]); } else rep.push([f.name, sh, "ไม่ใช่รูปแบบรายงานงบประมาณ", 0]); }); }
  if (!out.length) return { rep, err: "ไม่พบรายการงบประมาณในรูปแบบที่รู้จัก" };
  const d = biData(), kept = d.rows.filter(r => r.sent); out.forEach((r, i) => (r.id = `BI-${FAM_FY}-${String(kept.length + i + 1).padStart(3, "0")}`));
  Object.assign(d, { rows: kept.concat(out), files: files.map(f => f.name), at: nowIso(), src: "import" }); audit(["นำเข้ารายการงบประมาณ", "Imported the budget items"], `${out.length}`); return { rep, n: out.length };
}
// the check: what is wrong with each row
function biIssues(r, all) {
  const m = [], sum = r.plan.reduce((s, x) => s + x, 0);
  if (!r.code) m.push("ไม่มีรหัสงบประมาณ"); else if (all.some(x => x !== r && x.code === r.code && !x.sent === !r.sent)) m.push("รหัสงบประมาณซ้ำ");
  if (!(r.amount > 0)) m.push("วงเงินไม่ถูกต้อง"); if (!biUnit(r)) m.push(`ไม่รู้จักหน่วยงาน ${r.unit || ""}`.trim());
  if (r.amount > 0 && Math.abs(sum - r.amount) > Math.max(1, r.amount * 1e-4)) m.push(`แผนเงินรวม ${fmt(sum)} ไม่เท่าวงเงิน ${fmt(r.amount)}`);
  if (!r.name) m.push("ไม่มีชื่อรายการ"); return m;
}
// the unit: by its id, its code or its name
const biUnit = r => S.units.find(u => u.id === r.unit) || (BI_ABBR[r.unitName] && S.units.find(u => u.id === BI_ABBR[r.unitName])) || S.units.find(u => u.code && u.code === r.unit) || S.units.find(u => r.unitName && u.name[0] === r.unitName) || null;
const biOk = r => !biIssues(r, biData().rows).length;
// send: each good item becomes a procurement plan item (and its case), for the unit's allocation line
function biSend(ids) {
  if (!biCanImport()) return { err: "เฉพาะกองแผนงานนำส่งรายการ" }; const d = biData(), sent = [], skip = [];
  ids.forEach(id => { const r = d.rows.find(x => x.id === id); if (!r) return; if (r.sent) { skip.push([id, "นำส่งแล้ว"]); return; } const is = biIssues(r, d.rows); if (is.length) { skip.push([id, is.join(", ")]); return; }
    const inv = /ลงทุน/.test(r.kind), L0 = famLines(), line = L0.find(l => l.unit === biUnit(r).id && (l.type === "inv") === inv) || L0.find(l => l.unit === biUnit(r).id) || null;
    const m0 = Math.max(0, r.plan.findIndex(x => x > 0)), y = 2026 + (m0 >= 3 ? 1 : 0), mon = ((m0 + 9) % 12) + 1;
    const p = { id: nextId("PP", S.pplan), line: line ? line.id : "", name: [r.name, r.name], est: r.amount, method: r.amount <= 5e5 ? "specific" : "ebid", month: `${y}-${String(mon).padStart(2, "0")}-15`, by: me().id, status: "planned", egp: null, qty: r.qty || 1, unitName: r.uname, months: 1, note: `จากรายการงบประมาณ ${r.id} รหัส ${r.code}`, biSrc: r.id, moneyPlan: r.plan.slice() };
    p.kind = guessKind(line || { type: inv ? "inv" : "ope" }, p.name); if (typeof pidNew === "function") p.pid = pidNew();
    S.pplan.push(p); const c = caseNew(p); r.sent = { t: nowIso(), by: me().id, pp: p.id, cs: c && c.id }; sent.push(r.id); });
  if (sent.length) audit(["นำส่งรายการงบประมาณให้สำนัก/กอง", "Sent the budget items to the units"], `${sent.length}`); return { sent, skip };
}

// ---------- the page: three steps ----------
function biView() {
  const d = biData(), can = biCanImport(), rows = d.rows, mine = ["div", "divhead"].includes(ROLE) ? rows.filter(r => r.sent && biUnit(r) && biUnit(r).id === me().unit) : null;
  if (mine) return `<section class="panel"><header><h2>รายการงบประมาณที่ได้รับจากกองแผนงาน</h2><span class="sp"></span><span class="sub">${mine.length} รายการ · ขอซื้อขอจ้างได้จากแผนจัดซื้อ</span></header>${biTable(mine, false)}</section>`;
  // P55 (23 Nov 2569): two steps. The file is already corrected by Planning, so step 2 is a dashboard of what came in, with the
  // status of each item (นำเข้ารายการ / นำส่งสำนัก/กองแล้ว) and a button to send it; the third step is gone.
  const wait = rows.filter(r => !r.sent), nSent = rows.length - wait.length, sum = l => l.reduce((s, r) => s + r.amount, 0);
  const steps = [[1, "นำเข้า"], [2, "ตรวจสอบรายการ"]];
  const bar = `<div class="tabs" role="tablist" style="margin:0 0 10px">${steps.map(([n, tt]) => `<button class="tab ${BI.step === n ? "on" : ""}" type="button" role="tab" aria-selected="${BI.step === n}" data-bistep="${n}">${n}. ${tt}${n === 2 && wait.length ? ` <span class="badge">${wait.length}</span>` : ""}</button>`).join("")}</div>`;
  let body = "";
  if (BI.step === 1) body = `<div class="sub">นำเข้าไฟล์รายการงบประมาณ (.xlsx) ที่กองแผนงานตรวจแก้แล้ว: แยกแผ่นงานตามประเภท (ครุภัณฑ์ · จ้างที่ปรึกษา · ดำเนินการเอง · สิ่งก่อสร้าง) มี GFMis · e-bud · หน่วยงาน · วงเงิน · รายการ และแผนเงิน ต.ค. ถึง ก.ย.</div>
    ${can ? `<div class="row" style="gap:8px;margin:8px 0"><label class="btn primary" for="bi-files" style="cursor:pointer">นำเข้าไฟล์</label><input type="file" id="bi-files" accept=".xlsx" multiple hidden><button class="btn" type="button" id="bi-sample">ใช้ไฟล์ตัวอย่าง</button></div>` : `<div class="sub">เฉพาะกองแผนงานนำเข้าได้</div>`}
    ${BI.msg ? `<div>${esc(BI.msg)}</div>` : ""}${BI.rep.length ? `<div class="tbl-wrap"><table><thead><tr><th>ไฟล์</th><th>แผ่นงาน</th><th>ผล</th><th class="n">รายการ</th></tr></thead><tbody>${BI.rep.map(r => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td>${esc(r[2])}</td><td class="n">${r[3]}</td></tr>`).join("")}</tbody></table></div>` : ""}
    ${rows.length ? `<div class="sub">ข้อมูลปัจจุบัน: ${rows.length} รายการ จาก ${esc(d.files.join(", ") || "-")} · ${fdate(d.at, true)}</div>` : ""}`;
  if (BI.step === 2) {
    const grp = key => { const m = {}; rows.forEach(r => { const k = key(r) || "—"; const g = (m[k] = m[k] || { n: 0, amt: 0, sent: 0 }); g.n++; g.amt += r.amount; if (r.sent) g.sent++; }); return Object.entries(m); };
    const box = (title, list) => `<div style="flex:1 1 300px;border:1px solid var(--line);border-radius:10px;padding:8px 12px"><b>${title}</b><table class="bi-sum" style="width:100%;margin-top:4px"><thead><tr><th></th><th class="n">รายการ</th><th class="n">วงเงิน (บาท)</th><th class="n">นำส่งแล้ว</th></tr></thead><tbody>${list.map(([k, g]) => `<tr><td>${esc(k)}</td><td class="n">${g.n}</td><td class="n">${fmt(g.amt)}</td><td class="n">${g.sent}/${g.n}</td></tr>`).join("")}</tbody></table></div>`;
    const uName = r => { const u = biUnit(r); return u ? tx(u.name) : r.unitName || r.unit; };
    body = `<div class="facts"><span class="fact">รายการทั้งหมด <b>${rows.length}</b></span><span class="fact">วงเงินรวม <b>${fmt(sum(rows))}</b> บาท</span><span class="fact">นำเข้ารายการ (รอนำส่ง) <b>${wait.length}</b></span><span class="fact">นำส่งสำนัก/กองแล้ว <b>${nSent}</b></span></div>
      ${rows.length ? `<div class="row bi-dash" style="gap:10px;align-items:stretch;flex-wrap:wrap;margin:8px 0">${box("ตามประเภท", grp(r => r.type || r.kind))}${box("ตามสำนัก/กอง", grp(uName))}</div>` : ""}
      ${can && wait.length ? `<div class="row" style="margin:8px 0"><button class="btn primary" type="button" id="bi-sendall">นำส่งสำนัก/กอง ทุกรายการที่รอนำส่ง (${wait.length})</button><span class="sub">นำส่งแล้ว แต่ละรายการเป็นรายการในแผนจัดซื้อพร้อมรายการจัดซื้อ ให้สำนัก/กองขอซื้อขอจ้างต่อ</span></div>` : ""}
      ${biTable(rows, can)}`; }
  return `<section class="panel"><header><h2>รายการงบประมาณ</h2><span class="sp"></span><span class="sub">นำเข้า → ตรวจสอบรายการและนำส่ง สำนัก/กอง</span></header><div class="body">${bar}${body}</div></section>`;
}
function biTable(list, can) { // can: Planning sees the send button of each item waiting
  if (!list.length) return `<div class="sub">ไม่มีรายการ</div>`;
  return `<div class="tbl-wrap"><table class="bi-table"><thead><tr><th>รหัส</th><th>หน่วยงาน</th><th>รหัสงบประมาณ</th><th style="min-width:200px">รายการ</th><th>งบรายจ่าย</th><th class="n">วงเงิน (บาท)</th>${BI_MON.map(m => `<th class="n">${m}</th>`).join("")}<th>สถานะ</th></tr></thead><tbody>
    ${list.map(r => { const is = biIssues(r, biData().rows); return `<tr><td class="mono sub">${esc(r.id)}</td><td>${esc(r.unitName || r.unit)}</td><td class="mono">${esc(r.code || "—")}</td><td>${esc(r.name)}<div class="sub">${r.type ? `<span class="pill p-info">${esc(r.type)}</span> ` : ""}${r.ebud ? `e-bud ${esc(r.ebud)} · ` : ""}${r.years ? esc(r.years) + " · " : ""}${esc(r.prog)} · ${esc(r.prod)}${r.qty ? ` · ${r.qty} ${esc(r.uname)}` : ""}</div></td><td>${esc(r.kind)}</td><td class="n">${fmt(r.amount)}</td>${r.plan.map(x => `<td class="n sub">${x ? fmt(Math.round(x)) : "–"}</td>`).join("")}
      <td>${r.sent ? `${tag("นำส่งสำนัก/กองแล้ว", "p-ok")}<div class="sub">${esc(r.sent.pp)} · ${fdate(r.sent.t, true)}</div>` : `${tag("นำเข้ารายการ", "p-info")}${is.length ? `<div class="sub" style="color:var(--bad)">${esc(is.join(" · "))}</div>` : ""}${can ? `<div><button class="btn ghost" type="button" data-bisend="${esc(r.id)}">นำส่งสำนัก/กอง</button></div>` : ""}`}</td></tr>`; }).join("")}</tbody></table></div>`;
}
PROC.biMain = () => biView();
// P56: no page of its own any more; the budget items are the first tab of the procurement plan (see the end of this file)

// ---------- the case page: step 1 is the budget item ----------
CASE_MAIN_NAMES[0] = ["รายการงบประมาณ", "Budget items"];
{ const base = caseExtraPanels; caseExtraPanels = function (c) { const out = base(c), p = famPlan(c.plan), r = p.biSrc && (S.bi && S.bi.rows || []).find(x => x.id === p.biSrc);
    out.push(cmPanel(1, 0.5, "รายการงบประมาณ", r ? `<div><b>${esc(r.name)}</b> · รหัสงบประมาณ <span class="mono">${esc(r.code)}</span> · ${fmt(r.amount)} บาท · ${esc(r.kind)}</div><div class="sub">${esc(r.unitName)} · ${esc(r.prog)} · ${esc(r.prod)} · นำส่งโดยกองแผนงาน ${fdate(r.sent.t, true)}</div>
      <div class="tbl-wrap"><table><thead><tr>${BI_MON.map(m => `<th class="n">${m}</th>`).join("")}</tr></thead><tbody><tr>${r.plan.map(x => `<td class="n sub">${x ? fmt(Math.round(x)) : "–"}</td>`).join("")}</tr></tbody></table></div>`
      : `<span class="sub">รายการนี้ไม่ได้มาจากการนำเข้ารายการงบประมาณ (ข้อมูลตัวอย่างเดิม)</span>`)); return out; }; }

// ---------- handlers ----------
async function biRun(files) { BI.msg = "กำลังอ่านไฟล์..."; route(); const r = await biImport(files); BI.rep = r.rep || []; BI.msg = r.err || `นำเข้าแล้ว ${r.n} รายการ ไปขั้นตรวจสอบรายการ`; if (!r.err) BI.step = 2; commit(); route(); return r; }
document.addEventListener("click", async e => { const t = e.target; if (!t || !t.closest) return;
  const st = t.closest("[data-bistep]"); if (st) { BI.step = Number(st.dataset.bistep); route(); return; }
  if (t.closest("#bi-sample")) { try { const r = await fetch(encodeURI(BI_SAMPLE)); if (!r.ok) throw new Error(r.status); await biRun([new File([await r.blob()], BI_SAMPLE.split("/").pop())]); } catch (er) { toast("โหลดไฟล์ตัวอย่างไม่ได้ (ต้องเปิดผ่านเว็บเซิร์ฟเวอร์): " + er.message); } return; }
  const one = t.closest("[data-bisend]"), all = t.closest("#bi-sendall"); if (one || all) { const ids = one ? [one.dataset.bisend] : biData().rows.filter(r => !r.sent).map(r => r.id), r = biSend(ids); commit(); route(); toast(r.err || `นำส่งแล้ว ${r.sent.length} รายการ${r.skip.length ? ` · ส่งไม่ได้ ${r.skip.length}: ${r.skip.map(s => s.join(" ")).join("; ")}` : ""}`); } });
document.addEventListener("change", e => { const t = e.target; if (!t) return; if (t.id === "bi-files" && t.files.length) biRun([...t.files]); });
// step 1 is done when Planning sent the budget item (or, for the older sample cases, when the item is in the published plan)
{ const base = caseMainState; caseMainState = function (c) { const it = base(c), p = famPlan(c.plan), r = p.biSrc && (S.bi && S.bi.rows || []).find(x => x.id === p.biSrc);
    it[0] = [{ ok: !!(r && r.sent) || it[0][0].ok, label: r ? "กองแผนงานนำเข้า ตรวจสอบ และนำส่งรายการงบประมาณให้สำนัก/กองแล้ว" : it[0][0].label }]; return it; }; }

// P51: the procurement plan page also has the Planning division's import, as its last tab (the same three steps)
// P56 (23 Nov 2569): "รายการงบประมาณ" and "แผนจัดซื้อ" were two menus for one job. One menu now: the procurement plan, whose first tab
// is the budget items (key "budgetitems", so older links still land there). Every tab of the plan page shows the flow across the
// offices: Planning -> the bureau/division -> the Treasury (procurement) -> the voucher check -> accounting -> finance, with what waits at each.
{ const pg = PROC_PAGES.find(p => p.id === "plan"); if (pg && !pg.tabs.some(x => x.id === "budget")) pg.tabs.unshift({ id: "budget", key: "budgetitems", label: ["รายการงบประมาณ", "Budget items"], secs: ["biFlow", "biMain"] });
  pg.tabs.forEach(x => { if (Array.isArray(x.secs) && !x.secs.includes("biFlow")) x.secs = ["biFlow"].concat(x.secs); });
  pg.sub = ["กองแผนงานนำเข้ารายการงบประมาณและนำส่งสำนัก/กอง สำนัก/กองขอซื้อขอจ้างตามแผน กองคลังจัดซื้อและทำสัญญา แล้วผู้ตรวจใบสำคัญ บัญชี และการเงินเบิกจ่าย", "Planning imports the budget items and sends them to the units; the units raise requisitions; the Treasury buys and contracts; then voucher check, accounting and finance pay"]; }
const BI_FLOW_ROLE = { plan: 0, div: 1, divhead: 1, proc: 2, prochead: 2, fin: 3, finhead: 3 };
function biFlowCounts() {
  const rows = (S.bi && S.bi.rows) || [], dl = S.contracts.flatMap(k => (k.cx && k.cx.dl) || []), pp = S.pplan.filter(p => p.biSrc);
  const st = c => { try { return caseState(c); } catch (e) { return 0; } };
  return [
    ["กองแผนงาน", "นำเข้า ตรวจสอบ และนำส่งรายการงบประมาณ", rows.filter(r => !r.sent).length, "รอนำส่ง", "plan:budget"],
    ["สำนัก/กอง", "ขอซื้อขอจ้างจากรายการที่ได้รับ", pp.filter(p => p.status === "planned").length, "รอขอซื้อขอจ้าง", "reqn"],
    ["กองคลัง (พัสดุ)", "จัดซื้อจัดจ้าง ทำสัญญา ส่งมอบและตรวจรับ", S.cases.filter(c => { const s = st(c); return s >= 3 && s <= 8; }).length + dl.filter(d => !d.accept).length, "รายการจัดซื้อระหว่างดำเนินการ/รอตรวจรับ", "cases"],
    ["ผู้ตรวจสอบใบสำคัญ", "ตรวจใบสำคัญ ผ่านหรือส่งกลับ", dl.filter(d => d.accept && !d.chk).length, "รอตรวจ", "contracts"],
    ["การบัญชี", "บันทึกเอกสารเบิกจ่าย", dl.filter(d => d.chk && d.chk.st === "ok" && !d.book).length, "รอบันทึก", "contracts"],
    ["การเงิน", "บันทึกวันที่ผู้รับจ้างรับเงิน แนบหลักฐาน", dl.filter(d => d.book && d.status !== "paid").length, "รอจ่าย", "contracts"]];
}
PROC.biFlow = () => { const me0 = BI_FLOW_ROLE[ROLE], fl = biFlowCounts();
  return `<section class="panel bi-flow"><div class="body" style="display:flex;flex-wrap:wrap;gap:6px;align-items:stretch">${fl.map(([who, what, n, lab, go], i) => `<button type="button" class="btn ghost" data-biflow="${go}" style="flex:1 1 150px;text-align:left;display:block;padding:8px 10px;border:1px solid ${(me0 === i || (me0 === 3 && i > 3)) ? "var(--accent, var(--info))" : "var(--line)"};border-radius:10px${(me0 === i || (me0 === 3 && i > 3)) ? ";background:var(--info-soft)" : ""}"><div class="sub">${i + 1}${i < fl.length - 1 ? " →" : ""}</div><b>${who}</b><div class="sub">${what}</div><div>${n ? tag(n + " " + lab, "p-warn") : tag("ไม่มีงานค้าง", "p-mute")}</div></button>`).join("")}</div></section>`; };
document.addEventListener("click", e => { const b = e.target && e.target.closest && e.target.closest("[data-biflow]"); if (!b) return; procSet(b.dataset.biflow); route(); });
