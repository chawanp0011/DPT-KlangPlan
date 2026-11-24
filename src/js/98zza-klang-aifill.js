// Fisko-KlangFinance, round P14 (16 Nov 2569): "AI helps draft the request" now summarises ALL the attached documents and puts what it finds into
// the sections of the request, as far as it can.
//  - On attach the prototype now reads the text of the files it can read in the browser: .txt .csv .md .json, .docx (word/document.xml) and .xlsx
//    (the cells). A PDF or any other file cannot be read here: it is listed by its name only and the summary says so. The text is kept in the
//    request (the first 20,000 characters of each file) so that the summary can be made again.
//  - "Summarise the documents and fill the request" reads every file with fixed rules (simulated, not a language model): the subject, the reason and
//    objectives, indicators, the amount, years and contract number of a commitment, the place (province, district, sub-district), the agency that asks,
//    and the items of the price register named in the text with their quantity. It fills only what is EMPTY (or short) unless "overwrite" is ticked,
//    lists every field it filled with the file it came from, and the whole fill can be undone.
//  - The draft letter includes the summary.
// Assumptions of mine: the keywords and patterns below (they suit Thai official letters and tables), the 20,000-character limit, and the 40-character
// limit under which a reason counts as empty.

const AI_TEXT_MAX = 20000, AI_READ = /\.(txt|csv|md|json|docx|xlsx)$/i;
async function aiZipText(buf, name) {
  const u8 = new Uint8Array(buf), dv = new DataView(buf), dec = new TextDecoder("utf-8"); let eocd = -1;
  for (let i = u8.length - 22; i >= Math.max(0, u8.length - 70000); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error("not a zip");
  const n = dv.getUint16(eocd + 10, true); let p = dv.getUint32(eocd + 16, true);
  for (let k = 0; k < n; k++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break; const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), el = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), lo = dv.getUint32(p + 42, true), nm = dec.decode(u8.subarray(p + 46, p + 46 + nl)); p += 46 + nl + el + cl;
    if (nm !== name) continue; const ln = dv.getUint16(lo + 26, true), le = dv.getUint16(lo + 28, true), start = lo + 30 + ln + le, raw = u8.subarray(start, start + csize); return dec.decode(method === 0 ? raw : await odInflate(raw));
  }
  return "";
}
// the text of a file, "" when the prototype cannot read that kind of file
async function aiFileText(f) {
  const n = f.name || ""; try {
    if (/\.(txt|csv|md|json)$/i.test(n)) return (await f.text()).slice(0, AI_TEXT_MAX);
    if (/\.docx$/i.test(n)) { const x = await aiZipText(await f.arrayBuffer(), "word/document.xml"); return x.replace(/<\/w:p>/g, "\n").replace(/<w:tab\/>/g, " ").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").slice(0, AI_TEXT_MAX); }
    if (/\.xlsx$/i.test(n)) return (await xlsxRead(await f.arrayBuffer())).map(r => r.filter(c => c !== "" && c != null).join(" | ")).filter(Boolean).join("\n").slice(0, AI_TEXT_MAX);
  } catch (e) { return ""; }
  return "";
}
async function rqKeepText(r, files) { r.docText = r.docText || {}; for (const f of files) { const t = await aiFileText(f); r.docText[f.name] = t; } return r.docText; }

// ---------- the analysis ----------
const aiLines = t => String(t || "").split(/\r?\n/).map(x => x.trim()).filter(Boolean);
const aiAfter = (t, re, max, list) => { const m = re.exec(t); if (!m) return ""; const rest = t.slice(m.index + m[0].length).replace(/^[\s:：]+/, ""), ls = rest.split(/\r?\n/), out = []; let len = 0;
  for (let i = 0; i < ls.length; i++) { const l = ls[i].trim(); if (i > 0 && out.length && (!l || (list ? !/^(?:\d+[.)]|[-•*])\s*/.test(l) : /^(?:\d+[.)]|[ก-๙]{2,12}\s*[:：])/.test(l)))) break; if (l) { out.push(l); len += l.length; } if (len >= (max || 600)) break; } return out.join(" ").slice(0, max || 600); };
