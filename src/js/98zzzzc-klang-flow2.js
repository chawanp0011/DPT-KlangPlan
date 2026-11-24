// Fisko-KlangFinance, round P60 (23 Nov 2569), as the user asked:
// - the flow strip is taken off every page (it did not show the right counts);
// - แผนจัดซื้อ: no step tabs (นำเข้า / ตรวจสอบรายการ): one page, the check list, with a fiscal-year drop-down, the import button and the
//   history of the imports;
// - ติดตามค่าใช้จ่าย and ติดตามเบิกจ่าย show the dashboard of the department's Excel follow-up file (the page "ติดตามเร่งรัดการเบิกจ่าย":
//   plan and result by month against the government's target, the state of the payments, the procurement state 0-15, by unit, the money
//   management, the projects to speed up), built from the data of this system;
// - ขอซื้อขอจ้าง shows the state of each request's case file (แฟ้มจัดซื้อ);
// - the procurement pages that hang on the budget (plan, spending, requests, payments) get a fiscal-year drop-down.
PROC.biFlow = () => "";
const PR_FYS = () => [FAM_FY - 1, FAM_FY, FAM_FY + 1];
BI.fy = BI.fy || FAM_FY;
const biFy = r => r.fy || FAM_FY;
const prFyOfPlan = p => { const r = p && p.biSrc && ((S.bi && S.bi.rows) || []).find(x => x.id === p.biSrc); return r ? biFy(r) : FAM_FY; };
const prFyOfCon = k => prFyOfPlan(famPlan(k.plan));
const prFySel = () => `<div class="row pr-fy" style="gap:8px;align-items:center;margin:0 0 10px"><label class="sub" for="pr-fy">ปีงบประมาณ</label><select id="pr-fy" data-prfy>${PR_FYS().map(y => `<option value="${y}" ${y === BI.fy ? "selected" : ""}>พ.ศ. ${y}</option>`).join("")}</select></div>`;

// ---------- แผนจัดซื้อ: one page ----------
{ const base = biImport; biImport = async function (files) { const d = biData(), fy = BI.fy, other = d.rows.filter(r => biFy(r) !== fy && !r.sent);
    const r = await base(files); if (r.err) return r;
    const fresh = d.rows.filter(x => !x.fy && !x.sent); fresh.forEach((x, i) => { x.fy = fy; x.id = `BI-${fy}-${String(i + 1).padStart(3, "0")}`; });
    d.rows.forEach(x => { if (!x.fy) x.fy = FAM_FY; }); d.rows = d.rows.concat(other.filter(o => !d.rows.includes(o)));
    (d.log = d.log || []).push({ fy, files: files.map(f => f.name), n: r.n, at: nowIso(), by: me().id }); return r; }; }
{ const base = biView; biView = function () { const d = biData(), all = d.rows, fy = BI.fy;
    if (["div", "divhead"].includes(ROLE)) { d.rows = all.filter(r => biFy(r) === fy); try { return prFySel() + base(); } finally { d.rows = all; } }
    const st = BI.step; BI.step = 2; d.rows = all.filter(r => biFy(r) === fy); let h; try { h = base(); } finally { d.rows = all; BI.step = st; }
    h = h.replace(/<div class="tabs" role="tablist"[\s\S]*?<\/div>/, "").replace(`<span class="sub">นำเข้า → ตรวจสอบรายการและนำส่ง สำนัก/กอง</span>`, "");
    const can = biCanImport(), log = (d.log || []).filter(x => x.fy === fy).slice().reverse();
    const tools = `${prFySel()}<div class="row" style="gap:8px;align-items:center;flex-wrap:wrap;margin:0 0 8px">${can ? `<label class="btn primary" for="bi-files" style="cursor:pointer">นำเข้า</label><input type="file" id="bi-files" accept=".xlsx" multiple hidden><button class="btn" type="button" id="bi-sample">ใช้ไฟล์ตัวอย่าง</button>` : ""}<span class="sub">ไฟล์ .xlsx แยกแผ่นงานตามประเภท (ครุภัณฑ์ · จ้างที่ปรึกษา · ดำเนินการเอง · สิ่งก่อสร้าง)</span></div>${BI.msg ? `<div class="sub" style="margin:0 0 6px">${esc(BI.msg)}</div>` : ""}`;
    const hist = `<details class="bi-log" style="margin-top:12px" ${log.length ? "" : ""}><summary><b>ประวัติการนำเข้า</b> <span class="sub">(${log.length} ครั้ง ปีงบประมาณ ${fy})</span></summary>${log.length ? `<div class="tbl-wrap"><table><thead><tr><th>เมื่อ</th><th>ผู้นำเข้า</th><th>ไฟล์</th><th class="n">รายการ</th></tr></thead><tbody>${log.map(x => `<tr><td class="mono">${fdate(x.at, true)}</td><td>${esc(userName(x.by))}</td><td>${esc(x.files.join(", "))}</td><td class="n">${x.n}</td></tr>`).join("")}</tbody></table></div>` : `<div class="sub">ยังไม่มีการนำเข้าในปีนี้</div>`}</details>`;
    const body = d.rows.some(r => biFy(r) === fy) ? "" : `<div class="sub">ยังไม่มีรายการงบประมาณของปี ${fy}: กดนำเข้า</div>`;
    return h.replace(`<div class="body">`, `<div class="body">${tools}${body}`).replace(/<\/div><\/section>$/, `${hist}</div></section>`); }; }
{ const pg = PROC_PAGES.find(p => p.id === "plan"); if (pg) pg.tabs.forEach(x => { if (x.id === "budget") x.label = ["รายการงบประมาณ", "Budget items"]; }); }

