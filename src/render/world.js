// Builds the diorama: island, timber-and-stone cottage (back walls only, front cut away), furniture, scenery.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { C, mat } from './palette.js';
import { MODELS, SCENERY } from './furnitureModels.js';
import * as M from './models.js';

function flagTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const x = c.getContext('2d');
  const cols = ['#b9b0a0', '#a59d8d', '#c4bcab', '#b0a898', '#9d9585'];
  x.fillStyle = '#8a8272'; x.fillRect(0, 0, 512, 512);
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const rows = 6;
  for (let r = 0; r < rows; r++) {
    const h = 512 / rows; let u = -rnd() * 80;
    while (u < 512) {
      const w = 70 + rnd() * 70;
      x.fillStyle = cols[Math.floor(rnd() * cols.length)];
      x.beginPath(); x.roundRect(u + 3, r * h + 3, w - 6, h - 6, 9); x.fill();
      u += w;
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  return t;
}

function slab(w, h, d, color, x, y, z, r = 0.06) {
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, r), mat(color));
  m.position.set(x, y + h / 2, z);
  m.castShadow = m.receiveShadow = true;
  return m;
}
const tb = (g, w, h, d, color, x, y, z, r = 0.02) => { const m = slab(w, h, d, color, x, y, z, r); g.add(m); return m; };

// A wall built in a local frame (u along the wall, local z = thickness). 'back' runs along world x at
// z = fixed; 'left' runs along world z at x = fixed (group rotated). Stone base to 0.9, plaster above,
// exposed timber framing, shuttered windows and an open plank door.
function buildWall(parent, axis, fixed, from, to, H, openings, thick = 0.24) {
  const g = new THREE.Group();
  if (axis === 'x') g.position.set(0, 0, fixed); else { g.position.set(fixed, 0, 0); g.rotation.y = -Math.PI / 2; }
  const inside = axis === 'x' ? 1 : -1;
  const ops = openings.slice().sort((a, b) => a.center - b.center);
  const STONE_H = 0.9;
  const pieces = []; let cur = from;
  for (const o of ops) {
    const a = o.center - o.width / 2, b = o.center + o.width / 2;
    pieces.push([cur, a, 0, H]);
    if (o.bottom > 0) pieces.push([a, b, 0, o.bottom]);
    pieces.push([a, b, o.top, H]);
    cur = b;
  }
  pieces.push([cur, to, 0, H]);
  const add = (a, b, y0, y1, color) => {
    if (b - a < 0.01 || y1 - y0 < 0.01) return;
    tb(g, b - a + 0.0, y1 - y0, thick, color, (a + b) / 2, y0, 0, 0.03);
  };
  for (const [a0, b, y0, y1] of pieces) {
    const a = a0 === from ? a0 - thick / 2 : a0;
    if (y1 <= STONE_H) add(a, b, y0, y1, C.stone);
    else if (y0 >= STONE_H) add(a, b, y0, y1, C.plaster);
    else { add(a, b, y0, STONE_H, C.stone); add(a, b, STONE_H, y1, C.plaster); }
  }
  // timber: top plate, sill beam, posts, braces
  tb(g, to - from + thick, 0.16, thick + 0.08, C.timber, (from + to) / 2 - 0.0, H - 0.16, 0, 0.02);
  tb(g, to - from + thick, 0.1, thick + 0.06, C.timber, (from + to) / 2, STONE_H, 0, 0.02);
  const posts = [from - thick / 2 + 0.07, to];
  for (const o of ops) posts.push(o.center - o.width / 2 - 0.05, o.center + o.width / 2 + 0.05);
  posts.sort((p, q) => p - q);
  for (const u of posts) tb(g, 0.14, H - STONE_H, thick + 0.07, C.timber, u, STONE_H, 0, 0.02);
  for (let i = 0; i < posts.length - 1; i++) {
    const a = posts[i] + 0.07, b = posts[i + 1] - 0.07, len = b - a;
    const hasOpening = ops.some((o) => o.center > a && o.center < b);
    if (hasOpening || len < 0.9) continue;
    const hh = H - STONE_H - 0.26, ang = Math.atan2(hh, len), dl = Math.hypot(len, hh);
    const br = tb(g, dl, 0.1, thick + 0.05, C.timber, (a + b) / 2, STONE_H + 0.13 + hh / 2 - 0.05, 0, 0.015);
    br.rotation.z = ang * (i % 2 ? 1 : -1);
  }
  // windows
  for (const o of ops) {
    const w = o.width, cx = o.center, hgt = o.top - o.bottom, cy = (o.top + o.bottom) / 2;
    if (o.bottom > 0) {
      const glass = new THREE.Mesh(new THREE.BoxGeometry(w, hgt, 0.03), mat(0xcfe8ef, { transparent: true, opacity: 0.3, roughness: 0.1, emissive: 0xffc678, emissiveIntensity: 0 }));
      glass.position.set(cx, cy, 0); g.add(glass);
      tb(g, w + 0.12, 0.08, thick + 0.1, C.timber, cx, o.top - 0.04, 0); tb(g, w + 0.16, 0.08, thick + 0.16, C.stoneLight, cx, o.bottom - 0.06, 0);
      tb(g, 0.05, hgt, 0.07, C.timber, cx, o.bottom, 0); tb(g, w, 0.045, 0.07, C.timber, cx, cy - 0.02, 0);
      for (const s of [-1, 1]) { // open shutters on the inner face
        const sh = tb(g, 0.4, hgt, 0.04, C.oak, cx + s * (w / 2 + 0.24), o.bottom, inside * (thick / 2 + 0.05), 0.01);
        sh.rotation.y = s * inside * 0.35;
      }
    } else { // door: lintel beam and an open plank door
      tb(g, w + 0.2, 0.2, thick + 0.1, C.timber, cx, o.top, 0, 0.02);
      const hinge = new THREE.Group(); hinge.position.set(cx - w / 2 + 0.04, 0, inside * (thick / 2 + 0.05));
      hinge.rotation.y = -inside * (Math.PI / 2 - 0.4); g.add(hinge);
      const leaf = new THREE.Group(); hinge.add(leaf);
      tb(leaf, w - 0.08, o.top - 0.1, 0.07, C.oak, (w - 0.08) / 2, 0, 0, 0.015);
      for (const y of [0.35, 1.5]) tb(leaf, w - 0.12, 0.09, 0.09, C.iron, (w - 0.08) / 2, y, 0, 0.01);
      tb(leaf, 0.06, 0.06, 0.12, C.iron, w - 0.2, 1.0, 0, 0.01);
    }
  }
  parent.add(g);
  return g;
}

