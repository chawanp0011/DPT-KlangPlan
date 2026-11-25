// Fisko-KlangFinance, round P90 (25 Nov 2569): ติดตามความก้าวหน้า › ภาพรวม is cleared and redone as a dashboard that reads at a glance
// (asked for: "เคลียร์ภาพรวมใหม่ทั้งหมด ทำเป็น dashboard ที่อ่านรู้เรื่องกว่านี้ ส่วนกราฟที่ทำมาให้ออกเป็นรายงานแทน โดยเทียบคอลัมน์ที่มีใน
// ไฟล์ติดตามความก้าวหน้า"):
//   ภาพรวม: six figures, the procurement state in five phases, budget against payments by the group chosen (ประเภท, ผลผลิต/โครงการ,
//           หน่วยงาน, ลักษณะงบประมาณ) with the phase of each group, and what needs following up. Every part opens the list filtered.
//   รายงานสถานะจัดซื้อจัดจ้าง (a new tab): the status table of P89 as a report, each stage naming the columns of the follow-up form
//           (แบบฟอร์มติดตามความก้าวหน้า, 67 columns) it is read from, with an Excel download.

const D90_PH = [["prep", "เตรียมการ (TOR/ออกแบบ/ราคากลาง)", ["tor", "tordone", "ref", "refok"], "#94a3b8"], ["buy", "อยู่ระหว่างจัดซื้อจัดจ้าง", ["draft", "invite", "bid"], "#f59e0b"], ["wait", "รอลงนามสัญญา", ["wait"], "#3b82f6"], ["signed", "ลงนามสัญญาแล้ว", ["signed"], "#16a34a"], ["cancel", "ยกเลิก/ชะลอ", ["cancel"], "#dc2626"]];
const d90Ph = r => { const s = ov89Stage(r); return (D90_PH.find(p => p[2].includes(s)) || D90_PH[0])[0]; };
const d90PhName = k => (D90_PH.find(p => p[0] === k) || [k, k])[1];
sptF.phase = ["ช่วงการดำเนินงาน", r => d90PhName(d90Ph(r))];
// the columns of the follow-up form (67) each stage is read from
const D90_COLS = { cancel: "15 สถานะปัจจุบัน", tor: "19 สำรวจ/ออกแบบ", tordone: "20 แบบแล้วเสร็จ, 22 TOR แล้วเสร็จ", ref: "21 ประมาณราคา, 25 ราคากลาง", refok: "26 เห็นชอบราคากลาง", draft: "28 ประกาศร่าง TOR", invite: "29 ประกาศเชิญชวน", bid: "30 เสนอราคา, 31 พิจารณาผล", wait: "40 อนุมัติจ้าง, 42 ประกาศผู้ชนะ, 44-45 แจ้ง/เสนอลงนาม", signed: "46 เลขที่สัญญา, 47 วันที่ลงนาม" };