// ---------- the dashboard of the Excel follow-up file, from the data of this system ----------
const prMonIdx = d => (Number(String(d).slice(5, 7)) + 2) % 12;
function prProcOf(p) { // the procurement state 0-15 of the follow-up file, from the plan item and its case
  if (!p) return 0; const k = flCon(p); if (k) return 15; const c = caseByPlan(p.id); if (!c) return p.status === "planned" ? 1 : 5; let s = 0; try { s = caseState(c); } catch (e) { s = c.state || 0; }
  return s <= 1 ? 1 : s <= 3 ? 3 : s <= 5 ? 5 : s === 6 ? 7 : s === 7 ? 12 : s === 8 ? 14 : 15; }
function prDtRows(fy, onlyCon) {
  const rows = ((S.bi && S.bi.rows) || []).filter(r => biFy(r) === fy).map(r => { const p = r.sent ? S.pplan.find(x => x.id === r.sent.pp) : null, k = p ? flCon(p) : null, act = Array(12).fill(0), u = biUnit(r);
    ((k && k.cx && k.cx.dl) || []).filter(d => d.status === "paid" && d.paidDate).forEach(d => (act[prMonIdx(d.paidDate)] += (Number(d.pay) || 0) + (Number(d.deduct) || 0)));
    return { id: r.id, k, area: "central", sheet: u ? tx(u.name) : r.unitName, unit: u ? tx(u.name) : r.unitName || "—", commit: /ผูกพัน/.test(r.years || "") ? "ผูกพันใหม่" : "ปีเดียว", years: r.years || "ปีเดียว", ebud: r.ebud || "", code: r.code, name: r.name, fy, alloc: r.amount, plan: r.plan.slice(), act, carry: 0, leftover: 0, cancel: 0, slow: 0, fast: 0, net: 0, pctWork: 0, proc: prProcOf(p), track: null }; });
  // contracts that did not come from an imported budget item (the older sample data) count in the year in execution
  if (fy === FAM_FY) S.contracts.filter(k => k.cx && !famPlan(k.plan).biSrc).forEach(k => { const x = k.cx, act = Array(12).fill(0), plan = Array(12).fill(0), amt = kxAmount(x);
    x.dl.filter(d => d.status === "paid" && d.paidDate).forEach(d => (act[prMonIdx(d.paidDate)] += (Number(d.pay) || 0) + (Number(d.deduct) || 0))); plan[Math.min(11, prMonIdx(kxEnd(x) || TODAY))] = amt;
    rows.push({ id: k.id, k, area: "central", sheet: unitName(famLine(famPlan(k.plan).line).unit), unit: unitName(famLine(famPlan(k.plan).line).unit), commit: "ปีเดียว", years: "ปีเดียว", ebud: "", code: k.no, name: tx(famPlan(k.plan).name), fy, alloc: amt, plan, act, carry: 0, leftover: 0, cancel: 0, slow: 0, fast: 0, net: 0, pctWork: 0, proc: 15, track: null }); });
  return onlyCon ? rows.filter(r => r.k) : rows;
}
function prDtOv(rows) { const keep = S.dtr, dt = { ...DT }; S.dtr = { rows, src: "system", files: [] }; Object.assign(DT, { fund: "all", area: "all", unit: "", q: "", st: "", ps: "" });
  try { return dtOv().replace(dtFilters(), "").replace(tag(L("นำเข้า", "Imported"), "p-info"), tag("ข้อมูลในระบบ", "p-info")).split("data-dtopen=").join("data-prdt="); } finally { S.dtr = keep; Object.assign(DT, dt); } }
