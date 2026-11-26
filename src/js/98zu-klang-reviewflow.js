// KlangFinance, budget round B3 (14 Nov 2569): the review and approval page.
// Asked for (pasted spec):
//  - Queue ("requests waiting for review"): a filter by division and a Review button.
//  - "Amount per round" becomes "Overview of the budget requests", shown against the quota.
//  - Cut: the version comparison tab and the effect on indicators tab.
//  - The review can be passed on step by step; the steps of each year can be set: which steps there are and who must review at each.
// How the steps work: the steps of a year (S.rvFlow[fy], default: division director, Planning, committee/executive) say in what order the roles review.
// A request in review sits at a step; "approve and send on" in the review page moves it to the next step; the last step approves it. The existing
// statuses stay (unit = division director, plan = Planning, committee or exec = committee/executive) and the step is read from the status, so older
// requests carry on. Rules: at most 8 steps; the division director can only be the first step (the request starts in the division); the last step
// can't be the division director.
const RV_ROLES = { divhead: ["ผู้อำนวยการสำนัก/กอง", "Division director"], plan: ["กองแผนงาน", "Planning Division"], exec: ["คณะกรรมการ / ผู้บริหาร", "Committee / executive"] };
const rvDefaultFlow = () => [{ id: "s1", name: ["ผู้อำนวยการสำนัก/กองเห็นชอบ", "Division director approves"], role: "divhead" }, { id: "s2", name: ["กองแผนงานกลั่นกรอง", "Planning review"], role: "plan" }, { id: "s3", name: ["คณะกรรมการ / ผู้บริหารพิจารณา", "Committee or executive decision"], role: "exec" }];
const rvFlow = fy => (S.rvFlow && S.rvFlow[fy || FORM_FY]) || rvDefaultFlow();
const rvRoleOfStatus = st => (st === "unit" ? "divhead" : st === "plan" ? "plan" : st === "committee" || st === "exec" ? "exec" : null);
function rvIdx(r) {
  const f = rvFlow(), role = rvRoleOfStatus(r.status); if (!role) return -1;
  if (Number.isInteger(r.rvStep) && f[r.rvStep] && f[r.rvStep].role === role) return r.rvStep;
  return f.findIndex(s => s.role === role);
}
// whether this user may review the request now; null = not decided here (the old rule applies)
function rvCan(r) {
  const idx = rvIdx(r); if (idx < 0) return null; const role = rvFlow()[idx].role;
  return role === "divhead" ? ROLE === "divhead" && r.unit === me().unit : acting(role, role === "exec" ? "committee" : "review");
}
// the status the request gets when it passes the current step (and the step it moves to)
function rvNext(r) {
  const idx = rvIdx(r), f = rvFlow(); if (idx < 0) return null;
  if (idx >= f.length - 1) { r.rvStep = idx; return "approved"; }
  const nx = f[idx + 1]; r.rvStep = idx + 1;
  return nx.role === "plan" ? "plan" : nx.role === "exec" ? (typeof needsCommittee === "function" && needsCommittee(r) ? "committee" : "exec") : "plan";
}

