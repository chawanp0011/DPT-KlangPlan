// ---------- ขั้น 2 จัดทำข้อมูล: start by attaching every project document; the AI reads them and fills the fields, the files and the committees ----------
// Reads with the same reader as เตรียมคำของบประมาณ (rmRead / rmDocKind / rmFindIn). Only empty fields are filled; the user checks and saves with the usual buttons.
let IN99_FILES = []; // File objects kept for the case being prepared
let IN99_FOR = null, IN99_RES = null;
const IN99_SAMPLE = ["A_ก่อสร้างอาคารศูนย์บริการประชาชน", ["01_ข้อเสนอโครงการ.docx", "02_ขอบเขตของงาน_TOR.pdf", "03_BOQ_ปร4_ปร5.xlsx", "04_แบบรูปรายการ_แปลนอาคาร.pdf", "05_ราคากลางงานก่อสร้าง.pdf", "06_หนังสือยินยอมให้ใช้ที่ดิน.docx", "07_ผลสำรวจความต้องการ.txt", "08_ความเหมาะสมและความคุ้มค่า.docx", "09_ภาพถ่ายสภาพอาคารเดิม.png", "10_คำสั่งแต่งตั้งคณะกรรมการ.txt"]];
const IN99_KIND = { proposal: "ข้อเสนอโครงการ", tor: "TOR / ขอบเขตงาน", quote: "ใบเสนอราคา", boq: "BOQ / ประมาณราคา", drawing: "แบบรูปรายการ", refprice: "ราคากลาง", land: "เอกสารที่ดิน", survey: "ผลสำรวจ", feasibility: "ความเหมาะสม/ความคุ้มค่า", photo: "ภาพถ่าย", committee: "คำสั่งแต่งตั้งคณะกรรมการ", other: "เอกสารอื่น" };
const IN99_MON = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
const in99Date = s => { const m = /(\d{1,2})\s*(\S+?)\s*(25\d\d)/.exec(s || ""); if (!m) return ""; const mi = IN99_MON.indexOf(m[2]); if (mi < 0) return ""; return `${+m[3] - 543}-${String(mi + 1).padStart(2, "0")}-${String(+m[1]).padStart(2, "0")}`; };
// committees in an appointment order: blocks that start with "คณะกรรมการ:"
function in99Committees(f) { const out = []; String(f.text || "").split(/\n(?=คณะกรรมการ\s*[:：])/).forEach(b => { const t = rmGet(b, /^คณะกรรมการ\s*[:：]\s*([^\n]+)/); if (!t) return;
    out.push({ type: t, order: rmGet(b, /คำสั่งที่\s*[:：]\s*([^\n]+)/), date: in99Date(rmGet(b, /ลงวันที่\s*[:：]\s*([^\n]+)/)), chair: rmGet(b, /ประธานกรรมการ\s*[:：]\s*([^\n]+)/), members: [...b.matchAll(/^กรรมการ\s*[:：]\s*([^\n]+)/gm)].map(m => m[1].trim()), file: f.name }); }); return out; }
const IN99_CMK = [/ราคากลาง/, /ตรวจรับ/, /TOR|ขอบเขต|คุณลักษณะ/, /พิจารณาผล|คัดเลือก|เปิดซอง|ประกวดราคา/, /ควบคุมงาน/];
const in99Same = (a, b) => a.includes(b) || IN99_CMK.some(re => re.test(a) && re.test(b));
const in99IsCm = f => /คำสั่ง.*แต่งตั้ง|แต่งตั้งคณะกรรมการ/.test(f.name + "\n" + String(f.text || "").slice(0, 300));
const in99Put = (input, files) => { if (!input || !files.length) return false; try { const dt = new DataTransfer(); (input.multiple ? files : files.slice(0, 1)).forEach(x => dt.items.add(x)); input.files = dt.files; return true; } catch (e) { return false; } };

