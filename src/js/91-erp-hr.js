// Fisko-ERP-Gov, part 8: Fisko HR (added on request after the 8 modules).
// ERP-Government (Odoo 15) has no payroll or leave modules: its HR scope is hr_department_code and hr_operating_unit
// (employees tied to units), and hr_expense with tier validation, sequences and advance clearing (employee expense claims).
// This app rewrites that scope in the Fisko list + drawer pattern: employee register, expense claims approved by tier,
// and a simple monthly payroll run that is handed to Finance. Rates in the payroll run are samples to confirm. Real
// staff data comes from Smart HR, which is not connected.
ROLES.hr = ["เจ้าหน้าที่ทรัพยากรบุคคล", "HR officer"];
{
  const home = NAV.find(n => n.id === "home"); if (!home.roles.includes("hr")) home.roles.push("hr");
  GROUPS.hrg = ["ทรัพยากรบุคคล", "Human resources"];
  APPS.hr = { name: ["DPT HR", "DPT HR"], desc: ["ทะเบียนบุคลากร ใบเบิกค่าใช้จ่าย รอบเงินเดือน", "Employees, expense claims, payroll runs"], groups: ["hrg"], mark: "HR", color: "#A0546E" };
  APP_IDS.splice(APP_IDS.indexOf("ai"), 0, "hr");
  const base = appOfLink; appOfLink = l => (typeof l === "string" && l.startsWith("hr-") ? "hr" : base(l));
  TIER_DOC.expense = ["ใบเบิกค่าใช้จ่ายพนักงาน", "Employee expense claim"];
}
const HR_APP = "DPT HR";
const HR_ROLES = ["hr", "admin", "exec", "fin", "audit", "plan", "div", "divhead"];
const EMP_TYPE = { gov: ["ข้าราชการ", "Civil servant"], perm: ["ลูกจ้างประจำ", "Permanent employee"], temp: ["พนักงานราชการ", "Government employee"], hire: ["ลูกจ้างชั่วคราว", "Temporary worker"] };
const EMP_ST = { active: [["ปฏิบัติงาน", "Active"], "p-ok"], resigned: [["พ้นสภาพ", "Left"], "p-mute"] };
const HX_ST = { draft: [["ร่าง", "Draft"], "p-mute"], submitted: [["รออนุมัติ", "Awaiting approval"], "p-info"], approved: [["อนุมัติ รอส่งการเงิน", "Approved, to send to Finance"], "p-warn"], sent: [["ส่งการเงินแล้ว", "Sent to Finance"], "p-ok"], rejected: [["ไม่อนุมัติ", "Not approved"], "p-bad"], cancelled: [["ยกเลิก", "Cancelled"], "p-mute"] };
const HX_KIND = { travel: ["ค่าเดินทางไปราชการ", "Official travel"], training: ["ค่าฝึกอบรม", "Training"], other: ["ค่าใช้จ่ายอื่น", "Other"] };
// Sample payroll rates, to confirm against the regulations: social security 5% capped at 750 baht a month for government
// employees and temporary workers; the civil servants' pension fund 3%. Income tax is not calculated here.
const PAY_RATE = { sso: 0.05, ssoCap: 750, gpf: 0.03 };
const isHr = () => ROLE === "hr";
const emp = id => (S.emps || []).find(e => e.id === id);
const empName = id => (emp(id) ? tx(emp(id).name) : id);
const myEmp = () => (S.emps || []).find(e => e.user === me().id);
// Fisko-KlangFinance R9: payroll lines also carry deductions from the staff debt register (dedFor in 98y-klang-payroll-onedpt.js).
// The month is passed only when a real run is prepared; the seed calls payLine(e) with no month and gets no deductions.
function payLine(e, ym) {
  const sso = e.type === "temp" || e.type === "hire" ? Math.min(PAY_RATE.ssoCap, Math.round(e.salary * PAY_RATE.sso)) : 0, gpf = e.type === "gov" ? Math.round(e.salary * PAY_RATE.gpf) : 0;
  const dedItems = ym ? dedFor(e, ym, e.salary - sso - gpf) : [], ded = dedItems.reduce((s, d) => s + d.amt, 0);
  return { emp: e.id, gross: e.salary, sso, gpf, ded, dedItems, net: e.salary - sso - gpf - ded };
}
const payTotals = r => r.lines.reduce((t, l) => ({ gross: t.gross + l.gross, ded: t.ded + l.sso + l.gpf + (l.ded || 0), net: t.net + l.net }), { gross: 0, ded: 0, net: 0 });
const payFor = ym => (S.emps || []).filter(e => e.status === "active" && e.start.slice(0, 7) <= ym).map(e => payLine(e, ym));

