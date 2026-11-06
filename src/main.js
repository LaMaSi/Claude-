import * as THREE from 'three';
import { startHouse } from './data/startHouse.js';
import { FAMILY } from './data/family.js';
import { generateHousehold } from './data/generator.js';
import { Sim } from './sim/sim.js';
import { buildWorld } from './render/world.js';
import { createLighting } from './render/daynight.js';
import { createCharactersView } from './render/charactersView.js';
import { createCameraRig } from './input.js';
import { renderPortraits } from './render/portraits.js';
import { createUI } from './ui.js';
import { createPixelPass } from './render/pixelate.js';

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
const world = buildWorld(scene, startHouse);
const updateLighting = createLighting(scene, renderer);
// A fresh random household every visit. ?seed=abc replays one; ?family=1 loads the hand-written Sam / Maya / Robin family.
const params = new URLSearchParams(location.search);
const seed = params.get('seed') || Math.random().toString(36).slice(2, 8);
const people = params.has('family') ? FAMILY : generateHousehold(seed);
if (!params.has('family') && !params.has('seed')) { params.set('seed', seed); history.replaceState(null, '', `?${params}`); }
const sim = new Sim(startHouse, people);
const view = createCharactersView(scene, sim);

const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
camera.position.set(20, 18.5, 20);
const BASE = new THREE.Vector3(0, 1.0, 0.8);
camera.lookAt(BASE);

// ---- selection / UI ------------------------------------------------------------
function select(id, focus = true) {
  sim.select(id);
  if (focus) { const c = sim.char(id); rig.focus(c.x, c.z); }
}
const pixel = createPixelPass(renderer, { size: Math.max(1, +params.get('px') || 2) });
pixel.enabled = params.has('px') && params.get('px') !== '0';
const ui = createUI({ sim, portraits: renderPortraits(sim.chars), onSelect: (id) => select(id) });

const raycaster = new THREE.Raycaster();
const marker = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.3, 28), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
marker.rotation.x = -Math.PI / 2; scene.add(marker);
let markerT = 1;
function flash(x, z, color = 0xffffff) { marker.position.set(x, 0.05, z); marker.material.color.setHex(color); markerT = 0; }

function onTap(cx, cy) {
  const r = renderer.domElement.getBoundingClientRect();
  const nx = ((cx - r.left) / r.width) * 2 - 1, ny = -((cy - r.top) / r.height) * 2 + 1;
  // 1) characters: generous screen-space radius, good for fingers
  let hit = null, best = 44;
  const v = new THREE.Vector3();
  for (const c of sim.chars) {
    v.set(c.x, c.y + 0.75 * c.scale, c.z).project(camera);
    const d = Math.hypot((v.x - nx) * r.width / 2, (v.y - ny) * r.height / 2);
    if (d < best) { best = d; hit = c; }
  }
  if (hit) { select(hit.id, false); return; }
  const sel = sim.char(sim.selectedId);
  if (!sel) return;
  // 2) furniture
  raycaster.setFromCamera({ x: nx, y: ny }, camera);
  const pickable = world.furniture.filter((g) => { const d = startHouse.items[g.userData.itemIndex].def; return !['rug', 'painting'].includes(d); });
  const hits = raycaster.intersectObjects(pickable, true);
  if (hits.length) {
    let o = hits[0].object; while (o && o.userData.itemIndex === undefined) o = o.parent;
    if (o) {
      if (sim.commandUse(sel, o.userData.itemIndex)) flash(o.position.x, o.position.z, 0xffd36b);
      else flash(o.position.x, o.position.z, 0xff7b7b); // busy / unusable
      return;
    }
  }
  // 3) ground
  const p = rig.ground(cx, cy);
  if (p && sim.nav.nearestWalkable(p.x, p.z, 6)) {
    const t = sim.nav.nearestWalkable(p.x, p.z, 6);
    if (sim.commandMove(sel, t.x, t.z)) flash(t.x, t.z);
  }
}
const rig = createCameraRig(camera, renderer.domElement, BASE, { onTap });
select(sim.chars[0].id, false);

