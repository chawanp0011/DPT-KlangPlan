// Fisko-KlangFinance, budget round Q4e (12 Nov 2569): the kind of request, and the multi-year commitments carried over.
//  1. A request is either a single-year item or a multi-year commitment item. The new-request form asks for it and the main
//     tab of the request has a select for it (it was only a button on the multi-year tab). Going back to single-year is refused
//     while a later year still holds an amount.
//  2. Commitments of earlier years that have not reached their end year are pulled in as the starting point of this year's
//     requests. The prototype keeps requests only for the year being prepared, so the earlier years' commitments are kept in a
//     register of their own (page BQ6): name, unit, activity code, the first and last fiscal year, and the amount of each year.
//     "Pull" makes one draft request per commitment that started before this year and ends this year or later and has not been
//     pulled yet: the amount of this year is the one line, the later years go in the multi-year table, last year's amount is
//     "last year" for the comparison, and the request carries r.cont (which commitment, first and last year). The owning
//     division then edits the draft like any other. Planning pulls for every unit, a division for its own unit.
// The register's rows are samples of mine (three, one of them already finished); Planning keeps the real ones. Nothing is
// read from a previous year's system: the commitments are typed or seeded, not derived from last year's requests.
const MC_APP = "DPT Budget";
const mcCan = () => ROLE === "plan";
const mcSum = c => sumv(Object.values(c.years || {}).map(Number));
const mcVisible = c => !(typeof unitRole === "function" && unitRole()) || c.unit === me().unit;
const mcActId = code => { const n = (S.structure[FORM_FY] || []).find(x => x.lvl === "activity" && x.code === code && !x.retired); return n ? n.id : ""; };
const mcPulled = c => S.requests.find(r => r.cont && r.cont.id === c.id);
const mcState = c => (c.retired ? "retired" : c.endFy < FORM_FY ? "done" : c.startFy >= FORM_FY ? "future" : mcPulled(c) ? "pulled" : "ready");
const MC_ST = { ready: [["รอดึงเป็นคำขอ", "Waiting to be pulled"], "p-warn"], pulled: [["ดึงเป็นคำขอแล้ว", "Pulled into a request"], "p-ok"], done: [["ครบระยะเวลาแล้ว", "Period finished"], "p-mute"], future: [["เริ่มปีหลัง", "Starts later"], "p-info"], retired: [["เลิกใช้", "Retired"], "p-mute"] };
const mcReady = () => (S.commits || []).filter(c => mcState(c) === "ready" && mcVisible(c));
function mcPull(c) {
  if (mcState(c) !== "ready") return null;
  const amt = Number(c.years[FORM_FY] || 0), years = {}; Object.keys(c.years).filter(y => Number(y) >= FORM_FY).forEach(y => (years[y] = Number(c.years[y]) || 0));
  const r = { id: nextReqId(), unit: c.unit, act: mcActId(c.actCode), prev: Number(c.years[FORM_FY - 1] || 0), status: "draft", updated: TODAY, name: [c.name[0], c.name[1] || c.name[0]], kpi: "",
    reason: `รายการผูกพันต่อเนื่องจากปีก่อน ดึงมาตั้งต้นจากทะเบียนรายการผูกพัน ${c.id} ผูกพัน ${c.startFy} ถึง ${c.endFy} ให้แก้ไขเหตุผลตามความจำเป็นของปีนี้`, docs: [], items: [{ type: c.type || "ope", name: c.name[0], qty: 1, unitName: L("งาน", "job"), price: amt }], amount: 0, versions: [], comments: [],
    multi: true, years, cont: { id: c.id, start: c.startFy, end: c.endFy } };
  r.amount = reqAmount(r); S.requests.unshift(r); snapshot(r, ["ดึงรายการผูกพันต่อเนื่อง", "Pulled a continuing commitment"], true); audit(["ดึงรายการผูกพันต่อเนื่องเป็นคำขอ", "Pulled a continuing commitment into a request"], `${c.id} → ${r.id}`);
  return r;
}
const mcPullAll = () => mcReady().map(mcPull).filter(Boolean);

