// ---------- P99: ขอจัดซื้อจัดจ้าง for a unit shows the sample items it received ----------
// Asked for: "ตรวจสอบข้อมูลของ สำนัก/กอง ไม่มีให้ใส่รายละเอียด". The FY 2570 sample (98zzzzv) marks its items as sent with no plan item
// or case behind them (sent.pp ""), so the unit's list was empty. Now those items are listed too, with the stage of the sample:
//   every item: "จัดทำรายละเอียด" makes the plan item and the case (as biSend does) and opens the details form (checked: the follow-up
//   form keeps the sample values, a new empty case does not replace them); items past the start also have "ดูความก้าวหน้า".
function r99Rows(fy, unitOnly) { const D = prDtRows(fy, false), B = prTrackBook(fy)[0].rows.slice(5), st = {}; D.forEach((r, i) => { if (B[i]) st[r.id] = p92St(B[i]); });
  return ((S.bi && S.bi.rows) || []).filter(r => r.sent && !r.sent.pp && biFy(r) === fy && (!unitOnly || (biUnit(r) && biUnit(r).id === unitOnly))).map(r => ({ r, st: st[r.id] || "s0" })); }
function r99Make(r) { if (r.sent && r.sent.pp) return S.pplan.find(q => q.id === r.sent.pp); const u = biUnit(r); if (!u) return null;
  const inv = /ลงทุน/.test(r.kind), L0 = famLines(), line = L0.find(l => l.unit === u.id && (l.type === "inv") === inv) || L0.find(l => l.unit === u.id) || null;
  const m0 = Math.max(0, r.plan.findIndex(x => x > 0)), y = 2026 + (m0 >= 3 ? 1 : 0), mon = ((m0 + 9) % 12) + 1;
  const p = { id: nextId("PP", S.pplan), line: line ? line.id : "", name: [r.name, r.name], est: r.amount, method: r.amount <= 5e5 ? "specific" : "ebid", month: `${y}-${String(mon).padStart(2, "0")}-15`, by: me().id, status: "planned", egp: null, qty: r.qty || 1, unitName: r.uname, months: 1, note: `จากรายการงบประมาณ ${r.id} รหัส ${r.code}`, biSrc: r.id, moneyPlan: r.plan.slice() };
  p.kind = guessKind(line || { type: inv ? "inv" : "ope" }, p.name); if (typeof pidNew === "function") p.pid = pidNew(); S.pplan.push(p); const c = caseNew(p);
  r.sent.pp = p.id; r.sent.cs = c && c.id; audit(["สร้างรายการจัดซื้อจากรายการตัวอย่าง", "Made the purchase from a sample item"], `${r.id} → ${p.id}`); return p; }
{ const base = PROC.reqn; PROC.reqn = function () { let h = base(); const unitOnly = ["div", "divhead"].includes(ROLE) ? me().unit : null, X = r99Rows(BI.fy, unitOnly); if (!X.length) return h;
  const lab = s => (P92_ST.find(x => x[0] === s) || [s, s])[1], early = s => s === "s0" || s === "s1", unitCan = ["div", "divhead"].includes(ROLE) || isProcRole();
  const tr = X.map(({ r, st }) => `<tr><td class="mono"><span class="sub">ยังไม่มี</span></td><td><b style="font-weight:600">${esc(r.name)}</b><div class="sub"><span class="mono">${esc(r.id)}</span>${r.code ? ` · <span class="mono">${esc(r.code)}</span>` : ""} · ข้อมูลตัวอย่าง</div></td><td>${esc(biUnit(r) ? tx(biUnit(r).name) : r.unitName)}</td><td class="n">${fmt(r.amount)}</td>
    <td>${tag(lab(st), early(st) ? "p-warn" : "p-info")}${early(st) ? `<div class="sub">รอสำนัก/กองจัดทำรายละเอียด</div>` : ""}</td>
    <td style="white-space:nowrap">${unitCan ? `<button class="btn ${early(st) ? "primary" : ""}" type="button" data-r99="${esc(r.id)}">จัดทำรายละเอียด</button>` : ""}${early(st) ? "" : ` <button class="btn ghost" type="button" data-r99p="${esc(r.id)}">ดูความก้าวหน้า</button>`}</td></tr>`).join("");
  const n = (h.match(/<span class="sub">(\d+) รายการ<\/span><\/header>/) || [])[1];
  h = h.replace(/<span class="sub">\d+ รายการ<\/span><\/header>/, `<span class="sub">${(Number(n) || 0) + X.length} รายการ · รอจัดทำรายละเอียด ${X.filter(x => early(x.st)).length}</span></header>`);
  if (h.includes("</tbody>")) return h.replace("</tbody>", tr + "</tbody>");
  return h.replace(/<div class="body sub">ยังไม่มีรายการในปีงบประมาณนี้<\/div>/, `<div class="tbl-wrap"><table><thead><tr><th>เลขที่ใบขอ</th><th style="min-width:240px">รายการ</th><th>หน่วยงาน</th><th class="n">วงเงิน (บาท)</th><th>สถานะ</th><th></th></tr></thead><tbody>${tr}</tbody></table></div>`); }; }
document.addEventListener("click", e => { const t = e.target && e.target.closest ? e.target : null; if (!t) return;
  const a = t.closest("[data-r99]"); if (a) { const r = ((S.bi && S.bi.rows) || []).find(x => x.id === a.dataset.r99), p = r && r99Make(r); if (!p) { toast("ไม่พบหน่วยงานของรายการนี้"); return; } commit(); route();
    setTimeout(() => { const b = document.querySelector(`[data-preq="${p.id}"]`); if (b) b.click(); else toast("สร้างรายการจัดซื้อแล้ว กดจัดทำรายละเอียดในรายการ"); }, 60); return; }
  const v = t.closest("[data-r99p]"); if (v) { procSet("progress88"); route(); } });
