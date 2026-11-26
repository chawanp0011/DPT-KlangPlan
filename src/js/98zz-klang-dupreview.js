// KlangFinance, round P13 (15 Nov 2569): the list "Possible duplicates" of the consolidation page gets a review process, a side-by-side
// comparison, the lines that are thought to overlap, and a place where Planning records the result.
//  - Process: found (by AI or marked by Planning) -> under review (an owner starts it) -> [more information asked from the units, answered] ->
//    result (merge, partly duplicate: the unit adjusts the scope, or not a duplicate). A result needs a note; it is kept with who and when, and a log of the
//    steps is shown. Decisions are offered only once the review has started.
//  - Comparison tab: the two requests side by side (unit, status, amount, line of the budget structure, kind, lines, reason), equal cells marked, a
//    similarity figure, and the lines that look the same (the same item of the price register, or the same name) with the overlapping amount.
//  - "Find duplicates with AI" (Planning): a simulated check by fixed rules over the sent requests (the same activity, or a line with the same
//    register item or name); it adds the new pairs as possible duplicates. It is not a language model.
// Assumptions of mine: the similarity figure and its weights; the seeded duplicates get a pair of requests chosen by me (the sample ones named none).

Object.assign(DUP_ST, { review: [["กำลังพิจารณา", "Under review"], "p-info"], info: [["รอข้อมูลจากหน่วยงาน", "Waiting for the units"], "p-warn"], adjust: [["ซ้ำบางส่วน ให้ปรับ", "Partly duplicate: adjust"], "p-ok"] });
const dpReq = id => S.requests.find(r => r.id === id) || null;
const dpPair = d => [dpReq(d.reqA), dpReq(d.reqB)];
const dpKey = l => (l.sp ? "sp:" + l.sp : "nm:" + nmStr(l.name).trim().toLowerCase());
function dpMatches(a, b) {
  if (!a || !b) return []; const out = [], used = new Set();
  a.items.forEach(la => { const k = dpKey(la); if (k === "nm:") return; const j = b.items.findIndex((lb, i) => !used.has(i) && dpKey(lb) === k); if (j >= 0) { used.add(j); out.push({ a: la, b: b.items[j], over: Math.min(itemTotal(la), itemTotal(b.items[j])) }); } });
  return out;
}
function dpSim(a, b) {
  if (!a || !b) return 0; const m = dpMatches(a, b), n = Math.max(a.items.length, b.items.length, 1), mx = Math.max(reqAmount(a), reqAmount(b), 1), mn = Math.min(reqAmount(a), reqAmount(b));
  return Math.min(100, Math.round((a.act && a.act === b.act ? 35 : 0) + (a.unit === b.unit ? 5 : 0) + (m.length / n) * 40 + (mn / mx) * 20));
}
const dpLog = (d, th, en, note) => { (d.log = d.log || []).push({ t: nowIso(), by: me().id, what: [th, en], note: note || "" }); };
const dpWho = id => (id === "ai" ? "AI" : id ? userName(id) : "–");
const dpOpen = new Set(["open", "review", "info"]);

// ---------- seed: a pair of requests for each sample duplicate ----------
Object.keys(SEEDS).forEach(k => {
  const prev = SEEDS[k].seed;
  SEEDS[k].seed = () => {
    const s = prev(), rs = (s.requests || []).filter(r => r.status !== "draft" && r.status !== "rejected"), used = new Set();
    (s.dupes || []).forEach((d, i) => {
      if (!d.reqA) { const m = /REQ-\d{4}-\d{3}/.exec(tx(d.desc) || ""), a = (m && rs.find(r => r.id === m[0])) || rs[i * 2] || rs[0]; d.reqA = a.id; used.add(a.id);
        const b = rs.find(r => r.id !== a.id && !used.has(r.id) && (r.act === a.act || r.unit !== a.unit)) || rs.find(r => r.id !== a.id); if (b) { d.reqB = b.id; used.add(b.id); } }
      d.log = d.log || [{ t: "2026-10-15T14:20", by: "ai", what: ["AI ตรวจพบรายการที่อาจซ้ำซ้อน", "AI found a possible duplicate"], note: "" }];
    });
    if (s.dupes && s.dupes[1]) { const d = s.dupes[1], pl = (s.users.find(u => u.role === "plan") || {}).id || ""; d.stage = "review"; d.owner = pl; d.log.push({ t: "2026-10-16T09:00", by: pl, what: ["เริ่มพิจารณา", "Started the review"], note: "" }); }
    return s;
  };
});

