/* About page: reveals, page transitions, links, and the dotted portrait placeholder. */
(function () {
  "use strict";
  var D = window.SITE_DATA || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function el(tag, attrs) {
    var n = document.createElement(tag);
    for (var k in attrs || {}) {
      if (attrs[k] == null) continue;
      if (k === "text") n.textContent = attrs[k];
      else if (k === "html") n.innerHTML = attrs[k];
      else n.setAttribute(k, attrs[k]);
    }
    for (var i = 2; i < arguments.length; i++) if (arguments[i]) n.appendChild(arguments[i]);
    return n;
  }
  var LINK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13.5a4.2 4.2 0 0 0 6 .4l2.6-2.6a4.2 4.2 0 0 0-6-6l-1.3 1.3"/><path d="M14 10.5a4.2 4.2 0 0 0-6-.4l-2.6 2.6a4.2 4.2 0 0 0 6 6l1.3-1.3"/></svg>';

  /* links and footer, from data.js */
  (D.links || []).forEach(function (l) {
    if (!l.url) return;
    var tab = /^https?:|\.pdf$/i.test(l.url);
    var li = el("li", null, el("a", { href: l.url, target: tab ? "_blank" : null, rel: tab ? "noopener" : null,
      html: l.label + ' <span class="li-ic" aria-hidden="true">' + (tab ? LINK : "↗") + "</span>" }));
    if (l.text) li.appendChild(el("small", { class: "addr", text: l.text }));
    $("#links").appendChild(li);
  });
  /* "Let’s Build Together" under Say hello, pointed at the same booking link as the hero */
  if (D.person && D.person.bookingUrl) $("#book").href = D.person.bookingUrl;
  $("#copy").textContent = "© " + new Date().getFullYear() + " " + ((D.person && D.person.name) || "Philman Yeung");

  /* portrait: a photo if one is set, otherwise a field of dots from the lake */
  var fig = $("#portrait"), cv = $("#portrait-dots");
  if (fig.dataset.src) {
    fig.classList.add("has-photo");
    fig.insertBefore(el("img", { src: fig.dataset.src, alt: "Philman Yeung" }), fig.firstChild);
  } else {
    var ctx = cv.getContext("2d"), W = 0, H = 0, dpr = 1, mx = -999, my = -999, hits = [], t0 = performance.now(), raf = 0, vis = true;
    var A = [95, 211, 196], B = [255, 138, 61];
    var size = function () {
      var r = fig.getBoundingClientRect(); dpr = Math.min(2, window.devicePixelRatio || 1);
      W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    var draw = function (now) {
      raf = 0;
      var t = (now - t0) / 1000, g = 10, cols = Math.ceil(W / g) + 1, rows = Math.ceil(H / g) + 1;
      ctx.clearRect(0, 0, W, H);
      hits = hits.filter(function (h) { return t - h.t < 2.4; });
      for (var j = 0; j < rows; j++) {
        for (var i = 0; i < cols; i++) {
          var x = i * g + (j % 2 ? g / 2 : 0), y = j * g;
          var u = x / W, v = y / H;
          // slow swells, brighter toward the top like light on water
          var s = 0.5 + 0.25 * Math.sin(u * 7 + t * 0.9 + v * 3) + 0.2 * Math.sin(v * 11 - t * 1.3 + u * 2) - v * 0.25;
          var dm = Math.hypot(x - mx, y - my); s += Math.max(0, 1 - dm / 70) * 0.5;
          for (var k = 0; k < hits.length; k++) {
            var hd = Math.hypot(x - hits[k].x, y - hits[k].y), ring = (t - hits[k].t) * 140;
            s += Math.max(0, 1 - Math.abs(hd - ring) / 18) * 0.6 * (1 - (t - hits[k].t) / 2.4);
          }
          s = Math.max(0.04, Math.min(1, s));
          var m = Math.min(1, Math.max(0, u * 0.45 + v * 0.75 - 0.1));
          ctx.fillStyle = "rgba(" + Math.round(A[0] + (B[0] - A[0]) * m) + "," + Math.round(A[1] + (B[1] - A[1]) * m) + "," +
            Math.round(A[2] + (B[2] - A[2]) * m) + "," + (0.35 + s * 0.6).toFixed(2) + ")";
          ctx.beginPath(); ctx.arc(x, y, 0.6 + s * 3.2, 0, 6.2832); ctx.fill();
        }
      }
      if (!reduce && vis) raf = requestAnimationFrame(draw);
    };
    size(); draw(performance.now());
    window.addEventListener("resize", function () { size(); if (!raf) draw(performance.now()); });
    fig.addEventListener("pointermove", function (e) { var r = fig.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; });
    fig.addEventListener("pointerleave", function () { mx = my = -999; });
    fig.addEventListener("pointerdown", function (e) {
      var r = fig.getBoundingClientRect(); hits.push({ x: e.clientX - r.left, y: e.clientY - r.top, t: (performance.now() - t0) / 1000 });
    });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) {
        vis = es[0].isIntersecting;
        if (vis && !raf && !reduce) raf = requestAnimationFrame(draw);
      }).observe(fig);
    }
  }

  /* sketches pasted on the portrait: hover or focus lifts one and shows its note; tap pins it on touch */
  var notes = $$(".pnote");
  notes.forEach(function (n) {
    n.setAttribute("aria-pressed", "false");
    n.addEventListener("click", function (e) {
      e.stopPropagation();
      var on = !n.classList.contains("on");
      notes.forEach(function (o) { o.classList.remove("on"); o.setAttribute("aria-pressed", "false"); });
      n.classList.toggle("on", on); n.setAttribute("aria-pressed", String(on));
    });
    n.addEventListener("keydown", function (e) { if (e.key === "Escape") { n.classList.remove("on"); n.setAttribute("aria-pressed", "false"); n.blur(); } });
  });
  document.addEventListener("click", function () { notes.forEach(function (o) { o.classList.remove("on"); o.setAttribute("aria-pressed", "false"); }); });

  /* ripple page transition for links within the site */
  $$("a[href]").forEach(function (a) {
    var h = a.getAttribute("href");
    if (a.target === "_blank" || /^(https?:|mailto:|#)/.test(h)) return;
    a.addEventListener("click", function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || !window.flowTo) return;
      e.preventDefault();
      var x = e.clientX, y = e.clientY;
      if (!x && !y) { var r = a.getBoundingClientRect(); x = r.left + r.width / 2; y = r.top + r.height / 2; }
      window.flowTo(a.href, x, y);
    });
  });

  /* "new page" tooltip for links that leave the site */
  var tip = el("div", { class: "tip", role: "tooltip", id: "tip", text: "" });
  document.body.appendChild(tip);
  function tipAt(a) {
    tip.textContent = a.getAttribute("data-tip") || "This will send you to a new page";
    var anchor = $(".li-ic", a) || a, r = anchor.getBoundingClientRect();
    tip.classList.add("on");
    var w = tip.offsetWidth, x = Math.max(12, Math.min(window.innerWidth - w - 12, r.left + r.width / 2 - w / 2));
    tip.style.transform = "translate(" + x.toFixed(0) + "px," + (r.top - tip.offsetHeight - 10).toFixed(0) + "px)";
  }
  function tipOff() { tip.classList.remove("on"); }
  $$('a[target="_blank"]').forEach(function (a) {
    a.setAttribute("aria-describedby", "tip");
    a.addEventListener("pointerenter", function () { tipAt(a); });
    a.addEventListener("focus", function () { tipAt(a); });
    a.addEventListener("pointerleave", tipOff);
    a.addEventListener("blur", tipOff);
  });
  window.addEventListener("scroll", tipOff, { passive: true });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") tipOff(); });

  /* split headings and reveals */
  $$("[data-split]").forEach(function (h) {
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (c) {
        if (c.nodeType === 3) {
          var f = document.createDocumentFragment();
          c.textContent.split(/(\s+)/).forEach(function (t) {
            if (!t) return;
            if (/^\s+$/.test(t)) { f.appendChild(document.createTextNode(t)); return; }
            f.appendChild(el("span", { class: "w" }, el("span", { text: t })));
          });
          c.parentNode.replaceChild(f, c);
        } else if (c.nodeType === 1) walk(c);
      });
    })(h);
    $$(".w > span", h).forEach(function (s, i) { s.style.transitionDelay = 0.15 + i * 0.07 + "s"; });
    h.classList.add("split");
  });
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.15, rootMargin: "0px 0px -6% 0px" });
    $$(".rv, .split").forEach(function (n) { io.observe(n); });
  } else {
    $$(".rv, .split").forEach(function (n) { n.classList.add("in"); });
  }

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
})();
