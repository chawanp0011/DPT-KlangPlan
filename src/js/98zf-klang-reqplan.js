// Fisko-KlangFinance, budget round Q4b (12 Nov 2569): area with coordinates, the reference price register, and the
// monthly spending plan with monthly status and results on the budget request.
//  - Area (C2 item 8): a request lists one or more places, each with province, district, sub-district and a latitude and
//    longitude. The coordinates are looked up in an area table (page BQ4, kept by Planning) when the three names match a row,
//    and can be typed by hand when they do not. NOTHING is looked up outside the prototype: the table holds ten rows of mine
//    with rough coordinates, marked as samples, so replace them with the real list.
//  - Reference price register (C2 item 9): the standard price list the request lines already used (S.prices, the same rule
//    BR-05) is now a register page in the budget app (BQ5) with source, valid-from and valid-to dates; Planning, Finance and
//    administrators edit it. A retired price, or one past its valid-to date, no longer applies on request lines.
//  - Monthly plan (C2 items 11 and 13): on the plan tab of a request, twelve months (Oct to Sep) of planned spending, a
//    status per month, and results per month once the Budget Bureau has approved an amount. The plan can be edited after the
//    approved amount arrives and is checked against the approved amount (or the asked amount before). It does not replace the
//    quarterly plan or the Project ID plan (PL1); it sits beside them. Results typed here are not the same store as PL2.
// Who edits: the division edits its own request while it is a draft or returned; after the Bureau's amount is recorded the
// owning division and Planning can edit the monthly plan and enter results (my assumption, to confirm).
const RQP_APP = "DPT Budget";
const RQP_MON = [["ต.ค.", "Oct"], ["พ.ย.", "Nov"], ["ธ.ค.", "Dec"], ["ม.ค.", "Jan"], ["ก.พ.", "Feb"], ["มี.ค.", "Mar"], ["เม.ย.", "Apr"], ["พ.ค.", "May"], ["มิ.ย.", "Jun"], ["ก.ค.", "Jul"], ["ส.ค.", "Aug"], ["ก.ย.", "Sep"]];
const RQP_ST = [["", ["—", "—"]], ["wait", ["ยังไม่เริ่ม", "Not started"]], ["run", ["กำลังดำเนินการ", "In progress"]], ["done", ["แล้วเสร็จ", "Done"]], ["late", ["ล่าช้า", "Late"]]];
const RQP_LAT = [5.5, 20.5], RQP_LNG = [97.3, 105.7]; // rough bounds of Thailand, used only to warn about a typo
const rqpOwn = r => ROLE === "plan" || (typeof unitRole === "function" && unitRole() && r.unit === me().unit);
const geoKey = a => `${String(a.prov || "").trim()}|${String(a.dist || "").trim()}|${String(a.sub || "").trim()}`;
const geoFind = a => (S.geo || []).find(g => geoKey(g) === geoKey(a));
const geoBad = a => (a.lat !== "" && a.lat != null && !(a.lat >= RQP_LAT[0] && a.lat <= RQP_LAT[1])) || (a.lng !== "" && a.lng != null && !(a.lng >= RQP_LNG[0] && a.lng <= RQP_LNG[1]));