// seed
Object.keys(SEEDS).forEach(k => {
  const prev = SEEDS[k].seed;
  SEEDS[k].seed = () => {
    const s = prev(), sec = s.units.find(u => u.code === "01") || s.units[1];
    s.users.push({ id: "u16", role: "hr", unit: sec.id, primary: true, mfa: true, active: true, name: ["วรรณา บุคคลดี", "Wanna Bukkhondee"] });
    const sal = { exec: 78000, plan: 42000, div: 36000, fin: 38000, finhead: 55000, audit: 40000, admin: 34000, proc: 32000, prochead: 46000, asset: 28000, store: 26000, hr: 30000, vchk1: 33000, vchk2: 35000, divhead: 52000, committee: 45000 };
    s.emps = []; s.users.filter(u => u.active && u.role !== "vendor").forEach((u, i) => s.emps.push({ id: "EM-" + String(i + 1).padStart(4, "0"), name: u.name, unit: u.unit, title: u.role === "exec" ? ["ผู้บริหาร", "Executive"] : ["เจ้าหน้าที่", "Officer"], type: i % 5 === 3 ? "temp" : "gov", start: `${2012 + (i % 12)}-0${1 + (i % 9)}-01`, salary: sal[u.role] || 30000, status: "active", user: u.id }));
    const kids = s.units.filter(u => u.parent);
    [["สมพร ช่วยงาน", "Somporn Chuayngan", "perm", 18000], ["ประเสริฐ ขับรถ", "Prasert Khabrot", "hire", 15000], ["มาลัย ธุรการ", "Malai Thurakan", "temp", 22000], ["ชัย ดูแลอาคาร", "Chai Dulaeakan", "hire", 15000]].forEach(([th, en, type, salary], i) =>
      s.emps.push({ id: "EM-" + String(s.emps.length + 1).padStart(4, "0"), name: [th, en], unit: kids[i % kids.length].id, title: ["ผู้ช่วยปฏิบัติงาน", "Assistant"], type, start: `202${i}-04-01`, salary, status: "active", user: "" }));
    s.tiers.push({ id: "TR-10", doc: "expense", min: 0, role: "hr" }, { id: "TR-11", doc: "expense", min: 20000, role: "exec" });
    const e1 = s.emps.find(e => e.user === "u1");
    s.hexp = [{ id: "HX-0001", emp: e1.id, kind: "travel", date: "2026-09-18", amount: 6400, why: "เดินทางไปตรวจโครงการในพื้นที่ 3 วัน", status: "sent", by: "u1", t: "2026-09-20T09:00", decided: { by: "u16", t: "2026-09-21T10:00" } },
      { id: "HX-0002", emp: e1.id, kind: "training", date: "2026-10-08", amount: 24000, why: "อบรมหลักสูตรวิเคราะห์ข้อมูลภาครัฐ 2 วัน", status: "submitted", by: "u1", t: "2026-10-12T09:00" }];
    s.payruns = [{ id: "PR-2026-09", month: "2026-09", status: "closed", lines: s.emps.filter(e => e.status === "active").map(e => payLine(e)), by: "u16", t: "2026-09-18T10:00" }];
    return s;
  };
});

