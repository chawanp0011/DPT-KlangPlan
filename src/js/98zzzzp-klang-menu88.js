// KlangFinance, round P88 (25 Nov 2569): the menus keep only what is used now (asked for: "ปรับเมนูให้เหลือแค่ที่ต้องใช้ก่อน
// โดยซ่อนเมนูที่ไม่จำเป็นออกไปก่อน"). Nothing is deleted: window.MENU_ALL = true (or m88All(true)) shows every menu again.
//   1. ระบบสิทธิ์และผู้ดูแลระบบ: ผู้ดูแลระบบ and the organisation app (positions and approval limits);
//   2. วางแผนและบริหารงบประมาณ: จัดเตรียมคำของบประมาณ, ทะเบียนโครงสร้างงบประมาณ, ติดตามความก้าวหน้า, แดชบอร์ดผู้บริหาร;
//   3. จัดซื้อจัดจ้าง: แผนจัดซื้อ, แผนเงิน, ขอจัดซื้อจัดจ้าง, บริหารงบประมาณ, ติดตามความก้าวหน้า, สัญญางบประมาณ, ผู้รับจ้าง/ผู้ขาย,
//      ติดตามการเบิกจ่าย, คลังเอกสาร, คณะกรรมการ;
//   4. สัญญาและข้อตกลง: as it is.
// Also in this file: ติดตามความก้าวหน้า (the tabs of the follow-up form, also inside procurement), the dashboard by ผลผลิต/โครงการ,
// the plan and result of payments by month and by quarter (ติดตามการเบิกจ่าย), a summary for decisions on the executive dashboard,
// the document library, and the Excel of the follow-up form in the layout of the revised form (แบบฟอร์มติดตามความก้าวหน้า
// ก_แก้ไข25112569: 67 columns, a row naming who fills each column: กองแผนงาน, สำนัก/กอง, e-GP, ทำสัญญา).

window.MENU_ALL = !!window.MENU_ALL;
const m88On = () => !window.MENU_ALL;
const M88 = { apps: ["org", "budget", "procurement", "contract"], bud: ["rmake", "dashboard", "od-dash"], budGroups: ["regg"], budHide: ["rg-mstrat", "rg-msvc", "rg-prog", "bq-money", "rg-acct"], // P99: hidden for now (asked 26 Nov 2569)
  proc: ["plan", "mplan", "reqn", "cases", "progress88", "contracts", "suppliers", "disb", "library"], procNav: ["procurement", "cm-reg", "cm-mem", "cm-meet", "cm-type", "cm-slot"],
  dq: "m", lib: { item: "", q: "", prev: null } };
const M88_APPS_ALL = APP_IDS.slice();
function m88NavShown(n) {
  if (!m88On() || !n) return true;
  if (n.app === "all") return n.id !== "flow";
  if (!M88.apps.includes(n.app)) return false;
  if (n.app === "budget") return !M88.budHide.includes(n.id) && (M88.bud.includes(n.id) || M88.budGroups.includes(n.group));
  if (n.app === "procurement") return M88.procNav.includes(n.id);
  return true;
}
function m88ApplyApps() { APP_IDS.splice(0, APP_IDS.length, ...(m88On() ? M88_APPS_ALL.filter(a => M88.apps.includes(a)) : M88_APPS_ALL)); }
m88ApplyApps();
function m88All(on) { window.MENU_ALL = !!on; m88ApplyApps(); if (typeof renderShell === "function" && typeof SESSION !== "undefined" && SESSION) { renderShell(); route(); } }
{ const base = ensureApp; ensureApp = function () { base(); if (!APP_IDS.includes(APP)) { const a = APP_IDS.find(appAllowed); if (a) APP = a; } }; }
{ const base = renderNav; renderNav = function () { m88ApplyApps(); base(); if (!m88On()) return; const nav = document.getElementById("nav"); if (!nav) return;
    nav.querySelectorAll("a[data-v]").forEach(a => { if (a.dataset.tab) return; const n = NAV.find(x => x.id === a.dataset.v); if (n && !m88NavShown(n)) a.remove(); });
    [...nav.children].reverse().forEach(el => { if (!el.classList.contains("nav-h")) return; const nx = el.nextElementSibling; if (!nx || nx.classList.contains("nav-h")) el.remove(); }); }; }

// labels that change only while the menus are trimmed (the full menu keeps its old names)
const m88Label = (o, th, en) => { const old = o.label; Object.defineProperty(o, "label", { configurable: true, get: () => (m88On() ? [th, en] : old), set: v => { Object.defineProperty(o, "label", { value: v, writable: true, configurable: true }); } }); };
{ const d = NAV.find(n => n.id === "dashboard"); if (d) m88Label(d, "ติดตามความก้าวหน้า", "Progress"); const r = NAV.find(n => n.id === "rmake"); if (r) m88Label(r, "จัดเตรียมคำของบประมาณ", "Prepare the budget request"); }
[["reqn", "ขอจัดซื้อจัดจ้าง", "Purchase requests"], ["cases", "บริหารงบประมาณ", "Budget management"], ["disb", "ติดตามการเบิกจ่าย", "Payment follow-up"], ["plan", "แผนจัดซื้อ", "Procurement plan"]].forEach(([id, th, en]) => { const p = prPage(id); if (p) m88Label(p, th, en); });

