// KlangFinance, budget round Q7 (12 Nov 2569): the dashboard of budget requests and the summary report.
// What was asked: a dashboard that sums the requests by kind of expenditure (recurrent or investment), single-year,
// multi-year commitment and continuing commitment, number of projects, area, and whatever else is useful; the link between
// the plan and the budget for the executives; and a summary report of the requests.
// Page BQ9 is the dashboard, page BQ10 the report (printable, and CSV for the list and for the sums). Both read the requests
// of the year being prepared (the prototype keeps requests only for that year) and take the same two filters: which requests
// (those still alive, the approved ones, or all including the rejected) and, for roles above a unit, which unit.
// A unit sees its own requests only. Amounts are the amount asked (r.amount); off-budget money is the lines of the request's
// own off-budget list (file 98zd) and is shown beside, not added to, the budget amount.
// How some sums are made (my choices): a request with several areas has its amount shared equally between them; a request with
// no area goes under "no area given". The plan link is the strategy item that the first KPI of the request's activity belongs to;
// a request whose activity has no KPI is "not linked to the strategy". "Projects" counts the distinct output-level nodes
// (output, project or fund) that the requests sit under.
const DS_APP = "DPT Budget";
let DS = { scope: "live", unit: "" };
const DS_SCOPE = { live: ["ยังไม่ถูกตีตก (ไม่นับที่ไม่เห็นชอบ)", "Still alive (rejected ones left out)"], approved: ["ผู้บริหารเห็นชอบแล้ว", "Approved"], all: ["ทั้งหมด รวมที่ไม่เห็นชอบ", "All, rejected ones too"] };
const dsUnitSel = () => (typeof unitRole === "function" && unitRole() ? me().unit : DS.unit);
const dsList = () => S.requests.filter(r => (!dsUnitSel() || r.unit === dsUnitSel()) && (DS.scope === "all" || (DS.scope === "approved" ? r.status === "approved" : r.status !== "rejected")));
const dsKind = r => (r.multi ? "multi" : "year");
const DS_KIND = { year: ["รายการปีเดียว", "Single-year"], multi: ["รายการผูกพัน", "Multi-year commitment"] };
const dsAmt = r => Number(r.amount) || 0;
const dsOut = r => { const lin = lineage(r.act) || []; return lin.find(n => n.lvl === "output") || null; };
const dsProg = r => { const lin = lineage(r.act) || []; return lin.find(n => n.lvl === "program") || null; };
const dsStrat = r => { const k = (typeof kpisForAct === "function" ? kpisForAct(r.act) : [])[0]; return k && k.st ? k.st : null; };
const dsProvs = r => { const A = (rqCls(r).areas || []).filter(a => a.prov); return A.length ? A.map(a => a.prov) : []; };
function dsGroup(list, keyFn, labelFn, amtFn) { const m = new Map(); list.forEach(r => keyFn(r).forEach(([k, share]) => { const g = m.get(k) || { k, label: labelFn(k, r), n: 0, amt: 0 }; g.n += share === 1 ? 1 : share; g.amt += (amtFn || dsAmt)(r) * share; m.set(k, g); })); return [...m.values()]; }
function dsSections(list) {
  const S_ = [], push = (id, th, en, rows, o) => S_.push(Object.assign({ id, t: [th, en], rows }, o || {})), one = f => r => [[f(r), 1]];
  push("nature", "ตามประเภทรายจ่าย (ประจำ/ลงทุน)", "By kind of expenditure (recurrent / investment)", dsGroup(list, one(r => rqNature(r)), k => (k === "inv" ? L("ลงทุน", "Investment") : L("ประจำ", "Recurrent"))).sort((a, b) => (a.k === "ope" ? -1 : 1)));
  push("kind", "ตามประเภทคำขอ (ปีเดียว / ผูกพัน)", "By kind of request (single-year / commitment)", ["year", "multi"].map(k => { const l = list.filter(r => dsKind(r) === k); return { k, label: tx(DS_KIND[k]), n: l.length, amt: sumv(l.map(dsAmt)) }; }));
  const my = list.filter(r => r.multi && r.years), ys = [...new Set(my.flatMap(r => Object.keys(r.years)))].map(Number).sort();
  push("years", "วงเงินผูกพันแยกตามปีงบประมาณ (คำขอผูกพันและผูกพันต่อเนื่อง)", "Commitments by fiscal year (commitment and continuing requests)", ys.map(y => ({ k: y, label: String(y), n: my.filter(r => Number(r.years[y]) > 0).length, amt: sumv(my.map(r => Number(r.years[y]) || 0)) })), { total: false });
  push("btype", "ตามประเภทงบประมาณ", "By budget type", BUDGET_TYPES.map(t => { const l = list.filter(r => (rqCls(r).btype || rqDominant(r)) === t.id); return { k: t.id, label: `${String(t.code).padStart(2, "0")} ${tx(t.name)}`, n: l.length, amt: sumv(l.map(dsAmt)) }; }));
  push("otype", "ตามประเภทผลผลิต / โครงการ / กองทุน", "By output / project / fund", dsGroup(list, r => { const o = dsOut(r); return [[o ? outType(o) : "none", 1]]; }, k => (k === "none" ? L("ไม่ระบุ", "Not given") : tx(OUT_TYPES[k]))));
  push("prog", "ตามแผนงาน (และจำนวนผลผลิต/โครงการ/กองทุน)", "By programme (and number of outputs, projects, funds)", dsGroup(list, r => { const p = dsProg(r); return [[p ? p.id : "none", 1]]; }, (k, r) => { const p = dsProg(r); return p ? `${p.code} ${tx(p.name)}` : L("ไม่ระบุแผนงาน", "No programme"); }).map(g => { g.extra = new Set(list.filter(r => (dsProg(r) ? dsProg(r).id : "none") === g.k).map(r => (dsOut(r) || {}).id).filter(Boolean)).size; return g; }), { extraH: ["ผลผลิต/โครงการ/กองทุน", "Outputs / projects / funds"] });
  push("strat", "ความเชื่อมโยงกับแผนยุทธศาสตร์", "Link to the strategy", dsGroup(list, r => { const s = dsStrat(r); return [[s ? s.id : "none", 1]]; }, (k, r) => { const s = dsStrat(r); return s ? tx(s.name) : L("ยังไม่เชื่อมกับยุทธศาสตร์ (กิจกรรมไม่มีตัวชี้วัด)", "Not linked to the strategy (the activity has no KPI)"); }).sort((a, b) => (a.k === "none" ? 1 : b.k === "none" ? -1 : 0)));
  const aprov = dsGroup(list, r => { const p = dsProvs(r); return p.length ? p.map(x => [x, 1 / p.length]) : [["", 1]]; }, k => k || L("ไม่ระบุพื้นที่", "No area given")); aprov.forEach(g => (g.n = Math.round(g.n * 10) / 10));
  push("area", "ตามพื้นที่ (จังหวัด) แบ่งวงเงินเท่ากันเมื่อมีหลายพื้นที่", "By area (province), shared equally when a request has several", aprov.sort((a, b) => (a.k === "" ? 1 : b.k === "" ? -1 : b.amt - a.amt)));
  push("unit", "ตามหน่วยงาน", "By unit", dsGroup(list, r => [[r.unit, 1]], k => unitName(k)).sort((a, b) => b.amt - a.amt));
  push("status", "ตามขั้นตอนการพิจารณา", "By stage of review", Object.keys(STATUS).map(k => { const l = list.filter(r => r.status === k); return { k, label: tx(STATUS[k][0]), n: l.length, amt: sumv(l.map(dsAmt)) }; }).filter(x => x.n));
  const money = []; const mt = (S.moneyTypes || []);
  mt.filter(t => t.kind === "bud").forEach(t => { const l = list.filter(r => (rqCls(r).money || []).includes(t.id)); if (l.length) money.push({ k: t.id, label: `${L("เงินงบประมาณ", "Budget")}: ${tx(t.name)}`, n: l.length, amt: sumv(l.map(dsAmt)) }); });
  mt.filter(t => t.kind === "off").forEach(t => { const l = list.filter(r => (rqCls(r).offs || []).some(o => o.type === t.id)); if (l.length) money.push({ k: t.id, label: `${L("เงินนอกงบ", "Off-budget")}: ${tx(t.name)}`, n: l.length, amt: sumv(list.map(r => sumv((rqCls(r).offs || []).filter(o => o.type === t.id).map(o => Number(o.amt) || 0)))) }); });
  push("money", "ตามประเภทเงิน (คำขอหนึ่งนับได้หลายประเภท)", "By kind of money (a request can count under several)", money, { total: false });
  const qs = [0, 1, 2, 3].map(i => ({ k: i, label: `${L("ไตรมาส", "Q")} ${i + 1}`, n: list.filter(r => r.qplan && Number(r.qplan[i]) > 0).length, amt: sumv(list.map(r => (r.qplan ? Number(r.qplan[i]) || 0 : 0))) }));
  push("quarter", "แผนการใช้จ่ายรายไตรมาส (เฉพาะคำขอที่กรอกแผนแล้ว)", "Spending plan by quarter (requests with a plan only)", qs, { total: false });
  const mm = RQP_MON.map((m, i) => ({ k: i, label: tx(m), n: list.filter(r => r.mplan && Number(r.mplan[i]) > 0).length, amt: sumv(list.map(r => (r.mplan ? Number(r.mplan[i]) || 0 : 0))) })); if (mm.some(x => x.amt > 0)) push("month", "แผนรายเดือน (เฉพาะคำขอที่กรอกแล้ว)", "Spending plan by month (requests with one only)", mm, { total: false });
  return S_;
}
function dsTotals(list) {
  const q = typeof quotaCheck === "function" ? quotaCheck(FORM_FY) : null, outs = new Set(list.map(r => (dsOut(r) || {}).id).filter(Boolean));
  return { n: list.length, amt: sumv(list.map(dsAmt)), off: sumv(list.map(r => rqOffTotal(rqCls(r)))), proj: outs.size, multi: list.filter(r => r.multi).length, multiAmt: sumv(list.filter(r => r.multi && r.years).map(r => sumv(Object.values(r.years).map(Number)))), q };
}
const dsPct = (a, t) => (t ? `${fmt((a / t) * 100, 1)}%` : "–");

