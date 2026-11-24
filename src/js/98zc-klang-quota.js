// Fisko-KlangFinance, budget round Q3 (10 Nov 2569): the quota from the Budget Bureau and the submission ceiling.
// The Planning division keeps one record per fiscal year: the starting budget amount (the quota the Bureau gave) and the
// ceiling in percent (sample starting value 120). The package for the Bureau may not total more than quota x ceiling; the
// batch on page B6 can't be made, changed or sent while it does. The total is the sum of every batch not cancelled (the
// approved amount of each request in it, or its asked amount if no decision is recorded).
// Nothing is read from the Bureau: the quota is typed by Planning. The 120% is the user's sample starting value, read as
// "120% of the quota"; if it means 120% of last year's budget, set the quota to that amount.
// Who sets it: the Planning division (role plan). Everyone else sees it. A year already closed cannot be changed.
const QT_APP = "DPT Budget";
const QT_PCT = 120;
const qtOf = fy => (S.quotas || []).find(q => q.fy === fy);
const qtLimit = q => Math.round((q.base * q.pct) / 100);
// The total is what the batches for the Bureau hold (page B6, file 79): every batch not cancelled, so a prepared batch counts
// before it is sent. `except` leaves one batch out, `extra` adds an amount (a batch being made or edited).
const qtTotal = (fy, except) => (fy === FORM_FY ? sbBatches().filter(b => b.status !== "cancelled" && b !== except).reduce((t, b) => t + sbReqs(b).reduce((s, r) => s + subAmt(r), 0), 0) : 0);
function quotaCheck(fy, extra, except) {
  const q = qtOf(fy), add = extra || 0;
  if (!q) return { ok: false, none: true, q: null, limit: 0, total: qtTotal(fy, except) + add, msg: L(`กองแผนงานยังไม่ได้ตั้งโควต้าปี ${fy} (หน้า BQ1)`, `Planning has not set the FY${fy} quota (page BQ1)`) };
  const limit = qtLimit(q), total = qtTotal(fy, except) + add, ok = total <= limit;
  return { ok, q, limit, total, over: Math.max(0, total - limit), msg: ok ? "" : L(`ยอดรวม ${fmt(total)} บาท เกินขีดจำกัด ${fmt(limit)} บาท (${q.pct}% ของโควต้า ${fmt(q.base)} บาท) ลดยอดหรือให้กองแผนงานปรับโควต้า`, `Total ${fmt(total)} baht is over the ceiling ${fmt(limit)} baht (${q.pct}% of the ${fmt(q.base)} quota); cut the total or ask Planning to change the quota`) };
}
const qtCan = () => ROLE === "plan";
function quotaBar(fy) {
  const c = quotaCheck(fy);
  if (c.none) return `<section class="panel"><div class="body row">${tag(L("ยังไม่ตั้งโควต้า", "No quota set"), "p-bad")} <span class="sub">${esc(c.msg)}</span></div></section>`;
  const pct = c.limit ? Math.min(100, Math.round((c.total / c.limit) * 100)) : 0;
  return `<section class="panel"><div class="body"><div class="row">${tag(c.ok ? L("ยอดรวมไม่เกินขีดจำกัด", "Within the ceiling") : L("เกินขีดจำกัด ส่งไม่ได้", "Over the ceiling: can't send"), c.ok ? "p-ok" : "p-bad")}
    <span class="sub">${L("ยอดชุดส่ง", "Package total")} <b>${fmt(c.total)}</b> / ${L("ขีดจำกัด", "ceiling")} <b>${fmt(c.limit)}</b> ${L("บาท", "baht")} · ${c.q.pct}% ${L("ของโควต้า", "of the quota")} ${fmt(c.q.base)}</span></div>
    <div class="bar" style="margin-top:6px" role="img" aria-label="${pct}%"><i style="width:${pct}%;background:var(--${c.ok ? "ok" : "bad"})"></i></div></div></section>`;
}
{ const base = SUB.status; SUB.status = () => quotaBar(FORM_FY) + base(); }