// ---------- the procurement pages: three new ones ----------
const M88_ROLES = ["proc", "prochead", "div", "divhead", "plan", "exec", "fin", "finhead", "audit", "admin", "vchk1", "vchk2", "acc"];
{ const at = id => PROC_PAGES.findIndex(p => p.id === id) + 1;
  PROC_PAGES.splice(at("plan"), 0, { id: "mplan", code: "P2M", group: "plan", label: ["แผนเงิน", "Money plan"], roles: M88_ROLES, sub: ["แผนการใช้จ่ายเงินรายเดือนของรายการงบประมาณ แยกจากรายการงบประมาณ", "The monthly money plan of the budget items, apart from the items"], tabs: [{ id: "main", key: "mplan", secs: ["mplan88"] }] });
  PROC_PAGES.splice(at("cases"), 0, { id: "progress88", code: "P4P", group: "run", label: ["ติดตามความก้าวหน้า", "Progress"], roles: M88_ROLES, sub: ["ภาพรวม รายการงบประมาณ รายงานความก้าวหน้า ขั้นตอนจัดซื้อจัดจ้าง และคาดการณ์สิ้นปี ตามฟอร์มติดตาม", "Overview, items, progress reports, procurement steps and the year-end forecast, by the follow-up form"], tabs: [{ id: "main", key: "progress88", secs: ["mon88"] }] });
  PROC_PAGES.splice(at("disb"), 0, { id: "library", code: "P7L", group: "con", label: ["คลังเอกสาร", "Document library"], roles: M88_ROLES, sub: ["เอกสารของแต่ละรายการงบประมาณ แยกโฟลเดอร์ตามประเภทเอกสาร เปิดดูและดาวน์โหลดได้", "The documents of each budget item, a folder per kind, to view and download"], tabs: [{ id: "main", key: "library", secs: ["lib88"] }] }); }
Object.assign(NAV_ICON, { mplan: "coins", progress88: "chart", library: "folder" });
const M88_G = { plan: ["วางแผนจัดซื้อ (กองแผนงาน)", "Planning"], run: ["จัดซื้อจัดจ้าง", "Procurement"], trk: ["ติดตาม", "Follow-up"], con: ["สัญญาและผู้ขาย", "Contracts and suppliers"], pay: ["เบิกจ่าย", "Payments"], doc: ["เอกสาร", "Documents"] };
const M88_GRP = { plan: M88_G.plan, mplan: M88_G.plan, reqn: M88_G.run, cases: M88_G.run, progress88: M88_G.trk, contracts: M88_G.con, suppliers: M88_G.con, disb: M88_G.pay, library: M88_G.doc };
{ const n = NAV.find(x => x.id === "procurement"), d = Object.getOwnPropertyDescriptor(n, "tabs"), g0 = d && d.get;
  if (g0) Object.defineProperty(n, "tabs", { configurable: true, get: () => { const all = g0(); if (!m88On()) return all; return M88.proc.map(id => all.find(t => t[0] === id)).filter(Boolean).map(t => [t[0], t[1], t[2], M88_GRP[t[0]] || t[3], t[4]]); } }); }
// the procurement app opens on the plan, not on "งานวันนี้" (hidden)
{ const base = procSet; procSet = function (v, keep) { const r = base(v, keep); if (m88On() && PROC_PAGE === "today" && String(v).split(":")[0] !== "today") { PROC_PAGE = "plan"; const T = prTabs(prPage("plan")); if (T[0]) { PROC_ST.plan = T[0].id; PROC_TAB = T[0].key; } } return PROC_TAB; }; }
if (m88On() && PROC_PAGE === "today") { const t = prPage("plan").tabs[0]; PROC_PAGE = "plan"; PROC_ST.plan = t.id; PROC_TAB = t.key; } // no procSet here: the data is not loaded yet

// ---------- ติดตามความก้าวหน้า: five tabs, in the budget app (#dashboard) and in procurement ----------
const M88_MT = [["track", "ภาพรวม"], ["tracklist", "รายการงบประมาณ"], ["progress", "รายงานความก้าวหน้า"], ["procure", "ขั้นตอนจัดซื้อจัดจ้าง"], ["forecast", "คาดการณ์สิ้นปี"]];
{ const pg = BUD_PAGES.find(p => p.id === "dashboard"); if (pg) { let all = pg.tabs;
    Object.defineProperty(pg, "tabs", { configurable: true, get: () => (m88On() ? M88_MT.map(([k, t]) => { const x = all.find(y => y.keys.includes(k)); return x ? Object.assign({}, x, { label: [t, t] }) : null; }).filter(Boolean) : all), set: v => (all = v) }); } }
PROC.mon88 = () => { if (!M88_MT.some(t => t[0] === MON_TAB)) MON_TAB = "track"; let body = "";
  try { body = MON_PANELS[MON_TAB](); } catch (e) { body = `<div class="sub">เปิดแท็บนี้ไม่ได้: ${esc(e && e.message)}</div>`; }
  const top = ["track", "tracklist"].includes(MON_TAB) && typeof tfTop === "function" ? tfTop(tfRows().all.length) : prFySel();
  return `<div class="tabs" role="tablist" style="margin:0 0 10px">${M88_MT.map(([k, t]) => `<button class="tab ${MON_TAB === k ? "on" : ""}" type="button" role="tab" aria-selected="${MON_TAB === k}" data-m88tab="${k}">${t}</button>`).join("")}</div>${top}${body}`; };
{ const b = BIND.procurement; BIND.procurement = function () { if (b) b.apply(this, arguments); if (PROC_PAGE === "progress88" && MON_BIND[MON_TAB]) try { MON_BIND[MON_TAB](); } catch (e) {} }; }

