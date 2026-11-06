// Rigged low-poly people with a parametric face / hair / outfit system.
// A "species" builder returns { root, pivot, parts }; parts are named pivots (legL, legR, armL, armR, body, head,
// optional tail) so the animation layer works for any body. New species = new builder in SPECIES.
import * as THREE from 'three';
import { box } from './models.js';
import { C, mat } from './palette.js';
import { HEAD_R, headGeometry, headMaterial } from './face.js';

const tint = (hex, amt) => { const c = new THREE.Color(hex); return amt < 0 ? c.lerp(new THREE.Color(0), -amt).getHex() : c.lerp(new THREE.Color(0xffffff), amt).getHex(); };
function ball(parent, r, color, x, y, z, sx = 1, sy = 1, sz = 1, detail = 3) {
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, Math.max(2, detail)), mat(color, { flatShading: false }));
  m.position.set(x, y, z); m.scale.set(sx, sy, sz);
  m.castShadow = true; m.receiveShadow = true;
  parent.add(m); return m;
}
const smooth = (c) => mat(c, { flatShading: false });
// centre-based soft ellipsoid of the given overall size
function ell(parent, w, h, d, color, x, y, z, seg = 20) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.5, seg, Math.round(seg * 0.7)), smooth(color));
  m.scale.set(w, h, d); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m;
}
// capsule with total height h (rounded ends), centred at y
function caps(parent, r, h, color, x, y, z) {
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, Math.max(0.001, h - 2 * r), 6, 14), smooth(color));
  m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m;
}
function ring(parent, r, tube, color, y, sx = 1, sz = 0.8) {
  const m = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 8, 22), smooth(color));
  m.rotation.x = Math.PI / 2; m.scale.set(sx, sz, 1); m.position.y = y; m.castShadow = true; parent.add(m); return m;
}
function cyl(parent, rt, rb, h, color, y, seg = 16) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), smooth(color));
  m.position.y = y + h / 2; m.castShadow = true; m.receiveShadow = true;
  parent.add(m); return m;
}
function cone(parent, r, h, color, x, y, z, seg = 6) {
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), mat(color));
  m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m;
}
function torus(parent, r, tube, color, x, y, z) {
  const m = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 5, 14), mat(color));
  m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m;
}

export const DEFAULT_LOOK = {
  skin: 0xf2c4a0, hair: 0x5b3a29, hairStyle: 'short', headwear: null, headwearColor: C.linen,
  headW: 1, headH: 1, jaw: 'round', ears: 'round',
  eyes: 'dot', eyeColor: 0x4a3a2c, eyeGap: 0.07, eyeY: 0, eyeSize: 1,
  brows: 'thin', browColor: null, nose: 'button', mouth: 'smile', blush: true, freckles: 0,
  facial: 'none', accessories: [],
  outfit: 'tunic', shirt: 0x4f7a9c, pants: 0x6b5a48, trim: C.gold, apron: true, build: 1, cloak: null,
};