// ---------- reference price register: valid dates and source ----------
const RP_KIND = { std: ["ราคามาตรฐาน", "Standard price"], ns: ["ราคานอกมาตรฐาน", "Outside the standard"] };
const RP_SRC = { std: ["บัญชีราคามาตรฐาน", "Standard price list"], egp: ["ราคากลางอิเล็กทรอนิกส์ e-GP", "e-GP electronic reference price"], quote: ["ใบเสนอราคา", "Quotation"], past: ["ราคาในสัญญาเดิม", "Price in a past contract"], other: ["อื่น ๆ", "Other"] };
const rpValid = p => !p.retired && !(p.exp && p.exp < TODAY) && !(p.eff && p.eff > TODAY);
{ stdPrice = it => { const nm = Array.isArray(it.name) ? it.name : [it.name, it.name]; return S.prices.find(p => rpValid(p) && (p.name.includes(nm[0]) || p.name.includes(nm[1]))); }; }
const rpCan = () => ["plan", "fin", "admin"].includes(ROLE);
const rpUsed = p => S.requests.some(r => r.items.some(it => it.sp ? it.sp === p.id : (() => { const nm = Array.isArray(it.name) ? it.name : [it.name, it.name]; return p.name.includes(nm[0]) || p.name.includes(nm[1]); })()));
CRUD.def("refPrice", {
  noun: ["ราคากลาง", "Reference price"], st: { live: [["ใช้ได้", "Valid"], "p-ok"], expired: [["หมดอายุ", "Expired"], "p-warn"], future: [["ยังไม่ถึงวันใช้", "Not yet valid"], "p-info"], retired: [["เลิกใช้", "Retired"], "p-mute"] },
  status: p => (p.retired ? "retired" : p.exp && p.exp < TODAY ? "expired" : p.eff && p.eff > TODAY ? "future" : "live"), gone: p => !!p.retired, id: p => p.id, title: p => tx(p.name), sub: p => `${fmt(p.price)} ${L("บาท /", "baht /")} ${tx(p.unit)}`,
  list: () => S.prices || [], search: p => `${p.id} ${p.name.join(" ")} ${p.doc || ""}`, filters: [{ id: "kind", label: ["ประเภทราคา", "Kind of price"], opts: () => Object.keys(RP_KIND).map(k => [k, tx(RP_KIND[k])]), get: p => p.kind || "std" }, { id: "src", label: ["แหล่งที่มา", "Source"], opts: () => Object.keys(RP_SRC).map(k => [k, tx(RP_SRC[k])]), get: p => p.src || "std" }],
  cols: [{ h: ["รหัส", "Code"], c: p => `<span class="mono">${p.id}</span>` }, { h: ["รายการ", "Item"], c: p => esc(tx(p.name)) }, { h: ["ประเภทราคา", "Kind"], c: p => tag(tx(RP_KIND[p.kind || "std"]), (p.kind || "std") === "std" ? "p-ok" : "p-warn") }, { h: ["หน่วย", "Unit"], c: p => `<span class="sub">${tx(p.unit)}</span>` }, { h: ["ราคา (บาท)", "Price (baht)"], n: true, c: p => fmt(p.price) },
    { h: ["แหล่งที่มา", "Source"], c: p => `<span class="sub">${esc(tx(RP_SRC[p.src || "std"]))}</span>` }, { h: ["ใช้ได้", "Valid"], c: p => `<span class="sub">${p.eff ? fdate(p.eff) : "–"} → ${p.exp ? fdate(p.exp) : "–"}</span>` }],
  fields: p => [{ id: "th", label: ["รายการ", "Item"], req: true, wide: true, value: p ? p.name[0] : "" }, { id: "en", label: ["ชื่อภาษาอังกฤษ", "English name"], wide: true, value: p ? p.name[1] : "" },
    { id: "kind", label: ["ประเภทราคา", "Kind of price"], type: "select", req: true, value: p ? p.kind || "std" : "std", opts: Object.keys(RP_KIND).map(k => [k, tx(RP_KIND[k])]) },
    { id: "type", label: ["งบรายจ่าย", "Budget type"], type: "select", req: true, value: p ? p.type : "inv", opts: typeOpts() }, { id: "unit", label: ["หน่วยนับ", "Unit"], req: true, value: p ? p.unit[0] : "" },
    { id: "price", label: ["ราคากลาง (บาท)", "Reference price (baht)"], type: "number", req: true, min: 0, value: p ? p.price : "" },
    { id: "src", label: ["แหล่งที่มา", "Source"], type: "select", req: true, value: p ? p.src || "std" : "std", opts: Object.keys(RP_SRC).map(k => [k, tx(RP_SRC[k])]) },
    { id: "eff", label: ["ใช้ได้ตั้งแต่", "Valid from"], type: "date", value: p ? p.eff || "" : TODAY }, { id: "exp", label: ["ใช้ได้ถึง (ว่าง = ไม่กำหนด)", "Valid to (blank = open)"], type: "date", value: p ? p.exp || "" : "" },
    { id: "doc", label: ["เอกสารอ้างอิง", "Reference document"], wide: true, value: p ? p.doc || "" : "" }],
  check: v => [...(v.eff && v.exp && v.exp < v.eff ? [{ f: "exp", m: L("วันสิ้นสุดต้องไม่ก่อนวันเริ่ม", "The end can't be before the start") }] : []), ...(v.kind === "ns" && !String(v.doc || "").trim() ? [{ f: "doc", m: L("ราคานอกมาตรฐานต้องระบุแหล่งที่มาในเอกสารอ้างอิง", "A price outside the standard needs its source in the reference document") }] : [])],
  create: { can: rpCan, label: ["เพิ่มราคากลาง", "Add a reference price"], run: v => { const p = { id: `SP-${String(maxNo(S.prices.map(x => x.id), /-(\d+)$/) + 1).padStart(3, "0")}`, kind: v.kind || "std", type: v.type, name: [v.th, v.en || v.th], unit: [v.unit, v.unit], price: Number(v.price), src: v.src, eff: v.eff || "", exp: v.exp || "", doc: v.doc || "" }; S.prices.push(p); audit(["เพิ่มราคากลาง", "Added a reference price"], `${p.id} ${v.th}`); return p; } },
  edit: { can: p => rpCan() && !p.retired, run: (p, v) => { const old = p.price; Object.assign(p, { kind: v.kind || "std", type: v.type, name: [v.th, v.en || v.th], unit: [v.unit, v.unit], price: Number(v.price), src: v.src, eff: v.eff || "", exp: v.exp || "", doc: v.doc || "" }); audit(["แก้ราคากลาง", "Changed a reference price"], `${p.id}: ${fmt(old)} → ${fmt(p.price)}`); } },
  acts: p => (rpCan() ? retireAct(["ราคากลาง", "reference price"], rpUsed, x => { S.prices = S.prices.filter(y => y !== x); })(p) : []),
  view: p => kv([[L("รหัส", "Code"), p.id], [L("ประเภทราคา", "Kind of price"), esc(tx(RP_KIND[p.kind || "std"]))], [L("งบรายจ่าย", "Budget type"), typeName(p.type)], [L("ราคากลาง", "Reference price"), `${fmt(p.price)} ${L("บาท /", "baht /")} ${tx(p.unit)}`], [L("แหล่งที่มา", "Source"), esc(tx(RP_SRC[p.src || "std"]))], [L("ใช้ได้", "Valid"), `${p.eff ? fdate(p.eff) : "–"} → ${p.exp ? fdate(p.exp) : "–"}`], [L("เอกสารอ้างอิง", "Reference"), esc(p.doc || "–")], [L("ใช้กับ", "Used by"), L("รายการงบประมาณในคำขอ และกฎ BR-05", "budget lines on requests and rule BR-05")]]),
});

