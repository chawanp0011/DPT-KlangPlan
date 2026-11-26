// KlangFinance, procurement round P25 (16 Nov 2569): the procurement plan, item by item, without proposing a new plan version
// ("แผนจัดซื้อ ปรับใหม่ โดยไม่ต้องเสนอแผนฉบับใหม่ แต่ให้ส่งรายรายการเลย").
//   1. The list shows only the items that have passed the Appropriation Act: the item's budget line is in an allocation that is not a draft (the allocation
//      is made from the act), or its line is tied to a request that has an act amount (actSource(r) === "act"). Items that are already past the plan
//      (requisitioned, contracted) stay visible. (planActPassed; planVisible in 60-procurement.js applies it.)
//   2. Each item has a status of the plan, in a new column, and a button "ขออนุมัติแผน" in the row: p.ap = { st: "none"|"asked"|"approved"|"rejected", ask, dec }.
//        the office or division that owns the budget line asks (button, own unit only);
//        Planning (กองแผนงาน) approves or rejects (rejection needs a reason; the office can ask again);
//        once approved, the office goes on as before with the item: "ขอซื้อขอจ้าง" (details step by step, then sent to the division director), which
//        was always gated on "the item is in the plan" (inPublishedPlan, now: the item's plan request is approved).
//   3. The plan versions are not proposed any more: the version panel and its tasks are out (planPanel, the version tasks). S.planDoc stays in the data (the e-GP
//      notice record of the published plan, and old tests/seeds read it).
// The sample items that were in the published version (v1) are approved; one item that was not stays "asked" (a sample for the approval).
const planActPassed = p => {
  const l = famLine(p.line); if (!l || !l.id) return false; const A = S.allocs && S.allocs[FAM_FY];
  if (A && !A.draft && A.lines.some(x => x.id === l.id)) return true;
  const r = l.req && (S.requests || []).find(x => x.id === l.req); return !!r && typeof actSource === "function" && actSource(r) === "act";
};
const planApSt = p => (p.ap && p.ap.st) || "none";
const planOwner = p => ROLE === "div" && famLine(p.line).unit === me().unit; // the office that owns the budget line (it raises the requisition once the item is approved)
// 17 Nov 2569 (P28), at the user's word ("Planning only picks the budget item and sends it to the director for approval"): PLANNING picks the item from the allocation lines (no typing of name,
// amount or method) and sends it to the DIRECTOR OF THE PLANNING DIVISION (ผอ.กองแผนงาน) for approval, item by item. The director is a user of the role divhead in the unit of Planning.
const planUnit = () => ((S.users || []).find(u => u.role === "plan") || {}).unit;
const isPlanHead = () => ROLE === "divhead" && !!planUnit() && me().unit === planUnit();
planStage = p => {
  if (inPublishedPlan(p)) return null; const a = planApSt(p);
  if (a === "asked") return ["wait", L("รอ ผอ.กองแผนงานอนุมัติแผน", "Waiting for the Planning director to approve the plan")];
  if (a === "rejected") return ["rej", L("ผอ.กองแผนงานไม่อนุมัติแผน ปรับแล้วส่งใหม่", "The Planning director did not approve; adjust and send again")];
  return ["new", L("ยังไม่ได้ขออนุมัติแผน", "Plan not asked for yet")];
};
planPanel = () => ""; // no plan versions to propose, approve or publish
const planHeads = () => (S.users || []).filter(u => u.role === "divhead" && u.unit === planUnit() && u.active !== false); // who can approve a plan item: the directors of the Planning division
const planHeadNames = () => planHeads().map(u => tx(u.name)).join(", ");
const planApCell = p => {
  const a = p.ap || {}, st = planApSt(p), tg = st === "approved" ? tag(L("อนุมัติแผนแล้ว", "Plan approved"), "p-ok") : st === "asked" ? tag(`${L("รอ ผอ.กองแผนงานอนุมัติ", "Waiting for the Planning director")}${planHeadNames() ? " · " + planHeadNames() : ""}`, "p-warn") : st === "rejected" ? tag(L("ไม่อนุมัติแผน", "Not approved"), "p-bad") : tag(L("ยังไม่ได้ขออนุมัติแผน", "Not asked yet"), "p-mute");
  const when = st === "asked" && a.ask ? `<div class="sub">${fdate(a.ask.t)} · ${esc(userName(a.ask.by))}</div>` : st === "approved" && a.dec ? `<div class="sub">${fdate(a.dec.t)} · ${esc(userName(a.dec.by))}</div>` : st === "rejected" && a.dec ? `<div class="sub">${esc(a.dec.why || "")}</div>` : "";
  const ask = p.status === "planned" && isPlanRole() && (st === "none" || st === "rejected") ? `<button class="btn primary" type="button" data-pask="${p.id}">${L("ส่ง ผอ.กองแผนงานอนุมัติ", "Send to the Planning director")}</button>` : "";
  const dec = p.status === "planned" && isPlanHead() && st === "asked" ? `<div class="row" style="flex-wrap:wrap;margin-top:4px"><button class="btn primary" type="button" data-pdec="${p.id}|ok">${L("อนุมัติแผน", "Approve")}</button><input type="text" id="pwhy-${p.id}" placeholder="${L("เหตุผลถ้าไม่อนุมัติ", "Reason if not approved")}" style="min-width:150px"><button class="btn" type="button" data-pdec="${p.id}|no">${L("ไม่อนุมัติ", "Reject")}</button></div>` : "";
  const sw = p.status === "planned" && st === "asked" && !isPlanHead() && ["plan", "divhead", "exec", "admin"].includes(ROLE) && planHeads().length ? `<div style="margin-top:4px"><button class="btn ghost" type="button" data-pswitch="${planHeads()[0].id}">${L("เข้าเป็น ผอ.กองแผนงานเพื่ออนุมัติ (สาธิต)", "Act as the Planning director to approve (demo)")}</button></div>` : "";
  return `<td data-pap="${p.id}">${tg}${when}${sw}${ask ? `<div style="margin-top:4px">${ask}</div>` : ""}${dec}</td>`;
};
{ // the new column in the plan table
  const pm = PROC.planMain;
  PROC.planMain = () => {
    const box = document.createElement("div"); box.innerHTML = pm(); const th = [...box.querySelectorAll("thead th")]; const at = th.findIndex(x => /สถานะ|Status/.test(x.textContent)); if (at < 0) return box.innerHTML;
    th[at].insertAdjacentHTML("afterend", `<th style="min-width:150px">${L("สถานะแผน", "Plan status")}</th>`);
    box.querySelectorAll("tbody tr").forEach(tr => { const p = S.pplan.find(x => x.id === (tr.children[0] ? tr.children[0].textContent.trim() : "")); const c = tr.children[at]; if (p && c) c.insertAdjacentHTML("afterend", planApCell(p)); });
    return box.innerHTML;
  };
  PROC.plan = () => PROC.planMain() + (typeof PROC.demand === "function" ? PROC.demand() : "");
  const done = msg => { commit(); route(); toast(msg); };
  document.addEventListener("click", e => {
    const swb = e.target.closest && e.target.closest("[data-pswitch]");
    if (swb) { const u = (S.users || []).find(x => x.id === swb.dataset.pswitch); if (!u || !planHeads().includes(u)) return; ROLE = u.role; store.set("app-role", ROLE); SESSION = SESSION || { user: u.id }; SESSION.user = u.id; store.set("app-session", JSON.stringify(SESSION)); renderShell(); route(); toast(`${L("สลับเป็น", "Switched to")} ${tx(u.name)} · ${L("ผู้อำนวยการกองแผนงาน", "Planning director")}`); return; }
    const ask = e.target.closest && e.target.closest("[data-pask]"), dec = e.target.closest && e.target.closest("[data-pdec]");
    if (ask) { const p = S.pplan.find(x => x.id === ask.dataset.pask); if (!p || p.status !== "planned" || !isPlanRole() || !["none", "rejected"].includes(planApSt(p))) return;
      p.ap = { st: "asked", ask: { by: me().id, t: nowIso() } }; audit(["ส่งแผนจัดซื้อรายรายการให้ ผอ.กองแผนงานอนุมัติ", "Sent a plan item to the Planning director"], p.id); notify(["divhead"], [`${p.id} กองแผนงานส่งแผนจัดซื้อให้อนุมัติ (${tx(p.name)})`, `${p.id}: Planning sent a plan item for approval (${tx(p.name)})`], "prc-plan"); done(L("ส่ง ผอ.กองแผนงานอนุมัติแล้ว", "Sent to the director")); return; }
    if (dec) { const [id, how] = dec.dataset.pdec.split("|"), p = S.pplan.find(x => x.id === id); if (!p || !isPlanHead() || planApSt(p) !== "asked") return;
      if (how === "ok") { p.ap = { st: "approved", ask: p.ap.ask, dec: { by: me().id, t: nowIso() } }; audit(["อนุมัติแผนจัดซื้อรายรายการ", "Approved a plan item"], p.id); notify(["div", "divhead"], [`${p.id} อนุมัติแผนจัดซื้อแล้ว กรอกรายละเอียดและขอซื้อขอจ้างได้`, `${p.id}: the plan item is approved; fill the details and raise the requisition`], "prc-plan"); done(L("อนุมัติแผนแล้ว", "Approved")); return; }
      const why = (document.getElementById("pwhy-" + id) || { value: "" }).value.trim(); if (why.length < 5) { toast(L("ระบุเหตุผลที่ไม่อนุมัติอย่างน้อย 5 ตัวอักษร", "Give a reason of at least 5 characters")); return; }
      p.ap = { st: "rejected", ask: p.ap.ask, dec: { by: me().id, t: nowIso(), why } }; audit(["ไม่อนุมัติแผนจัดซื้อรายรายการ", "Rejected a plan item"], `${p.id} · ${why}`); notify(["plan"], [`${p.id} ผอ.กองแผนงานไม่อนุมัติแผน: ${why}`, `${p.id}: the Planning director did not approve the plan item: ${why}`], "prc-plan"); done(L("ไม่อนุมัติแล้ว", "Rejected"));
    }
  });
  // my work: the plan-version tasks are out; one task for Planning for each item asked, one for the owner for each item approved and not raised yet
  const bt = famTasks;
  famTasks = R => { bt((t, s, due, link, cls) => (/^(อนุมัติแผนจัดซื้อ|ประกาศแผนจัดซื้อ|Approve the procurement plan|Record the e-GP notice)/.test(t) ? null : R(t, s, due, link, cls)));
    (S.pplan || []).forEach(p => { if (p.status !== "planned") return;
      if (isPlanHead() && planApSt(p) === "asked") R(`${L("อนุมัติแผนจัดซื้อรายการ", "Approve plan item")} ${p.id}`, tx(p.name), p.ap.ask ? String(p.ap.ask.t).slice(0, 10) : TODAY, "prc-plan", "p-warn");
      if (planOwner(p) && planApSt(p) === "approved" && !(S.reqn || []).some(r => r.plan === p.id)) R(`${L("ขอซื้อขอจ้างรายการ", "Raise the requisition for")} ${p.id}`, tx(p.name), TODAY, "prc-plan", "p-info");
      if (isPlanRole() && planApSt(p) === "rejected") R(`${L("แผนไม่อนุมัติ ปรับและส่งใหม่", "Plan not approved; send again")} ${p.id}`, p.ap.dec && p.ap.dec.why || "", TODAY, "prc-plan", "p-bad"); }); };
}
// sample data: the items of the published version are approved; one planned item that is not in it has been asked
Object.keys(SEEDS).forEach(k => {
  const prev = SEEDS[k].seed;
  SEEDS[k].seed = () => {
    const s = prev();
    if (!s.users.some(u => u.role === "divhead" && u.unit === ((s.users.find(x => x.role === "plan") || {}).unit))) s.users.push({ id: "u32", role: "divhead", unit: (s.users.find(x => x.role === "plan") || {}).unit || "U02", primary: false, mfa: true, active: true, name: ["ปรีชา นำแผน", "Preecha Namplan"] });
    const v = (s.planDoc.versions || []).filter(x => x.status === "approved" && x.published).sort((a, b) => b.v - a.v)[0], pl = (s.users.find(u => u.role === "divhead" && u.unit === (s.users.find(x => x.role === "plan") || {}).unit) || s.users.find(u => u.role === "plan") || s.users[0]).id, d = v && v.published && v.published.date ? v.published.date : TODAY;
    let asked = false;
    (s.pplan || []).forEach(p => { if (v && v.items.some(x => x.id === p.id)) p.ap = { st: "approved", dec: { by: pl, t: d + "T10:00:00" } };
      else if (p.status === "planned" && !asked) { asked = true; p.ap = { st: "asked", ask: { by: (s.users.find(x => x.role === "plan") || s.users[0]).id, t: TODAY + "T09:00:00" } }; } });
    return s;
  };
});
