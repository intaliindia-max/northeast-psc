const fs = require("fs");
function load(p) { const h = fs.readFileSync(p, "utf8"); return { dataTxt: h.split('<script type="application/json" id="quiz-data">')[1].split("</script>")[0], script: h.split("<script>\n")[1].split("</script>")[0] }; }
let saved = null, opened = [], nameVal = "";
function boot(P, hash) {
  const docH = {}, winH = {}, app = { innerHTML: "", querySelector() { return null; } }, timer = { hidden: true, textContent: "" };
  const inp = { get value() { return nameVal; }, setAttribute() {}, focus() {} };
  global.document = { getElementById(id) { return id === "app" ? app : id === "timer" ? timer : id === "quiz-data" ? { textContent: P.dataTxt } : id === "stname" ? inp : id === "stname-err" ? {} : null; },
    addEventListener(t, f) { docH[t] = f; }, body: { setAttribute() {}, insertAdjacentHTML() {} }, querySelector() { return null; }, querySelectorAll() { return []; }, contains() { return false; }, activeElement: null };
  global.window = { scrollTo() {}, addEventListener(t, f) { winH[t] = f; }, open(u) { opened.push(u); } };
  global.location = { hash, href: "https://example.org/x/#" + hash, protocol: "https:" }; global.setInterval = () => 0;
  global.localStorage = { getItem() { return saved; }, setItem(k, v) { saved = v; } };
  eval(P.script);
  const click = (action, attrs) => { const el = { getAttribute(a) { return a === "data-action" ? action : (attrs || {})[a] ?? null; } };
    docH.click({ target: { classList: { contains() { return false; } }, closest(s) { return s.includes("data-action") ? el : null; } }, preventDefault() {} }); };
  const go = h => { location.hash = h; winH.hashchange(); };
  return { app, click, go };
}
const strip = s => s.replace(/data:image\/[a-z]+;base64,[A-Za-z0-9+\/=]+/g, "");
const wa = html => decodeURIComponent((html.match(/https:\/\/wa\.me\/\d+\?text=([^"]+)"/) || [, ""])[1]);
const P = load("site_pkg/index.html"), D = JSON.parse(P.dataTxt), T = D.topics, ix = s => T.findIndex(t => t.slug === s);
function finishQuiz(id, answersFn) {
  let A = boot(P, id); const st = JSON.parse(saved); st.active[id].answers = answersFn(st.active[id].answers.length); saved = JSON.stringify(st);
  A = boot(P, id); A.click("confirm-submit"); return strip(A.app.innerHTML);
}
const out = [];
// 1. score-based offers
saved = null;
const pc = T[ix("percentage")].qs;
let r = finishQuiz("percentage-quiz-1", n => pc.slice(0, n).map((q, j) => j < 2 ? q.k : (q.k + 1) % 4));
out.push("low score: " + r.includes("Need help with Percentage?") + " | msg: " + wa(r.split('class="sheet adbox"')[1]).slice(0, 110) + " | only-Maths link " + r.includes("Only Maths?"));
r = finishQuiz("percentage-quiz-2", n => pc.slice(10, 10 + n).map((q, j) => j < 7 ? q.k : (q.k + 1) % 4));
out.push("mid score: " + r.includes("Good work. Now make it a sure score"));
const rc = T[ix("r-calendar")].qs;
r = finishQuiz("r-calendar-quiz-1", n => rc.slice(0, n).map(q => q.k));
out.push("full marks, Reasoning: " + r.includes("Excellent! You are exam-ready") + " | only-Reasoning link " + r.includes("Only Reasoning?") + " | proof " + r.includes("1,000+ selections"));
// 2. milestones: 5th quiz shows the card once, then the first mock test
finishQuiz("percentage-quiz-3", n => pc.slice(20, 20 + n).map(q => q.k));
r = finishQuiz("percentage-quiz-4", n => pc.slice(30, 30 + n).map(q => q.k));
const card5 = r.includes("5 quizzes done!");
r = finishQuiz("percentage-quiz-5", n => pc.slice(40, 40 + n).map(q => q.k));
const again = r.includes("quizzes done!");
let A = boot(P, "mock"); A.click("newmock", { "data-subject": "maths" }); let st = JSON.parse(saved); const mid = "mock-" + st.mockCount;
A.go(mid); r = finishQuiz(mid, n => new Array(n).fill(0));
out.push("milestones: 5 quizzes card " + card5 + ", not repeated " + !again + ", first test card " + r.includes("Your first test is done!") + ", WhatsApp offer " + /I have taken my first mock test/.test(wa(r.split('class="sheet milestone"')[1] || "")));
// 3. report to Sir
A = boot(P, "report"); const rp = strip(A.app.innerHTML);
nameVal = ""; opened = []; A.click("sendreport"); const blocked = opened.length === 0;
nameVal = "Ravi Tayeng"; A.click("sendreport");
const txt = decodeURIComponent((opened[0] || "").split("text=")[1] || "");
out.push("report: form " + rp.includes('id="stname"') + ", needs a name " + blocked + ", sent " + (opened.length === 1) + " | " + txt.split("\n").slice(0, 4).join(" / ").slice(0, 230));
out.push("name remembered: " + (JSON.parse(saved).profile.name === "Ravi Tayeng"));
// 4. batch finder
const pick = (A, k, v) => A.click("finder", { "data-k": k, "data-v": v });
A = boot(P, "finder"); const f0 = strip(A.app.innerHTML);
pick(A, "exam", "appsc"); pick(A, "mode", "online"); pick(A, "need", "both"); const f1 = strip(A.app.innerHTML);
pick(A, "exam", "cgl"); pick(A, "need", "reasoning"); const f2 = strip(A.app.innerHTML);
pick(A, "need", "all"); pick(A, "mode", "offline"); const f3 = strip(A.app.innerHTML);
pick(A, "need", "both"); const f4 = strip(A.app.innerHTML);
const nm = h => (h.match(/<section class="frec"[^>]*><p class="mstag">Best batch for you<\/p><h2>([^<]+)</) || [, "none"])[1];
out.push("finder: questions " + (f0.match(/<fieldset/g) || []).length + " | APPSC → " + nm(f1) + " | CGL+online+Reasoning → " + nm(f2) + " | all+offline → " + nm(f3) + " | both+offline → " + nm(f4));
out.push("finder message: " + wa(f2.split('class="frec"')[1]).slice(0, 150));
const bad = ["undefined", "NaN", "[object"].filter(x => (r + rp + f0 + f1 + f2 + f3 + f4).includes(x));
console.log(out.join("\n") + "\nbad tokens: " + JSON.stringify(bad));
