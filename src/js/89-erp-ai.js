// Fisko-ERP-Gov, part 6: Fisko AI (module 8). One place for the AI assistants and agents of all eight modules.
// The registry reads the agents Fisko already has (S.agents: budget, procurement, finance) and adds four agents for
// the new apps (AG-30 to AG-33). The new agents are rule-based and simulated, like Fisko's own: they read the data,
// list findings with the steps they took, and stop for a person before anything is sent. No language model is called.
const AI_ROLES = ERP_ROLES;
const AI_APP = "DPT AI";
const AG_MODULE = id => { const n = Number(String(id).slice(3)); return [1, 2, 3, 4, 5, 6, 15, 16, 17].includes(n) ? "budget" : [7, 8, 9, 10, 11, 13, 14].includes(n) ? "procurement" : n === 12 || n === 33 ? "contract" : n >= 18 && n <= 22 ? "finance" : n === 30 ? "assets" : n === 31 ? "inventory" : n === 32 ? "org" : "other"; };
const AG_MOD_NAME = { org: ["1 โครงสร้างองค์กร", "1 Organization"], budget: ["2 งบประมาณ", "2 Budgeting"], procurement: ["3 จัดซื้อจัดจ้าง", "3 Procurement"], finance: ["4 การเงินและบัญชี", "4 Finance"], contract: ["5 สัญญา", "5 Contracts"], assets: ["6 ครุภัณฑ์", "6 Assets"], inventory: ["7 วัสดุคงคลัง", "7 Inventory"], other: ["อื่น ๆ", "Other"] };
const AG_PAGE = { budget: "intel-agents", procurement: "prc-agents", finance: "fnc-ai", contract: "ct-watch", assets: "as-today", inventory: "in-today", org: "org-tree" };
const ERP_RES = {};
// Who may confirm what an agent proposes: the agent only drafts, the owner of that work sends.
const AG_APPLY = { "AG-31": ["store"], "AG-33": ["proc", "prochead"] };
const aiCanApply = id => (AG_APPLY[id] || []).includes(ROLE);

function aiLogUse(agent, action, target, sources) {
  S.aiLog.unshift({ t: nowIso(), agent, user: me().id, action, target, sources, ok: true });
  const a = S.agents.find(x => x.id === agent); if (a) a.uses = (a.uses || 0) + 1;
}
const pad2 = n => String(n).padStart(2, "0");

