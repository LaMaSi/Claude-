// Characters are plain data. `species` selects the body builder (only 'human' for now) so later
// milestones can add non-human folk. Age/role are stored for aging, families and jobs.
export const FAMILY = [
  { id: 'sam', name: 'Sam', role: 'Father', species: 'human', age: 38, scale: 1.0, headScale: 1.0,
    look: { skin: 0xe6b08a, hair: 0x5b3a29, hairStyle: 'short', beard: true, outfit: 'tunic', shirt: 0x4f7a9c, pants: 0x6b5a48 },
    start: { x: 0.4, z: 0.7, yaw: -0.6 } },
  { id: 'maya', name: 'Maya', role: 'Mother', species: 'human', age: 36, scale: 0.95, headScale: 1.0,
    look: { skin: 0xc68a65, hair: 0x2e2a33, hairStyle: 'braid', outfit: 'gown', shirt: 0x9a4a6a, pants: 0x6b5a48, headwear: 'coif', headwearColor: 0xf0e8d4 },
    start: { x: 1.0, z: -1.8, yaw: 2.4 } },
  { id: 'robin', name: 'Robin', role: 'Child', species: 'human', age: 7, scale: 0.68, headScale: 1.22,
    look: { skin: 0xf2c4a0, hair: 0xd9a441, hairStyle: 'short', outfit: 'tunic', shirt: 0x7a9a5a, pants: 0x8a6a48, headwear: 'hood', headwearColor: 0xb8433f },
    start: { x: -2.4, z: 1.2, yaw: 0.8 } },
];
