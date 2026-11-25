// Fisko-KlangFinance, round P89 (25 Nov 2569): the overview of ติดตามความก้าวหน้า as the department's summary sheet
// ("ภาพรวม สถานะการจัดซื้อจัดจ้าง ประจำปีงบประมาณ": rows รวมทั้งสิ้น / ส่วนกลาง / ส่วนภูมิภาค, then each type with its budget kind and
// central/regional; columns จำนวน, งบประมาณ, then each procurement stage with a count and an amount in million baht).
// The rows can be grouped by ประเภท (as the sheet), ผลผลิต/โครงการ, หน่วยงาน or ลักษณะงบประมาณ. Every number opens the list filtered on
// it; the list gets the filters ขั้นตอน and ส่วนกลาง/ส่วนภูมิภาค, so every level of the sheet can be filtered.
// The stage of an item comes from the dates of the follow-up form (the latest step done).

const OV89_ST = [["cancel", "ยกเลิกโครงการ/ ชะลอดำเนินการ"], ["tor", "ทบทวน TOR/ ออกแบบ"], ["tordone", "TOR/ออกแบบ แล้วเสร็จ"], ["ref", "ทบทวนราคากลาง"], ["refok", "อนุมัติ ราคากลาง"], ["draft", "ประกาศร่าง"], ["invite", "เชิญชวน"], ["bid", "เสนอราคา"], ["wait", "รอลงนาม ในสัญญา"], ["signed", "ลงนาม ในสัญญา"]];
const OV89_GRP = { type: ["ประเภท", "#f6d775"], prod: ["ผลผลิต/โครงการ", "#9fd8ef"], unit: ["หน่วยงาน", "#a7e0c9"], kind: ["ลักษณะงบประมาณ", "#d7b8c8"] };
const OV89 = { g: "type" };
const ov89Has = v => v !== "" && v != null && v !== 0;
function ov89Stage(r) { // r: a row of the follow-up form (72 columns)
  if (/ยกเลิก|ชะลอ/.test(String(r[59] || ""))) return "cancel"; if (ov89Has(r[45]) || ov89Has(r[46])) return "signed";
  if (ov89Has(r[41]) || ov89Has(r[42]) || ov89Has(r[43]) || ov89Has(r[44])) return "wait"; if (ov89Has(r[33]) || ov89Has(r[34])) return "bid";
  if (ov89Has(r[32])) return "invite"; if (ov89Has(r[31])) return "draft"; if (ov89Has(r[29])) return "refok"; if (ov89Has(r[28]) || ov89Has(r[24])) return "ref";
  if (ov89Has(r[25]) || ov89Has(r[23])) return "tordone"; return "tor"; }
const ov89StName = k => (OV89_ST.find(x => x[0] === k) || [k, k])[1].replace(/\s+/g, " ");
const ov89Area = r => (/จังหวัด|สยผจ|ภาค\s|ส่วนภูมิภาค/.test(`${r[7] || ""}`) ? "ส่วนภูมิภาค" : "ส่วนกลาง");
sptF.stage = ["ขั้นตอนจัดซื้อจัดจ้าง", r => ov89StName(ov89Stage(r))];
sptF.area = ["ส่วนกลาง/ส่วนภูมิภาค", ov89Area];
const ov89Key = { type: r => r[8] || "—", prod: r => m88Prod(r), unit: r => r[7] || "—", kind: r => r[9] || "—" };
const ov89Lv = g => [g, g === "kind" ? "type" : "kind", "area"];
function ov89Cells(rows, f, cls) { const n = rows.length, b = rows.reduce((s, r) => s + sptNum(r[11]), 0), m = v => fmt(v, 4), dash = `<td class="n sub">-</td><td class="n sub">-</td>`;
  return `<td class="n">${n ? sptLink(f, `<b>${fmt(n)}</b>`, "info") : "-"}</td><td class="n">${n ? m(b) : "-"}</td>${OV89_ST.map(([k]) => { const l = rows.filter(r => ov89Stage(r) === k); if (!l.length) return dash; return `<td class="n ${cls || ""}">${sptLink(Object.assign({}, f, { stage: ov89StName(k) }), fmt(l.length), "info")}</td><td class="n ${cls || ""}">${m(l.reduce((s, r) => s + sptNum(r[11]), 0))}</td>`; }).join("")}`; }
