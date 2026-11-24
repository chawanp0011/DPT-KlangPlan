// Design system v2 (round 24): the procurement case list is a pipeline board with a funnel strip, with the table one click away.
// 13 Nov 2569: the list follows the seven main panels of the case page (1 plan, 2 prepare, 3 e-GP, 4 contract, 5 contract management, 6 payment, 7 close), not the old twelve internal steps.
let CASE_VIEW = "board";
// 23 Nov 2569 (P46): contract management and payment are one step, so the board shows six: panel 6 is counted in 5, panel 7 is shown as 6.
const BOARD_NS = [1, 2, 3, 4, 5, 7], BOARD_COLORS = ["var(--faint)", "var(--info)", "var(--amber)", "var(--accent)", "var(--accent-2)", "var(--info)", "var(--accent)"];
const boardOf = c => { const k = caseMainNow(c); return k === 6 ? 5 : k; };
const boardNo = k => (k >= 6 ? k - 1 : k);
const boardName = k => (k === 5 || k === 6 ? ["บริหารสัญญาและเบิกจ่าย", "Contract management and payment"] : CASE_MAIN_NAMES[k - 1]);
const WHO_ICON = { proc: "user", head: "shield", exec: "checksq", req: "inbox", wait: "clock", con: "pen", none: "dot" };
function caseCard(c) {
  const n = caseState(c), ph = casePhases(c), p = famPlan(c.plan), rq = caseReq(c), nx = caseNext(c), people = [rq ? rq.by : null, c.methodApproval ? c.methodApproval.by : null, (caseCon(c) || {}).by].filter(Boolean);
  return `<div class="card" data-copen="${c.id}" role="button" tabindex="0" aria-label="${c.id} ${esc(caseName(c))}">
    <div class="cm"><span class="mono">${c.id}</span>${c.method ? `<span class="pill p-mute">${tx(PMETHOD[c.method])}</span>` : `<span class="pill p-mute">${tx(KINDS[c.kind])}</span>`}</div>
    <div class="ct">${esc(caseName(c))}</div>
    <div class="cm"><span class="amt">${mb(rq ? rq.amount : p.est)} <span class="sub">${L("ลบ.", "M")}</span></span><span>${n === 0 ? L("ยกเลิก", "Cancelled") : (c.close || ph.phases[6].done) ? L("ปิดการจัดซื้อแล้ว", "Closed") : `${L("แผงที่", "Panel")} ${boardNo(ph.cur)}/6`}</span></div>
    <div class="segbar">${ph.phases.filter(x => x.k !== 6).map(x => { const y = x.k === 5 ? { state: x.state === "done" && ph.phases[5].state === "done" ? "done" : x.state === "now" || ph.phases[5].state === "now" ? "now" : x.state } : x; return `<i class="${n === 0 ? "" : y.state === "done" ? "ok" : y.state === "now" ? "now" : ""}" title="${boardNo(x.k)}. ${esc(tx(boardName(x.k)))}"></i>`; }).join("")}</div>
    ${n !== 0 && !ph.phases[6].done ? `<div class="next">${svgI(WHO_ICON[nx.who] || "arrow")}<span>${esc(nx.raw ? nx.th : L(nx.th, nx.en))}</span></div>` : ""}
    <div class="cm"><span class="sub">${esc(lineLabel(famLine(c.line))).split(" · ")[0]}</span>${people.length ? avs(people) : ""}</div></div>`;
}
{
  const tableList = caseList;
  caseList = () => {
    const all = S.cases, byStep = BOARD_NS.map(i => all.filter(c => boardOf(c) === i).length), mx = Math.max(1, ...byStep);
    const value = sumv(all.filter(c => !c.cancelled).map(c => (caseReq(c) ? caseReq(c).amount : famPlan(c.plan).est))), waiting = all.filter(c => !c.cancelled && ["proc", "head", "exec"].includes(caseNext(c).who) && caseMainNow(c) < 5).length;
    const toggle = `<div class="viewtoggle" role="group" aria-label="${L("มุมมอง", "View")}"><button type="button" data-cview="board" class="${CASE_VIEW === "board" ? "on" : ""}">${svgI("kanban")}${L("บอร์ด", "Board")}</button><button type="button" data-cview="table" class="${CASE_VIEW === "table" ? "on" : ""}">${svgI("list")}${L("ตาราง", "Table")}</button></div>`;
    const top = `<section class="stats">
      ${statCard({ label: L("รายการจัดซื้อทั้งหมด", "All cases"), value: all.length, icon: "folder", tone: "info", sub: `${all.filter(c => c.cancelled).length} ${L("ยกเลิก", "cancelled")}` })}
      ${statCard({ label: L("มูลค่าในรายการจัดซื้อที่เปิดอยู่", "Value in open cases"), value: mb(value), unit: L("ลบ.", "M"), icon: "coins", tone: "ok", sub: "" })}
      ${statCard({ label: L("รอการดำเนินการจากคน", "Waiting for a person"), value: waiting, icon: "clock", tone: waiting ? "warn" : "", sub: L("เจ้าหน้าที่ หัวหน้า หรือผู้บริหาร", "officer, head or executive") })}
      ${statCard({ label: L("ลงนามสัญญาแล้ว", "Contracts signed"), value: all.filter(c => caseMainNow(c) >= 5).length, ring: all.length ? all.filter(c => caseMainNow(c) >= 5).length / all.length : 0, sub: "" })}</section>
      <section class="panel"><header>${chipIco("chart", "info")}<h2>${L("กรวยของรายการจัดซื้อตามแผงหลัก 6 แผง", "Cases by main panel (6)")}</h2><span class="sp"></span>${toggle}</header>
        <div class="body"><div class="funnel" style="grid-template-columns:repeat(6,minmax(0,1fr))">${byStep.map((k, i) => `<div class="${k ? "" : "zero"}" style="height:${k ? 12 + (k / mx) * 52 : 4}px" title="${i + 1}. ${esc(tx(boardName(BOARD_NS[i])))}: ${k}"></div>`).join("")}</div>
          <div class="funnel-l" style="grid-template-columns:repeat(6,minmax(0,1fr));font-size:11px">${byStep.map((k, i) => `<span title="${esc(tx(boardName(BOARD_NS[i])))}">${i + 1}. ${esc(tx(boardName(BOARD_NS[i])))}${k ? ` · <b style="color:var(--ink)">${k}</b>` : ""}</span>`).join("")}</div></div></section>`;
    if (CASE_VIEW === "table") return top + tableList().replace(/<section class="kpis"[\s\S]*?<\/section>/, "");
    const anyCx = all.some(c => caseMainNow(c) === 0);
    return `${top}<div class="board" style="grid-template-columns:repeat(${anyCx ? 7 : 6},minmax(200px,1fr))">${[...BOARD_NS, ...(anyCx ? [0] : [])].map(k => { const cs = all.filter(c => boardOf(c) === k), color = k ? BOARD_COLORS[k - 1] : "var(--faint)", nm = k ? boardName(k) : ["ยกเลิก", "Cancelled"];
      return `<div class="col" style="--c:${color}"><div class="col-h">${k ? boardNo(k) + ". " : ""}${tx(nm)}<span class="n">${cs.length}</span></div>${cs.map(caseCard).join("") || `<div class="empty">${L("ไม่มีรายการจัดซื้อ", "No cases")}</div>`}</div>`; }).join("")}</div>`;
  };
}
{
  const base = BIND.procurement;
  BIND.procurement = () => {
    base();
    if (PROC_TAB !== "cases" || CASE_OPEN) return;
    $$("[data-cview]").forEach(b => (b.onclick = () => { CASE_VIEW = b.dataset.cview; route(); }));
    $$(".card[data-copen]").forEach(el => (el.onkeydown = e => { if (e.key === "Enter") el.click(); }));
  };
}

// ---------- contracts: a phase track under the header ----------
function phaseTrack(c) {
  return `<div class="ptrack">${c.phases.map(ph => { const paid = phPaid(c, ph), acc = phaseAccepted(ph), late = !acc && !ph.cancelled && phDue(ph) < TODAY;
    const st = ph.cancelled ? ["var(--faint)", 100, L("ยกเลิก", "cancelled")] : paid ? ["var(--accent)", 100, L("จ่ายแล้ว", "paid")] : acc ? ["var(--accent-2)", 75, L("ตรวจรับแล้ว", "accepted")] : ph.delivered ? ["var(--info)", 50, L("ส่งมอบแล้ว", "delivered")] : late ? ["var(--bad)", 25, L("เลยกำหนด", "overdue")] : ["var(--line-2)", 10, fdate(phDue(ph))];
    return `<div class="ph" title="${tx(ph.name)} · ${st[2]}"><div class="bar2"><i style="width:${st[1]}%;background:${st[0]}"></i></div><span>${tx(ph.name)} · ${st[2]} · ${mb(ph.amount)}</span></div>`; }).join("")}</div>`;
}
