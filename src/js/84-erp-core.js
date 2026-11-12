// Fisko-ERP-Gov, part 1: the five apps added on top of Fisko (Organization, Contract, Assets, Inventory, AI).
// Fisko already holds Budget, Procurement and Finance. The new apps follow the ERP-Government (Odoo 15) scope:
// organization and approval tiers (operating_unit, base_tier_validation), agreements (agreement, contract),
// assets (account_asset_management, asset_transfer, asset_low_value), stock (stock_request, stock_card_report,
// stock_no_negative). Nothing here uses Odoo code: the rules are rewritten in the Fisko list + drawer pattern.
// Every figure is fictional sample data. Tier thresholds, asset categories and useful lives are samples to confirm.

// ---------- roles ----------
ROLES.asset = ["เจ้าหน้าที่ทะเบียนครุภัณฑ์", "Asset registrar"];
ROLES.store = ["เจ้าหน้าที่คลังวัสดุ", "Store keeper"];
const ERP_ROLES = Object.keys(ROLES).filter(r => r !== "vendor");
{
  const home = NAV.find(n => n.id === "home");
  ["asset", "store"].forEach(r => { if (!home.roles.includes(r)) home.roles.push(r); });
}

// ---------- apps ----------
Object.assign(GROUPS, { org: ["โครงสร้างองค์กร", "Organization"], ctr: ["สัญญาและข้อตกลง", "Contracts and agreements"], ast: ["ครุภัณฑ์", "Assets"], inv: ["วัสดุคงคลัง", "Inventory"], aig: ["AI ช่วยจัดการ", "AI assistance"] });
Object.assign(APPS, {
  org: { name: ["DPT Organization", "DPT Organization"], desc: ["โครงสร้างหน่วยงาน ตำแหน่ง และวงเงินอนุมัติ", "Units, positions and approval limits"], groups: ["org"], mark: "OR", color: "#2F6F6A" },
  contract: { name: ["DPT Contract", "DPT Contract"], desc: ["สัญญา ข้อตกลง และกำหนดเวลา", "Contracts, agreements and deadlines"], groups: ["ctr"], mark: "CT", color: "#7A5C8E" },
  assets: { name: ["DPT Assets", "DPT Assets"], desc: ["ทะเบียนครุภัณฑ์ โอน ตรวจนับ ค่าเสื่อม", "Register, transfers, counts, depreciation"], groups: ["ast"], mark: "AS", color: "#8A6A3B" },
  inventory: { name: ["DPT Inventory", "DPT Inventory"], desc: ["วัสดุคงคลัง ใบเบิก รับเข้า บัตรคุม", "Stock, requests, receipts, stock card"], groups: ["inv"], mark: "IV", color: "#4F7A4B" },
  ai: { name: ["DPT AI", "DPT AI"], desc: ["ผู้ช่วย AI และ Agent ทุกโมดูล", "AI assistants and agents across modules"], groups: ["aig"], mark: "AI", color: "#5B5FA8" },
});
APP_IDS.splice(0, APP_IDS.length, "org", "budget", "procurement", "contract", "finance", "assets", "inventory", "ai");
{
  const base = appOfLink;
  appOfLink = l => {
    if (typeof l === "string") for (const [p, a] of [["org-", "org"], ["ct-", "contract"], ["as-", "assets"], ["in-", "inventory"], ["ai-", "ai"]]) if (l.startsWith(p)) return a;
    return base(l);
  };
}

