// Rigged low-poly people with a parametric face / hair / outfit system.
// A "species" builder returns { root, pivot, parts }; parts are named pivots (legL, legR, armL, armR, body, head,
// optional tail) so the animation layer works for any body. New species = new builder in SPECIES.
import * as THREE from 'three';
import { box } from './models.js';
import { C, mat } from './palette.js';
import { HEAD_R, headGeometry, headMaterial, headBottom } from './face.js';
import { buildHair } from './hair.js';
import { buildHat } from './headwear.js';
import { buildFacialHair } from './facialhair.js';

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
// tapered rounded limb segment (lathe): radius rt at the top, rb at the bottom, total height h, centred at y
const taperGeo = new Map();
function taper(parent, rt, rb, h, color, x, y, z, sz = 1) {
  const key = [rt, rb, h].join();
  let g = taperGeo.get(key);
  if (!g) {
    const pts = [[0, h / 2], [rt * 0.55, h / 2 - rt * 0.12], [rt * 0.95, h / 2 - rt * 0.5], [rt, h / 2 - rt * 0.95], [(rt + rb) / 2, 0],
      [rb, -h / 2 + rb * 0.95], [rb * 0.95, -h / 2 + rb * 0.5], [rb * 0.55, -h / 2 + rb * 0.12], [0, -h / 2]];
    g = new THREE.LatheGeometry(new THREE.SplineCurve(pts.map(([r, yy]) => new THREE.Vector2(r, yy))).getPoints(26), 18);
    taperGeo.set(key, g);
  }
  const m = new THREE.Mesh(g, smooth(color)); m.position.set(x, y, z); m.scale.z = sz; m.castShadow = m.receiveShadow = true; parent.add(m); return m;
}
// mitten hand: flattened palm plus a thumb, so hands are not just balls
function hand(arm, color, y) {
  const g = new THREE.Group(); g.position.y = y; arm.add(g);
  ell(g, 0.085, 0.1, 0.06, color, 0, -0.035, 0);
  const t = ell(g, 0.035, 0.06, 0.035, color, 0.04, -0.03, 0.025); t.rotation.z = -0.5;
  return g;
}
function ring(parent, r, tube, color, y, sx = 1, sz = 0.8) {
  const m = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 8, 22), smooth(color));
  m.rotation.x = Math.PI / 2; m.scale.set(sx, sz, 1); m.position.y = y; m.castShadow = true; parent.add(m); return m;
}
// One continuous torso: neck base -> sloped shoulders -> chest -> waist (lathe from a smooth profile curve, depth-squashed).
const TORSO = [[0, 1.045], [0.07, 1.04], [0.125, 1.012], [0.185, 0.968], [0.232, 0.92], [0.248, 0.86], [0.228, 0.76], [0.2, 0.64], [0.185, 0.55], [0.205, 0.46], [0.22, 0.4], [0, 0.35]];
const VEST = [[0.262, 0.87], [0.256, 0.8], [0.244, 0.74], [0.219, 0.62], [0.213, 0.5], [0.224, 0.4], [0, 0.35]]; // open-topped shell just outside the torso
const torsoGeo = new Map();
function torso(parent, g, color, pts = TORSO) {
  let geo = torsoGeo.get(pts);
  if (!geo) { geo = new THREE.LatheGeometry(new THREE.SplineCurve(pts.map(([r, y]) => new THREE.Vector2(r, y))).getPoints(28), 28); torsoGeo.set(pts, geo); }
  const m = new THREE.Mesh(geo, smooth(color)); m.scale.set(g, 1, 0.6); m.castShadow = m.receiveShadow = true; parent.add(m); return m;
}
// Rolled collar that grows out of the shoulders and wraps the neck (a lathe squashed to the chest depth),
// so there is no separate ring floating around a bare strip of neck.
const COLLAR = [[0.17, 0.95], [0.15, 0.98], [0.12, 1.008], [0.095, 1.03], [0.075, 1.045], [0.06, 1.047], [0.05, 1.035], [0.05, 0.98]];
let collarGeo = null;
function collarMesh(parent, g, color, k = 1) {
  if (!collarGeo) collarGeo = new THREE.LatheGeometry(new THREE.SplineCurve(COLLAR.map(([r, y]) => new THREE.Vector2(r, y))).getPoints(24), 28);
  const m = new THREE.Mesh(collarGeo, smooth(color)); m.scale.set(g * k, 1, 0.7 * k); m.castShadow = m.receiveShadow = true; parent.add(m); return m;
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

  // ears: a flattened shell with a darker inner hollow, set just behind the centre line of the head
  if (L.ears !== 'none') for (const s of [-1, 1]) {
    const earC = tint(skin, -0.06), inner = tint(skin, -0.22), ex0 = s * 0.196 * hw, big = L.ears === 'big' ? 1.35 : 1;
    if (L.ears === 'pointy') {
      const e = ell(head, 0.03, 0.09 * 1.7, 0.075, skin, ex0 + s * 0.02, 0.07, -0.02, 14); e.rotation.z = -s * 0.9;
      const ei = ell(head, 0.012, 0.09, 0.04, inner, ex0 + s * 0.035, 0.07, -0.015, 10); ei.rotation.z = -s * 0.9;
    } else {
      ell(head, 0.03 * big, 0.105 * big, 0.08 * big, earC, ex0 + s * 0.012, 0.0, -0.025, 14).rotation.z = -s * 0.12;
      ell(head, 0.012, 0.06 * big, 0.04 * big, inner, ex0 + s * 0.024, 0.0, -0.02, 10);
    }
  }
  const ex = L.eyeGap, ey = 0.02 + L.eyeY;
  // nose: soft ellipsoids (the 'button' nose also has painted shading in the face texture)
  const nz = zAt(0, -0.04) - 0.012, nc = tint(skin, -0.05);
  const nose = (w, h, d, y, tilt = 0, tip = 0) => {
    const m = ell(head, w, h, d, nc, 0, y, nz + d * 0.3, 16); m.rotation.x = tilt;
    if (tip) ell(head, w * 0.9, tip, d * 0.8, nc, 0, y - h * 0.42, nz + d * 0.62, 14);
  };
  if (L.nose === 'button') nose(0.05, 0.044, 0.046, -0.042);
  if (L.nose === 'big') nose(0.085, 0.07, 0.07, -0.046);
  if (L.nose === 'long') nose(0.05, 0.115, 0.06, -0.06, 0.12);
  if (L.nose === 'pointy') nose(0.04, 0.095, 0.07, -0.056, 0.3);
  if (L.nose === 'hook') nose(0.046, 0.08, 0.055, -0.052, 0.05, 0.04);
  buildFacialHair(head, L, zAt);

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
function buildHeadwear(head, L) {
  if (L.headwear === 'circlet') { // slim gold band with a gem
    const b = torus(head, 0.205, 0.014, C.gold, 0, 0.1, 0); b.rotation.x = Math.PI / 2; b.scale.set(L.headW, 1, 1); ball(head, 0.03, 0x4fb0e0, 0, 0.1, 0.21, 1, 1, 1, 2);
    return;
  }
  buildHat(head, L);
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
    taper(leg, 0.078, 0.056, 0.46, pants, 0, -0.25, 0, 1.05);
    ell(leg, 0.158, 0.21, 0.175, boot, 0, -0.395, 0.005);
    ell(leg, 0.15, 0.115, 0.215, boot, 0, -0.45, 0.065);
    parts[name] = leg;
  }

  const body = new THREE.Group(); pivot.add(body); parts.body = body;
  const upper = (c) => torso(body, g, c);
  const yoke = () => {};
  const skirt = (c, rt, rb, h, y) => { const m = cyl(body, rt * g, rb * g, h, c, y); m.scale.z = 0.82; return m; };
  const belt = (c, y = 0.53) => ring(body, 0.215 * g, 0.032, c, y, 1, 0.78);
  const collar = (c, k = 1) => collarMesh(body, g, c, k);
  let sleeve = 'long', sleeveW = 0.1, sleeveC = shirt;
  if (outfit === 'gown') {
    upper(shirt); yoke(shirt); skirt(shirt, 0.19, 0.3, 0.7, 0.13);
    if (L.apron) { box(body, 0.3 * g, 0.62, 0.06, C.cream, 0, 0.12, 0.2, 0.028); ell(body, 0.3 * g, 0.34, 0.05, C.cream, 0, 0.79, 0.12); }
    belt(C.woolOchre, 0.55); collar(C.cream);
  } else if (outfit === 'dress') {
    upper(shirt); yoke(shirt); skirt(shirt, 0.19, 0.28, 0.4, 0.28);
    box(body, 0.3 * g, 0.42, 0.06, C.cream, 0, 0.1, 0.2, 0.028); belt(C.leather, 0.55); collar(C.cream);
  } else if (outfit === 'robe') {
    skirt(shirt, 0.19, 0.34, 0.8, 0.06); upper(shirt);
    ring(body, 0.23 * g, 0.03, C.cream, 0.52, 1, 0.82); collar(tint(shirt, -0.2), 1.08);
    sleeve = 'wide'; sleeveW = 0.16;
  } else if (outfit === 'smith') {
    upper(shirt); skirt(shirt, 0.2, 0.25, 0.34, 0.24); collar(shirt, 1.05);
    box(body, 0.34 * g, 0.7, 0.06, C.leather, 0, 0.1, 0.16, 0.028); box(body, 0.27 * g, 0.24, 0.05, C.leather, 0, 0.66, 0.15, 0.02);
    sleeve = 'rolled';
  } else if (outfit === 'jerkin') {
    upper(C.cream); skirt(C.cream, 0.2, 0.25, 0.34, 0.24);
    torso(body, g, L.trim, VEST).scale.z = 0.64;
    for (let i = 0; i < 4; i++) box(body, 0.1, 0.012, 0.05, C.leather, 0, 0.58 + i * 0.1, 0.14, 0.003);
    belt(C.leather); sleeveC = C.cream;
  } else if (outfit === 'noble') {
    upper(shirt); yoke(shirt); skirt(shirt, 0.2, 0.29, 0.42, 0.2);
    ring(body, 0.29 * g, 0.032, L.trim, 0.22, 1, 0.82); collar(L.trim);
    const sash = ell(body, 0.09, 0.78, 0.3, L.trim, 0, 0.7, 0.0); sash.rotation.z = 0.62;
    belt(C.gold, 0.5);
  } else { // tunic
    upper(shirt); yoke(shirt); skirt(shirt, 0.2, 0.25, 0.34, 0.24);
    belt(C.leather); box(body, 0.06, 0.07, 0.03, C.gold, 0, 0.5, 0.165, 0.01);
    ell(body, 0.1, 0.1, 0.07, C.leather, 0.2 * g, 0.47, 0.13); collar(C.cream);
  }
  if (L.cloak != null) {
    const cl = ell(body, 0.56 * g, 1.0, 0.1, L.cloak, 0, 0.58, -0.17); cl.rotation.x = 0.05;
    ell(body, 0.5 * g, 0.16, 0.28, L.cloak, 0, 0.95, -0.05); ball(body, 0.035, C.gold, 0, 0.98, 0.15, 1, 1, 1, 2);
  }

  for (const [name, sx] of [['armL', -1], ['armR', 1]]) {
    const arm = new THREE.Group(); arm.position.set(sx * 0.235 * g, 0.925, 0); arm.rotation.z = sx * 0.12; body.add(arm);
    if (sleeve === 'rolled') { taper(arm, 0.078, 0.072, 0.3, sleeveC, 0, -0.14, 0); taper(arm, 0.056, 0.042, 0.3, skin, 0, -0.34, 0); hand(arm, skin, -0.5); }
    else if (sleeve === 'wide') { taper(arm, 0.08, 0.125, 0.44, sleeveC, 0, -0.2, 0, 0.88); taper(arm, 0.042, 0.04, 0.12, skin, 0, -0.44, 0); hand(arm, skin, -0.5); }
    else { taper(arm, 0.076, 0.078, 0.42, sleeveC, 0, -0.19, 0); ring(arm, 0.074, 0.016, C.cream, -0.375, 1, 1); taper(arm, 0.044, 0.04, 0.12, skin, 0, -0.43, 0); hand(arm, skin, -0.48); }
    parts[name] = arm;
  }

  // neck: bridges the chest and the head so the head never floats
  const hy = Math.max(1.13, 0.93 + headBottom(L) * headScale), chinY = hy - headBottom(L) * headScale;
  cyl(body, 0.052, 0.064, chinY + 0.05 - 0.93, skin, 0.93); // neck reaches up into the chin
  const head = new THREE.Group(); head.position.set(0, hy, 0); head.scale.setScalar(headScale); body.add(head);
  buildFace(head, L); buildHair(head, L); buildHeadwear(head, L);
  parts.head = head;
  return { root: outer, pivot, parts };
}