function d90Dash(rows) { const M = v => fmt(v, 2), sum = (l, c) => l.reduce((s, r) => s + sptNum(r[c]), 0), B = sum(rows, 11), P = sum(rows, 57), C = sum(rows, 47), ph = {}; D90_PH.forEach(p => (ph[p[0]] = rows.filter(r => d90Ph(r) === p[0])));
  const kpi = (f, l, v, d, col) => sptLink(f, `<div class="kpi" style="height:100%;border-top:3px solid ${col || "var(--accent,#3b4fa8)"}"><span class="l">${l}</span><span class="v">${v}</span><span class="d sub">${d}</span></div>`, "info");
  const prob = rows.filter(r => sptHas(r[60]));
  const kp = `<div class="kpis" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px">
    ${kpi({}, "รายการทั้งหมด", fmt(rows.length), `งบประมาณ ${M(B)} ลบ.`)}${kpi({ phase: d90PhName("signed") }, "ลงนามสัญญาแล้ว", fmt(ph.signed.length), `${M(C)} ลบ. · ${fmt(rows.length ? ph.signed.length / rows.length * 100 : 0, 0)}% ของรายการ`, "#16a34a")}
    ${kpi({ phase: d90PhName("buy") }, "อยู่ระหว่างจัดซื้อ", fmt(ph.buy.length + ph.wait.length), `รอลงนาม ${ph.wait.length} รายการ`, "#f59e0b")}${kpi({ phase: d90PhName("prep") }, "ยังเตรียมการ", fmt(ph.prep.length), `${M(sum(ph.prep, 11))} ลบ. ยังไม่ประกาศ`, "#94a3b8")}
    ${kpi({}, "เบิกจ่ายสะสม", `${fmt(B ? P / B * 100 : 0, 1)}%`, `${M(P)} จาก ${M(B)} ลบ.`, "#3b82f6")}${kpi({ prob: 1 }, "มีปัญหา/อุปสรรค", fmt(prob.length), "คลิกเพื่อดูรายการ", "#dc2626")}</div>`;
  const bar = D90_PH.filter(p => ph[p[0]].length).map(p => sptLink({ phase: p[1] }, `<span title="${esc(p[1])} ${ph[p[0]].length} รายการ" style="display:block;height:34px;background:${p[3]};color:#fff;font-weight:600;font-size:13px;line-height:34px;text-align:center;overflow:hidden">${ph[p[0]].length}</span>`, "info").replace('class="pd-go"', `class="pd-go" style="flex:${ph[p[0]].length};min-width:28px"`)).join("");
  const legend = D90_PH.map(p => `<span style="display:inline-flex;gap:6px;align-items:center"><i style="width:12px;height:12px;border-radius:3px;background:${p[3]};display:inline-block"></i>${esc(p[1])} <b>${ph[p[0]].length}</b> <span class="sub">(${M(sum(ph[p[0]], 11))} ลบ.)</span></span>`).join("");
  const status = `<section class="panel"><header><h2>สถานะการจัดซื้อจัดจ้าง</h2><span class="sp"></span><span class="sub">จำนวนรายการในแต่ละช่วง · คลิกเพื่อดูรายการ</span></header><div class="body"><div style="display:flex;border-radius:8px;overflow:hidden;gap:2px">${bar || `<span class="sub">ไม่มีรายการ</span>`}</div><div class="row" style="gap:8px 18px;flex-wrap:wrap;margin-top:10px;font-size:13px">${legend}</div></div></section>`;
  const g = OV89.g, key = ov89Key[g], G = {}; rows.forEach(r => (G[key(r)] = G[key(r)] || []).push(r)); const L0 = Object.entries(G).sort((a, b) => sum(b[1], 11) - sum(a[1], 11)), mx = Math.max(1, ...L0.map(x => sum(x[1], 11)));
  const fk = g === "type" ? "type" : g === "kind" ? "kind" : g === "unit" ? "unit" : "prod";
  const grp = `<section class="panel"><header><h2>งบประมาณและการเบิกจ่าย ตาม${OV89_GRP[g][0]}</h2><span class="sp"></span><div class="tabs" role="tablist" style="margin:0">${Object.entries(OV89_GRP).map(([k, [t]]) => `<button class="tab ${g === k ? "on" : ""}" type="button" data-ov89g="${k}">${t}</button>`).join("")}</div></header><div class="body">
    <div class="d90-row d90-h"><span></span><span>งบประมาณ (แถบเทา) / เบิกจ่าย (แถบน้ำเงิน)</span><span class="n">ลบ.</span><span class="n">เบิกจ่าย</span><span>ช่วงการดำเนินงาน</span></div>
    ${L0.map(([k, l]) => { const b = sum(l, 11), p = sum(l, 57); return sptLink({ [fk]: k }, `<div class="d90-row"><span>${esc(k)} <span class="sub">(${l.length})</span></span><span class="d90-b"><i style="width:${b / mx * 100}%"></i><b style="width:${b ? Math.min(100, p / b * 100) * (b / mx) : 0}%"></b></span><span class="n">${M(b)}</span><span class="n">${fmt(b ? p / b * 100 : 0, 1)}%</span><span style="display:flex;height:12px;border-radius:3px;overflow:hidden">${D90_PH.map(ph0 => { const n = l.filter(r => d90Ph(r) === ph0[0]).length; return n ? `<i title="${esc(ph0[1])} ${n}" style="flex:${n};background:${ph0[3]}"></i>` : ""; }).join("")}</span></div>`, "info"); }).join("")}</div></section>`;
  const top = (l, n) => l.slice().sort((a, b) => sptNum(b[11]) - sptNum(a[11])).slice(0, n);
  const li = (r, x) => `<li>${esc(r[5])} <span class="sub">· ${esc(r[7])} · ${M(sptNum(r[11]))} ลบ.${x ? " · " + x : ""}</span></li>`;
  const watch = `<section class="panel"><header><h2>รายการที่ต้องติดตาม</h2></header><div class="body" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px">
    <div><b style="color:#dc2626">มีปัญหา/อุปสรรค (${prob.length})</b><ul style="margin:4px 0 0;padding-left:18px">${top(prob, 5).map(r => li(r, esc(r[60]))).join("") || `<li class="sub">ไม่มี</li>`}</ul></div>
    <div><b style="color:#64748b">วงเงินสูงที่ยังเตรียมการ (${ph.prep.length})</b><ul style="margin:4px 0 0;padding-left:18px">${top(ph.prep, 5).map(r => li(r, esc(ov89StName(ov89Stage(r))))).join("") || `<li class="sub">ไม่มี</li>`}</ul></div>
    <div><b style="color:#3b82f6">รอลงนามสัญญา (${ph.wait.length})</b><ul style="margin:4px 0 0;padding-left:18px">${top(ph.wait, 5).map(r => li(r)).join("") || `<li class="sub">ไม่มี</li>`}</ul></div></div></section>`;
  return `<style>.d90-row{display:grid;grid-template-columns:minmax(140px,1.3fr) minmax(120px,2fr) 70px 64px minmax(90px,1fr);gap:10px;align-items:center;padding:7px 8px;border-top:1px solid var(--line);font-size:13px}.d90-h{border-top:0;color:var(--muted);font-size:11.5px}.d90-row .n{text-align:right;font-variant-numeric:tabular-nums}.d90-b{position:relative;height:14px}.d90-b i,.d90-b b{position:absolute;left:0;top:0;bottom:0;border-radius:3px}.d90-b i{background:var(--line)}.d90-b b{background:#3b82f6}</style>
    <div style="display:flex;flex-direction:column;gap:14px">${kp}${status}${grp}${watch}</div>`; }
