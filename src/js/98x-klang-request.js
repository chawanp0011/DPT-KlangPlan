// Fisko-KlangFinance, changes to the main budget request (M02 request list and the main tab of the request form), asked for
// by the user on 3 Nov 2569 with three screenshots of the Budget Bureau's e-budgeting screens:
// 1. A programme / output-or-project / activity choice that is separate from the budget lines ("รายการ"). The structure
//    already existed (programme > output > activity); the form only offered one activity list. The list now shows the
//    output/project in its own column.
// 2. More detail on the request, following the screenshots: request status (single-year or multi-year), expenditure type
//    and main/sub expenditure category, recurrent or investment, account type 1/2/3, item tag, kind of money
//    (entitlement, obligation, multi-year commitment, baseline), co-funding, and where the need comes from.
// 3. A funding stage after the internal approval so the amount the Budget Bureau approved is updated on the request, and the
//    request is then taken into the allocation (M06). The approved amount is written to the same store the old
//    submission and allocation pages read (S.submission.results), so there is one source of truth.
// What I know and what I do not: the codes 03 (investment) and 700 (land and construction) come from the screenshots; the
// lists of expenditure categories, need sources and tags are NOT the Budget Bureau's code tables (I have not seen them),
// so category codes are typed in, and the need-source list is a sample of mine. The "land and construction from 10 million
// baht" tag follows the screenshot; the rule that triggers it (an investment line whose name looks like construction, 10
// million baht or more) is my reading of it. The screens' "plan of spending" and "operating status" steps already exist in
// this form (quarterly plan and readiness tabs), so they are not repeated. Nothing is sent to the Budget Bureau.
const RQ_NEED = [["policy", ["นโยบายรัฐบาล", "Government policy"]], ["national", ["แผนระดับชาติ / แผนแม่บท", "National plan"]], ["agency", ["แผนปฏิบัติราชการของกรม", "Agency action plan"]], ["area", ["ข้อเสนอจากพื้นที่ / ประชาชน", "Proposal from the area or citizens"]], ["urgent", ["ความจำเป็นเร่งด่วน", "Urgent need"]], ["duty", ["ข้อตกลง / พันธกรณี", "Agreement or obligation"]], ["other", ["อื่น ๆ", "Other"]]];
const RQ_MONEY = [["ent", ["ค่าใช้จ่ายตามสิทธิ (Entitlement)", "Entitlement"]], ["obl", ["ค่าใช้จ่ายตามข้อผูกพัน (Obligation)", "Obligation"]], ["multi", ["รายจ่ายผูกพัน", "Multi-year commitment"]], ["base", ["ค่าใช้จ่ายตามพื้นฐาน (Baseline)", "Baseline"]]];
const RQ_BASE = [["mission", ["ค่าใช้จ่ายตามภารกิจหน่วยรับงบประมาณ", "Cost of the agency's mission"]], ["maint", ["รายจ่ายรักษางานเดิม", "Upkeep of existing work"]]];
const RQ_BIG = 10e6; // the "land and construction from 10 million baht" tag in the screenshot
const rqNodes = (lvl, parent) => (S.structure[FORM_FY] || []).filter(n => n.lvl === lvl && (!parent || n.parent === parent));
const rqNodeName = n => (n ? `${n.code} ${tx(n.name)}${n.lvl === "output" ? ` (${outTypeName(n)})` : ""}` : "–");
function rqCls(r) {
  if (!r.cls) r.cls = { prog: "", proj: "", c1code: "", c1name: "", c2code: "", c2name: "", nature: "", acct: [false, false, false, false], tag: "", money: [], base: [], co: { on: false, amt: 0, src: "" }, offs: [], need: "" };
  { const k = r.cls; while (k.acct.length < 4) k.acct.push(false); if (!k.offs) k.offs = k.co && k.co.on && k.co.amt ? [{ type: "", amt: k.co.amt, note: k.co.src || "" }] : []; } // account 4 and the off-budget lines (file 98zd) on older data
  const lin = lineage(r.act); if (lin.length) { const p = lin.find(n => n.lvl === "program"), o = lin.find(n => n.lvl === "output"); if (p) r.cls.prog = p.id; if (o) r.cls.proj = o.id; }
  return r.cls;
}
const rqProjNode = r => (S.structure[FORM_FY] || []).find(n => n.id === rqCls(r).proj);
const rqNature = r => rqCls(r).nature || (r.items.some(i => i.type === "inv") ? "inv" : "ope");
const rqAutoTags = r => { const big = sumv(r.items.filter(i => i.type === "inv" && BUILD_RE.test(tx(i.name))).map(itemTotal)); return big >= RQ_BIG ? [L("ที่ดิน/สิ่งก่อสร้างตั้งแต่ 10 ล้านบาท", "Land or construction from 10 million baht")] : []; };
const rqDominant = r => { const by = {}; r.items.forEach(it => (by[it.type] = (by[it.type] || 0) + itemTotal(it))); return Object.keys(by).sort((a, b) => by[b] - by[a])[0] || "ope"; };

