// Fisko-KlangFinance, round P88 (25 Nov 2569), the procurement plan and the request, as asked:
// 3.1 แผนจัดซื้อ (กองแผนงาน): the import stays; the money plan has its own menu (แผนเงิน, see 98zzzzp) and is taken off the item list
//     and the dashboard of the items. After the import Planning writes the details of its part of the follow-up form (columns 1-15 and
//     56-67: เริ่มตั้ง, ตาม พ.ร.บ./โอนเปลี่ยนแปลง, ผลผลิต/โครงการ, ลักษณะงบประมาณ, จังหวัด, งปม.ทั้งสิ้น, the budget by year), assigns the
//     bureau/division responsible and the amount given to it. Data: bi row .pl = { startY, act, prod, years, prov, total, yrs{}, allot }.
// 3.2 ขอจัดซื้อจัดจ้าง: the unit attaches documents and lets the AI fill the details (simulated: it reads the names of the files and the
//     item); the unit's columns of the form are added (สำรวจ/ออกแบบ, แบบแล้วเสร็จ, ประมาณราคา, TOR แล้วเสร็จ); the unit chooses who sends
//     e-GP (the unit itself or กองคลัง, เจ้าหน้าที่พัสดุ), checks and sends to the approver. After the approval, when the Treasury does e-GP,
//     the procurement officers get a notice. Data: req.detail.{survey, designDone, estDate, torDone}, req.egpBy and case.egpBy ("self" | "proc").
// 3.3 บริหารงบประมาณ (the cases page): a list of the approved items, by who sends e-GP and by the role signed in. A unit that sends e-GP
//     itself records the e-GP steps of its own items.

// ---------- 3.1 Planning's details ----------
const PL88_YRS = Array.from({ length: 11 }, (x, i) => 2563 + i);
let PL88_EDIT = null;
const pl88Of = r => (r.pl = r.pl || {});
const pl88Done = r => { const p = r.pl || {}; return ["startY", "act", "prod", "years", "prov", "total"].filter(k => p[k] !== "" && p[k] != null).length; };
function pl88Save(id, v) { if (!biCanImport()) return "เฉพาะกองแผนงานบันทึกรายละเอียด"; const r = biData().rows.find(x => x.id === id); if (!r) return "ไม่พบรายการ"; const p = pl88Of(r);
  const num = x => (x === "" || x == null ? "" : Number(x));
  if (v.total !== "" && v.total != null && !(Number(v.total) >= 0)) return "งปม.ทั้งสิ้นต้องเป็นตัวเลข"; if (v.allot !== "" && v.allot != null && !(Number(v.allot) > 0)) return "จำนวนงบประมาณให้หน่วยงานต้องมากกว่า 0";
  if (v.allot !== "" && v.allot != null && Number(v.allot) > r.amount + 0.5) return `จำนวนงบประมาณให้หน่วยงานต้องไม่เกินวงเงินของรายการ (${fmt(r.amount)} บาท)`;
  if (v.unit && r.sent && v.unit !== (biUnit(r) || {}).id) return "นำส่งสำนัก/กองแล้ว เปลี่ยนหน่วยงานที่รับผิดชอบไม่ได้";
  if (v.unit) { const u = S.units.find(x => x.id === v.unit); if (!u) return "ไม่พบหน่วยงาน"; r.unit = u.id; r.unitName = tx(u.name); }
  ["startY", "act", "prod", "years", "prov"].forEach(k => { if (k in v) p[k] = String(v[k] || "").trim(); }); if ("total" in v) p.total = num(v.total); if ("allot" in v) p.allot = num(v.allot);
  p.yrs = p.yrs || {}; PL88_YRS.forEach(y => { if (("y" + y) in v) p.yrs[y] = num(v["y" + y]); });
  if (r.sent && p.allot) { const pp = S.pplan.find(x => x.id === r.sent.pp); if (pp) pp.est = Number(p.allot); }
  p.by = me().id; p.t = nowIso(); audit(["บันทึกรายละเอียดรายการงบประมาณ (กองแผนงาน)", "Planning wrote the details of a budget item"], id); return ""; }
