// Fisko-KlangFinance, round P88b (25 Nov 2569): the organisation app gets the user management it lacked (asked for: "organization ขาด
// ผู้ใช้งาน พร้อมรายละเอียด สิทธิ์ อื่นเตรียมให้ครบ เพื่อให้เห็นว่า สามารถจัดการระบบผู้ใช้งานทั้งหมด").
//   O4 ผู้ใช้งาน: the register of users (filters), a user's details (contact, unit, position, main and extra roles, status, MFA, account
//      expiry, last sign-in), what the role may open, the user's recent actions; the admin adds, edits, suspends/enables, resets the password
//      (simulated: no real password is kept) and unlocks.
//   O5 บทบาทและสิทธิ์: each role, its users, its data scope, and the pages it may open, app by app; the admin ticks a page on or off for a
//      role (kept in S.navRoles and applied to the menus).
//   O6 ประวัติการเข้าใช้งาน: sign-ins (sample, fictional) and the changes to users and rights.
// Every name, e-mail and phone in the sample is fictional.

const US88 = { q: "", role: "", unit: "", st: "", open: null, add: false, rr: "plan", lq: "" };
const US88_SCOPE = { admin: "ทั้งกรม (ผู้ดูแลระบบ)", exec: "ทั้งกรม (อ่าน/อนุมัติ)", audit: "ทั้งกรม (อ่านอย่างเดียว)", plan: "ทั้งกรม (งบประมาณ)", fin: "ทั้งกรม (การเงิน)", finhead: "ทั้งกรม (การเงิน)", acc: "ทั้งกรม (บัญชี)", vchk1: "ทั้งกรม (ใบสำคัญกลุ่ม 1)", vchk2: "ทั้งกรม (ใบสำคัญกลุ่ม 2)", proc: "ทั้งกรม (พัสดุ)", prochead: "ทั้งกรม (พัสดุ)", div: "เฉพาะสำนัก/กองของตน", divhead: "เฉพาะสำนัก/กองของตน", vendor: "เฉพาะข้อมูลของผู้ขายรายนั้น" };
const us88Can = () => ROLE === "admin";
const us88Apps = () => Object.keys(APPS).concat("all");
const us88AppName = a => (a === "all" ? "ใช้ร่วมทุกแอป" : tx(APPS[a].name));
// ---------- the sample: contact, position, sign-ins (fictional, made once) ----------
function us88Seed(s) { if (!s || !s.users || s.us88) return; s.us88 = 1; const pos = { admin: "นักวิชาการคอมพิวเตอร์", exec: "รองอธิบดี", plan: "นักวิเคราะห์นโยบายและแผน", fin: "นักวิชาการเงินและบัญชี", finhead: "ผู้อำนวยการกองคลัง", acc: "นักวิชาการบัญชี", vchk1: "เจ้าพนักงานการเงินและบัญชี", vchk2: "นักวิชาการเงินและบัญชีชำนาญการ", proc: "นักวิชาการพัสดุ", prochead: "หัวหน้ากลุ่มพัสดุ", div: "นักวิชาการ", divhead: "ผู้อำนวยการสำนัก/กอง", audit: "นักวิชาการตรวจสอบภายใน", vendor: "ผู้ประสานงานผู้ขาย" };
  s.users.forEach((u, i) => { const en = String((u.name && u.name[1]) || u.id).toLowerCase().split(/\s+/); u.email = u.email || `${en[0]}.${(en[1] || "x")[0]}@example.go.th`; u.phone = u.phone || `0 2000 ${String(1000 + i * 37).slice(-4)}`; u.pos = u.pos || pos[u.role] || "เจ้าหน้าที่";
    u.expires = u.expires || ""; u.lastIn = u.lastIn || new Date(Date.parse("2026-11-25T08:00:00Z") - (i % 9) * 864e5 - (i * 7919 % 36000) * 1e3).toISOString().slice(0, 16); u.locked = !!u.locked; u.roles2 = u.roles2 || []; });
  s.loginLog = s.loginLog || s.users.flatMap((u, i) => [0, 1, 2].map(k => ({ t: new Date(Date.parse(u.lastIn + ":00Z") - k * 864e5 * (1 + (i % 3))).toISOString().slice(0, 16), user: u.id, ok: !(k === 2 && i % 5 === 0), ip: `10.10.${i % 20}.${20 + k}`, how: u.mfa ? "SSO + MFA" : "SSO" }))).sort((a, b) => (a.t < b.t ? 1 : -1));
  s.userLog = s.userLog || []; s.navRoles = s.navRoles || {}; }
