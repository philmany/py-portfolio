/*
  Page transition: the page materializes out of the lake.
  Clicking a link goes straight to the next page (nothing plays on the way
  out, so it loads sooner). That page arrives under the lake's riso water, and
  an opening spreads from where you clicked: a lacy foam line rolls outward,
  the swells behind it, and the page shows through the cutout, leaving a few
  wet specks that dry.

  The water is printed exactly like the hero lake: two spot-ink drums (teal and
  fluorescent orange) of halftone dots, orange sitting 2px above the teal, with
  the same moiré line screens woven into each drum. The swell phase runs on the
  wall clock, so the water on the next page carries on from where it left off.

  window.flowTo(url, x, y) navigates and remembers the point on screen.
  A small inline script in each page's <head> covers the page with calm water
  on arrival, until this script takes over.
*/
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var root = document.documentElement;
  var TAU = Math.PI * 2, BG = "#140a18", INK_A = "#1aa39d", INK_B = "#ff6436";

  var css = document.createElement("style");
  css.textContent =
    ".flow-cv{position:fixed;inset:0;width:100%;height:100%;z-index:300;pointer-events:none;display:block}" +
    "html.flow-settle body>*:not(.flow-cv){transition:transform 1.05s cubic-bezier(.2,.8,.2,1)}";
  document.head.appendChild(css);

  function smooth(a, b, x) { var t = (x - a) / (b - a); t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); }
  function hash(i) { var x = Math.sin(i * 12.9898 + 4.1) * 43758.5453; return x - Math.floor(x); }
  function clock() { return (Date.now() % 1e7) / 1000; }

  // the same fine wavy line tile the lake uses for its moiré screens
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

  var cv = null, ctx, inkA, inkB, ga, gb, soft, sg, cutPat = null, threadPat = null, canTurn = false;
  var W = 0, H = 0, dpr = 1, P = 14, cols = 0, rows = 0, N = 0, X, Y, GI, GJ, SP, FR, raf = 0;

  function mount() {
    if (!cv) {
      cv = document.createElement("canvas"); cv.className = "flow-cv"; cv.setAttribute("aria-hidden", "true");
      ctx = cv.getContext("2d");
      inkA = document.createElement("canvas"); inkB = document.createElement("canvas");
      ga = inkA.getContext("2d"); gb = inkB.getContext("2d");
      soft = document.createElement("canvas"); sg = soft.getContext("2d");
      var ct = lineTile(2.65, 1.05, "#000", 1.6), tt = lineTile(3.7, 0.9, "#fff", 2.2);
      cutPat = ct && ctx.createPattern(ct, "repeat");
      threadPat = tt && ctx.createPattern(tt, "repeat");
      canTurn = !!(cutPat && cutPat.setTransform && window.DOMMatrix);
    }
    if (!cv.parentNode) document.body.appendChild(cv);
    dpr = Math.min(2, window.devicePixelRatio || 1); W = window.innerWidth; H = window.innerHeight;
    [cv, inkA, inkB].forEach(function (c) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); });
    [ctx, ga, gb].forEach(function (g) { g.setTransform(dpr, 0, 0, dpr, 0, 0); });

    // a hex grid of dots, the same pitch as the near water on the lake
    P = W < 760 ? 11 : W < 1200 ? 13 : 14;
    var rh = P * 0.866;
    cols = Math.ceil(W / P) + 2; rows = Math.ceil(H / rh) + 2; N = cols * rows;
    X = new Float32Array(N); Y = new Float32Array(N); GI = new Float32Array(N); GJ = new Float32Array(N); SP = new Float32Array(N);
    FR = new Float32Array(cols * 2);
    for (var j = 0, k = 0; j < rows; j++) for (var i = 0; i < cols; i++, k++) {
      X[k] = (i - 0.5) * P + (j % 2 ? P / 2 : 0); Y[k] = (j - 0.5) * rh;
      GI[k] = i + (j % 2 ? 0.5 : 0); GJ[k] = j * 0.866;
      SP[k] = hash(k);
    }
  }

  // the shoreline of the opening: a ring of water pulling back from a point,
  // its edge wobbling with long and short undulations so it reads as a tide line
  var CX = 0, CY = 0, TH = null, DS = null;
  function edge(th, R, T, amp) {
    return R + amp * (0.55 * Math.sin(th * 3 + T * 1.3 + 0.7) + 0.3 * Math.sin(th * 7 - T * 2.1 + 2.0) + 0.15 * Math.sin(th * 13 + T * 3.3));
  }

  function render(R, amp, foamW, T, fade) {
    ctx.clearRect(0, 0, W, H);
    var i, k;
    // the wobble grows with the opening, so a small hole is still round-ish
    var a = amp * Math.min(1, Math.max(0, R) / (amp * 4 + 1));

    // the water's body, drawn small and scaled up so every edge is a true soft
    // gradient: the whole screen, with the opening cut out of it (even-odd)
    var SEG = 120;
    var poly = function (off, alpha, sc) {
      var sw = Math.ceil(W / sc) + 2, sh = Math.ceil(H / sc) + 2;
      if (soft.width !== sw || soft.height !== sh) { soft.width = sw; soft.height = sh; }
      sg.setTransform(1, 0, 0, 1, 0, 0); sg.clearRect(0, 0, sw, sh);
      sg.beginPath(); sg.rect(-1, -1, sw + 2, sh + 2);
      var r0 = R + off;
      if (r0 > 0) {
        for (var m = 0; m <= SEG; m++) {
          var th = (m / SEG) * TAU - Math.PI, rr = Math.max(0, edge(th, r0, T, a));
          var px = (CX + Math.cos(th) * rr) / sc, py = (CY + Math.sin(th) * rr) / sc;
          if (m === 0) sg.moveTo(px, py); else sg.lineTo(px, py);
        }
        sg.closePath();
      }
      sg.fillStyle = BG; sg.fill("evenodd");
      ctx.save(); ctx.globalAlpha = alpha; ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
      ctx.drawImage(soft, 0, 0, sw * sc, sh * sc); ctx.restore();
    };
    poly(-foamW * 0.2, 0.2 * fade, 28);   // a damp sheen just inside the opening
    poly(foamW * 0.62, 1, 7);             // the body of the lake, behind the foam

    // the lake's moiré, on this grid
    var th0 = 0.42 + 0.12 * Math.sin(T * 0.06), ca = Math.cos(th0), sa = Math.sin(th0);
    var f1 = TAU * 1.09, f2 = TAU * 0.945, ph1 = T * 0.5, ph2 = T * 0.7;
    var ccx = cols * (0.5 + 0.2 * Math.sin(T * 0.045)), ccy = rows * (0.5 + 0.16 * Math.cos(T * 0.037));
    var deepL = 0.32 * H + 120, behind = Math.max(W, H) * 0.5;

    ga.clearRect(0, 0, W, H); gb.clearRect(0, 0, W, H);
    ga.fillStyle = INK_A; gb.fillStyle = INK_B;
    ga.beginPath(); gb.beginPath();
    for (k = 0; k < N; k++) {
      var x = X[k], y = Y[k];
      if (y < -P || y > H + P) continue;
      var d = DS[k] - edge(TH[k], R, T, a);     // > 0 out in the water, < 0 inside the opening
      if (d < -behind) continue;
      var h = SP[k], Lm, c;

      if (d < 0) {
        // wet specks the water leaves on the page as it pulls back, drying out
        if (h < 0.78) continue;
        var wf = Math.exp(d / (H * 0.085)) * fade;
        if (wf < 0.04) continue;
        Lm = 0.1 + 0.32 * wf; c = 0.3 + 0.4 * wf;
      } else {
        // swells rolling in toward the edge, with a little cross-chop
        var sw = 0.5 + 0.5 * Math.sin(d * 0.042 - T * 5.2 + 0.8 * Math.sin(x * 0.009 + T * 0.4));
        var cr = 0.5 + 0.5 * Math.sin(x * 0.07 + d * 0.02 + T * 2.6);
        var dec = Math.exp(-Math.max(0, d - foamW) / deepL);
        Lm = 0.24 + (0.3 * sw + 0.1 * cr) * dec;
        c = 0.2 + (0.3 * sw + 0.08 * cr) * dec;
        if (d < foamW * 1.4) {
          // the foam line: lacy, brightest at the very edge, where the orange shows
          var fw = smooth(foamW * 1.4, 0, d);
          var lace = 0.5 + 0.5 * Math.sin(x * 0.043 + y * 0.031 + T * 2.2) * Math.sin(x * 0.019 - y * 0.057 - T * 1.7);
          lace = smooth(0.22, 0.78, lace * 0.78 + h * 0.36);
          var fl = 0.4 + 0.6 * lace, fc = 0.5 + 0.47 * lace;
          Lm += (fl - Lm) * fw; c += (fc - c) * fw;
        }
      }

      var dx2 = GI[k] - ccx, dy2 = GJ[k] - ccy;
      var mo = 0.5 + 0.25 * Math.cos(f1 * (GI[k] * ca + GJ[k] * sa) + ph1) + 0.25 * Math.cos(f2 * Math.sqrt(dx2 * dx2 + dy2 * dy2) - ph2);
      var r = P * 0.62 * Math.pow(Lm > 1 ? 1 : Lm, 0.7) * (0.5 + 0.5 * Math.pow(mo, 1.2));
      if (r < 0.45) continue;

      // split into the two ink drums, exactly as the lake does
      var da = smooth(-0.05, 0.5, c) * (1 - 0.7 * smooth(0.66, 0.88, c));
      var db = Math.min(1, 1.15 * smooth(0.6, 0.86, c));
      var spr = 0.9 + 0.2 * h;
      if (da > 0.04) { var ra = r * Math.sqrt(da) * spr * 1.12; if (ra > 0.4) { ga.moveTo(x + ra, y); ga.arc(x, y, ra, 0, TAU); } }
      if (db > 0.04) { var rb = r * Math.sqrt(db) * spr * 1.05; if (rb > 0.4) { gb.moveTo(x + rb, y); gb.arc(x, y, rb, 0, TAU); } }
    }
    ga.fill(); gb.fill();

    if (canTurn) {
      var a1 = 0.09 + 0.05 * Math.sin(T * 0.05), a2 = -0.19 + 0.05 * Math.cos(T * 0.043);
      cutPat.setTransform(new DOMMatrix().translate(T * 3.1 % 240, T * 1.3 % 240).rotate(a1 * 57.2958).scale(1, 1 + 0.06 * Math.sin(T * 0.09)));
      threadPat.setTransform(new DOMMatrix().translate(-T * 2.2 % 240, T * 0.8 % 240).rotate(a2 * 57.2958));
      [ga, gb].forEach(function (g) {
        g.save();
        g.globalCompositeOperation = "destination-out"; g.globalAlpha = 0.66;
        g.fillStyle = cutPat; g.fillRect(0, 0, W, H);
        g.globalCompositeOperation = "source-atop"; g.globalAlpha = 0.3;
        g.fillStyle = threadPat; g.fillRect(0, 0, W, H);
        g.restore();
      });
    }

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(inkA, 0, 0);
    ctx.globalCompositeOperation = "screen";
    ctx.drawImage(inkB, 0, -2 * dpr);          // the orange drum sits 2px above the teal
    ctx.restore();
  }

  /* The page materializes: it arrives under calm water, and an opening in the
     water spreads out from the point you clicked (on the last page), its foam
     line rolling outward until the whole page is uncovered. */
  function reveal(fx, fy, done) {
    mount();
    CX = fx * W; CY = fy * H;
    TH = new Float32Array(N); DS = new Float32Array(N);
    for (var k = 0; k < N; k++) { var dx = X[k] - CX, dy = Y[k] - CY; TH[k] = Math.atan2(dy, dx); DS[k] = Math.sqrt(dx * dx + dy * dy); }
    var far = Math.max(Math.hypot(CX, CY), Math.hypot(W - CX, CY), Math.hypot(CX, H - CY), Math.hypot(W - CX, H - CY));
    var m = Math.min(W, H), amp = 10 + m * 0.035, foamW = 44 + m * 0.04;
    var a = -(foamW * 1.5 + amp + 16), b = far + foamW * 0.8 + amp + 24;
    var t0 = performance.now(), D = 0.82;
    cancelAnimationFrame(raf);
    (function frame(now) {
      var p = Math.min(1, (now - t0) / 1000 / D);
      var e = 1 - Math.pow(1 - p, 1.8);                 // opens quickly, settles out at the corners
      render(a + (b - a) * e, amp, foamW, clock(), 1 - smooth(0.6, 1, p));
      if (p < 1) raf = requestAnimationFrame(frame);
      else { raf = 0; if (done) done(); }
    })(t0);
  }

  /* Leaving: no animation here, so the next page starts loading the moment you
     click. Where you clicked is passed along so the water opens from there. */
  window.flowTo = function (url, x, y) {
    if (reduce) { window.location.href = url; return; }
    var vw = window.innerWidth || 1, vh = window.innerHeight || 1;
    var fx = x == null ? 0.5 : Math.max(0, Math.min(1, x / vw)), fy = y == null ? 0.5 : Math.max(0, Math.min(1, y / vh));
    var v = fx.toFixed(3) + "," + fy.toFixed(3);
    try { sessionStorage.setItem("flow", v); } catch (e) {}
    // window.name survives navigation inside the same frame, for viewers that block sessionStorage
    try { if (window.name !== "peek") window.name = "flow:" + v; } catch (e) {}
    window.location.href = url;
  };

  /* arriving: the water that covers this page opens up and reveals it */
  if (root.classList.contains("flow-in")) {
    var at = [0.5, 0.5];
    try {
      var v = String(window.__flow || "").split(",");
      if (v.length === 2 && isFinite(+v[0]) && isFinite(+v[1])) at = [+v[0], +v[1]];
    } catch (e) {}
    try { sessionStorage.removeItem("flow"); } catch (e) {}
    if (/^flow:/.test(window.name)) window.name = "";
    reveal(at[0], at[1], function () { if (cv && cv.parentNode) cv.parentNode.removeChild(cv); root.classList.remove("flow-settle"); });
    requestAnimationFrame(function () {
      root.classList.add("flow-settle");
      requestAnimationFrame(function () {
        root.classList.remove("flow-in");
        var cover = document.getElementById("flow-cover");
        if (cover) cover.parentNode.removeChild(cover);
      });
    });
  }

  /* warm the cache: fetch a page as soon as someone shows intent to open it,
     and the pages in the nav once this one is idle */
  var warmed = {};
  function warm(href) {
    try {
      var u = new URL(href, location.href);
      if (u.origin !== location.origin || u.pathname === location.pathname || warmed[u.pathname]) return;
      warmed[u.pathname] = 1;
      var l = document.createElement("link"); l.rel = "prefetch"; l.href = u.pathname; document.head.appendChild(l);
    } catch (e) {}
  }
  function intent(e) { var a = e.target.closest && e.target.closest("a[href]"); if (a && a.target !== "_blank") warm(a.href); }
  document.addEventListener("pointerover", intent, { passive: true });
  document.addEventListener("touchstart", intent, { passive: true });
  document.addEventListener("focusin", intent);
  var idle = window.requestIdleCallback || function (f) { return setTimeout(f, 1500); };
  window.addEventListener("load", function () { idle(function () { Array.prototype.forEach.call(document.querySelectorAll(".nav a[href]"), function (a) { warm(a.href); }); }); });

  /* coming back with the browser's back button: clear the water */
  window.addEventListener("pageshow", function (e) {
    if (!e.persisted) return;
    root.classList.remove("flow-in", "flow-settle");
    cancelAnimationFrame(raf);
    if (cv && cv.parentNode) cv.parentNode.removeChild(cv);
    try { sessionStorage.removeItem("flow"); } catch (err) {}
    if (/^flow:/.test(window.name)) window.name = "";
  });
})();
