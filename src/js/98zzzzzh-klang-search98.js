// ---------- P98: a search box on every list ----------
// Every panel whose table lists 5 rows or more and has no search box of its own gets one in its header. Typing hides the rows
// that do not contain the text (Thai or English, any column). The text is kept per page and panel, so it stays after a re-render.
const SR98 = {};
function sr98Key(p) { const h = p.querySelector("header h2, header h3, h2, h3"); return (location.hash || "") + "|" + (h ? h.textContent.trim() : ""); }
function sr98Apply(p, q) { const t = String(q || "").trim().toLowerCase(); let n = 0, all = 0;
  p.querySelectorAll("table").forEach(tb => tb.querySelectorAll(":scope > tbody > tr").forEach(tr => { if (tr.classList.contains("fn-rowform")) return; all++;
    const hit = !t || tr.textContent.toLowerCase().includes(t); tr.style.display = hit ? "" : "none"; if (hit) n++; const nx = tr.nextElementSibling; if (nx && nx.classList.contains("fn-rowform")) nx.style.display = hit ? "" : "none"; }));
  const c = p.querySelector(".sr98-n"); if (c) c.textContent = t ? `${n} จาก ${all}` : ""; }
function sr98Scan(root) { (root || document).querySelectorAll("section.panel").forEach(p => {
  if (p.querySelector(".sr98") || p.closest("dialog")) return; const rows = p.querySelectorAll("table > tbody > tr").length; if (rows < 5) return;
  if (p.querySelector('input[type="search"]')) return; // the panel has its own search
  const k = sr98Key(p), box = document.createElement("span"); box.className = "sr98";
  box.innerHTML = `<input type="search" placeholder="ค้นหาในตารางนี้" aria-label="ค้นหาในตารางนี้"><span class="sr98-n sub"></span>`;
  const inp = box.querySelector("input"); inp.value = SR98[k] || ""; inp.addEventListener("input", () => { SR98[k] = inp.value; sr98Apply(p, inp.value); });
  const hd = p.querySelector(":scope > header"); if (hd) hd.appendChild(box); else { box.style.margin = "8px 12px"; p.insertBefore(box, p.firstChild); }
  if (inp.value) sr98Apply(p, inp.value); }); }
(function () { if (document.getElementById("sr98-css")) return; const s = document.createElement("style"); s.id = "sr98-css";
  s.textContent = `.sr98{display:inline-flex;align-items:center;gap:6px;margin-left:auto}.sr98 input{width:220px;max-width:46vw;padding:5px 10px;border-radius:8px;margin:0}.sr98-n{font-size:12px;white-space:nowrap}`; document.head.appendChild(s);
  let tm = null; new MutationObserver(() => { clearTimeout(tm); tm = setTimeout(() => sr98Scan(document), 60); }).observe(document.body, { childList: true, subtree: true }); })();
