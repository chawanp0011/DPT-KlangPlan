// Fisko Assets, round R9, part 2: master data and batch work.
//   A7  depreciation register, one line per asset, laid out from the Comptroller General's Department letter
//   A8  asset type register (main type / sub type, life range, rate range, CGD code placeholder)
//   A9  location register (building, floor, room, address, coordinates) so reports and other systems can reuse the place
// Sample data only. The CGD codes are placeholders; the life and rate ranges are copied from table 1 of the letter.
const asCsv = rows => rows.map(r => r.map(x => { const t = String(x == null ? "" : x); return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; }).join(",")).join("\n");
const asActor = () => isAsset() || ROLE === "fin";
const asParse = t => String(t || "").split(/\r?\n/).map(x => x.trim()).filter(Boolean);

// ---------- A8 asset types ----------
const AT_ST = { on: [["ใช้งาน", "In use"], "p-ok"], off: [["ปิดใช้งาน", "Switched off"], "p-mute"] };
const typeCount = id => (S.assets || []).filter(a => a.cat === id && a.status !== "cancelled" && a.status !== "disposed").length;
CRUD.def("atype", {
  noun: ["ประเภทครุภัณฑ์", "Asset type"], st: AT_ST, live: false,
  list: () => S.atypes || [], id: t => t.id, title: t => tx(t.name), sub: t => `${t.id} · ${tx(ASSET_GROUP[t.group] || ASSET_GROUP.dur)}`, group: t => `${tx(ASSET_GROUP[t.group] || ASSET_GROUP.dur)}`,
  status: t => (t.on === false ? "off" : "on"), search: t => `${t.id} ${t.name.join(" ")} ${t.cgd || ""} ${(t.ex || []).join(" ")}`,
  filters: [{ id: "g", label: ["กลุ่ม", "Group"], opts: () => Object.keys(ASSET_GROUP).map(k => [k, tx(ASSET_GROUP[k])]), get: t => t.group }],
  cols: [{ h: ["ลำดับ", "No."], c: t => `<span class="mono">${t.id}</span>` }, { h: ["หมวดหลัก", "Main type"], c: t => `<b style="font-weight:600">${esc(tx(t.main))}</b>` }, { h: ["หมวดย่อย", "Sub type"], c: t => esc(t.sub ? tx(t.sub) : "–") },
    { h: ["รหัสกรมบัญชีกลาง (ตัวอย่าง)", "CGD code (sample)"], c: t => `<span class="mono">${esc(t.cgd || "–")}</span>` }, { h: ["อายุใช้งาน (ปี) ต่ำ-สูง", "Life (yr) min-max"], c: t => `${t.lifeMin}-${t.lifeMax}` }, { h: ["อัตรา/ปี (%) ต่ำ-สูง", "Rate/yr (%) min-max"], c: t => `${t.rateMin}-${t.rateMax}` },
    { h: ["อายุที่ใช้ (ปี)", "Adopted life"], n: true, c: t => `<b>${t.life}</b> <span class="sub">(${rateOf(t.life)}%)</span>` }, { h: ["ครุภัณฑ์", "Assets"], n: true, c: t => typeCount(t.id) }],
  fields: (t, v) => {
    const std = !!t && t.std;
    return [
      { id: "id", label: ["ลำดับในตารางกรมบัญชีกลาง (เช่น 04 หรือ 04.1)", "Number in the table (e.g. 04 or 04.1)"], req: true, value: t ? t.id : "", lock: !!t, show: t ? esc(t.id) : "", hint: !t ? L("ประเภทที่เพิ่มเอง ใช้เลขที่ไม่ซ้ำกับตาราง เช่น 04.1", "For a type you add yourself, use a number not in the table, e.g. 04.1") : "" },
      { id: "group", label: ["กลุ่ม", "Group"], type: "select", req: true, value: t ? t.group : "dur", lock: std, show: t ? esc(tx(ASSET_GROUP[t.group])) : "", opts: Object.keys(ASSET_GROUP).map(k => [k, tx(ASSET_GROUP[k])]) },
      { id: "mth", label: ["หมวดหลัก (ไทย)", "Main type (Thai)"], req: true, wide: true, value: t ? t.main[0] : "", lock: std, show: t ? esc(t.main[0]) : "" }, { id: "men", label: ["หมวดหลัก (อังกฤษ)", "Main type (English)"], wide: true, value: t ? t.main[1] : "", lock: std, show: t ? esc(t.main[1]) : "" },
      { id: "sth", label: ["หมวดย่อย (ไทย)", "Sub type (Thai)"], wide: true, value: t && t.sub ? t.sub[0] : "", lock: std, show: t && t.sub ? esc(t.sub[0]) : "–" }, { id: "sen", label: ["หมวดย่อย (อังกฤษ)", "Sub type (English)"], wide: true, value: t && t.sub ? t.sub[1] : "", lock: std, show: t && t.sub ? esc(t.sub[1]) : "–" },
      { id: "cgd", label: ["รหัสกรมบัญชีกลาง", "CGD code"], value: t ? t.cgd || "" : "", hint: L("ค่าที่ใส่ไว้เป็นรหัสตัวอย่าง ใส่รหัสจริงตามผังบัญชีของกรมบัญชีกลาง", "The values here are sample placeholders; enter the real code from the chart of accounts") },
      { id: "lifeMin", label: ["อายุใช้งานอย่างต่ำ (ปี)", "Life, minimum (yr)"], type: "number", req: true, min: 1, value: t ? t.lifeMin : "", lock: std, show: t ? t.lifeMin : "" }, { id: "lifeMax", label: ["อายุใช้งานอย่างสูง (ปี)", "Life, maximum (yr)"], type: "number", req: true, min: 1, value: t ? t.lifeMax : "", lock: std, show: t ? t.lifeMax : "" },
      { id: "life", label: ["อายุใช้งานที่หน่วยงานใช้ (ปี)", "Life adopted by the agency (yr)"], type: "number", req: true, min: 1, value: t ? t.life : "", hint: L("ต้องอยู่ในช่วงต่ำ-สูงของตาราง การเปลี่ยนจะคำนวณค่าเสื่อมของครุภัณฑ์ประเภทนี้ใหม่ทั้งหมด", "Must lie in the table's range. Changing it recalculates depreciation for every asset of this type") },
      { id: "ex", label: ["รายการตัวอย่าง (บรรทัดละ 1 รายการ)", "Example items (one per line)"], type: "textarea", wide: true, value: t ? (t.ex || []).join("\n") : "" },
    ];
  },
  check: (v, t) => { const e = [], lo = t ? t.lifeMin : v.lifeMin, hi = t ? t.lifeMax : v.lifeMax;
    if (!t && (S.atypes || []).some(x => x.id === v.id)) e.push({ f: "id", m: L("เลขนี้มีอยู่แล้ว", "This number already exists") });
    if (!t && !/^\d{2}(\.\d+)?$/.test(v.id || "")) e.push({ f: "id", m: L("รูปแบบเลข เช่น 04 หรือ 04.1", "Use a number like 04 or 04.1") });
    if (!t && v.lifeMin > v.lifeMax) e.push({ f: "lifeMax", m: L("อายุสูงสุดต้องไม่น้อยกว่าอายุต่ำสุด", "Maximum must not be below minimum") });
    if (v.life < lo || v.life > hi) e.push({ f: "life", m: L(`อายุที่ใช้ต้องอยู่ระหว่าง ${lo}-${hi} ปี`, `The adopted life must be between ${lo} and ${hi} years`) });
    return e; },
  create: { can: asActor, label: ["เพิ่มประเภทครุภัณฑ์", "Add an asset type"], run: v => {
    const t = { id: v.id, group: v.group, main: [v.mth, v.men || v.mth], sub: v.sth ? [v.sth, v.sen || v.sth] : null, lifeMin: v.lifeMin, lifeMax: v.lifeMax, rateMin: rateOf(v.lifeMax), rateMax: rateOf(v.lifeMin), life: v.life, cgd: v.cgd, ex: asParse(v.ex), on: true, std: false };
    t.name = t.sub ? [`${t.main[0]} · ${t.sub[0]}`, `${t.main[1]} · ${t.sub[1]}`] : t.main; S.atypes.push(t); S.atypes.sort((a, b) => a.id.localeCompare(b.id, "en", { numeric: true })); audit(["เพิ่มประเภทครุภัณฑ์", "Added an asset type"], `${t.id} ${t.name[0]}`); return t; } },
  edit: { can: asActor, why: t => t.life !== undefined && typeCount(t.id) > 0, run: (t, v, why) => { const old = t.life; t.cgd = v.cgd; t.life = v.life; t.ex = asParse(v.ex);
    if (!t.std) Object.assign(t, { group: v.group, main: [v.mth, v.men || v.mth], sub: v.sth ? [v.sth, v.sen || v.sth] : null, lifeMin: v.lifeMin, lifeMax: v.lifeMax, rateMin: rateOf(v.lifeMax), rateMax: rateOf(v.lifeMin) }), t.name = t.sub ? [`${t.main[0]} · ${t.sub[0]}`, `${t.main[1]} · ${t.sub[1]}`] : t.main;
    audit(["แก้ประเภทครุภัณฑ์", "Edited an asset type"], `${t.id}${old !== t.life ? ` · ${old} → ${t.life} ${L("ปี", "yr")}` : ""}${why ? " · " + why : ""}`); } },
  acts: t => asActor() ? [t.on === false ? { id: "on", label: L("เปิดใช้งาน", "Switch on"), run: x => { x.on = true; audit(["เปิดใช้ประเภทครุภัณฑ์", "Switched an asset type on"], x.id); return L("เปิดแล้ว", "Switched on"); } }
    : { id: "off", label: L("ปิดใช้งาน", "Switch off"), why: true, impact: () => L("ครุภัณฑ์เดิมคงอยู่ แต่เลือกประเภทนี้กับรายการใหม่ไม่ได้", "Existing assets stay; new ones cannot use this type"), run: (x, why) => { x.on = false; audit(["ปิดใช้ประเภทครุภัณฑ์", "Switched an asset type off"], `${x.id} · ${why}`); return L("ปิดแล้ว", "Switched off"); } }] : [],
  view: t => kv([[L("ลำดับ", "No."), t.id], [L("หมวดหลัก", "Main type"), esc(tx(t.main))], [L("หมวดย่อย", "Sub type"), t.sub ? esc(tx(t.sub)) : "–"], [L("รหัสกรมบัญชีกลาง (ตัวอย่าง)", "CGD code (sample)"), esc(t.cgd || "–")],
    [L("อายุใช้งานตามตาราง", "Life in the table"), `${t.lifeMin}-${t.lifeMax} ${L("ปี", "yr")}`], [L("อัตราค่าเสื่อมตามตาราง", "Rate in the table"), `${t.rateMin}-${t.rateMax}% ${L("ต่อปี", "a year")}`], [L("อายุที่หน่วยงานใช้", "Adopted life"), `<b>${t.life} ${L("ปี", "yr")}</b> · ${rateOf(t.life)}% ${L("ต่อปี", "a year")}`],
    [L("ครุภัณฑ์ในทะเบียน", "Assets in the register"), typeCount(t.id)], t.ex && t.ex.length && [L("รายการตัวอย่าง", "Examples"), t.ex.map(esc).join(" · ")], [L("ที่มา", "Origin"), t.std ? L("ตารางที่ 1 หนังสือกรมบัญชีกลาง ที่ กค 0423.3/ว 238", "Table 1, CGD letter ที่ กค 0423.3/ว 238") : L("เพิ่มโดยหน่วยงาน", "Added by the agency")]]),
});
ePageDef("assets", "as-types", "A8", "asm", AS_ROLES, ["ประเภทครุภัณฑ์", "Asset types"], () => `${eHead(AS_APP, "A8", ["ประเภทครุภัณฑ์", "Asset types"], ["หมวดหลัก หมวดย่อย อายุใช้งานและอัตราค่าเสื่อมตามหนังสือกรมบัญชีกลาง ที่ กค 0423.3/ว 238 · หน่วยงานเลือกอายุที่ใช้ในช่วงที่กำหนด · รหัสกรมบัญชีกลางเป็นค่าตัวอย่าง", "Main and sub types with the useful-life and rate ranges from the CGD letter · the agency picks its life within the range · CGD codes are placeholders"])}
  ${eKpis([[L("ประเภททั้งหมด", "Types"), (S.atypes || []).length], [L("เปิดใช้งาน", "In use"), (S.atypes || []).filter(t => t.on !== false).length], [L("ประเภทที่มีครุภัณฑ์", "Types with assets"), (S.atypes || []).filter(t => typeCount(t.id)).length]])}
  ${crudList("atype", { head: `<h2>${L("ตารางประเภทสินทรัพย์", "Asset type table")}</h2>` })}`);

