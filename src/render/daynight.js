import * as THREE from 'three';

const lerp = THREE.MathUtils.lerp;

// colour keyframes by hour
const SKY = [
  [0, 0x1b2142], [5, 0x2b3560], [6.5, 0xf2a98b], [8, 0xbfe0f2], [12, 0xa9d8f5],
  [17, 0xbfe0f2], [19, 0xf29a7a], [20.5, 0x2b3560], [24, 0x1b2142],
];
const SUN = [
  [0, 0x6f86c8], [5.5, 0x6f86c8], [7, 0xffb878], [9, 0xfff1d6], [15, 0xfff1d6], [18, 0xffa066], [19.5, 0x8aa0d8], [24, 0x6f86c8],
];
function sample(table, h) {
  for (let i = 0; i < table.length - 1; i++) {
    const [a, ca] = table[i], [b, cb] = table[i + 1];
    if (h >= a && h <= b) return new THREE.Color(ca).lerp(new THREE.Color(cb), (h - a) / (b - a));
  }
  return new THREE.Color(table[0][1]);
}

export function createLighting(scene) {
  const hemi = new THREE.HemisphereLight(0xdff1ff, 0xb7c9a0, 0.9);
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const s = sun.shadow.camera; s.left = -14; s.right = 14; s.top = 14; s.bottom = -14; s.near = 1; s.far = 60;
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; sun.shadow.radius = 4;
  scene.add(hemi, sun, sun.target);
  scene.fog = new THREE.Fog(0xffffff, 40, 80);
  scene.background = new THREE.Color();

  const update = function (hour, world) {
    const sky = sample(SKY, hour);
    scene.background.copy(sky); scene.fog.color.copy(sky);
    // sun arc: rises 6, sets 19 ; moon takes over at night
    const day = hour > 6 && hour < 19.5;
    const t = day ? (hour - 6) / 13.5 : ((hour + (hour < 6 ? 24 : 0)) - 19.5) / 10.5;
    const ang = t * Math.PI;
    sun.position.set(Math.cos(ang) * 22, Math.sin(ang) * 20 + 4, 10 + (day ? 0 : -4));
    sun.position.x *= -1;
    sun.target.position.set(0, 0, 0);
    sun.color.copy(sample(SUN, hour));
    const dayAmt = THREE.MathUtils.smoothstep(Math.sin(ang), 0, 0.35);
    sun.intensity = day ? lerp(0.5, 2.3, dayAmt) : 0.45;
    hemi.intensity = day ? lerp(0.45, 0.95, dayAmt) : 0.65;
    hemi.color.copy(day ? new THREE.Color(0xdff1ff) : new THREE.Color(0x7d8cd0));
    const night = day ? 1 - dayAmt : 1; // 0 = bright day, 1 = night
    for (const l of world.lamps) {
      if (l.isLight) l.intensity = night * 9;
      else l.material.emissiveIntensity = night * 1.4;
    }
    for (const t2 of world.tvScreens) t2.material.emissiveIntensity = night * 0.9 + 0.25;
    for (const g of world.windowGlass) { g.material.opacity = 0.3 + night * 0.25; g.material.emissiveIntensity = night * 0.9; }
    return night;
  };
  update.sun = sun;
  return update;
}
