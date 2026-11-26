// KlangFinance, round P91 (25 Nov 2569): the sample of FY 2570 shaped like the department's follow-up files
// (asked for: "ใช้ข้อมูลในนี้เป็นตัวอย่างในการทำข้อมูล", folder "ติดตามเร่งรัดการเบิกจ่าย ประจำปีงบประมาณ พ.ศ. 2570").
// Only the SHAPE is taken from the files, nothing else: the share of each type of work (ก่อสร้าง ~70%, จ้างที่ปรึกษา ~10%, ครุภัณฑ์ ~17%,
// ดำเนินการเอง ~3%, งบเงินอุดหนุน), central against regional (~70/30), one-year against multi-year, the share at each procurement stage
// (from the summary of 1,268 items, FY 2569), the average amount of each type, and the money plan spread over the year (the disbursement
// plans of the central and regional offices). Every item name, contractor, contract number, PO and GF number here is MADE UP and
// marked "(สมมติ)". Provinces are real place names; the regional offices are named after them.
// Data: bi row .trk = { stage, d{...}, egp, winner, price, con{no,date,amount,start,end,days,po,adv}, work, act[12], problem, qty{} }.
// The follow-up form takes a value from .trk only where the system has none (a case or a contract keeps its own data).

const S70_TYPES = [ // [type, kind of budget, share, mean M, stage shares, one-year share]
  ["สิ่งก่อสร้าง", "งบลงทุน", 0.70, 10.4, { cancel: .012, ref: .03, draft: .007, invite: .01, bid: .21, wait: .27, signed: .461 }, .33],
  ["จ้างที่ปรึกษา", "งบรายจ่ายอื่น", 0.10, 4.7, { invite: .57, wait: .14, signed: .29 }, .17],
  ["ครุภัณฑ์", "งบลงทุน", 0.17, 0.92, { cancel: .02, tor: .03, signed: .95 }, 1],
  ["ดำเนินการเอง", "งบดำเนินงาน", 0.025, 16.5, { signed: 1 }, 1],
  ["งบเงินอุดหนุน", "งบเงินอุดหนุน", 0.005, 30, { signed: 1 }, 1]];
const S70_PROV = ["เชียงราย", "เชียงใหม่", "น่าน", "ลำปาง", "พิษณุโลก", "ขอนแก่น", "อุบลราชธานี", "นครราชสีมา", "ชลบุรี", "ระยอง", "นครศรีธรรมราช", "สงขลา", "ปัตตานี", "ยะลา", "นราธิวาส", "สุราษฎร์ธานี"];
const S70_WORK = { "สิ่งก่อสร้าง": ["ก่อสร้างเขื่อนป้องกันตลิ่งริมแม่น้ำ", "ก่อสร้างระบบระบายน้ำ", "ปรับปรุงภูมิทัศน์พื้นที่สาธารณะ", "ก่อสร้างอาคารอเนกประสงค์", "ก่อสร้างถนนและทางเท้า"], "จ้างที่ปรึกษา": ["จ้างที่ปรึกษาสำรวจออกแบบ", "จ้างที่ปรึกษาจัดทำผังเมืองรวม", "จ้างที่ปรึกษาศึกษาความเหมาะสม"], "ครุภัณฑ์": ["เครื่องคอมพิวเตอร์", "รถบรรทุกเทท้าย", "เครื่องสำรวจรังวัด", "เครื่องปรับอากาศ"], "ดำเนินการเอง": ["งานบำรุงรักษาเขื่อนป้องกันตลิ่ง", "งานซ่อมแซมระบบระบายน้ำ"], "งบเงินอุดหนุน": ["เงินอุดหนุนโครงการพัฒนาพื้นที่"] };
const S70_PROD = { "สิ่งก่อสร้าง": "โครงการป้องกันและบรรเทาอุทกภัย", "จ้างที่ปรึกษา": "ผลผลิตการวางและจัดทำผังเมือง", "ครุภัณฑ์": "ผลผลิตการบริหารจัดการ", "ดำเนินการเอง": "โครงการป้องกันและบรรเทาอุทกภัย", "งบเงินอุดหนุน": "โครงการพัฒนาเมือง" };
const S70_PLAN = [.02, .03, .05, .06, .07, .08, .09, .1, .11, .12, .13, .14]; // the money plan over the year (rises to September, as in the files)
const S70_ORDER = ["cancel", "tor", "tordone", "ref", "refok", "draft", "invite", "bid", "wait", "signed"];

