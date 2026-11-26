// KlangFinance, round P63 (23 Nov 2569): "สัญญาและงวดงาน" for the Treasury, as the user set it out.
// 1. A new tab "บริหารเงิน" on a contract: the Treasury officer updates the money-management columns of the department's disbursement file
//    (กันไว้เบิกเหลื่อมปี/ตกพับ, เงินเหลือจ่าย, ยกเลิกสัญญา, งานช้า, งานเร็ว); the other columns are worked out from the data.
// 2. The list of the menu shows every budget item of the year with its state. An item with a contract opens the contract (its tabs as
//    before, the state follows the steps of the contract). An item without a contract opens on "บริหารเงิน" only; the other tabs are shown
//    but cannot be used.
// The sums, as in the department's file: after the plan = allotment - plan; after paying = allotment - paid;
// before managing = after the plan - carried over/lapsed - left over - cancelled; net = before managing + slow work - fast work.
// (The signs of the last line are my reading of the sample rows; to be confirmed with the Treasury.)
const KX_MM = [["carry", "กันไว้เบิกเหลื่อมปี/ตกพับ"], ["leftover", "เงินเหลือจ่าย"], ["cancel", "ยกเลิกสัญญา"], ["slow", "งานช้า"], ["fast", "งานเร็ว"]];
let BI_OPEN = null;
const mmOf = t => (t.mm = t.mm || {});
const mmTarget = r => (r.k ? kxOf(r.k) : ((S.bi && S.bi.rows) || []).find(x => x.id === r.id) || null);
function mmCalc(r) { const m = (mmTarget(r) || {}).mm || {}, n = f => Number(m[f]) || 0, pT = r.plan.reduce((s, v) => s + v, 0), aT = r.act.reduce((s, v) => s + v, 0);
  const afterPlan = r.alloc - pT, afterAct = r.alloc - aT, before = afterPlan - n("carry") - n("leftover") - n("cancel");
  return { pT, aT, afterPlan, afterAct, carry: n("carry"), leftover: n("leftover"), cancel: n("cancel"), before, slow: n("slow"), fast: n("fast"), net: before + n("slow") - n("fast"), pct: r.alloc ? Math.round(aT / r.alloc * 10000) / 100 : 0 }; }
function mmSave(r, v) { if (!kxCanEdit()) return "เฉพาะเจ้าหน้าที่กองคลัง (พัสดุ) บันทึกได้"; const t = mmTarget(r); if (!t) return "ไม่พบรายการ"; const m = mmOf(t);
  for (const [f] of KX_MM) { if (!(f in v)) continue; const x = String(v[f]).replace(/,/g, "").trim(); if (x !== "" && isNaN(Number(x))) return "ใส่ตัวเลขเท่านั้น"; m[f] = x === "" ? "" : Number(x); }
  m.by = me().id; m.t = nowIso(); audit(["บันทึกการบริหารเงิน (ไฟล์เบิกจ่าย)", "Saved the money management"], r.id); return ""; }
const mmRowOf = id => prDtRows(BI.fy, false).find(r => r.id === id || (r.k && r.k.id === id)) || prDtRows(FAM_FY, false).find(r => r.id === id || (r.k && r.k.id === id));
function mmView(r) { if (!r) return `<div class="body sub">ไม่พบรายการในปีงบประมาณนี้</div>`; const c = mmCalc(r), can = kxCanEdit(), m = (mmTarget(r) || {}).mm || {};
  return `<div class="body cx-mm" style="display:flex;flex-direction:column;gap:8px">
    <div class="facts"><span class="fact">งบประมาณได้รับจัดสรร <b>${fmt(r.alloc)}</b></span><span class="fact">แผนการเบิกจ่าย <b>${fmt(c.pT)}</b></span><span class="fact">ผลการเบิกจ่าย <b>${fmt(c.aT)}</b> (${c.pct}%)</span><span class="fact">หลังวางแผน <b>${fmt(c.afterPlan)}</b></span><span class="fact">หลังเบิกจ่าย <b>${fmt(c.afterAct)}</b></span></div>
    <form data-mm="${esc(r.id)}" class="inline-form" style="display:flex;flex-wrap:wrap;gap:10px">${KX_MM.map(([f, t]) => kxIn(f, t + " (บาท)", m[f], "number", can, 'step="0.01"')).join("")}${can ? `<div class="f" style="align-self:end"><button class="btn primary" type="submit">บันทึกบริหารเงิน</button></div>` : ""}</form>
    <div class="facts"><span class="fact">คงเหลือก่อนบริหารโครงการ <b>${fmt(c.before)}</b></span><span class="fact">คงเหลือสุทธิ <b>${fmt(c.net)}</b></span><span class="fact">% ความก้าวหน้าวัดจากผลเบิก <b>${c.pct}%</b></span></div>
    <div class="sub">คงเหลือก่อนบริหารโครงการ = หลังวางแผน − กันไว้เบิกเหลื่อมปี/ตกพับ − เงินเหลือจ่าย − ยกเลิกสัญญา · คงเหลือสุทธิ = คงเหลือก่อนบริหารโครงการ + งานช้า − งานเร็ว${m.t ? ` · บันทึกล่าสุด ${esc(userName(m.by))} ${fdate(m.t, true)}` : ""}</div></div>`; }

