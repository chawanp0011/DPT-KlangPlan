// ---------- P99: the Planning dialog of a budget item (รายละเอียด / มอบหมาย) ----------
// Asked for: each field says clearly what it is; ผลผลิต/โครงการ from the file is matched to the register by name, and a name the register
// lacks is added to it (marked as from the import, editable in the register); every imported value can be checked and edited by
// Planning until the item is sent to the units; the fields of the file are all there (GFMIS, e-bud, แผนงาน/ภารกิจ, ประเภท, งบรายจ่าย,
// จำนวน/หน่วยนับ, วงเงิน, หน่วยงานในไฟล์); the toggle buttons are only as wide as their text.

// 1. ผลผลิต/โครงการ: match the imported name to the register; add what is missing
const p99Norm = s => String(s || "").replace(/\s+/g, "").replace(/[()（）]/g, "").toLowerCase();
function p99MapProds(rows) { if (!S.structure) return 0; let added = 0;
  rows.forEach(r => { const p = (r.pl = r.pl || {}); if (p.prodId || p.prodMapped || !r.prod) return; const fy = biFy(r), st = S.structure[fy] || S.structure[FORM_FY]; if (!st) return;
    let o = st.find(n => n.lvl === "output" && !n.retired && p99Norm(tx(n.name)) === p99Norm(r.prod));
    if (!o) { const par = st.find(n => n.lvl === "output") || {}, k = st.filter(n => n.imp99).length + 1; o = { id: `IMP-${fy}-${k}`, lvl: "output", code: `IMP.${k}`, parent: par.parent || "", name: [r.prod, r.prod], imp99: true }; st.push(o); added++; }
    p.prodId = o.id; p.prod = tx(o.name); p.prodMapped = true; });
  return added; }
{ const base = biView; biView = function () { try { const rows = biData().rows || []; if (p99MapProds(rows)) commit(); } catch (e) { /* the register may not be loaded yet */ } return base(); }; }

