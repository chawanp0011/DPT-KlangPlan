// Fisko-KlangFinance, round P26 (16 Nov 2569): the menu "Strategy and programmes" (B2) gets, on the user's brief:
//   1. a new second tab "ยุทธศาสตร์จัดสรร" (allocation strategies): the list is kept by Planning (add, edit, retire);
//   2. the tab "แผนงานตามโครงสร้างยุทธศาสตร์": Planning can now ADD a programme there, and every programme is linked to an allocation strategy
//      (node.alloc); the link can be changed in the same tab (file 98zp: the table, the selected-node panel and the add form);
//   3. every output / project / fund is linked to an agency strategy (กลยุทธ์หน่วยงาน, node.astrat): set in the same tab and in the register of
//      outputs/projects (file 98v: a column and a field).
// Data: S.allocStrats = [{ id: "AS-001", code, name: [th, en], note, retired? }]; program.alloc = the id; output.astrat = the id of an agency strategy
// (S.strategy.items). My choices: the link is optional on an output, and required on a new programme while an active allocation strategy exists;
// the sample strategies and links are samples of mine, marked as such.
const SPA_APP = "DPT Budget";
const alStUsed = a => Object.values(S.structure || {}).some(ns => (ns || []).some(n => n.lvl === "program" && n.alloc === a.id));
const alStProgs = a => (S.structure[FORM_FY] || []).filter(n => n.lvl === "program" && !n.retired && n.alloc === a.id);
const alStReqAmt = a => { const ps = alStProgs(a).map(n => n.id); return sumv(S.requests.filter(r => r.status !== "rejected" && r.act && (lineage(r.act) || []).some(n => ps.includes(n.id))).map(r => Number(r.amount) || 0)); };
CRUD.def("allocSt", {
  noun: ["ยุทธศาสตร์จัดสรร", "Allocation strategy"], st: RET_ST, live: true,
  list: () => S.allocStrats || [], id: a => a.id, title: a => `${a.code} ${tx(a.name)}`, sub: a => `${alStProgs(a).length} ${L("แผนงาน", "programmes")}`, status: a => (a.retired ? "retired" : "live"), gone: a => !!a.retired, search: a => `${a.id} ${a.code} ${a.name.join(" ")}`,
  cols: [{ h: ["รหัส", "Code"], c: a => `<span class="mono">${esc(a.code)}</span>` }, { h: ["ยุทธศาสตร์จัดสรร", "Allocation strategy"], c: a => esc(tx(a.name)) }, { h: ["แผนงานที่เชื่อม", "Programmes linked"], n: true, c: a => alStProgs(a).length }, { h: ["วงเงินคำขอ (ล้านบาท)", "Requests (M baht)"], n: true, c: a => mb(alStReqAmt(a)) }],
  fields: a => [{ id: "code", label: ["รหัส", "Code"], req: true, value: a ? a.code : "" }, { id: "th", label: ["ชื่อยุทธศาสตร์จัดสรร", "Allocation strategy"], req: true, wide: true, value: a ? a.name[0] : "" }, { id: "en", label: ["ภาษาอังกฤษ", "English"], wide: true, value: a ? a.name[1] : "" }, { id: "note", label: ["หมายเหตุ", "Note"], type: "textarea", wide: true, value: a ? a.note || "" : "" }],
  check: (v, a) => ((S.allocStrats || []).some(x => x !== a && x.code === String(v.code).trim() && !x.retired) ? [{ f: "code", m: L("รหัสนี้มีอยู่แล้ว", "That code is already used") }] : []),
  create: { can: spCan, label: ["เพิ่มยุทธศาสตร์จัดสรร", "Add an allocation strategy"], run: v => { const a = { id: "AS-" + String(maxNo((S.allocStrats || []).map(y => y.id), /(\d+)$/) + 1).padStart(3, "0"), code: String(v.code).trim(), name: [v.th, v.en || v.th], note: v.note || "" }; (S.allocStrats = S.allocStrats || []).push(a); audit(["เพิ่มยุทธศาสตร์จัดสรร", "Added an allocation strategy"], `${a.id} ${a.code}`); return a; } },
  edit: { can: a => spCan() && !a.retired, run: (a, v) => { Object.assign(a, { code: String(v.code).trim(), name: [v.th, v.en || v.th], note: v.note || "" }); audit(["แก้ยุทธศาสตร์จัดสรร", "Edited an allocation strategy"], a.id); } },
  acts: a => (spCan() ? retireAct(["ยุทธศาสตร์จัดสรร", "allocation strategy"], alStUsed, y => { S.allocStrats = S.allocStrats.filter(z => z !== y); })(a) : []),
  view: a => kv([[L("รหัส", "Code"), esc(a.code)], [L("ชื่อ", "Name"), esc(tx(a.name))], [L("แผนงานที่เชื่อม", "Programmes linked"), alStProgs(a).map(n => esc(`${n.code} ${tx(n.name)}`)).join("<br>") || "–"], a.note && [L("หมายเหตุ", "Note"), esc(a.note)]]),
});
STRAT["al-st"] = () => `${crudList("allocSt", { head: `<h2>${L("ยุทธศาสตร์จัดสรร", "Allocation strategies")}</h2><span class="sp"></span>${tag(L("ตัวอย่าง กองแผนงานแก้ได้", "Sample; Planning edits"), "p-mute")}` })}
  <p class="sub">${L("กองแผนงานเป็นผู้เพิ่มและแก้ยุทธศาสตร์จัดสรร แต่ละแผนงานตามโครงสร้างยุทธศาสตร์เชื่อมกับยุทธศาสตร์จัดสรร (แท็บแผนงานตามโครงสร้างยุทธศาสตร์) วงเงินคำขอนับจากคำขอที่ไม่ถูกปฏิเสธที่อยู่ใต้แผนงานที่เชื่อม", "Planning adds and edits the allocation strategies; each programme of the strategy structure links to one (tab Programmes by the strategy structure). The request amount counts the requests, not rejected, under the linked programmes")}</p>`;
