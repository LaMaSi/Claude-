// Beards, moustaches and sideburns as smooth single meshes (no stacked primitives).
// A beard is a shell that follows the lower head ellipsoid from a top edge down to a hanging end, both shaped per
// azimuth; moustaches are tapered tubes laid on the face; everything gets strand grooves and vertex-colour shading.
import * as THREE from 'three';
import { tube, prof, tips, hairMat, finish, sstep, clamp } from './hair.js';

const PI = Math.PI;

function beardShell({ rx, ry, rz, azC = 0, azHalf = 1.7, yTop, yEnd, thick, groove, grooveAmp = 0.005, sHang = 0.6, tipTaper = 0.5, color, rows = 30, cols = 64 }) {
  const pos = [], shade = [], idx = [], cy = 0, sMin = Math.sqrt(1 - 0.97 * 0.97);
  for (let i = 0; i <= rows; i++) for (let j = 0; j <= cols; j++) {
    const loc = -azHalf + (2 * azHalf * j) / cols, az = azC + loc, aa = Math.abs(loc), u = i / rows;
    const yt = yTop(loc), ye = Math.min(yEnd(loc), yt), y = yt + (ye - yt) * u, q = (y - cy) / ry, sa = Math.sin(az), ca = Math.cos(az);
    let s, nx, ny, nz, nl;
    if (q > -0.97) {
      s = Math.sqrt(Math.max(0, 1 - q * q));
      nx = (s * sa) / (rx * rx); ny = q / ry; nz = (s * ca) / (rz * rz);
    } else { // hanging below the chin: widens into the beard's body, then narrows to the tip
      const d = -0.97 * ry - (y - cy);
      s = sMin + (sHang - sMin) * sstep(d, 0, 0.07);
      nx = sa / rx; ny = -0.15; nz = ca / rz;
    }
    s *= 1 - tipTaper * Math.pow(sstep(u, 0.45, 1), 1.5);
    nl = Math.hypot(nx, ny, nz) || 1;
    let t = thick(loc, u) * (0.25 + 0.75 * sstep(u, 0, 0.18)) * (1 - 0.8 * sstep(u, 0.88, 1)) * (1 - sstep(aa, azHalf - 0.3, azHalf)) + 0.002;
    if (ye >= yt - 0.002) t = -0.03; // nothing here: sink the open edge into the skin
    const g = groove && t > 0.004 ? groove(loc, u) : 0;
    t += g;
    pos.push(rx * s * sa + (nx / nl) * t, y + (ny / nl) * t, rz * s * ca + (nz / nl) * t);
    shade.push(groove ? 0.86 + 0.14 * clamp((g / grooveAmp) * 0.5 + 0.5, 0, 1) - 0.06 * u : 1);
  }
  const W = cols + 1;
  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) { const a = i * W + j, b = a + 1, c = a + W, d = c + 1; idx.push(a, b, c, b, d, c); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  finish(g, color, (v) => shade[v]);
  return g;
}

export function buildFacialHair(head, L, zAt) {
  const fh = L.facial; if (!fh || fh === 'none') return;
  const fc = L.facialColor ?? L.hair, hw = L.headW, hh = L.headH;
  const base = { rx: 0.2 * hw, ry: 0.2 * hh, rz: 0.2, color: fc };
  const parts = [], add = (geo) => parts.push(geo);
  const groove = (f, a) => (az, u) => a * Math.cos(f * az) * (1 - 0.5 * u);

  if (fh === 'full') add(beardShell({ ...base, yTop: prof([[0, -0.123], [0.2, -0.123], [0.42, -0.09], [0.75, -0.04], [1.1, 0.01], [1.5, 0.07], [1.7, 0.07]]),
    yEnd: (a) => prof([[0, -0.29], [0.6, -0.27], [1.0, -0.2], [1.4, -0.09], [1.7, 0.0]])(a) - 0.02 * tips(a, 5) * (1 - sstep(Math.abs(a), 0.8, 1.3)),
    thick: (a, u) => 0.026 + 0.03 * 4 * u * (1 - u) * (1 - sstep(Math.abs(a), 0.7, 1.4)), groove: groove(10, 0.005), sHang: 0.5, tipTaper: 0.3 }));
  if (fh === 'long') add(beardShell({ ...base, yTop: prof([[0, -0.123], [0.2, -0.123], [0.42, -0.09], [0.75, -0.04], [1.1, 0.01], [1.5, 0.07], [1.7, 0.07]]),
    yEnd: (a) => prof([[0, -0.66], [0.4, -0.6], [0.8, -0.4], [1.1, -0.2], [1.5, -0.08], [1.7, 0.0]])(a) - 0.05 * tips(a, 5) * (1 - sstep(Math.abs(a), 0.7, 1.2)),
    thick: (a, u) => 0.026 + 0.04 * Math.sin(Math.min(1, u * 1.6) * PI * 0.9) * (1 - sstep(Math.abs(a), 0.7, 1.4)), groove: groove(9, 0.007), grooveAmp: 0.007, sHang: 0.46, tipTaper: 0.6, rows: 44 }));
  if (fh === 'goatee') add(beardShell({ ...base, azHalf: 0.55, yTop: prof([[0, -0.15], [0.35, -0.13], [0.55, -0.1]]), yEnd: (a) => prof([[0, -0.33], [0.3, -0.27], [0.55, -0.2]])(a) - 0.03 * tips(a, 4),
    thick: (a, u) => 0.028 + 0.03 * 4 * u * (1 - u), sHang: 0.42, tipTaper: 0.5 }));
  if (fh === 'sideburns' || fh === 'mutton') for (const s of [-1, 1]) add(beardShell({ ...base, azC: s * 1.45, azHalf: fh === 'mutton' ? 0.5 : 0.3,
    yTop: () => 0.1, yEnd: (a) => (fh === 'mutton' ? -0.12 : -0.05) - (fh === 'mutton' ? 0.03 : 0.015) * tips(a, 4), thick: (a, u) => 0.026 + (fh === 'mutton' ? 0.014 : 0.006) * 4 * u * (1 - u), groove: groove(14, 0.004), grooveAmp: 0.004, sHang: 0.5, tipTaper: 0.3 }));

  // moustaches: tapered tubes laid on the face from the centre outwards
  const stache = fh === 'curly' ? 'curly' : (fh === 'mustache' || fh === 'full' || fh === 'long') ? 'plain' : null;
  if (stache) for (const s of [-1, 1]) {
    const P = (stache === 'curly'
      ? [[0.0, -0.074], [0.034, -0.09], [0.075, -0.088], [0.106, -0.066], [0.1, -0.04], [0.082, -0.036]]
      : [[0.0, -0.075], [0.03, -0.088], [0.066, -0.087], [0.096, -0.074]]).map(([x, y]) => [s * x, y, zAt(x, y) + 0.016]);
    add(tube(P, 0.026, stache === 'curly' ? 0.008 : 0.011, { rip: 0, color: fc, seg: 10, N: 22 }));
  }
  for (const geo of parts) { const m = new THREE.Mesh(geo, hairMat()); m.castShadow = true; m.receiveShadow = true; head.add(m); }
}
