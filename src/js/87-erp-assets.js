// Fisko-ERP-Gov, part 4: Fisko Assets (module 6). Written new; Fisko had no assets app (its Procurement design leaves
// assets and stock to a future "Fisko Assets"). ERP-Government reference: account_asset_management, account_asset_number,
// account_asset_transfer, account_asset_low_value, account_asset_from_expense, l10n_th_gov_account_asset_management.
// Depreciation is straight-line by month with a salvage value of 1 baht; it is computed in this prototype only.
// Categories, useful lives and the low-value limit are samples to confirm against the Comptroller General's rules.
const AS_ROLES = ["asset", "div", "divhead", "exec", "fin", "audit", "proc", "prochead", "plan", "admin"];
const AS_APP = "DPT Assets";
const AS_ST = { pending: [["รอยืนยันขึ้นทะเบียน", "Awaiting registration"], "p-warn"], active: [["ใช้งาน", "In service"], "p-ok"], repair: [["ส่งซ่อม", "In repair"], "p-info"], disp_req: [["รออนุมัติจำหน่าย", "Disposal requested"], "p-warn"], disposed: [["จำหน่ายแล้ว", "Disposed"], "p-mute"], cancelled: [["ยกเลิก", "Cancelled"], "p-mute"] };
const AX_ST = { submitted: [["รออนุมัติ", "Awaiting approval"], "p-info"], approved: [["อนุมัติ รอรับโอน", "Approved, awaiting receipt"], "p-warn"], done: [["โอนแล้ว", "Transferred"], "p-ok"], rejected: [["ไม่อนุมัติ", "Not approved"], "p-bad"], cancelled: [["ยกเลิก", "Cancelled"], "p-mute"] };
const SRC_T = { purchase: ["ซื้อ", "Purchase"], contract: ["จากสัญญาจัดซื้อ", "From a procurement contract"], donation: ["รับบริจาค", "Donation"], transfer_in: ["รับโอนจากหน่วยอื่น", "Received from another agency"] };
const asset = id => (S.assets || []).find(a => a.id === id);
const assetName = id => (asset(id) ? tx(asset(id).name) : id);
const isAsset = () => ROLE === "asset" || ROLE === "proc" || ROLE === "prochead";
const myUnitOnly = () => ROLE === "div" || ROLE === "divhead";
const custOpts = () => S.users.filter(u => u.active && u.role !== "vendor").map(u => [u.id, `${tx(u.name)} · ${unitName(u.unit)}`]);

// Yearly depreciation table of one asset by fiscal year.
function depSchedule(a) {
  const d = assetDep(a, "2999-12-01"), life = assetCat(a.cat).life * 12, out = {};
  if (a.status === "pending" || d.low) return [];
  const start = ymIdx(a.acq), monthly = (a.cost - 1) / life;
  for (let i = 0; i < life; i++) { const m = start + i, fy = fyOf(`${Math.floor(m / 12)}-${String((m % 12) + 1).padStart(2, "0")}-01`); out[fy] = (out[fy] || 0) + monthly; }
  let acc = 0;
  return Object.keys(out).map(fy => { acc += out[fy]; return { fy: Number(fy), charge: Math.round(out[fy]), acc: Math.round(acc), nbv: Math.max(1, Math.round(a.cost - acc)) }; });
}

