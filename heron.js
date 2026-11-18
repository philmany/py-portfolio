/*
  A great blue heron, in the same dots as the lake. Canvas 2D, no libraries.

  - It swoops in from off the top right of the About section, dips to the
    water, snatches a fish, then flies off to the left behind the heading
    and off the screen. Click the section (or "Watch again") to replay.
  - The bird is drawn each frame as a vector silhouette (wings, S-curved neck,
    dagger beak, trailing legs) on a small hidden canvas, then sampled into
    dots, so wingbeats and the strike animate smoothly.
  - It fishes from the strip of lake along the bottom of the band (the same
    water as the top of the page); the strike splashes it and throws a few drops.
  - Plays once when the section first comes into view. With reduced motion it
    waits for a click.
*/
(function () {
  "use strict";
  var canvas = document.getElementById("heron");
  var section = document.getElementById("heron-band");
  var replay = document.getElementById("heron-replay");
  if (!canvas || !canvas.getContext || !section) return;
  var ctx = canvas.getContext("2d");
  var off = document.createElement("canvas"), OW = 460, OH = 340, OX = 230, OY = 170;
  off.width = OW; off.height = OH;
  var octx = off.getContext("2d", { willReadFrequently: true });
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var TAU = Math.PI * 2;

  var W = 0, H = 0, waterTop = 0, scale = 1;
  var t = 0, playing = false, played = false, visible = false, raf = 0, last = 0, clock = 0;
  var splash = { x: 0, y: 0 }, drops = [];

  function size() {
    var r = section.getBoundingClientRect();
    if (!r.width) return false;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    waterTop = H * 0.7;
    scale = Math.max(0.75, Math.min(1.55, W / 950));
    return true;
  }

  /* ---------- path ---------- */
  function bez(p0, p1, p2, p3, u) {
    var v = 1 - u;
    return [v * v * v * p0[0] + 3 * v * v * u * p1[0] + 3 * v * u * u * p2[0] + u * u * u * p3[0],
            v * v * v * p0[1] + 3 * v * v * u * p1[1] + 3 * v * u * u * p2[1] + u * u * u * p3[1]];
  }
  function ease(u) { return u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2; }
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }

  var T_SWOOP = 2.0, T_STRIKE = 0.5, T_EXIT = 4.2, T_ALL = T_SWOOP + T_STRIKE + T_EXIT;

  // where the bird is at time s, its pose (0 flying, 1 striking) and wing position
  function state(s) {
    var sx = W * (W < 700 ? 0.7 : 0.68), sy = waterTop + 14;               // strike point
    var dip = [sx + 70 * scale, sy - 92 * scale];                          // body position at the strike
    var st = { fish: false, pose: 0, flap: 0, x: 0, y: 0, ang: 0 };
    if (s < T_SWOOP) {
      var u = ease(s / T_SWOOP);
      var p = bez([W + 220, -200], [W * 0.98, H * 0.06], [W * 0.86, waterTop - 260 * scale], dip, u);
      var q = bez([W + 220, -200], [W * 0.98, H * 0.06], [W * 0.86, waterTop - 260 * scale], dip, Math.min(1, u + 0.01));
      st.x = p[0]; st.y = p[1]; st.ang = Math.atan2(q[1] - p[1], q[0] - p[0]);
      st.pose = clamp((s - 1.25) / 0.6, 0, 1);
      // a few beats coming in, then a glide with the wings held high
      st.flap = s < 0.9 ? Math.sin(s * TAU * 2.2) : 0.55 + 0.25 * clamp((s - 0.9) / 0.8, 0, 1);
    } else if (s < T_SWOOP + T_STRIKE) {
      var k = (s - T_SWOOP) / T_STRIKE, d = Math.sin(k * Math.PI);
      st.x = dip[0] - 10 * k * scale; st.y = dip[1] + 16 * d * scale;
      st.ang = Math.PI + 0.25 - 0.4 * k;
      st.pose = 1 - clamp((k - 0.55) / 0.45, 0, 1) * 0.6;
      st.flap = 0.85 - 1.2 * clamp((k - 0.4) / 0.6, 0, 1);
      st.fish = k > 0.42;
    } else {
      var e = clamp((s - T_SWOOP - T_STRIKE) / T_EXIT, 0, 1), ue = e * e * (3 - 2 * e) * 0.35 + e * 0.65;
      var a = [dip[0] - 10 * scale, dip[1]];
      var p2 = bez(a, [W * 0.56, waterTop - 40], [W * 0.38, H * 0.2], [-320, H * 0.26], ue);
      var q2 = bez(a, [W * 0.56, waterTop - 40], [W * 0.38, H * 0.2], [-320, H * 0.26], Math.min(1, ue + 0.01));
      st.x = p2[0]; st.y = p2[1]; st.ang = Math.atan2(q2[1] - p2[1], q2[0] - p2[0]);
      st.pose = Math.max(0, 0.4 - e * 2);
      st.flap = Math.sin((s - T_SWOOP - T_STRIKE) * TAU * 1.7 + 1.2);
      st.fish = true;
    }
    return st;
  }

  /* ---------- the bird, as a silhouette on the hidden canvas ---------- */
  // facing left (toward -x); alpha carries the shading; red marks the fish
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

  /* ---------- drawing ---------- */
  var HER = [[112, 160, 168], [236, 244, 240]], FISH = [255, 138, 61];
  function col(c, a) { return "rgb(" + c[0] + "," + c[1] + "," + c[2] + ")"; }
  function mix(a, b, u) { return [Math.round(a[0] + (b[0] - a[0]) * u), Math.round(a[1] + (b[1] - a[1]) * u), Math.round(a[2] + (b[2] - a[2]) * u)]; }

  function drawBird(st, s) {
    bird(st, s);
    var img = octx.getImageData(0, 0, OW, OH).data, P = 3;
    var ang = st.ang + Math.PI;                                     // the bird faces -x
    if (ang > Math.PI) ang -= TAU;
    ang = clamp(ang, -0.7, 0.7);
    var ca = Math.cos(ang) * scale, sa = Math.sin(ang) * scale;
    var buckets = [[], [], [], [], [], []];
    for (var y = 0; y < OH; y += P) for (var x = 0; x < OW; x += P) {
      var i = (y * OW + x) * 4, a = img[i + 3];
      if (a < 14) continue;
      var lum = a / 255, fish = img[i] > img[i + 2];
      var r = P * 0.55 * Math.sqrt(lum) * scale;
      if (r < 0.4) continue;
      var lx = x - OX, ly = y - OY;
      var X = st.x + ca * lx - sa * ly, Y = st.y + sa * lx + ca * ly;
      var b = fish ? 5 : Math.min(4, (lum * 5) | 0);
      buckets[b].push(X, Y, r);
    }
    for (var k = 0; k < 6; k++) {
      var bk = buckets[k];
      if (!bk.length) continue;
      ctx.fillStyle = k === 5 ? col(FISH) : col(mix(HER[0], HER[1], (k + 0.5) / 5));
      ctx.beginPath();
      for (var j = 0; j < bk.length; j += 3) { ctx.moveTo(bk[j] + bk[j + 2], bk[j + 1]); ctx.arc(bk[j], bk[j + 1], bk[j + 2], 0, TAU); }
      ctx.fill();
    }
  }

  var DROP = [104, 190, 176];
  function drawDrops() {
    if (!drops.length) return;
    ctx.fillStyle = col(DROP);
    ctx.beginPath();
    drops.forEach(function (p) { ctx.moveTo(p.x + p.r, p.y); ctx.arc(p.x, p.y, p.r, 0, TAU); });
    ctx.fill();
  }

  function render() {
    ctx.clearRect(0, 0, W, H);
    drawDrops();
    if (playing) drawBird(state(t), t);
    else if (reduce && !played) drawBird({ x: W * 0.72, y: H * 0.36, ang: Math.PI - 0.1, pose: 0, flap: 0.4, fish: false }, 0);
  }

  function frame(ts) {
    raf = 0;
    if (!visible) return;
    var dt = Math.min(0.05, (ts - (last || ts)) / 1000);
    last = ts; clock += dt;
    if (playing) {
      var before = t;
      t += dt;
      if (before < T_SWOOP + T_STRIKE * 0.42 && t >= T_SWOOP + T_STRIKE * 0.42) {
        var st = state(t);
        splash = { x: W * (W < 700 ? 0.7 : 0.68), y: waterTop + 14 };
        if (window.BandWater) window.BandWater.splash(splash.x, splash.y + 6, 3.2);
        for (var n = 0; n < 16; n++) {
          var a = -Math.PI / 2 + (Math.random() - 0.5) * 1.6, v = 120 + Math.random() * 160;
          drops.push({ x: splash.x + (Math.random() - 0.5) * 20, y: splash.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: 1.4 + Math.random() * 1.8 });
        }
      }
      if (t > T_ALL) { playing = false; played = true; }
    }
    drops = drops.filter(function (p) {
      p.vy += 520 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      return p.y < waterTop + 20;
    });
    render();
    if (playing || drops.length) raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf && visible) { last = 0; raf = requestAnimationFrame(frame); } }

  function play() { t = 0; playing = true; drops = []; kick(); }

  section.addEventListener("click", function (e) { if (!e.target.closest("a")) play(); });
  section.style.cursor = "pointer";
  if (replay) replay.addEventListener("click", function (e) { e.stopPropagation(); play(); });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (es) {
      visible = es[0].isIntersecting && !document.hidden;
      if (visible && !played && !playing && !reduce && es[0].intersectionRatio > 0.45) play();
      kick();
    }, { threshold: [0, 0.45] }).observe(section);
  } else { visible = true; }
  document.addEventListener("visibilitychange", function () { visible = !document.hidden; kick(); });
  var rt = 0;
  window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () { if (size()) render(); }, 120); });

  if (size()) render();
  kick();

  window.HeronArt = { play: play };
})();
