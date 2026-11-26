// KlangFinance, round P85 (24 Nov 2569): the follow-up form of FY 2570 filled for the sample, and the year and the month on top.
// 1. The sample cases were made before the e-GP form (c.egp7), so their follow-up rows had no dates: every step showed 0. A case with
//    no e-GP form gets the dates of the steps it has passed (from its state), counted back from its contract or its last event, with
//    the e-GP number, the reference price, the winner and the price; the type of the older plan items; a problem where there is one
//    (late delivery, a long wait at e-GP, an appeal). Only empty cells are filled; a case with its e-GP form keeps its own data.
// 2. On the page ติดตามการใช้จ่าย the year moves up, in place of "ข้อมูล ณ", with a month: ทั้งปี, or one month (the steps done
//    and the money paid in that month, and the items that moved in it).
const TF_SEQ = [[22, 3, -100], [23, 3, -85], [24, 3, -75], [25, 3, -65], [27, 4, -60], [29, 4, -55], [30, 4, -50], [31, 5, -45], [32, 5, -37], [33, 6, -30], [34, 6, -25], [41, 7, -17], [42, 7, -15], [43, 8, -7], [44, 8, -3]];
const TF_DATE_COLS = [22, 23, 24, 25, 27, 29, 30, 31, 32, 33, 34, 41, 42, 43, 44, 46];
const tfAdd = (d, n) => new Date(Date.parse(String(d).slice(0, 10) + "T00:00:00Z") + n * 864e5).toISOString().slice(0, 10);
const tfType = p => { if (!p) return ""; const n = tx(p.name); if (/ก่อสร้าง|ปรับปรุงอาคาร|ซ่อมแซมอาคาร/.test(n)) return "สิ่งก่อสร้าง"; if (/ที่ปรึกษา/.test(n)) return "จ้างที่ปรึกษา"; return p.kind === "goods" ? "ครุภัณฑ์" : "จ้างเหมาบริการ"; };
function tfFill(row, p) {
  const c = p ? caseByPlan(p.id) : null; if (!row[8]) row[8] = tfType(p); if (!c || c.egp7) return;
  let s = 0; try { s = caseState(c); } catch (e) { s = c.state || 0; } const k = caseCon(c), ev = (S.caseEvents || []).filter(e => e.case === c.id).map(e => e.t).sort();
  const reached = TF_SEQ.filter(x => s >= x[1]); if (!reached.length) return;
  const last = reached[reached.length - 1][2], anchor = k && k.signed ? k.signed : ev.length ? ev[ev.length - 1] : tfAdd(TODAY, -5), base = k && k.signed ? tfAdd(k.signed, 0) : tfAdd(anchor, -last);
  reached.forEach(([col, , off]) => { if (row[col]) return; let d = tfAdd(base, off); if (d > TODAY) d = TODAY; row[col] = col === 31 ? `${prBE(d)} - ${prBE(tfAdd(d, 5))}` : prBE(d); });
  if (s >= 4 && !row[26]) { const so = (S.caseEvents || []).find(e => e.case === c.id && e.type === "sourcing"); row[26] = so ? so.detail : `EGP-70-${c.id.slice(-3)}`; }
  if (s >= 4 && !row[28]) row[28] = prM((Number(p.est) || 0) * 0.98);
  if (s >= 6 && !row[35]) row[35] = 1;
  if (s >= 7) { if (!row[36]) row[36] = k ? tx(k.vendor) : "ผู้เสนอราคาตัวอย่าง (สมมติ)"; if (!row[37]) row[37] = prM(k ? k.amount : (Number(p.est) || 0) * 0.95); }
  if (k && row[8] === "สิ่งก่อสร้าง" && !row[53]) row[53] = 1;
  if (!row[60]) { const x = k && k.cx, late = x ? kxLate(x) : 0, lastEv = ev.length ? ev[ev.length - 1].slice(0, 10) : "";
    const dl = (x && x.dl) || [], back = dl.find(d => d.chk && d.chk.st === "back"), idle = dl.find(d => d.accept && !d.sendPay && kxDiff(d.accept, TODAY) > 7);
    if (late > 0) row[60] = `ผู้รับจ้างส่งมอบงานล่าช้ากว่าสัญญา ${late} วัน`; else if (back) row[60] = `งวดที่ ${back.n}: ใบสำคัญถูกส่งกลับ (${back.chk.why})`; else if (idle) row[60] = `งวดที่ ${idle.n}: ตรวจรับแล้ว ${kxDiff(idle.accept, TODAY)} วัน ยังไม่นำส่งเบิกจ่าย`; else if (c.appeal && c.appeal.status) row[60] = "มีผู้เสนอราคาอุทธรณ์ ระหว่างพิจารณา";
    else if (!k && s >= 4 && s <= 7 && lastEv && kxDiff(lastEv, TODAY) > 21) row[60] = `ขั้น e-GP ค้างนาน ${kxDiff(lastEv, TODAY)} วัน`; else if (s >= 2 && s <= 3 && lastEv && kxDiff(lastEv, TODAY) > 30) row[60] = "สำนัก/กองยังไม่ส่งรายละเอียดขอซื้อขอจ้าง"; }
}
{ const base = prTrackBook; prTrackBook = function (fy) { const book = base(fy), rows = prDtRows(fy, false);
    book[0].rows.slice(5).forEach((row, i) => { const r = rows[i]; if (!r) return; const bi = ((S.bi && S.bi.rows) || []).find(y => y.id === r.id), p = r.p || (bi && bi.sent ? S.pplan.find(q => q.id === bi.sent.pp) : r.k ? famPlan(r.k.plan) : null); tfFill(row, p); });
    return book; }; flSpendBook = () => prTrackBook(BI.fy); }

