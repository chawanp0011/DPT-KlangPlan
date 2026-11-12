// Fisko-KlangFinance, round R4: disbursement plan and result per Project ID (month, quarter, year, and plan revision
// number), carry-over reserves ("เงินกัน") and lapsed funds ("เงินพับ"), commitment kind (single-year, new, existing),
// and a plan-versus-result dashboard. Written new for the DPT finance division (not from Fisko-ERP-Gov).
// Definitions come from the user (3 Nov 2569): a lapsed fund is budget not disbursed by year end and not reserved, or a
// reserve whose extended period has ended; it falls to state revenue at once. Reserves are read from GF in practice; here
// they are typed or imported from a file of our assumed layout. Nothing is connected to GF, eBud or BB-EVACUBE, and
// the plan is not shaped to BB-EVACUBE's real fields (not seen yet).
const PL_ACT = ["fin", "finhead"]; // who enters plans, results and reserves; everyone else views, units see only their own
const plActor = () => PL_ACT.includes(ROLE);
const fyMonths = fy => Array.from({ length: 12 }, (_, i) => `${i < 3 ? fy - 544 : fy - 543}-${String(((i + 9) % 12) + 1).padStart(2, "0")}`); // Oct of the previous Gregorian year to Sep
const PL_W = [0.05, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.08, 0.05, 0.02]; // sample spending curve for seed data
const BKIND = { year: ["งบปีเดียว", "Single-year budget"], newc: ["ผูกพันใหม่ (เริ่มปีนี้)", "New multi-year commitment (starts this year)"], oldc: ["ผูกพันเดิม (เริ่มมาแล้ว/งบส่งต่อ)", "Existing multi-year commitment (carried on)"] };
const bkindOf = p => p.bkind || "year";
const plVers = pid => (S.dpplan || []).filter(x => x.pid === pid).sort((a, b) => a.ver - b.ver);
const plCur = pid => plVers(pid).slice(-1)[0] || null;
const plSum = (v, ms) => (v ? sumv((ms || Object.keys(v.months)).map(m => v.months[m] || 0)) : 0);
const plActual = (pid, ym) => sumv((S.dpact || []).filter(a => a.pid === pid && (!ym || a.ym === ym)).map(a => a.amount));
const plQuarter = (months, q) => months.slice(q * 3, q * 3 + 3);
const resState = r => (r.kind === "lapse" ? "lapse" : r.spent >= r.amount ? "cleared" : r.until < TODAY ? "lapsed" : "active");
const resLapsed = r => { const s = resState(r); return s === "lapse" ? r.amount : s === "lapsed" ? r.amount - r.spent : 0; };
const RES_ST = { active: [["เงินกัน อยู่ในเวลา", "Reserve, in time"], "p-info"], cleared: [["เงินกัน เบิกครบแล้ว", "Reserve, fully spent"], "p-ok"], lapsed: [["เงินพับ (เงินกันหมดเวลา)", "Lapsed (reserve expired)"], "p-bad"], lapse: [["เงินพับ (สิ้นปีไม่เบิกไม่กัน)", "Lapsed (not spent or reserved at year end)"], "p-bad"] };
const plVisible = p => pjVisible(p);

// seed: baseline plans (and one revision), a few monthly results, reserves
Object.keys(SEEDS).forEach(k => {
  const prev = SEEDS[k].seed;
  SEEDS[k].seed = () => {
    const s = prev(), ms = fyMonths(CUR_FY), by = (s.users.find(u => u.role === "fin") || s.users[0]).id;
    s.dpplan = []; s.dpact = []; s.dpres = [];
    (s.pplan || []).forEach((p, i) => {
      let left = p.est; const months = {};
      ms.forEach((m, j) => { const a = j === 11 ? left : Math.round(p.est * PL_W[j] / 1000) * 1000; months[m] = a; left -= a; });
      p.bkind = i === 1 ? "newc" : i === 2 ? "oldc" : "year";
      s.dpplan.push({ id: "DP-" + String(s.dpplan.length + 1).padStart(4, "0"), pid: p.pid, ver: 0, t: "2026-10-02T09:00", by, why: "", months });
    });
    if (s.pplan.length) { // one revision: move 40% of November to January
      const base = s.dpplan[0], months = { ...base.months }, mv = Math.round(months[ms[1]] * 0.4 / 1000) * 1000; months[ms[1]] -= mv; months[ms[3]] += mv;
      s.dpplan.push({ id: "DP-" + String(s.dpplan.length + 1).padStart(4, "0"), pid: base.pid, ver: 1, t: "2026-10-12T14:00", by, why: "ส่งมอบงวดแรกล่าช้า เลื่อนการเบิกจากพฤศจิกายนไปมกราคม", months });
      s.dpact.push({ id: "AC-0001", pid: s.pplan[0].pid, ym: ms[0], amount: 3000000, src: "manual", by, t: "2026-10-14T10:00" });
    }
    s.dpres.push({ id: "RS-0001", kind: "reserve", fy: 2569, ref: "สัญญาก่อสร้างอาคารตัวอย่าง (เงินกัน FY2569)", pid: "", amount: 8000000, spent: 3500000, until: "2027-03-31", by, t: "2026-10-05T09:00", src: "manual" },
      { id: "RS-0002", kind: "reserve", fy: 2569, ref: "จัดซื้อระบบตัวอย่าง (เงินกัน FY2569 ขยายเวลาแล้ว)", pid: "", amount: 2500000, spent: 1300000, until: "2026-09-30", by, t: "2026-10-05T09:10", src: "manual" },
      { id: "RS-0003", kind: "lapse", fy: 2569, ref: "งบอบรมตัวอย่างที่เบิกไม่ทันและไม่ได้กัน", pid: "", amount: 450000, spent: 0, until: "", by, t: "2026-10-05T09:20", src: "manual" });
    return s;
  };
});

