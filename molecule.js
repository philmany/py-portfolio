/*
  A water molecule (H2O) as a 3D line drawing. Canvas 2D, no libraries.

  - Geometry: one oxygen and two hydrogens with O-H bonds at the real
    104.5 degree angle. Each atom is a wireframe globe (outline, meridians and
    parallels); each bond is drawn as a cylinder outline.
  - It turns slowly on its own. Press and drag to turn it any way you like,
    like a globe; let go and it keeps your spin, then settles back into its
    slow turn. Arrow keys turn it too.
  - Lines on the far side of each atom are drawn fainter.
  - Reduced motion: it holds still until you turn it.
*/
(function () {
  "use strict";
  var canvas = document.getElementById("h2o");
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext("2d");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var TAU = Math.PI * 2;

  var half = (104.5 / 2) * Math.PI / 180, bond = 1.3;
  var atoms = [
    { label: "O", p: [0, -0.34, 0], r: 0.72, color: [255, 138, 61] },
    { label: "H", p: [-Math.sin(half) * bond, -0.34 + Math.cos(half) * bond, 0], r: 0.42, color: [95, 211, 196] },
    { label: "H", p: [Math.sin(half) * bond, -0.34 + Math.cos(half) * bond, 0], r: 0.42, color: [95, 211, 196] },
  ];
  var bonds = [[0, 1], [0, 2]];

  function mul(A, B) {
    var C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++)
      C[i][j] = A[i][0] * B[0][j] + A[i][1] * B[1][j] + A[i][2] * B[2][j];
    return C;
  }
  function rotX(a) { var c = Math.cos(a), s = Math.sin(a); return [[1, 0, 0], [0, c, -s], [0, s, c]]; }
  function rotY(a) { var c = Math.cos(a), s = Math.sin(a); return [[c, 0, s], [0, 1, 0], [-s, 0, c]]; }
  function apply(M, v) {
    return [M[0][0] * v[0] + M[0][1] * v[1] + M[0][2] * v[2],
            M[1][0] * v[0] + M[1][1] * v[1] + M[1][2] * v[2],
            M[2][0] * v[0] + M[2][1] * v[1] + M[2][2] * v[2]];
  }
  var R = mul(rotX(0.35), rotY(0.6));   // orientation

  var W = 0, H = 0, unit = 1;
  var vx = 0, vy = 0.5, BASE_VY = 0.5;  // angular velocity (rad/s) about screen x and y
  var visible = true, raf = 0, last = 0, drag = null;

  function size() {
    var r = canvas.getBoundingClientRect();
    if (!r.width) return false;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    unit = Math.min(W, H) * 0.26;
    return true;
  }
  function proj(v) {
    var f = 7 / (7 + v[2]);
    return [W / 2 + v[0] * unit * f, H * 0.47 + v[1] * unit * f, v[2], f];
  }
  function rgba(c, a) { return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a.toFixed(3) + ")"; }

  // a great or small circle on an atom, drawn in short pieces so the far side can be fainter
  function ring(center, rad, color, fn) {
    var N = 56, prev = null;
    for (var k = 0; k <= N; k++) {
      var v = apply(R, fn((k / N) * TAU));
      var p = proj([center[0] + v[0] * rad, center[1] + v[1] * rad, center[2] + v[2] * rad]);
      if (prev) {
        var front = (v[2] + prev.vz) / 2 < 0;
        ctx.strokeStyle = rgba(color, front ? 0.9 : 0.2);
        ctx.beginPath(); ctx.moveTo(prev.p[0], prev.p[1]); ctx.lineTo(p[0], p[1]); ctx.stroke();
      }
      prev = { p: p, vz: v[2] };
    }
  }

  function globe(at, c) {
    var rad = at.r, pc = proj(c);
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = rgba(at.color, 1);
    ctx.beginPath(); ctx.arc(pc[0], pc[1], rad * unit * pc[3], 0, TAU); ctx.stroke();
    ctx.lineWidth = 1;
    for (var m = 0; m < 4; m++) {
      (function (a) {
        ring(c, rad, at.color, function (t) { return [Math.cos(a) * Math.sin(t), Math.cos(t), Math.sin(a) * Math.sin(t)]; });
      })((m / 4) * Math.PI);
    }
    [-0.5, 0, 0.5].forEach(function (yy) {
      var rr = Math.sqrt(1 - yy * yy);
      ring(c, rad, at.color, function (t) { return [rr * Math.cos(t), yy, rr * Math.sin(t)]; });
    });
    ctx.fillStyle = rgba(at.color, 1);
    ctx.font = "italic " + Math.round(unit * 0.34 * pc[3]) + "px 'Instrument Serif', Georgia, serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(at.label, pc[0], pc[1]);
  }

  function bondLines(a, b, ra, rb) {
    var pa = proj(a), pb = proj(b);
    var dx = pb[0] - pa[0], dy = pb[1] - pa[1], len = Math.hypot(dx, dy);
    var sa = ra * unit * pa[3] * 0.95, sb = rb * unit * pb[3] * 0.95;
    if (len <= sa + sb + 2) return;
    var ux = dx / len, uy = dy / len, nx = -uy, ny = ux, w = unit * 0.07 * (pa[3] + pb[3]) / 2;
    var x0 = pa[0] + ux * sa, y0 = pa[1] + uy * sa, x1 = pb[0] - ux * sb, y1 = pb[1] - uy * sb;
    ctx.strokeStyle = "rgba(232, 224, 234, 0.75)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x0 + nx * w, y0 + ny * w); ctx.lineTo(x1 + nx * w, y1 + ny * w);
    ctx.moveTo(x0 - nx * w, y0 - ny * w); ctx.lineTo(x1 - nx * w, y1 - ny * w);
    ctx.stroke();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.lineCap = "round";
    var C = atoms.map(function (at) { return apply(R, at.p); });
    var items = [];
    atoms.forEach(function (at, i) { items.push({ z: C[i][2], f: function () { globe(at, C[i]); } }); });
    bonds.forEach(function (bd) {
      items.push({ z: (C[bd[0]][2] + C[bd[1]][2]) / 2 + 0.05,
        f: function () { bondLines(C[bd[0]], C[bd[1]], atoms[bd[0]].r, atoms[bd[1]].r); } });
    });
    items.sort(function (m, n) { return n.z - m.z; }).forEach(function (it) { it.f(); });
  }

  function frame(ts) {
    raf = 0;
    if (!visible) return;
    var dt = Math.min(0.05, (ts - (last || ts)) / 1000);
    last = ts;
    if (!drag) {
      // a flick carries on, then eases back to the slow turn
      var k = Math.min(1, dt * 1.4);
      vx += (0 - vx) * k;
      vy += ((reduce ? 0 : BASE_VY) - vy) * k;
      R = mul(mul(rotX(vx * dt), rotY(vy * dt)), R);
    }
    draw();
    if (drag || Math.abs(vx) > 0.002 || Math.abs(vy) > 0.002) raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf && visible) { last = 0; raf = requestAnimationFrame(frame); } }

  canvas.addEventListener("pointerdown", function (e) {
    drag = { x: e.clientX, y: e.clientY, t: performance.now() };
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    canvas.classList.add("dragging");
    kick();
  });
  canvas.addEventListener("pointermove", function (e) {
    if (!drag) return;
    var now = performance.now(), dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    var dt = Math.max(0.008, (now - drag.t) / 1000), s = 1 / unit;
    var ay = dx * s, ax = -dy * s;
    R = mul(mul(rotX(ax), rotY(ay)), R);
    vx = vx * 0.5 + (ax / dt) * 0.5; vy = vy * 0.5 + (ay / dt) * 0.5;
    drag = { x: e.clientX, y: e.clientY, t: now };
  });
  function end() { if (!drag) return; drag = null; canvas.classList.remove("dragging"); kick(); }
  canvas.addEventListener("pointerup", end);
  canvas.addEventListener("pointercancel", end);
  canvas.tabIndex = 0;
  canvas.addEventListener("keydown", function (e) {
    var k = { ArrowLeft: [0, -0.25], ArrowRight: [0, 0.25], ArrowUp: [-0.25, 0], ArrowDown: [0.25, 0] }[e.key];
    if (!k) return;
    e.preventDefault();
    R = mul(mul(rotX(k[0]), rotY(k[1])), R);
    draw(); kick();
  });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting && !document.hidden; kick(); }).observe(canvas);
  }
  document.addEventListener("visibilitychange", function () { visible = !document.hidden; kick(); });
  var rt = 0;
  window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () { if (size()) draw(); }, 120); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (size()) draw(); });

  if (size()) draw();
  kick();
})();