// ---------- reference data ----------
// Document types that need an approval tier (ERP: base_tier_validation). Amounts are in baht.
const TIER_DOC = {
  xfer: ["โอน / ย้ายครุภัณฑ์ข้ามหน่วย", "Asset transfer between units"], dispose: ["จำหน่ายครุภัณฑ์", "Asset disposal"],
  issue: ["เบิกวัสดุจากคลัง", "Stock issue"], adjust: ["ปรับยอดวัสดุจากการนับ", "Stock count adjustment"], agr: ["ข้อตกลง / สัญญานอกการจัดซื้อ", "Agreement outside procurement"],
};
// Asset categories: the code and useful life are sample values, to be confirmed against the Comptroller General's rules.
const ASSET_CATS = [
  { id: "7440", name: ["ครุภัณฑ์คอมพิวเตอร์", "Computer equipment"], life: 5 },
  { id: "7110", name: ["ครุภัณฑ์สำนักงาน", "Office equipment"], life: 8 },
  { id: "7520", name: ["ยานพาหนะ", "Vehicles"], life: 8 },
  { id: "7310", name: ["ครุภัณฑ์ไฟฟ้าและวิทยุ", "Electrical and radio"], life: 5 },
  { id: "7620", name: ["ครุภัณฑ์งานบ้านงานครัว", "Household equipment"], life: 8 },
];
const assetCat = id => ASSET_CATS.find(c => c.id === id) || ASSET_CATS[1];
const ASSET_LOW = 5000; // below this an item is kept in the register but not depreciated (ERP: account_asset_low_value); a sample value
const STOCK_CATS = [["paper", ["กระดาษและเครื่องเขียน", "Paper and stationery"]], ["ict", ["วัสดุคอมพิวเตอร์", "Computer supplies"]], ["clean", ["วัสดุสำนักงานและทำความสะอาด", "Office and cleaning"]], ["other", ["วัสดุอื่น", "Other"]]];
const baht = n => `${fmt(n)} ${L("บาท", "baht")}`;
const tagN = (cls, th, en) => tag(L(th, en), cls);
const eNextId = (prefix, arr, width = 4) => `${prefix}${String(maxNo(arr.map(x => x.id), new RegExp(`^${prefix}(\\d+)`)) + 1).padStart(width, "0")}`;
const jsonHas = id => JSON.stringify({ ...S, units: null, positions: null, audit: null, notes: null, aiLog: null }).includes(`"${id}"`);

// Who approves a document of this type and amount: the tier with the highest minimum not above the amount.
function tierRole(doc, amount) {
  const t = (S.tiers || []).filter(x => x.doc === doc && x.min <= amount).sort((a, b) => b.min - a.min)[0];
  return t ? t.role : "exec";
}
// A tier names the role that approves; the procurement roles also act as asset registrar and store keeper (duty list: ฝ่ายพัสดุ, คลังพัสดุ).
const roleIs = r => ROLE === r || ((r === "asset" || r === "store") && (ROLE === "proc" || ROLE === "prochead"));
const tierText = doc => (S.tiers || []).filter(x => x.doc === doc).sort((a, b) => a.min - b.min).map(x => `${x.min ? "≥ " + fmt(x.min) : L("ทุกวงเงิน", "any amount")}: ${tx(ROLES[x.role])}`).join(" · ");

// ---------- assets: derived values ----------
const ymIdx = iso => { const [y, m] = iso.slice(0, 7).split("-").map(Number); return y * 12 + m - 1; };
function assetDep(a, asOf = TODAY) {
  const life = assetCat(a.cat).life * 12, low = a.cost < ASSET_LOW;
  if (a.status === "pending" || a.status === "cancelled" || low) return { monthly: 0, months: 0, acc: 0, nbv: a.cost, low };
  const end = a.status === "disposed" && a.disp ? a.disp.date : asOf;
  const months = Math.max(0, Math.min(life, ymIdx(end) - ymIdx(a.acq) + 1)), monthly = (a.cost - 1) / life;
  const acc = Math.round(monthly * months);
  return { monthly, months, acc, nbv: Math.max(1, a.cost - acc), low, life };
}
const assetInService = a => ["active", "repair", "disp_req"].includes(a.status);
function depForMonth(ym) {
  const idx = ymIdx(ym + "-01");
  return Math.round((S.assets || []).filter(a => assetInService(a) && a.cost >= ASSET_LOW && ymIdx(a.acq) <= idx && idx - ymIdx(a.acq) < assetCat(a.cat).life * 12)
    .reduce((s, a) => s + (a.cost - 1) / (assetCat(a.cat).life * 12), 0));
}
const ymAdd = (ym, n) => { const i = ymIdx(ym + "-01") + n; return `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}`; };

