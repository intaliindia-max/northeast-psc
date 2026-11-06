import json, re, html, math
from fractions import Fraction as F
from math import gcd
src = open("build.py").read().split("data = json.dumps")[0]
exec(src)                                   # builds `topics`, `IMAGES`, `to_html` for the book quizzes
from pyq_data import PYQ, CHECK
from pyq_data2 import PYQ2, CHECK2
from pyq_data3 import PYQ3, CHECK3, IMG3, ALLOW_DUP
from pyq_data4 import PYQ4, CHECK4, IMG4
IMG3 = dict(IMG3); IMG3.update(IMG4)
CHECKS = dict(CHECK); CHECKS.update(CHECK2); CHECKS.update(CHECK3); CHECKS.update(CHECK4)
def lcm(*a):
    r = 1
    for x in a: r = r * x // gcd(r, x)
    return r
def isprime(n): return n > 1 and all(n % d for d in range(2, int(n ** 0.5) + 1))
def expsum(n):
    s = 0
    for p in (2, 3, 5):
        while n % p == 0: n //= p; s += 1
    assert n == 1
    return s
def median(v):
    v = sorted(v); n = len(v)
    return F(v[n // 2]) if n % 2 else F(v[n // 2 - 1] + v[n // 2], 2)
from PIL import Image as _Im
for _name, (_path, _alt) in IMG3.items():
    _im = _Im.open(_path)
    if _im.width > 560: _im = _im.resize((560, round(_im.height * 560 / _im.width)))
    _tmp = "/tmp/" + _name + ".png"; _im.save(_tmp)
    IMAGES[_name] = img_uri(_tmp, _alt)
def ph(s):
    s = html.escape(s, quote=False)
    s = s.replace("[o]", '<span class="ovl">').replace("[/o]", "</span>")
    s = re.sub(r"\^\{([^{}]+)\}", r"<sup>\1</sup>", s)
    return re.sub(r"_\{([^{}]+)\}", r"<sub>\1</sub>", s)
def oval(o):
    t = o.replace(",", "").replace("−", "-").replace("Rs.", "").replace("₹", "").strip()
    t = re.sub(r"[\^_]\{[^}]*\}", "", t)
    m = re.match(r"(-?\d+(?:\.\d+)?)(?:\s+(\d+)/(\d+)|/(\d+))?(?=\s|%|°|$|[a-zA-Z])", t)
    if not m or re.search(r"[×√^]", t): return None
    v = F(m.group(1))
    if m.group(2): v += F(int(m.group(2)), int(m.group(3)))
    if m.group(4): v /= int(m.group(4))
    return v
env = {"F": F, "gcd": gcd, "lcm": lcm, "isprime": isprime, "expsum": expsum, "math": math, "median": median}
problems = []; checked = 0; by_topic = {}; seen = set()
for row in list(PYQ) + list(PYQ2) + list(PYQ3) + list(PYQ4):
    topic, no, q, opts, ans, steps = row[:6]
    ex = row[6] if len(row) > 6 else None
    tag = ex if isinstance(ex, str) else (ex or {}).get("tag")
    extra = ex if isinstance(ex, dict) else {}
    assert no not in seen, ("duplicate PYQ number", no); seen.add(no)
    k = "ABCD".index(ans)
    if len(opts) != 4 or (len(set(opts)) != 4 and no not in ALLOW_DUP) or not steps or not q: problems.append(("shape", no))
    if no in CHECKS:
        v = eval(CHECKS[no], env); ov = oval(opts[k]); checked += 1
        if ov is None or abs(float(ov) - float(v)) > max(0.01, 1e-9 * abs(float(v))):
            problems.append(("check", no, float(v), opts[k]))
        else:
            dup = [opts[i] for i in range(4) if i != k and opts[i] != opts[k] and oval(opts[i]) is not None and abs(float(oval(opts[i])) - float(v)) < 1e-9]
            if dup: problems.append(("another option has the same value", no, dup))
    d = {"t": ph(q), "o": [ph(o) for o in opts], "k": k, "s": [ph(s) for s in steps], "c": None, "y": (tag + " PYQ") if tag else "APSSB PYQ"}
    if extra.get("img"):
        assert extra["img"] in IMAGES, ("missing image", no); d["img"] = extra["img"]; d["ip"] = extra.get("ip", "after")
    if extra.get("pre"): d["pre"] = ph(extra["pre"])
    by_topic.setdefault(topic, []).append((no, d))
for t in topics:
    if t["slug"] in by_topic: t["pyq"] = [d for _, d in sorted(by_topic[t["slug"]], key=lambda x: x[0])]
print("PYQs per topic:", {k: len(v) for k, v in by_topic.items()}, "| total", sum(len(v) for v in by_topic.values()))
print("numeric checks run:", checked, "| problems:", problems)
data = json.dumps({"topics": topics, "images": IMAGES}, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
tpl = open("template.html").read()
head, rest = tpl.split("<script>\n(function () {", 1)
tail = rest.split("})();\n</script>", 1)[1]
css = """.ovl { text-decoration: overline; }
.setname { font-size: 19px; margin: 24px 0 2px; }
.setnote { margin: 0; color: var(--ink-soft); font-size: 15px; }
.setname + .setnote + .quizzes { margin-top: 12px; }
.pyqtag { color: var(--drop); font-weight: 700; }
.srcline { margin: 0 0 8px; font-size: 13px; font-weight: 700; color: var(--drop); }
</style>"""
head = head.replace("</style>", css, 1)
out = head.replace("__DATA__", data) + "<script>\n" + open("app2.js").read() + "</script>" + tail
open("/mnt/user-data/outputs/apssb-basic-maths-practice.html", "w").write(out)
open("/mnt/user-data/outputs/Maths Practice by Amarjeet Sir.html", "w").write(out)
print("file KB", round(len(out.encode()) / 1024), "| Claude mentions:", out.count("Claude"), "| title ok:", "<title>Maths Practice by Amarjeet Sir</title>" in out)