Object.keys(SEEDS).forEach(n => { const prev = SEEDS[n].seed; SEEDS[n].seed = () => { const s = prev(); try { us88Seed(s); } catch (e) {} return s; }; });
// the rights a role has per page: from S.navRoles when the admin changed them
const US88_R0 = {}; NAV.forEach(n => (US88_R0[n.id] = n.roles.slice()));
function us88ApplyNav() { if (typeof S === "undefined" || !S) return; const o = S.navRoles || {}; NAV.forEach(n => { if (!US88_R0[n.id]) US88_R0[n.id] = n.roles.slice(); const want = o[n.id] || US88_R0[n.id]; if (n.roles.join() !== want.join()) n.roles.splice(0, n.roles.length, ...want); }); }
{ const base = route; route = function () { try { if (S && S.users && !S.us88) us88Seed(S); us88ApplyNav(); } catch (e) {} return base.apply(this, arguments); }; }
const us88Log = (what, target) => { (S.userLog = S.userLog || []).unshift({ t: nowIso(), by: me().id, what, target }); audit([what, what], target); };

// ---------- O4 ผู้ใช้งาน ----------
const us88St = u => (u.locked ? ["ถูกล็อก", "p-bad"] : !u.active ? ["ระงับการใช้งาน", "p-mute"] : u.expires && u.expires < TODAY ? ["หมดอายุ", "p-warn"] : ["ใช้งาน", "p-ok"]);
const us88Pages = role => us88Apps().map(a => [a, NAV.filter(n => (n.app || "budget") === a && n.roles.includes(role) && m88NavShown(n))]).filter(x => x[1].length);
function us88Detail(u) { const can = us88Can(), d = can ? "" : "disabled", st = us88St(u), units = S.units.filter(x => !x.retired), roles = Object.keys(ROLES).filter(r => r !== "vendor" || u.role === "vendor");
  const acts = (S.audit || []).filter(a => a.user === u.id).slice(0, 8), ins = (S.loginLog || []).filter(l => l.user === u.id).slice(0, 5), pages = us88Pages(u.role);
  const inp = (n, l, v, t, ex) => `<div class="f"><label>${l}</label><input name="${n}" type="${t || "text"}" value="${esc(v == null ? "" : v)}" ${d} ${ex || ""}></div>`;
  return `<section class="panel us88-det"><header><h2>${esc(tx(u.name))} <span class="sub mono">${esc(u.id)}</span></h2><span class="sp"></span>${tag(st[0], st[1])}<button class="btn ghost" type="button" data-us88open="">ปิด</button></header><div class="body" style="display:flex;flex-direction:column;gap:12px">
    <form data-us88save="${esc(u.id)}" class="inline-form" style="display:flex;flex-wrap:wrap;gap:10px">
      ${inp("nth", "ชื่อ-สกุล (ไทย) *", u.name[0])}${inp("nen", "ชื่อ-สกุล (อังกฤษ)", u.name[1])}${inp("email", "อีเมล *", u.email, "email")}${inp("phone", "โทรศัพท์", u.phone)}${inp("pos", "ตำแหน่ง", u.pos)}
      <div class="f"><label>หน่วยงาน *</label><select name="unit" ${d}>${units.map(x => `<option value="${x.id}" ${u.unit === x.id ? "selected" : ""}>${esc(tx(x.name))}</option>`).join("")}</select></div>
      <div class="f"><label>บทบาทหลัก *</label><select name="role" ${d}>${roles.map(r => `<option value="${r}" ${u.role === r ? "selected" : ""}>${esc(tx(ROLES[r]))}</option>`).join("")}</select></div>
      <div class="f" style="flex:1 1 100%"><label>บทบาทเพิ่มเติม (ทำแทน/รักษาการ)</label><div class="row" style="gap:10px;flex-wrap:wrap">${roles.filter(r => r !== u.role && r !== "vendor").map(r => `<label style="font-weight:400"><input type="checkbox" name="r2" value="${r}" ${u.roles2.includes(r) ? "checked" : ""} ${d}> ${esc(tx(ROLES[r]))}</label>`).join("")}</div></div>
      ${inp("expires", "วันหมดอายุบัญชี (ว่าง = ไม่หมดอายุ)", u.expires, "date")}
      <div class="f"><label>ยืนยันตัวตนสองชั้น (MFA)</label><label style="font-weight:400"><input type="checkbox" name="mfa" ${u.mfa ? "checked" : ""} ${d}> เปิดใช้</label></div>
      <div class="f"><label>เข้าใช้ล่าสุด</label><div>${u.lastIn ? fdate(u.lastIn.slice(0, 10)) + " " + u.lastIn.slice(11, 16) : "–"}</div></div>
      <div class="f"><label>ขอบเขตข้อมูล</label><div>${esc(US88_SCOPE[u.role] || "ตามหน้าที่")}</div></div>
      ${can ? `<div class="row" style="flex:1 1 100%;gap:8px;flex-wrap:wrap"><button class="btn primary" type="submit">บันทึก</button><button class="btn" type="button" data-us88act="${esc(u.id)}|active">${u.active ? "ระงับการใช้งาน" : "เปิดใช้งาน"}</button><button class="btn" type="button" data-us88act="${esc(u.id)}|reset">รีเซ็ตรหัสผ่าน</button>${u.locked ? `<button class="btn" type="button" data-us88act="${esc(u.id)}|unlock">ปลดล็อกบัญชี</button>` : `<button class="btn ghost" type="button" data-us88act="${esc(u.id)}|lock">ล็อกบัญชี</button>`}${u.pwdReset ? `<span class="sub">รีเซ็ตรหัสผ่านล่าสุด ${fdate(u.pwdReset.slice(0, 10))} (ส่งลิงก์ตั้งรหัสใหม่ไปที่อีเมล · จำลอง)</span>` : ""}</div>` : `<div class="sub" style="flex:1 1 100%">เฉพาะผู้ดูแลระบบแก้ไขผู้ใช้งาน</div>`}</form>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px">
      <div><b>สิทธิ์เข้าใช้หน้า (ตามบทบาท ${esc(tx(ROLES[u.role]))})</b>${pages.map(([a, l]) => `<div style="margin-top:6px"><span class="sub">${esc(us88AppName(a))}</span><div class="row" style="gap:4px;flex-wrap:wrap">${l.map(n => `<span class="pill p-info">${esc(tx(n.label))}</span>`).join("")}</div></div>`).join("") || `<div class="sub">ไม่มี</div>`}</div>
      <div><b>การเข้าใช้งานล่าสุด</b><ul style="margin:4px 0 0;padding-left:16px">${ins.map(l => `<li>${fdate(l.t.slice(0, 10))} ${l.t.slice(11, 16)} · ${l.ok ? "สำเร็จ" : `<span style="color:var(--bad)">ไม่สำเร็จ</span>`} · ${esc(l.how)} · <span class="mono sub">${esc(l.ip)}</span></li>`).join("") || `<li class="sub">ไม่มี</li>`}</ul>
        <b style="display:block;margin-top:8px">การทำรายการล่าสุด</b><ul style="margin:4px 0 0;padding-left:16px">${acts.map(a => `<li>${esc(a.t.slice(0, 16).replace("T", " "))} · ${esc(tx(a.action))} <span class="sub">${esc(a.target || "")}</span></li>`).join("") || `<li class="sub">ไม่มี</li>`}</ul></div></div></div></section>`; }
