/* ============================================================
   horizontal-scroll.js — performs the actual horizontal slide
   whenever scroll-controller.js requests a panel change. This
   file doesn't decide WHEN to move (that's scroll-controller.js's
   job) — it only knows HOW to move.

   Reports back with `horizontal:transitionend` when the slide
   finishes, which is what re-enables input in scroll-controller.js.
============================================================ */
(function () {
  "use strict";

  const track = document.querySelector(".horizontal-track");
  const panels = Array.from(document.querySelectorAll(".h-panel"));
  if (!track || !panels.length) return;

  const reduceMotion = window.SITE && window.SITE.reduceMotion;
  if (reduceMotion) return; // panels stack normally — nothing to slide

  function xFor(index) {
    return -index * window.innerWidth;
  }

  window.addEventListener("horizontal:panelchange", (e) => {
    const { index, direction } = e.detail;

    if (window.gsap) {
      gsap.to(track, {
        x: xFor(index),
        duration: 0.9,
        ease: "power3.inOut",
        onComplete: () => window.dispatchEvent(new CustomEvent("horizontal:transitionend")),
      });
    } else {
      track.style.transform = `translate3d(${xFor(index)}px,0,0)`;
      window.dispatchEvent(new CustomEvent("horizontal:transitionend"));
    }

    panels.forEach((p, i) => p.classList.toggle("is-active", i === index));

    // land the incoming panel's text at its top (scrolling forward) or
    // bottom (scrolling backward), so continued scrolling reads naturally
    const enteringCopy = panels[index].querySelector(".panel-copy");
    if (enteringCopy) {
      enteringCopy.scrollTop =
        direction === "forward" ? 0 : Math.max(0, enteringCopy.scrollHeight - enteringCopy.clientHeight);
    }
  });

  // keep the active panel correctly positioned through resizes/rotation
  window.addEventListener("resize", () => {
    const activeEl = document.querySelector(".h-panel.is-active") || panels[0];
    const index = panels.indexOf(activeEl);
    const x = xFor(Math.max(0, index));
    if (window.gsap) gsap.set(track, { x });
    else track.style.transform = `translate3d(${x}px,0,0)`;
  });
})();