// ---------- plan: one record per Project ID, edits create a new revision ----------
const planFields = (p, v) => {
  const cur = p ? plCur(p.pid) : null, ms = fyMonths(CUR_FY);
  return [{ id: "bkind", label: ["ลักษณะงบ", "Budget kind"], type: "select", req: true, value: p ? bkindOf(p) : "year", opts: Object.keys(BKIND).map(k => [k, tx(BKIND[k])]) },
    ...ms.map((m, i) => ({ id: "m" + i, label: [`แผนเบิก ${m}`, `Planned ${m}`], type: "number", min: 0, req: true, value: cur ? cur.months[m] || 0 : 0 }))];
};
CRUD.def("dplan", {
  noun: ["แผนเบิกจ่าย", "Disbursement plan"], st: { none: [["ยังไม่มีแผน", "No plan"], "p-mute"], on: [["มีแผนแล้ว", "Planned"], "p-ok"], rev: [["ปรับแผนแล้ว", "Revised"], "p-info"] }, live: false,
  list: () => (S.pplan || []).filter(plVisible), id: p => p.pid, title: p => `${p.pid} · ${tx(p.name)}`, sub: p => `${tx(BKIND[bkindOf(p)])} · ${baht(p.est)}`,
  status: p => { const c = plCur(p.pid); return !c ? "none" : c.ver ? "rev" : "on"; }, search: p => `${p.pid} ${tx(p.name)}`,
  filters: [{ id: "k", label: ["ลักษณะงบ", "Budget kind"], opts: () => Object.keys(BKIND).map(k => [k, tx(BKIND[k])]), get: p => bkindOf(p) }, { id: "u", label: ["หน่วย", "Unit"], opts: () => allUnitOpts(), get: p => famLine(p.line).unit }],
  cols: [{ h: ["รหัสโครงการ", "Project ID"], c: p => `<span class="mono">${p.pid}</span>` }, { h: ["รายการ", "Item"], c: p => esc(tx(p.name)) }, { h: ["ลักษณะงบ", "Kind"], c: p => esc(tx(BKIND[bkindOf(p)])) }, { h: ["วงเงิน (บาท)", "Amount"], n: true, c: p => fmt(p.est) },
    { h: ["แผนปัจจุบัน (บาท)", "Current plan"], n: true, c: p => (plCur(p.pid) ? fmt(plSum(plCur(p.pid))) : "–") }, { h: ["ผลเบิก (บาท)", "Result"], n: true, c: p => fmt(plActual(p.pid)) }, { h: ["ครั้งที่", "Rev."], c: p => (plCur(p.pid) ? plCur(p.pid).ver : "–") }],
  fields: planFields,
  check: (v, p) => { const tot = sumv(fyMonths(CUR_FY).map((m, i) => Number(v["m" + i]) || 0)); return tot > p.est ? [{ f: null, m: `${L("แผนรวม", "Plan total")} ${fmt(tot)} ${L("เกินวงเงิน", "exceeds the amount")} ${fmt(p.est)}` }] : []; },
  edit: { can: p => plActor(), why: p => !!plCur(p.pid), run: (p, v, why) => {
    const ms = fyMonths(CUR_FY), months = {}; ms.forEach((m, i) => (months[m] = Number(v["m" + i]) || 0)); const cur = plCur(p.pid);
    p.bkind = v.bkind;
    if (cur && JSON.stringify(cur.months) === JSON.stringify(months)) { audit(["แก้ลักษณะงบ", "Edited the budget kind"], p.pid); return; } // only the kind changed: no new revision
    const d = { id: eNextId("DP-", S.dpplan), pid: p.pid, ver: cur ? cur.ver + 1 : 0, t: nowIso(), by: me().id, why: why || "", months }; S.dpplan.push(d);
    audit(cur ? ["ปรับแผนเบิก", "Revised a disbursement plan"] : ["ตั้งแผนเบิก", "Set a disbursement plan"], `${p.pid} ครั้งที่ ${d.ver}${why ? " · " + why : ""}`); } },
  view: p => {
    const c = plCur(p.pid), ms = fyMonths(CUR_FY); if (!c) return `<div class="sub">${L("ยังไม่มีแผนเบิก กดแก้ไขเพื่อตั้งแผน", "No plan yet; use Edit to set one")}</div>`;
    let cp = 0, ca = 0;
    return kv([[L("รหัสโครงการ", "Project ID"), `<span class="mono">${p.pid}</span>`], [L("รายการ", "Item"), esc(tx(p.name))], [L("ลักษณะงบ", "Kind"), esc(tx(BKIND[bkindOf(p)]))], [L("วงเงิน", "Amount"), baht(p.est)], [L("แผนครั้งที่", "Plan revision"), c.ver], [L("แผนรวม / ผลรวม", "Plan / result"), `${baht(plSum(c))} / ${baht(plActual(p.pid))}`]])
      + `<div class="tbl-wrap"><table><thead><tr><th>${L("เดือน", "Month")}</th><th class="n">${L("แผน", "Plan")}</th><th class="n">${L("ผล", "Result")}</th><th class="n">${L("สะสมแผน", "Cum. plan")}</th><th class="n">${L("สะสมผล", "Cum. result")}</th></tr></thead><tbody>${ms.map(m => { const a = plActual(p.pid, m); cp += c.months[m] || 0; ca += a; return `<tr><td class="mono">${m}</td><td class="n">${fmt(c.months[m] || 0)}</td><td class="n">${a ? fmt(a) : "–"}</td><td class="n">${fmt(cp)}</td><td class="n">${m <= TODAY.slice(0, 7) ? fmt(ca) : "–"}</td></tr>`; }).join("")}</tbody></table></div>
      <p class="sub">${L("ไตรมาส", "Quarters")}: ${[0, 1, 2, 3].map(q => `Q${q + 1} ${fmt(plSum(c, plQuarter(ms, q)))}`).join(" · ")}</p>`;
  },
  tabs: p => [["vers", L("ครั้งที่ปรับแผน", "Revisions"), (() => { const v = plVers(p.pid); return v.length ? `<div class="tbl-wrap"><table><thead><tr><th>${L("ครั้งที่", "Rev.")}</th><th>${L("เมื่อ", "When")}</th><th>${L("โดย", "By")}</th><th class="n">${L("แผนรวม", "Total")}</th><th>${L("เหตุผล", "Reason")}</th></tr></thead><tbody>${v.map(x => `<tr><td>${x.ver ? x.ver : L("ตั้งต้น", "Base")}</td><td>${fdate(x.t, true)}</td><td>${esc(userName(x.by))}</td><td class="n">${fmt(plSum(x))}</td><td>${esc(x.why || "–")}</td></tr>`).join("")}</tbody></table></div><p class="sub">${L("ทุกครั้งเก็บไว้ ไม่ทับของเดิม", "Every revision is kept; none overwrites an earlier one")}</p>` : `<div class="sub">${L("ยังไม่มีแผน", "No plan yet")}</div>`; })()]],
});