// ---------- the month ----------
SPT.m = SPT.m == null ? "" : SPT.m;
const tfMon = v => { const m = String(v || "").match(/(\d{2})\/(\d{2})\/(\d{4})/); if (!m) return null; const mm = Number(m[2]), y = Number(m[3]); return { i: (mm + 2) % 12, fy: mm >= 10 ? y + 1 : y }; };
const tfIn = (v, fy, i) => { const x = tfMon(v); return !!x && x.fy === fy && x.i === i; };
function tfRows() { const all = sptRows(); if (SPT.m === "") return { all, ov: all }; const i = Number(SPT.m), fy = BI.fy, pay = prDtRows(fy, false);
  const keep = all.map((r, j) => ({ r, paid: pay[j] ? pay[j].act[i] || 0 : 0 })).filter(x => TF_DATE_COLS.some(c => tfIn(x.r[c], fy, i)) || x.paid > 0);
  const ov = keep.map(({ r, paid }) => { const y = r.slice(); TF_DATE_COLS.forEach(c => { if (!tfIn(y[c], fy, i)) y[c] = ""; }); y[57] = prM(paid); return y; }); return { all: keep.map(x => x.r), ov }; }
const tfTop = n => `<div class="asof tf-top" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">${prFySel().replace('margin:0 0 10px', 'margin:0')}<div class="row" style="gap:8px;align-items:center"><label class="sub" for="tf-mon">ข้อมูล</label><select id="tf-mon" data-tfmon><option value="">ทั้งปี</option>${BI_MON.map((m, i) => `<option value="${i}" ${SPT.m === String(i) ? "selected" : ""}>เดือน ${m}</option>`).join("")}</select></div><span class="sub">ตามฟอร์มติดตาม พ.ร.บ. (ส่งออก Excel ตามแบบฟอร์มใหม่ 67 คอลัมน์) · ${n} รายการ${SPT.m !== "" ? ` ที่มีความเคลื่อนไหวในเดือน ${BI_MON[Number(SPT.m)]}` : ""}</span><span class="sp" style="flex:1"></span><button class="btn primary" type="button" id="fl-xl-spend">ดาวน์โหลด Excel ฟอร์มติดตาม</button></div>`;
MON_PANELS.track = () => { const R = tfRows(); return `${PD_CSS}${R.ov.length ? sptOv(R.ov) : sptEmpty()}`; };
MON_PANELS.tracklist = () => { const R = tfRows(); return `${PD_CSS}${R.all.length ? `<section class="panel"><div class="body">${sptList(R.all)}</div></section>` : sptEmpty()}`; };
{ const base = VIEWS.dashboard; VIEWS.dashboard = function () { const h = base(); if (!["track", "tracklist", "procure"].includes(MON_TAB)) return h; const pr = MON_TAB === "procure", n = pr ? prDtRows(BI.fy, false).length : tfRows().all.length, top = pr ? tfTop(n).replace(/<div class="row" style="gap:8px;align-items:center"><label class="sub" for="tf-mon">[\s\S]*?<\/select><\/div>/, "").replace("ตามฟอร์มติดตาม พ.ร.บ. (ส่งออก Excel ตามแบบฟอร์มใหม่ 67 คอลัมน์) · ", "") : tfTop(n);
    const re = /<div class="asof">[\s\S]*?<\/select>[\s\S]*?<\/div>/; return re.test(h) ? h.replace(re, top) : h.replace(/(<div class="tabs" role="tablist")/, top + "$1"); }; }
