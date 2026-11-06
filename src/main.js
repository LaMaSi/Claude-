import * as THREE from 'three';
import { startHouse } from './data/startHouse.js';
import { buildWorld } from './render/world.js';
import { createLighting } from './render/daynight.js';

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
const world = buildWorld(scene, startHouse);
const updateLighting = createLighting(scene);

// Fixed isometric-style orthographic camera.
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
camera.position.set(20, 18.5, 20);
const LOOK = new THREE.Vector3(0, 1.0, 0.8);
camera.lookAt(LOOK);

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h);
  const aspect = w / h;
  const needW = 22, needH = 15.5; // world extent we want visible
  const size = Math.max(needH, needW / aspect);
  camera.left = -size * aspect / 2; camera.right = size * aspect / 2;
  camera.top = size / 2; camera.bottom = -size / 2;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// time of day
const slider = document.getElementById('time');
const clock = document.getElementById('clock');
const playBtn = document.getElementById('play');
const params = new URLSearchParams(location.search);
let hour = parseFloat(params.get('t') ?? '14');
let auto = false;
slider.value = hour;
slider.addEventListener('input', () => { hour = parseFloat(slider.value); });
playBtn.addEventListener('click', () => { auto = !auto; playBtn.textContent = auto ? 'Pause' : 'Auto'; });

function fmt(h) {
  const hh = Math.floor(h) % 24, mm = Math.floor((h % 1) * 60);
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

let last = performance.now();
function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.1); last = now;
  if (auto) { hour = (hour + dt * 0.5) % 24; slider.value = hour; } // 48 s per day
  clock.textContent = fmt(hour);
  updateLighting(hour, world);
  for (const c of world.clouds) { c.position.x += dt * 0.25; if (c.position.x > 20) c.position.x = -20; }
  const t = now / 1000;
  for (const p of world.characters) p.position.y = Math.sin(t * 2) * 0.01 + 0.0; // idle breathing
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.__ready = true;