const aiThaiDate = x => { const M = { "มกราคม": 1, "ม.ค.": 1, "กุมภาพันธ์": 2, "ก.พ.": 2, "มีนาคม": 3, "มี.ค.": 3, "เมษายน": 4, "เม.ย.": 4, "พฤษภาคม": 5, "พ.ค.": 5, "มิถุนายน": 6, "มิ.ย.": 6, "กรกฎาคม": 7, "ก.ค.": 7, "สิงหาคม": 8, "ส.ค.": 8, "กันยายน": 9, "ก.ย.": 9, "ตุลาคม": 10, "ต.ค.": 10, "พฤศจิกายน": 11, "พ.ย.": 11, "ธันวาคม": 12, "ธ.ค.": 12 }, iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(x); if (iso) return x; const m = /^(\d{1,2})\s*([^\d\s]{2,12}?\.?)\s*(\d{4})$/.exec(String(x).trim()); if (!m || !M[m[2]]) return ""; const y = Number(m[3]) > 2400 ? Number(m[3]) - 543 : Number(m[3]); return `${y}-${String(M[m[2]]).padStart(2, "0")}-${String(Number(m[1])).padStart(2, "0")}`; };
const AI_HDR = /^(บันทึกข้อความ|ส่วนราชการ|ที่\s|วันที่|เรียน|อ้างถึง|สิ่งที่ส่งมาด้วย|จึงเรียนมา|ขอแสดงความนับถือ|โทร|\()/;
function aiAnalyse(r, sub) {
  const docs = Object.keys(r.docText || {}), all = rqAllFiles(r), found = {}, from = {}, put = (k, v, f) => { if (v && !found[k]) { found[k] = v; from[k] = f; } };
  const unread = all.filter(n => !(r.docText && r.docText[n]));
  docs.forEach(fn => {
    const t = r.docText[fn]; if (!t) return;
    put("name", ((/(?:^|\n)\s*(?:เรื่อง|ชื่อโครงการ|ชื่อรายการ)\s*[:：]?\s*(.+)/.exec(t) || [])[1] || "").replace(/^(?:ขอตั้งงบประมาณ(?:รายจ่าย)?\s*(?:ปีงบประมาณ\s*\d{4})?\s*[:：]?\s*)/, "").trim().slice(0, 160), fn);
    put("reason", aiAfter(t, /(?:หลักการและเหตุผล|เหตุผลความจำเป็น|ความจำเป็น|เหตุผล)/, 700), fn);
    put("objective", aiAfter(t, /วัตถุประสงค์/, 300), fn);
    put("indicators", (() => { const ls = aiLines(aiAfter(t, /(?:ตัวชี้วัด|เป้าหมาย)/, 400, true)); return ls.join("\n"); })(), fn);
    const amt = /(?:วงเงิน|งบประมาณ|รวมเป็นเงิน|รวมทั้งสิ้น)[^\d\n]{0,25}([\d,]{4,}(?:\.\d+)?)\s*บาท/.exec(t); put("amount", amt ? Number(amt[1].replace(/,/g, "")) : 0, fn);
    const yrs = /(?:ปีงบประมาณ|ปี)\s*(25\d\d)\s*(?:[-–—]|ถึง|ไปจนถึง)\s*(?:ปีงบประมาณ|ปี)?\s*(25\d\d)/.exec(t); if (yrs) put("years", { from: Number(yrs[1]), to: Number(yrs[2]) }, fn);
    const cno = /(?:สัญญา(?:เลขที่)?|เลขที่สัญญา)\s*[:：]?\s*([A-Za-z0-9ก-๙][A-Za-z0-9ก-๙\/\-.]{2,24})/.exec(t); put("contract", cno ? cno[1] : "", fn);
    const loc = /จังหวัด\s*([ก-๙]{2,30})(?:[^\n]{0,40}?อำเภอ\s*([ก-๙]{2,30}))?(?:[^\n]{0,40}?ตำบล\s*([ก-๙]{2,30}))?/.exec(t); if (loc) put("area", { prov: loc[1], dist: loc[2] || "", sub: loc[3] || "" }, fn);
    put("agency", ((/(?:หน่วยงานที่ขอ|ผู้ขอ|ขอโดย)\s*[:：]\s*(.+)/.exec(t) || [])[1] || "").trim().slice(0, 120), fn);
    // items of the price register named in the text, with a quantity next to them
    const hits = []; aiLines(t).forEach(l => S.prices.filter(p => rpValid(p)).forEach(p => { const nm = tx(p.name); if (nm.length >= 4 && l.includes(nm)) { const q = /(\d[\d,]*)\s*(?:หน่วย|เครื่อง|ชุด|คน|ระบบ|ครั้ง|เดือน|ชิ้น|งาน|ราย)/.exec(l.replace(nm, " ")) || /\|\s*(\d[\d,]*)\s*(?:\||$)/.exec(l); hits.push({ p, qty: q ? Number(q[1].replace(/,/g, "")) : 0, fn }); } }));
    if (hits.length && !found.item) { found.item = hits; from.item = fn; }
  });
  // more facts: the cover letter (number, date), the agency, the contact; and fallbacks for a file without headings
  docs.forEach(fn => { const t = r.docText[fn]; if (!t) return;
    const dn = /(?:^|\n)\s*ที่\s+([^\n]{3,40})/.exec(t); put("docNo", dn ? dn[1].trim().replace(/\s{3,}.*$/, "") : "", fn);
    const dd = /(?:วันที่|ลงวันที่)\s*[:：]?\s*(\d{1,2}\s*[^\d\s]{2,12}\.?\s*\d{4}|\d{4}-\d{2}-\d{2})/.exec(t); put("docDate", dd ? aiThaiDate(dd[1]) : "", fn);
    const cn = /(?:ผู้ประสานงาน|ผู้ติดต่อ|ผู้ยื่น)\s*[:：]\s*([^\n,，(]{3,60})/.exec(t); put("contactName", cn ? cn[1].replace(/\s*(?:โทร|เบอร์|Tel).*$/i, "").trim() : "", fn);
    const ps = /ตำแหน่ง\s*[:：]?\s*([^\n]{2,60})/.exec(t); put("contactPos", ps ? ps[1].trim() : "", fn);
    const ph = /(?:โทร(?:ศัพท์)?\.?|เบอร์โทร(?:ศัพท์)?|Tel\.?)\s*[:：]?\s*(0[0-9][0-9\s\-().#]{6,18})/.exec(t); put("phone", ph ? ph[1].trim() : "", fn);
    const em = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.exec(t); put("email", em ? em[0] : "", fn);
    const sg = /(?:ส่วนราชการ|หน่วยงาน)\s*[:：]\s*([^\n]{3,80})/.exec(t); put("agencyHead", sg ? sg[1].replace(/\s+โทร.*$/, "").trim() : "", fn); });
  { const first = docs.find(fn => r.docText[fn]); if (first) { const t = r.docText[first], ls = aiLines(t);
      if (!found.name) { const l = ls.find(x => !AI_HDR.test(x) && x.length >= 6 && x.length <= 120 && !/^[\d\s.,|]+$/.test(x)); if (l) put("name", l.replace(/^(?:เรื่อง|ชื่อโครงการ)\s*[:：]?\s*/, ""), first); }
      if (!found.reason) { const p = t.split(/\n+/).map(x => x.trim()).filter(x => x.length >= 60 && !AI_HDR.test(x)).sort((a, b) => b.length - a.length)[0]; if (p) put("reason", p.slice(0, 700), first); }
      if (!found.amount) { const nums = [...t.matchAll(/([\d,]{5,}(?:\.\d+)?)\s*บาท/g)].map(m => Number(m[1].replace(/,/g, ""))).filter(Boolean); if (nums.length) put("amount", Math.max(...nums), first); } } }
  // a short summary of each file
  const files = all.map(fn => { const t = (r.docText || {})[fn] || ""; return { fn, kind: rqFileKind(fn), read: !!t, head: t ? aiLines(t).slice(0, 3).join(" ").slice(0, 220) : "", sum: t ? aiLines(t).filter(l => !AI_HDR.test(l)).join(" ").slice(0, 280) : "", facts: !sub && t ? aiFactList(aiAnalyse({ docText: { [fn]: t }, by: { files: [fn] }, docs: [] }, true).found) : [] }; });
  return { found, from, files, unread };
}
const aiFactList = f => { const n = x => fmt(Number(x) || 0), k = [];
  if (f.name) k.push(`${L("เรื่อง", "Subject")}: ${f.name}`); if (f.reason) k.push(`${L("เหตุผล", "Reason")}: ${f.reason.slice(0, 160)}`); if (f.objective) k.push(`${L("วัตถุประสงค์", "Objective")}: ${f.objective.slice(0, 120)}`);
  if (f.amount) k.push(`${L("วงเงิน", "Amount")}: ${n(f.amount)} ${L("บาท", "baht")}`); if (f.years) k.push(`${L("ปีงบประมาณ", "Years")}: ${f.years.from}–${f.years.to}`); if (f.contract) k.push(`${L("สัญญาเลขที่", "Contract no.")}: ${f.contract}`);
  if (f.area) k.push(`${L("พื้นที่", "Place")}: ${[f.area.prov, f.area.dist, f.area.sub].filter(Boolean).join(" ")}`); if (f.item) k.push(`${L("รายการในทะเบียนราคากลาง", "Register items")}: ${f.item.map(h => tx(h.p.name) + (h.qty ? " × " + h.qty : "")).join("; ")}`);
  if (f.indicators) k.push(`${L("ตัวชี้วัด", "Indicators")}: ${f.indicators.split("\n").slice(0, 3).join("; ")}`);
  if (f.docNo || f.docDate) k.push(`${L("หนังสือที่", "Letter no.")} ${f.docNo || "–"} ${f.docDate ? L("ลงวันที่", "dated") + " " + f.docDate : ""}`.trim());
  if (f.contactName || f.phone || f.email) k.push(`${L("ผู้ประสานงาน", "Contact")}: ${[f.contactName, f.phone, f.email].filter(Boolean).join(" · ")}`);
  return k; };
const aiSummary = (r, a) => {
  const out = [`${L("สรุปเอกสารที่แนบ", "Summary of the attached documents")} ${a.files.length} ${L("ไฟล์", "files")} (${a.files.filter(x => x.read).length} ${L("ไฟล์ที่อ่านเนื้อหาได้", "files could be read")})`];
  a.files.forEach((x, i) => { out.push(`${i + 1}. ${x.fn} · ${x.kind}`);
    if (x.read) { if (x.sum) out.push(`   ${L("เนื้อหา", "Content")}: ${x.sum}${x.sum.length >= 280 ? "…" : ""}`); if (x.facts.length) out.push(`   ${L("ประเด็นที่พบ", "Found")}: ${x.facts.join(" | ")}`); }
    else out.push(`   ${L("อ่านเนื้อหาไม่ได้ ต้นแบบอ่านได้เฉพาะ .txt .csv .md .json .docx .xlsx จึงใช้ได้แต่ชื่อไฟล์", "The content can't be read (only .txt .csv .md .json .docx .xlsx can be); only the file name is used")}`); });
  const k = aiFactList(a.found);
  out.push(k.length ? `${L("ประเด็นสำคัญรวมทุกไฟล์", "Key points of all the files")}:\n- ${k.join("\n- ")}` : L("ไม่พบประเด็นที่จับได้ในเนื้อหาของเอกสาร", "No key point could be picked out of the files"));
  if (a.unread.length) out.push(`${L("ข้อจำกัด: ต้นแบบอ่านเนื้อหา .txt .csv .md .json .docx .xlsx เท่านั้น ไฟล์ต่อไปนี้ใช้ได้แต่ชื่อไฟล์", "Limit: only .txt .csv .md .json .docx .xlsx are read; these files are used by name only")}: ${a.unread.join(", ")}`);
  return out.join("\n");
};

// ---------- the fill, with an undo ----------
const aiSnap = r => JSON.stringify({ name: r.name, reason: r.reason, kpi: r.kpi, items: r.items, rp: r.rp, by: r.by, commit: r.commit, areas: rqCls(r).areas || [], docs: r.docs, inds: r.inds, intake: r.intake });
function aiRestore(r, s) { const o = JSON.parse(s); r.name = o.name; r.reason = o.reason; r.kpi = o.kpi; r.items = o.items; r.rp = o.rp; r.by = o.by; r.commit = o.commit; rqCls(r).areas = o.areas; r.docs = o.docs; r.inds = o.inds; r.intake = o.intake; r.amount = reqAmount(r); rqSyncOffs(r); }
function aiFill(r, over) {
  const a = aiAnalyse(r), f = a.found, filled = [], snap = aiSnap(r), empty = v => !String(tx(v) || "").trim() || String(tx(v)).trim().length < 40, set = (label, from, fn) => filled.push({ label, from, fn });
  if (f.name && (over || !nmStr(r.name).trim() || /คำขอใหม่|New request/.test(nmStr(r.name)))) { r.name = [f.name, f.name]; set(L("ชื่อรายการคำขอ", "Name of the request"), f.name, a.from.name); }
  const rs = [f.reason, f.objective && `${L("วัตถุประสงค์", "Objective")}: ${f.objective}`].filter(Boolean).join("\n");
  if (rs && (over || empty(r.reason))) { r.reason = rs; set(L("เหตุผลความจำเป็น", "Reason"), rs.slice(0, 120) + (rs.length > 120 ? "…" : ""), a.from.reason || a.from.objective); }
  if (f.indicators) { const names = f.indicators.split("\n").map(x => x.replace(/^[\s\-•\d.)]+/, "").trim()).filter(x => x.length >= 3).slice(0, 3), it = r.items[0]; if (it && names.length && (over || !rInds(r).some(x => String(x.name || "").trim() && !/ที่ดำเนินการแล้วเสร็จ|ระดับความสำเร็จของ/.test(x.name)))) { r.inds = (over ? [] : rInds(r).filter(x => !/ที่ดำเนินการแล้วเสร็จ|ระดับความสำเร็จของ/.test(x.name))).concat(names.map(nm => ({ name: nm, type: "quant", unit: "หน่วย", q: [0, 0, 0, 0], m: Array(12).fill(0) }))); set(L("ตัวชี้วัดของคำขอ (ยังไม่มีเป้าหมาย ต้องกรอกเอง)", "Indicators of the request (no target yet)"), names.join("; "), a.from.indicators); if (!r.kpi || !String(tx(r.kpi)).trim()) r.kpi = names.join("; "); } }
  if (f.item && (over || !r.rp || !r.items.some(i => i.sp))) { const h = f.item.find(x => x.qty) || f.item[0]; rqChoose(r, h.p); if (h.qty) r.items[0].qty = h.qty; rInds(r); set(L("รายการจากทะเบียนราคากลาง", "Item of the price register"), `${tx(h.p.name)}${h.qty ? " × " + h.qty : ""}`, a.from.item); }
  if (f.area) { const A = (rqCls(r).areas = rqCls(r).areas || []); if (!A.length || over) { const g = (S.geo || []).find(x => x.prov === f.area.prov && (!f.area.dist || x.dist === f.area.dist) && (!f.area.sub || x.sub === f.area.sub)); A.splice(0, A.length, { prov: f.area.prov, dist: f.area.dist, sub: f.area.sub, lat: g ? g.lat : "", lng: g ? g.lng : "" }); set(L("พื้นที่ดำเนินงาน", "Area of the work"), [f.area.prov, f.area.dist, f.area.sub].filter(Boolean).join(" ") + (g ? "" : ` (${L("ไม่มีพิกัดในตารางพื้นที่ ต้องใส่เอง", "no coordinates in the area table")})`), a.from.area); } }
  if (f.agency && r.by && r.by.mode === "other" && (over || !String(r.by.agency || "").trim())) { r.by.agency = f.agency; set(L("ชื่อหน่วยงานที่ขอ", "Agency that asks"), f.agency, a.from.agency); }
  if (r.multi) { const c = (r.commit = r.commit || cmInit(r)); if (f.years && (over || !Number(c.period))) { c.startY = f.years.from; c.period = f.years.to - f.years.from + 1; set(L("ปีผูกพันและระยะเวลาผูกพัน", "Commitment start year and period"), `${f.years.from}–${f.years.to} (${c.period} ${L("ปี", "years")})`, a.from.years); }
    if (f.amount && (over || !Number(c.budget))) { c.budget = f.amount; set(L("ยอดเงินงบประมาณของภาระผูกพัน", "Budget amount of the commitment"), fmt(f.amount), a.from.amount); }
    if (f.contract && (over || !String(c.contractNo || "").trim())) { c.contractNo = f.contract; c.status = "contract"; set(L("เลขที่สัญญา (สถานะ: ผูกพันสัญญา)", "Contract number (status: under contract)"), f.contract, a.from.contract); } }
  // who sent it: the agency, the cover letter and the contact (section "who sent the request")
  { const I = (r.intake = r.intake || {}), C = (I.contact = I.contact || {}), fl = (cur, val, label, k, apply) => { if (val && (over || !String(cur || "").trim())) { apply(val); set(label, val, a.from[k]); } };
    fl(I.agency, f.agencyHead || f.agency, L("ชื่อหน่วยงานตามหนังสือนำส่ง", "Agency name on the cover letter"), f.agencyHead ? "agencyHead" : "agency", v => (I.agency = v));
    fl(I.docNo, f.docNo, L("เลขที่หนังสือนำส่ง", "Cover letter no."), "docNo", v => (I.docNo = v)); fl(I.docDate, f.docDate, L("ลงวันที่ (หนังสือนำส่ง)", "Date of the cover letter"), "docDate", v => (I.docDate = v));
    fl(C.name, f.contactName, L("ผู้ยื่น / ผู้ประสานงาน", "Sender or contact"), "contactName", v => (C.name = v)); fl(C.pos, f.contactPos, L("ตำแหน่งผู้ยื่น", "Position"), "contactPos", v => (C.pos = v));
    fl(C.phone, f.phone && inPhoneOk(f.phone) ? f.phone : "", L("เบอร์โทร", "Phone"), "phone", v => (C.phone = v)); fl(C.email, f.email && inMailOk(f.email) ? f.email : "", L("อีเมล", "Email"), "email", v => (C.email = v)); }
  // a price outside the standard is the one the requester sets, so it follows the amount in the documents (a standard price is never changed)
  if (f.amount && r.rp) { const p = S.prices.find(x => x.id === r.rp), q = r.items.reduce((t, i) => t + (Number(i.qty) || 0), 0); if (p && pKind(p) === "ns" && q > 0 && (over || reqAmount(r) <= 0)) { const price = Math.round(f.amount / q); r.items.forEach(i => { i.price = price; delete i.own; }); set(L("ราคาต่อหน่วย (ราคานอกมาตรฐาน) จากวงเงินในเอกสาร", "Unit price (outside the standard) from the amount in the documents"), `${fmt(price)} × ${fmt(q)}`, a.from.amount); } }
  r.amount = reqAmount(r); rqSyncOffs(r);
  const todo = [["name", L("ชื่อรายการ", "Name")], ["reason", L("เหตุผลความจำเป็น", "Reason")], ["indicators", L("ตัวชี้วัด", "Indicators")], ["item", L("รายการในทะเบียนราคากลางและปริมาณ", "Register item and quantity")], ["amount", L("วงเงิน", "Amount")], ["area", L("พื้นที่ดำเนินการ", "Place")], ["contactName", L("ผู้ประสานงาน", "Contact")], ["phone", L("เบอร์โทร", "Phone")]].filter(x => !f[x[0]]).map(x => x[1]);
  if (f.amount && Math.abs(reqAmount(r) - f.amount) > 1) todo.push(L(`วงเงินในเอกสาร ${fmt(f.amount)} บาท ไม่ตรงกับยอดในฟอร์ม ${fmt(reqAmount(r))} บาท (ตรวจปริมาณและราคา)`, `The amount in the documents (${fmt(f.amount)}) differs from the form (${fmt(reqAmount(r))}); check the quantity and the price`));
  const summary = aiSummary(r, a); r.aiFill = { t: nowIso(), by: me().id, summary, filled, snap, over: !!over, none: !filled.length, todo };
  return r.aiFill;
}

// ---------- the panel (section 3) ----------
{
  const base = rqAiPanel;
  rqAiPanel = function (r, ed) {
    let html = base(r, ed); const F = r.aiFill, files = rqAllFiles(r), nRead = files.filter(n => (r.docText || {})[n]).length;
    html = html.split(L("AI ช่วยร่างเอกสารคำขอ", "AI drafts the request document")).join(L("AI ช่วยร่างคำขอ", "AI drafts the request"));
    const primary = `<div class="body" id="rf-aifillbox" style="display:flex;flex-direction:column;gap:8px">
      <span class="sub">${L("AI อ่านเอกสารทุกไฟล์ที่แนบในข้อ 2 แล้วทำสองอย่างในปุ่มเดียว: (1) สรุปเอกสารที่ได้รับทั้งหมด (2) ร่างคำขอ คือเติมข้อมูลลงฟอร์มคำขอทุกจุดที่เติมได้ (ชื่อรายการ เหตุผล ตัวชี้วัด รายการทะเบียนราคากลางและปริมาณ ราคาต่อหน่วยนอกมาตรฐาน พื้นที่ ผู้ยื่นและผู้ประสานงาน เลขที่และวันที่หนังสือ ภาระผูกพัน) เติมเฉพาะช่องที่ว่าง ทุกช่องที่เติมระบุไฟล์ที่มา และย้อนกลับได้ · ใช้กฎจำลอง ไม่ใช่โมเดลภาษา อ่านเนื้อหาได้เฉพาะ .txt .csv .md .json .docx .xlsx ผู้จัดทำต้องตรวจทาน", "The AI reads every file attached in section 2 and does two things with one button: (1) summarises all the documents received, (2) drafts the request, that is, fills the request form wherever it can (name, reason, indicators, register item and quantity, unit price outside the standard, place, sender and contact, letter number and date, commitment). Empty fields only; each field filled names its source file; it can be undone · simulated rules, not a language model; only .txt .csv .md .json .docx .xlsx can be read; the requester must check")}</span>
      <div class="row"><span class="sub">${files.length} ${L("ไฟล์", "files")} · ${nRead} ${L("อ่านเนื้อหาได้", "readable")}</span>${ed ? `<label class="radio"><input type="checkbox" id="rf-aiover"> ${L("ทับค่าเดิมที่มีอยู่", "Overwrite what is there")}</label><button class="btn primary" type="button" id="rf-aifill" ${files.length ? "" : "disabled"}>${L("ร่างคำขอด้วย AI (สรุปเอกสารและเติมฟอร์ม)", "Draft the request with AI (summarise and fill)")}</button>${F && F.snap ? `<button class="btn ghost" type="button" id="rf-aiundo">${L("ย้อนกลับการเติม", "Undo the fill")}</button>` : ""}` : ""}</div>
      ${files.length ? `<div class="row">${files.map(f => tag(`${esc(f)} · ${rqFileKind(f)}`, (r.docText || {})[f] ? "p-ok" : "p-mute")).join("")}</div>` : ""}
      ${files.length ? "" : `<p class="sub" style="margin:0">${L("แนบเอกสารในข้อ 2 ก่อน แล้ว AI จึงสรุปและร่างคำขอได้", "Attach the documents in section 2 first")}</p>`}
      ${F ? `<div><b style="font-weight:600">${L("สรุปเอกสารที่ได้รับ", "Summary of the documents received")}</b><pre id="rf-aisum" style="white-space:pre-wrap;margin:4px 0 0;max-height:300px;overflow:auto">${esc(F.summary)}</pre></div>
        <div><b style="font-weight:600">${L("ช่องของคำขอที่เติมแล้ว", "Fields of the request filled")} (${F.filled.length})</b>${F.filled.length ? `<div class="tbl-wrap"><table><thead><tr><th>${L("ช่อง", "Field")}</th><th>${L("ค่าที่เติม", "Value")}</th><th>${L("จากไฟล์", "From the file")}</th></tr></thead><tbody>${F.filled.map(x => `<tr><td>${esc(x.label)}</td><td>${esc(x.from)}</td><td class="sub">${esc(x.fn || "")}</td></tr>`).join("")}</tbody></table></div>` : `<p class="sub">${L("ไม่มีช่องที่เติมได้ (ช่องที่เกี่ยวข้องมีค่าอยู่แล้ว หรือเอกสารไม่มีข้อมูลที่จับได้)", "Nothing to fill (the fields already have a value, or the files hold nothing that could be picked out)")}</p>`}</div>
        ${(F.todo || []).length ? `<div id="rf-aitodo"><b style="font-weight:600">${L("ยังไม่พบในเอกสาร ผู้จัดทำต้องกรอกหรือตรวจเอง", "Not found in the documents; fill in or check yourself")}</b><ul style="margin:4px 0 0 18px">${F.todo.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>` : ""}` : ""}</div>`;
    const marker = '<div class="body" style="display:flex;flex-direction:column;gap:8px"><span class="sub">', i = html.indexOf(marker); if (i < 0) return html;
    return html.slice(0, i) + primary + `<details style="border-top:1px solid var(--line)"><summary class="sub" style="cursor:pointer;padding:8px 14px">${L("ร่างหนังสือขอเป็นข้อความ (ทางเลือก)", "Draft the request letter as text (optional)")}</summary>` + html.slice(i).replace(/<\/div><\/section>$/, "</div></details></section>");
  };
}
{
  const bb = rqFormBind;
  rqFormBind = function (r) {
    bb(r); if (!editable(r)) return;
    const fl = document.querySelector("#rf-aifill"); if (fl) fl.onclick = () => { const over = !!(document.querySelector("#rf-aiover") || {}).checked; const F = aiFill(r, over); audit(["AI สรุปเอกสารและเติมรายละเอียดคำขอ", "AI summarised the documents and filled the request"], `${r.id} · ${F.filled.length}`); S.aiLog.unshift({ t: nowIso(), agent: "AG-01", user: me().id, action: ["สรุปเอกสารและเติมรายละเอียดคำขอ", "Summarised the documents and filled the request"], target: r.id, sources: rqAllFiles(r).length, ok: true }); save(); route(); toast(F.filled.length ? L(`เติมแล้ว ${F.filled.length} ช่อง`, `${F.filled.length} fields filled`) : L("ไม่มีช่องที่เติมได้", "Nothing to fill")); };
    const un = document.querySelector("#rf-aiundo"); if (un) un.onclick = () => { if (!r.aiFill || !r.aiFill.snap) return; aiRestore(r, r.aiFill.snap); r.aiFill.snap = null; r.aiFill.filled = []; r.aiFill.summary += `\n${L("(ย้อนกลับการเติมแล้ว)", "(the fill was undone)")}`; audit(["ย้อนกลับการเติมของ AI", "Undid the AI fill"], r.id); save(); route(); };
  };
}
// the draft letter carries the summary
{
  const d0 = rqAiDoc;
  rqAiDoc = function (r, form) { const t = d0(r, form), F = r.aiFill; return F && F.summary ? t.replace(/\n\nจึงเรียนมาเพื่อโปรดพิจารณา/, `\n\n${F.summary}\n\nจึงเรียนมาเพื่อโปรดพิจารณา`) : t; };
}
