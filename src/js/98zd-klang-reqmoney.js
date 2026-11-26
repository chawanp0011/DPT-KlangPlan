// KlangFinance, budget round Q4a (10 Nov 2569): the request form's kinds of money, off-budget money, expenditure
// categories and a fourth account type. Asked for by the user from the division's side of the budget system:
//  - account type 1 to 4 (the form had 1 to 3);
//  - kind of money: budget money, whose types follow the Budget Bureau and can be set (page BQ2), and off-budget money,
//    whose types can also be set (BQ2); a request can hold several off-budget lines (type, amount, note), and the form shows
//    the budget total, the off-budget total and the sum;
//  - main and sub expenditure category chosen from a table (page BQ3) that Planning keeps; before this they were typed.
// The kinds of money are the four the form already had (entitlement, obligation, multi-year commitment, baseline) as budget
// money, plus four off-budget types of mine (income, outside grant, donation, loan). The category table holds a few rows
// of mine, marked as samples, plus code 700 land and construction that came from the screenshot of 3 Nov; none of it is the
// Budget Bureau's code table, which I have not seen. Planning is expected to replace it with the real codes.
// Old requests keep what they had: a category typed before stays and shows as "typed earlier" until another is picked, and
// the old "co-funding" fields (c.co) are kept in step with the new off-budget lines (c.offs).
const RQM_ACT = ["plan"]; // who keeps the lists: Planning (the user's wording: Planning sets the kinds of money)
const rqmCan = () => RQM_ACT.includes(ROLE);
const rqMoneyTypes = kind => (S.moneyTypes || []).filter(t => t.kind === kind && !t.retired);
const rqMoneyName = id => { const t = (S.moneyTypes || []).find(x => x.id === id); return t ? tx(t.name) : id || "–"; };
const rqCats = (level, parent) => (S.expCats || []).filter(c => c.level === level && !c.retired && (!parent || c.parent === parent));
const rqOffTotal = c => sumv((c.offs || []).map(o => Number(o.amt) || 0));
function rqSyncCo(c) { const n = (c.offs || []).length; c.co = { on: n > 0, amt: rqOffTotal(c), src: (c.offs || []).map(o => rqMoneyName(o.type)).join(", ") }; }

// ---------- panels used by the request form (file 98x calls these) ----------
function rqOffPanel(r, c, ed) {
  const ds = ed ? "" : "disabled", types = rqMoneyTypes("off"), off = rqOffTotal(c);
  return `<div class="f full"><label>${L("เงินนอกงบประมาณ (ประเภทตั้งที่ BQ2)", "Off-budget money (types set on BQ2)")}</label>
    ${(c.offs || []).map((o, i) => `<div class="row" style="flex-wrap:wrap;margin-bottom:6px"><select id="rq-off-t-${i}" aria-label="${L("ประเภทเงินนอกงบ", "Off-budget type")}" ${ds}><option value="">${L("— ประเภท —", "— type —")}</option>${types.map(t => `<option value="${t.id}" ${t.id === o.type ? "selected" : ""}>${esc(tx(t.name))}</option>`).join("")}${o.type && !types.some(t => t.id === o.type) ? `<option value="${esc(o.type)}" selected>${esc(rqMoneyName(o.type))}</option>` : ""}</select>
      <input type="number" min="0" id="rq-off-a-${i}" value="${o.amt || ""}" placeholder="${L("จำนวน (บาท)", "Amount (baht)")}" style="max-width:170px" ${ds}><input type="text" id="rq-off-n-${i}" value="${esc(o.note || "")}" placeholder="${L("แหล่งเงิน/หมายเหตุ", "Source / note")}" ${ds}>
      ${ed ? `<button class="btn ghost" type="button" id="rq-off-x-${i}" aria-label="${L("ลบบรรทัด", "Remove the line")}">×</button>` : ""}</div>`).join("") || `<span class="sub">${L("ไม่มีเงินนอกงบประมาณ", "No off-budget money")}</span>`}
    ${ed ? `<div class="row"><button class="btn" type="button" id="rq-off-add" ${types.length ? "" : "disabled"}>+ ${L("เพิ่มเงินนอกงบประมาณ", "Add off-budget money")}</button>${types.length ? "" : `<span class="sub">${L("ยังไม่มีประเภทเงินนอกงบ ตั้งที่ BQ2", "No off-budget type yet; set one on BQ2")}</span>`}</div>` : ""}
    <div class="row" style="margin-top:6px"><span class="sub">${L("เงินงบประมาณ", "Budget money")} <b>${fmt(r.amount)}</b> · ${L("เงินนอกงบประมาณ", "Off-budget money")} <b>${fmt(off)}</b> · ${L("รวม", "Total")} <b>${fmt(r.amount + off)}</b> ${L("บาท", "baht")}</span></div></div>`;
}
function rqBindOff(r, c, re) {
  const g = id => document.querySelector(id);
  (c.offs || []).forEach((o, i) => {
    const t = g("#rq-off-t-" + i), a = g("#rq-off-a-" + i), n = g("#rq-off-n-" + i), x = g("#rq-off-x-" + i);
    if (t) t.onchange = e => { o.type = e.target.value; rqSyncCo(c); re(); };
    if (a) a.onchange = e => { o.amt = Math.max(0, Number(e.target.value) || 0); rqSyncCo(c); re(); };
    if (n) n.oninput = e => { o.note = e.target.value; rqSyncCo(c); save(); };
    if (x) x.onclick = () => { c.offs.splice(i, 1); rqSyncCo(c); re(); };
  });
  const add = g("#rq-off-add"); if (add) add.onclick = () => { (c.offs = c.offs || []).push({ type: "", amt: 0, note: "" }); rqSyncCo(c); re(); };
  rqBindCats(r, c, re); // the budget type and category selects (file 98zg)
}
let rqBindCats = () => {};

