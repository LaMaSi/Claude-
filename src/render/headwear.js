// Hats, hoods and kerchiefs as single smooth meshes (a shell around the skull, or a lathe for brimmed hats).
import * as THREE from 'three';
import { shell, tube, blob, prof, hairMat, finish, sstep } from './hair.js';

const PI = Math.PI;

// lathe hat from (radius, y) points; vertices between bandY0..bandY1 take the band colour
function latheHat(pts, color, { bandColor = null, bandY = [0, 0], bend = 0, tilt = 0, seg = 40 } = {}) {
  const g = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg), P = g.attributes.position;
  const top = Math.max(...pts.map((p) => p[1])), bottom = Math.min(...pts.map((p) => p[1]));
  for (let i = 0; i < P.count; i++) { // lean the crown backwards (wizard hat)
    const t = Math.max(0, (P.getY(i) - bottom - 0.12) / (top - bottom)), z = P.getZ(i) - bend * t * t;
    P.setZ(i, z); P.setY(i, P.getY(i) - tilt * 0);
  }
  g.computeVertexNormals();
  const bc = bandColor != null ? new THREE.Color(bandColor) : null;
  const base = new THREE.Color(color);
  const C = new Float32Array(P.count * 3);
  for (let i = 0; i < P.count; i++) { const y = P.getY(i), inBand = bc && y >= bandY[0] && y <= bandY[1], c = inBand ? bc : base; C[i * 3] = c.r; C[i * 3 + 1] = c.g; C[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(C, 3));
  return g;
}

export function buildHat(head, L) {
  const k = L.headwear, col = L.headwearColor, hw = L.headW, hh = L.headH;
  if (!k || k === 'circlet') return;
  const base = { rx: 0.205 * hw, ry: 0.205 * hh, rz: 0.205, cy: 0, color: col };
  const parts = [];
  const add = (geo, x = 0, y = 0, z = 0) => parts.push({ geo, pos: [x, y, z] });
  const sh = (o) => add(shell({ ...base, ...o }));
  const bangW = (az) => 1 - sstep(Math.abs(az), 0.8, 1.5);

  if (k === 'coif') sh({ yEnd: prof([[0, 0.12], [0.7, 0.1], [1.2, -0.03], [1.7, -0.13], [2.4, -0.13], [PI, -0.1]]), thick: (az, u) => 0.036 + 0.01 * (1 - u), flare: 0.04 });
  if (k === 'kerchief') {
    sh({ yEnd: prof([[0, 0.1], [0.9, 0.04], [1.4, -0.03], [2.0, -0.08], [PI, -0.1]]), thick: (az, u) => 0.036 + 0.012 * (1 - u) });
    add(blob(0.055, col, 1.15, 0.9, 1), 0, -0.07, -0.27);
    for (const s of [-1, 1]) add(tube([[s * 0.025, -0.09, -0.28], [s * 0.06, -0.2, -0.3], [s * 0.09, -0.3, -0.29]], 0.034, 0.012, { rip: 0, color: col, seg: 8 }));
  }
  if (k === 'hood') {
    sh({ yEnd: prof([[0, 0.1], [0.85, 0.03], [1.25, -0.14], [1.75, -0.22], [PI, -0.25]]), thick: (az, u) => 0.05 + 0.02 * u, flare: 0.3, curl: 0.12 });
    add(tube([[0, 0.0, -0.27], [0, -0.2, -0.33], [0, -0.42, -0.34], [0, -0.58, -0.3]], 0.065, 0.014, { rip: 0, color: col, seg: 10 })); // liripipe tail
  }
  if (k === 'flatcap') sh({ yEnd: prof([[0, 0.075], [0.7, 0.085], [1.4, 0.04], [2.0, 0.03], [PI, 0.01]]), thick: (az, u) => 0.04 + 0.03 * (1 - u) + 0.04 * bangW(az) * sstep(u, 0.5, 1), groove: null });
  if (k === 'strawhat') add(latheHat([[0, 0.34], [0.09, 0.335], [0.17, 0.31], [0.215, 0.24], [0.2255, 0.2], [0.2285, 0.17], [0.23, 0.135], [0.232, 0.1], [0.31, 0.088], [0.4, 0.082], [0.47, 0.09], [0.455, 0.1], [0.38, 0.107], [0.3, 0.112], [0.22, 0.125], [0, 0.18]], 0xe3c46c, { bandColor: col, bandY: [0.131, 0.205] }));
  if (k === 'pointed') add(latheHat([[0, 0.95], [0.012, 0.9], [0.04, 0.7], [0.09, 0.48], [0.15, 0.3], [0.215, 0.17], [0.26, 0.11], [0.34, 0.1], [0.36, 0.115], [0.3, 0.125], [0.22, 0.14], [0, 0.2]], col, { bandColor: 0xd9b25a, bandY: [0.12, 0.17], bend: 0.28 }));
  if (k === 'bakerhat') add(latheHat([[0, 0.5], [0.15, 0.48], [0.25, 0.43], [0.285, 0.35], [0.27, 0.27], [0.23, 0.2], [0.222, 0.1], [0.215, 0.04], [0, 0.04]], col));

  for (const { geo, pos } of parts) { const m = new THREE.Mesh(geo, hairMat()); m.position.set(...pos); m.castShadow = true; m.receiveShadow = true; head.add(m); }
}
