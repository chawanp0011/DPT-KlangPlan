// KlangFinance, round P21 (16 Nov 2569): the page "สรุปและส่ง สงป." (B6, submission) gets two new tabs at the front, on the user's brief:
//   1. ภาพรวมคำขอ  a dashboard of what has to be sent to the Budget Bureau, comparing ALL the requests with the requests that are APPROVED (the package):
//                  counts and amounts, by agency unit and by status, and the readiness of the package
//   2. รายการคำขอ  the requests that go to the Bureau, with the money columns: the request, the DRAFT BILL (ร่าง พ.ร.บ.) and the ACT (พ.ร.บ.); Planning can
//                  update the amount received in the bill and in the act (the other roles read)
// The bill and the act amounts already came from the parliament steps (file 98zzb: actAmount / actSource / amtSteps). Planning's update is kept in
// S.submission.manual[requestId] = { bill, act, t, by } and wins over the parliament steps for that request: the act first, then the bill (an act in force that
// the parliament steps already hold stays the act). Everything that asks for "the approved amount" (the request panel, the monthly plan reference, the allocation
// lines) follows, because they all ask actAmount. Clearing a cell goes back to what the parliament steps say.
const subMan = r => ((S.submission.manual = S.submission.manual || {})[r.id] || {});
{
  const amtB = amtSteps, srcB = actSource, valB = actAmount;
  window.subAmtBase = amtB; // what the parliament steps say, without Planning's update
  const NOTE = () => L("กองแผนงานอัปเดตยอด", "Updated by Planning");
  amtSteps = r => { const m = subMan(r); return amtB(r).map(x => (x[0] === "bill" && m.bill != null ? [x[0], x[1], m.bill, NOTE()] : x[0] === "act" && m.act != null ? [x[0], x[1], m.act, NOTE()] : x)); };
  actSource = r => { const m = subMan(r); if (m.act != null) return "act"; const s = srcB(r); if (s === "act") return s; return m.bill != null ? "bill" : s; };
  actAmount = r => { const m = subMan(r); if (m.act != null) return m.act; if (srcB(r) === "act") return valB(r); return m.bill != null ? m.bill : valB(r); };
}
// Planning updates the amount received; "" when it worked, else the reason (the page and the tests share the rules)
function subSetAmt(r, which, raw) {
  if (ROLE !== "plan") return L("เฉพาะกองแผนงานอัปเดตยอดเงินได้", "Only Planning can update the amounts");
  if (!r || !pkg().includes(r)) return L("คำขอนี้ไม่อยู่ในชุดที่ส่ง สงป.", "This request is not in the package sent to the Bureau");
  if (!["bill", "act"].includes(which)) return "";
  const M = (S.submission.manual = S.submission.manual || {}), m = (M[r.id] = M[r.id] || {});
  if (raw === "" || raw == null) delete m[which];
  else { const v = Number(raw); if (!isFinite(v) || v < 0) { if (m.bill == null && m.act == null) delete M[r.id]; return L("ยอดเงินไม่ถูกต้อง", "The amount is not valid"); } m[which] = Math.round(v); }
  if (m.bill == null && m.act == null) delete M[r.id]; else { m.t = nowIso(); m.by = me().id; }
  audit(which === "bill" ? ["กองแผนงานอัปเดตยอดร่าง พ.ร.บ.", "Planning updated the draft-bill amount"] : ["กองแผนงานอัปเดตยอด พ.ร.บ.", "Planning updated the act amount"], `${r.id} · ${raw === "" || raw == null ? "–" : fmt(Number(raw))}`);
  return "";
}

