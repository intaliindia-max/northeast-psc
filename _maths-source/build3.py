import json, base64, os, shutil, zipfile
os.makedirs("dist", exist_ok=True)
src = open("build2.py").read().split("\ndata = json.dumps")[0]
exec(src)
from PIL import Image
import html as _html
for _t in topics:
    _t.setdefault("pyq", []); _t.setdefault("subject", "maths")
import re as _re
_HEAD = _re.compile(r"^([A-Z][A-Z0-9 ,/=&()'’:+\-–.%]{3,}?)\s+\d{1,3}\.\s+(?=\S)")
for _t in topics:
    for _q in _t["qs"] + _t["pyq"]:
        _m = _HEAD.match(_q["t"])
        if _m and sum(c.isupper() for c in _m.group(1)) >= 4:
            _q["t"] = _q["t"][_m.end():]   # a section heading from the book slipped into the question
_R = json.load(open("reasoning_data.json", encoding="utf-8"))
RIMG = {}
def _esc(s): return _html.escape(s, quote=False)
for _ci, _ch in enumerate(_R["chapters"]):
    _secs = _ch["sections"]
    def _sec_of(n):
        for i, (_nm, lo, hi) in enumerate(_secs):
            if lo <= n <= hi: return i
        return None
    _qs, _pyq = [], []
    for _q in _ch["qs"]:
        _d = {"t": _esc(_q["q"]), "o": [_esc(o) for o in _q["o"]], "k": _q["k"], "s": [_esc(_q["s"])], "c": _sec_of(_q["n"]), "b": _q["n"]}
        if _q["y"]: _d["y"] = _esc(_q["y"]) + " PYQ"
        if _q["img"]:
            _d["img"] = _q["img"]; _d["ip"] = "after"; RIMG[_q["img"]] = "Figure for question %d of %s" % (_q["n"], _ch["name"])
        if _q["dir"]:
            _d["pre"] = _esc(_q["dir"])
            if _q["dirImg"]:
                _d["pi"] = _q["dirImg"]; RIMG[_q["dirImg"]] = "Figure for the directions in " + _ch["name"]
        _qs.append(_d)
        if _q["y"]:
            _p = dict(_d); _p.pop("b"); _p["ri"] = len(_qs) - 1; _pyq.append(_p)
    topics.append({"slug": _ch["slug"], "name": _esc(_ch["name"]), "chapter": "Chapter %d" % (_ci + 1), "subject": "reasoning",
                   "sections": [{"h": _esc(s[0]), "k": ""} for s in _secs], "qs": _qs, "pyq": _pyq})
_N = json.load(open("new_questions.json", encoding="utf-8"))
_by = {t["slug"]: t for t in topics}
for _slug, _items in _N["mq"].items():
    _by[_slug]["mq"] = [{"t": _esc(x["t"]), "o": [_esc(o) for o in x["o"]], "k": x["k"], "s": [_esc(s) for s in x["s"]]} for x in _items]
for _subj, _key, _slug, _note in (("maths", "maths_mixed", "maths-mixed", "New mixed practice sets with questions from every Maths topic."),
                                   ("reasoning", "reasoning_mixed", "r-mixed", "New mixed practice sets with questions from every Reasoning topic.")):
    topics.append({"slug": _slug, "name": "Mixed Practice Sets", "chapter": "", "note": _note, "subject": _subj, "mixed": True, "sections": [], "pyq": [],
                   "qs": [{"t": _esc(x["t"]), "o": [_esc(o) for o in x["o"]], "k": x["k"], "s": [_esc(s) for s in x["s"]], "tg": _by[x["slug"]]["name"]} for x in _N[_key]]})
print("New questions:", sum(len(v) for v in _N["mq"].values()), "for mock tests,", len(_N["maths_mixed"]) + len(_N["reasoning_mixed"]), "in mixed practice sets")
print("Reasoning:", len(_R["chapters"]), "topics,", sum(len(c["qs"]) for c in _R["chapters"]), "questions,", len(RIMG), "figures")
IMG = {"hero": "hero-class-2026.jpg", "portrait": "amarjeet-sir-main.jpg", "face": "amarjeet-sir-face.jpg", "avatar": "amarjeet-sir-cartoon.jpg", "students": "classroom-students.jpg",
       "practice": "classroom-practice.jpg", "hall": "classroom-hall.jpg", "poster1": "batch-maths-reasoning.jpg", "poster2": "batch-apssb-online.jpg", "poster3": "batch-selection-force-2026.jpg",
       "selbanner": "selections-banner.jpg", "r-csl23": "result-csl-2023.jpg", "r-hc24": "result-head-constable-2024.jpg", "r-cgl24": "result-cgl-2024.jpg", "r-steno24": "result-steno-2024.jpg", "r-chsl23": "result-chsl-2023.jpg"}
