// ---------- P99: the case page keeps only the new sections; step 2 is view-only once the unit's part is done ----------
// Asked for: take out, for now, the older sections that still showed:
//   step 2 จัดทำข้อมูล: รายละเอียดโครงการที่ขอซื้อขอจ้าง; step 3 ส่ง e-GP: อุทธรณ์ (e-GP step 5 holds the appeal);
//   step 4 ทำสัญญา: สัญญา, หลักประกันและการแก้ไขสัญญา, ขยายสัญญา / ปรับวงเงิน (the panel สัญญาและสัญญาแก้ไข holds them).
//   step 1 รายการงบประมาณ: รายการงบประมาณ, จัดทำแผนงาน, อนุมัติแผนงาน; in their place the details Planning wrote for the item.
// And: when the case has gone past the unit (step 2), step 2 is shown read-only.
// The panels are hidden, not deleted: MENU_ALL or window.CASE_OLD = true shows them again.
const P99_CASE_OLD = ["รายละเอียดโครงการที่ขอซื้อขอจ้าง", "รายการงบประมาณ", "จัดทำแผนงาน", "อนุมัติแผนงาน", "อุทธรณ์", "สัญญา", "หลักประกันและการแก้ไขสัญญา", "ขยายสัญญา / ปรับวงเงิน"];
function p99CaseTidy() { if (!m88On() || window.CASE_OLD) return; const tab = document.querySelector('button.cphase[aria-selected="true"]'); if (!tab) return;
  document.querySelectorAll("section.panel").forEach(s => { const h = s.querySelector(":scope > header h2"); if (h && P99_CASE_OLD.includes(h.textContent.trim()) && s.style.display !== "none") s.style.display = "none"; });
  const c = typeof CASE_OPEN !== "undefined" && CASE_OPEN ? S.cases.find(x => x.id === CASE_OPEN) : null; if (!c || tab.dataset.cphase !== "2" || !(caseMainNow(c) > 2)) return;
  const secs = [...document.querySelectorAll(".cmain .panel, section.panel")].filter(s => { const h = s.querySelector(":scope > header h2"); return h && /^\d\.\s/.test(h.textContent.trim()) && !s.closest(".cphases"); });
  const more = [...document.querySelectorAll("h3")].filter(h => /^6\.\s/.test(h.textContent.trim())).map(h => h.parentElement);
  let n = 0; secs.concat(more).forEach(s => { if (!s || s.dataset.p99ro) return; s.dataset.p99ro = "1"; n++;
    s.querySelectorAll("input, select, textarea").forEach(i => { i.disabled = true; if (i.type === "file") i.style.display = "none"; });
    s.querySelectorAll("button").forEach(b => { if (!b.closest(".tabs") && !b.matches(".tab, [role=tab], [data-rqdoc], [data-dlv]")) { b.disabled = true; b.style.display = "none"; } }); });
  if (n && !document.getElementById("p99-ro")) { const first = secs[0] || more[0]; if (first) { const d = document.createElement("div"); d.id = "p99-ro"; d.className = "sub"; d.style.cssText = "margin:0 0 8px;padding:8px 12px;border:1px solid var(--line);border-radius:8px;background:var(--surface-2,#f8fafc)";
    d.textContent = "ดูอย่างเดียว: รายการนี้ผ่านขั้นจัดทำข้อมูลของสำนัก/กองแล้ว"; first.parentNode.insertBefore(d, first); } } }
