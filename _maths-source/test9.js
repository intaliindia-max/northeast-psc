// Tests run as a student who has already filled the one-time name and WhatsApp screen.
const withLead = function (v) { const o = v ? JSON.parse(v) : {}; if (!o.lead) o.lead = { name: "Test", phone: "9876543210", at: 1 }; return JSON.stringify(o); };
const fs = require("fs");
function load(p) { const h = fs.readFileSync(p, "utf8"); return { dataTxt: h.split('<script type="application/json" id="quiz-data">')[1].split("</script>")[0], script: h.split("<script>\n")[1].split("</script>")[0] }; }
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
const day = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
for (const [label, path] of [["website", "site_pkg/index.html"], ["single file", "dist/apssb-basic-maths-practice.html"]]) {
  const P = load(path), D = JSON.parse(P.dataTxt), T = D.topics, slug = s => T.findIndex(t => t.slug === s);
  const out = [];
  // 1. question of the day and streaks
  saved = null; let A = boot(P, "today"); const q1 = strip(A.app.innerHTML);
  A.click("qotd", { "data-i": "0" }); let st = JSON.parse(saved), today = day(new Date());
  const afterAnswer = strip(A.app.innerHTML);
  const y = new Date(); y.setDate(y.getDate() - 1);
  st.qotd = { days: { [day(y)]: 1 }, streak: 4, best: 4, last: day(y) }; saved = JSON.stringify(st);
  A = boot(P, "today"); A.click("qotd", { "data-i": "1" }); st = JSON.parse(saved);
  out.push("qotd: page " + q1.includes('data-action="qotd"') + ", answered " + (JSON.parse(saved).qotd.days[today] === 1) + ", result shown " + afterAnswer.includes('class="qres') + ", streak continues to " + st.qotd.streak + " (best " + st.qotd.best + ")");
  // 2. mistakes and revision
  saved = null; A = boot(P, "r-calendar-quiz-1"); st = JSON.parse(saved);
  const cal = T[slug("r-calendar")];
  st.active["r-calendar-quiz-1"].answers = cal.qs.slice(0, 10).map(q => (q.k + 1) % q.o.length); saved = JSON.stringify(st);
  A = boot(P, "r-calendar-quiz-1"); A.click("confirm-submit"); st = JSON.parse(saved);
  const nMist = Object.keys(st.mistakes).length;
  A.go("mistakes"); const mv = strip(A.app.innerHTML);
  A.click("newrev", { "data-subject": "reasoning" }); st = JSON.parse(saved); const rid = "rev-" + st.revCount, rrefs = st.revRefs[rid];
  A.go(rid); st = JSON.parse(saved);
  st.active[rid].answers = rrefs.map(r => (r[1] ? T[r[0]].pyq : T[r[0]].qs)[r[2]].k); saved = JSON.stringify(st);
  A = boot(P, rid); A.click("confirm-submit"); st = JSON.parse(saved); const rres = strip(A.app.innerHTML);
  out.push("mistakes: " + nMist + " noted, page offers " + /Revise Reasoning mistakes \(10\)/.test(mv) + ", revision set " + rrefs.length + " questions, left after fixing " + Object.keys(st.mistakes).length + ", result " + rres.includes("Your Reasoning mistakes"));
  // 3. a Reasoning PYQ answered wrong, then right in the book quiz, uses one key
  saved = null; A = boot(P, "r-classification-pyq-1"); st = JSON.parse(saved);
  const cl = T[slug("r-classification")], p0 = cl.pyq[0];
  st.active["r-classification-pyq-1"].answers = cl.pyq.slice(0, 10).map((q, j) => j === 0 ? (q.k + 1) % q.o.length : q.k); saved = JSON.stringify(st);
  A = boot(P, "r-classification-pyq-1"); A.click("confirm-submit"); st = JSON.parse(saved); const k1 = Object.keys(st.mistakes);
  const bq = Math.floor(p0.ri / 10) + 1, bid = "r-classification-quiz-" + bq;
  A.go(bid); st = JSON.parse(saved); st.active[bid].answers = cl.qs.slice((bq - 1) * 10, bq * 10).map(q => q.k); saved = JSON.stringify(st);
  A = boot(P, bid); A.click("confirm-submit"); st = JSON.parse(saved);
  out.push("shared key: " + JSON.stringify(k1) + " cleared by the book quiz " + (Object.keys(st.mistakes).length === 0));
  // 4. earlier progress (before this update) becomes mistakes once
  saved = JSON.stringify({ progress: { "fractions-quiz-1": { best: 0, last: 0, attempts: 1, lastAnswers: T[slug("fractions")].qs.slice(0, 10).map(q => (q.k + 1) % 4), lastTime: 1000 } }, active: {} });
  A = boot(P, "practice"); st = JSON.parse(saved);
  out.push("migration: " + Object.keys(st.mistakes).length + " mistakes from an older attempt, tools " + (strip(A.app.innerHTML).match(/class="toolcard"/g) || []).length);
  // 5. previous year papers
  saved = null; A = boot(P, "mock"); const mk = strip(A.app.innerHTML);
  const papers = (mk.match(/href="#paper-[a-z0-9-]+"/g) || []).map(s => s.slice(13, -1));
  A.go("paper-apssb-chsl-2024"); st = JSON.parse(saved); const pa = st.active["paper-apssb-chsl-2024"];
  const pq = T.filter(t => t.subject === "reasoning").flatMap(t => t.pyq.filter(q => /^APSSB CHSL 2024/.test(q.y)));
  pa.answers = pq.map(q => q.k); saved = JSON.stringify(st);
  A = boot(P, "paper-apssb-chsl-2024"); A.click("confirm-submit"); const pr = strip(A.app.innerHTML);
  out.push("papers: " + papers.length + " listed (" + papers.slice(0, 3).join(", ") + " …), CHSL 2024 has " + pa.answers.length + " questions, full marks " + /48<small>\/48/.test(pr) + ", label " + pr.includes("APSSB CHSL 2024 Reasoning paper"));
  const bad = ["undefined", "NaN", "[object"].filter(x => (q1 + afterAnswer + mv + rres + mk + pr).includes(x));
  console.log(label + "\n  " + out.join("\n  ") + "\n  bad tokens: " + JSON.stringify(bad));
}
