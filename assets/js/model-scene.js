/* ============================================================
   model-scene.js — the portfolio's main 3D object.

   Loads assets/models/3d_model.optimized.glb and animates it in
   response to the user's scroll progress through the horizontal
   experience (see assets/js/scroll-controller.js, which
   dispatches the `horizontal:progress` event this file listens
   for). On top of scroll-driven rotation/position, the model has
   a constant, very subtle "alive" idle motion (gentle float +
   breathing scale) so it never looks like a static prop or a
   robotically-spinning object — this idle layer runs continuously
   and is what the model settles into whenever scrolling pauses.

   This is the ONLY file that touches the 3D model — replace the
   asset, change its size/position, or tune rotation/position/idle
   values all from the clearly-marked constants below.
============================================================ */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ============================================================
// 1. REPLACE THE MODEL HERE
// ============================================================
// Original upload was 69 MB (1.2M verts, two 8192×8192 textures).
// This optimized copy — Draco-compressed geometry + resized/WebP
// textures — is 2.98 MB. To swap in a different model later, drop
// the new .glb in assets/models/ and update this path. If it's a
// large export, optimize it first, e.g.:
//   npx @gltf-transform/cli optimize input.glb output.glb --compress draco --texture-compress webp
const MODEL_URL = "assets/models/3d_model.optimized.glb";

// ============================================================
// 5. CHANGE MODEL SIZE / POSITION HERE
// ============================================================
const MODEL_SCALE = 1.0; // multiply to make the model bigger/smaller
const CAMERA_DISTANCE_FACTOR = 2.4; // higher = camera further away (model looks smaller)

// ============================================================
// 4. CHANGE ROTATION VALUES HERE
// ============================================================
// One {x,y,z} entry per panel, in radians, in the SAME ORDER as
// the .h-panel elements in index.html (intro, about, skills,
// journey, projects, contact). The model smoothly interpolates
// BETWEEN these as the user scrolls — it never jumps or spins
// freely, only ever eases toward whichever angle the current
// scroll position calls for.
const ROTATION_KEYFRAMES = [
  { x: 0.05, y: 0.3, z: 0 }, // 0 — intro: near-front angle
  { x: 0.15, y: 1.1, z: 0.04 }, // 1 — about
  { x: -0.08, y: 2.0, z: -0.05 }, // 2 — skills
  { x: 0.18, y: 2.9, z: 0.06 }, // 3 — journey
  { x: -0.12, y: 3.8, z: -0.04 }, // 4 — projects
  { x: 0, y: 4.6, z: 0 }, // 5 — contact: final angle
];

// Subtle per-panel position drift (world units) — this is the
// "parallax" layer: small enough to read as considered movement,
// not so large it ever looks like the model is wandering off.
// Same order/length as ROTATION_KEYFRAMES.
const POSITION_KEYFRAMES = [
  { x: 0, y: 0 },
  { x: -0.12, y: 0.05 },
  { x: 0.1, y: -0.08 },
  { x: -0.08, y: 0.1 },
  { x: 0.12, y: -0.05 },
  { x: 0, y: 0 },
];

// how quickly the model "catches up" to its target rotation/position
// each frame — lower = smoother/laggier, higher = snappier/more direct
const ROTATION_EASE = 0.055;
const POSITION_EASE = 0.05;

