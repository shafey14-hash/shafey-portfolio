/* ============================================================
   horizontal-scroll.js — listens for the `horizontal:progress`
   event from scroll-controller.js and does two things:
     1. Moves .horizontal-track sideways (the actual "horizontal
        scrolling" — no native horizontal scrollbar involved).
     2. Toggles `.is-active` on whichever .h-panel is currently
        centered, which drives the CSS stagger-reveal for that
        panel's `.reveal-item` children and (re)triggers the
        skill-bar fill animation (see assets/js/skills.js).
============================================================ */
(function () {
  "use strict";

  const track = document.querySelector(".horizontal-track");
  const panels = Array.from(document.querySelectorAll(".h-panel"));
  if (!track || !panels.length) return;

  function getMaxTranslate() {
    return Math.max(0, track.scrollWidth - window.innerWidth);
  }

  let maxTranslate = getMaxTranslate();
  window.addEventListener("resize", () => {
    maxTranslate = getMaxTranslate();
  });

  let lastActiveIndex = -1;

  window.addEventListener("horizontal:progress", (e) => {
    const { progress, activeIndex } = e.detail;

    // 1. horizontal motion — plain transform, GPU-accelerated
    const x = -progress * maxTranslate;
    if (window.gsap) {
      gsap.set(track, { x });
    } else {
      track.style.transform = `translate3d(${x}px,0,0)`;
    }

    // 2. panel activation (drives .reveal-item stagger + skill bars)
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