CRUD.def("asset", {
  noun: ["ครุภัณฑ์", "Asset"], st: AS_ST, live: false,
  list: () => (S.assets || []).filter(a => !myUnitOnly() || a.unit === me().unit), id: a => a.id, title: a => tx(a.name), sub: a => `${a.tag || L("ยังไม่มีเลขครุภัณฑ์", "No asset number yet")} · ${unitName(a.unit)}`,
  status: a => a.status, gone: a => a.status === "cancelled", search: a => `${a.id} ${a.tag} ${a.name.join(" ")} ${a.loc} ${a.cust ? userName(a.cust) : ""}`,
  filters: [{ id: "u", label: ["หน่วย", "Unit"], opts: () => unitOpts(), get: a => a.unit }, { id: "cat", label: ["หมวด", "Category"], opts: () => ASSET_CATS.map(c => [c.id, tx(c.name)]), get: a => a.cat }],
  cols: [{ h: ["เลขครุภัณฑ์", "Asset no."], c: a => `<span class="mono">${esc(a.tag || a.id)}</span>` }, { h: ["ครุภัณฑ์", "Asset"], c: a => `<b style="font-weight:600">${esc(tx(a.name))}</b><div class="sub">${esc(tx(assetCat(a.cat).name))}</div>` },
    { h: ["หน่วย / ผู้ดูแล", "Unit / custodian"], c: a => `${esc(unitName(a.unit))}<div class="sub">${a.cust ? esc(userName(a.cust)) : L("ยังไม่ระบุผู้ดูแล", "No custodian")}</div>` },
    { h: ["ได้มา", "Acquired"], c: a => fdate(a.acq) }, { h: ["ราคาทุน (บาท)", "Cost (baht)"], n: true, c: a => fmt(a.cost) }, { h: ["มูลค่าตามบัญชี (บาท)", "Book value (baht)"], n: true, c: a => fmt(assetDep(a).nbv) }],
  fields: (a, v) => {
    const fixed = !!a && a.status !== "pending";
    return [
      { id: "th", label: ["ชื่อ (ไทย)", "Name (Thai)"], req: true, wide: true, value: a ? a.name[0] : "" }, { id: "en", label: ["ชื่อ (อังกฤษ)", "Name (English)"], wide: true, value: a ? a.name[1] : "" },
      { id: "cat", label: ["หมวดครุภัณฑ์", "Category"], type: "select", req: true, value: a ? a.cat : "7440", lock: fixed, show: a ? esc(tx(assetCat(a.cat).name)) : "", opts: ASSET_CATS.map(c => [c.id, `${c.id} ${tx(c.name)} (${c.life} ${L("ปี", "yr")})`]) },
      { id: "unit", label: ["หน่วยที่ถือครอง", "Owning unit"], type: "select", req: true, value: a ? a.unit : me().unit, lock: fixed, show: a ? esc(unitName(a.unit)) : "", opts: unitOpts(), hint: fixed ? L("ย้ายหน่วยผ่านใบโอน (A4)", "Move units through a transfer (A4)") : "" },
      { id: "cust", label: ["ผู้ดูแล", "Custodian"], type: "select", blank: L("ยังไม่ระบุ", "Not set"), value: a ? a.cust : "", opts: custOpts() }, { id: "loc", label: ["สถานที่ตั้ง", "Location"], value: a ? a.loc : "" },
      { id: "acq", label: ["วันที่ได้มา", "Acquired on"], type: "date", req: true, value: a ? a.acq : TODAY, lock: fixed, show: a ? fdate(a.acq) : "" },
      { id: "cost", label: ["ราคาทุน (บาท)", "Cost (baht)"], type: "number", req: true, min: 1, value: a ? a.cost : "", lock: fixed, show: a ? fmt(a.cost) : "" },
      ...(a ? [] : [{ id: "src", label: ["แหล่งที่ได้มา", "Source"], type: "select", req: true, value: "donation", opts: ["donation", "transfer_in", "purchase"].map(k => [k, tx(SRC_T[k])]), hint: L("ครุภัณฑ์จากสัญญาจัดซื้อให้ลงทะเบียนที่ A3", "Assets from a procurement contract are registered at A3") }]),
    ];
  },
  check: v => (v.acq > TODAY ? [{ f: "acq", m: L("วันที่ได้มาต้องไม่เกินวันนี้", "The acquisition date can't be in the future") }] : []),
  create: { can: isAsset, label: ["ลงทะเบียนครุภัณฑ์", "Register an asset"], run: v => {
    const a = { id: eNextId("AS-", S.assets), name: [v.th, v.en || v.th], cat: v.cat, unit: v.unit, cust: v.cust, loc: v.loc, acq: v.acq, cost: v.cost, src: { type: v.src }, status: "active", tag: "" };
    a.tag = `${a.cat}-${String(maxNo(S.assets.map(x => x.tag), new RegExp(`^${a.cat}-(\\d+)`)) + 1).padStart(4, "0")}`; S.assets.push(a); audit(["ลงทะเบียนครุภัณฑ์", "Registered an asset"], `${a.id} ${a.tag} ${v.th}`); return a; } },
  edit: { can: a => isAsset() && a.status !== "disposed" && a.status !== "cancelled", run: (a, v) => { Object.assign(a, { name: [v.th, v.en || v.th], cust: v.cust, loc: v.loc }); if (a.status === "pending") Object.assign(a, { cat: v.cat, unit: v.unit, acq: v.acq, cost: v.cost }); audit(["แก้ไขทะเบียนครุภัณฑ์", "Edited an asset"], `${a.id} ${v.th}`); } },
  acts: a => {
    const out = [], need = tierRole("dispose", a.cost);
    if (isAsset()) {
      if (a.status === "pending") out.push({ id: "reg", label: L("ยืนยันขึ้นทะเบียน", "Confirm registration"), kind: "primary", confirm: L("ออกเลขครุภัณฑ์และเริ่มคิดค่าเสื่อมราคา ต้องระบุผู้ดูแลและสถานที่ตั้งก่อน", "Issues the asset number and starts depreciation. Custodian and location are required first"),
        run: x => { if (!x.cust || !x.loc) return L("ยังไม่ได้ระบุผู้ดูแลหรือสถานที่ตั้ง กดแก้ไขก่อน", "Set the custodian and location first (Edit)"); x.tag = `${x.cat}-${String(maxNo(S.assets.map(y => y.tag), new RegExp(`^${x.cat}-(\\d+)`)) + 1).padStart(4, "0")}`; x.status = "active"; audit(["ยืนยันขึ้นทะเบียนครุภัณฑ์", "Confirmed asset registration"], `${x.id} ${x.tag}`); return `${L("ขึ้นทะเบียนแล้ว เลขครุภัณฑ์", "Registered, asset number")} ${x.tag}`; } },
        { id: "can", label: L("ยกเลิกรายการ", "Cancel the entry"), kind: "danger", why: true, run: (x, why) => { x.status = "cancelled"; audit(["ยกเลิกรายการครุภัณฑ์", "Cancelled an asset entry"], `${x.id} · ${why}`); return L("ยกเลิกแล้ว", "Cancelled"); } });
      if (a.status === "active") out.push({ id: "rep", label: L("ส่งซ่อม", "Send for repair"), why: true, run: (x, why) => { x.status = "repair"; x.repairWhy = why; audit(["ส่งซ่อมครุภัณฑ์", "Sent an asset for repair"], `${x.id} · ${why}`); return L("บันทึกส่งซ่อมแล้ว", "Marked as in repair"); } });
      if (a.status === "repair") out.push({ id: "back", label: L("ซ่อมเสร็จ ใช้งานต่อ", "Repaired, back in service"), run: x => { x.status = "active"; audit(["ซ่อมครุภัณฑ์เสร็จ", "Asset repaired"], x.id); return L("กลับมาใช้งานแล้ว", "Back in service"); } });
      if (a.status === "active" || a.status === "repair") out.push({ id: "disp", label: L("ขอจำหน่าย", "Request disposal"), why: true, impact: () => `${L("ผู้อนุมัติ", "Approver")}: ${tx(ROLES[need])}`, run: (x, why) => { x.status = "disp_req"; x.dispReq = { why, by: me().id, t: nowIso() }; audit(["ขอจำหน่ายครุภัณฑ์", "Requested disposal"], `${x.id} · ${why}`); notify([need], [`ขอจำหน่ายครุภัณฑ์ ${x.id}`, `Disposal requested for ${x.id}`], "as-reg"); return L("ส่งคำขอจำหน่ายแล้ว", "Disposal requested"); } });
      if (a.status === "disp_req") out.push({ id: "wd", label: L("ถอนคำขอจำหน่าย", "Withdraw the request"), why: true, run: (x, why) => { x.status = "active"; audit(["ถอนคำขอจำหน่าย", "Withdrew a disposal request"], `${x.id} · ${why}`); return L("ถอนแล้ว", "Withdrawn"); } });
    }
    if (a.status === "disp_req" && roleIs(need)) out.push({ id: "okd", label: L("อนุมัติจำหน่าย", "Approve disposal"), kind: "primary", confirm: `${L("มูลค่าตามบัญชี", "Book value")} ${baht(assetDep(a).nbv)}`, run: x => { x.status = "disposed"; x.disp = { date: TODAY, by: me().id, why: x.dispReq ? x.dispReq.why : "" }; audit(["อนุมัติจำหน่ายครุภัณฑ์", "Approved disposal"], x.id); notify(["fin"], [`จำหน่ายครุภัณฑ์ ${x.id} ปรับบัญชี`, `Asset ${x.id} disposed; adjust the books`], "fnc-close"); return L("จำหน่ายแล้ว แจ้งการเงินปรับบัญชี", "Disposed; Finance notified"); } },
      { id: "nod", label: L("ไม่อนุมัติ", "Do not approve"), kind: "danger", why: true, run: (x, why) => { x.status = "active"; audit(["ไม่อนุมัติจำหน่าย", "Disposal not approved"], `${x.id} · ${why}`); notify(["asset"], [`ไม่อนุมัติจำหน่าย ${x.id}`, `Disposal of ${x.id} not approved`], "as-reg"); return L("บันทึกแล้ว", "Recorded"); } });
    return out;
  },
  view: a => { const d = assetDep(a), s = a.src || {}; return kv([[L("เลขครุภัณฑ์", "Asset no."), a.tag || "–"], [L("หมวด", "Category"), `${a.cat} ${esc(tx(assetCat(a.cat).name))} · ${assetCat(a.cat).life} ${L("ปี", "yr")}`], [L("หน่วย", "Unit"), esc(unitName(a.unit))], [L("ผู้ดูแล", "Custodian"), a.cust ? esc(userName(a.cust)) : "–"], [L("สถานที่", "Location"), esc(a.loc || "–")],
    [L("ได้มา", "Acquired"), `${fdate(a.acq)} · ${esc(tx(SRC_T[s.type] || SRC_T.purchase))}${s.id ? ` · ${s.id} ${L("งวด", "phase")} ${s.phase}` : ""}`], [L("ราคาทุน", "Cost"), baht(a.cost)],
    d.low ? [L("ค่าเสื่อมราคา", "Depreciation"), L(`ต่ำกว่าเกณฑ์ ${fmt(ASSET_LOW)} บาท ไม่คิดค่าเสื่อม (ตัวอย่าง)`, `Below ${fmt(ASSET_LOW)} baht: not depreciated (sample limit)`)] : [L("ค่าเสื่อมสะสม", "Accumulated depreciation"), `${baht(d.acc)} · ${d.months || 0} ${L("เดือน", "months")}`],
    [L("มูลค่าตามบัญชี", "Book value"), `<b>${baht(d.nbv)}</b>`], a.repairWhy && a.status === "repair" && [L("เหตุที่ซ่อม", "Repair reason"), esc(a.repairWhy)], a.dispReq && a.status === "disp_req" && [L("เหตุที่ขอจำหน่าย", "Disposal reason"), `${esc(a.dispReq.why)} · ${esc(userName(a.dispReq.by))}`],
    a.disp && [L("จำหน่าย", "Disposed"), `${fdate(a.disp.date)} · ${esc(a.disp.why)}`]]); },
  tabs: a => { const sc = depSchedule(a); return [["dep", L("ตารางค่าเสื่อม", "Depreciation"), sc.length ? `<div class="tbl-wrap"><table><thead><tr><th>${L("ปีงบประมาณ", "FY")}</th><th class="n">${L("ค่าเสื่อม", "Charge")}</th><th class="n">${L("สะสม", "Accumulated")}</th><th class="n">${L("คงเหลือ", "Book value")}</th></tr></thead><tbody>${sc.map(r => `<tr><td>${r.fy}</td><td class="n">${fmt(r.charge)}</td><td class="n">${fmt(r.acc)}</td><td class="n">${fmt(r.nbv)}</td></tr>`).join("")}</tbody></table></div>` : `<span class="sub">${L("ไม่คิดค่าเสื่อม", "Not depreciated")}</span>`]]; },
});

