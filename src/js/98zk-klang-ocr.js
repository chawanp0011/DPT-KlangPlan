// Fisko-KlangFinance, budget round Q5 (12 Nov 2569): bring a budget request in from a document, with a SIMULATED reader.
// What the user asked for: a division can enter a request from a PDF or an image by OCR, and the system processes it so the
// data goes in correctly. A real OCR cannot run in this single-page prototype (no server, nothing reads the file). So, like the
// procurement documents (file 63c): the file is attached and shown, but the "reading" is one of three fixed sample results that
// the user picks in the page; each has a confidence for every field, and some values are misread on purpose. The review step
// is the real part of this round:
//   - a field read with less than 80% confidence must be corrected or confirmed by a person before anything is created;
//   - the checks stop the import until they pass: the name, a unit, an activity code that exists in this year's structure, a type,
//     at least one line with a quantity and a price that are numbers, and the total read from the form must equal the sum of
//     the lines (or the person ticks "use the lines' total");
//   - then a DRAFT request is made for each request on the document (a document may hold several), owned by the unit, with the
//     lines, the reason, the type and the area, and the file name attached; r.src records that it came from a document, the
//     sample used and how many fields were changed.
// Who: a division imports for its own unit; Planning picks the unit. Nothing is sent anywhere and no file content is read.
const OC_APP = "DPT Budget";
const OC_MIN = 0.8; // below this a field must be checked
const OC_SAMPLES = { A: ["แบบคำของบ 1 รายการ (ราคาต่อหน่วยอ่านผิด)", "One-request form (unit price misread)"], B: ["ตาราง 2 คำขอในเอกสารเดียว (รหัสกิจกรรมอ่านผิด)", "Two requests on one document (activity code misread)"], C: ["ภาพถ่ายคุณภาพต่ำ (หลายช่องอ่านไม่ได้)", "Low-quality photo (many fields unreadable)"] };
let OCR = { file: null, sample: "A", docs: null, unit: "", err: "", done: null };
const ocF = (v, c) => ({ v: String(v), c, orig: String(v), ok: false });
const ocNum = s => { const t = String(s == null ? "" : s).replace(/[,\s]/g, ""); return /^\d+(\.\d+)?$/.test(t) ? Number(t) : NaN; };
const ocUnitByText = t => { const u = (S.units || []).filter(x => x.parent).find(x => x.name.some(n => n && String(t || "").includes(n))); return u ? u.id : ""; };
const ocActId = code => { const n = (S.structure[FORM_FY] || []).find(x => x.lvl === "activity" && x.code === String(code || "").trim() && !x.retired); return n ? n.id : ""; };
function ocRead(id) {
  const acts = (S.structure[FORM_FY] || []).filter(n => n.lvl === "activity" && !n.retired), a0 = (acts[0] || {}).code || "", a1 = (acts[1] || acts[0] || {}).code || "", unit = unitName(me().unit || ((S.units || []).filter(x => x.parent)[0] || {}).id);
  const item = (n, q, u, p, cs) => ({ name: ocF(n, cs[0]), qty: ocF(q, cs[1]), unitName: ocF(u, cs[2]), price: ocF(p, cs[3]) });
  const doc = (f, items) => ({ f: Object.fromEntries(Object.entries(f).map(([k, x]) => [k, ocF(x[0], x[1])])), items, useLines: false });
  if (id === "A") return [doc({ name: ["จัดซื้อเครื่องคอมพิวเตอร์โน้ตบุ๊กสำหรับงานบริการประชาชน", 0.97], agency: [unit, 0.93], act: [a0, 0.9], nature: ["inv", 0.95], reason: ["เครื่องคอมพิวเตอร์เดิมหมดอายุการใช้งานและไม่รองรับระบบบริการออนไลน์ จึงต้องจัดหาทดแทนเพื่อให้บริการประชาชนได้ต่อเนื่อง", 0.9], total: ["480,000", 0.92], prov: ["กรุงเทพมหานคร", 0.95], dist: ["ดุสิต", 0.94], sub: ["ดุสิต", 0.9] }, [item("เครื่องคอมพิวเตอร์โน้ตบุ๊ก", "20", "เครื่อง", "2,400", [0.95, 0.96, 0.97, 0.55])])];
  if (id === "B") return [doc({ name: ["อบรมพัฒนาบุคลากรด้านดิจิทัล", 0.9], agency: [unit, 0.9], act: [a1.replace(/A(\d)$/, "AI"), 0.6], nature: ["ope", 0.92], reason: ["พัฒนาทักษะบุคลากรให้พร้อมใช้ระบบดิจิทัลใหม่และลดข้อผิดพลาดในการให้บริการประชาชนในปีงบประมาณถัดไป", 0.88], total: ["265,000", 0.9], prov: ["", 0.9], dist: ["", 0.9], sub: ["", 0.9] }, [item("ค่าอบรมต่อคน", "100", "คน", "2,500", [0.9, 0.93, 0.95, 0.91]), item("ค่าเอกสารประกอบการอบรม", "100", "ชุด", "150", [0.88, 0.9, 0.9, 0.86])]),
    doc({ name: ["ปรับปรุงสำนักงานบริการประชาชน ปรับพื้นที่รับบริการ", 0.89], agency: [unit, 0.9], act: [a0, 0.9], nature: ["inv", 0.9], reason: ["พื้นที่รับบริการเดิมคับแคบและไม่เอื้อต่อผู้สูงอายุ ต้องปรับปรุงให้เป็นไปตามมาตรฐานการให้บริการ", 0.86], total: ["2,850,000", 0.88], prov: ["เชียงใหม่", 0.9], dist: ["เมืองเชียงใหม่", 0.9], sub: ["ศรีภูมิ", 0.9] }, [item("งานปรับปรุงอาคารสำนักงานบริการ", "1", "งาน", "2,850,000", [0.85, 0.95, 0.9, 0.85])])];
  return [doc({ name: ["ค่าใช้จ่ายโครงการ ?? พัฒนา", 0.42], agency: [unit, 0.5], act: ["", 0], nature: ["ope", 0.6], reason: ["", 0], total: ["", 0], prov: ["", 0], dist: ["", 0], sub: ["", 0] }, [item("วัสดุสำนักงาน", "5?", "ชุด", "1,2?0", [0.6, 0.4, 0.7, 0.35])])];
}
const OC_FIELDS = [["name", ["ชื่อโครงการ / รายการ", "Project or item name"]], ["agency", ["หน่วยงาน", "Agency"]], ["act", ["รหัสกิจกรรม", "Activity code"]], ["nature", ["ประจำ/ลงทุน (ope/inv)", "Recurrent / investment (ope/inv)"]], ["reason", ["เหตุผลความจำเป็น", "Reason"]], ["total", ["ยอดรวมในเอกสาร (บาท)", "Total on the form (baht)"]], ["prov", ["จังหวัด", "Province"]], ["dist", ["อำเภอ/เขต", "District"]], ["sub", ["ตำบล/แขวง", "Sub-district"]]];
const ocLow = f => f.c < OC_MIN && !f.ok && f.v === f.orig; // a field changed by hand counts as checked
const ocSum = d => sumv(d.items.map(i => (ocNum(i.qty.v) || 0) * (ocNum(i.price.v) || 0)));
function ocIssues(d, unitId) {
  const out = [], need = (b, m) => { if (!b) out.push(m); };
  OC_FIELDS.forEach(([k, l]) => { if (ocLow(d.f[k]) && (d.f[k].v !== "" || ["name", "act", "reason"].includes(k))) out.push(`${L("ตรวจช่อง", "Check")} ${tx(l)} (${Math.round(d.f[k].c * 100)}%)`); });
  d.items.forEach((i, n) => ["name", "qty", "unitName", "price"].forEach(k => { if (ocLow(i[k])) out.push(`${L("ตรวจบรรทัด", "Check line")} ${n + 1}: ${k === "name" ? L("รายการ", "item") : k === "qty" ? L("จำนวน", "quantity") : k === "unitName" ? L("หน่วย", "unit") : L("ราคา", "price")} (${Math.round(i[k].c * 100)}%)`); }));
  need(String(d.f.name.v).trim().length >= 3 && !/\?/.test(d.f.name.v), L("ชื่อโครงการต้องอ่านออกและยาวอย่างน้อย 3 ตัวอักษร", "The name must be readable, 3 characters or more"));
  need(!!unitId, L("ระบุหน่วยงาน", "Choose the unit"));
  need(!!ocActId(d.f.act.v), `${L("ไม่พบรหัสกิจกรรมในโครงสร้างปีนี้", "Activity code not in this year's structure")}: ${d.f.act.v || "–"}`);
  need(["ope", "inv"].includes(String(d.f.nature.v).trim()), L("ประจำ/ลงทุน ต้องเป็น ope หรือ inv", "Recurrent/investment must be ope or inv"));
  need(String(d.f.reason.v).trim().length >= 10, L("เหตุผลความจำเป็นสั้นเกินไป", "The reason is too short"));
  need(d.items.length > 0, L("ต้องมีอย่างน้อย 1 บรรทัดรายการ", "At least one line"));
  d.items.forEach((i, n) => { need(String(i.name.v).trim() !== "" && !/\?/.test(i.name.v), `${L("บรรทัด", "Line")} ${n + 1}: ${L("ชื่อรายการ", "item name")}`); need(ocNum(i.qty.v) > 0, `${L("บรรทัด", "Line")} ${n + 1}: ${L("จำนวนต้องเป็นตัวเลขมากกว่า 0", "quantity must be a number above 0")}`); need(ocNum(i.price.v) > 0, `${L("บรรทัด", "Line")} ${n + 1}: ${L("ราคาต้องเป็นตัวเลขมากกว่า 0", "price must be a number above 0")}`); });
  const tot = ocNum(d.f.total.v), sum = ocSum(d); if (d.f.total.v !== "" && !d.useLines) need(Math.abs(tot - sum) < 1, `${L("ยอดรวมในเอกสาร", "Total on the form")} ${isNaN(tot) ? d.f.total.v : fmt(tot)} ${L("ไม่ตรงผลรวมบรรทัด", "differs from the lines")} ${fmt(sum)} ${L("(แก้ราคา แก้ยอด หรือติ๊กใช้ยอดตามบรรทัด)", "(fix a price, the total, or tick use the lines)")}`);
  return out;
}
const ocUnit = d => (ROLE === "div" ? me().unit : OCR.unit || ocUnitByText(d.f.agency.v));
function ocImport() {
  if (!OCR.docs) return { err: L("ยังไม่ได้อ่านเอกสาร", "The document is not read yet") };
  const bad = OCR.docs.map((d, i) => ({ i, m: ocIssues(d, ocUnit(d)) })).filter(x => x.m.length); if (bad.length) return { err: bad.map(x => `${L("คำขอที่", "Request")} ${x.i + 1}: ${x.m[0]}`).join(" · "), bad };
  const made = []; let fixed = 0;
  OCR.docs.forEach(d => {
    const nature = String(d.f.nature.v).trim(), items = d.items.map(i => ({ type: nature, name: String(i.name.v).trim(), qty: ocNum(i.qty.v), unitName: String(i.unitName.v).trim() || L("งาน", "job"), price: ocNum(i.price.v) }));
    const r = { id: nextReqId(), unit: ocUnit(d), act: ocActId(d.f.act.v), prev: 0, status: "draft", updated: TODAY, name: [d.f.name.v.trim(), d.f.name.v.trim()], kpi: "", reason: d.f.reason.v.trim(), docs: OCR.file ? [OCR.file.name] : [], items, amount: 0, versions: [], comments: [] };
    r.amount = reqAmount(r); S.requests.unshift(r); snapshot(r, ["สร้างจากเอกสาร (OCR จำลอง)", "Created from a document (simulated OCR)"], true);
    const c = rqCls(r); c.nature = nature; if (d.f.sub.v || d.f.dist.v || d.f.prov.v) { const a = { prov: d.f.prov.v.trim(), dist: d.f.dist.v.trim(), sub: d.f.sub.v.trim(), lat: "", lng: "" }, g = typeof geoFind === "function" ? geoFind(a) : null; if (g) { a.lat = g.lat; a.lng = g.lng; } (c.areas = c.areas || []).push(a); }
    const n = OC_FIELDS.filter(([k]) => d.f[k].v !== d.f[k].orig).length + d.items.reduce((t, i) => t + ["name", "qty", "unitName", "price"].filter(k => i[k].v !== i[k].orig).length, 0); fixed += n;
    r.src = { kind: "ocr", sample: OCR.sample, file: OCR.file ? OCR.file.name : "", changed: n, by: me().id, t: nowIso() }; made.push(r);
    audit(["สร้างร่างคำขอจากเอกสาร (OCR จำลอง)", "Made a draft request from a document (simulated OCR)"], `${r.id} · ${OCR.sample} · ${n}`);
  });
  (S.ocrLog = S.ocrLog || []).unshift({ id: `OC-${String((S.ocrLog || []).length + 1).padStart(3, "0")}`, t: nowIso(), by: me().id, file: OCR.file ? OCR.file.name : "", sample: OCR.sample, reqs: made.map(r => r.id), fixed });
  return { made, fixed };
}

