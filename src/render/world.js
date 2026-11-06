// Builds the diorama: island, house shell (back walls only, front cut away), furniture, scenery.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { C, mat } from './palette.js';
import { MODELS, SCENERY } from './furnitureModels.js';
import * as M from './models.js';

function plankTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d');
  const cols = ['#d9a877', '#cf9d6c', '#dcb084', '#c9955f'];
  for (let i = 0; i < 8; i++) {
    x.fillStyle = cols[i % 4]; x.fillRect(0, i * 32, 256, 32);
    x.fillStyle = 'rgba(80,50,20,.25)'; x.fillRect(0, i * 32, 256, 2);
    const off = (i * 97) % 200; x.fillRect(off, i * 32, 2, 32);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

function slab(w, h, d, color, x, y, z, r = 0.06) {
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, r), mat(color));
  m.position.set(x, y + h / 2, z);
  m.castShadow = m.receiveShadow = true;
  return m;
}

// Wall along an axis with rectangular openings. `axis` 'x' runs along x at fixed z (back wall),
// 'z' runs along z at fixed x (left wall).
function wall(group, axis, fixed, from, to, height, openings, thick = 0.22) {
  const pieces = [];
  const ops = openings.slice().sort((a, b) => a.center - b.center);
  let cur = from;
  for (const o of ops) {
    const a = o.center - o.width / 2, b = o.center + o.width / 2;
    pieces.push([cur, a, 0, height]);
    if (o.bottom > 0) pieces.push([a, b, 0, o.bottom]);
    pieces.push([a, b, o.top, height]);
    cur = b;
  }
  pieces.push([cur, to, 0, height]);
  for (const [a, b, y0, y1] of pieces) {
    if (b - a < 0.01 || y1 - y0 < 0.01) continue;
    const len = b - a, h = y1 - y0, mid = (a + b) / 2;
    const m = axis === 'x'
      ? slab(len + (a === from ? thick : 0), h, thick, C.wall, mid, y0, fixed)
      : slab(thick, h, len + (a === from ? thick : 0), C.wall, fixed, y0, mid);
    group.add(m);
  }
  // window frames / glass
  for (const o of ops) {
    const w = o.width, cx = o.center;
    if (o.bottom > 0) {
      const g = new THREE.Mesh(new THREE.BoxGeometry(axis === 'x' ? w : 0.03, o.top - o.bottom, axis === 'x' ? 0.03 : w),
        mat(C.glass, { transparent: true, opacity: 0.3, roughness: 0.1, emissive: 0xffc678, emissiveIntensity: 0 }));
      g.position.set(axis === 'x' ? cx : fixed, (o.top + o.bottom) / 2, axis === 'x' ? fixed : cx);
      group.add(g);
      const fr = new THREE.Mesh(new THREE.BoxGeometry(axis === 'x' ? w + 0.1 : 0.06, 0.07, axis === 'x' ? 0.06 : w + 0.1), mat(C.trim));
      fr.position.set(axis === 'x' ? cx : fixed, o.top, axis === 'x' ? fixed : cx); group.add(fr);
      const sill = fr.clone(); sill.position.y = o.bottom; group.add(sill);
      const mull = new THREE.Mesh(new THREE.BoxGeometry(axis === 'x' ? 0.05 : 0.06, o.top - o.bottom, axis === 'x' ? 0.06 : 0.05), mat(C.trim));
      mull.position.set(axis === 'x' ? cx : fixed, (o.top + o.bottom) / 2, axis === 'x' ? fixed : cx); group.add(mull);
    }
  }
}

export function buildWorld(scene, house) {
  const world = { lamps: [], tvScreens: [], windowGlass: [], clouds: [], furniture: [] };
  const { x0, x1, z0, z1, wallHeight } = house.room;
  const W = x1 - x0, D = z1 - z0;

  // island
  const island = new THREE.Group();
  island.add(slab(16, 0.6, 13.5, C.grass, 0, -0.7, 0.2, 0.25));
  island.add(slab(16.2, 0.9, 13.7, C.soil, 0, -1.7, 0.2, 0.3));
  const under = new THREE.Mesh(new THREE.ConeGeometry(6.6, 3, 6), mat(0xa57e5c));
  under.position.set(0, -4.1, 0.2); under.rotation.y = Math.PI / 6; under.scale.set(1.15, 1, 1);
  under.rotation.x = Math.PI; island.add(under);
  scene.add(island);

  // garden path + terrace
  island.add(slab(2.2, 0.06, 4.5, C.path, -5.6, -0.1, 2.0 + 2.5, 0.03));
  island.add(slab(1.4, 0.06, 1.4, C.path, -5.6, -0.1, 2.2, 0.03));
  // floor
  const tex = plankTexture(); tex.repeat.set(W / 2, D / 2);
  const floor = new THREE.Mesh(new RoundedBoxGeometry(W + 0.22, 0.2, D + 0.22, 2, 0.04),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8, flatShading: true }));
  floor.position.set((x0 + x1) / 2, -0.1, (z0 + z1) / 2); floor.receiveShadow = true; floor.castShadow = true;
  // top face UVs fine for box; apply texture to all sides is OK for prototype
  scene.add(floor);

  // walls: back (z0) and left (x0) only, front sides cut away with a low kerb
  const walls = new THREE.Group();
  const byWall = (name) => house.openings.filter((o) => o.wall === name);
  wall(walls, 'x', z0, x0, x1, wallHeight, byWall('back'));
  wall(walls, 'z', x0, z0, z1, wallHeight, byWall('left'));
  walls.add(slab(W + 0.22, 0.25, 0.22, C.trim, (x0 + x1) / 2, 0, z1, 0.05)); // front kerb
  walls.add(slab(0.22, 0.25, D, C.trim, x1, 0, (z0 + z1) / 2, 0.05));        // right kerb
  // skirting + wall caps
  walls.add(slab(W, 0.14, 0.06, C.trim, (x0 + x1) / 2, 0, z0 + 0.14, 0.02));
  walls.add(slab(0.06, 0.14, D, C.trim, x0 + 0.14, 0, (z0 + z1) / 2, 0.02));
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
      if (o.userData.lampShade) world.lamps.push(o);
      if (o.userData.lampLight) world.lamps.push(o);
      if (o.userData.tvScreen) world.tvScreens.push(o);
    });
  });

  // scenery (data-driven so the nav grid and the renderer agree)
  for (const sc of house.scenery) {
    const obj = SCENERY[sc.type](sc.s);
    obj.position.set(sc.x, 0, sc.z); obj.rotation.y = sc.type === 'flowers' ? sc.x : 0; scene.add(obj);
  }
  // fence along the front
  for (let i = -7; i <= 7; i++) {
    const p = new THREE.Group(); M.box(p, 0.1, 0.55, 0.06, C.white, 0, 0, 0, 0.02);
    p.position.set(i * 1.1, 0, 6.2); scene.add(p);
  }
  const rail = new THREE.Group(); M.box(rail, 15.4, 0.06, 0.05, C.white, 0, 0.35, 0, 0.02); rail.position.set(0, 0, 6.2); scene.add(rail);

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