// the dashboard by ผลผลิต/โครงการ, and a filter on it in the list
const m88BiRows = () => (S.bi && S.bi.rows) || [];
const m88Prod = r => { if (r.prod) return r.prod; const b = m88BiRows().find(x => (r[4] && x.code === r[4]) || x.name === r[5]); return (b && ((b.pl && b.pl.prod) || b.prod)) || "—"; };
sptF.prod = ["ผลผลิต/โครงการ", m88Prod];
{ const base = sptOv; sptOv = function (rows) { const h = base(rows); return h.replace(/<\/div>\s*$/, `<section class="panel" style="grid-column:1/-1"><header><h2>ตามผลผลิต/โครงการ</h2><span class="sp"></span><span class="sub">คลิกเพื่อดูรายการ</span></header><div>${sptGroup(rows, "prod")}</div></section></div>`); }; }
{ const base = prTrackBook; prTrackBook = function (fy) { const book = base(fy), D = prDtRows(fy, false);
    book[0].rows.slice(5).forEach((row, i) => { const r = D[i]; if (!r) return; const b = m88BiRows().find(y => y.id === r.id); if (!b) return; const pl = b.pl || {};
      row.prod = pl.prod || b.prod || ""; if (pl.startY) row[1] = Number(pl.startY); if (pl.act) { row[2] = pl.act === "ตาม พ.ร.บ." ? "ตาม พ.ร.บ." : ""; row[3] = pl.act === "โอนเปลี่ยนแปลง" ? "โอนเปลี่ยนแปลง" : ""; }
      if (pl.years) row[9] = pl.years; if (pl.prov) row[10] = pl.prov; if (pl.total !== "" && pl.total != null) row[11] = Number(pl.total);
      if (pl.yrs) Object.entries(pl.yrs).forEach(([y, v]) => { const c = 12 + (Number(y) - 2563); if (c >= 12 && c <= 21 && v !== "" && v != null) row[c] = Number(v); });
      row[61] = row[11]; for (let j = 0; j < 10; j++) row[62 + j] = row[12 + j]; });
    return book; }; }

// ---------- ติดตามการเบิกจ่าย: plan and result by month and by quarter ----------
function m88PlanAct(fy) { const R = prDtRows(fy, false), p = Array(12).fill(0), a = Array(12).fill(0); R.forEach(r => { r.plan.forEach((v, i) => (p[i] += Number(v) || 0)); r.act.forEach((v, i) => (a[i] += Number(v) || 0)); }); return { p, a, R }; }
function m88PlanActPanel(fy) { const { p, a } = m88PlanAct(fy), q = M88.dq === "q", lab = q ? ["ไตรมาส 1 (ต.ค.-ธ.ค.)", "ไตรมาส 2 (ม.ค.-มี.ค.)", "ไตรมาส 3 (เม.ย.-มิ.ย.)", "ไตรมาส 4 (ก.ค.-ก.ย.)"] : BI_MON;
  const grp = arr => (q ? [0, 1, 2, 3].map(k => arr.slice(k * 3, k * 3 + 3).reduce((s, v) => s + v, 0)) : arr), P = grp(p), A = grp(a), tot = p.reduce((s, v) => s + v, 0), mx = Math.max(1, ...P, ...A);
  let cp = 0, ca = 0; const rows = lab.map((l, i) => { cp += P[i]; ca += A[i]; return `<tr><td>${l}</td><td class="n">${fmt(P[i])}</td><td class="n">${fmt(A[i])}</td><td class="n">${fmt(A[i] - P[i])}</td><td class="n">${fmt(cp)}</td><td class="n">${fmt(ca)}</td><td class="n">${cp ? fmt((ca / cp) * 100, 1) + "%" : "–"}</td><td class="n">${tot ? fmt((ca / tot) * 100, 1) + "%" : "–"}</td></tr>`; }).join("");
  const bars = lab.map((l, i) => `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px"><div style="display:flex;gap:2px;align-items:flex-end;height:110px"><i title="แผน ${fmt(P[i])}" style="display:block;width:10px;height:${Math.round((P[i] / mx) * 105)}px;background:var(--muted);opacity:.55;border-radius:2px 2px 0 0"></i><i title="ผล ${fmt(A[i])}" style="display:block;width:10px;height:${Math.round((A[i] / mx) * 105)}px;background:var(--accent,#3b4fa8);border-radius:2px 2px 0 0"></i></div><span class="sub" style="font-size:11px">${q ? "Q" + (i + 1) : l}</span></div>`).join("");
  return `<section class="panel m88-pa"><header><h2>แผน-ผลการเบิกจ่าย ปีงบประมาณ ${fy}</h2><span class="sp"></span><div class="tabs" role="tablist" style="margin:0"><button class="tab ${q ? "" : "on"}" type="button" data-m88dq="m">ตามเดือน</button><button class="tab ${q ? "on" : ""}" type="button" data-m88dq="q">ตามไตรมาส</button></div></header>
    <div class="body"><div class="row sub" style="gap:14px"><span><i style="display:inline-block;width:10px;height:10px;background:var(--muted);opacity:.55"></i> แผน</span><span><i style="display:inline-block;width:10px;height:10px;background:var(--accent,#3b4fa8)"></i> ผล (จ่ายจริง)</span><span>งบประมาณตามแผนทั้งปี ${fmt(tot)} บาท</span></div>
    <div style="display:flex;gap:6px;align-items:flex-end;margin:8px 0">${bars}</div>
    <div class="tbl-wrap"><table class="m88-pa-t"><thead><tr><th>${q ? "ไตรมาส" : "เดือน"}</th><th class="n">แผน (บาท)</th><th class="n">ผล (บาท)</th><th class="n">ผลต่าง</th><th class="n">แผนสะสม</th><th class="n">ผลสะสม</th><th class="n">ผลสะสม/แผนสะสม</th><th class="n">ผลสะสม/แผนทั้งปี</th></tr></thead><tbody>${rows}</tbody></table></div></div></section>`; }
{ const base = PROC.disbDash; PROC.disbDash = () => (m88On() ? m88PlanActPanel(BI.fy) : "") + base(); }

