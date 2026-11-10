(function () {
  "use strict";
  const DATA = JSON.parse(document.getElementById("quiz-data").textContent);
  const TOPICS = DATA.topics, IMAGES = DATA.images;
  const BY_SLUG = {};
  TOPICS.forEach(function (t, i) { t.index = i; t.pyq = t.pyq || []; BY_SLUG[t.slug] = t; });
  const LETTERS = ["A", "B", "C", "D", "E"];
  const KEY = "apssb-basic-maths-v1";
  const QPER = 10, NBOOK = 10;
  const app = document.getElementById("app");
  const timerEl = document.getElementById("timer");
  let view = { screen: "home" };
  let popIndex = null, lastFocus = null, runningId = null;

  function pyqCount(t) { return Math.ceil(t.pyq.length / QPER); }
  function bookCount(t) { return Math.ceil(t.qs.length / QPER); }
  function subjOf(t) { return t.subject || "maths"; }
  function listOf(t, kind) { return kind === 1 ? t.pyq : kind === 2 ? (t.mq || []) : t.qs; }
  function qCount(t) { return t.qs.length + (subjOf(t) === "reasoning" ? 0 : t.pyq.length) + (t.mq ? t.mq.length : 0); }
  function subjName(s) { return s === "reasoning" ? "Reasoning" : "Maths"; }
  function quizCount(t, kind) { return kind === "pyq" ? pyqCount(t) : bookCount(t); }
  let subjectTab = "maths";
  const topicsOpen = { maths: false, reasoning: false };
  function info(t, kind, k) {
    const src = kind === "pyq" ? t.pyq : t.qs;
    const qs = src.slice((k - 1) * QPER, k * QPER);
    return { t: t, kind: kind, k: k, qs: qs, id: t.slug + "-" + (kind === "pyq" ? "pyq" : "quiz") + "-" + k,
      label: (kind === "pyq" ? "PYQ Quiz " : "Quiz ") + k, from: (k - 1) * QPER + 1, to: (k - 1) * QPER + qs.length };
  }
  function validAns(arr) {
    return Array.isArray(arr) && arr.length >= 1 && arr.length <= 100 && arr.every(function (x) { return x === null || (Number.isInteger(x) && x >= 0 && x < 5); });
  }
  function loadStore() {
    const s = { progress: {}, active: {}, mockRefs: {}, mockCount: 0, mistakes: {}, revRefs: {}, revCount: 0, qotd: { days: {}, streak: 0, best: 0, last: "" }, profile: { name: "" }, milestones: {}, pending: "", lead: null };
    try {
      const raw = JSON.parse(localStorage.getItem(KEY));
      if (raw && typeof raw === "object") {
        Object.keys(raw.progress || {}).forEach(function (k) { const p = raw.progress[k]; if (p && Number.isInteger(p.best) && validAns(p.lastAnswers)) s.progress[k] = p; });
        Object.keys(raw.active || {}).forEach(function (k) { const a = raw.active[k]; if (a && validAns(a.answers) && Number.isInteger(a.index) && a.index >= 0 && a.index < a.answers.length && typeof a.elapsed === "number") { a.resumedAt = null; s.active[k] = a; } });
      }
      if (raw && raw.mockRefs && typeof raw.mockRefs === "object") {
        Object.keys(raw.mockRefs).forEach(function (k) {
          const v = raw.mockRefs[k];
          if (/^mock-\d{1,3}$/.test(k) && Array.isArray(v) && v.length && v.every(function (r) { return Array.isArray(r) && r.length === 3 && TOPICS[r[0]] && listOf(TOPICS[r[0]], r[1])[r[2]]; })) s.mockRefs[k] = v;
        });
      }
      if (raw && Number.isInteger(raw.mockCount)) s.mockCount = raw.mockCount;
      if (raw && raw.revRefs && typeof raw.revRefs === "object") {
        Object.keys(raw.revRefs).forEach(function (k) {
          const v = raw.revRefs[k];
          if (/^rev-\d{1,3}$/.test(k) && Array.isArray(v) && v.length && v.every(function (r) { return Array.isArray(r) && r.length === 3 && TOPICS[r[0]] && listOf(TOPICS[r[0]], r[1])[r[2]]; })) s.revRefs[k] = v;
        });
      }
      if (raw && Number.isInteger(raw.revCount)) s.revCount = raw.revCount;
      if (raw && raw.mistakes && typeof raw.mistakes === "object") {
        Object.keys(raw.mistakes).forEach(function (k) { if (/^[a-z-]+:[bpm]:\d+$/.test(k)) s.mistakes[k] = 1; });
        s.mistakesReady = true;
      }
      if (raw && raw.profile && typeof raw.profile.name === "string") s.profile.name = raw.profile.name.slice(0, 60);
      if (raw && raw.lead && typeof raw.lead.name === "string" && /^[6-9]\d{9}$/.test(raw.lead.phone || "")) s.lead = { name: raw.lead.name.slice(0, 60), phone: raw.lead.phone, at: Number(raw.lead.at) || 0 };
      if (raw && raw.milestones && typeof raw.milestones === "object") {
        Object.keys(raw.milestones).forEach(function (k) { if (/^(q5|q20|mock1|streak3)$/.test(k) && Number.isFinite(raw.milestones[k])) s.milestones[k] = raw.milestones[k]; });
      }
      if (raw && typeof raw.pending === "string" && /^(q5|q20|mock1|streak3)?$/.test(raw.pending)) s.pending = raw.pending;
      if (raw && raw.qotd && typeof raw.qotd === "object") {
        const qd = raw.qotd;
        Object.keys(qd.days || {}).forEach(function (d) { const v = qd.days[d]; if (/^\d{4}-\d{2}-\d{2}$/.test(d) && Number.isInteger(v) && v >= 0 && v < 5) s.qotd.days[d] = v; });
        if (Number.isInteger(qd.streak) && qd.streak >= 0) s.qotd.streak = qd.streak;
        if (Number.isInteger(qd.best) && qd.best >= 0) s.qotd.best = qd.best;
        if (typeof qd.last === "string" && /^(\d{4}-\d{2}-\d{2})?$/.test(qd.last)) s.qotd.last = qd.last;
      }
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
    return im ? '<figure class="fig"><button type="button" class="zoom" data-action="zoom" data-key="' + attr(name) + '" aria-label="Open the figure full size"><img src="' + im.src + '" alt="' + attr(im.alt) + '" width="' + im.w + '" height="' + im.h + '"></button></figure>' : "";
  }

  function topicDone(t) {
    let done = 0, total = bookCount(t) + pyqCount(t);
    for (let k = 1; k <= bookCount(t); k++) if (store.progress[info(t, "book", k).id]) done++;
    for (let k = 1; k <= pyqCount(t); k++) if (store.progress[info(t, "pyq", k).id]) done++;
    return { done: done, total: total };
  }

  function practiceView() {
    let doneAll = 0, totalAll = 0, nq = 0;
    const counts = {};
    TOPICS.forEach(function (t) {
      const d = topicDone(t); doneAll += d.done; totalAll += d.total;
      nq += qCount(t);
      if (!t.mixed) counts[subjOf(t)] = (counts[subjOf(t)] || 0) + 1;
    });
    const list = TOPICS.filter(function (t) { return subjOf(t) === subjectTab && !t.mixed; });
    const mix = TOPICS.filter(function (t) { return subjOf(t) === subjectTab && t.mixed; })[0];
    const mixHtml = mix ? (function () { const d = topicDone(mix); return '<a class="mixcard" href="#' + mix.slug + '"><strong>Mixed practice sets</strong><span>' + bookCount(mix) + ' quizzes with questions from every ' + subjName(subjectTab) + ' topic · ' + d.done + ' of ' + d.total + ' done</span></a>'; })() : "";
    const open = topicsOpen[subjectTab] || list.length <= 3;
    const rows = (open ? list : list.slice(0, 3)).map(function (t, i) {
      const d = topicDone(t);
      let minis = "";
      for (let k = 1; k <= bookCount(t); k++) {
        const id = info(t, "book", k).id;
        minis += '<span class="mini' + (store.progress[id] ? " done" : store.active[id] ? " live" : "") + '"></span>';
      }
      const tag = t.pyq.length ? '<span class="pyqtag">' + t.pyq.length + (subjOf(t) === "reasoning" ? " PYQs" : " APSSB PYQs") + '</span>' : "";
      return '<li><a class="topic" href="#' + t.slug + '"><span class="tnum" aria-hidden="true">' + (i + 1) + '</span><span class="tbody"><span class="tname">' + t.name +
        '</span><span class="tmeta"><span class="minis" aria-hidden="true">' + minis + '</span><span>' + d.done + ' of ' + d.total + ' quizzes done</span>' + tag + '</span></span></a></li>';
    }).join("");
    const tab = function (s) {
      return '<button type="button" role="tab" aria-selected="' + (subjectTab === s) + '" data-action="subject" data-s="' + s + '">' + subjName(s) + '<span>' + (counts[s] || 0) + ' topics</span></button>';
    };
    return '<section class="sheet hero" aria-labelledby="pagetitle">' +
      '<h1 id="pagetitle" tabindex="-1">Practice by topic</h1>' +
      '<p class="sub">Every question of the Basic Mathematics Practice Book and the APSSB Reasoning Practice Book as quizzes of 10, plus previous year questions, mixed practice sets and mock-test questions, all with step-by-step solutions.</p>' +
      '<dl class="booklet"><div><dt>Topics</dt><dd>' + TOPICS.filter(function (t) { return !t.mixed; }).length + '</dd></div><div><dt>Quizzes</dt><dd>' + totalAll + '</dd></div><div><dt>Questions</dt><dd>' + nq + '</dd></div></dl>' +
      '<p class="overall">' + (doneAll ? "You have attempted " + doneAll + " of " + totalAll + " quizzes." : "Pick a topic to start. Your progress is saved on this phone.") + '</p>' +
      '</section><section class="sheet" aria-labelledby="topicshead"><h2 id="topicshead" class="sh">Topics</h2>' +
      '<div class="subtabs" role="tablist" aria-label="Subject">' + tab("maths") + tab("reasoning") + '</div>' + mixHtml + '<ol class="topics">' + rows + '</ol>' +
      (list.length > 3 ? '<button type="button" class="btn block moretopics" data-action="moretopics" aria-expanded="' + open + '">' +
        (open ? "Show fewer topics" : "See all " + list.length + " " + subjName(subjectTab) + " topics") + '</button>' : "") + '</section>' + toolsBlock() +
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
    TOPICS.forEach(function (t) { nq += qCount(t); nz += bookCount(t) + pyqCount(t); npyq += t.pyq.length; });
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
      '<p class="sub">' + fmt(nq) + ' Maths and Reasoning questions in ' + fmt(nz) + ' quizzes and mock tests, each with a step-by-step solution: every question of the Basic Mathematics Practice Book and the APSSB Reasoning Practice Book, ' + fmt(npyq) + ' previous year questions from APSSB and other North-East exams, and new mixed practice sets.</p>' +
      '<div class="ctarow"><a class="btn primary" href="#practice">Start practice</a><a class="btn" ' + ext(waLink(S.joinMsg)) + '>Join a batch</a></div>' +
      '<p class="trust"><a href="#reviews">' + S.reviews.count + ' student reviews on Google</a></p>' +
      '<a class="qotdlink" href="#today"><strong>Question of the day</strong><span>' + (store.qotd.days[todayKey()] !== undefined ? "Done for today" : "Solve today's question") + (liveStreak() ? " · " + liveStreak() + "-day streak" : "") + '</span></a>' +
      '<dl class="stats">' + stats + '</dl></div></section>' +
      '<section class="sheet sec" id="selections" aria-labelledby="h-sel"><h2 id="h-sel">Our selections</h2><p class="lead">' + sel.lead + '</p>' + recentHtml(sel) +
      pic(sel.banner, sel.bannerAlt, "selbanner", true) +
      (sel.toppers ? '<div class="toppers"><h3>' + sel.toppers.title + '</h3><ul>' + sel.toppers.names.map(function (n, i) { return '<li' + (i === 0 ? ' class="first"' : '') + '>' + n + '</li>'; }).join("") + '</ul></div>' : "") +
      '<div class="years">' + yrs + '</div><p class="tapnote">Tap a result poster to see it full size.</p><div class="posters">' + results + '</div></section>' +
      '<section class="sheet sec" id="free-class" aria-labelledby="h-free"><h2 id="h-free">Free classes on YouTube</h2><p class="lead">' + v.desc + '</p>' + player +
      '<div class="btnrow"><a class="btn primary block" ' + ext(v.url) + '>Watch the marathon on YouTube</a><a class="btn block" ' + ext(v.pdf) + '>Get the class PDF on Telegram</a></div>' +
      (more ? '<h3 class="demoh">More PYQ classes</h3><div class="demos">' + more + '</div>' : "") +
      '<h3 class="demoh">Demo lectures</h3><div class="demos">' + demos + '</div>' + channelCta() + '</section>' +
      '<section class="sheet sec" id="marathons" aria-labelledby="h-mar"><h2 id="h-mar">Marathon classes</h2><p class="lead">' + S.marathonLead + '</p>' +
      S.marathons.map(function (m) {
        return '<div class="mseries"><h3>' + m.title + '</h3><p class="mmeta">' + m.meta + '</p>' + (m.note ? '<p class="mnote">' + m.note + '</p>' : "") +
          splitHtml(m) + '<div class="days">' + m.days.map(function (d) { return '<a class="day" ' + ext("https://www.youtube.com/watch?v=" + d[1]) + ' aria-label="' + attr(m.title + ", day " + d[0] + " on YouTube") + '"><strong>Day ' + d[0] + '</strong><span>' + d[2] + '</span></a>'; }).join("") + '</div></div>';
      }).join("") + '</section>' +
      '<section class="sheet sec" id="guidance" aria-labelledby="h-guide"><h2 id="h-guide">Guidance and counselling</h2><p class="lead">' + S.guidance.lead + '</p><div class="demos">' +
      S.guidance.videos.map(function (g) { return '<a class="vcard vsmall" ' + ext(g.url) + '><span class="play" aria-hidden="true">▶</span><span>' + g.title + '<small>' + g.sub + '</small></span></a>'; }).join("") + '</div></section>' +
      '<section class="sheet sec" id="batches" aria-labelledby="h-batches"><h2 id="h-batches">Batches open now</h2><p class="lead">Ask about any batch on WhatsApp, or call the number on the poster.</p><a class="findcta" href="#finder"><strong>Not sure which batch?</strong><span>Find the right one in 3 taps</span></a>' + featHtml(S.featured) + '<h3 class="batchsub">More APSSB batches</h3><div class="posters">' + posters + '</div>' + featHtml(S.csat) + '</section>' +
      '<section class="sheet sec" id="reviews" aria-labelledby="h-reviews"><h2 id="h-reviews">Student reviews</h2>' +
      '<p class="revcount"><span>' + S.reviews.count + '</span>reviews on Google</p>' +
      '<p class="lead">Students who have already joined Northeast PSC have written about the classes, the teachers and their selections. Read their reviews on Google before you decide.</p>' +
      '<a class="btn primary block" ' + ext(S.reviews.url) + '>Read reviews on Google</a></section>' +
      '<section class="sheet sec" id="about" aria-labelledby="h-about"><h2 id="h-about">About Amarjeet Sir</h2>' + pic("portrait", "Amarjeet Sir", "portrait", true) + para(S.about) + '<figure class="team">' + pic("team", S.teamAlt, "", true) + '<figcaption>' + S.teamCaption + '</figcaption></figure></section>' +
      '<section class="sheet sec" id="classroom" aria-labelledby="h-class"><h2 id="h-class">In the classroom</h2><p class="tapnote">Tap a photo to see it full size.</p><div class="gallery">' + gallery + '</div>' +
      (galleryMore ? '<details class="more"><summary>More class photos</summary><div class="gallery">' + galleryMore + '</div></details>' : "") + '</section>' +
      '<section class="sheet sec" id="message" aria-labelledby="h-msg"><div class="msghead">' + pic("avatar", "Illustration of Amarjeet Sir", "", true) + '<h2 id="h-msg">Message from Amarjeet Sir</h2></div>' +
      S.message.slice(0, 2).map(para).join("") + '<details class="more"><summary>Read the full message</summary>' + S.message.slice(2).map(para).join("") + '</details></section>' +
      '<section class="sheet sec" id="books" aria-labelledby="h-books"><h2 id="h-books">Books by Amarjeet Sir &amp; Team</h2><ul class="books">' + books + '</ul></section>' +
      '<section class="sheet sec" id="contact" aria-labelledby="h-contact"><h2 id="h-contact">Contact</h2><ul class="centres">' + centres + '</ul><a class="btn primary block" ' + ext(waLink(S.joinMsg)) + '>Message on WhatsApp: ' + S.waShow + '</a>' +
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
    const im = SITE.img[key] || IMAGES[key];
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
    const qs = refs.map(function (r) { const t = TOPICS[r[0]]; return Object.assign({ _t: t, _ref: r }, listOf(t, r[1])[r[2]]); });
    const s = subjOf(TOPICS[refs[0][0]]);
    return { t: MOCKT, kind: "mock", subject: s, k: n, qs: qs, id: id, label: subjName(s) + " mock test " + n, from: 1, to: qs.length };
  }
  function newMock(subject) {
    const pool = [];
    TOPICS.forEach(function (t, ti) {
      if (subjOf(t) !== subject || t.mixed) return;
      t.qs.forEach(function (x, qi) { if (!(subject === "reasoning" && x.y)) pool.push([ti, 0, qi]); });
      t.pyq.forEach(function (_, qi) { pool.push([ti, 1, qi]); });
      (t.mq || []).forEach(function (_, qi) { pool.push([ti, 2, qi]); });
    });
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp; }
    const picked = [], per = {}, used = {};
    let npyq = 0;
    const take = function (r) { picked.push(r); per[r[0]] = (per[r[0]] || 0) + 1; used[r.join(",")] = 1; if (r[1] === 1) npyq++; };
    pool.forEach(function (r) {
      if (picked.length >= MOCK.count || (per[r[0]] || 0) >= 2) return;
      if (r[1] === 1 && npyq >= MOCK.pyq) return;
      if (r[1] !== 1 && picked.length - npyq >= MOCK.count - MOCK.pyq) return;
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
      hist.push('<li><a href="#' + id + '">' + subjName(subjOf(TOPICS[refs[0][0]])) + ' mock test ' + n + '</a><span>' + (a ? "In progress" : p ? "Best " + (p.best * MOCK.marks) + "/" + (refs.length * MOCK.marks) : "Not finished") + '</span></li>');
    }
    return '<p class="crumb"><a href="#practice">Practice</a></p><section class="sheet" aria-labelledby="pagetitle"><h1 id="pagetitle" class="tt" tabindex="-1">Mock test</h1>' +
      '<p class="sub">Exam-style Maths and Reasoning sections with questions from every topic.</p>' +
      '<dl class="booklet"><div><dt>Questions</dt><dd>' + MOCK.count + '</dd></div><div><dt>Maximum marks</dt><dd>' + (MOCK.count * MOCK.marks) + '</dd></div><div><dt>Time</dt><dd>' + MOCK.minutes + ' min</dd></div></dl>' +
      '<p class="note">Built on the Maths (Arithmetical and Numerical Ability) and Reasoning sections of APSSB CHSL and CGL: each section has 25 questions of 2 marks each and no negative marking. Every test picks a fresh mix of ' + MOCK.pyq + ' previous year questions and ' + (MOCK.count - MOCK.pyq) + ' book questions, and submits itself when the time runs out.</p>' +
      '<div class="btnrow"><button type="button" class="btn primary block" data-action="newmock" data-subject="maths">Start a Maths mock test</button><button type="button" class="btn block" data-action="newmock" data-subject="reasoning">Start a Reasoning mock test</button></div>' +
      (hist.length ? '<h2 class="setname">Your mock tests</h2><ul class="mocklist">' + hist.join("") + '</ul>' : "") + papersHtml() + '</section>';
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
      for (let k = 1; k <= bookCount(t); k++) sets.push(info(t, "book", k));
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
        if (x === listOf(TOPICS[r[0]], r[1])[r[2]].k) rows[r[0]].cor++;
      });
    });
    rows.forEach(function (r) { r.acc = r.att ? Math.round(r.cor * 100 / r.att) : null; });
    return rows;
  }
  function reportView() {
    const rows = topicStats();
    let att = 0, cor = 0, quizzes = 0, total = 0;
    rows.forEach(function (r) { att += r.att; cor += r.cor; quizzes += r.quizzes; total += bookCount(r.t) + pyqCount(r.t); });
    const head = '<p class="crumb"><a href="#practice">Practice</a></p><section class="sheet" aria-labelledby="pagetitle"><h1 id="pagetitle" class="tt" tabindex="-1">My report</h1>';
    if (!att) return head + '<p class="sub">Attempt a few quizzes and your report will appear here, with your accuracy in every topic and what to revise first.</p><a class="btn primary block" href="#practice">Start practising</a></section>';
    const label = function (a) { return a === null ? ["", "Not started"] : a >= 80 ? ["good", "Strong"] : a >= 50 ? ["ok", "Getting there"] : ["low", "Needs work"]; };
    const weak = rows.filter(function (r) { return r.att >= 5 && r.acc < 80; }).sort(function (a, b) { return a.acc - b.acc; }).slice(0, 3);
    const weakHtml = weak.length ? '<h2 class="setname">Revise these first</h2><ul class="weak">' + weak.map(function (r) {
      const pv = topicVideos(r.t.slug)[0];
      return '<li><a href="#' + r.t.slug + '"><strong>' + r.t.name + '</strong></a><span>' + r.acc + '% correct in ' + r.att + ' questions</span>' +
        (pv ? '<a class="small" ' + ext(pv.url) + '>Watch Sir’s PYQ class on this topic</a>' : "") + '</li>';
    }).join("") + '</ul>' : '<p class="note">No weak topic yet. Keep going and try a mock test to check yourself across all topics.</p>';
    const rowHtml = function (r) {
      const l = label(r.acc);
      return '<li><a href="#' + r.t.slug + '">' + r.t.name + '</a><span class="bar" aria-hidden="true"><span class="' + l[0] + '" style="width:' + (r.acc || 0) + '%"></span></span><span class="replbl ' + l[0] + '">' + (r.acc === null ? l[1] : r.acc + "% " + l[1]) + '</span></li>';
    };
    const listOf = function (s) { return rows.filter(function (r) { return subjOf(r.t) === s; }).map(rowHtml).join(""); };
    const names = weak.map(function (r) { return r.t.name; }).join(", ");
    const cta = '<div class="repcta"><p>' + (weak.length ? "Want Amarjeet Sir to teach " + names + " with you in class?" : "Want to learn every topic with Amarjeet Sir?") + '</p><a class="btn primary block" ' +
      ext(waLink(weak.length ? "Hello Sir, I need help with " + names + ". I want to join the Maths & Reasoning batch." : (SITE.featured || SITE.courses[0]).msg)) + '>Ask about the batch on WhatsApp</a></div>';
    return head + '<p class="sub">Based on your latest attempt of every quiz and mock test on this phone.</p>' +
      '<dl class="booklet"><div><dt>Questions attempted</dt><dd>' + att + '</dd></div><div><dt>Accuracy</dt><dd>' + Math.round(cor * 100 / att) + '%</dd></div><div><dt>Quizzes done</dt><dd>' + quizzes + '/' + total + '</dd></div></dl>' +
      sendBlock() + weakHtml + '<h2 class="setname">Maths topics</h2><ul class="replist">' + listOf("maths") + '</ul><h2 class="setname">Reasoning topics</h2><ul class="replist">' + listOf("reasoning") + '</ul>' + cta + '</section>';
  }
  function toolsBlock() {
    return '<section class="sheet tools" aria-labelledby="toolshead"><h2 id="toolshead" class="sh">More ways to practise</h2><a class="toolcard" href="#mock"><strong>Mock test</strong><span>Maths or Reasoning: ' + MOCK.count + ' questions in ' + MOCK.minutes + ' minutes, exam style</span></a>' +
      '<a class="toolcard" href="#report"><strong>My report</strong><span>Your accuracy in every topic and what to revise first</span></a>' +
      '<a class="toolcard" href="#today"><strong>Question of the day</strong><span>' + (store.qotd.days[todayKey()] !== undefined ? "Done for today. " : "A new question every day. ") + (liveStreak() ? "Streak: " + liveStreak() + (liveStreak() === 1 ? " day" : " days") : "Start your streak") + '</span></a>' +
      '<a class="toolcard" href="#finder"><strong>Which batch is right for me?</strong><span>Three quick questions, one clear answer</span></a>' +
      '<a class="toolcard" href="#mistakes"><strong>Revise my mistakes</strong><span>' + (Object.keys(store.mistakes).length ? Object.keys(store.mistakes).length + " questions to get right" : "Questions you get wrong are kept here") + '</span></a>' +
      (installEvt ? '<button type="button" class="btn block" data-action="install">Install as an app (works offline)</button>' : "") + '</section>';
  }
  function shareScore() {
    const q = view.q, p = q ? store.progress[q.id] : null;
    if (!p) return;
    let c = 0;
    q.qs.forEach(function (x, j) { if (p.lastAnswers[j] === x.k) c++; });
    const score = q.kind === "mock" ? (c * MOCK.marks) + "/" + (q.qs.length * MOCK.marks) + " marks" : c + "/" + q.qs.length;
    const where = q.kind === "mock" ? (q.paper ? "the " + q.paper.name + " Reasoning paper" : "an APSSB-style " + subjName(q.subject) + " mock test") : q.kind === "revision" ? "a revision of my " + subjName(q.subject) + " mistakes" : q.t.name + ", " + q.label;
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
  /* ----- question identity, mistakes and revision ----- */
  const TI = {};
  TOPICS.forEach(function (t, i) { TI[t.slug] = i; });
  function keyOfRef(r) {
    const t = TOPICS[r[0]], x = listOf(t, r[1])[r[2]];
    if (r[1] && x && x.ri !== undefined) return t.slug + ":b:" + x.ri;
    return t.slug + ":" + (r[1] === 2 ? "m" : r[1] ? "p" : "b") + ":" + r[2];
  }
  function refOfKey(k) {
    const m = /^([a-z-]+):([bpm]):(\d+)$/.exec(k);
    if (!m || TI[m[1]] === undefined) return null;
    const ti = TI[m[1]], kind = m[2] === "p" ? 1 : m[2] === "m" ? 2 : 0, qi = Number(m[3]);
    return listOf(TOPICS[ti], kind)[qi] ? [ti, kind, qi] : null;
  }
  function refsOfQuiz(q) {
    if (q.qs.length && q.qs[0]._ref) return q.qs.map(function (x) { return x._ref; });
    const ti = TI[q.t.slug], kind = q.kind === "pyq" ? 1 : 0;
    return q.qs.map(function (_, j) { return [ti, kind, (q.k - 1) * QPER + j]; });
  }
  function noteMistakes(q, answers) {
    refsOfQuiz(q).forEach(function (r, j) {
      if (!r || answers[j] === null || answers[j] === undefined) return;
      const key = keyOfRef(r), x = q.qs[j];
      if (answers[j] === x.k) delete store.mistakes[key]; else store.mistakes[key] = 1;
    });
  }
  function initMistakes() {
    Object.keys(store.mistakes).forEach(function (k) { if (!refOfKey(k)) delete store.mistakes[k]; });
    if (store.mistakesReady) return;
    TOPICS.forEach(function (t) {
      ["book", "pyq"].forEach(function (kind) {
        for (let k = 1; k <= quizCount(t, kind); k++) {
          const q = info(t, kind, k), p = store.progress[q.id];
          if (p) noteMistakes(q, p.lastAnswers);
        }
      });
    });
    Object.keys(store.mockRefs || {}).forEach(function (id) { const p = store.progress[id]; if (p) noteMistakes(mockInfo(Number(id.slice(5))), p.lastAnswers); });
    store.mistakesReady = true;
    save();
  }
  function mistakeRefs(subject) {
    return Object.keys(store.mistakes).map(refOfKey).filter(function (r) { return r && subjOf(TOPICS[r[0]]) === subject; });
  }
  const REVT = { slug: "mistakes", name: "My mistakes", index: -1, sections: [], qs: [], pyq: [] };
  function revInfo(n) {
    const id = "rev-" + n, refs = store.revRefs[id];
    const qs = refs.map(function (r) { const t = TOPICS[r[0]]; return Object.assign({ _t: t, _ref: r }, listOf(t, r[1])[r[2]]); });
    const s = subjOf(TOPICS[refs[0][0]]);
    return { t: REVT, kind: "revision", subject: s, k: n, qs: qs, id: id, label: subjName(s) + " mistakes, set " + n, from: 1, to: qs.length };
  }
  function newRevision(subject) {
    const pool = mistakeRefs(subject);
    if (!pool.length) return;
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp; }
    store.revCount = (store.revCount || 0) + 1;
    store.revRefs["rev-" + store.revCount] = pool.slice(0, QPER);
    save();
    location.hash = "rev-" + store.revCount;
  }
  function mistakesView() {
    const nm = mistakeRefs("maths").length, nr = mistakeRefs("reasoning").length;
    const btn = function (s, n) {
      return n ? '<button type="button" class="btn ' + (s === "maths" ? "primary " : "") + 'block" data-action="newrev" data-subject="' + s + '">Revise ' + subjName(s) + ' mistakes (' + n + ')</button>'
        : '<p class="note">No ' + subjName(s) + ' mistakes to revise right now.</p>';
    };
    return '<p class="crumb"><a href="#practice">Practice</a></p><section class="sheet" aria-labelledby="pagetitle"><h1 id="pagetitle" class="tt" tabindex="-1">Revise my mistakes</h1>' +
      '<p class="sub">Every question you got wrong in a quiz or test is kept here. Answer it correctly in a revision set and it leaves the list.</p>' +
      '<dl class="booklet"><div><dt>Maths</dt><dd>' + nm + '</dd></div><div><dt>Reasoning</dt><dd>' + nr + '</dd></div><div><dt>Total</dt><dd>' + (nm + nr) + '</dd></div></dl>' +
      (nm + nr ? '<p class="note">Each revision set has up to 10 of your mistakes, picked at random.</p>' : '<p class="note">Attempt a few quizzes first. Any question you get wrong will appear here.</p>') +
      '<div class="btnrow">' + btn("maths", nm) + btn("reasoning", nr) + '</div></section>';
  }

  /* ----- previous year papers (Reasoning PYQs grouped by exam) ----- */
  const PAPERS = {}, PAPER_LIST = [];
  (function () {
    const groups = {};
    TOPICS.forEach(function (t, ti) {
      if (subjOf(t) !== "reasoning") return;
      t.pyq.forEach(function (x, qi) {
        let name = String(x.y || "").replace(/\s*PYQ\s*$/, "").replace(/\s*\(Maths\)$/, "");
        const yr = (name.match(/(\d{4})$/) || [])[1];
        if (!yr) return;
        (groups[name] = groups[name] || []).push([ti, 1, qi]);
      });
    });
    Object.keys(groups).forEach(function (name) {
      const refs = groups[name], key = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const p = { key: key, name: name, refs: refs, year: Number(name.slice(-4)), apssb: /^APSSB/.test(name), minutes: Math.ceil(refs.length * 1.2) };
      PAPERS[key] = p; PAPER_LIST.push(p);
    });
    PAPER_LIST.sort(function (a, b) { return (b.apssb - a.apssb) || (b.year - a.year) || (a.name < b.name ? -1 : 1); });
  })();
  function paperInfo(key) {
    const p = PAPERS[key];
    const qs = p.refs.map(function (r) { const t = TOPICS[r[0]]; return Object.assign({ _t: t, _ref: r }, t.pyq[r[2]]); });
    return { t: MOCKT, kind: "mock", paper: p, subject: "reasoning", k: key, qs: qs, id: "paper-" + key, label: p.name + " Reasoning paper", from: 1, to: qs.length };
  }
  function papersHtml() {
    if (!PAPER_LIST.length) return "";
    return '<h2 class="setname">Previous year papers: Reasoning</h2><p class="setnote">All the questions of each exam that are in our question bank, timed like the exam: 2 marks each, no negative marking.</p><ul class="mocklist papers">' +
      PAPER_LIST.map(function (p) {
        const id = "paper-" + p.key, pr = store.progress[id], a = store.active[id];
        return '<li><a href="#' + id + '">' + p.name + '<small>' + p.refs.length + ' questions, ' + p.minutes + ' min</small></a><span>' +
          (a ? "In progress" : pr ? "Best " + (pr.best * MOCK.marks) + "/" + (p.refs.length * MOCK.marks) : "Not attempted") + '</span></li>';
      }).join("") + '</ul>';
  }
  function limitOf(id) {
    if (id.indexOf("mock-") === 0) return MOCK.minutes * 60000;
    if (id.indexOf("paper-") === 0 && PAPERS[id.slice(6)]) return PAPERS[id.slice(6)].minutes * 60000;
    return 0;
  }

  /* ----- question of the day ----- */
  function todayKey(d) { d = d || new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function dayNum(key) { const p = key.split("-").map(Number); return Math.round(Date.UTC(p[0], p[1] - 1, p[2]) / 864e5); }
  const QPOOL = { maths: [], reasoning: [] };
  TOPICS.forEach(function (t, ti) {
    const s = subjOf(t);
    t.qs.forEach(function (x, qi) { if (!(s === "reasoning" && x.y)) QPOOL[s].push([ti, 0, qi]); });
    t.pyq.forEach(function (_, qi) { QPOOL[s].push([ti, 1, qi]); });
  });
  function qotdRef(key) {
    const n = dayNum(key), s = n % 2 ? "reasoning" : "maths", pool = QPOOL[s];
    return pool[(n * 7919 + 13) % pool.length];
  }
  function liveStreak() {
    const q = store.qotd, t = todayKey(), y = new Date(); y.setDate(y.getDate() - 1);
    return (q.last === t || q.last === todayKey(y)) ? q.streak : 0;
  }
  function answerQotd(i) {
    const key = todayKey(), q = store.qotd;
    if (q.days[key] !== undefined) return;
    q.days[key] = i;
    const y = new Date(); y.setDate(y.getDate() - 1);
    q.streak = q.last === todayKey(y) ? q.streak + 1 : 1;
    q.last = key;
    q.best = Math.max(q.best || 0, q.streak);
    if (q.streak >= 3) reachMilestones(["streak3"]);
    const r = qotdRef(key), x = listOf(TOPICS[r[0]], r[1])[r[2]];
    if (i === x.k) delete store.mistakes[keyOfRef(r)]; else store.mistakes[keyOfRef(r)] = 1;
    const keep = Object.keys(q.days).sort().slice(-90), days = {};
    keep.forEach(function (d) { days[d] = q.days[d]; });
    q.days = days;
    save(); render();
  }
  function todayView() {
    const key = todayKey(), r = qotdRef(key), t = TOPICS[r[0]], x = listOf(t, r[1])[r[2]];
    const ans = store.qotd.days[key], done = ans !== undefined, streak = liveStreak();
    const d = new Date();
    const opts = x.o.map(function (o, i) {
      const cls = !done ? "" : i === x.k ? " right" : i === ans ? " wrong" : "";
      return '<button type="button" class="qopt' + cls + '" data-action="qotd" data-i="' + i + '"' + (done ? " disabled" : "") + '><span class="ql">' + LETTERS[i] + '</span><span>' + o + '</span></button>';
    }).join("");
    const result = !done ? "" : '<div class="qres ' + (ans === x.k ? "ok" : "no") + '"><strong>' + (ans === x.k ? "Correct!" : "Not this time. The answer is " + LETTERS[x.k] + ".") + '</strong>' +
      '<p>' + x.s.join("</p><p>") + '</p></div>' +
      '<p class="streakline">' + (streak > 1 ? "You are on a " + streak + "-day streak." : "Your streak has started.") + ' Come back tomorrow for a new question.</p>' +
      '<div class="btnrow"><button type="button" class="btn block share" data-action="shareqotd">Share on WhatsApp</button><a class="btn primary block" href="#' + t.slug + '">Practise ' + t.name + '</a></div>' +
      channelCta("Get more questions like this on our WhatsApp channel");
    return '<p class="crumb"><a href="#practice">Practice</a></p><section class="sheet" aria-labelledby="pagetitle"><h1 id="pagetitle" class="tt" tabindex="-1">Question of the day</h1>' +
      '<p class="sub">' + d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" }) + ' · ' + subjName(subjOf(t)) + ', ' + t.name + '</p>' +
      '<dl class="booklet"><div><dt>Streak</dt><dd>' + streak + (streak === 1 ? " day" : " days") + '</dd></div><div><dt>Best streak</dt><dd>' + (store.qotd.best || 0) + '</dd></div><div><dt>Days answered</dt><dd>' + Object.keys(store.qotd.days).length + '</dd></div></dl>' +
      '<div class="qotd">' + (x.y ? '<p class="srcline">' + x.y + '</p>' : "") + (x.pre ? '<p class="pre">' + x.pre + '</p>' : "") + (x.pi ? fig(x.pi) : "") +
      (x.img && x.ip === "before" ? fig(x.img) : "") + '<p class="qtext">' + x.t + '</p>' + (x.img && x.ip !== "before" ? fig(x.img) : "") +
      '<div class="qopts">' + opts + '</div>' + result + '</div></section>' + (done ? milestoneCard() : "");
  }
  function shareQotd() {
    const s = liveStreak(), url = SITE.siteUrl || location.href.split("#")[0];
    const text = "I solved today's APSSB question of the day on APSSB Maths & Reasoning Practice by Amarjeet Sir" + (s > 1 ? " (" + s + "-day streak)" : "") + ". Try it free: " + url;
    if (typeof navigator !== "undefined" && navigator.share) navigator.share({ text: text }).catch(function () {});
    else window.open("https://wa.me/?text=" + encodeURIComponent(text), "_blank", "noopener");
  }

  function courseByImg(img) { return SITE.courses.filter(function (c) { return c.img === img; })[0]; }
  function attemptOf(q) {
    const p = store.progress[q.id];
    if (!p) return null;
    let right = 0;
    const wrongBy = {};
    q.qs.forEach(function (x, j) {
      const a = p.lastAnswers[j], name = (x._t || q.t).name;
      if (a === x.k) right++; else wrongBy[name] = (wrongBy[name] || 0) + 1;
    });
    let topic = q.kind === "book" || q.kind === "pyq" ? q.t.name : "", most = 0;
    if (!topic) Object.keys(wrongBy).forEach(function (n) { if (wrongBy[n] > most) { most = wrongBy[n]; topic = n; } });
    const where = q.kind === "mock" ? (q.paper ? "the " + q.paper.name + " Reasoning paper" : "a " + subjName(q.subject) + " mock test") : q.kind === "revision" ? "a revision of my mistakes" : q.t.name + " " + q.label;
    const plain = function (x) { return String(x).replace(/&amp;/g, "&"); };
    return { right: right, n: q.qs.length, pct: right / q.qs.length, topic: topic || subjName(q.subject || subjOf(q.t)), where: plain(where), subject: q.subject || subjOf(q.t), plainTopic: plain(topic || subjName(q.subject || subjOf(q.t))) };
  }
  function channelCta(lead) {
    if (!SITE.channel) return "";
    return '<a class="chcta" ' + ext(SITE.channel.url) + '><strong>' + (lead || "Follow Northeast PSC on WhatsApp") + '</strong><span>Daily questions, free notes and PDFs, PYQs and exam updates. ' + SITE.channel.followers + ' followers.</span></a>';
  }
  function proofLine() {
    const rp = SITE.sel && SITE.sel.recent ? SITE.sel.recent.people.slice(0, 2).map(function (x) { return x[1] + " (" + x[2] + ")"; }).join(" and ") : "";
    return '<p class="adproof"><strong>1,000+ selections</strong> in APSSB and APPSC exams' + (rp ? '. Recent toppers: ' + rp : "") + '.</p>' +
      '<p class="adlinks"><a href="#free-class">Watch a free class</a><a href="#finder">Find the right batch</a><a href="#report">Send my report to Sir</a>' + (SITE.channel ? '<a ' + ext(SITE.channel.url) + '>WhatsApp channel</a>' : "") + '</p>';
  }
  function adBlock(q) {
    const c = SITE.featured || SITE.courses[0];
    const at = q ? attemptOf(q) : null;
    let head = "Learn every topic with Amarjeet Sir", text = "", msg = c.msg;
    if (at) {
      const sc = at.right + "/" + at.n;
      if (at.pct < 0.6) {
        head = "Need help with " + at.topic + "?";
        text = at.topic + " is taught step by step in live classes, with doubt solving and PYQ practice, in the Maths & Reasoning batch.";
        msg = "Hello Sir, I scored " + sc + " in " + at.where + ". I need help with " + at.plainTopic + ". Please tell me about the Maths & Reasoning batch (₹" + c.price + ").";
      } else if (at.pct < 0.9) {
        head = "Good work. Now make it a sure score";
        text = "Regular tests and PYQ practice in the batch turn good scores into selections.";
        msg = "Hello Sir, I scored " + sc + " in " + at.where + ". I want to improve further. Please tell me about the Maths & Reasoning batch (₹" + c.price + ").";
      } else {
        head = "Excellent! You are exam-ready";
        text = "Keep your rank safe with the 20-test series and PYQ video solutions in the Maths & Reasoning batch.";
        msg = "Hello Sir, I scored " + sc + " in " + at.where + ". I want to join the Maths & Reasoning batch (₹" + c.price + ") for the test series.";
      }
    }
    const alt = at ? courseByImg(at.subject === "reasoning" ? "poster-reasoning" : "poster-maths") : null;
    return '<section class="sheet adbox" aria-labelledby="adh"><h2 id="adh">' + head + '</h2>' + (text ? '<p class="adtext">' + text + '</p>' : "") +
      '<a class="adimg" ' + ext(waLink(msg)) + '>' + pic(c.img, c.alt, "", true) + '</a>' +
      (c.price ? '<p class="fprice">' + c.name + ': <s>₹' + c.was + '</s><strong>₹' + c.price + '</strong></p>' : "") +
      '<div class="btnrow"><a class="btn primary block" ' + ext(waLink(msg)) + '>Join this batch on WhatsApp</a><a class="btn block" href="tel:+91' + SITE.phone + '">Call ' + SITE.phoneShow + '</a></div>' +
      (alt ? '<p class="adalt">Only ' + subjName(at.subject) + '? <a ' + ext(waLink(alt.msg)) + '>' + alt.name + '</a></p>' : "") +
      proofLine() + '</section>';
  }

  /* ----- milestones: one special offer the first time each one is reached ----- */
  const MILES = {
    q5: ["5 quizzes done!", "You practise like a topper.", "I have completed 5 quizzes"],
    q20: ["20 quizzes done!", "That is serious preparation.", "I have completed 20 quizzes"],
    mock1: ["Your first test is done!", "Exam-style practice is the fastest way to a selection.", "I have taken my first mock test"],
    streak3: ["3-day streak!", "Practising every day is what toppers do.", "I am on a 3-day streak of the question of the day"]
  };
  function reachMilestones(ids) {
    const fresh = ids.filter(function (id) { return !store.milestones[id]; });
    if (!fresh.length) return;
    fresh.forEach(function (id) { store.milestones[id] = Date.now(); });
    store.pending = fresh[fresh.length - 1];
  }
  function milestoneCard() {
    const id = store.pending;
    if (!id || !MILES[id]) return "";
    store.pending = ""; save();
    const c = SITE.featured, m = MILES[id];
    const msg = "Hello Sir, " + m[2] + " on the APSSB Maths & Reasoning Practice website. I want the Maths & Reasoning batch offer (₹" + c.price + ").";
    return '<section class="sheet milestone" aria-labelledby="msh"><p class="mstag">Special offer</p><h2 id="msh">' + m[0] + '</h2>' +
      '<p>' + m[1] + ' Learn every topic live with Amarjeet Sir & Team in the Maths & Reasoning batch at <strong>₹' + c.price + '</strong> instead of <s>₹' + c.was + '</s>.</p>' +
      '<div class="btnrow"><a class="btn primary block" ' + ext(waLink(msg)) + '>Claim this offer on WhatsApp</a></div></section>';
  }

  /* ----- student details for batch and test updates (sent to the Google Form) ----- */
  let leadThanks = false;
  function leadCard() {
    if (leadThanks) { leadThanks = false; return '<section class="sheet sendrep leadcard" aria-live="polite"><h2 class="setname">Thank you!</h2><p class="note">Northeast PSC will send you new quizzes, test and batch updates on WhatsApp.</p></section>'; }
    if (store.lead) return "";
    return '<section class="sheet sendrep leadcard" aria-labelledby="leadh"><h2 class="setname" id="leadh">Get new quizzes and batch updates on WhatsApp</h2>' +
      '<p class="note">Leave your name and WhatsApp number once. Amarjeet Sir&#39;s team will send you new practice sets, free class links and batch offers.</p>' +
      '<label class="fld" for="ldname">Your name</label><input id="ldname" type="text" autocomplete="name" maxlength="60" value="' + attr(store.profile.name || "") + '">' +
      '<label class="fld" for="ldphone">WhatsApp number</label><input id="ldphone" type="tel" inputmode="numeric" autocomplete="tel-national" maxlength="10" placeholder="10 digits">' +
      '<p id="lderr" class="ferr" role="alert" hidden></p>' +
      '<button type="button" class="btn primary block" data-action="savelead">Send my details</button>' +
      '<p class="note leadnote">We use your number only for Northeast PSC updates.</p></section>';
  }
  function leadGate() {
    return '<section class="sheet sendrep leadcard leadgate" aria-labelledby="pagetitle"><h1 id="pagetitle" tabindex="-1">Before your first quiz</h1>' +
      '<p class="note">Tell us who you are. We ask only once on this phone.</p>' +
      '<label class="fld" for="ldname">Your name</label><input id="ldname" type="text" autocomplete="name" maxlength="60" value="' + attr(store.profile.name || "") + '">' +
      '<label class="fld" for="ldphone">WhatsApp number</label><input id="ldphone" type="tel" inputmode="numeric" autocomplete="tel-national" maxlength="10" placeholder="10 digits">' +
      '<p id="lderr" class="ferr" role="alert" hidden></p>' +
      '<button type="button" class="btn primary block" data-action="savelead">Start the quiz</button>' +
      '<p class="note leadnote">We use your number only to send Maths &amp; Reasoning batch and test updates from Northeast PSC.</p></section>';
  }
  function saveLead() {
    const ni = document.getElementById("ldname"), pi = document.getElementById("ldphone"), er = document.getElementById("lderr");
    const name = (ni ? ni.value : "").trim().slice(0, 60), phone = (pi ? pi.value : "").replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "");
    [ni, pi].forEach(function (el) { if (el) el.removeAttribute("aria-invalid"); }); if (er) er.hidden = true;
    const fail = function (el, msg) { if (er) { er.textContent = msg; er.hidden = false; } if (el) { el.setAttribute("aria-invalid", "true"); el.focus(); } };
    if (name.length < 2) return fail(ni, "Please enter your name.");
    if (!/^[6-9]\d{9}$/.test(phone)) return fail(pi, "Please enter a 10-digit WhatsApp number starting with 6, 7, 8 or 9.");
    store.lead = { name: name, phone: phone, at: Date.now() };
    if (!store.profile.name) store.profile.name = name;
    save(); sendLead(store.lead);
    if (view.screen === "quiz" && view.mode === "lead") { route(); return; }
    leadThanks = true; render();
    const c = document.querySelector(".leadcard"); if (c && c.scrollIntoView) c.scrollIntoView({ block: "center" });
  }
  function sendLead(lead) {
    const f = SITE.form;
    if (!f || !f.action || !f.name || !f.phone) return;
    try {
      const body = new FormData(); body.append(f.name, lead.name); body.append(f.phone, lead.phone);
      fetch(f.action, { method: "POST", mode: "no-cors", body: body }).catch(function () {});
    } catch (e) { /* offline: the details stay on this phone */ }
  }

  /* ----- report to Sir on WhatsApp ----- */
  function reportText(name) {
    const rows = topicStats();
    let att = 0, cor = 0;
    const by = { maths: [0, 0], reasoning: [0, 0] };
    rows.forEach(function (r) { att += r.att; cor += r.cor; by[subjOf(r.t)][0] += r.att; by[subjOf(r.t)][1] += r.cor; });
    const pc = function (a) { return a[0] ? Math.round(a[1] * 100 / a[0]) + "%" : "not started"; };
    const weak = rows.filter(function (r) { return r.att >= 5 && r.acc < 80; }).sort(function (a, b) { return a.acc - b.acc; }).slice(0, 3)
      .map(function (r) { return r.t.name.replace(/&amp;/g, "&") + " (" + r.acc + "%)"; });
    const best = { maths: -1, reasoning: -1 };
    Object.keys(store.mockRefs || {}).forEach(function (id) {
      const p = store.progress[id], refs = store.mockRefs[id];
      if (p) { const s = subjOf(TOPICS[refs[0][0]]); best[s] = Math.max(best[s], p.best * MOCK.marks); }
    });
    const lines = ["Hello Sir, I am " + name + ". My report from APSSB Maths & Reasoning Practice:",
      "- Questions attempted: " + att + (att ? ", accuracy " + Math.round(cor * 100 / att) + "%" : ""),
      "- Maths: " + by.maths[0] + " questions, " + pc(by.maths) + " | Reasoning: " + by.reasoning[0] + " questions, " + pc(by.reasoning)];
    if (weak.length) lines.push("- Weak topics: " + weak.join(", "));
    if (best.maths >= 0 || best.reasoning >= 0) lines.push("- Best mock test: " + [best.maths >= 0 ? "Maths " + best.maths + "/" + MOCK.count * MOCK.marks : "", best.reasoning >= 0 ? "Reasoning " + best.reasoning + "/" + MOCK.count * MOCK.marks : ""].filter(Boolean).join(", "));
    if (liveStreak()) lines.push("- Question of the day streak: " + liveStreak() + (liveStreak() === 1 ? " day" : " days"));
    lines.push("Please guide me about the right batch.");
    return lines.join("\n");
  }
  function sendReport() {
    const inp = document.getElementById("stname");
    const name = (inp && inp.value ? inp.value : store.profile.name || "").trim().slice(0, 60);
    if (!name) {
      if (inp) { inp.setAttribute("aria-invalid", "true"); inp.focus(); }
      const er = document.getElementById("stname-err");
      if (er) er.hidden = false;
      return;
    }
    store.profile.name = name; save();
    window.open(waLink(reportText(name)), "_blank", "noopener");
  }
  function sendBlock() {
    return '<div class="sendrep"><h2 class="setname">Send this report to Amarjeet Sir</h2><p class="note">Sir and the team will look at your weak topics and suggest the right batch for you on WhatsApp.</p>' +
      '<label class="fld" for="stname">Your name</label><input id="stname" type="text" autocomplete="name" maxlength="60" value="' + attr(store.profile.name || "") + '" aria-describedby="stname-err">' +
      '<p id="stname-err" class="ferr" hidden>Please write your name first.</p>' +
      '<button type="button" class="btn primary block" data-action="sendreport">Send my report on WhatsApp</button></div>';
  }

  /* ----- which batch is right for me? ----- */
  let fnd = {};
  const FQ = [
    ["exam", "Which exam are you preparing for?", [["cgl", "APSSB CGL, CHSL or CSL"], ["uniform", "APSSB Constable or Uniform Services"], ["appsc", "APPSC CCE (CSAT)"], ["undecided", "Not decided yet"]]],
    ["mode", "How do you want to study?", [["online", "Online, from home"], ["offline", "Offline, at a Northeast PSC centre"]]],
    ["need", "What do you need help with?", [["maths", "Maths"], ["reasoning", "Reasoning"], ["both", "Maths and Reasoning"], ["all", "All subjects, with GK and English"]]]
  ];
  function fLabel(k) { const q = FQ.filter(function (x) { return x[0] === k; })[0]; return q[2].filter(function (o) { return o[0] === fnd[k]; })[0][1]; }
  function recommend() {
    if (fnd.exam === "appsc") return { c: SITE.csat, why: "It is made for APPSC CCE Prelims CSAT: Maths, Reasoning, Interpersonal Skill and Comprehension, taught online by Amarjeet Sir & Team." };
    if (fnd.need === "all") return fnd.mode === "online"
      ? { c: courseByImg("poster2"), why: "It covers Maths, GK, English and Reasoning for APSSB exams online, with live classes, recorded backup and tests." }
      : { c: courseByImg("poster-fullcourse"), why: "It is the full classroom course: Maths, Reasoning, GK and English at Itanagar, Naharlagun, Nirjuli and Pasighat, with 150+ APSSB tests included." };
    if (fnd.mode === "offline" && fnd.need === "maths") return { c: courseByImg("poster-offline-maths"), why: "It is the classroom Maths batch by Amarjeet Sir & Team at Itanagar, Naharlagun, Nirjuli and Pasighat." };
    if (fnd.mode === "online" && fnd.need === "maths") return { c: courseByImg("poster-maths"), why: "It is focused only on Maths, live online with recorded lectures, PYQs with video solutions and tests." };
    if (fnd.mode === "online" && fnd.need === "reasoning") return { c: courseByImg("poster-reasoning"), why: "It is focused only on Reasoning, live online with Amarjeet Sir & Team." };
    return { c: SITE.featured, why: "Maths and Reasoning are the two scoring sections of every APSSB exam. This batch has live classes, 8 months of recorded lectures, PYQ video solutions and 20 tests." };
  }
  function finderView() {
    const qs = FQ.map(function (q, i) {
      return '<fieldset class="fq"><legend>' + (i + 1) + '. ' + q[1] + '</legend><div class="fopts">' + q[2].map(function (o) {
        return '<button type="button" class="fopt" aria-pressed="' + (fnd[q[0]] === o[0]) + '" data-action="finder" data-k="' + q[0] + '" data-v="' + o[0] + '">' + o[1] + '</button>';
      }).join("") + '</div></fieldset>';
    }).join("");
    let res = "";
    if (fnd.exam && fnd.mode && fnd.need) {
      const r = recommend(), c = r.c;
      const msg = "Hello Sir, I am preparing for " + fLabel("exam") + ". I want " + (fnd.mode === "online" ? "online" : "offline") + " classes and I need help with " + fLabel("need") + ". Please tell me about the " + c.name.replace(/, ₹[\d,]+$/, "") + ".";
      res = '<section class="frec" aria-live="polite"><p class="mstag">Best batch for you</p><h2>' + c.name + '</h2>' +
        (c.price ? '<p class="fprice"><s>₹' + c.was + '</s><strong>₹' + c.price + '</strong></p>' : "") + '<p>' + r.why + '</p>' +
        '<a class="adimg" ' + ext(waLink(msg)) + '>' + pic(c.img, c.alt, "", true) + '</a>' +
        '<div class="btnrow"><a class="btn primary block" ' + ext(waLink(msg)) + '>Ask about this batch on WhatsApp</a><a class="btn block" href="tel:+91' + SITE.phone + '">Call ' + SITE.phoneShow + '</a></div>' +
        '<p class="adlinks"><a href="#batches">See all batches</a><button type="button" class="linkbtn" data-action="finderreset">Start again</button></p></section>';
    }
    return '<p class="crumb"><a href="#">Home</a></p><section class="sheet" aria-labelledby="pagetitle"><h1 id="pagetitle" class="tt" tabindex="-1">Which batch is right for me?</h1>' +
      '<p class="sub">Answer three quick questions and we will suggest the best batch for you.</p>' + qs + res + '</section>';
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
    subjectTab = subjOf(t);
    if (TOPICS.filter(function (x) { return subjOf(x) === subjectTab; }).indexOf(t) >= 3) topicsOpen[subjectTab] = true;
    let book = "", pyq = "";
    for (let k = 1; k <= bookCount(t); k++) book += card(info(t, "book", k));
    for (let k = 1; k <= pyqCount(t); k++) pyq += card(info(t, "pyq", k));
    const r = subjOf(t) === "reasoning";
    const nb = bookCount(t), last = t.qs.length - (nb - 1) * QPER;
    return '<p class="crumb"><a href="#practice">All topics</a></p><section class="sheet" aria-labelledby="pagetitle">' +
      '<h1 id="pagetitle" class="tt" tabindex="-1">' + t.name + '</h1><p class="sub">' + (t.note || t.chapter + (r ? ' of the APSSB Reasoning Practice Book.' : ' of the Basic Mathematics Practice Book.')) + '</p>' +
      '<h2 class="setname">' + (t.mixed ? "Practice sets" : "Book quizzes") + '</h2><p class="setnote">' + nb + ' quizzes of 10 questions' + (last < QPER ? ' (the last one has ' + last + ')' : ' each') + '.</p><div class="quizzes">' + book + '</div>' +
      (t.pyq.length ? '<h2 class="setname">' + (r ? 'PYQ quizzes' : 'APSSB PYQ quizzes') + '</h2><p class="setnote">' + t.pyq.length +
        (r ? ' previous year questions from APSSB and other North-East state exams. The exam is shown on every question.' : ' previous year questions from APSSB exams.') + '</p>' + pyqVideoLink(t) + '<div class="quizzes">' + pyq + '</div>' : "") +
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
      (x.y && q.kind !== "mock" ? '<p class="srcline">' + x.y + '</p>' : x.tg ? '<p class="srcline">' + x.tg + '</p>' : "") +
      (x.pre ? '<p class="pre">' + x.pre + '</p>' : "") + (x.pi ? fig(x.pi) : "") + (x.img && x.ip === "before" ? fig(x.img) : "") +
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
    const src = (q._t ? q._t.name + ", " : "") + (q.b ? "Book Q. " + q.b : (q.y || q.tg || ""));
    return '<article class="ritem"><div class="rhead"><h3 class="rtopic"><span class="qno">Q' + (j + 1) + '.</span> <span class="bookq">' + src + '</span></h3>' + status + '</div>' +
      (q.pre ? '<p class="pre">' + q.pre + '</p>' : "") + (q.pi ? fig(q.pi) : "") + (q.img && q.ip === "before" ? fig(q.img) : "") +
      '<p class="rq">' + q.t + '</p>' + (q.img && q.ip !== "before" ? fig(q.img) : "") +
      '<div class="ropts' + (long ? " long" : "") + '">' + opts + '</div><p class="rline">' + line + '</p>' +
      '<div class="solution"><h4>Solution</h4><ol class="steps">' + q.s.map(function (s) { return "<li>" + s + "</li>"; }).join("") + '</ol>' +
      (sec && sec.k ? '<details class="key"><summary>Key idea</summary><p>' + sec.k + '</p></details>' : "") + '</div></article>';
  }

  function nextOf(q) {
    if (q.kind === "mock") return { href: "#mock", label: "Back to mock tests" };
    if (q.kind === "revision") return { href: "#mistakes", label: "Back to my mistakes" };
    const t = q.t, nt = TOPICS[t.index + 1];
    if (q.kind === "book" && q.k < bookCount(t)) return { href: "#" + info(t, "book", q.k + 1).id, label: "Next quiz" };
    if (q.kind === "book" && pyqCount(t)) return { href: "#" + info(t, "pyq", 1).id, label: "Start PYQ Quiz 1" };
    if (q.kind === "pyq" && q.k < pyqCount(t)) return { href: "#" + info(t, "pyq", q.k + 1).id, label: "Next PYQ quiz" };
    return nt ? { href: "#" + nt.slug, label: "Next topic: " + nt.name } : { href: "#practice", label: "All topics" };
  }

  function resultView(q) {
    const p = store.progress[q.id], qs = q.qs, t = q.t;
    let c = 0, w = 0, s = 0;
    qs.forEach(function (x, j) { const a = p.lastAnswers[j]; if (a === null) s++; else if (a === x.k) c++; else w++; });
    const nx = nextOf(q);
    const sub = q.kind === "mock" ? (q.paper ? q.paper.name + " Reasoning paper, " : subjName(q.subject) + " section, ") + qs.length + " questions, 2 marks each, no negative marking" : q.kind === "revision" ? "Your " + subjName(q.subject) + " mistakes, " + qs.length + " questions" : q.kind === "pyq" ? t.name + ", " + q.label + (subjOf(t) === "reasoning" ? " (previous year questions)" : " (APSSB previous year questions)") : t.name + ", " + q.label + " (book questions " + q.from + "–" + q.to + ")";
    return '<p class="crumb"><a href="#' + t.slug + '">' + t.name + '</a> <span aria-hidden="true">/</span> ' + q.label + '</p>' + milestoneCard() +
      '<section class="sheet result" aria-labelledby="pagetitle"><h1 id="pagetitle" tabindex="-1">Your result</h1>' +
      '<p class="cand">' + sub + '</p>' +
      '<div class="score" role="img" aria-label="Score ' + c + ' out of ' + qs.length + '"><svg viewBox="0 0 230 130" aria-hidden="true"><path pathLength="1" d="M158 22 C106 8 34 22 26 62 C19 101 86 121 148 113 C205 105 220 70 206 42 C195 21 158 11 110 16"/></svg>' +
      '<span class="score-text" aria-hidden="true">' + (q.kind === "mock" ? (c * MOCK.marks) + '<small>/' + (qs.length * MOCK.marks) : c + '<small>/' + qs.length) + '</small></span></div>' +
      '<p class="verdict">' + verdict(c, qs.length) + '</p>' +
      '<p class="tally">' + c + ' correct, ' + w + ' wrong, ' + s + ' not attempted. Time taken: ' + duration(p.lastTime) + '. Best score: ' + p.best + '/' + qs.length + '.</p>' +
      '<div class="btnrow"><a class="btn primary block" href="' + nx.href + '">' + nx.label + '</a><button type="button" class="btn block share" data-action="share">Share my score on WhatsApp</button><button type="button" class="btn block" data-action="retake">' + (q.kind === "mock" ? "Retake this mock test" : "Retake this quiz") + '</button><a class="btn block" href="#report">See my report</a></div>' +
      (q.kind === "mock" ? mockBreakdown(q, p) : "") +
      '<a class="backlink" href="#' + t.slug + '">Back to ' + t.name + '</a></section>' + leadCard() + adBlock(q) +
      '<section class="sheet review" aria-labelledby="ktitle"><h2 id="ktitle">Answer key with solutions</h2>' +
      qs.map(function (x, j) { return reviewItem(t, x, j, p.lastAnswers[j]); }).join("") + '</section>';
  }

  function tick() {
    const a = runningId ? store.active[runningId] : null;
    const lim = runningId ? limitOf(runningId) : 0;
    if (a && lim) {
      const left = lim - elapsedOf(a);
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
    else if (view.screen === "quiz") html = view.mode === "result" ? resultView(view.q) : view.mode === "lead" ? leadGate() : quizView(view.q);
    else if (view.screen === "practice") html = practiceView();
    else if (view.screen === "mock") html = mockView();
    else if (view.screen === "report") html = reportView();
    else if (view.screen === "today") html = todayView();
    else if (view.screen === "finder") html = finderView();
    else if (view.screen === "mistakes") html = mistakesView();
    else html = landingView();
    document.body.setAttribute("data-screen", view.screen === "quiz" && view.mode === "lead" ? "lead" : view.screen === "quiz" && view.mode !== "result" ? "quiz" : view.screen);
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
    if (h === "today") return { screen: "today" };
    if (h === "finder") return { screen: "finder" };
    if (h === "mistakes") return { screen: "mistakes" };
    const pm = h.match(/^paper-([a-z0-9-]+)$/);
    if (pm && PAPERS[pm[1]]) return { screen: "quiz", topic: MOCKT, q: paperInfo(pm[1]) };
    const rm = h.match(/^rev-(\d{1,3})$/);
    if (rm && store.revRefs["rev-" + rm[1]]) return { screen: "quiz", topic: REVT, q: revInfo(Number(rm[1])) };
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
      if (!store.lead && (store.active[q.id] || !store.progress[q.id])) view.mode = "lead";
      else if (store.active[q.id]) { store.active[q.id].resumedAt = Date.now(); runningId = q.id; view.mode = "quiz"; save(); }
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
    noteMistakes(q, a.answers);
    const done = Object.keys(store.progress).length;
    reachMilestones([].concat(done >= 5 ? ["q5"] : [], done >= 20 ? ["q20"] : [], q.kind === "mock" ? ["mock1"] : []));
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

  document.addEventListener("keydown", function (e) { if (e.key === "Enter" && e.target && (e.target.id === "ldname" || e.target.id === "ldphone")) { e.preventDefault(); saveLead(); } });
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
        closeDialog(true); store = { progress: {}, active: {}, mockRefs: {}, mockCount: 0, mistakes: {}, mistakesReady: true, revRefs: {}, revCount: 0, qotd: { days: {}, streak: 0, best: 0, last: "" }, profile: { name: store.profile.name }, milestones: {}, pending: "", lead: store.lead }; runningId = null; save(); render();
        break;
      case "cancel": closeDialog(); break;
      case "zoom": openZoom(el.getAttribute("data-key")); break;
      case "newmock": newMock(el.getAttribute("data-subject") || "maths"); break;
      case "newrev": newRevision(el.getAttribute("data-subject") === "reasoning" ? "reasoning" : "maths"); break;
      case "qotd": answerQotd(Number(el.getAttribute("data-i"))); break;
      case "shareqotd": shareQotd(); break;
      case "sendreport": sendReport(); break;
      case "savelead": saveLead(); break;
      case "finder": fnd[el.getAttribute("data-k")] = el.getAttribute("data-v"); render(); break;
      case "finderreset": fnd = {}; render(); break;
      case "subject": subjectTab = el.getAttribute("data-s") === "reasoning" ? "reasoning" : "maths"; render(); break;
      case "moretopics": topicsOpen[subjectTab] = !topicsOpen[subjectTab]; render(); break;
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

  initMistakes();
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
