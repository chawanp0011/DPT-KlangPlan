// KlangFinance, budget round B1 (14 Nov 2569): requests of the divisions and the consolidation done by Planning.
// Asked for (pasted spec):
//  - "Requests" becomes "Division requests": a division sees only its own requests (it already did; the page is renamed).
//  - "Consolidation at agency level" becomes "Agency requests consolidation" (รวมคำขอหน่วยงาน): every item the divisions sent in, checked by Planning:
//    the grand total, the correctness of each request with AI help (simulated here), a duplicate check, and a hand-on to the review once the item is
//    correct. Cut: priority ranking, ceiling and unit answers, by programme, 3-year and zero-based analysis, the 4-year forward estimate.
//  - Added: non-budget funds of the units (a tab; the data is the revenue estimate of file 98zt).
//  - In a division request: the forward expenditure estimate (MTEF), a tab "ประมาณการรายจ่ายล่วงหน้า (MTEF)" with the three years after the budget year.
// What the MTEF is here: the Budget Bureau's medium-term expenditure framework asks each request for its expenditure in the budget year and the
// following years. The prototype holds three forward years (budget year +1 to +3) per request, in baht, with a note. The Bureau's own form could not be
// looked up while this was written (web search was unavailable), so the layout is an assumption to confirm.

// ---------- names ----------
{
  const nm = (id, th, en) => { const n = NAV.find(x => x.id === id); if (n) n.label = [th, en]; const p = typeof bPage === "function" ? bPage(id) : null; if (p) { p.label = [th, en]; p.h1 = [th, en]; } };
  nm("requests", "คำขอสำนัก/กอง", "Division requests"); nm("consolidation", "รวมคำขอหน่วยงาน", "Agency requests consolidation");
  const vr = VIEWS.requests; VIEWS.requests = () => vr().replace(/<h1>[^<]*<\/h1>/, `<h1>${L("คำขอสำนัก/กอง", "Division requests")}</h1>`);
}
// the ceiling and the answers of the units are cut: no panel on the request page, no task on the home page
{ const br = route; route = function () { const r = br.apply(this, arguments); if (typeof fyRouteId === "function" && fyRouteId() === "requests") { const c = document.querySelector("#ceil-panel"); if (c) c.remove(); } return r; }; }