// ---------- แดชบอร์ดผู้บริหาร: a summary for decisions on the budget ----------
function m88Exec(fy) { const R = prDtRows(fy, false), mi = Math.min(11, prMonIdx(TODAY)), sum = (l, f) => l.reduce((s, r) => s + (Number(f(r)) || 0), 0);
  const B = sum(R, r => r.alloc), C = sum(R.filter(r => r.k), r => kxAmount(kxOf(r.k))), A = sum(R, r => r.act.reduce((s, v) => s + v, 0)), P = sum(R, r => r.plan.slice(0, mi + 1).reduce((s, v) => s + v, 0));
  const U = {}; R.forEach(r => { const u = (U[r.unit] = U[r.unit] || { b: 0, c: 0, a: 0, p: 0, n: 0, nk: 0 }); u.n++; u.b += r.alloc; if (r.k) u.c += kxAmount(kxOf(r.k)); else u.nk++; u.a += r.act.reduce((s, v) => s + v, 0); u.p += r.plan.slice(0, mi + 1).reduce((s, v) => s + v, 0); });
  const noCon = R.filter(r => !r.k && r.plan.slice(0, mi + 1).some(v => v > 0)).sort((a, b) => b.alloc - a.alloc), left = R.filter(r => r.k && r.alloc - kxAmount(kxOf(r.k)) > 0).map(r => [r, r.alloc - kxAmount(kxOf(r.k))]).sort((a, b) => b[1] - a[1]);
  const prob = R.filter(r => r.k && r.k.cx && r.k.cx.problem), pct = (a, b) => (b ? (a / b) * 100 : 0);
  const sig = (a, p) => { const v = pct(a, p); return !p ? tag("ยังไม่มีแผนถึงเดือนนี้", "p-mute") : v < 70 ? tag(`${fmt(v, 1)}% ต่ำกว่าแผน`, "p-bad") : v < 90 ? tag(`${fmt(v, 1)}% ใกล้แผน`, "p-warn") : tag(`${fmt(v, 1)}% ตามแผน`, "p-ok"); };
  const li = (r, extra) => `<li>${esc(r.name)} <span class="sub">· ${esc(r.unit)} · ${extra}</span></li>`;
  return `<section class="panel m88-exec"><header><h2>สรุปเพื่อการตัดสินใจเรื่องงบประมาณ ปีงบประมาณ ${fy}</h2><span class="sp"></span><span class="sub">จากข้อมูลในระบบ ณ ${fdate(TODAY)} · แผนสะสมถึงเดือน ${BI_MON[mi]}</span></header><div class="body" style="display:flex;flex-direction:column;gap:12px">
    <div class="kpis" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px">
      <div class="kpi"><span class="l">งบประมาณ</span><span class="v">${fmt(B / 1e6, 2)}</span><span class="d sub">ลบ. · ${R.length} รายการ</span></div>
      <div class="kpi"><span class="l">ก่อหนี้ผูกพันแล้ว</span><span class="v">${fmt(C / 1e6, 2)}</span><span class="d sub">ลบ. · ${fmt(pct(C, B), 1)}% ของงบ</span></div>
      <div class="kpi"><span class="l">เบิกจ่ายแล้ว</span><span class="v">${fmt(A / 1e6, 2)}</span><span class="d sub">ลบ. · ${fmt(pct(A, B), 1)}% ของงบ</span></div>
      <div class="kpi"><span class="l">ผลเทียบแผนสะสม</span><span class="v">${fmt(pct(A, P), 1)}%</span><span class="d sub">แผนสะสม ${fmt(P / 1e6, 2)} ลบ.</span></div>
      <div class="kpi"><span class="l">ยังไม่ก่อหนี้ผูกพัน</span><span class="v">${fmt((B - C) / 1e6, 2)}</span><span class="d sub">ลบ. · ${R.filter(r => !r.k).length} รายการ</span></div></div>
    <div class="tbl-wrap"><table class="m88-exec-u"><thead><tr><th>หน่วยงาน</th><th class="n">รายการ</th><th class="n">งบประมาณ (ลบ.)</th><th class="n">ผูกพัน (ลบ.)</th><th class="n">เบิกจ่าย (ลบ.)</th><th class="n">แผนสะสม (ลบ.)</th><th>ผลเทียบแผน</th><th class="n">ยังไม่ทำสัญญา</th></tr></thead><tbody>
      ${Object.entries(U).sort((a, b) => b[1].b - a[1].b).map(([u, g]) => `<tr><td>${esc(u)}</td><td class="n">${g.n}</td><td class="n">${fmt(g.b / 1e6, 2)}</td><td class="n">${fmt(g.c / 1e6, 2)}</td><td class="n">${fmt(g.a / 1e6, 2)}</td><td class="n">${fmt(g.p / 1e6, 2)}</td><td>${sig(g.a, g.p)}</td><td class="n">${g.nk}</td></tr>`).join("") || `<tr><td colspan="8" class="sub">ยังไม่มีรายการงบประมาณของปีนี้</td></tr>`}</tbody></table></div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:12px">
      <div><b>เร่งรัดการก่อหนี้ผูกพัน</b> <span class="sub">(มีแผนเงินถึงเดือนนี้แต่ยังไม่มีสัญญา: ${noCon.length} รายการ ${fmt(sum(noCon, r => r.alloc) / 1e6, 2)} ลบ.)</span><ul style="margin:4px 0 0;padding-left:18px">${noCon.slice(0, 6).map(r => li(r, `${fmt(r.alloc / 1e6, 2)} ลบ.`)).join("") || `<li class="sub">ไม่มี</li>`}</ul></div>
      <div><b>เงินเหลือจ่ายหลังทำสัญญา</b> <span class="sub">(พิจารณาโอนเปลี่ยนแปลง: ${fmt(left.reduce((s, x) => s + x[1], 0) / 1e6, 2)} ลบ.)</span><ul style="margin:4px 0 0;padding-left:18px">${left.slice(0, 6).map(([r, v]) => li(r, `เหลือ ${fmt(v / 1e6, 3)} ลบ.`)).join("") || `<li class="sub">ไม่มี</li>`}</ul></div>
      <div><b>รายการที่มีปัญหา/อุปสรรค</b> <span class="sub">(${prob.length} รายการ)</span><ul style="margin:4px 0 0;padding-left:18px">${prob.slice(0, 6).map(r => li(r, esc(r.k.cx.problem))).join("") || `<li class="sub">ไม่มี</li>`}</ul></div></div></div></section>`; }
