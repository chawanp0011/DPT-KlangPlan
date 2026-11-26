// ---------- P98: ติดตามการเบิกจ่าย as the department's disbursement form (สรุปเงิน) ----------
// The form has, per unit: จำนวนรายการ, วงเงิน, วางแผนสะสม, ผลการเบิกจ่ายสะสม, ส่งคืนเงินเหลือจ่าย, % เบิกจ่าย, คงเหลือจากการวางแผน,
// ยกเลิกสัญญา, โอนเงิน (งานช้า / งานเร็ว), ยังไม่วางแผน (ตกพับ), then แผน / ผล for every month. The system has no fields for the
// last five, so they come from the data it has (the rule is printed under the table):
//   ส่งคืนเงินเหลือจ่าย = วงเงิน − วงเงินสัญญา, when the contract is signed (savings from the price)
//   คงเหลือจากการวางแผน = วงเงิน − เหลือจ่าย − แผนทั้งปี
//   ยกเลิกสัญญา = the rest of a cancelled item
//   โอนเงิน งานช้า = the rest of an item that is under way (procurement or contract) but not planned for this year
//   โอนเงิน งานเร็ว = paid beyond the plan of the year (money that has to come from elsewhere)
//   ยังไม่วางแผน (ตกพับ) = คงเหลือ − ยกเลิก − งานช้า + งานเร็ว; red when not zero, as in the form
// The four group cards give way to this table; a switch picks the grouping (หน่วยงาน, ผลผลิต/โครงการ, ประเภท, ลักษณะงบประมาณ).

const D98 = { by: "unit", mon: "all" };
const D98_ORD = ["s0", "s1", "s2", "s3", "s4", "s5", "s6", "s7"];
function d98Facts(fy) { const D = prDtRows(fy, false), B = prTrackBook(fy)[0].rows.slice(5), F = {};
  D.forEach((r, i) => { const row = B[i], st = row ? p92St(row) : "s0", n = D98_ORD.indexOf(st), con = row ? (Number(String(row[47]).replace(/,/g, "")) || 0) * 1e6 : 0, x = r.k && r.k.cx;
    const conAmt = con || (x && (x.amount || x.value)) || 0, ptot = r.plan.reduce((a, v) => a + v, 0), paid = r.act.reduce((a, v) => a + v, 0), left = n >= 5 && conAmt && conAmt < r.alloc ? r.alloc - conAmt : 0, rem = Math.max(0, r.alloc - left - ptot);
    const cancel = st === "sx" ? rem : 0, slow = st !== "sx" && n >= 2 ? Math.max(0, rem - cancel) : 0, fast = Math.max(0, paid - ptot), lapse = rem - cancel - slow + fast;
    F[r.id] = { st, ptot, rem, left, cancel, slow, fast, lapse }; }); return F; }
function d98Rows(fy, it) { const F = d98Facts(fy), G = {}; it.forEach(x => (G[x[D98.by]] = G[x[D98.by]] || []).push(x));
  const sum = l => { const o = { n: l.length, B: 0, P: 0, A: 0, left: 0, rem: 0, cancel: 0, slow: 0, fast: 0, lapse: 0, plan: Array(12).fill(0), act: Array(12).fill(0) };
    l.forEach(x => { const f = F[x.r.id] || {}; o.B += x.B; o.P += f.ptot || 0; o.A += x.A; ["left", "rem", "cancel", "slow", "fast", "lapse"].forEach(k => (o[k] += f[k] || 0)); x.r.plan.forEach((v, i) => (o.plan[i] += v)); x.r.act.forEach((v, i) => (o.act[i] += v)); }); return o; };
  const rows = Object.entries(G).sort((a, b) => a[0].localeCompare(b[0], "th")).map(([k, l]) => [k, sum(l)]); return { rows, tot: sum(it) }; }
