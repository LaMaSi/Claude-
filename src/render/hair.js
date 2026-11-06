// Hair as ONE continuous sculpted surface per style (no visible primitives).
// A "shell" wraps the skull: from the crown it follows the head, then (for longer hair) hangs down. Where it ends is a
// function of the azimuth around the head, so a single mesh carries the hairline, pointed lock tips, bangs and the
// nape. Shallow strand grooves + vertex-colour shading give it a sculpted, combed look. Gathered hair (ponytail,
// braids, pigtails) is a twisted tube; buns are grooved blobs.
import * as THREE from 'three';
import { mat } from './palette.js';

const TAU = Math.PI * 2, PI = Math.PI;
export const clamp = THREE.MathUtils.clamp, sstep = THREE.MathUtils.smoothstep;
const tintCol = (hex, k) => new THREE.Color(hex).multiplyScalar(k);

// value that depends on |azimuth| (0 = front ... pi = back), cosine-smooth between key points
export function prof(keys) {
  return (az) => {
    const a = Math.abs(az);
    for (let i = 0; i < keys.length - 1; i++) {
      const [a0, v0] = keys[i], [a1, v1] = keys[i + 1];
      if (a <= a1) { const t = (a - a0) / (a1 - a0 || 1); return v0 + (v1 - v0) * (1 - Math.cos(PI * clamp(t, 0, 1))) / 2; }
    }
    return keys[keys.length - 1][1];
  };
}
// pointed lock tips: returns 0..1, peaks (cusps) every 2*pi/f radians
export const tips = (az, f, ph = 0) => Math.pow(1 - Math.abs(Math.sin((f * az) / 2 + ph)), 1.3);

const mats = new Map();
export function hairMat(side = THREE.DoubleSide) {
  if (!mats.has(side)) mats.set(side, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0, side }));
  return mats.get(side);
}

export function finish(g, color, shadeAt) {
  const P = g.attributes.position, C = new Float32Array(P.count * 3), c = new THREE.Color(color), t = new THREE.Color();
  for (let i = 0; i < P.count; i++) { const k = shadeAt(i); t.copy(c).multiplyScalar(k); C[i * 3] = t.r; C[i * 3 + 1] = t.g; C[i * 3 + 2] = t.b; }
  g.setAttribute('color', new THREE.BufferAttribute(C, 3));
}