if (VIEWS["od-dash"]) { const base = VIEWS["od-dash"]; VIEWS["od-dash"] = function () { const h = base.apply(this, arguments); if (!m88On()) return h; let s = ""; try { s = prFySel() + m88Exec(BI.fy); } catch (e) { s = `<div class="sub">สรุปไม่ได้: ${esc(e && e.message)}</div>`; }
    return /<\/h1>[\s\S]*?<\/div>/.test(h) ? h.replace(/(<\/h1>[\s\S]*?<\/div>)/, "$1" + s) : s + h; }; }

// ---------- แผนเงิน: the monthly money plan, apart from the budget items ----------
const m88CanMoney = () => ["plan", "admin"].includes(ROLE);
PROC.mplan88 = () => { const fy = BI.fy, mine = ["div", "divhead"].includes(ROLE) ? me().unit : null, all = m88BiRows().filter(r => biFy(r) === fy && (!mine || (biUnit(r) || {}).id === mine)), can = m88CanMoney();
  const units = [...new Set(all.map(pdUnit))].sort((a, b) => a.localeCompare(b, "th")), f = M88.mu || "", rows = all.filter(r => !f || pdUnit(r) === f), mon = BI_MON.map((x, i) => rows.reduce((s, r) => s + (Number(r.plan[i]) || 0), 0));
  return `${prFySel()}<section class="panel m88-mp"><header><h2>แผนเงิน ปีงบประมาณ ${fy}</h2><span class="sp"></span><span class="sub">${can ? "กองแผนงานแก้ไขแผนเงินรายเดือนได้ (บาท)" : "ดูได้อย่างเดียว"}</span></header><div class="body">
    <div class="inline-form" style="margin:0 0 8px"><div class="f"><label>สำนัก/กอง</label><select data-m88mu><option value="">ทั้งหมด</option>${units.map(u => `<option ${f === u ? "selected" : ""}>${esc(u)}</option>`).join("")}</select></div><span class="sub" style="align-self:end">${rows.length} รายการ · งบประมาณ ${fmt(rows.reduce((s, r) => s + r.amount, 0))} บาท · แผนเงินรวม ${fmt(mon.reduce((s, v) => s + v, 0))} บาท</span></div>
    ${rows.length ? `<div class="tbl-wrap"><table class="m88-mp-t"><thead><tr><th style="min-width:220px">รายการ</th><th>สำนัก/กอง</th><th class="n">วงเงิน (บาท)</th>${BI_MON.map(m => `<th class="n">${m}</th>`).join("")}<th class="n">รวมแผนเงิน</th><th class="n">ต่างจากวงเงิน</th></tr></thead><tbody>
      ${rows.map(r => { const t = r.plan.reduce((s, v) => s + (Number(v) || 0), 0); return `<tr><td>${esc(r.name)}<div class="sub mono">${esc(r.code || r.id)}</div></td><td>${esc(pdUnit(r))}</td><td class="n">${fmt(r.amount)}</td>${r.plan.map((v, i) => `<td class="n">${can ? `<input type="number" min="0" step="any" style="width:92px;text-align:right" value="${Math.round(Number(v) || 0)}" data-m88mp="${esc(r.id)}|${i}" aria-label="${esc(r.name)} ${BI_MON[i]}">` : v ? fmt(Math.round(v)) : "–"}</td>`).join("")}<td class="n"><b>${fmt(Math.round(t))}</b></td><td class="n">${Math.round(t - r.amount) ? tag(fmt(Math.round(t - r.amount)), "p-warn") : "0"}</td></tr>`; }).join("")}
      <tr><td colspan="3"><b>รวม</b></td>${mon.map(v => `<td class="n"><b>${fmt(Math.round(v))}</b></td>`).join("")}<td class="n"><b>${fmt(Math.round(mon.reduce((s, v) => s + v, 0)))}</b></td><td></td></tr></tbody></table></div>` : `<div class="sub">ยังไม่มีรายการงบประมาณของปี ${fy}</div>`}</div></section>`; };

