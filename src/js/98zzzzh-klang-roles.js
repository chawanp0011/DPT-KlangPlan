// KlangFinance, round P77 (23 Nov 2569): the voucher checker, accounting and finance are three roles (asked for: "user การเงิน การบัญชี
// ต้องแยกกัน เพราะส่วนของเบิกจ่ายทำงานไม่เหมือนกัน").
//   chk = ผู้ตรวจสอบใบสำคัญ: checks the voucher of a delivery the Treasury sent for payment, passes it or sends it back;
//   acc = การบัญชี: attaches the payment documents and sends them to finance;
//   fin = การเงิน: records the date the contractor got the money, attaches the proof and the details.
// Each sees the menus the old "การเงินและบัญชี" role saw, and does only its own step of the payment. The admin can still do every step.
// Demo users (fictional) are added to each sample data set.
ROLES.fin = ["การเงิน", "Finance"];
// P82 (24 Nov 2569): the voucher check is done by the existing ผู้ตรวจใบสำคัญ 1 and 2, by the amount of the contract, as for every
// voucher (vcGroup): up to VC_GROUP_LIMIT (100,000 baht) and not an investment line -> checker 1; above it or investment -> checker 2.
// The head of finance can check either group. (The separate "chk" role of P77 is removed.)
const CHK_ROLES = ["vchk1", "vchk2"];
const kxChkGroup = k => { const x = kxOf(k); return kxAmount(x) > VC_GROUP_LIMIT || famLine(k.line).type === "inv" ? 2 : 1; };
const kxCanChk = k => ROLE === "finhead" || ROLE === "vchk" + kxChkGroup(k);
const isChkRole = () => CHK_ROLES.includes(ROLE) || ROLE === "finhead";
ROLES.acc = ["การบัญชี", "Accounting"];
const PAY_ROLES = ["fin", "vchk1", "vchk2", "finhead", "acc"];
// the menus: wherever finance may go, the two new roles may go too
const prAddRoles = roles => { if (Array.isArray(roles) && roles.includes("fin")) ["vchk1", "vchk2", "finhead", "acc"].forEach(r => { if (!roles.includes(r)) roles.push(r); }); };
NAV.forEach(n => { try { prAddRoles(n.roles); } catch (e) {} });
PROC_PAGES.forEach(p => { try { prAddRoles(p.roles); (p.tabs || []).forEach(t => prAddRoles(t.roles)); } catch (e) {} });
// demo users for the new roles, in the unit of the finance user
Object.keys(SEEDS).forEach(k => { const prev = SEEDS[k].seed; SEEDS[k].seed = () => { const s = prev(); const f = (s.users || []).find(u => u.role === "fin" && u.primary) || (s.users || []).find(u => u.role === "fin");
  if (f && !s.users.some(u => u.role === "acc")) s.users.push({ id: "u-acc", role: "acc", unit: f.unit, primary: true, mfa: true, active: true, name: ["มาลี บัญชีดี (ตัวอย่าง)", "Malee Banchidee (sample)"] });
  return s; }; });
// a saved state from before this round has no such users: add them once
{ const base = route; route = function () { try { if (typeof S !== "undefined" && S && S.users && !S.users.some(u => u.role === "acc")) { const f = S.users.find(u => u.role === "fin") || {}; S.users.push({ id: "u-acc", role: "acc", unit: f.unit, primary: true, mfa: true, active: true, name: ["มาลี บัญชีดี (ตัวอย่าง)", "Malee Banchidee (sample)"] }); } S.users = S.users.filter(u => u.role !== "chk"); } catch (e) {} return base.apply(this, arguments); }; }

// ---------- each does its own step of the payment ----------
const prDeskOf = () => (CHK_ROLES.includes(ROLE) || ROLE === "finhead" ? "chk" : ROLE === "acc" ? "book" : ROLE === "fin" ? "pay" : ROLE === "admin" ? FIN_DESK : null);
{ const base = kxPay; kxPay = function (k, i, v, files) {
    if (ROLE !== "admin") { const chk = v.chk === true ? "ok" : v.chk, wantChk = chk === "ok" || chk === "back", wantBook = !!v.book, wantPay = v.status === "paid" || v.status === "wait";
      if (wantChk && !kxCanChk(k)) return `เฉพาะผู้ตรวจใบสำคัญ ${kxChkGroup(k)} ตรวจใบสำคัญนี้ได้ (วงเงินสัญญา ${fmt(kxAmount(kxOf(k)))} บาท)`; if (wantBook && ROLE !== "acc") return "เฉพาะการบัญชีบันทึกเอกสารเบิกจ่ายได้"; if (wantPay && ROLE !== "fin") return "เฉพาะการเงินบันทึกการจ่ายเงินได้"; }
    const r0 = ROLE; if (isChkRole() || ROLE === "acc") ROLE = "fin"; try { return base(k, i, v, files); } finally { ROLE = r0; } }; } // the older checks know "fin" only