// ---------- the contract tab ----------
if (!CON_TABS.some(x => x[0] === "mm")) CON_TABS.push(["mm", ["บริหารเงิน", "Money management"]]);
{ const base = conTabBody; conTabBody = function (c, k) { if (k === "mm") return mmView(mmRowOf(c.id) || prDtRows(prFyOfCon(c), true).find(r => r.k === c)); return base(c, k); }; }

// ---------- the numbers go to the dashboard and the Excel of payments ----------
{ const base = prDtRows; prDtRows = function (fy, onlyCon) { const rows = base(fy, onlyCon); rows.forEach(r => { const t = r.k ? (r.k.cx || {}) : ((S.bi && S.bi.rows) || []).find(x => x.id === r.id) || {}, m = t.mm || {};
    ["carry", "leftover", "cancel", "slow", "fast"].forEach(f => (r[f] = Number(m[f]) || 0)); }); rows.forEach(r => (r.net = mmCalc(r).net)); return rows; }; }
{ const base = prPlanBook; prPlanBook = function (fy) { const book = base(fy), rows = prDtRows(fy, false);
    book.forEach(sh => sh.rows.slice(5).forEach(row => { const r = rows.find(y => y.code === row[4] && y.name === row[5]); if (!r) return; const c = mmCalc(r); [row[36], row[37], row[38], row[39], row[40], row[41], row[42]] = [c.carry, c.leftover, c.cancel, c.before, c.slow, c.fast, c.net]; }));
    return book; }; flDisbBook = () => prPlanBook(BI.fy); }

// ---------- the list: every budget item of the year with its state ----------
function mmState(r) { const p = r.k ? famPlan(r.k.plan) : (() => { const bi = ((S.bi && S.bi.rows) || []).find(x => x.id === r.id); return bi && bi.sent ? S.pplan.find(q => q.id === bi.sent.pp) : null; })();
  if (r.k) { const x = r.k.cx, st = flStage(p); if (x && x.closed) return ["ปิดโครงการแล้ว", "p-ok"]; if (st === "chk") return ["รอผู้ตรวจสอบใบสำคัญ", "p-warn"]; if (st === "book") return ["รอการบัญชี", "p-warn"]; if (st === "pay") return ["รอการเงิน", "p-warn"]; if (st === "close") return ["รอกองคลังปิดโครงการ", "p-info"];
    const dl = (x && x.dl) || []; return dl.length ? [`ส่งมอบแล้ว ${dl.length} ครั้ง`, "p-info"] : ["ลงนามสัญญาแล้ว", "p-info"]; }
  if (!p) return ["รอกองแผนงานนำส่ง", "p-mute"]; const c = caseByPlan(p.id); if (c && c.egp7 && c.egp7.stage) return [`e-GP ขั้น ${c.egp7.stage}: ${EGP7[c.egp7.stage - 1].t}`, "p-info"];
  return [`${r.proc}. ${DT_PROC[r.proc] || ""}`, r.proc ? "p-info" : "p-mute"]; }
