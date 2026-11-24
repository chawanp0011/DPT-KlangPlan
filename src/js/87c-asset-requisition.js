// Fisko Assets, round R9, part 3: asking for an asset (A10) and the seed for the whole R9 asset work.
// A unit asks for a kind of asset and says how many and why. The asset team looks at the spare stock of that type at approval,
// names the exact items and hands them over; with no stock the answer is "procure". Sample flow, to confirm with the asset team.
const AR_ST = { submitted: [["รอพิจารณา", "Waiting"], "p-info"], approved: [["อนุมัติ รอส่งมอบ", "Approved, to hand over"], "p-warn"], done: [["ส่งมอบแล้ว", "Handed over"], "p-ok"], rejected: [["ไม่อนุมัติ", "Not approved"], "p-bad"], nostock: [["ไม่มีของ ให้จัดหาใหม่", "Not in stock, to procure"], "p-mute"], cancelled: [["ถอนคำขอ", "Withdrawn"], "p-mute"] };
const arReserved = () => (S.areqs || []).filter(r => r.status === "approved").flatMap(r => r.items || []);
const arSpare = (cat, keep) => (S.assets || []).filter(a => a.status === "spare" && a.cat === cat && (!arReserved().includes(a.id) || (keep || []).includes(a.id)));
CRUD.def("areq", {
  noun: ["ใบขอเบิกครุภัณฑ์", "Asset requisition"], st: AR_ST, live: false,
  list: () => (S.areqs || []).filter(r => !myUnitOnly() || r.unit === me().unit), id: r => r.id, title: r => `${typeLabel(r.cat)} × ${r.qty}`, sub: r => `${unitName(r.unit)} · ${userName(r.by)}`,
  status: r => r.status, gone: r => r.status === "cancelled", search: r => `${r.id} ${typeLabel(r.cat)} ${r.why} ${r.spec || ""} ${unitName(r.unit)}`,
  filters: [{ id: "st", label: ["สถานะ", "Status"], opts: () => Object.keys(AR_ST).map(k => [k, tx(AR_ST[k][0])]), get: r => r.status }, { id: "cat", label: ["ประเภท", "Type"], opts: () => atypeOpts(), get: r => r.cat }],
  cols: [{ h: ["เลขที่", "No."], c: r => `<span class="mono">${r.id}</span>` }, { h: ["ประเภทที่ขอ", "Type requested"], c: r => `<b style="font-weight:600">${esc(typeLabel(r.cat))}</b><div class="sub">${esc(r.spec || "")}</div>` }, { h: ["จำนวน", "Qty"], n: true, c: r => r.qty },
    { h: ["หน่วยที่ขอ", "Unit"], c: r => esc(unitName(r.unit)) }, { h: ["ต้องการภายใน", "Needed by"], c: r => fdate(r.need) }, { h: ["ผู้ขอ", "Requester"], c: r => esc(userName(r.by)) }],
  fields: (r, v) => r ? [
    { id: "_i1", type: "info", label: ["รายการที่ขอ", "Requested"], html: `${esc(typeLabel(r.cat))} × ${r.qty} · ${esc(unitName(r.unit))}`, wide: true },
    { id: "_i2", type: "info", label: ["เหตุผลที่ขอ", "Why"], html: `${esc(r.why)}${r.spec ? `<div class="sub">${L("รายละเอียด", "Details")}: ${esc(r.spec)}</div>` : ""}`, wide: true },
    { id: "items", label: [`ระบุรายการที่จัดให้ (พร้อมจ่ายประเภทนี้ ${arSpare(r.cat).length} รายการ)`, `Items to give (${arSpare(r.cat).length} spare of this type)`], type: "checks", req: true, value: r.items || [], opts: arSpare(r.cat, r.items).map(a => [a.id, `${a.tag} ${tx(a.name)} · ${fmt(a.cost)} ${L("บาท", "baht")} · ${fdate(a.acq)}`]), none: L("ไม่มีครุภัณฑ์ประเภทนี้ที่พร้อมจ่าย ใช้ปุ่ม “ไม่มีของ” เพื่อส่งเรื่องจัดหา", "No spare asset of this type. Use “Not in stock” to send it to procurement") },
    { id: "date", label: ["วันนัดส่งมอบ", "Hand-over date"], type: "date", req: true, value: TODAY, min: TODAY },
    { id: "note", label: ["รายละเอียดการอนุมัติ (เช่น เงื่อนไข สิ่งที่แนบไปด้วย)", "Approval details (conditions, what comes with it)"], type: "textarea", wide: true, value: "" },
  ] : [
    { id: "unit", label: ["หน่วยที่ขอ", "Requesting unit"], type: "select", req: true, value: me().unit, lock: myUnitOnly(), show: esc(unitName(me().unit)), opts: unitOpts() },
    { id: "cat", label: ["ประเภทครุภัณฑ์ที่ขอ", "Asset type requested"], type: "select", req: true, value: "13", opts: atypeOpts(), wide: true },
    { id: "qty", label: ["จำนวน", "Quantity"], type: "number", req: true, min: 1, max: 50, value: 1 }, { id: "need", label: ["ต้องการภายในวันที่", "Needed by"], type: "date", req: true, min: TODAY, value: "" },
    { id: "spec", label: ["รายละเอียดที่ขอ (คุณสมบัติ ขนาด สเปก)", "Details wanted (features, size, specification)"], type: "textarea", wide: true, value: "" },
    { id: "why", label: ["เหตุผลที่ขอ (อย่างน้อย 10 ตัวอักษร)", "Why (at least 10 characters)"], type: "textarea", req: true, wide: true, value: "" },
  ],
  check: (v, r) => { const e = [];
    if (r) { const ids = v.items || [], okIds = arSpare(r.cat, r.items).map(a => a.id); if (ids.length > r.qty) e.push({ f: "items", m: L(`เลือกได้ไม่เกิน ${r.qty} รายการตามที่ขอ`, `Pick at most ${r.qty} items`) }); if (ids.some(id => !okIds.includes(id))) e.push({ f: "items", m: L("มีรายการที่ไม่พร้อมจ่ายหรือคนละประเภท", "Some items are not spare or are of another type") }); if (ids.length && ids.length < r.qty && (v.note || "").length < 10) e.push({ f: "note", m: L("จัดให้ไม่ครบจำนวน ใส่รายละเอียดอย่างน้อย 10 ตัวอักษรว่าส่วนที่เหลือทำอย่างไร", "Fewer than requested: explain in at least 10 characters what happens to the rest") }); }
    else { if (v.need && v.need < TODAY) e.push({ f: "need", m: L("วันที่ต้องการต้องไม่ก่อนวันนี้", "The date can't be in the past") }); if ((v.why || "").length < 10) e.push({ f: "why", m: L("ใส่เหตุผลอย่างน้อย 10 ตัวอักษร", "Give a reason of at least 10 characters") }); if (!(v.qty >= 1)) e.push({ f: "qty", m: L("จำนวนต้องไม่น้อยกว่า 1", "At least 1") }); }
    return e; },
  create: { can: () => myUnitOnly() || isAsset(), label: ["ขอเบิกครุภัณฑ์", "Request an asset"], run: v => { const r = { id: eNextId("AR-", S.areqs), unit: myUnitOnly() ? me().unit : v.unit, by: me().id, cat: v.cat, qty: v.qty, spec: v.spec, need: v.need, why: v.why, status: "submitted", items: [], t: nowIso() };
    S.areqs.push(r); audit(["ขอเบิกครุภัณฑ์", "Requested an asset"], `${r.id} ${typeLabel(r.cat)} × ${r.qty} · ${unitName(r.unit)}`); notify(["asset"], [`ใบขอเบิกครุภัณฑ์ ${r.id} รอพิจารณา`, `Asset requisition ${r.id} awaits a decision`], "as-req"); return r; } },
  edit: { can: r => r.status === "submitted" && isAsset(), label: ["อนุมัติและระบุรายการ", "Approve and name the items"], save: ["อนุมัติ", "Approve"], primary: true, run: (r, v) => {
    r.items = v.items.slice(); r.status = "approved"; r.decided = { by: me().id, t: nowIso(), note: v.note || "", due: v.date, short: v.items.length < r.qty };
    audit(["อนุมัติใบขอเบิกครุภัณฑ์", "Approved an asset requisition"], `${r.id} · ${v.items.join(", ")}`); notify(["div"], [`ใบขอเบิก ${r.id} อนุมัติแล้ว นัดส่งมอบ ${fdate(v.date)}`, `Requisition ${r.id} approved; hand-over on ${fdate(v.date)}`], "as-req"); } },
  acts: r => {
    const out = [];
    if (r.status === "submitted" && isAsset()) out.push({ id: "ns", label: L("ไม่มีของ ให้จัดหาใหม่", "Not in stock, procure"), why: true, run: (x, why) => { x.status = "nostock"; x.decided = { by: me().id, t: nowIso(), note: why }; audit(["ไม่มีครุภัณฑ์พร้อมจ่าย ให้จัดหา", "No spare stock; to procure"], `${x.id} · ${why}`); notify(["div"], [`ใบขอเบิก ${x.id}: ไม่มีของพร้อมจ่าย ส่งเรื่องจัดหาใหม่`, `Requisition ${x.id}: no spare stock, to be procured`], "as-req"); return L("บันทึกแล้ว ส่งเรื่องจัดหา", "Recorded; sent to procurement"); } },
      { id: "no", label: L("ไม่อนุมัติ", "Do not approve"), kind: "danger", why: true, run: (x, why) => { x.status = "rejected"; x.decided = { by: me().id, t: nowIso(), note: why }; audit(["ไม่อนุมัติใบขอเบิก", "Requisition not approved"], `${x.id} · ${why}`); return L("บันทึกแล้ว", "Recorded"); } });
    if (r.status === "submitted" && (r.by === me().id || isAsset())) out.push({ id: "wd", label: L("ถอนคำขอ", "Withdraw"), why: true, run: (x, why) => { x.status = "cancelled"; audit(["ถอนใบขอเบิก", "Withdrew a requisition"], `${x.id} · ${why}`); return L("ถอนแล้ว", "Withdrawn"); } });
    if (r.status === "approved" && isAsset()) out.push({ id: "give", label: L("ส่งมอบครุภัณฑ์", "Hand over"), kind: "primary", confirm: L("ย้ายรายการที่ระบุไปให้หน่วยที่ขอ ผู้ดูแลและสถานที่ต้องปรับที่ A2", "Moves the named items to the requesting unit; set custodian and location at A2"), run: x => {
      const cu = (S.users.find(u => u.id === x.by && (u.role === "div" || u.role === "divhead")) || S.users.find(u => u.unit === x.unit && u.role === "div") || {}).id || "";
      (x.items || []).map(asset).filter(Boolean).forEach(a => { a.unit = x.unit; a.cust = cu; a.status = "active"; a.locId = ""; a.loc = ""; a.locNote = ""; });
      x.status = "done"; x.done = { by: me().id, t: nowIso() }; audit(["ส่งมอบครุภัณฑ์ตามใบขอเบิก", "Handed over assets for a requisition"], `${x.id} · ${(x.items || []).join(", ")}`); return L("ส่งมอบแล้ว", "Handed over"); } },
      { id: "undo", label: L("ยกเลิกการอนุมัติ", "Cancel the approval"), why: true, run: (x, why) => { x.status = "submitted"; x.items = []; audit(["ยกเลิกการอนุมัติใบขอเบิก", "Cancelled a requisition approval"], `${x.id} · ${why}`); return L("กลับไปรอพิจารณา", "Back to waiting"); } });
    return out;
  },
  view: r => kv([[L("ประเภทที่ขอ", "Type"), esc(typeLabel(r.cat))], [L("จำนวน", "Quantity"), r.qty], [L("หน่วยที่ขอ", "Unit"), esc(unitName(r.unit))], [L("ผู้ขอ", "Requester"), `${esc(userName(r.by))} · ${fdate(r.t, true)}`], [L("ต้องการภายใน", "Needed by"), fdate(r.need)], r.spec && [L("รายละเอียดที่ขอ", "Details"), esc(r.spec)], [L("เหตุผล", "Why"), esc(r.why)],
    (r.items || []).length && [L("รายการที่จัดให้", "Items named"), `<div class="tbl-wrap"><table><tbody>${r.items.map(id => `<tr><td class="mono">${esc((asset(id) || {}).tag || id)}</td><td>${esc(assetName(id))}</td><td class="sub">${asset(id) ? esc(unitName(asset(id).unit)) : ""}</td></tr>`).join("")}</tbody></table></div>`],
    r.decided && [L("ผลพิจารณา", "Decision"), `${esc(userName(r.decided.by))} · ${fdate(r.decided.t, true)}${r.decided.due ? ` · ${L("นัดส่งมอบ", "hand-over")} ${fdate(r.decided.due)}` : ""}${r.decided.note ? `<div>${esc(r.decided.note)}</div>` : ""}${r.decided.short ? `<div class="sub">${L("จัดให้ไม่ครบจำนวนที่ขอ", "Fewer than requested")}</div>` : ""}`],
    r.done && [L("ส่งมอบ", "Handed over"), `${esc(userName(r.done.by))} · ${fdate(r.done.t, true)}`]]),
});
ePageDef("assets", "as-req", "A10", "ast", AS_ROLES, ["ขอเบิกครุภัณฑ์", "Asset requisitions"], () => {
  const R = (S.areqs || []).filter(r => !myUnitOnly() || r.unit === me().unit), n = k => R.filter(r => r.status === k).length;
  return `${eHead(AS_APP, "A10", ["ขอเบิกครุภัณฑ์", "Asset requisitions"], ["หน่วยขอตามประเภทครุภัณฑ์ ระบุจำนวนและเหตุผล · ฝ่ายพัสดุอนุมัติพร้อมระบุรายการที่จัดให้จากของพร้อมจ่าย แล้วส่งมอบ · ไม่มีของให้ส่งเรื่องจัดหา", "A unit asks by asset type with quantity and reason · the asset team approves and names the items from spare stock, then hands them over · no stock means procure"])}
    ${eKpis([[L("รอพิจารณา", "Waiting"), n("submitted"), "", n("submitted") > 0], [L("รอส่งมอบ", "To hand over"), n("approved")], [L("ส่งมอบแล้ว", "Handed over"), n("done")], [L("ไม่มีของ ให้จัดหา", "To procure"), n("nostock")], [L("ครุภัณฑ์พร้อมจ่าย", "Spare assets"), (S.assets || []).filter(a => a.status === "spare").length]])}
    ${crudList("areq", { head: `<h2>${L("ใบขอเบิก", "Requisitions")}</h2>`, empty: L("ยังไม่มีใบขอเบิก", "No requisitions yet") })}`;
});
{
  const base = famTasks;
  famTasks = R => {
    base(R);
    if (ROLE === "asset") (S.areqs || []).forEach(r => { if (r.status === "submitted") R(`${L("พิจารณาใบขอเบิกครุภัณฑ์", "Decide an asset requisition")} ${r.id}`, `${typeLabel(r.cat)} × ${r.qty} · ${unitName(r.unit)}`, r.need, "as-req", "p-info"); else if (r.status === "approved") R(`${L("ส่งมอบครุภัณฑ์", "Hand over assets")} ${r.id}`, `${(r.items || []).length} ${L("รายการ", "items")} · ${unitName(r.unit)}`, (r.decided || {}).due || TODAY, "as-req", "p-warn"); });
  };
}

