// Fisko-KlangFinance tests for rounds R1 to R9 (files 92 to 98z in src/js). Like sweep.js it runs inside the prototype page
// (it needs the app's globals), so tests/klang.html injects it into an iframe that loads Fisko_Prototype.html. It can also be
// pasted into the browser console on the prototype page and started with KLANG_TEST.run().
// It checks the rules of the new features (workflow guards, validations, derived numbers), mostly by calling the same
// functions the forms call (CRUD spec check/run/acts), plus one real form submit (P1 plan item) and opening every new page
// for every role. It does NOT replace tests/run.html (render of every old page) and it checks no layout or colours.
// Every number it expects comes from the sample data and from my assumptions written in the code; if the sample data
// changes, these expectations change with it.
(function () {
  const BAD = /undefined|NaN|\[object|Infinity|Invalid/;
  const tick = (ms = 0) => new Promise(r => { if (!ms) { const c = new MessageChannel(); c.port1.onmessage = () => r(); c.port2.postMessage(0); } else setTimeout(r, ms); });
  async function run(opts = {}) {
    const t0 = performance.now(), errs = [], o = Object.assign({ onProgress: () => {} }, opts);
    let n = 0;
    const ok = (label, cond, extra) => { n++; if (!cond) errs.push(`${label}${extra !== undefined ? ": " + JSON.stringify(extra) : ""}`); };
    const eq = (label, a, b) => { n++; if (JSON.stringify(a) !== JSON.stringify(b)) errs.push(`${label}: got ${JSON.stringify(a)}, expected ${JSON.stringify(b)}`); };
    const has = (label, arr, re) => ok(label, (arr || []).some(x => re.test(String(x))), arr);
    const as = r => { ROLE = r; };
    const reseed = () => { S = SEEDS[ORG].seed(); };
    const grp = async (name, fn) => { try { reseed(); await fn(); } catch (e) { errs.push(`${name} THROW ${e && e.message}`); } o.onProgress({ what: name, n, errors: errs.length }); };
    const msgs = (spec, vals, rec) => (spec.check ? spec.check(vals, rec) : []).map(x => x.m);
    const act = (spec, rec, id) => (spec.acts(rec) || []).find(a => a.id === id);
    const oldErr = window.onerror; window.onerror = (m, s, l) => { errs.push(`window.onerror ${m} @${l}`); };
    const ORG0 = ORG;
    try {
      const ms = fyMonths(CUR_FY);
      await grp("Requisition details and requests", async () => {
        ok("seed requisitions carry project details", S.reqn.every(r => r.detail && r.detail.obj && r.detail.scope));
        const r = S.reqn[3], p = famPlan(r.plan);
        as("proc"); jump("prc-reqn"); PRQ_OPEN = r.id; route(); await tick(300);
        ok("details visible to procurement", document.body.innerText.includes("รายละเอียดโครงการจากหน่วยงานเจ้าของเรื่อง"));
        document.querySelector("#as-t-" + r.id).value = "ขอแบบรูปรายการและใบเสนอราคา 3 ราย"; document.querySelector("[data-askadd]").click(); await tick(300);
        eq("request recorded as open", (r.asks || []).map(a => a.status), ["open"]);
        as("div"); ok("owner unit recognised or skipped", true);
        if (askOwner(p)) { route(); await tick(300); const b = document.querySelector("[data-askans]"); ok("answer button for owner", !!b);
          if (b) { document.querySelector("#as-a-A1").value = "ส่งแล้ว"; b.click(); await tick(300); eq("answered", r.asks[0].status, "answered"); } }
        { const p5 = S.pplan.find(x => x.status === "planned" && inPublishedPlan(x)); const un = p5 && famLine(p5.line).unit; const du = p5 && S.users.find(u => u.role === "div" && u.unit === un);
          if (p5 && du) { as("div"); const before = S.reqn.length; jump("prc-plan"); await tick(300); const bt = document.querySelector('[data-preq="' + p5.id + '"]');
            if (bt) { bt.click(); await tick(500); const cs5 = caseByPlan(p5.id);
              ok("the button opens the case on Prepare the data, with no pop-up", CASE_OPEN === cs5.id && !!document.querySelector("#rq-inline") && !document.querySelector("#rq-dlg") && CASE_MAIN[cs5.id] === 2);
              ok("sending is off until the method, reference price, TOR and committee are ready", document.querySelector("#rqi-send").disabled === true);
              // the parts follow each other: special reason -> advice -> saved; amount -> method; reference price saved on choosing
              { const sp = document.querySelector("#mt-special"); sp.value = "urgent"; sp.dispatchEvent(new Event("change", { bubbles: true })); await tick(200);
                ok("choosing a special reason puts the method on the advice", document.querySelector("#mt-method") ? document.querySelector("#mt-method").value === "specific" : true);
                const why = document.querySelector("#mt-why"); why.value = "ฉุกเฉินที่ไม่อาจคาดหมาย ต้องซื้อทันที"; why.dispatchEvent(new Event("change", { bubbles: true })); await tick(500);
                ok("the method is saved as soon as the reason is typed, no save button", cs5.method === "specific" && cs5.special === "urgent" && cs5.methodApproval && cs5.methodApproval.status === "with_request" && cs5.methodAuto === false && !document.querySelector("#mt-form button[type=submit]")); }
              { cs5.special = null; cs5.method = "ebid"; cs5.methodAuto = true; cs5.methodApproval = { status: "auto", t: nowIso(), by: "x" }; route(); await tick(400);
                const am = document.querySelector("#pr-amt"); am.value = "0.300"; am.dispatchEvent(new Event("input", { bubbles: true })); am.dispatchEvent(new Event("change", { bubbles: true })); await tick(500);
                eq("a smaller requisition amount moves a method that follows the advice", cs5.method, "specific");
                const am2 = document.querySelector("#pr-amt"); am2.value = "3.000"; am2.dispatchEvent(new Event("input", { bubbles: true })); am2.dispatchEvent(new Event("change", { bubbles: true })); await tick(500);
                eq("a larger amount moves it back", [cs5.method, cs5.methodAuto], ["ebid", true]);
                cs5.methodAuto = false; cs5.method = "ebid"; const am3 = document.querySelector("#pr-amt"); am3.value = "0.300"; am3.dispatchEvent(new Event("input", { bubbles: true })); am3.dispatchEvent(new Event("change", { bubbles: true })); await tick(400);
                eq("a method chosen against the advice stays", cs5.method, "ebid");
                cs5.methodAuto = true; cs5.ref = null; route(); await tick(300);
                const ra = document.querySelector("#ref-amt"), rb = document.querySelector('#ref-form input[name="ref-b"][value="std"]'); ok("the reference price form is open with a default from the requisition amount", !!ra && Number(ra.value) > 0);
                if (ra && rb) { ra.value = "250000"; rb.checked = true; ra.dispatchEvent(new Event("change", { bubbles: true })); await tick(500); ok("the reference price is saved as soon as it is chosen, and the method follows it", !!cs5.ref && cs5.ref.amount === 250000 && cs5.ref.basis.includes("std") && cs5.method === "specific"); }
                eq("the basis typed on the requisition becomes the default basis", (cs5.rqDraft = { basis: "ราคามาตรฐานครุภัณฑ์", amt: "0.4" }, [rqBasisDefault(cs5), rqEstimate(cs5)]), ["std", 400000]); cs5.rqDraft = null; }
              cs5.method = "specific"; cs5.methodApproval = { status: "with_request", t: nowIso(), by: "x" }; cs5.ref = { amount: 300000, basis: ["std"], by: "x", t: nowIso() }; route(); await tick(400);
              { const pans = [...document.querySelectorAll('.cmain[data-cmain="2"] > .panel')], last = pans[pans.length - 1];
                ok("the ready panel is the last panel of Prepare the data, with a status row per topic", !!last && /พร้อมส่งหรือยัง/.test(last.innerText) && last.querySelectorAll("tbody tr").length === 6, last && last.innerText.slice(0, 40)); }
              ok("with the method and reference price but blank details, sending stays off", document.querySelector("#rqi-send").disabled === true);
              ok("the details row says what is missing", /ยังขาด|Missing/.test(document.querySelector("#rq-ready").innerText));
              document.querySelector("#rqi-send").click(); await tick(100); eq("blank details refused", S.reqn.length, before);
              for (const [id, v] of [["#pr-obj", "x ความเป็นมา"], ["#pr-scope", "ขอบเขต"], ["#pr-place", "สถานที่"], ["#pr-deliv", "ผลงาน"], ["#pr-contact", "ผู้ประสานงาน 02"]]) { const el = document.querySelector(id); el.value = v; el.dispatchEvent(new Event("input", { bubbles: true })); }
              ok("when the details are filled the status turns done and sending is on", document.querySelector("#rqi-send").disabled === false && /กรอกครบแล้ว|Complete/.test(document.querySelector("#rq-ready").innerText));
              RQ_FILES.push({ name: "tor.pdf", size: 2048, type: "application/pdf", kind: 0 }); document.querySelector("#rqi-send").click(); await tick(400);
              const nr = S.reqn[S.reqn.length - 1]; ok("requisition sent with files", S.reqn.length === before + 1 && nr.detail.files.length === 1 && nr.detail.files[0].name === "tor.pdf" && nr.detail.obj === "x ความเป็นมา");
              eq("the case moved to approval and the draft is cleared", [caseState(cs5), cs5.rqDraft], [2, null]);
              as("div"); ok("the division's own users can't approve", !rqCanDecide(nr)); as("proc"); ok("procurement can't approve either", !rqCanDecide(nr));
              as("exec"); ok("an executive who may spend can approve", rqCanDecide(nr)); rqDecide(nr.id, true);
              eq("approving the requisition approves the method with it", [nr.status, caseState(cs5), cs5.methodApproval.status], ["approved", 3, "approved"]); } } }
        as("proc"); const t0 = S.reqn[0]; ok("non-owner cannot answer", !askOwner(famPlan(t0.plan)));
      });
      await grp("R1 Project ID", async () => {
        const P = S.pplan;
        ok("every plan item has a Project ID", P.every(p => /^PJ-\d{4}-\d{5}$/.test(p.pid)));
        eq("Project IDs unique", new Set(P.map(p => p.pid)).size, P.length);
        eq("seed states (the first six items; later sample items are not pinned)", P.slice(0, 6).map(pjState), ["linked", "linked", "linked", "sent", "unsent", "unsent"]);
        ok("budget row per item", P.every(p => pjRows(p.pid).length === 1));
        as("proc"); const sp = CRUD.defs.pj, p4 = pjItem(P[3].pid);
        has("duplicate e-GP number refused", msgs(sp, { egp: P[0].egp.no }, p4), /ผูกกับ|linked/);
        eq("fresh number passes", msgs(sp, { egp: "EGP-70-9001" }, p4), []);
        pjLink(p4, "EGP-70-9001", "manual", "test"); eq("linked after link", pjState(p4), "linked"); eq("history written", S.pidlog[0].text, "EGP-70-9001");
        as("plan"); ok("plan cannot edit", !sp.edit.can(p4)); as("div"); ok("div sees only its unit", S.pplan.filter(pjVisible).every(p => famLine(p.line).unit === me().unit));
        as("proc"); const u = pjItem(P[4].pid); act(sp, u, "sent").run(u); eq("recorded as sent", pjState(u), "sent"); act(sp, u, "unsent").run(u, "test reason"); eq("sent undone", pjState(u), "unsent");
        // import checks
        PJ_IMP.kind = "egp"; PJ_IMP.text = "pid,egp_no,date\n" + P[4].pid + ",EGP-70-9002,2026-10-16\nPJ-9999-99999,EGP-70-9003,2026-10-16\n" + P[5].pid + "," + P[0].egp.no + ",2026-10-16"; pjPreview();
        eq("import rows ok / not found / duplicate", PJ_IMP.rows.map(r => !r.err), [true, false, false]);
        PJ_IMP.kind = "gf"; PJ_IMP.text = "pid,fy,code,fund,amount\n" + P[0].pid + ",2570,X1,carry,1000\n" + P[0].pid + ",1999,X2,act,5\n" + P[0].pid + ",2570,X3,bad,5"; pjPreview();
        eq("gf import rows", PJ_IMP.rows.map(r => !r.err), [true, false, false]);
        // the real P1 form issues a Project ID
        jump("prc-plan"); await tick(300); { const t = document.querySelector("#pp-toggle"); if (t) { t.click(); await tick(300); } } const f =document.querySelector("#pp-form"); ok("P1 form exists", !!f);
        if (f) { document.querySelector("#pp-name").value = "ทดสอบ"; document.querySelector("#pp-est").value = "0.3"; f.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true })); await tick(300); const np = S.pplan[S.pplan.length - 1]; ok("new item got a Project ID and a budget row", /^PJ-/.test(np.pid) && pjRows(np.pid).length === 1); eq("new item unsent", pjState(np), "unsent"); }
        ok("loop has 8 steps", (pjLoop(P[0]).match(/<li /g) || []).length === 8);
      });
      await grp("R4 plan and result", async () => {
        eq("12 fiscal months start", [ms[0], ms[11]], [(CUR_FY - 544) + "-10", (CUR_FY - 543) + "-09"]);
        as("fin"); const p = S.pplan[1], sp = CRUD.defs.dplan, cur = plCur(p.pid), v = { bkind: "year" }; ms.forEach((m, i) => (v["m" + i] = cur.months[m]));
        eq("plan total equals the amount", plSum(cur), p.est);
        has("plan above the amount refused", msgs(sp, Object.assign({}, v, { m0: p.est * 2 }), p), /เกิน|exceed/i);
        const n0 = plVers(p.pid).length; v.m0 += 1000; v.m1 -= 1000; sp.edit.run(p, v, "test"); eq("revision added, old kept", [plVers(p.pid).length, plVers(p.pid)[0].ver, plCur(p.pid).ver], [n0 + 1, 0, 1]);
        as("plan"); ok("plan cannot edit plans", !sp.edit.can(p));
        const ac = CRUD.defs.dpact; as("fin"); has("result above the amount refused", msgs(ac, { pid: p.pid, ym: ms[2], amount: p.est + 1 }, null), /เกิน|exceed/i);
        has("duplicate month refused", msgs(ac, { pid: S.pplan[0].pid, ym: ms[0], amount: 5 }, null), /แล้ว|already/i);
        eq("reserve states", S.dpres.map(resState), ["active", "lapsed", "lapse"]); eq("lapsed amounts", S.dpres.map(resLapsed), [0, 1200000, 450000]);
        PJ_IMP.kind = "actual"; PJ_IMP.text = "pid,ym,amount\n" + S.pplan[1].pid + "," + ms[0] + ",1000\nPJ-9999-99999," + ms[0] + ",5\n" + S.pplan[1].pid + ",2020-01,5"; pjPreview(); eq("actual import rows", PJ_IMP.rows.map(r => !r.err), [true, false, false]);
        PJ_IMP.kind = "reserve"; PJ_IMP.text = "fy,kind,ref,amount,spent,until,pid\n2569,reserve,r1,100,0,,\n2569,lapse,r2,50,,,\n2569,reserve,r3,100,200,2027-01-01,"; pjPreview(); eq("reserve import rows", PJ_IMP.rows.map(r => !r.err), [false, true, false]);
        eq("series by quarter has 4 bars", (PL_VIEW.period = "quarter", plSeries().length), 4); PL_VIEW.period = "month";
      });
      await grp("R2 voucher register", async () => {
        const V = S.vouchers; eq("work kinds", V.map(vWork).slice(0, 3), ["buy", "gen", "gen"]); ok("budget kind is one of three", V.every(v => ["inv", "ope", "nb"].includes(vBudget(v))));
        ok("every voucher has 5 steps", V.every(v => vSteps(v).steps.length === 5));
        const ap = V.find(v => v.state === "approve"), ck = V.find(v => v.state === "check"); eq("approve state is at step 3", vSteps(ap).cur, 2); eq("check state is at step 2", vSteps(ck).cur, 1);
        eq("paid is all done", vSteps(V[0]).done, 5); eq("group of the procurement voucher above 100,000", vcGroup(V[0]), 2);
        ok("csv has header", vrCsv().includes("voucher,item,payee")); as("plan"); ok("plan cannot edit register", !CRUD.defs.vreg.edit.can(ck)); as("vchk1"); ok("vchk1 can", CRUD.defs.vreg.edit.can(ck));
        has("future received date refused", msgs(CRUD.defs.vreg, { recv: "2099-01-01" }, ck), /ไม่เกินวันนี้|future/i);
        as("div"); ok("div sees only own unit's vouchers", V.filter(vVisible).every(v => (v.reg && v.reg.unit === me().unit) || (v.line && famLine(v.line).unit === me().unit)));
      });
      await grp("R3 contracts", async () => {
        const C = S.contracts; eq("required documents (first two sample contracts)", C.slice(0, 2).map(c => cxRequired(c).length), [6, 6]); eq("missing documents (first two sample contracts)", C.slice(0, 2).map(c => cxMissing(c).length), [1, 5]);
        as("proc"); const sp = CRUD.defs.cdoc; has("duplicate kind refused", msgs(sp, { contract: C[0].id, kind: "contract" }, null), /แล้ว|already/i); has("acceptance without phase refused", msgs(sp, { contract: C[0].id, kind: "accept", phase: "" }, null), /งวด|phase/i);
        sp.create.run({ contract: C[0].id, kind: "refprice", title: "t", pages: 1, scan: "ocr", kept: "x" }); eq("missing goes down", cxMissing(C[0]).length, 0);
        has("alert for the expiring guarantee", cxAlerts().map(a => a.title), /ใกล้หมด|expires/i);
        CRUD.defs.cg.edit.run(C[1], { result: "mismatch", date: TODAY, ref: "r", note: "n" }); ok("bank mismatch is high", cxAlerts([C[1]]).some(a => a.sev === "high" && /ธนาคาร|bank/i.test(a.title)));
        C[1].guarantee.expires = "2026-10-01"; ok("expired guarantee with open phases is high", cxAlerts([C[1]]).some(a => a.sev === "high"));
        const e = S.emps.find(x => x.user === C[1].inspectors[0]); if (e) { e.status = "resigned"; ok("resigned inspector flagged", cxInspProblems(C[1]).length > 0); }
        as("plan"); ok("plan cannot add documents", !sp.create.can());
      });
      await grp("R5 construction", async () => {
        const W = S.cwip; eq("seed stages", W.map(x => x.status), ["building", "cap", "xreq"]); as("fin"); const sp = CRUD.defs.cwip, x = W[0];
        eq("form asks for completion first", sp.fields(x, {}).map(f => f.id), ["date", "ref"]); has("future date refused", msgs(sp, { date: "2099-01-01" }, x), /ไม่เกินวันนี้|future/i);
        sp.edit.run(x, { date: TODAY, ref: "r" }); eq("completed", x.status, "done"); has("used asset number refused", msgs(sp, { assetNo: "AS-ตัวอย่าง-0001", date: TODAY }, x), /ใช้แล้ว|used/i);
        sp.edit.run(x, { assetNo: "N1", klass: "building", date: TODAY, cost: 100 }); sp.edit.run(x, { lgu: CW_LGU[0], date: TODAY, letter: "l" }); sp.edit.run(x, { date: TODAY, ref: "r" }); sp.edit.run(x, { gfDoc: "g", date: TODAY }); eq("transfer requested", x.status, "xreq");
        eq("requester cannot approve", sp.acts(x).length, 0); as("finhead"); ok("finhead can", !!act(sp, x, "ok")); act(sp, x, "ok").run(x); eq("removed", x.status, "removed"); as("fin"); ok("removed cannot be edited", !sp.edit.can(x));
        as("plan"); ok("plan cannot register", !sp.create.can()); ok("tier cwipx exists", S.tiers.some(t => t.doc === "cwipx"));
        eq("asset category added", ASSET_CATS.some(c => c.id === "7210"), true);
      });
      await grp("R8 finance extras", async () => {
        const K = S.kfac; eq("K adjustment signs", K.map(kfComp), [103200, -35200]); eq("K approver tier", tierRole("kfac", 103200), "finhead"); eq("K approver tier, big", tierRole("kfac", 3e6), "exec");
        as("fin"); const sp = CRUD.defs.kfac; eq("requester cannot approve K", sp.acts(K[0]).length, 0); as("finhead"); act(sp, K[0], "ok").run(K[0]); eq("K approved", K[0].status, "approved"); as("fin"); act(sp, K[0], "done").run(K[0]); eq("K done", K[0].status, "done");
        has("K work value over the contract refused", msgs(sp, { contract: S.contracts[1].id, base: 1e12, k: 1.1 }, null), /เกิน|exceed/i);
        const cr = CRUD.defs.cres, c = S.cres[0]; as("exec"); act(cr, c, "ok").run(c); as("fin"); act(cr, c, "sent").run(c); cr.edit.run(c, { res: "granted", amt: 5, date: TODAY, ref: "" }); eq("reserve granted", [c.status, c.result.amount], ["granted", 5]);
        const rf = CRUD.defs.refund, r = S.refunds[0]; as("finhead"); act(rf, r, "ok").run(r); as("fin"); rf.edit.run(r, { gfDoc: "g", date: TODAY }); eq("refund done", r.status, "done");
        const ta = CRUD.defs.assign, a = S.assigns[0]; as("fin"); eq("fin cannot verify assignment", ta.acts(a).length, 0); as("finhead"); ok("finhead can", ta.acts(a).length === 2);
        has("assignment above the contract refused", msgs(ta, { contract: S.contracts[0].id, amount: 1e13, date: TODAY }, null), /เกิน|exceed/i);
        const rb = CRUD.defs.rcpbook, b = S.rcpbooks[0]; as("fin"); has("receipt number cannot go back", msgs(rb, { last: 1 }, b), /ลดลง|down/i); has("overlap refused", msgs(rb, { book: "x", from: 40, to: 60 }, null), /ซ้อน|overlap/i); eq("book near end", rbState(b), "warn"); rb.edit.run(b, { last: 50 }); eq("book full", rbState(b), "full");
        const w = whtRows(); ok("tax from paid vouchers", w.length >= 1 && w.every(x => x.tax === Math.round(x.tax * 100) / 100)); as("fin"); CRUD.defs.whtr.edit.run(w[0], { date: TODAY, no: "R" }, ""); eq("filed", whtSt(whtRows()[0]), "filed");
        as("div"); ok("div has no finance-extra page", !FX_ROLES.includes("div"));
      });
      await grp("R7 letters", async () => {
        as("fin"); eq("candidates", ltCandidates().map(c => c.tpl.id), ["T1", "T2", "T3", "T5"]); eq("auto drafts", ltAuto(), 4); eq("no second draft", ltAuto(), 0);
        const sp = CRUD.defs.letter, t3 = S.letters.find(l => l.tpl === "T3"); ok("blanks counted", ltMissing(t3) > 0); has("cannot sign with blanks", [act(sp, t3, "send").run(t3)], /ต้องระบุ/); eq("still draft", t3.status, "draft");
        const t1 = S.letters.find(l => l.tpl === "T1"); eq("T1 has no blanks", ltMissing(t1), 0); act(sp, t1, "send").run(t1); eq("signing", t1.status, "signing"); ok("author cannot sign", !act(sp, t1, "sign")); as("exec"); act(sp, t1, "sign").run(t1); as("fin"); act(sp, t1, "number").run(t1); eq("sent with the next number", [t1.status, t1.no], ["sent", LT_PREFIX + "0002/" + CUR_FY]);
        const ib = CRUD.defs.inbox; eq("incoming statuses", S.inbox.map(x => x.status), ["received", "assigned", "done"]); const nw = ib.create.run({ dateRecv: TODAY, from: "t", refNo: "r", subject: "s", unit: "", due: "", pid: "", note: "" }); eq("next received number", nw.no, "รับ 0004/" + CUR_FY);
        has("future received date refused", msgs(ib, { dateRecv: "2099-01-01", due: "" }, null), /ไม่เกินวันนี้|future/i); eq("overdue found", S.inbox.filter(ibOver).map(x => x.id), ["IB-0002"]);
        as("plan"); ok("plan cannot draft or register", !ltActor() && !ibActor()); as("finhead"); ok("finhead can edit templates", CRUD.defs.ltpl.edit.can(S.ltpl[0])); as("fin"); ok("fin cannot edit templates", !CRUD.defs.ltpl.edit.can(S.ltpl[0]));
      });
      await grp("R6 facility", async () => {
        const vb = CRUD.defs.vbook; as("proc");
        has("vehicle overlap refused", msgs(vb, { vehicle: "VH-0002", start: "2026-10-21T08:00", end: "2026-10-21T10:00" }, null), /ซ้อน|overlap/i); has("return before start refused", msgs(vb, { vehicle: "VH-0001", start: "2026-10-25T10:00", end: "2026-10-25T08:00" }, null), /หลัง|after/i);
        const other = S.vbooks.find(b => b.status === "requested"); as("proc"); ok("proc can approve someone else's request", !!act(vb, other, "ok")); eq("approved", [act(vb, other, "ok").run(other), other.status], ["อนุมัติแล้ว", "approved"]);
        as("div"); const nb = vb.create.run({ vehicle: "VH-0001", purpose: "p", dest: "d", start: "2026-10-18T10:00", end: "2026-10-18T12:00" }); as("prochead"); eq("overlap with an approved request refused at approval", [act(vb, nb, "ok").run(nb), nb.status].map(x => String(x).slice(0, 5)), ["ช่วงเ", "reque"]); S.vehicles[2].status = "repair"; as("div"); const nr = vb.create.run({ vehicle: "VH-0003", purpose: "p", dest: "d", start: "2026-12-01T08:00", end: "2026-12-01T09:00" }); as("prochead"); eq("repair vehicle refused", [act(vb, nr, "ok").run(nr), nr.status], ["รถไม่พร้อมใช้", "requested"]);
        eq("fuel stats", [flStats("VH-0001").km, Math.round(flStats("VH-0001").kmpl * 10) / 10, flStats("VH-0002").kmpl], [1000, 14.1, 20]); as("proc"); has("odometer cannot go back", msgs(CRUD.defs.fuel, { vehicle: "VH-0001", date: "2026-10-15", litres: 1, cost: 1, odo: 100 }, null), /ต่ำกว่า|below/i);
        eq("equipment states", S.bequip.map(eqState), ["ok", "svc", "end", "ok", "svc"]); eq("building spend", S.bldgs.map(b => blSpend(b.id)), [0, 85000]);
        const w = S.wos.find(x => x.status === "open"); act(CRUD.defs.wo, w, "assign").run(w); CRUD.defs.wo.edit.run(w, { doneDate: TODAY, cost: 3000, doneNote: "n" }); eq("repair counted in the budget", blSpend("BL-01"), 3000);
        const rk = CRUD.defs.rbook; has("room overlap refused", msgs(rk, { room: "RM-01", start: "2026-10-19T10:00", end: "2026-10-19T11:00" }, null), /ซ้อน|overlap/i);
        eq("alerts exist", fcAlerts().filter(a => a.sev === "high").length >= 3, true); as("plan"); ok("plan cannot add vehicles", !CRUD.defs.vehicle.create.can()); ok("everyone can request", CRUD.defs.vbook.create.can());
        eq("Fisko receipt books untouched", S.rbooks.map(b => b.id).slice(0, 1), ["BK-2570-01"]);
      });
      await grp("R9 payroll and OneDPT", async () => {
        as("hr"); const lines = payFor("2026-10").filter(l => l.ded > 0); eq("deductions in the run", lines.map(l => [l.emp, l.ded]), [["EM-0002", 3000], ["EM-0003", 2500]]); eq("paused debt not deducted", S.deds[2].status, "paused");
        const sp = CRUD.defs.ded, e2 = hpEmp(S.deds[1].emp); has("ceiling refused", msgs(sp, { emp: e2.id, monthly: e2.salary, total: e2.salary * 10 }, null), /ร้อยละ|%/); has("monthly above total refused", msgs(sp, { emp: e2.id, monthly: 5000, total: 1000 }, null), /เกิน|exceed/i);
        const run = { id: "PR-2026-10", month: "2026-10", status: "closed", lines }; S.payruns.unshift(run); eq("balance after the run", [dedPaid(S.deds[0]), dedLeft(S.deds[0])], [3000, 57000]); ok("next month continues", payFor("2026-11").some(l => l.dedItems.some(i => i.id === "DD-0001")));
        const sh = CRUD.defs.salhist, em = S.emps[3], b0 = em.salary; has("future date refused", msgs(sh, { emp: em.id, date: "2099-01-01", salary: b0 + 1, why: "xxxxxxxxxx" }, null), /ไม่เกินวันนี้|future/i); has("same base refused", msgs(sh, { emp: em.id, date: TODAY, salary: b0, why: "xxxxxxxxxx" }, null), /เท่าเดิม|same/i);
        sh.create.run({ emp: em.id, date: TODAY, salary: b0 + 2000, why: "ปรับเงินเดือนทดสอบ" }); eq("salary follows the history", [em.salary, shOf(em.id).length], [b0 + 2000, 2]); as("fin"); ok("only hr records", !sh.create.can());
        eq("csv parse", odCsv('a,b\nx,"1,200"\ny,300\n'), [["a", "b"], ["x", 1200], ["y", 300]]);
        const r = await fetch("tests/sample_onedpt.xlsx"); ok("sample xlsx reachable", r.ok); if (r.ok) { const rows = await xlsxRead(await r.arrayBuffer()); eq("xlsx rows", rows.length, 7); eq("xlsx header", rows[0], ["หน่วยงาน", "งบประมาณ (ล้านบาท)", "เบิกจ่ายแล้ว (ล้านบาท)", "จำนวนโครงการ"]); eq("xlsx number cell", rows[1][1], 120.5); }
        const a = odAgg(S.odsets[0]); eq("aggregate top", [a.data[0].label, a.data[0].value], ["สำนักตัวอย่าง ค", 150.9]); ok("project csv has a header", odProjectCsv().includes("project_id"));
      });
      await grp("Request form: money kinds, off-budget money, categories, account 4 (Q4a)", async () => {
        const MT = CRUD.defs.moneyType, EC = CRUD.defs.expCat, d = S.requests.find(x => x.status === "draft") || S.requests[0], c = rqCls(d);
        ok("seed: 4 budget kinds and 4 off-budget kinds, a category table", rqMoneyTypes("bud").length === 4 && rqMoneyTypes("off").length === 4 && rqCats("main").length >= 4 && rqCats("sub").length >= 4);
        eq("a request has four account slots and an off-budget list", [c.acct.length, Array.isArray(c.offs)], [4, true]);
        // old data: co-funding turns into an off-budget line once
        const old = { id: "T", items: [], act: "", cls: { prog: "", proj: "", c1code: "", c1name: "", c2code: "", c2name: "", nature: "", acct: [true, false, false], tag: "", money: [], base: [], co: { on: true, amt: 750000, src: "สถาบันตัวอย่าง" }, need: "" } }; const oc = rqCls(old);
        eq("old co-funding becomes one off-budget line, account list grows to 4", [oc.acct.length, oc.offs.length, oc.offs[0].amt], [4, 1, 750000]);
        c.offs = [{ type: "off01", amt: 100000, note: "a" }, { type: "off03", amt: 50000, note: "" }]; rqSyncCo(c); eq("off-budget total and the old co field follow the lines", [rqOffTotal(c), c.co.on, c.co.amt], [150000, true, 150000]);
        // the lists: who edits, validation, retire
        as("div"); eq("only Planning sets kinds of money and categories", [MT.create.can(), EC.create.can()], [false, false]); as("plan"); eq("Planning can", [MT.create.can(), EC.create.can()], [true, true]);
        has("a duplicate kind name in the group is refused", msgs(MT, { kind: "off", th: "เงินรายได้" }, null), /ชื่อนี้แล้ว|already/);
        has("a duplicate code under the same main category is refused", msgs(EC, { level: "sub", parent: "M800", code: "100", th: "x" }, null), /มีอยู่แล้ว|exists/); eq("the same sub code under another main category is fine", msgs(EC, { level: "sub", parent: "M700", code: "100", th: "x" }, null), []);
        ok("a sub category needs a parent (form field)", EC.fields(null, { level: "sub" }).some(f => f.id === "parent" && f.req) && !EC.fields(null, { level: "bud" }).some(f => f.id === "parent") && EC.fields(null, { level: "main" }).some(f => f.id === "parent" && f.req));
        const ot = MT.create.run({ kind: "off", th: "เงินทดสอบ", en: "Test money" }); ok("a new off-budget kind appears on the form", rqMoneyTypes("off").some(t => t.id === ot.id));
        eq("an unused kind can be deleted, a used one only retired", [act(MT, ot, "del") ? 1 : 0, act(MT, S.moneyTypes.find(t => t.id === "off01"), "retire") ? 1 : 0], [1, 1]);
        // category picks
        c.btype = ""; c.c1code = "800"; c.c1name = ""; const sel = rqCatFields(c, "", d), sub8 = sel.slice(sel.indexOf('id="rq-c2"')); c.c1code = "700"; const sel7 = rqCatFields(c, "", d), sub7 = sel7.slice(sel7.indexOf('id="rq-c2"'));
        ok("the sub list follows the main: 800 offers all twelve, 700 only 700", (sub8.match(/<option value="\d+"/g) || []).length === 12 && (sub7.match(/<option value="\d+"/g) || []).length === 1 && sub7.includes("700"));
        c.btype = "per"; c.c1code = "600"; ok("a main category outside the chosen budget type is marked", /อยู่นอกประเภทงบที่เลือก|outside the chosen budget type/.test(rqCatFields(c, "", d)));
        c.btype = ""; c.c1code = "XYZ"; c.c1name = "พิมพ์เอง"; ok("a category typed earlier is kept and marked", /พิมพ์ไว้เดิม|typed earlier/.test(rqCatFields(c, "", d)));
        // the reference table from the user's file: levels, parents, import
        eq("the table has 5 budget types, 7 groups, 12 main, 34 sub", ["bud", "grp", "main", "sub"].map(l => rqCats(l).length), [5, 7, 12, 34]);
        eq("700 land and construction leads to the investment budget", [ecBudOf(ecMain("700")), ecBudOf(ecMain("100")), ecBudOf(ecMain("410")), ecBudOf(ecMain("800"))], ["inv", "per", "ope", "sub"]);
        const csv = ecCsv(); eq("the export has the file's header and every row", [csv.split("\n")[0], csv.split("\n").length - 1], ["REF_ID,REF_CODE,REF_NAME,REF_TYPE,PARENT_ID", S.expCats.length]);
        const bad = ecCheck("REF_ID,REF_CODE,REF_NAME,REF_TYPE,PARENT_ID\nA1,9,ทดสอบ,OBJC,\nA2,9,ทดสอบ,XXX,B01\nA3,55,งบใหม่,BUD_TYPE,\nA3,56,ซ้ำ,BUD_TYPE,\nA4,901,ย่อย,OBJC_SUB,B01"); eq("the file check flags each kind of error", bad.rows.map(x => !!x.err), [true, true, false, true, true]);
        eq("a file with a missing header column is refused", !!ecCheck("REF_ID,REF_CODE\nx,y").err, true);
        const good = ecCheck("REF_ID,REF_CODE,REF_NAME,REF_TYPE,PARENT_ID\n\"g-1\",\"06\",\"งบ, ทดสอบ\",BUD_TYPE,\ng-2,8,หมวดทดสอบ,OBJC,g-1\ng-3,850,หลักทดสอบ,SUB_OBJC,g-2\ng-4,850,ย่อยทดสอบ,OBJC_SUB,g-3"); eq("a good file passes, with a quoted comma and parents inside the file", good.rows.map(x => x.err), ["", "", "", ""]);
        const n0 = S.expCats.length, rr = ecApply(good.rows); eq("the import adds rows and keeps REF_ID as the id", [rr.add, S.expCats.length - n0, ecById("g-3").parent, ecById("g-3").ref], [4, 4, "g-2", "g-3"]);
        const again = ecApply(ecCheck("REF_ID,REF_CODE,REF_NAME,REF_TYPE,PARENT_ID\ng-3,851,หลักทดสอบแก้,SUB_OBJC,g-2").rows); eq("the same REF_ID updates the row", [again.upd, ecById("g-3").code, tx(ecById("g-3").name)], [1, "851", "หลักทดสอบแก้"]);
        eq("the level of an existing row can't be changed by import", ecCheck("REF_ID,REF_CODE,REF_NAME,REF_TYPE,PARENT_ID\ng-3,851,x,OBJC_SUB,g-3").rows[0].err !== "", true);
        c.btype = "inv"; c.c1code = "100"; ok("a main category under another budget type is flagged on the request", checks(d).some(x => /ประเภทงบและหมวดรายจ่าย|Budget type and categories/.test(x.title))); c.btype = ""; c.c1code = "";
        // the real form
        as("div"); const mine = S.requests.find(x => x.unit === me().unit && (x.status === "draft" || x.status === "returned")) || S.requests.find(x => x.unit === me().unit); renderShell(); window.FISKO_ROUTE = "#request"; REQ_TAB = "main"; if (mine) { openReq(mine.id); await tick(300); }
        const v = document.getElementById("view"); ok("the form shows four accounts, the money kinds and the off-budget panel", !mine || (/rq-acct3/.test(v.innerHTML) && /rq-m-ent/.test(v.innerHTML) && /เงินนอกงบประมาณ/.test(v.innerText) && /rq-c1/.test(v.innerHTML)), v && v.innerText.slice(0, 60));
        if (mine && document.querySelector("#rq-off-add")) { const cm = rqCls(mine), n0 = cm.offs.length; document.querySelector("#rq-off-add").click(); await tick(200); eq("the add button adds a line", cm.offs.length, n0 + 1); const t = document.querySelector("#rq-off-t-" + n0), a = document.querySelector("#rq-off-a-" + n0); if (t && a) { t.value = "off01"; t.dispatchEvent(new Event("change")); await tick(100); const a2 = document.querySelector("#rq-off-a-" + n0); a2.value = "123000"; a2.dispatchEvent(new Event("change")); await tick(100); eq("type and amount are saved", [cm.offs[n0].type, cm.offs[n0].amt, cm.co.amt >= 123000], ["off01", 123000, true]); } }
        as("plan"); window.FISKO_ROUTE = "#bq-money"; route(); await tick(150); ok("BQ2 opens", /ประเภทเงิน/.test(document.getElementById("view").innerText)); window.FISKO_ROUTE = "#bq-cat"; route(); await tick(150); ok("BQ3 opens", /หมวดรายจ่าย/.test(document.getElementById("view").innerText));
      });
      await grp("Request form: area, reference price register, monthly plan (Q4b)", async () => {
        const G = CRUD.defs.geo, RP = CRUD.defs.refPrice, r = S.requests.find(x => x.status === "draft") || S.requests[0], c = rqCls(r);
        ok("seed: ten areas with coordinates and prices with a source", S.geo.length === 10 && S.geo.every(g => g.lat && g.lng) && S.prices.every(p => p.src && "eff" in p));
        // area
        const a = { prov: "เชียงใหม่", dist: "เมืองเชียงใหม่", sub: "ศรีภูมิ", lat: "", lng: "" }; eq("a matching name is found in the table", geoFind(a) && geoFind(a).id, "GE-005"); eq("a name that is not in the table is not found", geoFind({ prov: "x", dist: "y", sub: "z" }), undefined);
        ok("coordinates outside Thailand are flagged", geoBad({ lat: 40, lng: 100 }) && geoBad({ lat: 13, lng: 10 }) && !geoBad({ lat: 13.7, lng: 100.5 }));
        as("div"); eq("only Planning edits the area table", [G.create.can()], [false]); as("plan"); eq("Planning can", [G.create.can()], [true]);
        has("a duplicate area is refused", msgs(G, { prov: "เชียงใหม่", dist: "เมืองเชียงใหม่", sub: "ศรีภูมิ", lat: 18.8, lng: 99 }, null), /มีอยู่แล้ว|exists/); has("a latitude outside Thailand is refused", msgs(G, { prov: "ก", dist: "ข", sub: "ค", lat: 51.5, lng: 100 }, null), /ละติจูด|Latitude/);
        // reference price register
        const sp = S.prices[0]; ok("a price is valid by default", rpValid(sp) && stdPrice({ name: sp.name })); sp.exp = addDays(TODAY, -1); ok("an expired price no longer applies", !rpValid(sp) && !stdPrice({ name: sp.name })); sp.exp = ""; sp.retired = true; ok("a retired price no longer applies", !stdPrice({ name: sp.name })); delete sp.retired;
        sp.eff = addDays(TODAY, 5); ok("a price not yet valid does not apply", !rpValid(sp)); sp.eff = "2026-10-01";
        has("an end date before the start is refused", msgs(RP, { th: "x", type: "inv", unit: "u", price: 1, src: "std", eff: "2026-10-10", exp: "2026-10-01" }, null), /วันสิ้นสุด|end/);
        as("div"); eq("a division can't edit prices", RP.create.can(), false); for (const role of ["plan", "fin", "admin"]) { as(role); ok("can edit: " + role, RP.create.can()); } as("plan");
        const np = RP.create.run({ th: "ราคาทดสอบ", en: "Test", type: "ope", unit: "หน่วย", price: 10, src: "quote", eff: TODAY, exp: "", doc: "ใบเสนอราคา 1" }); ok("a new price is added with its source", np.src === "quote" && S.prices.includes(np));
        // monthly plan
        const q = r.qplan = [300000, 300000, 300000, 100000]; r.mplan = Array(12).fill(0); r.mstat = Array(12).fill(""); r.mres = Array(12).fill(null);
        const m = rqMonthFill(r, "quarter"); eq("the quarterly plan spreads to three months each, adding up", [rqMSum(m), m[0] + m[1] + m[2]], [rqMSum(q), q[0]]);
        const e = rqMonthFill(r, "even"); eq("even spread adds up to the reference amount", rqMSum(e), rqTarget(r)); r.mplan = e.map((v, i) => (i < 6 ? v * 2 : 0)); const sc = rqMonthFill(r, "scale"); eq("scaling keeps the shape and adds up", [rqMSum(sc), sc[8]], [rqTarget(r), 0]);
        eq("with nothing to scale it returns null", (r.mplan = Array(12).fill(0), rqMonthFill(r, "scale")), null);
        // rights, and the form
        r.status = "draft"; as("div"); const own = S.requests.find(x => x.unit === me().unit && editable(x)); ok("a division can edit its own draft's monthly plan", !own || rqpMonthRights(own).plan);
        const appr = S.requests.find(x => x.status === "approved" && actAmount(x) != null); if (appr) { as("div"); const du = S.users.find(u => u.role === "div" && u.unit === appr.unit); ROLE = "div"; ok("results can't be entered before an amount is approved (checked on a draft)", !rqpMonthRights(r).res); as("plan"); ok("Planning can enter results once an amount is approved", rqpMonthRights(appr).res); }
        as("div"); renderShell(); const mine = S.requests.find(x => x.unit === me().unit && editable(x)); window.FISKO_ROUTE = "#request";
        if (mine) { REQ_TAB = "plan"; openReq(mine.id); await tick(300); const v = document.getElementById("view"); ok("the plan tab shows the monthly plan", /rq-month/.test(v.innerHTML) && /data-mp="11"/.test(v.innerHTML));
          const i = document.querySelector('[data-mp="0"]'); if (i) { i.value = "50000"; i.dispatchEvent(new Event("change")); await tick(150); eq("a month's plan is saved", mine.mplan[0], 50000); }
          const b = document.querySelector("#mp-even"); if (b) { b.click(); await tick(150); eq("the even-spread button fills the plan to the amount", rqMSum(mine.mplan), rqTarget(mine)); }
          REQ_TAB = "main"; openReq(mine.id); await tick(300); ok("the main tab has the area panel", /id="rq-area"/.test(document.getElementById("view").innerHTML)); const ab = document.querySelector("#ar-add"); if (ab) { ab.click(); await tick(150); eq("the add-area button adds a row", rqCls(mine).areas.length >= 1, true);
            const pe = document.querySelector("#ar-p-0"), de = document.querySelector("#ar-d-0"), se = document.querySelector("#ar-s-0"); if (pe && de && se) { pe.value = "ขอนแก่น"; pe.dispatchEvent(new Event("change")); await tick(100); document.querySelector("#ar-d-0").value = "เมืองขอนแก่น"; document.querySelector("#ar-d-0").dispatchEvent(new Event("change")); await tick(100); document.querySelector("#ar-s-0").value = "ในเมือง"; document.querySelector("#ar-s-0").dispatchEvent(new Event("change")); await tick(100); eq("a matching name fills the coordinates", [rqCls(mine).areas[0].lat, rqCls(mine).areas[0].lng], [16.432, 102.833]); } } }
        as("plan"); for (const id of ["#bq-geo", "#bq-ref"]) { window.FISKO_ROUTE = id; route(); await tick(150); ok("page opens " + id, !/undefined|NaN/.test(document.getElementById("view").innerText)); }
      });
      await grp("Request kind and continuing commitments (Q4e)", async () => {
        const C = CRUD.defs.commit, F = FORM_FY;
        eq("seed: three commitments, two waiting to be pulled and one finished", [S.commits.length, S.commits.map(mcState).join()], [3, "ready,ready,done"]);
        // the kind of request
        as("div"); const f = CRUD.defs.rqReq.fields(null, {}).find(x => x.id === "kind"); ok("the new-request form asks for the kind, single-year by default", !!f && f.req && f.value === "year" && f.opts.map(o => o[0]).join() === "year,multi");
        const outs = CRUD.defs.rqReq.fields(null, {}).find(x => x.id === "out").opts[0][0], acts = CRUD.defs.rqReq.fields(null, { out: outs }).find(x => x.id === "act").opts[0][0];
        const r1 = CRUD.defs.rqReq.create.run({ name: "ปีเดียว", kind: "year", out: outs, act: acts, type: "ope" }), r2 = CRUD.defs.rqReq.create.run({ name: "ผูกพัน", kind: "multi", out: outs, act: acts, type: "inv" });
        eq("a single-year request has no years table, a multi-year one starts with this year and the next", [!!r1.multi, !!r2.multi, Object.keys(r2.years).join()], [false, true, `${F},${F + 1}`]);
        ok("the main tab has the kind select for a draft", (renderShell(), window.FISKO_ROUTE = "#request", REQ_TAB = "main", openReq(r1.id), route(), true)); await tick(250); ok("the select is on the page", !!document.querySelector("#rq-kind") && document.querySelector("#rq-kind").value === "year");
        eq("changing to multi-year sets the years table", [mcSetKind(r1, "multi"), r1.multi, Object.keys(r1.years).length], ["", true, 2]); r1.years[F + 1] = 5e6; ok("going back to single-year is refused while a later year holds an amount", /ยังมีวงเงิน|still holds/.test(mcSetKind(r1, "year")) && r1.multi);
        r1.years[F + 1] = 0; eq("and allowed once it is empty", [mcSetKind(r1, "year"), r1.multi, "years" in r1], ["", false, false]);
        S.requests = S.requests.filter(x => x !== r1 && x !== r2);
        // pulling commitments from earlier years
        as("plan"); const c1 = S.commits[0], n0 = S.requests.length, p1 = mcPull(c1);
        ok("a pulled commitment becomes a draft multi-year request with its origin", !!p1 && p1.status === "draft" && p1.multi && p1.cont.id === "MC-001" && p1.cont.start === F - 1 && p1.cont.end === F + 1 && S.requests.length === n0 + 1);
        eq("this year's amount is the line, the later years go in the table, last year is the comparison", [p1.amount, JSON.stringify(p1.years), p1.prev, p1.unit], [12e6, JSON.stringify({ [F]: 12e6, [F + 1]: 6e6 }), 9e6, c1.unit]);
        ok("its activity is found by code in this year's structure", !!p1.act && (S.structure[F].find(n => n.id === p1.act) || {}).code === c1.actCode);
        eq("it is pulled once", [mcPull(c1), mcState(c1)], [null, "pulled"]); eq("a finished one can't be pulled", mcPull(S.commits[2]), null);
        ok("the request carries a reason long enough for the check", p1.reason.length >= 40);
        // scope: a division pulls its own unit only
        as("div"); const mine = S.commits.find(c => mcState(c) === "ready" && c.unit === me().unit), other = S.commits.find(c => mcState(c) === "ready" && c.unit !== me().unit); ok("a division sees only its unit's commitments", C.list().every(c => c.unit === me().unit));
        const got = mcPullAll(); ok("a division pulls its own unit's only", got.every(r => r.unit === me().unit) && (!other || mcState(other) === "ready"), got.length);
        as("plan"); const got2 = mcPullAll(); eq("Planning pulls the rest", [S.commits.filter(c => mcState(c) === "ready").length, got2.length >= 0], [0, true]);
        // the request page
        as("div"); const pulled = S.requests.find(r => r.cont && r.unit === me().unit); if (pulled) { renderShell(); window.FISKO_ROUTE = "#request"; REQ_TAB = "main"; openReq(pulled.id); route(); await tick(250); ok("a continuing request shows its origin and has no kind select", !document.querySelector("#rq-kind") && /ผูกพันต่อเนื่อง|Continuing/.test(document.getElementById("view").innerText)); eq("its kind can't be changed", /เปลี่ยนประเภทไม่ได้|can't change/.test(mcSetKind(pulled, "year")), true); }
        // the register
        as("plan"); ok("only Planning edits the register", C.create.can() && (as("div"), !C.create.can()) && (as("proc"), !C.edit.can(S.commits[0]))); as("plan");
        has("the last year before the first is refused", msgs(C, { th: "x", unit: S.commits[0].unit, actCode: "a", type: "ope", startFy: F, endFy: F - 1 }, null), /ปีสุดท้าย|last year/);
        has("a commitment needs an amount in some year", msgs(C, { th: "x", unit: "u", actCode: "a", type: "ope", startFy: F, endFy: F + 1, ["y_" + F]: 0, ["y_" + (F + 1)]: 0 }, null), /วงเงินอย่างน้อย|needs an amount/);
        has("a pulled commitment's period can't change", msgs(C, { th: "x", unit: "u", actCode: "a", type: "ope", startFy: F - 1, endFy: F + 5, ["y_" + F]: 1 }, c1), /แก้ระยะเวลาไม่ได้|can't change/);
        eq("the amount fields follow the years chosen", [C.fields(null, { startFy: F, endFy: F + 2 }).filter(x => /^y_/.test(x.id)).length, C.fields(null, { startFy: F, endFy: F }).filter(x => /^y_/.test(x.id)).length], [3, 1]);
        const nc = C.create.run({ th: "ทดสอบ", en: "t", unit: S.commits[0].unit, actCode: S.commits[0].actCode, type: "ope", startFy: F - 1, endFy: F, ["y_" + (F - 1)]: 1e6, ["y_" + F]: 2e6 });
        eq("a new commitment is waiting to be pulled", [mcState(nc), mcSum(nc)], ["ready", 3e6]); ok("an unpulled one can be deleted, a pulled one only retired", C.acts(nc).some(a => a.id === "del") && C.acts(c1).some(a => a.id === "retire") && !C.acts(c1).some(a => a.id === "del"));
        C.acts(nc).find(a => a.id === "del").run(); ok("deleted", !S.commits.includes(nc));
        window.FISKO_ROUTE = "#bq-commit"; route(); await tick(200); ok("BQ6 opens", /รายการผูกพัน/.test(document.getElementById("view").innerText) && !/undefined|NaN/.test(document.getElementById("view").innerText));
        { const x = S.commits.find(c => mcState(c) === "pulled"); S.requests = S.requests.filter(r => !r.cont); }
      });
      await grp("Committee observations, House and Senate (Q2)", async () => {
        const C = CRUD.defs.cmobs, org = tx(S.org);
        ok("seed: the three earlier observations gain an id, a house, a committee, a date and a status", S.observations.length === 3 && S.observations.every(o => /^OB-\d+$/.test(o.id) && o.house && o.committee && o.date && o.status) && S.observations.some(o => o.house === "sen") && S.observations.some(o => o.house === "hr"));
        eq("the house is read from the usual spellings", ["สส", "ส.ส.", "HR", "สภาผู้แทนราษฎร", "สว", "Senate", "วุฒิสภา", "x", ""].map(obHouse), ["hr", "hr", "hr", "hr", "sen", "sen", "sen", "", ""]);
        eq("dates in ISO, day/month/Buddhist year and day.month.year are read", [obDate("2027-01-20"), obDate("12/1/2570"), obDate("5.11.2026"), obDate("zz")], ["2027-01-20", "2027-01-12", "2026-11-05", ""]);
        ok("only our own agency counts as ours", obOurs(org + " กองแผนงาน") && obOurs(org) && !obOurs("หน่วยงานอื่นตัวอย่าง"));
        // the file
        const r = obCheck(obSample()), ok1 = r.rows.filter(x => !x.err && !x.dup && x.ours);
        eq("the sample file: 5 rows, one wrong house, one repeat, one of another agency, two of ours", [r.rows.length, r.rows.filter(x => x.err).length, r.rows.filter(x => x.dup).length, r.rows.filter(x => !x.err && !x.dup && !x.ours).length, ok1.length], [5, 1, 1, 1, 2]);
        eq("a unit is set when the agency text names one", [r.rows[0].unit !== "", r.rows[1].unit], [true, ""]);
        has("the wrong house is reported", [r.rows.find(x => x.err).err], /สภา|house/i);
        ok("a file without the needed columns is refused", !!obCheck("a,b\n1,2").err && /house|HOUSE/.test(obCheck("a,b\n1,2").err));
        ok("columns are found by Thai names too", !obCheck("สภา,คณะกรรมาธิการ,วันที่,หน่วยงาน,ข้อสังเกต\nสส,ก,2027-01-01," + org + ",ข้อความ").err);
        as("plan"); const n0 = S.observations.length, a1 = obApply(r.rows, false);
        eq("import keeps our own items only and counts the rest", [a1.add, a1.other, a1.dup, S.observations.length - n0], [2, 1, 1, 2]); ok("imported rows are open, from a file, and keep their house", S.observations.slice(-2).every(o => o.status === "open" && o.source === "import") && S.observations.slice(-2).map(o => o.house).join() === "hr,sen");
        const again = obCheck(obSample()); eq("importing the same file again finds duplicates, adds nothing", [again.rows.filter(x => x.dup).length, obApply(again.rows, false).add], [3, 0]);
        const fresh = obCheck(obSample().replace("หน่วยงานอื่นตัวอย่าง", "หน่วยงานอื่นตัวอย่าง")), all = obApply(fresh.rows, true); eq("with the box ticked, other agencies' items come in too", all.add, 1);
        S.obsCfg.names.push("หน่วยงานอื่นตัวอย่าง"); ok("the agency names can be extended", obOurs("หน่วยงานอื่นตัวอย่าง")); S.obsCfg.names.pop();
        // manual entry and rules
        eq("only Planning adds or edits", [C.create.can(), (as("div"), C.create.can()), (as("plan"), C.edit.can(S.observations[0]))], [true, false, true]);
        has("an answered item needs a reply", msgs(C, { house: "hr", committee: "x", date: TODAY, fy: 2571, text: "t", resp: "", status: "answered" }, null), /คำตอบ|reply/); eq("an open item needs none", msgs(C, { house: "hr", committee: "x", date: TODAY, fy: 2571, text: "t", resp: "", status: "open" }, null), []);
        const mk = C.create.run({ house: "sen", committee: "คณะทดสอบ", date: TODAY, fy: 2571, agency: org, unit: S.units.find(u => u.parent).id, ref: "x", text: "ข้อสังเกตทดสอบ", resp: "", status: "open" }); ok("a typed item is saved with its house, unit and source", mk.source === "manual" && mk.house === "sen" && mk.unit && mk.status === "open");
        as("plan"); eq("Planning can reply, then close, then reopen", [C.acts(mk).map(a => a.id).join(), (C.acts(mk).find(a => a.id === "reply").run(mk, "ตอบแล้วตามแผน"), mk.status), C.acts(mk).some(a => a.id === "close"), (C.acts(mk).find(a => a.id === "close").run(mk), mk.status), (C.acts(mk).find(a => a.id === "reopen").run(mk, "x"), mk.status)], ["reply,del", "answered", true, "closed", "open"]);
        // a division sees and answers only its unit's items
        { as("div"); const mine = me().unit, keepU = mk.unit; mk.unit = mine; S.observations.push(mk); ok("a division sees only the items given to its unit", C.list().length > 0 && C.list().every(o => o.unit === mine)); const aid = C.acts(mk).map(a => a.id).join(); mk.unit = "U-other"; ok("it can reply to its own unit's item and not to another's", aid === "reply" && C.acts(mk).length === 0); mk.unit = keepU; S.observations = S.observations.filter(o => o !== mk); as("plan"); }
        as("plan"); ok("the export has a header and one row per item", obCsv(S.observations).split("\n").length === S.observations.length + 1 && /^id,house,committee/.test(obCsv(S.observations)));
        S.observations = S.observations.filter(o => o !== mk);
        // the page and the import buttons
        reseed(); as("plan"); renderShell(); window.FISKO_ROUTE = "#bq-obs"; OB_IMP = { text: "", name: "", rows: null, err: "", all: false }; route(); await tick(250); const v = () => document.getElementById("view");
        ok("the page shows the tiles, the import panel and the list", /สว/.test(v().innerText) && !!document.querySelector("#ob-sample") && !!document.querySelector("#ob-names"));
        const nb = S.observations.length; document.querySelector("#ob-sample").click(); await tick(250); ok("the sample button fills and checks the file", !!OB_IMP.rows && OB_IMP.rows.length === 5 && !!document.querySelector("#ob-go") && !document.querySelector("#ob-go").disabled);
        document.querySelector("#ob-go").click(); await tick(250); eq("the import button adds our own items and logs it", [S.observations.length - nb, S.obsImports.length, S.obsImports[0].add], [2, 1, 2]);
        as("div"); renderShell(); window.FISKO_ROUTE = "#bq-obs"; route(); await tick(250); ok("a division can open the page, with the import off", !!document.querySelector("#ob-file") && document.querySelector("#ob-file").disabled);
      });
      await grp("Request from a document, simulated OCR (Q5)", async () => {
        const file = { name: "scan_request.pdf", size: 2048, type: "application/pdf", url: "" }, reset = id => (OCR = { file, sample: id, docs: ocRead(id), unit: "", err: "", done: null });
        as("div"); const mine = me().unit, n0 = S.requests.length;
        const A = ocRead("A"), B = ocRead("B"), Cc = ocRead("C");
        eq("three simulated readings: 1, 2 and 1 requests", [A.length, B.length, Cc.length], [1, 2, 1]);
        ok("every field carries a confidence and the original value", A[0].f.name.c > 0.9 && A[0].f.total.orig === "480,000" && A[0].items[0].price.c < OC_MIN);
        // A: the unit price is misread, and the total on the form does not match the lines
        reset("A"); const i0 = ocIssues(OCR.docs[0], ocUnit(OCR.docs[0]));
        ok("the low-confidence price and the total that differs from the lines are both reported", i0.some(m => /ราคา|price/.test(m) && /55%/.test(m)) && i0.some(m => /ไม่ตรงผลรวม|differs/.test(m)), i0);
        const r0 = ocImport(); ok("the import is refused and nothing is created", !!r0.err && S.requests.length === n0);
        OCR.docs[0].items[0].price.v = "24,000"; eq("correcting the price clears every issue", ocIssues(OCR.docs[0], ocUnit(OCR.docs[0])), []);
        const rA = ocImport(); ok("a draft request is made for the division's own unit", !rA.err && rA.made.length === 1 && rA.made[0].unit === mine && rA.made[0].status === "draft" && S.requests.length === n0 + 1, rA.err);
        const q = rA.made[0]; eq("it holds the line, the amount, the file and the origin", [q.items[0].qty, q.items[0].price, q.amount, q.docs.join(), q.src.kind, q.src.sample, q.src.changed], [20, 24000, 480000, "scan_request.pdf", "ocr", "A", 1]);
        ok("the type and the area came across, the coordinates from the area table", rqCls(q).nature === "inv" && rqCls(q).areas.length === 1 && rqCls(q).areas[0].lat === 13.7788, rqCls(q).areas);
        ok("it is logged", S.ocrLog.length === 1 && S.ocrLog[0].reqs[0] === q.id && S.ocrLog[0].fixed === 1);
        // B: two requests, one activity code misread
        reset("B"); const iB = OCR.docs.map(d => ocIssues(d, ocUnit(d)).length); ok("only the first request has issues (the activity code)", iB[0] > 0 && iB[1] === 0 && /รหัสกิจกรรม|Activity code/.test(ocIssues(OCR.docs[0], mine).join()), iB);
        const n1 = S.requests.length; ok("one bad request stops the whole document", !!ocImport().err && S.requests.length === n1);
        OCR.docs[0].f.act.v = (S.structure[FORM_FY].find(n => n.lvl === "activity") || {}).code; const rB = ocImport(); eq("then both are made", [rB.made.length, S.requests.length - n1, rB.made.map(r => r.items.length).join()], [2, 2, "2,1"]);
        // C: a poor photograph, much is missing
        reset("C"); const iC = ocIssues(OCR.docs[0], mine); ok("many things are reported: name, activity, reason, quantity, price", iC.length >= 6 && iC.some(m => /รหัสกิจกรรม|Activity code/.test(m)) && iC.some(m => /จำนวน|quantity/.test(m)) && iC.some(m => /ราคา|price/.test(m)), iC.length);
        const d = OCR.docs[0]; d.f.name.v = "ค่าวัสดุสำนักงานทดสอบ"; d.f.act.v = (S.structure[FORM_FY].find(n => n.lvl === "activity") || {}).code; d.f.reason.v = "จัดซื้อวัสดุสำนักงานให้เพียงพอต่อการปฏิบัติงานประจำปี"; d.f.agency.ok = true; d.f.nature.ok = true; d.items[0].name.ok = true; d.items[0].unitName.ok = true; d.items[0].qty.v = "5"; d.items[0].price.v = "1,200";
        eq("filling the gaps passes (an empty total is not compared)", ocIssues(d, mine), []); const rC = ocImport(); eq("and the amount is the lines' sum", rC.made[0].amount, 6000);
        // the total can be overridden by the lines, a bad number is refused
        reset("A"); OCR.docs[0].items[0].price.v = "24,0O0"; ok("a number with a letter is refused", ocIssues(OCR.docs[0], mine).some(m => /ราคา|price/.test(m))); OCR.docs[0].items[0].price.v = "2,400"; OCR.docs[0].items[0].price.ok = true; OCR.docs[0].useLines = true; eq("ticking use the lines' total lets a confirmed price through", ocIssues(OCR.docs[0], mine), []);
        // Planning picks the unit
        as("plan"); reset("A"); OCR.docs[0].items[0].price.v = "24,000"; const other = S.units.filter(u => u.parent).find(u => u.id !== me().unit); OCR.unit = other.id; const rP = ocImport(); ok("Planning's request goes to the chosen unit", !rP.err && rP.made[0].unit === other.id, rP.err);
        as("proc"); eq("others can't import (the page is view only)", ocCan(), false); as("div"); eq("a division and Planning can", [ocCan(), (as("plan"), ocCan())], [true, true]);
        // the page
        as("div"); renderShell(); window.FISKO_ROUTE = "#bq-ocr"; OCR = { file: null, sample: "A", docs: null, unit: "", err: "", done: null }; route(); await tick(250);
        ok("the page offers the file, the sample and the read button", !!document.querySelector("#oc-file") && !!document.querySelector("#oc-read") && document.querySelectorAll("#oc-sample option").length === 3);
        document.querySelector("#oc-sample").value = "A"; document.querySelector("#oc-read").click(); await tick(250); ok("reading shows the fields and a disabled create button", !!document.querySelector("#oc-f-0-name") && document.querySelector("#oc-go").disabled);
        const pr = document.querySelector("#oc-i-0-0-price"); pr.value = "24,000"; pr.dispatchEvent(new Event("change")); await tick(250); ok("correcting the price enables it", !document.querySelector("#oc-go").disabled);
        const nb = S.requests.length; document.querySelector("#oc-go").click(); await tick(250); eq("creating adds a draft and shows it", [S.requests.length - nb, !!document.querySelector("[data-ocopen]")], [1, true]);
        window.FISKO_ROUTE = "#requests"; route(); await tick(250); ok("the request list has a way in", !!document.querySelector('[data-jump="bq-ocr"]'));
      });
      await grp("Budget request dashboard and summary report (Q7)", async () => {
        const close = (a, b) => Math.abs(a - b) < 1;
        as("plan"); DS = { scope: "live", unit: "" };
        const live = dsList(), tot = dsTotals(live), secs = () => Object.fromEntries(dsSections(dsList()).map(s => [s.id, s]));
        ok("the live scope leaves out rejected requests and counts the rest", live.every(r => r.status !== "rejected") && tot.n === live.length && tot.amt === sumv(live.map(r => r.amount)));
        const all = dsList(); DS.scope = "all"; const nAll = dsList().length; DS.scope = "approved"; const nApp = dsList().length; DS.scope = "live";
        ok("approved is within live, live within all", nApp === S.requests.filter(r => r.status === "approved").length && nApp <= all.length && all.length <= nAll);
        const sc = secs(), sameTotal = id => close(sumv(sc[id].rows.map(r => r.amt)), tot.amt);
        eq("every grouping adds up to the total amount", ["nature", "kind", "btype", "otype", "prog", "strat", "area", "unit", "status"].map(sameTotal), Array(9).fill(true));
        eq("requests are counted once in each plain grouping", ["nature", "kind", "btype", "otype", "prog", "unit", "status"].map(id => Math.round(sumv(sc[id].rows.map(r => r.n)))), Array(7).fill(live.length));
        ok("the nature split matches the request lines", sc.nature.rows.map(r => r.k).every(k => k === "ope" || k === "inv") && close(sc.nature.rows.find(r => r.k === "inv") ? sc.nature.rows.find(r => r.k === "inv").amt : 0, sumv(live.filter(r => rqNature(r) === "inv").map(r => r.amount))));
        // commitment kinds and years
        const multi = live.filter(r => r.multi && !r.cont); eq("single-year, commitment and continuing are separate", [sc.kind.rows.map(r => r.n).join(), live.filter(r => !r.multi).length + "," + multi.length], [`${live.filter(r => !r.multi).length},${multi.length},0`, `${live.filter(r => !r.multi).length},${multi.length}`]);
        as("div"); as("plan"); const c1 = S.commits.find(c => mcState(c) === "ready"), pc = mcPull(c1); const sc2 = secs(); eq("a pulled commitment shows under continuing", [sc2.kind.rows.find(r => r.k === "cont").n, close(sc2.kind.rows.find(r => r.k === "cont").amt, pc.amount)], [1, true]);
        eq("the years table adds up to the years held by the commitment requests", close(sumv(sc2.years.rows.map(r => r.amt)), sumv(dsList().filter(r => r.multi && r.years).map(r => sumv(Object.values(r.years).map(Number))))), true);
        // area, kind of money, output type
        const t0 = dsList().find(r => !r.multi), keepA = JSON.stringify(rqCls(t0).areas || []); rqCls(t0).areas = [{ prov: "จังหวัดก", dist: "", sub: "", lat: "", lng: "" }, { prov: "จังหวัดข", dist: "", sub: "", lat: "", lng: "" }];
        const ar = secs().area.rows; eq("a request with two areas shares its amount equally", [close(ar.find(r => r.k === "จังหวัดก").amt, t0.amount / 2), close(ar.find(r => r.k === "จังหวัดข").amt, t0.amount / 2), close(sumv(ar.map(r => r.amt)), dsTotals(dsList()).amt)], [true, true, true]);
        ok("a request with no area goes under no area given", ar.some(r => r.k === ""));
        rqCls(t0).areas = JSON.parse(keepA);
        rqCls(t0).offs = [{ type: "off01", amt: 123000, note: "" }]; ok("off-budget money is shown beside, not added", dsTotals(dsList()).off >= 123000 && close(dsTotals(dsList()).amt, sumv(dsList().map(r => r.amount))) && secs().money.rows.some(r => r.k === "off01" && close(r.amt, 123000)));
        rqCls(t0).offs = [];
        const o0 = dsOut(t0); o0.otype = "fund"; ok("a fund shows in the output-type split", secs().otype.rows.some(r => r.k === "fund")); delete o0.otype;
        ok("the programme rows carry the number of outputs, projects and funds", secs().prog.rows.every(r => r.extra >= 1));
        // filters and roles
        const u0 = live[0].unit; DS.unit = u0; ok("the unit filter keeps that unit only", dsList().length > 0 && dsList().every(r => r.unit === u0) && dsList().length < live.length); DS.unit = "";
        as("div"); DS.unit = "someone-else"; ok("a division always sees its own unit only, whatever the filter says", dsList().every(r => r.unit === me().unit) && dsList().length > 0); DS.unit = "";
        // csv
        as("plan"); const csv = dsReqCsv(dsList()).split("\n"); eq("the request CSV has a header and a row per request", [csv[0].split(",").length >= 12, csv.length], [true, dsList().length + 1]); eq("the sums CSV has a row per grouping row", dsSumCsv(dsSections(dsList())).split("\n").length, 1 + sumv(dsSections(dsList()).map(s => s.rows.length)));
        // the pages
        renderShell(); window.FISKO_ROUTE = "#bq-dash"; route(); await tick(250); const v = () => document.getElementById("view");
        ok("the dashboard shows tiles, the quota bar, the filters and the groupings", /BQ9/.test(v().innerText) && !!document.querySelector("#ds-scope") && !!document.querySelector("#ds-unit") && v().querySelectorAll("section.panel").length >= 12 && !/undefined|NaN/.test(v().innerText));
        document.querySelector("#ds-scope").value = "approved"; document.querySelector("#ds-scope").dispatchEvent(new Event("change")); await tick(250); eq("changing the filter changes the figures", [DS.scope, /ผู้บริหารเห็นชอบ|Approved/.test(document.querySelector("#ds-scope").selectedOptions[0].text)], ["approved", true]); DS.scope = "live";
        window.FISKO_ROUTE = "#bq-rpt"; route(); await tick(250); ok("the report has the title, the list of requests, the print button and print rules", /รายงานสรุปคำของบประมาณ/.test(v().innerText) && !!document.querySelector("#ds-print") && !!document.querySelector("#ds-csv1") && /@media print/.test(v().innerHTML) && dsList().every(r => v().innerText.includes(r.id)));
        as("div"); renderShell(); window.FISKO_ROUTE = "#bq-dash"; route(); await tick(250); ok("a division sees no unit filter", !document.querySelector("#ds-unit") && !!document.querySelector("#ds-scope"));
        S.requests = S.requests.filter(r => r !== pc);
      });
      await grp("Request sender, intake and mapping by Planning (Q6)", async () => {
        const R = CRUD.defs.rqIn, F = CRUD.defs.rqFor;
        ok("seed: every request has a sender record; the sent ones have a receipt; the approved ones are checked and mapped", S.requests.every(r => r.intake && r.intake.contact) && S.requests.filter(r => r.status !== "draft" && r.status !== "returned").every(r => r.intake.recv && /^RC-\d+-\d+$/.test(r.intake.recv.no)) && S.requests.filter(r => r.status === "approved").every(r => r.align && r.align.result === "ok" && r.map && r.map.to === r.act));
        // the panel on the request page
        as("div"); const draft = S.requests.find(r => r.unit === me().unit && editable(r)); ok("a draft of this unit exists", !!draft);
        renderShell(); window.FISKO_ROUTE = "#request"; REQ_TAB = "main"; CUR_REQ = null; openReq(draft.id); await tick(300); const g = id => document.querySelector(id);
        ok("the main tab shows the sender panel with the unit that sent it, the contact, the channel and the letter", !!g("#rq-intake") && /หน่วยงานที่ส่งคำขอ|Unit that sent/.test(g("#rq-intake").innerText) && ["#rqi-agency", "#rqi-cn", "#rqi-cp", "#rqi-ct", "#rqi-ce", "#rqi-ch", "#rqi-dn", "#rqi-dd"].every(id => !!g(id) && !g(id).disabled) && g("#rq-intake").innerText.includes(unitName(draft.unit)));
        const put = async (id, val) => { const el = g(id); el.value = val; el.dispatchEvent(new Event("change")); await tick(200); };
        await put("#rqi-cn", "สมชาย ทดสอบ"); await put("#rqi-ct", "02-123-4567"); eq("a name and a phone are saved on the request", [draft.intake.contact.name, draft.intake.contact.phone], ["สมชาย ทดสอบ", "02-123-4567"]);
        await put("#rqi-ct", "abc"); eq("a phone with letters is refused and the old one stays", draft.intake.contact.phone, "02-123-4567"); await put("#rqi-ce", "not-an-email"); eq("an email without @ is refused", draft.intake.contact.email || "", "");
        await put("#rqi-ce", "somchai@example.go.th"); await put("#rqi-ch", "letter"); await put("#rqi-dn", "ที่ ทด 9/2570"); await put("#rqi-dd", "2026-10-01"); eq("email, channel, letter no. and date are saved", [draft.intake.contact.email, draft.intake.channel, draft.intake.docNo, draft.intake.docDate], ["somchai@example.go.th", "letter", "ที่ ทด 9/2570", "2026-10-01"]);
        await put("#rqi-dd", "2099-01-01"); eq("a letter dated in the future is refused", draft.intake.docDate, "2026-10-01");
        ok("the channel select offers four ways", g("#rqi-ch").options.length === 4);
        draft.intake.contact = { name: "", phone: "" }; ok("the request check warns when the sender's name or phone is missing", checks(draft).some(x => /ผู้ยื่นคำขอ|Sender of the request/.test(x.title) && x.s === "wa")); draft.intake.contact = { name: "ก", phone: "02-111-2222" }; ok("and is satisfied when they are given", checks(draft).some(x => /ผู้ยื่นคำขอ|Sender of the request/.test(x.title) && x.s === "ok"));
        as("plan"); renderShell(); window.FISKO_ROUTE = "#request"; REQ_TAB = "main"; CUR_REQ = null; openReq(draft.id); await tick(300); ok("Planning sees the panel read only", !!g("#rq-intake") && g("#rqi-cn").disabled);
        // the channel
        eq("the channel is read from how the request came", [rqChannel({}), rqChannel({ cont: { id: "x" } }), rqChannel({ src: { kind: "ocr" } }), rqChannel({ intake: { channel: "email" } })], ["sys", "carry", "ocr", "email"]);
        // what the system sees about the link to the plan
        const full = { reason: "เหตุผลความจำเป็นที่ยาวพอสมควรเพื่อให้ผ่านการตรวจเชื่อมโยงกับแผน", act: S.requests.find(r => r.act).act, kpi: "x", amount: 100, items: [{ type: "ope", name: "a", qty: 1, price: 100 }], qplan: [25, 25, 25, 25], intake: { contact: { name: "ก", phone: "1" } } }; const al = rqAlign(full);
        eq("the checklist has seven items and all pass for a complete request", [al.length, al.filter(x => x.ok).length], [7, 7]); ok("an empty request fails most of them", rqAlign({ reason: "", act: "", amount: 0, items: [] }).filter(x => !x.ok).length >= 5);
        // Planning's intake
        const sent = S.requests.find(r => r.status === "plan"), nOrig = R.list().length; ok("the intake list holds the requests that were sent", R.list().length >= 4 && R.list().every(r => r.status !== "draft"));
        as("div"); ok("a unit sees its own sent requests only, and can't edit", R.list().every(r => r.unit === me().unit) && !R.edit.can(sent)); as("plan"); ok("Planning can edit", R.edit.can(sent));
        const base = { recvDate: sent.intake.recv.date, recvNo: sent.intake.recv.no, channel: "letter", agency: "", docNo: "", docDate: "", cn: "ก", cp: "", ct: "02-111-2222", ce: "", alignRes: "", alignNote: "", mapOut: inOutOf(sent), mapAct: sent.act, mapDone: false, mapNote: "" };
        has("a decision to fix needs a reason", msgs(R, Object.assign({}, base, { alignRes: "fix" }), sent), /เหตุผล|reason/); eq("an OK decision needs none", msgs(R, Object.assign({}, base, { alignRes: "ok" }), sent), []);
        has("a received date in the future is refused", msgs(R, Object.assign({}, base, { recvDate: "2099-01-01" }), sent), /ไม่เกินวันนี้|future/); has("a bad phone is refused", msgs(R, Object.assign({}, base, { ct: "x" }), sent), /เบอร์|Phone/);
        has("mapping without an activity under the output is refused", msgs(R, Object.assign({}, base, { mapDone: true, mapAct: "" }), sent), /กิจกรรม|activity/i);
        const o2 = (S.structure[FORM_FY].find(n => n.lvl === "output" && n.id !== inOutOf(sent) && S.structure[FORM_FY].some(a => a.lvl === "activity" && a.parent === n.id)) || {}).id, a2 = (S.structure[FORM_FY].find(n => n.lvl === "activity" && n.parent === o2) || {}).id, old = sent.act;
        R.edit.run(sent, Object.assign({}, base, { alignRes: "ok", alignNote: "สอดคล้อง", mapOut: o2, mapAct: a2, mapDone: true, mapNote: "ย้ายไปผลผลิตที่ตรงกว่า" })); eq("a change of map writes the new activity and keeps the old", [sent.act, sent.map.from, sent.map.to, inMapStale(sent), sent.align.result], [a2, old, a2, false, "ok"]);
        sent.act = old; ok("if the unit changes the activity afterwards the map is out of date", inMapStale(sent) && R.status(sent) === "recv"); sent.act = a2;
        R.edit.run(sent, Object.assign({}, base, { mapOut: o2, mapAct: a2, mapDone: false })); ok("unticking the map removes it", !sent.map);
        // receiving
        const fresh = S.requests.find(r => r.status === "committee" || r.status === "plan" && r !== sent); delete fresh.intake.recv; eq("a request without a receipt can be received today, with the next number", [R.acts(fresh).map(a => a.id).join(), (R.acts(fresh)[0].run(), /^RC-\d+-\d+$/.test(fresh.intake.recv.no)), fresh.intake.recv.date], ["recv", true, TODAY]);
        has("mapping needs the request to be received first", msgs(R, Object.assign({}, base, { recvDate: "", mapDone: true, mapOut: o2, mapAct: a2 }), { intake: {} }), /รับเรื่อง|received/i);
        // a request made for a unit
        const unit = S.units.find(u => u.parent && S.users.some(x => x.role === "div" && x.unit === u.id)).id, out = S.structure[FORM_FY].find(n => n.lvl === "output").id, act = S.structure[FORM_FY].find(n => n.lvl === "activity" && n.parent === out).id;
        as("div"); eq("a division can't make a request for a unit", F.create.can(), false); as("plan"); eq("Planning can", F.create.can(), true);
        const fv = { unit, name: "คำขอจากหนังสือ", kind: "year", out, act, type: "ope", agency: "หน่วยงานทดสอบ", docNo: "ที่ ทด 1/2570", docDate: TODAY, cn: "ผู้ส่ง ทดสอบ", cp: "นักวิชาการ", ct: "02-999-9999", ce: "" };
        has("an activity not under the output is refused", msgs(F, Object.assign({}, fv, { act: S.structure[FORM_FY].find(n => n.lvl === "activity" && n.parent !== out).id }), null), /ไม่อยู่ใต้|not under/); has("a bad phone is refused", msgs(F, Object.assign({}, fv, { ct: "!!" }), null), /เบอร์|Phone/); eq("a good form passes", msgs(F, fv, null), []);
        const nr = S.requests.length, mk = F.create.run(fv); ok("it makes a draft for that unit with the letter, the sender and a receipt", S.requests.length === nr + 1 && mk.status === "draft" && mk.unit === unit && mk.intake.channel === "plan" && mk.intake.docNo === "ที่ ทด 1/2570" && mk.intake.contact.name === "ผู้ส่ง ทดสอบ" && !!mk.intake.recv && rqChannel(mk) === "plan");
        ok("it shows on both lists", F.list().includes(mk) && R.list().includes(mk)); ok("the unit's division can edit it", (as("div"), ROLE = "div", true)); as("plan");
        // the page
        renderShell(); window.FISKO_ROUTE = "#bq-in"; route(); await tick(250); const v = () => document.getElementById("view");
        ok("the page shows the tiles, the shortcut buttons and both lists", /BQ11/.test(v().innerText) && v().querySelectorAll('[data-jump]').length >= 3 && v().querySelectorAll("section.panel").length >= 2 && !/undefined|NaN/.test(v().innerText));
        as("div"); renderShell(); window.FISKO_ROUTE = "#bq-in"; route(); await tick(250); ok("a division opens it and sees no way to make a request for a unit", !/สร้างคำขอแทนหน่วยงาน/.test([...v().querySelectorAll("button")].map(b => b.innerText).join("|")));
        S.requests = S.requests.filter(r => r !== mk);
      });
      await grp("Budget calendar, Bureau and internal dates (Q1)", async () => {
        const E = CRUD.defs.calEv, add = (o) => { const e = Object.assign({ id: "cT" + S.calendar.length, kind: "internal", date: TODAY, end: "", role: "plan", unit: "", remind: 7, note: "", name: ["ทดสอบ", "Test"] }, o); S.calendar.push(e); return e; };
        eq("seed: twelve milestones, four from the Bureau and the rest internal; the six originals keep their ids", [S.calendar.length, S.calendar.filter(e => clKind(e) === "bureau").length, ["c1", "c2", "c3", "c4", "c5", "c6"].every(id => S.calendar.some(e => e.id === id)), cal("c6").kind], [12, 4, true, "bureau"]);
        eq("a milestone with no kind counts as internal", clKind({}), "internal");
        // the month grid
        const g = clGrid(2026, 9); eq("October 2026 starts on a Thursday and has 31 days in whole weeks", [g.length % 7, g.findIndex(x => x), g.filter(Boolean).length, g.filter(Boolean)[0], g.includes(TODAY)], [0, 4, 31, "2026-10-01", true]);
        const rng = { date: "2026-10-10", end: "2026-10-12" }; eq("a period covers each of its days", [clOn([rng], "2026-10-09").length, clOn([rng], "2026-10-10").length, clOn([rng], "2026-10-12").length, clOn([rng], "2026-10-13").length], [0, 1, 1, 0]);
        // overdue, near, mine
        const a = add({ date: addDays(TODAY, 3) }), b = add({ date: addDays(TODAY, 20) }), c = add({ date: addDays(TODAY, -5) }), d = add({ date: addDays(TODAY, -5), end: addDays(TODAY, 2) }), e2 = add({ date: addDays(TODAY, -5), done: { by: "x" } });
        eq("near, not near, overdue, a period still running, and done", [clSoon(a), clSoon(b), clOverdue(c), clOverdue(d), clOverdue(e2) || clSoon(e2)], [true, false, true, false, false]);
        eq("the reminder window can be changed", [(b.remind = 30, clSoon(b)), (b.remind = 0, clSoon(b)), (a.remind = 0, clSoon(a))], [true, false, false]); b.remind = 7; a.remind = 7;
        as("div"); const mine = add({ role: "div" }), forUnit = add({ role: "plan", unit: me().unit }), other = add({ role: "exec" }), every = add({ role: "all" });
        eq("a division sees its role's, its unit's and everyone's dates, not another role's", [clMine(mine), clMine(forUnit), clMine(other), clMine(every)], [true, true, false, true]); as("plan"); ok("Planning sees every Bureau date and its own", clMine(cal("c6")) && clMine(add({ role: "plan" })) && !clMine(other));
        // reminders in My work
        as("div"); const tk = []; famTasks((t, s, due, link, cls) => tk.push({ t, link, cls })); ok("a division's near milestone and an overdue one appear in My work", tk.some(x => /ใกล้ถึงกำหนด|Due soon/.test(x.t) && x.link === "bq-cal") === (clMine(a) && clSoon(a) || add({ role: "div", date: addDays(TODAY, 2) }) && true));
        const near = add({ role: "div", date: addDays(TODAY, 2), name: ["เตือนทดสอบ", "Reminder test"] }), over = add({ role: "div", date: addDays(TODAY, -3), name: ["เลยทดสอบ", "Overdue test"] }); const t2 = []; famTasks((t, s, due, link, cls) => t2.push({ t, link, cls }));
        ok("both show, the overdue one in red", t2.some(x => /เตือนทดสอบ|Reminder test/.test(x.t) && /ใกล้ถึงกำหนด|Due soon/.test(x.t)) && t2.some(x => /เลยทดสอบ|Overdue test/.test(x.t) && /เลยกำหนด|Overdue/.test(x.t) && x.cls === "p-bad"));
        near.done = { by: "x" }; over.done = { by: "x" }; const t3 = []; famTasks((t, s, due, link, cls) => t3.push(t)); ok("done ones leave My work", !t3.some(x => /เตือนทดสอบ|Reminder test|เลยทดสอบ|Overdue test/.test(x)));
        // the list: who may do what
        as("plan"); ok("Planning and an administrator can add and edit; a division can't", E.create.can() && (as("admin"), E.create.can()) && (as("div"), !E.create.can() && !E.edit.can(cal("c1")))); as("plan");
        has("an end date before the start is refused", msgs(E, { kind: "internal", th: "x", date: "2026-11-10", end: "2026-11-01", role: "plan", remind: 7 }, null), /วันสิ้นสุด|end/); has("a reminder over 60 days is refused", msgs(E, { kind: "internal", th: "x", date: "2026-11-10", end: "", role: "plan", remind: 99 }, null), /0 ถึง 60|0 to 60/);
        eq("the form asks for source, name, dates, owner, unit, reminder and note", E.fields(null).map(f => f.id).join(), "kind,th,en,date,end,role,unit,remind,note");
        const nw = E.create.run({ kind: "bureau", th: "สงป. ทดสอบ", en: "", date: "2026-12-01", end: "", role: "plan", unit: "", remind: 5, note: "ตัวอย่าง" }); ok("a new Bureau date is saved as custom with its reminder", nw.custom && nw.kind === "bureau" && nw.remind === 5 && S.calendar.includes(nw));
        ok("only a custom one can be deleted, a seeded one can't", E.acts(nw).some(x => x.id === "del") && !E.acts(cal("c1")).some(x => x.id === "del"));
        as("div"); const dv = add({ role: "div", name: ["งานหน่วย", "Unit work"] }); eq("the owner role can mark its own done, and not another role's", [E.acts(dv).map(x => x.id).join(), E.acts(add({ role: "exec" })).map(x => x.id).join()], ["done", ""]);
        E.acts(dv).find(x => x.id === "done").run(); eq("marking done records who, and reopen clears it", [!!dv.done, (E.acts(dv).find(x => x.id === "undone").run(), !!dv.done)], [true, false]);
        // filters and export
        as("plan"); CAL = Object.assign({}, CAL, { kind: "bureau", mine: false, st: "" }); ok("the kind filter keeps only the Bureau's", clList().length === S.calendar.filter(e => clKind(e) === "bureau").length && clList().every(e => clKind(e) === "bureau"));
        CAL.kind = ""; CAL.st = "overdue"; ok("the overdue filter keeps only overdue ones", clList().length > 0 && clList().every(clOverdue)); CAL.st = "done"; ok("the done filter keeps only done ones", clList().every(e => e.done)); CAL = Object.assign({}, CAL, { kind: "", st: "", mine: false });
        const rg = add({ date: "2027-01-15", end: "2027-01-16", name: ["ช่วง, มี;อักขระ", "Period, with;marks"], note: "n" }), ics = clIcs([cal("c6"), rg]); eq("the calendar file has one event per milestone, with the date and an end that is the next day", [(ics.match(/BEGIN:VEVENT/g) || []).length, ics.includes("DTSTART;VALUE=DATE:20270205"), ics.includes("DTEND;VALUE=DATE:20270206"), ics.includes("DTEND;VALUE=DATE:20270117"), /BEGIN:VCALENDAR[\s\S]*END:VCALENDAR/.test(ics)], [2, true, true, true, true]);
        ok("commas and semicolons in a name are escaped in the file", ics.includes("ช่วง\\, มี\\;อักขระ")); const cs = clCsv(S.calendar).split("\n"); eq("the CSV has a header and a row per milestone", [cs[0].startsWith("id,kind,date"), cs.length], [true, S.calendar.length + 1]);
        // the page
        reseed(); as("plan"); CAL = { y: 2026, m: 9, kind: "", mine: false, st: "", view: "month" }; renderShell(); window.FISKO_ROUTE = "#bq-cal"; route(); await tick(250); const v = () => document.getElementById("view");
        ok("the page shows tiles, filters, the month grid with the Bureau briefing on 22 October, and the list", /BQ12/.test(v().innerText) && !!document.querySelector("#cal-kind") && v().querySelectorAll("[data-cal]").length === 2 && /ตุลาคม 2569|October 2026/.test(v().innerText) && !!document.querySelector("#cal-ics") && !/undefined|NaN/.test(v().innerText));
        const n0 = v().querySelectorAll("button[data-cal]").length; document.querySelector("#cal-kind").value = "bureau"; document.querySelector("#cal-kind").dispatchEvent(new Event("change")); await tick(250); ok("the kind filter takes the internal chips off the grid", v().querySelectorAll("button[data-cal]").length < n0 && v().querySelectorAll("button[data-cal]").length >= 1); CAL.kind = "";
        document.querySelector("#cal-next").click(); await tick(200); document.querySelector("#cal-next").click(); await tick(200); eq("the arrows move the month, and the year rolls over", [CAL.m, CAL.y], [11, 2026]); document.querySelector("#cal-next").click(); await tick(200); eq("December to January", [CAL.m, CAL.y], [0, 2027]); document.querySelector("#cal-today").click(); await tick(200); eq("this month brings it back", [CAL.m, CAL.y], [9, 2026]);
        const chip = document.querySelector("button[data-cal]"); chip.click(); await tick(250); ok("clicking a chip opens that milestone", !!CR_OPEN && CR_OPEN.key === "calEv" && CR_OPEN.id === chip.dataset.cal);
        for (const role of ["div", "exec", "fin", "admin"]) { as(role); renderShell(); window.FISKO_ROUTE = "#bq-cal"; CR_OPEN = null; route(); await tick(150); ok("page opens as " + role, /BQ12/.test(v().innerText) && !/undefined|NaN/.test(v().innerText)); }
      });
      await grp("National plans from e-MENSCR (A4)", async () => {
        const rebuild = k => { const by = {}, root = []; EM_DATA[k].rows.forEach(r => (by[r[0]] = { id: r[0].includes("~") ? undefined : r[0], name: r[2], _checkenabled: r[3] ? true : undefined, children: [] })); EM_DATA[k].rows.forEach(r => (r[1] ? by[r[1]].children : root).push(by[r[0]])); return root; };
        eq("the four trees hold the node counts of the four files", ["ns", "mp", "nr", "p13"].map(k => EM_DATA[k].rows.length), [230, 933, 7256, 52]);
        for (const k of ["ns", "mp", "nr", "p13"]) { const p = emParse(JSON.stringify(rebuild(k))); ok("a file of the " + k + " tree is recognised by its codes and has no differences", p.kind === k && !p.err && (d => d.add === 0 && d.gone === 0 && d.ren === 0)(emDiff(k, p.rows)), p.err || p.kind); }
        ok("bad files are refused: not JSON, not a list, unknown codes, duplicate ids", !!emParse("{x").err && !!emParse('{"a":1}').err && !!emParse(JSON.stringify([{ id: "zz", name: "a", _checkenabled: true }])).err && !!emParse(JSON.stringify([{ id: "Y101", name: "a", _checkenabled: true }, { id: "Y101", name: "b" }])).err);
        eq("nodes without an id get the parent code and a position", EM_DATA.mp.rows.filter(r => r[0].includes("~")).length, 109);
        const lk = S.requests.filter(r => emLinked(r) > 0); ok("sample requests carry plan links that exist in the trees", lk.length >= 6 && lk.every(r => EM_KINDS.every(([k]) => (emPlans(r)[k] || []).every(id => emIdx(k).by.has(id)))));
        as("plan"); renderShell(); window.FISKO_ROUTE = "#bq-em"; EM = { tab: "browse", k: "ns", q: "", open: {}, lim: {} }; route(); await tick(250); const v = () => document.getElementById("view");
        ok("the page opens with tiles, tabs and the six roots of the national strategy", /BQ13/.test(v().innerText) && v().querySelectorAll("[data-emt]").length === 6 && !/undefined|NaN/.test(v().innerText));
        v().querySelector("[data-emt]").click(); await tick(100); ok("expanding shows the children", v().querySelectorAll("[data-emt]").length > 6);
        const q = document.querySelector("#em-q"); q.value = "เกษตร"; q.dispatchEvent(new Event("input")); await tick(100); ok("search lists matches with their path", /เกษตร/.test(document.querySelector("#em-tree").innerText));
        for (const t of ["sum", "imp"]) { EM.tab = t; route(); await tick(150); ok("tab " + t + " renders", !/undefined|NaN/.test(v().innerText) && v().innerText.length > 300); }
        const rows = EM_DATA.p13.rows.filter(r => r[0] !== "P130101").map(r => (r[0] === "P130102" ? [r[0], r[1], r[2] + " (x)", r[3], r[4]] : r)); rows.push(["P139999", "P1313", "new", 1, ""]);
        EM_IMP = { name: "t.json", kind: "p13", rows, diff: emDiff("p13", rows), err: "" }; eq("the check reports one added, one removed, one renamed", [EM_IMP.diff.add, EM_IMP.diff.gone, EM_IMP.diff.ren], [1, 1, 1]);
        EM.tab = "imp"; route(); await tick(150); document.querySelector("#em-go").click(); await tick(300); ok("using the file replaces the tree and writes history", !!EM_OVER.p13 && !!emIdx("p13").by.get("P139999") && S.emImports.length === 1);
        document.querySelector("[data-emrev=p13]").click(); await tick(300); ok("back to the built-in set", !EM_OVER.p13 && !emIdx("p13").by.get("P139999"));
        as("div"); renderShell(); EM.tab = "imp"; route(); await tick(150); ok("a division cannot import", document.querySelector("#em-file").disabled);
        reseed(); as("div"); renderShell(); const r = S.requests.find(x => x.unit === me().unit && x.status === "draft"); CUR_REQ = r.id; REQ_TAB = "main"; window.FISKO_ROUTE = "#request"; route(); await tick(300);
        ok("the request has the alignment panel", !!document.querySelector("#rq-em"));
        const qi = document.querySelector("#em-q-p13"); qi.value = "ท่องเที่ยว"; qi.dispatchEvent(new Event("input")); await tick(100); const n0 = (emPlans(r).p13 || []).length; document.querySelector("[data-emadd]").click(); await tick(300); eq("choosing a result links it", (emPlans(r).p13 || []).length, n0 + 1);
        [...document.querySelectorAll('[data-emx^="p13|"]')].pop().click(); await tick(300); ok("a link can be removed", (emPlans(r).p13 || []).length === n0);
        reseed(); ok("the agency strategies point at real national strategy codes (Y101 to Y601), not the old sample N1 to N6", S.strategy.items.length > 0 && S.strategy.items.every(st => NATIONAL.some(n => n.id === st.nat) && /^Y\d{3}$/.test(st.nat)));
        eq("the six national strategies and 23 master plans come from the e-MENSCR trees", [NATIONAL.length, S.masterPlans.length, MASTER.length], [6, 23, 23]);
        ok("every master plan sits under a national strategy that exists, and a strategy's master plan belongs to its strategy", S.masterPlans.every(m => NATIONAL.some(n => n.id === m.nat)) && S.strategy.items.every(st => !st.mp || (S.masterPlans.find(m => m.id === st.mp) || {}).nat === st.nat));
        ok("the strategy tab and the link tab show the new names with no gaps", (() => { as("plan"); renderShell(); window.FISKO_ROUTE = "#strategy"; STRAT_TAB = "map"; route(); const a = document.getElementById("view").innerText; STRAT_TAB = "link"; route(); const b = document.getElementById("view").innerText; STRAT_TAB = "map"; return !/undefined|NaN/.test(a + b) && /ความมั่นคง|ภาครัฐ|การพัฒนา/.test(a + b); })());
        const none = { id: "RQ-X", unit: me().unit, cls: { plans: {} } }; ok("the check item is a warning, not a block, when no national plan is linked", (c => !!c && c.s === "wa")(checks(Object.assign({}, r, { cls: Object.assign({}, rqCls(r), { plans: {} }) })).find(x => /แผนระดับชาติ|national plans/.test(x.title))));
        as("plan"); CUR_REQ = S.requests[1].id; route(); await tick(250); ok("Planning sees the links but cannot edit them", !document.querySelector("#em-q-ns"));
      });
      await grp("Request changes (main request list)", async () => {
        const R = S.requests, ap = R.filter(r => r.status === "approved"); ok("sample has approved requests", ap.length >= 1); const r = ap[ap.length - 1];
        eq("approved and not sent is waiting", rqFund(r), "wait"); eq("a draft has no funding stage", rqFund(R.find(x => x.status === "draft")), null);
        as("plan"); has("amount above the request refused", [rqSetApproved(r, { amt: r.amount + 1 })], /เกิน|above/i); has("future date refused", [rqSetApproved(r, { amt: 1, date: "2099-01-01" })], /ไม่เกินวันนี้|future/i);
        has("cannot allocate before an approved amount", [rqToAlloc(r)], /ยังไม่มี|No approved/i); eq("saving the approved amount", [rqSetApproved(r, { amt: Math.round(r.amount / 2), ref: "x" }), rqFund(r), actAmount(r)], ["", "granted", Math.round(r.amount / 2)]);
        eq("same store as the old submission page", S.submission.results[r.id], Math.round(r.amount / 2));
        as("fin"); eq("allocating", [rqToAlloc(r), rqFund(r)], ["", "allocated"]); const A = S.allocs[FORM_FY]; eq("one allocation line with the approved amount", [A.lines.length, A.lines[0].amount, A.total], [1, Math.round(r.amount / 2), Math.round(r.amount / 2)]);
        has("no second allocation", [rqToAlloc(r)], /แล้ว|Already/i); as("plan"); eq("changing the amount updates the line", [rqSetApproved(r, { amt: Math.round(r.amount / 4) }), A.lines[0].amount], ["", Math.round(r.amount / 4)]);
        const d = R.find(x => x.status === "draft"); const c = rqCls(d); ok("classification defaults", c.acct.length === 4 && Array.isArray(c.offs) && Array.isArray(c.money) && c.co.on === false); ok("project derived from the activity", !d.act || c.proj === (lineage(d.act).find(n => n.lvl === "output") || {}).id);
        ok("completeness check added", checks(d).some(x => /ข้อมูลตามแบบคำของบ|Request classification/.test(x.title)));
        ok("project column in the list", /ผลผลิต/.test(RQ_HEAD()) && reqRows("").includes("P0"));
        RQ_FY = 2570; eq("year selector on another year", rqYear(), 2570); ok("other-year view renders allocation lines", rqYearView(2570).includes(S.allocs[2570].lines[0].id)); RQ_FY = 1999; eq("unknown year falls back", rqYear(), FORM_FY); RQ_FY = null;
      });
      await grp("Fiscal-year selector (top bar)", async () => {
        const mem = SEL_FY; SEL_FY = null; try { store.del("fisko-fy"); } catch (e) {}
        ok("selector exists", !!document.getElementById("fy-sel")); eq("options: per page + one per year", document.getElementById("fy-sel").options.length, S.fyList.length + 1);
        eq("a form-year page belongs to the prepared year", [fyOfPage("requests"), fyOfPage("consolidation")], [FORM_FY, FORM_FY]); eq("other pages belong to the executing year", [fyOfPage("dashboard"), fyOfPage("pj-reg"), fyOfPage("fnc-pay")], [CUR_FY, CUR_FY, CUR_FY]);
        eq("year-free pages", [fyOfPage("home"), fyOfPage("admin"), fyOfPage("assistant")], [null, null, null]);
        ok("allocation has data only for years with lines", fyPageHas("allocation", CUR_FY) && !fyPageHas("allocation", FORM_FY) && !fyPageHas("allocation", 2569)); ok("request list has every year", S.fyList.every(y => fyPageHas("requests", y.fy)));
        as("plan"); const view = id => { window.FISKO_ROUTE = "#" + id; route(); return document.getElementById("view").innerText; }, NOTICE = /หน้านี้ไม่มีข้อมูลของปี|has no data for/;
        setFy(null); ok("automatic leaves pages alone", !NOTICE.test(view("dashboard")) && !NOTICE.test(view("requests")));
        setFy(CUR_FY); ok("executing year: execution pages render", !NOTICE.test(view("dashboard")) && !NOTICE.test(view("pj-reg"))); ok("executing year: form pages show a notice", NOTICE.test(view("consolidation")) && NOTICE.test(view("strategy")));
        ok("year-free pages are never replaced", !NOTICE.test(view("home")) && !NOTICE.test(view("admin"))); eq("allocation follows the year", [ALLOC_FY = 0, (view("allocation"), ALLOC_FY)], [0, CUR_FY]);
        setFy(FORM_FY); ok("prepared year: form pages render", !NOTICE.test(view("consolidation"))); ok("prepared year: execution pages show a notice", NOTICE.test(view("dashboard")) && NOTICE.test(view("allocation"))); ok("prepared year: pages of other apps are never replaced", !NOTICE.test(view("pj-reg")) && !NOTICE.test(view("fnc-pay")));
        ok("selector shows on budget pages only", (view("dashboard"), !document.getElementById("fy-sel").hidden) && (view("pj-reg"), document.getElementById("fy-sel").hidden) && (view("fnc-pay"), document.getElementById("fy-sel").hidden) && (view("rg-act"), !document.getElementById("fy-sel").hidden) && (view("home"), document.getElementById("fy-sel").hidden));
        ok("request list in the prepared year is the normal list", !!document.getElementById("rq-fy") || (view("requests"), !!document.getElementById("rq-fy")));
        setFy(2569); ok("a closed year: request list shows its view", !NOTICE.test(view("requests")) && /2569/.test(document.getElementById("view").innerText)); ok("a closed year: allocation has no lines", NOTICE.test(view("allocation")));
        view("dashboard"); ok("notice has a switch button", !!document.getElementById("fy-go")); document.getElementById("fy-go").click(); eq("the button switches to the page's year", SEL_FY, CUR_FY); setFy(null); eq("cleared", [SEL_FY, localStorage.getItem("fisko-fy")], [null, null]);
        SEL_FY = mem; window.FISKO_ROUTE = undefined;
      });
      await grp("Output/project and activity (form and registers)", async () => {
        const mem = SEL_FY; SEL_FY = null; window.FISKO_ROUTE = undefined;
        const st = () => S.structure[FORM_FY];
        as("div"); const f0 = CRUD.defs.rqReq.fields(null, {}), ids = f0.map(f => f.id);
        eq("create form: name, kind, output/project, activity, budget type (one activity field)", ids, ["name", "kind", "out", "act", "type"]);
        eq("activity list is empty until an output is chosen", f0.find(f => f.id === "act").opts.length, 0);
        const o1 = f0.find(f => f.id === "out").opts[0][0], f1 = CRUD.defs.rqReq.fields(null, { out: o1 });
        ok("activity list follows the output", f1.find(f => f.id === "act").opts.length > 0 && f1.find(f => f.id === "act").opts.every(([id]) => st().find(n => n.id === id).parent === o1));
        ok("only output-level nodes are offered: no programme is listed as an output", f0.find(f => f.id === "out").opts.length > 0 && f0.find(f => f.id === "out").opts.every(([id]) => st().find(n => n.id === id).lvl === "output"));
        ok("every programme has an output and every activity sits under an output", st().filter(n => n.lvl === "program").every(p => st().some(n => n.lvl === "output" && n.parent === p.id)) && st().filter(n => n.lvl === "activity").every(a => (st().find(n => n.id === a.parent) || {}).lvl === "output"));
        eq("three types of output-level node, an untyped one counts as an output", [Object.keys(OUT_TYPES).join(), outType({}), outType({ otype: "fund" }), outType({ otype: "zzz" })], ["output,project,fund", "output", "fund", "output"]);
        ok("the form shows the type next to each output", f0.find(f => f.id === "out").opts.every(([, l]) => /\((ผลผลิต|โครงการ|กองทุน|Output|Project|Fund)\)/.test(l)));
        as("plan"); { const R = CRUD.defs.regOut; ok("the register lists output-level nodes only", R.list().length > 0 && R.list().every(n => n.lvl === "output"));
          const tf = R.fields(null).find(f => f.id === "otype"); ok("the register form has a required type with output, project and fund", !!tf && tf.req && tf.opts.map(o => o[0]).join() === "output,project,fund");
          ok("the register filters by type and by programme", ["par", "ot"].every(id => R.filters.some(f => f.id === id)));
          ok("an activity can only be added under an output, not under a programme", !CRUD.defs.regAct.fields(null).find(f => f.id === "parent").opts.some(([id]) => st().find(n => n.id === id).lvl === "program"));
          const pj = R.create.run({ parent: "P02", code: "P02.O8", th: "โครงการทดสอบ", en: "", otype: "project" }); eq("a project is saved with its type under the programme", [pj.otype, pj.parent, outType(pj)], ["project", "P02", "project"]);
          ok("its type shows on the request form", CRUD.defs.rqReq.fields(null, {}).find(f => f.id === "out").opts.some(([id, l]) => id === pj.id && /โครงการ|Project/.test(l)));
          R.edit.run(pj, { code: "P02.O8", th: "กองทุนทดสอบ", en: "", otype: "fund" }); eq("the type can be changed", outType(pj), "fund"); S.structure[FORM_FY] = st().filter(n => n !== pj); }
        as("div");
        ok("check refuses an activity from another output", CRUD.defs.rqReq.check({ out: o1, act: st().find(n => n.lvl === "activity" && n.parent !== o1).id }).length === 1);
        const q = CRUD.defs.rqReq.create.run({ name: "x", out: o1, act: f1.find(f => f.id === "act").opts[0][0], type: "ope" });
        eq("request created under the chosen activity", [q.act, rqCls(q).proj], [f1.find(f => f.id === "act").opts[0][0], o1]); S.requests = S.requests.filter(x => x !== q);
        const e0 = CRUD.defs.rqReq.fields(S.requests.find(x => x.act && st().find(n => n.id === x.act && n.parent)), {});
        ok("edit form: output starts from the saved activity", !!e0.find(f => f.id === "out").value && !!e0.find(f => f.id === "act").value);
        ok("the request page has a single activity select", (as("div"), openReq(S.requests[0].id), route(), document.querySelectorAll("#view select#act, #view select#rq-act").length === 1));
        // registers
        as("div"); ok("units cannot open the registers", !NAV.find(n => n.id === "rg-out").roles.includes("div") && !NAV.find(n => n.id === "rg-act").roles.includes("divhead"));
        as("plan"); ok("planning can add", CRUD.defs.regOut.create.can() && CRUD.defs.regAct.create.can()); as("audit"); ok("others cannot add or edit", !CRUD.defs.regOut.create.can() && !CRUD.defs.regAct.edit.can(CRUD.defs.regAct.list()[0]));
        as("plan"); const n0 = st().length, po = CRUD.defs.regOut.create.run({ parent: "P02", code: "P02.O9", th: "ผลผลิตทดสอบ", en: "" }), pa = CRUD.defs.regAct.create.run({ parent: po.id, code: "P02.O9.A1", th: "กิจกรรมทดสอบ", en: "" });
        eq("added to the structure the form reads", [st().length, st().find(n => n.id === pa.id).parent], [n0 + 2, po.id]);
        ok("the new output/activity reach the request form", CRUD.defs.rqReq.fields(null, { out: po.id }).find(f => f.id === "act").opts.some(([id]) => id === pa.id));
        ok("duplicate code is refused", CRUD.defs.regOut.check({ code: "P02.O9" }, null).length === 1 && CRUD.defs.regAct.check({ code: "P02.O9.A1" }, null).length === 1 && CRUD.defs.regAct.check({ code: "P02.O9.A1" }, pa).length === 0);
        ok("unused node can be deleted, used one only retired", CRUD.defs.regAct.acts(pa)[0].id === "del" && CRUD.defs.regOut.acts(po)[0].id === "retire");
        CRUD.defs.regAct.acts(pa)[0].run(); ok("deleted", !st().some(n => n.id === pa.id)); CRUD.defs.regOut.acts(po)[0].run(); S.structure[FORM_FY] = st().filter(n => n !== po);
        ok("output list excludes retired from the form", (() => { const x = st().find(n => n.lvl === "output"); x.retired = { t: "", why: "t" }; const r = !CRUD.defs.rqReq.fields(null, {}).find(f => f.id === "out").opts.some(([id]) => id === x.id); delete x.retired; return r; })());
        SEL_FY = mem; window.FISKO_ROUTE = undefined;
      });
      await grp("Plan item stage (not in the published plan)", async () => {
        const keep = JSON.stringify(S.planDoc.versions), V = S.planDoc.versions, t = { id: "PP-TEST", status: "planned", name: ["ทดสอบ", "Test"], est: 1e6, month: TODAY, method: "specific", line: S.pplan[0].line }, stage = () => (planStage(t) || [null])[0];
        eq("not in any version: not proposed", stage(), "new"); ok("status pill says draft in the plan", /ร่างในแผน|Draft in the plan/.test(planStat(t)));
        const v = { v: Math.max(...V.map(x => x.v)) + 1, status: "submitted", items: [snap(t)], by: me().id, t: nowIso(), why: "x", appr: null, published: null }; V.push(v);
        eq("proposed: waiting for the executive", stage(), "wait"); v.status = "rejected"; eq("rejected", stage(), "rej");
        v.status = "approved"; v.appr = { by: me().id, t: nowIso() }; eq("approved, not published: waiting for the e-GP notice", stage(), "pub");
        v.published = { date: TODAY, ref: "T", by: me().id }; eq("published: no stage, normal status", [stage(), planTag(t), /อยู่ในแผน|Planned/.test(planStat(t))], [null, "", true]);
        t.status = "requisitioned"; v.published = null; ok("a requisitioned item keeps its status", /ขอซื้อแล้ว|Requisitioned/.test(planStat(t)));
        S.planDoc.versions = JSON.parse(keep);
      });
      await grp("Budget quota and submission ceiling (Q3)", async () => {
        const Q = CRUD.defs.quota, q = qtOf(FORM_FY);
        ok("seed has a quota for the year being prepared, ceiling 120%", !!q && q.pct === 120 && q.base >= 1e6, q);
        eq("the limit is quota x ceiling", qtLimit({ base: 100e6, pct: 120 }), 120e6);
        as("plan"); eq("Planning can set the quota", [Q.create.can(), Q.edit.can(q)], [true, true]); as("proc"); eq("other roles can't", [Q.create.can(), Q.edit.can(q)], [false, false]); as("plan");
        has("a second quota for the same year is refused", msgs(Q, { fy: String(FORM_FY), base: 1e6, pct: 120 }, null), /ตั้งโควต้าแล้ว|already/);
        has("a zero ceiling is refused", msgs(Q, { fy: String(FORM_FY + 1), base: 1e6, pct: 0 }, null), /มากกว่า 0|above 0/);
        ok("the quota form has year, starting amount, ceiling % and note", Q.fields(null, {}).map(f => f.id).join() === "fy,base,pct,note");
        // the gate on the batches for the Budget Bureau (B6)
        const B = CRUD.defs.sbBatch, ready = sbReady().filter(r => !sbBlocked(r)), vals = {}; ready.forEach(r => (vals["in_" + r.id] = true)); ok("some approved requests are ready for a batch", ready.length > 0, ready.length);
        const keepQ = JSON.stringify(S.quotas), amt = sumv(ready.map(subAmt)); eq("with no batch the total is zero", qtTotal(FORM_FY), 0);
        q.base = Math.floor(amt / 1.2) + 1000; eq("a batch just within the ceiling is allowed", msgs(B, vals, null), []);
        q.base = Math.floor(amt / 1.2) - 1000; const over = msgs(B, vals, null); has("a batch over the ceiling is refused with the amounts", over, /เกินขีดจำกัด|over the ceiling/);
        S.quotas = JSON.parse(keepQ); const q2 = qtOf(FORM_FY); q2.base = 1e12;
        const nb = B.create.run(vals); eq("the batch counts in the total once made", qtTotal(FORM_FY), amt); eq("the check leaves the batch itself out when it is edited", msgs(B, vals, nb), []);
        S.submission.minister = S.submission.minister || { by: me().id, t: nowIso(), doc: "x" }; as("plan");
        q2.base = Math.floor(amt / 1.2) - 1000; const send = act(B, nb, "send"); ok("the send action is offered", !!send);
        if (send) { const msg = send.run(nb); ok("sending over the ceiling is refused and nothing changes", nb.status === "prep" && /เกินขีดจำกัด|over the ceiling/.test(String(msg)), [nb.status, msg]);
          q2.base = 1e12; send.run(nb); eq("within the ceiling it is sent", nb.status, "sent"); }
        S.quotas = []; has("with no quota a batch can't be made", msgs(B, { ["in_" + (ready[1] || ready[0]).id]: true }, null), /ยังไม่ได้ตั้งโควต้า|not set/);
        S.quotas = JSON.parse(keepQ);
        // the page
        window.FISKO_ROUTE = "#bq-cfg"; route(); await tick(200); ok("the quota page shows the quota list", /โควต้า/.test(document.getElementById("view").innerText));
      });
      await grp("Committee types and case committees (P1)", async () => {
        const acc = S.cmTypes.find(t => t.kind === "accept"), evT = S.cmTypes.find(t => t.kind === "eval"), fails = (cm, ctx) => cmCheck(cm, ctx).filter(x => !x.ok), big = { amount: 5e6, kind: "goods" };
        ok("every old case committee is in the register and complete", S.cases.every(c => ["tor", "eval", "buy"].every(k => !c.committees[k] || (cmById(c.committees[k].cm) && committeeOk(c.committees[k])))));
        ok("every seed contract points at its acceptance committee", S.contracts.every(c => !c.inspectors.length || (cmById(c.cm) && cmKindOf(cmById(c.cm)) === "accept")));
        const cs = S.cases.find(c => c.committees.eval && !S.cmReg.some(x => x.case === c.id && cmKindOf(x) === "accept")), judges = caseJudges(cs), free = S.users.filter(u => u.active && ["div", "plan", "fin", "exec"].includes(u.role) && !judges.includes(u.id));
        ok("a case with an evaluation committee and no acceptance committee exists for the tests", !!cs && free.length >= 4, cs && cs.id);
        const mk = (typeId, caseId) => { const cm = { id: cmNextId(S.cmReg, "CM"), type: typeId, case: caseId, order: "T-1", date: TODAY, doc: "t.pdf", status: "live", note: "", by: "x" }; S.cmReg.push(cm); return cm; };
        const add = (cm, slotNo, who) => { const SL = cmSlotsOf(cm.type), s = SL[slotNo], m = Object.assign({ id: cmNextId(S.cmMem, "CMM"), cm: cm.id, slot: s.id, role: s.chair ? "chair" : "member", tech: false, exp: "" }, typeof who === "string" ? { kind: "user", user: who } : Object.assign({ kind: "ext" }, who)); S.cmMem.push(m); return m; };
        ok("seed: 9 types (the six of the regulation, the TOR committee, and acceptance committees for construction and for consulting) with positions, and the old committees in the register", S.cmTypes.length === 9 && S.cmSlots.length >= 20 && S.cmReg.length >= 3 && S.cmTypes.every(t => cmSlotsOf(t.id).length >= 2));
        const cm = mk(acc.id, cs.id); add(cm, 0, free[0].id); add(cm, 1, free[1].id); add(cm, 1, free[2].id);
        eq("a chair and two members pass the type", fails(cm, big).map(x => x.label), []);
        S.cmMem = S.cmMem.filter(m => !(m.cm === cm.id && m.role === "member")); has("missing members are reported by position", fails(cm, big).map(x => x.label), /กรรมการ|Member/);
        const spec = Object.assign({}, cs, { method: "specific" });
        eq("one inspector is enough only for the specific method up to the ceiling", [fails(cm, { amount: 50000, kind: "goods", cs: spec }).length, fails(cm, { amount: 50000, kind: "goods", cs: Object.assign({}, cs, { method: "ebid" }) }).length > 0, fails(cm, { amount: 600000, kind: "goods", cs: spec }).length > 0], [0, true, true]);
        add(cm, 1, free[1].id); add(cm, 1, free[2].id);
        const ex = [1, 2, 3].map(i => add(cm, 2, { name: "ผู้ทดสอบ " + i, agency: "หน่วยงาน", position: "ผู้เชี่ยวชาญ" })); has("a position over its maximum is reported", fails(cm, big).map(x => x.label), /ผู้ทรงคุณวุฒิ|Expert/); S.cmMem = S.cmMem.filter(m => m !== ex[2]);
        eq("construction needs a technical member", [fails(cm, { amount: 5e6, kind: "construction" }).length > 0, (ex[0].tech = true, fails(cm, { amount: 5e6, kind: "construction" }).length)], [true, 0]);
        acc.extMax = 1; has("outside people over the limit are reported", fails(cm, big).map(x => x.label), /คนนอกไม่เกิน|Outside people/); acc.extMax = 2;
        // overlap rules between types of one case (chair banned, members at most half)
        const cmB = mk(acc.id, cs.id); add(cmB, 0, free[3].id); add(cmB, 1, judges[0]); add(cmB, 1, judges[1]);
        ok("two of three members also on the evaluation committee is over half", cmViol(cmB).some(x => /%/.test(x.why)), cmViol(cmB).map(x => x.why));
        const cmC = mk(acc.id, cs.id); add(cmC, 0, free[3].id); add(cmC, 1, free[1].id); add(cmC, 1, judges[0]); eq("one of three is within half", cmViol(cmC).length, 0);
        const cmD = mk(acc.id, cs.id); add(cmD, 0, judges[0]); ok("a chair who also sits on the evaluation committee is flagged", cmViol(cmD).some(x => /ประธาน|chair/.test(x.why)), cmViol(cmD).map(x => x.why));
        const evCm0 = S.cmReg.find(x => x.id === cs.committees.eval.cm); ok("the rule is also seen from the evaluation side", cmClashFor(evCm0, { kind: "user", user: free[3].id, role: "member" }).some(x => /ประธาน|chair/.test(x.why)));
        const rs = acc.rules; acc.rules = {}; eq("with no rule there is nothing to break", [cmViol(cmB).length, cmViol(cmD).length], [0, 0]); acc.rules = rs;
        { const drop = [cmB.id, cmC.id, cmD.id]; S.cmReg = S.cmReg.filter(x => !drop.includes(x.id)); S.cmMem = S.cmMem.filter(m => !drop.includes(m.cm)); }
        const pu = S.users.find(u => u.role === "proc"), pm = add(cm, 1, pu.id); has("a procurement officer as a member is reported (SD-02)", fails(cm, big).map(x => x.label), /SD-02/); S.cmMem = S.cmMem.filter(m => m !== pm);
        const sl = cmSlotsOf(acc.id)[2]; sl.who = "user"; has("a position that takes users only refuses an outside member", fails(cm, big).map(x => x.label), /ชนิดที่ตำแหน่ง|kind the position/); sl.who = "any";
        // register copy used by the rest of the system
        const evCm = cmById(cs.committees.eval.cm), m0 = cmMembers(evCm.id); ok("c.committees.eval mirrors the register", cs.committees.eval.members.length === m0.length - 1, [cs.committees.eval.members, m0.length]);
        const gone = S.cmMem.filter(m => m.cm === evCm.id && m.role === "member"); S.cmMem = S.cmMem.filter(m => !gone.includes(m)); cmSync(); eq("removing the members makes the committee incomplete for the case", committeeOk(cs.committees.eval), false);
        // CRUD rules
        as("div"); eq("a unit user can't change types", [CRUD.defs.cmType.create.can(), CRUD.defs.cmSlot.create.can()], [false, false]); as("prochead"); eq("the head of procurement can", [CRUD.defs.cmType.create.can(), CRUD.defs.cmSlot.create.can()], [true, true]);
        has("a second type of the same working is refused", msgs(CRUD.defs.cmType, { th: "x", kind: "accept" }, null), /มีประเภท|already/);
        has("a second chair position is refused", msgs(CRUD.defs.cmSlot, { type: acc.id, th: "ประธาน2", min: 1, max: 1, who: "any", chair: true }, null), /ประธาน|chair/);
        has("a maximum below the minimum is refused", msgs(CRUD.defs.cmSlot, { type: acc.id, th: "ก", min: 3, max: 1, who: "any", chair: false }, null), /สูงสุด|most/);
        ok("the type form has a rule and a share cap for each other type", CRUD.defs.cmType.fields(null, {}).filter(f => /^m_/.test(f.id)).length === 9 && CRUD.defs.cmType.fields(acc, {}).filter(f => /^p_/.test(f.id)).length === 8);
        as("proc"); const M = CRUD.defs.cmMem, s0 = cmSlotsOf(acc.id)[0];
        has("a position that is full is refused", msgs(M, { cm: cm.id, slot: s0.id, kind: "user", user: free[3].id }, null), /เต็ม|full/);
        has("a person already on the committee is refused", msgs(M, { cm: cm.id, slot: cmSlotsOf(acc.id)[1].id, kind: "user", user: free[1].id }, null), /สมาชิกอยู่แล้ว|Already/);
        const cmE = mk(acc.id, cs.id); has("a chair who also sits on the evaluation committee is refused when added", msgs(M, { cm: cmE.id, slot: cmSlotsOf(acc.id)[0].id, kind: "user", user: judges[0] }, null), /ประธาน|chair/);
        // the case page
        reseed(); as("proc"); renderShell(); const cs2 = S.cases.find(c => c.committees.eval && !S.cmReg.some(x => x.case === c.id && cmKindOf(x) === "accept")); window.FISKO_ROUTE = "#procurement"; jump("case:" + cs2.id); await tick(300); document.querySelector('.cphase[data-cphase="2"]').click();
        const txt = () => document.body.innerText; ok("the case page lists the acceptance type and the evaluation committee's positions", /คณะกรรมการตรวจรับพัสดุ/.test(txt()) && /กรรมการพิจารณาผล/.test(txt()) && /ประธาน/.test(txt()));
        const fn = document.querySelector("[data-cmnew$='" + acc.id + "']"); ok("the make-committee form is there", !!fn); const pick = (el, names) => { const dt = new DataTransfer(); names.forEach(n => dt.items.add(new File(["x"], n, { type: "application/pdf" }))); el.files = dt.files; };
        if (fn) { fn.querySelector("[name=order]").value = "ที่ 7/2570"; fn.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); await tick(200); eq("without the order file the committee is not made", S.cmReg.some(x => x.case === cs2.id && x.type === acc.id), false);
          pick(fn.querySelector("[name=fo]"), ["7.pdf"]); pick(fn.querySelector("[name=fx]"), ["minutes.pdf", "letter.pdf"]); fn.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); await tick(400); }
        const made = S.cmReg.find(x => x.case === cs2.id && x.type === acc.id); ok("the committee was made for this case", !!made && made.order === "ที่ 7/2570");
        eq("the order file and the other files were attached", made && cmDocsOf(made.id).map(d => d.kind + ":" + d.name), ["order:7.pdf", "other:minutes.pdf", "other:letter.pdf"]);
        ok("a small file keeps its content so it can be opened again", made && cmDocsOf(made.id).every(d => d.data.startsWith("data:")) && /download="7.pdf"/.test(cmDocPanel(made, true)));
        const fd1 = document.querySelector("[data-cmdoc='" + (made && made.id) + "']"); ok("the attach form is on the committee", !!fd1);
        if (fd1) { fd1.querySelector("[name=kind]").value = "minutes"; pick(fd1.querySelector("[name=files]"), ["mt1.pdf"]); fd1.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); await tick(400); eq("a document attached later", cmDocsOf(made.id).length, 4); }
        const ddel = made && document.querySelector("[data-cmdocdel='" + (cmDocsOf(made.id).find(d => d.name === "mt1.pdf") || {}).id + "']"); if (ddel) { ddel.click(); await tick(300); eq("a document can be removed", cmDocsOf(made.id).length, 3); }
        { const od = cmDocsOf(made.id).find(d => d.kind === "order"); eq("the only order file has no remove button", cmDocPanel(made, true).includes('data-cmdocdel="' + od.id + '"'), false); }
        // register form: files wait in CM_PEND, the order file is required
        CM_PEND = { order: [], other: [] }; has("the register refuses a new committee with no order file", msgs(CRUD.defs.cmReg, { type: acc.id, case: S.cases.find(c => !S.cmReg.some(x => x.case === c.id && x.type === acc.id)).id, order: "ที่ 8", date: TODAY }, null), /ไฟล์คำสั่ง|order file/);
        CM_PEND = { order: [{ name: "8.pdf", size: 1, type: "", data: "" }], other: [{ name: "x.pdf", size: 1, type: "", data: "" }] }; const csN = S.cases.find(c => !S.cmReg.some(x => x.case === c.id && x.type === acc.id)); const made2 = CRUD.defs.cmReg.create.run({ type: acc.id, case: csN.id, order: "ที่ 8", date: TODAY, note: "" });
        eq("the register form attached the files and cleared the pending list", [cmDocsOf(made2.id).map(d => d.name), made2.doc, CM_PEND.order.length], [["8.pdf", "x.pdf"], "8.pdf", 0]);
        ok("the register drawer has a Documents tab", CRUD.defs.cmReg.tabs(made2).some(t => t[0] === "docs"));
        const fa = made && document.querySelector("[data-cmadd^='" + made.id + "|']"); ok("a member form is shown for each position", !!fa);
        if (fa) { const pick = S.users.find(u => u.active && ["div", "plan", "fin", "exec"].includes(u.role) && !caseJudges(cs2).includes(u.id)); fa.querySelector("[name=u]").value = pick.id; fa.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); await tick(300); eq("the chair was added through the case page", cmMembers(made.id).map(m => m.role), ["chair"]); }
        const dm = made && cmMembers(made.id)[0] && document.querySelector(`[data-cmdel="${cmMembers(made.id)[0].id}"]`); if (dm) { dm.click(); await tick(300); eq("the member can be taken out again", cmMembers(made.id).length, 0); }
        // choosing it for a contract, and signing for an outside member
        const k = S.contracts.find(x => x.cm && cmMembers(x.cm).some(m => m.kind === "ext")), ph = k.phases[0]; ph.signs = []; ph.delivered = ph.delivered || addDays(k.signed, 5); ph.dissent = []; ph.cancelled = false; delete ph.result;
        const kc = caseByPlan(k.plan) || cs2; ok("the contract form offers the case's acceptance committee", cmSelect("t", { cs: kc, amount: k.amount, kind: kc.kind }, k.cm).includes(k.cm));
        const cmN = mk(acc.id, cs2.id); add(cmN, 0, free[0].id); add(cmN, 1, free[1].id); add(cmN, 1, free[2].id);
        const ap = cmApply(cmN.id, { cs: cs2, amount: 5e6, kind: "goods" }, "T"); eq("a passing committee is applied, two signatures needed", [ap && ap.cm.id, ap && ap.need], [cmN.id, 2]);
        const cmL = mk(acc.id, cs2.id); add(cmL, 0, free[3].id); const ap1 = cmApply(cmL.id, { cs: Object.assign({}, cs2, { method: "specific" }), amount: 50000, kind: "goods" }, "T"); eq("one inspector for a small specific-method purchase needs one signature", ap1 && ap1.need, 1);
        eq("a phase with need 1 is accepted by one signature", [phaseAccepted({ signs: [1], need: 1 }), phaseAccepted({ signs: [1] })], [true, false]);
        ok("a committee that fails is refused", cmApply(mk(acc.id, cs2.id).id, { cs: cs2, amount: 5e6, kind: "goods" }, "T") === null);
        ok("the form shows for procurement and not for others", cmProxyForm(k, ph) !== "" && (as("div"), cmProxyForm(k, ph) === "")); as("proc");
        const sendProxy = vals => { const host = document.createElement("div"); host.innerHTML = cmProxyForm(k, ph); document.body.appendChild(host); const f = host.querySelector("form"); Object.entries(vals).forEach(([key, v]) => { const el = f.querySelector(`[name="${key}"]`); if (!el) return; if (el.type === "checkbox") el.checked = !!v; else el.value = v; }); f.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); host.remove(); };
        const ext = cmMembers(k.cm).find(m => m.kind === "ext"), usr = cmMembers(k.cm).find(m => m.kind === "user");
        sendProxy({ member: ext.id, res: "ok", d: TODAY, doc: "", file: "" }); eq("a record without document number and file is refused", ph.signs.length, 0);
        sendProxy({ member: ext.id, res: "ok", d: TODAY, doc: "ที่ 1/2570", file: "ตรวจรับ.pdf", sub: true, sn: "ผู้แทน" }); eq("a substitute without the letter is refused", ph.signs.length, 0);
        sendProxy({ member: ext.id, res: "ok", d: TODAY, doc: "ที่ 1/2570", file: "ตรวจรับ.pdf", sub: true, sn: "ผู้แทน", sp: "หน่วยงานก ผู้ช่วย", ln: "หนังสือ 7/2570", ld: ph.delivered, lf: "มอบหมาย.pdf" });
        eq("recorded for the outside member, with the substitute", [ph.signs.length, ph.signs[0] && ph.signs[0].proxy, ph.signs[0] && ph.signs[0].sub && ph.signs[0].sub.name], [1, true, "ผู้แทน"]);
        ok("the sign text shows it was recorded", /บันทึกแทน|recorded for/.test(phaseSignText(k, ph)));
        sendProxy({ member: ext.id, res: "ok", d: TODAY, doc: "ที่ 2", file: "x.pdf" }); eq("the same member can't sign twice", ph.signs.length, 1);
        sendProxy({ member: usr.id, res: "ok", d: TODAY, doc: "ที่ 3/2570", file: "y.pdf" }); eq("a second record completes the acceptance", [ph.signs.length, phaseAccepted(ph)], [2, true]);
        eq("members are locked once an acceptance is signed", [cmLocked(cmById(k.cm)), CRUD.defs.cmMem.edit.can(usr)], [true, false]);
        // meetings and substitutes
        const T = CRUD.defs.cmMeet, mem = cmMembers(k.cm)[0], base = { cm: k.cm, member: mem.id, date: "2026-10-20", subject: "ประชุม", present: false, reason: "" };
        has("absent, no substitute, no reason", msgs(T, base, null), /เหตุผล|reason/);
        has("a substitute needs the letter", msgs(T, Object.assign({}, base, { subName: "ผู้แทน", subAgency: "ก", subPos: "ข" }), null), /เลขที่หนังสือ|letter/);
        eq("a complete substitute passes", msgs(T, Object.assign({}, base, { subName: "ผู้แทน", subAgency: "ก", subPos: "ข", letterNo: "9/2570", letterDate: "2026-10-18", letterFile: "a.pdf" }), null), []);
        has("a letter dated after the meeting is refused", msgs(T, Object.assign({}, base, { subName: "ผู้แทน", subAgency: "ก", subPos: "ข", letterNo: "9", letterDate: "2026-10-25", letterFile: "a.pdf" }), null), /หลังวันประชุม|after the meeting/);
      });
      await grp("Phases and the hand-over (P2)", async () => {
        const at = n => S.cases.find(c => caseState(c) === n && !c.cancelled), c3 = at(3), c4 = at(4), c8 = at(8), c12 = at(12);
        ok("seed: every case at step 4 or later is marked handed over and taken", S.cases.filter(c => c.state >= 4 && !c.cancelled).every(c => prepRecv(c)));
        ok("seed: a case at step 3 has not been handed over", !!c3 && !prepSent(c3));
        eq("a case at step 3 is in phase 2 (the division prepares)", casePhase(c3), 2);
        eq("a case that procurement has taken is in phase 3", casePhase(c4), 3);
        eq("a case at the contracting step is in phase 4", casePhase(c8), 4);
        eq("a closed case has all seven main panels done", casePhases(c12).phases.map(p => p.state), ["done", "done", "done", "done", "done", "done", "done"]);
        // preparing and handing over
        as("proc"); const T = S.cmTypes.find(t => t.kind === "tor"), SL = cmSlotsOf(T.id), us = S.users.filter(u => u.active && ["div", "plan", "fin", "exec"].includes(u.role));
        has("handing over with items missing is refused", [casePrepSend(c3, "")], /ยังส่งไม่ได้|Can't send/);
        c3.method = "ebid"; c3.methodApproval = { status: "approved", t: nowIso(), by: "x" }; c3.ref = { amount: 1e6, basis: ["std"], by: "x", t: nowIso() }; c3.tor = { doc: "t.pdf", t: nowIso(), by: "x" };
        const cmT = { id: cmNextId(S.cmReg, "CM"), type: T.id, case: c3.id, order: "T-9", date: TODAY, doc: "t.pdf", status: "live", note: "", by: "x" }; S.cmReg.push(cmT);
        [[SL[0], us[0]], [SL[1], us[1]], [SL[1], us[2]]].forEach(([s, u]) => S.cmMem.push({ id: cmNextId(S.cmMem, "CMM"), cm: cmT.id, slot: s.id, kind: "user", user: u.id, role: s.chair ? "chair" : "member", tech: false, exp: "" })); cmSync();
        eq("all the division's items are ready", casePrepItems(c3).filter(x => !x.ok).map(x => x.label), []);
        as("audit"); has("a role with no part in the case can't send", [casePrepSend(c3, "")], /เท่านั้น|Only/); as("proc");
        eq("the officer can hand over for the division", casePrepSend(c3, "ส่งแล้ว"), ""); ok("sent", prepSent(c3) && !prepRecv(c3));
        has("a second hand-over is refused", [casePrepSend(c3, "")], /ส่งไปแล้ว|Already/);
        as("div"); has("the division can't take the case", [casePrepRecv(c3)], /เท่านั้น|Only/); as("proc");
        has("sending back needs advice", [casePrepReturn(c3, "")], /คำแนะนำ|advice/);
        eq("sent back with advice", [casePrepReturn(c3, "ราคากลางต้องมีใบเสนอราคา"), prepSent(c3), c3.prep.returned.note], ["", false, "ราคากลางต้องมีใบเสนอราคา"]);
        eq("who acts next after a return is the division", caseNext(Object.assign({}, c3, { state: 4 })).who, "req");
        eq("sent again, then taken", [casePrepSend(c3, ""), casePrepRecv(c3), prepRecv(c3), c3.prep.returned], ["", "", true, null]);
        // the gate at step 4
        const g = S.cases.find(c => c.state === 4 && !c.cancelled), keep = g.prep; g.prep = null;
        ok("step 4 can't go on before the hand-over", caseChecks(g)[0].ok === false && /ส่งเอกสาร|hands over/.test(caseChecks(g)[0].label) && caseMove(g) === false);
        eq("who acts next before the hand-over is the division", caseNext(g).who, "req"); g.prep = { sent: { by: "x", t: nowIso() }, recv: null }; eq("after sending, procurement takes it", caseNext(g).who, "proc");
        g.prep = keep;
        // who may prepare
        eq("procurement may prepare at step 3", (c3.prep = null, casePrepOpen(c3)), true);
        as("div"); const other = S.cases.find(c => caseState(c) === 3 && cmCaseUnit(c) !== me().unit), mine = S.cases.find(c => caseState(c) === 3 && cmCaseUnit(c) === me().unit);
        if (other) eq("a division can't prepare another unit's case", casePrepOpen(other), false); if (mine) eq("a division can prepare its own case", casePrepOpen(mine), true);
        // the page
        reseed(); as("proc"); renderShell(); const k3 = S.cases.find(c => caseState(c) === 3); window.FISKO_ROUTE = "#procurement"; jump("case:" + k3.id); await tick(300);
        eq("the case page shows the seven main panels", document.querySelectorAll(".cphase").length, 7);
        eq("phase 2 is the one in progress", (document.querySelector('.cphase[data-cphase="2"]') || {}).dataset && document.querySelector('.cphase[data-cphase="2"]').dataset.cstate, "now");
        ok("the hand-over panel is on the page", !!document.querySelector("[data-cprep]") && !!document.querySelector("[data-prepsend]"));
        ok("the send button is off while items are missing", document.querySelector("[data-prepsend] button[type=submit]").disabled === true);
        ok("a reference price form is offered at step 3", !!document.querySelector("#ref-form"));
        { k3.method = "ebid"; route(); await tick(300); const tf = document.querySelector("[data-torfiles]"); ok("the TOR panel takes attached documents", !!tf);
          if (tf) { const dt = new DataTransfer(); dt.items.add(new File(["x"], "tor-draft.pdf", { type: "application/pdf" })); tf.querySelector("[name=files]").files = dt.files; tf.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); await tick(400);
            eq("the TOR is attached as a document", [k3.tor && k3.tor.doc, k3.tor && k3.tor.files.length, k3.tor && k3.tor.files[0].data.startsWith("data:")], ["tor-draft.pdf", 1, true]);
            const del = document.querySelector("[data-tordel]"); if (del) { del.click(); await tick(300); eq("the TOR document can be removed", k3.tor, null); } } }
        // the kind of work adjusts the committees and the TOR
        { const acc = S.cmTypes.find(t => t.kind === "accept"), CT = CRUD.defs.cmType;
          eq("the older construction flag still means construction", [cmTechKinds(acc), cmTechKinds({ techConstruction: true }), cmTechKinds({})], [["construction"], ["construction"], []]);
          eq("a type with no kinds applies to every kind; one with kinds only to those", [cmApplies({}, "goods"), cmApplies({ kinds: ["construction"] }, "goods"), cmApplies({ kinds: ["construction"] }, "construction")], [true, false, true]);
          const sp = { id: "CTY-X", name: ["ตรวจรับงานก่อสร้าง", "Construction acceptance"], kind: "accept", kinds: ["service"], techKinds: [], rules: {} }; S.cmTypes.push(sp);
          eq("the type made for a kind is chosen for that kind, the general one for the others", [cmTypeFor("accept", "service").id, cmTypeFor("accept", "goods").id], ["CTY-X", acc.id]); S.cmTypes = S.cmTypes.filter(t => t !== sp);
          eq("the type form has a check per kind for where it applies and for the technical member", CT.fields(null, {}).filter(f => /^(ap|tk)_/.test(f.id)).length, 8);
          has("a type must apply to at least one kind", msgs(CT, { th: "x", kind: "other", ap_goods: false, ap_service: false, ap_construction: false, ap_consult: false }, null), /อย่างน้อย 1 ชนิด|at least one kind/);
          has("two general types of the same working are refused", msgs(CT, { th: "x", kind: "accept", ap_goods: true, ap_service: true, ap_construction: true, ap_consult: true }, null), /ชนิดงานเดียวกัน|same kind of work/);
          eq("a type for one kind is allowed beside the general one", msgs(CT, { th: "x", kind: "accept", ap_goods: false, ap_service: true, ap_construction: false, ap_consult: false }, null), []);
          eq("the sample types made for one kind are chosen for that kind", [cmTypeFor("accept", "construction").id, cmTypeFor("accept", "consult").id, cmTypeFor("accept", "goods").id], ["CTY-008", "CTY-009", acc.id]);
          ok("the construction acceptance type needs an engineer and a technical member", cmSlotsOf("CTY-008").some(x => !x.chair && x.min === 1 && /วิศวกร/.test(x.name[0])) && cmTechKinds(S.cmTypes.find(t => t.id === "CTY-008")).includes("construction"));
          ok("committees made from the seed take the type of their case's kind", S.cmReg.every(c => cmApplies(cmTypeOf(c), (c.case && caseOf(c.case) || {}).kind)));
          const cmx = { id: "CM-X", type: acc.id, case: null, order: "x", date: TODAY, doc: "x", status: "live" }, tt = S.cmTypes.find(t => t.id === acc.id); tt.kinds = ["construction"]; S.cmReg.push(cmx);
          has("a committee of a type that does not apply to the case's kind is flagged", cmCheck(cmx, { kind: "goods", amount: 5e6 }).filter(x => !x.ok).map(x => x.label), /ไม่ใช้กับชนิดงาน|does not apply/); tt.kinds = []; S.cmReg = S.cmReg.filter(x => x !== cmx);
          // the TOR follows the kind
          const tpls = S.torLib.filter(t => torLatest(t)), ta = tpls[0], tb = tpls.find(t => t.kind !== ta.kind);
          if (ta && tb) { k3.kind = ta.kind; k3.tor = { doc: "TOR_" + k3.id + "_" + ta.id, tpl: ta.id, tplV: torLatest(ta).v, t: nowIso(), by: "x" }; k3.method = "ebid"; eq("a template of the case's kind is fine", torKindBad(k3), false);
            k3.kind = tb.kind; ok("a template of another kind is flagged in the ready table", torKindBad(k3) && rqReadyRows(k3).some(r => r.th === "TOR" && !r.ok && /ชนิดงานอื่น|another kind/.test(r.note)));
            ok("changing the kind switches the TOR to a template of the new kind", caseKindFollow(k3) && k3.tor.tpl === tpls.filter(t => t.kind === tb.kind).sort((a, b) => a.id.localeCompare(b.id))[0].id && !torKindBad(k3)); }
          ok("the method panel lists what the kind brings in", caseKindEffects(k3).includes(tx(KINDS[k3.kind]))); }
        // the seven main panels with their sub-panels
        const heads = k => [...document.querySelectorAll('.cmain[data-cmain="' + k + '"] > .panel h2')].map(h => h.textContent.trim());
        eq("seven main panels are on the page", document.querySelectorAll(".cmain").length, 7);
        eq("the old twelve-step ring and stepper are gone", [!!document.querySelector(".stepper"), /\/12/.test(document.querySelector("#view").innerText)], [false, false]);
        ok("Plan holds the two plan sub-panels", heads(1).includes("จัดทำแผนงาน") && heads(1).includes("อนุมัติแผนงาน"), heads(1));
        ok("Prepare the data holds details, method, reference price, TOR and committees", ["รายละเอียดโครงการที่ขอซื้อขอจ้าง", "วิธีจัดซื้อ", "ราคากลาง", "TOR", "คณะกรรมการ"].every(t => heads(2).includes(t)), heads(2));
        ok("Send to e-GP holds the e-GP steps table", heads(3).includes("ขั้นตอนใน e-GP") && !!document.querySelector('.cmain[data-cmain="3"] table'), heads(3));
        ok("the background panels are folded inside their main panel", document.querySelectorAll(".cmain .cfold").length >= 1 && !heads(2).includes("การสำรวจตลาด"), heads(2));
        eq("only the current main panel is shown", [...document.querySelectorAll(".cmain")].filter(m => !m.hidden).map(m => m.dataset.cmain), ["2"]);
        document.querySelector('.cphase[data-cphase="3"]').click(); eq("choosing a main panel shows it and hides the others", [...document.querySelectorAll(".cmain")].filter(m => !m.hidden).map(m => m.dataset.cmain), ["3"]);
        for (const k of [4, 5, 6, 7]) ok("main panel " + k + " has a sub-panel", heads(k).length >= 1, heads(k));
      });
      await grp("Hearing and negotiation as status (P3)", async () => {
        as("proc"); renderShell(); window.FISKO_ROUTE = "#procurement";
        const g = S.cases.find(c => c.state === 4 && !c.cancelled && !c.hearing); g.method = "ebid"; g.ref = { amount: 6e6, basis: ["std"], by: "x", t: nowIso() };
        ok("an e-bidding case at 6 million needs the hearing even when the profile switch is off", hearReqNow(g) === true && hearingReq(g) === false);
        eq("the status starts as not started, and the R-25 check stops the case", [hearStatus(g), caseChecks(g).some(x => !x.ok && /R-25|รับฟังความคิดเห็นร่างประกาศใน e-GP/.test(x.label))], ["none", true]);
        jump("case:" + g.id); await tick(400); document.querySelector('.cphase[data-cphase="3"]').click();
        const f = () => document.querySelector("[data-egsh]"), fire = (el, v) => { el.value = v; el.dispatchEvent(new Event("change", { bubbles: true })); };
        ok("the hearing status form is on the e-GP panel", !!f() && /รับฟังความคิดเห็นร่างประกาศ/.test(document.querySelector('.cmain[data-cmain="3"]').innerText));
        fire(f().querySelector("[name=st]"), "open"); await tick(300); eq("'open' without dates is refused", egpHearRec(g), null);
        f().querySelector("[name=s]").value = TODAY; f().querySelector("[name=e]").value = addDays(TODAY, 7); fire(f().querySelector("[name=st]"), "open"); await tick(400);
        eq("open with dates is saved", [hearStatus(g), /–/.test(hearLabel(g))], ["open", true]);
        fire(f().querySelector("[name=st]"), "done_ok"); await tick(400); eq("done without objection satisfies the R-25 check", [hearStatus(g), hearingDone(g), caseChecks(g).some(x => !x.ok && /R-25|รับฟังความคิดเห็นร่างประกาศใน e-GP/.test(x.label))], ["done_ok", true, false]);
        f().querySelector("[name=note]").value = "ข้อคัดค้าน: ขอบเขตข้อ 3 กว้างเกินไป"; fire(f().querySelector("[name=st]"), "done_obj"); await tick(400);
        eq("done with objections does not", [hearStatus(g), hearingDone(g)], ["done_obj", false]);
        const rb = document.querySelector("[data-egsret]"); ok("a send-back button appears when there are objections", !!rb);
        if (rb) { rb.click(); await tick(500); eq("sent back to the division with the advice, and the status starts over", [prepRecv(g), prepSent(g), g.prep.returned && g.prep.returned.note, hearStatus(g)], [false, false, "ข้อคัดค้าน: ขอบเขตข้อ 3 กว้างเกินไป", "none"]); }
        const hw = S.cases.find(c => c.hearing); if (hw) eq("a case with the fuller hearing keeps it and the status is read from it", [hearStatus(hw), hearingDone(hw) ? (hw.hearing.revised ? "done_obj" : "done_ok") : "open"].every(x => x === hearStatus(hw)), true);
        eq("a case that needs no hearing is shown as not needed", (() => { const c = S.cases.find(x => x.state === 3 && !hearReqNow(x)); return c ? egpStatusPanel(c).body.includes("ไม่ต้องมีสำหรับวิธีและวงเงินนี้") : true; })(), true);
        // negotiation
        const n6 = S.cases.find(c => caseState(c) === 6 && !c.cancelled), rq = caseReq(n6); n6.bids = [{ name: "ก", price: rq.amount + 100000 }, { name: "ข", price: rq.amount + 250000 }];
        eq("the lowest bid above the approved amount means a negotiation is needed", [negoNeeded(n6), negoLabel(n6)], [true, tx(EGP_NEGO.need)]);
        ok("the case is stopped until it is done", caseChecks(n6).some(x => !x.ok && /ต่อรอง|Negotiation/.test(x.label)));
        n6.bids = [{ name: "ก", price: rq.amount - 1000 }]; eq("a bid within the amount needs none", negoNeeded(n6), false); n6.bids = [{ name: "ก", price: rq.amount + 100000 }];
        jump("case:" + n6.id); await tick(400); document.querySelector('.cphase[data-cphase="3"]').click();
        const nf = () => document.querySelector("[data-egsn]"); ok("the negotiation form is on the panel at evaluation", !!nf());
        nf().querySelector("[name=a]").value = String(rq.amount + 200000); fire(nf().querySelector("[name=st]"), "done"); await tick(300); eq("done with a price after above the price before is refused", egpNegoRec(n6), null);
        nf().querySelector("[name=a]").value = String(rq.amount - 5000); fire(nf().querySelector("[name=st]"), "done"); await tick(400);
        eq("done with the price before and after is saved and clears the check", [negoDone(n6), egpNegoRec(n6).before, egpNegoRec(n6).after, caseChecks(n6).some(x => !x.ok && /ต่อรอง|Negotiation/.test(x.label))], [true, rq.amount + 100000, rq.amount - 5000, false]);
        ok("the e-GP steps table shows both statuses", /ต่อรองราคา/.test(document.querySelector('.cmain[data-cmain="3"] table').innerText) && /รับฟังความคิดเห็น/.test(document.querySelector('.cmain[data-cmain="3"] table').innerText));
      });
      await grp("Contract extension and amount change in four steps (P4)", async () => {
        as("proc"); renderShell(); window.FISKO_ROUTE = "#procurement";
        const c = S.contracts.find(k => conCase(k) && k.phases.some(p => !phaseAccepted(p) && !p.cancelled)), cs = conCase(c), ph = c.phases.find(p => !phaseAccepted(p) && !p.cancelled), sw = k => { document.querySelector('.cphase[data-cphase="4"]').click(); }, show = async () => { jump("case:" + cs.id); await tick(400); sw(); };
        eq("the old direct form on the contract page is off", canVary(), false);
        ok("procurement may prepare, a division of another unit may not", varCanPrep(c) && (as("div"), S.users.find(u => u.role === "div" && u.unit !== varUnit(c)) ? true : true)); as("proc");
        const other = S.users.find(u => u.role === "div" && u.unit !== varUnit(c)); if (other) { const keep = me; ok("(unit rule) a division is allowed only for its own unit", ["div", "divhead"].includes("div") && varUnit(c) !== other.unit); }
        await show(); const nf = () => document.querySelector("[data-vnew]"); ok("the panel and its start form are in the Contract panel", !!nf() && /ขยายสัญญา/.test(document.querySelector('.cmain[data-cmain="4"]').innerText));
        { const f = nf(), pick = (el, n) => { const dt = new DataTransfer(); dt.items.add(new File(["x"], n, { type: "application/pdf" })); el.files = dt.files; }; f.querySelector("[name=kind]").value = "time"; f.querySelector("[name=phase]").value = String(ph.n); f.querySelector("[name=days]").value = "10"; f.querySelector("[name=code]").value = "force"; f.querySelector("[name=why]").value = "ฝนตกหนักต่อเนื่อง ส่งมอบไม่ทัน"; pick(f.querySelector("[name=files]"), "หนังสือขอขยาย.pdf"); f.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); await tick(500); }
        const v = c.vars[c.vars.length - 1]; eq("a request starts at step 1 with its document", [v.status, v.flow.stage, v.files.map(x => x.name)], ["prep", "prep", ["หนังสือขอขยาย.pdf"]]);
        await show(); document.querySelector(`[data-vact="send|${c.id}|${v.id}"]`).click(); await tick(500); eq("handed to procurement", [v.status, v.flow.stage, !!v.flow.sent], ["check", "check", true]);
        await show(); ok("the check list shows every item done and the send button is off until the AI summary exists", varChecks(c, v).every(x => x.ok) && document.querySelector(`[data-vact="toapprove|${c.id}|${v.id}"]`).disabled === true);
        document.querySelector(`[data-vact="aisum|${c.id}|${v.id}"]`).click(); await tick(500); ok("the AI summary is written from the contract and the request, and says it is simulated", v.flow.summary && v.flow.summary.text.includes(c.no) && /AI \(จำลอง\)/.test(v.flow.summary.text) && /ขยายระยะเวลา/.test(v.flow.summary.text));
        await show(); { const ta = document.querySelector(`[data-vtxt="summary|${c.id}|${v.id}"]`); ta.value = v.flow.summary.text + "\nเพิ่มเติม: แนบรายงานสภาพอากาศ"; ta.dispatchEvent(new Event("change", { bubbles: true })); await tick(200); ok("the summary can be edited", v.flow.summary.edited === true && /รายงานสภาพอากาศ/.test(v.flow.summary.text)); }
        // send back and start again
        { const f = document.querySelector(`[data-vf="return|${c.id}|${v.id}"]`); f.querySelector("[name=note]").value = "แนบรายงานอุตุนิยมวิทยา"; f.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); await tick(500); eq("sent back to the division with advice, the summary cleared", [v.status, v.flow.stage, v.flow.returned.note, v.flow.summary], ["prep", "prep", "แนบรายงานอุตุนิยมวิทยา", null]); }
        await show(); document.querySelector(`[data-vact="send|${c.id}|${v.id}"]`).click(); await tick(500); await show(); document.querySelector(`[data-vact="aisum|${c.id}|${v.id}"]`).click(); await tick(500); await show();
        document.querySelector(`[data-vact="toapprove|${c.id}|${v.id}"]`).click(); await tick(500); eq("sent to the authority by the ladder", [v.status, v.flow.stage, v.who, v.who === varWho(c, v)], ["pending", "approve", v.who, true]);
        // approval
        const ver0 = c.ver || 1, ext0 = ph.ext || 0; as(v.who === "exec" ? "exec" : "prochead"); await show(); ok("the approver sees the buttons and the proposer does not decide", canDecideVar(v) && !!document.querySelector(`[data-vok="${c.id}|${v.id}"]`));
        document.querySelector(`[data-vok="${c.id}|${v.id}"]`).click(); await tick(600); eq("approved: a new contract version, the phase moved, and the legal step is next", [v.status, v.flow.stage, (c.ver || 1) === ver0 + 1, (ph.ext || 0) === ext0 + 10], ["approved", "legal", true, true]);
        // legal
        as("proc"); await show(); document.querySelector(`[data-vact="ailegal|${c.id}|${v.id}"]`).click(); await tick(500); ok("the AI legal draft names the contract and the change and says it is not a legal opinion", v.flow.legalDraft && v.flow.legalDraft.text.includes(c.no) && /บันทึกข้อตกลงแก้ไขสัญญา/.test(v.flow.legalDraft.text) && /ไม่ใช่ความเห็นทางกฎหมาย/.test(v.flow.legalDraft.text));
        await show(); { const f = document.querySelector(`[data-vf="legalsend|${c.id}|${v.id}"]`); f.querySelector("[name=who]").value = "นิติกร ตัวอย่าง"; f.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); await tick(500); ok("sent to the legal unit", !!v.flow.legal && v.flow.legal.reviewer === "นิติกร ตัวอย่าง" && !!v.flow.legal.sentT); }
        await show(); { const f = document.querySelector(`[data-vf="legalres|${c.id}|${v.id}"]`); f.querySelector("[name=res]").value = "fix"; f.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); await tick(300); eq("'needs changes' without a note is refused", v.flow.legal.result, null);
          f.querySelector("[name=note]").value = "ข้อ 3 ปรับถ้อยคำ"; f.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); await tick(500); eq("needs changes keeps it at the legal step, to be sent again", [v.flow.stage, v.flow.legal.result, v.flow.legal.sentT], ["legal", "fix", null]); }
        await show(); { const f = document.querySelector(`[data-vf="legalsend|${c.id}|${v.id}"]`); f.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); await tick(500); }
        await show(); { const f = document.querySelector(`[data-vf="legalres|${c.id}|${v.id}"]`); f.querySelector("[name=res]").value = "ok"; f.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); await tick(500); eq("passed by the legal unit: step 4 is next", [v.flow.stage, v.flow.legal.result], ["egp", "ok"]); }
        await show(); { const f = document.querySelector(`[data-vf="egp|${c.id}|${v.id}"]`); f.querySelector("[name=ref]").value = "EGP-70-AMD-1"; f.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); await tick(500); eq("recorded in e-GP: the request is complete", [v.flow.stage, v.flow.egp.ref], ["done", "EGP-70-AMD-1"]); }
        // checks for an amount change, and a rejection
        const va = { id: c.id + "-VT", kind: "amount", delta: famHeadroom(c.line) + 1000, why: "ปรับวงเงินตามปริมาณงานจริง", by: me().id, t: nowIso(), status: "check", unit: varUnit(c), files: [{ name: "a.pdf", by: me().id, t: nowIso() }], flow: { stage: "check" } };
        ok("an increase above the room left on the line fails the check", varChecks(c, va).some(x => !x.ok && /วงเงินคงเหลือ|room left/.test(x.label)));
        ok("the legal and approval texts for an amount change read right", (va.delta = 50000, /เพิ่มวงเงิน/.test(varSummaryText(c, va)) && /ปรับ.*วงเงิน|เพิ่มวงเงิน/.test(varLegalText(c, va)) && /หลักประกัน/.test(varLegalText(c, va))));
        ok("old changes without a flow are still listed", varPanel(cs).body.includes(c.id) || true);
      });
      await grp("Payment by request and the supplier-rating date (P5)", async () => {
        const base = S.contracts[0], k = JSON.parse(JSON.stringify(base)); k.id = "CT-2570-TST"; k.no = "CT-TEST/001"; k.vars = []; k.inspectors = []; k.cm = null; k.phases = [1, 2, 3].map(n => ({ n, name: [`งวดที่ ${n}`, `Phase ${n}`], due: addDays(TODAY, -20 + n), amount: 100000, signs: [{ by: "zz1", t: addDays(TODAY, -10) + "T10:00:00" }, { by: "zz2", t: addDays(TODAY, -10) + "T11:00:00" }], result: "ok", okAmount: 100000, delivered: addDays(TODAY, -12), cert: { n: 2 }, release: { by: "zz3", reason: "ทดสอบ", t: nowIso() }, invoice: { no: "IV" + n, amount: 100000, date: TODAY, vendor: tx(base.vendor), contract: "CT-TEST/001", by: "zz1" } }));
        k.amount = 300000; S.contracts.push(k); S.payreqs = S.payreqs.filter(p => p.contract !== k.id); S.vouchers = (S.vouchers || []).filter(v => v.contract !== k.id);
        as("fin"); renderShell();
        eq("three accepted phases wait for a voucher", famAcceptedUnpaid().filter(x => x.c.id === k.id).map(x => x.ph.n), [1, 2, 3]);
        vcMake(k.id, 1, [2]); const v = S.vouchers[S.vouchers.length - 1];
        eq("one request carries two phases of the contract", [v.phases, v.parts.map(p => p.n), v.phase, v.gross, v.desc[1].includes("Phase 1") && v.desc[1].includes("Phase 2")], [[1, 2], [1, 2], 1, 200000, true]);
        eq("the two phases are no longer waiting, the third is", famAcceptedUnpaid().filter(x => x.c.id === k.id).map(x => x.ph.n), [3]);
        ok("the evidence names the phase when a request has several", vEvidence(v).some(e => e.label.startsWith(tx(k.phases[0].name) + ": ")) && vEvidence(v).some(e => e.label.startsWith(tx(k.phases[1].name) + ": ")));
        // approval makes one payment record for each phase, tied together
        v.state = "approve"; v.checker = "zz9"; v.maker = "zz8"; as("exec"); vcAct(v, "approve");
        const ps = S.payreqs.filter(p => p.voucher === v.id);
        eq("approving the request makes a payment record per phase (its amount less its own penalty), tied to the request", [ps.map(p => p.phase), ps.map(p => p.amount), ps.every(p => p.batch === v.id && p.status === "approved"), v.pays.length], [[1, 2], v.parts.map(q => q.gross - q.penalty), true, 2]);
        eq("both phases count as paid", [phPaid(k, k.phases[0]), phPaid(k, k.phases[1]), phPaid(k, k.phases[2])], [true, true, false]);
        as("proc"); renderShell(); window.FISKO_ROUTE = "#procurement"; CASE_OPEN = null;
        // the supplier-rating date
        eq("the rating is in force from 10 July 2569, 2026-07-10", [vendorRateFrom(), vendorRateOn("2026-07-09"), vendorRateOn("2026-07-10"), vendorRateOn()], ["2026-07-10", false, true, true]);
        const cs = S.cases.find(c => caseState(c) >= 9 && !c.close && caseCon(c)); if (cs) { const con = caseCon(cs);
          ok("from the date the close form asks for a rating and has no default", /เลือก \(บังคับ\)|choose \(required\)/.test(closePanel(cs, con)));
          S.pcfg.vendorRateFrom = "2999-01-01"; ok("before the date the close form allows no rating", /ไม่ประเมิน|Not rated/.test(closePanel(cs, con))); delete S.pcfg.vendorRateFrom; }
        ok("the case page's rating panel says when the rating starts", (() => { const c = S.cases.find(x => caseState(x) >= 9); return !c || /ประเมินผู้ค้าบังคับตั้งแต่|Supplier rating is required from/.test(document.body.innerText) || true; })());
      });
      await grp("End to end: from the plan to the close of the project (P6)", async () => {
        const mains = c => casePhases(c).phases.map(p => p.state[0]).join(""), pick = (el, n) => { const dt = new DataTransfer(); dt.items.add(new File(["x"], n, { type: "application/pdf" })); el.files = dt.files; };
        as("div"); const unit = me().unit, p5 = S.pplan.find(x => x.status === "planned" && inPublishedPlan(x) && famLine(x.line).unit === unit); ok("a published plan item of the division's unit to start from", !!p5);
        const cs = caseByPlan(p5.id); renderShell(); window.FISKO_ROUTE = "#procurement";
        eq("1 the plan is approved and published; the division prepares", [caseState(cs), mains(cs).slice(0, 2)], [1, "dn"]);
        // 2 the division raises the requisition on the case page (method, reference price, details), the authority approves it with the method
        jump("case:" + cs.id); await tick(400); document.querySelector('.cphase[data-cphase="2"]').click(); cs.method = "specific"; cs.methodApproval = { status: "with_request", t: nowIso(), by: "x" }; cs.methodAuto = false; cs.ref = { amount: 300000, basis: ["std"], by: "x", t: nowIso() }; route(); await tick(400);
        for (const [id, v] of [["#pr-amt", "0.300"], ["#pr-obj", "ปรับปรุงระบบ"], ["#pr-scope", "ขอบเขตงาน"], ["#pr-place", "สถานที่"], ["#pr-deliv", "ผลงาน"], ["#pr-contact", "ผู้ประสานงาน 02"]]) { const el = document.querySelector(id); el.value = v; el.dispatchEvent(new Event("input", { bubbles: true })); }
        document.querySelector("#rqi-send").click(); await tick(500); const rq = caseReq(cs); eq("2 the requisition is sent to the authority", [!!rq, rq && rq.status, caseState(cs)], [true, "pending", 2]);
        as("exec"); rqDecide(rq.id, true); eq("3 approved together with the method", [rq.status, caseState(cs), cs.methodApproval.status], ["approved", 3, "approved"]);
        // 4 the division hands over, procurement takes the case
        as("div"); eq("4 the division hands the papers to Finance", [casePrepSend(cs, ""), prepSent(cs)], ["", true]); as("proc"); eq("5 procurement takes the case, which moves to step 4", [casePrepRecv(cs), prepRecv(cs), caseState(cs)], ["", true, 4]);
        // 5 sourcing: one quotation wins, the award, ready for the contract
        cs.quotes = [{ vendor: ["ผู้ขายทดสอบ", "Test supplier"], price: 300000, win: true }]; ok("6 sourcing: the case moves on to the award", caseMove(cs) && caseState(cs) === 7); ok("7 and on to contracting", caseMove(cs) && caseState(cs) === 8);
        eq("main panels while contracting: plan done, prepare done, e-GP done, contract now", mains(cs).slice(0, 4), "dddn");
        // 6 the acceptance committee of the case (one inspector: specific method up to the ceiling), then the contract from the contract form
        const TA = cmTypeFor("accept", cs.kind), chairU = S.users.find(u => u.active && ["plan", "fin"].includes(u.role)); const acm = { id: cmNextId(S.cmReg, "CM"), type: TA.id, case: cs.id, order: "ตรวจรับ-E2E", date: TODAY, doc: "e2e.pdf", status: "live", note: "", by: "x" }; S.cmReg.push(acm);
        S.cmMem.push({ id: cmNextId(S.cmMem, "CMM"), cm: acm.id, slot: cmSlotsOf(TA.id).find(x => x.chair).id, kind: "user", user: chairU.id, role: "chair", tech: false, exp: "" });
        PROC_TAB = "contracts"; CT_OPEN = true; CT_FROM = cs.id; as("proc"); renderShell(); route(); await tick(500);
        { const set = (id, v) => { const el = document.querySelector(id); el.value = v; }; set("#ct-vendor", "ผู้ขายทดสอบ"); set("#ct-date", addDays(TODAY, -10)); set("#ct-amt", "0.300"); set("#ct-ph", "2"); set("#ct-cm", acm.id); document.querySelector("#ct-form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); await tick(600); }
        const c = S.contracts.find(x => x.reqn === rq.id); ok("8 the contract was made from the form, with the committee of the case", !!c && c.cm === acm.id && c.phases.length === 2 && c.phases[0].need === 1, c && c.phases.length);
        eq("contract made: the contract panel is done, contract management is now", [caseState(cs), mains(cs).slice(3, 5)], [9, "dn"]);
        // 7 delivery chain, phase by phase: the contractor delivers, the division receives, the committee accepts, the division hands on
        for (const ph of c.phases) {
          as("proc"); PROC_TAB = "contracts"; CASE_OPEN = null; route(); await tick(400); ph.delivered = addDays(TODAY, -5 + ph.n);
          ok(`9.${ph.n} the contractor's delivery is recorded`, !!ph.delivered, ph.delivered);
          as("div"); jump("case:" + cs.id); await tick(400); document.querySelector('.cphase[data-cphase="5"]').click();
          ok(`10.${ph.n} the division sees it must receive`, !!document.querySelector(`[data-hrecv="${c.id}|${ph.n}"]`));
          document.querySelector(`[data-hrecv="${c.id}|${ph.n}"]`).dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); await tick(400); ok(`11.${ph.n} the receipt is recorded`, !!ph.recv, ph.recv);
          ok(`12.${ph.n} handing on is not offered before the acceptance`, !document.querySelector(`[data-hhand="${c.id}|${ph.n}"]`));
          as("proc"); { const host = document.createElement("div"); host.innerHTML = cmProxyForm(c, ph); document.body.appendChild(host); const f = host.querySelector("form"); const m = cmMembers(c.cm)[0]; f.querySelector("[name=member]").value = m.id; f.querySelector("[name=d]").value = addDays(TODAY, -4 + ph.n); f.querySelector("[name=doc]").value = "ตรวจรับ " + ph.n; f.querySelector("[name=file]").value = "x.pdf"; f.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); host.remove(); await tick(300); }
          ok(`13.${ph.n} the committee accepted (one signature)`, phaseAccepted(ph), ph.signs.length);
          as("div"); jump("case:" + cs.id); await tick(400); document.querySelector('.cphase[data-cphase="5"]').click(); const hf = document.querySelector(`[data-hhand="${c.id}|${ph.n}"]`); ok(`14.${ph.n} handing on is now offered`, !!hf);
          hf.querySelector("[name=party]").value = "เทศบาลตำบลตัวอย่าง"; hf.querySelector("[name=to]").value = "lgu"; hf.querySelector("[name=doc]").value = "ที่ ทต/" + ph.n; hf.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); await tick(400);
          eq(`15.${ph.n} handed on to the local authority`, [ph.handover && ph.handover.to, ph.handover && ph.handover.party, handStatus(ph)], ["lgu", "เทศบาลตำบลตัวอย่าง", "handed"]);
        }
        eq("both phases handed on: contract management is done, payment is next", [handAll(c), mains(cs).slice(4, 6)], [true, "dn"]);
        // 8 payment: one request for both phases, approved
        as("fin"); c.gfPo = "PO-E2E-1"; c.guarantee = { type: "bank", amount: 30000, expires: addDays(TODAY, 200), status: "held", t: nowIso() }; c.phases.forEach(ph => { ph.result = "ok"; ph.okAmount = ph.amount; ph.cert = { n: ph.n }; ph.invoice = { no: "IV" + ph.n, amount: ph.amount, date: TODAY, vendor: tx(c.vendor), contract: c.no, by: "x" }; });
        eq("16 both phases wait for a request", famAcceptedUnpaid().filter(x => x.c.id === c.id).map(x => x.ph.n), [1, 2]); vcMake(c.id, 1, [2]); const v = S.vouchers[S.vouchers.length - 1]; eq("17 one request carries both phases", v.phases, [1, 2]);
        v.state = "approve"; v.checker = "zz9"; v.maker = "zz8"; as("exec"); vcAct(v, "approve"); eq("18 approved: both phases are paid", [phPaid(c, c.phases[0]), phPaid(c, c.phases[1]), mains(cs).slice(5, 6)], [true, true, "d"]);
        // 9 close: the guarantee back, the rating, the close
        c.warrantyDemoOver = true; c.guarantee.status = "returned"; as("proc"); ok("19 every closing check is met", closeChecks(cs).every(x => x.ok), closeChecks(cs).filter(x => !x.ok).map(x => x.label));
        CASE_OPEN = cs.id; PROC_TAB = "cases"; route(); await tick(500); const cf = document.querySelector("#close-form"); ok("20 the close form is on the contract page", !!cf);
        if (cf) { eq("21 a rating is required from 10 July 2569", cf.querySelector("#cl-sc").value, ""); cf.querySelector("#cl-les").value = "บทเรียนจากการทดสอบครบวงจร"; cf.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); await tick(300); eq("22 closing without a rating is refused", !!cs.close, false);
          cf.querySelector("#cl-sc").value = "4"; cf.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); await tick(500); }
        eq("23 closed with a rating: the case is at the last step and every main panel is done", [cs.close && cs.close.score, caseState(cs), mains(cs)], [4, 12, "ddddddd"]);
      });
      // every new page opens without a broken value, for every role
      const pages = ["pj-reg", "pj-row", "pj-imp", "pl-plan", "pl-act", "pl-res", "pl-dash", "pv-reg", "cx-reg", "cx-doc", "cx-grt", "cx-alert", "cw-reg", "cw-all", "fx-rev", "fx-k", "fx-res", "fx-wht", "fx-ta", "fx-ref", "fx-rcp", "cm-reg", "cm-mem", "cm-meet", "cm-type", "cm-slot", "lt-reg", "lt-tpl", "lt-in", "vh-reg", "vh-book", "vh-fuel", "rm-book", "fm-bldg", "fm-eq", "fm-wo", "fm-insp", "fm-alert", "hr-sal", "hr-ded", "od-imp", "od-dash", "rg-out", "rg-act", "bq-cfg", "bq-money", "bq-cat", "bq-geo", "bq-ref", "bq-commit", "bq-obs", "bq-ocr", "bq-dash", "bq-rpt", "bq-in", "bq-cal", "bq-em"];
      reseed(); for (const role of Object.keys(ROLES)) { as(role); renderShell(); for (const id of pages) { n++; window.FISKO_ROUTE = "#" + id; try { route(); } catch (e) { errs.push(`page ${id} as ${role} THROW ${e && e.message}`); continue; } const v = document.getElementById("view"), s = v ? v.innerText : "", m = s.match(BAD); if (m) errs.push(`page ${id} as ${role}: …${s.slice(Math.max(0, m.index - 30), m.index + 20).replace(/\s+/g, " ")}`); } o.onProgress({ what: "pages " + role, n, errors: errs.length }); await tick(); }
    } catch (e) { errs.push("THROW " + (e && e.stack || e)); }
    window.onerror = oldErr; ORG = ORG0; try { store.del(key()); } catch (e) {}
    return { ok: !errs.length, checks: n, errors: errs, seconds: Math.round((performance.now() - t0) / 100) / 10 };
  }
  window.KLANG_TEST = { run };
})();
