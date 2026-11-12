// Build Flow_9_Modules.html from flows/data-1.js, flows/data-2.js and flows/flow.template.html.
// Run from the project folder: node flows/build_flows.js
const fs = require("fs"), path = require("path");
const dir = __dirname;
const data = ["data-1.js", "data-2.js", "data-3.js", "data-4.js"].map(f => fs.readFileSync(path.join(dir, f), "utf8")).join("\n");
const tpl = fs.readFileSync(path.join(dir, "flow.template.html"), "utf8");
fs.writeFileSync(path.join(dir, "..", "Flow_9_Modules.html"), tpl.replace("/*DATA*/", () => data));
// check the data parses and every step points at a real actor and a real status chip
new Function(data + "; for (const m of FLOW) for (const s of m.steps) { if (!m.actors.some(a => a[0] === s.a)) throw new Error(m.id + ' unknown actor ' + s.a); if (!'BSPN'.includes(s.im)) throw new Error(m.id + ' bad im'); (s.ret || []).forEach(r => { if (r < 1 || r > m.steps.length) throw new Error(m.id + ' bad ret ' + r); }); } return FLOW.length;")();
console.log("Flow_9_Modules.html written");
