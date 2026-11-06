// A house is just data: a room rectangle and free-positioned items. Placement is intentionally NOT
// cell-locked: x/z/rot are free floats so decorating never gets blocked by the grid.
export const GRID = { cell: 1, snap: 0.25 };

export const startHouse = {
  room: { x0: -4, x1: 4, z0: -3, z1: 3, wallHeight: 2.8 },
  openings: [
    { wall: 'back', center: -2.2, width: 1.3, bottom: 0.9, top: 2.1 }, // window above the bed
    { wall: 'left', center: 0.2, width: 1.3, bottom: 0.9, top: 2.1 },  // window
    { wall: 'left', center: 2.2, width: 1.0, bottom: 0, top: 2.1 },    // door
  ],
  items: [
    // sleeping corner
    { def: 'bed',         x: -2.9, z: -1.85, rot: 0 },
    { def: 'chest',       x: -2.9, z: -0.4,  rot: 0 },
    { def: 'candlestand', x: -1.5, z: -2.55, rot: 0 },
    { def: 'banner',      x: -3.86, z: -1.7, y: 1.15, rot: Math.PI / 2 },
    // kitchen along the back wall
    { def: 'bookshelf',   x: -0.1, z: -2.75, rot: 0 },
    { def: 'barrel',      x: 0.95, z: -2.6,  rot: 0 },
    { def: 'hearth',      x: 2.15, z: -2.58, rot: 0 },
    { def: 'pantry',      x: 3.5,  z: -2.62, rot: 0 },
    { def: 'table',       x: 2.0,  z: -0.5,  rot: 0.05 },
    { def: 'stool',       x: 1.15, z: -0.5,  rot: Math.PI / 2 },
    { def: 'stool',       x: 2.0,  z: 0.4,   rot: Math.PI },
    { def: 'stool',       x: 2.85, z: -0.5,  rot: -Math.PI / 2 },
    // living area
    { def: 'rug',         x: -2.2, z: 1.1,   rot: 0 },
    { def: 'settle',      x: -1.0, z: 1.1,   rot: -Math.PI / 2 },
    { def: 'harp',        x: -3.55, z: 0.9,  rot: Math.PI / 2 },
    // wash corner
    { def: 'tub',         x: 3.3,  z: 1.9,   rot: 0 },
    { def: 'washstand',   x: 2.2,  z: 2.7,   rot: Math.PI },
    { def: 'plant',       x: 3.5,  z: 0.9,   rot: 0 },
    { def: 'plant',       x: 0.6,  z: 2.55,  rot: 0 },
  ],
  // Walkable area for people (island minus fence). Walls/furniture are blocked separately.
  bounds: { x0: -7.4, x1: 7.4, z0: -6.0, z1: 5.8 },
  // r = blocking radius at ground level (0 = purely decorative)
  scenery: [
    { type: 'tree', x: 6.8, z: -3.8, s: 1.5, r: 0.3 }, { type: 'tree', x: 7.4, z: 0.5, s: 1.2, r: 0.25 },
    { type: 'pine', x: -7.2, z: -4.5, s: 1.6, r: 0.25 }, { type: 'pine', x: -7.6, z: -2.0, s: 1.3, r: 0.2 },
    { type: 'tree', x: 5.2, z: -5.8, s: 1.3, r: 0.25 }, { type: 'pine', x: 7.2, z: 4.4, s: 1.2, r: 0.2 },
    { type: 'bush', x: -4.7, z: 3.9, s: 1.1, r: 0.45 }, { type: 'bush', x: 4.8, z: 3.8, s: 0.9, r: 0.4 },
    { type: 'bush', x: 0.5, z: 4.2, s: 1.0, r: 0.42 }, { type: 'bush', x: 5.6, z: 2.6, s: 1.1, r: 0.45 },
    { type: 'bush', x: -6.6, z: 0.6, s: 0.9, r: 0.4 },
    { type: 'well', x: -5.9, z: -3.1, s: 1.0, r: 0.75 },
    { type: 'haystack', x: -6.4, z: 3.7, s: 1.1, r: 0.7 },
    { type: 'barrel', x: -4.7, z: 1.15, s: 1, r: 0.35 },
    { type: 'veg', x: 6.0, z: -1.7, s: 1, r: 0 },
    { type: 'lantern', x: -5.0, z: 3.2, s: 1, r: 0.2 }, { type: 'lantern', x: 5.6, z: 4.6, s: 1, r: 0.2 },
    ...[[-3.6, 4.7], [3.5, 4.8], [1.8, 4.5], [-5.4, 0.2]].map(([x, z]) => ({ type: 'flowers', x, z, s: 1, r: 0 })),
  ],
};
