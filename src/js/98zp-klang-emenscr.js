// KlangFinance, budget round A4 (12 Nov 2569): the national plans of e-MENSCR, as a register and as links on a request.
// What was asked: use the data from e-MENSCR (emenscr.nesdc.go.th), in the form the site gives it. The site's project list needs a
// login, so the user exported the four plan trees as JSON files (ns.json, masterplan_mixed.json, plan13.json, nr.json). Each file is
// a tree of {name, id, parentid, depth, children, _checkenabled, kpi_id}; _checkenabled marks the nodes a project may tick.
// This round (data in 98zo-klang-emenscr-data.js, built by tools/build-emenscr-data.js):
//   - EM_DATA holds the four trees as the site gives them (ids, names, parents, which nodes can be ticked, kpi_id). It is not kept in
//     the saved state (about 8,500 nodes would overflow browser storage); an import replaces one tree and is kept in IndexedDB;
//   - tabs in menu B2: browse each tree (expand, search by code or words), see how many requests use each node, check an import file
//     against the loaded tree (added, removed, renamed, ids used by requests that would vanish) before using it, and a summary of
//     requests by plan with a CSV of the links;
//   - links sit on the budget structure (a programme or an output/project; node.plans = {ns, mp, p13, nr}: node ids), set by Planning
//     in menu B2 (tab link to the budget structure); a request does not pick plans itself, it inherits them from its programme and output and shows them (main tab,
//     read only); a check item asks for at least one national link and never blocks sending.
// NOT done, and said so on the page: no connection to e-MENSCR itself (no login, no project list, no push back); the file is the
// user's own export; links on the sample programmes are keyword picks for the demo, not real alignments.
const EM_APP = "DPT Budget";
const EM_KINDS = [["ns", ["ยุทธศาสตร์ชาติ 20 ปี", "National Strategy (20 years)"]], ["mp", ["แผนแม่บทภายใต้ยุทธศาสตร์ชาติ", "Master plans under the National Strategy"]], ["p13", ["แผนพัฒนาเศรษฐกิจและสังคมแห่งชาติ ฉบับที่ 13", "13th National Economic and Social Development Plan"]], ["nr", ["แผนการปฏิรูปประเทศ", "National reform plans"]]];
const EM_LV = { ns: 0, mp: 0, nr: 0, p13: 1 }; // the level shown in the summary by plan
let EM_OVER = {}, EM_CACHE = {}, EM = { tab: "browse", k: "ns", q: "", open: {}, lim: {}, node: "" }, EM_IMP = { name: "", kind: "", rows: null, diff: null, err: "" };

// ---------- the trees ----------
const emRows = k => (EM_OVER[k] || EM_DATA[k]).rows;
const emSrc = k => (EM_OVER[k] ? EM_OVER[k].file : EM_DATA[k].file) + (EM_OVER[k] ? "" : "");
function emIdx(k) {
  const rows = emRows(k), c = EM_CACHE[k]; if (c && c.rows === rows) return c;
  const by = new Map(), kids = new Map(); rows.forEach(r => { by.set(r[0], r); (kids.get(r[1]) || kids.set(r[1], []).get(r[1])).push(r[0]); });
  return (EM_CACHE[k] = { rows, by, kids });
}
const emName = (k, id) => { const r = emIdx(k).by.get(id); return r ? r[2] : ""; };
function emPath(k, id) { const ix = emIdx(k), out = []; let r = ix.by.get(id), g = 0; while (r && g++ < 30) { out.unshift(r[2]); r = ix.by.get(r[1]); } return out; }
const emDepth = (k, id) => Math.max(0, emPath(k, id).length - 1);
const emClip = (s, n) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
function emFind(k, q, max) {
  const s = q.trim().toLowerCase(), out = []; if (!s) return out;
  for (const r of emRows(k)) { if (r[0].toLowerCase().startsWith(s) || r[2].toLowerCase().includes(s)) { out.push(r); if (out.length >= max) break; } }
  return out;
}

// ---------- parse an export file (same shape as the site) ----------
function emWalk(t) { const rows = []; (function w(a, pid) { a.forEach((x, i) => { const id = x.id != null ? String(x.id) : `${pid}~${i + 1}`; rows.push([id, pid, String(x.name || "").trim(), x._checkenabled ? 1 : 0, x.kpi_id ? String(x.kpi_id) : ""]); if (Array.isArray(x.children) && x.children.length) w(x.children, id); }); })(t, ""); return rows; }
function emParse(text) {
  let t; try { t = JSON.parse(String(text).replace(/^﻿/, "")); } catch (e) { return { err: L("อ่านไฟล์ไม่ได้ ไม่ใช่ JSON ที่ถูกต้อง", "Cannot read the file; it is not valid JSON") }; }
  if (!Array.isArray(t) || !t.length) return { err: L("ไฟล์ต้องเป็นรายการของโหนดระดับบนสุด (เหมือนไฟล์ที่ e-MENSCR ให้)", "The file must be a list of top-level nodes, like the file e-MENSCR gives") };
  if (!t.every(x => x && typeof x === "object" && x.name != null)) return { err: L("มีโหนดที่ไม่มีชื่อ (name)", "A node has no name") };
  const rows = emWalk(t), seen = new Set(); for (const r of rows) { if (seen.has(r[0])) return { err: `${L("รหัสซ้ำ", "Duplicate id")}: ${r[0]}` }; seen.add(r[0]); if (!r[2]) return { err: `${L("โหนดไม่มีชื่อ", "A node has no name")}: ${r[0]}` }; }
  if (!rows.some(r => r[3])) return { err: L("ไม่มีโหนดที่ติ๊กได้ (_checkenabled) เลย ไฟล์นี้ไม่น่าใช่ไฟล์แผนของ e-MENSCR", "No node can be ticked (_checkenabled); this does not look like an e-MENSCR plan file") };
  const roots = t.map(x => String(x.id == null ? "" : x.id));
  const kind = roots.every(x => /^Y\d{3}$/.test(x)) ? "ns" : roots.every(x => /^P\d+$/.test(x)) ? "p13" : roots.every(x => /^\d{2}$/.test(x)) ? "mp" : roots.every(x => /^[A-Z]\d{2}$/.test(x)) ? "nr" : "";
  if (!kind) return { err: L("ดูไม่ออกว่าเป็นแผนไหน (รหัสระดับบนสุดไม่ตรงกับ 4 ชุดที่รู้จัก)", "Cannot tell which plan this is (the top-level codes match none of the four known sets)") };
  return { kind, rows };
}
function emDiff(k, rows) {
  const old = emIdx(k).by, nu = new Map(rows.map(r => [r[0], r])), used = emUsedIds(k);
  const add = rows.filter(r => !old.has(r[0])), gone = [...old.values()].filter(r => !nu.has(r[0])), ren = rows.filter(r => old.has(r[0]) && old.get(r[0])[2] !== r[2]);
  return { add: add.length, gone: gone.length, ren: ren.length, goneUsed: gone.filter(r => used.has(r[0])).map(r => r[0]), sample: { add: add.slice(0, 5), gone: gone.slice(0, 5), ren: ren.slice(0, 5) } };
}

