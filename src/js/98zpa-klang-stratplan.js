// KlangFinance, menu round M2 (13 Nov 2569): the eight tabs of the menu "Strategy and programmes", the register of the agency's
// programmes and the register of kinds of account. Asked for in the user's list (heading "จัดทำงบประมาณ", menu "ยุทธศาสตร์และแผนงาน"):
//   tab 1  National strategy (e-MENSCR)                       built in round A4 (browse, summary, import as three segments)
//   tab 2  Programmes by the strategy structure               the programmes the Budget Bureau gives (the budget structure) and
//                                                             their links to the national plans (built in round A4, renamed)
//   tab 3  Vision and mission                                 new: one vision text and one mission text for each fiscal year (no list)
//   tab 4  Agency outcomes (with KPIs)                        new: outcomes of the agency and the KPI lines under each
//   tab 5  Agency strategies                                  the agency strategies that were on "map" (strategies only)
//   tab 6  Agency service goals (with KPIs)                   the goals under the strategies and their KPIs and 5-year targets
//   tab 7  Agency programmes                                  new: the agency's own programmes, each linked to a programme of the structure
//   tab 8  Budget overview by strategy                        new: requests by national strategy, master plan or agency strategy,
//                                                             split by the kind chosen (budget type, recurrent or investment, kind of
//                                                             request, kind of output)
//   after  the older tabs that are not in the list (linkage, alignment, project bank, plan revision) stay at the end, unchanged.
// Registers (menu "ทะเบียนโครงสร้างงบประมาณ"): agency programmes (RG0) and kinds of account (RG3). The four kinds of account 1 to 4 were
// check boxes on the request; their names and notes now come from the register (Planning edits the names; the four stay).
// Superseded in part on 13 Nov 2569 by file 98zpb (menu round M4): the tabs for the agency's own items moved to the menu "Agency review".
// The sample rows (vision, outcomes, agency programmes, account names) are samples of mine, marked as such; Planning replaces them.

const SP_APP = "DPT Budget";
const spCan = () => ROLE === "plan";
const spFv = (v, k, d) => (v && v[k] !== undefined ? v[k] : d);

// ---------- vision and mission: one value per fiscal year ----------
// 13 Nov 2569, at the user's word ("one value per year, no list"): S.agVm = { [fiscal year]: { vision: [th, en], mission: [th, en] } }.
// One vision text and one mission text for each year, edited in place on the tab by Planning while the year is open; the year is the
// one chosen in the page header (the year chip). No list, no rows.
const vmYear = () => SEL_FY || FORM_FY;
const vmGet = y => (S.agVm && !Array.isArray(S.agVm) && S.agVm[y]) || null;
const vmCan = y => spCan() && fyOpen(y);
STRAT["ag-vm"] = () => {
  const y = vmYear(), v = vmGet(y), can = vmCan(y), prev = vmGet(y - 1), area = (id, th, en, val) => `<div class="f full"><label for="${id}">${L(th, en)}</label><textarea id="${id}" rows="3" style="width:100%" ${can ? "" : "disabled"}>${esc(val || "")}</textarea></div>`;
  const show = (th, en, tv) => `<div style="margin-bottom:14px"><div class="sub">${L(th, en)}</div><p style="font-size:17px;margin:4px 0 0">${tv ? esc(tx(tv)) : `<span class="sub">${L("ยังไม่ได้กำหนด", "Not set")}</span>`}</p></div>`;
  return `<section class="panel"><header><h2>${L("วิสัยทัศน์และพันธกิจ ปี", "Vision and mission, FY")} ${y}</h2><span class="sp"></span>${tag(v ? L("ตัวอย่าง กองแผนงานแก้ได้", "Sample; Planning edits") : L("ยังไม่ได้กำหนดสำหรับปีนี้", "Not set for this year"), v ? "p-mute" : "p-warn")}</header><div class="body">
    ${can ? `${area("vm-vth", "วิสัยทัศน์", "Vision", v && v.vision[0])}${area("vm-mth", "พันธกิจ", "Mission", v && v.mission[0])}
      <div class="row"><button class="btn primary" type="button" id="vm-save">${L("บันทึก", "Save")}</button>${!v && prev ? `<button class="btn" type="button" id="vm-copy">${L("คัดลอกจากปี", "Copy from FY")} ${y - 1}</button>` : ""}</div>`
      : `${show("วิสัยทัศน์", "Vision", v && v.vision)}${show("พันธกิจ", "Mission", v && v.mission)}<p class="sub">${!spCan() ? L("เฉพาะกองแผนงานแก้ได้", "Only Planning edits this") : L("ปีงบประมาณนี้ปิดแล้ว แก้ไม่ได้", "This fiscal year is closed, so it can't be changed")}</p>`}</div></section>`;
};
STRAT_BIND["ag-vm"] = () => {
  const y = vmYear(), g = id => { const e = document.querySelector(id); return e ? e.value.trim() : ""; };
  const sv = document.querySelector("#vm-save"); if (sv) sv.onclick = () => {
    if (!vmCan(y)) return; const vth = g("#vm-vth"), mth = g("#vm-mth");
    if (!vth || !mth) { toast(L("ใส่วิสัยทัศน์และพันธกิจภาษาไทยให้ครบ", "Give the vision and the mission in Thai")); return; }
    if (!S.agVm || Array.isArray(S.agVm)) S.agVm = {};
    S.agVm[y] = { vision: [vth, vth], mission: [mth, mth] };
    audit(["บันทึกวิสัยทัศน์และพันธกิจ", "Saved the vision and mission"], `ปี ${y}`); commit(); route(); toast(L("บันทึกแล้ว", "Saved"));
  };
  const cp = document.querySelector("#vm-copy"); if (cp) cp.onclick = () => { const p = vmGet(y - 1); if (!p || !vmCan(y)) return; (S.agVm = S.agVm || {})[y] = { vision: p.vision.slice(), mission: p.mission.slice() }; audit(["คัดลอกวิสัยทัศน์และพันธกิจจากปีก่อน", "Copied the vision and mission from last year"], `${y - 1} → ${y}`); commit(); route(); };
};

