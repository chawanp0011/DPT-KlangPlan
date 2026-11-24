// Fisko-KlangFinance, round P38 (20 Nov 2569): the new menu "เตรียมคำของบประมาณ" (Make the budget request), before the request list.
// Asked for by the user: "ปรับกระบวนการเตรียมความพร้อมคำของบประมาณ":
//   1 Planning receives the project documents from a division, an outside agency or others; sample files to test with are wanted;
//   2 Planning uses AI to process all the attached documents, puts what it finds into the prepared fields, and checks whether the documents
//     are complete; the laws and regulations on asking for construction and durable goods are to be found and turned into conditions that
//     check the state of the request, with a mock-up of the check;
//   3 Planning saves and forwards to the responsible unit, which fixes and returns; Planning checks again; when all is complete the state
//     becomes "ready to send to the Bureau (สงป.)";
//   the AI must read pdf, word, excel, images and others.
// What is REAL here and what is SIMULATED (kept apart on purpose; the page says it too):
//   REAL, in the browser, no server: the text of .txt .md .csv .json .html .xml .rtf, .docx, .xlsx, .pptx, and .pdf (a built-in reader: it
//     inflates the streams and decodes the text through the fonts' ToUnicode maps; it reads PDFs written by common tools with text in them, not
//     scans, not encrypted ones, not those that keep objects inside object streams); the kind of document, the fields, the completeness and
//     the checks are made by FIXED RULES (keywords and patterns), not by a language model.
//   SIMULATED: reading an image. No OCR runs here. The sample images carry their text inside the file (a PNG text chunk) and the reader takes
//     that, saying "simulated OCR"; a picture with no such text is listed as "can't be read here: key it in or use a real OCR".
//   NOT VERIFIED: the laws. The web search tools did not work in this round, so no section number and no limit is claimed. Each condition
//     names the law it comes from by its name only, is marked "draft, not checked against the text", and has fields where Planning writes the
//     clause and the link and ticks "checked" once it has read the text. The limit above which a feasibility study is asked is a setting
//     (default 1,000 million baht, my assumption), not a statement of the law.
// Who: Planning receives, processes, forwards, checks and sets ready; the owning division (and only it) sees what was forwarded to its unit,
// adds files and returns it; the executive, the auditor and the administrator read. Nothing leaves the browser: the file bytes are not kept, only
// the name, the size, the kind found, how it was read and the first 20,000 characters of text.

