// A house is just data: a room rectangle (cell units) and free-positioned items.
// Placement is intentionally NOT cell-locked: x/z/rot are free floats so decorating
// never gets blocked by the grid (the build UI can snap to a fine 0.25 step).
export const GRID = { cell: 1, snap: 0.25 };

export const startHouse = {
  room: { x0: -4, x1: 4, z0: -3, z1: 3, wallHeight: 2.8 },
  openings: [
    { wall: 'back', center: 1.6, width: 1.5, bottom: 0.9, top: 2.2 },  // window
    { wall: 'back', center: -2.2, width: 1.5, bottom: 0.9, top: 2.2 }, // window
    { wall: 'left', center: 0.2, width: 1.5, bottom: 0.9, top: 2.2 },  // window
    { wall: 'left', center: 2.2, width: 1.0, bottom: 0, top: 2.1 },    // door
  ],
  items: [
    // sleeping corner
    { def: 'bed',       x: -2.9, z: -1.85, rot: 0 },
    { def: 'lamp',      x: -1.5, z: -2.55, rot: 0 },
    // kitchen along the back wall
    { def: 'fridge',    x: 3.45, z: -2.55, rot: 0 },
    { def: 'counter',   x: 2.2,  z: -2.62, rot: 0 },
    { def: 'table',     x: 2.0,  z: -0.5,  rot: 0.05 },
    { def: 'chair',     x: 1.2,  z: -0.5,  rot: Math.PI / 2 },
    { def: 'chair',     x: 2.0,  z: 0.35,  rot: Math.PI },
    { def: 'chair',     x: 2.8,  z: -0.5,  rot: -Math.PI / 2 },
    // living area
    { def: 'rug',       x: -2.2, z: 1.1,   rot: 0 },
    { def: 'sofa',      x: -1.0, z: 1.1,   rot: -Math.PI / 2 },
    { def: 'tv',        x: -3.7, z: 1.1,   rot: Math.PI / 2 },
    { def: 'plant',     x: 3.5,  z: 0.9,   rot: 0 },
    { def: 'bookshelf', x: -0.1, z: -2.75, rot: 0 },
    { def: 'painting',  x: -2.9, z: -2.86, y: 1.5, rot: 0 },
    // bathroom nook
    { def: 'shower',    x: 3.3,  z: 1.9,   rot: 0 },
    { def: 'toilet',    x: 2.2,  z: 2.7,   rot: Math.PI },
    { def: 'plant',     x: 0.6,  z: 2.55,  rot: 0 },
  ],
  // Walkable area for people (island minus fence). Walls/furniture are blocked separately.
  bounds: { x0: -7.4, x1: 7.4, z0: -6.2, z1: 5.8 },
  // r = blocking radius at ground level (0 = purely decorative)
  scenery: [
    { type: 'tree', x: 6.8, z: -3.8, s: 1.5, r: 0.3 }, { type: 'tree', x: 7.4, z: 0.5, s: 1.2, r: 0.25 },
    { type: 'pine', x: -7.2, z: -4.5, s: 1.6, r: 0.25 }, { type: 'pine', x: -7.6, z: -2.0, s: 1.3, r: 0.2 },
    { type: 'tree', x: 5.2, z: -5.8, s: 1.3, r: 0.25 }, { type: 'pine', x: 7.2, z: 4.4, s: 1.2, r: 0.2 },
    { type: 'bush', x: -4.7, z: 3.8, s: 1.1, r: 0.45 }, { type: 'bush', x: 4.8, z: 3.8, s: 0.9, r: 0.4 },
    { type: 'bush', x: 0.5, z: 4.2, s: 1.0, r: 0.42 }, { type: 'bush', x: 5.6, z: 2.2, s: 1.2, r: 0.5 },
    { type: 'bush', x: -6.4, z: -0.3, s: 0.9, r: 0.4 },
    ...[[-4.9, 4.9], [-3.6, 4.7], [3.5, 4.8], [-6.5, 2.6], [5.5, 1.4], [1.8, 4.5]].map(([x, z]) => ({ type: 'flowers', x, z, s: 1, r: 0 })),
  ],
};