// ---------- agency outcomes, with KPIs ----------
const agOutUsed = o => (S.agKpi || []).some(k => k.out === o.id);
CRUD.def("agOut", {
  noun: ["ผลสัมฤทธิ์หน่วยงาน", "Agency outcome"], st: RET_ST, live: true,
  list: () => S.agOut || [], id: o => o.id, title: o => tx(o.name), sub: o => `${(S.agKpi || []).filter(k => k.out === o.id && !k.retired).length} ${L("ตัวชี้วัด", "KPIs")}`,
  status: o => (o.retired ? "retired" : "live"), gone: o => !!o.retired, search: o => `${o.id} ${o.name.join(" ")}`,
  cols: [{ h: ["รหัส", "Code"], c: o => `<span class="mono">${o.id}</span>` }, { h: ["ผลสัมฤทธิ์", "Outcome"], c: o => esc(tx(o.name)) }, { h: ["ตัวชี้วัด", "KPIs"], n: true, c: o => (S.agKpi || []).filter(k => k.out === o.id && !k.retired).length }],
  fields: o => [{ id: "th", label: ["ผลสัมฤทธิ์ (ภาษาไทย)", "Outcome (Thai)"], req: true, wide: true, value: o ? o.name[0] : "" }, { id: "en", label: ["ภาษาอังกฤษ", "English"], wide: true, value: o ? o.name[1] : "" }, { id: "note", label: ["หมายเหตุ", "Note"], type: "textarea", wide: true, value: o ? o.note || "" : "" }],
  create: { can: spCan, label: ["เพิ่มผลสัมฤทธิ์", "Add an outcome"], run: v => { const o = { id: "AO-" + String(maxNo((S.agOut || []).map(y => y.id), /(\d+)$/) + 1).padStart(3, "0"), name: [v.th, v.en || v.th], note: v.note || "" }; (S.agOut = S.agOut || []).push(o); audit(["เพิ่มผลสัมฤทธิ์หน่วยงาน", "Added an agency outcome"], `${o.id} ${v.th}`); return o; } },
  edit: { can: o => spCan() && !o.retired, run: (o, v) => { Object.assign(o, { name: [v.th, v.en || v.th], note: v.note || "" }); audit(["แก้ผลสัมฤทธิ์หน่วยงาน", "Edited an agency outcome"], o.id); } },
  acts: o => (spCan() ? retireAct(["ผลสัมฤทธิ์หน่วยงาน", "agency outcome"], agOutUsed, y => { S.agOut = S.agOut.filter(z => z !== y); })(o) : []),
  view: o => kv([[L("รหัส", "Code"), o.id], [L("ผลสัมฤทธิ์", "Outcome"), esc(tx(o.name))], o.note && [L("หมายเหตุ", "Note"), esc(o.note)], [L("ตัวชี้วัด", "KPIs"), (S.agKpi || []).filter(k => k.out === o.id).map(k => `${k.id} ${esc(tx(k.name))}`).join("<br>") || "–"]]),
});
CRUD.def("agOutK", {
  noun: ["ตัวชี้วัดของผลสัมฤทธิ์", "KPI of an outcome"], st: RET_ST, live: true,
  list: () => S.agKpi || [], id: k => k.id, title: k => tx(k.name), sub: k => `${k.out} · ${tx(k.unit)}`, status: k => (k.retired ? "retired" : "live"), gone: k => !!k.retired, search: k => `${k.id} ${k.name.join(" ")} ${k.out}`,
  filters: [{ id: "out", label: ["ผลสัมฤทธิ์", "Outcome"], opts: () => (S.agOut || []).map(o => [o.id, `${o.id} ${tx(o.name)}`]), get: k => k.out }],
  cols: [{ h: ["ตัวชี้วัด", "KPI"], c: k => `<span class="mono sub">${k.out}·${k.id}</span> ${esc(tx(k.name))}` }, { h: ["หน่วย", "Unit"], c: k => `<span class="sub">${tx(k.unit)}</span>` }, { h: ["ฐาน", "Baseline"], n: true, c: k => fmtv(k.base) },
    { h: [`เป้า ${PLAN_YEARS[0]}`, `${PLAN_YEARS[0]} target`], n: true, c: k => `<b>${fmtv(k.targets[0])}</b>` }, { h: [`เป้า ${PLAN_YEARS[4]}`, `${PLAN_YEARS[4]} target`], n: true, c: k => fmtv(k.targets[4]) }],
  fields: k => [{ id: "out", label: ["ภายใต้ผลสัมฤทธิ์", "Under outcome"], type: "select", req: true, wide: true, value: k ? k.out : "", lock: !!k, show: k && `${k.out}`, opts: (S.agOut || []).filter(o => !o.retired).map(o => [o.id, `${o.id} · ${tx(o.name)}`]) },
    { id: "th", label: ["ชื่อตัวชี้วัด", "KPI name"], req: true, wide: true, value: k ? k.name[0] : "" }, { id: "en", label: ["ภาษาอังกฤษ", "English name"], wide: true, value: k ? k.name[1] : "" },
    { id: "unit", label: ["หน่วยนับ", "Unit of measure"], req: true, value: k ? k.unit[0] : "" }, { id: "base", label: ["ค่าฐาน", "Baseline"], type: "number", req: true, min: 0, value: k ? k.base : 0 },
    ...PLAN_YEARS.map((y, i) => ({ id: "t" + i, label: [`เป้าปี ${y}`, `${y} target`], type: "number", req: true, min: 0, value: k ? k.targets[i] : "" }))],
  create: { can: spCan, label: ["เพิ่มตัวชี้วัด", "Add a KPI"], run: v => { const k = { id: "AK-" + String(maxNo((S.agKpi || []).map(y => y.id), /(\d+)$/) + 1).padStart(3, "0"), out: v.out, name: [v.th, v.en || v.th], unit: [v.unit, v.unit], base: Number(v.base), targets: PLAN_YEARS.map((_, i) => Number(v["t" + i])) }; (S.agKpi = S.agKpi || []).push(k); audit(["เพิ่มตัวชี้วัดของผลสัมฤทธิ์", "Added a KPI to an outcome"], `${k.id} ${v.th}`); return k; } },
  edit: { can: k => spCan() && !k.retired, run: (k, v) => { Object.assign(k, { name: [v.th, v.en || v.th], unit: [v.unit, v.unit], base: Number(v.base), targets: PLAN_YEARS.map((_, i) => Number(v["t" + i])) }); audit(["แก้ตัวชี้วัดของผลสัมฤทธิ์", "Edited a KPI of an outcome"], k.id); } },
  acts: k => (spCan() ? retireAct(["ตัวชี้วัด", "KPI"], () => false, y => { S.agKpi = S.agKpi.filter(z => z !== y); })(k) : []),
  view: k => kv([[L("ภายใต้", "Under"), esc(((S.agOut || []).find(o => o.id === k.out) || { id: k.out, name: [k.out, k.out] }).id)], [L("หน่วยนับ", "Unit"), tx(k.unit)], [L("ค่าฐาน", "Baseline"), fmtv(k.base)], [L("ค่าเป้าหมาย", "Targets"), PLAN_YEARS.map((y, i) => `${y}: <b>${fmtv(k.targets[i])}</b>`).join(" · ")]]),
});
STRAT["ag-out"] = () => `${crudList("agOut", { head: `<h2>${L("ผลสัมฤทธิ์หน่วยงาน", "Agency outcomes")}</h2><span class="sp"></span>${tag(L("ตัวอย่าง กองแผนงานแก้ได้", "Sample; Planning edits"), "p-mute")}` })}
  ${crudList("agOutK", { head: `<h2>${L("ตัวชี้วัดของผลสัมฤทธิ์ และค่าเป้าหมาย 5 ปี", "KPIs of the outcomes and 5-year targets")}</h2>` })}`;

