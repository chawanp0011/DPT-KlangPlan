// ---------- P99: เตรียมคำของบประมาณ with sample data, and sample files that always load ----------
// Asked for: "เตรียมคำของบประมาณ แก้ไขพร้อมตัวอย่างข้อมูล ตอนนี้ใช้งานไม่ได้". The page of the department (กรมโยธาธิการและผังเมือง) had
// no case, and the sample files come by fetch from the folder ตัวอย่างเอกสารโครงการ, which fails when the page is opened as a file or
// published alone. Now:
//   - rmFetchSample falls back to text files written here (fictional, with the same headings), so the buttons work anywhere;
//   - "ใส่ข้อมูลตัวอย่าง" (and once, by itself, when the year has no case) makes four fictional cases through the real steps:
//     รอรับ (sent by a unit), ประมวลผลแล้ว, รอหน่วยงานแก้ไข, พร้อมส่ง สงป.
const RM99_TXT = [
  ["01_ข้อเสนอโครงการ.md", t => `# ข้อเสนอโครงการ\nชื่อโครงการ: ${t}\nหน่วยงาน: สำนัก/กองตัวอย่าง (สมมติ)\nหลักการและเหตุผล: ปรับปรุงบริการประชาชนในพื้นที่ (ข้อมูลสมมติ)\nวัตถุประสงค์: เพื่อให้บริการได้รวดเร็วขึ้น\nเป้าหมาย: 1 แห่ง\nระยะเวลาดำเนินการ: 180 วัน\nงบประมาณ: 4,500,000 บาท\nผลผลิต/โครงการ: โครงการตัวอย่าง\nตัวชี้วัด: ประชาชนพึงพอใจไม่น้อยกว่าร้อยละ 80\n`],
  ["02_ขอบเขตของงาน_TOR.md", t => `# ขอบเขตของงาน (TOR)\nงาน: ${t}\nคุณสมบัติผู้เสนอราคา: นิติบุคคลที่จดทะเบียนถูกต้อง\nระยะเวลาส่งมอบ: 180 วัน แบ่งจ่าย 3 งวด\nราคากลาง: 4,500,000 บาท\nหลักประกันสัญญา: ร้อยละ 5\n`],
  ["03_รายการค่าใช้จ่าย_BOQ.csv", () => `รายการ,จำนวน,หน่วย,ราคาต่อหน่วย,รวม\nงานโครงสร้าง,1,งาน,2500000,2500000\nงานสถาปัตยกรรม,1,งาน,1200000,1200000\nงานระบบ,1,งาน,800000,800000\nรวม,,,,4500000\n`],
  ["04_ราคากลาง.md", () => `# ตารางแสดงวงเงินงบประมาณที่ได้รับจัดสรรและราคากลาง\nราคากลาง: 4,500,000 บาท\nวันที่กำหนดราคากลาง: (สมมติ)\nผู้กำหนดราคากลาง: คณะกรรมการตัวอย่าง\n`]];
{ const base = rmFetchSample; rmFetchSample = async function (i) { try { return await base(i); } catch (e) { const t = ((RM_SAMPLES[i] || [])[0] || "โครงการตัวอย่าง").replace(/^[A-Z]_/, "").replace(/_/g, " ");
    return RM99_TXT.map(([n, f]) => new File([f(t + " (ตัวอย่าง)")], n, { type: "text/plain" })); } }; }

const RM99 = { busy: false, msg: "" };
async function rm99Seed() { if (RM99.busy) return "กำลังสร้างข้อมูลตัวอย่าง"; RM99.busy = true; const r0 = ROLE, s0 = SESSION, done = [];
  const as = (role, unit) => { const u = S.users.find(x => x.role === role && (!unit || x.unit === unit) && x.active !== false); if (!u) throw new Error("ไม่มีผู้ใช้บทบาท " + role); SESSION = { user: u.id }; ROLE = role; return u; };
  const divs = [...new Set(S.users.filter(u => u.role === "div" && u.active !== false).map(u => u.unit))];
  const T = [["ก่อสร้างอาคารศูนย์บริการประชาชน (ตัวอย่าง)", 0, "sent"], ["จัดซื้อครุภัณฑ์คอมพิวเตอร์ (ตัวอย่าง)", 1, "processed"], ["อบรมพัฒนาบุคลากรด้านดิจิทัล (ตัวอย่าง)", 2, "forwarded"], ["ปรับปรุงระบบระบายน้ำในชุมชน (ตัวอย่าง)", 0, "ready"]];
  try { for (let k = 0; k < T.length; k++) { const [title, smp, goal] = T[k]; as("div", divs[k % Math.max(1, divs.length)]); const id = rmCreate({ title }); const c = rmCase(id); if (!c) throw new Error(id);
      await rmAddFiles(id, await rmFetchSample(smp)); let m = rmSend(id); if (m) throw new Error(m); done.push(id); if (goal === "sent") continue;
      as("plan"); m = rmReceive(id) || rmProcess(id); if (m) throw new Error(m); if (goal === "processed") continue;
      if (goal === "forwarded") { m = rmForward(id, "โปรดแนบเอกสารที่ขาดและตรวจรายการค่าใช้จ่าย (ตัวอย่าง)"); if (m) throw new Error(m); continue; }
      rmOpen(c).filter(x => x.st === "review").forEach(x => rmAck(id, x.id, "ตรวจแล้ว (ตัวอย่าง)")); if (rmOpen(c).length) { c.ai.checks.forEach(x => { if (x.st === "bad") { x.st = "review"; } if (x.st === "review") rmAck(id, x.id, "ตรวจแล้ว (ตัวอย่าง)"); }); }
      m = rmReady(id); if (m) throw new Error(m); }
    S.rm99 = Object.assign(S.rm99 || {}, { [FORM_FY]: true }); return ""; }
  catch (e) { return "สร้างข้อมูลตัวอย่างไม่ครบ: " + (e.message || e); }
  finally { ROLE = r0; SESSION = s0; RM99.busy = false; commit(); } }