MON_PANELS.track = () => { const R = tfRows(); return `${PD_CSS}${R.ov.length ? d90Dash(R.ov) : sptEmpty()}`; };

// ---------- the report: the status table, with the columns of the form ----------
function d90Report() { const rows = sptRows(), fy = BI.fy;
  let h = rows.length ? ov89Table(rows) : `<div class="sub">ไม่มีรายการ</div>`;
  h = h.replace(/<\/tr><tr>/, `</tr><tr>${OV89_ST.map(([k]) => `<th colspan="2" class="sub" style="font-weight:400;white-space:normal;max-width:150px;font-size:11px">คอลัมน์ ${esc(D90_COLS[k])}</th>`).join("")}</tr><tr>`).replace('<th rowspan="2" style="min-width:170px"></th><th rowspan="2" class="n">จำนวน</th><th rowspan="2" class="n">งบประมาณ</th>', '<th rowspan="3" style="min-width:170px"></th><th rowspan="3" class="n">จำนวน</th><th rowspan="3" class="n">งบประมาณ<div class="sub" style="font-weight:400">คอลัมน์ 13</div></th>');
  return `<style>.ov89-t th,.ov89-t td{border:1px solid var(--line);padding:4px 6px;white-space:nowrap}.ov89-t .ov89-h{text-align:center;background:var(--info-soft)}.ov89-t .pd-go{display:inline;width:auto}</style>
  <section class="panel ov89"><header><div><h2 style="margin:0">รายงานสถานะการจัดซื้อจัดจ้าง ประจำปีงบประมาณ พ.ศ. ${fy}</h2><div class="sub">จำนวน ${fmt(rows.length)} รายการ เป็นเงิน ${fmt(rows.reduce((s, r) => s + sptNum(r[11]), 0), 4)} ล้านบาท · หน่วย: ล้านบาท · ขั้นตอนของแต่ละรายการอ่านจากคอลัมน์ของแบบฟอร์มติดตามความก้าวหน้า (67 คอลัมน์) ที่ระบุใต้หัวตาราง</div></div><span class="sp"></span>
    <div class="tabs" role="tablist" style="margin:0">${Object.entries(OV89_GRP).map(([k, [t]]) => `<button class="tab ${OV89.g === k ? "on" : ""}" type="button" data-ov89g="${k}">ตาม${t}</button>`).join("")}</div><button class="btn primary" type="button" id="d90-xl">ดาวน์โหลด Excel</button></header><div class="body">${h}</div></section>`; }
function d90Book() { const rows = sptRows(), g = OV89.g, [k1, k2, k3] = ov89Lv(g), N = OV89_ST.length;
  const grp = (l, k) => { const o = {}; l.forEach(r => { const v = k === "area" ? ov89Area(r) : ov89Key[k](r); (o[v] = o[v] || []).push(r); }); return Object.entries(o).sort((a, b) => b[1].length - a[1].length); };
  const line = (lab, l) => [lab, l.length, Math.round(l.reduce((s, r) => s + sptNum(r[11]), 0) * 1e4) / 1e4].concat(...OV89_ST.map(([k]) => { const x = l.filter(r => ov89Stage(r) === k); return [x.length || "", x.length ? Math.round(x.reduce((s, r) => s + sptNum(r[11]), 0) * 1e4) / 1e4 : ""]; }));
  const out = [[`ภาพรวม สถานะการจัดซื้อจัดจ้าง ประจำปีงบประมาณ พ.ศ. ${BI.fy}`], [`จำนวน ${rows.length} รายการ`, "", "", "หน่วย : ล้านบาท"],
    ["", "จำนวน", "งบประมาณ"].concat(...OV89_ST.map(([, t]) => [t, ""])), ["", "", "คอลัมน์ 13"].concat(...OV89_ST.map(([k]) => ["คอลัมน์ " + D90_COLS[k], ""])), ["", "", ""].concat(...OV89_ST.map(() => ["รายการ", "ลบ."]))];
  out.push(line("รวมทั้งสิ้น", rows)); grp(rows, "area").forEach(([a, l]) => out.push(line(a, l)));
  grp(rows, k1).forEach(([v1, l1]) => { out.push(line(v1, l1)); grp(l1, k2).forEach(([v2, l2]) => { out.push(line("  " + v2, l2)); grp(l2, k3).forEach(([v3, l3]) => out.push(line("    " + v3, l3))); }); });
  return [{ name: "ภาพรวมสถานะ", rows: out }]; }
