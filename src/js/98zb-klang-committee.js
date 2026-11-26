// KlangFinance, procurement round P1 (9 Nov 2569, redone 10 Nov 2569): committees for procurement.
// The central part is the COMMITTEE TYPE (page CM4), kept by the head of procurement and administrators, shared by every
// unit. A type has a name, a description, how it works (TOR, evaluation, purchasing, acceptance, other), the member
// positions it needs (CM6: name, fewest and most people, who may fill it, which one is the chair), whether construction
// needs a technical member, and which other types in the SAME procurement case its members must not also sit on.
// The committees themselves belong to a procurement case: the case page lists every type the case needs, and for each one the
// officer (or the division that owns the case) makes the committee, fills the positions, and can come back to change the
// members after the meeting. The number of people in each position is the officer's or the meeting's choice, inside the
// range the type allows. The register pages (CM1, CM2) list the committees of all cases.
// A member is a person with an account (a user in this system) or an outside person (name, agency, position, no account).
// c.committees.tor / eval / buy on a case is kept as a copy of the register (user members only), because COI declarations,
// scoring and fee reports in other files read it; an outside member has no account, so no COI or score is kept for them.
// An outside member cannot sign in, so the procurement officer records the acceptance for them (see the end of this file).
// All numbers and rules below are sample values to confirm with the procurement rules; nothing is taken from any law.
// The prototype stores the file NAME of an order or a letter only, not the file.
const CM_APP = "DPT Procurement";
const CM_ROLES = ["div", "divhead", "proc", "prochead"];
const CM_KINDS = { tor: ["จัดทำ TOR", "TOR"], ref: ["กำหนดราคากลาง", "Reference price"], eval: ["พิจารณาผลประกวดราคาอิเล็กทรอนิกส์", "Evaluation (e-bidding)"], quote: ["พิจารณาผลการสอบราคา", "Evaluation (price inquiry)"], buy: ["ซื้อหรือจ้างโดยวิธีคัดเลือก", "Purchasing (selective)"], specific: ["ซื้อหรือจ้างโดยวิธีเฉพาะเจาะจง", "Purchasing (specific)"], accept: ["ตรวจรับพัสดุ", "Acceptance"], other: ["อื่น ๆ", "Other"] };
const CM_UNIQUE = ["tor", "ref", "eval", "quote", "buy", "specific", "accept"]; // each of these works for one type only
const CM_MODES = { none: ["ไม่จำกัด", "No limit"], all: ["ห้ามซ้ำทุกคน", "No one may overlap"], chair: ["ห้ามประธานของคณะนี้ซ้ำ", "This committee's chair may not overlap"] };
const CM_WHO = { any: ["ผู้ใช้ในระบบหรือคนนอก", "System user or outside"], user: ["ผู้ใช้ในระบบเท่านั้น", "System user only"], ext: ["คนนอกเท่านั้น", "Outside person only"] };
const cmTypeAdmin = () => ["admin", "prochead"].includes(ROLE);
const cmActor = () => CM_ROLES.includes(ROLE);
const cmCaseUnit = c => famLine(famPlan(c.plan).line).unit;
const cmById = id => (S.cmReg || []).find(c => c.id === id);
const cmMembers = id => (S.cmMem || []).filter(m => m.cm === id);
const cmTypeById = id => (S.cmTypes || []).find(t => t.id === id);
const cmTypeOf = cm => cmTypeById(cm.type);
const cmKindOf = cm => (cmTypeOf(cm) || {}).kind || "other";
const cmSlotsOf = typeId => (S.cmSlots || []).filter(s => s.type === typeId);
// The kind of work (goods, services, construction, consulting) adjusts the committees: a type can apply to some kinds only (T.kinds, empty = all),
// and can need a member with a technical background for some kinds (T.techKinds; the older T.techConstruction means "construction").
const cmTechKinds = T => (T && T.techKinds) || (T && T.techConstruction ? ["construction"] : []);
const cmApplies = (T, kind) => !kind || !T || !T.kinds || !T.kinds.length || T.kinds.includes(kind);
// The type that works as `key` for a case of this kind: one made for this kind first, then one for all kinds.
const cmTypeFor = (key, kind) => { const c = (S.cmTypes || []).filter(t => t.kind === key && !t.retired); return c.find(t => t.kinds && t.kinds.length && cmApplies(t, kind)) || c.find(t => cmApplies(t, kind)) || c[0]; };
const cmTName = cm => tx((cmTypeOf(cm) || { name: ["–", "–"] }).name);
const cmNextId = (list, pre) => `${pre}-${String(Math.max(0, ...list.map(x => Number(String(x.id).split("-")[1]) || 0)) + 1).padStart(3, "0")}`;
const cmPerson = m => (m.kind === "user" ? userName(m.user) : m.name || "–");
const cmPk = m => (m.kind === "user" ? "u:" + m.user : "x:" + String(m.name || "").trim().toLowerCase() + "|" + String(m.agency || "").trim().toLowerCase());
const cmLine = m => `${esc(cmPerson(m))}${m.role === "chair" ? ` (${L("ประธาน", "chair")})` : ""}`;
const cmCaseLabel = cm => (cm.case && caseOf(cm.case) ? `${cm.case} · ${caseName(caseOf(cm.case))}` : L("ไม่ผูกกับรายการจัดซื้อ", "No case"));
const cmCanNew = c => !c.cancelled && (isProcRole() || (["div", "divhead"].includes(ROLE) && cmCaseUnit(c) === me().unit));
const cmLocked = cm => S.contracts.some(k => k.cm === cm.id && k.phases.some(ph => ph.signs.length));
const cmCan = cm => !!cm && !cm.retired && (isProcRole() || (["div", "divhead"].includes(ROLE) && cm.case && caseOf(cm.case) && cmCaseUnit(caseOf(cm.case)) === me().unit));
const cmNames = c => (c.cm && cmById(c.cm) ? `${esc(cmById(c.cm).order)} · ${cmMembers(c.cm).map(cmLine).join(", ") || "–"}` : (c.inspectors || []).map(id => esc(userName(id))).join(", "));
const cmMeta = m => (m.kind === "user" ? tx(ROLES[(S.users.find(u => u.id === m.user) || {}).role] || ["", ""]) : [m.agency, m.position].filter(Boolean).join(" · "));

// ---------- documents attached to a committee (order, minutes, letters, declarations, others) ----------
// A picked file is stored with its name, size and type; a file up to 200 KB also keeps its content (so it can be opened again
// from the browser's saved data); a bigger one keeps the name only, because the prototype saves everything in the browser.
const CM_DOC_KINDS = { order: ["คำสั่งแต่งตั้ง", "Appointment order"], minutes: ["รายงานการประชุม / มติ", "Minutes / resolution"], letter: ["หนังสือมอบหมาย / หนังสือแจ้ง", "Letter"], decl: ["แบบแจ้ง / คุณสมบัติ", "Declaration / qualification"], other: ["เอกสารอื่น", "Other"] };
const CM_DATA_MAX = 200 * 1024;
let CM_PEND = { order: [], other: [] }; // files picked on the register's "add a committee" form, before it is saved
const cmDocsOf = id => (S.cmDocs || []).filter(d => d.cm === id);
function cmReadFiles(files) {
  return Promise.all([...files].map(f => new Promise(res => { const base = { name: f.name, size: f.size, type: f.type || "" }; if (f.size > CM_DATA_MAX) return res(base); const r = new FileReader(); r.onload = () => res(Object.assign(base, { data: String(r.result) })); r.onerror = () => res(base); r.readAsDataURL(f); })));
}
function cmAddDocs(cm, kind, items, note) {
  S.cmDocs = S.cmDocs || []; items.forEach(it => S.cmDocs.push({ id: cmNextId(S.cmDocs, "CMD"), cm: cm.id, kind, name: it.name, size: it.size || 0, type: it.type || "", data: it.data || "", note: note || "", by: me().id, t: nowIso() }));
  if (kind === "order" && items[0] && !cm.doc) cm.doc = items[0].name;
}
function cmDocPanel(cm, can) {
  const docs = cmDocsOf(cm.id), orders = docs.filter(d => d.kind === "order").length;
  return `<div class="cmdocs"><b style="font-weight:600">${L("เอกสารแนบ", "Documents")}</b> <span class="sub">(${docs.length})</span>
    ${docs.length ? `<ul style="margin:4px 0;padding-left:18px">${docs.map(d => `<li>${tag(tx(CM_DOC_KINDS[d.kind] || CM_DOC_KINDS.other), "p-mute")} ${d.data ? `<a href="${d.data}" download="${esc(d.name)}">${esc(d.name)}</a>` : esc(d.name)} <span class="sub">· ${d.size ? Math.max(1, Math.round(d.size / 1024)) + " KB · " : ""}${fdate(d.t)} · ${esc(userName(d.by))}${d.note ? " · " + esc(d.note) : ""}${d.data ? "" : " · " + L("เก็บเฉพาะชื่อไฟล์", "file name only")}</span>${can && !(d.kind === "order" && orders <= 1) ? ` <button class="btn ghost" type="button" data-cmdocdel="${d.id}" aria-label="${L("ลบเอกสาร", "Remove the document")}">×</button>` : ""}</li>`).join("")}</ul>` : `<div class="sub">—</div>`}
    ${can ? `<form class="inline-form" data-cmdoc="${cm.id}" style="margin-top:4px"><div class="f" style="flex:0 1 200px"><select name="kind" aria-label="${L("ชนิดเอกสาร", "Kind")}">${Object.keys(CM_DOC_KINDS).map(k => `<option value="${k}">${esc(tx(CM_DOC_KINDS[k]))}</option>`).join("")}</select></div><div class="f" style="flex:1 1 200px"><input type="file" name="files" multiple required aria-label="${L("ไฟล์", "Files")}"></div><div class="f" style="flex:1 1 140px"><input type="text" name="note" placeholder="${L("หมายเหตุ", "Note")}"></div><button class="btn" type="submit">${L("แนบเอกสาร", "Attach")}</button></form>` : ""}</div>`;
}
const cmFileFields = () => `<div class="f" style="flex:1 1 220px"><label>${L("ไฟล์คำสั่งแต่งตั้ง", "Appointment order file")}</label><input type="file" name="fo" required></div><div class="f" style="flex:1 1 220px"><label>${L("เอกสารอื่นที่เกี่ยวข้อง (หลายไฟล์ได้)", "Other related documents (several allowed)")}</label><input type="file" name="fx" multiple></div>`;

// ---------- the same person on two related committees of one case ----------
// A type holds, for each other type, a rule about the same procurement case: mode (none, all, chair) and a share cap in
// percent (members that also sit on the other committee must not be more than that share of THIS committee; blank = no cap).
const cmRule = (a, otherType) => ((cmTypeOf(a) || {}).rules || {})[otherType];
function cmViol(cm) {
  if (!cm.case) return [];
  const out = [], peers = S.cmReg.filter(o => o.id !== cm.id && o.case === cm.case && !o.retired && o.status !== "ended");
  const pair = (a, b) => { const r = cmRule(a, b.type); if (!r) return; const Ma = cmMembers(a.id), kb = cmMembers(b.id).map(cmPk), shared = Ma.filter(m => kb.includes(cmPk(m))), nm = shared.map(cmPerson).join(", "), pre = `${cmTName(a)} / ${cmTName(b)}`;
    if (r.mode === "all" && shared.length) out.push({ a, b, why: `${pre}: ${L("ห้ามซ้ำ แต่ซ้ำ", "no overlap, but")} ${nm}` });
    const ch = Ma.find(m => m.role === "chair"); if (r.mode === "chair" && ch && kb.includes(cmPk(ch))) out.push({ a, b, why: `${pre}: ${L("ประธานซ้ำกับอีกคณะ", "the chair also sits on the other")} (${cmPerson(ch)})` });
    if (r.pct !== "" && r.pct != null && Ma.length && shared.length > Ma.length * r.pct / 100) out.push({ a, b, why: `${pre}: ${L("ซ้ำ", "overlap")} ${shared.length}/${Ma.length} ${L("คน เกิน", "people, over")} ${r.pct}%` }); };
  peers.forEach(o => { pair(cm, o); pair(o, cm); }); return out;
}
const cmClash = cm => cmViol(cm);
// What adding or changing one member would newly break (probe: kind, user or name+agency, role).
function cmClashFor(cm, probe, except) {
  const keep = S.cmMem, before = (S.cmMem = keep.filter(x => x !== except), cmViol(cm).map(x => x.why)); S.cmMem.push(Object.assign({ id: "~", cm: cm.id }, probe)); const after = cmViol(cm); S.cmMem = keep; return after.filter(x => !before.includes(x.why));
}

