// Fisko-ERP-Gov, part 4: Fisko Assets (module 6). Written new; Fisko had no assets app (its Procurement design leaves
// assets and stock to a future "Fisko Assets"). ERP-Government reference: account_asset_management, account_asset_number,
// account_asset_transfer, account_asset_low_value, account_asset_from_expense, l10n_th_gov_account_asset_management.
// Round R9 (Nov 2569) reworked the app around the Comptroller General's Department letter ที่ กค 0423.3/ว 238 (4 Sep 2557):
// 22 asset types with a useful-life range, straight-line depreciation, salvage value 1 baht, and items under 5,000 baht
// expensed in the year bought but still controlled in the register. Types live in 87b (A8), the depreciation register in
// 87b (A7), requisitions in 87c (A10), reports and flows in 87d. Everything is a sample: the CGD account codes are placeholders.
const AS_ROLES = ["asset", "div", "divhead", "exec", "fin", "audit", "proc", "prochead", "plan", "admin"];
const AS_APP = "DPT Assets";
Object.assign(GROUPS, { asd: ["ภาพรวมและรายงาน", "Overview and reports"], ast: ["ทะเบียนและงานประจำ", "Register and daily work"], asp: ["ค่าเสื่อมราคา", "Depreciation"], asm: ["ข้อมูลหลัก", "Master data"] });
APPS.assets.groups.splice(0, 1, "asd", "ast", "asp", "asm");
const AS_ST = { pending: [["รอยืนยันขึ้นทะเบียน", "Awaiting registration"], "p-warn"], active: [["ใช้งาน", "In service"], "p-ok"], spare: [["พร้อมจ่าย (ยังไม่มีผู้ใช้)", "Spare, ready to issue"], "p-info"], repair: [["ส่งซ่อม", "In repair"], "p-info"], disp_req: [["รออนุมัติจำหน่าย", "Disposal requested"], "p-warn"], disposed: [["จำหน่ายแล้ว", "Disposed"], "p-mute"], cancelled: [["ยกเลิก", "Cancelled"], "p-mute"] };
const AX_ST = { submitted: [["รออนุมัติ", "Awaiting approval"], "p-info"], approved: [["อนุมัติ รอรับโอน", "Approved, awaiting receipt"], "p-warn"], done: [["โอนแล้ว", "Transferred"], "p-ok"], rejected: [["ไม่อนุมัติ", "Not approved"], "p-bad"], cancelled: [["ยกเลิก", "Cancelled"], "p-mute"] };
// Where an asset came from, and the details each source needs (document, who it came from, price basis).
const SRC_T = { purchase: ["ซื้อ / จ้าง", "Purchase"], contract: ["จากสัญญาจัดซื้อ", "From a procurement contract"], donation: ["รับบริจาค", "Donation"], transfer_in: ["รับโอนจากหน่วยงานอื่น", "Received from another agency"], found: ["พบเกินจากการตรวจนับ", "Found in a count"] };
const SRC_NEW = ["purchase", "donation", "transfer_in", "found"];
const DON_BASIS = { donor: ["ราคาที่ผู้บริจาคระบุ", "Price stated by the donor"], market: ["ราคาตลาด ณ วันที่ได้รับ (ผู้บริจาคไม่ได้ระบุ)", "Market price on the day received"] };
const SRC_FIELDS = {
  purchase: [{ k: "ref", label: ["เลขที่สัญญา / ใบสั่งซื้อ", "Contract / purchase order no."], req: true }, { k: "party", label: ["ผู้ขาย / ผู้รับจ้าง", "Supplier"], req: true }, { k: "inv", label: ["เลขที่ใบส่งของ / ใบกำกับภาษี", "Delivery note / tax invoice no."] }, { k: "warr", label: ["รับประกันถึงวันที่", "Warranty until"], type: "date" }],
  donation: [{ k: "party", label: ["ผู้บริจาค", "Donor"], req: true }, { k: "ref", label: ["เลขที่หนังสือบริจาค / หนังสือตอบรับ", "Donation / acceptance letter no."], req: true }, { k: "basis", label: ["ราคาทุนที่ใช้", "Basis of the cost"], type: "select", req: true, opts: Object.keys(DON_BASIS).map(k => [k, tx(DON_BASIS[k])]) }],
  transfer_in: [{ k: "party", label: ["หน่วยงานที่โอนให้", "Transferred by"], req: true }, { k: "ref", label: ["เลขที่หนังสือส่งมอบ", "Hand-over letter no."], req: true }, { k: "book", label: ["ราคาตามบัญชีของหน่วยงานเดิม (บาท)", "Book value at the former agency (baht)"], type: "number" }],
  found: [{ k: "ref", label: ["รอบตรวจนับ / หนังสือรายงาน", "Count round / report letter"], req: true }, { k: "party", label: ["ผู้พบ / ผู้ตรวจสอบ", "Found by"] }],
};
SRC_FIELDS.contract = SRC_FIELDS.purchase;
const DISP_M = { sale: ["ขาย / ทอดตลาด", "Sale or auction"], transfer_out: ["โอนหรือบริจาคให้หน่วยงานอื่น", "Transfer or donate out"], destroy: ["ทำลาย / แปรสภาพ", "Destroy or scrap"], lost: ["สูญหาย / ถูกลักทรัพย์", "Lost or stolen"] };
const asset = id => (S.assets || []).find(a => a.id === id);
const assetName = id => (asset(id) ? tx(asset(id).name) : id);
const isAsset = () => ROLE === "asset" || ROLE === "proc" || ROLE === "prochead";
const myUnitOnly = () => ROLE === "div" || ROLE === "divhead";
const asVisible = a => !myUnitOnly() || a.unit === me().unit;
const custOpts = () => S.users.filter(u => u.active && u.role !== "vendor").map(u => [u.id, `${tx(u.name)} · ${unitName(u.unit)}`]);
const xAssets = x => x.assets || (x.asset ? [x.asset] : []);
const atypeOpts = () => (S.atypes || ASSET_TYPE_DEFS).filter(t => t.on !== false).map(t => [t.id, `${t.id} ${tx(t.name)}`]);
const typeLabel = id => { const t = assetType(id); return `${t.id} ${tx(t.name)}`; };
const rateOf = life => Number((100 / life).toFixed(2));
const tagFor = cat => `${cat}-${String(maxNo((S.assets || []).map(x => x.tag), new RegExp(`^${cat.replace(/\./g, "\\.")}-(\\d+)`)) + 1).padStart(4, "0")}`;
const locOpts = () => (S.alocs || []).filter(l => l.on !== false).map(l => [l.id, alocName(l.id)]);
function alocName(id) {
  const l = (S.alocs || []).find(x => x.id === id); if (!l) return "";
  const b = (S.bldgs || []).find(x => x.id === l.bldg), parts = [b ? b.name : "", l.floor ? `${L("ชั้น", "floor")} ${l.floor}` : "", l.name];
  return parts.filter(Boolean).join(" · ");
}
const locText = a => [a.locId ? alocName(a.locId) : a.loc, a.locNote].filter(Boolean).join(" · ");
const srcLines = a => { const s = a.src || {}, defs = SRC_FIELDS[s.type] || SRC_FIELDS.purchase; return defs.map(f => s[f.k] !== undefined && s[f.k] !== "" && s[f.k] != null ? [tx(f.label), f.type === "date" ? fdate(s[f.k]) : f.k === "basis" ? esc(tx(DON_BASIS[s[f.k]] || ["–", "–"])) : f.type === "number" ? baht(s[f.k]) : esc(String(s[f.k]))] : null).filter(Boolean); };
const srcFromVals = (type, v) => { const o = { type }; (SRC_FIELDS[type] || []).forEach(f => { const x = v["s_" + f.k]; o[f.k] = f.type === "number" ? (x === "" || x == null ? "" : Number(x)) : x == null ? "" : x; }); return o; };
const srcFieldsFor = (a, v) => { const t = a ? (a.src && a.src.type) || "purchase" : v.src || "purchase", cur = (a && a.src) || {}; return (SRC_FIELDS[t] || []).map(f => ({ id: "s_" + f.k, label: f.label, type: f.type || "text", req: f.req, opts: f.opts, value: cur[f.k] != null ? cur[f.k] : "" })); };

