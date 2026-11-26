// KlangFinance, round P25 (16 Nov 2569): the menu "Annual budget report" and the Bureau status tab, on the user's brief:
//   1. The menu "รายงานสรุปคำของบประมาณ" (BQ10) is renamed "รายงานงบประมาณประจำปี" and has two tabs:
//        - "รายงานสรุปงบประมาณ ปีงบประมาณ": a dashboard that compares the budget at three steps, the REQUEST, the DRAFT BILL (ร่าง พ.ร.บ.) and the ACT (พ.ร.บ.)
//          (KPIs, a bar for each unit and a table for each request); the earlier printable report (filters, print, CSV, the sums) stays under it;
//        - "ปรับปรุงเงินงบประมาณ": the list that was the tab "รายการคำขอ" of the page "สรุปและส่ง สงป." (file 98zzzc, moved here), where Planning updates the amounts of
//          the draft bill and of the act for each request; the dashboard reads those amounts.
//   2. On the page "สรุปและส่ง สงป." the tab "ตรวจก่อนส่ง" is now "ปรับปรุงสถานะ สงป.": for each request in the package, Planning records the status at the Bureau
//      and the details that go with it (date sent, the Bureau's letter number, the Bureau's result amount, date of the answer, a note). The old pre-send checks stay
//      on the same tab, folded under the table, because they still tell what is not ready.
// My choices: the status list below (prepared, sent, received, reviewing, more information wanted, agreed as asked, agreed in part, not agreed); the Bureau's result
// amount is the same figure as S.submission.results (so the request panel shows it as "Bureau result"); the status record is S.submission.bst[requestId].
window.RPT_TAB = window.RPT_TAB || "rpsum";
const RPT_TABS = [{ id: "rpsum", label: ["รายงานสรุปงบประมาณ ปีงบประมาณ", "Budget summary report, fiscal year"] }, { id: "rpupd", label: ["ปรับปรุงเงินงบประมาณ", "Update the budget amounts"] }];
const rptBar = () => `<div class="tabs no-print" role="tablist">${RPT_TABS.map(t => `<button class="tab ${t.id === window.RPT_TAB ? "on" : ""}" type="button" role="tab" aria-selected="${t.id === window.RPT_TAB}" data-rptab="${t.id}">${tx(t.label)}</button>`).join("")}</div>`;

