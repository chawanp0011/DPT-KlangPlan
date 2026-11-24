// Fisko-KlangFinance, round P19 (16 Nov 2569): sample contract changes (extend the time / change the amount) at EVERY step of the four-step flow of file 98zg.
// Asked: "add samples where a contract can be changed; I can't find any". Before this the seed had no contract change that used the flow (only one old
// pending change, shown as "made before this flow"), and the contracts of the other samples have every phase accepted, so there was nothing to open.
// The contracts CT-2570-001 (case PC-2570-001) and CT-2570-002 (case PC-2570-002) still have open phases, so they take the samples:
//   CT-2570-001  V2 time, step 1 papers (sent back by procurement) · V3 amount, step 2 check · V4 time, step 2 waiting for the authority
//   CT-2570-002  V1 amount, step 3 legal draft (approved, new version) · V2 time, step 4 hand-in to e-GP (the legal unit passed it) · V3 time, done (handed in)
//                · V4 amount, rejected
// An approved change is applied to the contract the way an approval does it (the phase amount, the extension days, a new version). The amounts changed are
// reductions, so the line of the allocation keeps its room. The names, texts, files and reference numbers are samples of mine.
Object.keys(SEEDS).forEach(k => {
  const prev = SEEDS[k].seed;
  SEEDS[k].seed = () => {
    const s = prev(), role = r => (s.users.find(u => u.role === r) || {}).id || "", DV = role("div"), PO = role("proc"), PH = role("prochead") || PO, EX = role("exec");
    const con = id => (s.contracts || []).find(c => c.id === id); if (!con("CT-2570-001") || !con("CT-2570-002")) return s;
    const T = (d, h) => `2026-10-${String(d).padStart(2, "0")}T${h || "10:00"}`, st = (by, t) => ({ by, t }), file = (name, by, t) => ({ name, size: 184320, by, t });
    const sumTxt = (c, what) => `เรื่อง ขออนุมัติ${what}ตามสัญญา เลขที่ ${c.no}\n\nร่างโดย AI (จำลอง) ข้อมูลตัวอย่าง ต้องตรวจทานก่อนใช้`;
    const legalTxt = (c, n) => `ร่างบันทึกข้อตกลงแก้ไขสัญญา (ฉบับที่ ${n}) (ตัวอย่าง)\nข้อ 1 ตามสัญญาเลขที่ ${c.no}\nข้อ 4 ข้อความอื่นให้คงเป็นไปตามสัญญาเดิมทุกประการ\n\nร่างโดย AI (จำลอง) ไม่ใช่ความเห็นทางกฎหมาย`;
    const apply = (c, v) => { // what an approval does to the contract
      if (v.kind === "amount") { const open = c.phases.filter(p => !phaseSignedSeed(p)), tgt = open[open.length - 1]; tgt.amount += v.delta; c.amount += v.delta; } else { const ph = c.phases.find(p => p.n === v.phase); if (v.code === "vendor") ph.extV = (ph.extV || 0) + v.days; else ph.ext = (ph.ext || 0) + v.days; }
      c.ver = (c.ver || 1) + 1; (c.versions = c.versions || []).push({ v: c.ver, amount: c.amount, t: v.decided.t, by: v.decided.by, why: v.id });
    };
    const phaseSignedSeed = p => p.signs.length >= Math.min(typeof PHASE_SIGNS !== "undefined" ? PHASE_SIGNS : 2, p.need || (typeof PHASE_SIGNS !== "undefined" ? PHASE_SIGNS : 2));
    const mk = (c, n, o) => { const v = Object.assign({ id: `${c.id}-V${n}`, by: DV, decided: null, files: [], why: "" }, o); (c.vars = c.vars || []).push(v); return v; };
    const c1 = con("CT-2570-001"), c2 = con("CT-2570-002");
    // ----- CT-2570-001
    mk(c1, 2, { kind: "time", phase: 2, days: 15, code: "force", why: "ฝนตกหนักต่อเนื่อง เข้าพื้นที่ติดตั้งไม่ได้ (ตัวอย่าง)", t: T("16", "09:00"), status: "prep", files: [file("หนังสือขอขยายเวลาจากผู้ขาย.pdf", DV, T("16", "09:10"))], flow: { stage: "prep", returned: Object.assign({ note: "แนบหนังสือรับรองสภาพอากาศจากกรมอุตุนิยมวิทยาเพิ่ม" }, st(PO, T("17", "11:00"))) } });
    mk(c1, 3, { kind: "amount", delta: -30000, why: "ลดจำนวนอุปกรณ์ลง 1 รายการตามที่ใช้งานจริง (ตัวอย่าง)", t: T("14", "13:00"), status: "check", files: [file("บันทึกขอลดรายการ.pdf", DV, T("14", "13:10")), file("ใบเสนอราคาแก้ไข.pdf", DV, T("14", "13:15"))], flow: { stage: "check", sent: st(DV, T("15", "09:00")) } });
    mk(c1, 4, { kind: "time", phase: 3, days: 20, code: "owner", why: "สำนักเลื่อนวันเข้าพื้นที่เพราะประชุมใหญ่ (ตัวอย่าง)", t: T("10", "09:00"), status: "pending", who: "prochead", files: [file("หนังสือสำนักขอเลื่อน.pdf", DV, T("10", "09:05"))], flow: { stage: "approve", sent: st(DV, T("11", "09:00")), check: st(PO, T("12", "14:00")), summary: { text: sumTxt(c1, "ขยายระยะเวลาส่งมอบ"), ai: true, by: PO, t: T("12", "13:30") } } });
    // ----- CT-2570-002
    const v1 = mk(c2, 1, { kind: "amount", delta: -20000, why: "ปรับลดค่าติดตั้งเพราะใช้อุปกรณ์เดิมบางส่วน (ตัวอย่าง)", t: T("5", "09:00"), status: "approved", who: "prochead", files: [file("เอกสารเทียบราคา.pdf", DV, T("5", "09:10"))], decided: st(PH, T("9", "15:00")), flow: { stage: "legal", sent: st(DV, T("6", "09:00")), check: st(PO, T("7", "10:00")), summary: { text: sumTxt(c2, "เปลี่ยนแปลงวงเงิน"), ai: true, by: PO, t: T("7", "09:40") }, approved: { by: PH, t: T("9", "15:00"), ok: true }, legalDraft: { text: legalTxt(c2, 2), ai: true, by: PO, t: T("10", "09:30") } } }); apply(c2, v1);
    const v2 = mk(c2, 2, { kind: "time", phase: 2, days: 10, code: "force", why: "น้ำท่วมถนนทางเข้าโครงการ (ตัวอย่าง)", t: T("3", "09:00"), status: "approved", who: "prochead", files: [file("รายงานสถานการณ์น้ำท่วม.pdf", DV, T("3", "09:10"))], decided: st(PH, T("6", "14:00")), flow: { stage: "egp", sent: st(DV, T("3", "15:00")), check: st(PO, T("4", "10:00")), summary: { text: sumTxt(c2, "ขยายระยะเวลาส่งมอบ"), ai: true, by: PO, t: T("4", "09:40") }, approved: { by: PH, t: T("6", "14:00"), ok: true }, legalDraft: { text: legalTxt(c2, 3), ai: true, by: PO, t: T("7", "09:30") }, legal: { reviewer: "นิติกร ตัวอย่าง", sentT: T("7", "11:00"), result: "ok", note: "ผ่านโดยไม่แก้ไข", resT: T("8", "10:00") } } }); apply(c2, v2);
    const v3 = mk(c2, 3, { kind: "time", phase: 3, days: 7, code: "owner", why: "ผู้ว่าจ้างปรับแบบรูปรายการ (ตัวอย่าง)", t: T("1", "09:00"), status: "approved", who: "prochead", files: [file("แบบรูปรายการฉบับแก้ไข.pdf", DV, T("1", "09:10"))], decided: st(PH, T("2", "14:00")), flow: { stage: "done", sent: st(DV, T("1", "15:00")), check: st(PO, T("1", "16:00")), summary: { text: sumTxt(c2, "ขยายระยะเวลาส่งมอบ"), ai: true, by: PO, t: T("1", "15:40") }, approved: { by: PH, t: T("2", "14:00"), ok: true }, legalDraft: { text: legalTxt(c2, 4), ai: true, by: PO, t: T("2", "15:00") }, legal: { reviewer: "นิติกร ตัวอย่าง", sentT: T("2", "15:30"), result: "ok", note: "", resT: T("3", "09:00") }, egp: { ref: "EGP-CHG-70-0001", date: "2026-10-04", by: PO, t: T("4", "10:00") } } }); apply(c2, v3);
    mk(c2, 4, { kind: "amount", delta: -50000, why: "ขอลดวงเงิน 50,000 บาท แต่ลดเกินที่ใช้งานจริงไม่ได้ (ตัวอย่าง)", t: T("12", "09:00"), status: "rejected", who: "prochead", files: [file("บันทึกขอลดวงเงิน.pdf", DV, T("12", "09:10"))], decided: st(PH, T("13", "10:00")), flow: { stage: "done", sent: st(DV, T("12", "11:00")), check: st(PO, T("12", "14:00")), summary: { text: sumTxt(c2, "เปลี่ยนแปลงวงเงิน"), ai: true, by: PO, t: T("12", "13:30") }, approved: { by: PH, t: T("13", "10:00"), ok: false } } });
    return s;
  };
});