// Yearly depreciation table of one asset by fiscal year.
function depSchedule(a) {
  const d = assetDep(a, "2999-12-01"), life = assetCat(a.cat).life * 12, out = {};
  if (a.status === "pending" || d.low) return [];
  const start = ymIdx(a.acq), monthly = (a.cost - 1) / life;
  for (let i = 0; i < life; i++) { const m = start + i, fy = fyOf(`${Math.floor(m / 12)}-${String((m % 12) + 1).padStart(2, "0")}-01`); out[fy] = (out[fy] || 0) + monthly; }
  let acc = 0;
  return Object.keys(out).map(fy => { acc += out[fy]; return { fy: Number(fy), charge: Math.round(out[fy]), acc: Math.round(acc), nbv: Math.max(1, Math.round(a.cost - acc)) }; });
}
// Depreciation charged to one asset in one fiscal year (Oct to Sep), by month, from the same rule as assetDep.
function depInFy(a, fy) { const r = depSchedule(a).find(x => x.fy === fy); return r ? r.charge : 0; }
const countOf = (a, c) => (c.results || {})[a.id];

CRUD.def("asset", {
  noun: ["ครุภัณฑ์", "Asset"], st: AS_ST, live: true,
  list: () => (S.assets || []).filter(asVisible), id: a => a.id, title: a => tx(a.name), sub: a => `${a.tag || L("ยังไม่มีเลขครุภัณฑ์", "No asset number yet")} · ${unitName(a.unit)}`,
  status: a => a.status, gone: a => a.status === "cancelled", search: a => `${a.id} ${a.tag} ${a.name.join(" ")} ${a.loc || ""} ${a.locNote || ""} ${a.serial || ""} ${a.gfNo || ""} ${a.cust ? userName(a.cust) : ""}`,
  filters: [{ id: "u", label: ["หน่วย", "Unit"], opts: () => unitOpts(), get: a => a.unit }, { id: "cat", label: ["ประเภท", "Type"], opts: () => atypeOpts(), get: a => a.cat }, { id: "src", label: ["แหล่งที่ได้มา", "Source"], opts: () => Object.keys(SRC_T).filter(k => k !== "contract").map(k => [k, tx(SRC_T[k])]), get: a => (a.src && a.src.type === "contract" ? "purchase" : (a.src || {}).type) }],
  cols: [{ h: ["เลขครุภัณฑ์", "Asset no."], c: a => `<span class="mono">${esc(a.tag || a.id)}</span>` }, { h: ["ครุภัณฑ์", "Asset"], c: a => `<b style="font-weight:600">${esc(tx(a.name))}</b><div class="sub">${esc(typeLabel(a.cat))}</div>` },
    { h: ["หน่วย / ผู้ดูแล", "Unit / custodian"], c: a => `${esc(unitName(a.unit))}<div class="sub">${a.cust ? esc(userName(a.cust)) : L("ยังไม่ระบุผู้ดูแล", "No custodian")}</div>` },
    { h: ["สถานที่ตั้ง", "Location"], c: a => `<span class="sub">${esc(locText(a) || "–")}</span>` },
    { h: ["ได้มา", "Acquired"], c: a => fdate(a.acq) }, { h: ["ราคาทุน (บาท)", "Cost (baht)"], n: true, c: a => fmt(a.cost) }, { h: ["มูลค่าตามบัญชี (บาท)", "Book value (baht)"], n: true, c: a => fmt(assetDep(a).nbv) }],
  fields: (a, v) => {
    const fixed = !!a && a.status !== "pending", cat = v.cat || (a ? a.cat : "13"), t = assetType(cat);
    return [
      { id: "th", label: ["ชื่อ (ไทย)", "Name (Thai)"], req: true, wide: true, value: a ? a.name[0] : "" }, { id: "en", label: ["ชื่อ (อังกฤษ)", "Name (English)"], wide: true, value: a ? a.name[1] : "" },
      { id: "cat", label: ["ประเภทครุภัณฑ์ (ตามกรมบัญชีกลาง)", "Asset type (Comptroller General)"], type: "select", req: true, value: a ? a.cat : "13", lock: fixed, show: a ? esc(typeLabel(a.cat)) : "", opts: atypeOpts(), wide: true },
      { id: "_ti", type: "info", label: ["รหัส · อายุใช้งาน · อัตรา", "Code · life · rate"], html: `${esc(t.cgd || "–")} · ${t.life} ${L("ปี", "yr")} (${L("ช่วง", "range")} ${t.lifeMin}-${t.lifeMax}) · ${rateOf(t.life)}% ${L("ต่อปี", "a year")}`, wide: true },
      { id: "brand", label: ["ยี่ห้อ", "Brand"], value: a ? a.brand || "" : "" }, { id: "model", label: ["รุ่น / แบบ", "Model"], value: a ? a.model || "" : "" }, a ? { id: "serial", label: ["หมายเลขเครื่อง / Serial", "Serial no."], value: a.serial || "" } : { id: "serial", label: ["หมายเลขเครื่อง (บรรทัดละ 1 เครื่อง ไม่บังคับ ถ้าใส่ต้องเท่าจำนวน)", "Serial numbers (one per line, optional; then one for each item)"], type: "textarea", wide: true, value: "" },
      { id: "gfNo", label: ["เลขสินทรัพย์ในระบบ GF (ถ้ามี)", "Asset no. in the GF system (if any)"], value: a ? a.gfNo || "" : "" },
      { id: "unit", label: ["หน่วยที่ถือครอง", "Owning unit"], type: "select", req: true, value: a ? a.unit : me().unit, lock: fixed, show: a ? esc(unitName(a.unit)) : "", opts: unitOpts(), hint: fixed ? L("ย้ายหน่วยผ่านใบโอน (A4)", "Move units through a transfer (A4)") : "" },
      { id: "cust", label: ["ผู้ดูแล", "Custodian"], type: "select", blank: L("ยังไม่ระบุ", "Not set"), value: a ? a.cust : "", opts: custOpts() },
      { id: "locId", label: ["สถานที่ตั้ง (จากทะเบียนสถานที่ A9)", "Location (from the location register, A9)"], type: "select", blank: L("ยังไม่ระบุ", "Not set"), value: a ? a.locId || "" : "", opts: locOpts(), wide: true, hint: L("เลือกอาคาร ชั้น ห้อง จากทะเบียนสถานที่ เพื่อให้รายงานแยกตามที่ตั้งได้", "Pick the building, floor and room from the register so reports can group by place") },
      { id: "locNote", label: ["รายละเอียดตำแหน่งเพิ่มเติม", "More about the position"], wide: true, value: a ? a.locNote || "" : "", hint: L("เช่น มุมห้องด้านหน้าต่าง ตู้หมายเลข 3", "For example the corner by the window, cabinet 3") },
      { id: "acq", label: ["วันที่ได้มา", "Acquired on"], type: "date", req: true, value: a ? a.acq : TODAY, lock: fixed, show: a ? fdate(a.acq) : "" },
      { id: "cost", label: [a ? "ราคาทุน (บาท)" : "ราคาทุนต่อหน่วย (บาท)", a ? "Cost (baht)" : "Cost per item (baht)"], type: "number", req: true, min: 1, value: a ? a.cost : "", lock: fixed, show: a ? fmt(a.cost) : "", hint: L(`ต่ำกว่า ${fmt(ASSET_LOW)} บาท ลงทะเบียนคุมแต่ไม่คิดค่าเสื่อม`, `Under ${fmt(ASSET_LOW)} baht: controlled in the register but not depreciated`) },
      ...(a ? [] : [{ id: "qty", label: ["จำนวน (1-200)", "Quantity (1-200)"], type: "number", req: true, min: 1, max: 200, value: 1, hint: L("ใส่มากกว่า 1 จะได้หลายบรรทัดทะเบียน แต่ละรายการมีเลขครุภัณฑ์ของตัวเอง", "More than 1 makes several register lines, each with its own asset number") }, { id: "start", label: ["สถานะเริ่มต้น", "Starting status"], type: "select", req: true, value: "active", opts: [["active", tx(AS_ST.active[0])], ["spare", tx(AS_ST.spare[0])]] },
        { id: "src", label: ["แหล่งที่ได้มา", "Source"], type: "select", req: true, value: "purchase", opts: SRC_NEW.map(k => [k, tx(SRC_T[k])]), hint: L("เปลี่ยนแหล่งแล้วช่องรายละเอียดด้านล่างจะเปลี่ยนตาม", "The details below change with the source") }]),
      ...(a ? [{ id: "_st", type: "info", label: ["แหล่งที่ได้มา", "Source"], html: esc(tx(SRC_T[(a.src || {}).type] || SRC_T.purchase)) }] : []),
      ...srcFieldsFor(a, v),
    ];
  },
  check: (v, a) => { const e = []; if (!a && v.acq > TODAY) e.push({ f: "acq", m: L("วันที่ได้มาต้องไม่เกินวันนี้", "The acquisition date can't be in the future") });
    const sl = a ? (v.serial ? [v.serial] : []) : String(v.serial || "").split(/\r?\n/).map(x => x.trim()).filter(Boolean);
    if (!a && !(Number.isInteger(v.qty) && v.qty >= 1 && v.qty <= 200)) e.push({ f: "qty", m: L("จำนวนต้องเป็นเลข 1-200", "Quantity must be a whole number from 1 to 200") });
    if (!a && sl.length && sl.length !== v.qty) e.push({ f: "serial", m: L(`ใส่หมายเลขเครื่อง ${sl.length} บรรทัด แต่จำนวนคือ ${v.qty}`, `${sl.length} serial numbers for ${v.qty} items`) });
    if (new Set(sl).size !== sl.length) e.push({ f: "serial", m: L("หมายเลขเครื่องซ้ำกัน", "Duplicate serial numbers") });
    const dupS = sl.find(z => (S.assets || []).some(x => x.serial === z && (!a || x.id !== a.id) && x.status !== "cancelled")); if (dupS) e.push({ f: "serial", m: L("หมายเลขเครื่องนี้มีในทะเบียนแล้ว", "This serial number is already in the register") });
    const t = a ? null : v.cat && assetType(v.cat); if (t && t.on === false) e.push({ f: "cat", m: L("ประเภทนี้ปิดใช้งานแล้ว", "This type is switched off") });
    return e; },
  create: { can: isAsset, label: ["ลงทะเบียนครุภัณฑ์", "Register assets"], run: v => {
    const n = v.qty || 1, sl = String(v.serial || "").split(/\r?\n/).map(x => x.trim()).filter(Boolean), batch = n > 1 ? eNextId("AB-", S.abatch || [], 4) : "", made = [];
    for (let i = 0; i < n; i++) {
      const a = { id: eNextId("AS-", S.assets), name: [v.th, v.en || v.th], cat: v.cat, unit: v.unit, cust: v.cust, locId: v.locId, loc: alocName(v.locId), locNote: v.locNote, acq: v.acq, cost: v.cost, brand: v.brand, model: v.model, serial: sl[i] || "", gfNo: n > 1 ? "" : v.gfNo, src: srcFromVals(v.src, v), status: v.start === "spare" ? "spare" : "active", tag: "" };
      if (batch) a.batch = batch; a.tag = tagFor(a.cat); S.assets.push(a); made.push(a);
    }
    if (batch) { (S.abatch = S.abatch || []).unshift({ id: batch, name: made[0].name, cat: v.cat, unit: v.unit, cost: v.cost, total: v.cost * n, src: v.src, ids: made.map(a => a.id), first: made[0].tag, last: made[n - 1].tag, by: me().id, t: nowIso() }); }
    audit(["ลงทะเบียนครุภัณฑ์", "Registered an asset"], `${made[0].id} ${made[0].tag}${n > 1 ? `-${made[n - 1].tag} (${n})` : ""} ${v.th}`); return made[0]; } },
  edit: { can: a => isAsset() && a.status !== "disposed" && a.status !== "cancelled", run: (a, v) => {
    Object.assign(a, { name: [v.th, v.en || v.th], cust: v.cust, locId: v.locId, loc: alocName(v.locId), locNote: v.locNote, brand: v.brand, model: v.model, serial: v.serial, gfNo: v.gfNo, src: srcFromVals((a.src || {}).type || "purchase", v) });
    if (a.status === "pending") Object.assign(a, { cat: v.cat, unit: v.unit, acq: v.acq, cost: v.cost }); audit(["แก้ไขทะเบียนครุภัณฑ์", "Edited an asset"], `${a.id} ${v.th}`); } },
  acts: a => {
    const out = [], need = tierRole("dispose", a.cost);
    if (isAsset()) {
      if (a.status === "pending") out.push({ id: "reg", label: L("ยืนยันขึ้นทะเบียน", "Confirm registration"), kind: "primary", confirm: L("ออกเลขครุภัณฑ์และเริ่มคิดค่าเสื่อมราคา ต้องระบุผู้ดูแลและสถานที่ตั้งก่อน", "Issues the asset number and starts depreciation. Custodian and location are required first"),
        run: x => { if (!x.cust || !(x.locId || x.loc)) return L("ยังไม่ได้ระบุผู้ดูแลหรือสถานที่ตั้ง กดแก้ไขก่อน", "Set the custodian and location first (Edit)"); x.tag = tagFor(x.cat); x.status = "active"; audit(["ยืนยันขึ้นทะเบียนครุภัณฑ์", "Confirmed asset registration"], `${x.id} ${x.tag}`); return `${L("ขึ้นทะเบียนแล้ว เลขครุภัณฑ์", "Registered, asset number")} ${x.tag}`; } },
        { id: "can", label: L("ยกเลิกรายการ", "Cancel the entry"), kind: "danger", why: true, run: (x, why) => { x.status = "cancelled"; audit(["ยกเลิกรายการครุภัณฑ์", "Cancelled an asset entry"], `${x.id} · ${why}`); return L("ยกเลิกแล้ว", "Cancelled"); } });
      if (a.status === "active" || a.status === "spare") out.push({ id: "rep", label: L("ส่งซ่อม", "Send for repair"), why: true, run: (x, why) => { x.preRepair = x.status; x.status = "repair"; x.repairWhy = why; audit(["ส่งซ่อมครุภัณฑ์", "Sent an asset for repair"], `${x.id} · ${why}`); return L("บันทึกส่งซ่อมแล้ว", "Marked as in repair"); } });
      if (a.status === "repair") out.push({ id: "back", label: L("ซ่อมเสร็จ ใช้งานต่อ", "Repaired, back in service"), run: x => { x.status = x.preRepair || "active"; audit(["ซ่อมครุภัณฑ์เสร็จ", "Asset repaired"], x.id); return L("กลับมาใช้งานแล้ว", "Back in service"); } });
      if (a.status === "active" || a.status === "spare" || a.status === "repair") Object.keys(DISP_M).forEach(m => out.push({ id: "disp_" + m, label: `${L("ขอจำหน่าย", "Dispose")}: ${tx(DISP_M[m])}`, why: true, impact: () => `${L("ผู้อนุมัติ", "Approver")}: ${tx(ROLES[need])}`, run: (x, why) => { x.preDisp = x.status; x.status = "disp_req"; x.dispReq = { method: m, why, by: me().id, t: nowIso() }; audit(["ขอจำหน่ายครุภัณฑ์", "Requested disposal"], `${x.id} · ${tx(DISP_M[m])} · ${why}`); notify([need], [`ขอจำหน่ายครุภัณฑ์ ${x.id}`, `Disposal requested for ${x.id}`], "as-reg"); return L("ส่งคำขอจำหน่ายแล้ว", "Disposal requested"); } }));
      if (a.status === "disp_req") out.push({ id: "wd", label: L("ถอนคำขอจำหน่าย", "Withdraw the request"), why: true, run: (x, why) => { x.status = x.preDisp || "active"; audit(["ถอนคำขอจำหน่าย", "Withdrew a disposal request"], `${x.id} · ${why}`); return L("ถอนแล้ว", "Withdrawn"); } });
    }
    if (a.status === "disp_req" && roleIs(need)) out.push({ id: "okd", label: L("อนุมัติจำหน่าย", "Approve disposal"), kind: "primary", confirm: `${L("มูลค่าตามบัญชี", "Book value")} ${baht(assetDep(a).nbv)} · ${tx(DISP_M[(a.dispReq || {}).method] || DISP_M.destroy)}`, run: x => { x.status = "disposed"; x.disp = { date: TODAY, by: me().id, why: x.dispReq ? x.dispReq.why : "", method: x.dispReq ? x.dispReq.method : "destroy", nbv: assetDep(x).nbv }; audit(["อนุมัติจำหน่ายครุภัณฑ์", "Approved disposal"], x.id); notify(["fin"], [`จำหน่ายครุภัณฑ์ ${x.id} ปรับบัญชี`, `Asset ${x.id} disposed; adjust the books`], "fnc-close"); return L("จำหน่ายแล้ว แจ้งการเงินปรับบัญชี", "Disposed; Finance notified"); } },
      { id: "nod", label: L("ไม่อนุมัติ", "Do not approve"), kind: "danger", why: true, run: (x, why) => { x.status = x.preDisp || "active"; audit(["ไม่อนุมัติจำหน่าย", "Disposal not approved"], `${x.id} · ${why}`); notify(["asset"], [`ไม่อนุมัติจำหน่าย ${x.id}`, `Disposal of ${x.id} not approved`], "as-reg"); return L("บันทึกแล้ว", "Recorded"); } });
    return out;
  },
  view: a => { const d = assetDep(a), t = assetType(a.cat); return kv([[L("เลขครุภัณฑ์", "Asset no."), a.tag || "–"], a.gfNo && [L("เลขสินทรัพย์ในระบบ GF", "Asset no. in GF"), esc(a.gfNo)],
    [L("ประเภท", "Type"), `${esc(typeLabel(a.cat))}<div class="sub">${L("รหัสกรมบัญชีกลาง (ตัวอย่าง)", "CGD code (sample)")} ${esc(t.cgd || "–")} · ${t.life} ${L("ปี", "yr")} · ${rateOf(t.life)}% ${L("ต่อปี", "a year")}</div>`],
    (a.brand || a.model || a.serial) && [L("ยี่ห้อ / รุ่น / หมายเลข", "Brand / model / serial"), esc([a.brand, a.model, a.serial].filter(Boolean).join(" · "))],
    [L("หน่วย", "Unit"), esc(unitName(a.unit))], [L("ผู้ดูแล", "Custodian"), a.cust ? esc(userName(a.cust)) : "–"], [L("สถานที่", "Location"), esc(locText(a) || "–")],
    [L("ได้มา", "Acquired"), `${fdate(a.acq)} · ${esc(tx(SRC_T[(a.src || {}).type] || SRC_T.purchase))}`], ...srcLines(a), [L("ราคาทุน", "Cost"), baht(a.cost)],
    d.low ? [L("ค่าเสื่อมราคา", "Depreciation"), L(`ต่ำกว่าเกณฑ์ ${fmt(ASSET_LOW)} บาท ไม่คิดค่าเสื่อม (ตัวอย่าง)`, `Below ${fmt(ASSET_LOW)} baht: not depreciated (sample limit)`)] : [L("ค่าเสื่อมสะสม", "Accumulated depreciation"), `${baht(d.acc)} · ${d.months || 0} ${L("เดือน", "months")}`],
    [L("มูลค่าตามบัญชี", "Book value"), `<b>${baht(d.nbv)}</b>`], a.repairWhy && a.status === "repair" && [L("เหตุที่ซ่อม", "Repair reason"), esc(a.repairWhy)], a.dispReq && a.status === "disp_req" && [L("ขอจำหน่าย", "Disposal requested"), `${esc(tx(DISP_M[a.dispReq.method] || DISP_M.destroy))} · ${esc(a.dispReq.why)} · ${esc(userName(a.dispReq.by))}`],
    a.disp && [L("จำหน่าย", "Disposed"), `${fdate(a.disp.date)} · ${esc(tx(DISP_M[a.disp.method] || DISP_M.destroy))} · ${esc(a.disp.why)}`], a.batch && [L("ลงทะเบียนพร้อมกัน", "Registered together"), esc(a.batch)]]); },
  tabs: a => { const sc = depSchedule(a), rs = cntRounds().filter(c => countOf(a, c));
    return [["dep", L("ตารางค่าเสื่อม", "Depreciation"), sc.length ? `<div class="sub" style="margin-bottom:6px">${L("ราคาทุน − ราคาซาก 1 บาท ÷ อายุใช้งาน (เดือน) = ", "(Cost − 1 baht salvage) ÷ life in months = ")}${fmt((a.cost - 1) / (assetType(a.cat).life * 12), 2)} ${L("บาท/เดือน", "baht a month")}</div><div class="tbl-wrap"><table><thead><tr><th>${L("ปีงบประมาณ", "FY")}</th><th class="n">${L("ค่าเสื่อม", "Charge")}</th><th class="n">${L("สะสม", "Accumulated")}</th><th class="n">${L("คงเหลือ", "Book value")}</th></tr></thead><tbody>${sc.map(r => `<tr><td>${r.fy}</td><td class="n">${fmt(r.charge)}</td><td class="n">${fmt(r.acc)}</td><td class="n">${fmt(r.nbv)}</td></tr>`).join("")}</tbody></table></div>` : `<span class="sub">${L("ไม่คิดค่าเสื่อม", "Not depreciated")}</span>`],
      ["cnt", L("ผลตรวจนับ", "Counts"), rs.length ? `<div class="tbl-wrap"><table><tbody>${rs.map(c => `<tr><td>${c.fy}</td><td>${tag(tx(CNT_RES[countOf(a, c)][0]), CNT_RES[countOf(a, c)][1])}</td></tr>`).join("")}</tbody></table></div>` : `<span class="sub">${L("ยังไม่เคยตรวจนับ", "Never counted")}</span>`]]; },
});