// ---------- the comparison tab ----------
function dpCompare(d) {
  const [a, b] = dpPair(d); if (!a || !b) return `<p class="sub">${L("ยังไม่ได้ระบุคำขอทั้งสอง แก้ไขรายการแล้วเลือกคำขอที่คงไว้และคำขอที่ถูกรวมเพื่อเปรียบเทียบ", "Both requests are not named yet; edit the item and choose the request to keep and the one merged in")}</p>`;
  const sim = dpSim(a, b), ms = dpMatches(a, b), lin = r => lineage(r.act).map(x => tx(x.name)).join(" › ") || "–", clip2 = (t, n) => { t = tx(t) || ""; return t.length > n ? t.slice(0, n) + "…" : t; };
  const rows = [[L("รหัสคำขอ", "Request"), r => `<span class="mono">${r.id}</span>`, r => r.id], [L("ชื่อรายการ", "Name"), r => esc(nmStr(r.name)), r => nmStr(r.name)], [L("สำนัก/กอง", "Division"), r => esc(unitName(r.unit)), r => r.unit], [L("สถานะ", "Status"), r => pill(r.status), r => r.status],
    [L("วงเงินที่ขอ (บาท)", "Amount (baht)"), r => fmt(reqAmount(r)), r => reqAmount(r)], [L("ผลผลิต/กิจกรรมตามโครงสร้างงบประมาณ", "Output/activity of the budget structure"), r => esc(lin(r)), r => r.act || ""], [L("ลักษณะ", "Nature"), r => (rqNature(r) === "inv" ? L("งบลงทุน", "Investment") : L("รายจ่ายประจำ", "Recurrent")), r => rqNature(r)],
    [L("จำนวนรายการ", "Lines"), r => String(r.items.length), r => r.items.length], [L("รายการงบ", "Budget lines"), r => `<ul class="plain">${r.items.map(i => `<li>${esc(nmStr(i.name))} · ${fmt(i.qty)} × ${fmt(i.price)}</li>`).join("")}</ul>`, () => null], [L("เหตุผลความจำเป็น", "Justification"), r => esc(clip2(r.reason, 160)), () => null]];
  return `<div class="row" style="margin-bottom:8px">${tag(`${L("ความเหมือน", "Similarity")} ${sim}%`, sim >= 60 ? "p-bad" : sim >= 35 ? "p-warn" : "p-mute")}<span class="sub">${L("น้ำหนักที่ผมกำหนดเอง: กิจกรรมเดียวกัน 35 · รายการในทะเบียนราคากลางเดียวกัน 40 · วงเงินใกล้กัน 20 · สำนัก/กองเดียวกัน 5", "Weights of my own: same activity 35 · same register item 40 · close amounts 20 · same division 5")}</span></div>
    <div class="tbl-wrap"><table><thead><tr><th></th><th>${L("คำขอที่คงไว้", "Request kept")}</th><th>${L("คำขอที่ถูกรวม", "Request merged in")}</th></tr></thead><tbody>${rows.map(([h, f, key]) => { const eq2 = key(a) !== null && String(key(a)) === String(key(b)) && String(key(a)) !== ""; return `<tr><th style="text-align:left;font-weight:600">${h}</th><td${eq2 ? ' style="background:var(--warn-soft)"' : ""}>${f(a)}</td><td${eq2 ? ' style="background:var(--warn-soft)"' : ""}>${f(b)}</td></tr>`; }).join("")}</tbody></table></div>
    <div class="row"><button class="btn" type="button" data-dpopen="${a.id}">${L("เปิดดูคำขอ", "Open request")} ${a.id}</button><button class="btn" type="button" data-dpopen="${b.id}">${L("เปิดดูคำขอ", "Open request")} ${b.id}</button><span class="sub">${L("พื้นที่สีเหลืองคือค่าที่เหมือนกัน", "Yellow cells are equal")}</span></div>
    <h3 style="font-size:14px;margin:14px 0 4px">${L("รายการที่คิดว่าซ้ำ", "Lines thought to overlap")}</h3>
    ${ms.length ? `<div class="tbl-wrap"><table><thead><tr><th>${L("รายการ", "Line")}</th><th class="n">${a.id}</th><th class="n">${b.id}</th><th class="n">${L("ส่วนที่ซ้ำ (บาท)", "Overlap (baht)")}</th></tr></thead><tbody>${ms.map(m => `<tr><td>${esc(nmStr(m.a.name))}${m.a.sp ? ` <span class="mono sub">${m.a.sp}</span>` : ""}</td><td class="n">${fmt(m.a.qty)} × ${fmt(m.a.price)} = ${fmt(itemTotal(m.a))}</td><td class="n">${fmt(m.b.qty)} × ${fmt(m.b.price)} = ${fmt(itemTotal(m.b))}</td><td class="n"><b>${fmt(m.over)}</b></td></tr>`).join("")}</tbody><tfoot><tr><td colspan="3">${L("รวมส่วนที่ซ้ำตามรายการ", "Total overlap by line")}</td><td class="n">${fmt(ms.reduce((t, m) => t + m.over, 0))}</td></tr></tfoot></table></div>`
      : `<p class="sub">${L("ไม่พบรายการงบที่เหมือนกัน (รายการในทะเบียนราคากลางเดียวกัน หรือชื่อเหมือนกัน) ความซ้ำที่ AI เห็นมาจากเหตุผลด้านล่าง", "No identical budget line (same register item or name); the overlap the AI saw comes from the reason below")}</p>`}
    <p><b style="font-weight:600">${L("เหตุผลที่คิดว่าซ้ำ", "Why it looks duplicated")}:</b> ${esc(tx(d.desc)) || "–"} · ${L("วงเงินที่ซ้ำที่ประเมิน", "estimated overlap")} <b>${fmt(d.save, 1)}</b> ${L("ล้านบาท", "M baht")}</p>`;
}