const d98M = v => (Math.abs(v) < 50 ? "-" : fmt(v / 1e6, 4));
const d98MonLbl = (fy, i) => `${BI_MON[i]} ${String((i < 3 ? fy - 1 : fy) % 100).padStart(2, "0")}`;
function d98Table(fy, it) { const { rows, tot } = d98Rows(fy, it), mi = Math.min(11, prMonIdx(TODAY)), by = D96_G.find(g => g[0] === D98.by);
  const MS = D98.mon === "all" ? [...Array(12).keys()] : D98.mon === "q" ? [] : [...Array(mi + 1).keys()];
  const Q = D98.mon === "q" ? [0, 1, 2, 3] : [];
  const pct = o => (o.B ? `${fmt(o.A / o.B * 100, 2)}%` : `<span class="sub">-</span>`);
  const cells = (o, k) => { const on = D96.g.k === D98.by && D96.g.v === k;
    return `<td class="n">${o.n}</td><td class="n">${d98M(o.B)}</td><td class="n">${d98M(o.P)}</td><td class="n">${d98M(o.A)}</td><td class="n">${d98M(o.left)}</td><td class="n d98-pc">${pct(o)}</td><td class="n">${d98M(o.rem)}</td><td class="n">${d98M(o.cancel)}</td><td class="n">${d98M(o.slow)}</td><td class="n">${d98M(o.fast)}</td><td class="n d98-lp ${Math.abs(o.lapse) >= 50 ? "bad" : ""}">${d98M(o.lapse)}</td>`
      + MS.map(i => `<td class="n d98-mp ${i === mi ? "now" : ""}">${d98M(o.plan[i])}</td><td class="n d98-ma ${i === mi ? "now" : ""} ${o.plan[i] && o.act[i] < o.plan[i] * 0.8 && i <= mi ? "low" : ""}">${i <= mi || o.act[i] ? d98M(o.act[i]) : ""}</td>`).join("")
      + Q.map(q => { const p = o.plan.slice(q * 3, q * 3 + 3).reduce((a, v) => a + v, 0), a = o.act.slice(q * 3, q * 3 + 3).reduce((a, v) => a + v, 0); return `<td class="n d98-mp">${d98M(p)}</td><td class="n d98-ma">${d98M(a)}</td>`; }).join(""); };
  const mh = MS.map(i => `<th colspan="2" class="d98-mh ${i === mi ? "now" : ""}">${d98MonLbl(fy, i)}</th>`).join("") + Q.map(q => `<th colspan="2" class="d98-mh">ไตรมาส ${q + 1}</th>`).join("");
  const ms = [...MS, ...Q].map(() => `<th class="d98-mh2">แผน</th><th class="d98-mh2">ผล</th>`).join("");
  return `<section class="panel d98"><header><h2>สรุปการเบิกจ่ายตามแบบฟอร์ม ปีงบประมาณ พ.ศ. ${fy}</h2><span class="sp"></span>
    <div class="d98-seg">${D96_G.map(([k, t]) => `<button type="button" class="${D98.by === k ? "on" : ""}" data-d98by="${k}">${t}</button>`).join("")}</div>
    <div class="d98-seg">${[["all", "ทั้งปี"], ["todate", "ถึงเดือนปัจจุบัน"], ["q", "รายไตรมาส"]].map(([k, t]) => `<button type="button" class="${D98.mon === k ? "on" : ""}" data-d98mon="${k}">${t}</button>`).join("")}</div></header>
  <div class="d98-wrap"><table class="d98-t"><thead>
    <tr><th rowspan="3" class="d98-k">${esc(by[1])}</th><th colspan="11" class="d98-h">รวมทั้งสิ้น</th>${MS.length || Q.length ? `<th colspan="${(MS.length + Q.length) * 2}" class="d98-mh d98-top">แผน / ผล การเบิกจ่ายรายเดือน</th>` : ""}</tr>
    <tr><th class="d98-h">จำนวน</th><th class="d98-h">วงเงิน</th><th class="d98-h">วางแผน</th><th class="d98-h">ผลการเบิกจ่าย</th><th class="d98-h">ส่งคืนเงิน</th><th class="d98-h">%</th><th class="d98-h">คงเหลือ</th><th class="d98-h">ยกเลิก</th><th colspan="2" class="d98-h">โอนเงิน</th><th class="d98-h d98-y">ยังไม่วางแผน</th>${mh}</tr>
    <tr><th class="d98-h">รายการ</th><th class="d98-h">(ล้านบาท)</th><th class="d98-h">สะสม</th><th class="d98-h">สะสม</th><th class="d98-h">เหลือจ่าย</th><th class="d98-h">เบิกจ่าย</th><th class="d98-h">จากการวางแผน</th><th class="d98-h">สัญญา</th><th class="d98-h">งานช้า</th><th class="d98-h">งานเร็ว</th><th class="d98-h d98-y">(ตกพับ)</th>${ms}</tr></thead>
  <tbody>${rows.map(([k, o]) => `<tr data-d96g="${D98.by}|${esc(k)}" class="${D96.g.k === D98.by && D96.g.v === k ? "on" : ""}"><td class="d98-k">${esc(k)}</td>${cells(o, k)}</tr>`).join("")}</tbody>
  <tfoot><tr><td class="d98-k">รวมทั้งสิ้น</td>${cells(tot, "")}</tr></tfoot></table></div>
  <div class="body sub d98-note">หน่วย: ล้านบาท · ผล = เงินที่จ่ายจริงตามวันที่จ่าย · คลิกแถวเพื่อกรองรายการด้านล่าง · เดือนปัจจุบันไฮไลต์ ผลต่ำกว่า 80% ของแผนเป็นตัวแดง<br>
  ส่งคืนเงินเหลือจ่าย = วงเงิน − วงเงินสัญญา (เมื่อลงนามสัญญาแล้ว) · คงเหลือจากการวางแผน = วงเงิน − เหลือจ่าย − แผนทั้งปี · ยกเลิกสัญญา = ยอดคงเหลือของรายการที่ยกเลิก · โอนเงินงานช้า = ยอดคงเหลือของรายการที่อยู่ระหว่างจัดซื้อหรือดำเนินงานแต่ไม่ได้วางแผนในปีนี้ · โอนเงินงานเร็ว = ผลที่เบิกเกินแผนทั้งปี · ยังไม่วางแผน (ตกพับ) = ส่วนที่เหลือ ต้องเป็น 0 (ตัวแดงเมื่อยังไม่เป็น 0)</div></section>`; }