const RM_APP = "DPT Budget";
const RM_TABS = [["ov", ["ภาพรวม", "Overview"]], ["in", ["1 รับเอกสาร", "1 Receive documents"]], ["ai", ["2 ตรวจสอบเอกสาร", "2 Check the documents"]], ["fw", ["3 ส่งต่อและติดตาม", "3 Forward and follow up"]]];
const RM = { tab: "ov", id: "", nw: false, busy: false, msg: "", lw: null, cd: null, dt: null };
const RM_ST = { draft: ["สำนัก/กองกำลังเตรียม", "Being prepared by the division", "p-mute"], submitted: ["ส่งแล้ว รอกองแผนงานรับ", "Sent, waiting for Planning", "p-warn"], received: ["กองแผนงานรับเรื่องแล้ว", "Received by Planning", "p-mute"], processed: ["ประมวลผลแล้ว", "Processed", "p-info"], forwarded: ["ส่งต่อหน่วยงานแล้ว", "Forwarded to the unit", "p-warn"], returned: ["หน่วยงานส่งกลับ", "Returned by the unit", "p-info"], ready: ["พร้อมส่ง สงป.", "Ready to send to the Bureau", "p-ok"] };
const RM_SRC = { unit: ["สำนัก/กองของหน่วยงาน", "A division of the agency"], ext: ["หน่วยงานภายนอก", "An outside agency"], other: ["อื่น ๆ", "Other"] };
const RM_KIND = { construction: ["สิ่งก่อสร้าง", "Construction"], durable: ["ครุภัณฑ์", "Durable goods"], other: ["อื่น ๆ (งบดำเนินงาน/บริการ)", "Other (running costs, services)"] };
// The kinds of document the reader tells apart (with the words it looks for) and the documents each kind of request must have are CENTRAL
// CONFIGURATION, kept in the register "ทะเบียนชนิดเอกสารโครงการ" in the registers menu (S.rmDocType). The two lists below are filled from it
// (rmSyncDocs) so the readers, the conditions and the pages all see one list. RM_DOCDEF is what the register starts with.
const RM_DOCS = []; // [key, [name, name], the words as one pattern]
const RM_NEED = { construction: [], durable: [], other: [] }; // the keys of the documents a kind of request must have
const RM_DOCDEF = [
  ["proposal", "ข้อเสนอโครงการ / แบบคำขอ", ["ข้อเสนอโครงการ", "แบบคำขอ", "หลักการและเหตุผล", "ชื่อโครงการ"], ["construction", "durable", "other"]],
  ["tor", "ขอบเขตของงาน (TOR) / คุณลักษณะเฉพาะ", ["ขอบเขตของงาน", "TOR", "คุณลักษณะเฉพาะ", "ขอบเขตงาน"], ["construction", "durable", "other"]],
  ["quote", "ใบเสนอราคา", ["ใบเสนอราคา", "ผู้เสนอราคา"], ["durable"]],
  ["boq", "บัญชีปริมาณงานและราคา (BOQ ปร.4/ปร.5)", ["BOQ", "ปร.4", "ปร.5", "แสดงปริมาณงานและราคา", "ประมาณราคา"], ["construction"]],
  ["drawing", "แบบรูปรายการ / แปลน", ["แบบรูปรายการ", "แปลนพื้น", "แบบแปลน", "แบบก่อสร้าง"], ["construction"]],
  ["refprice", "ราคากลาง", ["ราคากลาง"], ["construction"]],
  ["land", "เอกสารสิทธิ์ / หนังสือยินยอมใช้ที่ดิน", ["โฉนด", "เอกสารสิทธิ์", "ยินยอมให้ใช้ที่ดิน", "ที่ราชพัสดุ", "ที่ดินราชพัสดุ"], ["construction"]],
  ["survey", "ผลสำรวจความต้องการ / ความจำเป็น", ["ผลสำรวจ", "ความต้องการและความจำเป็น"], ["construction", "durable"]],
  ["feasibility", "รายงานความเหมาะสม / ความคุ้มค่า", ["ความคุ้มค่า", "ความเหมาะสมและ", "ศึกษาความเหมาะสม"], []],
  ["photo", "ภาพถ่ายสภาพปัจจุบัน", ["ภาพถ่าย"], []],
  // from the list of the user (21 Nov 2569): the documents of the readiness of the area; needed only when the conditions that name them apply
  ["forestpermit", "หนังสืออนุญาตก่อสร้างในพื้นที่ป่า", ["อนุญาตก่อสร้างในพื้นที่ป่า", "ขออนุญาตก่อสร้างในพื้นที่ป่า", "ใช้พื้นที่ป่า"], []],
  ["mangrove", "หนังสือขอยกเว้นการก่อสร้างในพื้นที่ป่าชายเลน", ["ขอยกเว้นการก่อสร้าง", "ยกเว้นการก่อสร้างในพื้นที่ป่าชายเลน"], []],
  ["waterplan", "หลักฐานบรรจุในแผนปฏิบัติการด้านทรัพยากรน้ำ (กนช. เห็นชอบแผน)", ["แผนปฏิบัติการด้านทรัพยากรน้ำ", "กนช."], []],
  ["areaneed", "หลักฐานสอดคล้องความต้องการของพื้นที่ (จ3/กจ3)", ["ความต้องการของพื้นที่", "จ3", "กจ3"], []],
  ["localreq", "หนังสือคำขอจากท้องถิ่น (อนุญาตให้เข้าใช้พื้นที่ก่อสร้าง และพร้อมรับมอบโครงการ)", ["คำขอจากท้องถิ่น", "พร้อมรับมอบ", "อนุญาตให้เข้าใช้พื้นที่"], []],
  ["eia", "ผลการศึกษาผลกระทบสิ่งแวดล้อม / มติที่ประชุม คกก.", ["ผลกระทบสิ่งแวดล้อม", "EIA", "มติที่ประชุม"], []],
];
function rmSyncDocs() {
  const reg = typeof S !== "undefined" && S && S.rmDocType ? S.rmDocType.filter(x => !x.retired) : RM_DOCDEF.map(d => ({ key: d[0], name: d[1], words: d[2], need: d[3] })), esc2 = w => String(w).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  RM_DOCS.length = 0; Object.keys(RM_NEED).forEach(k => (RM_NEED[k] = []));
  reg.forEach(x => { const ws = (x.words || []).map(w => String(w).trim()).filter(Boolean); RM_DOCS.push([x.key, [x.name, x.name], new RegExp(ws.length ? ws.map(esc2).join("|") : "$^", "i")]); (x.need || []).forEach(k => RM_NEED[k] && RM_NEED[k].push(x.key)); });
}
rmSyncDocs();
// ---------- reading the files ----------
const rmZip = async (buf, re) => { // every entry of a zip whose name matches re, as text
  const u8 = new Uint8Array(buf), dv = new DataView(buf), dec = new TextDecoder("utf-8"), out = []; let eocd = -1;
  for (let i = u8.length - 22; i >= Math.max(0, u8.length - 70000); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error("not a zip"); const n = dv.getUint16(eocd + 10, true); let p = dv.getUint32(eocd + 16, true);
  for (let k = 0; k < n; k++) { if (dv.getUint32(p, true) !== 0x02014b50) break; const method = dv.getUint16(p + 10, true), cs = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), el = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), lo = dv.getUint32(p + 42, true), nm = dec.decode(u8.subarray(p + 46, p + 46 + nl)); p += 46 + nl + el + cl;
    if (!re.test(nm)) continue; const ln = dv.getUint16(lo + 26, true), le = dv.getUint16(lo + 28, true), st = lo + 30 + ln + le, raw = u8.subarray(st, st + cs); out.push([nm, dec.decode(method === 0 ? raw : await odInflate(raw))]); }
  return out;
};
const rmUnxml = x => x.replace(/<\/w:p>\s*<\/w:tc>/g, " | ").replace(/<\/w:tr>/g, "\n").replace(/<\/(w:p|a:p|text:p)>/g, "\n").replace(/<w:tab\/>/g, " ").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#(\d+);/g, (m, d) => String.fromCharCode(+d));
async function rmInflateZ(bytes) { const ds = new DecompressionStream("deflate"), w = ds.writable.getWriter(); w.write(bytes); w.close(); return new Uint8Array(await new Response(ds.readable).arrayBuffer()); }
function rmA85(s) { s = s.replace(/\s/g, ""); if (s.startsWith("<~")) s = s.slice(2); const e = s.indexOf("~>"); if (e >= 0) s = s.slice(0, e); const out = []; let g = [];
  for (const ch of s) { if (ch === "z" && !g.length) { out.push(0, 0, 0, 0); continue; } g.push(ch.charCodeAt(0) - 33); if (g.length === 5) { let v = 0; for (const d of g) v = v * 85 + d; out.push((v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255); g = []; } }
  if (g.length > 1) { const k = g.length; while (g.length < 5) g.push(84); let v = 0; for (const d of g) v = v * 85 + d; out.push(...[(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255].slice(0, k - 1)); } return Uint8Array.from(out); }
// a PDF reader: objects, flate streams, the ToUnicode map of each font, then the strings of the text operators
async function rmPdfText(buf) {
  const u8 = new Uint8Array(buf), lat = { decode: u => { let r = ""; for (let i = 0; i < u.length; i += 8192) r += String.fromCharCode.apply(null, u.subarray(i, i + 8192)); return r; } } /* byte for byte: TextDecoder("latin1") is really windows-1252 and would change bytes 0x80-0x9F */, s = lat.decode(u8), objs = {}, re = /(\d+) 0 obj([\s\S]*?)endobj/g; let m;
  while ((m = re.exec(s))) { const body = m[2], si = body.indexOf("stream"); let data = null; if (si >= 0) { let a = si + 6; if (body[a] === "\r") a++; if (body[a] === "\n") a++; const e = body.lastIndexOf("endstream"), raw = Uint8Array.from(body.slice(a, e), c => c.charCodeAt(0)); const dd = body.slice(0, si), lm = /\/Length\s+(\d+)(?!\s+\d+\s+R)/.exec(dd); let b2 = lm && +lm[1] <= raw.length ? raw.subarray(0, +lm[1]) : raw; /* the stated length, or the end-of-line before "endstream" would break the inflate */ if (/ASCII85Decode/.test(dd)) b2 = rmA85(lat.decode(raw)); data = /FlateDecode/.test(dd) ? await rmInflateZ(b2).catch(() => null) : b2; } objs[m[1]] = { dict: si >= 0 ? body.slice(0, si) : body, data }; }
  if (/\/Encrypt\b/.test(s)) throw new Error("encrypted");
  const cmaps = {}, parseCmap = txt => { const map = {}; let len = 1; const cs = /begincodespacerange\s*<([0-9A-Fa-f]+)>/.exec(txt); if (cs) len = cs[1].length / 2; const hex = h => { let o = ""; for (let i = 0; i < h.length; i += 4) o += String.fromCharCode(parseInt(h.slice(i, i + 4), 16)); return o; };
    (txt.match(/beginbfchar[\s\S]*?endbfchar/g) || []).forEach(b => b.replace(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g, (x, a, c) => { map[parseInt(a, 16)] = hex(c); }));
    (txt.match(/beginbfrange[\s\S]*?endbfrange/g) || []).forEach(b => b.replace(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*(<[0-9A-Fa-f]+>|\[[^\]]*\])/g, (x, a, c, d) => { const lo = parseInt(a, 16), hi = parseInt(c, 16); if (d[0] === "<") { const base = d.slice(1, -1); for (let i = lo; i <= hi; i++) { const h = (parseInt(base, 16) + (i - lo)).toString(16).padStart(base.length, "0"); map[i] = hex(h); } } else { const l = d.match(/<([0-9A-Fa-f]+)>/g) || []; l.forEach((t, i) => (map[lo + i] = hex(t.slice(1, -1)))); } }));
    return { map, len }; };
  Object.keys(objs).forEach(k => { const o = objs[k]; if (o.data && /beginbfchar|beginbfrange/.test(lat.decode(o.data))) cmaps[k] = parseCmap(lat.decode(o.data)); });
  const fontMap = {}; // the name of a font in a page -> its ToUnicode
  Object.values(objs).forEach(o => { if (o.data) return; o.dict.replace(/\/([^\s\/<>\[\]()]+)\s+(\d+)\s+0\s+R/g, (x, n, id) => { const fo = objs[id]; if (!fo || !/\/Type\s*\/Font\b/.test(fo.dict) || /\/FontDescriptor\s*$/.test(fo.dict)) return x; const tu = /\/ToUnicode\s+(\d+)\s+0\s+R/.exec(fo.dict); fontMap[n] = tu && cmaps[tu[1]] ? cmaps[tu[1]] : fontMap[n] || null; return x; }); });
  const unesc = x => x.replace(/\\([nrtbf()\\]|[0-7]{1,3})/g, (a, c) => ({ n: "\n", r: "\r", t: "\t", b: "\b", f: "\f", "(": "(", ")": ")", "\\": "\\" }[c] || String.fromCharCode(parseInt(c, 8))));
  let text = "";
  for (const o of Object.values(objs)) { if (!o.data || /\/Type\s*\/(XObject|Font|FontDescriptor)|\/Length1|\/Subtype\s*\/(Image|CIDFontType)/.test(o.dict) || /beginbfchar|beginbfrange/.test(lat.decode(o.data))) continue; const c = lat.decode(o.data); if (!/BT[\s\S]*ET/.test(c)) continue; let cm = null;
    c.replace(/\/([^\s\/<>\[\]()]+)\s+[\d.]+\s+Tf|\[((?:[^\]\\]|\\.)*)\]\s*TJ|<([0-9A-Fa-f\s]*)>\s*Tj|\(((?:[^()\\]|\\.)*)\)\s*Tj|\b(T\*|Td|TD|ET)\b|(\bBT\b)/g, (x, fn, arr, hx, lit, op) => {
      if (fn) { cm = fontMap[fn] || null; return x; }
      const dec = (hex, litTxt) => { if (hex != null) { const h = hex.replace(/\s/g, ""), n = cm ? cm.len * 2 : 2; let r = ""; for (let i = 0; i + n <= h.length; i += n) { const code = parseInt(h.slice(i, i + n), 16); r += cm && cm.map[code] != null ? cm.map[code] : String.fromCharCode(code); } return r; } const b = unesc(litTxt); if (!cm) return b; let r = ""; for (const ch of b) { const code = ch.charCodeAt(0); r += cm.map[code] != null ? cm.map[code] : ch; } return r; };
      if (arr != null) arr.replace(/<([0-9A-Fa-f\s]*)>|\(((?:[^()\\]|\\.)*)\)|(-?\d+(?:\.\d+)?)/g, (y, h2, l2, num) => { if (h2 != null) text += dec(h2); else if (l2 != null) text += dec(null, l2); else if (num != null && +num < -200) text += " "; return y; });
      else if (hx != null) text += dec(hx); else if (lit != null) text += dec(null, lit); else if (op) text += "\n"; return x; }); text += "\n"; }
  return text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}