function s70Rng(seed) { let x = seed >>> 0; return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; }; }
function s70Units(s) { // a regional office per province (named after it), under the department
  const top = s.units.find(u => !u.parent); S70_PROV.forEach((p, i) => { const id = "UR" + String(i + 1).padStart(2, "0"); if (!s.units.some(u => u.id === id)) s.units.push({ id, code: "R" + String(i + 1).padStart(2, "0"), parent: top.id, name: [`สำนักงานโยธาธิการและผังเมืองจังหวัด${p}`, `Provincial office ${p}`], region: 1, prov: p }); }); }
const s70Day = (d, n) => new Date(Date.parse(d + "T00:00:00Z") + n * 864e5).toISOString().slice(0, 10);
function s70Make(s, fy, n) { fy = fy || 2570; n = n || 120; const R = s70Rng(fy * 7 + n), pick = a => a[Math.floor(R() * a.length)];
  s70Units(s); const central = s.units.filter(u => u.parent && !u.region && !u.retired), regional = s.units.filter(u => u.region), rows = [], y0 = fy - 543 - 1; // the year starts 1 Oct of y0
  let no = 0; S70_TYPES.forEach(([type, kind, share, mean, st, one]) => { const cnt = Math.max(1, Math.round(n * share));
    const stages = []; Object.entries(st).forEach(([k, v]) => { for (let i = 0; i < Math.round(v * cnt); i++) stages.push(k); }); while (stages.length < cnt) stages.push("signed"); stages.length = cnt;
    for (let i = 0; i < cnt; i++) { no++; const reg = type === "สิ่งก่อสร้าง" || type === "ครุภัณฑ์" ? R() < 0.31 : false, u = reg ? pick(regional) : pick(central), prov = reg ? u.prov : pick(S70_PROV), yrs = R() < one ? "ปีเดียว" : "ผูกพัน";
      const amt = Math.round(Math.max(0.05, mean * (0.3 + R() * 1.4)) * 1e4) * 100, thisYear = yrs === "ผูกพัน" ? Math.round(amt * (0.25 + R() * 0.2) / 100) * 100 : amt, len = 100 * (2 + Math.floor(R() * 12));
      const work = pick(S70_WORK[type]), name = type === "สิ่งก่อสร้าง" ? `${work} (ตัวอย่าง) จังหวัด${prov}${/เขื่อน|ถนน|ระบาย/.test(work) ? ` ความยาวไม่น้อยกว่า ${len} เมตร` : ""} 1 แห่ง` : type === "ครุภัณฑ์" ? `${work} (ตัวอย่าง) ${1 + Math.floor(R() * 20)} ชุด` : `${work} (ตัวอย่าง) จังหวัด${prov}`;
      const plan = S70_PLAN.map(f => Math.round(thisYear * f)); plan[11] += thisYear - plan.reduce((a, b) => a + b, 0);
      const stage = stages[i], t = { stage, d: {}, qty: /เมตร/.test(name) ? { qLen: len } : {} }, si = S70_ORDER.indexOf(stage);
      const steps = [["survey", 1, 0], ["design", 2, 12], ["est", 3, 20], ["tor", 2, 28], ["plan", 3, 32], ["ref", 3, 36], ["refok", 4, 40], ["req", 4, 42], ["draft", 5, 46], ["invite", 6, 54], ["bid", 7, 66], ["consider", 7, 72], ["approve", 8, 80], ["winner", 8, 82], ["call", 8, 92], ["offer", 9, 95], ["sign", 9, 98]];
      const last = Math.max(0, ...steps.filter(x => si >= x[1]).map(x => x[2])), base = s70Day(TODAY, -(last + 5 + Math.floor(R() * (stage === "signed" ? 200 : 40))));
      if (stage !== "cancel") steps.forEach(([k, need, off]) => { if (si >= need) t.d[k] = s70Day(base, off + Math.floor(R() * 4)); });
      if (si >= S70_ORDER.indexOf("draft") || stage === "signed") t.egp = `EGP${fy}-${String(no).padStart(5, "0")} (สมมติ)`;
      if (si >= S70_ORDER.indexOf("ref")) t.ref = Math.round(thisYear * (yrs === "ผูกพัน" ? amt / thisYear : 1) * (0.97 + R() * 0.03) / 100) * 100;
      if (si >= S70_ORDER.indexOf("bid")) { t.round = R() < 0.15 ? 2 : 1; }
      if (si >= S70_ORDER.indexOf("wait")) { t.winner = `บริษัท ตัวอย่างการช่าง ${1 + Math.floor(R() * 40)} จำกัด (สมมติ)`; t.price = Math.round(amt * (0.86 + R() * 0.1) / 100) * 100; }
      if (stage === "signed") { const days = type === "สิ่งก่อสร้าง" ? 180 + Math.floor(R() * 360) : 60 + Math.floor(R() * 90), start = s70Day(t.d.sign, 1), adv = type === "สิ่งก่อสร้าง" && amt > 5e6 && R() < 0.5;
        t.con = { no: `สมมติ ${String(no).padStart(3, "0")}/${fy}`, date: t.d.sign, amount: t.price || Math.round(amt * 0.93), start, end: s70Day(start, days - 1), days, po: `PO-สมมติ-${String(no).padStart(4, "0")}`, adv: adv ? Math.round((t.price || amt) * 0.15) : 0, gf: adv ? `GF-สมมติ-${String(no).padStart(6, "0")}` : "" };
        t.act = Array(12).fill(0); const fy0 = `${y0}-10-01`, mi = d => (d < fy0 ? 0 : Math.min(11, prMonIdx(d))), m0 = mi(s70Day(t.d.sign, 20)), paidTo = mi(TODAY);
        if (t.con.adv && m0 <= paidTo) t.act[m0] += t.con.adv; if (type !== "สิ่งก่อสร้าง") { if (m0 <= paidTo) t.act[m0] += Math.min(thisYear, t.con.amount); } else for (let m = m0 + 1; m <= paidTo; m++) t.act[m] += Math.round(thisYear * (0.08 + R() * 0.06));
        const tot = t.act.reduce((a, b) => a + b, 0); if (tot > thisYear) { const f = thisYear / tot; t.act = t.act.map(v => Math.round(v * f)); }
        t.work = type === "สิ่งก่อสร้าง" ? Math.min(100, Math.round(t.act.reduce((a, b) => a + b, 0) / thisYear * 100 + R() * 10)) : 100; }
      if (stage === "cancel") t.problem = "ชะลอดำเนินการ รอผลการทบทวนแบบ (ตัวอย่าง)"; else if (stage === "bid" && R() < 0.2) t.problem = "มีผู้อุทธรณ์ผลการพิจารณา (ตัวอย่าง)"; else if (stage === "signed" && type === "สิ่งก่อสร้าง" && R() < 0.12) t.problem = "ผู้รับจ้างเข้าพื้นที่ล่าช้าเนื่องจากฝนตกต่อเนื่อง (ตัวอย่าง)";
      rows.push({ id: `S70-${String(no).padStart(4, "0")}`, no, unit: u.id, unitName: tx(u.name), code: `1500${String(7000000 + no * 137).slice(-7)}${String(no).padStart(4, "0")}`.slice(0, 20), prog: "แผนงานตัวอย่าง", prod: S70_PROD[type], name, kind, type, years: yrs, qty: 1, uname: "แห่ง", amount: thisYear, plan, ebud: String(9000 + no * 7), note: "ข้อมูลตัวอย่างสมมติ", fy, sent: { t: nowIso(), by: "", pp: "", sample: 1 },
        pl: { startY: yrs === "ผูกพัน" ? fy - (R() < 0.4 ? 1 : 0) : fy, act: "ตาม พ.ร.บ.", prod: S70_PROD[type], years: yrs, prov, total: Math.round(amt / 1e6 * 1e4) / 1e4, yrs: { [fy]: Math.round(thisYear / 1e6 * 1e4) / 1e4, ...(yrs === "ผูกพัน" ? { [fy + 1]: Math.round((amt - thisYear) / 1e6 * 1e4) / 1e4 } : {}) } }, trk: t }); } });
  return rows; }