// ---------- links: Planning ties the plans to the budget structure; a request inherits them ----------
// Changed on 12 Nov 2569 at the user's word: "link the strategies from the programmes that Planning adds". The link now sits on a
// programme or an output/project of the budget structure (node.plans = {ns, mp, p13, nr}: node ids), set by Planning in menu B2.
// A request does not pick plans itself; it takes the union of the links on its programme and output (its lineage) and shows them.
const emNodePlans = n => (n && n.plans) || {};
const emPlans = r => { const out = {}; EM_KINDS.forEach(([k]) => { const s = []; (r.act ? lineage(r.act) : []).forEach(n => (emNodePlans(n)[k] || []).forEach(id => { if (!s.includes(id)) s.push(id); })); out[k] = s; }); return out; };
const emPlanFrom = (r, k, id) => (r.act ? lineage(r.act) : []).filter(n => (emNodePlans(n)[k] || []).includes(id)).map(n => `${n.code} ${tx(n.name)}`);
const emReqs = () => (S.requests || []).filter(r => ROLE !== "div" || r.unit === me().unit);
const emNodes = () => (S.structure[FORM_FY] || []).filter(n => (n.lvl === "program" || n.lvl === "output") && !n.retired);
const emNodeCan = () => (ROLE === "plan" || ROLE === "admin") && fyOpen(FORM_FY);
function emUse(k) { // node id -> Set of request ids, counting each ancestor too
  const m = new Map(), ix = emIdx(k);
  emReqs().forEach(r => (emPlans(r)[k] || []).forEach(id => { let n = ix.by.get(id), g = 0; while (n && g++ < 30) { (m.get(n[0]) || m.set(n[0], new Set()).get(n[0])).add(r.id); n = ix.by.get(n[1]); } }));
  return m;
}
function emUsedIds(k) { const s = new Set(); Object.values(S.structure || {}).forEach(a => (a || []).forEach(n => (emNodePlans(n)[k] || []).forEach(id => s.add(id)))); return s; }
const emLinked = r => EM_KINDS.reduce((s, [k]) => s + (emPlans(r)[k] || []).length, 0);
const emNodeCount = n => EM_KINDS.reduce((s, [k]) => s + (emNodePlans(n)[k] || []).length, 0);