CRUD.def("axfer", {
  noun: ["ใบโอน / ย้ายครุภัณฑ์", "Asset transfer"], st: AX_ST, live: false,
  list: () => (S.axfers || []).filter(x => !myUnitOnly() || x.from === me().unit || x.to === me().unit), id: x => x.id, title: x => `${assetName(x.asset)}`, sub: x => `${unitName(x.from)} → ${unitName(x.to)}`,
  status: x => x.status, gone: x => x.status === "cancelled", search: x => `${x.id} ${x.asset} ${assetName(x.asset)}`,
  filters: [{ id: "st", label: ["สถานะ", "Status"], opts: () => Object.keys(AX_ST).map(k => [k, tx(AX_ST[k][0])]), get: x => x.status }],
  cols: [{ h: ["เลขที่", "No."], c: x => `<span class="mono">${x.id}</span>` }, { h: ["ครุภัณฑ์", "Asset"], c: x => `<b style="font-weight:600">${esc(assetName(x.asset))}</b><div class="sub">${x.asset}</div>` }, { h: ["จาก", "From"], c: x => esc(unitName(x.from)) }, { h: ["ไป", "To"], c: x => esc(unitName(x.to)) },
    { h: ["มูลค่า (บาท)", "Value (baht)"], n: true, c: x => fmt(x.value) }, { h: ["ผู้อนุมัติ", "Approver"], c: x => `<span class="sub">${esc(tx(ROLES[tierRole("xfer", x.value)]))}</span>` }],
  fields: (x, v) => [
    { id: "asset", label: ["ครุภัณฑ์", "Asset"], type: "select", req: true, value: "", opts: (S.assets || []).filter(a => a.status === "active" && (!myUnitOnly() || a.unit === me().unit) && !S.axfers.some(y => y.asset === a.id && ["submitted", "approved"].includes(y.status))).map(a => [a.id, `${a.tag} ${tx(a.name)} · ${unitName(a.unit)}`]) },
    { id: "to", label: ["โอนไปยังหน่วย", "Transfer to"], type: "select", req: true, value: "", opts: unitOpts() },
    { id: "why", label: ["เหตุผล (อย่างน้อย 10 ตัวอักษร)", "Reason (at least 10 characters)"], type: "textarea", req: true, wide: true, value: "" },
  ],
  check: v => { const a = asset(v.asset), e = []; if (a && a.unit === v.to) e.push({ f: "to", m: L("ครุภัณฑ์อยู่ที่หน่วยนี้แล้ว", "The asset is already in this unit") }); if ((v.why || "").length < 10) e.push({ f: "why", m: L("ใส่เหตุผลอย่างน้อย 10 ตัวอักษร", "Give a reason of at least 10 characters") }); return e; },
  create: { can: () => isAsset() || myUnitOnly(), label: ["ขอโอน / ย้ายครุภัณฑ์", "Request a transfer"], run: v => { const a = asset(v.asset), val = assetDep(a).nbv, x = { id: eNextId("XF-", S.axfers), asset: a.id, from: a.unit, to: v.to, why: v.why, value: val, status: "submitted", by: me().id, t: nowIso() };
    S.axfers.push(x); audit(["ขอโอนครุภัณฑ์", "Requested an asset transfer"], `${x.id} ${a.id} · ${unitName(a.unit)} → ${unitName(v.to)}`); notify([tierRole("xfer", val)], [`ใบโอนครุภัณฑ์ ${x.id} รออนุมัติ`, `Asset transfer ${x.id} awaits approval`], "as-xfer"); return x; } },
  edit: null,
  acts: x => {
    const out = [], need = tierRole("xfer", x.value);
    if (x.status === "submitted" && roleIs(need)) out.push({ id: "ok", label: L("อนุมัติ", "Approve"), kind: "primary", confirm: `${baht(x.value)} · ${unitName(x.from)} → ${unitName(x.to)}`, run: y => { y.status = "approved"; y.decided = { by: me().id, t: nowIso() }; audit(["อนุมัติการโอนครุภัณฑ์", "Approved an asset transfer"], y.id); notify(["asset", "div"], [`ใบโอน ${y.id} อนุมัติแล้ว รอหน่วยรับโอนยืนยัน`, `Transfer ${y.id} approved; the receiving unit confirms`], "as-xfer"); return L("อนุมัติแล้ว", "Approved"); } },
      { id: "no", label: L("ไม่อนุมัติ", "Do not approve"), kind: "danger", why: true, run: (y, why) => { y.status = "rejected"; y.decided = { by: me().id, t: nowIso(), why }; audit(["ไม่อนุมัติการโอน", "Transfer not approved"], `${y.id} · ${why}`); return L("บันทึกแล้ว", "Recorded"); } });
    if (x.status === "submitted" && (x.by === me().id || isAsset())) out.push({ id: "can", label: L("ยกเลิกคำขอ", "Withdraw"), why: true, run: (y, why) => { y.status = "cancelled"; audit(["ยกเลิกใบโอน", "Withdrew a transfer"], `${y.id} · ${why}`); return L("ยกเลิกแล้ว", "Withdrawn"); } });
    if (x.status === "approved" && (isAsset() || ((ROLE === "div" || ROLE === "divhead") && me().unit === x.to))) out.push({ id: "rcv", label: L("ยืนยันรับครุภัณฑ์", "Confirm receipt"), kind: "primary", confirm: L("ย้ายครุภัณฑ์มาอยู่หน่วยนี้ ผู้ดูแลและสถานที่ต้องปรับใหม่", "Moves the asset to the receiving unit; custodian and location are reset"), run: y => {
      const a = asset(y.asset); a.unit = y.to; a.cust = (S.users.find(u => u.unit === y.to && u.role === "div") || {}).id || ""; a.loc = ""; y.status = "done"; y.done = { by: me().id, t: nowIso() }; audit(["รับโอนครุภัณฑ์", "Received an asset transfer"], `${y.id} ${a.id}`); return L("โอนเรียบร้อย ปรับผู้ดูแลและสถานที่ที่ A2", "Transferred; update custodian and location at A2"); } });
    return out;
  },
  view: x => kv([[L("ครุภัณฑ์", "Asset"), `${x.asset} ${esc(assetName(x.asset))}`], [L("จาก → ไป", "From → to"), `${esc(unitName(x.from))} → ${esc(unitName(x.to))}`], [L("มูลค่า ณ วันขอ", "Value at request"), baht(x.value)], [L("เหตุผล", "Reason"), esc(x.why)],
    [L("ผู้อนุมัติตามขั้นวงเงิน", "Approver by tier"), esc(tx(ROLES[tierRole("xfer", x.value)]))], x.decided && [L("ผลพิจารณา", "Decision"), `${esc(userName(x.decided.by))} · ${fdate(x.decided.t, true)}${x.decided.why ? " · " + esc(x.decided.why) : ""}`]]),
});

