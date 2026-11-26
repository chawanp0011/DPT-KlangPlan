// KlangFinance, round P67 (23 Nov 2569): the page of a รายการจัดซื้อ (the request a unit raised).
// P89 (24 Nov 2569): the parts 4-7 are shown again (asked for: "เอากลับมาก่อน"); window.CASE_HIDE47 = true hides them as in P67.
// The part ส่ง e-GP has two tabs: "สถานะ e-GP" (the steps, as before) and "รายละเอียดขอซื้อขอจ้าง": everything the unit entered in
// ขอซื้อขอจ้าง, with its documents, read-only. The hidden parts stay in the page (hidden) so that nothing that reads them breaks.
let CASE_EGP_TAB = "st";
{ const base = caseRegroup; caseRegroup = function (c) { base(c); const main = document.querySelector(".case-main"); if (!main || main.dataset.p67) return; main.dataset.p67 = "1";
    if (window.CASE_HIDE47) [4, 5, 6, 7].forEach(n => { const b = document.querySelector(`.cphase[data-cphase="${n}"]`), m = document.querySelector(`.cmain[data-cmain="${n}"]`); if (b) b.style.display = "none"; if (m) { m.hidden = true; m.dataset.p67hide = "1"; } });
    const m2 = document.querySelector('.cmain[data-cmain="2"]'), m3 = document.querySelector('.cmain[data-cmain="3"]'), b3 = document.querySelector('.cphase[data-cphase="3"]');
    if (m3 && m2) {
      const st = document.createElement("div"), rq = document.createElement("div"); st.className = "c3-st"; rq.className = "c3-rq";
      [...m3.childNodes].forEach(n => st.appendChild(n));
      const copy = m2.cloneNode(true); copy.removeAttribute("data-cmain"); copy.hidden = false; copy.className = "c3-copy";
      copy.querySelectorAll("[id]").forEach(el => el.removeAttribute("id"));
      copy.querySelectorAll("input,select,textarea").forEach(el => { el.disabled = true; el.removeAttribute("name"); });
      copy.querySelectorAll("button").forEach(el => { if (!el.matches("[data-rmprev],[data-rmdl],[data-pddl],[data-pdview]")) el.remove(); });
      copy.querySelectorAll("form").forEach(el => el.addEventListener("submit", e => e.preventDefault()));
      copy.querySelectorAll("details").forEach(el => (el.open = true));
      rq.appendChild(copy); if (!copy.textContent.trim()) rq.innerHTML = `<div class="sub">สำนัก/กองยังไม่ได้ใส่รายละเอียดขอซื้อขอจ้าง</div>`;
      const bar = document.createElement("div"); bar.className = "tabs c3-tabs"; bar.setAttribute("role", "tablist"); bar.style.margin = "0 0 10px";
      const draw = () => { bar.innerHTML = [["st", "สถานะ e-GP"], ["rq", "รายละเอียดขอซื้อขอจ้าง"]].map(([k, t]) => `<button type="button" class="tab ${CASE_EGP_TAB === k ? "on" : ""}" role="tab" aria-selected="${CASE_EGP_TAB === k}" data-c3tab="${k}">${t}</button>`).join(""); st.hidden = CASE_EGP_TAB !== "st"; rq.hidden = CASE_EGP_TAB !== "rq";
        bar.querySelectorAll("[data-c3tab]").forEach(b => (b.onclick = () => { CASE_EGP_TAB = b.dataset.c3tab; draw(); })); };
      m3.appendChild(bar); m3.appendChild(st); m3.appendChild(rq); draw();
    }
    // a case past e-GP opens on its e-GP part
    const sel = CASE_MAIN[c.id] || casePhases(c).cur || 1; if (window.CASE_HIDE47 && sel >= 4 && b3) { document.querySelectorAll(".cmain").forEach(m => (m.hidden = m.dataset.cmain !== "3")); document.querySelectorAll(".cphase").forEach(x => { const on = x === b3; x.setAttribute("aria-selected", String(on)); x.style.border = on ? "2px solid var(--accent)" : ""; }); }
  }; }

