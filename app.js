/* Builds the page from data.js and wires every interaction. No content lives here. */
(function () {
  "use strict";
  var D = window.SITE_DATA;
  if (!D) return;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M7 17L17 7M9 7h8v8"/></svg>';
  var PLUS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';

  function el(tag, attrs) {
    var n = document.createElement(tag), k;
    for (k in attrs || {}) {
      var val = attrs[k];
      if (val == null) continue;
      if (k === "text") n.textContent = val;
      else if (k === "html") n.innerHTML = val;
      else if (k === "class") n.className = val;
      else n.setAttribute(k, val);
    }
    for (var i = 2; i < arguments.length; i++) if (arguments[i]) n.appendChild(arguments[i]);
    return n;
  }
  function lastLine(p) {
    var ym = p.last.split("-");
    return "Last " + p.activity + " in " + MONTHS[+ym[1] - 1] + " " + ym[0];
  }
  function recency(ym) {
    var p = ym.split("-"), now = new Date();
    var m = (now.getFullYear() - +p[0]) * 12 + (now.getMonth() + 1 - +p[1]);
    return 1 / (1 + Math.max(0, m) / 18);
  }
  function pad2(n) { return (n < 10 ? "0" : "") + n; }

  /* ---------- text ---------- */
  $("#brand").textContent = D.person.name;
  $("#hero-name").textContent = D.person.name;
  $("#hero-tagline").textContent = D.person.tagline;
  $("#about-h").textContent = D.introduction;
  $("#about-h").setAttribute("data-split", "");
  $("#copy").textContent = "© " + new Date().getFullYear() + " " + D.person.name;

  D.links.forEach(function (l) {
    var li = el("li");
    if (l.url) {
      var tab = /^https?:|\.pdf$/i.test(l.url);
      var a = el("a", { href: l.url, target: tab ? "_blank" : null, rel: tab ? "noopener" : null,
        html: l.label + ' <span aria-hidden="true">\u2197</span>' });
      li.appendChild(a);
      if (l.text) li.appendChild(el("small", { class: "addr", text: l.text }));
    } else {
      li.appendChild(el("span", { class: "todo", html: l.label + "<small>to add</small>" }));
    }
    $("#links").appendChild(li);
  });

  /* ---------- hero water ---------- */
  var hero = $("#top"), heroText = $("#hero-text"), memLayer = $("#mem-layer");
  var W = D.water;
  var SH = window.WATER_SHAPES || {};
  var NS = "http://www.w3.org/2000/svg";

  // Project a hand-traced lon/lat outline into a 100-unit box (north up).
  function outline(sh) {
    var pts = [].concat.apply([], (sh.rings || []).concat(sh.lines || [], sh.canal ? [sh.canal] : []));
    if (!pts.length) return null;
    var lat0 = pts.reduce(function (s, q) { return s + q[1]; }, 0) / pts.length, k = Math.cos((lat0 * Math.PI) / 180);
    var P = function (q) { return [q[0] * k, -q[1]]; };
    var xs = pts.map(function (q) { return P(q)[0]; }), ys = pts.map(function (q) { return P(q)[1]; });
    var x0 = Math.min.apply(0, xs), y0 = Math.min.apply(0, ys);
    var s = 100 / Math.max(Math.max.apply(0, xs) - x0, Math.max.apply(0, ys) - y0);
    var T = function (q) { var a = P(q); return [(a[0] - x0) * s, (a[1] - y0) * s]; };
    var w = (Math.max.apply(0, xs) - x0) * s, h = (Math.max.apply(0, ys) - y0) * s;
    var fmt = function (a) { return a[0].toFixed(2) + " " + a[1].toFixed(2); };
    // Catmull-Rom through the traced points, so every shore is a smooth curve.
    var curve = function (p, closed) {
      var n = p.length, s = "M" + fmt(p[0]), last = closed ? n : n - 1;
      var at = function (i) { return closed ? p[(i + n) % n] : p[Math.max(0, Math.min(n - 1, i))]; };
      for (var i = 0; i < last; i++) {
        var p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
        s += "C" + fmt([p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]) + " " +
          fmt([p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]) + " " + fmt(p2);
      }
      return s + (closed ? "Z" : "");
    };
    var d = [];
    (sh.rings || []).forEach(function (r) { d.push(curve(r.map(T), true)); });
    (sh.lines || []).forEach(function (r) { d.push(curve(r.map(T), false)); });
    if (sh.canal) {
      var c = sh.canal.map(T), off = 1.8, L = [], R = [];
      c.forEach(function (a, i) {
        var b0 = c[Math.max(0, i - 1)], b1 = c[Math.min(c.length - 1, i + 1)];
        var dx = b1[0] - b0[0], dy = b1[1] - b0[1], len = Math.sqrt(dx * dx + dy * dy) || 1;
        L.push([a[0] - (dy / len) * off, a[1] + (dx / len) * off]);
        R.push([a[0] + (dy / len) * off, a[1] - (dx / len) * off]);
      });
      d.push(curve(L.concat(R.reverse()), true));
    }
    return { d: d.join(""), w: w, h: h };
  }

  var mems = W.places.map(function (p, i) {
    var o = outline(SH[p.name] || {}) || { d: "M50 50m-40 0a40 40 0 1 0 80 0a40 40 0 1 0 -80 0", w: 100, h: 100 };
    var svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", (-3) + " " + (-3) + " " + (o.w + 6).toFixed(2) + " " + (o.h + 6).toFixed(2));
    svg.setAttribute("class", "shape");
    svg.setAttribute("aria-hidden", "true");
    var path = document.createElementNS(NS, "path");
    path.setAttribute("d", o.d);
    path.setAttribute("pathLength", "1");
    path.style.animationDelay = (0.9 + i * 0.12) + "s";
    svg.appendChild(path);
    var b = el("button", { class: "mem", type: "button", "aria-label": p.name + ", " + p.where + ". " + lastLine(p) + "." },
      el("span", { class: "mem-card", "aria-hidden": "true" },
        el("b", { text: p.name }), el("span", { class: "where", text: p.where }), el("span", { class: "when", text: lastLine(p) })));
    b.insertBefore(svg, b.firstChild);
    b._ar = o.w / o.h;
    b.addEventListener("pointerenter", function () { art && art.setActive(i); });
    b.addEventListener("pointerleave", function () { art && art.setActive(null); });
    b.addEventListener("focus", function () { art && art.setActive(i); });
    b.addEventListener("blur", function () { art && art.setActive(null); });
    memLayer.appendChild(b);
    return b;
  });

  // Size and place each outline on the lake; returns markers for the water engine.
  function placeShapes(w, h) {
    var narrow = w < 760;
    return W.places.map(function (p, i) {
      var b = mems[i], at = (narrow && p.atNarrow) || p.at, size = (p.size || 150) * (narrow ? 0.55 : 1);
      if (w >= 760 && w < 1200) size *= 0.82;
      var ar = b._ar, bw = ar >= 1 ? size : size * ar, bh = ar >= 1 ? size / ar : size;
      var cx = at[0] * w, cy = at[1] * h;
      cx = Math.max(bw / 2 + 12, Math.min(w - bw / 2 - 12, cx));
      b.style.left = cx - bw / 2 + "px"; b.style.top = cy - bh / 2 + "px";
      b.style.width = bw + "px"; b.style.height = bh + "px";
      b.classList.toggle("up", ((narrow && p.labelNarrow) || p.label || (at[1] > 0.5 ? "above" : "below")) === "above");
      return { x: cx, y: cy, r: Math.max(bw, bh) * 0.5 };
    });
  }

  function rel(node, pad) {
    var a = node.getBoundingClientRect(), h = hero.getBoundingClientRect();
    return { x: a.left - h.left, y: a.top - h.top, w: a.width, h: a.height, pad: pad };
  }

  var art = window.WaterArt && window.WaterArt.create({
    canvas: $("#water"), glow: $("#glow"), host: hero, places: W.places, startPaused: reduce,
    getQuietRects: function () {
      return [rel($("#hero-name"), 34), rel($("#hero-tagline"), 26)];
    },
    getMarkers: function (w, h) { return placeShapes(w, h); },
    onLayout: function (w) {
      mems.forEach(function (b) {
        var card = b.querySelector(".mem-card"), cx = parseFloat(b.style.left) + parseFloat(b.style.width) / 2;
        var cw = card.offsetWidth || 200, lo = 12 - (cx - cw / 2), hi = w - 12 - (cx + cw / 2);
        card.style.setProperty("--shift", (lo > 0 ? lo : hi < 0 ? hi : 0) + "px");
      });
    },
  });

  var pauseBtn = $("#pause"), memBtn = $("#memories");
  if (art) {
    hero.classList.add("live");
    var setPause = function (p) {
      art.setPaused(p);
      $(".pl", pauseBtn).textContent = p ? "Play motion" : "Pause motion";
      pauseBtn.setAttribute("aria-pressed", String(p));
    };
    setPause(reduce);
    pauseBtn.addEventListener("click", function () { setPause(!art.isPaused()); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { art.relayout(); });
  } else {
    pauseBtn.hidden = true;
  }
  memBtn.addEventListener("click", function () {
    var on = memBtn.getAttribute("aria-pressed") !== "true";
    memBtn.setAttribute("aria-pressed", String(on));
    hero.classList.toggle("memories", on);
    art && art.setAll(on);
  });
  requestAnimationFrame(function () { setTimeout(function () { hero.classList.add("ready"); }, reduce ? 0 : 450); });

  /* ---------- work ---------- */
  var list = $("#work-list"), num = 0, layers = {}, peekIn = $("#peek-in");

  D.work.forEach(function (g) {
    var group = el("div", { class: "group" },
      el("h3", { class: "group-h rv" }, el("span", { text: g.group }), el("span", { class: "count", text: pad2(g.items.length) })));
    var ul = el("ul", { class: "rows" });
    g.items.forEach(function (it) {
      num++;
      var done = it.status === "complete";
      var tags = el("span", { class: "tags" });
      it.tags.forEach(function (t) { tags.appendChild(el("span", { text: t })); });
      var kids = [
        el("span", { class: "idx", text: pad2(num) }),
        el("span", { class: "ttl", text: it.title }),
        tags,
        el("span", { class: "ic " + (done ? "go" : "plus"), "aria-hidden": "true", html: done ? ARROW : PLUS }),
      ];
      var link, panel = null;
      var li = el("li", { class: "row rv", "data-id": it.id });
      if (done) {
        link = el("a", { class: "row-link", href: it.href });
        link.addEventListener("click", goTo);
      } else {
        link = el("button", { class: "row-link", type: "button", "aria-expanded": "false", "aria-controls": "p-" + it.id });
        panel = el("div", { class: "panel", id: "p-" + it.id },
          el("div", null, el("div", { class: "panel-in" },
            el("p", { class: "soon", text: "Case study in progress" }),
            it.summary ? el("p", { class: "sum", text: it.summary }) : null)));
        panel.inert = true;
        link.addEventListener("click", function () {
          var open = !li.classList.contains("open");
          li.classList.toggle("open", open);
          link.setAttribute("aria-expanded", String(open));
          panel.inert = !open;
        });
      }
      kids.forEach(function (k) { link.appendChild(k); });
      li.appendChild(link);
      if (panel) li.appendChild(panel);
      ul.appendChild(li);

      // preview layer
      var layer = el("div", { class: "layer" });
      if (it.preview && it.preview.type === "page") {
        var f = el("iframe", { tabindex: "-1", "aria-hidden": "true", title: "Preview" });
        f.dataset.src = it.preview.src;
        layer.appendChild(f);
      } else {
        var c = el("canvas");
        paintThumb(c, (it.preview && it.preview.colors) || ["#2b6cd6", "#6fe0cf"]);
        layer.appendChild(c);
        layer.appendChild(el("span", { class: "wip", text: "Case study in progress" }));
      }
      peekIn.appendChild(layer);
      layers[it.id] = layer;

      link.addEventListener("pointerenter", function (e) { showPeek(it.id, e.clientX, e.clientY); });
      link.addEventListener("focus", function () {
        var r = link.getBoundingClientRect();
        showPeek(it.id, r.left + r.width * 0.42, r.top + r.height / 2, true);
      });
      link.addEventListener("blur", hidePeek);
    });
    group.appendChild(ul);
    list.appendChild(group);
  });

  function hex(h) { h = h.replace("#", ""); return [0, 2, 4].map(function (i) { return parseInt(h.substr(i, 2), 16); }); }
  function paintThumb(c, cols) {
    var w = 420, h = 263, d = 2, x = c.getContext && c.getContext("2d");
    if (!x) return;
    c.width = w * d; c.height = h * d; x.scale(d, d);
    x.fillStyle = "#1b0f1e"; x.fillRect(0, 0, w, h);
    var A = hex(cols[0]), B = hex(cols[1]), p = 8;
    for (var j = p / 2; j < h; j += p) for (var i = p / 2; i < w; i += p) {
      var nx = (i - w * 0.5) / (w * 0.38), ny = (j - h * 0.5) / (h * 0.44), r = Math.sqrt(nx * nx + ny * ny);
      var n = 0.5 + 0.5 * Math.sin(i * 0.028 + Math.sin(j * 0.04) * 2.2) * Math.cos(j * 0.033 - Math.sin(i * 0.02));
      var L = (1 - Math.min(1, Math.max(0, (r - 0.62) / 0.45))) * (0.2 + 0.8 * n);
      if (L < 0.06) continue;
      var f = Math.min(1, n * 1.15);
      x.fillStyle = "rgb(" + [0, 1, 2].map(function (k) { return Math.round(A[k] + (B[k] - A[k]) * f); }).join(",") + ")";
      x.beginPath(); x.arc(i, j, (p / 2) * Math.pow(L, 0.7), 0, 6.2832); x.fill();
    }
  }

  /* cursor-follow live preview */
  var peek = $("#peek"), PW = 420, PH = 263;
  var fine = window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 900px)");
  var px = 0, py = 0, tx = 0, ty = 0, showing = false, praf = 0, cur = null;

  function loadFrames() {
    $$("iframe[data-src]", peekIn).forEach(function (f) { if (!f.src) f.src = f.dataset.src; });
  }
  if ("IntersectionObserver" in window) {
    var lio = new IntersectionObserver(function (es) {
      if (es[0].isIntersecting && fine.matches) { loadFrames(); lio.disconnect(); }
    }, { rootMargin: "600px 0px" });
    lio.observe(list);
  }
  function post(id, on) {
    var f = id && layers[id] && $("iframe", layers[id]);
    if (f && f.contentWindow) { try { f.contentWindow.postMessage({ pretzelPreview: on }, "*"); } catch (e) { /* ignore */ } }
  }
  function setTarget(x, y) {
    tx = x + 36; ty = y - PH / 2;
    if (tx + PW > window.innerWidth - 16) tx = x - PW - 36;
    ty = Math.max(72, Math.min(window.innerHeight - PH - 16, ty));
  }
  function loop() {
    praf = 0;
    var dx = tx - px, dy = ty - py;
    px += dx * 0.14; py += dy * 0.14;
    var rot = reduce ? 0 : Math.max(-5, Math.min(5, dx * 0.02));
    peek.style.transform = "translate3d(" + px.toFixed(1) + "px," + py.toFixed(1) + "px,0) rotate(" + rot.toFixed(2) + "deg)";
    if (showing || Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) praf = requestAnimationFrame(loop);
  }
  function showPeek(id, x, y, snap) {
    if (!fine.matches) return;
    loadFrames();
    if (cur !== id) {
      post(cur, false);
      for (var k in layers) layers[k].classList.toggle("on", k === id);
      cur = id; post(id, true);
    }
    setTarget(x, y);
    if (!showing) {
      if (snap || reduce || !peek.classList.contains("on")) { px = tx; py = ty; }
      showing = true; peek.classList.add("on");
    }
    if (!praf) praf = requestAnimationFrame(loop);
  }
  function hidePeek() {
    showing = false; peek.classList.remove("on"); post(cur, false); cur = null;
  }
  list.addEventListener("pointermove", function (e) { if (showing) setTarget(e.clientX, e.clientY); });
  list.addEventListener("pointerleave", hidePeek);
  window.addEventListener("scroll", function () { if (showing && !list.matches(":hover")) hidePeek(); }, { passive: true });

  /* ripple page transition */
  var wipe = $("#wipe");
  function goTo(e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    var href = this.href, x = e.clientX, y = e.clientY;
    if (showing) { x = px + PW / 2; y = py + PH / 2; }
    else if (!x && !y) { var r = this.getBoundingClientRect(); x = r.left + r.width / 2; y = r.top + r.height / 2; }
    wipe.style.setProperty("--x", x + "px");
    wipe.style.setProperty("--y", y + "px");
    hidePeek();
    wipe.classList.add("go");
    setTimeout(function () { window.location.href = href; }, reduce ? 0 : 900);
  }
  window.addEventListener("pageshow", function () { wipe.classList.remove("go"); });

  /* ---------- play ---------- */
  $("#play-sub").textContent = W.subtitle;
  var regions = [];
  W.places.forEach(function (p) { if (regions.indexOf(p.region) < 0) regions.push(p.region); });
  regions.forEach(function (reg) {
    var items = W.places.filter(function (p) { return p.region === reg; });
    var ol = el("ol", { class: "places-list" });
    items.forEach(function (p) {
      var i = W.places.indexOf(p);
      var btn = el("button", { type: "button", "aria-label": p.name + ", " + p.where + ". " + lastLine(p) + ". Show it in the water." },
        el("span", { class: "pdot", style: "--a:" + (0.25 + 0.75 * recency(p.last)).toFixed(2), "aria-hidden": "true" }),
        el("span", { class: "pname", text: p.name }),
        el("span", { class: "pwhere", text: p.where }),
        el("span", { class: "plast", text: lastLine(p) }),
        el("span", { class: "parr", "aria-hidden": "true", text: "\u2191" }));
      btn.addEventListener("click", function () { showMemory(i); });
      ol.appendChild(el("li", { class: "place rv" }, btn));
    });
    $("#places").appendChild(el("div", { class: "region" },
      el("h3", { class: "group-h rv" }, el("span", { text: reg || "Places" }), el("span", { class: "count", text: pad2(items.length) })), ol));
  });
  var memTimer = 0;
  function showMemory(i) {
    hero.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
    clearTimeout(memTimer);
    memTimer = setTimeout(function () {
      mems.forEach(function (m, k) { m.classList.toggle("show", k === i); });
      art && art.setActive(i);
      memTimer = setTimeout(function () { mems[i].classList.remove("show"); art && art.setActive(null); }, 3600);
    }, reduce ? 0 : 750);
  }

  /* ---------- reveal + split headings (same approach as the Pretzel page) ---------- */
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
    $$(".w > span", h).forEach(function (s, i) { s.style.transitionDelay = i * 0.06 + "s"; });
    h.classList.add("split");
  });
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.15, rootMargin: "0px 0px -6% 0px" });
    $$(".rv, .split").forEach(function (n) { io.observe(n); });
    // stagger rows inside each list
    $$(".rows, .places-list").forEach(function (l) { $$(".rv", l).forEach(function (n, i) { n.style.transitionDelay = i * 0.07 + "s"; }); });
  } else {
    $$(".rv, .split").forEach(function (n) { n.classList.add("in"); });
  }

  /* ---------- scroll progress ---------- */
  var prog = $("#progress"), ticking = false;
  function onScroll() {
    ticking = false;
    var h = document.documentElement.scrollHeight - window.innerHeight;
    prog.style.transform = "scaleX(" + (h > 0 ? window.scrollY / h : 0) + ")";
    nav.classList.toggle("solid", window.scrollY > hero.offsetHeight - 80);
  }
  var nav = $(".nav");
  window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();
})();