// ---------- results ----------
CRUD.def("dpact", {
  noun: ["ผลเบิกจ่ายรายเดือน", "Monthly result"], st: { on: [["บันทึกแล้ว", "Recorded"], "p-ok"] }, live: false,
  list: () => (S.dpact || []).filter(a => { const p = pjItem(a.pid); return p && plVisible(p); }), id: a => a.id, title: a => `${a.id} · ${a.pid}`, sub: a => `${a.ym} · ${baht(a.amount)}`, status: () => "on", search: a => `${a.id} ${a.pid} ${a.ym}`,
  filters: [{ id: "m", label: ["เดือน", "Month"], opts: () => fyMonths(CUR_FY).map(m => [m, m]), get: a => a.ym }],
  cols: [{ h: ["เลขที่", "No."], c: a => `<span class="mono">${a.id}</span>` }, { h: ["รหัสโครงการ", "Project ID"], c: a => `<span class="mono">${a.pid}</span>` }, { h: ["เดือน", "Month"], c: a => a.ym }, { h: ["ผลเบิก (บาท)", "Result"], n: true, c: a => fmt(a.amount) }, { h: ["ที่มา", "Source"], c: a => (a.src === "file" ? L("ไฟล์", "File") : L("กรอกเอง", "Typed")) }],
  fields: (a, v) => [{ id: "pid", label: ["รหัสโครงการ", "Project ID"], type: "select", req: true, lock: !!a, show: a ? a.pid : "", value: a ? a.pid : "", opts: (S.pplan || []).filter(plVisible).map(p => [p.pid, `${p.pid} ${tx(p.name)}`]) },
    { id: "ym", label: ["เดือน", "Month"], type: "select", req: true, lock: !!a, show: a ? a.ym : "", value: a ? a.ym : fyMonths(CUR_FY).find(m => m >= TODAY.slice(0, 7)) || fyMonths(CUR_FY)[0], opts: fyMonths(CUR_FY).map(m => [m, m]) }, { id: "amount", label: ["ผลเบิกจ่าย (บาท)", "Result (baht)"], type: "number", req: true, min: 1, value: a ? a.amount : "" }],
  check: (v, a) => { const pid = a ? a.pid : v.pid, ym = a ? a.ym : v.ym, p = pjItem(pid), e = [], dup = (S.dpact || []).find(x => x !== a && x.pid === pid && x.ym === ym); if (dup) e.push({ f: "ym", m: L("เดือนนี้มีผลเบิกของรหัสโครงการนี้แล้ว แก้แถวเดิม", "This month already has a result for this Project ID; edit that row") });
    if (p && plActual(pid) - (a ? a.amount : 0) + Number(v.amount) > p.est) e.push({ f: "amount", m: L("ผลเบิกสะสมเกินวงเงินของรายการ", "Cumulative result exceeds the item amount") }); return e; },
  create: { can: plActor, label: ["บันทึกผลเบิกจ่าย", "Record a result"], run: v => { const a = { id: eNextId("AC-", S.dpact), pid: v.pid, ym: v.ym, amount: v.amount, src: "manual", by: me().id, t: nowIso() }; S.dpact.push(a); audit(["บันทึกผลเบิกจ่าย", "Recorded a result"], `${a.pid} ${a.ym}`); return a; } },
  edit: { can: () => plActor(), why: () => true, run: (a, v, why) => { const old = a.amount; a.amount = v.amount; a.t = nowIso(); audit(["แก้ผลเบิกจ่าย", "Edited a result"], `${a.id} ${fmt(old)} → ${fmt(v.amount)} · ${why}`); } },
  acts: a => (plActor() ? [{ id: "del", label: L("ลบ", "Delete"), kind: "danger", why: true, run: (x, why) => { S.dpact = S.dpact.filter(y => y !== x); audit(["ลบผลเบิกจ่าย", "Deleted a result"], `${x.id} · ${why}`); return L("ลบแล้ว", "Deleted"); } }] : []),
  view: a => kv([[L("รหัสโครงการ", "Project ID"), `<span class="mono">${a.pid}</span>`], [L("เดือน", "Month"), a.ym], [L("ผลเบิกจ่าย", "Result"), baht(a.amount)], [L("ที่มา", "Source"), a.src === "file" ? L("นำเข้าไฟล์", "File import") : L("กรอกเอง", "Typed")]]),
});

