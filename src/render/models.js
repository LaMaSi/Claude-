// Procedural low-poly medieval-fantasy models. Each builder returns a Group whose origin sits at
// floor level, centred on its footprint; local +z is the "front". Units are roughly metres.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { C, mat } from './palette.js';

const rbCache = new Map();
function rbox(w, h, d, r = 0.05, seg = 2) {
  const k = [w, h, d, r, seg].join();
  if (!rbCache.has(k)) rbCache.set(k, new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2, h / 2, d / 2)));
  return rbCache.get(k);
}
export function box(parent, w, h, d, color, x, y, z, r = 0.04, extra = {}) {
  const m = new THREE.Mesh(rbox(w, h, d, r), mat(color, extra));
  m.position.set(x, y + h / 2, z); // y = bottom of the box
  m.castShadow = m.receiveShadow = true;
  parent.add(m);
  return m;
}
export function cyl(parent, rt, rb, h, color, x, y, z, seg = 10, extra = {}) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat(color, extra));
  m.position.set(x, y + h / 2, z);
  m.castShadow = m.receiveShadow = true;
  parent.add(m);
  return m;
}
export function ball(parent, r, color, x, y, z, detail = 1, sy = 1, extra = {}) {
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, detail), mat(color, extra));
  m.position.set(x, y, z);
  m.scale.y = sy;
  m.castShadow = m.receiveShadow = true;
  parent.add(m);
  return m;
}
const FLAME = { emissive: 0xff9a2e, emissiveIntensity: 1.6, roughness: 0.6 };

// ---- furniture -------------------------------------------------------------

