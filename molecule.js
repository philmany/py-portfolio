/*
  A water molecule (H2O) in 3D, drawn in the same halftone as the lake.
  Canvas 2D, no libraries.

  - Geometry: one oxygen and two hydrogens, O-H bonds at the real 104.5 degree
    angle. Atoms are shaded spheres, bonds are shaded cylinders, both made of dots.
  - It spins slowly on its own. Hovering it spins it faster; when the pointer
    leaves it eases back to its resting speed.
  - Reduced motion: a still view. Off screen: it stops drawing.
*/
(function () {
  "use strict";
  var canvas = document.getElementById("h2o");
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext("2d");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var TAU = Math.PI * 2;

  var half = (104.5 / 2) * Math.PI / 180, bond = 1.25;
  // positions in molecule space (y down), centred roughly on the middle of the shape
  var atoms = [
    { name: "O", p: [0, -0.32, 0], r: 0.78, lo: [70, 40, 70], hi: [255, 214, 178] },
    { name: "H", p: [-Math.sin(half) * bond, -0.32 + Math.cos(half) * bond, 0], r: 0.46, lo: [30, 40, 92], hi: [178, 196, 236] },
    { name: "H", p: [Math.sin(half) * bond, -0.32 + Math.cos(half) * bond, 0], r: 0.46, lo: [30, 40, 92], hi: [178, 196, 236] },
  ];
  var bonds = [[0, 1], [0, 2]];
  var L = (function (v) { var m = Math.hypot(v[0], v[1], v[2]); return [v[0] / m, v[1] / m, v[2] / m]; })([-0.55, -0.62, 0.56]);

  var W = 0, H = 0, unit = 1, pitch = 5;
  var angle = 0.6, speed = 0.55, target = 0.55, BASE = 0.55, FAST = 3.4;
  var visible = true, raf = 0, last = 0;

  function size() {
    var r = canvas.getBoundingClientRect();
    if (!r.width) return false;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    unit = Math.min(W, H) * 0.27;
    pitch = Math.max(4, Math.round(W / 88));
    return true;
  }

  function project(v, a, tilt) {
    // spin around the vertical axis, then tip slightly toward the viewer
    var ca = Math.cos(a), sa = Math.sin(a);
    var x = v[0] * ca + v[2] * sa, z = -v[0] * sa + v[2] * ca, y = v[1];
    var ct = Math.cos(tilt), st = Math.sin(tilt);
    var y2 = y * ct - z * st, z2 = y * st + z * ct;
    var f = 6 / (6 + z2);
    return { x: W / 2 + x * unit * f, y: H * 0.47 + y2 * unit * f, z: z2, s: f };
  }

  function mix(a, b, t) {
    return "rgb(" + Math.round(a[0] + (b[0] - a[0]) * t) + "," + Math.round(a[1] + (b[1] - a[1]) * t) + "," + Math.round(a[2] + (b[2] - a[2]) * t) + ")";
  }

  function sphere(c, R, lo, hi) {
    var buckets = {};
    for (var gy = -R; gy <= R; gy += pitch) for (var gx = -R; gx <= R; gx += pitch) {
      var nx = gx / R, ny = gy / R, q = nx * nx + ny * ny;
      if (q > 1) continue;
      var nz = Math.sqrt(1 - q);
      var d = nx * L[0] + ny * L[1] + nz * L[2];
      var I = 0.22 + 0.78 * Math.max(0, d);
      var sp = Math.pow(Math.max(0, d), 24) * 0.6;
      var rim = Math.pow(1 - nz, 3) * 0.25;
      var lum = Math.min(1, I + sp + rim);
      var r = pitch * 0.5 * Math.pow(lum, 0.75) * (0.55 + 0.45 * nz);
      if (r < 0.35) continue;
      var key = Math.min(9, (lum * 10) | 0);
      (buckets[key] = buckets[key] || []).push(c.x + gx, c.y + gy, r);
    }
    for (var k in buckets) {
      var b = buckets[k];
      ctx.fillStyle = mix(lo, hi, (+k + 0.5) / 10);
      ctx.beginPath();
      for (var i = 0; i < b.length; i += 3) { ctx.moveTo(b[i] + b[i + 2], b[i + 1]); ctx.arc(b[i], b[i + 1], b[i + 2], 0, TAU); }
      ctx.fill();
    }
  }

  function cylinder(a, b, w) {
    var dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
    if (len < 1) return;
    var ux = dx / len, uy = dy / len, px = -uy, py = ux;
    ctx.fillStyle = "rgb(150,140,170)";
    var buckets = {};
    for (var t = 0; t <= len; t += pitch) for (var s = -w; s <= w; s += pitch) {
      var n = s / w, lum = 0.18 + 0.7 * Math.max(0, Math.cos(n * 1.4 - 0.45));
      var r = pitch * 0.42 * Math.pow(lum, 0.8);
      if (r < 0.35) continue;
      var key = Math.min(9, (lum * 10) | 0);
      (buckets[key] = buckets[key] || []).push(a.x + ux * t + px * s, a.y + uy * t + py * s, r);
    }
    for (var k in buckets) {
      var bb = buckets[k];
      ctx.fillStyle = mix([46, 40, 74], [214, 196, 216], (+k + 0.5) / 10);
      ctx.beginPath();
      for (var i = 0; i < bb.length; i += 3) { ctx.moveTo(bb[i] + bb[i + 2], bb[i + 1]); ctx.arc(bb[i], bb[i + 1], bb[i + 2], 0, TAU); }
      ctx.fill();
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    var tilt = 0.32 + 0.06 * Math.sin(angle * 0.7);
    var P = atoms.map(function (at) { return project(at.p, angle, tilt); });
    var items = [];
    atoms.forEach(function (at, i) { items.push({ z: P[i].z, f: function () { sphere(P[i], at.r * unit * P[i].s, at.lo, at.hi); } }); });
    bonds.forEach(function (bd) {
      var a = P[bd[0]], b = P[bd[1]];
      items.push({ z: (a.z + b.z) / 2 + 0.01, f: function () { cylinder(a, b, unit * 0.11 * (a.s + b.s) / 2); } });
    });
    items.sort(function (m, n) { return n.z - m.z; }).forEach(function (it) { it.f(); });
  }

  function frame(ts) {
    raf = 0;
    if (!visible) return;
    var dt = Math.min(0.05, (ts - (last || ts)) / 1000);
    last = ts;
    speed += (target - speed) * Math.min(1, dt * 2.2);
    angle += speed * dt;
    draw();
    raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf && visible && !reduce) { last = 0; raf = requestAnimationFrame(frame); } }

  canvas.addEventListener("pointerenter", function () { target = FAST; if (reduce) { angle += 0.9; draw(); } });
  canvas.addEventListener("pointerleave", function () { target = BASE; });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting && !document.hidden; kick(); }).observe(canvas);
  }
  document.addEventListener("visibilitychange", function () { visible = !document.hidden; kick(); });
  var rt = 0;
  window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () { if (size()) draw(); }, 120); });

  if (size()) draw();
  kick();
})();