function us88AddForm() { const units = S.units.filter(x => !x.retired);
  return `<section class="panel"><header><h2>เพิ่มผู้ใช้งาน</h2><span class="sp"></span><button class="btn ghost" type="button" data-us88add="0">ปิด</button></header><div class="body"><form data-us88new class="inline-form" style="display:flex;flex-wrap:wrap;gap:10px">
    <div class="f"><label>ชื่อ-สกุล (ไทย) *</label><input name="nth" required></div><div class="f"><label>ชื่อ-สกุล (อังกฤษ)</label><input name="nen"></div><div class="f"><label>อีเมล *</label><input name="email" type="email" required placeholder="name@example.go.th"></div><div class="f"><label>ตำแหน่ง</label><input name="pos"></div>
    <div class="f"><label>หน่วยงาน *</label><select name="unit">${units.map(x => `<option value="${x.id}">${esc(tx(x.name))}</option>`).join("")}</select></div>
    <div class="f"><label>บทบาทหลัก *</label><select name="role">${Object.keys(ROLES).filter(r => r !== "vendor").map(r => `<option value="${r}">${esc(tx(ROLES[r]))}</option>`).join("")}</select></div>
    <div class="f"><label>วันหมดอายุบัญชี</label><input name="expires" type="date"></div><div class="f" style="align-self:end"><label style="font-weight:400"><input type="checkbox" name="mfa" checked> MFA</label></div>
    <div class="f" style="align-self:end"><button class="btn primary" type="submit">เพิ่มผู้ใช้งาน</button></div><div class="sub" style="flex:1 1 100%">ระบบส่งลิงก์ตั้งรหัสผ่านไปที่อีเมล (จำลอง ไม่มีการส่งจริง)</div></form></div></section>`; }