MESSAGE = [
 "In Arunachal Pradesh, a large number of students carry a deep fear of Mathematics. Over the years I have tried to understand where this fear actually comes from, and the answer turned out to be simpler than it appears.",
 "Most of our students come from a Humanities background. For them, the connection with numbers and calculation breaks right after Class 10. Years pass, and when they finally sit down to prepare for a competitive examination, that long gap shows up as weak calculation and weak basic Maths skills. Mathematics — and every subject built on it — suddenly feels heavy, and their performance in the examination suffers for it.",
 "I came to Arunachal Pradesh to work on exactly this problem. Since 2022 I have been taking my classes to every corner of the state, both offline and online. In this journey I have mentored more than 10,000 students. Over 1,000 of them are already selected in government services, and many more are still on their way — but the fear of Maths has left them, and to me that matters just as much.",
 "So far I have completed more than 120 batches. Offline, I have taught at Itanagar, Naharlagun and Nirjuli; online, I have been able to reach students across Pan-Arunachal.",
 "One decision shaped all of it. I did not pick up the Delhi model and place it on our students. I first sat with their problem, and then built what I would call an Arunachali way of teaching Mathematics — a way of breaking the curriculum, breaking each topic, and pacing the explanation so that the student sitting in front of me actually understands it.",
 "My target was always the same, and always in that order: every student should understand the class 100%, then every topic 100%, then the whole of Mathematics — and finally carry that confidence into the examination hall and into a selection.",
 "As this journey went on, students began coming to me with a new demand: “Sir, my concepts are strong now — I need practice.” That led to my first book: 2000+ questions, built from the Previous Year Questions of Arunachal Pradesh and the rest of the Northeast, together with selected questions from central examinations. I wanted an Arunachal student to be ready not only for APSSB, but for whatever examination he or she chooses to attempt tomorrow.",
 "That book went on to become one of the highest-selling books in Arunachal Pradesh. More than 10,000 copies are already with students — and that too when it was available only at our own centres, and never distributed district by district.",
 "Then came the next honest piece of feedback. Students told me the book was good, but its level — APSSB, other state exams and central exams together — sat a little above them while the course was still running; real practice from it was possible only after the syllabus was complete. What they wanted was a book they could practise from alongside the class, topic by topic.",
 "This book is the answer to that need.",
 "Basic Mathematics Practice Book carries 1700 questions — 100 questions for every topic. Every question here is either one that has actually been asked in APSSB examinations, or one developed directly from it. The moment a topic finishes in class, this book is ready for practice on that very topic.",
 "So the path for a student is now clear. Study the topic properly, practise it from this Basic book, and then move to the Advanced book. Do this honestly, topic after topic, and Mathematics will stop being a problem for any student in Arunachal Pradesh.",
 "This book is dedicated, completely, to each and every aspirant of Arunachal Pradesh — the students who gave an ordinary boy, an ordinary teacher, so much love and respect, and who chose to call him Maths by Amarjeet Sir, Maths Guru, and a star teacher of Arunachal Pradesh. Whatever I am today, I am because of you.",
 "I wish all future APSSB aspirants the very best in their journey.",
 "<strong>Amarjeet Sir</strong>",
]
SITE = {
 "wa": "919863794212", "waShow": "98637 94212", "phone": "6009526445", "phoneShow": "60095 26445",
 "joinMsg": "Hello Sir, I want to know about your batches.",
 "selBannerAlt": "Northeast PSC: 1000+ selections in APPSC and APSSB exams, with photos of selected students and Kemin Gamlin, APCS 2024, Rank 16.",
 "selBannerCaption": "Kemin Gamlin, APCS 2024, Rank 16, with Northeast PSC’s selected students.",
 "results": [["1,000+", "Selections in APPSC and APSSB exams"], ["140+", "CSL 2023"], ["40+", "Head Constable 2024, 2 in the top 10"], ["25", "CGL 2024, 2 in the top 10"], ["20+", "Stenographer (PA) 2024, 3 in the top 10"], ["20+", "CHSL 2023"], ["15+", "CHSL 2024"]],
 "resultPosters": [["r-csl23", "CSL 2023: 140+ selections", "Photos and names of Northeast PSC students selected in APSSB CSL 2023."],
                   ["r-hc24", "Head Constable 2024: 40+ selections", "Photos and names of Northeast PSC students selected as Head Constable in 2024."],
                   ["r-cgl24", "CGL 2024: 25 selections", "Photos and names of Northeast PSC students selected in APSSB CGL 2024."],
                   ["r-steno24", "Stenographer 2024: 20+ selections", "Photos and names of Northeast PSC students selected as Personal Assistant (Stenographer) in 2024."],
                   ["r-chsl23", "CHSL 2023: selected students", "Photos, names and posts of Northeast PSC students selected in APSSB CHSL 2023."]],
 "reviews": {"url": "https://share.google/THfGIpP0JrsLirylq", "count": "2,000+"},
 "heroAlt": "Amarjeet Sir teaching a packed Maths class at Northeast PSC, with his digital board shown on screens across the classroom",
 "stats": [["10,000+", "Students mentored"], ["1,000+", "Selected in government services"], ["120+", "Batches completed"], ["10,000+", "Copies of his first book with students"]],
 "about": "Since 2022, Amarjeet Sir has been teaching Mathematics, and Reasoning since it entered APSSB exams in 2024, across Arunachal Pradesh, offline at Itanagar, Naharlagun and Nirjuli, and online for students across the state. Most aspirants here come from a Humanities background and lose touch with numbers after Class 10, so he built an Arunachali way of teaching that breaks every topic down until each student understands it fully. More than 10,000 students have learned with him, and over 1,000 are already selected in government services.",
 "courses": [
  {"name": "Online Maths Batch, ₹1,500", "img": "poster-maths", "msg": "Hello Sir, I want to join the Online Maths Batch (₹1,500).",
   "alt": "APSSB Maths online batch with Amarjeet Sir and team: fee ₹1,500 instead of ₹2,500, a ₹1,000 discount for a limited period only. Join the team of 1000+ selections. Call 9863794212, 6009526445 or 9233789183."},
  {"name": "Online Reasoning Batch, ₹1,500", "img": "poster-reasoning", "msg": "Hello Sir, I want to join the APSSB Reasoning Online Batch (₹1,500).",
   "alt": "APSSB Reasoning online batch with Amarjeet Sir and team: fee ₹1,500 instead of ₹2,500, a ₹1,000 discount for a limited period only. Join the team of 1000+ selections. Call 9863794212, 6009526445 or 9233789183."},
  {"name": "Offline Maths Batch, ₹4,000", "img": "poster-offline-maths", "msg": "Hello Sir, I want to join the APSSB Maths Offline Batch (₹4,000).",
   "alt": "APSSB Maths offline batch by Amarjeet Sir and team at Itanagar, Naharlagun, Nirjuli and Pasighat: fee ₹4,000 instead of ₹5,000, a ₹1,000 discount. Join the team of 1000+ selections. Call 9863794212, 6009526445 or 9233789183."},
  {"name": "APSSB Full Course (Offline), ₹14,000", "img": "poster-fullcourse", "msg": "Hello Sir, I want to join the APSSB Full Course Offline Batch (₹14,000).",
   "alt": "APSSB full course offline batch by Amarjeet Sir and team: Maths, Reasoning, GK and English at Itanagar, Naharlagun, Nirjuli and Pasighat. ₹5,000 per subject; the full course is ₹14,000 instead of ₹20,000 after discount, with 150+ APSSB tests included. Call 9863794212, 6009526445 or 9233789183."},
  {"name": "Complete APSSB Online Batch", "img": "poster2", "msg": "Hello, I want to join the Complete APSSB Online Batch.",
   "alt": "Complete APSSB online batch at Northeast PSC: Maths, GK, English and Reasoning for APSSB CGL, CHSL and CSL, with live classes, recorded backup, test series and PDF notes. Fee ₹6,000."},
  {"name": "APSSB Selection Force (Online)", "img": "poster3", "msg": "Hello Sir, I want to join the APSSB Selection Force online batch (Maths, Reasoning, GK/GS and English).",
   "alt": "Join the biggest APSSB selection force of Arunachal Pradesh at Northeast PSC: 1000+ selections achieved. Online live and backup recorded batch for Maths, Reasoning, GK/GS and English, with experienced faculty and an exam-oriented strategy. Call 9863794212 or 8118984013."},
 ],
 "gallery": [["g-tsd", "Amarjeet Sir explaining a Time, Speed and Distance question on the smart board"], ["g-column", "Square roots by the column method, shown on screens across the hall"],
   ["g-fullhall", "A full hall of students following the class"], ["g-discount", "Successive discount explained step by step on the smart board"],
   ["g-squares", "Amarjeet Sir showing patterns in the squares of 1 to 10"], ["g-simplify", "A simplification class on the digital board"],
   ["g-exponents", "A powers and exponents question in front of a full class"]],
 "galleryMore": [["g-lcm", "An LCM and HCF class in the big hall with screens for every row"], ["g-writing", "Students solving along in their notebooks"],
   ["g-sqrt", "Simplifying square roots on the smart board"], ["g-average", "Average of the first 30 whole numbers on the board"],
   ["g-packed", "A packed hall watching Amarjeet Sir on the screens"], ["practice", "Students solving questions in class while Amarjeet Sir checks their work"]],
 "message": MESSAGE,
 "books": [["Basic Mathematics Practice Book", "1,700 questions, 100 for every topic, built from APSSB questions. Practise each topic right after it is taught in class."],
           ["2000+ Questions book", "Previous year questions of Arunachal Pradesh and the Northeast with selected central exam questions. More than 10,000 copies are with students."]],
 "centres": [["Online", "60095 26445", "6009526445"], ["Itanagar", "81189 84013", "8118984013", "NEPSC Building, 2nd Floor, Opp. Civil Secretariat, Near Bank of Maharashtra, Itanagar"], ["Naharlagun", "70054 79070", "7005479070"], ["Nirjuli", "98637 86864", "9863786864"], ["Pasighat", "92337 89170", "9233789170"]],
}