// ---------- CRUD ----------
CRUD.def("quota", {
  noun: ["โควต้างบประมาณ", "Budget quota"], st: { live: [["ใช้งาน", "In use"], "p-ok"] }, status: () => "live", gone: () => false, id: q => String(q.fy), title: q => `${L("ปีงบประมาณ", "FY")} ${q.fy}`, sub: q => `${fmt(q.base)} · ${q.pct}%`,
  list: () => (S.quotas || []).slice().sort((a, b) => b.fy - a.fy), search: q => `${q.fy} ${q.note || ""}`,
  filters: [{ id: "fy", label: ["ปีงบประมาณ", "Fiscal year"], opts: () => (S.quotas || []).slice().sort((x, y) => y.fy - x.fy).map(q => [String(q.fy), String(q.fy)]), get: q => q.fy }], // the year is a filter of this list (13 Nov 2569), not the top-bar selector
  cols: [{ h: ["ปีงบประมาณ", "FY"], c: q => `<b>${q.fy}</b>${q.fy === FORM_FY ? ` <span class="sub">(${L("ปีที่กำลังจัดทำ", "being prepared")})</span>` : ""}` }, { h: ["โควต้าตั้งต้น (บาท)", "Starting quota (baht)"], n: true, c: q => fmt(q.base) }, { h: ["เพดาน %", "Ceiling %"], n: true, c: q => q.pct },
    { h: ["ขีดจำกัดส่ง (บาท)", "Submit ceiling (baht)"], n: true, c: q => fmt(qtLimit(q)) }, { h: ["ยอดชุดส่ง (บาท)", "Package total (baht)"], n: true, c: q => (q.fy === FORM_FY ? fmt(qtTotal(q.fy)) : "–") },
    { h: ["สถานะ", "Status"], c: q => (q.fy === FORM_FY ? (quotaCheck(q.fy).ok ? tag(L("ไม่เกิน", "Within"), "p-ok") : tag(L("เกิน", "Over"), "p-bad")) : `<span class="sub">–</span>`) }],
  fields: q => [{ id: "fy", label: ["ปีงบประมาณ", "Fiscal year"], type: "select", req: true, value: q ? String(q.fy) : "", lock: !!q, show: q && String(q.fy), blank: L("— เลือก —", "— choose —"), opts: (S.fyList || []).filter(f => f.status !== "closed").map(f => [String(f.fy), String(f.fy)]) },
    { id: "base", label: ["โควต้าตั้งต้นที่ สงป. กำหนด (ล้านบาท)", "Starting quota from the Budget Bureau (million baht)"], type: "money", req: true, min: 1, value: q ? q.base : "", hint: L("ยอดงบประมาณตั้งต้นของปีนั้น", "The starting budget amount of that year") },
    { id: "pct", label: ["เพดานของยอดที่ส่งได้ (% ของโควต้า)", "Ceiling for the package (% of the quota)"], type: "number", min: 1, max: 500, req: true, value: q ? q.pct : QT_PCT, hint: L("ค่าตั้งต้น 120 ตามที่กำหนด ปรับได้", "Starting value 120; change it as needed") },
    { id: "note", label: ["หมายเหตุ", "Note"], wide: true, value: q ? q.note || "" : "" }],
  check: (v, q) => { const out = []; if (!q && (S.quotas || []).some(x => String(x.fy) === String(v.fy))) out.push({ f: "fy", m: L("ปีนี้ตั้งโควต้าแล้ว แก้ที่รายการเดิม", "This year already has a quota; edit it") }); if (v.pct !== "" && !(Number(v.pct) > 0)) out.push({ f: "pct", m: L("เพดานต้องมากกว่า 0", "The ceiling must be above 0") }); return out; },
  create: { can: qtCan, label: ["ตั้งโควต้าปีงบประมาณ", "Set a year's quota"], run: v => { const q = { fy: Number(v.fy), base: Number(v.base), pct: Number(v.pct), note: v.note || "", by: me().id, t: nowIso() }; S.quotas.push(q); audit(["ตั้งโควต้างบประมาณ", "Set a budget quota"], `${q.fy} · ${fmt(q.base)} · ${q.pct}%`); return q; } },
  edit: { can: q => qtCan() && fyOpen(q.fy), why: () => true, run: (q, v, why) => { const old = `${fmt(q.base)} · ${q.pct}%`; Object.assign(q, { base: Number(v.base), pct: Number(v.pct), note: v.note || "", by: me().id, t: nowIso() }); (q.log = q.log || []).push({ t: nowIso(), by: me().id, from: old, to: `${fmt(q.base)} · ${q.pct}%`, why: why || "" }); audit(["แก้โควต้างบประมาณ", "Changed a budget quota"], `${q.fy} ${old} → ${fmt(q.base)} · ${q.pct}% ${why || ""}`); } },
  acts: q => (qtCan() && !(q.fy === FORM_FY && S.submission && S.submission.status !== "preparing") ? [{ id: "del", label: L("ลบ", "Delete"), kind: "danger", confirm: L("ลบโควต้าปีนี้ ถ้าเป็นปีที่กำลังจัดทำ จะส่งชุดข้อมูลไม่ได้จนกว่าจะตั้งใหม่", "Delete this year's quota; for the year being prepared the package can't be sent until one is set again"), run: () => { S.quotas = S.quotas.filter(x => x !== q); audit(["ลบโควต้างบประมาณ", "Deleted a budget quota"], String(q.fy)); return L("ลบแล้ว", "Deleted"); } }] : []),
  view: q => kv([[L("ปีงบประมาณ", "Fiscal year"), String(q.fy)], [L("โควต้าตั้งต้น", "Starting quota"), `${fmt(q.base)} ${L("บาท", "baht")}`], [L("เพดาน", "Ceiling"), `${q.pct}%`], [L("ขีดจำกัดที่ส่งได้", "Submit ceiling"), `${fmt(qtLimit(q))} ${L("บาท", "baht")}`],
    q.fy === FORM_FY && [L("ยอดชุดส่งตอนนี้", "Package total now"), `${fmt(qtTotal(q.fy))} ${L("บาท", "baht")} · ${quotaCheck(q.fy).ok ? L("ไม่เกิน", "within") : L("เกิน", "over")}`], [L("หมายเหตุ", "Note"), esc(q.note || "–")],
    [L("ประวัติการแก้", "Changes"), (q.log || []).map(x => `${fdate(x.t, true)} · ${esc(userName(x.by))} · ${esc(x.from)} → ${esc(x.to)}${x.why ? ` · ${esc(x.why)}` : ""}`).join("<br>") || "–"]]),
});

