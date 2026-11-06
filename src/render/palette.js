// Medieval-fantasy palette (muted, earthy, warm) + shared material factory (flat shaded, matte).
import * as THREE from 'three';

export const C = {
  grass: 0x8dbd72, soil: 0x946f4c, soilDark: 0x7a5a3d, path: 0xc9b996, cobble: 0xa9a392,
  plaster: 0xe6d9ba, stone: 0xb2ab9b, stoneDark: 0x8a8578, stoneLight: 0xcbc5b4, timber: 0x5a3c2a,
  flagA: 0xb9b0a0, flagB: 0xa59d8d, flagC: 0xc4bcab,
  oak: 0x9c6b43, oakDark: 0x6b4630, oakLight: 0xb88556,
  thatch: 0xd6b45e, linen: 0xf0e8d4, wool: 0xb8433f, woolBlue: 0x4f6fa0, woolGreen: 0x5f8a58, woolOchre: 0xd9a441,
  iron: 0x4b4d55, ironLight: 0x7c808c, leather: 0x7a4e32, gold: 0xe0b24a, clay: 0xc9774f, cream: 0xf6efd8,
  leaf: 0x6fb06a, leafLight: 0x8dcc7f, leafDark: 0x4f9560, water: 0x8cc9de, fire: 0xffa23a,
  black: 0x2f2d33, white: 0xfdfaf4,
};

const cache = new Map();
export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!cache.has(key)) {
    cache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0, flatShading: true, ...opts }));
  }
  return cache.get(key);
}
