// Fisko-KlangFinance, round P12 (15 Nov 2569): the KPI lists of the menu "Agency review", as asked after the review of the pages.
//  1. Every KPI list is grouped: a heading row names what the KPIs are under (the outcome, the agency service goal, the output/project or the
//     activity), so nobody has to use the filter to find out.
//  2. The KPIs of the service goals hang under the AGENCY SERVICE GOAL (not "under a goal/เป้าประสงค์"): label, choices, column and detail say so.
//  3. Output/project and activity get KPIs too (a new register of KPIs for them, shown on their tabs).
//  4. A KPI's target is entered by month, by quarter or by year (a choice on the form) and is SHOWN by quarter (Q1 to Q4 and the total of the
//     year being formulated), not as a 5-year list. Month to quarter: sum (average for a qualitative KPI); year only: split evenly over the quarters
//     (my assumption). The old 5-year targets stay in the data for the pages that still read them; the first year follows the new total.
// The sample KPIs of outputs and activities and the sample plans are samples of mine.

const KP_MODE = { month: ["รายเดือน", "Monthly"], quarter: ["รายไตรมาส", "Quarterly"], year: ["รายปี", "Yearly"] };
const kpMon = i => (typeof RQP_MON !== "undefined" ? RQP_MON[i] : [String(i + 1), String(i + 1)]);
function kpPlan(k) { return k.plan || (k.plan = { mode: "year", y: Number((k.targets || [])[0]) || 0, q: [0, 0, 0, 0], m: Array(12).fill(0) }); }
function kpQ(k) {
  const p = kpPlan(k), avg = k.kind === "qual";
  if (p.mode === "month") return [0, 1, 2, 3].map(i => { const a = p.m.slice(i * 3, i * 3 + 3).map(Number); const s = a.reduce((x, y) => x + y, 0); return avg ? s / 3 : s; });
  if (p.mode === "quarter") return p.q.map(Number);
  const y = Number(p.y) || 0; return avg ? [y, y, y, y] : [y / 4, y / 4, y / 4, y / 4];
}
function kpTotal(k) { const q = kpQ(k); const s = q.reduce((a, b) => a + b, 0); return k.kind === "qual" ? s / 4 : s; }
const kpFmt = v => fmt(Math.round(v * 100) / 100, v % 1 ? 2 : 0);
const kpHasVal = x => !(x === "" || x == null);
function kpFromForm(v) { return { mode: v.kmode || "year", y: Number(v.ky) || 0, q: [0, 1, 2, 3].map(i => Number(v["q" + i]) || 0), m: Array.from({ length: 12 }, (_, i) => Number(v["m" + i]) || 0) }; }
function kpCheck(v) {
  const need = ids => ids.filter(id => !kpHasVal(v[id]) || !(Number(v[id]) >= 0)), mk = ids => need(ids).slice(0, 1).map(f => ({ f, m: L("กรอกเป้าหมายให้ครบตามรูปแบบที่เลือก (ศูนย์ขึ้นไป)", "Fill the target for the chosen form (zero or more)") }));
  return v.kmode === "month" ? mk(Array.from({ length: 12 }, (_, i) => "m" + i)) : v.kmode === "quarter" ? mk(["q0", "q1", "q2", "q3"]) : mk(["ky"]);
}
function kpPlanFields(k) {
  const p = k ? kpPlan(k) : { mode: "quarter", y: "", q: ["", "", "", ""], m: Array(12).fill("") }, z = x => (x === 0 || x == null ? "" : x);
  return [{ id: "kmode", label: ["รูปแบบการกรอกเป้าหมาย", "How the target is entered"], type: "select", req: true, value: p.mode, opts: Object.keys(KP_MODE).map(m => [m, tx(KP_MODE[m])]), hint: L("เลือกแล้วกรอกเฉพาะกลุ่มช่องที่ตรงกับรูปแบบ ระบบสรุปเป็นรายไตรมาสให้", "Fill only the group that matches; the system sums it up by quarter") },
    { id: "ky", label: [`เป้าหมายรายปี (ปี ${FORM_FY})`, `Yearly target (FY${FORM_FY})`], type: "number", min: 0, value: z(p.y) },
    ...[0, 1, 2, 3].map(i => ({ id: "q" + i, label: [`เป้าหมายไตรมาส ${i + 1}`, `Target Q${i + 1}`], type: "number", min: 0, value: z(p.q[i]) })),
    ...Array.from({ length: 12 }, (_, i) => ({ id: "m" + i, label: [`ไตรมาส ${Math.floor(i / 3) + 1} · เป้าหมายเดือน ${kpMon(i)[0]}`, `Q${Math.floor(i / 3) + 1} · target ${kpMon(i)[1]}`], type: "number", min: 0, value: z(p.m[i]) }))];
}
const kpPlanView = k => { const p = kpPlan(k), q = kpQ(k);
  return `<h3 style="font-size:14px;margin:12px 0 4px">${L("เป้าหมายปี", "Target for FY")} ${FORM_FY} · ${tx(KP_MODE[p.mode])}</h3><div class="tbl-wrap"><table><thead><tr>${[1, 2, 3, 4].map(i => `<th class="n">${L("ไตรมาส", "Q")} ${i}</th>`).join("")}<th class="n">${L("รวม", "Total")}</th></tr></thead><tbody><tr>${q.map(v => `<td class="n">${kpFmt(v)}</td>`).join("")}<td class="n"><b>${kpFmt(kpTotal(k))}</b></td></tr></tbody></table></div>
    ${p.mode === "month" ? `<div class="tbl-wrap"><table><thead><tr>${p.m.map((_, i) => `<th class="n">${tx(kpMon(i))}</th>`).join("")}</tr></thead><tbody><tr>${p.m.map(v => `<td class="n">${kpFmt(Number(v))}</td>`).join("")}</tr></tbody></table></div>` : ""}`; };
