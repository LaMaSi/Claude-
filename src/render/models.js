// Procedural low-poly models. Each builder returns a Group whose origin sits at
// floor level, centred on its footprint. Units are roughly metres.
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
function cyl(parent, rt, rb, h, color, x, y, z, seg = 10, extra = {}) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat(color, extra));
  m.position.set(x, y + h / 2, z);
  m.castShadow = m.receiveShadow = true;
  parent.add(m);
  return m;
}
function ball(parent, r, color, x, y, z, detail = 1, sy = 1) {
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, detail), mat(color));
  m.position.set(x, y, z);
  m.scale.y = sy;
  m.castShadow = m.receiveShadow = true;
  parent.add(m);
  return m;
}

// ---- furniture -------------------------------------------------------------

export function bed(g = new THREE.Group()) {
  box(g, 1.7, 0.28, 2.1, C.woodDark, 0, 0, 0);
  box(g, 1.6, 0.22, 2.0, C.white, 0, 0.28, 0.02, 0.1);
  box(g, 1.62, 0.12, 1.2, C.fabricBlue, 0, 0.42, 0.42, 0.06);   // blanket
  box(g, 0.62, 0.14, 0.38, C.white, -0.38, 0.5, -0.7, 0.07);    // pillows
  box(g, 0.62, 0.14, 0.38, C.white, 0.38, 0.5, -0.7, 0.07);
  box(g, 1.8, 0.95, 0.14, C.wood, 0, 0, -1.08);                 // headboard
  return g;
}
export function kitchenCounter(g = new THREE.Group()) {
  box(g, 1.6, 0.9, 0.7, C.white, 0, 0, 0, 0.05);
  box(g, 1.66, 0.06, 0.76, C.wood, 0, 0.9, 0, 0.03);
  for (const x of [-0.4, 0.4]) {
    cyl(g, 0.13, 0.13, 0.02, C.black, x, 0.96, 0.05, 12);
  }
  box(g, 0.5, 0.02, 0.02, C.metal, 0.5, 0.55, 0.36, 0.01);
  return g;
}
export function fridge(g = new THREE.Group()) {
  box(g, 0.8, 1.9, 0.75, C.fabricMint, 0, 0, 0, 0.08);
  box(g, 0.78, 0.02, 0.02, C.black, 0, 1.2, 0.38, 0.005);
  box(g, 0.04, 0.35, 0.05, C.metal, 0.3, 1.3, 0.4, 0.015);
  box(g, 0.04, 0.5, 0.05, C.metal, 0.3, 0.5, 0.4, 0.015);
  return g;
}
export function shower(g = new THREE.Group()) {
  box(g, 1.1, 0.12, 1.1, C.white, 0, 0, 0, 0.04);
  box(g, 0.05, 2.0, 0.05, C.metal, -0.5, 0, -0.5, 0.01);
  box(g, 0.05, 2.0, 0.05, C.metal, 0.5, 0, 0.5, 0.01);
  box(g, 1.05, 2.0, 0.03, C.glass, 0, 0, 0.52, 0.01, { transparent: true, opacity: 0.35, roughness: 0.2 });
  box(g, 0.03, 2.0, 1.05, C.glass, 0.52, 0, 0, 0.01, { transparent: true, opacity: 0.35, roughness: 0.2 });
  cyl(g, 0.02, 0.02, 0.45, C.metal, -0.45, 1.65, -0.45, 6);
  cyl(g, 0.16, 0.16, 0.04, C.metal, -0.28, 2.0, -0.28, 12);
  return g;
}
export function toilet(g = new THREE.Group()) {
  box(g, 0.4, 0.4, 0.3, C.white, 0, 0, -0.1, 0.06);
  cyl(g, 0.2, 0.17, 0.4, C.white, 0, 0, 0.1, 12);
  box(g, 0.42, 0.62, 0.18, C.white, 0, 0, -0.25, 0.05);
  return g;
}
export function sofa(g = new THREE.Group()) {
  box(g, 2.0, 0.4, 0.9, C.fabricPink, 0, 0, 0, 0.1);
  box(g, 2.0, 0.55, 0.28, C.fabricPink, 0, 0.3, -0.31, 0.12);
  box(g, 0.24, 0.35, 0.9, C.fabricPink, -0.88, 0.3, 0, 0.1);
  box(g, 0.24, 0.35, 0.9, C.fabricPink, 0.88, 0.3, 0, 0.1);
  box(g, 0.5, 0.45, 0.14, C.gold, -0.5, 0.4, -0.1, 0.07).rotation.x = -0.3;
  return g;
}
export function tvStand(g = new THREE.Group()) {
  box(g, 1.5, 0.5, 0.45, C.wood, 0, 0, 0, 0.04);
  box(g, 1.2, 0.7, 0.06, C.black, 0, 0.62, 0, 0.02);
  const scr = box(g, 1.1, 0.6, 0.02, 0x4a6a8a, 0, 0.67, 0.035, 0.005, { emissive: 0x6fb4ff, emissiveIntensity: 0.0 });
  scr.userData.tvScreen = true;
  box(g, 0.25, 0.1, 0.15, C.black, 0, 0.5, 0, 0.02);
  return g;
}
export function table(g = new THREE.Group()) {
  box(g, 1.5, 0.08, 0.9, C.wood, 0, 0.7, 0, 0.04);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(g, 0.08, 0.7, 0.08, C.woodDark, sx * 0.65, 0, sz * 0.36, 0.02);
  cyl(g, 0.07, 0.05, 0.14, C.fabricBlue, 0, 0.78, 0, 8);
  ball(g, 0.12, C.pot, 0, 0.97, 0, 1, 0.9);
  return g;
}
export function chair(g = new THREE.Group()) {
  box(g, 0.45, 0.06, 0.45, C.wood, 0, 0.45, 0, 0.03);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(g, 0.05, 0.45, 0.05, C.woodDark, sx * 0.18, 0, sz * 0.18, 0.015);
  box(g, 0.45, 0.5, 0.05, C.wood, 0, 0.5, -0.2, 0.03);
  return g;
}
export function plant(g = new THREE.Group()) {
  cyl(g, 0.22, 0.16, 0.34, C.pot, 0, 0, 0, 9);
  ball(g, 0.34, C.leaf, 0, 0.7, 0, 1, 1.15);
  ball(g, 0.22, C.leafLight, 0.15, 0.98, 0.05, 1, 1.1);
  ball(g, 0.2, C.leafLight, -0.16, 0.88, -0.08, 1);
  return g;
}
export function floorLamp(g = new THREE.Group()) {
  cyl(g, 0.16, 0.18, 0.04, C.black, 0, 0, 0, 12);
  cyl(g, 0.02, 0.02, 1.45, C.black, 0, 0.04, 0, 6);
  const shade = cyl(g, 0.15, 0.25, 0.3, 0xfff1c9, 0, 1.45, 0, 12, { emissive: 0xffd88a, emissiveIntensity: 0 });
  shade.userData.lampShade = true;
  const light = new THREE.PointLight(0xffd9a0, 0, 7, 1.6);
  light.position.set(0, 1.5, 0);
  light.userData.lampLight = true;
  g.add(light);
  return g;
}
export function bookshelf(g = new THREE.Group()) {
  box(g, 1.1, 1.9, 0.35, C.wood, 0, 0, 0, 0.03);
  const cols = [C.fabricBlue, C.fabricPink, C.gold, C.fabricMint, C.pot];
  for (let s = 0; s < 4; s++) {
    box(g, 1.02, 0.04, 0.33, C.woodDark, 0, 0.35 + s * 0.45, 0.01, 0.01);
    for (let i = 0; i < 6; i++) {
      const h = 0.22 + ((i * 7 + s * 3) % 5) * 0.03;
      box(g, 0.07, h, 0.22, cols[(i + s) % cols.length], -0.4 + i * 0.12, 0.39 + s * 0.45, 0.02, 0.01);
    }
  }
  return g;
}
export function rug(g = new THREE.Group()) {
  const m = cyl(g, 1.2, 1.2, 0.025, C.fabricMint, 0, 0, 0, 24);
  m.castShadow = false;
  cyl(g, 0.85, 0.85, 0.03, C.white, 0, 0, 0, 24).castShadow = false;
  cyl(g, 0.5, 0.5, 0.035, C.fabricPink, 0, 0, 0, 24).castShadow = false;
  return g;
}
export function painting(g = new THREE.Group()) {
  box(g, 0.9, 0.65, 0.05, C.woodDark, 0, 0, 0, 0.015);
  box(g, 0.78, 0.53, 0.02, 0xbfe0f0, 0, 0.06, 0.03, 0.005);
  const hill = ball(g, 0.3, C.leaf, -0.1, 0.1, 0.045, 0); hill.scale.set(1.3, 0.5, 0.05);
  const sun = ball(g, 0.08, C.gold, 0.22, 0.42, 0.045, 0); sun.scale.z = 0.1;
  return g;
}