// ---------- area table ----------
const geoCan = () => ROLE === "plan";
CRUD.def("geo", {
  noun: ["พื้นที่ (ตำบล อำเภอ จังหวัด)", "Area (sub-district, district, province)"], st: RET_ST, status: g => (g.retired ? "retired" : "live"), gone: g => !!g.retired, id: g => g.id, title: g => `${g.sub} · ${g.dist} · ${g.prov}`, sub: g => `${g.lat}, ${g.lng}`,
  list: () => S.geo || [], search: g => `${g.prov} ${g.dist} ${g.sub}`, filters: [{ id: "pv", label: ["จังหวัด", "Province"], opts: () => [...new Set((S.geo || []).map(g => g.prov))].map(p => [p, p]), get: g => g.prov }],
  cols: [{ h: ["จังหวัด", "Province"], c: g => esc(g.prov) }, { h: ["อำเภอ/เขต", "District"], c: g => esc(g.dist) }, { h: ["ตำบล/แขวง", "Sub-district"], c: g => esc(g.sub) }, { h: ["ละติจูด", "Latitude"], n: true, c: g => g.lat }, { h: ["ลองจิจูด", "Longitude"], n: true, c: g => g.lng },
    { h: ["ใช้ในคำขอ", "Used by"], n: true, c: g => S.requests.filter(r => r.cls && (r.cls.areas || []).some(a => geoKey(a) === geoKey(g))).length }],
  fields: g => [{ id: "prov", label: ["จังหวัด", "Province"], req: true, value: g ? g.prov : "" }, { id: "dist", label: ["อำเภอ / เขต", "District"], req: true, value: g ? g.dist : "" }, { id: "sub", label: ["ตำบล / แขวง", "Sub-district"], req: true, value: g ? g.sub : "" },
    { id: "lat", label: ["ละติจูด", "Latitude"], type: "number", req: true, value: g ? g.lat : "", hint: L("เช่น 13.7788 (ประเทศไทยอยู่ราว 5.5 ถึง 20.5)", "e.g. 13.7788 (Thailand lies near 5.5 to 20.5)") }, { id: "lng", label: ["ลองจิจูด", "Longitude"], type: "number", req: true, value: g ? g.lng : "", hint: L("เช่น 100.5206 (ราว 97.3 ถึง 105.7)", "e.g. 100.5206 (near 97.3 to 105.7)") }],
  check: (v, g) => { const out = []; if (v.lat !== "" && !(Number(v.lat) >= RQP_LAT[0] && Number(v.lat) <= RQP_LAT[1])) out.push({ f: "lat", m: L("ละติจูดอยู่นอกประเทศไทย", "Latitude is outside Thailand") }); if (v.lng !== "" && !(Number(v.lng) >= RQP_LNG[0] && Number(v.lng) <= RQP_LNG[1])) out.push({ f: "lng", m: L("ลองจิจูดอยู่นอกประเทศไทย", "Longitude is outside Thailand") });
    if ((S.geo || []).some(x => x !== g && geoKey(x) === geoKey(v))) out.push({ f: "sub", m: L("พื้นที่นี้มีอยู่แล้ว", "That area exists") }); return out; },
  create: { can: geoCan, label: ["เพิ่มพื้นที่", "Add an area"], run: v => { const g = { id: `GE-${String(maxNo(S.geo.map(x => x.id), /-(\d+)$/) + 1).padStart(3, "0")}`, prov: v.prov.trim(), dist: v.dist.trim(), sub: v.sub.trim(), lat: Number(v.lat), lng: Number(v.lng) }; S.geo.push(g); audit(["เพิ่มพื้นที่", "Added an area"], `${g.id} ${g.sub}`); return g; } },
  edit: { can: g => geoCan() && !g.retired, run: (g, v) => { Object.assign(g, { prov: v.prov.trim(), dist: v.dist.trim(), sub: v.sub.trim(), lat: Number(v.lat), lng: Number(v.lng) }); audit(["แก้พื้นที่", "Changed an area"], g.id); } },
  acts: g => (geoCan() ? retireAct(["พื้นที่", "area"], x => S.requests.some(r => r.cls && (r.cls.areas || []).some(a => geoKey(a) === geoKey(x))), x => { S.geo = S.geo.filter(y => y !== x); })(g) : []),
  view: g => kv([[L("จังหวัด", "Province"), esc(g.prov)], [L("อำเภอ/เขต", "District"), esc(g.dist)], [L("ตำบล/แขวง", "Sub-district"), esc(g.sub)], [L("พิกัด", "Coordinates"), `${g.lat}, ${g.lng}`]]),
});

