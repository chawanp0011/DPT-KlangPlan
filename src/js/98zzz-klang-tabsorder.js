// Fisko-KlangFinance, round P20 (16 Nov 2569): the tabs of the division request, in the order and with the names the user gave:
//   1 รายการคำขอ · 2 รายการผูกพัน (only for a multi-year request) · 3 แผนค่าใช้จ่ายงบประมาณ · 4 สถานะดำเนินการ · 5 ตัวชี้วัด · 6 ประมาณการรายจ่ายล่วงหน้า (MTEF)
//   · 7 ความพร้อมและความเสี่ยง · 8 ความสอดคล้อง · 9 เวอร์ชัน (n); the tab เอกสารอื่นๆ (file 98zzy) sits after ความสอดคล้อง
// Many earlier files add, rename or hide tabs one after another, so this last wrapper reads the finished bar and only puts its buttons in the asked order and
// renames them; the buttons keep their own state (done, warning) and their handlers (they are found by data-rtab). A tab that the request doesn't have is not made
// here (the payroll tab stays after the alignment tab when a request has one).
{
  const base = reqTabsBar;
  const ORDER = ["main", "commit", "plan", "workplan", "ind", "mtef", "ready", "align", "odocs", "payroll", "versions"];
  const NAME = () => ({ main: L("รายการคำขอ", "Request lines"), commit: L("รายการผูกพัน", "Multi-year commitment"), plan: L("แผนค่าใช้จ่ายงบประมาณ", "Budget expenditure plan"), workplan: L("สถานะดำเนินการ", "Progress status"), ind: L("ตัวชี้วัด", "Indicators"), mtef: L("ประมาณการรายจ่ายล่วงหน้า (MTEF)", "Forward expenditure estimate (MTEF)"), ready: L("ความพร้อมและความเสี่ยง", "Readiness and risks"), align: L("ความสอดคล้อง", "Alignment"), odocs: null, payroll: null, versions: null });
  reqTabsBar = function (r) {
    const html = base(r), box = document.createElement("div"); box.innerHTML = html;
    const bar = box.querySelector(".rsteps"); if (!bar) return html;
    const btns = [...bar.querySelectorAll("button[data-rtab]")], by = {}; btns.forEach(b => (by[b.dataset.rtab] = b));
    const names = NAME(), seq = ORDER.filter(id => by[id]); btns.filter(b => !ORDER.includes(b.dataset.rtab)).forEach(b => seq.push(b.dataset.rtab)); // any other tab goes last
    bar.innerHTML = "";
    seq.forEach((id, i) => { const b = by[id], warn = /⚠/.test(b.textContent), ok = /\bs-ok\b/.test(b.className), label = (names[id] || (b.querySelector("span:last-child") || b).textContent.replace(/⚠/g, "").trim()) + (warn ? " ⚠" : "");
      b.className = b.className.replace(/\brstep x\b/, "rstep").replace(/\s+/g, " ").trim();
      b.innerHTML = `<span class="rn">${ok ? "✓" : i + 1}</span><span>${label}</span>`; bar.appendChild(b); });
    return box.innerHTML;
  };
}
