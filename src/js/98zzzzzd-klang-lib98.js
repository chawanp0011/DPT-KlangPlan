// ---------- P98: document library redesign (item list on the left, folder tiles and file table on the right) ----------
// The folders in work order, from the purchase request to the payment; each shows even when empty so the gaps are visible.
const L98_FOLDERS = [
  ["เอกสารขอซื้อขอจ้าง", "ขอซื้อขอจ้าง", "#6366f1"], ["รายงานขอซื้อขอจ้าง", "e-GP", "#0ea5e9"], ["คำสั่งแต่งตั้งคณะกรรมการ", "e-GP", "#0ea5e9"],
  ["รายงานผลการพิจารณา", "e-GP", "#0ea5e9"], ["อนุมัติจ้าง", "e-GP", "#0ea5e9"], ["ประกาศผู้ชนะ", "e-GP", "#0ea5e9"], ["หนังสือแจ้งลงนามสัญญา", "e-GP", "#0ea5e9"],
  ["หนังสือสัญญา", "สัญญา", "#10b981"], ["เอกสารคู่สัญญา", "สัญญา", "#10b981"], ["BOQ งวดงาน", "สัญญา", "#10b981"], ["หลักประกันสัญญา", "สัญญา", "#10b981"], ["สัญญาแก้ไข", "สัญญา", "#10b981"],
  ["เบิกเงินล่วงหน้า", "เบิกจ่าย", "#f59e0b"], ["ส่งมอบและตรวจรับ", "เบิกจ่าย", "#f59e0b"], ["ตรวจใบสำคัญ", "เบิกจ่าย", "#f59e0b"], ["เอกสารเบิกจ่าย (บัญชี)", "เบิกจ่าย", "#f59e0b"], ["หลักฐานการจ่ายเงิน (การเงิน)", "เบิกจ่าย", "#f59e0b"]];