IMG.update({"sel-banner": "selections-banner.jpg", "res-cgl24": "result-cgl-2024.jpg", "res-hc24": "result-head-constable-2024.jpg",
            "res-steno24": "result-stenographer-2024.jpg", "res-csl23": "result-csl-2023.jpg", "res-chsl23": "result-chsl-2023.jpg",
            "book-basic": "book-basic.jpg", "book-advanced": "book-advanced.jpg", "logo": "logo-full.png", "logo-icon": "logo-icon.png"})
SITE["sel"] = {
 "lead": "Results of Northeast PSC students in recent APSSB and APPSC exams.",
 "banner": "sel-banner", "bannerAlt": "Northeast PSC: 1000+ selections in APPSC and APSSB exams, with Kemin Gamlin, APCS 2024, Rank 16.",
 "highlights": [["1,000+", "selections in APPSC and APSSB exams"], ["Rank 16", "Kemin Gamlin, APCS 2024"], ["140+", "selections in CSL 2023"],
                ["41", "selections in Head Constable 2024"], ["25", "selections in CGL 2024, 2 in the top 10"],
                ["20+", "selections in Stenographer 2024, 3 in the top 10"], ["15+", "selections in CHSL 2024"], ["20+", "selections in CHSL 2023"]],
 "posters": [["res-cgl24", "Result poster: 25 selections in APSSB CGL 2024, with photos, names and roll numbers of the selected students.", "CGL 2024"],
             ["res-hc24", "Result poster: 40+ selections in Head Constable 2024, with photos, names and roll numbers of the selected students.", "Head Constable 2024"],
             ["res-steno24", "Result poster: 20+ selections in Personal Assistant (Stenographer) 2024, with 3 students in the top 10.", "Stenographer 2024"],
             ["res-csl23", "Result poster: 140+ selections in CSL 2023, with photos, names and roll numbers of the selected students.", "CSL 2023"],
             ["res-chsl23", "Result poster: selected students in CHSL 2023 with the posts they were selected for.", "CHSL 2023"]],
}
SITE["sel"]["years"] = [
 ["2026", [["Uniform Services", "350+", "Overall Rank 2, APST Rank 1"], ["CHSL", "40+", "2nd and 4th rank from Northeast PSC"], ["CGL", "30+"]]],
 ["2025", [["CSL", "100+"], ["Non Ministerial", "50+"], ["Head Constable (TCL)", "20+", "", "Tirap, Changlang, Longding"], ["MTS (TCL)", "20+", "", "Tirap, Changlang, Longding"], ["CHSL", "10+"]]],
 ["2024", [["CSL", "65+"], ["Non Ministerial", "60+"], ["Head Constable", "40+"], ["CGL", "25", "2 in the top 10"], ["Stenographer", "20+", "3 in the top 10"], ["CHSL", "15+"]]],
 ["2023", [["CSL", "140+"], ["CHSL", "20+"]]],
]
SITE["sel"]["recent"] = {"title": "Recent toppers",
 "people": [["rank-bujum", "Bujum Negia Dignium", "Overall Rank 2, APST Rank 1", "APSSB Uniform Services", "Poster: Bujum Negia Dignium, APST Rank 1 and Overall Rank 2 in APSSB Uniform Services", True],
            ["rank-jumram", "Jumram Kambu", "2nd Rank", "APSSB CHSL 2026 (LDC)", "Northeast PSC poster: Jumram Kambu, 2nd Rank in APSSB CHSL (LDC)"],
            ["rank-jumyir", "Jumyir Kamgo", "4th Rank", "APSSB CHSL 2026", "Northeast PSC poster: Jumyir Kamgo, 4th Rank in APSSB CHSL"]],
 "quote": "Thank you so much sir, bohut pehle se try kiya tha, par aap logon ke institute ke syllabus structure aur guidance se bohut help mila hai.",
 "quoteBy": "Jumram Kambu, 2nd Rank, APSSB CHSL 2026"}
