// KlangFinance, round P18 (16 Nov 2569): the budget request dashboard (BQ9) made clean, with only what each right needs.
// Before: every right saw the same page, fourteen tables. Now the page has four profiles (the figures and the sums are still those of file 98zl):
//   - a division (unit) user: its own requests: what to do (drafts and returned), the stage of the requests, the kind of expenditure, the quarterly plan;
//   - Planning: what waits for it (to review, unchecked, possible duplicates, hearing answers), the quota, by division, by stage, by budget type;
//   - an executive: what waits for a decision, the quota, by division, by stage, by budget type, the link to the strategy, commitments by year;
//   - every other right (finance, audit, procurement...): the totals, by stage, by division, by budget type, read only.
// Everything else (the other sums, for Planning and executives) sits in one folded block "More detail". The filter has the requests counted for every right and the
// division only for the rights above a unit. The summary report (BQ10) is unchanged.
const DS_PROFILE = {
  unit: { main: ["status", "nature", "quarter"], more: ["kind", "btype", "years"] },
  plan: { main: ["unit", "status", "btype"], more: ["nature", "kind", "prog", "otype", "strat", "area", "money", "quarter", "month", "years"] },
  exec: { main: ["unit", "status", "btype"], more: ["strat", "years", "nature", "kind", "prog", "area"] },
  read: { main: ["status", "unit", "btype"], more: [] },
};
const dsProfile = () => (typeof unitRole === "function" && unitRole() ? "unit" : ROLE === "plan" ? "plan" : ROLE === "exec" ? "exec" : "read");
function dsCounts(list) {
  const by = s => list.filter(r => r.status === s), amt = l => sumv(l.map(dsAmt));
  return { todo: list.filter(r => ["draft", "returned"].includes(r.status)), plan: by("plan"), exec: list.filter(r => ["committee", "exec"].includes(r.status)), inReview: list.filter(r => ["unit", "plan", "committee", "exec"].includes(r.status)), appr: by("approved"), apprAmt: amt(by("approved")), unchecked: by("plan").filter(r => !r.cnCheck), dup: (S.dupes || []).filter(d => !d.done).length, hear: (S.hearings || []).flatMap(h => h.qs || []).filter(q => q.ans && q.ok == null).length };
}
function dsHeadKpis(p, list, tot, c) {
  const M = L("ล้านบาท", "M baht");
  if (p === "unit") return eKpis([[L("คำขอของหน่วยงาน", "Requests of your unit"), tot.n], [`${L("วงเงินที่ขอ", "Asked")} (${M})`, mb(tot.amt)], [L("ต้องแก้หรือส่ง", "To fix or send"), c.todo.length, c.todo.length ? L("ร่างและส่งกลับแก้ไข", "drafts and returned") : "", c.todo.length > 0], [`${L("เห็นชอบแล้ว", "Approved")} (${M})`, mb(c.apprAmt), `${c.appr.length} ${L("คำขอ", "requests")}`]]);
  if (p === "plan") return eKpis([[L("คำขอที่ส่งเข้ามา", "Requests sent in"), tot.n], [`${L("วงเงินที่ขอ", "Asked")} (${M})`, mb(tot.amt)], [L("รอกองแผนงานพิจารณา", "Waiting for Planning"), c.plan.length, c.unchecked.length ? `${c.unchecked.length} ${L("ยังไม่ตรวจด้วย AI", "not checked by AI")}` : "", c.plan.length > 0], [L("รายการที่อาจซ้ำ", "Possible duplicates"), c.dup, "", c.dup > 0]]);
  if (p === "exec") return eKpis([[`${L("วงเงินที่ขอ", "Asked")} (${M})`, mb(tot.amt)], [L("รอพิจารณา (คณะกรรมการ/ผู้บริหาร)", "Waiting for a decision"), c.exec.length, c.exec.length ? `${mb(sumv(c.exec.map(dsAmt)))} ${M}` : "", c.exec.length > 0], [`${L("เห็นชอบแล้ว", "Approved")} (${M})`, mb(c.apprAmt), `${c.appr.length} ${L("คำขอ", "requests")}`], [L("คำขอผูกพัน", "Commitment requests"), tot.multi, `${mb(tot.multiAmt)} ${M}`]]);
  return eKpis([[L("คำขอ", "Requests"), tot.n], [`${L("วงเงินที่ขอ", "Asked")} (${M})`, mb(tot.amt)], [`${L("เห็นชอบแล้ว", "Approved")} (${M})`, mb(c.apprAmt)], [L("คำขอผูกพัน", "Commitment requests"), tot.multi]]);
}
// what to do now: the list for a unit, the counts with a link for Planning and executives
function dsTodo(p, c) {
  if (p === "unit") return `<section class="panel"><header><h2>${L("งานที่ต้องทำ", "To do")}</h2><span class="sp"></span>${tag(c.todo.length ? `${c.todo.length}` : L("ไม่มีงานค้าง", "Nothing waiting"), c.todo.length ? "p-warn" : "p-ok")}</header>${c.todo.length ? `<div class="tbl-wrap"><table><tbody>${c.todo.slice(0, 6).map(r => `<tr><td class="mono">${r.id}</td><td>${esc(nmStr(r.name))}</td><td>${pill(r.status)}</td><td class="n">${mb(r.amount)} ${L("ลบ.", "M")}</td><td><button class="btn" type="button" data-jump="req:${r.id}">${r.status === "returned" ? L("แก้ไข", "Fix") : L("ทำต่อ", "Continue")}</button></td></tr>`).join("")}</tbody></table></div>` : `<div class="body sub">${L("ไม่มีร่างหรือคำขอที่ส่งกลับแก้ไข", "No draft or returned request")}</div>`}</section>`;
  const rows = p === "plan" ? [[L("คำขอรอกองแผนงานพิจารณา", "Requests waiting for Planning"), c.plan.length, "consolidation"], [L("ยังไม่ตรวจด้วย AI", "Not yet checked by AI"), c.unchecked.length, "consolidation"], [L("รายการที่อาจซ้ำรอพิจารณา", "Possible duplicates to review"), c.dup, "consolidation"], [L("คำชี้แจงของหน่วยงานรอตรวจ", "Hearing answers to check"), c.hear, "review"]]
    : p === "exec" ? [[L("คำขอรอคณะกรรมการ/ผู้บริหารพิจารณา", "Requests waiting for a decision"), c.exec.length, "review"], [L("คำขออยู่ระหว่างพิจารณาทั้งหมด", "All requests in review"), c.inReview.length, "review"]] : [];
  if (!rows.length) return "";
  return `<section class="panel"><header><h2>${L("รอดำเนินการ", "Waiting")}</h2></header><div class="tbl-wrap"><table><tbody>${rows.map(([l, n, to]) => `<tr><td>${l}</td><td class="n"><b class="num" style="${n ? "color:var(--warn)" : ""}">${n}</b></td><td class="n"><button class="btn ghost" type="button" data-jump="${to}">${L("ไปที่หน้านี้", "Open")}</button></td></tr>`).join("")}</tbody></table></div></section>`;
}
function dsQuota(p, tot) {
  const q = tot.q; if (!q || !(p === "plan" || p === "exec")) return ""; const used = q.limit ? Math.min(100, Math.round((tot.amt / q.limit) * 100)) : 0;
  return `<section class="panel"><div class="body"><div class="row">${tag(q.none ? L("ยังไม่ตั้งโควต้า", "No quota") : tot.amt <= q.limit ? L("ไม่เกินขีดจำกัดโควต้า", "Within the quota ceiling") : L("เกินขีดจำกัดโควต้า", "Over the quota ceiling"), q.none || tot.amt > q.limit ? "p-warn" : "p-ok")} <span class="sub">${L("วงเงินที่ขอ", "Asked")} <b>${fmt(tot.amt)}</b> / ${L("ขีดจำกัด", "ceiling")} <b>${fmt(q.limit || 0)}</b> ${L("บาท", "baht")}${q.limit ? ` · ${used}%` : ""}</span></div><div class="bar" style="margin-top:6px"><i style="width:${used}%;background:var(--${tot.amt <= q.limit ? "ok" : "bad"})"></i></div></div></section>`;
}
function dsFiltersLite(p) {
  return `<div class="row" style="margin:0 0 12px;flex-wrap:wrap"><label for="ds-scope" class="sub">${L("คำขอที่นับ", "Counted")}</label><select id="ds-scope">${Object.keys(DS_SCOPE).map(k => `<option value="${k}" ${DS.scope === k ? "selected" : ""}>${esc(tx(DS_SCOPE[k]))}</option>`).join("")}</select>
    ${p === "unit" ? `<span class="sub">${esc(unitName(me().unit))}</span>` : `<label for="ds-unit" class="sub">${L("หน่วยงาน", "Unit")}</label><select id="ds-unit"><option value="">${L("ทุกหน่วยงาน", "All units")}</option>${[...new Set(S.requests.map(r => r.unit))].map(u => `<option value="${u}" ${DS.unit === u ? "selected" : ""}>${esc(unitName(u))}</option>`).join("")}</select>`}
    <span class="sub">${L("ปีงบประมาณ", "FY")} ${FORM_FY}</span><span class="sp"></span>${p === "unit" || p === "read" ? "" : `<button class="btn ghost" type="button" data-jump="bq-rpt">${L("รายงานสรุป (พิมพ์ได้)", "Summary report (printable)")}</button>`}</div>`;
}
const DS_DESC = { unit: ["คำขอของหน่วยงานท่าน: งานที่ต้องทำ ขั้นตอนการพิจารณา และแผนการใช้จ่าย", "Your unit's requests: what to do, the stage of review and the spending plan"], plan: ["ภาพรวมคำของบที่ส่งเข้ามา สิ่งที่รอกองแผนงาน โควต้า และยอดรวมตามหน่วยงาน ขั้นตอน และงบรายจ่าย", "The requests sent in, what waits for Planning, the quota and the sums by unit, stage and budget type"], exec: ["วงเงินที่ขอ สิ่งที่รอพิจารณา โควต้า และยอดรวมตามหน่วยงาน ขั้นตอน และงบรายจ่าย", "The amount asked, what waits for a decision, the quota and the sums by unit, stage and budget type"], read: ["สรุปคำของบ (อ่านอย่างเดียว)", "Summary of the requests (read only)"] };
VIEWS["bq-dash"] = () => {
  const p = dsProfile(), list = dsList(), tot = dsTotals(list), c = dsCounts(list), secs = dsSections(list), cfg = DS_PROFILE[p], by = id => secs.find(s => s.id === id), pick = ids => ids.map(by).filter(s => s && s.rows.length);
  const grid = a => `<div class="grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:14px">${a.map(s => dsTable(s, tot, true)).join("")}</div>`, more = pick(cfg.more);
  return `${eHead(DS_APP, "BQ9", ["แดชบอร์ดคำของบประมาณ", "Budget request dashboard"], DS_DESC[p])}
    ${dsFiltersLite(p)}${dsHeadKpis(p, list, tot, c)}${dsQuota(p, tot)}${dsTodo(p, c)}${grid(pick(cfg.main))}
    ${more.length ? `<details class="panel" id="ds-more"><summary class="body" style="cursor:pointer"><b style="font-weight:600">${L("ดูรายละเอียดเพิ่มเติม", "More detail")}</b> <span class="sub">(${more.length} ${L("หัวข้อ", "tables")})</span></summary><div class="body">${grid(more)}</div></details>` : ""}`;
};
BIND["bq-dash"] = () => { eBind(); dsBindFilters(); };