// ---------- tabs ----------
{
  const base = revTabsBar;
  revTabsBar = function () {
    if (["compare", "impact"].includes(REV_TAB)) REV_TAB = "queue";
    let html = base();
    html = html.replace(/<button[^>]*data-vtab="(?:compare|impact)"[^>]*>[\s\S]*?<\/button>/g, "").replace(/(<button[^>]*data-vtab="rounds"[^>]*>)[\s\S]*?(<\/button>)/, `$1${L("ภาพรวมคำของบ", "Overview of the requests")}$2`);
    return html.replace(/<\/div>\s*$/, `<button class="tab ${REV_TAB === "flow" ? "on" : ""}" type="button" role="tab" aria-selected="${REV_TAB === "flow"}" data-vtab="flow">${L("ขั้นการพิจารณา", "Review steps")}</button></div>`);
  };
}
// ---------- the queue: filter by division, Review button ----------
let RV_UNIT = "";
REV_PANELS.queue = () => {
  const all = S.requests.filter(r => ["unit", "plan", "committee", "exec", "returned"].includes(r.status)), units = [...new Set(all.map(r => r.unit))], rows = all.filter(r => !RV_UNIT || r.unit === RV_UNIT), f = rvFlow();
  const step = r => { const i = rvIdx(r); return i >= 0 ? f[i] : null; };
  const sla = r => (S.workflow.find(w => w.role === (rvRoleOfStatus(r.status) === "divhead" ? "div" : rvRoleOfStatus(r.status))) || { sla: 0 }).sla || 0;
  return `<section class="panel"><header><h2>${L("คำขอที่อยู่ระหว่างพิจารณา", "Requests in review")}</h2><span class="sp"></span>
      <label class="field-inline">${L("สำนัก/กอง", "Division")} <select id="rv-unit"><option value="">${L("ทั้งหมด", "All")}</option>${units.map(u => `<option value="${u}" ${u === RV_UNIT ? "selected" : ""}>${esc(unitName(u))}</option>`).join("")}</select></label></header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("เลขที่", "No.")}</th><th>${L("โครงการ", "Project")}</th><th>${L("สำนัก/กอง", "Division")}</th><th class="n">${L("วงเงิน (ลบ.)", "Amount (M)")}</th><th>${L("สถานะ", "Status")}</th><th>${L("ขั้นปัจจุบัน", "Current step")}</th><th class="n">${L("ความเห็นค้าง", "Open comments")}</th><th>${L("ครบกำหนด", "Due")}</th><th></th></tr></thead>
      <tbody>${rows.map(r => { const s = step(r), due = addDays(r.updated, sla(r)), late = sla(r) && daysUntil(due) < 0, mine = canReview(r);
        return `<tr><td class="mono">${r.id}</td><td>${esc(tx(r.name))}</td><td class="sub">${unitName(r.unit)}</td><td class="n">${mb(r.amount)}</td><td>${pill(r.status)}</td><td class="sub">${s ? `${rvIdx(r) + 1}/${f.length} ${esc(tx(s.name))}` : "—"}</td>
          <td class="n">${openComments(r).length || "—"}</td><td>${sla(r) ? `<span class="due" style="color:var(--${late ? "bad" : "ink-2"})">${fdate(due)}${late ? " · " + L("เลยกำหนด", "overdue") : ""}</span>` : "—"}</td>
          <td><button class="btn ${mine ? "primary" : ""}" type="button" data-open="${r.id}">${mine ? L("พิจารณา", "Review") : L("เปิด", "Open")}</button></td></tr>`; }).join("") || `<tr><td colspan="9" class="sub">${L("ไม่มีคำขอรอพิจารณา", "Nothing waiting for review")}</td></tr>`}</tbody></table></div>
    <div class="body sub">${L("ผู้ที่ถึงขั้นของตนกดพิจารณาเพื่อใส่ความเห็น ส่งกลับ หรือเห็นชอบและส่งขั้นต่อไป ขั้นของแต่ละปีกำหนดที่แท็บ ขั้นการพิจารณา", "Whoever's step it is presses Review to comment, return, or approve and send on. The steps of each year are set in the Review steps tab.")}</div></section>`;
};
REV_BIND.queue = () => { $$("[data-open]").forEach(b => (b.onclick = () => openReq(b.dataset.open))); const u = $("#rv-unit"); if (u) u.onchange = () => { RV_UNIT = u.value; route(); }; };