const l98Ext = n => { const e = (String(n).split(".").pop() || "").toLowerCase(); return ["pdf", "xlsx", "xls", "docx", "doc", "jpg", "png", "zip"].includes(e) ? e : "file"; };
const l98Size = b => !b ? "-" : b >= 1048576 ? (b / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(b / 1024)) + " KB";
(function () { if (document.getElementById("l98-css")) return; const s = document.createElement("style"); s.id = "l98-css"; s.textContent = `
.l98{display:grid;grid-template-columns:minmax(260px,340px) minmax(0,1fr);gap:16px;align-items:start}
@media (max-width:900px){.l98{grid-template-columns:1fr}}
.l98-side{background:var(--panel,#fff);border:1px solid var(--line);border-radius:12px;overflow:hidden;position:sticky;top:8px}
.l98-side .hd{padding:12px;border-bottom:1px solid var(--line);display:grid;gap:8px}
.l98-side input[type=search]{width:100%;margin:0;padding:8px 10px;border-radius:8px}
.l98-chips{display:flex;gap:6px;flex-wrap:wrap}
.l98-chip{border:1px solid var(--line);background:transparent;border-radius:999px;padding:3px 10px;font-size:12px;cursor:pointer;color:inherit}
.l98-chip.on{background:var(--accent,#2563eb);border-color:var(--accent,#2563eb);color:#fff}
.l98-list{max-height:620px;overflow:auto}
.l98-it{display:grid;grid-template-columns:1fr auto;gap:2px 10px;width:100%;text-align:left;padding:10px 12px;border:0;border-bottom:1px solid var(--line);border-left:3px solid transparent;background:transparent;cursor:pointer;color:inherit;font:inherit}
.l98-it:hover{background:var(--hover,rgba(37,99,235,.05))}
.l98-it.on{background:var(--info-soft,#eff6ff);border-left-color:var(--accent,#2563eb)}
.l98-it .nm{font-size:13.5px;line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.l98-it .un{grid-column:1;font-size:12px;color:var(--muted,#64748b);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.l98-n{grid-row:1/3;grid-column:2;align-self:center;min-width:26px;text-align:center;font-size:12px;font-weight:600;border-radius:999px;padding:2px 8px;background:var(--line,#e5e7eb);color:var(--muted,#64748b)}
.l98-n.has{background:#dcfce7;color:#15803d}
.l98-main{display:grid;gap:14px}
.l98-card{background:var(--panel,#fff);border:1px solid var(--line);border-radius:12px;padding:16px}
.l98-head h3{margin:0 0 6px;font-size:18px}
.l98-meta{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px}
.l98-tag{font-size:12px;padding:2px 9px;border-radius:6px;background:var(--line,#f1f5f9);color:var(--muted,#475569)}
.l98-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.l98-stat{border:1px solid var(--line);border-radius:10px;padding:10px 12px}
.l98-stat b{display:block;font-size:20px}
.l98-stat span{font-size:12px;color:var(--muted,#64748b)}
.l98-bar{height:6px;border-radius:999px;background:var(--line,#e5e7eb);overflow:hidden;margin-top:6px}
.l98-bar i{display:block;height:100%;background:#10b981}
.l98-sec{display:flex;align-items:center;gap:8px;margin:0 0 10px}
.l98-sec h4{margin:0;font-size:14px}
.l98-folders{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:10px}
.l98-fo{display:flex;gap:10px;align-items:center;text-align:left;border:1px solid var(--line);border-radius:10px;padding:10px;background:transparent;cursor:pointer;color:inherit;font:inherit;transition:border-color .15s,box-shadow .15s}
.l98-fo:hover{border-color:var(--accent,#2563eb)}
.l98-fo.on{border-color:var(--accent,#2563eb);box-shadow:0 0 0 2px rgba(37,99,235,.15)}
.l98-fo.empty{opacity:.5}
.l98-fo .ic{flex:none;width:34px;height:28px;border-radius:5px;position:relative}
.l98-fo .ic:before{content:"";position:absolute;left:0;top:-4px;width:14px;height:6px;border-radius:3px 3px 0 0;background:inherit}
.l98-fo .t{font-size:12.5px;line-height:1.3}
.l98-fo .c{font-size:11.5px;color:var(--muted,#64748b)}
.l98-tbl{width:100%;border-collapse:collapse;font-size:13px}
.l98-tbl th{text-align:left;font-weight:600;font-size:12px;color:var(--muted,#64748b);padding:8px;border-bottom:1px solid var(--line)}
.l98-tbl td{padding:8px;border-bottom:1px solid var(--line);vertical-align:middle}
.l98-tbl tr:hover td{background:var(--hover,rgba(37,99,235,.04))}
.l98-ext{display:inline-block;min-width:38px;text-align:center;font-size:10.5px;font-weight:700;text-transform:uppercase;color:#fff;border-radius:4px;padding:3px 4px;margin-right:8px}
.l98-ext.pdf{background:#dc2626}.l98-ext.xlsx,.l98-ext.xls{background:#16a34a}.l98-ext.docx,.l98-ext.doc{background:#2563eb}.l98-ext.jpg,.l98-ext.png{background:#9333ea}.l98-ext.zip,.l98-ext.file{background:#64748b}
.l98-act{display:flex;gap:4px;justify-content:flex-end}
.l98-empty{text-align:center;padding:36px 16px;color:var(--muted,#64748b)}
.l98-empty .big{font-size:40px;line-height:1;margin-bottom:8px}
`; document.head.appendChild(s); })();

// Sample items (FY 2570 seed) have no attached files; give each one fictional files that match its work stage, marked as sample.
const L98_STAGE_DOCS = [["s1", "เอกสารขอซื้อขอจ้าง", ["แบบรูปรายการ.pdf", "ประมาณราคา.xlsx", "TOR.docx"]], ["s2", "รายงานขอซื้อขอจ้าง", ["รายงานขอซื้อขอจ้าง.pdf"]], ["s2", "คำสั่งแต่งตั้งคณะกรรมการ", ["คำสั่งแต่งตั้งคณะกรรมการ.pdf"]],
  ["s3", "รายงานผลการพิจารณา", ["รายงานผลการพิจารณา.pdf"]], ["s4", "อนุมัติจ้าง", ["อนุมัติจ้าง.pdf"]], ["s4", "ประกาศผู้ชนะ", ["ประกาศผู้ชนะการเสนอราคา.pdf"]], ["s5", "หนังสือแจ้งลงนามสัญญา", ["หนังสือแจ้งลงนามสัญญา.pdf"]],
  ["s5", "หนังสือสัญญา", ["หนังสือสัญญาจ้าง.pdf"]], ["s5", "เอกสารคู่สัญญา", ["หนังสือรับรองนิติบุคคล.pdf"]], ["s5", "BOQ งวดงาน", ["BOQ.xlsx"]], ["s5", "หลักประกันสัญญา", ["หนังสือค้ำประกันสัญญา.pdf"]],
  ["s6", "ส่งมอบและตรวจรับ", ["ใบส่งมอบงาน งวดที่ 1.pdf", "ใบตรวจรับ งวดที่ 1.pdf"]], ["s6", "ตรวจใบสำคัญ", ["ผลตรวจใบสำคัญ งวดที่ 1.pdf"]], ["s6", "เอกสารเบิกจ่าย (บัญชี)", ["ฎีกาเบิกจ่าย งวดที่ 1.pdf"]], ["s6", "หลักฐานการจ่ายเงิน (การเงิน)", ["หลักฐานการโอนเงิน งวดที่ 1.pdf"]]];
