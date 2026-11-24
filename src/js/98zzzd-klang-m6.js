// Fisko-KlangFinance, menu round M5 (16 Nov 2569): the page "สรุปและส่ง สงป." loses three tabs, and the allocation shows the act amounts from it.
// On the user's brief:
//   1. "สรุปและส่ง สงป." (B6): take out, for now, the tabs "ชุดคำขอและแบบฟอร์ม" (pack), "สถานะและรัฐสภา" (status) and "ชุดชี้แจง" (brief).
//      What is left: the two tabs of round P21 (overview of the requests, the request list with the bill and act amounts) and the checks.
//      The parliament steps were only reachable on the removed tab; the act is now "in force" for the allocation as soon as Planning has
//      recorded an act amount for a request on the request list of B6 (S.submission.manual[id].act), or the old parliament steps are done.
//   2. "จัดสรรงบประมาณ" (B7): show the act amounts taken from B6 so that they can be allocated: a panel at the top of the tab "วงเงินที่ได้รับ"
//      lists the requests that have an act amount (the request, the unit, the amount asked, the bill, the act, and whether it is in the
//      allocation yet), with the total, and a way to the B6 page where Planning records the amounts. The existing buttons that make the
//      allocation lines "from the act" now work from those amounts.
// The CRUD lists that sat on the removed tabs (batches, Bureau answers, parliament cuts and appeals) stay in the data and the code but have no page.

// ---------- 1. the three tabs go ----------
{
  const bp = bPage("submission");
  bp.tabs = bp.tabs.filter(t => !["pack", "status", "brief"].includes(t.id));
  if (!bp.tabs.some(t => t.keys.includes(SUB_TAB))) SUB_TAB = bp.tabs[0].keys[0];
}

// ---------- 2. the act amounts in the allocation ----------
// "the act is in force": the parliament steps are done, or Planning has recorded an act amount for at least one request in B6
const actInForce = () => { const P = S.parl; return !!(P && P.stage >= PARL_STEPS.length) || (S.requests || []).some(r => actSource(r) === "act"); };
const alActRows = () => (S.requests || []).filter(r => r.status !== "rejected" && actSource(r) === "act");
function alActPanel() {
  const rs = alActRows(), tot = sumv(rs.map(r => actAmount(r))), A = S.allocs && S.allocs[FORM_FY], inAl = r => !!(A && A.lines.some(l => l.req === r.id));
  const billOf = r => { const s = amtSteps(r).find(x => x[0] === "bill"); return s && s[2] != null ? mb(s[2]) : "–"; };
  return `<section class="panel" id="al-act"><header><h2>${L(`ยอด พ.ร.บ. ปี ${FORM_FY} จากรายงานงบประมาณประจำปี`, `FY${FORM_FY} act amounts from the annual budget report`)}</h2><span class="sp"></span><button class="btn" type="button" data-jump="bq-rpt">${L("เปิดรายงานงบประมาณประจำปี", "Open the annual budget report")}</button></header>
    ${rs.length ? `<div class="tbl-wrap"><table><thead><tr><th>${L("คำขอ", "Request")}</th><th>${L("หน่วยงาน", "Unit")}</th><th class="n">${L("ยอดที่ขอ (ลบ.)", "Asked (M)")}</th><th class="n">${L("ร่าง พ.ร.บ. (ลบ.)", "Draft bill (M)")}</th><th class="n">${L("พ.ร.บ. (ลบ.)", "Act (M)")}</th><th>${L("ในการจัดสรร", "In the allocation")}</th></tr></thead>
      <tbody>${rs.map(r => `<tr><td><span class="mono sub">${esc(r.id)}</span> ${esc(tx(r.name))}</td><td class="sub">${esc(unitName(r.unit))}</td><td class="n">${mb(r.amount)}</td><td class="n">${billOf(r)}</td><td class="n"><b>${mb(actAmount(r))}</b></td><td>${inAl(r) ? tag(L("อยู่ในบรรทัดจัดสรรแล้ว", "In a line"), "p-ok") : tag(L("ยังไม่ได้จัดสรร", "Not yet"), "p-warn")}</td></tr>`).join("")}</tbody>
      <tfoot><tr><td colspan="4"><b>${L("รวมยอด พ.ร.บ.", "Total of the act")}</b></td><td class="n"><b>${mb(tot)}</b></td><td></td></tr></tfoot></table></div>
      <div class="body sub">${L("จัดสรรจากยอดนี้ด้วยปุ่มสร้างบรรทัดจัดสรร หรือ ปรับวงเงินตาม พ.ร.บ. ด้านล่าง", "Allocate from this with the button that makes the allocation lines, or the one that updates them to the act, below")}</div>`
      : `<div class="body sub">${L("ยังไม่มียอด พ.ร.บ. กองแผนงานบันทึกยอดที่เมนูรายงานงบประมาณประจำปี แท็บปรับปรุงเงินงบประมาณ", "No act amount yet; Planning records it on the Annual budget report, tab Update the budget amounts")}</div>`}</section>`;
}
{
  const ap = ALLOC.appropriation; ALLOC.appropriation = () => alActPanel() + ap();
  const bb = BIND.allocation; BIND.allocation = () => { bb(); $$("#al-act [data-jump]").forEach(b => (b.onclick = () => { window.RPT_TAB = "rpupd"; jump(b.dataset.jump); })); };
}
