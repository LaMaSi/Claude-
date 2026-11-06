// Pure data (no rendering imports) so the simulation can run headless.
// footprint: [width(x), depth(z)] in local space. Local +z is the "front" of the item.
// use: how a character uses it. Coordinates are local to the item.
//   slots    where a person ends up (sit/lie/stand point)
//   approach where they walk to first (relX: add slot.x to approach x)
//   face     yaw relative to the item (0 = looking along local +z)
//   seatTop  height of the seat (for sit poses); redirect: use another furniture type instead
export const FURNITURE = {
  bed: { name: 'Bed', footprint: [1.8, 2.2], needs: { sleep: 1 },
    use: { activity: 'Sleeping', pose: 'sleep', slots: [{ x: -0.4, z: 0 }, { x: 0.4, z: 0 }], approach: [1.25, 0.3], face: 0 } },
  fridge: { name: 'Fridge', footprint: [0.8, 0.75], needs: { hunger: 0.6 },
    use: { activity: 'Grabbing a snack', pose: 'stand', anim: 'forward', slots: [{ x: 0, z: 0.6 }], approach: [0, 0.9], face: Math.PI } },
  counter: { name: 'Kitchen counter', footprint: [1.6, 0.7], needs: { hunger: 0.4 },
    use: { activity: 'Cooking', pose: 'stand', anim: 'forward', slots: [{ x: -0.4, z: 0.55 }, { x: 0.4, z: 0.55 }], approach: [0, 0.95], relX: true, face: Math.PI } },
  shower: { name: 'Shower', footprint: [1.1, 1.1], needs: { hygiene: 1 },
    use: { activity: 'Showering', pose: 'stand', anim: 'raise', floorY: 0.12, slots: [{ x: 0, z: 0 }], approach: [-0.95, -0.2], face: Math.PI / 2 } },
  toilet: { name: 'Toilet', footprint: [0.4, 0.6], needs: { hygiene: 0.3 },
    use: { activity: 'Freshening up', pose: 'sit', seatTop: 0.4, slots: [{ x: 0, z: 0.1 }], approach: [0, 0.75], face: 0 } },
  sofa: { name: 'Sofa', footprint: [2.0, 0.9], needs: { social: 0.5, fun: 0.4 },
    use: { activity: 'Relaxing', pose: 'sit', anim: 'rest', seatTop: 0.42, slots: [{ x: -0.5, z: 0.05 }, { x: 0.5, z: 0.05 }], approach: [0, 0.95], relX: true, face: 0 } },
  tv: { name: 'TV stand', footprint: [1.5, 0.45], needs: { fun: 1 },
    use: { redirect: 'sofa', activity: 'Watching TV' } },
  table: { name: 'Dining table', footprint: [1.5, 0.9], needs: { hunger: 0.5, social: 0.5 },
    use: { redirect: 'chair', activity: 'Sitting at the table' } },
  chair: { name: 'Chair', footprint: [0.45, 0.45], needs: {},
    use: { activity: 'Sitting at the table', pose: 'sit', anim: 'rest', seatTop: 0.48, slots: [{ x: 0, z: 0.02 }], approach: [0.75, 0], face: 0 } },
  plant: { name: 'Plant', footprint: [0.5, 0.5], needs: {},
    use: { activity: 'Watering the plant', pose: 'stand', anim: 'forward', slots: [{ x: -0.55, z: 0 }], approach: [-0.9, 0], face: Math.PI / 2 } },
  lamp: { name: 'Floor lamp', footprint: [0.35, 0.35], needs: {} },
  bookshelf: { name: 'Bookshelf', footprint: [1.1, 0.35], needs: { fun: 0.5 },
    use: { activity: 'Reading', pose: 'stand', anim: 'forward', slots: [{ x: 0, z: 0.5 }], approach: [0, 0.9], face: Math.PI } },
  rug: { name: 'Round rug', footprint: [2.4, 2.4], needs: {}, floorDecor: true },
  painting: { name: 'Painting', footprint: [0.9, 0.05], needs: {}, wallMounted: true },
};