// ---------- funding stage after approval ----------
const RQ_FUND = { wait: [["รอส่งสำนักงบประมาณ", "To send to the Budget Bureau"], "p-mute"], sent: [["ส่งสำนักงบประมาณแล้ว รอผล", "Sent, awaiting the result"], "p-info"], granted: [["ได้รับอนุมัติงบแล้ว รอจัดสรร", "Approved by the Bureau, to allocate"], "p-ok"], allocated: [["นำไปจัดสรรแล้ว", "Taken into the allocation"], "p-ok"] };
const rqAllocLine = r => ((S.allocs && S.allocs[FORM_FY]) || { lines: [] }).lines.find(l => l.req === r.id);
function rqFund(r) {
  if (r.status !== "approved") return null;
  return rqAllocLine(r) ? "allocated" : actAmount(r) != null ? "granted" : r.sub ? "sent" : "wait";
}
function rqSetApproved(r, v) {
  const sb = S.submission, amt = Number(v.amt), A = S.allocs && S.allocs[FORM_FY];
  if (!(amt >= 0)) return L("ใส่ยอดที่ได้รับอนุมัติ", "Enter the approved amount");
  if (amt > r.amount) return L("ยอดที่ได้รับอนุมัติเกินยอดที่ขอ", "The approved amount is above the amount requested");
  if (v.date && v.date > TODAY) return L("วันที่ต้องไม่เกินวันนี้", "Date can't be in the future");
  const line = rqAllocLine(r); if (line && A && A.fromAct && !A.draft) return L("จัดสรรตาม พ.ร.บ. แล้ว แก้ที่หน้าจัดสรร", "Already allocated under the act; change it on the allocation page");
  const old = sb.results[r.id]; sb.results[r.id] = amt; r.fund = { amt, date: v.date || TODAY, ref: v.ref || "", note: v.note || "", by: me().id, t: nowIso() };
  if (line && A) { line.amount = amt; line.plan = planFromQ(r, amt); A.total = sumv(A.lines.map(l => l.amount)); BUDGET_TYPES.forEach(t => (A.byType[t.id] = sumv(A.lines.filter(l => l.type === t.id).map(l => l.amount)))); }
  audit(["บันทึกยอดที่ได้รับอนุมัติ", "Recorded the approved amount"], `${r.id} ${old != null ? fmt(old) + " → " : ""}${fmt(amt)}`);
  return "";
}
function rqToAlloc(r) {
  const amt = actAmount(r); if (amt == null) return L("ยังไม่มียอดที่ได้รับอนุมัติ", "No approved amount yet");
  if (rqAllocLine(r)) return L("นำไปจัดสรรแล้ว", "Already in the allocation");
  const P = S.parl, done = P && P.stage >= PARL_STEPS.length; let A = S.allocs[FORM_FY];
  if (A && A.fromAct && !A.draft) return L("จัดสรรตาม พ.ร.บ. แล้ว เพิ่มรายการที่หน้าจัดสรร", "Already allocated under the act; add lines on the allocation page");
  if (!A) A = S.allocs[FORM_FY] = { fy: FORM_FY, draft: true, fromAct: false, act: [`ร่างการจัดสรรปี ${FORM_FY} จากผลพิจารณาของสำนักงบประมาณ`, `FY${FORM_FY} draft allocation from the Budget Bureau result`], date: TODAY, total: 0, byType: {}, lines: [], transfers: [], releases: [] };
  A.lines.push({ id: "N" + (Math.max(0, ...A.lines.map(l => Number(String(l.id).replace(/\D/g, "")) || 0)) + 1), req: r.id, unit: r.unit, name: r.name, type: rqDominant(r), amount: amt, act: r.act, plan: planFromQ(r, amt) });
  A.total = sumv(A.lines.map(l => l.amount)); BUDGET_TYPES.forEach(t => (A.byType[t.id] = sumv(A.lines.filter(l => l.type === t.id).map(l => l.amount))));
  r.inAct = !!done; audit(["นำรายการคำขอไปจัดสรร", "Took a request into the allocation"], `${r.id} ${fmt(amt)}`);
  return "";
}

