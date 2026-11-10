const CACHE = "apssb-maths-v2-a3b59f8a79";
const CORE = ["./", "index.html", "manifest.webmanifest", "images/amarjeet-sir-cartoon.jpg", "images/amarjeet-sir-face.jpg", "images/amarjeet-sir-main.jpg", "images/batch-appscce-csat.jpg", "images/batch-apssb-online.jpg", "images/batch-full-course-offline.jpg", "images/batch-maths-offline.jpg", "images/batch-maths-online-2026.jpg", "images/batch-maths-reasoning-2026.jpg", "images/batch-reasoning-online.jpg", "images/batch-selection-force-2026.jpg", "images/book-advanced.jpg", "images/book-basic.jpg", "images/book-notes.jpg", "images/book-reasoning-booster.jpg", "images/book-reasoning-notes.jpg", "images/classroom-practice.jpg", "images/g-average.jpg", "images/g-column.jpg", "images/g-discount.jpg", "images/g-exponents.jpg", "images/g-fullhall.jpg", "images/g-lcm.jpg", "images/g-packed.jpg", "images/g-simplify.jpg", "images/g-sqrt.jpg", "images/g-squares.jpg", "images/g-tsd.jpg", "images/g-writing.jpg", "images/hero-class-2026.jpg", "images/icon-192.png", "images/icon-512.png", "images/icon-maskable-512.png", "images/logo-full.png", "images/logo-icon.png", "images/og-image.jpg", "images/rank-bujum.jpg", "images/rank-jumram.jpg", "images/rank-jumyir.jpg", "images/result-cgl-2024.jpg", "images/result-chsl-2023.jpg", "images/result-csl-2023.jpg", "images/result-head-constable-2024.jpg", "images/result-stenographer-2024.jpg", "images/selections-banner.jpg", "images/team-photo.jpg"];
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