CRUD.def("axfer", {
  noun: ["ใบโอน / ย้ายครุภัณฑ์", "Asset transfer"], st: AX_ST, live: true,
  list: () => (S.axfers || []).filter(x => !myUnitOnly() || x.from === me().unit || x.to === me().unit), id: x => x.id,
  title: x => { const l = xAssets(x); return `${assetName(l[0])}${l.length > 1 ? L(` และอีก ${l.length - 1} รายการ`, ` and ${l.length - 1} more`) : ""}`; }, sub: x => `${unitName(x.from)} → ${unitName(x.to)}`,
  status: x => x.status, gone: x => x.status === "cancelled", search: x => `${x.id} ${xAssets(x).join(" ")} ${xAssets(x).map(assetName).join(" ")}`,
  filters: [{ id: "st", label: ["สถานะ", "Status"], opts: () => Object.keys(AX_ST).map(k => [k, tx(AX_ST[k][0])]), get: x => x.status }],
  cols: [{ h: ["เลขที่", "No."], c: x => `<span class="mono">${x.id}</span>` }, { h: ["ครุภัณฑ์", "Assets"], c: x => { const l = xAssets(x); return `<b style="font-weight:600">${esc(assetName(l[0]))}</b>${l.length > 1 ? ` <span class="sub">${L(`และอีก ${l.length - 1}`, `+${l.length - 1} more`)}</span>` : ""}<div class="sub">${l.slice(0, 3).join(", ")}${l.length > 3 ? "…" : ""}</div>`; } }, { h: ["จำนวน", "Items"], n: true, c: x => xAssets(x).length }, { h: ["จาก", "From"], c: x => esc(unitName(x.from)) }, { h: ["ไป", "To"], c: x => esc(unitName(x.to)) },
    { h: ["มูลค่า (บาท)", "Value (baht)"], n: true, c: x => fmt(x.value) }, { h: ["ผู้อนุมัติ", "Approver"], c: x => `<span class="sub">${esc(tx(ROLES[tierRole("xfer", x.value)]))}</span>` }],
  fields: (x, v) => [
    { id: "from", label: ["โอนจากหน่วย", "Transfer from"], type: "select", req: true, value: v.from || (myUnitOnly() ? me().unit : (S.assets.find(a => a.status === "active") || {}).unit || ""), opts: unitOpts(), lock: myUnitOnly(), show: esc(unitName(me().unit)), hint: L("เลือกหน่วยก่อน แล้วติ๊กครุภัณฑ์ที่จะโอนได้หลายรายการ", "Pick the unit, then tick one or more assets to move") },
    { id: "assets", label: ["ครุภัณฑ์ที่โอน (เลือกได้หลายรายการ)", "Assets to transfer (one or more)"], type: "checks", req: true, value: [], opts: (S.assets || []).filter(a => a.status === "active" && a.unit === (v.from || (myUnitOnly() ? me().unit : (S.assets.find(y => y.status === "active") || {}).unit)) && !(S.axfers || []).some(y => xAssets(y).includes(a.id) && ["submitted", "approved"].includes(y.status))).map(a => [a.id, `${a.tag} ${tx(a.name)} · ${fmt(assetDep(a).nbv)} ${L("บาท", "baht")}`]), none: L("หน่วยนี้ไม่มีครุภัณฑ์ที่โอนได้", "This unit has no asset that can be moved") },
    { id: "to", label: ["โอนไปยังหน่วย", "Transfer to"], type: "select", req: true, value: "", opts: unitOpts() },
    { id: "why", label: ["เหตุผล (อย่างน้อย 10 ตัวอักษร)", "Reason (at least 10 characters)"], type: "textarea", req: true, wide: true, value: "" },
  ],
  check: v => { const l = v.assets || [], e = []; if (l.some(id => (asset(id) || {}).unit === v.to)) e.push({ f: "to", m: L("มีครุภัณฑ์ที่อยู่ที่หน่วยปลายทางแล้ว", "Some assets are already in the receiving unit") }); if ((v.why || "").length < 10) e.push({ f: "why", m: L("ใส่เหตุผลอย่างน้อย 10 ตัวอักษร", "Give a reason of at least 10 characters") }); return e; },
  create: { can: () => isAsset() || myUnitOnly(), label: ["ขอโอน / ย้ายครุภัณฑ์", "Request a transfer"], run: v => { const l = (v.assets || []).map(asset).filter(Boolean), val = l.reduce((s, a) => s + assetDep(a).nbv, 0), x = { id: eNextId("XF-", S.axfers), assets: l.map(a => a.id), from: l[0].unit, to: v.to, why: v.why, value: val, status: "submitted", by: me().id, t: nowIso() };
    S.axfers.push(x); audit(["ขอโอนครุภัณฑ์", "Requested an asset transfer"], `${x.id} ${x.assets.join(",")} · ${unitName(x.from)} → ${unitName(v.to)}`); notify([tierRole("xfer", val)], [`ใบโอนครุภัณฑ์ ${x.id} รออนุมัติ`, `Asset transfer ${x.id} awaits approval`], "as-xfer"); return x; } },
  edit: null,
  acts: x => {
    const out = [], need = tierRole("xfer", x.value);
    if (x.status === "submitted" && roleIs(need)) out.push({ id: "ok", label: L("อนุมัติ", "Approve"), kind: "primary", confirm: `${xAssets(x).length} ${L("รายการ", "items")} · ${baht(x.value)} · ${unitName(x.from)} → ${unitName(x.to)}`, run: y => { y.status = "approved"; y.decided = { by: me().id, t: nowIso() }; audit(["อนุมัติการโอนครุภัณฑ์", "Approved an asset transfer"], y.id); notify(["asset", "div"], [`ใบโอน ${y.id} อนุมัติแล้ว รอหน่วยรับโอนยืนยัน`, `Transfer ${y.id} approved; the receiving unit confirms`], "as-xfer"); return L("อนุมัติแล้ว", "Approved"); } },
      { id: "no", label: L("ไม่อนุมัติ", "Do not approve"), kind: "danger", why: true, run: (y, why) => { y.status = "rejected"; y.decided = { by: me().id, t: nowIso(), why }; audit(["ไม่อนุมัติการโอน", "Transfer not approved"], `${y.id} · ${why}`); return L("บันทึกแล้ว", "Recorded"); } });
    if (x.status === "submitted" && (x.by === me().id || isAsset())) out.push({ id: "can", label: L("ยกเลิกคำขอ", "Withdraw"), why: true, run: (y, why) => { y.status = "cancelled"; audit(["ยกเลิกใบโอน", "Withdrew a transfer"], `${y.id} · ${why}`); return L("ยกเลิกแล้ว", "Withdrawn"); } });
    if (x.status === "approved" && (isAsset() || ((ROLE === "div" || ROLE === "divhead") && me().unit === x.to))) out.push({ id: "rcv", label: L("ยืนยันรับครุภัณฑ์", "Confirm receipt"), kind: "primary", confirm: L("ย้ายครุภัณฑ์ทุกรายการมาอยู่หน่วยนี้ ผู้ดูแลและสถานที่ต้องปรับใหม่", "Moves every asset to the receiving unit; custodian and location are reset"), run: y => {
      const cu = (S.users.find(u => u.unit === y.to && u.role === "div") || {}).id || "";
      xAssets(y).map(asset).filter(Boolean).forEach(a => { a.unit = y.to; a.cust = cu; a.loc = ""; a.locId = ""; a.locNote = ""; });
      y.status = "done"; y.done = { by: me().id, t: nowIso() }; audit(["รับโอนครุภัณฑ์", "Received an asset transfer"], `${y.id} ${xAssets(y).join(",")}`); return L("โอนเรียบร้อย ปรับผู้ดูแลและสถานที่ที่ A2", "Transferred; update custodian and location at A2"); } });
    return out;
  },
  view: x => kv([[L("ครุภัณฑ์", "Assets"), `<div class="tbl-wrap"><table><tbody>${xAssets(x).map(id => `<tr><td class="mono">${id}</td><td>${esc(assetName(id))}</td><td class="n">${asset(id) ? fmt(assetDep(asset(id)).nbv) : "–"}</td></tr>`).join("")}</tbody></table></div>`], [L("จาก → ไป", "From → to"), `${esc(unitName(x.from))} → ${esc(unitName(x.to))}`], [L("มูลค่ารวม ณ วันขอ", "Total value at request"), baht(x.value)], [L("เหตุผล", "Reason"), esc(x.why)],
    [L("ผู้อนุมัติตามขั้นวงเงิน", "Approver by tier"), esc(tx(ROLES[tierRole("xfer", x.value)]))], x.decided && [L("ผลพิจารณา", "Decision"), `${esc(userName(x.decided.by))} · ${fdate(x.decided.t, true)}${x.decided.why ? " · " + esc(x.decided.why) : ""}`]]),
});

