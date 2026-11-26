// ERP-Gov, part 2: Organization (module 1). Units, positions and approval tiers.
// ERP-Government reference: operating_unit and hr_department_code (units), base_tier_validation (tiers).
// Written new in the list + drawer pattern; the units themselves are the same S.units every app already uses.
const ORG_ST = { live: [["ใช้งาน", "In use"], "p-ok"], vacant: [["ว่าง", "Vacant"], "p-warn"], filled: [["มีผู้ดำรงตำแหน่ง", "Filled"], "p-ok"] };
const ORG_ROLES = ["admin", "exec", "plan", "fin", "audit", "div", "divhead", "proc", "prochead", "asset", "store", "hr"];
const isOrgAdmin = () => ROLE === "admin";
const unitKids = id => S.units.filter(u => u.parent === id);
const unitDesc = id => unitKids(id).flatMap(k => [k.id, ...unitDesc(k.id)]);
const unitPositions = id => (S.positions || []).filter(p => p.unit === id);
const allUnitOpts = () => S.units.map(u => [u.id, `${u.code} ${tx(u.name)}`]);
const userOpts = () => S.users.filter(u => u.active && u.role !== "vendor").map(u => [u.id, `${tx(u.name)} · ${tx(ROLES[u.role])}`]);

CRUD.def("orgUnit", {
  noun: ["หน่วยงาน", "Unit"], st: ORG_ST, live: true,
  list: () => S.units, id: u => u.id, title: u => tx(u.name), sub: u => (u.parent ? `${L("สังกัด", "Under")} ${unitName(u.parent)}` : L("หน่วยงานระดับสูงสุด", "Top-level agency")),
  status: () => "live", search: u => `${u.id} ${u.code} ${u.name.join(" ")}`,
  cols: [{ h: ["รหัส", "Code"], c: u => `<span class="mono">${esc(u.code)}</span>` }, { h: ["หน่วยงาน", "Unit"], c: u => `<b style="font-weight:600">${esc(tx(u.name))}</b>` },
    { h: ["สังกัด", "Under"], c: u => `<span class="sub">${u.parent ? esc(unitName(u.parent)) : "–"}</span>` },
    { h: ["ผู้ใช้", "Users"], n: true, c: u => S.users.filter(x => x.unit === u.id).length }, { h: ["ครุภัณฑ์", "Assets"], n: true, c: u => (S.assets || []).filter(a => a.unit === u.id && assetInService(a)).length }],
  fields: (u, v) => [
    { id: "code", label: ["รหัสหน่วย", "Unit code"], req: true, value: u ? u.code : "" },
    { id: "th", label: ["ชื่อ (ภาษาไทย)", "Name (Thai)"], req: true, wide: true, value: u ? u.name[0] : "" },
    { id: "en", label: ["ชื่อ (ภาษาอังกฤษ)", "Name (English)"], wide: true, value: u ? u.name[1] : "" },
    { id: "parent", label: ["สังกัด", "Under"], type: "select", req: true, value: u ? u.parent || "" : S.units.find(x => !x.parent).id, lock: !!u && !u.parent, show: L("หน่วยงานระดับสูงสุด", "Top-level agency"),
      opts: S.units.filter(x => !u || (x.id !== u.id && !unitDesc(u.id).includes(x.id))).map(x => [x.id, `${x.code} ${tx(x.name)}`]) },
  ],
  check: (v, u) => S.units.some(x => x.code === v.code && (!u || x.id !== u.id)) ? [{ f: "code", m: L("รหัสนี้ถูกใช้แล้ว", "This code is already used") }] : [],
  create: { can: isOrgAdmin, label: ["เพิ่มหน่วยงาน", "Add a unit"], run: v => {
    const n = { id: "U" + String(maxNo(S.units.map(x => x.id), /^U(\d+)/) + 1).padStart(2, "0"), code: v.code, parent: v.parent, name: [v.th, v.en || v.th] };
    S.units.push(n); audit(["เพิ่มหน่วยงาน", "Added a unit"], `${n.id} ${v.th}`); return n; } },
  edit: { can: isOrgAdmin, run: (u, v) => { u.code = v.code; u.name = [v.th, v.en || v.th]; if (u.parent) u.parent = v.parent; audit(["แก้ไขหน่วยงาน", "Edited a unit"], `${u.id} ${v.th}`); } },
  acts: u => (!isOrgAdmin() || !u.parent ? [] : unitKids(u.id).length || S.users.some(x => x.unit === u.id) || jsonHas(u.id)
    ? [] : [{ id: "del", label: L("ยุบหน่วย", "Close the unit"), kind: "danger", why: true, impact: () => L("ลบหน่วยออกจากโครงสร้าง ทำได้เมื่อไม่มีหน่วยย่อย ผู้ใช้ หรือเอกสารอ้างอิง", "Removes the unit; allowed only when nothing refers to it"),
      run: (x, why) => { S.units = S.units.filter(y => y !== x); S.positions = (S.positions || []).filter(p => p.unit !== x.id); audit(["ยุบหน่วยงาน", "Closed a unit"], `${x.id} ${tx(x.name)} · ${why}`); return L("ยุบหน่วยแล้ว", "Unit closed"); } }]),
  view: u => kv([[L("รหัส", "Code"), esc(u.code)], [L("สังกัด", "Under"), u.parent ? esc(unitName(u.parent)) : "–"], [L("หน่วยย่อย", "Sub-units"), unitKids(u.id).map(k => esc(tx(k.name))).join("<br>") || "–"],
    [L("ผู้ใช้ในหน่วย", "Users"), S.users.filter(x => x.unit === u.id).map(x => `${esc(tx(x.name))} · ${esc(tx(ROLES[x.role]))}`).join("<br>") || "–"],
    [L("ตำแหน่ง", "Positions"), unitPositions(u.id).map(p => `${esc(tx(p.title))}: ${p.holder ? esc(userName(p.holder)) : L("ว่าง", "vacant")}`).join("<br>") || "–"],
    [L("ครุภัณฑ์ที่ใช้งาน", "Assets in service"), (S.assets || []).filter(a => a.unit === u.id && assetInService(a)).length]]),
});