STRAT_TABS.push({ id: "al-st", label: ["ยุทธศาสตร์จัดสรร", "Allocation strategies"] });
{
  const sp = bPage("strategy"); sp.tabs.splice(1, 0, { id: "alst", keys: ["al-st"], label: ["ยุทธศาสตร์จัดสรร", "Allocation strategies"] });
}

// ---------- the links on a programme (allocation strategy) and on an output (agency strategy) ----------
const emAllocName = id => { const a = (S.allocStrats || []).find(x => x.id === id); return a ? `${a.code} ${tx(a.name)}` : ""; };
const emAgStName = id => { const s = (S.strategy.items || []).find(x => x.id === id); return s ? `${s.id} · ${tx(s.name)}` : ""; };
const emNodeLinkCell = n => { const t = n.lvl === "program" ? emAllocName(n.alloc) : emAgStName(n.astrat); if (n.lvl === "program" && n.ptype) return `<span class="sub">${L("ประเภท", "Kind")}:</span> ${esc(ptName(n.ptype))}<br>` + (t ? `<span class="sub">${L("ยุทธศาสตร์จัดสรร", "Allocation strategy")}:</span> ${esc(t)}` : `<span class="sub">${L("ยังไม่เชื่อมยุทธศาสตร์จัดสรร", "Not linked to an allocation strategy")}</span>`); return t ? `<span class="sub">${n.lvl === "program" ? L("ยุทธศาสตร์จัดสรร", "Allocation strategy") : L("กลยุทธ์หน่วยงาน", "Agency strategy")}:</span> ${esc(t)}` : `<span class="sub">${L("ยังไม่เชื่อม", "Not linked")}</span>`; };
function emLinkSelHtml(n, can) {
  const prog = n.lvl === "program", opts = prog ? (S.allocStrats || []).filter(a => !a.retired).map(a => [a.id, `${a.code} · ${tx(a.name)}`]) : (S.strategy.items || []).map(s => [s.id, `${s.id} · ${tx(s.name)}`]), cur = (prog ? n.alloc : n.astrat) || "", ttl = prog ? L("ยุทธศาสตร์จัดสรร", "Allocation strategy") : L("กลยุทธ์หน่วยงาน", "Agency strategy");
  return `<div style="margin-bottom:14px"><b>${ttl}</b><div class="row" style="margin-top:4px"><select id="em-lk" ${can ? "" : "disabled"} aria-label="${ttl}" style="max-width:520px"><option value="">${L("— ไม่เชื่อม —", "— not linked —")}</option>${opts.map(([v, l]) => `<option value="${esc(v)}" ${cur === v ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>${can && prog && !regUsed(n) ? `<button class="btn ghost" type="button" id="em-delprog">${L("ลบแผนงานนี้", "Delete this programme")}</button>` : ""}</div></div>`;
}
// P33 (17 Nov 2569): adding a programme, and editing one, is a POP-UP with the same fields: code, kind of programme, name (Thai, English), the allocation strategy, and the links to the national plans (e-MENSCR:
// national strategy, master plan, plan 13, reform plan), as the picker of the tab already does for a node. The draft lives in AP while the pop-up is open (the picker re-draws the page when a plan is added).
const PTYPES = { staff: ["แผนงานบุคลากรภาครัฐ", "Government personnel programme"], basic: ["แผนงานพื้นฐาน", "Basic programme"], strategic: ["แผนงานยุทธศาสตร์", "Strategic programme"], integrated: ["แผนงานบูรณาการ", "Integrated programme"] };
const ptName = id => tx(PTYPES[id] || ["–", "–"]);
const AP = { open: false, edit: null, draft: null };
const emApDraft = n => (n ? { code: n.code, type: n.ptype || "", th: n.name[0], alloc: n.alloc || "", plans: JSON.parse(JSON.stringify(n.plans || {})) } : { code: "", type: "", th: "", alloc: "", plans: {} });
function emAddProgHtml() {
  const can = ROLE === "plan" && fyOpen(FORM_FY); if (!can && !AP.open) return "";
  const edit = AP.edit ? emNodes().find(x => x.id === AP.edit) : null, d = AP.draft || emApDraft(edit), al = (S.allocStrats || []).filter(a => !a.retired || a.id === d.alloc);
  const bar = can ? `<section class="panel"><header><h2>${L("แผนงานตามโครงสร้างยุทธศาสตร์", "Programmes of the strategy structure")}</h2><span class="sub">${fyLabel(FORM_FY)}</span><span class="sp"></span><button class="btn primary" type="button" id="em-apopen">+ ${L("เพิ่มแผนงาน", "Add a programme")}</button></header></section>` : "";
  if (!AP.open) return bar;
  return `${bar}<style>.ap-back{position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:60;display:flex;align-items:flex-start;justify-content:center;padding:4vh 16px;overflow:auto}.ap-box{background:var(--surface);color:var(--ink);border-radius:14px;width:min(920px,100%);box-shadow:0 20px 60px rgba(0,0,0,.35)}.ap-box>header{display:flex;align-items:center;gap:8px;padding:14px 18px;border-bottom:1px solid var(--line)}.ap-box>header h2{margin:0;font-size:18px}.ap-body{padding:16px 18px;display:flex;flex-direction:column;gap:14px}.ap-foot{padding:12px 18px;border-top:1px solid var(--line);display:flex;gap:8px;flex-wrap:wrap}</style>
    <div class="ap-back" id="em-apmodal" role="dialog" aria-modal="true" aria-labelledby="ap-title"><div class="ap-box"><header><h2 id="ap-title">${edit ? `${L("แก้ไขแผนงาน", "Edit the programme")} ${esc(edit.code)}` : L("เพิ่มแผนงาน", "Add a programme")}</h2><span class="sp"></span><button class="btn ghost" type="button" id="ap-x" aria-label="${L("ปิด", "Close")}">×</button></header>
      <div class="ap-body"><div class="row" style="align-items:flex-end;gap:10px;flex-wrap:wrap">
        <div class="f" style="flex:0 1 130px"><label for="ap-code">${L("รหัส", "Code")} *</label><input type="text" id="ap-code" maxlength="20" value="${esc(d.code)}"></div>
        <div class="f" style="flex:0 1 230px"><label for="ap-type">${L("ประเภทแผนงาน", "Kind of programme")} *</label><select id="ap-type"><option value="">${L("— เลือก —", "— choose —")}</option>${Object.keys(PTYPES).map(k => `<option value="${k}" ${d.type === k ? "selected" : ""}>${esc(ptName(k))}</option>`).join("")}</select></div>
        <div class="f" style="flex:2 1 300px"><label for="ap-th">${L("ชื่อแผนงาน (ไทย)", "Programme name (Thai)")} *</label><input type="text" id="ap-th" value="${esc(d.th)}"></div>
        <div class="f" style="flex:1 1 300px"><label for="ap-al">${L("เชื่อมโยงยุทธศาสตร์จัดสรร", "Allocation strategy")} *</label><select id="ap-al"><option value="">${L("— เลือก —", "— choose —")}</option>${al.map(a => `<option value="${esc(a.id)}" ${d.alloc === a.id ? "selected" : ""}>${esc(`${a.code} · ${tx(a.name)}`)}</option>`).join("")}</select></div></div>
      <div><b style="font-weight:600">${L("เชื่อมโยงยุทธศาสตร์ชาติและแผนระดับชาติ (e-MENSCR)", "Links to the national strategy and plans (e-MENSCR)")}</b><div style="margin-top:6px">${emPickerHtml(d, true)}</div></div></div>
      <div class="ap-foot"><button class="btn primary" type="button" id="em-addprog">${edit ? L("บันทึกแผนงาน", "Save the programme") : L("เพิ่มแผนงาน", "Add the programme")}</button><button class="btn ghost" type="button" id="ap-cancel">${L("ยกเลิก", "Cancel")}</button>${edit && !regUsed(edit) ? `<span class="sp"></span><button class="btn danger" type="button" id="ap-del">${L("ลบแผนงานนี้", "Delete this programme")}</button>` : ""}</div></div></div>`;
}
function emApBind() {
  const open = (id) => { AP.open = true; AP.edit = id || null; AP.draft = emApDraft(id ? emNodes().find(x => x.id === id) : null); route(); setTimeout(() => { const c = $("#ap-code"); if (c) c.focus(); }, 40); };
  const o = $("#em-apopen"); if (o) o.onclick = () => open(null);
  $$("[data-emedit]").forEach(b => (b.onclick = () => open(b.dataset.emedit)));
  const m = $("#em-apmodal"); if (!m) return; const d = AP.draft; if (!d) return;
  const close = () => { AP.open = false; AP.edit = null; AP.draft = null; route(); };
  $("#ap-x").onclick = close; $("#ap-cancel").onclick = close; m.onclick = e => { if (e.target === m) close(); };
  m.onkeydown = e => { if (e.key === "Escape") close(); };
  [["code", "#ap-code"], ["th", "#ap-th"]].forEach(([k, s]) => ($(s).oninput = e => (d[k] = e.target.value))); $("#ap-type").onchange = e => (d.type = e.target.value); $("#ap-al").onchange = e => (d.alloc = e.target.value);
  emPickerBind(d);
  $("#em-addprog").onclick = () => { const v = { code: d.code, th: d.th, alloc: d.alloc, ptype: d.type, plans: d.plans }, msg = AP.edit ? emEditProg(AP.edit, v) : emAddProg(v); if (msg) { toast(msg); return; } const was = AP.edit; commit(); AP.open = false; AP.edit = null; AP.draft = null; route(); toast(was ? L("บันทึกแผนงานแล้ว", "Programme saved") : L("เพิ่มแผนงานแล้ว", "Programme added")); };
  const dl = $("#ap-del"); if (dl) dl.onclick = () => { const msg = emDelProg(AP.edit); if (msg) { toast(msg); return; } commit(); AP.open = false; AP.edit = null; AP.draft = null; route(); toast(L("ลบแผนงานแล้ว", "Programme deleted")); };
  const c = $("#ap-code"); if (c && document.activeElement === document.body) c.focus();
}
const emNodePrefix = () => { const a = S.structure[FORM_FY] || []; return a[0] && /^\d\d-/.test(a[0].id) ? a[0].id.slice(0, 3) : ""; };
// each returns "" when it worked, else the reason (the page and the tests share the rules)
function emSetLink(id, val) {
  if (!emNodeCan()) return L("เฉพาะกองแผนงานและผู้ดูแลระบบเชื่อมโยงได้ ในปีที่ยังไม่ปิด", "Only Planning and the administrator can link, while the year is open");
  const n = emNodes().find(x => x.id === id); if (!n) return L("ไม่พบรายการนี้", "That item was not found");
  const v = String(val || "");
  if (n.lvl === "program") { if (v && !(S.allocStrats || []).some(a => a.id === v && !a.retired)) return L("ยุทธศาสตร์จัดสรรไม่ถูกต้อง", "The allocation strategy is not valid"); if (v) n.alloc = v; else delete n.alloc; }
  else { if (v && !(S.strategy.items || []).some(s => s.id === v)) return L("กลยุทธ์หน่วยงานไม่ถูกต้อง", "The agency strategy is not valid"); if (v) n.astrat = v; else delete n.astrat; }
  audit(n.lvl === "program" ? ["เชื่อมแผนงานกับยุทธศาสตร์จัดสรร", "Linked a programme to an allocation strategy"] : ["เชื่อมผลผลิต/โครงการกับกลยุทธ์หน่วยงาน", "Linked an output to an agency strategy"], `${n.code} · ${v || "–"}`);
  return "";
}
function emProgCheck(v, except) { // "" when the values are good, else the reason
  const code = String(v.code || "").trim(), th = String(v.th || "").trim(), al = String(v.alloc || ""), pt = String(v.ptype || "");
  if (!code || !th) return L("ใส่รหัสและชื่อแผนงาน", "Give the code and the name"); if (!PTYPES[pt]) return L("เลือกประเภทแผนงาน", "Choose the kind of programme");
  if ((S.structure[FORM_FY] || []).some(n => n !== except && n.code === code)) return L("รหัสนี้มีอยู่แล้ว", "That code is already used");
  const active = (S.allocStrats || []).filter(a => !a.retired); if (active.length && !al) return L("เลือกยุทธศาสตร์จัดสรรที่เชื่อม", "Choose the allocation strategy to link");
  if (al && !(S.allocStrats || []).some(a => a.id === al && (!a.retired || (except && except.alloc === al)))) return L("ยุทธศาสตร์จัดสรรไม่ถูกต้อง", "The allocation strategy is not valid");
  if (v.plans && Object.keys(v.plans).some(k => !EM_KINDS.some(x => x[0] === k) || !Array.isArray(v.plans[k]))) return L("แผนระดับชาติที่เชื่อมไม่ถูกต้อง", "The national plan links are not valid"); return "";
}
const emPlansOf = p => { const o = {}; EM_KINDS.forEach(([k]) => (o[k] = [...new Set((p && p[k]) || [])].slice(0, 1))); return o; };
function emAddProg(v) {
  if (ROLE !== "plan") return L("เฉพาะกองแผนงานเพิ่มแผนงานได้", "Only Planning can add a programme"); if (!fyOpen(FORM_FY)) return L("ปีงบประมาณนี้ปิดแล้ว", "This fiscal year is closed");
  const bad = emProgCheck(v, null); if (bad) return bad; const code = String(v.code).trim(), th = String(v.th).trim(), en = String(v.en || "").trim(), al = String(v.alloc || "");
  const n = { id: emNodePrefix() + code.replace(/\./g, "-"), lvl: "program", code, parent: null, name: [th, en || th], ptype: v.ptype, plans: emPlansOf(v.plans) }; if (al) n.alloc = al;
  if ((S.structure[FORM_FY] || []).some(x => x.id === n.id)) return L("รหัสนี้มีอยู่แล้ว", "That code is already used");
  S.structure[FORM_FY].push(n); audit(["เพิ่มแผนงานตามโครงสร้างยุทธศาสตร์", "Added a programme to the strategy structure"], `${FORM_FY} · ${code} ${th}`); return "";
}
function emEditProg(id, v) {
  if (!emNodeCan()) return L("เฉพาะกองแผนงานและผู้ดูแลระบบแก้ได้ ในปีที่ยังไม่ปิด", "Only Planning and the administrator can edit, while the year is open");
  const n = emNodes().find(x => x.id === id && x.lvl === "program"); if (!n) return L("ไม่พบแผนงาน", "Programme not found"); const bad = emProgCheck(v, n); if (bad) return bad;
  Object.assign(n, { code: String(v.code).trim(), name: [String(v.th).trim(), String(v.en || "").trim() || String(v.th).trim()], ptype: v.ptype, plans: emPlansOf(v.plans) }); if (v.alloc) n.alloc = v.alloc; else delete n.alloc;
  audit(["แก้แผนงานตามโครงสร้างยุทธศาสตร์", "Edited a programme of the strategy structure"], `${FORM_FY} · ${n.code}`); return "";
}
function emDelProg(id) {
  if (ROLE !== "plan") return L("เฉพาะกองแผนงานลบได้", "Only Planning can delete");
  const n = (S.structure[FORM_FY] || []).find(x => x.id === id && x.lvl === "program"); if (!n) return L("ไม่พบแผนงาน", "Programme not found");
  if (regUsed(n)) return L("แผนงานนี้มีผลผลิต/โครงการหรือคำขออ้างถึงแล้ว ลบไม่ได้", "Something refers to this programme, so it can't be deleted");
  S.structure[FORM_FY] = S.structure[FORM_FY].filter(x => x !== n); audit(["ลบแผนงานตามโครงสร้างยุทธศาสตร์", "Deleted a programme of the strategy structure"], `${FORM_FY} · ${n.code}`);
  return "";
}

// ---------- seed: samples of mine ----------
Object.keys(SEEDS).forEach(k => {
  const prev = SEEDS[k].seed;
  SEEDS[k].seed = () => {
    const s = prev(), nm = a => [a, a], items = (s.strategy && s.strategy.items) || [];
    s.allocStrats = [{ id: "AS-001", code: "AL1", name: nm("ยุทธศาสตร์จัดสรร: พัฒนาบริการและเทคโนโลยีดิจิทัล (ตัวอย่าง)"), note: "" }, { id: "AS-002", code: "AL2", name: nm("ยุทธศาสตร์จัดสรร: บริหารจัดการองค์กรและทรัพยากร (ตัวอย่าง)"), note: "" }, { id: "AS-003", code: "AL3", name: nm("ยุทธศาสตร์จัดสรร: พัฒนาบุคลากร (ตัวอย่าง)"), note: "" }];
    let pi = 0, oi = 0;
    Object.values(s.structure || {}).forEach(ns => (ns || []).forEach(n => { if (n.lvl === "program") { n.alloc = s.allocStrats[pi % s.allocStrats.length].id; pi++; n.ptype = /บุคลากร/.test(n.name[0]) ? "staff" : /พื้นฐาน/.test(n.name[0]) ? "basic" : /บูรณาการ/.test(n.name[0]) ? "integrated" : "strategic"; } else if (n.lvl === "output" && items.length) { n.astrat = items[oi % items.length].id; oi++; } }));
    return s;
  };
});
