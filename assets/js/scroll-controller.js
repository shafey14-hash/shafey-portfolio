/* ============================================================
   scroll-controller.js — owns the actual scroll-input decision
   making for the horizontal experience:

     - While a panel's text content is taller than the screen,
       incoming scroll (wheel OR touch swipe) scrolls that panel's
       text vertically first — smoothly, with inertia, not as a
       raw 1:1 jump (see SCROLL_TWEEN_DURATION below).
     - Only once that panel's content has been fully read (top or
       bottom reached, depending on direction) does scroll switch
       to moving horizontally to the next/previous panel.
     - No native scrollbar is ever shown — panel text is scrolled
       purely via JS (see .panel-copy's `overflow-y:hidden` in
       style.css), driven entirely by mouse wheel / trackpad /
       touch.

   This file does NOT move anything on screen itself — it only
   decides what SHOULD happen and asks for it via events:
     - `horizontal:panelchange` → assets/js/horizontal-scroll.js
       actually performs the horizontal slide + resets the
       incoming panel's scroll position.
     - `horizontal:progress`    → assets/js/model-scene.js reacts
       by easing the 3D model toward that panel's rotation/position.
   horizontal-scroll.js reports back with `horizontal:transitionend`
   once its slide animation finishes, which is what unlocks input
   for the next panel change (prevents skipping multiple panels
   from one fast scroll gesture).
============================================================ */
(function () {
  "use strict";

  const reduceMotion = window.SITE && window.SITE.reduceMotion;
  const pinWrap = document.querySelector(".horizontal-pin");
  const panels = Array.from(document.querySelectorAll(".h-panel"));
  if (!pinWrap || !panels.length) return;

  const copies = panels.map((p) => p.querySelector(".panel-copy"));
  const panelCount = panels.length;

  /* ---------------- Reduced-motion fallback ----------------
     No scroll-jacking at all — panels stack vertically (CSS:
     `.reduced-horizontal` in style.css) and the browser's normal
     scroll handles everything, including reading long text. */
  if (reduceMotion) {
    document.body.classList.add("reduced-horizontal");
    return;
  }

  let activeIndex = 0;
  let transitioning = false; // true while a panel-to-panel slide is animating
  let locked = false; // true while this section fills the viewport and is capturing scroll

  // ---------------- TUNE HERE: internal text-scroll inertia ----------------
  // scrollTargets tracks where each panel's text SHOULD end up, independent
  // of the live (mid-tween) DOM scrollTop — this is what avoids the scroll
  // feeling "stuttery": every wheel tick nudges a target, and a single GSAP
  // tween eases smoothly toward it (rapid ticks just move the target further,
  // the tween keeps gliding rather than snapping event-by-event).
  const scrollTargets = copies.map(() => 0);
  const SCROLL_TWEEN_DURATION = 0.45; // seconds — higher = floatier/more inertia
  const SCROLL_TWEEN_EASE = "power2.out";

  function maxScrollFor(copy) {
    return copy ? Math.max(0, copy.scrollHeight - copy.clientHeight) : 0;
  }

  function dispatchProgress() {
    const progress = panelCount > 1 ? activeIndex / (panelCount - 1) : 0;
    window.dispatchEvent(
      new CustomEvent("horizontal:progress", {
        detail: { progress, continuous: activeIndex, activeIndex, panelCount },
      }),
    );
  }

  function requestPanel(newIndex, direction) {
    transitioning = true;
    activeIndex = newIndex;
    window.dispatchEvent(
      new CustomEvent("horizontal:panelchange", {
        detail: { index: newIndex, direction, panelCount },
      }),
    );
    dispatchProgress();
  }

  window.addEventListener("horizontal:transitionend", () => {
    transitioning = false;
  });

  // horizontal-scroll.js resets the incoming panel's scrollTop directly
  // when a panel change completes — mirror that here so our logical
  // scrollTargets[] stays in sync with the real DOM value.
  window.addEventListener("horizontal:panelchange", (e) => {
    const { index, direction } = e.detail;
    const copy = copies[index];
    if (!copy) return;
    scrollTargets[index] = direction === "forward" ? 0 : maxScrollFor(copy);
  });

  // ---------------- TUNE HERE: how "used up" a panel's scroll
  // must be before we hand off to the next one (pixels) ----------------
  const SCROLL_EPSILON = 2;

  function shouldCapture(dir) {
    const copy = copies[activeIndex];
    if (!copy) return dir > 0 ? activeIndex < panelCount - 1 : activeIndex > 0;
    const target = scrollTargets[activeIndex];
    if (dir > 0) {
      const roomBelow = maxScrollFor(copy) - target;
      return roomBelow > SCROLL_EPSILON || activeIndex < panelCount - 1;
    }
    return target > SCROLL_EPSILON || activeIndex > 0;
  }

  function handleDelta(dir, magnitude) {
    const copy = copies[activeIndex];
    if (copy) {
      const max = maxScrollFor(copy);
      const target = scrollTargets[activeIndex];
      if (dir > 0 && max - target > SCROLL_EPSILON) {
        scrollTargets[activeIndex] = Math.min(max, target + magnitude);
        gsap.to(copy, {
          scrollTop: scrollTargets[activeIndex],
          duration: SCROLL_TWEEN_DURATION,
          ease: SCROLL_TWEEN_EASE,
          overwrite: true,
        });
        return;
      }
      if (dir < 0 && target > SCROLL_EPSILON) {
        scrollTargets[activeIndex] = Math.max(0, target + magnitude); // magnitude is negative when scrolling up
        gsap.to(copy, {
          scrollTop: scrollTargets[activeIndex],
          duration: SCROLL_TWEEN_DURATION,
          ease: SCROLL_TWEEN_EASE,
          overwrite: true,
        });
        return;
      }
    }
    // this panel's text is fully read in this direction — move to the next/previous panel
    if (dir > 0 && activeIndex < panelCount - 1)
      requestPanel(activeIndex + 1, "forward");
    else if (dir < 0 && activeIndex > 0)
      requestPanel(activeIndex - 1, "backward");
  }

  /* ---------------- Lock state: only capture scroll while this
     section actually fills the viewport ---------------- */
  function setLocked(value) {
    if (value === locked) return;
    locked = value;
    if (value) {
      // snap the section into exact alignment so it doesn't freeze
      // wherever the 65%-visible threshold happened to catch it
      if (window.__lenis)
        window.__lenis.scrollTo(pinWrap, { offset: 0, duration: 0.5 });
      else pinWrap.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => setLocked(entry.intersectionRatio > 0.65)),
    { threshold: [0, 0.65, 1] },
  );
  io.observe(pinWrap);

  /* ---------------- Mouse wheel / trackpad ----------------
     Registered on the CAPTURE phase so it runs BEFORE Lenis's own
     wheel listener (Lenis listens on `window` in the bubble phase —
     verified against its source). When we consume an event we also
     stopPropagation() so Lenis never sees it and can't smooth-scroll
     the page underneath us. When we DON'T consume it (exiting the
     section, or not locked at all), we do nothing and the event
     continues on to Lenis exactly as if we weren't here. This is
     safer than lenis.stop()/start(): Lenis calls preventDefault()
     on every wheel event while stopped, which would have silently
     swallowed the "let the page scroll normally" case below. */
  window.addEventListener(
    "wheel",
    (e) => {
      if (!locked) return;
      if (transitioning) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      const delta =
        Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      const dir = delta > 0 ? 1 : -1;
      if (!shouldCapture(dir)) return; // let it fall through to Lenis → page scrolls into Hero/Footer
      e.preventDefault();
      e.stopPropagation();
      handleDelta(dir, Math.max(1, Math.abs(delta)));
    },
    { capture: true, passive: false },
  );

  /* ---------------- Touch swipe (mobile/tablet) ---------------- */
  let touchLastY = 0;
  window.addEventListener(
    "touchstart",
    (e) => (touchLastY = e.touches[0].clientY),
    { capture: true, passive: true },
  );
  window.addEventListener(
    "touchmove",
    (e) => {
      if (!locked) return;
      const y = e.touches[0].clientY;
      const deltaY = touchLastY - y; // swiping up (content moves up) == scrolling forward
      touchLastY = y;
      if (transitioning) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (deltaY === 0) return;
      const dir = deltaY > 0 ? 1 : -1;
      if (!shouldCapture(dir)) return;
      e.preventDefault();
      e.stopPropagation();
      handleDelta(dir, deltaY * 1.8); // touch deltas are small per-event; scale up to feel natural
    },
    { capture: true, passive: false },
  );

  /* ---------------- Jump-to-panel (nav + command palette) ---------------- */
  window.__scrollToPanel = function (idOrIndex) {
    let index = -1;
    if (typeof idOrIndex === "number") index = idOrIndex;
    else
      index = panels.findIndex(
        (p) => p.id === idOrIndex || p.dataset.panel === idOrIndex,
      );
    if (index < 0 || index >= panelCount) return;

    if (window.__lenis) window.__lenis.scrollTo(pinWrap, { immediate: false });
    else pinWrap.scrollIntoView({ behavior: "smooth", block: "start" });

    setTimeout(() => {
      requestPanel(index, index > activeIndex ? "forward" : "backward");
    }, 500); // let the section finish scrolling into view before jumping panels
  };

  panels[0].classList.add("is-active");
})();