// ---------- check one committee against its type ----------
function cmCheck(cm, ctx) {
  ctx = ctx || {}; const T = cmTypeOf(cm) || {}, SL = cmSlotsOf(T.id), M = cmMembers(cm.id), cs = ctx.cs || (cm.case ? caseOf(cm.case) : null), kind = ctx.kind || (cs && cs.kind), amt = ctx.amount || 0;
  const relax = T.kind === "accept" && amt > 0 && amt <= S.pcfg.specificMax && !!cs && cs.method === "specific", ok = (v, th, en) => ({ ok: !!v, label: L(th, en) }), out = [];
  out.push(ok(!cm.retired && cm.status !== "ended", "คำสั่งแต่งตั้งยังมีผล", "The order is still in force"));
  out.push(ok(cm.order && cm.date && cm.doc, "มีเลขที่คำสั่ง วันที่ และชื่อไฟล์คำสั่งแต่งตั้ง", "Order number, date and file name are recorded"));
  SL.forEach(s => { const n = M.filter(m => m.slot === s.id).length, min = relax ? 0 : s.min, max = s.max === "" || s.max == null ? null : s.max;
    out.push(ok(n >= min && (max == null || n <= max), `${tx(s.name)}: ${n} คน (กำหนด ${min}${max == null ? " ขึ้นไป" : max === min ? "" : "–" + max})`, `${tx(s.name)}: ${n} (allowed ${min}${max == null ? "+" : max === min ? "" : "–" + max})`)); });
  if (relax) out.push(ok(M.length >= 1, `ผู้ตรวจรับพัสดุอย่างน้อย 1 คน (วิธีเฉพาะเจาะจง วงเงินไม่เกิน ${fmt(S.pcfg.specificMax)} บาท)`, `At least 1 inspector (specific method, up to ${fmt(S.pcfg.specificMax)} baht)`));
  { const ne = M.filter(m => m.kind === "ext").length, mx = T.extMax === "" || T.extMax == null ? 2 : T.extMax; out.push(ok(ne <= mx, `คนนอกไม่เกิน ${mx} คน (มี ${ne})`, `Outside people at most ${mx} (has ${ne})`)); }
  out.push(ok(M.every(m => SL.some(s => s.id === m.slot)), "สมาชิกทุกคนอยู่ในตำแหน่งที่ประเภทกำหนด", "Every member holds a position the type defines"));
  out.push(ok(M.every(m => { const s = SL.find(x => x.id === m.slot); return !s || s.who === "any" || s.who === (m.kind === "user" ? "user" : "ext"); }), "ผู้ดำรงตำแหน่งเป็นชนิดที่ตำแหน่งกำหนด (ผู้ใช้/คนนอก)", "Each member is the kind the position allows"));
  out.push(ok(M.every(m => (m.kind === "user" ? m.user : m.name && m.agency && m.position)), "สมาชิกคนนอกระบุชื่อ หน่วยงาน ตำแหน่งครบ", "Outside members have name, agency and position"));
  if (!cmApplies(T, kind)) out.push(ok(false, `ประเภทนี้ไม่ใช้กับชนิดงานนี้ (${tx(KINDS[kind] || ["", ""])})`, `This type does not apply to this kind of work (${tx(KINDS[kind] || ["", ""])})`));
  if (kind && cmTechKinds(T).includes(kind)) out.push(ok(M.some(m => m.tech), `ชนิดงาน ${tx(KINDS[kind])}: มีกรรมการที่มีความรู้ด้านช่าง/วิศวกรรม`, `Kind of work ${tx(KINDS[kind])}: a member with a technical background`));
  if (cm.case) { const cl = cmViol(cm); out.push({ ok: !cl.length, label: cl.length ? cl.map(x => x.why).join(" · ") : L("ไม่ผิดเงื่อนไขการซ้ำซ้อนกับคณะอื่นในการจัดซื้อนี้", "No overlap rule is broken with the other committees of this case") }); }
  if (sodOn("SD-02")) out.push(ok(!M.some(m => m.kind === "user" && ["proc", "prochead"].includes((S.users.find(u => u.id === m.user) || {}).role)), "ไม่มีเจ้าหน้าที่พัสดุเป็นกรรมการ (SD-02)", "No procurement officer as a member (SD-02)"));
  return out;
}
const cmBad = (cm, ctx) => cmCheck(cm, ctx).filter(x => !x.ok);
const cmComplete = id => { const cm = cmById(id); return !!cm && cmBad(cm).length === 0; };
const cmUserIds = cm => cmMembers(cm.id).filter(m => m.kind === "user").map(m => m.user);

// ---------- keep the case's own copy (c.committees) in step with the register ----------
function cmSync() {
  (S.cases || []).forEach(c => { c.committees = c.committees || {};
    ["tor", "eval", "buy"].forEach(k => {
      const cm = S.cmReg.find(x => x.case === c.id && !x.retired && x.status !== "ended" && cmKindOf(x) === k);
      if (!cm) { if (c.committees[k] && c.committees[k].cm) delete c.committees[k]; return; }
      const M = cmMembers(cm.id), ch = M.find(m => m.role === "chair" && m.kind === "user");
      c.committees[k] = { order: cm.order, date: cm.date, chair: ch ? ch.user : "", members: M.filter(m => m.kind === "user" && m !== ch).map(m => m.user), t: (c.committees[k] && c.committees[k].t) || nowIso(), cm: cm.id };
    }); });
}
// A committee made before the register (or by an agent in file 67b) is brought into the register once.
function cmAdopt() {
  if (!S.cmReg || !S.cmTypes) return;
  (S.cases || []).forEach(c => ["tor", "eval", "buy"].forEach(k => { const o = (c.committees || {})[k]; if (!o || o.cm) return; const T = cmTypeFor(k, c.kind); if (!T) return;
    const cm = { id: cmNextId(S.cmReg, "CM"), type: T.id, case: c.id, order: o.order || "–", date: o.date || TODAY, doc: "", note: "นำเข้าจากข้อมูลเดิม", status: "live", by: me().id }; S.cmReg.push(cm); const SL = cmSlotsOf(T.id), cs = SL.find(s => s.chair) || SL[0], ms = SL.find(s => !s.chair) || SL[0];
    if (o.chair) S.cmMem.push({ id: cmNextId(S.cmMem, "CMM"), cm: cm.id, slot: cs && cs.id, kind: "user", user: o.chair, role: "chair", tech: false, exp: "" });
    (o.members || []).forEach(u => S.cmMem.push({ id: cmNextId(S.cmMem, "CMM"), cm: cm.id, slot: ms && ms.id, kind: "user", user: u, role: "member", tech: false, exp: "" })); o.cm = cm.id; }));
}

// ---------- using a committee on a contract ----------
function cmSelect(id, ctx, cur) {
  const list = ctx.cs ? S.cmReg.filter(cm => cm.case === ctx.cs.id && cmKindOf(cm) === "accept" && !cm.retired) : [];
  return `<select id="${id}" ${list.length ? "" : "disabled"}>${list.map(cm => { const bad = cmBad(cm, ctx); return `<option value="${cm.id}" ${cm.id === cur ? "selected" : ""} ${bad.length ? "disabled" : ""}>${esc(cm.order)} · ${esc(cmTName(cm))}${bad.length ? ` — ${L("ยังใช้ไม่ได้", "not usable")}: ${esc(bad[0].label)}` : ""}</option>`; }).join("") || `<option>${L("ยังไม่มีคณะกรรมการตรวจรับของรายการจัดซื้อนี้ ตั้งที่หน้ารายการจัดซื้อ ส่วนคณะกรรมการ", "No acceptance committee for this case yet; make one on the case page, Committees")}</option>`}</select>`;
}
function cmApply(cmId, ctx, itemId) {
  const cm = cmById(cmId); if (!cm) { toast(L("เลือกคณะกรรมการตรวจรับของรายการจัดซื้อนี้", "Choose this case's acceptance committee")); return null; }
  const bad = cmBad(cm, ctx)[0]; if (bad) { toast(`${L("คณะกรรมการนี้ยังใช้ไม่ได้", "This committee can't be used yet")}: ${bad.label}`); return null; }
  const insp = cmUserIds(cm);
  if (!sodCheck("SD-02", [me().id], insp, itemId)) return null;
  return { cm, insp, need: Math.min(PHASE_SIGNS, Math.max(1, cmMembers(cm.id).length)) }; // signatures a phase needs: 2, or 1 for a lone inspector
}

