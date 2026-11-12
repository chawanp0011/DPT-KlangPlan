// Generates drawing primitives (points on a 1440x810 slide) for the five new slides of the v0.2 conceptual deck.
// deck/build_deck.ps1 draws them with PowerPoint into a copy of the v0.1 deck. Text uses only Thai and ASCII characters.
const G = "1BA229", NAVY = "1A1B50", NAVY2 = "232366", INK = "212135", SUB = "45465C", CARD = "F4F5FA", WHITE = "FFFFFF", LINE = "D8DAE8", AMBER = "B26A00";
const slides = [];
const S = (eyebrow, title) => { const s = { eyebrow, title, p: [] }; slides.push(s); return s; };
const rr = (s, l, t, w, h, fill, line) => s.p.push({ k: "rr", l, t, w, h, fill, line });
const tx = (s, l, t, w, h, text, o = {}) => s.p.push({ k: "tx", l, t, w, h, text, font: o.font || "Calibri", size: o.size || 12.5, color: o.color || INK, bold: !!o.bold, align: o.align || "left", anchor: o.anchor || "top" });
const oval = (s, l, t, d, fill, text) => { s.p.push({ k: "ov", l, t, w: d, h: d, fill }); tx(s, l, t, d, d, text, { font: "Poppins", size: 14, color: WHITE, bold: true, align: "center", anchor: "middle" }); };
const ln = (s, x1, y1, x2, y2, color, o = {}) => s.p.push({ k: "ln", x1, y1, x2, y2, color, w: o.w || 2, arrow: !!o.arrow, dash: !!o.dash });

// ---- N1: nine apps ----
{
  const s = S("FISKO-ERP-GOV  |  9 APPS", "9 แอป บนแพลตฟอร์มเดียว");
  const cols = [
    { x: 81, c: G, h: "วางแผน ซื้อ จ่าย", sub: "โมดูล 2 3 4", cards: [
      ["02", "Budgeting", "Fisko Budget (B1 ถึง B11) ยุทธศาสตร์ คำขอ กลั่นกรอง ส่ง สงป. จัดสรร โอน ติดตาม ผลสัมฤทธิ์"],
      ["03", "Procurement", "Fisko Procurement (P1 ถึง P13) แผน ใบขอซื้อ แฟ้มจัดซื้อ TOR e-GP ผู้ขาย"],
      ["04", "Finance and Accounting", "Fisko Finance (F1 ถึง F10) ผูกพัน ใบขอเบิก GFMIS เงินยืม รับเงิน กระทบยอด ปิดงวด"]] },
    { x: 514, c: NAVY, h: "สัญญา ครุภัณฑ์ วัสดุ", sub: "โมดูล 5 6 7", cards: [
      ["05", "Agreement and Contract", "Fisko Contract (C1 ถึง C4) ทะเบียนสัญญา ข้อตกลงนอกการจัดซื้อ เฝ้ากำหนดเวลา แผนงวดจ่าย"],
      ["06", "Assets", "Fisko Assets (A1 ถึง A6) ทะเบียน รับเข้าจากสัญญา โอน ตรวจนับ ค่าเสื่อมราคา จำหน่าย"],
      ["07", "Inventory", "Fisko Inventory (I1 ถึง I6) ทะเบียนวัสดุ ใบเบิก รับเข้า บัตรคุม ตรวจนับ ห้ามสต็อกติดลบ"]] },
    { x: 948, c: NAVY2, h: "รากฐาน คน และ AI", sub: "โมดูล 1 8 และ HR", cards: [
      ["01", "Organization Structure", "Fisko Organization (O1 ถึง O3) หน่วยงาน ตำแหน่ง ขั้นอนุมัติตามวงเงินที่ทุกแอปใช้ร่วม"],
      ["08", "AI ช่วยจัดการ", "Fisko AI (X1 ถึง X3) ทะเบียน Agent ทุกโมดูล รัน Agent ใหม่ ทะเบียนการใช้ AI คนยืนยันทุกครั้ง"],
      ["+", "HR (เพิ่มเติม)", "Fisko HR (H1 ถึง H4) ทะเบียนบุคลากร ใบเบิกค่าใช้จ่าย รอบเงินเดือนแบบง่าย"]] },
  ];
  cols.forEach(c => {
    rr(s, c.x, 191, 412, 56, c.c); tx(s, c.x + 25, 191, 260, 56, c.h, { font: "Poppins", size: 16, color: WHITE, bold: true, anchor: "middle" }); tx(s, c.x + 260, 191, 135, 56, c.sub, { size: 14, color: "E4E5F2", align: "right", anchor: "middle" });
    c.cards.forEach((k, i) => { const t = 258 + i * 118; rr(s, c.x, t, 412, 108, CARD); oval(s, c.x + 18, t + 28, 52, c.c, k[0]); tx(s, c.x + 86, t + 10, 312, 26, k[1], { size: 15, bold: true }); tx(s, c.x + 86, t + 36, 312, 68, k[2], { size: 14, color: SUB }); });
  });
  rr(s, 81, 626, 1279, 96, NAVY);
  tx(s, 112, 626, 1220, 96, "Fisko Budget, Procurement และ Finance คือฐานเดิมของ Fisko ส่วน Organization, Contract, Assets, Inventory, AI และ HR เพิ่มตามขอบเขตของ ERP-Government (Odoo 15) ที่เขียนใหม่ในรูปแบบของ Fisko ข้อมูลทั้งหมดเป็นข้อมูลตัวอย่าง", { size: 14, color: "6FE07A", bold: true, anchor: "middle" });
}

