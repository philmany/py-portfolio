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
  var grid = $(".ph-grid"), items = $$(".ph-item");
  function lay() {
    var cs = getComputedStyle(grid), cols = cs.gridTemplateColumns.split(" ").length;
    var gap = parseFloat(cs.columnGap) || 0, colW = (grid.clientWidth - gap * (cols - 1)) / cols;
    var mb = parseFloat(getComputedStyle(items[0]).marginBottom) || 0;
    items.forEach(function (li) {
      var span = li.classList.contains("ph-wide") ? Math.min(2, cols) : 1;
      var w = colW * span + gap * (span - 1), h = w / parseFloat(li.style.getPropertyValue("--ar"));
      li.style.setProperty("--rows", Math.ceil((h + mb) / 8));
    });
  }
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
  tiles.forEach(function (t, i) { t.addEventListener("click", function () { open(i); }); });
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