PROC.conList = () => { if (BI_OPEN) return mmItemPage(BI_OPEN); const rows = prDtRows(BI.fy, false);
  return `${prFySel()}<section class="panel"><header><h2>รายการงบประมาณและสัญญา ปีงบประมาณ ${BI.fy}</h2><span class="sp"></span><span class="sub">${rows.length} รายการ · มีสัญญา ${rows.filter(r => r.k).length}</span></header>
    ${rows.length ? `<div class="tbl-wrap"><table class="mm-list"><thead><tr><th style="min-width:240px">รายการงบประมาณ</th><th>หน่วยงาน</th><th class="n">งบประมาณ</th><th>สัญญา</th><th class="n">เบิกจ่ายแล้ว</th><th>สถานะรายการ</th><th></th></tr></thead><tbody>${rows.map(r => { const s = mmState(r), aT = r.act.reduce((a, b) => a + b, 0);
      return `<tr><td><span class="mono sub">${esc(r.id)}</span> <b style="font-weight:600">${esc(r.name)}</b><div class="sub mono">${esc(r.code || "")}</div></td><td>${esc(r.unit)}</td><td class="n">${fmt(r.alloc)}</td><td>${r.k ? `<span class="mono">${esc(r.k.no)}</span><div class="sub">${esc(tx(r.k.vendor))}</div>` : `<span class="sub">ยังไม่มีสัญญา</span>`}</td><td class="n">${aT ? fmt(aT) : "–"}</td><td>${tag(s[0], s[1])}</td>
        <td>${r.k ? `<button class="btn" type="button" data-conopen="${esc(r.k.id)}">เปิดสัญญา</button>` : `<button class="btn ghost" type="button" data-biopen="${esc(r.id)}">บริหารเงิน</button>`}</td></tr>`; }).join("")}</tbody></table></div>` : `<div class="body sub">ยังไม่มีรายการงบประมาณของปี ${BI.fy}</div>`}</section>`; };
function mmItemPage(id) { const r = prDtRows(BI.fy, false).find(x => x.id === id && !x.k); if (!r) { BI_OPEN = null; return PROC.conList(); }
  const tabs = CON_TABS.map(([k, l]) => `<button class="tab ${k === "mm" ? "on" : ""}" type="button" role="tab" ${k === "mm" ? 'aria-selected="true"' : 'disabled aria-disabled="true" title="ใช้ได้เมื่อมีสัญญา"'} style="${k === "mm" ? "" : "opacity:.45;cursor:not-allowed"}">${tx(l)}</button>`).join("");
  return `<div class="row" style="margin:0 0 10px"><button class="btn ghost" type="button" data-biback>← รายการทั้งหมด</button></div>
    <section class="panel mm-item"><header><h2>${esc(r.name)}</h2><span class="sp"></span>${tag(mmState(r)[0], mmState(r)[1])}</header><div class="body sub">${esc(r.unit)} · รหัสงบประมาณ <span class="mono">${esc(r.code || "–")}</span> · ยังไม่มีสัญญา: ใช้ได้เฉพาะแท็บบริหารเงิน</div>
    <div class="tabs fn-tabs" role="tablist" style="margin:0 16px">${tabs}</div>${mmView(r)}</section>`; }

// ---------- handlers ----------
document.addEventListener("click", e => { const t = e.target; if (!t || !t.closest) return;
  const o = t.closest("[data-biopen]"); if (o) { BI_OPEN = o.dataset.biopen; CON_OPEN = null; route(); return; }
  if (t.closest("[data-biback]")) { BI_OPEN = null; route(); return; }
  if (t.closest("[data-conopen]")) BI_OPEN = null; }, true);
document.addEventListener("submit", e => { const f = e.target; if (!f || !f.matches || !f.matches("[data-mm]")) return; e.preventDefault(); const r = mmRowOf(f.dataset.mm); if (!r) { toast("ไม่พบรายการ"); return; }
  const d = new FormData(f), v = {}; KX_MM.forEach(([k]) => { if (d.has(k)) v[k] = d.get(k); }); const m = mmSave(r, v); if (m) { toast(m); return; } commit(); route(); toast("บันทึกบริหารเงินแล้ว"); });
// the menu's name (asked for on 23 Nov 2569)
{ const pg = PROC_PAGES.find(p => p.id === "contracts"); if (pg) { pg.label = ["สัญญางบประมาณ", "Budget contracts"]; pg.sub = ["รายการงบประมาณทุกรายการพร้อมสถานะ สัญญา ส่งมอบ ตรวจรับ เบิกจ่าย และบริหารเงิน", "Every budget item with its state, contracts, deliveries, payments and money management"]; } }
// ค่าตอบแทนกรรมการ is taken off the menu for now (asked for on 23 Nov 2569); its code stays.
{ const pg = PROC_PAGES.find(p => p.id === "fees"); if (pg) { const r0 = pg.roles; Object.defineProperty(pg, "roles", { get: () => (window.FEES_ON ? r0 : []), configurable: true }); } }
// ทะเบียนโครงการ, แถวงบประมาณ GFMIS and นำเข้าไฟล์ (e-GP and GF) are taken off the menu for now (asked for on 23 Nov 2569); their code stays.
["pj-reg", "pj-row", "pj-imp"].forEach(id => { const n = NAV.find(x => x.id === id); if (n) { const r0 = n.roles; Object.defineProperty(n, "roles", { get: () => (window.PJ_ON ? r0 : []), configurable: true }); } });