// ---------- the two lists ----------
const rqMoneyUsed = t => S.requests.some(r => r.cls && ((r.cls.money || []).includes(t.id) || (r.cls.offs || []).some(o => o.type === t.id)));
CRUD.def("moneyType", {
  noun: ["ประเภทเงิน", "Kind of money"], st: RET_ST, status: t => (t.retired ? "retired" : "live"), gone: t => !!t.retired, id: t => t.id, title: t => tx(t.name), sub: t => (t.kind === "bud" ? L("เงินงบประมาณ", "Budget money") : L("เงินนอกงบประมาณ", "Off-budget money")),
  list: () => S.moneyTypes || [], search: t => `${t.name.join(" ")} ${t.code || ""}`, filters: [{ id: "kd", label: ["กลุ่ม", "Group"], opts: () => [["bud", L("เงินงบประมาณ", "Budget money")], ["off", L("เงินนอกงบประมาณ", "Off-budget money")]], get: t => t.kind }],
  cols: [{ h: ["กลุ่ม", "Group"], c: t => (t.kind === "bud" ? L("เงินงบประมาณ", "Budget money") : L("เงินนอกงบประมาณ", "Off-budget money")) }, { h: ["ประเภทเงิน", "Kind"], c: t => esc(tx(t.name)) }, { h: ["รหัส", "Code"], c: t => `<span class="mono">${esc(t.code || "–")}</span>` }, { h: ["ใช้ในคำขอ", "Used by"], n: true, c: t => S.requests.filter(r => r.cls && ((r.cls.money || []).includes(t.id) || (r.cls.offs || []).some(o => o.type === t.id))).length }],
  fields: t => [{ id: "kind", label: ["กลุ่ม", "Group"], type: "select", req: true, value: t ? t.kind : "bud", lock: !!t, show: t && (t.kind === "bud" ? L("เงินงบประมาณ", "Budget money") : L("เงินนอกงบประมาณ", "Off-budget money")), opts: [["bud", L("เงินงบประมาณ (ตามที่ สงป. กำหนด)", "Budget money (as set by the Bureau)")], ["off", L("เงินนอกงบประมาณ", "Off-budget money")]] },
    { id: "th", label: ["ชื่อประเภทเงิน", "Name"], req: true, wide: true, value: t ? t.name[0] : "" }, { id: "en", label: ["ภาษาอังกฤษ", "English"], wide: true, value: t ? t.name[1] : "" }, { id: "code", label: ["รหัส (ถ้ามี)", "Code (if any)"], value: t ? t.code || "" : "" }],
  check: (v, t) => ((S.moneyTypes || []).some(x => x !== t && x.kind === (t ? t.kind : v.kind) && !x.retired && x.name[0] === v.th) ? [{ f: "th", m: L("กลุ่มนี้มีประเภทชื่อนี้แล้ว", "This group already has that name") }] : []),
  create: { can: rqmCan, label: ["เพิ่มประเภทเงิน", "Add a kind of money"], run: v => { const t = { id: `${v.kind}${String(Math.max(0, ...S.moneyTypes.map(x => Number(String(x.id).replace(/\D/g, "")) || 0)) + 1).padStart(2, "0")}`, kind: v.kind, name: [v.th, v.en || v.th], code: v.code || "" }; S.moneyTypes.push(t); audit(["เพิ่มประเภทเงิน", "Added a kind of money"], `${t.id} ${v.th}`); return t; } },
  edit: { can: t => rqmCan() && !t.retired, run: (t, v) => { Object.assign(t, { name: [v.th, v.en || v.th], code: v.code || "" }); audit(["แก้ประเภทเงิน", "Edited a kind of money"], t.id); } },
  acts: t => (rqmCan() ? retireAct(["ประเภทเงิน", "kind of money"], rqMoneyUsed, x => { S.moneyTypes = S.moneyTypes.filter(y => y !== x); })(t) : []),
  view: t => kv([[L("กลุ่ม", "Group"), t.kind === "bud" ? L("เงินงบประมาณ", "Budget money") : L("เงินนอกงบประมาณ", "Off-budget money")], [L("ชื่อ", "Name"), esc(tx(t.name))], [L("รหัส", "Code"), esc(t.code || "–")]]),
});
// ---------- seed ----------
Object.keys(SEEDS).forEach(k => {
  const prev = SEEDS[k].seed;
  SEEDS[k].seed = () => {
    const s = prev(), nm = (a, b) => [a, b || a];
    s.moneyTypes = [...RQ_MONEY.map(([id, l]) => ({ id, kind: "bud", name: l, code: "" })), { id: "off01", kind: "off", name: nm("เงินรายได้", "Own income"), code: "" }, { id: "off02", kind: "off", name: nm("เงินอุดหนุนจากภายนอก", "Outside grant"), code: "" }, { id: "off03", kind: "off", name: nm("เงินบริจาค", "Donation"), code: "" }, { id: "off04", kind: "off", name: nm("เงินกู้", "Loan"), code: "" }];
    return s;
  };
});