// ---------- area panel on the main tab of a request ----------
function rqAreaPanel(r, ed) {
  const c = rqCls(r), ds = ed ? "" : "disabled", A = (c.areas = c.areas || []), geo = (S.geo || []).filter(g => !g.retired), provs = [...new Set(geo.map(g => g.prov))];
  return `<section class="panel" id="rq-area"><header><h2>${L("พื้นที่ดำเนินงาน", "Area of the work")}</h2><span class="sp"></span><span class="sub">${L("ตำบล อำเภอ จังหวัด และพิกัด (ตารางพื้นที่ที่ BQ4)", "Sub-district, district, province and coordinates (area table on BQ4)")}</span></header><div class="body">
    <datalist id="ar-dl-p">${provs.map(p => `<option value="${esc(p)}">`).join("")}</datalist>
    ${A.map((a, i) => `<datalist id="ar-dl-d-${i}">${[...new Set(geo.filter(g => !a.prov || g.prov === a.prov).map(g => g.dist))].map(d => `<option value="${esc(d)}">`).join("")}</datalist><datalist id="ar-dl-s-${i}">${[...new Set(geo.filter(g => (!a.prov || g.prov === a.prov) && (!a.dist || g.dist === a.dist)).map(g => g.sub))].map(d => `<option value="${esc(d)}">`).join("")}</datalist>
      <div class="row" style="flex-wrap:wrap;margin-bottom:8px"><input type="text" list="ar-dl-p" id="ar-p-${i}" value="${esc(a.prov || "")}" placeholder="${L("จังหวัด", "Province")}" style="max-width:160px" ${ds}><input type="text" list="ar-dl-d-${i}" id="ar-d-${i}" value="${esc(a.dist || "")}" placeholder="${L("อำเภอ/เขต", "District")}" style="max-width:160px" ${ds}><input type="text" list="ar-dl-s-${i}" id="ar-s-${i}" value="${esc(a.sub || "")}" placeholder="${L("ตำบล/แขวง", "Sub-district")}" style="max-width:160px" ${ds}>
        <input type="number" step="0.0001" id="ar-la-${i}" value="${a.lat === "" || a.lat == null ? "" : a.lat}" placeholder="${L("ละติจูด", "Latitude")}" style="max-width:120px" ${ds}><input type="number" step="0.0001" id="ar-lo-${i}" value="${a.lng === "" || a.lng == null ? "" : a.lng}" placeholder="${L("ลองจิจูด", "Longitude")}" style="max-width:120px" ${ds}>
        ${geoFind(a) ? tag(L("พบในตาราง", "In the table"), "p-ok") : a.sub ? tag(L("ไม่พบในตาราง พิมพ์พิกัดเอง", "Not in the table; type the coordinates"), "p-mute") : ""}${geoBad(a) ? tag(L("พิกัดอยู่นอกประเทศไทย", "Outside Thailand"), "p-bad") : ""}${ed ? `<button class="btn ghost" type="button" id="ar-x-${i}" aria-label="${L("ลบพื้นที่", "Remove the area")}">×</button>` : ""}</div>`).join("") || `<span class="sub">${L("ยังไม่ระบุพื้นที่", "No area given")}</span>`}
    ${ed ? `<div class="row"><button class="btn" type="button" id="ar-add">+ ${L("เพิ่มพื้นที่", "Add an area")}</button><span class="sub">${L("เลือกจากรายการหรือพิมพ์เอง ถ้าชื่อตรงกับตารางพื้นที่ ระบบใส่พิกัดให้ ต้นแบบไม่ได้ค้นพิกัดจากแหล่งภายนอก", "Pick from the list or type; if the names match the area table the coordinates fill in. The prototype looks nothing up outside")}</span></div>` : ""}</div></section>`;
}
function rqAreaBind(r, ed) {
  if (!ed) return; const c = rqCls(r), A = (c.areas = c.areas || []), g = id => document.querySelector(id), re = () => { save(); route(); };
  A.forEach((a, i) => {
    const fill = () => { const f = geoFind(a); if (f && !a.manual) { a.lat = f.lat; a.lng = f.lng; } re(); };
    ["p:prov", "d:dist", "s:sub"].forEach(k => { const [id, f] = k.split(":"), el = g(`#ar-${id}-${i}`); if (el) el.onchange = e => { a[f] = e.target.value.trim(); fill(); }; });
    const la = g("#ar-la-" + i), lo = g("#ar-lo-" + i); if (la) la.onchange = e => { a.lat = e.target.value === "" ? "" : Number(e.target.value); a.manual = true; re(); }; if (lo) lo.onchange = e => { a.lng = e.target.value === "" ? "" : Number(e.target.value); a.manual = true; re(); };
    const x = g("#ar-x-" + i); if (x) x.onclick = () => { A.splice(i, 1); re(); };
  });
  const add = g("#ar-add"); if (add) add.onclick = () => { A.push({ prov: "", dist: "", sub: "", lat: "", lng: "" }); re(); };
}
{
  const base = VIEWS.request;
  VIEWS.request = () => { let html = base(); const r = curReq(); if (!r || REQ_TAB !== "main") return html; const marker = `<section class="panel"><header><h2>${L("รายการงบประมาณ", "Budget lines")}</h2>`, at = html.indexOf(marker); return at >= 0 ? html.slice(0, at) + rqAreaPanel(r, editable(r)) + html.slice(at) : html; };
  const bb = BIND.request; BIND.request = () => { bb(); const r = curReq(); if (r && REQ_TAB === "main") rqAreaBind(r, editable(r)); };
  const ck = checks; checks = r => { const out = ck(r); if (rqNature(r) === "inv") { const A = (rqCls(r).areas || []); out.push({ s: A.length && A.every(a => a.sub && a.lat !== "" && a.lat != null) ? "ok" : "wa", title: L("พื้นที่ดำเนินงาน", "Area of the work"), d: A.length ? L("ระบุแล้ว", "Given") : L("งบลงทุน ยังไม่ระบุพื้นที่และพิกัด", "Investment: no area and coordinates yet"), id: null }); } return out; };
}

