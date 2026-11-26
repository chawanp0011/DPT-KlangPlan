// KlangFinance, budget round Q4c (12 Nov 2569): the expenditure reference table, from the reference file the user gave
// (columns REF_ID, REF_CODE, REF_NAME, REF_TYPE, PARENT_ID). It replaces the table of samples of mine that Q4a had.
// The file holds four levels, each pointing at its parent:
//   BUD_TYPE  budget type          01 to 05 (personnel, operating, investment, subsidies, other)
//   OBJC      group of categories  1 to 7, each under a budget type
//   SUB_OBJC  main category        100 .. 900 (for example 700 land and construction), each under a group
//   OBJC_SUB  sub category         100 .. 900, each under a main category
// How I read the names: SUB_OBJC is what the request form calls the "main expenditure category" and OBJC_SUB the "sub
// expenditure category" (the earlier screenshot had 700 / 700); OBJC, the group above them, has no name in the form, so I
// call it "group of categories". Under the main categories 100 to 700 the file lists one sub category with the same code; under
// 800 (subsidies) and 900 (other) it lists all twelve, so a subsidy can be spent as any kind of category.
// The seed below is rebuilt from the file by code, so it does NOT keep the file's REF_ID values. Page BQ3 is a register that is
// keyed in by hand (13 Nov 2569, at the user's word: no file import; before that it had an import and an export of this file).
// One name in the picture reads "ค้างจ้างประจำ"
// for group 1; I used the usual wording "ค่าจ้างประจำ" in the seed, so check it.
// What the request form does with it: choose the budget type (blank = the type of the budget lines), then the main category
// from those under that type, then the sub category under the main one. The earlier fields c1code (main) and c2code (sub) are
// kept; c.btype holds the chosen budget type (per, ope, inv, sub, oth) when one is chosen.
const EC_LV = { bud: ["ประเภทงบประมาณ", "Budget type"], grp: ["หมวด (กลุ่ม)", "Group of categories"], main: ["หมวดรายจ่ายหลัก", "Main category"], sub: ["หมวดรายจ่ายย่อย", "Sub category"] };
const EC_TYPE = { BUD_TYPE: "bud", OBJC: "grp", SUB_OBJC: "main", OBJC_SUB: "sub" }; // REF_TYPE in the file
const EC_PARENT = { grp: "bud", main: "grp", sub: "main" };
const ecById = id => (S.expCats || []).find(x => x.id === id);
const ecKids = id => (S.expCats || []).filter(x => x.parent === id && !x.retired);
const ecMain = code => (S.expCats || []).find(x => x.level === "main" && x.code === code && !x.retired);
const ecSub = (mainCode, code) => { const m = ecMain(mainCode); return m ? (S.expCats || []).find(x => x.level === "sub" && x.parent === m.id && x.code === code) : null; };
// the budget type id the chain of a main or sub category leads to ("per", "ope", ...) from the budget-type code 01 to 05
const ecBudOf = x => { let n = x; while (n && n.level !== "bud") n = ecById(n.parent); return n ? (BUDGET_TYPES.find(t => String(t.code).padStart(2, "0") === String(n.code).padStart(2, "0")) || {}).id || "" : ""; };
const ecEffType = (r, c) => c.btype || rqDominant(r);
const ecMains = type => rqCats("main").filter(m => !type || ecBudOf(m) === type);
const ecPath = x => { const o = []; let n = x; while (n) { o.unshift(n); n = ecById(n.parent); } return o; };

