// ERP-Gov, part 5: Inventory (module 7). Written new; had no stock app.
// ERP-Government reference: stock_request, stock_request_tier_validation, stock_card_report, stock_no_negative,
// l10n_th_gov_stock_request, purchase_stock. Rules kept: a request is approved by amount tier, stock can never go
// negative, every change is a stock move shown on the stock card. Costing is a moving average.
const IN_ROLES = ["store", "div", "divhead", "exec", "fin", "audit", "proc", "prochead", "plan", "admin"];
const IN_APP = "DPT Inventory";
const isStore = () => ROLE === "store" || ROLE === "proc" || ROLE === "prochead";
const ST_ITEM = { ok: [["ปกติ", "OK"], "p-ok"], low: [["ต่ำกว่าจุดสั่งซื้อ", "Below reorder point"], "p-warn"], zero: [["หมด", "Out of stock"], "p-bad"], retired: [["เลิกใช้", "Retired"], "p-mute"] };
const SR_ST = { draft: [["ร่าง", "Draft"], "p-mute"], submitted: [["รออนุมัติ", "Awaiting approval"], "p-info"], approved: [["อนุมัติ รอจ่าย", "Approved, to issue"], "p-warn"], issued: [["จ่ายแล้ว", "Issued"], "p-ok"], rejected: [["ไม่อนุมัติ", "Not approved"], "p-bad"], cancelled: [["ยกเลิก", "Cancelled"], "p-mute"] };
const GR_ST = { draft: [["ร่าง", "Draft"], "p-mute"], posted: [["ลงรับแล้ว", "Posted"], "p-ok"], cancelled: [["ยกเลิก", "Cancelled"], "p-mute"] };
const SC_ST = { pending: [["รออนุมัติปรับยอด", "Awaiting approval"], "p-warn"], posted: [["ปรับยอดแล้ว", "Posted"], "p-ok"], rejected: [["ไม่อนุมัติ", "Not approved"], "p-bad"] };
const MV_T = { OPEN: ["ยอดยกมา", "Opening"], IN: ["รับเข้า", "Receipt"], OUT: ["จ่ายออก", "Issue"], ADJ: ["ปรับยอด", "Adjustment"] };
const itemStatus = i => (i.retired ? "retired" : onHand(i.id) <= 0 ? "zero" : onHand(i.id) <= i.reorder ? "low" : "ok");
const itemOpts = (all) => (S.sitems || []).filter(i => !i.retired || all).map(i => [i.id, `${i.id} ${tx(i.name)} (${fmt(onHand(i.id))} ${tx([i.uom, i.uom])})`]);
function addMove(item, type, qty, cost, ref) {
  S.smoves.push({ id: eNextId("MV-", S.smoves), t: nowIso(), item, type, qty, cost, ref, by: me().id });
}
const shortLines = r => r.lines.filter(l => l.qty > onHand(l.item));

function stockCard(itemId) {
  const ms = (S.smoves || []).filter(m => m.item === itemId).sort((a, b) => (a.t < b.t ? -1 : a.t > b.t ? 1 : a.id < b.id ? -1 : 1));
  let bal = 0;
  const rows = ms.map(m => { bal += m.qty; return { m, bal }; });
  return rows.length ? `<div class="tbl-wrap"><table><thead><tr><th>${L("วันที่", "Date")}</th><th>${L("รายการ", "Type")}</th><th>${L("อ้างอิง", "Ref")}</th><th class="n">${L("รับ", "In")}</th><th class="n">${L("จ่าย", "Out")}</th><th class="n">${L("คงเหลือ", "Balance")}</th></tr></thead>
    <tbody>${rows.map(({ m, bal }) => `<tr><td>${fdate(m.t, true)}</td><td>${esc(tx(MV_T[m.type]))}</td><td class="mono">${esc(m.ref)}</td><td class="n">${m.qty > 0 ? fmt(m.qty) : ""}</td><td class="n">${m.qty < 0 ? fmt(-m.qty) : ""}</td><td class="n"><b>${fmt(bal)}</b></td></tr>`).join("")}</tbody></table></div>` : `<span class="sub">${L("ยังไม่มีความเคลื่อนไหว", "No movements yet")}</span>`;
}