// the result of a KPI is entered by month too (Oct to Sep) and shown by quarter
const kpRes = k => (k.res && Array.isArray(k.res.m) ? k.res : (k.res = { m: Array(12).fill(0) }));
const kpResQ = k => [0, 1, 2, 3].map(i => { const s = kpRes(k).m.slice(i * 3, i * 3 + 3).map(v => Number(v) || 0).reduce((a, b) => a + b, 0); return k.kind === "qual" ? s / 3 : s; });
const kpResTotal = k => { const s = kpResQ(k).reduce((a, b) => a + b, 0); return k.kind === "qual" ? s / 4 : s; };
const kpResCan = k => ROLE === "plan" || (k.owner && k.owner === me().unit);
const kpCols = () => [...[1, 2, 3, 4].map(i => ({ h: [`ไตรมาส ${i}`, `Q${i}`], n: true, c: k => kpFmt(kpQ(k)[i - 1]) })), { h: ["รวมปีนี้", "Year total"], n: true, c: k => `<b>${kpFmt(kpTotal(k))}</b>` },
  { h: ["ผลรวมปีนี้", "Result, year"], n: true, c: k => `${kpFmt(kpResTotal(k))}${kpTotal(k) ? ` <span class="sub">(${fmt(kpResTotal(k) / kpTotal(k) * 100, 0)}%)</span>` : ""}` }];
const kpResView = (key, k) => { const can = kpResCan(k), m = kpRes(k).m, tq = kpQ(k), rq = kpResQ(k), ds = can ? "" : "disabled";
  return `<p class="sub">${L("ผลการดำเนินงานรายเดือน จัดเป็นกลุ่มไตรมาส เริ่มต.ค. ถึง ก.ย. ไตรมาสคือผลรวมของเดือน (เชิงคุณภาพเฉลี่ย)", "Monthly results grouped in quarters from Oct to Sep; a quarter is the sum of its months (the average for a qualitative KPI)")}${can ? "" : ` · ${L("กองแผนงานและหน่วยงานเจ้าของกรอกผล", "Planning and the owning unit enter results")}`}</p>
    <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px">${[0, 1, 2, 3].map(g => `<div style="border:1px solid var(--line);border-radius:8px;padding:6px 8px"><div class="sub" style="margin-bottom:4px"><b style="font-weight:600">${L("ไตรมาส", "Quarter")} ${g + 1}</b></div><div style="display:flex;gap:4px">${[0, 1, 2].map(n => `<input type="number" min="0" step="any" data-kres="${key}|${k.id}|${g * 3 + n}" value="${Number(m[g * 3 + n]) ? m[g * 3 + n] : ""}" ${ds} placeholder="${tx(kpMon(g * 3 + n))}" aria-label="${L("ผล", "Result")} ${tx(kpMon(g * 3 + n))}" style="min-width:0;width:100%">`).join("")}</div></div>`).join("")}</div>
    <div class="tbl-wrap"><table><thead><tr><th></th>${[1, 2, 3, 4].map(i => `<th class="n">${L("ไตรมาส", "Q")} ${i}</th>`).join("")}<th class="n">${L("รวมปีนี้", "Year")}</th></tr></thead><tbody><tr><td>${L("เป้าหมาย", "Target")}</td>${tq.map(v => `<td class="n">${kpFmt(v)}</td>`).join("")}<td class="n"><b>${kpFmt(kpTotal(k))}</b></td></tr><tr><td>${L("ผล", "Result")}</td>${rq.map(v => `<td class="n">${kpFmt(v)}</td>`).join("")}<td class="n"><b>${kpFmt(kpResTotal(k))}</b></td></tr><tr><td>${L("ร้อยละของเป้า", "% of target")}</td>${rq.map((v, i) => `<td class="n">${tq[i] ? fmt(v / tq[i] * 100, 0) + "%" : "–"}</td>`).join("")}<td class="n">${kpTotal(k) ? fmt(kpResTotal(k) / kpTotal(k) * 100, 0) + "%" : "–"}</td></tr></tbody></table></div>`; };