// ---------- A1 today ----------
ePageDef("assets", "as-today", "A1", "ast", AS_ROLES, ["งานครุภัณฑ์วันนี้", "Assets today"], () => {
  const A = (S.assets || []).filter(assetInService), cost = A.reduce((s, a) => s + a.cost, 0), nbv = A.reduce((s, a) => s + assetDep(a).nbv, 0), c = (S.acount || []).find(x => x.status === "open");
  const mine = myTasks().filter(t => typeof t.link === "string" && t.link.startsWith("as-"));
  return `${eHead(AS_APP, "A1", ["งานครุภัณฑ์วันนี้", "Assets today"], ["ภาพรวมทะเบียนครุภัณฑ์ งานที่รอ และความคืบหน้าการตรวจนับ · ข้อมูลตัวอย่าง", "The register at a glance, work waiting and count progress · sample data"])}
    ${eKpis([[L("ครุภัณฑ์ที่ใช้งาน", "In service"), A.length], [L("ราคาทุนรวม", "Total cost"), mb(cost), L("ล้านบาท", "M baht")], [L("มูลค่าตามบัญชี", "Book value"), mb(nbv), L("ล้านบาท", "M baht")],
      [L("รอขึ้นทะเบียน", "Awaiting registration"), (S.assets || []).filter(a => a.status === "pending").length, "", (S.assets || []).some(a => a.status === "pending")], [L("ตรวจนับแล้ว", "Counted"), c ? `${Object.keys(c.results).length}/${A.length}` : "–"]])}
    ${eInbox(L("งานของฉัน", "My work"), mine)}`;
});

