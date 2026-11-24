// Fisko-KlangFinance, procurement round P23 (16 Nov 2569): contract management can ADD committees to a contract ("บริหารสัญญา สามารถเพิ่มกรรมการตรวจรับ
// หรือกรรมการชุดอื่นๆ เพิ่มเติมได้").
// Before, a contract held ONE committee, c.cm (its acceptance committee), and the only action was "change" (replace) it, blocked after a signature.
// Now the contract page, under that committee, has a block of ADDITIONAL committees: c.cms = [committee id, ...], taken from the committees of the case
// in the committee register (file 98zb), of ANY kind (a second acceptance committee, supervision, inspection, ...). Procurement adds and removes them.
//   - an additional committee of the kind "accept" (acceptance): its user members join c.inspectors, so they can sign the acceptance of the phases too.
//     The number of signatures a phase needs (ph.need) is NOT changed (the primary committee's rule stays), and a member who has signed a phase can't be
//     taken out by removing the committee;
//   - a committee of another kind is attached to the contract and shown with its members; it takes no part in the signing;
//   - a committee that is already the contract's own acceptance committee, or already added, is not offered again.
// The committee itself is still made on the case page (button to the case) with its order, members and documents, as before.
const conCmExtra = c => (c.cms || []).map(id => cmById(id)).filter(Boolean);
const conCmCan = c => !!c && isProcRole();
const conCmOptions = c => { const cs = conCase(c); return cs ? (S.cmReg || []).filter(cm => cm.case === cs.id && !cm.retired && cm.id !== c.cm && !(c.cms || []).includes(cm.id)) : []; };
const conCmInsp = c => { const ids = new Set(c.cm && cmById(c.cm) ? cmUserIds(cmById(c.cm)) : []); conCmExtra(c).filter(cm => cmKindOf(cm) === "accept").forEach(cm => cmUserIds(cm).forEach(u => ids.add(u))); (c.inspectors || []).forEach(u => { if ((c.phases || []).some(ph => (ph.signs || []).some(s => s.by === u))) ids.add(u); }); return [...ids]; };
function conCmBlock(c) {
  const ex = conCmExtra(c), can = conCmCan(c), opts = conCmOptions(c), cs = conCase(c);
  return `<div class="body" id="con-cms-${c.id}" style="padding-top:0"><span class="sub">${L("คณะกรรมการอื่น ๆ ที่เพิ่ม", "Additional committees")}:</span>
    ${ex.length ? `<ul class="plain" style="margin:4px 0">${ex.map(cm => `<li class="row" style="flex-wrap:wrap;gap:6px"><span class="mono sub">${esc(cm.order || cm.id)}</span> ${tag(esc(cmTName(cm)), cmKindOf(cm) === "accept" ? "p-info" : "p-mute")} <span>${cmMembers(cm.id).map(cmLine).join(", ") || "–"}</span>${can ? `<button class="btn ghost" type="button" data-cmdel="${c.id}|${cm.id}" aria-label="${L("เอาคณะนี้ออกจากสัญญา", "Take this committee off the contract")}">×</button>` : ""}</li>`).join("")}</ul>` : `<span class="sub">${L("ยังไม่มี", "None yet")}</span>`}
    ${can ? `<div class="row" style="margin-top:6px;flex-wrap:wrap"><select id="cmx-${c.id}" aria-label="${L("คณะกรรมการที่จะเพิ่ม", "Committee to add")}" ${opts.length ? "" : "disabled"}>${opts.map(cm => `<option value="${cm.id}">${esc(cm.order || cm.id)} · ${esc(cmTName(cm))}${cmKindOf(cm) === "accept" ? ` (${L("ตรวจรับ", "acceptance")})` : ""}</option>`).join("")}</select>
      <button class="btn" type="button" data-cmadd="${c.id}" ${opts.length ? "" : "disabled"}>${L("เพิ่มคณะกรรมการ", "Add the committee")}</button>${cs ? `<button class="btn ghost" type="button" data-copen2="${cs.id}">${L("ไปสร้างคณะกรรมการที่รายการจัดซื้อ", "Make a committee on the case")}</button>` : ""}</div>
      ${opts.length ? "" : `<div class="sub">${L("ไม่มีคณะอื่นของรายการจัดซื้อนี้ที่จะเพิ่ม สร้างคณะใหม่ที่รายการจัดซื้อก่อน", "No other committee of this case to add; make one on the case first")}</div>`}` : ""}</div>`;
}
{
  const done = msg => { commit(); route(); toast(msg); };
  document.addEventListener("click", e => {
    const add = e.target.closest && e.target.closest("[data-cmadd]"), del = e.target.closest && e.target.closest("[data-cmdel]");
    if (add) {
      const c = famCon(add.dataset.cmadd), sel = c && document.getElementById("cmx-" + c.id); if (!c || !sel || !conCmCan(c)) return; const cm = cmById(sel.value);
      if (!cm || !conCmOptions(c).includes(cm)) { toast(L("เพิ่มคณะนี้ไม่ได้", "That committee can't be added")); return; }
      (c.cms = c.cms || []).push(cm.id); if (cmKindOf(cm) === "accept") c.inspectors = conCmInsp(c);
      audit(["เพิ่มคณะกรรมการในสัญญา", "Added a committee to the contract"], `${c.id} ${cm.id}`); done(L("เพิ่มคณะกรรมการแล้ว", "Committee added")); return;
    }
    if (del) {
      const [cid, id] = del.dataset.cmdel.split("|"), c = famCon(cid), cm = cmById(id); if (!c || !cm || !conCmCan(c) || !(c.cms || []).includes(id)) return;
      const keep = new Set(c.cm && cmById(c.cm) ? cmUserIds(cmById(c.cm)) : []); conCmExtra(c).filter(x => x !== cm && cmKindOf(x) === "accept").forEach(x => cmUserIds(x).forEach(u => keep.add(u)));
      const signed = cmKindOf(cm) === "accept" ? cmUserIds(cm).filter(u => !keep.has(u) && (c.phases || []).some(ph => (ph.signs || []).some(s => s.by === u))) : [];
      if (signed.length) { toast(L("เอาคณะนี้ออกไม่ได้ มีกรรมการของคณะนี้ลงนามตรวจรับไปแล้ว", "Can't take it off: a member of it has signed an acceptance")); return; }
      c.cms = c.cms.filter(x => x !== id); if (cmKindOf(cm) === "accept") c.inspectors = conCmInsp(c);
      audit(["เอาคณะกรรมการออกจากสัญญา", "Took a committee off the contract"], `${c.id} ${id}`); done(L("เอาคณะกรรมการออกแล้ว", "Committee removed"));
    }
  });
}
// P29 (17 Nov 2569), at the user's word ("สัญญาและงวดงาน เพิ่มแท็บคณะกรรมการ สามารถเพิ่มคณะกรรมการขึ้นมาทีหลังได้"): the committees have a TAB of their own on the contract page, after the phases:
// the acceptance committee of the contract, the additional committees of the contract (the block above, which used to sit at the head of every tab), and the committees of the case with
// everything the case page does (make a committee of any type with its order file, add or take off members, documents), so a committee can be made after the contract is signed.
function conCmTab(c) {
  const cs = conCase(c), main = c.cm && cmById(c.cm);
  return `<div class="body"><b style="font-weight:600">${L("คณะกรรมการตรวจรับของสัญญานี้", "Acceptance committee of this contract")}</b>
    <div style="margin-top:4px">${main ? `${esc(main.order)} · ${fdate(main.date)} · ${cmMembers(main.id).map(cmLine).join(", ") || "–"}${cmLocked(main) ? " " + tag(L("มีการลงนามตรวจรับแล้ว", "acceptance signed"), "p-mute") : ""}` : ((c.inspectors || []).map(id => esc(userName(id))).join(", ") || "–")}</div></div>
    ${conCmBlock(c)}
    ${cs ? `<div class="body" style="padding-top:8px;border-top:1px solid var(--line)"><b style="font-weight:600">${L("คณะกรรมการของรายการจัดซื้อ", "Committees of the case")} ${esc(cs.id)}</b> <span class="sub">${L("ตั้งคณะใหม่หรือเพิ่มสมาชิกได้ภายหลัง จนกว่าจะมีการลงนามตรวจรับ", "make a new committee or add members later, until an acceptance is signed")}</span></div><div class="body" style="padding-top:0;display:flex;flex-direction:column;gap:10px">${cmCaseSection(cs)}</div>` : ""}`;
}
CON_TABS.splice(1, 0, ["committees", ["คณะกรรมการ", "Committees"]]);
{ const cb = conTabBody; conTabBody = (c, k) => (k === "committees" ? conCmTab(c) : cb(c, k)); }
// the sample contracts start with no additional committee
Object.keys(SEEDS).forEach(k => { const prev = SEEDS[k].seed; SEEDS[k].seed = () => { const s = prev(); (s.contracts || []).forEach(c => { if (!c.cms) c.cms = []; }); return s; }; });
