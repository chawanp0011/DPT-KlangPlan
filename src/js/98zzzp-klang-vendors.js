// Fisko-KlangFinance, procurement round P30 (17 Nov 2569): the register of contractors and suppliers ("ปรับวิธีการเพิ่มทะเบียนผู้ขายใหม่ ให้ปุ่มเพิ่มอยู่ด้านบน", more details
// kept for each, a fuller history, and the name "ผู้รับจ้าง/ผู้ขาย"):
//   1. The add button is at the top of the register (not a form under the table). It opens the form at the top; the same form edits a vendor.
//   2. The details kept (v.*): registration date regDate, registered capital capital (baht), how many projects it can take at once maxProj, the most work in hand maxAmt (baht),
//      address, phone, e-mail, web site, the signing director signer, VAT registered vat, e-GP registration number egpNo, bank account bank = { name, branch, acc }, the kinds of work it
//      takes cats (the categories of the procurement plan), and a note; with the ones that were there (name, tax ID, type, SME, local, contact).
//   3. The capacity is shown against the work in hand: the projects in hand (contracts not closed, and awards waiting for the contract) against maxProj, and their value against maxAmt;
//      over either is flagged. It does not block an award (the officer decides); it is shown on the register and on the vendor.
//   4. The history of a vendor (the row opens it): every project, with the case and the contract, the state (waiting to deliver, delivering, accepted, paid in full, closed, handed on,
//      terminated, or won and waiting for the contract), the delivery (phases delivered and accepted, days late), the payment (occasions, paid, still to pay), the penalty and the rating;
//      and how many bids it made and won.
//   5. The page and its texts say "ผู้รับจ้าง/ผู้ขาย" (contractor / supplier).
// Only procurement (proc, prochead) adds and edits; finance and audit read. The details of the sample vendors are samples of mine.
const VD = { add: false, edit: null, open: null };
const VD_NAME = () => L("ผู้รับจ้าง/ผู้ขาย", "Contractor / supplier");
const vdOpen = id => (S.vendors || []).find(v => v.id === id);
const vdCats = v => (v.cats || []).map(id => (S.pcat || []).find(c => c.id === id)).filter(Boolean).map(c => tx(c.name));
function vendorProjects(v) { // every project of the vendor: the contracts, and the awards still waiting for a contract
  const nn = normName(v.name), rows = [];
  S.contracts.filter(c => normName(tx(c.vendor)) === nn).forEach(c => {
    const cs = S.cases.find(x => x.contract === c.id), live = c.phases.filter(ph => !ph.cancelled), vs = (S.vouchers || []).filter(x => x.contract === c.id && !["cancelled", "rejected"].includes(x.state)),
      paid = sumv(vs.filter(x => x.state === "paid").map(x => x.gross - (x.penalty || 0))), asked = sumv(vs.filter(x => x.state !== "paid").map(x => x.gross - (x.penalty || 0))),
      dlv = live.filter(ph => ph.delivered || phaseAccepted(ph)).length, acc = live.filter(phaseAccepted).length, paidPh = live.filter(ph => phPaid(c, ph)).length;
    let st = ["wait", L("ลงนามแล้ว รอส่งมอบ", "Signed, waiting to deliver"), "p-info"];
    if (c.status === "terminated") st = ["term", L("บอกเลิกสัญญา", "Terminated"), "p-bad"];
    else if (cs && cs.close) st = c.handover ? ["hand", L("ส่งมอบต่อแล้ว", "Handed on"), "p-ok"] : ["closed", L("ปิดการจัดซื้อแล้ว", "Closed"), "p-ok"];
    else if (live.length && paidPh === live.length) st = ["paid", L("เบิกจ่ายครบ รอปิดการจัดซื้อ", "Paid in full, to close"), "p-ok"];
    else if (live.length && acc === live.length) st = ["acc", L("ตรวจรับครบ รอเบิกจ่าย", "All accepted, to pay"), "p-info"];
    else if (dlv) st = ["dlv", L("กำลังส่งมอบ", "Delivering"), "p-info"];
    else if (!c.guarantee && !(cs && cs.state >= 12)) st = ["guar", L("ลงนามแล้ว รอบันทึกหลักประกัน", "Signed, guarantee not recorded"), "p-warn"];
    rows.push({ k: "contract", con: c, cs, name: cs ? tx(famPlan(cs.plan).name) : c.no, no: c.no, signed: c.signed, amount: c.amount, st, ph: live.length, dlv, acc, late: sumv(live.map(phLate)), occ: vs.length, paid, asked, pen: conPenalty(c), score: cs && cs.close && typeof cs.close.score === "number" ? cs.close.score : null, open: !(cs && cs.close) && c.status !== "terminated" });
  });
  S.cases.filter(x => !x.contract && !x.cancelled && x.award && x.award.winner && normName(tx(x.award.winner)) === nn).forEach(x => rows.push({ k: "award", con: null, cs: x, name: tx(famPlan(x.plan).name), no: "–", signed: "", amount: x.award.price, st: ["award", L("ชนะการเสนอราคา รอทำสัญญา", "Won the bid, waiting for the contract"), "p-warn"], ph: 0, dlv: 0, acc: 0, late: 0, occ: 0, paid: 0, asked: 0, pen: 0, score: null, open: true }));
  return rows.sort((a, b) => String(b.signed || "9999").localeCompare(String(a.signed || "9999")));
}
function vendorLoad(v) { const p = vendorProjects(v).filter(r => r.open); return { n: p.length, value: sumv(p.map(r => r.amount)) }; }
function vendorOver(v) { const l = vendorLoad(v); return { proj: v.maxProj != null && v.maxProj !== "" && l.n > Number(v.maxProj), amt: v.maxAmt != null && v.maxAmt !== "" && l.value > Number(v.maxAmt) }; }
function vendorBids(v) { const nn = normName(v.name), cs = S.cases.filter(x => (x.bids || []).some(b => normName(b.name) === nn)); return { n: cs.length, won: cs.filter(x => x.award && x.award.winner && normName(tx(x.award.winner)) === nn).length }; }
// save: "" when it worked, else the reason (the page and the tests share the rules)
function vendorSave(o, id) {
  if (!isProcRole()) return L("เฉพาะเจ้าหน้าที่พัสดุเพิ่มหรือแก้ทะเบียนได้", "Only procurement adds or edits the register");
  const g = k => (o[k] == null ? "" : String(o[k]).trim()), num = k => (g(k) === "" ? null : Number(g(k).replace(/,/g, "")));
  const name = g("name"), taxId = g("taxId"), cur = id ? vdOpen(id) : null; if (id && !cur) return L("ไม่พบผู้รับจ้าง/ผู้ขาย", "Not found");
  if (!name) return L("ใส่ชื่อ", "Give the name"); if (!taxOk(taxId)) return L("เลขประจำตัวผู้เสียภาษีไม่ถูกต้อง (13 หลักและหลักตรวจสอบ)", "The tax ID isn't valid (13 digits with a check digit)");
  if (S.vendors.some(x => x !== cur && (x.taxId === taxId || normName(x.name) === normName(name)))) return L("มีรายนี้ในทะเบียนแล้ว", "This one is already registered");
  if (!VTYPE[g("type") || "company"]) return L("ประเภทไม่ถูกต้อง", "The type is not valid");
  if (g("regDate") && (!/^\d{4}-\d{2}-\d{2}$/.test(g("regDate")) || isNaN(Date.parse(g("regDate"))))) return L("วันที่จดทะเบียนไม่ถูกต้อง", "The registration date is not valid"); if (g("regDate") > TODAY) return L("วันที่จดทะเบียนเป็นวันในอนาคตไม่ได้", "The registration date can't be in the future");
  for (const [k, th, en] of [["capital", "ทุนจดทะเบียน", "Registered capital"], ["maxAmt", "ยอดเงินที่รับได้", "Amount it can take"], ["maxProj", "จำนวนโครงการที่รับได้", "Projects it can take"]]) { const n = num(k); if (g(k) !== "" && (!isFinite(n) || n < 0)) return `${L(th, en)}: ${L("ต้องเป็นตัวเลขไม่ติดลบ", "must be a number, not negative")}`; if (k === "maxProj" && n != null && n !== Math.floor(n)) return `${L(th, en)}: ${L("ต้องเป็นจำนวนเต็ม", "must be a whole number")}`; }
  if (g("email") && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(g("email"))) return L("อีเมลไม่ถูกต้อง", "The e-mail is not valid"); if (g("phone") && !/^[0-9+\-\s()#]{6,20}$/.test(g("phone"))) return L("เบอร์โทรไม่ถูกต้อง", "The phone number is not valid");
  const acc = g("bankAcc").replace(/[-\s]/g, ""); if (acc && !/^\d{10,15}$/.test(acc)) return L("เลขที่บัญชีต้องเป็นตัวเลข 10–15 หลัก", "The account number must be 10 to 15 digits");
  const cats = (Array.isArray(o.cats) ? o.cats : []).filter(c => (S.pcat || []).some(p => p.id === c)); if ((Array.isArray(o.cats) ? o.cats : []).length !== cats.length) return L("หมวดงานไม่ถูกต้อง", "A category is not valid");
  const v = cur || { id: "V-" + String(Math.max(0, ...S.vendors.map(x => Number(String(x.id).replace(/\D/g, "")) || 0)) + 1).padStart(3, "0"), status: "active" };
  Object.assign(v, { name, taxId, type: g("type") || "company", sme: !!o.sme, local: !!o.local, contact: g("contact"), regDate: g("regDate"), capital: num("capital"), maxProj: num("maxProj"), maxAmt: num("maxAmt"), address: g("address"), phone: g("phone"), email: g("email"), web: g("web"), signer: g("signer"), vat: !!o.vat, egpNo: g("egpNo"), bank: { name: g("bankName"), branch: g("bankBranch"), acc }, cats, note: g("note") });
  if (!cur) S.vendors.push(v); audit(cur ? ["แก้ทะเบียนผู้รับจ้าง/ผู้ขาย", "Edited a contractor / supplier"] : ["เพิ่มผู้รับจ้าง/ผู้ขายในทะเบียน", "Registered a contractor / supplier"], `${v.id} ${name}`); return "";
}
const vdInp = (id, label, val, o) => { o = o || {}; return `<div class="f" style="flex:${o.flex || "1 1 200px"}"><label for="vd-${id}">${label}</label><input ${o.type ? `type="${o.type}"` : 'type="text"'} id="vd-${id}" value="${esc(val == null ? "" : val)}" ${o.attrs || ""}></div>`; };
function vdForm(v) {
  const cats = v ? v.cats || [] : [], bk = (v && v.bank) || {};
  return `<section class="panel" id="vd-formbox"><header><h2>${v ? `${L("แก้ไข", "Edit")} ${esc(v.name)}` : `${L("เพิ่ม", "Add a")}${VD_NAME()}`}</h2><span class="sp"></span><button class="btn ghost" type="button" id="vd-cancel">${L("ปิดฟอร์ม", "Close")}</button></header>
    <div class="body"><form id="vd-form" style="display:flex;flex-direction:column;gap:14px">
    <div><b style="font-weight:600">${L("ข้อมูลทั่วไป", "General")}</b><div class="row" style="align-items:flex-end;margin-top:6px">${vdInp("n", L("ชื่อ", "Name") + " *", v && v.name, { flex: "2 1 260px", attrs: "required" })}${vdInp("t", L("เลขประจำตัวผู้เสียภาษี 13 หลัก", "13-digit tax ID") + " *", v && v.taxId, { flex: "0 1 190px", attrs: 'inputmode="numeric" maxlength="13" required' })}
      <div class="f" style="flex:0 1 170px"><label for="vd-ty">${L("ประเภท", "Type")}</label><select id="vd-ty">${Object.keys(VTYPE).map(k => `<option value="${k}" ${v && v.type === k ? "selected" : ""}>${tx(VTYPE[k])}</option>`).join("")}</select></div>
      <label class="field-inline"><input type="checkbox" id="vd-sme" ${v && v.sme ? "checked" : ""}> SME</label><label class="field-inline"><input type="checkbox" id="vd-loc" ${v && v.local ? "checked" : ""}> ${L("ในพื้นที่", "Local")}</label><label class="field-inline"><input type="checkbox" id="vd-vat" ${v && v.vat ? "checked" : ""}> ${L("จดภาษีมูลค่าเพิ่ม", "VAT registered")}</label></div>
      <div class="row" style="align-items:flex-end;margin-top:6px">${vdInp("rd", L("วันที่จดทะเบียน", "Registration date"), v && v.regDate, { type: "date", flex: "0 1 170px", attrs: `max="${TODAY}"` })}${vdInp("cap", L("ทุนจดทะเบียน (บาท)", "Registered capital (baht)"), v && v.capital, { type: "number", flex: "0 1 200px", attrs: 'min="0" step="1000"' })}${vdInp("egp", L("เลขทะเบียนผู้ประกอบการใน e-GP", "e-GP registration no."), v && v.egpNo, { flex: "0 1 220px" })}</div></div>
    <div><b style="font-weight:600">${L("ความสามารถในการรับงาน", "Capacity")}</b> <span class="sub">${L("เทียบกับงานที่ถืออยู่เพื่อเตือนเมื่อเกิน ไม่ห้ามการจัดจ้าง", "compared with the work in hand to warn; it does not block an award")}</span><div class="row" style="align-items:flex-end;margin-top:6px">${vdInp("mp", L("รับได้พร้อมกัน (โครงการ)", "Projects at once"), v && v.maxProj, { type: "number", flex: "0 1 200px", attrs: 'min="0" step="1"' })}${vdInp("ma", L("ยอดเงินงานคงค้างที่รับได้ (บาท)", "Work in hand it can take (baht)"), v && v.maxAmt, { type: "number", flex: "0 1 260px", attrs: 'min="0" step="1000"' })}</div></div>
    <div><b style="font-weight:600">${L("ข้อมูลติดต่อ", "Contact")}</b><div class="row" style="align-items:flex-end;margin-top:6px">${vdInp("ad", L("ที่อยู่ที่จดทะเบียน", "Registered address"), v && v.address, { flex: "3 1 340px" })}${vdInp("ph", L("โทรศัพท์", "Phone"), v && v.phone, { flex: "0 1 160px" })}${vdInp("em", L("อีเมล", "E-mail"), v && v.email, { flex: "1 1 200px" })}${vdInp("wb", L("เว็บไซต์", "Web site"), v && v.web, { flex: "1 1 180px" })}</div>
      <div class="row" style="align-items:flex-end;margin-top:6px">${vdInp("c", L("ผู้ติดต่อ", "Contact person"), v && v.contact, { flex: "1 1 200px" })}${vdInp("sg", L("ผู้มีอำนาจลงนาม", "Signing director"), v && v.signer, { flex: "1 1 260px" })}</div></div>
    <div><b style="font-weight:600">${L("บัญชีธนาคารรับเงิน", "Bank account")}</b><div class="row" style="align-items:flex-end;margin-top:6px">${vdInp("bn", L("ธนาคาร", "Bank"), bk.name, { flex: "1 1 220px" })}${vdInp("bb", L("สาขา", "Branch"), bk.branch, { flex: "1 1 180px" })}${vdInp("ba", L("เลขที่บัญชี", "Account no."), bk.acc, { flex: "0 1 200px", attrs: 'inputmode="numeric" maxlength="17"' })}</div></div>
    <div><b style="font-weight:600">${L("หมวดงานที่รับ", "Kinds of work")}</b><div class="row" style="flex-wrap:wrap;margin-top:6px">${(S.pcat || []).map(c => `<label class="field-inline"><input type="checkbox" name="vd-cat" value="${c.id}" ${cats.includes(c.id) ? "checked" : ""}> ${esc(tx(c.name))}</label>`).join("")}</div></div>
    ${vdInp("nt", L("หมายเหตุ", "Note"), v && v.note, { flex: "1 1 100%" })}
    <div class="row"><button class="btn primary" type="submit">${v ? L("บันทึก", "Save") : "+ " + L("เพิ่มในทะเบียน", "Add to the register")}</button></div></form></div></section>`;
}
function vdDetail(v) {
  const P = vendorProjects(v), h = vendorHist(v.name), ld = vendorLoad(v), ov = vendorOver(v), bd = vendorBids(v), pr = isProcRole(), bl = blHit(v.name), paid = sumv(P.map(r => r.paid)), asked = sumv(P.map(r => r.asked));
  const card = (l, val, d, bad) => `<div class="kpi"><span class="l">${l}</span><span class="v" ${bad ? 'style="color:var(--bad)"' : ""}>${val}</span>${d ? `<span class="d sub">${d}</span>` : ""}</div>`;
  const kvr = (l, x) => `<tr><td class="sub" style="width:190px">${l}</td><td>${x || "<span class=\"sub\">–</span>"}</td></tr>`;
  return `<section class="panel" id="vd-detail"><header><h2>${esc(v.name)}</h2>${bl ? tag(L("อยู่ในรายชื่อผู้ทิ้งงาน", "On the list"), "p-bad") : tag(L("ปกติ", "Active"), "p-ok")}<span class="sp"></span>${pr ? `<button class="btn" type="button" data-vdedit="${v.id}">${L("แก้ไขข้อมูล", "Edit")}</button>` : ""}<button class="btn ghost" type="button" id="vd-close">${L("ปิด", "Close")}</button></header>
    <div class="kpis" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr));margin:12px 14px">${card(L("โครงการในมือ", "Projects in hand"), `${ld.n}${v.maxProj != null && v.maxProj !== "" ? ` / ${fmt(v.maxProj)}` : ""}`, v.maxProj != null && v.maxProj !== "" ? (ov.proj ? L("เกินที่รับได้", "over its limit") : L("ในกำลังรับงาน", "within its limit")) : L("ไม่ได้กำหนดเพดาน", "no limit set"), ov.proj)}
      ${card(L("มูลค่างานในมือ (ลบ.)", "Work in hand (M)"), `${mb(ld.value)}${v.maxAmt != null && v.maxAmt !== "" ? ` / ${mb(v.maxAmt)}` : ""}`, v.maxAmt != null && v.maxAmt !== "" ? (ov.amt ? L("เกินที่รับได้", "over its limit") : L("ในกำลังรับงาน", "within its limit")) : L("ไม่ได้กำหนดเพดาน", "no limit set"), ov.amt)}
      ${card(L("สัญญาทั้งหมด", "All contracts"), h.n, `${mb(h.value)} ${L("ลบ.", "M")}`)}${card(L("เบิกจ่ายแล้ว (บาท)", "Paid (baht)"), fmt(paid), asked ? `${L("อยู่ระหว่างเบิก", "in process")} ${fmt(asked)}` : "")}${card(L("ส่งงานล่าช้า (วัน)", "Late (days)"), h.late, `${L("ค่าปรับ", "penalty")} ${fmt(h.pen)} ${L("บาท", "baht")}`, h.late > 0)}${card(L("คะแนนเฉลี่ย", "Average score"), h.score == null ? "–" : fmt(h.score, 1), `${L("เสนอราคา", "bids")} ${bd.n} · ${L("ชนะ", "won")} ${bd.won}`)}</div>
    <div class="tbl-wrap"><table><tbody>${kvr(L("เลขประจำตัวผู้เสียภาษี", "Tax ID"), `<span class="mono">${esc(v.taxId)}</span>`)}${kvr(L("ประเภท", "Type"), `${tx(VTYPE[v.type] || ["–", "–"])}${v.sme ? " · SME" : ""}${v.local ? ` · ${L("ในพื้นที่", "local")}` : ""}${v.vat ? ` · ${L("จดภาษีมูลค่าเพิ่ม", "VAT registered")}` : ""}`)}${kvr(L("วันที่จดทะเบียน", "Registered on"), v.regDate ? `${fdate(v.regDate)} (${L("อายุกิจการ", "age")} ${Math.floor((new Date(TODAY) - new Date(v.regDate)) / 3.156e10)} ${L("ปี", "yrs")})` : "")}${kvr(L("ทุนจดทะเบียน", "Registered capital"), v.capital != null && v.capital !== "" ? `${fmt(v.capital)} ${L("บาท", "baht")}` : "")}${kvr(L("เลขทะเบียน e-GP", "e-GP no."), esc(v.egpNo || ""))}
      ${kvr(L("ที่อยู่ที่จดทะเบียน", "Address"), esc(v.address || ""))}${kvr(L("ติดต่อ", "Contact"), [v.contact, v.phone, v.email, v.web].filter(Boolean).map(esc).join(" · "))}${kvr(L("ผู้มีอำนาจลงนาม", "Signing director"), esc(v.signer || ""))}${kvr(L("บัญชีธนาคาร", "Bank"), v.bank && (v.bank.name || v.bank.acc) ? `${esc(v.bank.name || "")} ${esc(v.bank.branch || "")} · <span class="mono">${esc(v.bank.acc || "")}</span>` : "")}${kvr(L("หมวดงานที่รับ", "Kinds of work"), vdCats(v).map(x => tag(esc(x), "p-mute")).join(" "))}${kvr(L("หมายเหตุ", "Note"), esc(v.note || ""))}</tbody></table></div>
    <div class="body" style="padding-bottom:0"><b style="font-weight:600">${L("ประวัติโครงการ", "Project history")}</b> <span class="sub">${P.length} ${L("โครงการ", "projects")} · ${L("เข้าร่วมเสนอราคา", "bid in")} ${bd.n} ${L("ครั้ง ชนะ", "times, won")} ${bd.won}</span></div>
    <div class="tbl-wrap"><table id="vd-hist"><thead><tr><th>${L("โครงการ", "Project")}</th><th>${L("สัญญา", "Contract")}</th><th class="n">${L("มูลค่า (บาท)", "Value (baht)")}</th><th>${L("สถานะ", "State")}</th><th>${L("ส่งงาน", "Delivery")}</th><th>${L("เบิกเงิน", "Payment")}</th><th class="n">${L("ค่าปรับ", "Penalty")}</th><th class="n">${L("คะแนน", "Score")}</th></tr></thead>
      <tbody>${P.map(r => `<tr data-vdproj="${r.cs ? r.cs.id : r.no}"><td>${r.cs ? `<a href="#" class="mono" data-vdcase="${r.cs.id}">${r.cs.id}</a>` : ""}<div>${esc(r.name)}</div></td><td>${r.con ? `<a href="#" class="mono" data-vdcon="${r.con.id}">${esc(r.no)}</a><div class="sub">${fdate(r.signed)}</div>` : '<span class="sub">–</span>'}</td><td class="n">${fmt(r.amount)}</td><td>${tag(esc(r.st[1]), r.st[2])}</td>
        <td>${r.ph ? `${r.dlv}/${r.ph} ${L("งวดส่งแล้ว", "delivered")}<div class="sub">${r.acc}/${r.ph} ${L("ตรวจรับ", "accepted")}${r.late ? ` · <span style="color:var(--bad)">${L("ล่าช้า", "late")} ${r.late} ${L("วัน", "d")}</span>` : ""}</div>` : '<span class="sub">–</span>'}</td>
        <td>${r.con ? `${r.occ} ${L("ครั้ง", "times")}<div class="sub">${L("จ่ายแล้ว", "paid")} ${fmt(r.paid)}${r.asked ? ` · ${L("อยู่ระหว่างเบิก", "in process")} ${fmt(r.asked)}` : ""}</div>` : '<span class="sub">–</span>'}</td><td class="n">${r.pen ? fmt(r.pen) : "–"}</td><td class="n">${r.score == null ? "–" : r.score}</td></tr>`).join("") || `<tr><td colspan="8" class="sub">${L("ยังไม่มีโครงการ", "No project yet")}</td></tr>`}</tbody></table></div></section>`;
}
PROC.supKpis = () => {
  const V = S.vendors, B = S.blacklist, over = V.filter(v => { const o = vendorOver(v); return o.proj || o.amt; }).length;
  return `<section class="kpis" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr))">
    <div class="kpi"><span class="l">${VD_NAME()}${L("ในทะเบียน", " registered")}</span><span class="v">${V.length}</span></div>
    <div class="kpi"><span class="l">${L("SME", "SMEs")}</span><span class="v">${V.filter(v => v.sme).length}</span></div>
    <div class="kpi"><span class="l">${L("งานในมือเกินที่รับได้", "Over their capacity")}</span><span class="v" style="${over ? "color:var(--bad)" : ""}">${over}</span></div>
    <div class="kpi"><span class="l">${L("รายชื่อผู้ทิ้งงาน", "Abandoned-work list")}</span><span class="v">${B.rows.length}</span></div>
    <div class="kpi"><span class="l">${L("นำเข้ารายชื่อล่าสุด", "Last list import")}</span><span class="v" style="font-size:18px">${B.imports[0] ? fdate(B.imports[0].t) : "—"}</span></div></section>`;
};
PROC.supRegister = () => {
  const V = S.vendors, pr = isProcRole(), cur = VD.edit ? vdOpen(VD.edit) : null, det = VD.open ? vdOpen(VD.open) : null;
  return `<section class="panel"><header><h2>${L("ทะเบียนผู้รับจ้าง/ผู้ขาย", "Contractor and supplier register")}</h2><span class="sp"></span>${pr ? `<button class="btn primary" type="button" id="vd-add">+ ${L("เพิ่มผู้รับจ้าง/ผู้ขาย", "Add a contractor / supplier")}</button>` : ""}</header>
    <div class="body sub">${L("ประวัติรวมจากทุกสัญญา ใช้ประกอบการจัดซื้อครั้งถัดไป (FR-PR-52) ไม่ใช่การจัดอันดับ กดที่ชื่อเพื่อดูรายละเอียดและประวัติโครงการ", "History across all contracts, shown when buying next time (FR-PR-52); not a ranking. Click a name for the details and the project history")}</div></section>
    ${VD.add || cur ? vdForm(cur) : ""}${det && !cur ? vdDetail(det) : ""}
    <section class="panel"><div class="tbl-wrap"><table id="vd-table"><thead><tr><th style="min-width:210px">${VD_NAME()}</th><th>${L("เลขประจำตัวผู้เสียภาษี", "Tax ID")}</th><th>${L("ประเภท", "Type")}</th><th>${L("จดทะเบียน", "Registered")}</th><th class="n">${L("ทุนจดทะเบียน (ลบ.)", "Capital (M)")}</th><th class="n">${L("โครงการในมือ / รับได้", "In hand / limit")}</th><th class="n">${L("สัญญา", "Contracts")}</th><th class="n">${L("มูลค่า (ลบ.)", "Value (M)")}</th><th class="n">${L("วันล่าช้า", "Late days")}</th><th class="n">${L("ค่าปรับ (บาท)", "Penalties (baht)")}</th><th class="n">${L("คะแนนเฉลี่ย", "Avg score")}</th><th>${L("สถานะ", "Status")}</th></tr></thead>
      <tbody>${V.map(v => { const h = vendorHist(v.name), bl = blHit(v.name), ld = vendorLoad(v), ov = vendorOver(v);
        return `<tr data-vdrow="${v.id}"><td><a href="#" data-vdopen="${v.id}" style="font-weight:600">${esc(v.name)}</a><div class="sub">${v.sme ? "SME" : ""}${v.sme && v.local ? " · " : ""}${v.local ? L("ในพื้นที่", "local") : ""}${v.contact ? ` · ${esc(v.contact)}` : ""}</div></td>
          <td class="mono">${esc(v.taxId)} ${taxOk(v.taxId) ? "" : tag(L("เลขไม่ถูกต้อง", "Invalid"), "p-bad")}</td><td class="sub">${tx(VTYPE[v.type])}</td><td class="sub">${v.regDate ? fdate(v.regDate) : "–"}</td><td class="n">${v.capital != null && v.capital !== "" ? mb(v.capital) : "–"}</td>
          <td class="n">${ld.n}${v.maxProj != null && v.maxProj !== "" ? ` / ${fmt(v.maxProj)}` : ""}${ov.proj || ov.amt ? ` ${tag(L("เกิน", "over"), "p-bad")}` : ""}</td><td class="n">${h.n}</td><td class="n">${mb(h.value)}</td><td class="n">${h.late}</td><td class="n">${fmt(h.pen)}</td><td class="n">${h.score == null ? "—" : fmt(h.score, 1)}</td>
          <td>${bl ? tag(L("อยู่ในรายชื่อผู้ทิ้งงาน", "On the list"), "p-bad") : v.status === "proposed" ? tag(L("เสนอพิจารณาผู้ทิ้งงาน", "Proposed for the list"), "p-warn") : tag(L("ปกติ", "Active"), "p-ok")}</td></tr>`; }).join("")}</tbody></table></div></section>`;
};
bindSuppliers = function () {
  const done = m => { commit(); renderShell(); route(); if (m) toast(m); };
  const add = $("#vd-add"); if (add) add.onclick = () => { VD.add = !VD.add; VD.edit = null; route(); };
  const cl = $("#vd-cancel"); if (cl) cl.onclick = () => { VD.add = false; VD.edit = null; route(); };
  $$("[data-vdopen]").forEach(a => (a.onclick = e => { e.preventDefault(); VD.open = a.dataset.vdopen; VD.add = false; VD.edit = null; route(); const d = $("#vd-detail"); if (d) d.scrollIntoView({ block: "start" }); }));
  const cd = $("#vd-close"); if (cd) cd.onclick = () => { VD.open = null; route(); };
  $$("[data-vdedit]").forEach(b => (b.onclick = () => { VD.edit = b.dataset.vdedit; VD.add = false; route(); }));
  $$("[data-vdcase]").forEach(a => (a.onclick = e => { e.preventDefault(); jump("case:" + a.dataset.vdcase); }));
  $$("[data-vdcon]").forEach(a => (a.onclick = e => { e.preventDefault(); CON_OPEN = a.dataset.vdcon; CON_TAB = "phases"; PROC_TAB = "contracts"; route(); }));
  const f = $("#vd-form"); if (f) f.onsubmit = e => { e.preventDefault(); const val = id => ($("#vd-" + id) || { value: "" }).value, chk = id => !!($("#vd-" + id) || {}).checked;
    const o = { name: val("n"), taxId: val("t"), type: val("ty"), sme: chk("sme"), local: chk("loc"), vat: chk("vat"), contact: val("c"), regDate: val("rd"), capital: val("cap"), egpNo: val("egp"), maxProj: val("mp"), maxAmt: val("ma"), address: val("ad"), phone: val("ph"), email: val("em"), web: val("wb"), signer: val("sg"), bankName: val("bn"), bankBranch: val("bb"), bankAcc: val("ba"), cats: $$("input[name=vd-cat]").filter(x => x.checked).map(x => x.value), note: val("nt") };
    const wasEdit = VD.edit, m = vendorSave(o, wasEdit); if (m) { toast(m); return; } VD.add = false; const keep = wasEdit; VD.edit = null; if (keep) VD.open = keep; else VD.open = S.vendors[S.vendors.length - 1].id;
    done(blHit(o.name) ? L("บันทึกแล้ว ผู้รับจ้าง/ผู้ขายรายนี้อยู่ในรายชื่อผู้ทิ้งงาน", "Saved; this one is on the abandoned-work list") : L("บันทึกแล้ว", "Saved")); };
  const sm = $("#bl-sample"); if (sm) sm.onclick = () => { BL_ROWS = S.blacklist.rows.map(r => ({ ...r })).concat([{ name: "ห้างหุ้นส่วนจำกัด ตัวอย่างไม่ส่งมอบ", taxId: "0103559012340", since: "2026-09-20", ref: "หนังสือแจ้งเวียน (ตัวอย่าง) 9/2569" }]).map(r => ({ ...r, taxId: r.taxId.slice(0, 12) + ((11 - ([...r.taxId.slice(0, 12)].reduce((a, d, i) => a + Number(d) * (13 - i), 0) % 11)) % 10) })); route(); };
  const go = $("#bl-go"); if (go) go.onclick = () => { S.blacklist.rows = BL_ROWS; S.blacklist.imports.unshift({ id: `BL-${FAM_FY}-${String(S.blacklist.imports.length + 1).padStart(2, "0")}`, t: nowIso(), by: me().id, n: BL_ROWS.length }); BL_ROWS = null;
    audit(["นำเข้ารายชื่อผู้ทิ้งงาน", "Imported the abandoned-work list"], `${S.blacklist.rows.length}`); done(L("นำเข้าแล้ว", "Imported")); };
  const bc = $("#bl-clear"); if (bc) bc.onclick = () => { BL_ROWS = null; route(); };
};

// ---------- seed: the details of the sample vendors (samples of mine) ----------
Object.keys(SEEDS).forEach(k => {
  const prev = SEEDS[k].seed;
  SEEDS[k].seed = () => {
    const s = prev(); if (k !== "sample") return s;
    const D = {
      "V-001": { regDate: "2009-03-12", capital: 50000000, maxProj: 6, maxAmt: 150000000, vat: true, egpNo: "EGP-V-0001", address: "99/9 ถนนตัวอย่าง แขวงตัวอย่าง เขตตัวอย่าง กรุงเทพมหานคร 10100", phone: "02-000-0001", email: "contact@system-sample.example", web: "www.system-sample.example", signer: "นายตัวอย่าง ระบบดี (กรรมการผู้จัดการ)", bank: ["ธนาคารตัวอย่าง จำกัด (มหาชน)", "สำนักงานใหญ่", "1234567890"], cats: ["C01", "C02", "C08"], note: "ผู้รับจ้างงานระบบสารสนเทศและบำรุงรักษาอาคาร ผลงานในกรมหลายสัญญา" },
      "V-002": { regDate: "2005-07-01", capital: 20000000, maxProj: 4, maxAmt: 100000000, vat: true, egpNo: "EGP-V-0002", address: "45 ถนนก่อสร้าง ตำบลตัวอย่าง อำเภอตัวอย่าง จังหวัดนนทบุรี 11000", phone: "02-000-0002", email: "office@build-sample.example", web: "", signer: "นายก่อสร้าง ตัวอย่างดี (หุ้นส่วนผู้จัดการ)", bank: ["ธนาคารตัวอย่าง จำกัด (มหาชน)", "สาขานนทบุรี", "2345678901"], cats: ["C04", "C05"], note: "งานก่อสร้างและปรับปรุงอาคาร มีหลักประกันสัญญาเป็นหนังสือค้ำประกันธนาคาร" },
      "V-003": { regDate: "2012-11-20", capital: 10000000, maxProj: 3, maxAmt: 30000000, vat: true, egpNo: "EGP-V-0003", address: "12/3 ถนนทดสอบ แขวงทดสอบ เขตทดสอบ กรุงเทพมหานคร 10400", phone: "02-000-0003", email: "info@price-sample.example", web: "", signer: "นางทดสอบ ราคาดี (กรรมการ)", bank: ["ธนาคารตัวอย่าง จำกัด (มหาชน)", "สาขาทดสอบ", "3456789012"], cats: ["C06", "C07"], note: "" },
      "V-004": { regDate: "2010-05-05", capital: 5000000, maxProj: 3, maxAmt: 15000000, vat: false, egpNo: "EGP-V-0004", address: "77 ถนนพัสดุ ตำบลตัวอย่าง อำเภอเมือง จังหวัดปทุมธานี 12000", phone: "02-000-0004", email: "sales@supply-sample.example", web: "", signer: "นายพัสดุ ตัวอย่างดี (หุ้นส่วนผู้จัดการ)", bank: ["ธนาคารตัวอย่าง จำกัด (มหาชน)", "สาขาปทุมธานี", "4567890123"], cats: ["C01", "C07"], note: "ผู้ประกอบการ SME ในพื้นที่ ส่งมอบของและติดตั้งอุปกรณ์ขนาดเล็ก" },
      "V-005": { regDate: "2016-02-18", capital: 30000000, maxProj: 5, maxAmt: 80000000, vat: true, egpNo: "EGP-V-0005", address: "201 ถนนดิจิทัล แขวงตัวอย่าง เขตตัวอย่าง กรุงเทพมหานคร 10310", phone: "02-000-0005", email: "hello@digital-sample.example", web: "www.digital-sample.example", signer: "นางสาวดิจิทัล ตัวอย่างดี (กรรมการ)", bank: ["ธนาคารตัวอย่าง จำกัด (มหาชน)", "สาขาดิจิทัล", "5678901234"], cats: ["C01", "C02"], note: "งานพัฒนาระบบและสื่อดิจิทัล" },
      "V-006": { regDate: "2014-08-08", capital: 25000000, maxProj: 4, maxAmt: 60000000, vat: true, egpNo: "EGP-V-0006", address: "8 ถนนอบรม ตำบลตัวอย่าง อำเภอตัวอย่าง จังหวัดนครปฐม 73000", phone: "034-000-006", email: "training@train-sample.example", web: "", signer: "นายอบรม ตัวอย่างดี (กรรมการผู้จัดการ)", bank: ["ธนาคารตัวอย่าง จำกัด (มหาชน)", "สาขานครปฐม", "6789012345"], cats: ["C03", "C08"], note: "จัดฝึกอบรมและพัฒนาบุคลากร" },
      "V-007": { regDate: "2015-01-15", capital: null, maxProj: 2, maxAmt: 5000000, vat: false, egpNo: "EGP-V-0007", address: "5 ถนนสถาบัน ตำบลตัวอย่าง อำเภอตัวอย่าง จังหวัดเชียงใหม่ 50000", phone: "053-000-007", email: "inst@institute-sample.example", web: "", signer: "ดร.พัฒนา ตัวอย่างดี (ผู้อำนวยการสถาบัน)", bank: ["ธนาคารตัวอย่าง จำกัด (มหาชน)", "สาขาเชียงใหม่", "7890123456"], cats: ["C03", "C08"], note: "ที่ปรึกษาและวิทยากรด้านการพัฒนาบุคลากร" },
    };
    (s.vendors || []).forEach(v => { const d = D[v.id]; if (!d) return; Object.assign(v, { regDate: d.regDate, capital: d.capital, maxProj: d.maxProj, maxAmt: d.maxAmt, vat: d.vat, egpNo: d.egpNo, address: d.address, phone: d.phone, email: d.email, web: d.web, signer: d.signer, bank: { name: d.bank[0], branch: d.bank[1], acc: d.bank[2] }, cats: d.cats, note: d.note }); });
    return s;
  };
});

// 21 Nov 2569 (P45): the details are no longer under the list ("แยกรายละเอียดออกจากรายการ ตอนนี้ใช้งานยาก"): opening a contractor, adding or
// editing shows that page alone, with a back button to the list; the list stays a list.
{
  const listView = PROC.supRegister;
  PROC.supRegister = () => {
    const cur = VD.edit ? vdOpen(VD.edit) : null, det = VD.open ? vdOpen(VD.open) : null;
    if (!VD.add && !cur && !det) { const s = VD.open; VD.open = null; const h = listView(); VD.open = s; return h; }
    const back = `<div class="row" style="margin-bottom:8px"><button class="btn ghost" type="button" id="vd-back">← ${L("กลับไปรายการผู้รับจ้าง/ผู้ขาย", "Back to the list")}</button>${det && !cur ? `<span class="sub" style="margin-left:8px">${esc(det.name)}</span>` : ""}</div>`;
    return back + (VD.add || cur ? vdForm(cur) : vdDetail(det));
  };
  const bind = bindSuppliers;
  bindSuppliers = function () { bind.apply(this, arguments); const b = $("#vd-back"); if (b) b.onclick = () => { VD.open = null; VD.add = false; VD.edit = null; route(); window.scrollTo(0, 0); }; };
}