function pl88Form(r) { const p = r.pl || {}, u = biUnit(r), v = (k, d) => esc(p[k] == null || p[k] === "" ? (d == null ? "" : d) : p[k]), fy = biFy(r);
  const units = S.units.filter(x => !x.retired).map(x => `<option value="${x.id}" ${u && u.id === x.id ? "selected" : ""}>${esc(tx(x.name))}</option>`).join("");
  const provs = [...new Set((S.geo || []).filter(g => !g.retired).map(g => g.prov).filter(Boolean))].sort((a, b) => a.localeCompare(b, "th"));
  return `<form data-pl88="${esc(r.id)}" class="inline-form" style="display:flex;flex-wrap:wrap;gap:10px;padding:8px 0">
    <div class="sub" style="flex:1 1 100%">รายละเอียดส่วนของกองแผนงาน (ตามแบบฟอร์มติดตามความก้าวหน้า คอลัมน์ 1-15 และ 56-67) · ไม่บังคับทุกช่อง</div>
    <div class="f"><label>สำนัก/กองที่รับผิดชอบ *</label><select name="unit" ${r.sent ? "disabled" : ""}><option value="">— เลือก —</option>${units}</select></div>
    <div class="f"><label>จำนวนงบประมาณให้หน่วยงาน (บาท)</label><input type="number" name="allot" min="0" step="0.01" value="${v("allot", r.amount)}"></div>
    <div class="f"><label>เริ่มตั้ง (ปี พ.ศ.)</label><input type="number" name="startY" min="2560" max="2580" step="1" value="${v("startY", fy)}" style="width:110px"></div>
    <div class="f"><label>ที่มา</label><select name="act">${["", "ตาม พ.ร.บ.", "โอนเปลี่ยนแปลง"].map(x => `<option value="${x}" ${(p.act || "") === x ? "selected" : ""}>${x || "—"}</option>`).join("")}</select></div>
    <div class="f" style="flex:1 1 240px"><label>ผลผลิต/โครงการ</label><input name="prod" value="${v("prod", r.prod)}"></div>
    <div class="f"><label>ลักษณะงบประมาณ</label><select name="years">${["", "ปีเดียว", "ผูกพัน"].map(x => `<option value="${x}" ${(p.years || (/ผูกพัน/.test(r.years || "") ? "ผูกพัน" : "")) === x ? "selected" : ""}>${x || "—"}</option>`).join("")}</select></div>
    <div class="f"><label>พื้นที่ดำเนินการ (จังหวัด)</label><select name="prov"><option value="">—</option>${provs.map(x => `<option ${p.prov === x ? "selected" : ""}>${esc(x)}</option>`).join("")}</select></div>
    <div class="f"><label>งปม.ทั้งสิ้น (ลบ.)</label><input type="number" name="total" min="0" step="0.0001" value="${v("total", Math.round(r.amount / 1e6 * 1e4) / 1e4)}" style="width:120px"></div>
    <div style="flex:1 1 100%;display:flex;flex-wrap:wrap;gap:6px;align-items:flex-end"><span class="sub" style="flex:1 1 100%">งบประมาณรายปี (ลบ.)</span>${PL88_YRS.map(y => `<div class="f"><label>ปี ${y}</label><input type="number" name="y${y}" min="0" step="0.0001" style="width:86px" value="${esc(p.yrs && p.yrs[y] != null && p.yrs[y] !== "" ? p.yrs[y] : y === fy ? Math.round(r.amount / 1e6 * 1e4) / 1e4 : "")}"></div>`).join("")}</div>
    <div class="row" style="flex:1 1 100%;gap:8px"><button class="btn primary" type="submit">บันทึกรายละเอียด</button><button class="btn ghost" type="button" data-pl88x>ปิด</button></div></form>`; }
{ const base = biTable; biTable = function (list, can) { if (!m88On()) return base(list, can); if (!list.length) return `<div class="sub">ไม่มีรายการ</div>`;
    return `<div class="tbl-wrap"><table class="bi-table bi88"><thead><tr><th>รหัส</th><th>สำนัก/กองที่รับผิดชอบ</th><th>รหัสงบประมาณ</th><th style="min-width:220px">รายการ</th><th>งบรายจ่าย</th><th class="n">วงเงิน (บาท)</th><th class="n">ให้หน่วยงาน (บาท)</th><th>รายละเอียดกองแผน</th><th>สถานะ</th></tr></thead><tbody>
      ${list.map(r => { const is = biIssues(r, biData().rows), p = r.pl || {}, d = pl88Done(r); return `<tr><td class="mono sub">${esc(r.id)}</td><td>${esc(pdUnit(r))}</td><td class="mono">${esc(r.code || "—")}</td><td>${esc(r.name)}<div class="sub">${r.type ? `<span class="pill p-info">${esc(r.type)}</span> ` : ""}${r.ebud ? `e-bud ${esc(r.ebud)} · ` : ""}${esc(p.prod || r.prod || "")}</div></td><td>${esc(r.kind)}</td><td class="n">${fmt(r.amount)}</td><td class="n">${p.allot ? fmt(p.allot) : `<span class="sub">${fmt(r.amount)}</span>`}</td>
        <td>${tag(`${d}/6`, d >= 6 ? "p-ok" : d ? "p-warn" : "p-mute")}${can ? `<div><button class="btn ghost" type="button" data-pl88e="${esc(r.id)}" aria-expanded="${PL88_EDIT === r.id}">${PL88_EDIT === r.id ? "ปิด" : "ใส่รายละเอียด / มอบหมาย"}</button></div>` : ""}</td>
        <td>${r.sent ? `${tag("นำส่งสำนัก/กองแล้ว", "p-ok")}<div class="sub">${esc(r.sent.pp)} · ${fdate(r.sent.t, true)}</div>` : `${tag("นำเข้ารายการ", "p-info")}${is.length ? `<div class="sub" style="color:var(--bad)">${esc(is.join(" · "))}</div>` : ""}${can ? `<div><button class="btn ghost" type="button" data-bisend="${esc(r.id)}">นำส่งสำนัก/กอง</button></div>` : ""}`}</td></tr>${can && PL88_EDIT === r.id ? `<tr class="fn-rowform"><td colspan="9">${pl88Form(r)}</td></tr>` : ""}`; }).join("")}</tbody></table></div>`; }; }