// ---------- the process tab ----------
function dpProcess(d) {
  const st = d.done || d.stage || "open", step = (th, en, on, done) => tag(`${on ? "● " : done ? "✓ " : ""}${L(th, en)}`, on ? "p-info" : done ? "p-ok" : "p-mute"), fin = !!d.done, rv = !!d.owner || fin;
  const r = d.result;
  return `<div class="row" style="gap:4px;margin-bottom:8px">${step("1. ตรวจพบ", "1. Found", st === "open", true)}${step("2. กำลังพิจารณา", "2. Under review", st === "review", rv && st !== "open")}${step("3. ขอข้อมูลเพิ่ม (ถ้ามี)", "3. More information (if needed)", st === "info", (d.asks || []).length > 0 && st !== "info")}${step("4. ผลการพิจารณา", "4. Result", false, fin)}</div>
    ${kv([[L("ที่มา", "Source"), d.manual ? L("กองแผนงานทำเครื่องหมาย", "Marked by Planning") : L("ตรวจพบโดย AI", "Found by AI")], [L("ผู้พิจารณา", "Reviewer"), d.owner ? esc(userName(d.owner)) : "–"], [L("สถานะ", "Status"), tag(tx(DUP_ST[st][0]), DUP_ST[st][1])]])}
    ${(d.asks || []).length ? `<h3 style="font-size:14px;margin:12px 0 4px">${L("ข้อมูลที่ขอจากหน่วยงาน", "Information asked from the units")}</h3><ul class="plain">${d.asks.map(x => `<li>${esc(x.q)} <span class="sub">${esc(dpWho(x.by))} · ${fdate(x.t, true)}${x.ans ? ` · ${L("ได้รับ", "received")}: ${esc(x.ans)}` : ` · ${L("รอคำตอบ", "waiting")}`}</span></li>`).join("")}</ul>` : ""}
    <h3 style="font-size:14px;margin:12px 0 4px">${L("ผลการพิจารณา", "Result")}</h3>
    ${r ? `<div class="alert"><div class="ic" style="background:var(--ok-soft);color:var(--ok)">✓</div><div><b>${tx(DUP_ST[r.decision][0])}</b>${r.cut ? ` · ${L("ลดวงเงิน", "cut")} ${fmt(r.cut, 1)} ${L("ล้านบาท", "M baht")}` : ""}<p>${esc(r.note || "")}</p><span class="sub">${esc(userName(r.by))} · ${fdate(r.t, true)}</span></div></div>`
      : `<p class="sub">${ROLE === "plan" ? (st === "open" ? L("เริ่มพิจารณาก่อน (ปุ่ม “เริ่มพิจารณา”) แล้วบันทึกผลด้วยปุ่ม รวมรายการ / ซ้ำบางส่วน ให้ปรับ / ไม่ซ้ำ พร้อมเหตุผล", "Start the review first (the “Start the review” button), then record the result with Merge / Partly duplicate / Not a duplicate and a reason") : L("เลือกผลการพิจารณาด้วยปุ่มด้านล่าง ต้องใส่เหตุผลทุกครั้ง", "Record the result with the buttons below; a reason is always needed")) : L("ยังไม่มีผลการพิจารณา", "No result yet")}</p>`}
    <h3 style="font-size:14px;margin:12px 0 4px">${L("บันทึกขั้นตอน", "Log of the steps")}</h3>
    <ul class="plain">${(d.log || []).map(x => `<li>${esc(tx(x.what))}${x.note ? `: ${esc(x.note)}` : ""} <span class="sub">${esc(dpWho(x.by))} · ${fdate(x.t, true)}</span></li>`).join("") || `<li class="sub">–</li>`}</ul>`;
}

