// KlangFinance, round P93 (25 Nov 2569): เตรียมคำของบประมาณ gets its last step (asked for: "รัน flow ให้ครบ").
// The flow was run through with the demo users and the sample files: the division makes the case and sends it, Planning receives it,
// processes it, forwards what is missing, the division returns it, Planning processes again and sets "พร้อมส่ง สงป.". It worked to there,
// but nothing came after "ready": the pages that send to the Bureau are hidden in the trimmed menus. Now Planning records the sending
// on the case: the number of the cover letter and the date (both made up in the demo). The case stays "ready" (locked as before) and
// carries c.sent = { no, date, by, t }; the flow line and the overview show "ส่ง สงป. แล้ว".
function rmSendBureau(id, v) { const c = rmCase(id); if (!c) return "ไม่พบเรื่อง"; if (ROLE !== "plan") return "เฉพาะกองแผนงานนำส่ง สงป."; if (c.status !== "ready") return "ต้องตั้งสถานะพร้อมส่ง สงป. ก่อน"; if (c.sent) return "นำส่ง สงป. แล้ว";
  const no = String(v.no || "").trim(), date = String(v.date || "").trim(); if (!no) return "ระบุเลขที่หนังสือนำส่ง"; if (!date) return "ระบุวันที่นำส่ง"; if (date < (c.readyAt || "")) return "วันที่นำส่งต้องไม่ก่อนวันที่พร้อมส่ง";
  c.sent = { no: no.slice(0, 60), date, by: me().id, t: nowIso() }; rmLog(c, "นำส่ง สงป. แล้ว", `หนังสือ ${c.sent.no} ลงวันที่ ${date}`); audit(["นำส่งคำของบประมาณให้ สงป.", "Sent the request to the Bureau"], `${c.id} ${c.sent.no}`);
  notify(["div", "divhead", "exec"], [`คำของบประมาณ ${c.id} นำส่ง สงป. แล้ว (${c.sent.no})`, `Request ${c.id} sent to the Bureau`], "rmake"); return ""; }
{ const base = rmFwView; rmFwView = function (c) { let h = base(c); if (!c || c.status !== "ready") return h;
    h = h.replace(/( → <span class="pill [^"]*">พร้อมส่ง สงป\.<\/span>)(<\/div>)/, `$1 → <span class="pill ${c.sent ? "p-ok" : "p-mute"}">ส่ง สงป. แล้ว</span>$2`);
    const sentBox = c.sent ? `${tag(`นำส่ง สงป. แล้ว · หนังสือ ${c.sent.no} · ${fdate(c.sent.date)}`, "p-ok")}`
      : ROLE === "plan" ? `<form data-rmsend="${esc(c.id)}" class="row" style="gap:8px;flex-wrap:wrap;align-items:flex-end"><div class="f"><label>เลขที่หนังสือนำส่ง *</label><input name="no" value="กผ ${String((S.rmk || []).filter(x => x.sent).length + 1).padStart(4, "0")}/${c.fy} (ตัวอย่าง)"></div><div class="f"><label>วันที่นำส่ง *</label><input name="date" type="date" value="${TODAY}"></div><button class="btn primary" type="submit">นำส่ง สงป.</button></form>`
      : `<span class="sub">พร้อมส่ง สงป. รอกองแผนงานนำส่ง</span>`;
    return h.replace(/<span class="pill p-ok">พร้อมส่ง สงป\. แล้ว<\/span>|<span class="[^"]*p-ok[^"]*">[^<]*พร้อมส่ง สงป\. แล้ว[^<]*<\/span>/, sentBox); }; }
{ const base = RM_VIEW.ov; RM_VIEW.ov = function () { const h = base(), cs = (S.rmk || []).filter(c => c.fy === FORM_FY), n = cs.filter(c => c.sent).length, r = cs.filter(c => c.status === "ready" && !c.sent).length;
    return `<div class="row" style="gap:10px;flex-wrap:wrap;margin:0 0 10px"><span class="pill p-info">พร้อมส่ง รอนำส่ง สงป. ${r} เรื่อง</span><span class="pill p-ok">นำส่ง สงป. แล้ว ${n} เรื่อง</span></div>` + h; }; }
document.addEventListener("submit", e => { const f = e.target; if (!f || !f.matches || !f.matches("[data-rmsend]")) return; e.preventDefault(); const d = new FormData(f), m = rmSendBureau(f.dataset.rmsend, { no: d.get("no"), date: d.get("date") }); if (m) { toast(m); return; } commit(); renderShell(); route(); toast("นำส่ง สงป. แล้ว"); });