// ---------- the kind of request on the main tab ----------
const RQ_KINDS = { year: ["รายการปีเดียว", "Single-year item"], multi: ["รายการผูกพัน", "Multi-year commitment item"] };
function rqKindRow(r, ed) {
  const cont = r.cont, can = ed && !cont;
  return `<div class="f full"><label for="rq-kind">${L("ประเภทคำขอ", "Kind of request")}</label><div class="row">${can ? `<select id="rq-kind" aria-label="${L("ประเภทคำขอ", "Kind of request")}">${Object.keys(RQ_KINDS).map(k => `<option value="${k}" ${(r.multi ? "multi" : "year") === k ? "selected" : ""}>${esc(tx(RQ_KINDS[k]))}</option>`).join("")}</select>` : `<span>${r.multi ? tag(tx(RQ_KINDS.multi), "p-info") : tag(tx(RQ_KINDS.year), "p-mute")}</span>`}
    ${cont ? `${tag(L("ผูกพันต่อเนื่องจากปีก่อน", "Continuing from an earlier year"), "p-warn")} <span class="sub">${cont.id} · ${L("ผูกพัน", "commitment")} ${cont.start}–${cont.end} · ${L("เปลี่ยนเป็นปีเดียวไม่ได้", "can't be made single-year")}</span>` : `<span class="sub">${r.multi ? L("แบ่งวงเงินตามปีที่แท็บ ผูกพันหลายปี", "Split the amount by year on the Multi-year tab") : L("เลือก รายการผูกพัน ถ้าต้องก่อหนี้ข้ามปีงบประมาณ", "Choose the commitment kind if it commits money across fiscal years")}</span>`}</div></div>`;
}
function mcSetKind(r, kind) {
  if (r.cont) return L("รายการผูกพันต่อเนื่องจากปีก่อน เปลี่ยนประเภทไม่ได้", "A continuing commitment can't change kind");
  if (kind === "multi" && !r.multi) { r.multi = true; r.years = r.years || { [FORM_FY]: r.amount, [FORM_FY + 1]: 0 }; audit(["เปลี่ยนเป็นคำขอผูกพัน", "Made the request a multi-year commitment"], r.id); return ""; }
  if (kind === "year" && r.multi) { const later = Object.keys(r.years || {}).filter(y => Number(y) > FORM_FY && Number(r.years[y]) > 0); if (later.length) return L(`ปี ${later.join(", ")} ยังมีวงเงิน ล้างที่แท็บผูกพันหลายปีก่อน`, `Year ${later.join(", ")} still holds an amount; clear it on the Multi-year tab first`); r.multi = false; delete r.years; audit(["เปลี่ยนเป็นคำขอปีเดียว", "Made the request single-year"], r.id); return ""; }
  return "";
}
{ // bind the select, and the pull button on the request list
  const bb = BIND.request;
  BIND.request = () => { bb(); const r = curReq(); if (!r || REQ_TAB !== "main") return; const k = $("#rq-kind"); if (k) k.onchange = e => { const m = mcSetKind(r, e.target.value); if (m) { toast(m); route(); return; } save(); route(); }; };
  const vb = VIEWS.requests;
  VIEWS.requests = () => { const html = vb(); if (rqYear() !== FORM_FY || !(ROLE === "plan" || (typeof unitRole === "function" && unitRole()))) return html; const n = mcReady().length; if (!n) return html;
    return `<section class="panel" id="mc-callout"><div class="body row">${tag(L("รายการผูกพันจากปีก่อน", "Commitments from earlier years"), "p-warn")} <span>${n} ${L("รายการที่ยังไม่ครบระยะเวลา ยังไม่ได้ดึงเป็นคำขอปี", "not yet at their end year and not pulled into a request for")} ${FORM_FY}</span><button class="btn primary" type="button" id="mc-pull">${L("ดึงมาตั้งต้นคำขอ", "Pull them in as starting requests")}</button><button class="btn ghost" type="button" data-jump="bq-commit">${L("ดูทะเบียนรายการผูกพัน", "Open the commitment register")}</button></div></section>` + html; };
  const bq = BIND.requests;
  BIND.requests = () => { bq(); const b = $("#mc-pull"); if (b) b.onclick = () => { const got = mcPullAll(); commit(); route(); toast(L(`ดึงแล้ว ${got.length} รายการเป็นร่างคำขอ`, `Pulled ${got.length} items as draft requests`)); }; $$("#view [data-jump]").forEach(x => (x.onclick = () => jump(x.dataset.jump))); };
}

