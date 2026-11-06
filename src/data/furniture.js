// Pure data (no rendering imports) so the simulation can run headless.
// footprint: [width(x), depth(z)] in local space. Local +z is the "front" of the item.
// needs: how strongly using it restores each need (0..1 weight, see sim.js).
// tags: activity tags (likes, wishes, goals); trains: skill practised while using it.
// use: slots (where a person ends up), approach (where they walk first; relX adds slot.x),
//      face (yaw relative to the item), seatTop (sit height), redirect (use another type instead).
const PI = Math.PI;
export const FURNITURE = {
  bed: { name: 'Bed', footprint: [1.8, 2.2], tags: ['sleeping'], needs: { sleep: 1 },
    use: { activity: 'Sleeping', pose: 'sleep', slots: [{ x: -0.4, z: 0 }, { x: 0.4, z: 0 }], approach: [1.25, 0.3], face: 0 } },
  pantry: { name: 'Pantry', footprint: [0.9, 0.55], tags: ['eating'], needs: { hunger: 0.6 },
    use: { activity: 'Fetching bread and cheese', pose: 'stand', anim: 'forward', slots: [{ x: 0, z: 0.5 }], approach: [0, 0.9], face: PI } },
  hearth: { name: 'Hearth', footprint: [1.7, 0.75], tags: ['cooking'], trains: 'cooking', needs: { hunger: 0.9, social: 0.1 },
    use: { activity: 'Cooking stew', pose: 'stand', anim: 'forward', slots: [{ x: -0.45, z: 0.6 }, { x: 0.45, z: 0.6 }], approach: [0, 1.0], relX: true, face: PI } },
  tub: { name: 'Wash tub', footprint: [1.1, 1.1], tags: ['bathing'], needs: { hygiene: 1 },
    use: { activity: 'Bathing', pose: 'stand', anim: 'raise', floorY: 0.3, slots: [{ x: 0, z: 0 }], approach: [-0.95, -0.2], face: PI / 2 } },
  washstand: { name: 'Wash stand', footprint: [0.7, 0.5], tags: ['bathing'], needs: { hygiene: 0.5 },
    use: { activity: 'Washing up', pose: 'stand', anim: 'forward', slots: [{ x: 0, z: 0.5 }], approach: [0, 0.9], face: PI } },
  settle: { name: 'Settle', footprint: [2.0, 0.7], tags: ['resting', 'socializing'], needs: { social: 0.6, fun: 0.3 },
    use: { activity: 'Resting on the settle', pose: 'sit', anim: 'rest', seatTop: 0.5, slots: [{ x: -0.5, z: 0.05 }, { x: 0.5, z: 0.05 }], approach: [0, 0.85], relX: true, face: 0 } },
  harp: { name: 'Harp', footprint: [0.8, 0.45], tags: ['music'], trains: 'music', needs: { fun: 1, social: 0.1 },
    use: { activity: 'Playing the harp', pose: 'stand', anim: 'forward', slots: [{ x: 0, z: 0.55 }], approach: [0, 0.95], face: PI } },
  table: { name: 'Table', footprint: [1.5, 0.9], tags: ['eating', 'socializing'], needs: { hunger: 0.5, social: 0.5 },
    use: { redirect: 'stool' } },
  stool: { name: 'Stool', footprint: [0.42, 0.42], tags: ['eating', 'socializing'], needs: { hunger: 0.4, social: 0.35, fun: 0.05 },
    use: { activity: 'Sitting at the table', pose: 'sit', anim: 'rest', seatTop: 0.48, slots: [{ x: 0, z: 0.02 }], approach: [0.75, 0], face: 0 } },
  plant: { name: 'Herb pot', footprint: [0.5, 0.5], tags: ['gardening'], trains: 'herbalism', needs: { fun: 0.2 },
    use: { activity: 'Tending the herbs', pose: 'stand', anim: 'forward', slots: [{ x: -0.55, z: 0 }], approach: [-0.9, 0], face: PI / 2 } },
  candlestand: { name: 'Candle stand', footprint: [0.4, 0.4], needs: {} },
  bookshelf: { name: 'Bookshelf', footprint: [1.1, 0.35], tags: ['reading', 'tales'], trains: 'lore', needs: { fun: 0.6 },
    use: { activity: 'Reading', pose: 'stand', anim: 'forward', slots: [{ x: 0, z: 0.5 }], approach: [0, 0.9], face: PI } },
  chest: { name: 'Chest', footprint: [1.0, 0.55], needs: {} },
  barrel: { name: 'Barrel', footprint: [0.65, 0.65], needs: {} },
  // Caring for the infant in the crib: the carer feeds, changes and soothes it (sim.js restores the INFANT's needs).
  crib: { name: 'Crib', footprint: [0.75, 1.15], tags: ['caring'], needs: {},
    use: { activity: 'Caring for the baby', pose: 'stand', anim: 'forward', slots: [{ x: 0, z: 0.85 }], approach: [0, 1.2], face: Math.PI } },
  pallet: { name: 'Straw pallet', footprint: [0.7, 1.9], tags: ['sleeping'], needs: { sleep: 0.85 },
    use: { activity: 'Sleeping on a pallet', pose: 'sleep', bedTop: 0.14, slots: [{ x: 0, z: 0 }], approach: [0.8, 0.3], face: 0 } },
  rug: { name: 'Woven rug', footprint: [2.4, 2.4], needs: {}, floorDecor: true },
  banner: { name: 'Banner', footprint: [0.9, 0.05], needs: {}, wallMounted: true },
};
export const NEEDS = ['hunger', 'social', 'hygiene', 'fun', 'sleep'];
