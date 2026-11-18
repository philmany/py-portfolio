/*
  Lake sound, made in the browser with Web Audio. No audio files.

  - Surf: brown noise through a low-pass filter whose cutoff and level rise and
    fall in slow, irregular swells, so each wave rolls in and draws back.
  - Wash: a faint, low band of filtered noise for small waves (kept soft, so it reads as water, not wind).
  - Lap: now and then a short, soft low thump, like water against a hull.
  - Starts muted (browsers only allow sound after a click). The speaker button
    turns it on and off; it fades in and out, and goes quiet when the tab is hidden.
*/
(function () {
  "use strict";
  var btn = document.getElementById("sound");
  if (!btn) return;
  var AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) { btn.hidden = true; return; }

  var ac = null, master = null, on = false, timer = 0;

  function noiseBuffer(seconds, brown) {
    var len = Math.floor(ac.sampleRate * seconds), buf = ac.createBuffer(2, len, ac.sampleRate);
    for (var ch = 0; ch < 2; ch++) {
      var d = buf.getChannelData(ch), last = 0;
      for (var i = 0; i < len; i++) {
        var w = Math.random() * 2 - 1;
        if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w;
      }
    }
    return buf;
  }

  function build() {
    ac = new AC();
    master = ac.createGain(); master.gain.value = 0; master.connect(ac.destination);

    // surf
    var surf = ac.createBufferSource(); surf.buffer = noiseBuffer(8, true); surf.loop = true;
    var surfLP = ac.createBiquadFilter(); surfLP.type = "lowpass"; surfLP.frequency.value = 320; surfLP.Q.value = 0.3;
    var surfG = ac.createGain(); surfG.gain.value = 0.5;
    surf.connect(surfLP).connect(surfG).connect(master); surf.start();

    // wash
    var wash = ac.createBufferSource(); wash.buffer = noiseBuffer(6, false); wash.loop = true;
    var washBP = ac.createBiquadFilter(); washBP.type = "bandpass"; washBP.frequency.value = 700; washBP.Q.value = 0.9;
    var washG = ac.createGain(); washG.gain.value = 0.012;
    wash.connect(washBP).connect(washG).connect(master); wash.start();

    // irregular swells: each wave builds, peaks, and draws back
    function swell() {
      var now = ac.currentTime, len = 3.2 + Math.random() * 3.4, peak = 0.55 + Math.random() * 0.45;
      surfG.gain.cancelScheduledValues(now);
      surfG.gain.setTargetAtTime(peak, now, len * 0.22);
      surfG.gain.setTargetAtTime(0.28, now + len * 0.55, len * 0.25);
      surfLP.frequency.cancelScheduledValues(now);
      surfLP.frequency.setTargetAtTime(380 + peak * 420, now, len * 0.25);
      surfLP.frequency.setTargetAtTime(280, now + len * 0.5, len * 0.3);
      washG.gain.setTargetAtTime(0.012 + peak * 0.025, now + len * 0.35, len * 0.25);
      washG.gain.setTargetAtTime(0.01, now + len * 0.65, len * 0.3);
      lap(now + len * (0.25 + Math.random() * 0.2));
      if (Math.random() < 0.6) lap(now + len * (0.55 + Math.random() * 0.3));
      timer = setTimeout(swell, len * 1000 * 0.82);
    }
    function lap(at) {
      var o = ac.createOscillator(), g = ac.createGain(), f = ac.createBiquadFilter();
      o.type = "sine"; o.frequency.setValueAtTime(70 + Math.random() * 30, at);
      o.frequency.exponentialRampToValueAtTime(45, at + 0.35);
      f.type = "lowpass"; f.frequency.value = 200;
      g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(0.16, at + 0.05); g.gain.exponentialRampToValueAtTime(0.001, at + 0.7);
      o.connect(f).connect(g).connect(master); o.start(at); o.stop(at + 0.6);
    }
    swell();
  }

  function set(next) {
    on = next;
    btn.setAttribute("aria-pressed", String(on));
    btn.setAttribute("aria-label", on ? "Mute the sound of the waves" : "Play the sound of the waves");
    if (on) {
      if (!ac) build();
      ac.resume();
      master.gain.setTargetAtTime(0.375, ac.currentTime, 0.6);   // 75% of the earlier level
    } else if (ac) {
      master.gain.setTargetAtTime(0, ac.currentTime, 0.3);
    }
  }

  btn.addEventListener("click", function () { set(!on); });
  document.addEventListener("visibilitychange", function () {
    if (!ac) return;
    if (document.hidden) ac.suspend(); else if (on) ac.resume();
  });
})();
