/*
  Lake sound: slow waves lapping on a beach. Made in the browser with Web Audio,
  no audio files.

  - Bed: a very quiet, deep rumble of brown noise (far-off water), well below
    the waves so there is no constant hiss.
  - Each wave, every 7 to 10 seconds: a low swell rises, then the lap itself,
    a soft burst of water whose brightness falls quickly as it spreads up the
    sand, then a gentle draw-back that fades away.
  - Starts muted (browsers only allow sound after a click). The speaker button
    turns it on and off; it fades in and out, and goes quiet when the tab is hidden.
*/
(function () {
  "use strict";
  var btn = document.getElementById("sound");
  if (!btn) return;
  var AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) { btn.hidden = true; return; }

  var ac = null, master = null, on = false, brown = null, pink = null;
  var LEVEL = 0.375;

  function noise(seconds, kind) {
    var len = Math.floor(ac.sampleRate * seconds), buf = ac.createBuffer(2, len, ac.sampleRate);
    for (var ch = 0; ch < 2; ch++) {
      var d = buf.getChannelData(ch), last = 0, b0 = 0, b1 = 0, b2 = 0;
      for (var i = 0; i < len; i++) {
        var w = Math.random() * 2 - 1;
        if (kind === "brown") { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
        else { b0 = 0.997 * b0 + w * 0.029591; b1 = 0.985 * b1 + w * 0.032534; b2 = 0.95 * b2 + w * 0.048056; d[i] = (b0 + b1 + b2 + w * 0.05) * 1.6; }
      }
    }
    return buf;
  }

  function build() {
    ac = new AC();
    master = ac.createGain(); master.gain.value = 0; master.connect(ac.destination);
    brown = noise(10, "brown"); pink = noise(6, "pink");

    var bed = ac.createBufferSource(); bed.buffer = brown; bed.loop = true;
    var bedLP = ac.createBiquadFilter(); bedLP.type = "lowpass"; bedLP.frequency.value = 180;
    var bedG = ac.createGain(); bedG.gain.value = 0.12;
    bed.connect(bedLP).connect(bedG).connect(master); bed.start();

    function wave() {
      var t = ac.currentTime + 0.05, size = 0.7 + Math.random() * 0.3;
      var out = ac.createGain();
      if (ac.createStereoPanner) { var pan = ac.createStereoPanner(); pan.pan.value = (Math.random() - 0.5) * 0.6; out.connect(pan).connect(master); }
      else out.connect(master);

      // swell: a low rise as the wave comes in
      var sw = ac.createBufferSource(); sw.buffer = brown;
      var swLP = ac.createBiquadFilter(); swLP.type = "lowpass"; swLP.frequency.value = 220;
      var swG = ac.createGain();
      swG.gain.setValueAtTime(0, t);
      swG.gain.linearRampToValueAtTime(0.5 * size, t + 1.6);
      swG.gain.setTargetAtTime(0, t + 1.9, 0.7);
      sw.connect(swLP).connect(swG).connect(out); sw.start(t, Math.random() * 4); sw.stop(t + 6);

      // lap: water spilling onto the sand, soft and rounded, darkening as it spreads
      var lp = ac.createBufferSource(); lp.buffer = pink;
      var lpF = ac.createBiquadFilter(); lpF.type = "lowpass"; lpF.Q.value = 0.2;
      lpF.frequency.setValueAtTime(380, t + 1.4);
      lpF.frequency.linearRampToValueAtTime(950 * size, t + 1.75);
      lpF.frequency.exponentialRampToValueAtTime(260, t + 4.2);
      var lpG = ac.createGain();
      lpG.gain.setValueAtTime(0, t + 1.4);
      lpG.gain.linearRampToValueAtTime(0.42 * size, t + 1.8);
      lpG.gain.setTargetAtTime(0, t + 2.1, 0.9);
      lp.connect(lpF).connect(lpG).connect(out); lp.start(t + 1.4, Math.random() * 3); lp.stop(t + 7);

      // draw-back: a quieter, low wash pulling away
      var db = ac.createBufferSource(); db.buffer = brown;
      var dbF = ac.createBiquadFilter(); dbF.type = "bandpass"; dbF.frequency.value = 320; dbF.Q.value = 0.7;
      var dbG = ac.createGain();
      dbG.gain.setValueAtTime(0, t + 3.2);
      dbG.gain.linearRampToValueAtTime(0.22 * size, t + 3.9);
      dbG.gain.setTargetAtTime(0, t + 4.3, 0.8);
      db.connect(dbF).connect(dbG).connect(out); db.start(t + 3.2, Math.random() * 4); db.stop(t + 8);

      setTimeout(wave, (7 + Math.random() * 3) * 1000);
    }
    wave();
  }

  function set(next) {
    on = next;
    btn.setAttribute("aria-pressed", String(on));
    btn.setAttribute("aria-label", on ? "Mute the sound of the waves" : "Play the sound of the waves");
    if (on) {
      if (!ac) build();
      ac.resume();
      master.gain.setTargetAtTime(LEVEL, ac.currentTime, 0.8);
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
