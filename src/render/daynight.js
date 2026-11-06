// Night-first lighting: moonlit blue-green nights with warm candle/hearth/lantern pools are the "hero" look.
// Daytime exists but is deliberately dim and moody (overcast, golden) so the game stays easy on the eyes.
import * as THREE from 'three';

const lerp = THREE.MathUtils.lerp;

// "horizon haze" colour by hour: also the fog/background colour the grass fades into
const HAZE = [
  [0, 0x0c1520], [5, 0x131f2b], [6.5, 0x4a4450], [8, 0x56706c], [12, 0x628274],
  [17, 0x56706c], [19, 0x543e48], [20.5, 0x172030], [24, 0x0c1520],
];
const SUN = [
  [0, 0x7f95d8], [5.5, 0x7f95d8], [7, 0xffb070], [9, 0xffe9c4], [15, 0xffe9c4], [18, 0xff9a60], [19.5, 0x8aa0d8], [24, 0x7f95d8],
];
function sample(table, h) {
  for (let i = 0; i < table.length - 1; i++) {
    const [a, ca] = table[i], [b, cb] = table[i + 1];
    if (h >= a && h <= b) return new THREE.Color(ca).lerp(new THREE.Color(cb), (h - a) / (b - a));
  }
  return new THREE.Color(table[0][1]);
}

export function createLighting(scene, renderer) {
  const hemi = new THREE.HemisphereLight(0xdff1ff, 0x445544, 0.6);
  const sun = new THREE.DirectionalLight(0xffffff, 1.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const s = sun.shadow.camera; s.left = -14; s.right = 14; s.top = 14; s.bottom = -14; s.near = 1; s.far = 60;
  sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.06; sun.shadow.radius = 4;
  scene.add(hemi, sun, sun.target);
  scene.fog = new THREE.Fog(0xffffff, 44, 92);
  scene.background = new THREE.Color();
  const dayHemiSky = new THREE.Color(0xe6ecf0), nightHemiSky = new THREE.Color(0x6f86c0);
  const dayHemiGnd = new THREE.Color(0x56604a), nightHemiGnd = new THREE.Color(0x1c2a24);

  const update = function (hour, world, time = 0) {
    const haze = sample(HAZE, hour);
    scene.background.copy(haze); scene.fog.color.copy(haze);
    const day = hour > 6 && hour < 19.5;
    const t = day ? (hour - 6) / 13.5 : ((hour + (hour < 6 ? 24 : 0)) - 19.5) / 10.5;
    const ang = t * Math.PI;
    sun.position.set(-Math.cos(ang) * 22, Math.sin(ang) * 20 + 4, 10 + (day ? 0 : -4));
    sun.target.position.set(0, 0, 0);
    sun.color.copy(sample(SUN, hour));
    const dayAmt = THREE.MathUtils.smoothstep(Math.sin(ang), 0, 0.35);
    const k = day ? dayAmt : 0;                      // 0 = night, 1 = full day
    sun.intensity = day ? lerp(0.7, 1.45, dayAmt) : 0.75;
    hemi.intensity = lerp(0.55, 0.62, k);
    hemi.color.copy(nightHemiSky).lerp(dayHemiSky, k); hemi.groundColor.copy(nightHemiGnd).lerp(dayHemiGnd, k);
    if (renderer) renderer.toneMappingExposure = lerp(1.0, 0.82, k);
    const night = 1 - k;
    for (const l of world.lamps) {
      if (l.isLight) l.intensity = night * 11;
      else l.material.emissiveIntensity = night * 1.5;
    }
    for (const g of world.windowGlass) { g.material.opacity = 0.3 + night * 0.25; g.material.emissiveIntensity = night * 0.95; }
    const fl = 0.88 + 0.12 * Math.sin(time * 13) * Math.sin(time * 7.3) + 0.05 * Math.sin(time * 31);
    for (const l of world.fires.lights) l.intensity = (1.6 + night * 7.5) * fl;
    for (const f of world.fires.flames) { f.scale.set(1, 0.85 + 0.3 * fl, 1); f.material.emissiveIntensity = 1.2 + 0.8 * fl; }
    world.fireflies?.update(time, night);
    return night;
  };
  update.sun = sun;
  return update;
}