// the overview: a button to add the sample; once, by itself, when the year of the form has no case
{ const base = RM_VIEW.ov; RM_VIEW.ov = function () { let h = base(); const none = !(S.rmk || []).some(c => c.fy === FORM_FY), can = ROLE === "plan" || ROLE === "admin";
  if (none && can && !(S.rm99 || {})[FORM_FY] && typeof KLANG_TEST === "undefined" && !RM99.busy) setTimeout(async () => { const m = await rm99Seed(); RM99.msg = m || "ใส่ข้อมูลตัวอย่าง 4 เรื่องแล้ว (สมมติ)"; route(); }, 30);
  const btn = can ? `<button class="btn" type="button" data-rm99>${RM99.busy ? "กำลังใส่ข้อมูลตัวอย่าง..." : "ใส่ข้อมูลตัวอย่าง"}</button>` : "";
  h = h.replace(/(<section class="panel"><header><h2>[^<]*<\/h2><span class="sp"><\/span>)/, `$1${btn}`);
  return (RM99.msg ? `<div class="sub" style="margin:0 0 8px">${esc(RM99.msg)}</div>` : "") + h; }; }
document.addEventListener("click", async e => { const t = e.target && e.target.closest ? e.target.closest("[data-rm99]") : null; if (!t) return; t.disabled = true; const m = await rm99Seed(); RM99.msg = m || "ใส่ข้อมูลตัวอย่าง 4 เรื่องแล้ว (สมมติ)"; route(); toast(RM99.msg); });
// The sample buttons name a unit of the sample department (RM_SAMPLES[i][3], e.g. "U02"); in another department (กรมโยธาธิการและผังเมือง)
// that unit does not exist and rmCreate refused ("เลือกสำนัก/กองที่ส่งเอกสาร"). A unit that is not in this department
// becomes a division of this department (one with a division user first). A unit that exists is kept as chosen.
function rm99Unit(id) { const ok = u => u && !u.retired && u.parent && u.id !== "U00"; if (S.units.some(u => u.id === id && !u.retired)) return id;
  const withUser = S.units.find(u => ok(u) && S.users.some(x => x.role === "div" && x.unit === u.id)); return (withUser || S.units.find(ok) || {}).id || id; }
{ const base = rmCreate; rmCreate = function (v) { if (v && ROLE !== "div") { v = Object.assign({}, v); if (v.srcType === "unit") v.srcUnit = rm99Unit(v.srcUnit); if (v.owner || v.srcType === "unit") v.owner = rm99Unit(v.owner || v.srcUnit); } return base(v); }; }
// The registers of laws, conditions and kinds of document were seeded for the sample department only (98zzzs: k === "sample"), so the
// department กรมโยธาธิการและผังเมือง had them empty ("ข้อมูลที่ทำไว้ไม่ตามมาด้วย"). A department with an empty register gets a copy of the
// sample's (the same drafts; editable there). A register someone filled is left as it is.
function rm99Regs() { if (!S || ((S.rmLaw || []).length && (S.rmCond || []).length && (S.rmDocType || []).length)) return false; const src = SEEDS.sample && SEEDS.sample.seed && SEEDS.sample.seed(); if (!src) return false;
  let ch = false; [["rmLaw"], ["rmCond"], ["rmDocType"]].forEach(([k]) => { if (!(S[k] || []).length && (src[k] || []).length) { S[k] = JSON.parse(JSON.stringify(src[k])); ch = true; } }); return ch; }
{ const base = rmSyncDocs; rmSyncDocs = function () { if (rm99Regs()) commit(); return base.apply(this, arguments); }; }