// ---------- the register ----------
const mcFv = (v, k, d) => (v && v[k] !== undefined ? v[k] : d);
CRUD.def("commit", {
  noun: ["รายการผูกพัน", "Multi-year commitment"], st: MC_ST, status: c => mcState(c), gone: c => !!c.retired, id: c => c.id, title: c => tx(c.name), sub: c => `${c.startFy}–${c.endFy} · ${fmt(mcSum(c))}`, live: true,
  list: () => (S.commits || []).filter(mcVisible).slice().sort((a, b) => b.endFy - a.endFy || String(a.id).localeCompare(String(b.id))), search: c => `${c.id} ${c.name.join(" ")} ${unitName(c.unit)} ${c.actCode}`,
  filters: [{ id: "st", label: ["สถานะ", "Status"], opts: () => Object.keys(MC_ST).map(k => [k, tx(MC_ST[k][0])]), get: c => mcState(c) }, { id: "un", label: ["หน่วยงาน", "Unit"], opts: () => [...new Set((S.commits || []).filter(mcVisible).map(c => c.unit))].map(u => [u, unitName(u)]), get: c => c.unit }],
  cols: [{ h: ["เลขที่", "No."], c: c => `<span class="mono">${c.id}</span>` }, { h: ["รายการ", "Item"], c: c => esc(tx(c.name)) }, { h: ["หน่วยงาน", "Unit"], c: c => `<span class="sub">${esc(unitName(c.unit))}</span>` }, { h: ["ระยะผูกพัน", "Period"], c: c => `${c.startFy}–${c.endFy}` },
    { h: ["วงเงินรวม (บาท)", "Total (baht)"], n: true, c: c => fmt(mcSum(c)) }, { h: [`ปี ${FORM_FY} (บาท)`, `FY${FORM_FY} (baht)`], n: true, c: c => (c.years[FORM_FY] != null ? fmt(c.years[FORM_FY]) : "–") }, { h: ["คำขอ", "Request"], c: c => (mcPulled(c) ? `<span class="mono">${mcPulled(c).id}</span>` : "–") }],
  fields: (c, v) => { const s = Number(mcFv(v, "startFy", c ? c.startFy : FORM_FY - 1)) || FORM_FY - 1, e = Number(mcFv(v, "endFy", c ? c.endFy : FORM_FY + 1)) || s, ys = []; for (let y = s; y <= e && y - s < 10; y++) ys.push(y);
    return [{ id: "th", label: ["ชื่อรายการ", "Item name"], req: true, wide: true, value: c ? c.name[0] : "" }, { id: "en", label: ["ภาษาอังกฤษ", "English"], wide: true, value: c ? c.name[1] : "" },
      { id: "unit", label: ["หน่วยงานเจ้าของ", "Owning unit"], type: "select", req: true, value: c ? c.unit : "", blank: L("— เลือก —", "— choose —"), opts: (S.units || []).filter(u => u.parent).map(u => [u.id, tx(u.name)]) },
      { id: "actCode", label: ["กิจกรรม (รหัส)", "Activity (code)"], type: "select", req: true, value: c ? c.actCode : "", blank: L("— เลือก —", "— choose —"), opts: (S.structure[FORM_FY] || []).filter(n => n.lvl === "activity" && !n.retired).map(n => [n.code, `${n.code} · ${tx(n.name)}`]), hint: L("รหัสกิจกรรมคงที่ข้ามปี ระบบหากิจกรรมของปีนี้จากรหัส", "The activity code is the same across years; the system finds this year's activity by it") },
      { id: "type", label: ["งบรายจ่ายของรายการ", "Budget type of the line"], type: "select", req: true, value: c ? c.type || "ope" : "inv", opts: typeOpts() },
      { id: "startFy", label: ["ปีงบประมาณแรก", "First fiscal year"], type: "number", req: true, min: 2560, max: 2600, value: s }, { id: "endFy", label: ["ปีงบประมาณสุดท้าย", "Last fiscal year"], type: "number", req: true, min: 2560, max: 2610, value: e },
      ...ys.map(y => ({ id: "y_" + y, label: [`วงเงินปี ${y} (ล้านบาท)`, `Amount for FY${y} (million baht)`], type: "money", req: true, min: 0, value: c && c.years[y] != null ? c.years[y] : 0 }))]; },
  check: (v, c) => { const out = [], s = Number(v.startFy), e = Number(v.endFy); if (e < s) out.push({ f: "endFy", m: L("ปีสุดท้ายต้องไม่ก่อนปีแรก", "The last year can't be before the first") }); else if (e - s > 9) out.push({ f: "endFy", m: L("ผูกพันได้ไม่เกิน 10 ปี", "At most 10 years") });
    if (!out.length && !(Object.keys(v).filter(k => k.startsWith("y_")).reduce((t, k) => t + Number(v[k] || 0), 0) > 0)) out.push({ f: null, m: L("ต้องมีวงเงินอย่างน้อยหนึ่งปี", "At least one year needs an amount") });
    if (c && mcPulled(c) && (s !== c.startFy || e !== c.endFy)) out.push({ f: null, m: L("ดึงเป็นคำขอแล้ว แก้ระยะเวลาไม่ได้ (แก้ที่คำขอ)", "Already pulled into a request; the period can't change (change the request)") }); return out; },
  create: { can: mcCan, label: ["เพิ่มรายการผูกพัน", "Add a commitment"], run: v => { const years = {}; Object.keys(v).filter(k => k.startsWith("y_")).forEach(k => (years[k.slice(2)] = Number(v[k]) || 0)); const c = { id: `MC-${String(Math.max(0, ...(S.commits || []).map(x => Number(String(x.id).replace(/\D/g, "")) || 0)) + 1).padStart(3, "0")}`, name: [v.th, v.en || v.th], unit: v.unit, actCode: v.actCode, type: v.type, startFy: Number(v.startFy), endFy: Number(v.endFy), years }; S.commits.push(c); audit(["เพิ่มรายการผูกพัน", "Added a commitment"], `${c.id} ${v.th}`); return c; } },
  edit: { can: c => mcCan() && !c.retired, run: (c, v) => { const years = {}; Object.keys(v).filter(k => k.startsWith("y_")).forEach(k => (years[k.slice(2)] = Number(v[k]) || 0)); Object.assign(c, { name: [v.th, v.en || v.th], unit: v.unit, actCode: v.actCode, type: v.type, startFy: Number(v.startFy), endFy: Number(v.endFy), years }); audit(["แก้รายการผูกพัน", "Changed a commitment"], c.id); } },
  acts: c => (mcCan() ? retireAct(["รายการผูกพัน", "commitment"], x => !!mcPulled(x), x => { S.commits = S.commits.filter(y => y !== x); })(c).concat(mcState(c) === "ready" ? [{ id: "pull", label: L("ดึงเป็นคำขอปีนี้", "Pull into this year's requests"), kind: "primary", run: () => { const r = mcPull(c); return r ? L(`ดึงเป็นคำขอ ${r.id} แล้ว`, `Pulled as ${r.id}`) : L("ดึงไม่ได้", "Can't pull"); } }] : []) : []),
  view: c => kv([[L("เลขที่", "No."), c.id], [L("หน่วยงาน", "Unit"), esc(unitName(c.unit))], [L("กิจกรรม", "Activity"), esc(c.actCode)], [L("ระยะผูกพัน", "Period"), `${c.startFy}–${c.endFy}`], [L("วงเงินแต่ละปี", "Amount by year"), Object.keys(c.years).sort().map(y => `${y}: ${fmt(c.years[y])}`).join("<br>")], [L("วงเงินรวม", "Total"), `${fmt(mcSum(c))} ${L("บาท", "baht")}`],
    [L("คำขอที่ดึงมา", "Pulled request"), mcPulled(c) ? mcPulled(c).id : "–"]]),
});

