// Fisko-KlangFinance, budget round Q1 (12 Nov 2569): the budget calendar, split into the Budget Bureau's dates and the agency's own.
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
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Fisko//Budget calendar//TH", "CALSCALE:GREGORIAN", ...list.flatMap(e => ["BEGIN:VEVENT", `UID:${e.id}-${FORM_FY}@fisko.example`, `DTSTAMP:${d8(TODAY)}T000000Z`, `DTSTART;VALUE=DATE:${d8(e.date)}`, `DTEND;VALUE=DATE:${next(clEnd(e))}`, `SUMMARY:${esc2(clName(e))}`, `DESCRIPTION:${esc2(`${tx(CL_KIND[clKind(e)])} · ${tx(ROLES[e.role] || [e.role, e.role])}${e.note ? " · " + e.note : ""}`)}`, `CATEGORIES:${esc2(tx(CL_KIND[clKind(e)]))}`, "END:VEVENT"]), "END:VCALENDAR"].join("\r\n"); };
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
function clMonthHtml(list) {
  const cells = clGrid(CAL.y, CAL.m);
  return `<section class="panel"><header><button class="btn ghost" type="button" id="cal-prev" aria-label="${L("เดือนก่อน", "Previous month")}">‹</button><h2 style="min-width:190px;text-align:center">${esc(L(CL_TH[CAL.m], CL_EN[CAL.m]))} ${L(CAL.y + 543, CAL.y)}</h2><button class="btn ghost" type="button" id="cal-next" aria-label="${L("เดือนถัดไป", "Next month")}">›</button><button class="btn" type="button" id="cal-today">${L("เดือนนี้", "This month")}</button><span class="sp"></span><span class="sub">${tag(tx(CL_KIND.bureau), "p-info")} ${tag(tx(CL_KIND.internal), "p-mute")} ${tag(L("เลยกำหนด", "Overdue"), "p-bad")} ${tag(L("เสร็จ", "Done"), "p-ok")}</span></header>
    <div class="tbl-wrap"><table style="table-layout:fixed"><thead><tr>${CL_DAYS.map(d => `<th style="text-align:center">${L(d[0], d[1])}</th>`).join("")}</tr></thead><tbody>${Array.from({ length: cells.length / 7 }, (_, w) => `<tr>${cells.slice(w * 7, w * 7 + 7).map(iso => { if (!iso) return `<td style="background:var(--surface-2)"></td>`; const ev = clOn(list, iso); return `<td style="vertical-align:top;height:84px;${iso === TODAY ? "outline:2px solid var(--accent);outline-offset:-2px;" : ""}"><div class="sub" style="text-align:right">${Number(iso.slice(8))}</div>${ev.slice(0, 3).map(e => `<button type="button" class="pill ${clCls(e)}" data-cal="${e.id}" style="display:block;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin:2px 0;cursor:pointer;${e.done ? "text-decoration:line-through;" : ""}" title="${esc(clName(e))}">${esc(clName(e))}</button>`).join("")}${ev.length > 3 ? `<span class="sub">+${ev.length - 3}</span>` : ""}</td>`; }).join("")}</tr>`).join("")}</tbody></table></div></section>`;
}
ePageDef("budget", "bq-cal", "BQ12", "form", KROLES, ["ปฏิทินงบประมาณ", "Budget calendar"], () => {
  const list = clList(), all = S.calendar || [], nb = all.filter(e => !e.done && clKind(e) === "bureau" && clEnd(e) >= TODAY).sort((a, b) => (a.date < b.date ? -1 : 1))[0], ni = all.filter(e => !e.done && clKind(e) === "internal" && clEnd(e) >= TODAY).sort((a, b) => (a.date < b.date ? -1 : 1))[0];
  const dd = e => (e ? `${fdate(e.date)} · ${clDays(TODAY, e.date) >= 0 ? clDays(TODAY, e.date) : 0} ${L("วัน", "d")}` : "–");
  return `${eHead(CL_APP, "BQ12", ["ปฏิทินงบประมาณ", "Budget calendar"], ["กำหนดการของสำนักงบประมาณและของหน่วยงานเอง แยกสีตามที่มา ดูเป็นปฏิทินรายเดือนหรือรายการ กรองเฉพาะของฉัน เตือนใน \"งานของฉัน\" เมื่อใกล้ถึงกำหนดหรือเลยกำหนด ส่งออกเป็นไฟล์ปฏิทิน (.ics) หรือ CSV · กองแผนงานเพิ่ม/แก้ วันของสำนักงบประมาณกองแผนงานพิมพ์เองตามหนังสือจริง (ต้นแบบไม่ได้รับจาก สงป. และวันของ สงป. ที่ใส่ไว้เป็นตัวอย่างของผม)", "Dates of the Budget Bureau and of the agency itself, in two colours; see them as a month or a list, filter to mine, get a reminder in My work when one is near or overdue, export to a calendar file (.ics) or CSV · Planning adds and edits; the Bureau's dates are typed by Planning from the real letters (nothing is received from the Bureau and the Bureau dates seeded here are my samples)"])}
    ${eKpis([[L("กำหนดการทั้งหมด", "All milestones"), all.length], [L("สำนักงบประมาณ ที่ใกล้ที่สุด", "Next from the Bureau"), dd(nb)], [L("ภายในหน่วยงาน ที่ใกล้ที่สุด", "Next of the agency's own"), dd(ni)], [L("เลยกำหนด", "Overdue"), all.filter(clOverdue).length, "", all.filter(clOverdue).length > 0], [L("ใกล้ถึงกำหนดของฉัน", "Near, mine"), all.filter(e => clMine(e) && clSoon(e)).length]])}
    <div class="row" style="margin:0 0 12px;flex-wrap:wrap"><label for="cal-kind"><b style="font-weight:600">${L("ที่มา", "Source")}</b></label><select id="cal-kind"><option value="">${L("ทั้งหมด", "All")}</option>${Object.keys(CL_KIND).map(k => `<option value="${k}" ${CAL.kind === k ? "selected" : ""}>${esc(tx(CL_KIND[k]))}</option>`).join("")}</select>
      <label for="cal-st"><b style="font-weight:600">${L("สถานะ", "Status")}</b></label><select id="cal-st"><option value="">${L("ทั้งหมด", "All")}</option>${[["open", L("ยังไม่เสร็จ", "Open")], ["overdue", L("เลยกำหนด", "Overdue")], ["done", L("เสร็จแล้ว", "Done")]].map(([k, l]) => `<option value="${k}" ${CAL.st === k ? "selected" : ""}>${l}</option>`).join("")}</select>
      <label class="field-inline"><input type="checkbox" id="cal-mine" ${CAL.mine ? "checked" : ""}> ${L("เฉพาะของฉัน", "Only mine")}</label>
      <span class="sp"></span><button class="btn" type="button" id="cal-ics">${L("ส่งออกไฟล์ปฏิทิน (.ics)", "Export calendar file (.ics)")}</button><button class="btn" type="button" id="cal-csv">${L("ส่งออก CSV", "Export CSV")}</button></div>
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