CRUD.def("orgPos", {
  noun: ["ตำแหน่ง", "Position"], st: ORG_ST, live: true,
  list: () => S.positions || [], id: p => p.id, title: p => `${tx(p.title)} · ${unitName(p.unit)}`, sub: p => (p.holder ? userName(p.holder) : L("ตำแหน่งว่าง", "Vacant")),
  status: p => (p.holder ? "filled" : "vacant"), search: p => `${p.id} ${p.title.join(" ")} ${unitName(p.unit)} ${p.holder ? userName(p.holder) : ""}`,
  filters: [{ id: "u", label: ["หน่วย", "Unit"], opts: () => allUnitOpts(), get: p => p.unit }, { id: "st", label: ["สถานะ", "Status"], opts: () => [["vacant", L("ว่าง", "Vacant")], ["filled", L("มีผู้ดำรง", "Filled")]], get: p => (p.holder ? "filled" : "vacant") }],
  cols: [{ h: ["รหัส", "No."], c: p => `<span class="mono">${p.id}</span>` }, { h: ["ตำแหน่ง", "Position"], c: p => `<b style="font-weight:600">${esc(tx(p.title))}</b>` }, { h: ["หน่วย", "Unit"], c: p => esc(unitName(p.unit)) },
    { h: ["ผู้ดำรงตำแหน่ง", "Holder"], c: p => (p.holder ? esc(userName(p.holder)) : `<span class="sub">–</span>`) }, { h: ["วงเงินอนุมัติ (บาท)", "Approval limit (baht)"], n: true, c: p => fmt(p.limit) }],
  fields: (p, v) => [
    { id: "unit", label: ["หน่วย", "Unit"], type: "select", req: true, value: p ? p.unit : "", opts: allUnitOpts() },
    { id: "th", label: ["ชื่อตำแหน่ง (ไทย)", "Title (Thai)"], req: true, value: p ? p.title[0] : "" }, { id: "en", label: ["ชื่อตำแหน่ง (อังกฤษ)", "Title (English)"], value: p ? p.title[1] : "" },
    { id: "holder", label: ["ผู้ดำรงตำแหน่ง", "Holder"], type: "select", blank: L("ว่าง", "Vacant"), value: p ? p.holder : "", opts: userOpts() },
    { id: "limit", label: ["วงเงินอนุมัติ (บาท)", "Approval limit (baht)"], type: "number", req: true, min: 0, value: p ? p.limit : 0 },
  ],
  check: (v, p) => v.holder && S.positions.some(x => x.holder === v.holder && (!p || x.id !== p.id)) ? [{ f: "holder", m: L("ผู้ใช้นี้ดำรงตำแหน่งอื่นอยู่แล้ว", "This person already holds another position") }] : [],
  create: { can: isOrgAdmin, label: ["เพิ่มตำแหน่ง", "Add a position"], run: v => { const n = { id: eNextId("PS-", S.positions), unit: v.unit, title: [v.th, v.en || v.th], holder: v.holder, limit: v.limit }; S.positions.push(n); audit(["เพิ่มตำแหน่ง", "Added a position"], `${n.id} ${v.th}`); return n; } },
  edit: { can: isOrgAdmin, why: p => p.limit !== undefined, run: (p, v, why) => { const old = p.limit; Object.assign(p, { unit: v.unit, title: [v.th, v.en || v.th], holder: v.holder, limit: v.limit }); audit(["แก้ไขตำแหน่ง", "Edited a position"], `${p.id}${old !== v.limit ? ` · ${fmt(old)} → ${fmt(v.limit)}` : ""} · ${why}`); } },
  acts: p => (!isOrgAdmin() ? [] : [p.holder && { id: "vac", label: L("ทำให้ว่าง", "Make vacant"), why: true, run: (x, why) => { const h = x.holder; x.holder = ""; audit(["ทำให้ตำแหน่งว่าง", "Vacated a position"], `${x.id} ${userName(h)} · ${why}`); return L("ตำแหน่งว่างแล้ว", "Position is vacant"); } },
    { id: "del", label: L("ลบตำแหน่ง", "Delete"), kind: "danger", why: true, run: (x, why) => { S.positions = S.positions.filter(y => y !== x); audit(["ลบตำแหน่ง", "Deleted a position"], `${x.id} · ${why}`); return L("ลบแล้ว", "Deleted"); } }].filter(Boolean)),
  view: p => kv([[L("หน่วย", "Unit"), esc(unitName(p.unit))], [L("ผู้ดำรงตำแหน่ง", "Holder"), p.holder ? esc(userName(p.holder)) : L("ว่าง", "Vacant")], [L("วงเงินอนุมัติ", "Approval limit"), baht(p.limit)]]),
});

