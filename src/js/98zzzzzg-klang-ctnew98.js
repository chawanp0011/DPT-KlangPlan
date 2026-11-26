// ---------- P98: "สร้างสัญญา" (สัญญางบประมาณ) uses the same contract form as the ทำสัญญา step ----------
// The dialog had a short form (no PO, pay mode, guarantee details, files, quantities). Now it keeps only what picks the case
// (รายการจัดซื้อ, คู่สัญญา, คณะกรรมการตรวจรับ) and shows the full form of kxContractView below it, for a draft contract.
// On submit the older create runs first (fed from the full form), then the full form is saved to the new contract with kxSave,
// so both places give the same contract.
let CT98 = null; // the draft contract of the dialog: { id: "__new", cs, ... }
function ct98Draft(cs) { if (CT98 && CT98.cs === cs.id) return CT98; const rq = famReq(cs.reqn), days = rq && rq.detail && rq.detail.days > 0 ? rq.detail.days : 120;
  CT98 = { id: "__new", cs: cs.id, plan: cs.plan, vendor: cs.award.winner, no: `CT-70/${String(S.contracts.length + 1).padStart(3, "0")}`, signed: TODAY, amount: cs.award.price, egp7Proj: cs.egp7Proj || "", phases: [] };
  const x = kxOf(CT98); Object.assign(x, { days, start: TODAY, fine: Math.max(100, Math.round(cs.award.price * 0.001)), nPhases: 1 }); return CT98; }
{ const base = PROC.conCreate; PROC.conCreate = function () { let h = base(); if (!m88On() || !h.includes('id="ct-dlg"')) return h;
  const id = (h.match(/<select id="ct-req">[\s\S]*?<option value="([^"]+)" selected/) || h.match(/<select id="ct-req"><option value="([^"]+)"/) || [])[1], cs = id && caseOf(id); if (!cs) return h;
  const v = kxContractView(ct98Draft(cs)), a = v.indexOf('<form data-cx="__new"'), b = v.indexOf("</form>", a); if (a < 0 || b < 0) return h;
  let form = v.slice(a, b + 7).replace(/<button class="btn primary" type="submit">บันทึกสัญญา<\/button>/, `<button class="btn primary" type="submit">สร้างสัญญา</button><button class="btn ghost" type="button" data-ct98x>ยกเลิก (ยังไม่ทำสัญญา)</button>`).replace(/<span class="sub">ยังขาด:[^<]*<\/span>/, "");
  form = form.replace('<form data-cx="__new"', '<form data-cx="__new" id="ct98-form"');
  // hide the short form's own fields and buttons; keep the case, the supplier and the committee
  h = h.replace('<div class="inline-form">', '<div class="inline-form ct98-short">').replace(/<div class="row"><button class="btn primary" type="submit">สร้างสัญญา<\/button>/, '<div class="row" style="display:none"><button class="btn primary" type="submit">สร้างสัญญา</button>');
  h = h.replace("</form></dialog>", `</form><div style="padding:0 20px 18px"><h3 style="margin:4px 0 8px;font-size:15px">รายละเอียดสัญญา</h3><div class="sub" style="margin:0 0 8px">ชุดเดียวกับขั้นทำสัญญา · กรอกต่อหรือแก้ภายหลังได้ที่แท็บสัญญาและสัญญาแก้ไข</div>${form}</div></dialog>`);
  return `<style>.ct98-short>.f:not(:has(#ct-req)):not(:has(#ct-vendor)){display:none}#ct-dlg{max-width:min(1100px,96vw)}#ct98-form{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px 14px;align-items:end}#ct98-form>[style*="100%"],#ct98-form>.cx-g{grid-column:1/-1}#ct98-form .f input,#ct98-form .f select{width:100%}#ct98-form>.row{grid-column:1/-1}@media(max-width:800px){#ct98-form{grid-template-columns:1fr 1fr}}</style>` + h; }; }
document.addEventListener("click", e => { const t = e.target && e.target.closest ? e.target.closest("[data-ct98x]") : null; if (t) { const c = document.getElementById("ct-cancel"); if (c) c.click(); } });
document.addEventListener("submit", e => { const f = e.target; if (!f || !f.matches || !f.matches('form[data-cx="__new"]')) return; e.preventDefault(); e.stopImmediatePropagation();
  const d = new FormData(f), g = n => String(d.get(n) == null ? "" : d.get(n)).trim(), set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
  set("ct-amt", g("amount")); set("ct-no", g("no")); set("ct-date", g("date")); set("ct-days", g("days")); set("ct-start", g("start")); set("ct-fine", g("fine")); set("ct-ph", g("nPhases") || "1"); set("ct-proj", g("projNo")); set("ct-ctl", g("ctlNo"));
  set("ct-adv", d.get("advHas") === "1" ? g("advPct") || "0" : "0"); const gk = d.get("gkind"); if (gk) { const r = document.querySelector(`input[name="ct-gk"][value="${gk}"]`); if (r) r.checked = true; }
  const v = {}; KX_F.forEach(n => { if (d.has(n)) v[n] = g(n); }); if (d.has("advHas")) v.advHas = d.get("advHas") === "1"; if (d.has("advPct")) v.advPct = g("advPct");
  if (gk) { v.gkind = gk; const box = f.querySelector(`.cx-g[data-gk="${gk}"]`); if (box) box.querySelectorAll("[name]").forEach(el => { if (el.type !== "file") v[el.name] = el.value.trim(); }); }
  const files = kxFiles(d, ["contract", "party", "boq"]); { const gf = f.querySelector(`.cx-g[data-gk="bg"] input[type=file]`); if (gk === "bg" && gf && gf.files[0]) files.guar = gf.files[0]; }
  const n88 = {}; if (d.has("po")) n88.po = g("po"); if (d.get("payMode")) n88.payMode = g("payMode"); if (d.has("dedPct")) n88.dedPct = g("dedPct");
  const before = S.contracts.length, cf = document.getElementById("ct-form"); if (!cf || !cf.onsubmit) return; cf.onsubmit({ preventDefault() {} }); if (S.contracts.length === before) return;
  const c = S.contracts[S.contracts.length - 1]; KX88_IN = n88; const m = kxSave(c, v, files); KX88_IN = null; CT98 = null; commit(); route(); if (m) toast("สร้างสัญญาแล้ว แต่รายละเอียดบางส่วนยังไม่ถูกบันทึก: " + m); }, true);