document.addEventListener("change", e => {
  const el = e.target.closest && e.target.closest("[data-kres]"); if (!el) return; const [key, id, i] = el.dataset.kres.split("|"), D = CRUD.defs[key], k = D && D.list().find(x => String(D.id(x)) === id); if (!k || !kpResCan(k)) return;
  kpRes(k).m[Number(i)] = Math.max(0, Number(el.value) || 0); audit(["บันทึกผลตัวชี้วัด", "Entered a KPI result"], `${id} ${tx(kpMon(Number(i)))}`); commit(); route();
});

// the shared patch of a KPI register: quarter columns, the three ways to enter the target, a check, the detail
function kpPatch(name, opt) {
  const d = CRUD.defs[name]; if (!d || d.kpPatched) return; d.kpPatched = true; const f0 = d.fields, c0 = d.create.run, e0 = d.edit.run, k0 = d.check, w0 = d.view, l0 = d.list;
  const at = d.cols.findIndex(c => String(c.h[0]).startsWith("เป้า ")); d.cols = d.cols.filter(c => !String(c.h[0]).startsWith("เป้า ")); d.cols.splice(at < 0 ? d.cols.length : at, 0, ...kpCols());
  d.fields = k => { let fs = f0(k), i = fs.findIndex(x => /^t\d$/.test(x.id)); fs = fs.filter(x => !/^t\d$/.test(x.id)).map(x => (opt.fieldFix ? opt.fieldFix(x, k) : x)); fs.splice(i < 0 ? fs.length : i, 0, ...kpPlanFields(k)); return fs; };
  d.check = (v, k) => [...(k0 ? k0(v, k) : []), ...kpCheck(v)];
  const tot = v => { const p = kpFromForm(v), tmp = { kind: v.ikind || "quant", plan: p }; return kpTotal(tmp); };
  d.create.run = v => { const v2 = Object.assign({}, v); for (let i = 0; i < 5; i++) v2["t" + i] = tot(v); const k = c0(v2); if (k) k.plan = kpFromForm(v); return k; };
  d.edit.run = (k, v) => { const v2 = Object.assign({}, v); for (let i = 0; i < 5; i++) v2["t" + i] = i === 0 ? tot(v) : (k.targets || [])[i]; e0(k, v2); k.plan = kpFromForm(v); };
  d.view = k => (opt.viewFix ? opt.viewFix(w0(k), k) : w0(k)) + kpPlanView(k);
  if (opt.list) d.list = () => opt.list(l0());
  if (opt.group) d.group = opt.group;
  const t0 = d.tabs; d.tabs = k => [...(t0 ? t0(k) : []), ["res", L("ผลการดำเนินงาน", "Results"), kpResView(name, k)]];
}
const goalOf = k => { const x = allKpis().find(y => y.k === k); return x ? x.g : null; };
kpPatch("stKpi", {
  group: k => { const g = goalOf(k); return g ? `${L("ภายใต้เป้าหมายการให้บริการหน่วยงาน", "Under the agency service goal")} ${g.id} · ${tx(g.name)}` : ""; },
  fieldFix: (f, k) => (f.id !== "goal" ? f : Object.assign({}, f, { label: ["ภายใต้เป้าหมายการให้บริการหน่วยงาน", "Under the agency service goal"], show: k && (() => { const g = goalOf(k); return g ? `${g.id} · ${tx(g.name)}` : ""; })(), opts: S.strategy.items.flatMap(st => st.goals.filter(g => !g.retired)).map(g => [g.id, `${g.id} · ${tx(g.name)}`]) })),
  viewFix: h => h.replace("ภายใต้<", "ภายใต้เป้าหมายการให้บริการหน่วยงาน<"),
});
kpPatch("agOutK", {
  list: rows => rows.slice().sort((a, b) => String(a.out).localeCompare(String(b.out))),
  group: k => { const o = (S.agOut || []).find(x => x.id === k.out); return `${L("ภายใต้ผลสัมฤทธิ์หน่วยงาน", "Under the agency outcome")} ${k.out}${o ? " · " + tx(o.name) : ""}`; },
});