// ---------- on the case page: every type the case needs, with the positions to fill ----------
function cmCaseBlock(c, key) {
  cmAdopt(); const T = S.cmTypes.find(t => t.id === key) || cmTypeFor(key, c.kind);
  if (!T) return `<div class="sub">${esc(key)}: ${L("ยังไม่มีประเภทคณะกรรมการนี้ในทะเบียน (CM4)", "No such committee type in the register (CM4)")}</div>`;
  const cm = S.cmReg.find(x => x.case === c.id && x.type === T.id && !x.retired), can = cm ? cmCan(cm) : cmCanNew(c), SL = cmSlotsOf(T.id), M = cm ? cmMembers(cm.id) : [], bad = cm ? cmBad(cm) : [], locked = cm && cmLocked(cm);
  const head = `<b style="font-weight:600">${esc(tx(T.name))}</b> ${cm ? tag(bad.length ? L("ยังไม่ครบเงื่อนไข", "Not complete") : L("ครบเงื่อนไข", "Complete"), bad.length ? "p-warn" : "p-ok") : tag(L("ยังไม่แต่งตั้ง", "Not appointed"), "p-mute")}${T.desc ? `<div class="sub">${esc(T.desc)}</div>` : ""}`;
  if (!cm) return `<div class="cmb">${head}${can ? `<form class="inline-form" data-cmnew="${c.id}|${T.id}" style="margin-top:6px"><div class="f" style="flex:0 1 160px"><label>${L("เลขที่คำสั่ง", "Order no.")}</label><input type="text" name="order" required></div>
      <div class="f" style="flex:0 1 160px"><label>${L("ลงวันที่", "Dated")}</label><input type="date" name="date" value="${TODAY}" required></div>${cmFileFields()}
      <button class="btn primary" type="submit">${L("ตั้งคณะกรรมการ แล้วใส่สมาชิก", "Make the committee, then add members")}</button></form>` : `<div class="sub">${L("พัสดุหรือหน่วยเจ้าของเรื่องตั้งคณะได้", "Procurement or the owning unit can make it")}</div>`}</div>`;
  const users = S.users.filter(u => u.active && u.role !== "admin");
  const row = s => { const mm = M.filter(m => m.slot === s.id), max = s.max === "" || s.max == null ? null : s.max, full = max != null && mm.length >= max;
    return `<tr><td>${esc(tx(s.name))}${s.chair && !/ประธาน|chair/i.test(tx(s.name)) ? ` <span class="sub">(${L("ประธาน", "chair")})</span>` : ""}<div class="sub">${s.min}${max == null ? "+" : max === s.min ? "" : "–" + max} ${L("คน", "people")} · ${esc(tx(CM_WHO[s.who]))}</div></td>
      <td>${mm.map(m => `<span class="pill p-mute" style="margin:0 4px 4px 0">${esc(cmPerson(m))}${m.kind === "ext" ? ` · ${esc(m.agency)}` : ""}${m.tech ? ` · ${L("ช่าง", "tech")}` : ""}${can && !locked ? ` <button class="btn ghost" type="button" data-cmdel="${m.id}" aria-label="${L("นำออก", "Remove")}">×</button>` : ""}</span>`).join("") || `<span class="sub">—</span>`}
        ${can && !locked && !full ? `<form class="inline-form" data-cmadd="${cm.id}|${s.id}" style="margin-top:4px">${s.who !== "ext" ? `<div class="f" style="flex:1 1 170px"><select name="u" aria-label="${L("ผู้ใช้ในระบบ", "System user")}"><option value="">${L("— ผู้ใช้ในระบบ —", "— system user —")}</option>${users.map(u => `<option value="${u.id}">${esc(tx(u.name))} · ${esc(tx(ROLES[u.role]))}</option>`).join("")}</select></div>` : ""}
          ${s.who !== "user" ? `<div class="f" style="flex:1 1 130px"><input type="text" name="en" placeholder="${L("หรือคนนอก: ชื่อ-สกุล", "or outside: full name")}"></div><div class="f" style="flex:1 1 120px"><input type="text" name="ea" placeholder="${L("หน่วยงาน", "Agency")}"></div><div class="f" style="flex:1 1 110px"><input type="text" name="ep" placeholder="${L("ตำแหน่ง", "Position")}"></div>` : ""}
          <label class="field-inline"><input type="checkbox" name="tech"> ${L("ช่าง/วิศวกรรม", "technical")}</label><button class="btn" type="submit">${L("เพิ่ม", "Add")}</button></form>` : ""}</td></tr>`; };
  return `<div class="cmb">${head}
    <div class="sub">${L("คำสั่งที่", "Order")} ${esc(cm.order)} · ${fdate(cm.date)} · ${esc(cm.doc || "–")}${locked ? ` · ${L("มีการลงนามตรวจรับแล้ว แก้สมาชิกไม่ได้", "acceptance signed; members locked")}` : ""}</div>
    <div class="tbl-wrap"><table><thead><tr><th>${L("ตำแหน่ง", "Position")}</th><th>${L("สมาชิก", "Members")}</th></tr></thead><tbody>${SL.map(row).join("")}</tbody></table></div>
    ${bad.length ? `<div class="sub" style="color:var(--bad)">${bad.map(x => "✗ " + esc(x.label)).join("<br>")}</div>` : `<div class="sub">✓ ${L("ครบตามโครงสร้างและเงื่อนไขของประเภทนี้", "Meets this type's structure and conditions")}</div>`}
    ${cmDocPanel(cm, cmCan(cm))}
    ${can && !locked ? `<details><summary class="sub" style="cursor:pointer">${L("แก้เลขที่และวันที่ของคำสั่ง", "Edit the order number and date")}</summary><form class="inline-form" data-cmmeta="${cm.id}" style="margin-top:4px"><div class="f" style="flex:0 1 160px"><input type="text" name="order" value="${esc(cm.order)}" required></div><div class="f" style="flex:0 1 160px"><input type="date" name="date" value="${cm.date}" required></div><button class="btn" type="submit">${L("บันทึก", "Save")}</button></form></details>` : ""}</div>`;
}
function cmCaseSection(c) {
  cmAdopt(); const keys = [...new Set([...requiredCommittees(c), ...["tor", "eval", "buy"].filter(k => (c.committees || {})[k]), ...(c.method === "specific" ? ["specific"] : []), "ref", "accept"])], inCase = S.cmReg.filter(x => x.case === c.id && !x.retired).map(x => x.type);
  const shown = keys.map(k => (cmTypeFor(k, c.kind) || {}).id), extra = [...new Set(inCase)].filter(t => !shown.includes(t) && cmTypeById(t)), addable = S.cmTypes.filter(t => !t.retired && cmApplies(t, c.kind) && !shown.includes(t.id) && !extra.includes(t.id));
  return `${requiredCommittees(c).length ? "" : `<span class="sub">${L("วิธีจัดหานี้ไม่ต้องมีคณะกรรมการ TOR หรือพิจารณาผลตามค่าตั้ง", "This method needs no TOR or evaluation committee under the settings")}</span>`}
    ${[...keys, ...extra].map(k => cmCaseBlock(c, k)).join("")}
    ${addable.length && cmCanNew(c) ? `<form class="inline-form" data-cmaddtype="${c.id}"><div class="f" style="flex:1 1 240px"><label>${L("เพิ่มคณะกรรมการประเภทอื่น", "Add another type of committee")}</label><select name="t">${addable.map(t => `<option value="${t.id}">${esc(tx(t.name))}</option>`).join("")}</select></div><div class="f" style="flex:0 1 160px"><label>${L("เลขที่คำสั่ง", "Order no.")}</label><input type="text" name="order" required></div><div class="f" style="flex:0 1 160px"><label>${L("ลงวันที่", "Dated")}</label><input type="date" name="date" value="${TODAY}" required></div>${cmFileFields()}<button class="btn" type="submit">${L("เพิ่มคณะ", "Add the committee")}</button></form>` : ""}
    <div class="sub">${L("ประเภท โครงสร้างตำแหน่ง และเงื่อนไขซ้ำซ้อนกำหนดที่หน้า CM4 และ CM6 · คณะตรวจรับใช้ตอนทำสัญญา · สำนัก/กองเจ้าของเรื่องและพัสดุปรับสมาชิกได้หลังประชุม จนกว่าจะมีการลงนามตรวจรับ", "Types, positions and overlap rules are set on CM4 and CM6 · the acceptance committee is used when the contract is made · the owning unit and procurement can change members after a meeting until an acceptance is signed")}</div>`;
}
{
  const afterCase = (c, msg) => { cmSync(); commit(); route(); toast(msg); };
  document.addEventListener("submit", e => {
    const f = e.target; if (!f || !f.matches) return;
    // Make a committee for a case, from the case page (type fixed) or from "add another type" (type picked). The order file is required.
    if (f.matches("[data-cmnew]") || f.matches("[data-cmaddtype]")) { e.preventDefault(); const fixed = f.matches("[data-cmnew]"), fd = new FormData(f), [cid, tid0] = (fixed ? f.dataset.cmnew : f.dataset.cmaddtype + "|").split("|"), c = caseOf(cid), tid = fixed ? tid0 : String(fd.get("t"));
      if (!c || !cmCanNew(c) || !cmTypeById(tid) || S.cmReg.some(x => x.case === cid && x.type === tid && !x.retired)) return;
      const fo = [...f.querySelector("[name=fo]").files], fx = [...f.querySelector("[name=fx]").files]; if (!fo.length) { toast(L("แนบไฟล์คำสั่งแต่งตั้ง", "Attach the appointment order file")); return; }
      Promise.all([cmReadFiles(fo), cmReadFiles(fx)]).then(([o, x]) => { if (S.cmReg.some(y => y.case === cid && y.type === tid && !y.retired)) return;
        const cm = { id: cmNextId(S.cmReg, "CM"), type: tid, case: cid, order: String(fd.get("order")).trim(), date: fd.get("date"), doc: o[0].name, note: "", status: "live", by: me().id }; S.cmReg.push(cm); cmAddDocs(cm, "order", o); cmAddDocs(cm, "other", x);
        audit(["ตั้งคณะกรรมการของรายการจัดซื้อ", "Made a committee for a case"], `${cm.id} ${cid} ${cmTName(cm)} · ${o.length + x.length} ${L("ไฟล์", "files")}`); caseLog(c, "committee", `${cmTName(cm)} · ${cm.order}`); afterCase(c, L("ตั้งคณะแล้ว ใส่สมาชิกตามตำแหน่งได้เลย", "Made; add members to the positions")); }); return; }
    if (f.matches("[data-cmdoc]")) { e.preventDefault(); const cm = cmById(f.dataset.cmdoc), fd = new FormData(f), files = [...f.querySelector("[name=files]").files]; if (!cm || !cmCan(cm) || !files.length) return;
      cmReadFiles(files).then(items => { cmAddDocs(cm, String(fd.get("kind")), items, String(fd.get("note") || "").trim()); audit(["แนบเอกสารของคณะกรรมการ", "Attached documents to a committee"], `${cm.id} · ${items.length} ${L("ไฟล์", "files")}`); afterCase(null, L("แนบเอกสารแล้ว", "Attached")); }); return; }
    if (f.matches("[data-cmmeta]")) { e.preventDefault(); const cm = cmById(f.dataset.cmmeta), fd = new FormData(f); if (!cm || !cmCan(cm) || cmLocked(cm)) return; Object.assign(cm, { order: String(fd.get("order")).trim(), date: fd.get("date") }); audit(["แก้คำสั่งแต่งตั้ง", "Edited an appointment order"], cm.id); afterCase(null, L("บันทึกแล้ว", "Saved")); return; }
    if (f.matches("[data-cmadd]")) { e.preventDefault(); const [mid, sid] = f.dataset.cmadd.split("|"), cm = cmById(mid), s = (S.cmSlots || []).find(x => x.id === sid), fd = new FormData(f), g = k => String(fd.get(k) || "").trim(); if (!cm || !s || !cmCan(cm) || cmLocked(cm)) return;
      const m = { id: cmNextId(S.cmMem, "CMM"), cm: cm.id, slot: s.id, role: s.chair ? "chair" : "member", tech: !!fd.get("tech"), exp: "" };
      if (g("u")) m.kind = "user", m.user = g("u"); else { m.kind = "ext"; Object.assign(m, { name: g("en"), agency: g("ea"), position: g("ep"), phone: "" }); }
      const T = (th, en) => toast(L(th, en)); if (m.kind === "ext" && (!m.name || !m.agency || !m.position)) { T("คนนอกต้องระบุชื่อ หน่วยงาน และตำแหน่ง หรือเลือกผู้ใช้ในระบบ", "An outside person needs name, agency and position, or pick a system user"); return; }
      if (s.who !== "any" && s.who !== (m.kind === "user" ? "user" : "ext")) { T("ตำแหน่งนี้รับเฉพาะ" + (s.who === "user" ? "ผู้ใช้ในระบบ" : "คนนอก"), "This position takes " + (s.who === "user" ? "system users only" : "outside people only")); return; }
      if (s.max !== "" && s.max != null && cmMembers(cm.id).filter(x => x.slot === s.id).length >= s.max) { T("ตำแหน่งนี้เต็มแล้ว", "This position is full"); return; }
      if (cmMembers(cm.id).some(x => cmPk(x) === cmPk(m))) { T("คนนี้เป็นสมาชิกของคณะนี้อยู่แล้ว", "Already a member of this committee"); return; }
      const cl = cmClashFor(cm, m); if (cl.length) { toast(cl.map(x => x.why).join(" · ")); return; }
      if (m.kind === "user" && sodOn("SD-02") && ["proc", "prochead"].includes((S.users.find(u => u.id === m.user) || {}).role) && cmKindOf(cm) === "accept") { T("เจ้าหน้าที่พัสดุเป็นกรรมการตรวจรับไม่ได้ (SD-02)", "A procurement officer can't be on the acceptance committee (SD-02)"); return; }
      S.cmMem.push(m); audit(["เพิ่มสมาชิกคณะกรรมการ", "Added a committee member"], `${cm.id} ${cmPerson(m)}`); afterCase(null, L("เพิ่มสมาชิกแล้ว", "Member added")); return; }
  });
  // files picked on the register's add form (a field of the shared form framework cannot hold a file, so they wait here)
  document.addEventListener("change", e => { const el = e.target; if (!el || (el.id !== "cm-pend-order" && el.id !== "cm-pend-other")) return; const key = el.id === "cm-pend-order" ? "order" : "other";
    cmReadFiles(el.files).then(items => { CM_PEND[key] = items; const sp = document.getElementById(el.id + "-n"); if (sp) sp.textContent = items.map(i => i.name).join(", "); }); });
  document.addEventListener("click", e => { const d = e.target.closest && e.target.closest("[data-cmdocdel]");
    if (d) { const doc = (S.cmDocs || []).find(x => x.id === d.dataset.cmdocdel), cm = doc && cmById(doc.cm); if (!cm || !cmCan(cm)) return; if (doc.kind === "order" && cmDocsOf(cm.id).filter(x => x.kind === "order").length <= 1) { toast(L("ต้องมีไฟล์คำสั่งแต่งตั้งอย่างน้อย 1 ไฟล์", "Keep at least one order file")); return; }
      S.cmDocs = S.cmDocs.filter(x => x !== doc); if (cm.doc === doc.name) cm.doc = (cmDocsOf(cm.id).find(x => x.kind === "order") || {}).name || ""; audit(["ลบเอกสารแนบของคณะกรรมการ", "Removed a committee document"], `${cm.id} ${doc.name}`); afterCase(null, L("ลบเอกสารแล้ว", "Removed")); return; }
    const b = e.target.closest && e.target.closest("[data-cmdel]"); if (!b) return; const m = S.cmMem.find(x => x.id === b.dataset.cmdel), cm = m && cmById(m.cm); if (!cm || !cmCan(cm) || cmLocked(cm)) return; S.cmMem = S.cmMem.filter(x => x !== m); audit(["นำสมาชิกออกจากคณะกรรมการ", "Removed a committee member"], `${cm.id} ${cmPerson(m)}`); afterCase(null, L("นำออกแล้ว", "Removed")); });
}

