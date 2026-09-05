/* ============================================================
   horizontal-scroll.js — listens for the `horizontal:progress`
   event from scroll-controller.js and does one thing:
     1. Toggles `.is-active` on whichever .h-panel is currently
        centered, which drives the CSS stagger-reveal for that
        panel's `.reveal-item` children and (re)triggers the
        skill-bar fill animation (see assets/js/skills.js).
   (Horizontal track movement is now handled directly by the GSAP
   Timeline in scroll-controller.js to support interleaved vertical text scrolling).
============================================================ */
(function () {
  "use strict";

  const panels = Array.from(document.querySelectorAll(".h-panel"));
  if (!panels.length) return;

  let lastActiveIndex = -1;

  window.addEventListener("horizontal:progress", (e) => {
    const { activeIndex } = e.detail;

    // panel activation (drives .reveal-item stagger + skill bars)
    if (activeIndex !== lastActiveIndex) {
      panels.forEach((p, i) =>
        p.classList.toggle("is-active", i === activeIndex),
      );
      lastActiveIndex = activeIndex;
    }
  });

  // activate the first panel immediately (progress event won't fire
  // until the user actually scrolls, so panel 0 needs a manual kick)
  panels[0].classList.add("is-active");
})();
