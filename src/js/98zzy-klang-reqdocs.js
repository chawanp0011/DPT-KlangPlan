// Fisko-KlangFinance, round P20 (16 Nov 2569): the tab "เอกสารอื่นๆ" (other documents) of the division request.
// The user's words: the "other documents" heading of the request had gone when the documents tab was taken out; add a tab called "other documents" instead,
// where the division (สำนัก/กอง) can attach files and Planning, the budget group, can ask for more documents.
//   r.odocs    files the division attached here: { id, name, note, by, t, req }   (req = the id of the request for documents it answers, if any)
//   r.docReqs  requests for more documents by Planning: { id, title, note, by, t, status, ansT, accT }
//              status: open (waiting for the division) -> provided (the division attached an answer) -> accepted (Planning took it); or cancelled
// Who: the division of the request (div, divhead of its unit) attaches and answers, at any time (a request that went to Planning can still be answered);
//      Planning (plan) asks for more, accepts or cancels. Everyone else only reads. As in the rest of the prototype the file's NAME is kept (and its text when
//      the file can be read, so that "AI drafts the request" can use it); the file itself is not stored.
// The tab sits after "Alignment" (the order is set in 98zzz-klang-tabsorder.js).
const OD_STATUS = { open: [["รอหน่วยงานแนบ", "Waiting for the division"], "p-warn"], provided: [["แนบแล้ว รอกองแผนงานตรวจ", "Attached, Planning to check"], "p-info"], accepted: [["กองแผนงานรับแล้ว", "Accepted by Planning"], "p-ok"], cancelled: [["ยกเลิก", "Cancelled"], "p-mute"] };
const odOwner = r => !!r && ["div", "divhead"].includes(ROLE) && me().unit === r.unit;
const odPlanner = () => ROLE === "plan";
const odList = r => (r.odocs = r.odocs || []);
const odReqs = r => (r.docReqs = r.docReqs || []);
const odOpen = r => odReqs(r).filter(x => x.status === "open");
const odId = p => `${p}-${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
// each of these returns "" when it worked, else the reason (so the tests and the page share the rules)
function odAttach(r, files, note, reqId) {
  if (!odOwner(r)) return L("เฉพาะสำนัก/กองเจ้าของคำขอแนบเอกสารได้", "Only the division that owns the request can attach files");
  const names = (files || []).map(f => (typeof f === "string" ? f : f.name)).filter(Boolean); if (!names.length) return L("เลือกไฟล์ก่อน", "Choose a file first");
  const rq = reqId ? odReqs(r).find(x => x.id === reqId) : null; if (reqId && (!rq || rq.status !== "open")) return L("คำขอเอกสารนี้ไม่ได้รอการแนบแล้ว", "That request for documents is no longer waiting");
  names.forEach(n => { if (!odList(r).some(d => d.name === n && (d.req || "") === (reqId || ""))) odList(r).push({ id: odId("OD"), name: n, note: String(note || "").trim(), by: me().id, t: nowIso(), req: reqId || "" }); });
  if (rq) { rq.status = "provided"; rq.ansT = nowIso(); notify(["plan"], [`${r.id}: ${tx(r.name)} · หน่วยงานแนบเอกสารตามที่ขอแล้ว (${rq.title})`, `${r.id}: the division attached the documents asked for (${rq.title})`], "requests"); }
  audit(["แนบเอกสารอื่นๆ ของคำขอ", "Attached other documents to the request"], `${r.id} · ${names.join(", ")}`); return "";
}
function odRemove(r, id) { if (!odOwner(r)) return L("เฉพาะสำนัก/กองเจ้าของคำขอลบเอกสารได้", "Only the division can remove files"); const i = odList(r).findIndex(d => d.id === id); if (i < 0) return "";
  const d = odList(r)[i]; if (d.req) { const q = odReqs(r).find(x => x.id === d.req); if (q && q.status === "accepted") return L("กองแผนงานรับเอกสารนี้แล้ว ลบไม่ได้", "Planning has accepted this file; it can't be removed"); }
  odList(r).splice(i, 1); const q = d.req && odReqs(r).find(x => x.id === d.req); if (q && q.status === "provided" && !odList(r).some(x => x.req === q.id)) { q.status = "open"; delete q.ansT; }
  audit(["ลบเอกสารอื่นๆ ของคำขอ", "Removed another document of the request"], `${r.id} · ${d.name}`); return ""; }
function odRequest(r, title, note) {
  if (!odPlanner()) return L("เฉพาะกองแผนงานขอเอกสารเพิ่มเติมได้", "Only Planning can ask for more documents"); title = String(title || "").trim(); if (!title) return L("ระบุเอกสารที่ขอ", "Say which document you need");
  odReqs(r).push({ id: odId("DR"), title, note: String(note || "").trim(), by: me().id, t: nowIso(), status: "open" });
  notify(["div", "divhead"], [`${r.id}: ${tx(r.name)} · กองแผนงานขอเอกสารเพิ่มเติม: ${title}`, `${r.id}: Planning asks for more documents: ${title}`], "request"); audit(["กองแผนงานขอเอกสารเพิ่มเติม", "Planning asked for more documents"], `${r.id} · ${title}`); return "";
}
function odDecide(r, id, what) {
  if (!odPlanner()) return L("เฉพาะกองแผนงานเท่านั้น", "Only Planning"); const q = odReqs(r).find(x => x.id === id); if (!q) return "";
  if (what === "accept") { if (q.status !== "provided") return L("ยังไม่มีเอกสารที่แนบมาตอบ", "Nothing has been attached yet"); q.status = "accepted"; q.accT = nowIso(); }
  else if (what === "cancel") { if (!["open", "provided"].includes(q.status)) return ""; q.status = "cancelled"; }
  else if (what === "reopen") { if (q.status !== "provided") return ""; q.status = "open"; delete q.ansT; }
  audit(["กองแผนงานตัดสินคำขอเอกสาร", "Planning decided on a request for documents"], `${r.id} · ${q.title} · ${what}`); return "";
}

// ---------- the tab ----------
{
  const base = reqTabsBar;
  reqTabsBar = function (r) {
    const want = REQ_TAB, html = base(r); if (want === "odocs") REQ_TAB = "odocs";
    const open = odOpen(r).length, n = odList(r).length, st = open ? "warn" : "ok";
    const btn = `<button type="button" role="tab" aria-selected="${REQ_TAB === "odocs"}" class="rstep x ${REQ_TAB === "odocs" ? "on" : ""} s-${st}" data-rtab="odocs"><span>${L("เอกสารอื่นๆ", "Other documents")}${n ? ` (${n})` : ""}${open ? " ⚠" : ""}</span></button>`;
    return /data-rtab="versions"/.test(html) ? html.replace(/(<button[^>]*data-rtab="versions")/, btn + "$1") : html.replace(/<\/div>/, btn + "</div>");
  };
}
REQ_PANELS.odocs = (r, ed) => {
  const mine = odOwner(r), plan = odPlanner(), reqs = odReqs(r), docs = odList(r), nm = id => (id ? userName(id) : "—");
  const ansOf = q => docs.filter(d => d.req === q.id);
  const files = `<section class="panel" id="od-files"><header><h2>${L("เอกสารอื่นๆ ที่แนบ", "Other documents attached")}</h2><span class="sp"></span>${tag(`${docs.length} ${L("ไฟล์", "files")}`, docs.length ? "p-ok" : "p-mute")}</header>
    <div class="body sub">${L("สำนัก/กองเจ้าของคำขอแนบเอกสารเพิ่มเติมที่นี่ได้ทุกเมื่อ (หนังสือ ใบเสนอราคา รายละเอียดอื่น ๆ) เอกสารที่แนบถูกใช้ใน \"AI ช่วยร่างคำขอ\" ด้วย · ต้นแบบเก็บเฉพาะชื่อไฟล์", "The division that owns the request can attach more documents here at any time (letters, quotations, other details). They are also used by \"AI drafts the request\" · the prototype keeps the file name only")}</div>
    <div class="tbl-wrap"><table><thead><tr><th>#</th><th>${L("ไฟล์", "File")}</th><th>${L("ประเภท", "Kind")}</th><th>${L("ตอบคำขอเอกสาร", "Answers the request")}</th><th>${L("แนบโดย", "Attached by")}</th><th>${L("วันที่", "Date")}</th><th></th></tr></thead>
      <tbody>${docs.map((d, i) => { const q = d.req && reqs.find(x => x.id === d.req); return `<tr><td class="n">${i + 1}</td><td style="overflow-wrap:anywhere">${esc(d.name)}${d.note ? `<div class="sub">${esc(d.note)}</div>` : ""}</td><td class="sub">${esc(rqFileKind(d.name))}</td><td class="sub">${q ? esc(q.title) : "—"}</td><td class="sub">${esc(nm(d.by))}</td><td class="sub">${fdate(d.t)}</td><td>${mine ? `<button class="btn ghost danger" type="button" data-oddel="${d.id}" aria-label="${L("ลบไฟล์", "Remove the file")}" style="padding:4px 8px">×</button>` : ""}</td></tr>`; }).join("") || `<tr><td colspan="7" class="sub">${L("ยังไม่มีเอกสารอื่น ๆ", "No other document yet")}</td></tr>`}</tbody></table></div>
    ${mine ? `<div class="body row" style="flex-wrap:wrap"><input type="text" id="od-note" placeholder="${L("หมายเหตุ (ไม่บังคับ)", "Note (optional)")}" style="flex:1 1 220px"><button class="btn primary" type="button" id="od-add">+ ${L("แนบเอกสาร (เลือกได้หลายไฟล์)", "Attach files (several at once)")}</button><input type="file" id="od-file" multiple hidden></div>` : `<div class="body sub">${plan ? L("กองแผนงานดูได้อย่างเดียว ขอเอกสารเพิ่มเติมได้ที่ส่วนด้านล่าง", "Planning only reads here; ask for more documents below") : L("เฉพาะสำนัก/กองเจ้าของคำขอแนบเอกสารได้", "Only the owning division can attach files")}</div>`}</section>`;
  const ask = `<section class="panel" id="od-reqs"><header><h2>${L("คำขอเอกสารเพิ่มเติมจากกองแผนงาน", "Requests for more documents from Planning")}</h2><span class="sp"></span>${tag(`${reqs.filter(x => x.status === "open").length} ${L("รอแนบ", "waiting")}`, reqs.some(x => x.status === "open") ? "p-warn" : "p-ok")}</header>
    <div class="body sub">${L("กองแผนงาน (กลุ่มงบประมาณ) ขอเอกสารเพิ่มเติมได้ สำนัก/กองได้รับแจ้งและแนบตอบที่ปุ่มของแต่ละรายการ จากนั้นกองแผนงานตรวจและรับ หรือขอใหม่", "Planning (the budget group) can ask for more documents; the division is told and answers with the button on each request; Planning then checks and accepts, or asks again")}</div>
    ${reqs.length ? `<div class="tbl-wrap"><table><thead><tr><th>${L("เอกสารที่ขอ", "Document asked for")}</th><th>${L("ขอโดย", "Asked by")}</th><th>${L("สถานะ", "Status")}</th><th>${L("เอกสารที่แนบตอบ", "Attached answer")}</th><th></th></tr></thead><tbody>${reqs.map(q => `<tr><td><b style="font-weight:600">${esc(q.title)}</b>${q.note ? `<div class="sub">${esc(q.note)}</div>` : ""}</td><td class="sub">${esc(nm(q.by))}<br>${fdate(q.t)}</td><td>${tag(tx(OD_STATUS[q.status][0]), OD_STATUS[q.status][1])}</td><td class="sub">${ansOf(q).map(d => esc(d.name)).join("<br>") || "—"}</td>
      <td style="white-space:nowrap">${mine && q.status === "open" ? `<button class="btn primary" type="button" data-odans="${q.id}">${L("แนบเอกสารตอบ", "Attach the answer")}</button><input type="file" multiple hidden data-odansf="${q.id}">` : ""}${plan && q.status === "provided" ? `<button class="btn primary" type="button" data-oddec="${q.id}|accept">${L("รับแล้ว", "Accept")}</button> <button class="btn ghost" type="button" data-oddec="${q.id}|reopen">${L("ขอใหม่", "Ask again")}</button> ` : ""}${plan && ["open", "provided"].includes(q.status) ? `<button class="btn ghost" type="button" data-oddec="${q.id}|cancel">${L("ยกเลิกคำขอ", "Cancel")}</button>` : ""}</td></tr>`).join("")}</tbody></table></div>` : `<div class="body sub">${L("กองแผนงานยังไม่ได้ขอเอกสารเพิ่มเติม", "Planning has not asked for more documents")}</div>`}
    ${plan ? `<form class="body row" id="od-askform" style="flex-wrap:wrap"><input type="text" id="od-title" placeholder="${L("เอกสารที่ต้องการเพิ่มเติม (เช่น ใบเสนอราคาเพิ่มอีก 2 ราย)", "Document needed (e.g. two more quotations)")}" style="flex:2 1 260px" required><input type="text" id="od-asknote" placeholder="${L("เหตุผล / รายละเอียด", "Why / details")}" style="flex:1 1 200px"><button class="btn primary" type="submit">${L("ขอเอกสารเพิ่มเติม", "Ask for the document")}</button></form>` : ""}</section>`;
  return files + ask;
};
REQ_BIND.odocs = r => {
  const re = () => { save(); route(); }, bad = m => { if (m) { toast(m); return true; } return false; };
  const add = document.querySelector("#od-add"), inp = document.querySelector("#od-file");
  if (add && inp) { add.onclick = () => inp.click(); inp.onchange = async () => { const fs = [...inp.files]; if (!fs.length) return; if (bad(odAttach(r, fs, (document.querySelector("#od-note") || {}).value))) return; try { await rqKeepText(r, fs); } catch (e) { /* kept by name */ } toast(`${L("แนบแล้ว", "Attached")} ${fs.length}`); re(); }; }
  document.querySelectorAll("[data-oddel]").forEach(b => (b.onclick = () => { if (bad(odRemove(r, b.dataset.oddel))) return; re(); }));
  document.querySelectorAll("[data-odans]").forEach(b => { const f = document.querySelector(`[data-odansf="${b.dataset.odans}"]`); b.onclick = () => f && f.click(); if (f) f.onchange = async () => { const fs = [...f.files]; if (!fs.length) return; if (bad(odAttach(r, fs, "", b.dataset.odans))) return; try { await rqKeepText(r, fs); } catch (e) { /* by name */ } toast(L("แนบเอกสารตอบแล้ว", "Answer attached")); re(); }; });
  document.querySelectorAll("[data-oddec]").forEach(b => (b.onclick = () => { const [id, what] = b.dataset.oddec.split("|"); if (bad(odDecide(r, id, what))) return; re(); }));
  const form = document.querySelector("#od-askform"); if (form) form.onsubmit = e => { e.preventDefault(); if (bad(odRequest(r, (document.querySelector("#od-title") || {}).value, (document.querySelector("#od-asknote") || {}).value))) return; toast(L("ส่งคำขอเอกสารถึงหน่วยงานแล้ว", "The request was sent to the division")); re(); };
};

// ---------- sample data: a request that Planning has asked more documents for, one answered, one accepted ----------
Object.keys(SEEDS).forEach(k => {
  const prev = SEEDS[k].seed;
  SEEDS[k].seed = () => {
    const s = prev(), pl = (s.users.find(u => u.role === "plan") || {}).id, dv = (s.users.find(u => u.role === "div") || {}).id;
    const rs = (s.requests || []).filter(r => r.status !== "draft").slice(0, 3);
    if (rs[0]) { rs[0].docReqs = [{ id: "DR-S1", title: "ใบเสนอราคาเพิ่มอีก 2 ราย", note: "ใช้ประกอบการเทียบราคากลาง (ข้อมูลตัวอย่าง)", by: pl, t: "2026-10-20T10:00", status: "open" }]; rs[0].odocs = []; }
    if (rs[1]) { rs[1].docReqs = [{ id: "DR-S2", title: "แบบรูปรายการและรายละเอียดคุณลักษณะ", note: "(ข้อมูลตัวอย่าง)", by: pl, t: "2026-10-18T09:00", status: "provided", ansT: "2026-10-19T14:00" }]; rs[1].odocs = [{ id: "OD-S2", name: "แบบรูปรายการ_คุณลักษณะ.pdf", note: "ตามที่กองแผนงานขอ", by: dv, t: "2026-10-19T14:00", req: "DR-S2" }]; }
    if (rs[2]) { rs[2].docReqs = [{ id: "DR-S3", title: "สำเนามติ/หนังสืออนุมัติหลักการ", note: "(ข้อมูลตัวอย่าง)", by: pl, t: "2026-10-12T09:00", status: "accepted", ansT: "2026-10-13T10:00", accT: "2026-10-14T09:00" }]; rs[2].odocs = [{ id: "OD-S3", name: "มติอนุมัติหลักการ.pdf", note: "", by: dv, t: "2026-10-13T10:00", req: "DR-S3" }, { id: "OD-S3b", name: "เอกสารประกอบเพิ่มเติม.xlsx", note: "ข้อมูลตัวอย่าง", by: dv, t: "2026-10-13T10:05", req: "" }]; }
    return s;
  };
});