function us88Users() { const f = US88, q = f.q.toLowerCase(), all = S.users.filter(u => u.role !== "vendor" || f.role === "vendor");
  const list = all.filter(u => (!f.role || u.role === f.role || u.roles2.includes(f.role)) && (!f.unit || u.unit === f.unit) && (!f.st || us88St(u)[0] === f.st) && (!q || `${u.name.join(" ")} ${u.email} ${u.id} ${u.pos}`.toLowerCase().includes(q)));
  const cnt = s => all.filter(u => us88St(u)[0] === s).length, open = f.open && S.users.find(u => u.id === f.open);
  return `${eHead(ORG_APP, "O4", ["ผู้ใช้งาน", "Users"], ["ผู้ใช้งานทั้งหมดของระบบ รายละเอียด บทบาท สิทธิ์ และสถานะบัญชี · ผู้ดูแลระบบเป็นผู้แก้ไข", "Every user, details, roles, rights and account status"], us88Can() ? `<button class="btn primary" type="button" data-us88add="1">เพิ่มผู้ใช้งาน</button>` : "")}
    ${eKpis([["ผู้ใช้งานทั้งหมด", all.length], ["ใช้งาน", cnt("ใช้งาน")], ["ระงับ/ล็อก", cnt("ระงับการใช้งาน") + cnt("ถูกล็อก"), "", cnt("ถูกล็อก") > 0], ["ยังไม่เปิด MFA", all.filter(u => !u.mfa).length, "", all.some(u => !u.mfa)]])}
    ${US88.add && us88Can() ? us88AddForm() : ""}${open ? us88Detail(open) : ""}
    <section class="panel"><header><h2>ทะเบียนผู้ใช้งาน</h2><span class="sp"></span><span class="sub">${list.length} จาก ${all.length} คน</span></header><div class="body">
    <div class="inline-form" style="margin:0 0 8px"><div class="f" style="flex:1 1 200px"><label>ค้นหา (ชื่อ อีเมล ตำแหน่ง)</label><input type="search" data-us88f="q" value="${esc(f.q)}"></div>
      <div class="f"><label>บทบาท</label><select data-us88f="role"><option value="">ทั้งหมด</option>${Object.keys(ROLES).map(r => `<option value="${r}" ${f.role === r ? "selected" : ""}>${esc(tx(ROLES[r]))}</option>`).join("")}</select></div>
      <div class="f"><label>หน่วยงาน</label><select data-us88f="unit"><option value="">ทั้งหมด</option>${S.units.map(x => `<option value="${x.id}" ${f.unit === x.id ? "selected" : ""}>${esc(tx(x.name))}</option>`).join("")}</select></div>
      <div class="f"><label>สถานะ</label><select data-us88f="st"><option value="">ทั้งหมด</option>${["ใช้งาน", "ระงับการใช้งาน", "ถูกล็อก", "หมดอายุ"].map(s => `<option ${f.st === s ? "selected" : ""}>${s}</option>`).join("")}</select></div></div>
    <div class="tbl-wrap"><table class="us88-t"><thead><tr><th>ชื่อ-สกุล</th><th>อีเมล</th><th>หน่วยงาน</th><th>ตำแหน่ง</th><th>บทบาท</th><th>MFA</th><th>เข้าใช้ล่าสุด</th><th>สถานะ</th><th></th></tr></thead><tbody>
      ${list.map(u => { const s = us88St(u); return `<tr><td>${esc(tx(u.name))}<div class="sub mono">${esc(u.id)}</div></td><td>${esc(u.email)}</td><td>${esc(unitName(u.unit))}</td><td>${esc(u.pos)}</td><td>${esc(tx(ROLES[u.role]))}${u.roles2.length ? `<div class="sub">+ ${u.roles2.map(r => esc(tx(ROLES[r]))).join(", ")}</div>` : ""}</td><td>${u.mfa ? "✓" : tag("ไม่เปิด", "p-warn")}</td><td class="sub">${u.lastIn ? fdate(u.lastIn.slice(0, 10)) : "–"}</td><td>${tag(s[0], s[1])}</td><td><button class="btn ghost" type="button" data-us88open="${esc(u.id)}">${us88Can() ? "ดู/แก้ไข" : "ดู"}</button></td></tr>`; }).join("") || `<tr><td colspan="9" class="sub">ไม่พบผู้ใช้งาน</td></tr>`}</tbody></table></div></div></section>`; }