// Fisko-KlangFinance, round P19b (16 Nov 2569): a sample for EVERY step of the contract panels (4 to 7) of the procurement case, and samples of contract changes at every step of
// their own four-step flow. The steps of the panels were completed in file 98zd (guarantee, delivery, change, invoice, warranty, return of the guarantee); here each of them is the
// CURRENT step of at least one sample case:
//   panel 4  step 1 sign (the case at the award, PC-2570-003) · step 2 guarantee not recorded (a clone with the contract signed and no guarantee)
//   panel 5  step 1 delivery (PC-2570-001) · step 2 acceptance (PC-2570-002, all delivered) · step 3 a change waiting (clone)
//   panel 6  step 1 no invoice (PC-2570-012) · step 2 invoice, no payment request (clone) · step 3 not all paid (PC-2570-013)
//   panel 7  step 1 warranty running (PC-2570-015) · step 2 guarantee not returned (clone) · step 3 not rated (clone) · steps 4+5 the case is closed and rated, not handed on yet (clone) · done: PC-2570-014 (handed on)
// The clones are made from the stage samples of file 61 (a plan item, a requisition, a contract, its case and payments are copied with new ids). Sample data, marked as such.
Object.keys(SEEDS).forEach(k => {
  const prev = SEEDS[k].seed;
  SEEDS[k].seed = () => {
    const s = prev(), cs = id => s.cases.find(c => c.id === id), conOf = c => s.contracts.find(x => x.id === c.contract), pj = o => JSON.parse(JSON.stringify(o));
    const c12 = cs("PC-2570-012"), c15 = cs("PC-2570-015"), c14 = cs("PC-2570-014"), c2 = cs("PC-2570-002"); if (!c12 || !c15 || !c14 || !c2) return s;
    const K = { PO: (s.users.find(u => u.role === "proc") || {}).id };
    // the base samples made consistent
    const k2 = conOf(c2); k2.phases.forEach(ph => { if (!ph.delivered) ph.delivered = "2026-10-20"; }); // every phase delivered, acceptance pending
    const k14 = conOf(c14); if (k14) { if (k14.guarantee) k14.guarantee.status = "returned"; k14.warrantyDemoOver = true; }
    // a clone of a stage sample with its contract, its payments and its committee records
    const clone = (src, name, mut) => {
      const n = s.cases.length + 1, p0 = s.pplan.find(p => p.id === src.plan), r0 = s.reqn.find(r => r.id === src.reqn), k0 = conOf(src);
      const pid = `PP-2570-${String(s.pplan.length + 1).padStart(3, "0")}`, rid = `RQ-2570-${String(s.reqn.length + 1).padStart(3, "0")}`, cid = `PC-2570-${String(n).padStart(3, "0")}`, kid = `CT-2570-${String(s.contracts.length + 1).padStart(3, "0")}`;
      const p = pj(p0); p.id = pid; p.name = [name[0], name[1]]; p.pid = typeof pjMake === "function" && s.pjrows ? pjMake(s) : null; s.pplan.push(p); if (p.pid) s.pjrows.push({ id: "BR-" + String(s.pjrows.length + 1).padStart(4, "0"), pid: p.pid, fy: CUR_FY, code: "ตัวอย่าง-" + p.line, fund: "act", gf: true, amount: p.est }); // a Project ID and its budget row, as for every plan item
      const r = pj(r0); r.id = rid; r.plan = pid; s.reqn.push(r);
      const c = pj(src); c.id = cid; c.plan = pid; c.reqn = rid; c.contract = kid; s.cases.push(c);
      const k = pj(k0); k.id = kid; k.plan = pid; k.reqn = rid; s.contracts.push(k);
      s.payreqs.filter(y => y.contract === k0.id).forEach(y => { const z = pj(y); z.id = `PY-2570-${String(s.payreqs.length + 1).padStart(3, "0")}`; z.contract = kid; s.payreqs.push(z); });
      (s.cmReg || []).filter(m => m.case === src.id).forEach(m => { const z = pj(m); z.id = `${m.id}-${cid}`; z.case = cid; s.cmReg.push(z); });
      s.caseEvents.push({ t: "2026-10-01T09:00", case: cid, type: "created", by: K.PO, detail: "ข้อมูลตัวอย่างของขั้นตอนใหม่", state: c.state });
      mut(c, k, p); return c;
    };
    const noPay = (c, k) => { s.payreqs = s.payreqs.filter(y => y.contract !== k.id); k.phases.forEach(ph => { delete ph.invoice; }); };
    const unsign = k => k.phases.forEach(ph => { ph.signs = []; delete ph.delivered; delete ph.result; delete ph.okAmount; delete ph.cert; delete ph.handover; });
    // panel 4, step 2: the contract is signed, no guarantee yet
    clone(c12, ["ข้อมูลตัวอย่าง · แผงที่ 4 ขั้น 2: ลงนามสัญญาแล้ว ยังไม่บันทึกหลักประกัน", "Sample, panel 4 step 2: contract signed, no guarantee yet"], (c, k) => { noPay(c, k); unsign(k); k.guarantee = null; c.state = 9; });
    // panel 5, step 3: all accepted, a contract change is waiting
    clone(c12, ["ข้อมูลตัวอย่าง · แผงที่ 5 ขั้น 3: มีคำขอแก้ไขสัญญาค้าง", "Sample, panel 5 step 3: a contract change is waiting"], (c, k) => { noPay(c, k); const ph = k.phases[k.phases.length - 1]; k.vars = [{ id: k.id + "-V1", kind: "time", phase: ph.n, days: 10, code: "force", why: "สภาพอากาศไม่เอื้อต่อการติดตั้ง (ตัวอย่าง)", by: (s.users.find(u => u.role === "div") || {}).id, t: "2026-10-18T09:00", status: "check", decided: null, files: [{ name: "หนังสือขอขยายเวลา.pdf", size: 100000, by: K.PO, t: "2026-10-18T09:10" }], flow: { stage: "check", sent: { by: K.PO, t: "2026-10-19T09:00" } } }]; });
    // panel 6, step 2: an invoice, no payment request
    clone(c12, ["ข้อมูลตัวอย่าง · แผงที่ 6 ขั้น 2: มีใบแจ้งหนี้ ยังไม่ขอเบิก", "Sample, panel 6 step 2: an invoice, no payment request yet"], (c, k) => { noPay(c, k); const ph = k.phases[0]; ph.invoice = { no: "INV-70-0001", amount: ph.amount, date: "2026-10-20", vendor: tx(k.vendor), contract: k.no }; });
    // panel 7, steps 2 and 3
    clone(c15, ["ข้อมูลตัวอย่าง · แผงที่ 7 ขั้น 2: พ้นระยะรับประกัน ยังไม่คืนหลักประกัน", "Sample, panel 7 step 2: warranty over, guarantee not returned"], (c, k) => { k.warrantyDemoOver = true; if (k.guarantee) k.guarantee.status = "held"; delete c.close; });
    clone(c15, ["ข้อมูลตัวอย่าง · แผงที่ 7 ขั้น 3: คืนหลักประกันแล้ว ยังไม่ประเมินผู้ค้า", "Sample, panel 7 step 3: guarantee returned, supplier not rated"], (c, k) => { k.warrantyDemoOver = true; if (k.guarantee) k.guarantee.status = "returned"; delete c.close; });
    // panel 7, step 5: the case is closed and rated; procurement has not handed the work on yet
    clone(c14, ["ข้อมูลตัวอย่าง · แผงที่ 7 ขั้น 5: ปิดการจัดซื้อแล้ว รอเจ้าหน้าที่พัสดุส่งมอบต่อ", "Sample, panel 7 step 5: closed, waiting for procurement to hand it on"], (c, k) => { k.phases.forEach(ph => { delete ph.handover; }); });
    return s;
  };
});