// ---------- P69 (23 Nov 2569): ขอซื้อขอจ้าง has no approval step any more ----------
// In the new flow the unit receives the item from Planning, writes the details and sends them on to the Treasury. Sending the details
// is the end of the unit's part: the requisition is recorded as sent (status "approved", shown as "นำส่งกองคลังแล้ว") and the method
// goes with it. No one approves it in between.
REQ_ST.approved = [["นำส่งกองคลังแล้ว", "Sent to the Treasury"], "p-ok"]; REQ_ST.pending = [["รอนำส่งกองคลัง", "To send to the Treasury"], "p-warn"];
{ const base = rqSubmit; rqSubmit = function (c) { const n0 = S.reqn.length; base(c); if (S.reqn.length === n0) return;
    const r = S.reqn[S.reqn.length - 1], p = famPlan(r.plan); if (r.status !== "pending") return;
    r.status = "approved"; r.decided = { by: me().id, t: nowIso(), auto: true, note: "นำส่งกองคลัง (ไม่มีขั้นอนุมัติ)" };
    caseOnDecide(p, r, true); if (c.methodApproval && c.methodApproval.status === "with_request") c.methodApproval = { status: "approved", t: nowIso(), by: me().id };
    audit(["สำนัก/กองนำส่งรายละเอียดขอซื้อขอจ้างให้กองคลัง", "The unit sent the request details to the Treasury"], `${r.id} ${p.id}`);
    notify(["proc", "prochead"], [`ใบขอซื้อขอจ้าง ${r.id} สำนัก/กองนำส่งกองคลังแล้ว`, `Requisition ${r.id} was sent to the Treasury`], "case:" + c.id); commit(); renderShell(); route(); }; }

// ---------- P70 (23 Nov 2569): an item Planning sent from the budget items is in the plan ----------
// Sending the budget item IS Planning's approval of the plan in the new flow, so the unit can write the details at once
// (before, the ขอจัดซื้อ panel still said "รายการนี้ยังไม่ได้รับอนุมัติแผน"). Items sent before this change are fixed when a page opens.
const prBiApprove = p => { if (p && p.biSrc && !(p.ap && p.ap.st === "approved")) { const r = ((S.bi && S.bi.rows) || []).find(x => x.id === p.biSrc); p.ap = { st: "approved", by: (r && r.sent && r.sent.by) || "", t: (r && r.sent && r.sent.t) || nowIso(), auto: "นำส่งจากรายการงบประมาณ" }; return true; } return false; };
{ const base = biSend; biSend = function (ids) { const r = base(ids); (r.sent || []).forEach(id => { const b = biData().rows.find(x => x.id === id); if (b && b.sent) prBiApprove(S.pplan.find(p => p.id === b.sent.pp)); }); return r; }; }
{ const base = route; route = function () { try { if (typeof S !== "undefined" && S && S.pplan && S.pplan.map(prBiApprove).some(Boolean)) commit(); } catch (e) {} return base.apply(this, arguments); }; }

// ---------- P71 (23 Nov 2569): the unit's part: the attachments panel before "ready to send?", and every heading numbered ----------
{ const base = caseExtraPanels; caseExtraPanels = function (c) { const out = base(c), a = typeof rqAttachPanel === "function" ? rqAttachPanel(c) : null; if (a) out.push(cmPanel(2, 49, a.title, a.body)); return out; }; }
{ const base = caseRegroup; caseRegroup = function (c) { base(c); const m2 = document.querySelector('.cmain[data-cmain="2"]'); if (!m2 || m2.dataset.p71) return; m2.dataset.p71 = "1";
    [...m2.children].filter(el => el.matches("section.panel,div.panel")).forEach((el, i) => { const h = el.querySelector("h2"); if (!h) return; h.textContent = `${i + 1}. ${h.textContent.replace(/^\d+\.\s*/, "")}`;
      el.querySelectorAll("h3").forEach((h3, j) => { h3.textContent = `${i + 1}.${j + 1} ${h3.textContent.replace(/^\d+(\.\d+)?\s*·?\s*/, "")}`; }); }); }; }