// ---------- agency strategies and service goals: the two halves of the old strategy-and-goal list ----------
{
  const b = CRUD.defs.stNode, pick = kind => Object.assign({}, b, {
    fields: (n, v) => b.fields(n, Object.assign({}, v, { kind })).filter(f => f.id !== "kind"),
    create: Object.assign({}, b.create, { run: v => b.create.run(Object.assign({}, v, { kind })) }),
  });
  CRUD.def("agStrat", Object.assign(pick("st"), { noun: ["กลยุทธ์หน่วยงาน", "Agency strategy"], list: () => S.strategy.items, cols: b.cols.filter(c => tx(c.h) !== "ระดับ" && tx(c.h) !== "Level"), search: n => `${n.id} ${n.name.join(" ")}`, sub: n => `${L("ยุทธศาสตร์ชาติ", "National strategy")} · ${natName(n.nat)}`, create: Object.assign({}, pick("st").create, { label: ["เพิ่มกลยุทธ์หน่วยงาน", "Add an agency strategy"] }) }));
  CRUD.def("agSvc", Object.assign(pick("goal"), { noun: ["เป้าหมายการให้บริการหน่วยงาน", "Agency service goal"], list: () => S.strategy.items.flatMap(st => st.goals), cols: b.cols.filter(c => tx(c.h) !== "ระดับ" && tx(c.h) !== "Level"), search: n => `${n.id} ${n.name.join(" ")}`, sub: n => `${L("ภายใต้กลยุทธ์", "Under strategy")} ${stOf(n).id}`, create: Object.assign({}, pick("goal").create, { label: ["เพิ่มเป้าหมายการให้บริการ", "Add a service goal"] }) }));
}
{
  const mp = STRAT.mapBase || (() => "");
  STRAT.map = () => mp() + crudList("agStrat", { head: `<h2>${L("กลยุทธ์หน่วยงาน", "Agency strategies")}</h2><span class="sp"></span><span class="sub">${L("กองแผนงานเพิ่ม แก้ไข และเลิกใช้ เชื่อมยุทธศาสตร์ชาติและแผนแม่บทที่ช่องยุทธศาสตร์ชาติ", "Planning adds, edits and retires; link to the national strategy and master plan")}</span>` });
  const kp = STRAT.kpis;
  STRAT.kpis = () => crudList("agSvc", { head: `<h2>${L("เป้าหมายการให้บริการหน่วยงาน", "Agency service goals")}</h2><span class="sp"></span><span class="sub">${L("แต่ละเป้าหมายมีตัวชี้วัดด้านล่าง", "Each goal has KPIs below")}</span>` }) + kp();
}