// ---------- คลังเอกสาร ----------
const M88_EGPF = { req: "รายงานขอซื้อขอจ้าง", order: "คำสั่ง", comm: "คำสั่งแต่งตั้งคณะกรรมการ", result: "รายงานผลการพิจารณา", approve: "อนุมัติจ้าง", winner: "ประกาศผู้ชนะ", appeal: "อุทธรณ์", notice: "หนังสือแจ้งลงนามสัญญา", contract: "หนังสือสัญญา" };
function m88Docs(r) { const out = [], add = (folder, f, src) => { if (f && f.name) out.push({ folder, name: f.name, size: f.size || 0, t: f.t || "", src }); };
  const b = m88BiRows().find(x => x.id === r.id), p = b && b.sent ? S.pplan.find(x => x.id === b.sent.pp) : r.k ? famPlan(r.k.plan) : null, c = p ? caseByPlan(p.id) : null, rq = p ? (c && caseReq(c)) || S.reqn.find(q => q.plan === p.id) : null;
  ((rq && rq.detail && rq.detail.files) || []).forEach(f => add(Array.isArray(f.kind) ? f.kind[0] : typeof f.kind === "string" && f.kind ? f.kind : "เอกสารขอซื้อขอจ้าง", f, "ขอจัดซื้อจัดจ้าง"));
  if (c && c.egp7) for (let n = 1; n <= 7; n++) Object.entries((c.egp7["s" + n] || {}).files || {}).forEach(([k, f]) => add(M88_EGPF[k] || "เอกสาร e-GP", f, `e-GP ขั้นที่ ${n}`));
  const x = r.k && r.k.cx; if (x) { add("หนังสือสัญญา", x.files.contract, "ทำสัญญา"); add("เอกสารคู่สัญญา", x.files.party, "ทำสัญญา"); add("BOQ งวดงาน", x.files.boq, "ทำสัญญา"); add("หลักประกันสัญญา", x.guar && x.guar.files && x.guar.files.letter, "ทำสัญญา");
    (x.amends || []).forEach(a => add("สัญญาแก้ไข", a.file, `แก้ไขครั้งที่ ${a.i}`)); if (x.adv && x.adv.paid) add("เบิกเงินล่วงหน้า", x.adv.paid.file, `GF ${x.adv.paid.gf || ""}`);
    (x.dl || []).forEach(d => { add("ส่งมอบและตรวจรับ", d.files.dl, `ครั้งที่ ${d.n}`); add("เอกสารเบิกจ่าย (บัญชี)", d.files.book, `ครั้งที่ ${d.n}`); add("หลักฐานการจ่ายเงิน (การเงิน)", d.files.pay, `ครั้งที่ ${d.n}`); add("ตรวจใบสำคัญ", d.files.chk, `ครั้งที่ ${d.n}`); }); }
  return out; }
function m88DocBlob(r, d) { const html = `<!doctype html><meta charset="utf-8"><title>${esc(d.name)}</title><body style="font-family:sans-serif;padding:24px"><h2>${esc(d.name)}</h2><p>เอกสารจำลองจากข้อมูลในระบบ (ไม่ใช่ไฟล์ต้นฉบับ)</p><p>รายการ: ${esc(r.name)}<br>หน่วยงาน: ${esc(r.unit)}<br>ประเภทเอกสาร: ${esc(d.folder)}<br>ที่มา: ${esc(d.src)}<br>ขนาดไฟล์เดิม: ${fmt(d.size)} ไบต์</p></body>`; return new Blob([html], { type: "text/html" }); }
PROC.lib88 = () => { const fy = BI.fy, mine = ["div", "divhead"].includes(ROLE) ? unitName(me().unit) : null, q = (M88.lib.q || "").toLowerCase();
  const R = prDtRows(fy, false).filter(r => (!mine || r.unit === mine) && (!q || `${r.name} ${r.code} ${r.unit}`.toLowerCase().includes(q))).map(r => ({ r, d: m88Docs(r) }));
  const cur = R.find(x => x.r.id === M88.lib.item) || null, folders = {}; if (cur) cur.d.forEach((d, i) => (folders[d.folder] = folders[d.folder] || []).push([d, i]));
  const pv = cur && M88.lib.prev != null ? cur.d[M88.lib.prev] : null;
  return `${prFySel()}<section class="panel m88-lib"><header><h2>คลังเอกสาร ปีงบประมาณ ${fy}</h2><span class="sp"></span><span class="sub">เลือกรายการงบประมาณเพื่อดูเอกสาร แยกโฟลเดอร์ตามประเภท</span></header><div class="body" style="display:grid;grid-template-columns:minmax(240px,1fr) minmax(0,2fr);gap:14px">
    <div><input type="search" placeholder="ค้นหารายการ รหัส หน่วยงาน" value="${esc(M88.lib.q || "")}" data-m88libq style="width:100%;margin:0 0 6px"><div class="m88-lib-items" style="max-height:520px;overflow:auto;border:1px solid var(--line);border-radius:8px">
      ${R.map(({ r, d }) => `<button type="button" class="pd-go" data-m88lib="${esc(r.id)}" style="padding:7px 10px;border-bottom:1px solid var(--line);${cur && cur.r.id === r.id ? "background:var(--info-soft)" : ""}"><div>${esc(r.name)}</div><div class="sub">${esc(r.unit)} · ${d.length} เอกสาร</div></button>`).join("") || `<div class="sub" style="padding:8px">ไม่มีรายการ</div>`}</div></div>
    <div>${cur ? `<h3 style="margin:0 0 6px">${esc(cur.r.name)}</h3><div class="sub" style="margin:0 0 8px">${esc(cur.r.unit)} · ${esc(cur.r.code || "")} · ${cur.d.length} เอกสาร ใน ${Object.keys(folders).length} โฟลเดอร์</div>
      ${Object.keys(folders).length ? Object.entries(folders).map(([fo, list]) => `<details class="m88-folder" open style="border:1px solid var(--line);border-radius:8px;padding:6px 10px;margin:0 0 8px"><summary><b>📁 ${esc(fo)}</b> <span class="sub">(${list.length})</span></summary><ul style="margin:6px 0 0;padding-left:16px">${list.map(([d, i]) => `<li style="margin:2px 0">📄 ${esc(d.name)} <span class="sub">· ${esc(d.src)}${d.t ? " · " + fdate(String(d.t).slice(0, 10)) : ""}</span> <button class="btn ghost" type="button" data-m88view="${i}">ดู</button><button class="btn ghost" type="button" data-m88dl="${i}">ดาวน์โหลด</button></li>`).join("")}</ul></details>`).join("") : `<div class="sub">รายการนี้ยังไม่มีเอกสารแนบ</div>`}
      ${pv ? `<div class="m88-prev" style="border:1px solid var(--line);border-radius:8px;padding:10px;margin-top:8px"><div class="row"><b>ตัวอย่างเอกสาร: ${esc(pv.name)}</b><span class="sp" style="flex:1"></span><button class="btn ghost" type="button" data-m88view="">ปิด</button></div><div class="sub">เอกสารจำลองจากข้อมูลในระบบ (ระบบต้นแบบเก็บเฉพาะข้อมูลของไฟล์ ไม่เก็บไฟล์จริง)</div><dl class="kv" style="margin:6px 0 0"><dt>ประเภทเอกสาร</dt><dd>${esc(pv.folder)}</dd><dt>ที่มา</dt><dd>${esc(pv.src)}</dd><dt>ขนาด</dt><dd>${fmt(pv.size)} ไบต์</dd><dt>รายการ</dt><dd>${esc(cur.r.name)}</dd></dl></div>` : ""}`
      : `<div class="sub">เลือกรายการงบประมาณทางซ้าย · รายการที่มีเอกสาร ${R.filter(x => x.d.length).length} จาก ${R.length} รายการ</div>`}</div></div></section>`; };