// ---------- MTEF in the division request ----------
const mtefYears = () => [FORM_FY + 1, FORM_FY + 2, FORM_FY + 3];
const mtefOf = r => r.mtef || null;
const mtefTotal = r => (mtefOf(r) ? mtefYears().reduce((t, y) => t + Number(mtefOf(r)[y] || 0), 0) : 0);
{
  const base = reqTabsBar;
  reqTabsBar = function (r) { const want = REQ_TAB, html = base(r); if (want === "mtef") REQ_TAB = "mtef"; return html.replace(/(<button[^>]*data-rtab="versions"[^>]*>)/, `<button type="button" role="tab" aria-selected="${REQ_TAB === "mtef"}" class="rstep x ${REQ_TAB === "mtef" ? "on" : ""} ${mtefOf(r) ? "s-ok" : "s-warn"}" data-rtab="mtef"><span>${L("ประมาณการรายจ่ายล่วงหน้า (MTEF)", "Forward expenditure estimate (MTEF)")}${mtefOf(r) ? "" : " ⚠"}</span></button>$1`); };
}
REQ_PANELS.mtef = (r, ed) => {
  const m = mtefOf(r) || {}, ds = ed ? "" : "disabled", ys = mtefYears(), tot = mtefTotal(r);
  return `<section class="panel"><header><h2>${L("ประมาณการรายจ่ายล่วงหน้าระยะปานกลาง (MTEF)", "Medium-term expenditure framework (MTEF)")}</h2><span class="sp"></span>${mtefOf(r) ? tag(L("กรอกแล้ว", "Filled in"), "p-ok") : tag(L("ยังไม่กรอก", "Not filled in"), "p-warn")}</header>
    <div class="body sub">${L(`ประมาณการรายจ่ายของคำขอนี้ในอีก 3 ปีถัดจากปีงบประมาณ ${FORM_FY} (บาท) ใช้ประกอบการพิจารณากรอบรายจ่ายระยะปานกลางของสำนักงบประมาณ ค่าตั้งต้นคิดจากยอดปีนี้ ปรับได้`, `The expenditure of this request in the 3 years after FY${FORM_FY} (baht), for the Budget Bureau's medium-term framework. The starting values come from this year's amount; change them as needed.`)}</div>
    <div class="tbl-wrap"><table><thead><tr><th>${L("ปีงบประมาณ", "Fiscal year")}</th><th class="n">${L("ประมาณการ (บาท)", "Estimate (baht)")}</th><th class="n">${L("เทียบปีนี้", "vs this year")}</th></tr></thead><tbody>
      <tr><td><b>${FORM_FY}</b> <span class="sub">${L("ปีที่ขอ", "this request")}</span></td><td class="n">${fmt(r.amount)}</td><td class="n">—</td></tr>
      ${ys.map(y => `<tr><td>${y}</td><td class="n"><input type="number" min="0" step="1000" data-mtef="${y}" value="${m[y] != null ? m[y] : ""}" ${ds} aria-label="${y}" style="max-width:170px"></td><td class="n">${m[y] != null && r.amount ? (Number(m[y]) / r.amount * 100 - 100 >= 0 ? "+" : "") + fmt(Number(m[y]) / r.amount * 100 - 100, 1) + "%" : "—"}</td></tr>`).join("")}</tbody>
      <tfoot><tr><td>${L("รวมล่วงหน้า 3 ปี", "Forward 3 years")}</td><td class="n">${fmt(tot)}</td><td></td></tr></tfoot></table></div>
    <div class="body form-grid"><div class="f full"><label for="mtef-note">${L("หมายเหตุ / ข้อสมมุติ", "Note / assumptions")}</label><input type="text" id="mtef-note" value="${esc(m.note || "")}" ${ds}></div>
      ${ed ? `<div class="f full row"><button class="btn" type="button" id="mtef-fill">${L("ใส่ค่าตั้งต้นจากยอดปีนี้", "Fill from this year's amount")}</button><button class="btn primary" type="button" id="mtef-save">${L("บันทึก", "Save")}</button></div>` : ""}</div></section>`;
};
REQ_BIND.mtef = r => {
  const fill = $("#mtef-fill"); if (fill) fill.onclick = () => { mtefYears().forEach((y, i) => { const inp = document.querySelector(`[data-mtef="${y}"]`); if (inp) inp.value = String(Math.round(r.amount * (1 + 0.03 * (i + 1)) / 1000) * 1000); }); };
  const sv = $("#mtef-save"); if (sv) sv.onclick = () => {
    const out = { note: ($("#mtef-note").value || "").trim() };
    for (const y of mtefYears()) { const v = document.querySelector(`[data-mtef="${y}"]`).value; if (v === "" || !(Number(v) >= 0)) { toast(L(`ใส่ประมาณการปี ${y} (ศูนย์ขึ้นไป)`, `Enter the FY${y} estimate (zero or more)`)); return; } out[y] = Number(v); }
    r.mtef = out; audit(["บันทึกประมาณการรายจ่ายล่วงหน้า (MTEF)", "Saved the forward expenditure estimate (MTEF)"], r.id); commit(); route(); toast(L("บันทึกประมาณการล่วงหน้าแล้ว", "Forward estimate saved"));
  };
};
Object.keys(SEEDS).forEach(k => { const prev = SEEDS[k].seed; SEEDS[k].seed = () => { const s = prev(); (s.requests || []).forEach(r => { if (!r.mtef && r.amount) { const o = { note: "ค่าตัวอย่าง คิดจากยอดปีนี้" }; [1, 2, 3].forEach(i => { const y = FORM_FY + i; o[y] = r.multi && r.years && r.years[y] != null ? Number(r.years[y]) : Math.round(r.amount * (1 + 0.03 * i) / 1000) * 1000; }); r.mtef = o; } }); return s; }; });