// ---------- reserves and lapsed funds ----------
CRUD.def("dpres", {
  noun: ["เงินกัน / เงินพับ", "Reserve / lapsed fund"], st: RES_ST, live: false,
  list: () => S.dpres || [], id: r => r.id, title: r => `${r.id} · ${r.ref}`, sub: r => `FY${r.fy} · ${baht(r.amount)}`, status: r => resState(r), search: r => `${r.id} ${r.ref} ${r.pid || ""}`,
  filters: [{ id: "st", label: ["สถานะ", "Status"], opts: () => Object.keys(RES_ST).map(k => [k, tx(RES_ST[k][0])]), get: r => resState(r) }],
  cols: [{ h: ["เลขที่", "No."], c: r => `<span class="mono">${r.id}</span>` }, { h: ["รายการ", "Item"], c: r => esc(r.ref) }, { h: ["ปีงบ", "FY"], c: r => r.fy }, { h: ["วงเงิน (บาท)", "Amount"], n: true, c: r => fmt(r.amount) }, { h: ["เบิกแล้ว (บาท)", "Spent"], n: true, c: r => fmt(r.spent) },
    { h: ["ขยายเวลาถึง", "Valid until"], c: r => (r.until ? fdate(r.until) : "–") }, { h: ["เงินพับ (บาท)", "Lapsed"], n: true, c: r => (resLapsed(r) ? fmt(resLapsed(r)) : "–") }],
  fields: (r, v) => [{ id: "kind", label: ["ประเภท", "Kind"], type: "select", req: true, value: r ? r.kind : "reserve", opts: [["reserve", tx(["เงินกันเหลื่อมปี", "Carry-over reserve"])], ["lapse", tx(["เงินพับ (ไม่เบิก ไม่กัน)", "Lapsed (not spent, not reserved)"])]] },
    { id: "fy", label: ["ปีงบ (พ.ศ.)", "Fiscal year"], type: "number", req: true, min: 2560, max: 2599, value: r ? r.fy : 2569 }, { id: "ref", label: ["รายการ / เลขที่อ้างอิง", "Item / reference"], req: true, value: r ? r.ref : "", wide: true },
    { id: "pid", label: ["รหัสโครงการ (ถ้ามี)", "Project ID (if any)"], type: "select", blank: L("ไม่ระบุ", "None"), value: r ? r.pid : "", opts: (S.pplan || []).map(p => [p.pid, `${p.pid} ${tx(p.name)}`]) },
    { id: "amount", label: ["วงเงิน (บาท)", "Amount (baht)"], type: "number", req: true, min: 1, value: r ? r.amount : "" }, { id: "spent", label: ["เบิกแล้ว (บาท) เฉพาะเงินกัน", "Spent so far (reserve only)"], type: "number", min: 0, value: r ? r.spent : 0 },
    { id: "until", label: ["ขยายเวลาเบิกถึง (เฉพาะเงินกัน)", "Valid until (reserve only)"], type: "date", value: r ? r.until : "" }],
  check: v => [...(v.kind === "reserve" && !v.until ? [{ f: "until", m: L("เงินกันต้องมีวันที่ขยายเวลาถึง", "A reserve needs a valid-until date") }] : []), ...(Number(v.spent) > Number(v.amount) ? [{ f: "spent", m: L("เบิกแล้วเกินวงเงิน", "Spent exceeds the amount") }] : [])],
  create: { can: plActor, label: ["เพิ่มเงินกัน/เงินพับ", "Add a reserve or lapsed fund"], run: v => { const r = { id: eNextId("RS-", S.dpres), kind: v.kind, fy: v.fy, ref: v.ref, pid: v.pid || "", amount: v.amount, spent: v.kind === "lapse" ? 0 : Number(v.spent) || 0, until: v.kind === "lapse" ? "" : v.until, by: me().id, t: nowIso(), src: "manual" }; S.dpres.push(r); audit(["เพิ่มเงินกัน/เงินพับ", "Added a reserve or lapsed fund"], `${r.id} ${r.ref}`); return r; } },
  edit: { can: () => plActor(), why: () => true, run: (r, v, why) => { Object.assign(r, { kind: v.kind, fy: v.fy, ref: v.ref, pid: v.pid || "", amount: v.amount, spent: v.kind === "lapse" ? 0 : Number(v.spent) || 0, until: v.kind === "lapse" ? "" : v.until }); audit(["แก้เงินกัน/เงินพับ", "Edited a reserve or lapsed fund"], `${r.id} · ${why}`); } },
  acts: r => (plActor() ? [{ id: "del", label: L("ลบ", "Delete"), kind: "danger", why: true, run: (x, why) => { S.dpres = S.dpres.filter(y => y !== x); audit(["ลบเงินกัน/เงินพับ", "Deleted a reserve or lapsed fund"], `${x.id} · ${why}`); return L("ลบแล้ว", "Deleted"); } }] : []),
  view: r => kv([[L("ประเภท", "Kind"), esc(tx(RES_ST[resState(r)][0]))], [L("รายการ", "Item"), esc(r.ref)], [L("ปีงบ", "FY"), r.fy], r.pid && [L("รหัสโครงการ", "Project ID"), `<span class="mono">${r.pid}</span>`], [L("วงเงิน", "Amount"), baht(r.amount)], [L("เบิกแล้ว", "Spent"), baht(r.spent)], r.until && [L("ขยายเวลาถึง", "Valid until"), fdate(r.until)],
    [L("คงเหลือ", "Remaining"), baht(r.kind === "lapse" ? 0 : r.amount - r.spent)], resLapsed(r) ? [L("เป็นเงินพับ (รายได้แผ่นดิน)", "Lapsed (state revenue)"), `<b>${baht(resLapsed(r))}</b>`] : null,
    [L("ที่มา", "Source"), r.src === "file" ? L("นำเข้าไฟล์ (รูปแบบสมมุติ)", "File import (assumed layout)") : L("กรอกเอง ในระบบจริงดึงจาก GF", "Typed; in practice read from GF")]]),
});

