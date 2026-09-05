/* ============================================================
   core.js — loader, liquid cursor, Lenis smooth scroll, scroll
   reveals, split-text reveal, magnetic buttons, anchor nav.
   Loaded on every page (single page site).
============================================================ */
(function () {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.SITE = { reduceMotion };

  /* ---------------- Lenis smooth scroll ---------------- */
  let lenis = null;
  if (!reduceMotion && window.Lenis) {
    lenis = new Lenis({ duration: 1.15, smoothWheel: true, easing: (t) => 1 - Math.pow(1 - t, 3) });
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
    window.__lenis = lenis;

    if (window.gsap && window.ScrollTrigger) {
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    }
  }

  /* ---------------- Anchor nav via Lenis (or panel jump) ---------------- */
  function initAnchorNav() {
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      a.addEventListener("click", (e) => {
        const id = a.getAttribute("href");
        if (id.length < 2) return;
        const target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();

        // sections inside the horizontal-scroll experience need special
        // handling — see assets/js/scroll-controller.js for __scrollToPanel
        if (target.classList.contains("h-panel") && typeof window.__scrollToPanel === "function") {
          window.__scrollToPanel(target.id);
          return;
        }

        if (lenis) lenis.scrollTo(target, { offset: -20 });
        else target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
      });
    });
  }

  /* ---------------- Loader ---------------- */
  function runLoader() {
    const loader = document.querySelector(".loader");
    const pctEl = document.querySelector(".loader-pct span");
    if (!loader) {
      document.body.classList.add("loaded");
      return;
    }
    if (reduceMotion) {
      loader.classList.add("hide");
      document.body.classList.add("loaded");
      setTimeout(() => loader.remove(), 400);
      return;
    }

    let progress = 0;
    const timer = setInterval(() => {
      progress = Math.min(100, progress + Math.random() * 12 + 5);
      if (pctEl) pctEl.textContent = Math.floor(progress) + "%";
      if (progress >= 100) {
        clearInterval(timer);
        setTimeout(() => {
          loader.classList.add("hide");
          document.body.classList.add("loaded");
          setTimeout(() => loader.remove(), 900);
        }, 400);
      }
    }, 130);
  }

  /* ---------------- Liquid cursor ---------------- */
  function initCursor() {
    if (window.matchMedia("(hover:none)").matches) return;
    const dot = document.querySelector(".cursor-dot");
    const ring = document.querySelector(".cursor-ring");
    const label = document.querySelector(".cursor-label");
    if (!dot || !ring) return;

    let mx = 0, my = 0, rx = 0, ry = 0;

    window.addEventListener("mousemove", (e) => {
      mx = e.clientX;
      my = e.clientY;
      dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%,-50%)`;
      if (label) label.style.transform = `translate(${mx}px, ${my}px) translate(-50%,-50%)`;
    });

    (function loop() {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%,-50%)`;
      requestAnimationFrame(loop);
    })();

    document.addEventListener("mouseover", (e) => {
      const hoverEl = e.target.closest("[data-cursor-hover]");
      if (hoverEl) {
        ring.classList.add("hover");
        const text = hoverEl.getAttribute("data-cursor-text");
        if (text && label) {
          label.textContent = text;
          label.classList.add("show");
          ring.classList.add("text-mode");
        }
      }
    });
    document.addEventListener("mouseout", (e) => {
      const hoverEl = e.target.closest("[data-cursor-hover]");
      if (hoverEl) {
        ring.classList.remove("hover", "text-mode");
        if (label) label.classList.remove("show");
      }
    });
  }

  /* ---------------- Magnetic buttons ---------------- */
  function initMagnetic() {
    if (reduceMotion) return;
    document.querySelectorAll(".magnetic").forEach((el) => {
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        el.style.transform = `translate(${x * 0.3}px, ${y * 0.4}px)`;
      });
      el.addEventListener("mouseleave", () => (el.style.transform = "translate(0,0)"));
    });
  }

  /* ---------------- Ripple on buttons ---------------- */
  function initRipple() {
    document.querySelectorAll(".btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const rect = btn.getBoundingClientRect();
        const ripple = document.createElement("span");
        ripple.className = "ripple";
        ripple.style.left = e.clientX - rect.left + "px";
        ripple.style.top = e.clientY - rect.top + "px";
        ripple.style.width = ripple.style.height = "14px";
        btn.appendChild(ripple);
        setTimeout(() => ripple.remove(), 750);
      });
    });
  }

  /* ---------------- Scroll reveal ---------------- */
  function initReveal() {
    const items = document.querySelectorAll(".reveal");
    if (reduceMotion) {
      items.forEach((el) => el.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, i) => {
          if (entry.isIntersecting) {
            setTimeout(() => entry.target.classList.add("in"), i * 50);
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    items.forEach((el) => io.observe(el));
  }

  /* ---------------- Split text reveal ---------------- */
  function initSplitText() {
    document.querySelectorAll("[data-split]").forEach((el) => {
      const mode = el.getAttribute("data-split");
      const text = el.textContent;
      const parts = mode === "char" ? text.split("") : text.split(" ");
      el.setAttribute("aria-label", text);
      el.innerHTML = "";
      parts.forEach((part, i) => {
        const wrap = document.createElement("span");
        wrap.className = "split-word";
        const inner = document.createElement("span");
        inner.textContent = part + (mode === "word" && i < parts.length - 1 ? "\u00A0" : "");
        inner.style.transitionDelay = `${i * 28}ms`;
        wrap.appendChild(inner);
        wrap.setAttribute("aria-hidden", "true");
        el.appendChild(wrap);
      });

      if (reduceMotion) {
        el.querySelectorAll(".split-word").forEach((w) => w.classList.add("in"));
        return;
      }
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.querySelectorAll(".split-word").forEach((w) => w.classList.add("in"));
              io.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.3 }
      );
      io.observe(el);
    });
  }

  /* ---------------- Mobile Nav Drawer ---------------- */
  function initMobileNav() {
    const toggleBtn = document.getElementById("mobile-menu-toggle");
    const overlay = document.getElementById("mobile-nav-overlay");
    const cmdTrigger = document.getElementById("mobile-cmd-trigger");
    if (!toggleBtn || !overlay) return;

    function closeNav() {
      toggleBtn.classList.remove("active");
      overlay.classList.remove("open");
      document.body.style.overflow = "";
    }

    function openNav() {
      toggleBtn.classList.add("active");
      overlay.classList.add("open");
      document.body.style.overflow = "hidden";
    }

    toggleBtn.addEventListener("click", () => {
      if (overlay.classList.contains("open")) {
        closeNav();
      } else {
        openNav();
      }
    });

    overlay.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        closeNav();
      });
    });

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeNav();
    });

    if (cmdTrigger) {
      cmdTrigger.addEventListener("click", () => {
        closeNav();
        const cmdk = document.querySelector(".cmdk");
        if (cmdk) {
          cmdk.classList.add("open");
          const input = cmdk.querySelector(".cmdk-input");
          if (input) input.focus();
        }
      });
    }

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && overlay.classList.contains("open")) {
        closeNav();
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    runLoader();
    initCursor();
    initMagnetic();
    initRipple();
    initReveal();
    initSplitText();
    initAnchorNav();
    initMobileNav();
  });
})();