CRUD.def("sitem", {
  noun: ["วัสดุ", "Stock item"], st: ST_ITEM, live: false,
  list: () => S.sitems || [], id: i => i.id, title: i => tx(i.name), sub: i => `${tx((STOCK_CATS.find(c => c[0] === i.cat) || [0, ["-", "-"]])[1])} · ${i.loc}`,
  status: itemStatus, gone: i => !!i.retired, search: i => `${i.id} ${i.name.join(" ")} ${i.loc}`,
  filters: [{ id: "cat", label: ["หมวด", "Category"], opts: () => STOCK_CATS.map(c => [c[0], tx(c[1])]), get: i => i.cat }, { id: "st", label: ["สถานะ", "Status"], opts: () => ["ok", "low", "zero"].map(k => [k, tx(ST_ITEM[k][0])]), get: itemStatus }],
  cols: [{ h: ["รหัส", "Code"], c: i => `<span class="mono">${i.id}</span>` }, { h: ["วัสดุ", "Item"], c: i => `<b style="font-weight:600">${esc(tx(i.name))}</b><div class="sub">${esc(i.loc)}</div>` },
    { h: ["คงเหลือ", "On hand"], n: true, c: i => `<b>${fmt(onHand(i.id))}</b> <span class="sub">${esc(i.uom)}</span>` }, { h: ["จุดสั่งซื้อ", "Reorder at"], n: true, c: i => fmt(i.reorder) }, { h: ["ราคาเฉลี่ย (บาท)", "Avg cost (baht)"], n: true, c: i => fmt(i.price, 2) }, { h: ["มูลค่า (บาท)", "Value (baht)"], n: true, c: i => fmt(onHand(i.id) * i.price) }],
  fields: i => [
    { id: "th", label: ["ชื่อ (ไทย)", "Name (Thai)"], req: true, wide: true, value: i ? i.name[0] : "" }, { id: "en", label: ["ชื่อ (อังกฤษ)", "Name (English)"], wide: true, value: i ? i.name[1] : "" },
    { id: "cat", label: ["หมวด", "Category"], type: "select", req: true, value: i ? i.cat : "paper", opts: STOCK_CATS.map(c => [c[0], tx(c[1])]) }, { id: "uom", label: ["หน่วยนับ", "Unit of measure"], req: true, value: i ? i.uom : "" },
    { id: "reorder", label: ["จุดสั่งซื้อ", "Reorder point"], type: "number", req: true, min: 0, value: i ? i.reorder : 0 }, { id: "loc", label: ["ที่เก็บ", "Location"], value: i ? i.loc : "" },
    ...(i ? [] : [{ id: "price", label: ["ราคาต่อหน่วย (บาท)", "Unit cost (baht)"], type: "number", req: true, min: 0, value: "" }, { id: "open", label: ["ยอดยกมา", "Opening quantity"], type: "number", min: 0, value: 0 }]),
  ],
  create: { can: isStore, label: ["เพิ่มวัสดุ", "Add an item"], run: v => { const i = { id: "MT-" + String(maxNo(S.sitems.map(x => x.id), /^MT-(\d+)/) + 1).padStart(3, "0"), name: [v.th, v.en || v.th], cat: v.cat, uom: v.uom, price: v.price, reorder: v.reorder, loc: v.loc };
    S.sitems.push(i); if (v.open > 0) addMove(i.id, "OPEN", v.open, v.price, "ยอดยกมา"); audit(["เพิ่มวัสดุ", "Added a stock item"], `${i.id} ${v.th}`); return i; } },
  edit: { can: i => isStore() && !i.retired, run: (i, v) => { Object.assign(i, { name: [v.th, v.en || v.th], cat: v.cat, uom: v.uom, reorder: v.reorder, loc: v.loc }); audit(["แก้ไขวัสดุ", "Edited a stock item"], `${i.id} ${v.th}`); } },
  acts: i => (!isStore() || i.retired || onHand(i.id) > 0 ? [] : [{ id: "ret", label: L("เลิกใช้", "Retire"), kind: "danger", why: true, run: (x, why) => { x.retired = { t: nowIso(), why }; audit(["เลิกใช้วัสดุ", "Retired a stock item"], `${x.id} · ${why}`); return L("เลิกใช้แล้ว", "Retired"); } }]),
  view: i => kv([[L("คงเหลือ", "On hand"), `<b>${fmt(onHand(i.id))}</b> ${esc(i.uom)}`], [L("จุดสั่งซื้อ", "Reorder point"), fmt(i.reorder)], [L("ราคาเฉลี่ย", "Average cost"), `${fmt(i.price, 2)} ${L("บาท", "baht")}`], [L("มูลค่า", "Value"), baht(onHand(i.id) * i.price)], [L("ที่เก็บ", "Location"), esc(i.loc)],
    i.retired && [L("เลิกใช้", "Retired"), `${fdate(i.retired.t)} · ${esc(i.retired.why)}`]]),
  tabs: i => [["card", L("บัตรคุม", "Stock card"), stockCard(i.id)]],
});

