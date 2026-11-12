// Fisko-KlangFinance, procurement round P4 (12 Nov 2569): extending a contract / changing its amount, in four steps.
//   1. The division (or procurement for it) prepares the papers and hands them to procurement.
//   2. The procurement officer checks the papers and has the AI write a summary to ask the authority for approval; the authority approves.
//   3. The officer has the AI draft the legal paper (an amendment to the contract) and sends it to the legal unit to check.
//   4. The officer records the hand-in to e-GP.
// It lives on the case page, Contract panel, "Extend the contract / change the amount". It builds on the existing contract changes (c.vars):
// the kinds (time, amount), the ladder of who approves (varWho: head of procurement or executive by size, R-08), the check that the approver is
// not the proposer (SD-08), and the new contract version made on approval are all the old ones; what is new is the steps before and after the
// approval, kept in v.flow = { stage: prep | check | approve | legal | egp | done, ... } and the statuses prep and check.
// The "AI" is simulated: it fills a template from the contract and the request (nothing is sent to any model); both texts say so, can be edited,
// and must be read before use. The legal unit has no role in this system: the officer records who checked, when, and the result.
// Known limit: the new contract version takes effect when the authority approves (as before); the legal paper and the e-GP record follow it.
// The old direct form on the contract page is switched off (canVary), so a change always starts here. Changes made before this file have no flow.
Object.assign(VAR_ST, { prep: [["เตรียมเอกสาร", "Preparing the papers"], "p-mute"], check: [["พัสดุตรวจเอกสาร", "Procurement checking"], "p-info"] });
Object.assign(CASE_EV, { var: ["ขยายสัญญา / ปรับวงเงิน", "Contract extension / amount change"] });
const VAR_STEPS = [["เตรียมเอกสาร", "Prepare"], ["ตรวจ + สรุปขออนุมัติ", "Check + approval summary"], ["ร่างกฎหมาย + นิติการ", "Legal draft + review"], ["นำส่ง e-GP", "Hand in to e-GP"]];
const varUnit = c => famLine(c.line).unit;
const varCanPrep = c => !!c && (isProcRole() || (["div", "divhead"].includes(ROLE) && me().unit === varUnit(c)));
const varStepNo = v => ({ prep: 1, check: 2, approve: 2, legal: 3, egp: 4, done: 5 })[(v.flow || {}).stage] || 0;
const varFiles = v => v.files || (v.files = []);
const varKindText = (c, v) => (v.kind === "time" ? `${L("ขยายเวลา", "Extend")} +${v.days} ${L("วัน", "days")} · ${tx((c.phases.find(p => p.n === v.phase) || { name: ["–", "–"] }).name)} · ${tx(EXT_CODE[v.code])}` : `${L("เปลี่ยนวงเงิน", "Change the amount")} ${v.delta > 0 ? "+" : ""}${fmt(v.delta)} ${L("บาท", "baht")} (${fmt(Math.abs(v.delta) / c.base * 100, 1)}%)`);
function varChecks(c, v) {
  const ok = (x, th, en) => ({ ok: !!x, label: L(th, en) }), out = [ok(String(v.why || "").length >= 10, "เหตุผลอย่างน้อย 10 ตัวอักษร", "A reason of at least 10 characters"), ok(varFiles(v).length > 0, "มีเอกสารแนบอย่างน้อย 1 ไฟล์", "At least one document attached")];
  if (v.kind === "amount") { out.push(ok(c.amount + v.delta > 0, "วงเงินใหม่มากกว่าศูนย์", "The new amount is above zero")); if (v.delta > 0) out.push(ok(v.delta <= famHeadroom(c.line), "ไม่เกินวงเงินคงเหลือของรายการจัดสรร", "Within the room left on the line")); out.push(ok(c.phases.some(p => !phaseAccepted(p) && !p.cancelled), "มีงวดที่ยังไม่ตรวจรับให้ปรับ", "A phase not yet accepted can take it")); }
  else { const ph = c.phases.find(p => p.n === v.phase); out.push(ok(ph && !phaseAccepted(ph) && !ph.cancelled, "งวดที่ขอขยายยังไม่ตรวจรับ", "The phase is not yet accepted")); out.push(ok(v.days > 0, "ระบุจำนวนวัน", "Days given")); }
  return out;
}
// ---------- the simulated AI texts ----------
function varSummaryText(c, v) {
  const p = famPlan(c.plan), ph = c.phases.find(x => x.n === v.phase), pct = fmt(Math.abs(v.delta || 0) / c.base * 100, 1), who = varWho(c, v) === "exec" ? "ผู้บริหาร" : "หัวหน้าพัสดุ";
  const body = v.kind === "time" ? [`ขอขยายระยะเวลาส่งมอบ ${v.days} วัน ของ${tx(ph.name)} จากกำหนดเดิม ${fdate(phDue(ph))} เป็น ${fdate(addDays(phDue(ph), v.days))}`, `สาเหตุ: ${tx(EXT_CODE[v.code])}${v.code === "vendor" ? " (ผู้ขายเป็นเหตุ ค่าปรับยังคิดตามกำหนดเดิม)" : ""}`]
    : [`ขอ${v.delta > 0 ? "เพิ่ม" : "ลด"}วงเงินสัญญา ${fmt(Math.abs(v.delta))} บาท (ร้อยละ ${pct} ของวงเงินตั้งต้น) เป็น ${fmt(c.amount + v.delta)} บาท`, `วงเงินคงเหลือของรายการจัดสรร ${mb(famHeadroom(c.line))} ล้านบาท`];
  return [`เรื่อง ขออนุมัติ${v.kind === "time" ? "ขยายระยะเวลาส่งมอบ" : "เปลี่ยนแปลงวงเงิน"}ตามสัญญา เลขที่ ${c.no}`, `คู่สัญญา ${tx(c.vendor)} · โครงการ ${tx(p.name)} · วงเงินสัญญาปัจจุบัน ${fmt(c.amount)} บาท (ฉบับที่ ${c.ver || 1}, วงเงินตั้งต้น ${fmt(c.base)} บาท)`, ...body,
    `เหตุผล: ${v.why}`, `เอกสารประกอบ ${varFiles(v).length} ไฟล์: ${varFiles(v).map(f => f.name).join(", ") || "-"}`, `ระดับผู้อนุมัติตามเกณฑ์ (R-08): ${who}`, `ร่างโดย AI (จำลอง) จากข้อมูลคำขอ ต้องตรวจทานก่อนใช้`].join("\n");
}
function varLegalText(c, v) {
  const ph = c.phases.find(x => x.n === v.phase), ver = (c.ver || 1) + (v.status === "approved" ? 0 : 1), change = v.kind === "time" ? `ให้ขยายกำหนดส่งมอบ${tx(ph.name)} ออกไปอีก ${v.days} วัน จากวันที่ ${fdate(phDue(ph))} เป็นวันที่ ${fdate(addDays(phDue(ph), v.days))}` : `ให้${v.delta > 0 ? "เพิ่ม" : "ลด"}วงเงินตามสัญญา ${fmt(Math.abs(v.delta))} บาท เป็นวงเงินใหม่ ${fmt(c.amount)} บาท`;
  return [`ร่างบันทึกข้อตกลงแก้ไขสัญญา (ฉบับที่ ${ver})`, `ข้อ 1 ตามสัญญาเลขที่ ${c.no} ลงวันที่ ${fdate(c.signed)} ระหว่างหน่วยงานผู้ว่าจ้าง กับ ${tx(c.vendor)} ผู้รับจ้าง`, `ข้อ 2 ${change}`,
    `ข้อ 3 ${v.kind === "time" ? "ค่าปรับให้คิดตามกำหนดส่งมอบใหม่" + (v.code === "vendor" ? " และไม่ยกเว้นค่าปรับสำหรับช่วงที่ขยาย เพราะผู้รับจ้างเป็นเหตุ" : "") : `หลักประกันสัญญาให้ปรับเป็นร้อยละ ${S.pcfg.guaranteePct} ของวงเงินใหม่ภายในกำหนด`}`,
    `ข้อ 4 ข้อความอื่นนอกจากที่แก้ไขนี้ ให้คงเป็นไปตามสัญญาเดิมทุกประการ`, `เหตุผลของการแก้ไข: ${v.why}`, `ร่างโดย AI (จำลอง) ไม่ใช่ความเห็นทางกฎหมาย ต้องให้นิติการตรวจสอบก่อนลงนาม`].join("\n");
}
// ---------- the decision (moved here from the contract page so that the case page can use it) ----------
function varDecide(cid, vid, ok) {
  const c = famCon(cid), v = c.vars.find(x => x.id === vid);
  if (ok) {
    if (!sodCheck("SD-08", v.who === "exec" ? sodActors("exec", "spend") : [me().id], [v.by], v.id)) return;
    if (v.kind === "amount") {
      if (v.delta > famHeadroom(c.line)) { toast(L("เกินวงเงินคงเหลือของรายการจัดสรร", "More than the room left on the line")); return; }
      const open = c.phases.filter(p => !phaseAccepted(p)), tgt = open[open.length - 1];
      if (!tgt || tgt.amount + v.delta <= 0) { toast(L("ปรับงวดที่ยังไม่ตรวจรับไม่ได้", "No open phase can take this change")); return; }
      tgt.amount += v.delta; c.amount += v.delta;
    } else { const ph = c.phases.find(p => p.n === v.phase); if (v.code === "vendor") ph.extV = (ph.extV || 0) + v.days; else ph.ext = (ph.ext || 0) + v.days; }
    c.ver = (c.ver || 1) + 1; (c.versions = c.versions || []).push({ v: c.ver, amount: c.amount, t: nowIso(), by: me().id, why: v.id });
  }
  v.status = ok ? "approved" : "rejected"; v.decided = { by: me().id, t: nowIso() };
  if (v.flow) { v.flow.stage = ok ? "legal" : "done"; v.flow.approved = { by: me().id, t: nowIso(), ok }; }
  audit([ok ? "อนุมัติแก้ไขสัญญา" : "ไม่อนุมัติแก้ไขสัญญา", ok ? "Approved a contract change" : "Rejected a contract change"], `${c.id} ${v.id}`);
  notify(["proc", "fin"], [`${c.id} ${ok ? "แก้ไขสัญญาได้รับอนุมัติ" : "การแก้ไขสัญญาไม่ได้รับอนุมัติ"}${ok && v.kind === "amount" ? ` ภาระผูกพันเปลี่ยน ${v.delta > 0 ? "+" : ""}${fmt(v.delta)} บาท` : ""}`, `${c.id}: change ${ok ? "approved" : "rejected"}${ok && v.kind === "amount" ? `, commitment ${v.delta > 0 ? "+" : ""}${fmt(v.delta)} baht` : ""}`], "fnc-chain");
  commit(); renderShell(); route(); toast(ok ? L("อนุมัติแล้ว สร้างฉบับสัญญาใหม่ ต่อด้วยร่างเอกสารกฎหมาย", "Approved; new version made; the legal draft is next") : L("ไม่อนุมัติ", "Rejected"));
}
// ---------- the panel ----------
function varFilesHtml(c, v, can) {
  return `${varFiles(v).length ? `<ul style="margin:4px 0;padding-left:18px">${varFiles(v).map((f, i) => `<li>${f.data ? `<a href="${f.data}" download="${esc(f.name)}">${esc(f.name)}</a>` : esc(f.name)} <span class="sub">· ${f.size ? Math.max(1, Math.round(f.size / 1024)) + " KB · " : ""}${f.data ? "" : L("เก็บเฉพาะชื่อไฟล์ · ", "file name only · ")}${esc(userName(f.by))} · ${fdate(f.t)}</span>${can ? ` <button class="btn ghost" type="button" data-vfdel="${c.id}|${v.id}|${i}" aria-label="${L("ลบไฟล์", "Remove the file")}">×</button>` : ""}</li>`).join("")}</ul>` : `<div class="sub">${L("ยังไม่มีเอกสารแนบ", "No documents yet")}</div>`}
    ${can ? `<form class="inline-form" data-vfile="${c.id}|${v.id}"><div class="f" style="flex:1 1 240px"><input type="file" name="files" multiple required aria-label="${L("ไฟล์", "Files")}"></div><button class="btn" type="submit">${L("แนบเอกสาร", "Attach")}</button></form>` : ""}`;
}
function varCard(cs, c, v) {
  const f = v.flow, st = varStepNo(v), isProc = isProcRole(), prepCan = varCanPrep(c) && f.stage === "prep", ta = (key, val, can) => `<textarea data-vtxt="${key}|${c.id}|${v.id}" rows="7" style="width:100%" ${can ? "" : "readonly"}>${esc(val || "")}</textarea>`;
  const strip = `<div class="row" style="gap:4px;flex-wrap:wrap;margin:6px 0">${VAR_STEPS.map((s, i) => { const on = i + 1 === Math.min(st, 4) && st <= 4, done = i + 1 < st; return `<span class="pill ${done ? "p-ok" : on ? "p-info" : "p-mute"}">${i + 1} · ${esc(tx(s))}${done ? " ✓" : ""}</span>`; }).join("")}${f.stage === "approve" ? tag(L("รอผู้มีอำนาจอนุมัติ", "Waiting for the authority"), "p-warn") : ""}${f.stage === "done" && v.status === "rejected" ? tag(L("ไม่อนุมัติ", "Rejected"), "p-bad") : ""}</div>`;
  let body = "";
  if (f.stage === "prep") body = `${f.returned ? `<div style="color:var(--bad)">${L("พัสดุส่งกลับ", "Sent back")}: ${esc(f.returned.note)}</div>` : ""}${varFilesHtml(c, v, prepCan)}
    ${prepCan ? `<div class="row"><button class="btn primary" type="button" data-vact="send|${c.id}|${v.id}">${L("ส่งให้เจ้าหน้าที่พัสดุ", "Hand to procurement")}</button></div>` : ""}`;
  else if (f.stage === "check") { const ck = varChecks(c, v), allOk = ck.every(x => x.ok), sm = f.summary && f.summary.text;
    body = `${varFilesHtml(c, v, isProc)}<div>${ck.map(x => `<div>${x.ok ? "✓" : '<span style="color:var(--bad)">✗</span>'} ${esc(x.label)}</div>`).join("")}</div>
      ${isProc ? `<div class="row"><button class="btn" type="button" data-vact="aisum|${c.id}|${v.id}">${L("ให้ AI สรุปเพื่อขออนุมัติ (จำลอง)", "AI summary for approval (simulated)")}</button></div>` : ""}
      ${sm ? `<div class="sub">${L("สรุปขออนุมัติ (แก้ไขได้ ต้องตรวจทานก่อนใช้)", "Summary for approval (editable, read before use)")}</div>${ta("summary", sm, isProc)}` : ""}
      ${isProc ? `<div class="row"><button class="btn primary" type="button" data-vact="toapprove|${c.id}|${v.id}" ${allOk && sm ? "" : "disabled"}>${L("ส่งผู้มีอำนาจอนุมัติ", "Send to the authority")} (${varWho(c, v) === "exec" ? L("ผู้บริหาร", "executive") : L("หัวหน้าพัสดุ", "head of procurement")})</button></div>
        <form class="inline-form" data-vf="return|${c.id}|${v.id}"><div class="f" style="flex:1 1 260px"><input type="text" name="note" placeholder="${L("คำแนะนำให้สำนัก/กองแก้ไข", "Advice on what to fix")}" required></div><button class="btn" type="submit">${L("ส่งกลับสำนัก/กอง", "Send back")}</button></form>` : ""}`; }
  else if (f.stage === "approve") body = `${f.summary ? `<pre style="white-space:pre-wrap;margin:0;font:inherit">${esc(f.summary.text)}</pre>` : ""}${v.status === "pending" && canDecideVar(v) ? `<div class="row"><button class="btn primary" type="button" data-vok="${c.id}|${v.id}">${L("อนุมัติ", "Approve")}</button><button class="btn danger" type="button" data-vno="${c.id}|${v.id}">${L("ไม่อนุมัติ", "Reject")}</button></div>` : ""}`;
  else if (f.stage === "legal") { const lg = f.legal || {}; body = `${f.legalDraft ? `<div class="sub">${L("ร่างเอกสารทางกฎหมาย (แก้ไขได้ ต้องให้นิติการตรวจ)", "Legal draft (editable; the legal unit must check it)")}</div>${ta("legal", f.legalDraft.text, isProc && !lg.sentT)}` : ""}
    ${isProc && !lg.sentT ? `<div class="row"><button class="btn" type="button" data-vact="ailegal|${c.id}|${v.id}">${f.legalDraft ? L("ให้ AI ร่างใหม่", "Redraft with AI") : L("ให้ AI ร่างเอกสารทางกฎหมาย (จำลอง)", "AI legal draft (simulated)")}</button></div>
      ${f.legalDraft ? `<form class="inline-form" data-vf="legalsend|${c.id}|${v.id}"><div class="f" style="flex:1 1 220px"><label>${L("นิติการผู้ตรวจ", "Legal reviewer")}</label><input type="text" name="who" value="${esc(lg.reviewer || "")}" required></div><button class="btn primary" type="submit">${L("ส่งนิติการตรวจสอบ", "Send to the legal unit")}</button></form>` : ""}` : ""}
    ${lg.sentT ? `<div class="sub">${L("ส่งนิติการ", "Sent to")} ${esc(lg.reviewer)} · ${fdate(lg.sentT, true)}</div>${isProc ? `<form class="inline-form" data-vf="legalres|${c.id}|${v.id}"><div class="f" style="flex:0 1 200px"><label>${L("ผลการตรวจ", "Result")}</label><select name="res"><option value="ok">${L("ผ่าน", "Passed")}</option><option value="fix">${L("ให้แก้ไข", "Needs changes")}</option></select></div><div class="f" style="flex:1 1 220px"><label>${L("หมายเหตุ", "Note")}</label><input type="text" name="note"></div><button class="btn primary" type="submit">${L("บันทึกผลนิติการ", "Record the result")}</button></form>` : ""}` : ""}
    ${lg.result === "fix" && !lg.sentT ? `<div style="color:var(--bad)">${L("นิติการให้แก้ไข", "The legal unit asks for changes")}: ${esc(lg.note || "")}</div>` : ""}`; }
  else if (f.stage === "egp") body = `${f.legal ? `<div class="sub">${L("นิติการ", "Legal")}: ${esc(f.legal.reviewer)} · ${L("ผ่าน", "passed")} ${fdate(f.legal.resT, true)}${f.legal.note ? " · " + esc(f.legal.note) : ""}</div>` : ""}
    ${isProc ? `<form class="inline-form" data-vf="egp|${c.id}|${v.id}"><div class="f" style="flex:1 1 220px"><label>${L("เลขที่/อ้างอิงใน e-GP", "e-GP reference")}</label><input type="text" name="ref" required></div><div class="f" style="flex:0 1 160px"><label>${L("วันที่นำส่ง", "Hand-in date")}</label><input type="date" name="d" value="${TODAY}" required></div><button class="btn primary" type="submit">${L("บันทึกการนำส่ง e-GP", "Record the e-GP hand-in")}</button></form>` : ""}`;
  else body = `${f.egp ? `<div>${tag(L("นำส่ง e-GP แล้ว", "Handed in to e-GP"), "p-ok")} <span class="mono">${esc(f.egp.ref)}</span> · ${fdate(f.egp.date)}</div>` : v.status === "rejected" ? `<div class="sub">${L("ไม่อนุมัติ ปิดคำขอ", "Rejected; closed")}</div>` : ""}`;
  return `<div class="panel" style="padding:10px 12px"><div class="row" style="gap:8px"><b class="mono">${v.id}</b> ${stTag(VAR_ST, v.status)} <span class="sub">${esc(varKindText(c, v))}</span></div>
    <div class="sub">${esc(userName(v.by))} · ${esc(unitName(v.unit || varUnit(c)))} · ${fdate(v.t, true)} · ${esc(v.why)}</div>${strip}<div style="display:flex;flex-direction:column;gap:8px">${body}</div></div>`;
}
function varPanel(cs) {
  const c = caseCon(cs); if (!c) return { title: L("ขยายสัญญา / ปรับวงเงิน", "Extend the contract / change the amount"), body: `<span class="sub">${L("ยังไม่มีสัญญา", "No contract yet")}</span>` };
  const all = c.vars || [], flows = all.filter(v => v.flow), old = all.filter(v => !v.flow), can = varCanPrep(c);
  const form = can ? `<form class="inline-form" data-vnew="${c.id}"><div class="f" style="flex:0 1 150px"><label>${L("ชนิด", "Kind")}</label><select name="kind"><option value="time">${L("ขยายเวลา", "Extend time")}</option><option value="amount">${L("เปลี่ยนวงเงิน", "Change amount")}</option></select></div>
    <div class="f" style="flex:0 1 150px"><label>${L("งวด (ขยายเวลา)", "Phase (time)")}</label><select name="phase">${c.phases.filter(p => !phaseAccepted(p) && !p.cancelled).map(p => `<option value="${p.n}">${tx(p.name)}</option>`).join("")}</select></div><div class="f" style="flex:0 1 90px"><label>${L("วัน", "Days")}</label><input type="number" name="days" min="1" step="1"></div>
    <div class="f" style="flex:0 1 170px"><label>${L("เหตุผลของการขยาย", "Cause (time)")}</label><select name="code">${Object.keys(EXT_CODE).map(k => `<option value="${k}">${tx(EXT_CODE[k])}</option>`).join("")}</select></div>
    <div class="f" style="flex:0 1 150px"><label>${L("ส่วนต่างวงเงิน (บาท ลบได้)", "Amount change (baht)")}</label><input type="number" name="delta" step="1"></div><div class="f" style="flex:2 1 240px"><label>${L("เหตุผล", "Reason")}</label><input type="text" name="why" required></div>
    <div class="f" style="flex:1 1 220px"><label>${L("เอกสาร (หลายไฟล์ได้)", "Documents (several)")}</label><input type="file" name="files" multiple></div><button class="btn primary" type="submit">${L("เริ่มคำขอ", "Start a request")}</button></form>` : `<div class="sub">${L("สำนัก/กองเจ้าของเรื่องหรือเจ้าหน้าที่พัสดุเริ่มคำขอได้", "The owning division or procurement starts a request")}</div>`;
  return { title: L("ขยายสัญญา / ปรับวงเงิน", "Extend the contract / change the amount"), body: `<div class="sub">${L("4 ขั้น: 1 สำนัก/กองเตรียมเอกสาร · 2 พัสดุตรวจและสรุปขออนุมัติด้วย AI แล้วผู้มีอำนาจอนุมัติ · 3 AI ร่างเอกสารกฎหมาย ส่งนิติการตรวจ · 4 นำส่ง e-GP (AI เป็นการจำลองจากแม่แบบ ต้องตรวจทานก่อนใช้)", "Four steps: 1 the division prepares the papers; 2 procurement checks and has the AI write the approval summary, then the authority approves; 3 the AI drafts the legal paper and the legal unit checks it; 4 hand-in to e-GP (the AI is simulated from a template; read before use)")}</div>
    ${form}${flows.slice().reverse().map(v => varCard(cs, c, v)).join("") || `<div class="sub">${L("ยังไม่มีคำขอ", "No requests yet")}</div>`}
    ${old.length ? `<div class="sub">${L("การแก้ไขที่ทำก่อนมีขั้นตอนนี้", "Changes made before this flow")}: ${old.map(v => `${v.id} ${stTag(VAR_ST, v.status)}`).join(" · ")}</div>` : ""}` };
}
// ---------- the actions ----------
{
  const done = msg => { commit(); route(); toast(msg); }, find = key => { const [, cid, vid] = key.split("|"), c = famCon(cid); return c ? { c, v: (c.vars || []).find(x => x.id === vid), cs: conCase(c) } : {}; }, stamp = () => ({ by: me().id, t: nowIso() });
  const next = (v, stage, status) => { v.flow.stage = stage; if (status) v.status = status; };
  document.addEventListener("submit", e => {
    const f = e.target; if (!f || !f.matches) return;
    if (f.matches("[data-vnew]")) { e.preventDefault(); const c = famCon(f.dataset.vnew), fd = new FormData(f), g = k => String(fd.get(k) || "").trim(), kind = g("kind"), files = [...f.querySelector("[name=files]").files]; if (!c || !varCanPrep(c)) return;
      const v = { id: `${c.id}-V${(c.vars || []).length + 1}`, kind, why: g("why"), by: me().id, t: nowIso(), status: "prep", decided: null, unit: varUnit(c), files: [], flow: { stage: "prep" } };
      if (kind === "time") { v.days = Math.round(Number(g("days"))); v.phase = Number(g("phase")); v.code = g("code"); if (!(v.days > 0) || !v.phase) { toast(L("ระบุงวดและจำนวนวัน", "Give the phase and the days")); return; } }
      else { v.delta = Math.round(Number(g("delta"))); if (!v.delta) { toast(L("ระบุส่วนต่างวงเงิน", "Give the amount change")); return; } }
      cmReadFiles(files).then(items => { v.files = items.map(it => Object.assign({ by: me().id, t: nowIso() }, it)); (c.vars = c.vars || []).push(v); audit(["เริ่มคำขอแก้ไขสัญญา", "Started a contract change request"], `${c.id} ${v.id}`); const cs = conCase(c); if (cs) caseLog(cs, "var", `${v.id} · ${varKindText(c, v)}`); done(L("เริ่มคำขอแล้ว เตรียมเอกสารแล้วส่งให้เจ้าหน้าที่พัสดุ", "Request started; prepare the papers and hand them to procurement")); }); return; }
    if (f.matches("[data-vfile]")) { e.preventDefault(); const { c, v } = find("x|" + f.dataset.vfile), files = [...f.querySelector("[name=files]").files]; if (!v || !files.length || !(v.flow.stage === "prep" ? varCanPrep(c) : v.flow.stage === "check" && isProcRole())) return;
      cmReadFiles(files).then(items => { varFiles(v).push(...items.map(it => Object.assign({ by: me().id, t: nowIso() }, it))); audit(["แนบเอกสารคำขอแก้ไขสัญญา", "Attached papers to a contract change"], `${c.id} ${v.id} · ${items.length}`); done(L("แนบเอกสารแล้ว", "Attached")); }); return; }
    if (f.matches("[data-vf]")) { e.preventDefault(); const key = f.dataset.vf, act = key.split("|")[0], { c, v, cs } = find(key), fd = new FormData(f), g = k => String(fd.get(k) || "").trim(); if (!v || !v.flow || !isProcRole()) return;
      if (act === "return" && v.flow.stage === "check") { if (g("note").length < 3) { toast(L("ระบุคำแนะนำ", "Give the advice")); return; } v.flow.returned = Object.assign({ note: g("note") }, stamp()); v.flow.summary = null; next(v, "prep", "prep"); notify(["div", "divhead"], [`${v.id} พัสดุส่งกลับให้แก้ไข: ${g("note")}`, `${v.id} was sent back: ${g("note")}`], cs ? "case:" + cs.id : "prc-contracts"); audit(["ส่งคำขอแก้ไขสัญญากลับสำนัก/กอง", "Sent a contract change back"], `${c.id} ${v.id}`); done(L("ส่งกลับสำนัก/กองแล้ว", "Sent back")); return; }
      if (act === "legalsend" && v.flow.stage === "legal" && v.flow.legalDraft) { v.flow.legal = { reviewer: g("who"), sentT: nowIso(), result: null, note: "" }; audit(["ส่งร่างเอกสารกฎหมายให้นิติการ", "Sent the legal draft to the legal unit"], `${c.id} ${v.id} ${g("who")}`); done(L("ส่งนิติการแล้ว", "Sent to the legal unit")); return; }
      if (act === "legalres" && v.flow.stage === "legal" && v.flow.legal && v.flow.legal.sentT) { const res = g("res"); if (res === "fix" && g("note").length < 3) { toast(L("ระบุสิ่งที่ต้องแก้ไข", "Say what must change")); return; }
        Object.assign(v.flow.legal, { result: res, note: g("note"), resT: nowIso() }); if (res === "ok") next(v, "egp"); else v.flow.legal.sentT = null; audit(["บันทึกผลตรวจของนิติการ", "Recorded the legal result"], `${c.id} ${v.id} ${res}`); done(res === "ok" ? L("นิติการผ่านแล้ว ต่อด้วยนำส่ง e-GP", "Passed; hand-in to e-GP is next") : L("นิติการให้แก้ไข แก้ร่างแล้วส่งใหม่", "Changes asked; fix the draft and send again")); return; }
      if (act === "egp" && v.flow.stage === "egp") { v.flow.egp = { ref: g("ref"), date: g("d"), by: me().id, t: nowIso() }; next(v, "done"); audit(["บันทึกการนำส่งแก้ไขสัญญาเข้า e-GP", "Recorded the contract change hand-in to e-GP"], `${c.id} ${v.id} ${g("ref")}`); if (cs) caseLog(cs, "var", `${v.id} → e-GP ${g("ref")}`); done(L("บันทึกการนำส่ง e-GP แล้ว คำขอเสร็จ", "Hand-in recorded; the request is complete")); return; } }
  });
  document.addEventListener("click", e => {
    const d = e.target.closest && e.target.closest("[data-vok],[data-vno]"); if (d && d.closest(".cmain")) { const ok = d.hasAttribute("data-vok"), [cid, vid] = (d.dataset.vok || d.dataset.vno).split("|"); varDecide(cid, vid, ok); return; }
    const x = e.target.closest && e.target.closest("[data-vfdel]"); if (x) { const [cid, vid, i] = x.dataset.vfdel.split("|"), { v } = find("x|" + cid + "|" + vid); if (v && v.flow && ["prep", "check"].includes(v.flow.stage)) { varFiles(v).splice(Number(i), 1); done(L("ลบเอกสารแล้ว", "Removed")); } return; }
    const b = e.target.closest && e.target.closest("[data-vact]"); if (!b) return; const key = b.dataset.vact, act = key.split("|")[0], { c, v, cs } = find(key); if (!v || !v.flow) return;
    if (act === "send" && v.flow.stage === "prep" && varCanPrep(c)) { const bad = varChecks(c, v).slice(0, 2).find(y => !y.ok); if (bad) { toast(`${L("ยังส่งไม่ได้", "Can't send yet")}: ${bad.label}`); return; } v.flow.sent = stamp(); v.flow.returned = null; next(v, "check", "check"); notify(["proc", "prochead"], [`${v.id} สำนัก/กองส่งเอกสารขอแก้ไขสัญญา รอพัสดุตรวจ`, `${v.id}: the division handed over the papers for a contract change`], cs ? "case:" + cs.id : "prc-contracts"); audit(["ส่งเอกสารขอแก้ไขสัญญาให้พัสดุ", "Handed a contract change to procurement"], `${c.id} ${v.id}`); done(L("ส่งให้เจ้าหน้าที่พัสดุแล้ว", "Handed to procurement")); return; }
    if (!isProcRole()) return;
    if (act === "aisum" && v.flow.stage === "check") { v.flow.summary = { text: varSummaryText(c, v), ai: true, by: me().id, t: nowIso() }; S.aiLog && S.aiLog.unshift({ t: nowIso(), agent: "AG-P4", user: me().id, action: ["สรุปขออนุมัติแก้ไขสัญญา (จำลอง)", "Contract-change approval summary (simulated)"], target: v.id, sources: varFiles(v).length, ok: true, ver: "sim-1" }); done(L("AI (จำลอง) สรุปแล้ว ตรวจทานและแก้ไขได้", "Summary written (simulated); read and edit it")); return; }
    if (act === "toapprove" && v.flow.stage === "check") { const bad = varChecks(c, v).find(y => !y.ok); if (bad) { toast(`${L("ยังส่งไม่ได้", "Can't send yet")}: ${bad.label}`); return; } if (!(v.flow.summary && v.flow.summary.text.length > 20)) { toast(L("ให้ AI สรุปขออนุมัติก่อน", "Have the AI write the summary first")); return; }
      v.who = varWho(c, v); v.flow.check = stamp(); next(v, "approve", "pending"); notify([v.who], [`${c.id} มีการเสนอแก้ไขสัญญา รออนุมัติ`, `${c.id} has a proposed change waiting for approval`], cs ? "case:" + cs.id : "prc-contracts"); audit(["ส่งคำขอแก้ไขสัญญาให้ผู้มีอำนาจอนุมัติ", "Sent a contract change to the authority"], `${c.id} ${v.id}`); done(L("ส่งผู้มีอำนาจอนุมัติแล้ว", "Sent to the authority")); return; }
    if (act === "ailegal" && v.flow.stage === "legal" && !(v.flow.legal && v.flow.legal.sentT)) { v.flow.legalDraft = { text: varLegalText(c, v), ai: true, by: me().id, t: nowIso() }; S.aiLog && S.aiLog.unshift({ t: nowIso(), agent: "AG-P4", user: me().id, action: ["ร่างเอกสารกฎหมายแก้ไขสัญญา (จำลอง)", "Legal draft for a contract change (simulated)"], target: v.id, sources: 1, ok: true, ver: "sim-1" }); done(L("AI (จำลอง) ร่างแล้ว ตรวจทานและแก้ไขได้", "Draft written (simulated); read and edit it")); }
  });
  document.addEventListener("change", e => { const t = e.target; if (!t || !t.matches || !t.matches("[data-vtxt]") || !isProcRole()) return; const { v } = find(t.dataset.vtxt); if (!v || !v.flow) return; const k = t.dataset.vtxt.split("|")[0], o = k === "summary" ? v.flow.summary : v.flow.legalDraft; if (!o) return; o.text = t.value; o.edited = true; commit(); });
  // my work in the flow
  const base = famTasks;
  famTasks = R => { base(R); (S.contracts || []).forEach(c => (c.vars || []).filter(v => v.flow).forEach(v => { const cs = conCase(c), link = cs ? "case:" + cs.id : "prc-contracts", s = v.flow.stage;
    if (isProcRole() && ["check", "legal", "egp"].includes(s)) R(`${s === "check" ? L("ตรวจเอกสารแก้ไขสัญญา", "Check a contract change") : s === "legal" ? L("ร่างเอกสารกฎหมาย / ผลนิติการ", "Legal draft / result") : L("นำส่งแก้ไขสัญญาเข้า e-GP", "Hand a contract change in to e-GP")} ${v.id}`, varKindText(c, v), TODAY, link, "p-info");
    if (s === "prep" && varCanPrep(c) && !isProcRole()) R(`${L("เตรียมเอกสารแก้ไขสัญญา", "Prepare the papers for a contract change")} ${v.id}`, varKindText(c, v), TODAY, link, "p-warn"); })); };
}
