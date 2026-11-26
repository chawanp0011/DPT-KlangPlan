// ---------- P99: สัญญางบประมาณ, filters on the list (asked for: "สัญญางบประมาณ ไม่มีตัวกรอง") ----------
// Search (name, code, contract no., supplier), สำนัก/กอง, สถานะ (grouped from mmState), สัญญา (มี / ยังไม่มี); counts follow the filter.
const MM99 = { q: "", unit: "", st: "", con: "" };
const MM99_ST = [["wait", "รอกองแผนงานนำส่ง"], ["proc", "อยู่ระหว่างจัดซื้อจัดจ้าง"], ["signed", "ลงนามสัญญา / ส่งมอบงาน"], ["pay", "อยู่ระหว่างเบิกจ่าย"], ["close", "รอปิด / ปิดโครงการ"]];
function mm99Grp(s) { const t = s[0]; if (/^รอกองแผนงานนำส่ง/.test(t)) return "wait"; if (/ปิดโครงการ/.test(t)) return "close"; if (/^รอ(ผู้ตรวจสอบ|การบัญชี|การเงิน)/.test(t)) return "pay"; if (/ลงนามสัญญา|ส่งมอบ/.test(t)) return "signed"; return "proc"; }
{ const base = PROC.conList; PROC.conList = function () { if (BI_OPEN) return base(); const all = prDtRows(BI.fy, false), q = MM99.q.trim().toLowerCase();
  const units = [...new Set(all.map(r => r.unit))].sort((a, b) => a.localeCompare(b, "th")), info = all.map(r => ({ r, s: mmState(r) }));
  const rows = info.filter(({ r, s }) => (!MM99.unit || r.unit === MM99.unit) && (!MM99.st || mm99Grp(s) === MM99.st) && (!MM99.con || (MM99.con === "y") === !!r.k)
    && (!q || `${r.id} ${r.name} ${r.code || ""} ${r.unit} ${r.k ? r.k.no + " " + tx(r.k.vendor) : ""}`.toLowerCase().includes(q)));
  const sel = (k, opts, lab) => `<div class="f"><label>${lab}</label><select data-mm99="${k}"><option value="">ทั้งหมด</option>${opts.map(([v, t]) => `<option value="${esc(v)}" ${MM99[k] === v ? "selected" : ""}>${esc(t)}</option>`).join("")}</select></div>`;
  const on = MM99.q || MM99.unit || MM99.st || MM99.con;
  const bar = `<div class="mm99-bar"><div class="f" style="flex:2 1 260px"><label>ค้นหา</label><input type="search" data-mm99q placeholder="ชื่อรายการ รหัส เลขที่สัญญา คู่สัญญา" value="${esc(MM99.q)}"></div>
    ${sel("unit", units.map(u => [u, u]), "สำนัก/กอง")}${sel("st", MM99_ST, "สถานะ")}${sel("con", [["y", "มีสัญญาแล้ว"], ["n", "ยังไม่มีสัญญา"]], "สัญญา")}
    ${on ? `<button class="btn ghost" type="button" data-mm99x>ล้างตัวกรอง</button>` : ""}</div>`;
  let h = base(); const a = h.indexOf("<tbody>"), b = h.indexOf("</tbody>");
  if (a < 0 || b < 0) return h.replace("</header>", `</header>${bar}`);
  // rebuild the body from the rows of the base table that pass the filter (the base draws every row in prDtRows order)
  const trs = h.slice(a + 7, b).split(/(?=<tr>)/).filter(Boolean), keep = new Set(rows.map(x => x.r.id)), body = trs.filter((t, i) => all[i] && keep.has(all[i].id)).join("");
  h = h.slice(0, a + 7) + (body || `<tr><td colspan="7" class="sub" style="text-align:center;padding:18px">ไม่พบรายการตามตัวกรอง</td></tr>`) + h.slice(b);
  h = h.replace(/<span class="sub">\d+ รายการ · มีสัญญา \d+<\/span><\/header>/, `<span class="sub">แสดง ${rows.length} จาก ${all.length} รายการ · มีสัญญา ${rows.filter(x => x.r.k).length}</span></header>${bar}`);
  return `<style>.mm99-bar{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end;padding:12px 16px;border-bottom:1px solid var(--line)}.mm99-bar .f{display:flex;flex-direction:column;gap:3px;flex:1 1 170px;min-width:0}.mm99-bar input,.mm99-bar select{width:100%}</style>` + h; }; }
document.addEventListener("change", e => { const t = e.target; if (t && t.matches && t.matches("[data-mm99]")) { MM99[t.dataset.mm99] = t.value; route(); } });
document.addEventListener("input", e => { const t = e.target; if (!t || !t.matches || !t.matches("[data-mm99q]")) return; MM99.q = t.value; clearTimeout(MM99.tm);
  MM99.tm = setTimeout(() => { route(); const i = document.querySelector("[data-mm99q]"); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 250); });
document.addEventListener("click", e => { const t = e.target && e.target.closest ? e.target.closest("[data-mm99x]") : null; if (t) { Object.assign(MM99, { q: "", unit: "", st: "", con: "" }); route(); } });
