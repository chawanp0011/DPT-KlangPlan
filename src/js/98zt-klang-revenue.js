// Fisko-KlangFinance, budget round B2 (14 Nov 2569): the revenue estimate of the units, and their non-budget funds.
// The menu "Revenue estimate of the units" did not exist (checked: only the Finance app holds receipts, not an estimate made at request time).
// Each division estimates, for the year being prepared, what it expects to collect: State revenue (to be remitted) and Non-budget funds
// (money the unit holds and spends outside the budget act). Planning sees every unit's lines; a unit sees and edits its own. The non-budget lines
// are totalled by unit in the tab "Units' non-budget funds" of the consolidation page (file 98zs). Amounts are typed estimates in baht.
const REVE_KIND = { revenue: [["รายได้แผ่นดิน (นำส่งคลัง)", "State revenue (remitted)"], "p-info"], nonbudget: [["เงินนอกงบประมาณ", "Non-budget funds"], "p-ok"] };
const revEstList = () => (S.revEst || []).filter(x => !unitRole() || x.unit === me().unit);
const revEstOpen = x => fyOpen(x.fy);
const revOwn = x => !unitRole() ? ROLE === "plan" : x.unit === me().unit;
CRUD.def("revEst", {
  noun: ["ประมาณการรายได้หน่วยงาน", "Unit revenue estimate"], st: { live: [["ใช้งาน", "In use"], "p-ok"] }, status: () => "live", gone: () => false, id: x => x.id, title: x => `${tx(x.name)}`, sub: x => `${unitName(x.unit)} · ${x.fy}`,
  list: () => revEstList().slice().sort((a, b) => b.fy - a.fy || String(a.unit).localeCompare(String(b.unit))), search: x => `${x.id} ${tx(x.name)} ${unitName(x.unit)} ${x.note || ""}`,
  filters: [{ id: "u", label: ["สำนัก/กอง", "Division"], opts: () => [...new Set((S.revEst || []).map(x => x.unit))].map(u => [u, unitName(u)]), get: x => x.unit }, { id: "k", label: ["ประเภท", "Kind"], opts: () => Object.keys(REVE_KIND).map(k => [k, tx(REVE_KIND[k][0])]), get: x => x.kind }],
  cols: [{ h: ["เลขที่", "No."], c: x => `<span class="mono">${x.id}</span>` }, { h: ["สำนัก/กอง", "Division"], c: x => esc(unitName(x.unit)) }, { h: ["ประเภท", "Kind"], c: x => tag(tx(REVE_KIND[x.kind][0]), REVE_KIND[x.kind][1]) }, { h: ["รายการ", "Item"], c: x => esc(tx(x.name)) }, { h: ["ปีงบประมาณ", "FY"], c: x => String(x.fy) }, { h: ["ประมาณการ (บาท)", "Estimate (baht)"], n: true, c: x => fmt(x.amount) }],
  fields: x => [{ id: "unit", label: ["สำนัก/กอง", "Division"], type: "select", req: true, value: x ? x.unit : (unitRole() ? me().unit : ""), lock: unitRole() || !!x, show: x && unitName(x.unit), blank: L("— เลือก —", "— choose —"), opts: S.units.filter(u => !unitRole() || u.id === me().unit).map(u => [u.id, unitName(u.id)]) },
    { id: "kind", label: ["ประเภท", "Kind"], type: "select", req: true, value: x ? x.kind : "revenue", opts: Object.keys(REVE_KIND).map(k => [k, tx(REVE_KIND[k][0])]) },
    { id: "fy", label: ["ปีงบประมาณ", "Fiscal year"], type: "select", req: true, value: x ? String(x.fy) : String(FORM_FY), opts: (S.fyList || []).filter(f => f.status !== "closed").map(f => [String(f.fy), String(f.fy)]) },
    { id: "name", label: ["รายการ", "Item"], req: true, wide: true, value: x ? tx(x.name) : "" },
    { id: "amount", label: ["ประมาณการ (บาท)", "Estimate (baht)"], type: "number", min: 1, req: true, value: x ? x.amount : "" },
    { id: "note", label: ["ที่มา / หมายเหตุ", "Basis / note"], wide: true, value: x ? x.note || "" : "" }],
  check: (v, x) => { const o = []; if (v.amount !== "" && !(Number(v.amount) > 0)) o.push({ f: "amount", m: L("ประมาณการต้องมากกว่า 0", "The estimate must be above 0") }); return o; },
  create: { can: () => unitRole() || ROLE === "plan", label: ["เพิ่มประมาณการรายได้", "Add a revenue estimate"], run: v => { const x = { id: (typeof nextId === "function" ? nextId("RE", S.revEst || []) : "RE-" + ((S.revEst || []).length + 1)), unit: unitRole() ? me().unit : v.unit, kind: v.kind, fy: Number(v.fy), name: [v.name, v.name], amount: Number(v.amount), note: v.note || "", by: me().id, t: nowIso() }; (S.revEst = S.revEst || []).push(x); audit(["เพิ่มประมาณการรายได้หน่วยงาน", "Added a unit revenue estimate"], `${x.id} ${unitName(x.unit)} ${fmt(x.amount)}`); return x; } },
  edit: { can: x => revOwn(x) && revEstOpen(x), run: (x, v) => { Object.assign(x, { kind: v.kind, fy: Number(v.fy), name: [v.name, v.name], amount: Number(v.amount), note: v.note || "", by: me().id, t: nowIso() }); audit(["แก้ประมาณการรายได้หน่วยงาน", "Changed a unit revenue estimate"], `${x.id} ${fmt(x.amount)}`); } },
  acts: x => (revOwn(x) && revEstOpen(x) ? [{ id: "del", label: L("ลบ", "Delete"), kind: "danger", confirm: L("ลบประมาณการนี้?", "Delete this estimate?"), run: () => { S.revEst = S.revEst.filter(y => y !== x); audit(["ลบประมาณการรายได้หน่วยงาน", "Deleted a unit revenue estimate"], x.id); return L("ลบแล้ว", "Deleted"); } }] : []),
  view: x => kv([[L("สำนัก/กอง", "Division"), esc(unitName(x.unit))], [L("ประเภท", "Kind"), tx(REVE_KIND[x.kind][0])], [L("ปีงบประมาณ", "Fiscal year"), String(x.fy)], [L("รายการ", "Item"), esc(tx(x.name))], [L("ประมาณการ", "Estimate"), `${fmt(x.amount)} ${L("บาท", "baht")}`], [L("ที่มา / หมายเหตุ", "Basis / note"), esc(x.note || "–")]]),
});
Object.keys(SEEDS).forEach(k => {
  const prev = SEEDS[k].seed;
  SEEDS[k].seed = () => {
    const s = prev(), us = ((s.cons && s.cons.units) || []).map(u => u.unit).slice(0, 5), by = (s.users.find(u => u.role === "plan") || s.users[0]).id; let n = 0; s.revEst = [];
    us.forEach((u, i) => { [["revenue", ["ค่าธรรมเนียมและค่าปรับที่นำส่งคลัง", "Fees and fines remitted to the Treasury"], 2400000 + i * 600000], ...(i % 2 === 0 ? [["nonbudget", ["เงินรับฝากและเงินอุดหนุนจากภายนอก", "Deposits and outside grants"], 3200000 + i * 450000]] : [])].forEach(([kind, name, amount]) => s.revEst.push({ id: `RE-${FORM_FY}-${String(++n).padStart(3, "0")}`, unit: u, kind, fy: FORM_FY, name, amount, note: "ค่าตัวอย่าง คิดจากปีก่อน", by, t: "2026-10-10T09:00" })); });
    return s;
  };
});
ePageDef("budget", "bq-rev", "BQ12", "form", KROLES, ["ประมาณการรายได้หน่วยงาน", "Unit revenue estimate"], () => {
  const all = revEstList().filter(x => x.fy === FORM_FY), sum = k => sumv(all.filter(x => x.kind === k).map(x => x.amount));
  return `${eHead(QT_APP, "BQ12", ["ประมาณการรายได้หน่วยงาน", "Unit revenue estimate"], [`สำนัก/กองประมาณการรายได้ที่คาดว่าจะได้รับในปีงบประมาณ ${FORM_FY} แยกเป็นรายได้แผ่นดินที่ต้องนำส่งคลัง และเงินนอกงบประมาณ กองแผนงานดูของทุกหน่วย ยอดเงินนอกงบประมาณรวมไปแสดงที่หน้ารวมคำขอหน่วยงาน · ตัวเลขเป็นประมาณการที่พิมพ์เอง ไม่ได้ดึงจากระบบการเงิน`, `Each division estimates what it expects to collect in FY${FORM_FY}: state revenue to be remitted and non-budget funds. Planning sees every unit. The non-budget total is shown on the consolidation page · typed estimates, not read from the finance system`])}
  ${eKpis([[L("ประมาณการรายได้แผ่นดิน", "State revenue estimate"), fmt(sum("revenue"))], [L("ประมาณการเงินนอกงบประมาณ", "Non-budget funds estimate"), fmt(sum("nonbudget"))], [L("จำนวนรายการ", "Lines"), String(all.length)]])}
  ${crudList("revEst", { head: `<h2>${L("ประมาณการรายได้ของหน่วยงาน", "Revenue estimates of the units")}</h2>` })}`;
});
Object.assign(NAV_ICON, { "bq-rev": "coins" });
{ const n = NAV.find(x => x.id === "bq-rev"); if (n) { n.group = "form"; NAV.splice(NAV.indexOf(n), 1); const at = NAV.findIndex(x => x.id === "consolidation"); NAV.splice(at + 1, 0, n); n.label = ["ประมาณการรายได้หน่วยงาน", "Unit revenue estimate"]; } }
FY_FORM.push("bq-rev");
// the tab "Units' non-budget funds" of the consolidation page
function revNonBudgetPanel() {
  const rows = (S.revEst || []).filter(x => x.kind === "nonbudget" && x.fy === FORM_FY), units = [...new Set(rows.map(x => x.unit))], tot = sumv(rows.map(x => x.amount));
  return `<section class="kpis" style="grid-template-columns:repeat(3,minmax(0,1fr))"><div class="kpi"><span class="l">${L("เงินนอกงบประมาณรวม", "Non-budget funds total")}</span><span class="v">${fmt(tot / 1e6, 2)}<small>${L("ล้านบาท", "M baht")}</small></span></div><div class="kpi"><span class="l">${L("หน่วยงานที่มี", "Units with funds")}</span><span class="v">${units.length}</span></div><div class="kpi"><span class="l">${L("รายการ", "Lines")}</span><span class="v">${rows.length}</span></div></section>
    <section class="panel"><header><h2>${L(`เงินนอกงบประมาณหน่วยงาน ปี ${FORM_FY}`, `Units' non-budget funds, FY${FORM_FY}`)}</h2><span class="sp"></span><button class="btn" type="button" data-jump="bq-rev">${L("ไปหน้าประมาณการรายได้หน่วยงาน", "Open the unit revenue estimate")}</button></header>
      <div class="tbl-wrap"><table><thead><tr><th>${L("สำนัก/กอง", "Division")}</th><th>${L("รายการ", "Item")}</th><th class="n">${L("ประมาณการ (บาท)", "Estimate (baht)")}</th></tr></thead><tbody>${rows.map(x => `<tr><td>${esc(unitName(x.unit))}</td><td>${esc(tx(x.name))}${x.note ? `<div class="sub">${esc(x.note)}</div>` : ""}</td><td class="n">${fmt(x.amount)}</td></tr>`).join("") || `<tr><td colspan="3" class="sub">${L("ยังไม่มีหน่วยงานบันทึกเงินนอกงบประมาณ", "No unit has recorded non-budget funds yet")}</td></tr>`}</tbody><tfoot><tr><td colspan="2">${L("รวม", "Total")}</td><td class="n">${fmt(tot)}</td></tr></tfoot></table></div></section>`;
}
function revNonBudgetBind() { $$("[data-jump]").forEach(b => (b.onclick = () => { jump(b.dataset.jump); })); }