// ---------- A1 overview (dashboard) ----------
const asBars = (rows, f = fmt) => { const m = Math.max(1, ...rows.map(r => r[1])); return rows.length ? `<div class="as-bars">${rows.map(r => `<div class="as-br"><span class="as-bl" title="${esc(r[0])}">${esc(r[0])}</span><span class="bar"><i style="width:${Math.round((r[1] / m) * 100)}%"></i></span><span class="as-bv">${f(r[1])}</span></div>`).join("")}</div>` : `<div class="body sub">${L("ไม่มีข้อมูล", "No data")}</div>`; };
const asGrid = html => `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:14px">${html}</div>`;
const asPanel = (title, body, sub) => `<section class="panel"><header><h2>${title}</h2>${sub ? `<span class="sp"></span><span class="sub">${sub}</span>` : ""}</header><div class="body">${body}</div></section>`;
function asStats(list) {
  const A = (list || (S.assets || []).filter(asVisible)).filter(assetInService), cost = A.reduce((s, a) => s + a.cost, 0), nbv = A.reduce((s, a) => s + assetDep(a).nbv, 0);
  return { A, cost, nbv, acc: cost - nbv };
}
ePageDef("assets", "as-today", "A1", "asd", AS_ROLES, ["ภาพรวมครุภัณฑ์", "Assets dashboard"], () => {
  const all = (S.assets || []).filter(asVisible), { A, cost, nbv, acc } = asStats(all), c = cntRounds().find(x => x.status === "open");
  const mine = myTasks().filter(t => typeof t.link === "string" && t.link.startsWith("as-"));
  const byType = {}; A.forEach(a => { const k = typeLabel(a.cat); byType[k] = (byType[k] || 0) + assetDep(a).nbv; });
  const byUnit = {}; A.forEach(a => { const k = unitName(a.unit); byUnit[k] = (byUnit[k] || 0) + 1; });
  const byYear = {}; A.forEach(a => { const k = fyOf(a.acq); byYear[k] = (byYear[k] || 0) + 1; });
  const bySrc = {}; A.forEach(a => { const k = tx(SRC_T[(a.src || {}).type] || SRC_T.purchase); bySrc[k] = (bySrc[k] || 0) + 1; });
  const byLife = [[L("ครบอายุใช้งานแล้ว (ยังใช้อยู่)", "Past useful life, still in use"), 0], [L("เหลือไม่เกิน 12 เดือน", "12 months or less left"), 0], [L("เหลือ 1-3 ปี", "1-3 years left"), 0], [L("เหลือมากกว่า 3 ปี", "More than 3 years"), 0], [L("ไม่คิดค่าเสื่อม (ต่ำกว่าเกณฑ์)", "Not depreciated (below limit)"), 0]];
  A.forEach(a => { const d = assetDep(a); if (d.low) byLife[4][1]++; else { const left = assetType(a.cat).life * 12 - d.months; byLife[left <= 0 ? 0 : left <= 12 ? 1 : left <= 36 ? 2 : 3][1]++; } });
  const nSt = k => all.filter(a => a.status === k).length, st = Object.keys(AS_ST).filter(k => k !== "cancelled").map(k => [tx(AS_ST[k][0]), nSt(k)]).filter(r => r[1]);
  const wip = [[L("ใบโอนรออนุมัติ", "Transfers awaiting approval"), (S.axfers || []).filter(x => x.status === "submitted").length, "as-xfer"], [L("ใบขอเบิกรอพิจารณา", "Requisitions waiting"), (S.areqs || []).filter(x => x.status === "submitted").length, "as-req"], [L("รอส่งมอบ", "Approved, to hand over"), (S.areqs || []).filter(x => x.status === "approved").length, "as-req"], [L("รอยืนยันขึ้นทะเบียน", "Awaiting registration"), nSt("pending"), "as-reg"], [L("รออนุมัติจำหน่าย", "Disposals waiting"), nSt("disp_req"), "as-reg"]];
  return `${eHead(AS_APP, "A1", ["ภาพรวมครุภัณฑ์", "Assets dashboard"], ["จำนวน มูลค่า ค่าเสื่อม สถานะ และงานค้างของทะเบียนครุภัณฑ์ · หน่วยเห็นเฉพาะของตน · ข้อมูลตัวอย่าง", "Count, value, depreciation, status and pending work · units see only their own · sample data"])}
    ${eKpis([[L("ครุภัณฑ์ในทะเบียน", "In the register"), A.length], [L("ราคาทุนรวม", "Total cost"), mb(cost), L("ล้านบาท", "M baht")], [L("ค่าเสื่อมสะสม", "Accumulated depreciation"), mb(acc), L("ล้านบาท", "M baht")], [L("มูลค่าตามบัญชี", "Book value"), mb(nbv), L("ล้านบาท", "M baht")],
      [L("ค่าเสื่อมเดือนนี้", "This month's charge"), fmt(depForMonth(TODAY.slice(0, 7))), L("บาท (ทั้งหน่วยงาน)", "baht (whole agency)")], [L("พร้อมจ่าย", "Spare"), nSt("spare")], [L("ส่งซ่อม", "In repair"), nSt("repair")], [L("ตรวจนับ", "Count"), c ? `${Object.keys(c.results).length}/${A.length}` : "–", c ? `${L("ปี", "FY")} ${c.fy}` : ""]])}
    ${asGrid(asPanel(L("มูลค่าตามบัญชีแยกตามประเภท (บาท)", "Book value by type (baht)"), asBars(Object.entries(byType).sort((a, b) => b[1] - a[1]).slice(0, 8)))
      + asPanel(L("จำนวนแยกตามหน่วย", "Count by unit"), asBars(Object.entries(byUnit).sort((a, b) => b[1] - a[1]).slice(0, 8)))
      + asPanel(L("อายุใช้งานที่เหลือ", "Useful life left"), asBars(byLife))
      + asPanel(L("จำนวนแยกตามปีงบประมาณที่ได้มา", "Count by fiscal year acquired"), asBars(Object.entries(byYear).sort((a, b) => a[0] - b[0])))
      + asPanel(L("แหล่งที่ได้มา", "Source"), asBars(Object.entries(bySrc)))
      + asPanel(L("สถานะ", "Status"), asBars(st)))}
    <section class="panel"><header><h2>${L("งานค้าง", "Work in progress")}</h2></header><div class="tbl-wrap"><table><tbody>${wip.map(r => `<tr><td>${r[0]}</td><td class="n"><b>${r[1]}</b></td><td><button class="btn" type="button" data-jump="${r[2]}">${L("เปิด", "Open")}</button></td></tr>`).join("")}</tbody></table></div></section>
    ${eInbox(L("งานของฉัน", "My work"), mine)}`;
});