MON_PANELS.status90 = () => d90Report();
M88_MT.splice(1, 0, ["status90", "รายงานสถานะจัดซื้อจัดจ้าง"]);
{ const pg = BUD_PAGES.find(p => p.id === "dashboard"); if (pg) { const was = window.MENU_ALL; window.MENU_ALL = true; const a = pg.tabs; window.MENU_ALL = was; pg.tabs = a.concat({ id: "status90", keys: ["status90"], label: ["รายงานสถานะจัดซื้อจัดจ้าง", "Procurement status report"] }); } }
{ const base = monTabsBar; monTabsBar = function () { return base().replace(/<\/div>\s*$/, `<button class="tab" type="button" role="tab" data-mtab="status90">รายงานสถานะจัดซื้อจัดจ้าง</button></div>`); }; }
document.addEventListener("click", e => { if (e.target && e.target.closest && e.target.closest("#d90-xl")) { xwDownload(`รายงานสถานะการจัดซื้อจัดจ้าง ปีงบประมาณ ${BI.fy}.xlsx`, d90Book()); toast("ดาวน์โหลดรายงาน Excel แล้ว"); } });

// ---------- P90b: no column numbers on any column (asked for: "เอาเลขคอลัมน์ออก จากทุกคอลัมน์") ----------
// The headers name the column only; the start year is written as a year (2570, not 2,570).
Object.keys(D90_COLS).forEach(k => (D90_COLS[k] = D90_COLS[k].replace(/\b\d+(-\d+)?\s/g, "")));
function d90Strip(h) { return String(h).replace(/(<th[^>]*>)\s*\d+ · /g, "$1").replace(/<th class="n">1<\/th>/, '<th class="n">ลำดับ</th>')
  .replace(/\s*\(คอลัมน์ [^)<]*\)/g, "").replace(/<div class="sub"[^>]*>คอลัมน์ \d+<\/div>/g, "").replace(/(<th[^>]*>)คอลัมน์ /g, "$1").replace(/>คอลัมน์ [\d\-, ]+</g, "><").replace(/ · คอลัมน์ [\d\-, ]+/g, "")
  .replace(/<td class="n">2,5(\d\d)<\/td>/g, "<td class=\"n\">25$1</td>"); }
{ const base = VIEWS.dashboard; VIEWS.dashboard = function () { return d90Strip(base.apply(this, arguments)); }; }
{ const base = PROC.mon88; PROC.mon88 = () => d90Strip(base()); }
// P90c: the page is named ภาพรวมติดตามความก้าวหน้า; the month selector (ข้อมูลรายเดือน) is taken off for now, the data is the whole year
{ const base = d90Strip; d90Strip = function (h) { return base(h).replace(/<h1>ภาพรวมการใช้จ่ายงบประมาณ<\/h1>/, "<h1>ภาพรวมติดตามความก้าวหน้า</h1>")
    .replace(/<div class="row" style="gap:8px;align-items:center"><label class="sub" for="tf-mon">[\s\S]*?<\/select><\/div>/, "").replace(/ตามฟอร์มติดตาม พ\.ร\.บ\. \(ส่งออก Excel ตามแบบฟอร์มใหม่ 67 คอลัมน์\) · /, ""); }; }
SPT.m = "";
// P90d: "เลขที่หนังสือ/ว/ด/ป" is written "เลขที่หนังสือ (ว/ด/ป)"
{ const base = d90Strip; d90Strip = function (h) { return base(h).replace(/\s*\/\s*ว\/ด\/ป/g, " (ว/ด/ป)"); }; }
// P90e: one year for every tab of ติดตามความก้าวหน้า; the demo month selector "ข้อมูล ณ" is taken off every tab
{ const base = d90Strip; d90Strip = function (h) { h = base(h).replace(/<div class="asof"><label for="asof-sel">[\s\S]*?<\/select><span class="sub">[^<]*<\/span><\/div>/g, "");
    if (!/id="pr-fy"/.test(h)) h = h.replace(/(<div class="tabs" role="tablist")/, `<div class="tf-top" style="display:flex;gap:10px;align-items:center;margin:0 0 6px">${prFySel().replace("margin:0 0 10px", "margin:0")}</div>$1`); return h; }; }
