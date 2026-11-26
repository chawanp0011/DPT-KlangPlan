// KlangFinance, round P48 (23 Nov 2569): in the payment block the documents column shows how many documents there are; a click opens
// them in a window: the list on the left, a preview on the right, and a download for each. The system holds the documents' data (kind,
// number, date, phase), not the scanned files, so the preview and the download are a document drawn from that data, marked as such.
function pdDocHtml(c, v, d) {
  const k = tx(PAY_DOCK[d.k] || [d.k, d.k]), p = famPlan(c.plan);
  return `<!doctype html><html lang="th"><head><meta charset="utf-8"><title>${esc(k)} ${esc(d.no || "")}</title><style>body{font-family:"Sarabun","TH Sarabun New",sans-serif;margin:32px;color:#222;line-height:1.6}h1{font-size:22px;margin:0 0 4px}.mock{color:#a33;font-size:12px;border:1px dashed #a33;padding:4px 8px;display:inline-block;margin-bottom:16px}table{border-collapse:collapse;width:100%;margin-top:12px}td{border:1px solid #ccc;padding:6px 10px}td:first-child{width:34%;background:#f5f6f8}</style></head><body>
    <div class="mock">เอกสารจำลองจากข้อมูลในระบบ (ข้อมูลตัวอย่าง ไม่ใช่ไฟล์สแกนจริง)</div><h1>${esc(k)}</h1><div>${esc(tx(p.name))}</div>
    <table><tr><td>เลขที่เอกสาร</td><td>${esc(d.no || "—")}</td></tr><tr><td>ลงวันที่</td><td>${d.date ? fdate(d.date) : "—"}</td></tr><tr><td>สัญญา</td><td>${esc(c.id)} · ${esc(c.no || "")}</td></tr><tr><td>ผู้รับจ้าง</td><td>${esc(tx(c.vendor))}</td></tr>
    <tr><td>รายการเบิกจ่าย</td><td>${esc(v.id)} · ครั้งที่ ${payTimeNo(c, v)}</td></tr>${d.ph ? `<tr><td>งวด</td><td>${esc(String(d.ph))}</td></tr>` : ""}<tr><td>ยอดสุทธิของครั้งนี้</td><td>${fmt(payNetOf(v))} บาท</td></tr><tr><td>ที่มา</td><td>${d.auto ? "ระบบแนบอัตโนมัติ" : "เจ้าหน้าที่เพิ่มเอง"}</td></tr></table></body></html>`;
}
const pdName = d => `${tx(PAY_DOCK[d.k] || [d.k, d.k])}${d.no ? " " + d.no : ""}`.replace(/[\\/:*?"<>|]+/g, "-");
let PD = null; // { cid, vid, i }
function pdOpen(cid, vid, i) {
  const c = famCon(cid), v = (S.vouchers || []).find(x => x.id === vid); if (!c || !v) return; const docs = payDocsOf(c, v), open = payEdit() && !["paid", "cancelled", "rejected"].includes(v.state);
  PD = { cid, vid, i: Math.min(i || 0, Math.max(0, docs.length - 1)) };
  let dlg = document.getElementById("pd-dlg"); if (!dlg) { dlg = document.createElement("dialog"); dlg.id = "pd-dlg"; dlg.style.cssText = "width:min(1100px,96vw);max-height:92vh;padding:0;border:1px solid var(--line);border-radius:12px;background:var(--bg,#fff);color:inherit"; document.body.appendChild(dlg); }
  const cur = docs[PD.i];
  dlg.innerHTML = `<div style="display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid var(--line)"><b>เอกสารของ ${esc(v.id)} · ครั้งที่ ${payTimeNo(c, v)}</b><span class="sub">${docs.length} เอกสาร</span><span style="flex:1"></span><button class="btn ghost" type="button" data-pdclose>ปิด</button></div>
    <div style="display:flex;flex-wrap:wrap;min-height:60vh">
      <div style="flex:1 1 280px;max-width:380px;border-right:1px solid var(--line);overflow:auto;max-height:78vh">${docs.length ? docs.map((d, j) => `<div class="pd-item" style="padding:8px 12px;border-bottom:1px solid var(--line);${j === PD.i ? "background:var(--info-bg,#eef3ff)" : ""}">
        <button type="button" data-pdsel="${j}" style="all:unset;cursor:pointer;display:block;width:100%"><b>${esc(tx(PAY_DOCK[d.k] || [d.k, d.k]))}</b>${d.auto ? ` <span class="pill p-mute">อัตโนมัติ</span>` : ""}<div class="sub">${esc(d.no || "—")}${d.date ? " · " + fdate(d.date) : ""}${d.ph ? " · งวด " + esc(String(d.ph)) : ""}</div></button>
        <div class="row" style="gap:4px;margin-top:4px"><button class="btn ghost" type="button" data-pdsel="${j}">ดูตัวอย่าง</button><button class="btn ghost" type="button" data-pddl="${j}">ดาวน์โหลด</button>${open ? `<button class="btn ghost" type="button" data-paydocdel="${c.id}|${v.id}|${j}" data-pdclosing aria-label="เอาเอกสารออก">× เอาออก</button>` : ""}</div></div>`).join("") : `<div class="sub" style="padding:12px">ยังไม่มีเอกสาร</div>`}
        ${docs.length ? `<div style="padding:10px 12px"><button class="btn" type="button" data-pddlall>ดาวน์โหลดทั้งหมด (${docs.length})</button></div>` : ""}</div>
      <div style="flex:2 1 420px;display:flex;flex-direction:column">${cur ? `<div class="row" style="padding:8px 12px;gap:8px"><b>${esc(pdName(cur))}</b><span style="flex:1"></span><button class="btn primary" type="button" data-pddl="${PD.i}">ดาวน์โหลด</button></div><iframe id="pd-prev" title="ตัวอย่างเอกสาร" style="flex:1;min-height:60vh;border:0;border-top:1px solid var(--line);background:#fff"></iframe>` : ""}</div></div>`;
  const fr = dlg.querySelector("#pd-prev"); if (fr) fr.srcdoc = pdDocHtml(c, v, cur);
  if (!dlg.open) dlg.showModal();
}
function pdDownload(c, v, d) { const b = new Blob([pdDocHtml(c, v, d)], { type: "text/html" }), a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = `${v.id}_${pdName(d)}.html`; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
document.addEventListener("click", e => { const t = e.target; if (!t || !t.closest) return;
  const o = t.closest("[data-paydocs]"); if (o) { const [cid, vid] = o.dataset.paydocs.split("|"); pdOpen(cid, vid, 0); return; }
  if (!PD || !t.closest("#pd-dlg")) return; const dlg = document.getElementById("pd-dlg"), c = famCon(PD.cid), v = (S.vouchers || []).find(x => x.id === PD.vid);
  if (t.closest("[data-pdclose]")) { dlg.close(); PD = null; return; }
  const s = t.closest("[data-pdsel]"); if (s) { pdOpen(PD.cid, PD.vid, Number(s.dataset.pdsel)); return; }
  const dl = t.closest("[data-pddl]"); if (dl) { pdDownload(c, v, payDocsOf(c, v)[Number(dl.dataset.pddl)]); return; }
  if (t.closest("[data-pddlall]")) { payDocsOf(c, v).forEach((d, j) => setTimeout(() => pdDownload(c, v, d), j * 300)); return; }
  if (t.closest("[data-pdclosing]")) { const k = { ...PD }; setTimeout(() => { if (document.getElementById("pd-dlg").open) pdOpen(k.cid, k.vid, Math.max(0, k.i - 1)); }, 50); } // after the removal, show the list again
});
