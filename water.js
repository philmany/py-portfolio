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
    wave-equation height field carries the wake behind the pointer, the only
    thing that makes ripples; they spread as ellipses because of the tilt.
  - Light: faces of the waves that tilt toward you catch the light, from slate
    teal to sea-glass aqua, and the brightest crests flash tangerine like a low
    sun; faces tilting away show deep green-black water. Far
    water reflects more sky (brighter, hazier), near water is darker.
  - Depth of field: a blurred copy of the lake is faded in over the distant
    rows and the sharp lake faded out, so the far water goes soft.
  - Texture: printed like a two-colour risograph. Teal and fluorescent orange
    are separate ink layers, the orange sitting 2px above the teal (off
    register), and the moiré line screens are woven into each layer.
  - Dots fade under the text, under the navigation and into the page below.
  - Memories: each body of water is a patch of lit dots woven into the same
    tilted grid, so it rides the swell and foreshortens with the lake. The
    patch is the place's shoreline, softened, sampled at the grid's own dots.
    Hovering one brightens it and slows the whole lake; focusing one keeps
    the lake slow while its outline and photo come forward (app.js).
  - Ambient motion and pausing never change any data value.
*/
(function () {
  "use strict";

  // Pacific Northwest water at sunset: deep green-black troughs, slate teal and
  // sea-glass faces, then a long gradual warm-up (dusty sage, sand, coral) into
  // tangerine where the faces catch the low sun, so orange blends into the blue.
  var STOPS = [
    [0.0, [8, 26, 36]],
    [0.13, [12, 48, 62]],
    [0.26, [16, 80, 92]],
    [0.38, [24, 112, 118]],
    [0.5, [44, 146, 142]],
    [0.6, [104, 176, 162]],
    [0.68, [168, 182, 152]],
    [0.76, [226, 168, 118]],
    [0.84, [252, 140, 70]],
    [0.92, [255, 128, 48]],
    [1.0, [255, 198, 140]],
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
  // TEMPO: the lake's clock runs at 60% of real time; CALM is how far it slows while a memory is hovered or open.
  // DOT_ALPHA: the water's dots are printed at reduced opacity so the lit memories carry the light.
  // DENSITY: dots per area relative to the first halftone (pitch shrinks by 1/sqrt).
  var TEMPO = 0.6, CALM = 0.28, DOT_ALPHA = 0.8, DENSITY = 2;
  var LIT = "#fff3e2", LIT_IDLE = 0.5, LIT_DIM = 0.3;

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


  // Riso grain: fine speckle where the ink skipped, plus soft mottled patches
  // where the drum laid ink unevenly. Drawn once, tiled.
  function grainTile() {
    var s = 384, c = document.createElement("canvas");
    c.width = c.height = s;
    var g = c.getContext("2d");
    if (!g) return null;
    var img = g.createImageData(s, s), d = img.data, seed = 7;
    function r() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    var blobs = [];
    for (var b = 0; b < 26; b++) blobs.push([r() * s, r() * s, 20 + r() * 70, r()]);
    for (var y = 0; y < s; y++) for (var x = 0; x < s; x++) {
      var m = 0;
      for (b = 0; b < blobs.length; b++) {
        var B = blobs[b];
        var dx = Math.min(Math.abs(x - B[0]), s - Math.abs(x - B[0])), dy = Math.min(Math.abs(y - B[1]), s - Math.abs(y - B[1]));
        m += B[3] * Math.exp(-(dx * dx + dy * dy) / (B[2] * B[2]));
      }
      var n = r(), a = 0;
      if (n > 0.86) a = 0.55 + 0.45 * r();      // skipped specks
      else a = Math.min(0.5, m * 0.32) + n * 0.12;  // mottling + tooth of the paper
      var p = (y * s + x) * 4;
      d[p] = d[p + 1] = d[p + 2] = 0; d[p + 3] = Math.round(a * 255);
    }
    g.putImageData(img, 0, 0);
    return c;
  }

  function create(o) {
    var canvas = o.canvas, glow = o.glow, host = o.host, places = o.places || [];
    var ctx = canvas.getContext && canvas.getContext("2d");
    if (!ctx) return null;
    var gctx = glow && glow.getContext ? glow.getContext("2d") : null;
    var haze = o.haze, hctx = haze && haze.getContext ? haze.getContext("2d") : null;
    var litC = o.lit, lctx = litC && litC.getContext ? litC.getContext("2d") : null;
    var masks = o.masks || [];
    var litCells, litVal, litOf, boxes = [];
    var hot = -1, focus = -1, speed = 1, speedTo = 1;
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
    var mode = o.mode || "riso", paper = !!o.paper;
    var inkA, inkB, actxA, actxB, grainPat, dprR = 1;
    var active = -1, all = false, paused = !!o.startPaused, visible = true;
    var raf = 0, last = 0, acc = 0, drawAcc = 1e9, time = 0, intro = o.startPaused ? 1 : 0;
    var ptr = { on: false, x: 0, y: 0, lx: 0, ly: 0, moved: false };
    var seed = 11;
    function srand() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }

    function layout() {
      W = host.clientWidth; H = host.clientHeight;
      if (!W || !H) return false;
      var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dprR = dpr;
      inkA = inkA || document.createElement("canvas"); inkB = inkB || document.createElement("canvas");
      inkA.width = inkB.width = canvas.width; inkA.height = inkB.height = canvas.height;
      actxA = inkA.getContext("2d"); actxB = inkB.getContext("2d");
      actxA.setTransform(dpr, 0, 0, dpr, 0, 0); actxB.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!grainPat) { var gt = grainTile(); grainPat = gt && ctx.createPattern(gt, "repeat"); }
      if (gctx) { glow.width = Math.ceil(W / 4); glow.height = Math.ceil(H / 4); }
      if (hctx) { haze.width = Math.ceil(W / 2); haze.height = Math.ceil(H / 2); }
      if (lctx) { litC.width = canvas.width; litC.height = canvas.height; lctx.setTransform(dpr, 0, 0, dpr, 0, 0); }

      var narrow = W < 760;
      // a fine, printed halftone: DENSITY x the dots per area of the first lake; dot size follows the pitch
      pNear = (narrow ? 15 : W < 1200 ? 19 : 22) / Math.sqrt(DENSITY);
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
          var nx = (px - (Q.x + Q.w / 2)) / (Q.w / 2 + Q.pad), ny = (py - (Q.y + Q.h / 2)) / (Q.h / 2 + (Q.padY != null ? Q.padY : Q.pad));
          var fl = Q.floor || 0;
          q = Math.min(q, fl + (1 - fl) * smooth(0.45, 1.3, Math.sqrt(nx * nx + ny * ny)));
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
        return { gx: g[0], gy: g[1], gr: Math.max(3, m.r / rowP[Math.round(g[1])]), ar: m.ar || 1 };
      });
      layoutPatches();
      if (o.onLayout) o.onLayout(W, H, boxes);

      return true;
    }

    // Each memory's patch: the place's softened shoreline mask laid flat on the
    // lake in grid space (grid cells are square on the water), so on screen it
    // foreshortens with the tilt like everything else. North points away.
    function sampleMask(mk, u, v) {
      if (!mk) { var du = u - 0.5, dv = v - 0.5; return 1 - smooth(0.16, 0.24, du * du + dv * dv); }
      var M = mk.M, fx = u * (M - 1), fy = v * (M - 1);
      if (fx < 0 || fy < 0 || fx > M - 1 || fy > M - 1) return 0;
      var x0 = fx | 0, y0 = fy | 0, x1 = Math.min(M - 1, x0 + 1), y1 = Math.min(M - 1, y0 + 1), ax = fx - x0, ay = fy - y0, d = mk.data;
      return (d[y0 * M + x0] * (1 - ax) + d[y0 * M + x1] * ax) * (1 - ay) + (d[y1 * M + x0] * (1 - ax) + d[y1 * M + x1] * ax) * ay;
    }
    function layoutPatches() {
      var cells = [], vals = [], of = [];
      boxes = markers.map(function (m, p) {
        var pad = 1 / 0.8;  // masks are drawn into the middle 80% of their tile
        var Wc = 2 * m.gr * (m.ar >= 1 ? 1 : m.ar) * pad, Hr = 2 * m.gr * (m.ar >= 1 ? 1 / m.ar : 1) * pad;
        var y0 = Math.max(1, Math.floor(m.gy - Hr / 2)), y1 = Math.min(rows - 2, Math.ceil(m.gy + Hr / 2));
        var c0 = Math.max(1, Math.floor(m.gx - Wc / 2)), c1 = Math.min(cols - 2, Math.ceil(m.gx + Wc / 2));
        var bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9;
        for (var y = y0; y <= y1; y++) for (var c = c0; c <= c1; c++) {
          var i = y * cols + c;
          if (xs[i] < 4 || xs[i] > W - 4) continue;
          var mv = sampleMask(masks[p], (c - m.gx) / Wc + 0.5, 0.5 - (y - m.gy) / Hr);
          var val = smooth(0.14, 0.5, mv);
          if (val < 0.06) continue;
          cells.push(i); vals.push(val); of.push(p);
          var rr = rowP[y] * 0.6;
          bx0 = Math.min(bx0, xs[i] - rr); bx1 = Math.max(bx1, xs[i] + rr);
          by0 = Math.min(by0, rowY[y] - rr - pNear * 0.5 * rowS[y]); by1 = Math.max(by1, rowY[y] + rr);
        }
        return bx1 > bx0 ? { x: bx0, y: by0, w: bx1 - bx0, h: by1 - by0 } : null;
      });
      litCells = new Int32Array(cells); litVal = new Float32Array(vals); litOf = new Uint8Array(of);
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

    // wind swells rolling toward the viewer (y grows into the distance): height, slope into the distance, slope across
    var SW = { hs: 0, dz: 0, dxs: 0 };
    function swell(x, y, t) {
      var grp = 0.6 + 0.4 * Math.sin(x * 0.025 - y * 0.035 + t * 0.16) * Math.cos(x * 0.011 + y * 0.019 - t * 0.09);
      var a1 = x * 0.06 + y * 0.52 + t * 2.05, a2 = -x * 0.22 + y * 0.86 + t * 2.9;
      var a3 = x * 0.4 + y * 1.3 + t * 4.0, a4 = x * 1.05 + y * 0.45 + t * 5.0;
      var a5 = -x * 0.7 + y * 1.6 + t * 5.6, a6 = x * 0.17 - y * 0.12 + t * 0.9;
      var chop = 0.85 + 0.45 * Math.sin(x * 0.05 + y * 0.09 - t * 0.42);
      SW.hs = grp * (0.5 * Math.sin(a1) + 0.3 * Math.sin(a2)) + chop * (0.2 * Math.sin(a3) + 0.1 * Math.sin(a4) + 0.08 * Math.sin(a5)) + 0.12 * Math.sin(a6);
      SW.dz = grp * (0.5 * 0.52 * Math.cos(a1) + 0.3 * 0.86 * Math.cos(a2)) + chop * (0.2 * 1.3 * Math.cos(a3) + 0.1 * 0.45 * Math.cos(a4) + 0.08 * 1.6 * Math.cos(a5)) - 0.12 * 0.12 * Math.cos(a6);
      SW.dxs = grp * (0.5 * 0.06 * Math.cos(a1) - 0.3 * 0.22 * Math.cos(a2)) + chop * (0.2 * 0.4 * Math.cos(a3) + 0.1 * 1.05 * Math.cos(a4) - 0.08 * 0.7 * Math.cos(a5)) + 0.12 * 0.17 * Math.cos(a6);
      return SW;
    }

    // The memories: lit dots on their own unmasked layer, so a patch reads as
    // clearly near the horizon as near the shore. Each dot still rides the swell.
    var LB = 10, lBuck = [], lr = [], lry = [], lx = [], ly = [];
    function drawLit() {
      if (!lctx) return;
      lctx.clearRect(0, 0, W, H);
      if (!litCells || !litCells.length) return;
      var t = time, lift = pNear * 0.95, revealY = intro < 1 ? intro * (H + 160) - 80 : 1e9;
      for (var b = 0; b < LB; b++) lBuck[b] = [];
      for (var k = 0; k < litCells.length; k++) {
        var i = litCells[k], p = litOf[k], x = i % cols, y = (i / cols) | 0, s = rowS[y], pch = rowP[y];
        var on = LIT_IDLE + (1 - LIT_IDLE) * act[p];
        if (focus >= 0 && p !== focus) on *= LIT_DIM;
        var py0 = rowY[y];
        if (py0 > revealY) on *= smooth(revealY + 80, revealY, py0);
        var a = litVal[k] * on;
        if (a < 0.03) continue;
        var w = swell(x, y, t), h = u[i], gx = u[i + 1] - u[i - 1], gy = u[i + cols] - u[i - cols];
        var spec = (w.dz * 1.7 + gy * 1.2) + (w.dxs * 0.45 - gx * 0.4);
        var glint = 0.62 + 0.5 * spec + 0.08 * Math.sin(t * 0.7 + i * 0.37);  // the light breathes a little, dot to dot
        a *= glint < 0.3 ? 0.3 : glint > 1.15 ? 1.15 : glint;
        if (a > 1) a = 1;
        var r = pch * (0.2 + 0.13 * litVal[k] * (0.6 + 0.4 * act[p]));
        var bi = Math.min(LB - 1, (a * LB) | 0);
        lBuck[bi].push(k);
        lr[k] = r; lry[k] = r * Math.min(1, tilt * s * 1.35);
        lx[k] = xs[i] + Math.max(-pch * 0.5, Math.min(pch * 0.5, (gx + w.dxs * 0.6) * pch));
        ly[k] = py0 - (w.hs * 0.9 + h * 1.4) * lift * s;
      }
      lctx.fillStyle = LIT;
      for (b = 0; b < LB; b++) {
        var L = lBuck[b]; if (!L.length) continue;
        lctx.globalAlpha = (b + 0.5) / LB;
        lctx.beginPath();
        for (var j = 0; j < L.length; j++) { var q = L[j]; lctx.moveTo(lx[q] + lr[q], ly[q]); lctx.ellipse(lx[q], ly[q], lr[q], lry[q], 0, 0, TAU); }
        lctx.fill();
      }
      lctx.globalAlpha = 1;
    }

    function draw() {
      if (!u || !cellList) return;
      ctx.clearRect(0, 0, W, H);
      counts.fill(0);
      var t = time, nv = 0, L = drawList.length;

      // moiré gratings for this frame
      var th = 0.42 + 0.12 * Math.sin(t * 0.06), ca = Math.cos(th), sa = Math.sin(th);
      var f1 = TAU * 1.09, f2 = TAU * 0.945;
      var ccx = cols * (0.5 + 0.2 * Math.sin(t * 0.045)), ccy = rows * (0.5 + 0.16 * Math.cos(t * 0.037));
      var ph1 = t * 0.5, ph2 = t * 0.7;
      var sunX = W * 0.62;
      var lift = pNear * 0.95, revealY = intro < 1 ? intro * (H + 160) - 80 : 1e9;

      for (var k = 0; k < L; k++) {
        var i = drawList[k], q = fade[i];
        var x = i % cols, y = (i / cols) | 0;
        var s = rowS[y], pch = rowP[y];

        var w0 = swell(x, y, t), hs = w0.hs, dz = w0.dz, dxs = w0.dxs;

        var h = u[i], gx = u[i + 1] - u[i - 1], gy = u[i + cols] - u[i - cols];
        var lap = u[i + 1] + u[i - 1] + u[i + cols] + u[i - cols] - 4 * h;
        var dp = depth[i], far = 1 - (s - 0.4) / 0.6;
        // faces tilting toward the viewer (height rising into the distance) reflect the sky
        var spec = (dz * 1.7 + gy * 1.2) + (dxs * 0.45 - gx * 0.4);
        var caus = lap < 0 ? Math.min(-lap * 2, 0.6) : 0;
        var Lm = 0.25 + 0.27 * far + 0.06 * (1 - dp) + spec * 0.66 + caus * 0.45;
        var hl = 0;
        var py0 = rowY[y];
        if (py0 > revealY) Lm *= smooth(revealY + 80, revealY, py0);
        Lm *= q;
        if (Lm < 0.05) continue;
        if (Lm > 1) Lm = 1;

        var dx2 = x - ccx, dy2 = y - ccy;
        var mo = mode === "none" ? 0.62 : 0.5 + 0.25 * Math.cos(f1 * (x * ca + y * sa) + ph1) +
                 0.25 * Math.cos(f2 * Math.sqrt(dx2 * dx2 + dy2 * dy2) - ph2);
        var r = pch * 0.55 * Math.pow(Lm, 0.7) * (0.5 + 0.5 * Math.pow(mo, 1.2));
        if (r < 0.45) continue;
        var sunx = (xs[i] - sunX) / (W * (0.16 + 0.22 * far));
        var sun = Math.exp(-sunx * sunx) * (0.35 + 0.65 * far);
        var ct = 0.06 + 0.18 * far + 0.16 * dp * (1 - far) + 0.4 * Lm + spec * 0.26 * (0.6 + sun) + sun * 0.16 + 0.05 * (mo - 0.5);
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
      if (mode === "riso") { drawRiso(nv); drawLit(); afterDraw(); return; }
      var c0 = 0;
      ctx.globalAlpha = DOT_ALPHA;
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
      ctx.globalAlpha = 1;
      if (mode === "moire" && cutPat && canTurn) {
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
      drawLit();
      afterDraw();
    }

    function afterDraw() {
      if (gctx) {
        gctx.clearRect(0, 0, glow.width, glow.height);
        gctx.drawImage(canvas, 0, 0, glow.width, glow.height);
        if (lctx) gctx.drawImage(litC, 0, 0, glow.width, glow.height);  // the memories glow through the blur
      }
      if (hctx) {
        hctx.clearRect(0, 0, haze.width, haze.height);
        hctx.drawImage(canvas, 0, 0, haze.width, haze.height);
      }
    }


    // Risograph: two spot-ink drums printed separately, each its own solid ink
    // with halftone dots, slightly out of register, with ink grain and mottling.
    function hash(i) { var x = Math.sin(i * 12.9898) * 43758.5453; return x - Math.floor(x); }
    function drawRiso(nv) {
      var inks = paper
        ? { a: "#0f8a8c", b: "#ff6a4d", op: "multiply" }    // Riso Teal + Fluorescent Orange on cream stock
        : { a: "#1aa39d", b: "#ff6436", op: "screen" };     // the same inks, lifted for the dark page
      var layers = [[actxA, inks.a, 0], [actxB, inks.b, 1]];
      for (var L = 0; L < 2; L++) {
        var g = layers[L][0], which = layers[L][2];
        g.clearRect(0, 0, W, H);
        g.fillStyle = layers[L][1];
        g.beginPath();
        for (var k = 0; k < nv; k++) {
          var j = vis[k], t = bOf[j] / (NB - 1), d;
          if (which === 0) d = smooth(-0.05, 0.5, t) * (1 - (paper ? 0.92 : 0.7) * smooth(0.66, 0.88, t));
          else d = Math.min(1, 1.15 * smooth(0.6, 0.86, t));
          if (d < 0.04) continue;
          var sp = 0.9 + 0.2 * hash(j * 3 + which);           // ink spread varies dot to dot
          var rr = rad[j] * Math.sqrt(d) * sp * (which ? 1.05 : 1.12), ry = rr * rady[j] / rad[j];
          if (rr < 0.4) continue;
          g.moveTo(sx[j] + rr, sy[j]);
          g.ellipse(sx[j], sy[j], rr, ry, 0, 0, TAU);
        }
        g.fill();
        if (cutPat && canTurn) {
          // the moiré line screens, woven into each ink drum before it is printed,
          // so the screens ride along with the 2px misregistration
          var t = time, a1 = 0.09 + 0.05 * Math.sin(t * 0.05), a2 = -0.19 + 0.05 * Math.cos(t * 0.043);
          cutPat.setTransform(new DOMMatrix().translate(t * 3.1, t * 1.3).rotate(a1 * 57.2958).scale(1, 1 + 0.06 * Math.sin(t * 0.09)));
          threadPat.setTransform(new DOMMatrix().translate(-t * 2.2, t * 0.8).rotate(a2 * 57.2958));
          g.save();
          g.globalCompositeOperation = "destination-out";
          g.globalAlpha = 0.66;
          g.fillStyle = cutPat; g.fillRect(0, 0, W, H);
          if (!paper) {
            g.globalCompositeOperation = "source-atop";
            g.globalAlpha = 0.3;
            g.fillStyle = threadPat; g.fillRect(0, 0, W, H);
          }
          g.restore();
        }
      }
      ctx.clearRect(0, 0, W, H);
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = DOT_ALPHA;
      ctx.drawImage(inkA, 0, 0);
      ctx.globalCompositeOperation = inks.op;
      ctx.drawImage(inkB, 0, -2 * dprR);                     // the orange drum sits 2px above the teal
      ctx.restore();
    }

    function frame(ts) {
      raf = 0;
      if (paused || !visible) return;
      if (!cellList) { relayout(true); if (!cellList) return; }
      var dt = Math.min(50, ts - (last || ts));
      speed += (speedTo - speed) * Math.min(1, dt / 520);   // ease into and out of the calm
      last = ts; time += (dt / 1000) * TEMPO * speed; acc += dt * (0.4 + 0.45 * speed);
      if (intro < 1) intro = Math.min(1, intro + dt / 1900);
      var s = 0;
      while (acc >= STEP && s < 3) { step(); acc -= STEP; s++; }
      if (acc > STEP * 3) acc = 0;
      for (var p = 0; p < n; p++) act[p] += (target[p] - act[p]) * 0.08;
      drawAcc += dt;
      if (drawAcc >= 31 || intro < 1) { drawAcc = 0; draw(); }  // ~30 fps paint: the swell is slow, so half the paints look the same
      raf = requestAnimationFrame(frame);
    }
    function kick() { if (!raf && !paused && visible) { last = 0; raf = requestAnimationFrame(frame); } }

    function setTargets() {
      for (var p = 0; p < n; p++) target[p] = all || p === active || p === hot || p === focus ? 1 : 0;
      speedTo = hot >= 0 || focus >= 0 ? CALM : 1;
      if (paused) { act.set(target); draw(); }
    }
    // a small drop at a patch's heart: the water answers the touch
    function ping(p, amp) {
      var m = markers[p];
      if (!m || !u || paused) return;
      drop(m.gx, m.gy, amp || 0.5, Math.max(1.6, m.gr * 0.22));
    }

    host.addEventListener("pointermove", function (e) {
      var b = host.getBoundingClientRect(), x = e.clientX - b.left, y = e.clientY - b.top;
      if (!ptr.on) { ptr.lx = x; ptr.ly = y; }
      ptr.x = x; ptr.y = y; ptr.on = true; ptr.moved = true;
    }, { passive: true });
    host.addEventListener("pointerleave", function () { ptr.on = false; });
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
      setMode: function (m) { mode = m; draw(); },
      setPaper: function (b) { paper = !!b; draw(); },
      setActive: function (i) {
        active = i == null ? -1 : i;
        setTargets();
      },
      setAll: function (b) {
        all = !!b;
        setTargets();
      },
      // hovered / keyboard-focused patch (-1 for none): lights it and calms the lake
      setHot: function (i) {
        i = i == null ? -1 : i;
        if (i === hot) return;
        if (i >= 0) ping(i, 0.35);
        hot = i; setTargets();
      },
      // the open memory (-1 for none): the others dim, the lake stays calm
      setFocus: function (i) {
        i = i == null ? -1 : i;
        if (i === focus) return;
        if (i >= 0) ping(i, 0.7);
        focus = i; setTargets();
      },
      boxes: function () { return boxes; },
    };
  }

  window.WaterArt = { create: create };
})();