PROC.spendDash = () => { const rows = prDtRows(BI.fy, false);
  return `${prFySel()}<section class="panel"><header><h2>ติดตามค่าใช้จ่าย ปีงบประมาณ ${BI.fy}</h2><span class="sp"></span><button class="btn primary" type="button" id="fl-xl-spend">ดาวน์โหลดรายงาน Excel ติดตามค่าใช้จ่าย</button></header></section>${rows.length ? prDtOv(rows) : `<section class="panel"><div class="body sub">ยังไม่มีรายการงบประมาณของปี ${BI.fy}</div></section>`}`; };
{ const base = PROC.disbDash; PROC.disbDash = () => { const rows = prDtRows(BI.fy, true), list = base();
    const i = list.indexOf('<h3 style="margin:12px 0 6px">รายการเบิกจ่าย</h3>'), j = list.indexOf("</div></section>", i);
    return `${prFySel()}${flDeskBar()}<section class="panel"><header><h2>ติดตามเบิกจ่าย ปีงบประมาณ ${BI.fy}</h2><span class="sp"></span><button class="btn primary" type="button" id="fl-xl-disb">ดาวน์โหลดรายงาน Excel เบิกจ่าย</button></header></section>${rows.length ? prDtOv(rows) : `<section class="panel"><div class="body sub">ยังไม่มีสัญญาของปี ${BI.fy}</div></section>`}
      <section class="panel fl-disb"><div class="body">${i >= 0 ? list.slice(i, j) : ""}</div></section>`; }; }
// the deliveries and the Excel of payments: only the contracts of the year
{ const base = flDlRows; flDlRows = () => base().filter(o => prFyOfCon(o.k) === BI.fy); }
{ const base = flItems; flItems = () => base().filter(x => { const r = ((S.bi && S.bi.rows) || []).find(y => y.id === x.id); return r ? biFy(r) === BI.fy : true; }); }

// ---------- ขอซื้อขอจ้าง: the state of each case file, and the year ----------
{ const base = PROC.reqn; PROC.reqn = () => { let h = base(); const keepR = S.reqn;
    h = h.replace("</tr></thead>", "<th>สถานะรายการจัดซื้อ</th></tr></thead>");
    S.reqn.forEach(r => { const c = caseByPlan(r.plan), cell = `<td class="rq-case">${c ? `${caseStTag(c)}<div class="sub mono">${esc(c.id)}</div>` : `<span class="sub">ยังไม่มีรายการจัดซื้อ</span>`}</td>`, key = `<tr><td class="mono">${r.id}</td>`, a = h.indexOf(key); if (a < 0) return; const b = h.indexOf("</td></tr>", a); if (b < 0) return; h = h.slice(0, b + 5) + cell + h.slice(b + 5); });
    return prFySel() + h; }; }
{ const base = PROC.reqn; PROC.reqn = () => { const all = S.reqn; S.reqn = all.filter(r => prFyOfPlan(famPlan(r.plan)) === BI.fy); try { return base(); } finally { S.reqn = all; } }; }

// ---------- handlers ----------
document.addEventListener("change", e => { const t = e.target; if (t && t.matches && t.matches("[data-prfy]")) { BI.fy = Number(t.value); route(); } });
document.addEventListener("click", e => { const b = e.target && e.target.closest && e.target.closest("[data-prdt]"); if (!b) return; const id = b.getAttribute("data-prdt"), k = S.contracts.find(x => x.id === id) || ((S.bi && S.bi.rows) || []).map(r => r.sent && flCon(S.pplan.find(p => p.id === r.sent.pp))).find((x, i) => x && S.bi.rows[i].id === id);
  if (k) { PROC_TAB = "contracts"; CON_OPEN = k.id; CON_TAB = "cxdl"; route(); } else toast("รายการนี้ยังไม่มีสัญญา"); });
