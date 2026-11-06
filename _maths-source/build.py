import json, re, html, base64, io
from PIL import Image
Q = json.load(open("questions.json")); S = json.load(open("solutions.json"))
CHAP = {"number-system": "Chapter 1", "simplification": "Chapter 2", "fractions": "Chapter 3", "power-exponents": "Chapter 4",
        "series-average": "Chapter 5", "decimal": "Chapter 6", "lcm-hcf": "Chapter 7", "percentage": "Chapter 8", "profit-loss": "Chapter 9",
        "ratio-proportion": "Chapter 10", "simple-interest": "Chapter 11, Part A", "compound-interest": "Chapter 11, Part B",
        "time-work": "Chapter 12", "time-speed-distance": "Chapter 13", "geometry": "Chapter 14, Part A", "mensuration": "Chapter 14, Part B",
        "statistics": "Chapter 15"}
EXCL = set("""left right up down convert converted converting rounded round rounding correct add added adding equal equals equated equate raised raise
applies apply applied closest close nearest reduced reduce reduces from belongs belong corresponds compared compare proportional due according
and or is are was were ratio increased decreased increases decreases rises rose falls fell changes changed grows grew set refers relates related
similar opposite parallel perpendicular adjacent next prior back way how going goes went come comes came order""".split())
stats = {"arrows": 0, "breaks": 0, "caret": 0}
def arrowize(s):
    def rep(m):
        prev = m.group(1)
        pw = re.sub(r"<[^>]+>", "", prev).lower().strip(",.;:()")
        if pw in EXCL or re.fullmatch(r"[\d.,/%]+", pw) or not pw:
            return m.group(0)
        stats["arrows"] += 1
        return prev + " → "
    return re.sub(r"(\S+) to (?=[\d(√−]|-\d)", rep, s)
def to_html(s, solution=False):
    s = s.replace("\u00a0", " ")
    s = re.sub(r"(?<=[A-Za-z0-9])-\n(?=[A-Za-z0-9])", "-", s)
    n0 = s.count("\n")
    s = re.sub(r"\n(?=(?:I{1,3}|IV|V)\.\s|\((?:i{1,3}|iv|v)\)\s|Statement\b|Assertion\b|Reason\b)", "\x05", s)
    stats["breaks"] += n0 - s.count("\n")
    s = s.replace("\n", " ")
    s = re.sub(r"(?<=[A-Za-z0-9])- (?=[A-Za-z0-9])", "-", s)
    s = re.sub(r"[ \t]+", " ", s).strip()
    s = html.escape(s, quote=False)
    s = s.replace("\x01", "<sup>").replace("\x02", "</sup>").replace("\x03", "<sub>").replace("\x04", "</sub>").replace("\x05", "<br>")
    before = s
    s = re.sub(r"([A-Za-z0-9)\]])\^\(([^()<>]{1,24})\)", r"\1<sup>\2</sup>", s)
    s = re.sub(r"([A-Za-z0-9)\]])\^(-?[A-Za-z0-9.]{1,8})", r"\1<sup>\2</sup>", s)
    if s != before: stats["caret"] += 1
    s = re.sub(r"<sup>([^<]*?)x</sup>⁽", r"<sup>\1×</sup>⁽", s)
    s = re.sub(r"<sup>\s+", "<sup>", s); s = re.sub(r"\s+</sup>", "</sup>", s)
    s = s.replace("<sup></sup>", "")
    if solution: s = arrowize(s)
    return s
def img_uri(path, alt):
    im = Image.open(path).convert("L")
    w, h = im.size
    im = im.convert("P", palette=Image.ADAPTIVE, colors=16)
    buf = io.BytesIO(); im.save(buf, format="PNG", optimize=True)
    return {"src": "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode(), "alt": alt, "w": w, "h": h}
IMAGES = {
 "pie": img_uri("img/st-002.png", "Pie chart of monthly spending: Groceries 25%, Rent 30%, School fee 5%, Others 40%."),
 "hist-marks": img_uri("img/st-006.png", "Histogram of students by marks: 0–10: 6, 10–20: 4, 20–30: 10, 30–40: 8, 40–50: 9, 50–60: 8, 60–70: 16, 70–80: 7, 80–90: 2, 90–100: 1."),
 "hist-rain": img_uri("img/st-010.png", "Histogram of annual rainfall for 25 cities: 26–28 in: 3, 28–30 in: 2, 30–32 in: 4, 32–34 in: 6, 34–36 in: 7, 36–38 in: 3."),
}
PIE_PRE = "The chart below shows the percentage of the amount spent by a person in a month on various requirements. His income per month is Rs. 80,000."
topics = []
for slug, ch in Q.items():
    sols = S[slug]
    sections = [{"h": to_html(x["title"] or ""), "k": to_html(x["key"], True)} for x in sols["sections"]]
    titles = [x["title"] for x in sols["sections"]]
    qs = []
    for q in ch["questions"]:
        it = sols["items"][str(q["n"])]
        sec = titles.index(it["section"]) if it["section"] in titles else None
        d = {"t": to_html(q["text"]), "o": [to_html(o) for o in q["opts"]], "k": "ABCD".index(q["key"]),
             "s": [to_html(x, True) for x in it["steps"]], "c": sec, "b": q["n"]}
        if slug == "statistics" and q["n"] in (59, 60):
            d["pre"] = html.escape(PIE_PRE, quote=False); d["img"] = "pie"; d["ip"] = "before"
        if slug == "statistics" and q["n"] == 71: d["img"] = "hist-marks"; d["ip"] = "after"
        if slug == "statistics" and q["n"] == 75: d["img"] = "hist-rain"; d["ip"] = "after"
        assert all(d["o"]) and d["t"] and d["s"], (slug, q["n"])
        qs.append(d)
    topics.append({"slug": slug, "name": ch["name"], "chapter": CHAP[slug], "sections": sections, "qs": qs})
data = json.dumps({"topics": topics, "images": IMAGES}, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
tpl = open("template.html").read()
assert tpl.count("__DATA__") == 1
out = tpl.replace("__DATA__", data)
open("/mnt/user-data/outputs/apssb-basic-maths-practice.html", "w").write(out)
print("topics", len(topics), "questions", sum(len(t["qs"]) for t in topics), "| file KB", round(len(out.encode()) / 1024),
      "| images KB", round(sum(len(v["src"]) for v in IMAGES.values()) / 1024), "|", stats)
missing_sec = [(t["slug"], q["b"]) for t in topics for q in t["qs"] if q["c"] is None]
print("questions without a key-idea section:", len(missing_sec), missing_sec[:8])
# show a few converted samples
def find(slug, n): return next(t for t in topics if t["slug"] == slug)["qs"][n - 1]
for slug, n in [("power-exponents", 26), ("power-exponents", 25), ("number-system", 1), ("number-system", 27), ("statistics", 76), ("simplification", 84)]:
    q = find(slug, n); print(f"[{slug} {n}] T: {q['t']} | O: {q['o']} | S: {q['s']}")
leftover = [(t["slug"], q["b"]) for t in topics for q in t["qs"] for f in [q["t"]] + q["o"] + q["s"] if re.search(r"[\x00-\x08]|\^", f)]
print("fields still containing raw markers or carets:", leftover[:10], len(leftover))