const rmPngText = u8 => { const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength), dec = new TextDecoder("utf-8"); let p = 8, out = []; while (p + 8 <= u8.length) { const len = dv.getUint32(p), ty = dec.decode(u8.subarray(p + 4, p + 8)), d = u8.subarray(p + 8, p + 8 + len); if (ty === "iTXt") { let i = 0; while (d[i] !== 0) i++; i++; const comp = d[i]; i += 2; while (d[i] !== 0) i++; i++; while (d[i] !== 0) i++; i++; if (!comp) out.push(dec.decode(d.subarray(i))); } else if (ty === "tEXt") { let i = 0; while (d[i] !== 0) i++; out.push(dec.decode(d.subarray(i + 1))); } p += 12 + len; if (ty === "IEND") break; } return out.join("\n"); };
// the reader: -> { text, by: "real" | "sim" | "none", how, note }
async function rmRead(f) {
  const n = f.name || "", ext = (/\.([a-z0-9]+)$/i.exec(n) || [, ""])[1].toLowerCase(), cut = t => String(t || "").slice(0, AI_TEXT_MAX);
  try {
    if (["txt", "md", "csv", "json", "xml", "log"].includes(ext)) return { text: cut(await f.text()), by: "real", how: ext.toUpperCase() };
    if (["html", "htm"].includes(ext)) return { text: cut((await f.text()).replace(/<(script|style)[\s\S]*?<\/\1>/gi, "").replace(/<\/(p|div|h\d|li|tr)>/gi, "\n").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ")), by: "real", how: "HTML" };
    if (ext === "rtf") return { text: cut((await f.text()).replace(/\\u(-?\d+)\??/g, (m, d) => String.fromCharCode(d < 0 ? +d + 65536 : +d)).replace(/\\'[0-9a-f]{2}/gi, "").replace(/\\[a-z]+-?\d* ?|[{}]/gi, "")), by: "real", how: "RTF" };
    if (ext === "docx") return { text: cut(rmUnxml((await rmZip(await f.arrayBuffer(), /^word\/document\.xml$/))[0][1])), by: "real", how: "Word (docx)" };
    if (ext === "xlsx") { const t = (await xlsxRead(await f.arrayBuffer())).map(r => r.filter(c => c !== "" && c != null).join(" | ")).filter(Boolean).join("\n"); return { text: cut(t), by: "real", how: "Excel (xlsx)" }; }
    if (ext === "pptx") { const sl = (await rmZip(await f.arrayBuffer(), /^ppt\/slides\/slide\d+\.xml$/)).sort((a, b) => a[0].localeCompare(b[0], "en", { numeric: true })); return { text: cut(sl.map(x => rmUnxml(x[1])).join("\n")), by: "real", how: "PowerPoint (pptx)" }; }
    if (ext === "pdf") { const t = await rmPdfText(await f.arrayBuffer()); return t.length > 20 ? { text: cut(t), by: "real", how: "PDF" } : { text: "", by: "none", how: "PDF", note: L("PDF นี้ไม่มีข้อความให้อ่าน (น่าจะเป็นภาพสแกน) ต้องใช้ OCR จริง", "This PDF has no text (probably a scan): a real OCR is needed") }; }
    if (["png"].includes(ext)) { const t = rmPngText(new Uint8Array(await f.arrayBuffer())); return t.trim() ? { text: cut(t), by: "sim", how: L("รูปภาพ (OCR จำลอง)", "Image (simulated OCR)"), note: L("อ่านจากข้อความที่ฝังในไฟล์รูปตัวอย่าง ไม่ได้ OCR จริง", "Read from the text kept inside the sample picture; no real OCR") } : { text: "", by: "none", how: L("รูปภาพ", "Image"), note: L("รูปไม่มีข้อความฝัง ต้องใช้ OCR จริงหรือคีย์ข้อมูลเอง", "No text inside the picture: use a real OCR or key it in") }; }
    if (["jpg", "jpeg", "gif", "bmp", "webp", "tif", "tiff"].includes(ext)) return { text: "", by: "none", how: L("รูปภาพ", "Image"), note: L("ต้นแบบนี้อ่านข้อความในรูปไม่ได้ ต้องใช้ OCR จริงหรือคีย์ข้อมูลเอง", "This prototype can't read text in a picture: use a real OCR or key it in") };
  } catch (e) { return { text: "", by: "none", how: ext.toUpperCase(), note: L("อ่านไฟล์ไม่สำเร็จ: ", "Could not read: ") + (e && e.message ? e.message : e) }; }
  return { text: "", by: "none", how: ext ? ext.toUpperCase() : "?", note: L("ไม่รู้จักรูปแบบไฟล์นี้", "A file type this reader does not know") };
}
// the kind of document, from its name and its text
const rmDocKind = (name, text) => { rmSyncDocs(); const hay = name + "\n" + String(text || "").slice(0, 1500); const hit = RM_DOCS.filter(d => d[2].test(hay)); if (!hit.length) return "other"; const nameHit = hit.find(d => d[2].test(name)); return (nameHit || (hit.find(d => d[0] !== "proposal") || hit[0]))[0]; };
// ---------- what is found in the text ----------
const rmNum = s => { const x = String(s == null ? "" : s).replace(/[,\s]/g, ""); if (x === "") return null; const n = Number(x); return isNaN(n) ? null : n; }; // an empty text is no number (not 0)
const rmGet = (t, re) => { const m = re.exec(t); return m ? m[1].trim() : ""; };
function rmFindIn(files) { // -> fields with the file each came from
  const F = {}, put = (k, v, f) => { if (v !== "" && v != null && !F[k]) F[k] = { v, f }; };
  files.forEach(f => { const t = f.text || ""; if (!t) return;
    put("name", rmGet(t, /ชื่อโครงการ\s*[:：]\s*([^\n|]+)/) || rmGet(t, /ชื่องาน\s*[:：]\s*([^\n|]+)/), f.name);
    put("agency", rmGet(t, /หน่วยงานเจ้าของโครงการ\s*[:：]\s*([^\n|]+)/), f.name);
    put("btype", rmGet(t, /ประเภทคำขอ\s*[:：]\s*([^\n|]+)/), f.name);
    put("startFy", rmNum(rmGet(t, /ปีงบประมาณที่เริ่มดำเนินการ\s*[:：]\s*(\d{4})/)), f.name);
    put("endFy", rmNum(rmGet(t, /ปีงบประมาณที่สิ้นสุด\s*[:：]\s*(\d{4})/)), f.name);
    if (f.kind === "proposal" || !F.amount) put("amount", rmNum(rmGet(t, /วงเงินรวม\s*[:：]\s*([\d,\.]+)/)), f.name);
    put("area", rmGet(t, /พื้นที่ดำเนินการ\s*[:：]\s*([^\n|]+)/), f.name);
    put("objective", rmGet(t, /วัตถุประสงค์\s*[:：]\s*([^\n|]+)/), f.name);
    put("reason", rmGet(t, /หลักการและเหตุผล\s*[:：]\s*([^\n|]+)/), f.name);
    put("kpi", rmGet(t, /ตัวชี้วัด\s*[:：]\s*([^\n|]+)/), f.name);
    put("contact", rmGet(t, /ผู้ประสานงาน\s*[:：]\s*([^\n|]+)/), f.name);
    put("duration", rmGet(t, /ระยะเวลาดำเนินงาน\s*[:：]\s*([^\n|]+)/), f.name);
    if (!F.yearly) { const ys = [...t.matchAll(/ปี\s*(25\d\d)\s*[:：]\s*([\d,\.]+)\s*บาท/g)].map(m => [+m[1], rmNum(m[2])]); if (ys.length) F.yearly = { v: ys, f: f.name }; } });
  return F;
}
const rmQuotes = files => files.filter(f => f.kind === "quote" && f.text).map(f => { const t = f.text; return { file: f.name, vendor: rmGet(t, /ผู้เสนอราคา\s*(?:[:：]|\|)\s*([^\n|]+)/), total: rmNum(rmGet(t, /รวมเป็นเงินทั้งสิ้น\s*(?:[:：]|\|)?\s*(?:\|\s*)*([\d,\.]+)/)) || rmNum((/รวมเป็นเงินทั้งสิ้น[^\d]*([\d,\.]+)/.exec(t) || [])[1]), unit: rmNum(rmGet(t, /ราคาต่อหน่วย\s*([\d,\.]+)/)) }; });
const rmItems = files => { const out = []; files.forEach(f => { if (!f.text || !["proposal", "other", "tor"].includes(f.kind)) return; const lines = f.text.split("\n"); lines.forEach(l => { const c = l.split(/\s*[|,]\s*/); if (c.length >= 5 && rmNum(c[1]) != null && rmNum(c[3]) != null && rmNum(c[4]) != null && /[ก-๙A-Za-z]/.test(c[0])) out.push({ name: c[0], qty: rmNum(c[1]), unitName: c[2], price: rmNum(c[3]), sum: rmNum(c[4]), file: f.name }); }); }); return out; };
const rmBoqTotal = files => { for (const f of files) if (f.kind === "boq" && f.text) { const m = /รวมเป็นเงินทั้งสิ้น[^\d]*([\d,\.]+)/.exec(f.text); if (m) return { v: rmNum(m[1]), f: f.name }; } return null; };
const rmRefTotal = files => { for (const f of files) if (f.kind === "refprice" && f.text) { const m = /ราคากลาง[^\n:：]*[:：]\s*([\d,\.]+)\s*บาท/.exec(f.text); if (m) return { v: rmNum(m[1]), f: f.name }; } return null; };
const rmKindOf = (c, F) => { if (RM_KIND[c.kind]) return c.kind; const hay = [F.name && F.name.v, F.btype && F.btype.v, c.files.map(f => f.name).join(" ")].join(" "); if (/ก่อสร้าง|สิ่งก่อสร้าง|อาคาร/.test(hay)) return "construction"; if (/ครุภัณฑ์|จัดซื้อ|คอมพิวเตอร์/.test(hay)) return "durable"; return "other"; };
