// KlangFinance: registers of outputs/projects and of activities (asked for on 4 Nov 2569).
// Both are views of the budget structure the request form already uses (S.structure[year]: programme > output > activity),
// so a request's output and activity come from these registers and nothing is stored twice. They are the same nodes the
// admin page "Budget structure" lists; these pages split them by level and let Planning keep them.
// Who may add, edit or retire: Administration and Planning (my assumption, to be confirmed). A closed year is read only.
// A programme with no outputs under it is shown in the output register as a stand-in, because its activities hang on it.
const REG_APP = "DPT Budget";
const regFy = () => (typeof SEL_FY !== "undefined" && SEL_FY && S.structure[SEL_FY] ? SEL_FY : FORM_FY);
const regCan = () => (ROLE === "admin" || ROLE === "plan") && fyOpen(regFy());
const regNodes = () => S.structure[regFy()] || (S.structure[regFy()] = []);
const regById = id => regNodes().find(n => n.id === id);
const regOuts = () => regNodes().filter(n => n.lvl === "output");
// What an output-level node is: an output (ผลผลิต), a project (โครงการ) or a fund (กองทุน). Nodes made before this had no type: they are outputs.
// The register and the request form list output-level nodes only, each under its programme; a programme is never listed as an output.
const OUT_TYPES = { output: ["ผลผลิต", "Output"], project: ["โครงการ", "Project"], fund: ["กองทุน", "Fund"] };
const outType = n => (n && OUT_TYPES[n.otype] ? n.otype : "output");
const outTypeName = n => tx(OUT_TYPES[outType(n)]);
const regUsed = n => S.requests.some(r => r.act === n.id) || Object.values(S.allocs || {}).some(A => (A.lines || []).some(l => l.act === n.id)) || regNodes().some(x => x.parent === n.id) || (typeof allKpis === "function" && allKpis().some(x => x.k.acts.includes(n.id)));
const regReqOf = n => S.requests.filter(r => (n.lvl === "activity" ? r.act === n.id : regNodes().some(a => a.lvl === "activity" && a.parent === n.id && a.id === r.act)));
const regIdOf = code => { const st = regNodes(), pre = st[0] && /^\d\d-/.test(st[0].id) ? st[0].id.slice(0, 3) : ""; return pre + String(code).replace(/\./g, "-"); };
const regName = n => (n ? `${n.code} · ${tx(n.name)}` : "–");