// one picker: the chosen nodes of each plan, and (when ed) a box to search and add more. Used for a structure node.
const EM_HIT_CSS = `<style>.em-r{max-height:280px;overflow:auto;margin-top:4px}.em-hit{display:block;width:100%;height:auto;min-height:0;line-height:1.5;text-align:left;white-space:normal;overflow-wrap:anywhere;padding:8px 10px;margin:0 0 4px;border:1px solid var(--line);border-radius:8px;background:var(--surface);cursor:pointer}.em-hit:hover{background:var(--surface-2,rgba(0,0,0,.04))}</style>`;
function emPickerHtml(n, ed) {
  const P = emNodePlans(n);
  return (ed ? EM_HIT_CSS : "") + EM_KINDS.map(([k, nm]) => `<div style="margin-bottom:12px"><b>${tx(nm)}</b>${(P[k] || []).length ? `<ul class="plain">${P[k].map(id => { const ok = emIdx(k).by.has(id); return `<li class="row" style="flex-wrap:nowrap;align-items:flex-start;justify-content:space-between"><span style="min-width:0;overflow-wrap:anywhere"><span class="mono sub">${esc(id)}</span> ${ok ? esc(emPath(k, id).slice(-3).join(" › ")) : tag(L("ไม่พบในชุดข้อมูลปัจจุบัน", "Not in the loaded set"), "p-warn")}</span>${ed ? `<button class="btn ghost" type="button" data-emx="${k}|${esc(id)}">${L("ลบ", "Remove")}</button>` : ""}</li>`; }).join("")}</ul>` : `<div class="sub">${L("ยังไม่ได้เลือก (เลือกได้ 1 รายการ)", "None chosen (one only)")}</div>`}
    ${ed && !(P[k] || []).length ? `<input type="search" id="em-q-${k}" placeholder="${L("พิมพ์รหัสหรือคำค้นเพื่อเพิ่ม", "Type a code or words to add")}" style="width:100%;max-width:520px;margin-top:4px" aria-label="${esc(tx(nm))}"><div id="em-r-${k}" class="em-r"></div>` : ""}</div>`).join("");
}
function emPickerBind(n) {
  const set = (k, arr) => { n.plans = Object.assign({}, n.plans || {}, { [k]: arr }); }; // a new object each time: a copied year must not share it
  EM_KINDS.forEach(([k]) => {
    const q = document.querySelector("#em-q-" + k), box = document.querySelector("#em-r-" + k); if (!q || !box) return;
    q.oninput = () => {
      const have = new Set(emNodePlans(n)[k] || []), hits = emFind(k, q.value, 400).filter(x => x[3] && !have.has(x[0])).slice(0, 12);
      box.innerHTML = q.value.trim() ? (hits.length ? hits.map(x => `<button type="button" data-emadd="${k}|${esc(x[0])}" class="btn ghost em-hit"><span class="mono sub">${esc(x[0])}</span> ${esc(emPath(k, x[0]).slice(-3).join(" › "))}</button>`).join("") : `<div class="sub">${L("ไม่พบโหนดที่เลือกได้ตรงกับคำค้น", "No tickable node matches")}</div>`) : "";
      box.querySelectorAll("[data-emadd]").forEach(b => (b.onclick = () => { const [kk, id] = b.dataset.emadd.split("|"); set(kk, [id]); audit(["ผูกแผนระดับชาติกับโครงสร้างงบประมาณ", "Linked a national plan to a budget structure node"], `${n.code} · ${kk} ${id}`); commit(); route(); }));
    };
  });
  document.querySelectorAll("[data-emx]").forEach(b => (b.onclick = () => { const [k, id] = b.dataset.emx.split("|"); set(k, (emNodePlans(n)[k] || []).filter(x => x !== id)); audit(["เอาการผูกแผนระดับชาติออกจากโครงสร้างงบประมาณ", "Removed a national plan link from a budget structure node"], `${n.code} · ${k} ${id}`); commit(); route(); }));
}

// the request shows what it inherits (read only)
function rqPlanPanel(r) {
  const P = emPlans(r), n = emLinked(r), lin = r.act ? lineage(r.act) : [];
  return `<section class="panel" id="rq-em"><header><h2>${L("ความสอดคล้องกับแผนระดับชาติ (e-MENSCR)", "Alignment with the national plans (e-MENSCR)")}</h2><span class="sp"></span><span class="sub">${n ? `${n} ${L("รายการ มาจากแผนงานและผลผลิต/โครงการของคำขอนี้", "links, from this request's programme and output")}` : L("ยังไม่ได้ผูก", "Not linked yet")}</span></header><div class="body">
    ${n ? EM_KINDS.filter(([k]) => P[k].length).map(([k, nm]) => `<div style="margin-bottom:10px"><b>${tx(nm)}</b><ul class="plain">${P[k].map(id => `<li style="overflow-wrap:anywhere"><span class="mono sub">${esc(id)}</span> ${emIdx(k).by.has(id) ? esc(emPath(k, id).slice(-3).join(" › ")) : tag(L("ไม่พบในชุดข้อมูลปัจจุบัน", "Not in the loaded set"), "p-warn")} <span class="sub">· ${L("จาก", "from")} ${esc(emPlanFrom(r, k, id).join(", "))}</span></li>`).join("")}</ul></div>`).join("") : `<p class="sub">${lin.length ? `${L("แผนงานและผลผลิต/โครงการของคำขอนี้ยังไม่ได้ผูกกับแผนระดับชาติ", "This request's programme and output are not linked to the national plans yet")}: ${esc(lin.map(x => x.code).join(" › "))}` : L("คำขอนี้ยังไม่ได้เลือกกิจกรรม จึงยังไม่มีแผนงาน", "This request has no activity yet, so no programme")}</p>`}
    <p class="sub">${L("กองแผนงานเป็นผู้ผูกแผนระดับชาติกับแผนงานและผลผลิต/โครงการ (เมนูแผนระดับชาติและยุทธศาสตร์ (B2) แท็บผูกกับโครงสร้างงบประมาณ) คำขอรับต่อมาโดยอัตโนมัติ ข้อมูลแผนมาจากไฟล์ที่ส่งออกจาก e-MENSCR ระบบนี้ไม่ได้เชื่อมต่อ e-MENSCR โดยตรง", "Planning links the national plans to the programme and the output or project (menu National plans and strategy (B2), tab link to the budget structure); the request takes them over. The plans come from files exported from e-MENSCR; this system is not connected to e-MENSCR itself.")}</p></div></section>`;
}
{
  const base = VIEWS.request;
  VIEWS.request = () => { const html = base(), r = curReq(); if (!r || REQ_TAB !== "main") return html; const marker = `<section class="panel"><header><h2>${L("รายการงบประมาณ", "Budget lines")}</h2>`, at = html.indexOf(marker); return at >= 0 ? html.slice(0, at) + rqPlanPanel(r) + html.slice(at) : html; };
  const ck = checks; checks = r => { const out = ck(r), P = emPlans(r), nat = ["ns", "mp", "p13"].reduce((s, k) => s + P[k].length, 0); out.push({ s: nat ? "ok" : "wa", title: L("ความสอดคล้องกับแผนระดับชาติ", "Alignment with the national plans"), d: nat ? `${nat} ${L("รายการ (ยุทธศาสตร์ชาติ แผนแม่บท หรือแผน 13) ผูกไว้ที่แผนงาน", "links (national strategy, master plan or plan 13) set on the programme")}` : L("แผนงานของคำขอนี้ยังไม่ได้ผูกกับยุทธศาสตร์ชาติ แผนแม่บท หรือแผนพัฒนาฯ ฉบับที่ 13 ให้กองแผนงานผูกที่เมนูแผนระดับชาติและยุทธศาสตร์ (B2) ไม่บล็อกการส่ง", "This request's programme is not linked to the national strategy, a master plan or plan 13; Planning links it in the menu National plans and strategy (B2). This does not block sending") }); return out; };
}

