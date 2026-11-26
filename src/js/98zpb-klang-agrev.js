// KlangFinance, menu round M4 (13 Nov 2569): the new menu "Agency review" (ทบทวนหน่วยงาน), the ministry registers, and the menu
// "Strategy and programmes" cut down. Asked for by the user:
//   New menu "ทบทวนหน่วยงาน", its tabs taken out of "ยุทธศาสตร์และแผนงาน": vision and mission, agency outcomes, agency strategies,
//   agency service goals, agency programmes, outputs/projects, activities.
//   - Agency strategies no longer link to the national strategy and the master plan; they link to a register of ministry strategies
//     (new register "ทะเบียนยุทธศาสตร์กระทรวง").
//   - Agency service goals link to a programme by the strategy structure instead, and to a ministry service goal (new register
//     "ทะเบียนเป้าหมายการให้บริการกระทรวง"). A goal still sits under an agency strategy in the data (the KPIs hang on it); the form
//     asks for that last and leaves it to "the first strategy" when empty.
//   - The old "project bank" tab becomes "outputs and projects", showing the data of the output/project register; a new tab
//     "activities" shows the data of the activity register. Both are read-only views with a button to the register.
//   Menu "ยุทธศาสตร์และแผนงาน" keeps: national strategy (e-MENSCR), programmes by the strategy structure, budget overview by strategy,
//   linkage and alignment. The linkage tab drops the KPI-to-activity linking and now shows the whole line from the national
//   strategy to the activity; "plan revision" is removed (and so are the project bank's idea screens).
//   English text is taken out of the registers' forms for now ("เอาภาษาอังกฤษที่อยู่ในรายละเอียดที่อยู่แต่ละทะเบียน ออกก่อน").
// Sample rows (ministry strategies and service goals) are samples of mine, marked as such.