// ---------- O5 บทบาทและสิทธิ์ ----------
function us88Roles() { const r = ROLES[US88.rr] ? US88.rr : "plan", can = us88Can(), users = S.users.filter(u => u.role === r || u.roles2.includes(r));
  const apps = us88Apps().map(a => [a, NAV.filter(n => (n.app || "budget") === a && m88NavShown(n) && n.id !== "home")]).filter(x => x[1].length);
  return `${eHead(ORG_APP, "O5", ["บทบาทและสิทธิ์", "Roles and rights"], ["บทบาทของผู้ใช้ ขอบเขตข้อมูล และหน้าที่แต่ละบทบาทเปิดได้ · ผู้ดูแลระบบติ๊กเพิ่ม/ถอนสิทธิ์รายหน้า", "Roles, data scope and the pages each may open"])}
    <section class="panel"><header><h2>บทบาททั้งหมด</h2></header><div class="body"><div class="tbl-wrap"><table class="us88-roles"><thead><tr><th>บทบาท</th><th>ขอบเขตข้อมูล</th><th class="n">ผู้ใช้</th><th class="n">หน้าที่เปิดได้</th><th></th></tr></thead><tbody>
      ${Object.keys(ROLES).map(k => `<tr ${k === r ? 'style="background:var(--info-soft)"' : ""}><td>${esc(tx(ROLES[k]))} <span class="sub mono">${k}</span></td><td>${esc(US88_SCOPE[k] || "ตามหน้าที่")}</td><td class="n">${S.users.filter(u => u.role === k).length}</td><td class="n">${NAV.filter(n => n.roles.includes(k) && m88NavShown(n)).length}</td><td><button class="btn ghost" type="button" data-us88rr="${k}">กำหนดสิทธิ์</button></td></tr>`).join("")}</tbody></table></div></div></section>
    <section class="panel us88-matrix"><header><h2>สิทธิ์ของบทบาท: ${esc(tx(ROLES[r]))}</h2><span class="sp"></span>${can ? `<button class="btn ghost" type="button" data-us88reset="${r}">คืนค่าเริ่มต้นของบทบาทนี้</button>` : ""}</header><div class="body">
      <div class="sub" style="margin:0 0 6px">ผู้ใช้ในบทบาทนี้ ${users.length} คน: ${users.map(u => esc(tx(u.name))).join(", ") || "–"}${can ? "" : " · เฉพาะผู้ดูแลระบบแก้ไขสิทธิ์"}</div>
      ${apps.map(([a, l]) => `<div style="margin:8px 0"><b>${esc(us88AppName(a))}</b><div class="row" style="gap:6px 14px;flex-wrap:wrap;margin-top:4px">${l.map(n => `<label style="font-weight:400"><input type="checkbox" data-us88nav="${r}|${n.id}" ${n.roles.includes(r) ? "checked" : ""} ${can && !(r === "admin" && n.id === "admin") ? "" : "disabled"}> ${esc(tx(n.label))}</label>`).join("")}</div></div>`).join("")}</div></section>`; }