// ---------- seed ----------
Object.keys(SEEDS).forEach(k => {
  const prev = SEEDS[k].seed;
  SEEDS[k].seed = () => {
    const s = prev(), us = [...new Set(s.requests.map(r => r.unit))], acts = ((s.structure || {})[FORM_FY] || []).filter(n => n.lvl === "activity"), u0 = us[0], u1 = us[1] || us[0], F = FORM_FY;
    s.commits = [{ id: "MC-001", name: ["ระบบสารสนเทศตัวอย่าง (ผูกพันข้ามปี)", "Sample information system (multi-year)"], unit: u0, actCode: (acts[0] || {}).code || "", type: "inv", startFy: F - 1, endFy: F + 1, years: { [F - 1]: 9e6, [F]: 12e6, [F + 1]: 6e6 } },
      { id: "MC-002", name: ["งานก่อสร้างตัวอย่าง ปีสุดท้ายของผูกพัน", "Sample construction, last year of the commitment"], unit: u1, actCode: (acts[1] || acts[0] || {}).code || "", type: "inv", startFy: F - 2, endFy: F, years: { [F - 2]: 5e6, [F - 1]: 8e6, [F]: 4e6 } },
      { id: "MC-003", name: ["โครงการตัวอย่างที่ครบระยะเวลาแล้ว", "Sample project whose period has finished"], unit: u0, actCode: (acts[0] || {}).code || "", type: "ope", startFy: F - 3, endFy: F - 1, years: { [F - 3]: 3e6, [F - 2]: 3e6, [F - 1]: 2e6 } }];
    return s;
  };
});