const lineSlots = n => Array.from({ length: n }, (_, k) => k + 1);
CRUD.def("sreq", {
  noun: ["ใบเบิกวัสดุ", "Stock request"], st: SR_ST, live: false,
  list: () => (S.sreqs || []).filter(r => !myUnitOnly() || r.unit === me().unit), id: r => r.id, title: r => `${r.id} · ${unitName(r.unit)}`, sub: r => `${baht(reqValue(r))}`,
  status: r => r.status, gone: r => r.status === "cancelled", search: r => `${r.id} ${unitName(r.unit)} ${r.lines.map(l => stockName(l.item)).join(" ")}`,
  filters: [{ id: "st", label: ["สถานะ", "Status"], opts: () => Object.keys(SR_ST).map(k => [k, tx(SR_ST[k][0])]), get: r => r.status }],
  cols: [{ h: ["เลขที่", "No."], c: r => `<span class="mono">${r.id}</span>` }, { h: ["หน่วยที่เบิก", "Unit"], c: r => esc(unitName(r.unit)) }, { h: ["รายการ", "Lines"], c: r => `<span class="sub">${r.lines.map(l => `${esc(stockName(l.item))} × ${fmt(l.qty)}`).join("<br>")}</span>` },
    { h: ["มูลค่า (บาท)", "Value (baht)"], n: true, c: r => fmt(reqValue(r)) }, { h: ["ผู้อนุมัติ", "Approver"], c: r => `<span class="sub">${esc(tx(ROLES[tierRole("issue", reqValue(r))]))}</span>` }],
  fields: (r, v) => [
    ...lineSlots(3).flatMap(k => [{ id: "item" + k, label: [`วัสดุรายการที่ ${k}`, `Item ${k}`], type: "select", blank: "–", req: k === 1, value: r && r.lines[k - 1] ? r.lines[k - 1].item : "", opts: itemOpts() }, { id: "qty" + k, label: [`จำนวนรายการที่ ${k}`, `Quantity ${k}`], type: "number", min: 0, value: r && r.lines[k - 1] ? r.lines[k - 1].qty : "" }]),
    { id: "why", label: ["เหตุผลที่ขอเบิก (อย่างน้อย 10 ตัวอักษร)", "Why it is needed (at least 10 characters)"], type: "textarea", req: true, wide: true, value: r ? r.why : "" },
  ],
  check: v => { const e = [], ids = []; lineSlots(3).forEach(k => { if (v["item" + k]) { if (!(v["qty" + k] > 0)) e.push({ f: "qty" + k, m: L("ระบุจำนวนมากกว่า 0", "Give a quantity above 0") }); if (ids.includes(v["item" + k])) e.push({ f: "item" + k, m: L("เลือกวัสดุซ้ำ", "Item repeated") }); ids.push(v["item" + k]); } });
    if (!ids.length) e.push({ f: "item1", m: L("ต้องมีอย่างน้อยหนึ่งรายการ", "At least one line is needed") }); if ((v.why || "").length < 10) e.push({ f: "why", m: L("ใส่เหตุผลอย่างน้อย 10 ตัวอักษร", "Give a reason of at least 10 characters") }); return e; },
  create: { can: () => myUnitOnly(), label: ["สร้างใบเบิกวัสดุ", "New stock request"], run: v => { const r = { id: eNextId("SR-", S.sreqs), unit: me().unit, by: me().id, lines: lineSlots(3).filter(k => v["item" + k]).map(k => ({ item: v["item" + k], qty: v["qty" + k] })), why: v.why, status: "draft", t: nowIso() };
    S.sreqs.push(r); audit(["สร้างใบเบิกวัสดุ", "Created a stock request"], `${r.id} ${unitName(r.unit)}`); return r; } },
  edit: { can: r => r.status === "draft" && myUnitOnly() && r.unit === me().unit, run: (r, v) => { r.lines = lineSlots(3).filter(k => v["item" + k]).map(k => ({ item: v["item" + k], qty: v["qty" + k] })); r.why = v.why; audit(["แก้ไขใบเบิกวัสดุ", "Edited a stock request"], r.id); } },
  acts: r => {
    const out = [], val = reqValue(r), need = tierRole("issue", val), mine = myUnitOnly() && r.unit === me().unit;
    if (r.status === "draft" && mine) out.push({ id: "send", label: L("ส่งขออนุมัติ", "Send for approval"), kind: "primary", confirm: `${baht(val)} · ${L("ผู้อนุมัติ", "approver")}: ${tx(ROLES[need])}`, run: x => { x.status = "submitted"; x.sentAt = nowIso(); audit(["ส่งใบเบิกวัสดุ", "Sent a stock request"], x.id); notify([need], [`ใบเบิกวัสดุ ${x.id} รออนุมัติ`, `Stock request ${x.id} awaits approval`], "in-req"); return L("ส่งแล้ว", "Sent"); } },
      { id: "del", label: L("ลบร่าง", "Delete draft"), kind: "danger", why: true, run: (x, why) => { S.sreqs = S.sreqs.filter(y => y !== x); audit(["ลบร่างใบเบิก", "Deleted a stock request draft"], `${x.id} · ${why}`); return L("ลบแล้ว", "Deleted"); } });
    if (r.status === "submitted" && roleIs(need)) out.push({ id: "ok", label: L("อนุมัติ", "Approve"), kind: "primary", confirm: baht(val), run: x => { x.status = "approved"; x.decided = { by: me().id, t: nowIso() }; audit(["อนุมัติใบเบิกวัสดุ", "Approved a stock request"], x.id); notify(["store"], [`ใบเบิก ${x.id} อนุมัติแล้ว รอจ่ายวัสดุ`, `Request ${x.id} approved; ready to issue`], "in-req"); return L("อนุมัติแล้ว", "Approved"); } },
      { id: "no", label: L("ไม่อนุมัติ", "Do not approve"), kind: "danger", why: true, run: (x, why) => { x.status = "rejected"; x.decided = { by: me().id, t: nowIso(), why }; audit(["ไม่อนุมัติใบเบิก", "Stock request not approved"], `${x.id} · ${why}`); return L("บันทึกแล้ว", "Recorded"); } });
    if (r.status === "submitted" && mine) out.push({ id: "wd", label: L("ถอนคำขอ", "Withdraw"), why: true, run: (x, why) => { x.status = "cancelled"; audit(["ถอนใบเบิก", "Withdrew a stock request"], `${x.id} · ${why}`); return L("ถอนแล้ว", "Withdrawn"); } });
    if (r.status === "approved" && isStore()) out.push({ id: "iss", label: L("จ่ายวัสดุ", "Issue stock"), kind: "primary", confirm: shortLines(r).length ? `${L("สต็อกไม่พอ จ่ายไม่ได้", "Not enough stock; cannot issue")}: ${shortLines(r).map(l => stockName(l.item)).join(", ")}` : L("ตัดสต็อกตามใบเบิก", "Deducts the stock"),
      run: x => { const sh = shortLines(x); if (sh.length) return `${L("จ่ายไม่ได้ สต็อกไม่พอ (ห้ามติดลบ)", "Cannot issue: not enough stock (no negative stock)")}: ${sh.map(l => stockName(l.item)).join(", ")}`;
        x.lines.forEach(l => addMove(l.item, "OUT", -l.qty, stockItem(l.item).price, x.id)); x.status = "issued"; x.issued = { by: me().id, t: nowIso() }; audit(["จ่ายวัสดุ", "Issued stock"], x.id); return L("จ่ายวัสดุแล้ว", "Stock issued"); } });
    return out;
  },
  view: r => { const sh = shortLines(r); return kv([[L("หน่วย", "Unit"), esc(unitName(r.unit))], [L("ผู้ขอ", "Requester"), esc(userName(r.by))], [L("เหตุผล", "Reason"), esc(r.why)], [L("มูลค่า", "Value"), baht(reqValue(r))], [L("ผู้อนุมัติตามขั้นวงเงิน", "Approver by tier"), esc(tx(ROLES[tierRole("issue", reqValue(r))]))],
    [L("รายการ", "Lines"), `<div class="tbl-wrap"><table><thead><tr><th>${L("วัสดุ", "Item")}</th><th class="n">${L("ขอ", "Asked")}</th><th class="n">${L("คงเหลือ", "On hand")}</th></tr></thead><tbody>${r.lines.map(l => `<tr><td>${esc(stockName(l.item))}</td><td class="n">${fmt(l.qty)}</td><td class="n">${l.qty > onHand(l.item) && r.status !== "issued" ? `<span style="color:var(--bad)">${fmt(onHand(l.item))}</span>` : fmt(onHand(l.item))}</td></tr>`).join("")}</tbody></table></div>`],
    sh.length && r.status !== "issued" && [L("คำเตือน", "Warning"), L("มีรายการที่สต็อกไม่พอ จ่ายไม่ได้จนกว่าจะรับเข้าเพิ่ม", "Some lines exceed the stock; they cannot be issued until more is received")]]); },
});