// ---------- keep an imported tree in IndexedDB (the saved state is too small for it) ----------
function emDb() { return new Promise((res, rej) => { try { const q = indexedDB.open("app-emenscr", 1); q.onupgradeneeded = () => q.result.createObjectStore("o"); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); } catch (e) { rej(e); } }); }
const emStore = (db, mode) => db.transaction("o", mode).objectStore("o");
async function emKeep(k, val) { try { const db = await emDb(), st = emStore(db, "readwrite"); if (val) st.put(val, k); else st.delete(k); } catch (e) { /* storage blocked: the import then lasts until the page closes */ } }
async function emLoad() { try { const db = await emDb(), st = emStore(db, "readonly"); await Promise.all(EM_KINDS.map(([k]) => new Promise(res => { const q = st.get(k); q.onsuccess = () => { if (q.result && Array.isArray(q.result.rows)) EM_OVER[k] = q.result; res(); }; q.onerror = () => res(); }))); if (Object.keys(EM_OVER).length && (String(location.hash) === "#strategy" || window.APP_ROUTE === "#strategy")) route(); } catch (e) { /* none kept */ } }
emLoad();

// ---------- the e-MENSCR tabs of menu B2 ----------
const emCan = () => ROLE === "plan" || ROLE === "admin";
function emLine(k, r, use, flat) {
  const ix = emIdx(k), has = ix.kids.has(r[0]), open = !!EM.open[k + "|" + r[0]], n = use.has(r[0]) ? use.get(r[0]).size : 0, kp = r[4] ? emName(k, r[4]) : "";
  return `<div class="row" style="flex-wrap:nowrap;align-items:flex-start;gap:6px;padding:2px 0">${has && !flat ? `<button class="btn ghost" type="button" data-emt="${k}|${esc(r[0])}" aria-expanded="${open}" aria-label="${L("เปิด/ปิด", "Expand or collapse")} ${esc(r[0])}" style="padding:0 8px;min-width:30px">${open ? "▾" : "▸"}</button>` : `<span style="min-width:30px"></span>`}<span class="mono sub" style="min-width:86px">${esc(r[0])}</span><span style="min-width:0;overflow-wrap:anywhere">${esc(r[2])}${r[3] ? " " + tag(L("เลือกได้", "tickable"), "p-ok") : ""}${n ? " " + tag(`${n} ${L("คำขอ", "requests")}`, "p-info") : ""}${flat ? `<div class="sub">${esc(emPath(k, r[0]).slice(0, -1).join(" › "))}</div>` : ""}${kp ? `<div class="sub">${L("ตัวชี้วัดที่เชื่อม", "Linked indicator")}: ${esc(r[4])} ${esc(emClip(kp, 70))}</div>` : ""}</span></div>`;
}
function emTreeHtml(k) {
  const ix = emIdx(k), use = emUse(k), q = EM.q.trim();
  if (q) { const hits = emFind(k, q, 80); return hits.length ? `<div class="sub">${hits.length >= 80 ? L("แสดง 80 รายการแรก ใส่คำค้นให้เฉพาะขึ้น", "First 80 shown; narrow the search") : `${hits.length} ${L("รายการ", "found")}`}</div>${hits.map(r => emLine(k, r, use, true)).join("")}` : `<p class="sub">${L("ไม่พบ", "Nothing found")}</p>`; }
  const walk = (pid, dep) => { const ids = ix.kids.get(pid) || [], key = k + "|" + pid, lim = EM.lim[key] || 150; return ids.slice(0, lim).map(id => { const r = ix.by.get(id); return `<div style="margin-left:${dep ? 20 : 0}px">${emLine(k, r, use, false)}${ix.kids.has(id) && EM.open[k + "|" + id] ? walk(id, dep + 1) : ""}</div>`; }).join("") + (ids.length > lim ? `<div style="margin-left:${dep ? 20 : 0}px"><button class="btn ghost" type="button" data-emmore="${esc(key)}">${L("แสดงเพิ่ม", "Show more")} (${ids.length - lim})</button></div>` : ""); };
  return walk("", 0);
}
function emSummary(k) {
  const ix = emIdx(k), use = emUse(k), lv = EM_LV[k], reqs = emReqs(), amt = new Map();
  reqs.forEach(r => { const seen = new Set(); (emPlans(r)[k] || []).forEach(id => { let n = ix.by.get(id), g = 0; while (n && g++ < 30) { if (emDepth(k, n[0]) === lv && !seen.has(n[0])) { seen.add(n[0]); amt.set(n[0], (amt.get(n[0]) || 0) + reqAmount(r)); } n = ix.by.get(n[1]); } }); });
  const nodes = emRows(k).filter(r => emDepth(k, r[0]) === lv);
  return `<div class="tbl-wrap"><table><thead><tr><th>${L("รหัส", "Code")}</th><th>${L("รายการ", "Item")}</th><th class="n">${L("จำนวนคำขอ", "Requests")}</th><th class="n">${L("วงเงิน (บาท)", "Amount (baht)")}</th></tr></thead><tbody>${nodes.map(r => `<tr><td class="mono">${esc(r[0])}</td><td>${esc(r[2])}</td><td class="n">${use.has(r[0]) ? use.get(r[0]).size : 0}</td><td class="n">${baht(amt.get(r[0]) || 0)}</td></tr>`).join("")}</tbody></table></div>`;
}
function emCsv() {
  const q = s => `"${String(s).replace(/"/g, '""')}"`, rows = [["request", "unit", "plan", "node_id", "path"]];
  emReqs().forEach(r => EM_KINDS.forEach(([k, nm]) => (emPlans(r)[k] || []).forEach(id => rows.push([r.id, r.unit || "", nm[0], id, emPath(k, id).join(" > ")]))));
  return rows.map(x => x.map(q).join(",")).join("\r\n");
}
function emLinkHtml() {
  const nodes = emNodes(), sel = AP.open ? null : nodes.find(n => n.id === EM.node), can = emNodeCan(), reqsOf = n => (S.requests || []).filter(r => r.act && lineage(r.act).some(x => x.id === n.id)).length;
  const order = nodes.filter(n => n.lvl === "program").flatMap(p => [p, ...nodes.filter(o => o.parent === p.id)]);
  return `${emAddProgHtml()}<section class="panel"><header><h2>${L("ผูกแผนระดับชาติกับแผนงานและผลผลิต/โครงการ", "Link the national plans to programmes and outputs")}</h2><span class="sp"></span><span class="sub">${fyLabel(FORM_FY)}</span></header><div class="body"><p class="sub">${L("กองแผนงานเลือกแผนงานหรือผลผลิต/โครงการ แล้วเลือกยุทธศาสตร์ชาติ แผนแม่บท แผน 13 และแผนปฏิรูปที่เกี่ยวข้อง คำขอที่อยู่ใต้รายการนั้นรับต่อโดยอัตโนมัติ", "Planning picks a programme or an output or project, then the related national strategy, master plans, plan 13 and reform plans. Requests under it take them over automatically.")}</p></div>
    <div class="tbl-wrap"><table><thead><tr><th>${L("รหัส", "Code")}</th><th>${L("รายการ", "Item")}</th><th>${L("เชื่อมโยง", "Linked to")}</th><th class="n">${L("แผนที่ผูก", "Links")}</th><th class="n">${L("คำขอ", "Requests")}</th><th></th></tr></thead><tbody>${order.map(n => `<tr ${sel && sel.id === n.id ? 'aria-selected="true"' : ""}><td class="mono">${esc(n.code)}</td><td>${n.lvl === "output" ? "&nbsp;&nbsp;&nbsp;" : ""}<span class="lvl ${n.lvl}">${tx(LEVELS[n.lvl])}</span> ${esc(tx(n.name))}</td><td>${emNodeLinkCell(n)}</td><td class="n">${emNodeCount(n)}</td><td class="n">${reqsOf(n)}</td><td><button class="btn ghost" type="button" ${n.lvl === "program" && can ? `data-emedit="${esc(n.id)}"` : `data-emnode="${esc(n.id)}"`}>${n.lvl === "program" && can ? L("แก้ไข", "Edit") : can ? L("เลือก/แก้", "Select") : L("ดู", "View")}</button></td></tr>`).join("")}</tbody></table></div></section>
    ${sel ? `<section class="panel"><header><h2>${esc(sel.code)} · ${esc(tx(sel.name))}</h2></header><div class="body">${emLinkSelHtml(sel, can)}${emPickerHtml(sel, can)}${can ? "" : `<p class="sub">${L("เฉพาะกองแผนงานและผู้ดูแลระบบแก้ได้ เมื่อปีงบประมาณยังไม่ปิด", "Only Planning and the administrator edit this, while the fiscal year is open")}</p>`}</div></section>` : ""}`;
}
function emView() {
  const k = EM.k, nm = EM_KINDS.find(x => x[0] === k)[1], total = EM_KINDS.reduce((s, [kk]) => s + emRows(kk).length, 0), reqs = emReqs(), linked = reqs.filter(r => emLinked(r) > 0).length, can = emCan(), I = EM_IMP;
  const kindBar = `<div class="tabs" role="tablist">${EM_KINDS.map(([kk, n]) => `<button class="tab ${kk === k ? "on" : ""}" type="button" role="tab" aria-selected="${kk === k}" data-emk="${kk}">${tx(n)}</button>`).join("")}</div>`;
  return `
    ${eKpis([[L("โหนดแผนทั้งหมด", "Plan nodes"), total], [L("ชุดแผน", "Plans"), EM_KINDS.length], [L("คำขอที่ผูกแผนแล้ว", "Requests linked"), linked], [L("คำขอที่ยังไม่ผูก", "Not linked"), reqs.length - linked, "", reqs.length - linked > 0]])}
    ${EM.tab === "browse" || EM.tab === "sum" ? kindBar : ""}
    ${EM.tab === "link" ? emLinkHtml() : ""}
    ${EM.tab === "browse" ? `<section class="panel"><header><h2>${tx(nm)}</h2><span class="sp"></span><span class="sub">${esc(emSrc(k))} · ${emRows(k).length} ${L("โหนด", "nodes")}${EM_OVER[k] ? " · " + L("ชุดที่นำเข้า", "imported") : ""}</span></header><div class="body">
      <input type="search" id="em-q" value="${esc(EM.q)}" placeholder="${L("ค้นหารหัสหรือคำในชื่อ", "Search a code or words in the name")}" style="width:100%;max-width:520px;margin-bottom:8px" aria-label="${L("ค้นหา", "Search")}"><div id="em-tree">${emTreeHtml(k)}</div></div></section>` : ""}
    ${EM.tab === "sum" ? `<section class="panel"><header><h2>${tx(nm)}</h2><span class="sp"></span><button class="btn" type="button" id="em-csv">${L("ส่งออก CSV ของการผูก", "Export the links as CSV")}</button></header>${emSummary(k)}</section>
      <section class="panel"><header><h2>${L("คำขอที่ยังไม่ผูกกับแผนระดับชาติ", "Requests with no national link")}</h2></header>${(() => { const x = reqs.filter(r => !["ns", "mp", "p13"].some(kk => (emPlans(r)[kk] || []).length)); return x.length ? `<div class="tbl-wrap"><table><thead><tr><th>${L("เลขที่", "No.")}</th><th>${L("รายการ", "Request")}</th><th class="n">${L("วงเงิน (บาท)", "Amount (baht)")}</th></tr></thead><tbody>${x.map(r => `<tr><td class="mono">${esc(r.id)}</td><td>${esc(tx(r.name))}</td><td class="n">${baht(reqAmount(r))}</td></tr>`).join("")}</tbody></table></div>` : `<p class="body sub">${L("ทุกคำขอผูกแล้ว", "All requests are linked")}</p>`; })()}</section>` : ""}
    ${EM.tab === "imp" ? `<section class="panel"><header><h2>${L("นำเข้าไฟล์แผนจาก e-MENSCR", "Import a plan file from e-MENSCR")}</h2></header><div class="body">
      <p class="sub">${L("เลือกไฟล์ JSON แบบเดียวกับที่ e-MENSCR ให้ (ไฟล์ละหนึ่งแผน) ระบบดูจากรหัสว่าเป็นแผนไหน แล้วเทียบกับชุดที่ใช้อยู่ก่อนให้กดใช้ ชุดที่นำเข้าเก็บไว้ในเบราว์เซอร์นี้", "Choose a JSON file like the ones e-MENSCR gives (one plan per file). The system tells which plan it is from the codes and compares it with the loaded set before you use it. An imported set is kept in this browser.")}</p>
      <div class="row" style="flex-wrap:wrap"><input type="file" id="em-file" accept=".json,application/json" ${can ? "" : "disabled"}>${I.rows ? `<button class="btn ghost" type="button" id="em-clear">${L("ล้าง", "Clear")}</button>` : ""}</div>
      ${I.err ? `<p>${tag(esc(I.err), "p-bad")}</p>` : ""}
      ${I.rows ? `<div class="kpis" style="margin-top:8px">${eKpis([[L("แผนที่พบ", "Plan found"), tx(EM_KINDS.find(x => x[0] === I.kind)[1])], [L("โหนดในไฟล์", "Nodes in the file"), I.rows.length], [L("เพิ่มใหม่", "Added"), I.diff.add], [L("หายไป", "Removed"), I.diff.gone, "", I.diff.gone > 0], [L("เปลี่ยนชื่อ", "Renamed"), I.diff.ren]])}</div>
        ${I.diff.goneUsed.length ? `<p>${tag(`${L("มีรหัสที่ผูกไว้กับโครงสร้างงบประมาณ แต่ไม่มีในไฟล์นี้", "Codes linked to the budget structure that this file lacks")}: ${esc(I.diff.goneUsed.slice(0, 8).join(", "))}${I.diff.goneUsed.length > 8 ? "…" : ""}`, "p-warn")} <span class="sub">${L("ถ้าใช้ไฟล์นี้ การผูกเหล่านั้นจะขึ้นว่าไม่พบในชุดข้อมูลปัจจุบัน ให้แก้ที่โครงสร้างงบประมาณ", "If you use this file those links will show 'not in the loaded set'; fix them on the budget structure")}</span></p>` : ""}
        <div class="row" style="margin-top:8px"><button class="btn primary" type="button" id="em-go" ${can ? "" : "disabled"}>${L("ใช้ไฟล์นี้แทนชุดเดิม", "Use this file in place of the loaded set")}</button></div>` : ""}
      ${!can ? `<p class="sub">${L("เฉพาะกองแผนงานและผู้ดูแลระบบนำเข้าได้", "Only Planning and the administrator import")}</p>` : ""}</div></section>
      <section class="panel"><header><h2>${L("ชุดข้อมูลที่ใช้อยู่", "Loaded sets")}</h2></header><div class="tbl-wrap"><table><thead><tr><th>${L("แผน", "Plan")}</th><th>${L("ไฟล์", "File")}</th><th class="n">${L("โหนด", "Nodes")}</th><th>${L("ที่มา", "Source")}</th><th></th></tr></thead><tbody>${EM_KINDS.map(([kk, n]) => `<tr><td>${tx(n)}</td><td class="mono">${esc(emSrc(kk))}</td><td class="n">${emRows(kk).length}</td><td>${EM_OVER[kk] ? tag(L("นำเข้า", "Imported"), "p-info") : tag(L("มากับระบบ", "Built in"), "p-mute")}</td><td>${EM_OVER[kk] && can ? `<button class="btn ghost" type="button" data-emrev="${kk}">${L("กลับไปใช้ชุดที่มากับระบบ", "Back to the built-in set")}</button>` : ""}</td></tr>`).join("")}</tbody></table></div></section>
      ${(S.emImports || []).length ? `<section class="panel"><header><h2>${L("ประวัติการนำเข้า", "Import history")}</h2></header><div class="tbl-wrap"><table><thead><tr><th>${L("เมื่อ", "When")}</th><th>${L("แผน", "Plan")}</th><th>${L("ไฟล์", "File")}</th><th class="n">${L("เพิ่ม", "Added")}</th><th class="n">${L("หาย", "Removed")}</th><th class="n">${L("เปลี่ยนชื่อ", "Renamed")}</th></tr></thead><tbody>${S.emImports.map(x => `<tr><td>${fdate(x.t, true)}</td><td>${esc(x.kind)}</td><td class="mono">${esc(x.file)}</td><td class="n">${x.add}</td><td class="n">${x.gone}</td><td class="n">${x.ren}</td></tr>`).join("")}</tbody></table></div></section>` : ""}` : ""}`;
}
function emBind() {
  $$("[data-emk]").forEach(b => (b.onclick = () => { EM.k = b.dataset.emk; EM.q = ""; route(); }));
  const tree = $("#em-tree"), rt = () => { tree.innerHTML = emTreeHtml(EM.k); wire(); };
  const wire = () => { if (!tree) return; tree.querySelectorAll("[data-emt]").forEach(b => (b.onclick = () => { const key = b.dataset.emt; EM.open[key] = !EM.open[key]; rt(); })); tree.querySelectorAll("[data-emmore]").forEach(b => (b.onclick = () => { const key = b.dataset.emmore; EM.lim[key] = (EM.lim[key] || 150) + 200; rt(); })); };
  { const sn = emNodes().find(n => n.id === EM.node); if (EM.tab === "link" && sn) emPickerBind(sn); $$("[data-emnode]").forEach(b => (b.onclick = () => { EM.node = b.dataset.emnode; route(); })); }
  { const lk = $("#em-lk"); if (lk) lk.onchange = () => { const m = emSetLink(EM.node, lk.value); if (m) { toast(m); route(); return; } commit(); route(); toast(L("เชื่อมโยงแล้ว", "Linked")); };
    emApBind();
    const dp = $("#em-delprog"); if (dp) dp.onclick = () => { const m = emDelProg(EM.node); if (m) { toast(m); return; } EM.node = ""; commit(); route(); toast(L("ลบแผนงานแล้ว", "Programme deleted")); }; }
  wire(); const q = $("#em-q"); if (q) q.oninput = () => { EM.q = q.value; rt(); };
  const ex = $("#em-csv"); if (ex) ex.onclick = () => { const blob = new Blob(["﻿" + emCsv()], { type: "text/csv;charset=utf-8" }), a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "plan_links.csv"; document.body.appendChild(a); a.click(); a.remove(); };
  const f = $("#em-file"); if (f) f.onchange = e => { const file = e.target.files[0]; if (!file) return; const rd = new FileReader(); rd.onload = () => { const r = emParse(String(rd.result)); EM_IMP = r.err ? { name: file.name, kind: "", rows: null, diff: null, err: r.err } : { name: file.name, kind: r.kind, rows: r.rows, diff: emDiff(r.kind, r.rows), err: "" }; route(); }; rd.readAsText(file, "utf-8"); };
  const cl = $("#em-clear"); if (cl) cl.onclick = () => { EM_IMP = { name: "", kind: "", rows: null, diff: null, err: "" }; route(); };
  const go = $("#em-go"); if (go) go.onclick = () => { const I = EM_IMP; if (!I.rows || !emCan()) return; EM_OVER[I.kind] = { file: I.name, rows: I.rows }; EM_CACHE = {}; emKeep(I.kind, EM_OVER[I.kind]); (S.emImports = S.emImports || []).unshift({ t: nowIso(), by: me().id, kind: I.kind, file: I.name, add: I.diff.add, gone: I.diff.gone, ren: I.diff.ren }); audit(["นำเข้าไฟล์แผน e-MENSCR", "Imported an e-MENSCR plan file"], `${I.kind} · ${I.name} · +${I.diff.add} −${I.diff.gone}`); commit(); EM_IMP = { name: "", kind: "", rows: null, diff: null, err: "" }; route(); toast(L("ใช้ไฟล์แล้ว", "File in use")); };
  $$("[data-emrev]").forEach(b => (b.onclick = () => { const kk = b.dataset.emrev; delete EM_OVER[kk]; EM_CACHE = {}; emKeep(kk, null); audit(["กลับไปใช้ชุดแผนที่มากับระบบ", "Back to the built-in plan set"], kk); commit(); route(); }));
}


