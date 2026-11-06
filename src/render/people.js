// Rigged low-poly people. A "species" builder returns { root, pivot, parts } where parts are named pivots
// (legL, legR, armL, armR, body, head, plus optional tail/ears). The animation layer only touches those
// names, so non-human bodies (goblins, wolf-folk, ...) can be added as new builders in SPECIES.
import * as THREE from 'three';
import { box } from './models.js';
import { C, mat } from './palette.js';

function ball(parent, r, color, x, y, z, sx = 1, sy = 1, sz = 1, detail = 2) {
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, detail), mat(color));
  m.position.set(x, y, z); m.scale.set(sx, sy, sz);
  m.castShadow = true; m.receiveShadow = true;
  parent.add(m); return m;
}
function cyl(parent, rt, rb, h, color, y, seg = 12) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat(color));
  m.position.y = y + h / 2; m.castShadow = true; m.receiveShadow = true;
  parent.add(m); return m;
}
function cone(parent, r, h, color, x, y, z) {
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 6), mat(color));
  m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m;
}

function buildHair(head, style, color, headwear) {
  // under a coif/hood the scalp is covered: skip the cap, keep tails and (for hoods) a peeking fringe
  if (!headwear) ball(head, 0.215, color, 0, 0.05, -0.02, 1, 0.85, 1.05);
  if (style === 'short' && headwear !== 'coif') box(head, 0.3, 0.06, 0.08, color, 0, headwear ? 0.1 : 0.13, 0.14, 0.03);
  if (style === 'braid') {
    if (!headwear) box(head, 0.3, 0.07, 0.1, color, 0, 0.13, 0.14, 0.03);
    for (let i = 0; i < 4; i++) ball(head, 0.065 - i * 0.004, color, 0, -0.08 - i * 0.11, -0.24 - i * 0.015, 1, 1.15, 1, 1);
    ball(head, 0.03, C.wool, 0, -0.5, -0.29, 1, 1, 1, 1);
  }
  if (style === 'long') {
    box(head, 0.4, 0.5, 0.12, color, 0, -0.38, -0.14, 0.04);
    box(head, 0.08, 0.3, 0.2, color, -0.2, -0.2, 0, 0.03); box(head, 0.08, 0.3, 0.2, color, 0.2, -0.2, 0, 0.03);
  }
  if (style === 'pigtails') {
    box(head, 0.3, 0.07, 0.1, color, 0, 0.13, 0.14, 0.03);
    for (const s of [-1, 1]) { ball(head, 0.09, color, s * 0.25, -0.02, -0.04); ball(head, 0.035, C.woolOchre, s * 0.2, 0.06, -0.02, 1, 1, 1, 1); }
  }
}

function buildHeadwear(head, kind, color) {
  if (kind === 'coif') {            // linen cap tied under the chin
    ball(head, 0.225, color, 0, 0.05, -0.08, 1, 0.9, 1.05);
    box(head, 0.34, 0.045, 0.06, color, 0, 0.09, 0.15, 0.02);
    ball(head, 0.05, color, 0, -0.17, -0.08, 1, 1, 1, 1);
  }
  if (kind === 'hood') {            // pointed hood
    ball(head, 0.25, color, 0, 0.05, -0.1, 1, 0.95, 1.05);
    box(head, 0.36, 0.05, 0.06, color, 0, 0.11, 0.15, 0.02);
    const tip = cone(head, 0.1, 0.34, color, 0, 0.02, -0.34); tip.rotation.x = -Math.PI / 2 - 0.5; tip.position.set(0, 0.02, -0.4);
    box(head, 0.5, 0.1, 0.12, color, 0, -0.2, -0.05, 0.04);                 // shoulder cape
  }
}