CRUD.def("srecv", {
  noun: ["ใบรับวัสดุ", "Goods receipt"], st: GR_ST, live: false,
  list: () => S.srecv || [], id: r => r.id, title: r => `${r.id} · ${r.ref}`, sub: r => r.vendor, status: r => r.status, gone: r => r.status === "cancelled", search: r => `${r.id} ${r.ref} ${r.vendor}`,
  cols: [{ h: ["เลขที่", "No."], c: r => `<span class="mono">${r.id}</span>` }, { h: ["อ้างอิง / ผู้ขาย", "Ref / supplier"], c: r => `<span class="mono">${esc(r.ref)}</span><div class="sub">${esc(r.vendor)}</div>` }, { h: ["วันที่รับ", "Received"], c: r => fdate(r.date) },
    { h: ["รายการ", "Lines"], c: r => `<span class="sub">${r.lines.map(l => `${esc(stockName(l.item))} × ${fmt(l.qty)}`).join("<br>")}</span>` }, { h: ["มูลค่า (บาท)", "Value (baht)"], n: true, c: r => fmt(r.lines.reduce((s, l) => s + l.qty * l.cost, 0)) }],
  fields: (r, v) => [
    { id: "ref", label: ["เลขที่ใบสั่งซื้อ / สัญญา", "PO or contract no."], req: true, value: r ? r.ref : "", hint: L("อ้างจากใบตรวจรับในแอปจัดซื้อ", "From the acceptance record in Procurement") },
    { id: "vendor", label: ["ผู้ขาย", "Supplier"], req: true, value: r ? r.vendor : "" }, { id: "date", label: ["วันที่รับ", "Received on"], type: "date", req: true, value: r ? r.date : TODAY },
    ...lineSlots(2).flatMap(k => [{ id: "item" + k, label: [`วัสดุรายการที่ ${k}`, `Item ${k}`], type: "select", blank: "–", req: k === 1, value: r && r.lines[k - 1] ? r.lines[k - 1].item : "", opts: itemOpts() }, { id: "qty" + k, label: [`จำนวน ${k}`, `Quantity ${k}`], type: "number", min: 0, value: r && r.lines[k - 1] ? r.lines[k - 1].qty : "" }, { id: "cost" + k, label: [`ราคาต่อหน่วย ${k} (บาท)`, `Unit cost ${k} (baht)`], type: "number", min: 0, value: r && r.lines[k - 1] ? r.lines[k - 1].cost : "" }]),
  ],
  check: v => { const e = []; lineSlots(2).forEach(k => { if (v["item" + k] && (!(v["qty" + k] > 0) || !(v["cost" + k] >= 0) || v["cost" + k] === "")) e.push({ f: "qty" + k, m: L("ระบุจำนวนและราคา", "Give quantity and cost") }); }); if (v.date > TODAY) e.push({ f: "date", m: L("วันที่รับต้องไม่เกินวันนี้", "Date can't be in the future") }); return e; },
  create: { can: isStore, label: ["สร้างใบรับวัสดุ", "New goods receipt"], run: v => { const r = { id: eNextId("GR-", S.srecv), ref: v.ref, vendor: v.vendor, date: v.date, lines: lineSlots(2).filter(k => v["item" + k]).map(k => ({ item: v["item" + k], qty: v["qty" + k], cost: v["cost" + k] })), status: "draft", by: me().id, t: nowIso() };
    S.srecv.push(r); audit(["สร้างใบรับวัสดุ", "Created a goods receipt"], `${r.id} ${r.ref}`); return r; } },
  edit: { can: r => isStore() && r.status === "draft", run: (r, v) => { Object.assign(r, { ref: v.ref, vendor: v.vendor, date: v.date, lines: lineSlots(2).filter(k => v["item" + k]).map(k => ({ item: v["item" + k], qty: v["qty" + k], cost: v["cost" + k] })) }); audit(["แก้ไขใบรับวัสดุ", "Edited a goods receipt"], r.id); } },
  acts: r => (!isStore() || r.status !== "draft" ? [] : [{ id: "post", label: L("ลงรับเข้าคลัง", "Post to stock"), kind: "primary", confirm: L("เพิ่มสต็อกและปรับราคาเฉลี่ย ลงรับแล้วแก้ไม่ได้ ใช้การปรับยอดจากการนับแทน", "Adds stock and updates the average cost. A posted receipt can't be edited; use a count adjustment instead"),
    run: x => { x.lines.forEach(l => { const it = stockItem(l.item), q = onHand(l.item), nq = q + l.qty; it.price = Math.round(((q * it.price + l.qty * l.cost) / nq) * 100) / 100; addMove(l.item, "IN", l.qty, l.cost, x.id); }); x.status = "posted"; x.postedAt = nowIso(); audit(["ลงรับวัสดุเข้าคลัง", "Posted a goods receipt"], `${x.id} ${x.ref}`); return L("ลงรับแล้ว", "Posted"); } },
    { id: "del", label: L("ลบร่าง", "Delete draft"), kind: "danger", why: true, run: (x, why) => { S.srecv = S.srecv.filter(y => y !== x); audit(["ลบร่างใบรับ", "Deleted a receipt draft"], `${x.id} · ${why}`); return L("ลบแล้ว", "Deleted"); } }]),
  view: r => kv([[L("อ้างอิง", "Ref"), esc(r.ref)], [L("ผู้ขาย", "Supplier"), esc(r.vendor)], [L("วันที่รับ", "Received"), fdate(r.date)], [L("รายการ", "Lines"), r.lines.map(l => `${esc(stockName(l.item))} × ${fmt(l.qty)} @ ${fmt(l.cost, 2)}`).join("<br>")], [L("มูลค่า", "Value"), baht(r.lines.reduce((s, l) => s + l.qty * l.cost, 0))]]),
});