// ---- N2: provenance ----
{
  const s = S("FISKO-ERP-GOV  |  PROVENANCE", "แต่ละโมดูลมาจากไหน");
  const X = [81, 285, 610, 935], W = [200, 321, 321, 425];
  const head = ["โมดูล", "ใช้ซ้ำจาก Fisko", "เพิ่มจากขอบเขต ERP-Government", "เขียนใหม่ในรอบนี้"];
  const rows = [
    ["1 Organization", "หน่วยงาน ผู้ใช้ 8 บทบาท M10", "operating_unit, tier_validation", "O1 ถึง O3 ผัง ตำแหน่ง ขั้นอนุมัติตามวงเงิน"],
    ["2 Budgeting", "ทั้งโมดูล B1 ถึง B11", "ไม่ใช้ (budget_control อยู่ในระบบบัญชี Odoo)", "ไม่มี รับหน่วยและขั้นอนุมัติจากโมดูล 1"],
    ["3 Procurement", "ทั้งโมดูล P1 ถึง P13 และพอร์ทัลผู้ขาย", "แนวคิดใบขอซื้อและตรวจรับ Fisko มีครบแล้ว", "รับข้อเสนอเติมสต็อกจากโมดูลวัสดุ"],
    ["4 Finance", "ทั้งโมดูล F1 ถึง F10", "แนวคิดเงินยืม ภาษีหัก ณ ที่จ่าย ไฟล์ KTB มีครบแล้ว", "ผู้ตรวจใบสำคัญ 1 และ 2 ตามชนิดงบและวงเงิน"],
    ["5 Contract", "วงจรสัญญา P7 (ใช้ข้อมูลชุดเดิม)", "agreement, contract, invoice plan", "C1 ถึง C4 ข้อตกลงนอกการจัดซื้อ เฝ้ากำหนดเวลา"],
    ["6 Assets", "ไม่มี", "account_asset_management, transfer, low_value", "A1 ถึง A6 ทะเบียน โอน ตรวจนับ ค่าเสื่อมราคา"],
    ["7 Inventory", "ไม่มี", "stock_request, stock_card, stock_no_negative", "I1 ถึง I6 ใบเบิก รับเข้า บัตรคุม ปรับยอด"],
    ["8 AI", "แชท AI และ Agent AG-01 ถึง AG-22", "ไม่มี (ERP ไม่มีโมดูล AI)", "X1 ถึง X3 และ Agent AG-30 ถึง AG-33"],
    ["+ HR", "ไม่มี", "hr_department_code, hr_expense", "H1 ถึง H4 บุคลากร ใบเบิก เงินเดือนแบบง่าย"],
  ];
  rr(s, 81, 186, 1279, 40, NAVY); head.forEach((h, i) => tx(s, X[i] + 12, 186, W[i] - 16, 40, h, { size: 14.5, color: WHITE, bold: true, anchor: "middle" }));
  rows.forEach((r, j) => { const t = 230 + j * 50; rr(s, 81, t, 1279, 46, j % 2 ? WHITE : CARD, j % 2 ? LINE : null); r.forEach((c, i) => tx(s, X[i] + 12, t, W[i] - 16, 46, c, { size: 14, color: i === 0 ? INK : SUB, bold: i === 0, anchor: "middle" })); });
  tx(s, 81, 686, 1279, 40, "ส่วนที่เพิ่มจาก ERP-Government คืออ่านขอบเขตจากรายการโมดูลของ Odoo แล้วเขียนกฎใหม่ในรูปแบบของ Fisko ไม่ได้นำโค้ด Odoo มาใช้ ERP-Government ไม่มีโมดูลเงินเดือนหรือการลา", { size: 14, color: SUB });
}

