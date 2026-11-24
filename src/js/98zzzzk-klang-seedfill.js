// Fisko-KlangFinance, round P81 (24 Nov 2569): the sample data made consistent with the new payment flow.
// The sample contracts kept their deliveries and payments in the older structure (k.phases, S.payreqs), while the contract page, the
// payment desks and the two dashboards read the new one (k.cx.dl). A contract opened at "เบิกจ่าย" or "ปิดการจัดซื้อแล้ว" showed no
// delivery and nothing paid. Here each sample contract gets its deliveries from its accepted phases: a phase with an approved payment
// is paid through the four desks (sent for payment -> voucher checked -> accounting -> finance), a phase with a payment not yet
// approved waits at the voucher checker, an accepted phase with no payment waits to be sent. A contract handed over is closed.
// Fictional data only (the users are the demo users of each role).
function kxSeedFill(s, k) {
  const x = k.cx; if (!x || x.seedFilled || (x.dl || []).length) return; x.seedFilled = true;
  const ph = (k.phases || []).filter(p => !p.cancelled), fin = ((s.users || []).find(u => u.role === "fin") || {}).id || "", day = t => String(t || "").slice(0, 10);
  const clamp = (d, lo) => { let v = day(d) || lo; if (lo && v < lo) v = lo; if (v > TODAY) v = TODAY; return v; };
  ph.forEach(p => { if (!p.recv || !p.recv.date) return; const amount = Number(p.okAmount || p.amount) || 0, acc = p.recv.date, pr = (s.payreqs || []).find(q => q.contract === k.id && q.phase === p.n && q.status !== "rejected");
    const d = { n: x.dl.length + 1, deliver: p.delivered || acc, accept: acc, amount, deduct: 0, pay: amount, status: "wait", paidDate: "", note: "", files: { dl: null, pay: null }, chk: null, book: null, by: p.recv.by || "", t: p.recv.t || acc + "T09:00:00" };
    if (pr) { const t0 = clamp(pr.t, acc); d.sendPay = { by: pr.by || "", t: t0 + "T10:00:00" };
      if (pr.status === "approved") { const t1 = clamp(pr.decided && pr.decided.t, t0), t2 = clamp(pr.recon && pr.recon.t, t1);
        d.chk = { st: "ok", why: "", by: "u14", t: t0 + "T15:00:00" }; d.book = { by: "u-acc", t: t1 + "T11:00:00" }; d.status = "paid"; d.paidDate = t2; d.paid = { by: fin, t: t2 + "T14:00:00" }; } }
    const ck = kxAmount(x) > VC_GROUP_LIMIT ? "u15" : "u14"; if (d.chk) d.chk.by = ck; x.dl.push(d); });
  const last = ph[ph.length - 1]; if (ph.length && ph.every(p => p.recv && p.recv.date)) x.lastAccept = last.delivered || last.recv.date;
  if (!x.days && last && last.due && x.start) x.days = kxDiff(x.start, last.due) + 1;
  const c = (s.cases || []).find(q => q.plan === k.plan); let cs = 0; try { const S0 = S; S = s; try { cs = c ? caseState(c) : 0; } finally { S = S0; } } catch (e) {}
  if (cs === 10) { x.dl.forEach(d => { if (d.status === "paid") return; const t = d.accept + "T15:00:00", w = ["send", "ok", "book", "back"][(s._sfi = (s._sfi || 0) + 1) % 4]; // the samples at "เบิกจ่าย" wait at each desk in turn
      d.sendPay = d.sendPay || { by: d.by, t }; if (w === "ok" || w === "book") d.chk = { st: "ok", why: "", by: "u14", t }; if (w === "back") d.chk = { st: "back", why: "ใบแจ้งหนี้ไม่ตรงกับงวดงาน แก้ไขแล้วส่งใหม่ (ตัวอย่าง)", by: "u14", t }; if (w === "book") d.book = { by: "u-acc", t }; if (d.chk) d.chk.by = kxAmount(x) > VC_GROUP_LIMIT ? "u15" : "u14"; }); }
  if (cs >= 12 && !k.handover && x.lastAccept && x.dl.every(d => d.status === "paid")) x.closed = { by: "", t: x.lastAccept + "T16:00:00", to: "", note: "ปิดการจัดซื้อแล้ว ยังไม่ส่งมอบ (ตัวอย่าง)" };
  if (k.handover && x.lastAccept && x.dl.length && x.dl.every(d => d.status === "paid")) x.closed = { by: k.handover.by || "", t: k.handover.t || "", to: k.handover.party || "", note: k.handover.note || "" };
}
const kxSeedFillAll = s => { try { (s.contracts || []).forEach(k => { kxOf(k); kxSeedFill(s, k); }); } catch (e) {} delete s._sfi; };
Object.keys(SEEDS).forEach(n => { const prev = SEEDS[n].seed; SEEDS[n].seed = () => { const s = prev(); kxSeedFillAll(s); return s; }; });
// a saved state from before this round: fill once
{ const base = route; route = function () { try { if (typeof S !== "undefined" && S && S.contracts && !S.cxSeedFill) { S.cxSeedFill = 1; kxSeedFillAll(S); } } catch (e) {} return base.apply(this, arguments); }; }