CRUD.def("orgTier", {
  noun: ["ขั้นอนุมัติตามวงเงิน", "Approval tier"], live: false,
  list: () => (S.tiers || []).slice().sort((a, b) => (a.doc < b.doc ? -1 : a.doc > b.doc ? 1 : a.min - b.min)), id: t => t.id, title: t => `${tx(TIER_DOC[t.doc])} · ${t.min ? "≥ " + fmt(t.min) : L("ทุกวงเงิน", "any amount")}`, sub: t => tx(ROLES[t.role]),
  filters: [{ id: "doc", label: ["เอกสาร", "Document"], opts: () => Object.keys(TIER_DOC).map(k => [k, tx(TIER_DOC[k])]), get: t => t.doc }],
  cols: [{ h: ["เอกสาร", "Document"], c: t => esc(tx(TIER_DOC[t.doc])) }, { h: ["วงเงินตั้งแต่ (บาท)", "From (baht)"], n: true, c: t => fmt(t.min) }, { h: ["ผู้อนุมัติ", "Approver"], c: t => `<b style="font-weight:600">${esc(tx(ROLES[t.role]))}</b>` }],
  fields: t => [
    { id: "doc", label: ["เอกสาร", "Document"], type: "select", req: true, value: t ? t.doc : "xfer", lock: !!t, show: t ? esc(tx(TIER_DOC[t.doc])) : "", opts: Object.keys(TIER_DOC).map(k => [k, tx(TIER_DOC[k])]) },
    { id: "min", label: ["วงเงินตั้งแต่ (บาท)", "From amount (baht)"], type: "number", req: true, min: 0, value: t ? t.min : 0, hint: L("0 = ทุกวงเงิน ขั้นที่วงเงินสูงสุดซึ่งไม่เกินยอดเอกสารเป็นผู้อนุมัติ", "0 = any amount. The tier with the highest minimum not above the amount approves") },
    { id: "role", label: ["ผู้อนุมัติ", "Approver"], type: "select", req: true, value: t ? t.role : "exec", opts: ["exec", "prochead", "asset", "store", "fin", "plan", "divhead", "hr"].map(r => [r, tx(ROLES[r])]) },
  ],
  check: (v, t) => (S.tiers.some(x => x.doc === (t ? t.doc : v.doc) && x.min === v.min && (!t || x.id !== t.id)) ? [{ f: "min", m: L("มีขั้นที่วงเงินนี้แล้ว", "A tier with this amount exists") }] : t && t.min === 0 && v.min > 0 && S.tiers.filter(x => x.doc === t.doc && x.min === 0).length === 1 ? [{ f: "min", m: L("ต้องมีขั้น 'ทุกวงเงิน' อย่างน้อยหนึ่งขั้น", "Keep one 'any amount' tier") }] : []),
  create: { can: isOrgAdmin, label: ["เพิ่มขั้นอนุมัติ", "Add a tier"], run: v => { const n = { id: eNextId("TR-", S.tiers, 2), doc: v.doc, min: v.min, role: v.role }; S.tiers.push(n); audit(["เพิ่มขั้นอนุมัติ", "Added an approval tier"], `${n.id} ${v.doc} ≥ ${n.min}`); return n; } },
  edit: { can: isOrgAdmin, why: () => true, run: (t, v, why) => { const old = `${t.min}/${t.role}`; t.min = v.min; t.role = v.role; audit(["แก้ไขขั้นอนุมัติ", "Edited an approval tier"], `${t.id} · ${old} → ${v.min}/${v.role} · ${why}`); } },
  acts: t => (!isOrgAdmin() || (t.min === 0 && S.tiers.filter(x => x.doc === t.doc && x.min === 0).length === 1) ? [] : [{ id: "del", label: L("ลบขั้นอนุมัติ", "Delete the tier"), kind: "danger", why: true, run: (x, why) => { S.tiers = S.tiers.filter(y => y !== x); audit(["ลบขั้นอนุมัติ", "Deleted an approval tier"], `${x.id} · ${why}`); return L("ลบแล้ว", "Deleted"); } }]),
  view: t => kv([[L("เอกสาร", "Document"), esc(tx(TIER_DOC[t.doc]))], [L("ตั้งแต่", "From"), t.min ? baht(t.min) : L("ทุกวงเงิน", "Any amount")], [L("ผู้อนุมัติ", "Approver"), esc(tx(ROLES[t.role]))],
    [L("ทั้งสายของเอกสารนี้", "Whole chain"), esc(tierText(t.doc))]]),
});