SITE["sel"]["toppers"] = {"title": "Selected in APPSCCE 2024", "names": ["Kemin Gamlin (APCS, Rank 16)", "Takar Nasi", "Rijum Kaye", "Begam Angu", "Kaling Doming"]}
SITE["video"] = {"id": "xsi4d5_ckMs", "title": "APSSB Maths PYQ 10 Hours Marathon Class", "url": "https://www.youtube.com/watch?v=xsi4d5_ckMs",
                 "pdf": "https://t.me/Northeast_PSC/2907",
                 "desc": "All APSSB Maths previous year questions, topic by topic, in one 10-hour marathon class by Amarjeet Sir."}
SITE["demos"] = [{"label": "Demo lecture 1", "title": "APSSB Maths with Amarjeet Sir", "url": "https://youtu.be/KxHDpiXXC3o"},
                 {"label": "Demo lecture 2", "title": "Number System, Part 2", "url": "https://youtu.be/fX0rNGDuclk"},
                 {"label": "Demo lecture 3", "title": "Square Root", "url": "https://youtu.be/KOwlfKjFe7o"}]
SITE["moreClasses"] = [{"url": "https://www.youtube.com/watch?v=d6wZAcfvqlU", "title": "APSSB Maths PYQ class",
  "topicsText": "Percentage, Profit & Loss, Discount, Ratio & Proportion, Mixture, Time & Work, Simple & Compound Interest, Time, Speed & Distance",
  "short": "PYQ class on Percentage to Time, Speed & Distance",
  "topics": ["percentage", "profit-loss", "ratio-proportion", "time-work", "simple-interest", "compound-interest", "time-speed-distance"]}]
# Google Form that collects students' name and WhatsApp number into the owner's Google Sheet
SITE["form"] = {"action": "https://docs.google.com/forms/d/e/1FAIpQLSeq7QBSw76Y4jFaz5go3cYjIgOWQ3JLRLqzS4uhOkYwdQ1NnA/formResponse",
                "name": "entry.110292301", "phone": "entry.573875926"}

# ---------- spread the correct answers across A, B, C and D ----------
# Many book quizzes had the same letter correct 6 to 10 times out of 10. For those quizzes each
# question gets a display order "d" (display position -> source option index). The source order and
# the key "k" never change, so answers already saved on students' phones stay valid.
import hashlib as _bh, random as _brandom
_B_FIXED = _re.compile(r"none of|^\W*none\W*$|all of|all the above|cannot be|can\W?t be|data inadequate|not possible|no such|insufficient|any of the", _re.I)
_B_REFOPT = _re.compile(r"\bboth\b|\beither\b|\bneither\b|\boption|\bonly\b|\balone\b|\bstatement|\bconclusion|\bfollows?\b|\btrue\b|\bfalse\b|\babove\b|\bA and B\b|\b[A-D] (?:and|or|&amp;) [A-D]\b", _re.I)
_B_REFTXT = _re.compile(r"\(\s*[a-eA-E]\s*\)|\boptions?\s*\(?[A-Ea-e1-5]\)?(?![A-Za-z])|\balternatives?\b|answer figure|\bfigure\s*\(?[a-dA-D1-4]\)?(?![A-Za-z0-9])", _re.I)
_B_BARE = _re.compile(r"\W*(?:fig(?:ure)?\.?\s*)?\(?[A-Ea-e1-5]\)?\W*$")
def _b_plain(x): return _re.sub(r"<[^>]+>", "", _html.unescape(str(x)))
def _b_slots(q):
    """Display slots the correct option may move to; None when the question must stay as it is."""
    o = q["o"]
    if len(o) != 4 or not (0 <= q["k"] < 4): return None
    plain = [_b_plain(x) for x in o]
    if any("<img" in x or "<svg" in x for x in o): return None
    if all(_B_BARE.match(x) for x in plain) and (q.get("img") or q.get("pi") or all(_re.match(r"\W*\(?[A-Ea-e]\)?\W*$", x) for x in plain)): return None
    if any(_B_REFOPT.search(x) for x in plain): return None
    if _B_REFTXT.search(_b_plain(q["t"])) or any(_B_REFTXT.search(_b_plain(x)) for x in q["s"]): return None
    fixed = [i for i, x in enumerate(plain) if _B_FIXED.search(x)]
    if q["k"] in fixed: return None
    free = [i for i in range(4) if i not in fixed]
    return free if len(free) >= 2 else None