// ---------- A2 register, A4 transfers ----------
ePageDef("assets", "as-reg", "A2", "ast", AS_ROLES, ["ทะเบียนครุภัณฑ์", "Asset register"], () => `${eHead(AS_APP, "A2", ["ทะเบียนครุภัณฑ์", "Asset register"], ["ลงทะเบียนครั้งละหลายรายการได้โดยใส่จำนวน (แต่ละรายการแยกบรรทัด) · เลขครุภัณฑ์ ผู้ดูแล สถานที่ ค่าเสื่อมราคา ซ่อม และจำหน่าย · หน่วยเห็นเฉพาะครุภัณฑ์ของตน", "Several at once by giving a quantity (each its own line) · number, custodian, location, depreciation, repair and disposal · units see only their own"])}
  ${crudList("asset", { head: `<h2>${L("รายการครุภัณฑ์", "Assets")}</h2>`, empty: L("ยังไม่มีครุภัณฑ์", "No assets yet") })}`);
ePageDef("assets", "as-xfer", "A4", "ast", AS_ROLES, ["โอนและย้ายครุภัณฑ์", "Transfers"], () => `${eHead(AS_APP, "A4", ["โอนและย้ายครุภัณฑ์", "Transfers"], ["ขอโอนได้ครั้งละหลายรายการ อนุมัติตามขั้นวงเงินรวม (O3) และยืนยันรับโดยหน่วยปลายทาง", "Request several assets at once, approve by the total amount tier (O3), and confirm receipt at the receiving unit"])}
  ${crudList("axfer", { head: `<h2>${L("ใบโอน / ย้าย", "Transfers")}</h2>`, empty: L("ยังไม่มีใบโอน", "No transfers yet") })}`);