// the money plan is on แผนเงิน: off the dashboard and the filters of the item list
{ const base = biView; biView = function () { const h = base(); if (!m88On()) return h;
    return h.replace(/<section class="panel"><header><h2>แผนเงินรายเดือน[\s\S]*?<\/section>/, "").replace(/<div class="f"><label>มีแผนเงินเดือน<\/label><select data-pdf="mon">[\s\S]*?<\/select><\/div>/, ""); }; }
// the amount given to the unit becomes the estimate of the plan item
{ const base = biSend; biSend = function (ids) { const r = base(ids); (r.sent || []).forEach(id => { const b = biData().rows.find(x => x.id === id), p = b && b.sent && S.pplan.find(x => x.id === b.sent.pp); if (p && b.pl && Number(b.pl.allot) > 0) p.est = Number(b.pl.allot); }); return r; }; }

// ---------- 3.2 the request: AI, the unit's columns, who sends e-GP ----------
const RQ88_F = [["pr-survey", "survey", "สำรวจ/ออกแบบ (ว/ด/ป)"], ["pr-design", "designDone", "แบบแล้วเสร็จ (ว/ด/ป)"], ["pr-est", "estDate", "ประมาณราคา (ว/ด/ป)"], ["pr-tor", "torDone", "จัดทำ TOR แล้วเสร็จ (ว/ด/ป)"]];
const RQ88_BY = { proc: "กองคลัง (เจ้าหน้าที่พัสดุ) ดำเนินการให้", self: "สำนัก/กองดำเนินการส่ง e-GP เอง" };
{ const base = rqReadVals; rqReadVals = function () { const v = base(), g = id => { const el = document.getElementById(id); return el ? el.value.trim() : ""; };
    RQ88_F.forEach(([id, k]) => (v[k] = g(id))); const by = document.querySelector('#rq-inline input[name="rq-egpby"]:checked'); v.egpBy = by ? by.value : ""; return v; }; }
{ const base = rqFormHtml; rqFormHtml = function (c) { const h = base(c), d = c.rqDraft || {}, by = d.egpBy || c.egpBy || "proc", ai = c.rq88Ai;
    const sec = `<section class="rq88"><h3>3 · ข้อมูลตามแบบฟอร์มติดตาม (ส่วนของสำนัก/กอง) และการส่ง e-GP</h3><div class="row" style="flex-wrap:wrap;gap:10px">
      ${RQ88_F.map(([id, k, t]) => `<div class="f" style="flex:1 1 180px"><label for="${id}">${t}</label><input type="date" id="${id}" value="${esc(d[k] || "")}"></div>`).join("")}
      <div class="f" style="flex:1 1 100%"><label>ผู้ดำเนินการส่ง e-GP *</label><div class="row" style="gap:16px">${Object.entries(RQ88_BY).map(([k, t]) => `<label style="font-weight:400"><input type="radio" name="rq-egpby" value="${k}" ${by === k ? "checked" : ""}> ${t}</label>`).join("")}</div><div class="sub">ถ้าให้กองคลังดำเนินการ ระบบแจ้งเตือนเจ้าหน้าที่พัสดุเมื่อผู้มีอำนาจอนุมัติแล้ว</div></div></div></section>`;
    const aiBar = `<div class="rq88-ai" style="border:1px dashed var(--accent,#3b4fa8);border-radius:8px;padding:8px 10px;display:flex;flex-wrap:wrap;gap:8px;align-items:center"><b>AI ช่วยกรอก</b><span class="sub" style="flex:1 1 260px">แนบเอกสาร (ร่าง TOR ใบเสนอราคา แบบรูป ประมาณราคา) ในแผงเอกสารแนบ แล้วให้ AI อ่านและกรอกช่องที่ยังว่าง (จำลอง) ตรวจสอบความถูกต้องก่อนส่งผู้อนุมัติ</span><button class="btn" type="button" data-rq88ai="${c.id}">ให้ AI ประมวลผลเอกสารแนบ</button>${ai ? `<div class="sub" style="flex:1 1 100%">AI กรอกแล้ว ${ai.n} ช่อง จาก ${ai.files} ไฟล์ เมื่อ ${fdate(ai.t.slice(0, 10))}: ${esc(ai.list.join(", ") || "ไม่มีช่องว่างให้กรอก")} · ตรวจสอบแล้วแก้ไขได้</div>` : ""}</div>`;
    return h.replace(/(<form id="rq-inline"[^>]*>)/, "$1" + aiBar).replace(/<\/form>\s*$/, sec + "</form>"); }; }
