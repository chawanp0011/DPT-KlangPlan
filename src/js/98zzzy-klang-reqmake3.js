// KlangFinance, round P50 (23 Nov 2569): "เตรียมคำของบประมาณ" made easier to use.
// 1. When Planning processes the documents, the request is also matched to the budget structure of the year (แผนงาน / ผลผลิต-โครงการ /
//    กิจกรรม): each activity is scored by how much of its names, and those of its output and programme, appear in the documents. Planning
//    can pick another candidate. The match is a text similarity, not a language model.
// 2. The overview has no import bar any more (it confused people); new cases start from the button "+ ...".
// 3. A case opens as a form ready to edit (no drop-down of cases): Save, Send to Planning, Cancel. "Start preparing" is gone: a division
//    saves a draft or sends at once; sending needs at least one attached file and nothing else. Planning sees the case only once it is sent.
// 4. The tab "AI ประมวลผลและตรวจ" is now "ตรวจสอบเอกสาร" and shows only after Planning has processed the case (edited in 98zzzs).
// 5. When Planning sends the case back to the division, the division has Save and Send to Planning.
// 6. Each attached file can be previewed and downloaded, by its kind: a picture, a PDF, a web page, text; Word, Excel and PowerPoint show
//    the text that was read. The file itself is kept only while the page is open; after a reload the preview and the download use the text read.
const RM_BLOB = {}; // `${case}|${file}` -> File, for this session
{ const base = rmAddFiles; rmAddFiles = async function (id, list, opt) { const c0 = rmCase(id), before = c0 ? c0.files.length : 0, n = await base(id, list, opt); const c = rmCase(id); if (c && n > 0) c.files.slice(before).forEach((f, i) => { if (list[i]) RM_BLOB[`${id}|${f.id}`] = list[i]; }); return n; }; }