// ---- face -------------------------------------------------------------------------------------------------------
function buildFace(head, L) {
  const { skin, headW: hw, headH: hh } = L;
  const R = HEAD_R, zAt = (x, y) => Math.sqrt(Math.max(0.0004, R * R - (x / hw) ** 2 - (y / hh) ** 2));
  const put = (m, x, y, dz = 0.004) => { m.position.set(x, y, zAt(x, y) + dz); m.rotation.y = Math.asin(THREE.MathUtils.clamp(x / (R * hw), -0.9, 0.9)); return m; };
  const ink = C.black;
  const skull = new THREE.Mesh(headGeometry(L), headMaterial(L)); skull.castShadow = true; skull.receiveShadow = true; head.add(skull);

  // ears (soft)
  if (L.ears !== 'none') for (const s of [-1, 1]) {
    if (L.ears === 'pointy') { const e = cone(head, 0.05, 0.2, skin, s * 0.2 * hw, 0.05, 0); e.rotation.z = -s * 1.25; }
    else ball(head, L.ears === 'big' ? 0.07 : 0.05, skin, s * 0.198 * hw, -0.01, 0, 0.5, 1, 0.9, 2);
  }
  const ex = L.eyeGap, ey = 0.02 + L.eyeY;
  // nose (painted shading for 'button' lives in the face texture; bigger noses are soft geometry)
  const nz = zAt(0, -0.04), nc = tint(skin, -0.08);
  if (L.nose === 'button') ball(head, 0.027, nc, 0, -0.04, nz + 0.012, 1, 1, 1, 1);
  if (L.nose === 'big') ball(head, 0.048, nc, 0, -0.04, nz + 0.015, 1, 1.05, 1.05, 1);
  if (L.nose === 'long') { box(head, 0.032, 0.09, 0.05, nc, 0, -0.09, nz - 0.005, 0.015); ball(head, 0.03, nc, 0, -0.06, nz + 0.04, 1, 1, 1, 1); }
  if (L.nose === 'pointy') { const n = cone(head, 0.03, 0.09, nc, 0, -0.04, nz + 0.03); n.rotation.x = Math.PI / 2 + 0.2; }
  if (L.nose === 'hook') { box(head, 0.03, 0.07, 0.04, nc, 0, -0.04, nz, 0.012); const n = cone(head, 0.03, 0.06, nc, 0, -0.085, nz + 0.03); n.rotation.x = Math.PI + 0.5; }
  // facial hair
  const fh = L.facial, fc = L.facialColor ?? L.hair;
  if (fh === 'full') { ball(head, 0.17, fc, 0, -0.12, 0.05, hw, 0.85, 0.82, 1); for (const s of [-1, 1]) ball(head, 0.075, fc, s * 0.14 * hw, -0.02, 0.06, 0.7, 1.4, 0.8, 1); }
  if (fh === 'long') { ball(head, 0.17, fc, 0, -0.12, 0.05, hw, 0.85, 0.82, 1); ell(head, 0.26 * hw, 0.56, 0.12, fc, 0, -0.45, 0.1); ell(head, 0.2, 0.3, 0.1, fc, 0, -0.76, 0.1); }
  if (fh === 'goatee') { const g = cone(head, 0.06, 0.16, fc, 0, -0.19, 0.12); g.rotation.x = Math.PI; }
  if (fh === 'mustache' || fh === 'curly' || fh === 'full' || fh === 'long') for (const s of [-1, 1]) { const m = ball(head, 0.035, fc, 0, 0, 0, 1.5, 0.6, 0.8, 2); put(m, s * 0.034, -0.078, 0.016); m.rotation.z = s * -0.25; }
  if (fh === 'curly') for (const s of [-1, 1]) ball(head, 0.022, fc, s * 0.078, -0.06, zAt(0.078, -0.06) + 0.01, 1, 1, 1, 1);
  if (fh === 'sideburns' || fh === 'mutton') for (const s of [-1, 1]) box(head, 0.045, fh === 'mutton' ? 0.14 : 0.1, 0.07, fc, s * 0.17 * hw, -0.06, 0.04, 0.02);

  // accessories
  for (const a of L.accessories) {
    if (a === 'glasses') {
      for (const s of [-1, 1]) { const r = torus(head, 0.048, 0.007, 0x6b5a48, 0, 0, 0); put(r, s * ex, ey, 0.02); }
      put(box(head, 0.03, 0.01, 0.01, 0x6b5a48, 0, 0, 0, 0.003), 0, ey, 0.02);
      for (const s of [-1, 1]) { const arm = box(head, 0.01, 0.01, 0.16, 0x6b5a48, s * 0.17 * hw, ey, -0.04, 0.003); arm.rotation.y = 0; }
    }
    if (a === 'eyepatch') { put(ball(head, 0.055, 0x2a2428, 0, 0, 0, 1, 1, 0.4, 1), -ex, ey, 0.02); const b = torus(head, 0.205, 0.008, 0x2a2428, 0, ey + 0.045, 0); b.rotation.x = Math.PI / 2 + 0.28; b.scale.set(hw, 1, 1); }
    if (a === 'scar') { const m = box(head, 0.012, 0.1, 0.01, 0xc77a7a, 0, 0, 0, 0.004); put(m, 0.11, -0.03, 0.004); m.rotation.z = 0.5; }
    if (a === 'earring') for (const s of [1]) torus(head, 0.022, 0.006, C.gold, s * 0.205 * hw, -0.06, 0.0).rotation.y = Math.PI / 2;
    if (a === 'headband') { const b = torus(head, 0.205, 0.016, L.trim, 0, 0.1, 0); b.rotation.x = Math.PI / 2; b.scale.set(hw, 1, 1); }
  }
}