// 2. the dialog: the imported values, editable until sent; clearer labels and hints
const P99_KIND = ["งบลงทุน", "งบดำเนินงาน", "งบรายจ่ายอื่น", "งบเงินอุดหนุน"];
function p99Imported(r) { const ro = r.sent ? "disabled" : "", f = (name, label, val, hint, extra) => `<div class="f ${extra || ""}"><label>${label}</label><input type="text" name="${name}" value="${esc(val == null ? "" : val)}" ${ro}>${hint ? `<div class="p99-h">${hint}</div>` : ""}</div>`;
  const types = Object.keys(BI_TYPES), kinds = [...new Set(P99_KIND.concat(r.kind ? [r.kind] : []))];
  return `<section><h3>ข้อมูลรายการที่นำเข้าจากไฟล์</h3><div class="sub">${r.sent ? "นำส่งสำนัก/กองแล้ว ข้อมูลส่วนนี้แก้ไม่ได้" : "ตรวจและแก้ให้ถูกต้องก่อนนำส่งสำนัก/กอง"}</div><div class="p95-grid p99-g3">
    ${f("name", "ชื่อรายการ *", r.name, "ชื่อรายการตามเอกสารงบประมาณ", "p95-wide")}
    ${f("code", "รหัสงบประมาณ (GFMIS)", r.code, "รหัส 15 หลักในระบบ GFMIS")}
    ${f("ebud", "รหัส e-bud", r.ebud, "รหัสรายการในระบบ e-Budgeting ของสำนักงบประมาณ")}
    <div class="f"><label>หน่วยงานที่ระบุในไฟล์</label><input type="text" name="unitName" value="${esc(r.unitName || "")}" ${ro}><div class="p99-h">ใช้จับคู่เป็นหน่วยงานรับผิดชอบเมื่อยังไม่มอบหมาย</div></div>
    <div class="f"><label>ประเภทรายการ *</label><select name="type" ${ro}>${types.map(t => `<option ${r.type === t ? "selected" : ""}>${t}</option>`).join("")}${r.type && !types.includes(r.type) ? `<option selected>${esc(r.type)}</option>` : ""}</select><div class="p99-h">ใช้แยกแผ่นงานในแบบฟอร์มติดตาม</div></div>
    <div class="f"><label>งบรายจ่าย *</label><select name="kind" ${ro}>${kinds.map(t => `<option ${r.kind === t ? "selected" : ""}>${t}</option>`).join("")}</select><div class="p99-h">ระบบเลือกให้ตามประเภท แก้ได้</div></div>
    <div class="f"><label>วงเงิน (บาท) *</label><input type="number" name="amount" min="1" step="0.01" value="${esc(r.amount)}" ${ro}><div class="p99-h">งบประมาณของรายการในปี ${biFy(r)}</div></div>
    <div class="f"><label>จำนวน / หน่วยนับ</label><div class="p99-qu"><input type="number" name="qty" min="0" step="any" value="${esc(r.qty || "")}" placeholder="จำนวน" ${ro}><input type="text" name="uname" value="${esc(r.uname || "")}" placeholder="เช่น เครื่อง แห่ง" ${ro}></div><div class="p99-h">ปริมาณตามรายการ (ถ้ามี)</div></div>
        ${f("prog", "แผนงาน / ภารกิจ", r.prog, "ตามคอลัมน์ภารกิจในไฟล์", "p99-span2")}
</div></section>`; }
{ const base = p95Dialog; p95Dialog = function (r) { let h = base(r);
  // the header: what the two codes are
  h = h.replace(`<div class="sub mono">${esc(r.id)} · ${esc(r.code || "")}</div>`, `<div class="p99-ids"><span>เลขที่รายการในระบบ <b class="mono">${esc(r.id)}</b></span><span>รหัส GFMIS <b class="mono">${esc(r.code || "—")}</b></span><span>รหัส e-bud <b class="mono">${esc(r.ebud || "—")}</b></span></div>`);
  h = h.replace('<div class="p95-body">', '<div class="p95-body">' + p99Imported(r));
  // hints for the Planning fields
  h = h.replace('<label>ที่มา</label>', '<label>ที่มาของงบประมาณ</label>').replace(/(<label>ที่มาของงบประมาณ<\/label><div class="p95-seg">[\s\S]*?<\/div>)/, '$1<div class="p99-h">ตาม พ.ร.บ. = ได้รับตาม พ.ร.บ.งบประมาณ · โอนเปลี่ยนแปลง = โอน/เปลี่ยนแปลงระหว่างปี</div>');
  h = h.replace(/(<label>ลักษณะงบประมาณ<\/label><div class="p95-seg">[\s\S]*?<\/div>)/, '$1<div class="p99-h">ปีเดียว = ใช้ในปีงบประมาณนี้ · ผูกพัน = ผูกพันงบหลายปี</div>');
  h = h.replace('<label>ผลผลิต/โครงการ <span class="sub">(จากทะเบียน)</span></label>', '<label>ผลผลิต/โครงการ <span class="sub">(จากทะเบียนผลผลิต/โครงการ)</span></label>');
  h = h.replace(/(<select name="prodId">[\s\S]*?<\/select>)/, `$1<div class="p99-h">ระบบจับคู่จากชื่อในไฟล์${r.prod ? ` ("${esc(r.prod)}")` : ""} · ชื่อที่ทะเบียนยังไม่มีถูกเพิ่มเป็นรายการใหม่ (ทำเครื่องหมาย "นำเข้า") แก้ชื่อหรือรหัสได้ที่ทะเบียน RG1</div>`);
  h = h.replace(/(<option value="[^"]*"[^>]*>)([^<]*)(<\/option>)/g, (m, a, b, c) => { const id = (a.match(/value="([^"]*)"/) || [])[1]; return id && /^IMP-/.test(id) ? `${a}${b} (นำเข้า)${c}` : m; });
  // the province: guessed from the name when empty, with a hint
  const guess = !(r.pl && r.pl.prov) && (String(r.name).match(/จังหวัด\s*([^\s(]+)/) || [])[1];
  if (guess) h = h.replace(new RegExp(`<option>${guess.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</option>`), `<option selected>${guess}</option>`);
  h = h.replace(/(<select name="prov">[\s\S]*?<\/select>)/, `$1<div class="p99-h">จังหวัดที่ดำเนินงาน${guess ? ` · ระบบเลือกจากชื่อรายการ (${esc(guess)})` : ""}</div>`);
  h = h.replace('<label>ปีเริ่มต้น (พ.ศ.)</label>', '<label>ปีงบประมาณที่เริ่ม (พ.ศ.)</label>').replace('<label>จำนวนปี</label>', '<label>จำนวนปีที่ผูกพัน</label>');
  h = h.replace('<h3>มอบหมายสำนัก/กองและงบประมาณ</h3><div class="sub">', '<h3>มอบหมายสำนัก/กองและงบประมาณ</h3><div class="sub">เลือกหน่วยงานและวงเงิน (บาท) ที่แต่ละหน่วยรับไปดำเนินการ · ');
  h = h.replace('<h3>ข้อมูลตามแบบฟอร์มติดตาม (ส่วนของกองแผนงาน)</h3>', '<h3>ข้อมูลตามแบบฟอร์มติดตาม (ส่วนของกองแผนงาน)</h3><div class="sub">ค่าเหล่านี้ไปอยู่ในคอลัมน์ของกองแผนงานในไฟล์ติดตามความก้าวหน้า</div>');
  return P99_CSS + h; }; }
