/* ============================================================
   tilt.js — subtle 3D mouse-tilt for the mini project cards.
============================================================ */
(function () {
  "use strict";
  if (window.SITE && window.SITE.reduceMotion) return;

  document.querySelectorAll(".mini-project").forEach((card) => {
    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      const rotateX = (0.5 - py) * 6;
      const rotateY = (px - 0.5) * 6;
      card.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
    });
    card.addEventListener("mouseleave", () => {
      card.style.transform = "perspective(900px) rotateX(0) rotateY(0) translateY(0)";
    });
  });
})();