// ---------- A2 register, A4 transfers ----------
ePageDef("assets", "as-reg", "A2", "ast", AS_ROLES, ["ทะเบียนครุภัณฑ์", "Asset register"], () => `${eHead(AS_APP, "A2", ["ทะเบียนครุภัณฑ์", "Asset register"], ["เลขครุภัณฑ์ ผู้ดูแล สถานที่ ค่าเสื่อมราคา ซ่อม และจำหน่าย · หน่วยเห็นเฉพาะครุภัณฑ์ของตน", "Asset number, custodian, location, depreciation, repair and disposal · units see only their own assets"])}
  ${crudList("asset", { head: `<h2>${L("รายการครุภัณฑ์", "Assets")}</h2>`, empty: L("ยังไม่มีครุภัณฑ์", "No assets yet") })}`);
ePageDef("assets", "as-xfer", "A4", "ast", AS_ROLES, ["โอนและย้ายครุภัณฑ์", "Transfers"], () => `${eHead(AS_APP, "A4", ["โอนและย้ายครุภัณฑ์", "Transfers"], ["ขอโอน อนุมัติตามขั้นวงเงิน (O3) และยืนยันรับโดยหน่วยปลายทาง", "Request, approve by amount tier (O3), and confirm receipt at the receiving unit"])}
  ${crudList("axfer", { head: `<h2>${L("ใบโอน / ย้าย", "Transfers")}</h2>`, empty: L("ยังไม่มีใบโอน", "No transfers yet") })}`);