const P99_CSS = `<style>.p99-h{font-size:11.5px;color:var(--muted,#64748b);margin-top:3px;line-height:1.4}.p95-grid .f{display:flex;flex-direction:column;align-items:flex-start}.p95-grid .f>input,.p95-grid .f>select{width:100%}
.p95-seg{width:max-content!important;max-width:100%}.p95-seg span{padding:6px 12px!important;white-space:nowrap}.p99-ids{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:12px;color:var(--muted,#64748b)}.p99-ids b{color:var(--ink,#0f172a);font-weight:600}
.p99-g3{grid-template-columns:repeat(3,minmax(0,1fr))!important}.p99-span2{grid-column:span 2}@media(max-width:700px){.p99-g3{grid-template-columns:1fr!important}.p99-span2{grid-column:auto}}.p99-qu{display:grid;grid-template-columns:1fr 1fr;gap:6px;width:100%}.p95-dlg footer .btn{min-width:0;padding-left:16px;padding-right:16px}.p95-u .btn.ghost{width:36px;padding:0}</style>`;

// 3. save: the imported values first (only before sending), then the Planning values (p95Save)
{ const base = p95Save; p95Save = function (id, v) { const r = biData().rows.find(x => x.id === id); if (!r) return base(id, v);
  if (!r.sent && "name" in v) { const name = String(v.name || "").trim(), amt = Number(v.amount); if (!name) return "ระบุชื่อรายการ"; if (!(amt > 0)) return "วงเงินต้องมากกว่า 0";
    const keep = { name: r.name, code: r.code, ebud: r.ebud, type: r.type, kind: r.kind, prog: r.prog, amount: r.amount, qty: r.qty, uname: r.uname, unitName: r.unitName };
    Object.assign(r, { name, code: String(v.code || "").trim(), ebud: String(v.ebud || "").trim(), type: v.type || r.type, kind: v.kind || BI_TYPES[v.type] || r.kind, prog: String(v.prog || "").trim(), amount: Math.round(amt * 100) / 100, qty: v.qty === "" ? 0 : Number(v.qty) || 0, uname: String(v.uname || "").trim(), unitName: String(v.unitName || "").trim() });
    const m = base(id, v); if (m) { Object.assign(r, keep); return m; } if (JSON.stringify(keep) !== JSON.stringify({ name: r.name, code: r.code, ebud: r.ebud, type: r.type, kind: r.kind, prog: r.prog, amount: r.amount, qty: r.qty, uname: r.uname, unitName: r.unitName })) audit(["แก้ข้อมูลรายการงบประมาณที่นำเข้า", "Planning corrected the imported item"], id); return ""; }
  return base(id, v); }; }
// the kind follows the type when the type changes
document.addEventListener("change", e => { const t = e.target; if (!t || !t.matches || !t.matches('form[data-pl95] select[name="type"]')) return; const k = t.form.querySelector('select[name="kind"]'); if (k && BI_TYPES[t.value]) k.value = BI_TYPES[t.value]; });
