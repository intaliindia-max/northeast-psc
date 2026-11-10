// Tests run as a student who has already filled the one-time name and WhatsApp screen.
const withLead = function (v) { const o = v ? JSON.parse(v) : {}; if (!o.lead) o.lead = { name: "Test", phone: "9876543210", at: 1 }; return JSON.stringify(o); };
const fs = require("fs");
function load(p) { const h = fs.readFileSync(p, "utf8"); return { h, dataTxt: h.split('<script type="application/json" id="quiz-data">')[1].split("</script>")[0], script: h.split("<script>\n")[1].split("</script>")[0] }; }
let saved = null;
function boot(P, hash) {
  const docH = {}, winH = {}, app = { innerHTML: "", querySelector() { return null; } }, timer = { hidden: true, textContent: "" };
  global.document = { getElementById(id) { return id === "app" ? app : id === "timer" ? timer : id === "quiz-data" ? { textContent: P.dataTxt } : null; },
    addEventListener(t, f) { docH[t] = f; }, body: { setAttribute() {}, insertAdjacentHTML() {} }, querySelector() { return null; }, querySelectorAll() { return []; }, contains() { return false; }, activeElement: null };
  global.window = { scrollTo() {}, addEventListener(t, f) { winH[t] = f; }, open() {} };
  global.location = { hash, href: "https://example.org/x/#" + hash, protocol: "https:" }; global.setInterval = () => 0;
  global.localStorage = { getItem() { return withLead(saved); }, setItem(k, v) { saved = v; } };
  eval(P.script);
  const click = (action, attrs) => { const el = { getAttribute(a) { return a === "data-action" ? action : (attrs || {})[a] ?? null; } };
    docH.click({ target: { classList: { contains() { return false; } }, closest(s) { return s.includes("data-action") ? el : null; } }, preventDefault() {} }); };
  const go = h => { location.hash = h; winH.hashchange(); };
  return { app, click, go };
}
const strip = s => s.replace(/data:image\/[a-z]+;base64,[A-Za-z0-9+\/=]+/g, "");
for (const [label, path] of [["website", "site_pkg/index.html"], ["single file", "dist/apssb-basic-maths-practice.html"]]) {
  saved = null;
  const P = load(path), D = JSON.parse(P.dataTxt), T = D.topics;
  const R = T.filter(t => t.subject === "reasoning");
  let A = boot(P, "practice");
  A.click("subject", { "data-s": "reasoning" });
  const collapsed = strip(A.app.innerHTML);
  A.click("moretopics");
  const prac = strip(A.app.innerHTML);
  console.log(label + ": collapsed shows " + (collapsed.match(/class="topic"/g) || []).length + " topics with a see-all button " + /See all 19 Reasoning topics/.test(collapsed) +
    ", topics come before the tools " + (collapsed.indexOf('class="topics"') < collapsed.indexOf('class="sheet tools"')));
  const nTopics = (prac.match(/class="topic"/g) || []).length;
  A.go("r-matrix"); const mat = strip(A.app.innerHTML);
  A.go("r-classification"); const cls = strip(A.app.innerHTML);
  // a 5-option assertion-reason question
  const sa = T.find(t => t.slug === "r-statement-assertion"); const ar = sa.qs.findIndex(q => q.o.length === 5);
  const arQuiz = "r-statement-assertion-quiz-" + (Math.floor(ar / 10) + 1);
  saved = JSON.stringify({ progress: {}, active: { [arQuiz]: { answers: new Array(10).fill(null), index: ar % 10, elapsed: 0 } } });
  A = boot(P, arQuiz); const arHtml = strip(A.app.innerHTML);
  // a directions question with its figure (Venn)
  const vn = T.find(t => t.slug === "r-venn-diagram"); const di = vn.qs.findIndex(q => q.pi);
  const vQuiz = "r-venn-diagram-quiz-" + (Math.floor(di / 10) + 1);
  saved = JSON.stringify({ progress: {}, active: { [vQuiz]: { answers: new Array(10).fill(null), index: di % 10, elapsed: 0 } } });
  A = boot(P, vQuiz); const vHtml = A.app.innerHTML;
  // a PYQ from another state
  const st = R.find(t => t.pyq.some(q => /Meghalaya/.test(q.y))); const si = st.pyq.findIndex(q => /Meghalaya/.test(q.y));
  const pQuiz = st.slug + "-pyq-" + (Math.floor(si / 10) + 1);
  saved = JSON.stringify({ progress: {}, active: { [pQuiz]: { answers: new Array(10).fill(null), index: si % 10, elapsed: 0 } } });
  A = boot(P, pQuiz); const pHtml = strip(A.app.innerHTML);
  // reasoning mock test
  saved = null; A = boot(P, "mock"); A.click("newmock", { "data-subject": "reasoning" });
  let stt = JSON.parse(saved); const id = "mock-" + stt.mockCount, refs = stt.mockRefs[id];
  A.go(id); stt = JSON.parse(saved);
  const onlyR = refs.every(r => T[r[0]].subject === "reasoning");
  const items = refs.map(r => (r[1] ? T[r[0]].pyq : T[r[0]].qs)[r[2]]);
  const keys = new Set(items.map(q => q.t + "|" + q.o.join("|") + "|" + (q.img || "") + "|" + (q.pre || "")));
  stt.active[id].answers = items.map(q => q.k); saved = JSON.stringify(stt);
  A = boot(P, id); A.click("confirm-submit"); const mres = strip(A.app.innerHTML);
  console.log(label + ":",
    "reasoning topics", nTopics, "| matrix quizzes", (mat.match(/class="qcard/g) || mat.match(/-quiz-\d+"/g) || []).length,
    "| classification PYQ quizzes", (cls.match(/r-classification-pyq-\d+/g) || []).length,
    "| option E shown", /data-i="4"/.test(arHtml),
    "| directions figure", vHtml.includes('class="pre"') && (vHtml.match(/<figure class="fig">/g) || []).length >= 1,
    "| state label", /Meghalaya \d{4} PYQ/.test(pHtml),
    "| mock: reasoning only", onlyR, refs.length, "qs,", refs.filter(r => r[1]).length, "PYQ, unique", keys.size,
    "| result", /50<small>\/50/.test(mres) && mres.includes("Reasoning section"),
    "| bad", ["undefined", "NaN", "[object"].filter(x => (prac + mat + cls + arHtml + pHtml + mres).includes(x)));
}