const PR_XL_TRACK_H = ["ลำดับที่","เริ่มตั้ง","ตาม พ.ร.บ.","โอนเปลี่ยนแปลง","รหัสงบประมาณ","รายการ","รหัส e-bud","หน่วยงาน","ประเภท","ลักษณะงบประมาณ","พื้นที่ดำเนินการ\n(จังหวัด)","งปม.ทั้งสิ้น","ปี 2563","ปี 2564","ปี 2565","ปี 2566","ปี 2567","ปี 2568","ปี 2569","ปี 2570","ปี 2571","ปี 2572","สำรวจ/ออกแบบ\n(ว/ด/ป)","แบบแล้วเสร็จ \n(ว/ด/ป)","ประมาณราคา \n(ว/ด/ป)","จัดทำ TOR แล้วเสร็จ\n(ว/ด/ป)","เลขที่โครงการ (e-bidding)","อนุมัติประกาศเผยแพร่แผนการจัดซื้อจัดจ้าง (ว/ด/ป)","ราคากลาง \n(ลบ.)","เห็นชอบราคากลาง \n(ว/ด/ป)","รายงาน\nขอซื้อ ขอจ้าง \n(ว/ด/ป)","ประกาศร่าง TOR\nระหว่าง\n (ว/ด/ป) ","ประกาศขายแบบ/เชิญชวน \nระหว่าง (ว/ด/ป) ","เสนอราคา\n(ว/ด/ป)","พิจารณาผล\n(ว/ด/ป)","ครั้งที่ประกวดราคา\n(จำนวนครั้ง)","ผู้เสนอราคาได้ต่ำสุด","วงเงินที่เสนอ\n(ลบ.)","ส่ง สงป.พิจารณาความเหมาะสม\nเลขที่หนังสือ/ว/ด/ป","สงป.พิจารณา\nความเหมาะสมแล้ว\nเลขที่หนังสือ/ว/ด/ป","ขยายระยะเวลาก่อหนี้\nผูกพัน\nเลขที่หนังสือ /  ว/ด/ป","อนุมัติจ้าง","ประกาศผู้ชนะ\nว/ด/ป","เรียกลงนาม\n(ว/ด/ป)","เสนอสัญญา\n(ว/ด/ป)","เลขที่สัญญา","ลงนามสัญญา \nเลขที่สัญญา (ว/ด/ป)2","วงเงินสัญญา\n(ลบ.)","วันเริ่มต้น - \nสิ้นสุดสัญญา","จำนวนวัน","ความยาว\n(เมตร)","ไร่","ครัวเรือน","แห่ง","ระบุ\nเลขที่ PO","จำนวนเงิน Advance 15%","ผลการดำเนินงาน\nสะสม (ร้อยละ)","ผลการเบิกจ่าย\nสะสม","ผลการเบิกจ่าย\n(ร้อยละ)","สถานะการดำเนินงาน \nณ ปัจจุบัน","ปัญหา/อุปสรรค","งปม.ทั้งสิ้น","ปี 2563","ปี 2564","ปี 2565","ปี 2566","ปี 2567","ปี 2568","ปี 2569","ปี 2570","ปี 2571","ปี 2572"];
const PR_XL_PLAN_H = ["หน่วยงาน","ผูกพัน","ผูกพันปี พ.ศ.","รหัส E-Budget","รหัสงบประมาณ","รายการ","ปีงบ\nประมาณ","งบประมาณ\nได้รับจัดสรร","แผน","ผล","แผน","ผล","แผน","ผล","แผน","ผล","แผน","ผล","แผน","ผล","แผน","ผล","แผน","ผล","แผน","ผล","แผน","ผล","แผน","ผล","แผน","ผล","แผน\nการเบิกจ่าย","ผล\nการเบิกจ่าย","หลังวางแผน","หลังเบิกจ่าย","กันไว้เบิกเหลื่อมปี/ตกพับ","เงินเหลือจ่าย","ยกเลิกสัญญา","คงเหลือก่อนบริหารโครงการ","งานช้า","งานเร็ว","คงเหลือสุทธิ","% ความก้าวหน้าวัดจากผลเบิก","% ความก้าวหน้า วัดจากผลงาน","สถานะ\nการจัดซื้อ/จัดจ้าง","สัญญาเลขที่","สถานะ\nแก้ไขสัญญา","ชื่อผู้รับจ้าง","ชื่อผู้รับผิดชอบ/ผู้ควบคุมงาน","หมายเหตุ"];

