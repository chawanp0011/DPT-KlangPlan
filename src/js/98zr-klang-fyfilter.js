// KlangFinance, 14 Nov 2569: the fiscal year works the same way on every budget page.
// Asked for: "check the fiscal year so it is the same across the whole system, cut what is not used". Before this file there were three
// year controls: a selector in the top bar (98w), a chip in the heading of the formulation pages (98zq) and a selector inside the request
// page (98x). Now there is ONE: a year filter in the filter row of each budget page. It sets the same shared year (SEL_FY), so the choice
// follows the user from page to page; a page that holds no data for the year still says so (98w). Removed: the top-bar selector with its
// "per page" option, the heading chip and the request page's own selector. The quota page keeps the year filter of its own list (98zc) and
// the allocation page keeps its year buttons (they are its filter).
const FY_BUTTONS = ["allocation", "btoday"]; // allocation: its own year buttons are its filter; today: tasks, no year
fyBar = function () { const s = $("#fy-sel"); if (s && s.parentNode) s.parentNode.removeChild(s); }; // no selector in the top bar any more
rqYearBar = () => ""; // the request page's own year selector is replaced by the filter below
menuFyChip = function () {
  $$(".fy-filter").forEach(x => x.remove()); const stale = $("#fy-page"); if (stale && stale.parentNode) stale.parentNode.removeChild(stale.closest("label") || stale);
  const id = fyRouteId(); if (!fyApplies(id) || FY_BUTTONS.includes(id)) return; const view = $("#view"); if (!view || view.querySelector('select[data-crf$="|fy"]')) return; // a list with its own year filter (quota, observations) keeps it
  const years = (S.fyList || []).map(x => x.fy).sort((a, b) => b - a); if (!years.length) return;
  const cur = SEL_FY || fyOfPage(id) || CUR_FY, lab = document.createElement("label");
  lab.className = "fy-filter field-inline"; lab.style.cssText = "display:inline-flex;gap:6px;align-items:center";
  lab.innerHTML = `<span class="sub">${L("ปีงบประมาณ", "Fiscal year")}</span><select id="fy-page" aria-label="${L("กรองตามปีงบประมาณ", "Filter by fiscal year")}">${years.map(y => `<option value="${y}" ${y === cur ? "selected" : ""}>${L("ปี", "FY")} ${y}</option>`).join("")}</select>`;
  lab.querySelector("select").onchange = e => setFy(e.target.value);
  const bar = view.querySelector(".cr-bar"), flt = view.querySelector("#flt"), ph = view.querySelector("section.panel > header"), head = view.querySelector(".head");
  if (bar) bar.insertBefore(lab, bar.firstChild);
  else if (flt && flt.parentNode) flt.parentNode.insertBefore(lab, flt.parentNode.firstChild);
  else if (ph) { lab.style.marginLeft = "auto"; ph.appendChild(lab); }
  else if (head) { lab.style.marginLeft = "auto"; head.appendChild(lab); }
};