function regDef(key, lvl) {
  const isOut = lvl === "output", noun = isOut ? ["ผลผลิต / โครงการ", "Output / project"] : ["กิจกรรม", "Activity"];
  const parents = () => (isOut ? regNodes().filter(n => n.lvl === "program" && !n.retired) : regOuts().filter(n => !n.retired));
  CRUD.def(key, {
    noun, st: RET_ST, status: n => (n.retired ? "retired" : "live"), gone: n => !!n.retired, id: n => n.id, title: n => regName(n), sub: n => regName(regById(n.parent)),
    list: () => (isOut ? regOuts() : regNodes().filter(n => n.lvl === "activity")), search: n => `${n.code} ${n.name.join(" ")}`,
    filters: [{ id: "par", label: isOut ? ["แผนงาน", "Programme"] : ["ผลผลิต/โครงการ", "Output / project"], opts: () => parents().map(n => [n.id, regName(n)]), get: n => n.parent || "" }, ...(isOut ? [{ id: "ot", label: ["ประเภท", "Type"], opts: () => Object.keys(OUT_TYPES).map(k => [k, tx(OUT_TYPES[k])]), get: n => outType(n) }] : [])],
    cols: [{ h: ["รหัส", "Code"], c: n => `<span class="mono">${esc(n.code)}</span>` }, ...(isOut ? [{ h: ["ประเภท", "Type"], c: n => esc(outTypeName(n)) }] : []), { h: ["ชื่อ", "Name"], c: n => esc(tx(n.name)) },
      ...(isOut ? [{ h: ["กลยุทธ์หน่วยงาน", "Agency strategy"], c: n => `<span class="sub">${esc(typeof emAgStName === "function" && emAgStName(n.astrat) ? emAgStName(n.astrat) : "–")}</span>` }] : []),
      { h: [isOut ? "แผนงาน" : "ผลผลิต/โครงการ", isOut ? "Programme" : "Output / project"], c: n => `<span class="sub">${esc(tx((regById(n.parent) || { name: ["–", "–"] }).name))}</span>` },
      { h: [isOut ? "กิจกรรม" : "คำขอ", isOut ? "Activities" : "Requests"], n: true, c: n => (isOut ? regNodes().filter(a => a.lvl === "activity" && a.parent === n.id).length : regReqOf(n).length) }],
    fields: n => [
      { id: "parent", label: isOut ? ["แผนงาน", "Programme"] : ["ภายใต้ผลผลิต / โครงการ", "Under the output or project"], type: "select", req: true, value: n ? n.parent : "", lock: !!n, show: n && regName(regById(n.parent)), blank: L("— เลือก —", "— choose —"), opts: parents().map(p => [p.id, regName(p)]) },
      ...(isOut ? [{ id: "otype", label: ["ประเภท", "Type"], type: "select", req: true, value: n ? outType(n) : "output", opts: Object.keys(OUT_TYPES).map(k => [k, tx(OUT_TYPES[k])]) }, { id: "astrat", label: ["เชื่อมโยงกลยุทธ์หน่วยงาน", "Linked agency strategy"], type: "select", value: n ? n.astrat || "" : "", blank: L("— ไม่เชื่อม —", "— not linked —"), opts: (S.strategy.items || []).map(s => [s.id, `${s.id} · ${tx(s.name)}`]) }] : []),
      { id: "code", label: ["รหัส", "Code"], req: true, value: n ? n.code : "", hint: L("รูปแบบรหัสเป็นตัวอย่าง ใช้รหัสตามโครงสร้างงบประมาณของปีนั้น", "The code format is a sample; use the year's budget-structure code") },
      { id: "th", label: ["ชื่อ", "Name"], req: true, wide: true, value: n ? n.name[0] : "" }, { id: "en", label: ["ภาษาอังกฤษ", "English"], wide: true, value: n ? n.name[1] : "" }],
    check: (v, n) => (regNodes().some(x => x.code === v.code && x !== n) ? [{ f: "code", m: L("รหัสนี้มีอยู่แล้ว", "That code is already used") }] : []),
    create: { can: regCan, label: isOut ? ["เพิ่มผลผลิต/โครงการ", "Add an output or project"] : ["เพิ่มกิจกรรม", "Add an activity"],
      run: v => { const n = { id: regIdOf(v.code), lvl, code: v.code, parent: v.parent, name: [v.th, v.en || v.th] }; if (isOut) { n.otype = v.otype || "output"; if (v.astrat) n.astrat = v.astrat; } regNodes().push(n); audit([`เพิ่ม${noun[0]}ในทะเบียน`, `Added to the ${noun[1]} register`], `${regFy()} · ${v.code} ${v.th}`); return n; } },
    edit: { can: n => regCan() && !n.retired && n.lvl === lvl, run: (n, v) => { Object.assign(n, { code: v.code, name: [v.th, v.en || v.th] }); if (isOut) { n.otype = v.otype || outType(n); if (v.astrat) n.astrat = v.astrat; else delete n.astrat; } audit([`แก้ไข${noun[0]}`, `Edited an ${noun[1]}`], `${regFy()} · ${v.code}`); } },
    acts: n => (regCan() && n.lvl === lvl ? retireAct(noun, regUsed, x => { S.structure[regFy()] = regNodes().filter(y => y !== x); })(n) : []),
    view: n => kv([[L("รหัส", "Code"), esc(n.code)], isOut && [L("ประเภท", "Type"), esc(outTypeName(n))], isOut && [L("กลยุทธ์หน่วยงาน", "Agency strategy"), esc((typeof emAgStName === "function" && emAgStName(n.astrat)) || "–")], [L("ปีงบประมาณ", "Fiscal year"), regFy()], [isOut ? L("แผนงาน", "Programme") : L("ผลผลิต/โครงการ", "Output / project"), esc(regName(regById(n.parent)))],
      isOut && n.lvl === "output" && [L("กิจกรรม", "Activities"), regNodes().filter(a => a.lvl === "activity" && a.parent === n.id).map(a => esc(regName(a))).join("<br>") || "–"],
      [L("คำขอ", "Requests"), regReqOf(n).map(r => r.id).join(", ") || "–"]]),
  });
}
regDef("regOut", "output"); regDef("regAct", "activity");