// ---------- ministry registers ----------
const minStratName = id => { const x = (S.minStrat || []).find(y => y.id === id); return x ? `${x.code} · ${tx(x.name)}` : id ? id : "–"; };
const minSvcName = id => { const x = (S.minSvc || []).find(y => y.id === id); return x ? `${x.code} · ${tx(x.name)}` : id ? id : "–"; };
function minRegDef(key, listKey, noun, used, idPre, codePre) {
  CRUD.def(key, {
    noun, st: RET_ST, live: true, list: () => S[listKey] || [], id: x => x.id, title: x => `${x.code} ${tx(x.name)}`, sub: x => x.note || "", status: x => (x.retired ? "retired" : "live"), gone: x => !!x.retired, search: x => `${x.id} ${x.code} ${x.name.join(" ")} ${x.note || ""}`,
    cols: [{ h: ["รหัส", "Code"], c: x => `<span class="mono">${esc(x.code)}</span>` }, { h: ["ชื่อ", "Name"], c: x => esc(tx(x.name)) }, { h: ["ที่เชื่อมโยง", "Linked by"], n: true, c: x => used(x).length }, { h: ["หมายเหตุ", "Note"], c: x => `<span class="sub">${esc(x.note || "")}</span>` }],
    fields: x => [{ id: "code", label: ["รหัส", "Code"], req: true, value: x ? x.code : "" }, { id: "th", label: ["ชื่อ", "Name"], req: true, wide: true, type: "textarea", value: x ? x.name[0] : "" }, { id: "note", label: ["หมายเหตุ", "Note"], type: "textarea", wide: true, value: x ? x.note || "" : "" }],
    check: (v, x) => ((S[listKey] || []).some(y => y !== x && String(y.code) === String(v.code).trim() && !y.retired) ? [{ f: "code", m: L("รหัสนี้มีอยู่แล้ว", "That code is already used") }] : []),
    create: { can: spCan, label: [`เพิ่ม${noun[0]}`, `Add: ${noun[1]}`], run: v => { const x = { id: idPre + "-" + String(maxNo((S[listKey] || []).map(y => y.id), /(\d+)$/) + 1).padStart(3, "0"), code: v.code.trim(), name: [v.th, v.th], note: v.note || "" }; (S[listKey] = S[listKey] || []).push(x); audit([`เพิ่ม${noun[0]}`, `Added: ${noun[1]}`], `${x.id} ${x.code}`); return x; } },
    edit: { can: x => spCan() && !x.retired, run: (x, v) => { Object.assign(x, { code: v.code.trim(), name: [v.th, v.th], note: v.note || "" }); audit([`แก้${noun[0]}`, `Edited: ${noun[1]}`], x.id); } },
    acts: x => (spCan() ? retireAct(noun, y => used(y).length > 0, y => { S[listKey] = S[listKey].filter(z => z !== y); })(x) : []),
    view: x => kv([[L("รหัส", "Code"), esc(x.code)], [L("ชื่อ", "Name"), esc(tx(x.name))], x.note && [L("หมายเหตุ", "Note"), esc(x.note)], [L("เชื่อมโยงโดย", "Linked by"), used(x).map(y => `${y.id} ${esc(tx(y.name))}`).join("<br>") || "–"]]),
  });
}
minRegDef("minStrat", "minStrat", ["ยุทธศาสตร์กระทรวง", "Ministry strategy"], x => S.strategy.items.filter(st => st.mstrat === x.id), "MS", "MS");
minRegDef("minSvc", "minSvc", ["เป้าหมายการให้บริการกระทรวง", "Ministry service goal"], x => S.strategy.items.flatMap(st => st.goals).filter(g => g.msvc === x.id), "MV", "MV");
ePageDef("budget", "rg-mstrat", "RG0A", "regg", REG_ROLES, ["ทะเบียนยุทธศาสตร์กระทรวง", "Ministry strategy register"], () => `${eHead(SP_APP, "RG0A", ["ทะเบียนยุทธศาสตร์กระทรวง", "Ministry strategy register"], ["ยุทธศาสตร์ของกระทรวงที่กลยุทธ์หน่วยงานเชื่อมถึง กองแผนงานดูแล", "The ministry's strategies that the agency strategies link to; Planning keeps it"])}
  ${!spCan() ? eNote(L("เฉพาะกองแผนงานเพิ่มหรือแก้ทะเบียน", "Only Planning adds or edits the register")) : ""}${crudList("minStrat", { head: `<h2>${L("ยุทธศาสตร์กระทรวง", "Ministry strategies")}</h2><span class="sp"></span>${tag(L("ตัวอย่าง", "Sample"), "p-mute")}` })}`);
ePageDef("budget", "rg-msvc", "RG0B", "regg", REG_ROLES, ["ทะเบียนเป้าหมายการให้บริการกระทรวง", "Ministry service goal register"], () => `${eHead(SP_APP, "RG0B", ["ทะเบียนเป้าหมายการให้บริการกระทรวง", "Ministry service goal register"], ["เป้าหมายการให้บริการของกระทรวงที่เป้าหมายการให้บริการหน่วยงานเชื่อมถึง กองแผนงานดูแล", "The ministry's service goals that the agency service goals link to; Planning keeps it"])}
  ${!spCan() ? eNote(L("เฉพาะกองแผนงานเพิ่มหรือแก้ทะเบียน", "Only Planning adds or edits the register")) : ""}${crudList("minSvc", { head: `<h2>${L("เป้าหมายการให้บริการกระทรวง", "Ministry service goals")}</h2><span class="sp"></span>${tag(L("ตัวอย่าง", "Sample"), "p-mute")}` })}`);
Object.assign(NAV_ICON, { "rg-mstrat": "layers", "rg-msvc": "target" });