document.addEventListener("change", e => { const t = e.target; if (t && t.matches && t.matches("[data-tfmon]")) { SPT.m = t.value; route(); } });
// the plan items of the older sample with no contract yet (at the unit or at e-GP) are rows of the year too, as the follow-up form lists
// every budget item; before, only those with a contract were rows
{ const base = prDtRows; prDtRows = function (fy, onlyCon) { const rows = base(fy, onlyCon); if (onlyCon || fy !== FAM_FY) return rows;
    S.pplan.filter(p => !p.biSrc && !flCon(p) && caseByPlan(p.id) && prFyOfPlan(p) === fy && !rows.some(r => r.id === p.id)).forEach(p => { const plan = Array(12).fill(0), amt = Number(p.est) || 0, u = famLine(p.line).unit; plan[Math.min(11, prMonIdx(p.month || TODAY))] = amt;
      rows.push({ id: p.id, k: null, p, area: "central", sheet: unitName(u), unit: unitName(u), commit: "ปีเดียว", years: "ปีเดียว", ebud: "", code: "", name: tx(p.name), fy, alloc: amt, plan, act: Array(12).fill(0), carry: 0, leftover: 0, cancel: 0, slow: 0, fast: 0, net: 0, pctWork: 0, proc: prProcOf(p), track: null }); });
    return rows; }; }

// ---------- P86 (24 Nov 2569): the tab ขั้นตอนจัดซื้อจัดจ้าง of ติดตามการใช้จ่าย reads the procurement module ----------
// Before it showed five milestones of a separate sample (S.proc). Now every budget item of the year with its state in the procurement
// flow, the same names as รายการจัดซื้อ / ติดตามเบิกจ่าย (ยังไม่นำส่งสำนัก/กอง ... ปิดโครงการแล้ว), the e-GP step it is at, and the
// dates of its milestones from the follow-up form; the counts on top filter the table.
let TF_PST = "";
const TF_MS = [[27, "ประกาศแผนจัดซื้อ"], [32, "ประกาศเชิญชวน"], [42, "ประกาศผู้ชนะ"], [46, "ลงนามสัญญา"]];
MON_PANELS.procure = () => { const fy = BI.fy, rows = prDtRows(fy, false), book = prTrackBook(fy)[0].rows.slice(5);
  const it = rows.map((r, i) => { const bi = ((S.bi && S.bi.rows) || []).find(y => y.id === r.id), p = r.p || (bi && bi.sent ? S.pplan.find(q => q.id === bi.sent.pp) : r.k ? famPlan(r.k.plan) : null), c = p ? caseByPlan(p.id) : null, k = r.k || (p ? flCon(p) : null);
    const st = bi && !bi.sent ? "plan" : p ? flStage(p, bi) : "plan", acc = k && k.cx ? (k.cx.dl || []).filter(d => d.accept).map(d => d.accept).sort().pop() || "" : "";
    return { r, row: book[i] || [], p, c, k, st, acc }; });
  const n = k => it.filter(x => x.st === k), show = TF_PST ? n(TF_PST) : it;
  return `${PD_CSS}<section class="panel"><header><h2>สถานะตามกระบวนการจัดซื้อจัดจ้าง ปีงบประมาณ ${fy}</h2><span class="sp"></span><span class="sub">คลิกเพื่อกรองตาราง</span></header><div class="body pd-st tf-pst">${DB_SPEND_ST.map(([k, t, who]) => `<button type="button" class="pd-go ${TF_PST === k ? "on" : ""}" data-tfpst="${k}" style="${TF_PST === k ? "border-color:var(--info);background:var(--info-soft)" : ""}"><div class="sub">${who}</div><b style="font-weight:600">${t}</b><div class="v">${n(k).length}</div><div class="sub">${fmt(n(k).reduce((s, x) => s + x.r.alloc, 0) / 1e6, 2)} ลบ.</div></button>`).join("")}</div></section>
  <section class="panel"><header><h2>รายการและขั้นตอน (${show.length})</h2><span class="sp"></span>${TF_PST ? `<button class="btn ghost" type="button" data-tfpst="">แสดงทั้งหมด</button>` : ""}</header><div class="tbl-wrap"><table class="proc tf-proc"><thead><tr><th style="min-width:220px">รายการ</th><th class="n">วงเงิน (ลบ.)</th>${TF_MS.map(([, t]) => `<th>${t}</th>`).join("")}<th>ตรวจรับงาน</th><th>สถานะ</th><th></th></tr></thead><tbody>
    ${show.map(x => `<tr><td><b style="font-weight:600">${esc(x.r.name)}</b><div class="sub">${esc(x.r.unit)}${x.p ? ` · <span class="mono">${esc(x.p.id)}</span>` : ""}</div></td><td class="n">${fmt(x.r.alloc / 1e6, 2)}</td>${TF_MS.map(([c]) => `<td class="ms ${x.row[c] ? "done" : ""}">${x.row[c] ? esc(String(x.row[c]).replace(/^\S+\s(?=\d{2}\/)/, "")) : `<span class="sub">–</span>`}</td>`).join("")}<td class="ms ${x.acc ? "done" : ""}">${x.acc ? prBE(x.acc) : `<span class="sub">–</span>`}</td>
      <td>${tag(pdStName(x.st), x.st === "done" ? "p-ok" : x.st === "plan" ? "p-mute" : x.st === "div" ? "p-warn" : "p-info")}${x.c ? `<div class="sub">${caseStTag(x.c)}</div>` : ""}</td><td>${x.c ? `<button class="btn ghost" type="button" data-tfcase="${esc(x.c.id)}">เปิด</button>` : ""}</td></tr>`).join("") || `<tr><td colspan="9" class="sub">ไม่มีรายการ</td></tr>`}</tbody></table></div><div class="body sub">วันที่จากฟอร์มติดตาม พ.ร.บ. (คอลัมน์ 28, 33, 43, 47) และวันที่ตรวจรับงวดล่าสุดของสัญญา · สถานะเดียวกับเมนูจัดซื้อจัดจ้าง</div></section>`; };
