// Fisko-KlangFinance, round P87 (24 Nov 2569): every tab of ติดตามการใช้จ่าย (#dashboard) reads the same data.
// Found on review: each tab had its own year chip; the progress report listed a separate sample of projects; the alerts came only from
// the budget lines; drill-down and forecast read the old snapshot (S.dash) while "ปีปัจจุบัน (สด)" read the allocation lines, so the
// same unit showed different payments. Now:
//   1. one year, on top of the page, for every tab (it sets the procurement year BI.fy and the budget year SEL_FY together);
//   2. รายงานความก้าวหน้า: every budget item of the year from the follow-up form (work %, paid %, state, problem); the unit of the
//      item, the Treasury, Planning or the admin report the progress, and the report goes into the form and its Excel (columns 57, 60, 61);
//   3. การแจ้งเตือน: the problems from the work (a voucher sent back, a delivery not sent for payment, late delivery, a long wait at
//      e-GP) come first, then the alerts of the budget lines;
//   4. เจาะลึก and คาดการณ์สิ้นปี of the year in execution read the allocation lines, like ปีปัจจุบัน (สด) (allotted, plan to date, paid).

// ---------- 1. one year ----------
const MT_TABS = ["track", "tracklist", "procure", "live", "drill", "forecast", "alerts", "progress", "import"];
{ const base = menuFyChip; menuFyChip = function () { if (fyRouteId() === "dashboard") { document.querySelectorAll(".fy-filter").forEach(x => x.remove()); return; } return base.apply(this, arguments); }; }
{ const base = VIEWS.dashboard; VIEWS.dashboard = function () { const h = base(); if (!MT_TABS.includes(MON_TAB) || ["track", "tracklist", "procure"].includes(MON_TAB)) return h;
    const sel = `<div class="tf-top" style="display:flex;gap:10px;align-items:center;margin:0 0 6px">${prFySel().replace('margin:0 0 10px', 'margin:0')}</div>`;
    return h.replace(/(<div class="asof">)/, sel + "$1"); }; }
document.addEventListener("change", e => { const t = e.target; if (!t || !t.matches || !t.matches("[data-prfy]") || fyRouteId() !== "dashboard") return; const y = Number(t.value);
  if ((S.fyList || []).some(x => x.fy === y)) SEL_FY = y; if (typeof B4_FY !== "undefined" && S.allocs && S.allocs[y]) B4_FY = y; }, true);

// ---------- 2. the progress report ----------
// S.trkRep[item id] = [{ work, st, problem, by, t }] (newest last); the latest goes into the form
const MT_ST = ["ยังไม่เริ่มดำเนินการ", "อยู่ระหว่างดำเนินการจัดซื้อจัดจ้าง", "ลงนามสัญญาแล้ว อยู่ระหว่างดำเนินงาน", "ส่งมอบงานแล้ว", "ปิดโครงการแล้ว", "ล่าช้า ต้องเร่งรัด"];
const mtRep = id => { const a = (S.trkRep || {})[id] || []; return a[a.length - 1] || null; };
{ const base = prTrackBook; prTrackBook = function (fy) { const book = base(fy), rows = prDtRows(fy, false);
    book[0].rows.slice(5).forEach((row, i) => { const r = rows[i], x = r && mtRep(r.id); if (!x) return; if (x.work !== "" && x.work != null) row[56] = Number(x.work); if (x.st) row[59] = x.st; if (x.problem) row[60] = x.problem; });
    return book; }; flSpendBook = () => prTrackBook(BI.fy); }
const mtCan = r => ROLE === "admin" || ROLE === "plan" || isProcRole() || (["div", "divhead"].includes(ROLE) && r && unitName(me().unit) === r.unit);
let MT_OPEN = null;
function mtReport(id, v) { const r = prDtRows(BI.fy, false).find(x => x.id === id); if (!r) return "ไม่พบรายการ"; if (!mtCan(r)) return "รายงานได้เฉพาะสำนัก/กองของรายการ กองคลัง หรือกองแผนงาน";
  const w = v.work === "" ? "" : Number(v.work); if (w !== "" && !(w >= 0 && w <= 100)) return "ผลการดำเนินงานต้องอยู่ระหว่าง 0-100"; if (!MT_ST.includes(v.st)) return "เลือกสถานะ";
  ((S.trkRep = S.trkRep || {})[id] = S.trkRep[id] || []).push({ work: w, st: v.st, problem: String(v.problem || "").trim().slice(0, 500), by: me().id, t: nowIso() });
  audit(["รายงานความก้าวหน้า", "Reported progress"], `${id} · ${w === "" ? "-" : w + "%"} · ${v.st}`); return ""; }
