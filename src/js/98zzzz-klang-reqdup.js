// Fisko-KlangFinance, round P57 (23 Nov 2569): duplicate requests in "เตรียมคำของบประมาณ".
// When Planning processes a case, it is compared with the other cases of the year (not cancelled): the name of the project (the share of
// two-letter pieces in common), the responsible unit, the amount and the area. Cases that look the same are kept on the case (c.dup) and their
// number shows in the column "คำขอซ้ำ" of the overview. The count opens tab 3 (ส่งต่อและติดตาม), where the cases are compared side by side,
// with a button to cancel the request (with a reason) and the button "พร้อมส่ง สงป." (which marks the duplicates as looked at).
// The word "AI" is taken off the screens: the processing is done in the background like any other system.
RM_ST.cancelled = ["ยกเลิกคำขอ", "Request cancelled", "p-bad"];
const rmDupF = (c, k) => (c.ai && c.ai.F[k] ? c.ai.F[k].v : "");
function rmDupScore(a, b) {
  const ta = rmBig(rmTitle(a)), tb = rmBig(rmTitle(b)); if (!ta.size || !tb.size) return { s: 0, why: [] };
  let n = 0; ta.forEach(x => { if (tb.has(x)) n++; }); const name = (2 * n) / (ta.size + tb.size), why = [];
  if (name >= 0.5) why.push(`ชื่อโครงการคล้ายกัน ${Math.round(name * 100)}%`);
  const am = Number(rmDupF(a, "amount")) || 0, bm = Number(rmDupF(b, "amount")) || 0, sameAmt = am > 0 && am === bm; if (sameAmt) why.push("วงเงินเท่ากัน");
  const sameUnit = a.owner && a.owner === b.owner; if (sameUnit) why.push("หน่วยงานเดียวกัน");
  const ar = String(rmDupF(a, "area")).trim(), sameArea = ar && ar === String(rmDupF(b, "area")).trim(); if (sameArea) why.push("พื้นที่เดียวกัน");
  const s = name + (sameAmt ? 0.25 : 0) + (sameUnit ? 0.1 : 0) + (sameArea ? 0.1 : 0);
  return { s: Math.min(1, s), name, why };
}
function rmDupFind(c) {
  return (S.rmk || []).filter(x => x !== c && x.fy === c.fy && x.status !== "cancelled").map(x => ({ x, r: rmDupScore(c, x) }))
    .filter(o => o.r.name >= 0.75 || (o.r.name >= 0.5 && o.r.s >= 0.8)).sort((p, q) => q.r.s - p.r.s)
    .map(o => ({ id: o.x.id, score: Math.round(o.r.s * 100), why: o.r.why }));
}
{ const base = rmProcess; rmProcess = function (id) { const m = base(id); if (m) return m; const c = rmCase(id); c.dup = rmDupFind(c); c.dupAt = nowIso(); c.dupOk = null;
    if (c.dup.length) rmLog(c, "พบคำขอที่อาจซ้ำ", c.dup.map(d => d.id).join(", ")); return ""; }; }
const rmDupList = c => (c.dup || []).filter(d => { const x = rmCase(d.id); return x && x.status !== "cancelled"; });
function rmDupCell(c) { const n = rmDupList(c).length;
  if (!c.dup) return `<span class="sub">–</span>`; if (!n) return tag("ไม่พบ", "p-ok");
  return `<button class="btn ghost" type="button" data-rmdup="${esc(c.id)}" title="ดูเปรียบเทียบรายการ">${tag(n + " รายการ", c.dupOk ? "p-mute" : "p-warn")}</button>`; }
