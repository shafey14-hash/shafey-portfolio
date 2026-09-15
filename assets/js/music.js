/* ============================================================
   music.js — optional ambient background music.
   Muted by default, no autoplay-with-sound (browser policy +
   good UX), remembers the user's on/off preference.

   SETUP: drop a real audio file at assets/audio/ambient.mp3
   (not included). Until then this degrades gracefully — the
   toggle button still works but plays silence.
============================================================ */
(function () {
  "use strict";

  const btn = document.getElementById("music-toggle-btn");
  if (!btn) return;

  const audio = new Audio("Adventure.mp3");
  audio.loop = true;
  audio.volume = 0.9;

  const STORAGE_KEY = "shafeyy_music_on";
  let playing = false;

  function setState(on) {
    playing = on;
    btn.classList.toggle("playing", on);
    btn.setAttribute("aria-pressed", String(on));
    if (on) {
      audio.play().catch(() => {
        // file missing or blocked — fail silently, keep UI in sync
        console.warn(
          "[music.js] Couldn't play ambient track — is assets/audio/ambient.mp3 present?",
        );
      });
    } else {
      audio.pause();
    }
    localStorage.setItem(STORAGE_KEY, on ? "1" : "0");
  }

  btn.addEventListener("click", () => setState(!playing));

  // restore preference — but never autoplay with sound on load;
  // only resume if the user had explicitly enabled it before AND
  // interacts with the page first (browser autoplay policy).
  const wantedOn = localStorage.getItem(STORAGE_KEY) === "1";
  if (wantedOn) {
    const resume = () => {
      setState(true);
      window.removeEventListener("click", resume);
      window.removeEventListener("keydown", resume);
    };
    window.addEventListener("click", resume, { once: true });
    window.addEventListener("keydown", resume, { once: true });
  }
})();