def _b_run(keys):
    best = cur = 1
    for a, b in zip(keys, keys[1:]):
        cur = cur + 1 if a == b else 1; best = max(best, cur)
    return best
def _balance_answers(topics, per=10):
    for t in topics:
        for kind in ("qs", "pyq"):
            lst = t.get(kind) or []
            for q in lst: q.pop("d", None)
            for start in range(0, len(lst), per):
                chunk = lst[start:start + per]
                if len(chunk) < 4: continue
                cnt = [sum(1 for q in chunk if q["k"] == i) for i in range(4)]
                if max(cnt) <= 3 and (len(chunk) < 8 or min(cnt) >= 1): continue      # already well spread
                slots = [_b_slots(q) for q in chunk]
                seed = int(_bh.md5((t["slug"] + kind + str(start) + chunk[0]["t"]).encode("utf-8")).hexdigest()[:12], 16)
                best = None
                for attempt in range(40):
                    rng = _brandom.Random(seed + attempt)
                    keys = [q["k"] for q in chunk]
                    have = [0, 0, 0, 0]
                    for q, sl in zip(chunk, slots):
                        if sl is None: have[q["k"]] += 1
                    order = [i for i, sl in enumerate(slots) if sl is not None]; rng.shuffle(order)
                    for i in order:
                        low = min(have[s] for s in slots[i])
                        pick = rng.choice([s for s in slots[i] if have[s] == low])
                        keys[i] = pick; have[pick] += 1
                    score = (max(have) - min(have)) * 10 + _b_run(keys) * 3 + sum(1 for a, b in zip(keys, keys[1:]) if a == b)
                    if best is None or score < best[0]: best = (score, keys)
                for q, new in zip(chunk, best[1]):
                    if new != q["k"]:
                        d = [0, 1, 2, 3]; d[new], d[q["k"]] = q["k"], new     # swap the correct option with the one in its new place
                        q["d"] = d

SITE["marathonLead"] = "Free full-day revision classes on YouTube covering Maths, Reasoning, GK and English. Tap a day to watch."
SITE["marathons"] = [
 {"title": "APSSB CHSL 2026 Maha Marathon", "meta": "5 days, 30 hours, September 2026",
  "days": [[1, "3kby_lNK5VA", "14 Sep"], [2, "p98prUS5BGE", "15 Sep"], [3, "f1Ykn5F3SRI", "16 Sep"], [4, "XjExfiqnU1c", "17 Sep"], [5, "qpIyX3b2Ung", "18 Sep"]]},
 {"title": "APSSB CGL 2026 Maha Marathon", "meta": "10 days, 60 hours, August 2026",
  "split": [{"day": 1, "date": "19 Aug", "parts": [["Maths", "M9izLIB1VNI", "Amarjeet Sir"], ["English", "9LUFesjr9kA", "Pavan Sir"], ["GK", "SUsDOzqDH8I", "Ali Sir"]]},
            {"day": 2, "date": "20 Aug", "parts": [["Maths", "rF5K7Of-Lqg", "Amarjeet Sir"], ["Reasoning", "zVg6-E61Il4", "Class 2"], ["English", "g-mVg8tzIyM", "Class 2"], ["GK", "6gSwSC4LvbE", "Ali Sir"]]}],
  "days": [[3, "CqDU3kowPLc", "21 Aug"], [4, "UVl9RqGO7lY", "22 Aug"], [5, "vC7V15RJ-iM", "23 Aug"], [6, "Qqd4jZ3Jw30", "24 Aug"],
           [7, "X649oUu2wT0", "25 Aug"], [8, "FDCCvFjIwts", "26 Aug"], [9, "4Ojz0eHTmBI", "27 Aug"], [10, "QfI6vPWAfsw", "28 Aug"]]},
 {"title": "APSSB Maha Marathon: Constable, Fireman and Tiger Guard", "meta": "6 days, 12 hours a day, June 2026",
  "note": "Every day runs Reasoning (8 to 11 AM) and Maths (2 to 5 PM) with Amarjeet Sir & Team, English (11 AM to 2 PM) with Pavan Sir, and GK/GS (5 to 8 PM) with Ali Sir & Team.",
  "days": [[1, "mHAyGtHka80", "7 Jun"], [2, "TIPVsUXgH7k", "8 Jun"], [3, "pY7ufXmcK1I", "9 Jun"], [4, "lE5sXunkBQA", "10 Jun"], [5, "2xaCQz7Sc3s", "11 Jun"], [6, "tQ4FJzfCHDs", "12 Jun"]]},
]
SITE["guidance"] = {"lead": "The APSSB Guidance and Counselling Series by Amarjeet Sir: strategy, syllabus analysis and exam-day advice for every APSSB aspirant.",
 "videos": [
  {"title": "Avoid silly mistakes in APSSB CGL 2026", "sub": "Exam hall strategy, accuracy and time management", "url": "https://youtu.be/2CGOtj0uqG0"},
  {"title": "APSSB CGL syllabus analysis", "sub": "Important Maths topics and trends from previous year questions", "url": "https://youtu.be/foccL2Mw9KY"},
  {"title": "How to crack APSSB CGL 2026", "sub": "Preparation plan for GK, English, Reasoning and Maths", "url": "https://youtu.be/FrsgFcV888c"},
  {"title": "Why most aspirants fail, and how to avoid it", "sub": "The right way to plan syllabus, practice and revision", "url": "https://youtu.be/g0QcSAL4yq4"},
  {"title": "APSSB CSL complete strategy", "sub": "Exam pattern, study plan and time management", "url": "https://youtu.be/UfIq3ySRhjw"},
  {"title": "APSSB exams complete analysis", "sub": "An overview of the APSSB exams", "url": "https://youtu.be/XQ4WupBYzM4"},
  {"title": "More guidance from Amarjeet Sir", "sub": "Guidance and Counselling Series", "url": "https://youtu.be/HJ-5xDyzhmk"}]}