// ---------- the overview, against the quota ----------
{
  const base = VIEWS.review;
  VIEWS.review = () => {
    const html = base(); if (REV_TAB !== "rounds") return html;
    const at = html.indexOf("<div class=\"tabs\""), end = html.indexOf("</div>", at) + 6, head = html.slice(0, end);
    return head.replace(/<h1>[^<]*<\/h1>/, `<h1>${L("กลั่นกรองและอนุมัติคำของบประมาณ", "Review and approve the budget requests")}</h1>`) + rvOverview();
  };
}
function rvOverview() {
  const sent = S.requests.filter(r => r.status !== "draft"), q = typeof qtOf === "function" ? qtOf(FORM_FY) : null, tot = sumv(sent.map(r => r.amount)), M = L("ล้านบาท", "M baht");
  const grp = [["unit", L("รอผู้อำนวยการสำนัก/กอง", "Waiting for the division director"), ["unit"]], ["plan", L("รอกองแผนงาน", "Waiting for Planning"), ["plan"]], ["exec", L("รอคณะกรรมการ / ผู้บริหาร", "Waiting for the committee / executive"), ["committee", "exec"]], ["ok", L("เห็นชอบแล้ว", "Approved"), ["approved"]], ["ret", L("ส่งกลับแก้ไข", "Returned"), ["returned"]], ["no", L("ไม่เห็นชอบ", "Not approved"), ["rejected"]]].map(([k, l, st]) => ({ k, l, n: sent.filter(r => st.includes(r.status)).length, a: sumv(sent.filter(r => st.includes(r.status)).map(r => r.amount)) }));
  const ok = grp.find(g => g.k === "ok").a, lim = q ? qtLimit(q) : 0, pct = lim ? Math.min(100, Math.round(tot / lim * 100)) : 0, units = [...new Set(sent.map(r => r.unit))];
  return `<section class="kpis" style="grid-template-columns:repeat(5,minmax(0,1fr))">
    <div class="kpi"><span class="l">${L("คำของบรวม (ที่ส่งแล้ว)", "Total requested (sent)")}</span><span class="v">${fmt(tot / 1e6, 1)}<small>${M}</small></span></div>
    <div class="kpi"><span class="l">${L("โควต้าตั้งต้น", "Starting quota")}</span><span class="v">${q ? fmt(q.base / 1e6, 1) : "–"}<small>${M}</small></span></div>
    <div class="kpi"><span class="l">${L("ขีดจำกัดที่ส่งได้", "Submit ceiling")}</span><span class="v">${q ? fmt(lim / 1e6, 1) : "–"}<small>${M}</small></span>${q ? `<span class="d sub">${q.pct}% ${L("ของโควต้า", "of the quota")}</span>` : ""}</div>
    <div class="kpi hl"><span class="l">${L("เห็นชอบแล้ว", "Approved")}</span><span class="v">${fmt(ok / 1e6, 1)}<small>${M}</small></span></div>
    <div class="kpi"><span class="l">${q ? (tot <= lim ? L("เหลือใต้ขีดจำกัด", "Room under the ceiling") : L("เกินขีดจำกัด", "Over the ceiling")) : L("ยังไม่ตั้งโควต้า", "No quota")}</span><span class="v" style="color:var(--${q && tot > lim ? "bad" : "ink"})">${q ? fmt(Math.abs(lim - tot) / 1e6, 1) : "–"}<small>${M}</small></span></div></section>
  ${q ? `<section class="panel"><div class="body"><div class="row">${tag(tot <= lim ? L("คำของบไม่เกินขีดจำกัด", "Requests within the ceiling") : L("คำของบเกินขีดจำกัด", "Requests over the ceiling"), tot <= lim ? "p-ok" : "p-bad")}<span class="sub">${L("เทียบกับโควต้าปี", "Against the FY")} ${FORM_FY} ${L("ที่กองแผนงานตั้งไว้ (หน้าโควต้า)", "quota set by Planning (Quota page)")}</span></div><div class="bar" style="margin-top:6px" role="img" aria-label="${pct}%"><i style="width:${pct}%;background:var(--${tot <= lim ? "ok" : "bad"})"></i></div></div></section>` : ""}
  <div class="grid2"><section class="panel"><header><h2>${L("คำขอตามสถานะการพิจารณา", "Requests by review status")}</h2></header><div class="tbl-wrap"><table><thead><tr><th>${L("สถานะ", "Status")}</th><th class="n">${L("รายการ", "Items")}</th><th class="n">${L("ล้านบาท", "M baht")}</th></tr></thead><tbody>${grp.map(g => `<tr><td>${g.l}</td><td class="n">${g.n}</td><td class="n">${fmt(g.a / 1e6, 2)}</td></tr>`).join("")}</tbody><tfoot><tr><td>${L("รวม", "Total")}</td><td class="n">${sent.length}</td><td class="n">${fmt(tot / 1e6, 2)}</td></tr></tfoot></table></div></section>
    <section class="panel"><header><h2>${L("ตามสำนัก/กอง", "By division")}</h2></header><div class="tbl-wrap"><table><thead><tr><th>${L("สำนัก/กอง", "Division")}</th><th class="n">${L("ขอ (ลบ.)", "Asked (M)")}</th><th class="n">${L("เห็นชอบ (ลบ.)", "Approved (M)")}</th><th class="n">${L("ส่วนต่าง", "Gap")}</th></tr></thead><tbody>${units.map(u => { const a = sumv(sent.filter(r => r.unit === u).map(r => r.amount)), o = sumv(sent.filter(r => r.unit === u && r.status === "approved").map(r => r.amount)); return `<tr><td>${esc(unitName(u))}</td><td class="n">${fmt(a / 1e6, 2)}</td><td class="n">${fmt(o / 1e6, 2)}</td><td class="n">${fmt((a - o) / 1e6, 2)}</td></tr>`; }).join("")}</tbody></table></div></section></div>`;
}