function s70Load(s, fy) { const d = (s.bi = s.bi || { rows: [], files: [], log: [] }); d.rows = (d.rows || []).filter(r => !(r.trk && biFy(r) === (fy || 2570))).concat(s70Make(s, fy)); d.src = d.src || "sample70"; d.log = d.log || []; d.log.push({ fy: fy || 2570, at: nowIso(), by: (s.users.find(u => u.role === "plan") || {}).id || "", files: ["ข้อมูลตัวอย่างตามรูปแบบไฟล์ติดตามเร่งรัดการเบิกจ่าย 2570 (สมมติ)"], n: d.rows.filter(r => r.trk).length }); }

// ---------- the follow-up form, the payments and the stages read .trk where the system has nothing ----------
const s70Bi = id => ((S.bi && S.bi.rows) || []).find(x => x.id === id);
{ const base = prDtRows; prDtRows = function (fy, onlyCon) { const rows = base(fy, onlyCon); rows.forEach(r => { const b = s70Bi(r.id); if (b && b.trk && !r.k && b.trk.act) r.act = b.trk.act.slice(); }); return rows; }; }
{ const base = prTrackBook; prTrackBook = function (fy) { const book = base(fy), D = prDtRows(fy, false);
    book[0].rows.slice(5).forEach((row, i) => { const r = D[i], b = r && s70Bi(r.id), t = b && b.trk; if (!t || r.k) return; const d = t.d, set = (c, v) => { if (v !== "" && v != null && !sptHas(row[c])) row[c] = v; }, be = x => (x ? prBE(x) : "");
      set(8, b.type); set(22, be(d.survey)); set(23, be(d.design)); set(24, be(d.est)); set(25, be(d.tor)); set(26, t.egp); set(27, be(d.plan)); set(28, t.ref ? prM(t.ref) : ""); set(29, be(d.refok)); set(30, be(d.req));
      set(31, d.draft ? `${be(d.draft)} - ${be(s70Day(d.draft, 3))}` : ""); set(32, d.invite ? `${be(d.invite)} - ${be(s70Day(d.invite, 10))}` : ""); set(33, be(d.bid)); set(34, d.consider ? `${be(d.consider)} - ${be(s70Day(d.consider, 5))}` : ""); set(35, t.round); set(36, t.winner); set(37, t.price ? prM(t.price) : "");
      set(41, be(d.approve)); set(42, be(d.winner)); set(43, be(d.call)); set(44, be(d.offer)); if (t.qty.qLen) set(50, t.qty.qLen);
      const c = t.con; if (c) { set(45, c.no); set(46, `${c.no} ${be(c.date)}`); set(47, prM(c.amount)); set(48, `${be(c.start)} - ${be(c.end)}`); set(49, c.days); set(54, c.po); if (c.adv) set(55, prM(c.adv)); }
      if (t.work != null) row[56] = t.work; const paid = (t.act || []).reduce((a, v) => a + v, 0); if (paid) { row[57] = prM(paid); row[58] = r.alloc ? Math.round(paid / r.alloc * 10000) / 100 : 0; }
      row[59] = t.stage === "cancel" ? "ชะลอดำเนินการ" : t.stage === "signed" ? (t.work >= 100 ? "ส่งมอบงานแล้ว" : "ลงนามสัญญาแล้ว อยู่ระหว่างดำเนินงาน") : S70_ORDER.indexOf(t.stage) >= 5 ? "อยู่ระหว่างดำเนินการจัดซื้อจัดจ้าง" : "อยู่ระหว่างจัดทำ TOR/ออกแบบ"; if (t.problem) set(60, t.problem); });
    return book; }; }
