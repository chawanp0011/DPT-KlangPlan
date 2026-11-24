// Fisko-KlangFinance, round P58 (23 Nov 2569): the procurement process as the user set it out.
// 1. แผนจัดซื้อ: Planning imports the budget items (first tab, round P56).
// 2. ติดตามค่าใช้จ่าย: a dashboard for Planning (budget, committed, paid by unit and by item) with an Excel report.
// 3. ขอซื้อขอจ้าง (was ใบขอซื้อขอจ้าง): the item goes from office to office:
//    สำนัก/กอง (gets the item from Planning, writes the details, sends to the Treasury) -> กองคลัง (e-GP to the close of the project) ->
//    ผู้ตรวจสอบใบสำคัญ (once the Treasury sets "นำส่งเบิกจ่าย") -> การบัญชี (attaches the payment documents, sends to Finance) ->
//    การเงิน (attaches the finance documents and details) -> กองคลัง checks, closes the project and hands it to the local authority or the
//    agency that asked for the budget.
// 4. ติดตามเบิกจ่าย: a dashboard for the Treasury with an Excel report.
// The voucher checker, accounting and finance are one role in this prototype (การเงินและบัญชี); the officer picks the desk they work at.
// The Excel files are real .xlsx made in the browser (a small writer below, no library).