// ---------- page BQ6 ----------
ePageDef("budget", "bq-commit", "BQ6", "form", KROLES, ["ทะเบียนรายการผูกพัน", "Multi-year commitment register"], () => {
  const all = (S.commits || []).filter(mcVisible), n = k => all.filter(c => mcState(c) === k).length, can = ROLE === "plan" || (typeof unitRole === "function" && unitRole()), ready = mcReady().length;
  return `${eHead(MC_APP, "BQ6", ["ทะเบียนรายการผูกพันข้ามปี", "Multi-year commitment register"], ["รายการผูกพันของปีก่อนที่ยังไม่ครบระยะเวลา ดึงเป็นร่างคำขอของปีนี้เพื่อตั้งต้น (กองแผนงานดึงทุกหน่วย สำนัก/กองดึงของหน่วยตน) · ต้นแบบเก็บคำขอไว้เฉพาะปีที่กำลังจัดทำ จึงมีทะเบียนนี้แยกต่างหาก ข้อมูลตั้งต้น 3 รายการเป็นตัวอย่างของผม กองแผนงานแทนด้วยรายการจริง ไม่ได้ดึงจากระบบของปีก่อน", "Commitments of earlier years that have not reached their end year; pull them into draft requests for this year as a starting point (Planning for every unit, a division for its own) · the prototype keeps requests only for the year being prepared, hence this register · the three starting rows are my samples; Planning replaces them; nothing is read from last year's system"])}
    ${eKpis([[L("ทั้งหมด", "All"), all.length], [L("รอดึงเป็นคำขอ", "Waiting to be pulled"), n("ready"), "", n("ready") > 0], [L("ดึงแล้ว", "Pulled"), n("pulled")], [L("ครบระยะเวลาแล้ว", "Finished"), n("done")]])}
    ${can ? `<section class="panel"><div class="body row"><button class="btn primary" type="button" id="mc-pull" ${ready ? "" : "disabled"}>${L("ดึงมาตั้งต้นคำขอปี", "Pull in as starting requests for")} ${FORM_FY} (${ready})</button><span class="sub">${L("ดึงเฉพาะรายการที่เริ่มก่อนปีนี้ ยังไม่ครบระยะเวลา และยังไม่เคยดึง", "Only those that started before this year, have not finished and were not pulled yet")}</span></div></section>` : ""}
    ${!(ROLE === "plan") ? eNote(L("เฉพาะกองแผนงานเพิ่มหรือแก้ทะเบียน", "Only Planning adds or edits the register")) : ""}${crudList("commit", { head: `<h2>${L("รายการผูกพัน", "Commitments")}</h2>` })}`;
}, () => { const b = $("#mc-pull"); if (b) b.onclick = () => { const got = mcPullAll(); commit(); route(); toast(L(`ดึงแล้ว ${got.length} รายการเป็นร่างคำขอ`, `Pulled ${got.length} items as draft requests`)); }; });
Object.assign(NAV_ICON, { "bq-commit": "layers" });