// ---- Rayman-style body: a shaped garment, floating sphere hands, no arms, legs or neck -----------------------------
// The head sinks into a rolled collar; the garment hem hovers just above the ground. Silhouette comes from the outfit.
const GARMENT = { // [radius, y] profiles (top -> hem); lathe, scaled by build and squashed front-to-back
  short: [[0, 1.03], [0.1, 1.0], [0.19, 0.93], [0.235, 0.78], [0.225, 0.58], [0.25, 0.4], [0.275, 0.2], [0.28, 0.12], [0, 0.1]],
  bell: [[0, 1.03], [0.1, 1.0], [0.19, 0.93], [0.23, 0.78], [0.22, 0.6], [0.28, 0.38], [0.34, 0.18], [0.35, 0.12], [0, 0.1]],
  long: [[0, 1.03], [0.1, 1.0], [0.19, 0.93], [0.24, 0.78], [0.235, 0.6], [0.29, 0.4], [0.35, 0.2], [0.36, 0.12], [0, 0.1]],
};
const garmentGeo = new Map();
function garment(parent, g, color, key, k = 1, zs = 0.82) {
  let geo = garmentGeo.get(key);
  if (!geo) { geo = new THREE.LatheGeometry(new THREE.SplineCurve(GARMENT[key].map(([r, y]) => new THREE.Vector2(r, y))).getPoints(34).reverse(), 32); garmentGeo.set(key, geo); }
  const m = new THREE.Mesh(geo, smooth(color)); m.scale.set(g * k, 1, zs * k); m.castShadow = m.receiveShadow = true; parent.add(m); return m;
}
// a band of the garment surface (between two heights, a slice of the angle around it) lifted slightly off the cloth:
// aprons, bibs, vests, front trims and cloaks that wrap the body instead of poking out of it
function panel(parent, g, color, key, yBot, yTop, phiStart, phiLen, k = 1.035, zs = 0.82) {
  const crv = new THREE.SplineCurve(GARMENT[key].map(([r, y]) => new THREE.Vector2(r, y))).getPoints(60).filter((q) => q.y >= yBot && q.y <= yTop).reverse();
  const geo = new THREE.LatheGeometry(crv, Math.max(8, Math.round(phiLen * 8)), phiStart, phiLen);
  const m = new THREE.Mesh(geo, mat(color, { flatShading: false, side: THREE.DoubleSide })); m.scale.set(g * k, 1, zs * k); m.castShadow = m.receiveShadow = true; parent.add(m); return m;
}
const FRONT = (half) => [-half, half * 2], BACK = (half) => [Math.PI - half, half * 2];
function buildRay({ look, scale = 1, headScale = 1 }) {
  const L = { ...DEFAULT_LOOK, ...look };
  if (look.beard && !look.facial) L.facial = 'full';
  const { skin, shirt, outfit, build: g } = L, trim = L.trim ?? C.gold;
  const outer = new THREE.Group(), pivot = new THREE.Group(); pivot.scale.setScalar(scale); outer.add(pivot);
  const parts = { legL: new THREE.Group(), legR: new THREE.Group() }; // legs are not drawn; kept so the animation layer still works
  parts.legL.position.set(-0.1, 0.5, 0); parts.legR.position.set(0.1, 0.5, 0); pivot.add(parts.legL, parts.legR);
  const body = new THREE.Group(); pivot.add(body); parts.body = body;
  const hem = (c, r, y = 0.14) => ring(body, r * g, 0.028, c, y, 1, 0.82);
  const belt = (c, y = 0.56) => ring(body, 0.225 * g, 0.032, c, y, 1, 0.82);
  const collar = (c) => { const m = collarMesh(body, g * 1.2, c, 1); m.position.y = -0.02; return m; };
  if (L.cloak != null) panel(body, g, L.cloak, outfit === 'robe' || outfit === 'noble' ? 'long' : outfit === 'gown' || outfit === 'dress' ? 'bell' : 'short', 0.14, 0.97, ...BACK(1.25), 1.07);
  if (outfit === 'gown' || outfit === 'dress') {
    garment(body, g, shirt, 'bell'); belt(outfit === 'gown' ? C.woolOchre : C.leather, 0.58); hem(C.cream, 0.352); collar(C.cream);
    if (L.apron || outfit === 'dress') { panel(body, g, C.cream, 'bell', 0.15, 0.56, ...FRONT(0.55)); panel(body, g, C.cream, 'bell', 0.6, 0.86, ...FRONT(0.3)); }
  } else if (outfit === 'robe') {
    garment(body, g, shirt, 'long'); belt(C.cream, 0.58); hem(C.cream, 0.362); collar(tint(shirt, -0.2));
    panel(body, g, C.cream, 'long', 0.14, 0.9, ...FRONT(0.1));
  } else if (outfit === 'noble') {
    garment(body, g, shirt, 'long'); hem(trim, 0.362); belt(C.gold, 0.56); collar(trim);
    panel(body, g, trim, 'long', 0.14, 0.9, ...FRONT(0.16)); panel(body, g, tint(shirt, -0.25), 'long', 0.3, 0.8, ...BACK(0.9), 1.04);
  } else if (outfit === 'smith') {
    garment(body, g, shirt, 'short'); collar(shirt);
    panel(body, g, C.leather, 'short', 0.14, 0.62, ...FRONT(0.6)); panel(body, g, C.leather, 'short', 0.64, 0.88, ...FRONT(0.34)); belt(C.leather, 0.54);
  } else if (outfit === 'jerkin') {
    garment(body, g, C.cream, 'short'); panel(body, g, trim, 'short', 0.42, 0.93, 0.28, Math.PI * 2 - 0.56, 1.04); collar(C.cream); belt(C.leather, 0.55);
    for (let i = 0; i < 4; i++) ell(body, 0.1, 0.02, 0.03, C.leather, 0, 0.62 + i * 0.1, 0.205, 8);
  } else { // tunic
    garment(body, g, shirt, 'short'); belt(C.leather); hem(C.cream, 0.282); collar(C.cream);
    box(body, 0.06, 0.07, 0.03, C.gold, 0, 0.53, 0.22, 0.01); ell(body, 0.1, 0.1, 0.06, C.leather, 0.23 * g, 0.5, 0.12, 12);
  }

  for (const [name, sx] of [['armL', -1], ['armR', 1]]) { // floating sphere hands (the arm group is just the swing pivot)
    const arm = new THREE.Group(); arm.position.set(sx * 0.3 * g, 0.82, 0); arm.rotation.z = sx * 0.08; body.add(arm);
    ball(arm, 0.08, skin, sx * 0.07, -0.34, 0.03, 1, 1, 1, 3);
    parts[name] = arm;
  }
  const hs = headScale * 1.1, hy = 1.14 + (headBottom(L) - 0.2) * 0.8;
  const head = new THREE.Group(); head.position.set(0, hy, 0); head.scale.setScalar(hs); body.add(head);
  buildFace(head, L); buildHair(head, L); buildHeadwear(head, L);
  parts.head = head;
  return { root: outer, pivot, parts };
}

export const SPECIES = { human: buildHuman, ray: buildRay };
export function buildPerson(cfg) { return (SPECIES[cfg.species || 'ray'] || buildRay)(cfg); }
