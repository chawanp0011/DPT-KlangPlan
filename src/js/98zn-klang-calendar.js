// KlangFinance, budget round Q1 (12 Nov 2569): the budget calendar, split into the Budget Bureau's dates and the agency's own.
// What was asked: a calendar built from the Budget Bureau's dates and from the agency's internal dates. What existed was S.calendar
// (six milestones with a date, an owner role and a name) shown on the B1 page and on the home page, and a list the administrator
// could edit. This round gives it, on page BQ12:
//   - a kind on every milestone: "bureau" (a date the Budget Bureau sets) or "internal" (the agency's own date);
//   - a month grid (Thai months, Buddhist year) beside the list, with the two kinds in different colours, overdue ones in red and
//     finished ones struck through, and filters: kind, only mine, open or done or overdue;
//   - an end date (for a period), the unit it concerns, a reminder window in days, a note, and done/not done;
//   - reminders: an open milestone that is within its reminder window, or overdue, appears in "My work" of the role that owns it
//     (and Planning sees every Bureau date);
//   - export to a calendar file (.ics) and to CSV.
// Planning and administrators add and edit; the owner role (or Planning) marks one done. The six original milestones keep their
// ids (the submission page and rule BR-06 read c2 and c6) and cannot be deleted, only edited.
// The Bureau's dates are typed by Planning: nothing is received from the Bureau, and the Bureau dates seeded here are samples of mine.
const CL_APP = "DPT Budget";
const CL_KIND = { bureau: ["สำนักงบประมาณ", "Budget Bureau"], internal: ["ภายในหน่วยงาน", "Agency's own"] };
const CL_TH = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"], CL_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const CL_DAYS = [["อา", "Su"], ["จ", "Mo"], ["อ", "Tu"], ["พ", "We"], ["พฤ", "Th"], ["ศ", "Fr"], ["ส", "Sa"]];
const clCan = () => ROLE === "plan" || ROLE === "admin";
const clKind = e => (e.kind === "bureau" ? "bureau" : "internal");
const clEnd = e => e.end || e.date;
const clDays = (a, b) => Math.round((new Date(b + "T00:00:00Z") - new Date(a + "T00:00:00Z")) / 864e5);
const clMine = e => e.role === "all" || e.role === ROLE || (ROLE === "plan" && clKind(e) === "bureau") || (!!e.unit && typeof unitRole === "function" && unitRole() && e.unit === me().unit);
const clOverdue = e => !e.done && clEnd(e) < TODAY;
const clSoon = e => !e.done && clEnd(e) >= TODAY && clDays(TODAY, e.date) <= (e.remind == null ? 7 : e.remind);
const clName = e => tx(e.name);
let CAL = { y: Number(TODAY.slice(0, 4)), m: Number(TODAY.slice(5, 7)) - 1, kind: "", mine: false, st: "", view: "month" };
const clList = () => (S.calendar || []).filter(e => (!CAL.kind || clKind(e) === CAL.kind) && (!CAL.mine || clMine(e)) && (!CAL.st || (CAL.st === "done" ? e.done : CAL.st === "overdue" ? clOverdue(e) : !e.done)));
const clPad = n => String(n).padStart(2, "0");
function clGrid(y, m) { const start = new Date(Date.UTC(y, m, 1)).getUTCDay(), n = new Date(Date.UTC(y, m + 1, 0)).getUTCDate(), c = []; for (let i = 0; i < start; i++) c.push(null); for (let d = 1; d <= n; d++) c.push(`${y}-${clPad(m + 1)}-${clPad(d)}`); while (c.length % 7) c.push(null); return c; }
const clOn = (list, iso) => list.filter(e => e.date <= iso && iso <= clEnd(e));
const clCls = e => (e.done ? "p-ok" : clOverdue(e) ? "p-bad" : clKind(e) === "bureau" ? "p-info" : "p-mute");