SITE["featured"] = {"tag": "50% off", "name": "Maths & Reasoning Batches by Amarjeet Sir & Team", "img": "poster-mr", "price": "3,000", "was": "6,000",
 "note": "Useful for APSSB CGL, CHSL, CSL and APPSC CSAT",
 "points": ["Live classes with a proper digital board", "Backup recorded lectures (8 months)", "Previous year questions with video solutions", "20 test series with video solutions"],
 "msg": "Hello Sir, I want to join the Maths & Reasoning batch (₹3,000).", "call": "6009526445", "callShow": "60095 26445",
 "alt": "Maths and Reasoning batches by Amarjeet Sir and team, 50% off: live classes with a proper digital board, backup recorded lectures for 8 months, previous year questions and 20 test series with video solutions. Fee ₹3,000 instead of ₹6,000. Useful for APSSB CGL, CHSL, CSL and APPSC CSAT. 1000+ selections in APSSB and APPSC exams."}
SITE["csat"] = {"tag": "APPSCCE CSAT 2026", "name": "CSAT 2026 Exclusive Batch by Amarjeet Sir & Team", "img": "poster-csat", "price": "5,000", "was": "10,000",
 "note": "50% discount for the first 100 students",
 "points": ["Online batch", "Maths and Reasoning", "Interpersonal Skill", "Comprehension"],
 "msg": "Hello Sir, I want to join the APPSCCE CSAT 2026 batch (₹5,000).", "call": "9863794212", "callShow": "98637 94212",
 "alt": "APPSCCE CSAT 2026 exclusive online batch by Amarjeet Sir and team: Maths, Reasoning, Interpersonal Skill and Comprehension. Fee ₹5,000, down from ₹10,000, with 50% discount for the first 100 students."}
SITE["pyqVideo"] = {"fractions": [1, "0:01"], "number-system": [2568, "42:48"], "decimal": [7898, "2:11:38"], "power-exponents": [8986, "2:29:46"],
                    "series-average": [11913, "3:18:33"], "lcm-hcf": [15820, "4:23:40"], "percentage": [19002, "5:16:42"], "profit-loss": [22398, "6:13:18"],
                    "simple-interest": [25800, "7:10:00"], "compound-interest": [25800, "7:10:00"], "geometry": [28728, "7:58:48"], "mensuration": [28728, "7:58:48"]}
SITE["books"] = [
 {"name": "APSSB Maths Booster: Basic Book", "img": "book-basic", "price": "299", "msg": "Hello, I want to buy the APSSB Maths Booster Basic Book.",
  "desc": "1,700 questions, 100 for every topic, built from APSSB previous year questions. Practise each topic right after it is taught in class."},
 {"name": "APSSB Maths Booster: Advanced Book", "img": "book-advanced", "price": "299", "msg": "Hello, I want to buy the APSSB Maths Booster Advanced Book.",
  "desc": "2000+ previous year questions of Arunachal Pradesh and the Northeast, with selected central exam questions. More than 10,000 copies are with students."},
 {"name": "APSSB Maths Complete Notes", "img": "book-notes", "price": "299", "msg": "Hello, I want to buy the APSSB Maths Complete Notes.",
  "desc": "Complete notes for APSSB Maths with all APSSB previous year questions included. Important for CGL, CHSL, CSL, Non-Ministerial and other APSSB exams."},
 {"name": "APSSB Reasoning Complete Notes", "img": "book-reasoning-notes", "price": "299", "msg": "Hello, I want to buy the APSSB Reasoning Complete Notes.",
  "desc": "Complete notes for APSSB Reasoning by the Northeast PSC team, with all APSSB previous year questions included. Important for CGL, CHSL, CSL, Non-Ministerial and other APSSB exams."},
 {"name": "APSSB Reasoning Booster: Practice Book", "img": "book-reasoning-booster", "price": "299", "msg": "Hello, I want to buy the APSSB Reasoning Booster book.",
  "desc": "2,110 Reasoning questions in 19 chapters by the Northeast PSC team: APSSB previous year questions, PYQs of other North-East states and important PYQ-oriented questions, with answer keys and brief solutions. All of them are on this website as practice quizzes."},
]
SITE["centres"] = [["Online", "60095 26445", "6009526445"],
                   ["Itanagar", "81189 84013", "8118984013", "Above V-Mart, near Akaldeep Complex"],
                   ["Naharlagun", "70054 79070", "7005479070", "Lagun Bridge"],
                   ["Nirjuli", "98637 86864", "9863786864", "1st Floor, Chart & Chess, opposite Domino’s"],
                   ["Pasighat", "92337 89170", "9233789170", "2nd Floor, above Domino’s, opposite Hotel Airport View"]]
