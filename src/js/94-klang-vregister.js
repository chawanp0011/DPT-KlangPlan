// Fisko-KlangFinance, round R2: the voucher control register (ทะเบียนคุมใบสำคัญเบิกจ่าย), written new for the DPT finance division.
// It replaces the Google Sheet the division uses to follow each disbursement (MoM 2 Nov 2569, พี่ปุ๊ก): work kind
// (construction, buy/hire, general), budget kind, checking group, five steps (goods received, documents checked, approved,
// keyed for payment, paid), who holds it, how long it has waited, and the receiving unit and date the register adds.
// It reads the vouchers Fisko Finance already has; it does not create them. The role split of accounting, finance and
// budget administration (plan row 4) is NOT done here: it needs the 40-odd `ROLE === "fin"` conditions reworked.
const VR_EDIT = ["fin", "finhead", "vchk1", "vchk2"]; // who may fill the register's own fields; sample assumption, to confirm
const VR_STUCK_DAYS = 7; // sample threshold for "waiting too long"
const VWORK = { build: ["งานก่อสร้าง", "Construction"], buy: ["ซื้อ จ้าง เช่า", "Buy, hire, rent"], gen: ["ซื้อทั่วไปและค่าใช้จ่ายอื่น", "General purchases and other costs"] };
const VBUDGET = { inv: ["งบลงทุน", "Investment"], ope: ["งบดำเนินงาน", "Operating"], nb: ["เงินนอกงบประมาณ", "Non-budget funds"] };
const vrDays = (a, b) => Math.round((new Date(b) - new Date(a)) / 864e5);
function vWork(v) {
  if (v.type !== "proc") return "gen";
  const c = vcCon(v), p = c ? famPlan(c.plan) : null;
  return p && p.kind === "construction" ? "build" : "buy";
}
const vBudget = v => (v.line ? (famLine(v.line).type === "inv" ? "inv" : "ope") : "nb");
const vVisible = v => !(ROLE === "div" || ROLE === "divhead") || (v.reg && v.reg.unit === me().unit) || (v.line && famLine(v.line).unit === me().unit);
const vLast = v => ((v.log || []).slice(-1)[0] || {}).t || v.t || TODAY;
const vAge = v => Math.max(0, vrDays(vLast(v).slice(0, 10), TODAY));
const vOpen = v => ["draft", "returned", "check", "approve", "ready", "posted"].includes(v.state);
// The five steps of the Google Sheet: goods received, documents checked, approved, keyed for payment, paid.
const VSTEPS = [["รับพัสดุ/ตรวจรับงาน", "Goods or work received"], ["ตรวจเอกสารสำคัญ", "Documents checked"], ["เซ็นอนุมัติ", "Approved"], ["คีย์เบิกของการเงิน", "Keyed for payment"], ["เบิกจ่าย", "Paid"]];
function vSteps(v) {
  const s = vState(v), ph = vcPh(v), recv = v.type !== "proc" || !ph || phaseAccepted(ph);
  const cur = s === "cancelled" ? -1 : ["paid", "recon"].includes(s) ? 5 : s === "posted" ? 4 : s === "ready" ? 3 : s === "approve" ? 2 : s === "check" ? 1 : recv ? 1 : 0;
  const done = s === "cancelled" ? 0 : cur >= 5 ? 5 : ["draft", "returned"].includes(s) ? (recv ? 1 : 0) : cur;
  return { cur, done, steps: VSTEPS.map((x, i) => ({ label: x, done: i < done, cur: i === cur && cur < 5 })) };
}
const vHolder = v => { const s = vState(v); return s === "cancelled" || ["paid", "recon"].includes(s) ? ["–", "–"] : s === "check" ? [`ผู้ตรวจใบสำคัญ กลุ่ม ${vcGroup(v)}`, `Voucher checker, group ${vcGroup(v)}`] : s === "approve" ? ["ผู้มีอำนาจอนุมัติ", "Approver"] : ["การเงิน (ผู้ทำใบ)", "Finance (preparer)"]; };
const vBar = v => { const st = vSteps(v); return st.steps.map(x => (x.done ? "●" : x.cur ? "◐" : "○")).join(""); };