// ---------- KPIs of outputs/projects and activities ----------
const nkNodes = lvl => ((S.structure || {})[FORM_FY] || []).filter(n => n.lvl === lvl && !n.retired);
const nkNode = (lvl, id) => ((S.structure || {})[FORM_FY] || []).find(n => n.id === id && n.lvl === lvl);
function nodeKpiDef(key, lvl, noun, under) {
  const parentOf = k => { const n = nkNode(lvl, k.node); return n ? `${n.code} · ${tx(n.name)}` : k.node; };
  CRUD.def(key, {
    noun, st: RET_ST, live: true, list: () => (S.nodeKpi || []).filter(k => k.lvl === lvl).sort((a, b) => String(a.node).localeCompare(String(b.node))), id: k => k.id, title: k => tx(k.name), sub: k => parentOf(k), status: k => (k.retired ? "retired" : "live"), gone: k => !!k.retired, search: k => `${k.id} ${k.name.join(" ")} ${parentOf(k)}`,
    group: k => `${tx(under)} ${parentOf(k)}`,
    filters: [{ id: "node", label: under, opts: () => nkNodes(lvl).map(n => [n.id, `${n.code} · ${tx(n.name)}`]), get: k => k.node }],
    cols: [{ h: ["ตัวชี้วัด", "KPI"], c: k => `<span class="mono sub">${k.id}</span> ${esc(tx(k.name))}` }, { h: ["ประเภท", "Kind"], c: k => `<span class="sub">${tx(IND_TYPES[k.kind || "quant"])}</span>` }, { h: ["หน่วย", "Unit"], c: k => `<span class="sub">${tx(k.unit)}</span>` }, ...kpCols()],
    fields: k => [{ id: "node", label: under, type: "select", req: true, wide: true, value: k ? k.node : "", lock: !!k, show: k && parentOf(k), opts: nkNodes(lvl).map(n => [n.id, `${n.code} · ${tx(n.name)}`]) },
      { id: "th", label: ["ชื่อตัวชี้วัด", "KPI name"], req: true, wide: true, value: k ? k.name[0] : "" },
      { id: "ikind", label: ["ประเภทตัวชี้วัด", "Kind of indicator"], type: "select", req: true, value: k ? k.kind || "quant" : "quant", opts: Object.keys(IND_TYPES).map(t => [t, tx(IND_TYPES[t])]) },
      { id: "unit", label: ["หน่วยนับ", "Unit of measure"], req: true, type: "select", value: k ? k.unit[0] : "", opts: indAllUnits().map(u => [u, u]) }, ...kpPlanFields(k)],
    tabs: k => [["res", L("ผลการดำเนินงาน", "Results"), kpResView(key, k)]],
    check: v => kpCheck(v),
    create: { can: spCan, label: [`เพิ่ม${noun[0]}`, `Add: ${noun[1]}`], run: v => { const k = { id: "NK-" + String(maxNo((S.nodeKpi || []).map(y => y.id), /(\d+)$/) + 1).padStart(3, "0"), lvl, node: v.node, name: [v.th, v.th], kind: v.ikind, unit: [v.unit, v.unit], plan: kpFromForm(v) }; (S.nodeKpi = S.nodeKpi || []).push(k); audit([`เพิ่ม${noun[0]}`, `Added: ${noun[1]}`], `${k.id} ${v.th}`); return k; } },
    edit: { can: k => spCan() && !k.retired, run: (k, v) => { Object.assign(k, { name: [v.th, v.th], kind: v.ikind, unit: [v.unit, v.unit], plan: kpFromForm(v) }); audit([`แก้${noun[0]}`, `Edited: ${noun[1]}`], k.id); } },
    acts: k => (spCan() ? retireAct(noun, () => false, y => { S.nodeKpi = S.nodeKpi.filter(z => z !== y); })(k) : []),
    view: k => kv([[L("รหัส", "Code"), k.id], [tx(under), esc(parentOf(k))], [L("ตัวชี้วัด", "KPI"), esc(tx(k.name))], [L("ประเภท", "Kind"), tx(IND_TYPES[k.kind || "quant"])], [L("หน่วยนับ", "Unit"), tx(k.unit)]]) + kpPlanView(k),
  });
}
nodeKpiDef("outKpi", "output", ["ตัวชี้วัดของผลผลิต/โครงการ", "KPI of an output/project"], ["ภายใต้ผลผลิต/โครงการ", "Under the output/project"]);
nodeKpiDef("actKpi", "activity", ["ตัวชี้วัดของกิจกรรม", "KPI of an activity"], ["ภายใต้กิจกรรม", "Under the activity"]);
{
  const o = STRAT["ag-outp"], a = STRAT["ag-act"], oo = STRAT["ag-out"], kk = STRAT.kpis, fix = s => s.split("ตัวชี้วัดและค่าเป้าหมาย 5 ปี").join("ตัวชี้วัดของเป้าหมายการให้บริการหน่วยงาน และเป้าหมายรายไตรมาส").split("KPIs and 5-year targets").join("KPIs of the agency service goals, with quarterly targets").split("ตัวชี้วัดของผลสัมฤทธิ์ และค่าเป้าหมาย 5 ปี").join("ตัวชี้วัดของผลสัมฤทธิ์ และเป้าหมายรายไตรมาส").split("KPIs of the outcomes and 5-year targets").join("KPIs of the outcomes, with quarterly targets");
  STRAT["ag-outp"] = () => o() + crudList("outKpi", { head: `<h2>${L("ตัวชี้วัดของผลผลิต/โครงการ และเป้าหมายรายไตรมาส", "KPIs of the outputs/projects, with quarterly targets")}</h2>` });
  STRAT["ag-act"] = () => a() + crudList("actKpi", { head: `<h2>${L("ตัวชี้วัดของกิจกรรม และเป้าหมายรายไตรมาส", "KPIs of the activities, with quarterly targets")}</h2>` });
  STRAT["ag-out"] = () => fix(oo()); STRAT.kpis = () => fix(kk());
}
["outKpi", "actKpi"].forEach(key => { const d = CRUD.defs[key], f = d.fields; d.noEn = true; d.fields = (...a) => f(...a).filter(x => x.id !== "en"); });