CRUD.def("emp", {
  noun: ["บุคลากร", "Employee"], st: EMP_ST, live: false,
  list: () => (S.emps || []).filter(e => !(ROLE === "div" || ROLE === "divhead") || e.unit === me().unit), id: e => e.id, title: e => tx(e.name), sub: e => `${tx(EMP_TYPE[e.type])} · ${unitName(e.unit)}`,
  status: e => e.status, search: e => `${e.id} ${e.name.join(" ")} ${unitName(e.unit)}`,
  filters: [{ id: "u", label: ["หน่วย", "Unit"], opts: () => allUnitOpts(), get: e => e.unit }, { id: "t", label: ["ประเภท", "Type"], opts: () => Object.keys(EMP_TYPE).map(k => [k, tx(EMP_TYPE[k])]), get: e => e.type }],
  cols: [{ h: ["รหัส", "No."], c: e => `<span class="mono">${e.id}</span>` }, { h: ["ชื่อ", "Name"], c: e => `<b style="font-weight:600">${esc(tx(e.name))}</b><div class="sub">${esc(tx(e.title))}</div>` }, { h: ["หน่วย", "Unit"], c: e => esc(unitName(e.unit)) },
    { h: ["ประเภท", "Type"], c: e => esc(tx(EMP_TYPE[e.type])) }, { h: ["เริ่มงาน", "Start"], c: e => fdate(e.start) }, ...(["hr", "exec", "fin", "audit", "admin"].includes(ROLE) ? [{ h: ["เงินเดือน (บาท)", "Salary (baht)"], n: true, c: e => fmt(e.salary) }] : [])],
  fields: (e, v) => [
    { id: "th", label: ["ชื่อ (ไทย)", "Name (Thai)"], req: true, value: e ? e.name[0] : "" }, { id: "en", label: ["ชื่อ (อังกฤษ)", "Name (English)"], value: e ? e.name[1] : "" },
    { id: "unit", label: ["หน่วย", "Unit"], type: "select", req: true, value: e ? e.unit : "", opts: allUnitOpts() }, { id: "title", label: ["ตำแหน่ง/หน้าที่", "Title"], req: true, value: e ? e.title[0] : "" },
    { id: "type", label: ["ประเภทบุคลากร", "Type"], type: "select", req: true, value: e ? e.type : "gov", opts: Object.keys(EMP_TYPE).map(k => [k, tx(EMP_TYPE[k])]) },
    { id: "start", label: ["วันเริ่มงาน", "Start date"], type: "date", req: true, value: e ? e.start : TODAY }, { id: "salary", label: ["เงินเดือน/ค่าจ้าง (บาท)", "Salary (baht)"], type: "number", req: true, min: 1, value: e ? e.salary : "" },
    { id: "user", label: ["ผู้ใช้ระบบที่ผูก", "Linked user"], type: "select", blank: L("ไม่ผูก", "None"), value: e ? e.user : "", opts: userOpts() },
  ],
  check: (v, e) => (v.user && S.emps.some(x => x.user === v.user && (!e || x.id !== e.id)) ? [{ f: "user", m: L("ผู้ใช้นี้ผูกกับบุคลากรอื่นแล้ว", "This user is linked to another employee") }] : []),
  create: { can: isHr, label: ["เพิ่มบุคลากร", "Add an employee"], run: v => { const e = { id: eNextId("EM-", S.emps), name: [v.th, v.en || v.th], unit: v.unit, title: [v.title, v.title], type: v.type, start: v.start, salary: v.salary, status: "active", user: v.user }; S.emps.push(e); audit(["เพิ่มบุคลากร", "Added an employee"], `${e.id} ${v.th}`); return e; } },
  edit: { can: e => isHr() && e.status === "active", why: () => true, run: (e, v, why) => { const old = e.salary; Object.assign(e, { name: [v.th, v.en || v.th], unit: v.unit, title: [v.title, v.title], type: v.type, start: v.start, salary: v.salary, user: v.user }); audit(["แก้ไขข้อมูลบุคลากร", "Edited an employee"], `${e.id}${old !== v.salary ? ` · เงินเดือน ${fmt(old)} → ${fmt(v.salary)}` : ""} · ${why}`); } },
  acts: e => (!isHr() || e.status !== "active" ? [] : [{ id: "left", label: L("บันทึกพ้นสภาพ", "Record leaving"), kind: "danger", why: true, impact: () => L("ไม่นับในรอบเงินเดือนถัดไป ผู้ใช้ที่ผูกไว้ต้องระงับที่ M10 เอง", "Leaves the next payroll run; deactivate the linked user in M10 yourself"), run: (x, why) => { x.status = "resigned"; x.left = { date: TODAY, why }; audit(["บันทึกพ้นสภาพ", "Recorded leaving"], `${x.id} · ${why}`); notify(["admin"], [`บุคลากร ${x.id} พ้นสภาพ ตรวจสิทธิ์ผู้ใช้`, `Employee ${x.id} left; review the user's access`], "admin"); return L("บันทึกแล้ว", "Recorded"); } }]),
  view: e => kv([[L("หน่วย", "Unit"), esc(unitName(e.unit))], [L("ตำแหน่ง", "Title"), esc(tx(e.title))], [L("ประเภท", "Type"), esc(tx(EMP_TYPE[e.type]))], [L("เริ่มงาน", "Started"), fdate(e.start)],
    ["hr", "exec", "fin", "audit", "admin"].includes(ROLE) && [L("เงินเดือน", "Salary"), baht(e.salary)], [L("ผู้ใช้ที่ผูก", "Linked user"), e.user ? esc(userName(e.user)) : "–"], e.left && [L("พ้นสภาพ", "Left"), `${fdate(e.left.date)} · ${esc(e.left.why)}`]]),
});