// ---- N3: cross-module flow ----
{
  const s = S("FISKO-ERP-GOV  |  DATA FLOW", "ข้อมูลไหลข้ามโมดูลอย่างไร");
  rr(s, 81, 186, 1279, 52, NAVY2); tx(s, 106, 186, 1230, 52, "1 Organization : หน่วยงาน ตำแหน่ง และขั้นอนุมัติตามวงเงิน (O3) ทุกโมดูลอ่านชุดเดียวกัน", { size: 14, color: WHITE, bold: true, anchor: "middle" });
  const bw = 250, bh = 84, X = [81, 420, 760, 1110];
  const box = (x, y, num, name, sub, color) => { rr(s, x, y, bw, bh, color); tx(s, x + 14, y + 8, bw - 28, 26, `${num} ${name}`, { font: "Poppins", size: 14, color: WHITE, bold: true }); tx(s, x + 14, y + 38, bw - 28, 42, sub, { size: 13, color: "E4E5F2" }); };
  const y1 = 300, y2 = 470;
  box(X[0], y1, "2", "Budgeting", "บรรทัดจัดสรร ยอดสี่ระดับ จอง ผูกพัน เบิกจ่าย", G);
  box(X[1], y1, "3", "Procurement", "แผน ใบขอซื้อ แฟ้มจัดซื้อ จนถึงทำสัญญา", G);
  box(X[2], y1, "5", "Contract", "สัญญา งวดงาน หลักประกัน ตรวจรับ", NAVY);
  box(X[3], y1, "4", "Finance", "ใบขอเบิก GFMIS จ่ายเงิน ปิดงวด", G);
  box(X[1], y2, "7", "Inventory", "รับเข้า เบิก จ่าย ห้ามสต็อกติดลบ", NAVY);
  box(X[2], y2, "6", "Assets", "ขึ้นทะเบียน โอน ตรวจนับ ค่าเสื่อม", NAVY);
  box(X[3], y2, "+", "HR", "บุคลากร ใบเบิกค่าใช้จ่าย เงินเดือน", NAVY2);
  const lab = (x, y, w, t) => tx(s, x, y, w, 30, t, { size: 13, color: SUB, align: "left" });
  const cy = y1 + bh / 2;
  ln(s, X[0] + bw, cy, X[1], cy, INK, { arrow: true }); lab(X[0] + bw + 8, cy - 30, 80, "จองงบ");
  ln(s, X[1] + bw, cy, X[2], cy, INK, { arrow: true }); lab(X[1] + bw + 8, cy - 30, 80, "สัญญา");
  ln(s, X[2] + bw, cy, X[3], cy, INK, { arrow: true }); lab(X[2] + bw + 8, cy - 30, 100, "งวดตรวจรับ");
  ln(s, X[2] + bw / 2, y1 + bh, X[2] + bw / 2, y2, INK, { arrow: true }); lab(X[2] + bw / 2 + 6, y1 + bh + 20, 140, "งวดที่ตรวจรับ");
  ln(s, X[3] + 60, y2, X[3] + 60, y1 + bh, INK, { arrow: true }); lab(X[3] + 66, y1 + bh + 20, 150, "ใบเบิก เงินเดือน");
  ln(s, X[2] + bw - 20, y2, X[3] + 20, y1 + bh, INK, { arrow: true }); lab(X[2] + bw + 40, y2 - 8, 110, "ค่าเสื่อม");
  ln(s, X[1] + bw / 2, y1 + bh, X[1] + bw / 2, y2, INK, { arrow: true, dash: true }); lab(X[1] + bw / 2 + 6, y1 + bh + 20, 190, "ข้อเสนอเติมสต็อก");
  // paid amounts go back to Budgeting along the top
  const yt = y1 - 26; ln(s, X[3] + bw / 2, y1, X[3] + bw / 2, yt, G, { w: 2.5 }); ln(s, X[3] + bw / 2, yt, X[0] + bw / 2, yt, G, { w: 2.5 }); ln(s, X[0] + bw / 2, yt, X[0] + bw / 2, y1, G, { w: 2.5, arrow: true });
  tx(s, X[1], yt - 24, 700, 22, "ยอดเบิกจ่ายส่งกลับ Budgeting (ยอดจ่ายของยอดสี่ระดับ)", { size: 13, color: G, bold: true });
  rr(s, 81, 610, 1279, 92, G); tx(s, 106, 610, 1230, 92, "8 AI ช่วยจัดการ : Agent ของทุกโมดูลอ่านข้อมูลตามสิทธิ์ผู้ใช้ แสดงขั้นตอนและข้อพบ แล้วหยุดรอคนยืนยันก่อนทุกการแจ้งหรือแก้ข้อมูล ไม่อนุมัติ ไม่จ่ายเงิน ไม่ลงนามเอง", { size: 14, color: WHITE, bold: true, anchor: "middle" });
  tx(s, 81, 712, 1279, 36, "เส้นประคือข้อเสนอที่คนต้องตัดสินใจเอง ระบบแจ้งเตือนแต่ไม่สร้างใบขอซื้อให้อัตโนมัติ ค่าเสื่อมและเงินเดือนแจ้งการเงินไปทำใบขอเบิก ระบบไม่ลงบัญชีให้", { size: 13, color: SUB });
}