// ---------- page ----------
const ocCan = () => ROLE === "div" || ROLE === "plan";
function ocDocHtml(d, i) {
  const u = ocUnit(d), iss = ocIssues(d, u), low = k => ocLow(d.f[k]);
  const cell = (f, id, w) => `<div class="row" style="flex-wrap:nowrap"><input type="text" id="${id}" value="${esc(f.v)}" style="min-width:${w || 120}px;${f.c < OC_MIN && f.v === f.orig ? "background:var(--warn-soft, #fff4d6)" : ""}"><span class="sub">${Math.round(f.c * 100)}%</span>${f.c < OC_MIN && f.v === f.orig ? `<label class="field-inline" title="${L("ยืนยันว่าค่านี้ถูกต้อง", "Confirm this value")}"><input type="checkbox" id="${id}-ok" ${f.ok ? "checked" : ""}> ${L("ถูกต้อง", "OK")}</label>` : f.v !== f.orig ? tag(L("แก้แล้ว", "Edited"), "p-info") : ""}</div>`;
  return `<section class="panel"><header><h2>${L("คำขอที่", "Request")} ${i + 1}</h2><span class="sp"></span>${iss.length ? tag(`${iss.length} ${L("ข้อต้องแก้", "to fix")}`, "p-warn") : tag(L("พร้อมสร้างร่าง", "Ready"), "p-ok")}</header><div class="body">
    <div class="inline-form" style="flex-wrap:wrap">${OC_FIELDS.map(([k, l]) => `<div class="f" style="flex:${k === "name" || k === "reason" ? "1 1 100%" : "1 1 220px"}"><label for="oc-f-${i}-${k}">${tx(l)}</label>${cell(d.f[k], `oc-f-${i}-${k}`, k === "reason" ? 360 : 160)}</div>`).join("")}</div>
    <div class="tbl-wrap"><table><thead><tr><th>#</th><th>${L("รายการ", "Item")}</th><th>${L("จำนวน", "Qty")}</th><th>${L("หน่วย", "Unit")}</th><th>${L("ราคา/หน่วย (บาท)", "Price / unit (baht)")}</th><th class="n">${L("รวม", "Amount")}</th></tr></thead><tbody>${d.items.map((it, n) => `<tr><td>${n + 1}</td><td>${cell(it.name, `oc-i-${i}-${n}-name`, 200)}</td><td>${cell(it.qty, `oc-i-${i}-${n}-qty`, 70)}</td><td>${cell(it.unitName, `oc-i-${i}-${n}-unitName`, 70)}</td><td>${cell(it.price, `oc-i-${i}-${n}-price`, 100)}</td><td class="n">${fmt((ocNum(it.qty.v) || 0) * (ocNum(it.price.v) || 0))}</td></tr>`).join("")}</tbody><tfoot><tr><td colspan="5">${L("ผลรวมบรรทัดรายการ", "Sum of the lines")}</td><td class="n"><b>${fmt(ocSum(d))}</b></td></tr></tfoot></table></div>
    <label class="field-inline"><input type="checkbox" id="oc-use-${i}" ${d.useLines ? "checked" : ""}> ${L("ใช้ยอดตามผลรวมบรรทัด (ไม่ถือยอดที่อ่านจากเอกสาร)", "Use the lines' total (ignore the total read from the form)")}</label>
    ${iss.length ? `<ul style="margin:6px 0 0;padding-left:18px;color:var(--bad)">${iss.map(m => `<li>${esc(m)}</li>`).join("")}</ul>` : ""}</div></section>`;
}
ePageDef("budget", "bq-ocr", "BQ8", "form", KROLES, ["นำเข้าคำขอจากเอกสาร (OCR จำลอง)", "Import a request from a document (simulated OCR)"], () => {
  const can = ocCan(), F = OCR.file, D = OCR.docs, issues = D ? D.reduce((t, d) => t + ocIssues(d, ocUnit(d)).length, 0) : 0;
  return `${eHead(OC_APP, "BQ8", ["นำเข้าคำขอจากเอกสาร (OCR จำลอง)", "Import a request from a document (simulated OCR)"], ["เลือกไฟล์ PDF หรือรูปของแบบคำของบ แล้วให้ระบบ \"อ่าน\" ได้ข้อมูลพร้อมความมั่นใจของแต่ละช่อง ตรวจแก้ก่อนสร้างร่างคำขอ · ต้นแบบไม่ได้อ่านเนื้อไฟล์จริง ผลอ่านเป็นตัวอย่างคงที่ 3 แบบที่เลือกด้านล่าง (บางช่องอ่านผิดไว้ตั้งใจ) ส่วนการตรวจและสร้างร่างคำขอทำงานจริง", "Pick a PDF or an image of a request form and let the system \"read\" it: fields with a confidence each, checked and corrected before a draft request is made · the prototype does not read the file: the reading is one of three fixed samples chosen below (some fields misread on purpose); the checks and the draft are real"])}
    ${can ? "" : eNote(L("เฉพาะสำนัก/กอง และกองแผนงานนำเข้าได้ บทบาทอื่นดูอย่างเดียว", "Only divisions and Planning import; others view"))}
    <section class="panel"><header><h2>${L("1 เลือกเอกสาร", "1 Pick the document")}</h2></header><div class="body">
      <div class="row" style="flex-wrap:wrap"><input type="file" id="oc-file" accept=".pdf,image/*" ${can ? "" : "disabled"}>${F ? `<span class="sub">${esc(F.name)} · ${fmt(F.size / 1024, 1)} KB · ${esc(F.type || "–")}</span>` : `<span class="sub">${L("ยังไม่ได้เลือกไฟล์ (ไม่เลือกก็ทดลองได้)", "No file chosen (you can try without)")}</span>`}</div>
      ${F && F.url && /^image\//.test(F.type) ? `<img src="${F.url}" alt="${esc(F.name)}" style="max-width:260px;max-height:180px;margin-top:8px;border:1px solid var(--line);border-radius:6px">` : ""}
      <div class="row" style="margin-top:8px;flex-wrap:wrap"><label for="oc-sample"><b style="font-weight:600">${L("ผลอ่านตัวอย่างที่ใช้จำลอง", "Simulated reading to use")}</b></label><select id="oc-sample" ${can ? "" : "disabled"}>${Object.keys(OC_SAMPLES).map(k => `<option value="${k}" ${OCR.sample === k ? "selected" : ""}>${k} · ${esc(tx(OC_SAMPLES[k]))}</option>`).join("")}</select>
        ${ROLE === "plan" ? `<label for="oc-unit">${L("หน่วยงานเจ้าของคำขอ", "Owning unit")}</label><select id="oc-unit"><option value="">${L("— ตามที่อ่านได้ —", "— as read —")}</option>${(S.units || []).filter(u => u.parent).map(u => `<option value="${u.id}" ${OCR.unit === u.id ? "selected" : ""}>${esc(tx(u.name))}</option>`).join("")}</select>` : ""}
        <button class="btn primary" type="button" id="oc-read" ${can ? "" : "disabled"}>${L("อ่านเอกสาร (จำลอง)", "Read the document (simulated)")}</button></div></div></section>
    ${D ? `<section class="panel"><header><h2>${L("2 ตรวจและแก้ข้อมูลที่อ่านได้", "2 Check and correct what was read")}</h2><span class="sp"></span><span class="sub">${L("ช่องที่ความมั่นใจต่ำกว่า 80% ต้องแก้หรือยืนยัน", "A field below 80% must be corrected or confirmed")}</span></header></section>${D.map(ocDocHtml).join("")}
      <section class="panel"><header><h2>${L("3 สร้างร่างคำขอ", "3 Make the draft requests")}</h2></header><div class="body row"><button class="btn primary" type="button" id="oc-go" ${can && !issues ? "" : "disabled"}>${L("สร้างร่างคำขอ", "Make")} ${D.length} ${L("รายการ", "draft(s)")}</button>${issues ? `<span class="sub" style="color:var(--bad)">${issues} ${L("ข้อที่ยังต้องแก้", "issues to fix")}</span>` : ""}<button class="btn ghost" type="button" id="oc-clear">${L("ล้าง", "Clear")}</button></div></section>` : ""}
    ${OCR.done ? `<section class="panel"><header><h2>${L("สร้างแล้ว", "Created")}</h2></header><div class="body">${OCR.done.made.map(r => `<div class="row"><span class="mono">${r.id}</span> ${esc(tx(r.name))} · ${fmt(r.amount)} ${L("บาท", "baht")} <button class="btn ghost" type="button" data-ocopen="${r.id}">${L("เปิดคำขอ", "Open")}</button></div>`).join("")}<p class="sub">${L("แก้ไขเพิ่ม", "Fields changed by hand")}: ${OCR.done.fixed}</p></div></section>` : ""}
    ${(S.ocrLog || []).length ? `<section class="panel"><header><h2>${L("ประวัตินำเข้า", "Import log")}</h2></header><div class="tbl-wrap"><table><tbody>${S.ocrLog.slice(0, 10).map(g => `<tr><td>${fdate(g.t, true)}</td><td>${esc(userName(g.by))}</td><td class="mono">${esc(g.sample)}</td><td>${esc(g.file || "–")}</td><td class="mono">${g.reqs.join(", ")}</td><td class="n">${g.fixed} ${L("ช่องที่แก้", "edited")}</td></tr>`).join("")}</tbody></table></div></section>` : ""}`;
}, () => {
  const $$$ = id => document.querySelector(id), re = () => route();
  const fl = $$$("#oc-file"); if (fl) fl.onchange = e => { const f = e.target.files[0]; if (OCR.file && OCR.file.url) URL.revokeObjectURL(OCR.file.url); OCR.file = f ? { name: f.name, size: f.size, type: f.type, url: /^image\//.test(f.type) ? URL.createObjectURL(f) : "" } : null; re(); };
  const sm = $$$("#oc-sample"); if (sm) sm.onchange = e => { OCR.sample = e.target.value; };
  const un = $$$("#oc-unit"); if (un) un.onchange = e => { OCR.unit = e.target.value; re(); };
  const rd = $$$("#oc-read"); if (rd) rd.onclick = () => { OCR.sample = ($$$("#oc-sample") || { value: OCR.sample }).value; OCR.docs = ocRead(OCR.sample); OCR.done = null; re(); };
  (OCR.docs || []).forEach((d, i) => {
    OC_FIELDS.forEach(([k]) => { const el = $$$(`#oc-f-${i}-${k}`), ok = $$$(`#oc-f-${i}-${k}-ok`); if (el) el.onchange = e => { d.f[k].v = e.target.value; re(); }; if (ok) ok.onchange = e => { d.f[k].ok = e.target.checked; re(); }; });
    d.items.forEach((it, n) => ["name", "qty", "unitName", "price"].forEach(k => { const el = $$$(`#oc-i-${i}-${n}-${k}`), ok = $$$(`#oc-i-${i}-${n}-${k}-ok`); if (el) el.onchange = e => { it[k].v = e.target.value; re(); }; if (ok) ok.onchange = e => { it[k].ok = e.target.checked; re(); }; }));
    const us = $$$("#oc-use-" + i); if (us) us.onchange = e => { d.useLines = e.target.checked; re(); };
  });
  const go = $$$("#oc-go"); if (go) go.onclick = () => { const r = ocImport(); if (r.err) { toast(r.err); return; } OCR.done = r; OCR.docs = null; commit(); re(); toast(L(`สร้างร่างคำขอ ${r.made.length} รายการแล้ว`, `Made ${r.made.length} draft requests`)); };
  const cl = $$$("#oc-clear"); if (cl) cl.onclick = () => { OCR.docs = null; OCR.done = null; re(); };
  document.querySelectorAll("[data-ocopen]").forEach(b => (b.onclick = () => openReq(b.dataset.ocopen)));
});
Object.assign(NAV_ICON, { "bq-ocr": "file" });
{ // a way in from the request list for a division and for Planning
  const vb = VIEWS.requests;
  VIEWS.requests = () => { const html = vb(); if (typeof rqYear === "function" && rqYear() !== FORM_FY || !ocCan()) return html; return `<div class="row" style="margin:0 0 10px"><button class="btn" type="button" data-jump="bq-ocr">${L("นำเข้าคำขอจากเอกสาร (OCR จำลอง)", "Import a request from a document (simulated OCR)")}</button></div>` + html; };
  const bq = BIND.requests; BIND.requests = () => { bq(); document.querySelectorAll("#view [data-jump]").forEach(x => (x.onclick = () => jump(x.dataset.jump))); };
}