// ---------- A9 locations ----------
const LC_KIND = { room: ["ห้องทำงาน / ห้องทั่วไป", "Room"], meeting: ["ห้องประชุม", "Meeting room"], store: ["ห้องเก็บของ / คลัง", "Store"], data: ["ห้องศูนย์ข้อมูล", "Data room"], park: ["ลานจอด / พื้นที่กลางแจ้ง", "Parking / outdoor"], other: ["อื่น ๆ", "Other"] };
const locAssets = id => (S.assets || []).filter(a => a.locId === id && a.status !== "cancelled" && a.status !== "disposed");
CRUD.def("aloc", {
  noun: ["สถานที่ตั้ง", "Location"], st: AT_ST, live: false,
  list: () => S.alocs || [], id: l => l.id, title: l => alocName(l.id), sub: l => `${tx(LC_KIND[l.kind] || LC_KIND.other)} · ${l.unit ? unitName(l.unit) : L("ไม่ระบุหน่วย", "No unit")}`,
  status: l => (l.on === false ? "off" : "on"), search: l => `${l.id} ${alocName(l.id)} ${l.addr || ""} ${l.room || ""}`,
  filters: [{ id: "b", label: ["อาคาร", "Building"], opts: () => (S.bldgs || []).map(b => [b.id, b.name]), get: l => l.bldg || "" }, { id: "k", label: ["ประเภท", "Kind"], opts: () => Object.keys(LC_KIND).map(k => [k, tx(LC_KIND[k])]), get: l => l.kind }],
  cols: [{ h: ["รหัส", "Code"], c: l => `<span class="mono">${l.id}</span>` }, { h: ["สถานที่", "Place"], c: l => `<b style="font-weight:600">${esc(l.name)}</b><div class="sub">${esc(alocName(l.id))}</div>` }, { h: ["ประเภท", "Kind"], c: l => esc(tx(LC_KIND[l.kind] || LC_KIND.other)) },
    { h: ["หน่วยเจ้าของที่", "Owner unit"], c: l => (l.unit ? esc(unitName(l.unit)) : "–") }, { h: ["พิกัด", "Coordinates"], c: l => (l.lat && l.lng ? `<span class="mono">${l.lat}, ${l.lng}</span>` : "–") }, { h: ["ครุภัณฑ์", "Assets"], n: true, c: l => locAssets(l.id).length }],
  fields: (l, v) => [
    { id: "bldg", label: ["อาคาร (จากทะเบียนอาคาร FM1)", "Building (from the building register, FM1)"], type: "select", blank: L("นอกอาคาร / พื้นที่กลางแจ้ง", "Outside a building / outdoors"), value: l ? l.bldg || "" : "", opts: (S.bldgs || []).map(b => [b.id, b.name]), wide: true },
    { id: "floor", label: ["ชั้น", "Floor"], value: l ? l.floor || "" : "" }, { id: "room", label: ["เลขห้อง / โซน", "Room / zone no."], value: l ? l.room || "" : "" },
    { id: "name", label: ["ชื่อสถานที่", "Place name"], req: true, wide: true, value: l ? l.name : "", hint: L("เช่น ห้อง 201 ห้องศูนย์ข้อมูล ลานจอดรถ", "For example Room 201, data room, car park") },
    { id: "kind", label: ["ประเภทสถานที่", "Kind"], type: "select", req: true, value: l ? l.kind : "room", opts: Object.keys(LC_KIND).map(k => [k, tx(LC_KIND[k])]) }, { id: "unit", label: ["หน่วยเจ้าของที่", "Owner unit"], type: "select", blank: L("ไม่ระบุ", "Not set"), value: l ? l.unit || "" : "", opts: unitOpts() },
    { id: "addr", label: ["ที่อยู่ / รายละเอียดการเดินทาง", "Address / directions"], wide: true, value: l ? l.addr || "" : "" },
    { id: "lat", label: ["ละติจูด", "Latitude"], type: "number", value: l ? l.lat || "" : "" }, { id: "lng", label: ["ลองจิจูด", "Longitude"], type: "number", value: l ? l.lng || "" : "" },
    { id: "note", label: ["หมายเหตุ", "Note"], type: "textarea", wide: true, value: l ? l.note || "" : "" },
  ],
  check: (v, l) => { const e = []; if ((v.lat !== "" && v.lat != null) !== (v.lng !== "" && v.lng != null)) e.push({ f: "lat", m: L("ใส่ละติจูดและลองจิจูดคู่กัน", "Give latitude and longitude together") }); if (v.lat !== "" && (v.lat < -90 || v.lat > 90)) e.push({ f: "lat", m: L("ละติจูดต้องอยู่ระหว่าง -90 ถึง 90", "Latitude must be -90 to 90") }); if (v.lng !== "" && (v.lng < -180 || v.lng > 180)) e.push({ f: "lng", m: L("ลองจิจูดต้องอยู่ระหว่าง -180 ถึง 180", "Longitude must be -180 to 180") });
    if ((S.alocs || []).some(x => (!l || x.id !== l.id) && (x.bldg || "") === (v.bldg || "") && (x.floor || "") === (v.floor || "") && x.name === v.name)) e.push({ f: "name", m: L("มีสถานที่นี้ในอาคารและชั้นเดียวกันแล้ว", "This place already exists on the same building and floor") }); return e; },
  create: { can: isAsset, label: ["เพิ่มสถานที่ตั้ง", "Add a location"], run: v => { const l = { id: eNextId("LC-", S.alocs), bldg: v.bldg, floor: v.floor, room: v.room, name: v.name, kind: v.kind, unit: v.unit, addr: v.addr, lat: v.lat, lng: v.lng, note: v.note, on: true }; S.alocs.push(l); audit(["เพิ่มสถานที่ตั้ง", "Added a location"], `${l.id} ${v.name}`); return l; } },
  edit: { can: isAsset, run: (l, v) => { Object.assign(l, { bldg: v.bldg, floor: v.floor, room: v.room, name: v.name, kind: v.kind, unit: v.unit, addr: v.addr, lat: v.lat, lng: v.lng, note: v.note }); (S.assets || []).filter(a => a.locId === l.id).forEach(a => (a.loc = alocName(l.id))); audit(["แก้สถานที่ตั้ง", "Edited a location"], `${l.id} ${v.name}`); } },
  acts: l => isAsset() ? [l.on === false ? { id: "on", label: L("เปิดใช้งาน", "Switch on"), run: x => { x.on = true; audit(["เปิดใช้สถานที่", "Switched a location on"], x.id); return L("เปิดแล้ว", "Switched on"); } }
    : { id: "off", label: L("ปิดใช้งาน", "Switch off"), why: true, run: (x, why) => { if (locAssets(x.id).length) return L(`ยังมีครุภัณฑ์ ${locAssets(x.id).length} รายการที่สถานที่นี้ ย้ายออกก่อน`, `${locAssets(x.id).length} assets are still here; move them first`); x.on = false; audit(["ปิดใช้สถานที่", "Switched a location off"], `${x.id} · ${why}`); return L("ปิดแล้ว", "Switched off"); } }] : [],
  view: l => kv([[L("รหัส", "Code"), l.id], [L("อาคาร", "Building"), esc(((S.bldgs || []).find(b => b.id === l.bldg) || {}).name || L("นอกอาคาร", "Outside a building"))], [L("ชั้น", "Floor"), esc(l.floor || "–")], [L("ห้อง / โซน", "Room / zone"), esc(l.room || "–")], [L("ชื่อสถานที่", "Name"), esc(l.name)], [L("ประเภท", "Kind"), esc(tx(LC_KIND[l.kind] || LC_KIND.other))],
    [L("หน่วยเจ้าของที่", "Owner unit"), l.unit ? esc(unitName(l.unit)) : "–"], [L("ที่อยู่", "Address"), esc(l.addr || "–")], [L("พิกัด", "Coordinates"), l.lat && l.lng ? `${l.lat}, ${l.lng}` : "–"], l.note && [L("หมายเหตุ", "Note"), esc(l.note)],
    [L("ครุภัณฑ์ที่นี่", "Assets here"), locAssets(l.id).length ? `<div class="tbl-wrap"><table><tbody>${locAssets(l.id).map(a => `<tr><td class="mono">${esc(a.tag || a.id)}</td><td>${esc(tx(a.name))}</td></tr>`).join("")}</tbody></table></div>` : "–"]]),
});
ePageDef("assets", "as-locs", "A9", "asm", AS_ROLES, ["สถานที่ตั้ง", "Locations"], () => `${eHead(AS_APP, "A9", ["สถานที่ตั้ง", "Locations"], ["ทะเบียนอาคาร ชั้น ห้อง ที่อยู่ และพิกัด เพื่อให้ครุภัณฑ์อ้างถึงที่ตั้งแบบมีโครงสร้าง ใช้แยกรายงาน ตรวจนับ และส่งออกไปใช้ต่อได้", "Building, floor, room, address and coordinates so assets point to a structured place: reports, counts and exports can reuse it"])}
  ${eKpis([[L("สถานที่", "Locations"), (S.alocs || []).length], [L("ครุภัณฑ์ที่ยังไม่ระบุสถานที่", "Assets with no location"), (S.assets || []).filter(a => assetInService(a) && !a.locId).length, "", (S.assets || []).some(a => assetInService(a) && !a.locId)]])}
  ${crudList("aloc", { head: `<h2>${L("รายการสถานที่ตั้ง", "Locations")}</h2><span class="sp"></span><button class="btn ghost" type="button" id="loc-csv">${L("ส่งออก CSV", "Export CSV")}</button>`, empty: L("ยังไม่มีสถานที่", "No locations yet") })}`, () => {
  const b = $("#loc-csv"); if (b) b.onclick = () => dsDownload("asset-locations.csv", asCsv([["รหัส", "อาคาร", "ชั้น", "ห้อง/โซน", "ชื่อสถานที่", "ประเภท", "หน่วย", "ที่อยู่", "ละติจูด", "ลองจิจูด", "จำนวนครุภัณฑ์"], ...(S.alocs || []).map(l => [l.id, ((S.bldgs || []).find(x => x.id === l.bldg) || {}).name || "", l.floor || "", l.room || "", l.name, tx(LC_KIND[l.kind] || LC_KIND.other), l.unit ? unitName(l.unit) : "", l.addr || "", l.lat || "", l.lng || "", locAssets(l.id).length])]));
});