// ---------- tab 1: the three steps side by side ----------
function rptRows() {
  const g = (r, k) => { const x = amtSteps(r).find(y => y[0] === k); return x && x[2] != null ? x[2] : null; };
  return dsList().map(r => ({ r, ask: Number(r.amount) || 0, bill: g(r, "bill"), act: g(r, "act") }));
}
function rptCompare() {
  const rows = rptRows(), S_ = (x, g) => x.reduce((s, y) => s + (Number(g(y)) || 0), 0), pc = (v, base) => (base ? `${fmt((v / base) * 100, 1)}%` : "–");
  const wb = rows.filter(x => x.bill != null), wa = rows.filter(x => x.act != null), A = S_(rows, x => x.ask), B = S_(wb, x => x.bill), C = S_(wa, x => x.act), aB = S_(wb, x => x.ask), aC = S_(wa, x => x.ask);
  const step = (n, title, amt, sub, pct, cls) => `<div class="kpi"><span class="l">${n} ${title}</span><span class="v">${amt}<small> ${L("ลบ.", "M")}</small></span><span class="d sub">${sub}</span>${pct == null ? "" : `<div class="bar" style="margin-top:6px"><i style="width:${Math.min(100, pct)}%" class="${cls}"></i></div>`}</div>`;
  const units = [...new Set(rows.map(x => x.r.unit))].map(u => { const g = rows.filter(x => x.r.unit === u), got = g.filter(x => (x.act != null ? x.act : x.bill) != null); return { u, n: g.length, ask: S_(g, x => x.ask), bill: S_(g, x => x.bill), act: S_(g, x => x.act), got: S_(got, x => (x.act != null ? x.act : x.bill)), gotAsk: S_(got, x => x.ask) }; }).sort((x, y) => y.ask - x.ask);
  const cell = v => (v == null ? '<span class="sub">–</span>' : fmt(v));
  const head = rows.length ? (wa.length ? `${L("ขอ", "Asked")} ${mb(A)} ${L("ลบ.", "M")} · ${L("ได้ พ.ร.บ.", "Act")} ${mb(C)} ${L("ลบ. คิดเป็น", "M, which is")} ${pc(C, aC)} ${L("ของยอดที่ขอในคำขอที่มียอด พ.ร.บ.", "of what was asked in the requests that have an act amount")}` : wb.length ? `${L("ขอ", "Asked")} ${mb(A)} ${L("ลบ.", "M")} · ${L("ร่าง พ.ร.บ.", "Draft bill")} ${mb(B)} ${L("ลบ. ยังไม่มียอด พ.ร.บ.", "M, no act amount yet")}` : `${L("ขอ", "Asked")} ${mb(A)} ${L("ลบ. ยังไม่มียอดร่าง พ.ร.บ. และ พ.ร.บ. (บันทึกได้ที่แท็บปรับปรุงเงินงบประมาณ)", "M; no draft bill or act amount yet (record them in the tab Update the budget amounts)")}`) : L("ยังไม่มีคำขอ", "No request yet");
  return `<section class="panel"><div class="body"><b style="font-weight:600;font-size:16px">${L("สรุป", "In short")}</b><p style="margin:4px 0 0">${head}</p></div></section>
  <section class="kpis" id="rp-kpis" style="grid-template-columns:repeat(3,minmax(0,1fr))">
    ${step("①", L("คำขอ", "Request"), mb(A), `${rows.length} ${L("คำขอ", "requests")}`, null)}
    ${step("②", L("ร่าง พ.ร.บ.", "Draft bill"), mb(B), `${wb.length}/${rows.length} ${L("คำขอมียอด", "requests have an amount")}${aB ? ` · ${pc(B, aB)} ${L("ของที่ขอ", "of asked")}` : ""}`, aB ? (B / aB) * 100 : 0, "c1")}
    ${step("③", L("พ.ร.บ. (ยอดที่ได้รับ)", "Act (amount received)"), mb(C), `${wa.length}/${rows.length} ${L("คำขอมียอด", "requests have an amount")}${aC ? ` · ${pc(C, aC)} ${L("ของที่ขอ", "of asked")}` : ""}`, aC ? (C / aC) * 100 : 0, "c2")}</section>
  <section class="panel" id="rp-units"><header><h2>${L("เปรียบเทียบรายสำนัก/กอง (ล้านบาท)", "By unit (M baht)")}</h2></header><div class="tbl-wrap"><table><thead><tr><th>${L("สำนัก/กอง", "Unit")}</th><th class="n">${L("คำขอ", "Requests")}</th><th class="n">① ${L("ยอดที่ขอ", "Asked")}</th><th class="n">② ${L("ร่าง พ.ร.บ.", "Draft bill")}</th><th class="n">③ ${L("พ.ร.บ.", "Act")}</th><th style="min-width:180px">${L("ได้รับเทียบที่ขอ", "Received against asked")}</th></tr></thead>
    <tbody>${units.map(x => { const p = x.gotAsk ? (x.got / x.gotAsk) * 100 : null; return `<tr data-rpunit="${esc(x.u)}"><td>${esc(unitName(x.u))}</td><td class="n">${x.n}</td><td class="n">${mb(x.ask)}</td><td class="n">${x.bill ? mb(x.bill) : '<span class="sub">–</span>'}</td><td class="n">${x.act ? mb(x.act) : '<span class="sub">–</span>'}</td><td>${p == null ? `<span class="sub">${L("ยังไม่มียอด", "No amount yet")}</span>` : `<div class="row" style="gap:8px;flex-wrap:nowrap"><div class="bar" style="flex:1"><i style="width:${Math.min(100, p)}%"></i></div><b style="font-weight:600">${fmt(p, 0)}%</b></div>`}</td></tr>`; }).join("") || `<tr><td colspan="6" class="sub">${L("ยังไม่มีคำขอ", "No request yet")}</td></tr>`}</tbody>
    <tfoot><tr><td>${L("รวม", "Total")}</td><td class="n">${rows.length}</td><td class="n">${mb(A)}</td><td class="n">${mb(B)}</td><td class="n">${mb(C)}</td><td></td></tr></tfoot></table></div></section>
  <section class="panel"><header><h2>${L("รายคำขอ (บาท)", "By request (baht)")}</h2></header><div class="tbl-wrap"><table id="rp-tbl"><thead><tr><th>${L("คำขอ", "Request")}</th><th>${L("สำนัก/กอง", "Unit")}</th><th class="n">① ${L("คำขอ", "Request")}</th><th class="n">② ${L("ร่าง พ.ร.บ.", "Draft bill")}</th><th class="n">③ ${L("พ.ร.บ.", "Act")}</th><th class="n">${L("ได้รับต่างจากที่ขอ", "Received against asked")}</th></tr></thead>
    <tbody>${rows.map(x => { const last = x.act != null ? x.act : x.bill; return `<tr data-rprow="${x.r.id}"><td><span class="mono sub">${x.r.id}</span> ${esc(nmStr(x.r.name))}</td><td class="sub">${esc(unitName(x.r.unit))}</td><td class="n">${fmt(x.ask)}</td><td class="n">${cell(x.bill)}</td><td class="n">${cell(x.act)}</td><td class="n">${last == null ? '<span class="sub">–</span>' : `<span style="color:var(--${last < x.ask ? "bad" : "ink-2"})">${last - x.ask >= 0 ? "+" : ""}${fmt(last - x.ask)}</span>`}</td></tr>`; }).join("") || `<tr><td colspan="6" class="sub">${L("ไม่มีคำขอ", "No requests")}</td></tr>`}</tbody>
    <tfoot><tr><td colspan="2">${L("รวม", "Total")}</td><td class="n">${fmt(A)}</td><td class="n">${fmt(B)}</td><td class="n">${fmt(C)}</td><td></td></tr></tfoot></table></div>
    <div class="body sub">${L("ยอดร่าง พ.ร.บ. และ พ.ร.บ. มาจากขั้นตอนรัฐสภาหรือที่กองแผนงานปรับปรุงในแท็บปรับปรุงเงินงบประมาณ · – คือยังไม่มียอด · นับคำขอที่ยังไม่ถูกตีตก", "The draft bill and act amounts come from the parliament steps or from Planning's update in the tab Update the budget amounts · – means no amount yet · requests not rejected are counted")}</div></section>`;
}
{
  const oldB = BIND["bq-rpt"];
  VIEWS["bq-rpt"] = () => {
    if (!RPT_TABS.some(t => t.id === window.RPT_TAB)) window.RPT_TAB = "rpsum";
    if (window.RPT_TAB === "rpupd") return `${eHead(DS_APP, "BQ10", ["รายงานงบประมาณประจำปี", "Annual budget report"], ["ปรับปรุงยอดร่าง พ.ร.บ. และ พ.ร.บ. ของแต่ละรายการคำขอ ยอดที่ปรับปรุงแสดงในแดชบอร์ดของแท็บรายงานสรุปงบประมาณ", "Update the draft bill and act amounts of each request; the dashboard of the summary tab shows them"])}${rptBar()}${SUB.sbls()}`;
    return `${eHead(DS_APP, "BQ10", ["รายงานงบประมาณประจำปี", "Annual budget report"], ["เปรียบเทียบงบประมาณปีงบประมาณที่กำลังจัดทำ ตั้งแต่ยอดที่ขอ ร่าง พ.ร.บ. ถึง พ.ร.บ.", "The budget of the year being prepared at three steps: the request, the draft bill and the act"])}${rptBar()}${rptCompare()}`;
  };
  BIND["bq-rpt"] = () => { oldB(); $$("[data-rptab]").forEach(b => (b.onclick = () => { window.RPT_TAB = b.dataset.rptab; route(); })); subAmtBind(); };
}