kxCanPay = () => PAY_ROLES.includes(ROLE) || ROLE === "admin";
// the screens: the desk follows the role (only the admin picks a desk)
flDeskBar = () => (ROLE === "admin" ? `<div class="row fl-desk" style="gap:6px;align-items:center;margin:0 0 8px"><span class="sub">ทำงานในฐานะ</span>${Object.entries(FL_DESKS).map(([k, t]) => `<button type="button" class="btn ${FIN_DESK === k ? "primary" : "ghost"}" data-fldesk="${k}">${t}</button>`).join("")}</div>` : "");
{ const base = kxManageView; kxManageView = function (k) { const d = prDeskOf(); if (!d) return base(k); const keep = FIN_DESK; FIN_DESK = d; const r0 = ROLE; if (isChkRole() || ROLE === "acc") ROLE = "fin"; try { return base(k); } finally { FIN_DESK = keep; ROLE = r0; } }; }

// ---------- P78 (23 Nov 2569): ขอซื้อขอจ้าง is one list, "ใบขอซื้อขอจ้าง" ----------
// Every item of the year the unit received from Planning (and the older requisitions), with the state of its รายการจัดซื้อ.
// An item at "จัดทำข้อมูล" (the unit writes the details) has the button "จัดทำรายละเอียด"; every other state has "เปิด".
PROC.reqn = () => { const unitOnly = ["div", "divhead"].includes(ROLE) ? me().unit : null, fy = BI.fy;
  if (!BI.fyPicked) { const ys = [...new Set(((S.bi && S.bi.rows) || []).map(biFy))].sort((a, b) => b - a); if (ys.length) BI.fy = ys[0]; }
  const rows = [], seen = new Set();
  ((S.bi && S.bi.rows) || []).filter(r => r.sent && biFy(r) === BI.fy && (!unitOnly || (biUnit(r) && biUnit(r).id === unitOnly))).forEach(r => { const p = S.pplan.find(q => q.id === r.sent.pp); if (!p) return; seen.add(p.id); rows.push({ p, name: r.name, code: r.code, unit: biUnit(r) ? tx(biUnit(r).name) : r.unitName, amount: r.amount }); });
  S.reqn.forEach(rq => { const p = famPlan(rq.plan); if (!p || seen.has(p.id) || prFyOfPlan(p) !== BI.fy) return; const u = famLine(p.line).unit; if (unitOnly && u !== unitOnly) return; seen.add(p.id); rows.push({ p, name: tx(p.name), code: "", unit: unitName(u), amount: rq.amount }); });
  const body = rows.map(x => { const c = caseByPlan(x.p.id), rq = c ? caseReq(c) : S.reqn.find(q => q.plan === x.p.id && q.status !== "superseded"), nH = c && c.reqHist ? c.reqHist.length : 0, main = c ? caseMainNow(c) : 0, prep = !!c && !rq && (main <= 2 || caseState(c) <= 1);
    const can = prep && (["div", "divhead"].includes(ROLE) || isProcRole());
    return `<tr><td class="mono">${rq ? esc(rq.id) : `<span class="sub">ยังไม่มี</span>`}${nH ? `<div class="sub">ส่งใหม่ครั้งที่ ${nH + 1}</div>` : ""}</td><td><b style="font-weight:600">${esc(x.name)}</b><div class="sub"><span class="mono">${esc(x.p.id)}</span>${x.code ? ` · <span class="mono">${esc(x.code)}</span>` : ""}</div></td><td>${esc(x.unit)}</td><td class="n">${fmt(x.amount)}</td>
      <td class="rq-case">${c ? caseStTag(c) : `<span class="sub">ยังไม่มีรายการจัดซื้อ</span>`}${rq ? `<div class="sub">${stTag(REQ_ST, rq.status)}</div>` : ""}</td>
      <td>${can ? `<button class="btn primary" type="button" data-preq="${esc(x.p.id)}">จัดทำรายละเอียด</button>` : c ? `<button class="btn ghost" type="button" data-rqcase="${esc(c.id)}">เปิด</button>` : ""}</td></tr>`; }).join("");
  return `${prFySel()}<section class="panel rq-list"><header><h2>ใบขอซื้อขอจ้าง ปีงบประมาณ ${BI.fy}</h2><span class="sp"></span><span class="sub">${rows.length} รายการ</span></header>${rows.length ? `<div class="tbl-wrap"><table><thead><tr><th>เลขที่ใบขอ</th><th style="min-width:240px">รายการ</th><th>หน่วยงาน</th><th class="n">วงเงิน (บาท)</th><th>สถานะ</th><th></th></tr></thead><tbody>${body}</tbody></table></div>` : `<div class="body sub">ยังไม่มีรายการในปีงบประมาณนี้</div>`}</section>`; };