// ---------- A3 intake from accepted contract phases ----------
function intakeRows() {
  const skip = S.askip || [], rows = [];
  (S.contracts || []).filter(c => c.status !== "terminated").forEach(c => c.phases.filter(phaseAccepted).forEach(ph => {
    const key = `${c.id}#${ph.n}`;
    if ((S.assets || []).some(a => a.src && a.src.type === "contract" && a.src.id === c.id && a.src.phase === ph.n) || skip.includes(key)) return;
    rows.push({ key, c, ph });
  }));
  return rows;
}
ePageDef("assets", "as-intake", "A3", "ast", AS_ROLES, ["รับเข้าจากสัญญา", "Intake from contracts"], () => {
  const R = intakeRows(), done = (S.assets || []).filter(a => a.src && a.src.type === "contract");
  return `${eHead(AS_APP, "A3", ["รับเข้าจากสัญญา", "Intake from contracts"], ["งวดงานที่ตรวจรับแล้วใน Fisko Procurement แต่ยังไม่ได้ขึ้นทะเบียน · เลือกหมวดแล้วสร้างรายการรอยืนยัน หรือข้ามถ้าไม่ใช่ครุภัณฑ์", "Phases accepted in Fisko Procurement and not yet registered · pick a category to create a pending entry, or skip if it is not an asset"])}
    ${eKpis([[L("รอลงทะเบียน", "To register"), R.length, "", R.length > 0], [L("ลงทะเบียนจากสัญญาแล้ว", "Registered from contracts"), done.length]])}
    <section class="panel"><header><h2>${L("งวดงานที่ตรวจรับแล้ว", "Accepted phases")}</h2></header>${R.length ? `<div class="tbl-wrap"><table><thead><tr><th>${L("สัญญา / งวด", "Contract / phase")}</th><th>${L("ผู้ขาย", "Supplier")}</th><th class="n">${L("ยอด (บาท)", "Amount (baht)")}</th><th>${L("หมวด", "Category")}</th><th></th></tr></thead>
    <tbody>${R.map(r => `<tr><td><span class="mono">${r.c.id}</span> ${esc(tx(r.ph.name))}</td><td>${esc(tx(r.c.vendor))}</td><td class="n">${fmt(r.ph.result === "partial" ? r.ph.okAmount : r.ph.amount)}</td>
      <td>${isAsset() ? `<select data-incat="${r.key}" aria-label="${L("หมวด", "Category")}">${ASSET_CATS.map(c => `<option value="${c.id}">${c.id} ${esc(tx(c.name))}</option>`).join("")}</select>` : "–"}</td>
      <td>${isAsset() ? `<button class="btn primary" type="button" data-inreg="${r.key}">${L("สร้างรายการ", "Create entry")}</button> <button class="btn ghost" type="button" data-inskip="${r.key}">${L("ไม่ใช่ครุภัณฑ์", "Not an asset")}</button>` : ""}</td></tr>`).join("")}</tbody></table></div>` : `<div class="body sub">${dotI("ok")}${L("ไม่มีงวดที่รอลงทะเบียน", "No phases waiting")}</div>`}</section>`;
}, () => {
  $$("[data-inreg]").forEach(b => (b.onclick = () => {
    const [cid, n] = b.dataset.inreg.split("#"), c = famCon(cid), ph = c.phases.find(p => p.n === Number(n)), cat = $(`[data-incat="${b.dataset.inreg}"]`).value;
    const a = { id: eNextId("AS-", S.assets), name: [`${tx(c.vendor)} ${ph.name[0]} (${c.id})`, `${c.vendor[1]} ${ph.name[1]} (${c.id})`], cat, unit: S.units.find(u => u.code === "01").id, cust: "", loc: "", acq: TODAY, cost: ph.result === "partial" ? ph.okAmount : ph.amount, src: { type: "contract", id: c.id, phase: ph.n }, status: "pending", tag: "" };
    S.assets.push(a); audit(["สร้างรายการครุภัณฑ์จากสัญญา", "Created an asset entry from a contract"], `${a.id} ${c.id} ${ph.name[0]}`); commit(); toast(`${L("สร้างรายการ", "Created")} ${a.id} · ${L("ไปยืนยันที่ A2", "confirm it at A2")}`); route();
  }));
  $$("[data-inskip]").forEach(b => (b.onclick = () => { (S.askip = S.askip || []).push(b.dataset.inskip); audit(["ข้ามงวดที่ไม่ใช่ครุภัณฑ์", "Skipped a phase that is not an asset"], b.dataset.inskip); commit(); route(); }));
});