CRUD.def("hexp", {
  noun: ["ใบเบิกค่าใช้จ่ายพนักงาน", "Expense claim"], st: HX_ST, live: false,
  list: () => (S.hexp || []).filter(x => !(ROLE === "div" || ROLE === "divhead") || (emp(x.emp) || {}).unit === me().unit), id: x => x.id, title: x => `${x.id} · ${empName(x.emp)}`, sub: x => `${tx(HX_KIND[x.kind])} · ${baht(x.amount)}`,
  status: x => x.status, gone: x => x.status === "cancelled", search: x => `${x.id} ${empName(x.emp)} ${x.why}`,
  filters: [{ id: "st", label: ["สถานะ", "Status"], opts: () => Object.keys(HX_ST).map(k => [k, tx(HX_ST[k][0])]), get: x => x.status }],
  cols: [{ h: ["เลขที่", "No."], c: x => `<span class="mono">${x.id}</span>` }, { h: ["พนักงาน", "Employee"], c: x => esc(empName(x.emp)) }, { h: ["ชนิด", "Kind"], c: x => esc(tx(HX_KIND[x.kind])) }, { h: ["วันที่", "Date"], c: x => fdate(x.date) },
    { h: ["จำนวน (บาท)", "Amount (baht)"], n: true, c: x => fmt(x.amount) }, { h: ["ผู้อนุมัติ", "Approver"], c: x => `<span class="sub">${esc(tx(ROLES[tierRole("expense", x.amount)]))}</span>` }],
  fields: (x, v) => [
    { id: "emp", label: ["พนักงาน", "Employee"], type: "select", req: true, value: x ? x.emp : (myEmp() || {}).id || "", lock: !!x, show: x ? esc(empName(x.emp)) : "", opts: (S.emps || []).filter(e => e.status === "active" && (isHr() || e.user === me().id)).map(e => [e.id, `${e.id} ${tx(e.name)}`]) },
    { id: "kind", label: ["ชนิด", "Kind"], type: "select", req: true, value: x ? x.kind : "travel", opts: Object.keys(HX_KIND).map(k => [k, tx(HX_KIND[k])]) }, { id: "date", label: ["วันที่เกิดค่าใช้จ่าย", "Expense date"], type: "date", req: true, value: x ? x.date : TODAY },
    { id: "amount", label: ["จำนวนเงิน (บาท)", "Amount (baht)"], type: "number", req: true, min: 1, value: x ? x.amount : "" }, { id: "why", label: ["รายละเอียด (อย่างน้อย 10 ตัวอักษร)", "Details (at least 10 characters)"], type: "textarea", req: true, wide: true, value: x ? x.why : "" },
  ],
  check: v => [...((v.why || "").length < 10 ? [{ f: "why", m: L("ใส่รายละเอียดอย่างน้อย 10 ตัวอักษร", "Give at least 10 characters") }] : []), ...(v.date > TODAY ? [{ f: "date", m: L("วันที่ต้องไม่เกินวันนี้", "Date can't be in the future") }] : [])],
  create: { can: () => isHr() || ROLE === "div" || ROLE === "divhead" || ROLE === "plan" || ROLE === "exec" || ROLE === "fin", label: ["สร้างใบเบิกค่าใช้จ่าย", "New expense claim"], run: v => { const x = { id: eNextId("HX-", S.hexp), emp: v.emp, kind: v.kind, date: v.date, amount: v.amount, why: v.why, status: "draft", by: me().id, t: nowIso() }; S.hexp.push(x); audit(["สร้างใบเบิกค่าใช้จ่าย", "Created an expense claim"], `${x.id} ${empName(x.emp)}`); return x; } },
  edit: { can: x => x.status === "draft" && (x.by === me().id || isHr()), run: (x, v) => { Object.assign(x, { kind: v.kind, date: v.date, amount: v.amount, why: v.why }); audit(["แก้ไขใบเบิกค่าใช้จ่าย", "Edited an expense claim"], x.id); } },
  acts: x => {
    const out = [], need = tierRole("expense", x.amount), mine = x.by === me().id || (emp(x.emp) || {}).user === me().id;
    if (x.status === "draft" && (mine || isHr())) out.push({ id: "send", label: L("ส่งขออนุมัติ", "Send for approval"), kind: "primary", confirm: `${baht(x.amount)} · ${L("ผู้อนุมัติ", "approver")}: ${tx(ROLES[need])}`, run: y => { y.status = "submitted"; audit(["ส่งใบเบิกค่าใช้จ่าย", "Sent an expense claim"], y.id); notify([need], [`ใบเบิกค่าใช้จ่าย ${y.id} รออนุมัติ`, `Expense claim ${y.id} awaits approval`], "hr-exp"); return L("ส่งแล้ว", "Sent"); } },
      { id: "del", label: L("ลบร่าง", "Delete draft"), kind: "danger", why: true, run: (y, why) => { S.hexp = S.hexp.filter(z => z !== y); audit(["ลบร่างใบเบิก", "Deleted a claim draft"], `${y.id} · ${why}`); return L("ลบแล้ว", "Deleted"); } });
    const own = (emp(x.emp) || {}).user === me().id || x.by === me().id; // nobody approves their own claim
    if (x.status === "submitted" && ROLE === need && !own) out.push({ id: "ok", label: L("อนุมัติ", "Approve"), kind: "primary", confirm: baht(x.amount), run: y => { y.status = "approved"; y.decided = { by: me().id, t: nowIso() }; audit(["อนุมัติใบเบิกค่าใช้จ่าย", "Approved an expense claim"], y.id); notify(["hr"], [`ใบเบิก ${y.id} อนุมัติแล้ว รอส่งการเงิน`, `Claim ${y.id} approved; send to Finance`], "hr-exp"); return L("อนุมัติแล้ว", "Approved"); } },
      { id: "no", label: L("ไม่อนุมัติ", "Do not approve"), kind: "danger", why: true, run: (y, why) => { y.status = "rejected"; y.decided = { by: me().id, t: nowIso(), why }; audit(["ไม่อนุมัติใบเบิกค่าใช้จ่าย", "Expense claim not approved"], `${y.id} · ${why}`); return L("บันทึกแล้ว", "Recorded"); } });
    if (x.status === "submitted" && mine) out.push({ id: "wd", label: L("ถอนคำขอ", "Withdraw"), why: true, run: (y, why) => { y.status = "cancelled"; audit(["ถอนใบเบิกค่าใช้จ่าย", "Withdrew an expense claim"], `${y.id} · ${why}`); return L("ถอนแล้ว", "Withdrawn"); } });
    if (x.status === "approved" && isHr()) out.push({ id: "fin", label: L("ส่งการเงินทำใบขอเบิก", "Send to Finance"), kind: "primary", confirm: L("แจ้งการเงินให้ทำใบขอเบิกใน Fisko Finance (F3) ระบบไม่สร้างใบขอเบิกให้เอง", "Tells Finance to prepare the voucher in F3; the voucher is not created automatically"), run: y => { y.status = "sent"; y.sentAt = nowIso(); audit(["ส่งใบเบิกให้การเงิน", "Sent a claim to Finance"], y.id); notify(["fin"], [`ใบเบิกค่าใช้จ่ายพนักงาน ${y.id} ${fmt(y.amount)} บาท ทำใบขอเบิก`, `Employee claim ${y.id}, ${fmt(y.amount)} baht: prepare a voucher`], "fnc-pay"); return L("ส่งการเงินแล้ว", "Sent to Finance"); } });
    return out;
  },
  view: x => kv([[L("พนักงาน", "Employee"), esc(empName(x.emp))], [L("ชนิด", "Kind"), esc(tx(HX_KIND[x.kind]))], [L("วันที่", "Date"), fdate(x.date)], [L("จำนวน", "Amount"), baht(x.amount)], [L("รายละเอียด", "Details"), esc(x.why)],
    [L("ผู้อนุมัติตามขั้น O3", "Approver by O3 tier"), esc(tx(ROLES[tierRole("expense", x.amount)]))], x.decided && [L("ผลพิจารณา", "Decision"), `${esc(userName(x.decided.by))} · ${fdate(x.decided.t, true)}${x.decided.why ? " · " + esc(x.decided.why) : ""}`]]),
});

