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
// A hair "lock": a flattened, pointed, optionally curved strand (lathe, deformed), rooted on the scalp ellipsoid.
// az: 0 = front, +/-pi/2 = sides, pi = back; el: 0 = crown ... pi/2 = equator. Direction runs downhill along the scalp,
// blended with outward (out) and sideways (sweep); curl bends the tip sideways, curlN bends it away from / into the head.
const lockGeo = new Map();
function lockGeometry(curl, curlN) {
  const key = curl + '|' + curlN;
  let g = lockGeo.get(key);
  if (g) return g;
  const pts = [[0, 0], [0.55, -0.04], [0.92, -0.14], [1, -0.3], [0.86, -0.56], [0.5, -0.8], [0.2, -0.94], [0, -1]];
  g = new THREE.LatheGeometry(new THREE.SplineCurve(pts.map(([r, y]) => new THREE.Vector2(r, y))).getPoints(18), 10);
  const P = g.attributes.position;
  for (let i = 0; i < P.count; i++) { const t = -P.getY(i); P.setX(i, P.getX(i) + curl * t * t); P.setZ(i, P.getZ(i) * 0.5 + curlN * t * t); }
  g.computeVertexNormals(); lockGeo.set(key, g); return g;
}
// scalp cap: a sphere section that stops at the hairline (clear brow and eyes) and drops lower at the nape
let capGeo = null;
function scalpCap() {
  if (capGeo) return capGeo;
  const maxT = 1.22, g = new THREE.SphereGeometry(1, 30, 16, 0, Math.PI * 2, 0, maxT), P = g.attributes.position;
  for (let i = 0; i < P.count; i++) {
    const nz = P.getZ(i), th = Math.acos(THREE.MathUtils.clamp(P.getY(i), -1, 1)), k = Math.max(0, -nz) * Math.pow(th / maxT, 3);
    P.setY(i, P.getY(i) - 0.75 * k); // nape: pulled down relative to the unit sphere (scaled by ry later)
  }
  g.computeVertexNormals(); capGeo = g; return g;
}
const _v = new THREE.Vector3();
function lockOn(head, color, hw, o) {
  const { az = 0, el = 0.9, len = 0.15, w = 0.05, out = 0.3, sweep = 0, curl = 0, curlN = 0, ctr = [0, 0.05, -0.02], r = [0.215, 0.183, 0.226] } = o;
  const sa = Math.sin(az), ca = Math.cos(az), se = Math.sin(el), ce = Math.cos(el);
  const n = new THREE.Vector3(se * sa, ce, se * ca).normalize();
  const root = new THREE.Vector3(ctr[0] + r[0] * hw * se * sa, ctr[1] + r[1] * ce, ctr[2] + r[2] * se * ca).addScaledVector(n, -0.025);
  const down = new THREE.Vector3(ce * sa, -se, ce * ca).normalize();
  const d = down.clone().addScaledVector(n, out).addScaledVector(_v.set(ca, 0, -sa), sweep).normalize();
  const zx = n.clone().addScaledVector(d, -n.dot(d)).normalize(), yx = d.clone().negate(), xx = new THREE.Vector3().crossVectors(yx, zx);
  const m = new THREE.Mesh(lockGeometry(curl, curlN), smooth(color));
  m.matrixAutoUpdate = true; m.position.copy(root); m.setRotationFromMatrix(new THREE.Matrix4().makeBasis(xx, yx, zx)); m.scale.set(w, len, w);
  m.castShadow = true; m.receiveShadow = true; head.add(m); return m;
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
  let n = 0; const shade = () => tint(c, ((n++ % 3) - 1) * 0.07); // strand-to-strand colour variation reads as sculpted hair
  const lk = (o) => lockOn(head, shade(), hw, o);
  const cap = () => { if (covered) return; const m = new THREE.Mesh(scalpCap(), mat(c, { flatShading: false, side: THREE.DoubleSide })); m.scale.set(0.215 * hw, 0.2, 0.226); m.position.set(0, 0.05, -0.02); m.castShadow = true; m.receiveShadow = true; head.add(m); };
  const bangs = (k = 5, len = 0.11, sweep = 0.5, el = 0.8, w = 0.056) => {
    if (covered) return;
    for (let i = 0; i < k; i++) { const t = k === 1 ? 0 : i / (k - 1) - 0.5; lk({ az: t * 1.75, el: el + Math.abs(t) * 0.3, len: len * (1 - Math.abs(t) * 0.35), w, out: 0.55, sweep: sweep * (1.1 - Math.abs(t)) + t * 0.3, curl: -sweep * 0.12 }); }
  };
  const sides = (len = 0.1, el = 1.15, w = 0.06, out = 0.2) => { for (const s of [-1, 1]) lk({ az: s * 1.4, el, len, w, out, curl: s * 0.03 }); };
  const back = (azs, len, w, el = 1.1, out = 0.2, curlN = 0) => { for (const a of azs) lk({ az: a, el: el + 0.12 * Math.abs(Math.cos(a)), len, w, out, curlN }); };
  const BACK5 = [2.15, 2.65, Math.PI, 3.63, 4.13];

  if (st === 'short') { cap(); bangs(5, 0.1, 0.5); sides(0.09); back([2.8, 3.48], 0.1, 0.07, 1.0); if (headwear === 'hood') ell(head, 0.3, 0.05, 0.1, c, 0, 0.1, 0.15); }
  if (st === 'messy') {
    cap(); bangs(4, 0.12, 0.9, 0.7, 0.06);
    for (let i = 0; i < 11; i++) { const a = 0.55 + i * 0.52, e = 0.28 + ((i * 37) % 5) * 0.2; if (Math.abs(Math.sin(a / 2)) < 0.35 && e > 0.8) continue; lk({ az: a, el: e, len: 0.15 + (i % 3) * 0.03, w: 0.052, out: 1.7, curl: 0.25 * (i % 2 ? 1 : -1) }); }
  }
  if (st === 'curly') { for (let i = 0; i < 18; i++) { const a = i * 2.4, e = 0.25 + (i % 6) * 0.2, v = new THREE.Vector3(Math.sin(e) * Math.cos(a), Math.cos(e), Math.sin(e) * Math.sin(a)); if (v.z > 0.45 && v.y < 0.8) continue; ball(head, 0.075, c, v.x * 0.2 * hw, v.y * 0.19 + 0.04, v.z * 0.2, 1, 1, 1, 2); } ball(head, 0.2, c, 0, 0.06, -0.06, hw, 0.8, 1, 2); }
  if (st === 'puff') { ball(head, 0.27, c, 0, 0.1, -0.1, hw, 1, 1, 3); }
  if (st === 'long') { cap(); bangs(5, 0.12, 0.7); for (const s of [-1, 1]) { lk({ az: s * 1.3, el: 1.1, len: 0.42, w: 0.075, out: 0.1, curl: s * 0.04 }); lk({ az: s * 1.55, el: 1.25, len: 0.36, w: 0.07, out: 0.1 }); } back(BACK5, 0.6, 0.1, 1.05, 0.15); }
  if (st === 'bob') { cap(); bangs(5, 0.12, 0.6); for (const s of [-1, 1]) lk({ az: s * 1.35, el: 1.15, len: 0.24, w: 0.075, out: 0.15, curlN: -0.06 }); back(BACK5, 0.27, 0.095, 1.05, 0.2, -0.07); }
  if (st === 'braid') { cap(); bangs(5, 0.1, 0.5); sides(0.1); for (let i = 0; i < 4; i++) ball(head, 0.065 - i * 0.004, c, 0, -0.08 - i * 0.11, -0.24 - i * 0.015, 1, 1.15, 1, 2); ball(head, 0.03, C.wool, 0, -0.5, -0.29, 1, 1, 1, 2); }
  if (st === 'braids') { cap(); bangs(5, 0.1, 0.5); for (const s of [-1, 1]) { for (let i = 0; i < 4; i++) ball(head, 0.055 - i * 0.003, c, s * 0.17, -0.06 - i * 0.1, 0.0 - i * 0.01, 1, 1.15, 1, 2); ball(head, 0.025, C.woolOchre, s * 0.17, -0.46, -0.03, 1, 1, 1, 2); } }
  if (st === 'pigtails') { cap(); bangs(5, 0.1, 0.4); for (const s of [-1, 1]) { ball(head, 0.035, C.woolOchre, s * 0.2, 0.06, -0.02, 1, 1, 1, 2); lk({ az: s * 1.5, el: 1.0, len: 0.3, w: 0.085, out: 1.1, curl: s * 0.1, curlN: 0 }); } }
  if (st === 'bun') { cap(); bangs(5, 0.1, 0.5); sides(0.08); ball(head, 0.1, c, 0, 0.27, -0.04, 1, 1, 1, 3); }
  if (st === 'twinbuns') { cap(); bangs(5, 0.09, 0.4); for (const s of [-1, 1]) ball(head, 0.08, c, s * 0.13, 0.26, -0.03, 1, 1, 1, 3); }
  if (st === 'topknot') { cap(); bangs(5, 0.08, 0.3); ball(head, 0.07, c, 0, 0.27, -0.03, 1, 1, 1, 3); ring(head, 0.06, 0.012, C.wool, 0.22, 1, 1).position.z = -0.03; }
  if (st === 'ponytail') { cap(); bangs(5, 0.1, 0.5); sides(0.08); ball(head, 0.07, c, 0, 0.12, -0.23, 1, 1, 1, 3); lk({ az: Math.PI, el: 0.95, len: 0.46, w: 0.1, out: 1.4, curlN: 0.18 }); lk({ az: Math.PI + 0.35, el: 0.95, len: 0.4, w: 0.07, out: 1.4, curlN: 0.16 }); lk({ az: Math.PI - 0.35, el: 0.95, len: 0.4, w: 0.07, out: 1.4, curlN: 0.16 }); }
  if (st === 'shaggy') { cap(); bangs(6, 0.14, 0.8, 0.75, 0.065); for (let i = 0; i < 9; i++) lk({ az: 1.2 + i * 0.47, el: 1.1 + (i % 3) * 0.12, len: 0.22 + (i % 2) * 0.05, w: 0.08, out: 0.3, curl: (i % 2 ? 1 : -1) * 0.05 }); }
  if (st === 'tonsure') { // hair ring open at the front so the brow stays clear
    const g2 = new THREE.TorusGeometry(0.19, 0.04, 8, 24, Math.PI * 1.45); g2.rotateZ(Math.PI * 0.775);
    const t = new THREE.Mesh(g2, smooth(c)); t.rotation.x = Math.PI / 2; t.scale.set(hw, 1.03, 1); t.position.y = 0.03; t.castShadow = true; head.add(t);
    back([2.4, 2.9, 3.4, 3.9], 0.13, 0.07, 1.2); sides(0.08, 1.35); }
  if (st === 'bald') { for (const s of [-1, 1]) lk({ az: s * 1.5, el: 1.35, len: 0.07, w: 0.06, out: 0.2 }); }
  if (st === 'receding') { sides(0.11, 1.05, 0.065); back([2.5, 3.14, 3.78], 0.12, 0.08, 1.1); lk({ az: 0, el: 0.45, len: 0.09, w: 0.05, out: 1.2 }); }
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
  const collar = (c) => ring(body, 0.08, 0.024, c, 1.0, 1, 1);
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
    ring(body, 0.23 * g, 0.03, C.cream, 0.52, 1, 0.82); ring(body, 0.09, 0.03, tint(shirt, -0.2), 1.0, 1.1, 1.1);
    sleeve = 'wide'; sleeveW = 0.16;
  } else if (outfit === 'smith') {
    upper(shirt); skirt(shirt, 0.2, 0.25, 0.34, 0.24);
    box(body, 0.34 * g, 0.7, 0.06, C.leather, 0, 0.1, 0.16, 0.028); box(body, 0.27 * g, 0.24, 0.05, C.leather, 0, 0.66, 0.15, 0.02);
    sleeve = 'rolled';
  } else if (outfit === 'jerkin') {
    upper(C.cream); skirt(C.cream, 0.2, 0.25, 0.34, 0.24);
    torso(body, g, L.trim, VEST).scale.z = 0.64;
    for (let i = 0; i < 4; i++) box(body, 0.1, 0.012, 0.05, C.leather, 0, 0.58 + i * 0.1, 0.14, 0.003);
    belt(C.leather); sleeveC = C.cream;
  } else if (outfit === 'noble') {
    upper(shirt); yoke(shirt); skirt(shirt, 0.2, 0.29, 0.42, 0.2);
    ring(body, 0.29 * g, 0.032, L.trim, 0.22, 1, 0.82); ring(body, 0.085, 0.028, L.trim, 1.0, 1, 1);
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
  cyl(body, 0.052, 0.062, 0.14, skin, 0.96);
  const head = new THREE.Group(); head.position.set(0, 1.17, 0); head.scale.setScalar(headScale); body.add(head);
  buildFace(head, L); buildHair(head, L); buildHeadwear(head, L);
  parts.head = head;
  return { root: outer, pivot, parts };
}

export const SPECIES = { human: buildHuman };
export function buildPerson(cfg) { return (SPECIES[cfg.species || 'human'] || buildHuman)(cfg); }