// ---------- a small .xlsx writer: sheets = [{ name, rows: [[cell, ...], ...] }] -> Blob ----------
const XW_CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const xwCrc = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = XW_CRC[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
function xwZip(files) { // stored (no compression)
  const enc = new TextEncoder(), parts = [], cen = []; let off = 0;
  const u16 = v => [v & 255, (v >>> 8) & 255], u32 = v => [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255];
  files.forEach(([name, text]) => { const nb = enc.encode(name), db = enc.encode(text), crc = xwCrc(db);
    const head = [...u32(0x04034b50), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(db.length), ...u32(db.length), ...u16(nb.length), ...u16(0)];
    parts.push(new Uint8Array(head), nb, db);
    cen.push(new Uint8Array([...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(db.length), ...u32(db.length), ...u16(nb.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(off)]), nb);
    off += head.length + nb.length + db.length; });
  const cs = cen.reduce((s, b) => s + b.length, 0);
  return new Blob([...parts, ...cen, new Uint8Array([...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length), ...u32(cs), ...u32(off), ...u16(0)])], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
const xwEsc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
function xwCol(i) { let s = ""; i++; while (i) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; }
function xwBook(sheets) {
  const sh = sheets.map((s, i) => [`xl/worksheets/sheet${i + 1}.xml`, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${s.rows.map((r, ri) => `<row r="${ri + 1}">${r.map((v, ci) => { const ref = xwCol(ci) + (ri + 1); if (v == null || v === "") return ""; return typeof v === "number" && isFinite(v) ? `<c r="${ref}"${ri === 0 ? ' s="1"' : ""}><v>${v}</v></c>` : `<c r="${ref}" t="inlineStr"${ri === 0 ? ' s="1"' : ""}><is><t xml:space="preserve">${xwEsc(v)}</t></is></c>`; }).join("")}</row>`).join("")}</sheetData></worksheet>`]);
  return xwZip([
    ["[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((s, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`],
    ["_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
    ["xl/workbook.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((s, i) => `<sheet name="${xwEsc(String(s.name).slice(0, 31))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets></workbook>`],
    ["xl/_rels/workbook.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((s, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
    ["xl/styles.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Tahoma"/></font><font><b/><sz val="11"/><name val="Tahoma"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf fontId="0" xfId="0"/><xf fontId="1" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`],
    ...sh]);
}
function xwDownload(name, sheets) { const b = xwBook(sheets), a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); return b; }

// ---------- where an item is in the flow ----------
const FL_STEPS = [["plan", "กองแผนงาน", "นำเข้ารายการงบประมาณและนำส่งสำนัก/กอง"], ["div", "สำนัก/กอง", "จัดทำรายละเอียด ขอซื้อขอจ้าง นำส่งกองคลัง"], ["proc", "กองคลัง", "e-GP จัดซื้อจัดจ้าง ทำสัญญา ส่งมอบตรวจรับ นำส่งเบิกจ่าย"], ["chk", "ผู้ตรวจสอบใบสำคัญ", "ตรวจเอกสาร ผ่านหรือส่งกลับ"], ["book", "การบัญชี", "แนบเอกสารเบิกจ่าย นำส่งการเงิน"], ["pay", "การเงิน", "แนบเอกสารการเงินและรายละเอียด"], ["close", "กองคลัง", "ตรวจสอบ ปิดโครงการ นำส่งหน่วยงาน"]];
const flCon = p => S.contracts.find(k => k.plan === p.id) || null;
function flStage(p, r) { // p: a plan item (or null when the budget item is not sent); r: the budget item
  if (!p) return "plan"; if (["planned", "submitted", "returned"].includes(p.status)) return "div";
  const k = flCon(p); if (!k) return "proc"; const x = k.cx; if (!x) return "proc"; if (x.closed) return "done";
  const dl = x.dl || []; if (dl.some(d => d.sendPay && !d.chk)) return "chk"; if (dl.some(d => d.chk && d.chk.st === "ok" && !d.book)) return "book"; if (dl.some(d => d.book && d.status !== "paid")) return "pay";
  if (x.lastAccept && dl.length && dl.every(d => d.status === "paid")) return "close"; return "proc";
}
const flStageName = s => s === "done" ? "ปิดโครงการแล้ว" : (FL_STEPS.find(x => x[0] === s) || ["", s])[1] + (s === "close" ? " (ปิดโครงการ)" : "");
const flPaid = k => ((k && k.cx && k.cx.dl) || []).filter(d => d.status === "paid").reduce((s, d) => s + (Number(d.pay) || 0) + (Number(d.deduct) || 0), 0);
function flItems() { // every budget item with its plan item, contract and stage; then the plan items that did not come from an import
  const rows = (S.bi && S.bi.rows) || [], out = rows.map(r => { const p = r.sent ? S.pplan.find(x => x.id === r.sent.pp) : null, k = p ? flCon(p) : null, u = biUnit(r);
    return { id: r.id, name: r.name, unit: u ? u.id : "", unitName: u ? tx(u.name) : r.unitName, type: r.type || r.kind, budget: r.amount, p, k, commit: k ? kxAmount(kxOf(k)) : 0, paid: flPaid(k), stage: flStage(p, r) }; });
  return out;
}
// the voucher checker, accounting and finance: one role, three desks
let FIN_DESK = "chk";
const FL_DESKS = { chk: "ผู้ตรวจสอบใบสำคัญ", book: "การบัญชี", pay: "การเงิน" };
let flDeskBar = () => ROLE === "fin" || ROLE === "admin" ? `<div class="row fl-desk" style="gap:6px;align-items:center;margin:0 0 8px"><span class="sub">ทำงานในฐานะ</span>${Object.entries(FL_DESKS).map(([k, t]) => `<button type="button" class="btn ${FIN_DESK === k ? "primary" : "ghost"}" data-fldesk="${k}">${t}</button>`).join("")}</div>` : "";

// ---------- the flow strip (plan page, ขอซื้อขอจ้าง, ติดตาม pages) ----------
function flCounts() { const it = flItems(), dl = S.contracts.flatMap(k => ((k.cx && k.cx.dl) || []).map(d => ({ d, k })));
  return { plan: it.filter(x => x.stage === "plan").length, div: S.pplan.filter(p => ["planned", "submitted", "returned"].includes(p.status)).length, proc: S.cases.filter(c => { try { const s = caseState(c); return s >= 3 && s <= 9; } catch (e) { return false; } }).length,
    chk: dl.filter(o => o.d.sendPay && !o.d.chk).length, book: dl.filter(o => o.d.chk && o.d.chk.st === "ok" && !o.d.book).length, pay: dl.filter(o => o.d.book && o.d.status !== "paid").length,
    close: S.contracts.filter(k => k.cx && !k.cx.closed && k.cx.lastAccept && (k.cx.dl || []).length && k.cx.dl.every(d => d.status === "paid")).length }; }
const FL_ROLE = { plan: ["plan"], div: ["div", "divhead"], proc: ["proc", "prochead"], close: ["proc", "prochead"], chk: ["fin"], book: ["fin"], pay: ["fin"] };
PROC.biFlow = () => { const n = flCounts(), go = { plan: "plan:budget", div: "reqn", proc: "cases", chk: "contracts", book: "contracts", pay: "contracts", close: "contracts" };
  return `<section class="panel bi-flow"><div class="body" style="display:flex;flex-wrap:wrap;gap:6px;align-items:stretch">${FL_STEPS.map(([k, who, what], i) => { const on = (FL_ROLE[k] || []).includes(ROLE) && (ROLE !== "fin" || FIN_DESK === k);
    return `<button type="button" class="btn ghost" data-biflow="${go[k]}" data-flstep="${k}" style="flex:1 1 130px;text-align:left;display:block;padding:8px 10px;border:1px solid ${on ? "var(--info)" : "var(--line)"};border-radius:10px${on ? ";background:var(--info-soft)" : ""}"><div class="sub">${i + 1}${i < FL_STEPS.length - 1 ? " →" : ""}</div><b>${who}</b><div class="sub">${what}</div><div>${n[k] ? tag(n[k] + " รายการค้าง", "p-warn") : tag("ไม่มีงานค้าง", "p-mute")}</div></button>`; }).join("")}</div></section>`; };

// ---------- 2. ติดตามค่าใช้จ่าย (Planning) ----------
const flPct = (a, b) => (b ? Math.round(a / b * 1000) / 10 : 0);
function flByUnit(it) { const m = {}; it.forEach(x => { const g = (m[x.unitName || "—"] = m[x.unitName || "—"] || { n: 0, budget: 0, commit: 0, paid: 0, done: 0 }); g.n++; g.budget += x.budget; g.commit += x.commit; g.paid += x.paid; if (x.stage === "done") g.done++; }); return Object.entries(m); }
PROC.spendDash = () => { const it = flItems(), sum = f => it.reduce((s, x) => s + x[f], 0), B = sum("budget"), C = sum("commit"), P = sum("paid"), st = {}; it.forEach(x => (st[x.stage] = (st[x.stage] || 0) + 1));
  if (!it.length) return `<section class="panel fl-spend"><header><h2>ติดตามค่าใช้จ่าย</h2><span class="sp"></span><button class="btn primary" type="button" id="fl-xl-spend">ดาวน์โหลดรายงาน Excel ติดตามค่าใช้จ่าย</button></header><div class="body sub">ยังไม่มีรายการงบประมาณ: กองแผนงานนำเข้าได้ที่แผนจัดซื้อ แท็บรายการงบประมาณ</div></section>`;
  return `${eKpis([["รายการงบประมาณ", it.length], ["วงเงินงบประมาณ (บาท)", fmt(B)], ["ผูกพันตามสัญญา (บาท)", fmt(C) + ` (${flPct(C, B)}%)`], ["เบิกจ่ายแล้ว (บาท)", fmt(P) + ` (${flPct(P, B)}%)`], ["คงเหลือ (บาท)", fmt(B - P)]])}
  <section class="panel fl-spend"><header><h2>ติดตามค่าใช้จ่าย</h2><span class="sp"></span><button class="btn primary" type="button" id="fl-xl-spend">ดาวน์โหลดรายงาน Excel ติดตามค่าใช้จ่าย</button></header>
    <div class="body"><div class="row" style="gap:6px;flex-wrap:wrap">${[...FL_STEPS.map(s => s[0]), "done"].filter((s, i, a) => a.indexOf(s) === i).map(s => `<span class="fact">${flStageName(s)} <b>${st[s] || 0}</b></span>`).join("")}</div>
    <h3 style="margin:12px 0 6px">ตามสำนัก/กอง</h3><div class="tbl-wrap"><table class="fl-unit"><thead><tr><th>สำนัก/กอง</th><th class="n">รายการ</th><th class="n">งบประมาณ</th><th class="n">ผูกพัน</th><th class="n">เบิกจ่ายแล้ว</th><th class="n">% เบิกจ่าย</th><th class="n">คงเหลือ</th><th class="n">ปิดโครงการ</th></tr></thead><tbody>${flByUnit(it).map(([u, g]) => `<tr><td>${esc(u)}</td><td class="n">${g.n}</td><td class="n">${fmt(g.budget)}</td><td class="n">${fmt(g.commit)}</td><td class="n">${fmt(g.paid)}</td><td class="n">${flPct(g.paid, g.budget)}%</td><td class="n">${fmt(g.budget - g.paid)}</td><td class="n">${g.done}/${g.n}</td></tr>`).join("")}</tbody></table></div>
    <h3 style="margin:12px 0 6px">รายการ</h3><div class="tbl-wrap"><table class="fl-items"><thead><tr><th>รายการงบประมาณ</th><th>สำนัก/กอง</th><th>ประเภท</th><th class="n">งบประมาณ</th><th class="n">ผูกพัน</th><th class="n">เบิกจ่ายแล้ว</th><th>อยู่ที่</th></tr></thead><tbody>${it.map(x => `<tr><td><span class="mono sub">${esc(x.id)}</span> ${esc(x.name)}</td><td>${esc(x.unitName)}</td><td>${esc(x.type)}</td><td class="n">${fmt(x.budget)}</td><td class="n">${x.commit ? fmt(x.commit) : "–"}</td><td class="n">${x.paid ? fmt(x.paid) : "–"}</td><td>${tag(flStageName(x.stage), x.stage === "done" ? "p-ok" : "p-info")}</td></tr>`).join("")}</tbody></table></div></div></section>`; };
function flSpendBook() { const it = flItems();
  return [{ name: "สรุปตามหน่วยงาน", rows: [["สำนัก/กอง", "รายการ", "งบประมาณ (บาท)", "ผูกพัน (บาท)", "เบิกจ่ายแล้ว (บาท)", "% เบิกจ่าย", "คงเหลือ (บาท)", "ปิดโครงการ"], ...flByUnit(it).map(([u, g]) => [u, g.n, g.budget, g.commit, g.paid, flPct(g.paid, g.budget), g.budget - g.paid, g.done])] },
    { name: "รายการ", rows: [["รหัส", "รายการงบประมาณ", "สำนัก/กอง", "ประเภท", "งบประมาณ (บาท)", "เลขแผนจัดซื้อ", "เลขที่สัญญา", "ผูกพัน (บาท)", "เบิกจ่ายแล้ว (บาท)", "คงเหลือ (บาท)", "อยู่ที่"], ...it.map(x => [x.id, x.name, x.unitName, x.type, x.budget, x.p ? x.p.id : "", x.k ? x.k.no : "", x.commit, x.paid, x.budget - x.paid, flStageName(x.stage)])] }]; }

// ---------- 4. ติดตามเบิกจ่าย (Treasury) ----------
function flDlRows() { return S.contracts.flatMap(k => ((k.cx && k.cx.dl) || []).map(d => ({ k, d, st: d.status === "paid" ? "จ่ายแล้ว" : d.book ? "รอการเงิน" : d.chk && d.chk.st === "ok" ? "รอการบัญชี" : d.chk && d.chk.st === "back" ? "ส่งกลับกองคลัง" : d.sendPay ? "รอตรวจใบสำคัญ" : d.accept ? "รอนำส่งเบิกจ่าย" : "รอตรวจรับ" }))); }
const FL_MON = ["ต.ค.", "พ.ย.", "ธ.ค.", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย."];
const flMonIdx = d => (Number(String(d).slice(5, 7)) + 2) % 12;
PROC.disbDash = () => { const R = flDlRows(), st = {}; R.forEach(o => (st[o.st] = (st[o.st] || 0) + 1)); const paid = R.filter(o => o.d.status === "paid"), mon = Array(12).fill(0); paid.forEach(o => (mon[flMonIdx(o.d.paidDate)] += o.d.pay));
  const total = S.contracts.reduce((s, k) => s + (k.cx ? kxAmount(k.cx) : 0), 0), P = paid.reduce((s, o) => s + o.d.pay, 0), mx = Math.max(1, ...mon);
  return `${flDeskBar()}${eKpis([["สัญญา", S.contracts.filter(k => k.cx).length], ["ส่งมอบ (ครั้ง)", R.length], ["รอเบิกจ่าย (ครั้ง)", R.filter(o => o.d.status !== "paid").length], ["จ่ายจริงแล้ว (บาท)", fmt(P)], ["ปิดโครงการแล้ว", S.contracts.filter(k => k.cx && k.cx.closed).length]])}
  <section class="panel fl-disb"><header><h2>ติดตามเบิกจ่าย</h2><span class="sp"></span><button class="btn primary" type="button" id="fl-xl-disb">ดาวน์โหลดรายงาน Excel เบิกจ่าย</button></header>
    <div class="body"><div class="row" style="gap:6px;flex-wrap:wrap">${["รอตรวจรับ", "รอนำส่งเบิกจ่าย", "รอตรวจใบสำคัญ", "ส่งกลับกองคลัง", "รอการบัญชี", "รอการเงิน", "จ่ายแล้ว"].map(s => `<span class="fact">${s} <b>${st[s] || 0}</b></span>`).join("")}</div>
    <h3 style="margin:12px 0 6px">จ่ายจริงรายเดือน (บาท)</h3><div style="display:flex;gap:4px;align-items:flex-end;height:120px">${mon.map((v, i) => `<div style="flex:1;text-align:center" title="${FL_MON[i]} ${fmt(v)}"><div style="background:var(--info);height:${Math.round(v / mx * 90)}px;border-radius:3px 3px 0 0"></div><div class="sub">${FL_MON[i]}</div></div>`).join("")}</div>
    <h3 style="margin:12px 0 6px">รายการเบิกจ่าย</h3>${R.length ? `<div class="tbl-wrap"><table class="fl-dl"><thead><tr><th>สัญญา</th><th>ครั้งที่</th><th>วันที่ส่งมอบ</th><th>วันที่ตรวจรับ</th><th class="n">จำนวนเงินจ่ายจริง</th><th>สถานะ</th><th>วันที่ผู้รับจ้างรับเงิน</th><th></th></tr></thead><tbody>${R.map(o => `<tr><td><span class="mono">${esc(o.k.no)}</span> <span class="sub">${esc(tx(o.k.vendor))}</span></td><td>${o.d.n}</td><td>${fdate(o.d.deliver)}</td><td>${o.d.accept ? fdate(o.d.accept) : "–"}</td><td class="n">${fmt(o.d.pay)}</td><td>${tag(o.st, o.d.status === "paid" ? "p-ok" : o.st === "ส่งกลับกองคลัง" ? "p-bad" : "p-warn")}</td><td>${o.d.paidDate ? fdate(o.d.paidDate) : "–"}</td><td><button class="btn ghost" type="button" data-flcon="${esc(o.k.id)}">เปิด</button></td></tr>`).join("")}</tbody></table></div>` : `<div class="sub">ยังไม่มีการส่งมอบ</div>`}
    <div class="sub" style="margin-top:6px">วงเงินตามสัญญารวม ${fmt(total)} บาท · เบิกจ่ายแล้ว ${flPct(P, total)}%</div></div></section>`; };
function flDisbBook() { const R = flDlRows();
  return [{ name: "เบิกจ่าย", rows: [["เลขที่สัญญา", "ผู้รับจ้าง", "ครั้งที่", "วันที่ส่งมอบ", "วันที่ตรวจรับ", "จำนวนเงินตามงวดงาน", "หักคืนเบิกล่วงหน้า", "จำนวนเงินจ่ายจริง", "สถานะ", "วันที่ผู้รับจ้างรับเงิน", "รายละเอียดการเงิน", "หมายเหตุ"], ...R.map(o => [o.k.no, tx(o.k.vendor), o.d.n, o.d.deliver, o.d.accept || "", o.d.amount, o.d.deduct || 0, o.d.pay, o.st, o.d.paidDate || "", o.d.finNote || "", o.d.note || ""])] },
    { name: "สรุปรายเดือน", rows: [["เดือน", "จ่ายจริง (บาท)"], ...FL_MON.map((m, i) => [m, R.filter(o => o.d.status === "paid" && flMonIdx(o.d.paidDate) === i).reduce((s, o) => s + o.d.pay, 0)])] },
    { name: "สัญญา", rows: [["เลขที่สัญญา", "ผู้รับจ้าง", "วงเงินตามสัญญา", "เบิกจ่ายแล้ว", "คงเหลือ", "ปิดโครงการ", "นำส่ง"], ...S.contracts.filter(k => k.cx).map(k => [k.no, tx(k.vendor), kxAmount(k.cx), flPaid(k), kxAmount(k.cx) - flPaid(k), k.cx.closed ? k.cx.closed.t.slice(0, 10) : "", k.cx.closed ? k.cx.closed.to : ""])] }]; }

// ---------- the new steps on the deliveries: send for payment (Treasury), the finance details, the close ----------
function kxSendPay(k, i) { if (!kxCanEdit()) return "เฉพาะกองคลัง (พัสดุ) นำส่งเบิกจ่าย"; const d = kxOf(k).dl[i]; if (!d) return "ไม่พบรายการ"; if (!d.accept) return "ยังตรวจรับไม่เสร็จ"; if (d.sendPay && !(d.chk && d.chk.st === "back")) return "นำส่งเบิกจ่ายแล้ว";
  if (d.chk && d.chk.st === "back") d.chk = null; d.sendPay = { by: me().id, t: nowIso() }; audit(["นำส่งเบิกจ่าย", "Sent for payment"], k.id); return ""; }
{ const base = kxPay; kxPay = function (k, i, v, files) { const d = kxOf(k).dl[i]; const chk = v.chk === true ? "ok" : v.chk;
    if ((chk === "ok" || chk === "back") && d && !d.sendPay) return "กองคลังยังไม่ได้นำส่งเบิกจ่าย";
    const m = base(k, i, v, files); if (m) return m; if (v.status === "paid" && v.finNote != null) d.finNote = String(v.finNote).slice(0, 500); return ""; }; }
function kxClose(k, to, note) { if (!kxCanEdit()) return "เฉพาะกองคลัง (พัสดุ) ปิดโครงการ"; const x = kxOf(k); if (x.closed) return "ปิดโครงการแล้ว";
  if (!x.lastAccept) return "ยังไม่ได้ตรวจรับงวดสุดท้าย"; if (!x.dl.length || x.dl.some(d => d.status !== "paid")) return "ยังเบิกจ่ายไม่ครบทุกครั้ง"; if (!String(to || "").trim()) return "ระบุหน่วยงานที่นำส่ง (อปท. หรือหน่วยงานที่ขอ)";
  x.closed = { by: me().id, t: nowIso(), to: String(to).trim(), note: String(note || "").trim().slice(0, 500) }; audit(["ปิดโครงการและนำส่งหน่วยงาน", "Closed the project and handed it over"], k.id); return ""; }
// the management tab: the buttons of the new steps, the desk of the finance officer, the close
{ const base = kxManageView; kxManageView = function (k) { let h = base(k); const x = kxOf(k), can = kxCanEdit(), fin = kxCanPay();
    // Treasury: "นำส่งเบิกจ่าย" on a delivery accepted and not sent (or sent back)
    x.dl.forEach((d, i) => { const key = `<form data-cxpay="${k.id}|${i}" style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px"><b class="sub" style="flex:1 1 100%">ตรวจใบสำคัญ</b>`;
      if (!d.sendPay) { h = h.split(key).join("<!--wait-send-->" + key.replace("<form", "<form hidden")); }
      if (fin && FIN_DESK !== "chk") h = h.split(key).join(key.replace("<form", "<form hidden"));
      const kb = `<form data-cxpay="${k.id}|${i}" style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px"><b class="sub" style="flex:1 1 100%">บันทึกเอกสารเบิกจ่าย (บัญชี)</b>`; if (fin && FIN_DESK !== "book") h = h.split(kb).join(kb.replace("<form", "<form hidden"));
      const kp = `<form data-cxpay="${k.id}|${i}" style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px"><b class="sub" style="flex:1 1 100%">การเงิน: วันที่ผู้รับจ้างได้รับเงิน</b>`; if (fin && FIN_DESK !== "pay") h = h.split(kp).join(kp.replace("<form", "<form hidden"));
      else h = h.split(kp + `<input type="hidden" name="status" value="paid"><input type="date" name="paidDate">`).join(kp + `<input type="hidden" name="status" value="paid"><input type="date" name="paidDate"><input name="finNote" maxlength="500" placeholder="รายละเอียด (เลขที่ใบสำคัญ/อ้างอิงการโอน)">`); });
    h = h.split("บันทึกเอกสารเบิกจ่าย (บัญชี)").join("การบัญชี: แนบเอกสารเบิกจ่ายและนำส่งการเงิน").split(">บันทึกเอกสารเบิกจ่าย</button>").join(">แนบและนำส่งการเงิน</button>");
    const sends = x.dl.map((d, i) => d.accept && (!d.sendPay || (d.chk && d.chk.st === "back")) ? `<button class="btn" type="button" data-cxsend="${k.id}|${i}">นำส่งเบิกจ่าย ครั้งที่ ${d.n}</button>` : "").join("");
    const ready = x.lastAccept && x.dl.length && x.dl.every(d => d.status === "paid");
    const close = x.closed ? `<div class="cx-closed">${tag("ปิดโครงการแล้ว", "p-ok")} นำส่ง <b>${esc(x.closed.to)}</b> · ${esc(userName(x.closed.by))} · ${fdate(x.closed.t, true)}${x.closed.note ? " · " + esc(x.closed.note) : ""}</div>`
      : can && ready ? `<form data-cxclose="${k.id}" class="row" style="gap:6px;align-items:flex-end;flex-wrap:wrap;border-top:1px solid var(--line);padding-top:8px"><b style="flex:1 1 100%">กองคลัง: ตรวจสอบรายการ ปิดโครงการ และนำส่งหน่วยงาน</b><div class="f"><label>นำส่ง</label><select name="kind"><option>องค์กรปกครองส่วนท้องถิ่น (อปท.)</option><option>หน่วยงานที่ขอรับงบประมาณ</option></select></div><div class="f"><label>ชื่อหน่วยงาน *</label><input name="to" placeholder="เช่น อบต.ตัวอย่าง"></div><div class="f" style="flex:1 1 220px"><label>หมายเหตุ</label><input name="note" maxlength="500"></div><button class="btn primary" type="submit">ปิดโครงการและนำส่ง</button></form>` : "";
    const head = (fin ? flDeskBar() : "") + (can && sends ? `<div class="row" style="gap:6px;flex-wrap:wrap;align-items:center"><span class="sub">กองคลัง: ตรวจรับแล้ว นำส่งเบิกจ่ายให้ผู้ตรวจสอบใบสำคัญ</span>${sends}</div>` : "");
    h = h.replace(`<div class="body cx-manage" style="display:flex;flex-direction:column;gap:8px">`, `<div class="body cx-manage" style="display:flex;flex-direction:column;gap:8px">${head}`);
    h = h.replace(/<div class="sub">ลำดับงาน:[\s\S]*?<\/div><\/div>$/, `<div class="sub">ลำดับงาน: กองคลังบันทึกส่งมอบและตรวจรับ แล้วนำส่งเบิกจ่าย → ผู้ตรวจสอบใบสำคัญตรวจ ผ่านหรือส่งกลับ → การบัญชีแนบเอกสารเบิกจ่ายและนำส่งการเงิน → การเงินแนบเอกสารการเงิน วันที่ผู้รับจ้างรับเงิน และรายละเอียด → กองคลังตรวจสอบ ปิดโครงการ และนำส่ง อปท. หรือหน่วยงานที่ขอ</div>${close}</div>`);
    return h; }; }
// the stage label of a delivery: "รอนำส่งเบิกจ่าย" before the Treasury sends it
{ const base = kxStage; kxStage = d => (d.accept && !d.sendPay && !d.chk && !d.book && d.status !== "paid" ? ["รอกองคลังนำส่งเบิกจ่าย", "p-warn"] : base(d)); }

// ---------- the pages ----------
{ const rq = PROC_PAGES.find(p => p.id === "reqn"); if (rq) { rq.label = ["ขอซื้อขอจ้าง", "Purchase requests"]; rq.sub = ["สำนัก/กองได้รับรายการจากกองแผนงาน จัดทำรายละเอียดและนำส่งกองคลัง กองคลังดำเนินการตั้งแต่ e-GP จนปิดโครงการ ผู้ตรวจสอบใบสำคัญ การบัญชี และการเงินเบิกจ่าย แล้วกองคลังปิดโครงการและนำส่งหน่วยงาน", "The units get the items from Planning, write the details and send them to the Treasury; the Treasury runs e-GP to the close; voucher check, accounting and finance pay; the Treasury closes and hands over"]; rq.tabs.forEach(t => { if (Array.isArray(t.secs) && !t.secs.includes("biFlow")) t.secs = ["biFlow"].concat(t.secs); }); } }
{ const i = PROC_PAGES.findIndex(p => p.id === "plan"); PROC_PAGES.splice(i + 1, 0, { id: "spend", code: "P2C", group: "plan", label: ["ติดตามค่าใช้จ่าย", "Spending follow-up"], roles: ["plan", "exec", "audit", "admin"], sub: ["กองแผนงานตรวจสอบงบประมาณ การผูกพัน และการเบิกจ่ายของทุกรายการ ตามสำนัก/กอง", "Planning checks the budget, the commitments and the payments of every item, by unit"], tabs: [{ id: "main", key: "spend", secs: ["biFlow", "spendDash"] }] }); }
{ const i = PROC_PAGES.findIndex(p => p.id === "contracts"); PROC_PAGES.splice(i + 1, 0, { id: "disb", code: "P7B", group: "con", label: ["ติดตามเบิกจ่าย", "Payment follow-up"], roles: ["proc", "prochead", "fin", "exec", "audit", "admin"], sub: ["กองคลังติดตามการเบิกจ่ายทุกสัญญา ตั้งแต่ตรวจรับจนการเงินจ่ายและปิดโครงการ", "The Treasury follows every payment, from the acceptance to the payment and the close"], tabs: [{ id: "main", key: "disb", secs: ["biFlow", "disbDash"] }] }); }
{ const ct = PROC_PAGES.find(p => p.id === "contracts"); if (ct && Array.isArray(ct.roles) && !ct.roles.includes("fin")) ct.roles = ct.roles.concat("fin"); }

// ---------- handlers ----------
document.addEventListener("click", e => { const t = e.target; if (!t || !t.closest) return;
  const dk = t.closest("[data-fldesk]"); if (dk) { FIN_DESK = dk.dataset.fldesk; route(); return; }
  const sp = t.closest("[data-cxsend]"); if (sp) { const [kid, i] = sp.dataset.cxsend.split("|"), m = kxSendPay(famCon(kid), Number(i)); m ? toast(m) : kxDone("นำส่งเบิกจ่ายแล้ว รอผู้ตรวจสอบใบสำคัญ"); return; }
  const fc = t.closest("[data-flcon]"); if (fc) { PROC_TAB = "contracts"; CON_OPEN = fc.dataset.flcon; CON_TAB = "cxdl"; route(); return; }
  if (t.closest("#fl-xl-spend")) { xwDownload(`ฟอร์มติดตาม พ.ร.บ. ปีงบประมาณ ${BI.fy}.xlsx`, flSpendBook()); toast("ดาวน์โหลดรายงาน Excel แล้ว"); return; }
  if (t.closest("#fl-xl-disb")) { xwDownload(`รายงานเบิกจ่าย ${FAM_FY}.xlsx`, flDisbBook()); toast("ดาวน์โหลดรายงาน Excel แล้ว"); } });
document.addEventListener("submit", e => { const f = e.target; if (!f || !f.matches) return;
  if (f.matches("[data-cxclose]")) { e.preventDefault(); const d = new FormData(f), kind = String(d.get("kind") || ""), to = String(d.get("to") || "").trim(); const m = kxClose(famCon(f.dataset.cxclose), to ? `${to} (${kind})` : "", d.get("note")); m ? toast(m) : kxDone("ปิดโครงการและนำส่งแล้ว"); return; }
  if (f.matches("[data-cxpay]") && f.querySelector('[name="finNote"]')) { // the finance details travel with the paid form
    const v = f.querySelector('[name="finNote"]').value; const [kid, i] = f.dataset.cxpay.split("|"); setTimeout(() => { const d = kxOf(famCon(kid)).dl[Number(i)]; if (d && d.status === "paid" && v && !d.finNote) { d.finNote = v.slice(0, 500); commit(); } }, 0); } }, true);

// P59 (23 Nov 2569): the plan page keeps only the budget items, without the flow strip on top. The tabs "แผนและฉบับ" and
// "ความต้องการนอกแผน" are taken off the menu (their code stays; the tests that cover them switch them on with window.PL_OLDTABS).
{ const pg = PROC_PAGES.find(p => p.id === "plan"); if (pg) pg.tabs.forEach(x => { if (Array.isArray(x.secs)) x.secs = x.secs.filter(s => s !== "biFlow");
    if (x.id === "plan" || x.id === "demand") { const r0 = x.roles; Object.defineProperty(x, "roles", { get: () => (window.PL_OLDTABS ? r0 : []), configurable: true }); } }); }