const L98_ORD = ["s0", "s1", "s2", "s3", "s4", "s5", "s6", "s7"];
function l98Docs(r, st) { const real = m88Docs(r); if (real.length || !st || st === "sx") return real; const n = L98_ORD.indexOf(st), out = []; let h = [...String(r.id)].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7);
  L98_STAGE_DOCS.forEach(([s, folder, names]) => { if (L98_ORD.indexOf(s) <= n) names.forEach(nm => { h = (h * 1103515245 + 12345) >>> 0; out.push({ folder, name: nm, size: 60000 + h % 2400000, t: "", src: "ข้อมูลตัวอย่าง (สมมติ)" }); }); }); return out; }
PROC.lib88 = () => { const fy = BI.fy, L = M88.lib, mine = ["div", "divhead"].includes(ROLE) ? unitName(me().unit) : null, q = (L.q || "").toLowerCase();
  const D = prDtRows(fy, false), B = prTrackBook(fy)[0].rows.slice(5), ST = {}; D.forEach((r, i) => { if (B[i]) ST[r.id] = p92St(B[i]); });
  const all = D.filter(r => !mine || r.unit === mine).map(r => ({ r, d: l98Docs(r, ST[r.id]) }));
  const R = all.filter(x => (!q || `${x.r.name} ${x.r.code} ${x.r.unit}`.toLowerCase().includes(q)) && (!L.has || x.d.length)).sort((a, b) => (b.d.length > 0) - (a.d.length > 0));
  const withDocs = all.filter(x => x.d.length).length, nDocs = all.reduce((s, x) => s + x.d.length, 0);
  const cur = R.find(x => x.r.id === L.item) || all.find(x => x.r.id === L.item) || null;
  const side = `<aside class="l98-side"><div class="hd"><input type="search" placeholder="ค้นหารายการ รหัส หน่วยงาน" value="${esc(L.q || "")}" data-m88libq>
    <div class="l98-chips"><button type="button" class="l98-chip ${L.has ? "" : "on"}" data-l98has="">ทั้งหมด ${all.length}</button><button type="button" class="l98-chip ${L.has ? "on" : ""}" data-l98has="1">มีเอกสาร ${withDocs}</button></div></div>
    <div class="l98-list">${R.map(({ r, d }) => `<button type="button" class="l98-it ${cur && cur.r.id === r.id ? "on" : ""}" data-m88lib="${esc(r.id)}"><span class="nm">${esc(r.name)}</span><span class="l98-n ${d.length ? "has" : ""}">${d.length}</span><span class="un">${esc(r.unit)}</span></button>`).join("") || `<div class="l98-empty">ไม่พบรายการ</div>`}</div></aside>`;
  let main;
  if (!cur) main = `<div class="l98-card l98-empty"><div class="big">🗂️</div><b>เลือกรายการงบประมาณทางซ้ายเพื่อดูเอกสาร</b><div style="margin-top:6px">มีเอกสารแล้ว ${withDocs} จาก ${all.length} รายการ · รวม ${fmt(nDocs)} ไฟล์</div></div>`;
  else { const folders = {}; cur.d.forEach((d, i) => (folders[d.folder] = folders[d.folder] || []).push([d, i]));
    const known = L98_FOLDERS.map(f => f[0]), extra = Object.keys(folders).filter(f => !known.includes(f)).map(f => [f, "อื่น ๆ", "#64748b"]), FO = [...L98_FOLDERS, ...extra];
    const filled = FO.filter(f => folders[f[0]]).length, pct = Math.round(filled / FO.length * 100), fo = L.fo && folders[L.fo] ? L.fo : "";
    M88.lib.docs = cur.d; const files = fo ? folders[fo] : cur.d.map((d, i) => [d, i]), pv = L.prev != null ? cur.d[L.prev] : null;
    main = `<div class="l98-card l98-head"><h3>${esc(cur.r.name)}</h3><div class="l98-meta"><span class="l98-tag">${esc(cur.r.unit)}</span>${cur.r.code ? `<span class="l98-tag">${esc(cur.r.code)}</span>` : ""}<span class="l98-tag">ปีงบประมาณ ${fy}</span></div>
      <div class="l98-stats"><div class="l98-stat"><b>${cur.d.length}</b><span>ไฟล์ทั้งหมด</span></div><div class="l98-stat"><b>${filled} / ${FO.length}</b><span>โฟลเดอร์ที่มีเอกสาร</span></div><div class="l98-stat"><b>${pct}%</b><span>ความครบถ้วนของเอกสาร</span><div class="l98-bar"><i style="width:${pct}%"></i></div></div></div></div>
    <div class="l98-card"><div class="l98-sec"><h4>โฟลเดอร์ตามขั้นตอนงาน</h4><span class="sp" style="flex:1"></span>${fo ? `<button type="button" class="btn ghost" data-l98fo="">แสดงทุกโฟลเดอร์</button>` : ""}</div>
      <div class="l98-folders">${FO.map(([n, st, col]) => { const k = (folders[n] || []).length; return `<button type="button" class="l98-fo ${k ? "" : "empty"} ${fo === n ? "on" : ""}" data-l98fo="${k ? esc(n) : ""}" ${k ? "" : "disabled"}><span class="ic" style="background:${col}"></span><span><div class="t">${esc(n)}</div><div class="c">${esc(st)} · ${k ? k + " ไฟล์" : "ยังไม่มี"}</div></span></button>`; }).join("")}</div></div>
    <div class="l98-card"><div class="l98-sec"><h4>${fo ? "📁 " + esc(fo) : "ไฟล์ทั้งหมด"}</h4><span class="sub">${files.length} ไฟล์</span></div>
      ${files.length ? `<table class="l98-tbl"><thead><tr><th>ชื่อไฟล์</th><th>โฟลเดอร์</th><th>ที่มา</th><th>วันที่</th><th>ขนาด</th><th></th></tr></thead><tbody>${files.map(([d, i]) => `<tr><td><span class="l98-ext ${l98Ext(d.name)}">${l98Ext(d.name)}</span>${esc(d.name)}</td><td>${esc(d.folder)}</td><td class="sub">${esc(d.src)}</td><td class="sub">${d.t ? fdate(String(d.t).slice(0, 10)) : "-"}</td><td class="sub">${l98Size(d.size)}</td><td><div class="l98-act"><button class="btn ghost" type="button" data-m88view="${i}">ดู</button><button class="btn ghost" type="button" data-m88dl="${i}">ดาวน์โหลด</button></div></td></tr>`).join("")}</tbody></table>`
        : `<div class="l98-empty"><div class="big">📭</div><b>รายการนี้ยังไม่มีเอกสารแนบ</b><div style="margin-top:6px">เอกสารจะเข้ามาเองเมื่อแนบในขั้นขอซื้อขอจ้าง e-GP ทำสัญญา หรือเบิกจ่าย</div></div>`}</div>
    ${pv ? `<div class="l98-card"><div class="l98-sec"><h4>ตัวอย่างเอกสาร: ${esc(pv.name)}</h4><span class="sp" style="flex:1"></span><button class="btn ghost" type="button" data-m88view="">ปิด</button></div><div class="sub">เอกสารจำลองจากข้อมูลในระบบ (ระบบต้นแบบเก็บเฉพาะข้อมูลของไฟล์ ไม่เก็บไฟล์จริง)</div><dl class="kv" style="margin:8px 0 0"><dt>ประเภทเอกสาร</dt><dd>${esc(pv.folder)}</dd><dt>ที่มา</dt><dd>${esc(pv.src)}</dd><dt>ขนาด</dt><dd>${l98Size(pv.size)}</dd><dt>รายการ</dt><dd>${esc(cur.r.name)}</dd></dl></div>` : ""}`; }
  return `${prFySel()}<div class="l98">${side}<div class="l98-main">${main}</div></div>`; };

document.addEventListener("click", e => { const t = e.target && e.target.closest ? e.target : null; if (!t) return;
  const h = t.closest("[data-l98has]"); if (h) { M88.lib.has = !!h.dataset.l98has; route(); return; }
  const f = t.closest("[data-l98fo]"); if (f && !f.disabled) { M88.lib.fo = f.dataset.l98fo; M88.lib.prev = null; route(); return; }
  if (t.closest("[data-m88lib]")) M88.lib.fo = "";
  const dl = t.closest("[data-m88dl]"); if (dl && M88.lib.docs) { e.stopPropagation(); const r = prDtRows(BI.fy, false).find(x => x.id === M88.lib.item), d = r && M88.lib.docs[Number(dl.dataset.m88dl)]; if (!d) return;
    const a = document.createElement("a"), u = URL.createObjectURL(m88DocBlob(r, d)); a.href = u; a.download = d.name.replace(/\.[^.]+$/, "") + ".html"; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 1000); toast("ดาวน์โหลดเอกสารแล้ว"); } }, true);