// ---------- CRUD ----------
const cmFv = (vals, k, d) => (vals && vals[k] !== undefined ? vals[k] : d);
const cmTypeOpts = () => (S.cmTypes || []).filter(t => !t.retired).map(t => [t.id, `${tx(t.name)} (${tx(CM_KINDS[t.kind])})`]);
const cmCaseOpts = () => (S.cases || []).filter(c => !c.cancelled).map(c => [c.id, `${c.id} · ${caseName(c)}`]);
const cmRegOpts = () => (S.cmReg || []).filter(c => cmCan(c)).map(c => [c.id, `${c.id} · ${c.order} · ${cmTName(c)}`]);
const cmSlotName = id => { const s = (S.cmSlots || []).find(x => x.id === id); return s ? tx(s.name) : "–"; };


// the kinds a type applies to, from the form: none ticked off = all kinds = empty list
const cmKindsOf = v => { const on = Object.keys(KINDS).filter(k => v["ap_" + k]); return on.length === Object.keys(KINDS).length ? [] : on; };
const cmRuleText = (t, id) => { const r = (t.rules || {})[id]; if (!r || (r.mode === "none" && (r.pct === "" || r.pct == null))) return ""; return `${tx((cmTypeById(id) || { name: [id, id] }).name)}: ${r.mode !== "none" ? tx(CM_MODES[r.mode]) : ""}${r.pct !== "" && r.pct != null ? `${r.mode !== "none" ? " · " : ""}${L("ซ้ำได้ไม่เกิน", "overlap at most")} ${r.pct}%` : ""}`; };
const cmRulesOf = (t, v) => { const o = {}; (S.cmTypes || []).filter(x => x !== t && !x.retired).forEach(x => { const mode = v["m_" + x.id] || "none", pct = v["p_" + x.id]; if (mode !== "none" || (pct !== "" && pct != null)) o[x.id] = { mode, pct: pct === "" || pct == null ? "" : Number(pct) }; }); return o; };
CRUD.def("cmType", {
  noun: ["ประเภทคณะกรรมการ", "Committee type"], st: RET_ST, status: t => (t.retired ? "retired" : "live"), gone: t => !!t.retired, id: t => t.id, title: t => tx(t.name), sub: t => tx(CM_KINDS[t.kind]),
  list: () => S.cmTypes || [], search: t => `${t.name.join(" ")} ${t.desc || ""}`,
  cols: [{ h: ["ประเภท", "Type"], c: t => `${esc(tx(t.name))}<div class="sub">${esc(t.desc || "")}</div>` }, { h: ["ใช้เป็น", "Works as"], c: t => esc(tx(CM_KINDS[t.kind])) }, { h: ["ตำแหน่ง", "Positions"], c: t => cmSlotsOf(t.id).map(s => `${esc(tx(s.name))} ${s.min}${s.max === "" || s.max == null ? "+" : s.max === s.min ? "" : "–" + s.max}`).join(" · ") || "—" },
    { h: ["เงื่อนไขซ้ำซ้อน", "Overlap rules"], c: t => (S.cmTypes || []).map(x => cmRuleText(t, x.id)).filter(Boolean).map(esc).join("<br>") || "—" }, { h: ["ใช้อยู่", "In use"], n: true, c: t => (S.cmReg || []).filter(c => c.type === t.id).length }],
  fields: t => [{ id: "th", label: ["ชื่อประเภท", "Type name"], req: true, wide: true, value: t ? t.name[0] : "" }, { id: "en", label: ["ภาษาอังกฤษ", "English"], wide: true, value: t ? t.name[1] : "" },
    { id: "desc", label: ["รายละเอียด", "Description"], type: "textarea", wide: true, value: t ? t.desc || "" : "" },
    { id: "kind", label: ["ใช้เป็น", "Works as"], type: "select", req: true, value: t ? t.kind : "other", opts: Object.keys(CM_KINDS).map(k => [k, tx(CM_KINDS[k])]), hint: L("ประเภทที่ผูกกับขั้นตอนของรายการจัดซื้อมีได้ประเภทเดียวต่อแบบ", "A type that links to a case step: one type per kind") },
    { id: "extMax", label: ["บุคคลภายนอกได้ไม่เกิน (คน)", "Outside people at most"], type: "number", min: 0, req: true, value: t && t.extMax !== "" && t.extMax != null ? t.extMax : 2 },
    ...Object.keys(KINDS).map(k => ({ id: "ap_" + k, label: [`ใช้กับชนิดงาน: ${tx(KINDS[k])}`, `Applies to: ${tx(KINDS[k])}`], type: "check", wide: true, value: !t || !t.kinds || !t.kinds.length || t.kinds.includes(k) })),
    ...Object.keys(KINDS).map(k => ({ id: "tk_" + k, label: [`ต้องมีผู้มีความรู้ด้านช่าง/วิศวกรรมอย่างน้อย 1 คน เมื่อเป็นงาน: ${tx(KINDS[k])}`, `Needs a member with a technical background when the work is: ${tx(KINDS[k])}`], type: "check", wide: true, value: t ? cmTechKinds(t).includes(k) : false })),
    ...(S.cmTypes || []).filter(o => o !== t && !o.retired).flatMap(o => [{ id: "m_" + o.id, label: [`ซ้ำกับ ${tx(o.name)} ในการจัดซื้อเดียวกัน`, `Overlap with ${tx(o.name)} in the same case`], type: "select", value: t && (t.rules || {})[o.id] ? t.rules[o.id].mode : "none", opts: Object.keys(CM_MODES).map(k => [k, tx(CM_MODES[k])]) },
      { id: "p_" + o.id, label: [`ซ้ำได้ไม่เกินกี่ % ของคณะนี้ (ว่าง = ไม่กำหนด)`, `Overlap share cap, % of this committee (blank = none)`], type: "number", min: 0, value: t && (t.rules || {})[o.id] && t.rules[o.id].pct !== "" ? t.rules[o.id].pct : "" }])],
  check: (v, t) => { const out = [], mine = cmKindsOf(v); if (CM_UNIQUE.includes(v.kind) && (S.cmTypes || []).some(x => x !== t && !x.retired && x.kind === v.kind && ((!mine.length && !(x.kinds || []).length) || (mine.length && (x.kinds || []).length && mine.some(k => x.kinds.includes(k)))))) out.push({ f: "kind", m: L("มีประเภทที่ใช้เป็นแบบนี้กับชนิดงานเดียวกันอยู่แล้ว", "A type already works this way for the same kind of work") }); if (!Object.keys(KINDS).some(k => v["ap_" + k])) out.push({ f: null, m: L("เลือกชนิดงานที่ใช้อย่างน้อย 1 ชนิด", "Choose at least one kind of work") }); return out; },
  create: { can: cmTypeAdmin, label: ["เพิ่มประเภทคณะกรรมการ", "Add a committee type"], run: v => { const t = { id: cmNextId(S.cmTypes, "CTY"), name: [v.th, v.en || v.th], desc: v.desc || "", kind: v.kind, extMax: Number(v.extMax), kinds: cmKindsOf(v), techKinds: Object.keys(KINDS).filter(k => v["tk_" + k]), rules: {} }; t.rules = cmRulesOf(t, v); S.cmTypes.push(t); audit(["เพิ่มประเภทคณะกรรมการ", "Added a committee type"], `${t.id} ${v.th}`); return t; } },
  edit: { can: t => cmTypeAdmin() && !t.retired, run: (t, v) => { Object.assign(t, { name: [v.th, v.en || v.th], desc: v.desc || "", kind: v.kind, extMax: Number(v.extMax), kinds: cmKindsOf(v), techKinds: Object.keys(KINDS).filter(k => v["tk_" + k]), rules: cmRulesOf(t, v) }); delete t.techConstruction; audit(["แก้ประเภทคณะกรรมการ", "Edited a committee type"], t.id); } },
  acts: t => (cmTypeAdmin() ? retireAct(["ประเภทคณะกรรมการ", "committee type"], x => (S.cmReg || []).some(c => c.type === x.id), x => { S.cmTypes = S.cmTypes.filter(y => y !== x); S.cmSlots = S.cmSlots.filter(s => s.type !== x.id); S.cmTypes.forEach(o => { if (o.rules) delete o.rules[x.id]; }); })(t) : []),
  view: t => kv([[L("ชื่อ", "Name"), esc(tx(t.name))], [L("รายละเอียด", "Description"), esc(t.desc || "–")], [L("ใช้เป็น", "Works as"), esc(tx(CM_KINDS[t.kind]))],
    [L("ตำแหน่ง (แก้ที่ CM6)", "Positions (edit on CM6)"), cmSlotsOf(t.id).map(s => `${esc(tx(s.name))}${s.chair && !/ประธาน|chair/i.test(tx(s.name)) ? ` (${L("ประธาน", "chair")})` : ""} · ${s.min}${s.max === "" || s.max == null ? "+" : s.max === s.min ? "" : "–" + s.max} · ${esc(tx(CM_WHO[s.who]))}`).join("<br>") || "–"],
    [L("บุคคลภายนอกได้ไม่เกิน", "Outside people at most"), `${t.extMax === "" || t.extMax == null ? 2 : t.extMax} ${L("คน", "people")}`], [L("ใช้กับชนิดงาน", "Applies to"), (t.kinds && t.kinds.length ? t.kinds : Object.keys(KINDS)).map(k => esc(tx(KINDS[k]))).join(", ")], [L("ต้องมีผู้มีความรู้ด้านช่าง/วิศวกรรมเมื่อเป็นงาน", "Needs a technical member for"), cmTechKinds(t).map(k => esc(tx(KINDS[k]))).join(", ") || "—"],
    [L("เงื่อนไขซ้ำซ้อน", "Overlap rules"), (S.cmTypes || []).map(x => cmRuleText(t, x.id)).filter(Boolean).map(esc).join("<br>") || "—"]]),
});