// ---------- P61: the Excel reports follow the department's templates column by column ----------
// เบิกจ่าย: the layout of "1./2.วางแผนการเบิกจ่าย ประจำปี พ.ศ. 2570 (ส่วนกลาง/ส่วนภูมิภาค)": one sheet per unit, five header rows,
// 51 columns (unit ... plan and result for each month Oct-Sep ... procurement state, contract, contractor, officer, note).
// ติดตาม: the layout of "ไฟลตัวอย่างติดตาม พรบ": five header rows, 72 columns (the budget by year, the dates of every step, the contract,
// the quantities, the advance, % of work, paid, the state and the problem, the budget by year again).
// The header texts were copied from the files (headers only, no data from them).
const prBE = d => { if (!d) return ""; const [y, m, dd] = String(d).slice(0, 10).split("-"); return y ? `${dd}/${m}/${Number(y) + 543}` : ""; };
const prM = v => Math.round((Number(v) || 0) / 1e6 * 1e6) / 1e6;
function prPlanBook(fy) {
  const rows = prDtRows(fy, false), byU = {}; rows.forEach(r => (byU[r.unit] = byU[r.unit] || []).push(r));
  const sheets = Object.entries(byU).map(([u, rs]) => { const top = [Array(51).fill(""), Array(51).fill(""), Array(51).fill(""), Array(51).fill(""), PR_XL_PLAN_H.slice()];
    top[0][4] = `งบประมาณรายจ่ายลงทุน ประจำปีงบประมาณ พ.ศ. ${fy}`; top[1][4] = u; top[2][8] = "แผน-ผล การเบิกจ่าย"; FL_MON.forEach((m, i) => (top[3][8 + i * 2] = m));
    const data = rs.map(r => { const k = r.k, x = k && k.cx, pT = r.plan.reduce((s, v) => s + v, 0), aT = r.act.reduce((s, v) => s + v, 0), row = Array(51).fill("");
      [row[0], row[1], row[2], row[3], row[4], row[5], row[6], row[7]] = [u, r.commit, r.years, r.ebud, r.code, r.name, fy, r.alloc];
      for (let m = 0; m < 12; m++) { row[8 + m * 2] = r.plan[m] || 0; row[9 + m * 2] = r.act[m] || 0; }
      row[32] = pT; row[33] = aT; row[34] = r.alloc - pT; row[35] = r.alloc - aT; row[36] = 0; row[37] = 0; row[38] = 0; row[39] = r.alloc - aT; row[40] = 0; row[41] = 0; row[42] = r.alloc - aT;
      row[43] = r.alloc ? Math.round(aT / r.alloc * 10000) / 100 : 0; row[44] = 0; row[45] = `${r.proc}. ${DT_PROC[r.proc] || ""}`; row[46] = k ? k.no : ""; row[47] = x && x.amends.length ? `${x.amends.length} แก้ไขสัญญา` : "0 ปกติ"; row[48] = k ? tx(k.vendor) : ""; row[49] = k ? userName(k.by) : ""; row[50] = x && x.closed ? `ปิดโครงการ นำส่ง ${x.closed.to}` : "";
      return row; });
    return { name: u, rows: top.concat(data) }; });
  return sheets.length ? sheets : [{ name: "ไม่มีข้อมูล", rows: [PR_XL_PLAN_H.slice()] }];
}
function prTrackBook(fy) {
  const rows = prDtRows(fy, false), top = [Array(72).fill(""), Array(72).fill(""), Array(72).fill(""), Array.from({ length: 72 }, (x, i) => String(i + 1)), PR_XL_TRACK_H.slice()];
  top[0][22] = "(1)"; top[0][23] = "(2)"; top[0][24] = "(3)"; top[1][0] = `รายงานสถานะการดำเนินงานตามแผนปฏิบัติราชการ ประจำปีงบประมาณ พ.ศ. ${fy}`; top[2][0] = "หน่วยงาน กรมตัวอย่าง (สมมติ)";
  const data = rows.map((r, i) => { const row = Array(72).fill(""), k = r.k, x = k && k.cx, bi = ((S.bi && S.bi.rows) || []).find(y => y.id === r.id), aT = r.act.reduce((s, v) => s + v, 0), yc = 12 + (fy - 2563);
    [row[0], row[1], row[4], row[5], row[6], row[7], row[8], row[9], row[10], row[11]] = [i + 1, fy, r.code, r.name, r.ebud, r.unit, bi ? bi.type || bi.kind : "", /ผูกพัน/.test(r.years) ? "ผูกพัน" : "ปีเดียว", "", prM(r.alloc)];
    for (let j = 12; j <= 21; j++) row[j] = 0; if (yc >= 12 && yc <= 21) row[yc] = prM(r.alloc);
    if (k) { row[45] = k.no; row[46] = `${k.no} ${prBE(k.signed)}`; row[47] = prM(x ? kxAmount(x) : k.amount); if (x && x.start) row[48] = `${prBE(x.start)} - ${prBE(kxEnd(x))}`; if (x && x.days) row[49] = Number(x.days); if (x && x.adv.has) row[55] = kxAdvAmt(x); }
    row[56] = x && x.lastAccept ? 100 : 0; row[57] = prM(aT); row[58] = r.alloc ? Math.round(aT / r.alloc * 10000) / 100 : 0;
    row[59] = x && x.closed ? "ปิดโครงการแล้ว" : k ? "ลงนามสัญญาแล้ว อยู่ระหว่างดำเนินงาน" : r.proc > 1 ? "อยู่ระหว่างดำเนินการจัดซื้อจัดจ้าง" : "ยังไม่เริ่มดำเนินการ"; row[60] = "";
    row[61] = row[11]; for (let j = 0; j < 10; j++) row[62 + j] = row[12 + j]; return row; });
  return [{ name: "ฟอร์มติดตาม", rows: top.concat(data) }];
}
flDisbBook = () => prPlanBook(BI.fy);
flSpendBook = () => prTrackBook(BI.fy);