// ---------- A5 annual count, by year ----------
const CNT_RES = { found: [["พบ", "Found"], "p-ok"], missing: [["ไม่พบ", "Missing"], "p-bad"], damaged: [["ชำรุด", "Damaged"], "p-warn"] };
let CNT_FY = null, CNT_BAD = false;
const cntRounds = () => (S.acount || []).slice().sort((a, b) => b.fy - a.fy);
const cntSel = () => { const r = cntRounds(); return r.find(x => x.fy === CNT_FY) || r[0]; };
const cntList = c => (c.status === "open" ? (S.assets || []).filter(assetInService) : Object.keys(c.results || {}).map(asset).filter(Boolean)).filter(asVisible);
function cntStat(c) { const l = cntList(c), n = k => l.filter(a => c.results[a.id] === k).length; return { total: l.length, counted: l.filter(a => c.results[a.id]).length, found: n("found"), missing: n("missing"), damaged: n("damaged") }; }
ePageDef("assets", "as-count", "A5", "ast", AS_ROLES, ["ตรวจนับประจำปี", "Annual count"], () => {
  const R = cntRounds(), c = cntSel(), open = R.find(x => x.status === "open"), canMark = c && c.status === "open" && (isAsset() || myUnitOnly());
  const A = c ? cntList(c) : [], res = c ? c.results : {}, st = c ? cntStat(c) : null, years = R.slice().reverse();
  const free = []; for (let y = CUR_FY; y >= CUR_FY - 3; y--) if (!R.some(x => x.fy === y)) free.push(y);
  const all = {}; R.forEach(r => Object.keys(r.results).forEach(id => { const a = asset(id); if (a && asVisible(a)) all[id] = a; }));
  const rows = Object.values(all).filter(a => !CNT_BAD || years.some(r => r.results[a.id] && r.results[a.id] !== "found"));
  return `${eHead(AS_APP, "A5", ["ตรวจนับประจำปี", "Annual count"], ["ตรวจนับครุภัณฑ์ที่ใช้งานเทียบทะเบียนทุกปีงบประมาณ บันทึกพบ ไม่พบ หรือชำรุด ปิดรอบเพื่อสรุปผล และดูผลย้อนหลังรายปี", "Count the assets in service against the register each fiscal year, record found, missing or damaged, close the round, and look back at each year"])}
    ${c ? eKpis([[L("รอบ", "Round"), c.id, c.status === "open" ? L("เปิดอยู่", "Open") : L("ปิดแล้ว", "Closed")], [L("นับแล้ว", "Counted"), `${st.counted}/${st.total}`], [L("พบ", "Found"), st.found], [L("ไม่พบ", "Missing"), st.missing, "", st.missing > 0], [L("ชำรุด", "Damaged"), st.damaged]]) : ""}
    <section class="panel"><header><h2>${L("เปรียบเทียบรายปี", "Year by year")}</h2></header>${R.length ? `<div class="tbl-wrap"><table><thead><tr><th>${L("ปีงบประมาณ", "FY")}</th><th>${L("สถานะ", "Status")}</th><th class="n">${L("ทั้งหมด", "Total")}</th><th class="n">${L("พบ", "Found")}</th><th class="n">${L("ไม่พบ", "Missing")}</th><th class="n">${L("ชำรุด", "Damaged")}</th><th class="n">${L("พบ %", "Found %")}</th><th></th></tr></thead>
      <tbody>${R.map(r => { const s = cntStat(r); return `<tr ${c && r.id === c.id ? 'style="background:var(--bg)"' : ""}><td><b>${r.fy}</b></td><td>${r.status === "open" ? tag(L("เปิดอยู่", "Open"), "p-info") : tag(L("ปิดแล้ว", "Closed"), "p-ok")}</td><td class="n">${s.total}</td><td class="n">${s.found}</td><td class="n">${s.missing}</td><td class="n">${s.damaged}</td><td class="n">${s.total ? Math.round((s.found / s.total) * 100) : 0}%</td><td><button class="btn ghost" type="button" data-cntyear="${r.fy}">${L("ดูรายละเอียด", "Details")}</button></td></tr>`; }).join("")}</tbody></table></div>` : `<div class="body sub">${L("ยังไม่มีรอบตรวจนับ", "No count rounds yet")}</div>`}
      ${isAsset() && !open ? `<div class="body row" style="gap:8px;align-items:center"><label for="cnt-newfy">${L("เปิดรอบใหม่ปีงบประมาณ", "Open a round for fiscal year")}</label><select id="cnt-newfy">${free.map(y => `<option value="${y}">${y}</option>`).join("")}</select><button class="btn" type="button" id="cnt-new" ${free.length ? "" : "disabled"}>${L("เปิดรอบ", "Open the round")}</button></div>` : ""}</section>
    ${c ? `<section class="panel"><header><h2>${L("รายการของรอบ", "Round")} ${c.fy}</h2><span class="sp"></span>${years.length > 1 ? `<select id="cnt-fy" aria-label="${L("ปีงบประมาณ", "Fiscal year")}">${R.map(r => `<option value="${r.fy}" ${r.id === c.id ? "selected" : ""}>${r.fy}</option>`).join("")}</select>` : ""}${c.status === "open" && isAsset() ? `<button class="btn primary" type="button" id="cnt-close">${L("ปิดรอบและสรุปผล", "Close the round")}</button>` : ""}</header>
    ${c.summary ? `<div class="body sub">${L("สรุปผล", "Summary")}: ${esc(c.summary)}${c.closed ? ` · ${esc(userName(c.closed.by))} · ${fdate(c.closed.t, true)}` : ""}</div>` : ""}
    ${A.length ? `<div class="tbl-wrap"><table><thead><tr><th>${L("เลขครุภัณฑ์", "No.")}</th><th>${L("ครุภัณฑ์", "Asset")}</th><th>${L("สถานที่", "Location")}</th><th>${L("ผลนับ", "Result")}</th>${canMark ? "<th></th>" : ""}</tr></thead>
    <tbody>${A.map(a => `<tr><td class="mono">${esc(a.tag)}</td><td>${esc(tx(a.name))}<div class="sub">${esc(unitName(a.unit))}</div></td><td class="sub">${esc(locText(a) || "–")}</td><td>${res[a.id] ? tag(tx(CNT_RES[res[a.id]][0]), CNT_RES[res[a.id]][1]) : `<span class="sub">${L("ยังไม่นับ", "Not counted")}</span>`}</td>
      ${canMark ? `<td style="white-space:nowrap">${Object.keys(CNT_RES).map(k => `<button class="btn ${res[a.id] === k ? "primary" : "ghost"}" type="button" data-cnt="${a.id}|${k}">${tx(CNT_RES[k][0])}</button>`).join(" ")}</td>` : ""}</tr>`).join("")}</tbody></table></div>` : `<div class="body sub">${L("ไม่มีครุภัณฑ์ให้นับ", "Nothing to count")}</div>`}</section>` : ""}
    ${R.length > 1 ? `<section class="panel"><header><h2>${L("ผลรายครุภัณฑ์ทุกปี", "Each asset, every year")}</h2><span class="sp"></span><label class="field-inline" for="cnt-bad"><input type="checkbox" id="cnt-bad" ${CNT_BAD ? "checked" : ""}> ${L("เฉพาะที่เคยไม่พบหรือชำรุด", "Only those once missing or damaged")}</label></header>
      ${rows.length ? `<div class="tbl-wrap"><table><thead><tr><th>${L("เลขครุภัณฑ์", "No.")}</th><th>${L("ครุภัณฑ์", "Asset")}</th>${years.map(r => `<th>${r.fy}</th>`).join("")}</tr></thead><tbody>${rows.map(a => `<tr><td class="mono">${esc(a.tag)}</td><td>${esc(tx(a.name))}</td>${years.map(r => `<td>${r.results[a.id] ? tag(tx(CNT_RES[r.results[a.id]][0]), CNT_RES[r.results[a.id]][1]) : `<span class="sub">–</span>`}</td>`).join("")}</tr>`).join("")}</tbody></table></div>` : `<div class="body sub">${L("ไม่มีรายการ", "Nothing to show")}</div>`}</section>` : ""}`;
}, () => {
  $$("[data-cnt]").forEach(b => (b.onclick = () => { const [id, k] = b.dataset.cnt.split("|"), c = cntSel(); c.results[id] = k; audit(["บันทึกผลตรวจนับ", "Recorded a count result"], `${c.id} ${id} ${k}`); commit(); route(); }));
  $$("[data-cntyear]").forEach(b => (b.onclick = () => { CNT_FY = Number(b.dataset.cntyear); route(); }));
  const sel = $("#cnt-fy"); if (sel) sel.onchange = () => { CNT_FY = Number(sel.value); route(); };
  const bad = $("#cnt-bad"); if (bad) bad.onchange = () => { CNT_BAD = bad.checked; route(); };
  const cl = $("#cnt-close"); if (cl) cl.onclick = () => {
    const c = cntSel(), A = S.assets.filter(assetInService), un = A.filter(a => !c.results[a.id]), miss = A.filter(a => c.results[a.id] === "missing"), n = k => A.filter(a => c.results[a.id] === k).length;
    if (un.length) { toast(L(`ยังนับไม่ครบ เหลือ ${un.length} รายการ`, `${un.length} assets are not counted yet`)); return; }
    c.status = "closed"; c.closed = { by: me().id, t: nowIso() }; c.summary = L(`พบ ${n("found")} ไม่พบ ${miss.length} ชำรุด ${n("damaged")}`, `Found ${n("found")}, missing ${miss.length}, damaged ${n("damaged")}`);
    if (miss.length) notify(["audit", "exec"], [`ตรวจนับ ${c.id}: ไม่พบครุภัณฑ์ ${miss.length} รายการ`, `Count ${c.id}: ${miss.length} assets not found`], "as-count");
    audit(["ปิดรอบตรวจนับ", "Closed the count round"], c.id); commit(); toast(c.summary); route();
  };
  const nw = $("#cnt-new"); if (nw) nw.onclick = () => { const fy = Number($("#cnt-newfy").value); if (!fy || S.acount.some(x => x.fy === fy) || S.acount.some(x => x.status === "open")) return; S.acount.unshift({ id: `CNT-${fy}`, fy, status: "open", start: TODAY, results: {} }); CNT_FY = fy; audit(["เปิดรอบตรวจนับ", "Opened a count round"], `CNT-${fy}`); commit(); route(); };
});