function ov89Table(rows) { const g = OV89.g, [k1, k2, k3] = ov89Lv(g), fk = k => (k === "area" ? "area" : k), grp = (l, k) => { const o = {}; l.forEach(r => { const v = k === "area" ? ov89Area(r) : ov89Key[k](r); (o[v] = o[v] || []).push(r); }); return Object.entries(o).sort((a, b) => b[1].length - a[1].length); };
  const head = `<tr><th rowspan="2" style="min-width:170px"></th><th rowspan="2" class="n">จำนวน</th><th rowspan="2" class="n">งบประมาณ</th>${OV89_ST.map(([, t]) => `<th colspan="2" class="ov89-h">${esc(t)}</th>`).join("")}</tr><tr>${OV89_ST.map(() => `<th class="n sub">รายการ</th><th class="n sub">ลบ.</th>`).join("")}</tr>`;
  const tr = (lab, l, f, st) => `<tr style="${st || ""}"><td>${lab}</td>${ov89Cells(l, f)}</tr>`;
  let body = tr("<b>รวมทั้งสิ้น</b>", rows, {}, "font-weight:600;background:var(--surface-2,rgba(0,0,0,.04))") + grp(rows, "area").map(([a, l]) => tr(`<b style="${a === "ส่วนภูมิภาค" ? "color:var(--bad)" : ""}">${esc(a)}</b>`, l, { area: a })).join("");
  grp(rows, k1).forEach(([v1, l1]) => { const f1 = { [fk(k1)]: v1 }; body += tr(`<b>${esc(v1)}</b>`, l1, f1, `background:${OV89_GRP[g][1]}33;border-top:2px solid ${OV89_GRP[g][1]}`);
    grp(l1, k2).forEach(([v2, l2]) => { const f2 = Object.assign({}, f1, { [fk(k2)]: v2 }); body += tr(`<span style="padding-left:12px;font-weight:600">${esc(v2)}</span>`, l2, f2);
      grp(l2, k3).forEach(([v3, l3]) => { body += tr(`<span style="padding-left:28px;${v3 === "ส่วนภูมิภาค" ? "color:var(--bad)" : ""}" class="sub">${esc(v3)}</span>`, l3, Object.assign({}, f2, { area: v3 })); }); }); });
  return `<div class="tbl-wrap"><table class="ov89-t" style="font-size:12.5px"><thead>${head}</thead><tbody>${body}</tbody></table></div>`; }
function ov89Panel(rows) { const B = rows.reduce((s, r) => s + sptNum(r[11]), 0);
  return `<style>.ov89-t th,.ov89-t td{border:1px solid var(--line);padding:4px 6px;white-space:nowrap}.ov89-t .ov89-h{text-align:center;background:var(--info-soft)}.ov89-t .pd-go{display:inline;width:auto}.ov89-t thead th{position:sticky;top:0;background:var(--surface)}</style>
  <section class="panel ov89"><header><div><h2 style="margin:0">ภาพรวม สถานะการจัดซื้อจัดจ้าง ประจำปีงบประมาณ พ.ศ. ${BI.fy}</h2><div class="sub">จำนวน ${fmt(rows.length)} รายการ เป็นเงิน ${fmt(B, 4)} ล้านบาท · หน่วย: ล้านบาท · คลิกตัวเลขเพื่อดูรายการ</div></div><span class="sp"></span>
    <div class="tabs" role="tablist" style="margin:0">${Object.entries(OV89_GRP).map(([k, [t]]) => `<button class="tab ${OV89.g === k ? "on" : ""}" type="button" data-ov89g="${k}">ตาม${t}</button>`).join("")}</div></header>
    <div class="body">${rows.length ? ov89Table(rows) : `<div class="sub">ไม่มีรายการ</div>`}</div></section>`; }
{ const base = sptOv; sptOv = function (rows) { return ov89Panel(rows) + base(rows); }; }
document.addEventListener("click", e => { const b = e.target && e.target.closest && e.target.closest("[data-ov89g]"); if (b) { OV89.g = b.dataset.ov89g; route(); } });