// ---------- the form's three selects ----------
function rqCatFields(c, ds, r) {
  const eff = r ? ecEffType(r, c) : c.btype || "", mains = ecMain(c.c1code) ? ecMains(eff) : ecMains(eff), main = ecMain(c.c1code), subs = main ? rqCats("sub", main.id) : [];
  const out = main && !mains.includes(main), typedMain = c.c1code && !main, typedSub = c.c2code && main && !ecSub(c.c1code, c.c2code);
  const so = (cur, list, none) => `<option value="">${none}</option>${list.map(x => `<option value="${esc(x.code)}" ${x.code === cur ? "selected" : ""}>${esc(x.code)} · ${esc(tx(x.name))}</option>`).join("")}`;
  return `<div class="f"><label for="rq-bt">${L("ประเภทงบประมาณ", "Budget type")}</label><select id="rq-bt" ${ds}><option value="">${L("ตามรายการงบประมาณ", "From the budget lines")}${r ? ` (${esc(typeName(rqDominant(r)))})` : ""}</option>${BUDGET_TYPES.map(t => `<option value="${t.id}" ${c.btype === t.id ? "selected" : ""}>${esc(String(t.code).padStart(2, "0"))} · ${esc(tx(t.name))}</option>`).join("")}</select></div>
    <div class="f"><label for="rq-c1">${L("หมวดรายจ่ายหลัก", "Main expenditure category")}</label><select id="rq-c1" ${ds}>${so(c.c1code, mains, L("— เลือก —", "— Choose —"))}${out ? `<option value="${esc(c.c1code)}" selected>${esc(c.c1code)} · ${esc(tx(main.name))} (${L("อยู่นอกประเภทงบที่เลือก", "outside the chosen budget type")})</option>` : ""}${typedMain ? `<option value="${esc(c.c1code)}" selected>${esc(c.c1code)} · ${esc(c.c1name)} (${L("พิมพ์ไว้เดิม ไม่อยู่ในตาราง", "typed earlier, not in the table")})</option>` : ""}</select><span class="hint">${L("เลือกจากตารางอ้างอิง (BQ3) ที่กองแผนงานดูแล", "Chosen from the reference table (BQ3) that Planning keeps")}</span></div>
    <div class="f"><label for="rq-c2">${L("หมวดรายจ่ายย่อย", "Sub expenditure category")}</label><select id="rq-c2" ${ds || !c.c1code ? "disabled" : ""}>${so(c.c2code, subs, L("— เลือก —", "— Choose —"))}${typedSub ? `<option value="${esc(c.c2code)}" selected>${esc(c.c2code)} · ${esc(c.c2name)} (${L("พิมพ์ไว้เดิม ไม่อยู่ในตาราง", "typed earlier, not in the table")})</option>` : ""}</select></div>`;
}
{ // bind the three selects (rqBindOff in file 98zd calls this)
  const prev = typeof rqBindCats === "function" ? rqBindCats : null;
  rqBindCats = (r, c, re) => {
    const g = id => document.querySelector(id), bt = g("#rq-bt"), c1 = g("#rq-c1"), c2 = g("#rq-c2");
    if (bt) bt.onchange = e => { c.btype = e.target.value; const m = ecMain(c.c1code); if (m && c.btype && ecBudOf(m) !== c.btype) { c.c1code = c.c1name = c.c2code = c.c2name = ""; } re(); };
    if (c1) c1.onchange = e => { const m = ecMain(e.target.value); c.c1code = e.target.value; c.c1name = m ? tx(m.name) : ""; c.c2code = ""; c.c2name = ""; re(); };
    if (c2) c2.onchange = e => { const s = ecSub(c.c1code, e.target.value); c.c2code = e.target.value; c.c2name = s ? tx(s.name) : ""; re(); };
  };
}
{ // a chosen budget type that the lines or the category do not match is flagged (warn only)
  const ck = checks;
  checks = r => { const out = ck(r), c = rqCls(r), main = ecMain(c.c1code), msgs = [];
    if (c.btype && c.btype !== rqDominant(r)) msgs.push(`${L("ประเภทงบที่เลือก", "chosen type")} ${typeName(c.btype)} ≠ ${L("ตามรายการงบประมาณ", "the budget lines")} ${typeName(rqDominant(r))}`);
    if (main && ecBudOf(main) !== (c.btype || rqDominant(r))) msgs.push(`${L("หมวดหลัก", "main category")} ${main.code} ${L("อยู่ใต้", "belongs to")} ${typeName(ecBudOf(main))}`);
    if (msgs.length) out.push({ s: "wa", title: L("ประเภทงบและหมวดรายจ่าย", "Budget type and categories"), d: msgs.join(" · "), id: null }); return out; };
}