// ---------- patch the register ----------
{
  const D = CRUD.defs.csDup, tabs0 = D.tabs, acts0 = D.acts;
  D.status = d => d.done || d.stage || "open";
  D.cols = [...D.cols.slice(0, 2), { h: ["ความเหมือน", "Similarity"], n: true, c: d => { const [a, b] = dpPair(d); return a && b ? `${dpSim(a, b)}%` : "–"; } }, { h: ["รายการที่ซ้ำ", "Overlapping lines"], n: true, c: d => { const [a, b] = dpPair(d); return a && b ? dpMatches(a, b).length : "–"; } }, ...D.cols.slice(2)];
  D.tabs = d => [...(tabs0 ? tabs0(d) : []), ["cmp", L("เปรียบเทียบ", "Compare"), dpCompare(d)], ["proc", L("กระบวนการพิจารณา", "Review process"), dpProcess(d)]];
  D.acts = d => {
    if (ROLE !== "plan" || d.done) return [];
    const old = acts0(d), by = id => old.find(a => a && a.id === id), st = d.stage || "open", fin = (decision, note, extra) => { d.done = decision; d.result = Object.assign({ decision, note, by: me().id, t: nowIso() }, extra || {}); dpLog(d, `บันทึกผลการพิจารณา: ${tx(DUP_ST[decision][0])}`, `Recorded the result: ${tx(DUP_ST[decision][0])}`, note); };
    const out = [];
    if (st === "open") out.push({ id: "start", label: L("เริ่มพิจารณา", "Start the review"), kind: "primary", run: () => { d.stage = "review"; d.owner = me().id; dpLog(d, "เริ่มพิจารณา", "Started the review"); audit(["เริ่มพิจารณารายการที่อาจซ้ำซ้อน", "Started reviewing a possible duplicate"], d.id); return L("เริ่มพิจารณาแล้ว", "Review started"); } });
    if (st === "review") out.push({ id: "ask", label: L("ขอข้อมูลเพิ่มจากหน่วยงาน", "Ask the units for more"), kind: "ghost", why: true, whyLabel: L("สิ่งที่ต้องการให้หน่วยงานชี้แจง (อย่างน้อย 10 ตัวอักษร)", "What the units should explain (at least 10 characters)"), run: (_, q) => { d.stage = "info"; (d.asks = d.asks || []).push({ q, by: me().id, t: nowIso() }); dpLog(d, "ขอข้อมูลเพิ่มจากหน่วยงาน", "Asked the units for more", q); const rs = dpPair(d).filter(Boolean); notify(["div"], [`กองแผนงานขอข้อมูลเพิ่มเรื่องรายการที่อาจซ้ำซ้อน ${rs.map(r => r.id).join(" กับ ")}: ${q}`, `Planning asks for more on a possible duplicate ${rs.map(r => r.id).join(" and ")}: ${q}`], "requests"); audit(["ขอข้อมูลเพิ่มเรื่องรายการซ้ำ", "Asked for more on a duplicate"], d.id); return L("ส่งคำถามถึงหน่วยงานแล้ว", "Question sent to the units"); } });
    if (st === "info") out.push({ id: "got", label: L("ได้รับข้อมูลแล้ว กลับไปพิจารณา", "Information received: back to the review"), kind: "primary", why: true, whyLabel: L("สรุปข้อมูลที่ได้รับ (อย่างน้อย 10 ตัวอักษร)", "Summary of what was received (at least 10 characters)"), run: (_, a) => { const q = (d.asks || []).slice().reverse().find(x => !x.ans); if (q) q.ans = a; d.stage = "review"; dpLog(d, "ได้รับข้อมูลจากหน่วยงาน", "Received the information", a); return L("กลับไปพิจารณา", "Back to the review"); } });
    if (st === "review") {
      const m = by("merge"), k = by("keep");
      if (m) out.push(Object.assign({}, m, { label: L("ผล: รวมรายการ", "Result: merge"), why: true, whyLabel: L("เหตุผลของการรวม (อย่างน้อย 10 ตัวอักษร)", "Reason for the merge (at least 10 characters)"), run: (x, why) => { const msg = m.run(x, why); d.result = { decision: "merge", note: why, by: me().id, t: nowIso(), cut: d.save }; dpLog(d, "บันทึกผลการพิจารณา: รวมแล้ว", "Recorded the result: merged", why); return msg; } }));
      out.push({ id: "adjust", label: L("ผล: ซ้ำบางส่วน ให้ปรับ", "Result: partly duplicate, adjust"), kind: "ghost", why: true, whyLabel: L("ส่วนที่ซ้ำและสิ่งที่หน่วยงานต้องปรับ (อย่างน้อย 10 ตัวอักษร)", "What overlaps and what the unit must adjust (at least 10 characters)"), run: (_, note) => { fin("adjust", note); const rb = dpReq(d.reqB); if (rb) { rb.hearAdjust = { h: d.id, note, done: false }; notify(["div"], [`ให้ปรับคำขอ ${rb.id} เพราะซ้ำบางส่วนกับ ${d.reqA || "-"}: ${note}`, `Adjust ${rb.id}: it partly overlaps ${d.reqA || "-"}: ${note}`], "req:" + rb.id); } audit(["ผลพิจารณารายการซ้ำ: ซ้ำบางส่วน ให้ปรับ", "Duplicate result: partly, adjust"], d.id); return L("บันทึกผลแล้ว แจ้งหน่วยงานให้ปรับ", "Recorded; the unit is told to adjust"); } });
      if (k) out.push(Object.assign({}, k, { label: L("ผล: ไม่ซ้ำ", "Result: not a duplicate"), run: (x, why) => { const msg = k.run(x, why); d.result = { decision: "keep", note: why, by: me().id, t: nowIso() }; dpLog(d, "บันทึกผลการพิจารณา: ไม่ซ้ำ", "Recorded the result: not a duplicate", why); return msg; } }));
    }
    const del = by("del"); if (del) out.push(del);
    return out;
  };
}

