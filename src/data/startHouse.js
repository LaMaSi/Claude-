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
    { def: 'plant',     x: -3.5, z: 2.5,   rot: 0 },
    { def: 'bookshelf', x: -0.1, z: -2.75, rot: 0 },
    { def: 'painting',  x: -2.9, z: -2.86, y: 1.5, rot: 0 },
    // bathroom nook
    { def: 'shower',    x: 3.3,  z: 1.9,   rot: 0 },
    { def: 'toilet',    x: 2.2,  z: 2.7,   rot: Math.PI },
    { def: 'plant',     x: 0.9,  z: 2.6,   rot: 0 },
  ],
  characters: [
    { x: 0.2, z: 0.6, rot: -0.6, look: {} },
  ],
};
