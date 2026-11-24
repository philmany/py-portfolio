/*
  Pause motion, site-wide (WCAG 2.2.2). Loaded in <head> so the state applies before first paint.
  Any button with [data-motion-toggle] toggles it; aria-pressed="true" means paused.
  The choice is remembered across pages. Reduce Motion starts paused unless the visitor chose otherwise.
  Scripts read Motion.paused() and subscribe with Motion.on(fn).
*/
(function () {
  "use strict";
  var KEY = "motion", root = document.documentElement, subs = [];
  var stored = null;
  try { stored = localStorage.getItem(KEY); } catch (e) {}
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var paused = stored ? stored === "paused" : !!reduce;

  function sync() {
    root.classList.toggle("motion-paused", paused);
    Array.prototype.forEach.call(document.querySelectorAll("[data-motion-toggle]"), function (b) {
      b.setAttribute("aria-pressed", String(paused));
    });
  }
  function set(p) {
    paused = !!p;
    try { localStorage.setItem(KEY, paused ? "paused" : "playing"); } catch (e) {}
    sync();
    subs.forEach(function (fn) { fn(paused); });
  }

  window.Motion = {
    paused: function () { return paused; },
    set: set,
    on: function (fn) { subs.push(fn); fn(paused); }
  };

  root.classList.toggle("motion-paused", paused);
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-motion-toggle]");
    if (b) set(!paused);
  });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", sync); else sync();
})();
