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
  global.location = { hash, href: "https://example.org/maths/#" + hash, protocol: "https:" }; global.setInterval = () => 0;
  global.localStorage = { getItem() { return withLead(saved); }, setItem(k, v) { saved = v; } };
  eval(P.script);
  const click = (action, attrs) => { const el = { getAttribute(a) { return a === "data-action" ? action : (attrs || {})[a] ?? null; } };
    docH.click({ target: { classList: { contains() { return false; } }, closest(s) { return s.includes("data-action") ? el : null; } }, preventDefault() {} }); };
  const go = h => { location.hash = h; winH.hashchange(); };
  return { app, click, go };
}
const strip = s => s.replace(/data:image\/[a-z]+;base64,[A-Za-z0-9+\/=]+/g, "");
const P = load("site_pkg/index.html");
const DATA = JSON.parse(P.dataTxt), T = DATA.topics;
let A = boot(P, "practice");
const prac = strip(A.app.innerHTML);
console.log("practice tools:", (prac.match(/class="toolcard"/g) || []).length, "| install button hidden:", !prac.includes('data-action="install"'));
A.go("mock"); console.log("mock page:", strip(A.app.innerHTML).includes("Start a new mock test"), "| report empty state:", (A.go("report"), strip(A.app.innerHTML).includes("Attempt a few quizzes")));
A.go("mock"); A.click("newmock");
let st = JSON.parse(saved); const refs = st.mockRefs["mock-1"];
const per = {}; refs.forEach(r => per[r[0]] = (per[r[0]] || 0) + 1);
console.log("mock refs:", refs.length, "| PYQs:", refs.filter(r => r[1]).length, "| max per topic:", Math.max(...Object.values(per)), "| unique:", new Set(refs.map(r => r.join())).size);
A.go("mock-1");
const quiz = strip(A.app.innerHTML);
console.log("mock quiz palette cells:", (quiz.match(/data-action="goto"/g) || []).length, "| hides PYQ labels:", !quiz.includes('class="srcline"'));
st = JSON.parse(saved);
const keys = refs.map(r => (r[1] ? T[r[0]].pyq : T[r[0]].qs)[r[2]].k);
st.active["mock-1"].answers = keys.map((k, j) => j < 18 ? k : j < 22 ? (k + 1) % 4 : null);
saved = JSON.stringify(st);
A = boot(P, "mock-1"); A.click("confirm-submit");
const res = strip(A.app.innerHTML);
console.log("mock result marks shown:", /36<small>\/50/.test(res), "| topic-wise:", res.includes("Topic-wise result"), "| share:", res.includes('data-action="share"'), "| report link:", res.includes('href="#report"'), "| ad:", res.includes("adbox") || res.includes("Join"));
A.go("number-system-quiz-1");
st = JSON.parse(saved); const nk = T[0].qs.slice(0, 10).map(x => x.k);
st.active["number-system-quiz-1"].answers = nk.map((k, j) => j < 3 ? k : (k + 1) % 4); saved = JSON.stringify(st);
A = boot(P, "number-system-quiz-1"); A.click("confirm-submit");
A.go("report"); const rep = strip(A.app.innerHTML);
console.log("report rows:", (rep.match(/class="bar"/g) || []).length, "| weak list has Number System:", /Revise these first[\s\S]*Number System/.test(rep), "| CTA names topic:", rep.includes("I%20need%20help%20with") || rep.includes("need help with"));
const bad = ["undefined", "NaN", "[object"].filter(x => (res + rep + quiz + prac).includes(x));
console.log("bad tokens:", bad);
const sw = fs.readFileSync("site_pkg/sw.js", "utf8"); const core = JSON.parse(sw.match(/const CORE = (\[.*?\]);/)[1]);
console.log("sw precache files exist:", core.filter(f => f !== "./").every(f => fs.existsSync("site_pkg/" + f)), "(", core.length, "entries )");
