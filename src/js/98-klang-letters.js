// KlangFinance, round R7: official letters drafted by the system, signed, numbered and sent; and the incoming-letter
// register of the general administration unit. Written new for the DPT finance division (MoM 2 Nov 2569: standard letters
// and forms should come out of the system on schedule; duty list: general administration, correspondence).
// IMPORTANT: the templates below are SAMPLES of mine, embedded because the user has no real forms yet ("ฝังแบบสมมุติ").
// They are not DPT's forms and do not follow the Office of the Prime Minister's rules on correspondence (letter headings,
// salutations, closings, copy lines). Every drafted letter says so in its first line. Real forms must replace them.
// "Automatic" here means: drafts are created when the conditions hold, the next time someone opens the letters page or
// presses the button (a static prototype has no background clock). Nothing is sent, e-signed or filed anywhere outside the
// prototype; "sent" is a record the user makes after sending the letter by their own channel.
const LT_ACT = ["fin", "finhead", "proc", "prochead"]; // who drafts, numbers and sends; sample assumption
const LT_IN = ["fin", "finhead", "proc", "prochead", "admin"]; // who registers incoming letters; the general administration unit has no role of its own yet
const LT_PREFIX = "ที่ คล "; // sample outgoing number prefix
const LT_MARK = "[แบบสมมุติ ไม่ใช่แบบหนังสือราชการตามระเบียบสารบรรณ]";
const ltActor = () => LT_ACT.includes(ROLE);
const LT_ROLES = KROLES.filter(r => !["div", "divhead"].includes(r));
const LT_MISS = "[ต้องระบุ:";
const ltMissing = x => ((x.subject || "") + (x.to || "") + (x.body || "")).split(LT_MISS).length - 1;
function ltFill(text, ctx) { return String(text).replace(/\{\{(\w+)\}\}/g, (m, k) => (ctx && ctx[k] != null && ctx[k] !== "" ? String(ctx[k]) : `${LT_MISS} ${k}]`)); }
const ltBE = d => { const [y, m, dd] = d.split("-").map(Number), M = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."]; return `${dd} ${M[m - 1]} ${y + 543}`; };

// Sample templates. vars name the placeholders the system fills from a record; the rest are typed in by the person editing.
const LT_TPL_SEED = [
  { id: "T1", name: "แจ้งหลักประกันสัญญาใกล้หมดอายุ", kind: "external", sign: "exec", to: "{{vendor}}", subject: "ขอให้ต่ออายุหนังสือค้ำประกันตามสัญญาเลขที่ {{contractNo}}", vars: "contractNo vendor guarNo bank amount expires",
    body: "ตามที่ท่านได้ทำสัญญาเลขที่ {{contractNo}} กับกรมโยธาธิการและผังเมือง โดยวางหลักประกันสัญญาเป็นหนังสือค้ำประกันเลขที่ {{guarNo}} ของ {{bank}} จำนวน {{amount}} บาท นั้น\nหลักประกันดังกล่าวจะสิ้นผลในวันที่ {{expires}} ซึ่งเป็นช่วงที่สัญญายังมีผลบังคับ จึงขอให้ท่านดำเนินการต่ออายุหรือจัดหาหลักประกันใหม่ ส่งให้กองบริหารการคลังก่อนวันดังกล่าว" },
  { id: "T2", name: "แจ้งเรียกค่าปรับ", kind: "external", sign: "exec", to: "{{vendor}}", subject: "แจ้งค่าปรับตามสัญญาเลขที่ {{contractNo}}", vars: "contractNo vendor penalty",
    body: "ตามสัญญาเลขที่ {{contractNo}} ปรากฏว่ามีการส่งมอบงานล่าช้ากว่ากำหนด ทำให้ท่านต้องชำระค่าปรับเป็นเงิน {{penalty}} บาท ตามเงื่อนไขของสัญญา\nจึงขอแจ้งให้ท่านชำระค่าปรับดังกล่าวภายในวันที่ {{payBy}}" },
  { id: "T3", name: "ส่งมอบสินทรัพย์ให้องค์กรปกครองส่วนท้องถิ่น", kind: "external", sign: "exec", to: "{{lgu}}", subject: "ส่งมอบ{{workName}}", vars: "workName assetNo cost location lgu",
    body: "กรมโยธาธิการและผังเมืองได้ดำเนินการ{{workName}} ณ {{location}} แล้วเสร็จ มูลค่า {{cost}} บาท (เลขสินทรัพย์ {{assetNo}}) จึงขอส่งมอบให้ {{lgu}} เพื่อดูแลรักษาและใช้ประโยชน์ต่อไป\nขอให้ท่านตรวจรับและแจ้งผลการรับมอบให้ทราบ" },
  { id: "T4", name: "ขอรับจัดสรรเงินสำรองจ่ายเพื่อกรณีฉุกเฉินหรือจำเป็น", kind: "external", sign: "exec", to: "ผู้อำนวยการสำนักงบประมาณ", subject: "ขอรับจัดสรรงบประมาณรายการเงินสำรองจ่ายเพื่อกรณีฉุกเฉินหรือจำเป็น", vars: "purpose amount fy",
    body: "กรมโยธาธิการและผังเมืองมีความจำเป็นต้องใช้จ่ายเพื่อ {{purpose}} เป็นเงิน {{amount}} บาท ในปีงบประมาณ {{fy}} ซึ่งไม่ได้ตั้งงบประมาณไว้\nจึงขอรับจัดสรรงบประมาณรายการเงินสำรองจ่ายเพื่อกรณีฉุกเฉินหรือจำเป็น ตามจำนวนดังกล่าว" },
  { id: "T5", name: "ขออนุมัติเงินชดเชยค่า K", kind: "memo", sign: "finhead", to: "{{approver}}", subject: "ขออนุมัติ{{direction}}เงินชดเชยค่างาน (ค่า K) สัญญาเลขที่ {{contractNo}}", vars: "contractNo period base k amount direction approver",
    body: "สัญญาเลขที่ {{contractNo}} งวดงานเดือน {{period}} มูลค่างานที่ทำได้ {{base}} บาท ค่า K เท่ากับ {{k}} คำนวณได้เงินชดเชยที่ต้อง{{direction}} จำนวน {{amount}} บาท\nจึงเรียนมาเพื่อโปรดพิจารณาอนุมัติ" },
  { id: "T6", name: "แจ้งผลอนุมัติถอนคืนเงิน", kind: "external", sign: "finhead", to: "{{payer}}", subject: "แจ้งผลการอนุมัติถอนคืนเงิน อ้างถึงใบเสร็จรับเงินเลขที่ {{receipt}}", vars: "payer receipt amount",
    body: "ตามที่ท่านขอให้ถอนคืนเงินตามใบเสร็จรับเงินเลขที่ {{receipt}} นั้น กรมฯ พิจารณาแล้วอนุมัติให้ถอนคืนเป็นเงิน {{amount}} บาท\nขอให้ท่านแจ้งเลขที่บัญชีและเอกสารประกอบการรับเงิน มายังกองบริหารการคลัง" },
];
const LT_KIND = { external: ["หนังสือภายนอก", "External letter"], memo: ["บันทึกข้อความ", "Memo"] };
const ltTpl = id => (S.ltpl || []).find(t => t.id === id);

// Rules: when a record needs a letter. Each returns candidates { key, ref, ctx } (the key keeps one draft per event).
const LT_RULES = {
  T1: () => (S.contracts || []).filter(c => ["expiring", "expired"].includes(guarSt(c)) && c.guarantee).map(c => ({ key: `T1|${c.id}|${c.guarantee.expires}`, ref: c.id, ctx: { contractNo: c.no, vendor: tx(c.vendor), guarNo: c.guarantee.no, bank: c.guarantee.bank, amount: fmt(c.guarantee.amount), expires: ltBE(c.guarantee.expires) } })),
  T2: () => (S.contracts || []).filter(c => conPenalty(c) > 0).map(c => ({ key: `T2|${c.id}|${conPenalty(c)}`, ref: c.id, ctx: { contractNo: c.no, vendor: tx(c.vendor), penalty: fmt(conPenalty(c)) } })),
  T3: () => (S.cwip || []).filter(x => x.status === "cap").map(x => ({ key: `T3|${x.id}`, ref: x.id, ctx: { workName: x.name, assetNo: x.cap.assetNo, cost: fmt(x.cap.cost), location: x.loc } })),
  T4: () => (S.cres || []).filter(x => x.status === "approved").map(x => ({ key: `T4|${x.id}`, ref: x.id, ctx: { purpose: x.purpose, amount: fmt(x.amount), fy: x.fy } })),
  T5: () => (S.kfac || []).filter(x => x.status === "submitted").map(x => ({ key: `T5|${x.id}`, ref: x.id, ctx: { contractNo: (kfCon(x) || {}).no || x.contract, period: x.period, base: fmt(x.base), k: x.k.toFixed(4), amount: fmt(Math.abs(kfComp(x))), direction: kfComp(x) >= 0 ? "จ่ายเพิ่ม" : "เรียกคืน", approver: tx(ROLES[tierRole("kfac", Math.abs(kfComp(x)))]) } })),
  T6: () => (S.refunds || []).filter(x => x.status === "approved").map(x => ({ key: `T6|${x.id}`, ref: x.id, ctx: { payer: x.payer, receipt: x.ref, amount: fmt(x.amount) } })),
};
function ltCandidates() {
  const out = [];
  Object.keys(LT_RULES).forEach(t => { const tpl = ltTpl(t); if (tpl && tpl.on !== false) LT_RULES[t]().forEach(c => { if (!(S.letters || []).some(l => l.key === c.key)) out.push({ tpl, ...c }); }); });
  return out;
}
function ltAuto() {
  const c = ltCandidates();
  c.forEach(x => S.letters.push({ id: eNextId("LT-", S.letters), tpl: x.tpl.id, key: x.key, ref: x.ref, auto: true, subject: ltFill(x.tpl.subject, x.ctx), to: ltFill(x.tpl.to, x.ctx), body: ltFill(x.tpl.body, x.ctx), status: "draft", by: "system", t: nowIso(), log: [] }));
  if (c.length) { audit(["ระบบร่างหนังสืออัตโนมัติ", "The system drafted letters"], `${c.length}`); commit(); }
  return c.length;
}
const ltSeq = () => { const used = (S.letters || []).filter(l => l.no).length, base = (S.ltBase || 0); return base + used + 1; };

// ---------- seed ----------
Object.keys(SEEDS).forEach(k => {
  const prev = SEEDS[k].seed;
  SEEDS[k].seed = () => {
    const s = prev(), fn = (s.users.find(u => u.role === "fin") || s.users[0]).id, pr = (s.users.find(u => u.role === "proc") || s.users[0]).id, fh = (s.users.find(u => u.role === "finhead") || s.users[0]).id, kids = s.units.filter(u => u.parent);
    s.ltpl = LT_TPL_SEED.map(t => ({ ...t, on: true }));
    s.letters = [{ id: "LT-0001", tpl: "", key: "", ref: "", auto: false, subject: "ขอส่งข้อมูลเงินกันเหลื่อมปีประจำปีงบประมาณ 2569", to: "ผู้อำนวยการสำนักบริหารจัดการข้อมูลตัวอย่าง", body: "กองบริหารการคลังขอให้ส่งข้อมูลเงินกันเหลื่อมปีของหน่วยงานท่านภายในกำหนด (ตัวอย่างข้อความ)", status: "sent", by: fn, t: "2026-10-05T09:00", signed: { by: fh, t: "2026-10-06T09:00" }, no: LT_PREFIX + "0001/" + CUR_FY, sentAt: "2026-10-07", log: [] }];
    s.inbox = [{ id: "IB-0001", no: "รับ 0001/" + CUR_FY, dateRecv: "2026-10-12", from: "สำนักงานการตรวจเงินแผ่นดิน (ตัวอย่าง)", refNo: "ที่ ตผ 0000/123", subject: "ขอข้อมูลเอกสารประกอบการเบิกจ่ายของสัญญาก่อสร้าง", unit: "", due: "2026-10-20", status: "received", pid: "", note: "", by: fn, t: "2026-10-12T10:00" },
      { id: "IB-0002", no: "รับ 0002/" + CUR_FY, dateRecv: "2026-10-01", from: "กรมบัญชีกลาง (ตัวอย่าง)", refNo: "ที่ กค 0000/456", subject: "แจ้งปรับปรุงขั้นตอนการเบิกจ่ายผ่านระบบ", unit: (kids[0] || s.units[0]).id, due: "2026-10-10", status: "assigned", pid: "", note: "", by: fn, t: "2026-10-01T09:00" },
      { id: "IB-0003", no: "รับ 0003/" + CUR_FY, dateRecv: "2026-10-08", from: "ผู้รับจ้างตัวอย่าง", refNo: "ที่ ตย 12/2569", subject: "ขอขยายระยะเวลาทำการตามสัญญา", unit: (kids[1] || s.units[0]).id, due: "2026-10-30", status: "done", pid: "", note: "ส่งพัสดุพิจารณาแล้ว ตอบกลับตามหนังสือ LT-0001", by: pr, t: "2026-10-08T10:00" }];
    return s;
  };
});

// ---------- letters ----------
const LT_ST = { draft: [["ร่าง", "Draft"], "p-mute"], signing: [["รอลงนาม", "Awaiting signature"], "p-warn"], signed: [["ลงนามแล้ว รอออกเลขและส่ง", "Signed, to number and send"], "p-info"], sent: [["ออกเลขและส่งแล้ว", "Numbered and sent"], "p-ok"], cancelled: [["ยกเลิก", "Cancelled"], "p-mute"] };
const ltSigner = l => (ltTpl(l.tpl) || { sign: "finhead" }).sign;
CRUD.def("letter", {
  noun: ["หนังสือ", "Letter"], st: LT_ST, live: false,
  list: () => S.letters || [], id: l => l.id, title: l => `${l.id} · ${l.subject}`, sub: l => `${l.no || (l.auto ? L("ร่างโดยระบบ", "system draft") : L("ร่างเอง", "own draft"))} · ${l.to}`, status: l => l.status, gone: l => l.status === "cancelled", search: l => `${l.id} ${l.subject} ${l.to} ${l.no || ""}`,
  filters: [{ id: "st", label: ["สถานะ", "Status"], opts: () => Object.keys(LT_ST).map(k => [k, tx(LT_ST[k][0])]), get: l => l.status }, { id: "t", label: ["แบบ", "Template"], opts: () => (S.ltpl || []).map(t => [t.id, `${t.id} ${t.name}`]), get: l => l.tpl }],
  cols: [{ h: ["เลขที่ร่าง", "Draft"], c: l => `<span class="mono">${l.id}</span>` }, { h: ["เรื่อง", "Subject"], c: l => `<b style="font-weight:600">${esc(l.subject)}</b><div class="sub">${esc(l.to)}</div>` }, { h: ["แบบ", "Template"], c: l => (l.tpl ? l.tpl : "–") }, { h: ["ที่มา", "Origin"], c: l => (l.auto ? tag(L("ระบบร่าง", "System"), "p-info") : L("ร่างเอง", "Own")) },
    { h: ["เลขที่หนังสือ", "Number"], c: l => (l.no ? `<span class="mono">${esc(l.no)}</span>` : "–") }, { h: ["ต้องระบุเพิ่ม", "To fill"], n: true, c: l => (ltMissing(l) ? tag(String(ltMissing(l)), "p-warn") : "–") }],
  fields: (l, v) => (l ? [{ id: "subject", label: ["เรื่อง", "Subject"], req: true, wide: true, value: l.subject }, { id: "to", label: ["เรียน/ถึง", "To"], req: true, wide: true, value: l.to }, { id: "body", label: ["ข้อความ (ช่อง [ต้องระบุ: ...] ต้องแก้ให้ครบก่อนส่งลงนาม)", "Text (fill every [ต้องระบุ: ...] before sending for signature)"], type: "textarea", req: true, wide: true, value: l.body }]
    : [{ id: "tpl", label: ["แบบหนังสือ", "Template"], type: "select", req: true, value: "T1", opts: (S.ltpl || []).map(t => [t.id, `${t.id} ${t.name}`]) }]),
  check: v => [],
  create: { can: ltActor, label: ["ร่างหนังสือจากแบบ", "Draft from a template"], run: v => { const t = ltTpl(v.tpl), l = { id: eNextId("LT-", S.letters), tpl: t.id, key: "", ref: "", auto: false, subject: ltFill(t.subject, {}), to: ltFill(t.to, {}), body: ltFill(t.body, {}), status: "draft", by: me().id, t: nowIso(), log: [] }; S.letters.push(l); audit(["ร่างหนังสือจากแบบ", "Drafted a letter from a template"], `${l.id} ${t.id}`); return l; } },
  edit: { can: l => ltActor() && l.status === "draft", why: () => false, run: (l, v) => { Object.assign(l, { subject: v.subject, to: v.to, body: v.body }); audit(["แก้ร่างหนังสือ", "Edited a draft letter"], l.id); } },
  acts: l => {
    const out = [];
    if (l.status === "draft" && ltActor()) out.push({ id: "send", label: L("ส่งขอลงนาม", "Send for signature"), kind: "primary", confirm: `${L("ผู้ลงนาม", "Signer")}: ${tx(ROLES[ltSigner(l)])}${ltMissing(l) ? ` · ${L("ยังมีช่องที่ต้องระบุ", "blanks remain")} ${ltMissing(l)}` : ""}`, run: y => { if (ltMissing(y)) return L("ยังมีช่อง [ต้องระบุ: ...] ให้แก้ข้อความก่อน", "Fill the [ต้องระบุ: ...] blanks first"); y.status = "signing"; notify([ltSigner(y)], [`หนังสือ ${y.id} รอลงนาม`, `Letter ${y.id} awaits signature`], "lt-reg"); audit(["ส่งหนังสือขอลงนาม", "Sent a letter for signature"], y.id); return L("ส่งแล้ว", "Sent"); } }, { id: "cancel", label: L("ยกเลิกร่าง", "Cancel the draft"), kind: "danger", why: true, run: (y, why) => { y.status = "cancelled"; audit(["ยกเลิกร่างหนังสือ", "Cancelled a draft letter"], `${y.id} · ${why}`); return L("ยกเลิกแล้ว", "Cancelled"); } });
    if (l.status === "signing" && ROLE === ltSigner(l) && l.by !== me().id) out.push({ id: "sign", label: L("ลงนาม", "Sign"), kind: "primary", confirm: L("บันทึกว่าลงนามแล้ว (ไม่ใช่ลายเซ็นอิเล็กทรอนิกส์)", "Records the signature (not an electronic signature)"), run: y => { y.status = "signed"; y.signed = { by: me().id, t: nowIso() }; audit(["ลงนามหนังสือ", "Signed a letter"], y.id); notify(["fin", "finhead", "proc", "prochead"], [`หนังสือ ${y.id} ลงนามแล้ว ออกเลขและส่ง`, `Letter ${y.id} signed: number and send`], "lt-reg"); return L("ลงนามแล้ว", "Signed"); } }, { id: "back", label: L("ส่งกลับแก้ไข", "Return for changes"), kind: "danger", why: true, run: (y, why) => { y.status = "draft"; y.returned = why; audit(["ส่งหนังสือกลับแก้ไข", "Returned a letter"], `${y.id} · ${why}`); return L("ส่งกลับแล้ว", "Returned"); } });
    if (l.status === "signed" && ltActor()) out.push({ id: "number", label: L("ออกเลขและบันทึกว่าส่งแล้ว", "Number it and record as sent"), kind: "primary", confirm: `${LT_PREFIX}${String(ltSeq()).padStart(4, "0")}/${CUR_FY} · ${L("ระบบไม่ได้ส่งหนังสือให้ผู้รับ ส่งเองตามช่องทางที่ใช้ แล้วบันทึกที่นี่", "the system sends nothing; send it through your own channel and record it here")}`, run: y => { y.no = `${LT_PREFIX}${String(ltSeq()).padStart(4, "0")}/${CUR_FY}`; y.status = "sent"; y.sentAt = TODAY; audit(["ออกเลขและบันทึกส่งหนังสือ", "Numbered and recorded a letter as sent"], `${y.id} ${y.no}`); return `${L("ออกเลข", "Numbered")} ${y.no}`; } });
    out.push({ id: "dl", label: L("ดาวน์โหลดข้อความ (.txt)", "Download the text (.txt)"), kind: "ghost", undo: false, run: y => { const t = `${LT_MARK}\r\n\r\n${y.no ? y.no + "\r\n" : ""}${L("วันที่", "Date")} ${ltBE(y.sentAt || TODAY)}\r\n${L("เรื่อง", "Subject")} ${y.subject}\r\n${L("เรียน", "To")} ${y.to}\r\n\r\n${y.body}\r\n`; const b = new Blob(["﻿" + t], { type: "text/plain;charset=utf-8" }), a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = `${y.id}.txt`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); return L("ดาวน์โหลดแล้ว", "Downloaded"); } });
    return out;
  },
  view: l => kv([[L("เลขที่ร่าง", "Draft no."), `<span class="mono">${l.id}</span>`], l.no && [L("เลขที่หนังสือ", "Letter no."), `<span class="mono">${esc(l.no)}</span>`], [L("แบบ", "Template"), l.tpl ? `${l.tpl} · ${esc((ltTpl(l.tpl) || {}).name || "")}` : L("ไม่ใช้แบบ", "none")], [L("ที่มา", "Origin"), l.auto ? `${L("ระบบร่างอัตโนมัติจาก", "System draft from")} ${esc(l.ref)}` : L("ร่างเอง", "Drafted by hand")],
    [L("เรื่อง", "Subject"), esc(l.subject)], [L("เรียน/ถึง", "To"), esc(l.to)], [L("ผู้ลงนามตามแบบ", "Signer by template"), esc(tx(ROLES[ltSigner(l)]))], l.signed && [L("ลงนาม", "Signed"), `${esc(userName(l.signed.by))} · ${fdate(l.signed.t, true)}`], l.sentAt && [L("ส่งเมื่อ", "Sent on"), fdate(l.sentAt)], l.returned && [L("ส่งกลับเพราะ", "Returned because"), esc(l.returned)]])
    + `<div style="margin-top:8px;padding:10px;border:1px solid var(--line);border-radius:6px;white-space:pre-wrap;font-family:inherit">${esc(l.body).replace(/\[ต้องระบุ:[^\]]*\]/g, m => `<mark>${m}</mark>`)}</div><p class="sub">${esc(LT_MARK)}</p>`,
});