SITE["siteUrl"] = "https://northeastpsc.co.in/maths-by-amarjeet-sir/"
SITE["channel"] = {"url": "https://whatsapp.com/channel/0029Va9viVOKmCPTBuiPK339", "followers": "10K+"}
SITE["follow"] = [["WhatsApp channel", "https://whatsapp.com/channel/0029Va9viVOKmCPTBuiPK339"], ["YouTube", "https://www.youtube.com/channel/UCMeONVg2qcKTCnbPh0tDU5A"], ["Telegram", "https://t.me/Northeast_PSC"]]
SITE["app"] = {"url": "https://web.classplusapp.com", "code": "yjkfbc"}

IMG["team"] = "team-photo.jpg"
SITE["teamAlt"] = "Amarjeet Sir with the Northeast PSC team and students at a felicitation event."
SITE["teamCaption"] = "Amarjeet Sir with the Northeast PSC team."
IMG.update({k: k + ".jpg" for k in ["g-tsd", "g-column", "g-fullhall", "g-discount", "g-squares", "g-simplify", "g-exponents", "g-lcm", "g-writing", "g-sqrt", "g-average", "g-packed"]})
IMG.update({"rank-jumram": "rank-jumram.jpg", "rank-jumyir": "rank-jumyir.jpg", "rank-bujum": "rank-bujum.jpg"})
IMG.update({"poster-offline-maths": "batch-maths-offline.jpg", "poster-fullcourse": "batch-full-course-offline.jpg", "book-reasoning-booster": "book-reasoning-booster.jpg", "book-reasoning-notes": "book-reasoning-notes.jpg", "book-notes": "book-notes.jpg", "poster-reasoning": "batch-reasoning-online.jpg", "poster-mr": "batch-maths-reasoning-2026.jpg", "poster-maths": "batch-maths-online-2026.jpg", "poster-csat": "batch-appscce-csat.jpg"})
USED_IMG = ["poster-offline-maths", "poster-fullcourse", "book-reasoning-booster", "book-reasoning-notes", "book-notes", "poster-reasoning", "poster-mr", "poster-maths", "poster-csat", "rank-bujum", "rank-jumram", "rank-jumyir", "g-tsd", "g-column", "g-fullhall", "g-discount", "g-squares", "g-simplify", "g-exponents", "g-lcm", "g-writing", "g-sqrt", "g-average", "g-packed", "face", "team", "hero", "portrait", "avatar", "practice", "poster2", "poster3", "sel-banner", "res-cgl24", "res-hc24",
            "res-steno24", "res-csl23", "res-chsl23", "book-basic", "book-advanced", "logo", "logo-icon"]