// ---------- the reference table ----------
const ecUsed = x => (S.expCats || []).some(k => k.parent === x.id && !k.retired) || (x.level === "main" && S.requests.some(r => r.cls && r.cls.c1code === x.code)) || (x.level === "sub" && S.requests.some(r => r.cls && r.cls.c2code === x.code && ecMain(r.cls.c1code) && ecMain(r.cls.c1code).id === x.parent)) || (x.level === "bud" && S.requests.some(r => r.cls && r.cls.btype === ecBudOf(x)));
CRUD.def("expCat", {
  noun: ["รายการในตารางอ้างอิงรายจ่าย", "Expenditure reference row"], st: RET_ST, status: c => (c.retired ? "retired" : "live"), gone: c => !!c.retired, id: c => c.id, title: c => `${c.code} ${tx(c.name)}`, sub: c => tx(EC_LV[c.level]), live: true,
  list: () => (S.expCats || []).slice().sort((a, b) => ["bud", "grp", "main", "sub"].indexOf(a.level) - ["bud", "grp", "main", "sub"].indexOf(b.level) || String(ecPath(a).map(x => x.code).join("/")).localeCompare(String(ecPath(b).map(x => x.code).join("/")))), search: c => `${c.code} ${c.name.join(" ")} ${ecPath(c).map(x => x.code).join(" ")}`,
  filters: [{ id: "lv", label: ["ระดับ", "Level"], opts: () => Object.keys(EC_LV).map(k => [k, tx(EC_LV[k])]), get: c => c.level }],
  cols: [{ h: ["ระดับ", "Level"], c: c => esc(tx(EC_LV[c.level])) }, { h: ["รหัส", "Code"], c: c => `<span class="mono">${esc(c.code)}</span>` }, { h: ["ชื่อ", "Name"], c: c => esc(tx(c.name)) }, { h: ["อยู่ใต้", "Under"], c: c => `<span class="sub">${esc(ecPath(c).slice(0, -1).map(x => x.code).join(" › ") || "–")}</span>` }, { h: ["ใช้ในคำขอ", "Used by"], n: true, c: c => (c.level === "main" ? S.requests.filter(r => r.cls && r.cls.c1code === c.code).length : c.level === "sub" ? S.requests.filter(r => r.cls && r.cls.c2code === c.code && ecMain(r.cls.c1code) && ecMain(r.cls.c1code).id === c.parent).length : "–") }],
  fields: (c, v) => { const lv = v && v.level !== undefined ? v.level : c ? c.level : "main", pl = EC_PARENT[lv]; return [{ id: "level", label: ["ระดับ", "Level"], type: "select", req: true, value: c ? c.level : "main", lock: !!c, show: c && tx(EC_LV[c.level]), opts: Object.keys(EC_LV).map(k => [k, tx(EC_LV[k])]) },
    ...(pl ? [{ id: "parent", label: [`อยู่ใต้ ${EC_LV[pl][0]}`, `Under: ${EC_LV[pl][1]}`], type: "select", req: true, value: c ? c.parent || "" : "", blank: L("— เลือก —", "— Choose —"), opts: (S.expCats || []).filter(x => x.level === pl && !x.retired).map(x => [x.id, `${x.code} · ${tx(x.name)}`]) }] : []),
    { id: "code", label: ["รหัส", "Code"], req: true, value: c ? c.code : "" }, { id: "th", label: ["ชื่อ", "Name"], req: true, wide: true, value: c ? c.name[0] : "" }, { id: "en", label: ["ภาษาอังกฤษ", "English"], wide: true, value: c ? c.name[1] : "" }]; },
  check: (v, c) => { const out = [], lv = c ? c.level : v.level, par = c ? c.parent : v.parent; if ((S.expCats || []).some(x => x !== c && x.level === lv && x.code === String(v.code).trim() && (lv === "bud" || x.parent === par))) out.push({ f: "code", m: L("รหัสนี้มีอยู่แล้วภายใต้รายการเดียวกัน", "That code exists under the same parent") }); return out; },
  create: { can: rqmCan, label: ["เพิ่มรายการ", "Add a row"], run: v => { const c = { id: `EC${String(Math.max(0, ...S.expCats.map(x => Number(String(x.id).replace(/\D/g, "")) || 0)) + 1).padStart(3, "0")}`, level: v.level, code: String(v.code).trim(), name: [v.th, v.en || v.th] }; if (EC_PARENT[v.level]) c.parent = v.parent; S.expCats.push(c); audit(["เพิ่มรายการตารางอ้างอิงรายจ่าย", "Added a row to the expenditure table"], `${c.level} ${c.code} ${v.th}`); return c; } },
  edit: { can: c => rqmCan() && !c.retired, run: (c, v) => { const oc = c.code; Object.assign(c, { code: String(v.code).trim(), name: [v.th, v.en || v.th] }); if (EC_PARENT[c.level] && v.parent) c.parent = v.parent; (S.requests || []).forEach(r => { if (r.cls) { if (c.level === "main" && r.cls.c1code === oc) { r.cls.c1code = c.code; r.cls.c1name = tx(c.name); } if (c.level === "sub" && r.cls.c2code === oc && ecMain(r.cls.c1code) && ecMain(r.cls.c1code).id === c.parent) { r.cls.c2code = c.code; r.cls.c2name = tx(c.name); } } }); audit(["แก้รายการตารางอ้างอิงรายจ่าย", "Edited a row of the expenditure table"], c.id); } },
  acts: c => (rqmCan() ? retireAct(["รายการตารางรายจ่าย", "expenditure row"], ecUsed, x => { S.expCats = S.expCats.filter(y => y !== x); })(c) : []),
  view: c => kv([[L("ระดับ", "Level"), esc(tx(EC_LV[c.level]))], [L("รหัส", "Code"), esc(c.code)], [L("ชื่อ", "Name"), esc(tx(c.name))], [L("ลำดับชั้น", "Path"), esc(ecPath(c).map(x => `${x.code} ${tx(x.name)}`).join(" › "))], c.ref && [L("REF_ID", "REF_ID"), `<span class="mono">${esc(c.ref)}</span>`], [L("รายการลูก", "Children"), String(ecKids(c.id).length)]]),
});