// ---------- incoming register ----------
const IB_ST = { received: [["รับแล้ว รอมอบหมาย", "Received, to assign"], "p-warn"], assigned: [["มอบหมายแล้ว", "Assigned"], "p-info"], done: [["ดำเนินการแล้ว", "Done"], "p-ok"] };
const ibOver = x => x.status !== "done" && x.due && x.due < TODAY;
const ibVisible = x => !(ROLE === "div" || ROLE === "divhead") || x.unit === me().unit;
const ibActor = () => LT_IN.includes(ROLE);
CRUD.def("inbox", {
  noun: ["หนังสือรับ", "Incoming letter"], st: IB_ST, live: false,
  list: () => (S.inbox || []).filter(ibVisible), id: x => x.id, title: x => `${x.no} · ${x.subject}`, sub: x => `${x.from} · ${x.refNo}`, status: x => x.status, search: x => `${x.id} ${x.no} ${x.from} ${x.subject} ${x.refNo}`,
  filters: [{ id: "st", label: ["สถานะ", "Status"], opts: () => Object.keys(IB_ST).map(k => [k, tx(IB_ST[k][0])]), get: x => x.status }, { id: "o", label: ["เลยกำหนด", "Overdue"], opts: () => [["1", L("เลยกำหนด", "Overdue")]], get: x => (ibOver(x) ? "1" : "") }],
  cols: [{ h: ["เลขรับ", "No."], c: x => `<span class="mono">${esc(x.no)}</span>` }, { h: ["เรื่อง", "Subject"], c: x => `<b style="font-weight:600">${esc(x.subject)}</b><div class="sub">${esc(x.from)} · ${esc(x.refNo)}</div>` }, { h: ["วันที่รับ", "Received"], c: x => fdate(x.dateRecv) }, { h: ["มอบให้", "Assigned to"], c: x => (x.unit ? esc(unitName(x.unit)) : "–") },
    { h: ["กำหนด", "Due"], c: x => (x.due ? `${fdate(x.due)}${ibOver(x) ? " " + tag(L("เลยกำหนด", "overdue"), "p-bad") : ""}` : "–") }],
  fields: (x, v) => [{ id: "from", label: ["จาก (หน่วยงาน/บุคคล)", "From"], req: true, wide: true, value: x ? x.from : "" }, { id: "refNo", label: ["เลขที่หนังสือที่รับ", "Letter's own number"], req: true, value: x ? x.refNo : "" }, { id: "dateRecv", label: ["วันที่รับ", "Date received"], type: "date", req: true, value: x ? x.dateRecv : TODAY },
    { id: "subject", label: ["เรื่อง", "Subject"], req: true, wide: true, value: x ? x.subject : "" }, { id: "unit", label: ["มอบหมายให้หน่วย", "Assign to unit"], type: "select", blank: L("ยังไม่มอบหมาย", "Not assigned"), value: x ? x.unit : "", opts: unitOpts() }, { id: "due", label: ["กำหนดตอบ/ดำเนินการ", "Due"], type: "date", value: x ? x.due : "" },
    { id: "pid", label: ["รหัสโครงการที่เกี่ยวข้อง (ถ้ามี)", "Related Project ID (if any)"], type: "select", blank: L("ไม่ระบุ", "None"), value: x ? x.pid : "", opts: (S.pplan || []).map(p => [p.pid, `${p.pid} ${tx(p.name)}`]) }, { id: "note", label: ["หมายเหตุ", "Note"], type: "textarea", wide: true, value: x ? x.note : "" }],
  check: v => [...(v.dateRecv > TODAY ? [{ f: "dateRecv", m: L("วันที่รับต้องไม่เกินวันนี้", "Date can't be in the future") }] : []), ...(v.due && v.due < v.dateRecv ? [{ f: "due", m: L("กำหนดต้องไม่ก่อนวันที่รับ", "Due can't be before the date received") }] : [])],
  create: { can: ibActor, label: ["ลงทะเบียนรับหนังสือ", "Register an incoming letter"], run: v => { const n = (S.inbox || []).length + 1, x = { id: eNextId("IB-", S.inbox), no: `รับ ${String(n).padStart(4, "0")}/${CUR_FY}`, dateRecv: v.dateRecv, from: v.from, refNo: v.refNo, subject: v.subject, unit: v.unit || "", due: v.due || "", status: v.unit ? "assigned" : "received", pid: v.pid || "", note: v.note || "", by: me().id, t: nowIso() }; S.inbox.push(x); audit(["ลงทะเบียนรับหนังสือ", "Registered an incoming letter"], `${x.no} ${x.subject}`); if (x.unit) notify(["div", "divhead"], [`มีหนังสือรับ ${x.no} มอบหมายให้หน่วยของท่าน`, `Incoming letter ${x.no} assigned to your unit`], "lt-in"); return x; } },
  edit: { can: x => ibActor() && x.status !== "done", why: () => false, run: (x, v) => { const had = x.unit; Object.assign(x, { from: v.from, refNo: v.refNo, dateRecv: v.dateRecv, subject: v.subject, unit: v.unit || "", due: v.due || "", pid: v.pid || "", note: v.note || "" }); if (x.unit && x.status === "received") x.status = "assigned"; if (!x.unit && x.status === "assigned") x.status = "received"; audit(["แก้หนังสือรับ", "Edited an incoming letter"], x.id); if (x.unit && x.unit !== had) notify(["div", "divhead"], [`มีหนังสือรับ ${x.no} มอบหมายให้หน่วยของท่าน`, `Incoming letter ${x.no} assigned to your unit`], "lt-in"); } },
  acts: x => (x.status !== "done" && (ibActor() || ((ROLE === "div" || ROLE === "divhead") && x.unit === me().unit)) && x.unit ? [{ id: "done", label: L("บันทึกว่าดำเนินการแล้ว", "Record as done"), kind: "primary", why: true, whyLabel: L("ผลการดำเนินการ (อย่างน้อย 10 ตัวอักษร)", "What was done (at least 10 characters)"), run: (y, why) => { y.status = "done"; y.note = (y.note ? y.note + " | " : "") + why; y.doneAt = nowIso(); audit(["บันทึกดำเนินการหนังสือรับ", "Recorded an incoming letter as done"], `${y.id} · ${why}`); return L("บันทึกแล้ว", "Recorded"); } }] : []),
  view: x => kv([[L("เลขรับ", "Received no."), `<span class="mono">${esc(x.no)}</span>`], [L("จาก", "From"), esc(x.from)], [L("เลขที่หนังสือ", "Letter's number"), esc(x.refNo)], [L("วันที่รับ", "Received"), fdate(x.dateRecv)], [L("เรื่อง", "Subject"), esc(x.subject)], [L("มอบหมายให้", "Assigned to"), x.unit ? esc(unitName(x.unit)) : "–"], [L("กำหนด", "Due"), x.due ? fdate(x.due) : "–"], x.pid && [L("รหัสโครงการ", "Project ID"), `<span class="mono">${x.pid}</span>`], x.note && [L("หมายเหตุ/ผล", "Note"), esc(x.note)]]),
});