_unused = [k for k in IMG if k not in USED_IMG]
for k in _unused: del IMG[k]
print("removed unused image keys:", _unused)
CSS = open("site.css").read()
PWA_HEAD = """<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="images/icon-192.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="description" content="Free APSSB Maths and Reasoning practice by Amarjeet Sir: 5,000 questions in 500 quizzes and mock tests, with step-by-step solutions and topic-wise reports.">
<meta property="og:title" content="APSSB Maths &amp; Reasoning Practice by Amarjeet Sir">
<meta property="og:description" content="5,000 Maths and Reasoning questions in 500 quizzes and mock tests, with step-by-step solutions and topic-wise reports. Free.">
<meta property="og:image" content="https://northeastpsc.co.in/maths-by-amarjeet-sir/images/og-image.jpg">
<meta property="og:url" content="https://northeastpsc.co.in/maths-by-amarjeet-sir/">
<meta property="og:type" content="website">
"""
def build(mode):
    site = dict(SITE); site["pwa"] = (mode == "files"); site["siteUrl"] = SITE.get("siteUrl", "");
    site["img"] = {}; site["video"] = dict(SITE["video"], embed=(mode == "files"))
    for k, f in IMG.items():
        w, h = Image.open("site_img/" + f).size
        mime = "image/png" if f.endswith(".png") else "image/jpeg"
        src = ("data:" + mime + ";base64," + base64.b64encode(open("site_img/" + f, "rb").read()).decode()) if mode == "inline" else "images/" + f
        site["img"][k] = {"src": src, "w": w, "h": h}
    imgs = dict(IMAGES)
    for _k, _alt in RIMG.items():
        _w, _h = Image.open("rimg/" + _k + ".png").size
        _src = ("data:image/png;base64," + base64.b64encode(open("rimg/" + _k + ".png", "rb").read()).decode()) if mode == "inline" else "images/r/" + _k + ".png"
        imgs[_k] = {"src": _src, "alt": _alt, "w": round(_w / 2), "h": round(_h / 2)}
    _balance_answers(topics)
    data = json.dumps({"topics": topics, "images": imgs, "site": site}, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    tpl = open("template3.html").read()
    head, rest = tpl.split("<script>\n(function () {", 1)
    tail = rest.split("})();\n</script>", 1)[1]
    css_pyq = """.ovl { text-decoration: overline; }
.setname { font-size: 19px; margin: 24px 0 2px; }
.setnote { margin: 0; color: var(--ink-soft); font-size: 15px; }
.setname + .setnote + .quizzes { margin-top: 12px; }
.pyqtag { color: var(--drop); font-weight: 700; }
.srcline { margin: 0 0 8px; font-size: 13px; font-weight: 700; color: var(--drop); }
"""
    head = head.replace("</style>", css_pyq + CSS + "</style>", 1)
    head = head.replace("__LOGO__", site["img"]["logo-icon"]["src"])
    if mode == "files":
        head = head.replace("</head>", PWA_HEAD + "</head>", 1)
        head = head.replace('<meta charset="utf-8">', '<meta charset="utf-8">\n<script>(function () { var p = location.pathname; if (p.slice(-1) !== "/" && !/\\.[a-z0-9]+$/i.test(p)) history.replaceState(null, "", p + "/" + location.search + location.hash); })();</script>', 1)
    return head.replace("__DATA__", data) + "<script>\n" + open("app3.js").read() + "</script>" + tail
inline = build("inline")
for p in ["dist/apssb-basic-maths-practice.html", "dist/APSSB Maths & Reasoning Practice by Amarjeet Sir.html"]:
    open(p, "w").write(inline)
for _old in ("Maths Practice by Amarjeet Sir.html", "APSSB Maths Practice by Amarjeet Sir.html", "APSSB Maths Practice by Amarjeet Sir - website.zip"):
    if os.path.exists("dist/" + _old): os.remove("dist/" + _old)
files = build("files")
shutil.rmtree("site_pkg", ignore_errors=True); os.makedirs("site_pkg/images")
open("site_pkg/index.html", "w").write(files)
for f in IMG.values(): shutil.copy("site_img/" + f, "site_pkg/images/" + f)
os.makedirs("site_pkg/images/r", exist_ok=True)
for _k in RIMG: shutil.copy("rimg/" + _k + ".png", "site_pkg/images/r/" + _k + ".png")
for f in ["icon-192.png", "icon-512.png", "icon-maskable-512.png", "og-image.jpg"]:
    shutil.copy("site_img/" + f, "site_pkg/images/" + f)
import json as _json
open("site_pkg/manifest.webmanifest", "w").write(_json.dumps({
    "name": "APSSB Maths & Reasoning Practice by Amarjeet Sir", "short_name": "Maths & Reasoning", "start_url": "./", "scope": "./", "display": "standalone",
    "background_color": "#eef0f5", "theme_color": "#ffffff",
    "icons": [{"src": "images/icon-192.png", "sizes": "192x192", "type": "image/png"}, {"src": "images/icon-512.png", "sizes": "512x512", "type": "image/png"},
              {"src": "images/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}]}, indent=1))
_core = ["./", "index.html", "manifest.webmanifest"] + ["images/" + f for f in sorted(os.listdir("site_pkg/images")) if os.path.isfile("site_pkg/images/" + f)]
import hashlib as _hl
_h = _hl.sha1(open("site_pkg/index.html", "rb").read())
for _root, _dirs, _files in sorted(os.walk("site_pkg/images")):
    for _f in sorted(_files): _h.update(open(os.path.join(_root, _f), "rb").read())
open("site_pkg/sw.js", "w").write("""const CACHE = "apssb-maths-v2-""" + _h.hexdigest()[:10] + """";
const CORE = """ + _json.dumps(_core) + """;
self.addEventListener("install", function (e) { e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(CORE); }).then(function () { return self.skipWaiting(); })); });
self.addEventListener("activate", function (e) { e.waitUntil(caches.keys().then(function (keys) { return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); })); });
function keep(req, res) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); return res; }
self.addEventListener("fetch", function (e) {
  var req = e.request; if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin === self.location.origin) {
    if (req.mode === "navigate") { e.respondWith(fetch(req).then(function (r) { return keep("index.html", r); }).catch(function () { return caches.match("index.html"); })); return; }
    e.respondWith(caches.match(req).then(function (hit) { return hit || fetch(req).then(function (r) { return keep(req, r); }); }));
  } else if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(caches.match(req).then(function (hit) { return hit || fetch(req).then(function (r) { return keep(req, r); }); }));
  }
});
""")
open("site_pkg/HOW-TO-UPDATE.txt", "w").write("APSSB Maths & Reasoning Practice by Amarjeet Sir - website files\n\nPUT IT ON NORTHEASTPSC.CO.IN (for the person who manages the website)\n1. Open the hosting control panel (for example cPanel) and go to File Manager > public_html.\n2. Open the folder maths-by-amarjeet-sir (create it if it is not there) and delete the old placeholder index.html.\n3. Upload this zip into that folder, then right-click it and choose Extract.\n4. index.html, images, sw.js and manifest.webmanifest must sit directly inside maths-by-amarjeet-sir, not inside another folder.\n5. Open https://northeastpsc.co.in/maths-by-amarjeet-sir/ to check.\nFor an update, extract the new zip the same way and replace the old files. Students' phones pick up the new version on their own.\n\nOR PUT IT ONLINE FREE (on a laptop or computer)\nNetlify: open app.netlify.com/drop, sign up free, drag this zip into the box, then change the site name.\nCloudflare Pages: dash.cloudflare.com > Workers & Pages > Create application > Drag and drop your files. Name the project, drop this zip and choose Deploy site.\n")
zp = "dist/APSSB Maths & Reasoning Practice by Amarjeet Sir - website.zip"
with zipfile.ZipFile(zp, "w", zipfile.ZIP_DEFLATED) as z:
    for root, _, fs in os.walk("site_pkg"):
        for f in fs:
            full = os.path.join(root, f); z.write(full, os.path.relpath(full, "site_pkg"))
print("inline KB", len(inline.encode()) // 1024, "| website index KB", len(files.encode()) // 1024, "| zip KB", os.path.getsize(zp) // 1024, "| Claude mentions", inline.count("Claude"))