(function () { let tm = null; new MutationObserver(() => { clearTimeout(tm); tm = setTimeout(p99CaseTidy, 30); }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["aria-selected", "class"] }); document.addEventListener("click", e => { if (e.target && e.target.closest && e.target.closest("button.cphase")) setTimeout(p99CaseTidy, 0); }); })();
// step 1: the budget item as Planning wrote it (รายละเอียด / มอบหมาย)
function p99BiOf(c) { const p = famPlan(c.plan); return ((S.bi && S.bi.rows) || []).find(r => (r.sent && (r.sent.pp === c.plan || (r.sent.extra || []).some(e => e.pp === c.plan))) || (p && p.biSrc === r.id)) || null; }
function p99BiPanel(c) { const r = p99BiOf(c); if (!r) return `<div class="sub">รายการนี้ไม่ได้มาจากรายการงบประมาณที่กองแผนงานนำเข้า</div>`; const pl = r.pl || {}, us = typeof p95Units === "function" ? p95Units(r) : [], yrs = pl.yrs || {};
  const kv = (k, v) => `<dt>${k}</dt><dd>${v === "" || v == null ? "–" : v}</dd>`, M = BI_MON.map((m, i) => `<th class="n">${m}</th>`).join("");
  return `<dl class="kv" style="display:grid;grid-template-columns:max-content 1fr max-content 1fr;gap:6px 14px;margin:0">${kv("ชื่อรายการ", esc(r.name))}${kv("เลขที่รายการ", `<span class="mono">${esc(r.id)}</span>`)}${kv("รหัสงบประมาณ (GFMIS)", `<span class="mono">${esc(r.code || "")}</span>`)}${kv("รหัส e-bud", esc(r.ebud || ""))}
    ${kv("ประเภทรายการ", esc(r.type || ""))}${kv("งบรายจ่าย", esc(r.kind || ""))}${kv("แผนงาน / ภารกิจ", esc(r.prog || ""))}${kv("ผลผลิต/โครงการ", esc(pl.prod || r.prod || ""))}
    ${kv("วงเงิน (บาท)", fmt(r.amount))}${kv("จำนวน / หน่วยนับ", r.qty ? `${fmt(r.qty)} ${esc(r.uname || "")}` : "")}${kv("ที่มาของงบประมาณ", esc(pl.act || ""))}${kv("ลักษณะงบประมาณ", esc(pl.years || r.years || ""))}
    ${kv("พื้นที่ดำเนินการ", esc(pl.prov || ""))}${kv("ปีที่เริ่ม / จำนวนปี", pl.startY ? `${pl.startY} / ${pl.nYears || 1} ปี` : "")}
    ${kv("หน่วยงานที่มอบหมาย", us.map(u => `${esc(unitName(u.unit))} ${fmt(u.amt)} บาท`).join("<br>"))}${kv("งบประมาณรายปี (ล้านบาท)", Object.keys(yrs).length ? Object.entries(yrs).map(([y, v]) => `ปี ${y}: ${fmt(v, 4)}`).join(" · ") : "")}</dl>
    ${p99MoneyQ(c, r)}
    <div class="sub">${r.sent && r.sent.t ? `นำส่งสำนัก/กองเมื่อ ${fdate(String(r.sent.t).slice(0, 10))}` : ""}</div>`; }
{ const base = caseExtraPanels; caseExtraPanels = function (c) { const out = base(c); if (!m88On() || window.CASE_OLD) return out; out.push(cmPanel(1, 0, "รายละเอียดรายการงบประมาณ (กองแผนงาน)", p99BiPanel(c))); return out; }; }
// P99: registers that are the same every year (พื้นที่, ตารางอ้างอิงรายจ่าย, ราคากลาง, the law/condition/document registers): no year selector; พื้นที่ is titled as its menu.
{ const base = menuFyChip; menuFyChip = function () { if (m88On() && ["bq-geo", "bq-ref", "bq-cat", "rg-law", "rg-cond", "rg-doct"].includes(fyRouteId())) { document.querySelectorAll(".fy-filter").forEach(x => x.remove()); return; } return base.apply(this, arguments); }; }
{ const p = typeof bPage === "function" ? bPage("bq-geo") : null; if (p) p.h1 = ["พื้นที่", "Areas"]; }
if (VIEWS["bq-geo"]) { const base = VIEWS["bq-geo"]; VIEWS["bq-geo"] = function () { const h = base.apply(this, arguments); return m88On() ? h.replace("ตารางพื้นที่และพิกัด", "พื้นที่") : h; }; }
// P99: e-GP step 4 has its own heading "สงป. พิจารณา / ขยายระยะเวลาก่อหนี้ผูกพัน": the งบผูกพัน switch and the Budget Bureau and debt-extension
// fields are grouped under it, after the fields of the evaluation.
const P99_BB = ["bbLetter", "bbOkLetter", "bbAmount", "qLen", "cabLetter", "cab", "cabFrom", "cabTo"];
function p99BbGroup() { if (!m88On()) return; document.querySelectorAll('form[data-e7$="|4"]').forEach(f => { if (f.dataset.p99bb) return; f.dataset.p99bb = "1";
  const box = f.querySelector('input[name="multi"]'), sw = box && box.closest(".f"); if (!sw) return; const lab = sw.querySelector("label"); if (lab) lab.lastChild.textContent = " งบผูกพัน (ต้องส่ง สงป. พิจารณาความเหมาะสม และขยายระยะเวลาก่อหนี้ผูกพัน)";
  const h = document.createElement("div"); h.className = "f"; h.style.cssText = "flex:1 1 100%;margin-top:8px;padding-top:8px;border-top:1px dashed var(--line)"; h.innerHTML = `<b style="font-weight:600">สงป. พิจารณา / ขยายระยะเวลาก่อหนี้ผูกพัน</b><div class="sub">ตามคอลัมน์ของแบบฟอร์มติดตาม กรอกเมื่อมีข้อมูล</div>`;
  const last = f.querySelector('button[type="submit"]') ? f.querySelector('button[type="submit"]').closest("div") : null; f.insertBefore(h, last);
  P99_BB.forEach(n => { const el = f.querySelector(`[name="${n}"]`), fd = el && el.closest(".f"); if (fd) f.insertBefore(fd, last); }); f.insertBefore(sw, last); }); }