// Each agent returns { steps: [text], found: [{ sev: bad|warn|info, text, link }], props: [{ id, label, text, apply }] }.
const ERP_AGENTS = {
  "AG-30": () => {
    const A = S.assets || [], inS = A.filter(assetInService), found = [], intake = intakeRows(), cnt = (S.acount || []).find(x => x.status === "open");
    intake.forEach(r => found.push({ sev: "warn", text: L(`${r.c.id} ${tx(r.ph.name)} ตรวจรับแล้วแต่ยังไม่ได้ลงทะเบียนครุภัณฑ์`, `${r.c.id} ${r.ph.name[1]} is accepted but not registered as an asset`), link: "as-intake" }));
    A.filter(a => a.status === "pending").forEach(a => found.push({ sev: "warn", text: L(`${a.id} รอยืนยันขึ้นทะเบียน`, `${a.id} awaits registration`), link: "as-reg" }));
    inS.filter(a => !a.cust || !a.loc).forEach(a => found.push({ sev: "warn", text: L(`${a.tag || a.id} ยังไม่ระบุ${!a.cust ? "ผู้ดูแล" : "สถานที่"}`, `${a.tag || a.id} has no ${!a.cust ? "custodian" : "location"}`), link: "as-reg" }));
    inS.filter(a => a.cost >= ASSET_LOW).forEach(a => { const left = assetCat(a.cat).life * 12 - assetDep(a).months; if (left <= 6) found.push({ sev: "info", text: L(`${a.tag} ใกล้ครบอายุใช้งานอีก ${left} เดือน (มูลค่าตามบัญชี ${fmt(assetDep(a).nbv)} บาท)`, `${a.tag} ends its useful life in ${left} months (book ${fmt(assetDep(a).nbv)} baht)`), link: "as-reg" }); });
    if (cnt) found.push({ sev: "info", text: L(`รอบตรวจนับ ${cnt.id} นับแล้ว ${Object.keys(cnt.results).length}/${inS.length}`, `Count ${cnt.id}: ${Object.keys(cnt.results).length}/${inS.length} counted`), link: "as-count" });
    return { steps: [L(`อ่านทะเบียนครุภัณฑ์ ${A.length} รายการ`, `Read ${A.length} register entries`), L(`เทียบงวดที่ตรวจรับแล้วกับทะเบียน (พบ ${intake.length} งวดที่ยังไม่ลงทะเบียน)`, `Compared accepted phases with the register (${intake.length} not registered)`), L("ตรวจผู้ดูแล สถานที่ และอายุใช้งาน", "Checked custodians, locations and useful life"), L("ตรวจความคืบหน้าการนับ", "Checked count progress")], found, props: [] };
  },
  "AG-31": () => {
    const open = (S.reorder || []).filter(x => ["sent", "taken"].includes(x.status)).map(x => x.item), low = (S.sitems || []).filter(i => stockLow(i) && !open.includes(i.id));
    const props = low.map(i => { const q = Math.max(i.reorder, Math.ceil((i.reorder * 2 - onHand(i.id)) / 10) * 10), est = Math.round(q * i.price);
      return { id: i.id, label: `${tx(i.name)} · ${fmt(q)} ${i.uom} · ${baht(est)}`, text: L(`คงเหลือ ${fmt(onHand(i.id))} ต่ำกว่าจุดสั่งซื้อ ${fmt(i.reorder)} เสนอซื้อเพิ่ม ${fmt(q)} ${i.uom}`, `On hand ${fmt(onHand(i.id))}, below the reorder point ${fmt(i.reorder)}; propose ${fmt(q)} ${i.uom}`),
        apply: () => { const r = { id: eNextId("RO-", S.reorder), item: i.id, qty: q, est, status: "sent", by: me().id, t: nowIso() }; S.reorder.push(r); notify(["proc"], [`ข้อเสนอเติมสต็อก ${tx(i.name)} ${fmt(q)} ${i.uom}`, `Replenish ${i.name[1]} ${fmt(q)} ${i.uom}`], "prc-reqn"); audit(["ส่งข้อเสนอเติมสต็อกให้พัสดุ", "Sent a replenishment proposal to procurement"], `${r.id} ${i.id}`); return r; } }; });
    return { steps: [L(`อ่านยอดคงเหลือ ${S.sitems.length} รายการ`, `Read balances of ${S.sitems.length} items`), L(`เทียบกับจุดสั่งซื้อ พบ ${low.length} รายการที่ต่ำกว่า`, `Compared with reorder points: ${low.length} below`), L("คำนวณจำนวนเสนอซื้อ = 2 เท่าของจุดสั่งซื้อ หักยอดคงเหลือ ปัดขึ้นเป็นสิบ", "Proposed quantity = twice the reorder point minus on hand, rounded up to ten"), L("รอผู้ใช้ยืนยันก่อนส่งให้เจ้าหน้าที่พัสดุ", "Waits for a person before it goes to procurement")],
      found: low.map(i => ({ sev: onHand(i.id) <= 0 ? "bad" : "warn", text: `${tx(i.name)}: ${fmt(onHand(i.id))} / ${fmt(i.reorder)} ${i.uom}`, link: "in-items" })), props };
  },
  "AG-32": () => {
    const found = [], P = S.positions || [];
    S.units.filter(u => u.parent && !P.some(p => p.unit === u.id)).forEach(u => found.push({ sev: "warn", text: L(`${tx(u.name)} ยังไม่มีตำแหน่งในทะเบียน`, `${tx(u.name)} has no position`), link: "org-pos" }));
    P.filter(p => !p.holder).forEach(p => found.push({ sev: "warn", text: L(`ตำแหน่ง ${tx(p.title)} ของ ${unitName(p.unit)} ว่าง`, `${tx(p.title)} of ${unitName(p.unit)} is vacant`), link: "org-pos" }));
    P.filter(p => p.holder && !(S.users.find(u => u.id === p.holder) || {}).active).forEach(p => found.push({ sev: "bad", text: L(`${p.id} ผู้ดำรงตำแหน่งถูกระงับการใช้งาน`, `${p.id} is held by an inactive user`), link: "org-pos" }));
    S.tiers.forEach(t => { if (!S.users.some(u => u.active && u.role === t.role)) found.push({ sev: "bad", text: L(`ขั้นอนุมัติ ${t.id} ระบุบทบาทที่ไม่มีผู้ใช้ที่ใช้งานอยู่`, `Tier ${t.id} names a role with no active user`), link: "org-tier" }); });
    Object.keys(TIER_DOC).filter(d => !S.tiers.some(t => t.doc === d && t.min === 0)).forEach(d => found.push({ sev: "bad", text: L(`เอกสาร ${tx(TIER_DOC[d])} ไม่มีขั้น 'ทุกวงเงิน'`, `${tx(TIER_DOC[d])} has no 'any amount' tier`), link: "org-tier" }));
    return { steps: [L(`อ่านหน่วยงาน ${S.units.length} หน่วย ตำแหน่ง ${P.length} และขั้นอนุมัติ ${S.tiers.length}`, `Read ${S.units.length} units, ${P.length} positions and ${S.tiers.length} tiers`), L("ตรวจหน่วยที่ไม่มีตำแหน่ง และตำแหน่งว่าง", "Checked units without positions and vacancies"), L("ตรวจว่าทุกขั้นอนุมัติมีผู้ใช้รับผิดชอบ", "Checked that every tier has an active approver")], found, props: [] };
  },
  "AG-33": () => {
    const R = ctWatchRows().filter(r => r.d <= 60), found = R.map(r => ({ sev: r.d < 0 ? "bad" : r.d <= 7 ? "warn" : "info", text: `${r.kind} ${r.doc}: ${r.text} (${r.d < 0 ? L("เลย", "overdue") + " " + -r.d : r.d} ${L("วัน", "days")})`, link: r.link }));
    const props = R.filter(r => r.d <= 30).map(r => { const draft = L(`เรียน ผู้รับผิดชอบ\nเรื่อง แจ้งเตือนกำหนดเวลา ${r.doc}\n${r.kind}: ${r.text}\nครบกำหนด ${fdate(r.due)} (${r.d < 0 ? "เลยกำหนด " + -r.d + " วัน" : "อีก " + r.d + " วัน"})\nโปรดดำเนินการหรือแจ้งผลให้พัสดุทราบ`, `To the owner\nSubject: deadline reminder ${r.doc}\n${r.kind}: ${r.text}\nDue ${fdate(r.due)} (${r.d < 0 ? -r.d + " days overdue" : "in " + r.d + " days"})\nPlease act or tell procurement the outcome`);
      return { id: r.doc + r.kind, label: `${r.doc} · ${r.kind}`, text: draft, apply: () => { notify(["proc", "prochead"], [`แจ้งเตือน ${r.doc}: ${r.kind}`, `Reminder ${r.doc}: ${r.kind}`], r.link); audit(["ส่งข้อความแจ้งเตือนสัญญา", "Sent a contract reminder"], r.doc); return { id: r.doc }; } }; });
    return { steps: [L("อ่านสัญญา งวดงาน หลักประกัน และข้อตกลงนอกการจัดซื้อ", "Read contracts, phases, guarantees and agreements"), L(`เลือกรายการที่ครบกำหนดภายใน 60 วัน (${R.length} รายการ)`, `Picked items due within 60 days (${R.length})`), L("ร่างข้อความแจ้งเตือนสำหรับรายการที่ใกล้หรือเลยกำหนด (30 วัน)", "Drafted reminders for items within 30 days"), L("รอผู้ใช้ตรวจและกดส่งทีละรายการ", "Waits for a person to review and send each one")], found, props };
  },
};

