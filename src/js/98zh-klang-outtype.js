// Fisko-KlangFinance, budget round Q4d (12 Nov 2569): the output/project list holds output-level nodes only, each linked to a
// programme, with a type: output (ผลผลิต), project (โครงการ) or fund (กองทุน). A programme is no longer listed as if it were an
// output. Before this, a programme with no outputs stood in for one because its activities hung straight on it (the sample
// personnel and core-administration programmes). The sample data now gives each such programme an output of its own and
// moves its activities under it, so every activity sits under an output-level node and the lists need no stand-in.
// The ids of the activities do not change, so requests, allocations and indicators that name an activity keep working.
// The types of the sample outputs follow the names (a name with โครงการ is a project, with กองทุน a fund, the rest outputs);
// Planning changes them on the output/project register (RG1). The new outputs are samples of mine.
Object.keys(SEEDS).forEach(k => {
  const prev = SEEDS[k].seed;
  SEEDS[k].seed = () => {
    const s = prev();
    Object.keys(s.structure || {}).forEach(fy => {
      const st = s.structure[fy];
      st.filter(n => n.lvl === "program").forEach(p => {
        if (st.some(n => n.lvl === "output" && n.parent === p.id)) return;
        const o = { id: `${p.id}-OP`, lvl: "output", code: `${p.code}.O1`, parent: p.id, name: [`ผลผลิต${String(p.name[0]).replace(/^แผนงาน/, "")}`, `Output of the ${p.name[1]}`], otype: "output" };
        st.splice(st.indexOf(p) + 1, 0, o); st.forEach(n => { if (n.lvl === "activity" && n.parent === p.id) n.parent = o.id; });
      });
      st.filter(n => n.lvl === "output" && !n.otype).forEach(n => (n.otype = /โครงการ/.test(n.name[0]) ? "project" : /กองทุน/.test(n.name[0]) ? "fund" : "output"));
    });
    return s;
  };
});