// ---------- A5 annual count ----------
const CNT_RES = { found: [["พบ", "Found"], "p-ok"], missing: [["ไม่พบ", "Missing"], "p-bad"], damaged: [["ชำรุด", "Damaged"], "p-warn"] };
ePageDef("assets", "as-count", "A5", "ast", AS_ROLES, ["ตรวจนับประจำปี", "Annual count"], () => {
  const c = (S.acount || [])[0], A = (S.assets || []).filter(a => assetInService(a) && (!myUnitOnly() || a.unit === me().unit)), res = c ? c.results : {}, open = c && c.status === "open", canMark = open && (isAsset() || myUnitOnly());
  const n = k => A.filter(a => res[a.id] === k).length;
  return `${eHead(AS_APP, "A5", ["ตรวจนับประจำปี", "Annual count"], ["ตรวจนับครุภัณฑ์ที่ใช้งานเทียบทะเบียน บันทึกพบ ไม่พบ หรือชำรุด แล้วปิดรอบเพื่อสรุปผล", "Count the assets in service against the register, record found, missing or damaged, then close the round"])}
    ${c ? eKpis([[L("รอบ", "Round"), c.id, open ? L("เปิดอยู่", "Open") : L("ปิดแล้ว", "Closed")], [L("นับแล้ว", "Counted"), `${A.filter(a => res[a.id]).length}/${A.length}`], [L("พบ", "Found"), n("found")], [L("ไม่พบ", "Missing"), n("missing"), "", n("missing") > 0], [L("ชำรุด", "Damaged"), n("damaged")]]) : ""}
    <section class="panel"><header><h2>${L("รายการที่ต้องนับ", "To count")}</h2><span class="sp"></span>${open && isAsset() ? `<button class="btn primary" type="button" id="cnt-close">${L("ปิดรอบและสรุปผล", "Close the round")}</button>` : ""}${c && !open && isAsset() ? `<button class="btn" type="button" id="cnt-new">${L("เปิดรอบใหม่", "Open a new round")}</button>` : ""}</header>
    ${A.length ? `<div class="tbl-wrap"><table><thead><tr><th>${L("เลขครุภัณฑ์", "No.")}</th><th>${L("ครุภัณฑ์", "Asset")}</th><th>${L("สถานที่", "Location")}</th><th>${L("ผลนับ", "Result")}</th>${canMark ? "<th></th>" : ""}</tr></thead>
    <tbody>${A.map(a => `<tr><td class="mono">${esc(a.tag)}</td><td>${esc(tx(a.name))}<div class="sub">${esc(unitName(a.unit))}</div></td><td class="sub">${esc(a.loc || "–")}</td><td>${res[a.id] ? tag(tx(CNT_RES[res[a.id]][0]), CNT_RES[res[a.id]][1]) : `<span class="sub">${L("ยังไม่นับ", "Not counted")}</span>`}</td>
      ${canMark ? `<td style="white-space:nowrap">${Object.keys(CNT_RES).map(k => `<button class="btn ${res[a.id] === k ? "primary" : "ghost"}" type="button" data-cnt="${a.id}|${k}">${tx(CNT_RES[k][0])}</button>`).join(" ")}</td>` : ""}</tr>`).join("")}</tbody></table></div>` : `<div class="body sub">${L("ไม่มีครุภัณฑ์ให้นับ", "Nothing to count")}</div>`}</section>
    ${c && c.summary ? eNote(`${L("สรุปผลรอบ", "Round summary")} ${c.id}: ${esc(c.summary)}`) : ""}`;
}, () => {
  $$("[data-cnt]").forEach(b => (b.onclick = () => { const [id, k] = b.dataset.cnt.split("|"), c = S.acount[0]; c.results[id] = k; audit(["บันทึกผลตรวจนับ", "Recorded a count result"], `${c.id} ${id} ${k}`); commit(); route(); }));
  const cl = $("#cnt-close"); if (cl) cl.onclick = () => {
    const c = S.acount[0], A = S.assets.filter(assetInService), un = A.filter(a => !c.results[a.id]), miss = A.filter(a => c.results[a.id] === "missing");
    if (un.length) { toast(L(`ยังนับไม่ครบ เหลือ ${un.length} รายการ`, `${un.length} assets are not counted yet`)); return; }
    c.status = "closed"; c.summary = L(`พบ ${A.filter(a => c.results[a.id] === "found").length} ไม่พบ ${miss.length} ชำรุด ${A.filter(a => c.results[a.id] === "damaged").length}`, `Found ${A.filter(a => c.results[a.id] === "found").length}, missing ${miss.length}, damaged ${A.filter(a => c.results[a.id] === "damaged").length}`);
    if (miss.length) notify(["audit", "exec"], [`ตรวจนับ ${c.id}: ไม่พบครุภัณฑ์ ${miss.length} รายการ`, `Count ${c.id}: ${miss.length} assets not found`], "as-count");
    audit(["ปิดรอบตรวจนับ", "Closed the count round"], c.id); commit(); toast(c.summary); route();
  };
  const nw = $("#cnt-new"); if (nw) nw.onclick = () => { S.acount.unshift({ id: `CNT-${CUR_FY}-${S.acount.length + 1}`, fy: CUR_FY, status: "open", start: TODAY, results: {} }); audit(["เปิดรอบตรวจนับ", "Opened a count round"], S.acount[0].id); commit(); route(); };
});

