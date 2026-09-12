/* ============================================================
   webgl.js — Three.js scenes (ES module, loaded via
   <script type="module">, uses an importmap for "three" and
   "three/addons/"). Handles:
     1. Loader background — animated GLSL noise shader
     2. Hero scene — glass sphere + wireframe icosahedron +
        particle field + soft bloom + mouse parallax
   Gracefully no-ops if WebGL/reduced-motion isn't available.
============================================================ */
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

const reduceMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;

/* ================= 1. Loader noise shader ================= */
function initLoaderShader() {
  const canvas = document.getElementById("loader-shader");
  if (!canvas || reduceMotion) return;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const material = new THREE.ShaderMaterial({
    uniforms: {
      u_time: { value: 0 },
      u_resolution: {
        value: new THREE.Vector2(window.innerWidth, window.innerHeight),
      },
    },
    vertexShader: `
      void main() { gl_Position = vec4(position, 1.0); }
    `,
    fragmentShader: `
      precision highp float;
      uniform float u_time;
      uniform vec2 u_resolution;

      // classic value-noise (cheap, no external libs)
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123); }
      float noise(vec2 p){
        vec2 i = floor(p), f = fract(p);
        float a = hash(i), b = hash(i + vec2(1.0,0.0));
        float c = hash(i + vec2(0.0,1.0)), d = hash(i + vec2(1.0,1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
      }

      void main(){
        vec2 uv = gl_FragCoord.xy / u_resolution.xy;
        float n = noise(uv * 3.5 + u_time * 0.06);
        n += noise(uv * 7.0 - u_time * 0.04) * 0.5;
        vec3 blue = vec3(0.29, 0.49, 1.0);
        vec3 purple = vec3(0.61, 0.42, 1.0);
        vec3 col = mix(blue, purple, n);
        float alpha = smoothstep(0.2, 0.9, n) * 0.35;
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
  });

  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  scene.add(quad);

  const clock = new THREE.Clock();
  let raf;
  function animate() {
    material.uniforms.u_time.value = clock.getElapsedTime();
    renderer.render(scene, camera);
    raf = requestAnimationFrame(animate);
  }
  animate();

  window.addEventListener("resize", () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    material.uniforms.u_resolution.value.set(
      window.innerWidth,
      window.innerHeight,
    );
  });

  // stop rendering once the loader is gone (saves GPU after boot)
  const loaderEl = document.querySelector(".loader");
  if (loaderEl) {
    const obs = new MutationObserver(() => {
      if (!document.body.contains(loaderEl)) {
        cancelAnimationFrame(raf);
        renderer.dispose();
        obs.disconnect();
      }
    });
    obs.observe(document.body, { childList: true });
  }
}

/* ================= 2. Hero scene ================= */
function initHeroScene() {
  const canvas = document.getElementById("hero-canvas");
  if (!canvas) return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    42,
    window.innerWidth / window.innerHeight,
    0.1,
    100,
  );
  camera.position.set(0, 0, 7);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
  renderer.setSize(window.innerWidth, window.innerHeight);

  /* --- lighting --- */
  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const key = new THREE.PointLight(0x4c7eff, 6, 20);
  key.position.set(3, 2, 4);
  scene.add(key);
  const rim = new THREE.PointLight(0x9b6bff, 5, 20);
  rim.position.set(-3, -2, 3);
  scene.add(rim);

  /* --- glass sphere --- */
  const glass = new THREE.Mesh(
    new THREE.SphereGeometry(1.15, 64, 64),
    new THREE.MeshPhysicalMaterial({
      roughness: 0.05,
      transmission: 1,
      thickness: 1.4,
      ior: 1.4,
      color: 0xffffff,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
    }),
  );
  glass.position.set(1.6, 0.4, 0);
  scene.add(glass);

  /* --- wireframe icosahedron --- */
  const wire = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.5, 1),
    new THREE.MeshBasicMaterial({
      color: 0x6fe7dd,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    }),
  );
  wire.position.set(-1.8, -0.6, -1.5);
  scene.add(wire);

  /* --- particle field --- */
  const count = 900;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 14;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 9;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 8 - 2;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const particles = new THREE.Points(
    pGeo,
    new THREE.PointsMaterial({
      size: 0.02,
      color: 0xffffff,
      transparent: true,
      opacity: 0.5,
    }),
  );
  scene.add(particles);

  /* --- bloom post-processing --- */
  let composer = null;
  try {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.55,
      0.6,
      0.15,
    );
    composer.addPass(bloom);
  } catch (err) {
    composer = null; // fall back to plain renderer if postprocessing addons fail to load
  }

  /* --- mouse parallax --- */
  const pointer = { x: 0, y: 0 };
  const target = { x: 0, y: 0 };
  window.addEventListener("mousemove", (e) => {
    target.x = (e.clientX / window.innerWidth - 0.5) * 2;
    target.y = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  const clock = new THREE.Clock();
  let rafId = null;
  let running = false;

  function animate() {
    const t = clock.getElapsedTime();
    if (!reduceMotion) {
      glass.rotation.y = t * 0.25;
      glass.position.y = 0.4 + Math.sin(t * 0.8) * 0.15;
      wire.rotation.x = t * 0.15;
      wire.rotation.y = t * 0.2;
      particles.rotation.y = t * 0.02;

      pointer.x += (target.x - pointer.x) * 0.04;
      pointer.y += (target.y - pointer.y) * 0.04;
      camera.position.x = pointer.x * 0.6;
      camera.position.y = -pointer.y * 0.4;
      camera.lookAt(0, 0, 0);
    }

    if (composer) composer.render();
    else renderer.render(scene, camera);
    rafId = requestAnimationFrame(animate);
  }

  function start() {
    if (running) return;
    running = true;
    clock.getDelta(); // discard the elapsed-while-paused time so nothing jumps
    animate();
  }
  function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  }

  // Performance: the hero is only ever seen once, at the top of the
  // page — there's no reason to keep rendering it once the user has
  // scrolled well past it into the horizontal experience below.
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => (entry.isIntersecting ? start() : stop())),
      { threshold: 0.01 },
    );
    io.observe(canvas);
  } else {
    start();
  }

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (composer) composer.setSize(window.innerWidth, window.innerHeight);
  });
}

/* ================= 3. Hidden 3D easter egg ================= */
// Triggered by command-palette.js on the Konami code. Lazily builds
// its own renderer/scene on first call (zero cost until used), then
// tears itself down completely afterwards.
let eggBusy = false;

function triggerEasterEgg3D() {
  if (eggBusy) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return; // toast alone is enough
  eggBusy = true;

  const canvas = document.createElement("canvas");
  canvas.style.cssText =
    "position:fixed;inset:0;z-index:970;pointer-events:none;opacity:0;transition:opacity .4s ease;";
  document.body.appendChild(canvas);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    100,
  );
  camera.position.set(0, 0, 7);

  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const light = new THREE.PointLight(0x9b6bff, 8, 30);
  light.position.set(2, 2, 5);
  scene.add(light);

  // a central monogram-ish shape that appears, spins up, then "explodes"
  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.6, 0),
    new THREE.MeshStandardMaterial({
      color: 0x6fe7dd,
      emissive: 0x4c7eff,
      emissiveIntensity: 0.8,
      roughness: 0.3,
    }),
  );
  scene.add(core);

  // burst fragments — small glowing shards flying outward with simple physics
  const COLORS = [0x4c7eff, 0x9b6bff, 0x6fe7dd, 0xffffff];
  const shards = [];
  const shardCount = 36;
  for (let i = 0; i < shardCount; i++) {
    const mesh = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.08 + Math.random() * 0.07, 0),
      new THREE.MeshStandardMaterial({
        color: COLORS[i % COLORS.length],
        emissive: COLORS[i % COLORS.length],
        emissiveIntensity: 0.6,
        roughness: 0.4,
      }),
    );
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const speed = 2.4 + Math.random() * 2.2;
    mesh.userData.velocity = new THREE.Vector3(
      Math.sin(phi) * Math.cos(theta) * speed,
      Math.sin(phi) * Math.sin(theta) * speed,
      Math.cos(phi) * speed * 0.6,
    );
    mesh.userData.spin = new THREE.Vector3(
      Math.random() * 4,
      Math.random() * 4,
      Math.random() * 4,
    );
    scene.add(mesh);
    shards.push(mesh);
  }

  let composer = null;
  try {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(
      new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.9,
        0.7,
        0.1,
      ),
    );
  } catch {
    composer = null;
  }

  requestAnimationFrame(() => (canvas.style.opacity = "1"));

  const DURATION = 2400;
  const EXPLODE_AT = 260; // ms — core spins briefly before shards launch
  const clock = new THREE.Clock();
  let elapsedMs = 0;
  let raf;

  function animate() {
    const dt = clock.getDelta();
    elapsedMs += dt * 1000;

    core.rotation.x += dt * 6;
    core.rotation.y += dt * 8;
    const coreScale =
      elapsedMs < EXPLODE_AT
        ? 1 + (elapsedMs / EXPLODE_AT) * 0.6
        : Math.max(0, 1.6 - (elapsedMs - EXPLODE_AT) / 220);
    core.scale.setScalar(Math.max(coreScale, 0));
    core.visible = coreScale > 0.01;

    if (elapsedMs > EXPLODE_AT) {
      shards.forEach((mesh) => {
        mesh.position.addScaledVector(mesh.userData.velocity, dt);
        mesh.userData.velocity.multiplyScalar(0.985); // gentle damping
        mesh.rotation.x += mesh.userData.spin.x * dt;
        mesh.rotation.y += mesh.userData.spin.y * dt;
        const life = Math.max(
          0,
          1 - (elapsedMs - EXPLODE_AT) / (DURATION - EXPLODE_AT),
        );
        mesh.material.opacity = life;
        mesh.material.transparent = true;
        mesh.scale.setScalar(life);
      });
    }

    if (composer) composer.render();
    else renderer.render(scene, camera);

    if (elapsedMs < DURATION) {
      raf = requestAnimationFrame(animate);
    } else {
      cleanup();
    }
  }

  function cleanup() {
    canvas.style.opacity = "0";
    setTimeout(() => {
      cancelAnimationFrame(raf);
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
      });
      renderer.dispose();
      canvas.remove();
      eggBusy = false;
    }, 400);
  }

  animate();
}

// exposed for command-palette.js (classic script) to call into this module
window.__triggerEasterEgg3D = triggerEasterEgg3D;

try {
  initLoaderShader();
  initHeroScene();
} catch (err) {
  // WebGL unavailable or addons failed to load — page still works without the 3D scenes.
  console.warn("[webgl.js] 3D scenes disabled:", err);
}