async function in99Run(c) {
  if (!IN99_FILES.length) return { err: "แนบเอกสารโครงการก่อน แล้วให้ AI ประมวลผล" };
  const files = []; for (const x of IN99_FILES) { const r = await rmRead(x); const f = { name: x.name, file: x, text: r.text, by: r.by, how: r.how, note: r.note }; f.kind = in99IsCm(f) ? "committee" : rmDocKind(x.name, r.text); files.push(f); }
  const F = rmFindIn(files), ref = rmRefTotal(files), boq = rmBoqTotal(files), fields = [], place = {}, $i = id => document.getElementById(id);
  const at = (f, w) => { (place[f] = place[f] || []).push(w); };
  const set = (id, val, lab, src) => { const el = $i(id); if (val === "" || val == null) return; if (!el) { fields.push({ lab, val, src, st: "ไม่พบช่องในหน้านี้" }); return; } if (String(el.value || "").trim() && el.tagName !== "SELECT") { fields.push({ lab, val, src, st: "มีค่าอยู่แล้ว ไม่ทับ" }); return; } el.value = val; el.dispatchEvent(new Event("input", { bubbles: true })); fields.push({ lab, val, src, st: "กรอกแล้ว" }); };
  const fv = k => F[k] ? F[k].v : "", fs = k => F[k] ? F[k].f : "";
  // 1. ขอจัดซื้อ
  if (F.amount) set("pr-amt", Math.round(F.amount.v / 1e4) / 100, "วงเงิน (ล้านบาท)", fs("amount"));
  set("pr-why", fv("reason"), "เหตุผลความจำเป็น", fs("reason")); set("pr-obj", fv("objective"), "วัตถุประสงค์", fs("objective"));
  const dm = /(\d+)\s*(เดือน|วัน)/.exec(fv("duration")); if (dm) set("pr-days", dm[2] === "เดือน" ? +dm[1] * 30 : +dm[1], "ระยะเวลาดำเนินงาน (วัน)", fs("duration"));
  const ar = fv("area"), pv = /จังหวัด\s*(\S+)/.exec(ar), am = /อำเภอ\s*(\S+)/.exec(ar);
  if (pv) set("pr-prov", pv[1], "จังหวัด", fs("area")); if (am) set("pr-amp", am[1], "อำเภอ", fs("area")); if (ar) set("pr-place", ar, "สถานที่ดำเนินการ", fs("area"));
  set("pr-contact", fv("contact"), "ผู้ประสานงาน", fs("contact")); set("pr-ben", fv("kpi"), "ประโยชน์ที่คาดว่าจะได้รับ / ตัวชี้วัด", fs("kpi"));
  const tor = files.find(f => f.kind === "tor"); if (tor && tor.text) set("pr-scope", (rmGet(tor.text, /ขอบเขต[^\n:：]*[:：]\s*([^\n]+)/) || tor.text.split("\n").filter(l => l.trim().length > 20).slice(0, 2).join(" ")).slice(0, 400), "ขอบเขตงาน", tor.name);
  // 2. วิธีจัดซื้อ (ตามวงเงิน)
  const amt = F.amount ? F.amount.v : 0; if (amt) set("mt-method", amt > 500000 ? "ebid" : "specific", "วิธีจัดซื้อ (แนะนำตามวงเงิน)", fs("amount"));
  // 3. ราคากลาง
  const rp = ref || boq; if (rp) { const el = $i("ref-amt"); if (el) { el.value = rp.v; fields.push({ lab: "ราคากลาง (บาท)", val: fmt(rp.v), src: rp.f, st: "กรอกแล้ว" }); } else fields.push({ lab: "ราคากลาง (บาท)", val: fmt(rp.v), src: rp.f, st: "ไม่พบช่องในหน้านี้" }); at(rp.f, "ราคากลาง"); }
  // 4. TOR: the TOR files go into the TOR form
  const torF = files.filter(f => f.kind === "tor"); if (torF.length) { const ok = in99Put(document.querySelector(`form[data-torfiles="${c.id}"] input[type=file]`), torF.map(f => f.file)); torF.forEach(f => at(f.name, ok ? "4. แนบ TOR (รอกด แนบ TOR)" : "TOR (ไม่พบแบบฟอร์มแนบ TOR ในหน้านี้)")); }
  // 5. คณะกรรมการ: each committee in the order goes to the form of the same type
  const cms = []; files.filter(f => f.kind === "committee").forEach(f => in99Committees(f).forEach(x => cms.push(x)));
  cms.forEach(x => { const box = [...document.querySelectorAll(".cmb")].find(b => { const h = b.querySelector("b"); return h && in99Same(h.textContent, x.type); }), fm = box && box.querySelector("form[data-cmnew]");
    if (fm) { if (x.order) fm.querySelector('[name="order"]').value = x.order; if (x.date) fm.querySelector('[name="date"]').value = x.date; const fl = files.find(f => f.name === x.file); in99Put(fm.querySelector('[name="fo"]'), [fl.file]); x.st = "กรอกเลขที่ วันที่ และไฟล์คำสั่งแล้ว (รอกด ตั้งคณะกรรมการ)"; }
    else x.st = box ? "แต่งตั้งไว้แล้ว" : "ไม่พบคณะประเภทนี้ในเรื่องนี้"; at(x.file, "5. คณะกรรมการ" + x.type); });
  // the files go into the request's attachment list; the rest are listed as references
  files.forEach(f => { if (!RQ_FILES.some(y => y.name === f.name)) RQ_FILES.push({ name: f.name, size: f.file.size, type: f.file.type || "", kind: f.kind === "quote" ? 1 : f.kind === "drawing" ? 2 : f.kind === "tor" ? 0 : 5 }); at(f.name, "1. เอกสารแนบคำขอ"); });
  const box = $i("rq-files"); if (box) box.innerHTML = rqFilesHtml();
  const refs = $i("pr-refs"); if (refs && !refs.value.trim()) { refs.value = files.map(f => f.name.replace(/\.[^.]+$/, "")).join(", ").slice(0, 300); fields.push({ lab: "เอกสารอ้างอิง", val: `${files.length} ไฟล์`, src: "ทุกไฟล์", st: "กรอกแล้ว" }); }
  IN99_RES = { t: nowIso(), files: files.map(f => ({ name: f.name, kind: f.kind, how: f.how, by: f.by, note: f.note || "", to: place[f.name] || [] })), fields, cms };
  c.in99 = { t: IN99_RES.t, by: me().id, n: fields.filter(x => x.st === "กรอกแล้ว").length, files: files.length, cms: cms.length };
  return IN99_RES;
}
function in99ResHtml(r) { if (!r) return "";
  return `<div class="in99-res" style="display:grid;gap:10px;margin-top:8px">
    <div><b style="font-weight:600">เอกสารที่อ่าน (${r.files.length})</b><div class="tbl-wrap"><table><thead><tr><th>ไฟล์</th><th>ชนิดที่ AI จำแนก</th><th>อ่านแบบ</th><th>นำไปใส่ที่</th></tr></thead><tbody>${r.files.map(f => `<tr><td>${esc(f.name)}</td><td>${tag(IN99_KIND[f.kind] || f.kind, "p-info")}</td><td class="sub">${esc(f.how || "")}${f.by === "sim" ? " (จำลอง)" : f.by === "none" ? " · อ่านไม่ได้" : ""}</td><td>${esc(f.to.join(" · "))}</td></tr>`).join("")}</tbody></table></div></div>
    <div><b style="font-weight:600">ข้อมูลที่ AI กรอก (${r.fields.filter(x => x.st === "กรอกแล้ว").length})</b><div class="tbl-wrap"><table><thead><tr><th>ช่อง</th><th>ค่า</th><th>มาจาก</th><th>ผล</th></tr></thead><tbody>${r.fields.map(x => `<tr><td>${esc(x.lab)}</td><td>${esc(String(x.val)).slice(0, 160)}</td><td class="sub">${esc(x.src || "")}</td><td>${tag(x.st, x.st === "กรอกแล้ว" ? "p-ok" : "p-mute")}</td></tr>`).join("")}</tbody></table></div></div>
    ${r.cms.length ? `<div><b style="font-weight:600">คณะกรรมการจากคำสั่ง (${r.cms.length})</b><div class="tbl-wrap"><table><thead><tr><th>คณะ</th><th>คำสั่งที่ / วันที่</th><th>รายชื่อ</th><th>ผล</th></tr></thead><tbody>${r.cms.map(x => `<tr><td>${esc(x.type)}</td><td>${esc(x.order)} · ${x.date ? fdate(x.date) : "–"}</td><td>ประธาน: ${esc(x.chair || "–")}<div class="sub">กรรมการ: ${esc(x.members.join(", ") || "–")}</div></td><td class="sub">${esc(x.st)}</td></tr>`).join("")}</tbody></table></div><div class="sub">เมื่อกด ตั้งคณะกรรมการ แล้ว ใส่สมาชิกตามรายชื่อที่ AI อ่านได้ด้านบน</div></div>` : ""}
    <div class="sub">ตรวจสอบค่าที่ AI กรอก แล้วกดบันทึกของแต่ละส่วน (บันทึกร่าง บันทึกวิธีจัดซื้อ บันทึกราคากลาง แนบ TOR ตั้งคณะกรรมการ) ช่องที่มีค่าอยู่แล้ว AI ไม่ทับ</div></div>`; }