// ---------- agency strategies and service goals with the new links ----------
{
  const b = CRUD.defs.stNode, so = (list, name) => list.filter(x => !x.retired).map(x => [x.id, name(x)]);
  CRUD.def("agStrat", {
    noun: ["กลยุทธ์หน่วยงาน", "Agency strategy"], st: RET_ST, live: true, list: () => S.strategy.items, id: n => n.id, title: n => tx(n.name), sub: n => minStratName(n.mstrat), status: b.status, gone: b.gone, search: n => `${n.id} ${n.name.join(" ")} ${minStratName(n.mstrat)}`,
    cols: [{ h: ["รหัส", "Code"], c: n => `<span class="mono">${n.id}</span>` }, { h: ["กลยุทธ์หน่วยงาน", "Agency strategy"], c: n => `<b style="font-weight:600">${esc(tx(n.name))}</b>` }, { h: ["ยุทธศาสตร์กระทรวง", "Ministry strategy"], c: n => `<span class="sub">${esc(minStratName(n.mstrat))}</span>` }, { h: ["เป้าหมายการให้บริการ", "Service goals"], n: true, c: n => n.goals.length }],
    fields: n => [{ id: "mstrat", label: ["เชื่อมยุทธศาสตร์กระทรวง", "Linked ministry strategy"], type: "select", req: true, wide: true, value: n ? n.mstrat || "" : "", blank: L("— เลือก —", "— choose —"), opts: so(S.minStrat || [], x => `${x.code} · ${tx(x.name)}`) },
      { id: "th", label: ["ชื่อกลยุทธ์หน่วยงาน", "Agency strategy"], req: true, wide: true, value: n ? n.name[0] : "" }],
    create: { can: spCan, label: ["เพิ่มกลยุทธ์หน่วยงาน", "Add an agency strategy"], run: v => { const st = b.create.run({ th: v.th, en: "", kind: "st", nat: "", mp: "" }); st.mstrat = v.mstrat; return st; } },
    edit: { can: b.edit.can, run: (n, v) => { b.edit.run(n, { th: v.th, en: "", nat: n.nat || "", mp: n.mp || "" }); n.mstrat = v.mstrat; } },
    acts: b.acts,
    view: n => kv([[L("รหัส", "Code"), n.id], [L("กลยุทธ์หน่วยงาน", "Agency strategy"), esc(tx(n.name))], [L("ยุทธศาสตร์กระทรวง", "Ministry strategy"), esc(minStratName(n.mstrat))], [L("เป้าหมายการให้บริการ", "Service goals"), n.goals.map(g => `${g.id} ${esc(tx(g.name))}`).join("<br>") || "–"], n.retired && [L("เลิกใช้เมื่อ", "Retired"), `${fdate(n.retired.t)} · ${esc(n.retired.why)}`]]),
  });
  CRUD.def("agSvc", {
    noun: ["เป้าหมายการให้บริการหน่วยงาน", "Agency service goal"], st: RET_ST, live: true, list: () => S.strategy.items.flatMap(st => st.goals), id: g => g.id, title: g => tx(g.name), sub: g => spProgName(g.prog), status: b.status, gone: b.gone, search: g => `${g.id} ${g.name.join(" ")} ${spProgName(g.prog)} ${minSvcName(g.msvc)}`,
    cols: [{ h: ["รหัส", "Code"], c: g => `<span class="mono">${g.id}</span>` }, { h: ["เป้าหมายการให้บริการหน่วยงาน", "Agency service goal"], c: g => esc(tx(g.name)) }, { h: ["แผนงานตามโครงสร้างยุทธศาสตร์", "Programme by the strategy structure"], c: g => `<span class="sub">${esc(spProgName(g.prog))}</span>` },
      { h: ["เป้าหมายการให้บริการกระทรวง", "Ministry service goal"], c: g => `<span class="sub">${esc(minSvcName(g.msvc))}</span>` }, { h: ["ตัวชี้วัด", "KPIs"], n: true, c: g => g.kpis.length }],
    fields: g => [{ id: "prog", label: ["เชื่อมแผนงานตามโครงสร้างยุทธศาสตร์", "Linked programme by the strategy structure"], type: "select", req: true, wide: true, value: g ? g.prog || "" : "", blank: L("— เลือก —", "— choose —"), opts: so(spStructProgs(), n => `${n.code} · ${tx(n.name)}`) },
      { id: "msvc", label: ["เชื่อมเป้าหมายการให้บริการกระทรวง", "Linked ministry service goal"], type: "select", req: true, wide: true, value: g ? g.msvc || "" : "", blank: L("— เลือก —", "— choose —"), opts: so(S.minSvc || [], x => `${x.code} · ${tx(x.name)}`) },
      { id: "th", label: ["ชื่อเป้าหมายการให้บริการหน่วยงาน", "Agency service goal"], req: true, wide: true, value: g ? g.name[0] : "" },
      { id: "parent", label: ["อยู่ใต้กลยุทธ์หน่วยงาน (เว้นว่างใช้ข้อแรก)", "Under agency strategy (empty = the first)"], type: "select", wide: true, value: g ? (stOf(g) || {}).id || "" : "", lock: !!g, show: g && (stOf(g) || {}).id, blank: L("— ข้อแรก —", "— the first —"), opts: so(S.strategy.items, st => `${st.id} · ${tx(st.name)}`) }],
    check: () => (S.strategy.items.some(st => !st.retired) ? [] : [{ f: "parent", m: L("ยังไม่มีกลยุทธ์หน่วยงาน เพิ่มกลยุทธ์ก่อน", "There is no agency strategy yet; add one first") }]),
    create: { can: spCan, label: ["เพิ่มเป้าหมายการให้บริการ", "Add a service goal"], run: v => { const g = b.create.run({ th: v.th, en: "", kind: "goal", parent: v.parent || S.strategy.items.find(st => !st.retired).id }); g.prog = v.prog; g.msvc = v.msvc; return g; } },
    edit: { can: b.edit.can, run: (g, v) => { b.edit.run(g, { th: v.th, en: "" }); g.prog = v.prog; g.msvc = v.msvc; } },
    acts: b.acts,
    view: g => kv([[L("รหัส", "Code"), g.id], [L("เป้าหมายการให้บริการ", "Service goal"), esc(tx(g.name))], [L("แผนงานตามโครงสร้างยุทธศาสตร์", "Programme by the strategy structure"), esc(spProgName(g.prog))], [L("เป้าหมายการให้บริการกระทรวง", "Ministry service goal"), esc(minSvcName(g.msvc))], [L("อยู่ใต้กลยุทธ์", "Under strategy"), esc(((stOf(g) || {}).id || "–"))], [L("ตัวชี้วัด", "KPIs"), g.kpis.map(k => `${k.id} ${esc(tx(k.name))}`).join("<br>") || "–"], g.retired && [L("เลิกใช้เมื่อ", "Retired"), `${fdate(g.retired.t)} · ${esc(g.retired.why)}`]]),
  });
}
STRAT.map = () => crudList("agStrat", { head: `<h2>${L("กลยุทธ์หน่วยงาน", "Agency strategies")}</h2><span class="sp"></span><span class="sub">${L("กองแผนงานเพิ่ม แก้ไข และเลิกใช้ เชื่อมกับทะเบียนยุทธศาสตร์กระทรวง", "Planning adds, edits and retires; linked to the ministry strategy register")}</span>` });
STRAT.kpis = () => crudList("agSvc", { head: `<h2>${L("เป้าหมายการให้บริการหน่วยงาน", "Agency service goals")}</h2><span class="sp"></span><span class="sub">${L("เชื่อมแผนงานตามโครงสร้างยุทธศาสตร์และเป้าหมายการให้บริการกระทรวง", "Linked to the programme by the strategy structure and to the ministry service goal")}</span>` })
  + crudList("stKpi", { head: `<h2>${L("ตัวชี้วัดและค่าเป้าหมาย 5 ปี", "KPIs and 5-year targets")}</h2><span class="sp"></span>${tag(ROLE === "plan" ? L("แก้ไขได้", "Editable") : L("ดูอย่างเดียว", "View only"), ROLE === "plan" ? "p-ok" : "p-mute")}` });