// ---- N4: roles and tiers ----
{
  const s = S("FISKO-ERP-GOV  |  ROLES AND APPROVALS", "บทบาทของกองคลังและขั้นอนุมัติ");
  const roles = [["fin", "การเงินและบัญชี", "จัดทำใบขอเบิก วางฎีกา จัดสรร โอน กันเงิน"], ["finhead", "หัวหน้าการเงิน", "ตรวจได้ทั้งสองกลุ่ม ตรวจการจ่ายประจำวัน ปิดงวด"], ["vchk1", "ผู้ตรวจใบสำคัญ 1", "งบดำเนินงาน เดินทาง สวัสดิการ จัดซื้อไม่เกิน 100,000 บาท"], ["vchk2", "ผู้ตรวจใบสำคัญ 2", "งบลงทุน ก่อสร้าง ที่ปรึกษา จัดซื้อเกิน 100,000 บาท"],
    ["proc", "ฝ่ายพัสดุ", "จัดหา บริหารสัญญา และทำรายการครุภัณฑ์ วัสดุ"], ["asset / store", "ทะเบียนครุภัณฑ์ / คลังวัสดุ", "ขึ้นทะเบียน โอน นับ / รับ เบิก จ่าย ปรับยอด"], ["hr", "ทรัพยากรบุคคล", "ทะเบียนบุคลากร ใบเบิกค่าใช้จ่าย เงินเดือน"]];
  tx(s, 81, 186, 640, 28, "บทบาทที่เกี่ยวกับกองคลัง", { font: "Poppins", size: 16, bold: true });
  roles.forEach((r, i) => { const t = 224 + i * 62; rr(s, 81, t, 640, 56, CARD); tx(s, 96, t, 120, 56, r[0], { font: "Poppins", size: 13, color: G, bold: true, anchor: "middle" }); tx(s, 222, t + 6, 490, 22, r[1], { size: 14, bold: true }); tx(s, 222, t + 28, 490, 24, r[2], { size: 13, color: SUB }); });
  tx(s, 760, 186, 600, 28, "ขั้นอนุมัติตามวงเงิน (ค่าตัวอย่าง)", { font: "Poppins", size: 16, bold: true });
  const tiers = [["โอน/ย้ายครุภัณฑ์", "ต่ำกว่า 100,000 ทะเบียนครุภัณฑ์", "ตั้งแต่ 100,000 ผู้บริหาร"], ["จำหน่ายครุภัณฑ์", "ผู้บริหารทุกรายการ", ""], ["เบิกวัสดุ", "ต่ำกว่า 20,000 คลังวัสดุ", "ตั้งแต่ 20,000 ผู้บริหาร"], ["ปรับยอดวัสดุ", "ต่ำกว่า 10,000 คลังวัสดุ", "ตั้งแต่ 10,000 ผู้บริหาร"], ["ข้อตกลงนอกจัดซื้อ", "ต่ำกว่า 500,000 หัวหน้าพัสดุ", "ตั้งแต่ 500,000 ผู้บริหาร"], ["ใบเบิกพนักงาน", "ต่ำกว่า 20,000 HR", "ตั้งแต่ 20,000 ผู้บริหาร"]];
  rr(s, 760, 224, 600, 36, NAVY); tx(s, 772, 224, 180, 36, "เอกสาร", { size: 14, color: WHITE, bold: true, anchor: "middle" }); tx(s, 955, 224, 400, 36, "ผู้อนุมัติ", { size: 14, color: WHITE, bold: true, anchor: "middle" });
  tiers.forEach((r, i) => { const t = 264 + i * 54; rr(s, 760, t, 600, 50, i % 2 ? WHITE : CARD, i % 2 ? LINE : null); tx(s, 772, t, 180, 50, r[0], { size: 14, bold: true, anchor: "middle" }); tx(s, 955, t + 4, 400, 42, r[2] ? r[1] + "\n" + r[2] : r[1], { size: 13, color: SUB, anchor: "middle" }); });
  rr(s, 760, 596, 600, 100, NAVY); tx(s, 780, 596, 560, 100, "ตารางนี้ตั้งที่ O3 โดยผู้ดูแลระบบ เอกสารทุกชนิดต้องมีขั้น ทุกวงเงิน อย่างน้อยหนึ่งขั้น คนที่ขอหรือทำเอกสารอนุมัติของตนเองไม่ได้", { size: 14, color: "6FE07A", bold: true, anchor: "middle" });
  tx(s, 81, 662, 640, 60, "ยังไม่แยกบทบาทบัญชีและบริหารงบประมาณออกจากการเงิน (ยังเป็นบทบาท fin เดียว)", { size: 14, color: AMBER, bold: true });
}