// ---------- agency programmes (one register, shown in the menu and as RG0) ----------
const spStructProgs = () => (S.structure[FORM_FY] || []).filter(n => n.lvl === "program" && !n.retired);
const spProgName = id => { const n = (S.structure[FORM_FY] || []).find(x => x.id === id); return n ? `${n.code} · ${tx(n.name)}` : id || "–"; };
CRUD.def("agProg", {
  noun: ["แผนงานหน่วยงาน", "Agency programme"], st: RET_ST, live: true,
  list: () => S.agProg || [], id: p => p.id, title: p => `${p.code} ${tx(p.name)}`, sub: p => spProgName(p.struct), status: p => (p.retired ? "retired" : "live"), gone: p => !!p.retired, search: p => `${p.id} ${p.code} ${p.name.join(" ")} ${spProgName(p.struct)}`,
  filters: [{ id: "struct", label: ["แผนงานตามโครงสร้าง", "Structure programme"], opts: () => spStructProgs().map(n => [n.id, `${n.code} ${tx(n.name)}`]), get: p => p.struct }],
  cols: [{ h: ["รหัส", "Code"], c: p => `<span class="mono">${esc(p.code)}</span>` }, { h: ["แผนงานหน่วยงาน", "Agency programme"], c: p => esc(tx(p.name)) }, { h: ["แผนงานตามโครงสร้างยุทธศาสตร์", "Programme by the strategy structure"], c: p => `<span class="sub">${esc(spProgName(p.struct))}</span>` }],
  fields: p => [{ id: "code", label: ["รหัส", "Code"], req: true, value: p ? p.code : "" }, { id: "th", label: ["ชื่อแผนงานหน่วยงาน", "Agency programme"], req: true, wide: true, value: p ? p.name[0] : "" }, { id: "en", label: ["ภาษาอังกฤษ", "English"], wide: true, value: p ? p.name[1] : "" },
    { id: "struct", label: ["เชื่อมกับแผนงานตามโครงสร้างยุทธศาสตร์", "Linked to the programme by the strategy structure"], type: "select", req: true, wide: true, value: p ? p.struct : "", blank: L("— เลือก —", "— choose —"), opts: spStructProgs().map(n => [n.id, `${n.code} · ${tx(n.name)}`]) },
    { id: "note", label: ["หมายเหตุ", "Note"], type: "textarea", wide: true, value: p ? p.note || "" : "" }],
  check: (v, p) => ((S.agProg || []).some(x => x !== p && x.code === v.code && !x.retired) ? [{ f: "code", m: L("รหัสนี้มีอยู่แล้ว", "That code is already used") }] : []),
  create: { can: spCan, label: ["เพิ่มแผนงานหน่วยงาน", "Add an agency programme"], run: v => { const p = { id: "AP-" + String(maxNo((S.agProg || []).map(y => y.id), /(\d+)$/) + 1).padStart(3, "0"), code: v.code.trim(), name: [v.th, v.en || v.th], struct: v.struct, note: v.note || "" }; (S.agProg = S.agProg || []).push(p); audit(["เพิ่มแผนงานหน่วยงาน", "Added an agency programme"], `${p.id} ${p.code}`); return p; } },
  edit: { can: p => spCan() && !p.retired, run: (p, v) => { Object.assign(p, { code: v.code.trim(), name: [v.th, v.en || v.th], struct: v.struct, note: v.note || "" }); audit(["แก้แผนงานหน่วยงาน", "Edited an agency programme"], p.id); } },
  acts: p => (spCan() ? retireAct(["แผนงานหน่วยงาน", "agency programme"], () => false, y => { S.agProg = S.agProg.filter(z => z !== y); })(p) : []),
  view: p => kv([[L("รหัส", "Code"), esc(p.code)], [L("ชื่อ", "Name"), esc(tx(p.name))], [L("แผนงานตามโครงสร้างยุทธศาสตร์", "Programme by the strategy structure"), esc(spProgName(p.struct))], p.note && [L("หมายเหตุ", "Note"), esc(p.note)]]),
});
STRAT["ag-prog"] = () => `${crudList("agProg", { head: `<h2>${L("แผนงานหน่วยงาน", "Agency programmes")}</h2><span class="sp"></span>${tag(L("ตัวอย่าง กองแผนงานแก้ได้", "Sample; Planning edits"), "p-mute")}` })}
  <p class="sub">${L("แต่ละแผนงานหน่วยงานเชื่อมกับแผนงานตามโครงสร้างยุทธศาสตร์ที่ได้รับจาก สงป. (แท็บ แผนงานตามโครงสร้างยุทธศาสตร์) ซึ่งเชื่อมกับยุทธศาสตร์ชาติ", "Each agency programme links to a programme of the strategy structure given by the Budget Bureau (tab Programmes by the strategy structure), which links to the national plans")}</p>`;