const ss0 = (u) => sstep(u, 0.2, 0.75); // strand grooves fade out at the crown pole
// ---- the shell ---------------------------------------------------------------------------------------------------
export function shell(o) {
  const { rx, ry, rz, cy = 0, yEnd, thick, el0 = 0, rows = 40, cols = 84, flare = 0, curl = 0, groove, color } = o;
  const pos = [], shade = [], idx = [];
  const elEq = PI / 2 + 0.12, yEq = cy + ry * Math.cos(elEq);
  for (let i = 0; i <= rows; i++) for (let j = 0; j <= cols; j++) {
    const az = (j / cols) * TAU - PI, sa = Math.sin(az), ca = Math.cos(az), u = i / rows;
    const e0 = typeof el0 === 'function' ? el0(az) : el0, ye = yEnd(az);
    const elEnd = ye >= yEq ? Math.acos(clamp((ye - cy) / ry, -1, 1)) : elEq;
    const elStop = Math.max(elEnd, e0 + 0.0001), drop = ye < yEq ? yEq - ye : 0, fd = drop > 0 ? 0.5 : 1;
    let t = thick(az, u), gr = groove ? groove(az, u) * ss0(u) : 0, x, y, z;
    const edge = 1 - sstep(u, 0.86, 1);
    t = t * (0.2 + 0.8 * edge) * (e0 > 0.01 ? Math.pow(sstep(u, 0, 0.85), 1.6) : 1) + 0.002;
    if (drop === 0 && elEnd <= e0 + 0.03) { t = -0.03; gr = 0; } // no hair here (bald front of a tonsure etc.): sink the open edge into the skull
    if (u <= fd) {
      const el = e0 + (elStop - e0) * (u / fd), se = Math.sin(el), ce = Math.cos(el);
      const nx = (se * sa) / (rx * rx), ny = ce / (ry * ry), nz = (se * ca) / (rz * rz), nl = Math.hypot(nx, ny, nz) || 1, tt = t + gr;
      x = rx * se * sa + (nx / nl) * tt; y = cy + ry * ce + (ny / nl) * tt; z = rz * se * ca + (nz / nl) * tt;
    } else {
      const d = (u - fd) / (1 - fd), k = 1 + flare * d - curl * d * d, se = Math.sin(elEq), nl = Math.hypot((se * sa) / (rx * rx), (se * ca) / (rz * rz)) || 1;
      const nx = ((se * sa) / (rx * rx)) / nl, nz = ((se * ca) / (rz * rz)) / nl, tt = t + gr;
      x = rx * se * sa * k + nx * tt; z = rz * se * ca * k + nz * tt; y = yEq - d * drop;
    }
    pos.push(x, y, z);
    shade.push(groove ? 0.86 + 0.14 * clamp((gr / (o.grooveAmp || 0.008)) * 0.5 + 0.5, 0, 1) - 0.08 * u : 1);
  }
  const W = cols + 1;
  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) { const a = i * W + j, b = a + 1, c = a + W, d = c + 1; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  // seam (back of the head) and pole normals, so lighting is continuous
  const N = g.attributes.normal;
  for (let i = 0; i <= rows; i++) {
    const a = i * W, b = i * W + cols, x = N.getX(a) + N.getX(b), y = N.getY(a) + N.getY(b), z = N.getZ(a) + N.getZ(b), l = Math.hypot(x, y, z) || 1;
    N.setXYZ(a, x / l, y / l, z / l); N.setXYZ(b, x / l, y / l, z / l);
  }
  if (typeof el0 === 'number' && el0 < 0.01) for (let j = 0; j <= cols; j++) N.setXYZ(j, 0, 1, 0);
  finish(g, color, (v) => shade[v]);
  return g;
}

// ---- twisted tube (ponytail, braids, pigtails) --------------------------------------------------------------------
export function tube(pts, r0, r1, { twist = 0, rip = 0.08, color, seg = 12, N = 28 } = {}) {
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), fr = curve.computeFrenetFrames(N, false);
  const pos = [], shade = [], idx = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, P = curve.getPoint(t), nn = fr.normals[i], bb = fr.binormals[i];
    let rad = r0 + (r1 - r0) * t; if (t > 0.9) rad *= Math.sqrt(Math.max(0, 1 - Math.pow((t - 0.9) / 0.1, 2)));
    for (let k = 0; k <= seg; k++) {
      const th = (k / seg) * TAU, w = Math.sin(th * 2 + t * twist * TAU), rr = rad * (1 + rip * w);
      pos.push(P.x + (nn.x * Math.cos(th) + bb.x * Math.sin(th)) * rr, P.y + (nn.y * Math.cos(th) + bb.y * Math.sin(th)) * rr, P.z + (nn.z * Math.cos(th) + bb.z * Math.sin(th)) * rr);
      shade.push(0.88 + 0.12 * (0.5 + 0.5 * w));
    }
  }
  const W = seg + 1;
  for (let i = 0; i < N; i++) for (let k = 0; k < seg; k++) { const a = i * W + k, b = a + 1, c = a + W, d = c + 1; idx.push(a, b, c, b, d, c); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  finish(g, color, (v) => shade[v]);
  return g;
}

// ---- grooved blob (buns) ---------------------------------------------------------------------------------------
export function blob(r, color, sx = 1, sy = 1, sz = 1) {
  const g = new THREE.SphereGeometry(1, 30, 22), P = g.attributes.position, sh = [];
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), y = P.getY(i), z = P.getZ(i), th = Math.atan2(z, x), ph = Math.acos(clamp(y, -1, 1)), w = Math.sin(3 * th + 5 * ph);
    const k = r * (1 + 0.05 * w); P.setXYZ(i, x * k * sx, y * k * sy, z * k * sz); sh.push(0.9 + 0.1 * (0.5 + 0.5 * w));
  }
  g.computeVertexNormals(); finish(g, color, (v) => sh[v]); return g;
}