// ---------- reading a comma or tab separated text (page BQ7 reads its file with this; page BQ3 no longer imports) ----------
function ecParse(text) {
  const t = String(text || "").replace(/^﻿/, "").replace(/\r/g, ""), delim = t.split("\n")[0].includes("\t") ? "\t" : ",", rows = []; let row = [], cell = "", q = false;
  for (let i = 0; i < t.length; i++) { const ch = t[i];
    if (q) { if (ch === '"') { if (t[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; }
    else if (ch === '"') q = true; else if (ch === delim) { row.push(cell); cell = ""; } else if (ch === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; } else cell += ch; }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); } return rows.filter(r => r.some(x => String(x).trim() !== ""));
}

// ---------- seed: rebuilt from the file by code ----------
Object.keys(SEEDS).forEach(k => {
  const prev = SEEDS[k].seed;
  SEEDS[k].seed = () => {
    const s = prev(), nm = a => [a, a], rows = [], add = (id, level, code, name, parent) => rows.push(Object.assign({ id, level, code, name: nm(name) }, parent ? { parent } : {}));
    [["01", "งบบุคลากร"], ["02", "งบดำเนินงาน"], ["03", "งบลงทุน"], ["04", "งบเงินอุดหนุน"], ["05", "งบรายจ่ายอื่น"]].forEach(([c, n]) => add("B" + c, "bud", c, n));
    [["1", "เงินเดือน ค่าจ้างประจำ", "01"], ["2", "ค่าจ้างชั่วคราว", "01"], ["3", "ค่าตอบแทนใช้สอยและวัสดุ", "02"], ["4", "ค่าสาธารณูปโภค", "02"], ["5", "ค่าครุภัณฑ์ ที่ดิน และสิ่งก่อสร้าง", "03"], ["6", "เงินอุดหนุน", "04"], ["7", "รายจ่ายอื่น", "05"]].forEach(([c, n, b]) => add("G" + c, "grp", c, n, "B" + b));
    const MAIN = [["100", "เงินเดือน", "1"], ["210", "ค่าจ้างประจำ", "1"], ["220", "ค่าจ้างชั่วคราว", "2"], ["230", "ค่าตอบแทนพนักงานราชการ", "2"], ["300", "ค่าตอบแทน", "3"], ["400", "ค่าใช้สอย", "3"], ["410", "ค่าสาธารณูปโภค", "4"], ["500", "ค่าวัสดุ", "3"], ["600", "ค่าครุภัณฑ์", "5"], ["700", "ที่ดิน และสิ่งก่อสร้าง", "5"], ["800", "เงินอุดหนุน", "6"], ["900", "รายจ่ายอื่น", "7"]];
    MAIN.forEach(([c, n, g]) => add("M" + c, "main", c, n, "G" + g));
    MAIN.forEach(([c, n]) => { if (c === "800" || c === "900") MAIN.forEach(([c2, n2]) => add(`S${c}-${c2}`, "sub", c2, n2, "M" + c)); else add(`S${c}-${c}`, "sub", c, n, "M" + c); });
    s.expCats = rows; return s;
  };
});

// ---------- page BQ3 ----------
ePageDef("budget", "bq-cat", "BQ3", "form", KROLES, ["ตารางอ้างอิงรายจ่าย", "Expenditure reference table"], () => {
  const n = lv => (S.expCats || []).filter(x => x.level === lv && !x.retired).length;
  return `${eHead("DPT Budget", "BQ3", ["ตารางอ้างอิงรายจ่าย: ประเภทงบ หมวด หมวดรายจ่ายหลัก/ย่อย", "Expenditure reference: budget type, group, main and sub category"], ["ฟอร์มคำขอเลือกประเภทงบประมาณ หมวดรายจ่ายหลัก และหมวดรายจ่ายย่อยจากตารางนี้ · แสดงเป็นทะเบียน กองแผนงานเพิ่ม แก้ไข และเลิกใช้ด้วยการคีย์ ไม่มีการนำเข้าไฟล์ · ตั้งต้นสร้างจากตารางอ้างอิงที่ผู้ใช้ให้ (ประเภทงบ หมวด หมวดรายจ่ายหลัก/ย่อย)", "The request form picks the budget type, main and sub category from this table · shown as a register; Planning adds, edits and retires rows by keying them in, there is no file import · the starting rows are rebuilt from the reference table the user gave"])}
    ${eKpis([[L("ประเภทงบ", "Budget types"), n("bud")], [L("หมวด (กลุ่ม)", "Groups"), n("grp")], [L("หมวดรายจ่ายหลัก", "Main categories"), n("main")], [L("หมวดรายจ่ายย่อย", "Sub categories"), n("sub")]])}
    ${rqmBar()}${crudList("expCat", { head: `<h2>${L("ตารางอ้างอิงรายจ่าย", "Reference table")}</h2>` })}`;
}, () => {});