MON_PANELS.progress = () => { const fy = BI.fy, D = prDtRows(fy, false), book = prTrackBook(fy)[0].rows.slice(5), mine = ["div", "divhead"].includes(ROLE) ? unitName(me().unit) : null;
  const it = D.map((r, i) => ({ r, row: book[i] || [], rep: mtRep(r.id) })).filter(x => !mine || x.r.unit === mine), mon = TODAY.slice(0, 7), notYet = it.filter(x => !x.rep || x.rep.t.slice(0, 7) !== mon);
  return `${PD_CSS}<div class="kpis" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px"><div class="kpi"><span class="l">รายการ</span><span class="v">${it.length}</span><span class="d sub">ปีงบประมาณ ${fy}</span></div><div class="kpi"><span class="l">รายงานแล้วเดือนนี้</span><span class="v">${it.length - notYet.length}</span><span class="d sub">ยังไม่รายงาน ${notYet.length}</span></div><div class="kpi"><span class="l">ผลการดำเนินงานเฉลี่ย</span><span class="v">${fmt(it.length ? it.reduce((s, x) => s + sptNum(x.row[56]), 0) / it.length : 0, 1)}%</span></div><div class="kpi"><span class="l">มีปัญหา/อุปสรรค</span><span class="v">${it.filter(x => x.row[60]).length}</span></div></div>
  <section class="panel mt-prog"><header><h2>รายงานความก้าวหน้ารายรายการ</h2><span class="sp"></span>${ROLE === "plan" && notYet.length ? `<button class="btn" type="button" id="mt-remind">เตือนหน่วยงานที่ยังไม่รายงานเดือนนี้ (${notYet.length})</button>` : ""}</header><div class="tbl-wrap"><table class="mt-prog-t"><thead><tr><th style="min-width:220px">รายการ</th><th class="n">งปม. (ลบ.)</th><th>ผลการดำเนินงาน (คอลัมน์ 57)</th><th class="n">เบิกจ่าย % (คอลัมน์ 59)</th><th>สถานะ (คอลัมน์ 60)</th><th>ปัญหา/อุปสรรค (คอลัมน์ 61)</th><th>รายงานล่าสุด</th><th></th></tr></thead><tbody>
  ${it.map(x => { const w = sptNum(x.row[56]), open = MT_OPEN === x.r.id;
    return `<tr><td><b style="font-weight:600">${esc(x.r.name)}</b><div class="sub">${esc(x.r.unit)}</div></td><td class="n">${fmt(x.r.alloc / 1e6, 2)}</td><td style="white-space:nowrap"><span class="db-bar" style="display:inline-block;width:80px;height:8px;border-radius:4px;background:var(--surface-2,rgba(0,0,0,.08));vertical-align:middle;overflow:hidden;margin-right:6px"><b style="display:block;height:100%;width:${Math.min(100, w)}%;background:#16a34a"></b></span>${fmt(w, 0)}%</td><td class="n">${fmt(sptNum(x.row[58]), 2)}</td><td>${esc(x.row[59] || "–")}</td><td>${x.row[60] ? `<span style="color:var(--bad)">${esc(x.row[60])}</span>` : `<span class="sub">–</span>`}</td><td>${x.rep ? `${esc(userName(x.rep.by))}<div class="sub">${fdate(x.rep.t, true)}</div>` : tag("ยังไม่รายงาน", "p-warn")}</td><td>${mtCan(x.r) ? `<button class="btn ghost" type="button" data-mtrep="${esc(x.r.id)}">${open ? "ปิด" : "รายงาน"}</button>` : ""}</td></tr>
    ${open ? `<tr><td colspan="8"><form data-mtform="${esc(x.r.id)}" class="inline-form" style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end"><div class="f"><label>ผลการดำเนินงานสะสม (ร้อยละ)</label><input name="work" type="number" min="0" max="100" step="any" value="${x.rep && x.rep.work !== "" ? x.rep.work : w}"></div><div class="f"><label>สถานะ ณ ปัจจุบัน *</label><select name="st">${MT_ST.map(s => `<option ${s === (x.rep ? x.rep.st : x.row[59]) ? "selected" : ""}>${s}</option>`).join("")}</select></div><div class="f" style="flex:1 1 280px"><label>ปัญหา/อุปสรรค</label><input name="problem" maxlength="500" value="${esc(x.rep ? x.rep.problem : "")}"></div><button class="btn primary" type="submit">บันทึกรายงาน</button></form></td></tr>` : ""}`; }).join("") || `<tr><td colspan="8" class="sub">ไม่มีรายการ</td></tr>`}</tbody></table></div><div class="body sub">ค่าที่รายงานลงฟอร์มติดตาม พ.ร.บ. และไฟล์ Excel ด้วย · ถ้าไม่รายงาน ระบบใช้ค่าจากงานจริง (ตรวจรับงวดสุดท้าย = 100%)</div></section>`; };