// ---------- the AI search for new duplicates (simulated rules) and the links to the requests ----------
function dpScan() {
  const rs = S.requests.filter(r => !["draft", "rejected", "cancelled"].includes(r.status)), have = new Set(S.dupes.flatMap(d => [d.reqA + "|" + d.reqB, d.reqB + "|" + d.reqA])), made = [];
  for (let i = 0; i < rs.length && made.length < 5; i++) for (let j = i + 1; j < rs.length && made.length < 5; j++) {
    const a = rs[i], b = rs[j]; if (have.has(a.id + "|" + b.id)) continue; const ms = dpMatches(a, b), same = a.act && a.act === b.act; if (!ms.length && !same) continue;
    if (a.unit === b.unit && !ms.length) continue;
    const over = ms.reduce((t, m) => t + m.over, 0) || Math.min(reqAmount(a), reqAmount(b)) * 0.1, [ka, kb] = reqAmount(a) >= reqAmount(b) ? [a, b] : [b, a];
    const why = [same ? "อยู่ในกิจกรรมเดียวกัน" : "", ms.length ? `มี ${ms.length} รายการงบที่เหมือนกัน (${ms.slice(0, 2).map(m => nmStr(m.a.name)).join(", ")})` : ""].filter(Boolean).join(" และ "), whyEn = [same ? "in the same activity" : "", ms.length ? `${ms.length} identical budget lines` : ""].filter(Boolean).join(" and ");
    const d = { id: nextNo(S.dupes, "d"), ai: true, title: [`${nmStr(ka.name)} ซ้ำกับ ${nmStr(kb.name)}`, `${nmStr(ka.name)} overlaps ${nmStr(kb.name)}`], desc: [`${ka.id} และ ${kb.id} ${why}`, `${ka.id} and ${kb.id}: ${whyEn}`], reqA: ka.id, reqB: kb.id, save: Math.max(0.1, Math.round(over / 1e5) / 10), by: me().id, t: nowIso(), log: [{ t: nowIso(), by: me().id, what: ["AI ตรวจพบ (กฎจำลอง)", "Found by AI (simulated rules)"], note: "" }] };
    S.dupes.push(d); made.push(d); have.add(ka.id + "|" + kb.id);
  }
  audit(["AI ตรวจหารายการที่อาจซ้ำซ้อน", "AI looked for possible duplicates"], `${made.length}`); return made.length;
}
{
  const c0 = crudList;
  crudList = function (key, opts) { if (key === "csDup" && ROLE === "plan") opts = Object.assign({}, opts, { after: `<div class="body row"><button class="btn" type="button" data-dpscan>${L("ให้ AI ตรวจหารายการที่อาจซ้ำ", "Find duplicates with AI")}</button><span class="sub">${L("ตรวจด้วยกฎจำลอง: กิจกรรมเดียวกัน หรือรายการงบเหมือนกัน ไม่ใช่โมเดลภาษา", "A check by simulated rules: the same activity or an identical budget line; not a language model")}</span></div>` }); return c0.call(this, key, opts); };
  document.addEventListener("click", e => {
    const o = e.target.closest && e.target.closest("[data-dpopen]"); if (o) { REQ_BACK = "consolidation"; openReq(o.dataset.dpopen); return; }
    const s = e.target.closest && e.target.closest("[data-dpscan]"); if (s && ROLE === "plan") { const n = dpScan(); commit(); route(); toast(n ? L(`AI พบรายการที่อาจซ้ำเพิ่ม ${n} รายการ`, `AI found ${n} more possible duplicates`) : L("ไม่พบรายการซ้ำเพิ่ม", "No further duplicates found")); }
  });
}