Object.assign(GROUPS, { regg: ["ทะเบียนโครงสร้างงบประมาณ", "Budget structure registers"] });
APPS.budget.groups.push("regg");
{ const base = appOfLink; appOfLink = l => (typeof l === "string" && l.startsWith("rg-") ? "budget" : base(l)); }
const REG_ROLES = KROLES.filter(r => !["div", "divhead"].includes(r));
const regBar = () => `<div class="row" style="margin:0 0 12px"><span class="sub">${L("ปีงบประมาณ", "Fiscal year")} <b>${regFy()}</b> ${regFy() === FORM_FY ? `(${L("ปีที่กำลังจัดทำคำขอ", "year being prepared")})` : ""}</span>${fyOpen(regFy()) ? "" : tag(L("ปีที่ปิดแล้ว แก้ไขไม่ได้", "Closed year: read-only"), "p-mute")}${regCan() ? "" : tag(L("เพิ่ม/แก้ได้เฉพาะ ผู้ดูแลระบบ และ ฝ่ายแผน", "Only Administration and Planning can add or edit"), "p-mute")}</div>`;
ePageDef("budget", "rg-out", "RG1", "regg", REG_ROLES, ["ทะเบียนผลผลิต/โครงการ", "Output / project register"], () => `${eHead(REG_APP, "RG1", ["ทะเบียนผลผลิต/โครงการ", "Output / project register"], ["รายการผลผลิต/โครงการของปีงบประมาณ อยู่ภายใต้แผนงาน และเป็นที่มาของรายการกิจกรรมในแบบฟอร์มคำขอ เลือกปีที่ตัวเลือกปีงบประมาณด้านบน · เป็นชุดข้อมูลเดียวกับหน้าโครงสร้างงบประมาณของผู้ดูแลระบบ ไม่ได้ดึงจากระบบภายนอก · เลิกใช้ได้เมื่อมีข้อมูลอ้างถึงแล้ว ลบได้เมื่อยังไม่มีผู้ใช้", "Outputs and projects of the fiscal year, under a programme; they feed the activity list on the request form. Pick the year with the fiscal-year selector at the top · the same data as the administrator's budget structure page; nothing is fetched from an external system · retire it once something refers to it, delete it only while nothing does"])}${regBar()}${crudList("regOut", { head: `<h2>${L("ผลผลิต / โครงการ", "Outputs / projects")}</h2>` })}`, () => {});
ePageDef("budget", "rg-act", "RG2", "regg", REG_ROLES, ["ทะเบียนกิจกรรม", "Activity register"], () => `${eHead(REG_APP, "RG2", ["ทะเบียนกิจกรรม", "Activity register"], ["รายการกิจกรรมของปีงบประมาณ ภายใต้ผลผลิต/โครงการ ใช้เป็นรหัสงบประมาณของคำขอและบรรทัดจัดสรร กิจกรรมในคำขอกับกิจกรรมตามโครงสร้างงบประมาณเป็นรายการเดียวกัน (เก็บที่คำขอเป็น `act`) · เลิกใช้ได้เมื่อมีข้อมูลอ้างถึงแล้ว", "Activities of the fiscal year, under an output or project; used as the budget code of requests and allocation lines. A request's activity and the budget-structure activity are one and the same record · retire it once something refers to it"])}${regBar()}${crudList("regAct", { head: `<h2>${L("กิจกรรม", "Activities")}</h2>` })}`, () => {});
Object.assign(NAV_ICON, { "rg-out": "layers", "rg-act": "list" });
