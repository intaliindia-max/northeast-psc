(function () {
  "use strict";
  const DATA = JSON.parse(document.getElementById("quiz-data").textContent);
  const TOPICS = DATA.topics, IMAGES = DATA.images;
  const BY_SLUG = {};
  TOPICS.forEach(function (t, i) { t.index = i; t.pyq = t.pyq || []; BY_SLUG[t.slug] = t; });
  const LETTERS = ["A", "B", "C", "D"];
  const KEY = "apssb-basic-maths-v1";
  const QPER = 10, NBOOK = 10;
  const app = document.getElementById("app");
  const timerEl = document.getElementById("timer");
  let view = { screen: "home" };
  let popIndex = null, lastFocus = null, runningId = null;

  function pyqCount(t) { return Math.ceil(t.pyq.length / QPER); }
  function quizCount(t, kind) { return kind === "pyq" ? pyqCount(t) : NBOOK; }
  function info(t, kind, k) {
    const src = kind === "pyq" ? t.pyq : t.qs;
    const qs = src.slice((k - 1) * QPER, k * QPER);
    return { t: t, kind: kind, k: k, qs: qs, id: t.slug + "-" + (kind === "pyq" ? "pyq" : "quiz") + "-" + k,
      label: (kind === "pyq" ? "PYQ Quiz " : "Quiz ") + k, from: (k - 1) * QPER + 1, to: (k - 1) * QPER + qs.length };
  }
  function validAns(arr) {
    return Array.isArray(arr) && arr.length >= 1 && arr.length <= 100 && arr.every(function (x) { return x === null || (Number.isInteger(x) && x >= 0 && x < 4); });
  }
  function loadStore() {
    const s = { progress: {}, active: {}, mockRefs: {}, mockCount: 0 };
    try {
      const raw = JSON.parse(localStorage.getItem(KEY));
      if (raw && typeof raw === "object") {
        Object.keys(raw.progress || {}).forEach(function (k) { const p = raw.progress[k]; if (p && Number.isInteger(p.best) && validAns(p.lastAnswers)) s.progress[k] = p; });
        Object.keys(raw.active || {}).forEach(function (k) { const a = raw.active[k]; if (a && validAns(a.answers) && Number.isInteger(a.index) && a.index >= 0 && a.index < a.answers.length && typeof a.elapsed === "number") { a.resumedAt = null; s.active[k] = a; } });
      }
      if (raw && raw.mockRefs && typeof raw.mockRefs === "object") {
        Object.keys(raw.mockRefs).forEach(function (k) {
          const v = raw.mockRefs[k];
          if (/^mock-\d{1,3}$/.test(k) && Array.isArray(v) && v.length && v.every(function (r) { return Array.isArray(r) && r.length === 3 && TOPICS[r[0]] && (r[1] ? TOPICS[r[0]].pyq : TOPICS[r[0]].qs)[r[2]]; })) s.mockRefs[k] = v;
        });
      }
      if (raw && Number.isInteger(raw.mockCount)) s.mockCount = raw.mockCount;
    } catch (e) { /* start fresh */ }
    return s;
  }
  let store = loadStore();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) { /* storage unavailable */ } }
  // drop saved state whose length no longer matches the quiz (if content ever changes)
  function fits(id, n) {
    const p = store.progress[id], a = store.active[id];
    if (p && p.lastAnswers.length !== n) delete store.progress[id];
    if (a && a.answers.length !== n) delete store.active[id];
  }

  function strip(html) { return html.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">"); }
  function attr(s) { return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;"); }
  function clock(ms) { const t = Math.max(0, Math.floor(ms / 1000)); const m = Math.floor(t / 60), s = t % 60; return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s; }
  function duration(ms) { const t = Math.max(0, Math.round(ms / 1000)); const m = Math.floor(t / 60), s = t % 60; return m ? m + " min " + s + " s" : s + " s"; }
  function verdict(c, t) {
    if (c === t) return "Full marks. You know this set well.";
    if (c >= t - 2 && t >= 5) return "Excellent. Read the solutions for the ones you missed.";
    if (c >= Math.ceil(t / 2)) return "Good effort. Go through the solutions and try again.";
    return "Read the solutions below carefully, then retake this quiz.";
  }
  function elapsedOf(a) { return a.elapsed + (a.resumedAt ? Date.now() - a.resumedAt : 0); }
  function pauseRunning() {
    if (runningId && store.active[runningId] && store.active[runningId].resumedAt) {
      const a = store.active[runningId]; a.elapsed = elapsedOf(a); a.resumedAt = null; save();
    }
    runningId = null;
  }
  function fig(name) {
    const im = IMAGES[name];
    return im ? '<figure class="fig"><img src="' + im.src + '" alt="' + attr(im.alt) + '" width="' + im.w + '" height="' + im.h + '"></figure>' : "";
  }

  function topicDone(t) {
    let done = 0, total = NBOOK + pyqCount(t);
    for (let k = 1; k <= NBOOK; k++) if (store.progress[info(t, "book", k).id]) done++;
    for (let k = 1; k <= pyqCount(t); k++) if (store.progress[info(t, "pyq", k).id]) done++;
    return { done: done, total: total };
  }

  function practiceView() {
    let doneAll = 0, totalAll = 0, nq = 0, npyq = 0;
    const rows = TOPICS.map(function (t, i) {
      const d = topicDone(t); doneAll += d.done; totalAll += d.total; nq += t.qs.length; npyq += t.pyq.length;
      let minis = "";
      for (let k = 1; k <= NBOOK; k++) {
        const id = info(t, "book", k).id;
        minis += '<span class="mini' + (store.progress[id] ? " done" : store.active[id] ? " live" : "") + '"></span>';
      }
      return '<li><a class="topic" href="#' + t.slug + '"><span class="tnum" aria-hidden="true">' + (i + 1) + '</span><span class="tbody"><span class="tname">' + t.name +
        '</span><span class="tmeta"><span class="minis" aria-hidden="true">' + minis + '</span><span>' + d.done + ' of ' + d.total + ' quizzes done</span>' +
        (t.pyq.length ? '<span class="pyqtag">' + t.pyq.length + ' APSSB PYQs</span>' : "") + '</span></span></a></li>';
    }).join("");
    return '<section class="sheet hero" aria-labelledby="pagetitle">' +
      '<h1 id="pagetitle" tabindex="-1">Practice by topic</h1>' +
      '<p class="sub">Every question of the Basic Mathematics Practice Book as quizzes of 10, plus APSSB previous year questions, all with step-by-step solutions.</p>' +
      '<dl class="booklet"><div><dt>Topics</dt><dd>' + TOPICS.length + '</dd></div><div><dt>Quizzes</dt><dd>' + totalAll + '</dd></div><div><dt>Questions</dt><dd>' + (nq + npyq) + '</dd></div></dl>' +
      '<p class="overall">' + (doneAll ? "You have attempted " + doneAll + " of " + totalAll + " quizzes." : "Pick a topic to start. Your progress is saved on this phone.") + '</p>' +
      '</section>' + toolsBlock() + '<section class="sheet" aria-labelledby="topicshead"><h2 id="topicshead" class="sh">Topics</h2><ol class="topics">' + rows + '</ol></section>' +
      '<p class="cta">More practice tests are part of the <strong>APSSB Test Series at Northeast PSC</strong>.</p>' +
      (doneAll || Object.keys(store.active).length ? '<p class="reset"><button type="button" class="linkbtn" data-action="reset">Clear my progress</button></p>' : "");
  }


  const SITE = DATA.site;
  const SECTIONS = ["selections", "free-class", "marathons", "guidance", "batches", "reviews", "about", "classroom", "message", "books", "contact"];
  function waLink(text) { return "https://wa.me/" + SITE.wa + "?text=" + encodeURIComponent(text); }
  function pic(key, alt, cls, lazy) {
    const im = SITE.img[key];
    return '<img' + (cls ? ' class="' + cls + '"' : "") + ' src="' + im.src + '" alt="' + attr(alt) + '" width="' + im.w + '" height="' + im.h + '"' + (lazy ? ' loading="lazy" decoding="async"' : "") + '>';
  }
  function para(t) { return "<p>" + t + "</p>"; }
  function ext(href) { return 'href="' + href + '" target="_blank" rel="noopener"'; }
  function landingView() {
    const S = SITE;
    let nq = 0, nz = 0, npyq = 0;
    TOPICS.forEach(function (t) { nq += t.qs.length + t.pyq.length; nz += NBOOK + pyqCount(t); npyq += t.pyq.length; });
    const fmt = function (n) { return n.toLocaleString("en-IN"); };
    const stats = S.stats.map(function (s) { return '<div><dt>' + s[1] + '</dt><dd>' + s[0] + '</dd></div>'; }).join("");
    const posters = S.courses.map(function (c) {
      return '<figure class="poster">' + pic(c.img, c.alt, "", true) + '<figcaption><span class="pname">' + c.name + '</span><a class="btn primary" ' + ext(waLink(c.msg)) + '>Ask on WhatsApp</a></figcaption></figure>';
    }).join("");
    const zoomPic = function (g) { return '<button type="button" class="zoom" data-action="zoom" data-key="' + g[0] + '" aria-label="' + attr("Open photo: " + g[1]) + '">' + pic(g[0], g[1], "", true) + '</button>'; };
    const gallery = S.gallery.map(zoomPic).join("") ;
    const galleryMore = (S.galleryMore || []).map(zoomPic).join("");
    const centres = S.centres.map(function (c) { return '<li><span>' + c[0] + (c[3] ? '<small>' + c[3] + '</small>' : "") + '</span><a href="tel:+91' + c[2] + '">' + c[1] + '</a></li>'; }).join("");
    const books = S.books.map(function (b) {
      return '<li class="book">' + pic(b.img, b.name + " cover", "cover", true) + '<div><strong>' + b.name + '</strong><span>' + b.desc + '</span><span class="price">₹' + b.price + '</span><a class="btn" ' + ext(waLink(b.msg)) + '>Ask about this book</a></div></li>';
    }).join("");
    const sel = S.sel, v = S.video;
    const yrs = sel.years.map(function (y) {
      return '<div class="yr"><h3>' + y[0] + '</h3><ul class="hl">' + y[1].map(function (e) { return '<li><strong>' + e[1] + '</strong><span>' + e[0] + (e[2] ? '<em>' + e[2] + '</em>' : "") + (e[3] ? '<small>' + e[3] + '</small>' : "") + '</span></li>'; }).join("") + '</ul></div>';
    }).join("");
    const results = sel.posters.map(function (p) {
      return '<figure class="poster"><button type="button" class="zoom" data-action="zoom" data-key="' + p[0] + '" aria-label="Open the ' + attr(p[2]) + ' result poster">' + pic(p[0], p[1], "", true) + '</button><figcaption><span class="pname">' + p[2] + '</span></figcaption></figure>';
    }).join("");
    const player = v.embed
      ? '<div class="vframe"><iframe src="https://www.youtube-nocookie.com/embed/' + v.id + '" title="' + attr(v.title) + '" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>'
      : '<a class="vcard" ' + ext(v.url) + '><span class="play" aria-hidden="true">▶</span><span>' + v.title + '<small>10 hours, on YouTube</small></span></a>';
    const more = (S.moreClasses || []).map(function (m) { return '<a class="vcard vsmall" ' + ext(m.url) + '><span class="play" aria-hidden="true">▶</span><span>' + m.title + '<small>' + m.topicsText + '</small></span></a>'; }).join("");
    const demos = S.demos.map(function (d) { return '<a class="vcard vsmall" ' + ext(d.url) + '><span class="play" aria-hidden="true">▶</span><span>' + d.label + '<small>' + d.title + '</small></span></a>'; }).join("");
    return '<section class="sheet hero2" aria-labelledby="pagetitle">' + pic("hero", S.heroAlt, "heroimg", false) +
      '<div class="herobody"><h1 id="pagetitle" tabindex="-1">APSSB Maths &amp; Reasoning Practice</h1>' +
      '<p class="byline">' + pic("face", "Amarjeet Sir", "", false) + '<span>by Amarjeet Sir<small>Northeast PSC, Arunachal Pradesh</small></span></p>' +
      '<p class="sub">' + fmt(nq) + ' questions in ' + fmt(nz) + ' quizzes, each with a step-by-step solution: every question of the Basic Mathematics Practice Book and ' + fmt(npyq) + ' APSSB previous year questions.</p>' +
      '<div class="ctarow"><a class="btn primary" href="#practice">Start practice</a><a class="btn" ' + ext(waLink(S.joinMsg)) + '>Join a batch</a></div>' +
      '<p class="trust"><a href="#reviews">' + S.reviews.count + ' student reviews on Google</a></p>' +
      '<dl class="stats">' + stats + '</dl></div></section>' +
      '<section class="sheet sec" id="selections" aria-labelledby="h-sel"><h2 id="h-sel">Our selections</h2><p class="lead">' + sel.lead + '</p>' + recentHtml(sel) +
      pic(sel.banner, sel.bannerAlt, "selbanner", true) +
      (sel.toppers ? '<div class="toppers"><h3>' + sel.toppers.title + '</h3><ul>' + sel.toppers.names.map(function (n, i) { return '<li' + (i === 0 ? ' class="first"' : '') + '>' + n + '</li>'; }).join("") + '</ul></div>' : "") +
      '<div class="years">' + yrs + '</div><p class="tapnote">Tap a result poster to see it full size.</p><div class="posters">' + results + '</div></section>' +
      '<section class="sheet sec" id="free-class" aria-labelledby="h-free"><h2 id="h-free">Free classes on YouTube</h2><p class="lead">' + v.desc + '</p>' + player +
      '<div class="btnrow"><a class="btn primary block" ' + ext(v.url) + '>Watch the marathon on YouTube</a><a class="btn block" ' + ext(v.pdf) + '>Get the class PDF on Telegram</a></div>' +
      (more ? '<h3 class="demoh">More PYQ classes</h3><div class="demos">' + more + '</div>' : "") +
      '<h3 class="demoh">Demo lectures</h3><div class="demos">' + demos + '</div></section>' +
      '<section class="sheet sec" id="marathons" aria-labelledby="h-mar"><h2 id="h-mar">Marathon classes</h2><p class="lead">' + S.marathonLead + '</p>' +
      S.marathons.map(function (m) {
        return '<div class="mseries"><h3>' + m.title + '</h3><p class="mmeta">' + m.meta + '</p>' + (m.note ? '<p class="mnote">' + m.note + '</p>' : "") +
          splitHtml(m) + '<div class="days">' + m.days.map(function (d) { return '<a class="day" ' + ext("https://www.youtube.com/watch?v=" + d[1]) + ' aria-label="' + attr(m.title + ", day " + d[0] + " on YouTube") + '"><strong>Day ' + d[0] + '</strong><span>' + d[2] + '</span></a>'; }).join("") + '</div></div>';
      }).join("") + '</section>' +
      '<section class="sheet sec" id="guidance" aria-labelledby="h-guide"><h2 id="h-guide">Guidance and counselling</h2><p class="lead">' + S.guidance.lead + '</p><div class="demos">' +
      S.guidance.videos.map(function (g) { return '<a class="vcard vsmall" ' + ext(g.url) + '><span class="play" aria-hidden="true">▶</span><span>' + g.title + '<small>' + g.sub + '</small></span></a>'; }).join("") + '</div></section>' +
      '<section class="sheet sec" id="batches" aria-labelledby="h-batches"><h2 id="h-batches">Batches open now</h2><p class="lead">Ask about any batch on WhatsApp, or call the number on the poster.</p>' + featHtml(S.featured) + '<h3 class="batchsub">More APSSB batches</h3><div class="posters">' + posters + '</div>' + featHtml(S.csat) + '</section>' +
      '<section class="sheet sec" id="reviews" aria-labelledby="h-reviews"><h2 id="h-reviews">Student reviews</h2>' +
      '<p class="revcount"><span>' + S.reviews.count + '</span>reviews on Google</p>' +
      '<p class="lead">Students who have already joined Northeast PSC have written about the classes, the teachers and their selections. Read their reviews on Google before you decide.</p>' +
      '<a class="btn primary block" ' + ext(S.reviews.url) + '>Read reviews on Google</a></section>' +
      '<section class="sheet sec" id="about" aria-labelledby="h-about"><h2 id="h-about">About Amarjeet Sir</h2>' + pic("portrait", "Amarjeet Sir", "portrait", true) + para(S.about) + '<figure class="team">' + S.teamPhotos.map(function (t) { return pic(t[0], t[1], "", true); }).join("") + '<figcaption>' + S.teamCaption + '</figcaption></figure></section>' +
      '<section class="sheet sec" id="classroom" aria-labelledby="h-class"><h2 id="h-class">In the classroom</h2><p class="tapnote">Tap a photo to see it full size.</p><div class="gallery">' + gallery + '</div>' +
      (galleryMore ? '<details class="more"><summary>More class photos</summary><div class="gallery">' + galleryMore + '</div></details>' : "") + '</section>' +
      '<section class="sheet sec" id="message" aria-labelledby="h-msg"><div class="msghead">' + pic("avatar", "Illustration of Amarjeet Sir", "", true) + '<h2 id="h-msg">Message from Amarjeet Sir</h2></div>' +
      S.message.slice(0, 2).map(para).join("") + '<details class="more"><summary>Read the full message</summary>' + S.message.slice(2).map(para).join("") + '</details></section>' +
      '<section class="sheet sec" id="books" aria-labelledby="h-books"><h2 id="h-books">Books by Amarjeet Sir</h2><ul class="books">' + books + '</ul></section>' +
      '<section class="sheet sec" id="contact" aria-labelledby="h-contact"><h2 id="h-contact">Contact</h2><ul class="centres">' + centres + '</ul><a class="btn primary block" ' + ext(waLink(S.joinMsg)) + '>Message on WhatsApp</a>' +
      '<p class="appline">Northeast PSC app: install <a ' + ext(S.app.url) + '>Classplus</a> and enter org code <strong>' + S.app.code + '</strong>.</p>' +
      '<p class="follow">' + S.follow.map(function (f) { return '<a ' + ext(f[1]) + '>' + f[0] + '</a>'; }).join("") + '</p></section>' +
      '<footer class="foot">' + pic("logo", "Northeast PSC: One Stop Destination for Aspiring Officers", "footlogo", true) + '<p>Northeast PSC, Arunachal Pradesh</p></footer>';
  }
  function topicVideos(slug) {
    const out = [], pv = SITE.pyqVideo[slug];
    if (pv) out.push({ url: "https://www.youtube.com/watch?v=" + SITE.video.id + "&t=" + pv[0] + "s", text: "10-hour PYQ marathon (from " + pv[1] + ")" });
    (SITE.moreClasses || []).forEach(function (m) { if (m.topics.indexOf(slug) >= 0) out.push({ url: m.url, text: m.short }); });
    return out;
  }
  function pyqVideoLink(t) {
    const v = topicVideos(t.slug);
    return v.length ? '<p class="setvideo">Watch Amarjeet Sir solve these PYQs on YouTube: ' + v.map(function (x) { return '<a ' + ext(x.url) + '>' + x.text + '</a>'; }).join(" or ") + '</p>' : "";
  }
  function openZoom(key) {
    const im = SITE.img[key];
    if (!im || document.querySelector(".overlay")) return;
    lastFocus = document.activeElement;
    document.body.insertAdjacentHTML("beforeend", '<div class="overlay zoombox" role="dialog" aria-modal="true" aria-label="Full size photo"><img src="' + im.src + '" alt=""><button type="button" class="btn primary" data-action="cancel">Close</button></div>');
    const b = document.querySelector('.zoombox [data-action="cancel"]');
    if (b) b.focus();
  }
  const MOCK = { count: 25, pyq: 15, marks: 2, minutes: 30 };
  const MOCKT = { slug: "mock", name: "Mock test", index: -1, sections: [], qs: [], pyq: [] };
  let installEvt = null;
  function mockInfo(n) {
    const id = "mock-" + n, refs = store.mockRefs[id];
    const qs = refs.map(function (r) { const t = TOPICS[r[0]]; return Object.assign({ _t: t }, (r[1] ? t.pyq : t.qs)[r[2]]); });
    return { t: MOCKT, kind: "mock", k: n, qs: qs, id: id, label: "Mock test " + n, from: 1, to: qs.length };
  }
  function newMock() {
    const pool = [];
    TOPICS.forEach(function (t, ti) {
      t.qs.forEach(function (_, qi) { pool.push([ti, 0, qi]); });
      t.pyq.forEach(function (_, qi) { pool.push([ti, 1, qi]); });
    });
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp; }
    const picked = [], per = {}, used = {};
    let npyq = 0;
    const take = function (r) { picked.push(r); per[r[0]] = (per[r[0]] || 0) + 1; used[r.join(",")] = 1; if (r[1]) npyq++; };
    pool.forEach(function (r) {
      if (picked.length >= MOCK.count || (per[r[0]] || 0) >= 2) return;
      if (r[1] && npyq >= MOCK.pyq) return;
      if (!r[1] && picked.length - npyq >= MOCK.count - MOCK.pyq) return;
      take(r);
    });
    pool.forEach(function (r) { if (picked.length < MOCK.count && !used[r.join(",")]) take(r); });
    for (let i = picked.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const tmp = picked[i]; picked[i] = picked[j]; picked[j] = tmp; }
    store.mockCount = (store.mockCount || 0) + 1;
    store.mockRefs["mock-" + store.mockCount] = picked;
    save();
    location.hash = "mock-" + store.mockCount;
  }
  function mockView() {
    const hist = [];
    for (let n = store.mockCount || 0; n >= 1; n--) {
      const id = "mock-" + n, refs = store.mockRefs[id];
      if (!refs) continue;
      const p = store.progress[id], a = store.active[id];
      hist.push('<li><a href="#' + id + '">Mock test ' + n + '</a><span>' + (a ? "In progress" : p ? "Best " + (p.best * MOCK.marks) + "/" + (refs.length * MOCK.marks) : "Not finished") + '</span></li>');
    }
    return '<p class="crumb"><a href="#practice">Practice</a></p><section class="sheet" aria-labelledby="pagetitle"><h1 id="pagetitle" class="tt" tabindex="-1">Mock test</h1>' +
      '<p class="sub">An exam-style Maths section with questions from every topic.</p>' +
      '<dl class="booklet"><div><dt>Questions</dt><dd>' + MOCK.count + '</dd></div><div><dt>Maximum marks</dt><dd>' + (MOCK.count * MOCK.marks) + '</dd></div><div><dt>Time</dt><dd>' + MOCK.minutes + ' min</dd></div></dl>' +
      '<p class="note">Built on the Maths (Arithmetical and Numerical Ability) section of APSSB CHSL and CGL: 25 questions of 2 marks each and no negative marking. Each test picks a fresh mix of ' + MOCK.pyq + ' APSSB PYQs and ' + (MOCK.count - MOCK.pyq) + ' book questions. The test submits itself when the time runs out.</p>' +
      '<button type="button" class="btn primary block" data-action="newmock">Start a new mock test</button>' +
      (hist.length ? '<h2 class="setname">Your mock tests</h2><ul class="mocklist">' + hist.join("") + '</ul>' : "") + '</section>';
  }
  function mockBreakdown(q, p) {
    const by = {};
    q.qs.forEach(function (x, j) {
      const n = x._t.name; by[n] = by[n] || [0, 0]; by[n][1]++;
      if (p.lastAnswers[j] === x.k) by[n][0]++;
    });
    return '<h2 class="setname">Topic-wise result</h2><ul class="mocklist">' + Object.keys(by).map(function (n) { return '<li><span>' + n + '</span><span>' + by[n][0] + '/' + by[n][1] + '</span></li>'; }).join("") + '</ul>';
  }
  function topicStats() {
    const rows = TOPICS.map(function (t) { return { t: t, att: 0, cor: 0, quizzes: 0 }; });
    TOPICS.forEach(function (t, ti) {
      const sets = [];
      for (let k = 1; k <= NBOOK; k++) sets.push(info(t, "book", k));
      for (let k = 1; k <= pyqCount(t); k++) sets.push(info(t, "pyq", k));
      sets.forEach(function (q) {
        const p = store.progress[q.id];
        if (!p) return;
        rows[ti].quizzes++;
        p.lastAnswers.forEach(function (x, j) { if (x === null || j >= q.qs.length) return; rows[ti].att++; if (x === q.qs[j].k) rows[ti].cor++; });
      });
    });
    Object.keys(store.mockRefs || {}).forEach(function (id) {
      const p = store.progress[id], refs = store.mockRefs[id];
      if (!p) return;
      p.lastAnswers.forEach(function (x, j) {
        const r = refs[j];
        if (x === null || !r) return;
        rows[r[0]].att++;
        if (x === (r[1] ? TOPICS[r[0]].pyq : TOPICS[r[0]].qs)[r[2]].k) rows[r[0]].cor++;
      });
    });
    rows.forEach(function (r) { r.acc = r.att ? Math.round(r.cor * 100 / r.att) : null; });
    return rows;
  }
  function reportView() {
    const rows = topicStats();
    let att = 0, cor = 0, quizzes = 0, total = 0;
    rows.forEach(function (r) { att += r.att; cor += r.cor; quizzes += r.quizzes; total += NBOOK + pyqCount(r.t); });
    const head = '<p class="crumb"><a href="#practice">Practice</a></p><section class="sheet" aria-labelledby="pagetitle"><h1 id="pagetitle" class="tt" tabindex="-1">My report</h1>';
    if (!att) return head + '<p class="sub">Attempt a few quizzes and your report will appear here, with your accuracy in every topic and what to revise first.</p><a class="btn primary block" href="#practice">Start practising</a></section>';
    const label = function (a) { return a === null ? ["", "Not started"] : a >= 80 ? ["good", "Strong"] : a >= 50 ? ["ok", "Getting there"] : ["low", "Needs work"]; };
    const weak = rows.filter(function (r) { return r.att >= 5 && r.acc < 80; }).sort(function (a, b) { return a.acc - b.acc; }).slice(0, 3);
    const weakHtml = weak.length ? '<h2 class="setname">Revise these first</h2><ul class="weak">' + weak.map(function (r) {
      const pv = topicVideos(r.t.slug)[0];
      return '<li><a href="#' + r.t.slug + '"><strong>' + r.t.name + '</strong></a><span>' + r.acc + '% correct in ' + r.att + ' questions</span>' +
        (pv ? '<a class="small" ' + ext(pv.url) + '>Watch Sir’s PYQ class on this topic</a>' : "") + '</li>';
    }).join("") + '</ul>' : '<p class="note">No weak topic yet. Keep going and try a mock test to check yourself across all topics.</p>';
    const list = rows.map(function (r) {
      const l = label(r.acc);
      return '<li><a href="#' + r.t.slug + '">' + r.t.name + '</a><span class="bar" aria-hidden="true"><span class="' + l[0] + '" style="width:' + (r.acc || 0) + '%"></span></span><span class="replbl ' + l[0] + '">' + (r.acc === null ? l[1] : r.acc + "% " + l[1]) + '</span></li>';
    }).join("");
    const names = weak.map(function (r) { return r.t.name; }).join(", ");
    const cta = '<div class="repcta"><p>' + (weak.length ? "Want Amarjeet Sir to teach " + names + " with you in class?" : "Want to learn every topic with Amarjeet Sir?") + '</p><a class="btn primary block" ' +
      ext(waLink(weak.length ? "Hello Sir, I need help with " + names + ". I want to join the Online Maths Batch." : (SITE.featured || SITE.courses[0]).msg)) + '>Ask about the batch on WhatsApp</a></div>';
    return head + '<p class="sub">Based on your latest attempt of every quiz and mock test on this phone.</p>' +
      '<dl class="booklet"><div><dt>Questions attempted</dt><dd>' + att + '</dd></div><div><dt>Accuracy</dt><dd>' + Math.round(cor * 100 / att) + '%</dd></div><div><dt>Quizzes done</dt><dd>' + quizzes + '/' + total + '</dd></div></dl>' +
      weakHtml + '<h2 class="setname">All topics</h2><ul class="replist">' + list + '</ul>' + cta + '</section>';
  }
  function toolsBlock() {
    return '<section class="sheet tools" aria-label="Mock test and report"><a class="toolcard" href="#mock"><strong>Mock test</strong><span>' + MOCK.count + ' questions from all topics in ' + MOCK.minutes + ' minutes, exam style</span></a>' +
      '<a class="toolcard" href="#report"><strong>My report</strong><span>Your accuracy in every topic and what to revise first</span></a>' +
      (installEvt ? '<button type="button" class="btn block" data-action="install">Install as an app (works offline)</button>' : "") + '</section>';
  }
  function shareScore() {
    const q = view.q, p = q ? store.progress[q.id] : null;
    if (!p) return;
    let c = 0;
    q.qs.forEach(function (x, j) { if (p.lastAnswers[j] === x.k) c++; });
    const score = q.kind === "mock" ? (c * MOCK.marks) + "/" + (q.qs.length * MOCK.marks) + " marks" : c + "/" + q.qs.length;
    const where = q.kind === "mock" ? "an APSSB-style Maths mock test" : q.t.name + ", " + q.label;
    const url = SITE.siteUrl || location.href.split("#")[0];
    const text = "I scored " + score + " in " + where + " on APSSB Maths & Reasoning Practice by Amarjeet Sir. Practise free with step-by-step solutions: " + url;
    if (typeof navigator !== "undefined" && navigator.share) navigator.share({ text: text }).catch(function () {});
    else window.open("https://wa.me/?text=" + encodeURIComponent(text), "_blank", "noopener");
  }
  function recentHtml(sel) {
    const r = sel.recent;
    if (!r) return "";
    return '<div class="recent"><h3>' + r.title + '</h3><div class="rgrid">' + r.people.map(function (p) {
      return '<figure' + (p[5] ? ' class="wide"' : "") + '><button type="button" class="zoom" data-action="zoom" data-key="' + p[0] + '" aria-label="' + attr("Open the poster of " + p[1]) + '">' + pic(p[0], p[4], "", true) + '</button>' +
        '<figcaption><strong>' + p[1] + '</strong><span class="rk">' + p[2] + '</span><span>' + p[3] + '</span></figcaption></figure>';
    }).join("") + '</div>' + (r.quote ? '<blockquote class="tquote">“' + r.quote + '”<cite>' + r.quoteBy + '</cite></blockquote>' : "") + '</div>';
  }
  function featHtml(f) {
    if (!f) return "";
    return '<div class="feat"><p class="ftag">' + f.tag + '</p><div class="fgrid"><button type="button" class="zoom" data-action="zoom" data-key="' + f.img + '" aria-label="' + attr("Open the poster: " + f.name) + '">' + pic(f.img, f.alt, "", true) + '</button>' +
      '<div class="finfo"><h3>' + f.name + '</h3><p class="fprice">Fee <s>₹' + f.was + '</s><strong>₹' + f.price + '</strong></p>' + (f.note ? '<p class="fnote">' + f.note + '</p>' : "") +
      '<ul class="ffeat">' + f.points.map(function (x) { return '<li>' + x + '</li>'; }).join("") + '</ul>' +
      '<a class="btn primary block" ' + ext(waLink(f.msg)) + '>Join on WhatsApp</a><a class="btn block" href="tel:+91' + f.call + '">Call ' + f.callShow + '</a></div></div></div>';
  }
  function splitHtml(m) {
    if (!m.split) return "";
    return m.split.map(function (s) {
      return '<div class="sday"><p><strong>Day ' + s.day + '</strong> <span>' + s.date + ', one video per subject</span></p><div class="days">' +
        s.parts.map(function (p) { return '<a class="day" ' + ext("https://www.youtube.com/watch?v=" + p[1]) + ' aria-label="' + attr(m.title + ", day " + s.day + ", " + p[0] + " on YouTube") + '"><strong>' + p[0] + '</strong><span>' + p[2] + '</span></a>'; }).join("") + '</div></div>';
    }).join("") + '<p class="sday"><strong>Day 3 to 10</strong> <span>one full-day video each</span></p>';
  }
  function adBlock() {
    const c = SITE.featured || SITE.courses[0];
    return '<section class="sheet adbox" aria-labelledby="adh"><h2 id="adh">Learn every topic with Amarjeet Sir</h2>' +
      '<a class="adimg" ' + ext(waLink(c.msg)) + '>' + pic(c.img, c.alt, "", true) + '</a>' +
      (c.price ? '<p class="fprice">' + c.name + ': <s>₹' + c.was + '</s><strong>₹' + c.price + '</strong></p>' : "") +
      '<div class="btnrow"><a class="btn primary block" ' + ext(waLink(c.msg)) + '>Join this batch on WhatsApp</a><a class="btn block" href="tel:+91' + SITE.phone + '">Call ' + SITE.phoneShow + '</a></div></section>';
  }
  function updateNav() {
    if (!document.querySelectorAll) return;
    const cur = view.screen === "home" ? (view.section || "home") : (view.screen === "mock" || (view.q && view.q.kind === "mock")) ? "mock" : view.screen === "report" ? "report" : "practice";
    document.querySelectorAll(".nav a").forEach(function (a) {
      if (a.getAttribute("data-nav") === cur) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
  }

  function card(q) {
    const p = store.progress[q.id], a = store.active[q.id];
    let minis = "";
    for (let j = 0; j < q.qs.length; j++) {
      let cls = "mini";
      if (a) { if (a.answers[j] !== null) cls += " done"; }
      else if (p) { const x = p.lastAnswers[j]; cls += x === null ? " skip" : (x === q.qs[j].k ? " ok" : " no"); }
      minis += '<span class="' + cls + '"></span>';
    }
    const n = q.qs.length;
    const label = a ? "In progress" : p ? "Best " + p.best + "/" + n : "Not attempted";
    const range = q.kind === "pyq" ? n + (n === 1 ? " question" : " questions") : "Questions " + q.from + "–" + q.to;
    return '<a class="qcard" href="#' + q.id + '" aria-label="' + q.label + ', ' + range + '. ' + (a ? "In progress" : p ? "Best score " + p.best + " out of " + n : "Not attempted") + '">' +
      '<span class="qt">' + q.label + '</span><span class="qr">' + range + '</span><span class="minis" aria-hidden="true">' + minis + '</span>' +
      '<span class="qs' + (a ? " live" : p ? " best" : "") + '" aria-hidden="true">' + label + '</span></a>';
  }

  function topicView(t) {
    let book = "", pyq = "";
    for (let k = 1; k <= NBOOK; k++) book += card(info(t, "book", k));
    for (let k = 1; k <= pyqCount(t); k++) pyq += card(info(t, "pyq", k));
    return '<p class="crumb"><a href="#practice">All topics</a></p><section class="sheet" aria-labelledby="pagetitle">' +
      '<h1 id="pagetitle" class="tt" tabindex="-1">' + t.name + '</h1><p class="sub">' + t.chapter + ' of the book.</p>' +
      '<h2 class="setname">Book quizzes</h2><p class="setnote">10 quizzes of 10 questions each.</p><div class="quizzes">' + book + '</div>' +
      (t.pyq.length ? '<h2 class="setname">APSSB PYQ quizzes</h2><p class="setnote">' + t.pyq.length + ' previous year questions from APSSB exams.</p>' + pyqVideoLink(t) + '<div class="quizzes">' + pyq + '</div>' : "") +
      '</section>';
  }

  function quizView(q) {
    const a = store.active[q.id], qs = q.qs;
    const i = a.index, x = qs[i], chosen = a.answers[i], last = i === qs.length - 1;
    let cells = "";
    for (let j = 0; j < qs.length; j++) {
      const done = a.answers[j] !== null;
      cells += '<button type="button" class="cell' + (done ? " answered" : "") + (j === i ? " current" : "") + '" data-action="goto" data-i="' + j + '" aria-label="Question ' + (j + 1) + ', ' + (done ? "answered" : "not answered") + '"' + (j === i ? ' aria-current="step"' : "") + '>' + (j + 1) + '</button>';
    }
    const opts = x.o.map(function (o, j) {
      const on = chosen === j;
      return '<button type="button" class="opt" role="radio" aria-checked="' + on + '" data-action="pick" data-i="' + j + '" aria-label="Option ' + LETTERS[j] + ': ' + attr(strip(o)) + '"><span class="bubble' + (on && popIndex === j ? " pop" : "") + '" aria-hidden="true">' + LETTERS[j] + '</span><span class="otext" aria-hidden="true">' + o + '</span></button>';
    }).join("");
    return '<p class="crumb"><a href="#' + q.t.slug + '">' + q.t.name + '</a> <span aria-hidden="true">/</span> ' + q.label + '</p>' +
      '<nav class="palette" aria-label="Jump to a question">' + cells + '</nav>' +
      '<section class="sheet q" aria-label="Question ' + (i + 1) + ' of ' + qs.length + '">' +
      (x.y && q.kind !== "mock" ? '<p class="srcline">' + x.y + '</p>' : "") +
      (x.pre ? '<p class="pre">' + x.pre + '</p>' : "") + (x.img && x.ip === "before" ? fig(x.img) : "") +
      '<h2 class="qtext" id="qhead" tabindex="-1"><span class="qno">Q' + (i + 1) + '.</span> ' + x.t + '</h2>' +
      (x.img && x.ip !== "before" ? fig(x.img) : "") +
      '<div class="options" role="radiogroup" aria-labelledby="qhead">' + opts + '</div>' +
      '<p class="hint" aria-live="polite">' + (chosen === null ? "" : "Marked " + LETTERS[chosen] + ". Tap it again to clear.") + '</p></section>' +
      '<div class="bottombar"><div class="bottombar-in"><button type="button" class="btn" data-action="prev"' + (i === 0 ? " disabled" : "") + '>Previous</button>' +
      '<button type="button" class="btn primary" data-action="' + (last ? "submit" : "next") + '">' + (last ? "Submit quiz" : "Next question") + '</button></div></div>';
  }

  function reviewItem(t, q, j, x) {
    const skip = x === null, ok = x === q.k;
    const status = skip ? '<span class="status skip">Not attempted</span>' : ok ? '<span class="status ok">✓ Correct</span>' : '<span class="status no">✗ Wrong</span>';
    const long = q.o.some(function (o) { return strip(o).length > 22; });
    const opts = q.o.map(function (o, m) {
      let cls = "ropt", tag = "", note = "";
      if (m === q.k) { cls += " correct"; tag = '<span class="tag" aria-hidden="true">✓</span>'; note = m === x ? " (your answer, correct)" : " (correct answer)"; }
      else if (m === x) { cls += " wrong"; tag = '<span class="tag" aria-hidden="true">✗</span>'; note = " (your answer)"; }
      return '<div class="' + cls + '"><span class="bubble sm" aria-hidden="true">' + LETTERS[m] + '</span><span class="rtext"><span class="sr">Option ' + LETTERS[m] + ': </span>' + o + '<span class="sr">' + note + '</span></span>' + tag + '</div>';
    }).join("");
    const line = skip ? "You did not attempt this. Correct answer: " + LETTERS[q.k] + "." : ok ? "You marked " + LETTERS[q.k] + "." : "You marked " + LETTERS[x] + ". Correct answer: " + LETTERS[q.k] + ".";
    const sec = q.c !== null && q.c !== undefined ? (q._t || t).sections[q.c] : null;
    const src = (q._t ? q._t.name + ", " : "") + (q.b ? "Book Q. " + q.b : (q.y || ""));
    return '<article class="ritem"><div class="rhead"><h3 class="rtopic"><span class="qno">Q' + (j + 1) + '.</span> <span class="bookq">' + src + '</span></h3>' + status + '</div>' +
      (q.pre ? '<p class="pre">' + q.pre + '</p>' : "") + (q.img && q.ip === "before" ? fig(q.img) : "") +
      '<p class="rq">' + q.t + '</p>' + (q.img && q.ip !== "before" ? fig(q.img) : "") +
      '<div class="ropts' + (long ? " long" : "") + '">' + opts + '</div><p class="rline">' + line + '</p>' +
      '<div class="solution"><h4>Solution</h4><ol class="steps">' + q.s.map(function (s) { return "<li>" + s + "</li>"; }).join("") + '</ol>' +
      (sec && sec.k ? '<details class="key"><summary>Key idea</summary><p>' + sec.k + '</p></details>' : "") + '</div></article>';
  }

  function nextOf(q) {
    if (q.kind === "mock") return { href: "#mock", label: "Back to mock tests" };
    const t = q.t, nt = TOPICS[t.index + 1];
    if (q.kind === "book" && q.k < NBOOK) return { href: "#" + info(t, "book", q.k + 1).id, label: "Next quiz" };
    if (q.kind === "book" && pyqCount(t)) return { href: "#" + info(t, "pyq", 1).id, label: "Start PYQ Quiz 1" };
    if (q.kind === "pyq" && q.k < pyqCount(t)) return { href: "#" + info(t, "pyq", q.k + 1).id, label: "Next PYQ quiz" };
    return nt ? { href: "#" + nt.slug, label: "Next topic: " + nt.name } : { href: "#practice", label: "All topics" };
  }

  function resultView(q) {
    const p = store.progress[q.id], qs = q.qs, t = q.t;
    let c = 0, w = 0, s = 0;
    qs.forEach(function (x, j) { const a = p.lastAnswers[j]; if (a === null) s++; else if (a === x.k) c++; else w++; });
    const nx = nextOf(q);
    const sub = q.kind === "mock" ? "Maths section, " + qs.length + " questions, 2 marks each, no negative marking" : q.kind === "pyq" ? t.name + ", " + q.label + " (APSSB previous year questions)" : t.name + ", " + q.label + " (book questions " + q.from + "–" + q.to + ")";
    return '<p class="crumb"><a href="#' + t.slug + '">' + t.name + '</a> <span aria-hidden="true">/</span> ' + q.label + '</p>' +
      '<section class="sheet result" aria-labelledby="pagetitle"><h1 id="pagetitle" tabindex="-1">Your result</h1>' +
      '<p class="cand">' + sub + '</p>' +
      '<div class="score" role="img" aria-label="Score ' + c + ' out of ' + qs.length + '"><svg viewBox="0 0 230 130" aria-hidden="true"><path pathLength="1" d="M158 22 C106 8 34 22 26 62 C19 101 86 121 148 113 C205 105 220 70 206 42 C195 21 158 11 110 16"/></svg>' +
      '<span class="score-text" aria-hidden="true">' + (q.kind === "mock" ? (c * MOCK.marks) + '<small>/' + (qs.length * MOCK.marks) : c + '<small>/' + qs.length) + '</small></span></div>' +
      '<p class="verdict">' + verdict(c, qs.length) + '</p>' +
      '<p class="tally">' + c + ' correct, ' + w + ' wrong, ' + s + ' not attempted. Time taken: ' + duration(p.lastTime) + '. Best score: ' + p.best + '/' + qs.length + '.</p>' +
      '<div class="btnrow"><a class="btn primary block" href="' + nx.href + '">' + nx.label + '</a><button type="button" class="btn block share" data-action="share">Share my score on WhatsApp</button><button type="button" class="btn block" data-action="retake">' + (q.kind === "mock" ? "Retake this mock test" : "Retake this quiz") + '</button><a class="btn block" href="#report">See my report</a></div>' +
      (q.kind === "mock" ? mockBreakdown(q, p) : "") +
      '<a class="backlink" href="#' + t.slug + '">Back to ' + t.name + '</a></section>' + adBlock() +
      '<section class="sheet review" aria-labelledby="ktitle"><h2 id="ktitle">Answer key with solutions</h2>' +
      qs.map(function (x, j) { return reviewItem(t, x, j, p.lastAnswers[j]); }).join("") + '</section>';
  }

  function tick() {
    const a = runningId ? store.active[runningId] : null;
    if (a && runningId.indexOf("mock-") === 0) {
      const left = MOCK.minutes * 60000 - elapsedOf(a);
      timerEl.hidden = false; timerEl.textContent = clock(Math.max(0, left));
      if (timerEl.classList) timerEl.classList.toggle("low", left < 300000);
      if (left <= 0 && view.screen === "quiz" && view.q && view.q.id === runningId && view.mode !== "result") finish();
    }
    else if (a) { timerEl.hidden = false; timerEl.textContent = clock(elapsedOf(a)); if (timerEl.classList) timerEl.classList.remove("low"); }
    else timerEl.hidden = true;
  }

  function render() {
    let html;
    if (view.screen === "topic") html = topicView(view.topic);
    else if (view.screen === "quiz") html = view.mode === "result" ? resultView(view.q) : quizView(view.q);
    else if (view.screen === "practice") html = practiceView();
    else if (view.screen === "mock") html = mockView();
    else if (view.screen === "report") html = reportView();
    else html = landingView();
    document.body.setAttribute("data-screen", view.screen === "quiz" && view.mode !== "result" ? "quiz" : view.screen);
    app.innerHTML = html;
    updateNav();
    tick();
  }

  function parseHash() {
    let h = location.hash.replace(/^#/, "");
    try { h = decodeURIComponent(h); } catch (e) { h = ""; }
    const m = h.match(/^([a-z-]+)-(quiz|pyq)-(\d{1,2})$/);
    if (m && BY_SLUG[m[1]]) {
      const t = BY_SLUG[m[1]], kind = m[2] === "pyq" ? "pyq" : "book", k = Number(m[3]);
      if (k >= 1 && k <= quizCount(t, kind)) return { screen: "quiz", topic: t, q: info(t, kind, k) };
    }
    if (h === "practice") return { screen: "practice" };
    if (h === "mock") return { screen: "mock" };
    if (h === "report") return { screen: "report" };
    const mm = h.match(/^mock-(\d{1,3})$/);
    if (mm && store.mockRefs["mock-" + mm[1]]) return { screen: "quiz", topic: MOCKT, q: mockInfo(Number(mm[1])) };
    if (SECTIONS.indexOf(h) >= 0) return { screen: "home", section: h };
    if (BY_SLUG[h]) return { screen: "topic", topic: BY_SLUG[h] };
    return { screen: "home" };
  }

  function startAttempt(q) {
    store.active[q.id] = { answers: new Array(q.qs.length).fill(null), index: 0, elapsed: 0, resumedAt: Date.now() };
    runningId = q.id; save();
  }

  function focusTop(id) {
    window.scrollTo(0, 0);
    const h = document.getElementById(id) || document.getElementById("pagetitle");
    if (h) h.focus({ preventScroll: true });
  }

  function route() {
    closeDialog(true);
    pauseRunning();
    view = parseHash();
    if (view.screen === "quiz") {
      const q = view.q;
      fits(q.id, q.qs.length);
      if (store.active[q.id]) { store.active[q.id].resumedAt = Date.now(); runningId = q.id; view.mode = "quiz"; save(); }
      else if (store.progress[q.id]) view.mode = "result";
      else { startAttempt(q); view.mode = "quiz"; }
    }
    render();
    if (view.section) { const sec = document.getElementById(view.section); if (sec && sec.scrollIntoView) { sec.scrollIntoView({ block: "start" }); return; } }
    focusTop("qhead");
  }

  function goQuestion(j) {
    const a = store.active[runningId];
    if (!a || j < 0 || j >= a.answers.length) return;
    a.index = j; save(); render(); focusTop("qhead");
  }

  function finish() {
    const q = view.q, a = store.active[q.id];
    if (!a) return;
    let c = 0;
    q.qs.forEach(function (x, j) { if (a.answers[j] === x.k) c++; });
    const prev = store.progress[q.id];
    store.progress[q.id] = { best: prev ? Math.max(prev.best, c) : c, last: c, attempts: (prev ? prev.attempts || 1 : 0) + 1, lastAnswers: a.answers.slice(), lastTime: elapsedOf(a), lastAt: Date.now() };
    delete store.active[q.id];
    runningId = null; save();
    view.mode = "result"; render(); focusTop("pagetitle");
  }

  function openDialog(title, body, confirmLabel, cancelLabel, action) {
    if (document.querySelector(".overlay")) return;
    lastFocus = document.activeElement;
    document.body.insertAdjacentHTML("beforeend", '<div class="overlay"><div class="dialog" role="dialog" aria-modal="true" aria-labelledby="dtitle" aria-describedby="ddesc">' +
      '<h2 id="dtitle">' + title + '</h2><p id="ddesc">' + body + '</p><div class="row"><button type="button" class="btn" data-action="cancel">' + cancelLabel + '</button>' +
      '<button type="button" class="btn primary" data-action="' + action + '">' + confirmLabel + '</button></div></div></div>');
    const b = document.querySelector('.dialog [data-action="' + action + '"]');
    if (b) b.focus();
  }
  function closeDialog(silent) {
    const o = document.querySelector(".overlay");
    if (o) o.remove();
    if (!silent && lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
    lastFocus = null;
  }

  document.addEventListener("click", function (e) {
    if (e.target.classList && e.target.classList.contains("overlay")) { closeDialog(); return; }
    const el = e.target.closest ? e.target.closest("[data-action]") : null;
    if (!el || el.disabled) return;
    const act = el.getAttribute("data-action");
    const j = Number(el.getAttribute("data-i"));
    const a = runningId ? store.active[runningId] : null;
    switch (act) {
      case "pick": {
        if (!a) return;
        const cur = a.answers[a.index];
        a.answers[a.index] = cur === j ? null : j;
        popIndex = cur === j ? null : j;
        save(); render(); popIndex = null;
        const btn = app.querySelector('.opt[data-i="' + j + '"]');
        if (btn) btn.focus({ preventScroll: true });
        break;
      }
      case "goto": goQuestion(j); break;
      case "prev": if (a) goQuestion(a.index - 1); break;
      case "next": if (a) goQuestion(a.index + 1); break;
      case "submit": {
        if (!a) return;
        const answered = a.answers.filter(function (x) { return x !== null; }).length, n = a.answers.length;
        openDialog("Submit this quiz?", "You have answered " + answered + " of " + n + " questions." + (answered < n ? " Unanswered questions get 0 marks." : "") + " You cannot change answers after submitting.", "Submit quiz", "Keep answering", "confirm-submit");
        break;
      }
      case "confirm-submit": closeDialog(true); finish(); break;
      case "retake": startAttempt(view.q); view.mode = "quiz"; render(); focusTop("qhead"); break;
      case "reset":
        openDialog("Clear your progress?", "This removes all your scores and unfinished quizzes from this phone.", "Clear progress", "Keep progress", "confirm-reset");
        break;
      case "confirm-reset":
        closeDialog(true); store = { progress: {}, active: {}, mockRefs: {}, mockCount: 0 }; runningId = null; save(); render();
        break;
      case "cancel": closeDialog(); break;
      case "zoom": openZoom(el.getAttribute("data-key")); break;
      case "newmock": newMock(); break;
      case "share": shareScore(); break;
      case "install": if (installEvt) { installEvt.prompt(); installEvt = null; render(); } break;
    }
  });

  document.addEventListener("keydown", function (e) {
    const overlay = document.querySelector(".overlay");
    if (!overlay) return;
    if (e.key === "Escape") { closeDialog(); return; }
    if (e.key === "Tab") {
      const f = overlay.querySelectorAll("button");
      const first = f[0], lastBtn = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastBtn.focus(); }
      else if (!e.shiftKey && document.activeElement === lastBtn) { e.preventDefault(); first.focus(); }
    }
  });

  window.addEventListener("hashchange", route);
  window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); installEvt = e; if (view.screen === "practice") render(); });
  if (SITE.pwa && typeof navigator !== "undefined" && "serviceWorker" in navigator && location.protocol === "https:") {
    window.addEventListener("load", function () { navigator.serviceWorker.register("sw.js").catch(function () {}); });
  }
  window.addEventListener("pagehide", function () {
    if (runningId && store.active[runningId] && store.active[runningId].resumedAt) {
      const x = store.active[runningId]; x.elapsed = elapsedOf(x); x.resumedAt = Date.now(); save();
    }
  });
  document.addEventListener("visibilitychange", tick);
  route();
  setInterval(tick, 1000);
})();