// ---------- kinds of account (the four of the request form) ----------
CRUD.def("acct", {
  noun: ["ประเภทบัญชี", "Kind of account"], st: RET_ST,
  list: () => S.acctTypes || [], id: a => a.code, title: a => `${a.code} ${tx(a.name)}`, sub: a => a.note || "", status: () => "live", search: a => `${a.code} ${a.name.join(" ")} ${a.note || ""}`,
  cols: [{ h: ["ประเภทบัญชี", "Account"], c: a => `<span class="mono">${a.code}</span>` }, { h: ["ชื่อ", "Name"], c: a => esc(tx(a.name)) }, { h: ["คำอธิบาย", "Note"], c: a => `<span class="sub">${esc(a.note || "")}</span>` }, { h: ["คำขอที่ติ๊ก", "Requests ticking it"], n: true, c: a => S.requests.filter(r => r.cls && r.cls.acct && r.cls.acct[Number(a.code) - 1]).length }],
  fields: a => [{ id: "code", label: ["ประเภทบัญชี", "Account"], req: true, value: a ? a.code : "", lock: true, show: a && a.code }, { id: "th", label: ["ชื่อ (ภาษาไทย)", "Name (Thai)"], req: true, wide: true, value: a ? a.name[0] : "" }, { id: "en", label: ["ภาษาอังกฤษ", "English"], wide: true, value: a ? a.name[1] : "" }, { id: "note", label: ["คำอธิบาย", "Note"], type: "textarea", wide: true, value: a ? a.note || "" : "" }],
  acts: () => [],
  edit: { can: () => spCan(), run: (a, v) => { Object.assign(a, { name: [v.th, v.en || v.th], note: v.note || "" }); audit(["แก้ประเภทบัญชี", "Edited a kind of account"], a.code); } },
  view: a => kv([[L("ประเภทบัญชี", "Account"), a.code], [L("ชื่อ", "Name"), esc(tx(a.name))], [L("คำอธิบาย", "Note"), esc(a.note || "–")]]),
});
const acctLabel = i => { const a = (S.acctTypes || []).find(x => x.code === String(i + 1)); return a ? `${i + 1} · ${tx(a.name)}` : `${L("บัญชีที่", "Account")} ${i + 1}`; };