CRUD.def("cmSlot", {
  noun: ["ตำแหน่งในคณะกรรมการ", "Committee position"], st: RET_ST, status: () => "live", gone: () => false, id: s => s.id, title: s => tx(s.name), sub: s => tx((cmTypeById(s.type) || { name: ["–", "–"] }).name),
  list: () => S.cmSlots || [], search: s => `${s.name.join(" ")} ${(cmTypeById(s.type) || { name: [""] }).name.join(" ")}`, filters: [{ id: "ty", label: ["ประเภท", "Type"], opts: () => cmTypeOpts(), get: s => s.type }],
  cols: [{ h: ["ประเภท", "Type"], c: s => esc(tx((cmTypeById(s.type) || { name: ["–", "–"] }).name)) }, { h: ["ตำแหน่ง", "Position"], c: s => `${esc(tx(s.name))}${s.chair && !/ประธาน|chair/i.test(tx(s.name)) ? ` <span class="sub">(${L("ประธาน", "chair")})</span>` : ""}` }, { h: ["ต่ำสุด", "Fewest"], n: true, c: s => s.min }, { h: ["สูงสุด", "Most"], n: true, c: s => (s.max === "" || s.max == null ? "∞" : s.max) }, { h: ["ผู้ดำรงตำแหน่ง", "Who"], c: s => esc(tx(CM_WHO[s.who])) }],
  fields: s => [{ id: "type", label: ["ประเภทคณะกรรมการ", "Committee type"], type: "select", req: true, value: s ? s.type : "", lock: !!s, show: s && tx((cmTypeById(s.type) || { name: ["", ""] }).name), blank: L("— เลือก —", "— choose —"), opts: cmTypeOpts() },
    { id: "th", label: ["ชื่อตำแหน่ง", "Position name"], req: true, value: s ? s.name[0] : "" }, { id: "en", label: ["ภาษาอังกฤษ", "English"], value: s ? s.name[1] : "" },
    { id: "min", label: ["จำนวนต่ำสุด", "Fewest people"], type: "number", min: 0, req: true, value: s ? s.min : 1 }, { id: "max", label: ["จำนวนสูงสุด (เว้นว่าง = ไม่จำกัด)", "Most people (blank = no limit)"], type: "number", min: 1, value: s ? (s.max === "" || s.max == null ? "" : s.max) : "" },
    { id: "who", label: ["ผู้ดำรงตำแหน่ง", "Who may hold it"], type: "select", req: true, value: s ? s.who : "any", opts: Object.keys(CM_WHO).map(k => [k, tx(CM_WHO[k])]) }, { id: "chair", label: ["เป็นตำแหน่งประธาน", "This is the chair"], type: "check", value: s ? !!s.chair : false }],
  check: (v, s) => { const out = [], ty = v.type || (s && s.type); if (v.max !== "" && v.max != null && Number(v.max) < Number(v.min)) out.push({ f: "max", m: L("สูงสุดต้องไม่น้อยกว่าต่ำสุด", "The most can't be below the fewest") });
    if (v.chair && (S.cmSlots || []).some(x => x !== s && x.type === ty && x.chair)) out.push({ f: "chair", m: L("ประเภทนี้มีตำแหน่งประธานแล้ว", "This type already has a chair position") }); if (v.chair && Number(v.max) > 1) out.push({ f: "max", m: L("ตำแหน่งประธานมีได้ 1 คน", "The chair position holds one person") }); return out; },
  create: { can: cmTypeAdmin, label: ["เพิ่มตำแหน่ง", "Add a position"], run: v => { const s = { id: cmNextId(S.cmSlots, "SLT"), type: v.type, name: [v.th, v.en || v.th], min: Number(v.min), max: v.max === "" ? "" : Number(v.max), who: v.who, chair: !!v.chair }; S.cmSlots.push(s); audit(["เพิ่มตำแหน่งคณะกรรมการ", "Added a committee position"], `${s.id} ${v.th}`); return s; } },
  edit: { can: () => cmTypeAdmin(), run: (s, v) => { Object.assign(s, { name: [v.th, v.en || v.th], min: Number(v.min), max: v.max === "" ? "" : Number(v.max), who: v.who, chair: !!v.chair }); audit(["แก้ตำแหน่งคณะกรรมการ", "Edited a committee position"], s.id); } },
  acts: s => (cmTypeAdmin() && !(S.cmMem || []).some(m => m.slot === s.id) ? [{ id: "del", label: L("ลบ", "Delete"), kind: "danger", confirm: L("ยังไม่มีสมาชิกในตำแหน่งนี้ ลบได้", "Nobody holds this position, so it can be deleted"), run: () => { S.cmSlots = S.cmSlots.filter(x => x !== s); audit(["ลบตำแหน่งคณะกรรมการ", "Deleted a committee position"], s.id); return L("ลบแล้ว", "Deleted"); } }] : []),
  view: s => kv([[L("ประเภท", "Type"), esc(tx((cmTypeById(s.type) || { name: ["–", "–"] }).name))], [L("ตำแหน่ง", "Position"), esc(tx(s.name))], [L("จำนวน", "People"), `${s.min}${s.max === "" || s.max == null ? " ขึ้นไป" : s.max === s.min ? "" : "–" + s.max}`], [L("ผู้ดำรงตำแหน่ง", "Who"), esc(tx(CM_WHO[s.who]))], [L("ประธาน", "Chair"), s.chair ? "✓" : "—"]]),
});

CRUD.def("cmReg", {
  noun: ["คณะกรรมการ", "Committee"], st: { live: [["มีผล", "In force"], "p-ok"], ended: [["สิ้นสุด", "Ended"], "p-mute"], retired: [["เลิกใช้", "Retired"], "p-mute"] }, status: c => (c.retired ? "retired" : c.status === "ended" ? "ended" : "live"), gone: c => !!c.retired, id: c => c.id, title: c => `${c.order}`, sub: c => `${cmTName(c)} · ${cmCaseLabel(c)}`,
  list: () => { cmAdopt(); return S.cmReg || []; }, search: c => `${c.id} ${c.order} ${cmTName(c)} ${cmCaseLabel(c)} ${cmMembers(c.id).map(cmPerson).join(" ")}`,
  filters: [{ id: "typ", label: ["ประเภท", "Type"], opts: () => cmTypeOpts(), get: c => c.type }, { id: "cas", label: ["รายการจัดซื้อ", "Case"], opts: () => cmCaseOpts(), get: c => c.case }],
  cols: [{ h: ["รหัส", "ID"], c: c => `<span class="mono">${c.id}</span>` }, { h: ["คำสั่งแต่งตั้ง", "Order"], c: c => `${esc(c.order)}<div class="sub">${fdate(c.date)}</div>` }, { h: ["ประเภท", "Type"], c: c => esc(cmTName(c)) }, { h: ["รายการจัดซื้อ", "Case"], c: c => `<span class="sub">${esc(cmCaseLabel(c))}</span>` },
    { h: ["สมาชิก", "Members"], n: true, c: c => cmMembers(c.id).length }, { h: ["เอกสารแนบ", "Documents"], n: true, c: c => cmDocsOf(c.id).length }, { h: ["เงื่อนไข", "Conditions"], c: c => (cmBad(c).length ? tag(L("ไม่ครบ", "Incomplete"), "p-warn") : tag(L("ครบ", "Complete"), "p-ok")) }],
  fields: c => [{ id: "type", label: ["ประเภท", "Type"], type: "select", req: true, value: c ? c.type : "", lock: !!c, show: c && cmTName(c), blank: L("— เลือก —", "— choose —"), opts: cmTypeOpts() },
    { id: "case", label: ["รายการจัดซื้อ", "Procurement case"], type: "select", req: true, value: c ? c.case : "", lock: !!c, show: c && cmCaseLabel(c), blank: L("— เลือก —", "— choose —"), opts: cmCaseOpts() },
    { id: "order", label: ["เลขที่คำสั่งแต่งตั้ง", "Appointment order no."], req: true, value: c ? c.order : "" }, { id: "date", label: ["ลงวันที่", "Dated"], type: "date", req: true, value: c ? c.date : TODAY },
    c ? { id: "files", type: "info", label: ["เอกสารแนบ", "Documents"], wide: true, html: `${cmDocsOf(c.id).map(d => esc(d.name)).join(", ") || "–"} <span class="sub">· ${L("แนบหรือลบที่แท็บ เอกสารแนบ", "attach or remove on the Documents tab")}</span>` }
      : { id: "files", type: "info", label: ["เอกสารแนบ", "Documents"], wide: true, html: `<div class="inline-form"><div class="f" style="flex:1 1 220px"><label for="cm-pend-order">${L("ไฟล์คำสั่งแต่งตั้ง (จำเป็น)", "Appointment order file (required)")}</label><input type="file" id="cm-pend-order"><div class="sub" id="cm-pend-order-n">${esc(CM_PEND.order.map(i => i.name).join(", "))}</div></div><div class="f" style="flex:1 1 220px"><label for="cm-pend-other">${L("เอกสารอื่นที่เกี่ยวข้อง (หลายไฟล์ได้)", "Other related documents (several allowed)")}</label><input type="file" id="cm-pend-other" multiple><div class="sub" id="cm-pend-other-n">${esc(CM_PEND.other.map(i => i.name).join(", "))}</div></div></div>` },
    { id: "note", label: ["หมายเหตุ", "Note"], wide: true, value: c ? c.note || "" : "" }],
  check: (v, c) => { const out = [], cs = caseOf(v.case || (c && c.case)); if (!c && cs && !cmCanNew(cs)) out.push({ f: "case", m: L("ตั้งได้เฉพาะรายการจัดซื้อของหน่วยท่าน หรือโดยเจ้าหน้าที่พัสดุ", "Only for your unit's cases, or by procurement") });
    if (!c && (S.cmReg || []).some(x => x.case === v.case && x.type === v.type && !x.retired)) out.push({ f: "type", m: L("รายการจัดซื้อนี้มีคณะประเภทนี้แล้ว", "This case already has this type") });
    if (!c && !CM_PEND.order.length) out.push({ f: null, m: L("แนบไฟล์คำสั่งแต่งตั้ง", "Attach the appointment order file") }); return out; },
  prefill: () => { CM_PEND = { order: [], other: [] }; return {}; },
  tabs: c => [["docs", L("เอกสารแนบ", "Documents"), cmDocPanel(c, cmCan(c))]],
  create: { can: () => cmActor(), label: ["เพิ่มคณะกรรมการ", "Add a committee"], run: v => { const c = { id: cmNextId(S.cmReg, "CM"), type: v.type, case: v.case, order: v.order.trim(), date: v.date, doc: (CM_PEND.order[0] || {}).name || "", note: v.note || "", status: "live", by: me().id }; S.cmReg.push(c); cmAddDocs(c, "order", CM_PEND.order); cmAddDocs(c, "other", CM_PEND.other); CM_PEND = { order: [], other: [] }; cmSync(); audit(["เพิ่มคณะกรรมการในทะเบียน", "Added a committee to the register"], `${c.id} ${c.order}`); return c; } },
  edit: { can: c => cmCan(c) && !cmLocked(c), run: (c, v) => { Object.assign(c, { order: v.order.trim(), date: v.date, note: v.note || "" }); cmSync(); audit(["แก้คณะกรรมการ", "Edited a committee"], c.id); } },
  acts: c => (cmCan(c) ? [...(c.status === "ended" ? [{ id: "again", label: L("กลับมามีผล", "Back in force"), kind: "ghost", run: () => { c.status = "live"; cmSync(); audit(["คณะกรรมการกลับมามีผล", "Committee back in force"], c.id); return L("กลับมามีผลแล้ว", "Back in force"); } }]
    : [{ id: "end", label: L("สิ้นสุดคำสั่ง", "End the order"), kind: "danger", why: true, impact: () => L("รายการจัดซื้อจะนับว่ายังไม่มีคณะนี้ ต้องตั้งใหม่ สัญญาเดิมที่ใช้อยู่ไม่เปลี่ยน", "The case counts as having no such committee; make a new one. Contracts using it keep it"), run: (_, why) => { c.status = "ended"; c.endWhy = why; cmSync(); audit(["สิ้นสุดคำสั่งแต่งตั้ง", "Ended an appointment order"], `${c.id} ${why || ""}`); return L("สิ้นสุดแล้ว", "Ended"); } }]),
    ...retireAct(["คณะกรรมการ", "committee"], x => S.contracts.some(k => k.cm === x.id) || (S.cmMeet || []).some(m => m.cm === x.id), x => { S.cmReg = S.cmReg.filter(y => y !== x); S.cmMem = S.cmMem.filter(m => m.cm !== x.id); S.cmDocs = (S.cmDocs || []).filter(d => d.cm !== x.id); cmSync(); })(c)] : []),
  view: c => { const M = cmMembers(c.id), chk = cmCheck(c); return kv([[L("ประเภท", "Type"), esc(cmTName(c))], [L("รายการจัดซื้อ", "Case"), esc(cmCaseLabel(c))], [L("คำสั่งแต่งตั้ง", "Order"), `${esc(c.order)} · ${fdate(c.date)} · ${esc(c.doc || "–")}`],
    [L("สมาชิก", "Members"), M.map(m => `${cmLine(m)} <span class="sub">· ${esc(cmSlotName(m.slot))} · ${esc(cmMeta(m))}${m.tech ? ` · ${L("ช่าง/วิศวกรรม", "technical")}` : ""}</span>`).join("<br>") || "–"],
    [L("ใช้กับสัญญา", "Contracts"), S.contracts.filter(k => k.cm === c.id).map(k => k.id).join(", ") || "–"], [L("ตรวจตามประเภท", "Checked against the type"), chk.map(x => `${x.ok ? "✓" : '<span style="color:var(--bad)">✗</span>'} ${esc(x.label)}`).join("<br>")]]); },
});

