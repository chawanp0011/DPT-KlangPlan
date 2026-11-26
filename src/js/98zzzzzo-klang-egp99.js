// ---------- P99: ส่ง e-GP, the form cleaned to the latest follow-up file (ฟอร์มติดตาม 67 columns, group "e-GP") ----------
// Asked for: "ส่ง e-GP clean แบบฟอร์มข้อมูล ให้ตรงกับไฟล์ติดตามล่าสุด พร้อมของเดิมที่ควรมีอยู่".
// Each step asks the e-GP columns of the file, in the file's order and with its names (no "(ตามไฟล์ติดตาม)" tags), plus what the work
// needs and had before (the files of each step, the method, the multi-year switches, the contract state and number).
// Moved out of e-GP: สำรวจ/ออกแบบ, แบบแล้วเสร็จ, ประมาณราคา, จัดทำ TOR (the file gives them to สำนัก/กอง; the request form has them),
// and the contract amount, period and PO (the contract tab has them). Their data stays and the reports still read it.
// Added: ประกาศขายแบบ/เชิญชวน "ถึง" (the file asks a period), จำนวนวันแล้วเสร็จ at อนุมัติจ้าง (the file's column 41); วันที่ครบอุทธรณ์ stays computed from ประกาศผู้ชนะ (7 working days) for the report.
{ const F = EGP7_F, pick = (s, k, label, req, when) => { const f = (F[s] || []).concat(...Object.values(F)).find(x => x[0] === k); const g = f ? f.slice() : [k, label, "text", 0];
    if (label) g[1] = label; if (req !== undefined) g[3] = req; if (when !== undefined) g[4] = when; return g; };
  const N = {
    s1: [pick("s1", "date", "ประกาศเผยแพร่แผนการจัดซื้อจัดจ้าง (ว/ด/ป)", 1)],
    s2: [pick("s2", "projNo", "เลขที่โครงการ (e-bidding)", 1), pick("s2", "refPrice", "ราคากลาง (บาท)", 0), pick("s2", "refDate", "เห็นชอบราคากลาง (ว/ด/ป)", 0), pick("s2", "reqDate", "เห็นชอบรายงานขอซื้อขอจ้าง (ว/ด/ป)", 1),
      pick("s2", "f:req", "ไฟล์รายงานขอซื้อขอจ้าง", 1), pick("s2", "f:order", "ไฟล์คำสั่ง", 1), pick("s2", "f:comm", "ไฟล์คำสั่งแต่งตั้งคณะกรรมการ", 1)],
    s3: [pick("s3", "method", "วิธีการจัดหา", 1), pick("s3", "draft", "มีประกาศร่าง TOR", 0), pick("s3", "draftDate", "ประกาศร่าง TOR ตั้งแต่ (ว/ด/ป)", 1, "draft"), pick("s3", "draftEnd", "ประกาศร่าง TOR ถึง (ว/ด/ป)", 0, "draft"),
      pick("s3", "inviteDate", "ประกาศขายแบบ/เชิญชวน ตั้งแต่ (ว/ด/ป)", 1), ["inviteEnd", "ประกาศขายแบบ/เชิญชวน ถึง (ว/ด/ป)", "date", 0], pick("s3", "bidDate", "เสนอราคา (ว/ด/ป)", 1)],
    s4: [pick("s4", "start", "พิจารณาผล ตั้งแต่ (ว/ด/ป)", 1), pick("s4", "end", "พิจารณาผล ถึง (ว/ด/ป)", 1), pick("s4", "round", "ครั้งที่ประกวดราคา (จำนวนครั้ง)", 0), pick("s4", "winner", "ผู้เสนอราคาได้ต่ำสุด", 1), pick("s4", "price", "วงเงินที่เสนอ (บาท)", 1),
      pick("s4", "f:result", "ไฟล์รายงานผลการพิจารณา", 1),
      pick("s4", "bbLetter", "ส่ง สงป. พิจารณาความเหมาะสม เลขที่หนังสือ/ว/ด/ป", 0, ""), pick("s4", "bbOkLetter", "สงป. พิจารณาความเหมาะสมแล้ว เลขที่หนังสือ/ว/ด/ป", 0, ""), pick("s4", "bbAmount", "วงเงินที่ สงป. เห็นชอบ (บาท)", 0, ""), ["qLen", "ความยาว (เมตร)", "number", 0],
      pick("s4", "cabLetter", "ขยายระยะเวลาก่อหนี้ผูกพัน เลขที่หนังสือ/ว/ด/ป", 0, ""), pick("s4", "cab", "ครม. อนุมัติขยายเวลาก่อหนี้ (งบผูกพัน)", 0, "multi"), pick("s4", "cabFrom", "เดิม ปี (เช่น 70-71)", 1, "cabyes"), pick("s4", "cabTo", "เป็น ปี (เช่น 70-72)", 1, "cabyes")],
    s5: [pick("s5", "approve", "อนุมัติจ้าง (ว/ด/ป)", 1), ["days", "จำนวนวันแล้วเสร็จ", "number", 0], pick("s5", "winnerDate", "ประกาศผู้ชนะ (ว/ด/ป)", 1), pick("s5", "appeal", "มีอุทธรณ์", 0),
      pick("s5", "f:approve", "ไฟล์อนุมัติจ้าง", 1), pick("s5", "f:winner", "ไฟล์ประกาศผู้ชนะ", 1), pick("s5", "f:appeal", "ไฟล์เอกสารอุทธรณ์", 1, "appeal")],
    s6: [pick("s6", "callDate", "แจ้งผู้รับจ้างลงนาม (ว/ด/ป)", 1), pick("s6", "signBy", "ทำสัญญาภายในวันที่", 0), pick("s6", "f:notice", "ไฟล์หนังสือแจ้งลงนามสัญญา", 1)],
    s7: [pick("s7", "sign", "สถานะทำสัญญา", 1), pick("s7", "offerDate", "เสนอลงนามสัญญา (ว/ด/ป)", 0), pick("s7", "no", "เลขที่สัญญา", 1, "signed"), pick("s7", "date", "วันที่ลงนาม (ว/ด/ป)", 1, "signed"), pick("s7", "f:contract", "ไฟล์หนังสือสัญญา", 1, "signed")] };
  Object.keys(N).forEach(k => { F[k].length = 0; N[k].forEach(f => F[k].push(f)); }); }