// ---------- pages ----------
const RQM_APP = "DPT Budget";
const rqmBar = () => `<div class="row" style="margin:0 0 12px">${rqmCan() ? tag(L("กองแผนงานแก้ได้", "Planning can edit"), "p-info") : tag(L("แก้ได้เฉพาะกองแผนงาน บทบาทอื่นดูอย่างเดียว", "Only Planning edits; others view"), "p-mute")}</div>`;
ePageDef("budget", "bq-money", "BQ2", "form", KROLES, ["ประเภทเงิน", "Kinds of money"], () => `${eHead(RQM_APP, "BQ2", ["ประเภทเงินของคำของบประมาณ", "Kinds of money for requests"], ["เงินงบประมาณ: ประเภทตามที่ สงป. กำหนด กองแผนงานเพิ่ม/แก้ได้ · เงินนอกงบประมาณ: กำหนดประเภทเองได้ ทั้งสองกลุ่มเลือกได้ในฟอร์มคำขอ · ค่าตั้งต้นเป็นตัวอย่างของผม ไม่ใช่ตารางของ สงป. ต้นแบบไม่ได้รับรายการจาก สงป.", "Budget money: types as set by the Bureau, which Planning can add to and edit · off-budget money: types can be set freely · both groups can be picked on the request form · the starting list is my sample, not the Bureau's table; nothing is received from the Bureau"])}${rqmBar()}${crudList("moneyType", { head: `<h2>${L("ประเภทเงิน", "Kinds of money")}</h2>` })}`);
Object.assign(NAV_ICON, { "bq-money": "coins", "bq-cat": "list" });
