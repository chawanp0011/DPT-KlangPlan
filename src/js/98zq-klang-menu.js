// Fisko-KlangFinance, menu round M1 (13 Nov 2569): the order and names of the budget formulation menu, the fiscal year inside each
// page, and the intake page taken out. Asked for by the user in a list headed "จัดทำงบประมาณ":
//   Formulation, in this order: Dashboard, Calendar, Strategy and programmes, Quota, Committee observations, Requests (made by the
//   offices and divisions), Consolidation at agency level (by the budget group), Review and approval, Summary and submission to the
//   Budget Bureau, Request summary report. "Request intake and mapping" is out: the Requests page takes its place.
//   Registers of the budget structure, in this order: programmes of the agency, kinds of money, kinds of account, expenditure
//   reference, reference prices, outputs and projects, activities, areas.
//   The fiscal year moves from the top bar into every page of the formulation menu and shows only "ปี 2571" (no wording behind it).
// Done in this round: the order, the names, the year in each formulation page, the intake page out, and the OCR import reached from
// a button on the request list instead of a menu line. (Done in round M2, file 98zpa: the eight
// tabs of "Strategy and programmes" (vision and mission, agency outcomes, strategies, service goals, agency programmes linked to the
// structure programmes from the Bureau, budget overview by strategy), the register of the agency's programmes and the register of
// kinds of account.

// a page that has no menu line of its own opens under the line of another page
NAV_ALIAS["bq-ocr"] = "requests";

GROUPS.form = ["จัดทำงบประมาณ", "Formulation"]; // the year is no longer in the heading; each page shows its own

{
  const MENU_FORM = ["bq-dash", "bq-cal", "strategy", "agrev", "bq-cfg", "bq-obs", "requests", "consolidation", "review", "submission", "bq-rpt"];
  const MENU_REG = ["rg-mstrat", "rg-msvc", "rg-prog", "bq-money", "rg-acct", "bq-cat", "bq-ref", "rg-out", "rg-act", "bq-geo"];
  ["bq-ocr"].forEach(id => { const i = NAV.findIndex(n => n.id === id); if (i >= 0) NAV.splice(i, 1); }); // opened from the request list
  MENU_FORM.forEach(id => { const n = NAV.find(x => x.id === id); if (n) n.group = "form"; });
  MENU_REG.forEach(id => { const n = NAV.find(x => x.id === id); if (n) n.group = "regg"; });
  const take = ids => ids.map(id => { const i = NAV.findIndex(n => n.id === id); return i >= 0 ? NAV.splice(i, 1)[0] : null; }).filter(Boolean);
  const form = take(MENU_FORM), reg = take(MENU_REG), at = NAV.findIndex(n => n.id === "btoday") + 1;
  NAV.splice(at, 0, ...form, ...reg);
  const nm = (id, th, en) => { const n = NAV.find(x => x.id === id); if (n) n.label = [th, en]; const p = typeof bPage === "function" ? bPage(id) : null; if (p) { p.label = [th, en]; p.h1 = [th, en]; } };
  nm("bq-dash", "แดชบอร์ด", "Dashboard"); nm("bq-cal", "ปฏิทิน", "Calendar"); nm("strategy", "ยุทธศาสตร์และแผนงาน", "Strategy and programmes");
  nm("bq-cfg", "โควต้า", "Quota"); nm("bq-obs", "ข้อสังเกตกรรมาธิการ", "Committee observations"); nm("requests", "คำขอ", "Requests");
  nm("consolidation", "รวบรวมคำขอระดับหน่วยงาน", "Consolidation at agency level"); nm("submission", "สรุปและส่ง สงป.", "Summary and submission to the Bureau");
  nm("rg-mstrat", "ทะเบียนยุทธศาสตร์กระทรวง", "Ministry strategies"); nm("rg-msvc", "ทะเบียนเป้าหมายการให้บริการกระทรวง", "Ministry service goals"); nm("rg-prog", "ทะเบียนแผนงานหน่วยงาน", "Agency programmes"); nm("bq-money", "ประเภทเงิน", "Kinds of money"); nm("rg-acct", "ประเภทบัญชี", "Kinds of account"); nm("bq-cat", "ตารางอ้างอิงรายจ่าย", "Expenditure reference"); nm("bq-ref", "ราคากลาง", "Reference prices");
  nm("rg-out", "ผลผลิต/โครงการ", "Outputs and projects"); nm("rg-act", "กิจกรรม", "Activities"); nm("bq-geo", "พื้นที่", "Areas");
}

// ---------- the fiscal year inside each page of the formulation menu ----------
// The pages added in rounds Q1 to Q7 are built on the year being prepared, like the first ones; tell the year module (98w), or
// choosing the year being prepared would show them a "no data for this year" notice.
FY_FORM.push("bq-dash", "bq-cal", "bq-cfg", "bq-obs", "bq-rpt", "bq-ocr", "bq-money", "bq-cat", "bq-ref", "bq-geo");
const menuIsForm = id => { const n = NAV.find(x => x.id === id) || (NAV_ALIAS[id] ? NAV.find(x => x.id === NAV_ALIAS[id]) : null); return !!n && n.group === "form"; };
function menuFyChip() {
  const old = $("#fy-page"); if (old && old.parentNode) old.parentNode.removeChild(old.closest("label") || old);
  const id = typeof fyRouteId === "function" ? fyRouteId() : CUR; if (!menuIsForm(id)) return;
  const head = document.querySelector("#view .head"); if (!head) return;
  const cur = SEL_FY || FORM_FY, years = (S.fyList || []).map(x => x.fy).sort((a, b) => b - a), lab = document.createElement("label");
  lab.className = "fy-chip"; lab.style.cssText = "margin-left:auto;align-self:flex-start";
  lab.innerHTML = `<select id="fy-page" aria-label="${L("ปีงบประมาณ", "Fiscal year")}" title="${L("ปีงบประมาณ", "Fiscal year")}">${years.map(y => `<option value="${y}" ${y === cur ? "selected" : ""}>${L("ปี", "FY")} ${y}</option>`).join("")}</select>`;
  head.appendChild(lab); lab.querySelector("select").onchange = e => setFy(e.target.value);
}
{
  const fb = fyBar; // the top-bar year stays for the pages that are not formulation pages
  fyBar = function () { fb(); const s = $("#fy-sel"); if (s && menuIsForm(fyRouteId())) { s.hidden = true; s.style.display = "none"; } };
  const br = route;
  route = function () { const r = br.apply(this, arguments); menuFyChip(); return r; };
}

// ---------- who does what, written on the two pages (13 Nov 2569, menu round M3) ----------
// "Requests: made by the offices and divisions"; "Consolidation at agency level: collected by the budget group" (the budget group is
// part of the Planning division; the prototype has one Planning role for it). The note goes under the page heading.
{
  const note = (id, th, en) => { const vb = VIEWS[id]; VIEWS[id] = () => { const html = vb(), at = html.indexOf("<section"); return at < 0 ? html : html.slice(0, at) + eNote(L(th, en)) + html.slice(at); }; };
  note("requests", "คำขอสร้างและแก้ไขโดยสำนัก/กองที่เป็นเจ้าของคำขอ กองแผนงานและผู้บริหารดูและพิจารณา", "Requests are made and edited by the office or division that owns them; Planning and the executive review them");
  note("consolidation", "กลุ่มงบประมาณ (กองแผนงาน) เป็นผู้รวบรวมคำขอระดับหน่วยงาน บทบาทอื่นดูอย่างเดียว", "The budget group (Planning Division) consolidates the requests at agency level; other roles view only");
}