// ---------- the overview: requests by strategy, split by a kind ----------
const OV = { by: "ns", dim: "btype" };
const OV_BY = { ns: ["ยุทธศาสตร์ชาติ (e-MENSCR)", "National strategy (e-MENSCR)"], mp: ["แผนแม่บทภายใต้ยุทธศาสตร์ชาติ", "Master plan"], st: ["กลยุทธ์หน่วยงาน", "Agency strategy"] };
const OV_DIM = { btype: ["ประเภทงบประมาณ", "Budget type"], nature: ["ประจำ / ลงทุน", "Recurrent or investment"], kind: ["ประเภทคำขอ (ปีเดียว / ผูกพัน)", "Kind of request"], otype: ["ประเภทผลผลิต / โครงการ / กองทุน", "Output, project or fund"] };
const emRootId = (k, id) => { const ix = emIdx(k); let r = ix.by.get(id), g = 0; while (r && r[1] && g++ < 30) r = ix.by.get(r[1]); return r ? r[0] : id; };
function ovRows(r, by) { // [[key, label]] the request falls under; none = not linked
  if (by === "st") { const out = S.strategy.items.filter(st => st.goals.some(g => g.kpis.some(k => k.acts.includes(r.act)))).map(st => [st.id, `${st.id} · ${tx(st.name)}`]); return out.length ? out : [["none", L("ไม่ผูกกับกลยุทธ์", "Not linked")]]; }
  const ids = [...new Set((emPlans(r)[by] || []).map(id => emRootId(by, id)))];
  return ids.length ? ids.map(id => [id, `${id} · ${emName(by, id).replace(/^แผนแม่บทภายใต้ยุทธศาสตร์ชาติ\s*ประเด็น\s*/, "")}`]) : [["none", L("ยังไม่ผูก", "Not linked")]];
}
function ovCols(dim) {
  if (dim === "btype") return BUDGET_TYPES.map(t => [t.id, `${String(t.code).padStart(2, "0")} ${tx(t.name)}`]);
  if (dim === "nature") return [["ope", L("ประจำ", "Recurrent")], ["inv", L("ลงทุน", "Investment")]];
  if (dim === "kind") return [["year", tx(RQ_KINDS.year)], ["multi", tx(RQ_KINDS.multi)]];
  return [...Object.keys(OUT_TYPES).map(k => [k, tx(OUT_TYPES[k])]), ["none", L("ไม่ระบุ", "Not given")]];
}
function ovVal(r, dim) {
  if (dim === "btype") return ecEffType(r, rqCls(r));
  if (dim === "nature") return rqNature(r);
  if (dim === "kind") return r.multi ? "multi" : "year";
  const o = dsOut(r); return o ? outType(o) : "none";
}
function ovTable() {
  const list = dsList(), cols = ovCols(OV.dim), rows = new Map();
  list.forEach(r => ovRows(r, OV.by).forEach(([k, label]) => { const g = rows.get(k) || { k, label, n: 0, amt: 0, by: {} }, v = ovVal(r, OV.dim), a = dsAmt(r); g.n++; g.amt += a; g.by[v] = (g.by[v] || 0) + a; rows.set(k, g); }));
  const all = [...rows.values()].sort((a, b) => (a.k === "none") - (b.k === "none") || b.amt - a.amt), tot = { n: list.length, amt: sumv(list.map(dsAmt)), by: {} };
  list.forEach(r => { const v = ovVal(r, OV.dim); tot.by[v] = (tot.by[v] || 0) + dsAmt(r); });
  return `<div class="tbl-wrap"><table><thead><tr><th>${tx(OV_BY[OV.by])}</th><th class="n">${L("คำขอ", "Requests")}</th><th class="n">${L("รวม (ล้านบาท)", "Total (M baht)")}</th>${cols.map(c => `<th class="n">${esc(c[1])}</th>`).join("")}</tr></thead>
    <tbody>${all.map(g => `<tr><td>${esc(g.label)}</td><td class="n">${g.n}</td><td class="n"><b>${mb(g.amt)}</b></td>${cols.map(c => `<td class="n">${g.by[c[0]] ? mb(g.by[c[0]]) : "–"}</td>`).join("")}</tr>`).join("") || `<tr><td colspan="${3 + cols.length}" class="sub">${L("ไม่มีคำขอ", "No requests")}</td></tr>`}</tbody>
    <tfoot><tr><td><b>${L("รวม (นับคำขอครั้งเดียว)", "Total (each request once)")}</b></td><td class="n"><b>${tot.n}</b></td><td class="n"><b>${mb(tot.amt)}</b></td>${cols.map(c => `<td class="n"><b>${tot.by[c[0]] ? mb(tot.by[c[0]]) : "–"}</b></td>`).join("")}</tr></tfoot></table></div>`;
}
STRAT["ag-ov"] = () => `<section class="panel"><header><h2>${L("ภาพรวมงบประมาณตามยุทธศาสตร์", "Budget overview by strategy")}</h2><span class="sp"></span><span class="sub">${L("วงเงินที่ขอ ล้านบาท ปี", "Amount requested, M baht, FY")} ${FORM_FY}</span></header>
  <div class="body row" style="flex-wrap:wrap"><label for="ov-by"><b style="font-weight:600">${L("แยกตาม", "By")}</b></label><select id="ov-by">${Object.keys(OV_BY).map(k => `<option value="${k}" ${OV.by === k ? "selected" : ""}>${esc(tx(OV_BY[k]))}</option>`).join("")}</select>
    <label for="ov-dim"><b style="font-weight:600">${L("แบ่งตามประเภท", "Split by")}</b></label><select id="ov-dim">${Object.keys(OV_DIM).map(k => `<option value="${k}" ${OV.dim === k ? "selected" : ""}>${esc(tx(OV_DIM[k]))}</option>`).join("")}</select></div>
  ${ovTable()}
  <div class="body sub">${L("คำขอที่ผูกหลายยุทธศาสตร์นับในทุกแถวที่ผูก แถวรวมนับคำขอครั้งเดียว ยุทธศาสตร์ชาติและแผนแม่บทมาจากการผูกที่แผนงานตามโครงสร้างยุทธศาสตร์ ไม่นับคำขอที่ถูกปฏิเสธ", "A request linked to several strategies counts in each of its rows; the total counts it once. National strategies and master plans come from the links on the programmes by the strategy structure. Rejected requests are not counted.")}</div></section>`;