// the step names as the file calls them
EGP7[1].t = "รายงานขอซื้อขอจ้าง ราคากลาง และคำสั่งแต่งตั้งคณะกรรมการ"; EGP7[2].t = "ประกาศร่าง TOR / ประกาศขายแบบ เชิญชวน และเสนอราคา"; EGP7[3].t = "พิจารณาผล (และ สงป. / ขยายก่อหนี้ผูกพัน)"; EGP7[5].t = "แจ้งผู้รับจ้างลงนาม"; EGP7[6].t = "เสนอลงนามและลงนามสัญญา";
// the reports: the invitation is a period, the days come from อนุมัติจ้าง when the contract has none
{ const base = prTrackBook; prTrackBook = function (fy) { const book = base(fy), rows = prDtRows(fy, false);
    book[0].rows.slice(5).forEach((row, i) => { const r = rows[i]; if (!r) return; const bi = ((S.bi && S.bi.rows) || []).find(y => y.id === r.id), p = bi && bi.sent && bi.sent.pp ? S.pplan.find(q => q.id === bi.sent.pp) : r.k ? famPlan(r.k.plan) : null, E = prE7(p); if (!E) return;
      if (E.s3.inviteDate) row[32] = prRange(E.s3.inviteDate, E.s3.inviteEnd); if (!row[50] && E.s4.qLen) row[50] = Number(E.s4.qLen); if (!row[40] && E.s4.cabLetter) row[40] = E.s4.cabLetter; if (!row[49] && E.s5.days) row[49] = Number(E.s5.days); }); return book; }; }
// the days: a number above 0
{ const base = egp7Save; egp7Save = function (c, n, v, files) { if (n === 5 && "days" in v) { const d = v.days; if (d !== "" && !(Number(d) > 0)) return "จำนวนวันแล้วเสร็จต้องมากกว่า 0"; } return base(c, n, v, files); }; }
// P99 (26 Nov 2569, asked): the five columns of the form ส่ง สงป. พิจารณา, สงป. พิจารณาแล้ว, วงเงินที่ สงป. เห็นชอบ, ความยาว (เมตร),
// ขยายระยะเวลาก่อหนี้ผูกพัน are boxes of step 4 shown always (no condition, not required); ความยาว moved here from จัดทำข้อมูล.
