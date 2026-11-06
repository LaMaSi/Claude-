// Soft, round heads with a PAINTED face (Mii-style): a smooth deformed sphere plus a canvas texture holding the eyes,
// brows, mouth, blush and freckles. Far rounder and calmer than stacked spheres and boxes, and cheap to render.
import * as THREE from 'three';

export const HEAD_R = 0.2;
const hex = (n) => '#' + n.toString(16).padStart(6, '0');
const mix = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), t);
const css = (c) => '#' + c.getHexString();

// ---- geometry: sphere sculpted per face shape (smooth normals, no facets) ----------------------------------------
// shape: oval | round | long | heart | pear | square | chubby (legacy: soft = chubby, pointy = heart).
// Optional tweaks: chin (-1 weak .. +1 strong/jutting), cheek (0..1 fullness), brow (0..1 forehead bulge).
const SHAPES = {
  oval:   { low: 0.14, lowPow: 1.5, up: 0, chinY: 0.06 },
  round:  { low: 0.05, lowPow: 2, up: 0, chinY: 0 },
  long:   { low: 0.2, lowPow: 1.3, up: 0, chinY: 0.1 },
  heart:  { low: 0.4, lowPow: 1.3, up: 0.07, chinY: 0.1, zLow: 0.2 },
  pear:   { low: -0.1, lowPow: 0.9, up: -0.1, chinY: 0, zLow: 0 },
  square: { low: -0.1, lowPow: 0.7, up: 0, chinY: -0.1, flat: 0.84, zLow: -0.04 },
  chubby: { low: -0.07, lowPow: 0.9, up: 0, chinY: 0.0, cheek: 0.1 },
};
const ALIAS = { soft: 'chubby', pointy: 'heart' };
// lowest point of the chin (head units, before headScale): lets the body keep the chin clear of the collar
export function headBottom(L) {
  const S = SHAPES[SHAPES[L.jaw] ? L.jaw : (ALIAS[L.jaw] ?? 'oval')];
  return HEAD_R * L.headH * (S.flat ? S.flat : 1 + S.chinY);
}
const geoCache = new Map();
export function headGeometry(L) {
  const shape = SHAPES[L.jaw] ? L.jaw : (ALIAS[L.jaw] ?? 'oval'), S = SHAPES[shape];
  const chin = L.chin ?? 0, cheek = (L.cheek ?? 0) + (S.cheek ?? 0), brow = L.brow ?? 0;
  const key = [L.headW, L.headH, shape, chin, cheek, brow].join('|');
  if (geoCache.has(key)) return geoCache.get(key);
  const R = HEAD_R, g = new THREE.SphereGeometry(R, 44, 32), P = g.attributes.position, N = g.attributes.normal;
  const hw = L.headW, hh = L.headH, sm = THREE.MathUtils.smoothstep;
  for (let i = 0; i < P.count; i++) {
    let x = P.getX(i), y = P.getY(i), z = P.getZ(i);
    const ny = y / R, t = Math.max(0, -ny), u = Math.max(0, ny), front = Math.max(0, z / R);
    let xs = 1, zs = 1, ys = 1;
    xs -= S.low * Math.pow(t, S.lowPow); xs += S.up * u;                       // jaw taper / forehead width
    zs -= (S.zLow ?? 0.08) * Math.pow(t, 1.5) * 0.6;
    ys += S.chinY * t;                                                         // longer chin
    xs += cheek * Math.sin(Math.min(1, t * 1.6) * Math.PI) * 0.9;              // cheek fullness around mid-lower face
    if (u > 0) xs *= 1 - 0.05 * u;                                             // egg: crown a touch narrower
    let nx = x * xs * hw, ny2 = y * ys * hh, nz = z * zs;
    if (S.flat && ny2 < -R * S.flat * hh) ny2 = -R * S.flat * hh + (ny2 + R * S.flat * hh) * 0.15; // flat jaw line
    nz += chin * 0.055 * sm(t, 0.35, 1) * front;                               // chin juts forward / recedes
    nz += brow * 0.04 * sm(u, 0.15, 0.7) * (1 - sm(u, 0.7, 1)) * front;        // brow ridge
    P.setXYZ(i, nx, ny2, nz);
    const gx = N.getX(i) / hw, gy = N.getY(i) / hh, gz = N.getZ(i), l = Math.hypot(gx, gy, gz) || 1;
    N.setXYZ(i, gx / l, gy / l, gz / l);
  }
  g.computeBoundingSphere();
  geoCache.set(key, g);
  return g;
}

// ---- painted face texture ------------------------------------------------------------------------------------------
const W = 1024, H = 512;
const texCache = new Map();
export function headMaterial(L) {
  const key = JSON.stringify([L.skin, L.headW, L.headH, L.eyes, L.eyeColor, L.eyeGap, L.eyeY, L.eyeSize, L.brows, L.browColor ?? L.hair,
    L.nose, L.mouth, L.eyeTilt ?? 0, L.blush, L.freckles, L.accessories.includes('eyepatch'), L.accessories.includes('scar')]);
  if (!texCache.has(key)) {
    const tex = new THREE.CanvasTexture(paintFace(L));
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter;
    texCache.set(key, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, metalness: 0 }));
  }
  return texCache.get(key);
}

