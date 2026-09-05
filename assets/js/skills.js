/* ============================================================
   skills.js — animates skill progress bars to their target
   width whenever the Skills panel becomes the active panel in
   the horizontal experience (see horizontal-scroll.js, which
   dispatches activeIndex via the `horizontal:progress` event).
============================================================ */
(function () {
  "use strict";
  const reduceMotion = window.SITE && window.SITE.reduceMotion;
  const bars = document.querySelectorAll(".skill-bar-fill");
  if (!bars.length) return;

  if (reduceMotion) {
    bars.forEach((bar) => (bar.style.width = bar.dataset.level + "%"));
    return;
  }

  const panels = Array.from(document.querySelectorAll(".h-panel"));
  const skillsIndex = panels.findIndex((p) => p.dataset.panel === "skills");
  if (skillsIndex < 0) return;

  let filled = false;
  let emptied = true;

  window.addEventListener("horizontal:progress", (e) => {
    const isActive = e.detail.activeIndex === skillsIndex;

    if (isActive && !filled) {
      filled = true;
      emptied = false;
      bars.forEach((bar, i) => {
        setTimeout(() => (bar.style.width = bar.dataset.level + "%"), 100 + i * 30);
      });
    } else if (!isActive && filled && Math.abs(e.detail.continuous - skillsIndex) > 1.2 && !emptied) {
      // reset once the user has scrolled well past, so re-entering replays the animation
      emptied = true;
      filled = false;
      bars.forEach((bar) => (bar.style.width = "0%"));
    }
  });
})();