// ---- hair + headwear --------------------------------------------------------------------------------------------
const HIDES_HAIR = new Set(['coif', 'hood', 'kerchief', 'bakerhat', 'pointed', 'strawhat', 'flatcap']);
function buildHair(head, L) {
  const { hairStyle: st, hair: c, headW: hw, headwear } = L;
  const covered = HIDES_HAIR.has(headwear);
  const cap = () => { if (!covered) ball(head, 0.215, c, 0, 0.05, -0.02, hw, 0.85, 1.05); };
  const fringe = (w = 0.3, h = 0.07) => { if (!covered) ball(head, 0.1, c, 0, 0.12, 0.1, 1.75 * hw * (w / 0.3), 0.5 * (h / 0.07), 1.15, 2); };
  if (st === 'short') { cap(); fringe(); if (headwear === 'hood') box(head, 0.3, 0.06, 0.08, c, 0, 0.1, 0.14, 0.03); }
  if (st === 'messy') { cap(); fringe(0.32, 0.09); for (let i = 0; i < 8; i++) { const a = i * 0.8, e = 0.5 + (i % 3) * 0.25, v = new THREE.Vector3(Math.sin(e) * Math.cos(a), Math.cos(e), Math.sin(e) * Math.sin(a)); if (v.z > 0.5 && v.y < 0.75) continue; const k = cone(head, 0.05, 0.13, c, v.x * 0.2, v.y * 0.2 + 0.04, v.z * 0.2); k.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v); } }
  if (st === 'curly') { for (let i = 0; i < 18; i++) { const a = i * 2.4, e = 0.25 + (i % 6) * 0.2, v = new THREE.Vector3(Math.sin(e) * Math.cos(a), Math.cos(e), Math.sin(e) * Math.sin(a)); if (v.z > 0.45 && v.y < 0.8) continue; ball(head, 0.075, c, v.x * 0.2 * hw, v.y * 0.19 + 0.04, v.z * 0.2, 1, 1, 1, 1); } ball(head, 0.2, c, 0, 0.06, -0.06, hw, 0.8, 1, 1); }
  if (st === 'puff') { ball(head, 0.27, c, 0, 0.1, -0.1, hw, 1, 1, 1); }
  if (st === 'long') { cap(); fringe(); ell(head, 0.44 * hw, 0.66, 0.22, c, 0, -0.2, -0.13); for (const s of [-1, 1]) ell(head, 0.11, 0.42, 0.22, c, s * 0.19 * hw, -0.14, 0.0); }
  if (st === 'bob') { cap(); fringe(0.32, 0.08); ell(head, 0.45 * hw, 0.36, 0.22, c, 0, -0.04, -0.11); for (const s of [-1, 1]) ell(head, 0.1, 0.3, 0.24, c, s * 0.19 * hw, -0.02, -0.02); }
  if (st === 'braid') { cap(); fringe(); for (let i = 0; i < 4; i++) ball(head, 0.065 - i * 0.004, c, 0, -0.08 - i * 0.11, -0.24 - i * 0.015, 1, 1.15, 1, 1); ball(head, 0.03, C.wool, 0, -0.5, -0.29, 1, 1, 1, 1); }
  if (st === 'braids') { cap(); fringe(); for (const s of [-1, 1]) { for (let i = 0; i < 4; i++) ball(head, 0.055 - i * 0.003, c, s * 0.17, -0.06 - i * 0.1, 0.0 - i * 0.01, 1, 1.15, 1, 1); ball(head, 0.025, C.woolOchre, s * 0.17, -0.46, -0.03, 1, 1, 1, 1); } }
  if (st === 'pigtails') { cap(); fringe(); for (const s of [-1, 1]) { ball(head, 0.09, c, s * 0.25, -0.02, -0.04); ball(head, 0.035, C.woolOchre, s * 0.2, 0.06, -0.02, 1, 1, 1, 1); } }
  if (st === 'bun') { cap(); fringe(); ball(head, 0.1, c, 0, 0.27, -0.04); }
  if (st === 'twinbuns') { cap(); fringe(); for (const s of [-1, 1]) ball(head, 0.08, c, s * 0.13, 0.26, -0.03); }
  if (st === 'topknot') { cap(); fringe(); ball(head, 0.07, c, 0, 0.27, -0.03); ring(head, 0.06, 0.012, C.wool, 0.22, 1, 1).position.z = -0.03; }
  if (st === 'ponytail') { cap(); fringe(); ball(head, 0.08, c, 0, 0.12, -0.24); const t = ell(head, 0.1, 0.36, 0.1, c, 0, -0.1, -0.3); t.rotation.x = -0.2; }
  if (st === 'shaggy') { cap(); fringe(0.34, 0.1); ell(head, 0.44 * hw, 0.36, 0.2, c, 0, -0.08, -0.12); for (const s of [-1, 1]) ell(head, 0.1, 0.26, 0.2, c, s * 0.19 * hw, -0.04, 0.0); }
  if (st === 'tonsure') { const g = new THREE.SphereGeometry(0.212, 14, 6, Math.PI * 0.85, Math.PI * 1.3, Math.PI * 0.4, Math.PI * 0.26); const m = new THREE.Mesh(g, mat(c, { side: THREE.DoubleSide })); m.scale.set(hw, 1, 1.04); m.position.y = 0.0; m.castShadow = true; head.add(m); ell(head, 0.4 * hw, 0.12, 0.12, c, 0, 0.0, -0.15); }
  if (st === 'bald') { for (const s of [-1, 1]) ball(head, 0.06, c, s * 0.18 * hw, 0.0, -0.04, 0.8, 1.2, 1, 1); }
  if (st === 'receding') { ell(head, 0.42 * hw, 0.26, 0.14, c, 0, 0.04, -0.14); for (const s of [-1, 1]) ball(head, 0.08, c, s * 0.18 * hw, 0.05, -0.04, 0.8, 1.3, 1, 1); ball(head, 0.1, c, 0, 0.14, -0.14, 1.3, 0.7, 0.8, 1); }
}