function paintFace(L) {
  const R = HEAD_R, hw = L.headW, hh = L.headH;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  const skin = new THREE.Color(L.skin);
  x.fillStyle = css(skin); x.fillRect(0, 0, W, H);
  // physical face units (y up) -> texture; front of the head is u = 0.25
  const kx = W / (2 * Math.PI * R * hw), ky = H / (Math.PI * R * hh);
  x.setTransform(kx, 0, 0, -ky, W * 0.25, H * 0.5);
  const ink = '#2a2024', lipC = css(mix(skin.getHex(), 0x9a3a3a, 0.62)), skinDark = css(mix(skin.getHex(), 0x5a2a20, 0.3));
  const brow = css(new THREE.Color(L.browColor ?? L.hair).lerp(new THREE.Color(0), 0.1));
  const ell = (cx, cy, rx, ry, fill, rot = 0) => { x.fillStyle = fill; x.beginPath(); x.ellipse(cx, cy, rx, ry, rot, 0, Math.PI * 2); x.fill(); };
  const stroke = (w, col) => { x.lineWidth = w; x.strokeStyle = col; x.lineCap = 'round'; x.lineJoin = 'round'; };
  const soft = (cx, cy, rx, ry, col, a) => { // soft radial blob (blush, nose shading)
    x.save(); x.translate(cx, cy); x.scale(rx, ry);
    const g = x.createRadialGradient(0, 0, 0, 0, 0, 1); g.addColorStop(0, col + a); g.addColorStop(1, col + '00');
    x.fillStyle = g; x.beginPath(); x.arc(0, 0, 1, 0, Math.PI * 2); x.fill(); x.restore();
  };

  // cheeks and nose shading first (under the features)
  if (L.blush) for (const s of [-1, 1]) soft(s * 0.122 * hw, -0.05, 0.05, 0.034, '#f08a84', Math.round(0.7 * 255).toString(16).padStart(2, '0'));
  if (L.nose === 'button') { soft(0, -0.052, 0.026, 0.018, css(mix(skin.getHex(), 0x7a3a2a, 0.45)), '88'); }
  for (let i = 0; i < L.freckles; i++) {
    const s = i % 2 ? 1 : -1, k = Math.floor(i / 2);
    ell(s * (0.05 + (k % 3) * 0.027), -0.025 - ((k * 7) % 3) * 0.016 + (k > 2 ? -0.022 : 0), 0.0085, 0.0085, skinDark);
  }

  // eyes
  const ex = L.eyeGap, ey = 0.02 + L.eyeY, es = L.eyeSize, eye = L.eyes, ic = css(new THREE.Color(L.eyeColor));
  for (const s of [-1, 1]) {
    const cx = s * ex, hl = (px, py, r) => ell(cx + px, ey + py, r, r, '#ffffff');
    x.save(); x.translate(cx, ey); x.rotate(s * (L.eyeTilt ?? 0) * 0.3); x.translate(-cx, -ey); // upturned (+) or droopy (-) outer corners
    if (eye === 'dot') {
      ell(cx, ey, 0.026 * es, 0.036 * es, ink); hl(0.008 * es, 0.014 * es, 0.009 * es);
    } else if (eye === 'big') {
      ell(cx, ey, 0.042 * es, 0.054 * es, '#fffaf0'); // sclera rim so the eye reads at small size
      ell(cx, ey - 0.002, 0.036 * es, 0.047 * es, ic);
      ell(cx, ey - 0.006 * es, 0.021 * es, 0.03 * es, ink);
      hl(0.011 * es, 0.017 * es, 0.0115 * es); hl(-0.01 * es, -0.014 * es, 0.0055 * es);
      stroke(0.007, ink); x.beginPath(); x.ellipse(cx, ey, 0.043 * es, 0.055 * es, 0, 0.15 * Math.PI, 0.85 * Math.PI); x.stroke();
    } else if (eye === 'wide') {
      ell(cx, ey, 0.05 * es, 0.04 * es, '#fffaf0');
      ell(cx, ey, 0.027 * es, 0.034 * es, ic); ell(cx, ey, 0.015 * es, 0.02 * es, ink); hl(0.008 * es, 0.01 * es, 0.0085 * es);
      stroke(0.006, ink); x.beginPath(); x.ellipse(cx, ey, 0.051 * es, 0.041 * es, 0, 0.1 * Math.PI, 0.9 * Math.PI); x.stroke();
    } else if (eye === 'sleepy') {
      ell(cx, ey - 0.004, 0.03 * es, 0.026 * es, ink); x.fillStyle = css(skin); x.fillRect(cx - 0.04, ey + 0.004, 0.08, 0.04); // flat upper lid cuts the dot
      hl(0.007 * es, -0.005, 0.0055 * es);
      stroke(0.009, ink); x.beginPath(); x.moveTo(cx - 0.036 * es, ey + 0.004); x.lineTo(cx + 0.036 * es, ey + 0.004); x.stroke();
    } else if (eye === 'narrow') {
      stroke(0.014, ink); x.beginPath(); x.moveTo(cx - 0.036 * es, ey + s * 0.004); x.lineTo(cx + 0.036 * es, ey - s * 0.004); x.stroke();
    } else if (eye === 'happy') {
      stroke(0.013, ink); x.beginPath(); x.ellipse(cx, ey - 0.012, 0.03 * es, 0.026 * es, 0, 0.05 * Math.PI, 0.95 * Math.PI); x.stroke();
    }
    x.restore();
    // brows
    const by = ey + 0.062 * (es > 1.1 ? 1.2 : 1), bs = L.brows;
    const bk = (w, th, tilt, dx = 0, dy = 0) => { x.save(); x.translate(cx + dx, by + dy); x.rotate(tilt); stroke(th, brow); x.beginPath(); x.moveTo(-w / 2, 0); x.lineTo(w / 2, 0); x.stroke(); x.restore(); };
    if (bs === 'thin') bk(0.066, 0.011, 0);
    if (bs === 'thick') bk(0.08, 0.022, 0);
    if (bs === 'bushy') bk(0.094, 0.034, s * 0.08);
    if (bs === 'arched') { x.save(); x.translate(cx, by); stroke(0.013, brow); x.beginPath(); x.moveTo(-0.034, -0.006); x.quadraticCurveTo(0, 0.016, 0.034, -0.006); x.stroke(); x.restore(); }
    if (bs === 'angry') bk(0.078, 0.019, s * 0.38);
    if (bs === 'worried') bk(0.068, 0.014, -s * 0.38);
  }

  // mouth
  const my = -0.105, m = L.mouth;
  const mouth = (th = 0.0095) => stroke(th, lipC);
  if (m === 'smile') { mouth(); x.beginPath(); x.moveTo(-0.034, my + 0.008); x.quadraticCurveTo(0, my - 0.016, 0.034, my + 0.008); x.stroke(); }
  if (m === 'flat') { mouth(0.01); x.beginPath(); x.moveTo(-0.028, my); x.lineTo(0.028, my); x.stroke(); }
  if (m === 'smirk') { mouth(); x.beginPath(); x.moveTo(-0.03, my - 0.002); x.quadraticCurveTo(0.008, my - 0.008, 0.038, my + 0.012); x.stroke(); }
  if (m === 'frown') { mouth(); x.beginPath(); x.moveTo(-0.032, my - 0.008); x.quadraticCurveTo(0, my + 0.014, 0.032, my - 0.008); x.stroke(); }
  if (m === 'open') { ell(0, my - 0.004, 0.03, 0.022, '#5a2428'); x.save(); x.beginPath(); x.ellipse(0, my - 0.004, 0.03, 0.022, 0, 0, Math.PI * 2); x.clip(); x.fillStyle = '#fffaf0'; x.fillRect(-0.03, my + 0.004, 0.06, 0.02); ell(0, my - 0.02, 0.016, 0.01, '#c96a70'); x.restore(); }
  if (m === 'tiny') { mouth(0.009); x.beginPath(); x.moveTo(-0.018, my + 0.004); x.quadraticCurveTo(0, my - 0.01, 0.018, my + 0.004); x.stroke(); }
  if (m === 'cat') { mouth(0.009); x.beginPath(); x.moveTo(-0.034, my + 0.006); x.quadraticCurveTo(-0.017, my - 0.016, 0, my + 0.002); x.quadraticCurveTo(0.017, my - 0.016, 0.034, my + 0.006); x.stroke(); }
  if (m === 'pout') { ell(0, my, 0.02, 0.012, lipC); ell(0, my + 0.004, 0.016, 0.004, css(mix(skin.getHex(), 0xffffff, 0.35))); }
  if (m === 'o') { ell(0, my, 0.014, 0.018, '#5a2428'); }
  if (m === 'grin') { x.save(); x.beginPath(); x.moveTo(-0.045, my + 0.014); x.quadraticCurveTo(0, my - 0.022, 0.045, my + 0.014); x.quadraticCurveTo(0, my + 0.004, -0.045, my + 0.014); x.closePath(); x.clip(); x.fillStyle = '#5a2428'; x.fillRect(-0.06, my - 0.04, 0.12, 0.06); x.fillStyle = '#fffaf0'; x.fillRect(-0.06, my + 0.002, 0.12, 0.02); x.restore(); mouth(0.008); x.beginPath(); x.moveTo(-0.045, my + 0.014); x.quadraticCurveTo(0, my - 0.022, 0.045, my + 0.014); x.stroke(); }

  // scar
  if (L.accessories.includes('scar')) { stroke(0.007, '#c77a7a'); x.beginPath(); x.moveTo(0.09, 0.02); x.lineTo(0.13, -0.08); x.stroke(); stroke(0.003, '#f0d0c8'); for (const t of [0.3, 0.55, 0.8]) { x.beginPath(); x.moveTo(0.09 + 0.04 * t - 0.01, 0.02 - 0.1 * t); x.lineTo(0.09 + 0.04 * t + 0.01, 0.02 - 0.1 * t); x.stroke(); } }
  return c;
}