// P75 (23 Nov 2569): "ข้อมูลประกอบ" (the folded background panels of each part) is not shown for now; it stays in the page, hidden.
{ const base = caseRegroup; caseRegroup = function (c) { base(c); document.querySelectorAll(".cmain .cfold").forEach(d => (d.style.display = "none")); }; }

// ---------- P76 (23 Nov 2569): the e-GP part ----------
// 1. The panels above the seven e-GP steps are not shown for now (they stay in the page, hidden).
// 2. Ticking a box (or a choice that shows more fields) in an e-GP step redraws the page; the step stayed open no more, the page jumped
//    and what was typed but not saved was lost. Now the values of that step are kept, the same step stays open and the page stays put.
const C3_HIDE = ["การสรรหาผู้เสนอราคาใน e-GP", "รับฟังความคิดเห็นและต่อรองราคา", "เกณฑ์พิจารณาข้อเสนอ", "แบบแจ้งผลประโยชน์ทับซ้อน", "ผู้ยื่นและคะแนนพิจารณา", "การพิจารณาผลและประกาศผู้ชนะ"];
let E7_KEEP = null;
{ const base = caseRegroup; caseRegroup = function (c) { base(c);
    document.querySelectorAll('.cmain[data-cmain="3"] .panel').forEach(p => { const h = p.querySelector("h2"), t = h ? h.textContent.trim().replace(/^[0-9]+[.] /, "") : ""; if (C3_HIDE.some(x => t.startsWith(x))) { p.style.display = "none"; p.dataset.p76hide = "1"; } });
    if (E7_KEEP && E7_KEEP.cid === c.id) { const f = document.querySelector(`form[data-e7="${c.id}|${E7_KEEP.n}"]`), d = f && f.closest("details"); if (d) d.open = true; const y = E7_KEEP.y; E7_KEEP = null; setTimeout(() => window.scrollTo(0, y), 0); } }; }
document.addEventListener("change", e => { const t = e.target; if (!t || !t.matches || !t.matches("[data-e7re]")) return; const f = t.closest("form[data-e7]"); if (!f) return;
  const [cid, ns] = f.dataset.e7.split("|"), c = caseOf(cid), n = Number(ns); if (!c || !egpUpCan(c)) return; const s = egp7Of(c)["s" + n];
  f.querySelectorAll("input,select,textarea").forEach(el => { if (!el.name || el === t || el.type === "file" || el.type === "radio" || el.type === "checkbox" || el.disabled) return; s[el.name] = el.type === "number" ? (el.value === "" ? "" : Number(el.value)) : el.value; });
  E7_KEEP = { cid, n, y: window.scrollY }; }, true);

// ---------- P88 (24 Nov 2569): from part 3 (ส่ง e-GP) on, the panel "รายละเอียดโครงการที่ขอซื้อขอจ้าง" above the parts is hidden ----------
// (asked for: it repeats the tab "รายละเอียดขอซื้อขอจ้าง" of part 3). It shows again on parts 1 and 2.
const caseStep2Sync = c => { const el = document.getElementById("case-step-2"); if (!el || !c) return; const sel = CASE_MAIN[c.id] || casePhases(c).cur || 1; el.style.display = sel >= 3 ? "none" : ""; };
{ const base = caseRegroup; caseRegroup = function (c) { const r = base.apply(this, arguments); caseStep2Sync(c); return r; }; }
document.addEventListener("click", e => { const b = e.target && e.target.closest && e.target.closest(".cphase"); if (!b || !CASE_OPEN) return; setTimeout(() => caseStep2Sync(caseOf(CASE_OPEN)), 0); });
