const fs = require("fs");
const h = fs.readFileSync("site_pkg/index.html", "utf8");
const P = { dataTxt: h.split('<script type="application/json" id="quiz-data">')[1].split("</script>")[0], script: h.split("<script>\n")[1].split("</script>")[0] };
function run(hash) {
  const app = { innerHTML: "", querySelector() { return null; } }, timer = { hidden: true, textContent: "" };
  global.document = { getElementById(id) { return id === "app" ? app : id === "timer" ? timer : id === "quiz-data" ? { textContent: P.dataTxt } : null; }, addEventListener() {}, body: { setAttribute() {}, insertAdjacentHTML() {} }, querySelector() { return null; }, contains() { return false; } };
  global.window = { scrollTo() {}, addEventListener() {} }; global.location = { hash, href: "https://x/", protocol: "https:" }; global.setInterval = () => 0;
  global.localStorage = { getItem() { return null; }, setItem() {} };
  eval(P.script); return app.innerHTML.replace(/data:image\/[a-z]+;base64,[A-Za-z0-9+\/=]+/g, "");
}
for (const s of ["percentage", "ratio-proportion", "time-work", "time-speed-distance", "number-system", "statistics"]) {
  const out = run(s), m = out.match(/<p class="setvideo">[\s\S]*?<\/p>/);
  console.log(s.padEnd(20), m ? (m[0].match(/<a /g) || []).length + " link(s)" + (m[0].includes("d6wZAcfvqlU") ? " incl. new class" : "") : "no video link");
}
const home = run("");
console.log("free classes has new card:", home.includes("More PYQ classes") && home.includes("d6wZAcfvqlU"));