// ---------- seed ----------
Object.keys(SEEDS).forEach(k => {
  const prev = SEEDS[k].seed;
  SEEDS[k].seed = () => {
    const s = prev(), all = s.requests.reduce((t, r) => t + (r.amount || (r.items ? reqAmount(r) : 0)), 0), by = (s.users.find(u => u.role === "plan") || s.users[0]).id;
    // sample: the quota is 90% of what the divisions ask, so the 120% ceiling lets about 108% through
    s.quotas = [{ fy: FORM_FY, base: Math.max(1e6, Math.round((all * 0.9) / 1e6) * 1e6), pct: QT_PCT, note: "ค่าตัวอย่าง ใส่ตามโควต้าจริงของ สงป.", by, t: "2026-10-01T09:00" }];
    return s;
  };
});

// ---------- page ----------
ePageDef("budget", "bq-cfg", "BQ1", "form", KROLES, ["โควต้าและเพดานงบประมาณ", "Budget quota and ceiling"], () => {
  const c = quotaCheck(FORM_FY);
  return `${eHead(QT_APP, "BQ1", ["โควต้าและเพดานงบประมาณ", "Budget quota and ceiling"], ["กองแผนงานตั้งโควต้าตั้งต้นของแต่ละปีงบประมาณที่ได้จากสำนักงบประมาณ และเพดานร้อยละของยอดที่ส่งได้ ยอดรวมของชุดที่ส่งสำนักงบประมาณ (B6) ต้องไม่เกินโควต้า × เพดาน · ค่าเพดานตั้งต้น 120% เป็นค่าตัวอย่าง · ต้นแบบไม่ได้รับโควต้าจากสำนักงบประมาณ กองแผนงานพิมพ์เอง", "Planning sets each year's starting quota from the Budget Bureau and the ceiling in percent. The package sent to the Bureau (B6) may not total more than quota × ceiling · 120% is a sample starting value · the prototype does not receive the quota from the Bureau; Planning types it"])}
  ${eKpis([[L("โควต้าตั้งต้น ปี", "Starting quota FY") + " " + FORM_FY, c.q ? fmt(c.q.base) : "–"], [L("เพดาน", "Ceiling"), c.q ? c.q.pct + "%" : "–"], [L("ขีดจำกัดที่ส่งได้", "Submit ceiling"), c.q ? fmt(c.limit) : "–"], [L("ยอดชุดส่งตอนนี้", "Package total now"), fmt(c.total)], [c.ok ? L("เหลือ", "Left") : L("เกิน", "Over"), c.q ? fmt(Math.abs(c.limit - c.total)) : "–", "", !c.ok]])}
  ${qtCan() ? "" : eNote(L("เฉพาะกองแผนงานตั้งหรือแก้โควต้า บทบาทอื่นดูอย่างเดียว", "Only Planning sets or changes the quota; other roles view only"))}
  ${crudList("quota", { head: `<h2>${L("โควต้าแต่ละปีงบประมาณ", "Quota for each fiscal year")}</h2>` })}`;
});
Object.assign(NAV_ICON, { "bq-cfg": "coins" });