// ---------- outputs/projects and activities: views of the registers ----------
function agRegTable(lvl) {
  const st = S.structure[FORM_FY] || [], isOut = lvl === "output", reqs = emReqs().filter(r => r.status !== "rejected"), nodes = st.filter(n => n.lvl === lvl && !n.retired);
  const own = n => reqs.filter(r => r.act && lineage(r.act).some(x => x.id === n.id)), par = n => st.find(x => x.id === n.parent), acts = n => st.filter(a => a.lvl === "activity" && a.parent === n.id && !a.retired).length;
  return `<div class="tbl-wrap"><table><thead><tr><th>${L("รหัส", "Code")}</th>${isOut ? `<th>${L("ประเภท", "Type")}</th>` : ""}<th>${isOut ? L("ผลผลิต / โครงการ", "Output / project") : L("กิจกรรม", "Activity")}</th><th>${isOut ? L("แผนงาน", "Programme") : L("ผลผลิต / โครงการ", "Output / project")}</th>${isOut ? `<th class="n">${L("กิจกรรม", "Activities")}</th>` : `<th>${L("แผนงาน", "Programme")}</th>`}<th class="n">${L("คำขอ", "Requests")}</th><th class="n">${L("วงเงินที่ขอ (ล้านบาท)", "Requested (M baht)")}</th></tr></thead>
    <tbody>${nodes.map(n => { const rs = own(n), p = par(n); return `<tr><td class="mono">${esc(n.code)}</td>${isOut ? `<td>${esc(outTypeName(n))}</td>` : ""}<td>${esc(tx(n.name))}</td><td class="sub">${esc(p ? tx(p.name) : "–")}</td>${isOut ? `<td class="n">${acts(n)}</td>` : `<td class="sub">${esc(p && par(p) ? tx(par(p).name) : "–")}</td>`}<td class="n">${rs.length}</td><td class="n">${mb(sumv(rs.map(dsAmt)))}</td></tr>`; }).join("") || `<tr><td colspan="7" class="sub">${L("ไม่มีรายการ", "Nothing")}</td></tr>`}</tbody></table></div>`;
}
const agRegPanel = (lvl, th, en, page) => `<section class="panel"><header><h2>${L(th, en)}</h2><span class="sp"></span><span class="sub">${L("ข้อมูลจากทะเบียน ปี", "From the register, FY")} ${FORM_FY}</span>${ROLE === "plan" || ROLE === "admin" ? `<button class="btn" type="button" data-jump="${page}">${L("เปิดทะเบียนเพื่อเพิ่มหรือแก้", "Open the register to add or edit")}</button>` : ""}</header>${agRegTable(lvl)}</section>`;
STRAT["ag-outp"] = () => agRegPanel("output", "ผลผลิต/โครงการ", "Outputs and projects", "rg-out");
STRAT["ag-act"] = () => agRegPanel("activity", "กิจกรรม", "Activities", "rg-act");

