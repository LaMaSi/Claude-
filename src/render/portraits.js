// Renders characters to images (face portrait or full body), auto-framed from their bounding boxes.
import * as THREE from 'three';
import { buildPerson } from './people.js';

export function createImageRenderer(w = 256, h = 256) {
  let r;
  try { r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); } catch { return null; }
  r.setSize(w, h, false); r.setPixelRatio(1); r.toneMapping = THREE.ACESFilmicToneMapping; r.shadowMap.enabled = false;
  r.setClearColor(0x000000, 0);
  return r;
}

export function renderCharacter(r, cfg, { mode = 'face', turn = 0.35 } = {}) {
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xfff4e0, 0xa8a090, 1.5));
  const d = new THREE.DirectionalLight(0xffffff, 2.4); d.position.set(-2, 3, 4); scene.add(d);
  const p = buildPerson(cfg);
  p.root.rotation.y = turn; scene.add(p.root); p.root.updateMatrixWorld(true);
  const aspect = r.domElement.width / r.domElement.height;
  let hh, cy, cx = 0;
  if (mode === 'face') {
    // frame from the head itself (hats may grow the frame upward but never sideways)
    const headPos = p.parts.head.getWorldPosition(new THREE.Vector3());
    const rad = 0.2 * (cfg.headScale ?? 1) * (cfg.scale ?? 1) * Math.max(cfg.look?.headW ?? 1, 1);
    const bb = new THREE.Box3().setFromObject(p.parts.head), top = bb.max.y - headPos.y;
    hh = Math.min(Math.max(rad * 1.75, (top + rad * 0.9) * 0.5 + rad * 0.6), rad * 2.7);
    cy = headPos.y - rad * 0.12 + Math.max(0, hh - rad * 1.75) * 0.85; cx = headPos.x;
  } else {
    const bb = new THREE.Box3().setFromObject(p.root), size = bb.getSize(new THREE.Vector3()), c = bb.getCenter(new THREE.Vector3());
    hh = Math.max(size.y * 0.56, size.x / aspect * 0.62); cy = c.y; cx = c.x;
  }
  const cam = new THREE.OrthographicCamera(-hh * aspect, hh * aspect, hh, -hh, 0.1, 30);
  cam.position.set(cx, cy, 6); cam.lookAt(cx, cy, 0);
  r.render(scene, cam);
  return r.domElement.toDataURL('image/png');
}

export function renderPortraits(chars, size = 192) {
  const out = new Map(), r = createImageRenderer(size, size);
  if (!r) return out;
  for (const c of chars) out.set(c.id, renderCharacter(r, c, { mode: 'face' }));
  r.dispose();
  return out;
}