// ---------- O6 ประวัติการเข้าใช้งาน ----------
function us88LogPage() { const q = US88.lq.toLowerCase(), L0 = (S.loginLog || []).filter(l => !q || `${userName(l.user)} ${l.ip}`.toLowerCase().includes(q)).slice(0, 60), C = (S.userLog || []).slice(0, 40), bad = (S.loginLog || []).filter(l => !l.ok).length;
  return `${eHead(ORG_APP, "O6", ["ประวัติการเข้าใช้งาน", "Sign-in history"], ["การเข้าใช้งานของผู้ใช้ (ตัวอย่างสมมติ) และการเปลี่ยนแปลงผู้ใช้/สิทธิ์", "Sign-ins (fictional sample) and the changes to users and rights"])}
    ${eKpis([["การเข้าใช้งานทั้งหมด", (S.loginLog || []).length], ["ไม่สำเร็จ", bad, "", bad > 0], ["การเปลี่ยนแปลงผู้ใช้/สิทธิ์", (S.userLog || []).length]])}
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:14px">
    <section class="panel"><header><h2>การเข้าใช้งาน</h2><span class="sp"></span><input type="search" placeholder="ค้นหาชื่อ / IP" data-us88lq value="${esc(US88.lq)}"></header><div class="body"><div class="tbl-wrap"><table class="us88-log"><thead><tr><th>เวลา</th><th>ผู้ใช้</th><th>ผล</th><th>วิธี</th><th>IP</th></tr></thead><tbody>
      ${L0.map(l => `<tr><td class="mono sub">${esc(l.t.replace("T", " "))}</td><td>${esc(userName(l.user))}</td><td>${l.ok ? tag("สำเร็จ", "p-ok") : tag("ไม่สำเร็จ", "p-bad")}</td><td>${esc(l.how)}</td><td class="mono sub">${esc(l.ip)}</td></tr>`).join("")}</tbody></table></div></div></section>
    <section class="panel"><header><h2>การเปลี่ยนแปลงผู้ใช้และสิทธิ์</h2></header><div class="body">${C.length ? `<ul style="margin:0;padding-left:16px">${C.map(c => `<li><span class="mono sub">${esc(c.t.slice(0, 16).replace("T", " "))}</span> ${esc(userName(c.by))}: ${esc(c.what)} <span class="sub">${esc(c.target)}</span></li>`).join("")}</ul>` : `<div class="sub">ยังไม่มีการเปลี่ยนแปลง</div>`}</div></section></div>`; }