CRUD.def("cmMem", {
  noun: ["สมาชิกคณะกรรมการ", "Committee member"], st: RET_ST, status: () => "live", gone: () => false, id: m => m.id, title: m => cmPerson(m), sub: m => `${(cmById(m.cm) || {}).order || ""}`, live: true,
  list: () => { cmAdopt(); return S.cmMem || []; }, search: m => `${cmPerson(m)} ${m.agency || ""} ${m.position || ""} ${(cmById(m.cm) || {}).order || ""}`,
  filters: [{ id: "cm", label: ["คณะกรรมการ", "Committee"], opts: () => (S.cmReg || []).map(c => [c.id, `${c.id} · ${c.order}`]), get: m => m.cm }, { id: "kd", label: ["ประเภทสมาชิก", "Kind"], opts: () => [["user", L("ผู้ใช้ในระบบ", "System user")], ["ext", L("คนนอก", "Outside")]], get: m => m.kind }],
  cols: [{ h: ["ชื่อ", "Name"], c: m => cmLine(m) }, { h: ["คณะกรรมการ", "Committee"], c: m => `<span class="mono">${m.cm}</span> <span class="sub">${esc((cmById(m.cm) || {}).order || "")} · ${esc(cmById(m.cm) ? cmTName(cmById(m.cm)) : "")}</span>` }, { h: ["ตำแหน่ง", "Position"], c: m => esc(cmSlotName(m.slot)) }, { h: ["สังกัด", "From"], c: m => `<span class="sub">${esc(cmMeta(m))}</span>` }, { h: ["ช่าง/วิศวกรรม", "Technical"], c: m => (m.tech ? "✓" : "—") }],
  fields: (m, v) => { const kind = cmFv(v, "kind", m ? m.kind : "user"), cmId = cmFv(v, "cm", m ? m.cm : ""), cm = cmById(cmId); return [
    { id: "cm", label: ["คณะกรรมการ", "Committee"], type: "select", req: true, value: m ? m.cm : "", lock: !!m, show: m && (cmById(m.cm) || {}).order, blank: L("— เลือก —", "— choose —"), opts: cmRegOpts() },
    { id: "slot", label: ["ตำแหน่ง", "Position"], type: "select", req: true, value: m ? m.slot : "", blank: L("— เลือก —", "— choose —"), opts: (cm ? cmSlotsOf(cm.type) : []).map(s => [s.id, tx(s.name)]) },
    { id: "kind", label: ["ประเภทสมาชิก", "Kind"], type: "select", req: true, value: kind, opts: [["user", L("ผู้ใช้ในระบบ", "System user")], ["ext", L("คนนอก ไม่มีบัญชี", "Outside person, no account")]] },
    ...(kind === "user" ? [{ id: "user", label: ["ผู้ใช้", "User"], type: "select", req: true, value: m ? m.user || "" : "", blank: L("— เลือก —", "— choose —"), opts: S.users.filter(u => u.active && u.role !== "admin").map(u => [u.id, `${tx(u.name)} · ${tx(ROLES[u.role])}`]) }]
      : [{ id: "name", label: ["ชื่อ-สกุล", "Full name"], req: true, value: m ? m.name || "" : "" }, { id: "agency", label: ["หน่วยงานต้นสังกัด", "Agency"], req: true, value: m ? m.agency || "" : "" }, { id: "position", label: ["ตำแหน่ง", "Position"], req: true, value: m ? m.position || "" : "" }, { id: "phone", label: ["เบอร์ติดต่อ", "Phone"], value: m ? m.phone || "" : "" }]),
    { id: "tech", label: ["มีความรู้ด้านช่าง/วิศวกรรม", "Technical or engineering background"], type: "check", value: m ? !!m.tech : false }, { id: "exp", label: ["ความชำนาญ", "Expertise"], wide: true, value: m ? m.exp || "" : "" }]; },
  check: (v, m) => { const out = [], cm = cmById(v.cm || (m && m.cm)), s = (S.cmSlots || []).find(x => x.id === v.slot); if (!cm) return out; if (!cmCan(cm)) out.push({ f: "cm", m: L("ไม่มีสิทธิ์แก้คณะนี้", "You can't edit this committee") });
    if (cmLocked(cm)) out.push({ f: "cm", m: L("มีการลงนามตรวจรับแล้ว แก้สมาชิกไม่ได้", "Acceptance signed; members locked") });
    if (s && s.type !== cm.type) out.push({ f: "slot", m: L("ตำแหน่งนี้ไม่ใช่ของประเภทของคณะ", "Not a position of this committee's type") });
    if (s && s.who !== "any" && s.who !== v.kind) out.push({ f: "kind", m: L("ตำแหน่งนี้รับเฉพาะ", "This position takes only") + " " + tx(CM_WHO[s.who]) });
    if (s && s.max !== "" && s.max != null && cmMembers(cm.id).filter(x => x !== m && x.slot === s.id).length >= s.max) out.push({ f: "slot", m: L("ตำแหน่งนี้เต็มแล้ว", "This position is full") });
    const probe = { kind: v.kind, user: v.user, name: v.name, agency: v.agency, slot: v.slot, role: s && s.chair ? "chair" : "member" }; if (cmMembers(cm.id).some(x => x !== m && cmPk(x) === cmPk(probe))) out.push({ f: v.kind === "user" ? "user" : "name", m: L("คนนี้เป็นสมาชิกอยู่แล้ว", "Already a member") });
    const cl = cmClashFor(cm, probe, m); if (cl.length) out.push({ f: v.kind === "user" ? "user" : "name", m: cl.map(x => x.why).join(" · ") }); return out; },
  create: { can: () => cmActor(), label: ["เพิ่มสมาชิก", "Add a member"], run: v => { const s = S.cmSlots.find(x => x.id === v.slot), m = { id: cmNextId(S.cmMem, "CMM"), cm: v.cm, slot: v.slot, kind: v.kind, role: s && s.chair ? "chair" : "member", tech: !!v.tech, exp: v.exp || "" }; if (v.kind === "user") m.user = v.user; else Object.assign(m, { name: v.name, agency: v.agency, position: v.position, phone: v.phone || "" }); S.cmMem.push(m); cmSync(); audit(["เพิ่มสมาชิกคณะกรรมการ", "Added a committee member"], `${m.id} ${cmPerson(m)}`); return m; } },
  edit: { can: m => cmCan(cmById(m.cm)) && !cmLocked(cmById(m.cm)), run: (m, v) => { const s = S.cmSlots.find(x => x.id === v.slot); Object.assign(m, { slot: v.slot, kind: v.kind, role: s && s.chair ? "chair" : "member", tech: !!v.tech, exp: v.exp || "" }); if (v.kind === "user") { m.user = v.user; delete m.name; delete m.agency; delete m.position; delete m.phone; } else { delete m.user; Object.assign(m, { name: v.name, agency: v.agency, position: v.position, phone: v.phone || "" }); } cmSync(); audit(["แก้สมาชิกคณะกรรมการ", "Edited a committee member"], m.id); } },
  acts: m => (cmCan(cmById(m.cm)) && !cmLocked(cmById(m.cm)) ? [{ id: "del", label: L("นำออกจากคณะ", "Remove"), kind: "danger", confirm: L("นำสมาชิกออกจากคณะนี้ (ทำได้จนกว่าจะมีการลงนามตรวจรับ)", "Remove this member (possible until an acceptance is signed)"), run: () => { S.cmMem = S.cmMem.filter(x => x !== m); cmSync(); audit(["นำสมาชิกออกจากคณะกรรมการ", "Removed a committee member"], m.id); return L("นำออกแล้ว", "Removed"); } }] : []),
  view: m => kv([[L("ชื่อ", "Name"), cmLine(m)], [L("คณะกรรมการ", "Committee"), esc((cmById(m.cm) || {}).order || "")], [L("ตำแหน่ง", "Position"), esc(cmSlotName(m.slot))], [L("สังกัด", "From"), esc(cmMeta(m))], [L("ช่าง/วิศวกรรม", "Technical"), m.tech ? "✓" : "—"], [L("ความชำนาญ", "Expertise"), esc(m.exp || "–")]]),
});

CRUD.def("cmMeet", {
  noun: ["บันทึกการเข้าประชุม", "Attendance record"], st: RET_ST, status: () => "live", gone: () => false, id: m => m.id, title: m => `${fdate(m.date)} · ${m.subject}`, sub: m => `${(cmById(m.cm) || {}).order || ""}`, live: true,
  list: () => S.cmMeet || [], search: m => `${m.subject} ${(cmById(m.cm) || {}).order || ""} ${m.subName || ""}`,
  filters: [{ id: "cm", label: ["คณะกรรมการ", "Committee"], opts: () => (S.cmReg || []).map(c => [c.id, `${c.id} · ${c.order}`]), get: m => m.cm }, { id: "pr", label: ["การเข้าประชุม", "Attendance"], opts: () => [["y", L("เข้าประชุมเอง", "Attended")], ["s", L("มีผู้แทน", "Substitute")], ["n", L("ไม่เข้า", "Absent")]], get: m => (m.present ? "y" : m.subName ? "s" : "n") }],
  cols: [{ h: ["วันที่", "Date"], c: m => fdate(m.date) }, { h: ["เรื่อง", "Subject"], c: m => esc(m.subject) }, { h: ["คณะกรรมการ", "Committee"], c: m => `<span class="mono">${m.cm}</span>` }, { h: ["กรรมการ", "Member"], c: m => esc(cmPerson(S.cmMem.find(x => x.id === m.member) || {})) },
    { h: ["ผล", "Result"], c: m => (m.present ? tag(L("เข้าเอง", "Attended"), "p-ok") : m.subName ? tag(`${L("ผู้แทน", "Substitute")}: ${esc(m.subName)}`, "p-info") : tag(L("ไม่เข้า", "Absent"), "p-warn")) }],
  fields: (m, v) => { const cm = cmFv(v, "cm", m ? m.cm : ""), present = cmFv(v, "present", m ? m.present : true);
    return [{ id: "cm", label: ["คณะกรรมการ", "Committee"], type: "select", req: true, value: m ? m.cm : "", lock: !!m, show: m && (cmById(m.cm) || {}).order, blank: L("— เลือก —", "— choose —"), opts: cmRegOpts() },
      { id: "member", label: ["กรรมการ", "Member"], type: "select", req: true, value: m ? m.member : "", blank: L("— เลือก —", "— choose —"), opts: cmMembers(cm).map(x => [x.id, cmPerson(x)]) },
      { id: "date", label: ["วันที่ประชุม", "Meeting date"], type: "date", req: true, value: m ? m.date : TODAY }, { id: "subject", label: ["เรื่องที่ประชุม", "Subject"], req: true, wide: true, value: m ? m.subject : "" },
      { id: "present", label: ["กรรมการเข้าประชุมเอง", "The member attended in person"], type: "check", value: present },
      ...(present ? [] : [{ id: "subName", label: ["ผู้เข้าแทน (ชื่อ-สกุล)", "Substitute (full name)"], value: m ? m.subName || "" : "", hint: L("ไม่เข้าและไม่มีผู้แทน เว้นว่างได้ ต้องระบุเหตุผล", "Absent with no substitute: leave blank and give a reason") },
        { id: "subAgency", label: ["หน่วยงานของผู้แทน", "Substitute's agency"], value: m ? m.subAgency || "" : "" }, { id: "subPos", label: ["ตำแหน่งของผู้แทน", "Substitute's position"], value: m ? m.subPos || "" : "" },
        { id: "letterNo", label: ["เลขที่หนังสือมอบหมาย", "Letter no."], value: m ? m.letterNo || "" : "" }, { id: "letterDate", label: ["ลงวันที่หนังสือ", "Letter date"], type: "date", value: m ? m.letterDate || "" : "" },
        { id: "letterFile", label: ["ชื่อไฟล์หนังสือแนบ", "Attached letter file name"], value: m ? m.letterFile || "" : "", hint: L("ต้นแบบเก็บชื่อไฟล์เท่านั้น", "File name only") }, { id: "reason", label: ["เหตุผลที่ไม่เข้า", "Why absent"], wide: true, value: m ? m.reason || "" : "" }])]; },
  check: (v, m) => { const out = [], cm = cmById(v.cm || (m && m.cm)); if (cm && !cmCan(cm)) out.push({ f: "cm", m: L("ไม่มีสิทธิ์แก้คณะนี้", "You can't edit this committee") });
    if (v.member && !cmMembers(v.cm || (m && m.cm)).some(x => x.id === v.member)) out.push({ f: "member", m: L("ไม่ใช่สมาชิกของคณะนี้", "Not a member of this committee") });
    if (!v.present) { if (v.subName) { for (const [k, t] of [["subAgency", ["หน่วยงาน", "agency"]], ["subPos", ["ตำแหน่ง", "position"]], ["letterNo", ["เลขที่หนังสือ", "letter no."]], ["letterDate", ["วันที่หนังสือ", "letter date"]], ["letterFile", ["ชื่อไฟล์หนังสือแนบ", "attached letter"]]]) if (!String(v[k] || "").trim()) out.push({ f: k, m: L(`ผู้แทนต้องระบุ${t[0]}`, `A substitute needs the ${t[1]}`) }); if (v.letterDate && v.date && v.letterDate > v.date) out.push({ f: "letterDate", m: L("หนังสือต้องลงวันที่ไม่หลังวันประชุม", "The letter can't be dated after the meeting") }); }
      else if (!String(v.reason || "").trim()) out.push({ f: "reason", m: L("ไม่เข้าและไม่มีผู้แทน ต้องระบุเหตุผล", "Absent with no substitute needs a reason") }); }
    return out; },
  create: { can: () => cmActor(), label: ["บันทึกการเข้าประชุม", "Record attendance"], run: v => { const m = { id: cmNextId(S.cmMeet, "MT"), cm: v.cm, member: v.member, date: v.date, subject: v.subject, present: !!v.present, by: me().id }; if (!v.present) Object.assign(m, { subName: (v.subName || "").trim(), subAgency: v.subAgency || "", subPos: v.subPos || "", letterNo: v.letterNo || "", letterDate: v.letterDate || "", letterFile: v.letterFile || "", reason: v.reason || "" }); S.cmMeet.push(m); audit(["บันทึกการเข้าประชุมคณะกรรมการ", "Recorded committee attendance"], `${m.id} ${v.cm}`); return m; } },
  edit: { can: m => cmCan(cmById(m.cm)), run: (m, v) => { ["member", "date", "subject"].forEach(k => (m[k] = v[k])); m.present = !!v.present; ["subName", "subAgency", "subPos", "letterNo", "letterDate", "letterFile", "reason"].forEach(k => { if (m.present) delete m[k]; else m[k] = (v[k] || "").trim(); }); audit(["แก้บันทึกการเข้าประชุม", "Edited attendance"], m.id); } },
  acts: m => (cmCan(cmById(m.cm)) ? [{ id: "del", label: L("ลบ", "Delete"), kind: "danger", confirm: L("ลบบันทึกการเข้าประชุมนี้", "Delete this record"), run: () => { S.cmMeet = S.cmMeet.filter(x => x !== m); audit(["ลบบันทึกการเข้าประชุม", "Deleted attendance"], m.id); return L("ลบแล้ว", "Deleted"); } }] : []),
  view: m => kv([[L("คณะกรรมการ", "Committee"), esc((cmById(m.cm) || {}).order || "")], [L("กรรมการ", "Member"), esc(cmPerson(S.cmMem.find(x => x.id === m.member) || {}))], [L("วันที่", "Date"), fdate(m.date)], [L("เรื่อง", "Subject"), esc(m.subject)], [L("การเข้าประชุม", "Attendance"), m.present ? L("เข้าเอง", "In person") : m.subName ? `${L("ผู้แทน", "Substitute")} ${esc(m.subName)} · ${esc([m.subAgency, m.subPos].filter(Boolean).join(" · "))}` : `${L("ไม่เข้า", "Absent")} · ${esc(m.reason || "")}`],
    !m.present && m.subName && [L("หนังสือมอบหมาย", "Letter"), `${esc(m.letterNo)} · ${fdate(m.letterDate)} · ${esc(m.letterFile)}`]]),
});

