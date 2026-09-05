/* ============================================================
   scroll-controller.js — owns the GSAP ScrollTrigger pin for the
   horizontal experience. 
   
   It creates a step-by-step GSAP Timeline that interleaves:
     1. Horizontal track sliding to center a panel
     2. Vertical text scrolling inside that panel (if it overflows)
   
   It broadcasts a `horizontal:progress` event with the current
   "horizontal index" so that model-scene.js can smoothly rotate
   the 3D object only during the horizontal phases, and pause
   during the vertical reading phases.
============================================================ */
(function () {
  "use strict";
  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);

  const reduceMotion = window.SITE && window.SITE.reduceMotion;
  const pinWrap = document.querySelector(".horizontal-pin");
  const track = document.querySelector(".horizontal-track");
  const panels = gsap.utils.toArray(".h-panel");

  if (!pinWrap || !track || !panels.length) return;

  const panelCount = panels.length;

  /* ---------------- Reduced-motion fallback ----------------
     Skip the pin/scrub entirely — stack panels vertically and let
     native scroll + the site's normal reveal system handle it. */
  if (reduceMotion) {
    document.body.classList.add("reduced-horizontal");
    return;
  }

  let st;
  let tl;
  const progressObj = { continuous: 0 };

  function buildTimeline() {
    if (st) st.kill();
    if (tl) tl.kill();
    gsap.killTweensOf(track);
    gsap.killTweensOf(progressObj);
    panels.forEach((p) => gsap.killTweensOf(p.querySelector(".panel-copy")));

    gsap.set(track, { clearProps: "all" });
    panels.forEach((p) => gsap.set(p.querySelector(".panel-copy"), { clearProps: "all" }));
    progressObj.continuous = 0;

    let totalScroll = 0;
    
    // Calculate total scroll distance needed
    panels.forEach((panel, i) => {
      // Add distance for horizontal slide (except the very first panel which is already centered)
      if (i > 0) {
        totalScroll += 1800; // Slower, smoother horizontal scroll
      }
      
      const copy = panel.querySelector(".panel-copy");
      // Calculate how much the text overflows the visible reading area
      const overflow = Math.max(0, copy.scrollHeight - window.innerHeight * 0.7);
      if (overflow > 0) {
          totalScroll += overflow + 600; // Vertical text scrolling distance + some padding
      } else {
          totalScroll += 300; // Small pause even if no overflow for pacing
      }
    });

    tl = gsap.timeline({
      scrollTrigger: {
        trigger: pinWrap,
        start: "top top",
        end: () => `+=${totalScroll}`,
        pin: true,
        pinSpacing: true,
        scrub: 1.2, // very smooth/inertial feel
        invalidateOnRefresh: true,
      },
    });

    panels.forEach((panel, i) => {
      // 1. Horizontal Move to this panel
      if (i > 0) {
        const hDur = 1800;
        tl.to(track, {
          x: () => -i * window.innerWidth,
          duration: hDur,
          ease: "power2.inOut",
        }, `panel_${i}`);

        // Simultaneously animate the continuous value to broadcast for the 3D model
        tl.to(progressObj, {
          continuous: i,
          duration: hDur,
          ease: "power2.inOut",
          onUpdate: () => {
            window.dispatchEvent(
              new CustomEvent("horizontal:progress", {
                detail: {
                  continuous: progressObj.continuous,
                  activeIndex: Math.round(progressObj.continuous),
                  panelCount: panelCount
                },
              })
            );
          },
        }, `panel_${i}`);
      }

      // 2. Vertical Text Scroll within this panel
      const copy = panel.querySelector(".panel-copy");
      const overflow = Math.max(0, copy.scrollHeight - window.innerHeight * 0.7);
      
      const vDur = overflow > 0 ? overflow + 600 : 300;
      
      if (overflow > 0) {
        tl.to(copy, {
          y: () => -overflow,
          duration: vDur,
          ease: "none", // linear scroll for natural reading
        }, `text_${i}`);
      } else {
        // just a dummy tween to add time/pause
        tl.to({}, { duration: vDur }, `text_${i}`);
      }
    });

    st = tl.scrollTrigger;
  }

  // Build initially after fonts/layout settle
  setTimeout(buildTimeline, 50);

  // Rebuild on resize to recalculate scroll heights
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(buildTimeline, 200);
  });

  /* ---------------- Jump-to-panel (used by nav + command palette) ---------------- */
  window.__scrollToPanel = function (idOrIndex) {
    let index = -1;
    if (typeof idOrIndex === "number") {
      index = idOrIndex;
    } else {
      index = panels.findIndex((p) => p.id === idOrIndex || p.dataset.panel === idOrIndex);
    }
    if (index < 0 || index >= panelCount) return;

    // We want to jump to `text_${index}` so the user lands on the panel text ready to read.
    const labelTime = tl.labels[`text_${index}`] !== undefined ? tl.labels[`text_${index}`] : 0;
    const progress = labelTime / tl.totalDuration();
    const targetY = st.start + progress * (st.end - st.start);

    if (window.__lenis) window.__lenis.scrollTo(targetY);
    else window.scrollTo({ top: targetY, behavior: "smooth" });
  };
})();