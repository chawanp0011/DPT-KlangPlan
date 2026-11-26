// KlangFinance, round P62 (23 Nov 2569): e-GP and the contract hold every value the two department files ask for.
// Checked column by column against the follow-up form (ฟอร์มติดตาม พ.ร.บ., 72 columns) and the disbursement plan (วางแผนการเบิกจ่าย,
// 51 columns). What was missing is added where it is recorded in the work, all optional and marked "(ตามไฟล์ติดตาม)":
//   e-GP step 2: survey/design, design done, cost estimate, TOR done (columns 23-26);
//   step 3: the end of the draft notice and of the invitation (31-32 are periods, "ระหว่าง");
//   step 4: the Budget Bureau's reply letter (40) and the cabinet letter on the extension (41);
//   step 6: the date the contractor is called to sign (44); step 7: the date the contract was offered (45), the number of days (50), the PO (55);
//   the contract: the quantities (length in metres, rai, households, places: 51-54), the progress of the work in % (57 and plan column 45),
//   the problem (61), the person responsible / the supervisor (plan column 50).
// The two Excel reports now fill these columns from the data.
EGP7_F.s2.splice(0, 0, ["survey", "สำรวจ/ออกแบบ (ตามไฟล์ติดตาม)", "date", 0], ["designDone", "แบบแล้วเสร็จ (ตามไฟล์ติดตาม)", "date", 0], ["estDate", "ประมาณราคา (ตามไฟล์ติดตาม)", "date", 0], ["torDone", "จัดทำ TOR แล้วเสร็จ (ตามไฟล์ติดตาม)", "date", 0]);
{ const s3 = EGP7_F.s3, i = s3.findIndex(f => f[0] === "draftDate"); s3.splice(i + 1, 0, ["draftEnd", "ประกาศร่าง ถึงวันที่ (ตามไฟล์ติดตาม)", "date", 0, "draft"]);
  /* P79: the end of the invitation is not asked: the step has one invitation date (asked for on 24 Nov 2569) */ }
{ const s4 = EGP7_F.s4, i = s4.findIndex(f => f[0] === "bbAmount"); s4.splice(i, 0, ["bbOkLetter", "สงป. พิจารณาความเหมาะสมแล้ว เลขที่หนังสือ/วันที่ (ตามไฟล์ติดตาม)", "text", 0, "multi"]); s4.push(["cabLetter", "ขยายระยะเวลาก่อหนี้ผูกพัน เลขที่หนังสือ/วันที่ (ตามไฟล์ติดตาม)", "text", 0, "cabyes"]); }
EGP7_F.s6.splice(0, 0, ["callDate", "วันที่เรียกลงนาม (ตามไฟล์ติดตาม)", "date", 0]);
{ const s7 = EGP7_F.s7, i = s7.findIndex(f => f[0] === "sign"); s7.splice(i + 1, 0, ["offerDate", "วันที่เสนอสัญญา (ตามไฟล์ติดตาม)", "date", 0]); s7.splice(s7.findIndex(f => f[0] === "period") + 1, 0, ["days", "จำนวนวัน (ตามไฟล์ติดตาม)", "number", 0, "signed"], ["po", "เลขที่ PO (ตามไฟล์ติดตาม)", "text", 0, "signed"]); }

// ---------- the contract: quantities, progress, problem, the person responsible ----------
const KX_MORE = [["qLen", "ความยาว (เมตร)", "number"], ["qRai", "ไร่", "number"], ["qHouse", "ครัวเรือน", "number"], ["qPlace", "แห่ง", "number"], ["work", "ผลการดำเนินงานสะสม (ร้อยละ)", "number"], ["officer", "ผู้รับผิดชอบ/ผู้ควบคุมงาน", "text"], ["problem", "ปัญหา/อุปสรรค", "text"]];
KX_MORE.forEach(([k]) => { if (!KX_F.includes(k)) KX_F.push(k); });
{ const base = kxSave; kxSave = function (k, v, files) { if (v.work !== undefined && v.work !== "" && !(Number(v.work) >= 0 && Number(v.work) <= 100)) return "ผลการดำเนินงานสะสมต้องอยู่ระหว่าง 0-100";
    const m = base(k, v, files); if (m) return m; const x = kxOf(k); ["qLen", "qRai", "qHouse", "qPlace", "work"].forEach(f => { if (f in v) x[f] = v[f] === "" ? "" : Number(v[f]); }); if ("problem" in v) x.problem = String(v.problem).slice(0, 500); return ""; }; }
{ const base = kxContractView; kxContractView = function (k) { const h = base(k), x = kxOf(k), can = kxCanEdit(), key = `<div class="row" style="flex:1 1 100%"><button class="btn primary" type="submit">บันทึกสัญญา</button>`;
    const more = `<div class="f" style="flex:1 1 100%"><label>ปริมาณงานและความก้าวหน้า (ตามไฟล์ติดตาม)</label></div>${KX_MORE.map(([f, t, ty]) => kxIn(f, t, x[f], ty, can, ty === "number" ? 'min="0" step="any"' : f === "problem" ? 'maxlength="500"' : "")).join("")}`;
    return h.includes(key) ? h.replace(key, more + key) : h.replace("</form>", more + "</form>"); }; }

