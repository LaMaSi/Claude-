// Renders each character's head-and-shoulders once into an image for the portrait row.
import * as THREE from 'three';
import { buildPerson } from './people.js';

export function renderPortraits(chars, size = 192) {
  const out = new Map();
  let r;
  try { r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); } catch { return out; }
  r.setSize(size, size, false); r.setPixelRatio(1);
  r.toneMapping = THREE.ACESFilmicToneMapping; r.shadowMap.enabled = false;
  for (const c of chars) {
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xfff4e0, 0xa8a090, 1.5));
    const d = new THREE.DirectionalLight(0xffffff, 2.4); d.position.set(-2, 3, 4); scene.add(d);
    const p = buildPerson(c);
    p.root.rotation.y = 0.35; scene.add(p.root);
    const cy = 1.2 * c.scale + 0.02, h = (c.headScale > 1 ? 0.5 : 0.46) * Math.max(c.scale, 0.85);
    const cam = new THREE.OrthographicCamera(-h, h, h, -h, 0.1, 20);
    cam.position.set(0, cy, 4); cam.lookAt(0, cy, 0);
    r.setClearColor(0x000000, 0); r.render(scene, cam);
    out.set(c.id, r.domElement.toDataURL('image/png'));
  }
  r.dispose();
  return out;
}
