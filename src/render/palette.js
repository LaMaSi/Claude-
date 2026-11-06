// Soft pastel palette + shared material factory (flat shaded, matte).
import * as THREE from 'three';

export const C = {
  grass: 0x9fd18b, grassDark: 0x86c07a, soil: 0xb98f6a, path: 0xe9dcc3,
  wall: 0xf6ead8, wallInner: 0xf2dfc8, trim: 0xffffff, floorA: 0xd9a877, floorB: 0xcf9d6c,
  wood: 0xc08a5a, woodDark: 0x8f6544, fabricBlue: 0x7fa6d6, fabricPink: 0xe89bab, fabricMint: 0x9fd8c3,
  white: 0xfdfaf4, grey: 0xc9ced6, metal: 0xb7c0cc, black: 0x3b3d4a, glass: 0xbfe6f5,
  leaf: 0x6fbf73, leafLight: 0x8fd48a, pot: 0xe7967a, gold: 0xf2c46b, sun: 0xffe7a8,
  skin: 0xf2c4a0, hair: 0x7a4a34, shirt: 0xf08a8a, pants: 0x6f86b8,
};

const cache = new Map();
export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!cache.has(key)) {
    cache.set(key, new THREE.MeshStandardMaterial({
      color, roughness: 0.85, metalness: 0, flatShading: true, ...opts,
    }));
  }
  return cache.get(key);
}
