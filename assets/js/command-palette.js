/* ============================================================
   command-palette.js — Ctrl/Cmd+K command palette for quick
   navigation, plus a hidden Konami-code easter egg.
============================================================ */
(function () {
  "use strict";

  /* ---------------- Command palette ---------------- */
  const ITEMS = [
    { label: "Home", hint: "hero", target: "#top" },
    { label: "3D Intro", hint: "the object", panel: "intro" },
    { label: "About", hint: "story", panel: "about" },
    { label: "Skills", hint: "stack", panel: "skills" },
    { label: "Learning Journey", hint: "timeline", panel: "journey" },
    { label: "Projects", hint: "work", panel: "projects" },
    { label: "Contact", hint: "say hi", panel: "contact" },
    {
      label: "Toggle Music",
      hint: "ambient",
      action: () => document.getElementById("music-toggle-btn")?.click(),
    },
    { label: "GitHub", hint: "external", href: "https://github.com/shafeyy" },
    { label: "Email", hint: "mailto", href: "mailto:shafey8124@gmail.com" },
  ];

  const palette = document.querySelector(".cmdk");
  if (!palette) return;
  const input = palette.querySelector(".cmdk-input");
  const list = palette.querySelector(".cmdk-list");
  let activeIndex = 0;
  let filtered = ITEMS.slice();

  function render() {
    list.innerHTML = "";
    filtered.forEach((item, i) => {
      const el = document.createElement("div");
      el.className = "cmdk-item" + (i === activeIndex ? " active" : "");
      el.innerHTML = `<span>${item.label}</span><small>${item.hint}</small>`;
      el.addEventListener("click", () => runItem(item));
      list.appendChild(el);
    });
  }

  function runItem(item) {
    close();
    if (item.href) {
      window.open(
        item.href,
        item.href.startsWith("mailto") ? "_self" : "_blank",
      );
      return;
    }
    if (item.action) {
      item.action();
      return;
    }
    if (item.panel && typeof window.__scrollToPanel === "function") {
      window.__scrollToPanel(item.panel);
      return;
    }
    if (item.target === "#top") {
      // same fixed-header caveat as core.js's initAnchorNav — see there for details
      if (window.__lenis) window.__lenis.scrollTo(0);
      else window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (item.target) {
      const el = document.querySelector(item.target);
      if (el) {
        if (window.__lenis) window.__lenis.scrollTo(el, { offset: -20 });
        else el.scrollIntoView({ behavior: "smooth" });
      }
    }
  }

  function open() {
    palette.classList.add("open");
    input.value = "";
    activeIndex = 0;
    filtered = ITEMS.slice();
    render();
    setTimeout(() => input.focus(), 50);
  }

  function close() {
    palette.classList.remove("open");
  }

  input.addEventListener("input", () => {
    const q = input.value.toLowerCase();
    filtered = ITEMS.filter((item) => item.label.toLowerCase().includes(q));
    activeIndex = 0;
    render();
  });

  const searchTrigger = document.getElementById("navSearchTrigger");
  if (searchTrigger) searchTrigger.addEventListener("click", open);

  window.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      palette.classList.contains("open") ? close() : open();
    }
    if (!palette.classList.contains("open")) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowDown") {
      e.preventDefault();
      activeIndex = Math.min(activeIndex + 1, filtered.length - 1);
      render();
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
      render();
    }
    if (e.key === "Enter" && filtered[activeIndex]) {
      runItem(filtered[activeIndex]);
    }
  });

  palette.addEventListener("click", (e) => {
    if (e.target === palette) close();
  });

  /* ---------------- Hidden Konami-code easter egg ---------------- */
  const KONAMI = [
    "ArrowUp",
    "ArrowUp",
    "ArrowDown",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "ArrowLeft",
    "ArrowRight",
    "b",
    "a",
  ];
  let buffer = [];

  window.addEventListener("keydown", (e) => {
    buffer.push(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    buffer = buffer.slice(-KONAMI.length);
    if (buffer.join(",") === KONAMI.join(",")) triggerEasterEgg();
  });

  function triggerEasterEgg() {
    showToast("🎉 Secret unlocked — thanks for exploring!");
    if (typeof window.__triggerEasterEgg3D === "function") {
      window.__triggerEasterEgg3D();
    } else {
      // webgl.js didn't load (no WebGL support, or import maps unsupported) — fall back to a 2D burst
      burstParticles2D();
    }
  }

  function showToast(text) {
    let toast = document.querySelector(".egg-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "egg-toast";
      document.body.appendChild(toast);
    }
    toast.textContent = text;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 3200);
  }

  function burstParticles2D() {
    if (window.SITE && window.SITE.reduceMotion) return;
    const colors = ["#4C7EFF", "#9B6BFF", "#6FE7DD", "#F5F6FA"];
    for (let i = 0; i < 40; i++) {
      const p = document.createElement("div");
      const size = Math.random() * 8 + 4;
      p.style.cssText = `
        position:fixed; z-index:950; left:50vw; top:50vh; pointer-events:none;
        width:${size}px; height:${size}px; border-radius:50%;
        background:${colors[i % colors.length]};
      `;
      document.body.appendChild(p);
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * 260 + 80;
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance;
      p.animate(
        [
          { transform: "translate(0,0) scale(1)", opacity: 1 },
          { transform: `translate(${dx}px, ${dy}px) scale(0)`, opacity: 0 },
        ],
        {
          duration: 900 + Math.random() * 500,
          easing: "cubic-bezier(.16,.84,.44,1)",
        },
      ).onfinish = () => p.remove();
    }
  }
})();