CRUD.def("vreg", {
  noun: ["ใบสำคัญ", "Voucher"], st: VST, live: false,
  list: () => (S.vouchers || []).filter(vVisible), id: v => v.id, title: v => `${v.id} · ${tx(v.payee.name)}`, sub: v => tx(v.desc),
  status: v => vState(v), search: v => `${v.id} ${tx(v.payee.name)} ${tx(v.desc)} ${v.reg && v.reg.note || ""}`,
  filters: [{ id: "w", label: ["ประเภทงาน", "Work kind"], opts: () => Object.keys(VWORK).map(k => [k, tx(VWORK[k])]), get: v => vWork(v) }, { id: "b", label: ["ชนิดงบ", "Budget kind"], opts: () => Object.keys(VBUDGET).map(k => [k, tx(VBUDGET[k])]), get: v => vBudget(v) },
    { id: "g", label: ["กลุ่มตรวจ", "Checking group"], opts: () => [["1", L("กลุ่ม 1", "Group 1")], ["2", L("กลุ่ม 2", "Group 2")]], get: v => String(vcGroup(v)) }, { id: "s", label: ["ค้างนาน", "Waiting"], opts: () => [["stuck", L(`ค้างเกิน ${VR_STUCK_DAYS} วัน`, `Over ${VR_STUCK_DAYS} days`)]], get: v => (vOpen(v) && vAge(v) > VR_STUCK_DAYS ? "stuck" : "") }],
  cols: [{ h: ["เลขที่", "No."], c: v => `<span class="mono">${v.id}</span>` }, { h: ["รายการ", "Item"], c: v => `<b style="font-weight:600">${esc(tx(v.desc))}</b><div class="sub">${esc(tx(v.payee.name))}</div>` }, { h: ["ประเภทงาน", "Work"], c: v => esc(tx(VWORK[vWork(v)])) },
    { h: ["ชนิดงบ", "Budget"], c: v => esc(tx(VBUDGET[vBudget(v)])) }, { h: ["กลุ่ม", "Grp"], c: v => vcGroup(v) }, { h: ["ยอดสุทธิ (บาท)", "Net (baht)"], n: true, c: v => fmt(vCalc(v).net, 2) },
    { h: ["5 ขั้น", "5 steps"], c: v => `<span title="${esc(vSteps(v).steps.map(x => tx(x.label)).join(" > "))}" style="letter-spacing:2px">${vBar(v)}</span>` }, { h: ["ค้างที่", "Held by"], c: v => esc(tx(vHolder(v))) },
    { h: ["วันที่ค้าง", "Days"], n: true, c: v => (vOpen(v) ? `${vAge(v)}${vAge(v) > VR_STUCK_DAYS ? " " + tag(L("นาน", "long"), "p-warn") : ""}` : "–") }],
  fields: (v, f) => [{ id: "unit", label: ["สำนัก/กองที่ขอเบิก", "Requesting unit"], type: "select", blank: L("ไม่ระบุ", "Not set"), value: v && v.reg ? v.reg.unit : "", opts: allUnitOpts() },
    { id: "recv", label: ["วันที่กองคลังรับเอกสาร", "Date the division received the documents"], type: "date", value: v && v.reg ? v.reg.recv : "" }, { id: "note", label: ["หมายเหตุ", "Note"], type: "textarea", wide: true, value: v && v.reg ? v.reg.note : "" }],
  check: v => (v.recv && v.recv > TODAY ? [{ f: "recv", m: L("วันที่รับต้องไม่เกินวันนี้", "Date can't be in the future") }] : []),
  edit: { can: () => VR_EDIT.includes(ROLE), why: () => false, run: (v, f) => { v.reg = { unit: f.unit || "", recv: f.recv || "", note: f.note || "" }; audit(["แก้ข้อมูลทะเบียนคุมใบสำคัญ", "Edited voucher register details"], v.id); } },
  view: v => {
    const st = vSteps(v), c = vCalc(v), ph = vcPh(v);
    return kv([[L("เลขที่", "No."), `<span class="mono">${v.id}</span> ${vTag(v)}`], [L("รายการ", "Item"), esc(tx(v.desc))], [L("ผู้รับเงิน", "Payee"), esc(tx(v.payee.name))], [L("ประเภทงาน", "Work kind"), esc(tx(VWORK[vWork(v)]))], [L("ชนิดงบ", "Budget kind"), esc(tx(VBUDGET[vBudget(v)]))],
      [L("กลุ่มตรวจ", "Checking group"), `${vcGroup(v)} ${vcGroup(v) === 2 ? L("(งบลงทุน ก่อสร้าง ที่ปรึกษา หรือจัดซื้อเกิน 100,000 บาท)", "(investment, construction, consultants or procurement above 100,000 baht)") : L("(งบดำเนินงานและอื่น ๆ)", "(operating and others)")}`],
      [L("ยอดรวม / สุทธิ", "Gross / net"), `${baht(v.gross)} / ${baht(c.net)}`], v.contract && [L("สัญญา", "Contract"), `${v.contract}${ph ? " · " + tx(ph.name) : ""}`], [L("สำนัก/กองที่ขอเบิก", "Requesting unit"), v.reg && v.reg.unit ? esc(unitName(v.reg.unit)) : "–"],
      [L("วันที่รับเอกสาร", "Received on"), v.reg && v.reg.recv ? fdate(v.reg.recv) : "–"], v.reg && v.reg.note && [L("หมายเหตุ", "Note"), esc(v.reg.note)], vOpen(v) && [L("ค้างที่", "Held by"), `${esc(tx(vHolder(v)))} · ${vAge(v)} ${L("วัน", "days")}`]])
      + `<ol style="list-style:none;margin:8px 0 0;padding:0">${st.steps.map((x, i) => `<li style="display:flex;gap:10px;align-items:baseline;padding:5px 0;border-bottom:1px solid var(--line)">${dotI(x.done ? "ok" : x.cur ? "warn" : "muted")}<b style="font-weight:600">${i + 1}. ${tx(x.label)}</b>${x.cur ? tag(L("ขั้นปัจจุบัน", "Current step"), "p-warn") : ""}</li>`).join("")}</ol>
      <p class="sub">${L("ขั้นอ่านจากสถานะใบขอเบิกใน Fisko Finance (F3) ไม่ได้ตามผลจริงใน GFMIS หรือ KTB", "Steps are read from the voucher status in Fisko Finance (F3), not from real GFMIS or KTB")}</p>`;
  },
});