// the 67-column export: the extra columns of the revised form
{ const base = m88Track67; m88Track67 = function (fy) { const book = base(fy), D = prDtRows(fy, false);
    book[0].rows.slice(5).forEach((row, i) => { const r = D[i], b = r && s70Bi(r.id), t = b && b.trk; if (!t || r.k) return; if (t.price && !row[36] && t.stage !== "invite") row[36] = prM(t.price); if (t.d.winner && !row[42]) row[42] = prBE(egp7AppealEnd(t.d.winner)); if (t.con && !row[46]) row[46] = prBE(t.con.date); }); return book; }; flSpendBook = () => m88Track67(BI.fy); }

// ---------- loading: a button on the import tab, and once for a fresh demo when FY 2570 has no items ----------
{ const base = pdImp; pdImp = function (fy) { const h = base(fy); return biCanImport() ? h.replace(/(<button class="btn" type="button" id="bi-sample">[^<]*<\/button>)/, `$1<button class="btn" type="button" id="s70-load">ใช้ข้อมูลตัวอย่างตามไฟล์ติดตามเร่งรัด 2570 (สมมติ)</button>`) : h; }; }
document.addEventListener("click", e => { if (!(e.target && e.target.closest && e.target.closest("#s70-load"))) return; if (!biCanImport()) return; s70Load(S, BI.fy); audit(["โหลดข้อมูลตัวอย่างตามไฟล์ติดตามเร่งรัด (สมมติ)", "Loaded the sample shaped like the follow-up files"], String(BI.fy)); BI.view = "dash"; commit(); route(); toast(`โหลดข้อมูลตัวอย่าง ${S.bi.rows.filter(r => r.trk && biFy(r) === BI.fy).length} รายการแล้ว (ข้อมูลสมมติ)`); });
{ const base = route; route = function () { try { if (typeof S !== "undefined" && S && S.users && !window.KLANG_TEST && !S.s70 && !((S.bi && S.bi.rows) || []).some(r => biFy(r) === 2570)) { S.s70 = 1; s70Load(S, 2570); } } catch (e) {} return base.apply(this, arguments); }; }