// ---------- 1. the match to the budget structure ----------
const rmBig = s => { const t = String(s || "").replace(/\s+/g, ""), out = new Set(); for (let i = 0; i < t.length - 1; i++) out.add(t.slice(i, i + 2)); return out; };
const rmHit = (name, hay) => { const b = rmBig(name); if (!b.size) return 0; let n = 0; b.forEach(x => { if (hay.has(x)) n++; }); return n / b.size; };
function rmMap(c) {
  const st = (S.structure && S.structure[c.fy]) || [], byId = id => st.find(x => x.id === id), F = (c.ai && c.ai.F) || {};
  const text = [c.title, ...Object.values(F).map(x => (x && typeof x.v === "string" ? x.v : "")), ...c.files.map(f => f.name + " " + String(f.text || "").slice(0, 4000))].join(" "), hay = rmBig(text);
  const acts = st.filter(x => x.lvl === "activity");
  return acts.map(a => { const o = a.parent && byId(a.parent), p = o && o.lvl === "program" ? o : o && byId(o.parent), out = o && o.lvl === "output" ? o : null;
    const sa = rmHit(tx(a.name), hay), so = out ? rmHit(tx(out.name), hay) : sa, sp = p ? rmHit(tx(p.name), hay) : 0, score = Math.round((0.55 * sa + 0.25 * so + 0.2 * sp) * 100);
    return { act: a.id, out: out ? out.id : "", prog: p ? p.id : "", score, why: [Math.round(sa * 100), Math.round(so * 100), Math.round(sp * 100)] }; })
    .sort((x, y) => y.score - x.score).slice(0, 3);
}
{ const base = rmProcess; rmProcess = function (id) { const m = base(id); if (m) return m; const c = rmCase(id); c.ai.map = rmMap(c); c.ai.mapSel = c.ai.map.length ? c.ai.map[0].act : ""; rmLog(c, "จับคู่แผนงาน/ผลผลิต/กิจกรรม", c.ai.map[0] ? `${c.ai.map[0].score}%` : "ไม่พบ"); return ""; }; }
function rmMapPick(id, act) { const c = rmCase(id); if (!c || !c.ai) return "ยังไม่ได้ประมวลผล"; if (ROLE !== "plan") return "เฉพาะกองแผนงานเลือก"; if (c.status === "ready") return "พร้อมส่งแล้ว"; const st = (S.structure && S.structure[c.fy]) || []; if (!st.some(x => x.id === act && x.lvl === "activity")) return "ไม่มีกิจกรรมนี้"; c.ai.mapSel = act; c.ai.mapBy = "plan"; rmLog(c, "กองแผนงานเลือกกิจกรรม", act); return ""; }
function rmMapPanel(c) {
  const a = c.ai; if (!a) return ""; const st = (S.structure && S.structure[c.fy]) || [], byId = id => st.find(x => x.id === id), nm = id => { const x = byId(id); return x ? `<span class="mono sub">${esc(x.code)}</span> ${esc(tx(x.name))}` : "–"; };
  const M = a.map || rmMap(c), sel = a.mapSel || (M[0] && M[0].act) || "", ed = ROLE === "plan" && c.status !== "ready", chain = id => { const x = byId(id), o = x && byId(x.parent), p = o && (o.lvl === "program" ? o : byId(o.parent)); return [p, o && o.lvl === "output" ? o : null, x]; };
  const [sp, so, sa] = chain(sel);
  return `<section class="panel rm-map"><header><h2>จับคู่แผนงาน / ผลผลิต-โครงการ / กิจกรรม</h2><span class="sp"></span>${M[0] ? tag(`ใกล้เคียง ${(M.find(x => x.act === sel) || M[0]).score}%`, (M.find(x => x.act === sel) || M[0]).score >= 40 ? "p-ok" : "p-warn") : tag("ไม่พบ", "p-warn")}</header><div class="body" style="display:flex;flex-direction:column;gap:8px">
    ${kv([["แผนงาน", sp ? nm(sp.id) : "–"], ["ผลผลิต / โครงการ", so ? nm(so.id) : "<span class=\"sub\">(แผนงานนี้ไม่มีระดับผลผลิต)</span>"], ["กิจกรรม", sa ? nm(sa.id) : "–"]])}
    ${M.length ? `<div class="tbl-wrap"><table><thead><tr><th>ตัวเลือกที่ใกล้เคียง</th><th class="n">คะแนน</th><th class="sub">กิจกรรม / ผลผลิต / แผนงาน (%)</th><th></th></tr></thead><tbody>${M.map(m => `<tr><td>${nm(m.act)}<div class="sub">${m.prog ? esc(tx(byId(m.prog).name)) : ""}${m.out ? " · " + esc(tx(byId(m.out).name)) : ""}</div></td><td class="n"><b>${m.score}%</b></td><td class="sub">${m.why.join(" / ")}</td><td>${m.act === sel ? tag("เลือก", "p-info") : ed ? `<button class="btn ghost" type="button" data-rmmap="${esc(m.act)}">เลือกอันนี้</button>` : ""}</td></tr>`).join("")}</tbody></table></div>` : ""}
    ${ed ? `<div class="row" style="gap:6px;align-items:center"><label class="sub" for="rm-mapall">หรือเลือกกิจกรรมเอง</label><select id="rm-mapall"><option value="">—</option>${st.filter(x => x.lvl === "activity").map(x => `<option value="${esc(x.id)}" ${x.id === sel ? "selected" : ""}>${esc(x.code)} ${esc(tx(x.name))}</option>`).join("")}</select></div>` : ""}
    <div class="sub">คะแนนคือสัดส่วนของชื่อกิจกรรม ผลผลิต และแผนงานที่พบในเอกสาร (เทียบข้อความ ไม่ใช่โมเดลภาษา) ตรวจและเลือกให้ถูกก่อนส่ง สงป.</div></div></section>`;
}
{ const base = RM_VIEW.ai; RM_VIEW.ai = () => { const h = base(), c = rmCur(); if (!c || !c.ai) return h; const mk = "<section class=\"panel\"><header><h2>" + L("ช่องคำขอที่ระบบใส่ให้", "Fields filled by the system"); return h.includes(mk) ? h.replace(mk, () => rmMapPanel(c) + mk) : h + rmMapPanel(c); }; }

// ---------- 2. the overview without the import bar ----------
{ const base = RM_VIEW.ov; RM_VIEW.ov = () => base().split(rmSampleBar()).join(""); }

// ---------- 3, 5, 6. the case as a form ----------
const rmCanEdit = c => !!c && ((rmSender(c) && c.status === "draft") || (rmOwn(c) && c.status === "forwarded"));
function rmSave(id, v) { const c = rmCase(id); if (!c) return "ไม่พบเรื่อง"; if (!rmCanEdit(c) && !(ROLE === "plan" && !["ready"].includes(c.status))) return "แก้ไม่ได้ในสถานะหรือบทบาทนี้";
  if (v.kind && !RM_KIND[v.kind]) return "ประเภทไม่ถูกต้อง"; if ("title" in v) c.title = String(v.title || "").trim(); if ("kind" in v) c.kind = v.kind || ""; if ("note" in v) c.note = String(v.note || "").trim();
  if ("reply" in v && c.fw) c.fw.draft = String(v.reply || "").trim(); rmLog(c, "บันทึก"); return ""; }