// ---------- one menu (13 Nov 2569, at the user's word): the national plans (e-MENSCR) and the agency strategy menu are one ----------
// Before there were two menus: B2 "Strategic Planning" (agency strategies, KPI targets, links, alignment, project bank, revision)
// and page BQ13 "National plans (e-MENSCR)". Now there is one menu, B2, and e-MENSCR leads it:
//   tab 1  National plans (e-MENSCR): browse each plan, and the summary of requests by plan   (was BQ13 browse and summary)
//   tab 2  Link to the budget structure: Planning ties the plans to programmes and outputs      (was BQ13 link)
//   tabs 3 to 8  the agency strategy tabs as they were (strategy and goals, KPIs, linkage, alignment, project bank, revision)
//   last   Import plan files (Planning and the administrator)                                   (was BQ13 import)
// Page BQ13 is gone from the menu; an old address "#bq-em" opens tab 1 of B2. The administrator can now open B2 (to import a plan
// file and to link plans to the structure).
STRAT_TABS.push({ id: "em-browse", label: ["ดูตามแผน", "Browse"] }, { id: "em-sum", label: ["สรุปคำขอตามแผน", "Requests by plan"] }, { id: "em-link", label: ["ผูกกับโครงสร้างงบประมาณ", "Link to the budget structure"] }, { id: "em-imp", label: ["นำเข้าไฟล์แผน", "Import plan files"] });
const EM_TABKEY = { "em-browse": "browse", "em-sum": "sum", "em-link": "link", "em-imp": "imp" };
Object.keys(EM_TABKEY).forEach(k => { STRAT[k] = () => { EM.tab = EM_TABKEY[k]; return emView(); }; STRAT_BIND[k] = () => emBind(); });
{
  const sp = bPage("strategy"), old = sp.tabs, mk = (id, keys, label, roles) => ({ id, keys, ...(label ? { label } : {}), ...(roles ? { roles } : {}) });
  sp.tabs = [mk("em", ["em-browse", "em-sum"], ["แผนระดับชาติ (e-MENSCR)", "National plans (e-MENSCR)"]), mk("emlink", ["em-link"], ["ผูกกับโครงสร้างงบประมาณ", "Link to the budget structure"]),
    ...old, mk("emimp", ["em-imp"], ["นำเข้าไฟล์แผน", "Import plan files"], ["plan", "admin"])];
  sp.label = ["แผนระดับชาติและยุทธศาสตร์", "National plans and strategy"]; sp.h1 = ["แผนระดับชาติ (e-MENSCR) และยุทธศาสตร์หน่วยงาน", "National plans (e-MENSCR) and agency strategy"];
  const n = NAV.find(x => x.id === "strategy"); n.label = sp.label; if (!n.roles.includes("admin")) n.roles.push("admin");
  n.plan = [["แผนระดับชาติจาก e-MENSCR: ยุทธศาสตร์ชาติ แผนแม่บท แผนพัฒนาฯ ฉบับที่ 13 แผนปฏิรูป", "National plans from e-MENSCR: strategy, master plans, plan 13, reform plans"], ["ผูกแผนระดับชาติกับแผนงานและผลผลิต/โครงการ", "Link the plans to programmes and outputs"], ["ยุทธศาสตร์และเป้าประสงค์ของหน่วยงาน ตัวชี้วัด และค่าเป้าหมาย 5 ปี", "Agency strategies, goals, KPIs and 5-year targets"], ["รายงานความสอดคล้องแผนกับคำขอ", "Plan-to-request alignment report"]];
  STRAT_TAB = "em-browse"; BUD_SEEN.strategy = "em-browse"; // opening the menu fresh lands on e-MENSCR
}
{ // an old address or deep link to the page that was BQ13 opens the first tab of B2
  const br = route;
  route = function () {
    const h = String(window.APP_ROUTE || location.hash || "").replace(/^#/, "");
    if (h === "bq-em") { STRAT_TAB = "em-browse"; if (window.APP_ROUTE) window.APP_ROUTE = "#strategy"; else history.replaceState(null, "", "#strategy"); }
    return br.apply(this, arguments);
  };
}

// ---------- the agency strategies (M01) now pick from the real national strategy and master plans ----------
// Before: NATIONAL held six sample strategies (N1 to N6) and MASTER three sample master plans (MP12, MP20, MP21). Now both come from
// the e-MENSCR trees: NATIONAL = the six roots of ns (Y101 ... Y601), the master plans = the 23 roots of mp ("01" ... "23").
// Which strategy a master plan sits under is taken from the structure of the National Strategy (plans 1-2 under security, 3-9 and 23
// under competitiveness, 10-15 human capital, 16-17 equality, 18-19 environment, 20-22 public sector); the administrator can change it.
const EM_NMAP = { N1: "Y101", N2: "Y201", N3: "Y301", N4: "Y401", N5: "Y501", N6: "Y601" };
const EM_MP_NAT = n => (n <= 2 ? "Y101" : n <= 9 || n === 23 ? "Y201" : n <= 15 ? "Y301" : n <= 17 ? "Y401" : n <= 19 ? "Y501" : "Y601");
const emMasterList = () => EM_DATA.mp.rows.filter(r => r[1] === "").map(r => { const n = Number(r[0]), rest = r[2].replace(/^แผนแม่บทภายใต้ยุทธศาสตร์ชาติ\s*ประเด็น\s*/, "").trim(); const th = `แผนแม่บทฯ ประเด็นที่ ${n} ${rest}`; return { id: r[0], nat: EM_MP_NAT(n), name: [th, th] }; });
NATIONAL.length = 0; EM_DATA.ns.rows.filter(r => r[1] === "").forEach(r => { const th = r[2].replace(/^ยุทธศาสตร์(ชาติ)?/, "").trim(); NATIONAL.push({ id: r[0], name: [th, th] }); });
MASTER.length = 0; MASTER.push(...emMasterList());

// ---------- seed: keyword picks on the sample programmes, for the demo ----------
Object.keys(SEEDS).forEach(k => {
  const prev = SEEDS[k].seed;
  SEEDS[k].seed = () => {
    const s = prev(), KW = ["เมือง", "ภาครัฐ", "ภัยธรรมชาติ", "โครงสร้างพื้นฐาน", "สิ่งแวดล้อม", "ดิจิทัล"];
    s.emImports = [];
    s.masterPlans = emMasterList();
    (s.strategy.items || []).forEach(st => { st.nat = EM_NMAP[st.nat] || st.nat; if (!st.mp || !/^\d\d$/.test(st.mp)) { const m = { S1: ["20", 40], S2: ["12", 15], S3: ["20", 10] }[st.id]; st.mp = ""; if (m && s.masterPlans.some(x => x.id === m[0] && x.nat === st.nat)) { st.mp = m[0]; st.minShare = m[1]; } } });
    (s.structure[FORM_FY] || []).filter(n => n.lvl === "program").forEach((n, i) => { // keyword picks, for the demo; Planning changes them on page BQ13
      const kw = KW[i % KW.length], plans = {};
      EM_KINDS.forEach(([pk]) => { const hit = EM_DATA[pk].rows.filter(x => x[3] && x[2].includes(kw)); if (hit.length) plans[pk] = [hit[Math.floor(i / KW.length) % hit.length][0]]; });
      n.plans = plans;
    });
    return s;
  };
});