(function () { if (document.getElementById("d98-css")) return; const s = document.createElement("style"); s.id = "d98-css"; s.textContent = `
.d98 header{flex-wrap:wrap;gap:8px}
.d98-seg{display:inline-flex;border:1px solid var(--line);border-radius:8px;overflow:hidden}
.d98-seg button{border:0;background:transparent;padding:5px 10px;font:inherit;font-size:12.5px;cursor:pointer;color:inherit;border-right:1px solid var(--line)}
.d98-seg button:last-child{border-right:0}.d98-seg button.on{background:#1f2937;color:#fff}
.d98-wrap{overflow:auto;max-height:620px}
.d98-t{border-collapse:separate;border-spacing:0;font-size:12.5px;white-space:nowrap}
.d98-t th,.d98-t td{padding:6px 9px;border-bottom:1px solid var(--line)}
.d98-t thead th{position:sticky;z-index:2;text-align:center;font-weight:600}
.d98-t thead tr:nth-child(1) th{top:0}.d98-t thead tr:nth-child(2) th{top:31px}.d98-t thead tr:nth-child(3) th{top:62px}
.d98-h{background:#111827;color:#fff;border-bottom:0!important}
.d98-y{color:#facc15!important}
.d98-mh,.d98-mh2{background:#dcfce7;color:#14532d;border-left:1px solid #bbf7d0}
.d98-mh.now,.d98-t td.now{background:#fef9c3}
.d98-t .d98-k{position:sticky;left:0;z-index:1;background:var(--panel,#fff);text-align:left;min-width:200px;max-width:260px;white-space:normal;border-right:2px solid var(--line)}
.d98-t thead .d98-k{z-index:3;background:#111827;color:#fff}
.d98-t tbody tr{cursor:pointer}.d98-t tbody tr:hover td{background:var(--hover,#f8fafc)}.d98-t tbody tr.on td{background:var(--info-soft,#eff6ff)}
.d98-t td.d98-mp{border-left:1px solid var(--line)}.d98-t td.d98-ma{color:#2563eb}.d98-t td.d98-ma.low{color:#dc2626;font-weight:600}
.d98-t td.d98-pc{font-weight:600}.d98-t td.d98-lp.bad{color:#dc2626;font-weight:700}
.d98-t td:nth-child(12){border-right:2px solid #111827}
.d98-t tfoot td{position:sticky;bottom:0;background:#f1f5f9;font-weight:700;border-top:2px solid #111827}
.d98-t tfoot .d98-k{background:#f1f5f9;z-index:2}
.d98-note{line-height:1.7}
`; document.head.appendChild(s); })();

