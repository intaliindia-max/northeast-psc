// Tests run as a student who has already filled the one-time name and WhatsApp screen.
const withLead = function (v) { const o = v ? JSON.parse(v) : {}; if (!o.lead) o.lead = { name: "Test", phone: "9876543210", at: 1 }; return JSON.stringify(o); };
const fs = require("fs");
function load(p) { const h = fs.readFileSync(p, "utf8"); return { h, dataTxt: h.split('<script type="application/json" id="quiz-data">')[1].split("</script>")[0], script: h.split("<script>\n")[1].split("</script>")[0] }; }
function run(P, hash) {
  const app = { innerHTML: "", querySelector() { return null; } }, timer = { hidden: true, textContent: "" }, store = {};
  global.document = { getElementById(id) { return id === "app" ? app : id === "timer" ? timer : id === "quiz-data" ? { textContent: P.dataTxt } : null; },
    addEventListener() {}, body: { setAttribute() {}, insertAdjacentHTML() {} }, querySelector() { return null; }, contains() { return false; }, activeElement: null };
  global.window = { scrollTo() {}, addEventListener() {} }; global.location = { hash }; global.setInterval = () => 0;
  global.localStorage = { getItem(k) { return withLead(store[k] || null); }, setItem(k, v) { store[k] = v; } };
  eval(P.script); return app.innerHTML;
}
const strip = s => s.replace(/data:image\/[a-z]+;base64,[A-Za-z0-9+\/=]+/g, "");
for (const [label, p] of [["inline", "dist/apssb-basic-maths-practice.html"], ["website", "site_pkg/index.html"]]) {
  const P = load(p), L = strip(run(P, ""));
  const ids = ["selections", "free-class", "marathons", "guidance", "batches", "reviews", "about", "classroom", "message", "books", "contact"].filter(id => L.includes('id="' + id + '"'));
  console.log(label, "| sections", ids.length, "| zoom", (L.match(/data-action="zoom"/g) || []).length, "| covers", (L.match(/class="cover"/g) || []).length,
    "| demos", (L.match(/class="vcard vsmall"/g) || []).length, "| iframe", L.includes("<iframe"), "| marathon card", L.includes('class="vcard" '),
    "| address", L.includes("Opposite Civil Secretariat"), "| app code", L.includes("yjkfbc"), "| footer logo", L.includes("footlogo"),
    "| topbar logo", P.h.includes('class="brandlogo"') && !P.h.includes("__LOGO__"), "| bad", ["undefined", "NaN", "[object"].filter(x => L.includes(x)));
  const T = run(P, "#number-system");
  console.log("   number-system PYQ video link:", /watch\?v=xsi4d5_ckMs&(amp;)?t=2568s/.test(T), "| ratio has link:", run(P, "#ratio-proportion").includes("setvideo"));
}