// ---------- P64 (23 Nov 2569): each fiscal year stands alone ----------
// The same item can be in the budget of 2570 and of 2571: the duplicate check looks inside one year only. Importing a year again keeps
// the items already sent and skips the rows whose code was already sent that year. "นำส่งทั้งหมด" sends the items of the chosen year only.
{ const base = biIssues; biIssues = function (r, all) { return base(r, (all || []).filter(x => biFy(x) === biFy(r))); }; }
{ const base = biImport; biImport = async function (files) { const d = biData(), fy = BI.fy, before = new Set(d.rows);
    const r = await base(files); if (r.err) return r;
    const sentCodes = new Set(d.rows.filter(x => before.has(x) && x.sent && biFy(x) === fy).map(x => x.code)), fresh = d.rows.filter(x => !before.has(x) || (!x.sent && biFy(x) === fy && !before.has(x)));
    const add = d.rows.filter(x => !before.has(x)), skip = add.filter(x => sentCodes.has(x.code));
    d.rows = d.rows.filter(x => !skip.includes(x)); let n = d.rows.filter(x => biFy(x) === fy && x.sent).reduce((m, x) => Math.max(m, Number(String(x.id).split("-").pop()) || 0), 0);
    add.filter(x => !skip.includes(x)).forEach(x => { x.fy = fy; x.id = `BI-${fy}-${String(++n).padStart(3, "0")}`; });
    const lg = (d.log || [])[d.log.length - 1]; if (lg) { lg.n = add.length - skip.length; lg.skip = skip.length; }
    return { ...r, n: add.length - skip.length, skip: skip.length }; }; }
document.addEventListener("click", e => { const b = e.target && e.target.closest && e.target.closest("#bi-sendall"); if (!b) return; e.stopImmediatePropagation(); e.preventDefault();
  const ids = biData().rows.filter(r => !r.sent && biFy(r) === BI.fy).map(r => r.id), r = biSend(ids); commit(); route(); toast(r.err || `นำส่งแล้ว ${r.sent.length} รายการ${r.skip.length ? ` · ส่งไม่ได้ ${r.skip.length}: ${r.skip.map(s => s.join(" ")).join("; ")}` : ""}`); }, true);
{ const base = biImport; biImport = async function (files) { const r = await base(files); if (!r.err) BI.lastSkip = r.skip || 0; return r; }; }
{ const base = biRun; biRun = async function (files) { BI.lastSkip = 0; const r = await base(files); if (!r.err) { BI.msg = `นำเข้าปีงบประมาณ ${BI.fy} แล้ว ${r.n} รายการ${BI.lastSkip ? ` · ข้าม ${BI.lastSkip} รายการที่นำส่งไปแล้วในปีนี้` : ""}`; route(); } return r; }; }