function rmSend(id) { const c = rmCase(id); if (!c) return "ไม่พบเรื่อง"; if (!c.files.length) return "แนบเอกสารอย่างน้อย 1 ไฟล์ก่อนส่งกองแผนงาน";
  if (c.status === "draft") return rmSubmit(id); if (c.status === "forwarded") return rmReturn(id, (c.fw && c.fw.draft) || "แก้ไขและแนบเอกสารเพิ่มแล้ว"); return "เรื่องนี้ส่งไปแล้ว"; }
function rmFileView(c) {
  const can = rmCanAttach(c);
  return `<section class="panel"><header><h2>เอกสารที่แนบ (${c.files.length})</h2><span class="sp"></span>${can ? `<label class="btn primary" for="rm-files" style="cursor:pointer">+ เลือกไฟล์</label><input type="file" id="rm-files" multiple style="display:none">` : ""}</header>
    ${can ? `<div class="body"><div id="rm-drop" style="border:2px dashed var(--line);border-radius:12px;padding:18px;text-align:center" class="sub">ลากไฟล์มาวางที่นี่ หรือกดเลือกไฟล์ (pdf, Word, Excel, PowerPoint, รูปภาพ, txt, csv, html และอื่น ๆ)</div></div>` : ""}
    <div class="tbl-wrap"><table class="rm-files"><thead><tr><th>ไฟล์</th><th>ชนิดเอกสารที่พบ</th><th>การอ่าน</th><th>ใช้ในเงื่อนไข</th><th class="n">ขนาด</th><th>แนบโดย</th><th></th></tr></thead><tbody>${c.files.map(f => { const used = c.ai ? c.ai.checks.filter(x => x.files.includes(f.name)).map(x => x.code) : []; return `<tr><td><b style="font-weight:600">${esc(f.name)}</b>${f.note ? `<div class="sub">${esc(f.note)}</div>` : ""}${f.forCond ? `<div class="sub">แนบเข้าเงื่อนไข ${esc((rmConds().find(x => x.id === f.forCond) || {}).code || f.forCond)}</div>` : ""}</td><td>${f.kind === "other" ? `<span class="sub">ไม่ทราบชนิด</span>` : esc(rmDocName(f.kind))}</td><td>${rmReadTag(f)}</td><td class="sub">${used.length ? used.map(u => `<span class="rm-chip">${esc(u)}</span>`).join("") : "–"}</td><td class="n">${fmt(Math.round((f.size || 0) / 1024))} KB</td><td class="sub">${f.from === "unit" ? "หน่วยงาน" : "กองแผนงาน"}</td>
      <td style="white-space:nowrap"><button class="btn ghost" type="button" data-rmpv="${esc(f.id)}">ดูตัวอย่าง</button><button class="btn ghost" type="button" data-rmdl="${esc(f.id)}">ดาวน์โหลด</button>${can && (ROLE === "plan" || f.from === "unit") ? `<button class="btn ghost" type="button" data-rmdel="${esc(f.id)}">ลบ</button>` : ""}</td></tr>`; }).join("") || `<tr><td colspan="7" class="sub">ยังไม่มีไฟล์</td></tr>`}</tbody></table></div></section>`;
}
function rmEditView(c) {
  const ed = rmCanEdit(c), back = `<div class="row" style="margin:0 0 10px;gap:8px"><button class="btn ghost" type="button" data-rm2back>← รายการเรื่อง</button>${ROLE === "plan" || ROLE === "div" ? `<span style="flex:1"></span><button class="btn" type="button" data-rmnew>+ เรื่องใหม่</button>` : ""}</div>`, fw = c.status === "forwarded";
  const items = fw && c.fw ? c.fw.items || [] : [];
  return `${back}<section class="panel"><header><h2>${esc(c.id)} · ${esc(rmTitle(c))}</h2><span class="sp"></span>${rmStag(c.status)} ${ROLE === "plan" && c.status === "submitted" ? `<button class="btn primary" type="button" data-rmrecv="${esc(c.id)}">รับเรื่อง</button>` : ""}${ROLE === "plan" && ["received", "processed", "returned"].includes(c.status) ? `<button class="btn primary" type="button" id="rm-run" ${c.files.length ? "" : "disabled"}>${c.ai ? "ประมวลผลและตรวจสอบเอกสารใหม่" : "ประมวลผลและตรวจสอบเอกสาร"}</button>` : ""}</header>
    <div class="body" style="display:flex;flex-direction:column;gap:10px">
      ${fw && c.fw ? `<div style="border-left:4px solid var(--warn);padding:6px 10px"><b>กองแผนงานส่งกลับให้แก้ไข (รอบที่ ${c.fw.round})</b>${c.fw.note ? `<div>${esc(c.fw.note)}</div>` : ""}${items.length ? `<ul class="plain" style="margin:4px 0 0">${items.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}</div>` : ""}
      <form id="rm2-form" class="inline-form" style="display:flex;flex-wrap:wrap;gap:10px">
        <div class="f" style="flex:2 1 300px"><label for="rm2-title">ชื่อเรื่อง (ไม่ใส่ก็ได้)</label><input type="text" id="rm2-title" value="${esc(c.title || "")}" ${ed && !fw ? "" : "disabled"}></div>
        <div class="f"><label for="rm2-kind">ประเภท</label><select id="rm2-kind" ${ed && !fw ? "" : "disabled"}><option value="">— ให้ระบบดูจากเอกสาร —</option>${Object.keys(RM_KIND).map(k => `<option value="${k}" ${c.kind === k ? "selected" : ""}>${esc(tx(RM_KIND[k]))}</option>`).join("")}</select></div>
        <div class="f" style="flex:1 1 100%"><label for="rm2-note">หมายเหตุ</label><input type="text" id="rm2-note" value="${esc(c.note || "")}" ${ed && !fw ? "" : "disabled"}></div>
        ${fw ? `<div class="f" style="flex:1 1 100%"><label for="rm2-reply">สิ่งที่แก้ไข / คำชี้แจงถึงกองแผนงาน</label><input type="text" id="rm2-reply" value="${esc((c.fw && c.fw.draft) || "")}" ${ed ? "" : "disabled"}></div>` : ""}
        <div class="sub" style="flex:1 1 100%">ที่มา: ${esc(rmFrom(c))} · หน่วยงานเจ้าของเรื่อง: ${esc(unitName(c.owner))}${c.submittedAt ? ` · ส่งกองแผนงานเมื่อ ${esc(c.submittedAt)}` : ""}</div>
      </form>
      ${ed ? `<div class="row" style="gap:8px"><button class="btn" type="button" id="rm2-save">บันทึก</button><button class="btn primary" type="button" id="rm2-send" ${c.files.length ? "" : "disabled"} title="${c.files.length ? "" : "ต้องแนบเอกสารก่อน"}">ส่งกองแผนงาน</button><button class="btn ghost" type="button" data-rm2back>ยกเลิก</button>${c.files.length ? "" : `<span class="sub">ต้องแนบเอกสารอย่างน้อย 1 ไฟล์จึงจะส่งได้</span>`}</div>` : ""}
      ${c.status === "submitted" && ROLE !== "plan" ? `<div class="sub">ส่งให้กองแผนงานแล้ว รอกองแผนงานรับเรื่อง</div>` : ""}</div></section>${rmFileView(c)}`;
}
function rmNewDiv() { // a division starts a case: the same form, Save / Send / Cancel, with the files picked here
  return `<div class="row" style="margin:0 0 10px"><button class="btn ghost" type="button" data-rm2back>← รายการเรื่อง</button></div><section class="panel"><header><h2>เรื่องใหม่ของ ${esc(unitName(me().unit))}</h2></header><div class="body" style="display:flex;flex-direction:column;gap:10px">
    <form id="rm2-form" class="inline-form" style="display:flex;flex-wrap:wrap;gap:10px"><div class="f" style="flex:2 1 300px"><label for="rm2-title">ชื่อเรื่อง (ไม่ใส่ก็ได้)</label><input type="text" id="rm2-title"></div><div class="f"><label for="rm2-kind">ประเภท</label><select id="rm2-kind"><option value="">— ให้ระบบดูจากเอกสาร —</option>${Object.keys(RM_KIND).map(k => `<option value="${k}">${esc(tx(RM_KIND[k]))}</option>`).join("")}</select></div><div class="f" style="flex:1 1 100%"><label for="rm2-note">หมายเหตุ</label><input type="text" id="rm2-note"></div></form>
    <div id="rm2-drop" style="border:2px dashed var(--line);border-radius:12px;padding:14px 16px"><div class="row" style="gap:10px;align-items:center;flex-wrap:wrap"><label class="btn" for="rm2-files" style="cursor:pointer">+ แนบเอกสาร</label><input type="file" id="rm2-files" multiple style="display:none"><span class="sub">เลือกไฟล์หรือลากมาวาง ต้องมีอย่างน้อย 1 ไฟล์จึงจะส่งกองแผนงานได้</span></div><div id="rm2-list" class="sub" style="margin-top:6px"></div></div>
    <div class="row" style="gap:8px"><button class="btn" type="button" id="rm2-nsave">บันทึก</button><button class="btn primary" type="button" id="rm2-nsend">ส่งกองแผนงาน</button><button class="btn ghost" type="button" data-rm2back>ยกเลิก</button></div></div></section>${rmSampleBar()}`;
}
{ const base = RM_VIEW.in; RM_VIEW.in = () => { const c = rmCur(); if (RM.nw) return ROLE === "div" ? rmNewDiv() : base(); if (!c) return base(); return rmEditView(c); }; }

// ---------- 6. preview and download ----------
const rmExt = n => (String(n).match(/\.([a-z0-9]+)$/i) || ["", ""])[1].toLowerCase();
function rmPreview(c, f) {
  const b = RM_BLOB[`${c.id}|${f.id}`], ext = rmExt(f.name), url = b ? URL.createObjectURL(b) : "", txt = esc(f.text || "(อ่านข้อความไม่ได้)");
  let body;
  if (b && ["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"].includes(ext)) body = `<img src="${url}" alt="${esc(f.name)}" style="max-width:100%;max-height:70vh;display:block;margin:auto">`;
  else if (b && ext === "pdf") body = `<iframe src="${url}" title="${esc(f.name)}" style="width:100%;height:70vh;border:0"></iframe>`;
  else if (["html", "htm"].includes(ext) && (b || f.text)) body = `<iframe class="rm-pvhtml" title="${esc(f.name)}" sandbox="" style="width:100%;height:70vh;border:1px solid var(--line);background:#fff"></iframe>`;
  else if (ext === "csv" && f.text) body = `<div class="tbl-wrap" style="max-height:70vh"><table>${f.text.split(/\r?\n/).filter(Boolean).slice(0, 300).map((r, i) => `<tr>${r.split(",").map(x => i ? `<td>${esc(x)}</td>` : `<th>${esc(x)}</th>`).join("")}</tr>`).join("")}</table></div>`;
  else body = `${["docx", "doc", "xlsx", "xls", "pptx", "ppt", "pdf", "png", "jpg", "jpeg"].includes(ext) ? `<div class="sub" style="margin-bottom:6px">${b ? "แสดงข้อความที่ระบบอ่านได้จากไฟล์ (เปิดไฟล์ต้นฉบับด้วยปุ่มดาวน์โหลด)" : "ไฟล์ต้นฉบับไม่ได้เก็บไว้หลังโหลดหน้าใหม่: แสดงข้อความที่อ่านได้"}</div>` : ""}<pre style="white-space:pre-wrap;max-height:70vh;overflow:auto;margin:0;background:var(--bg-2,#f6f7f9);padding:10px;border-radius:8px">${txt}</pre>`;
  const box = document.createElement("div"); box.className = "rm-back"; box.id = "rm-pv"; box.innerHTML = `<div class="rm-box" style="width:min(1000px,100%)" role="dialog" aria-label="${esc(f.name)}"><header><h2>${esc(f.name)}</h2><span class="sub">${esc(rmDocName(f.kind) || "")}</span><span style="flex:1"></span><button class="btn primary" type="button" data-rmdl="${esc(f.id)}">ดาวน์โหลด</button><button class="btn ghost" type="button" data-rmpvx>ปิด</button></header><div class="rm-body">${body}</div></div>`;
  document.body.appendChild(box); const h = box.querySelector(".rm-pvhtml"); if (h) { if (b) b.text().then(t => (h.srcdoc = t)); else h.srcdoc = `<pre>${txt}</pre>`; }
  box.addEventListener("click", e => { if (e.target === box || e.target.closest("[data-rmpvx]")) { if (url) URL.revokeObjectURL(url); box.remove(); } });
}
function rmDownload(c, f) { const b = RM_BLOB[`${c.id}|${f.id}`] || new Blob([f.text || ""], { type: "text/plain;charset=utf-8" }), name = RM_BLOB[`${c.id}|${f.id}`] ? f.name : f.name.replace(/\.[^.]+$/, "") + " (ข้อความที่อ่านได้).txt", a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }

// ---------- handlers ----------
let RM2_PICK = [];
const rm2Show = () => { const l = document.getElementById("rm2-list"); if (l) l.innerHTML = RM2_PICK.length ? `<b>${RM2_PICK.length} ไฟล์:</b> ${RM2_PICK.map(x => `<span class="rm-chip">${esc(x.name)}</span>`).join("")}` : ""; };
const rm2Val = id => { const e = document.getElementById(id); return e ? e.value : ""; };
async function rm2New(send) { if (send && !RM2_PICK.length) { toast("แนบเอกสารอย่างน้อย 1 ไฟล์ก่อนส่งกองแผนงาน"); return; }
  const id = rmCreate({ title: rm2Val("rm2-title"), kind: rm2Val("rm2-kind"), note: rm2Val("rm2-note") }); if (!id.startsWith("RM-")) { toast(id); return; }
  if (RM2_PICK.length) await rmAddFiles(id, RM2_PICK); RM2_PICK = []; const m = send ? rmSend(id) : ""; commit(); RM.id = id; RM.nw = false; RM.tab = "in"; route(); toast(m || (send ? "ส่งกองแผนงานแล้ว" : "บันทึกแล้ว")); }
document.addEventListener("click", e => { const t = e.target; if (!t || !t.closest) return;
  if (t.closest("#rm-run")) { setTimeout(() => { const c = rmCur(); if (c && c.ai && !c.stale) { RM.tab = "ai"; route(); } }, 0); return; } // after processing, show the check
  if (t.closest("[data-rm2back]")) { RM.nw = false; RM.tab = "ov"; RM2_PICK = []; route(); return; }
  if (t.closest("#rm2-nsave")) { rm2New(false); return; } if (t.closest("#rm2-nsend")) { rm2New(true); return; }
  const c = typeof rmCur === "function" ? rmCur() : null;
  if (t.closest("#rm2-save") && c) { const v = { title: rm2Val("rm2-title"), kind: rm2Val("rm2-kind"), note: rm2Val("rm2-note") }; if (document.getElementById("rm2-reply")) v.reply = rm2Val("rm2-reply"); if (c.status === "forwarded") { delete v.title; delete v.kind; delete v.note; } const m = rmSave(c.id, v); if (m) { toast(m); return; } commit(); route(); toast("บันทึกแล้ว"); return; }
  if (t.closest("#rm2-send") && c) { if (c.status === "draft") rmSave(c.id, { title: rm2Val("rm2-title"), kind: rm2Val("rm2-kind"), note: rm2Val("rm2-note") }); else if (document.getElementById("rm2-reply")) rmSave(c.id, { reply: rm2Val("rm2-reply") }); const m = rmSend(c.id); if (m) { toast(m); return; } commit(); route(); toast("ส่งกองแผนงานแล้ว"); return; }
  const pv = t.closest("[data-rmpv]"); if (pv && c) { const f = c.files.find(x => x.id === pv.dataset.rmpv); if (f) rmPreview(c, f); return; }
  const dl = t.closest("[data-rmdl]"); if (dl && c) { const f = c.files.find(x => x.id === dl.dataset.rmdl); if (f) rmDownload(c, f); return; }
  const mp = t.closest("[data-rmmap]"); if (mp && c) { const m = rmMapPick(c.id, mp.dataset.rmmap); if (m) toast(m); else { commit(); route(); } } });
document.addEventListener("change", e => { const t = e.target; if (!t) return; if (t.id === "rm2-files") { RM2_PICK = [...RM2_PICK, ...t.files]; rm2Show(); } if (t.id === "rm-mapall" && t.value) { const c = rmCur(), m = c ? rmMapPick(c.id, t.value) : ""; if (m) toast(m); else { commit(); route(); } } });
document.addEventListener("dragover", e => { if (e.target.closest && e.target.closest("#rm2-drop")) e.preventDefault(); });
document.addEventListener("drop", e => { const d = e.target.closest && e.target.closest("#rm2-drop"); if (!d) return; e.preventDefault(); RM2_PICK = [...RM2_PICK, ...e.dataTransfer.files]; rm2Show(); });