function vrCsv() {
  const rows = (S.vouchers || []).filter(vVisible), esc2 = s => `"${String(s == null ? "" : s).replace(/"/g, '""')}"`;
  const head = ["voucher", "item", "payee", "work", "budget", "group", "net", "state", "held_by", "days_waiting", "unit", "received"];
  return "﻿" + [head.join(","), ...rows.map(v => [v.id, tx(v.desc), tx(v.payee.name), tx(VWORK[vWork(v)]), tx(VBUDGET[vBudget(v)]), vcGroup(v), vCalc(v).net, tx(VST[vState(v)][0]), tx(vHolder(v)), vOpen(v) ? vAge(v) : "", v.reg && v.reg.unit ? unitName(v.reg.unit) : "", v.reg && v.reg.recv || ""].map(esc2).join(","))].join("\r\n");
}

// ---------- page ----------
Object.assign(GROUPS, { pvg: ["ทะเบียนคุมใบสำคัญ", "Voucher register"] });
APPS.finance.groups.push("pvg");
{ const base = appOfLink; appOfLink = l => (typeof l === "string" && l.startsWith("pv-") ? "finance" : base(l)); }
ePageDef("finance", "pv-reg", "PV1", "pvg", KROLES, ["ทะเบียนคุมใบสำคัญ", "Voucher register"], () => {
  const V = (S.vouchers || []).filter(vVisible), open = V.filter(vOpen), stuck = open.filter(v => vAge(v) > VR_STUCK_DAYS);
  return `${eHead("DPT Finance", "PV1", ["ทะเบียนคุมใบสำคัญเบิกจ่าย", "Voucher control register"], ["ติดตามใบขอเบิกทุกใบจนเบิกจ่าย ตามที่กองคลังติดตามใน Google Sheet: ประเภทงาน (ก่อสร้าง ซื้อจ้าง ซื้อทั่วไป) ชนิดงบ กลุ่มตรวจ 5 ขั้น ใครถืออยู่ ค้างกี่วัน และวันที่รับเอกสารจากสำนักกอง · อ่านจากใบขอเบิกใน F3 ข้อมูลตัวอย่าง", "Every voucher followed to payment, as the division does in its Google Sheet: work kind, budget kind, checking group, five steps, who holds it, days waiting and the date documents were received from the unit · read from the F3 vouchers; sample data"])}
    ${eKpis([[L("ใบที่ยังไม่จบ", "Open vouchers"), open.length], [L(`ค้างเกิน ${VR_STUCK_DAYS} วัน`, `Over ${VR_STUCK_DAYS} days`), stuck.length, "", stuck.length > 0], [L("รอตรวจ กลุ่ม 1", "To check, group 1"), open.filter(v => v.state === "check" && vcGroup(v) === 1).length], [L("รอตรวจ กลุ่ม 2", "To check, group 2"), open.filter(v => v.state === "check" && vcGroup(v) === 2).length], [L("จ่ายแล้ว", "Paid"), V.filter(v => ["paid", "recon"].includes(vState(v))).length]])}
    <section class="panel"><header><h2>${L("จำนวนใบตามประเภทงานและขั้น", "Vouchers by work kind and step")}</h2><span class="sp"></span><button class="btn" type="button" id="vr-csv">${L("ส่งออก CSV", "Export CSV")}</button></header>
      <div class="tbl-wrap"><table><thead><tr><th></th>${VSTEPS.map((x, i) => `<th class="n">${i + 1}. ${tx(x)}</th>`).join("")}</tr></thead><tbody>${Object.keys(VWORK).map(k => `<tr><td>${esc(tx(VWORK[k]))}</td>${VSTEPS.map((x, i) => { const n = open.filter(v => vWork(v) === k && vSteps(v).cur === i).length; return `<td class="n">${n || "–"}</td>`; }).join("")}</tr>`).join("")}</tbody></table></div>
      <div class="body sub">${L("นับใบที่ยังไม่จบ ตามขั้นที่ใบอยู่ตอนนี้ (ใบที่จ่ายแล้วไม่นับ)", "Counts open vouchers by the step they are at now (paid ones are not counted)")}</div></section>
    ${crudList("vreg", { head: `<h2>${L("ใบสำคัญ", "Vouchers")}</h2>` })}`;
}, () => {
  const b = $("#vr-csv"); if (b) b.onclick = () => { const blob = new Blob([vrCsv()], { type: "text/csv;charset=utf-8" }), a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `voucher-register-${TODAY}.csv`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); audit(["ส่งออกทะเบียนคุมใบสำคัญ", "Exported the voucher register"], "CSV"); commit(); };
});
{
  const base = famTasks;
  famTasks = R => {
    base(R);
    if (!S.vouchers || !VR_EDIT.includes(ROLE)) return;
    const stuck = S.vouchers.filter(v => vOpen(v) && vAge(v) > VR_STUCK_DAYS); if (stuck.length) R(L(`ใบขอเบิกค้างเกิน ${VR_STUCK_DAYS} วัน ${stuck.length} ใบ`, `${stuck.length} vouchers waiting over ${VR_STUCK_DAYS} days`), stuck.slice(0, 3).map(v => v.id).join(", "), TODAY, "pv-reg", "p-warn");
  };
}
Object.assign(NAV_ICON, { "pv-reg": "clipboard" });