function aiResultHtml(id) {
  const r = ERP_RES[id]; if (!r) return "";
  const dot = s => dotI(s === "bad" ? "bad" : s === "warn" ? "warn" : "ok");
  return `<div class="body"><h3 style="margin:0 0 6px">${L("ขั้นตอนที่ทำ", "Steps taken")}</h3><ol class="sub" style="margin:0 0 10px 18px">${r.steps.map(s => `<li>${esc(s)}</li>`).join("")}</ol>
    <h3 style="margin:0 0 6px">${L("สิ่งที่พบ", "Findings")} (${r.found.length})</h3>${r.found.length ? `<table><tbody>${r.found.map(f => `<tr><td>${dot(f.sev)}${esc(f.text)}</td><td><button class="btn ghost" type="button" data-jump="${f.link}">${L("เปิด", "Open")}</button></td></tr>`).join("")}</tbody></table>` : `<div class="sub">${dotI("ok")}${L("ไม่พบประเด็น", "Nothing found")}</div>`}
    ${r.props.length ? `<h3 style="margin:12px 0 6px">${L("ข้อเสนอ — รอคุณยืนยันทีละรายการ", "Proposals — waiting for your confirmation, one by one")}</h3>${r.props.map((p, i) => `<div class="panel" style="margin:0 0 8px"><div class="body"><b style="font-weight:600">${esc(p.label)}</b><div class="sub" style="white-space:pre-line">${esc(p.text)}</div>
      <div class="row" style="margin-top:6px">${p.done ? tagN("p-ok", "ส่งแล้ว", "Sent") : !aiCanApply(id) ? `<span class="sub">${L("ยืนยันได้เฉพาะ", "Only")} ${AG_APPLY[id].map(r => tx(ROLES[r])).join(" / ")}</span>` : `<button class="btn primary" type="button" data-aiapply="${id}|${i}">${L("ยืนยันและส่ง", "Confirm and send")}</button>`}</div></div></div>`).join("")}` : ""}</div>`;
}