// ---------- panels ----------
function rqPanel(r, ed) {
  const c = rqCls(r), ds = ed ? "" : "disabled", progs = rqNodes("program"), outs = c.prog ? rqNodes("output", c.prog) : [], acts = c.proj ? rqNodes("activity", c.proj) : [];
  const opt = (list, cur, f) => list.map(n => `<option value="${n.id}" ${n.id === cur ? "selected" : ""}>${esc(f(n))}</option>`).join("");
  const nat = rqNature(r), tags = rqAutoTags(r), chk = (id, on, label) => `<label class="field-inline" for="${id}"><input type="checkbox" id="${id}" ${on ? "checked" : ""} ${ds}> ${label}</label>`;
  return `<section class="panel" id="rq-info"><header><h2>${L("ข้อมูลโครงการและการจัดประเภทคำขอ", "Project and classification of the request")}</h2><span class="sp"></span><span class="sub">${L("ตามหน้าจอคำของบของสำนักงบประมาณ", "after the Budget Bureau's request screen")}</span></header><div class="body form-grid">
    ${rqKindRow(r, ed)}
    <div class="f"><label for="rq-prog">${L("แผนงาน", "Programme")}</label><select id="rq-prog" ${ds}><option value="">${L("— เลือกแผนงาน —", "— Choose a programme —")}</option>${opt(progs, c.prog, rqNodeName)}</select></div>
    <div class="f"><label for="rq-proj">${L("ผลผลิต/โครงการ", "Output or project")}</label><select id="rq-proj" ${ds || !c.prog ? "disabled" : ""}><option value="">${L("— เลือกผลผลิต/โครงการ —", "— Choose an output or project —")}</option>${opt(outs, c.proj, rqNodeName)}</select></div>
    <div class="f"><label for="rq-act">${L("กิจกรรม", "Activity")}</label><select id="rq-act" ${ds || !c.proj ? "disabled" : ""}><option value="">${L("— เลือกกิจกรรม —", "— Choose an activity —")}</option>${opt(acts, r.act, rqNodeName)}</select></div>
    <div class="f"><label>${L("ประเภทงบรายจ่าย (จากรายการงบประมาณ)", "Expenditure type (from the budget lines)")}</label><div class="row"><b>${esc(String(BUDGET_TYPES.find(t => t.id === rqDominant(r)).code).padStart(2, "0"))} : ${esc(typeName(rqDominant(r)))}</b></div></div>
    ${rqCatFields(c, ds, r)}
    <div class="f"><label for="rq-nature">${L("ประจำ/ลงทุน", "Recurrent or investment")}</label><select id="rq-nature" ${ds}><option value="" ${!c.nature ? "selected" : ""}>${L("ตามรายการงบประมาณ", "From the budget lines")} (${nat === "inv" ? L("ลงทุน", "investment") : L("ประจำ", "recurrent")})</option><option value="inv" ${c.nature === "inv" ? "selected" : ""}>${L("ลงทุน", "Investment")}</option><option value="ope" ${c.nature === "ope" ? "selected" : ""}>${L("ประจำ", "Recurrent")}</option></select></div>
    <div class="f"><label>${L("ประเภทบัญชี (1 ถึง 4)", "Account type (1 to 4)")}</label><div class="row">${[0, 1, 2, 3].map(i => chk("rq-acct" + i, c.acct[i], `${L("บัญชีที่", "Account")} ${i + 1}`)).join("")}</div></div>
    <div class="f full"><label>${L("เงินงบประมาณ — ประเภทเงิน (ตั้งที่ BQ2)", "Budget money — kind (set on BQ2)")}</label><div class="row" style="flex-wrap:wrap">${rqMoneyTypes("bud").map(t => chk("rq-m-" + t.id, c.money.includes(t.id), esc(tx(t.name)))).join("")}</div>
      ${c.money.includes("base") ? `<div class="row" style="margin-left:22px;flex-wrap:wrap">${RQ_BASE.map(([k, l]) => chk("rq-b-" + k, c.base.includes(k), esc(tx(l)))).join("")}</div>` : ""}
      ${c.money.includes("multi") && !r.multi ? `<span class="hint">${L("เลือกรายจ่ายผูกพัน แต่คำขอนี้ยังเป็นรายการปีเดียว", "Multi-year commitment is ticked but the request is single-year")}</span>` : ""}</div>
    <div class="f full"><label>${L("ติด Tag รายการ", "Item tags")}</label><div class="row">${tags.map(t => tag(esc(t), "p-info")).join("") || `<span class="sub">${L("ไม่มี tag อัตโนมัติ", "No automatic tag")}</span>`}<input type="text" id="rq-tag" value="${esc(c.tag)}" placeholder="${L("tag เพิ่มเติม (พิมพ์เอง)", "Extra tag (typed)")}" ${ds} style="max-width:260px"></div>
      <span class="hint">${L("tag อัตโนมัติ: รายการงบลงทุนที่ชื่อเป็นงานก่อสร้าง รวมตั้งแต่ 10 ล้านบาท (ตามภาพ ตัวเงื่อนไขเป็นการตีความของผม)", "Automatic tag: construction-like investment lines from 10 million baht (the threshold is from the screenshot; the condition is my reading of it)")}</span></div>
    ${rqOffPanel(r, c, ed)}
    <div class="f"><label for="rq-need">${L("แหล่งที่มาของความต้องการ", "Where the need comes from")}</label><select id="rq-need" ${ds}><option value="">${L("— เลือก —", "— Choose —")}</option>${RQ_NEED.map(([k, l]) => `<option value="${k}" ${c.need === k ? "selected" : ""}>${esc(tx(l))}</option>`).join("")}</select><span class="hint">${L("รายการให้เลือกเป็นตัวอย่างของผม ไม่ใช่ตารางรหัสของสำนักงบประมาณ", "A sample list of mine, not the Budget Bureau's code table")}</span></div>
  </div></section>`;
}
function rqFundPanel(r) {
  const st = rqFund(r); if (!st) return "";
  const act = actAmount(r), line = rqAllocLine(r), A = S.allocs && S.allocs[FORM_FY], f = r.fund || {}, can = ROLE === "plan" || canAlloc(), steps = [["approved", L("ผู้บริหารเห็นชอบภายใน", "Approved internally"), true], ["sent", L("ส่งสำนักงบประมาณ", "Sent to the Budget Bureau"), !!r.sub], ["granted", L("ได้รับอนุมัติงบ", "Approved by the Bureau"), act != null], ["allocated", L("นำไปจัดสรร", "Allocated"), !!line]];
  return `<section class="panel" id="rq-fund"><header><h2>${L("ผลการพิจารณางบและการจัดสรร", "Budget result and allocation")}</h2><span class="sp"></span>${tag(tx(RQ_FUND[st][0]), RQ_FUND[st][1])}</header><div class="body">
    <ol style="list-style:none;margin:0 0 10px;padding:0;display:flex;gap:10px;flex-wrap:wrap">${steps.map(([k, l, d]) => `<li>${dotI(d ? "ok" : "muted")}${esc(l)}</li>`).join("")}</ol>
    ${kv([[L("ยอดที่ขอ", "Requested"), baht(r.amount)], [L("ยอดที่เห็นชอบภายใน / ส่ง สงป.", "Agreed internally / sent"), baht(subAmt(r))], [L("ยอดที่ได้รับอนุมัติ", "Approved by the Bureau"), act != null ? `<b>${baht(act)}</b> (${act - subAmt(r) >= 0 ? "+" : ""}${fmt(act - subAmt(r))})` : L("ยังไม่ได้รับ", "not received yet")], f.ref && [L("เลขที่หนังสือ/อ้างอิง", "Reference"), `${esc(f.ref)}${f.date ? " · " + fdate(f.date) : ""}`], line && [L("บรรทัดจัดสรร", "Allocation line"), `${esc(line.id)} · ${baht(line.amount)} · ${A && A.draft ? L("ร่างการจัดสรร", "draft allocation") : L("ตาม พ.ร.บ.", "under the act")}`]])}
    ${can && !(line && A && A.fromAct && !A.draft) ? `<div class="row" style="margin-top:8px;flex-wrap:wrap"><input type="number" min="0" id="rf-amt" value="${act != null ? act : ""}" placeholder="${L("ยอดที่ได้รับอนุมัติ (บาท)", "Approved amount (baht)")}" style="max-width:220px"><input type="date" id="rf-date" value="${f.date || TODAY}"><input type="text" id="rf-ref" value="${esc(f.ref || "")}" placeholder="${L("เลขที่หนังสือ/อ้างอิง", "Reference")}"><button class="btn primary" type="button" id="rf-save">${L("บันทึกยอดที่ได้รับอนุมัติ", "Save the approved amount")}</button></div>` : ""}
    ${can && act != null && !line ? `<div class="row" style="margin-top:8px"><button class="btn primary" type="button" id="rf-alloc">${L("นำรายการไปจัดสรร", "Take it into the allocation")}</button><span class="sub">${L("สร้างบรรทัดในร่างการจัดสรร (M06) ด้วยยอดที่ได้รับอนุมัติ", "Adds a line to the draft allocation (M06) with the approved amount")}</span></div>` : ""}
    ${line ? `<div class="row" style="margin-top:8px"><button class="btn" type="button" onclick="go('allocation')">${L("เปิดหน้าจัดสรร", "Open the allocation")}</button></div>` : ""}
    <p class="sub">${L("บันทึกยอดตรงนี้ไปที่ที่เดียวกับหน้าส่งสำนักงบประมาณ (M05) และหน้าจัดสรร (M06) ไม่ได้ส่งหรือรับข้อมูลจากสำนักงบประมาณจริง", "The amount goes to the same place the submission (M05) and allocation (M06) pages read; nothing is sent to or received from the real Budget Bureau")} · ${L("ผู้บันทึกยอด: แผน (plan) และการเงิน (fin, finhead) เป็นข้อสมมุติ", "who may record it: planning and finance: an assumption")}</p></div></section>`;
}
{
  const base = VIEWS.request;
  VIEWS.request = () => {
    let html = base(); const r = curReq(); if (!r || REQ_TAB !== "main") return html;
    const marker = `<section class="panel"><header><h2>${L("รายการงบประมาณ", "Budget lines")}</h2>`, at = html.indexOf(marker);
    return at >= 0 ? html.slice(0, at) + rqFundPanel(r) + rqPanel(r, editable(r)) + html.slice(at) : html;
  };
  const bb = BIND.request;
  BIND.request = () => {
    bb(); const r = curReq(); if (!r || REQ_TAB !== "main") return;
    const c = rqCls(r), on = (id, fn, ev = "change") => { const el = $(id); if (el) el.addEventListener(ev, fn); }, re = () => { save(); route(); };
    on("#rq-prog", e => { c.prog = e.target.value; c.proj = ""; r.act = ""; re(); }); on("#rq-proj", e => { c.proj = e.target.value; r.act = ""; re(); }); on("#rq-act", e => { r.act = e.target.value; re(); });
    on("#rq-nature", e => { c.nature = e.target.value; re(); }); on("#rq-tag", e => { c.tag = e.target.value; save(); }, "input"); on("#rq-need", e => { c.need = e.target.value; re(); });
    [0, 1, 2, 3].forEach(i => on("#rq-acct" + i, e => { c.acct[i] = e.target.checked; re(); }));
    rqMoneyTypes("bud").forEach(({ id: k }) => on("#rq-m-" + k, e => { c.money = e.target.checked ? [...new Set([...c.money, k])] : c.money.filter(x => x !== k); if (k === "base" && !e.target.checked) c.base = []; re(); }));
    RQ_BASE.forEach(([k]) => on("#rq-b-" + k, e => { c.base = e.target.checked ? [...new Set([...c.base, k])] : c.base.filter(x => x !== k); save(); }));
    rqBindOff(r, c, re); // off-budget lines and the category selects (file 98zd)
    const sv = $("#rf-save"); if (sv) sv.onclick = () => { const m = rqSetApproved(r, { amt: $("#rf-amt").value, date: $("#rf-date").value, ref: $("#rf-ref").value }); if (m) { toast(m); return; } commit(); route(); toast(L("บันทึกยอดที่ได้รับอนุมัติแล้ว", "Approved amount saved")); };
    const al = $("#rf-alloc"); if (al) al.onclick = () => { const m = rqToAlloc(r); if (m) { toast(m); return; } commit(); route(); toast(L("นำไปจัดสรรแล้ว", "Taken into the allocation")); };
  };
}
{ // completeness check: warn (never block) when the classification is thin
  const base = checks;
  checks = r => {
    const out = base(r), c = rqCls(r), miss = [];
    if (!c.proj) miss.push(L("ผลผลิต/โครงการ", "output or project")); if (!c.acct.some(Boolean)) miss.push(L("ประเภทบัญชี", "account type")); if (!c.need) miss.push(L("แหล่งที่มาของความต้องการ", "source of the need")); if (!c.c1code) miss.push(L("หมวดรายจ่ายหลัก", "main category"));
    out.push({ s: miss.length ? "wa" : "ok", title: L("ข้อมูลตามแบบคำของบ", "Request classification"), d: miss.length ? `${L("ยังไม่ระบุ", "Not given")}: ${miss.join(", ")}` : L("ครบ", "Complete"), id: null });
    return out;
  };
}