// ---- spikes: a flat pointed blade that sweeps back and curls, rooted inside the scalp ---------------------------------
const spikeGeos = new Map();
function spikeGeometry(bend, flat) {
  const key = bend + '|' + flat; if (spikeGeos.has(key)) return spikeGeos.get(key);
  const pts = []; for (let i = 0; i <= 14; i++) { const t = i / 14; pts.push(new THREE.Vector2(Math.max(0.0005, Math.pow(1 - t, 0.85) * (1 + 0.25 * Math.sin(t * PI))), t - 0.12)); }
  const g = new THREE.LatheGeometry(pts, 12), P = g.attributes.position;
  for (let i = 0; i < P.count; i++) { const t = Math.max(0, P.getY(i) + 0.12); P.setZ(i, P.getZ(i) * flat - bend * t * t); }
  g.computeVertexNormals(); spikeGeos.set(key, g); return g;
}
// az/el place the root on the head ellipsoid; pitch tilts the spike from straight up toward the back (negative = forward), yaw turns it sideways
export function spike(color, hw, hh, o) {
  const { az = 0, el = 0.5, len = 0.2, w = 0.05, pitch = 0.3, yaw = 0, bend = 0.05, flat = 0.55 } = o;
  const se = Math.sin(el), ce = Math.cos(el), rx = 0.205 * hw, ry = 0.205 * hh, rz = 0.205;
  const m = new THREE.Mesh(spikeGeometry(bend / len, flat), mat(color, { flatShading: false }));
  m.position.set(rx * se * Math.sin(az) * 0.96, ry * ce * 0.96, rz * se * Math.cos(az) * 0.96);
  m.rotation.order = 'YXZ'; m.rotation.set(-pitch, az + PI + yaw, 0); // heading = outward from the root, yaw swings it sideways
  m.scale.set(w * 1.2, len * 1.35, w * 1.2); m.castShadow = true; m.receiveShadow = true; return m;
}

// ---- styles --------------------------------------------------------------------------------------------------------
export const COVERS = new Set(['coif', 'hood', 'kerchief', 'bakerhat', 'pointed', 'strawhat', 'flatcap', 'helm']);