ePageDef("ai", "ai-hub", "X1", "aig", AI_ROLES, ["AI ช่วยจัดการ ทุกโมดูล", "AI assistance, all modules"], () => {
  const AG = S.agents, on = AG.filter(a => a.on).length, runs = AG.reduce((s, a) => s + (a.uses || 0), 0) + S.aiLog.length;
  const mods = Object.keys(AG_MOD_NAME).filter(m => AG.some(a => AG_MODULE(a.id) === m));
  return `${eHead(AI_APP, "X1", ["AI ช่วยจัดการ ทุกโมดูล", "AI assistance, all modules"], ["ทะเบียน Agent ของทุกโมดูลในที่เดียว · ทุก Agent ใช้กฎและข้อมูลตัวอย่าง (จำลอง) ไม่อนุมัติ ไม่จ่ายเงิน ไม่ลงนาม และไม่แก้ยอดเอง", "The agents of every module in one register · all use rules and sample data (simulated); none approves, pays, signs or changes amounts"])}
    ${eKpis([[L("Agent ทั้งหมด", "Agents"), AG.length], [L("เปิดใช้งาน", "Switched on"), on], [L("ครั้งที่ใช้", "Uses"), fmt(runs)], [L("โมดูลที่ครอบคลุม", "Modules covered"), `${mods.length}/7`]])}
    <section class="panel"><header><h2>${L("ผู้ช่วย AI ทำงานร่วม", "AI co-work")}</h2><span class="sp"></span><button class="btn primary" type="button" data-jump="cowork">${L("เปิดแชท AI", "Open the AI chat")}</button><button class="btn" type="button" data-jump="ai-run">${L("รัน Agent โมดูลใหม่", "Run the new agents")}</button></header>
      <div class="body sub">${L("แชทรู้ว่าอยู่หน้าไหนและเรียก Agent เฉพาะทางได้ ส่วน Agent ของแอปองค์กร สัญญา ครุภัณฑ์ และวัสดุ (AG-30 ถึง AG-33) รันที่หน้า X2", "The chat knows the page you are on and can call a specialist agent. The agents of the organization, contract, assets and inventory apps (AG-30 to AG-33) run on page X2")}</div></section>
    ${mods.map(m => `<section class="panel"><header><h2>${esc(tx(AG_MOD_NAME[m]))}</h2><span class="sp"></span><button class="btn ghost" type="button" data-jump="${AG_PAGE[m] || "ai-hub"}">${L("ไปที่โมดูล", "Go to the module")}</button></header>
      <div class="tbl-wrap"><table><thead><tr><th>Agent</th><th>${L("ทำอะไร", "What it does")}</th><th class="n">${L("ครั้งที่ใช้", "Uses")}</th><th>${L("สถานะ", "Status")}</th></tr></thead>
      <tbody>${AG.filter(a => AG_MODULE(a.id) === m).map(a => `<tr><td><span class="mono sub">${a.id}</span> ${esc(tx(a.name))}</td><td class="sub">${esc(tx(a.what))}</td><td class="n">${fmt((a.uses || 0) + S.aiLog.filter(x => x.agent === a.id).length)}</td><td>${a.on ? tagN("p-ok", "เปิด", "On") : tagN("p-mute", "ปิด", "Off")}</td></tr>`).join("")}</tbody></table></div></section>`).join("")}
    ${eNote(L("สวิตช์เปิด/ปิด Agent ตั้งโดยผู้บริหารที่หน้าผู้ช่วย AI งบประมาณ (B11) ทะเบียนนี้อ่านอย่างเดียว · ทุกการใช้บันทึกที่ X3", "Agent switches are set by the executive on the budget AI page (B11). This register is read-only · every use is logged at X3"))}`;
});