function rmCancel(id, why) {
  const c = rmCase(id); if (!c) return "ไม่พบเรื่อง"; if (ROLE !== "plan") return "เฉพาะกองแผนงานยกเลิกคำขอ"; if (c.status === "cancelled") return "ยกเลิกไปแล้ว"; if (c.status === "ready") return "พร้อมส่ง สงป. แล้ว ยกเลิกไม่ได้";
  if (!String(why || "").trim()) return "ระบุเหตุผลที่ยกเลิก";
  c.cancel = { by: me().id, t: nowIso(), why: String(why).trim().slice(0, 500), was: c.status }; c.status = "cancelled"; rmLog(c, "ยกเลิกคำขอ", c.cancel.why); audit(["ยกเลิกคำของบประมาณ", "Cancelled a budget request"], c.id); return "";
}
{ const base = rmReady; rmReady = function (id) { const m = base(id); if (m) return m; const c = rmCase(id); if (rmDupList(c).length) { c.dupOk = { by: me().id, t: nowIso() }; rmLog(c, "ตรวจคำขอที่อาจซ้ำแล้ว ยืนยันพร้อมส่ง สงป.", rmDupList(c).map(d => d.id).join(", ")); } return ""; }; }
function rmDupView(c) {
  const L0 = rmDupList(c); if (!L0.length) return "";
  const all = [c, ...L0.map(d => rmCase(d.id))], sc = id => (L0.find(d => d.id === id) || {});
  const rowsF = [["เลขที่", x => `<span class="mono">${esc(x.id)}</span>`], ["ชื่อโครงการ", x => `<b>${esc(rmTitle(x))}</b>`], ["หน่วยงานรับผิดชอบ", x => esc(unitName(x.owner))], ["ประเภท", x => (x.ai || x.kind ? esc(tx(RM_KIND[(x.ai && x.ai.kind) || x.kind])) : "–")],
    ["วงเงินรวม (บาท)", x => (rmDupF(x, "amount") ? fmt(rmDupF(x, "amount")) : "–")], ["พื้นที่", x => esc(rmDupF(x, "area") || "–")], ["ระยะเวลา", x => esc(rmDupF(x, "duration") || "–")], ["จำนวนไฟล์", x => x.files.length], ["สถานะ", x => rmStag(x.status)],
    ["ความเหมือน", x => (x === c ? `<span class="sub">เรื่องนี้</span>` : `<b>${sc(x.id).score}%</b><div class="sub">${esc((sc(x.id).why || []).join(" · "))}</div>`)]];
  const can = ROLE === "plan" && !["cancelled", "ready"].includes(c.status);
  return `<section class="panel" id="rm-dup"><header><h2>คำขอที่อาจซ้ำ (${L0.length})</h2><span class="sp"></span><span class="sub">ตรวจพบตอนประมวลผล ${c.dupAt ? fdate(c.dupAt, true) : ""}${c.dupOk ? ` · ตรวจแล้วโดย ${esc(userName(c.dupOk.by))}` : ""}</span></header>
    <div class="tbl-wrap"><table class="rm-dupt"><thead><tr><th></th>${all.map(x => `<th>${x === c ? "เรื่องนี้" : "อาจซ้ำ"}</th>`).join("")}</tr></thead><tbody>${rowsF.map(([lb, f]) => `<tr><td class="sub">${lb}</td>${all.map(x => `<td>${f(x)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
    ${can ? `<div class="body row" style="gap:8px;flex-wrap:wrap;align-items:flex-end"><div class="f" style="flex:1 1 280px"><label for="rm-cwhy">เหตุผลที่ยกเลิก *</label><input type="text" id="rm-cwhy" maxlength="500" placeholder="เช่น ซ้ำกับ ${esc(L0[0].id)}"></div><button class="btn danger" type="button" id="rm-cancel">ยกเลิกคำขอ</button><button class="btn primary" type="button" id="rm-dupready">พร้อมส่ง สงป.</button></div>` : ""}
    ${c.cancel ? `<div class="body sub">ยกเลิกโดย ${esc(userName(c.cancel.by))} · ${fdate(c.cancel.t, true)} · เหตุผล: ${esc(c.cancel.why)}</div>` : ""}</section>`;
}
{ const base = RM_VIEW.fw; RM_VIEW.fw = () => { const h = base(), c = rmCur(); if (!c) return h; const d = rmDupView(c), cx = c.status === "cancelled" && !d ? `<section class="panel"><div class="body">${tag("ยกเลิกคำขอ", "p-bad")} โดย ${esc(userName(c.cancel.by))} · ${fdate(c.cancel.t, true)} · เหตุผล: ${esc(c.cancel.why)}</div></section>` : "";
    if (!d && !cx) return h; const i = h.indexOf("<section"); return i < 0 ? h + d + cx : h.slice(0, i) + d + cx + h.slice(i); }; }
// the clicks: the count opens tab 3 at the comparison; cancel; ready
document.addEventListener("click", e => { const t = e.target; if (!t || !t.closest) return;
  const b = t.closest("[data-rmdup]"); if (b) { RM.id = b.dataset.rmdup; RM.tab = "fw"; RM.nw = false; route(); setTimeout(() => { const s = document.getElementById("rm-dup"); if (s && s.scrollIntoView) s.scrollIntoView({ block: "start" }); }, 0); return; }
  if (t.closest("#rm-cancel")) { const c = rmCur(), w = document.getElementById("rm-cwhy"), m = rmCancel(c.id, w ? w.value : ""); if (m) { toast(m); return; } commit(); route(); toast("ยกเลิกคำขอแล้ว"); return; }
  if (t.closest("#rm-dupready")) { const m = rmReady(rmCur().id); if (m) { toast(m); return; } commit(); route(); toast("พร้อมส่ง สงป. แล้ว"); } });
// P73 (23 Nov 2569): the tabs 1 รับเอกสาร, 2 ตรวจสอบเอกสาร and 3 ส่งต่อและติดตาม show no fiscal-year filter: the case was picked from the overview, which keeps it.
{ const base = menuFyChip; menuFyChip = function () { if (fyRouteId() === "rmake" && RM.tab !== "ov") { document.querySelectorAll(".fy-filter").forEach(x => x.remove()); return; } return base.apply(this, arguments); }; }