function in99Panel(c) { if (IN99_FOR !== c.id) { IN99_FILES = []; IN99_RES = null; IN99_FOR = c.id; }
  return `<div class="in99" style="border:1px solid var(--accent,#3b4fa8);background:color-mix(in srgb,var(--accent,#3b4fa8) 5%,transparent);border-radius:12px;padding:12px 14px;margin-bottom:12px">
    <div class="row" style="gap:8px;flex-wrap:wrap;align-items:center"><b style="font-weight:600;flex:1 1 260px">เริ่มต้น: แนบเอกสารโครงการทั้งหมด แล้วให้ AI ประมวลผล</b>
      <label class="btn" style="cursor:pointer">+ แนบเอกสาร<input type="file" multiple data-in99file="${c.id}" style="display:none"></label>
      <button class="btn ghost" type="button" data-in99sample="${c.id}">ใช้ไฟล์ตัวอย่าง</button>
      <button class="btn primary" type="button" data-in99run="${c.id}" ${IN99_FILES.length ? "" : "disabled"}>ให้ AI ประมวลผลและกรอกให้</button></div>
    <div class="sub" style="margin-top:4px">แนบข้อเสนอโครงการ TOR BOQ ราคากลาง แบบรูป คำสั่งแต่งตั้งคณะกรรมการ และเอกสารอื่น AI จำแนกเอกสาร อ่านข้อมูล แล้วกรอกลงช่องของขั้นนี้ แนบไฟล์ให้ตรงส่วน และเตรียมคณะกรรมการตามคำสั่ง</div>
    <div class="in99-list sub" style="margin-top:6px">${IN99_FILES.length ? `แนบแล้ว ${IN99_FILES.length} ไฟล์: ${IN99_FILES.map(f => esc(f.name)).join(", ")}` : "ยังไม่ได้แนบเอกสาร"}</div>
    <div class="in99-out">${in99ResHtml(IN99_RES)}</div></div>`; }
{ const base = rqFormHtml; rqFormHtml = function (c) { const h = base(c); return h.replace(/<div class="rq88-ai"[\s\S]*?<\/button>(?:<div class="sub"[^>]*>[\s\S]*?<\/div>)?<\/div>/, "").replace(/(<form id="rq-inline"[^>]*>)/, "$1" + in99Panel(c)); }; }
const in99Repaint = c => { const p = document.querySelector(".in99"); if (!p) return; const n = document.createElement("div"); n.innerHTML = in99Panel(c); p.replaceWith(n.firstElementChild); };
document.addEventListener("change", e => { const t = e.target; if (!t || !t.matches || !t.matches("[data-in99file]")) return; const c = caseOf(t.dataset.in99file); if (!c) return;
  Array.from(t.files).forEach(x => { if (!IN99_FILES.some(y => y.name === x.name && y.size === x.size)) IN99_FILES.push(x); }); IN99_RES = null; in99Repaint(c); });