ePageDef("hr", "hr-today", "H1", "hrg", HR_ROLES, ["งานบุคคลวันนี้", "HR today"], () => {
  const E = (S.emps || []).filter(e => e.status === "active"), X = S.hexp || [], last = (S.payruns || [])[0];
  return `${eHead(HR_APP, "H1", ["งานบุคคลวันนี้", "HR today"], ["บุคลากร ใบเบิกค่าใช้จ่ายที่รอ และรอบเงินเดือน · ข้อมูลตัวอย่าง ข้อมูลจริงมาจาก Smart HR ซึ่งยังไม่เชื่อม", "Staff, claims waiting and payroll runs · sample data; real data comes from Smart HR, not connected"])}
    ${eKpis([[L("บุคลากรที่ปฏิบัติงาน", "Active staff"), E.length], [L("ใบเบิกรออนุมัติ", "Claims awaiting approval"), X.filter(x => x.status === "submitted").length, "", X.some(x => x.status === "submitted")], [L("รอส่งการเงิน", "To send to Finance"), X.filter(x => x.status === "approved").length], [L("รอบเงินเดือนล่าสุด", "Latest payroll"), last ? last.month : "–", last ? tx(last.status === "closed" ? ["ปิดแล้ว", "closed"] : ["ร่าง", "draft"]) : ""]])}
    ${eInbox(L("งานของฉัน", "My work"), myTasks().filter(t => typeof t.link === "string" && t.link.startsWith("hr-")))}`;
});
ePageDef("hr", "hr-emp", "H2", "hrg", HR_ROLES, ["ทะเบียนบุคลากร", "Employee register"], () => `${eHead(HR_APP, "H2", ["ทะเบียนบุคลากร", "Employee register"], ["ข้อมูลบุคลากร สังกัด ประเภท และเงินเดือน (เห็นเงินเดือนเฉพาะ HR ผู้บริหาร การเงิน ผู้ตรวจสอบ ผู้ดูแลระบบ) · หน่วยเห็นเฉพาะคนของตน", "Employees, units, types and salary (salary visible to HR, executive, finance, audit and admin) · units see only their own people"])}
  ${crudList("emp", { head: `<h2>${L("บุคลากร", "Employees")}</h2>` })}`);