// ---------- import adapters (registered into the PJ3 page of round R1) ----------
Object.assign(PJ_IMPORT, {
  actual: {
    name: ["ผลเบิกจ่ายรายเดือน (จาก GF)", "Monthly disbursement results (from GF)"], cols: ["pid", "ym", "amount"], layout: "pid,ym,amount (ym = YYYY-MM within the fiscal year)",
    check: (r, i, all) => {
      const p = pjItem(r.pid); if (!p) return L("ไม่พบรหัสโครงการ", "Project ID not found");
      if (!fyMonths(CUR_FY).includes(r.ym)) return L("เดือนอยู่นอกปีงบปัจจุบัน", "Month outside the current fiscal year");
      if (!(Number(r.amount) > 0)) return L("จำนวนเงินต้องมากกว่า 0", "Amount must be above 0");
      if (all.some((x, j) => j < i && x.pid === r.pid && x.ym === r.ym)) return L("ซ้ำกับแถวก่อนหน้าในไฟล์", "Repeats an earlier row");
      const other = sumv((S.dpact || []).filter(a => a.pid === r.pid && a.ym !== r.ym).map(a => a.amount)) + sumv(all.slice(0, i).filter(x => x.pid === r.pid).map(x => Number(x.amount) || 0));
      return other + Number(r.amount) > p.est ? L("ผลเบิกสะสมเกินวงเงินของรายการ", "Cumulative result exceeds the item amount") : "";
    },
    apply: r => { const ex = (S.dpact || []).find(a => a.pid === r.pid && a.ym === r.ym); if (ex) { ex.amount = Number(r.amount); ex.src = "file"; ex.t = nowIso(); } else S.dpact.push({ id: eNextId("AC-", S.dpact), pid: r.pid, ym: r.ym, amount: Number(r.amount), src: "file", by: me().id, t: nowIso() }); audit(["นำเข้าผลเบิกจ่าย", "Imported a result"], `${r.pid} ${r.ym}`); },
    show: r => `${r.pid} · ${r.ym} · ${fmt(Number(r.amount) || 0)}`,
    sample: () => (S.pplan || []).slice(1, 3).map(p => `${p.pid},${fyMonths(CUR_FY)[0]},${Math.round(p.est * 0.04 / 1000) * 1000}`).concat([`${PID_FMT.prefix}-${CUR_FY}-99999,${fyMonths(CUR_FY)[0]},1000`]),
  },
  reserve: {
    name: ["เงินกัน / เงินพับ (จาก GF)", "Reserves and lapsed funds (from GF)"], cols: ["fy", "kind", "ref", "amount"], head: ["fy", "kind", "ref", "amount", "spent", "until", "pid"], layout: "fy,kind,ref,amount,spent,until,pid (kind = reserve | lapse; spent, until, pid optional)",
    check: r => {
      const fy = Number(r.fy); if (!(fy >= 2560 && fy <= 2599)) return L("ปีงบไม่ถูกต้อง", "Invalid fiscal year");
      if (!["reserve", "lapse"].includes(r.kind)) return L("kind ต้องเป็น reserve หรือ lapse", "kind must be reserve or lapse");
      if (!r.ref) return L("ไม่มีรายการอ้างอิง", "No reference");
      if (!(Number(r.amount) > 0)) return L("จำนวนเงินต้องมากกว่า 0", "Amount must be above 0");
      if (Number(r.spent || 0) > Number(r.amount)) return L("เบิกแล้วเกินวงเงิน", "Spent exceeds the amount");
      if (r.kind === "reserve" && !/^\d{4}-\d{2}-\d{2}$/.test(r.until || "")) return L("เงินกันต้องมี until เป็น YYYY-MM-DD", "A reserve needs until as YYYY-MM-DD");
      if (r.pid && !pjItem(r.pid)) return L("ไม่พบรหัสโครงการ", "Project ID not found");
      if ((S.dpres || []).some(x => x.ref === r.ref && x.fy === fy)) return L("มีรายการอ้างอิงนี้ในปีงบนี้แล้ว", "This reference already exists for the year");
      return "";
    },
    apply: r => { S.dpres.push({ id: eNextId("RS-", S.dpres), kind: r.kind, fy: Number(r.fy), ref: r.ref, pid: r.pid || "", amount: Number(r.amount), spent: r.kind === "lapse" ? 0 : Number(r.spent) || 0, until: r.kind === "lapse" ? "" : r.until, by: me().id, t: nowIso(), src: "file" }); audit(["นำเข้าเงินกัน/เงินพับ", "Imported a reserve or lapsed fund"], r.ref); },
    show: r => `${r.fy} · ${r.kind} · ${r.ref} · ${fmt(Number(r.amount) || 0)}`,
    sample: () => [`2569,reserve,เงินกันตัวอย่างนำเข้า ก,1200000,200000,${TODAY.slice(0, 4)}-12-31,`, `2569,lapse,งบตัวอย่างนำเข้า ข ที่พับ,300000,,,`],
  },
});

