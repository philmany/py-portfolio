/*
  Halftone lake. Canvas 2D, no libraries.

  - The lake fills the whole opening screen. A height field on a grid (one
    cell per dot) is moved by the 2D wave equation with a 9-point Laplacian,
    so ripples stay round, reflect, interfere and die away.
  - Rain falls at random, a little more often over recent memories. The
    pointer drags a wake through the surface; a click drops a stone.
  - Dot size is light: a slow drifting swell, sun on the slopes and caustics
    where the surface focuses light. Dots fade out under the text, under the
    navigation and into the page below.
  - Moiré: each dot is also scaled by two gratings sampled at the dot grid,
    one straight and slowly turning, one concentric and slowly drifting.
    Because they sit just off the grid's own frequency they alias into broad,
    shifting interference bands: a digital texture that moves like water.
  - Colour runs deep indigo, cobalt, cerulean, teal, aqua and seafoam, with a
    warm glint on the brightest highlights, over an aubergine background.
  - Texture: after the dots are drawn, two fine line screens are laid over
    them, one cutting thin stripes out of each dot and one adding a light
    thread on top, each at a slightly different angle. Against the dot grid
    and each other they weave into wavy moiré bands, like a printed screen.
    Both screens drift and turn slowly, so the weave moves with the water.
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
        var yy = y + Math.sin((x / s) * TAU * 2) * wave;
        if (x === 0) g.moveTo(x, yy); else g.lineTo(x, yy);
      }
      for (x = s; x >= 0; x -= 2) g.lineTo(x, y + Math.sin((x / s) * TAU * 2) * wave + thick);
      g.closePath(); g.fill();
    }
    return c;
  }

  function create(o) {
    var canvas = o.canvas, glow = o.glow, host = o.host, places = o.places || [];
    var ctx = canvas.getContext && canvas.getContext("2d");
    if (!ctx) return null;
    var gctx = glow && glow.getContext ? glow.getContext("2d") : null;
    var cutTile = lineTile(3, 1.15, "#000", 0.8), threadTile = lineTile(4, 0.9, "#fff", 1.2);
    var cutPat = cutTile && ctx.createPattern(cutTile, "repeat");
    var threadPat = threadTile && ctx.createPattern(threadTile, "repeat");
    var canTurn = !!(cutPat && cutPat.setTransform && window.DOMMatrix);
    var n = places.length;
    var weights = places.map(function (p) { return recency(p.last); });
    var wSum = weights.reduce(function (s, w) { return s + w; }, 0) || 1;

    var W = 0, H = 0, pitch, cols, rows, N, gx0, gy0;
    var u, v, fade, shore, depth, cellList, vis, order, bOf, rad, offx, offy, counts, starts;
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

      pitch = W < 760 ? 7 : W < 1200 ? 8 : W < 1700 ? 9 : 10;
      cols = Math.ceil(W / pitch) + 3;
      rows = Math.ceil(H / pitch) + 3;
      gx0 = (W - (cols - 1) * pitch) / 2;
      gy0 = (H - (rows - 1) * pitch) / 2;
      N = cols * rows;
      u = new Float32Array(N); v = new Float32Array(N);
      fade = new Float32Array(N); shore = new Float32Array(N); depth = new Float32Array(N);
      vis = new Int32Array(N); order = new Int32Array(N); bOf = new Uint8Array(N);
      rad = new Float32Array(N); offx = new Float32Array(N); offy = new Float32Array(N);
      counts = new Int32Array(NB); starts = new Int32Array(NB);

      var rects = o.getQuietRects ? o.getQuietRects() : [];
      var list = [];
      for (var y = 1; y < rows - 1; y++) for (var x = 1; x < cols - 1; x++) {
        var i = y * cols + x, px = gx0 + x * pitch, py = gy0 + y * pitch;
        var q = 1;
        for (var r = 0; r < rects.length; r++) {
          var Q = rects[r];
          var nx = (px - (Q.x + Q.w / 2)) / (Q.w / 2 + Q.pad), ny = (py - (Q.y + Q.h / 2)) / (Q.h / 2 + Q.pad);
          q = Math.min(q, smooth(0.45, 1.3, Math.sqrt(nx * nx + ny * ny)));
        }
        q *= smooth(30, 120, py) * smooth(0, 170, H - py);
        shore[i] = 0;
        list.push(i);
        fade[i] = q < 0.02 ? 0 : 0.04 + 0.96 * q;
        // shallows and deeps: a fixed, slow pattern across the lake
        depth[i] = 0.5 + 0.3 * Math.sin(x * 0.021 + 1.3) * Math.cos(y * 0.027 - 0.4) + 0.2 * Math.sin((x + y) * 0.013 + 2.1);
      }
      cellList = new Int32Array(list);

      markers = (o.getMarkers ? o.getMarkers(W, H) : []).map(function (m) {
        return { gx: (m.x - gx0) / pitch, gy: (m.y - gy0) / pitch, gr: Math.max(3, m.r / pitch) };
      });
      if (o.onLayout) o.onLayout(W, H);

      seed = 11;
      for (var k = 0; k < 12; k++) {
        var ci = cellList[(srand() * cellList.length) | 0];
        drop(ci % cols, (ci / cols) | 0, 0.8 + srand() * 0.8, 1.6);
      }
      for (k = 0; k < 70; k++) integrate();
      return true;
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
        var ci = cellList[(Math.random() * cellList.length) | 0];
        drop(ci % cols, (ci / cols) | 0, 0.45 + Math.random() * 0.9, 1.1 + Math.random() * 0.8);
      }
      if (markers.length && Math.random() < 0.012) {
        var t = Math.random() * wSum, p = 0;
        while (p < n - 1 && t > weights[p]) { t -= weights[p]; p++; }
        var m = markers[p];
        if (m) drop(m.gx + (Math.random() - 0.5) * m.gr, m.gy + (Math.random() - 0.5) * m.gr, 0.5 + Math.random() * 0.6, 1.3);
      }
      if (ptr.on && ptr.moved) {
        var gx = (ptr.x - gx0) / pitch, gy = (ptr.y - gy0) / pitch;
        var lx = (ptr.lx - gx0) / pitch, ly = (ptr.ly - gy0) / pitch;
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
      if (!u) return;
      ctx.clearRect(0, 0, W, H);
      counts.fill(0);
      var t = time, nv = 0, L = cellList.length, anyAct = false, p;
      for (p = 0; p < markers.length; p++) if (act[p] > 0.01) anyAct = true;
      var half = pitch * 0.5;

      // moiré gratings for this frame
      var th = 0.42 + 0.12 * Math.sin(t * 0.06), ca = Math.cos(th), sa = Math.sin(th);
      var f1 = TAU * 1.09, f2 = TAU * 0.945;
      var ccx = cols * (0.5 + 0.2 * Math.sin(t * 0.045)), ccy = rows * (0.5 + 0.16 * Math.cos(t * 0.037));
      var ph1 = t * 0.5, ph2 = t * 0.7;

      for (var k = 0; k < L; k++) {
        var i = cellList[k], q = fade[i];
        if (q === 0) continue;
        var x = i % cols, y = (i / cols) | 0;
        var h = u[i], gx = u[i + 1] - u[i - 1], gy = u[i + cols] - u[i - cols];
        var lap = u[i + 1] + u[i - 1] + u[i + cols] + u[i - cols] - 4 * h;
        var nz = 0.6 * Math.sin(x * 0.06 + t * 0.15 + 1.6 * Math.sin(y * 0.045 - t * 0.1)) +
                 0.4 * Math.sin(y * 0.08 - t * 0.12 + 1.2 * Math.sin(x * 0.035 + t * 0.08));
        var dp = depth[i];
        var spec = -(gx * 0.62 + gy * 0.78) * 1.6;
        var caus = lap < 0 ? Math.min(-lap * 2.2, 0.7) : 0;
        var Lm = 0.27 + 0.24 * nz + 0.12 * (1 - dp) + spec * 0.6 + caus * 0.5 + shore[i] * (0.32 + Math.min(Math.abs(v[i]) * 6, 0.4));
        var hl = 0;
        if (anyAct) for (p = 0; p < markers.length; p++) {
          if (act[p] <= 0.01) continue;
          var m = markers[p], dx = x - m.gx, dy = y - m.gy, rr = m.gr * m.gr;
          var dd = dx * dx + dy * dy;
          if (dd < rr * 2.2) hl += act[p] * Math.exp(-dd / (rr * 0.6));
        }
        Lm += hl * 0.45;
        if (intro < 1) {
          var ex = (x / cols - 0.5), ey = (y / rows - 0.52), rn = Math.sqrt(ex * ex + ey * ey) * 1.6;
          Lm *= smooth(rn - 0.12, rn + 0.04, intro * 1.15);
        }
        Lm *= q;
        if (Lm < 0.05) continue;
        if (Lm > 1) Lm = 1;

        var dx2 = x - ccx, dy2 = y - ccy;
        var mo = 0.5 + 0.25 * Math.cos(f1 * (x * ca + y * sa) + ph1) +
                 0.25 * Math.cos(f2 * Math.sqrt(dx2 * dx2 + dy2 * dy2) - ph2);
        var r = half * 1.3 * Math.pow(Lm, 0.7) * (0.45 + 0.55 * Math.pow(mo, 1.2));
        if (r < 0.5) continue;
        var ct = 0.06 + 0.3 * dp + 0.16 * nz + 0.44 * Lm + spec * 0.18 + 0.06 * (mo - 0.5) + hl * 0.35;
        var b = ct <= 0 ? 0 : ct >= 1 ? NB - 1 : (ct * (NB - 1)) | 0;
        bOf[i] = b; rad[i] = r;
        offx[i] = Math.max(-half, Math.min(half, gx * pitch * 1.1));
        offy[i] = Math.max(-half, Math.min(half, gy * pitch * 1.1));
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
            var j = order[k], px = gx0 + (j % cols) * pitch + offx[j], py = gy0 + ((j / cols) | 0) * pitch + offy[j], rj = rad[j];
            ctx.moveTo(px + rj, py);
            ctx.arc(px, py, rj, 0, TAU);
          }
          ctx.fill();
        }
        c0 = c1;
      }
      if (cutPat && canTurn) {
        var a1 = 0.07 + 0.05 * Math.sin(t * 0.05), a2 = -0.11 + 0.04 * Math.cos(t * 0.043);
        cutPat.setTransform(new DOMMatrix().translate(t * 3.1, t * 1.3).rotate(a1 * 57.2958).scale(1, 1 + 0.06 * Math.sin(t * 0.09)));
        threadPat.setTransform(new DOMMatrix().translate(-t * 2.2, t * 0.8).rotate(a2 * 57.2958));
        ctx.save();
        ctx.globalCompositeOperation = "destination-out";
        ctx.globalAlpha = 0.82;
        ctx.fillStyle = cutPat; ctx.fillRect(0, 0, W, H);
        ctx.globalCompositeOperation = "source-atop";
        ctx.globalAlpha = 0.26;
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
      drop((e.clientX - b.left - gx0) / pitch, (e.clientY - b.top - gy0) / pitch, 2.2, 2);
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
      if (!force && w === lastW && Math.abs(h - lastH) < 60) return;
      lastW = w; lastH = h;
      if (layout()) { act.set(target); draw(); }
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