// ---------- the Bureau status tab (was "pre-send checks") ----------
const SBS = { prep: [["เตรียมส่ง", "Preparing"], "p-mute"], sent: [["ส่ง สงป. แล้ว", "Sent to the Bureau"], "p-info"], recv: [["สงป. รับเรื่องแล้ว", "Received by the Bureau"], "p-info"], review: [["สงป. กำลังพิจารณา", "Under review"], "p-info"], info: [["สงป. ขอข้อมูลเพิ่ม", "More information requested"], "p-warn"], agreed: [["เห็นชอบตามที่ขอ", "Agreed as asked"], "p-ok"], cut: [["เห็นชอบบางส่วน (ปรับลด)", "Agreed in part (cut)"], "p-warn"], rejected: [["ไม่เห็นชอบ", "Not agreed"], "p-bad"] };
const subBst = r => ((S.submission.bst = S.submission.bst || {})[r.id] || {});
const subBstKey = r => (subBst(r).st && SBS[subBst(r).st] ? subBst(r).st : "prep");
const subBstTag = r => tag(tx(SBS[subBstKey(r)][0]), SBS[subBstKey(r)][1]);
// Planning records the status and its details; "" when it worked, else the reason (the page and the tests share the rules)
function subSetBst(r, f, raw) {
  if (ROLE !== "plan") return L("เฉพาะกองแผนงานปรับปรุงสถานะได้", "Only Planning can update the status");
  if (!r || !pkg().includes(r)) return L("คำขอนี้ไม่อยู่ในชุดที่ส่ง สงป.", "This request is not in the package sent to the Bureau");
  const B = (S.submission.bst = S.submission.bst || {}), m = (B[r.id] = B[r.id] || {}), v = raw == null ? "" : String(raw).trim();
  const tidy = () => { if (!Object.keys(m).some(k => k !== "t" && k !== "by")) delete B[r.id]; };
  let msg = "";
  if (f === "st") { if (v === "prep" || v === "") delete m.st; else if (SBS[v]) m.st = v; else msg = L("สถานะไม่ถูกต้อง", "The status is not valid"); }
  else if (f === "sent" || f === "ans") { if (v === "") delete m[f]; else if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || isNaN(Date.parse(v))) msg = L("วันที่ไม่ถูกต้อง", "The date is not valid"); else if (v > String(TODAY).slice(0, 10)) msg = L("ใส่วันที่ในอนาคตไม่ได้", "A date in the future is not allowed"); else if (f === "ans" && m.sent && v < m.sent) msg = L("วันที่แจ้งผลต้องไม่ก่อนวันที่ส่ง", "The answer date can't be before the date sent"); else if (f === "sent" && m.ans && v > m.ans) msg = L("วันที่ส่งต้องไม่หลังวันที่แจ้งผล", "The date sent can't be after the answer date"); else m[f] = v; }
  else if (f === "doc" || f === "note") { if (v === "") delete m[f]; else m[f] = v.slice(0, f === "doc" ? 60 : 300); }
  else if (f === "res") { if (v === "") delete S.submission.results[r.id]; else { const n = Number(v); if (!isFinite(n) || n < 0) msg = L("ยอดเงินไม่ถูกต้อง", "The amount is not valid"); else S.submission.results[r.id] = Math.round(n); } }
  else return "";
  if (msg) { tidy(); return msg; }
  if (f === "res") { if (!Object.keys(m).length) delete B[r.id]; } else { m.t = nowIso(); m.by = me().id; tidy(); }
  audit([`กองแผนงานปรับปรุงสถานะ สงป. (${{ st: "สถานะ", sent: "วันที่ส่ง", ans: "วันที่แจ้งผล", doc: "เลขที่หนังสือ", note: "หมายเหตุ", res: "ผลพิจารณา" }[f]})`, `Planning updated the Bureau status (${f})`], `${r.id} · ${v || "–"}`);
  return "";
}
SUB_TABS.find(t => t.id === "checks").label = ["ปรับปรุงสถานะ สงป.", "Update the Bureau status"];
SUB.sbst = () => {
  const P = pkg().filter(r => sbMine().includes(r)), ed = ROLE === "plan", cnt = k => P.filter(r => subBstKey(r) === k).length;
  const inp = (r, f, type, extra) => `<input type="${type}" data-bsf="${r.id}|${f}" value="${esc(f === "res" ? (S.submission.results[r.id] == null ? "" : S.submission.results[r.id]) : subBst(r)[f] || "")}" aria-label="${f} ${r.id}" ${extra || ""}>`;
  const txt = (r, f) => { const v = f === "res" ? S.submission.results[r.id] : subBst(r)[f]; return v == null || v === "" ? '<span class="sub">–</span>' : f === "res" ? fmt(v) : /^\d{4}-\d{2}-\d{2}$/.test(v) ? fdate(v) : esc(v); };
  const cell = (r, f, type, extra) => (ed ? inp(r, f, type, extra) : txt(r, f));
  return `<section class="panel" id="sb-bst"><header><h2>${L("ปรับปรุงสถานะรายการคำขอที่ส่ง สงป.", "Update the status of the requests sent to the Bureau")}</h2><span class="sp"></span>${tag(`${P.length} ${L("รายการ", "requests")}`, P.length ? "p-ok" : "p-mute")}</header>
    <div class="body"><div class="row" id="sb-bst-sum" style="gap:8px;flex-wrap:wrap">${Object.keys(SBS).map(k => `${tag(`${tx(SBS[k][0])} ${cnt(k)}`, cnt(k) ? SBS[k][1] : "p-mute")}`).join("")}</div>
    <p class="sub" style="margin:8px 0 0">${ed ? L("กองแผนงานบันทึกสถานะที่ สงป. แจ้ง พร้อมวันที่ส่ง เลขที่หนังสือ ผลพิจารณา (บาท) วันที่แจ้งผล และหมายเหตุ ผลพิจารณาที่กรอกไปแสดงในแผงยอดของคำขอเป็น \"ผลพิจารณาของ สงป.\" (ล้างช่องเพื่อลบ)", "Planning records the status the Bureau gave, with the date sent, the letter number, the result (baht), the answer date and a note. The result shows in the amounts panel of the request as the Bureau result (clear the cell to remove it)") : L("ดูอย่างเดียว กองแผนงานเป็นผู้ปรับปรุงสถานะ", "Read only; Planning updates the status")}</p></div>
    <div class="tbl-wrap"><table><thead><tr><th>${L("คำขอ", "Request")}</th><th>${L("สำนัก/กอง", "Unit")}</th><th class="n">${L("ยอดที่ส่ง (บาท)", "Sent (baht)")}</th><th>${L("สถานะที่ สงป.", "Status at the Bureau")}</th><th>${L("วันที่ส่ง", "Date sent")}</th><th>${L("เลขที่หนังสือ", "Letter no.")}</th><th class="n">${L("ผลพิจารณา สงป. (บาท)", "Bureau result (baht)")}</th><th>${L("วันที่แจ้งผล", "Answer date")}</th><th>${L("หมายเหตุ", "Note")}</th><th>${L("ผลตรวจก่อนส่ง", "Pre-send checks")}</th></tr></thead>
      <tbody>${P.map(r => { const c = subChecks(r), no = c.filter(x => x.s === "no").length, wa = c.filter(x => x.s === "wa").length, m = subBst(r);
        return `<tr data-bsrow="${r.id}"><td><a href="#" data-req="${r.id}" class="mono">${r.id}</a><div>${esc(nmStr(r.name))}</div>${m.t ? `<div class="sub">${L("ปรับปรุงล่าสุด", "Updated")} ${fdate(m.t, true)}</div>` : ""}</td><td class="sub">${esc(unitName(r.unit))}</td><td class="n">${fmt(subAmt(r))}</td>
        <td>${ed ? `<select data-bsf="${r.id}|st" aria-label="${L("สถานะที่ สงป.", "Status")} ${r.id}">${Object.keys(SBS).map(k => `<option value="${k}" ${subBstKey(r) === k ? "selected" : ""}>${esc(tx(SBS[k][0]))}</option>`).join("")}</select>` : subBstTag(r)}</td>
        <td>${cell(r, "sent", "date", `max="${String(TODAY).slice(0, 10)}"`)}</td><td>${cell(r, "doc", "text", 'maxlength="60" style="max-width:150px"')}</td><td class="n">${cell(r, "res", "number", 'min="0" step="1000" style="max-width:140px;text-align:right"')}</td><td>${cell(r, "ans", "date", `max="${String(TODAY).slice(0, 10)}"`)}</td><td>${cell(r, "note", "text", 'maxlength="300" style="max-width:200px"')}</td>
        <td>${no ? tag(`${L("ต้องแก้", "Fix")} ${no}`, "p-bad") : wa ? tag(`${L("ควรดู", "Look")} ${wa}`, "p-warn") : tag(L("ผ่าน", "Pass"), "p-ok")}</td></tr>`; }).join("") || `<tr><td colspan="10" class="sub">${L("ยังไม่มีคำขอที่ส่ง สงป.", "No request in the package yet")}</td></tr>`}</tbody></table></div></section>`;
};
{
  const ck = SUB.checks;
  SUB.checks = () => `${SUB.sbst()}<details id="sb-chk" class="panel"><summary class="body" style="cursor:pointer"><b style="font-weight:600">${L("ผลตรวจก่อนส่งโดยละเอียด", "Pre-send checks in detail")}</b> <span class="sub">${L("ตรวจว่าแต่ละคำขอพร้อมส่งหรือไม่", "what is not ready to send")}</span></summary>${ck()}</details>`;
  const bb = BIND.submission;
  BIND.submission = () => {
    bb();
    $$("[data-bsf]").forEach(el => (el.onchange = () => { const [id, f] = el.dataset.bsf.split("|"), m = subSetBst(S.requests.find(x => x.id === id), f, el.value); if (m) { toast(m); route(); return; } commit(); route(); toast(L("ปรับปรุงสถานะแล้ว", "Status updated")); }));
  };
}