function buildHeadwear(head, L) {
  const k = L.headwear, col = L.headwearColor, hw = L.headW;
  if (!k) return;
  if (k === 'coif') { ball(head, 0.225, col, 0, 0.05, -0.08, hw, 0.9, 1.05); box(head, 0.34 * hw, 0.045, 0.06, col, 0, 0.09, 0.15, 0.02); ball(head, 0.05, col, 0, -0.17, -0.08, 1, 1, 1, 1); }
  if (k === 'hood') { ball(head, 0.25, col, 0, 0.05, -0.1, hw, 0.95, 1.05); box(head, 0.36 * hw, 0.05, 0.06, col, 0, 0.11, 0.15, 0.02); const t = cone(head, 0.1, 0.34, col, 0, 0.02, -0.4); t.rotation.x = -Math.PI / 2 - 0.5; box(head, 0.5, 0.1, 0.12, col, 0, -0.2, -0.05, 0.04); }
  if (k === 'kerchief') { ball(head, 0.225, col, 0, 0.05, -0.07, hw, 0.9, 1.05); box(head, 0.34 * hw, 0.05, 0.06, col, 0, 0.1, 0.14, 0.02); ball(head, 0.06, col, 0, 0.0, -0.27, 1, 1, 1, 1); for (const s of [-1, 1]) { const t = box(head, 0.05, 0.16, 0.02, col, s * 0.04, -0.17, -0.28, 0.01); t.rotation.z = s * 0.3; } }
  if (k === 'flatcap') { ball(head, 0.225, col, 0, 0.09, -0.04, hw, 0.62, 1.0); ell(head, 0.3, 0.04, 0.17, col, 0, 0.165, 0.15); ball(head, 0.13, col, 0, 0.2, -0.04, 1.5 * hw, 0.4, 1.3, 2); }
  if (k === 'strawhat') { const b = cyl(head, 0.44, 0.46, 0.03, 0xe3c46c, 0.1, 22); b.rotation.x = -0.05; ball(head, 0.225, 0xe3c46c, 0, 0.13, -0.01, hw, 0.85, 1.05); ring(head, 0.222, 0.022, col, 0.14, hw, 1.05); }
  if (k === 'circlet') { const b = torus(head, 0.205, 0.014, C.gold, 0, 0.1, 0); b.rotation.x = Math.PI / 2; b.scale.set(hw, 1, 1); ball(head, 0.03, 0x4fb0e0, 0, 0.1, 0.21, 1, 1, 1, 1); }
  if (k === 'pointed') { ball(head, 0.225, col, 0, 0.07, -0.01, hw, 0.9, 1.05); const b = cyl(head, 0.34, 0.34, 0.025, col, 0.11, 24); b.rotation.x = -0.08; const t = cone(head, 0.17, 0.52, col, 0, 0.4, -0.06, 20); t.rotation.x = -0.22; ring(head, 0.215, 0.018, C.gold, 0.14, hw, 1.04); }
  if (k === 'bakerhat') { cyl(head, 0.2, 0.21, 0.1, col, 0.1, 18); ball(head, 0.24, col, 0, 0.32, 0, 1, 0.85, 1, 2); }
}

