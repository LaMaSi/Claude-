// Rigged low-poly person: hip/shoulder pivots so we can animate walking, sitting, lying.
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

function buildHair(head, style, color) {
  ball(head, 0.215, color, 0, 0.05, -0.02, 1, 0.85, 1.05);                   // cap
  if (style === 'short') box(head, 0.3, 0.07, 0.1, color, 0, 0.13, 0.14, 0.03);
  if (style === 'ponytail') {
    box(head, 0.3, 0.07, 0.1, color, 0, 0.13, 0.14, 0.03);
    ball(head, 0.09, color, 0, 0.0, -0.25);
    box(head, 0.08, 0.3, 0.08, color, 0, -0.32, -0.27, 0.03);
  }
  if (style === 'long') {
    box(head, 0.4, 0.5, 0.12, color, 0, -0.38, -0.14, 0.04);
    box(head, 0.08, 0.3, 0.2, color, -0.2, -0.2, 0, 0.03); box(head, 0.08, 0.3, 0.2, color, 0.2, -0.2, 0, 0.03);
  }
  if (style === 'bun') ball(head, 0.1, color, 0, 0.27, -0.04);
  if (style === 'pigtails') {
    box(head, 0.3, 0.07, 0.1, color, 0, 0.13, 0.14, 0.03);
    for (const s of [-1, 1]) { ball(head, 0.09, color, s * 0.25, -0.02, -0.04); ball(head, 0.035, 0xf2a0b8, s * 0.2, 0.06, -0.02, 1, 1, 1, 1); }
  }
}

export function buildPerson({ look, scale = 1, headScale = 1 }) {
  const { skin, hair, hairStyle, outfit, shirt, pants } = look;
  const outer = new THREE.Group();
  const pivot = new THREE.Group(); pivot.scale.setScalar(scale); outer.add(pivot);
  const parts = {};

  // legs (hip pivot at y = 0.5)
  for (const [name, sx] of [['legL', -1], ['legR', 1]]) {
    const leg = new THREE.Group(); leg.position.set(sx * 0.1, 0.5, 0); pivot.add(leg);
    const short = outfit === 'overalls';
    const lower = outfit === 'dress' ? skin : pants;
    box(leg, 0.14, short ? 0.2 : 0.46, 0.16, short ? pants : lower, 0, short ? -0.2 : -0.46, 0, 0.05);
    if (short) box(leg, 0.12, 0.3, 0.14, skin, 0, -0.5, 0, 0.04);
    box(leg, 0.15, 0.08, 0.24, outfit === 'dress' ? 0xf4eee2 : 0xf4eee2, 0, -0.5, 0.04, 0.03);
    parts[name] = leg;
  }

  // upper body group (bobs while walking)
  const body = new THREE.Group(); pivot.add(body); parts.body = body;
  if (outfit === 'dress') {
    box(body, 0.4, 0.4, 0.25, shirt, 0, 0.5, 0, 0.1);
    cyl(body, 0.19, 0.3, 0.38, shirt, 0.32, 14).scale.set(1, 1, 0.85);
  } else {
    box(body, 0.42, 0.52, 0.26, shirt, 0, 0.5, 0, 0.1);
    if (outfit === 'overalls') { box(body, 0.44, 0.22, 0.27, pants, 0, 0.5, 0, 0.08); box(body, 0.06, 0.3, 0.27, pants, -0.12, 0.7, 0, 0.02); box(body, 0.06, 0.3, 0.27, pants, 0.12, 0.7, 0, 0.02); }
  }

  // arms (shoulder pivot at y = 1.0)
  for (const [name, sx] of [['armL', -1], ['armR', 1]]) {
    const arm = new THREE.Group(); arm.position.set(sx * 0.27, 1.0, 0); body.add(arm);
    box(arm, 0.1, 0.24, 0.12, shirt, 0, -0.22, 0, 0.04);
    box(arm, 0.085, 0.2, 0.1, skin, 0, -0.42, 0, 0.035);
    ball(arm, 0.055, skin, 0, -0.45, 0, 1, 1, 1, 1);
    parts[name] = arm;
  }

  // head
  const head = new THREE.Group(); head.position.set(0, 1.2, 0); head.scale.setScalar(headScale); body.add(head);
  ball(head, 0.2, skin, 0, 0, 0);
  ball(head, 0.03, C.black, -0.07, 0.0, 0.18, 1, 1.3, 0.6, 1); ball(head, 0.03, C.black, 0.07, 0.0, 0.18, 1, 1.3, 0.6, 1);
  ball(head, 0.032, 0xf5a3a3, -0.125, -0.05, 0.15, 1, 0.7, 0.5, 1); ball(head, 0.032, 0xf5a3a3, 0.125, -0.05, 0.15, 1, 0.7, 0.5, 1);
  ball(head, 0.025, skin, 0, -0.03, 0.2, 1, 1, 1, 1);
  box(head, 0.07, 0.015, 0.02, 0x9a5a4a, 0, -0.1, 0.185, 0.005);
  buildHair(head, hairStyle, hair);
  parts.head = head;

  return { root: outer, pivot, parts };
}