ePageDef("org", "org-users", "O4", "org", ORG_ROLES, ["ผู้ใช้งาน", "Users"], () => us88Users());
ePageDef("org", "org-roles", "O5", "org", ORG_ROLES, ["บทบาทและสิทธิ์", "Roles and rights"], () => us88Roles());
ePageDef("org", "org-login", "O6", "org", ORG_ROLES, ["ประวัติการเข้าใช้งาน", "Sign-in history"], () => us88LogPage());
Object.assign(NAV_ICON, { "org-users": "users", "org-roles": "shield", "org-login": "activity" });
["org-users", "org-roles", "org-login"].forEach(id => (US88_R0[id] = NAV.find(n => n.id === id).roles.slice()));
// the users page first in the menu of the organisation app
{ const i = NAV.findIndex(n => n.id === "org-tree"); ["org-login", "org-roles", "org-users"].forEach(id => { const j = NAV.findIndex(n => n.id === id); NAV.splice(i, 0, NAV.splice(j, 1)[0]); }); }

// ---------- actions ----------
function us88Save(id, v) { if (!us88Can()) return "เฉพาะผู้ดูแลระบบ"; const u = S.users.find(x => x.id === id); if (!u) return "ไม่พบผู้ใช้";
  if (!String(v.nth || "").trim()) return "ระบุชื่อ-สกุล"; if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(v.email || ""))) return "อีเมลไม่ถูกต้อง";
  if (S.users.some(x => x.id !== id && x.email === v.email)) return "อีเมลนี้มีผู้ใช้อื่นแล้ว"; if (!ROLES[v.role]) return "บทบาทไม่ถูกต้อง"; if (!S.units.some(x => x.id === v.unit)) return "หน่วยงานไม่ถูกต้อง";
  if (u.id === me().id && v.role !== "admin") return "เปลี่ยนบทบาทของตนเองออกจากผู้ดูแลระบบไม่ได้";
  const was = u.role; u.name = [String(v.nth).trim(), String(v.nen || "").trim() || u.name[1]]; Object.assign(u, { email: v.email, phone: v.phone || "", pos: v.pos || "", unit: v.unit, role: v.role, expires: v.expires || "", mfa: !!v.mfa, roles2: (v.r2 || []).filter(r => ROLES[r] && r !== v.role) });
  us88Log(was !== u.role ? `แก้ไขผู้ใช้และเปลี่ยนบทบาท ${tx(ROLES[was])} → ${tx(ROLES[u.role])}` : "แก้ไขข้อมูลผู้ใช้", `${u.id} ${tx(u.name)}`); return ""; }
function us88New(v) { if (!us88Can()) return { err: "เฉพาะผู้ดูแลระบบ" }; if (!String(v.nth || "").trim()) return { err: "ระบุชื่อ-สกุล" }; if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(v.email || ""))) return { err: "อีเมลไม่ถูกต้อง" };
  if (S.users.some(x => x.email === v.email)) return { err: "อีเมลนี้มีผู้ใช้แล้ว" }; if (!ROLES[v.role]) return { err: "บทบาทไม่ถูกต้อง" };
  let n = S.users.length + 1; while (S.users.some(x => x.id === "u" + n)) n++;
  const u = { id: "u" + n, role: v.role, unit: v.unit, primary: false, mfa: !!v.mfa, active: true, name: [String(v.nth).trim(), String(v.nen || "").trim() || String(v.nth).trim()], email: v.email, phone: "", pos: v.pos || "", expires: v.expires || "", lastIn: "", locked: false, roles2: [], pwdReset: nowIso() };
  S.users.push(u); us88Log("เพิ่มผู้ใช้งาน (ส่งลิงก์ตั้งรหัสผ่าน · จำลอง)", `${u.id} ${tx(u.name)}`); return { u }; }
function us88Act(id, a) { if (!us88Can()) return "เฉพาะผู้ดูแลระบบ"; const u = S.users.find(x => x.id === id); if (!u) return "ไม่พบผู้ใช้";
  if (u.id === me().id && (a === "active" || a === "lock")) return "ระงับหรือล็อกบัญชีของตนเองไม่ได้";
  if (a === "active") { u.active = !u.active; us88Log(u.active ? "เปิดใช้งานผู้ใช้" : "ระงับการใช้งานผู้ใช้", `${u.id} ${tx(u.name)}`); }
  if (a === "reset") { u.pwdReset = nowIso(); us88Log("รีเซ็ตรหัสผ่าน (ส่งลิงก์ไปที่อีเมล · จำลอง)", `${u.id} ${tx(u.name)}`); }
  if (a === "lock") { u.locked = true; us88Log("ล็อกบัญชี", `${u.id} ${tx(u.name)}`); }
  if (a === "unlock") { u.locked = false; us88Log("ปลดล็อกบัญชี", `${u.id} ${tx(u.name)}`); } return ""; }
