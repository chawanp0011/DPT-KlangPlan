// KlangFinance: one fiscal-year selector in the top bar for the whole system (asked for by the user on 4 Nov 2569,
// after the same selector on the request page).
// How it works, and what it cannot do: the prototype only holds data for some years. The year being prepared (FORM_FY) has the
// requests, consolidation, review and submission; the year in execution (CUR_FY) has everything else (allocation lines, the
// procurement plan, contracts, vouchers, assets, the pages added in rounds R1 to R9 ...); the allocation page also holds the
// closed years' lines. So the selector does not make every page show every year. "Automatic" (the default) leaves every page
// as it was. When a year is chosen, a page that shows that year renders normally; a page that is built on another year shows a
// notice saying which year it holds and offering to switch to it, instead of showing the wrong year's figures under the chosen
// label. Pages that do not depend on a year (home, admin, demo guide, AI assistant, flow document) are never replaced.
let SEL_FY = (() => { const v = Number(store.get("app-fy")); return v > 2000 ? v : null; })();
const FY_FREE = ["home", "admin", "demo", "flow", "delegation", "assistant", "soon"]; // pages with no fiscal year of their own
const FY_FORM = ["strategy", "requests", "request", "consolidation", "review", "submission"]; // pages built on the year being prepared
const fyYears = () => (S.fyList || []).map(x => x.fy);
function fyRouteId() {
  let v = (window.APP_ROUTE || location.hash || "#home").slice(1);
  if (v.startsWith("admin-")) v = "admin";
  return !VIEWS[v] && !NAV.find(n => n.id === v) ? "home" : v;
}
// The year a page shows, or null when it does not depend on one. "allocation" and "requests" can show several (see fyPageHas).
// The selector belongs to the budget pages only (asked for on 4 Nov 2569): it is shown, and applied, on a page of the Budget app
// that depends on a year. Procurement, finance, contracts, assets, HR and the other apps ignore it and do not show it.
const FY_OWN = ["bq-cfg"]; // pages that filter by year inside their own list: no top-bar selector
const fyApplies = id => !FY_FREE.includes(id) && !id.startsWith("admin") && !FY_OWN.includes(id) && appOfLink(id) === "budget";
function fyOfPage(id) { return FY_FREE.includes(id) || id.startsWith("admin") ? null : FY_FORM.includes(id) || id.startsWith("rg-") ? FORM_FY : id === "allocation" ? CUR_FY : CUR_FY; }
function fyPageHas(id, y) {
  if (id === "requests") return fyYears().includes(y); // request list: the year being prepared, or any year's allocated lines (read only)
  if (id.startsWith("rg-")) return !!(S.structure && S.structure[y]); // registers of outputs and activities: any year that has a budget structure
  if (id === "allocation") return !!(S.allocs && S.allocs[y]); // only years that have allocation lines; the prepared year gets its draft from a request ("take it into the allocation") or the draft button on the executing year's page
  return fyOfPage(id) === y;
}
function setFy(y) { SEL_FY = y ? Number(y) : null; if (SEL_FY) store.set("app-fy", String(SEL_FY)); else store.del("app-fy"); fyBar(); route(); }
function fyBar() {
  const top = $("#top"), role = $("#role"); if (!top || !role) return;
  let sel = $("#fy-sel"); if (!sel) { sel = document.createElement("select"); sel.id = "fy-sel"; sel.onchange = () => setFy(sel.value); role.parentNode.insertBefore(sel, $("#org") || role); }
  sel.setAttribute("aria-label", L("ปีงบประมาณ", "Fiscal year")); sel.title = L("เลือกปีงบประมาณ", "Choose the fiscal year");
  sel.innerHTML = `<option value="">${L("ปีงบฯ: ตามหน้า", "FY: per page")}</option>` + (S.fyList || []).slice().sort((a, b) => b.fy - a.fy).map(y => `<option value="${y.fy}" ${y.fy === SEL_FY ? "selected" : ""}>${L("ปีงบฯ", "FY")} ${y.fy}${y.fy === FORM_FY ? " · " + L("จัดทำคำขอ", "preparing") : y.fy === CUR_FY ? " · " + L("ใช้จ่าย", "execution") : y.status === "closed" ? " · " + L("ปิดแล้ว", "closed") : ""}</option>`).join("");
  if (!SEL_FY) sel.value = "";
  sel.hidden = !fyApplies(fyRouteId()); sel.style.display = sel.hidden ? "none" : "";
}
{
  const sh = renderShell; renderShell = () => { sh(); fyBar(); };
  const base = route;
  route = () => {
    const id = fyRouteId(), want = SEL_FY, mine = fyOfPage(id);
    if (want && mine !== null && fyApplies(id) && !fyPageHas(id, want)) {
      const bv = VIEWS[id], bb = BIND[id];
      VIEWS[id] = () => `<div class="head"><div><div class="eyebrow">${L("ปีงบประมาณที่เลือก", "Selected fiscal year")} ${want}</div><h1>${L("หน้านี้ไม่มีข้อมูลของปี", "This page has no data for")} ${want}</h1></div></div>
        <section class="panel"><div class="body"><p>${L(`หน้านี้แสดงข้อมูลของปีงบประมาณ ${mine} ต้นแบบไม่เก็บข้อมูลปี ${want} ของหน้านี้`, `This page shows FY${mine}; the prototype holds no FY${want} data for it`)}.</p>
        <div class="row"><button class="btn primary" type="button" id="fy-go">${L(`ดูปี ${mine}`, `View FY${mine}`)}</button><button class="btn" type="button" id="fy-auto">${L("ล้างตัวเลือกปี (ตามหน้า)", "Clear the choice (per page)")}</button></div>
        <p class="sub">${L("ปีที่ต้นแบบมีข้อมูล: ปีที่กำลังจัดทำคำขอ (คำขอ รวมคำขอ พิจารณา ส่งสำนักงบประมาณ) ปีที่ใช้จ่าย (หน้าอื่นเกือบทั้งหมด) และบรรทัดจัดสรรของปีที่ปิดแล้วที่หน้าจัดสรรและหน้ารายการคำขอ", "Years the prototype holds: the year being prepared (requests, consolidation, review, submission), the year in execution (almost every other page), and closed years' allocation lines on the allocation and request-list pages")}</p></div></section>`;
      BIND[id] = () => { const g = $("#fy-go"), a = $("#fy-auto"); if (g) g.onclick = () => setFy(mine); if (a) a.onclick = () => setFy(null); };
      try { base(); } finally { VIEWS[id] = bv; BIND[id] = bb; }
      fyBar(); return;
    }
    if (want && id === "allocation" && S.allocs && S.allocs[want]) ALLOC_FY = want;
    base(); fyBar();
  };
  { const bb = BIND.allocation; BIND.allocation = () => { bb(); $$("[data-fy]").forEach(b => (b.onclick = () => setFy(Number(b.dataset.fy)))); }; }
}