ePageDef("ai", "ai-run", "X2", "aig", AI_ROLES, ["รัน Agent โมดูลใหม่", "Run the new agents"], () => {
  const ids = Object.keys(ERP_AGENTS), RO = S.reorder || [];
  return `${eHead(AI_APP, "X2", ["รัน Agent ของแอปที่เพิ่มใหม่", "Run the agents of the added apps"], ["เลือก Agent แล้วกดรัน จะเห็นขั้นตอนที่ทำและสิ่งที่พบ ข้อเสนอที่มีผลต่อข้อมูลหรือส่งถึงคนอื่นต้องกดยืนยันทีละรายการ", "Pick an agent and run it; you see the steps and findings. Anything that changes data or reaches other people needs your confirmation, one by one"])}
    ${ids.map(id => { const a = S.agents.find(x => x.id === id); return `<section class="panel"><header><div><span class="mono sub">${id}</span> <b style="font-weight:600">${esc(tx(a.name))}</b><div class="sub">${esc(tx(a.what))}</div></div><span class="sp"></span>${tag(tx(AG_LEVELS.L2[0]) + " (L2)", "p-info")}<button class="btn primary" type="button" data-airun="${id}" ${a.on ? "" : "disabled"}>${L("รัน", "Run")}</button></header>${aiResultHtml(id)}</section>`; }).join("")}
    <section class="panel"><header><h2>${L("ข้อเสนอเติมสต็อกที่ส่งถึงพัสดุ", "Replenishment proposals sent to procurement")}</h2></header>${RO.length ? `<div class="tbl-wrap"><table><tbody>${RO.map(x => `<tr><td class="mono">${x.id}</td><td>${esc(stockName(x.item))} × ${fmt(x.qty)}</td><td class="n">${fmt(x.est)}</td><td>${x.status === "sent" ? tagN("p-info", "ส่งแล้ว รอพัสดุ", "Sent, awaiting procurement") : tagN("p-ok", "พัสดุรับไปทำใบขอซื้อ", "Taken by procurement")}</td><td>${x.status === "sent" && ROLE === "proc" ? `<button class="btn" type="button" data-rotake="${x.id}">${L("รับไปทำใบขอซื้อ", "Take it to a requisition")}</button> <button class="btn ghost" type="button" data-jump="prc-reqn">${L("ไปที่ P3", "Go to P3")}</button>` : ""}</td></tr>`).join("")}</tbody></table></div>` : `<div class="body sub">${L("ยังไม่มีข้อเสนอ", "No proposals yet")}</div>`}</section>`;
}, () => {
  $$("[data-airun]").forEach(b => (b.onclick = () => { const id = b.dataset.airun, r = ERP_AGENTS[id](); ERP_RES[id] = r; aiLogUse(id, [`รัน ${tx(S.agents.find(a => a.id === id).name)}`, `Ran ${S.agents.find(a => a.id === id).name[1]}`], "ERP-Gov", r.found.length); commit(); route(); }));
  $$("[data-aiapply]").forEach(b => (b.onclick = () => { const [id, i] = b.dataset.aiapply.split("|"), p = ERP_RES[id].props[Number(i)]; if (p.done || !aiCanApply(id)) return; p.apply(); p.done = true; aiLogUse(id, ["ส่งข้อเสนอที่ผู้ใช้ยืนยัน", "Sent a proposal the user confirmed"], p.label.slice(0, 60), 1); commit(); toast(L("ส่งแล้ว", "Sent")); route(); }));
  $$("[data-rotake]").forEach(b => (b.onclick = () => { const x = S.reorder.find(r => r.id === b.dataset.rotake); x.status = "taken"; audit(["พัสดุรับข้อเสนอเติมสต็อก", "Procurement took a replenishment proposal"], x.id); commit(); route(); }));
});