CRUD.def("scount", {
  noun: ["การปรับยอดจากการนับ", "Count adjustment"], st: SC_ST, live: false,
  list: () => S.scount || [], id: c => c.id, title: c => `${c.id} · ${stockName(c.item)}`, sub: c => `${fmt(c.book)} → ${fmt(c.counted)}`, status: c => c.status, search: c => `${c.id} ${stockName(c.item)}`,
  cols: [{ h: ["เลขที่", "No."], c: c => `<span class="mono">${c.id}</span>` }, { h: ["วัสดุ", "Item"], c: c => esc(stockName(c.item)) }, { h: ["ตามบัญชี", "Book"], n: true, c: c => fmt(c.book) }, { h: ["นับได้", "Counted"], n: true, c: c => fmt(c.counted) }, { h: ["ผลต่าง", "Difference"], n: true, c: c => `<b>${c.diff > 0 ? "+" : ""}${fmt(c.diff)}</b>` }, { h: ["มูลค่า (บาท)", "Value (baht)"], n: true, c: c => fmt(c.value) }],
  fields: () => [{ id: "item", label: ["วัสดุ", "Item"], type: "select", req: true, value: "", opts: itemOpts() }, { id: "counted", label: ["จำนวนที่นับได้", "Counted quantity"], type: "number", req: true, min: 0, value: "" },
    { id: "reason", label: ["สาเหตุของผลต่าง (อย่างน้อย 10 ตัวอักษร)", "Cause of the difference (at least 10 characters)"], type: "textarea", req: true, wide: true, value: "" }],
  check: v => { const e = [], it = stockItem(v.item); if (it && v.counted === onHand(it.id)) e.push({ f: "counted", m: L("ยอดที่นับตรงกับบัญชี ไม่ต้องปรับ", "The count equals the book; nothing to adjust") }); if ((v.reason || "").length < 10) e.push({ f: "reason", m: L("ใส่สาเหตุอย่างน้อย 10 ตัวอักษร", "Give a cause of at least 10 characters") }); return e; },
  create: { can: isStore, label: ["บันทึกผลนับและปรับยอด", "Record a count"], run: v => { const it = stockItem(v.item), book = onHand(it.id), diff = v.counted - book, value = Math.round(Math.abs(diff) * it.price), need = tierRole("adjust", value);
    const c = { id: eNextId("SC-", S.scount), item: it.id, book, counted: v.counted, diff, value, reason: v.reason, status: need === "store" ? "posted" : "pending", by: me().id, t: nowIso() };
    S.scount.push(c); if (c.status === "posted") addMove(it.id, "ADJ", diff, it.price, c.id); else notify([need], [`ปรับยอดวัสดุ ${c.id} รออนุมัติ ${fmt(value)} บาท`, `Stock adjustment ${c.id} awaits approval, ${fmt(value)} baht`], "in-count");
    audit(["บันทึกผลนับวัสดุ", "Recorded a stock count"], `${c.id} ${it.id} ${diff}`); return c; } },
  edit: null,
  acts: c => (c.status !== "pending" || !roleIs(tierRole("adjust", c.value)) ? [] : [{ id: "ok", label: L("อนุมัติปรับยอด", "Approve the adjustment"), kind: "primary", confirm: `${baht(c.value)} · ${fmt(c.diff)}`,
    run: x => { const it = stockItem(x.item); if (onHand(it.id) + x.diff < 0) return L("ปรับแล้วสต็อกติดลบ ทำไม่ได้", "That would make stock negative"); x.status = "posted"; x.decided = { by: me().id, t: nowIso() }; addMove(it.id, "ADJ", x.diff, it.price, x.id); audit(["อนุมัติปรับยอดวัสดุ", "Approved a stock adjustment"], x.id); return L("ปรับยอดแล้ว", "Adjusted"); } },
    { id: "no", label: L("ไม่อนุมัติ", "Do not approve"), kind: "danger", why: true, run: (x, why) => { x.status = "rejected"; audit(["ไม่อนุมัติปรับยอด", "Adjustment not approved"], `${x.id} · ${why}`); return L("บันทึกแล้ว", "Recorded"); } }]),
  view: c => kv([[L("วัสดุ", "Item"), esc(stockName(c.item))], [L("ตามบัญชี → นับได้", "Book → counted"), `${fmt(c.book)} → ${fmt(c.counted)} (${c.diff > 0 ? "+" : ""}${fmt(c.diff)})`], [L("มูลค่าผลต่าง", "Value of the difference"), baht(c.value)], [L("สาเหตุ", "Cause"), esc(c.reason)], [L("ผู้อนุมัติตามขั้นวงเงิน", "Approver by tier"), esc(tx(ROLES[tierRole("adjust", c.value)]))]]),
});