// ---------- templates (editable) ----------
CRUD.def("ltpl", {
  noun: ["แบบหนังสือ", "Letter template"], st: { on: [["ใช้งาน", "Active"], "p-ok"], off: [["ปิดใช้", "Off"], "p-mute"] }, live: false,
  list: () => S.ltpl || [], id: t => t.id, title: t => `${t.id} · ${t.name}`, sub: t => `${tx(LT_KIND[t.kind])} · ${L("ผู้ลงนาม", "signer")} ${tx(ROLES[t.sign])}`, status: t => (t.on === false ? "off" : "on"),
  cols: [{ h: ["แบบ", "Template"], c: t => `<span class="mono">${t.id}</span>` }, { h: ["ชื่อ", "Name"], c: t => esc(t.name) }, { h: ["ชนิด", "Kind"], c: t => esc(tx(LT_KIND[t.kind])) }, { h: ["ผู้ลงนาม", "Signer"], c: t => esc(tx(ROLES[t.sign])) }, { h: ["ร่างอัตโนมัติเมื่อ", "Auto-draft when"], c: t => esc(LT_WHEN[t.id] || "–") }],
  fields: (t, v) => [{ id: "name", label: ["ชื่อแบบ", "Name"], req: true, wide: true, value: t.name }, { id: "subject", label: ["เรื่อง", "Subject"], req: true, wide: true, value: t.subject }, { id: "to", label: ["เรียน/ถึง", "To"], req: true, wide: true, value: t.to }, { id: "body", label: ["ข้อความของแบบ ({{ชื่อช่อง}} คือช่องที่ระบบเติม)", "Body ({{name}} marks a field the system fills)"], type: "textarea", req: true, wide: true, value: t.body },
    { id: "on", label: ["ให้ระบบร่างอัตโนมัติ", "Draft automatically"], type: "check", value: t.on !== false }],
  check: v => { const bad = (v.body.match(/\{\{(\w+)\}\}/g) || []).length === 0 ? [] : []; return bad; },
  edit: { can: () => ["finhead", "exec", "admin"].includes(ROLE), why: () => true, run: (t, v, why) => { Object.assign(t, { name: v.name, subject: v.subject, to: v.to, body: v.body, on: !!v.on }); audit(["แก้แบบหนังสือ", "Edited a letter template"], `${t.id} · ${why}`); } },
  view: t => kv([[L("ชนิด", "Kind"), esc(tx(LT_KIND[t.kind]))], [L("ผู้ลงนาม", "Signer"), esc(tx(ROLES[t.sign]))], [L("ร่างอัตโนมัติเมื่อ", "Auto-draft when"), esc(LT_WHEN[t.id] || "–")], [L("ช่องที่ระบบเติม", "Fields the system fills"), `<span class="mono">${esc(t.vars)}</span>`], [L("เรื่อง", "Subject"), esc(t.subject)], [L("เรียน/ถึง", "To"), esc(t.to)]]) + `<div style="margin-top:8px;padding:10px;border:1px solid var(--line);border-radius:6px;white-space:pre-wrap">${esc(t.body)}</div><p class="sub">${esc(LT_MARK)}</p>`,
});
const LT_WHEN = { T1: "หลักประกันสัญญาใกล้หมดหรือหมดอายุ", T2: "สัญญามีค่าปรับสะสมมากกว่า 0", T3: "งานก่อสร้างขึ้นเป็นสินทรัพย์แล้ว รอส่งมอบ", T4: "คำขอเงินสำรองจ่ายอนุมัติภายในแล้ว", T5: "ค่า K ส่งขออนุมัติแล้ว", T6: "การถอนคืนอนุมัติแล้ว" };