// ---------- A6 depreciation: monthly close ----------
ePageDef("assets", "as-dep", "A6", "asp", AS_ROLES, ["ปิดงวดค่าเสื่อมราคา", "Depreciation close"], () => {
  const A = S.assets || [], runs = S.depRuns || [], last = runs.length ? runs[0].month : "2026-06", next = ymAdd(last, 1), canRun = next < TODAY.slice(0, 7);
  const byCat = (S.atypes || ASSET_TYPE_DEFS).map(c => { const xs = A.filter(a => a.cat === c.id && assetInService(a)); return { c, n: xs.length, cost: xs.reduce((s, a) => s + a.cost, 0), acc: xs.reduce((s, a) => s + assetDep(a).acc, 0) }; }).filter(r => r.n);
  return `${eHead(AS_APP, "A6", ["ปิดงวดค่าเสื่อมราคา", "Depreciation close"], ["คิดแบบเส้นตรงรายเดือน ราคาซาก 1 บาท · ปิดงวดรายเดือนแล้วแจ้งการเงิน · ดูรายตัวที่ A7 · คำนวณในต้นแบบนี้เท่านั้น ไม่ลงบัญชีจริง", "Straight line by month, salvage 1 baht · close each month and tell Finance · per-asset view at A7 · computed in this prototype only, nothing is posted to real books"])}
    ${eKpis([[L("งวดล่าสุดที่ปิด", "Last closed month"), last], [L("งวดถัดไป", "Next month"), next, canRun ? L("ปิดได้แล้ว", "Can be closed") : L("ปิดได้หลังสิ้นเดือน", "Closable after month end")], [L("ค่าเสื่อมต่อเดือน (ปัจจุบัน)", "Monthly charge now"), fmt(depForMonth(TODAY.slice(0, 7))), L("บาท", "baht")]])}
    <section class="panel"><header><h2>${L("ตามประเภท", "By type")}</h2></header><div class="tbl-wrap"><table><thead><tr><th>${L("ประเภท", "Type")}</th><th class="n">${L("จำนวน", "Items")}</th><th class="n">${L("ราคาทุน", "Cost")}</th><th class="n">${L("ค่าเสื่อมสะสม", "Accumulated")}</th><th class="n">${L("มูลค่าตามบัญชี", "Book value")}</th></tr></thead>
      <tbody>${byCat.map(r => `<tr><td>${r.c.id} ${esc(tx(r.c.name))} <span class="sub">${r.c.life} ${L("ปี", "yr")}</span></td><td class="n">${r.n}</td><td class="n">${fmt(r.cost)}</td><td class="n">${fmt(r.acc)}</td><td class="n">${fmt(r.cost - r.acc)}</td></tr>`).join("")}</tbody></table></div></section>
    <section class="panel"><header><h2>${L("การปิดงวดรายเดือน", "Monthly closes")}</h2><span class="sp"></span>${isAsset() ? `<button class="btn primary" type="button" id="dep-run" ${canRun ? "" : "disabled"}>${L("ปิดงวด", "Close")} ${next}</button>` : ""}</header>
      ${runs.length ? `<div class="tbl-wrap"><table><tbody>${runs.map(r => `<tr><td class="mono">${r.id}</td><td>${r.month}</td><td class="n">${fmt(r.total)} ${L("บาท", "baht")}</td><td class="sub">${r.n} ${L("รายการ", "items")} · ${esc(userName(r.by))} · ${fdate(r.t, true)}</td></tr>`).join("")}</tbody></table></div>` : `<div class="body sub">${L("ยังไม่มีการปิดงวด", "No closes yet")}</div>`}</section>`;
}, () => {
  const b = $("#dep-run"); if (b) b.onclick = () => {
    const runs = S.depRuns, next = ymAdd(runs.length ? runs[0].month : "2026-06", 1);
    if (next >= TODAY.slice(0, 7)) return;
    const r = { id: "DP-" + next, month: next, total: depForMonth(next), n: S.assets.filter(a => assetInService(a) && a.cost >= ASSET_LOW && ymIdx(a.acq) <= ymIdx(next + "-01")).length, by: me().id, t: nowIso() };
    runs.unshift(r); audit(["ปิดงวดค่าเสื่อมราคา", "Closed a depreciation month"], `${r.id} ${fmt(r.total)}`);
    notify(["fin"], [`ค่าเสื่อมราคาเดือน ${next} รวม ${fmt(r.total)} บาท รอบันทึกบัญชี`, `Depreciation for ${next}: ${fmt(r.total)} baht, to be booked`], "fnc-close"); commit(); toast(`${L("ปิดงวด", "Closed")} ${next}`); route();
  };
});