// ---------- pages ----------
ePageDef("inventory", "in-today", "I1", "inv", IN_ROLES, ["งานวัสดุวันนี้", "Inventory today"], () => {
  const I = (S.sitems || []).filter(i => !i.retired), val = I.reduce((s, i) => s + onHand(i.id) * i.price, 0), low = I.filter(stockLow), mine = myTasks().filter(t => typeof t.link === "string" && t.link.startsWith("in-"));
  return `${eHead(IN_APP, "I1", ["งานวัสดุวันนี้", "Inventory today"], ["สต็อก ใบเบิกที่รอ และวัสดุที่ต่ำกว่าจุดสั่งซื้อ · ข้อมูลตัวอย่าง", "Stock, requests waiting and items below the reorder point · sample data"])}
    ${eKpis([[L("รายการวัสดุ", "Items"), I.length], [L("มูลค่าคงคลัง", "Stock value"), fmt(val), L("บาท", "baht")], [L("ต่ำกว่าจุดสั่งซื้อ", "Below reorder point"), low.length, "", low.length > 0], [L("ใบเบิกรอดำเนินการ", "Requests open"), (S.sreqs || []).filter(r => ["submitted", "approved"].includes(r.status)).length], [L("ใบรับร่าง", "Draft receipts"), (S.srecv || []).filter(r => r.status === "draft").length]])}
    ${eInbox(L("งานของฉัน", "My work"), mine)}
    ${low.length ? `<section class="panel"><header><h2>${L("ต่ำกว่าจุดสั่งซื้อ", "Below the reorder point")}</h2></header><div class="tbl-wrap"><table><tbody>${low.map(i => `<tr><td>${dotI(onHand(i.id) <= 0 ? "bad" : "warn")}${esc(tx(i.name))}</td><td class="n">${fmt(onHand(i.id))} / ${fmt(i.reorder)} ${esc(i.uom)}</td></tr>`).join("")}</tbody></table></div></section>` : ""}`;
});
ePageDef("inventory", "in-items", "I2", "inv", IN_ROLES, ["ทะเบียนวัสดุ", "Item register"], () => `${eHead(IN_APP, "I2", ["ทะเบียนวัสดุ", "Item register"], ["รายการวัสดุ ยอดคงเหลือ จุดสั่งซื้อ และราคาเฉลี่ย · เปิดรายการเพื่อดูบัตรคุม", "Items, balances, reorder points and average cost · open one to see its stock card"])}
  ${crudList("sitem", { head: `<h2>${L("วัสดุ", "Items")}</h2>` })}`);