// ---------------- idle "alive" motion (always running) ----------------
// TUNE HERE: gentle float + breathing scale. Kept deliberately small —
// this should read as "the model is alive", not as a bounce animation.
const FLOAT_AMPLITUDE = 0.06; // world units of vertical bob
const FLOAT_SPEED = 0.6; // radians/sec
const BREATH_AMPLITUDE = 0.015; // ±1.5% scale
const BREATH_SPEED = 0.8; // radians/sec

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function initModelScene() {
  const canvas = document.getElementById("model-canvas");
  const stage = document.querySelector(".model-stage");
  if (!canvas || !stage) return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  function sizeToStage() {
    const w = stage.clientWidth || 1;
    const h = stage.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  // ============================================================
  // premium lighting — soft key + fill + rim, plus a cheap fake
  // "contact shadow" (a soft radial-gradient plane) instead of a
  // real shadow map, for performance
  // ============================================================
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(3, 4, 5);
  scene.add(key);
  const fill = new THREE.PointLight(0x4c7eff, 3.5, 20);
  fill.position.set(-4, -1, 3);
  scene.add(fill);
  const rim = new THREE.PointLight(0x9b6bff, 4, 20);
  rim.position.set(2, -2, -4);
  scene.add(rim);

  function makeShadowTexture() {
    const size = 256;
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const ctx = c.getContext("2d");
    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, "rgba(0,0,0,0.35)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(c);
  }
  const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 2.4),
    new THREE.MeshBasicMaterial({ map: makeShadowTexture(), transparent: true, depthWrite: false })
  );
  shadowPlane.rotation.x = -Math.PI / 2;
  scene.add(shadowPlane);

  // ============================================================
  // 2. WHERE THE GLB MODEL IS LOADED
  // ============================================================
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath("https://unpkg.com/three@0.160.0/examples/jsm/libs/draco/");
  const loader = new GLTFLoader();
  loader.setDRACOLoader(dracoLoader);

  let model = null;
  let modelReady = false;
  let modelRadius = 1;

  loader.load(
    MODEL_URL,
    (gltf) => {
      const loaded = gltf.scene;

      // auto-center + auto-frame regardless of the source file's
      // original pivot/scale, so proportions are preserved but the
      // model always sits centered in view
      const box = new THREE.Box3().setFromObject(loaded);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const radius = Math.max(size.x, size.y, size.z) * 0.5 || 1;
      modelRadius = radius;

      loaded.position.sub(center); // center at origin

      const wrapper = new THREE.Group();
      wrapper.add(loaded);
      scene.add(wrapper);
      model = wrapper; // rotate/position/scale the wrapper, not the raw scene node

      camera.position.set(0, 0, radius * CAMERA_DISTANCE_FACTOR);
      camera.lookAt(0, 0, 0);

      shadowPlane.position.y = -radius * 0.62;
      shadowPlane.scale.setScalar(radius);

      modelReady = true;
      stage.classList.add("model-loaded");
    },
    undefined,
    (err) => {
      console.warn("[model-scene.js] Failed to load 3D model:", err);
      stage.style.display = "none"; // fail gracefully — page still works without it
    }
  );

  // ============================================================
  // 3. WHERE SCROLL PROGRESS IS CONVERTED INTO ROTATION + POSITION
  // ============================================================
  const currentRot = { x: 0, y: 0, z: 0 };
  const targetRot = { x: ROTATION_KEYFRAMES[0].x, y: ROTATION_KEYFRAMES[0].y, z: ROTATION_KEYFRAMES[0].z };
  const currentPos = { x: POSITION_KEYFRAMES[0].x, y: POSITION_KEYFRAMES[0].y };
  const targetPos = { x: POSITION_KEYFRAMES[0].x, y: POSITION_KEYFRAMES[0].y };

  function updateTargetsFromProgress(continuous) {
    const count = ROTATION_KEYFRAMES.length;
    const clamped = Math.max(0, Math.min(count - 1, continuous));
    const i0 = Math.floor(clamped);
    const i1 = Math.min(i0 + 1, count - 1);
    const t = clamped - i0;

    const ra = ROTATION_KEYFRAMES[i0];
    const rb = ROTATION_KEYFRAMES[i1];
    targetRot.x = lerp(ra.x, rb.x, t);
    targetRot.y = lerp(ra.y, rb.y, t);
    targetRot.z = lerp(ra.z, rb.z, t);

    const pa = POSITION_KEYFRAMES[i0];
    const pb = POSITION_KEYFRAMES[i1];
    targetPos.x = lerp(pa.x, pb.x, t);
    targetPos.y = lerp(pa.y, pb.y, t);
  }

  window.addEventListener("horizontal:progress", (e) => {
    updateTargetsFromProgress(e.detail.continuous);
  });

  // ============================================================
  // Render loop — paused entirely when the horizontal section
  // isn't on screen (satisfies "render only when needed")
  // ============================================================
  let rafId = null;
  let running = false;
  const clock = new THREE.Clock();

  function frame() {
    const t = clock.getElapsedTime();

    if (modelReady && model) {
      if (reduceMotion) {
        // no easing, no idle float/breathe — just the plain target pose
        model.rotation.set(targetRot.x, targetRot.y, targetRot.z);
        model.position.set(targetPos.x, targetPos.y, 0);
        model.scale.setScalar(MODEL_SCALE);
      } else {
        // scroll-driven rotation — eases toward whichever panel angle is current
        currentRot.x = lerp(currentRot.x, targetRot.x, ROTATION_EASE);
        currentRot.y = lerp(currentRot.y, targetRot.y, ROTATION_EASE);
        currentRot.z = lerp(currentRot.z, targetRot.z, ROTATION_EASE);
        model.rotation.set(currentRot.x, currentRot.y, currentRot.z);

        // scroll-driven parallax position, eased the same way
        currentPos.x = lerp(currentPos.x, targetPos.x, POSITION_EASE);
        currentPos.y = lerp(currentPos.y, targetPos.y, POSITION_EASE);

        // idle "alive" layer — a gentle float + breathing scale that
        // never stops, so the model settles into this the instant
        // scrolling pauses (no separate idle/active state needed)
        const floatOffset = Math.sin(t * FLOAT_SPEED) * FLOAT_AMPLITUDE * modelRadius;
        const breathScale = 1 + Math.sin(t * BREATH_SPEED) * BREATH_AMPLITUDE;

        model.position.set(currentPos.x * modelRadius, currentPos.y * modelRadius + floatOffset, 0);
        model.scale.setScalar(MODEL_SCALE * breathScale);
      }
    }
    renderer.render(scene, camera);
    rafId = requestAnimationFrame(frame);
  }

  function start() {
    if (running) return;
    running = true;
    sizeToStage();
    frame();
  }
  function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  }

  // ============================================================
  // Visibility: fade in/out (opacity + scale + position, via CSS
  // on .model-stage — see style.css) as the horizontal section
  // enters/leaves view, and pause/resume the render loop with it.
  // ============================================================
  const pinWrap = document.querySelector(".horizontal-pin");
  if (pinWrap && "IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          stage.classList.toggle("visible", entry.isIntersecting);
          if (entry.isIntersecting) start();
          else stop();
        });
      },
      { threshold: 0.01 }
    );
    io.observe(pinWrap);
  } else {
    stage.classList.add("visible");
    start();
  }

  window.addEventListener("resize", sizeToStage);
}

try {
  initModelScene();
} catch (err) {
  console.warn("[model-scene.js] 3D model scene disabled:", err);
  const stage = document.querySelector(".model-stage");
  if (stage) stage.style.display = "none";
}