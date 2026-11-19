/*
  Rolodex text, shared by every page.

  Rolodex.fill(node, text, ms) writes `text` into `node`:
    {A|B|C}  flips like a rolodex through A, B and C, one every `ms` milliseconds
    {word}   is just accented
    {year}   becomes the current year
  The words themselves live in data.js; nothing here needs editing to change them.
*/
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  // A word that flips like a rolodex through several titles.
  function roller(words, ms) {
    var box = el("span", "roll"); box.setAttribute("aria-hidden", "true");
    var sr = el("span", "sr", words.join(", "));
    var sizer = el("span", "roll-size", words[0]);
    var cur = el("span", "roll-w in", words[0]);
    box.appendChild(sizer); box.appendChild(cur);
    var i = 0;
    if (!reduce) setInterval(function () {
      if (document.hidden) return;
      i = (i + 1) % words.length;
      var next = el("span", "roll-w", words[i]);
      box.appendChild(next);
      sizer.textContent = words[i];
      cur.classList.remove("in"); cur.classList.add("out");
      var old = cur; setTimeout(function () { old.remove(); }, 700);
      requestAnimationFrame(function () { requestAnimationFrame(function () { next.classList.add("in"); }); });
      cur = next;
    }, ms || 2400);
    var wrap = el("span", "roll-wrap");
    wrap.appendChild(box); wrap.appendChild(sr);
    return wrap;
  }

  function fill(node, text, ms) {
    String(text).split(/(\{[^}]*\})/).forEach(function (part) {
      if (!part) return;
      if (part === "{year}") { node.appendChild(document.createTextNode(String(new Date().getFullYear()))); return; }
      if (part[0] !== "{") { node.appendChild(document.createTextNode(part)); return; }
      var words = part.slice(1, -1).split("|");
      node.appendChild(words.length === 1 ? el("em", null, words[0]) : roller(words, ms));
    });
  }

  window.Rolodex = { fill: fill };
})();