function us88Nav(role, id, on) { if (!us88Can()) return "เฉพาะผู้ดูแลระบบ"; const n = NAV.find(x => x.id === id); if (!n || !ROLES[role]) return "ไม่พบ"; if (role === "admin" && id === "admin") return "ถอนสิทธิ์หน้าผู้ดูแลระบบของผู้ดูแลระบบไม่ได้";
  const cur = (S.navRoles[id] || US88_R0[id] || n.roles).filter(r => r !== role); if (on) cur.push(role); S.navRoles[id] = cur; us88ApplyNav();
  us88Log(`${on ? "ให้สิทธิ์" : "ถอนสิทธิ์"} หน้า "${tx(n.label)}"`, tx(ROLES[role])); return ""; }

document.addEventListener("click", e => { const t = e.target && e.target.closest ? e.target : null; if (!t) return;
  const o = t.closest("[data-us88open]"); if (o) { US88.open = o.dataset.us88open || null; route(); if (US88.open) window.scrollTo(0, 0); return; }
  const ad = t.closest("[data-us88add]"); if (ad) { US88.add = ad.dataset.us88add === "1"; route(); return; }
  const ac = t.closest("[data-us88act]"); if (ac) { const [id, a] = ac.dataset.us88act.split("|"), m = us88Act(id, a); if (m) { toast(m); return; } commit(); route(); toast(a === "reset" ? "ส่งลิงก์ตั้งรหัสผ่านใหม่แล้ว (จำลอง)" : "บันทึกแล้ว"); return; }
  const rr = t.closest("[data-us88rr]"); if (rr) { US88.rr = rr.dataset.us88rr; route(); return; }
  const rs = t.closest("[data-us88reset]"); if (rs && us88Can()) { const r = rs.dataset.us88reset; Object.keys(S.navRoles).forEach(id => { const b = (US88_R0[id] || []).includes(r), c = S.navRoles[id].includes(r); if (b !== c) S.navRoles[id] = c ? S.navRoles[id].filter(x => x !== r) : S.navRoles[id].concat(r); }); us88ApplyNav(); us88Log("คืนค่าสิทธิ์เริ่มต้น", tx(ROLES[r])); commit(); renderShell(); route(); } });
document.addEventListener("change", e => { const t = e.target; if (!t || !t.matches) return;
  if (t.matches("[data-us88f]")) { US88[t.dataset.us88f] = t.value; route(); return; }
  if (t.matches("[data-us88lq]")) { US88.lq = t.value; route(); return; }
  if (t.matches("[data-us88nav]")) { const [r, id] = t.dataset.us88nav.split("|"), m = us88Nav(r, id, t.checked); if (m) { toast(m); t.checked = !t.checked; return; } commit(); renderShell(); route(); toast("บันทึกสิทธิ์แล้ว"); } });
document.addEventListener("submit", e => { const f = e.target; if (!f || !f.matches) return;
  if (f.matches("[data-us88save]")) { e.preventDefault(); const d = new FormData(f), v = Object.fromEntries(d.entries()); v.r2 = d.getAll("r2"); v.mfa = d.get("mfa") === "on"; const m = us88Save(f.dataset.us88save, v); if (m) { toast(m); return; } commit(); renderShell(); route(); toast("บันทึกผู้ใช้งานแล้ว"); return; }
  if (f.matches("[data-us88new]")) { e.preventDefault(); const d = new FormData(f), v = Object.fromEntries(d.entries()); v.mfa = d.get("mfa") === "on"; const r = us88New(v); if (r.err) { toast(r.err); return; } US88.add = false; US88.open = r.u.id; commit(); route(); toast("เพิ่มผู้ใช้งานแล้ว"); } });