// ---------- A6 depreciation ----------
ePageDef("assets", "as-dep", "A6", "ast", AS_ROLES, ["ค่าเสื่อมราคา", "Depreciation"], () => {
  const A = S.assets || [], runs = S.depRuns || [], last = runs.length ? runs[0].month : "2026-06", next = ymAdd(last, 1), canRun = next < TODAY.slice(0, 7);
  const byCat = ASSET_CATS.map(c => { const xs = A.filter(a => a.cat === c.id && assetInService(a)); return { c, n: xs.length, cost: xs.reduce((s, a) => s + a.cost, 0), acc: xs.reduce((s, a) => s + assetDep(a).acc, 0) }; });
  return `${eHead(AS_APP, "A6", ["ค่าเสื่อมราคา", "Depreciation"], ["คิดแบบเส้นตรงรายเดือน ราคาซาก 1 บาท · ปิดงวดรายเดือนแล้วแจ้งการเงิน · คำนวณในต้นแบบนี้เท่านั้น ไม่ลงบัญชีจริง", "Straight line by month, salvage 1 baht · close each month and tell Finance · computed in this prototype only, nothing is posted to real books"])}
    ${eKpis([[L("งวดล่าสุดที่ปิด", "Last closed month"), last], [L("งวดถัดไป", "Next month"), next, canRun ? L("ปิดได้แล้ว", "Can be closed") : L("ปิดได้หลังสิ้นเดือน", "Closable after month end")], [L("ค่าเสื่อมต่อเดือน (ปัจจุบัน)", "Monthly charge now"), fmt(depForMonth(TODAY.slice(0, 7))), L("บาท", "baht")]])}
    <section class="panel"><header><h2>${L("ตามหมวด", "By category")}</h2></header><div class="tbl-wrap"><table><thead><tr><th>${L("หมวด", "Category")}</th><th class="n">${L("จำนวน", "Items")}</th><th class="n">${L("ราคาทุน", "Cost")}</th><th class="n">${L("ค่าเสื่อมสะสม", "Accumulated")}</th><th class="n">${L("มูลค่าตามบัญชี", "Book value")}</th></tr></thead>
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
