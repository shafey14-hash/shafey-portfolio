/* ============================================================
   typewriter.js — rotates the hero's professional titles.
============================================================ */
(function () {
  "use strict";
  const el = document.getElementById("hero-role-text");
  if (!el) return;

  const ROLES = [
    "AI Engineer",
    "Full Stack Developer",
    "Creative Developer",
    "Automation Enthusiast",
  ];
  const reduceMotion = window.SITE && window.SITE.reduceMotion;

  if (reduceMotion) {
    el.textContent = ROLES[0];
    return;
  }

  let r = 0,
    c = 0,
    deleting = false;
  (function tick() {
    const word = ROLES[r];
    el.textContent = deleting ? word.slice(0, c--) : word.slice(0, c++);
    let delay = deleting ? 35 : 70;
    if (!deleting && c === word.length + 1) {
      delay = 1500;
      deleting = true;
    }
    if (deleting && c === 0) {
      deleting = false;
      r = (r + 1) % ROLES.length;
      delay = 300;
    }
    setTimeout(tick, delay);
  })();
})();