export function bed(g = new THREE.Group()) {
  box(g, 1.7, 0.3, 2.1, C.oakDark, 0, 0, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(g, 0.1, 0.5, 0.1, C.oak, sx * 0.8, 0, sz * 1.0, 0.03);
  box(g, 1.6, 0.2, 2.0, C.linen, 0, 0.3, 0.02, 0.09);                 // straw mattress (top = 0.5)
  box(g, 1.62, 0.1, 1.15, C.wool, 0, 0.44, 0.42, 0.05);               // wool blanket
  box(g, 1.64, 0.105, 0.14, C.woolOchre, 0, 0.44, 0.06, 0.03);        // stripe
  box(g, 1.64, 0.105, 0.08, C.woolOchre, 0, 0.44, 0.9, 0.03);
  box(g, 0.64, 0.13, 0.4, C.cream, -0.4, 0.5, -0.72, 0.065);          // pillows
  box(g, 0.64, 0.13, 0.4, C.cream, 0.4, 0.5, -0.72, 0.065);
  box(g, 1.8, 1.0, 0.13, C.oak, 0, 0, -1.07, 0.03);                   // headboard
  box(g, 1.9, 0.12, 0.17, C.oakLight, 0, 1.0, -1.07, 0.04);
  for (const sx of [-1, 1]) ball(g, 0.08, C.gold, sx * 0.9, 1.12, -1.07, 1);
  box(g, 1.8, 0.45, 0.1, C.oak, 0, 0, 1.06, 0.03);                    // footboard
  return g;
}
export function pantry(g = new THREE.Group()) {
  box(g, 0.9, 1.75, 0.55, C.oak, 0, 0, 0, 0.04);
  box(g, 0.98, 0.07, 0.62, C.oakDark, 0, 1.75, 0, 0.03);
  box(g, 0.4, 0.8, 0.03, C.oakLight, -0.21, 0.15, 0.285, 0.015); box(g, 0.4, 0.8, 0.03, C.oakLight, 0.21, 0.15, 0.285, 0.015);
  box(g, 0.4, 0.6, 0.03, C.oakLight, -0.21, 1.0, 0.285, 0.015); box(g, 0.4, 0.6, 0.03, C.oakLight, 0.21, 1.0, 0.285, 0.015);
  for (const x of [-0.05, 0.05]) for (const y of [0.55, 1.3]) ball(g, 0.025, C.iron, x, y, 0.32, 0);
  cyl(g, 0.18, 0.18, 0.1, C.woolOchre, 0.15, 1.82, 0, 12);          // cheese wheel
  box(g, 0.28, 0.1, 0.16, 0xd9a86a, -0.2, 1.82, 0.02, 0.05);         // loaf
  cyl(g, 0.01, 0.01, 0.25, C.leather, 0.5, 1.45, 0.1, 4);            // hanging herbs
  ball(g, 0.07, C.leafDark, 0.5, 1.28, 0.1, 1, 1.5); ball(g, 0.05, C.leaf, 0.56, 1.35, 0.14, 0);
  return g;
}
export function hearth(g = new THREE.Group()) {
  box(g, 1.7, 0.2, 0.75, C.stoneDark, 0, 0, 0, 0.03);
  for (const sx of [-1, 1]) box(g, 0.38, 1.15, 0.65, C.stone, sx * 0.65, 0.2, -0.02, 0.04);
  box(g, 1.7, 0.32, 0.65, C.stoneLight, 0, 1.2, -0.02, 0.04);                // mantel
  box(g, 0.92, 0.95, 0.08, 0x2a2420, 0, 0.2, -0.3, 0.01);                    // sooty back
  box(g, 1.5, 1.0, 0.5, C.stone, 0, 1.52, -0.1, 0.05);                       // chimney breast
  box(g, 0.95, 1.7, 0.45, C.stoneDark, 0, 2.5, -0.12, 0.05);                 // stack (rises above the wall)
  box(g, 1.1, 0.12, 0.55, C.stoneLight, 0, 4.2, -0.12, 0.04);
  for (let i = 0; i < 3; i++) { const l = cyl(g, 0.06, 0.06, 0.7, C.oakDark, -0.12 + i * 0.12, 0.28, -0.05, 6); l.rotation.z = Math.PI / 2; l.rotation.y = 0.25 * (i - 1); l.position.y = 0.3 + (i % 2) * 0.1; }
  const fl = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.55, 5), mat(C.fire, FLAME));
  fl.position.set(0, 0.62, -0.05); fl.userData.fire = true; g.add(fl);
  const fl2 = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.35, 5), mat(0xffe08a, { ...FLAME, emissive: 0xffd36b }));
  fl2.position.set(0.1, 0.55, 0); fl2.userData.fire = true; g.add(fl2);
  const light = new THREE.PointLight(0xff9440, 2, 9, 1.6); light.position.set(0, 0.8, 0.5); light.userData.fireLight = true; g.add(light);
  cyl(g, 0.012, 0.012, 0.5, C.iron, 0, 0.78, -0.05, 4);                      // cauldron on chain
  const pot = ball(g, 0.2, C.iron, 0, 0.62, -0.05, 1, 0.8);
  box(g, 0.5, 0.03, 0.03, C.iron, 0, 1.18, -0.05, 0.01);
  void pot;
  return g;
}
export function tub(g = new THREE.Group()) {
  cyl(g, 0.5, 0.45, 0.55, C.oak, 0, 0, 0, 14);
  for (const y of [0.1, 0.4]) cyl(g, 0.52, 0.52, 0.035, C.iron, 0, y, 0, 14);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.47, 0.035, 6, 16), mat(C.oakLight));
  rim.rotation.x = Math.PI / 2; rim.position.y = 0.56; rim.castShadow = true; g.add(rim);
  cyl(g, 0.45, 0.45, 0.01, C.water, 0, 0.55, 0, 14, { transparent: true, opacity: 0.8, roughness: 0.2, emissive: 0x335566, emissiveIntensity: 0.2 });
  // folding screen behind the tub (away from the camera) with a towel over it
  box(g, 1.4, 1.5, 0.05, C.oakDark, 0.0, 0, -0.66, 0.02); box(g, 1.26, 1.2, 0.03, C.linen, 0.0, 0.15, -0.63, 0.01);
  box(g, 0.2, 0.5, 0.09, C.wool, 0.3, 0.95, -0.66, 0.02);
  cyl(g, 0.12, 0.1, 0.22, C.oakLight, -0.6, 0, 0.45, 8);                    // bucket
  return g;
}
export function washstand(g = new THREE.Group()) {
  box(g, 0.7, 0.06, 0.5, C.oak, 0, 0.8, 0, 0.03);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(g, 0.06, 0.8, 0.06, C.oakDark, sx * 0.29, 0, sz * 0.19, 0.02);
  box(g, 0.6, 0.04, 0.4, C.oakDark, 0, 0.3, 0, 0.02);
  cyl(g, 0.2, 0.12, 0.1, C.cream, -0.05, 0.86, 0, 14);
  cyl(g, 0.17, 0.17, 0.01, C.water, -0.05, 0.95, 0, 14, { transparent: true, opacity: 0.8 });
  cyl(g, 0.08, 0.1, 0.22, C.clay, 0.24, 0.86, 0.05, 9);                      // jug
  box(g, 0.04, 0.12, 0.04, C.clay, 0.33, 0.95, 0.05, 0.01);
  box(g, 0.5, 0.45, 0.04, C.ironLight, 0, 0.96, -0.26, 0.02, { metalness: 0.3, roughness: 0.4 }); // polished plate mirror
  return g;
}
export function settle(g = new THREE.Group()) {
  box(g, 2.0, 0.42, 0.7, C.oak, 0, 0, 0, 0.04);
  box(g, 2.05, 0.95, 0.1, C.oakLight, 0, 0.1, -0.3, 0.04);
  for (const sx of [-1, 1]) box(g, 0.1, 0.72, 0.7, C.oakDark, sx * 0.97, 0, 0, 0.04);
  box(g, 0.9, 0.09, 0.55, C.wool, -0.48, 0.42, 0.02, 0.05); box(g, 0.9, 0.09, 0.55, C.wool, 0.48, 0.42, 0.02, 0.05);
  box(g, 0.4, 0.34, 0.1, C.woolBlue, 0.62, 0.52, -0.2, 0.05).rotation.x = -0.25;
  box(g, 0.4, 0.34, 0.1, C.woolOchre, -0.62, 0.52, -0.2, 0.05).rotation.x = -0.25;
  return g;
}
export function harp(g = new THREE.Group()) {
  box(g, 0.78, 0.06, 0.4, C.oakDark, 0, 0, 0, 0.03);
  box(g, 0.1, 1.25, 0.14, C.oak, 0.3, 0.06, 0, 0.03);          // pillar
  box(g, 0.14, 1.1, 0.22, C.oakLight, -0.3, 0.06, 0, 0.04);    // sound box
  const neck = box(g, 0.78, 0.09, 0.1, C.oak, 0, 1.27, 0, 0.03); neck.rotation.z = -0.12; neck.position.y = 1.31;
  for (let i = 0; i < 7; i++) {
    const t = i / 6, x = -0.23 + t * 0.46, top = 1.31 - 0.12 * (x / 0.78) * 0.0 + (0.25 - x) * 0.12, bottom = 0.25 + (1 - t) * 0.12;
    cyl(g, 0.006, 0.006, top - bottom - 0.05, C.gold, x, bottom, 0, 4);
  }
  ball(g, 0.05, C.gold, 0.3, 1.33, 0, 0);
  return g;
}
export function table(g = new THREE.Group()) {
  box(g, 1.5, 0.08, 0.9, C.oakLight, 0, 0.7, 0, 0.03);
  for (const sx of [-1, 1]) { box(g, 0.09, 0.7, 0.7, C.oakDark, sx * 0.55, 0, 0, 0.03); }
  box(g, 1.0, 0.07, 0.07, C.oakDark, 0, 0.2, 0, 0.02);
  box(g, 1.52, 0.012, 0.012, C.oakDark, 0, 0.77, 0.1, 0.004);
  cyl(g, 0.17, 0.12, 0.05, C.oak, -0.4, 0.78, 0.1, 10);                     // bowl
  ball(g, 0.13, 0xd9a86a, 0.05, 0.84, 0.15, 1, 0.65);                       // bread
  cyl(g, 0.07, 0.09, 0.2, C.clay, 0.45, 0.78, -0.1, 9);                     // jug
  cyl(g, 0.03, 0.03, 0.14, C.cream, -0.1, 0.78, -0.2, 6);                   // candle
  const f = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.07, 5), mat(C.fire, FLAME)); f.position.set(-0.1, 0.96, -0.2); f.userData.candleFlame = true; g.add(f);
  return g;
}
export function stool(g = new THREE.Group()) {
  cyl(g, 0.21, 0.21, 0.06, C.oakLight, 0, 0.42, 0, 10);
  for (let i = 0; i < 3; i++) { const a = i * 2.09; cyl(g, 0.03, 0.025, 0.42, C.oakDark, Math.cos(a) * 0.14, 0, Math.sin(a) * 0.14, 5); }
  return g;
}
export function plant(g = new THREE.Group()) {
  cyl(g, 0.22, 0.16, 0.34, C.clay, 0, 0, 0, 9);
  ball(g, 0.34, C.leaf, 0, 0.7, 0, 1, 1.15);
  ball(g, 0.22, C.leafLight, 0.15, 0.98, 0.05, 1, 1.1);
  ball(g, 0.2, C.leafDark, -0.16, 0.88, -0.08, 1);
  return g;
}
export function candlestand(g = new THREE.Group()) {
  for (let i = 0; i < 3; i++) { const a = i * 2.09; const l = cyl(g, 0.02, 0.02, 0.35, C.iron, Math.cos(a) * 0.12, 0, Math.sin(a) * 0.12, 5); l.rotation.z = Math.cos(a) * 0.35; l.rotation.x = -Math.sin(a) * 0.35; }
  cyl(g, 0.025, 0.025, 1.4, C.iron, 0, 0.1, 0, 6);
  cyl(g, 0.2, 0.2, 0.03, C.iron, 0, 1.5, 0, 10);
  for (let i = 0; i < 3; i++) {
    const a = i * 2.09, x = Math.cos(a) * 0.12, z = Math.sin(a) * 0.12;
    cyl(g, 0.03, 0.03, 0.2, C.cream, x, 1.53, z, 6);
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.09, 5), mat(C.fire, { ...FLAME, emissiveIntensity: 0 }));
    f.position.set(x, 1.78, z); f.userData.lampShade = true; g.add(f);
  }
  const light = new THREE.PointLight(0xffc880, 0, 7, 1.6);
  light.position.set(0, 1.8, 0); light.userData.lampLight = true; g.add(light);
  return g;
}
export function bookshelf(g = new THREE.Group()) {
  box(g, 1.1, 1.9, 0.35, C.oakDark, 0, 0, 0, 0.03);
  const cols = [C.wool, C.woolBlue, C.woolGreen, C.woolOchre, C.leather];
  for (let s = 0; s < 4; s++) {
    box(g, 1.02, 0.04, 0.33, C.oak, 0, 0.35 + s * 0.45, 0.01, 0.01);
    for (let i = 0; i < 6; i++) {
      const h = 0.22 + ((i * 7 + s * 3) % 5) * 0.03;
      box(g, 0.07, h, 0.22, cols[(i + s) % cols.length], -0.4 + i * 0.12, 0.39 + s * 0.45, 0.02, 0.01);
    }
  }
  const sc = cyl(g, 0.04, 0.04, 0.3, C.cream, 0.35, 1.82, 0.05, 8); sc.rotation.z = Math.PI / 2;
  return g;
}
export function rug(g = new THREE.Group()) {
  cyl(g, 1.2, 1.2, 0.025, C.wool, 0, 0, 0, 24).castShadow = false;
  cyl(g, 1.0, 1.0, 0.03, C.woolOchre, 0, 0, 0, 24).castShadow = false;
  cyl(g, 0.8, 0.8, 0.035, C.woolBlue, 0, 0, 0, 24).castShadow = false;
  cyl(g, 0.45, 0.45, 0.04, C.wool, 0, 0, 0, 24).castShadow = false;
  return g;
}
export function banner(g = new THREE.Group()) {
  box(g, 0.95, 0.05, 0.06, C.oakDark, 0, 1.1, 0, 0.02);
  box(g, 0.78, 1.0, 0.02, C.wool, 0, 0.12, 0.02, 0.005);
  const tip = box(g, 0.55, 0.55, 0.02, C.wool, 0, 0.0, 0.02, 0.005); tip.rotation.z = Math.PI / 4; tip.position.y = 0.17;
  const e = box(g, 0.26, 0.26, 0.025, C.gold, 0, 0.5, 0.035, 0.01); e.rotation.z = Math.PI / 4;
  for (const sx of [-1, 1]) ball(g, 0.04, C.gold, sx * 0.5, 1.13, 0, 0);
  return g;
}
export function chest(g = new THREE.Group()) {
  box(g, 1.0, 0.4, 0.55, C.oak, 0, 0, 0, 0.03);
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.275, 0.275, 1.0, 10, 1, false, 0, Math.PI), mat(C.oakLight));
  lid.rotation.z = Math.PI / 2; lid.position.set(0, 0.4, 0); lid.castShadow = lid.receiveShadow = true; g.add(lid);
  for (const x of [-0.35, 0.35]) box(g, 0.07, 0.42, 0.57, C.iron, x, 0, 0, 0.015);
  box(g, 0.1, 0.12, 0.04, C.gold, 0, 0.28, 0.29, 0.01);
  return g;
}
export function barrel(g = new THREE.Group()) {
  cyl(g, 0.3, 0.27, 0.8, C.oak, 0, 0, 0, 10);
  cyl(g, 0.34, 0.31, 0.06, C.iron, 0, 0.14, 0, 10); cyl(g, 0.34, 0.31, 0.06, C.iron, 0, 0.6, 0, 10);
  cyl(g, 0.28, 0.28, 0.02, C.oakLight, 0, 0.8, 0, 10);
  return g;
}