// ---------- pages ----------
const LT_APP = "DPT Finance";
Object.assign(GROUPS, { ltg: ["หนังสือและสารบรรณ", "Letters and correspondence"] });
APPS.finance.groups.push("ltg");
{ const base = appOfLink; appOfLink = l => (typeof l === "string" && l.startsWith("lt-") ? "finance" : base(l)); }
ePageDef("finance", "lt-reg", "LT1", "ltg", LT_ROLES, ["ร่างและออกหนังสือ", "Draft and issue letters"], () => {
  const L_ = S.letters || [], cand = ltCandidates().length;
  return `${eHead(LT_APP, "LT1", ["ร่างและออกหนังสือ", "Draft and issue letters"], ["ระบบร่างหนังสือให้เมื่อเข้าเงื่อนไข (หลักประกันใกล้หมด ค่าปรับ ส่งมอบสินทรัพย์ ขอเงินสำรองจ่าย ค่า K ถอนคืน) แล้วส่งลงนาม ออกเลข และบันทึกการส่ง · **แบบหนังสือเป็นแบบสมมุติของผม ยังไม่ใช่แบบทางการ** · ร่างอัตโนมัติเกิดเมื่อมีคนเปิดหน้านี้หรือกดปุ่ม (ต้นแบบไม่มีนาฬิกาเบื้องหลัง) · ระบบไม่ได้ส่งหนังสือให้ผู้รับ", "The system drafts letters when conditions hold, then they go to signature, get a number and are recorded as sent · **the templates are my samples, not official forms** · automatic drafts appear when someone opens this page or presses the button (the prototype has no background clock) · nothing is sent to recipients"])}
    ${eKpis([[L("รอลงนาม", "Awaiting signature"), L_.filter(l => l.status === "signing").length, "", L_.some(l => l.status === "signing")], [L("ลงนามแล้ว รอส่ง", "Signed, to send"), L_.filter(l => l.status === "signed").length], [L("ร่าง", "Drafts"), L_.filter(l => l.status === "draft").length], [L("ส่งแล้ว", "Sent"), L_.filter(l => l.status === "sent").length]])}
    <section class="panel"><div class="body row"><button class="btn" type="button" id="lt-auto" ${ltActor() ? "" : "disabled"}>${L("ตรวจเงื่อนไขและร่างหนังสือ", "Check conditions and draft letters")}</button><span class="sub">${cand ? L(`มีเรื่องที่ยังไม่ได้ร่าง ${cand} เรื่อง`, `${cand} events without a draft`) : L("ไม่มีเรื่องที่ต้องร่างเพิ่ม", "Nothing more to draft")}</span></div></section>
    ${crudList("letter", { head: `<h2>${L("หนังสือ", "Letters")}</h2>` })}`;
}, () => { const b = $("#lt-auto"); if (b) b.onclick = () => { const n = ltAuto(); toast(n ? L(`ร่างหนังสือ ${n} ฉบับ`, `Drafted ${n} letters`) : L("ไม่มีเรื่องที่ต้องร่างเพิ่ม", "Nothing more to draft")); route(); }; });
ePageDef("finance", "lt-tpl", "LT2", "ltg", LT_ROLES, ["แบบหนังสือ", "Letter templates"], () => `${eHead(LT_APP, "LT2", ["แบบหนังสือ (สมมุติ)", "Letter templates (sample)"], ["แบบที่ฝังไว้ 6 แบบ ผูกกับเหตุการณ์ในระบบ แก้ข้อความได้ (หัวหน้าการเงิน ผู้บริหาร ผู้ดูแลระบบ ต้องมีเหตุผล) · เป็นแบบสมมุติ ไม่ใช่แบบทางการ ต้องเปลี่ยนเป็นแบบจริงเมื่อมี และถ้าแบบจริงมีรูปแบบต่างจากนี้ (หัวหนังสือ ส่วนท้าย สำเนา) ต้องปรับระบบเพิ่ม", "Six embedded templates tied to events in the system; the text can be edited (head of finance, executive, admin, with a reason) · samples, not official; replace them when the real forms exist, and if the real forms are laid out differently (headings, closings, copy lines) the system needs more work"])}
  ${crudList("ltpl", { head: `<h2>${L("แบบ", "Templates")}</h2>` })}`);