ePageDef("ai", "ai-log", "X3", "aig", AI_ROLES, ["ทะเบียนการใช้ AI", "AI use log"], () => {
  const rows = S.aiLog.slice(0, 120);
  return `${eHead(AI_APP, "X3", ["ทะเบียนการใช้ AI", "AI use log"], ["ทุกครั้งที่ Agent ทำงาน ใคร เมื่อไร ทำอะไร กับอะไร · รวมทุกโมดูล 120 รายการล่าสุด", "Every time an agent worked: who, when, what, on what · all modules, latest 120"])}
    <section class="panel"><div class="tbl-wrap"><table><thead><tr><th>${L("เวลา", "When")}</th><th>Agent</th><th>${L("โมดูล", "Module")}</th><th>${L("ผู้ใช้", "User")}</th><th>${L("การกระทำ", "Action")}</th><th>${L("เป้าหมาย", "Target")}</th></tr></thead>
    <tbody>${rows.map(r => `<tr><td class="sub" style="white-space:nowrap">${fdate(r.t, true)}</td><td class="mono">${esc(r.agent)}</td><td class="sub">${esc(tx(AG_MOD_NAME[AG_MODULE(r.agent)]))}</td><td>${r.user === "system" ? L("ระบบอัตโนมัติ", "Automatic") : esc(userName(r.user))}</td><td>${esc(tx(r.action))}</td><td class="sub">${esc(r.target || "")}</td></tr>`).join("") || `<tr><td colspan="6" class="sub">${L("ยังไม่มีการใช้", "No uses yet")}</td></tr>`}</tbody></table></div></section>`;
});

// ---------- the flow document ----------
NAV.push({ id: "flow", code: "", group: "sys", app: "all", roles: ERP_ROLES, label: ["Flow 9 โมดูล (รวม HR)", "Flows of the 9 modules (with HR)"] });
VIEWS.flow = () => `<div class="head"><div><div class="eyebrow">Fisko-ERP-Gov</div><h1>${L("Flow 9 โมดูล (8 โมดูลและ HR)", "Flows of the 9 modules (8 plus HR)")}</h1><p>${L("ผู้เกี่ยวข้อง ขั้นตอน สถานะ จุดอนุมัติ ข้อมูลเข้า-ออก และการเชื่อมกับโมดูลและระบบภายนอก ของแต่ละโมดูล", "Actors, steps, statuses, approval points, data in and out, and links to other modules and external systems, for each module")}</p></div></div>
  <section class="panel"><div class="body"><p>${L("เอกสาร Flow เป็นไฟล์ HTML แยก (ไฟล์ Flow_9_Modules.html ในโฟลเดอร์เดียวกับระบบ) ใช้ข้อมูลชุดเดียวกับที่เขียนไว้ในโค้ดของแต่ละหน้า", "The flow document is a separate HTML file (Flow_9_Modules.html in the system folder)")}</p>
  <a class="btn primary" href="Flow_9_Modules.html" target="_blank" rel="noopener">${L("เปิดเอกสาร Flow", "Open the flow document")}</a></div></section>`;
BIND.flow = () => {};