// the AI (simulated): what it "reads" comes from the file names, the item and the plan; it fills only empty fields
function rq88Ai(c) { const p = famPlan(c.plan), n = tx(p.name), files = RQ_FILES.map(f => f.name), out = [];
  if (!files.length) return { err: "แนบเอกสารก่อน แล้วให้ AI ประมวลผล" };
  const set = (id, val, lab) => { const el = document.getElementById(id); if (!el || el.value.trim() || val === "" || val == null) return; el.value = val; out.push(lab); };
  const day = k => { const t = new Date(Date.parse(TODAY + "T00:00:00Z") - k * 864e5); return t.toISOString().slice(0, 10); }, has = re => files.some(f => re.test(f));
  set("pr-obj", `เพื่อดำเนินการ${n} ตามแผนปฏิบัติราชการ ให้เกิดประโยชน์ต่อประชาชนในพื้นที่`, "วัตถุประสงค์");
  set("pr-scope", `ดำเนินการ${n} ตามแบบรูปรายการและข้อกำหนดในเอกสารแนบ (${files.slice(0, 3).join(", ")})`, "ขอบเขตงาน");
  set("pr-deliv", /ก่อสร้าง|เขื่อน|อาคาร|ถนน|ระบาย/.test(n) ? "งานก่อสร้างแล้วเสร็จตามแบบ พร้อมส่งมอบ" : "ส่งมอบพัสดุ/งานครบตามรายการ พร้อมเอกสารประกอบ", "ผลงานที่ต้องส่งมอบ");
  set("pr-place", "พื้นที่ดำเนินการตามรายการ", "สถานที่ส่งมอบ"); set("pr-phone", "0 2000 0000", "เบอร์ติดต่อ (ตัวอย่าง)");
  set("pr-survey", day(40), "สำรวจ/ออกแบบ"); set("pr-design", has(/แบบ|drawing|dwg/i) ? day(25) : "", "แบบแล้วเสร็จ"); set("pr-est", has(/ประมาณ|ราคา|BOQ|boq/) ? day(15) : "", "ประมาณราคา"); set("pr-tor", has(/TOR|tor|ขอบเขต/) ? day(7) : "", "TOR แล้วเสร็จ");
  const m = n.match(/ไม่น้อยกว่า\s*([\d,]+)\s*เมตร/); if (m) set("pr-qlen", m[1].replace(/,/g, ""), "ความยาว (เมตร)");
  c.rq88Ai = { t: nowIso(), by: me().id, n: out.length, files: files.length, list: out }; return { n: out.length, list: out }; }
{ const base = rqSubmit; rqSubmit = function (c) { const v = rqReadVals(), before = S.reqn.length; base(c); if (S.reqn.length === before) return; const r = S.reqn[S.reqn.length - 1];
    RQ88_F.forEach(([, k]) => { if (v[k]) r.detail[k] = v[k]; }); r.egpBy = v.egpBy === "self" ? "self" : "proc"; c.egpBy = r.egpBy; commit(); }; }
{ const base = rqDecide; rqDecide = function (id, ok) { const rq = famReq(id), was = rq && rq.status; base(id, ok); if (!rq || was !== "pending" || rq.status !== "approved") return; const c = caseByPlan(rq.plan); if (c && !c.egpBy) c.egpBy = rq.egpBy || "proc";
    if ((rq.egpBy || "proc") === "proc") notify(["proc", "prochead"], [`ใบขอซื้อขอจ้าง ${rq.id} อนุมัติแล้ว: สำนัก/กองให้กองคลังดำเนินการส่ง e-GP (เจ้าหน้าที่พัสดุ)`, `Requisition ${rq.id} approved: the Treasury sends it to e-GP`], c ? "case:" + c.id : "prc-cases");
    else notify(["div", "divhead"], [`ใบขอซื้อขอจ้าง ${rq.id} อนุมัติแล้ว: สำนัก/กองดำเนินการส่ง e-GP เอง`, `Requisition ${rq.id} approved: the unit sends it to e-GP itself`], c ? "case:" + c.id : "prc-cases");
    commit(); renderShell(); }; }