// ---- scenery ---------------------------------------------------------------

export function tree(scale = 1) {
  const g = new THREE.Group();
  cyl(g, 0.14, 0.2, 0.9, C.oakDark, 0, 0, 0, 6);
  ball(g, 0.78, C.leafDark, 0, 1.5, 0, 1, 1.1);
  ball(g, 0.5, C.leaf, 0.2, 2.1, 0.1, 1, 1.1);
  g.scale.setScalar(scale);
  return g;
}
export function pine(scale = 1) {
  const g = new THREE.Group();
  cyl(g, 0.1, 0.14, 0.6, C.oakDark, 0, 0, 0, 6);
  for (let i = 0; i < 3; i++) cyl(g, 0.05, 0.7 - i * 0.18, 0.8, i % 2 ? 0x4f8f66 : 0x5ba06b, 0, 0.5 + i * 0.5, 0, 7);
  g.scale.setScalar(scale);
  return g;
}
export function bush(scale = 1) {
  const g = new THREE.Group();
  ball(g, 0.4, C.leaf, 0, 0.3, 0, 1, 0.8);
  ball(g, 0.3, C.leafDark, 0.3, 0.25, 0.1, 1, 0.8);
  g.scale.setScalar(scale);
  return g;
}
export function flowers(g = new THREE.Group()) {
  const cols = [C.wool, C.woolOchre, 0xd98fb0, 0xffffff];
  for (let i = 0; i < 5; i++) {
    const a = i * 2.4, r = 0.12 + (i % 3) * 0.08;
    cyl(g, 0.01, 0.01, 0.18, C.leaf, Math.cos(a) * r, 0, Math.sin(a) * r, 4);
    ball(g, 0.055, cols[i % 4], Math.cos(a) * r, 0.2, Math.sin(a) * r, 0);
  }
  return g;
}
export function well(scale = 1) {
  const g = new THREE.Group();
  cyl(g, 0.55, 0.6, 0.65, C.stone, 0, 0, 0, 10);
  cyl(g, 0.4, 0.4, 0.02, 0x2d4452, 0, 0.64, 0, 10);
  for (const sx of [-1, 1]) box(g, 0.08, 1.35, 0.08, C.oakDark, sx * 0.5, 0.6, 0, 0.02);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.9, 0.55, 4), mat(C.thatch)); roof.rotation.y = Math.PI / 4; roof.position.y = 2.2; roof.castShadow = true; g.add(roof);
  const rope = cyl(g, 0.12, 0.1, 0.16, C.oak, 0.0, 0.55, 0, 7); rope.rotation.z = Math.PI / 2; rope.position.y = 1.5;
  g.scale.setScalar(scale);
  return g;
}
export function haystack(scale = 1) {
  const g = new THREE.Group();
  cyl(g, 0.55, 0.65, 0.6, C.thatch, 0, 0, 0, 9);
  const top = new THREE.Mesh(new THREE.ConeGeometry(0.6, 0.6, 9), mat(0xe3c46c)); top.position.y = 0.9; top.castShadow = true; g.add(top);
  g.scale.setScalar(scale);
  return g;
}
export function vegPatch(scale = 1) {
  const g = new THREE.Group();
  box(g, 2.2, 0.12, 1.4, C.soilDark, 0, 0, 0, 0.04);
  for (let r = 0; r < 3; r++) for (let i = 0; i < 5; i++) {
    const c = [C.leafLight, C.leaf, C.woolOchre][r];
    ball(g, 0.11, c, -0.85 + i * 0.42, 0.22, -0.4 + r * 0.4, 1, 0.8);
  }
  g.scale.setScalar(scale);
  return g;
}