MON_BIND.progress = () => {};
document.addEventListener("click", e => { const t = e.target && e.target.closest ? e.target : null; if (!t) return;
  const b = t.closest("[data-mtrep]"); if (b) { MT_OPEN = MT_OPEN === b.dataset.mtrep ? null : b.dataset.mtrep; route(); return; }
  if (t.closest("#mt-remind")) { notify(["div", "divhead"], [`กองแผนงานขอให้รายงานความก้าวหน้าประจำเดือน ปีงบประมาณ ${BI.fy}`, `Planning asks for this month's progress report`], "dashboard"); audit(["เตือนรายงานความก้าวหน้า", "Reminded the units to report progress"], String(BI.fy)); toast("ส่งการแจ้งเตือนถึงสำนัก/กองแล้ว"); } });
document.addEventListener("submit", e => { const f = e.target; if (!f || !f.matches || !f.matches("[data-mtform]")) return; e.preventDefault(); const d = new FormData(f);
  const m = mtReport(f.dataset.mtform, { work: String(d.get("work") || ""), st: String(d.get("st") || ""), problem: String(d.get("problem") || "") }); if (m) { toast(m); return; } MT_OPEN = null; commit(); route(); toast("บันทึกรายงานความก้าวหน้าแล้ว"); });

// ---------- 3. the alerts from the work ----------
function mtWorkAlerts() { const fy = BI.fy, D = prDtRows(fy, false), book = prTrackBook(fy)[0].rows.slice(5);
  return D.map((r, i) => ({ r, p: book[i] && book[i][60] })).filter(x => x.p).map(x => ({ id: "wk-" + x.r.id, r: x.r, t: `${x.r.unit} · ${x.r.name}`, d: x.p })); }
{ const base = MON_PANELS.alerts; MON_PANELS.alerts = () => { const W = mtWorkAlerts();
    return `<section class="panel mt-work"><header><h2>จากการปฏิบัติงาน ปีงบประมาณ ${BI.fy}</h2><span class="sp"></span>${tag(`${W.length} เรื่อง`, W.length ? "p-bad" : "p-ok")}</header><div class="body">${W.map(a => `<div class="alert"><div class="ic" style="background:var(--bad-soft);color:var(--bad)">!</div><div><b>${esc(a.t)}</b><p>${esc(a.d)}</p></div>${a.r.k ? `<button class="btn ghost" type="button" data-flcon="${esc(a.r.k.id)}" style="align-self:center">เปิดสัญญา</button>` : ""}</div>`).join("") || `<span class="sub">ไม่มีปัญหาจากการปฏิบัติงาน</span>`}</div></section>${base()}`; }; }

// ---------- 4. drill-down and forecast of the year in execution read the allocation lines ----------
function mtLiveDash() { const A = S.allocs && S.allocs[B4_FY]; if (!A || B4_FY !== CUR_FY) return null; const mIdx = Math.max(0, Math.min(11, (new Date(TODAY).getFullYear() - (B4_FY - 544)) * 12 + new Date(TODAY).getMonth() - 9));
  const P = A.lines.map(l => { const b = bal(l); return { id: l.id, unit: l.unit, name: l.name, type: l.type, alloc: (b.allot || l.amount || 0) / 1e6, plan: sumv(l.plan.slice(0, mIdx + 1)) / 1e6, actual: (b.paid || 0) / 1e6 }; });
  const U = [...new Set(P.map(p => p.unit))].map(u => { const x = P.filter(p => p.unit === u); return { unit: u, alloc: sumv(x.map(p => p.alloc)), plan: sumv(x.map(p => p.plan)), actual: sumv(x.map(p => p.actual)) }; });
  return { m: mIdx + 1, dash: Object.assign({}, S.dash, { fy: B4_FY, asOf: TODAY, units: U, projects: P }) }; }
{ const base = VIEWS.dashboard; VIEWS.dashboard = function () { if (!["drill", "forecast"].includes(MON_TAB)) return base(); const L0 = mtLiveDash(); if (!L0) return base();
    const keep = S.dash, m0 = SNAP_M; S.dash = L0.dash; SNAP_M = L0.m; try { return base().replace(/(<section class="kpis"|<div class="tbl-wrap")/, `<div class="sub mt-src" style="margin:0 0 8px">ข้อมูลชุดเดียวกับ "ปีปัจจุบัน (สด)": วงเงินจัดสรร แผนสะสมถึงเดือนนี้ และผลเบิกจ่ายของบรรทัดงบประมาณปี ${B4_FY}</div>$1`); } finally { S.dash = keep; SNAP_M = m0; } }; }
{ const base = BIND.dashboard; BIND.dashboard = function () { if (!["drill", "forecast"].includes(MON_TAB)) return base.apply(this, arguments); const L0 = mtLiveDash(); if (!L0) return base.apply(this, arguments);
    const keep = S.dash; S.dash = L0.dash; try { return base.apply(this, arguments); } finally { S.dash = keep; } }; }