// ---------- dashboard ----------
let PL_VIEW = { period: "month", base: "cur" };
function plSeries(units) {
  const ms = fyMonths(CUR_FY), P = (S.pplan || []).filter(p => plVisible(p) && (!units || famLine(p.line).unit === units));
  const planOf = p => { const v = PL_VIEW.base === "base" ? plVers(p.pid)[0] : plCur(p.pid); return v ? v.months : {}; };
  const m = ms.map(x => ({ ym: x, plan: sumv(P.map(p => planOf(p)[x] || 0)), act: sumv(P.map(p => plActual(p.pid, x))) }));
  if (PL_VIEW.period === "month") return m.map(x => ({ label: x.ym.slice(2), ...x }));
  if (PL_VIEW.period === "quarter") return [0, 1, 2, 3].map(q => ({ label: "Q" + (q + 1), plan: sumv(m.slice(q * 3, q * 3 + 3).map(x => x.plan)), act: sumv(m.slice(q * 3, q * 3 + 3).map(x => x.act)) }));
  return [{ label: L("ทั้งปี", "Year"), plan: sumv(m.map(x => x.plan)), act: sumv(m.map(x => x.act)) }];
}
function plChart(data) {
  const W = 640, H = 220, pad = 36, mx = Math.max(1, ...data.map(d => Math.max(d.plan, d.act))), bw = (W - pad - 10) / data.length, y = v => H - 28 - (v / mx) * (H - 50);
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${L("แผนเทียบผลเบิกจ่าย", "Plan versus result")}" style="width:100%;max-width:${W}px;height:auto">
    <line x1="${pad}" y1="${H - 28}" x2="${W - 6}" y2="${H - 28}" stroke="var(--line)"/><text x="4" y="14" font-size="11" fill="var(--muted)">${fmt(mx / 1e6, 1)} ${L("ล้านบาท", "M baht")}</text>
    ${data.map((d, i) => { const x0 = pad + i * bw + bw * 0.12, w = bw * 0.36; return `<rect x="${x0}" y="${y(d.plan)}" width="${w}" height="${H - 28 - y(d.plan)}" fill="var(--accent)" opacity=".35"><title>${d.label} ${L("แผน", "plan")} ${fmt(d.plan)}</title></rect><rect x="${x0 + w + 2}" y="${y(d.act)}" width="${w}" height="${H - 28 - y(d.act)}" fill="var(--accent)"><title>${d.label} ${L("ผล", "result")} ${fmt(d.act)}</title></rect><text x="${x0 + w}" y="${H - 12}" font-size="10" text-anchor="middle" fill="var(--muted)">${d.label}</text>`; }).join("")}
  </svg><div class="sub"><span style="display:inline-block;width:10px;height:10px;background:var(--accent);opacity:.35"></span> ${L("แผน", "Plan")} &nbsp; <span style="display:inline-block;width:10px;height:10px;background:var(--accent)"></span> ${L("ผลเบิกจ่าย", "Result")}</div>`;
}
const PL_APP = "DPT Budget";
Object.assign(GROUPS, { plg: ["แผน-ผลเบิกจ่าย", "Plan and result"] });
APPS.budget.groups.push("plg");
{ const base = appOfLink; appOfLink = l => (typeof l === "string" && l.startsWith("pl-") ? "budget" : base(l)); }
ePageDef("budget", "pl-plan", "PL1", "plg", KROLES, ["แผนเบิกจ่าย", "Disbursement plan"], () => `${eHead(PL_APP, "PL1", ["แผนเบิกจ่ายรายโครงการ", "Disbursement plan by Project ID"], ["ตั้งแผนรายเดือนต่อรหัสโครงการ (รวมเป็นไตรมาสและปีให้เอง) ปรับแผนทุกครั้งเก็บเป็นครั้งที่ใหม่ พร้อมเหตุผล ไม่ทับของเดิม · เฉพาะการเงิน (fin, finhead) ตั้งและปรับแผนได้ บทบาทอื่นดู หน่วยเห็นของตน (สมมุติ ต้องยืนยัน)", "Monthly plan per Project ID (quarters and year add up automatically); each adjustment is kept as a new revision with a reason · only finance (fin, finhead) sets and revises plans, others view, units see their own (assumed, to confirm)"])}
  ${crudList("dplan", { head: `<h2>${L("แผน", "Plans")}</h2>` })}`);
ePageDef("budget", "pl-act", "PL2", "plg", KROLES, ["ผลเบิกจ่าย", "Disbursement result"], () => `${eHead(PL_APP, "PL2", ["ผลเบิกจ่ายรายเดือน", "Monthly disbursement results"], ["กรอกเอง หรือนำเข้าไฟล์ (ชนิด ผลเบิกจ่ายรายเดือน ที่ PJ3) ผลเบิกสะสมต่อรหัสโครงการเกินวงเงินไม่ได้ · ในระบบจริงผลมาจาก GF ซึ่งยังไม่เชื่อม", "Typed or imported (type monthly results on PJ3); the cumulative result per Project ID can't exceed the item amount · in practice results come from GF, not connected"])}
  ${crudList("dpact", { head: `<h2>${L("ผลเบิกจ่าย", "Results")}</h2>` })}`);
ePageDef("budget", "pl-res", "PL3", "plg", KROLES, ["เงินกัน / เงินพับ", "Reserves and lapsed funds"], () => {
  const R = S.dpres || [], act = R.filter(r => resState(r) === "active");
  return `${eHead(PL_APP, "PL3", ["เงินกันเหลื่อมปี และเงินพับ", "Carry-over reserves and lapsed funds"], ["เงินกัน = งบที่กันไว้เบิกต่อ ขยายเวลาได้ · เงินพับ = งบที่เบิกไม่ทันสิ้นปีและไม่ได้กัน หรือเงินกันที่หมดเวลาแล้ว ตกเป็นรายได้แผ่นดินทันที (นิยามจากผู้ใช้ ยังไม่ได้เทียบกับระเบียบ) · ในระบบจริงดึงจาก GF ที่ยังไม่เชื่อม", "Reserve = budget set aside to spend later, extendable · lapsed = budget not spent by year end and not reserved, or a reserve whose time has ended; it falls to state revenue at once (the user's definition, not checked against the rules) · in practice read from GF, not connected"])}
    ${eKpis([[L("เงินกันที่ยังอยู่ในเวลา (คงเหลือ)", "Active reserves (remaining)"), fmt(sumv(act.map(r => r.amount - r.spent))), `${act.length} ${L("รายการ", "items")}`], [L("เงินพับรวม", "Total lapsed"), fmt(sumv(R.map(resLapsed))), "", R.some(r => resLapsed(r) > 0)], [L("เงินกันใกล้หมดเวลา (60 วัน)", "Reserves ending in 60 days"), act.filter(r => r.until <= addDays(TODAY, 60)).length]])}
    ${crudList("dpres", { head: `<h2>${L("รายการ", "Items")}</h2>` })}`;
});
ePageDef("budget", "pl-dash", "PL4", "plg", KROLES, ["แดชบอร์ดแผน-ผล", "Plan versus result"], () => {
  const P = (S.pplan || []).filter(plVisible), ser = plSeries(), ms = fyMonths(CUR_FY), now = TODAY.slice(0, 7), upto = ms.filter(m => m <= now);
  const planNow = sumv(P.map(p => { const c = plCur(p.pid); return c ? plSum(c, upto) : 0; })), actNow = sumv(P.map(p => sumv(upto.map(m => plActual(p.pid, m))))), planAll = sumv(P.map(p => plSum(plCur(p.pid) || { months: {} }))), actAll = sumv(P.map(p => plActual(p.pid))), tot = sumv(P.map(p => p.est));
  const pct = (a, b) => (b ? Math.round((a / b) * 100) + "%" : "–"), kinds = Object.keys(BKIND), units = [...new Set(P.map(p => famLine(p.line).unit))];
  const row = (label, list) => `<tr><td>${label}</td><td class="n">${list.length}</td><td class="n">${fmt(sumv(list.map(p => p.est)))}</td><td class="n">${fmt(sumv(list.map(p => plSum(plCur(p.pid) || { months: {} }))))}</td><td class="n">${fmt(sumv(list.map(p => plActual(p.pid))))}</td><td class="n">${pct(sumv(list.map(p => plActual(p.pid))), sumv(list.map(p => p.est)))}</td></tr>`;
  const head = `<tr><th></th><th class="n">${L("รายการ", "Items")}</th><th class="n">${L("วงเงิน", "Amount")}</th><th class="n">${L("แผนทั้งปี", "Plan, year")}</th><th class="n">${L("ผลเบิก", "Result")}</th><th class="n">${L("ผล/วงเงิน", "Result/amount")}</th></tr>`;
  return `${eHead(PL_APP, "PL4", ["แดชบอร์ดแผน-ผลเบิกจ่าย", "Plan versus result dashboard"], ["เทียบแผนเบิกกับผลเบิกจ่าย รายเดือน ไตรมาส ปี และเทียบแผนครั้งล่าสุดกับแผนตั้งต้น แยกตามลักษณะงบและหน่วย · ข้อมูลตัวอย่าง ผลเบิกยังไม่ได้มาจาก GF จริง", "Plan against result by month, quarter and year, latest plan against the baseline, by budget kind and unit · sample data; results are not from real GF"])}
    ${eKpis([[L("แผนสะสมถึงเดือนนี้", "Plan to date"), fmt(planNow)], [L("ผลสะสม", "Result to date"), fmt(actNow), pct(actNow, planNow) + " " + L("ของแผน", "of plan")], [L("แผนทั้งปี", "Plan, year"), fmt(planAll), pct(planAll, tot) + " " + L("ของวงเงิน", "of amount")], [L("ผลทั้งปี", "Result, year"), fmt(actAll), pct(actAll, tot) + " " + L("ของวงเงิน", "of amount")], [L("เงินพับรวม", "Total lapsed"), fmt(sumv((S.dpres || []).map(resLapsed))), "", (S.dpres || []).some(r => resLapsed(r) > 0)]])}
    <section class="panel"><header><h2>${L("แผนเทียบผล", "Plan versus result")}</h2><span class="sp"></span>
      <select id="pl-period" aria-label="${L("ช่วงเวลา", "Period")}"><option value="month" ${PL_VIEW.period === "month" ? "selected" : ""}>${L("รายเดือน", "Monthly")}</option><option value="quarter" ${PL_VIEW.period === "quarter" ? "selected" : ""}>${L("รายไตรมาส", "Quarterly")}</option><option value="year" ${PL_VIEW.period === "year" ? "selected" : ""}>${L("รายปี", "Yearly")}</option></select>
      <select id="pl-base" aria-label="${L("แผนที่ใช้", "Plan used")}"><option value="cur" ${PL_VIEW.base === "cur" ? "selected" : ""}>${L("แผนครั้งล่าสุด", "Latest plan")}</option><option value="base" ${PL_VIEW.base === "base" ? "selected" : ""}>${L("แผนตั้งต้น", "Baseline plan")}</option></select></header>
      <div class="body">${plChart(ser)}<div class="tbl-wrap"><table><thead><tr><th></th><th class="n">${L("แผน", "Plan")}</th><th class="n">${L("ผล", "Result")}</th><th class="n">${L("ผล/แผน", "Result/plan")}</th></tr></thead><tbody>${ser.map(d => `<tr><td>${d.label}</td><td class="n">${fmt(d.plan)}</td><td class="n">${fmt(d.act)}</td><td class="n">${pct(d.act, d.plan)}</td></tr>`).join("")}</tbody></table></div></div></section>
    <section class="panel"><header><h2>${L("แยกตามลักษณะงบ", "By budget kind")}</h2></header><div class="tbl-wrap"><table><thead>${head}</thead><tbody>${kinds.map(k => row(esc(tx(BKIND[k])), P.filter(p => bkindOf(p) === k))).join("")}</tbody></table></div></section>
    <section class="panel"><header><h2>${L("แยกตามหน่วย", "By unit")}</h2></header><div class="tbl-wrap"><table><thead>${head}</thead><tbody>${units.map(u => row(esc(unitName(u)), P.filter(p => famLine(p.line).unit === u))).join("")}</tbody></table></div></section>`;
}, () => {
  const a = $("#pl-period"), b = $("#pl-base"); a.onchange = () => { PL_VIEW.period = a.value; route(); }; b.onchange = () => { PL_VIEW.base = b.value; route(); };
});
{
  const base = famTasks;
  famTasks = R => {
    base(R);
    if (!S.dpplan || !plActor()) return;
    const none = (S.pplan || []).filter(p => !plCur(p.pid)); if (none.length) R(L(`ตั้งแผนเบิกให้ ${none.length} รายการ`, `Set disbursement plans for ${none.length} items`), none.slice(0, 3).map(p => p.pid).join(", "), TODAY, "pl-plan", "p-info");
    (S.dpres || []).filter(r => resState(r) === "active" && r.until <= addDays(TODAY, 60)).forEach(r => R(`${L("เงินกันใกล้หมดเวลา", "Reserve ending soon")} ${r.id}`, `${r.ref} · ${baht(r.amount - r.spent)}`, r.until, "pl-res", "p-warn"));
  };
}
Object.assign(NAV_ICON, { "pl-plan": "clock", "pl-act": "coins", "pl-res": "layers", "pl-dash": "trend" });