export function buildHairMeshes(L) {
  const { hairStyle: st, hair: c, headW: hw, headH: hh, headwear } = L;
  const covered = COVERS.has(headwear), out = [], extra = [];
  const base = { rx: 0.205 * hw, ry: 0.205 * hh, rz: 0.205, cy: 0.0, color: c };
  const bangW = (az) => 1 - sstep(Math.abs(az), 0.85, 1.25);   // 1 over the forehead, 0 beyond the temples
  const add = (geo, x = 0, y = 0, z = 0) => out.push({ geo, pos: [x, y, z] });
  const sh = (o) => { if (covered && !['long', 'bob', 'shaggy'].includes(st)) return; add(shell({ ...base, ...o, thick: o.thick || ((az, u) => 0.016 + 0.012 * (1 - u)) })); };
  const hat = (fn) => (covered ? (az) => { const b = sstep(Math.abs(az), 1.0, 1.8); return 0.3 + (fn(az) - 0.3) * b; } : fn); // fade the hair out under a hat instead of a hard cut
  const withBangs = (key, amp = 0.035, f = 9) => { const p = prof(key); return (az) => p(az) - amp * bangW(az) * tips(az, f); };
  const SHORT = [[0, 0.115], [0.5, 0.105], [1.0, 0.06], [1.35, 0.0], [1.7, -0.02], [2.3, -0.07], [PI, -0.09]];
  const grooveF = (f, amp) => (az, u) => amp * Math.cos(f * az) * (1 - 0.5 * u);
  const el0 = covered ? 1.12 : 0;

  if (st === 'short') sh({ el0, yEnd: hat(withBangs(SHORT, 0.035, 9)), groove: grooveF(9, 0.006) });
  if (st === 'messy') {
    const sp = (az, u) => 0.05 * Math.pow(Math.max(0, Math.cos(7 * az + 3 * u) * Math.cos(5 * u * 1.5 + az)), 2);
    sh({ el0, yEnd: hat(withBangs(SHORT, 0.05, 7)), thick: (az, u) => 0.02 + 0.03 * (1 - u) + sp(az, u) * (1 - u * 0.4), groove: grooveF(7, 0.005) });
  }
  if (st === 'shaggy') sh({ el0, yEnd: hat((az) => prof([[0, 0.1], [0.5, 0.09], [1.0, 0.0], [1.5, -0.1], [2.2, -0.16], [PI, -0.18]])(az) - 0.06 * bangW(az) * tips(az, 11) - 0.07 * (1 - bangW(az)) * tips(az, 11, 0.5)), thick: (az, u) => 0.024 + 0.014 * (1 - u), flare: 0.08, groove: grooveF(11, 0.007) });
  if (st === 'curly') sh({ el0, yEnd: hat(prof([[0, 0.1], [1.2, 0.02], [2.0, -0.05], [PI, -0.08]])), thick: (az, u) => 0.045, groove: (az, u) => 0.03 * Math.sin(11 * az + 4 * u) * Math.sin(9 * u + 2 * az) * (1 - u * 0.3), grooveAmp: 0.03 });
  if (st === 'puff') sh({ el0, yEnd: hat(prof([[0, 0.12], [0.8, 0.1], [1.4, -0.02], [PI, -0.1]])), thick: () => 0.085, groove: (az, u) => 0.018 * Math.sin(9 * az + 3 * u) * Math.sin(7 * u + az), grooveAmp: 0.018 });
  if (st === 'long') {
    const k = prof([[0, 0.115], [0.5, 0.105], [0.95, 0.0], [1.2, -0.17], [1.57, -0.22], [2.0, -0.32], [2.6, -0.4], [PI, -0.42]]);
    sh({ el0, yEnd: hat((az) => k(az) - 0.035 * bangW(az) * tips(az, 9) - 0.085 * (1 - bangW(az)) * tips(az, 9, 0.4)), thick: (az, u) => 0.016 + 0.024 * u + 0.01 * (1 - u), flare: 0.2, groove: grooveF(9, 0.008) });
  }
  if (st === 'bob') {
    const k = prof([[0, 0.11], [0.5, 0.1], [1.0, 0.0], [1.3, -0.1], [1.57, -0.12], [2.2, -0.15], [PI, -0.16]]);
    sh({ el0, yEnd: hat((az) => k(az) - 0.03 * bangW(az) * tips(az, 9) - 0.02 * (1 - bangW(az)) * tips(az, 7)), thick: (az, u) => 0.016 + 0.02 * u, flare: 0.1, curl: 0.55, groove: grooveF(8, 0.006) });
  }
  if (['braid', 'braids', 'pigtails', 'bun', 'twinbuns', 'topknot', 'ponytail'].includes(st)) {
    sh({ el0, yEnd: hat(withBangs([[0, 0.115], [0.5, 0.105], [1.0, 0.06], [1.35, 0.0], [1.7, 0.0], [2.3, -0.04], [PI, -0.06]], 0.03, 9)), groove: grooveF(9, 0.006) });
    if (!covered && st === 'bun') add(blob(0.1, c), 0, 0.26, -0.05);
    if (!covered && st === 'twinbuns') for (const s of [-1, 1]) add(blob(0.08, c), s * 0.13, 0.25, -0.03);
    if (!covered && st === 'topknot') add(blob(0.065, c, 1, 1.15, 1), 0, 0.27, -0.03);
    if (st === 'ponytail') add(tube([[0, 0.14, -0.2], [0, 0.12, -0.31], [0, -0.04, -0.36], [0, -0.26, -0.33], [0, -0.38, -0.3]], 0.075, 0.015, { twist: 1.5, rip: 0.06, color: c }));
    if (st === 'braid') add(tube([[0, 0.0, -0.18], [0, -0.14, -0.27], [0, -0.32, -0.29], [0, -0.5, -0.29]], 0.058, 0.04, { twist: 6, rip: 0.16, color: c }));
    if (st === 'braids') for (const s of [-1, 1]) add(tube([[s * 0.17, 0.02, -0.03], [s * 0.19, -0.12, -0.04], [s * 0.185, -0.3, -0.04], [s * 0.18, -0.46, -0.04]], 0.05, 0.036, { twist: 6, rip: 0.16, color: c }));
    if (st === 'pigtails') for (const s of [-1, 1]) add(tube((covered ? [[s * 0.2, -0.08, -0.02], [s * 0.235, -0.17, -0.03], [s * 0.25, -0.27, -0.02], [s * 0.24, -0.36, -0.02]] : [[s * 0.2, 0.06, -0.02], [s * 0.27, -0.04, -0.03], [s * 0.3, -0.18, -0.02], [s * 0.28, -0.3, -0.02]]), covered ? 0.055 : 0.07, 0.018, { twist: 1.2, rip: 0.06, color: c }));
  }
  const sp = (list, tone = 0.06) => list.forEach((o, i) => extra.push(spike(tintCol(c, 1 + ((i % 3) - 1) * tone).getHex(), hw, hh, o)));
  if (st === 'spiky') { // JRPG hero: swept-back spikes, two front bangs
    sh({ el0, yEnd: hat(withBangs([[0, 0.1], [0.5, 0.09], [1.0, 0.05], [1.35, 0.0], [1.7, -0.02], [2.3, -0.06], [PI, -0.08]], 0.0, 9)), groove: grooveF(9, 0.004) });
    if (!covered) sp([{ az: 0.32, el: 0.8, len: 0.17, w: 0.052, pitch: 2.1, yaw: 0.35, bend: 0.03 }, { az: -0.32, el: 0.8, len: 0.17, w: 0.052, pitch: 2.1, yaw: -0.35, bend: 0.03 }, { az: 0, el: 0.78, len: 0.14, w: 0.045, pitch: 2.4, yaw: 0, bend: 0.02 },
      { az: 0, el: 0.3, len: 0.27, w: 0.075, pitch: 0.9, bend: 0.08 }, { az: 0.85, el: 0.55, len: 0.25, w: 0.07, pitch: 1.0, yaw: 0.55, bend: 0.07 }, { az: -0.85, el: 0.55, len: 0.25, w: 0.07, pitch: 1.0, yaw: -0.55, bend: 0.07 },
      { az: 1.7, el: 0.85, len: 0.22, w: 0.07, pitch: 1.0, yaw: 0, bend: 0.1 }, { az: -1.7, el: 0.85, len: 0.22, w: 0.07, pitch: 1.0, yaw: 0, bend: 0.1 },
      { az: 2.6, el: 0.9, len: 0.22, w: 0.07, pitch: 1.15, yaw: 0, bend: 0.1 }, { az: -2.6, el: 0.9, len: 0.22, w: 0.07, pitch: 1.15, yaw: 0, bend: 0.1 }, { az: PI, el: 0.75, len: 0.24, w: 0.075, pitch: 1.3, yaw: 0, bend: 0.06 }]);
  }
  if (st === 'spikes') { // short, upright and cheeky
    sh({ el0, yEnd: hat(withBangs(SHORT, 0.03, 9)), groove: grooveF(9, 0.004) });
    if (!covered) sp([0, 0.7, -0.7, 1.4, -1.4, 2.2, -2.2, PI].map((a, i) => ({ az: a, el: 0.28 + Math.abs(a) * 0.22 * 0.6, len: 0.2 - (i % 2) * 0.05, w: 0.062, pitch: 0.2 + Math.abs(Math.cos(a / 2)) * 0.1 + Math.abs(a) * 0.12, yaw: 0, bend: 0.03 })));
  }
  if (st === 'wild') { // long, jagged, windswept
    sh({ el0, yEnd: hat((az) => prof([[0, 0.1], [0.5, 0.08], [1.0, 0.0], [1.5, -0.12], [2.2, -0.2], [PI, -0.22]])(az) - 0.05 * tips(az, 9)), thick: (az, u) => 0.02 + 0.014 * (1 - u), flare: 0.1, groove: grooveF(9, 0.006) });
    if (!covered) sp([{ az: 0.3, el: 0.8, len: 0.2, w: 0.06, pitch: 2.0, yaw: 0.5, bend: 0.04 }, { az: -0.3, el: 0.8, len: 0.2, w: 0.06, pitch: 2.0, yaw: -0.5, bend: 0.04 }, { az: 0, el: 0.3, len: 0.22, w: 0.07, pitch: 0.7, bend: 0.07 },
      { az: 1.2, el: 0.9, len: 0.25, w: 0.07, pitch: 1.5, yaw: 0, bend: 0.14 }, { az: -1.2, el: 0.9, len: 0.25, w: 0.07, pitch: 1.5, yaw: 0, bend: 0.14 }, { az: 2.4, el: 1.0, len: 0.28, w: 0.075, pitch: 1.7, yaw: 0, bend: 0.16 }, { az: -2.4, el: 1.0, len: 0.28, w: 0.075, pitch: 1.7, yaw: 0, bend: 0.16 }, { az: PI, el: 1.0, len: 0.36, w: 0.08, pitch: 2.3, yaw: 0, bend: 0.1 }]);
  }
  if (st === 'swept') { // anime side-swept fringe over one eye
    sh({ el0, yEnd: hat((az) => prof([[0, 0.06], [0.5, 0.09], [1.0, 0.04], [1.4, -0.03], [2.0, -0.07], [PI, -0.09]])(az) - 0.07 * Math.max(0, Math.sin(az + 0.6)) * bangW(az)), groove: grooveF(9, 0.005) });
    if (!covered) sp([{ az: -0.2, el: 0.75, len: 0.22, w: 0.1, pitch: 2.3, yaw: 0.9, bend: 0.0, flat: 0.4 }, { az: 0.5, el: 0.8, len: 0.17, w: 0.07, pitch: 2.1, yaw: 0.6, bend: 0.0, flat: 0.45 }, { az: 1.5, el: 1.1, len: 0.14, w: 0.07, pitch: 2.9, yaw: 1.5, bend: 0.03 }]);
  }
  if (st === 'tonsure') { // monk's fringe: a wedge-shaped band, pointed at the temples, thicker at the back
    const top = prof([[0, 1.5], [1.0, 1.42], [1.4, 1.2], [2.2, 1.04], [PI, 1.0]]), bot = prof([[0, 0.3], [1.0, 0.3], [1.3, 0.05], [1.7, -0.02], [2.4, -0.07], [PI, -0.09]]);
    sh({ el0: top, yEnd: (az) => bot(az) - 0.02 * tips(az, 9) * sstep(Math.abs(az), 1.5, 2.2), thick: (az, u) => 0.022 + 0.012 * sstep(Math.abs(az), 1.4, 2.6), groove: grooveF(8, 0.005) });
  }
  if (st === 'receding') {
    const top = prof([[0, 1.55], [1.1, 1.45], [1.45, 1.2], [2.0, 0.98], [PI, 0.8]]), bot = prof([[0, 0.3], [1.1, 0.3], [1.35, 0.06], [1.7, -0.02], [2.4, -0.06], [PI, -0.08]]);
    sh({ el0: top, yEnd: (az) => bot(az) - 0.02 * tips(az, 9) * sstep(Math.abs(az), 1.5, 2.2), thick: () => 0.024, groove: grooveF(8, 0.004) });
  }
  if (st === 'bald') sh({ el0: 1.3, yEnd: prof([[0, 0.3], [1.25, 0.3], [1.5, 0.04], [1.85, 0.3], [PI, 0.3]]), thick: () => 0.02 });
  out.extra = extra; return out;
}

export function buildHair(head, L) {
  const list = buildHairMeshes(L); for (const m of list.extra || []) head.add(m);
  for (const { geo, pos } of list) {
    const m = new THREE.Mesh(geo, hairMat()); m.position.set(...pos); m.castShadow = true; m.receiveShadow = true; head.add(m);
  }
}