// ---------- signing on behalf of a member (outside members, or a member who sent a substitute) ----------
function cmProxyForm(c, ph) {
  if (!(typeof isProcRole === "function" && isProcRole()) || !c.cm || !cmById(c.cm) || !ph.delivered || phaseAccepted(ph) || ph.cancelled || openDissent(ph) || (ph.n > 1 && !phaseAccepted(c.phases[ph.n - 2]))) return "";
  const left = cmMembers(c.cm).filter(m => !ph.signs.some(s => s.member === m.id || (m.kind === "user" && s.by === m.user)));
  if (!left.length) return "";
  return `<details style="margin-top:6px"><summary class="sub" style="cursor:pointer">${L("บันทึกผลตรวจรับแทนกรรมการ", "Record an acceptance for a member")}</summary>
    <form class="inline-form" data-pxform="${c.id}|${ph.n}" style="margin-top:6px"><div class="f" style="flex:1 1 170px"><label>${L("กรรมการ", "Member")}</label><select name="member">${left.map(m => `<option value="${m.id}">${esc(cmPerson(m))}</option>`).join("")}</select></div>
      <div class="f" style="flex:0 1 150px"><label>${L("ผล", "Result")}</label><select name="res"><option value="ok">${L("ถูกต้องครบถ้วน", "Accept in full")}</option><option value="partial">${L("รับบางส่วน", "Partly accept")}</option></select></div>
      <div class="f" style="flex:0 1 120px"><label>${L("ยอดที่รับ (บาท)", "Accepted (baht)")}</label><input type="number" name="amt" min="1" step="1"></div>
      <div class="f" style="flex:0 1 150px"><label>${L("วันที่ลงนามในเอกสาร", "Date signed on paper")}</label><input type="date" name="d" value="${TODAY}" required></div>
      <div class="f" style="flex:1 1 140px"><label>${L("เลขที่เอกสาร", "Document no.")}</label><input type="text" name="doc" required></div><div class="f" style="flex:1 1 150px"><label>${L("ชื่อไฟล์เอกสารแนบ", "Attached file name")}</label><input type="text" name="file" required></div>
      <div class="f" style="flex:1 1 100%"><label class="field-inline"><input type="checkbox" name="sub"> ${L("ลงนามโดยผู้แทนของกรรมการ", "Signed by a substitute")}</label></div>
      <div class="f" style="flex:1 1 150px"><label>${L("ผู้แทน: ชื่อ-สกุล", "Substitute: name")}</label><input type="text" name="sn"></div><div class="f" style="flex:1 1 140px"><label>${L("หน่วยงาน/ตำแหน่ง", "Agency / position")}</label><input type="text" name="sp"></div>
      <div class="f" style="flex:1 1 130px"><label>${L("เลขที่หนังสือมอบหมาย", "Letter no.")}</label><input type="text" name="ln"></div><div class="f" style="flex:0 1 150px"><label>${L("ลงวันที่หนังสือ", "Letter date")}</label><input type="date" name="ld"></div><div class="f" style="flex:1 1 150px"><label>${L("ชื่อไฟล์หนังสือแนบ", "Letter file name")}</label><input type="text" name="lf"></div>
      <button class="btn" type="submit">${L("บันทึกแทน", "Record")}</button></form></details>`;
}
document.addEventListener("submit", e => {
  const f = e.target; if (!f || !f.matches || !f.matches("[data-pxform]")) return; e.preventDefault();
  const [cid, n] = f.dataset.pxform.split("|"), c = S.contracts.find(x => x.id === cid), ph = c && c.phases.find(p => String(p.n) === n), fd = new FormData(f), g = k => String(fd.get(k) || "").trim();
  if (!c || !ph || !(typeof isProcRole === "function" && isProcRole()) || !c.cm) return;
  const m = cmMembers(c.cm).find(x => x.id === g("member")), res = g("res"), amt = Math.round(Number(fd.get("amt")) || 0), d = g("d"), T = (th, en) => toast(L(th, en));
  if (!m || ph.signs.some(s => s.member === m.id || (m.kind === "user" && s.by === m.user))) { T("กรรมการคนนี้ลงนามแล้วหรือไม่ได้อยู่ในคณะ", "This member already signed or isn't on the committee"); return; }
  if (!ph.delivered || (ph.n > 1 && !phaseAccepted(c.phases[ph.n - 2])) || openDissent(ph)) { T("ยังบันทึกไม่ได้: ต้องมีการแจ้งส่งมอบ งวดก่อนหน้าตรวจรับแล้ว และไม่มีความเห็นแย้งค้าง", "Not yet: needs a delivery, the previous phase accepted and no open dissent"); return; }
  if (d < ph.delivered || d > TODAY) { T("วันที่ลงนามต้องไม่ก่อนวันส่งมอบและไม่เกินวันนี้", "The signing date can't be before delivery or after today"); return; }
  if (!g("doc") || !g("file")) { T("ระบุเลขที่เอกสารและชื่อไฟล์แนบ", "Give the document number and the attached file name"); return; }
  const sub = fd.get("sub") ? { name: g("sn"), unit: g("sp"), letterNo: g("ln"), letterDate: g("ld"), letterFile: g("lf") } : null;
  if (sub && (!sub.name || !sub.unit || !sub.letterNo || !sub.letterDate || !sub.letterFile)) { T("ผู้แทนต้องระบุชื่อ หน่วยงาน/ตำแหน่ง เลขที่ วันที่ และชื่อไฟล์หนังสือมอบหมาย", "A substitute needs name, agency/position, letter number, date and file name"); return; }
  if (sub && sub.letterDate > d) { T("หนังสือมอบหมายต้องลงวันที่ไม่หลังวันลงนาม", "The letter can't be dated after the signing"); return; }
  const want = res === "partial" ? amt : ph.amount;
  if (res === "partial" && (!(amt > 0) || amt >= ph.amount)) { T("รับบางส่วน: ยอดที่รับต้องน้อยกว่ายอดงวด", "Partial: the accepted amount must be below the phase amount"); return; }
  if (ph.signs.length && ph.okAmount !== want) { T("ผลตรวจรับต้องตรงกับกรรมการท่านก่อนหน้า", "The result must match what earlier members signed"); return; }
  ph.result = res === "partial" ? "partial" : "ok"; ph.okAmount = want;
  ph.signs.push({ by: "cm:" + m.id, member: m.id, name: cmPerson(m), proxy: true, t: d + "T12:00", rec: me().id, doc: g("doc"), file: g("file"), sub });
  audit(["บันทึกผลตรวจรับแทนกรรมการ", "Recorded an acceptance for a member"], `${c.id} ${tx(ph.name)} · ${cmPerson(m)}${sub ? ` · ${L("ผู้แทน", "substitute")} ${sub.name}` : ""}`);
  if (phaseAccepted(ph)) { ph.cert = { n: 2, t: nowIso() }; audit(["ตรวจรับงานครบองค์ประชุม", "Phase accepted"], `${c.id} ${tx(ph.name)}`); notify(["fin", "proc"], [`${c.id} ${ph.name[0]} ตรวจรับแล้ว บันทึกใบแจ้งหนี้และขอเบิกจ่ายได้`, `${c.id} ${ph.name[1]} is accepted; record the invoice and request payment`], "fnc-pay"); }
  commit(); route(); T(phaseAccepted(ph) ? "ตรวจรับครบแล้ว" : "บันทึกแทนแล้ว รอกรรมการท่านอื่น", phaseAccepted(ph) ? "Accepted" : "Recorded, waiting for the other members");
});