// ---------- stock: derived values ----------
const onHand = id => (S.smoves || []).filter(m => m.item === id).reduce((s, m) => s + m.qty, 0);
const stockItem = id => (S.sitems || []).find(i => i.id === id);
const stockName = id => (stockItem(id) ? tx(stockItem(id).name) : id);
const reqValue = r => r.lines.reduce((s, l) => s + l.qty * ((stockItem(l.item) || { price: 0 }).price), 0);
const stockLow = i => !i.retired && onHand(i.id) <= i.reorder;

// ---------- seed ----------
function erpSeed(s) {
  const prevS = S; S = s; // the helpers above read S
  try { erpSeedInto(s); } finally { S = prevS; }
  return s;
}
function erpSeedInto(s) {
  const root = s.units.find(u => !u.parent) || s.units[0], kids = s.units.filter(u => u.parent), sec = s.units.find(u => u.code === "01") || kids[0];
  const usr = (role, unit) => (s.users.find(u => u.role === role && u.unit === unit) || {}).id || "";
  const prc = s.users.find(u => u.role === "proc");
  s.users.push({ id: "u12", role: "asset", unit: sec.id, primary: true, mfa: true, active: true, name: ["พัชรา ทะเบียนดี", "Patchara Thabiandee"] },
    { id: "u13", role: "store", unit: sec.id, primary: true, mfa: true, active: true, name: ["ประยูร คลังดี", "Prayoon Klangdee"] });
  // organization: one head position per unit, a few vacant, and the approval tiers
  s.positions = [{ id: "PS-0001", unit: root.id, title: ["หัวหน้าหน่วยงาน", "Head of agency"], holder: usr("exec", root.id), limit: 50e6 }];
  kids.forEach((u, i) => s.positions.push({ id: "PS-" + String(i + 2).padStart(4, "0"), unit: u.id, title: ["ผู้อำนวยการหน่วย", "Unit director"], holder: i % 4 === 3 ? "" : (s.users.find(x => x.unit === u.id && x.active) || {}).id || "", limit: 5e6 }));
  s.tiers = [
    { id: "TR-01", doc: "xfer", min: 0, role: "asset" }, { id: "TR-02", doc: "xfer", min: 100000, role: "exec" },
    { id: "TR-03", doc: "dispose", min: 0, role: "exec" },
    { id: "TR-04", doc: "issue", min: 0, role: "store" }, { id: "TR-05", doc: "issue", min: 20000, role: "exec" },
    { id: "TR-06", doc: "adjust", min: 0, role: "store" }, { id: "TR-07", doc: "adjust", min: 10000, role: "exec" },
    { id: "TR-08", doc: "agr", min: 0, role: "prochead" }, { id: "TR-09", doc: "agr", min: 500000, role: "exec" },
  ];
  // assets (a few come from the two sample contracts once their phases are accepted; the rest are older)
  const cust = i => usr("div", kids[i % kids.length].id) || usr("div", sec.id);
  const A = (n, th, en, cat, unitIdx, loc, acq, cost, src, status = "active", extra = {}) => ({ id: "AS-" + String(n).padStart(4, "0"), name: [th, en], cat, unit: kids[unitIdx % kids.length].id, cust: cust(unitIdx), loc, acq, cost, src, status, tag: status === "pending" ? "" : `${cat}-${String(n).padStart(4, "0")}`, ...extra });
  s.assets = [
    A(1, "เครื่องคอมพิวเตอร์ตั้งโต๊ะ ชุดที่ 1", "Desktop computers, set 1", "7440", 0, "ห้อง 201", "2022-03-15", 420000, { type: "purchase" }),
    A(2, "เครื่องพิมพ์เลเซอร์สี", "Colour laser printer", "7440", 1, "ห้อง 305", "2023-06-20", 38000, { type: "purchase" }),
    A(3, "เซิร์ฟเวอร์ประมวลผล", "Compute server", "7440", 2, "ห้องศูนย์ข้อมูล", "2024-01-10", 1850000, { type: "purchase" }),
    A(4, "โต๊ะประชุม 12 ที่นั่ง", "Meeting table, 12 seats", "7110", 0, "ห้องประชุมใหญ่", "2021-09-01", 96000, { type: "purchase" }),
    A(5, "ตู้เหล็กเก็บเอกสาร", "Steel filing cabinet", "7110", 3, "ห้อง 108", "2020-05-12", 4200, { type: "purchase" }),
    A(6, "รถยนต์ตรวจการ", "Inspection vehicle", "7520", 4, "ลานจอด", "2022-11-30", 1250000, { type: "purchase" }),
    A(7, "เครื่องปรับอากาศ 24,000 BTU", "Air conditioner 24,000 BTU", "7310", 1, "ห้อง 305", "2023-02-14", 45000, { type: "purchase" }, "repair", { repairWhy: "คอมเพรสเซอร์ขัดข้อง" }),
    A(8, "กล้องถ่ายภาพดิจิทัล", "Digital camera", "7310", 2, "ห้อง 410", "2025-04-18", 68000, { type: "donation" }),
    A(9, "เครื่องคอมพิวเตอร์พกพา", "Laptop computers", "7440", 3, "ห้อง 108", "2025-10-05", 360000, { type: "purchase" }),
    A(10, "เครื่องถ่ายเอกสารเก่า", "Old photocopier", "7110", 0, "ห้องพัสดุ", "2016-07-01", 120000, { type: "purchase" }, "disp_req", { dispReq: { why: "ชำรุดเกินซ่อม ค่าซ่อมสูงกว่ามูลค่า", by: "u12", t: "2026-10-12T10:00" } }),
    A(11, "ชุดระบบจัดการคิว (จากสัญญา CT-2570-001 งวด 1)", "Queue system (contract CT-2570-001, phase 1)", "7440", 1, "", "2026-10-14", 560000, { type: "contract", id: "CT-2570-001", phase: 1 }, "pending"),
    A(12, "พัดลมตั้งพื้น", "Floor fan", "7620", 3, "ห้อง 108", "2024-03-02", 1800, { type: "purchase" }),
  ];
  s.axfers = [
    { id: "XF-0001", asset: "AS-0004", from: s.assets[3].unit, to: kids[1 % kids.length].id, why: "ย้ายไปใช้ที่ห้องประชุมของหน่วยที่รับผิดชอบโครงการใหม่", value: 96000, status: "submitted", by: "u12", t: "2026-10-13T09:30" },
    { id: "XF-0002", asset: "AS-0002", from: s.assets[1].unit, to: kids[0].id, why: "รวมเครื่องพิมพ์ไว้ที่หน่วยเดียว", value: 38000, status: "done", by: "u12", t: "2026-09-02T09:30", decided: { by: "u12", t: "2026-09-03T10:00" } },
  ];
  s.acount = [{ id: "CNT-" + CUR_FY, fy: CUR_FY, status: "open", start: "2026-10-01", results: { "AS-0001": "found", "AS-0002": "found", "AS-0003": "found", "AS-0004": "found" } }];
  s.depRuns = [];
  for (const ym of ["2026-07", "2026-08"]) s.depRuns.push({ id: "DP-" + ym, month: ym, total: depForMonth(ym), n: s.assets.filter(a => assetInService(a) && a.cost >= ASSET_LOW && ymIdx(a.acq) <= ymIdx(ym + "-01")).length, by: "u12", t: ymAdd(ym, 1) + "-03T10:00" });
  s.depRuns.reverse();
  // inventory
  const IT = (n, th, en, cat, uom, price, reorder, loc) => ({ id: "MT-" + String(n).padStart(3, "0"), name: [th, en], cat, uom, price, reorder, loc });
  s.sitems = [IT(1, "กระดาษ A4 80 แกรม", "A4 paper 80 gsm", "paper", "รีม", 115, 100, "ชั้น A1"), IT(2, "ปากกาลูกลื่น", "Ballpoint pen", "paper", "ด้าม", 6, 200, "ชั้น A1"), IT(3, "แฟ้มสันกว้าง", "Wide-spine file", "paper", "เล่ม", 38, 60, "ชั้น A2"),
    IT(4, "หมึกพิมพ์เลเซอร์ดำ", "Black laser toner", "ict", "ตลับ", 2400, 6, "ชั้น B1"), IT(5, "เมาส์ไร้สาย", "Wireless mouse", "ict", "ตัว", 320, 8, "ชั้น B1"), IT(6, "แฟลชไดรฟ์ 64 GB", "64 GB flash drive", "ict", "ชิ้น", 210, 10, "ชั้น B2"),
    IT(7, "น้ำยาทำความสะอาดพื้น", "Floor cleaner", "clean", "แกลลอน", 185, 12, "ชั้น C1"), IT(8, "ถุงขยะ 30x40", "Garbage bags 30x40", "clean", "แพ็ก", 45, 50, "ชั้น C1"), IT(9, "กระดาษทิชชู่", "Tissue paper", "clean", "แพ็ก", 62, 80, "ชั้น C2"), IT(10, "ซองจดหมายสีน้ำตาล A4", "Brown A4 envelope", "paper", "ซอง", 3, 300, "ชั้น A3")];
  const open = [420, 1500, 140, 9, 12, 25, 30, 90, 70, 800];
  s.smoves = []; s.sitems.forEach((it, i) => s.smoves.push({ id: "MV-" + String(i + 1).padStart(4, "0"), t: "2026-10-01T09:00", item: it.id, type: "OPEN", qty: open[i], cost: it.price, ref: "ยอดยกมา", by: "u13" }));
  const out = (item, q, ref, t) => s.smoves.push({ id: "MV-" + String(s.smoves.length + 1).padStart(4, "0"), t, item, type: "OUT", qty: -q, cost: stockItem0(s, item).price, ref, by: "u13" });
  out("MT-001", 340, "SR-0001", "2026-10-06T10:00"); out("MT-004", 4, "SR-0001", "2026-10-06T10:00"); out("MT-004", 2, "SR-0002", "2026-10-09T10:00"); out("MT-007", 20, "SR-0002", "2026-10-09T10:00"); out("MT-010", 560, "SR-0003", "2026-10-12T10:00"); out("MT-006", 14, "SR-0003", "2026-10-12T10:00");
  const unitDiv = i => kids[i % kids.length].id, divUser = i => usr("div", unitDiv(i)) || usr("div", sec.id);
  const SR = (n, ui, lines, why, status, extra = {}) => ({ id: "SR-" + String(n).padStart(4, "0"), unit: unitDiv(ui), by: divUser(ui), lines: lines.map(([item, qty]) => ({ item, qty })), why, status, t: "2026-10-0" + n + "T09:00", ...extra });
  s.sreqs = [SR(1, 0, [["MT-001", 340], ["MT-004", 4]], "ใช้พิมพ์เอกสารประชุมประจำเดือนและงานรับสมัคร", "issued"), SR(2, 1, [["MT-004", 2], ["MT-007", 20]], "สำรองใช้ประจำไตรมาส", "issued"),
    SR(3, 2, [["MT-010", 560], ["MT-006", 14]], "ส่งหนังสือเชิญประชุมและเก็บข้อมูลภาคสนาม", "issued"), SR(4, 3, [["MT-002", 100], ["MT-003", 20]], "ใช้ในงานสำนักงานประจำเดือน", "submitted"),
    SR(5, 0, [["MT-009", 100]], "ใช้ประจำเดือน", "draft")];
  s.srecv = [{ id: "GR-0001", ref: "PO-2570-0007", vendor: "ร้านตัวอย่างเครื่องเขียน", date: "2026-10-14", lines: [{ item: "MT-001", qty: 200, cost: 118 }], status: "posted", by: "u13", t: "2026-10-14T14:00" },
    { id: "GR-0002", ref: "PO-2570-0009", vendor: "บริษัท ตัวอย่างวัสดุสำนักงาน จำกัด", date: "2026-10-16", lines: [{ item: "MT-004", qty: 6, cost: 2350 }], status: "draft", by: "u13", t: "2026-10-16T09:00" }];
  s.smoves.push({ id: "MV-" + String(s.smoves.length + 1).padStart(4, "0"), t: "2026-10-14T14:00", item: "MT-001", type: "IN", qty: 200, cost: 118, ref: "GR-0001", by: "u13" });
  s.sitems[0].price = Math.round((115 * 80 + 118 * 200) / 280 * 100) / 100; // moving average after receipt GR-0001
  s.scount = [{ id: "SC-0001", item: "MT-008", book: 90, counted: 87, diff: -3, value: 135, reason: "นับสต็อกประจำเดือน พบถุงขยะหายไป 3 แพ็ก", status: "posted", by: "u13", t: "2026-10-10T15:00" }];
  s.smoves.push({ id: "MV-" + String(s.smoves.length + 1).padStart(4, "0"), t: "2026-10-10T15:00", item: "MT-008", type: "ADJ", qty: -3, cost: 45, ref: "SC-0001", by: "u13" });
  s.reorder = [];
  // agreements outside procurement
  const AGR = (n, kind, th, en, party, ui, amount, start, end, status, extra = {}) => ({ id: "AGR-" + CUR_FY + "-" + String(n).padStart(3, "0"), kind, name: [th, en], party, unit: kids[ui % kids.length].id, amount, start, end, status, owner: (prc || s.users[0]).id, ...extra });
  s.agr = [AGR(1, "lease", "สัญญาเช่าพื้นที่จัดเก็บเอกสาร", "Archive space lease", "บริษัท ตัวอย่างคลังเอกสาร จำกัด", 0, 360000, "2026-01-01", "2026-12-31", "active"),
    AGR(2, "mou", "บันทึกข้อตกลงความร่วมมือด้านข้อมูลกับมหาวิทยาลัยตัวอย่าง", "Data cooperation MOU with a sample university", "มหาวิทยาลัยตัวอย่าง", 2, 0, "2026-03-01", "2026-12-15", "active"),
    AGR(3, "service", "ข้อตกลงบริการบำรุงรักษาลิฟต์", "Lift maintenance service agreement", "บริษัท ตัวอย่างลิฟต์ จำกัด", 4, 780000, "2026-11-01", "2027-10-31", "review"),
    AGR(4, "license", "ข้อตกลงใช้สิทธิซอฟต์แวร์สำนักงาน", "Office software licence agreement", "บริษัท ตัวอย่างซอฟต์แวร์ จำกัด", 1, 150000, "2026-12-01", "2027-11-30", "draft")];
  // agents added by the ERP-Government scope
  s.agents.push({ id: "AG-30", on: true, uses: 0, name: ["Asset Watch Agent", "Asset Watch Agent"], what: ["ตรวจครุภัณฑ์ที่ยังไม่ขึ้นทะเบียน ไม่มีผู้ดูแล ใกล้ครบอายุ และที่นับไม่พบ", "Finds unregistered assets, missing custodians, assets near end of life and uncounted items"] },
    { id: "AG-31", on: true, uses: 0, name: ["Reorder Planner Agent", "Reorder Planner Agent"], what: ["เสนอรายการวัสดุที่ควรเติมสต็อกจากจุดสั่งซื้อ ให้เจ้าหน้าที่พัสดุพิจารณา", "Proposes stock to replenish from reorder points for procurement to consider"] },
    { id: "AG-32", on: true, uses: 0, name: ["Organization Check Agent", "Organization Check Agent"], what: ["ตรวจตำแหน่งว่าง หน่วยที่ไม่มีหัวหน้า และช่องว่างของวงเงินอนุมัติ", "Checks vacant positions, units without a head and gaps in approval tiers"] },
    { id: "AG-33", on: true, uses: 0, name: ["Agreement Watch Agent", "Agreement Watch Agent"], what: ["เฝ้าข้อตกลงและสัญญาที่ใกล้สิ้นสุด และร่างข้อความแจ้งเตือนให้ผู้รับผิดชอบ", "Watches agreements ending soon and drafts reminder text for owners"] });
}
const stockItem0 = (s, id) => s.sitems.find(i => i.id === id);
Object.keys(SEEDS).forEach(k => { const base = SEEDS[k].seed; SEEDS[k].seed = () => erpSeed(base()); });

