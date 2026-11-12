// Fisko-ERP-Gov, part 7: Finance Division roles from the duty list (หน้าที่กองคลัง.xlsx).
// Voucher checkers 1 and 2: a voucher goes to the checking group by kind and amount (see vcGroup in 66c-fin-fn2.js).
// The head of finance can check either group. The finance officer (fin) prepares and no longer checks.
// Not split: accounting and budget administration stay inside the fin role (see ตรวจสอบสิทธิ์กองคลัง.md).
ROLES.vchk1 = ["ผู้ตรวจใบสำคัญ 1 (งบดำเนินงาน เดินทาง สวัสดิการ จัดซื้อไม่เกิน 100,000 บาท)", "Voucher checker 1 (operating, travel, welfare, procurement up to 100,000 baht)"];
ROLES.vchk2 = ["ผู้ตรวจใบสำคัญ 2 (งบลงทุน ก่อสร้าง ที่ปรึกษา จัดซื้อเกิน 100,000 บาท)", "Voucher checker 2 (investment, construction, consultants, procurement above 100,000 baht)"];
{
  const fn = NAV.find(n => n.id === "finance"), home = NAV.find(n => n.id === "home");
  ["vchk1", "vchk2"].forEach(r => { if (!fn.roles.includes(r)) fn.roles.push(r); if (!home.roles.includes(r)) home.roles.push(r); });
  const base = famTasks;
  famTasks = R => {
    base(R);
    const g = ROLE === "vchk1" ? 1 : ROLE === "vchk2" ? 2 : 0;
    if (!g || !S.vouchers) return;
    S.vouchers.filter(v => v.state === "check" && vcGroup(v) === g).forEach(v => R(`${L("ตรวจหลักฐานใบขอเบิก", "Check voucher evidence")} ${v.id}`, `${esc(tx(v.payee.name))} · ${fmt(vCalc(v).net, 2)}`, v.due || TODAY, "fnc-pay", "p-info"));
  };
}
{
  Object.keys(SEEDS).forEach(k => {
    const prev = SEEDS[k].seed;
    SEEDS[k].seed = () => {
      const s = prev(), fh = s.users.find(u => u.role === "finhead") || s.users.find(u => u.role === "fin");
      if (!s.users.some(u => u.role === "vchk1")) s.users.push({ id: "u14", role: "vchk1", unit: fh.unit, primary: true, mfa: true, active: true, name: ["นิภา ตรวจใบสำคัญ", "Nipa Truat-baisamkhan"] },
        { id: "u15", role: "vchk2", unit: fh.unit, primary: true, mfa: true, active: true, name: ["ธนา ตรวจงบลงทุน", "Thana Truat-ngoplongthun"] });
      return s;
    };
  });
}