// ---------- seed: sample plans and sample KPIs of outputs and activities ----------
Object.keys(SEEDS).forEach(k => {
  const prev = SEEDS[k].seed;
  SEEDS[k].seed = () => {
    const s = prev(), nm = a => [a, a];
    const modes = ["month", "quarter", "year"], setPlan = (kp, i) => { const t = Number((kp.targets || [])[0]) || 0, mode = modes[i % 3]; kp.plan = mode === "month" ? { mode, y: 0, q: [0, 0, 0, 0], m: Array(12).fill(Math.round(t / 12 * 100) / 100) } : mode === "quarter" ? { mode, y: 0, q: [t * 0.1, t * 0.2, t * 0.3, t * 0.4].map(v => Math.round(v * 100) / 100), m: Array(12).fill(0) } : { mode, y: t, q: [0, 0, 0, 0], m: Array(12).fill(0) }; };
    let n = 0; (s.strategy.items || []).forEach(st => st.goals.forEach(g => (g.kpis || []).forEach(kp => setPlan(kp, n++)))); (s.agKpi || []).forEach(kp => setPlan(kp, n++));
    const nodes = ((s.structure || {})[FORM_FY] || []), outs = nodes.filter(x => x.lvl === "output" && !x.retired).slice(0, 8), acts = nodes.filter(x => x.lvl === "activity" && !x.retired).slice(0, 8);
    s.nodeKpi = []; const add = (lvl, x, i) => s.nodeKpi.push({ id: "NK-" + String(s.nodeKpi.length + 1).padStart(3, "0"), lvl, node: x.id, name: nm(`ร้อยละความสำเร็จของ${lvl === "output" ? "ผลผลิต/โครงการ" : "กิจกรรม"} ${x.code} (ตัวอย่าง)`), kind: "quant", unit: nm("ร้อยละ"), plan: i % 2 ? { mode: "quarter", y: 0, q: [10, 30, 30, 30], m: Array(12).fill(0) } : { mode: "year", y: 100, q: [0, 0, 0, 0], m: Array(12).fill(0) } });
    outs.forEach((x, i) => add("output", x, i)); acts.forEach((x, i) => add("activity", x, i));
    return s;
  };
});