// ---------- shared page pieces ----------
const eHead = (appName, code, label, sub, extra) => `<div class="head"><div><div class="eyebrow">${appName} · ${code}</div><h1>${tx(label)}</h1><p>${tx(sub)}</p></div>${extra ? `<div class="row">${extra}</div>` : ""}</div>`;
const eKpis = items => `<section class="kpis" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">${items.map(([l, v, d, hl]) => `<div class="kpi ${hl ? "hl" : ""}"><span class="l">${l}</span><span class="v">${v}</span>${d ? `<span class="d sub">${d}</span>` : ""}</div>`).join("")}</section>`;
const eNote = html => `<section class="panel"><div class="body sub">${html}</div></section>`;
const eBind = () => $$("#view [data-jump]").forEach(b => (b.onclick = () => jump(b.dataset.jump)));
const eInbox = (title, rows) => `<section class="panel"><header><h2>${title}</h2><span class="sp"></span><span class="sub">${rows.length} ${L("รายการ", "items")}</span></header>
  ${rows.length ? `<div class="tbl-wrap"><table><tbody>${rows.map(r => `<tr><td>${dotI(r.cls === "p-bad" ? "bad" : r.cls === "p-warn" ? "warn" : "ok")}<b style="font-weight:600">${esc(r.title)}</b>${r.sub ? `<div class="sub">${esc(r.sub)}</div>` : ""}</td><td><button class="btn" type="button" data-jump="${r.link}">${L("เปิด", "Open")}</button></td></tr>`).join("")}</tbody></table></div>` : `<div class="body sub">${dotI("ok")}${L("ไม่มีงานค้าง", "Nothing waiting")}</div>`}</section>`;