// ---------- monthly plan, status and results on the plan tab ----------
const rqTarget = r => (typeof actAmount === "function" && actAmount(r) != null ? actAmount(r) : reqAmount(r));
const rqMSum = (a, n) => (a || []).slice(0, n || 12).reduce((s, v) => s + (Number(v) || 0), 0);
function rqMonthFill(r, how) {
  const t = rqTarget(r), m = Array(12).fill(0);
  if (how === "even") { const e = Math.floor(t / 12 / 1000) * 1000; m.fill(e); m[11] += t - e * 12; }
  else if (how === "quarter") { const q = r.qplan || [0, 0, 0, 0]; for (let i = 0; i < 4; i++) { const e = Math.floor((Number(q[i]) || 0) / 3 / 1000) * 1000; for (let k = 0; k < 3; k++) m[i * 3 + k] = e; m[i * 3 + 2] += (Number(q[i]) || 0) - e * 3; } }
  else if (how === "scale") { const s = rqMSum(r.mplan); if (!(s > 0)) return null; r.mplan.forEach((v, i) => (m[i] = Math.round((Number(v) || 0) * t / s / 1000) * 1000)); const last = m.map((v, i) => (v > 0 ? i : -1)).filter(i => i >= 0).pop(); m[last] += t - rqMSum(m); }
  return m;
}
const rqpMonthRights = r => { const ed = editable(r), appr = typeof actAmount === "function" && actAmount(r) != null; return { plan: ed || (appr && rqpOwn(r)), res: appr && rqpOwn(r), appr }; };
{
  const base = REQ_PANELS.plan, bind = REQ_BIND.plan;
  REQ_PANELS.plan = (r, ed) => base(r, ed) + rqMonthPanel(r);
  REQ_BIND.plan = rr => { if (bind) bind(rr); rqMonthBind(rr); };
}
function rqMonthPanel(r) {
  const R = rqpMonthRights(r), mp = (r.mplan = r.mplan || Array(12).fill(0)), ms = (r.mstat = r.mstat || Array(12).fill("")), mr = (r.mres = r.mres || Array(12).fill(null)), t = rqTarget(r), tot = rqMSum(mp), diff = t - tot, res = rqMSum(mr), months = fyMonths(FORM_FY);
  const dp = R.plan ? "" : "disabled", dr = R.res ? "" : "disabled", q = r.qplan || null; let cp = 0, cr = 0;
  const qdiff = q ? [0, 1, 2, 3].map(i => rqMSum(mp.slice(i * 3, i * 3 + 3)) - (Number(q[i]) || 0)) : [];
  return `<section class="panel" id="rq-month"><header><h2>${L("แผนค่าใช้จ่ายรายเดือน สถานะ และผล", "Monthly spending plan, status and results")}</h2><span class="sp"></span>${tag(Math.abs(diff) < 1 && tot > 0 ? L("แผนรวมเท่ายอด", "Plan equals the amount") : tot === 0 ? L("ยังไม่กรอก", "Not filled") : `${diff > 0 ? L("ขาด", "Short") : L("เกิน", "Over")} ${fmt(Math.abs(diff))}`, Math.abs(diff) < 1 && tot > 0 ? "p-ok" : "p-warn")}</header>
    <div class="body" style="display:flex;flex-direction:column;gap:10px"><p class="sub" style="margin:0">${R.appr ? L("ยอดอ้างอิงคือยอดที่ได้รับอนุมัติ", "The reference is the amount the Bureau approved") : L("ยอดอ้างอิงคือยอดที่ขอ", "The reference is the amount asked")}: <b>${fmt(t)}</b> ${L("บาท", "baht")} · ${L("ผลเบิกจ่ายกรอกได้เมื่อได้รับยอดอนุมัติแล้ว", "results can be entered once the Bureau's amount is recorded")}</p>
    <div class="tbl-wrap"><table><thead><tr><th>${L("เดือน", "Month")}</th><th class="n" style="width:170px">${L("แผน (บาท)", "Plan (baht)")}</th><th>${L("สถานะดำเนินงาน", "Work status")}</th><th class="n" style="width:170px">${L("ผล (บาท)", "Result (baht)")}</th><th class="n">${L("แผนสะสม", "Plan, cumulative")}</th><th class="n">${L("ผลสะสม", "Result, cumulative")}</th></tr></thead>
      <tbody>${months.map((ym, i) => { cp += Number(mp[i]) || 0; cr += Number(mr[i]) || 0; return `<tr><td>${esc(RQP_MON[i][0])} <span class="sub">${ym}</span></td><td class="n"><input type="number" min="0" step="1000" data-mp="${i}" value="${Number(mp[i]) || 0}" ${dp} aria-label="${L("แผนเดือน", "Plan, month")} ${i + 1}"></td>
        <td><select data-ms="${i}" ${dp} aria-label="${L("สถานะเดือน", "Status, month")} ${i + 1}">${RQP_ST.map(([k, l]) => `<option value="${k}" ${ms[i] === k ? "selected" : ""}>${esc(tx(l))}</option>`).join("")}</select></td>
        <td class="n"><input type="number" min="0" step="1" data-mr="${i}" value="${mr[i] == null ? "" : mr[i]}" ${dr} aria-label="${L("ผลเดือน", "Result, month")} ${i + 1}"></td><td class="n">${fmt(cp)}</td><td class="n">${mr[i] == null && cr === 0 ? "–" : fmt(cr)}</td></tr>`; }).join("")}</tbody>
      <tfoot><tr><td>${L("รวม", "Total")}</td><td class="n">${fmt(tot)}</td><td></td><td class="n">${fmt(res)}</td><td class="n" colspan="2">${t ? `${L("ผลต่อยอดอ้างอิง", "Result vs reference")} ${fmt((res / t) * 100, 1)}%` : ""}</td></tr></tfoot></table></div>
    ${q && qdiff.some(x => Math.abs(x) >= 1) ? `<span class="hint" style="color:var(--warn)">${L("ผลรวมรายเดือนของบางไตรมาสไม่ตรงแผนรายไตรมาส", "Some quarters' monthly totals differ from the quarterly plan")}: ${qdiff.map((x, i) => (Math.abs(x) >= 1 ? `Q${i + 1} ${x > 0 ? "+" : ""}${fmt(x)}` : "")).filter(Boolean).join(", ")}</span>` : ""}
    ${R.plan ? `<div class="row" style="flex-wrap:wrap"><button class="btn" type="button" id="mp-q" ${q ? "" : "disabled"}>${L("กระจายตามแผนรายไตรมาส", "Spread the quarterly plan")}</button><button class="btn" type="button" id="mp-even">${L("กระจายเท่ากัน", "Spread evenly")}</button><button class="btn" type="button" id="mp-scale" ${tot > 0 ? "" : "disabled"}>${L("ปรับให้เท่ายอดอ้างอิง", "Scale to the reference amount")}</button><button class="btn ghost" type="button" id="mp-clr">${L("ล้างแผน", "Clear")}</button></div>` : ""}
    <span class="sub">${L("แผนรายเดือนนี้อยู่ข้างแผนรายไตรมาสและแผนรายรหัสโครงการ (PL1) ไม่แทนที่ และผลที่กรอกที่นี่ไม่ใช่ที่เดียวกับผลเบิกจ่าย PL2", "This monthly plan sits beside the quarterly plan and the Project ID plan (PL1); the results typed here are not the same store as PL2")}</span></div></section>`;
}
function rqMonthBind(r) {
  const R = rqpMonthRights(r), q = s => document.querySelectorAll(s), re = () => { save(); route(); };
  q("[data-mp]").forEach(i => (i.onchange = () => { if (!R.plan) return; r.mplan[i.dataset.mp] = Math.max(0, Number(i.value) || 0); re(); }));
  q("[data-ms]").forEach(i => (i.onchange = () => { if (!R.plan) return; r.mstat[i.dataset.ms] = i.value; re(); }));
  q("[data-mr]").forEach(i => (i.onchange = () => { if (!R.res) return; const v = i.value === "" ? null : Math.max(0, Number(i.value) || 0), old = r.mres[i.dataset.mr]; r.mres[i.dataset.mr] = v; if (rqMSum(r.mres) > rqTarget(r)) { r.mres[i.dataset.mr] = old; toast(L("ผลรวมเกินยอดอ้างอิง", "The results total is above the reference amount")); route(); return; } re(); }));
  const fill = (id, how, label) => { const b = document.querySelector(id); if (b) b.onclick = () => { const m = rqMonthFill(r, how); if (!m) return; r.mplan = m; audit([`${label[0]}แผนรายเดือน`, `${label[1]} the monthly plan`], r.id); commit(); route(); }; };
  fill("#mp-q", "quarter", ["กระจายตามไตรมาส", "Spread by quarter,"]); fill("#mp-even", "even", ["กระจายเท่ากัน", "Spread evenly,"]); fill("#mp-scale", "scale", ["ปรับให้เท่ายอด", "Scaled to the amount,"]);
  const c = document.querySelector("#mp-clr"); if (c) c.onclick = () => { r.mplan = Array(12).fill(0); audit(["ล้างแผนรายเดือน", "Cleared the monthly plan"], r.id); commit(); route(); };
}
{ const ck = checks; checks = r => { const out = ck(r); if (rqMSum(r.mplan) > 0) { const d = rqTarget(r) - rqMSum(r.mplan); out.push({ s: Math.abs(d) < 1 ? "ok" : "wa", title: L("แผนรายเดือน", "Monthly plan"), d: Math.abs(d) < 1 ? L("รวมเท่ายอดอ้างอิง", "Equals the reference amount") : `${d > 0 ? L("ขาด", "Short") : L("เกิน", "Over")} ${fmt(Math.abs(d))}`, id: null }); } return out; }; }