STRAT_BIND["ag-ov"] = () => { const a = $("#ov-by"), b = $("#ov-dim"); if (a) a.onchange = () => { OV.by = a.value; route(); }; if (b) b.onchange = () => { OV.dim = b.value; route(); }; };

// ---------- the tabs of the menu ----------
STRAT_TABS.push({ id: "ag-vm", label: ["วิสัยทัศน์และพันธกิจ", "Vision and mission"] }, { id: "ag-out", label: ["ผลสัมฤทธิ์หน่วยงาน", "Agency outcomes"] }, { id: "ag-prog", label: ["แผนงานหน่วยงาน", "Agency programmes"] }, { id: "ag-ov", label: ["ภาพรวมงบประมาณตามยุทธศาสตร์", "Budget overview by strategy"] });
{
  const sp = bPage("strategy"), keep = id => sp.tabs.find(t => t.id === id), mk = (id, keys, label, roles) => ({ id, keys, ...(label ? { label } : {}), ...(roles ? { roles } : {}) });
  const oldLink = keep("linkage"), oldAlign = keep("align"), oldBank = keep("bank"), oldRev = keep("revise");
  sp.tabs = [mk("em", ["em-browse", "em-sum", "em-imp"], ["ยุทธศาสตร์ชาติ (e-MENSCR)", "National strategy (e-MENSCR)"]), mk("emlink", ["em-link"], ["แผนงานตามโครงสร้างยุทธศาสตร์", "Programmes by the strategy structure"]),
    mk("vm", ["ag-vm"], ["วิสัยทัศน์และพันธกิจ", "Vision and mission"]), mk("outc", ["ag-out"], ["ผลสัมฤทธิ์หน่วยงาน", "Agency outcomes"]), mk("strat", ["map"], ["กลยุทธ์หน่วยงาน", "Agency strategies"]),
    mk("svc", ["kpis"], ["เป้าหมายการให้บริการหน่วยงาน", "Agency service goals"]), mk("prog", ["ag-prog"], ["แผนงานหน่วยงาน", "Agency programmes"]), mk("ov", ["ag-ov"], ["ภาพรวมงบประมาณตามยุทธศาสตร์", "Budget overview by strategy"]),
    ...[oldLink, oldAlign, oldBank, oldRev].filter(Boolean)];
  STRAT_TABS.find(t => t.id === "em-link").label = ["แผนงานตามโครงสร้างยุทธศาสตร์", "Programmes by the strategy structure"];
  STRAT_TABS.find(t => t.id === "map").label = ["กลยุทธ์หน่วยงาน", "Agency strategies"]; STRAT_TABS.find(t => t.id === "kpis").label = ["เป้าหมายการให้บริการหน่วยงาน", "Agency service goals"];
}

