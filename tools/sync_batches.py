#!/usr/bin/env python3
"""Rebuild the Batches section of the home page (index.html) from the batch lists of the two practice sites.

Run from anywhere:  python3 tools/sync_batches.py
It reads the batch details inside maths-by-amarjeet-sir/index.html and csat-practice-by-amarjeet-sir/index.html,
combines them (one entry per batch), saves posters that are stored inside a page to batch-posters/, and rewrites
the block between /*BATCHES:START*/ and /*BATCHES:END*/ in index.html. _maths-source/publish.py runs it after every publish.
"""
import base64, html, json, os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITES = [  # folder, default exam, keys in display order ("courses" is a list)
    ("maths-by-amarjeet-sir", "APSSB", ["resultAd", "featured", "courses"]),
    ("csat-practice-by-amarjeet-sir", "APPSC", ["csat", "gsrec", "recorded", "testSeries"]),
]
TOWNS = ["Itanagar", "Naharlagun", "Nirjuli", "Pasighat"]

def site_of(folder):
    s = open(os.path.join(ROOT, folder, "index.html"), encoding="utf-8").read()
    return json.loads(re.search(r'<script type="application/json" id="quiz-data">(.*?)</script>', s, re.S).group(1))["site"]
def plain(x): return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", html.unescape(str(x or "")))).strip()
def norm(t):
    t = re.sub(r"by amarjeet sir.*$", "", plain(t).lower()); t = re.sub(r"[^a-z0-9 ]", " ", t).replace("batches", "batch")
    return " ".join(w for w in t.split() if w not in ("the", "apssb", "appscce", "appsc", "ce", "latest", "2026", "exclusive"))
def rupee(v): return "₹" + v if v and not v.startswith("₹") else (v or "")

def entry(folder, default_exam, key, o, site):
    name = plain(o.get("name")); alt = plain(o.get("alt")); tag = plain(o.get("tag")); pts = [plain(p) for p in o.get("points", [])]
    title = re.sub(r",?\s*₹[\d,]+\s*$", "", name).strip()
    head = " ".join([name, tag] + pts)
    fee = rupee(o.get("price", ""))
    if not fee and o.get("feeText"): fee = re.sub(r"^Fee\s+", "", plain(o["feeText"]))
    if not fee:
        m = re.search(r"₹[\d,]+", name) or re.search(r"(?:[Ff]ee|is|now)\s+(₹[\d,]+)", alt)
        fee = (m.group(1) if m and m.groups() else m.group(0)) if m else ""
    was = rupee(o.get("was", ""))
    if not was:
        m = re.search(r"(?:instead of|down from)\s+(₹[\d,]+)", alt); was = m.group(1) if m else ""
    fee, was = fee.rstrip(","), was.rstrip(",")
    modes = []
    if re.search(r"test series", name, re.I): modes.append("Test series")
    if re.search(r"recorded", name + " " + tag, re.I): modes.append("Recorded")
    if re.search(r"offline", head, re.I) or re.search(r"offline (?:batch|and online)", alt, re.I): modes.append("Offline")
    if re.search(r"online|live class", head, re.I) or (not modes and re.search(r"online", alt, re.I)): modes.append("Online")
    if "Recorded" in modes and "Online" in modes and not re.search(r"live", head, re.I): modes.remove("Online")
    if not modes: modes = ["Online"]
    exam = "APPSC" if re.search(r"APPSC|CSAT", name + " " + tag) else ("APSSB" if re.search(r"APSSB", name + " " + tag + " " + alt) else default_exam)
    towns = [t for t in TOWNS if t in alt] if "Offline" in modes else []
    where = ", ".join(towns) if towns else ("Offline and online" if set(modes) >= {"Offline", "Online"} else ("Offline" if "Offline" in modes else "Online"))
    if towns and "Online" in modes: where += " and online"
    img = site.get("img", {}).get(o.get("img"), {})
    src = img.get("src", "") if not o.get("exams") else ""       # a poster whose date and countdown are written live is not reused here
    if src.startswith("data:"):
        m = re.match(r"data:image/(\w+);base64,(.*)", src, re.S); ext = "jpg" if m.group(1) in ("jpeg", "jpg") else m.group(1)
        os.makedirs(os.path.join(ROOT, "batch-posters"), exist_ok=True); rel = "batch-posters/%s.%s" % (re.sub(r"[^a-z0-9]+", "-", (o.get("img") or key).lower()), ext)
        data = base64.b64decode(m.group(2)); path = os.path.join(ROOT, rel)
        if not os.path.exists(path) or open(path, "rb").read() != data: open(path, "wb").write(data)
        src = rel
    elif src: src = folder + "/" + src
    calls = o.get("calls") or []
    call = o.get("call") or (calls[0][1] if calls else site.get("phone", ""))
    show = o.get("callShow") or (calls[0][0] if calls else site.get("phoneShow", call))
    return {"exam": exam, "title": title, "sub": tag or plain(o.get("note")) or ("Recorded classes" if modes == ["Recorded"] else ""), "modes": modes, "fee": fee, "was": was,
            "note": plain(o.get("note")) if tag else "", "where": where, "covers": pts, "desc": alt, "img": src, "w": img.get("w", 0) if src else 0, "h": img.get("h", 0) if src else 0,
            "wa": site.get("wa", ""), "msg": plain(o.get("msg")) or "Hello, I want to join: " + title + ".", "call": call, "callShow": show, "from": folder}

def collect():
    out, seen = [], set()
    def add(e):
        k = norm(e["title"])
        if k and k not in seen: seen.add(k); out.append(e)
    sites = [(f, d, keys, site_of(f)) for f, d, keys in SITES]
    for folder, dexam, keys, site in sites:
        for key in keys:
            v = site.get(key)
            for o in (v if isinstance(v, list) else [v] if v else []): add(entry(folder, dexam, key, o, site))
    for folder, dexam, keys, site in sites:                     # any batch added later under a new name is picked up too
        for key, v in site.items():
            if key not in keys and isinstance(v, dict) and v.get("name") and v.get("msg") and v.get("img"): add(entry(folder, dexam, key, v, site))
    out.sort(key=lambda e: 0 if e["exam"] == "APPSC" else 1)
    return out

def main():
    batches = collect()
    used = {e["img"] for e in batches}; pd = os.path.join(ROOT, "batch-posters")
    for f in (os.listdir(pd) if os.path.isdir(pd) else []):
        if "batch-posters/" + f not in used: os.remove(os.path.join(pd, f))      # poster of a batch that is no longer listed
    p = os.path.join(ROOT, "index.html"); s = open(p, encoding="utf-8").read()
    a, b = s.find("/*BATCHES:START*/"), s.find("/*BATCHES:END*/")
    if a < 0 or b < 0: sys.exit("index.html has no BATCHES markers")
    block = "/*BATCHES:START*/\n  var BATCHES=" + json.dumps(batches, ensure_ascii=False, indent=1).replace("\n", "\n  ").replace("</", "<\\/") + ";\n  "
    new = s[:a] + block + s[b:]
    if new != s: open(p, "w", encoding="utf-8").write(new)
    print("home page batches:", len(batches), "| changed:", new != s)
    for e in batches: print("  %-6s %-52s %-28s %s" % (e["exam"], e["title"][:52], (e["fee"] + (" (was " + e["was"] + ")" if e["was"] else ""))[:28], "/".join(e["modes"])))
if __name__ == "__main__": main()
