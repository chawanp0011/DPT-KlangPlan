// Fisko-KlangFinance, round P27 (17 Nov 2569): the sample is written again as ONE story with ONE date, "today" = Tuesday 17 Nov 2569 (2026-11-17), at the user's word
// ("make all the samples new, for the budget and for procurement, as current as the process allows, from creating the calendar to the hand-over to the LGU").
// What was wrong before: the clock was 16 Oct 2569 while the sample events were dated by hand and did not agree with each other. Sixteen of the 22 procurement cases were
// copies of one another ("Sample, panel N ..." with the same supplier, the same dates and the same 14 Oct signing); a case was "handed on" on 15 Oct and "closed" on 22 Oct;
// a contract was paid before it was accepted; the calendar said the executive had not yet approved while three requests were approved; the observations of the committee
// were dated in 2570; the committee meeting had been held on a day after the requests it dealt with were last edited.
// What this file does (it is the LAST seed layer of the sample organisation; ids and the step each case stands at are kept, so every page, link and test keeps working):
//   BUDGET   the calendar of the year being prepared, the committee meetings, the hearings, the observations, and the time stamps of the requests, notes and logs
//            are put on the one story (see STORY_BUDGET below); statuses of the requests are as they were.
//   PROCUREMENT  the sixteen stage samples (PC-2570-007 to 022) are rewritten as sixteen different projects, each with a name, a unit, a supplier, an amount and a
//            time line from the plan to the hand-over that follows the process (plan > requisition > approval > method > reference price > TOR > e-GP > evaluation >
//            award > appeal period > contract > guarantee > delivery > acceptance > invoice > payment > warranty > rating > close > hand-over); PC-2570-003 (at the award)
//            is moved to the weeks around today. The three first cases (001 to 003) and the vouchers that refer to them are left as they were (they already agree).
// The names, suppliers, numbers and letters are samples of mine. Nothing is read from a real agency.
const STORY_TODAY = "2026-11-17";
const stDay = (iso, n) => { const d = new Date(iso + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const stWk = iso => { const d = new Date(iso + "T00:00:00Z").getUTCDay(); return d === 6 ? stDay(iso, -1) : d === 0 ? stDay(iso, -2) : iso; }; // never a Saturday or a Sunday
const stShiftT = (t, n) => (typeof t === "string" && /^\d{4}-\d{2}-\d{2}/.test(t) ? stDay(t.slice(0, 10), n) + t.slice(10) : t);

// ---------- BUDGET: the calendar of the year being prepared, as it stands on 17 Nov ----------
// (the Bureau briefing, c7, is on 24 Nov) "done" is everything on or before today; the rest are the dates ahead. The committee meets in two rounds: round 1/2570 was held yesterday (it dealt with
// three requests; Planning has not yet applied the results), round 2/2570 is the one on the calendar (4 Dec). Three requests of routine expenditure were approved
// earlier by the executive (personnel, utilities, cloud). The package for the Budget Bureau is prepared and goes on 18 Dec.
const STORY_CAL = { c7: "2026-11-24", c1: "2026-10-01", c10: "2026-11-02", c2: "2026-11-13", c11: "2026-11-20", c3: "2026-11-27", c4: "2026-12-04", c5: "2026-12-11", c6: "2026-12-18", c8: "2027-01-08", c12: "2027-01-15", c9: "2027-02-17" };
function storyOthers(s) { // records of other modules whose state depends on the date: moved one month with the clock so they stay as they were
  (s.inbox || []).forEach(i => { ["dateRecv", "due"].forEach(k => { if (i[k]) i[k] = stDay(i[k], 32); }); });
  (s.bequip || []).forEach(b => { if (b.svcLast) b.svcLast = stDay(b.svcLast, 32); });
  { const g = ((s.contracts || []).find(c => c.id === "CT-2570-002") || {}).guarantee; if (g && g.status === "held") g.expires = stDay(STORY_TODAY, 13); } // the bank guarantee of the information-system contract runs out in 13 days: the sample of the alert "guarantee about to expire"
}
function storyBudget(s) {
  const SH = 32; // the sample events were dated against 16 Oct; the story is one month later
  (s.calendar || []).forEach(c => { if (STORY_CAL[c.id]) { c.date = STORY_CAL[c.id]; if (c.end) c.end = stDay(c.date, 1); } });
  { const pl = (s.users.find(u => u.role === "plan") || {}).id; (s.calendar || []).forEach(c => { if (["c1", "c10"].includes(c.id) && c.date <= STORY_TODAY) c.done = { by: pl, t: c.date + "T10:00" }; else delete c.done; }); } // what has been done by today is marked; the request deadline (c2) is late because a request is still a draft
  const m1 = (s.meetings || []).find(m => m.id === "M-1"), m2 = (s.meetings || []).find(m => m.id === "M-2");
  if (m1) m1.date = "2026-11-16"; if (m2) m2.date = STORY_CAL.c4;
  (s.hearings || []).forEach(h => { h.date = stDay(h.date, SH); (h.qs || []).forEach(q => { if (q.t) q.t = stShiftT(q.t, SH); }); });
  (s.observations || []).forEach((o, i) => { o.date = ["2026-08-20", "2026-08-20", "2026-08-21"][i] || "2026-08-21"; }); // the committee observations on the act of the year in force
  (s.requests || []).forEach(r => {
    if (r.updated) r.updated = stDay(r.updated, SH);
    (r.versions || []).forEach(v => { v.t = stShiftT(v.t, SH); });
    (r.comments || []).forEach(c => { if (c.t) c.t = stShiftT(c.t, SH); });
  });
  ["notes", "audit", "log", "aiLog"].forEach(k => (s[k] || []).forEach(x => { if (x && x.t) x.t = stShiftT(x.t, SH); }));
  (s.notes || []).forEach(n => { const tt = tx(n.text); if (/ถึงกำหนดส่งคำขอให้กองแผนงาน/.test(tt) && n.text) n.text = [`เลยกำหนดส่งคำขอให้กองแผนงาน (${stDay(STORY_CAL.c2, 0).slice(8, 10)}/${STORY_CAL.c2.slice(5, 7)}) แล้ว ยังมีคำขอที่เป็นร่าง`, "The deadline to send requests to Planning has passed; a request is still a draft"]; });
  (s.planRevs || []).forEach(p => { if (p.t) p.t = stShiftT(p.t, SH); });
}

// ---------- PROCUREMENT: the sixteen stage samples as sixteen projects ----------
// anchor: the date of the latest step the case has reached (everything before it is worked back from it with the usual gaps of a competitive procurement)
const ST_STEPS = ["created", "requested", "approved", "method", "ref", "torCm", "tor", "announce", "close", "evalCm", "award", "appealEnd", "signed"];
const ST_GAP = { requested: 5, approved: 3, method: 1, ref: 3, torCm: 1, tor: 2, announce: 3, close: 10, evalCm: 1, award: 4, appealEnd: 10, signed: 4 }; // days after the step before
function stChain(key, date) { // the dates of every step up to `key` (and the e-GP closing date when the announcement is the latest)
  const i = ST_STEPS.indexOf(key), out = {}; out[key] = date;
  for (let j = i; j > 0; j--) out[ST_STEPS[j - 1]] = stWk(stDay(out[ST_STEPS[j]], -ST_GAP[ST_STEPS[j]]));
  if (i >= 0 && i < ST_STEPS.indexOf("close")) out.close = stDay(out.announce || date, 10);
  return out;
}
const STORY_VENDORS = { it: "V-001", build: "V-002", gen: "V-003", goods: "V-004", digital: "V-005", train: "V-006", inst: "V-007" };
// one row for each stage sample: id, line, category, estimate, name (th, en), requisition text, the step reached, supplier kind and the contract story
const STORY_CAST = [
  { id: "PC-2570-007", line: "L5", cat: "C04", est: 1500000, th: "จ้างปรับปรุงห้องประชุมและห้องปฏิบัติการสำนักงานภูมิภาค 3 แห่ง", en: "Renovation of the meeting and laboratory rooms of 3 regional offices", at: ["method", "2026-11-13"], sc: "ปรับปรุงห้องประชุมและห้องปฏิบัติการของสำนักงานภูมิภาค 3 แห่ง งานรื้อถอน ฝ้า ไฟฟ้า และเฟอร์นิเจอร์ติดตั้ง", dl: "ผลงานปรับปรุงตามแบบรูปรายการ 3 แห่ง", days: 90, place: "สำนักงานภูมิภาค 3 แห่ง", ben: "ห้องประชุมใช้งานได้ตามมาตรฐานความปลอดภัย" },
  { id: "PC-2570-008", line: "L11", cat: "C02", est: 1600000, th: "จ้างพัฒนาระบบรับ-ส่งหนังสืออิเล็กทรอนิกส์ภายในกรม", en: "Development of the internal electronic document system", at: ["tor", "2026-11-10"], sc: "พัฒนาระบบรับ-ส่งหนังสือ ลงนามอิเล็กทรอนิกส์ และติดตามสถานะเอกสาร พร้อมอบรมผู้ใช้", dl: "ระบบพร้อมใช้ คู่มือ และการอบรมผู้ใช้ 150 คน", days: 120, place: "สำนักเทคโนโลยีสารสนเทศ", ben: "ลดการใช้กระดาษและเวลาส่งเอกสาร" },
  { id: "PC-2570-009", line: "L7", cat: "C02", est: 1700000, th: "จ้างบริการสำรองข้อมูลและกู้คืนระบบบนคลาวด์ภาครัฐ 12 เดือน", en: "12-month backup and recovery service on the government cloud", at: ["announce", "2026-11-09"], sc: "บริการสำรองข้อมูลรายวัน ทดสอบกู้คืนรายไตรมาส และรายงานประสิทธิภาพรายเดือน", dl: "รายงานการสำรองและผลทดสอบกู้คืนตามรอบ", days: 365, place: "ศูนย์ข้อมูลของกรม", ben: "ข้อมูลของกรมกู้คืนได้ภายใน 4 ชั่วโมง" },
  { id: "PC-2570-010", line: "L6", cat: "C02", est: 1800000, th: "จ้างติดตั้งระบบเครือข่ายไร้สายอาคารสำนักงานใหญ่ ชั้น 3-6", en: "Wireless network installation, head office floors 3-6", at: ["evalCm", "2026-11-03"], sc: "ติดตั้งอุปกรณ์กระจายสัญญาณ ควบคุมการเข้าถึง และระบบบริหารจัดการส่วนกลาง ชั้น 3-6", dl: "เครือข่ายไร้สายครอบคลุมพื้นที่ใช้งานร้อยละ 95", days: 75, place: "อาคารสำนักงานใหญ่", ben: "เจ้าหน้าที่ใช้เครือข่ายเดียวกันทั้งอาคาร" },
  { id: "PC-2570-011", line: "L12", cat: "C02", est: 1900000, th: "จ้างออกแบบและพัฒนาแอปพลิเคชันบริการประชาชนบนมือถือ", en: "Design and development of a citizen-services mobile app", at: ["award", "2026-11-11"], sc: "ออกแบบประสบการณ์ใช้งาน พัฒนาแอป iOS และ Android และเชื่อมระบบนัดหมายกับศูนย์บริการ", dl: "แอปพลิเคชันที่ผ่านการทดสอบและเผยแพร่บนร้านค้า", days: 150, place: "สำนักพัฒนาบริการประชาชน", ben: "ประชาชนนัดหมายรับบริการได้เอง" },
  { id: "PC-2570-012", sc: "ออกแบบและผลิตสื่อวิดีโอ อินโฟกราฟิก และแบนเนอร์ เพื่อประชาสัมพันธ์บริการออนไลน์ 6 บริการ", dl: "ชุดสื่อประชาสัมพันธ์ตามแผนสื่อสาร", ben: "ประชาชนรู้จักและใช้บริการออนไลน์มากขึ้น", line: "L3", cat: "C02", est: 2200000, th: "จ้างผลิตสื่อประชาสัมพันธ์บริการออนไลน์ ระยะแรก", en: "Promotion materials for the online services, first stage", at: ["signed", "2026-10-08"], v: "digital", warr: 12, ph: [{ acc: "2026-11-05", dlv: "2026-11-04" }, { acc: "2026-11-16", dlv: "2026-11-13" }], inv: [], pay: [] },
  { id: "PC-2570-013", sc: "ปรับปรุงระบบเรียกคิว จอแสดงผล และเครื่องพิมพ์บัตรคิว ศูนย์บริการประชาชน 5 สาขา พร้อมติดตั้งและฝึกอบรม", dl: "ระบบคิวพร้อมใช้งานทั้ง 5 สาขา", ben: "ลดเวลารอคอยของผู้รับบริการ", line: "L12", cat: "C02", est: 2300000, th: "จ้างปรับปรุงระบบคิวและจอแสดงผลศูนย์บริการประชาชน 5 สาขา", en: "Queue system and display upgrade at 5 citizen service centres", at: ["signed", "2026-10-06"], v: "it", warr: 12, ph: [{ acc: "2026-11-02", dlv: "2026-10-30" }, { acc: "2026-11-13", dlv: "2026-11-12" }], inv: [{ n: 1, d: "2026-11-03" }], pay: [{ n: 1, t: "2026-11-04", dec: "2026-11-06", rec: "2026-11-10" }] },
  { id: "PC-2570-014", sc: "ก่อสร้างศาลาพักคอย ปรับปรุงภูมิทัศน์และทางเดิน ณ ศูนย์เรียนรู้ชุมชน เพื่อส่งมอบให้องค์กรปกครองส่วนท้องถิ่นดูแลต่อ", dl: "ศาลาพักคอยและภูมิทัศน์ตามแบบรูปรายการ", ben: "ชุมชนใช้ศูนย์เรียนรู้ได้อย่างปลอดภัย", line: "L5", cat: "C04", est: 2400000, th: "จ้างก่อสร้างศาลาพักคอยและปรับปรุงภูมิทัศน์ศูนย์เรียนรู้ชุมชน เพื่อส่งมอบ อปท.", en: "Waiting pavilion and landscaping of a community learning centre, to be handed to the LGU", at: ["signed", "2026-10-07"], v: "build", warr: 0, ph: [{ acc: "2026-10-21", dlv: "2026-10-20" }, { acc: "2026-11-04", dlv: "2026-11-03" }], inv: [{ n: 1, d: "2026-10-22" }, { n: 2, d: "2026-11-04" }], pay: [{ n: 1, t: "2026-10-23", dec: "2026-10-24", rec: "2026-10-28" }, { n: 2, t: "2026-11-05", dec: "2026-11-06", rec: "2026-11-11" }], guarRet: "2026-11-09", close: "2026-11-12", score: 4, hand: { d: "2026-11-13", party: "องค์การบริหารส่วนตำบลตัวอย่าง", doc: "ที่ ทต 0031/2569" } },
  { id: "PC-2570-015", sc: "พัฒนาระบบบริหารข้อมูลบุคลากรและสิทธิประโยชน์ พร้อมย้ายข้อมูลเดิมและอบรมผู้ใช้", dl: "ระบบพร้อมใช้ คู่มือ และการอบรม", ben: "ลดงานเอกสารของฝ่ายบริหารงานบุคคล", line: "L6", cat: "C02", est: 2300000, th: "จ้างพัฒนาระบบบริหารข้อมูลบุคลากรและสิทธิประโยชน์", en: "Personnel and benefits information system", at: ["signed", "2026-10-09"], v: "gen", warr: 12, ph: [{ acc: "2026-10-30", dlv: "2026-10-28" }, { acc: "2026-11-09", dlv: "2026-11-06" }], inv: [{ n: 1, d: "2026-11-02" }, { n: 2, d: "2026-11-10" }], pay: [{ n: 1, t: "2026-11-03", dec: "2026-11-04", rec: "2026-11-09" }, { n: 2, t: "2026-11-10", dec: "2026-11-12", rec: "2026-11-16" }] },
  { id: "PC-2570-016", sc: "ประเมินผลการดำเนินงานตามแผนปฏิบัติราชการ ปี 2570 ทั้งผลผลิต ผลลัพธ์ และการใช้จ่ายงบประมาณ พร้อมข้อเสนอแนะ", dl: "รายงานประเมินผลและข้อเสนอแนะ", ben: "ผู้บริหารใช้ปรับแผนปี 2571", line: "L13", cat: "C08", est: 900000, th: "จ้างที่ปรึกษาประเมินผลการดำเนินงานตามแผนปฏิบัติราชการ ปี 2570", en: "Consultant to evaluate the 2570 action plan", at: ["plan", "2026-11-17"], month: "2027-06-15" },
  { id: "PC-2570-017", sc: "พัฒนาระบบรายงานผลการดำเนินงานและตัวชี้วัดของกรม เชื่อมข้อมูลจากระบบงบประมาณและพัสดุ", dl: "ระบบรายงานและแดชบอร์ดผู้บริหาร", ben: "ผู้บริหารติดตามผลได้รายเดือน", line: "L11", cat: "C02", est: 2200000, th: "จ้างพัฒนาระบบรายงานผลการดำเนินงานและตัวชี้วัดของกรม", en: "Performance and KPI reporting system", at: ["signed", "2026-11-12"], v: "it", warr: 12, ph: [{}, {}], inv: [], pay: [], noGuar: true },
  { id: "PC-2570-018", sc: "บริการโครงสร้างพื้นฐานคลาวด์สำหรับระบบงานสารสนเทศกลาง ตลอดปี 2570 พร้อมสำรองข้อมูลและเฝ้าระวัง", dl: "รายงานการใช้งานและเฝ้าระวังรายเดือน", ben: "ระบบกลางใช้งานได้ต่อเนื่อง", line: "L7", cat: "C02", est: 2200000, th: "จ้างบริการคลาวด์สำหรับระบบงานสารสนเทศกลาง ปี 2570", en: "Cloud hosting of the central information systems, 2570", at: ["signed", "2026-10-05"], v: "gen", warr: 12, ph: [{ acc: "2026-10-30", dlv: "2026-10-29" }, { acc: "2026-11-12", dlv: "2026-11-11" }], inv: [], pay: [], change: true },
  { id: "PC-2570-019", sc: "พัฒนาแบบฟอร์มและระบบยื่นคำร้องออนไลน์ ระยะที่ 2 รองรับการแนบเอกสารและติดตามสถานะ", dl: "ระบบยื่นคำร้องออนไลน์ระยะที่ 2", ben: "ประชาชนยื่นคำร้องได้โดยไม่ต้องมาที่สำนักงาน", line: "L3", cat: "C02", est: 2200000, th: "จ้างพัฒนาแบบฟอร์มและระบบยื่นคำร้องออนไลน์ ระยะที่ 2", en: "Online application forms, stage 2", at: ["signed", "2026-10-07"], v: "digital", warr: 12, ph: [{ acc: "2026-10-30", dlv: "2026-10-29" }, { acc: "2026-11-10", dlv: "2026-11-09" }], inv: [{ n: 1, d: "2026-11-06" }], pay: [] },
  { id: "PC-2570-020", sc: "ติดตั้งและตั้งค่าซอฟต์แวร์สำนักงานและซอฟต์แวร์ความปลอดภัยเครื่องลูกข่าย 600 เครื่อง", dl: "เครื่องลูกข่ายติดตั้งและทดสอบครบ", ben: "เครื่องคอมพิวเตอร์ของกรมใช้ซอฟต์แวร์มาตรฐานเดียวกัน", line: "L6", cat: "C02", est: 2300000, th: "จ้างติดตั้งและตั้งค่าซอฟต์แวร์สำนักงานและความปลอดภัยเครื่องลูกข่าย", en: "Installation of office and endpoint-security software", at: ["signed", "2026-10-02"], v: "it", warr: 1, ph: [{ acc: "2026-10-07", dlv: "2026-10-06" }, { acc: "2026-10-12", dlv: "2026-10-09" }], inv: [{ n: 1, d: "2026-10-08" }, { n: 2, d: "2026-10-13" }], pay: [{ n: 1, t: "2026-10-09", dec: "2026-10-12", rec: "2026-10-15" }, { n: 2, t: "2026-10-14", dec: "2026-10-16", rec: "2026-10-21" }] },
  { id: "PC-2570-021", sc: "ติดตั้งระบบสำรองไฟและตรวจสอบระบบไฟฟ้าห้องเครื่องแม่ข่าย พร้อมทดสอบโหลด", dl: "ระบบสำรองไฟพร้อมรายงานทดสอบ", ben: "ห้องเครื่องแม่ข่ายไม่ขัดข้องจากไฟฟ้า", line: "L6", cat: "C02", est: 2300000, th: "จ้างติดตั้งระบบสำรองไฟและตรวจสอบระบบไฟฟ้าห้องเครื่องแม่ข่าย", en: "UPS installation and electrical check of the server room", at: ["signed", "2026-10-02"], v: "goods", warr: 1, ph: [{ acc: "2026-10-07", dlv: "2026-10-06" }, { acc: "2026-10-12", dlv: "2026-10-09" }], inv: [{ n: 1, d: "2026-10-08" }, { n: 2, d: "2026-10-13" }], pay: [{ n: 1, t: "2026-10-09", dec: "2026-10-12", rec: "2026-10-15" }, { n: 2, t: "2026-10-14", dec: "2026-10-16", rec: "2026-10-21" }], guarRet: "2026-11-14" },
  { id: "PC-2570-022", sc: "ปรับปรุงระบบป้ายบอกทางและทางเดินสำหรับผู้พิการ ณ ศูนย์บริการประชาชน", dl: "ป้ายและทางเดินตามแบบรูปรายการ", ben: "ผู้พิการเข้ารับบริการได้สะดวก", line: "L5", cat: "C04", est: 2400000, th: "จ้างปรับปรุงระบบป้ายและทางเดินศูนย์บริการประชาชน", en: "Signage and walkway improvement at the service centre", at: ["signed", "2026-10-02"], v: "build", warr: 1, ph: [{ acc: "2026-10-08", dlv: "2026-10-07" }, { acc: "2026-10-12", dlv: "2026-10-09" }], inv: [{ n: 1, d: "2026-10-09" }, { n: 2, d: "2026-10-13" }], pay: [{ n: 1, t: "2026-10-10", dec: "2026-10-12", rec: "2026-10-16" }, { n: 2, t: "2026-10-14", dec: "2026-10-16", rec: "2026-10-22" }], guarRet: "2026-11-13", close: "2026-11-16", score: 5 },
];
// case 003 (at the award, the contract is still to be made) moves to the weeks around today: bids closed 20 Oct, evaluated 21 Oct, award 2 Nov, appeal period over 12 Nov
const STORY_003 = { announce: "2026-10-06", close: "2026-10-20", evalCm: "2026-10-21", award: "2026-11-02", appealEnd: "2026-11-12" };

function storyProc(s) {
  const cs = id => s.cases.find(c => c.id === id), pl = id => s.pplan.find(p => p.id === id), rqOf = id => s.reqn.find(r => r.id === id), conOf = c => (c && c.contract ? s.contracts.find(k => k.id === c.contract) : null);
  const nextPy = () => "PY-2570-" + String(Math.max(0, ...s.payreqs.map(y => Number((String(y.id).match(/(\d+)$/) || [])[1]) || 0)) + 1).padStart(3, "0");
  const user = (role, unit) => (s.users.find(u => u.role === role && (!unit || u.unit === unit)) || s.users.find(u => u.role === role) || {}).id;
  const PO = user("proc"), EX = user("exec"), FN = user("fin"), PL = user("plan");
  const ven = key => s.vendors.find(v => v.id === STORY_VENDORS[key]) || s.vendors[0], vn = v => (Array.isArray(v.name) ? v.name : [v.name, v.name]); // the name of a vendor is a string in the register; the contract and the award keep [Thai, English]
  const lineUnit = id => (((s.allocs || {})[CUR_FY] || {}).lines || []).find(l => l.id === id) || {};
  const T = (d, h) => `${d}T${h || "10:00"}`;
  const ev = (c, t, type, by, detail) => s.caseEvents.push({ t, case: c.id, type, by, detail: detail || "", state: c.state });
  s.caseEvents = s.caseEvents.filter(e => !STORY_CAST.some(x => x.id === e.case));
  const orderNo = (() => { let n = 60; return () => `ที่ ${++n}/2569`; })();
  const reg = (c, type) => s.cmReg.find(m => m.case === c.id && m.type === type);
  // a case at step 4 (reference price and TOR done, waiting for e-GP) had none of them in the old sample, so its first panel showed "done" with 2 of 5 items: give it the ones that step means
  { const donor = cs("PC-2570-009"), nextCm = () => "CM-" + String(Math.max(0, ...s.cmReg.map(m => Number((String(m.id).match(/^CM-(d+)/) || [])[1]) || 0)) + 1).padStart(3, "0"), nextMm = () => "CMM-" + String(Math.max(0, ...s.cmMem.map(m => Number((String(m.id).match(/(d+)$/) || [])[1]) || 0)) + 1).padStart(3, "0"), cp = o => JSON.parse(JSON.stringify(o));
    STORY_CAST.forEach(x => { const c = cs(x.id); if (!c || !donor || !donor.ref || c.state < 4 || c.ref) return; c.ref = cp(donor.ref); c.tor = cp(donor.tor); c.committees = c.committees || {}; c.committees.tor = cp(donor.committees.tor); c.coi = c.coi || {}; c.coi.tor = cp((donor.coi || {}).tor || {});
      { const T = s.cmTypes.find(y => y.id === "CTY-001"), SL = s.cmSlots.filter(y => y.type === T.id), tor = c.committees.tor, cm = { id: cmNextId(s.cmReg, "CM"), type: T.id, case: c.id, order: tor.order, date: tor.date, doc: "คำสั่ง-" + c.id + "-tor.pdf", note: "", status: "live", by: PO };
        s.cmReg.push(cm); s.cmMem.push({ id: cmNextId(s.cmMem, "CMM"), cm: cm.id, slot: SL.find(y => y.chair).id, kind: "user", user: tor.chair, role: "chair", tech: false, exp: "" }); (tor.members || []).forEach(u => s.cmMem.push({ id: cmNextId(s.cmMem, "CMM"), cm: cm.id, slot: SL.find(y => !y.chair).id, kind: "user", user: u, role: "member", tech: false, exp: "" }));
        (s.cmDocs = s.cmDocs || []).push({ id: cmNextId(s.cmDocs, "CMD"), cm: cm.id, kind: "order", name: cm.doc, size: 0, type: "", data: "", note: "ข้อมูลตัวอย่าง ไม่มีไฟล์จริง", by: PO, t: cm.date + "T09:00:00" }); tor.cm = cm.id; } }); }
  STORY_CAST.forEach(x => {
    const c = cs(x.id); if (!c) return;
    const p = pl(c.plan), rq = rqOf(c.reqn), k = conOf(c), n = c.state, unit = lineUnit(x.line).unit, req = user("div", unit) || user("div"), ex = x.at[0] === "plan" ? null : x.at;
    // ----- the plan item and the requisition
    p.name = [x.th, x.en]; p.est = x.est; p.line = c.line = x.line; p.cat = x.cat; p.kind = c.kind = "service";
    const ch = ex && ex[0] !== "plan" ? stChain(ex[0], ex[1]) : { created: x.at[1] };
    p.month = x.month || stDay((ch.announce || ch.tor || ch.approved || ch.created).slice(0, 8) + "01", 0).replace(/-01$/, "-15");
    if (p.ap && p.ap.dec) p.ap.dec.t = T(stDay(ch.created, 2));
    const detail = { obj: x.th, scope: x.sc || "", qty: 1, unit: "งาน", days: x.days || 90, place: x.place || tx((s.units.find(u => u.id === unit) || { name: ["สำนัก", ""] }).name), deliv: x.dl || "ผลงานตามขอบเขตงานที่กำหนด", basis: "ราคาที่สืบจากผู้ประกอบการอย่างน้อย 3 ราย", ben: x.ben || "สำนักใช้งานได้ตามแผน", contact: tx((s.users.find(u => u.id === req) || { name: ["", ""] }).name), refs: "" };
    if (rq) { rq.amount = x.est; rq.by = req; rq.why = [`ตามแผนปฏิบัติการจัดซื้อจัดจ้างประจำปี 2570 ของ${tx((s.units.find(u => u.id === unit) || { name: ["สำนัก"] }).name)}`, "Per the 2570 procurement plan of the requesting unit"]; rq.detail = detail; if (ch.requested) rq.t = T(ch.requested, "09:00"); if (rq.decided && ch.approved) rq.decided.t = T(ch.approved, "16:00"); }
    // ----- the case: method, reference price, TOR, committees, e-GP
    if (c.methodApproval && ch.method) { c.methodApproval.t = T(ch.method); c.methodApproval.by = PO; }
    if (c.methodWhy) c.methodWhy = ["วงเงินสูงกว่าเพดานวิธีเฉพาะเจาะจง ใช้ประกวดราคาอิเล็กทรอนิกส์", "Above the specific-method ceiling, so electronic bidding"];
    if (c.ref && ch.ref) { c.ref = Object.assign(c.ref, { amount: Math.round(x.est * 0.98 / 1000) * 1000, note: "ราคากลางจากการสืบราคา 3 ราย และราคาที่เคยจัดซื้อ", t: T(ch.ref) }); }
    if (c.tor && ch.tor) { c.tor.t = T(ch.tor, "11:00"); c.tor.doc = `TOR_${c.id}_v1.pdf`; }
    const comm = (kind, date) => { const m = c.committees[kind]; if (!m || !date) return; m.date = date; m.t = T(date); m.order = orderNo(); const r = reg(c, kind === "tor" ? "CTY-001" : "CTY-002"); if (r) { r.order = m.order; r.date = date; r.doc = `คำสั่ง-${c.id}-${kind}.pdf`; r.note = ""; m.cm = r.id; } if (c.coi && c.coi[kind]) Object.values(c.coi[kind]).forEach(d => (d.t = T(date, "15:00"))); };
    comm("tor", ch.torCm); comm("eval", ch.evalCm);
    if (c.egp && ch.announce) { c.egp.no = `EGP-70-${String(c.id.slice(-3))}${ch.announce.slice(5, 7)}`; c.egp.announce = ch.announce; c.egp.date = ch.announce; c.egp.close = ch.close || stDay(ch.announce, 10); c.egp.bidders = n >= 6 ? 3 : null; }
    if (c.prep && c.prep.sent) { const t = T(ch.method || ch.approved || ch.created, "09:00:00"); c.prep.sent.t = t; if (c.prep.recv) c.prep.recv.t = t; }
    if (c.award && ch.award) {
      const win = ven(x.v || "it"), others = s.vendors.filter(v => v.id !== win.id).slice(0, 2), price = Math.round(x.est * 0.96 / 1000) * 1000;
      c.award = Object.assign(c.award, { winner: vn(win), price, date: ch.award, appealEnd: ch.appealEnd || stDay(ch.award, 10), minutes: "มติเห็นชอบผู้เสนอราคาต่ำสุดที่ผ่านเกณฑ์คุณสมบัติและข้อเสนอด้านเทคนิค" });
      c.bids = [{ name: vn(win)[0], price }, { name: vn(others[0])[0], price: Math.round(price * 1.04 / 1000) * 1000 }, { name: vn(others[1])[0], price: Math.round(price * 1.07 / 1000) * 1000 }];
    }
    // ----- events, in the order they happened
    ev(c, T(ch.created, "09:00"), "created", PO, p.id);
    if (ch.requested) ev(c, rq ? rq.t : T(ch.requested, "09:00"), "requested", req, rq ? rq.id : "");
    if (ch.approved && n >= 3) ev(c, T(ch.approved, "16:00"), "approved", EX, rq ? rq.id : "");
    if (ch.method && n >= 3) ev(c, T(ch.method, "16:30"), "method", PO, c.method || "ebid");
    if (c.ref && ch.ref) ev(c, c.ref.t, "ref", PO, fmt(c.ref.amount));
    if (c.committees.tor && ch.torCm) ev(c, T(ch.torCm), "committee", PO, "TOR");
    if (c.tor && ch.tor) ev(c, c.tor.t, "tor", PO, c.tor.doc);
    if (c.egp && ch.announce) ev(c, T(ch.announce, "09:00"), "sourcing", PO, c.egp.no);
    if (n >= 6 && ch.close) ev(c, T(ch.close, "16:00"), "closed", PO, c.egp.close), ev(c, T(ch.close, "16:30"), "bidders", PO, `${c.egp.bidders}`);
    if (c.committees.eval && ch.evalCm) ev(c, T(ch.evalCm), "committee", PO, "eval");
    if (c.award && ch.award) ev(c, T(ch.award, "14:00"), "award", PO, `${c.award.winner[0]} · ${fmt(c.award.price)}`);
    if (n >= 8 && c.award) ev(c, T(c.award.appealEnd, "16:30"), "appeal_elapsed", PO, c.award.appealEnd);
    // ----- the contract, the guarantee, the phases, the invoices and the payments
    if (k) {
      const v = ven(x.v || "it"), amount = c.award.price, h1 = Math.round(amount / 2 / 1000) * 1000, S0 = x.at[1], endAcc = x.ph.map(f => f.acc).filter(Boolean).sort().pop() || "";
      k.vendor = vn(v); k.amount = k.base = amount; k.signed = S0; k.no = `CT-70/1${c.id.slice(-2)}`; k.by = PO; k.warrantyMonths = x.warr;
      k.versions = [{ v: 1, amount, t: T(S0, "14:00"), by: PO, why: "" }]; k.ver = 1; k.gfPo = { no: `70000${String(12345 + Number(c.id.slice(-3)) * 7)}`, t: T(S0, "15:00"), by: FN };
      delete k.warrantyDemoOver; delete k.handover; delete k.cm;
      const cmA = reg(c, "CTY-004"); if (cmA) { cmA.order = `คำสั่งตรวจรับ ${k.no}`; cmA.date = S0; cmA.doc = `คำสั่งตรวจรับ-${k.id}.pdf`; cmA.note = ""; k.cm = cmA.id; }
      k.phases.forEach((ph, i) => {
        const f = x.ph[i] || {}, due = stDay(S0, i === 0 ? 30 : 45); ph.due = due; ph.amount = i === 0 ? h1 : amount - h1; ph.ext = ph.ext || 0; ph.extV = ph.extV || 0; ph.dissent = [];
        delete ph.delivered; delete ph.result; delete ph.okAmount; delete ph.cert; delete ph.recv; delete ph.invoice; ph.signs = [];
        if (f.acc) {
          ph.delivered = f.dlv; ph.recv = { date: f.dlv, note: "", by: req, t: T(f.dlv, "09:00:00") };
          ph.signs = (k.inspectors && k.inspectors.length >= 2 ? k.inspectors.slice(0, 2) : [PL, req]).map((u, j) => ({ by: u, t: T(f.acc, j ? "11:00" : "10:00") })); ph.result = "ok"; ph.okAmount = ph.amount; ph.cert = { n: 2, t: T(f.acc, "11:00") };
        }
        const iv = (x.inv || []).find(q => q.n === ph.n); if (iv) ph.invoice = { no: `INV-70-${String(Number(c.id.slice(-3)) * 10 + ph.n).padStart(4, "0")}`, amount: ph.amount, date: iv.d, vendor: tx(k.vendor), contract: k.no };
      });
      s.payreqs = s.payreqs.filter(y => y.contract !== k.id); s.vouchers = (s.vouchers || []).filter(w => w.contract !== k.id);
      (x.pay || []).forEach(q => { const ph = k.phases[q.n - 1]; s.payreqs.push({ id: nextPy(), contract: k.id, phase: q.n, amount: ph.amount, by: FN, status: "approved", t: T(q.t), decided: { by: EX, holder: EX, via: null, t: T(q.dec, "16:00") }, recon: { state: "matched", file: `GF-70-${String(c.id.slice(-3))}${q.n}`, t: T(q.rec, "08:00") } });
        { const py = s.payreqs[s.payreqs.length - 1], vc = ven(x.v || "it"), hd = user("finhead") || FN, no = String(Math.max(0, ...(s.vouchers || []).map(w => Number((String(w.id).match(/(\d+)$/) || [])[1]) || 0)) + 1).padStart(3, "0"), seq = String(c.id.slice(-3)) + q.n; // the payment as a voucher of the finance officer (one occasion for the phase)
          s.vouchers.push({ contract: k.id, phase: q.n, commit: null, penalty: 0, other: 0, vat: true, method: "epay", methodWhy: "", ev: {}, maker: FN, reqBy: PO, reqT: T(q.t, "09:00"), log: [{ t: T(q.t, "09:00"), by: PO, role: "proc", act: ["พัสดุสร้างรายการเบิกจ่าย", "Procurement made the payment request"], note: "" }, { t: T(q.t), by: FN, role: "fin", act: ["การเงินรับเรื่องจากพัสดุ", "Finance took the request from procurement"], note: "" }], id: "VC-2570-" + no, type: "proc", line: x.line, desc: [`${k.no} ${tx(ph.name)}`, `${k.no} ${ph.name[1] || tx(ph.name)}`], payee: { name: k.vendor, kind: "corp", taxId: vc.taxId || vc.tax || "", vendor: vc.id }, gross: ph.amount, due: stDay(q.dec, 7), state: "paid", checker: hd, approver: { by: EX, holder: EX, via: null, t: T(q.dec, "16:00"), auth: "A1" }, pay: py.id, t: T(q.t), payDate: q.t, gf: { doc: `GF-70-${seq}`, t: T(q.rec, "08:00"), file: "GO-2570-01" }, paid: { t: T(q.rec, "09:00"), ref: `CGD-${seq}` }, dayCheck: { t: T(q.rec, "16:30"), by: hd }, docs: typeof payDocsAuto === "function" ? payDocsAuto(k, [q.n]) : undefined }); }
      });
      const lastDue = k.phases.map(ph => ph.due).sort().pop();
      if (x.noGuar) k.guarantee = null; else k.guarantee = { type: "bank", amount: Math.round(amount * 0.05), expires: stDay(endAcc || lastDue, (x.warr || 0) * 31 + 150), status: x.guarRet ? "returned" : "held", t: T(S0, "15:00"), by: PO };
      if (k.guarantee && x.guarRet) k.guarantee.returnedT = T(x.guarRet, "14:00");
      if (c.award) ev(c, T(S0, "14:00"), "contract", PO, `${k.id} · ${mb(amount)}`);
      // a change that waits (PC-2570-018): a reduction asked by the division after the acceptance
      k.vars = [];
      if (x.change) k.vars = [{ id: k.id + "-V1", kind: "amount", delta: -30000, why: "ลดรายการสำรองข้อมูลส่วนเกินตามการใช้งานจริง", by: req, t: T("2026-11-13", "09:00"), status: "check", decided: null, files: [{ name: "บันทึกขอลดรายการ.pdf", size: 120000, by: req, t: T("2026-11-13", "09:10") }], flow: { stage: "check", sent: { by: req, t: T("2026-11-14", "09:00") } } }];
      if (x.close) { c.close = { lessons: "กำหนดวันส่งมอบและวันตรวจรับให้ชัดเจนในสัญญา ทำให้เบิกจ่ายได้ตามแผน", score: x.score, by: PO, t: T(x.close, "10:00") }; ev(c, T(x.close, "10:00"), "closed_case", PO, `${x.score}/5`); } else delete c.close;
      if (x.hand) k.handover = { to: "lgu", party: x.hand.party, date: x.hand.d, docNo: x.hand.doc, note: "ส่งมอบพร้อมคู่มือการใช้งานและเอกสารรับประกัน", by: PO, t: T(x.hand.d, "16:00") };
    }
  });
  // ----- PC-2570-003: the award is now, the appeal period has just ended
  { const c = cs("PC-2570-003"), p = c && pl(c.plan); if (c && c.egp && c.award) {
    c.egp.announce = c.egp.date = STORY_003.announce; c.egp.close = STORY_003.close; if (c.committees.eval) { c.committees.eval.date = STORY_003.evalCm; c.committees.eval.t = T(STORY_003.evalCm); Object.values((c.coi || {}).eval || {}).forEach(d => (d.t = T(STORY_003.evalCm, "15:00"))); const r = reg(c, "CTY-002"); if (r) r.date = STORY_003.evalCm; }
    c.award.date = STORY_003.award; c.award.appealEnd = STORY_003.appealEnd;
    s.caseEvents.filter(e => e.case === c.id).forEach(e => { if (e.type === "sourcing") e.t = T(STORY_003.announce, "09:00"); else if (e.type === "bidders") e.t = T(STORY_003.close, "16:30"); else if (e.type === "award") e.t = T(STORY_003.award, "14:00"); else if (e.type === "appeal_elapsed") { e.t = T(STORY_003.appealEnd, "16:30"); e.detail = STORY_003.appealEnd; } });
    { const w6 = s.vendors.find(v => v.id === "V-006"), o7 = s.vendors.find(v => v.id === "V-007"), o3 = s.vendors.find(v => v.id === "V-003"); if (w6 && o7 && o3) { c.award.winner = vn(w6); c.bids = [{ name: vn(w6)[0], price: c.award.price }, { name: vn(o7)[0], price: Math.round(c.award.price * 1.04 / 1000) * 1000 }, { name: vn(o3)[0], price: Math.round(c.award.price * 1.07 / 1000) * 1000 }]; } }
    p.name = ["จ้างจัดฝึกอบรมหลักสูตรพัฒนาบุคลากรด้านดิจิทัล ประจำปี 2570", "Digital skills training for staff, 2570"]; } }
  { const nextMem = () => "CMM-" + String(Math.max(0, ...s.cmMem.map(m => Number((String(m.id).match(/(\d+)$/) || [])[1]) || 0)) + 1).padStart(3, "0");
    s.cmReg.filter(r => /-PC-2570-\d+$/.test(r.id) && !s.cmMem.some(m => m.cm === r.id)).forEach(r => { const base = r.id.replace(/-PC-2570-\d+$/, ""); s.cmMem.filter(m => m.cm === base).forEach(m => s.cmMem.push(Object.assign({}, m, { id: nextMem(), cm: r.id }))); }); }
  s.caseEvents.sort((a, b) => (a.t < b.t ? 1 : -1));
  // the first cases keep their dates; the plan items that are not in a case yet keep theirs
}

// ---------- hook: the last layer of the sample organisation ----------
Object.keys(SEEDS).forEach(k => {
  if (k !== "sample") return;
  const prev = SEEDS[k].seed;
  SEEDS[k].seed = () => { const s = prev(); try { storyBudget(s); storyProc(s); storyOthers(s); } catch (e) { console.error("story layer", e); } return s; };
});