document.addEventListener("click", async e => { const t = e.target && e.target.closest ? e.target : null; if (!t) return;
  const s = t.closest("[data-in99sample]"); if (s) { const c = caseOf(s.dataset.in99sample); if (!c) return; s.disabled = true; try { for (const n of IN99_SAMPLE[1]) { const r = await fetch(`ตัวอย่างเอกสารโครงการ/${IN99_SAMPLE[0]}/${n}`); if (r.ok && !IN99_FILES.some(y => y.name === n)) IN99_FILES.push(new File([await r.blob()], n)); } } catch (er) { toast("โหลดไฟล์ตัวอย่างไม่สำเร็จ"); } IN99_RES = null; in99Repaint(c); return; }
  const b = t.closest("[data-in99run]"); if (b) { const c = caseOf(b.dataset.in99run); if (!c) return; b.disabled = true; b.textContent = "AI กำลังอ่านเอกสาร…"; const r = await in99Run(c);
    if (r.err) { toast(r.err); in99Repaint(c); return; } audit(["ให้ AI อ่านเอกสารโครงการและกรอกขั้นจัดทำข้อมูล", "AI read the project documents and filled step 2"], c.id); in99Repaint(c);
    toast(`AI อ่าน ${r.files.length} ไฟล์ กรอก ${c.in99.n} ช่อง ตรวจสอบก่อนบันทึก`); } });