// ---------- the two registers as pages of the menu "Registers of the budget structure" ----------
ePageDef("budget", "rg-prog", "RG0", "regg", REG_ROLES, ["ทะเบียนแผนงานหน่วยงาน", "Agency programme register"], () => `${eHead(SP_APP, "RG0", ["ทะเบียนแผนงานหน่วยงาน", "Agency programme register"], ["แผนงานของหน่วยงานแต่ละรายการเชื่อมกับแผนงานตามโครงสร้างยุทธศาสตร์ที่ได้รับจาก สงป. กองแผนงานดูแล", "Each agency programme links to a programme of the strategy structure given by the Budget Bureau; Planning keeps it"])}
  ${!spCan() ? eNote(L("เฉพาะกองแผนงานเพิ่มหรือแก้ทะเบียน", "Only Planning adds or edits the register")) : ""}${crudList("agProg", { head: `<h2>${L("แผนงานหน่วยงาน", "Agency programmes")}</h2>` })}`);
ePageDef("budget", "rg-acct", "RG3", "regg", REG_ROLES, ["ทะเบียนประเภทบัญชี", "Kinds of account register"], () => `${eHead(SP_APP, "RG3", ["ทะเบียนประเภทบัญชี", "Kinds of account register"], ["ประเภทบัญชี 1 ถึง 4 ที่ติ๊กในคำขอ กองแผนงานใส่ชื่อและคำอธิบายตามที่ สงป. กำหนด ชื่อที่ใส่ไปแสดงในฟอร์มคำขอ", "The four kinds of account ticked on the request; Planning gives the names and notes the Budget Bureau sets, and they show on the request form"])}
  ${!spCan() ? eNote(L("เฉพาะกองแผนงานแก้ชื่อและคำอธิบาย", "Only Planning edits names and notes")) : ""}${crudList("acct", { head: `<h2>${L("ประเภทบัญชี 1 ถึง 4", "Kinds of account 1 to 4")}</h2>` })}`);
Object.assign(NAV_ICON, { "rg-prog": "layers", "rg-acct": "list" });

// ---------- seed: samples of mine, marked as samples ----------
Object.keys(SEEDS).forEach(k => {
  const prev = SEEDS[k].seed;
  SEEDS[k].seed = () => {
    const s = prev(), progs = ((s.structure || {})[FORM_FY] || []).filter(n => n.lvl === "program"), nm = a => [a, a], by = tx(s.org);
    s.agVm = { [FORM_FY]: { vision: nm("ประชาชนได้รับบริการของหน่วยงานที่สะดวก รวดเร็ว และโปร่งใส (ตัวอย่าง)"), mission: nm("พัฒนาบริการให้ประชาชนเข้าถึงได้ง่ายผ่านช่องทางดิจิทัล บริหารทรัพยากรให้คุ้มค่าและตรวจสอบได้ และพัฒนาบุคลากรและองค์กรให้พร้อมต่อการเปลี่ยนแปลง (ตัวอย่าง)") },
      [FORM_FY - 1]: { vision: nm("หน่วยงานให้บริการประชาชนอย่างมีคุณภาพ (ตัวอย่าง ปีก่อน)"), mission: nm("ให้บริการประชาชนอย่างเสมอภาคและบริหารทรัพยากรอย่างคุ้มค่า (ตัวอย่าง ปีก่อน)") } };
    s.agOut = [{ id: "AO-001", name: nm("ประชาชนพึงพอใจต่อบริการของหน่วยงาน (ตัวอย่าง)"), note: "" }, { id: "AO-002", name: nm("หน่วยงานบริหารจัดการภายในมีประสิทธิภาพ (ตัวอย่าง)"), note: "" }];
    const T = (b, d) => PLAN_YEARS.map((_, i) => Math.round((b + d * (i + 1)) * 10) / 10);
    s.agKpi = [{ id: "AK-001", out: "AO-001", name: nm("ร้อยละความพึงพอใจของผู้รับบริการ"), unit: nm("ร้อยละ"), base: 80, targets: T(80, 2) }, { id: "AK-002", out: "AO-001", name: nm("ร้อยละของบริการที่ทำผ่านช่องทางดิจิทัล"), unit: nm("ร้อยละ"), base: 30, targets: T(30, 8) },
      { id: "AK-003", out: "AO-002", name: nm("ร้อยละการเบิกจ่ายงบประมาณ"), unit: nm("ร้อยละ"), base: 90, targets: T(90, 1.5) }];
    s.agProg = progs.map((p, i) => ({ id: "AP-" + String(i + 1).padStart(3, "0"), code: `AP${i + 1}`, name: nm(`แผนงานของหน่วยงาน: ${tx(p.name)} (ตัวอย่าง)`), struct: p.id, note: "" }));
    s.acctTypes = [1, 2, 3, 4].map(n => ({ code: String(n), name: nm(`บัญชีที่ ${n}`), note: "ตัวอย่าง: ใส่ชื่อและคำอธิบายตามที่ สงป. กำหนด" }));
    return s;
  };
});