ePageDef("finance", "lt-in", "LT3", "ltg", KROLES, ["ทะเบียนหนังสือรับ", "Incoming letter register"], () => {
  const I = (S.inbox || []).filter(ibVisible);
  return `${eHead(LT_APP, "LT3", ["ทะเบียนหนังสือรับ", "Incoming letter register"], ["ลงทะเบียนรับหนังสือ ออกเลขรับ มอบหมายหน่วย ติดตามกำหนดและผลดำเนินการ ผูกรหัสโครงการได้ · หน้าที่ฝ่ายบริหารงานทั่วไป (สารบรรณ) · ไม่ได้เก็บไฟล์หนังสือ ไม่ได้รับจากระบบสารบรรณอิเล็กทรอนิกส์กลาง · หน่วยงานเห็นเฉพาะที่มอบหมายให้ตน", "Register incoming letters, number them, assign units, follow due dates and outcomes, link a Project ID · a general administration duty · no files are kept and nothing is received from a central e-correspondence system · units see only what is assigned to them"])}
    ${eKpis([[L("หนังสือรับทั้งหมด", "All"), I.length], [L("รอมอบหมาย", "To assign"), I.filter(x => x.status === "received").length, "", I.some(x => x.status === "received")], [L("เลยกำหนด", "Overdue"), I.filter(ibOver).length, "", I.some(ibOver)], [L("ดำเนินการแล้ว", "Done"), I.filter(x => x.status === "done").length]])}
    ${crudList("inbox", { head: `<h2>${L("หนังสือรับ", "Incoming letters")}</h2>` })}`;
});
{
  const base = famTasks;
  famTasks = R => {
    base(R);
    if (!S.letters) return;
    if (ltActor()) { const c = ltCandidates().length; if (c) R(L(`มีเรื่องที่ควรร่างหนังสือ ${c} เรื่อง`, `${c} events need a letter drafted`), "", TODAY, "lt-reg", "p-info"); S.letters.filter(l => l.status === "signed").forEach(l => R(`${L("ออกเลขและส่งหนังสือ", "Number and send")} ${l.id}`, l.subject, TODAY, "lt-reg", "p-warn")); }
    S.letters.filter(l => l.status === "signing" && ROLE === ltSigner(l) && l.by !== me().id).forEach(l => R(`${L("ลงนามหนังสือ", "Sign a letter")} ${l.id}`, l.subject, TODAY, "lt-reg", "p-warn"));
    if (ibActor()) (S.inbox || []).filter(x => x.status === "received" || ibOver(x)).forEach(x => R(`${x.status === "received" ? L("มอบหมายหนังสือรับ", "Assign an incoming letter") : L("หนังสือรับเลยกำหนด", "Incoming letter overdue")} ${x.no}`, x.subject, x.due || TODAY, "lt-in", ibOver(x) ? "p-bad" : "p-warn"));
    if (ROLE === "div" || ROLE === "divhead") (S.inbox || []).filter(x => x.unit === me().unit && x.status !== "done").forEach(x => R(`${L("หนังสือรับที่มอบหมายให้หน่วย", "Incoming letter for your unit")} ${x.no}`, x.subject, x.due || TODAY, "lt-in", ibOver(x) ? "p-bad" : "p-info"));
  };
}
Object.assign(NAV_ICON, { "lt-reg": "file", "lt-tpl": "clipboard", "lt-in": "inbox" });
