/*
  Page transition: flowing through a stream.
  Leaving a page, the page blurs and swells while dots stream past from a
  vanishing point, spiralling faster like a wormhole. The next page opens in
  the same current: the dots rush on and thin out as the page comes into focus.

  window.flowTo(url, x, y) starts it from a point on screen.
  A small inline script in each page's <head> covers the page early on arrival.
*/
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var root = document.documentElement;

  var css = document.createElement("style");
  css.textContent =
    ".flow-cv{position:fixed;inset:0;width:100%;height:100%;z-index:300;pointer-events:none;display:block}" +
    "html.flowing body>*:not(.flow-cv){filter:blur(26px) saturate(1.5);transform:scale(1.12);transition:filter .5s cubic-bezier(.7,0,.3,1),transform .63s cubic-bezier(.7,0,.3,1)}" +
    "html.flow-settle body>*:not(.flow-cv){transition:filter .66s cubic-bezier(.2,.8,.2,1),transform .78s cubic-bezier(.2,.8,.2,1)}" +
    "html.flowing{overflow:hidden}";
  document.head.appendChild(css);

  var cv = null, ctx = null, W = 0, H = 0, dpr = 1, parts = [], raf = 0;
  var A = [95, 211, 196], B = [255, 138, 61], M = [246, 240, 232];

  function mount() {
    if (!cv) { cv = document.createElement("canvas"); cv.className = "flow-cv"; cv.setAttribute("aria-hidden", "true"); ctx = cv.getContext("2d"); }
    if (!cv.parentNode) document.body.appendChild(cv);
    dpr = Math.min(2, window.devicePixelRatio || 1); W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    parts = [];
    var n = Math.round(Math.min(1100, W * H / 1300));
    for (var i = 0; i < n; i++) parts.push({ a: Math.random() * 6.2832, z: 0.08 + Math.random(), s: 0.5 + Math.random() * 0.9, m: Math.random() });
  }
  function mix(t) {
    // teal → tangerine, with a few pale highlights like sun on the water
    var c = t < 0.92 ? A.map(function (v, k) { return v + (B[k] - v) * (t / 0.92); }) : M;
    return c.map(Math.round).join(",");
  }

  /* mode "out": accelerate into the tunnel. mode "in": rush on, then thin out. */
  function run(mode, x, y, done) {
    mount();
    var t0 = performance.now(), last = t0, D = mode === "out" ? 0.6 : 0.69;
    var sx = x == null ? W / 2 : x, sy = y == null ? H / 2 : y;
    cancelAnimationFrame(raf);
    (function frame(now) {
      var dt = Math.min(0.05, (now - last) / 1000); last = now;
      var p = Math.min(1, (now - t0) / 1000 / D);
      var e = mode === "out" ? p * p * (3 - 2 * p) : 1 - Math.pow(1 - p, 3);
      var speed = mode === "out" ? 0.3 + 5.2 * p * p : 5.4 * Math.pow(1 - p, 2) + 0.1;
      var veil = mode === "out" ? Math.min(1, p * 1.5) : Math.max(0, 1 - e * 1.25);
      var glow = mode === "out" ? Math.min(1, p * 2.2) : Math.max(0, 1 - e);
      var cx = mode === "out" ? sx + (W / 2 - sx) * e : W / 2, cy = mode === "out" ? sy + (H / 2 - sy) * e : H / 2;
      var R = Math.hypot(W, H) * 0.5;

      ctx.clearRect(0, 0, W, H);
      // the stream: dark water, lit from the vanishing point
      var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.1);
      g.addColorStop(0, "rgba(40,110,108," + (0.9 * veil).toFixed(3) + ")");
      g.addColorStop(0.25, "rgba(24,22,36," + veil.toFixed(3) + ")");
      g.addColorStop(1, "rgba(20,10,24," + veil.toFixed(3) + ")");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

      ctx.lineCap = "round";
      for (var i = 0; i < parts.length; i++) {
        var q = parts[i], z0 = q.z;
        q.z -= speed * dt * (0.55 + q.s * 0.35);
        q.a += dt * (0.5 + speed * 0.35) * (q.m > 0.5 ? 1 : 0.8);    // the spiral of the wormhole
        if (q.z <= 0.03) { q.z += 1; continue; }
        var r0 = 26 / z0, r1 = 26 / q.z;
        if (r0 > R * 1.3) continue;
        var ca = Math.cos(q.a), sa = Math.sin(q.a);
        var x0 = cx + ca * r0, y0 = cy + sa * r0 * 0.82, x1 = cx + ca * r1, y1 = cy + sa * r1 * 0.82;
        var near = Math.min(1, 0.12 / q.z);
        var a = glow * (0.25 + 0.75 * near) * (0.5 + q.s * 0.5);
        if (a < 0.02) continue;
        // a dot with a short trail, not a streak: drifting, not warping
        var dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), cap = 4 + 30 * near;
        if (L > cap) { x0 = x1 - dx / L * cap; y0 = y1 - dy / L * cap; }
        var col = mix((q.m * 0.6 + (1 - q.z) * 0.5) % 1), size = Math.max(0.8, Math.min(9, 0.7 + q.s * 6 * near));
        if (near > 0.35) {   // soft out-of-focus halo on the dots closest to you
          ctx.fillStyle = "rgba(" + col + "," + (a * 0.16).toFixed(3) + ")";
          ctx.beginPath(); ctx.arc(x1, y1, size * 2.4, 0, 6.2832); ctx.fill();
        }
        ctx.strokeStyle = "rgba(" + col + "," + a.toFixed(3) + ")";
        ctx.lineWidth = size;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1 + 0.01, y1); ctx.stroke();
      }
      if (p < 1) raf = requestAnimationFrame(frame);
      else { raf = 0; if (done) done(); }
    })(t0);
  }

  window.flowTo = function (url, x, y) {
    if (reduce) { window.location.href = url; return; }
    try { sessionStorage.setItem("flow", "1"); } catch (e) {}
    root.classList.add("flowing");
    var went = false, go = function () { if (!went) { went = true; window.location.href = url; } };
    run("out", x, y, go);
    setTimeout(go, 850);   // in case frames are throttled
  };

  /* arriving through the stream */
  if (root.classList.contains("flow-in")) {
    try { sessionStorage.removeItem("flow"); } catch (e) {}
    run("in", null, null, function () { if (cv && cv.parentNode) cv.parentNode.removeChild(cv); root.classList.remove("flow-settle"); });
    requestAnimationFrame(function () {
      root.classList.add("flow-settle");
      requestAnimationFrame(function () {
        root.classList.remove("flow-in");
        var cover = document.getElementById("flow-cover");
        if (cover) cover.parentNode.removeChild(cover);
      });
    });
  }

  /* coming back with the browser's back button: clear the stream */
  window.addEventListener("pageshow", function (e) {
    if (!e.persisted) return;
    root.classList.remove("flowing");
    cancelAnimationFrame(raf);
    if (cv && cv.parentNode) cv.parentNode.removeChild(cv);
    try { sessionStorage.removeItem("flow"); } catch (err) {}
  });
})();