// ---------- shared pieces ----------
function dsFilters() {
  const un = typeof unitRole === "function" && unitRole();
  return `<div class="row" style="margin:0 0 12px;flex-wrap:wrap"><label for="ds-scope"><b style="font-weight:600">${L("คำขอที่นับ", "Requests counted")}</b></label><select id="ds-scope">${Object.keys(DS_SCOPE).map(k => `<option value="${k}" ${DS.scope === k ? "selected" : ""}>${esc(tx(DS_SCOPE[k]))}</option>`).join("")}</select>
    ${un ? `<span class="sub">${L("แสดงเฉพาะหน่วยงานของท่าน", "Your own unit only")}: ${esc(unitName(me().unit))}</span>` : `<label for="ds-unit"><b style="font-weight:600">${L("หน่วยงาน", "Unit")}</b></label><select id="ds-unit"><option value="">${L("ทุกหน่วยงาน", "All units")}</option>${[...new Set(S.requests.map(r => r.unit))].map(u => `<option value="${u}" ${DS.unit === u ? "selected" : ""}>${esc(unitName(u))}</option>`).join("")}</select>`}
    <span class="sub">${L("ปีงบประมาณ", "FY")} ${FORM_FY} · ${L("ต้นแบบเก็บคำขอไว้เฉพาะปีที่กำลังจัดทำ", "the prototype keeps requests only for the year being prepared")}</span></div>`;
}
function dsBindFilters() { const s = $("#ds-scope"), u = $("#ds-unit"); if (s) s.onchange = e => { DS.scope = e.target.value; route(); }; if (u) u.onchange = e => { DS.unit = e.target.value; route(); }; }
function dsTable(sec, tot, bars) {
  const rows = sec.rows, mx = Math.max(1, ...rows.map(r => r.amt)), sum = sumv(rows.map(r => r.amt)), nn = sumv(rows.map(r => r.n));
  return `<section class="panel"><header><h2>${esc(tx(sec.t))}</h2></header>${rows.length ? `<div class="tbl-wrap"><table><thead><tr><th>${L("รายการ", "Item")}</th>${sec.extraH ? `<th class="n">${tx(sec.extraH)}</th>` : ""}<th class="n">${L("จำนวนคำขอ", "Requests")}</th><th class="n">${L("วงเงิน (ล้านบาท)", "Amount (M baht)")}</th><th class="n">${L("สัดส่วน", "Share")}</th>${bars ? `<th style="width:160px"></th>` : ""}</tr></thead>
    <tbody>${rows.map(r => `<tr><td>${esc(r.label)}</td>${sec.extraH ? `<td class="n">${r.extra == null ? "–" : r.extra}</td>` : ""}<td class="n">${fmt(r.n, r.n % 1 ? 1 : 0)}</td><td class="n">${mb(r.amt)}</td><td class="n">${sec.total === false ? "–" : dsPct(r.amt, tot.amt)}</td>${bars ? `<td><div class="bar"><i style="width:${Math.round((r.amt / mx) * 100)}%"></i></div></td>` : ""}</tr>`).join("")}</tbody>
    ${sec.total === false ? "" : `<tfoot><tr><td>${L("รวม", "Total")}</td>${sec.extraH ? "<td></td>" : ""}<td class="n">${fmt(nn, nn % 1 ? 1 : 0)}</td><td class="n">${mb(sum)}</td><td class="n">${dsPct(sum, tot.amt)}</td>${bars ? "<td></td>" : ""}</tr></tfoot>`}</table></div>` : `<div class="body sub">${L("ไม่มีข้อมูล", "No data")}</div>`}</section>`;
}
function dsReqCsv(list) { const q = s => (/[",\n]/.test(String(s)) ? `"${String(s).replace(/"/g, '""')}"` : String(s)); return ["id,unit,name,programme,output_or_project,output_type,kind,nature,budget_type,amount,off_budget,provinces,status", ...list.map(r => { const o = dsOut(r), p = dsProg(r); return [r.id, unitName(r.unit), tx(r.name), p ? tx(p.name) : "", o ? tx(o.name) : "", o ? tx(OUT_TYPES[outType(o)]) : "", tx(DS_KIND[dsKind(r)]), rqNature(r), typeName(rqCls(r).btype || rqDominant(r)), dsAmt(r), rqOffTotal(rqCls(r)), dsProvs(r).join(" / "), tx(STATUS[r.status][0])].map(q).join(","); })].join("\n"); }
function dsSumCsv(secs) { const q = s => (/[",\n]/.test(String(s)) ? `"${String(s).replace(/"/g, '""')}"` : String(s)); return ["section,item,requests,amount", ...secs.flatMap(s => s.rows.map(r => [tx(s.t), r.label, r.n, Math.round(r.amt)].map(q).join(",")))].join("\n"); }
function dsDownload(name, text) { const blob = new Blob(["﻿" + text], { type: "text/csv;charset=utf-8" }), a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); }

// ---------- BQ9: the dashboard ----------
ePageDef("budget", "bq-dash", "BQ9", "form", KROLES, ["แดชบอร์ดคำของบประมาณ", "Budget request dashboard"], () => {
  const list = dsList(), tot = dsTotals(list), secs = dsSections(list), q = tot.q, used = q && q.limit ? Math.min(100, Math.round((tot.amt / q.limit) * 100)) : 0;
  return `${eHead(DS_APP, "BQ9", ["แดชบอร์ดคำของบประมาณ", "Budget request dashboard"], ["สรุปคำของบประมาณปีที่กำลังจัดทำตามประเภทรายจ่าย (ประจำ/ลงทุน) ปีเดียว/ผูกพัน/ผูกพันต่อเนื่อง ประเภทงบ ผลผลิต/โครงการ/กองทุน แผนงาน การเชื่อมกับยุทธศาสตร์ พื้นที่ หน่วยงาน ประเภทเงิน และแผนใช้จ่าย · วิธีแบ่งยอดตามพื้นที่และการนับโครงการเป็นการเลือกของผม (ดูหมายเหตุท้ายหน้า)", "Summary of the requests being prepared by kind of expenditure, single-year, commitment and continuing, budget type, output, project and fund, programme, link to the strategy, area, unit, kind of money and spending plan · how the area split and the project count are made is my choice (see the note at the foot)"])}
    ${dsFilters()}
    ${eKpis([[L("คำขอ", "Requests"), tot.n], [L("วงเงินที่ขอ (ล้านบาท)", "Asked (M baht)"), mb(tot.amt)], [L("เงินนอกงบประมาณ (ล้านบาท)", "Off-budget (M baht)"), mb(tot.off)], [L("ผลผลิต/โครงการ/กองทุน", "Outputs, projects, funds"), tot.proj], [L("คำขอผูกพัน", "Commitment requests"), tot.multi], [L("วงเงินผูกพันรวมทุกปี (ล้านบาท)", "Commitments, all years (M baht)"), mb(tot.multiAmt)]])}
    ${q ? `<section class="panel"><div class="body"><div class="row">${tag(q.none ? L("ยังไม่ตั้งโควต้า", "No quota") : tot.amt <= q.limit ? L("ไม่เกินขีดจำกัดโควต้า", "Within the quota ceiling") : L("เกินขีดจำกัดโควต้า", "Over the quota ceiling"), q.none || tot.amt > q.limit ? "p-warn" : "p-ok")} <span class="sub">${L("วงเงินที่ขอ", "Asked")} <b>${fmt(tot.amt)}</b> / ${L("ขีดจำกัด", "ceiling")} <b>${fmt(q.limit)}</b> ${L("บาท", "baht")}${q.q ? ` · ${q.q.pct}% ${L("ของโควต้า", "of the quota")} ${fmt(q.q.base)}` : ""} · ${L("(โควต้าและเพดานกำหนดที่ BQ1 ด่านการส่งนับยอดในชุดส่ง สงป. ต่างจากยอดนี้)", "(quota set on BQ1; the send gate counts the batches for the Bureau, which is not this figure)")}</span></div>
      <div class="bar" style="margin-top:6px"><i style="width:${used}%;background:var(--${tot.amt <= q.limit ? "ok" : "bad"})"></i></div></div></section>` : ""}
    <div class="grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(360px,1fr));gap:14px">${secs.map(s => dsTable(s, tot, true)).join("")}</div>
    <section class="panel"><div class="body sub">${L("หมายเหตุ: คำขอที่มีหลายพื้นที่แบ่งวงเงินเท่ากัน ไม่ระบุพื้นที่ไปอยู่ \"ไม่ระบุพื้นที่\" · โครงการนับเป็นจำนวนผลผลิต/โครงการ/กองทุนที่ไม่ซ้ำที่คำขอสังกัด · ยุทธศาสตร์ดูจากตัวชี้วัดแรกของกิจกรรมของคำขอ · เงินนอกงบแสดงข้างเงินงบประมาณ ไม่รวมเข้าด้วยกัน", "Note: a request with several areas shares its amount equally; with none it goes under \"no area given\" · projects are the distinct outputs, projects and funds the requests sit under · the strategy is the one that the first KPI of the request's activity belongs to · off-budget money is shown beside the budget amount, not added to it")}</div></section>
    <div class="row" style="margin-top:10px"><button class="btn" type="button" data-jump="bq-rpt">${L("ไปที่รายงานสรุป (พิมพ์ได้)", "Go to the summary report (printable)")}</button></div>`;
}, () => dsBindFilters());

// ---------- BQ10: the summary report ----------
ePageDef("budget", "bq-rpt", "BQ10", "form", KROLES, ["รายงานงบประมาณประจำปี", "Annual budget report"], () => {
  const list = dsList(), tot = dsTotals(list), secs = dsSections(list), st = (S.fyList || []).find(f => f.fy === FORM_FY) || {};
  return `<style>@media print { body * { visibility: hidden !important; } #ds-report, #ds-report * { visibility: visible !important; } #ds-report { position: absolute; left: 0; top: 0; width: 100%; } .no-print { display: none !important; } #ds-report .panel { break-inside: avoid; box-shadow: none; border: 1px solid #999; } }</style>
    <div class="no-print">${eHead(DS_APP, "BQ10", ["รายงานงบประมาณประจำปี", "Annual budget report"], ["รายงานตามตัวกรองเดียวกับแดชบอร์ด พิมพ์ได้ (ปุ่มพิมพ์ใช้การพิมพ์ของเบราว์เซอร์ เลือกบันทึกเป็น PDF ได้) และส่งออก CSV ของรายการคำขอและของตารางสรุป", "The report uses the same filters as the dashboard; print it (the button uses the browser's print, which can save as PDF) and export CSV of the list and of the sums"])}${dsFilters()}
      <div class="row" style="margin-bottom:10px"><button class="btn primary" type="button" id="ds-print">${L("พิมพ์รายงาน", "Print the report")}</button><button class="btn" type="button" id="ds-csv1">${L("ส่งออก CSV รายการคำขอ", "Export the request list (CSV)")}</button><button class="btn" type="button" id="ds-csv2">${L("ส่งออก CSV ตารางสรุป", "Export the sums (CSV)")}</button></div></div>
    <div id="ds-report"><section class="panel"><div class="body"><h2 style="margin:0">${L("รายงานสรุปงบประมาณ ปีงบประมาณ", "Budget summary report, fiscal year")} ${FORM_FY}</h2>
      <p class="sub" style="margin:4px 0 0">${esc(tx(S.org))} · ${L("ข้อมูล ณ วันที่", "as of")} ${fdate(TODAY)} · ${L("คำขอที่นับ", "requests counted")}: ${esc(tx(DS_SCOPE[DS.scope]))}${dsUnitSel() ? ` · ${esc(unitName(dsUnitSel()))}` : ""}${st.status ? ` · ${L("สถานะปีงบประมาณ", "year status")}: ${esc(tx(FY_STATUS[st.status] ? FY_STATUS[st.status][0] : [st.status, st.status]))}` : ""}</p>
      <div class="kpis" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr));margin-top:10px"><div class="kpi"><span class="l">${L("คำขอ", "Requests")}</span><span class="v">${tot.n}</span></div><div class="kpi"><span class="l">${L("วงเงินที่ขอ (บาท)", "Asked (baht)")}</span><span class="v">${fmt(tot.amt)}</span></div><div class="kpi"><span class="l">${L("เงินนอกงบประมาณ (บาท)", "Off-budget (baht)")}</span><span class="v">${fmt(tot.off)}</span></div><div class="kpi"><span class="l">${L("ผลผลิต/โครงการ/กองทุน", "Outputs, projects, funds")}</span><span class="v">${tot.proj}</span></div></div></div></section>
      ${secs.map(s => dsTable(s, tot, false)).join("")}
      <section class="panel"><header><h2>${L("รายการคำขอ", "List of requests")}</h2></header><div class="tbl-wrap"><table><thead><tr><th>${L("เลขที่", "No.")}</th><th>${L("หน่วยงาน", "Unit")}</th><th>${L("รายการ", "Item")}</th><th>${L("ผลผลิต/โครงการ/กองทุน", "Output / project / fund")}</th><th>${L("ประเภท", "Kind")}</th><th class="n">${L("วงเงินที่ขอ", "Asked")}</th><th class="n">${L("เงินนอกงบ", "Off-budget")}</th><th>${L("สถานะ", "Status")}</th></tr></thead>
        <tbody>${list.map(r => { const o = dsOut(r); return `<tr><td class="mono">${r.id}</td><td>${esc(unitName(r.unit))}</td><td>${esc(tx(r.name))}</td><td>${o ? `${esc(tx(o.name))} <span class="sub">(${esc(tx(OUT_TYPES[outType(o)]))})</span>` : "–"}</td><td>${esc(tx(DS_KIND[dsKind(r)]))} · ${rqNature(r) === "inv" ? L("ลงทุน", "inv.") : L("ประจำ", "rec.")}</td><td class="n">${fmt(dsAmt(r))}</td><td class="n">${fmt(rqOffTotal(rqCls(r)))}</td><td>${esc(tx(STATUS[r.status][0]))}</td></tr>`; }).join("") || `<tr><td colspan="8" class="sub">${L("ไม่มีคำขอ", "No requests")}</td></tr>`}</tbody>
        <tfoot><tr><td colspan="5">${L("รวม", "Total")}</td><td class="n">${fmt(tot.amt)}</td><td class="n">${fmt(tot.off)}</td><td></td></tr></tfoot></table></div></section>
      <p class="sub">${L("จัดทำโดยระบบต้นแบบ ข้อมูลตัวอย่าง ไม่ใช่เอกสารทางการ", "Made by the prototype from sample data; not an official document")}</p></div>`;
}, () => { dsBindFilters(); const p = $("#ds-print"); if (p) p.onclick = () => window.print(); const a = $("#ds-csv1"); if (a) a.onclick = () => dsDownload(`budget_requests_${FORM_FY}.csv`, dsReqCsv(dsList())); const b = $("#ds-csv2"); if (b) b.onclick = () => dsDownload(`budget_summary_${FORM_FY}.csv`, dsSumCsv(dsSections(dsList()))); });
Object.assign(NAV_ICON, { "bq-dash": "chart", "bq-rpt": "file" });
