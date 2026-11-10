const fs = require("fs");
const html = fs.readFileSync("dist/apssb-basic-maths-practice.html", "utf8");
const dataTxt = html.split('<script type="application/json" id="quiz-data">')[1].split("</script>")[0];
const script = html.split("<script>\n")[1].split("</script>")[0];
fs.writeFileSync("/tmp/app2_check.js", script);
const DATA = JSON.parse(dataTxt);
function run(hash, seed) {
  const store = {}; if (seed) store["apssb-basic-maths-v1"] = JSON.stringify(seed);
  const app = { innerHTML: "", querySelector() { return null; } };
  const timer = { hidden: true, textContent: "" };
  global.document = { getElementById(id) { if (id === "app") return app; if (id === "timer") return timer; if (id === "quiz-data") return { textContent: dataTxt }; return null; },
    addEventListener() {}, body: { setAttribute(k, v) { this[k] = v; }, insertAdjacentHTML() {} }, querySelector() { return null; }, contains() { return false; }, activeElement: null };
  global.window = { scrollTo() {}, addEventListener() {} };
  global.location = { hash: hash };
  global.localStorage = { getItem(k) { return k in store ? store[k] : null; }, setItem(k, v) { store[k] = v; } };
  global.setInterval = () => 0;
  eval(script);
  return { out: app.innerHTML, timer, store, screen: global.document.body["data-screen"] };
}
const bad = (s) => { const t = s.replace(/data:image\/[a-z]+;base64,[A-Za-z0-9+\/=]+/g, ""); return ["undefined", "NaN", "[object", "null<"].filter(x => t.includes(x) && !t.includes("It becomes undefined")); };
let r = run("", null); console.log("HOME", r.screen, bad(r.out), (r.out.match(/APSSB PYQs/g) || []).length, "topics show PYQs");
r = run("#fractions", null); console.log("TOPIC fractions", bad(r.out), (r.out.match(/class="qcard"/g) || []).length, "cards");
r = run("#geometry", null); console.log("TOPIC geometry (no PYQ yet)", bad(r.out), (r.out.match(/class="qcard"/g) || []).length, "cards");
let problems = 0, screens = 0;
for (const t of DATA.topics) {
  const sets = [["quiz", Math.ceil(t.qs.length / 10), t.qs]]; if (t.pyq) sets.push(["pyq", Math.ceil(t.pyq.length / 10), t.pyq]);
  for (const [kind, n, src] of sets) for (let k = 1; k <= n; k++) {
    const id = `${t.slug}-${kind}-${k}`, qs = src.slice((k - 1) * 10, k * 10);
    const answers = qs.map((q, j) => j % 4 === 3 ? null : (j % 3 === 0 ? (q.k + 1) % 4 : q.k));
    const rr = run("#" + id, { progress: { [id]: { best: 1, last: 1, attempts: 1, lastAnswers: answers, lastTime: 5000, lastAt: 1 } }, active: {} }); screens++;
    if (bad(rr.out).length || (rr.out.match(/class="ritem"/g) || []).length !== qs.length) { problems++; console.log("RESULT PROBLEM", id, bad(rr.out)); }
    for (let j = 0; j < qs.length; j++) {
      const rq = run("#" + id, { progress: {}, active: { [id]: { answers: new Array(qs.length).fill(null), index: j, elapsed: 0 } } }); screens++;
      if (bad(rq.out).length || (rq.out.match(/class="opt"/g) || []).length !== qs[j].o.length) { problems++; console.log("QUIZ PROBLEM", id, j, bad(rq.out)); }
    }
  }
}
console.log("screens rendered:", screens, "problems:", problems);
r = run("#number-system-pyq-8", null); console.log("NS PYQ quiz 8 palette cells:", (r.out.match(/class="cell/g) || []).length, "| active length:", JSON.parse(r.store["apssb-basic-maths-v1"]).active["number-system-pyq-8"].answers.length);
r = run("#decimal-pyq-2", { progress: { "decimal-pyq-2": { best: 7, last: 7, attempts: 1, lastAnswers: [0,0,0,0,0,0,0], lastTime: 1, lastAt: 1 } }, active: {} });
console.log("Decimal PYQ 2 result next button:", (r.out.match(/btn primary block" href="([^"]+)">([^<]+)/) || []).slice(1).join(" -> "), "| overline present:", DATA.topics.find(t => t.slug === "decimal").pyq.some(q => q.t.includes('class="ovl"')));
r = run("#fractions-quiz-10", { progress: { "fractions-quiz-10": { best: 7, last: 7, attempts: 1, lastAnswers: new Array(10).fill(0), lastTime: 1, lastAt: 1 } }, active: {} });
console.log("Fractions book quiz 10 next:", (r.out.match(/btn primary block" href="([^"]+)">([^<]+)/) || []).slice(1).join(" -> "));
r = run("#fractions-pyq-9", null); console.log("out-of-range PYQ quiz falls back to:", r.screen);
r = run("", null); console.log("LANDING", r.screen, bad(r.out), "| sections:", ["selections","batches","reviews","about","classroom","message","books","contact"].filter(id => r.out.includes('id="' + id + '"')).length, "| posters:", (r.out.match(/class="poster"/g) || []).length, "| sub:", (r.out.match(/<p class="sub">([^<]+)/) || [])[1]);
r = run("#practice", null); console.log("PRACTICE", r.screen, bad(r.out), (r.out.match(/class="topic"/g) || []).length, "topics");
r = run("#about", null); console.log("ABOUT route ->", r.screen);
r = run("#geometry-pyq-1", { progress: { "geometry-pyq-1": { best: 5, last: 5, attempts: 1, lastAnswers: new Array(10).fill(0), lastTime: 1000, lastAt: 1 } }, active: {} });
console.log("RESULT has ad:", r.out.includes('class="sheet adbox"'), "| ad before answer key:", r.out.indexOf("adbox") < r.out.indexOf("Answer key"), "| WhatsApp link:", (r.out.match(/https:\/\/wa\.me\/[0-9]+\?text=[^"]+/) || [""])[0].slice(0, 60));