// A page of the new apps: one NAV entry, one VIEW, the shared binder.
function ePageDef(app, id, code, group, roles, label, view, bind) {
  NAV.push({ id, code, group, app, roles, label });
  VIEWS[id] = view; BIND[id] = () => { eBind(); if (bind) bind(); };
}
Object.assign(NAV_ICON, { "org-tree": "building", "org-pos": "users", "org-tier": "layers", "ct-reg": "pen", "ct-agr": "file", "ct-watch": "clock", "ct-plan": "coins", "as-today": "home", "as-reg": "tag", "as-intake": "inbox", "as-xfer": "share", "as-count": "checksq", "as-dep": "trend",
  "in-today": "home", "in-items": "list", "in-req": "clipboard", "in-recv": "download", "in-card": "book", "in-count": "scale", "ai-hub": "sparkle", "ai-run": "bot", "ai-log": "activity", flow: "gantt" });

// ---------- my work in the new apps ----------
{
  const base = famTasks;
  famTasks = R => {
    base(R);
    if (!S.assets) return;
    const open = (S.axfers || []).filter(x => x.status === "submitted"), low = S.sitems.filter(stockLow);
    if (ROLE === "asset") {
      open.filter(x => tierRole("xfer", x.value) === "asset").forEach(x => R(`${L("พิจารณาการโอนครุภัณฑ์", "Decide an asset transfer")} ${x.id}`, `${x.asset} · ${baht(x.value)}`, TODAY, "as-xfer", "p-info"));
      S.assets.filter(a => a.status === "pending").forEach(a => R(`${L("ยืนยันขึ้นทะเบียนครุภัณฑ์", "Confirm asset registration")} ${a.id}`, tx(a.name), TODAY, "as-reg", "p-warn"));
      const c = (S.acount || []).find(x => x.status === "open"); if (c) R(`${L("ตรวจนับครุภัณฑ์ประจำปี", "Annual asset count")} ${c.id}`, `${Object.keys(c.results).length}/${S.assets.filter(assetInService).length}`, "2026-12-31", "as-count", "p-info");
    }
    if (ROLE === "exec") {
      open.filter(x => tierRole("xfer", x.value) === "exec").forEach(x => R(`${L("อนุมัติการโอนครุภัณฑ์", "Approve an asset transfer")} ${x.id}`, `${x.asset} · ${baht(x.value)}`, TODAY, "as-xfer", "p-info"));
      S.assets.filter(a => a.status === "disp_req").forEach(a => R(`${L("อนุมัติจำหน่ายครุภัณฑ์", "Approve an asset disposal")} ${a.id}`, tx(a.name), TODAY, "as-reg", "p-warn"));
      S.sreqs.filter(r => r.status === "submitted" && tierRole("issue", reqValue(r)) === "exec").forEach(r => R(`${L("อนุมัติใบเบิกวัสดุ", "Approve a stock request")} ${r.id}`, baht(reqValue(r)), TODAY, "in-req", "p-info"));
      (S.scount || []).filter(c => c.status === "pending").forEach(c => R(`${L("อนุมัติปรับยอดวัสดุ", "Approve a stock adjustment")} ${c.id}`, baht(c.value), TODAY, "in-count", "p-warn"));
    }
    if (ROLE === "store") {
      S.sreqs.filter(r => r.status === "submitted" && tierRole("issue", reqValue(r)) === "store").forEach(r => R(`${L("อนุมัติใบเบิกวัสดุ", "Approve a stock request")} ${r.id}`, baht(reqValue(r)), TODAY, "in-req", "p-info"));
      S.sreqs.filter(r => r.status === "approved").forEach(r => R(`${L("จ่ายวัสดุ", "Issue stock")} ${r.id}`, unitName(r.unit), TODAY, "in-req", "p-info"));
      S.srecv.filter(r => r.status === "draft").forEach(r => R(`${L("ลงรับวัสดุ", "Post a receipt")} ${r.id}`, r.ref, TODAY, "in-recv", "p-warn"));
      if (low.length) R(L(`วัสดุต่ำกว่าจุดสั่งซื้อ ${low.length} รายการ`, `${low.length} items below the reorder point`), low.slice(0, 3).map(i => tx(i.name)).join(", "), TODAY, "in-items", "p-warn");
    }
    if (ROLE === "div") S.sreqs.filter(r => r.unit === me().unit && r.status === "draft").forEach(r => R(`${L("ส่งใบเบิกวัสดุ", "Send the stock request")} ${r.id}`, baht(reqValue(r)), TODAY, "in-req", "p-info"));
    if (ROLE === "prochead" || ROLE === "exec") (S.agr || []).filter(a => a.status === "review" && tierRole("agr", a.amount) === ROLE).forEach(a => R(`${L("อนุมัติข้อตกลง", "Approve an agreement")} ${a.id}`, `${tx(a.name)} · ${baht(a.amount)}`, a.start, "ct-agr", "p-info"));
    if (ROLE === "proc") (S.reorder || []).filter(x => x.status === "sent").forEach(x => R(`${L("พิจารณาเติมสต็อก", "Consider replenishing")} ${stockName(x.item)}`, `${fmt(x.qty)} ${stockItem(x.item).uom[0]} · ${baht(x.est)}`, TODAY, "prc-reqn", "p-info"));
  };
}