function humanFeatures(head, look, skin) {
  ball(head, 0.2, skin, 0, 0, 0);
  ball(head, 0.03, C.black, -0.07, 0.0, 0.18, 1, 1.3, 0.6, 1); ball(head, 0.03, C.black, 0.07, 0.0, 0.18, 1, 1.3, 0.6, 1);
  ball(head, 0.032, 0xf0a0a0, -0.125, -0.05, 0.15, 1, 0.7, 0.5, 1); ball(head, 0.032, 0xf0a0a0, 0.125, -0.05, 0.15, 1, 0.7, 0.5, 1);
  ball(head, 0.025, skin, 0, -0.03, 0.2, 1, 1, 1, 1);
  box(head, 0.07, 0.015, 0.02, 0x9a5a4a, 0, -0.1, 0.185, 0.005);
  if (look.ears === 'pointy') for (const s of [-1, 1]) { const e = cone(head, 0.05, 0.22, skin, s * 0.22, 0.04, 0); e.rotation.z = -s * 1.2; }
  if (look.beard) box(head, 0.26, 0.14, 0.12, look.hair, 0, -0.14, 0.12, 0.05);
}

function buildHuman({ look, scale = 1, headScale = 1 }) {
  const { skin, hair, hairStyle, outfit, shirt, pants, headwear, headwearColor } = look;
  const outer = new THREE.Group();
  const pivot = new THREE.Group(); pivot.scale.setScalar(scale); outer.add(pivot);
  const parts = {};
  const boot = C.leather;

  for (const [name, sx] of [['legL', -1], ['legR', 1]]) {
    const leg = new THREE.Group(); leg.position.set(sx * 0.1, 0.5, 0); pivot.add(leg);
    box(leg, 0.14, 0.46, 0.16, pants, 0, -0.46, 0, 0.05);                   // hose
    box(leg, 0.155, 0.22, 0.17, boot, 0, -0.5, 0, 0.04);                    // boot shaft
    box(leg, 0.155, 0.07, 0.26, boot, 0, -0.5, 0.04, 0.03);                 // toe
    parts[name] = leg;
  }

  const body = new THREE.Group(); pivot.add(body); parts.body = body;
  if (outfit === 'gown') {
    box(body, 0.4, 0.4, 0.25, shirt, 0, 0.5, 0, 0.1);
    cyl(body, 0.19, 0.3, 0.7, shirt, 0.13, 14).scale.set(1, 1, 0.9);       // long skirt
    box(body, 0.3, 0.62, 0.03, C.cream, 0, 0.2, 0.2, 0.015);              // apron
    box(body, 0.3, 0.3, 0.03, C.cream, 0, 0.62, 0.14, 0.015);
    box(body, 0.43, 0.06, 0.27, C.woolOchre, 0, 0.55, 0, 0.02);            // cord belt
  } else {
    box(body, 0.42, 0.52, 0.26, shirt, 0, 0.5, 0, 0.1);                    // tunic body
    box(body, 0.46, 0.26, 0.3, shirt, 0, 0.3, 0, 0.08);                    // tunic skirt
    box(body, 0.45, 0.07, 0.29, C.leather, 0, 0.52, 0, 0.02);              // belt
    box(body, 0.06, 0.07, 0.03, C.gold, 0, 0.52, 0.15, 0.01);              // buckle
    box(body, 0.1, 0.1, 0.07, C.leather, 0.2, 0.43, 0.14, 0.03);           // pouch
    box(body, 0.46, 0.06, 0.28, C.cream, 0, 0.97, 0, 0.02);                // collar
  }

  for (const [name, sx] of [['armL', -1], ['armR', 1]]) {
    const arm = new THREE.Group(); arm.position.set(sx * 0.27, 1.0, 0); body.add(arm);
    box(arm, 0.1, 0.34, 0.12, shirt, 0, -0.32, 0, 0.04);
    box(arm, 0.095, 0.05, 0.12, C.cream, 0, -0.35, 0, 0.02);                // cuff
    box(arm, 0.075, 0.1, 0.09, skin, 0, -0.43, 0, 0.03);
    ball(arm, 0.055, skin, 0, -0.46, 0, 1, 1, 1, 1);
    parts[name] = arm;
  }

  const head = new THREE.Group(); head.position.set(0, 1.2, 0); head.scale.setScalar(headScale); body.add(head);
  humanFeatures(head, look, skin);
  buildHair(head, hairStyle, hair, headwear);
  if (headwear) buildHeadwear(head, headwear, headwearColor ?? C.linen);
  parts.head = head;

  return { root: outer, pivot, parts };
}

export const SPECIES = { human: buildHuman };

export function buildPerson(cfg) {
  return (SPECIES[cfg.species || 'human'] || buildHuman)(cfg);
}