// ---- body -------------------------------------------------------------------------------------------------------
// Soft anatomy: ellipsoid chest on a capsule shoulder yoke, capsule limbs, a real neck, ellipsoid boots.
function buildHuman({ look, scale = 1, headScale = 1 }) {
  const L = { ...DEFAULT_LOOK, ...look };
  if (look.beard && !look.facial) L.facial = 'full';
  const { skin, shirt, pants, outfit, build: g } = L;
  const outer = new THREE.Group();
  const pivot = new THREE.Group(); pivot.scale.setScalar(scale); outer.add(pivot);
  const parts = {};
  const boot = C.leather;

  for (const [name, sx] of [['legL', -1], ['legR', 1]]) {
    const leg = new THREE.Group(); leg.position.set(sx * 0.1 * g, 0.5, 0); pivot.add(leg);
    const th = caps(leg, 0.068, 0.44, pants, 0, -0.25, 0); th.scale.z = 1.1;
    ell(leg, 0.15, 0.22, 0.17, boot, 0, -0.39, 0.005);
    ell(leg, 0.14, 0.11, 0.17, boot, 0, -0.45, 0.06);
    parts[name] = leg;
  }

  const body = new THREE.Group(); pivot.add(body); parts.body = body;
  const upper = (c, w = 0.44, y = 0.68, h = 0.62) => ell(body, w * g, h, 0.27, c, 0, y, 0);
  const yoke = (c) => { const m = caps(body, 0.075, 0.3 * g + 0.15, c, 0, 0.935, 0); m.rotation.z = Math.PI / 2; m.scale.x = 0.9; return m; };
  const skirt = (c, rt, rb, h, y) => { const m = cyl(body, rt * g, rb * g, h, c, y); m.scale.z = 0.82; return m; };
  const belt = (c, y = 0.53) => ring(body, 0.215 * g, 0.032, c, y, 1, 0.78);
  const collar = (c) => ring(body, 0.085, 0.026, c, 0.985, 1, 1);
  let sleeve = 'long', sleeveW = 0.1, sleeveC = shirt;
  if (outfit === 'gown') {
    upper(shirt); yoke(shirt); skirt(shirt, 0.19, 0.3, 0.7, 0.13);
    if (L.apron) { box(body, 0.3 * g, 0.62, 0.06, C.cream, 0, 0.12, 0.2, 0.028); ell(body, 0.3 * g, 0.34, 0.05, C.cream, 0, 0.79, 0.12); }
    belt(C.woolOchre, 0.55); collar(C.cream);
  } else if (outfit === 'dress') {
    upper(shirt); yoke(shirt); skirt(shirt, 0.19, 0.28, 0.4, 0.28);
    box(body, 0.3 * g, 0.42, 0.06, C.cream, 0, 0.1, 0.2, 0.028); belt(C.leather, 0.55); collar(C.cream);
  } else if (outfit === 'robe') {
    skirt(shirt, 0.2, 0.34, 1.0, 0.06); upper(shirt, 0.46, 0.76, 0.5); yoke(shirt);
    ring(body, 0.25 * g, 0.03, C.cream, 0.52, 1, 0.82); ring(body, 0.1, 0.03, tint(shirt, -0.2), 0.99, 1.1, 1.1);
    sleeve = 'wide'; sleeveW = 0.16;
  } else if (outfit === 'smith') {
    upper(shirt, 0.46); yoke(shirt); skirt(shirt, 0.2, 0.25, 0.34, 0.24);
    box(body, 0.34 * g, 0.7, 0.06, C.leather, 0, 0.1, 0.16, 0.028); ell(body, 0.34 * g, 0.22, 0.06, C.leather, 0, 0.9, 0.12);
    for (const s of [-1, 1]) ell(body, 0.06, 0.4, 0.05, C.leather, s * 0.13 * g, 1.03, 0.0);
    sleeve = 'rolled';
  } else if (outfit === 'jerkin') {
    upper(C.cream); yoke(C.cream); skirt(C.cream, 0.2, 0.25, 0.34, 0.24);
    ell(body, 0.47 * g, 0.56, 0.285, L.trim, 0, 0.68, 0);
    for (let i = 0; i < 4; i++) box(body, 0.1, 0.012, 0.05, C.leather, 0, 0.58 + i * 0.1, 0.14, 0.003);
    belt(C.leather); sleeveC = C.cream;
  } else if (outfit === 'noble') {
    upper(shirt); yoke(shirt); skirt(shirt, 0.2, 0.29, 0.42, 0.2);
    ring(body, 0.29 * g, 0.032, L.trim, 0.22, 1, 0.82); ring(body, 0.09, 0.03, L.trim, 0.99, 1, 1);
    const sash = ell(body, 0.1, 0.78, 0.29, L.trim, 0, 0.7, 0); sash.rotation.z = 0.7;
    belt(C.gold, 0.5);
  } else { // tunic
    upper(shirt); yoke(shirt); skirt(shirt, 0.2, 0.25, 0.34, 0.24);
    belt(C.leather); box(body, 0.06, 0.07, 0.03, C.gold, 0, 0.5, 0.165, 0.01);
    ell(body, 0.1, 0.1, 0.07, C.leather, 0.2 * g, 0.47, 0.13); collar(C.cream);
  }
  if (L.cloak != null) {
    const cl = ell(body, 0.56 * g, 1.0, 0.1, L.cloak, 0, 0.58, -0.17); cl.rotation.x = 0.05;
    ell(body, 0.54 * g, 0.2, 0.3, L.cloak, 0, 0.95, -0.04); ball(body, 0.035, C.gold, 0, 0.98, 0.15, 1, 1, 1, 2);
  }

  for (const [name, sx] of [['armL', -1], ['armR', 1]]) {
    const arm = new THREE.Group(); arm.position.set(sx * 0.26 * g, 0.935, 0); body.add(arm);
    if (sleeve === 'rolled') { caps(arm, 0.07, 0.24, sleeveC, 0, -0.14, 0); caps(arm, 0.05, 0.3, skin, 0, -0.34, 0); }
    else if (sleeve === 'wide') { const w = cyl(arm, 0.07, sleeveW * 0.62, 0.38, sleeveC, -0.42); w.scale.z = 0.8; ball(arm, 0.075, sleeveC, 0, -0.03, 0, 1, 1, 1, 2); }
    else { caps(arm, 0.062, 0.4, sleeveC, 0, -0.2, 0); ring(arm, 0.056, 0.014, C.cream, -0.37, 1, 1); }
    ball(arm, 0.055, skin, 0, -0.45, 0, 1, 1, 1, 2);
    parts[name] = arm;
  }

  // neck: bridges the chest and the head so the head never floats
  cyl(body, 0.052, 0.062, 0.14, skin, 0.96);
  const head = new THREE.Group(); head.position.set(0, 1.17, 0); head.scale.setScalar(headScale); body.add(head);
  buildFace(head, L); buildHair(head, L); buildHeadwear(head, L);
  parts.head = head;
  return { root: outer, pivot, parts };
}

export const SPECIES = { human: buildHuman };
export function buildPerson(cfg) { return (SPECIES[cfg.species || 'human'] || buildHuman)(cfg); }