// ---------- seed ----------
Object.keys(SEEDS).forEach(k => {
  const prev = SEEDS[k].seed;
  SEEDS[k].seed = () => {
    const s = prev(), g = (id, prov, dist, sub, lat, lng) => ({ id, prov, dist, sub, lat, lng });
    // rough coordinates of mine, not official data
    s.geo = [g("GE-001", "กรุงเทพมหานคร", "ดุสิต", "ดุสิต", 13.7788, 100.5206), g("GE-002", "กรุงเทพมหานคร", "จตุจักร", "ลาดยาว", 13.823, 100.56), g("GE-003", "นนทบุรี", "เมืองนนทบุรี", "บางกระสอ", 13.86, 100.515), g("GE-004", "ปทุมธานี", "คลองหลวง", "คลองหนึ่ง", 14.069, 100.613), g("GE-005", "เชียงใหม่", "เมืองเชียงใหม่", "ศรีภูมิ", 18.796, 98.993),
      g("GE-006", "ขอนแก่น", "เมืองขอนแก่น", "ในเมือง", 16.432, 102.833), g("GE-007", "สงขลา", "หาดใหญ่", "หาดใหญ่", 7.008, 100.474), g("GE-008", "ภูเก็ต", "เมืองภูเก็ต", "ตลาดใหญ่", 7.883, 98.388), g("GE-009", "นครราชสีมา", "เมืองนครราชสีมา", "ในเมือง", 14.974, 102.098), g("GE-010", "อุบลราชธานี", "เมืองอุบลราชธานี", "ในเมือง", 15.244, 104.847)];
    (s.prices || []).forEach(p => { if (!p.src) { p.src = "std"; p.eff = "2026-10-01"; p.exp = ""; p.doc = ""; } });
    return s;
  };
});

