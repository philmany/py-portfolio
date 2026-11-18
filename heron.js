/*
  A great blue heron and a fish, in the same dots as the lake. Canvas 2D, no libraries.

  - A tangerine fish swims slowly about the lower part of the About section.
  - Hover the fish (or focus it with the keyboard and press Enter) and the
    heron comes down from off the top right in one continuous swoop: it dives,
    snatches the fish without stopping, and carries on off the left of the
    screen, passing behind the heading.
  - Ten seconds later a new fish swims up, ready again.
  - Bird and fish are drawn each frame as vector silhouettes on a small hidden
    canvas, then sampled into dots.
  - Reduced motion: the fish holds still; the swoop still plays when asked for.
*/
(function () {
  "use strict";
  var canvas = document.getElementById("heron");
  var section = document.getElementById("about");
  var bait = document.getElementById("fish");
  if (!canvas || !canvas.getContext || !section) return;
  var ctx = canvas.getContext("2d");
  var off = document.createElement("canvas"), OW = 460, OH = 340, OX = 230, OY = 170;
  off.width = OW; off.height = OH;
  var octx = off.getContext("2d", { willReadFrequently: true });
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var TAU = Math.PI * 2;

  var W = 0, H = 0, scale = 1;
  var clock = 0, visible = false, raf = 0, last = 0;
  var swoop = null;                 // { t0, strike: [x, y], p0, c1, c2, c3, c4, end }
  var fishGone = -1, fishBorn = 0;  // clock times
  var RESPAWN = 10;

  function size() {
    var r = section.getBoundingClientRect();
    if (!r.width) return false;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    scale = Math.max(0.7, Math.min(1.45, W / 980));
    return true;
  }

  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function bez(p0, p1, p2, p3, u) {
    var v = 1 - u;
    return [v * v * v * p0[0] + 3 * v * v * u * p1[0] + 3 * v * u * u * p2[0] + u * u * u * p3[0],
            v * v * v * p0[1] + 3 * v * v * u * p1[1] + 3 * v * u * u * p2[1] + u * u * u * p3[1]];
  }

  /* ---------- the fish's swim ---------- */
  function fishPath(tt) {
    var narrow = W < 700;
    var cx = W * (narrow ? 0.5 : 0.66), cy = H * (narrow ? 0.8 : 0.76);
    var ax = W * (narrow ? 0.28 : 0.18), ay = H * 0.05;
    var s = reduce ? 0 : tt;
    var x = cx + ax * Math.sin(s * 0.32) + ax * 0.25 * Math.sin(s * 0.71 + 1);
    var y = cy + ay * Math.sin(s * 0.53 + 0.4);
    var dx = ax * 0.32 * Math.cos(s * 0.32) + ax * 0.25 * 0.71 * Math.cos(s * 0.71 + 1);
    var dy = ay * 0.53 * Math.cos(s * 0.53 + 0.4);
    var tilt = clamp(Math.atan2(dy, Math.max(Math.abs(dx), ax * 0.25)) * 0.6, -0.3, 0.3);
    return { x: x, y: y, dir: dx < 0 ? -1 : 1, tilt: tilt };
  }
  function fishNow() {
    var p = fishPath(clock);
    var age = clock - fishBorn;
    if (age < 2.6) {                                      // a new fish swims up from the bottom
      var e = 1 - Math.pow(1 - clamp(age / 2.6, 0, 1), 3);
      p.y = p.y + (H - p.y + 40) * (1 - e);
      p.tilt = -0.5 * (1 - e) * p.dir;
      p.alpha = e;
    } else p.alpha = 1;
    return p;
  }

  /* ---------- the swoop ---------- */
  var T_IN = 1.25, T_OUT = 3.2;
  // where the fish sits relative to the heron's body, at the strike pose
  function holdOffset(ang) {
    var hx = -96, hy = 56, bdx = -0.42, bdy = 1, bl = Math.hypot(bdx, bdy);
    var lx = hx + (bdx / bl) * 30, ly = hy + (bdy / bl) * 30;
    var c = Math.cos(ang) * scale, s = Math.sin(ang) * scale;
    return [c * lx - s * ly, s * lx + c * ly];
  }
  function startSwoop() {
    if (swoop || fishGone >= 0 || clock - fishBorn < 2.6) return;
    var f = fishPath(clock + T_IN);                       // where the fish will be
    var drawAng = 0.32;                                   // the body is tipped nose-down as it strikes
    var ho = holdOffset(drawAng);
    var S = [f.x - ho[0], f.y - ho[1]];
    var p0 = [W + 260, -220], end = [-360, H * 0.18];
    var inDir = [-0.86, 0.5];                              // heading down-left at the strike
    var k = 260 * scale;
    swoop = {
      t0: clock, S: S,
      a: [p0, [W * 0.98, H * 0.02], [S[0] - inDir[0] * k, S[1] - inDir[1] * k], S],
      b: [S, [S[0] + inDir[0] * k * 1.1, S[1] - 30 * scale], [W * 0.3, H * 0.1], end],
    };
    canvas.classList.add("live");
    kick();
  }

  function heronState(s) {
    var st = { fish: false, pose: 0, flap: 0, x: 0, y: 0, ang: 0 };
    var A = swoop.a, B = swoop.b, p, q;
    if (s < T_IN) {
      var u = Math.pow(s / T_IN, 1.6);                   // accelerate into the dive
      p = bez(A[0], A[1], A[2], A[3], u); q = bez(A[0], A[1], A[2], A[3], Math.min(1, u + 0.01));
      st.pose = clamp((s - T_IN * 0.45) / (T_IN * 0.5), 0, 1);
      st.flap = s < T_IN * 0.4 ? Math.sin(s * TAU * 2.4) : 0.7 - 0.5 * clamp((s - T_IN * 0.7) / (T_IN * 0.3), 0, 1);
    } else {
      var v = (s - T_IN) / T_OUT, w = 1 - Math.pow(1 - v, 1.4);
      p = bez(B[0], B[1], B[2], B[3], w); q = bez(B[0], B[1], B[2], B[3], Math.min(1, w + 0.01));
      st.pose = 1 - clamp((s - T_IN) / 0.55, 0, 1);
      st.flap = Math.sin((s - T_IN) * TAU * 1.8 - 0.6);
      st.fish = true;
    }
    st.x = p[0]; st.y = p[1]; st.ang = Math.atan2(q[1] - p[1], q[0] - p[0]);
    return st;
  }

  function lerp(a, b, u) { return a + (b - a) * u; }
  function wing(g, f, alpha, dy) {
    // f: -1 (fully down) .. 1 (fully up). A long arm, a broad hand and five
    // fingered primaries at the tip, with a feathered trailing edge.
    var up = -f;
    var sh = [-16, -4 + dy];                                  // shoulder
    var wr = [-4, -4 + dy + 52 * up];                         // wrist
    var tp = [26, -4 + dy + 104 * up];                        // tip of the hand
    g.fillStyle = "rgba(0,0,255," + alpha + ")";
    g.beginPath();
    g.moveTo(sh[0], sh[1]);
    g.quadraticCurveTo(wr[0] - 12, (sh[1] + wr[1]) / 2, wr[0], wr[1]);
    g.quadraticCurveTo(tp[0] - 26, wr[1] + 40 * up, tp[0] - 6, tp[1]);
    for (var k = 0; k < 5; k++) {                             // fingered primaries
      var fx = tp[0] + k * 9, fy = tp[1] - (k * 9 + 4) * up * 0.35;
      g.lineTo(fx + 6, fy - 2 * up); g.lineTo(fx + 4, fy + 9 * up * 0.6 + 4);
    }
    // feathered trailing edge back to the body
    for (var m = 0; m < 6; m++) {
      var u = m / 5, x = tp[0] + 40 - u * 52, y = tp[1] + (1 - u) * 6 + u * (dy - tp[1] + 2) + 8;
      g.lineTo(x + 5, y - 3); g.lineTo(x, y + 4);
    }
    g.lineTo(30, 2 + dy);
    g.closePath(); g.fill();
    // feather shafts, slightly denser dots
    g.strokeStyle = "rgba(0,0,255," + Math.min(1, alpha + 0.2) + ")"; g.lineWidth = 1.6;
    g.beginPath();
    for (var q = 0; q < 4; q++) {
      var a0 = 0.2 + q * 0.2;
      g.moveTo(lerp(sh[0], wr[0], a0) + 8, lerp(sh[1], wr[1], a0));
      g.lineTo(lerp(wr[0], tp[0], a0) + 18 + q * 6, lerp(wr[1], tp[1], a0) + 10 * Math.abs(up));
    }
    g.stroke();
  }
  function bird(st, s) {
    var g = octx, pose = st.pose;
    g.clearRect(0, 0, OW, OH);
    g.save(); g.translate(OX, OY);
    wing(g, st.flap * 0.85 + 0.1, 0.3, -4);                         // far wing
    // legs, trailing behind (dangling a little during the strike)
    g.strokeStyle = "rgba(0,0,255,0.85)"; g.lineWidth = 3.2; g.lineCap = "round";
    var lx = lerp(122, 84, pose), ly = lerp(8, 46, pose);
    g.beginPath(); g.moveTo(30, 6); g.lineTo(lx, ly); g.moveTo(32, 9); g.lineTo(lx + 4, ly + 5); g.stroke();
    g.lineWidth = 2; g.beginPath(); g.moveTo(lx, ly); g.lineTo(lx + 9, ly - 3); g.moveTo(lx, ly); g.lineTo(lx + 8, ly + 4); g.stroke();
    // tail
    g.fillStyle = "rgba(0,0,255,0.6)";
    g.beginPath(); g.moveTo(34, -6); g.lineTo(60, -2); g.lineTo(34, 6); g.closePath(); g.fill();
    // body, lighter on top
    var bg = g.createLinearGradient(0, -18, 0, 18);
    bg.addColorStop(0, "rgba(0,0,255,0.95)"); bg.addColorStop(1, "rgba(0,0,255,0.55)");
    g.fillStyle = bg;
    g.beginPath(); g.ellipse(4, 0, 46, 15, -0.05, 0, TAU); g.fill();
    // neck: tucked S in flight, reaching down to strike
    var hx = lerp(-58, -96, pose), hy = lerp(-20, 56, pose);
    var c1x = lerp(-58, -54, pose), c1y = lerp(12, 4, pose), c2x = lerp(-74, -100, pose), c2y = lerp(2, 20, pose);
    g.strokeStyle = "rgba(0,0,255,1)"; g.lineWidth = 9; g.lineCap = "round";
    g.beginPath(); g.moveTo(-34, -4); g.bezierCurveTo(c1x, c1y, c2x, c2y, hx, hy); g.stroke();
    // head and plume
    g.fillStyle = "rgba(0,0,255,1)";
    g.beginPath(); g.arc(hx, hy, 8, 0, TAU); g.fill();
    g.strokeStyle = "rgba(0,0,255,0.6)"; g.lineWidth = 2;
    g.beginPath(); g.moveTo(hx + 4, hy - 5); g.lineTo(hx + 22, hy - 9); g.stroke();
    // beak
    var bdx = lerp(-1, -0.42, pose), bdy = lerp(0.12, 1, pose), bl = Math.hypot(bdx, bdy);
    bdx /= bl; bdy /= bl;
    var px = -bdy, py = bdx, tipx = hx + bdx * 40, tipy = hy + bdy * 40;
    g.fillStyle = "rgba(0,0,255,1)";
    g.beginPath(); g.moveTo(hx + px * 3.5, hy + py * 3.5); g.lineTo(tipx, tipy); g.lineTo(hx - px * 3.5, hy - py * 3.5); g.closePath(); g.fill();
    // fish, crosswise in the beak, still wriggling
    if (st.fish) {
      var fx = hx + bdx * 30, fy = hy + bdy * 30, wig = Math.sin(s * 22) * 0.35;
      g.save(); g.translate(fx, fy); g.rotate(Math.atan2(bdy, bdx) + Math.PI / 2 + wig);
      g.fillStyle = "rgba(255,0,0,1)";
      g.beginPath(); g.ellipse(0, 0, 15, 5.5, 0, 0, TAU); g.fill();
      g.beginPath(); g.moveTo(13, 0); g.lineTo(23, -6); g.lineTo(23, 6); g.closePath(); g.fill();
      g.restore();
    }
    wing(g, st.flap, 0.7, 0);                                       // near wing
    g.restore();
  }

  function fishShape(g, wig) {
    g.clearRect(0, 0, OW, OH);
    g.save(); g.translate(OX, OY);
    g.fillStyle = "rgba(255,0,0,1)";
    g.beginPath(); g.ellipse(0, 0, 26, 9.5, 0, 0, TAU); g.fill();
    g.save(); g.translate(22, 0); g.rotate(wig);
    g.beginPath(); g.moveTo(0, 0); g.lineTo(17, -10); g.lineTo(14, 0); g.lineTo(17, 10); g.closePath(); g.fill();
    g.restore();
    g.beginPath(); g.moveTo(-4, -8); g.lineTo(6, -15); g.lineTo(10, -8); g.closePath(); g.fill();
    g.restore();
  }

  /* ---------- sampling a silhouette into dots ---------- */
  var HER = [[112, 160, 168], [236, 244, 240]], FISH = [255, 138, 61];
  function col(c) { return "rgb(" + c[0] + "," + c[1] + "," + c[2] + ")"; }
  function mix(a, b, u) { return [Math.round(a[0] + (b[0] - a[0]) * u), Math.round(a[1] + (b[1] - a[1]) * u), Math.round(a[2] + (b[2] - a[2]) * u)]; }
  function stamp(x0, y0, ang, flipX, sc, alpha) {
    var img = octx.getImageData(0, 0, OW, OH).data, P = 3;
    var ca = Math.cos(ang) * sc, sa = Math.sin(ang) * sc;
    var buckets = [[], [], [], [], [], []];
    for (var y = 0; y < OH; y += P) for (var x = 0; x < OW; x += P) {
      var i = (y * OW + x) * 4, a = img[i + 3];
      if (a < 14) continue;
      var lum = a / 255, fish = img[i] > img[i + 2];
      var r = P * 0.55 * Math.sqrt(lum) * sc;
      if (r < 0.4) continue;
      var lx = (x - OX) * flipX, ly = y - OY;
      buckets[fish ? 5 : Math.min(4, (lum * 5) | 0)].push(x0 + ca * lx - sa * ly, y0 + sa * lx + ca * ly, r);
    }
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    for (var k = 0; k < 6; k++) {
      var bk = buckets[k];
      if (!bk.length) continue;
      ctx.fillStyle = k === 5 ? col(FISH) : col(mix(HER[0], HER[1], (k + 0.5) / 5));
      ctx.beginPath();
      for (var j = 0; j < bk.length; j += 3) { ctx.moveTo(bk[j] + bk[j + 2], bk[j + 1]); ctx.arc(bk[j], bk[j + 1], bk[j + 2], 0, TAU); }
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- frame ---------- */
  function render() {
    ctx.clearRect(0, 0, W, H);
    var free = fishGone < 0;
    if (free) {
      var f = fishNow();
      fishShape(octx, Math.sin(clock * (reduce ? 0 : 7)) * 0.35);
      // the shape points left (head at -x); flip it when swimming right
      stamp(f.x, f.y, f.tilt * -f.dir, f.dir > 0 ? -1 : 1, scale * 0.95, f.alpha);
      if (bait) {
        bait.style.transform = "translate(" + (f.x - 40).toFixed(1) + "px," + (f.y - 28).toFixed(1) + "px)";
        bait.hidden = false;
      }
    } else if (bait) bait.hidden = true;
    if (swoop) {
      var s = clock - swoop.t0, st = heronState(s);
      bird(st, clock);
      var ang = st.ang + Math.PI;
      if (ang > Math.PI) ang -= TAU;
      stamp(st.x, st.y, clamp(ang, -0.7, 0.7), 1, scale, 1);
    }
  }

  function frame(ts) {
    raf = 0;
    if (!visible) return;
    var dt = Math.min(0.05, (ts - (last || ts)) / 1000);
    last = ts; clock += dt;
    if (swoop) {
      var s = clock - swoop.t0;
      if (fishGone < 0 && s >= T_IN) fishGone = clock;            // snatched
      if (s > T_IN + T_OUT) { swoop = null; canvas.classList.remove("live"); }
    }
    if (fishGone >= 0 && !swoop && clock - fishGone > RESPAWN) { fishGone = -1; fishBorn = clock; }
    render();
    raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf && visible) { last = 0; raf = requestAnimationFrame(frame); } }

  if (bait) {
    bait.addEventListener("pointerenter", startSwoop);
    bait.addEventListener("click", startSwoop);
    bait.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); startSwoop(); } });
  }
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting && !document.hidden; kick(); }).observe(section);
  } else { visible = true; }
  document.addEventListener("visibilitychange", function () { visible = !document.hidden && visible; kick(); });
  var rt = 0;
  window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () { if (size()) render(); }, 120); });

  fishBorn = -10;                                                    // first fish is already swimming
  if (size()) render();
  kick();
})();