// ---------- seed ----------
Object.keys(SEEDS).forEach(k => {
  const prev = SEEDS[k].seed;
  SEEDS[k].seed = () => {
    const s = prev(), nm = (th, en) => [th, en];
    // The six committees of the procurement regulation of 2560, as the user listed them on 10 Nov 2569, plus the TOR committee of the new flow.
    // Rules: a chair and at least 2 members; at most 2 outside people; the acceptance chair may not sit on an evaluation or
    // purchasing committee of the same case, and acceptance members may overlap with them by at most half.
    const tp = (id, th, en, kind, desc, tech, rules) => ({ id, name: nm(th, en), desc, kind, extMax: 2, techConstruction: tech, rules: rules || {} }), half = { mode: "chair", pct: 50 };
    s.cmTypes = [tp("CTY-001", "คณะกรรมการจัดทำร่างขอบเขตของงาน (TOR)", "TOR committee", "tor", "จัดทำร่างขอบเขตของงานของรายการจัดซื้อ (ตามขั้นตอนใหม่ สำนัก/กองเตรียม)", false),
      tp("CTY-002", "คณะกรรมการพิจารณาผลการประกวดราคาอิเล็กทรอนิกส์", "E-bidding evaluation committee", "eval", "ใช้กับวิธีประกวดราคาอิเล็กทรอนิกส์ (e-bidding)", false),
      tp("CTY-003", "คณะกรรมการซื้อหรือจ้างโดยวิธีคัดเลือก", "Selective-method purchasing committee", "buy", "ใช้กับวิธีคัดเลือก", false),
      tp("CTY-004", "คณะกรรมการตรวจรับพัสดุ", "Acceptance committee", "accept", "ตรวจรับพัสดุหรืองานจ้างตามสัญญา วิธีเฉพาะเจาะจงวงเงินไม่เกิน 500,000 บาท แต่งตั้งผู้ตรวจรับพัสดุ 1 คนแทนได้", true, { CTY_EVAL: half, CTY_BUY: half, CTY_SPEC: half, CTY_QUOTE: half }),
      tp("CTY-005", "คณะกรรมการกำหนดราคากลาง", "Reference-price committee", "ref", "แต่งตั้งตามหลักเกณฑ์ของ ป.ป.ช. / ทางราชการ", false),
      tp("CTY-006", "คณะกรรมการพิจารณาผลการสอบราคา", "Price-inquiry evaluation committee", "quote", "ใช้กับวิธีสอบราคา (ผู้ใช้แจ้งว่าเป็นหนึ่งในคณะตามระเบียบ ต้องให้ผู้รู้ระเบียบยืนยัน)", false),
      tp("CTY-007", "คณะกรรมการซื้อหรือจ้างโดยวิธีเฉพาะเจาะจง", "Specific-method purchasing committee", "specific", "ใช้กับวิธีเฉพาะเจาะจง", false)];
    { const id = { CTY_EVAL: "CTY-002", CTY_BUY: "CTY-003", CTY_SPEC: "CTY-007", CTY_QUOTE: "CTY-006" }, a = s.cmTypes.find(t => t.id === "CTY-004"); a.rules = Object.fromEntries(Object.entries(a.rules).map(([k, v]) => [id[k], v])); }
    // Sample types made for one kind of work (the kind of work adjusts the committees; see cmTypeFor). They carry the same overlap rules as the general acceptance type.
    { const gen = s.cmTypes.find(t => t.id === "CTY-004"), mine = (id, th, en, desc, extra) => Object.assign(tp(id, th, en, "accept", desc, false), extra, { rules: JSON.parse(JSON.stringify(gen.rules)) });
      s.cmTypes.push(mine("CTY-008", "คณะกรรมการตรวจรับงานจ้างก่อสร้าง", "Construction acceptance committee", "ตัวอย่าง: ตรวจรับงานจ้างก่อสร้าง ต้องมีวิศวกรหรือผู้มีความรู้ด้านช่างอย่างน้อย 1 คน", { kinds: ["construction"], techKinds: ["construction"] }),
        mine("CTY-009", "คณะกรรมการตรวจรับงานจ้างที่ปรึกษาและออกแบบ", "Consulting and design acceptance committee", "ตัวอย่าง: ตรวจรับงานจ้างที่ปรึกษาและออกแบบ", { kinds: ["consult"] })); }
    const slot = (id, type, th, en, min, max, who, chair) => ({ id, type, name: nm(th, en), min, max, who, chair: !!chair });
    s.cmSlots = []; s.cmTypes.forEach((t, i) => { const b = `SLT-${String(i * 3 + 1).padStart(3, "0")}`; s.cmSlots.push(slot(b, t.id, "ประธาน", "Chair", 1, 1, "any", true), slot(`SLT-${String(i * 3 + 2).padStart(3, "0")}`, t.id, "กรรมการ", "Member", 2, "", "any"));
      if (t.kind === "accept") s.cmSlots.push(slot(`SLT-${String(i * 3 + 3).padStart(3, "0")}`, t.id, "ผู้ทรงคุณวุฒิ / ช่าง", "Expert / engineer", 0, 2, "any")); });
    { const eng = s.cmSlots.find(x => x.type === "CTY-008" && !x.chair && x.max === 2); if (eng) { eng.name = nm("วิศวกร / ผู้มีความรู้ด้านช่าง", "Engineer / technical member"); eng.min = 1; } }
    s.cmReg = []; s.cmMem = []; s.cmMeet = []; s.cmDocs = [];
    const mk = (kind, caseId, order, date, doc, chairU, memU) => { const ck = (s.cases.find(x => x.id === caseId) || {}).kind, cands = s.cmTypes.filter(t => t.kind === kind), T = cands.find(t => t.kinds && t.kinds.length && t.kinds.includes(ck)) || cands.find(t => !t.kinds || !t.kinds.length) || cands[0], SL = s.cmSlots.filter(x => x.type === T.id), cm = { id: cmNextId(s.cmReg, "CM"), type: T.id, case: caseId, order, date, doc, note: "ตัวอย่าง", status: "live", by: (s.users.find(u => u.role === "proc") || s.users[0]).id };
      s.cmReg.push(cm); if (chairU) s.cmMem.push({ id: cmNextId(s.cmMem, "CMM"), cm: cm.id, slot: SL.find(x => x.chair).id, kind: "user", user: chairU, role: "chair", tech: false, exp: "" });
      memU.forEach(u => s.cmMem.push({ id: cmNextId(s.cmMem, "CMM"), cm: cm.id, slot: SL.find(x => !x.chair).id, kind: "user", user: u, role: "member", tech: false, exp: "" })); return cm; };
    s.cases.forEach(c => ["tor", "eval", "buy"].forEach(key => { const o = (c.committees || {})[key]; if (o) o.cm = mk(key, c.id, o.order, o.date, `คำสั่ง-${c.id}-${key}.pdf`, o.chair, o.members || []).id; }));
    let first = null;
    s.contracts.forEach(c => { const cs = s.cases.find(x => x.plan === c.plan), ins = c.inspectors || []; if (!ins.length) return; const cm = mk("accept", cs ? cs.id : "", `คำสั่งตรวจรับ ${c.no}`, c.signed, `คำสั่งตรวจรับ-${c.id}.pdf`, ins[0], ins.slice(1)); c.cm = cm.id; if (!first) first = cm; });
    if (first) { const T = s.cmTypes.find(t => t.kind === "accept"), ex = { id: cmNextId(s.cmMem, "CMM"), cm: first.id, slot: s.cmSlots.find(x => x.type === T.id && x.max === 2).id, kind: "ext", name: "นายตัวอย่าง ช่างเทคนิค", agency: "หน่วยงานตัวอย่าง", position: "วิศวกรชำนาญการ", phone: "0-0000-0000", role: "member", tech: true, exp: "งานระบบ" }; s.cmMem.push(ex);
      s.cmMeet = [{ id: "MT-001", cm: first.id, member: ex.id, date: first.date, subject: "ประชุมตรวจรับงานงวดที่ 1 (ตัวอย่าง)", present: false, subName: "นายตัวอย่าง ผู้แทน", subAgency: "หน่วยงานตัวอย่าง", subPos: "นักวิชาการ", letterNo: "หนังสือตัวอย่าง ที่ 99/2570", letterDate: first.date, letterFile: "หนังสือมอบหมาย-99.pdf", reason: "", by: ex.id }]; }
    s.cmReg.forEach(cm => s.cmDocs.push({ id: cmNextId(s.cmDocs, "CMD"), cm: cm.id, kind: "order", name: cm.doc, size: 0, type: "", data: "", note: "ตัวอย่าง ไม่มีไฟล์จริง", by: cm.by, t: cm.date + "T09:00:00" }));
    return s;
  };
});

// ---------- pages ----------
Object.assign(GROUPS, { cmg: ["คณะกรรมการ", "Committees"] });
APPS.procurement.groups.push("cmg");
{ const base = appOfLink; appOfLink = l => (typeof l === "string" && /^cm-(reg|mem|meet|type|slot)$/.test(l) ? "procurement" : base(l)); }
const cmBar = () => `<div class="row" style="margin:0 0 12px">${cmActor() ? tag(L("ท่านแก้ไขได้เฉพาะคณะของรายการจัดซื้อหน่วยท่าน (เจ้าหน้าที่พัสดุแก้ได้ทุกรายการจัดซื้อ)", "You can edit committees of your unit's cases (procurement: all cases)"), "p-info") : tag(L("บทบาทนี้ดูอย่างเดียว", "This role can view only"), "p-mute")}</div>`;
const cmTBar = () => `<div class="row" style="margin:0 0 12px">${cmTypeAdmin() ? tag(L("ท่านแก้ประเภทและตำแหน่งได้ (ส่วนกลาง)", "You can edit types and positions (central)"), "p-info") : tag(L("ประเภทและตำแหน่งแก้ได้เฉพาะหัวหน้าพัสดุและผู้ดูแลระบบ", "Only the head of procurement and administrators edit types and positions"), "p-mute")}</div>`;
const cmNote = L("ต้นแบบเก็บเฉพาะชื่อไฟล์ ไม่เก็บไฟล์จริง · กติกาเป็นค่าตัวอย่างที่ต้องให้ผู้รู้ยืนยันกับระเบียบ", "The prototype stores file names only · the rules are samples to confirm against the regulations");
ePageDef("procurement", "cm-reg", "CM1", "cmg", KROLES, ["ทะเบียนคณะกรรมการ", "Committee register"], () => `${eHead(CM_APP, "CM1", ["ทะเบียนคณะกรรมการ", "Committee register"], ["คณะกรรมการทุกคณะของทุกรายการจัดซื้อ ตั้งและใส่สมาชิกได้ที่หน้ารายการจัดซื้อ (ส่วนคณะกรรมการ) หรือที่นี่ · " + tx(cmNote), "The committees of every procurement case; make them and add members on the case page (Committees) or here · " + tx(cmNote)])}${cmBar()}${crudList("cmReg", { head: `<h2>${L("คณะกรรมการ", "Committees")}</h2>` })}`);
ePageDef("procurement", "cm-mem", "CM2", "cmg", KROLES, ["สมาชิกคณะกรรมการ", "Committee members"], () => `${eHead(CM_APP, "CM2", ["สมาชิกคณะกรรมการ", "Committee members"], ["สมาชิกตามตำแหน่งที่ประเภทกำหนด เป็นผู้ใช้ในระบบหรือคนนอกที่ไม่มีบัญชี (ชื่อ หน่วยงาน ตำแหน่ง) · ระบบกันสมาชิกซ้ำข้ามคณะตามเงื่อนไขของประเภท", "Members in the positions a type defines: a system user or an outside person with no account · the system blocks overlap across committees under the type's rule"])}${cmBar()}${crudList("cmMem", { head: `<h2>${L("สมาชิก", "Members")}</h2>` })}`);
ePageDef("procurement", "cm-meet", "CM3", "cmg", KROLES, ["การเข้าประชุมและผู้แทน", "Attendance and substitutes"], () => `${eHead(CM_APP, "CM3", ["การเข้าประชุมและผู้แทน", "Attendance and substitutes"], ["กรรมการที่ไม่เข้าประชุมให้บุคคลอื่นเข้าแทนได้ ต้องระบุชื่อ หน่วยงาน ตำแหน่ง และหนังสือมอบหมาย (เลขที่ วันที่ ชื่อไฟล์) · " + tx(cmNote), "A member who is absent can be replaced; the substitute needs name, agency, position and the letter (number, date, file name) · " + tx(cmNote)])}${cmBar()}${crudList("cmMeet", { head: `<h2>${L("การเข้าประชุม", "Attendance")}</h2>` })}`);
ePageDef("procurement", "cm-type", "CM4", "cmg", KROLES, ["ประเภทคณะกรรมการ", "Committee types"], () => `${eHead(CM_APP, "CM4", ["ประเภทคณะกรรมการ", "Committee types"], ["ส่วนกลาง: ชื่อ รายละเอียด วิธีใช้ (TOR พิจารณาผล ซื้อจ้าง ตรวจรับ อื่น ๆ) งานก่อสร้างต้องมีช่างหรือไม่ และห้ามสมาชิกซ้ำกับประเภทไหนในการจัดซื้อเดียวกัน · ตำแหน่งและจำนวนคนตั้งที่ CM6", "Central: name, description, how it works, whether construction needs a technical member, and which types its members must not also sit on in the same case · positions and counts on CM6"])}${cmTBar()}${crudList("cmType", { head: `<h2>${L("ประเภท", "Types")}</h2>` })}`);
ePageDef("procurement", "cm-slot", "CM6", "cmg", KROLES, ["โครงสร้างสมาชิกของประเภท", "Member positions of a type"], () => `${eHead(CM_APP, "CM6", ["โครงสร้างสมาชิกของประเภท", "Member positions of a type"], ["แต่ละประเภทมีตำแหน่ง (เช่น ประธาน กรรมการ ผู้ทรงคุณวุฒิ) พร้อมจำนวนต่ำสุดและสูงสุด และว่าใครดำรงตำแหน่งได้ จำนวนจริงอยู่ในช่วงนี้ ขึ้นกับเจ้าหน้าที่หรือมติที่ประชุม", "Each type has positions (chair, member, expert) with the fewest and most people and who may hold them; the real number inside the range is the officer's or the meeting's choice"])}${cmTBar()}${crudList("cmSlot", { head: `<h2>${L("ตำแหน่ง", "Positions")}</h2>` })}`);
Object.assign(NAV_ICON, { "cm-reg": "users", "cm-mem": "user", "cm-meet": "calendar", "cm-type": "tag", "cm-slot": "list" });