MON_BIND.procure = () => {};
document.addEventListener("click", e => { const t = e.target && e.target.closest ? e.target : null; if (!t) return; const a = t.closest("[data-tfpst]"); if (a) { TF_PST = a.dataset.tfpst; route(); return; }
  const c = t.closest("[data-tfcase]"); if (c) jump("case:" + c.dataset.tfcase); });

// ---------- P90 (24 Nov 2569): the province and the quantities come from the unit's details of the budget item ----------
// The unit fills จังหวัด/อำเภอ/ตำบล and the quantities (เมตร, ไร่, ครัวเรือน, แห่ง) in ขอซื้อขอจ้าง (จัดทำรายละเอียด); the follow-up form
// takes them into columns 11 and 51-54 (a quantity the Treasury entered on the contract stays first).
const tfReqOf = p => { if (!p) return null; const c = caseByPlan(p.id); return (c && caseReq(c)) || S.reqn.find(q => q.plan === p.id && q.status !== "superseded") || null; };
{ const base = prTrackBook; prTrackBook = function (fy) { const book = base(fy), rows = prDtRows(fy, false);
    book[0].rows.slice(5).forEach((row, i) => { const r = rows[i]; if (!r) return; const bi = ((S.bi && S.bi.rows) || []).find(y => y.id === r.id), p = r.p || (bi && bi.sent ? S.pplan.find(q => q.id === bi.sent.pp) : r.k ? famPlan(r.k.plan) : null), rq = tfReqOf(p), d = rq && rq.detail; if (!d) return;
      if (!row[10] && d.prov) row[10] = d.prov; [[50, "qLen"], [51, "qRai"], [52, "qHouse"], [53, "qPlace"]].forEach(([c, k]) => { const x = d[k]; if (x === "" || x == null) return; if (!row[c] || (c === 53 && row[c] === 1)) row[c] = Number(x); }); });
    return book; }; flSpendBook = () => prTrackBook(BI.fy); }
// the sample: the requisitions get a province and, where it fits the work, a quantity (fictional)
const TF_QTY = [[/ระบายน้ำ|ถนน|ทางเดิน|ท่อ/, { qLen: 850 }], [/ภูมิทัศน์|สวน/, { qRai: 3 }], [/ประปา|บ่อ|แหล่งน้ำ/, { qHouse: 120 }], [/ก่อสร้าง|อาคาร|ศาลา/, { qPlace: 1 }]];
function tfSeedReq(s) { const provs = [...new Set((s.geo || []).filter(g => !g.retired).map(g => g.prov).filter(Boolean))]; if (!provs.length) return;
  (s.reqn || []).forEach((rq, i) => { const d = (rq.detail = rq.detail || {}); if (!d.prov) { const pv = provs[i % provs.length], g = (s.geo || []).find(x => x.prov === pv && x.dist && x.sub); d.prov = pv; if (g) { d.amp = g.dist; d.tam = g.sub; } }
    const p = (s.pplan || []).find(x => x.id === rq.plan), n = p ? tx(p.name) : ""; if (["qLen", "qRai", "qHouse", "qPlace"].every(k => d[k] === "" || d[k] == null)) { const hit = TF_QTY.find(([re]) => re.test(n)); if (hit) Object.assign(d, hit[1]); } }); }
Object.keys(SEEDS).forEach(n => { const prev = SEEDS[n].seed; SEEDS[n].seed = () => { const s = prev(); try { tfSeedReq(s); } catch (e) {} return s; }; });
{ const base = route; route = function () { try { if (typeof S !== "undefined" && S && S.reqn && !S.tfReqSeed) { S.tfReqSeed = 1; tfSeedReq(S); } } catch (e) {} return base.apply(this, arguments); }; }