// ---------- the linkage tab: the whole line from the national strategy to the activity ----------
const chShort = (k, id) => emName(k, emRootId(k, id)).replace(/^แผนแม่บทภายใต้ยุทธศาสตร์ชาติ\s*ประเด็น\s*/, "").replace(/^ยุทธศาสตร์(ชาติ)?/, "") || id;
const chNames = (n, k) => [...new Set((emNodePlans(n)[k] || []).map(id => emRootId(k, id)))].map(id => chShort(k, id));
STRAT.link = () => {
  const st = S.structure[FORM_FY] || [], live = n => !n.retired, reqs = emReqs().filter(r => r.status !== "rejected"), goals = S.strategy.items.flatMap(s => s.goals);
  const under = (n, lv) => st.filter(x => x.lvl === lv && x.parent === n.id && live(x)), actAmt = a => { const rs = reqs.filter(r => r.act === a.id); return { n: rs.length, a: sumv(rs.map(dsAmt)) }; };
  const sum = (arr) => ({ n: sumv(arr.map(x => x.n)), a: sumv(arr.map(x => x.a)) });
  const rows = [];
  st.filter(n => n.lvl === "program" && live(n)).forEach(p => {
    const outs = under(p, "output"), pAct = sum(outs.flatMap(o => under(o, "activity").map(actAmt)));
    rows.push({ lv: "program", n: p, req: pAct, ns: chNames(p, "ns"), mp: chNames(p, "mp"), inh: false, ap: (S.agProg || []).filter(x => x.struct === p.id).map(x => x.code), sg: goals.filter(g => g.prog === p.id).map(g => g.id) });
    outs.forEach(o => { const acts = under(o, "activity"), oNs = chNames(o, "ns"), oMp = chNames(o, "mp"), has = oNs.length || oMp.length;
      rows.push({ lv: "output", n: o, req: sum(acts.map(actAmt)), ns: has ? oNs : chNames(p, "ns"), mp: has ? oMp : chNames(p, "mp"), inh: !has });
      acts.forEach(a => rows.push({ lv: "activity", n: a, req: actAmt(a), ns: has ? oNs : chNames(p, "ns"), mp: has ? oMp : chNames(p, "mp"), inh: true })); });
  });
  const lvTag = lv => `<span class="lvl ${lv}">${tx(LEVELS[lv])}</span>`;
  return `<section class="panel"><header><h2>${L("เส้นเชื่อมโยง ตั้งแต่ยุทธศาสตร์ชาติถึงกิจกรรม", "The whole line, from the national strategy to the activity")}</h2><span class="sp"></span><span class="sub">${L("ปี", "FY")} ${FORM_FY}</span></header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("ระดับ", "Level")}</th><th>${L("รายการ", "Item")}</th><th>${L("ยุทธศาสตร์ชาติ", "National strategy")}</th><th>${L("แผนแม่บท", "Master plan")}</th><th>${L("แผนงานหน่วยงาน / เป้าหมายการให้บริการ", "Agency programme / service goal")}</th><th class="n">${L("คำขอ", "Requests")}</th><th class="n">${L("วงเงิน (ล้านบาท)", "Amount (M baht)")}</th></tr></thead>
    <tbody>${rows.map(r => `<tr><td>${lvTag(r.lv)}</td><td style="padding-left:${r.lv === "program" ? 8 : r.lv === "output" ? 26 : 44}px"><span class="mono sub">${esc(r.n.code)}</span> ${r.lv === "program" ? `<b style="font-weight:600">${esc(tx(r.n.name))}</b>` : esc(tx(r.n.name))}</td>
      <td class="${r.inh ? "sub" : ""}">${r.ns.length ? esc(r.ns.join(" · ")) : `<span class="sub">–</span>`}</td><td class="${r.inh ? "sub" : ""}">${r.mp.length ? esc(r.mp.join(" · ")) : `<span class="sub">–</span>`}</td>
      <td class="sub">${r.lv === "program" ? esc([...(r.ap || []), ...(r.sg || [])].join(" · ") || "–") : ""}</td><td class="n">${r.req.n}</td><td class="n">${mb(r.req.a)}</td></tr>`).join("") || `<tr><td colspan="7" class="sub">${L("ไม่มีรายการ", "Nothing")}</td></tr>`}</tbody></table></div>
    <div class="body sub">${L("ยุทธศาสตร์ชาติและแผนแม่บทมาจากการผูกที่แผนงานตามโครงสร้างยุทธศาสตร์และผลผลิต/โครงการ (ตัวอักษรจางคือสืบทอดมาจากระดับบน) แผนงานหน่วยงานและเป้าหมายการให้บริการหน่วยงานเชื่อมที่แผนงานตามโครงสร้าง", "National strategy and master plan come from the links on the programmes by the strategy structure and the outputs (grey = inherited from above); agency programmes and service goals link at the programme by the strategy structure")}</div></section>`;
};