// ---------- the consolidation page ----------
let CN_UNIT = "", CN_ST = "", CN_OPEN = null;
const CN_SENT = r => r.status !== "draft";
const cnRows = () => S.requests.filter(r => CN_SENT(r) && (!CN_UNIT || r.unit === CN_UNIT) && (!CN_ST || (CN_ST === "unchecked" ? !(r.cnCheck) : CN_ST === "ok" ? !!(r.cnCheck && r.cnCheck.ok) : CN_ST === "bad" ? !!(r.cnCheck && !r.cnCheck.ok) : r.status === CN_ST)));
const cnDupOf = r => S.dupes.filter(d => !d.done && ((tx(d.desc) || "").includes(r.id) || d.reqA === r.id || d.reqB === r.id));
// The correctness check Planning asks AI to do. Simulated here: fixed rules on the request's own data, not a language model.
function cnCheck(r) {
  const lim = (typeof rule === "function" && (rule("BR-04") || {}).param) || 20, sum = reqAmount(r), dup = cnDupOf(r), d = r.prev ? (r.amount / r.prev - 1) * 100 : null;
  const c = (ok, th, en, block) => ({ ok: !!ok, label: L(th, en), block: block !== false });
  return [c(tx(r.name) && ((r.reason || "").trim() || (r.aiText && tx(r.aiText))), "มีชื่อรายการและเหตุผลความจำเป็น", "Has a name and a justification"),
    c(r.items && r.items.length && Math.abs(sum - r.amount) <= 1, "มีรายการงบรายจ่ายและยอดรายการรวมเท่ายอดคำขอ", "Has budget lines and they add up to the amount asked"),
    c(r.act, "ผูกกับผลผลิต/กิจกรรมในโครงสร้างงบประมาณ", "Linked to an output or activity in the budget structure"),
    c(r.kpi && tx(r.kpi), "มีตัวชี้วัดและเป้าหมาย", "Has an indicator and a target"),
    c(mtefOf(r), "มีประมาณการรายจ่ายล่วงหน้า (MTEF)", "Has the forward estimate (MTEF)"),
    c(!dup.length, dup.length ? `ไม่ซ้ำกับรายการอื่น (พบรายการที่อาจซ้ำ ${dup.length})` : "ไม่ซ้ำกับรายการอื่น", dup.length ? `Not a duplicate (${dup.length} possible duplicate)` : "Not a duplicate"),
    c(d === null || d <= lim, `ยอดเพิ่มจากปีก่อนไม่เกิน ${lim}%`, `Increase over last year within ${lim}%`, false)];
}
function cnRun(r) { const ck = cnCheck(r); r.cnCheck = { ok: ck.filter(x => x.block).every(x => x.ok), fails: ck.filter(x => !x.ok).map(x => x.label), by: me().id, t: nowIso(), ai: true }; audit(["กองแผนงานตรวจคำขอด้วย AI", "Planning checked a request with AI"], `${r.id} ${r.cnCheck.ok ? "ok" : r.cnCheck.fails.length}`); }
// hand on to the review (the same step as "pass" in the review page: from Planning to the committee, or to the executive)
function cnForward(r) {
  if (r.status !== "plan" || !(r.cnCheck && r.cnCheck.ok)) return false;
  const next = (typeof rvNext === "function" ? rvNext(r) : null) || (typeof needsCommittee === "function" && needsCommittee(r) ? "committee" : "exec"); r.status = next; r.updated = TODAY;
  audit(["กองแผนงานนำส่งคำขอกลั่นกรอง", "Planning sent a request on to the review"], `${r.id} → ${next}`);
  notify(next === "approved" ? ["plan", "div"] : ["exec"], [`คำขอ ${r.id} ผ่านการตรวจของกองแผนงาน รอพิจารณา`, `Request ${r.id} passed Planning's check and waits for review`], "review"); return true;
}
const cnCan = () => ROLE === "plan";
function cnTabs() { const t = [["overview", L("ภาพรวมคำขอ", "Overview of the requests")], ["list", L("รายการคำขอ", "Request list")], ["nonbudget", L("เงินนอกงบประมาณ", "Non-budget money")]]; return `<div class="tabs" role="tablist">${t.map(([id, l]) => `<button class="tab ${id === CN_TAB ? "on" : ""}" type="button" role="tab" aria-selected="${id === CN_TAB}" data-cntab="${id}">${l}</button>`).join("")}</div>`; }
const cnView = () => {
  const all = S.requests.filter(CN_SENT), rows = cnRows(), M = L("ล้านบาท", "M baht"), tot = sumv(all.map(r => r.amount)) / 1e6, shown = sumv(rows.map(r => r.amount)) / 1e6;
  const ok = all.filter(r => r.cnCheck && r.cnCheck.ok).length, open = S.dupes.filter(d => !d.done).length, units = [...new Set(all.map(r => r.unit))];
  const byU = units.map(u => ({ u, n: all.filter(r => r.unit === u).length, a: sumv(all.filter(r => r.unit === u).map(r => r.amount)) / 1e6 })), byT = BUDGET_TYPES.map(t => ({ t, a: sumv(all.map(r => sumv((r.items || []).filter(i => i.type === t.id).map(i => i.qty * i.price)))) / 1e6 }));
  const q = typeof qtOf === "function" ? qtOf(FORM_FY) : null;
  return `<div class="head"><div><div class="eyebrow">M03 · Budget Consolidation</div><h1>${L("รวมคำขอหน่วยงาน", "Agency requests consolidation")}</h1>
    <p>${L(`รายการคำขอทั้งหมดที่สำนัก/กองส่งเข้ามา ปี ${FORM_FY} กองแผนงานตรวจยอดรวม ความถูกต้อง (ใช้ AI ช่วย) และรายการซ้ำ แล้วนำส่งกลั่นกรองเมื่อรายการถูกต้อง`, `Every request the divisions sent in for FY${FORM_FY}. Planning checks the total, the correctness (with AI help) and duplicates, then sends correct items on to the review.`)}</p></div></div>
    ${eNote(L("กลุ่มงบประมาณ (กองแผนงาน) เป็นผู้รวบรวมคำขอระดับหน่วยงาน บทบาทอื่นดูอย่างเดียว", "The budget group (Planning Division) consolidates the requests at agency level; other roles view only"))}
    ${cnTabs()}${CN_TAB === "nonbudget" ? (typeof revNonBudgetPanel === "function" ? revNonBudgetPanel() : "") : CN_TAB === "overview" ? `
    <section class="kpis" style="grid-template-columns:repeat(4,minmax(0,1fr))">
      <div class="kpi"><span class="l">${L("รายการที่ส่งเข้ามา", "Items sent in")}</span><span class="v">${all.length}</span><span class="d sub">${units.length} ${L("สำนัก/กอง", "divisions")}</span></div>
      <div class="kpi"><span class="l">${L("ยอดรวมทั้งหมด", "Grand total")}</span><span class="v">${fmt(tot, 2)}<small>${M}</small></span>${q ? `<span class="d sub">${L("โควต้า", "Quota")} ${fmt(q.base / 1e6, 1)} · ${L("ขีดจำกัด", "ceiling")} ${fmt(qtLimit(q) / 1e6, 1)}</span>` : ""}</div>
      <div class="kpi"><span class="l">${L("ตรวจแล้วถูกต้อง", "Checked and correct")}</span><span class="v">${ok} / ${all.length}</span></div>
      <div class="kpi"><span class="l">${L("รายการที่อาจซ้ำ", "Possible duplicates")}</span><span class="v">${open}</span></div></section>
    <div class="grid2"><section class="panel"><header><h2>${L("รวมตามสำนัก/กอง", "By division")}</h2></header><div class="tbl-wrap"><table><thead><tr><th>${L("สำนัก/กอง", "Division")}</th><th class="n">${L("รายการ", "Items")}</th><th class="n">${L("ล้านบาท", "M baht")}</th></tr></thead><tbody>${byU.map(x => `<tr><td>${unitName(x.u)}</td><td class="n">${x.n}</td><td class="n">${fmt(x.a, 2)}</td></tr>`).join("")}</tbody><tfoot><tr><td>${L("รวม", "Total")}</td><td class="n">${all.length}</td><td class="n">${fmt(tot, 2)}</td></tr></tfoot></table></div></section>
      <section class="panel"><header><h2>${L("รวมตามงบรายจ่าย", "By budget type")}</h2></header><div class="tbl-wrap"><table><thead><tr><th>${L("งบรายจ่าย", "Budget type")}</th><th class="n">${L("ล้านบาท", "M baht")}</th></tr></thead><tbody>${byT.map(x => `<tr><td>${tx(x.t.name)}</td><td class="n">${fmt(x.a, 2)}</td></tr>`).join("")}</tbody></table></div></section></div>
` : `
    <section class="panel"><header><h2>${L("รายการคำขอที่ส่งเข้ามา", "Requests sent in")}</h2><span class="sp"></span>
      <label class="field-inline">${L("สำนัก/กอง", "Division")} <select id="cn-unit"><option value="">${L("ทั้งหมด", "All")}</option>${units.map(u => `<option value="${u}" ${u === CN_UNIT ? "selected" : ""}>${esc(unitName(u))}</option>`).join("")}</select></label>
      <label class="field-inline">${L("สถานะ", "Status")} <select id="cn-st"><option value="">${L("ทั้งหมด", "All")}</option>${[["unchecked", L("ยังไม่ตรวจ", "Not checked")], ["ok", L("ตรวจแล้วถูกต้อง", "Correct")], ["bad", L("ตรวจแล้วต้องแก้", "Needs fixing")], ["plan", L("รอกองแผนพิจารณา", "Waiting for Planning")]].map(([k, l]) => `<option value="${k}" ${k === CN_ST ? "selected" : ""}>${l}</option>`).join("")}</select></label>
      ${cnCan() ? `<button class="btn" type="button" id="cn-runall">${L("ตรวจด้วย AI ทั้งหมดที่แสดง", "Check all shown with AI")}</button><button class="btn primary" type="button" id="cn-sendall">${L("นำส่งกลั่นกรองทั้งหมดที่ถูกต้อง", "Send all correct ones to the review")}</button>` : ""}</header>
      <div class="body sub">${L("แสดง", "Showing")} ${rows.length} ${L("รายการ รวม", "items, total")} ${fmt(shown, 2)} ${M}${cnCan() ? "" : " · " + L("กองแผนงานเป็นผู้ตรวจและนำส่ง", "Planning checks and sends")}</div>
      <div class="tbl-wrap"><table><thead><tr><th>${L("เลขที่", "No.")}</th><th>${L("รายการ", "Item")}</th><th>${L("สำนัก/กอง", "Division")}</th><th class="n">${L("วงเงิน (ลบ.)", "Amount (M)")}</th><th>${L("สถานะ", "Status")}</th><th>${L("ผลตรวจ", "Check")}</th><th></th></tr></thead><tbody>${rows.map(r => { const ck = r.cnCheck, dup = cnDupOf(r).length;
        return `<tr><td class="mono">${r.id}</td><td><b style="font-weight:600">${esc(tx(r.name))}</b>${dup ? ` ${tag(L("อาจซ้ำ", "Possible duplicate"), "p-warn")}` : ""}${mtefOf(r) ? "" : ` ${tag(L("ไม่มี MTEF", "No MTEF"), "p-mute")}`}</td><td class="sub">${unitName(r.unit)}</td><td class="n">${mb(r.amount)}</td><td>${pill(r.status)}</td>
          <td>${ck ? (ck.ok ? tag(L("ถูกต้อง", "Correct"), "p-ok") : tag(L("ต้องแก้", "Needs fixing"), "p-bad")) : `<span class="sub">${L("ยังไม่ตรวจ", "Not checked")}</span>`}${ck && !ck.ok ? `<div class="sub">${ck.fails.map(esc).join("<br>")}</div>` : ""}</td>
          <td><div class="row" style="flex-wrap:nowrap"><button class="btn" type="button" data-cnopen="${r.id}">${L("ดู", "View")}</button>${cnCan() && r.status === "plan" ? `<button class="btn" type="button" data-cnrun="${r.id}">${L("ตรวจด้วย AI", "Check with AI")}</button>${ck && ck.ok ? `<button class="btn primary" type="button" data-cnsend="${r.id}">${L("นำส่งกลั่นกรอง", "Send to the review")}</button>` : ""}` : ""}</div></td></tr>
          ${CN_OPEN === r.id ? `<tr><td colspan="7"><ul style="list-style:none;margin:0;padding:0">${cnCheck(r).map(x => `<li>${x.ok ? "✓" : '<span style="color:var(--bad)">✗</span>'} ${esc(x.label)}${x.block ? "" : ` <span class="sub">(${L("ข้อสังเกต ไม่บล็อก", "advisory")})</span>`}</li>`).join("")}</ul><div class="sub">${L("ผลตรวจจำลองโดยกฎคงที่ ไม่ได้ใช้โมเดลภาษาจริง", "Simulated with fixed rules, not a real language model")}</div></td></tr>` : ""}`; }).join("") || `<tr><td colspan="7" class="sub">${L("ไม่มีรายการ", "No items")}</td></tr>`}</tbody></table></div></section>
    ${crudList("csDup", { head: `<h2>${L("รายการที่อาจซ้ำซ้อน", "Possible duplicates")}</h2><span class="sp"></span>${tag(L("AI ตรวจพบ · กองแผนงานยืนยันหรือทำเครื่องหมายเอง", "Found by AI · Planning confirms or marks its own"), "p-info")}`, empty: L("ไม่มีรายการซ้ำ", "No duplicates") })}`}`;
};
const cnBind = () => {
  $$("[data-cntab]").forEach(b => (b.onclick = () => { CN_TAB = b.dataset.cntab; route(); }));
  if (CN_TAB === "nonbudget") { if (typeof revNonBudgetBind === "function") revNonBudgetBind(); return; }
  const u = $("#cn-unit"); if (u) u.onchange = () => { CN_UNIT = u.value; route(); };
  const s = $("#cn-st"); if (s) s.onchange = () => { CN_ST = s.value; route(); };
  $$("[data-cnopen]").forEach(b => (b.onclick = () => { REQ_BACK = "consolidation"; openReq(b.dataset.cnopen); })); // "View" opens the whole request; its back button returns here
  $$("[data-cnrun]").forEach(b => (b.onclick = () => { if (!cnCan()) return; const r = S.requests.find(x => x.id === b.dataset.cnrun); cnRun(r); CN_OPEN = r.id; commit(); route(); toast(r.cnCheck.ok ? L("ตรวจแล้ว: ถูกต้อง", "Checked: correct") : L("ตรวจแล้ว: ต้องแก้", "Checked: needs fixing")); }));
  $$("[data-cnsend]").forEach(b => (b.onclick = () => { if (!cnCan()) return; const r = S.requests.find(x => x.id === b.dataset.cnsend); if (cnForward(r)) { commit(); renderShell(); route(); toast(L("นำส่งกลั่นกรองแล้ว", "Sent to the review")); } }));
  const ra = $("#cn-runall"); if (ra) ra.onclick = () => { if (!cnCan()) return; const rs = cnRows().filter(r => r.status === "plan"); rs.forEach(cnRun); commit(); route(); toast(L(`ตรวจ ${rs.length} รายการแล้ว`, `${rs.length} items checked`)); };
  const sa = $("#cn-sendall"); if (sa) sa.onclick = () => { if (!cnCan()) return; const rs = cnRows().filter(r => r.status === "plan" && r.cnCheck && r.cnCheck.ok); let n = 0; rs.forEach(r => { if (cnForward(r)) n++; }); commit(); renderShell(); route(); toast(n ? L(`นำส่งกลั่นกรอง ${n} รายการ`, `${n} items sent to the review`) : L("ไม่มีรายการที่ตรวจแล้วถูกต้อง", "No correct items to send")); };
};

// the budget page table (file 75) wraps each page: draw the tab bar from the page's own tabs and bind it
VIEWS.consolidation = () => bRender(bPage("consolidation"), cnView);
BIND.consolidation = () => { cnBind(); const on = bPage(BUD_ON) || bPage("consolidation"), mod = BUD_MOD[on.mod]; $$("[data-btab]").forEach(b => (b.onclick = () => { const t = bTabs(on).find(x => x.id === b.dataset.btab), sub = BUD_SUB[`${on.id}:${t.id}`]; mod.set(sub && t.keys.includes(sub) ? sub : t.keys[0]); route(); })); };