// ---------- the Excel of the follow-up form, as the revised form (67 columns) ----------
const PR_XL_TRACK67_H = ["ลำดับที่", "เริ่มตั้ง", "ตาม พ.ร.บ.", "โอนเปลี่ยนแปลง", "รหัสงบประมาณ GFMIS", "ผลผลิต/โครงการ", "รายการ", "รหัส e-bud", "หน่วยงาน", "ประเภท", "ลักษณะ\nงบประมาณ", "พื้นที่ดำเนินการ\n(จังหวัด)", "งปม.ทั้งสิ้น", "ปี {fy}", "สถานะ\nปัจจุบัน",
  "ไร่", "ครัวเรือน", "แห่ง\n(รายการ)", "สำรวจ/ออกแบบ\n(ว/ด/ป)", "แบบแล้วเสร็จ \n(ว/ด/ป)", "ประมาณราคา \n(ว/ด/ป)", "จัดทำ TOR แล้วเสร็จ\n(ว/ด/ป)",
  "เลขที่โครงการ\n(e-bidding)", "ประกาศเผยแพร่แผนการจัดซื้อจัดจ้าง\n(ว/ด/ป)", "ราคากลาง \n(ลบ.)", "เห็นชอบราคากลาง \n(ว/ด/ป)", "เห็นชอบรายงาน\nขอซื้อ ขอจ้าง \n(ว/ด/ป)", "ประกาศร่าง TOR\nระหว่าง\n (ว/ด/ป) ถึง (ว/ด/ป) ", "ประกาศขายแบบ/เชิญชวน \nระหว่าง (ว/ด/ป) ถึง (ว/ด/ป)", "เสนอราคา\n(ว/ด/ป)", "พิจารณาผล\nระหว่าง (ว/ด/ป) ถึง (ว/ด/ป)", "ครั้งที่ประกวดราคา\n(จำนวนครั้ง)", "ผู้เสนอราคาได้ต่ำสุด", "วงเงินที่เสนอ\n(ลบ.)", "ส่ง สงป.พิจารณาความเหมาะสม\nเลขที่หนังสือ/ว/ด/ป", "สงป.พิจารณา\nความเหมาะสมแล้ว\nเลขที่หนังสือ/ว/ด/ป", "วงเงินที่สงป.เห็นชอบ\n(ลบ.)", " ความยาว\n(เมตร)", "ขยายระยะเวลาก่อหนี้\nผูกพัน\nเลขที่หนังสือ /  ว/ด/ป", "อนุมัติจ้าง\nว/ด/ป", "จำนวนวันแล้วเสร็จ", "ประกาศผู้ชนะ\nว/ด/ป", "วันที่ครบอุทธรณ์ \nว/ด/ป", "แจ้งผู้รับจ้างลงนาม\n(ว/ด/ป)", "เสนอลงนามสัญญา\n(ว/ด/ป)",
  "เลขที่สัญญา", "วันที่ลงนาม\n(ว/ด/ป)", "วงเงินสัญญา\n(ลบ.)", "วันเริ่มต้น - \nสิ้นสุดสัญญา\n(ว/ด/ป)", "ระบุ\nเลขที่ PO", "เบิกจ่ายเงิน Advance 15%\n(ลบ.)", "ผลการดำเนินงาน\nสะสม (ร้อยละ)", "ผลการเบิกจ่าย\nสะสม\n(ลบ.)", "ผลการเบิกจ่าย\n(ร้อยละ)", "ปัญหา/อุปสรรค\n(อธิบาย)",
  "งปม.ทั้งสิ้น", "ปี 2563", "ปี 2564", "ปี 2565", "ปี 2566", "ปี 2567", "ปี 2568", "ปี 2569", "ปี 2570", "ปี 2571", "ปี 2572", "ปี 2573"];