ePageDef("inventory", "in-req", "I3", "inv", IN_ROLES, ["ใบเบิกวัสดุ", "Stock requests"], () => `${eHead(IN_APP, "I3", ["ใบเบิกวัสดุ", "Stock requests"], ["หน่วยขอเบิก อนุมัติตามขั้นวงเงิน (O3) แล้วเจ้าหน้าที่คลังจ่าย · จ่ายเกินสต็อกไม่ได้", "A unit asks, the O3 tier approves, the store issues · stock can't go negative"])}
  ${crudList("sreq", { head: `<h2>${L("ใบเบิก", "Requests")}</h2>`, empty: myUnitOnly() ? L("ยังไม่มีใบเบิก กด สร้างใบเบิกวัสดุ", "No requests yet; create one") : L("ยังไม่มีใบเบิก", "No requests yet") })}`);
ePageDef("inventory", "in-recv", "I4", "inv", IN_ROLES, ["รับวัสดุเข้าคลัง", "Goods receipts"], () => `${eHead(IN_APP, "I4", ["รับวัสดุเข้าคลัง", "Goods receipts"], ["ลงรับวัสดุที่ตรวจรับแล้ว อ้างเลขใบสั่งซื้อหรือสัญญา เพิ่มสต็อกและคิดราคาเฉลี่ยเคลื่อนที่", "Receive accepted goods against a PO or contract; adds stock and recalculates the moving-average cost"])}
  ${crudList("srecv", { head: `<h2>${L("ใบรับวัสดุ", "Receipts")}</h2>` })}`);