// ---------- the tabs ----------
SUB_TABS.unshift({ id: "sbov", label: ["ภาพรวมคำขอ", "Request overview"] });
{
  const bp = BUD_PAGES.find(p => p.id === "submission"); if (bp) bp.tabs = [{ id: "sbov", keys: ["sbov"] }, ...bp.tabs]; // the frame has normalised the tabs already, so these are in the final form
  SUB_TAB = "sbov"; if (typeof BUD_SEEN !== "undefined") BUD_SEEN.submission = "sbov";
}
const SBD_ST = { draft: [["ร่าง", "Draft"], "p-mute"], returned: [["ส่งกลับแก้ไข", "Returned"], "p-warn"], unit: [["รอผู้อำนวยการสำนัก/กองเห็นชอบ", "With the division director"], "p-warn"], plan: [["กองแผนงานพิจารณา", "With Planning"], "p-info"], committee: [["คณะกรรมการ/ผู้บริหารพิจารณา", "With the committee"], "p-info"], exec: [["ผู้บริหารพิจารณา", "With the executive"], "p-info"], cancelled: [["ยกเลิก", "Cancelled"], "p-mute"], pending: [["รออนุมัติ", "Pending"], "p-warn"], approved: [["อนุมัติแล้ว", "Approved"], "p-ok"], rejected: [["ไม่อนุมัติ", "Rejected"], "p-bad"], contracted: [["ทำสัญญาแล้ว", "Contracted"], "p-mute"] };
const sbMine = () => S.requests.filter(r => ROLE !== "div" || r.unit === me().unit);
const sbSum = a => a.reduce((t, r) => t + (Number(r.amount) || 0), 0);
SUB.sbov = () => {
  const all = sbMine(), pk = pkg().filter(r => all.includes(r)), A = sbSum(all), P = sbSum(pk), pct = A ? Math.round(P / A * 100) : 0, rest = all.filter(r => !pk.includes(r));
  const ready = pk.filter(r => subChecks(r).every(x => x.s !== "no")).length, sb = S.submission, step = (SUB_STEPS.find(s => s[0] === sb.status) || [0, ["–", "–"]])[1];
  const units = [...new Set(all.map(r => r.unit))].map(u => { const a = all.filter(r => r.unit === u), b = pk.filter(r => r.unit === u); return { u, nA: a.length, aA: sbSum(a), nB: b.length, aB: sbSum(b) }; }).sort((x, y) => y.aA - x.aA), max = Math.max(1, ...units.map(x => x.aA));
  const sts = [...new Set([...Object.keys(SBD_ST), ...all.map(r => r.status)])].map(k => { const a = all.filter(r => r.status === k); return { k, n: a.length, amt: sbSum(a) }; }).filter(x => x.n);
  const kpi = (l, v, d, hl) => `<div class="kpi ${hl ? "hl" : ""}"><span class="l">${l}</span><span class="v">${v}</span><span class="d ${hl ? "" : "sub"}"${hl ? ' style="color:var(--rail-ink)"' : ""}>${d}</span></div>`;
  return `<section class="kpis" id="sb-kpis" style="grid-template-columns:repeat(4,minmax(0,1fr))">
    ${kpi(L("คำขอทั้งหมด", "All requests"), all.length, `${mb(A)} ${L("ลบ.", "M")}`)}
    ${kpi(L("อนุมัติแล้ว ต้องส่ง สงป.", "Approved, to send to the Bureau"), pk.length, `${mb(P)} ${L("ลบ.", "M")} · ${pct}% ${L("ของยอดทั้งหมด", "of the total")}`, true)}
    ${kpi(L("ยังไม่อนุมัติ", "Not approved yet"), rest.length, `${mb(A - P)} ${L("ลบ.", "M")}`)}
    ${kpi(L("ผ่านตรวจก่อนส่ง", "Pass the pre-send checks"), `${ready}/${pk.length}`, `${L("สถานะชุด", "Package")}: ${tx(step)}`)}</section>
  <div class="grid2">
    <section class="panel" id="sb-units"><header><h2>${L("เทียบคำขอทั้งหมดกับที่อนุมัติ รายหน่วยงาน", "All requests against approved, by unit")}</h2></header>
      <div class="body"><div class="row" style="gap:16px;margin-bottom:8px"><span class="sub"><i class="c3" style="display:inline-block;width:12px;height:12px;border-radius:3px"></i> ${L("คำขอทั้งหมด", "All requests")}</span><span class="sub"><i class="c2" style="display:inline-block;width:12px;height:12px;border-radius:3px"></i> ${L("อนุมัติแล้ว (ส่ง สงป.)", "Approved (to the Bureau)")}</span></div>
      <div class="hbars">${units.map(x => `<div class="hb" data-sbunit="${esc(x.u)}"><span>${esc(unitName(x.u))}</span><div><div class="track" style="width:${x.aA / max * 100}%"><i class="c3" style="width:100%"></i></div><div class="track" style="width:${x.aB / max * 100}%;margin-top:3px"><i class="c2" style="width:100%"></i></div></div><span class="n sub">${x.nA} → ${x.nB}<br>${mb(x.aA)} → ${mb(x.aB)}</span></div>`).join("") || `<span class="sub">${L("ยังไม่มีคำขอ", "No request yet")}</span>`}</div></div></section>
    <section class="panel" id="sb-status"><header><h2>${L("เทียบตามสถานะของคำขอ", "By status of the request")}</h2></header>
      <div class="tbl-wrap"><table><thead><tr><th>${L("สถานะ", "Status")}</th><th class="n">${L("คำขอ", "Requests")}</th><th class="n">${L("ยอดรวม (ลบ.)", "Amount (M)")}</th><th class="n">${L("สัดส่วน", "Share")}</th></tr></thead>
        <tbody>${sts.map(x => `<tr ${x.k === "approved" ? 'style="font-weight:600"' : ""}><td>${tag(tx((SBD_ST[x.k] || [[x.k, x.k]])[0]), (SBD_ST[x.k] || [0, "p-mute"])[1])}</td><td class="n">${x.n}</td><td class="n">${mb(x.amt)}</td><td class="n">${A ? Math.round(x.amt / A * 100) : 0}%</td></tr>`).join("")}</tbody>
        <tfoot><tr><td>${L("รวม", "Total")}</td><td class="n">${all.length}</td><td class="n">${mb(A)}</td><td class="n">100%</td></tr></tfoot></table></div></section></div>
  <section class="panel" id="sb-tosend"><header><h2>${L("ที่ต้องส่ง สงป.", "To send to the Bureau")}</h2><span class="sp"></span><button class="btn" type="button" data-sbgo="rpupd">${L("ปรับปรุงเงินงบประมาณ", "Update the budget amounts")}</button> <button class="btn ghost" type="button" data-sbgo="checks">${L("ปรับปรุงสถานะ สงป.", "Update the Bureau status")}</button></header>
    <div class="tbl-wrap"><table><thead><tr><th>${L("คำขอ", "Request")}</th><th>${L("สำนัก/กอง", "Unit")}</th><th class="n">${L("ยอดที่ขอ (บาท)", "Asked (baht)")}</th><th>${L("ผลตรวจ", "Checks")}</th><th>${L("สถานะที่ สงป.", "Status at the Bureau")}</th></tr></thead>
      <tbody>${pk.map(r => { const c = subChecks(r), no = c.filter(x => x.s === "no").length, wa = c.filter(x => x.s === "wa").length; return `<tr><td><a href="#" data-req="${r.id}" class="mono">${r.id}</a> ${esc(nmStr(r.name))}</td><td class="sub">${esc(unitName(r.unit))}</td><td class="n">${fmt(r.amount)}</td><td>${no ? tag(`${L("ต้องแก้", "Fix")} ${no}`, "p-bad") : wa ? tag(`${L("ควรดู", "Look")} ${wa}`, "p-warn") : tag(L("ผ่าน", "Pass"), "p-ok")}</td><td>${typeof subBstTag === "function" ? subBstTag(r) : ""}</td></tr>`; }).join("") || `<tr><td colspan="5" class="sub">${L("ยังไม่มีคำขอที่อนุมัติ", "No approved request yet")}</td></tr>`}</tbody></table></div></section>`;
};
SUB.sbls = () => {
  const P = pkg().filter(r => sbMine().includes(r)), ed = ROLE === "plan", base = window.subAmtBase;
  const eff = (r, k) => { const x = amtSteps(r).find(y => y[0] === k); return x ? x[2] : null; };
  const cell = (r, k, name) => { const v = eff(r, k), m = subMan(r)[k] != null;
    return ed ? `<div class="row" style="gap:4px;flex-wrap:nowrap;justify-content:flex-end"><input type="number" min="0" step="1000" data-sbamt="${r.id}|${k}" value="${v == null ? "" : v}" placeholder="–" aria-label="${name} ${r.id}" style="max-width:150px;text-align:right">${m ? `<button class="btn ghost" type="button" data-sbclr="${r.id}|${k}" title="${L("ใช้ยอดจากขั้นตอนรัฐสภาแทน", "Use the parliament steps again")}" aria-label="${L("ล้างยอดที่อัปเดต", "Clear the update")}" style="padding:2px 8px">×</button>` : ""}</div>${m ? `<div class="sub" style="text-align:right">${L("กองแผนงานอัปเดต", "Updated by Planning")}</div>` : ""}`
      : `${v == null ? '<span class="sub">–</span>' : fmt(v)}${m ? `<div class="sub">${L("กองแผนงานอัปเดต", "Updated by Planning")}</div>` : ""}`; };
  const tot = k => sumv(P.map(r => Number(k === "ask" ? r.amount : eff(r, k)) || 0));
  return `<section class="panel" id="sb-list"><header><h2>${L("ปรับปรุงรายการงบประมาณของรายการคำขอ ร่าง พ.ร.บ. และ พ.ร.บ.", "Update the budget amounts of the requests: draft bill and act")}</h2><span class="sp"></span>${tag(`${P.length} ${L("รายการ", "requests")}`, P.length ? "p-ok" : "p-mute")}</header>
    <div class="body sub">${ed ? L("ยอดร่าง พ.ร.บ. และ พ.ร.บ. มาจากขั้นตอนรัฐสภาโดยอัตโนมัติ กองแผนงานแก้ยอดที่ได้รับได้ในช่องของแต่ละรายการ (ล้างช่องด้วย × เพื่อกลับไปใช้ยอดจากขั้นตอนรัฐสภา) ยอดล่าสุดเป็นยอดอ้างอิงของคำขอ แผนเงิน และการจัดสรร", "The bill and act amounts come from the parliament steps; Planning can correct the amount received in each row (× clears it and goes back to the parliament steps). The latest amount is the reference of the request, the money plan and the allocation") : L("ยอดร่าง พ.ร.บ. และ พ.ร.บ. มาจากขั้นตอนรัฐสภาหรือที่กองแผนงานอัปเดต (อ่านได้อย่างเดียว)", "The bill and act amounts come from the parliament steps or from Planning's update (read only)")}</div>
    <div class="tbl-wrap"><table><thead><tr><th rowspan="2">${L("คำขอ", "Request")}</th><th rowspan="2">${L("สำนัก/กอง", "Unit")}</th><th rowspan="2">${L("รหัสงบประมาณ", "Budget code")}</th><th colspan="3" style="text-align:center">${L("เงินงบประมาณ (บาท)", "Budget money (baht)")}</th></tr>
      <tr><th class="n">${L("คำขอ", "Request")}</th><th class="n">${L("ร่าง พ.ร.บ.", "Draft bill")}</th><th class="n">${L("พ.ร.บ.", "Act")}</th></tr></thead>
      <tbody>${P.map(r => `<tr data-sbrow="${r.id}"><td><a href="#" data-req="${r.id}" class="mono">${r.id}</a><div>${esc(nmStr(r.name))}</div></td><td class="sub">${esc(unitName(r.unit))}</td><td class="mono sub">${esc(budgetCode(r))}</td><td class="n">${fmt(r.amount)}</td><td class="n">${cell(r, "bill", L("ร่าง พ.ร.บ.", "Draft bill"))}</td><td class="n">${cell(r, "act", L("พ.ร.บ.", "Act"))}</td></tr>`).join("") || `<tr><td colspan="6" class="sub">${L("ยังไม่มีคำขอที่ส่ง สงป.", "No request sent yet")}</td></tr>`}</tbody>
      <tfoot><tr><td colspan="3">${L("รวม", "Total")}</td><td class="n" id="sb-t-ask">${fmt(tot("ask"))}</td><td class="n" id="sb-t-bill">${fmt(tot("bill"))}</td><td class="n" id="sb-t-act">${fmt(tot("act"))}</td></tr></tfoot></table></div></section>`;
};
function subAmtBind() {
  {
    $$("[data-sbamt]").forEach(el => (el.onchange = () => { const [id, k] = el.dataset.sbamt.split("|"), m = subSetAmt(S.requests.find(x => x.id === id), k, el.value); if (m) { toast(m); route(); return; } commit(); route(); toast(L("อัปเดตยอดเงินแล้ว", "Amount updated")); }));
    $$("[data-sbclr]").forEach(b => (b.onclick = () => { const [id, k] = b.dataset.sbclr.split("|"), m = subSetAmt(S.requests.find(x => x.id === id), k, ""); if (m) { toast(m); return; } commit(); route(); toast(L("ใช้ยอดจากขั้นตอนรัฐสภาแล้ว", "Back to the parliament steps")); }));
  }
}
{
  const bb = BIND.submission;
  BIND.submission = () => {
    bb();
    $$("[data-sbgo]").forEach(b => (b.onclick = () => { if (b.dataset.sbgo === "rpupd") { window.RPT_TAB = "rpupd"; jump("bq-rpt"); } else { SUB_TAB = b.dataset.sbgo; route(); } }));
  };
}