// ---- scenery ---------------------------------------------------------------

export function tree(scale = 1) {
  const g = new THREE.Group();
  cyl(g, 0.12, 0.18, 0.9, C.woodDark, 0, 0, 0, 6);
  ball(g, 0.75, C.leaf, 0, 1.5, 0, 1, 1.1);
  ball(g, 0.5, C.leafLight, 0.2, 2.1, 0.1, 1, 1.1);
  g.scale.setScalar(scale);
  return g;
}
export function pine(scale = 1) {
  const g = new THREE.Group();
  cyl(g, 0.1, 0.14, 0.6, C.woodDark, 0, 0, 0, 6);
  for (let i = 0; i < 3; i++) cyl(g, 0.05, 0.7 - i * 0.18, 0.8, i % 2 ? 0x5fae7a : 0x6fbf73, 0, 0.5 + i * 0.5, 0, 7);
  g.scale.setScalar(scale);
  return g;
}
export function bush(scale = 1) {
  const g = new THREE.Group();
  ball(g, 0.4, C.leaf, 0, 0.3, 0, 1, 0.8);
  ball(g, 0.3, C.leafLight, 0.3, 0.25, 0.1, 1, 0.8);
  g.scale.setScalar(scale);
  return g;
}
export function flowers(g = new THREE.Group()) {
  const cols = [C.pot, C.gold, C.fabricPink, 0xffffff];
  for (let i = 0; i < 5; i++) {
    const a = i * 2.4, r = 0.12 + (i % 3) * 0.08;
    cyl(g, 0.01, 0.01, 0.18, C.leaf, Math.cos(a) * r, 0, Math.sin(a) * r, 4);
    ball(g, 0.055, cols[i % 4], Math.cos(a) * r, 0.2, Math.sin(a) * r, 0);
  }
  return g;
}

// ---- people ----------------------------------------------------------------

export function person({ skin = C.skin, hair = C.hair, shirt = C.shirt, pants = C.pants } = {}) {
  const g = new THREE.Group();
  box(g, 0.14, 0.5, 0.16, pants, -0.1, 0, 0, 0.05);
  box(g, 0.14, 0.5, 0.16, pants, 0.1, 0, 0, 0.05);
  box(g, 0.42, 0.52, 0.26, shirt, 0, 0.5, 0, 0.1);
  box(g, 0.1, 0.42, 0.12, shirt, -0.26, 0.58, 0, 0.04);
  box(g, 0.1, 0.42, 0.12, shirt, 0.26, 0.58, 0, 0.04);
  ball(g, 0.2, skin, 0, 1.2, 0, 2);
  const h = ball(g, 0.215, hair, 0, 1.25, -0.02, 2); h.scale.set(1, 0.85, 1.05);
  ball(g, 0.03, C.black, -0.07, 1.2, 0.18, 0);
  ball(g, 0.03, C.black, 0.07, 1.2, 0.18, 0);
  return g;
}