ePageDef("hr", "hr-exp", "H3", "hrg", HR_ROLES, ["ใบเบิกค่าใช้จ่ายพนักงาน", "Expense claims"], () => `${eHead(HR_APP, "H3", ["ใบเบิกค่าใช้จ่ายพนักงาน", "Expense claims"], ["พนักงานหรือ HR สร้างใบเบิก อนุมัติตามขั้นวงเงิน (O3) แล้ว HR ส่งการเงินไปทำใบขอเบิก · ผู้ขอหรือผู้ทำใบอนุมัติใบของตนไม่ได้", "A claim is created, approved by the O3 tier, then HR sends it to Finance to prepare the voucher · nobody approves their own claim"])}
  ${crudList("hexp", { head: `<h2>${L("ใบเบิก", "Claims")}</h2>` })}`);

ePageDef("hr", "hr-pay", "H4", "hrg", HR_ROLES.filter(r => !["div", "divhead", "plan"].includes(r)), ["รอบเงินเดือน", "Payroll runs"], () => {
  const runs = S.payruns || [], last = runs[0] ? runs[0].month : "2026-08", next = ymAdd(last, 1), canPrep = isHr() && next <= TODAY.slice(0, 7) && !runs.some(r => r.month === next);
  return `${eHead(HR_APP, "H4", ["รอบเงินเดือน", "Payroll runs"], ["คำนวณรายเดือนจากทะเบียนบุคลากร หักประกันสังคมและกองทุนบำเหน็จบำนาญข้าราชการตามอัตราตัวอย่าง ปิดรอบแล้วแจ้งการเงิน · ไม่คำนวณภาษีเงินได้ และไม่จ่ายเงินจริง", "Monthly from the register; social security and civil servants' pension at sample rates; close and tell Finance · no income tax, and nothing is paid"])}
    <section class="panel"><header><h2>${L("รอบเงินเดือน", "Runs")}</h2><span class="sp"></span>${isHr() ? `<button class="btn primary" type="button" id="pay-prep" ${canPrep ? "" : "disabled"}>${L("เตรียมรอบ", "Prepare")} ${next}</button>` : ""}</header>
    ${runs.length ? runs.map(r => { const t = payTotals(r); return `<div class="body" style="border-top:1px solid var(--line)"><div class="row"><b>${r.month}</b> <span class="mono sub">${r.id}</span> ${tag(r.status === "closed" ? L("ปิดแล้ว", "Closed") : L("ร่าง", "Draft"), r.status === "closed" ? "p-ok" : "p-warn")}<span class="sp"></span><span class="sub">${r.lines.length} ${L("คน", "people")} · ${L("รวม", "gross")} ${fmt(t.gross)} · ${L("หัก", "deductions")} ${fmt(t.ded)} · <b>${L("สุทธิ", "net")} ${fmt(t.net)}</b></span>${isHr() && r.status === "draft" ? `<button class="btn primary" type="button" data-payclose="${r.id}">${L("ปิดรอบและแจ้งการเงิน", "Close and tell Finance")}</button>` : ""}</div>
      <details style="margin-top:6px"><summary class="sub">${L("รายคน", "By person")}</summary><div class="tbl-wrap"><table><thead><tr><th>${L("พนักงาน", "Employee")}</th><th class="n">${L("เงินเดือน", "Gross")}</th><th class="n">${L("ประกันสังคม", "Social sec.")}</th><th class="n">${L("กบข.", "Pension fund")}</th><th class="n">${L("หักหนี้", "Debt deductions")}</th><th class="n">${L("สุทธิ", "Net")}</th></tr></thead><tbody>${r.lines.map(l => `<tr><td>${esc(empName(l.emp))}</td><td class="n">${fmt(l.gross)}</td><td class="n">${fmt(l.sso)}</td><td class="n">${fmt(l.gpf)}</td><td class="n">${fmt(l.ded || 0)}</td><td class="n">${fmt(l.net)}</td></tr>`).join("")}</tbody></table></div></details></div>`; }).join("") : `<div class="body sub">${L("ยังไม่มีรอบ", "No runs yet")}</div>`}</section>`;
}, () => {
  const p = $("#pay-prep"); if (p) p.onclick = () => { const runs = S.payruns, next = ymAdd(runs[0] ? runs[0].month : "2026-08", 1); if (next > TODAY.slice(0, 7)) return; const r = { id: "PR-" + next, month: next, status: "draft", lines: payFor(next), by: me().id, t: nowIso() }; runs.unshift(r); audit(["เตรียมรอบเงินเดือน", "Prepared a payroll run"], r.id); commit(); toast(`${L("เตรียมรอบ", "Prepared")} ${next}`); route(); };
  $$("[data-payclose]").forEach(b => (b.onclick = () => { const r = S.payruns.find(x => x.id === b.dataset.payclose), t = payTotals(r); r.status = "closed"; r.closed = { by: me().id, t: nowIso() }; audit(["ปิดรอบเงินเดือน", "Closed a payroll run"], `${r.id} ${fmt(t.net)}`); notify(["fin"], [`เงินเดือน ${r.month} สุทธิ ${fmt(t.net)} บาท ทำใบขอเบิก`, `Payroll ${r.month}: net ${fmt(t.net)} baht, prepare the voucher`], "fnc-pay"); commit(); toast(L("ปิดรอบและแจ้งการเงินแล้ว", "Closed; Finance told")); route(); }));
});

{
  const base = famTasks;
  famTasks = R => {
    base(R);
    if (!S.hexp) return;
    if (isHr()) { S.hexp.filter(x => x.status === "submitted" && tierRole("expense", x.amount) === "hr").forEach(x => R(`${L("อนุมัติใบเบิกค่าใช้จ่าย", "Approve a claim")} ${x.id}`, baht(x.amount), TODAY, "hr-exp", "p-info")); S.hexp.filter(x => x.status === "approved").forEach(x => R(`${L("ส่งการเงิน", "Send to Finance")} ${x.id}`, baht(x.amount), TODAY, "hr-exp", "p-warn")); }
    if (ROLE === "exec") S.hexp.filter(x => x.status === "submitted" && tierRole("expense", x.amount) === "exec").forEach(x => R(`${L("อนุมัติใบเบิกค่าใช้จ่าย", "Approve a claim")} ${x.id}`, baht(x.amount), TODAY, "hr-exp", "p-info"));
  };
}
Object.assign(NAV_ICON, { "hr-today": "home", "hr-emp": "users", "hr-exp": "wallet", "hr-pay": "coins" });