// a unit that sends e-GP itself records the steps of its own items (it works as the procurement officer for that case only)
const rq88Self = c => !!c && c.egpBy === "self" && ["div", "divhead"].includes(ROLE) && famLine(famPlan(c.plan).line).unit === me().unit;
const rq88As = (c, fn) => { if (!rq88Self(c)) return fn(); const r0 = ROLE; ROLE = "proc"; try { return fn(); } finally { ROLE = r0; } };
{ const b1 = egpUpdatePanel; egpUpdatePanel = function (c) { return rq88As(c, () => b1(c)); }; const b2 = egp7Save; egp7Save = function (c, n, v, f) { return rq88As(c, () => b2(c, n, v, f)); }; const b3 = egp7SetStage; egp7SetStage = function (c, n) { return rq88As(c, () => b3(c, n)); }; }

// ---------- 3.3 บริหารงบประมาณ: the approved items, by who sends e-GP ----------
function rq88Approved() { const proc = isProcRole() || ["admin", "exec", "audit", "plan"].includes(ROLE), mine = ["div", "divhead"].includes(ROLE) ? me().unit : null;
  return S.cases.filter(c => { if (c.cancelled) return false; const rq = caseReq(c); if (!rq || rq.status !== "approved") return false; const by = c.egpBy || rq.egpBy || "proc", u = famLine(famPlan(c.plan).line).unit;
    if (mine) return u === mine; if (isProcRole()) return by === "proc"; return proc; }); }