// The page: the form table in place of the four group cards.
{ const base = d96Page; d96Page = function () { const html = base(), a = html.indexOf('<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,480px)'), b = html.indexOf('<section class="panel"><header><h2>รายการงบประมาณ');
  if (a < 0 || b < a) return html; return html.slice(0, a) + `<div style="margin:14px 0">${d98Table(BI.fy, d96Items(BI.fy))}</div>` + html.slice(b); }; }
// Excel: the form as the first sheet of "Excel รายการและกลุ่ม".
function d98Sheet(fy) { const it = d96Items(fy), m = v => Math.round(v / 1e6 * 1e4) / 1e4, keep = D98.by, out = [];
  D96_G.forEach(([k, t]) => { D98.by = k; const { rows, tot } = d98Rows(fy, it), line = (n, o) => [n, o.n, m(o.B), m(o.P), m(o.A), m(o.left), o.B ? Math.round(o.A / o.B * 10000) / 100 : 0, m(o.rem), m(o.cancel), m(o.slow), m(o.fast), m(o.lapse), ...o.plan.flatMap((v, i) => [m(v), m(o.act[i])])];
    out.push({ name: "สรุปเงิน " + t, rows: [[`สรุปการเบิกจ่ายตาม${t} ปีงบประมาณ พ.ศ. ${fy}`], ["หน่วย: ล้านบาท · ผลตามวันที่จ่าย"],
      [t, "จำนวนรายการ", "วงเงิน (ล้านบาท)", "วางแผนสะสม", "ผลการเบิกจ่ายสะสม", "ส่งคืนเงินเหลือจ่าย", "% เบิกจ่าย", "คงเหลือจากการวางแผน", "ยกเลิกสัญญา", "โอนเงิน งานช้า", "โอนเงิน งานเร็ว", "ยังไม่วางแผน (ตกพับ)", ...BI_MON.flatMap((x, i) => ["แผน " + d98MonLbl(fy, i), "ผล " + d98MonLbl(fy, i)])]]
      .concat(rows.map(([k, o]) => line(k, o)), [line("รวมทั้งสิ้น", tot)]) }); });
  D98.by = keep; return out; }
{ const base = d96Book; d96Book = function (fy) { return d98Sheet(fy).concat(base(fy)); }; }

document.addEventListener("click", e => { const t = e.target && e.target.closest ? e.target : null; if (!t) return;
  const b = t.closest("[data-d98by]"); if (b) { D98.by = b.dataset.d98by; route(); return; }
  const m = t.closest("[data-d98mon]"); if (m) { D98.mon = m.dataset.d98mon; route(); return; } });