// ---- N5: status ----
{
  const s = S("FISKO-ERP-GOV  |  STATUS AND LIMITS", "สถานะและข้อจำกัด");
  const cols = [
    { x: 81, c: G, h: "ทดสอบแล้ว", items: ["ชุดทดสอบเดิมของ Fisko รันเต็ม 13,563 รายการ ผ่านทั้งหมด ทุกบทบาท 2 หน่วยงาน ไทยและอังกฤษ", "เปิดหน้าใหม่ครบทุกบทบาท ไม่มีค่า undefined หรือ NaN", "สคริปต์ลองขั้นตอนจริงของส่วนที่เพิ่ม: ใบเบิกวัสดุ ครุภัณฑ์ ข้อตกลง ใบเบิกพนักงาน เงินเดือน กลุ่มผู้ตรวจใบสำคัญ"] },
    { x: 514, c: AMBER, h: "จำลอง", items: ["Agent และ AI ทุกตัวใช้กฎกับข้อมูลตัวอย่าง ไม่ได้เรียกโมเดลภาษา", "OCR อ่านเอกสารแบบจำลอง", "GFMIS, e-GP, KTB, สงป. เป็นไฟล์หรือบันทึกด้วยมือ ไม่ได้เชื่อมต่อจริง"] },
    { x: 948, c: NAVY2, h: "ยังไม่ทำ", items: ["เชื่อม Smart HR และน้องก่อ", "ยานพาหนะ สถานที่ สารบรรณ ประมาณการรายได้ ค่า K ยื่นแบบภาษี เงินบำเหน็จบำนาญ", "แยกบทบาทบัญชีและบริหารงบประมาณ ตรวจมือถือและโหมดมืดของหน้าใหม่"] },
  ];
  cols.forEach(c => { rr(s, c.x, 191, 412, 56, c.c); tx(s, c.x + 25, 191, 360, 56, c.h, { font: "Poppins", size: 16, color: WHITE, bold: true, anchor: "middle" });
    c.items.forEach((it, i) => { const t = 258 + i * 120; rr(s, c.x, t, 412, 110, CARD); tx(s, c.x + 20, t + 8, 372, 96, it, { size: 14, color: INK, anchor: "middle" }); }); });
  rr(s, 81, 628, 1279, 84, NAVY); tx(s, 112, 628, 1220, 84, "ข้อมูลทั้งหมดเป็นข้อมูลตัวอย่าง หมวดครุภัณฑ์ อายุใช้งาน อัตราเงินเดือนหักและเกณฑ์ขั้นอนุมัติเป็นค่าตัวอย่าง ต้องตรวจกับระเบียบก่อนใช้จริง", { size: 14, color: "6FE07A", bold: true, anchor: "middle" });
}
require("fs").writeFileSync(process.argv[2], JSON.stringify(slides));
console.log(slides.length + " slides");