// ---------- the overview also holds the minimum share by agency strategy (it was on the old linkage tab) ----------
{
  const ov = STRAT["ag-ov"];
  STRAT["ag-ov"] = () => {
    const items = S.strategy.items.filter(s => !s.retired), reqsOfSt = s => S.requests.filter(r => r.status !== "rejected" && s.goals.some(g => g.kpis.some(k => k.acts.includes(r.act)))), allReq = sumv(S.requests.filter(r => r.status !== "rejected" && !isPersonnel(r)).map(r => r.amount)) || 1, ed = ROLE === "exec";
    return ov() + `<section class="panel"><header><h2>${L("สัดส่วนวงเงินตามกลยุทธ์หน่วยงาน", "Budget share by agency strategy")}</h2><span class="sp"></span>${tag(ed ? L("ผู้บริหารกำหนดขั้นต่ำได้", "Executive sets the minimum") : L("ดูอย่างเดียว", "View only"), ed ? "p-ok" : "p-mute")}</header>
      <div class="tbl-wrap"><table><thead><tr><th>${L("กลยุทธ์หน่วยงาน", "Agency strategy")}</th><th>${L("ยุทธศาสตร์กระทรวง", "Ministry strategy")}</th><th class="n">${L("คำขอ (ลบ.)", "Requested (M)")}</th><th class="n">${L("สัดส่วน", "Share")}</th><th class="n">${L("ขั้นต่ำ %", "Minimum %")}</th></tr></thead>
      <tbody>${items.map((s, i) => { const a = sumv(reqsOfSt(s).filter(r => !isPersonnel(r)).map(r => r.amount)), sh = a / allReq * 100; return `<tr><td><b>${s.id}</b> ${esc(tx(s.name))}</td><td class="sub">${esc(minStratName(s.mstrat))}</td><td class="n">${mb(a)}</td><td class="n" style="color:${s.minShare && sh < s.minShare ? "var(--warn)" : "inherit"}">${fmt(sh, 1)}%</td>
        <td class="n"><input type="number" min="0" max="100" step="5" data-smin="${S.strategy.items.indexOf(s)}" value="${s.minShare || 0}" ${ed ? "" : "disabled"} style="width:70px" aria-label="${L("ขั้นต่ำ", "Minimum")}"></td></tr>`; }).join("")}</tbody></table></div>
      <div class="body sub">${L("ไม่รวมงบบุคลากร ขั้นต่ำกำหนดโดยผู้บริหาร", "Excludes personnel; the executive sets the minimum")}</div></section>`;
  };
  const ob = STRAT_BIND["ag-ov"];
  STRAT_BIND["ag-ov"] = () => { if (ob) ob(); $$("[data-smin]").forEach(inp => (inp.onchange = () => { const s = S.strategy.items[inp.dataset.smin], old = s.minShare || 0; s.minShare = Number(inp.value); audit(["กำหนดสัดส่วนขั้นต่ำของกลยุทธ์หน่วยงาน", "Set an agency strategy's minimum share"], `${s.id}: ${old}% → ${s.minShare}%`); commit(); route(); })); };
}

