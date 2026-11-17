/*
  Halftone lake, seen at an angle. Canvas 2D, no libraries.

  - Perspective: the lake is a flat grid of water tilted away from you. Each
    row of dots further back is smaller, closer together, and drawn as a
    flatter ellipse, until the rows pack into a hazy horizon near the top.
    Near the bottom of the screen the dots are large and widely spaced.
  - 2.5D relief: every dot is lifted by the height of the water under it, so
    swells visibly roll across the surface instead of only changing brightness.
  - Waves: three wind swells of different lengths and directions roll toward
    you, with slow wave groups, like wind on Lake Ontario. On top of them a
    wave-equation height field carries rain, a wake behind the pointer and a
    stone where you click; its ripples spread as ellipses because of the tilt.
  - Light: faces of the waves that tilt toward you reflect the sky and glow
    (cool aqua to a warm glint); faces tilting away show the deep water. Far
    water reflects more sky (brighter, hazier), near water is darker.
  - Texture: two fine line screens woven over the dots (moiré), as before.
  - Dots fade under the text, under the navigation and into the page below.
  - Ambient motion and pausing never change any data value.
*/
(function () {
  "use strict";

  var STOPS = [
    [0.0, [16, 18, 70]],
    [0.15, [38, 40, 156]],
    [0.3, [30, 92, 214]],
    [0.45, [16, 150, 214]],
    [0.6, [18, 196, 182]],
    [0.74, [104, 230, 204]],
    [0.88, [208, 250, 236]],
    [1.0, [255, 230, 194]],
  ];
  var NB = 48, COLORS = [];
  (function () {
    for (var b = 0; b < NB; b++) {
      var t = b / (NB - 1), k = 1;
      while (k < STOPS.length - 1 && STOPS[k][0] < t) k++;
      var a = STOPS[k - 1], c = STOPS[k], f = (t - a[0]) / (c[0] - a[0]);
      COLORS.push("rgb(" + [0, 1, 2].map(function (j) {
        return Math.round(a[1][j] + (c[1][j] - a[1][j]) * f);
      }).join(",") + ")");
    }
  })();

  var C2 = 0.34, DAMP = 0.9935, STEP = 1000 / 60, TAU = Math.PI * 2;

  function smooth(a, b, x) {
    var t = (x - a) / (b - a);
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    return t * t * (3 - 2 * t);
  }
  function recency(ym) {
    var p = String(ym).split("-"), now = new Date();
    var m = (now.getFullYear() - +p[0]) * 12 + (now.getMonth() + 1 - +p[1]);
    return 1 / (1 + Math.max(0, m) / 18);
  }

  // A tile of fine wavy lines, used as a repeating pattern.
  function lineTile(period, thick, color, wave) {
    var c = document.createElement("canvas"), s = 240;
    c.width = s; c.height = s;
    var g = c.getContext("2d");
    if (!g) return null;
    g.fillStyle = color;
    for (var y = 0; y < s; y += period) {
      g.beginPath();
      for (var x = 0; x <= s; x += 2) {
        var yy = y + Math.sin((x / s) * TAU * 3) * wave;
        if (x === 0) g.moveTo(x, yy); else g.lineTo(x, yy);
      }
      for (x = s; x >= 0; x -= 2) g.lineTo(x, y + Math.sin((x / s) * TAU * 3) * wave + thick);
      g.closePath(); g.fill();
    }
    return c;
  }

  function create(o) {
    var canvas = o.canvas, glow = o.glow, host = o.host, places = o.places || [];
    var ctx = canvas.getContext && canvas.getContext("2d");
    if (!ctx) return null;
    var gctx = glow && glow.getContext ? glow.getContext("2d") : null;
    var cutTile = lineTile(2.65, 1.05, "#000", 1.6), threadTile = lineTile(3.7, 0.9, "#fff", 2.2);
    var cutPat = cutTile && ctx.createPattern(cutTile, "repeat");
    var threadPat = threadTile && ctx.createPattern(threadTile, "repeat");
    var canTurn = !!(cutPat && cutPat.setTransform && window.DOMMatrix);
    var n = places.length;
    var weights = places.map(function (p) { return recency(p.last); });
    var wSum = weights.reduce(function (s, w) { return s + w; }, 0) || 1;

    var W = 0, H = 0, pNear, tilt, cols, rows, N;
    var rowS, rowY, rowP;             // per row: scale, resting screen y, horizontal pitch
    var u, v, fade, depth, xs, cellList, drawList, vis, order, bOf, rad, rady, sx, sy, counts, starts;
    var markers = [];
    var act = new Float32Array(n), target = new Float32Array(n);
    var active = -1, all = false, paused = !!o.startPaused, visible = true;
    var raf = 0, last = 0, acc = 0, time = 0, intro = o.startPaused ? 1 : 0;
    var ptr = { on: false, x: 0, y: 0, lx: 0, ly: 0, moved: false };
    var seed = 11;
    function srand() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }

    function layout() {
      W = host.clientWidth; H = host.clientHeight;
      if (!W || !H) return false;
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (gctx) { glow.width = Math.ceil(W / 4); glow.height = Math.ceil(H / 4); }

      var narrow = W < 760;
      pNear = narrow ? 15 : W < 1200 ? 19 : 22;
      tilt = 0.74;
      var yTop = Math.max(64, H * 0.1), sEnd = 0.4;
      var Dn = (H + pNear - yTop) / (pNear * tilt * (1 - sEnd));
      // rows from near (k = 0, just below the screen) to far (top)
      var ys = [], ss = [], y = H + pNear * 0.6, k = 0;
      while (y > yTop && k < 400) {
        var s = Dn / (Dn + k);
        ss.push(s); ys.push(y);
        y -= pNear * tilt * s * s;
        k++;
      }
      rows = ss.length + 1;
      ss.push(Dn / (Dn + k)); ys.push(y);
      cols = Math.ceil(W / (pNear * ss[rows - 1])) + 4;
      rowS = new Float32Array(ss); rowY = new Float32Array(ys); rowP = new Float32Array(rows);
      for (k = 0; k < rows; k++) rowP[k] = pNear * rowS[k];
      N = cols * rows;
      u = new Float32Array(N); v = new Float32Array(N);
      fade = new Float32Array(N); depth = new Float32Array(N); xs = new Float32Array(N);
      vis = new Int32Array(N); order = new Int32Array(N); bOf = new Uint8Array(N);
      rad = new Float32Array(N); rady = new Float32Array(N); sx = new Float32Array(N); sy = new Float32Array(N);
      counts = new Int32Array(NB); starts = new Int32Array(NB);

      var rects = o.getQuietRects ? o.getQuietRects() : [];
      var list = [], dlist = [];
      for (k = 1; k < rows - 1; k++) for (var c = 1; c < cols - 1; c++) {
        var i = k * cols + c, px = W / 2 + (c - cols / 2) * rowP[k], py = rowY[k];
        list.push(i);
        xs[i] = px;
        if (px < -rowP[k] || px > W + rowP[k]) continue;
        var q = 1;
        for (var r = 0; r < rects.length; r++) {
          var Q = rects[r];
          var nx = (px - (Q.x + Q.w / 2)) / (Q.w / 2 + Q.pad), ny = (py - (Q.y + Q.h / 2)) / (Q.h / 2 + Q.pad);
          q = Math.min(q, smooth(0.45, 1.3, Math.sqrt(nx * nx + ny * ny)));
        }
        q *= smooth(yTop, yTop + H * 0.16, py) * smooth(20, 200, H - py);
        if (q < 0.02) continue;
        fade[i] = 0.04 + 0.96 * q;
        depth[i] = 0.5 + 0.3 * Math.sin(c * 0.021 + 1.3) * Math.cos(k * 0.05 - 0.4) + 0.2 * Math.sin((c + k) * 0.013 + 2.1);
        dlist.push(i);
      }
      cellList = new Int32Array(list);
      drawList = new Int32Array(dlist);

      markers = (o.getMarkers ? o.getMarkers(W, H) : []).map(function (m) {
        var g = toGrid(m.x, m.y);
        return { gx: g[0], gy: g[1], gr: Math.max(3, m.r / rowP[Math.round(g[1])]) };
      });
      if (o.onLayout) o.onLayout(W, H);

      seed = 11;
      for (k = 0; k < 12; k++) {
        var ci = drawList[(srand() * drawList.length) | 0];
        drop(ci % cols, (ci / cols) | 0, 0.8 + srand() * 0.8, 1.6);
      }
      for (k = 0; k < 70; k++) integrate();
      return true;
    }

    // screen point -> grid coordinates (column, row) on the tilted lake
    function toGrid(x, y) {
      var lo = 0, hi = rows - 1;
      if (y >= rowY[0]) lo = hi = 0;
      else if (y <= rowY[rows - 1]) lo = hi = rows - 1;
      else {
        while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (rowY[mid] > y) lo = mid; else hi = mid; }
      }
      var f = lo === hi ? 0 : (rowY[lo] - y) / (rowY[lo] - rowY[hi]);
      var k = lo + f, p = rowP[lo] + (rowP[hi] - rowP[lo]) * f;
      return [(x - W / 2) / p + cols / 2, k];
    }

    function drop(gx, gy, amp, r) {
      var k = Math.ceil(r * 2.6);
      var y0 = Math.max(1, Math.floor(gy - k)), y1 = Math.min(rows - 2, Math.ceil(gy + k));
      var x0 = Math.max(1, Math.floor(gx - k)), x1 = Math.min(cols - 2, Math.ceil(gx + k));
      for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) {
        var d2 = (x - gx) * (x - gx) + (y - gy) * (y - gy);
        u[y * cols + x] -= amp * Math.exp(-d2 / (r * r));
      }
    }

    function integrate() {
      var L = cellList.length, k, i;
      for (k = 0; k < L; k++) {
        i = cellList[k];
        var lap = (4 * (u[i - 1] + u[i + 1] + u[i - cols] + u[i + cols]) +
          (u[i - cols - 1] + u[i - cols + 1] + u[i + cols - 1] + u[i + cols + 1]) - 20 * u[i]) / 6;
        v[i] = (v[i] + lap * C2) * DAMP;
      }
      for (k = 0; k < L; k++) { i = cellList[k]; u[i] = (u[i] + v[i]) * 0.9993; }
    }

    function step() {
      if (Math.random() < 0.035) {
        var ci = drawList[(Math.random() * drawList.length) | 0];
        drop(ci % cols, (ci / cols) | 0, 0.45 + Math.random() * 0.9, 1.1 + Math.random() * 0.8);
      }
      if (markers.length && Math.random() < 0.012) {
        var t = Math.random() * wSum, p = 0;
        while (p < n - 1 && t > weights[p]) { t -= weights[p]; p++; }
        var m = markers[p];
        if (m) drop(m.gx + (Math.random() - 0.5) * m.gr, m.gy + (Math.random() - 0.5) * m.gr, 0.5 + Math.random() * 0.6, 1.3);
      }
      if (ptr.on && ptr.moved) {
        var g1 = toGrid(ptr.x, ptr.y), g0 = toGrid(ptr.lx, ptr.ly);
        var gx = g1[0], gy = g1[1], lx = g0[0], ly = g0[1];
        var dist = Math.sqrt((gx - lx) * (gx - lx) + (gy - ly) * (gy - ly));
        if (dist > 0.05 && dist < 40) {
          var amp = Math.min(dist * 0.06, 0.42), ns = Math.max(1, Math.ceil(dist / 0.8));
          for (var s = 1; s <= ns; s++) {
            var f = s / ns;
            drop(lx + (gx - lx) * f, ly + (gy - ly) * f, (amp / ns) * 2.4, 1.5);
          }
        }
        ptr.lx = ptr.x; ptr.ly = ptr.y; ptr.moved = false;
      }
      integrate();
    }

    function draw() {
      if (!u || !cellList) return;
      ctx.clearRect(0, 0, W, H);
      counts.fill(0);
      var t = time, nv = 0, L = drawList.length, anyAct = false, p;
      for (p = 0; p < markers.length; p++) if (act[p] > 0.01) anyAct = true;

      // moiré gratings for this frame
      var th = 0.42 + 0.12 * Math.sin(t * 0.06), ca = Math.cos(th), sa = Math.sin(th);
      var f1 = TAU * 1.09, f2 = TAU * 0.945;
      var ccx = cols * (0.5 + 0.2 * Math.sin(t * 0.045)), ccy = rows * (0.5 + 0.16 * Math.cos(t * 0.037));
      var ph1 = t * 0.5, ph2 = t * 0.7;
      var lift = pNear * 0.55, revealY = intro < 1 ? intro * (H + 160) - 80 : 1e9;

      for (var k = 0; k < L; k++) {
        var i = drawList[k], q = fade[i];
        var x = i % cols, y = (i / cols) | 0;
        var s = rowS[y], pch = rowP[y];

        // wind swells rolling toward the viewer (y grows into the distance)
        var grp = 0.7 + 0.3 * Math.sin(x * 0.025 - y * 0.035 + t * 0.1);
        var a1 = x * 0.06 + y * 0.52 + t * 1.15, a2 = -x * 0.2 + y * 0.86 + t * 1.6;
        var a3 = x * 0.38 + y * 1.25 + t * 2.2, a4 = x * 1.05 + y * 0.45 + t * 2.9;
        var hs = grp * (0.55 * Math.sin(a1) + 0.28 * Math.sin(a2)) + 0.16 * Math.sin(a3) + 0.07 * Math.sin(a4);
        var dz = grp * (0.55 * 0.52 * Math.cos(a1) + 0.28 * 0.86 * Math.cos(a2)) + 0.16 * 1.25 * Math.cos(a3) + 0.07 * 0.45 * Math.cos(a4);
        var dxs = grp * (0.55 * 0.06 * Math.cos(a1) - 0.28 * 0.2 * Math.cos(a2)) + 0.16 * 0.38 * Math.cos(a3) + 0.07 * 1.05 * Math.cos(a4);

        var h = u[i], gx = u[i + 1] - u[i - 1], gy = u[i + cols] - u[i - cols];
        var lap = u[i + 1] + u[i - 1] + u[i + cols] + u[i - cols] - 4 * h;
        var dp = depth[i], far = 1 - (s - 0.4) / 0.6;
        // faces tilting toward the viewer (height rising into the distance) reflect the sky
        var spec = (dz * 1.7 + gy * 1.2) + (dxs * 0.45 - gx * 0.4);
        var caus = lap < 0 ? Math.min(-lap * 2, 0.6) : 0;
        var Lm = 0.2 + 0.26 * far + 0.08 * (1 - dp) + spec * 0.5 + caus * 0.45;
        var hl = 0;
        if (anyAct) for (p = 0; p < markers.length; p++) {
          if (act[p] <= 0.01) continue;
          var m = markers[p], ddx = x - m.gx, ddy = y - m.gy, rr = m.gr * m.gr;
          var dd = ddx * ddx + ddy * ddy;
          if (dd < rr * 2.2) hl += act[p] * Math.exp(-dd / (rr * 0.6));
        }
        Lm += hl * 0.45;
        var py0 = rowY[y];
        if (py0 > revealY) Lm *= smooth(revealY + 80, revealY, py0);
        Lm *= q;
        if (Lm < 0.05) continue;
        if (Lm > 1) Lm = 1;

        var dx2 = x - ccx, dy2 = y - ccy;
        var mo = 0.5 + 0.25 * Math.cos(f1 * (x * ca + y * sa) + ph1) +
                 0.25 * Math.cos(f2 * Math.sqrt(dx2 * dx2 + dy2 * dy2) - ph2);
        var r = pch * 0.62 * Math.pow(Lm, 0.7) * (0.5 + 0.5 * Math.pow(mo, 1.2));
        if (r < 0.45) continue;
        var ct = 0.1 + 0.22 * far + 0.24 * dp * (1 - far) + 0.42 * Lm + spec * 0.16 + 0.05 * (mo - 0.5) + hl * 0.35;
        var b = ct <= 0 ? 0 : ct >= 1 ? NB - 1 : (ct * (NB - 1)) | 0;
        bOf[i] = b; rad[i] = r;
        rady[i] = r * Math.min(1, tilt * s * 1.35);
        sx[i] = xs[i] + Math.max(-pch * 0.5, Math.min(pch * 0.5, (gx + dxs * 0.6) * pch));
        sy[i] = py0 - (hs * 0.9 + h * 1.4) * lift * s;
        counts[b]++; vis[nv++] = i;
      }
      var s0 = 0;
      for (var b2 = 0; b2 < NB; b2++) { starts[b2] = s0; s0 += counts[b2]; }
      for (k = 0; k < nv; k++) { var ii = vis[k]; order[starts[bOf[ii]]++] = ii; }
      var c0 = 0;
      for (b2 = 0; b2 < NB; b2++) {
        var c1 = c0 + counts[b2];
        if (c1 > c0) {
          ctx.fillStyle = COLORS[b2];
          ctx.beginPath();
          for (k = c0; k < c1; k++) {
            var j = order[k], rj = rad[j];
            ctx.moveTo(sx[j] + rj, sy[j]);
            ctx.ellipse(sx[j], sy[j], rj, rady[j], 0, 0, TAU);
          }
          ctx.fill();
        }
        c0 = c1;
      }
      if (cutPat && canTurn) {
        var a1 = 0.09 + 0.05 * Math.sin(t * 0.05), a2 = -0.19 + 0.05 * Math.cos(t * 0.043);
        cutPat.setTransform(new DOMMatrix().translate(t * 3.1, t * 1.3).rotate(a1 * 57.2958).scale(1, 1 + 0.06 * Math.sin(t * 0.09)));
        threadPat.setTransform(new DOMMatrix().translate(-t * 2.2, t * 0.8).rotate(a2 * 57.2958));
        ctx.save();
        ctx.globalCompositeOperation = "destination-out";
        ctx.globalAlpha = 0.66;
        ctx.fillStyle = cutPat; ctx.fillRect(0, 0, W, H);
        ctx.globalCompositeOperation = "source-atop";
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = threadPat; ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }
      if (gctx) {
        gctx.clearRect(0, 0, glow.width, glow.height);
        gctx.drawImage(canvas, 0, 0, glow.width, glow.height);
      }
    }

    function frame(ts) {
      raf = 0;
      if (paused || !visible) return;
      if (!cellList) { relayout(true); if (!cellList) return; }
      var dt = Math.min(50, ts - (last || ts));
      last = ts; time += dt / 1000; acc += dt;
      if (intro < 1) intro = Math.min(1, intro + dt / 1900);
      var s = 0;
      while (acc >= STEP && s < 3) { step(); acc -= STEP; s++; }
      if (acc > STEP * 3) acc = 0;
      for (var p = 0; p < n; p++) act[p] += (target[p] - act[p]) * 0.08;
      draw();
      raf = requestAnimationFrame(frame);
    }
    function kick() { if (!raf && !paused && visible) { last = 0; raf = requestAnimationFrame(frame); } }

    function setTargets() {
      for (var p = 0; p < n; p++) target[p] = all || p === active ? 1 : 0;
      if (paused) { act.set(target); draw(); }
    }

    host.addEventListener("pointermove", function (e) {
      var b = host.getBoundingClientRect(), x = e.clientX - b.left, y = e.clientY - b.top;
      if (!ptr.on) { ptr.lx = x; ptr.ly = y; }
      ptr.x = x; ptr.y = y; ptr.on = true; ptr.moved = true;
    }, { passive: true });
    host.addEventListener("pointerleave", function () { ptr.on = false; });
    host.addEventListener("pointerdown", function (e) {
      if (paused || e.target.closest("button,a")) return;
      var b = host.getBoundingClientRect();
      var g = toGrid(e.clientX - b.left, e.clientY - b.top);
      drop(g[0], g[1], 2.2, 2);
    });
    document.addEventListener("visibilitychange", function () { visible = !document.hidden; kick(); });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) {
        visible = en[0].isIntersecting && !document.hidden; kick();
      }).observe(host);
    }
    var lastW = 0, lastH = 0, rt = 0;
    function relayout(force) {
      var w = host.clientWidth, h = host.clientHeight;
      if (!force && cellList && w === lastW && Math.abs(h - lastH) < 60) return;
      if (layout()) { lastW = w; lastH = h; act.set(target); draw(); kick(); }
    }
    if ("ResizeObserver" in window) {
      new ResizeObserver(function () { clearTimeout(rt); rt = setTimeout(relayout, 140); }).observe(host);
    } else {
      window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(relayout, 140); });
    }

    relayout(true);
    kick();

    return {
      relayout: function () { relayout(true); },
      setPaused: function (b) { paused = !!b; if (paused) draw(); else kick(); },
      isPaused: function () { return paused; },
      setActive: function (i) {
        active = i == null ? -1 : i;
        var m = markers[active];
        if (m && !paused) drop(m.gx, m.gy, 1.6, 1.6);
        setTargets();
      },
      setAll: function (b) {
        all = !!b;
        if (all && !paused) markers.forEach(function (m) { drop(m.gx, m.gy, 1.4, 1.5); });
        setTargets();
      },
    };
  }

  window.WaterArt = { create: create };
})();