// who fills each column (row 2 of the form)
const PR_XL_TRACK67_W = PR_XL_TRACK67_H.map((h, i) => (i <= 14 ? "รายการงบประมาณ (กองแผนงาน)" : i <= 21 ? "สำนัก/กอง" : i <= 44 ? "e-GP" : i === 51 || i === 54 ? "สำนัก/กอง" : i <= 53 ? "ทำสัญญา" : "รายการงบประมาณ (กองแผนงาน)"));
// the new column <- the column of the older 72-column form (0-based); a function for the columns the older form did not have
const PR_XL_67_FROM = [0, 1, 2, 3, 4, "prod", 5, 6, 7, 8, 9, 10, 11, "year", 59, 51, 52, 53, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, "bbAmount", 50, 40, 41, 49, 42, "appealEnd", 43, 44, 45, "signDate", 47, 48, 54, 55, 56, 57, 58, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, "y2573"];
function m88Track67(fy) { const old = prTrackBook(fy)[0].rows.slice(5), D = prDtRows(fy, false), N = PR_XL_TRACK67_H.length;
  const top = [Array(N).fill(""), PR_XL_TRACK67_W.slice(), Array(N).fill(""), Array.from({ length: N }, (x, i) => String(i + 1)), PR_XL_TRACK67_H.map(h => h.replace("{fy}", fy))];
  top[0][0] = `รายงานสถานะการดำเนินงานตามแผนปฏิบัติราชการ ประจำปีงบประมาณ พ.ศ. ${fy}`; top[2][0] = "หน่วยงาน กรมตัวอย่าง (สมมติ)";
  const data = old.map((o, i) => { const r = D[i], b = r && m88BiRows().find(y => y.id === r.id), p = b && b.sent ? S.pplan.find(q => q.id === b.sent.pp) : r && r.k ? famPlan(r.k.plan) : null, c = p ? caseByPlan(p.id) : null, E = c && c.egp7, x = r && r.k && r.k.cx;
    return PR_XL_67_FROM.map(f => { if (typeof f === "number") return o[f] == null ? "" : o[f];
      if (f === "prod") return o.prod || (b && ((b.pl && b.pl.prod) || b.prod)) || "";
      if (f === "year") { const c0 = 12 + (fy - 2563); return c0 >= 12 && c0 <= 21 ? o[c0] : r ? prM(r.alloc) : ""; }
      if (f === "bbAmount") return E && E.s4 && E.s4.bbAmount ? prM(E.s4.bbAmount) : "";
      if (f === "appealEnd") return E && E.s5 ? prBE(E.s5.appealEnd || (E.s5.winnerDate && egp7AppealEnd(E.s5.winnerDate))) : "";
      if (f === "signDate") return x && x.date ? prBE(x.date) : E && E.s7 && E.s7.date ? prBE(E.s7.date) : "";
      if (f === "y2573") { const v = b && b.pl && b.pl.yrs && b.pl.yrs[2573]; return v !== "" && v != null ? Number(v) : 0; }
      return ""; }); });
  return [{ name: "แบบฟอร์ม", rows: top.concat(data) }]; }
flSpendBook = () => m88Track67(BI.fy);
// the Advance and the PO columns: the advance actually paid (with its GF number) first, in million baht; the PO of the contract or of its last amendment
{ const base = prTrackBook; prTrackBook = function (fy) { const book = base(fy), D = prDtRows(fy, false);
    book[0].rows.slice(5).forEach((row, i) => { const r = D[i], x = r && r.k && r.k.cx; if (!x) return; const am = (x.amends || []).filter(a => a.po).slice(-1)[0];
      if (x.po || am) row[54] = (am && am.po) || x.po; if (x.adv && x.adv.paid && Number(x.adv.paid.amt) > 0) row[55] = prM(x.adv.paid.amt); else if (typeof row[55] === "number" && row[55] > 1000) row[55] = prM(row[55]); });
    return book; }; }

// ---------- handlers ----------
document.addEventListener("click", e => { const t = e.target && e.target.closest ? e.target : null; if (!t) return;
  const mt = t.closest("[data-m88tab]"); if (mt) { MON_TAB = mt.dataset.m88tab; route(); return; }
  const dq = t.closest("[data-m88dq]"); if (dq) { M88.dq = dq.dataset.m88dq; route(); return; }
  const li = t.closest("[data-m88lib]"); if (li) { M88.lib.item = li.dataset.m88lib; M88.lib.prev = null; route(); return; }
  const vw = t.closest("[data-m88view]"); if (vw) { M88.lib.prev = vw.dataset.m88view === "" ? null : Number(vw.dataset.m88view); route(); return; }
  const dl = t.closest("[data-m88dl]"); if (dl) { const r = prDtRows(BI.fy, false).find(x => x.id === M88.lib.item), d = r && m88Docs(r)[Number(dl.dataset.m88dl)]; if (!d) return;
    const a = document.createElement("a"), u = URL.createObjectURL(m88DocBlob(r, d)); a.href = u; a.download = d.name.replace(/\.[^.]+$/, "") + ".html"; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 1000); toast("ดาวน์โหลดเอกสารแล้ว"); } });
document.addEventListener("change", e => { const t = e.target; if (!t || !t.matches) return;
  if (t.matches("[data-m88mu]")) { M88.mu = t.value; route(); return; }
  if (t.matches("[data-m88libq]")) { M88.lib.q = t.value; route(); return; }
  if (t.matches("[data-m88mp]")) { if (!m88CanMoney()) return; const [id, i] = t.dataset.m88mp.split("|"), r = m88BiRows().find(x => x.id === id), v = Number(t.value); if (!r || !(v >= 0)) { toast("ใส่จำนวนเงินเป็นตัวเลขไม่ติดลบ"); return; }
    r.plan[Number(i)] = v; audit(["แก้ไขแผนเงิน", "Changed the money plan"], `${id} ${BI_MON[Number(i)]}`); commit(); route(); } });