// ---------- the menu "Agency review" ----------
let AGR_TAB = "ag-vm";
const AGR_TABS = [["ag-vm", ["วิสัยทัศน์และพันธกิจ", "Vision and mission"]], ["ag-out", ["ผลสัมฤทธิ์หน่วยงาน", "Agency outcomes"]], ["map", ["กลยุทธ์หน่วยงาน", "Agency strategies"]], ["kpis", ["เป้าหมายการให้บริการหน่วยงาน", "Agency service goals"]],
  ["ag-prog", ["แผนงานหน่วยงาน", "Agency programmes"]], ["ag-outp", ["ผลผลิต/โครงการ", "Outputs and projects"]], ["ag-act", ["กิจกรรม", "Activities"]]];
ePageDef("budget", "agrev", "B2A", "form", ["plan", "exec", "div", "audit", "admin"], ["ทบทวนหน่วยงาน", "Agency review"], () => {
  if (!AGR_TABS.some(t => t[0] === AGR_TAB)) AGR_TAB = "ag-vm";
  return `${eHead(SP_APP, "B2A", ["ทบทวนหน่วยงาน", "Agency review"], ["วิสัยทัศน์ ผลสัมฤทธิ์ กลยุทธ์ เป้าหมายการให้บริการ แผนงาน ผลผลิต/โครงการ และกิจกรรมของหน่วยงาน กองแผนงานดูแล", "The agency's vision, outcomes, strategies, service goals, programmes, outputs and activities; Planning keeps them"])}
    <div class="tabs" role="tablist">${AGR_TABS.map(t => `<button class="tab ${t[0] === AGR_TAB ? "on" : ""}" type="button" role="tab" aria-selected="${t[0] === AGR_TAB}" data-agt="${t[0]}">${tx(t[1])}</button>`).join("")}</div>
    ${STRAT[AGR_TAB]()}`;
}, () => {
  $$("[data-agt]").forEach(b => (b.onclick = () => { AGR_TAB = b.dataset.agt; route(); }));
  (STRAT_BIND[AGR_TAB] || (() => {}))();
  $$("#view [data-jump]").forEach(x => (x.onclick = () => jump(x.dataset.jump)));
});
Object.assign(NAV_ICON, { agrev: "target" });
FY_FORM.push("agrev");
{ const fp = fyPageHas; fyPageHas = (id, y) => (id === "agrev" && AGR_TAB === "ag-vm" ? fyYears().includes(y) : fp(id, y)); } // the vision tab holds a value for every year
{ // deep links of the old tabs
  const j = jump;
  jump = function (l) {
    if (typeof l === "string" && l.startsWith("strat-")) {
      const k = l.slice(6), m = { map: "map", kpis: "kpis", bank: "ag-outp" }[k];
      if (m) { AGR_TAB = m; return go("agrev"); }
      if (k === "links") { STRAT_TAB = "link"; return go("strategy"); }
      if (k === "revise") { STRAT_TAB = "em-browse"; return go("strategy"); }
    }
    return j(l);
  };
  const ft = famTasks; famTasks = R => ft((t, s, due, link, cls) => (/^strat-(bank|revise)$/.test(link) ? null : R(t, s, due, link, cls))); // the idea bank and plan revision screens are gone
}