function rq88List() { const L0 = rq88Approved(), f = M88.cf || "", list = L0.filter(c => !f || (c.egpBy || (caseReq(c) || {}).egpBy || "proc") === f);
  return `<section class="panel rq88-list"><header><h2>รายการที่ได้รับอนุมัติแล้ว</h2><span class="sp"></span><select data-m88cf aria-label="ผู้ดำเนินการส่ง e-GP"><option value="">ผู้ส่ง e-GP: ทั้งหมด</option>${Object.entries(RQ88_BY).map(([k, t]) => `<option value="${k}" ${f === k ? "selected" : ""}>${t}</option>`).join("")}</select></header><div class="body">
    <div class="sub" style="margin:0 0 6px">${isProcRole() ? "เจ้าหน้าที่พัสดุเห็นรายการที่สำนัก/กองให้กองคลังส่ง e-GP" : ["div", "divhead"].includes(ROLE) ? "รายการของสำนัก/กองของคุณ: รายการที่ส่ง e-GP เองอัปเดตขั้นตอน e-GP ได้ที่หน้ารายการ" : "ทุกรายการที่อนุมัติแล้ว"} · ${list.length} รายการ</div>
    ${list.length ? `<div class="tbl-wrap"><table class="rq88-t"><thead><tr><th>รายการจัดซื้อ</th><th>สำนัก/กอง</th><th class="n">วงเงินที่อนุมัติ (บาท)</th><th>ผู้ส่ง e-GP</th><th>ขั้น e-GP</th><th>สัญญา</th><th></th></tr></thead><tbody>
      ${list.map(c => { const rq = caseReq(c), by = c.egpBy || rq.egpBy || "proc", E = c.egp7, k = caseCon(c); return `<tr><td>${esc(caseName(c))}<div class="sub mono">${esc(c.id)} · ${esc(rq.id)}</div></td><td>${esc(unitName(famLine(famPlan(c.plan).line).unit))}</td><td class="n">${fmt(rq.amount)}</td><td>${tag(by === "self" ? "สำนัก/กองส่งเอง" : "กองคลัง", by === "self" ? "p-info" : "p-mute")}</td><td>${E && E.stage ? `${E.stage}/7 ${esc(EGP7[E.stage - 1].t)}` : `<span class="sub">ยังไม่เริ่ม</span>`}</td><td>${k ? esc(k.no || "มีสัญญา") : "–"}</td><td><button class="btn ghost" type="button" data-jump="case:${c.id}">เปิด</button></td></tr>`; }).join("")}</tbody></table></div>` : `<div class="sub">ยังไม่มีรายการที่อนุมัติ</div>`}</div></section>`; }
{ const base = PROC.cases; PROC.cases = () => (m88On() && !(CASE_OPEN && caseOf(CASE_OPEN)) ? rq88List() : "") + base(); }

// ---------- handlers ----------
document.addEventListener("click", e => { const t = e.target && e.target.closest ? e.target : null; if (!t) return;
  const ed = t.closest("[data-pl88e]"); if (ed) { PL88_EDIT = PL88_EDIT === ed.dataset.pl88e ? null : ed.dataset.pl88e; route(); return; }
  if (t.closest("[data-pl88x]")) { PL88_EDIT = null; route(); return; }
  const ai = t.closest("[data-rq88ai]"); if (ai) { const c = caseOf(ai.dataset.rq88ai); if (!c) return; const r = rq88Ai(c); if (r.err) { toast(r.err); return; } audit(["ให้ AI กรอกรายละเอียดขอซื้อขอจ้าง", "AI filled the request details"], c.id);
    const box = ai.closest(".rq88-ai"); if (box) { let s = box.querySelector(".rq88-ai-res"); if (!s) { s = document.createElement("div"); s.className = "sub rq88-ai-res"; s.style.flex = "1 1 100%"; box.appendChild(s); } s.textContent = `AI กรอกแล้ว ${r.n} ช่อง: ${r.list.join(", ") || "ไม่มีช่องว่างให้กรอก"} · ตรวจสอบความถูกต้องก่อนส่ง`; }
    toast(`AI กรอกแล้ว ${r.n} ช่อง ตรวจสอบก่อนส่งผู้อนุมัติ`); } });
document.addEventListener("change", e => { const t = e.target; if (t && t.matches && t.matches("[data-m88cf]")) { M88.cf = t.value; route(); } });
document.addEventListener("submit", e => { const f = e.target; if (!f || !f.matches || !f.matches("[data-pl88]")) return; e.preventDefault(); const d = new FormData(f), v = {};
  for (const [k, x] of d.entries()) v[k] = String(x); const m = pl88Save(f.dataset.pl88, v); if (m) { toast(m); return; } PL88_EDIT = null; commit(); route(); toast("บันทึกรายละเอียดแล้ว"); });