// ---------- A7 depreciation register ----------
const depState = a => { const d = assetDep(a); return a.status === "disposed" ? "disposed" : d.low ? "low" : d.months >= (d.life || 1) * 12 ? "full" : "run"; };
const DEP_ST = { run: [["กำลังคิดค่าเสื่อม", "Depreciating"], "p-ok"], full: [["ครบอายุ ยังใช้งาน", "Fully depreciated"], "p-warn"], low: [["ต่ำกว่าเกณฑ์ ไม่คิด", "Below limit, expensed"], "p-mute"], disposed: [["จำหน่ายแล้ว", "Disposed"], "p-mute"] };
CRUD.def("adep", {
  noun: ["ทะเบียนค่าเสื่อมราคา", "Depreciation register"], st: DEP_ST, live: false,
  list: () => (S.assets || []).filter(a => a.status !== "cancelled" && a.status !== "pending" && asVisible(a)), id: a => a.id, title: a => tx(a.name), sub: a => `${a.tag} · ${typeLabel(a.cat)}`,
  status: depState, search: a => `${a.id} ${a.tag} ${a.name.join(" ")} ${typeLabel(a.cat)}`,
  filters: [{ id: "cat", label: ["ประเภท", "Type"], opts: () => atypeOpts(), get: a => a.cat }, { id: "u", label: ["หน่วย", "Unit"], opts: () => unitOpts(), get: a => a.unit }, { id: "st", label: ["สถานะค่าเสื่อม", "State"], opts: () => Object.keys(DEP_ST).map(k => [k, tx(DEP_ST[k][0])]), get: depState }],
  cols: [{ h: ["เลขครุภัณฑ์", "Asset no."], c: a => `<span class="mono">${esc(a.tag)}</span>` }, { h: ["ครุภัณฑ์ / ประเภท", "Asset / type"], c: a => `<b style="font-weight:600">${esc(tx(a.name))}</b><div class="sub">${esc(typeLabel(a.cat))} · ${esc(assetType(a.cat).cgd || "")}</div>` },
    { h: ["ราคาทุน", "Cost"], n: true, c: a => fmt(a.cost) }, { h: ["อายุ (ปี) / อัตรา", "Life / rate"], c: a => (assetDep(a).low ? "–" : `${assetType(a.cat).life} / ${rateOf(assetType(a.cat).life)}%`) }, { h: ["ค่าเสื่อม/เดือน", "Per month"], n: true, c: a => (assetDep(a).low ? "–" : fmt(assetDep(a).monthly, 2)) },
    { h: [`ค่าเสื่อมปีงบ ${CUR_FY}`, `Charge FY ${CUR_FY}`], n: true, c: a => fmt(depInFy(a, CUR_FY)) }, { h: ["ค่าเสื่อมสะสม", "Accumulated"], n: true, c: a => fmt(assetDep(a).acc) }, { h: ["มูลค่าตามบัญชี", "Book value"], n: true, c: a => fmt(assetDep(a).nbv) }],
  fields: () => [], create: null, edit: null,
  view: a => { const d = assetDep(a), t = assetType(a.cat), life = t.life * 12, end = ymAdd(a.acq.slice(0, 7), life - 1);
    return kv([[L("เลขครุภัณฑ์", "Asset no."), esc(a.tag)], [L("ประเภท (รหัสกรมบัญชีกลาง ตัวอย่าง)", "Type (CGD code, sample)"), `${esc(typeLabel(a.cat))} · ${esc(t.cgd || "–")}`], [L("ราคาทุน", "Cost"), baht(a.cost)], [L("วันที่ได้มา (เริ่มคิดเดือนนี้)", "Acquired (depreciation starts this month)"), fdate(a.acq)],
      d.low ? [L("ผลการพิจารณา", "Result"), L(`ราคาต่ำกว่า ${fmt(ASSET_LOW)} บาท รับรู้เป็นค่าใช้จ่ายทั้งจำนวนในปีที่ซื้อ แต่คุมไว้ในทะเบียน`, `Under ${fmt(ASSET_LOW)} baht: expensed in full in the year bought, still controlled in the register`)] : null,
      !d.low && [L("อายุใช้งาน", "Useful life"), `${t.life} ${L("ปี", "yr")} = ${life} ${L("เดือน", "months")} (${L("ช่วง", "range")} ${t.lifeMin}-${t.lifeMax})`], !d.low && [L("อัตราค่าเสื่อม", "Rate"), `${rateOf(t.life)}% ${L("ต่อปี", "a year")} (${L("ช่วง", "range")} ${t.rateMin}-${t.rateMax}%)`],
      !d.low && [L("วิธีคำนวณ", "How it is worked out"), `(${fmt(a.cost)} − 1) ÷ ${life} = <b>${fmt(d.monthly, 2)}</b> ${L("บาท/เดือน", "baht a month")}<div class="sub">${L("ราคาซาก 1 บาท คงเหลือไว้ในปีสุดท้าย เพื่อควบคุมและตรวจสอบ", "A salvage value of 1 baht stays on the books in the last year for control")}</div>`],
      !d.low && [L("คิดไปแล้ว", "Charged so far"), `${d.months} ${L("เดือน", "months")} · ${baht(d.acc)}`], !d.low && [L("ครบอายุเดือน", "Fully depreciated in"), end], [L("มูลค่าตามบัญชี", "Book value"), `<b>${baht(d.nbv)}</b>`]]); },
  tabs: a => { const sc = depSchedule(a); return [["fy", L("ค่าเสื่อมรายปีงบประมาณ", "By fiscal year"), sc.length ? `<div class="tbl-wrap"><table><thead><tr><th>${L("ปีงบประมาณ", "FY")}</th><th class="n">${L("ค่าเสื่อม", "Charge")}</th><th class="n">${L("สะสม", "Accumulated")}</th><th class="n">${L("คงเหลือ", "Book value")}</th></tr></thead><tbody>${sc.map(r => `<tr ${r.fy === CUR_FY ? 'style="background:var(--bg)"' : ""}><td>${r.fy}</td><td class="n">${fmt(r.charge)}</td><td class="n">${fmt(r.acc)}</td><td class="n">${fmt(r.nbv)}</td></tr>`).join("")}</tbody></table></div>` : `<span class="sub">${L("ไม่คิดค่าเสื่อม", "Not depreciated")}</span>`]]; },
});
ePageDef("assets", "as-depreg", "A7", "asp", AS_ROLES, ["ทะเบียนค่าเสื่อมราคา", "Depreciation register"], () => {
  const A = (S.assets || []).filter(a => a.status !== "cancelled" && a.status !== "pending" && asVisible(a)), run = A.filter(a => depState(a) === "run"), n = k => A.filter(a => depState(a) === k).length;
  return `${eHead(AS_APP, "A7", ["ทะเบียนค่าเสื่อมราคา", "Depreciation register"], ["ค่าเสื่อมรายตัวตามหลักเกณฑ์กรมบัญชีกลาง · คำนวณและบันทึกในระบบ GF จริง หน้านี้ใช้ตรวจเทียบเท่านั้น · ข้อมูลตัวอย่าง", "Per-asset depreciation by the CGD rules · the real calculation and booking sit in the GF system, this page is for checking only · sample data"])}
    ${eKpis([[L("กำลังคิดค่าเสื่อม", "Depreciating"), run.length], [L("ค่าเสื่อมต่อเดือน", "Monthly charge"), fmt(run.reduce((s, a) => s + assetDep(a).monthly, 0)), L("บาท", "baht")], [`${L("ค่าเสื่อมปีงบ", "Charge FY")} ${CUR_FY}`, mb(A.reduce((s, a) => s + depInFy(a, CUR_FY), 0)), L("ล้านบาท", "M baht")], [L("ครบอายุ ยังใช้งาน", "Fully depreciated, in use"), n("full"), "", n("full") > 0], [L("ต่ำกว่าเกณฑ์ ไม่คิด", "Below limit"), n("low")]])}
    <section class="panel"><header><h2>${L("หลักเกณฑ์ที่ใช้ (หนังสือกรมบัญชีกลาง ที่ กค 0423.3/ว 238 ลงวันที่ 4 กันยายน 2557)", "Rules applied (CGD letter ที่ กค 0423.3/ว 238 of 4 Sep 2014)")}</h2></header><div class="body"><ol style="margin:0;padding-left:18px;line-height:1.7">
      <li>${L("วิธีเส้นตรง: ราคาทุน หารด้วยอายุการใช้งาน หักตามระยะเวลาที่ได้สินทรัพย์มาในแต่ละรอบบัญชี", "Straight line: cost divided by useful life, charged for the period held in each accounting period")}</li>
      <li>${L("ราคาทุน = ราคาซื้อ รวมภาษีนำเข้า ภาษีซื้อที่เรียกคืนไม่ได้ และต้นทุนทางตรงอื่นที่ทำให้พร้อมใช้งาน · ได้รับบริจาคให้ใช้ราคาที่ผู้ให้ระบุ ถ้าไม่ระบุใช้ราคาตลาด ณ วันที่ได้รับ", "Cost = price plus import duty, non-refundable purchase tax and direct costs to make it ready · donated: the donor's price, else market price on the day received")}</li>
      <li>${L("ไม่กำหนดราคาซาก แต่คงเหลือราคาตามบัญชี 1 บาทในปีสุดท้ายที่คำนวณค่าเสื่อมราคา", "No salvage value is set, but 1 baht stays on the books in the last year")}</li>
      <li>${L(`ราคาต่อหน่วยหรือต่อชุดต่ำกว่า ${fmt(ASSET_LOW)} บาท รับรู้เป็นค่าใช้จ่ายทั้งจำนวนในปีที่ซื้อ ไม่บันทึกเป็นสินทรัพย์ แต่ต้องคุมไว้ในทะเบียนทรัพย์สินทุกรายการ`, `Under ${fmt(ASSET_LOW)} baht per unit or set: expensed in full in the year bought, not booked as an asset, but still controlled in the register`)}</li>
      <li>${L("ประเภทสินทรัพย์ อายุการใช้งาน และอัตราค่าเสื่อมราคา ให้เป็นไปตามตารางที่ 1 (ดูที่ A8) ใช้ดุลยพินิจเลือกอายุในช่วงต่ำสุด-สูงสุด", "Types, lives and rates follow table 1 (see A8); the agency chooses a life within the minimum-maximum range")}</li>
      <li>${L("ใช้กับสินทรัพย์ที่ได้มาตั้งแต่ปีงบประมาณ 2558 เป็นต้นไป", "Applies to assets acquired from budget year 2558 (2015) on")}</li></ol></div></section>
    ${crudList("adep", { head: `<h2>${L("รายการค่าเสื่อมรายตัว", "Per-asset depreciation")}</h2>`, empty: L("ยังไม่มีรายการ", "Nothing yet") })}`;
});