export function buildWorld(scene, house) {
  const world = { lamps: [], fires: { lights: [], flames: [] }, windowGlass: [], clouds: [], furniture: [] };
  const { x0, x1, z0, z1, wallHeight } = house.room;
  const W = x1 - x0, D = z1 - z0;

  // island
  const island = new THREE.Group();
  island.add(slab(16, 0.6, 13.5, C.grass, 0, -0.7, 0.2, 0.25));
  island.add(slab(16.2, 0.9, 13.7, C.soil, 0, -1.7, 0.2, 0.3));
  const under = new THREE.Mesh(new THREE.ConeGeometry(6.6, 3, 6), mat(0x87694b));
  under.position.set(0, -4.1, 0.2); under.rotation.y = Math.PI / 6; under.scale.set(1.15, 1, 1);
  under.rotation.x = Math.PI; island.add(under);
  scene.add(island);

  // cobbled path: door -> west -> south to the gate
  let seed = 3; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const cobble = (x, z, w, d) => { const s = slab(w, 0.05, d, rnd() > 0.5 ? C.cobble : C.stoneLight, x, -0.1, z, 0.04); s.rotation.y = (rnd() - 0.5) * 0.5; island.add(s); };
  for (let i = 0; i < 9; i++) for (const dz of [-0.3, 0.3]) cobble(-4.3 - i * 0.42, 2.2 + dz + (rnd() - 0.5) * 0.15, 0.36 + rnd() * 0.08, 0.5);
  for (let j = 0; j < 8; j++) for (const dx of [-0.3, 0.3]) cobble(-7.0 + dx + (rnd() - 0.5) * 0.1, 2.5 + j * 0.46, 0.5, 0.38 + rnd() * 0.08);

  // floor (flagstones)
  const tex = flagTexture(); tex.repeat.set(W / 4, D / 4);
  const floor = new THREE.Mesh(new RoundedBoxGeometry(W + 0.24, 0.2, D + 0.24, 2, 0.04),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, flatShading: true }));
  floor.position.set((x0 + x1) / 2, -0.1, (z0 + z1) / 2); floor.receiveShadow = true; floor.castShadow = true;
  scene.add(floor);

  // walls: back (z0) and left (x0); front sides cut away with a low stone kerb
  const walls = new THREE.Group();
  const byWall = (name) => house.openings.filter((o) => o.wall === name);
  buildWall(walls, 'x', z0, x0, x1, wallHeight, byWall('back'));
  buildWall(walls, 'z', x0, z0, z1, wallHeight, byWall('left'));
  walls.add(slab(W + 0.24, 0.3, 0.24, C.stone, (x0 + x1) / 2, 0, z1, 0.05));
  walls.add(slab(W + 0.3, 0.07, 0.3, C.stoneLight, (x0 + x1) / 2, 0.3, z1, 0.03));
  walls.add(slab(0.24, 0.3, D, C.stone, x1, 0, (z0 + z1) / 2, 0.05));
  walls.add(slab(0.3, 0.07, D, C.stoneLight, x1, 0.3, (z0 + z1) / 2, 0.03));
  scene.add(walls);
  walls.traverse((o) => { if (o.material && o.material.transparent) { o.castShadow = false; world.windowGlass.push(o); } });

  // furniture
  house.items.forEach((it, index) => {
    const g = MODELS[it.def](new THREE.Group());
    g.position.set(it.x, it.y ?? 0, it.z);
    g.rotation.y = it.rot ?? 0;
    g.userData = { def: it.def, itemIndex: index };
    scene.add(g);
    world.furniture.push(g);
    g.traverse((o) => {
      if (o.userData.lampShade || o.userData.lampLight) world.lamps.push(o);
      if (o.userData.fire) world.fires.flames.push(o);
      if (o.userData.fireLight) world.fires.lights.push(o);
    });
  });

  // scenery (data-driven so the nav grid and the renderer agree)
  for (const sc of house.scenery) {
    const obj = SCENERY[sc.type](sc.s);
    obj.position.set(sc.x, 0, sc.z); obj.rotation.y = sc.type === 'flowers' ? sc.x : 0; scene.add(obj);
  }
  // wattle-and-stake fence along the front with a gate gap where the path leaves
  for (let i = -7.2; i <= 7.3; i += 0.7) {
    if (i > -7.4 && i < -6.4) continue;
    const p = new THREE.Group(); M.box(p, 0.1, 0.62, 0.1, C.oakDark, 0, 0, 0, 0.02);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.14, 5), mat(C.oakDark)); tip.position.y = 0.69; tip.castShadow = true; p.add(tip);
    p.position.set(i, 0, 6.2); scene.add(p);
  }
  for (const [xa, xb] of [[-6.3, 7.4]]) for (const y of [0.22, 0.45]) {
    const r = new THREE.Group(); M.box(r, xb - xa, 0.06, 0.05, C.oak, 0, y, 0, 0.02); r.position.set((xa + xb) / 2, 0, 6.2); scene.add(r);
  }

  // clouds
  for (let i = 0; i < 4; i++) {
    const c = new THREE.Group();
    for (let j = 0; j < 4; j++) {
      const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.8 + (j % 2) * 0.35, 1), mat(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.15 }));
      b.position.set(j * 0.9 - 1.3, (j % 2) * 0.2, 0); b.scale.y = 0.65; c.add(b);
    }
    c.position.set(-14 + i * 9, 7 + (i % 2) * 2, -9 + (i % 3) * 3);
    scene.add(c); world.clouds.push(c);
  }
  return world;
}