// ---------- list: output/project in its own column, funding stage ----------
const RQ_HEAD = () => `<thead><tr><th>${L("เลขที่", "No.")}</th><th>${L("ผลผลิต/โครงการ", "Output or project")}</th><th>${L("รายการ", "Item")}</th><th>${L("หน่วยงาน", "Unit")}</th><th class="n">${L("วงเงินที่ขอ (บาท)", "Requested (baht)")}</th><th class="n">${L("เทียบปีก่อน", "vs last year")}</th><th>${L("สถานะ", "Status")}</th><th>${L("สถานะงบ / จัดสรร", "Funding / allocation")}</th><th>${L("ปรับปรุงล่าสุด", "Updated")}</th></tr></thead>`;
{
  const base = VIEWS.requests;
  VIEWS.requests = () => {
    if (rqYear() !== FORM_FY) return rqYearBar() + rqYearView(rqYear());
    let html = rqYearBar() + base(); const tb = html.indexOf('<tbody id="req-body"'), th = tb >= 0 ? html.lastIndexOf("<thead>", tb) : -1; // only the thead right before the request table
    if (th >= 0) html = html.slice(0, th) + RQ_HEAD() + html.slice(tb);
    return html.replace(/<select id="flt">[\s\S]*?<\/select>/, m => m + ` <select id="flt2" aria-label="${L("สถานะงบ", "Funding stage")}"><option value="">${L("ทุกสถานะงบ", "Any funding stage")}</option>${Object.keys(RQ_FUND).map(k => `<option value="${k}">${esc(tx(RQ_FUND[k][0]))}</option>`).join("")}</select>`);
  };
}
// ---------- fiscal-year selector at the top of the request page ----------
// The prototype keeps requests only for the year being prepared (FORM_FY). For any other year this page shows what the
// prototype does hold for it: the allocation lines of that year (read only) with their output/project and the year's status.
let RQ_FY = null;
const rqYear = () => { const y = SEL_FY || RQ_FY; return y && (S.fyList || []).some(x => x.fy === y) ? y : FORM_FY; }; // the top-bar year (98w) first
function rqYearBar() {
  const yrs = (S.fyList || []).slice().sort((a, b) => b.fy - a.fy), cur = rqYear();
  return `<div class="row" style="margin-bottom:10px"><label for="rq-fy"><b style="font-weight:600">${L("ปีงบประมาณ", "Fiscal year")}</b></label><select id="rq-fy" aria-label="${L("เลือกปีงบประมาณ", "Choose the fiscal year")}">${yrs.map(y => `<option value="${y.fy}" ${y.fy === cur ? "selected" : ""}>${y.fy} · ${esc(tx(FY_STATUS[y.status] ? FY_STATUS[y.status][0] : [y.status, y.status]))}${y.fy === FORM_FY ? " · " + L("ปีที่กำลังจัดทำคำขอ", "being prepared") : ""}</option>`).join("")}</select>
    ${cur !== FORM_FY ? `<span class="sub">${L("ปีนี้ไม่ใช่ปีที่จัดทำคำขอ แสดงเฉพาะข้อมูลที่ต้นแบบเก็บไว้ (อ่านอย่างเดียว)", "Not the year being prepared: only what the prototype holds is shown (read only)")}</span>` : ""}</div>`;
}
function rqYearView(fy) {
  const y = (S.fyList || []).find(x => x.fy === fy) || {}, A = S.allocs && S.allocs[fy], st = S.structure[fy] || [], node = id => st.find(n => n.id === id), lin = id => { const o = []; let n = node(id); while (n) { o.unshift(n); n = node(n.parent); } return o; };
  const lines = A ? A.lines : [], unitOk = l => !unitRole() || l.unit === me().unit, L2 = lines.filter(unitOk), tot = sumv(L2.map(l => l.amount));
  return `<div class="head"><div><div class="eyebrow">M02 · Budget Preparation</div><h1>${L(`งบประมาณ ปี ${fy}`, `FY${fy} budget`)}</h1><p>${y.start ? `${fdate(y.start)} - ${fdate(y.end)} · ` : ""}${y.status && FY_STATUS[y.status] ? tag(tx(FY_STATUS[y.status][0]), FY_STATUS[y.status][1]) : ""}</p></div></div>
    <section class="kpis" style="grid-template-columns:repeat(3,minmax(0,1fr))"><div class="kpi"><span class="l">${L("บรรทัดจัดสรร", "Allocation lines")}</span><span class="v">${L2.length}</span></div><div class="kpi"><span class="l">${L("วงเงินรวม", "Total")}</span><span class="v">${mb(tot)}<small>${L("ล้านบาท", "M baht")}</small></span></div><div class="kpi"><span class="l">${L("เอกสารสถานะ", "Allocation")}</span><span class="v" style="font-size:16px">${A ? (A.draft ? L("ร่าง", "Draft") : A.fromAct ? L("ตาม พ.ร.บ.", "Under the act") : L("บันทึกแล้ว", "Saved")) : "–"}</span></div></section>
    <section class="panel"><header><h2>${L("รายการงบประมาณที่จัดสรร", "Allocated items")}</h2><span class="sp"></span><span class="sub">${A ? esc(tx(A.act)) : ""}</span></header>${L2.length ? `<div class="tbl-wrap"><table><thead><tr><th>${L("เลขที่", "No.")}</th><th>${L("ผลผลิต/โครงการ", "Output or project")}</th><th>${L("รายการ", "Item")}</th><th>${L("หน่วยงาน", "Unit")}</th><th>${L("งบรายจ่าย", "Type")}</th><th class="n">${L("วงเงิน (บาท)", "Amount (baht)")}</th></tr></thead><tbody>${L2.map(l => { const o = lin(l.act).find(n => n.lvl === "output"); return `<tr><td class="mono">${esc(l.id)}${l.req ? `<div class="sub">${esc(l.req)}</div>` : ""}</td><td>${o ? `<span class="mono sub">${esc(o.code)}</span> ${esc(tx(o.name))}` : `<span class="sub">–</span>`}</td><td>${esc(tx(l.name))}</td><td class="sub">${esc(unitName(l.unit))}</td><td>${esc(typeName(l.type))}</td><td class="n">${fmt(l.amount)}</td></tr>`; }).join("")}</tbody></table></div>` : `<div class="body sub">${L("ต้นแบบไม่มีข้อมูลการจัดสรรของปีนี้", "The prototype holds no allocation data for this year")}</div>`}</section>
    <p class="sub">${L("ต้นแบบเก็บคำของบ (รายการคำขอ) ไว้เฉพาะปีที่กำลังจัดทำ ปีอื่นจึงแสดงรายการที่จัดสรรแล้ว ไม่มีคำขอเดิมของปีนั้น", "The prototype keeps the requests themselves only for the year being prepared, so other years show the allocated lines, not the original requests")}</p>`;
}
let RQ_F2 = "";
reqRows = f => {
  const list = (unitRole() ? S.requests.filter(r => r.unit === me().unit) : S.requests).filter(r => (!f || r.status === f) && (!RQ_F2 || rqFund(r) === RQ_F2)), lim = (rule("BR-04") || {}).param || 20;
  return list.map(r => {
    const d = r.prev ? (r.amount / r.prev - 1) * 100 : null, dt = d === null ? tag(L("โครงการใหม่", "New"), "p-info") : `<span style="color:${d > lim ? "var(--warn)" : "var(--ink-2)"}">${d >= 0 ? "+" : ""}${fmt(d, 1)}%</span>`, pj = rqProjNode(r), fs = rqFund(r), act = actAmount(r);
    return `<tr class="click" tabindex="0" data-id="${r.id}"><td class="mono">${r.id}${r.id === S.story ? " ★" : ""}</td><td>${pj ? `<span class="mono sub">${esc(pj.code)}</span> ${esc(tx(pj.name))}` : `<span class="sub">–</span>`}</td><td>${esc(tx(r.name))}${r.cont ? ` ${tag(L("ผูกพันต่อเนื่อง", "Continuing"), "p-warn")}` : r.multi ? ` ${tag(L("ผูกพัน", "Multi-year"), "p-info")}` : ""}</td><td class="sub">${unitName(r.unit)}</td><td class="n">${fmt(r.amount)}</td><td class="n">${dt}</td><td>${pill(r.status)}</td>
      <td>${fs ? tag(tx(RQ_FUND[fs][0]), RQ_FUND[fs][1]) + (act != null ? `<div class="sub">${mb(act)} ${L("ลบ.", "M")}</div>` : "") : `<span class="sub">–</span>`}</td><td class="sub">${fdate(r.updated)}</td></tr>`;
  }).join("") || `<tr><td colspan="9" class="sub">${L("ไม่มีคำขอในสถานะนี้", "No requests with this status")}</td></tr>`;
};
{
  const bb = BIND.requests;
  BIND.requests = () => {
    const fy = $("#rq-fy"); if (fy) fy.onchange = e => setFy(Number(e.target.value));
    if (rqYear() !== FORM_FY) return;
    RQ_F2 = ""; bb(); const f2 = $("#flt2"), body = $("#req-body");
    if (f2) f2.onchange = e => { RQ_F2 = e.target.value; body.innerHTML = reqRows($("#flt").value); };
    const f1 = $("#flt"); if (f1) f1.onchange = e => (body.innerHTML = reqRows(e.target.value));
    body.innerHTML = reqRows("");
  };
}