// ---------- P68 (23 Nov 2569): the year a person last chose is kept, and the default is the newest year with budget items ----------
// (A division opened the page on 2570 while Planning had imported and sent 2571, so the list looked empty.)
{ let saved = null; try { saved = Number(store.get("fisko-pr-fy")) || null; } catch (e) {}
  const pick = () => { const ys = [...new Set(((typeof S !== "undefined" && S && S.bi && S.bi.rows) || []).map(biFy))].sort((a, b) => b - a); return ys.length ? ys[0] : FAM_FY; };
  BI.fyPicked = !!(saved && PR_FYS().includes(saved)); try { BI.fy = BI.fyPicked ? saved : pick(); } catch (e) { BI.fy = FAM_FY; }
  const base = biView; biView = function () { if (!BI.fyPicked) BI.fy = pick(); let h = base();
    if (["div", "divhead"].includes(ROLE)) { const mineAt = y => ((S.bi && S.bi.rows) || []).filter(r => r.sent && biFy(r) === y && biUnit(r) && biUnit(r).id === me().unit).length, other = PR_FYS().filter(y => y !== BI.fy && mineAt(y));
      if (other.length) h = h.replace(prFySel(), prFySel() + `<div class="sub" style="margin:-4px 0 8px">มีรายการที่ได้รับในปีงบประมาณ ${other.map(y => `${y} (${mineAt(y)} รายการ)`).join(", ")}: เลือกปีด้านบน</div>`); }
    return h; }; }
document.addEventListener("change", e => { const t = e.target; if (t && t.matches && t.matches("[data-prfy]")) { BI.fyPicked = true; try { store.set("fisko-pr-fy", String(t.value)); } catch (er) {} } }, true);
// ขอซื้อขอจ้าง: what the unit received from Planning in the chosen year, with the button to write the details (opens the รายการจัดซื้อ at ขอซื้อขอจ้าง)
function prRecvPanel() { if (!["div", "divhead", "plan", "proc", "prochead", "admin"].includes(ROLE)) return ""; if (!BI.fyPicked) { const ys = [...new Set(((S.bi && S.bi.rows) || []).map(biFy))].sort((a, b) => b - a); if (ys.length) BI.fy = ys[0]; }
  const mineU = ["div", "divhead"].includes(ROLE) ? me().unit : null, rows = ((S.bi && S.bi.rows) || []).filter(r => r.sent && biFy(r) === BI.fy && (!mineU || (biUnit(r) && biUnit(r).id === mineU)));
  const items = rows.map(r => ({ r, p: S.pplan.find(q => q.id === r.sent.pp) })).filter(x => x.p);
  return `<section class="panel pr-recv"><header><h2>รายการที่ได้รับจากกองแผนงาน ปีงบประมาณ ${BI.fy}</h2><span class="sp"></span><span class="sub">${items.length} รายการ</span></header>${items.length ? `<div class="tbl-wrap"><table><thead><tr><th>รายการ</th><th>หน่วยงาน</th><th class="n">งบประมาณ (บาท)</th><th>สถานะ</th><th></th></tr></thead><tbody>${items.map(({ r, p }) => { const c = caseByPlan(p.id), rq = S.reqn.find(x => x.plan === p.id);
    return `<tr><td><span class="mono sub">${esc(p.id)}</span> <b style="font-weight:600">${esc(r.name)}</b><div class="sub mono">${esc(r.code || "")}</div></td><td>${esc(biUnit(r) ? tx(biUnit(r).name) : r.unitName)}</td><td class="n">${fmt(r.amount)}</td><td>${rq ? stTag(REQ_ST, rq.status) : tag("รอสำนัก/กองจัดทำรายละเอียด", "p-warn")}${c ? `<div class="sub">${caseStTag(c)}</div>` : ""}</td><td>${["div", "divhead"].includes(ROLE) && !rq ? `<button class="btn primary" type="button" data-preq="${esc(p.id)}">จัดทำรายละเอียด</button>` : c ? `<button class="btn ghost" type="button" data-rqcase="${esc(c.id)}">เปิด</button>` : ""}</td></tr>`; }).join("")}</tbody></table></div>` : `<div class="body sub">ยังไม่มีรายการที่กองแผนงานนำส่งในปีนี้</div>`}</section>`; }
{ const base = PROC.reqn; PROC.reqn = () => { const h = base(), sel = prFySel(), i = h.indexOf(sel); return i >= 0 ? h.slice(0, i + sel.length) + prRecvPanel() + h.slice(i + sel.length) : prRecvPanel() + h; }; }
