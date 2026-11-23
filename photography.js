/* Photography page: reveals, page transitions, and the full-screen photo viewer. */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Preview mode: the home page's hover preview loads photography.html#preview in a small frame.
     Hide the chrome, show every photo, and drift down the page while the preview is visible.
     It is the live page, so the preview always matches whatever this page currently is. */
  var preview = location.hash === "#preview";
  if (preview) {
    document.documentElement.classList.add("is-preview");
    $$(".ph-open img").forEach(function (i) { i.loading = "eager"; });
    if (!reduce) {
      var on = false, y = 0, last = 0, hold = 1.2;
      var tick = function (ts) {
        if (!on) return;
        var dt = Math.min(0.05, (ts - (last || ts)) / 1000); last = ts;
        if (hold > 0) hold -= dt;
        else {
          y += dt * 260;
          var max = document.documentElement.scrollHeight - innerHeight;
          if (y >= max) { y = 0; hold = 1.2; }
          window.scrollTo(0, y);
        }
        requestAnimationFrame(tick);
      };
      addEventListener("message", function (e) {
        if (e.source !== parent || !e.data || e.data.pretzelPreview === undefined) return;
        var was = on; on = !!e.data.pretzelPreview;
        if (on && !was) { last = 0; requestAnimationFrame(tick); }
      });
    }
  }

  $("#copy").textContent = "© " + new Date().getFullYear() + " Philman Yeung";

  /* photos fade in as they finish loading, so the grid never shows half-drawn images */
  $$(".ph-open img").forEach(function (img) {
    var done = function () { img.parentNode.classList.add("ok"); };
    if (img.complete && img.naturalWidth) done(); else img.addEventListener("load", done, { once: true });
  });

  /* row-ordered masonry: give each tile as many 8px grid rows as its photo is tall */
  var grid = $(".ph-grid");
  function lay() {
    var items = $$(".ph-item", grid);
    var cs = getComputedStyle(grid), cols = cs.gridTemplateColumns.split(" ").length;
    var colW = grid.clientWidth / cols;
    // 1px rows: each tile is as tall as its photo, to the pixel, so neighbours meet with no gap.
    // Place each photo in the shortest column (reading order stays left to right, top to bottom)...
    var colH = [], colItems = [], i, c;
    for (c = 0; c < cols; c++) { colH.push(0); colItems.push([]); }
    items.forEach(function (li) {
      var h = Math.round(colW / parseFloat(li.style.getPropertyValue("--ar")));
      var k = colH.indexOf(Math.min.apply(Math, colH));
      colItems[k].push({ li: li, h: h }); colH[k] += h;
    });
    // ...then stretch the shorter columns a touch so every column ends on the same line.
    // object-fit: cover trims the few extra pixels from each photo; capped so no photo loses much.
    var target = Math.max.apply(Math, colH);
    for (c = 0; c < cols; c++) {
      var col = colItems[c], extra = target - colH[c];
      if (extra > 0 && extra / colH[c] <= 0.14) {
        var left = extra;
        col.forEach(function (t, n) {
          var add = n === col.length - 1 ? left : Math.round(extra * t.h / colH[c]);
          t.h += add; left -= add;
        });
      }
      var y = 1;
      col.forEach(function (t) {
        t.li.style.gridColumn = String(c + 1);
        t.li.style.gridRow = y + " / span " + t.h;
        y += t.h;
      });
    }
    fitLockup();
  }

  /* logo lockup: size "Photography" so it is exactly as wide as "Caurinus" */
  function fitLockup() {
    var a = $(".lk-a"), b = $(".lk-b");
    if (!a || !b) return;
    b.style.fontSize = "";
    var wa = a.firstChild.length ? measure(a) : a.offsetWidth, wb = b.getBoundingClientRect().width;
    if (wa && wb) b.style.fontSize = (parseFloat(getComputedStyle(b).fontSize) * wa / wb).toFixed(2) + "px";
  }
  function measure(el) {
    // width of the word itself, without the footnote marker
    var r = document.createRange(); r.selectNodeContents(el.firstChild); return r.getBoundingClientRect().width;
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitLockup);
  lay();
  var rT = 0;
  window.addEventListener("resize", function () { cancelAnimationFrame(rT); rT = requestAnimationFrame(lay); });

  /* split headings and scroll reveals, same as the rest of the site */
  $$("[data-split]").forEach(function (h) {
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (c) {
        if (c.nodeType === 3) {
          var f = document.createDocumentFragment();
          c.textContent.split(/(\s+)/).forEach(function (t) {
            if (!t) return;
            if (/^\s+$/.test(t)) { f.appendChild(document.createTextNode(t)); return; }
            var w = document.createElement("span"), i = document.createElement("span");
            w.className = "w"; i.textContent = t; w.appendChild(i); f.appendChild(w);
          });
          c.parentNode.replaceChild(f, c);
        } else if (c.nodeType === 1) walk(c);
      });
    })(h);
    $$(".w > span", h).forEach(function (s, i) { s.style.transitionDelay = 0.15 + i * 0.07 + "s"; });
    h.classList.add("split");
  });
  if ("IntersectionObserver" in window && !reduce && !preview) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.08, rootMargin: "0px 0px -4% 0px" });
    $$(".rv, .split").forEach(function (n) { io.observe(n); });
  } else {
    $$(".rv, .split").forEach(function (n) { n.classList.add("in"); });
  }

  /* ripple page transition for links within the site */
  $$("a[href]").forEach(function (a) {
    var h = a.getAttribute("href");
    if (a.target === "_blank" || /^(https?:|mailto:|#)/.test(h)) return;
    a.addEventListener("click", function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || !window.flowTo) return;
      e.preventDefault();
      window.flowTo(a.href, e.clientX, e.clientY);
    });
  });

  /* scroll progress and nav */
  var prog = $("#progress"), nav = $(".nav"), ticking = false;
  function onScroll() {
    ticking = false;
    var h = document.documentElement.scrollHeight - window.innerHeight;
    prog.style.transform = "scaleX(" + (h > 0 ? window.scrollY / h : 0) + ")";
    nav.classList.toggle("solid", window.scrollY > 40);
  }
  window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* ---------- viewer ---------- */
  var tiles = $$(".ph-open"), lb = $("#lb"), img = $("#lb-img"), count = $("#lb-count");
  function refreshTiles() { tiles = $$(".ph-open", grid); }
  var cur = -1, opener = null, canDialog = typeof lb.showModal === "function";

  function show(i, dir) {
    cur = (i + tiles.length) % tiles.length;
    var t = tiles[cur], thumb = $("img", t);
    img.classList.remove("in"); img.style.setProperty("--dx", (dir || 0) * 24 + "px");
    // the grid image is already cached: show it straight away, then swap in the large one
    img.src = thumb.currentSrc || thumb.src;
    img.width = +t.dataset.w; img.height = +t.dataset.h;
    img.alt = thumb.alt;
    count.textContent = (cur + 1) + " / " + tiles.length;
    var big = new Image(); big.decoding = "async";
    big.onload = function () { if (tiles[cur] === t) img.src = big.src; };
    big.src = t.dataset.full;
    requestAnimationFrame(function () { img.classList.add("in"); });
    // warm the neighbours so arrowing through feels instant
    [cur + 1, cur - 1].forEach(function (j) { var n = tiles[(j + tiles.length) % tiles.length]; (new Image()).src = n.dataset.full; });
  }
  function open(i) {
    opener = tiles[i];
    if (canDialog) lb.showModal(); else lb.setAttribute("open", "");
    document.documentElement.classList.add("lb-on");
    show(i, 0);
    $("#lb-x").focus();
  }
  function close() {
    if (canDialog && lb.open) lb.close(); else lb.removeAttribute("open");
  }
  lb.addEventListener("close", function () {
    document.documentElement.classList.remove("lb-on");
    if (opener) opener.focus();
  });
  grid.addEventListener("click", function (e) {
    var t = e.target.closest(".ph-open"); if (!t) return;
    refreshTiles(); open(tiles.indexOf(t));
  });

  /* ---------- shuffle ----------
     Every press deals a fresh random order. Photos this visitor hasn't scrolled past yet come first,
     so the top of the grid is always something new; ones they've seen go to the back. When almost
     everything has been seen, the slate is wiped (except what is on screen right now). */
  var KEY = "ph-seen", seen = {};
  try { seen = JSON.parse(sessionStorage.getItem(KEY) || "{}") || {}; } catch (e) { seen = {}; }
  function save() { try { sessionStorage.setItem(KEY, JSON.stringify(seen)); } catch (e) {} }
  if ("IntersectionObserver" in window && !preview) {
    var seenIO = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { seen[e.target.dataset.k] = 1; } });
      save();
    }, { threshold: 0.4 });
    $$(".ph-item", grid).forEach(function (li) { seenIO.observe(li); });
  }
  function shuffled(a) {
    for (var i = a.length - 1; i > 0; i--) { var r = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[r]; a[r] = t; }
    return a;
  }
  function onScreen(li) { var r = li.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; }
  var btn = $("#ph-shuffle"), status = $("#ph-status");
  btn.addEventListener("click", function () {
    var all = $$(".ph-item", grid), cols = getComputedStyle(grid).gridTemplateColumns.split(" ").length;
    var visibleNow = all.filter(onScreen), fresh = all.filter(function (li) { return !seen[li.dataset.k]; });
    // too few unseen left to fill the top two rows: start over, but never repeat what is on screen now
    if (fresh.length < cols * 2) {
      seen = {}; visibleNow.forEach(function (li) { seen[li.dataset.k] = 1; }); save();
      fresh = all.filter(function (li) { return !seen[li.dataset.k]; });
      status.textContent = "You've seen them all. Starting a new round.";
    } else status.textContent = "";
    var old = all.filter(function (li) { return fresh.indexOf(li) < 0; });
    var next = shuffled(fresh).concat(shuffled(old));
    var apply = function () {
      next.forEach(function (li) { grid.appendChild(li); li.classList.add("in"); });
      lay(); refreshTiles();
    };
    var top = $(".ph-gallery").getBoundingClientRect().top;
    if (top < 0) window.scrollTo({ top: scrollY + top - 80, behavior: reduce ? "auto" : "smooth" });
    if (document.startViewTransition && !reduce) {
      all.forEach(function (li) { li.style.viewTransitionName = "ph-" + li.dataset.k; });
      var vt = document.startViewTransition(apply);
      vt.finished.then(function () { all.forEach(function (li) { li.style.viewTransitionName = ""; }); });
    } else {
      grid.classList.add("dealing");
      setTimeout(function () { apply(); grid.classList.remove("dealing"); }, reduce ? 0 : 260);
    }
    btn.classList.remove("spin"); void btn.offsetWidth; btn.classList.add("spin");
  });
  $("#lb-x").addEventListener("click", close);
  $("#lb-prev").addEventListener("click", function () { show(cur - 1, -1); });
  $("#lb-next").addEventListener("click", function () { show(cur + 1, 1); });
  // a click on the dark backdrop (not the photo or the buttons) closes it
  lb.addEventListener("click", function (e) { if (e.target === lb || e.target.classList.contains("lb-fig")) close(); });
  lb.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight") { e.preventDefault(); show(cur + 1, 1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); show(cur - 1, -1); }
    else if (e.key === "Escape" && !canDialog) close();
  });
  // swipe left and right on touch screens
  var sx = 0, sy = 0, tracking = false;
  lb.addEventListener("touchstart", function (e) { if (e.touches.length !== 1) return; tracking = true; sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  lb.addEventListener("touchend", function (e) {
    if (!tracking) return; tracking = false;
    var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3) show(cur + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
    else if (dy > 90 && Math.abs(dy) > Math.abs(dx) * 1.3) close();   // swipe down to close
  }, { passive: true });
})();