// ---------- seed for the R9 asset work ----------
function assetSeed2(s) {
  const prevS = S; S = s;
  try {
    const kids = s.units.filter(u => u.parent), divOf = u => (s.users.find(x => x.role === "div" && x.unit === u) || s.users.find(x => x.unit === u) || s.users[0]).id;
    s.atypes = ASSET_TYPE_DEFS.map(t => ({ ...t, ex: [...(t.ex || [])], std: true }));
    // locations: one per distinct place named on the sample assets, tied to the sample buildings (BL-01 head office, BL-02 store)
    const L0 = { "ห้อง 201": ["BL-01", "2", "201", "room"], "ห้อง 305": ["BL-01", "3", "305", "room"], "ห้อง 410": ["BL-01", "4", "410", "room"], "ห้อง 108": ["BL-01", "1", "108", "room"], "ห้องประชุมใหญ่": ["BL-01", "3", "", "meeting"], "ห้องศูนย์ข้อมูล": ["BL-01", "1", "", "data"], "ห้องพัสดุ": ["BL-02", "1", "", "store"], "ลานจอด": ["", "", "", "park"] };
    s.alocs = Object.keys(L0).map((name, i) => { const [bldg, floor, room, kind] = L0[name], first = s.assets.find(a => a.loc === name); return { id: "LC-" + String(i + 1).padStart(4, "0"), bldg, floor, room, name, kind, unit: first ? first.unit : "", addr: bldg ? "ที่อยู่ตัวอย่าง" : "ลานจอดรถด้านหลังอาคารสำนักงานใหญ่", lat: kind === "park" ? 13.7563 : "", lng: kind === "park" ? 100.5018 : "", note: "", on: true }; });
    s.assets.forEach(a => { const l = s.alocs.find(x => x.name === a.loc); a.locId = l ? l.id : ""; a.locNote = a.locId && a.loc === "ห้อง 108" ? "ตู้หมายเลข 3" : ""; });
    const sp = s.assets.filter(a => a.id === "AS-0015" || a.id === "AS-0016");
    sp.forEach(a => (a.batch = "AB-0001"));
    s.abatch = [{ id: "AB-0001", name: ["เครื่องคอมพิวเตอร์พกพา (สำรอง)", "Spare laptop"], cat: "13", unit: sp[0].unit, cost: 29500, total: 59000, src: "purchase", ids: sp.map(a => a.id), first: sp[0].tag, last: sp[1].tag, by: "u12", t: "2026-02-12T10:00" }];
    const k2 = kids[2 % kids.length].id, k1 = kids[1 % kids.length].id, k3 = kids[3 % kids.length].id;
    s.areqs = [
      { id: "AR-0001", unit: k2, by: divOf(k2), cat: "13", qty: 1, spec: "หน่วยความจำ 16 GB จอ 14 นิ้ว", need: "2026-12-01", why: "เจ้าหน้าที่ใหม่เข้าปฏิบัติงานเดือนธันวาคม ยังไม่มีเครื่องใช้งาน", status: "submitted", items: [], t: "2026-11-12T09:15" },
      { id: "AR-0002", unit: k1, by: divOf(k1), cat: "04", qty: 1, spec: "เก้าอี้พนักพิงสูง", need: "2026-11-25", why: "เปลี่ยนเก้าอี้ที่ชำรุดของเจ้าหน้าที่ประจำโต๊ะ", status: "approved", items: ["AS-0017"], t: "2026-11-05T10:00", decided: { by: "u12", t: "2026-11-06T14:00", note: "ส่งมอบพร้อมป้ายครุภัณฑ์", due: "2026-11-20", short: false } },
      { id: "AR-0003", unit: k3, by: divOf(k3), cat: "05", qty: 1, spec: "รถกระบะ 4 ประตู", need: "2026-12-15", why: "ใช้ตรวจพื้นที่ภาคสนามเพิ่มอีกหนึ่งคัน", status: "nostock", items: [], t: "2026-10-28T11:00", decided: { by: "u12", t: "2026-10-30T09:00", note: "ไม่มีรถพร้อมจ่าย ส่งเรื่องเข้าแผนจัดซื้อ" } },
    ];
    const old = (fy, bad) => { const end = `${fy - 543}-09-30`, res = {}; s.assets.filter(a => a.status !== "cancelled" && a.status !== "pending" && a.acq <= end).forEach(a => (res[a.id] = bad[a.id] || "found"));
      const v = Object.values(res), n = k => v.filter(x => x === k).length; return { id: "CNT-" + fy, fy, status: "closed", start: `${fy - 543}-08-01`, results: res, summary: `พบ ${n("found")} ไม่พบ ${n("missing")} ชำรุด ${n("damaged")}`, closed: { by: "u12", t: `${fy - 543}-09-20T10:00` } }; };
    s.acount.push(old(CUR_FY - 1, { "AS-0010": "damaged" }), old(CUR_FY - 2, { "AS-0010": "damaged", "AS-0005": "missing" }), old(CUR_FY - 3, {}));
    s.acount.sort((a, b) => b.fy - a.fy);
  } finally { S = prevS; }
  return s;
}
Object.keys(SEEDS).forEach(k => { const prev = SEEDS[k].seed; SEEDS[k].seed = () => assetSeed2(prev()); });