// ---------- reminders in My work ----------
{
  const base = famTasks;
  famTasks = R => { base(R); (S.calendar || []).filter(e => clMine(e) && (clSoon(e) || clOverdue(e))).forEach(e => R(`${clOverdue(e) ? L("เลยกำหนด", "Overdue") : L("ใกล้ถึงกำหนด", "Due soon")}: ${clName(e)}`, `${tx(CL_KIND[clKind(e)])} · ${fdate(e.date)}${e.end ? ` – ${fdate(e.end)}` : ""}`, e.date, "bq-cal", clOverdue(e) ? "p-bad" : clDays(TODAY, e.date) <= 2 ? "p-warn" : "p-info")); };
}

// ---------- export ----------
const clIcs = list => { const esc2 = s => String(s || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n"), d8 = s => s.replace(/-/g, ""), next = s => { const d = new Date(s + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10).replace(/-/g, ""); };
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-////Budget calendar//TH", "CALSCALE:GREGORIAN", ...list.flatMap(e => ["BEGIN:VEVENT", `UID:${e.id}-${FORM_FY}@app.example`, `DTSTAMP:${d8(TODAY)}T000000Z`, `DTSTART;VALUE=DATE:${d8(e.date)}`, `DTEND;VALUE=DATE:${next(clEnd(e))}`, `SUMMARY:${esc2(clName(e))}`, `DESCRIPTION:${esc2(`${tx(CL_KIND[clKind(e)])} · ${tx(ROLES[e.role] || [e.role, e.role])}${e.note ? " · " + e.note : ""}`)}`, `CATEGORIES:${esc2(tx(CL_KIND[clKind(e)]))}`, "END:VEVENT"]), "END:VCALENDAR"].join("\r\n"); };
const clCsv = list => { const q = s => (/[",\n]/.test(String(s)) ? `"${String(s).replace(/"/g, '""')}"` : String(s)); return ["id,kind,date,end,name,owner,unit,remind_days,done,note", ...list.map(e => [e.id, tx(CL_KIND[clKind(e)]), e.date, e.end || "", clName(e), tx(ROLES[e.role] || [e.role, e.role]), e.unit ? unitName(e.unit) : "", e.remind == null ? 7 : e.remind, e.done ? "yes" : "", e.note || ""].map(q).join(","))].join("\n"); };
const clDownload = (name, mime, text) => { const blob = new Blob(["\uFEFF" + text], { type: mime }), a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); };

// ---------- the list ----------
CRUD.def("calEv", {
  noun: ["กำหนดการในปฏิทิน", "Calendar milestone"], st: { open: [["ยังไม่เสร็จ", "Open"], "p-info"], done: [["เสร็จแล้ว", "Done"], "p-ok"], overdue: [["เลยกำหนด", "Overdue"], "p-bad"] }, status: e => (e.done ? "done" : clOverdue(e) ? "overdue" : "open"), gone: () => false, id: e => e.id, title: e => clName(e), sub: e => `${tx(CL_KIND[clKind(e)])} · ${fdate(e.date)}`, live: false,
  list: () => (S.calendar || []).slice().sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : String(a.id).localeCompare(String(b.id)))), search: e => `${e.id} ${e.name.join(" ")} ${e.note || ""}`,
  filters: [{ id: "kd", label: ["ที่มาของกำหนดการ", "Source"], opts: () => Object.keys(CL_KIND).map(k => [k, tx(CL_KIND[k])]), get: e => clKind(e) }, { id: "rl", label: ["ผู้รับผิดชอบ", "Owner"], opts: () => [...new Set((S.calendar || []).map(e => e.role))].map(r => [r, r === "all" ? L("ทุกบทบาท", "Everyone") : tx(ROLES[r] || [r, r])]), get: e => e.role }],
  cols: [{ h: ["วันที่", "Date"], c: e => `${fdate(e.date)}${e.end ? `<div class="sub">– ${fdate(e.end)}</div>` : ""}` }, { h: ["กำหนดการ", "Milestone"], c: e => esc(clName(e)) }, { h: ["ที่มา", "Source"], c: e => tag(esc(tx(CL_KIND[clKind(e)])), clKind(e) === "bureau" ? "p-info" : "p-mute") },
    { h: ["ผู้รับผิดชอบ", "Owner"], c: e => `<span class="sub">${e.role === "all" ? L("ทุกบทบาท", "Everyone") : esc(tx(ROLES[e.role] || [e.role, e.role]))}${e.unit ? ` · ${esc(unitName(e.unit))}` : ""}</span>` }, { h: ["เตือนก่อน (วัน)", "Remind (days)"], n: true, c: e => (e.remind == null ? 7 : e.remind) }],
  fields: e => [{ id: "kind", label: ["ที่มาของกำหนดการ", "Source of the date"], type: "select", req: true, value: e ? clKind(e) : "internal", opts: Object.keys(CL_KIND).map(k => [k, tx(CL_KIND[k])]) }, { id: "th", label: ["กำหนดการ", "Milestone"], req: true, wide: true, value: e ? e.name[0] : "" }, { id: "en", label: ["ภาษาอังกฤษ", "English"], wide: true, value: e ? e.name[1] : "" },
    { id: "date", label: ["วันที่ (เริ่ม)", "Date (start)"], type: "date", req: true, value: e ? e.date : TODAY }, { id: "end", label: ["วันที่สิ้นสุด (ถ้าเป็นช่วง)", "End date (for a period)"], type: "date", value: e ? e.end || "" : "" },
    { id: "role", label: ["ผู้รับผิดชอบ", "Owner"], type: "select", req: true, value: e ? e.role : "plan", opts: [["all", L("ทุกบทบาท", "Everyone")], ...["plan", "div", "divhead", "exec", "fin", "admin"].map(r => [r, tx(ROLES[r])])] }, { id: "unit", label: ["หน่วยงานที่เกี่ยวข้อง (ถ้ามี)", "Unit concerned (if any)"], type: "select", value: e ? e.unit || "" : "", blank: L("— ทุกหน่วย —", "— every unit —"), opts: (S.units || []).filter(u => u.parent).map(u => [u.id, tx(u.name)]) },
    { id: "remind", label: ["เตือนก่อนถึงกำหนด (วัน)", "Remind this many days before"], type: "number", min: 0, max: 60, req: true, value: e && e.remind != null ? e.remind : 7 }, { id: "note", label: ["หมายเหตุ", "Note"], type: "textarea", wide: true, value: e ? e.note || "" : "" }],
  check: v => { const out = []; if (v.end && v.date && v.end < v.date) out.push({ f: "end", m: L("วันสิ้นสุดต้องไม่ก่อนวันเริ่ม", "The end can't be before the start") }); if (v.remind !== "" && !(Number(v.remind) >= 0 && Number(v.remind) <= 60)) out.push({ f: "remind", m: L("เตือนก่อนได้ 0 ถึง 60 วัน", "0 to 60 days")}); return out; },
  create: { can: clCan, label: ["เพิ่มกำหนดการ", "Add a milestone"], run: v => { const e = { id: "c" + (Math.max(0, ...S.calendar.map(x => Number(String(x.id).replace(/\D/g, "")) || 0)) + 1), custom: true, kind: v.kind, date: v.date, end: v.end || "", role: v.role, unit: v.unit || "", remind: Number(v.remind), note: v.note || "", name: [v.th, v.en || v.th] }; S.calendar.push(e); audit(["เพิ่มกำหนดการในปฏิทินงบประมาณ", "Added a budget calendar milestone"], `${e.id} ${e.kind}`); if (e.role !== "all") notify([e.role], [`มีกำหนดการใหม่ในปฏิทินงบประมาณ: ${v.th} (${fdate(v.date)})`, `New budget calendar milestone: ${v.en || v.th} (${fdate(v.date)})`], "bq-cal"); return e; } },
  edit: { can: clCan, run: (e, v) => { Object.assign(e, { kind: v.kind, date: v.date, end: v.end || "", role: v.role, unit: v.unit || "", remind: Number(v.remind), note: v.note || "", name: [v.th, v.en || v.th] }); audit(["แก้ปฏิทินงบประมาณ", "Changed the budget calendar"], `${e.id} → ${e.date}`); } },
  acts: e => { const out = [], mine = clCan() || e.role === ROLE; if (mine && !e.done) out.push({ id: "done", label: L("ทำเสร็จแล้ว", "Mark done"), kind: "primary", run: () => { e.done = { by: me().id, t: nowIso() }; audit(["ทำกำหนดการเสร็จ", "Marked a milestone done"], e.id); return L("บันทึกว่าเสร็จแล้ว", "Marked done"); } });
    if (mine && e.done) out.push({ id: "undone", label: L("เปิดใหม่", "Reopen"), kind: "ghost", run: () => { delete e.done; audit(["เปิดกำหนดการใหม่", "Reopened a milestone"], e.id); return L("เปิดใหม่แล้ว", "Reopened"); } });
    if (clCan() && e.custom) out.push({ id: "del", label: L("ลบ", "Delete"), kind: "danger", confirm: L("ลบกำหนดการนี้?", "Delete this milestone?"), run: () => { S.calendar = S.calendar.filter(x => x !== e); audit(["ลบกำหนดการ", "Deleted a milestone"], e.id); return L("ลบแล้ว", "Deleted"); } }); return out; },
  view: e => kv([[L("ที่มา", "Source"), esc(tx(CL_KIND[clKind(e)]))], [L("วันที่", "Date"), `${dueText(e.date)}${e.end ? ` – ${fdate(e.end)}` : ""}`], [L("ผู้รับผิดชอบ", "Owner"), e.role === "all" ? L("ทุกบทบาท", "Everyone") : esc(tx(ROLES[e.role] || [e.role, e.role]))], e.unit && [L("หน่วยงาน", "Unit"), esc(unitName(e.unit))], [L("เตือนก่อน", "Reminder"), `${e.remind == null ? 7 : e.remind} ${L("วัน", "days")}`],
    [L("สถานะ", "Status"), e.done ? `${L("เสร็จแล้ว", "Done")} · ${esc(userName(e.done.by))}` : clOverdue(e) ? L("เลยกำหนด", "Overdue") : L("ยังไม่เสร็จ", "Open")], [L("หมายเหตุ", "Note"), esc(e.note || "–")], !e.custom && [L("ใช้กับ", "Used by"), L("กำหนดส่งในหน้าส่งสำนักงบประมาณ งานของฉัน และกฎ BR-06 (ลบไม่ได้ แก้ได้)", "Deadlines on the submission page, My work and rule BR-06 (can't be deleted, can be edited)")]]),
});

// ---------- seed: kinds for the six original dates, and some more ----------
Object.keys(SEEDS).forEach(k => {
  const prev = SEEDS[k].seed;
  SEEDS[k].seed = () => {
    const s = prev(), F = FORM_FY, y0 = Number(String((s.calendar[0] || { date: "2026-10-01" }).date).slice(0, 4)), add = (kind, date, role, th, en, o) => s.calendar.push(Object.assign({ id: "c" + (Math.max(0, ...s.calendar.map(x => Number(String(x.id).replace(/\D/g, "")) || 0)) + 1), custom: true, kind, date, end: "", role, unit: "", remind: 7, note: "" , name: [th, en] }, o || {}));
    s.calendar.forEach(e => { e.kind = e.id === "c6" ? "bureau" : "internal"; e.remind = 7; e.end = e.end || ""; e.unit = e.unit || ""; e.note = e.note || ""; });
    add("bureau", `${y0}-10-22`, "plan", "สงป. ประชุมชี้แจงแนวทางจัดทำงบประมาณ (ตัวอย่าง)", "Bureau briefing on preparing the budget (sample)", { note: "วันที่ตัวอย่าง กองแผนงานใส่ตามหนังสือจริงของ สงป." });
    add("bureau", `${y0 + 1}-02-12`, "plan", "สงป. กำหนดวันสุดท้ายนำข้อมูลเข้าระบบ (ตัวอย่าง)", "Bureau's last day for data entry (sample)", { remind: 14 });
    add("bureau", `${y0 + 1}-03-15`, "plan", "สงป. พิจารณาและเรียกชี้แจงคำของบประมาณ (ตัวอย่าง)", "Bureau reviews and calls for clarification (sample)");
    add("internal", `${y0}-11-15`, "div", "สำนัก/กอง ส่งแผนรายไตรมาสให้กองแผนงาน", "Divisions send their quarterly plans to Planning", { remind: 10 });
    add("internal", `${y0}-12-05`, "plan", "กองแผนงานแจ้งผลตรวจเชื่อมโยงแผนให้หน่วยงาน", "Planning tells the units the plan-link check results");
    add("internal", `${y0 + 1}-01-15`, "exec", "ประชุมผู้บริหารเตรียมชี้แจงกรรมาธิการ", "Executive meeting to prepare for the committees", { end: `${y0 + 1}-01-16` });
    return s;
  };
});

// ---------- page BQ12 ----------
// Redesigned on 17 Nov 2569 ("ปรับ design ปฏิทินให้ชัดเจนมากยิ่งขึ้น"): four cards that say what comes next and what is late, a legend, the filters in one bar, then two views side by side: a TIMELINE
// (what is done, what is today, what is ahead, month by month, with the days left or late) and the month grid (bigger cells, whole names, today marked, the two sources in two colours). The ids and
// the buttons the tests and the other pages use (#cal-kind, #cal-st, #cal-mine, #cal-prev, #cal-next, #cal-today, #cal-ics, #cal-csv, [data-cal] on the grid) are as they were; the timeline uses [data-calt].
const CL_SH = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."], CL_SHE = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const clOwner = e => (e.role === "all" ? L("ทุกบทบาท", "Everyone") : tx(ROLES[e.role] || [e.role, e.role])) + (e.unit ? " · " + unitName(e.unit) : "");
const clRel = e => { if (e.done) return L("เสร็จแล้ว", "Done"); const a = clDays(TODAY, e.date), z = clDays(TODAY, clEnd(e)); if (z < 0) return `${L("เลยมา", "Late by")} ${-z} ${L("วัน", "d")}`; if (a <= 0) return a === 0 && z === 0 ? L("วันนี้", "Today") : L("กำลังดำเนินอยู่", "Under way"); return `${L("อีก", "In")} ${a} ${L("วัน", "d")}`; };
const clTone = e => (e.done ? "ok" : clOverdue(e) ? "bad" : clSoon(e) ? "warn" : "");
const clShort = iso => `${Number(iso.slice(8))} ${L(CL_SH[Number(iso.slice(5, 7)) - 1], CL_SHE[Number(iso.slice(5, 7)) - 1])}`;
const CL_CSS = `<style>
.cl-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px;margin:0 0 14px}
.cl-card{background:var(--surface);border:1px solid var(--line);border-left:5px solid var(--cl-c,var(--line));border-radius:10px;padding:12px 14px;display:flex;flex-direction:column;gap:2px;min-width:0}
.cl-card .l{font-size:13px;color:var(--ink-2,var(--muted))}.cl-card .big{font-size:24px;font-weight:700;line-height:1.2}.cl-card .nm{font-size:14.5px;overflow-wrap:anywhere}.cl-card .d{font-size:13px;color:var(--ink-2,var(--muted))}
.cl-bureau{--cl-c:var(--info,#3b6fd4)}.cl-internal{--cl-c:var(--accent,#2f4a8a)}.cl-bad{--cl-c:var(--bad,#b91c1c)}.cl-warn{--cl-c:var(--warn,#b45309)}.cl-ok{--cl-c:var(--ok,#15803d)}
.cl-leg{display:flex;flex-wrap:wrap;gap:6px 18px;font-size:13.5px;align-items:center}.cl-sw{display:inline-block;width:14px;height:14px;border-radius:4px;margin-right:6px;vertical-align:-2px;background:var(--cl-c);opacity:.9}
.cl-bar{display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;margin:0 0 14px}
.cl-g{table-layout:fixed;border-collapse:separate;border-spacing:4px;width:100%}.cl-g th{text-align:center;font-size:13px;padding:4px 0}.cl-g td{vertical-align:top;height:122px;padding:4px;border:1px solid var(--line);border-radius:8px;background:var(--surface)}
.cl-g td.out{background:var(--surface-2);border-color:transparent}.cl-g td.we{background:var(--surface-2)}.cl-g td.today{outline:2px solid var(--accent);outline-offset:-2px;background:color-mix(in srgb,var(--accent) 8%,var(--surface))}
.cl-n{text-align:right;font-size:13px;color:var(--ink-2,var(--muted))}.cl-g td.today .cl-n b{background:var(--accent);color:#fff;border-radius:99px;padding:1px 8px}
.cl-ev{display:block;width:100%;text-align:left;white-space:normal;overflow-wrap:anywhere;font-size:12.5px;line-height:1.3;font-weight:600;margin:3px 0;padding:4px 7px;border:0;border-radius:6px;background:var(--cl-c,#64748b);color:#fff;cursor:pointer;box-shadow:0 1px 2px rgba(0,0,0,.18)}
.cl-ev:hover{filter:brightness(1.08)}.cl-ev.late{--cl-c:var(--bad,#b91c1c)}.cl-ev.soon{--cl-c:var(--warn,#c2410c)}.cl-ev.done{--cl-c:var(--ok,#15803d)}.cl-ev.done span{text-decoration:line-through;opacity:.92}
.cl-g td.has{background:color-mix(in srgb,var(--accent) 7%,var(--surface));border-color:color-mix(in srgb,var(--accent) 35%,var(--line))}.cl-g td.has .cl-n{font-weight:700;color:var(--ink)}
.cl-g td.today{background:color-mix(in srgb,var(--accent) 14%,var(--surface));outline:3px solid var(--accent);outline-offset:-3px}.cl-g td.today .cl-n{display:flex;justify-content:space-between;align-items:center;color:var(--accent);font-weight:700}.cl-g td.today .cl-n i{font-style:normal;font-size:11.5px;background:var(--accent);color:#fff;border-radius:99px;padding:1px 8px}
.cl-g th.we{color:var(--bad,#b91c1c)}
</style>`;
function clMonthHtml(list) {
  const cells = clGrid(CAL.y, CAL.m);
  return `<section class="panel" id="cl-month"><header><button class="btn ghost" type="button" id="cal-prev" aria-label="${L("เดือนก่อน", "Previous month")}">‹</button><h2 style="min-width:190px;text-align:center">${esc(L(CL_TH[CAL.m], CL_EN[CAL.m]))} ${L(CAL.y + 543, CAL.y)}</h2><button class="btn ghost" type="button" id="cal-next" aria-label="${L("เดือนถัดไป", "Next month")}">›</button><button class="btn" type="button" id="cal-today">${L("เดือนนี้", "This month")}</button></header>
    <div class="body" style="padding-top:6px;padding-bottom:10px"><table class="cl-g"><thead><tr>${CL_DAYS.map((d, i) => `<th class="${i === 0 || i === 6 ? "we" : ""}">${L(d[0], d[1])}</th>`).join("")}</tr></thead><tbody>${Array.from({ length: cells.length / 7 }, (_, w) => `<tr>${cells.slice(w * 7, w * 7 + 7).map((iso, di) => { if (!iso) return `<td class="out"></td>`; const ev = clOn(list, iso);
      return `<td class="${[iso === TODAY ? "today" : "", ev.length ? "has" : "", di === 0 || di === 6 ? "we" : ""].filter(Boolean).join(" ")}"><div class="cl-n">${iso === TODAY ? `<i>${L("วันนี้", "Today")}</i>` : ""}<span>${Number(iso.slice(8))}</span></div>${ev.slice(0, 3).map(e => `<button type="button" class="cl-ev cl-${clKind(e)} ${e.done ? "done" : clOverdue(e) ? "late" : clSoon(e) ? "soon" : ""}" data-cal="${e.id}" title="${esc(clName(e) + " · " + tx(CL_KIND[clKind(e)]) + " · " + clShort(e.date) + " · " + clRel(e))}">${e.done ? "✓ " : clOverdue(e) ? "! " : ""}<span>${esc(clName(e))}</span></button>`).join("")}${ev.length > 3 ? `<span class="sub">+${ev.length - 3}</span>` : ""}</td>`; }).join("")}</tr>`).join("")}</tbody></table></div></section>`;
}
ePageDef("budget", "bq-cal", "BQ12", "form", KROLES, ["ปฏิทินงบประมาณ", "Budget calendar"], () => {
  const list = clList(), all = S.calendar || [], up = f => all.filter(e => !e.done && clEnd(e) >= TODAY && f(e)).sort((a, b) => (a.date < b.date ? -1 : 1))[0], nx = up(() => true), nb = up(e => clKind(e) === "bureau"), ni = up(e => clKind(e) === "internal"), late = all.filter(clOverdue), near = all.filter(e => clMine(e) && clSoon(e));
  const card = (cls, label, big, name, d) => `<div class="cl-card ${cls}"><span class="l">${label}</span><span class="big">${big}</span><span class="nm">${name}</span><span class="d">${d}</span></div>`;
  const cd = e => (e ? { big: esc(clRel(e)), nm: esc(clName(e)), d: `${fdate(e.date)} · ${esc(clOwner(e))}` } : { big: "–", nm: L("ไม่มีกำหนดการที่รออยู่", "Nothing ahead"), d: "" });
  const c1 = cd(nx), c2 = cd(nb), c3 = cd(ni);
  return `${CL_CSS}${eHead(CL_APP, "BQ12", ["ปฏิทินงบประมาณ", "Budget calendar"], ["วันสำคัญของการจัดทำงบประมาณทั้งของสำนักงบประมาณและของหน่วยงานเอง ซ้ายคือไทม์ไลน์ว่าอะไรเสร็จแล้ว ใกล้ถึง หรือเลยกำหนด ขวาคือปฏิทินรายเดือน กดที่กำหนดการเพื่อดูหรือแก้ไข", "The key dates of preparing the budget, from the Budget Bureau and from the agency itself. On the left a timeline of what is done, near or late; on the right a month calendar. Click a milestone to read or edit it"])}
    <div class="cl-cards">${card(nx ? "cl-" + clKind(nx) : "", L("กำหนดการถัดไป", "Next milestone"), c1.big, c1.nm, c1.d)}${card("cl-bureau", L("ของสำนักงบประมาณ ที่ใกล้ที่สุด", "Next from the Budget Bureau"), c2.big, c2.nm, c2.d)}${card("cl-internal", L("ของหน่วยงาน ที่ใกล้ที่สุด", "Next of the agency's own"), c3.big, c3.nm, c3.d)}
      ${card(late.length ? "cl-bad" : "cl-ok", L("เลยกำหนด", "Overdue"), `${late.length} ${L("รายการ", "items")}`, late.length ? esc(clName(late.sort((a, b) => (a.date < b.date ? -1 : 1))[0])) : L("ไม่มีรายการค้าง", "Nothing late"), late.length ? `${L("เก่าสุดเลยมา", "oldest late by")} ${-clDays(TODAY, clEnd(late[0]))} ${L("วัน", "d")}` : "")}${card(near.length ? "cl-warn" : "", L("ใกล้ถึงกำหนดของฉัน", "Near, mine"), `${near.length} ${L("รายการ", "items")}`, near.length ? esc(clName(near[0])) : L("ไม่มีรายการใกล้ถึง", "Nothing near"), "")}</div>
    <div class="cl-bar"><span class="cl-leg"><span style="--cl-c:var(--info,#3b6fd4)"><i class="cl-sw"></i>${tx(CL_KIND.bureau)}</span><span style="--cl-c:var(--accent,#2f4a8a)"><i class="cl-sw"></i>${tx(CL_KIND.internal)}</span><span style="--cl-c:var(--bad,#b91c1c)"><i class="cl-sw"></i>${L("เลยกำหนด", "Overdue")}</span><span style="--cl-c:var(--warn,#b45309)"><i class="cl-sw"></i>${L("ใกล้ถึงกำหนด", "Near")}</span><span style="--cl-c:var(--ok,#15803d)"><i class="cl-sw"></i>${L("เสร็จแล้ว", "Done")}</span></span><span class="sp"></span>
      <label for="cal-kind"><b style="font-weight:600">${L("ที่มา", "Source")}</b></label><select id="cal-kind"><option value="">${L("ทั้งหมด", "All")}</option>${Object.keys(CL_KIND).map(k => `<option value="${k}" ${CAL.kind === k ? "selected" : ""}>${esc(tx(CL_KIND[k]))}</option>`).join("")}</select>
      <label for="cal-st"><b style="font-weight:600">${L("สถานะ", "Status")}</b></label><select id="cal-st"><option value="">${L("ทั้งหมด", "All")}</option>${[["open", L("ยังไม่เสร็จ", "Open")], ["overdue", L("เลยกำหนด", "Overdue")], ["done", L("เสร็จแล้ว", "Done")]].map(([k, l]) => `<option value="${k}" ${CAL.st === k ? "selected" : ""}>${l}</option>`).join("")}</select>
      <label class="field-inline"><input type="checkbox" id="cal-mine" ${CAL.mine ? "checked" : ""}> ${L("เฉพาะของฉัน", "Only mine")}</label>
      <button class="btn" type="button" id="cal-ics">${L("ส่งออกไฟล์ปฏิทิน (.ics)", "Export calendar file (.ics)")}</button><button class="btn" type="button" id="cal-csv">${L("ส่งออก CSV", "Export CSV")}</button></div>
    ${clMonthHtml(list)}
    ${clCan() ? "" : eNote(L("เฉพาะกองแผนงานและผู้ดูแลระบบเพิ่มหรือแก้กำหนดการ เจ้าของกำหนดการกดทำเสร็จได้", "Only Planning and administrators add or edit; the owner can mark one done"))}
    ${crudList("calEv", { head: `<h2>${L("รายการกำหนดการ", "Milestones")}</h2>` })}`;
}, () => {
  const g = id => document.querySelector(id), re = () => route();
  const mv = d => { CAL.m += d; if (CAL.m < 0) { CAL.m = 11; CAL.y--; } if (CAL.m > 11) { CAL.m = 0; CAL.y++; } re(); };
  const p = g("#cal-prev"), n = g("#cal-next"), t = g("#cal-today"); if (p) p.onclick = () => mv(-1); if (n) n.onclick = () => mv(1); if (t) t.onclick = () => { CAL.y = Number(TODAY.slice(0, 4)); CAL.m = Number(TODAY.slice(5, 7)) - 1; re(); };
  const k = g("#cal-kind"), s = g("#cal-st"), m = g("#cal-mine"); if (k) k.onchange = e => { CAL.kind = e.target.value; re(); }; if (s) s.onchange = e => { CAL.st = e.target.value; re(); }; if (m) m.onchange = e => { CAL.mine = e.target.checked; re(); };
  document.querySelectorAll("[data-cal]").forEach(b => (b.onclick = () => { crOpen("calEv", b.dataset.cal); re(); }));
  
  const i = g("#cal-ics"); if (i) i.onclick = () => clDownload(`budget_calendar_${FORM_FY}.ics`, "text/calendar;charset=utf-8", clIcs(clList())); const c = g("#cal-csv"); if (c) c.onclick = () => clDownload(`budget_calendar_${FORM_FY}.csv`, "text/csv;charset=utf-8", clCsv(clList()));
});
Object.assign(NAV_ICON, { "bq-cal": "calendar" });
