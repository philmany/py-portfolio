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
  var LINK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13.5a4.2 4.2 0 0 0 6 .4l2.6-2.6a4.2 4.2 0 0 0-6-6l-1.3 1.3"/><path d="M14 10.5a4.2 4.2 0 0 0-6-.4l-2.6 2.6a4.2 4.2 0 0 0 6 6l1.3-1.3"/></svg>';
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
  [].concat(D.person.tagline).forEach(function (line, i) {
    if (i) $("#hero-tagline").appendChild(el("br"));
    window.Rolodex.fill($("#hero-tagline"), line, D.person.taglineSpeed);
  });
  [].concat(D.introduction).forEach(function (line, i) {
    if (i) $("#about-h").appendChild(el("br"));
    window.Rolodex.fill($("#about-h"), line, D.introductionSpeed);
  });
  $("#about-h").setAttribute("data-split", "");
  $("#copy").textContent = "© " + new Date().getFullYear() + " " + D.person.name;

  D.links.forEach(function (l) {
    var li = el("li");
    if (l.url) {
      var tab = /^https?:|\.pdf$/i.test(l.url);
      var a = el("a", { href: l.url, target: tab ? "_blank" : null, rel: tab ? "noopener" : null,
        html: l.label + ' <span class="li-ic" aria-hidden="true">' + (tab ? LINK : "\u2197") + "</span>" });
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
    // straight segments between the points: no smoothing, so shores stay crisp
    var curve = function (p, closed) {
      return "M" + p.map(fmt).join("L") + (closed ? "Z" : "");
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
    svg.appendChild(path);
    var b = el("button", { class: "mem", type: "button", "aria-expanded": "false",
                           "aria-label": p.name + ", " + p.where + ". " + lastLine(p) + ". Select to focus on it." },
      el("span", { class: "mem-card", "aria-hidden": "true" },
        el("b", { text: p.name }), el("span", { class: "where", text: p.where }), el("span", { class: "when", text: lastLine(p) })));
    b.insertBefore(el("span", { class: "mem-fx", "aria-hidden": "true" }, svg), b.firstChild);
    if (p.photo) {
      b.classList.add("has-snap");
      var img = el("img", { src: p.photo, alt: "", loading: "lazy", decoding: "async" });
      img.addEventListener("load", function () { if (img.naturalWidth > img.naturalHeight) snap.classList.add("wide"); });
      var snap = el("span", { class: "mem-snap", "aria-hidden": "true", style: "--i:" + i }, img);
      b.appendChild(snap);
    }
    b._ar = o.w / o.h;
    b.addEventListener("click", function (e) { e.stopPropagation(); setOn(b, !b.classList.contains("on")); });
    memLayer.appendChild(b);
    return b;
  });

  // Hover shows the label in place. A click focuses: the dots dim, and the
  // outline glides toward the centre and grows. Click again, click the water,
  // or press Escape to let it go.
  function setOn(b, on) {
    mems.forEach(function (m) {
      var x = m === b && on;
      m.classList.toggle("on", x);
      m.setAttribute("aria-expanded", String(x));
    });
    hero.classList.toggle("focus", !!on);
  }
  hero.addEventListener("click", function (e) { if (!e.target.closest(".mem, .ctl, a")) setOn(null, false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") setOn(null, false); });

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
      var up = ((narrow && p.labelNarrow) || p.label || (at[1] > 0.5 ? "above" : "below")) === "above";
      b.classList.toggle("up", up);
      // where it travels on hover: halfway to the centre, grown to a comfortable size
      var big = Math.min(Math.max(bw, bh) * (narrow ? 2.2 : 1.9), w * (narrow ? 0.7 : 0.4), h * 0.42);
      var sc = Math.max(1.15, big / Math.max(bw, bh));
      var tx = (w / 2 - cx) * 0.5, ty = (h * 0.52 - cy) * 0.5;
      b.style.setProperty("--tx", tx.toFixed(1) + "px");
      b.style.setProperty("--ty", ty.toFixed(1) + "px");
      b.style.setProperty("--sc", sc.toFixed(3));
      b.style.setProperty("--cdy", ((sc - 1) * bh / 2 * (up ? -1 : 1)).toFixed(1) + "px");
      // the snapshot rides along beside the grown outline
      var side = (narrow && p.photoSideNarrow) || p.photoSide || "right";
      ["left", "right", "below"].forEach(function (s) { b.classList.toggle("snap-" + s, p.photo && s === side); });
      var sideSign = side === "left" ? -1 : side === "below" ? 0 : 1;
      b.style.setProperty("--sdx", (sideSign * (sc - 1) * bw / 2).toFixed(1) + "px");
      b.style.setProperty("--sdy", ((sc - 1) * bh / 2).toFixed(1) + "px");
      return { x: cx, y: cy, r: Math.max(bw, bh) * 0.5 };
    });
  }

  function rel(node, pad) {
    var a = node.getBoundingClientRect(), h = hero.getBoundingClientRect();
    return { x: a.left - h.left, y: a.top - h.top, w: a.width, h: a.height, pad: pad };
  }

  var art = window.WaterArt && window.WaterArt.create({
    canvas: $("#water"), glow: $("#glow"), haze: $("#haze"), host: hero, places: W.places, startPaused: reduce,
    getQuietRects: function () {
      // the title; the outlines carry their own close feather (CSS drop-shadow)
      var r = [rel($("#hero-name"), 34), rel($("#hero-tagline"), 26)];
      return r;
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

  /* ---------- brands marquee ---------- */
  if (D.brands && D.brands.items && D.brands.items.length) {
    $("#brands-h").textContent = D.brands.label;
    var track = $("#brand-track");
    var addSet = function (hidden) {
      D.brands.items.forEach(function (b) {
        var inner = b.logo ? el("img", { src: b.logo, alt: hidden ? "" : b.name, loading: "lazy",
                                         style: "--h:" + (b.height || 28) + "px" })
                           : el("span", { class: "wordmark", text: b.name });
        var node = b.url
          ? el("a", { href: b.url, target: "_blank", rel: "noopener", tabindex: hidden ? "-1" : null,
                      "aria-label": hidden ? null : b.name + " (opens in a new tab)" }, inner)
          : inner;
        track.appendChild(el("li", { class: "logo-item", "aria-hidden": hidden ? "true" : null }, node));
      });
    };
    addSet(false); addSet(true); // second copy makes the loop seamless
  } else {
    $(".brands").hidden = true;
  }

  /* ---------- work ---------- */
  var list = $("#work-list"), num = 0, layers = {}, peekIn = $("#peek-in");

  // A list of rows (used by Work and Play). Finished items link out and show a
  // preview on hover; unfinished ones expand in place.
  function buildList(groups, container, soonText) {
    groups.forEach(function (g) {
      var group = el("div", { class: "group" });
      if (g.group) group.appendChild(el("h3", { class: "group-h rv" }, el("span", { text: g.group })));
      var ul = el("ul", { class: "rows" });
      g.items.forEach(function (it) {
        num++;
        var done = it.status === "complete", ext = done && /^https?:/.test(it.href);
        var tags = el("span", { class: "tags" });
        (it.tags || []).forEach(function (t) { tags.appendChild(el("span", { text: t })); });
        var kids = [
          el("span", { class: "dot", "aria-hidden": "true" }),
          el("span", { class: "ttl" }, document.createTextNode(it.title),
            it.ai ? el("sup", { class: "ai", text: "Vibe-Coded" }) : null),
          tags,
          el("span", { class: "ic " + (ext ? "out" : done ? "go" : "plus"), "aria-hidden": "true", html: ext ? LINK : done ? ARROW : PLUS }),
        ];
        var link, panel = null;
        var li = el("li", { class: "row rv", "data-id": it.id });
        if (done) {
          link = el("a", { class: "row-link", href: it.href, target: ext ? "_blank" : null, rel: ext ? "noopener" : null,
                           "aria-label": ext ? it.title + " (opens in a new tab)" : null });
          if (!ext) link.addEventListener("click", goTo);
        } else {
          link = el("button", { class: "row-link", type: "button", "aria-expanded": "false", "aria-controls": "p-" + it.id });
          panel = el("div", { class: "panel", id: "p-" + it.id },
            el("div", null, el("div", { class: "panel-in" },
              el("p", { class: "soon", text: soonText }),
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

        // preview layer: a live page, a screenshot, or a dot thumbnail
        var layer = el("div", { class: "layer" }), pv = it.preview || {};
        if (pv.type === "page") {
          var f = el("iframe", { tabindex: "-1", "aria-hidden": "true", title: "Preview" });
          f.dataset.src = pv.src;
          layer.appendChild(f);
        } else if (pv.type === "image") {
          layer.appendChild(el("img", { class: "shot", src: pv.src, alt: "", loading: "lazy" }));
          if (it.summary) layer.appendChild(el("p", { class: "cap", text: it.summary }));
        } else {
          var c = el("canvas");
          paintThumb(c, pv.colors || ["#2b6cd6", "#6fe0cf"]);
          layer.appendChild(c);
          layer.appendChild(el("span", { class: "wip", text: soonText }));
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
      container.appendChild(group);
    });
    container.addEventListener("pointermove", function (e) { if (showing) setTarget(e.clientX, e.clientY); });
    container.addEventListener("pointerleave", hidePeek);
  }
  buildList(D.work, list, "Case study in progress");
  var playList = $("#play-list");
  if (playList && D.play) { num = 0; buildList(D.play, playList, "Coming soon"); }

  // each row's dot takes a colour from the lake: teal down to tangerine
  $$(".work-list").forEach(function (wl) {
    var dots = $$(".dot", wl), A = [95, 211, 196], B = [255, 138, 61];
    dots.forEach(function (d, i) {
      var t = dots.length > 1 ? i / (dots.length - 1) : 0;
      d.style.setProperty("--c", "rgb(" + A.map(function (v, k) { return Math.round(v + (B[k] - v) * t); }).join(",") + ")");
    });
  });

  /* "new page" tooltip for every link that leaves the site */
  var tip = el("div", { class: "tip", role: "tooltip", id: "tip", text: "This will send you to a new page" });
  document.body.appendChild(tip);
  function tipAt(a) {
    var anchor = $(".ic", a) || $("img", a) || $(".li-ic", a) || a, r = anchor.getBoundingClientRect();
    tip.classList.add("on");
    var w = tip.offsetWidth, x = r.left + r.width / 2 - w / 2;
    x = Math.max(12, Math.min(window.innerWidth - w - 12, x));
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
  var fine = window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 640px)");
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
  window.addEventListener("scroll", function () { if (showing && !document.querySelector(".work-list:hover")) hidePeek(); }, { passive: true });

  /* ripple page transition */
  function goTo(e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    var href = this.href, x = e.clientX, y = e.clientY;
    if (showing) { x = px + PW / 2; y = py + PH / 2; }
    else if (!x && !y) { var r = this.getBoundingClientRect(); x = r.left + r.width / 2; y = r.top + r.height / 2; }
    hidePeek();
    if (window.flowTo) window.flowTo(href, x, y); else window.location.href = href;
  }
  $$('.nav a[href$=".html"]').forEach(function (a) { a.addEventListener("click", goTo); });

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
        } else if (c.nodeType === 1 && c.classList.contains("roll-wrap")) {
          // a rolodex word rises in with the rest, then keeps flipping on its own
          var w = el("span", { class: "w" }), inner = el("span");
          c.parentNode.replaceChild(w, c); inner.appendChild(c); w.appendChild(inner);
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
    $$(".rows").forEach(function (l) { $$(".rv", l).forEach(function (n, i) { n.style.transitionDelay = i * 0.07 + "s"; }); });
  } else {
    $$(".rv, .split").forEach(function (n) { n.classList.add("in"); });
  }

  /* ---------- scroll progress ---------- */
  var prog = $("#progress"), ticking = false;
  function onScroll() {
    ticking = false;
    var h = document.documentElement.scrollHeight - window.innerHeight;
    prog.style.transform = "scaleX(" + (h > 0 ? window.scrollY / h : 0) + ")";
    nav.classList.toggle("solid", window.scrollY > 40);
  }
  var nav = $(".nav");
  window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();
})();
