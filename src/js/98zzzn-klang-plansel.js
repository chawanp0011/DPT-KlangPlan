// KlangFinance, procurement round P28 (17 Nov 2569): the procurement plan is made by CHOOSING THE BUDGET ITEM ("กองแผนแค่เข้ามากดเลือกรายการงบประมาณได้เลย แล้วส่งให้ ผอ.อนุมัติได้เลย").
// The form that asked for the name, the category, the quantity, the unit, the estimate, the method, the date, the duration and the note is gone (planAddForm of file 60). What is left: find and
// pick an allocation line (M06) and press "Add to the plan". The item is made from the line, and Planning can then send it to the director of the Planning division for approval (file 98zzzj).
//   the name is the name of the budget line; the estimate is what is left on the line (the room of the line less the items still only planned on it); the category follows the kind of the line (investment: equipment,
//   otherwise services; Planning can say otherwise on the row later); the method follows the amount (up to the ceiling of the specific method, else e-bidding); the planned date is 60 days from today.
// A line with nothing left to plan is refused. Only Planning adds items.
const planLeft = l => Math.max(0, (Number(famHeadroom(l.id)) || 0) - sumv((S.pplan || []).filter(p => p.line === l.id && p.status === "planned").map(p => Number(p.est) || 0))); // what the line can still carry: its room (after contracts and requisitions) less the items still only planned
function planAddFromLine(lineId) { // "" when it worked, else the reason (the page and the tests share the rules)
  if (!isPlanRole()) return L("เฉพาะกองแผนงานเพิ่มรายการในแผนได้", "Only Planning adds plan items");
  const l = famLines().find(x => x.id === lineId); if (!l) return L("เลือกรายการงบประมาณก่อน", "Choose a budget item first");
  const est = Math.floor(planLeft(l) / 1000) * 1000; if (!(est > 0)) return L("รายการงบประมาณนี้วางแผนครบวงเงินแล้ว", "This budget item is already planned in full");
  const nm = tx(l.name), p = { id: nextId("PP", S.pplan), line: l.id, name: [nm, l.name[1] || nm], est, method: est <= (S.pcfg.specificMax || 5e5) ? "specific" : "ebid", month: addDays(TODAY, 60), by: me().id, status: "planned", egp: null, qty: 1, unitName: "งาน", months: 3, note: "", ap: { st: "none" } };
  p.cat = l.type === "inv" ? "C01" : "C02"; p.kind = (S.pcat.find(c => c.id === p.cat) || {}).kind || guessKind(l, p.name);
  p.pid = pidNew(); S.pjrows.push({ id: eNextId("BR-", S.pjrows), pid: p.pid, fy: FAM_FY, code: "ตัวอย่าง-" + p.line, fund: "act", gf: true, amount: p.est });
  S.pplan.push(p); caseNew(p); audit(["เลือกรายการงบประมาณเข้าแผนจัดซื้อ", "Picked a budget item into the procurement plan"], `${p.id} ${nm} · ${l.id}`);
  return "";
}
planAddForm = function (lines) {
  const lq = PLAN_LQ.trim().toLowerCase(), ls = lines.filter(l => !lq || (lineLabel(l) + " " + l.id).toLowerCase().includes(lq));
  return `<div class="body" style="border-bottom:1px solid var(--line)"><form id="pp-form" style="display:flex;flex-direction:column;gap:12px">
    <div class="row" style="align-items:flex-end">
      <div class="f" style="flex:1 1 200px"><label for="pp-lq">${L("ค้นหารายการงบประมาณ", "Find a budget item")}</label><input type="search" id="pp-lq" value="${esc(PLAN_LQ)}" placeholder="${esc(L("ชื่อหน่วยงาน/รายการ", "Unit or item"))}"></div>
      <div class="f" style="flex:3 1 340px"><label for="pp-line">${L("รายการงบประมาณ (จากการจัดสรร M06)", "Budget item (from the allocation, M06)")} <span class="sub" id="pp-lcnt">${ls.length}/${lines.length}</span></label><select id="pp-line">${ls.map(l => `<option value="${l.id}">${esc(lineLabel(l))} · ${mb(l.amount)}${planLeft(l) < l.amount ? " · " + L("เหลือวางแผน", "left") + " " + mb(planLeft(l)) : ""}</option>`).join("")}</select></div>
      <div><button class="btn primary" type="submit">+ ${L("เพิ่มในแผน", "Add to the plan")}</button></div></div>
    <div class="sub" id="pp-room">${L("เลือกรายการงบประมาณแล้วกดเพิ่ม ระบบใส่ชื่อ วงเงินที่เหลือ หมวด และวิธีจัดซื้อให้ จากนั้นกดส่ง ผอ.กองแผนงานอนุมัติที่แถวของรายการ", "Pick a budget item and press add; the name, the amount left, the category and the method are filled in. Then send it to the Planning director from its row")}</div></form></div>`;
};
{
  const bb = BIND.procurement;
  BIND.procurement = () => {
    bb(); const pf = $("#pp-form"); if (!pf) return;
    pf.onsubmit = e => { e.preventDefault(); const m = planAddFromLine($("#pp-line").value); if (m) { toast(m); return; } commit(); PLAN_Q = ""; PLAN_FS = ""; PLAN_PG = Math.ceil(S.pplan.length / PLAN_PS); route(); toast(L("เพิ่มในแผนแล้ว", "Added to the plan")); };
  };
}