const UI_TOP = 52, UI_BOTTOM = 112; // px reserved for the clock and the (closed) dock
const dock = document.getElementById('dock');
let shift = (UI_BOTTOM - UI_TOP) / 2, shiftTarget = shift;
function applyView() {
  const w = window.innerWidth, h = window.innerHeight;
  camera.setViewOffset(w, h, 0, shift, w, h); rig.resize(); pixel.resize(w, h);
}
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h);
  const hEff = Math.max(200, h - UI_TOP - UI_BOTTOM), needW = w < h ? 17 : 22, needH = 15.5;
  const sizeEff = Math.max(needH, needW * hEff / w);      // world height that must fit in the free band (dock closed)
  const size = sizeEff * h / hEff, aspect = w / h;
  camera.left = -size * aspect / 2; camera.right = size * aspect / 2;
  camera.top = size / 2; camera.bottom = -size / 2;
  // lift the scene above the dock; follows the dock height so an open panel never hides the action
  shiftTarget = (Math.max(UI_BOTTOM, dock.offsetHeight + 14) - UI_TOP) / 2;
  applyView();
}
if (window.ResizeObserver) new ResizeObserver(() => resize()).observe(dock);
window.addEventListener('resize', resize);
resize();

// ---- time of day -------------------------------------------------------------
const slider = document.getElementById('time'), clock = document.getElementById('clock'), playBtn = document.getElementById('play');
let hour = parseFloat(params.get('t') ?? '21.5'), auto = false;
slider.value = hour;
slider.addEventListener('input', () => { hour = parseFloat(slider.value); });
playBtn.addEventListener('click', () => { auto = !auto; playBtn.textContent = auto ? 'Pause' : 'Auto'; });
const fmt = (h) => `${h > 6 && h < 19.5 ? '☀' : '☾'} ${String(Math.floor(h) % 24).padStart(2, '0')}:${String(Math.floor((h % 1) * 60)).padStart(2, '0')}`;

// ---- main loop (with a simple adaptive quality fallback for slow phones) -----
let last = performance.now(), ema = 16, quality = 0, slowFor = 0;
function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.1); last = now;
  ema += (dt * 1000 - ema) * 0.05;
  slowFor = ema > 26 ? slowFor + dt : 0;
  if (slowFor > 3 && quality < 2) {
    quality++; slowFor = 0;
    if (quality === 1) { renderer.setPixelRatio(1); resize(); }
    else { const s = updateLighting.sun.shadow; s.mapSize.set(1024, 1024); s.map?.dispose(); s.map = null; }
  }
  if (auto) { const nh = (hour + dt * 0.5) % 24; if (nh < hour) sim.advanceDay(); hour = nh; slider.value = hour; }
  clock.textContent = fmt(hour);
  updateLighting(hour, world, now / 1000);
  sim.hour = hour;
  sim.update(dt * (+params.get('speed') || 1));
  view.update(dt, now / 1000, sim.selectedId);
  rig.update(dt);
  if (markerT < 1) { markerT += dt / 0.7; marker.material.opacity = (1 - markerT) * 0.9; marker.scale.setScalar(1 + markerT * 1.2); }
  ui.update(dt);
  if (Math.abs(shift - shiftTarget) > 0.3) { shift += (shiftTarget - shift) * (1 - Math.exp(-dt * 9)); applyView(); }
  if (pixel.enabled) pixel.render(scene, camera); else renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.__pixel = pixel;
const pxBtn = document.getElementById('pxbtn');
pxBtn.addEventListener('click', () => { pixel.enabled = !pixel.enabled; pxBtn.classList.toggle('on', pixel.enabled); });
pxBtn.classList.toggle('on', pixel.enabled);
document.getElementById('dicebtn').addEventListener('click', () => { params.set('seed', Math.random().toString(36).slice(2, 8)); params.delete('family'); location.search = params.toString(); });
window.__ready = true; window.__seed = seed; window.__people = people; window.__sim = sim; window.__rig = rig; window.__select = select;