// ---------- the menu "Strategy and programmes", cut down ----------
{
  const sp = bPage("strategy"), keep = id => sp.tabs.find(t => t.id === id), lk = keep("linkage"), al = keep("align");
  sp.tabs = [keep("em"), keep("emlink"), keep("ov"), { ...lk, keys: ["link"], label: ["เชื่อมโยง", "Linkage"] }, al].filter(Boolean);
  STRAT_TABS.find(t => t.id === "link").label = ["เชื่อมโยง", "Linkage"];
}

// ---------- English out of the registers' forms, for now ----------
["regOut", "regAct", "moneyType", "expCat", "refPrice", "agProg", "acct", "minStrat", "minSvc", "agOut", "agOutK", "stKpi"].forEach(key => {
  const d = CRUD.defs[key]; if (!d || d.noEn) return; const f = d.fields; d.noEn = true; d.fields = (...a) => f(...a).filter(x => x.id !== "en");
});

// ---------- the two ministry registers go before the agency programmes; links on the strategies and goals; seed ----------
Object.keys(SEEDS).forEach(k => {
  const prev = SEEDS[k].seed;
  SEEDS[k].seed = () => {
    const s = prev(), nm = a => [a, a], progs = ((s.structure || {})[FORM_FY] || []).filter(n => n.lvl === "program");
    s.minStrat = [{ id: "MS-001", code: "MS1", name: nm("พัฒนาบริการภาครัฐให้ทันสมัยและเข้าถึงได้ (ตัวอย่าง)"), note: "" }, { id: "MS-002", code: "MS2", name: nm("เสริมสร้างความปลอดภัยและคุณภาพชีวิตของประชาชน (ตัวอย่าง)"), note: "" }, { id: "MS-003", code: "MS3", name: nm("บริหารจัดการทรัพยากรและสิ่งแวดล้อมอย่างยั่งยืน (ตัวอย่าง)"), note: "" }];
    s.minSvc = [{ id: "MV-001", code: "MV1", name: nm("ประชาชนได้รับบริการที่สะดวก รวดเร็ว โปร่งใส (ตัวอย่าง)"), note: "" }, { id: "MV-002", code: "MV2", name: nm("ชุมชนและเมืองมีโครงสร้างพื้นฐานที่ปลอดภัย (ตัวอย่าง)"), note: "" }, { id: "MV-003", code: "MV3", name: nm("หน่วยงานบริหารจัดการอย่างมีประสิทธิภาพ (ตัวอย่าง)"), note: "" }];
    (s.strategy.items || []).forEach((st, i) => { st.mstrat = s.minStrat[i % s.minStrat.length].id; st.goals.forEach((g, j) => { g.prog = progs.length ? progs[(i + j) % progs.length].id : ""; g.msvc = s.minSvc[(i + j) % s.minSvc.length].id; }); });
    return s;
  };
});
