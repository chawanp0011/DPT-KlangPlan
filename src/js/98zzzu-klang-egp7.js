// KlangFinance, round P44 (21 Nov 2569): the panel "ส่ง e-GP" is redone as the seven steps the user gave. Its purpose: to record only
// WHICH STEP the project is at now, with the data and files of each step. It replaces the panel of 98zp (egpUpdatePanel); the old records
// (c.egpUp, c.egpItems) are kept and not read here. Data: c.egp7 = { stage: 1..7, multi, s1..s7 }.
// Checked against the department's files (the disbursement plan's 16 procurement states and the follow-up form's step columns): the steps
// below cover all of them; what the user's list did not name but the files hold is added and marked "(ตามไฟล์ติดตาม)":
// the reference price and its approval date, the round of the bidding, the letter to the Budget Bureau, the contract amount and period.
const EGP7 = [
  { n: 1, t: "ประกาศแผน", proc: [1], track: ["อนุมัติประกาศเผยแพร่แผนการจัดซื้อจัดจ้าง"] },
  { n: 2, t: "รายงานการขอซื้อขอจ้าง และคำสั่งแต่งตั้งคณะกรรมการ", proc: [2, 3, 4, 5], track: ["สำรวจ/ออกแบบ", "แบบแล้วเสร็จ", "ประมาณราคา", "จัดทำ TOR แล้วเสร็จ", "เห็นชอบราคากลาง", "รายงานขอซื้อขอจ้าง"] },
  { n: 3, t: "ประกาศเชิญชวน/หนังสือเชิญชวน", proc: [6, 7, 8], track: ["ประกาศร่าง TOR", "ประกาศขายแบบ/เชิญชวน", "เสนอราคา"] },
  { n: 4, t: "พิจารณาผล", proc: [9, 10], track: ["พิจารณาผล", "ส่ง สงป. พิจารณาความเหมาะสม", "สงป. พิจารณาความเหมาะสมแล้ว", "ขยายระยะเวลาก่อหนี้ผูกพัน"] },
  { n: 5, t: "อนุมัติจ้าง และประกาศผู้ชนะ", proc: [11, 12, 13], track: ["อนุมัติจ้าง", "ประกาศผู้ชนะ"] },
  { n: 6, t: "แจ้งลงนามสัญญา", proc: [14], track: ["เรียกลงนาม"] },
  { n: 7, t: "สถานะทำสัญญา (รอลงนาม / เสนอลงนาม / ลงนามแล้ว)", proc: [15], track: ["เสนอสัญญา", "ลงนามสัญญา"] },
];
const EGP7_METHOD = ["e-bidding", "e-market", "วิธีคัดเลือก", "วิธีเฉพาะเจาะจง"];
const EGP7_SIGN = { wait: "รอลงนาม", offer: "เสนอลงนาม", signed: "ลงนามแล้ว" };
// the fields of each step: [key, label, type, required, onlyWhen]
const EGP7_F = {
  s1: [["date", "วันประกาศแผน", "date", 1]],
  s2: [["reqDate", "หนังสือขอซื้อขอจ้าง ลงวันที่เห็นชอบ", "date", 1], ["projNo", "เลขที่โครงการ", "text", 1], ["refPrice", "ราคากลาง (บาท) (ตามไฟล์ติดตาม)", "number", 0], ["refDate", "วันที่เห็นชอบราคากลาง (ตามไฟล์ติดตาม)", "date", 0], ["f:req", "ไฟล์หนังสือรายงานขอซื้อขอจ้าง", "file", 1], ["f:order", "ไฟล์หนังสือคำสั่ง", "file", 1], ["f:comm", "ไฟล์เอกสารแต่งตั้งคณะกรรมการตรวจรับ", "file", 1]],
  s3: [["draft", "มีประกาศร่าง", "check", 0], ["draftDate", "วันที่ประกาศร่าง", "date", 1, "draft"], ["inviteDate", "วันที่ประกาศเชิญชวน/หนังสือเชิญชวน", "date", 1], ["bidDate", "วันที่ยื่นข้อเสนอ", "date", 1], ["method", "วิธีการจัดหา", "method", 1]],
  s4: [["start", "วันที่เริ่มพิจารณา", "date", 1], ["end", "วันที่สิ้นสุดพิจารณา", "date", 1], ["round", "ครั้งที่ประกวดราคา (ตามไฟล์ติดตาม)", "number", 0], ["f:result", "ไฟล์รายงานผลการพิจารณา", "file", 1], ["winner", "ผู้ได้รับการคัดเลือก", "text", 1], ["price", "ราคาที่เสนอ (บาท)", "number", 1],
    ["bbLetter", "ส่ง สงป. พิจารณา เลขที่หนังสือ/วันที่ (ตามไฟล์ติดตาม)", "text", 0, "multi"], ["bbAmount", "สำนักงบประมาณเห็นชอบ ในวงเงิน (บาท)", "number", 1, "multi"], ["cab", "ครม. อนุมัติขยายเวลาก่อหนี้", "cab", 1, "multi"], ["cabFrom", "เดิม ปี (เช่น 70-71)", "text", 1, "cabyes"], ["cabTo", "เป็น ปี (เช่น 70-72)", "text", 1, "cabyes"]],
  s5: [["approve", "วันที่อนุมัติ", "date", 1], ["winnerDate", "วันที่ประกาศผู้ชนะ", "date", 1], ["appeal", "มีอุทธรณ์", "check", 0], ["f:approve", "ไฟล์อนุมัติจ้าง", "file", 1], ["f:winner", "ไฟล์ประกาศผู้ชนะ", "file", 1], ["f:appeal", "ไฟล์เอกสารอุทธรณ์", "file", 1, "appeal"], ["f:comm", "ไฟล์เอกสารแต่งตั้งคณะกรรมการตรวจรับ", "file", 1]],
  s6: [["signBy", "ทำสัญญาภายในวันที่", "date", 1], ["f:notice", "ไฟล์หนังสือแจ้ง", "file", 1]],
  s7: [["sign", "สถานะทำสัญญา", "sign", 1], ["no", "เลขที่สัญญา", "text", 1, "signed"], ["date", "ลงวันที่ (วันที่ของสัญญา ไม่ใช่วันที่ลงนาม)", "date", 1, "signed"], ["amount", "วงเงินสัญญา (บาท) (ตามไฟล์ติดตาม)", "number", 0, "signed"], ["period", "วันเริ่มต้น - สิ้นสุดสัญญา (ตามไฟล์ติดตาม)", "text", 0, "signed"], ["f:contract", "ไฟล์หนังสือสัญญา", "file", 1, "signed"]],
};
const egp7Of = c => (c.egp7 = c.egp7 || { stage: 0, multi: !!(famLine((famPlan(c.plan) || {}).line || "").multi), s1: {}, s2: {}, s3: {}, s4: {}, s5: {}, s6: {}, s7: {} });
// the last day to appeal: 7 working days, the day after the announcement is day 1 (Saturdays and Sundays skipped; public holidays are not known here)
function egp7AppealEnd(d) { if (!d) return ""; let t = new Date(d + "T00:00:00Z"), n = 0; while (n < 7) { t = new Date(t.getTime() + 864e5); const w = t.getUTCDay(); if (w !== 0 && w !== 6) n++; } return t.toISOString().slice(0, 10); }
const egp7Show = (E, f) => !f[4] || (f[4] === "multi" ? E.multi : f[4] === "cabyes" ? E.multi && E.s4.cab === "yes" : f[4] === "draft" ? !!E.s3.draft : f[4] === "appeal" ? !!E.s5.appeal : f[4] === "signed" ? E.s7.sign === "signed" : true);
function egp7Missing(c, n) { const E = egp7Of(c), s = E["s" + n]; return EGP7_F["s" + n].filter(f => f[3] && egp7Show(E, f) && (f[0].startsWith("f:") ? !(s.files || {})[f[0].slice(2)] : f[2] === "check" ? false : s[f[0]] === undefined || s[f[0]] === "" || s[f[0]] === null)).map(f => f[1]); }
const egp7Proc = c => { const E = egp7Of(c); if (!E.stage) return 0; const st = EGP7[E.stage - 1]; return E.stage === 5 ? (E.s5.appeal ? 13 : 12) : E.stage === 4 && E.multi ? 10 : E.stage === 7 && E.s7.sign !== "signed" ? 14 : st.proc[st.proc.length - 1]; }; // the state code 0-15 of the disbursement file
function egp7Save(c, n, v, files) {
  if (!egpUpCan(c)) return L("เฉพาะเจ้าหน้าที่พัสดุบันทึกได้", "Only procurement records this"); const E = egp7Of(c); if (!(n >= 1 && n <= 7)) return "step"; const s = E["s" + n];
  EGP7_F["s" + n].forEach(f => { if (f[0].startsWith("f:")) return; if (!(f[0] in v)) return; let x = v[f[0]]; if (f[2] === "number") x = x === "" ? "" : Number(x); if (f[2] === "check") x = !!x; s[f[0]] = x; });
  if ("multi" in v) E.multi = !!v.multi; Object.entries(files || {}).forEach(([k, f]) => { if (f) (s.files = s.files || {})[k] = { name: f.name, size: f.size || 0, t: nowIso(), by: me().id }; });
  if (n === 5) s.appealEnd = egp7AppealEnd(s.winnerDate); if (n === 7 && s.sign && !EGP7_SIGN[s.sign]) return L("สถานะทำสัญญาไม่ถูกต้อง", "Bad contract state"); if (n === 4 && E.multi && s.cab === "yes" && !(s.cabFrom && s.cabTo)) return L("ระบุช่วงปีเดิมและช่วงปีใหม่ของการขยายเวลา", "Give the old and new years");
  const miss = egp7Missing(c, n); s.saved = nowIso(); if (!miss.length && (E.stage || 0) < n) E.stage = n; (c.events = c.events || []).push({ t: nowIso(), by: me().id, ev: "egpup", note: `e-GP ${n}. ${EGP7[n - 1].t}` }); return miss.length ? L("บันทึกแล้ว แต่ยังขาด: ", "Saved, still missing: ") + miss.join(", ") : "";
}
function egp7SetStage(c, n) { if (!egpUpCan(c)) return L("เฉพาะเจ้าหน้าที่พัสดุบันทึกได้", "Only procurement records this"); const E = egp7Of(c); if (!(n >= 0 && n <= 7)) return "step"; E.stage = n; return ""; }
egpUpdatePanel = function (c) {
  const E = egp7Of(c), can = egpUpCan(c), cur = E.stage || 0;
  const field = (n, f) => { const s = E["s" + n], v = s[f[0]], id = `e7-${c.id}-${n}-${f[0].replace(":", "-")}`, req = f[3] ? " *" : "";
    if (f[2] === "file") { const fl = (s.files || {})[f[0].slice(2)]; return `<div class="f"><label for="${id}">${f[1]}${req}</label>${fl ? `<div class="sub">📎 ${esc(fl.name)}</div>` : ""}${can ? `<input type="file" id="${id}" name="${f[0]}">` : ""}</div>`; }
    if (f[2] === "check") return `<div class="f" style="flex:0 1 auto;align-self:center"><label style="display:flex;gap:6px;align-items:center;font-weight:400"><input type="checkbox" name="${f[0]}" ${v ? "checked" : ""} ${can ? "" : "disabled"} data-e7re> ${f[1]}</label></div>`;
    if (f[2] === "method") return `<div class="f"><label for="${id}">${f[1]}${req}</label><select id="${id}" name="${f[0]}" ${can ? "" : "disabled"}><option value="">—</option>${EGP7_METHOD.map(m => `<option ${v === m ? "selected" : ""}>${m}</option>`).join("")}</select></div>`;
    if (f[2] === "cab") return `<div class="f"><label>${f[1]}${req}</label><div class="row" style="gap:12px"><label style="font-weight:400"><input type="radio" name="cab" value="no" ${v === "no" ? "checked" : ""} ${can ? "" : "disabled"} data-e7re> ไม่ขยาย</label><label style="font-weight:400"><input type="radio" name="cab" value="yes" ${v === "yes" ? "checked" : ""} ${can ? "" : "disabled"} data-e7re> ขยาย</label></div></div>`;
    if (f[2] === "sign") return `<div class="f"><label for="${id}">${f[1]}${req}</label><select id="${id}" name="sign" ${can ? "" : "disabled"} data-e7re><option value="">—</option>${Object.entries(EGP7_SIGN).map(([k, t]) => `<option value="${k}" ${v === k ? "selected" : ""}>${t}</option>`).join("")}</select></div>`;
    return `<div class="f"><label for="${id}">${f[1]}${req}</label><input type="${f[2] === "number" ? "number" : f[2] === "date" ? "date" : "text"}" id="${id}" name="${f[0]}" value="${esc(v == null ? "" : v)}" ${can ? "" : "disabled"}></div>`; };
  const step = st => { const n = st.n, s = E["s" + n], miss = egp7Missing(c, n), state = n < cur ? "done" : n === cur ? "now" : "next";
    return `<details ${n === Math.min(7, cur + (miss.length && n === cur ? 0 : 1)) || n === cur ? "open" : ""} style="border:1px solid var(--line);border-radius:10px;padding:8px 12px;margin:6px 0;${n === cur ? "box-shadow:inset 3px 0 0 var(--accent,#3b4fa8)" : ""}"><summary style="cursor:pointer"><b>${n}. ${esc(st.t)}</b> ${n === cur ? tag(L("ขั้นปัจจุบัน", "current"), "p-info") : n < cur ? tag(L("ผ่านแล้ว", "passed"), "p-ok") : ""} ${s.saved ? (miss.length ? tag(L(`ขาด ${miss.length}`, `${miss.length} missing`), "p-warn") : tag(L("ข้อมูลครบ", "complete"), "p-ok")) : ""}</summary>
      <form data-e7="${c.id}|${n}" class="inline-form" style="margin-top:8px">${n === 4 ? `<div class="f" style="flex:1 1 100%"><label style="display:flex;gap:6px;align-items:center;font-weight:400"><input type="checkbox" name="multi" ${E.multi ? "checked" : ""} ${can ? "" : "disabled"} data-e7re> งบผูกพัน (มีบรรทัด สำนักงบ และ ครม.; งบปีเดียวไม่มี)</label></div>` : ""}${EGP7_F["s" + n].filter(f => egp7Show(E, f)).map(f => field(n, f)).join("")}
      ${n === 5 && s.winnerDate ? `<div class="f"><label>วันสิ้นสุดการอุทธรณ์ (ระบบคำนวณ)</label><div><b>${fdate(egp7AppealEnd(s.winnerDate))}</b> <span class="sub">7 วันทำการ นับวันถัดจากวันประกาศผู้ชนะเป็นวันที่ 1 (ไม่นับเสาร์-อาทิตย์; ยังไม่หักวันหยุดราชการ)</span></div></div>` : ""}
      ${can ? `<div style="flex:1 1 100%" class="row"><button class="btn primary" type="submit">บันทึกขั้น ${n}</button>${miss.length && s.saved ? `<span class="sub">ยังขาด: ${esc(miss.join(", "))}</span>` : ""}</div>` : ""}</form>
      <div class="sub" style="margin-top:4px">เทียบไฟล์: สถานะไฟล์เบิกจ่าย ${st.proc.map(p => `${p}. ${esc(DT_PROC[p])}`).join(" · ")} | ฟอร์มติดตาม: ${esc(st.track.join(", "))}</div></details>`; };
  const body = `<div class="row" style="gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:6px"><b>ตอนนี้โครงการอยู่ขั้น:</b> ${cur ? tag(`${cur}. ${EGP7[cur - 1].t}`, "p-info") : tag("ยังไม่เริ่ม", "p-mute")} <span class="sub">= สถานะไฟล์เบิกจ่าย ${egp7Proc(c)}. ${esc(DT_PROC[egp7Proc(c)])}</span>${can ? `<label class="sub" style="margin-left:auto">ตั้งขั้นปัจจุบันเอง <select data-e7stage="${c.id}"><option value="0">—</option>${EGP7.map(s => `<option value="${s.n}" ${s.n === cur ? "selected" : ""}>${s.n}</option>`).join("")}</select></label>` : ""}</div>
    <div class="row" style="gap:4px;flex-wrap:wrap;margin-bottom:6px">${EGP7.map(s => `<span class="pill ${s.n < cur ? "p-ok" : s.n === cur ? "p-info" : "p-mute"}">${s.n}</span>`).join("→")}</div>${EGP7.map(step).join("")}
    <div class="sub">บันทึกขั้นที่ข้อมูลครบแล้วระบบเลื่อนขั้นปัจจุบันให้ ช่องที่มีคำว่า (ตามไฟล์ติดตาม) เป็นข้อมูลที่ไฟล์ติดตามของกรมเก็บ แต่รายการขั้นตอนที่ให้มาไม่ได้ระบุ</div>`;
  return { title: L(`ส่ง e-GP: ขั้นที่ ${cur || "-"} จาก 7`, `e-GP: step ${cur || "-"} of 7`), body };
};
document.addEventListener("submit", e => { const f = e.target; if (!f || !f.matches || !f.matches("[data-e7]")) return; e.preventDefault(); const [cid, ns] = f.dataset.e7.split("|"), c = caseOf(cid), n = Number(ns); if (!c) return;
  const fd = new FormData(f), v = {}, files = {}; EGP7_F["s" + n].forEach(x => { if (x[0].startsWith("f:")) { const fl = fd.get(x[0]); if (fl && fl.name) files[x[0].slice(2)] = fl; } else if (x[2] === "check") v[x[0]] = fd.get(x[0]) === "on"; else if (fd.has(x[0])) v[x[0]] = String(fd.get(x[0]) || "").trim(); }); if (n === 4) v.multi = fd.get("multi") === "on";
  const m = egp7Save(c, n, v, files); commit(); route(); toast(m || `บันทึกขั้น ${n} แล้ว`); });
document.addEventListener("change", e => { const t = e.target; if (t && t.matches && t.matches("[data-e7stage]")) { const c = caseOf(t.dataset.e7stage); if (c) { const m = egp7SetStage(c, Number(t.value)); if (m) toast(m); commit(); route(); } return; }
  if (t && t.matches && t.matches("[data-e7re]")) { const f = t.closest("form[data-e7]"); if (!f) return; const [cid, ns] = f.dataset.e7.split("|"), c = caseOf(cid), n = Number(ns), E = egp7Of(c), s = E["s" + n]; if (!egpUpCan(c)) return; if (t.name === "multi") E.multi = t.checked; else if (t.type === "checkbox") s[t.name] = t.checked; else s[t.name] = t.value; commit(); route(); } });