(function () { let tm = null; new MutationObserver(() => { clearTimeout(tm); tm = setTimeout(p99BbGroup, 50); }).observe(document.body, { childList: true, subtree: true }); })();
// ความยาว (เมตร) is asked at e-GP step 4 now: hidden in the request form of the unit (data kept)
(function () { let tm = null; new MutationObserver(() => { clearTimeout(tm); tm = setTimeout(() => { if (!m88On()) return; const i = document.getElementById("pr-qlen"); const fd = i && i.closest(".f"); if (fd && fd.style.display !== "none") fd.style.display = "none"; }, 50); }).observe(document.body, { childList: true, subtree: true }); })();
// step 1: the money plan of the item by quarter (plan, result, % ) with the months on a click; the result is what was paid on the item
function p99MoneyQ(c, r) { const fy = biFy(r), mi = Math.min(11, prMonIdx(TODAY)), qNow = Math.floor(mi / 3), D = prDtRows(fy, false), row = D.find(x => x.id === r.id), act = row ? row.act : Array(12).fill(0);
  const S3 = (a, i) => a.slice(i * 3, i * 3 + 3).reduce((s, v) => s + (Number(v) || 0), 0), tp = r.plan.reduce((s, v) => s + (Number(v) || 0), 0), ta = act.reduce((s, v) => s + v, 0);
  return `<div style="margin-top:10px"><div class="row" style="justify-content:space-between;align-items:center"><b style="font-weight:600">แผนเงินและผลการเบิกจ่าย (บาท)</b><span class="sub">${r.planRev ? `ปรับแผนครั้งที่ ${r.planRev}` : "แผนตั้งต้น"} · ผลตามวันที่จ่ายจริง</span></div>
    <div style="display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin-top:6px">${[0, 1, 2, 3].map(q => `<div style="border:1px solid var(--line);border-radius:8px;padding:8px;${q === qNow ? "background:#fefce8" : ""}"><div class="sub">ไตรมาส ${q + 1} · ${["ต.ค.–ธ.ค.", "ม.ค.–มี.ค.", "เม.ย.–มิ.ย.", "ก.ค.–ก.ย."][q]}</div>${mp98Cell(S3(r.plan, q), S3(act, q), q <= qNow)}</div>`).join("")}
      <div style="border:1px solid var(--line);border-radius:8px;padding:8px;background:var(--surface-2,#f8fafc)"><div class="sub">รวมทั้งปี</div>${mp98Cell(tp, ta, true)}</div></div>
    <details style="margin-top:8px"><summary class="btn ghost" style="display:inline-block">ดูรายเดือน (แผน / ผล)</summary><div style="margin-top:6px">${mp98Months(r, act, mi)}</div></details></div>`; }