// ---------- the steps of a year ----------
let RV_FY = null;
REV_PANELS.flow = () => {
  const fys = (S.fyList || []).filter(f => f.status !== "closed").map(f => f.fy).sort((a, b) => b - a), fy = RV_FY && fys.includes(RV_FY) ? RV_FY : FORM_FY, f = rvFlow(fy), can = ROLE === "plan";
  return `<section class="panel"><header><h2>${L("ขั้นการพิจารณาคำของบ", "Review steps for the requests")}</h2><span class="sp"></span><label class="field-inline">${L("ปีงบประมาณ", "Fiscal year")} <select id="rf-fy">${fys.map(y => `<option value="${y}" ${y === fy ? "selected" : ""}>${y}</option>`).join("")}</select></label>${S.rvFlow && S.rvFlow[fy] ? tag(L("กำหนดเอง", "Set for this year"), "p-ok") : tag(L("ค่าตั้งต้น", "Default"), "p-mute")}</header>
    <div class="body sub">${L("กำหนดว่าปีนี้คำขอต้องผ่านการพิจารณากี่ขั้น ใครพิจารณาในแต่ละขั้น ขั้นสุดท้ายเป็นการเห็นชอบ ผู้อำนวยการสำนัก/กองเป็นได้เฉพาะขั้นแรก", "Say how many review steps a request passes this year and who reviews at each. The last step approves. The division director can only be the first step.")}${can ? "" : " " + L("กองแผนงานเป็นผู้แก้ไข", "Planning edits this")}</div>
    <div class="tbl-wrap"><table><thead><tr><th>#</th><th>${L("ชื่อขั้น", "Step")}</th><th>${L("ผู้พิจารณา", "Reviewer")}</th><th>${L("คำขอที่อยู่ในขั้นนี้", "Requests here")}</th><th></th></tr></thead><tbody>${f.map((s, i) => `<tr><td class="mono">${i + 1}${i === f.length - 1 ? ` <span class="sub">${L("(เห็นชอบ)", "(approves)")}</span>` : ""}</td>
      <td><input type="text" data-rfn="${i}" value="${esc(tx(s.name))}" ${can ? "" : "disabled"} aria-label="${L("ชื่อขั้น", "Step name")} ${i + 1}" style="min-width:240px"></td>
      <td><select data-rfr="${i}" ${can ? "" : "disabled"}>${Object.keys(RV_ROLES).map(k => `<option value="${k}" ${k === s.role ? "selected" : ""}>${tx(RV_ROLES[k])}</option>`).join("")}</select></td>
      <td class="n">${fy === FORM_FY ? S.requests.filter(r => rvIdx(r) === i).length : "—"}</td>
      <td>${can ? `<div class="row" style="flex-wrap:nowrap"><button class="btn ghost" type="button" data-rfm="${i}|-1" ${i === 0 ? "disabled" : ""} aria-label="${L("เลื่อนขึ้น", "Move up")}">↑</button><button class="btn ghost" type="button" data-rfm="${i}|1" ${i === f.length - 1 ? "disabled" : ""} aria-label="${L("เลื่อนลง", "Move down")}">↓</button><button class="btn ghost" type="button" data-rfx="${i}" ${f.length <= 1 ? "disabled" : ""} aria-label="${L("ลบขั้น", "Remove step")}">×</button></div>` : ""}</td></tr>`).join("")}</tbody></table></div>
    ${can ? `<div class="body row"><button class="btn" type="button" id="rf-add">+ ${L("เพิ่มขั้น", "Add a step")}</button><button class="btn primary" type="button" id="rf-save">${L("บันทึกขั้นการพิจารณา", "Save the steps")}</button>${S.rvFlow && S.rvFlow[fy] ? `<button class="btn ghost" type="button" id="rf-reset">${L("กลับเป็นค่าตั้งต้น", "Back to the default")}</button>` : ""}</div>` : ""}</section>`;
};
REV_BIND.flow = () => {
  const fysel = $("#rf-fy"); if (fysel) fysel.onchange = () => { RV_FY = Number(fysel.value); route(); };
  if (ROLE !== "plan") return;
  const fy = Number((fysel || {}).value || FORM_FY), draft = () => { const f = rvFlow(fy).map(s => ({ ...s })); $$("[data-rfn]").forEach(i => (f[Number(i.dataset.rfn)].name = [i.value, i.value])); $$("[data-rfr]").forEach(sel => (f[Number(sel.dataset.rfr)].role = sel.value)); return f; };
  const put = f => { S.rvFlow = S.rvFlow || {}; S.rvFlow[fy] = f; commit(); route(); };
  $$("[data-rfm]").forEach(b => (b.onclick = () => { const [i, d] = b.dataset.rfm.split("|").map(Number), f = draft(); [f[i], f[i + d]] = [f[i + d], f[i]]; S.rvFlow = S.rvFlow || {}; S.rvFlow[fy] = f; route(); }));
  $$("[data-rfx]").forEach(b => (b.onclick = () => { const f = draft(); f.splice(Number(b.dataset.rfx), 1); S.rvFlow = S.rvFlow || {}; S.rvFlow[fy] = f; route(); }));
  const add = $("#rf-add"); if (add) add.onclick = () => { const f = draft(); if (f.length >= 8) { toast(L("มีได้ไม่เกิน 8 ขั้น", "At most 8 steps")); return; } f.push({ id: "s" + Date.now().toString(36), name: [L("ขั้นใหม่", "New step"), "New step"], role: "exec" }); S.rvFlow = S.rvFlow || {}; S.rvFlow[fy] = f; route(); };
  const rs = $("#rf-reset"); if (rs) rs.onclick = () => { if (S.rvFlow) delete S.rvFlow[fy]; audit(["คืนขั้นการพิจารณาเป็นค่าตั้งต้น", "Reset the review steps to the default"], String(fy)); commit(); route(); };
  const sv = $("#rf-save"); if (sv) sv.onclick = () => {
    const f = draft(); if (!f.length) { toast(L("ต้องมีอย่างน้อย 1 ขั้น", "At least one step")); return; }
    if (f.some(s => !tx(s.name).trim())) { toast(L("ทุกขั้นต้องมีชื่อ", "Every step needs a name")); return; }
    if (f.some((s, i) => s.role === "divhead" && i > 0)) { toast(L("ผู้อำนวยการสำนัก/กองเป็นได้เฉพาะขั้นแรก", "The division director can only be the first step")); return; }
    if (f[f.length - 1].role === "divhead") { toast(L("ขั้นสุดท้ายต้องไม่ใช่ผู้อำนวยการสำนัก/กอง", "The last step can't be the division director")); return; }
    f.forEach(s => (s.name = [tx(s.name), tx(s.name)])); put(f); audit(["กำหนดขั้นการพิจารณาคำของบ", "Set the review steps"], `${fy} · ${f.map(s => tx(RV_ROLES[s.role])).join(" → ")}`); toast(L("บันทึกขั้นการพิจารณาแล้ว", "Review steps saved"));
  };
};

// the overview replaces the old "amount per round" form, so the old handlers of that tab (save, send, return) are not bound
{ const bb = BIND.review; BIND.review = () => { if (REV_TAB === "rounds") { $$("[data-vtab]").forEach(b => (b.onclick = () => { REV_TAB = b.dataset.vtab; route(); })); const on = bPage(BUD_ON) || bPage("review"), mod = BUD_MOD[on.mod]; $$("[data-btab]").forEach(b => (b.onclick = () => { const t = bTabs(on).find(x => x.id === b.dataset.btab), s = BUD_SUB[`${on.id}:${t.id}`]; mod.set(s && t.keys.includes(s) ? s : t.keys[0]); route(); })); $$("[data-bseg]").forEach(b => (b.onclick = () => { mod.set(b.dataset.bseg); route(); })); return; } bb(); }; } // the overview needs the page tab bar bound too (before, its tabs did nothing once it was chosen)