let CARD_ITEM = "";
ePageDef("inventory", "in-card", "I5", "inv", IN_ROLES, ["บัตรคุมวัสดุ", "Stock card"], () => {
  const opts = itemOpts(true); if (!CARD_ITEM || !stockItem(CARD_ITEM)) CARD_ITEM = opts.length ? opts[0][0] : "";
  const it = stockItem(CARD_ITEM);
  return `${eHead(IN_APP, "I5", ["บัตรคุมวัสดุ", "Stock card"], ["ทุกการรับ จ่าย และปรับยอดของวัสดุหนึ่งรายการ พร้อมยอดคงเหลือต่อเนื่อง", "Every receipt, issue and adjustment of one item with a running balance"])}
    <section class="panel"><header><select id="card-item" aria-label="${L("วัสดุ", "Item")}">${opts.map(([k, l]) => `<option value="${k}" ${k === CARD_ITEM ? "selected" : ""}>${esc(l)}</option>`).join("")}</select><span class="sp"></span>${it ? `<span class="sub">${L("คงเหลือ", "On hand")} <b>${fmt(onHand(it.id))}</b> ${esc(it.uom)} · ${L("ราคาเฉลี่ย", "avg")} ${fmt(it.price, 2)}</span>` : ""}</header>${it ? stockCard(it.id) : ""}</section>`;
}, () => { const s = $("#card-item"); if (s) s.onchange = () => { CARD_ITEM = s.value; route(); }; });
ePageDef("inventory", "in-count", "I6", "inv", IN_ROLES, ["ตรวจนับและปรับยอด", "Count and adjust"], () => `${eHead(IN_APP, "I6", ["ตรวจนับและปรับยอด", "Count and adjust"], ["บันทึกจำนวนที่นับได้ ระบบปรับยอดเป็นรายการปรับ ผลต่างมูลค่าสูงต้องให้ผู้อนุมัติตามขั้น (O3) เห็นชอบก่อน", "Record the counted quantity; the system posts an adjustment, and a large value needs the O3 approver first"])}
  ${crudList("scount", { head: `<h2>${L("การปรับยอด", "Adjustments")}</h2>` })}`);