function orgTree(id, depth) {
  const u = S.units.find(x => x.id === id), kids = unitKids(id), head = unitPositions(id).find(p => /หัวหน้า|ผู้อำนวยการ|Head|director/i.test(p.title.join(" ")));
  return `<li><div class="orgn" style="padding-left:${depth * 18}px"><span class="mono sub">${esc(u.code)}</span> <b style="font-weight:600">${esc(tx(u.name))}</b> <span class="sub">${head && head.holder ? "· " + esc(userName(head.holder)) : head ? "· " + L("ตำแหน่งหัวหน้าว่าง", "head position vacant") : ""} · ${S.users.filter(x => x.unit === id).length} ${L("คน", "users")}</span></div>${kids.length ? `<ul class="orgl">${kids.map(k => orgTree(k.id, depth + 1)).join("")}</ul>` : ""}</li>`;
}
const ORG_APP = "DPT Organization";
ePageDef("org", "org-tree", "O1", "org", ORG_ROLES, ["โครงสร้างหน่วยงาน", "Organization structure"], () => {
  const top = S.units.find(u => !u.parent);
  return `${eHead(ORG_APP, "O1", ["โครงสร้างหน่วยงาน", "Organization structure"], ["หน่วยงานและสังกัด ใช้ร่วมกับทุกแอป · ผู้ดูแลระบบเป็นผู้แก้ไข", "Units and reporting lines used by every app · the administrator edits"], `<button class="btn ghost" type="button" data-jump="admin">${L("ผู้ใช้และสิทธิ์ (M10)", "Users and permissions (M10)")}</button>`)}
    ${eKpis([[L("หน่วยงาน", "Units"), S.units.length], [L("ผู้ใช้", "Users"), S.users.filter(u => u.active).length], [L("ตำแหน่งว่าง", "Vacant positions"), (S.positions || []).filter(p => !p.holder).length, "", (S.positions || []).some(p => !p.holder)]])}
    <section class="panel"><header><h2>${L("ผังโครงสร้าง", "Structure chart")}</h2></header><div class="body"><ul class="orgl root">${orgTree(top.id, 0)}</ul></div></section>
    ${crudList("orgUnit", { head: `<h2>${L("ทะเบียนหน่วยงาน", "Unit register")}</h2>` })}`;
});
ePageDef("org", "org-pos", "O2", "org", ORG_ROLES, ["ตำแหน่งและวงเงินอนุมัติ", "Positions and approval limits"], () => `${eHead(ORG_APP, "O2", ["ตำแหน่งและวงเงินอนุมัติ", "Positions and approval limits"], ["ตำแหน่งในแต่ละหน่วย ผู้ดำรงตำแหน่ง และวงเงินที่อนุมัติได้ · ข้อมูลบุคลากรจริงมาจาก Smart HR", "Positions per unit, who holds them and what they may approve · real staff data comes from Smart HR"])}
    ${eKpis([[L("ตำแหน่งทั้งหมด", "Positions"), (S.positions || []).length], [L("ตำแหน่งว่าง", "Vacant"), (S.positions || []).filter(p => !p.holder).length, "", (S.positions || []).some(p => !p.holder)]])}
    ${crudList("orgPos", { head: `<h2>${L("ทะเบียนตำแหน่ง", "Position register")}</h2>` })}`);
ePageDef("org", "org-tier", "O3", "org", ORG_ROLES, ["ขั้นอนุมัติตามวงเงิน", "Approval tiers"], () => `${eHead(ORG_APP, "O3", ["ขั้นอนุมัติตามวงเงิน", "Approval tiers"], ["กำหนดว่าเอกสารแต่ละชนิดต้องให้ใครอนุมัติตามวงเงิน · แอปครุภัณฑ์ วัสดุ และข้อตกลงอ่านตารางนี้ตอนอนุมัติ", "Who must approve each kind of document by amount · the assets, inventory and agreements apps read this table when approving"])}
    <section class="panel"><div class="body"><dl class="cr-kv">${Object.keys(TIER_DOC).map(k => `<dt>${esc(tx(TIER_DOC[k]))}</dt><dd>${esc(tierText(k))}</dd>`).join("")}</dl></div></section>
    ${crudList("orgTier", { head: `<h2>${L("ตารางขั้นอนุมัติ", "Tier table")}</h2>` })}`);