// ---------- the Excel reports: fill the columns from e-GP and the contract ----------
const prE7 = p => { const c = p ? caseByPlan(p.id) : null; return c && c.egp7 ? c.egp7 : null; };
const prRange = (a, b) => (a ? `${prBE(a)}${b ? " - " + prBE(b) : ""}` : "");
{ const base = prTrackBook; prTrackBook = function (fy) { const book = base(fy), rows = prDtRows(fy, false);
    book[0].rows.slice(5).forEach((row, i) => { const r = rows[i]; if (!r) return; const bi = ((S.bi && S.bi.rows) || []).find(y => y.id === r.id), p = bi && bi.sent ? S.pplan.find(q => q.id === bi.sent.pp) : r.k ? famPlan(r.k.plan) : null, E = prE7(p), x = r.k && r.k.cx;
      if (E) { const s = E; [row[22], row[23], row[24], row[25]] = [prBE(s.s2.survey), prBE(s.s2.designDone), prBE(s.s2.estDate), prBE(s.s2.torDone)]; row[26] = s.s2.projNo || ""; row[27] = prBE(s.s1.date); row[28] = s.s2.refPrice ? prM(s.s2.refPrice) : ""; row[29] = prBE(s.s2.refDate); row[30] = prBE(s.s2.reqDate);
        row[31] = s.s3.draft ? prRange(s.s3.draftDate, s.s3.draftEnd) : ""; row[32] = prBE(s.s3.inviteDate); row[33] = prBE(s.s3.bidDate); row[34] = prRange(s.s4.start, s.s4.end); row[35] = s.s4.round || ""; row[36] = s.s4.winner || ""; row[37] = s.s4.price ? prM(s.s4.price) : "";
        row[38] = s.s4.bbLetter || ""; row[39] = s.s4.bbOkLetter || ""; row[40] = s.s4.cab === "yes" ? s.s4.cabLetter || "ขยาย" : ""; row[41] = prBE(s.s5.approve); row[42] = prBE(s.s5.winnerDate); row[43] = prBE(s.s6.callDate || s.s6.signBy); row[44] = prBE(s.s7.offerDate);
        if (s.s7.sign === "signed") { row[45] = row[45] || s.s7.no || ""; row[46] = row[46] || `${s.s7.no || ""} ${prBE(s.s7.date)}`.trim(); if (!row[47] && s.s7.amount) row[47] = prM(s.s7.amount); if (!row[48] && s.s7.period) row[48] = s.s7.period; if (!row[49] && s.s7.days) row[49] = Number(s.s7.days); row[54] = s.s7.po || ""; } }
      if (x) { [row[50], row[51], row[52], row[53]] = [x.qLen || "", x.qRai || "", x.qHouse || "", x.qPlace || ""]; if (x.work !== "" && x.work != null) row[56] = Number(x.work); row[60] = x.problem || ""; } });
    return book; }; flSpendBook = () => prTrackBook(BI.fy); }
{ const base = prPlanBook; prPlanBook = function (fy) { const book = base(fy), rows = prDtRows(fy, false);
    book.forEach(sh => sh.rows.slice(5).forEach(row => { const r = rows.find(y => y.code === row[4] && y.name === row[5]); const x = r && r.k && r.k.cx; if (!x) return; if (x.work !== "" && x.work != null) row[44] = Number(x.work); if (x.officer) row[49] = x.officer; if (x.problem) row[50] = [row[50], x.problem].filter(Boolean).join(" · "); }));
    return book; }; flDisbBook = () => prPlanBook(BI.fy); }