// ---------- pages ----------
const rqpBar = can => `<div class="row" style="margin:0 0 12px">${can ? tag(L("ท่านแก้ไขได้", "You can edit"), "p-info") : tag(L("ดูอย่างเดียว", "View only"), "p-mute")}</div>`;
ePageDef("budget", "bq-geo", "BQ4", "form", KROLES, ["ตารางพื้นที่", "Area table"], () => `${eHead(RQP_APP, "BQ4", ["ตารางพื้นที่และพิกัด", "Area table with coordinates"], ["ฟอร์มคำขอเลือกหรือพิมพ์ ตำบล อำเภอ จังหวัด ถ้าชื่อตรงกับตารางนี้ ระบบใส่ละติจูดลองจิจูดให้ · กองแผนงานดูแล · ตารางเริ่มต้นมี 10 แถวเป็นตัวอย่างของผม พิกัดโดยประมาณ ไม่ใช่ข้อมูลทางการ ให้แทนด้วยรายการจริง ต้นแบบไม่ได้ค้นพิกัดจากแหล่งภายนอก", "The request form lets you pick or type sub-district, district and province; if the names match this table the coordinates fill in · Planning keeps it · the starting table has ten sample rows with rough coordinates, not official data; replace them · nothing is looked up outside"])}${rqpBar(geoCan())}${crudList("geo", { head: `<h2>${L("พื้นที่", "Areas")}</h2>` })}`);
ePageDef("budget", "bq-ref", "BQ5", "form", KROLES, ["ทะเบียนราคากลาง", "Reference price register"], () => `${eHead(RQP_APP, "BQ5", ["ทะเบียนราคากลาง", "Reference price register"], ["ราคากลางของรายการที่ใช้ในรายการงบประมาณของคำขอ (กฎ BR-05 เตือนเมื่อราคาสูงกว่า) พร้อมแหล่งที่มาและวันที่ใช้ได้ ราคาที่เลิกใช้หรือหมดอายุไม่ถูกใช้อ้างอิง · กองแผนงาน กองคลัง และผู้ดูแลระบบแก้ได้ · เป็นชุดเดียวกับบัญชีราคามาตรฐานในหน้าผู้ดูแลระบบ ไม่ได้ดึงจากระบบภายนอก", "Reference prices for the budget lines on requests (rule BR-05 warns above it) with source and valid dates; a retired or expired price is not used · Planning, Finance and administrators edit · the same list as the standard price list on the admin page; nothing is fetched from outside"])}${rqpBar(rpCan())}${crudList("refPrice", { head: `<h2>${L("ราคากลาง", "Reference prices")}</h2>` })}`);
Object.assign(NAV_ICON, { "bq-geo": "map", "bq-ref": "tag" });
